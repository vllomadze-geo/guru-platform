-- GURU v1.2.0 workspace cloud-save table
-- Run this in Supabase SQL Editor if cloud save shows table/RLS error.

create table if not exists public.guru_workspaces (
  project_id text primary key,
  project_name text,
  workspace_data jsonb not null default '{}'::jsonb,
  schema_version text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.guru_workspaces enable row level security;

-- Temporary MVP policies for anon/publishable key testing.
-- For production, replace with authenticated user/project ownership policies.
drop policy if exists "guru_workspaces_select_mvp" on public.guru_workspaces;
drop policy if exists "guru_workspaces_insert_mvp" on public.guru_workspaces;
drop policy if exists "guru_workspaces_update_mvp" on public.guru_workspaces;
drop policy if exists "guru_workspaces_delete_mvp" on public.guru_workspaces;

create policy "guru_workspaces_select_mvp" on public.guru_workspaces for select using (true);
create policy "guru_workspaces_insert_mvp" on public.guru_workspaces for insert with check (true);
create policy "guru_workspaces_update_mvp" on public.guru_workspaces for update using (true) with check (true);
create policy "guru_workspaces_delete_mvp" on public.guru_workspaces for delete using (true);
