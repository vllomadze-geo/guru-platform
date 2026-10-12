import { readFile } from "node:fs/promises";

const sourcePath =
  process.env.GURU_PROJECT_EXPORT ||
  "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9337";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const smokeProjectId = "gates-3-5-6-7-8-product-scope-smoke";
const goatId = "catalog-item-1786792591872-51f503";
const shirtId = "catalog-item-1786792591872-c8b1e9";
const blankContinuumId = "catalog-item-1786792591872-98358d";
const shirtCategoryId = "product-1786401011698-231009";
const goatCategoryId = "product-1786401011698-9e81ee";
const calendarSentinel = "GOAT-CALENDAR-V230";
const forecastSentinel = "123456";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class CdpClient {
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

  close() {
    this.socket.close();
  }
}

const source = JSON.parse(await readFile(sourcePath, "utf8"));
const fixture = source.workspace;
assert(fixture?.project, "Full-project export fixture is missing workspace.project");
assert(
  fixture.project.catalogItemsV189?.some((item) => item.id === goatId),
  "Goat fixture is missing",
);
assert(
  fixture.project.catalogItemsV189?.some((item) => item.id === shirtId),
  "Shirt fixture is missing",
);

let browser;
let page;
let targetId = "";
let browserContextId = "";

async function evaluate(expression) {
  const response = await page.call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails) {
    throw new Error(
      response.exceptionDetails.exception?.description ||
        response.exceptionDetails.text,
    );
  }
  return response.result.value;
}

