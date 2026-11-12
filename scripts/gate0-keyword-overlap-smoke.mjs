import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

const port = process.env.GURU_CHROME_DEBUG_PORT || '38677';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:38676/';
const profileScale = Number(process.env.GURU_CONFIRM_PROFILE_SCALE || 0);
const profilePayloadBytes = Number(process.env.GURU_CONFIRM_PROFILE_BYTES || 0);

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      message.error ? pending.reject(Error(message.error.message)) : pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(info.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(targets.find(target => target.id === targetId).webSocketDebuggerUrl);
const evaluate = async expression => {
  const result = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails)
    throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};

try {
  await page.call('Runtime.enable');
  await page.call('Page.enable');
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes('/api/')
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, projects: [], workspaces: [] }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }))
      : nativeFetch(input, init);
  }` });
  await page.call('Page.navigate', { url: appUrl });
  for (let i = 0; i < 100; i += 1) {
    if (await evaluate('document.readyState === "complete" && typeof guruKeywordOverlapIndexV1 === "function"')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const initial = await evaluate(`(() => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    const meta = { id: 'keyword-overlap-smoke', name: 'Проверка пересечений', lifecycleStatus: 'active' };
    projects = [meta]; activeProjectId = meta.id; state = createFreshWorkspace(meta);
    state.project.catalogItemsV189 = [
      { id: 'product-a', name: 'Термос', continuum: 'product' },
      { id: 'product-b', name: 'Оформление термосов', continuum: 'pure_service' },
      { id: 'product-c', name: 'Подарочный набор', continuum: 'product' },
    ];
    state.project.productRegistryV185 = [{ id: 'category-gifts', name: 'Подарки', manualOriginV2: true }];
    megaPlatformCategoryStore(state).categoryIdsByProduct['product-c'] = ['category-gifts'];
    const keyword = (value, status = 'confirmed') => guruV247KeywordEntry({ value, source: 'manual', status });
    const rows = {
      'product-a': [keyword('Термос в чехле'), keyword('текстильная елочка', 'draft'), keyword('уникальный запрос')],
      'product-b': [keyword('термос в чехле'), keyword('ЁЛОЧКА текстильная', 'draft')],
      'product-c': [keyword('термосы в чехлах')],
    };
    for (const item of state.project.catalogItemsV189) {
      const record = guruV247KeywordFoundationRecord(item, true, state);
      record.keywords = rows[item.id];
    }
    if (${profileScale} > 0) {
      for (let index = 0; index < ${profileScale}; index += 1) {
        const id = 'extra-product-' + index;
        state.project.catalogItemsV189.push({ id, name: 'Позиция ' + index, continuum: 'product' });
        state.project.gate0ScopedValuesV194.push({ id: 'extra-foundation-' + index,
          field: 'keyword_foundation', scope: 'product', product_id: id, value: '',
          keywords: Array.from({ length: 40 }, (_, keywordIndex) =>
            guruV247KeywordEntry({ value: 'уникальная фраза ' + index + ' ' + keywordIndex,
              source: 'manual', status: 'draft' })),
          updated_at: new Date().toISOString() });
      }
    }
    if (${profilePayloadBytes} > 0)
      state.project.__keywordConfirmProfilePayload = 'x'.repeat(${profilePayloadBytes});
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = '__uncategorized__'; ui.selectedProductId = 'product-a';
    const card = state.gates.find(gate => gate.id === 'gate-0').cards
      .find(item => v116PassportDef(item)?.key === 'product_segment_client_task');
    state._gate0Open ||= {}; state._gate0Open[card.id] = true;
    els.launcher.hidden = true; els.appShell.hidden = false;
    activeView = 'gate'; activeGateId = 'gate-0'; renderGate();
    const section = document.querySelector('.gate0-keyword-foundation-v247[data-gate0-scope-field-row="keyword_foundation"]');
    if (!section) throw Error('Product keyword foundation missing');
    const entries = [...section.querySelectorAll('[data-gate0-keyword-foundation-row]')];
    window.__keywordBeforeNavigation = JSON.stringify(state.project.gate0ScopedValuesV194
      .filter(item => item.field === 'keyword_foundation'));
    const result = entries.map(row => ({ phrase: row.querySelector('textarea')?.value,
      indicator: row.querySelector('[data-gate0-keyword-overlap] summary')?.textContent.trim() || '' }));
    return result;
  })()`);
  assert.deepEqual(initial, [
    { phrase: 'Термос в чехле', indicator: 'Точно 1 · Похоже 1' },
    { phrase: 'текстильная елочка', indicator: 'Похоже 1' },
    { phrase: 'уникальный запрос', indicator: '' },
  ]);
  const expanded = await evaluate(`guruKeywordOverlapMatchesV1(
    guruKeywordOverlapIndexV1(state), 'термос в кожаном чехле', 'new-product'
  ).map(item => [item.productId, item.type]).sort((left, right) => left[0].localeCompare(right[0]))`);
  assert.deepEqual(expanded, [
    ['product-a', 'meaning'], ['product-b', 'meaning'], ['product-c', 'meaning'],
  ]);
  if (process.env.GURU_PROFILE_CONFIRM === '1') {
    const profile = await evaluate(`(async () => {
      const metrics = {};
      const originals = {};
      for (const name of ['guruV194SelectedProduct', 'guruV247KeywordFoundationRecord',
        'guruV194SyncLegacy', 'flashSaving', 'guruInvalidateGateViewCache',
        'guruV194RefreshFieldHtml', 'guruStrategicFoundationRefreshV245',
        'guruKeywordFoundationRestoreViewV353', 'saveState', 'guruQueueWorkspaceSave',
        'guruV247KeywordFoundationHtml', 'guruKeywordOverlapIndexV1',
        'guruV194Records']) {
        const original = window[name];
        if (typeof original !== 'function') continue;
        originals[name] = original;
        window[name] = function (...args) {
          const started = performance.now();
          const origin = name === 'guruV194SyncLegacy' || name === 'guruV194SelectedProduct'
            ? new Error().stack?.split('\\n').slice(2, 5).join(' | ') : '';
          try { return original.apply(this, args); }
          finally {
            const item = metrics[name] ||= { calls: 0, ms: 0, max: 0 };
            const duration = performance.now() - started;
            item.calls += 1; item.ms += duration; item.max = Math.max(item.max, duration);
            if (origin) (item.origins ||= {})[origin] = ((item.origins || {})[origin] || 0) + 1;
          }
        };
      }
      const row = [...document.querySelectorAll('[data-gate0-keyword-foundation-row]')]
        .find(item => item.querySelector('textarea')?.value === 'текстильная елочка');
      const started = performance.now();
      row.querySelector('[data-gate0-keyword-foundation-confirm]').click();
      const clickMs = performance.now() - started;
      const immediate = { status: row.querySelector('.gate0-keyword-status-v247')?.textContent,
        confirmRemoved: !row.querySelector('[data-gate0-keyword-foundation-confirm]') };
      await new Promise(resolve => setTimeout(resolve, 500));
      Object.entries(originals).forEach(([name, original]) => { window[name] = original; });
      window.__keywordBeforeNavigation = JSON.stringify(state.project.gate0ScopedValuesV194
        .filter(item => item.field === 'keyword_foundation'));
      return { clickMs, immediate, metrics, status: guruV247KeywordFoundationRecord(
        guruV194Product('product-a', state), false, state).keywords[1].status };
    })()`);
    console.log('Confirmation profile:', JSON.stringify(profile));
    assert.equal(profile.status, 'confirmed');
    assert.deepEqual(profile.immediate, { status: 'Подтверждено', confirmRemoved: true });
    if (process.env.GURU_PROFILE_ONLY === '1') {
      await browser.call('Target.disposeBrowserContext', { browserContextId });
      page.close(); browser.close();
      process.exit(0);
    }
  }

  const display = await evaluate(`(() => {
    const row = [...document.querySelectorAll('[data-gate0-keyword-foundation-row]')]
      .find(item => item.querySelector('textarea')?.value === 'Термос в чехле');
    const indicator = row.querySelector('[data-gate0-keyword-overlap]');
    indicator.open = true;
    indicator.scrollIntoView({ block: 'center' });
    const keyword = indicator.querySelector('.gate0-keyword-overlap-term-v1 strong')?.textContent;
    const sources = [...indicator.querySelectorAll('[data-gate0-keyword-overlap-source]')]
      .map(source => ({ id: source.dataset.gate0KeywordOverlapSource,
        type: source.dataset.gate0KeywordOverlapType,
        productLabel: source.querySelector('.gate0-keyword-overlap-product-v1 small')?.textContent,
        product: source.querySelector('.gate0-keyword-overlap-product-v1 span')?.textContent,
        phrase: source.querySelector('.gate0-keyword-overlap-product-v1 small:last-child')?.textContent,
        choice: Boolean(source.querySelector('[data-gate0-keyword-owner-choice]')) }));
    indicator.querySelector('[data-gate0-keyword-overlap-source="product-c"]').click();
    const pending = indicator.querySelector('[data-gate0-keyword-owner-choice]:checked')?.value;
    const canApply = !indicator.querySelector('[data-gate0-keyword-owner-apply]').disabled;
    indicator.querySelector('[data-gate0-keyword-owner-cancel]').click();
    return { keyword, sources, pending, canApply, closed: !indicator.open,
      selected: guruV194Ui(state).selectedProductId,
      category: guruV194Ui(state).selectedCategoryId,
      unchanged: JSON.stringify(state.project.gate0ScopedValuesV194
        .filter(item => item.field === 'keyword_foundation')) === window.__keywordBeforeNavigation,
      noDecision: !state.project.keywordOwnershipV1 };
  })()`);
  assert.equal(display.selected, 'product-a');
  assert.equal(display.category, '__uncategorized__');
  assert.equal(display.unchanged, true);
  assert.equal(display.noDecision, true);
  assert.equal(display.keyword, 'Термос в чехле');
  assert.equal(display.pending, 'product-c');
  assert.equal(display.canApply, true);
  assert.equal(display.closed, true);
  assert.deepEqual(display.sources, [
    { id: 'product-a', type: 'current', productLabel: 'Продукт/Услуга',
      product: 'Термос', phrase: 'Проверяемый запрос', choice: true },
    { id: 'product-b', type: 'exact', productLabel: 'Продукт/Услуга',
      product: 'Оформление термосов', phrase: 'Точное совпадение: термос в чехле', choice: true },
    { id: 'product-c', type: 'meaning', productLabel: 'Продукт/Услуга',
      product: 'Подарочный набор', phrase: 'Возможное смысловое пересечение: термосы в чехлах', choice: true },
  ]);
  const weights = await evaluate(`(() => {
    const source = document.querySelector('[data-gate0-keyword-overlap-source]');
    const weight = selector => getComputedStyle(document.querySelector(selector)).fontWeight;
    return {
      indicator: weight('.gate0-keyword-overlap-v1 > summary'),
      keywordLabel: weight('.gate0-keyword-overlap-term-v1 small'),
      keyword: weight('.gate0-keyword-overlap-term-v1 strong'),
      productLabel: weight('.gate0-keyword-overlap-product-v1 small'),
      product: getComputedStyle(source.querySelector('.gate0-keyword-overlap-product-v1 span')).fontWeight,
    };
  })()`);
  assert.deepEqual({ ...weights, keyword: undefined }, {
    indicator: '400', keywordLabel: '400', keyword: undefined,
    productLabel: '400', product: '400',
  });
  assert(Number(weights.keyword) > 400, 'only the keyword should be bold');
  if (process.env.GURU_OVERLAP_SCREENSHOT) {
    await evaluate(`(async () => {
      const indicator = document.querySelector('[data-gate0-keyword-overlap]');
      indicator.open = true;
      indicator.scrollIntoView({ block: 'center' });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    })()`);
    const screenshot = await page.call('Page.captureScreenshot', { format: 'png' });
    writeFileSync(process.env.GURU_OVERLAP_SCREENSHOT, Buffer.from(screenshot.data, 'base64'));
  }
  const selectedForEditing = await evaluate(`(() => {
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = 'category-gifts'; ui.selectedProductId = 'product-c';
    guruV194RefreshGate0SelectedProductV1();
    return { selected: guruV194Ui(state).selectedProductId,
      phrase: [...document.querySelectorAll('[data-gate0-keyword-foundation-input]')]
        .find(item => item.value === 'термосы в чехлах')?.value || '' };
  })()`);
  assert.deepEqual(selectedForEditing, { selected: 'product-c', phrase: 'термосы в чехлах' });

  const edited = await evaluate(`(async () => {
    const input = [...document.querySelectorAll('[data-gate0-keyword-foundation-input]')]
      .find(item => item.value === 'термосы в чехлах');
    input.focus({ preventScroll: true });
    input.value = 'синий термос';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => requestAnimationFrame(() => resolve()));
    const record = guruV247KeywordFoundationRecord(guruV194Product('product-c', state), false, state);
    return { model: record.keywords[0].value, connected: input.isConnected,
      focused: document.activeElement === input,
      indicator: input.closest('[data-gate0-keyword-foundation-row]')
        ?.querySelector('[data-gate0-keyword-overlap]')?.textContent.trim() || '' };
  })()`);
  assert.deepEqual(edited, { model: 'синий термос', connected: true, focused: true, indicator: '' });

  const afterImport = await evaluate(`(() => {
    const product = guruV194Product('product-c', state);
    const parsed = guruV248ParseKeywordCsv('phrase\\nтекстильная ёлочка');
    guruV248FinalizeKeywordImport(product, parsed, 'add', 'test.csv');
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = '__uncategorized__'; ui.selectedProductId = 'product-a';
    guruV194RefreshGate0SelectedProductV1();
    return [...document.querySelectorAll('[data-gate0-keyword-foundation-row]')]
      .map(row => ({ phrase: row.querySelector('textarea')?.value,
        indicator: row.querySelector('[data-gate0-keyword-overlap] summary')?.textContent.trim() || '' }));
  })()`);
  assert.equal(afterImport[0].indicator, 'Точно 1');
  assert.equal(afterImport[1].indicator, 'Точно 1 · Похоже 1');

  const afterDelete = await evaluate(`(() => {
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = '__uncategorized__'; ui.selectedProductId = 'product-b';
    guruV194RefreshGate0SelectedProductV1();
    const exact = [...document.querySelectorAll('[data-gate0-keyword-foundation-row]')]
      .find(item => item.querySelector('textarea')?.value === 'термос в чехле');
    exact.querySelector('[data-gate0-keyword-foundation-remove]').click();
    ui.selectedProductId = 'product-a';
    guruV194RefreshGate0SelectedProductV1();
    const row = [...document.querySelectorAll('[data-gate0-keyword-foundation-row]')]
      .find(item => item.querySelector('textarea')?.value === 'Термос в чехле');
    return { indicator: row.querySelector('[data-gate0-keyword-overlap]')?.textContent.trim() || '',
      statuses: guruV247KeywordFoundationRecord(guruV194Product('product-b', state), false, state)
        .keywords.map(item => item.status) };
  })()`);
  assert.deepEqual(afterDelete, { indicator: '', statuses: ['draft'] });

  const afterAdd = await evaluate(`(async () => {
    const ui = guruV194Ui(state); ui.selectedProductId = 'product-b';
    guruV194RefreshGate0SelectedProductV1();
    document.querySelector('[data-gate0-keyword-foundation-add]').click();
    const inputs = [...document.querySelectorAll('[data-gate0-keyword-foundation-input]')];
    const input = inputs.at(-1);
    input.value = 'уникальный запрос';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => requestAnimationFrame(resolve));
    ui.selectedProductId = 'product-a';
    guruV194RefreshGate0SelectedProductV1();
    const row = [...document.querySelectorAll('[data-gate0-keyword-foundation-row]')]
      .find(item => item.querySelector('textarea')?.value === 'уникальный запрос');
    return { indicator: row.querySelector('[data-gate0-keyword-overlap] summary')?.textContent.trim(),
      addedStatus: guruV247KeywordFoundationRecord(guruV194Product('product-b', state), false, state)
        .keywords.at(-1).status };
  })()`);
  assert.deepEqual(afterAdd, { indicator: 'Точно 1', addedStatus: 'confirmed' });

  const imported = await evaluate(`(() => {
    const record = guruV247KeywordFoundationRecord(guruV194Product('product-c', state), false, state);
    const entry = record.keywords.find(item => guruV247KeywordNormalize(item.value) ===
      guruV247KeywordNormalize('текстильная ёлочка'));
    return { source: entry.source, status: entry.status };
  })()`);
  assert.deepEqual(imported, { source: 'imported', status: 'draft' });
  const confirmed = await evaluate(`(async () => {
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = 'category-gifts'; ui.selectedProductId = 'product-c';
    guruV194RefreshGate0SelectedProductV1();
    const row = [...document.querySelectorAll('[data-gate0-keyword-foundation-row]')]
      .find(item => guruV247KeywordNormalize(item.querySelector('textarea')?.value) ===
        guruV247KeywordNormalize('текстильная ёлочка'));
    row.querySelector('[data-gate0-keyword-foundation-confirm]').click();
    const entry = guruV247KeywordFoundationRecord(guruV194Product('product-c', state), false, state)
      .keywords.find(item => guruV247KeywordNormalize(item.value) ===
        guruV247KeywordNormalize('текстильная ёлочка'));
    const immediate = { label: row.querySelector('.gate0-keyword-status-v247')?.textContent,
      buttonRemoved: !row.querySelector('[data-gate0-keyword-foundation-confirm]') };
    const saved = await guruQueueWorkspaceSave({ quiet: true, durable: true });
    const key = WORKSPACE_STORAGE_PREFIX + activeProjectId;
    const stored = localStorage.getItem(WORKSPACE_IDB_MARKER_PREFIX + activeProjectId)
      ? (await guruWorkspaceIdbReadV1(activeProjectId))?.serialized
      : localStorage.getItem(key);
    const persisted = stored && JSON.parse(stored).project.gate0ScopedValuesV194
      .find(item => item.field === 'keyword_foundation' && item.product_id === 'product-c')
      ?.keywords.find(item => guruV247KeywordNormalize(item.value) ===
        guruV247KeywordNormalize('текстильная ёлочка'));
    await new Promise(resolve => setTimeout(resolve, 220));
    const shell = document.querySelector('[data-guru-product-context="product_segment_client_task"]');
    const select = shell?.querySelector('[data-gate0-scope-product-select]');
    const counters = Object.fromEntries(['all', 'ready', 'missing'].map(key => [key,
      Number(shell?.querySelector('[data-guru-product-filter-v1="' + key + '"] span')?.textContent)]));
    const readiness = guruV194ProductReadinessMapV1(state);
    const products = guruV194Products(state).filter(product =>
      megaPlatformProductCategoryIds(product).includes('category-gifts'));
    return { source: entry.source, status: entry.status, immediate, saved,
      persistedStatus: persisted?.status, persistedSource: persisted?.source,
      selectedProduct: select?.value, counters,
      expectedCounters: { all: products.length,
        ready: products.filter(product => readiness.get(product.id) === 'ready').length,
        missing: products.filter(product => readiness.get(product.id) !== 'ready').length } };
  })()`);
  assert.equal(confirmed.source, 'imported');
  assert.equal(confirmed.status, 'confirmed');
  assert.deepEqual(confirmed.immediate, { label: 'Подтверждено', buttonRemoved: true });
  assert.equal(confirmed.saved, true);
  assert.equal(confirmed.persistedStatus, 'confirmed');
  assert.equal(confirmed.persistedSource, 'imported');
  assert.equal(confirmed.selectedProduct, 'product-c');
  assert.deepEqual(confirmed.counters, confirmed.expectedCounters);
  const ownership = await evaluate(`(async () => {
    const meta = projects[0];
    state = createFreshWorkspace(meta);
    state.project.catalogItemsV189 = [
      { id: 'product-a', name: 'Термос', continuum: 'product' },
      { id: 'product-b', name: 'Оформление термосов', continuum: 'pure_service' },
      { id: 'product-c', name: 'Подарочный набор', continuum: 'product' },
    ];
    const entries = {
      'product-a': [{ value: 'Термос в чехле', source: 'manual', status: 'confirmed' }],
      'product-b': [{ value: 'термос в чехле', source: 'imported', status: 'confirmed' }],
      'product-c': [{ value: 'термосы в чехлах', source: 'manual', status: 'draft' }],
    };
    for (const product of state.project.catalogItemsV189)
      guruV247KeywordFoundationRecord(product, true, state).keywords = entries[product.id]
        .map(entry => guruV247KeywordEntry(entry));
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = '__uncategorized__'; ui.selectedProductId = 'product-a';
    const card = state.gates.find(gate => gate.id === 'gate-0').cards
      .find(item => v116PassportDef(item)?.key === 'product_segment_client_task');
    state._gate0Open ||= {}; state._gate0Open[card.id] = true;
    activeView = 'gate'; activeGateId = 'gate-0'; renderGate();
    const confirmedBefore = Object.fromEntries(state.project.catalogItemsV189.map(product =>
      [product.id, guruGate1FinalConfirmedV259(product, state).map(entry => entry.value)]));
    const row = [...document.querySelectorAll('[data-gate0-keyword-foundation-row]')]
      .find(item => item.querySelector('textarea')?.value === 'Термос в чехле');
    const popover = row.querySelector('[data-gate0-keyword-overlap]');
    popover.open = true;
    popover.querySelector('[data-gate0-keyword-overlap-source="product-c"]').click();
    const unchangedBeforeApply = !state.project.keywordOwnershipV1 &&
      !guruV247KeywordFoundationRecord(guruV194Product('product-c', state), false, state)
        .keywords.some(entry => guruV247KeywordNormalize(entry.value) ===
          guruV247KeywordNormalize('Термос в чехле'));
    popover.querySelector('[data-gate0-keyword-owner-apply]').click();
    const key = guruV247KeywordNormalize('Термос в чехле');
    const raw = Object.fromEntries(state.project.catalogItemsV189.map(product => [product.id,
      guruV247KeywordFoundationRecord(product, false, state).keywords
        .map(entry => ({ value: entry.value, status: entry.status, source: entry.source }))]));
    const confirmedAfter = Object.fromEntries(state.project.catalogItemsV189.map(product =>
      [product.id, guruGate1FinalConfirmedV259(product, state).map(entry => entry.value)]));
    await new Promise(resolve => setTimeout(resolve, 900));
    const saved = await guruQueueWorkspaceSave({ quiet: true, durable: true });
    const stored = localStorage.getItem(WORKSPACE_IDB_MARKER_PREFIX + activeProjectId)
      ? (await guruWorkspaceIdbReadV1(activeProjectId))?.serialized
      : localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId);
    return { confirmedBefore, unchangedBeforeApply, owner: state.project.keywordOwnershipV1?.[key]?.product_id,
      raw, confirmedAfter, saved, storedOwner: stored && JSON.parse(stored).project.keywordOwnershipV1?.[key]?.product_id,
      selected: guruV194Ui(state).selectedProductId,
      oldStatus: [...document.querySelectorAll('[data-gate0-keyword-foundation-row]')]
        .find(item => item.querySelector('textarea')?.value === 'Термос в чехле')
        ?.querySelector('.gate0-keyword-status-v247')?.textContent };
  })()`);
  assert.deepEqual(ownership.confirmedBefore, {
    'product-a': ['Термос в чехле'], 'product-b': ['термос в чехле'], 'product-c': [],
  });
  assert.equal(ownership.unchangedBeforeApply, true);
  assert.equal(ownership.owner, 'product-c');
  assert.equal(ownership.saved, true);
  assert.equal(ownership.storedOwner, 'product-c');
  assert.equal(ownership.selected, 'product-a');
  assert.equal(ownership.oldStatus, 'За другим продуктом');
  assert.deepEqual(ownership.confirmedAfter, {
    'product-a': [], 'product-b': [], 'product-c': ['Термос в чехле'],
  });
  assert.deepEqual(ownership.raw, {
    'product-a': [{ value: 'Термос в чехле', status: 'confirmed', source: 'manual' }],
    'product-b': [{ value: 'термос в чехле', status: 'confirmed', source: 'imported' }],
    'product-c': [
      { value: 'термосы в чехлах', status: 'draft', source: 'manual' },
      { value: 'Термос в чехле', status: 'confirmed', source: 'manual' },
    ],
  });
  const serviceOwner = await evaluate(`(() => {
    const row = [...document.querySelectorAll('[data-gate0-keyword-foundation-row]')]
      .find(item => item.querySelector('textarea')?.value === 'Термос в чехле');
    const popover = row.querySelector('[data-gate0-keyword-overlap]');
    popover.open = true;
    popover.querySelector('[data-gate0-keyword-overlap-source="product-b"]').click();
    popover.querySelector('[data-gate0-keyword-owner-apply]').click();
    return { owner: guruKeywordOwnershipOwnerV1('Термос в чехле', state),
      confirmed: guruGate1FinalConfirmedV259(guruV194Product('product-b', state), state)
        .map(entry => entry.value),
      preservedTargetCopy: guruV247KeywordFoundationRecord(
        guruV194Product('product-c', state), false, state).keywords.length };
  })()`);
  assert.deepEqual(serviceOwner, { owner: 'product-b', confirmed: ['термос в чехле'],
    preservedTargetCopy: 2 });
  const reassigned = await evaluate(`(() => {
    const key = guruV247KeywordNormalize('Термос в чехле');
    const row = [...document.querySelectorAll('[data-gate0-keyword-foundation-row]')]
      .find(item => item.querySelector('textarea')?.value === 'Термос в чехле');
    const popover = row.querySelector('[data-gate0-keyword-overlap]');
    popover.open = true;
    popover.querySelector('[data-gate0-keyword-overlap-source="product-a"]').click();
    popover.querySelector('[data-gate0-keyword-owner-apply]').click();
    const owner = guruKeywordOwnershipOwnerV1('Термос в чехле', state);
    const preservedCopy = guruV247KeywordFoundationRecord(guruV194Product('product-c', state), false, state)
      .keywords.some(entry => guruV247KeywordNormalize(entry.value) === key);
    const active = Object.fromEntries(state.project.catalogItemsV189.map(product => [product.id,
      guruGate1FinalConfirmedV259(product, state).map(entry => entry.value)]));
    const record = guruV247KeywordFoundationRecord(guruV194Product('product-a', state), false, state);
    record.keywords = record.keywords.filter(entry => guruV247KeywordNormalize(entry.value) !== key);
    record.updated_at = new Date().toISOString();
    const ownerAfterRemoval = guruKeywordOwnershipOwnerV1('Термос в чехле', state);
    const restoredSource = guruGate1FinalConfirmedV259(guruV194Product('product-b', state), state)
      .some(entry => guruV247KeywordNormalize(entry.value) === key);
    return { owner, preservedCopy, active, ownerAfterRemoval, restoredSource,
      recordedDecision: state.project.keywordOwnershipV1[key].product_id };
  })()`);
  assert.equal(reassigned.owner, 'product-a');
  assert.equal(reassigned.preservedCopy, true);
  assert.deepEqual(reassigned.active, {
    'product-a': ['Термос в чехле'], 'product-b': [], 'product-c': [],
  });
  assert.equal(reassigned.ownerAfterRemoval, '');
  assert.equal(reassigned.restoredSource, true);
  assert.equal(reassigned.recordedDecision, 'product-a');
  console.log('Product keyword overlap: labels and hierarchy, no navigation, matching and editing workflows OK');
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  page.close(); browser.close();
}
