import assert from "node:assert/strict";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9387";
const appPort = process.env.GURU_APP_PORT || "3000";
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const target = targets.find((item) => item.type === "page" && item.url === "about:blank") ||
  targets.find((item) => item.type === "page");
assert(target?.webSocketDebuggerUrl);
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const response = JSON.parse(event.data);
  if (!response.id || !pending.has(response.id)) return;
  const entry = pending.get(response.id);
  pending.delete(response.id);
  if (response.error) entry.reject(new Error(response.error.message));
  else entry.resolve(response.result);
});
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const response = await call("Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (response.exceptionDetails)
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}

try {
  await call("Runtime.enable");
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes('/api/')
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, projects: [], workspaces: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }))
      : nativeFetch(input, init);
  }` });
  await call("Page.navigate", { url: `http://127.0.0.1:${appPort}/` });
  await new Promise((resolve) => setTimeout(resolve, 1300));
  const report = await evaluate(`(() => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    const project = { id: 'description-smoke-' + Date.now(), name: 'Description smoke',
      lifecycleStatus: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    state = createFreshWorkspace(project); activeProjectId = project.id;
    state.project.productRegistryV185 = [{ id: 'category', name: 'Подарки', legacyNames: [] }];
    state.project.catalogItemsV189 = [
      { id: 'product-a', name: 'Шапка Коза', categoryId: 'category', continuum: 'pure_product' },
      { id: 'product-b', name: 'Термос', categoryId: 'category', continuum: 'pure_product' },
    ];
    megaPlatformCategoryStore(state).categoryIdsByProduct = {
      'product-a': ['category'], 'product-b': ['category'],
    };
    const product = guruV194Product('product-a', state);
    const now = new Date().toISOString();
    const record = (id, field, value, extra = {}) => ({
      id, project_id: project.id, category_id: '', product_id: product.id,
      scope: 'product', field, value, confirmation_status: 'confirmed',
      source: { type: 'manual', label: 'Smoke' }, created_at: now, updated_at: now, ...extra,
    });
    const offer = record('offer-a', 'offers', 'Авторская шапка ручной работы для особого подарка',
      { offer: { rational: 'Сшита вручную из качественных материалов', cta: 'Заказать' } });
    state.project.gate0ScopedValuesV194 = [
      { ...record('audience-a', 'segments', 'Частные покупатели'), scope: 'project',
        product_id: '', segment_name: 'Частные покупатели', is_primary: true,
        segment: { need_response: 'выбор подарка с индивидуальным характером' } },
      record('jtbd-a', 'jtbd', 'Найти памятный подарок',
        { jtbd: { result: 'порадовать близкого человека' } }),
      record('position-a', 'positioning', 'Авторский подарок с особым характером',
        { positioning: { category: 'авторская шапка', basis: 'каждую вещь создаёт мастер' } }),
      record('usp-a', 'usp', 'Каждая шапка имеет уникальные детали'),
      offer,
      record('keywords-a', 'keyword_foundation', '', { keywords: [
        { id: 'keyword-1', value: 'авторская шапка', source: 'manual', status: 'confirmed' },
      ] }),
    ];
    const field = document.createElement('div');
    field.innerHTML = guruV194FieldHtml('product_description', product);
    document.body.append(field);
    const categoryRow = { id: 'category-row', categoryId: 'category', contextFields: {} };
    const categoryBefore = guruCategoryProductsV510(categoryRow).find((item) => item.id === product.id)?.description;
    const generated = field.querySelector('[data-product-description-draft]').value;
    const initialMeter = field.querySelector('[data-product-description-meter]')?.textContent;
    const sources = guruProductDescriptionSourcesV1(product).sourceNames;
    const beforeApproval = guruProductDescriptionApprovedV1(product.id, state);
    const input = field.querySelector('[data-product-description-draft]');
    input.value = generated + ' Уточнено для клиента.';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const editedMeter = field.querySelector('[data-product-description-meter]')?.textContent;
    field.querySelector('[data-product-description-approve]').click();
    const approved = guruProductDescriptionApprovedV1(product.id, state);
    const approvedMeter = field.querySelector('[data-product-description-meter]')?.textContent;
    const categoryAfter = guruCategoryProductsV510(categoryRow);
    const categoryStoredBeforeOverride = categoryRow.contextFields.catalogProductCardsV516;
    const categoryCard = new DOMParser().parseFromString(
      guruCategoryProductCardV516(categoryAfter.find((item) => item.id === product.id), categoryRow), 'text/html');
    const landingRow = { catalogItemIdV189: product.id, contextFields: {} };
    const landingSource = new DOMParser().parseFromString(
      contextInputField({ id: 'landing-card' }, 0, landingRow, 'landingSolutionText',
        'Описание продукта/услуги', '', 'textarea'), 'text/html')
      .querySelector('textarea')?.value;
    const strategic = guruStrategicFoundationModelV286(product);
    const strategicHtml = new DOMParser().parseFromString(guruStrategicFoundationHtmlV237(product), 'text/html');
    const finalFields = new DOMParser().parseFromString(
      guruV194FieldsHtml(['keyword_foundation', 'product_description'], 'smoke', false), 'text/html');
    const other = guruProductDescriptionApprovedV1('product-b', state);
    offer.value = 'Новый оффер после утверждения';
    const stale = new DOMParser().parseFromString(guruProductDescriptionHtmlV1(product), 'text/html');
    const approvedBeforeRefresh = guruProductDescriptionApprovedV1(product.id, state);
    const regenerated = guruProductDescriptionSynthesizeV1(product);
    const currentBeforeRegenerate = field.querySelector('[data-product-description-draft]').value;
    const storedBeforeRegenerate = guruProductDescriptionRecordV1(product)?.value;
    let confirmations = 0;
    window.confirm = () => { confirmations += 1; return true; };
    field.querySelector('[data-product-description-generate]').click();
    const refreshedDraft = field.querySelector('[data-product-description-draft]').value;
    field.querySelector('[data-product-description-approve]').click();
    const reapproved = guruProductDescriptionApprovedV1(product.id, state);
    const categoryUpdated = guruCategoryProductsV510(categoryRow).find((item) => item.id === product.id)?.description;
    const landingUpdated = new DOMParser().parseFromString(
      contextInputField({ id: 'landing-card' }, 0, landingRow, 'landingSolutionText',
        'Описание продукта/услуги', '', 'textarea'), 'text/html')
      .querySelector('textarea')?.value;
    landingRow.contextFields.landingSolutionText = 'Текст для отдельной страницы';
    const landingOverride = new DOMParser().parseFromString(
      contextInputField({ id: 'landing-card' }, 0, landingRow, 'landingSolutionText',
        'Описание продукта/услуги', '', 'textarea'), 'text/html')
      .querySelector('textarea')?.value;
    categoryRow.contextFields.catalogProductCardsV516 = { 'product-a': { description: 'Адаптация карточки' } };
    const categoryOverride = guruCategoryProductsV510(categoryRow).find((item) => item.id === product.id)?.description;
    delete categoryRow.contextFields.catalogProductCardsV516['product-a'].description;
    const categoryRelinked = guruCategoryProductsV510(categoryRow).find((item) => item.id === product.id)?.description;
    const updatedStrategicValue = guruStrategicFoundationModelV286(product).fields.description.value;
    const confirmationBeforeManual = confirmations;
    const manual = field.querySelector('[data-product-description-draft]');
    manual.value = reapproved + ' Ручная правка.';
    manual.dispatchEvent(new Event('input', { bubbles: true }));
    const manualMeter = field.querySelector('[data-product-description-meter]')?.textContent;
    window.confirm = () => { confirmations += 1; return false; };
    field.querySelector('[data-product-description-generate]').click();
    const protectedDraft = field.querySelector('[data-product-description-draft]').value;
    const persisted = JSON.parse(JSON.stringify(state.project.gate0ScopedValuesV194));
    const restoredWorkspace = JSON.parse(JSON.stringify(state));
    const restoredApproved = guruProductDescriptionApprovedV1(product.id, restoredWorkspace);
    field.remove();
    return {
      generated, sources, beforeApproval, approved, other, regenerated, refreshedDraft, reapproved,
      initialMeter, editedMeter, approvedMeter, manualMeter,
      categoryBefore, categoryAfter: categoryAfter.find((item) => item.id === product.id)?.description,
      categoryStoredBeforeOverride,
      categoryOther: categoryAfter.find((item) => item.id === 'product-b')?.description,
      categoryPreview: categoryCard.querySelector('[data-guru-category-card-preview-v516="description"]')?.textContent,
      categoryEditor: categoryCard.querySelector('[data-guru-category-card-field-v516="description"]')?.value,
      categoryUpdated, categoryOverride, categoryRelinked,
      landingSource, landingUpdated, landingOverride,
      currentBeforeRegenerate, storedBeforeRegenerate, confirmationBeforeManual,
      confirmations, protectedDraft, restoredApproved,
      strategicValue: strategic.fields.description.value,
      strategicTarget: strategic.fields.description.target,
      strategicStep: strategicHtml.querySelector('[data-guru-strategic-step="description"]')?.textContent,
      finalOrder: [...finalFields.querySelectorAll('[data-gate0-scope-field-row]')]
        .map((node) => node.dataset.gate0ScopeFieldRow),
      staleNote: stale.querySelector('[data-product-description-note]')?.textContent,
      approvedBeforeRefresh,
      updatedStrategicValue,
      records: persisted.filter((item) => item.field === 'product_description'),
    };
  })()`);
  assert(report.generated.toLocaleLowerCase("ru").includes("авторская шапка ручной работы"));
  assert(report.generated.includes("Сшита вручную"));
  assert.equal(report.initialMeter, `${[...report.generated].length} симв. · ориентир 200–300`);
  assert.equal(report.editedMeter, `${[...report.approved].length} симв. · ориентир 200–300`);
  assert.equal(report.approvedMeter, report.editedMeter);
  assert.equal(report.manualMeter, `${[...report.protectedDraft].length} симв. · ориентир 200–300`);
  assert.equal(report.categoryBefore, "");
  assert.equal(report.categoryAfter, report.approved);
  assert.equal(report.categoryStoredBeforeOverride, undefined);
  assert.equal(report.categoryPreview, report.approved);
  assert.equal(report.categoryEditor, report.approved);
  assert.equal(report.categoryOther, "");
  assert.equal(report.categoryUpdated, report.reapproved);
  assert.equal(report.categoryOverride, "Адаптация карточки");
  assert.equal(report.categoryRelinked, report.reapproved);
  assert.equal(report.landingSource, report.approved);
  assert.equal(report.landingUpdated, report.reapproved);
  assert.equal(report.landingOverride, "Текст для отдельной страницы");
  assert.deepEqual(report.sources, ["ЦА", "JTBD", "Позиционирование", "УТП", "Оффер и выгоды", "Ключевые слова"]);
  assert.equal(report.beforeApproval, "");
  assert(report.approved.endsWith("Уточнено для клиента."));
  assert.equal(report.strategicValue, report.approved);
  assert.equal(report.strategicTarget.productId, "product-a");
  assert.equal(report.strategicTarget.field, "product_description");
  assert(report.strategicStep.includes(report.approved));
  assert.deepEqual(report.finalOrder, ["keyword_foundation", "product_description"]);
  assert.equal(report.other, "");
  assert.equal(report.approvedBeforeRefresh, report.approved);
  assert.equal(report.currentBeforeRegenerate, report.storedBeforeRegenerate);
  assert.equal(report.confirmationBeforeManual, 0);
  assert.equal(report.confirmations, 1);
  assert(report.regenerated.toLocaleLowerCase("ru").includes("новый оффер после утверждения"));
  assert.equal(report.refreshedDraft, report.regenerated);
  assert.equal(report.reapproved, report.regenerated);
  assert.equal(report.updatedStrategicValue, report.reapproved);
  assert.equal(report.restoredApproved, report.reapproved);
  assert.equal(report.protectedDraft, report.reapproved + " Ручная правка.");
  assert(report.staleNote.includes("Источники обновились"));
  assert.equal(report.records.length, 1);
  assert.equal(report.records[0].value, report.reapproved);
  assert.equal(report.records[0].product_id, "product-a");
  const synchronized = await evaluate(`(async () => {
    const meta = { id: 'description-sync-' + Date.now(), name: 'Description sync',
      lifecycleStatus: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    projects = [meta]; activeProjectId = meta.id; state = createFreshWorkspace(meta);
    state.project.productRegistryV185 = [{ id: 'category', name: 'Подарки', legacyNames: [] }];
    state.project.catalogItemsV189 = [
      { id: 'product-a', name: 'Шапка Коза', categoryId: 'category', continuum: 'pure_product' },
      { id: 'product-b', name: 'Термос', categoryId: 'category', continuum: 'pure_service' },
    ];
    megaPlatformCategoryStore(state).categoryIdsByProduct = {
      'product-a': ['category'], 'product-b': ['category'],
    };
    for (const [id, value] of [['product-a', 'Описание шапки'], ['product-b', 'Описание термоса']]) {
      const product = guruV194Product(id, state);
      const record = guruProductDescriptionRecordV1(product, true, state);
      const recordId = record.id;
      const signature = guruProductDescriptionSourcesV1(product, state).signature;
      const current = state.project.gate0ScopedValuesV194.find(item => item.id === recordId);
      current.value = value;
      current.confirmation_status = 'confirmed';
      current.approved_source_signature = signature;
    }
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = 'category'; ui.selectedProductId = 'product-a';
    const card = state.gates.find(gate => gate.id === 'gate-0').cards
      .find(item => v116PassportDef(item)?.key === 'product_segment_client_task');
    state._gate0Open ||= {}; state._gate0Open[card.id] = true;
    els.launcher.hidden = true; els.appShell.hidden = false;
    activeView = 'gate'; activeGateId = 'gate-0'; renderGate();
    const source = () => document.querySelector('[data-product-description-id]');
    const panel = () => document.querySelector('[data-guru-strategic-foundation]');
    const view = () => ({
      sourceProduct: source()?.dataset.productDescriptionId,
      strategicProduct: panel()?.dataset.productId,
      sourceStatus: source()?.querySelector('.status-pill')?.textContent,
      strategicStatus: panel()?.querySelector('[data-guru-strategic-step="description"] .status-pill')?.textContent,
      strategicText: panel()?.querySelector('[data-guru-strategic-step="description"] .guru-strategic-row-copy-v286 > span')?.textContent,
    });
    const initial = view();
    const input = source().querySelector('[data-product-description-draft]');
    input.value = 'Первый черновик';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    guruV194Records(state);
    input.value = 'Уточнённый черновик';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(resolve => setTimeout(resolve, 120));
    const rawDraft = state.project.gate0ScopedValuesV194.find(item =>
      item.field === 'product_description' && item.product_id === 'product-a')?.draft;
    const editing = view();
    await new Promise(resolve => setTimeout(resolve, 900));
    const savedDraft = await guruQueueWorkspaceSave({ quiet: true, durable: true });
    const draftSerialized = localStorage.getItem(WORKSPACE_IDB_MARKER_PREFIX + activeProjectId)
      ? (await guruWorkspaceIdbReadV1(activeProjectId))?.serialized
      : localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId);
    const storedDraft = draftSerialized && JSON.parse(draftSerialized).project.gate0ScopedValuesV194
      .find(item => item.field === 'product_description' && item.product_id === 'product-a')?.draft;
    source().querySelector('[data-product-description-approve]').click();
    const approved = view();
    ui.selectedProductId = 'product-b'; guruV194RefreshGate0SelectedProductV1();
    const productB = view();
    ui.selectedProductId = 'product-a'; guruV194RefreshGate0SelectedProductV1();
    const backToA = view();
    state.project.catalogItemsV189.find(item => item.id === 'product-a').description =
      'Новый факт для анализа';
    guruStrategicFoundationRefreshV245('product-a');
    const changedSources = view();
    const changedNote = source().querySelector('[data-product-description-note]')?.textContent;
    source().querySelector('[data-product-description-approve]').click();
    const reapproved = view();
    await new Promise(resolve => setTimeout(resolve, 900));
    const saved = await guruQueueWorkspaceSave({ quiet: true, durable: true });
    const serialized = localStorage.getItem(WORKSPACE_IDB_MARKER_PREFIX + activeProjectId)
      ? (await guruWorkspaceIdbReadV1(activeProjectId))?.serialized
      : localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId);
    const stored = serialized && JSON.parse(serialized).project.gate0ScopedValuesV194
      .filter(item => item.field === 'product_description')
      .map(item => [item.product_id, item.value]);
    return { initial, rawDraft, savedDraft, storedDraft, editing, approved, productB, backToA,
      changedSources, changedNote, reapproved, saved, stored };
  })()`);
  assert.deepEqual(synchronized.initial, {
    sourceProduct: 'product-a', strategicProduct: 'product-a',
    sourceStatus: 'Готово', strategicStatus: 'Готово', strategicText: 'Описание шапки',
  });
  assert.equal(synchronized.rawDraft, 'Уточнённый черновик');
  assert.equal(synchronized.savedDraft, true);
  assert.equal(synchronized.storedDraft, 'Уточнённый черновик');
  assert.equal(synchronized.editing.sourceStatus, 'В работе');
  assert.equal(synchronized.editing.strategicStatus, 'В работе');
  assert.equal(synchronized.editing.strategicText, 'Описание шапки');
  assert.equal(synchronized.approved.sourceStatus, 'Готово');
  assert.equal(synchronized.approved.strategicStatus, 'Готово');
  assert.equal(synchronized.approved.strategicText, 'Уточнённый черновик');
  assert.equal(synchronized.productB.sourceProduct, 'product-b');
  assert.equal(synchronized.productB.strategicProduct, 'product-b');
  assert.equal(synchronized.productB.strategicText, 'Описание термоса');
  assert.equal(synchronized.backToA.strategicText, 'Уточнённый черновик');
  assert.equal(synchronized.changedSources.sourceStatus, 'В работе');
  assert.equal(synchronized.changedSources.strategicStatus, 'В работе');
  assert.equal(synchronized.changedSources.strategicText, 'Уточнённый черновик');
  assert.match(synchronized.changedNote, /Источники обновились/);
  assert.equal(synchronized.reapproved.sourceStatus, 'Готово');
  assert.equal(synchronized.reapproved.strategicStatus, 'Готово');
  assert.equal(synchronized.saved, true);
  assert.deepEqual(synchronized.stored?.sort(), [
    ['product-a', 'Уточнённый черновик'], ['product-b', 'Описание термоса'],
  ]);
  console.log(JSON.stringify({ ok: true, productId: report.records[0].product_id,
    strategicTarget: report.strategicTarget.field }, null, 2));
} finally {
  socket.close();
}
