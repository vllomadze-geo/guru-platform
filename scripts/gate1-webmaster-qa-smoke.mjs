import { readFile } from "node:fs/promises";

const sourcePath =
  process.env.GURU_PROJECT_EXPORT ||
  "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9339";
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
      response.exceptionDetails.exception?.description ||
        response.exceptionDetails.text,
    );
  return response.result.value;
}

async function waitFor(page, expression, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(page, `Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

const exported = JSON.parse(await readFile(sourcePath, "utf8"));
const fixture = exported.workspace || exported.state || exported;
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
const targets = await (
  await fetch(`http://127.0.0.1:${debugPort}/json`)
).json();
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
    }`,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(page, 'typeof bootstrapAppOnce === "function"');
  await evaluate(page, `(() => {
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: "gate1-webmaster-v295-smoke",
      name: "Gate 1 Webmaster smoke",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));
    localStorage.setItem(
      "guru-platform-workspace-v02-gate1-webmaster-v295-smoke",
      ${JSON.stringify(JSON.stringify(fixture))}
    );
    location.reload();
    return true;
  })()`);
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, 'Boolean(state) && typeof gate1WebmasterAuditV295 === "function"');

  const setup = await evaluate(page, `(() => {
    let products = guruV194Products(state);
    let goat = products.find((item) => /Коза/i.test(item.name));
    if (!goat) {
      const category = guruV189CreateCategory("Символы 2027", state);
      const items = guruV189CatalogItems(state);
      items.push({
        id: "smoke-goat-v295",
        name: "Символ 2027 года «Коза»",
        continuum: "product",
        categoryId: category.id,
        createdAt: new Date().toISOString(),
      });
      items.push({
        id: "smoke-horse-v295",
        name: "Создание лошадок",
        continuum: "product",
        categoryId: category.id,
        createdAt: new Date().toISOString(),
      });
      products = guruV194Products(state);
      goat = products.find((item) => /Коза/i.test(item.name));
    }
    if (!goat) throw new Error("Goat product not found");
    const other = products.find((item) => item.id !== goat.id);
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = goat.categoryId;
    ui.selectedProductId = goat.id;
    const company = gate1WebmasterStoreV295(state).company;
    Object.assign(company, {
      verificationMethod: "meta_tag",
      verificationStatus: "works",
      sitemapUrl: "https://k-apple.ru/sitemap.xml",
      sitemapStatus: "broken",
      robotsStatus: "needs_improvement",
      crawlErrorsStatus: "works",
      crawlErrors: "",
    });
    products.forEach((product) => {
      Object.assign(gate1WebmasterProductV295(product.id, state, true), {
        landingIndexed: "yes",
        checkedNote: "07.09.2026 · smoke",
      });
    });
    gate1WebmasterUpdateDerivedV295();
    saveState();
    guruNavigateToGate("gate-1");
    renderGate();
    return {
      build: window.GURU_BUILD_INFO?.version,
      goat,
      other,
      products: products.length,
      audit: gate1WebmasterAuditV295(state),
    };
  })()`);
  await waitFor(page, 'document.querySelector("[data-g1-webmaster-scope-v295=company]")');

  const gate1 = await evaluate(page, `(() => {
    const company = document.querySelector('[data-g1-webmaster-scope-v295="company"]');
    const product = document.querySelector('[data-g1-webmaster-scope-v295="product"]');
    const root = document.querySelector('.g1-redesign');
    const siteAudit = [...root.querySelectorAll('.g1-section')].find((node) =>
      /Аудит сайта/i.test(node.textContent || "")
    );
    const fields = [...company.querySelectorAll('[data-g1-webmaster-field]')]
      .map((node) => node.dataset.g1WebmasterField);
    return {
      companyVisible: Boolean(company),
      productVisible: Boolean(product),
      productId: product?.dataset.g1WebmasterProductIdV295 || "",
      fields,
      separateFromAudit: Boolean(siteAudit) && !siteAudit.contains(company),
      companyBeforeAudit: Boolean(siteAudit) && Boolean(
        company.compareDocumentPosition(siteAudit) & Node.DOCUMENT_POSITION_FOLLOWING
      ),
      productValue: product?.querySelector('[data-g1-webmaster-product-v295="landingIndexed"]')?.value || "",
      productNote: product?.querySelector('[data-g1-webmaster-product-v295="checkedNote"]')?.value || "",
      errorListEmpty: company.querySelector('[data-g1-webmaster-errors-list-v295]')?.classList.contains('is-empty') || false,
      errorListText: company.querySelector('[data-g1-webmaster-errors-list-v295]')?.textContent?.trim() || "",
    };
  })()`);

  const crawlErrors = await evaluate(page, `(() => {
    const input = document.querySelector('[data-g1-webmaster-company-v295="crawlErrors"]');
    input.value = "Недоступна /catalog/goat\\nЦиклический редирект /old-goat";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const populated = {
      rows: document.querySelectorAll('[data-g1-webmaster-errors-list-v295] li').length,
      status: gate1WebmasterErrorsStatusV295(state),
      stored: JSON.parse(localStorage.getItem(
        "guru-platform-workspace-v02-gate1-webmaster-v295-smoke"
      )).gate1WebmasterV295.company.crawlErrors,
    };
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return {
      populated,
      resetEmpty: document.querySelector('[data-g1-webmaster-errors-list-v295]')
        ?.classList.contains('is-empty') || false,
    };
  })()`);

  const productSwitch = await evaluate(page, `(() => {
    const ui = guruV194Ui(state);
    const other = ${JSON.stringify(setup.other)};
    if (!other) return { skipped: true };
    ui.selectedCategoryId = other.categoryId;
    ui.selectedProductId = other.id;
    gate1WebmasterProductV295(other.id, state, true).landingIndexed = "no";
    renderGate();
    const otherValue = document.querySelector('[data-g1-webmaster-product-v295="landingIndexed"]')?.value;
    ui.selectedCategoryId = ${JSON.stringify(setup.goat.categoryId)};
    ui.selectedProductId = ${JSON.stringify(setup.goat.id)};
    renderGate();
    const goatValue = document.querySelector('[data-g1-webmaster-product-v295="landingIndexed"]')?.value;
    saveState();
    return { skipped: false, otherValue, goatValue };
  })()`);

  const gate0 = await evaluate(page, `(() => {
    const metrikaBefore = JSON.stringify(
      state.gates.find((gate) => gate.id === "gate-0").cards.find(isMegaMarketingCard)
        .megaMarketing.infra.find((row) => row.name === "Яндекс Метрика")
    );
    guruNavigateToGate("gate-0");
    renderGate();
    const derived = document.querySelector('[data-g1-webmaster-derived-v295="1"]');
    const metrikaRow = [...document.querySelectorAll('.cr-table tr')].find((row) =>
      row.querySelector('.cr-label')?.textContent?.trim() === "Яндекс Метрика"
    );
    const metrikaAfter = JSON.stringify(
      state.gates.find((gate) => gate.id === "gate-0").cards.find(isMegaMarketingCard)
        .megaMarketing.infra.find((row) => row.name === "Яндекс Метрика")
    );
    return {
      derivedExists: Boolean(derived),
      derivedHasEditableStatus: Boolean(derived?.querySelector('[data-mega-field="status"]')),
      derivedHasEditableComment: Boolean(derived?.querySelector('[data-mega-field="comment"]')),
      derivedHasGate1Link: Boolean(derived?.querySelector('[data-g1-webmaster-open-v295]')),
      metrikaStillEditable: Boolean(metrikaRow?.querySelector('[data-mega-field="status"]')),
      metrikaUnchanged: metrikaBefore === metrikaAfter,
      derivedStoredStatus: state.gates.find((gate) => gate.id === "gate-0")
        .cards.find(isMegaMarketingCard).megaMarketing.infra
        .find((row) => row.name === "Яндекс Вебмастер")?.status || "",
    };
  })()`);

  const gate2 = await evaluate(page, `(() => {
    guruNavigateToGate("gate-2");
    renderGate();
    const ids = ["card-107", "card-108", "card-109", "card-110", "card-111"];
    return ids.map((id) => {
      const card = state.gates.find((gate) => gate.id === "gate-2").cards.find((item) => item.id === id);
      const node = document.querySelector('[data-card="' + id + '"]');
      const link = node?.querySelector('[data-g2-source-link]');
      const diagnostic = guruExportGate2CardDiagnosticV223(card, card.status);
      return {
        id,
        status: g2CardStatus(card),
        field: link?.dataset.g2SourceItem || "",
        sourceCard: link?.dataset.g2SourceCard || "",
        sourceType: diagnostic.selectedSource?.sourceType || "",
        sourcePath: diagnostic.selectedSource?.path || "",
      };
    });
  })()`);

  const indexingLink = await evaluate(page, `(() => {
    const link = document.querySelector('[data-card="card-110"] [data-g2-source-link]');
    if (!link) return { clicked: false };
    link.click();
    return { clicked: true };
  })()`);
  await waitFor(page, 'activeGateId === "gate-1"');
  await waitFor(page, 'document.querySelector(".guru-source-target-v212")');
  const indexingNavigation = await evaluate(page, `(() => ({
    gate: activeGateId,
    highlightedField: document.querySelector('.guru-source-target-v212')
      ?.dataset.g1WebmasterField || "",
    selectedProductId: guruV194Ui(state).selectedProductId,
  }))()`);

  const directLink = await evaluate(page, `(() => {
    guruNavigateToGate("gate-2");
    renderGate();
    const link = document.querySelector('[data-card="card-108"] [data-g2-source-link]');
    if (!link) return { clicked: false };
    link.click();
    return { clicked: true };
  })()`);
  await waitFor(page, 'activeGateId === "gate-1"');
  await waitFor(page, 'document.querySelector(".guru-source-target-v212")');
  const navigation = await evaluate(page, `(() => ({
    gate: activeGateId,
    highlightedField: document.querySelector('.guru-source-target-v212')
      ?.dataset.g1WebmasterField || "",
    selectedProductId: guruV194Ui(state).selectedProductId,
  }))()`);

  const card167 = await evaluate(page, `(() => {
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = ${JSON.stringify(setup.goat.categoryId)};
    ui.selectedProductId = ${JSON.stringify(setup.goat.id)};
    guruNavigateToGate("gate-4");
    renderGate();
    const card = document.querySelector('[data-g4-readiness-card="card-167"]');
    card.open = true;
    const row = card.querySelector('[data-g4-readiness-row-key-view=${JSON.stringify("цель_метрики_срабатывает_на_конверсионном_действии_товара")}]');
    const status = row?.querySelector('[data-g4-readiness-row-field="status"]');
    let goal = row?.querySelector('[data-g4-readiness-row-field="result"]');
    if (status && goal) {
      status.value = "works";
      status.dispatchEvent(new Event("change", { bubbles: true }));
      goal = document.querySelector(
        '[data-g4-readiness-card="card-167"] [data-g4-readiness-row-key="' +
          ${JSON.stringify("цель_метрики_срабатывает_на_конверсионном_действии_товара")} +
          '"][data-g4-readiness-row-field="result"]'
      );
      goal.value = "goal-2027-order";
      goal.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const stored = g4ReadinessProductRowV225(
      ${JSON.stringify(setup.goat.id)},
      "card-167",
      ${JSON.stringify("цель_метрики_срабатывает_на_конверсионном_действии_товара")},
      state,
    );
    saveState();
    return {
      rowExists: Boolean(row),
      statusOptions: [...(status?.options || [])].map((option) => option.textContent.trim()),
      stored: stored ? { status: stored.status, result: stored.result } : null,
      audit: gate1WebmasterAuditV295(state),
    };
  })()`);

  await evaluate(page, 'location.reload(); true');
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, 'Boolean(state) && typeof gate1WebmasterAuditV295 === "function"');
  const hardReload = await evaluate(page, `(() => {
    const audit = gate1WebmasterAuditV295(state);
    return {
      sitemapUrl: audit.company.sitemapUrl,
      goatIndexed: gate1WebmasterProductV295(${JSON.stringify(setup.goat.id)}, state, false)?.landingIndexed || "",
      otherIndexed: ${JSON.stringify(setup.other?.id || "")} ?
        gate1WebmasterProductV295(${JSON.stringify(setup.other?.id || "")}, state, false)?.landingIndexed || "" : "",
      gate0Status: audit.gate0Webmaster?.status || "",
      gate2IndexingStatus: audit.gate2.find((item) => item.cardId === "card-110")?.status || "",
    };
  })()`);

  assert(setup.build === "2.3.152", `Unexpected build ${setup.build}`);
  assert(
    gate1.companyVisible && gate1.productVisible && gate1.separateFromAudit && gate1.companyBeforeAudit,
    `Webmaster blocks are missing or nested in Site Audit: ${JSON.stringify(gate1)}`,
  );
  assert(
    JSON.stringify(gate1.fields) === JSON.stringify([
      "verification", "sitemap", "robots", "crawl_errors",
    ]),
    `Company Webmaster fields differ: ${JSON.stringify(gate1.fields)}`,
  );
  assert(
    gate1.productId === setup.goat.id && gate1.productValue === "yes" && gate1.productNote,
    `Goat product indexing did not render: ${JSON.stringify(gate1)}`,
  );
  assert(
    gate1.errorListEmpty && /Ошибок нет/.test(gate1.errorListText) &&
      crawlErrors.populated.rows === 2 && crawlErrors.populated.status === "problem" &&
      /Циклический редирект/.test(crawlErrors.populated.stored) && crawlErrors.resetEmpty,
    `Crawl-error list or durable input persistence failed: ${JSON.stringify({ gate1, crawlErrors })}`,
  );
  assert(
    productSwitch.skipped ||
      (productSwitch.otherValue === "no" && productSwitch.goatValue === "yes"),
    `Product-scoped indexing leaked between products: ${JSON.stringify(productSwitch)}`,
  );
  assert(
    gate0.derivedExists && !gate0.derivedHasEditableStatus &&
      !gate0.derivedHasEditableComment && gate0.derivedHasGate1Link,
    `Gate 0 Webmaster is not a read-only derived row: ${JSON.stringify(gate0)}`,
  );
  assert(
    gate0.metrikaStillEditable && gate0.metrikaUnchanged,
    `Gate 0 Yandex Metrika was modified: ${JSON.stringify(gate0)}`,
  );
  assert(
    new Set(gate2.map((row) => row.field)).size === 5 &&
      gate2.every((row) => row.sourceCard === "gate1-webmaster-v295") &&
      gate2.every((row) => row.sourceType === "gate1_webmaster_field"),
    `Gate 2 does not use five field-specific sources: ${JSON.stringify(gate2)}`,
  );
  assert(
    JSON.stringify(gate2.map((row) => row.status)) ===
      JSON.stringify([
        "ready", "problem", "in_progress",
        productSwitch.skipped ? "ready" : "problem",
        "ready",
      ]),
    `Gate 2 statuses are not independently resolved: ${JSON.stringify(gate2)}`,
  );
  assert(
    indexingLink.clicked && indexingNavigation.gate === "gate-1" &&
      indexingNavigation.highlightedField === "product_indexing" &&
      (productSwitch.skipped || indexingNavigation.selectedProductId === setup.other.id),
    `Gate 2 indexing did not open the affected product field: ${JSON.stringify(indexingNavigation)}`,
  );
  assert(
    directLink.clicked && navigation.gate === "gate-1" &&
      navigation.highlightedField === "sitemap" &&
      navigation.selectedProductId === (setup.other?.id || setup.goat.id),
    `Gate 2 direct field navigation failed: ${JSON.stringify(navigation)}`,
  );
  assert(
    card167.rowExists &&
      JSON.stringify(card167.statusOptions) === JSON.stringify(["Не проверено", "Работает", "Не работает"]) &&
      card167.stored?.status === "works" &&
      card167.stored?.result === "goal-2027-order" &&
      card167.audit.card167.metrikaGoalRows === 1,
    `card-167 Metrika goal QA is wrong: ${JSON.stringify(card167)}`,
  );
  assert(
    hardReload.sitemapUrl === "https://k-apple.ru/sitemap.xml" &&
      hardReload.goatIndexed === "yes" &&
      (productSwitch.skipped || hardReload.otherIndexed === "no") &&
      hardReload.gate0Status === "broken" &&
      hardReload.gate2IndexingStatus === (productSwitch.skipped ? "ready" : "problem"),
    `Webmaster source did not survive a hard reload: ${JSON.stringify(hardReload)}`,
  );

  console.log(JSON.stringify({
    build: setup.build,
    project: "Коза",
    products: setup.products,
    gate1,
    crawlErrors,
    productSwitch,
    gate0,
    gate2,
    indexingNavigation,
    navigation,
    card167,
    hardReload,
  }, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
