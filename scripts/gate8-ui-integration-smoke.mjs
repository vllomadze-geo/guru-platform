import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const browserPort = process.env.GURU_CHROME_DEBUG_PORT || "9339";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate8-ui-integration-smoke";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 20000);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timeout); resolve(value); },
        reject: (error) => { clearTimeout(timeout); reject(error); },
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

let browser;
let page;
let browserContextId;
let targetId;
const evaluate = async (expression) => {
  const response = await page.call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
};
const waitFor = async (expression, timeout = 15000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timeout: ${expression}`);
};

try {
  const version = await (await fetch(`http://127.0.0.1:${browserPort}/json/version`)).json();
  browser = new Cdp(version.webSocketDebuggerUrl);
  await browser.ready;
  ({ browserContextId } = await browser.call("Target.createBrowserContext"));
  ({ targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId }));
  const targets = await (await fetch(`http://127.0.0.1:${browserPort}/json`)).json();
  page = new Cdp(targets.find((item) => item.id === targetId).webSocketDebuggerUrl);
  await page.ready;
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.call("Page.addScriptToEvaluateOnNewDocument", {
    source: `{
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes('/api/')
        ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmokeTest: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
        : nativeFetch(input, init);
    }`,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof g8AnalysisV3 === "function"');
  const seeded = await evaluate(`(() => {
    localStorage.clear();
    rememberAccessUnlocked();
    setAccessState(true);
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    projects = [{ id: ${JSON.stringify(projectId)}, name: "Gate 8 UI smoke", lifecycleStatus: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    activeProjectId = ${JSON.stringify(projectId)};
    state = createFreshWorkspace({ id: ${JSON.stringify(projectId)}, name: "Gate 8 UI smoke" });
    state.project.id = ${JSON.stringify(projectId)};
    state.project.companyGoalsV360 = [{ id: "main", is_primary: true, goalDescription: "Получить пять продаж", goalMetric: "sales", goalTargetValue: "5", goalDeadline: "2026-10-31", goalBudget: "10000", goalAllowedCost: "2500" }];
    state.project.goalMetric = "leads";
    state.project.goalTargetValue = "999";
    const sourceGoal = g8StrictGoalV3();
    els.launcher.hidden = true;
    els.appShell.hidden = false;
    activeView = "gate";
    activeGateId = "gate-8";
    renderGate();
    return { metric: sourceGoal.metric, target: sourceGoal.target };
  })()`);
  assert.deepEqual(seeded, { metric: "sales", target: 5 });
  await waitFor('document.querySelector(".g8-workbench")');
  const initial = await evaluate(`(() => ({
    scopes: [...document.querySelectorAll('.g8-workbench [data-gate0-section-heading]')].map((node) => node.dataset.gate0SectionHeading),
    startsWithCompany: document.querySelector('.g8-workbench')?.firstElementChild?.dataset.gateScope === 'company',
    redundantHeader: Boolean(document.querySelector('.g8-workbench-header')),
    toolbar: document.querySelector('#workspaceToolbar')?.dataset.guruCardControls,
    scenarioOpen: document.querySelector('[data-g8-v3-toggle="scenario"]')?.getAttribute('aria-expanded'),
    scenarioCards: document.querySelectorAll('[data-g8-v3-scenario-card]').length,
    lazyScenario: document.querySelector('#g8-workbench-scenario-body')?.dataset.g8V3Lazy,
    questions: [...document.querySelectorAll('[data-g8-audit-scope]')].map((scope) => [scope.dataset.g8AuditScope, scope.querySelectorAll('[data-g8-audit-question]').length]),
    companyGoalAudit: document.querySelector('[data-g8-audit-scope="company"] [data-g8-audit-question="1"] .g8-audit-copy p')?.textContent,
    productGoalAudit: document.querySelector('[data-g8-audit-scope="product"] [data-g8-audit-question="1"] .g8-audit-copy p')?.textContent,
    productBudgetAudit: document.querySelector('[data-g8-audit-scope="product"] [data-g8-audit-question="6"] .g8-audit-copy p')?.textContent,
    goal: document.querySelector('[data-g8-goal-scope="company"] .g8-goal-card-result > strong')?.textContent,
    productGoal: document.querySelector('[data-g8-goal-scope="product"] .g8-goal-card-result > strong')?.textContent,
    companyOrder: [...document.querySelector('[data-gate-scope="company"]').children].map((node) =>
      node.hasAttribute('data-gate0-section-heading') ? 'heading' :
        node.hasAttribute('data-g8-goal-scope') ? 'goal' :
          node.hasAttribute('data-g8-audit-scope') ? 'audit' :
            node.hasAttribute('data-g8-model-scope') ? 'model' : 'unknown'),
    productOrder: [...document.querySelector('[data-gate-scope="product"] .guru-product-scope-body-v230').children].map((node) =>
      node.hasAttribute('data-g8-goal-scope') ? 'goal' :
        node.hasAttribute('data-g8-audit-scope') ? 'audit' :
          node.hasAttribute('data-g8-model-scope') ? 'model' : 'unknown'),
    productSelectors: document.querySelectorAll('[data-gate0-scope-product-select="gate8-forecast"]').length,
    auditOpen: document.querySelectorAll('[data-g8-audit-detail][open]').length,
    auditSummaryFirst: [...document.querySelectorAll('[data-g8-audit-scope]')].every((node) =>
      Boolean(node.querySelector('.g8-audit-conclusion')?.compareDocumentPosition(node.querySelector('.g8-final-question-list')) & Node.DOCUMENT_POSITION_FOLLOWING)),
    companyScenarios: document.querySelectorAll('[data-g8-company-scenario]').length,
    companyOpen: [...document.querySelectorAll('[data-g8-company-section]')].map((node) => [node.dataset.g8CompanySection, node.open]),
  }))()`);
  assert.deepEqual(initial.scopes, ["company", "product"]);
  assert.equal(initial.startsWithCompany, true);
  assert.equal(initial.redundantHeader, false);
  assert.equal(initial.toolbar, "hidden");
  assert.equal(initial.scenarioOpen, "true");
  assert.equal(initial.scenarioCards, 5);
  assert.notEqual(initial.lazyScenario, "true");
  assert.equal(initial.companyScenarios, 5);
  assert.deepEqual(initial.questions, [["company", 7], ["product", 7]]);
  assert.match(initial.companyGoalAudit, /5 продаж/);
  assert.match(initial.productGoalAudit, /не выбран/);
  assert.doesNotMatch(initial.productGoalAudit, /5 продаж|999/);
  assert.match(initial.productBudgetAudit, /не выбран/);
  assert.match(initial.goal, /5 продаж/);
  assert.equal(initial.productGoal, "Выберите продукт");
  assert.deepEqual(initial.companyOrder, ["heading", "goal", "audit", "model"]);
  assert.deepEqual(initial.productOrder, ["goal", "audit", "model"]);
  assert.equal(initial.productSelectors, 1);
  assert.equal(initial.auditOpen, 0);
  assert.equal(initial.auditSummaryFirst, true);
  const auditDisclosure = await evaluate(`(async () => {
    const row = document.querySelector('[data-g8-audit-scope="company"] [data-g8-audit-question="2"]');
    row.querySelector('summary').click();
    await new Promise((resolve) => setTimeout(resolve, 80));
    const detail = row.querySelector('details');
    const opened = detail.open;
    const remembered = guruDisclosureOpenStateV512()[detail.dataset.guruDisclosureKeyV512];
    renderGate();
    const after = document.querySelector('[data-g8-audit-scope="company"] [data-g8-audit-question="2"] details');
    return { opened, remembered, afterRender: after?.open };
  })()`);
  assert.deepEqual(auditDisclosure, { opened: true, remembered: true, afterRender: true });
  const gateExport = await evaluate(`(() => {
    guruDebugEnsureToolbarButtonV119();
    const button = document.querySelector('#workspaceToolbar [data-debug-export-gate]');
    const originalDownload = guruDebugForceDownloadV119;
    let downloaded = false;
    guruDebugForceDownloadV119 = () => { downloaded = true; };
    try {
      button?.click();
      const payload = window.__guruLastGateContentExport?.payload;
      return { visible: Boolean(button && getComputedStyle(button).display !== 'none'), downloaded, gateId: payload?.exportedGateId, runtimeModel: payload?.diagnostics?.runtimeModel?.model || '' };
    } finally {
      guruDebugForceDownloadV119 = originalDownload;
    }
  })()`);
  assert.equal(gateExport.visible, true);
  assert.equal(gateExport.downloaded, true);
  assert.equal(gateExport.gateId, "gate-8");
  if (process.env.GURU_GATE8_SCREENSHOT) {
    const screenshot = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(process.env.GURU_GATE8_SCREENSHOT, Buffer.from(screenshot.data, "base64"));
  }
  const scope = await evaluate(`(() => {
    const root = document.querySelector('.g8-workbench');
    const button = document.querySelector('[data-gate0-section-toggle="product"]');
    button.click();
    const collapsed = document.querySelector('.guru-product-scope-body-v230')?.classList.contains('gate0-section-content-hidden');
    button.click();
    return { collapsed, reopened: !document.querySelector('.guru-product-scope-body-v230')?.classList.contains('gate0-section-content-hidden'), sameRoot: root === document.querySelector('.g8-workbench') };
  })()`);
  assert.deepEqual(scope, { collapsed: true, reopened: true, sameRoot: true });
  const details = await evaluate(`(() => {
    const root = document.querySelector('.g8-workbench');
    const before = [...document.querySelectorAll('.g8-inline-detail-body')].every((body) => body.hidden && !body.innerHTML.trim());
    document.querySelector('[data-g8-v3-toggle="data"]').click();
    document.querySelector('[data-g8-v3-toggle="history"]').click();
    return {
      before,
      open: [...document.querySelectorAll('.g8-inline-detail-body')].every((body) => !body.hidden && Boolean(body.innerHTML.trim())),
      rows: [...document.querySelectorAll('.g8-inline-detail')].map((detail) => ({ key: detail.dataset.g8V3Detail, open: detail.classList.contains('is-open'), expanded: detail.querySelector('button')?.getAttribute('aria-expanded'), hidden: detail.querySelector('.g8-inline-detail-body')?.hidden, length: detail.querySelector('.g8-inline-detail-body')?.innerHTML.length })),
      sameRoot: root === document.querySelector('.g8-workbench'),
    };
  })()`);
  assert.equal(details.before, true);
  assert.equal(details.open, true, `Inline details did not open: ${JSON.stringify(details)}`);
  assert.equal(details.sameRoot, true);
  const moreRecommendations = await evaluate(`(() => {
    const action = document.querySelector('[data-g8-v3-section="action"]');
    const sample = document.createElement('div');
    sample.innerHTML = '<button type="button" data-g8-v3-toggle="moreRecommendations" data-g8-v3-more-count="1" aria-expanded="false" aria-controls="g8-more-recommendations">Ещё 1 вывод ↓</button><div id="g8-more-recommendations" hidden>Дополнительный вывод</div>';
    action.querySelector('.g8-workbench-section-body').append(sample);
    sample.querySelector('button').click();
    const result = {
      visible: !sample.querySelector('#g8-more-recommendations').hidden,
      expanded: sample.querySelector('button').getAttribute('aria-expanded'),
      parentOpen: action.classList.contains('is-open'),
    };
    sample.remove();
    return result;
  })()`);
  assert.deepEqual(moreRecommendations, { visible: true, expanded: "true", parentOpen: true });

  const expanded = await evaluate(`(() => {
    const root = document.querySelector('.g8-workbench');
    return {
      sameRoot: root === document.querySelector('.g8-workbench'),
      cards: document.querySelectorAll('[data-g8-v3-scenario-card]').length,
      fields: document.querySelectorAll('[data-g8-v3-manual]').length,
      open: document.querySelector('[data-g8-v3-toggle="scenario"]')?.getAttribute('aria-expanded'),
    };
  })()`);
  assert.deepEqual(expanded, { sameRoot: true, cards: 5, fields: 7, open: "true" });
  await page.call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const mobile = await evaluate(`(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    wideCards: [...document.querySelectorAll('[data-g8-v3-scenario-card]')].filter((node) => node.getBoundingClientRect().right > window.innerWidth + 1).length,
  }))()`);
  assert.deepEqual(mobile, { overflow: false, wideCards: 0 });
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.call("Page.bringToFront");

  const edit = await evaluate(`(() => {
    const root = document.querySelector('.g8-workbench');
    const input = document.querySelector('[data-g8-v3-manual="budget"]');
    input.focus();
    input.value = '15000';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return {
      rootStillMounted: root === document.querySelector('.g8-workbench'),
      active: document.activeElement === input,
    };
  })()`);
  assert.deepEqual(edit, { rootStillMounted: true, active: true });
  await wait(350);
  const afterEdit = await evaluate(`(() => ({
    root: Boolean(document.querySelector('.g8-workbench')),
    value: document.querySelector('[data-g8-v3-manual="budget"]')?.value,
    focus: document.activeElement?.dataset?.g8V3Manual,
    persisted: JSON.parse(localStorage.getItem('guru-platform-workspace-v02-${projectId}')).gate8Forecast.manual.budget,
    persistedScenarioOpen: JSON.parse(localStorage.getItem('guru-platform-workspace-v02-${projectId}')).gate8Forecast.compactV3.open.scenario,
  }))()`);
  assert.equal(afterEdit.value, "15000");
  assert.equal(afterEdit.focus, "budget");
  assert.equal(afterEdit.persisted, "15000");
  assert.equal(afterEdit.persistedScenarioOpen, true);
  const rerendered = await evaluate(`(() => {
    renderGate();
    return { cards: document.querySelectorAll('[data-g8-v3-scenario-card]').length, budget: document.querySelector('[data-g8-v3-manual="budget"]')?.value };
  })()`);
  assert.deepEqual(rerendered, { cards: 5, budget: "15000" });

  const twoProducts = await evaluate(`(async () => {
    state.project.catalogItemsV189 = [
      { id: 'g8-a', name: 'Продукт А', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'g8-b', name: 'Продукт Б', createdAt: '2026-01-01T00:00:00Z' },
    ];
    state.project.gate0ScopeUiV194 = { ...(state.project.gate0ScopeUiV194 || {}), selectedProductId: 'g8-a' };
    state.gate4Production.forecastAssumptionsByProduct = {
      'g8-a': { budget: '10000' }, 'g8-b': { budget: '20000' },
    };
    state.gate5 = state.gate5 || {};
    state.gate5.campaignRegistry = [
      { id: 'g8-campaign-a', name: 'Кампания А', product_id: 'g8-a' },
      { id: 'g8-campaign-b', name: 'Кампания Б', product_id: 'g8-b' },
      { id: 'g8-unassigned', name: 'Без продукта' },
    ];
    state.gate5.periodSnapshots = [];
    state.gate5.links = [];
    for (const [product, campaign, sales] of [['a', 'g8-campaign-a', 4], ['b', 'g8-campaign-b', 6]]) {
      for (const [month, date] of [['05', '31'], ['06', '30'], ['07', '31']]) {
        const start = '2026-' + month + '-01';
        const end = '2026-' + month + '-' + date;
        state.gate5.periodSnapshots.push({ id: campaign + month, campaignId: campaign, reportType: 'perf', periodStart: start, periodEnd: end, spend: 10000, impressions: 10000, clicks: 1000, leads: 100 });
        state.gate5.links.push({ id: campaign + month, campaignId: campaign, periodStart: start, periodEnd: end, orders: sales, actualRevenue: sales * 10000 });
      }
    }
    state.gate5.periodSnapshots.push({ id: 'g8-unassigned-snapshot', campaignId: 'g8-unassigned', reportType: 'perf', periodStart: '2026-10-20', periodEnd: '2026-10-20', spend: 5000, clicks: 100, leads: 10 });
    state.gate5.goals = [{ id: 'goal-a', product_id: 'g8-a', metric: 'sales', targetValue: '4', deadline: '2026-10-31' }];
    const companyState = g8CompanyStateV4();
    companyState.periodStart = '2026-10-19';
    companyState.periodEnd = '2026-10-31';
    const first = g8CompanyAnalysisV4();
    const productA = g8AnalysisV3();
    const initial = { sales: first.totals.sales.value, spend: first.totals.spend.value,
      cpa: first.totals.cpa.value, complete: first.selected.complete,
      goal: productA.goal.target, productSales: productA.value,
      unassigned: first.commonExpenses.unassignedSpend, contributions: first.contributions.length };
    guruV194Ui(state).selectedProductId = 'g8-b';
    const second = g8CompanyAnalysisV4();
    const productB = g8AnalysisV3();
    const selection = { companySales: second.totals.sales.value, productSales: productB.value,
      productGoalValid: productB.goal.valid, selectedId: productB.context.product?.id };
    state.gate5.links.filter((row) => row.campaignId === 'g8-campaign-b').forEach((row) => { row.orders = 8; row.actualRevenue = 80000; });
    const changed = g8CompanyAnalysisV4();
    renderGate();
    const factualHistory = g8CompanySnapshotActualV4({ metric: 'sales',
      period: { start: '2026-05-01', end: '2026-05-31' },
      contributions: [{ product_id: 'g8-a', campaign_id: 'g8-campaign-a' },
        { product_id: 'g8-b', campaign_id: 'g8-campaign-b' }] });
    const historyBefore = g8CompanyStateV4().history.length;
    document.querySelector('[data-g8-company-subdetail="history"] > summary')?.click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    document.querySelector('[data-g8-company-snapshot]')?.click();
    const historyAfter = g8CompanyStateV4().history.length;
    const originalDownload = guruDebugForceDownloadV119;
    let downloaded = false;
    guruDebugForceDownloadV119 = () => { downloaded = true; };
    document.querySelector('#workspaceToolbar [data-debug-export-gate]')?.click();
    guruDebugForceDownloadV119 = originalDownload;
    const gatePayload = window.__guruLastGateContentExport?.payload;
    const fullPayload = guruExportProjectPayloadV223();
    const fullGate = fullPayload.gates.find((gate) => gate.exportedGateId === 'gate-8');
    return {
      initial, selection, changed: { companySales: changed.totals.sales.value, spend: changed.totals.spend.value },
      factualHistory, historyBefore, historyAfter,
      export: { downloaded, gateCompanySales: gatePayload?.resolvedForecast?.company?.totals?.sales?.value,
        gateProductId: gatePayload?.resolvedForecast?.product?.product_id,
        companyAuditCount: gatePayload?.resolvedForecast?.company?.audit?.length,
        productAuditCount: gatePayload?.resolvedForecast?.product?.audit?.length,
        fullCompanySales: fullGate?.resolvedForecast?.company?.totals?.sales?.value,
        fullContributions: fullGate?.resolvedForecast?.company?.contributions?.length },
      view: { companyCards: document.querySelectorAll('[data-g8-company-scenario]').length,
        productCards: document.querySelectorAll('[data-g8-v3-scenario-card]').length,
        productName: document.querySelector('.g8-company-contribution strong')?.textContent,
        auditCompanyBudgetStatus: document.querySelector('[data-g8-audit-scope="company"] [data-g8-audit-question="5"]')?.dataset.g8AuditStatus,
        auditProductGoalStatus: document.querySelector('[data-g8-audit-scope="product"] [data-g8-audit-question="1"]')?.dataset.g8AuditStatus,
        auditProductGoalAnswer: document.querySelector('[data-g8-audit-scope="product"] [data-g8-audit-question="1"] .g8-audit-copy p')?.textContent,
        productGoalCard: document.querySelector('[data-g8-goal-scope="product"] .g8-goal-card-result > strong')?.textContent,
        companyOpen: [...document.querySelectorAll('[data-g8-company-section]')].map((node) => [node.dataset.g8CompanySection, node.open]),
        storedOpen: g8CompanyStateV4().open },
    };
  })()`);
  assert.equal(twoProducts.initial.sales, 16);
  assert.equal(twoProducts.initial.spend, 30000);
  assert.equal(twoProducts.initial.cpa, 1875);
  assert.equal(twoProducts.initial.unassigned, 5000);
  assert.equal(twoProducts.initial.goal, 4);
  assert.equal(twoProducts.initial.productSales, 4);
  assert.equal(twoProducts.selection.companySales, 16);
  assert.equal(twoProducts.selection.productSales, 12);
  assert.equal(twoProducts.selection.productGoalValid, false);
  assert.equal(twoProducts.selection.selectedId, 'g8-b');
  assert.equal(twoProducts.changed.companySales, 20);
  assert.equal(twoProducts.changed.spend, 30000);
  assert.equal(twoProducts.factualHistory.value, 12);
  assert.equal(twoProducts.factualHistory.complete, true);
  assert.equal(twoProducts.historyAfter, twoProducts.historyBefore + 1);
  assert.deepEqual(twoProducts.export, { downloaded: true, gateCompanySales: 20, gateProductId: 'g8-b', companyAuditCount: 7, productAuditCount: 7, fullCompanySales: 20, fullContributions: 2 });
  assert.equal(twoProducts.view.companyCards, 5);
  assert.equal(twoProducts.view.productCards, 5);
  assert.equal(twoProducts.view.auditCompanyBudgetStatus, 'problem');
  assert.equal(twoProducts.view.auditProductGoalStatus, 'not_started');
  assert.match(twoProducts.view.auditProductGoalAnswer, /не задана/);
  assert.doesNotMatch(twoProducts.view.auditProductGoalAnswer, /5 продаж|4 продажи/);
  assert.equal(twoProducts.view.productGoalCard, "Отдельная цель продукта не задана");
  if (process.env.GURU_GATE8_PRODUCT_SCREENSHOT) {
    await evaluate('document.querySelector(`[data-gate-scope="product"]`).scrollIntoView({block:"start"}); true');
    await wait(120);
    const screenshot = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(process.env.GURU_GATE8_PRODUCT_SCREENSHOT, Buffer.from(screenshot.data, "base64"));
  }
  if (process.env.GURU_GATE8_AUDIT_SCREENSHOT) {
    await evaluate('document.querySelector(`[data-g8-audit-scope="company"]`).scrollIntoView({block:"start"}); true');
    await wait(120);
    const screenshot = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(process.env.GURU_GATE8_AUDIT_SCREENSHOT, Buffer.from(screenshot.data, "base64"));
  }
  const conflictingGoals = await evaluate(`(() => {
    guruV194Ui(state).selectedProductId = 'g8-a';
    state.gate5.goals.push({ id: 'goal-a-conflict', product_id: 'g8-a', metric: 'sales', targetValue: '7', deadline: '2026-10-31', createdAt: '2026-10-20T00:00:00Z' });
    renderGate();
    const row = document.querySelector('[data-g8-audit-scope="product"] [data-g8-audit-question="1"]');
    const result = { status: row?.dataset.g8AuditStatus, notice: row?.querySelector('.g8-audit-notice')?.textContent };
    state.gate5.goals = state.gate5.goals.filter((goal) => goal.id !== 'goal-a-conflict');
    guruV194Ui(state).selectedProductId = 'g8-b';
    renderGate();
    return result;
  })()`);
  assert.equal(conflictingGoals.status, 'problem');
  assert.match(conflictingGoals.notice, /несовпадающие цели/);
  assert.deepEqual(twoProducts.view.companyOpen, [['expect', true], ['action', true], ['scenario', true]]);
  const companyDisclosure = await evaluate(`(async () => {
    document.querySelector('[data-g8-company-section="expect"] > summary').click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const stored = g8CompanyStateV4().open.expect;
    renderGate();
    const rerendered = document.querySelector('[data-g8-company-section="expect"]').open;
    document.querySelector('[data-g8-company-section="expect"] > summary').click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    return { stored, rerendered, reopened: document.querySelector('[data-g8-company-section="expect"]').open };
  })()`);
  assert.deepEqual(companyDisclosure, { stored: false, rerendered: false, reopened: true });
  const selector = await evaluate(`(() => {
    const select = document.querySelector('[data-gate0-scope-product-select="gate8-forecast"]');
    const shared = Boolean(select && select.closest('[data-guru-product-context="gate8-forecast"]'));
    select.value = 'g8-a';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return { shared, selected: guruV194SelectedProduct(state)?.id,
      companySales: g8CompanyAnalysisV4().totals.sales.value,
      productSales: g8AnalysisV3().value,
      productGoalCard: document.querySelector('[data-g8-goal-scope="product"] .g8-goal-card-result > strong')?.textContent };
  })()`);
  assert.deepEqual(selector, { shared: true, selected: 'g8-a', companySales: 20, productSales: 4, productGoalCard: '4 продажи' });
  await page.call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const twoProductMobile = await evaluate(`(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    wideCompanyCards: [...document.querySelectorAll('[data-g8-company-scenario]')]
      .filter((node) => node.getBoundingClientRect().right > window.innerWidth + 1).length,
  }))()`);
  assert.deepEqual(twoProductMobile, { overflow: false, wideCompanyCards: 0 });
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  if (process.env.GURU_GATE8_COMPANY_SCREENSHOT) {
    await evaluate('window.scrollTo(0, 0); true');
    await wait(150);
    const screenshot = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(process.env.GURU_GATE8_COMPANY_SCREENSHOT, Buffer.from(screenshot.data, "base64"));
  }
  const missingSource = await evaluate(`(() => {
    delete state.gate4Production.forecastAssumptionsByProduct['g8-b'].budget;
    state.gate5.links = state.gate5.links.filter((row) => row.campaignId !== 'g8-campaign-b');
    renderGate();
    const analysis = g8CompanyAnalysisV4();
    const source = [...document.querySelectorAll('[data-gate-scope="company"] .g8-required-row')]
      .find((row) => row.textContent.includes('Продукт Б: бюджет продукта'))
      ?.querySelector('[data-g8-v3-source]');
    guruV194Ui(state).selectedProductId = 'g8-b';
    guruInvalidateGateViewCache();
    renderGate();
    const productBudgetAnswer = document.querySelector('[data-g8-audit-scope="product"] [data-g8-audit-question="6"] .g8-audit-copy p')?.textContent;
    guruV194Ui(state).selectedProductId = 'g8-a';
    guruInvalidateGateViewCache();
    renderGate();
    return { partial: !analysis.selected.complete,
      remainingSales: analysis.totals.sales.value,
      status: document.querySelector('.g8-company-status strong')?.textContent,
      missingKeys: analysis.missing.filter((row) => row.productId === 'g8-b').map((row) => row.key),
      budgetTarget: JSON.parse(source?.dataset.g8V3Source || '{}'), productBudgetAnswer };
  })()`);
  assert.equal(missingSource.partial, true);
  assert.equal(missingSource.remainingSales, 4);
  assert.equal(missingSource.status, 'Частичный прогноз');
  assert.match(missingSource.productBudgetAnswer, /Бюджет продукта: не указан/);
  assert.doesNotMatch(missingSource.productBudgetAnswer, /10 000/);
  assert(missingSource.missingKeys.includes('leadToSale'));
  assert.deepEqual({ gateId: missingSource.budgetTarget.gateId, field: missingSource.budgetTarget.field, productId: missingSource.budgetTarget.productId },
    { gateId: 'gate-4', field: 'budget', productId: 'g8-b' });
  const goalSource = await evaluate(`(async () => {
    state.project.companyGoalsV360[0].goalTargetValue = '';
    renderGate();
    const button = [...document.querySelectorAll('[data-gate-scope="company"] .g8-required-row')]
      .find((row) => row.textContent.includes('Измеримая цель компании'))
      ?.querySelector('[data-g8-v3-source]');
    const target = JSON.parse(button?.dataset.g8V3Source || '{}');
    button?.click();
    await new Promise((resolve) => setTimeout(resolve, 180));
    return { ...target, reached: activeGateId === 'gate-0' && Boolean(document.querySelector('[data-g8-company-goal-field="goalTargetValue"]')) };
  })()`);
  assert.deepEqual({ gateId: goalSource.gateId, kind: goalSource.kind, field: goalSource.field },
    { gateId: 'gate-0', kind: 'gate0-company-goal', field: 'goalTargetValue' });
  assert.equal(goalSource.reached, true);

  const auditGoalLink = await evaluate(`(async () => {
    activeGateId = 'gate-8';
    guruV194Ui(state).selectedProductId = 'g8-a';
    renderGate();
    const row = document.querySelector('[data-g8-audit-scope="product"] [data-g8-audit-question="1"]');
    row.querySelector('summary').click();
    const button = row.querySelector('[data-g8-audit-source]');
    const target = JSON.parse(button.dataset.g8AuditSource);
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 200));
    return { target, gate: activeGateId, exactRecord: Boolean(document.querySelector('[data-g5-goal-record="goal-a"]')),
      registry: Boolean(document.querySelector('[data-g5-goal-registry]')) };
  })()`);
  assert.equal(auditGoalLink.gate, 'gate-5');
  assert.equal(auditGoalLink.target.kind, 'gate5-goal-v1');
  assert.equal(auditGoalLink.target.productId, 'g8-a');
  assert.equal(auditGoalLink.exactRecord, true);
  const comparisonLink = await evaluate(`(async () => {
    activeGateId = 'gate-8';
    guruV194Ui(state).selectedProductId = 'g8-b';
    guruInvalidateGateViewCache();
    renderGate();
    const row = document.querySelector('[data-g8-audit-scope="product"] [data-g8-audit-question="4"]');
    row.querySelector('summary').click();
    row.querySelector('[data-g8-audit-expand]').click();
    const button = [...row.querySelectorAll('[data-g8-audit-source]')].find((node) => JSON.parse(node.dataset.g8AuditSource).kind === 'gate1-project-comparison');
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 180));
    return { gate: activeGateId, product: guruV194SelectedProduct(state)?.id,
      source: Boolean(document.querySelector('[data-project-comparison-product="g8-b"]')),
      opened: Boolean(state.projectComparison?.productsById?.['g8-b']?.open) };
  })()`);
  assert.deepEqual(comparisonLink, { gate: 'gate-1', product: 'g8-b', source: true, opened: true });

  const otherGate = await evaluate(`(() => {
    activeGateId = 'gate-0';
    renderGate();
    return document.querySelector('#workspaceToolbar')?.dataset.guruCardControls;
  })()`);
  assert.equal(otherGate, "visible");
  console.log(JSON.stringify({ initial, gateExport, scope, details, moreRecommendations, expanded, mobile, edit, afterEdit, rerendered, twoProducts, conflictingGoals, companyDisclosure, selector, twoProductMobile, missingSource, goalSource, auditGoalLink, comparisonLink, otherGate }, null, 2));
} finally {
  if (page) page.close();
  if (browser && targetId) await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  if (browser && browserContextId) await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  if (browser) browser.close();
}
