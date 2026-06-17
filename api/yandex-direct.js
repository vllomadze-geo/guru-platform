/**
 * ГУРУ — api/yandex-direct.js
 * Получает данные из Яндекс Директ для проекта.
 *
 * GET /api/yandex-direct?project_id=XXX&date_from=2025-01-01&date_to=2025-01-31
 *
 * Возвращает:
 *   { ok: true, data: { spend, clicks, impressions, ctr, cpc, conversions, cpl, drr } }
 *
 * Данные идут в: Юнит-экономика (Gate 0/Gate 4)
 */
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(200).json({ ok: false, error: 'method_not_allowed' });

  const { project_id, date_from, date_to } = req.query || {};
  if (!project_id) return res.status(200).json({ ok: false, error: 'missing_project_id' });

  // ── Переменные окружения ──────────────────────────────────────────────────
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(200).json({ ok: false, error: 'missing_supabase_env' });
  }

  // ── 1. Получить access_token из Supabase ──────────────────────────────────
  let accessToken;
  try {
    const tokenRes = await fetch(
      `${supabaseUrl}/rest/v1/guru_yandex_tokens?project_id=eq.${encodeURIComponent(project_id)}&select=access_token,expires_at&limit=1`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    );
    const rows = await tokenRes.json();
    if (!Array.isArray(rows) || !rows.length) {
      return res.status(200).json({ ok: false, error: 'not_connected', hint: 'Подключите Яндекс аккаунт в настройках проекта' });
    }
    // Проверить срок действия
    const expiresAt = new Date(rows[0].expires_at);
    if (expiresAt < new Date()) {
      return res.status(200).json({ ok: false, error: 'token_expired', hint: 'Токен устарел, переподключите аккаунт' });
    }
    accessToken = rows[0].access_token;
  } catch (e) {
    return res.status(200).json({ ok: false, error: 'supabase_fetch_failed' });
  }

  // ── 2. Формируем период ───────────────────────────────────────────────────
  const now = new Date();
  const toDate   = date_to   || now.toISOString().slice(0, 10);
  const fromDate = date_from || new Date(now.setDate(now.getDate() - 30)).toISOString().slice(0, 10);

  // ── 3. Запрос к Direct API v5 (Reports) ──────────────────────────────────
  const reportBody = {
    params: {
      SelectionCriteria: {
        DateFrom: fromDate,
        DateTo:   toDate,
      },
      FieldNames: [
        'Date', 'CampaignName',
        'Impressions', 'Clicks', 'Ctr',
        'AvgCpc', 'Cost',
        'Conversions',
      ],
      ReportName:  `GURU_Report_${project_id}_${Date.now()}`,
      ReportType:  'CAMPAIGN_PERFORMANCE_REPORT',
      DateRangeType: 'CUSTOM_DATE',
      Format:      'TSV',
      IncludeVAT:  'NO',
      IncludeDiscount: 'NO',
    },
  };

  let directRaw;
  try {
    const directRes = await fetch('https://api.direct.yandex.com/json/v5/reports', {
      method: 'POST',
      headers: {
        Authorization:          `Bearer ${accessToken}`,
        'Client-Login':         '', // заполняется если агентский аккаунт
        Accept:                 'application/json',
        'Content-Type':         'application/json',
        'processingMode':       'auto',
        'returnMoneyInMicros':  'false',
        'skipReportHeader':     'true',
        'skipColumnHeader':     'false',
        'skipReportSummary':    'true',
      },
      body: JSON.stringify(reportBody),
    });

    // Direct API: 200 = данные готовы, 201/202 = в очереди, 400 = ошибка
    const status = directRes.status;
    if (status === 400 || status === 500 || status === 503) {
      const errText = await directRes.text();
      return res.status(200).json({ ok: false, error: 'direct_api_error', detail: errText.slice(0, 300) });
    }
    if (status === 201 || status === 202) {
      // Отложенный отчёт — сообщаем фронту подождать
      return res.status(200).json({ ok: false, error: 'report_queued', hint: 'Отчёт в очереди, повторите запрос через 10 сек', retry_after: 10 });
    }

    directRaw = await directRes.text();
  } catch (e) {
    return res.status(200).json({ ok: false, error: 'direct_fetch_failed', detail: e.message });
  }

  // ── 4. Парсим TSV ─────────────────────────────────────────────────────────
  const lines = directRaw.split('\n').filter(l => l.trim());
  if (lines.length < 2) {
    return res.status(200).json({ ok: true, data: null, hint: 'Нет данных за выбранный период' });
  }

  const headers = lines[0].split('\t');
  const idx = (name) => headers.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));

  const iImpressions = idx('Impressions');
  const iClicks      = idx('Clicks');
  const iCtr         = idx('Ctr');
  const iCpc         = idx('AvgCpc');
  const iCost        = idx('Cost');
  const iConversions = idx('Conversions');

  let totalImpressions = 0, totalClicks = 0, totalCost = 0, totalConversions = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    totalImpressions  += parseFloat(cols[iImpressions] || 0)  || 0;
    totalClicks       += parseFloat(cols[iClicks]      || 0)  || 0;
    totalCost         += parseFloat(cols[iCost]        || 0)  || 0;
    totalConversions  += parseFloat(cols[iConversions] || 0)  || 0;
  }

  const ctr  = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;
  const cpc  = totalClicks      > 0 ? (totalCost / totalClicks)              : 0;
  const cpl  = totalConversions > 0 ? (totalCost / totalConversions)         : 0;

  const result = {
    period:          { from: fromDate, to: toDate },
    spend:           Math.round(totalCost * 100) / 100,
    clicks:          Math.round(totalClicks),
    impressions:     Math.round(totalImpressions),
    ctr:             Math.round(ctr * 100) / 100,        // %
    cpc:             Math.round(cpc * 100) / 100,        // ₽
    conversions:     Math.round(totalConversions),
    cpl:             Math.round(cpl * 100) / 100,        // ₽
    // drr считается на фронте: spend / revenue * 100
  };

  // ── 5. Кэшируем в Supabase guru_yandex_direct_cache ──────────────────────
  try {
    await fetch(`${supabaseUrl}/rest/v1/guru_yandex_direct_cache`, {
      method: 'POST',
      headers: {
        apikey:         supabaseKey,
        Authorization:  `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer:         'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        project_id,
        date_from:  fromDate,
        date_to:    toDate,
        data:       result,
        fetched_at: new Date().toISOString(),
      }),
    });
  } catch (_) { /* кэш не критичен */ }

  return res.status(200).json({ ok: true, data: result });
};
