module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!rawUrl || !key) {
    return res.status(200).json({
      ok: false,
      status: 'missing_env',
      url: rawUrl || 'MISSING',
      key: key ? 'present' : 'MISSING'
    });
  }

  const endpoint = `${rawUrl}/rest/v1/guru_projects?select=id&limit=1`;
  
  return res.status(200).json({
    ok: false,
    status: 'debug',
    endpoint: endpoint,
    urlValue: rawUrl,
    keyPresent: !!key,
    keyPreview: key.substring(0, 20)
  });
};
