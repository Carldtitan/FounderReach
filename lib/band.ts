import type { AgentEvent, FounderProfile, Mission, ResearchLane, SourceEvidence } from "./types";

export type CampaignTaskKey = ResearchLane | "Evidence verification" | "Outreach drafts";

const scoutDefinitions: Array<{ lane: ResearchLane; name: string; handle: string }> = [
  { lane: "Pain signals", name: "Pain Scout", handle: "carl/pain-scout" },
  { lane: "Buyer signals", name: "Buyer Scout", handle: "carl/buyer-scout" },
  { lane: "Channel targets", name: "Channel Scout", handle: "carl/channel-scout" }
];

interface BandTaskResponse {
  data?: { id?: string };
}

export interface CampaignBoard {
  roomId: string | null;
  tasks: Partial<Record<CampaignTaskKey, string>>;
}

interface BandPeerPayload {
  id?: string;
  name?: string;
  handle?: string;
  type?: string;
}

export interface BandScout {
  id: string;
  name: string;
  handle: string;
  lane: ResearchLane;
}

export interface BandScoutBrief {
  agent: string;
  handle: string;
  lane: ResearchLane;
  content: string;
}

export function bandDashboardUrl() {
  return process.env.BAND_BASE_URL || process.env.BAND_REST_URL || "https://app.band.ai/dashboard";
}

function bandApiBaseUrl() {
  return (process.env.BAND_BASE_URL || process.env.BAND_REST_URL || "https://app.band.ai").replace(/\/$/, "");
}

function bandHeaders() {
  const apiKey = process.env.BAND_API_KEY;
  if (!apiKey) return null;
  return {
    "Content-Type": "application/json",
    "X-API-Key": apiKey
  };
}

function bandEventType(event: AgentEvent) {
  if (event.eventType === "error") return "error";
  if (event.eventType === "tool_call") return "tool_call";
  if (event.eventType === "tool_result") return "tool_result";
  return "task";
}

async function bandRequest(path: string, init: RequestInit) {
  const headers = bandHeaders();
  if (!headers) return null;
  try {
    const response = await fetch(`${bandApiBaseUrl()}${path}`, {
      ...init,
      headers: { ...headers, ...(init.headers || {}) }
    });
    const body = await response.json().catch(() => null);
    return { ok: response.ok, body };
  } catch {
    return null;
  }
}

function compactPacket(sources: SourceEvidence[]) {
  return sources.slice(0, 4).map((source, index) => ({
    number: index + 1,
    title: source.title,
    url: source.url,
    domain: source.domain,
    verification: source.verification || "discovered",
    evidence: source.snippet.slice(0, 360)
  }));
}

export async function getBandScouts(): Promise<BandScout[]> {
  const result = await bandRequest("/api/v1/agent/peers", { method: "GET" });
  if (!result?.ok) return [];
  const raw = (result.body as { data?: BandPeerPayload[] } | null)?.data;
  const peers = Array.isArray(raw) ? raw : [];

  return scoutDefinitions.flatMap((definition) => {
    const peer = peers.find((candidate) => candidate.handle === definition.handle && candidate.type === "Agent");
    if (!peer?.id || !peer.name || !peer.handle) return [];
    return [{ id: peer.id, name: peer.name, handle: peer.handle, lane: definition.lane }];
  });
}

export async function addBandScouts(roomId: string | undefined, scouts: BandScout[]) {
  if (!roomId || !scouts.length) return { added: 0 };
  const settled = await Promise.allSettled(
    scouts.map((scout) =>
      bandRequest(`/api/v1/agent/chats/${roomId}/participants`, {
        method: "POST",
        body: JSON.stringify({ participant: { participant_id: scout.id } })
      })
    )
  );
  return { added: settled.filter((item) => item.status === "fulfilled" && item.value?.ok).length };
}

