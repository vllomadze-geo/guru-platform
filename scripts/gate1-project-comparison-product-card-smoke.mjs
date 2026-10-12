const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9357";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
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

async function evaluate(page, expression) {
  const response = await page.call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails)
    throw new Error(
      response.exceptionDetails.exception?.description || response.exceptionDetails.text,
    );
  return response.result.value;
}

async function waitFor(page, expression, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(page, `Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

const browserVersion = await (
  await fetch(`http://127.0.0.1:${debugPort}/json/version`)
).json();
const browser = new CdpClient(browserVersion.webSocketDebuggerUrl);
await browser.ready;
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", {
  url: "about:blank",
  browserContextId,
});
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const target = targets.find((item) => item.id === targetId);
const page = new CdpClient(target.webSocketDebuggerUrl);
await page.ready;

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Page.addScriptToEvaluateOnNewDocument", {
    source: `{
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes("/api/")
        ? Promise.resolve(new Response(JSON.stringify({ ok: true, smoke: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }))
        : nativeFetch(input, init);
      window.__guruErrors = [];
      window.addEventListener("error", (event) => window.__guruErrors.push(event.message));
      window.addEventListener("unhandledrejection", (event) =>
        window.__guruErrors.push(String(event.reason?.message || event.reason))
      );
    }`,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(page, 'typeof bootstrapAppOnce === "function" && typeof gate1ComparisonProductMarketV306 === "function"');
  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = "gate1-comparison-product-v306-smoke";
    workspace.project.name = "Gate 1 comparison product smoke";
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: workspace.project.id,
      name: workspace.project.name,
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));
    localStorage.setItem(
      "guru-platform-workspace-v02-" + workspace.project.id,
      JSON.stringify(workspace),
    );
    location.reload();
  })()`);
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, 'Boolean(state) && typeof gate1ComparisonProductInjectV306 === "function"');

  const setup = await evaluate(page, `(() => {
    const category = guruV189CreateCategory("Сувениры", state);
    const product = {
      id: "comparison-goat-v306",
      name: "Коза",
      categoryId: category.id,
      continuum: "pure_product",
      createdAt: new Date().toISOString()
    };
    guruV189CatalogItems(state).push(product);
    const gate1 = state.gates.find((gate) => gate.id === "gate-1");
    const productCard = gate1.cards.find((card) => card.id === "card-24");
    const row = createPageStructureRow(product.name, false);
    row.catalogItemIdV189 = product.id;
    row.categoryId = product.categoryId;
    row.contextFields = {};
    productCard.pageRows = [row];
    productCardMigrateRowV253(row, product.id);
    Object.assign(row.contextFields, {
      productHeroV253__flag: "works",
      productGalleryV253__flag: "missing",
      productDeliveryGuaranteeV253__flag: "works",
      productMeaningV253__flag: "needs_improvement",
      productCreationV253__flag: "missing",
      productFinalCtaImplementedV253: "yes",
      productRelatedImplementedV253: ""
    });

    const comparison = ensureProjectComparison();
    comparison.open = true;
    comparison.competitors = [{ id: "competitor-v306", name: "Конкурент Козы" }];
    comparison.criteria.forEach((criterion) => { criterion.cells = {}; });
    const write = (key, text) => {
      const criterion = comparison.criteria.find((item) => item.coreKey === key);
      criterion.cells["competitor-v306"] = { text };
    };
    write("product", "Первый экран карточки: H1, цена и кнопка Купить. Есть описание товара и его преимущества.");
    write("assortment", "На карточке есть галерея товара с фотографиями и видео.");
    write("service", "Есть доставка, оплата, гарантия и возврат.");
    write("strengths", "Показывают процесс изготовления в мастерской и ручную работу.");
    write("promotion", "В конце страницы есть финальный CTA.");
    comparison.criteria.push({
      id: "comparison-related-v306",
      coreKey: "",
      name: "Рекомендации в карточке",
      description: "",
      cells: { "competitor-v306": { text: "Есть похожие товары и блок «С этим покупают»." } },
      leaderId: ""
    });

    const ui = guruV194Ui(state);
    ui.selectedCategoryId = category.id;
    ui.selectedProductId = product.id;
    activeGateId = "gate-1";
    renderGate();
    window.__comparisonProductBeforeV306 = {
      cards: JSON.stringify(gate1.cards),
      otherGates: JSON.stringify(state.gates.filter((gate) => gate.id !== "gate-1")),
      comparison: JSON.stringify(state.projectComparison)
    };
    const analysis = gate1ComparisonProductMarketV306();
    window.__comparisonProductAnalysisReadOnlyV306 =
      window.__comparisonProductBeforeV306.comparison === JSON.stringify(state.projectComparison);
    return { cardCount: gate1.cards.length, productId: product.id };
  })()`);
  await waitFor(page, 'document.querySelector("[data-g1-comparison-product-summary-v306]")');

  const initial = await evaluate(page, `(() => {
    const root = document.querySelector(".g1-redesign");
    const comparison = root.querySelector(
      '[data-g1-company-block-v299="seo-audit"] [data-g1-seo-item-v296="project-comparison"]',
    );
    const body = comparison.querySelector(":scope > .project-comparison-body");
    const toolbar = body.querySelector(":scope > .project-comparison-toolbar");
    const summary = body.querySelector(":scope > [data-g1-comparison-product-summary-v306]");
    const table = body.querySelector(":scope > .project-comparison-scroll");
    const rows = [...summary.querySelectorAll("[data-g1-comparison-product-block-v306]")]
      .map((node) => ({
        key: node.dataset.g1ComparisonProductBlockV306,
        title: node.querySelector("strong").textContent.trim(),
        own: node.querySelector(":scope > b").textContent.trim(),
      }));
    return {
      insideSeoCompany: Boolean(comparison && summary),
      adjacentBeforeTable: toolbar.nextElementSibling === summary && summary.nextElementSibling === table,
      majorityCount: Number(summary.dataset.g1ComparisonProductMajorityV306),
      rows,
      text: summary.textContent.replace(/\\s+/g, " ").trim(),
      productBlocks: root.querySelectorAll('[data-card="card-24"] .product-card-block-v253').length,
      readOnly: summary.querySelectorAll("input, textarea, select, button").length === 0,
      analysisReadOnly: window.__comparisonProductAnalysisReadOnlyV306,
    };
  })()`);

  const live = await evaluate(page, `(async () => {
    const comparison = state.projectComparison;
    const criterion = comparison.criteria.find((item) => item.coreKey === "assortment");
    const input = document.querySelector(
      '[data-project-comparison-cell="' + criterion.id + '"][data-project-comparison-owner="competitor-v306"]',
    );
    input.value = "Нет галереи товара";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();
    const summary = document.querySelector("[data-g1-comparison-product-summary-v306]");
    return {
      stored: projectComparisonCell(criterion, "competitor-v306").text,
      majorityCount: Number(summary.dataset.g1ComparisonProductMajorityV306),
      galleryVisible: Boolean(summary.querySelector('[data-g1-comparison-product-block-v306="productGalleryV253"]')),
      instanceCount: document.querySelectorAll("[data-g1-comparison-product-summary-v306]").length,
    };
  })()`);

  const finalResult = await evaluate(page, `(() => {
    const gate1 = state.gates.find((gate) => gate.id === "gate-1");
    return {
      cardCount: gate1.cards.length,
      cardsUnchanged: window.__comparisonProductBeforeV306.cards === JSON.stringify(gate1.cards),
      otherGatesUnchanged: window.__comparisonProductBeforeV306.otherGates === JSON.stringify(
        state.gates.filter((gate) => gate.id !== "gate-1"),
      ),
      errors: window.__guruErrors || [],
    };
  })()`);

  console.log(JSON.stringify({ setup, initial, live, finalResult }, null, 2));
  assert(initial.insideSeoCompany && initial.adjacentBeforeTable,
    `Summary is not beside projectComparison inside SEO Company: ${JSON.stringify(initial)}`);
  assert(initial.majorityCount === 7 && initial.rows.length === 7,
    `Not all seven competitor blocks were recognized: ${JSON.stringify(initial.rows)}`);
  const own = Object.fromEntries(initial.rows.map((row) => [row.key, row.own]));
  assert(own.productHeroV253 === "У нас: подтверждено" &&
    own.productDeliveryGuaranteeV253 === "У нас: подтверждено" &&
    own.productMeaningV253 === "У нас: подтверждено" &&
    own.productFinalCtaImplementedV253 === "У нас: подтверждено" &&
    own.productGalleryV253 === "У нас: отсутствует" &&
    own.productCreationV253 === "У нас: отсутствует" &&
    own.productRelatedImplementedV253 === "У нас: отсутствует",
    `Own Product Card statuses are wrong: ${JSON.stringify(own)}`);
  assert(initial.text.includes("У конкурентов чаще всего есть") &&
    initial.text.includes("Стоит проверить/добавить: Галерея изделия, Как создаётся, Похожие изделия"),
    `Expected textual recommendation is missing: ${initial.text}`);
  assert(initial.productBlocks === 7 && initial.readOnly && initial.analysisReadOnly,
    "The summary is not read-only or the existing seven Product Card blocks changed");
  assert(live.stored === "Нет галереи товара" && live.majorityCount === 6 &&
    !live.galleryVisible && live.instanceCount === 1,
    `Live comparison refresh or negation handling failed: ${JSON.stringify(live)}`);
  assert(setup.cardCount === 82 && finalResult.cardCount === 82 && finalResult.cardsUnchanged,
    `Gate 1 card structure changed: ${JSON.stringify(finalResult)}`);
  assert(finalResult.otherGatesUnchanged, "A non-Gate-1 gate changed");
  assert(finalResult.errors.length === 0, `Runtime errors: ${finalResult.errors.join(" | ")}`);
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
