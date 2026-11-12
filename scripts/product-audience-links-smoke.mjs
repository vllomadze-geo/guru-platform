import assert from "node:assert/strict";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9383";
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
    const project = { id: 'audience-links-' + Date.now(), name: 'Audience links',
      lifecycleStatus: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    state = createFreshWorkspace(project); activeProjectId = project.id;
    projects.push(project);
    state.project.productRegistryV185 = [{ id: 'category', name: 'Подарки', legacyNames: [] }];
    state.project.catalogItemsV189 = [
      { id: 'product-a', name: 'Коза', categoryId: 'category', continuum: 'pure_product' },
      { id: 'product-b', name: 'Лиса', categoryId: 'category', continuum: 'pure_product' },
    ];
    megaPlatformCategoryStore(state).categoryIdsByProduct = {
      'product-a': ['category'], 'product-b': ['category'],
    };
    const record = (id, scope, productId, value, name = '') => ({
      id, project_id: project.id, category_id: '', product_id: productId, scope,
      field: 'segments', value, segment_name: name,
      source: { type: 'manual', label: 'Smoke' }, confirmation_status: 'confirmed',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    const first = record('company-first', 'project', '', 'Покупатели подарков', 'Частные покупатели');
    first.is_primary = true;
    first.segment = { demographics: 'Женщины 25+', geography: 'Россия' };
    const second = record('company-second', 'project', '', 'Покупатели для команд', 'Компании');
    second.segment = { demographics: 'Отделы закупок' };
    const legacy = record('local-legacy', 'product', 'product-a', 'Особая аудитория продукта');
    state.project.gate0ScopedValuesV194 = [first, second, legacy];
    state.targetAudience = { version: 2, segments: [{
      id: 'portrait-first', gate0SegmentId: first.id, name: first.segment_name,
      need: 'Персональный подарок', criteria: 'Качество и срок',
    }] };
    const productA = guruV194Product('product-a', state);
    const productB = guruV194Product('product-b', state);
    const values = (product) => guruV194Resolve('segments', product, state).records.map((entry) => entry.value);
    const initialA = values(productA);
    const initialB = values(productB);
    guruProductAudienceSelectionWriteV1(productA, { mode: 'selected', segmentIds: [first.id] }, state);
    const selectedA = values(productA);
    const model = guruStrategicFoundationModelV286(productA);
    const source = model.segmentRows[0].target;
    const traits = model.segmentRows[0].extras.map((entry) => entry.value);
    guruProductAudienceSelectionWriteV1(productA, {
      refinements: { [first.id]: 'Для этого товара важна упаковка' },
    }, state);
    const refinedA = values(productA);
    const untouchedCompany = first.value;
    first.value = 'Новая формулировка компании';
    first.segment_name = 'Частные клиенты';
    first.segment.demographics = 'Семьи 25+';
    state.targetAudience.segments[0].need = 'Подарок для близких';
    const updatedA = values(productA);
    const updatedB = values(productB);
    const updatedModel = guruStrategicFoundationModelV286(productA);
    const html = guruV194FieldHtml('segments', productA);
    const dom = new DOMParser().parseFromString(html, 'text/html');
    const companyDom = new DOMParser().parseFromString(guruV309CompanySegmentationHtml(), 'text/html');
    const checked = [...dom.querySelectorAll('[data-product-audience-segment-id]:checked')]
      .map((node) => node.dataset.productAudienceSegmentId);
    const fieldTitles = (root) => [...root.querySelectorAll('.gate0-company-entry-v360:first-of-type label > strong')]
      .map((node) => node.textContent.trim());
    const sharedLayout = {
      companyCards: companyDom.querySelectorAll('.gate0-company-list-v360 > .gate0-company-entry-v360').length,
      productCards: dom.querySelectorAll('.gate0-company-list-v360 > .gate0-company-entry-v360').length,
      companyTitles: fieldTitles(companyDom), productTitles: fieldTitles(dom),
      readOnlySourceFields: [...dom.querySelectorAll('.gate0-company-entry-v360 input:not([type="checkbox"]), .gate0-company-entry-v360 textarea')]
        .every((node) => node.readOnly && !node.dataset.gate0CompanySegmentationField),
      editableCompanyFields: [...companyDom.querySelectorAll('.gate0-company-entry-v360 input, .gate0-company-entry-v360 textarea')]
        .every((node) => !node.readOnly && Boolean(node.dataset.gate0CompanySegmentationField)),
      noNewProductFields: !dom.querySelector('[data-gate0-scope-add="segments"]'),
      currentName: dom.querySelector('[data-product-audience-source-id="company-first"] .gate0-company-entry-head-v360 > strong')?.textContent.trim(),
      currentDemographics: dom.querySelector('[data-product-audience-source-id="company-first"] [readonly][placeholder]')?.value,
    };
    const stateCopy = JSON.parse(JSON.stringify(state));
    const restored = guruProductAudienceStateV1({ id: 'product-a' }, stateCopy);
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.append(host);
    const companyHost = document.createElement('div');
    companyHost.innerHTML = guruV309CompanySegmentationHtml();
    document.body.append(companyHost);
    const productEntry = host.querySelector('.gate0-company-entry-v360');
    const companyEntry = companyHost.querySelector('.gate0-company-entry-v360');
    const layoutStyles = (entry) => ({
      padding: getComputedStyle(entry).padding,
      gap: getComputedStyle(entry).gap,
      titleSize: getComputedStyle(entry.querySelector('.gate0-company-entry-head-v360 > strong')).fontSize,
      columns: getComputedStyle(entry.querySelector('.gate0-segment-parts-v194')).gridTemplateColumns,
    });
    const productLayoutStyles = layoutStyles(productEntry);
    const companyLayoutStyles = layoutStyles(companyEntry);
    const visibleIds = (root, attribute) => [...root.querySelectorAll('.gate0-company-list-v360 > .gate0-company-entry-v360')]
      .filter((card) => !card.hidden).map((card) => card.getAttribute(attribute));
    companyHost.querySelector('[data-gate0-segment-visible-id="company-second"]').click();
    const companyViewOne = visibleIds(companyHost, 'data-gate0-company-segment-entry');
    const picker = host.querySelector('.gate0-product-audience-picker-v1');
    picker.open = true;
    const secondInput = host.querySelector('[data-product-audience-segment-id="company-second"]');
    secondInput.checked = true;
    secondInput.dispatchEvent(new Event('change', { bubbles: true }));
    const pickerStaysOpen = Boolean(host.querySelector('.gate0-product-audience-picker-v1[open]'));
    const bindingBeforeView = JSON.stringify(guruProductAudienceStateV1(productA, state));
    host.querySelector('[data-gate0-segment-visible-id="company-first"]').click();
    const productViewOne = visibleIds(host, 'data-product-audience-source-id');
    const viewPreference = JSON.parse(JSON.stringify(state._gate0SegmentVisibilityV1));
    const bindingAfterView = JSON.stringify(guruProductAudienceStateV1(productA, state));
    const productViewRestored = visibleIds(
      new DOMParser().parseFromString(guruV194FieldHtml('segments', productA), 'text/html'),
      'data-product-audience-source-id');
    const companyViewRestored = visibleIds(
      new DOMParser().parseFromString(guruV309CompanySegmentationHtml(), 'text/html'),
      'data-gate0-company-segment-entry');
    host.querySelector('[data-gate0-segment-visible-all]').click();
    const productViewAll = visibleIds(host, 'data-product-audience-source-id');
    const firstInput = host.querySelector('[data-product-audience-segment-id="company-first"]');
    firstInput.checked = false;
    firstInput.dispatchEvent(new Event('change', { bubbles: true }));
    const uiSelected = guruProductAudienceStateV1(productA, state);
    host.querySelector('[data-product-audience-all]').click();
    const uiAll = guruProductAudienceStateV1(productA, state);
    host.remove();
    companyHost.remove();
    second.archived_at = new Date().toISOString();
    const archivedB = values(productB);
    delete second.archived_at;
    const third = record('company-third', 'project', '', 'Новый сегмент компании', 'Новые клиенты');
    state.project.gate0ScopedValuesV194.push(third);
    const companyAfterAdd = new DOMParser().parseFromString(guruV309CompanySegmentationHtml(), 'text/html');
    const companySwitcherSynced = Boolean(companyAfterAdd.querySelector('[data-gate0-segment-visible-id="company-third"]'));
    const companyViewAfterAdd = visibleIds(companyAfterAdd, 'data-gate0-company-segment-entry');
    const multiHost = document.createElement('div');
    multiHost.innerHTML = guruV194FieldHtml('segments', productA);
    document.body.append(multiHost);
    const syncedSwitcher = Boolean(multiHost.querySelector('[data-gate0-segment-visible-id="company-third"]'));
    multiHost.querySelector('[data-gate0-segment-visible-id="company-first"]').click();
    multiHost.querySelector('[data-gate0-segment-visible-id="company-third"]').click();
    const productViewMultiple = visibleIds(multiHost, 'data-product-audience-source-id');
    const bindingAfterMultipleView = guruProductAudienceStateV1(productA, state).mode;
    multiHost.remove();
    const companyDeleteHost = document.createElement('div');
    companyDeleteHost.innerHTML = guruV309CompanySegmentationHtml();
    document.body.append(companyDeleteHost);
    companyDeleteHost.querySelector('[data-gate0-segment-visible-all]').click();
    companyDeleteHost.querySelector('[data-gate0-segment-visible-id="company-first"]').click();
    const originalConfirm = window.confirm;
    let confirmationCount = 0;
    let cancelPreserved = false;
    try {
      window.confirm = () => { confirmationCount++; return false; };
      companyDeleteHost.querySelector('[data-gate0-company-segment-delete="company-first"]').click();
      cancelPreserved = !first.archived_at;
      window.confirm = () => { confirmationCount++; return true; };
      companyDeleteHost.querySelector('[data-gate0-company-segment-delete="company-first"]').click();
    } finally { window.confirm = originalConfirm; }
    const deletedProductDom = new DOMParser().parseFromString(guruV194FieldHtml('segments', productA), 'text/html');
    const deletedProductEntries = [...deletedProductDom.querySelectorAll('[data-product-audience-source-id]')]
      .map((entry) => entry.dataset.productAudienceSourceId);
    const deletedProductPicker = [...deletedProductDom.querySelectorAll('[data-product-audience-segment-id]')]
      .map((entry) => entry.dataset.productAudienceSegmentId);
    const deletion = {
      confirmationCount, cancelPreserved,
      archived: Boolean(first.archived_at), reason: first.archive_reason,
      retainedValue: first.value, primary: guruCompanySegmentsV360(state).find((entry) => entry.is_primary)?.id,
      linked: guruProductAudienceSourcesV1(productA, state).map((entry) => entry.id),
      companyViewReset: state._gate0SegmentVisibilityV1.company.mode,
      portraitRetained: state.targetAudience.segments[0].gate0SegmentId === first.id,
      deletedProductEntries, deletedProductPicker,
    };
    companyDeleteHost.querySelector('[data-gate0-company-segment-restore="company-first"]').click();
    const restoration = {
      active: !first.archived_at,
      value: first.value,
      linked: guruProductAudienceSourcesV1(productA, state).map((entry) => entry.id),
    };
    companyDeleteHost.remove();
    return { projectId: project.id, initialA, initialB, selectedA, source, traits, refinedA,
      untouchedCompany, updatedA, updatedB, updatedModel: {
        label: updatedModel.segmentRows[0].segmentLabel,
        traits: updatedModel.segmentRows[0].extras.map((entry) => entry.value),
      }, checked, restored, uiSelected, uiAll, archivedB,
      localEditor: Boolean(dom.querySelector('[data-gate0-scope-record="local-legacy"]')),
      sharedLayout, productLayoutStyles, companyLayoutStyles,
      productViewOne, companyViewOne, productViewRestored, companyViewRestored,
      productViewAll, productViewMultiple, syncedSwitcher, bindingAfterMultipleView, pickerStaysOpen,
      companySwitcherSynced, companyViewAfterAdd, deletion, restoration,
      viewPreference, bindingBeforeView, bindingAfterView,
      companyUnchangedAfterRefinement: state.project.gate0ScopedValuesV194.find((entry) => entry.id === first.id).value === first.value,
    };
  })()`);
  assert.deepEqual(report.initialA, ["Покупатели подарков", "Покупатели для команд", "Особая аудитория продукта"]);
  assert.deepEqual(report.initialB, ["Покупатели подарков", "Покупатели для команд"]);
  assert.deepEqual(report.selectedA, ["Покупатели подарков", "Особая аудитория продукта"]);
  assert.equal(report.source.kind, "gate0-company-segmentation");
  assert.equal(report.source.recordId, "company-first");
  assert(report.traits.includes("Персональный подарок"));
  assert(report.refinedA[0].includes("Для этого товара важна упаковка"));
  assert.equal(report.untouchedCompany, "Покупатели подарков");
  assert(report.updatedA[0].includes("Новая формулировка компании"));
  assert(report.updatedB[0].includes("Новая формулировка компании"));
  assert.equal(report.updatedModel.label, "Частные клиенты");
  assert(report.updatedModel.traits.includes("Подарок для близких"));
  assert.deepEqual(report.checked, ["company-first"]);
  assert.deepEqual(report.restored.segmentIds, ["company-first"]);
  assert.equal(report.restored.refinements["company-first"], "Для этого товара важна упаковка");
  assert.deepEqual(report.uiSelected.segmentIds, ["company-second"]);
  assert.equal(report.uiSelected.mode, "selected");
  assert.equal(report.uiAll.mode, "all");
  assert.deepEqual(report.archivedB, ["Новая формулировка компании"]);
  assert.equal(report.localEditor, true);
  assert.equal(report.sharedLayout.companyCards, 2);
  assert.equal(report.sharedLayout.productCards, 1);
  assert.deepEqual(report.sharedLayout.productTitles, report.sharedLayout.companyTitles);
  assert.equal(report.sharedLayout.readOnlySourceFields, true);
  assert.equal(report.sharedLayout.editableCompanyFields, true);
  assert.equal(report.sharedLayout.noNewProductFields, true);
  assert.equal(report.sharedLayout.currentName, "Частные клиенты");
  assert.deepEqual(report.productLayoutStyles, report.companyLayoutStyles);
  assert.deepEqual(report.productViewOne, ["company-first"]);
  assert.deepEqual(report.companyViewOne, ["company-second"]);
  assert.deepEqual(report.productViewRestored, ["company-first"]);
  assert.deepEqual(report.companyViewRestored, ["company-second"]);
  assert.deepEqual(report.productViewAll, ["company-first", "company-second"]);
  assert.deepEqual(report.productViewMultiple, ["company-first", "company-third"]);
  assert.equal(report.syncedSwitcher, true);
  assert.equal(report.pickerStaysOpen, true);
  assert.equal(report.companySwitcherSynced, true);
  assert.deepEqual(report.companyViewAfterAdd, ["company-second"]);
  assert.equal(report.bindingAfterMultipleView, "all");
  assert.equal(report.deletion.confirmationCount, 2);
  assert.equal(report.deletion.cancelPreserved, true);
  assert.equal(report.deletion.archived, true);
  assert.equal(report.deletion.reason, "Удалён пользователем");
  assert.equal(report.deletion.retainedValue, "Новая формулировка компании");
  assert.equal(report.deletion.primary, "company-second");
  assert.deepEqual(report.deletion.linked, ["company-second", "company-third"]);
  assert.equal(report.deletion.companyViewReset, "all");
  assert.equal(report.deletion.portraitRetained, true);
  assert.deepEqual(report.deletion.deletedProductEntries, ["company-second", "company-third"]);
  assert.deepEqual(report.deletion.deletedProductPicker, ["company-second", "company-third"]);
  assert.equal(report.restoration.active, true);
  assert.equal(report.restoration.value, "Новая формулировка компании");
  assert.deepEqual(report.restoration.linked, ["company-second", "company-first", "company-third"]);
  assert.deepEqual(report.viewPreference.company.segmentIds, ["company-second"]);
  assert.deepEqual(report.viewPreference["product:product-a"].segmentIds, ["company-first"]);
  assert.equal(report.bindingAfterView, report.bindingBeforeView);
  assert.equal(report.companyUnchangedAfterRefinement, true);
  await new Promise((resolve) => setTimeout(resolve, 500));
  const storedVisibility = await evaluate(`(() => {
    const saved = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId) || 'null');
    return saved?._gate0SegmentVisibilityV1 || null;
  })()`);
  assert.equal(storedVisibility?.company?.mode, "all");
  assert.deepEqual(storedVisibility?.company?.segmentIds, []);
  assert.deepEqual(storedVisibility?.["product:product-a"]?.segmentIds, ["company-third"]);
  console.log(JSON.stringify({ ok: true, checked: report.checked, source: report.source, archivedB: report.archivedB }, null, 2));
} finally {
  socket.close();
}
