-- Enable vector extension for semantic search
create extension if not exists vector;

-- Executive searches (linked to Coda databases)
create table if not exists searches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  coda_doc_id text not null,
  coda_table_id text not null,
  status text default 'active' check (status in ('active', 'closed', 'on_hold')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Golden record contacts
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  company text,
  title text,
  linkedin_url text,
  location text,
  sources text[] default '{}',  -- 'coda', 'onenote', 'manual'
  coda_row_ids text[] default '{}',
  onenote_page_ids text[] default '{}',
  search_ids uuid[] default '{}',
  embedding vector(1536),  -- for semantic search
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Notes attached to contacts
create table if not exists contact_notes (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid references contacts(id) on delete cascade,
  content text not null,
  source text not null check (source in ('coda', 'onenote', 'manual')),
  source_url text,
  source_id text,  -- original ID in source system
  author text,
  note_date timestamptz,
  created_at timestamptz default now()
);

-- Potential duplicates flagged for review
create table if not exists duplicates (
  id uuid primary key default gen_random_uuid(),
  contact_id_1 uuid references contacts(id) on delete cascade,
  contact_id_2 uuid references contacts(id) on delete cascade,
  similarity_score float,
  match_fields text[],  -- e.g. ['email', 'name']
  status text default 'pending' check (status in ('pending', 'merged', 'dismissed')),
  created_at timestamptz default now(),
  unique(contact_id_1, contact_id_2)
);

-- Sync history and logs
create table if not exists sync_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('coda', 'onenote', 'manual')),
  search_id uuid references searches(id) on delete set null,
  status text not null check (status in ('success', 'error', 'partial')),
  contacts_added int default 0,
  contacts_updated int default 0,
  notes_added int default 0,
  duplicates_flagged int default 0,
  error_message text,
  started_at timestamptz default now(),
  finished_at timestamptz
);

-- Index for fast vector similarity search
create index if not exists contacts_embedding_idx on contacts
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Index for duplicate detection
create index if not exists contacts_email_idx on contacts (email) where email is not null;
create index if not exists contacts_name_idx on contacts using gin (to_tsvector('english', full_name));

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contacts_updated_at before update on contacts
  for each row execute function update_updated_at();

create trigger searches_updated_at before update on searches
  for each row execute function update_updated_at();
