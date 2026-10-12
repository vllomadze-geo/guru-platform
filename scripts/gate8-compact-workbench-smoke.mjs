import { mkdir, readFile, writeFile } from "node:fs/promises";

const sourcePath = process.env.GURU_PROJECT_EXPORT || "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9339";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate8-compact-workbench-smoke";
const goatId = "catalog-item-1786792591872-51f503";
const shirtId = "catalog-item-1786792591872-c8b1e9";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

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
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const fixture = JSON.parse(await readFile(sourcePath, "utf8")).workspace;
assert(fixture?.project?.catalogItemsV189?.some((item) => item.id === goatId), "Goat product is absent in fixture");

let browser;
let page;
let browserContextId = "";
let targetId = "";
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
  const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
  browser = new Cdp(version.webSocketDebuggerUrl);
  await browser.ready;
  ({ browserContextId } = await browser.call("Target.createBrowserContext"));
  ({ targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId }));
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
  const target = targets.find((item) => item.id === targetId);
  page = new Cdp(target.webSocketDebuggerUrl);
  await page.ready;
  await page.call("Runtime.enable");
  await page.call("Page.enable");
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
  await evaluate(`(() => {
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{ id: ${JSON.stringify(projectId)}, name: "Gate 8 compact smoke", lifecycleStatus: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }]));
    return true;
  })()`);
  await page.call("Page.navigate", { url: `${appUrl}?gate8-reload-smoke=${Date.now()}` });
  await waitFor(`document.querySelector('[data-open-project="${projectId}"]')`);
  await evaluate(`openProject(${JSON.stringify(projectId)}); true`);
  await waitFor(`activeProjectId === ${JSON.stringify(projectId)} && Boolean(state)`);
  await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    state = structuredClone(${JSON.stringify(fixture)});
    state.project.id = ${JSON.stringify(projectId)};
    const product = state.project.catalogItemsV189.find((item) => item.id === ${JSON.stringify(goatId)});
    state.project.gate0ScopeUiV194 = { ...(state.project.gate0ScopeUiV194 || {}), selectedCategoryId: product.categoryId, selectedProductId: product.id };
    Object.assign(state.project, {
      goalDescription: "Получить 5 продаж",
      goalMetric: "sales",
      goalTargetValue: "5",
      goalDeadline: "2026-10-31",
      goalBudget: "999999",
      goalAllowedCost: "100"
    });
    state.gate5 = state.gate5 || {};
    state.gate5.campaignRegistry = (state.gate5.campaignRegistry || []).filter((row) => row.id !== "g8-v3-campaign");
    state.gate5.campaignRegistry.push({ id: "g8-v3-campaign", cabinetId: "g8-v3-cabinet", name: "G8 factual campaign", product_id: product.id, productId: product.id });
    state.gate5.periodSnapshots = (state.gate5.periodSnapshots || []).filter((row) => row.campaignId !== "g8-v3-campaign");
    state.gate5.periodSnapshots.push(
      { id: "g8-v3-p1", campaignId: "g8-v3-campaign", reportType: "perf", periodStart: "2026-05-01", periodEnd: "2026-05-31", spend: 10000, impressions: 10000, clicks: 1000, leads: 100, createdAt: "2026-05-31T12:00:00Z" },
      { id: "g8-v3-p2", campaignId: "g8-v3-campaign", reportType: "perf", periodStart: "2026-06-01", periodEnd: "2026-06-30", spend: 10000, impressions: 11000, clicks: 1000, leads: 100, createdAt: "2026-06-30T12:00:00Z" },
      { id: "g8-v3-p3", campaignId: "g8-v3-campaign", reportType: "perf", periodStart: "2026-07-01", periodEnd: "2026-07-31", spend: 10000, impressions: 12000, clicks: 1000, leads: 100, createdAt: "2026-07-31T12:00:00Z" }
    );
    state.gate5.links = (state.gate5.links || []).filter((row) => row.campaignId !== "g8-v3-campaign");
    state.gate5.links.push(
      { id: "g8-v3-l1", campaignId: "g8-v3-campaign", periodStart: "2026-05-01", periodEnd: "2026-05-31", leads: 100, orders: 3, actualRevenue: 30000, updatedAt: "2026-05-31T12:00:00Z" },
      { id: "g8-v3-l2", campaignId: "g8-v3-campaign", periodStart: "2026-06-01", periodEnd: "2026-06-30", leads: 100, orders: 4, actualRevenue: 40000, updatedAt: "2026-06-30T12:00:00Z" },
      { id: "g8-v3-l3", campaignId: "g8-v3-campaign", periodStart: "2026-07-01", periodEnd: "2026-07-31", leads: 100, orders: 5, actualRevenue: 50000, updatedAt: "2026-07-31T12:00:00Z" }
    );
    state.gate4Production = state.gate4Production || {};
    state.gate4Production.forecastAssumptionsByProduct = state.gate4Production.forecastAssumptionsByProduct || {};
    state.gate4Production.forecastAssumptionsByProduct[product.id] = { product_id: product.id, budget: "10000", updatedAt: new Date().toISOString() };
    prepareSystemCards(state);
    const data = ensureGate8Workspace();
    data.resultMetric = "sales";
    const compact = g8CompactStateV3(product, g8StrictGoalV3());
    Object.assign(compact, { campaignId: "g8-v3-campaign", periodStart: "2026-10-01", periodEnd: "2026-10-31", scenario: "base" });
    saveState();
    activeView = "gate";
    activeGateId = "gate-8";
    renderGate();
    return true;
  })()`);
  await waitFor('document.querySelector(".g8-workbench")');

  const baseline = await evaluate(`(() => {
    const a = g8Analysis();
    return {
      primary: document.querySelectorAll('.g8-workbench-section.is-primary').length,
      secondary: document.querySelectorAll('.g8-workbench-section.is-secondary').length,
      titles: [...document.querySelectorAll('.g8-workbench-section.is-primary > .g8-workbench-section-head > span:first-child')].map((node) => node.textContent.trim()),
      nestedDetails: [...document.querySelectorAll('.g8-inline-detail-toggle')].map((node) => node.textContent.replace(/[↑↓]/g, '').trim()),
      blockStatusPills: document.querySelectorAll('.g8-workbench-section.is-primary > .g8-workbench-section-head .status-pill').length,
      open: [...document.querySelectorAll('.g8-workbench-section.is-primary')].map((row) => row.classList.contains('is-open')),
      scenarioNames: [...document.querySelectorAll('[data-g8-v3-scenario-card] > header strong')].map((node) => node.textContent.trim()),
      scenarioSelects: document.querySelectorAll('[data-g8-v3-context="scenario"]').length,
      scenarioToggle: document.querySelectorAll('[data-g8-v3-toggle="scenario"]').length,
      customFields: document.querySelectorAll('[data-g8-v3-scenario-card="custom"] [data-g8-v3-manual]').length,
      customPrompt: document.querySelector('[data-g8-v3-scenario-card="custom"]')?.textContent.includes('Задайте условия') || false,
      customEmptyErrors: document.querySelectorAll('[data-g8-v3-scenario-card="custom"] .g8-scenario-field.is-error').length,
      customEmptyBackground: getComputedStyle(document.querySelector('[data-g8-v3-scenario-card="custom"] [data-g8-v3-manual="budget"]')).backgroundColor,
      scenarioValues: Object.fromEntries(Object.entries(a.scenarioResults).map(([key, row]) => [key, row.value])),
      groundedPresets: ["favorable", "unfavorable", "stress"].every((key) => a.scenarioResults[key].definition.changes.length > 0 && a.scenarioResults[key].definition.changes.every((row) => /Gate 5/.test(row.basis))),
      sales: a.value,
      cpa: a.calculation.values.cpa,
      range: a.range,
      probability: a.probability,
      benchmark: a.forecastCore.benchmarkUsed,
      observations: a.observations.length,
      budget: a.parameters.budget.value,
      companyGoalBudget: a.goal.budget,
      history: a.data.history.length,
      mode: a.reliability.mode,
      readinessUnits: g8BlockStatuses().length,
      calculationState: g8CalculationStateV3(a),
      sidebarState: document.querySelector('[data-gate-id="gate-8"] .small')?.textContent.trim() || ''
    };
  })()`);
  assert(baseline.primary === 3 && baseline.secondary === 0, `Wrong Gate 8 structure: ${JSON.stringify(baseline)}`);
  assert(JSON.stringify(baseline.titles) === JSON.stringify(["Чего ожидать", "Что сделать", "Что изменится, если…"]), `Wrong primary block order: ${JSON.stringify(baseline)}`);
  assert(JSON.stringify(baseline.nestedDetails) === JSON.stringify(["Данные и расчёт", "История: прогноз и факт"]), `Data/history are not nested controls: ${JSON.stringify(baseline)}`);
  assert(baseline.blockStatusPills === 0, "Per-block status pills still exist");
  assert(JSON.stringify(baseline.open) === JSON.stringify([true, true, true]), `Wrong disclosure defaults: ${JSON.stringify(baseline.open)}`);
  assert(JSON.stringify(baseline.scenarioNames) === JSON.stringify(["Базовый", "Благоприятный", "Неблагоприятный", "Стрессовый", "Пользовательский"]), `Not all scenarios are simultaneously visible: ${JSON.stringify(baseline)}`);
  assert(baseline.scenarioSelects === 0 && baseline.scenarioToggle === 0 && baseline.customFields === 7 && baseline.customPrompt, `Scenario switching or hidden custom fields remain: ${JSON.stringify(baseline)}`);
  assert(baseline.customEmptyErrors === 0 && baseline.customEmptyBackground === "rgb(255, 255, 255)", `Empty custom fields are incorrectly presented as errors: ${JSON.stringify(baseline)}`);
  assert(baseline.scenarioValues.base === baseline.sales && ["favorable", "unfavorable", "stress"].every((key) => Number.isFinite(baseline.scenarioValues[key])) && baseline.groundedPresets, `Scenario calculations are disconnected or ungrounded: ${JSON.stringify(baseline)}`);
  assert(Math.abs(baseline.sales - 4) < 0.0001 && Math.abs(baseline.cpa - 2500) < 0.0001, `Factual CPA forecast is wrong: ${JSON.stringify(baseline)}`);
  assert(baseline.range.available && baseline.range.observations === 3, "Empirical range is missing");
  assert(baseline.probability.available && baseline.benchmark === false, "Probability basis or hidden benchmark is wrong");
  assert(baseline.budget === 10000 && baseline.companyGoalBudget === 999999, "Company budget leaked into product forecast");
  assert(baseline.readinessUnits === 1, "Gate 8 readiness is still derived from section count");
  assert(baseline.calculationState.label === baseline.sidebarState, `Sidebar and screen state differ: ${JSON.stringify(baseline)}`);
  const sourceRoutes = await evaluate(`(() => {
    const analysis = g8Analysis();
    const missingAnalysis = { ...analysis, parameters: {} };
    const pick = (key) => {
      const target = g8SourceTargetV3({ key }, missingAnalysis);
      return [target.gateId, target.kind, target.field || target.calculatorPath || target.block || ""];
    };
    return {
      budget: pick("budget"),
      cpc: pick("cpc"),
      clickToLead: pick("clickToLead"),
      leadToSale: pick("leadToSale"),
      averageCheck: pick("averageCheck"),
      margin: pick("margin"),
      salesForCpa: pick("salesForCpa"),
      campaign: pick("campaign"),
      period: pick("period"),
    };
  })()`);
  assert(JSON.stringify(sourceRoutes) === JSON.stringify({
    budget: ["gate-4", "gate4-forecast-input-v3", "budget"],
    cpc: ["gate-4", "gate4-forecast-input-v3", "cpc"],
    clickToLead: ["gate-4", "gate4-forecast-input-v3", "siteConversion"],
    leadToSale: ["gate-4", "gate4-forecast-input-v3", "saleConversion"],
    averageCheck: ["gate-1", "gate1-unit-calculator-v3", "pricing.actual"],
    margin: ["gate-1", "gate1-unit-calculator-v3", ""],
    salesForCpa: ["gate-5", "gate5-import-v3", "input"],
    campaign: ["gate-8", "gate8-context-v3", "campaignId"],
    period: ["gate-8", "gate8-context-v3", "periodStart"],
  }), `Source routes are not exact: ${JSON.stringify(sourceRoutes)}`);
  console.log("gate8-smoke: baseline");
  const screenshot = await page.call("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: true });
  await mkdir(new URL("../artifacts/", import.meta.url), { recursive: true });
  await writeFile(new URL("../artifacts/gate8-compact-workbench.png", import.meta.url), Buffer.from(screenshot.data, "base64"));
  await page.call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await wait(150);
  const mobile = await evaluate(`(() => ({
    cards: document.querySelectorAll('[data-g8-v3-scenario-card]').length,
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    wideCards: [...document.querySelectorAll('[data-g8-v3-scenario-card]')].filter((node) => node.getBoundingClientRect().right > window.innerWidth + 1).length,
  }))()`);
  const mobileScreenshot = await page.call("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  await writeFile(new URL("../artifacts/gate8-scenarios-mobile.png", import.meta.url), Buffer.from(mobileScreenshot.data, "base64"));
  await page.call("Emulation.clearDeviceMetricsOverride");
  assert(mobile.cards === 5 && !mobile.overflow && mobile.wideCards === 0, `Scenario list has mobile horizontal overflow: ${JSON.stringify(mobile)}`);

  const currentPeriod = await evaluate(`(() => {
    state.gate5.periodSnapshots.push(
      { id: "g8-v3-current", campaignId: "g8-v3-campaign", reportType: "perf", periodStart: "2026-09-01", periodEnd: "2026-09-05", spend: 2000, impressions: 2000, clicks: 200, leads: 20, createdAt: "2026-09-05T12:00:00Z" },
      { id: "g8-v3-current-duplicate", campaignId: "g8-v3-campaign", reportType: "query", periodStart: "2026-09-01", periodEnd: "2026-09-05", spend: 900000, impressions: 900000, clicks: 90000, leads: 9000, createdAt: "2026-09-05T13:00:00Z" }
    );
    state.gate5.links.push({ id: "g8-v3-current-link", campaignId: "g8-v3-campaign", periodStart: "2026-09-01", periodEnd: "2026-09-05", leads: 20, orders: 2, actualRevenue: 20000, updatedAt: "2026-09-05T12:00:00Z" });
    const compact = g8CompactStateV3(guruV194SelectedProduct(state), g8StrictGoalV3());
    compact.periodStart = "2026-09-01";
    compact.periodEnd = "2026-09-30";
    const a = g8Analysis();
    const result = { actualSpend: a.calculation.actualSpend, remainingSpend: a.calculation.futureSpend, totalSpend: a.calculation.totalSpend, actualSales: a.actual.sales.value, sales: a.value };
    compact.periodStart = "2026-10-01";
    compact.periodEnd = "2026-10-31";
    return result;
  })()`);
  assert(currentPeriod.actualSpend === 2000 && currentPeriod.remainingSpend === 8000 && currentPeriod.totalSpend === 10000, `Current-period budget handling is wrong: ${JSON.stringify(currentPeriod)}`);
  assert(currentPeriod.actualSales === 2 && currentPeriod.sales > 2 && currentPeriod.sales < 10, `Actual result was lost or duplicated: ${JSON.stringify(currentPeriod)}`);
  console.log("gate8-smoke: current-period");

  const cplAssumptionRoute = await evaluate(`(() => {
    const product = guruV194SelectedProduct(state);
    const compact = g8CompactStateV3(product, g8StrictGoalV3());
    const context = g8CampaignContextV3(product, compact);
    state.gate4Production.forecastAssumptionsByProduct[product.id].cpl = "1000";
    const bundle = g8ParameterBundleV3(product, context, []);
    const calculation = g8ComputeV3(bundle.parameters, g8ActualForPeriodV3([], "", ""), { start: compact.periodStart, end: compact.periodEnd });
    delete state.gate4Production.forecastAssumptionsByProduct[product.id].cpl;
    return { leads: calculation.values.leads, route: calculation.route, kind: bundle.parameters.cpl.kind };
  })()`);
  assert(cplAssumptionRoute.leads === 10 && /CPL/.test(cplAssumptionRoute.route) && cplAssumptionRoute.kind === "assumption", `Gate 4 CPL assumption route is disconnected: ${JSON.stringify(cplAssumptionRoute)}`);

  const noHistorySideEffect = await evaluate(`(() => { renderGate(); renderGate(); return ensureGate8Workspace().history.length; })()`);
  assert(noHistorySideEffect === baseline.history, "Render still creates forecast history automatically");

  const directBudgetSource = await evaluate(`(async () => {
    const productId = ${JSON.stringify(goatId)};
    const beforeTasks = ensureGate7State().tasks.length;
    delete state.gate4Production.forecastAssumptionsByProduct[productId].budget;
    activeView = "gate"; activeGateId = "gate-8"; renderGate();
    const rows = [...document.querySelectorAll('[data-g8-v3-required-key="budget"]')];
    const duplicateCount = rows.length;
    rows[0]?.querySelector('[data-g8-v3-source]')?.click();
    await new Promise((resolve) => setTimeout(resolve, 350));
    const input = document.querySelector('[data-g4-forecast-input-v3="budget"][data-g4-forecast-product-v3="' + CSS.escape(productId) + '"]');
    const reached = activeGateId === "gate-4" && Boolean(input);
    const highlighted = Boolean(input?.closest('.guru-source-target-v212'));
    if (input) {
      input.value = "12000";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
    guruNavigateToGate("gate-8");
    await new Promise((resolve) => setTimeout(resolve, 100));
    const after = g8Analysis();
    const result = {
      duplicateCount,
      reached,
      highlighted,
      selectedProduct: guruV194SelectedProduct(state)?.id || "",
      budget: after.parameters.budget.value,
      value: after.value,
      tasksBefore: beforeTasks,
      tasksAfter: ensureGate7State().tasks.length,
      remainingWarnings: document.querySelectorAll('[data-g8-v3-required-key="budget"]').length,
      scenarioValues: Object.fromEntries(["base", "favorable", "unfavorable", "stress"].map((key) => [key, after.scenarioResults[key].value])),
    };
    state.gate4Production.forecastAssumptionsByProduct[productId].budget = "10000";
    return result;
  })()`);
  assert(directBudgetSource.duplicateCount === 1 && directBudgetSource.reached && directBudgetSource.highlighted, `Budget source is not exact and highlighted: ${JSON.stringify(directBudgetSource)}`);
  assert(directBudgetSource.selectedProduct === goatId && directBudgetSource.budget === 12000 && Number.isFinite(directBudgetSource.value), `Budget edit did not refresh forecast context: ${JSON.stringify(directBudgetSource)}`);
  assert(["base", "favorable", "unfavorable", "stress"].every((key) => directBudgetSource.scenarioValues[key] > baseline.scenarioValues[key]), `Source change did not refresh every calculated scenario: ${JSON.stringify(directBudgetSource)}`);
  assert(directBudgetSource.tasksBefore === directBudgetSource.tasksAfter && directBudgetSource.remainingWarnings === 0, `Data correction created a task or stale warning: ${JSON.stringify(directBudgetSource)}`);

  const missingConversion = await evaluate(`(() => {
    state.gate5.links = state.gate5.links.filter((row) => row.campaignId !== "g8-v3-campaign");
    renderGate();
    const a = g8Analysis();
    return {
      sales: a.value,
      clicks: a.calculation.values.clicks,
      leads: a.calculation.values.leads,
      available: a.forecastCore.available,
      missingKeys: a.missingData.map((row) => row.key),
      recommendationIds: a.recommendations.map((row) => row.id),
      requiredRows: document.querySelectorAll('.g8-required-row').length,
      emptyResultCard: Boolean(document.querySelector('.g8-expect-main')),
      scenarioCards: document.querySelectorAll('[data-g8-v3-scenario-card]').length,
      oldDeadEnd: document.body.textContent.includes('Сценарный пересчёт пока недоступен'),
    };
  })()`);
  assert(missingConversion.sales === null || Number.isNaN(missingConversion.sales), `Sales were invented without conversion: ${JSON.stringify(missingConversion)}`);
  assert(Number.isFinite(missingConversion.clicks) && Number.isFinite(missingConversion.leads) && !missingConversion.available, "Intermediate result disappeared with missing sales conversion");
  assert(missingConversion.requiredRows === new Set(missingConversion.missingKeys).size && !missingConversion.recommendationIds.some((id) => id.startsWith("missing-")), `Missing values are duplicated or leaked into recommendations: ${JSON.stringify(missingConversion)}`);
  assert(missingConversion.emptyResultCard === false, "Empty forecast result card is still rendered");
  assert(missingConversion.scenarioCards === 5 && !missingConversion.oldDeadEnd, `Missing inputs hide scenarios or show the old dead end: ${JSON.stringify(missingConversion)}`);
  console.log("gate8-smoke: missing-and-zero-inputs");

  const zeroConversion = await evaluate(`(() => {
    state.gate5.links.push(
      { id: "g8-v3-l1z", campaignId: "g8-v3-campaign", periodStart: "2026-05-01", periodEnd: "2026-05-31", leads: 100, orders: 0, actualRevenue: 0, updatedAt: "2026-05-31T13:00:00Z" },
      { id: "g8-v3-l2z", campaignId: "g8-v3-campaign", periodStart: "2026-06-01", periodEnd: "2026-06-30", leads: 100, orders: 0, actualRevenue: 0, updatedAt: "2026-06-30T13:00:00Z" },
      { id: "g8-v3-l3z", campaignId: "g8-v3-campaign", periodStart: "2026-07-01", periodEnd: "2026-07-31", leads: 100, orders: 0, actualRevenue: 0, updatedAt: "2026-07-31T13:00:00Z" }
    );
    const a = g8Analysis();
    return { sales: a.value, cpa: a.calculation.values.cpa, leadToSale: a.parameters.leadToSale.value, cpaSource: a.parameters.cpa };
  })()`);
  assert(zeroConversion.sales === 0 && zeroConversion.leadToSale === 0, `Measured zero was treated as missing: ${JSON.stringify(zeroConversion)}`);
  assert(zeroConversion.cpa === null || Number.isNaN(zeroConversion.cpa), "CPA was calculated from zero sales");

  const invalidBudget = await evaluate(`(() => {
    state.gate4Production.forecastAssumptionsByProduct[${JSON.stringify(goatId)}].budget = "-9";
    const a = g8Analysis();
    renderGate();
    const result = {
      value: a.value,
      errors: a.calculation.errors.map((row) => row.reason),
      status: getGate8Status(a),
      stateLabel: g8CalculationStateV3(a).label,
      budgetRows: document.querySelectorAll('[data-g8-v3-required-key="budget"]').length,
      copy: document.querySelector('[data-g8-v3-required-key="budget"] span')?.textContent || "",
    };
    state.gate4Production.forecastAssumptionsByProduct[${JSON.stringify(goatId)}].budget = "10000";
    return result;
  })()`);
  assert(invalidBudget.errors.some((text) => /Отрицательное/.test(text)) && invalidBudget.status === "problem" && invalidBudget.stateLabel === "Требуется исправить данные", `Negative budget was not rejected: ${JSON.stringify(invalidBudget)}`);
  assert(invalidBudget.budgetRows === 1 && /отрицательное/i.test(invalidBudget.copy), `Invalid budget is not distinguished or is duplicated: ${JSON.stringify(invalidBudget)}`);

  const scenario = await evaluate(`(async () => {
    state.gate5.links = state.gate5.links.filter((row) => row.campaignId !== "g8-v3-campaign");
    state.gate5.links.push(
      { id: "g8-v3-custom-l1", campaignId: "g8-v3-campaign", periodStart: "2026-05-01", periodEnd: "2026-05-31", leads: 100, orders: 3, actualRevenue: 30000, updatedAt: "2026-05-31T13:30:00Z" },
      { id: "g8-v3-custom-l2", campaignId: "g8-v3-campaign", periodStart: "2026-06-01", periodEnd: "2026-06-30", leads: 100, orders: 4, actualRevenue: 40000, updatedAt: "2026-06-30T13:30:00Z" },
      { id: "g8-v3-custom-l3", campaignId: "g8-v3-campaign", periodStart: "2026-07-01", periodEnd: "2026-07-31", leads: 100, orders: 5, actualRevenue: 50000, updatedAt: "2026-07-31T13:30:00Z" }
    );
    renderGate();
    const input = document.querySelector('[data-g8-v3-scenario-card="custom"] [data-g8-v3-manual="budget"]');
    input.value = "12000";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 350));
    const a = g8Analysis();
    return {
      customSpend: a.scenarioResults.custom.calculation?.totalSpend,
      customValue: a.scenarioResults.custom.value,
      baseValue: a.value,
      sourceBudget: state.gate4Production.forecastAssumptionsByProduct[${JSON.stringify(goatId)}].budget,
      savedInput: ensureGate8Workspace().manual.budget,
      cards: document.querySelectorAll('[data-g8-v3-scenario-card]').length,
    };
  })()`);
  assert(scenario.customSpend === 12000 && scenario.customValue === 4.8 && scenario.baseValue === 4 && scenario.sourceBudget === "10000" && scenario.savedInput === "12000" && scenario.cards === 5, `Custom scenario did not recalculate independently: ${JSON.stringify(scenario)}`);

  const invalidCustom = await evaluate(`(async () => {
    let input = document.querySelector('[data-g8-v3-scenario-card="custom"] [data-g8-v3-manual="budget"]');
    input.value = "-1";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 350));
    const invalid = g8Analysis();
    const result = {
      customAvailable: invalid.scenarioResults.custom.available,
      customError: document.querySelectorAll('[data-g8-v3-scenario-card="custom"] .g8-scenario-field.is-error').length,
      customMessage: document.querySelector('[data-g8-v3-scenario-card="custom"] .g8-scenario-unavailable')?.textContent || "",
      baseValue: invalid.value,
      favorableValue: invalid.scenarioResults.favorable.value,
      sourceBudget: state.gate4Production.forecastAssumptionsByProduct[${JSON.stringify(goatId)}].budget,
    };
    input = document.querySelector('[data-g8-v3-scenario-card="custom"] [data-g8-v3-manual="budget"]');
    input.value = "12000";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 350));
    return result;
  })()`);
  assert(!invalidCustom.customAvailable && invalidCustom.customError === 1 && /Отрицательное значение недопустимо/.test(invalidCustom.customMessage) && invalidCustom.baseValue === 4 && Number.isFinite(invalidCustom.favorableValue) && invalidCustom.sourceBudget === "10000", `Invalid custom input leaked into facts or other scenarios: ${JSON.stringify(invalidCustom)}`);

  const taskDedup = await evaluate(`(() => {
    state.gate5.links.push(
      { id: "g8-v3-l1-restored", campaignId: "g8-v3-campaign", periodStart: "2026-05-01", periodEnd: "2026-05-31", leads: 100, orders: 3, actualRevenue: 30000, updatedAt: "2026-05-31T14:00:00Z" },
      { id: "g8-v3-l2-restored", campaignId: "g8-v3-campaign", periodStart: "2026-06-01", periodEnd: "2026-06-30", leads: 100, orders: 4, actualRevenue: 40000, updatedAt: "2026-06-30T14:00:00Z" },
      { id: "g8-v3-l3-restored", campaignId: "g8-v3-campaign", periodStart: "2026-07-01", periodEnd: "2026-07-31", leads: 100, orders: 5, actualRevenue: 50000, updatedAt: "2026-07-31T14:00:00Z" }
    );
    let economics = gate8ExactEconomicsV230(${JSON.stringify(goatId)});
    if (!economics.item) {
      const item = uv130ActiveEntries()[0]?.item || uv130BlankItem();
      item.sourceItemId = ${JSON.stringify(goatId)};
      item.name = "Gate 8 test product economics";
      if (!ensureUnitV130().items.includes(item)) ensureUnitV130().items.push(item);
      economics = gate8ExactEconomicsV230(${JSON.stringify(goatId)});
    }
    economics.item.steps = economics.item.steps || {};
    economics.item.steps.adLimits = economics.item.steps.adLimits || {};
    economics.item.steps.adLimits.allowedCpa = "100";
    const a = g8Analysis();
    const id = a.recommendations[0].id;
    const before = ensureGate7State().tasks.length;
    g8CreateOrOpenTaskV3(id);
    activeView = "gate"; activeGateId = "gate-8"; renderGate();
    g8CreateOrOpenTaskV3(id);
    return { before, after: ensureGate7State().tasks.length, links: ensureGate8Workspace().linkedTasks.filter((row) => row.recommendationId === id).length };
  })()`);
  assert(taskDedup.after === taskDedup.before + 1 && taskDedup.links === 1, `Task deduplication failed: ${JSON.stringify(taskDedup)}`);

  await evaluate(`(() => { activeView = "gate"; activeGateId = "gate-8"; renderGate(); g8StoreSnapshotV3(); return true; })()`);
  const history = await evaluate(`(() => {
    const a = g8Analysis();
    const item = a.data.history.at(-1);
    const saved = item.forecastValue;
    const snapshotBudget = item.inputs.find((row) => row.key === "budget")?.value;
    a.data.manual.budget = "15000";
    const recalculated = g8Analysis().scenarioResults.custom.value;
    return { saved, stillSaved: item.forecastValue, snapshotBudget, currentScenarioBudget: g8Analysis().scenarioResults.custom.calculation?.totalSpend, recalculated, product: item.product_id, campaign: item.campaignId, model: item.modelVersion, scenario: item.scenario };
  })()`);
  assert(history.saved === history.stillSaved && history.snapshotBudget === 10000 && history.currentScenarioBudget === 15000 && history.scenario === "base", `History was recalculated: ${JSON.stringify(history)}`);
  assert(history.product === goatId && history.campaign === "g8-v3-campaign" && history.model === "gate8-evidence-model-v3.2", "History context is incomplete");
  console.log("gate8-smoke: history");

  const isolation = await evaluate(`(() => {
    const shirt = guruV194Product(${JSON.stringify(shirtId)}, state);
    state.gate4Production.forecastAssumptionsByProduct[shirt.id] = { product_id: shirt.id, budget: "50000" };
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = shirt.categoryId;
    ui.selectedProductId = shirt.id;
    const shirtAnalysis = g8Analysis();
    const shirtResult = { product: shirtAnalysis.context.product.id, budget: shirtAnalysis.parameters.budget.value, campaign: shirtAnalysis.context.campaignId, manual: ensureGate8Workspace().manual.budget };
    const goat = guruV194Product(${JSON.stringify(goatId)}, state);
    ui.selectedCategoryId = goat.categoryId;
    ui.selectedProductId = goat.id;
    const goatResult = { product: g8Analysis().context.product.id, manual: ensureGate8Workspace().manual.budget };
    return { shirt: shirtResult, goat: goatResult };
  })()`);
  console.log("gate8-smoke: product-isolation-evaluated");
  assert(isolation.shirt.product === shirtId && isolation.shirt.budget === 50000 && isolation.shirt.campaign !== "g8-v3-campaign" && isolation.shirt.manual === "", `Product data leaked into Shirt: ${JSON.stringify(isolation)}`);
  assert(isolation.goat.product === goatId && isolation.goat.manual === "15000", `Goat scenario was not isolated/restored: ${JSON.stringify(isolation)}`);

  const disclosure = await evaluate(`(() => {
    const c = g8CompactStateV3(guruV194SelectedProduct(state), g8StrictGoalV3());
    c.open.scenario = false;
    saveState();
    const storedBeforeRender = JSON.parse(localStorage.getItem("guru-platform-workspace-v02-${projectId}")).gate8Forecast.byProduct[${JSON.stringify(goatId)}].compactV3.open.scenario;
    renderGate();
    return {
      storedBeforeRender,
      normalized: c.open.scenario,
      visible: !document.querySelector('[data-g8-v3-section="scenario"] .g8-workbench-section-body')?.hidden,
      cards: document.querySelectorAll('[data-g8-v3-scenario-card]').length,
      toggle: document.querySelectorAll('[data-g8-v3-toggle="scenario"]').length,
    };
  })()`);
  assert(disclosure.storedBeforeRender === false && disclosure.normalized === true && disclosure.visible && disclosure.cards === 5 && disclosure.toggle === 0, `Stale disclosure state still hides scenarios: ${JSON.stringify(disclosure)}`);

  await page.call("Page.navigate", { url: `${appUrl}?gate8-persistence-smoke=${Date.now()}` });
  await wait(750);
  await waitFor('document.readyState === "complete" && typeof activeProjectId !== "undefined" && typeof g8AnalysisV3 === "function"');
  await evaluate(`(() => {
    if (activeProjectId !== ${JSON.stringify(projectId)}) openProject(${JSON.stringify(projectId)});
    activeView = "gate";
    activeGateId = "gate-8";
    renderGate();
    return true;
  })()`);
  await waitFor('document.querySelector(".g8-workbench")');
  const afterReload = await evaluate(`(() => {
    const product = guruV194SelectedProduct(state);
    const compact = g8CompactStateV3(product, g8StrictGoalV3());
    return {
      product: product?.id || "",
      scenarioOpen: compact.open.scenario,
      manualBudget: ensureGate8Workspace().manual.budget,
      primary: document.querySelectorAll(".g8-workbench-section.is-primary").length,
      scenarioCards: document.querySelectorAll('[data-g8-v3-scenario-card]').length,
      scenarioSelects: document.querySelectorAll('[data-g8-v3-context="scenario"]').length,
      customSpend: g8Analysis().scenarioResults.custom.calculation?.totalSpend,
    };
  })()`);
  assert(afterReload.product === goatId && afterReload.scenarioOpen === true && afterReload.manualBudget === "15000" && afterReload.primary === 3 && afterReload.scenarioCards === 5 && afterReload.scenarioSelects === 0 && afterReload.customSpend === 15000, `Gate 8 context/disclosure did not survive reload: ${JSON.stringify(afterReload)}`);

  console.log(JSON.stringify({ baseline, mobile, currentPeriod, missingConversion, zeroConversion, invalidBudget, scenario, invalidCustom, taskDedup, history, isolation, disclosure, afterReload }, null, 2));
} finally {
  if (page) page.close();
  if (browser && targetId) await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  if (browser && browserContextId) await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  if (browser) browser.close();
}
