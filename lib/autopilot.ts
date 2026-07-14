import { dispatchAutopilotBatch, sendBandEvent } from "./band";
import {
  countTodaySent,
  createAutomationRun,
  createAutopilot,
  createLead,
  createQueueItem,
  findAutomationRun,
  findLead,
  getAutopilotSnapshot,
  listActiveAutopilots,
  updateAutomationRun,
  updateAutopilot,
  updateLead,
  updateQueueItem
} from "./autopilot-store";
import { sendInsForgeEmail } from "./insforge";
import { generateTargetsAndDrafts } from "./nebius";
import { accountQueries, enrichPublicContact, mapsResultToProspect, type AccountProspect, type MapsResult } from "./nimble-accounts";
import { createNimbleLeadJob, listNimbleJobRuns, previewNimbleRunRows, setNimbleJobActive, triggerNimbleJob, updateNimbleLeadJob, type NimbleJobRun } from "./nimble-jobs";
import { addEvent, getMissionBundle, newId, now } from "./store";
import type { Autopilot, AutopilotFilters, FounderProfile, Mission, NimbleJobBinding, ResearchLane } from "./types";

export interface AutopilotSetup {
  name?: string;
  schedule?: string;
  minReviews?: number;
  requireEmail?: boolean;
  excludeDomains?: string[];
  leadTarget?: number;
  dailySendCap?: number;
  autoSend?: boolean;
  autoReply?: boolean;
  senderName?: string;
  replyTo?: string;
}

interface Candidate {
  account: AccountProspect;
  reviewCount: number;
  lane: ResearchLane;
}

const lanes: ResearchLane[] = ["Pain signals", "Buyer signals", "Channel targets"];

function isCron(value: string) {
  return value.trim().split(/\s+/).length === 5;
}

