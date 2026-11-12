import assert from 'node:assert/strict';

const port = Number(process.env.GURU_CHROME_DEBUG_PORT || 49337);
const appPort = Number(process.env.GURU_APP_PORT || 41323);
async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  let id = 0;
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
      const key = ++id;
      pending.set(key, { resolve, reject });
      socket.send(JSON.stringify({ id: key, method, params }));
    }) };
}
const info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = await connect(info.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = pages.find((entry) => entry.id === targetId);
if (!page) throw new Error('Chrome page not found');
const connection = await connect(page.webSocketDebuggerUrl);
const { call } = connection;
const evaluate = async (expression) => {
  const response = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
};

try {
  await call('Page.enable');
  await call('Runtime.enable');
  await call('Page.navigate', { url: `http://127.0.0.1:${appPort}/` });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate('document.readyState === "complete" && typeof g2s4Units === "function" && typeof g8ProductStatusV4 === "function"')) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const result = await evaluate(`(async () => {
    state = createFreshWorkspace({ id: 'gate-selector-smoke', name: 'Gate selector smoke' });
    activeProjectId = state.project.id;
    state.project.catalogItemsV189 = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
      .map((letter) => ({ id: 'selector-' + letter, name: 'Продукт ' + letter.toUpperCase() }));
    const card = state.gates.find((gate) => gate.id === 'gate-0').cards.find(isMegaMarketingCard);
    card.megaMarketing.channels = [{ channel: 'Поиск', platform: 'Яндекс', type: 'Поиск', status: 'works' }];
    card.megaMarketing.platformV2.urlsV1 ||= { fixed: {}, categories: {}, products: {}, custom: {} };
    card.megaMarketing.platformV2.urlsV1.products['selector-a'] = 'https://example.test/a';
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = '__uncategorized__';
    ui.selectedProductId = 'selector-a';
    const channels = g4CampaignWritableChannelsV301(g4LaunchChannels());
    state.gate4Production ||= {};
    state.gate4Production.campaigns ||= {};
    for (const channel of channels) state.gate4Production.campaigns[g4CampaignStateKey('selector-a', channel.key)] =
      { product: 'selector-a', launchStatus: 'launched', decision: 'launch' };
    const keys = ['product_segment_client_task', 'gate1-product-pages', 'gate2-product',
      'gate3-product-journey', 'gate4-launch', 'gate8-forecast'];
    const gates = {};
    guruV194Ensure(state);
    const stateBeforeRead = JSON.stringify(state);
    for (const key of keys) {
      const started = performance.now();
      const html = guruV194ProductSelectHtml(key, { compact: true, fastSelection: true });
      const holder = document.createElement('div');
      holder.innerHTML = html;
      const shell = holder.querySelector('[data-guru-product-context]');
      const count = (filter) => Number(shell.querySelector('[data-guru-product-filter-v1="' + filter + '"] span').textContent);
      gates[key] = { all: count('all'), ready: count('ready'), missing: count('missing'),
        category: shell.querySelector('[data-gate0-scope-category-select] option:checked')?.textContent,
        progress: shell.querySelector('.guru-product-context-progress-v1')?.textContent,
        ms: performance.now() - started,
        statuses: Object.fromEntries(guruV194ProductReadinessMapV1(state, guruV194ProductGateV1(key))),
      };
    }
    const sourceUnchanged = JSON.stringify(state) === stateBeforeRead;
    const holder = document.createElement('div');
    holder.innerHTML = guruV194ProductSelectHtml('gate4-launch', { compact: true, fastSelection: true });
    document.body.append(holder);
    const shell = holder.querySelector('[data-guru-product-context]');
    shell.querySelector('[data-guru-product-filter-v1="ready"]').click();
    const filtered = [...shell.querySelector('[data-gate0-scope-product-select]').options]
      .filter((option) => option.value).map((option) => option.value);
    const filterState = { gate4: ui.productFiltersByGateV1?.['gate-4'], gate0: ui.productFilterV1 || 'all' };
    const savedFilter = JSON.parse(localStorage.getItem(GURU_PRODUCT_SELECTION_STORAGE_PREFIX_V1 + activeProjectId))
      ?.productFiltersByGateV1?.['gate-4'];
    const select = shell.querySelector('[data-gate0-scope-product-select]');
    for (const channel of channels) state.gate4Production.campaigns[g4CampaignStateKey('selector-a', channel.key)].launchStatus = 'draft';
    guruV194ScheduleProductSelectorRefreshV1();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const updated = { ready: Number(shell.querySelector('[data-guru-product-filter-v1="ready"] span').textContent),
      missing: Number(shell.querySelector('[data-guru-product-filter-v1="missing"] span').textContent),
      visible: [...shell.querySelector('[data-gate0-scope-product-select]').options]
        .filter((option) => option.value).map((option) => option.value),
      sameSelect: shell.querySelector('[data-gate0-scope-product-select]') === select };
    shell.querySelector('[data-guru-product-filter-v1="missing"]').click();
    const missingFiltered = [...shell.querySelector('[data-gate0-scope-product-select]').options]
      .filter((option) => option.value).map((option) => option.value);
    const restoredWorkspace = structuredClone(state);
    restoredWorkspace.project.gate0ScopeUiV194 = {};
    guruV194RestoreProductSelectionV1(activeProjectId, restoredWorkspace);
    const restoredFilters = restoredWorkspace.project.gate0ScopeUiV194.productFiltersByGateV1;
    holder.remove();
    return { gates, filtered, filterState, savedFilter, sourceUnchanged,
      updated, missingFiltered, restoredFilters, channels: channels.length };
  })()`);
  for (const [key, value] of Object.entries(result.gates)) {
    assert.equal(value.all, 7, `${key}: total`);
    assert.equal(value.ready + value.missing, 7, `${key}: partition`);
    assert.deepEqual(Object.keys(value.statuses).sort(), ['selector-a', 'selector-b', 'selector-c', 'selector-d', 'selector-e', 'selector-f', 'selector-g']);
  }
  assert(result.channels > 0, 'Gate 4 channel fixture missing');
  assert.equal(result.gates['gate4-launch'].ready, 1, 'Gate 4 did not use campaign readiness');
  assert(result.gates['gate4-launch'].category?.includes('1/7 готово'), 'category count did not follow Gate 4');
  assert(result.gates['gate4-launch'].progress?.includes('Заполнено: 1'), 'category progress did not follow Gate 4');
  assert.equal(result.gates['product_segment_client_task'].ready, 0, 'Gate 0 unexpectedly reused Gate 4');
  assert.deepEqual(result.filtered, ['selector-a'], 'ready filter includes unfinished products');
  assert.equal(result.filterState.gate4, 'ready');
  assert.equal(result.filterState.gate0, 'all');
  assert.equal(result.savedFilter, 'ready', 'Gate-specific filter was not saved');
  assert(result.sourceUnchanged, 'readiness calculation changed project data');
  assert.equal(result.updated.ready, 0, 'status change did not update count');
  assert.equal(result.updated.missing, 7);
  assert(result.updated.sameSelect, 'refresh replaced the product selector');
  assert.deepEqual(result.updated.visible, [], 'filtered options were not updated');
  assert.equal(result.missingFiltered.length, 7, 'missing filter did not show unfinished products');
  assert.equal(result.restoredFilters['gate-4'], 'missing', 'Gate 4 filter was not restored');
  console.log(JSON.stringify(result, null, 2));
} finally {
  connection.close();
  await browser.call('Target.disposeBrowserContext', { browserContextId });
  browser.close();
}
