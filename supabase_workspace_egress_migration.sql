-- Выполнить в Supabase SQL Editor до деплоя нового api/workspace-sync.js.
-- Без изменения таблиц и RLS; повторный запуск безопасен.
begin;

-- Старая версия копируется в PostgreSQL в той же транзакции, что и UPDATE.
-- На INSERT архивировать нечего; одинаковые workspace_data не дублируем.
create or replace function public.guru_archive_workspace_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  insert into public.guru_workspace_versions
    (project_id, workspace_data, source_updated_at, saved_at)
  values
    (old.project_id, old.workspace_data, old.updated_at, clock_timestamp());
  return new;
end;
$$;

drop trigger if exists guru_workspaces_archive_version on public.guru_workspaces;
create trigger guru_workspaces_archive_version
before update of workspace_data on public.guru_workspaces
for each row
when (old.workspace_data is distinct from new.workspace_data)
execute function public.guru_archive_workspace_version();

-- API читает только метаданные. Если триггер отсутствует или выключен,
-- функция откажет в записи, чтобы история версий не терялась молча.
create or replace function public.guru_workspace_write_metadata(p_project_id text)
returns table(updated_at timestamptz, state_updated_at text, legacy_state_updated_at text)
language plpgsql
stable
set search_path = public
as $$
begin
  if not exists (
    select 1 from pg_catalog.pg_trigger
    where tgrelid = 'public.guru_workspaces'::regclass
      and tgname = 'guru_workspaces_archive_version'
      and tgenabled in ('O', 'A')
  ) then
    raise exception 'guru_workspaces_archive_version trigger is required';
  end if;

  return query
    select workspace.updated_at,
           workspace.workspace_data->>'updatedAt',
           workspace.workspace_data->>'updated_at'
    from public.guru_workspaces as workspace
    where workspace.project_id = p_project_id
    limit 1;
end;
$$;

revoke all on function public.guru_workspace_write_metadata(text) from public, anon, authenticated;
grant execute on function public.guru_workspace_write_metadata(text) to service_role;
notify pgrst, 'reload schema';

commit;
