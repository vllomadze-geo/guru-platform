/* Page semantics owns the keyword list for each landing page. The legacy
   seoKeywords string remains a formatted projection for existing readers. */
const GURU_PAGE_SEMANTICS_SECTION_V1 = 'page_semantics_v1';

function guruPageSemanticsSplitV1(text, previous = []) {
  const protectedValues = (Array.isArray(previous) ? previous : [])
    .filter((value) => typeof value === 'string' && /[,;\r\n]/u.test(value));
  let source = String(text || '');
  const tokens = [];
  protectedValues.forEach((value) => {
    if (!source.includes(value)) return;
    const token = `\uE000${tokens.length}\uE001`;
    tokens.push(value);
    source = source.replaceAll(value, token);
  });
  return source.split(/[,;\r\n]+/u).map((value) =>
    value.replace(/\uE000(\d+)\uE001/gu, (_match, index) => tokens[Number(index)] || ''));
}

function guruPageSemanticsValuesV1(row) {
  const fields = row?.contextFields || {};
  const saved = Array.isArray(fields.pageSemanticKeywordsV1) ? fields.pageSemanticKeywordsV1 : null;
  // Older SEO edits may have been saved before the semantic editor received
  // the input event. Keep those edits readable without mutating either field.
  const legacyEdit = saved && typeof fields.pageSemanticKeywordsTextV1 === 'string' &&
    fields.pageSemanticKeywordsTextV1 !== String(fields.seoKeywords || '');
  const source = !saved || legacyEdit
    ? guruPageSemanticsSplitV1(fields.seoKeywords, saved || []) : saved;
  return guruPageSemanticsUniqueV1(source);
}

