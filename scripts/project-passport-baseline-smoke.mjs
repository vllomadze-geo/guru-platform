import assert from "node:assert/strict";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9381";
const appPort = process.env.GURU_APP_PORT || "3191";
const target = (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json())
  .find((item) => item.type === "page");
assert(target?.webSocketDebuggerUrl);
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
});
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await call("Runtime.evaluate", {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

try {
  await call("Runtime.enable");
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes('/api/')
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, projects: [], workspaces: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }))
      : nativeFetch(input, init);
    window.__guruErrors = [];
    window.addEventListener('error', (event) => window.__guruErrors.push(event.message));
  }` });
  await call("Page.navigate", { url: `http://127.0.0.1:${appPort}/` });
  await new Promise((resolve) => setTimeout(resolve, 1300));
  await evaluate("window.__guruErrors = []; window.addEventListener('error', (event) => window.__guruErrors.push(event.message)); true");
  const report = await evaluate(`(async () => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    const project = { id: 'passport-baseline-smoke-' + Date.now(), name: 'Passport baseline',
      lifecycleStatus: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    state = createFreshWorkspace(project); activeProjectId = project.id;
    state.project.productRegistryV185 = [{ id: 'passport-category', name: 'Подарки', legacyNames: [] }];
    state.project.catalogItemsV189 = [
      { id: 'passport-product-a', name: 'Коза', categoryId: 'passport-category', continuum: 'pure_product' },
      { id: 'passport-product-b', name: 'Лиса', categoryId: 'passport-category', continuum: 'pure_product' },
    ];
    megaPlatformCategoryStore(state).categoryIdsByProduct = {
      'passport-product-a': ['passport-category'], 'passport-product-b': ['passport-category'],
    };
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = 'passport-category'; ui.selectedProductId = 'passport-product-a';
    activeGateId = 'gate-0'; activeView = 'project';
    document.getElementById('appShell').hidden = false;
    renderProject();
    const ids = GURU_PASSPORT_GATE0_CARD_IDS_V527;
    const baseline = () => document.querySelector('[data-project-passport-baseline-v527]');
    const card = (id) => baseline().querySelector('[data-card-row="' + id + '"]');
    const inPassport = ids.every((id) => card(id)) &&
      baseline().querySelectorAll('.gate0-card').length === 5 &&
      !baseline().querySelector('[data-guru-strategic-foundation]');
    const companyDiagnostic = card('card-11');
    const companyBeforeProductSelector = Boolean(companyDiagnostic &&
      (companyDiagnostic.compareDocumentPosition(baseline().querySelector('[data-gate0-scope-product-select]')) & Node.DOCUMENT_POSITION_FOLLOWING));
    const companyScopeOnly = companyDiagnostic?.querySelectorAll('[data-gate0-diagnostic-scope="company"]').length === 1 &&
      !companyDiagnostic.querySelector('[data-gate0-diagnostic-scope="product"]');
    const companyContent = companyDiagnostic?.querySelector('.diag-5a')?.textContent;
    companyDiagnostic.querySelector('summary').click();
    card('card-12').querySelector('summary').click();
    const open = card('card-12').open;
    const date = card('card-12').querySelector('[data-control-fixation-key]');
    date.value = '2026-10-15';
    date.dispatchEvent(new Event('input', { bubbles: true }));
    const resultOwner = card('card-10').querySelector('[data-cr-meta-field="positionId"]');
    resultOwner.value = 'passport-product-a';
    resultOwner.dispatchEvent(new Event('change', { bubbles: true }));
    const product = baseline().querySelector('[data-gate0-scope-product-select]');
    product.value = 'passport-product-b';
    product.dispatchEvent(new Event('change', { bubbles: true }));
    const switched = activeView === 'project' &&
      guruV194Ui(state).selectedProductId === 'passport-product-b' &&
      card('gate0-landing-check-v215').textContent.includes('Лиса') &&
      card('card-12').open;
    const companyUnaffectedByProduct = card('card-11').open &&
      card('card-11').querySelector('.diag-5a')?.textContent === companyContent;
    const diagnosticFollowsProduct = card('gate0-product-diagnostic')
      .querySelector('[data-gate0-diagnostic-product-id]')?.dataset.gate0DiagnosticProductId === 'passport-product-b';
    renderProject();
    const rerendered = card('card-11').open && card('card-12').open &&
      card('card-12').querySelector('[data-control-fixation-key]').value === '2026-10-15' &&
      card('card-10').querySelector('[data-cr-meta-field="positionId"]').value === 'passport-product-a';
    const gate0 = state.gates.find((gate) => gate.id === 'gate-0');
    let beforeMovedCount;
    let movedIdsExcluded = true;
    if (typeof nowGuideGate0Cards === 'function') {
      // Compare the same visible-block registry with and without the passport
      // exclusion. Other visibility rules must remain identical in both counts.
      const isMoved = guruPassportMovedGate0CardV527;
      let beforeMovedIds;
      try {
        guruPassportMovedGate0CardV527 = () => false;
        beforeMovedIds = nowGuideGate0Cards(gate0).map((entry) => entry.id);
      } finally {
        guruPassportMovedGate0CardV527 = isMoved;
      }
      const afterMovedIds = nowGuideGate0Cards(gate0).map((entry) => entry.id);
      beforeMovedCount = beforeMovedIds.length;
      movedIdsExcluded = ids.every((id) => beforeMovedIds.includes(id) && !afterMovedIds.includes(id)) &&
        JSON.stringify(beforeMovedIds.filter((id) => !ids.includes(id))) === JSON.stringify(afterMovedIds);
    } else {
      beforeMovedCount = __guruPassportPrevGateBlockStatusesV527(gate0).length;
    }
    const progressMoved = movedIdsExcluded &&
      beforeMovedCount - guruGateBlockStatuses(gate0).length === ids.length;
    renderGate();
    const absentFromGate0 = ids.every((id) => !document.querySelector('.gate0-vertical [data-card-row="' + id + '"]'));
    await new Promise((resolve) => setTimeout(resolve, 350));
    const saved = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + project.id));
    return { inPassport, companyBeforeProductSelector, companyScopeOnly,
      companyUnaffectedByProduct, open, switched, diagnosticFollowsProduct,
      rerendered, progressMoved, absentFromGate0,
      dataPreserved: saved?.project?.controlFixationDate === '2026-10-15' &&
        saved?.gates?.find((gate) => gate.id === 'gate-0')?.cards?.find((entry) => entry.id === 'card-10')
          ?.currentResultsMeta?.positionId === 'passport-product-a',
      errors: window.__guruErrors };
  })()`);
  console.log(JSON.stringify(report, null, 2));
  for (const [key, value] of Object.entries(report)) {
    if (key === "errors") continue;
    assert.equal(value, true, key);
  }
  assert.deepEqual(report.errors, []);
} finally {
  socket.close();
}
