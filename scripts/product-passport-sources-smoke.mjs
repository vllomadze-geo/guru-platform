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
    if (await evaluate('document.readyState === "complete" && typeof pageStructureCardHtml === "function"')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(await evaluate('typeof pageStructureCardHtml'), 'function');
  const result = await evaluate(`(async () => {
    const meta = { id: 'passport-sources-smoke', name: 'Проверка паспорта', lifecycleStatus: 'active' };
    activeProjectId = meta.id;
    state = createFreshWorkspace(meta);
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    state.project.productRegistryV185 = [{ id: 'category-a', name: 'Подарки', manualOriginV2: true }];
    state.project.catalogItemsV189 = [{ id: 'product-a', name: 'Шапка Коза', continuum: 'pure_product' }];
    const product = guruV194Product('product-a', state);
    megaPlatformCategoryStore(state).categoryIdsByProduct['product-a'] = ['category-a'];
    megaPlatformUrlStore(state).products['product-a'] = 'https://example.test/shapka-koza';
    const card = state.gates.find(gate => gate.id === 'gate-1').cards.find(item => item.id === 'card-24');
    const row = card.pageRows[0] || createPageStructureRow('Шапка Коза', false);
    row.catalogItemIdV189 = product.id;
    row.name = product.name;
    row.h1 = product.name;
    card.pageRows = [row];
    const keywordRecord = guruV247KeywordFoundationRecord(product, true, state);
    keywordRecord.keywords = [{ id: 'keyword-a', value: 'авторская шапка', source: 'manual', status: 'confirmed' }];
    const descriptionRecord = guruProductDescriptionRecordV1(product, true, state);
    descriptionRecord.value = 'Утверждённое описание продукта';
    descriptionRecord.confirmation_status = 'confirmed';
    const platformIntent = megaPlatformIntentRecordV1('products', product.id, state);
    platformIntent.searchIntentV1 = { primary: 'commercial', secondary: ['transactional'],
      confidence: 100, rationale: 'Ручной выбор', manualOverride: true };
    const render = (pageCard, pageRow) => {
      const host = document.createElement('template');
      host.innerHTML = pageStructureCardHtml(pageCard, pageRow, 0, true);
      return host.content;
    };
    const productPage = render(card, row);
    const navigationHost = document.createElement('div');
    navigationHost.dataset.card = card.id;
    navigationHost.append(productPage.cloneNode(true));
    document.body.append(navigationHost);
    const landingTarget = g3ProductJourneyLandingTarget(g3ProductJourneySnapshot(product));
    const landingNavigation = landingTarget.cardId === card.id &&
      g3ProductJourneyFindSource(landingTarget) === navigationHost;
    navigationHost.remove();
    const serviceCard = state.gates.find(gate => gate.id === 'gate-1').cards
      .find(item => item.id === 'card-23');
    const serviceRow = createPageStructureRow('Шапка Коза', false);
    serviceRow.catalogItemIdV189 = product.id;
    const servicePage = render(serviceCard, serviceRow);
    const duplicates = [productPage, servicePage].map(page => ({
      passport: page.querySelectorAll('.goat-product-passport-v517, .goat-product-passport-sources-v517').length,
      description: page.querySelectorAll('[data-product-description-source]').length,
      sourceWords: /Что это · из Платформы|Исходные ключевые слова · Gate 0 · продукт/.test(page.textContent),
      topBlock: Boolean(page.querySelector('.route-card-head, .route-top-grid')),
      sections: Boolean(page.querySelector('.route-sections')),
      status: Boolean(page.querySelector('.status-pill')),
    }));
    const displayedUrl = servicePage.querySelector('.route-top-grid .mega-platform-source-value')?.textContent;
    const strategic = guruStrategicFoundationModelV286(product);
    const strategicDescriptionTarget = strategic.fields.description.target;
    const strategicMarkup = document.createElement('template');
    strategicMarkup.innerHTML = guruStrategicFoundationHtmlV237(product);
    const descriptionJump = JSON.parse(strategicMarkup.content.querySelector(
      '[data-guru-strategic-step="description"] [data-g4-jump-target]')?.dataset.g4JumpTarget || '{}');
    platformIntent.searchIntentV1 = { primary: 'informational', secondary: [],
      confidence: 100, rationale: 'Изменено в Платформе', manualOverride: true };
    const updatedIntent = guruStrategicFoundationModelV286(product).fields.intent.value;
    keywordRecord.keywords.push({ id: 'keyword-b', value: 'тёплая шапка', source: 'manual', status: 'confirmed' });
    const stillNoDuplicate = !render(card, row).querySelector(
      '.goat-product-passport-v517, [data-product-description-source]');
    const savedValues = { description: descriptionRecord.value,
      keywords: keywordRecord.keywords.map(item => item.value),
      platformUrl: megaPlatformUrl('products', product.id, state),
      platformIntent: platformIntent.searchIntentV1.primary };
    return { duplicates, displayedUrl, landingNavigation,
      strategicName: strategic.fields.name.value,
      strategicIntent: strategic.fields.intent.value,
      strategicDescription: strategic.fields.description.value,
      strategicDescriptionTarget, descriptionJump,
      updatedIntent, stillNoDuplicate, savedValues };
  })()`);
  assert(result.duplicates.every(item => item.passport === 0 && item.description === 0 &&
    !item.sourceWords && item.sections && item.status));
  assert.equal(result.duplicates[0].topBlock, false);
  assert.equal(result.duplicates[1].topBlock, true);
  assert.equal(result.landingNavigation, true);
  assert.equal(result.displayedUrl, 'https://example.test/shapka-koza');
  assert.equal(result.strategicName, 'Шапка Коза');
  assert.equal(result.strategicIntent, 'Коммерческое');
  assert.equal(result.strategicDescription, 'Утверждённое описание продукта');
  assert.equal(result.strategicDescriptionTarget.field, 'product_description');
  assert.equal(result.descriptionJump.kind, 'gate0-scoped');
  assert.equal(result.descriptionJump.productId, 'product-a');
  assert.equal(result.updatedIntent, 'Информационное');
  assert.equal(result.stillNoDuplicate, true);
  assert.deepEqual(result.savedValues, { description: 'Утверждённое описание продукта',
    keywords: ['авторская шапка', 'тёплая шапка'],
    platformUrl: 'https://example.test/shapka-koza', platformIntent: 'informational' });
  console.log(JSON.stringify({ passed: true, ...result }));
} finally {
  page.close();
  await browser.call('Target.disposeBrowserContext', { browserContextId });
  browser.close();
}
