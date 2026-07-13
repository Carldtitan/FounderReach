export type Stage = "Idea" | "Beta" | "First customers" | "Growth";
export type Goal = "Interviews" | "Beta users" | "Customers" | "Partners" | "Investors";
export type Market = "Local" | "US" | "Global";
export type Tone = "Direct" | "Warm" | "Founder-led" | "Enterprise";
export type ApprovalMode = "Draft only" | "Ask first";
export type MissionStatus = "ready" | "running" | "complete" | "error";
export type StepName = "Research" | "Score" | "Draft" | "Review";
export type Score = "High" | "Medium" | "Low";
export type DraftStatus = "draft" | "approved" | "rejected" | "edited";
export type ResearchLane = "Pain signals" | "Buyer signals" | "Channel targets";

export interface FounderProfile {
  id: string;
  startup: string;
  description: string;
  stage: Stage;
  goal: Goal;
  audience: string;
  market: Market;
  region?: string;
  tone: Tone;
  approvalMode: ApprovalMode;
  createdAt: string;
}

export interface Mission {
  id: string;
  founderId: string;
  goal: Goal;
  stage: Stage;
  status: MissionStatus;
  currentStep: StepName | "Idle";
  playbook: string;
  createdAt: string;
  updatedAt: string;
  bandChatId?: string;
  error?: string;
}

export interface SourceEvidence {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  lane?: ResearchLane;
  method?: "search" | "extract" | "map";
  verification?: "discovered" | "verified";
}

export interface Target {
  id: string;
  missionId: string;
  type: string;
  name: string;
  company: string;
  role: string;
  url: string;
  sourceDomain: string;
  score: Score;
  rationale: string;
  evidence: SourceEvidence[];
  createdAt: string;
}

export interface Draft {
  id: string;
  missionId: string;
  targetId: string;
  channel: "Email" | "DM";
  subject: string;
  body: string;
  status: DraftStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Approval {
  id: string;
  missionId: string;
  draftId: string;
  decision: "approved" | "rejected";
  createdAt: string;
}

export interface AgentEvent {
  id: string;
  missionId: string;
  agent: string;
  eventType: "research" | "score" | "draft" | "approval" | "export" | "error" | "status" | "tool_call" | "tool_result";
  message: string;
  tool: string;
  createdAt: string;
}

export interface MissionBundle {
  founder: FounderProfile;
  mission: Mission;
  targets: Target[];
  drafts: Draft[];
  approvals: Approval[];
  events: AgentEvent[];
}
