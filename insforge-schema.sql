create table if not exists founders (
  id text primary key,
  "ownerId" text,
  startup text not null,
  description text not null default '',
  stage text not null,
  goal text not null,
  audience text not null,
  market text not null,
  region text,
  tone text not null,
  "approvalMode" text not null,
  "createdAt" timestamptz not null
);

create table if not exists missions (
  id text primary key,
  "founderId" text not null references founders(id) on delete cascade,
  goal text not null,
  stage text not null,
  status text not null,
  "currentStep" text not null,
  playbook text not null,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  "bandChatId" text,
  error text
);

alter table missions add column if not exists "bandChatId" text;

create table if not exists targets (
  id text primary key,
  "missionId" text not null references missions(id) on delete cascade,
  type text not null,
  name text not null,
  company text not null,
  role text not null,
  url text not null,
  "sourceDomain" text not null,
  score text not null,
  rationale text not null,
  contact jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  "createdAt" timestamptz not null
);

create table if not exists drafts (
  id text primary key,
  "missionId" text not null references missions(id) on delete cascade,
  "targetId" text not null references targets(id) on delete cascade,
  channel text not null,
  subject text not null,
  body text not null,
  status text not null,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null
);

create table if not exists approvals (
  id text primary key,
  "missionId" text not null references missions(id) on delete cascade,
  "draftId" text not null references drafts(id) on delete cascade,
  decision text not null,
  "createdAt" timestamptz not null
);

create table if not exists agent_events (
  id text primary key,
  "missionId" text not null references missions(id) on delete cascade,
  agent text not null,
  "eventType" text not null,
  message text not null,
  tool text not null,
  "createdAt" timestamptz not null
);

create index if not exists missions_founder_id_idx on missions ("founderId");
create index if not exists targets_mission_id_idx on targets ("missionId");
create index if not exists drafts_mission_id_idx on drafts ("missionId");
create index if not exists approvals_mission_id_idx on approvals ("missionId");
create index if not exists agent_events_mission_id_idx on agent_events ("missionId");

create table if not exists autopilots (
  id text primary key,
  "missionId" text not null references missions(id) on delete cascade,
  "founderId" text not null references founders(id) on delete cascade,
  "ownerId" text not null,
  "nimbleJobId" text not null unique,
  "nimbleJobs" jsonb not null default '[]'::jsonb,
  name text not null,
  schedule text not null,
  "queryInputs" jsonb not null default '[]'::jsonb,
  filters jsonb not null default '{}'::jsonb,
  "leadTarget" integer not null default 60 check ("leadTarget" between 10 and 500),
  "dailySendCap" integer not null default 10,
  "autoSend" boolean not null default false,
  "autoReply" boolean not null default false,
  "senderName" text,
  "replyTo" text,
  active boolean not null default true,
  "lastProcessedRunId" text,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null
);

create table if not exists persistent_leads (
  id text primary key,
  "automationId" text not null references autopilots(id) on delete cascade,
  "externalKey" text not null,
  name text not null,
  company text not null,
  role text not null,
  score text not null,
  rationale text not null,
  url text not null,
  "sourceDomain" text not null,
  contact jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  status text not null default 'new',
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  unique ("automationId", "externalKey")
);

create table if not exists outreach_queue (
  id text primary key,
  "automationId" text not null references autopilots(id) on delete cascade,
  "leadId" text not null references persistent_leads(id) on delete cascade,
  recipient text not null,
  subject text not null,
  body text not null,
  state text not null default 'ready',
  "providerId" text,
  "sentAt" timestamptz,
  "touchCount" integer not null default 0,
  "nextActionAt" timestamptz,
  "lastAttemptAt" timestamptz,
  error text,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  unique ("leadId")
);

create table if not exists automation_runs (
  id text primary key,
  "automationId" text not null references autopilots(id) on delete cascade,
  "nimbleRunId" text not null,
  lane text,
  status text not null,
  "discoveredCount" integer not null default 0,
  "qualifiedCount" integer not null default 0,
  "queuedCount" integer not null default 0,
  "sentCount" integer not null default 0,
  error text,
  "processedAt" timestamptz,
  "createdAt" timestamptz not null,
  unique ("automationId", "nimbleRunId")
);

create index if not exists autopilots_mission_id_idx on autopilots ("missionId");
create index if not exists autopilots_active_idx on autopilots (active);
create index if not exists persistent_leads_automation_id_idx on persistent_leads ("automationId");
create index if not exists persistent_leads_status_idx on persistent_leads (status);
create index if not exists outreach_queue_automation_state_idx on outreach_queue ("automationId", state);
create index if not exists automation_runs_automation_id_idx on automation_runs ("automationId");
create index if not exists automation_runs_automation_lane_idx on automation_runs ("automationId", lane);
create index if not exists outreach_queue_next_action_idx on outreach_queue ("automationId", state, "nextActionAt");

create table if not exists outreach_conversations (
  id text primary key,
  "automationId" text not null references autopilots(id) on delete cascade,
  "leadId" text not null references persistent_leads(id) on delete cascade,
  "participantEmail" text not null,
  subject text not null,
  state text not null default 'open',
  "lastMessageAt" timestamptz not null,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  unique ("leadId")
);

create table if not exists conversation_messages (
  id text primary key,
  "conversationId" text not null references outreach_conversations(id) on delete cascade,
  direction text not null,
  sender text not null,
  subject text,
  body text not null,
  "providerMessageId" text unique,
  "createdAt" timestamptz not null
);

create index if not exists outreach_conversations_automation_idx on outreach_conversations ("automationId", "lastMessageAt" desc);
create index if not exists conversation_messages_conversation_idx on conversation_messages ("conversationId", "createdAt");