async function waitFor(expression, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function openGate(gateId) {
  await evaluate(`(() => {
    activeView = "gate";
    activeGateId = ${JSON.stringify(gateId)};
    renderGate();
    return true;
  })()`);
  await waitFor(
    gateId === "gate-8"
      ? `document.querySelector('[data-g8-workbench-version="gate8-evidence-model-v3.2"]')`
      : `document.querySelector('[data-gate-scope-layout="v230"]')`,
  );
}

async function choose(selector, value) {
  await evaluate(`(() => {
    const select = document.querySelector(${JSON.stringify(selector)});
    if (!select) throw new Error(${JSON.stringify(`Selector not found: ${selector}`)});
    select.value = ${JSON.stringify(value)};
    select.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
  await wait(120);
}

try {
  const browserVersion = await (
    await fetch(`http://127.0.0.1:${debugPort}/json/version`)
  ).json();
  browser = new CdpClient(browserVersion.webSocketDebuggerUrl);
  await browser.ready;
  ({ browserContextId } = await browser.call("Target.createBrowserContext"));
  ({ targetId } = await browser.call("Target.createTarget", {
    url: "about:blank",
    browserContextId,
  }));
  const targets = await (
    await fetch(`http://127.0.0.1:${debugPort}/json`)
  ).json();
  const pageTarget = targets.find((target) => target.id === targetId);
  assert(pageTarget?.webSocketDebuggerUrl, "Isolated Chrome target not found");
  page = new CdpClient(pageTarget.webSocketDebuggerUrl);
  await page.ready;
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Page.addScriptToEvaluateOnNewDocument", {
    source: `{
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes("/api/")
        ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmokeTest: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }))
        : nativeFetch(input, init);
    }`,
  });

  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete"');
  await waitFor('typeof bootstrapAppOnce === "function"');
  await evaluate(`(() => {
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: ${JSON.stringify(smokeProjectId)},
      name: "Gates 3/5/6/7/8 scope smoke",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));
    return true;
  })()`);
  await page.call("Page.reload", { ignoreCache: true });
  await wait(700);
  await waitFor(`document.querySelector('[data-open-project="${smokeProjectId}"]')`);
  await evaluate(`openProject(${JSON.stringify(smokeProjectId)}); true`);
  await waitFor(
    `activeProjectId === ${JSON.stringify(smokeProjectId)} && Boolean(state)`,
  );

  const fixtureJson = JSON.stringify(fixture);
  const preimage = await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    saveState = () => {};
    const incoming = structuredClone(${fixtureJson});
    state = incoming;
    state.project.id = ${JSON.stringify(smokeProjectId)};
    state.project.gate0ScopeUiV194 = {
      ...(state.project.gate0ScopeUiV194 || {}),
      selectedCategoryId: state.project.catalogItemsV189.find((item) => item.id === ${JSON.stringify(goatId)}).categoryId,
      selectedProductId: ${JSON.stringify(goatId)}
    };
    prepareSystemCards(state);
    return {
      gate3: JSON.stringify(state.gate3_5a),
      gate5Unassigned: JSON.stringify({
        campaigns: state.gate5.campaignRegistry.filter((item) => !item.product_id && !item.productId),
        reports: state.gate5.reports,
        iterations: state.gate5.iterations
      }),
      gate6Legacy: JSON.stringify(state.gate6Calendar.events),
      gate8Legacy: JSON.stringify({
        manual: state.gate8Forecast.manual,
        history: state.gate8Forecast.history,
        linkedTasks: state.gate8Forecast.linkedTasks,
        calendarActions: state.gate8Forecast.calendarActions
      }),
      gate1LandingRows: JSON.stringify(
        state.gates.find((gate) => gate.id === "gate-1").cards
          .filter((card) => ["карточка товара", "страница услуги"].includes(normalizeGateTitle(card.title)))
          .map((card) => ({ id: card.id, pageRows: card.pageRows }))
      )
    };
  })()`);

  await evaluate(`(() => {
    activeView = "gate";
    activeGateId = "gate-1";
    renderGate();
    return true;
  })()`);
  await waitFor(`document.querySelector('[data-gate0-scope-product-select="gate1-product-pages"]')`);
  const gate1Goat = await evaluate(`(() => {
    const service = document.querySelector('[data-card="card-23"]');
    const product = document.querySelector('[data-card="card-24"]');
    return {
      serviceOpen: service?.classList.contains('is-open'),
      productOpen: product?.classList.contains('is-open'),
      servicePresent: Boolean(service),
      productPresent: Boolean(product),
      localCategoryControls: document.querySelectorAll('[data-guru-position-category-card], [data-guru-position-new-category-card]').length,
      categoryPathLink: document.querySelector('[data-guru-open-category][data-guru-open-product]')?.textContent?.trim() || '',
      selected: guruV194SelectedProduct(state)?.id || ''
    };
  })()`);
  assert(gate1Goat.selected === goatId, "Gate 1 did not use the shared Goat product_id");
  assert(gate1Goat.productOpen, "Pure product did not open Product card");
  assert(gate1Goat.productPresent, "Pure product hid Product card");
  assert(!gate1Goat.servicePresent, "Pure product still rendered Service page");
  assert(gate1Goat.localCategoryControls === 0, "Product card still renders a local Category control");
  assert(gate1Goat.categoryPathLink === "Дизайнерские подарки", "Upper category path did not inherit the Gate 0 link");

  const gate1Hybrid = await evaluate(`(() => {
    const item = guruV189CatalogItemById(${JSON.stringify(goatId)}, state);
    item.continuum = "service_with_product";
    if (item.source?.kind === "gate1") {
      const card = g1pcFindCard(item.source.cardId);
      const row = (card?.pageRows || []).find((entry) => entry.id === item.source.rowId)
        || card?.pageRows?.[item.source.rowIndex];
      if (row) row.catalogContinuumV189 = "service_with_product";
    }
    renderGate();
    return {
      continuum: item.continuum,
      servicePresent: Boolean(document.querySelector('[data-card="card-23"]')),
      productPresent: Boolean(document.querySelector('[data-card="card-24"]')),
      serviceOpen: document.querySelector('[data-card="card-23"]')?.classList.contains('is-open'),
      productOpen: document.querySelector('[data-card="card-24"]')?.classList.contains('is-open')
    };
  })()`);
  assert(
    gate1Hybrid.servicePresent && gate1Hybrid.serviceOpen,
    `Service-with-product did not open Service page: ${JSON.stringify(gate1Hybrid)}`,
  );
  assert(
    !gate1Hybrid.productPresent,
    `Service-with-product still rendered Product card: ${JSON.stringify(gate1Hybrid)}`,
  );

  const gate1Blank = await evaluate(`(() => {
    const ui = guruV194Ui(state);
    const item = guruV189CatalogItemById(${JSON.stringify(blankContinuumId)}, state);
    ui.selectedProductId = item.id;
    ui.selectedCategoryId = item.categoryId;
    renderGate();
    return {
      continuum: item.continuum,
      servicePresent: Boolean(document.querySelector('[data-card="card-23"]')),
      productPresent: Boolean(document.querySelector('[data-card="card-24"]')),
      serviceOpen: document.querySelector('[data-card="card-23"]')?.classList.contains('is-open'),
      productOpen: document.querySelector('[data-card="card-24"]')?.classList.contains('is-open')
    };
  })()`);
  assert(!gate1Blank.continuum, "Blank-continuum fixture is no longer blank");
  assert(gate1Blank.servicePresent && gate1Blank.productPresent, "Blank continuum must render both landing cards");
  assert(gate1Blank.serviceOpen && gate1Blank.productOpen, "Blank continuum must keep both landing cards open");

  const gate1 = await evaluate(`(() => {
    const goat = guruV189CatalogItemById(${JSON.stringify(goatId)}, state);
    const ui = guruV194Ui(state);
    goat.continuum = "pure_product";
    if (goat.source?.kind === "gate1") {
      const card = g1pcFindCard(goat.source.cardId);
      const row = (card?.pageRows || []).find((entry) => entry.id === goat.source.rowId)
        || card?.pageRows?.[goat.source.rowIndex];
      if (row) row.catalogContinuumV189 = "pure_product";
    }
    ui.selectedProductId = goat.id;
    ui.selectedCategoryId = goat.categoryId;
    renderGate();
    const rows = JSON.stringify(
      state.gates.find((gate) => gate.id === "gate-1").cards
        .filter((card) => ["карточка товара", "страница услуги"].includes(normalizeGateTitle(card.title)))
        .map((card) => ({ id: card.id, pageRows: card.pageRows }))
    );
    const v234Logs = (state.project._gate1SectionsMigrationLog || [])
      .filter((entry) => entry.id === GATE1_LANDING_CONTINUUM_V234);
    const v235Logs = (state.project._gate1SectionsMigrationLog || [])
      .filter((entry) => entry.id === GATE1_LANDING_VISIBILITY_V235);
    const v236Logs = (state.project._gate1SectionsMigrationLog || [])
      .filter((entry) => entry.id === GATE1_LOCAL_CATEGORY_REMOVAL_V236);
    return {
      goat: ${JSON.stringify(null)},
      hybrid: ${JSON.stringify(null)},
      blank: ${JSON.stringify(null)},
      restored: {
        servicePresent: Boolean(document.querySelector('[data-card="card-23"]')),
        productPresent: Boolean(document.querySelector('[data-card="card-24"]')),
        productOpen: document.querySelector('[data-card="card-24"]')?.classList.contains('is-open')
      },
      rows,
      v234LogCount: v234Logs.length,
      v235LogCount: v235Logs.length,
      v236LogCount: v236Logs.length
    };
  })()`);
  gate1.goat = gate1Goat;
  gate1.hybrid = gate1Hybrid;
  gate1.blank = gate1Blank;
  gate1.rowsUnchanged = gate1.rows === preimage.gate1LandingRows;
  delete gate1.rows;
  assert(gate1.rowsUnchanged, "Landing pageRows changed while applying continuum defaults");
  assert(gate1.restored.productPresent && gate1.restored.productOpen, "Restored pure product did not show Product card");
  assert(!gate1.restored.servicePresent, "Restored pure product still rendered Service page");
  assert(gate1.v234LogCount === 1, "Gate 1 continuum audit log is not idempotent");
  assert(gate1.v235LogCount === 1, "Gate 1 visibility audit log is not idempotent");
  assert(gate1.v236LogCount === 1, "Gate 1 local Category removal audit log is not idempotent");

  await choose('[data-gate0-scope-category-select="gate1-product-pages"]', shirtCategoryId);
  await choose('[data-gate0-scope-product-select="gate1-product-pages"]', shirtId);
  const gate1Shirt = await evaluate(`(() => ({
    selected: guruV194SelectedProduct(state)?.id || '',
    name: document.querySelector('[data-card="card-24"] [data-gate1-page-field="name"]')?.value || '',
    localCategoryControls: document.querySelectorAll('[data-guru-position-category-card], [data-guru-position-new-category-card]').length
  }))()`);
  assert(gate1Shirt.selected === shirtId && gate1Shirt.name === "Рубашка Upcycling с кружевом", "Product card did not follow the upper selector to Shirt");
  assert(gate1Shirt.localCategoryControls === 0, "Shirt rendered a local Category control");

  await choose('[data-gate0-scope-product-select="gate1-product-pages"]', blankContinuumId);
  const gate1SameCategory = await evaluate(`(() => ({
    selected: guruV194SelectedProduct(state)?.id || '',
    name: document.querySelector('[data-card="card-24"] [data-gate1-page-field="name"]')?.value || ''
  }))()`);
  assert(gate1SameCategory.selected === blankContinuumId && gate1SameCategory.name === "Летнее платье «Исландка»", "Product card did not follow an upper switch within the same category");

  await choose('[data-gate0-scope-category-select="gate1-product-pages"]', goatCategoryId);
  await choose('[data-gate0-scope-product-select="gate1-product-pages"]', goatId);
  const gate1OtherCategory = await evaluate(`(() => ({
    selected: guruV194SelectedProduct(state)?.id || '',
    name: document.querySelector('[data-card="card-24"] [data-gate1-page-field="name"]')?.value || '',
    link: document.querySelector('[data-guru-open-category][data-guru-open-product]')?.textContent?.trim() || ''
  }))()`);
  assert(gate1OtherCategory.selected === goatId && gate1OtherCategory.name === "Символ 2027 года «Коза»", "Product card did not follow an upper switch to another category");
  assert(gate1OtherCategory.link === "Дизайнерские подарки", "Moved Gate 0 category link has the wrong target");

  await evaluate(`document.querySelector('[data-guru-open-category][data-guru-open-product]')?.click(); true`);
  await waitFor(`activeGateId === "gate-0"`);
  await waitFor(`document.querySelector('[data-guru-catalog-name="${goatId}"]')`);
  const gate1CategoryNavigation = await evaluate(`(() => ({
    selected: guruV194SelectedProduct(state)?.id || '',
    categoryOpen: Boolean(document.querySelector('[data-guru-catalog-category-group="${goatCategoryId}"][open]')),
    productVisible: Boolean(document.querySelector('[data-guru-catalog-name="${goatId}"]'))
  }))()`);
  assert(gate1CategoryNavigation.selected === goatId, "Gate 0 category link lost the selected product");
  assert(gate1CategoryNavigation.categoryOpen && gate1CategoryNavigation.productVisible, "Gate 0 category link did not open the selected category");
  gate1.shirt = gate1Shirt;
  gate1.sameCategory = gate1SameCategory;
  gate1.otherCategory = gate1OtherCategory;
  gate1.categoryNavigation = gate1CategoryNavigation;

  await openGate("gate-3");
  const gate3 = await evaluate(`(() => ({
    company: Boolean(document.querySelector('[data-gate-scope="company"]')),
    product: Boolean(document.querySelector('[data-gate-scope="product"]')),
    selector: document.querySelector('[data-g3-product-journey-select]')?.value,
    stages: document.querySelectorAll('.g3-funnel-card').length
  }))()`);
  assert(gate3.company && gate3.product, "Gate 3 scope headings are missing");
  assert(gate3.selector === goatId, "Gate 3 did not reuse selected product");
  assert(gate3.stages === 5, `Gate 3 expected 5 stages, got ${gate3.stages}`);

  await openGate("gate-5");
  const gate5 = await evaluate(`(() => ({
    company: Boolean(document.querySelector('[data-gate-scope="company"]')),
    product: Boolean(document.querySelector('[data-gate-scope="product"]')),
    selector: document.querySelector('[data-g5-product-pick-select]')?.value,
    blocks: document.querySelectorAll('.gate5-block').length,
    warning: document.querySelector('[data-gate-scope="company"]')?.textContent || ''
  }))()`);
  assert(gate5.company && gate5.product, "Gate 5 scope headings are missing");
  assert(gate5.selector === goatId, "Gate 5 selector is not shared");
  assert(gate5.blocks === 9, `Gate 5 expected 9 blocks, got ${gate5.blocks}`);
  assert(/3504/.test(gate5.warning), "Gate 5 unassigned report rows are not disclosed");
  await evaluate(`(() => {
    state.gate5.campaignRegistry.push({
      id: "g5-v230-goat",
      cabinetId: "g5-v230-goat-external",
      name: "Goat only",
      product_id: ${JSON.stringify(goatId)},
      productId: ${JSON.stringify(goatId)}
    });
    renderGate();
    return true;
  })()`);
  assert(
    (await evaluate(`document.querySelectorAll('[data-gate-scope="product"] .gate5-table tbody tr').length`)) >= 1,
    "Gate 5 product campaign was not rendered",
  );
  await choose("[data-g5-product-pick-select]", shirtId);
  assert(
    !(await evaluate(`document.querySelector('[data-gate-scope="product"]')?.textContent.includes("Goat only")`)),
    "Gate 5 leaked a Goat campaign into the Shirt product",
  );
  await choose("[data-g5-product-pick-select]", goatId);
  assert(
    await evaluate(`document.querySelector('[data-gate-scope="product"]')?.textContent.includes("Goat only")`),
    "Gate 5 Goat campaign disappeared after round trip",
  );

  // Simulate the v2.3.0 auto-default already persisted for the current quarter.
  // v2.3.1 must collapse it once without touching event content.
  await evaluate(`(() => {
    state.gate6Calendar = state.gate6Calendar || {};
    state.gate6Calendar.byProduct = state.gate6Calendar.byProduct || {};
    const current = gate6CurrentQuarterKeyV31();
    state.gate6Calendar.byProduct[${JSON.stringify(goatId)}] = {
      ...(state.gate6Calendar.byProduct[${JSON.stringify(goatId)}] || {}),
      product_id: ${JSON.stringify(goatId)},
      openQuarters: { [current]: true },
      _quartersInitialized: true,
      _quartersCollapsedByDefaultV231: false
    };
    return current;
  })()`);
  await openGate("gate-6");
  const gate6 = await evaluate(`(() => ({
    company: Boolean(document.querySelector('[data-gate-scope="company"]')),
    product: Boolean(document.querySelector('[data-gate-scope="product"]')),
    selector: document.querySelector('[data-g6-product-pick-select]')?.value,
    projectReadonly: document.querySelector('[data-g6-context="project"]')?.readOnly,
    audienceReadonly: document.querySelector('[data-gate-scope="product"] input[readonly]')?.readOnly,
    event: Boolean(document.querySelector('[data-g6-field][data-field="campaign"]')),
    openQuarters: document.querySelectorAll('.gate6-quarter.is-open').length,
    geometry: (() => {
      const page = document.querySelector('.gate6-calendar');
      const productBody = document.querySelector('.guru-product-scope-body-v230');
      const plan = productBody?.querySelector('.gate6-plan');
      if (!page || !productBody || !plan) return null;
      const pageRect = page.getBoundingClientRect();
      const bodyRect = productBody.getBoundingClientRect();
      const planRect = plan.getBoundingClientRect();
      return {
        pageFits: page.scrollWidth <= page.clientWidth + 1,
        bodyFits: productBody.scrollWidth <= productBody.clientWidth + 1,
        planInside: planRect.left >= bodyRect.left - 1 && planRect.right <= bodyRect.right + 1,
        planVisible: planRect.height > 40 && planRect.bottom <= pageRect.bottom + 1
      };
    })()
  }))()`);
  assert(gate6.company && gate6.product, "Gate 6 scope headings are missing");
  assert(gate6.selector === goatId, "Gate 6 selector is not shared");
  assert(gate6.openQuarters === 0, "Gate 6 must render with every quarter collapsed by default");
  assert(gate6.geometry?.pageFits, "Gate 6 page overflows its system container");
  assert(gate6.geometry?.bodyFits, "Gate 6 product body overflows its system container");
  assert(gate6.geometry?.planInside, "Gate 6 final plan escapes the product body");
  assert(gate6.geometry?.planVisible, "Gate 6 final plan is clipped vertically");
  assert(gate6.projectReadonly && gate6.audienceReadonly, "Gate 6 live-read fields are editable");
  assert(!gate6.event, "Gate 6 rendered event fields while every quarter is collapsed");
  await evaluate(`document.querySelector('[data-g6-open-quarter]')?.click(); true`);
  await wait(120);
  assert(
    await evaluate(`Boolean(document.querySelector('[data-g6-field][data-field="campaign"]'))`),
    "Gate 6 did not open a product event quarter on demand",
  );
  await evaluate(`(() => {
    const input = document.querySelector('[data-g6-field][data-field="campaign"]');
    input.value = ${JSON.stringify(calendarSentinel)};
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  })()`);
  await choose("[data-g6-product-pick-select]", shirtId);
  assert(
    !(await evaluate(`document.querySelector('[data-g6-field][data-field="campaign"]')?.value === ${JSON.stringify(calendarSentinel)}`)),
    "Gate 6 leaked Goat event data into Shirt",
  );
  await choose("[data-g6-product-pick-select]", goatId);
  assert(
    await evaluate(`document.querySelector('[data-g6-field][data-field="campaign"]')?.value === ${JSON.stringify(calendarSentinel)}`),
    "Gate 6 Goat event disappeared after round trip",
  );

  await openGate("gate-7");
  const gate7 = await evaluate(`(() => ({
    company: Boolean(document.querySelector('[data-gate-scope="company"]')),
    product: Boolean(document.querySelector('[data-gate-scope="product"]')),
    selectors: document.querySelectorAll('[data-g7-product-pick-select]').length,
    sections: document.querySelectorAll('[data-gate-scope="company"] .gate7-section').length
  }))()`);
  assert(gate7.company && gate7.product, "Gate 7 scope headings are missing");
  assert(gate7.selectors === 0, "Gate 7 must not have a product selector");
  assert(gate7.sections === 4, `Gate 7 expected 4 task sections, got ${gate7.sections}`);

  await openGate("gate-8");
  const gate8 = await evaluate(`(() => ({
    workbench: Boolean(document.querySelector('[data-g8-workbench-version="gate8-evidence-model-v3.2"]')),
    selector: document.querySelector('[data-g8-product-pick-select]')?.value,
    primaryBlocks: document.querySelectorAll('.g8-workbench-section.is-primary').length,
    secondaryBlocks: document.querySelectorAll('.g8-workbench-section.is-secondary').length,
    scenarioCards: document.querySelectorAll('[data-g8-v3-scenario-card]').length,
    scenarioSelects: document.querySelectorAll('[data-g8-v3-context="scenario"]').length,
    productText: document.querySelector('.g8-workbench')?.textContent || ''
  }))()`);
  assert(gate8.workbench, "Gate 8 compact workbench is missing");
  assert(gate8.selector === goatId, "Gate 8 selector is not shared");
  assert(gate8.primaryBlocks === 3, `Gate 8 expected 3 primary blocks, got ${gate8.primaryBlocks}`);
  assert(gate8.secondaryBlocks === 0, `Gate 8 expected no standalone secondary blocks, got ${gate8.secondaryBlocks}`);
  assert(gate8.scenarioCards === 5 && gate8.scenarioSelects === 0, `Gate 8 scenarios are not simultaneously visible: ${JSON.stringify(gate8)}`);
  assert(gate8.productText.includes("Символ 2027 года"), "Gate 8 did not read the selected product");
  await evaluate(`(() => {
    const input = document.querySelector('[data-g8-v3-manual="budget"]');
    input.value = ${JSON.stringify(forecastSentinel)};
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
  await choose("[data-g8-product-pick-select]", shirtId);
  assert(
    (await evaluate(`document.querySelector('[data-g8-v3-manual="budget"]')?.value || ''`)) !== forecastSentinel,
    "Gate 8 leaked Goat scenario into Shirt",
  );
  await choose("[data-g8-product-pick-select]", goatId);
  assert(
    (await evaluate(`document.querySelector('[data-g8-v3-manual="budget"]')?.value || ''`)) === forecastSentinel,
    "Gate 8 Goat scenario disappeared after round trip",
  );

  const result = await evaluate(`(() => {
    const logs = state.project._gateCompanyProductMigrationLog || [];
    const legacy = {
      gate3: JSON.stringify(state.gate3_5a),
      gate5Unassigned: JSON.stringify({
        campaigns: state.gate5.campaignRegistry.filter((item) => !item.product_id && !item.productId),
        reports: state.gate5.reports,
        iterations: state.gate5.iterations
      }),
      gate6Legacy: JSON.stringify(state.gate6Calendar.events),
      gate8Legacy: JSON.stringify({
        manual: state.gate8Forecast.manual,
        history: state.gate8Forecast.history,
        linkedTasks: state.gate8Forecast.linkedTasks,
        calendarActions: state.gate8Forecast.calendarActions
      })
    };
    return {
      logIds: logs.map((entry) => entry.id),
      logCounts: Object.fromEntries(logs.map((entry) => [entry.id, logs.filter((row) => row.id === entry.id).length])),
      legacy,
      gate5ProductCampaigns: state.gate5.campaignRegistry.filter((item) => item.product_id).length,
      gate6Products: Object.keys(state.gate6Calendar.byProduct || {}).length,
      gate8Products: Object.keys(state.gate8Forecast.byProduct || {}).length,
      goatCalendar: Object.values(state.gate6Calendar.byProduct?.[${JSON.stringify(goatId)}]?.events || {}).some((item) => item.campaign === ${JSON.stringify(calendarSentinel)}),
      shirtCalendar: Object.values(state.gate6Calendar.byProduct?.[${JSON.stringify(shirtId)}]?.events || {}).some((item) => item.campaign === ${JSON.stringify(calendarSentinel)}),
      goatForecast: state.gate8Forecast.byProduct?.[${JSON.stringify(goatId)}]?.manual?.budget,
      shirtForecast: state.gate8Forecast.byProduct?.[${JSON.stringify(shirtId)}]?.manual?.budget || ""
    };
  })()`);
  for (const id of [
    "gate3-company-product-v230",
    "gate5-company-product-v230",
    "gate6-company-product-v230",
    "gate7-company-product-v230",
    "gate8-company-product-v230",
  ]) {
    assert(result.logIds.includes(id), `Migration log is missing ${id}`);
    assert(result.logCounts[id] === 1, `Migration log ${id} is not idempotent`);
  }
  assert(result.legacy.gate3 === preimage.gate3, "Gate 3 legacy data changed");
  assert(result.legacy.gate5Unassigned === preimage.gate5Unassigned, "Gate 5 unassigned legacy data changed");
  assert(result.legacy.gate6Legacy === preimage.gate6Legacy, "Gate 6 legacy events changed");
  assert(result.legacy.gate8Legacy === preimage.gate8Legacy, "Gate 8 legacy scenario data changed");
  assert(result.goatCalendar && !result.shirtCalendar, "Gate 6 product isolation failed");
  assert(result.goatForecast === forecastSentinel && result.shirtForecast === "", "Gate 8 product isolation failed");

  console.log(
    JSON.stringify(
      {
        ok: true,
        gate1,
        gate3,
        gate5,
        gate6,
        gate7,
        gate8,
        storage: result,
      },
      null,
      2,
    ),
  );
} finally {
  if (page) page.close();
  if (browser && browserContextId) {
    await browser.call("Target.disposeBrowserContext", { browserContextId });
  }
  if (browser) browser.close();
}
