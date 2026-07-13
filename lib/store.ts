import { promises as fs } from "fs";
import path from "path";
import {
  AgentEvent,
  Approval,
  Draft,
  FounderProfile,
  Mission,
  MissionBundle,
  Target
} from "./types";
import { fetchTable, mirrorDelete, mirrorInsert, mirrorUpdate } from "./insforge";

interface StoreData {
  founders: FounderProfile[];
  missions: Mission[];
  targets: Target[];
  drafts: Draft[];
  approvals: Approval[];
  agent_events: AgentEvent[];
}

const defaultData: StoreData = {
  founders: [],
  missions: [],
  targets: [],
  drafts: [],
  approvals: [],
  agent_events: []
};

const dataDir = path.join(process.cwd(), ".data");
const dataPath = path.join(dataDir, "founderreach.json");

async function readInsForgeData(): Promise<StoreData | null> {
  const [founders, missions, targets, drafts, approvals, agentEvents] = await Promise.all([
    fetchTable<FounderProfile>("founders"),
    fetchTable<Mission>("missions"),
    fetchTable<Target>("targets"),
    fetchTable<Draft>("drafts"),
    fetchTable<Approval>("approvals"),
    fetchTable<AgentEvent>("agent_events")
  ]);

  if (!founders || !missions || !targets || !drafts || !approvals || !agentEvents) {
    return null;
  }

  return {
    founders,
    missions,
    targets,
    drafts,
    approvals,
    agent_events: agentEvents
  };
}

async function readLocalData(): Promise<StoreData> {
  try {
    const raw = await fs.readFile(dataPath, "utf8");
    return { ...defaultData, ...JSON.parse(raw) };
  } catch {
    return { ...defaultData };
  }
}

async function readData(): Promise<StoreData> {
  const onlineData = await readInsForgeData();
  return onlineData || readLocalData();
}

async function writeData(data: StoreData) {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
  } catch {
    // InsForge remains the source of truth when a serverless filesystem is read-only.
  }
}

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 14)}`;
}

export function now() {
  return new Date().toISOString();
}

export async function createFounderMission(
  founderInput: Omit<FounderProfile, "id" | "ownerId" | "createdAt">,
  missionInput: Pick<Mission, "goal" | "stage" | "playbook">,
  ownerId: string
) {
  const data = await readData();
  const createdAt = now();
  const founder: FounderProfile = {
    ...founderInput,
    id: newId("founder"),
    ownerId,
    createdAt
  };
  const mission: Mission = {
    id: newId("mission"),
    founderId: founder.id,
    goal: missionInput.goal,
    stage: missionInput.stage,
    playbook: missionInput.playbook,
    status: "ready",
    currentStep: "Idle",
    createdAt,
    updatedAt: createdAt
  };

  data.founders.push(founder);
  data.missions.push(mission);
  await writeData(data);
  const founderInsert = await mirrorInsert("founders", founder);
  if (!founderInsert.mirrored) {
    throw new Error(`InsForge founder insert failed: ${founderInsert.error || "unknown error"}`);
  }
  const missionInsert = await mirrorInsert("missions", mission);
  if (!missionInsert.mirrored) {
    throw new Error(`InsForge mission insert failed: ${missionInsert.error || "unknown error"}`);
  }
  return getMissionBundle(mission.id);
}

function bundleFromData(data: StoreData, missionId: string): MissionBundle {
  const mission = data.missions.find((item) => item.id === missionId);
  if (!mission) {
    throw new Error("Mission not found");
  }
  const founder = data.founders.find((item) => item.id === mission.founderId);
  if (!founder) {
    throw new Error("Founder not found");
  }
  return {
    founder,
    mission,
    targets: data.targets.filter((item) => item.missionId === missionId),
    drafts: data.drafts.filter((item) => item.missionId === missionId),
    approvals: data.approvals.filter((item) => item.missionId === missionId),
    events: data.agent_events.filter((item) => item.missionId === missionId)
  };
}

export async function getMissionBundle(missionId: string): Promise<MissionBundle> {
  const onlineData = await readInsForgeData();
  if (onlineData?.missions.some((item) => item.id === missionId)) {
    return bundleFromData(onlineData, missionId);
  }
  return bundleFromData(await readLocalData(), missionId);
}

export async function updateMission(missionId: string, update: Partial<Mission>) {
  const data = await readData();
  const mission = data.missions.find((item) => item.id === missionId);
  if (!mission) {
    throw new Error("Mission not found");
  }
  Object.assign(mission, update, { updatedAt: now() });
  await writeData(data);
  await mirrorUpdate("missions", missionId, update).catch(() => null);
}

export async function replaceMissionResults(missionId: string, targets: Target[], drafts: Draft[]) {
  const data = await readData();
  data.targets = data.targets.filter((item) => item.missionId !== missionId).concat(targets);
  data.drafts = data.drafts.filter((item) => item.missionId !== missionId).concat(drafts);
  await writeData(data);
  await mirrorDelete("drafts", "missionId", missionId).catch(() => null);
  await mirrorDelete("targets", "missionId", missionId).catch(() => null);
  await mirrorInsert("targets", targets).catch(() => null);
  await mirrorInsert("drafts", drafts).catch(() => null);
}

export async function addEvent(event: Omit<AgentEvent, "id" | "createdAt">) {
  const data = await readData();
  const full: AgentEvent = {
    ...event,
    id: newId("event"),
    createdAt: now()
  };
  data.agent_events.push(full);
  await writeData(data);
  await mirrorInsert("agent_events", full).catch(() => null);
  return full;
}

export async function setDraftDecision(missionId: string, draftId: string, decision: "approved" | "rejected") {
  const data = await readData();
  const draft = data.drafts.find((item) => item.id === draftId && item.missionId === missionId);
  if (!draft) {
    throw new Error("Draft not found");
  }
  draft.status = decision;
  draft.updatedAt = now();
  const approval: Approval = {
    id: newId("approval"),
    missionId,
    draftId,
    decision,
    createdAt: now()
  };
  data.approvals.push(approval);
  await writeData(data);
  await mirrorUpdate("drafts", draftId, { status: decision, updatedAt: draft.updatedAt }).catch(() => null);
  await mirrorInsert("approvals", approval).catch(() => null);
  return approval;
}

export async function updateDraftContent(missionId: string, draftId: string, update: Pick<Draft, "subject" | "body">) {
  const data = await readData();
  const draft = data.drafts.find((item) => item.id === draftId && item.missionId === missionId);
  if (!draft) {
    throw new Error("Draft not found");
  }
  draft.subject = update.subject.trim();
  draft.body = update.body.trim();
  draft.status = "edited";
  draft.updatedAt = now();
  await writeData(data);
  await mirrorUpdate("drafts", draftId, {
    subject: draft.subject,
    body: draft.body,
    status: draft.status,
    updatedAt: draft.updatedAt
  }).catch(() => null);
  return draft;
}
