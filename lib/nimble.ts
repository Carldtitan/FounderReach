import type { FounderProfile, ResearchLane, SourceEvidence } from "./types";
import { buildResearchLanes } from "./playbooks";

interface NimbleSearchResult {
  title?: string;
  url?: string;
  description?: string;
  content?: string;
}

interface NimbleMapLink {
  url?: string;
  href?: string;
}

export interface NimbleResearchProgress {
  lane?: ResearchLane;
  phase: "search-start" | "search-complete" | "extract-start" | "extract-complete" | "map-start" | "map-complete";
  message: string;
  count?: number;
}

export interface NimbleResearchResult {
  sources: SourceEvidence[];
  stats: {
    queries: number;
    discovered: number;
    extracted: number;
    mapped: number;
  };
}

type ProgressReporter = (progress: NimbleResearchProgress) => Promise<void> | void;

const excludedMapDomains = new Set([
  "reddit.com",
  "linkedin.com",
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "tiktok.com",
  "google.com"
]);

const excludedResearchDomains = new Set([
  "google.com",
  "gemini.google.com",
  "cloud.google.com",
  "support.google.com",
  "openai.com",
  "chatgpt.com",
  "wikipedia.org"
]);

function domainFromUrl(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

function safeText(value: unknown, max = 560) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

async function report(callback: ProgressReporter | undefined, progress: NimbleResearchProgress) {
  await callback?.(progress);
}

async function nimbleRequest(path: string, body: Record<string, unknown>) {
  const apiKey = process.env.NIMBLE_API_KEY;
  if (!apiKey) throw new Error("NIMBLE_API_KEY is not configured.");

  const response = await fetch(`https://sdk.nimbleway.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Nimble ${path} failed (${response.status}).`);
  }
  return payload as Record<string, unknown>;
}

async function searchLane(profile: FounderProfile, lane: ResearchLane, queries: string[], progress?: ProgressReporter) {
  await report(progress, {
    lane,
    phase: "search-start",
    message: `${lane}: running ${queries.length} focused Nimble searches`,
    count: queries.length
  });

  const settled = await Promise.allSettled(
    queries.map(async (query) => {
      const payload = await nimbleRequest("search", {
        query,
        focus: "general",
        search_depth: "lite",
        max_results: 6
      });
      const results = (payload.results || []) as NimbleSearchResult[];
      return results
        .filter((item) => item.url)
        .map((item) => ({
          title: safeText(item.title || domainFromUrl(item.url || ""), 120),
          url: item.url as string,
          domain: domainFromUrl(item.url as string),
          snippet: safeText(item.description || item.content || `Found for ${query}`),
          lane,
          method: "search" as const,
          verification: "discovered" as const
        }));
    })
  );

  const sources = settled.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  await report(progress, {
    lane,
    phase: "search-complete",
    message: `${lane}: found ${sources.length} public pages`,
    count: sources.length
  });
  return sources;
}

function selectDiverse(sources: SourceEvidence[], max: number) {
  const byUrl = new Map<string, SourceEvidence>();
  const domainCounts = new Map<string, number>();
  for (const source of sources) {
    if (byUrl.has(source.url)) continue;
    if (excludedResearchDomains.has(source.domain)) continue;
    const currentCount = domainCounts.get(source.domain) || 0;
    if (currentCount >= 2) continue;
    byUrl.set(source.url, source);
    domainCounts.set(source.domain, currentCount + 1);
    if (byUrl.size >= max) break;
  }
  return Array.from(byUrl.values());
}

function selectBalanced(laneResults: SourceEvidence[][], max: number) {
  const selected: SourceEvidence[] = [];
  const usedUrls = new Set<string>();
  const domainCounts = new Map<string, number>();
  const indices = laneResults.map(() => 0);

  while (selected.length < max) {
    let added = false;
    for (let laneIndex = 0; laneIndex < laneResults.length && selected.length < max; laneIndex += 1) {
      const lane = laneResults[laneIndex];
      while (indices[laneIndex] < lane.length) {
        const source = lane[indices[laneIndex]++];
        const count = domainCounts.get(source.domain) || 0;
        if (usedUrls.has(source.url) || excludedResearchDomains.has(source.domain) || count >= 2) continue;
        selected.push(source);
        usedUrls.add(source.url);
        domainCounts.set(source.domain, count + 1);
        added = true;
        break;
      }
    }
    if (!added) break;
  }
  return selected;
}

