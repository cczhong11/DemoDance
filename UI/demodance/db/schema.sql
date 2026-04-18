-- DemoDance project-based schema (PostgreSQL)
-- Designed from current UI flow in app/page.tsx and backend APIs.

create extension if not exists pgcrypto;

-- ===== Enum types =====
create type step_id as enum (
  'audience',
  'importance',
  'product',
  'features',
  'tech',
  'impact'
);

create type project_status as enum (
  'draft',
  'collecting',
  'ready_to_generate',
  'generating',
  'completed',
  'failed',
  'archived'
);

create type step_status as enum (
  'pending',
  'active',
  'done'
);

create type message_role as enum (
  'ai',
  'user',
  'system'
);

create type field_source as enum (
  'user',
  'ai_suggest',
  'ai_chat',
  'imported'
);

create type markdown_doc_status as enum (
  'draft',
  'ready',
  'archived'
);

create type asset_kind as enum (
  'logo',
  'demo_video',
  'audio',
  'image',
  'document',
  'subtitle_srt',
  'final_video',
  'other'
);

create type generation_status as enum (
  'queued',
  'running',
  'succeeded',
  'failed',
  'canceled',
  'expired'
);

create type generation_stage as enum (
  'script_storyboard',
  'research_evidence',
  'voice_subtitle',
  'render_video',
  'done'
);

-- ===== Core project =====
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status project_status not null default 'draft',
  active_step step_id not null default 'audience',

  -- optional owner reference (future auth)
  owner_ref text,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index idx_projects_owner_ref on projects (owner_ref);
create index idx_projects_status on projects (status);

-- ===== Step progress =====
create table project_steps (
  project_id uuid not null references projects(id) on delete cascade,
  step step_id not null,
  position smallint not null,
  status step_status not null default 'pending',
  completed_at timestamptz,

  primary key (project_id, step),
  unique (project_id, position)
);

create index idx_project_steps_status on project_steps (status);

-- ===== Fields per step =====
-- Stores UI field values like:
-- audience.user, audience.problem, importance.evidence, product.logo/name/slogan, ...
create table project_step_fields (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  step step_id not null,
  field_key text not null,
  label text,
  value_text text not null default '',
  placeholder text,
  source field_source not null default 'user',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (project_id, step, field_key)
);

create index idx_step_fields_project_step on project_step_fields (project_id, step);

-- ===== Markdown docs per step (many docs per step) =====
-- Example: in step "features" you may keep multiple markdown files:
-- - feature-outline.md
-- - feature-story.md
-- - release-notes.md
create table project_step_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  step step_id not null,

  slug text not null,
  title text not null,
  status markdown_doc_status not null default 'draft',

  -- Current markdown snapshot for fast reads.
  content_md text not null default '',

  created_by_role message_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,

  unique (project_id, step, slug)
);

create index idx_step_docs_project_step on project_step_documents (project_id, step);
create index idx_step_docs_status on project_step_documents (status);

-- Chat thread attached to each markdown document.
-- User and AI discuss edits here.
create table project_step_document_messages (
  id bigserial primary key,
  document_id uuid not null references project_step_documents(id) on delete cascade,
  role message_role not null,
  text text not null,
  tag text,
  created_at timestamptz not null default now()
);

create index idx_step_doc_messages_document_created on project_step_document_messages (document_id, created_at);

-- ===== Chat log =====
create table project_chat_messages (
  id bigserial primary key,
  project_id uuid not null references projects(id) on delete cascade,
  role message_role not null,
  text text not null,
  tag text,
  related_step step_id,

  created_at timestamptz not null default now()
);

create index idx_chat_project_created on project_chat_messages (project_id, created_at);

-- ===== Evidence links for "importance" step =====
create table project_evidence_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  step step_id not null default 'importance',

  source_name text,
  title text,
  url text not null,
  snippet text,
  score numeric(5,2),

  published_at timestamptz,
  retrieved_at timestamptz not null default now(),

  unique (project_id, url)
);

create index idx_evidence_project_step on project_evidence_sources (project_id, step);

-- ===== Uploaded/generated files =====
create table project_assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind asset_kind not null,

  file_name text,
  mime_type text,
  file_size_bytes bigint,

  storage_url text,
  storage_path text,

  provider text,
  provider_asset_id text,

  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_assets_project_kind on project_assets (project_id, kind);

-- ===== Generation run =====
create table generation_jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,

  status generation_status not null default 'queued',
  current_stage generation_stage,

  -- Snapshot of script/fields at generation start for reproducibility
  script_snapshot jsonb not null default '{}'::jsonb,

  provider text,
  provider_job_id text,

  output_asset_id uuid references project_assets(id) on delete set null,

  error jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_generation_jobs_project_created on generation_jobs (project_id, created_at desc);
create index idx_generation_jobs_status on generation_jobs (status);

create table generation_job_events (
  id bigserial primary key,
  generation_job_id uuid not null references generation_jobs(id) on delete cascade,
  stage generation_stage,
  status generation_status,
  message text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_generation_events_job_created on generation_job_events (generation_job_id, created_at);

-- ===== External video provider task tracking (BytePlus, etc.) =====
create table external_video_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  generation_job_id uuid references generation_jobs(id) on delete set null,

  provider text not null default 'byteplus',
  external_task_id text not null,
  status generation_status,

  request_payload jsonb,
  response_payload jsonb,

  video_url text,
  last_frame_url text,
  url_expires_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (provider, external_task_id)
);

create index idx_external_video_tasks_project on external_video_tasks (project_id, created_at desc);
create index idx_external_video_tasks_status on external_video_tasks (status);

-- ===== Audio -> subtitle artifacts (OpenAI SRT API) =====
create table audio_transcriptions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  source_asset_id uuid references project_assets(id) on delete set null,
  output_asset_id uuid references project_assets(id) on delete set null,

  provider text not null default 'openai',
  model text not null,
  language text,

  srt_text text,
  raw_response text,

  created_at timestamptz not null default now()
);

create index idx_audio_transcriptions_project on audio_transcriptions (project_id, created_at desc);

-- ===== Trigger helper for updated_at =====
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_projects_updated_at
before update on projects
for each row
execute function set_updated_at();

create trigger trg_step_fields_updated_at
before update on project_step_fields
for each row
execute function set_updated_at();

create trigger trg_step_documents_updated_at
before update on project_step_documents
for each row
execute function set_updated_at();

create trigger trg_generation_jobs_updated_at
before update on generation_jobs
for each row
execute function set_updated_at();

create trigger trg_external_video_tasks_updated_at
before update on external_video_tasks
for each row
execute function set_updated_at();
