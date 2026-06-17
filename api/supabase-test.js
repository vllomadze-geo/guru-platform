module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!rawUrl || !key) {
    return res.status(200).json({ ok: false, status: 'missing_env' });
  }

  const endpoint = `${rawUrl}/rest/v1/guru_projects?select=id,name&limit=1`;
  
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
    try { payload = JSON.parse(text); } catch (_) { payload = text; }
    
    return res.status(200).json({
      ok: response.ok,
      status: response.ok ? 'connected' : 'supabase_error',
      httpStatus: response.status,
      data: payload
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      status: 'network_error',
      message: error.message,
      errorType: error.constructor.name
    });
  }
};
