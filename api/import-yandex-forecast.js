const XLSX = require('xlsx');

const MAX_FILE_BYTES = 8 * 1024 * 1024;

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function numericValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value);
  const normalized = cleanText(value)
    .replace(/\u00a0/g, '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^0-9.-]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function headerKey(value) {
  return cleanText(value).toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
}

function findColumn(headers, predicates) {
  return headers.findIndex((header) => predicates.some((predicate) => predicate(header)));
}

function parsePhraseSheet(workbook) {
  const sheetName = workbook.SheetNames.find((name) => headerKey(name) === 'фразы');
  if (!sheetName) throw new Error('В файле нет листа «Фразы».');

  const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: true,
  });
  let headerRowIndex = -1;
  let columns = null;

  matrix.slice(0, 80).some((row, rowIndex) => {
    const headers = row.map(headerKey);
    const phrase = findColumn(headers, [
      (value) => value.includes('предложенные фразы'),
      (value) => value.includes('ключевая фраза'),
      (value) => value === 'фраза',
    ]);
    const impressions = findColumn(headers, [
      (value) => value.includes('количество показов'),
      (value) => value === 'показы',
      (value) => value.includes('показы/мес'),
    ]);
    const clicks = findColumn(headers, [
      (value) => value.includes('количество переходов'),
      (value) => value.includes('прогноз кликов'),
      (value) => value === 'клики',
    ]);
    const budget = findColumn(headers, [
      (value) => value.includes('примерный бюджет'),
      (value) => value.includes('прогноз бюджета'),
      (value) => value === 'бюджет',
    ]);
    if (phrase < 0 || impressions < 0 || clicks < 0 || budget < 0) return false;
    headerRowIndex = rowIndex;
    columns = { phrase, impressions, clicks, budget };
    return true;
  });

  if (headerRowIndex < 0 || !columns) {
    throw new Error('На листе «Фразы» не найдены колонки фраз, показов, кликов и бюджета.');
  }

  const unique = new Map();
  let dataStarted = false;
  for (const row of matrix.slice(headerRowIndex + 1)) {
    const phrase = cleanText(row[columns.phrase]);
    if (!phrase) {
      if (dataStarted) break;
      continue;
    }
    if (headerKey(phrase).startsWith('итого')) break;
    dataStarted = true;
    const key = phrase.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е');
    const parsed = {
      phrase,
      impressions: Math.round(numericValue(row[columns.impressions])),
      clicks: Math.round(numericValue(row[columns.clicks])),
      budget: Math.round(numericValue(row[columns.budget]) * 100) / 100,
    };
    const previous = unique.get(key);
    if (!previous) unique.set(key, parsed);
    else {
      previous.impressions += parsed.impressions;
      previous.clicks += parsed.clicks;
      previous.budget = Math.round((previous.budget + parsed.budget) * 100) / 100;
    }
  }

  const rows = [...unique.values()];
  if (!rows.length) throw new Error('На листе «Фразы» нет строк с прогнозом.');
  return { sheetName, rows };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method_not_allowed' });

  try {
    const fileName = cleanText(req.body?.file_name);
    const base64 = cleanText(req.body?.file_base64);
    if (!/\.xlsx?$/i.test(fileName)) {
      return res.status(400).json({ ok: false, error: 'invalid_extension', detail: 'Выберите файл .xls или .xlsx.' });
    }
    if (!base64) return res.status(400).json({ ok: false, error: 'empty_file', detail: 'Файл пуст.' });
    const buffer = Buffer.from(base64, 'base64');
    if (!buffer.length) return res.status(400).json({ ok: false, error: 'empty_file', detail: 'Файл пуст.' });
    if (buffer.length > MAX_FILE_BYTES) {
      return res.status(413).json({ ok: false, error: 'file_too_large', detail: 'Размер файла не должен превышать 8 МБ.' });
    }

    const workbook = XLSX.read(buffer, { type: 'buffer', cellFormula: false, cellHTML: false });
    const parsed = parsePhraseSheet(workbook);
    return res.status(200).json({
      ok: true,
      file_name: fileName,
      sheet_name: parsed.sheetName,
      rows: parsed.rows,
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: 'forecast_parse_error',
      detail: error?.message || 'Не удалось прочитать прогноз.',
    });
  }
};
