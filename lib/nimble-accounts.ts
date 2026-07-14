import type { ContactRoute, FounderProfile, ResearchLane, SourceEvidence } from "./types";
import type { NimbleResearchProgress } from "./nimble";

export interface MapsResult {
  title?: string;
  place_id?: string;
  place_url?: string;
  phone_number?: string;
  address?: string;
  city?: string;
  rating?: string;
  number_of_reviews?: string;
  business_status?: string;
  sponsored?: boolean;
  place_information?: { website_url?: string };
}

interface BatchTask {
  id?: string;
  state?: string;
  download_url?: string;
}

export interface AccountProspect {
  id: string;
  company: string;
  role: string;
  score: "High" | "Medium" | "Low";
  rationale: string;
  evidence: SourceEvidence[];
  contact: ContactRoute;
}

export interface NimbleAccountDiscovery {
  prospects: AccountProspect[];
  sources: SourceEvidence[];
  stats: { mapsQueries: number; discovered: number; enriched: number; publicEmails: number };
}

type ProgressReporter = (progress: NimbleResearchProgress) => Promise<void> | void;

function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "google.com";
  }
}

function cleanText(value: unknown, max = 600) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function report(progress: ProgressReporter | undefined, item: NimbleResearchProgress) {
  await progress?.(item);
}

async function nimble(path: string, init: RequestInit = {}) {
  const apiKey = process.env.NIMBLE_API_KEY;
  if (!apiKey) throw new Error("NIMBLE_API_KEY is not configured.");
  const response = await fetch(`https://sdk.nimbleway.com/v1/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...(init.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Nimble ${path} failed (${response.status}).`);
  return body as Record<string, unknown>;
}

function locationFor(profile: FounderProfile) {
  return profile.region?.trim() || (profile.market === "Local" ? "your area" : profile.market === "Global" ? "United States" : profile.market);
}

