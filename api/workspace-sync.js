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

  try {
    if (req.method === 'POST') {
      const { project_id, state, base_updated_at = '', force = false } = req.body || {};
      if (!project_id || !state) {
        return res.status(200).json({ ok: false, error: 'missing_fields' });
      }

      const endpoint = `${url}/rest/v1/guru_workspaces?on_conflict=project_id`;
      const updatedAt = new Date().toISOString();
      const commonHeaders = {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal'
      };
      const projectName = state?.project?.name || (project_id === '__guru_project_registry__' ? 'GURU Project Registry' : '');
      const schemaVersion = state?.schemaVersion || state?.schema_version || '';

      const currentEndpoint = `${url}/rest/v1/guru_workspaces?project_id=eq.${encodeURIComponent(project_id)}&select=*&limit=1`;
      const currentResponse = await fetch(currentEndpoint, {
        headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' }
      });
      if (!currentResponse.ok) {
        const detail = await currentResponse.text();
        return res.status(200).json({ ok: false, error: 'supabase_read_before_write_error', status: currentResponse.status, detail });
      }
      const currentRows = await currentResponse.json();
      const currentRow = Array.isArray(currentRows) && currentRows.length ? currentRows[0] : null;
      const currentState = currentRow?.workspace_data || currentRow?.state || null;
      const currentUpdatedAt = currentRow?.updated_at || '';
      const incomingStateUpdatedAt = String(state?.updatedAt || state?.updated_at || '');
      const currentStateUpdatedAt = String(currentState?.updatedAt || currentState?.updated_at || currentUpdatedAt || '');

      if (currentRow && !force) {
        const baseChanged = base_updated_at && currentUpdatedAt && base_updated_at !== currentUpdatedAt;
        const incomingIsOlder = !base_updated_at && currentStateUpdatedAt && (!incomingStateUpdatedAt || incomingStateUpdatedAt < currentStateUpdatedAt);
        if (baseChanged || incomingIsOlder) {
          return res.status(200).json({
            ok: false,
            error: 'conflict',
            cloud_updated_at: currentUpdatedAt,
            cloud_state_updated_at: currentStateUpdatedAt,
            state: currentState,
          });
        }
      }

      if (currentRow && currentState) {
        try {
          await fetch(`${url}/rest/v1/guru_workspace_versions`, {
            method: 'POST',
            headers: {
              apikey: key,
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
              Prefer: 'return=minimal'
            },
            body: JSON.stringify({
              project_id,
              workspace_data: currentState,
              source_updated_at: currentUpdatedAt || null,
              saved_at: updatedAt,
            })
          });
        } catch (_) { /* version history is best effort */ }
      }

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
        headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' }
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
          apikey: key,
          Authorization: `Bearer ${key}`,
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
