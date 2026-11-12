const port = Number(process.env.GURU_CHROME_DEBUG_PORT || 9535);
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:9531/';
class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.seq = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      const task = this.pending.get(message.id);
      if (!task) return;
      this.pending.delete(message.id);
      message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.seq;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws.close(); }
}
const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(tabs.find((tab) => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async (expression) => {
  const result = await page.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
try {
  await page.call('Page.enable');
  await page.call('Runtime.enable');
  await page.call('Page.navigate', { url: appUrl });
  for (let i = 0; i < 100; i++) {
    if (await evaluate('document.readyState === "complete" && typeof guruGate0ProductBlockStatus === "function"')) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const result = await evaluate(`(async () => {
    state = createFreshWorkspace({ id: 'readiness-test', name: 'Readiness test' });
    activeProjectId = 'readiness-test';
    state.project.productRegistryV185 = [{ id: 'cat-test', name: 'Тестовая категория', manualOriginV2: 'test' }];
    state.project.catalogItemsV189 = [
      { id: 'product-a', name: 'Товар А', continuum: '' },
      { id: 'product-b', name: 'Услуга Б', continuum: '' },
    ];
    state.project.gate0ScopedValuesV194 = [];
    const relations = megaPlatformCategoryStore(state).categoryIdsByProduct;
    relations['product-a'] = ['cat-test'];
    relations['product-b'] = ['cat-test'];
    guruV194Ensure(state);
    const add = (productId, field, value, extra = {}) => state.project.gate0ScopedValuesV194.push({
      id: productId + '-' + field, project_id: activeProjectId,
      product_id: productId, category_id: '', scope: 'product',
      field, value, confirmation_status: 'confirmed', ...extra,
    });
    for (const productId of ['product-a', 'product-b']) {
      add(productId, 'jtbd', 'Когда нужен результат', { jtbd: {
        situation: 'Когда нужна помощь', desired_action: 'Выбрать решение', result: 'Получить результат',
      } });
      add(productId, 'segments', 'Целевая аудитория');
      add(productId, 'positioning', 'Позиционирование');
      add(productId, 'usp', 'Уникальное предложение');
      add(productId, 'offers', 'Оффер', { offer: {
        rational: 'Выгода', irrational: 'Уверенность', social: 'Рекомендации', cta: 'Заказать',
      } });
      add(productId, 'keyword_foundation', '', { keywords: [{
        value: productId === 'product-a' ? 'товар а' : 'услуга б', source: 'manual',
        status: productId === 'product-a' ? 'confirmed' : 'draft',
      }] });
    }
    const productA = guruV194Product('product-a', state);
    const productB = guruV194Product('product-b', state);
    add('product-a', 'product_description', 'Утверждённое описание А', {
      approved_source_signature: guruProductDescriptionSourcesV1(productA, state).signature,
    });
    add('product-b', 'product_description', '', { confirmation_status: 'draft', draft: 'Черновик Б' });
    const recordIds = state.project.gate0ScopedValuesV194.map(record => record.id).sort();
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = 'cat-test'; ui.selectedProductId = 'product-a';
    const card = state.gates.find(gate => gate.id === 'gate-0').cards
      .find(item => v116PassportDef(item)?.key === 'product_segment_client_task');
    activeView = 'gate'; activeGateId = 'gate-0';
    const beforeRead = JSON.stringify(state);
    const initialStatuses = Object.fromEntries(guruV194ProductReadinessMapV1(state));
    const readOnly = beforeRead === JSON.stringify(state);
    const host = document.createElement('div');
    host.innerHTML = '<details data-card-row="' + card.id + '"><summary><span class="gate0-card-status"></span></summary></details>' +
      guruV194ProductSelectHtml('product_segment_client_task', { compact: true, fastSelection: true });
    els.contentArea.append(host);
    guruV194RefreshProductSelectorsV1(true);
    const view = () => {
      const shell = host.querySelector('[data-guru-product-context]');
      const option = id => [...shell.querySelector('[data-gate0-scope-product-select]').options]
        .find(item => item.value === id)?.textContent;
      const count = key => Number(shell.querySelector('[data-guru-product-filter-v1="' + key + '"] span').textContent);
      return { ready: count('ready'), missing: count('missing'),
        a: option('product-a'), b: option('product-b'),
        category: shell.querySelector('[data-gate0-scope-category-select] option:checked').textContent,
        badge: host.querySelector('.gate0-card-status').textContent };
    };
    const initial = view();
    const cardStatus = v116Status(card, state);
    ui.selectedProductId = 'product-b';
    guruV194RefreshProductSelectorsV1(true);
    const selectedB = view();
    ui.selectedProductId = 'product-a';
    guruV194RefreshProductSelectorsV1(true);
    const keywordB = state.project.gate0ScopedValuesV194.find(r => r.id === 'product-b-keyword_foundation');
    keywordB.keywords[0].status = 'confirmed';
    guruV194RefreshProductSelectorsV1(true);
    const keywordOnly = view();
    const descriptionB = state.project.gate0ScopedValuesV194.find(r => r.id === 'product-b-product_description');
    descriptionB.value = 'Утверждённое описание Б';
    descriptionB.confirmation_status = 'confirmed';
    delete descriptionB.draft;
    descriptionB.approved_source_signature = guruProductDescriptionSourcesV1(productB, state).signature;
    guruV194RefreshProductSelectorsV1(true);
    const complete = view();
    const cardComplete = v116Status(card, state);
    const offerA = state.project.gate0ScopedValuesV194.find(r => r.id === 'product-a-offers');
    const originalIrrational = offerA.offer.irrational;
    offerA.offer.irrational = '';
    guruV194RefreshProductSelectorsV1(true);
    const publishedOffer = {
      selector: view(),
      foundation: guruStrategicFoundationModelV286(productA).fields.offer.complete,
      diagnostic: diag5AOfferItemsV348(productA, state)[0].status,
      inspected: guruReadinessInspect(state, workspace =>
        guruGate0ProductBlockStatus(card, workspace, productA.id)),
    };
    offerA.offer.irrational = originalIrrational;
    const originalCta = offerA.offer.cta;
    const originalPrimaryCta = offerA.offer.ctaV2?.primary;
    offerA.offer.cta = '';
    if (offerA.offer.ctaV2) offerA.offer.ctaV2.primary = '';
    guruV194RefreshProductSelectorsV1(true);
    const missingCta = {
      selector: view(),
      foundation: guruStrategicFoundationModelV286(productA).fields.offer.complete,
      diagnostic: diag5AOfferItemsV348(productA, state)[0].status,
      inspected: guruReadinessInspect(state, workspace =>
        guruGate0ProductBlockStatus(card, workspace, productA.id)),
    };
    offerA.offer.cta = originalCta;
    if (offerA.offer.ctaV2) offerA.offer.ctaV2.primary = originalPrimaryCta;
    const originalOffer = offerA.value;
    offerA.value = '';
    guruV194RefreshProductSelectorsV1(true);
    const missingOffer = {
      selector: view(),
      foundation: guruStrategicFoundationModelV286(productA).fields.offer.complete,
      diagnostic: diag5AOfferItemsV348(productA, state)[0].status,
      inspected: guruReadinessInspect(state, workspace =>
        guruGate0ProductBlockStatus(card, workspace, productA.id)),
    };
    offerA.value = originalOffer;
    guruV194RefreshProductSelectorsV1(true);
    const keywordA = state.project.gate0ScopedValuesV194.find(r => r.id === 'product-a-keyword_foundation');
    keywordA.keywords.push({ value: 'новый кандидат', source: 'generated', status: 'draft' });
    guruV194RefreshProductSelectorsV1(true);
    const optionalCandidate = view();
    keywordA.keywords.pop();
    const uspA = state.project.gate0ScopedValuesV194.find(r => r.id === 'product-a-usp');
    const oldUsp = uspA.value;
    uspA.value = 'Изменённое УТП';
    guruV194ScheduleProductSelectorRefreshV1();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const staleDescription = view();
    const descriptionReview = guruProductDescriptionViewV1(productA, state);
    const reviewSuggested = descriptionReview.status === 'in_progress' &&
      descriptionReview.note.includes('Источники обновились') && descriptionReview.needsApproval;
    uspA.value = oldUsp;
    guruV194ScheduleProductSelectorRefreshV1();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const restored = view();
    const descriptionA = state.project.gate0ScopedValuesV194.find(r => r.id === 'product-a-product_description');
    descriptionA.draft = 'Неутверждённая правка А';
    guruV194RefreshProductSelectorsV1(true);
    const editedDescription = view();
    delete descriptionA.draft;
    guruV194RefreshProductSelectorsV1(true);
    const editRestored = view();
    host.remove();
    return { initialStatuses, readOnly, initial, cardStatus, selectedB, keywordOnly, complete, cardComplete,
      publishedOffer, missingCta, missingOffer,
      optionalCandidate, staleDescription, reviewSuggested, restored, editedDescription, editRestored,
      productCount: state.project.catalogItemsV189.length,
      recordsPreserved: JSON.stringify(recordIds) === JSON.stringify(
        state.project.gate0ScopedValuesV194.map(record => record.id).sort()) };
  })()`);
  console.log(result);
  if (result.initialStatuses['product-a'] !== 'ready' ||
      result.initialStatuses['product-b'] !== 'in_progress' || !result.readOnly ||
      result.initial.ready !== 1 || result.initial.missing !== 1 ||
      !result.initial.a.includes('✓ Заполнен') || !result.initial.b.includes('В работе') ||
      result.initial.badge !== 'Готово' || result.selectedB.badge !== 'В работе' ||
      result.cardStatus !== 'in_progress' || result.keywordOnly.ready !== 1 ||
      result.complete.ready !== 2 || result.cardComplete !== 'ready' ||
      result.publishedOffer.selector.ready !== 2 || !result.publishedOffer.foundation ||
      result.publishedOffer.diagnostic !== 'works' || result.publishedOffer.inspected.status !== 'ready' ||
      result.publishedOffer.inspected.missing.some(item => item.label?.includes('Иррациональное')) ||
      result.missingCta.selector.ready !== 1 || result.missingCta.foundation ||
      result.missingCta.diagnostic !== 'needs_improvement' ||
      result.missingCta.inspected.status !== 'in_progress' ||
      !result.missingCta.inspected.missing.some(item => item.label?.includes('Основной CTA')) ||
      result.missingOffer.selector.ready !== 1 || result.missingOffer.foundation ||
      result.missingOffer.diagnostic !== 'needs_improvement' ||
      result.missingOffer.inspected.status !== 'in_progress' ||
      !result.missingOffer.inspected.missing.some(item => item.label?.includes('Единый оффер')) ||
      result.optionalCandidate.ready !== 2 ||
      result.staleDescription.ready !== 2 || !result.reviewSuggested ||
      result.restored.ready !== 2 || result.restored.badge !== 'Готово' ||
      result.editedDescription.ready !== 1 || result.editedDescription.badge !== 'В работе' ||
      result.editRestored.ready !== 2 ||
      result.productCount !== 2 || !result.recordsPreserved)
    throw new Error('Gate 0 readiness integration failed');
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId });
  page.close(); browser.close();
}
