module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return res.status(200).json({ ok: false, error: 'missing_env' });
  }

  if (req.method === 'POST') {
    const { project_id, state } = req.body || {};
    if (!project_id || !state) {
      return res.status(200).json({ ok: false, error: 'missing_fields' });
    }
    const endpoint = `${url}/rest/v1/guru_workspaces`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ project_id, state, updated_at: new Date().toISOString() })
    });
    const ok = response.ok;
    return res.status(200).json({ ok });
  }

  if (req.method === 'GET') {
    const { project_id } = req.query || {};
    if (!project_id) return res.status(200).json({ ok: false, error: 'missing_project_id' });
    const endpoint = `${url}/rest/v1/guru_workspaces?project_id=eq.${encodeURIComponent(project_id)}&select=state,updated_at&limit=1`;
    const response = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' }
    });
    const data = await response.json();
    if (Array.isArray(data) && data.length) {
      return res.status(200).json({ ok: true, state: data[0].state, updated_at: data[0].updated_at });
    }
    return res.status(200).json({ ok: false, error: 'not_found' });
  }

  return res.status(200).json({ ok: false, error: 'method_not_allowed' });
};
