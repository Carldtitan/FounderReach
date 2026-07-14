create table if not exists autopilots (
  id text primary key,
  "missionId" text not null references missions(id) on delete cascade,
  "founderId" text not null references founders(id) on delete cascade,
  "ownerId" text not null,
  "nimbleJobId" text not null unique,
  name text not null,
  schedule text not null,
  "queryInputs" jsonb not null default '[]'::jsonb,
  filters jsonb not null default '{}'::jsonb,
  "dailySendCap" integer not null default 10 check ("dailySendCap" between 1 and 50),
  "autoSend" boolean not null default false,
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
  error text,
  "createdAt" timestamptz not null,
  "updatedAt" timestamptz not null,
  unique ("leadId")
);

create table if not exists automation_runs (
  id text primary key,
  "automationId" text not null references autopilots(id) on delete cascade,
  "nimbleRunId" text not null,
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
