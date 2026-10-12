import { writeFile } from "node:fs/promises";

if (process.env.GURU_RUN_LEGACY_METRIKA_V361 === "1") {

const port = process.env.GURU_CHROME_DEBUG_PORT || "9337";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const screenshot = new URL("../artifacts/gate2-metrika-company-product-v361.png", import.meta.url);
const goalDebugScreenshot = new URL("../artifacts/gate2-metrika-goal-debug-v366.png", import.meta.url);
const companyScreenshot = new URL("../artifacts/gate2-metrika-company-v361.png", import.meta.url);
const collapsedScreenshot = new URL("../artifacts/gate2-sections-collapsed-v362.png", import.meta.url);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (ok, message) => { if (!ok) throw new Error(message); };

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
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

async function evaluate(page, expression) {
  const response = await page.call("Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (response.exceptionDetails) throw new Error(
    response.exceptionDetails.exception?.description || response.exceptionDetails.text,
  );
  return response.result.value;
}

async function waitFor(page, expression, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(page, `Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out: ${expression}`);
}

const browserVersion = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(browserVersion.webSocketDebuggerUrl);
await browser.ready;
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const target = targets.find((item) => item.id === targetId);
assert(target, "Isolated browser target missing");
const page = new Cdp(target.webSocketDebuggerUrl);
await page.ready;

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  await page.call("Page.addScriptToEvaluateOnNewDocument", {
    source: `{
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes("/api/")
        ? Promise.resolve(new Response(JSON.stringify({ ok: true, smoke: true }), {
            status: 200, headers: { "Content-Type": "application/json" }
          }))
        : nativeFetch(input, init);
    }`,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(page, 'Boolean(window.GURU_SEED) && typeof g2MetrikaQualityPrimaryStatusV361 === "function"');
  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = "gate2-metrika-scope-v361-smoke";
    workspace.project.name = "Gate 2 Metrika scope smoke";
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: workspace.project.id, name: workspace.project.name, lifecycleStatus: "active",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }]));
    localStorage.setItem("guru-platform-workspace-v02-" + workspace.project.id, JSON.stringify(workspace));
    location.reload();
  })()`);
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, 'Boolean(state) && typeof g2MetrikaQualityPrimaryStatusV361 === "function"');

  const initial = await evaluate(page, `(() => {
    const catalog = guruV189CatalogItems(state);
    const category = guruV189CreateCategory("Metrika smoke", state);
    catalog.push({ id: "smoke-product-a", name: "Товар A", continuum: "product", categoryId: category.id });
    catalog.push({ id: "smoke-product-b", name: "Товар B", continuum: "product", categoryId: category.id });
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = category.id;
    ui.selectedProductId = "smoke-product-a";
    const gate0 = state.gates.find((item) => item.id === "gate-0");
    ensureMegaMarketing(gate0.cards.find(isMegaMarketingCard), state)
      .infra.find((item) => item.name === "Яндекс Метрика").status = "works";
    guruNavigateToGate("gate-2");
    renderGate();
    const gate = state.gates.find((item) => item.id === "gate-2");
    const ids = G2_METRIKA_QUALITY_CARDS_V360.map((item) => item.id);
    const cards = ids.map((id) => gate.cards.find((item) => item.id === id));
    const company = document.querySelector('[data-g2-metrika-quality-section-v360="company"]');
    const product = document.querySelector('[data-g2-metrika-quality-section-v360="product"]');
    return {
      build: window.GURU_BUILD_INFO.version,
      ids,
      statuses: cards.map((card) => g2CardStatus(card)),
      companyCount: company?.querySelectorAll(".g2-metrika-card-v360").length,
      productCount: product?.querySelectorAll(".g2-metrika-card-v360").length,
      companyPlacement: Boolean(document.querySelector('[data-g2-scope="company"]')?.contains(company)),
      productPlacement: Boolean(document.querySelector('[data-g2-scope="product"]')?.contains(product)),
      selectedProduct: product?.querySelector("[data-g2-metrika-selected-product-v361]")?.dataset.g2MetrikaSelectedProductV361,
      renderedProductRows: product?.querySelectorAll("[data-g2-metrika-selected-product-v361]").length,
      guides: [...document.querySelectorAll(".g2-metrika-card-v360")].map((node) => node.querySelectorAll(".g2-metrika-guide-v361 p").length),
      primaryGoalHelp: product?.querySelector("[data-g2-metrika-goal-help-v366]")?.textContent || "",
      primaryGoalOptions: [...(product?.querySelector('[data-g2-metrika-field-v360="goalFired"]')?.options || [])].map((option) => option.textContent),
      visibleInputs: [...document.querySelectorAll(".g2-metrika-card-v360")].every((node) =>
        Boolean(node.querySelector(".g2-metrika-grid-v360 input, .g2-metrika-grid-v360 select"))),
      webvisorLink: Boolean(company?.querySelector("[data-g2-metrika-webvisor-link-v360]")),
      webvisorCards: gate.cards.filter((item) => item.id === "card-103").length,
    };
  })()`);
  assert(initial.build === "2.3.236", `Unexpected build ${initial.build}`);
  assert(initial.companyCount === 5 && initial.productCount === 1, "5/1 scope split failed");
  assert(initial.companyPlacement && initial.productPlacement, "Sections in wrong scope");
  assert(initial.selectedProduct === "smoke-product-a" && initial.renderedProductRows === 1, "Product selector not respected");
  assert(initial.guides.length === 6 && initial.guides.every((count) => count === 0), "Decorative guidance banners still render");
  assert(initial.primaryGoalHelp === "", "Long primary-goal guidance banner still renders");
  assert(JSON.stringify(initial.primaryGoalOptions) === JSON.stringify(["Не проверено", "Сработала", "Не сработала"]), "Primary goal result labels mismatch");
  assert(initial.visibleInputs && initial.webvisorLink && initial.webvisorCards === 1, "Inputs or Webvisor link missing");
  assert(initial.statuses.every((status) => status === "not_started"), "Gate 0 status leaked into audit");

  const accordion = await evaluate(page, `(() => {
    const find = (scope, title) => [...document.querySelectorAll('[data-g2-scope="' + scope + '"] .g2-open-section')]
      .find((section) => section.querySelector(':scope > .g1-section-header .g1-section-title')?.textContent === title);
    const technical = find("company", "Техническая доступность");
    const company = find("company", "Яндекс Метрика · Компания");
    const product = find("product", "Яндекс Метрика · Продукт/Услуга");
    if (!technical || !company || !product) throw new Error("Gate 2 accordion sections missing");
    const button = (section) => section.querySelector(':scope > [data-g2-toggle-section]');
    const body = (section) => section.querySelector(':scope > .g2-section-body');
    const allSections = [...document.querySelectorAll('[data-g2-scope] .g2-open-section')];
    const everyHeaderIsButton = allSections.every((section) => button(section)?.tagName === "BUTTON");
    const distinctKeys = new Set([button(technical).dataset.g2ToggleSection,
      button(company).dataset.g2ToggleSection, button(product).dataset.g2ToggleSection]).size === 3;
    const statusBefore = button(technical).querySelector('.status-pill')?.textContent;
    button(technical).click();
    const technicalClosed = body(technical).hidden && button(technical).getAttribute('aria-expanded') === "false";
    button(company).click();
    const companyClosed = body(company).hidden && !body(product).hidden;
    button(product).click();
    const productClosed = body(product).hidden && button(product).getAttribute('aria-expanded') === "false";
    button(technical).click();
    button(company).click();
    button(product).click();
    return { count: allSections.length, everyHeaderIsButton, distinctKeys,
      technicalClosed, companyClosed, productClosed,
      reopened: [technical, company, product].every((section) => !body(section).hidden && button(section).getAttribute('aria-expanded') === "true"),
      statusPreserved: button(technical).querySelector('.status-pill')?.textContent === statusBefore };
  })()`);
  assert(accordion.count > 3 && accordion.everyHeaderIsButton && accordion.distinctKeys,
    `Gate 2 section headings are not independent buttons: ${JSON.stringify(accordion)}`);
  assert(accordion.technicalClosed && accordion.companyClosed && accordion.productClosed &&
    accordion.reopened && accordion.statusPreserved,
    `Gate 2 accordion toggle failed: ${JSON.stringify(accordion)}`);

  const legacy = await evaluate(page, `(() => {
    const gate = state.gates.find((item) => item.id === "gate-2");
    const data = (id) => g2MetrikaQualityEnsureDataV360(gate.cards.find((card) => card.id === id));
    Object.assign(data("g2-metrika-goals-traffic"), { checkedPages: "legacy-page", visitObserved: "yes", result: "works", evidenceUrl: "https://legacy.test/traffic", testedAt: "2026-09-16T12:00" });
    Object.assign(data("g2-metrika-goals-primary"), { result: "works", evidenceUrl: "https://legacy.test/all-products", testedAt: "2026-09-16T12:00", comment: "Old shared proof", perProduct: [
      { product_id: "smoke-product-a", goalId: "goal-a", triggerType: "thank_you_page", thankYouUrl: "https://example.test/a/thanks", testConversionAt: "2026-09-16T12:00", goalFired: "yes" },
      { product_id: "smoke-product-b", goalId: "goal-b", triggerType: "thank_you_page", thankYouUrl: "https://example.test/b/thanks", testConversionAt: "2026-09-16T12:00", goalFired: "yes" },
    ] });
    Object.assign(data("g2-metrika-goals-calls"), { applicability: "required", calltrackingSystem: "Call system", goalId: "old-call-goal", callObserved: "yes", result: "works", evidenceUrl: "https://legacy.test/call", testedAt: "2026-09-16T12:00" });
    Object.assign(data("g2-metrika-goals-email"), { applicability: "required", trackingSystem: "Email system", goalId: "old-email-goal", emailObserved: "yes", result: "works", evidenceUrl: "https://legacy.test/email", testedAt: "2026-09-16T12:00" });
    Object.assign(data("g2-metrika-goals-widgets"), { applicability: "required", widgets: [{ name: "Old widget", goalId: "widget-goal", testAt: "2026-09-16T12:00", goalFired: "yes" }], result: "works", evidenceUrl: "https://legacy.test/widget", testedAt: "2026-09-16T12:00" });
    Object.assign(data("g2-metrika-goals-kpi"), { primaryGoalIds: "OLD-GLOBAL", auxiliaryUsedAsPrimary: "no", result: "works", evidenceUrl: "https://legacy.test/kpi", testedAt: "2026-09-16T12:00" });
    G2_METRIKA_QUALITY_CARDS_V360.forEach((item) => recalculateStatusForCard(gate.cards.find((card) => card.id === item.id), state));
    renderGate();
    saveState();
    return {
      statuses: G2_METRIKA_QUALITY_CARDS_V360.map((item) => [item.id, g2CardStatus(gate.cards.find((card) => card.id === item.id))]),
      productLegacyVisible: document.querySelector('[data-card="g2-metrika-goals-primary"] .g2-metrika-legacy-v361')?.textContent.includes("Old shared proof"),
      oldWidgetVisible: document.querySelector('[data-card="g2-metrika-goals-widgets"] [data-g2-metrika-collection-v361="widgets"][data-g2-metrika-field-v360="name"]')?.value === "Old widget",
      oldCallGoalVisible: document.querySelector('[data-card="g2-metrika-goals-calls"] .g2-metrika-legacy-v361')?.textContent.includes("old-call-goal"),
      oldGlobalKpiVisible: document.querySelector('[data-card="g2-metrika-goals-kpi"] .g2-metrika-legacy-v361')?.textContent.includes("OLD-GLOBAL"),
      routeCounts: [data("g2-metrika-goals-calls").callRoutes?.length || 0, data("g2-metrika-goals-email").emailRoutes?.length || 0],
    };
  })()`);
  assert(legacy.statuses.every(([, status]) => status !== "ready"), "Ambiguous legacy data became ready");
  assert(legacy.productLegacyVisible && legacy.oldWidgetVisible && legacy.oldCallGoalVisible && legacy.oldGlobalKpiVisible, `Legacy data hidden: ${JSON.stringify(legacy)}`);
  assert(legacy.routeCounts.join(",") === "0,0", "Ambiguous legacy routes were auto-created");

  const productSwitch = await evaluate(page, `(() => {
    const gate = state.gates.find((item) => item.id === "gate-2");
    const card = gate.cards.find((item) => item.id === "g2-metrika-goals-primary");
    const select = document.querySelector('[data-gate0-scope-product-select="gate2-product"]');
    select.value = "smoke-product-b";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    const b = {
      selected: document.querySelector('[data-g2-metrika-selected-product-v361]')?.dataset.g2MetrikaSelectedProductV361,
      goal: document.querySelector('[data-card="g2-metrika-goals-primary"] [data-g2-metrika-field-v360="goalId"]')?.value,
      rows: document.querySelectorAll('[data-card="g2-metrika-goals-primary"] [data-g2-metrika-selected-product-v361]').length,
    };
    const selectBack = document.querySelector('[data-gate0-scope-product-select="gate2-product"]');
    selectBack.value = "smoke-product-a";
    selectBack.dispatchEvent(new Event("change", { bubbles: true }));
    return { b, aGoal: document.querySelector('[data-card="g2-metrika-goals-primary"] [data-g2-metrika-field-v360="goalId"]')?.value,
      stored: card.fields.metrikaQualityV360.perProduct.map((row) => row.goalId) };
  })()`);
  assert(productSwitch.b.selected === "smoke-product-b" && productSwitch.b.goal === "goal-b" && productSwitch.b.rows === 1, "Product B view failed");
  assert(productSwitch.aGoal === "goal-a" && productSwitch.stored.join(",") === "goal-a,goal-b", "Product switch changed other data");

  const transitions = await evaluate(page, `(async () => {
    const gate = state.gates.find((item) => item.id === "gate-2");
    const card = (id) => gate.cards.find((item) => item.id === id);
    const data = (id) => g2MetrikaQualityEnsureDataV360(card(id));
    const set = (id, field, value, collection = "", index = 0) => {
      const root = document.querySelector('[data-card="' + id + '"]');
      const selector = '[data-g2-metrika-field-v360="' + field + '"]' +
        (collection ? '[data-g2-metrika-collection-v361="' + collection + '"][data-g2-metrika-index-v361="' + index + '"]' : "");
      const input = root?.querySelector(selector);
      if (!input) throw new Error("Field missing: " + id + "/" + field);
      input.value = value;
      input.dispatchEvent(new Event(input.tagName === "SELECT" || input.type === "datetime-local" ? "change" : "input", { bubbles: true }));
    };
    const primary = "g2-metrika-goals-primary";
    set(primary, "result", "works");
    set(primary, "evidenceUrl", "https://proof.test/a");
    set(primary, "testedAt", "2026-09-16T13:00");
    const selectedReady = g2CardStatus(card(primary));
    const aggregatePartial = card(primary).status;
    const switcher = document.querySelector('[data-gate0-scope-product-select="gate2-product"]');
    switcher.value = "smoke-product-b";
    switcher.dispatchEvent(new Event("change", { bubbles: true }));
    set(primary, "triggerType", "auto_goal");
    const autoGoal = g2CardStatus(card(primary));
    set(primary, "triggerType", "thank_you_page");
    set(primary, "result", "works");
    set(primary, "evidenceUrl", "https://proof.test/b");
    set(primary, "testedAt", "2026-09-16T13:05");
    const aggregateReady = card(primary).status;

    const calls = "g2-metrika-goals-calls";
    document.querySelector('[data-card="' + calls + '"] [data-g2-metrika-add-row-v361="callRoutes"]').click();
    document.querySelector('[data-card="' + calls + '"] [data-g2-metrika-add-row-v361="callRoutes"]').click();
    set(calls, "coverageConfirmed", "yes");
    const routeValues = [
      { phoneNumber: "+7 900 000-00-01", landingUrl: "/a", goalId: "call-a", testCallAt: "2026-09-16T14:00", callObserved: "yes", evidenceUrl: "https://proof.test/call-a" },
      { phoneNumber: "+7 900 000-00-02", landingUrl: "/b", goalId: "call-b", testCallAt: "2026-09-16T14:05", callObserved: "no", evidenceUrl: "https://proof.test/call-b" },
    ];
    routeValues.forEach((route, index) => Object.entries(route).forEach(([field, value]) => set(calls, field, value, "callRoutes", index)));
    const oneRouteFailed = g2CardStatus(card(calls));
    set(calls, "callObserved", "yes", "callRoutes", 1);
    const allRoutesReady = g2CardStatus(card(calls));

    const email = "g2-metrika-goals-email";
    document.querySelector('[data-card="' + email + '"] [data-g2-metrika-add-row-v361="emailRoutes"]').click();
    set(email, "coverageConfirmed", "yes");
    const emailValues = { emailAddress: "lead@example.test", landingUrl: "/contacts", goalId: "email-lead", testEmailAt: "2026-09-16T14:15", emailReceived: "yes", goalObserved: "no", evidenceUrl: "https://proof.test/email" };
    Object.entries(emailValues).forEach(([field, value]) => set(email, field, value, "emailRoutes"));
    const emailGoalFailed = g2CardStatus(card(email));
    set(email, "goalObserved", "yes", "emailRoutes");
    const emailReady = g2CardStatus(card(email));

    const widgets = "g2-metrika-goals-widgets";
    set(widgets, "coverageConfirmed", "yes");
    const oldWidgetIncomplete = g2CardStatus(card(widgets));
    set(widgets, "placementUrl", "/a", "widgets");
    set(widgets, "evidenceUrl", "https://proof.test/widget", "widgets");
    const widgetReady = g2CardStatus(card(widgets));

    const kpi = "g2-metrika-goals-kpi";
    await Promise.resolve();
    document.querySelector('[data-card="' + kpi + '"] [data-g2-metrika-add-row-v361="campaignChecks"]').click();
    set(kpi, "policyConfirmed", "yes");
    set(kpi, "coverageConfirmed", "yes");
    const campaign = { campaign: "Товар B · Директ", mainGoalId: "goal-b", auxiliaryGoalIds: "time,depth", auxiliaryUsedAsPrimary: "yes", evidenceUrl: "https://proof.test/kpi" };
    Object.entries(campaign).forEach(([field, value]) => set(kpi, field, value, "campaignChecks"));
    const kpiBad = g2CardStatus(card(kpi));
    set(kpi, "auxiliaryUsedAsPrimary", "no", "campaignChecks");
    document.querySelector('[data-card="' + kpi + '"] [data-g2-metrika-add-row-v361="campaignChecks"]').click();
    const secondCampaign = { campaign: "Товар A · Директ", mainGoalId: "goal-a", auxiliaryGoalIds: "contacts", auxiliaryUsedAsPrimary: "no", evidenceUrl: "https://proof.test/kpi-a" };
    Object.entries(secondCampaign).forEach(([field, value]) => set(kpi, field, value, "campaignChecks", 1));
    const kpiReady = g2CardStatus(card(kpi));
    return { selectedReady, aggregatePartial, autoGoal, aggregateReady,
      oneRouteFailed, allRoutesReady, callRoutes: data(calls).callRoutes.length,
      emailGoalFailed, emailReady, oldWidgetIncomplete, widgetReady, kpiBad, kpiReady,
      campaignGoalIds: data(kpi).campaignChecks.map((row) => row.mainGoalId),
      legacyCallGoal: data(calls).goalId, legacyGlobalKpi: data(kpi).primaryGoalIds };
  })()`);
  assert(transitions.selectedReady === "ready" && transitions.aggregatePartial === "in_progress", "Selected/aggregate status leaked");
  assert(transitions.autoGoal === "problem" && transitions.aggregateReady === "ready", "Primary per-product validation failed");
  assert(transitions.oneRouteFailed === "problem" && transitions.allRoutesReady === "ready" && transitions.callRoutes === 2, "Multiple call routes failed");
  assert(transitions.emailGoalFailed === "problem" && transitions.emailReady === "ready", "Incoming email validation failed");
  assert(transitions.oldWidgetIncomplete === "in_progress" && transitions.widgetReady === "ready", "Existing widget migration unsafe");
  assert(transitions.kpiBad === "problem" && transitions.kpiReady === "ready" &&
    transitions.campaignGoalIds.join(",") === "goal-b,goal-a", "Campaign-specific KPI failed");
  assert(transitions.legacyCallGoal === "old-call-goal" && transitions.legacyGlobalKpi === "OLD-GLOBAL", "Old data overwritten");

  const exported = await evaluate(page, `(() => {
    const payload = guruGateContentPayloadV120("gate-2");
    const card = (id) => payload.structure.cards.find((item) => item.id === id);
    const primary = card("g2-metrika-goals-primary");
    const diagnostic = payload.diagnostics.cards.find((item) => item.unitId === primary.id);
    return {
      products: primary.fields.metrikaQualityV360.perProduct.map((row) => [row.product_id, row.result, row.evidenceUrl]),
      legacyShared: primary.fields.metrikaQualityV360.evidenceUrl,
      selectedProductId: diagnostic.selectedProduct?.id,
      diagnosticPath: diagnostic.selectedSource?.path,
      readinessStatus: diagnostic.readinessStatus,
      displayedStatus: diagnostic.displayedStatus,
      calls: card("g2-metrika-goals-calls").fields.metrikaQualityV360.callRoutes.length,
    };
  })()`);
  assert(exported.products.length === 2 && exported.legacyShared === "https://legacy.test/all-products", "Export lost old/new product data");
  assert(exported.selectedProductId === "smoke-product-b" && exported.diagnosticPath.includes("product_id=smoke-product-b"), "Export diagnostic ignored selected product");
  assert(exported.readinessStatus === "ready" && exported.displayedStatus === "ready" && exported.calls === 2, "Export status or routes failed");

  await evaluate(page, `(() => { document.querySelector('[data-g2-metrika-quality-section-v360="company"]').scrollIntoView({ block: "start" }); true; })()`);
  await wait(250);
  const companyImage = await page.call("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(companyScreenshot, Buffer.from(companyImage.data, "base64"));
  await evaluate(page, `(() => { document.querySelector('[data-g2-metrika-quality-section-v360="product"]').scrollIntoView({ block: "start" }); true; })()`);
  await wait(250);
  const goalDebugImage = await page.call("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(goalDebugScreenshot, Buffer.from(goalDebugImage.data, "base64"));
  await evaluate(page, `(() => { document.querySelector('[data-g2-metrika-quality-section-v360="product"]').scrollIntoView({ block: "center" }); true; })()`);
  await wait(250);
  const image = await page.call("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(screenshot, Buffer.from(image.data, "base64"));

  await evaluate(page, `(() => {
    document.querySelector('[data-g2-toggle-section="company:technical"]').click();
    document.querySelector('[data-g2-toggle-section="product:metrika_goal_quality_product"]').click();
    return true;
  })()`);
  await wait(250);
  await evaluate(page, `(() => { document.querySelector('[data-g2-toggle-section="company:technical"]').scrollIntoView({ block: "start" }); return true; })()`);
  await wait(250);
  const collapsedImage = await page.call("Page.captureScreenshot", { format: "png", fromSurface: true });
  await writeFile(collapsedScreenshot, Buffer.from(collapsedImage.data, "base64"));
  await wait(650);
  await page.call("Page.reload", { ignoreCache: true });
  await wait(1200);
  await waitFor(page, 'document.readyState === "complete" && (Boolean(state) || Boolean(document.querySelector("[data-open-project]")))');
  await evaluate(page, 'document.querySelector("[data-open-project]")?.click(); true');
  await waitFor(page, 'Boolean(state) && typeof g2MetrikaQualityPrimaryStatusV361 === "function"');
  await evaluate(page, 'guruNavigateToGate("gate-2"); renderGate(); true');
  await waitFor(page, `document.querySelector('[data-g2-toggle-section="company:technical"]')`);
  const persisted = await evaluate(page, `(() => {
    const gate = state.gates.find((item) => item.id === "gate-2");
    const data = (id) => gate.cards.find((card) => card.id === id).fields.metrikaQualityV360;
    return {
      selected: guruV194SelectedProduct(state)?.id,
      primaryRows: data("g2-metrika-goals-primary").perProduct.map((row) => [row.product_id, row.result]),
      sharedProof: data("g2-metrika-goals-primary").evidenceUrl,
      callRoutes: data("g2-metrika-goals-calls").callRoutes.length,
      oldCallGoal: data("g2-metrika-goals-calls").goalId,
      oldGlobalKpi: data("g2-metrika-goals-kpi").primaryGoalIds,
      collapsedTechnical: document.querySelector('[data-g2-toggle-section="company:technical"]')?.getAttribute('aria-expanded') === "false",
      collapsedProductMetrika: document.querySelector('[data-g2-toggle-section="product:metrika_goal_quality_product"]')?.getAttribute('aria-expanded') === "false",
    };
  })()`);
  assert(persisted.primaryRows.length === 2 && persisted.primaryRows.every(([, result]) => result === "works"), "Per-product data did not persist");
  assert(persisted.sharedProof === "https://legacy.test/all-products" && persisted.callRoutes === 2 &&
    persisted.oldCallGoal === "old-call-goal" && persisted.oldGlobalKpi === "OLD-GLOBAL", "Legacy data lost after reload");
  assert(persisted.collapsedTechnical && persisted.collapsedProductMetrika,
    `Gate 2 section state did not persist: ${JSON.stringify(persisted)}`);

  console.log(JSON.stringify({ ok: true, initial, accordion, legacy, productSwitch, transitions, exported, persisted, screenshots: [collapsedScreenshot.pathname, companyScreenshot.pathname, screenshot.pathname, goalDebugScreenshot.pathname] }, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
} else {
  await import("./gate2-metrika-product-audit-smoke.mjs");
}
