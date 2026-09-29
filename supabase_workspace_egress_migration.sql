-- GURU workspace sync egress optimization.
-- Apply this migration before deploying the matching /api/workspace-sync code.

create or replace function public.guru_workspace_sync_meta(p_project_id text)
returns table (
  project_id text,
  updated_at timestamptz,
  state_updated_at text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    gw.project_id,
    gw.updated_at,
    coalesce(
      gw.workspace_data ->> 'updatedAt',
      gw.workspace_data ->> 'updated_at',
      gw.updated_at::text
    ) as state_updated_at
  from public.guru_workspaces as gw
  where gw.project_id = p_project_id
  limit 1;
$$;

revoke all on function public.guru_workspace_sync_meta(text) from public;
revoke all on function public.guru_workspace_sync_meta(text) from anon;
revoke all on function public.guru_workspace_sync_meta(text) from authenticated;
grant execute on function public.guru_workspace_sync_meta(text) to service_role;

create or replace function public.guru_archive_workspace_before_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.workspace_data is distinct from new.workspace_data then
    insert into public.guru_workspace_versions (
      project_id,
      workspace_data,
      source_updated_at,
      saved_at
    ) values (
      old.project_id,
      old.workspace_data,
      old.updated_at,
      coalesce(new.updated_at, now())
    );
  end if;
  return new;
end;
$$;

revoke all on function public.guru_archive_workspace_before_update() from public;
revoke all on function public.guru_archive_workspace_before_update() from anon;
revoke all on function public.guru_archive_workspace_before_update() from authenticated;

drop trigger if exists guru_archive_workspace_before_update on public.guru_workspaces;
create trigger guru_archive_workspace_before_update
before update of workspace_data on public.guru_workspaces
for each row
execute function public.guru_archive_workspace_before_update();