async function sendBandMessage(roomId: string, content: string, scout: BandScout) {
  const result = await bandRequest(`/api/v1/agent/chats/${roomId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      message: {
        content,
        mentions: [{ id: scout.id, name: scout.name, handle: scout.handle }]
      }
    })
  });
  return Boolean(result?.ok);
}

export async function delegateEvidenceToScouts(
  roomId: string | undefined,
  scouts: BandScout[],
  sources: SourceEvidence[]
) {
  if (!roomId || !scouts.length) return { delegated: [] as BandScout[] };

  const settled = await Promise.allSettled(
    scouts.map(async (scout) => {
      const evidence = compactPacket(sources.filter((source) => source.lane === scout.lane));
      if (!evidence.length) return null;
      const prompt = [
        `@${scout.handle} You are the ${scout.name} in this FounderReach campaign.`,
        "Review the verified public evidence below. Select the two strongest outreach opportunities.",
        "Reply with exactly two concise bullets. Each bullet must state the source URL, the public signal, and why it is worth contacting.",
        "Do not invent people, companies, or facts. Reply to @carl/codex-connect when finished.",
        "Evidence packet:",
        JSON.stringify(evidence)
      ].join("\n");
      const sent = await sendBandMessage(roomId, prompt, scout);
      return sent ? scout : null;
    })
  );

  return {
    delegated: settled.flatMap((item) => (item.status === "fulfilled" && item.value ? [item.value] : []))
  };
}

function messagesFromContext(value: unknown) {
  const found: Array<{ id?: string; content: string; senderId: string; senderName: string }> = [];
  const visited = new Set<object>();

  function visit(node: unknown) {
    if (!node || typeof node !== "object" || visited.has(node)) return;
    visited.add(node);
    const record = node as Record<string, unknown>;
    const content = typeof record.content === "string" ? record.content : "";
    const actor = [record.sender, record.author, record.agent, record.user, record.participant].find(
      (candidate) => candidate && typeof candidate === "object"
    ) as Record<string, unknown> | undefined;
    const senderId =
      (typeof record.sender_id === "string" && record.sender_id) ||
      (typeof actor?.id === "string" && actor.id) ||
      "";
    const senderName =
      (typeof record.sender_name === "string" && record.sender_name) ||
      (typeof actor?.name === "string" && actor.name) ||
      "";

    if (content && senderId) {
      found.push({ id: typeof record.id === "string" ? record.id : undefined, content, senderId, senderName });
    }
    for (const child of Object.values(record)) {
      if (Array.isArray(child)) child.forEach(visit);
      else visit(child);
    }
  }

  visit(value);
  return Array.from(new Map(found.map((message) => [`${message.id || ""}:${message.senderId}:${message.content}`, message])).values());
}

async function readBandContext(roomId: string) {
  const result = await bandRequest(`/api/v1/agent/chats/${roomId}/context`, { method: "GET" });
  return result?.ok ? messagesFromContext(result.body) : [];
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForScoutBriefs(roomId: string | undefined, scouts: BandScout[]): Promise<BandScoutBrief[]> {
  if (!roomId || !scouts.length) return [];
  const byId = new Map(scouts.map((scout) => [scout.id, scout]));
  const received = new Map<string, BandScoutBrief>();

  for (let attempt = 0; attempt < 20 && received.size < scouts.length; attempt += 1) {
    const messages = await readBandContext(roomId);
    for (const message of messages) {
      const scout = byId.get(message.senderId);
      if (!scout) continue;
      received.set(scout.handle, {
        agent: scout.name,
        handle: scout.handle,
        lane: scout.lane,
        content: message.content.slice(0, 1600)
      });
    }
    if (received.size < scouts.length) await wait(2500);
  }

  return Array.from(received.values());
}

export async function ensureBandRoom(mission: Mission, founder: FounderProfile) {
  if (mission.bandChatId) return { roomId: mission.bandChatId, created: false };

  const created = await bandRequest("/api/v1/agent/chats", {
    method: "POST",
    body: JSON.stringify({ chat: {} })
  });
  const roomId = (created?.body as { data?: { id?: string } } | null)?.data?.id;
  if (!created?.ok || !roomId) {
    return { roomId: null, created: false, reason: "BAND could not create a campaign room." };
  }

  const title = `FounderReach: ${founder.startup}`.slice(0, 120);
  await bandRequest(`/api/v1/agent/chats/${roomId}`, {
    method: "PATCH",
    body: JSON.stringify({ chat: { title } })
  });
  return { roomId, created: true };
}

export async function createCampaignBoard(roomId: string | undefined, founder: FounderProfile): Promise<CampaignBoard> {
  if (!roomId || !bandHeaders()) return { roomId: roomId || null, tasks: {} };

  await bandRequest(`/api/v1/agent/chats/${roomId}/board`, {
    method: "PUT",
    body: JSON.stringify({
      goal_title: `Find credible ${founder.goal.toLowerCase()} opportunities`,
      goal_summary: `${founder.startup} for ${founder.audience}. Verify public evidence before drafting outreach.`
    })
  });

  const taskDefinitions: Array<{ key: CampaignTaskKey; subject: string; detail: string }> = [
    { key: "Pain signals", subject: "Research pain signals", detail: "Search public discussions where the problem is explicitly described." },
    { key: "Buyer signals", subject: "Research buyer signals", detail: "Search public evidence of urgency, hiring, growth, or workflow change." },
    { key: "Channel targets", subject: "Research channel targets", detail: "Search communities, events, newsletters, and partners that reach the audience." },
    { key: "Evidence verification", subject: "Verify evidence", detail: "Extract clean source pages and map supporting company pages before ranking." },
    { key: "Outreach drafts", subject: "Write evidence-based drafts", detail: "Use only verified public evidence and keep outreach concise." }
  ];

  const settled = await Promise.allSettled(
    taskDefinitions.map(async (task) => {
      const result = await bandRequest(`/api/v1/agent/chats/${roomId}/tasks`, {
        method: "POST",
        body: JSON.stringify({ subject: task.subject, detail: task.detail })
      });
      const id = (result?.body as BandTaskResponse | null)?.data?.id;
      return id ? ([task.key, id] as const) : null;
    })
  );

  const tasks: Partial<Record<CampaignTaskKey, string>> = {};
  for (const result of settled) {
    if (result.status === "fulfilled" && result.value) {
      tasks[result.value[0]] = result.value[1];
    }
  }
  return { roomId, tasks };
}

export async function startBandTask(roomId: string | undefined, taskId: string | undefined, activeForm: string) {
  if (!roomId || !taskId) return { updated: false };
  const result = await bandRequest(`/api/v1/agent/chats/${roomId}/tasks/${taskId}`, {
    method: "POST",
    body: JSON.stringify({ active_form: activeForm })
  });
  return { updated: Boolean(result?.ok) };
}

export async function completeBandTask(roomId: string | undefined, taskId: string | undefined, comment: string) {
  if (!roomId || !taskId) return { updated: false };
  const result = await bandRequest(`/api/v1/agent/chats/${roomId}/tasks/${taskId}`, {
    method: "POST",
    body: JSON.stringify({ status: "completed", comment })
  });
  return { updated: Boolean(result?.ok) };
}

export async function sendBandEvent(event: AgentEvent, roomId?: string) {
  if (!bandHeaders() || !roomId) {
    return { sent: false, reason: "No BAND campaign room is available; event remains in FounderReach activity." };
  }

  const result = await bandRequest(`/api/v1/agent/chats/${roomId}/events`, {
    method: "POST",
    body: JSON.stringify({
      event: {
        content: event.message,
        message_type: bandEventType(event),
        metadata: {
          campaign_id: event.missionId,
          coordinator: event.agent,
          tool: event.tool,
          occurred_at: event.createdAt
        }
      }
    })
  });
  return result?.ok ? { sent: true } : { sent: false, reason: "BAND rejected the event." };
}
