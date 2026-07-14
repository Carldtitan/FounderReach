export interface NimbleJob {
  id: string;
  name: string;
  agent_name?: string;
  schedule?: { cron: string; enabled: boolean };
  last_run_at?: string | null;
  last_run_status?: string | null;
}

export interface NimbleJobRun {
  id: string;
  job_id: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED" | "CANCELLED" | "TIMEOUT" | "WARNING";
  triggered_by?: "schedule" | "manual";
  created_at?: string;
  started_at?: string | null;
  finished_at?: string | null;
  input_count?: number | null;
  result_count?: number | null;
}

interface NimbleArtifact {
  id: string;
  type?: string;
  description?: string;
}

function unwrap<T>(body: T | { data?: T }) {
  if (body && typeof body === "object" && "data" in body) {
    const wrapped = body as { data?: T };
    if (wrapped.data) return wrapped.data;
  }
  return body as T;
}

function apiKey() {
  const value = process.env.NIMBLE_API_KEY;
  if (!value) throw new Error("NIMBLE_API_KEY is not configured.");
  return value;
}

async function request<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`https://sdk.nimbleway.com/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = typeof body?.detail === "string" ? body.detail : "";
    throw new Error(`Nimble Jobs ${path} failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }
  return unwrap(body as T | { data?: T });
}

export async function createNimbleLeadJob(input: {
  automationId: string;
  name: string;
  lane: string;
  cron: string;
  queries: Array<{ query: string; tag?: string }>;
}) {
  const laneKey = input.lane.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return request<NimbleJob>("jobs", {
    method: "POST",
    body: JSON.stringify({
      name: `founderreach_${input.automationId}_${laneKey}`,
      display_name: input.name,
      description: `FounderReach recurring ${input.lane.toLowerCase()} discovery.`,
      agent_name: "google_maps_search",
      schedule: { cron: input.cron, enabled: true },
      inputs: { type: "inline", data: input.queries },
      destination: { type: "file", path: `founderreach/${input.automationId}`, format: "jsonl" }
    })
  });
}

export async function setNimbleJobActive(jobId: string, active: boolean) {
  return request<NimbleJob>(`jobs/${jobId}`, {
    method: "PATCH",
    body: JSON.stringify({ schedule: { enabled: active } })
  });
}

export async function updateNimbleLeadJob(jobId: string, update: { cron: string; active: boolean }) {
  return request<NimbleJob>(`jobs/${jobId}`, {
    method: "PATCH",
    body: JSON.stringify({ schedule: { cron: update.cron, enabled: update.active } })
  });
}

export async function triggerNimbleJob(jobId: string) {
  return request<NimbleJobRun>(`jobs/${jobId}/runs`, { method: "POST" });
}

export async function listNimbleJobRuns(jobId: string) {
  const body = await request<{ items?: NimbleJobRun[]; data?: NimbleJobRun[] } | NimbleJobRun[]>(`jobs/${jobId}/runs`);
  return Array.isArray(body) ? body : body.items || body.data || [];
}

export async function previewNimbleRunRows(runId: string) {
  const listed = await request<{ items?: NimbleArtifact[]; data?: NimbleArtifact[] }>(`jobs/runs/${runId}/artifacts`);
  const artifacts = listed.items || listed.data || [];
  for (const artifact of artifacts) {
    const preview = await request<{ rows?: Record<string, unknown>[]; data?: { rows?: Record<string, unknown>[] } }>(`jobs/runs/${runId}/artifacts/${artifact.id}/preview`).catch(() => null);
    const rows = preview?.rows || preview?.data?.rows;
    if (rows?.length) return rows;
  }
  return [] as Record<string, unknown>[];
}
