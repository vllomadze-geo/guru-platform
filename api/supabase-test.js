module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!rawUrl || !key) {
    return res.status(200).json({
      ok: false,
      status: 'missing_env',
      message: 'Supabase environment variables are missing in Vercel.'
    });
  }

  const supabaseUrl = rawUrl.replace(/\/+$/, '');
  const endpoint = `${supabaseUrl}/rest/v1/guru_projects?select=id,name,slug,website_url&limit=1`;

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: 'application/json'
      }
    });

    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch (_) { payload = text; }

    if (response.status === 401 || response.status === 403) {
      return res.status(200).json({
        ok: true,
        status: 'rls_blocked',
        httpStatus: response.status,
        message: 'Supabase is reachable, but Row Level Security blocks public read access.',
        details: payload
      });
    }

    if (!response.ok) {
      return res.status(200).json({
        ok: false,
        status: 'supabase_error',
        httpStatus: response.status,
        message: 'Supabase returned an error.',
        details: payload
      });
    }

    const rows = Array.isArray(payload) ? payload : [];
    if (!rows.length) {
      return res.status(200).json({
        ok: true,
        status: 'configured_no_rows',
        httpStatus: response.status,
        message: 'Supabase is reachable, but no project rows are visible to this key.'
      });
    }

    return res.status(200).json({
      ok: true,
      status: 'connected',
      httpStatus: response.status,
      project: rows[0],
      rowsVisible: rows.length
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      status: 'network_error',
      message: error && error.message ? error.message : 'Unknown network error'
    });
  }
};
