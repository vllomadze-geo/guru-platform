/**
 * ГУРУ — api/yandex-metrika.js
 * Получает данные из Яндекс Метрики для проекта.
 *
 * GET /api/yandex-metrika?project_id=XXX&counter_id=XXXXXXXX&date_from=2025-01-01&date_to=2025-01-31
 *
 * Возвращает:
 *   { ok: true, data: { visits, users, pageviews, bounce_rate, avg_duration, goal_reaches, conversion_rate } }
 *
 * Данные идут в: Аналитика сайта (Gate 2/Gate 4)
 */
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(200).json({ ok: false, error: 'method_not_allowed' });

  const { project_id, counter_id, date_from, date_to } = req.query || {};
  if (!project_id) return res.status(200).json({ ok: false, error: 'missing_project_id' });

  // ── Переменные окружения ──────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ ok: false, error: 'missing_supabase_env' });
  }

  // ── 1. Получить access_token и counter_id из Supabase ────────────────────
  let accessToken, metrikaCounterId;
  try {
    const tokenRes = await fetch(
      `${supabaseUrl}/rest/v1/guru_yandex_tokens?project_id=eq.${encodeURIComponent(project_id)}&select=access_token,expires_at,metrika_counter_id&limit=1`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const rows = await tokenRes.json();
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(200).json({ ok: false, error: 'not_connected', hint: 'Подключите Яндекс аккаунт в настройках проекта' });
    }
    const expiresAt = new Date(rows[0].expires_at);
    if (expiresAt < new Date()) {
      return res.status(200).json({ ok: false, error: 'token_expired', hint: 'Токен устарел, переподключите аккаунт' });
    }
    accessToken      = rows[0].access_token;
    metrikaCounterId = counter_id || rows[0].metrika_counter_id;
  } catch (e) {
    return res.status(200).json({ ok: false, error: 'supabase_fetch_failed' });
  }

  // ── 1b. Если counter_id не передан — автоматически найти счётчики ─────────
  if (!metrikaCounterId) {
    try {
      const countersRes = await fetch(
        'https://api-metrika.yandex.net/management/v1/counters?per_page=10&sort=Site',
        { headers: { Authorization: `OAuth ${accessToken}` } }
      );
      const countersData = await countersRes.json();
      const counters = countersData.counters || [];
      if (counters.length === 0) {
        return res.status(200).json({ ok: false, error: 'no_counters', hint: 'Нет счётчиков Метрики в этом аккаунте' });
      }
      if (counters.length === 1) {
        metrikaCounterId = counters[0].id;
      } else {
        // Вернём список для выбора
        return res.status(200).json({
          ok:       false,
          error:    'select_counter',
          counters: counters.map(c => ({ id: c.id, name: c.name, site: c.site })),
          hint:     'Несколько счётчиков — укажите counter_id в запросе',
        });
      }
    } catch (e) {
      return res.status(200).json({ ok: false, error: 'counters_fetch_failed', detail: e.message });
    }
  }

  // ── 2. Период ─────────────────────────────────────────────────────────────
  const now = new Date();
  const toDate   = date_to   || now.toISOString().slice(0, 10);
  const fromDate = date_from || new Date(now - 30 * 86400000).toISOString().slice(0, 10);

  // ── 3. Основные метрики через Reporting API v1 ────────────────────────────
  const metrics = [
    'ym:s:visits',
    'ym:s:users',
    'ym:s:pageviews',
    'ym:s:bounceRate',
    'ym:s:avgVisitDurationSeconds',
    'ym:s:goalReachesAny',
    'ym:s:conversionRate',
  ].join(',');

  let metrikaData;
  try {
    const metrikaRes = await fetch(
      `https://api-metrika.yandex.net/stat/v1/data?` +
      `ids=${encodeURIComponent(metrikaCounterId)}` +
      `&metrics=${encodeURIComponent(metrics)}` +
      `&date1=${fromDate}` +
      `&date2=${toDate}` +
      `&accuracy=full`,
      {
        headers: {
          Authorization: `OAuth ${accessToken}`,
          Accept:        'application/json',
        },
      }
    );

    if (!metrikaRes.ok) {
      const errText = await metrikaRes.text();
      return res.status(200).json({ ok: false, error: 'metrika_api_error', detail: errText.slice(0, 300) });
    }

    metrikaData = await metrikaRes.json();
  } catch (e) {
    return res.status(200).json({ ok: false, error: 'metrika_fetch_failed', detail: e.message });
  }

  // ── 4. Парсим ответ ───────────────────────────────────────────────────────
  const totals = (metrikaData.totals || [])[0] || [];
  const metricNames = (metrikaData.query?.metrics || []).map(m => m.replace('ym:s:', ''));

  const getValue = (name) => {
    const i = metricNames.findIndex(m => m.includes(name));
    return i >= 0 ? (totals[i] || 0) : 0;
  };

  const result = {
    counter_id:          String(metrikaCounterId),
    period:              { from: fromDate, to: toDate },
    visits:              Math.round(getValue('visits')),
    users:               Math.round(getValue('users')),
    pageviews:           Math.round(getValue('pageviews')),
    bounce_rate:         Math.round(getValue('bounceRate') * 100) / 100,       // %
    avg_duration_sec:    Math.round(getValue('avgVisitDuration')),              // сек
    avg_duration_min:    Math.round(getValue('avgVisitDuration') / 60 * 10) / 10, // мин
    goal_reaches:        Math.round(getValue('goalReaches')),
    conversion_rate:     Math.round(getValue('conversionRate') * 100) / 100,   // %
  };

  // ── 5. Источники трафика ──────────────────────────────────────────────────
  let sources = [];
  try {
    const srcRes = await fetch(
      `https://api-metrika.yandex.net/stat/v1/data?` +
      `ids=${encodeURIComponent(metrikaCounterId)}` +
      `&dimensions=ym:s:trafficSourceName` +
      `&metrics=ym:s:visits` +
      `&date1=${fromDate}` +
      `&date2=${toDate}` +
      `&sort=-ym:s:visits` +
      `&limit=10`,
      { headers: { Authorization: `OAuth ${accessToken}` } }
    );
    const srcData = await srcRes.json();
    sources = (srcData.data || []).map(row => ({
      source: row.dimensions?.[0]?.name || 'Неизвестно',
      visits: row.metrics?.[0] || 0,
    }));
  } catch (_) { /* не критично */ }

  result.sources = sources;

  // ── 6. Сохраняем counter_id в токен-запись ────────────────────────────────
  try {
    await fetch(`${supabaseUrl}/rest/v1/guru_yandex_tokens?project_id=eq.${encodeURIComponent(project_id)}`, {
      method:  'PATCH',
      headers: {
        apikey:         supabaseKey,
        Authorization:  `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metrika_counter_id: String(metrikaCounterId), updated_at: new Date().toISOString() }),
    });
  } catch (_) { /* не критично */ }

  // ── 7. Кэшируем ──────────────────────────────────────────────────────────
  try {
    await fetch(`${supabaseUrl}/rest/v1/guru_yandex_metrika_cache`, {
      method: 'POST',
      headers: {
        apikey:         supabaseKey,
        Authorization:  `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer:         'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        project_id,
        counter_id:  String(metrikaCounterId),
        date_from:   fromDate,
        date_to:     toDate,
        data:        result,
        fetched_at:  new Date().toISOString(),
      }),
    });
  } catch (_) { /* не критично */ }

  return res.status(200).json({ ok: true, data: result });
};
