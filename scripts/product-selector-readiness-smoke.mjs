import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sourcePath = process.env.GURU_TEXT_WORKSPACE;
if (!sourcePath) throw new Error('GURU_TEXT_WORKSPACE must point to a workspace fixture');
const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
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
  await page.call('Page.navigate', { url: appUrl });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate('document.readyState === "complete" && typeof guruV194ProductReadinessMapV1 === "function"')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(await evaluate('typeof guruV194ProductReadinessMapV1'), 'function');
  const result = await evaluate(`(async () => {
    const id = 'product-selector-readiness-smoke';
    projects = [{ id, name: 'Проверка селектора', lifecycleStatus: 'active' }];
    activeProjectId = id;
    state = migrateWorkspace(${JSON.stringify(source)}, id);
    state._gate0Open = { ...(state._gate0Open || {}), 'card-2': true };
    els.launcher.hidden = true;
    els.appShell.hidden = false;
    activeView = 'gate';
    activeGateId = 'gate-0';
    const readiness = guruV194ProductReadinessMapV1(state);
    const categories = guruV185Registry(state);
    const category = categories.map(entry => ({ id: entry.id,
      products: guruV194Products(state).filter(product => megaPlatformProductCategoryIds(product).includes(entry.id)) }))
      .find(entry => entry.products.length >= 2 && entry.products.some(product => readiness.get(product.id) === 'ready'));
    if (!category) throw new Error('fixture needs a category with ready and other products');
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = category.id;
    ui.selectedProductId = category.products[0].id;
    ui.productFilterV1 = 'all';
    renderGate();
    const shell = els.contentArea.querySelector('[data-guru-product-context="product_segment_client_task"]');
    if (!shell) throw new Error('product selector did not render');
    const select = shell.querySelector('[data-gate0-scope-product-select]');
    const categorySelect = shell.querySelector('[data-gate0-scope-category-select]');
    const count = key => Number(shell.querySelector('[data-guru-product-filter-v1="' + key + '"] span').textContent);
    const expected = () => {
      const statuses = guruV194ProductReadinessMapV1(state);
      const products = guruV194Products(state).filter(product => megaPlatformProductCategoryIds(product).includes(category.id));
      return { all: products.length, ready: products.filter(product => statuses.get(product.id) === 'ready').length,
        missing: products.filter(product => statuses.get(product.id) !== 'ready').length,
        statuses: Object.fromEntries(products.map(product => [product.id, statuses.get(product.id)])) };
    };
    const actual = () => ({ all: count('all'), ready: count('ready'), missing: count('missing'),
      options: [...select.options].filter(option => option.value).map(option => ({ id: option.value,
        marked: option.textContent.includes('✓ Заполнен') })) });
    const first = expected();
    const initial = actual();
    const readyProduct = category.products.find(product => first.statuses[product.id] === 'ready');
    const originalOption = [...select.options].find(option => option.value === readyProduct.id);
    const records = guruV194Resolve('jtbd', readyProduct, state).records;
    if (!records.length) throw new Error('ready product has no JTBD');
    const record = records[0];
    const previousValue = record.value;
    const previousJtbd = record.jtbd && structuredClone(record.jtbd);
    record.value = '';
    if (record.jtbd) record.jtbd = { situation: '', desired_action: '', result: '' };
    flashSaving();
    await new Promise(resolve => setTimeout(resolve, 220));
    const changed = expected();
    const updated = actual();
    const selectedAfterEdit = select.value;
    const optionKept = [...select.options].find(option => option.value === readyProduct.id) === originalOption;
    const filters = {};
    for (const key of ['ready', 'missing', 'all']) {
      shell.querySelector('[data-guru-product-filter-v1="' + key + '"]').click();
      filters[key] = { selected: select.value,
        options: [...select.options].filter(option => option.value).map(option => option.value),
        count: count(key) };
    }
    record.value = previousValue;
    if (previousJtbd) record.jtbd = previousJtbd;
    flashSaving();
    await new Promise(resolve => setTimeout(resolve, 220));
    const restored = expected();
    const final = actual();
    record.value = '';
    if (record.jtbd) record.jtbd = { situation: '', desired_action: '', result: '' };
    guruV194RefreshGate0SelectedProductV1();
    const fastSelection = actual();
    record.value = previousValue;
    if (previousJtbd) record.jtbd = previousJtbd;
    guruV194RefreshGate0SelectedProductV1();
    const start = performance.now();
    select.value = readyProduct.id;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const switchMs = performance.now() - start;
    const selectionAfterSwitch = guruV194Ui(state).selectedProductId;
    const categoryIssues = [];
    let categoriesChecked = 0;
    for (const entry of [...categories, { id: '__uncategorized__' }]) {
      const members = guruV194Products(state).filter(product => entry.id === '__uncategorized__'
        ? !megaPlatformProductCategoryIds(product).length
        : megaPlatformProductCategoryIds(product).includes(entry.id));
      if (!members.length) continue;
      ui.selectedCategoryId = entry.id;
      ui.selectedProductId = members[0].id;
      ui.productFilterV1 = 'all';
      guruV194RefreshProductSelectorsV1(true);
      const statuses = guruV194ProductReadinessMapV1(state);
      const seen = [...select.options].filter(option => option.value);
      if (seen.length !== members.length || count('all') !== members.length ||
          count('ready') !== members.filter(product => statuses.get(product.id) === 'ready').length ||
          seen.some(option => option.textContent.includes('✓ Заполнен') !==
            (statuses.get(option.value) === 'ready')))
        categoryIssues.push(entry.id);
      categoriesChecked += 1;
    }
    ui.selectedCategoryId = category.id;
    ui.selectedProductId = selectionAfterSwitch;
    ui.productFilterV1 = 'all';
    guruV194RefreshProductSelectorsV1(true);
    return { first, initial, changed, updated, restored, final, fastSelection, filters,
      optionKept, switchMs, selected: guruV194Ui(state).selectedProductId,
      selectedAfterEdit, readyProductId: readyProduct.id,
      sameSelect: shell.querySelector('[data-gate0-scope-product-select]') === select,
      categoryIssues, categoriesChecked,
      categoryLabel: categorySelect.selectedOptions[0]?.textContent || '' };
  })()`);
  const equalCounts = (a, b) => {
    for (const key of ['all', 'ready', 'missing']) assert.equal(a[key], b[key], key);
  };
  equalCounts(result.first, result.initial);
  equalCounts(result.changed, result.updated);
  equalCounts(result.restored, result.final);
  equalCounts(result.changed, result.fastSelection);
  assert.notEqual(result.changed.ready, result.first.ready, 'editing required JTBD did not change readiness');
  assert.equal(result.restored.ready, result.first.ready, 'readiness did not recover after restoring data');
  for (const [id, status] of Object.entries(result.changed.statuses)) {
    const option = result.updated.options.find(entry => entry.id === id);
    assert.equal(option?.marked, status === 'ready', `wrong option marker for ${id}`);
  }
  for (const [key, matches] of [
    ['ready', status => status === 'ready'],
    ['missing', status => status !== 'ready'],
    ['all', () => true],
  ]) {
    const expectedIds = Object.entries(result.changed.statuses)
      .filter(([, status]) => matches(status)).map(([id]) => id).sort();
    assert.deepEqual([...result.filters[key].options].sort(), expectedIds, `${key} filter`);
    assert.equal(result.filters[key].count, expectedIds.length, `${key} counter`);
  }
  assert(result.optionKept, 'status update replaced an existing option');
  assert.equal(result.selectedAfterEdit, result.readyProductId, 'editing changed the selected product');
  assert.equal(result.updated.options.find(option => option.id === result.selectedAfterEdit)?.marked,
    false, 'the current product was mistaken for a ready product');
  assert(result.sameSelect, 'product switch replaced the selector');
  assert(result.categoriesChecked > 0 && result.categoryIssues.length === 0,
    `category counters or markers are wrong: ${result.categoryIssues.join(', ')}`);
  assert.equal(result.selected, result.filters.all.selected);
  assert.match(result.categoryLabel, new RegExp(`${result.final.ready}/${result.final.all} готово`));
  assert(result.switchMs < 250, `product switch took ${result.switchMs.toFixed(1)}ms`);
  console.log(`Selector readiness: ${result.first.ready}/${result.first.all} → ${result.changed.ready}/${result.changed.all} → ${result.restored.ready}/${result.restored.all}; ${result.categoriesChecked} categories; switch ${result.switchMs.toFixed(1)}ms`);
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  page.close();
  browser.close();
}
