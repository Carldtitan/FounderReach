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
