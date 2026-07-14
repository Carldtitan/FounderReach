alter table autopilots
  add column if not exists "nimbleJobs" jsonb not null default '[]'::jsonb,
  add column if not exists "leadTarget" integer not null default 60 check ("leadTarget" between 10 and 500),
  add column if not exists "autoReply" boolean not null default false;

alter table automation_runs
  add column if not exists lane text;

alter table outreach_queue
  add column if not exists "touchCount" integer not null default 0,
  add column if not exists "nextActionAt" timestamptz,
  add column if not exists "lastAttemptAt" timestamptz;

create index if not exists automation_runs_automation_lane_idx
  on automation_runs ("automationId", lane);

create index if not exists outreach_queue_next_action_idx
  on outreach_queue ("automationId", state, "nextActionAt");

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

create index if not exists outreach_conversations_automation_idx
  on outreach_conversations ("automationId", "lastMessageAt" desc);

create index if not exists conversation_messages_conversation_idx
  on conversation_messages ("conversationId", "createdAt");
