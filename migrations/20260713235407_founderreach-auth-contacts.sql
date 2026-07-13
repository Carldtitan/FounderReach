alter table founders add column if not exists "ownerId" text;
alter table targets add column if not exists contact jsonb not null default '{}'::jsonb;

create index if not exists founders_owner_id_idx on founders ("ownerId");
