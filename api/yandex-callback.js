/**
 * ГУРУ — api/yandex-callback.js
 * OAuth callback: принимает code → обменивает на access_token → сохраняет в Supabase
 *
 * URL: GET /api/yandex-callback?code=XXX&state=PROJECT_ID
 * Редирект после авторизации на oauth.yandex.ru
 */
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const { code, state: projectId, error } = req.query || {};

  // ── Яндекс вернул ошибку ──────────────────────────────────────────────────
  if (error) {
    return res.redirect(
      302,
      `/?yandex_error=${encodeURIComponent(error)}&project_id=${encodeURIComponent(projectId || '')}`
    );
  }

  if (!code || !projectId) {
    return res.status(400).json({ ok: false, error: 'missing_code_or_state' });
  }

  // ── Переменные окружения ──────────────────────────────────────────────────
  const clientId     = process.env.YANDEX_CLIENT_ID;
  const clientSecret = process.env.YANDEX_CLIENT_SECRET;
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ ok: false, error: 'missing_yandex_env' });
  }
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ ok: false, error: 'missing_supabase_env' });
  }

  // ── 1. Обмен code → tokens ────────────────────────────────────────────────
  let tokenData;
  try {
    const tokenRes = await fetch('https://oauth.yandex.ru/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        client_id:     clientId,
        client_secret: clientSecret,
      }).toString(),
    });
    tokenData = await tokenRes.json();
  } catch (e) {
    return res.redirect(302, `/?yandex_error=token_fetch_failed&project_id=${encodeURIComponent(projectId)}`);
  }

  if (tokenData.error) {
    return res.redirect(
      302,
      `/?yandex_error=${encodeURIComponent(tokenData.error)}&project_id=${encodeURIComponent(projectId)}`
    );
  }

  const { access_token, refresh_token, expires_in, token_type } = tokenData;

  // ── 2. Получить login пользователя ────────────────────────────────────────
  let yandexLogin = 'unknown';
  try {
    const infoRes = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${access_token}` },
    });
    const info = await infoRes.json();
    yandexLogin = info.login || info.default_email || 'unknown';
  } catch (_) { /* не критично */ }

  // ── 3. Сохранить токен в Supabase ─────────────────────────────────────────
  // Таблица: guru_yandex_tokens (project_id, login, access_token, refresh_token, expires_at)
  const expiresAt = new Date(Date.now() + (expires_in || 31536000) * 1000).toISOString();

  try {
    await fetch(`${supabaseUrl}/rest/v1/guru_yandex_tokens`, {
      method: 'POST',
      headers: {
        apikey:          supabaseKey,
        Authorization:   `Bearer ${supabaseKey}`,
        'Content-Type':  'application/json',
        Prefer:          'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        project_id:    projectId,
        yandex_login:  yandexLogin,
        access_token,
        refresh_token:  refresh_token || null,
        expires_at:    expiresAt,
        updated_at:    new Date().toISOString(),
      }),
    });
  } catch (e) {
    // Таблица ещё не создана — редиректим с предупреждением
    return res.redirect(
      302,
      `/?yandex_error=supabase_save_failed&project_id=${encodeURIComponent(projectId)}`
    );
  }

  // ── 4. Успешный редирект обратно в ГУРУ ──────────────────────────────────
  res.redirect(302, `/?yandex_connected=1&project_id=${encodeURIComponent(projectId)}&login=${encodeURIComponent(yandexLogin)}`);
};
