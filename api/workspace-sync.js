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

      // The RPC returns only timestamps and refuses a write when the database
      // version-archive trigger has not been installed yet. The previous
      // workspace JSON is never downloaded on the ordinary save path.
      const currentEndpoint = `${url}/rest/v1/rpc/guru_workspace_write_metadata`;
      const readHeaders = { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' };
      const currentResponse = await fetch(currentEndpoint, {
        method: 'POST',
        headers: { ...readHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_project_id: project_id }),
      });
      if (!currentResponse.ok) {
        const detail = await currentResponse.text();
        const migrationMissing = detail.includes('guru_workspace_write_metadata') ||
          detail.includes('guru_workspaces_archive_version trigger is required');
        return res.status(200).json({ ok: false, error: 'supabase_read_before_write_error',
          status: migrationMissing ? 503 : currentResponse.status, detail });
      }
      const currentRows = await currentResponse.json();
      const currentRow = Array.isArray(currentRows) && currentRows.length ? currentRows[0] : null;
      const currentUpdatedAt = currentRow?.updated_at || '';
      const incomingStateUpdatedAt = String(state?.updatedAt || state?.updated_at || '');
      const currentStateUpdatedAt = String(currentRow?.state_updated_at || currentRow?.legacy_state_updated_at || currentUpdatedAt || '');

      if (currentRow && !force) {
        // Supabase serializes timestamptz as `+00:00`, while the value returned
        // by this endpoint immediately after a write is an ISO string ending in
        // `Z`. They describe the same instant, so comparing the raw strings
        // creates a false conflict on the very next autosave.
        const sameTimestamp = (left, right) => {
          if (!left || !right) return left === right;
          const leftTime = Date.parse(left);
          const rightTime = Date.parse(right);
          return Number.isFinite(leftTime) && Number.isFinite(rightTime)
            ? leftTime === rightTime
            : String(left) === String(right);
        };
        const baseChanged = base_updated_at && currentUpdatedAt && !sameTimestamp(base_updated_at, currentUpdatedAt);
        const incomingIsOlder = !base_updated_at && currentStateUpdatedAt && (!incomingStateUpdatedAt || incomingStateUpdatedAt < currentStateUpdatedAt);
        if (baseChanged || incomingIsOlder) {
          // Only an actual conflict needs the full cloud workspace for the
          // client's existing backup and conflict-resolution flow.
          const conflictEndpoint = `${url}/rest/v1/guru_workspaces?project_id=eq.${encodeURIComponent(project_id)}&select=updated_at,workspace_data&limit=1`;
          const conflictResponse = await fetch(conflictEndpoint, { headers: readHeaders });
          if (!conflictResponse.ok) {
            const detail = await conflictResponse.text();
            return res.status(200).json({ ok: false, error: 'supabase_read_before_write_error', status: conflictResponse.status, detail });
          }
          const conflictRows = await conflictResponse.json();
          const conflictRow = Array.isArray(conflictRows) && conflictRows.length ? conflictRows[0] : null;
          if (!conflictRow) {
            return res.status(200).json({ ok: false, error: 'conflict', cloud_updated_at: '', cloud_state_updated_at: '' });
          }
          const conflictState = conflictRow.workspace_data || null;
          return res.status(200).json({
            ok: false,
            error: 'conflict',
            cloud_updated_at: conflictRow.updated_at || currentUpdatedAt,
            cloud_state_updated_at: String(conflictState?.updatedAt || conflictState?.updated_at || conflictRow.updated_at || ''),
            state: conflictState,
          });
        }
      }
      // PostgreSQL's guru_workspaces_archive_version trigger archives OLD
      // workspace_data in the same transaction as the update, without Egress.

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
      let writeError = '';
      for (const row of writeAttempts) {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: commonHeaders,
          body: JSON.stringify(row)
        });
        if (response.ok) break;
        writeError = await response.text();
        let errorCode = '';
        try { errorCode = JSON.parse(writeError).code || ''; } catch (_) {}
        // A failed archive trigger must stop the write. Try an older schema
        // shape only when PostgREST explicitly reports a missing column.
        if (errorCode !== 'PGRST204' && errorCode !== '42703') break;
      }

      if (!response.ok) {
        return res.status(200).json({ ok: false, error: 'supabase_write_error', status: response.status, detail: writeError });
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
