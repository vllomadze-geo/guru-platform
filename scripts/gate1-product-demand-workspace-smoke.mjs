import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import XLSX from 'xlsx';

const debugPort = Number(process.env.GURU_CHROME_DEBUG_PORT || 49337);
const appPort = Number(process.env.GURU_APP_PORT || 41323);
const metricRows = [
  ['Ключевое слово', 'Объём показов/мес', 'Примерное количество запросов',
    'Переходы/мес', 'Цена клика, руб.', 'Ставка, руб.', 'Примерный бюджет, руб.'],
  ['шапка коза', 120, 40, 12, 21, 26, 252],
];
const book = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(metricRows), 'Метрики');
const files = {
  'metrics.csv': Buffer.from(metricRows.map((row) => row.map((value) =>
    String(value).includes(',') ? `"${value}"` : value).join(',')).join('\r\n')).toString('base64'),
  'metrics.xls': XLSX.write(book, { bookType: 'xls', type: 'buffer' }).toString('base64'),
  'metrics.xlsx': XLSX.write(book, { bookType: 'xlsx', type: 'buffer' }).toString('base64'),
};

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);
    message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
  });
  return { close: () => socket.close(), call: (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    }) };
}

const browserInfo = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = await connect(browserInfo.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = await connect(targets.find((entry) => entry.id === targetId).webSocketDebuggerUrl);
const evaluate = async (expression) => {
  const reply = await page.call('Runtime.evaluate', {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (reply.exceptionDetails)
    throw new Error(reply.exceptionDetails.exception?.description || reply.exceptionDetails.text);
  return reply.result.value;
};

try {
  await page.call('Page.enable');
  await page.call('Runtime.enable');
  await page.call('Page.addScriptToEvaluateOnNewDocument', {
    source: await readFile(new URL('../node_modules/xlsx/dist/xlsx.full.min.js', import.meta.url), 'utf8'),
  });
  await page.call('Page.navigate', { url: `http://127.0.0.1:${appPort}/` });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate('document.readyState === "complete" && typeof g1pdWorkspaceHtmlV1 === "function"')) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const result = await evaluate(`(async () => {
    const imported = {};
    for (const [name, base64] of Object.entries(${JSON.stringify(files)})) {
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const parsed = await guruGate1FinalReadMetricsFileV260(new File([bytes], name));
      imported[name] = parsed.rows.map((row) => [row.volume, row.queryCount,
        row.monthlyClicks, row.clickPrice, row.bid, row.budget]);
    }
    state = createFreshWorkspace({ id: 'g1pd-v2-smoke', name: 'Gate 1 unified smoke' });
    activeProjectId = state.project.id;
    const product = { id: 'g1pd-product', name: 'Тестовый товар' };
    state.project.catalogItemsV189 = [product];
    guruV194Ensure(state);
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = '__uncategorized__';
    ui.selectedProductId = product.id;
    const card = state.gates.find((gate) => gate.id === 'gate-1').cards.find((entry) => entry.id === 'card-24');
    card.pageRows = [{ id: 'g1pd-page', catalogItemIdV189: product.id, name: 'Тестовая страница',
      contextFields: { productPrice: '1000 ₽', pageSemanticKeywordsV1: ['Шапка Коза', 'зимняя шапка'],
        pageSemanticMetricsV1: { 'шапка коза': { vol: '120', queryCount: '40' },
          'зимняя шапка': { vol: '55', queryCount: '5' } } } }];
    state.project.gate0ScopedValuesV194 ||= [];
    state.project.gate0ScopedValuesV194.push({ id: 'g1pd-keywords', field: 'keyword_foundation',
      scope: 'product', product_id: product.id, keywords: [
        { value: 'шапка коза', status: 'confirmed' },
        { value: 'новогодняя шапка', status: 'confirmed' }] });
    state.project.gate0ScopedValuesV194.push({ id: 'g1pd-main-jtbd', field: 'jtbd',
      scope: 'product', product_id: product.id, value: 'коза',
      jtbd: { situation: 'подарок', desired_action: 'найти козу', result: 'порадовать' },
      confirmation_status: 'confirmed' });
    const context = guruGate1FinalPainContextV259(product, true);
    context.itemData.demandRows = [
      { kw: 'шапка коза', vol: '100', queryCount: '35', originStage: 'gate1' },
      { kw: 'новогодняя шапка', queryCount: '7', originStage: 'gate1' },
    ];
    g1pdWorkspaceHtmlV1();
    const before = JSON.stringify(state);
    const statusBefore = getPainOfferStatus();
    const completionBefore = guruGate1SelectedProductCompletionV282();
    const root = document.createElement('div');
    root.innerHTML = g1pdWorkspaceHtmlV1();
    const initial = {
      phrases: root.querySelectorAll('.g1pd-rows-v1 > .pv181-demand-row').length,
      tables: root.querySelectorAll('.g1pd-table-v2').length,
      oldTable: root.querySelectorAll('.g1pd-jtbd-v1, .pv181-primary-jtbd-demand-table-v272').length,
      legacyTargets: root.querySelectorAll('[data-gate1-final-foundation-v259], #gate1-product-jtbd').length,
      exportButtons: root.querySelectorAll('[data-g1pd-export-v2]').length,
      copyButtons: root.querySelectorAll('[data-g1pd-copy-all-v1]').length,
      importButtons: root.querySelectorAll('[data-g1pd-import-v2]').length,
      counts: [...root.querySelectorAll('[data-g1pd-filter-v2]')].map((button) =>
        [button.dataset.g1pdFilterV2, button.querySelector('b')?.textContent]),
      sourceLinks: [...root.querySelectorAll('[data-g1pd-phrase-v1="шапка коза"] [data-g1pd-source-v1]')]
        .map((node) => node.textContent.trim()),
      storedVolume: root.querySelector('[data-g1pd-phrase-v1="шапка коза"] [data-g1pd-metric-v2="vol"]')?.value,
      pageVolume: root.querySelector('[data-g1pd-phrase-v1="зимняя шапка"] [data-g1pd-metric-v2="vol"]')?.value,
      totalTitle: root.querySelector('[data-g1pd-totals-v2] .pv181-demand-totals-row-v276 > :first-child .g1-input')?.textContent,
      totalVolume: root.querySelector('[data-g1pd-totals-v2] [data-pv181-demand-total-field-v276="vol"]')?.textContent,
      totalQueries: root.querySelector('[data-g1pd-totals-v2] [data-pv181-demand-total-field-v276="queryCount"]')?.textContent,
      benchmarkNames: [...root.querySelectorAll('[data-g1pd-totals-v2] [data-pv181-group-benchmark-v277]')]
        .map((node) => node.dataset.pv181GroupBenchmarkV277),
      benchmarkDots: root.querySelectorAll('[data-g1pd-totals-v2] .pv181-group-benchmark-dot-v277').length,
      initialAnomalies: root.querySelector('[data-g1pd-totals-v2] [data-pv181-group-anomalies-v277]')?.dataset.pv181GroupAnomaliesV277,
      initialReliability: root.querySelector('[data-g1pd-totals-v2] [data-pv181-group-reliable-count-v277]')?.dataset.pv181GroupReliableCountV277,
      columnCount: root.querySelector('.pv181-demand-table-head-v263')?.children.length,
      defaultSort: root.querySelector('[data-g1kw-sort-v561="queryCount"]')?.getAttribute('aria-pressed'),
      unchanged: JSON.stringify(state) === before,
      statusUnchanged: getPainOfferStatus() === statusBefore,
      completionUnchanged: guruGate1SelectedProductCompletionV282().completed === completionBefore.completed &&
        guruGate1SelectedProductCompletionV282().total === completionBefore.total,
      legacyTotalsTitle: (() => {
        const template = document.createElement('template');
        template.innerHTML = pv181DemandTotalsHtmlV276(
          [{ demandRow: { kw: 'проверка', vol: '1' } }],
          { itemId: product.id, showBenchmarks: false });
        return template.content.querySelector('[data-pv181-demand-totals-v276] > :first-child .g1-input')?.textContent;
      })(),
    };
    projects = [{ id: activeProjectId, name: 'Gate 1 unified smoke', lifecycleStatus: 'active' }];
    els.launcher.hidden = true;
    els.appShell.hidden = false;
    activeView = 'gate';
    activeGateId = 'gate-1';
    renderGate();
    els.contentArea.querySelector('[data-gate1-toggle-section="pain_jtbd_offer"]')?.click();
    const live = () => els.contentArea.querySelector('[data-g1pd-workspace-v1]');
    const copied = [];
    const originalCopyText = g4sbV141CopyText;
    g4sbV141CopyText = async (value) => { copied.push(value); };
    const copyButton = live().querySelector('[data-g1pd-copy-all-v1]');
    const rowBeforeCopy = live().querySelector('[data-g1pd-phrase-v1="шапка коза"]');
    const stateBeforeCopy = JSON.stringify(state);
    copyButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const copyAll = { text: copied.at(-1), notice: copyButton.textContent,
      sameRow: live().querySelector('[data-g1pd-phrase-v1="шапка коза"]') === rowBeforeCopy,
      unchanged: JSON.stringify(state) === stateBeforeCopy };
    const search = live().querySelector('[data-g1pd-search-v2]');
    const originalRow = live().querySelector('[data-g1pd-phrase-v1="шапка коза"]');
    search.value = 'зимняя';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    copyButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const copySearch = { text: copied.at(-1), notice: copyButton.textContent };
    const searched = { rows: live().querySelectorAll('.g1pd-rows-v1 > .pv181-demand-row:not([hidden])').length,
      sameRow: live().querySelector('[data-g1pd-phrase-v1="шапка коза"]') === originalRow,
      volume: live().querySelector('[data-g1pd-totals-v2] [data-pv181-demand-total-field-v276="vol"]')?.textContent,
      anomalies: live().querySelector('[data-g1pd-totals-v2] [data-pv181-group-anomalies-v277]')?.dataset.pv181GroupAnomaliesV277 };
    live().querySelector('[data-g1pd-filter-v2="primary"]').click();
    const emptySearch = live().querySelector('.g1pd-rows-v1 > .pv181-keyword-empty')?.textContent.trim();
    const copyDisabledWhenEmpty = copyButton.disabled;
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    const primaryRows = live().querySelectorAll('.g1pd-rows-v1 > .pv181-demand-row').length;
    const primaryVolume = live().querySelector('[data-g1pd-totals-v2] [data-pv181-demand-total-field-v276="vol"]')?.textContent;
    copyButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const copyPrimary = copied.at(-1);
    live().querySelector('[data-g1pd-filter-v2="outside"]').click();
    const outsideVolume = live().querySelector('[data-g1pd-totals-v2] [data-pv181-demand-total-field-v276="vol"]')?.textContent;
    const outsideAnomalies = live().querySelector('[data-g1pd-totals-v2] [data-pv181-group-anomalies-v277]')?.dataset.pv181GroupAnomaliesV277;
    copyButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const copyOutside = copied.at(-1);
    live().querySelector('[data-g1pd-filter-v2="all"]').click();
    const volumeInput = live().querySelector('[data-g1pd-phrase-v1="шапка коза"] [data-g1pd-metric-v2="vol"]');
    volumeInput.value = '150';
    volumeInput.dispatchEvent(new Event('input', { bubbles: true }));
    volumeInput.dispatchEvent(new Event('change', { bubbles: true }));
    const editedMetric = context.itemData.demandRows.find((row) => row.kw === 'шапка коза')?.vol;
    const totalAfterEdit = live().querySelector('[data-g1pd-totals-v2] [data-pv181-demand-total-field-v276="vol"]')?.textContent;
    const updateQueries = async (value) => {
      const input = live().querySelector('[data-g1pd-phrase-v1="новогодняя шапка"] [data-g1pd-metric-v2="queryCount"]');
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return live().querySelector('.g1pd-rows-v1 > .pv181-demand-row')?.dataset.g1pdPhraseV1;
    };
    const dynamicDesc = await updateQueries('90');
    const dynamicRestored = await updateQueries('7');
    const sortButton = live().querySelector('[data-g1kw-sort-v561="vol"]');
    sortButton.click();
    const sortedDesc = [...live().querySelectorAll('.g1pd-rows-v1 > .pv181-demand-row')]
      .map((row) => row.dataset.g1pdPhraseV1);
    sortButton.click();
    const sortedAsc = [...live().querySelectorAll('.g1pd-rows-v1 > .pv181-demand-row')]
      .map((row) => row.dataset.g1pdPhraseV1);
    copyButton.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const copySorted = copied.at(-1);
    const sectionToggle = live().closest('.g1-section').querySelector('[data-gate1-toggle-section="pain_jtbd_offer"]');
    sectionToggle.click();
    sectionToggle.click();
    const reopenedSort = {
      first: live().querySelector('.g1pd-rows-v1 > .pv181-demand-row')?.dataset.g1pdPhraseV1,
      queryPressed: live().querySelector('[data-g1kw-sort-v561="queryCount"]')?.getAttribute('aria-pressed'),
      volumePressed: live().querySelector('[data-g1kw-sort-v561="vol"]')?.getAttribute('aria-pressed'),
    };
    g4sbV141CopyText = originalCopyText;
    const relevance = live().querySelector('[data-g1kw-phrase-v553="шапка коза"][data-g1kw-relevance-v553]');
    relevance.value = 'high';
    relevance.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const summaryAfterRating = live().querySelector('[data-g1pd-summary-v2]')?.textContent;
    const outsideSelect = live().querySelector('[data-g1pd-phrase-v1="зимняя шапка"] [data-g1pd-assign-v2]');
    outsideSelect.value = 'primary';
    outsideSelect.dispatchEvent(new Event('change', { bubbles: true }));
    const assigned = guruGate1JtbdAssignmentsV274(context.itemData)['зимняя шапка']?.target;
    const afterAssign = live().querySelector('[data-g1pd-summary-v2]')?.textContent;
    live().querySelector('[data-g1pd-undo-action-v2]')?.click();
    const afterUndo = live().querySelector('[data-g1pd-summary-v2]')?.textContent;
    const pageRowRemovedByUndo = !context.itemData.demandRows.some((row) => row.kw === 'зимняя шапка');
    live().querySelector('[data-g1pd-add-jtbd-v2]')?.click();
    const additional = guruGate1EnsureAdditionalJtbdsV268(context.itemData);
    const addedJtbd = additional.length === 1;
    const newId = additional[0]?.id;
    const editing = live()?.querySelector('[data-g1pd-context-v2] [data-gate0-scope-record-field="jtbd_situation"]');
    if (editing) {
      editing.value = 'новый случай';
      editing.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const editedValue = guruV194Resolve('jtbd', product, state).records[1]?.jtbd?.situation;
    live()?.querySelector('[data-g1pd-filter-v2="all"]')?.click();
    const targetSelect = live()?.querySelector('[data-g1pd-phrase-v1="новогодняя шапка"] [data-g1pd-assign-v2]');
    if (targetSelect && newId) {
      targetSelect.value = 'additional:' + newId;
      targetSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const inAdditional = guruGate1JtbdAssignmentsV274(context.itemData)['новогодняя шапка']?.additional_jtbd_id === newId;
    live()?.querySelector('[data-g1pd-filter-v2="additional:' + newId + '"]')?.click();
    const additionalRows = live()?.querySelectorAll('.g1pd-rows-v1 > .pv181-demand-row').length;
    live()?.querySelector('[data-g1pd-delete-jtbd-v2]')?.click();
    const deletedJtbd = guruGate1EnsureAdditionalJtbdsV268(context.itemData).length === 0;
    const releasedPhrase = guruGate1JtbdAssignmentsV274(context.itemData)['новогодняя шапка']?.target === 'pending';
    const fileInput = live()?.querySelector('[data-g1pd-file-v2]');
    const originalClick = fileInput?.click;
    let pickerOpened = 0;
    if (fileInput) fileInput.click = () => { pickerOpened += 1; };
    live()?.querySelector('[data-g1pd-import-v2]')?.click();
    if (fileInput) fileInput.click = originalClick;
    let exported = '';
    const originalDownload = downloadText;
    downloadText = (_name, content) => { exported = content; };
    live()?.querySelector('[data-g1pd-filter-v2="all"]')?.click();
    live()?.querySelector('[data-g1pd-export-v2]')?.click();
    downloadText = originalDownload;
    const csv = Uint8Array.from(atob(${JSON.stringify(files['metrics.csv'])}),
      (char) => char.charCodeAt(0));
    const upload = new DataTransfer();
    upload.items.add(new File([csv], 'metrics.csv', { type: 'text/csv' }));
    const uploadInput = live()?.querySelector('[data-g1pd-file-v2]');
    uploadInput.files = upload.files;
    uploadInput.dispatchEvent(new Event('change', { bubbles: true }));
    for (let attempt = 0; attempt < 30 &&
        context.itemData.demandRows.find((row) => row.kw === 'шапка коза')?.forecastClicks !== '12'; attempt++)
      await new Promise((resolve) => setTimeout(resolve, 50));
    const appliedImport = context.itemData.demandRows.find((row) => row.kw === 'шапка коза');
    const afterImportBenchmarks = {
      ctr: live()?.querySelector('[data-g1pd-totals-v2] [data-pv181-group-ctr-v277]')?.dataset.pv181GroupCtrV277,
      priceText: live()?.querySelector('[data-g1pd-totals-v2] [data-pv181-group-benchmark-v277="price"]')?.textContent,
      anomalies: live()?.querySelector('[data-g1pd-totals-v2] [data-pv181-group-anomalies-v277]')?.dataset.pv181GroupAnomaliesV277,
    };
    const afterImportTotals = ['vol', 'queryCount', 'forecastClicks',
      'clickPrice', 'bid', 'forecastBudget'].map((field) =>
      live()?.querySelector('[data-g1pd-totals-v2] [data-pv181-demand-total-field-v276="' + field + '"]')?.textContent);
    live()?.querySelector('[data-g1pd-phrase-v1="шапка коза"] [data-g1pd-source-v1="page"]')?.click();
    const pageSourceReached = Boolean(document.querySelector('[data-v22-site-section="page_semantics_v1"]')) &&
      activeGateId === 'gate-1';
    const sourceLink = live()?.querySelector('[data-g1pd-phrase-v1="шапка коза"] [data-g1pd-source-v1="gate0"]');
    sourceLink?.click();
    const sourceNavigationGate = activeGateId;
    return { imported, initial, copyAll, copySearch, copyPrimary,
      copyOutside, copySorted, copyDisabledWhenEmpty, searched, emptySearch, primaryRows,
      primaryVolume, outsideVolume, outsideAnomalies,
      editedMetric, totalAfterEdit, dynamicDesc, dynamicRestored,
      sortedDesc, sortedAsc, reopenedSort,
      summaryAfterRating, assigned, afterAssign, afterUndo, pageRowRemovedByUndo,
      addedJtbd, editedValue, inAdditional, additionalRows, deletedJtbd,
      releasedPhrase, pickerOpened, exported,
      appliedImport: appliedImport && [appliedImport.vol, appliedImport.queryCount,
        appliedImport.forecastClicks, appliedImport.clickPrice,
        appliedImport.bid, appliedImport.forecastBudget], afterImportBenchmarks,
      afterImportTotals,
      pageSourceReached,
      sourceNavigationGate,
      readinessAfter: getPainOfferStatus(), statusBefore };
  })()`);
  for (const name of Object.keys(files))
    assert.deepEqual(result.imported[name], [['120', '40', '12', '21', '26', '252']],
      `${name} metrics parse changed`);
  assert.equal(result.initial.phrases, 3);
  assert.equal(result.initial.tables, 1);
  assert.equal(result.initial.oldTable, 0);
  assert.equal(result.initial.legacyTargets, 2);
  assert.equal(result.initial.exportButtons, 1);
  assert.equal(result.initial.copyButtons, 1);
  assert.equal(result.initial.importButtons, 1);
  assert.deepEqual(result.initial.counts, [['all', '3'], ['primary', '1'], ['outside', '2']]);
  assert(result.initial.sourceLinks.some((value) => value.includes('Gate 0')));
  assert(result.initial.sourceLinks.some((value) => value.includes('Семантика страницы')));
  assert.equal(result.initial.storedVolume, '100');
  assert.equal(result.initial.pageVolume, '55');
  assert.equal(result.initial.totalTitle, 'Итого по выборке');
  assert.equal(result.initial.legacyTotalsTitle, 'Итого по группе');
  assert.equal(result.initial.totalVolume, '155');
  assert.equal(result.initial.totalQueries, '47');
  assert.deepEqual(result.initial.benchmarkNames,
    ['ctr', 'reliability', 'size', 'price', 'anomalies']);
  assert.equal(result.initial.benchmarkDots, 5);
  assert.equal(result.initial.initialAnomalies, '1');
  assert.equal(result.initial.initialReliability, '2');
  assert.equal(result.initial.columnCount, 10);
  assert.equal(result.initial.defaultSort, 'true');
  assert(result.initial.unchanged && result.initial.statusUnchanged &&
    result.initial.completionUnchanged);
  assert.deepEqual(result.copyAll, {
    text: 'шапка коза\nновогодняя шапка\nзимняя шапка',
    notice: 'Скопировано 3 фразы',
    sameRow: true, unchanged: true,
  });
  assert.deepEqual(result.copySearch, {
    text: 'зимняя шапка', notice: 'Скопировано 1 фраза',
  });
  assert(result.copyDisabledWhenEmpty);
  assert.equal(result.copyPrimary, 'шапка коза');
  assert.equal(result.copyOutside, 'новогодняя шапка\nзимняя шапка');
  assert.equal(result.copySorted, 'зимняя шапка\nшапка коза\nновогодняя шапка');
  assert.deepEqual(result.searched, { rows: 1, sameRow: true, volume: '55', anomalies: '0' });
  assert.equal(result.emptySearch, 'Ничего не найдено');
  assert.equal(result.primaryRows, 1);
  assert.equal(result.primaryVolume, '100');
  assert.equal(result.outsideVolume, '55');
  assert.equal(result.outsideAnomalies, '1');
  assert.equal(result.editedMetric, '150');
  assert.equal(result.totalAfterEdit, '205');
  assert.equal(result.dynamicDesc, 'новогодняя шапка');
  assert.equal(result.dynamicRestored, 'шапка коза');
  assert.equal(result.sortedDesc[0], 'шапка коза');
  assert.deepEqual(result.sortedAsc.slice(0, 2), ['зимняя шапка', 'шапка коза']);
  assert.deepEqual(result.reopenedSort, {
    first: 'шапка коза', queryPressed: 'true', volumePressed: 'false',
  });
  assert(result.summaryAfterRating?.includes('2 без оценки'));
  assert.equal(result.assigned, 'primary');
  assert(result.afterAssign?.includes('2 в JTBD'));
  assert(result.afterUndo?.includes('1 в JTBD'));
  assert(result.pageRowRemovedByUndo);
  assert(result.addedJtbd && result.editedValue === 'новый случай');
  assert(result.inAdditional && result.additionalRows === 1);
  assert(result.deletedJtbd && result.releasedPhrase);
  assert.equal(result.pickerOpened, 1);
  assert(result.exported.includes('шапка коза') &&
    result.exported.includes('новогодняя шапка') &&
    result.exported.includes('зимняя шапка'));
  assert.deepEqual(result.appliedImport, ['120', '40', '12', '21', '26', '252']);
  assert.deepEqual(result.afterImportTotals, ['175', '52', '12', '21', '26', '252.00']);
  assert(Number(result.afterImportBenchmarks.ctr) > 0);
  assert(result.afterImportBenchmarks.priceText.includes('2.1%'));
  assert.equal(result.afterImportBenchmarks.anomalies, '1');
  assert(result.pageSourceReached);
  assert.equal(result.sourceNavigationGate, 'gate-0');
  assert.equal(result.readinessAfter, result.statusBefore);
  console.log(JSON.stringify({ synthetic: result }, null, 2));
  for (const width of [1800, 1024, 600]) {
    await page.call('Emulation.setDeviceMetricsOverride', {
      width, height: 1000, deviceScaleFactor: 1, mobile: false,
    });
    const grid = await evaluate(`(async () => {
      document.getElementById('accessGate').hidden = true;
      document.body.classList.remove('access-locked');
      document.body.classList.add('access-unlocked');
      els.appShell.hidden = false;
      if (activeGateId !== 'gate-1') guruNavigateToGate('gate-1');
      await new Promise((resolve) => setTimeout(resolve, 120));
      const toggle = els.contentArea.querySelector('[data-gate1-toggle-section="pain_jtbd_offer"]');
      if (toggle?.getAttribute('aria-expanded') !== 'true') toggle.click();
      await new Promise((resolve) => setTimeout(resolve, 120));
      const table = els.contentArea.querySelector('.g1pd-table-v2');
      if (!table) throw new Error('Gate 1 demand table did not mount');
      const head = table?.querySelector('.pv181-demand-table-head-v263');
      const row = table?.querySelector('.g1pd-rows-v1 > .pv181-demand-row');
      const total = table?.querySelector('.pv181-demand-totals-row-v276');
      const bounds = (nodes) => [...nodes].map((node) => {
        const box = node.getBoundingClientRect();
        return { left: Math.round(box.left), width: Math.round(box.width) };
      });
      const controls = [row?.querySelector(':scope > :first-child .g1-input'),
        row?.querySelector('[data-g1pd-metric-v2="vol"]'),
        row?.querySelector('[data-g1pd-metric-v2="queryCount"]'),
        row?.querySelector('.g1kw-relevance-cell-v553 select'),
        row?.querySelector('.g1kw-transfer-cell-v555 select:not([hidden])')];
      return { width: innerWidth, headDisplay: getComputedStyle(head).display,
        head: bounds(head.children), row: bounds(row.children),
        total: bounds(total.querySelectorAll(':scope > .pv181-demand-cell-v263')),
        labelsHidden: [...row.querySelectorAll('.pv181-demand-cell-label-v263')]
          .every((node) => getComputedStyle(node).display === 'none'),
        controlTops: controls.map((node) => Math.round(node.getBoundingClientRect().top)),
        rowHeights: [...table.querySelectorAll('.g1pd-rows-v1 > .pv181-demand-row')]
          .slice(0, 3).map((node) => Math.round(node.getBoundingClientRect().height)),
        scrollable: table.scrollWidth > table.clientWidth };
    })()`);
    assert.equal(grid.headDisplay, 'grid', `header hidden at ${width}px`);
    assert.equal(grid.head.length, 10);
    assert.equal(grid.row.length, 10);
    assert(grid.labelsHidden, `row labels repeat at ${width}px`);
    grid.row.forEach((cell, index) =>
      assert.deepEqual(cell, grid.head[index], `column ${index + 1} at ${width}px`));
    grid.total.forEach((cell, index) =>
      assert.deepEqual(cell, grid.head[index], `total column ${index + 1} at ${width}px`));
    assert(grid.controlTops.every((top) => Math.abs(top - grid.controlTops[0]) <= 2),
      `controls not aligned at ${width}px: ${grid.controlTops}`);
    assert(grid.rowHeights.every((height) => height === grid.rowHeights[0]),
      `row heights differ at ${width}px: ${grid.rowHeights}`);
    if (width === 600) assert(grid.scrollable, 'narrow table must scroll horizontally');
  }
  if (process.env.GURU_GATE1_REAL_FIXTURE) {
    const fixture = await readFile(process.env.GURU_GATE1_REAL_FIXTURE, 'utf8');
    const real = await evaluate(`(() => {
      const workspace = JSON.parse(${JSON.stringify(fixture)});
      state = { ...createFreshWorkspace({ id: 'g1pd-real-smoke', name: 'Real project smoke' }),
        ...workspace };
      activeProjectId = state.project.id;
      const product = state.project.catalogItemsV189.find((item) =>
        item.name === 'Шапка Коза');
      const ui = guruV194Ui(state);
      ui.selectedProductId = product.id;
      const context = guruGate1FinalPainContextV259(product, false);
      const model = g1pdModelV2(product, context);
      const renderStart = performance.now();
      const markup = g1pdWorkspaceHtmlV1();
      const renderMs = Math.round(performance.now() - renderStart);
      const panel = document.createElement('template');
      panel.innerHTML = markup;
      const root = panel.content.querySelector('[data-g1pd-workspace-v1]');
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:-9999px;top:0;width:1400px;visibility:hidden';
      host.append(root.cloneNode(true));
      document.body.append(host);
      const rowHeights = [...host.querySelectorAll('.g1pd-rows-v1 > .pv181-demand-row')]
        .map((node) => Math.round(node.getBoundingClientRect().height));
      host.remove();
      const view = g1pdViewV2(product.id);
      view.search = 'шапка';
      const searchStart = performance.now();
      g1pdApplySearchV2({ root, product, context, view });
      const searchMs = Math.round(performance.now() - searchStart);
      view.search = '';
      g1pdApplySearchV2({ root, product, context, view });
      const copiedPhrases = g1pdVisiblePhrasesV1({ root, product, context, view });
      return { name: product.name, count: model.counts.all,
        primary: model.counts.primary, outside: model.counts.outside,
        confirmedSourceCount: guruGate1FinalConfirmedV259(product).length,
        renderMs, searchMs, copiedCount: copiedPhrases.length,
        copiedUnique: new Set(copiedPhrases.map(guruV247KeywordNormalize)).size,
        tableCount: panel.content.querySelectorAll('.g1pd-table-v2').length,
        renderedRows: panel.content.querySelectorAll('.g1pd-rows-v1 > .pv181-demand-row').length,
        rowHeightRange: [Math.min(...rowHeights), Math.max(...rowHeights)],
        sourceCounts: model.rows.reduce((counts, row) => {
          row.sources.forEach((source) => { counts[source.target] =
            (counts[source.target] || 0) + 1; });
          return counts;
        }, {}), contextFound: Boolean(context) };
    })()`);
    console.log(JSON.stringify({ real }, null, 2));
    assert.deepEqual([real.count, real.primary, real.outside],
      [real.confirmedSourceCount, real.confirmedSourceCount - 2, 2]);
    assert.equal(real.tableCount, 1);
    assert.equal(real.renderedRows, real.count);
    assert.equal(real.rowHeightRange[0], real.rowHeightRange[1]);
    assert.equal(real.copiedCount, real.count);
    assert.equal(real.copiedUnique, real.count);
  }
  if (process.env.GURU_GATE1_SCREENSHOT) {
    const screenshotSelector = process.env.GURU_GATE1_SCREENSHOT_TARGET === 'totals'
      ? '[data-g1pd-totals-v2]' : '[data-g1pd-workspace-v1]';
    await page.call('Emulation.setDeviceMetricsOverride', {
      width: Number(process.env.GURU_GATE1_SCREENSHOT_WIDTH || 1600),
      height: Number(process.env.GURU_GATE1_SCREENSHOT_HEIGHT || 1000),
      deviceScaleFactor: 1, mobile: false,
    });
    const screenshotTarget = await evaluate(`(async () => {
      guruNavigateToGate('gate-1');
      await new Promise((resolve) => setTimeout(resolve, 120));
      const toggle = els.contentArea.querySelector('[data-gate1-toggle-section="pain_jtbd_offer"]');
      if (!els.contentArea.querySelector('[data-g1pd-workspace-v1]')) toggle?.click();
      await new Promise((resolve) => setTimeout(resolve, 120));
      document.getElementById('accessGate').hidden = true;
      document.body.classList.remove('access-locked');
      document.body.classList.add('access-unlocked');
      document.querySelector(${JSON.stringify(screenshotSelector)})?.scrollIntoView({ block: 'start' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return { hasRoot: Boolean(document.querySelector('[data-g1pd-workspace-v1]')),
        hasToggle: Boolean(toggle), gate: activeGateId };
    })()`);
    console.log(JSON.stringify({ screenshotTarget }));
    const shot = await page.call('Page.captureScreenshot', { format: 'png' });
    await writeFile(process.env.GURU_GATE1_SCREENSHOT, Buffer.from(shot.data, 'base64'));
  }
  if (process.env.GURU_GATE1_RELOAD) {
    await evaluate('saveState(); true');
    const previousLoad = await evaluate('performance.timeOrigin');
    await page.call('Page.reload', { ignoreCache: true });
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(`performance.timeOrigin !== ${previousLoad} &&
          document.readyState === "complete" && typeof g1pdModelV2 === "function" &&
          typeof guruWorkspaceIdbReadV1 === "function"`)) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const persisted = await evaluate(`(async () => {
      const projectId = 'g1pd-v2-smoke';
      let raw = '';
      for (let attempt = 0; attempt < 30 && !raw; attempt++) {
        raw = (await guruWorkspaceIdbReadV1(projectId))?.serialized ||
          localStorage.getItem(WORKSPACE_STORAGE_PREFIX + projectId) || '';
        if (!raw) await new Promise((resolve) => setTimeout(resolve, 100));
      }
      if (!raw) return { saved: false };
      state = loadState(projectId, JSON.parse(raw));
      activeProjectId = projectId;
      const product = state.project.catalogItemsV189.find((item) => item.id === 'g1pd-product');
      guruV194Ui(state).selectedProductId = product.id;
      const context = guruGate1FinalPainContextV259(product, false);
      const model = g1pdModelV2(product, context);
      const restored = document.createElement('template');
      restored.innerHTML = g1pdWorkspaceHtmlV1();
      return { saved: true, counts: model.counts,
        metrics: context.itemData.demandRows.find((row) => row.kw === 'шапка коза'),
        totalTitle: restored.content.querySelector('[data-g1pd-totals-v2] .pv181-demand-totals-row-v276 > :first-child .g1-input')?.textContent,
        benchmarks: restored.content.querySelectorAll('[data-g1pd-totals-v2] [data-pv181-group-benchmark-v277]').length,
        relevance: guruGate1KeywordRelevanceMapV553(
          state.projectComparison?.productsById?.[product.id])['шапка коза'] };
    })()`);
    console.log(JSON.stringify({ persisted }, null, 2));
    assert(persisted.saved);
    assert.equal(persisted.metrics.vol, '120');
    assert.equal(persisted.metrics.forecastClicks, '12');
    assert.equal(persisted.counts.all, 3);
    assert.equal(persisted.counts.primary, 1);
    assert.equal(persisted.totalTitle, 'Итого по выборке');
    assert.equal(persisted.benchmarks, 5);
    assert.equal(persisted.relevance, 'high');
  }
} finally {
  page.close();
  await browser.call('Target.disposeBrowserContext', { browserContextId });
  browser.close();
}
