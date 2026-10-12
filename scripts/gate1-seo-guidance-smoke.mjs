import { mkdir, writeFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9358";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const artifactDir = new URL(
  process.env.GURU_ARTIFACT_PATH || "../artifacts/gate1-seo-guidance-v307/",
  import.meta.url,
);
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

async function captureElement(selector, filename) {
  const box = await evaluate(page, `(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    if (!node) throw new Error("Screenshot target not found: " + ${JSON.stringify(selector)});
    let ancestor = node;
    while (ancestor) {
      if (ancestor.hidden) ancestor.hidden = false;
      if (ancestor.tagName === "DETAILS") ancestor.open = true;
      ancestor = ancestor.parentElement;
    }
    node.scrollIntoView({ block: "start" });
    const rect = node.getBoundingClientRect();
    return {
      x: Math.max(0, rect.left + scrollX),
      y: Math.max(0, rect.top + scrollY),
      width: Math.max(1, Math.min(rect.width, 1900)),
      height: Math.max(1, Math.min(rect.height, 6000)),
    };
  })()`);
  await wait(80);
  const shot = await page.call("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { ...box, scale: 1 },
  });
  await writeFile(new URL(filename, artifactDir), Buffer.from(shot.data, "base64"));
  return { filename, ...box };
}

try {
  await mkdir(artifactDir, { recursive: true });
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 1400,
    deviceScaleFactor: 1,
    mobile: false,
  });
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
  await waitFor(page, 'typeof bootstrapAppOnce === "function" && typeof gate1SeoGuidanceInjectV307 === "function"');
  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = "gate1-seo-guidance-v307-smoke";
    workspace.project.name = "Gate 1 SEO guidance smoke";
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
  await waitFor(page, 'Boolean(state) && typeof gate1SeoGuidanceInjectV307 === "function"');

  const setup = await evaluate(page, `(() => {
    const gate1 = state.gates.find((gate) => gate.id === "gate-1");
    const category = guruV189CreateCategory("SEO guidance", state);
    const product = {
      id: "seo-guidance-goat-v307",
      name: "Коза",
      categoryId: category.id,
      continuum: "pure_product",
      createdAt: new Date().toISOString()
    };
    guruV189CatalogItems(state).push(product);
    const productCard = gate1.cards.find((card) => card.id === "card-24");
    const row = createPageStructureRow("Коза", false);
    row.catalogItemIdV189 = product.id;
    row.categoryId = product.categoryId;
    row.url = "https://example.ru/goat";
    row.title = "Коза ручной работы — купить авторский подарок";
    row.description = "Авторская Коза ручной работы: подарок с характером, подробным описанием, доставкой и гарантией.";
    row.contextFields = { seoKeywords: "коза ручной работы, авторский подарок" };
    productCard.pageRows = [row];
    productCardMigrateRowV253(row, product.id);

    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    const pointCard = gate0.cards.find((card) =>
      card.id === "card-7" || card.title === "Текущее состояние маркетинговой системы"
    );
    const platform = ensureMegaMarketing(pointCard, state).platformV2;
    const gate0Urls = new Map([
      ["Главная страница", "https://example.ru/"],
      ["Страница продукта / услуги / каталог", "https://example.ru/catalog"],
      ["Форма заявки / корзина", "https://example.ru/contacts"],
    ]);
    platform.fundamental.forEach((item) => {
      if (gate0Urls.has(item.name)) item.url = gate0Urls.get(item.name);
    });
    platform.landings[product.name] = {
      ...(platform.landings[product.name] || {}),
      url: "https://example.ru/goat",
      status: "ready",
    };
    platform.extra = (platform.extra || []).filter((item) =>
      !["Доставка", "Страница спасибо"].includes(item.name)
    );
    platform.extra.push(
      { name: "Доставка", url: "https://example.ru/delivery", status: "ready", comment: "" },
      { name: "Корзина", url: "https://example.ru/cart", status: "ready", comment: "" },
      { name: "Страница спасибо", url: "https://example.ru/thank-you", status: "ready", comment: "" },
    );

    const robotsCard = gate1.cards.find(isRobotsUnifiedCard);
    const robots = ensureRobotsV130(robotsCard);
    robots.yandex.urlResults.find((item) => item.url === "https://example.ru/").result = "Разрешено";
    robots.yandex.importantOk = "yes";
    robots.yandex.serviceOk = "yes";
    ensureRobotsV130(robotsCard);
    robots.google = { enabled: "yes", importantOk: "yes" };
    robotsCard.robotsUnified = robotsCard.robotsUnified || { systems: {} };
    robotsCard.robotsUnified.systems = robotsCard.robotsUnified.systems || {};
    robotsCard.robotsUnified.systems.google = { enabled: true, status: "ok" };
    const comparison = ensureProjectComparison();
    comparison.open = true;
    comparison.competitors = [{ id: "guide-competitor-v307", name: "Конкурент Козы" }];
    comparison.criteria.forEach((criterion) => { criterion.cells = {}; });
    comparison.criteria.find((criterion) => criterion.coreKey === "service")
      .cells["guide-competitor-v307"] = { text: "Есть доставка, гарантии и отзывы." };

    const blog = gate1BlogStoreV304(state);
    blog.articles = [gate1BlogNewArticleV304()];
    blog.articles[0].title = "Как выбрать Козу в подарок";
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = category.id;
    ui.selectedProductId = product.id;
    const accordion = getGate1AccordionState();
    gate1.cards.forEach((card) => { accordion.cards[card.id] = true; });
    activeGateId = "gate-1";
    renderGate();
    window.__gate1SeoGuidanceBeforeV307 = {
      cards: JSON.stringify(gate1.cards),
      otherGates: JSON.stringify(state.gates.filter((gate) => gate.id !== "gate-1")),
      workspace: JSON.stringify(state)
    };
    gate1SeoGuidanceInjectV307();
    window.__gate1SeoGuidanceProjectionPureV307 =
      window.__gate1SeoGuidanceBeforeV307.workspace === JSON.stringify(state);
    return { build: window.GURU_BUILD_INFO?.version, cardCount: gate1.cards.length, productId: product.id };
  })()`);
  await waitFor(page, 'document.querySelector("[data-g1-seo-guide-v307=blog-product-links]")');

  const result = await evaluate(page, `(() => {
    const root = document.querySelector(".g1-redesign");
    const guides = [...root.querySelectorAll("[data-g1-seo-guide-v307]")];
    const keys = guides.map((node) => node.dataset.g1SeoGuideV307);
    const descriptions = [
      "robots-block", "canonical-block", "meta-block",
      "cwv-block", "ssl-block", "webmaster-company-block", "comparison-block",
      "interactive-block", "snippet-block", "webmaster-product-block", "blog-product-block"
    ];
    const expectedHints = [
      "robots-url", "robots-domain", "robots-yandex-enabled",
      "robots-errors", "robots-sitemap", "robots-important", "robots-service",
      "robots-important-urls", "robots-service-urls",
      "canonical-url", "canonical-table", "meta-table", "cwv-table",
      "ssl-domain", "ssl-httpsWorks", "ssl-httpCode", "ssl-certValid", "ssl-domainMatch",
      "ssl-expiresIn", "ssl-chain", "ssl-evidence", "webmaster-method",
      "webmaster-status", "webmaster-diagnostics", "webmaster-errors",
      "comparison-competitors", "comparison-criteria", "interactive-exists",
      "interactive-idea", "snippet-title", "snippet-description",
      "snippet-keywords", "webmaster-product-result", "webmaster-product-note",
      "blog-product-links"
    ];
    const oldTexts = [
      "Один сайт, доступный по нескольким адресам",
      "Универсальная карта рынка и конкурентных преимуществ",
      "Прежде чем решать, какие блоки нужны сайту"
    ];
    const gate1 = state.gates.find((gate) => gate.id === "gate-1");
    return {
      guideCount: guides.length,
      uniqueGuideCount: new Set(keys).size,
      descriptions: Object.fromEntries(descriptions.map((key) => [
        key,
        gate1SeoGuideTextV307(root.querySelector('[data-g1-seo-guide-v307="' + key + '"]')?.textContent)
      ])),
      webmasterProductWhiteSpace: getComputedStyle(
        root.querySelector('[data-g1-seo-guide-v307="webmaster-product-block"]')
      ).whiteSpace,
      missingHints: expectedHints.filter((key) => !keys.includes(key)),
      duplicateKeys: keys.filter((key, index) => keys.indexOf(key) !== index),
      oldTextsVisible: oldTexts.filter((text) => root.textContent.includes(text)),
      comparisonCriteriaAdapted: root.querySelector('[data-g1-seo-guide-v307="comparison-criteria"]')?.textContent || "",
      blogLinksAdapted: root.querySelector('[data-g1-seo-guide-v307="blog-product-links"]')?.textContent || "",
      robotsErrorsHint: root.querySelector('[data-g1-seo-guide-v307="robots-errors"]')?.textContent || "",
      robotsSitemapHint: root.querySelector('[data-g1-seo-guide-v307="robots-sitemap"]')?.textContent || "",
      robotsImportantHint: root.querySelector('[data-g1-seo-guide-v307="robots-important"]')?.textContent || "",
      robotsServiceHint: root.querySelector('[data-g1-seo-guide-v307="robots-service"]')?.textContent || "",
      sslGuidance: Object.fromEntries([
        "httpsWorks", "certValid", "domainMatch", "expiresIn", "chain", "evidence"
      ].map((field) => {
        const node = root.querySelector('[data-g1-seo-guide-v307="ssl-' + field + '"]');
        return [field, {
          text: node?.textContent || "",
          href: node?.querySelector("a")?.href || "",
        }];
      })),
      robotsGate0Routing: (() => {
        const robotsCard = gate1.cards.find(isRobotsUnifiedCard);
        return {
          important: structuredClone(robotsCard.robotsV130.yandex.urlResults),
          service: structuredClone(robotsCard.robotsV130.yandex.serviceResults),
          importantDom: [...root.querySelectorAll('[data-rv2-table="url"]')].map((node) =>
            node.closest("tr")?.querySelector("td")?.textContent?.trim()
          ),
          serviceDom: [...root.querySelectorAll('[data-rv2-table="service"]')].map((node) =>
            node.closest("tr")?.querySelector("td")?.textContent?.trim()
          ),
        };
      })(),
      robotsUrlFlow: (() => {
        const importantHeading = root.querySelector('[data-rv2-url-heading="important"]');
        const serviceHeading = root.querySelector('[data-rv2-url-heading="service"]');
        const importantTitle = root.querySelector('[data-rv2-url-title="important"]');
        const serviceTitle = root.querySelector('[data-rv2-url-title="service"]');
        const importantDescription = root.querySelector('[data-g1-seo-guide-v307="robots-important"]');
        const serviceDescription = root.querySelector('[data-g1-seo-guide-v307="robots-service"]');
        const importantHint = root.querySelector('[data-g1-seo-guide-v307="robots-important-urls"]');
        const serviceHint = root.querySelector('[data-g1-seo-guide-v307="robots-service-urls"]');
        return {
          noSeparateContainers: root.querySelectorAll(".rv2-url-details").length === 0,
          aggregateSelectorsAbsent: !root.querySelector('[data-rv2-field="importantOk"], [data-rv2-field="serviceOk"]'),
          importantGrouped: importantHeading?.nextElementSibling === importantDescription &&
            importantDescription?.nextElementSibling === importantTitle &&
            importantTitle?.nextElementSibling === importantHint &&
            importantHint?.nextElementSibling?.matches("table.rv2-url-table"),
          serviceGrouped: serviceHeading?.nextElementSibling === serviceDescription &&
            serviceDescription?.nextElementSibling === serviceTitle &&
            serviceTitle?.nextElementSibling === serviceHint &&
            serviceHint?.nextElementSibling?.matches("table.rv2-url-table"),
        };
      })(),
      robotsAggregateStoragePurged: (() => {
        const yandex = gate1.cards.find(isRobotsUnifiedCard).robotsV130.yandex;
        return !Object.hasOwn(yandex, "importantOk") && !Object.hasOwn(yandex, "serviceOk");
      })(),
      robotsCheckDateAbsent: !root.querySelector('[data-card="card-14"] [data-rv2="checkDate"]') &&
        ![...root.querySelectorAll('[data-card="card-14"] label')].some((label) =>
          gate1SeoGuideTextV307(label.textContent).includes("Дата проверки")
        ),
      googleSearchConsoleAbsent: !root.textContent.includes("Google Search Console") &&
        !root.querySelector('[data-rv2-sys="google"], [data-sm-v130-system="google"]'),
      googleSeoStoragePurged: (() => {
        const robotsCard = gate1.cards.find(isRobotsUnifiedCard);
        return !Object.hasOwn(robotsCard.robotsV130 || {}, "google") &&
          !Object.hasOwn(robotsCard.robotsUnified?.systems || {}, "google");
      })(),
      standaloneSitemapAbsent: !gate1.cards.some((card) =>
        card.id === "card-15" || isSitemapUnifiedCard(card)
      ),
      legacySitemapMigration: (() => {
        const workspace = structuredClone(state);
        const probeGate = workspace.gates.find((gate) => gate.id === "gate-1");
        const robotsIndex = probeGate.cards.findIndex((card) => isRobotsUnifiedCard(card));
        probeGate.cards.splice(robotsIndex + 1, 0, {
          id: "card-15",
          title: "Sitemap.xml Яндекс Вебмастер",
          sitemapV130: {
            url: "https://legacy.example.ru/sitemap.xml",
            yandex: { status: "works" },
          },
        });
        const before = probeGate.cards.length;
        gate1RemoveStandaloneSitemapV308(workspace);
        const robots = ensureRobotsV130(probeGate.cards.find(isRobotsUnifiedCard), workspace);
        const row = robots.yandex.sitemaps.find(
          (item) => item.url === "https://legacy.example.ru/sitemap.xml",
        );
        return {
          before,
          after: probeGate.cards.length,
          cardAbsent: !probeGate.cards.some((card) => card.id === "card-15"),
          row: structuredClone(row || null),
        };
      })(),
      cardCount: gate1.cards.length,
      cardsUnchanged: window.__gate1SeoGuidanceBeforeV307.cards === JSON.stringify(gate1.cards),
      otherGatesUnchanged: window.__gate1SeoGuidanceBeforeV307.otherGates === JSON.stringify(
        state.gates.filter((gate) => gate.id !== "gate-1")
      ),
      workspaceUnchangedByInjection: window.__gate1SeoGuidanceProjectionPureV307,
      errors: window.__guruErrors || []
    };
  })()`);

  const sitemapRowsInteraction = await evaluate(page, `(() => {
    const root = document.querySelector('[data-card="card-14"]');
    const url = root.querySelector('[data-rv2-sitemap-field="url"][data-rv2-sitemap-idx="0"]');
    const status = root.querySelector('[data-rv2-sitemap-field="status"][data-rv2-sitemap-idx="0"]');
    url.value = "https://example.ru/sitemap.xml";
    url.dispatchEvent(new Event("input", { bubbles: true }));
    status.value = "ok";
    status.dispatchEvent(new Event("change", { bubbles: true }));
    root.querySelector('[data-rv2-sitemap-add]').click();
    const card = state.gates.find((gate) => gate.id === "gate-1").cards.find(isRobotsUnifiedCard);
    return {
      visibleRows: document.querySelectorAll('[data-card="card-14"] [data-rv2-sitemap-row]').length,
      storedRows: card.robotsV130.yandex.sitemaps.length,
      first: structuredClone(card.robotsV130.yandex.sitemaps[0]),
      addButtonVisible: Boolean(document.querySelector('[data-card="card-14"] [data-rv2-sitemap-add]')),
      removeButtonVisible: Boolean(document.querySelector('[data-card="card-14"] [data-rv2-sitemap-remove="1"]')),
    };
  })()`);

  const copyUrlsInteraction = await evaluate(page, `(async () => {
    const copied = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (text) => copied.push(text) },
    });
    const card = state.gates.find((gate) => gate.id === "gate-1").cards.find(isRobotsUnifiedCard);
    const before = JSON.stringify(card.robotsV130);
    const importantButton = document.querySelector('[data-card="card-14"] [data-rv2-copy-urls="important"]');
    const serviceButton = document.querySelector('[data-card="card-14"] [data-rv2-copy-urls="service"]');
    importantButton.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const importantFeedback = importantButton.textContent.trim();
    serviceButton.click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    const serviceFeedback = serviceButton.textContent.trim();
    return {
      copied,
      importantFeedback,
      serviceFeedback,
      stateUnchanged: before === JSON.stringify(card.robotsV130),
    };
  })()`);

  const robotsRowStatus = await evaluate(page, `(() => {
    const card = state.gates.find((gate) => gate.id === "gate-1").cards.find(isRobotsUnifiedCard);
    const before = structuredClone(card.robotsV130);
    const fields = ensureRobotsV130(card);
    fields.url = "https://example.ru/robots.txt";
    fields.yandex.errors = "0";
    fields.yandex.sitemaps = [{ url: "https://example.ru/sitemap.xml", status: "ok" }];
    fields.yandex.urlResults.forEach((row) => { row.result = "Разрешено"; });
    fields.yandex.serviceResults.forEach((row) => { row.result = "Запрещено"; });
    const ready = robotsV130CardStatus(card);
    const canonicalReady = gate1SeoCanonicalRobotsStatusV298(state);
    fields.yandex.urlResults[0].result = "Запрещено";
    const problem = robotsV130CardStatus(card);
    const canonicalProblem = gate1SeoCanonicalRobotsStatusV298(state);
    card.robotsV130 = before;
    return { ready, canonicalReady, problem, canonicalProblem };
  })()`);

  const redirectInteraction = await evaluate(page, `(() => {
    const cardNode = document.querySelector('[data-card="card-16"]');
    const setValue = (selector, value) => {
      const input = document.querySelector(selector);
      if (!input) throw new Error("Redirect field not found: " + selector);
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };
    setValue('[data-card="card-16"] [data-rdr-v130-field="domain"]', "example.ru");
    const variants = [
      "https://example.ru/", "http://example.ru/",
      "https://www.example.ru/", "http://www.example.ru/",
    ];
    variants.forEach((variant, index) => {
      setValue('[data-card="card-16"] [data-rdr-v130-index="' + index + '"][data-rdr-v130-col="code"]', index === 0 ? "200" : "301");
      setValue('[data-card="card-16"] [data-rdr-v130-index="' + index + '"][data-rdr-v130-col="result"]', "ok");
    });
    const card = state.gates.find((gate) => gate.id === "gate-1").cards.find((item) => item.id === "card-16");
    const header = cardNode.querySelector(":scope > .g1-card-header");
    const statusPill = header?.querySelector(":scope > .status-pill");
    const instruction = header?.querySelector('[data-g1-seo-guide-v307="canonical-block"]');
    const headerRect = header?.getBoundingClientRect();
    const statusRect = statusPill?.getBoundingClientRect();
    const ready = {
      variants: card.redirectV130.rows.map((row) => row.variant),
      expectedCodes: card.redirectV130.rows.map((row) => row.expectedCode),
      results: card.redirectV130.rows.map((row) => row.result),
      resultOptions: [...cardNode.querySelectorAll('[data-rdr-v130-col="result"]')].map((node) =>
        [...node.options].map((option) => option.textContent.trim())
      ),
      summary: cardNode.querySelector("[data-rdr-v130-summary]")?.textContent.replace(/\\s+/g, " ").trim() || "",
      canonicalUrl: card.redirectV130.canonicalUrl,
      status: card.status,
      rowCount: card.redirectV130.rows.length,
      headers: [...cardNode.querySelectorAll(".redirect-v130-table th")].map((node) => node.textContent.trim()),
      instructionLines: (instruction?.textContent || "").split(/\\n/).map((line) => line.trim()).filter(Boolean),
      instructionWhiteSpace: instruction ? getComputedStyle(instruction).whiteSpace : "",
      statusTopRight: Boolean(headerRect && statusRect &&
        Math.abs(headerRect.right - statusRect.right) <= 30 &&
        statusRect.top - headerRect.top <= 30 &&
        statusRect.width < headerRect.width / 2),
      obsoleteControlsAbsent: !cardNode.querySelector('[data-rdr-v130-col="variant"], [data-rdr-v130-col="finalUrl"], [data-rdr-v130-col="status"], [data-rdr-v130-col="evidence"], [data-rdr-v130-add], [data-rdr-v130-remove]'),
    };
    setValue('[data-card="card-16"] [data-rdr-v130-index="1"][data-rdr-v130-col="result"]', "error");
    const problem = {
      value: document.querySelector('[data-card="card-16"] [data-rdr-v130-verdict="1"]')?.value || "",
      status: card.status,
    };
    setValue('[data-card="card-16"] [data-rdr-v130-index="1"][data-rdr-v130-col="result"]', "ok");
    return { ready, problem, restoredStatus: card.status };
  })()`);
  await wait(1700);

  const sslInteraction = await evaluate(page, `(() => {
    const setValue = (field, value) => {
      const control = document.querySelector('[data-card="card-20"] [data-ssl-v130-field="' + field + '"]');
      if (!control) throw new Error("SSL field not found: " + field);
      control.value = value;
      control.dispatchEvent(new Event("input", { bubbles: true }));
      control.dispatchEvent(new Event("change", { bubbles: true }));
    };
    setValue("domain", "https://example.ru/path");
    setValue("httpsWorks", "yes");
    setValue("httpCode", "200");
    setValue("certValid", "yes");
    setValue("domainMatch", "yes");
    setValue("expiresIn", "1");
    setValue("chain", "trusted");
    setValue("evidence", "https://www.ssllabs.com/ssltest/analyze.html?d=example.ru");
    const cardNode = document.querySelector('[data-card="card-20"]');
    const card = state.gates.find((gate) => gate.id === "gate-1").cards.find((item) => item.id === "card-20");
    const instruction = cardNode.querySelector('[data-g1-seo-guide-v307="ssl-block"]');
    const ready = {
      fields: structuredClone(card.sslV130),
      fieldNames: [...cardNode.querySelectorAll("[data-ssl-v130-field]")].map((node) => node.dataset.sslV130Field),
      summary: cardNode.querySelector("[data-ssl-v130-summary]")?.textContent.replace(/\\s+/g, " ").trim() || "",
      headerStatus: cardNode.querySelector(":scope > .g1-card-header > .status-pill")?.textContent.trim() || "",
      status: card.status,
      instructionLines: (instruction?.textContent || "").split(/\\n/).map((line) => line.trim()).filter(Boolean),
      instructionWhiteSpace: instruction ? getComputedStyle(instruction).whiteSpace : "",
      yesNoOptions: [...cardNode.querySelector('[data-ssl-v130-field="httpsWorks"]').options].map((option) => option.textContent.trim()),
      chainOptions: [...cardNode.querySelector('[data-ssl-v130-field="chain"]').options].map((option) => option.textContent.trim()),
    };
    setValue("httpCode", "500");
    const problem = {
      summary: document.querySelector('[data-card="card-20"] [data-ssl-v130-summary]')?.textContent.replace(/\\s+/g, " ").trim() || "",
      headerStatus: document.querySelector('[data-card="card-20"] > .g1-card-header > .status-pill')?.textContent.trim() || "",
      status: card.status,
    };
    setValue("httpCode", "200");
    return { ready, problem, restoredStatus: card.status };
  })()`);
  await wait(1700);

  const screenshots = [];
  const targetsToCapture = [
    ['[data-card="card-14"]', "01-robots.png"],
    ['[data-card="card-16"]', "03-canonical-redirects.png"],
    ['[data-card="card-17"]', "04-meta-robots.png"],
    ['[data-card="card-18"]', "05-cwv-pagespeed.png"],
    ['[data-card="card-20"]', "06-ssl-https.png"],
    ['[data-g1-webmaster-scope-v295="company"]', "07-yandex-webmaster-company.png"],
    ['[data-g1-seo-item-v296="project-comparison"]', "08-project-comparison.png"],
    ['[data-g1-seo-interactive-tool-v305]', "09-interactive-tool.png"],
    ['[data-g1-seo-item-v296="seo-snippet"]', "10-product-seo-snippet.png"],
    ['[data-g1-webmaster-scope-v295="product"]', "11-yandex-webmaster-product.png"],
    [':scope > [data-gate1-blog-product-v304]', "12-blog-product.png"],
  ];
  for (const [selector, filename] of targetsToCapture) {
    const actualSelector = selector.startsWith(":scope")
      ? `.g1-redesign${selector.slice(6)}`
      : selector;
    screenshots.push(await captureElement(actualSelector, filename));
  }

  const selectResponsiveness = await evaluate(page, `(() => new Promise((resolve) => {
    const rows = [...document.querySelectorAll('[data-card="card-14"] table.rv2-url-table tr')];
    const row = rows.find((item) => item.querySelector("td")?.textContent?.trim() === "https://example.ru/catalog");
    const select = row?.querySelector('[data-rv2-table="url"]');
    if (!select) throw new Error("Catalog Robots.txt result selector not found");
    const timingNames = [
      "ensureRobotsV130", "recalculateStatusForCard", "g1PointUpdateBadge",
      "renderGateNav", "guruPersistStateFast", "flashSaving",
    ];
    const timings = {};
    const originals = {};
    timingNames.forEach((name) => {
      if (typeof window[name] !== "function") return;
      originals[name] = window[name];
      window[name] = function (...args) {
        const mark = performance.now();
        try { return originals[name].apply(this, args); }
        finally { timings[name] = (timings[name] || 0) + performance.now() - mark; }
      };
    });
    select.value = "Требует внимания";
    const started = performance.now();
    select.dispatchEvent(new Event("change", { bubbles: true }));
    const dispatchMs = performance.now() - started;
    Object.entries(originals).forEach(([name, fn]) => { window[name] = fn; });
    let settled = false;
    const finish = (paintSignal) => {
      if (settled) return;
      settled = true;
      resolve({
        dispatchMs,
        nextPaintMs: performance.now() - started,
        paintSignal,
        selectedValue: select.value,
        timings,
      });
    };
    requestAnimationFrame(() => finish("raf"));
    setTimeout(() => finish("timer"), 200);
  }))()`);
  await wait(100);
  const hardReloadWrite = await evaluate(page, `(() => {
    const saved = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId));
    const card = saved.gates.find((gate) => gate.id === "gate-1").cards.find(isRobotsUnifiedCard);
    return {
      projectId: activeProjectId,
      savedResult: card.robotsV130.yandex.urlResults.find(
        (item) => item.url === "https://example.ru/catalog",
      )?.result || "",
    };
  })()`);
  await page.call("Page.reload", { ignoreCache: true });
  await waitFor(page, 'document.readyState === "complete" && typeof gate1RemoveStandaloneSitemapV308 === "function"');
  const hasChooser = await evaluate(page, 'Boolean(document.querySelector("[data-open-project]"))');
  if (hasChooser) await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, 'typeof state !== "undefined" && Boolean(state)');
  await evaluate(page, 'guruNavigateToGate("gate-1"); renderGate(); true');
  await waitFor(page, 'Boolean(document.querySelector("[data-card=card-14]"))');
  const hardReloadPersistence = await evaluate(page, `(() => {
    const card = state.gates.find((gate) => gate.id === "gate-1").cards.find(isRobotsUnifiedCard);
    const contacts = card.robotsV130.yandex.urlResults.find(
      (item) => item.url === "https://example.ru/contacts",
    );
    const catalog = card.robotsV130.yandex.urlResults.find(
      (item) => item.url === "https://example.ru/catalog",
    );
    return {
      activeProjectId,
      contactsImportant: Boolean(contacts),
      contactsNotService: !card.robotsV130.yandex.serviceResults.some(
        (item) => item.url === "https://example.ru/contacts",
      ),
      catalogResult: catalog?.result || "",
      catalogDomResult: [...document.querySelectorAll('[data-card="card-14"] [data-rv2-table="url"]')]
        .find((select) => select.closest("tr")?.querySelector("td")?.textContent?.trim() === "https://example.ru/catalog")
        ?.value || "",
      redirect: (() => {
        const redirectCard = state.gates.find((gate) => gate.id === "gate-1").cards.find((item) => item.id === "card-16");
        return {
          domain: redirectCard.redirectV130.domain,
          canonicalUrl: redirectCard.redirectV130.canonicalUrl,
          codes: redirectCard.redirectV130.rows.map((row) => row.code),
          results: redirectCard.redirectV130.rows.map((row) => row.result),
          finalUrlsAbsent: redirectCard.redirectV130.rows.every((row) => !Object.hasOwn(row, "finalUrl")),
          status: redirectCard.status,
        };
      })(),
      ssl: (() => {
        const sslCard = state.gates.find((gate) => gate.id === "gate-1").cards.find((item) => item.id === "card-20");
        return {
          fields: structuredClone(sslCard.sslV130),
          status: sslCard.status,
          summary: document.querySelector('[data-card="card-20"] [data-ssl-v130-summary]')?.textContent.replace(/\\s+/g, " ").trim() || "",
          headerStatus: document.querySelector('[data-card="card-20"] > .g1-card-header > .status-pill')?.textContent.trim() || "",
        };
      })(),
      errors: window.__guruErrors || [],
    };
  })()`);

  if (process.env.GURU_FOCUS_WEBMASTER_PRODUCT === "1") {
    const instruction = result.descriptions["webmaster-product-block"];
    assert(setup.build === "2.3.167", `Unexpected build: ${setup.build}`);
    assert(
      ["Все страницы", "Исключённые страницы", "sitemap-store.xml", "<lastmod>",
        "Переобход страниц", "Файлы Sitemap", "site:k-apple.ru/адрес-страницы"]
        .every((part) => instruction.includes(part)) &&
      !instruction.includes("вставь URL страницы товара") &&
      result.webmasterProductWhiteSpace === "pre-line",
      `Product indexing instruction is incomplete: ${instruction}`,
    );
    assert(result.cardsUnchanged && result.workspaceUnchangedByInjection,
      "Instruction projection changed Gate 1 data");
    assert(result.errors.length === 0, `Runtime errors: ${result.errors.join(" | ")}`);
    assert(screenshots.some((item) => item.filename === "11-yandex-webmaster-product.png"),
      "Product indexing screenshot was not captured");
    console.log(JSON.stringify({
      ok: true,
      build: setup.build,
      instruction,
      cardsUnchanged: result.cardsUnchanged,
      workspaceUnchangedByInjection: result.workspaceUnchangedByInjection,
      runtimeErrors: result.errors,
      screenshot: new URL("11-yandex-webmaster-product.png", artifactDir).pathname,
    }, null, 2));
  } else {
  console.log(JSON.stringify({ setup, result, sitemapRowsInteraction, copyUrlsInteraction, robotsRowStatus, redirectInteraction, sslInteraction, screenshots, selectResponsiveness, hardReloadWrite, hardReloadPersistence }, null, 2));
  assert(setup.cardCount === 81 && result.cardCount === 81 && result.cardsUnchanged,
    `Gate 1 card count/content changed: ${JSON.stringify({ before: setup.cardCount, after: result.cardCount })}`);
  assert(result.otherGatesUnchanged, "A non-Gate-1 gate changed");
  assert(result.workspaceUnchangedByInjection, "Text projection mutated workspace state");
  assert(Object.values(result.descriptions).every(Boolean) && Object.keys(result.descriptions).length === 11,
    `One or more block descriptions are missing: ${JSON.stringify(result.descriptions)}`);
  assert(
    ["Все страницы", "Исключённые страницы", "sitemap-store.xml", "<lastmod>",
      "Переобход страниц", "Файлы Sitemap", "site:k-apple.ru/адрес-страницы"]
      .every((part) => result.descriptions["webmaster-product-block"].includes(part)) &&
    !result.descriptions["webmaster-product-block"].includes("вставь URL страницы товара") &&
    result.webmasterProductWhiteSpace === "pre-line",
    `Product indexing instruction is incomplete: ${result.descriptions["webmaster-product-block"]}`,
  );
  assert(result.missingHints.length === 0 && result.duplicateKeys.length === 0 && result.guideCount === result.uniqueGuideCount,
    `Field hints are missing or duplicated: ${JSON.stringify({ missing: result.missingHints, duplicates: result.duplicateKeys })}`);
  assert(result.oldTextsVisible.length === 0,
    `Replaced text is still visible: ${result.oldTextsVisible.join(" | ")}`);
  assert(result.comparisonCriteriaAdapted.includes("Продукт, ЦА, JTBD") &&
    result.comparisonCriteriaAdapted.includes("сильнее, слабее или отсутствует"),
    "The confirmed Comparison criteria wording was not applied");
  assert(result.blogLinksAdapted.includes("нажми «Привязать статью»") &&
    result.blogLinksAdapted.includes("сначала создай её в разделе Блог"),
    "The confirmed Blog linking wording was not applied");
  assert(result.robotsErrorsHint.includes("webmaster → Инструменты → Анализ robots.txt") &&
    result.robotsErrorsHint.includes("Результаты анализа robots.txt → 0 ошибок"),
    "The Robots.txt errors hint does not match the approved Yandex Webmaster steps");
  assert(result.robotsSitemapHint.includes("Вебмастер → Индексирование → Файлы Sitemap") &&
    result.robotsSitemapHint.includes("Проверить каждый найденный Sitemap") &&
    result.robotsSitemapHint.includes("Эталон: статус OK"),
    "The Robots.txt Sitemap hint does not match the approved Yandex Webmaster steps");
  assert(result.robotsImportantHint.includes("Доступ к страницам") &&
    result.robotsImportantHint.includes("главную, категории, товары, услуги") &&
    result.robotsImportantHint.includes("доступ разрешён"),
    "The important URL hint does not match the approved Yandex Webmaster steps");
  assert(result.robotsServiceHint.includes("Проверить реальные служебные URL сайта") &&
    result.robotsServiceHint.includes("закрыты от обхода или индексирования") &&
    result.robotsServiceHint.includes("коммерческие страницы при этом открыты"),
    "The service URL hint does not match the approved Yandex Webmaster steps");
  assert(
    result.sslGuidance.httpsWorks.text.includes("Проверка ответа сервера") &&
    result.sslGuidance.httpsWorks.text.includes("Основной робот Яндекса") &&
    result.sslGuidance.httpsWorks.text.includes("200 OK") &&
    result.sslGuidance.httpsWorks.href === "https://yandex.ru/support/webmaster/ru/indexing-options/server-response" &&
    result.sslGuidance.certValid.text.includes("SSL Server Test") &&
    result.sslGuidance.certValid.text.includes("сертификат без ошибок") &&
    result.sslGuidance.domainMatch.text.includes("Subject / Alternative names") &&
    result.sslGuidance.domainMatch.text.includes("*.site.ru") &&
    result.sslGuidance.domainMatch.href === "https://yandex.ru/support/webmaster/ru/diagnosis/mistakes" &&
    result.sslGuidance.expiresIn.text.includes("Certificate #1 → Valid until") &&
    result.sslGuidance.expiresIn.text.includes("число дней до окончания") &&
    result.sslGuidance.chain.text.includes("Certification Paths") &&
    result.sslGuidance.chain.text.includes("Trusted") &&
    result.sslGuidance.evidence.text.includes("ссылку на отчёт SSL Labs или скрин результата") &&
    ["certValid", "expiresIn", "chain"].every((field) =>
      result.sslGuidance[field].href === "https://www.ssllabs.com/ssltest/"
    ),
    `SSL field guidance or source links are incomplete: ${JSON.stringify(result.sslGuidance)}`
  );
  const importantUrls = result.robotsGate0Routing.important.map((item) => item.url);
  const serviceUrls = result.robotsGate0Routing.service.map((item) => item.url);
  assert(
    ["https://example.ru/", "https://example.ru/catalog", "https://example.ru/contacts", "https://example.ru/goat", "https://example.ru/delivery"]
      .every((url) => importantUrls.includes(url)) &&
    ["https://example.ru/cart", "https://example.ru/thank-you"]
      .every((url) => serviceUrls.includes(url)) &&
    importantUrls.every((url) => result.robotsGate0Routing.importantDom.includes(url)) &&
    serviceUrls.every((url) => result.robotsGate0Routing.serviceDom.includes(url)),
    `Gate 0 URLs were not routed into Robots.txt tables: ${JSON.stringify(result.robotsGate0Routing)}`
  );
  assert(
    result.robotsGate0Routing.important.find((item) => item.url === "https://example.ru/")?.result === "Разрешено",
    "The saved per-URL result was lost while refreshing the Gate 0 projection"
  );
  assert(
    result.robotsUrlFlow.noSeparateContainers &&
      result.robotsUrlFlow.aggregateSelectorsAbsent &&
      result.robotsUrlFlow.importantGrouped &&
      result.robotsUrlFlow.serviceGrouped,
    `Robots URL tables are not directly grouped with their headings: ${JSON.stringify(result.robotsUrlFlow)}`
  );
  assert(result.robotsAggregateStoragePurged,
    "Legacy aggregate Robots.txt values importantOk/serviceOk survived migration");
  assert(result.robotsCheckDateAbsent, "The removed Robots.txt check-date field is still rendered");
  assert(result.googleSearchConsoleAbsent, "Google Search Console is still rendered in Gate 1 SEO");
  assert(result.googleSeoStoragePurged, "Legacy Google Search Console data survived the Gate 1 SEO migration");
  assert(result.standaloneSitemapAbsent, "Standalone Sitemap.xml card remains in Gate 1");
  assert(result.legacySitemapMigration.before === 82 && result.legacySitemapMigration.after === 81 &&
    result.legacySitemapMigration.cardAbsent &&
    result.legacySitemapMigration.row?.status === "ok",
    `Legacy Sitemap card migration failed: ${JSON.stringify(result.legacySitemapMigration)}`);
  assert(sitemapRowsInteraction.visibleRows === 2 && sitemapRowsInteraction.storedRows === 2 &&
    sitemapRowsInteraction.first.url === "https://example.ru/sitemap.xml" &&
    sitemapRowsInteraction.first.status === "ok" && sitemapRowsInteraction.addButtonVisible &&
    sitemapRowsInteraction.removeButtonVisible,
    `Repeatable Robots.txt Sitemap rows failed: ${JSON.stringify(sitemapRowsInteraction)}`);
  assert(
    copyUrlsInteraction.copied[0] === [
      "https://example.ru/",
      "https://example.ru/catalog",
      "https://example.ru/contacts",
      "https://example.ru/goat",
      "https://example.ru/delivery",
    ].join("\n") &&
      copyUrlsInteraction.copied[1] === [
        "https://example.ru/cart",
        "https://example.ru/thank-you",
      ].join("\n") &&
      copyUrlsInteraction.importantFeedback === "Скопировано · 5" &&
      copyUrlsInteraction.serviceFeedback === "Скопировано · 2" &&
      copyUrlsInteraction.stateUnchanged,
    `Bulk URL copy failed: ${JSON.stringify(copyUrlsInteraction)}`
  );
  assert(robotsRowStatus.ready === "ready" && robotsRowStatus.canonicalReady === "ready" &&
    robotsRowStatus.problem === "problem" && robotsRowStatus.canonicalProblem === "problem",
    `Robots.txt status is not derived from URL row results: ${JSON.stringify(robotsRowStatus)}`);
  assert(JSON.stringify(redirectInteraction.ready.variants) === JSON.stringify([
      "https://example.ru/", "http://example.ru/", "https://www.example.ru/", "http://www.example.ru/"
    ]) && JSON.stringify(redirectInteraction.ready.expectedCodes) === JSON.stringify(["200", "301", "301", "301"]) &&
    redirectInteraction.ready.results.every((value) => value === "ok") &&
    redirectInteraction.ready.resultOptions.every((options) => JSON.stringify(options) === JSON.stringify(["—", "Ок", "Ошибка"])) &&
    redirectInteraction.ready.summary === "Канонический URL: https://example.ru/ · 4 из 4 корректны" &&
    redirectInteraction.ready.canonicalUrl === "https://example.ru/" &&
    redirectInteraction.ready.status === "ready" && redirectInteraction.ready.rowCount === 4 &&
    JSON.stringify(redirectInteraction.ready.headers) === JSON.stringify(["URL", "Эталон", "HTTP-код", "Результат"]) &&
    redirectInteraction.ready.instructionLines.length === 5 &&
    redirectInteraction.ready.instructionWhiteSpace === "pre-line" &&
    redirectInteraction.ready.statusTopRight &&
    redirectInteraction.ready.obsoleteControlsAbsent &&
    redirectInteraction.problem.value === "error" && redirectInteraction.problem.status === "problem" &&
    redirectInteraction.restoredStatus === "ready",
    `Canonical redirect workflow failed: ${JSON.stringify(redirectInteraction)}`);
  assert(
    JSON.stringify(sslInteraction.ready.fieldNames) === JSON.stringify([
      "domain", "httpsWorks", "httpCode", "certValid", "domainMatch", "expiresIn", "chain", "evidence"
    ]) &&
    sslInteraction.ready.fields.domain === "example.ru" &&
    sslInteraction.ready.fields.httpCode === "200" &&
    sslInteraction.ready.fields.expiresIn === "1" &&
    sslInteraction.ready.summary === "Итог блока: Корректно" &&
    sslInteraction.ready.headerStatus === "Корректно" &&
    sslInteraction.ready.status === "ready" &&
    sslInteraction.ready.instructionLines.length === 6 &&
    sslInteraction.ready.instructionWhiteSpace === "pre-line" &&
    JSON.stringify(sslInteraction.ready.yesNoOptions) === JSON.stringify(["—", "Да", "Нет"]) &&
    JSON.stringify(sslInteraction.ready.chainOptions) === JSON.stringify(["—", "Trusted", "Проблема"]) &&
    sslInteraction.problem.summary === "Итог блока: Проблема" &&
    sslInteraction.problem.headerStatus === "Проблема" &&
    sslInteraction.problem.status === "problem" &&
    sslInteraction.restoredStatus === "ready",
    `SSL / HTTPS workflow failed: ${JSON.stringify(sslInteraction)}`
  );
  assert(hardReloadWrite.savedResult === "Требует внимания" &&
    hardReloadPersistence.contactsImportant && hardReloadPersistence.contactsNotService &&
    hardReloadPersistence.catalogResult === "Требует внимания" &&
    hardReloadPersistence.catalogDomResult === "Требует внимания" &&
    hardReloadPersistence.redirect.domain === "example.ru" &&
    hardReloadPersistence.redirect.canonicalUrl === "https://example.ru/" &&
    JSON.stringify(hardReloadPersistence.redirect.codes) === JSON.stringify(["200", "301", "301", "301"]) &&
    hardReloadPersistence.redirect.results.every((value) => value === "ok") &&
    hardReloadPersistence.redirect.finalUrlsAbsent &&
    hardReloadPersistence.redirect.status === "ready" &&
    hardReloadPersistence.ssl.fields.domain === "example.ru" &&
    hardReloadPersistence.ssl.fields.httpsWorks === "yes" &&
    hardReloadPersistence.ssl.fields.httpCode === "200" &&
    hardReloadPersistence.ssl.fields.certValid === "yes" &&
    hardReloadPersistence.ssl.fields.domainMatch === "yes" &&
    hardReloadPersistence.ssl.fields.expiresIn === "1" &&
    hardReloadPersistence.ssl.fields.chain === "trusted" &&
    hardReloadPersistence.ssl.fields.evidence.includes("ssllabs.com/ssltest") &&
    hardReloadPersistence.ssl.status === "ready" &&
    hardReloadPersistence.ssl.summary === "Итог блока: Корректно" &&
    hardReloadPersistence.ssl.headerStatus === "Корректно" &&
    hardReloadPersistence.errors.length === 0,
    `Robots.txt classification or hard-reload persistence failed: ${JSON.stringify({ hardReloadWrite, hardReloadPersistence })}`);
  assert(selectResponsiveness.selectedValue === "Требует внимания" &&
    selectResponsiveness.dispatchMs < 150 &&
    (selectResponsiveness.paintSignal === "timer" || selectResponsiveness.nextPaintMs < 250),
    `Robots.txt result selection blocks the UI: ${JSON.stringify(selectResponsiveness)}`);
  assert(screenshots.length === 11, "Not all requested screenshots were created");
  assert(result.errors.length === 0, `Runtime errors: ${result.errors.join(" | ")}`);
  }
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