function guruPageSemanticsUniqueV1(values) {
  const seen = new Set();
  return values
    .map((value) => guruV185Text(value))
    .filter((value) => {
      const key = guruV247KeywordNormalize(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function guruPageSeoKeywordsTextV1(row) {
  return guruPageSemanticsValuesV1(row).join(', ');
}

const guruPageSemanticsPreviousSeoSnippetV1 = v22SeoSnippetSection;
v22SeoSnippetSection = function (card, row, pageIndex, open) {
  const html = guruPageSemanticsPreviousSeoSnippetV1.apply(this, arguments);
  const template = document.createElement('template');
  template.innerHTML = html;
  const field = template.content.querySelector('[data-page-context-key="seoKeywords"]');
  if (!field) return html;
  const text = guruPageSeoKeywordsTextV1(row);
  if (field.tagName === 'TEXTAREA') field.textContent = text;
  else field.setAttribute('value', text);
  return template.innerHTML;
};

const guruPageSemanticsPreviousFieldValueV1 = v22GetFieldValue;
v22GetFieldValue = function (row, field) {
  if (field?.kind !== 'context' || field.key !== 'seoKeywords')
    return guruPageSemanticsPreviousFieldValueV1.apply(this, arguments);
  return guruReadinessValue(guruPageSeoKeywordsTextV1(row),
    typeof nowGuideGate1PageTarget === 'function'
      ? nowGuideGate1PageTarget(row, field) : undefined);
};

function guruPageSemanticsSourceV1(card, row) {
  const fields = [];
  const add = (field, value) => {
    const text = guruV185Text(value);
    if (text && text.length < 4000 && !/^https?:\/\//iu.test(text) &&
        !/^data:/iu.test(text)) fields.push({ field, values: [text] });
  };
  ['name', 'h1', 'title', 'description', 'offer', 'finalCta']
    .forEach((key) => add(key, row?.[key]));
  if (row?.categoryId) {
    const category = guruV185ProductById(row.categoryId, state);
    add('category', category?.name);
    add('category.description', guruCategoryDescriptionV1(row.categoryId, state));
  }
  if (row?.catalogItemIdV189)
    add('product', guruV194Product(row.catalogItemIdV189, state)?.name);
  const visit = (value, field, depth = 0) => {
    if (depth > 3 || value == null) return;
    if (typeof value === 'string') { add(field, value); return; }
    if (Array.isArray(value)) {
      value.slice(0, 50).forEach((item) => visit(item, field, depth + 1));
    } else if (typeof value === 'object') {
      Object.entries(value).forEach(([key, item]) => {
        if (/seoKeywords|keyword|semantic|status|image|photo|url|href|source|id|flag|mode|created|updated|proof|result|comment/i.test(key)) return;
        visit(item, `${field}.${key}`, depth + 1);
      });
    }
  };
  visit(row?.contextFields, 'content');
  return { fields, texts: fields.flatMap(({ values }) => values) };
}

const GURU_PAGE_SEMANTIC_METRIC_FIELDS_V1 = [
  ['vol', 'Показы'], ['queryCount', 'Запросы'],
  ['forecastClicks', 'Переходы'], ['clickPrice', 'Цена клика'],
  ['bid', 'Ставка'], ['forecastBudget', 'Бюджет'],
  ['trafficVolume', 'Трафик'],
];

function guruPageSemanticsMetricsV1(row) {
  const saved = row?.contextFields?.pageSemanticMetricsV1;
  return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
}

function guruPageSemanticsRowsV1(values, offset = 0, metrics = {}) {
  return values.map((value, position) => {
    const index = position + offset;
    const detail = GURU_PAGE_SEMANTIC_METRIC_FIELDS_V1
      .map(([field, label]) => guruV185Text(metrics[guruV247KeywordNormalize(value)]?.[field])
        ? `${label}: ${escapeHtml(String(metrics[guruV247KeywordNormalize(value)][field]))}` : '')
      .filter(Boolean).join(' · ');
    return `<div class="guru-page-semantic-row-v1">
    <div class="guru-page-semantic-value-v1"><input class="g1-input" data-page-semantic-input-v1="${index}" data-page-semantic-metric-key-v1="${escapeAttr(guruV247KeywordNormalize(value))}" value="${escapeAttr(value)}" aria-label="Поисковый запрос ${index + 1}" placeholder="Поисковый запрос" />${detail ? `<small class="guru-page-semantic-metrics-v1">${detail}</small>` : ''}</div>
    <button type="button" class="guru-page-semantic-icon-v1" data-page-semantic-remove-v1="${index}" aria-label="Удалить запрос ${escapeAttr(value)}" title="Удалить">×</button>
  </div>`;
  }).join('');
}

function guruPageSemanticsHtmlV1(card, row, pageIndex) {
  const values = guruPageSemanticsValuesV1(row);
  const key = `page-semantics-${card.id}-${row.id || pageIndex}`;
  return `<details class="route-section v22-route-section guru-page-semantics-v1" data-v22-site-section="${GURU_PAGE_SEMANTICS_SECTION_V1}" data-ui-keeper-key="${escapeAttr(key)}" data-page-semantics-card-v1="${escapeAttr(card.id)}" data-page-semantics-index-v1="${pageIndex}">
    <summary><span class="v22-section-title">Семантика страницы</span><span class="guru-page-semantic-count-v1">${values.length}</span></summary>
    <div class="route-section-body v22-section-body guru-page-semantic-body-v1">
      <div class="guru-page-semantic-toolbar-v1">
        <button type="button" class="small-btn guru-page-semantic-analyze-v1" data-page-semantic-analyze-v1>Анализировать текст</button>
        <div class="guru-page-semantic-tools-v1">
          <button type="button" class="guru-page-semantic-icon-v1" data-page-semantic-add-v1 aria-label="Добавить запрос" title="Добавить запрос">+</button>
          <button type="button" class="small-btn" data-page-semantic-import-v1>Импорт CSV/XLS/XLSX</button>
          <button type="button" class="small-btn" data-page-semantic-export-v1>Экспорт CSV</button>
          <button type="button" class="small-btn" data-page-semantic-copy-v1>Копировать все</button>
          <input type="file" class="gate0-keyword-csv-file-v248" data-page-semantic-file-v1 accept=".csv,.xls,.xlsx,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" aria-label="Файл с поисковыми запросами" />
        </div>
      </div>
      <div class="guru-page-semantic-list-v1">${guruPageSemanticsRowsV1(values, 0, guruPageSemanticsMetricsV1(row))}</div>
      <p class="guru-page-semantic-empty-v1" ${values.length ? 'hidden' : ''}>Запросов пока нет. Анализируйте текст страницы или добавьте фразу.</p>
    </div>
  </details>`;
}

const guruPageSemanticsPreviousCardHtmlV1 = pageStructureCardHtml;
pageStructureCardHtml = function (card, row, pageIndex, repeatable) {
  const html = guruPageSemanticsPreviousCardHtmlV1.apply(this, arguments);
  const template = document.createElement('template');
  template.innerHTML = html;
  const page = template.content.querySelector('.page-structure-card');
  const seo = page?.querySelector('[data-v22-site-section="seo_snippet"]');
  if (!seo) return html;
  const semantic = document.createElement('template');
  semantic.innerHTML = guruPageSemanticsHtmlV1(card, row, pageIndex);
  const heading = page.querySelector('[data-v22-site-section="page_heading_description_v513"]');
  (heading || seo).before(semantic.content.firstElementChild);
  if (card?.id === 'card-24') {
    for (const [key, selector] of [
      ['pageSemantics', '[data-v22-site-section="page_semantics_v1"]'],
      ['pageHeading', '[data-v22-site-section="page_heading_description_v513"]'],
      ['seoSnippet', '[data-v22-site-section="seo_snippet"]'],
    ]) {
      const block = page.querySelector(selector);
      const summary = block?.querySelector(':scope > summary');
      const body = block?.querySelector(':scope > .route-section-body');
      if (!summary || !body) continue;
      const status = goatProductCardStatusV514(row, key);
      block.dataset.goatProductSectionCardV514 = key;
      for (const name of ['not_started', 'in_progress', 'ready', 'problem', 'not_needed', 'excluded'])
        block.classList.remove(`status-${name}`);
      block.classList.add(`status-${status}`);
      block.classList.toggle('is-excluded-v553', status === 'excluded');
      summary.querySelector(':scope > .v22-section-status')?.remove();
      summary.insertAdjacentHTML('beforeend', goatProductCardStatusControlV515(card, row, pageIndex, key));
      body.insertAdjacentHTML('beforeend', goatProductDecisionControlsV554(card, row, pageIndex, key));
    }
  }
  return template.innerHTML;
};

function guruPageSemanticsTargetV1(control) {
  const section = control?.closest?.('[data-page-semantics-card-v1]');
  const card = section && findCard(section.dataset.pageSemanticsCardV1);
  const index = Number(section?.dataset.pageSemanticsIndexV1);
  const row = Number.isInteger(index) ? card?.pageRows?.[index] : null;
  return row ? { section, card, row, index } : null;
}

function guruPageSemanticsPaintV1(section, row) {
  const values = guruPageSemanticsValuesV1(row);
  section.querySelector('.guru-page-semantic-list-v1').innerHTML =
    guruPageSemanticsRowsV1(values, 0, guruPageSemanticsMetricsV1(row));
  section.querySelector('.guru-page-semantic-count-v1').textContent = String(values.length);
  section.querySelector('.guru-page-semantic-empty-v1').hidden = values.length > 0;
}

function guruPageSemanticsCommitV1(target, values, { repaint = true } = {}) {
  const unique = guruPageSemanticsUniqueV1(values);
  target.row.contextFields = target.row.contextFields || {};
  target.row.contextFields.seoKeywords = unique.join(', ');
  target.row.contextFields.pageSemanticKeywordsV1 = unique;
  target.row.contextFields.pageSemanticKeywordsTextV1 = target.row.contextFields.seoKeywords;
  const seoInput = target.section?.closest('.page-structure-card')
    ?.querySelector('[data-page-context-key="seoKeywords"]');
  if (seoInput)
    seoInput.value = target.row.contextFields.seoKeywords;
  guruInvalidateGateViewCache();
  gate1ScheduleDurablePersist();
  if (repaint && target.section) guruPageSemanticsPaintV1(target.section, target.row);
  if (repaint && typeof g1RefreshSectionBadges === 'function')
    g1RefreshSectionBadges(target.card);
  if (repaint && typeof guruGate1MiddleRefreshV257 === 'function' &&
      pageTemplateContext(target.card) === 'product')
    guruGate1MiddleRefreshV257(target.card, target.row, target.index);
}

document.addEventListener('input', (event) => {
  if (event.target?.matches?.('[data-page-context-key="seoKeywords"]')) {
    const input = event.target;
    const card = findCard(input.dataset.pageContextCardId);
    const row = card?.pageRows?.[Number(input.dataset.pageContextIndex)];
    const section = input.closest('.page-structure-card')
      ?.querySelector('[data-v22-site-section="page_semantics_v1"]');
    if (row) {
      row.contextFields = row.contextFields || {};
      row.contextFields.pageSemanticKeywordsV1 = guruPageSemanticsUniqueV1(
        guruPageSemanticsSplitV1(input.value, row.contextFields.pageSemanticKeywordsV1));
      row.contextFields.pageSemanticKeywordsTextV1 = String(input.value || '');
      row.contextFields.seoKeywords = String(input.value || '');
      if (section) guruPageSemanticsPaintV1(section, row);
    }
    return;
  }
  if (!event.target?.matches?.('[data-page-semantic-input-v1]')) return;
  const target = guruPageSemanticsTargetV1(event.target);
  if (!target) return;
  const oldKey = event.target.dataset.pageSemanticMetricKeyV1;
  const newKey = guruV247KeywordNormalize(event.target.value);
  const metrics = guruPageSemanticsMetricsV1(target.row);
  if (oldKey && newKey && oldKey !== newKey && metrics[oldKey]) {
    if (!metrics[newKey]) metrics[newKey] = metrics[oldKey];
    delete metrics[oldKey];
    target.row.contextFields.pageSemanticMetricsV1 = metrics;
  }
  if (oldKey && oldKey !== newKey && target.row.contextFields?.pageSemanticImportRowsV1)
    delete target.row.contextFields.pageSemanticImportRowsV1[oldKey];
  if (newKey) event.target.dataset.pageSemanticMetricKeyV1 = newKey;
  const values = [...target.section.querySelectorAll('[data-page-semantic-input-v1]')]
    .map((input) => input.value);
  guruPageSemanticsCommitV1(target, values, { repaint: false });
});

async function guruPageSemanticsImportFileV1(file) {
  return { keywords: await guruV248ReadKeywordFile(file) };
}

function guruPageSemanticsFinalizeImportV1(pending, mode) {
  const card = findCard(pending.cardId);
  const row = card?.pageRows?.[pending.pageIndex];
  const section = [...document.querySelectorAll('[data-page-semantics-card-v1]')]
    .find((element) => element.dataset.pageSemanticsCardV1 === pending.cardId &&
      Number(element.dataset.pageSemanticsIndexV1) === pending.pageIndex);
  if (!row || !section || !['add', 'replace'].includes(mode)) return;
  const record = { keywords: guruPageSemanticsValuesV1(row)
    .map((value) => guruV247KeywordEntry({ value, status: 'confirmed' })) };
  guruKeywordFoundationApplyImportV257(record, pending.parsed, mode, pending.fileName);
  row.contextFields = row.contextFields || {};
  const metrics = mode === 'replace' ? {} : { ...guruPageSemanticsMetricsV1(row) };
  const sourceRows = mode === 'replace' ? {} : { ...(row.contextFields.pageSemanticImportRowsV1 || {}) };
  pending.parsed.entries.forEach((entry) => {
    const key = guruV247KeywordNormalize(guruV247KeywordText(entry));
    if (!key) return;
    if (Object.keys(entry.importedMetricsV1 || {}).length)
      metrics[key] = { ...(metrics[key] || {}), ...entry.importedMetricsV1 };
    sourceRows[key] = {
      source: entry.source, status: entry.status,
      ...entry.importColumnsV1,
      file: pending.fileName,
    };
  });
  row.contextFields.pageSemanticMetricsV1 = metrics;
  row.contextFields.pageSemanticImportRowsV1 = sourceRows;
  row.contextFields.pageSemanticLastImportV1 = record.last_import;
  guruPageSemanticsCommitV1({ section, card, row, index: pending.pageIndex },
    record.keywords.map(guruV247KeywordText));
}

document.addEventListener('change', (event) => {
  const input = event.target;
  if (input?.matches?.('[data-page-semantic-input-v1]')) {
    const target = guruPageSemanticsTargetV1(input);
    if (target) {
      guruPageSemanticsPaintV1(target.section, target.row);
      if (typeof g1RefreshSectionBadges === 'function') g1RefreshSectionBadges(target.card);
      if (typeof guruGate1MiddleRefreshV257 === 'function' &&
          pageTemplateContext(target.card) === 'product')
        guruGate1MiddleRefreshV257(target.card, target.row, target.index);
    }
    return;
  }
  if (!input?.matches?.('[data-page-semantic-file-v1]') || !input.files?.[0]) return;
  const target = guruPageSemanticsTargetV1(input);
  if (!target) return;
  const file = input.files[0];
  input.value = '';
  guruPageSemanticsImportFileV1(file).then(({ keywords }) => {
    if (state?.gates?.find(isGate1Analytics)?.cards?.find((card) => card.id === target.card.id)
        ?.pageRows?.[target.index] !== target.row) return;
    if (!keywords.entries.length) {
      window.alert('В файле не найдено ни одной непустой фразы.');
      return;
    }
    guruV248OpenKeywordImportDialog({ id: target.row.id || `${target.card.id}:${target.index}`,
      name: guruV185Text(target.row.name || target.card.title) }, keywords, file.name,
      { foundation: 'page-semantics', cardId: target.card.id,
        pageIndex: target.index, title: 'Семантика страницы', subjectLabel: 'Страница' });
  }).catch((error) => {
    console.error('Не удалось импортировать семантику страницы', error);
    window.alert(error?.message || 'Не удалось прочитать файл.');
  });
});

document.addEventListener('click', (event) => {
  const control = event.target?.closest?.('[data-page-semantic-analyze-v1], [data-page-semantic-add-v1], [data-page-semantic-remove-v1], [data-page-semantic-import-v1], [data-page-semantic-export-v1], [data-page-semantic-copy-v1]');
  if (!control) return;
  const target = guruPageSemanticsTargetV1(control);
  if (!target) return;
  event.preventDefault();
  event.stopPropagation();
  if (control.hasAttribute('data-page-semantic-import-v1')) {
    target.section.querySelector('[data-page-semantic-file-v1]')?.click();
    return;
  }
  const values = guruPageSemanticsValuesV1(target.row);
  if (control.hasAttribute('data-page-semantic-export-v1')) {
    const name = guruV185Text(target.row.name || target.card.title)
      .toLocaleLowerCase('ru-RU').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'page';
    const metrics = guruPageSemanticsMetricsV1(target.row);
    downloadText(`page-semantics-${name}.csv`, guruGate1FinalMetricsCsvV279(
      values.map((value) => ({ demandRow: { kw: value,
        ...(metrics[guruV247KeywordNormalize(value)] || {}) } })),
      { includeTrafficVolume: true }));
    return;
  }
  if (control.hasAttribute('data-page-semantic-copy-v1')) {
    g4sbV141CopyText(values.join('\n')).catch((error) =>
      console.error('Не удалось скопировать поисковые запросы', error));
    return;
  }
  if (control.hasAttribute('data-page-semantic-add-v1')) {
    const list = target.section.querySelector('.guru-page-semantic-list-v1');
    const blank = [...list.querySelectorAll('[data-page-semantic-input-v1]')]
      .find((input) => !guruV185Text(input.value));
    if (blank) { blank.focus(); return; }
    list.insertAdjacentHTML('beforeend', guruPageSemanticsRowsV1([''], values.length));
    list.lastElementChild.querySelector('input')?.focus();
    return;
  }
  if (control.hasAttribute('data-page-semantic-remove-v1')) {
    const removed = values.splice(Number(control.dataset.pageSemanticRemoveV1), 1)[0];
    const key = guruV247KeywordNormalize(removed);
    if (key && target.row.contextFields?.pageSemanticMetricsV1)
      delete target.row.contextFields.pageSemanticMetricsV1[key];
    if (key && target.row.contextFields?.pageSemanticImportRowsV1)
      delete target.row.contextFields.pageSemanticImportRowsV1[key];
    guruPageSemanticsCommitV1(target, values);
    return;
  }
  const snapshot = guruPageSemanticsSourceV1(target.card, target.row);
  const generated = guruV247KeywordCandidates(snapshot, values, Math.max(0, 30 - values.length));
  if (generated.length) guruPageSemanticsCommitV1(target, [...values, ...generated]);
});
