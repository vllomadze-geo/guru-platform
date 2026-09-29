module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return res.status(200).json({ ok: false, error: 'missing_env', detail: 'NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set' });
  }

  const authHeaders = {
    apikey: key,
    Authorization: `Bearer ${key}`,
  };

  try {
    if (req.method === 'POST') {
      const { project_id, state, base_updated_at = '', force = false } = req.body || {};
      if (!project_id || !state) {
        return res.status(200).json({ ok: false, error: 'missing_fields' });
      }

      const endpoint = `${url}/rest/v1/guru_workspaces?on_conflict=project_id`;
      const updatedAt = new Date().toISOString();
      const commonHeaders = {
        ...authHeaders,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      };
      const projectName = state?.project?.name || (project_id === '__guru_project_registry__' ? 'GURU Project Registry' : '');
      const schemaVersion = state?.schemaVersion || state?.schema_version || '';

      // Lightweight conflict check. The migration exposes only timestamps, so a
      // normal save does not download the full workspace before writing it.
      const metaResponse = await fetch(`${url}/rest/v1/rpc/guru_workspace_sync_meta`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ p_project_id: project_id })
      });
      if (!metaResponse.ok) {
        const detail = await metaResponse.text();
        return res.status(200).json({
          ok: false,
          error: 'supabase_migration_required',
          status: metaResponse.status,
          detail
        });
      }

      const metaRows = await metaResponse.json();
      const currentMeta = Array.isArray(metaRows) ? metaRows[0] : metaRows;
      const currentUpdatedAt = currentMeta?.updated_at || '';
      const currentStateUpdatedAt = String(currentMeta?.state_updated_at || currentUpdatedAt || '');
      const incomingStateUpdatedAt = String(state?.updatedAt || state?.updated_at || '');

      if (currentMeta && !force) {
        const baseChanged = base_updated_at && currentUpdatedAt && base_updated_at !== currentUpdatedAt;
        const incomingIsOlder = !base_updated_at && currentStateUpdatedAt && (!incomingStateUpdatedAt || incomingStateUpdatedAt < currentStateUpdatedAt);
        if (baseChanged || incomingIsOlder) {
          // Full workspace is fetched only for a real conflict so the caller can
          // preserve the cloud copy before retrying or resolving it.
          const conflictEndpoint = `${url}/rest/v1/guru_workspaces?project_id=eq.${encodeURIComponent(project_id)}&select=*&limit=1`;
          const conflictResponse = await fetch(conflictEndpoint, {
            headers: { ...authHeaders, Accept: 'application/json' }
          });
          if (!conflictResponse.ok) {
            const detail = await conflictResponse.text();
            return res.status(200).json({ ok: false, error: 'supabase_conflict_read_error', status: conflictResponse.status, detail });
          }
          const conflictRows = await conflictResponse.json();
          const currentRow = Array.isArray(conflictRows) && conflictRows.length ? conflictRows[0] : null;
          const currentState = currentRow?.workspace_data || currentRow?.state || null;
          return res.status(200).json({
            ok: false,
            error: 'conflict',
            cloud_updated_at: currentUpdatedAt,
            cloud_state_updated_at: currentStateUpdatedAt,
            state: currentState,
          });
        }
      }

      // Previous workspace version is archived transactionally by the database
      // trigger from supabase_workspace_egress_migration.sql.
      const writeAttempts = [
        {
          project_id,
          project_name: projectName,
          workspace_data: state,
          schema_version: schemaVersion,
          updated_at: updatedAt
        },
        { project_id, workspace_data: state, updated_at: updatedAt },
        { project_id, state, updated_at: updatedAt }
      ];

      let response = null;
      for (const row of writeAttempts) {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: commonHeaders,
          body: JSON.stringify(row)
        });
        if (response.ok) break;
      }

      if (!response.ok) {
        const errText = await response.text();
        return res.status(200).json({ ok: false, error: 'supabase_write_error', status: response.status, detail: errText });
      }
      return res.status(200).json({ ok: true, updated_at: updatedAt });
    }

    if (req.method === 'GET') {
      const { project_id } = req.query || {};
      if (!project_id) return res.status(200).json({ ok: false, error: 'missing_project_id' });
      const endpoint = `${url}/rest/v1/guru_workspaces?project_id=eq.${encodeURIComponent(project_id)}&select=*&limit=1`;
      const response = await fetch(endpoint, {
        headers: { ...authHeaders, Accept: 'application/json' }
      });
      if (!response.ok) {
        const errText = await response.text();
        return res.status(200).json({ ok: false, error: 'supabase_read_error', status: response.status, detail: errText });
      }
      const data = await response.json();
      if (Array.isArray(data) && data.length) {
        const row = data[0];
        return res.status(200).json({ ok: true, state: row.workspace_data || row.state, updated_at: row.updated_at });
      }
      return res.status(200).json({ ok: false, error: 'not_found' });
    }

    if (req.method === 'DELETE') {
      const project_id = req.query?.project_id || req.body?.project_id;
      if (!project_id) return res.status(200).json({ ok: false, error: 'missing_project_id' });
      const endpoint = `${url}/rest/v1/guru_workspaces?project_id=eq.${encodeURIComponent(project_id)}`;
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          ...authHeaders,
          Prefer: 'return=minimal'
        }
      });
      if (!response.ok) {
        const errText = await response.text();
        return res.status(200).json({ ok: false, error: 'supabase_delete_error', status: response.status, detail: errText });
      }
      return res.status(200).json({ ok: true });
    }
  } catch (e) {
    return res.status(200).json({ ok: false, error: 'exception', detail: e.message });
  }

  return res.status(200).json({ ok: false, error: 'method_not_allowed' });
};