function businessTerm(profile: FounderProfile) {
  const trimmed = profile.audience
    .replace(/\b(owners?|managers?|teams?|leaders?|buyers?|customers?|office)\b/gi, "")
    .replace(/\s+(and|or)\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  return trimmed || profile.audience || profile.startup;
}

export function accountQueries(profile: FounderProfile): Array<{ lane: ResearchLane; query: string }> {
  const term = businessTerm(profile);
  const location = locationFor(profile);
  return [
    { lane: "Buyer signals", query: `${term} in ${location}` },
    { lane: "Buyer signals", query: `${term} services in ${location}` },
    { lane: "Pain signals", query: `independent ${term} in ${location}` },
    { lane: "Pain signals", query: `${term} office in ${location}` },
    { lane: "Channel targets", query: `${term} association in ${location}` },
    { lane: "Channel targets", query: `${term} network in ${location}` }
  ];
}

function scoreMapResult(item: MapsResult) {
  const reviews = Number.parseInt(String(item.number_of_reviews || "0").replace(/\D/g, ""), 10) || 0;
  if (item.phone_number && item.place_information?.website_url && reviews >= 20) return "High" as const;
  if (item.phone_number || item.place_information?.website_url) return "Medium" as const;
  return "Low" as const;
}

export function mapsResultToProspect(item: MapsResult, lane: ResearchLane): AccountProspect | null {
  const company = cleanText(item.title, 120);
  const placeUrl = cleanText(item.place_url, 900);
  if (!company || !placeUrl || item.business_status === "CLOSED_PERMANENTLY" || item.sponsored) return null;
  const website = cleanText(item.place_information?.website_url, 900) || undefined;
  const contact: ContactRoute = {
    phone: cleanText(item.phone_number, 60) || undefined,
    website,
    address: cleanText(item.address, 180) || undefined,
    source: "Nimble Google Maps"
  };
  const evidence: SourceEvidence = {
    title: `${company} on Google Maps`,
    url: placeUrl,
    domain: "google.com",
    snippet: [contact.address, item.rating, item.number_of_reviews ? `${item.number_of_reviews} reviews` : "", contact.phone].filter(Boolean).join(" · "),
    lane,
    method: "search",
    verification: "verified"
  };
  return {
    id: item.place_id || `${company}-${placeUrl}`,
    company,
    role: "Owner or operations lead",
    score: scoreMapResult(item),
    rationale: `${contact.phone ? "Public phone" : "Public listing"}${website ? " and website" : ""} found through Nimble Google Maps.`,
    evidence: [evidence],
    contact
  };
}

function contactPath(links: unknown) {
  const urls = linkUrls(links);
  return urls.find((url) => {
    try {
      return /\/(contact|contact-us|get-started|book|appointment|schedule)(\/|$|\?)/i.test(new URL(url).pathname);
    } catch {
      return false;
    }
  });
}

function linkUrls(links: unknown) {
  if (!Array.isArray(links)) return [] as string[];
  return links
    .map((value) => (typeof value === "string" ? value : typeof value === "object" && value ? (value as { url?: unknown; href?: unknown }).url || (value as { href?: unknown }).href : ""))
    .filter((value): value is string => typeof value === "string");
}

function publicEmail(markdown: string, links: unknown) {
  const mailto = linkUrls(links).find((value) => /^mailto:/i.test(value));
  const fromMailto = typeof mailto === "string" ? mailto.replace(/^mailto:/i, "").split("?")[0] : "";
  const match = markdown.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  return fromMailto || match || undefined;
}

export async function enrichPublicContact(prospect: AccountProspect) {
  if (!prospect.contact.website) return prospect;
  try {
    const map = await nimble("map", { method: "POST", body: JSON.stringify({ url: prospect.contact.website }) });
    const mapped = Array.isArray(map.links) ? map.links.map((link) => (typeof link === "string" ? link : (link as { url?: string }).url)).filter(Boolean) : [];
    const contactUrl = contactPath(mapped) || prospect.contact.website;
    const extracted = await nimble("extract", {
      method: "POST",
      body: JSON.stringify({ url: contactUrl, formats: ["markdown", "links"] })
    });
    const data = (extracted.data || {}) as { markdown?: string; links?: unknown };
    const markdown = cleanText(data.markdown, 4000);
    const email = publicEmail(markdown, data.links);
    const resolvedContact = contactPath(data.links) || contactUrl;
    const contact: ContactRoute = {
      ...prospect.contact,
      email,
      contactUrl: resolvedContact,
      source: email ? "Nimble Extract" : "Public website"
    };
    const evidence: SourceEvidence = {
      title: `${prospect.company} public contact path`,
      url: resolvedContact,
      domain: domainFromUrl(resolvedContact),
      snippet: email ? `Public email: ${email}` : "Public contact path verified by Nimble.",
      lane: prospect.evidence[0]?.lane || "Buyer signals",
      method: "extract",
      verification: "verified"
    };
    return { ...prospect, contact, evidence: [...prospect.evidence, evidence] };
  } catch {
    return prospect;
  }
}

export async function runNimbleAccountDiscovery(
  profile: FounderProfile,
  progress?: ProgressReporter
): Promise<NimbleAccountDiscovery> {
  const queries = accountQueries(profile);
  await report(progress, {
    lane: "Buyer signals",
    phase: "search-start",
    message: `Nimble Maps batch: dispatching ${queries.length} parallel local-business searches`,
    count: queries.length
  });
  const batch = await nimble("agents/batch", {
    method: "POST",
    body: JSON.stringify({
      shared_inputs: { agent: "google_maps_search" },
      inputs: queries.map(({ query }) => ({ params: { query } }))
    })
  });
  const batchId = String(batch.batch_id || "");
  if (!batchId) throw new Error("Nimble did not return a Maps batch id.");

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const status = await nimble(`batches/${batchId}/progress`);
    if (status.completed === true) break;
    await wait(1000);
  }

  const details = await nimble(`batches/${batchId}`);
  const tasks = Array.isArray(details.tasks) ? (details.tasks as BatchTask[]) : [];
  const completed = await Promise.allSettled(
    tasks.map(async (task) => {
      if (task.state !== "success" || !task.download_url) return [] as MapsResult[];
      const result = await fetch(task.download_url, { headers: { Authorization: `Bearer ${process.env.NIMBLE_API_KEY}` } });
      if (!result.ok) return [] as MapsResult[];
      const body = await result.json().catch(() => ({}));
      const rows = body?.data?.parsing?.entities?.SearchResult;
      return Array.isArray(rows) ? (rows as MapsResult[]) : [];
    })
  );

  const prospects: AccountProspect[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < completed.length; index += 1) {
    const result = completed[index];
    const rows = result && result.status === "fulfilled" ? result.value : [];
    const lane = queries[index]?.lane || "Buyer signals";
    for (const row of rows) {
      const prospect = mapsResultToProspect(row, lane);
      if (!prospect || seen.has(prospect.id)) continue;
      seen.add(prospect.id);
      prospects.push(prospect);
    }
  }

  const selected = prospects.slice(0, 60);
  await report(progress, {
    lane: "Buyer signals",
    phase: "search-complete",
    message: `Nimble Maps batch returned ${prospects.length} businesses; retained ${selected.length} contactable accounts`,
    count: selected.length
  });
  await report(progress, {
    phase: "extract-start",
    message: `Nimble contact enrichment: mapping and extracting public contact paths for ${Math.min(selected.length, 30)} accounts`,
    count: Math.min(selected.length, 30)
  });
  const enriched = await Promise.allSettled(selected.slice(0, 30).map(enrichPublicContact));
  const resolved = selected.map((prospect, index) => (index < 30 && enriched[index]?.status === "fulfilled" ? enriched[index].value : prospect));
  const publicEmails = resolved.filter((prospect) => prospect.contact.email).length;
  await report(progress, {
    phase: "extract-complete",
    message: `Nimble contact enrichment found ${publicEmails} public emails and ${resolved.filter((prospect) => prospect.contact.phone).length} public phone routes`,
    count: publicEmails
  });

  return {
    prospects: resolved,
    sources: resolved.flatMap((prospect) => prospect.evidence),
    stats: { mapsQueries: queries.length, discovered: prospects.length, enriched: Math.min(selected.length, 30), publicEmails }
  };
}
