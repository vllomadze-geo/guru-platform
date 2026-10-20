import assert from 'node:assert/strict';

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || '9353';
const appPort = process.env.GURU_APP_PORT || '3188';
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = targets.find((entry) => entry.type === 'page' && entry.url === 'about:blank') ||
  targets.find((entry) => entry.type === 'page');
assert(page?.webSocketDebuggerUrl);
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  const waiting = pending.get(message.id);
  if (!waiting) return;
  pending.delete(message.id);
  if (message.error) waiting.reject(new Error(message.error.message));
  else waiting.resolve(message.result);
});
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

try {
  await call('Runtime.enable');
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes('/api/')
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, projects: [], workspaces: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }))
      : nativeFetch(input, init);
  }` });
  await call('Page.navigate', { url: `http://127.0.0.1:${appPort}/` });
  await new Promise((resolve) => setTimeout(resolve, 1300));
  const result = await evaluate(`(async () => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    const project = { id: 'offer-foundation-source-' + Date.now(), name: 'Offer source smoke',
      lifecycleStatus: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    state = createFreshWorkspace(project); activeProjectId = project.id;
    state.project.productRegistryV185 = [{ id: 'category-shoes', name: 'Химчистка обуви', legacyNames: [] }];
    state.project.catalogItemsV189 = [{ id: 'product-sneakers', name: 'Кроссовки',
      categoryId: 'category-shoes', continuum: 'pure_service' }];
    megaPlatformCategoryStore(state).categoryIdsByProduct['product-sneakers'] = ['category-shoes'];
    state.project.whatSell = 'Химчистка обуви';
    state.project._gate0ProductIdMigrationLog = [
      { id: GURU_GATE0_PRODUCT_SCOPE_MIGRATION_V194, status: 'test' },
      { id: GURU_GATE0_OFFER_CTA_MIGRATION_V197, status: 'test' },
    ];
    const record = (id, scope, value, cta) => ({ id, project_id: project.id,
      category_id: scope === 'category' ? 'category-shoes' : '',
      product_id: scope === 'product' ? 'product-sneakers' : '',
      scope, field: 'offers', value,
      offer: { rational: '', irrational: '', social: '', cta },
      source: { type: 'manual', label: 'Smoke' }, confirmation_status: 'draft',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    state.project.gate0ScopedValuesV194 = [record('category-offer', 'category', '', '')];
    state.project.gate0ScopeUiV194 = { selectedCategoryId: 'category-shoes',
      selectedProductId: 'product-sneakers', scopeByProductField: {},
      commonMetaByProduct: { 'product-sneakers': { scope: 'category', source: 'Smoke', confirmation_status: 'draft' } } };
    state.painV130 = { productMaps: [{ product: 'Химчистка обуви', finalOffer: 'Старый оффер из карты' }] };
    state.project.primaryTargetAction = 'Старый CTA проекта';
    const product = guruV194Product('product-sneakers', state);
    const legacy = g3ProductJourneySnapshot(product);
    const empty = guruStrategicFoundationModelV286(product).fields.offer;
    const emptyEditor = guruV194FieldHtml('offers', product);
    const rows = guruV194Records(state);
    rows.find((entry) => entry.id === 'category-offer').value = 'Оффер категории';
    rows.find((entry) => entry.id === 'category-offer').offer.cta = 'CTA категории';
    const category = guruStrategicFoundationModelV286(product).fields.offer;
    guruV194Records(state).push(record('product-offer', 'product', 'Оффер продукта', 'CTA продукта'));
    const productOffer = guruStrategicFoundationModelV286(product).fields.offer;
    state.project.catalogItemsV189.push({ id: 'product-boots', name: 'Ботинки',
      categoryId: 'category-shoes', continuum: 'pure_service' });
    megaPlatformCategoryStore(state).categoryIdsByProduct['product-boots'] = ['category-shoes'];
    const otherProduct = guruV194Product('product-boots', state);
    const otherProductCtas = guruStrategicFoundationModelV286(otherProduct).fields.offer.ctas
      .map(({ value }) => value);
    const activeRecord = guruV194Records(state).find((entry) => entry.id === 'product-offer');
    const originalOffer = structuredClone(activeRecord.offer);
    activeRecord.offer.ctaV2 = { primary: 'Оформить заказ', secondary: 'Посмотреть подробнее', alternative: 'Задать вопрос' };
    const threeCtas = guruStrategicFoundationModelV286(product).fields.offer.ctas
      .map(({ key, value }) => [key, value]);
    const threeView = new DOMParser().parseFromString(guruStrategicFoundationHtmlV237(product), 'text/html');
    const renderedCtas = [...threeView.querySelectorAll('.guru-strategic-row-v286 [data-guru-strategic-cta-v286]')]
      .map((node) => node.dataset.guruStrategicCtaV286);
    const assignedCtas = guruStrategicAssignedOfferV286({ entry: { offer_record_id: activeRecord.id } },
      g3ProductJourneySnapshot(product)).ctas.map(({ key }) => key);
    activeRecord.offer.ctaV2 = { primary: '', secondary: 'Посмотреть подробнее', alternative: '' };
    const secondaryView = new DOMParser().parseFromString(guruStrategicFoundationHtmlV237(product), 'text/html');
    const secondaryCtas = [...secondaryView.querySelectorAll('.guru-strategic-row-v286 [data-guru-strategic-cta-v286]')]
      .map((node) => node.dataset.guruStrategicCtaV286);
    const secondaryStatus = secondaryView.querySelector('.guru-strategic-row-v286:has([data-guru-strategic-cta-v286])')
      ?.classList.contains('is-partial');
    activeRecord.offer.ctaV2 = { primary: '', secondary: '', alternative: '' };
    const emptyView = new DOMParser().parseFromString(guruStrategicFoundationHtmlV237(product), 'text/html');
    const noEmptyCtas = emptyView.querySelectorAll('[data-guru-strategic-cta-v286]').length === 0 &&
      !emptyView.body.textContent.includes('CTA не заполнен в источнике');
    activeRecord.offer = originalOffer;
    const editor = guruV194FieldHtml('offers', product);
    const host = document.createElement('main');
    host.innerHTML = editor;
    document.body.replaceChildren(host);
    host.insertAdjacentHTML('beforeend', guruStrategicFoundationHtmlV237(product));
    const source = host.querySelector('.gate0-active-source-v528');
    const active = source?.querySelector('[data-gate0-scope-record="product-offer"][data-gate0-scope-record-field="offer_unified"]');
    const selected = host.querySelector(':scope .gate0-scope-field-v194 > .gate0-scope-values-v194 [data-gate0-scope-record="category-offer"][data-gate0-scope-record-field="offer_unified"]');
    if (active) {
      active.value = 'Оффер продукта обновлён';
      active.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const secondaryInput = host.querySelector('[data-gate0-scope-record="product-offer"][data-gate0-scope-record-field="offer_cta_secondary"]');
    secondaryInput.value = 'Смотреть варианты';
    secondaryInput.dispatchEvent(new Event('input', { bubbles: true }));
    const liveSecondary = host.querySelector('[data-guru-strategic-foundation] [data-guru-strategic-cta-v286="secondary"]')
      ?.textContent.includes('Смотреть варианты');
    const edited = guruStrategicFoundationModelV286(product).fields.offer;
    const editedActiveRecord = guruV194Records(state).find((entry) => entry.id === 'product-offer');
    editedActiveRecord.value = '';
    editedActiveRecord.offer.cta = '';
    if (editedActiveRecord.offer.ctaV2) editedActiveRecord.offer.ctaV2.primary = '';
    if (editedActiveRecord.offer.ctaV2) editedActiveRecord.offer.ctaV2.secondary = '';
    const blankOverride = guruStrategicFoundationModelV286(product).fields.offer;
    guruV194Records(state).push(record('product-complete', 'product', 'Другой полный оффер', 'Другой CTA'));
    const complete = guruStrategicFoundationModelV286(product).fields.offer;
    host.querySelector('[data-gate0-scope-add="offers"]').click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const chosenRows = [...host.querySelectorAll(':scope .gate0-scope-field-v194 > .gate0-scope-values-v194 > .gate0-scope-value-v194')];
    const focusedChosenRow = chosenRows.at(-1)?.contains(document.activeElement);
    return {
      legacyOffer: legacy.offer, legacyCta: legacy.cta,
      emptyOffer: empty.value, emptyCta: empty.cta, emptySource: empty.source,
      emptyEditorHasRecord: emptyEditor.includes('data-gate0-scope-record="category-offer"'),
      categoryOffer: category.value, categoryCta: category.cta, categoryTarget: category.target?.recordId,
      productOffer: productOffer.value, productCta: productOffer.cta, productTarget: productOffer.target?.recordId,
      threeCtas, renderedCtas, assignedCtas, secondaryCtas, secondaryStatus, noEmptyCtas, liveSecondary,
      otherProductCtas,
      activeSourceVisible: Boolean(source && active && selected),
      activeSourceLabel: source?.querySelector('strong')?.textContent,
      resolvedScope: guruV194Resolve('offers', product, state).scope,
      selectedScope: guruV194CommonMeta(product, state).scope,
      renderedRecordIds: [...host.querySelectorAll('[data-gate0-scope-record-row]')].map((node) => node.dataset.gate0ScopeRecordRow),
      editedOffer: edited.value, editedCta: edited.cta,
      blankOverrideOffer: blankOverride.value, blankOverrideCta: blankOverride.cta,
      completeOffer: complete.value, completeCta: complete.cta, completeTarget: complete.target?.recordId,
      focusedChosenRow,
      legacyPreserved: state.painV130.productMaps[0].finalOffer === 'Старый оффер из карты',
    };
  })()`);
  console.log(JSON.stringify(result, null, 2));
  assert.equal(result.legacyOffer, 'Старый оффер из карты');
  assert.equal(result.legacyCta, 'Старый CTA проекта');
  assert.equal(result.emptyOffer, '');
  assert.equal(result.emptyCta, '');
  assert.equal(result.emptySource, 'Gate 0 · категория');
  assert(result.emptyEditorHasRecord);
  assert.deepEqual([result.categoryOffer, result.categoryCta, result.categoryTarget],
    ['Оффер категории', 'CTA категории', 'category-offer']);
  assert.deepEqual([result.productOffer, result.productCta, result.productTarget],
    ['Оффер продукта', 'CTA продукта', 'product-offer']);
  assert.deepEqual(result.threeCtas, [
    ['primary', 'Оформить заказ'], ['secondary', 'Посмотреть подробнее'], ['alternative', 'Задать вопрос'],
  ]);
  assert.deepEqual(result.renderedCtas, ['primary', 'secondary', 'alternative']);
  assert.deepEqual(result.assignedCtas, ['primary', 'secondary', 'alternative']);
  assert.deepEqual(result.otherProductCtas, ['CTA категории']);
  assert.deepEqual(result.secondaryCtas, ['secondary']);
  assert(result.secondaryStatus && result.noEmptyCtas && result.liveSecondary);
  assert(result.activeSourceVisible && result.activeSourceLabel?.includes('Только этот продукт'));
  assert.deepEqual([result.editedOffer, result.editedCta], ['Оффер продукта обновлён', 'CTA продукта']);
  assert.deepEqual([result.blankOverrideOffer, result.blankOverrideCta], ['', '']);
  assert.deepEqual([result.completeOffer, result.completeCta, result.completeTarget],
    ['Другой полный оффер', 'Другой CTA', 'product-complete']);
  assert(result.focusedChosenRow);
  assert(result.legacyPreserved);
} finally {
  socket.close();
}
