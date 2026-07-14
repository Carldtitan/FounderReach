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
  ownerId: string;
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
  contact?: ContactRoute;
  evidence: SourceEvidence[];
  createdAt: string;
}

export interface ContactRoute {
  phone?: string;
  email?: string;
  website?: string;
  contactUrl?: string;
  address?: string;
  source: "Nimble Google Maps" | "Nimble Extract" | "Public website";
}

export interface Draft {
  id: string;
  missionId: string;
  targetId: string;
  channel: "Email" | "DM" | "Call";
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

export interface AutopilotFilters {
  minReviews: number;
  requireEmail: boolean;
  excludeDomains: string[];
}

export interface NimbleJobBinding {
  id: string;
  lane: ResearchLane;
  queryCount: number;
}

export interface Autopilot {
  id: string;
  missionId: string;
  founderId: string;
  ownerId: string;
  nimbleJobId: string;
  nimbleJobs?: NimbleJobBinding[];
  name: string;
  schedule: string;
  queryInputs: Array<{ query: string; tag?: string }>;
  filters: AutopilotFilters;
  leadTarget: number;
  dailySendCap: number;
  autoSend: boolean;
  autoReply?: boolean;
  senderName?: string;
  replyTo?: string;
  active: boolean;
  lastProcessedRunId?: string;
  createdAt: string;
  updatedAt: string;
}

export type LeadStatus = "new" | "qualified" | "queued" | "sent" | "replied" | "needs_review" | "skipped" | "rejected";

export interface PersistentLead {
  id: string;
  automationId: string;
  externalKey: string;
  name: string;
  company: string;
  role: string;
  score: Score;
  rationale: string;
  url: string;
  sourceDomain: string;
  contact: ContactRoute;
  evidence: SourceEvidence[];
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
}

export type OutreachState = "ready" | "sent" | "skipped" | "failed" | "waiting";

export interface OutreachQueueItem {
  id: string;
  automationId: string;
  leadId: string;
  recipient: string;
  subject: string;
  body: string;
  state: OutreachState;
  providerId?: string;
  sentAt?: string;
  touchCount?: number;
  nextActionAt?: string;
  lastAttemptAt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRun {
  id: string;
  automationId: string;
  nimbleRunId: string;
  lane?: ResearchLane;
  status: string;
  discoveredCount: number;
  qualifiedCount: number;
  queuedCount: number;
  sentCount: number;
  error?: string;
  processedAt?: string;
  createdAt: string;
}

export type ConversationState = "open" | "needs_review" | "closed";

export interface OutreachConversation {
  id: string;
  automationId: string;
  leadId: string;
  participantEmail: string;
  subject: string;
  state: ConversationState;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  direction: "inbound" | "outbound";
  sender: string;
  subject?: string;
  body: string;
  providerMessageId?: string;
  createdAt: string;
}

export interface AutopilotSnapshot {
  autopilot: Autopilot | null;
  leads: PersistentLead[];
  queue: OutreachQueueItem[];
  runs: AutomationRun[];
  conversations: OutreachConversation[];
  messages: ConversationMessage[];
}
