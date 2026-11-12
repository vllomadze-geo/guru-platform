import assert from 'node:assert/strict';

const port = process.env.GURU_CHROME_DEBUG_PORT || '38677';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:38676/';

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
      const task = this.pending.get(message.id);
      if (!task) return;
      this.pending.delete(message.id);
      message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
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
  const response = await page.call('Runtime.evaluate', {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (response.exceptionDetails)
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
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
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate('document.readyState === "complete" && typeof guruV194PlatformCategoryProductsV1 === "function"')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(await evaluate('typeof guruV194PlatformCategoryProductsV1'), 'function');
  const result = await evaluate(`(() => {
    const meta = { id: 'platform-selector-hierarchy-smoke', name: 'Проверка иерархии', lifecycleStatus: 'active' };
    activeProjectId = meta.id;
    state = createFreshWorkspace(meta);
    state.project.productRegistryV185 = [
      { id: 'cat-b', name: 'Категория Б', manualOriginV2: true },
      { id: 'cat-a', name: 'Категория А', manualOriginV2: true },
    ];
    state.project.catalogItemsV189 = [
      { id: 'p1', name: 'Первый', continuum: 'pure_product' },
      { id: 'p2', name: 'Второй', continuum: 'pure_product' },
      { id: 'p3', name: 'Третий', continuum: 'pure_product' },
      { id: 'p4', name: 'Четвёртый', continuum: 'pure_product' },
    ];
    const relations = megaPlatformCategoryStore(state);
    Object.assign(relations.categoryIdsByProduct, {
      p1: ['cat-a'], p2: ['cat-a', 'cat-b'], p3: ['cat-a'], p4: ['cat-b'],
    });
    relations.productOrderByCategory['cat-a'] = ['p3', 'p1', 'p2'];
    relations.productOrderByCategory['cat-b'] = ['p4', 'p2'];
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = 'cat-a';
    ui.selectedProductId = 'p1';
    ui.productFilterV1 = 'all';
    const host = document.createElement('div');
    host.innerHTML = guruV194ProductSelectHtml('product_segment_client_task', {
      compact: true, fastSelection: true,
    });
    document.body.append(host);
    const category = host.querySelector('[data-gate0-scope-category-select]');
    const product = host.querySelector('[data-gate0-scope-product-select]');
    const values = () => [...product.options].map(option => option.value).filter(Boolean);
    const categoryIds = [...category.options].map(option => option.value).filter(Boolean);
    const initial = values();
    const platform = document.createElement('template');
    platform.innerHTML = megaPlatformCommercialTable('card-7', megaPlatformAutoRows(state), [], []);
    const platformOrder = [...platform.content.querySelectorAll('[data-mega-platform-drop-category="cat-a"] [data-mega-platform-rename-product]')]
      .map(input => input.dataset.megaPlatformRenameProduct);
    const sharedSelectors = ['product_segment_client_task', 'gate1-product-pages',
      'gate2-product', 'gate3-product-journey', 'gate4-launch', 'gate8-forecast']
      .map(key => {
        const template = document.createElement('template');
        template.innerHTML = guruV194ProductSelectHtml(key, { compact: true, fastSelection: true });
        return [...template.content.querySelector('[data-gate0-scope-product-select]').options]
          .map(option => option.value).filter(Boolean);
      });
    const liveGate1 = document.createElement('template');
    liveGate1.innerHTML = guruV194ProductSelectHtml('gate1-product-pages', { compact: true, fastSelection: true });
    const liveGate1Readiness = guruV194ProductReadinessMapV1(state, 'gate-1');
    const liveGate1Matches = [...liveGate1.content.querySelector('[data-gate0-scope-product-select]').options]
      .filter(option => option.value)
      .every(option => option.textContent.endsWith(liveGate1Readiness.get(option.value) === 'ready'
        ? ' · ✓ Заполнен' : ' · Не заполнен'));
    const originalReadiness = guruV194ProductReadinessMapV1;
    let gate1Labels, gate0Labels, refreshedGate1Labels, sameGate1Node;
    const gate1Host = document.createElement('div');
    try {
      let statuses = new Map([['p1', 'ready'], ['p2', 'not_started'], ['p3', 'ready']]);
      guruV194ProductReadinessMapV1 = () => statuses;
      gate1Host.innerHTML = guruV194ProductSelectHtml('gate1-product-pages', { compact: true, fastSelection: true });
      document.body.append(gate1Host);
      const gate1Select = gate1Host.querySelector('[data-gate0-scope-product-select]');
      const optionLabels = select => [...select.options].filter(option => option.value)
        .map(option => option.textContent);
      gate1Labels = optionLabels(gate1Select);
      gate0Labels = optionLabels(product);
      statuses = new Map([['p1', 'ready'], ['p2', 'ready'], ['p3', 'ready']]);
      guruV194RefreshProductSelectorsV1(true);
      refreshedGate1Labels = optionLabels(gate1Select);
      sameGate1Node = gate1Host.querySelector('[data-gate0-scope-product-select]') === gate1Select;
    } finally {
      guruV194ProductReadinessMapV1 = originalReadiness;
      gate1Host.remove();
    }
    megaPlatformReorderProductInCategory('p2', 'cat-a', 'p3', 'before', state);
    guruV194RefreshProductSelectorsV1(true);
    const reordered = values();
    const sameNode = host.querySelector('[data-gate0-scope-product-select]') === product;
    const sameSelection = product.value === 'p1';
    state.project.productRegistryV185.reverse();
    guruV194RefreshProductSelectorsV1(true);
    const reorderedCategories = [...category.options].map(option => option.value).filter(Boolean);
    const sameCategoryNode = host.querySelector('[data-gate0-scope-category-select]') === category;
    ui.selectedCategoryId = 'cat-b';
    ui.selectedProductId = 'p4';
    guruV194RefreshProductSelectorsV1(true);
    const otherCategory = values();
    ui.productFilterV1 = 'missing';
    guruV194RefreshProductSelectorsV1(true);
    const filtered = values();
    const expectedFiltered = guruV194PlatformCategoryProductsV1('cat-b', guruV194Products(state))
      .filter(item => item.id === ui.selectedProductId ||
        guruV194ProductReadinessMapV1(state).get(item.id) !== 'ready')
      .map(item => item.id);
    const names = [...product.options].filter(option => option.value)
      .map(option => option.textContent);
    megaPlatformMoveProductCategory('p1', 'cat-a', 'cat-b', state);
    guruV194RefreshProductSelectorsV1(true);
    const moved = values();
    ui.selectedCategoryId = 'cat-a';
    ui.selectedProductId = 'unknown';
    const defaultAfterReorder = guruV194Ui(state).selectedProductId;
    host.remove();
    return { categoryIds, initial, platformOrder, reordered, otherCategory,
      filtered, expectedFiltered, names, sameNode, sameSelection,
      sharedSelectors, moved, defaultAfterReorder, reorderedCategories, sameCategoryNode,
      relationsUnchanged: relations.categoryIdsByProduct.p2.join(',') === 'cat-a,cat-b',
      gate1Labels, gate0Labels, refreshedGate1Labels, sameGate1Node, liveGate1Matches };
  })()`);
  assert.deepEqual(result.categoryIds, ['cat-b', 'cat-a']);
  assert.deepEqual(result.initial, ['p3', 'p1', 'p2']);
  assert.deepEqual(result.initial, result.platformOrder);
  result.sharedSelectors.forEach(options => assert.deepEqual(options, result.initial));
  assert.deepEqual(result.reordered, ['p2', 'p3', 'p1']);
  assert.deepEqual(result.reorderedCategories, ['cat-a', 'cat-b']);
  assert.deepEqual(result.otherCategory, ['p4', 'p2']);
  assert.deepEqual(result.moved, ['p4', 'p2', 'p1']);
  assert.equal(result.defaultAfterReorder, 'p2');
  assert.deepEqual(result.filtered, result.expectedFiltered);
  assert.equal(new Set(result.otherCategory).size, result.otherCategory.length);
  assert.equal(result.sameNode, true);
  assert.equal(result.sameCategoryNode, true);
  assert.equal(result.sameSelection, true);
  assert.equal(result.relationsUnchanged, true);
  assert.deepEqual(result.gate1Labels, ['Третий · ✓ Заполнен', 'Первый · ✓ Заполнен', 'Второй · Не заполнен']);
  assert.deepEqual(result.gate0Labels, ['Третий', 'Первый', 'Второй']);
  assert.deepEqual(result.refreshedGate1Labels, ['Третий · ✓ Заполнен', 'Первый · ✓ Заполнен', 'Второй · ✓ Заполнен']);
  assert.equal(result.sameGate1Node, true);
  assert.equal(result.liveGate1Matches, true);
  console.log(JSON.stringify({ passed: true, ...result }));
} finally {
  page.close();
  await browser.call('Target.disposeBrowserContext', { browserContextId });
  browser.close();
}