async function extractEvidence(source: SourceEvidence) {
  const payload = await nimbleRequest("extract", {
    url: source.url,
    formats: ["markdown"]
  });
  const data = (payload.data || {}) as { markdown?: string };
  const markdown = safeText(data.markdown, 1000);
  return {
    ...source,
    snippet: markdown || source.snippet,
    method: "extract" as const,
    verification: "verified" as const
  };
}

function mapCandidateUrls(payload: Record<string, unknown>) {
  const links = Array.isArray(payload.links) ? (payload.links as Array<string | NimbleMapLink>) : [];
  return links
    .map((link) => (typeof link === "string" ? link : link.url || link.href || ""))
    .filter((url) => /^https?:\/\//.test(url))
    .filter((url) => /\/(about|team|careers|blog|news|press|pricing|customers|case-studies|locations|partners)/i.test(new URL(url).pathname));
}

async function mapRelatedEvidence(source: SourceEvidence) {
  const payload = await nimbleRequest("map", { url: source.url });
  return mapCandidateUrls(payload)
    .slice(0, 2)
    .map((url) => ({
      title: `${source.domain} supporting page`,
      url,
      domain: domainFromUrl(url),
      snippet: `Discovered from ${source.domain}`,
      lane: source.lane,
      method: "map" as const,
      verification: "discovered" as const
    }));
}

export async function runNimbleResearch(profile: FounderProfile, progress?: ProgressReporter): Promise<NimbleResearchResult> {
  if (!process.env.NIMBLE_API_KEY) {
    return { sources: fallbackSources(profile), stats: { queries: 0, discovered: 0, extracted: 0, mapped: 0 } };
  }

  const lanes = buildResearchLanes(profile);
  const laneResults = await Promise.all(lanes.map((lane) => searchLane(profile, lane.id, lane.queries, progress)));
  // Round-robin selection keeps every research lane represented in verification and in the BAND review packets.
  const discovered = selectBalanced(laneResults, 12);

  await report(progress, {
    phase: "extract-start",
    message: `Evidence verifier: extracting ${Math.min(discovered.length, 6)} strongest pages`,
    count: Math.min(discovered.length, 6)
  });
  const extractedSettled = await Promise.allSettled(discovered.slice(0, 6).map(extractEvidence));
  const extracted = extractedSettled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  await report(progress, {
    phase: "extract-complete",
    message: `Evidence verifier: verified ${extracted.length} pages in clean markdown`,
    count: extracted.length
  });

  const mappable = extracted.filter((source) => !excludedMapDomains.has(source.domain)).slice(0, 2);
  await report(progress, {
    phase: "map-start",
    message: `Evidence verifier: mapping ${mappable.length} company sites for supporting pages`,
    count: mappable.length
  });
  const mappedSettled = await Promise.allSettled(mappable.map(mapRelatedEvidence));
  const mapped = selectDiverse(mappedSettled.flatMap((result) => (result.status === "fulfilled" ? result.value : [])), 6);
  const supportingExtracts = await Promise.allSettled(mapped.slice(0, 2).map(extractEvidence));
  const verifiedSupporting = supportingExtracts.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  await report(progress, {
    phase: "map-complete",
    message: `Evidence verifier: added ${verifiedSupporting.length} mapped supporting pages`,
    count: verifiedSupporting.length
  });

  const sources = selectDiverse([...extracted, ...verifiedSupporting, ...discovered], 14);
  return {
    sources: sources.length ? sources : fallbackSources(profile),
    stats: {
      queries: lanes.reduce((sum, lane) => sum + lane.queries.length, 0),
      discovered: discovered.length,
      extracted: extracted.length + verifiedSupporting.length,
      mapped: mapped.length
    }
  };
}

function fallbackSources(profile: FounderProfile): SourceEvidence[] {
  const clean = encodeURIComponent(`${profile.audience} ${profile.description}`);
  return [
    {
      title: `${profile.audience} discussions`,
      url: `https://www.reddit.com/search/?q=${clean}`,
      domain: "reddit.com",
      snippet: "Public conversations around the problem and audience.",
      lane: "Pain signals",
      method: "search",
      verification: "discovered"
    },
    {
      title: `${profile.startup || profile.audience} launches`,
      url: `https://www.producthunt.com/search?q=${clean}`,
      domain: "producthunt.com",
      snippet: "Comparable launches and active users in the market.",
      lane: "Buyer signals",
      method: "search",
      verification: "discovered"
    },
    {
      title: `${profile.audience} events`,
      url: `https://www.google.com/search?q=${clean}+events`,
      domain: "google.com",
      snippet: "Events and communities where the audience gathers.",
      lane: "Channel targets",
      method: "search",
      verification: "discovered"
    }
  ];
}
