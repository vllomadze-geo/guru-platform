import assert from "node:assert/strict";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9387";
const appPort = process.env.GURU_APP_PORT || "3189";
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = targets.find((item) => item.type === "page" && item.url === "about:blank") ||
  targets.find((item) => item.type === "page");
assert(page?.webSocketDebuggerUrl);
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const response = JSON.parse(event.data);
  const request = pending.get(response.id);
  if (!request) return;
  pending.delete(response.id);
  response.error ? request.reject(new Error(response.error.message)) : request.resolve(response.result);
});
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

async function scenario(seedAuditRow = true) {
  rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
  scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
  const project = { id: "audit-navigation-" + Date.now(), name: "Audit navigation",
    lifecycleStatus: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  state = createFreshWorkspace(project); activeProjectId = project.id;
  const category = { id: "author-clothes", name: "Авторская одежда", legacyNames: [] };
  state.project.productRegistryV185.push(category);
  state.project.catalogItemsV189.push({ id: "shirt", name: "Рубашка", categoryId: category.id, continuum: "pure_product" });
  const ui = guruV194Ui(state);
  ui.selectedCategoryId = category.id;
  ui.selectedProductId = "shirt";
  if (seedAuditRow) guruCategoryAuditRowsV491(state);
  const auditCard = state.gates.find((gate) => gate.id === "gate-1")
    .cards.find((card) => card.id === "card-22");
  const categoryRow = () => auditCard.pageRows?.find((row) => row.categoryId === category.id);
  if (seedAuditRow && !categoryRow()) throw new Error("Category audit row is missing");
  guruGateScopeOpenStateV526("gate-1").company = false;
  guruGateScopeOpenStateV526("gate-1").product = false;
  const platform = state.gates.find((gate) => gate.id === "gate-0").cards.find(isMegaMarketingCard);
  const holder = document.createElement("main");
  holder.innerHTML = megaPlatformSectionHtml(platform.id, ensureMegaMarketing(platform, state).platformV2);
  document.getElementById("appShell").hidden = false;
  els.contentArea.replaceChildren(holder);
  activeView = "gate"; activeGateId = "gate-0"; guruRenderedGateId = "gate-0";
  const button = holder.querySelector(`[data-mega-platform-source-category-audit="${CSS.escape(category.id)}"]`);
  if (!button) throw new Error("Category audit button is missing");
  const start = performance.now();
  button.click();
  const clickMs = performance.now() - start;
  let navigationMs = null;
  for (let frame = 0; frame < 30; frame += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const rowId = categoryRow()?.id;
    const target = rowId && document.querySelector(`[data-guru-category-page-row-id-v495="${CSS.escape(rowId)}"]`);
    const heading = document.querySelector('[data-gate0-section-heading="company"] [data-gate0-section-toggle]');
    const top = target?.getBoundingClientRect().top;
    if (target && heading?.getAttribute("aria-expanded") === "true" &&
        top >= -8 && top <= 90) {
      navigationMs = performance.now() - start;
      break;
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
  const auditRow = categoryRow();
  const row = auditRow && document.querySelector(`[data-guru-category-page-row-id-v495="${CSS.escape(auditRow.id)}"]`);
  const card = document.querySelector('[data-card="card-22"]');
  const productHeading = document.querySelector('[data-gate0-section-heading="product"]');
  const productScopeOpen = productHeading?.querySelector("[data-gate0-section-toggle]")?.getAttribute("aria-expanded");
  const companyScopeOpen = document.querySelector('[data-gate0-section-heading="company"] [data-gate0-section-toggle]')
    ?.getAttribute("aria-expanded");
  const box = row?.getBoundingClientRect();
  const sections = getGate1Sections(state.gates.find((gate) => gate.id === "gate-1"))
    .map((section) => [section.key, section.type || "", section.allInnerCards?.some((card) => card.id === "card-22")]);
  const saved = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + project.id));
  return { seedAuditRow, clickMs, navigationMs, activeGateId, hasCard: Boolean(card), hasRow: Boolean(row),
    productScopeOpen, companyScopeOpen, sections,
    rowVisible: Boolean(row && !row.closest(".gate0-section-content-hidden") && row.getClientRects().length && box.height),
    rowTop: box?.top ?? null, rowExpanded: row?.querySelector("[data-guru-category-page-content-v495]")?.hidden === false,
    selectedCategoryId: guruV194Ui(state).selectedCategoryId,
    savedScopeOpen: saved?.ui?.gateScopeOpenV526?.["gate-1"]?.company,
    savedCategoryOpen: saved?.ui?.categoryPagesOpenV495?.[`${project.id}:${auditRow?.id}`] };
}

try {
  await call("Runtime.enable");
  await call("Page.enable");
  await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await call("Page.addScriptToEvaluateOnNewDocument", { source:
    "{ const nativeFetch = window.fetch.bind(window); window.fetch = (input, init) => String(input).includes('/api/') ? Promise.resolve(new Response(JSON.stringify({ ok: true, projects: [], workspaces: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })) : nativeFetch(input, init); }" });
  await call("Page.navigate", { url: `http://127.0.0.1:${appPort}/` });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  for (const seeded of [true, false]) {
    const report = await evaluate(`(${scenario.toString()})(${seeded})`);
    console.log(JSON.stringify(report, null, 2));
    assert.equal(report.activeGateId, "gate-1");
    assert.equal(report.hasRow, true);
    assert.equal(report.companyScopeOpen, "true");
    assert.equal(report.productScopeOpen, "false");
    assert.equal(report.sections.find(([key]) => key === "site_audit")?.[2], true);
    assert.equal(report.rowVisible, true);
    assert.equal(report.rowExpanded, true);
    assert.equal(report.savedScopeOpen, true);
    assert.equal(report.savedCategoryOpen, true);
    assert.equal(report.selectedCategoryId, "author-clothes");
    assert.ok(report.rowTop >= -8 && report.rowTop <= 90, "Audit row is not in view");
    assert.ok(report.navigationMs !== null, "Audit row was not revealed after navigation");
    assert.ok(report.clickMs < 250, `Click blocked for ${report.clickMs.toFixed(1)} ms`);
  }
} finally {
  socket.close();
}