function numberInRange(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function normalizeFilters(input: AutopilotSetup): AutopilotFilters {
  return {
    minReviews: numberInRange(input.minReviews, 5, 0, 10000),
    requireEmail: input.requireEmail !== false,
    excludeDomains: (input.excludeDomains || []).map((domain) => domain.trim().toLowerCase()).filter(Boolean).slice(0, 20)
  };
}

function jobBindings(autopilot: Autopilot): NimbleJobBinding[] {
  if (autopilot.nimbleJobs?.length) return autopilot.nimbleJobs;
  return [{ id: autopilot.nimbleJobId, lane: "Buyer signals", queryCount: autopilot.queryInputs.length || 1 }];
}

function isMapsResult(value: unknown): value is MapsResult {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.title === "string" && (typeof record.place_url === "string" || typeof record.place_id === "string");
}

function collectMapResults(value: unknown, output: MapsResult[] = [], visited = new Set<object>()) {
  if (!value || typeof value !== "object") return output;
  if (visited.has(value)) return output;
  visited.add(value);
  if (isMapsResult(value)) output.push(value);
  if (Array.isArray(value)) value.forEach((item) => collectMapResults(item, output, visited));
  else Object.values(value as Record<string, unknown>).forEach((item) => collectMapResults(item, output, visited));
  return output;
}

function reviewsFor(item: MapsResult) {
  return Number.parseInt(String(item.number_of_reviews || "0").replace(/\D/g, ""), 10) || 0;
}

function domainFor(url: string | undefined) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function passesFilters(candidate: Candidate, filters: AutopilotFilters) {
  if (candidate.reviewCount < filters.minReviews) return false;
  if (filters.requireEmail && !candidate.account.contact.email) return false;
  const domain = domainFor(candidate.account.contact.website);
  return !filters.excludeDomains.some((blocked) => domain === blocked || domain.endsWith(`.${blocked}`));
}

function runIsComplete(run: NimbleJobRun) {
  return ["SUCCESS", "WARNING", "COMPLETED", "COMPLETE"].includes(String(run.status || "").toUpperCase());
}

function draftHtml(body: string) {
  return body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />");
}

function validEmail(value: string | undefined) {
  return Boolean(value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
}

function queriesByLane(founder: FounderProfile) {
  const grouped = new Map<ResearchLane, Array<{ query: string; tag?: string }>>();
  for (const lane of lanes) grouped.set(lane, []);
  for (const { lane, query } of accountQueries(founder)) grouped.get(lane)?.push({ query, tag: lane });
  return grouped;
}

async function addAutopilotEvent(mission: Mission, message: string, tool: string, type: "tool_call" | "tool_result" | "error" | "status" = "tool_result") {
  const event = await addEvent({ missionId: mission.id, agent: "SDR Autopilot", eventType: type, message, tool });
  await sendBandEvent(event, mission.bandChatId);
}

export async function createMissionAutopilot(founder: FounderProfile, mission: Mission, input: AutopilotSetup) {
  const schedule = (input.schedule || "0 14 * * 1-5").trim();
  if (!isCron(schedule)) throw new Error("Schedule must use five cron fields, for example: 0 14 * * 1-5.");
  const dailySendCap = numberInRange(input.dailySendCap, 20, 1, 50);
  const leadTarget = numberInRange(input.leadTarget, 60, 10, 500);
  const filters = normalizeFilters(input);
  const autoSend = input.autoSend === true;
  const autoReply = input.autoReply === true;
  const replyTo = input.replyTo?.trim() || undefined;
  if (autoSend && !validEmail(replyTo)) throw new Error("Auto-send needs a valid reply-to email.");

  const id = newId("auto");
  const name = input.name?.trim() || `${founder.startup} lead watch`;
  const queryInputs = accountQueries(founder).map(({ query, lane }) => ({ query, tag: lane }));
  const grouped = queriesByLane(founder);
  const created = await Promise.all(
    lanes.map(async (lane) => {
      const queries = grouped.get(lane) || [];
      const job = await createNimbleLeadJob({ automationId: id, name: `${name} - ${lane}`, lane, cron: schedule, queries });
      if (!job.id) throw new Error(`Nimble did not return a job id for ${lane}.`);
      return { id: job.id, lane, queryCount: queries.length } satisfies NimbleJobBinding;
    })
  );

  const autopilot = await createAutopilot({
    id,
    missionId: mission.id,
    founderId: founder.id,
    ownerId: founder.ownerId,
    nimbleJobId: created[0].id,
    nimbleJobs: created,
    name,
    schedule,
    queryInputs,
    filters,
    leadTarget,
    dailySendCap,
    autoSend,
    autoReply,
    senderName: input.senderName?.trim() || founder.startup,
    replyTo,
    active: true
  });

  const initialRuns = await Promise.allSettled(created.map((binding) => triggerNimbleJob(binding.id)));
  await Promise.all(initialRuns.map(async (result, index) => {
    if (result.status !== "fulfilled" || !result.value.id) return;
    await createAutomationRun({
      automationId: autopilot.id,
      nimbleRunId: result.value.id,
      lane: created[index].lane,
      status: result.value.status || "PENDING",
      discoveredCount: 0,
      qualifiedCount: 0,
      queuedCount: 0,
      sentCount: 0
    });
  }));
  const started = initialRuns.filter((result) => result.status === "fulfilled").length;
  await addAutopilotEvent(mission, `${created.length} Nimble Jobs started in parallel across pain, buyer, and channel lanes (${queryInputs.length} recurring searches; ${leadTarget}-lead pool target).`, "Nimble Jobs", "tool_call");
  return { autopilot, started };
}

export async function setMissionAutopilotActive(autopilot: Autopilot, active: boolean) {
  await Promise.all(jobBindings(autopilot).map((binding) => setNimbleJobActive(binding.id, active)));
  await updateAutopilot(autopilot.id, { active });
  return { ...autopilot, active };
}

export async function updateMissionAutopilot(autopilot: Autopilot, input: AutopilotSetup) {
  const schedule = (input.schedule || autopilot.schedule).trim();
  if (!isCron(schedule)) throw new Error("Schedule must use five cron fields, for example: 0 14 * * 1-5.");
  const dailySendCap = numberInRange(input.dailySendCap, autopilot.dailySendCap, 1, 50);
  const leadTarget = numberInRange(input.leadTarget, autopilot.leadTarget || 60, 10, 500);
  const autoSend = input.autoSend === true;
  const autoReply = input.autoReply === true;
  const replyTo = input.replyTo?.trim() || undefined;
  if (autoSend && !validEmail(replyTo)) throw new Error("Auto-send needs a valid reply-to email.");
  const filters = normalizeFilters({ ...input, minReviews: input.minReviews ?? autopilot.filters.minReviews, requireEmail: input.requireEmail ?? autopilot.filters.requireEmail, excludeDomains: input.excludeDomains ?? autopilot.filters.excludeDomains });
  await Promise.all(jobBindings(autopilot).map((binding) => updateNimbleLeadJob(binding.id, { cron: schedule, active: autopilot.active })));
  const update = {
    name: input.name?.trim() || autopilot.name,
    schedule,
    filters,
    leadTarget,
    dailySendCap,
    autoSend,
    autoReply,
    senderName: input.senderName?.trim() || autopilot.senderName,
    replyTo
  };
  await updateAutopilot(autopilot.id, update);
  return { ...autopilot, ...update };
}

export async function manuallyRunAutopilot(autopilot: Autopilot) {
  const bindings = jobBindings(autopilot);
  const results = await Promise.allSettled(bindings.map((binding) => triggerNimbleJob(binding.id)));
  await Promise.all(results.map(async (result, index) => {
    if (result.status !== "fulfilled" || !result.value.id || await findAutomationRun(autopilot.id, result.value.id)) return;
    await createAutomationRun({
      automationId: autopilot.id,
      nimbleRunId: result.value.id,
      lane: bindings[index].lane,
      status: result.value.status || "PENDING",
      discoveredCount: 0,
      qualifiedCount: 0,
      queuedCount: 0,
      sentCount: 0
    });
  }));
  return { started: results.filter((result) => result.status === "fulfilled").length, runs: results };
}

async function enrichCandidates(rows: Record<string, unknown>[], filters: AutopilotFilters, lane: ResearchLane, capacity: number) {
  const seen = new Set<string>();
  const base = collectMapResults(rows).flatMap((item) => {
    const account = mapsResultToProspect(item, lane);
    if (!account || seen.has(account.id)) return [];
    seen.add(account.id);
    return [{ account, reviewCount: reviewsFor(item), lane } satisfies Candidate];
  });
  const selected = base.sort((a, b) => b.reviewCount - a.reviewCount).slice(0, Math.min(30, Math.max(0, capacity)));
  const enriched = await Promise.allSettled(selected.map(async (candidate) => ({ ...candidate, account: await enrichPublicContact(candidate.account) })));
  return enriched.flatMap((result) => result.status === "fulfilled" && passesFilters(result.value, filters) ? [result.value] : []);
}

async function queueNewLeads(autopilot: Autopilot, founder: FounderProfile, mission: Mission, candidates: Candidate[]) {
  const snapshot = await getAutopilotSnapshot(autopilot.missionId);
  const capacity = Math.max(0, autopilot.leadTarget - snapshot.leads.length);
  const novel: Candidate[] = [];
  for (const candidate of candidates) {
    if (!capacity || novel.length >= capacity) break;
    if (await findLead(autopilot.id, candidate.account.id)) continue;
    novel.push(candidate);
  }
  const accounts = novel.map((candidate) => candidate.account);
  const generated = accounts.length
    ? await generateTargetsAndDrafts(founder, mission, accounts.flatMap((account) => account.evidence), [], accounts)
    : { targets: [], drafts: [] };
  const draftByCompany = new Map(generated.targets.map((target, index) => [target.company.toLowerCase(), generated.drafts[index]] as const));
  let discoveredCount = 0;
  let qualifiedCount = 0;
  let queuedCount = 0;

  for (const candidate of novel) {
    discoveredCount += 1;
    const account = candidate.account;
    const draft = draftByCompany.get(account.company.toLowerCase());
    const lead = await createLead({
      automationId: autopilot.id,
      externalKey: account.id,
      name: account.company,
      company: account.company,
      role: account.role,
      score: account.score,
      rationale: account.rationale,
      url: account.evidence[0]?.url || account.contact.website || "https://www.google.com",
      sourceDomain: account.evidence[0]?.domain || "google.com",
      contact: account.contact,
      evidence: account.evidence,
      status: draft?.channel === "Email" && account.contact.email ? "qualified" : "new"
    });
    if (!draft || draft.channel !== "Email" || !account.contact.email) continue;
    qualifiedCount += 1;
    await createQueueItem({
      automationId: autopilot.id,
      leadId: lead.id,
      recipient: account.contact.email,
      subject: draft.subject,
      body: draft.body,
      state: "ready",
      touchCount: 0
    });
    await updateLead(lead.id, { status: "queued" });
    queuedCount += 1;
  }

  const band = await dispatchAutopilotBatch(mission.bandChatId, novel.flatMap((candidate) => candidate.account.evidence));
  if (band.delegated) await addAutopilotEvent(mission, `BAND dispatched ${band.delegated} scouts to review this batch before the next outreach action.`, "BAND agents", "tool_call");
  return { discoveredCount, qualifiedCount, queuedCount };
}

async function sendReadyQueue(autopilot: Autopilot) {
  if (!autopilot.autoSend || !validEmail(autopilot.replyTo)) return 0;
  const snapshot = await getAutopilotSnapshot(autopilot.missionId);
  const sentToday = await countTodaySent(autopilot.id);
  const capacity = Math.max(0, autopilot.dailySendCap - sentToday);
  if (!capacity) return 0;
  const leads = new Map(snapshot.leads.map((lead) => [lead.id, lead]));
  const pending = snapshot.queue.filter((item) => item.state === "ready").slice(0, capacity);
  let sentCount = 0;
  for (const item of pending) {
    await updateQueueItem(item.id, { lastAttemptAt: now() });
    const result = await sendInsForgeEmail({ to: item.recipient, subject: item.subject, html: draftHtml(item.body), from: autopilot.senderName, replyTo: autopilot.replyTo });
    const lead = leads.get(item.leadId);
    if (result.sent && !result.skipped?.length) {
      await updateQueueItem(item.id, { state: "sent", providerId: result.id, sentAt: now(), touchCount: Math.max(1, item.touchCount || 0), error: undefined });
      if (lead) await updateLead(lead.id, { status: "sent" });
      sentCount += 1;
    } else if (result.sent && result.skipped?.length) {
      await updateQueueItem(item.id, { state: "skipped", error: "Recipient is suppressed by InsForge email preferences." });
      if (lead) await updateLead(lead.id, { status: "skipped" });
    } else {
      await updateQueueItem(item.id, { state: "failed", error: result.error || "InsForge email send failed." });
    }
  }
  return sentCount;
}

async function completedRunsForBinding(binding: NimbleJobBinding) {
  const runs = await listNimbleJobRuns(binding.id);
  return runs.filter(runIsComplete).map((run) => ({ binding, run }));
}

export async function syncAutopilot(autopilot: Autopilot) {
  const { founder, mission } = await getMissionBundle(autopilot.missionId);
  const grouped = await Promise.all(jobBindings(autopilot).map(completedRunsForBinding));
  const finished = grouped.flat().sort((a, b) => String(a.run.created_at || "").localeCompare(String(b.run.created_at || "")));
  let processedRuns = 0;
  let totalQueued = 0;
  let totalSent = 0;

  for (const { binding, run: nimbleRun } of finished) {
    if (!nimbleRun.id) continue;
    const stored = await findAutomationRun(autopilot.id, nimbleRun.id);
    if (stored?.processedAt) continue;
    const run = stored || await createAutomationRun({
      automationId: autopilot.id,
      nimbleRunId: nimbleRun.id,
      lane: binding.lane,
      status: nimbleRun.status || "SUCCESS",
      discoveredCount: 0,
      qualifiedCount: 0,
      queuedCount: 0,
      sentCount: 0
    });
    try {
      const snapshot = await getAutopilotSnapshot(autopilot.missionId);
      const rows = await previewNimbleRunRows(nimbleRun.id);
      const candidates = await enrichCandidates(rows, autopilot.filters, binding.lane, Math.max(0, autopilot.leadTarget - snapshot.leads.length));
      const counts = await queueNewLeads(autopilot, founder, mission, candidates);
      const sentCount = await sendReadyQueue(autopilot);
      await updateAutomationRun(run.id, { status: "processed", ...counts, sentCount, processedAt: now(), error: undefined });
      await updateAutopilot(autopilot.id, { lastProcessedRunId: nimbleRun.id });
      processedRuns += 1;
      totalQueued += counts.queuedCount;
      totalSent += sentCount;
      await addAutopilotEvent(mission, `${binding.lane}: Nimble Job run processed ${counts.discoveredCount} new accounts, ${counts.queuedCount} queued${sentCount ? `, ${sentCount} sent` : ""}.`, sentCount ? "Nimble Jobs + InsForge Email" : "Nimble Jobs + InsForge");
    } catch (error) {
      await updateAutomationRun(run.id, { status: "failed", error: error instanceof Error ? error.message : "Autopilot processing failed" });
      await addAutopilotEvent(mission, error instanceof Error ? error.message : "Autopilot processing failed", "SDR Autopilot", "error");
    }
  }
  return { automationId: autopilot.id, processedRuns, queued: totalQueued, sent: totalSent };
}

export async function syncAllAutopilots() {
  const active = await listActiveAutopilots();
  const results = await Promise.allSettled(active.map(syncAutopilot));
  return {
    checked: active.length,
    processed: results.filter((result) => result.status === "fulfilled").length,
    failures: results.flatMap((result) => result.status === "rejected" ? [result.reason instanceof Error ? result.reason.message : "Autopilot sync failed"] : []),
    results: results.flatMap((result) => result.status === "fulfilled" ? [result.value] : [])
  };
}
