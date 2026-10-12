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
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = "seo-central-v298";
    workspace.project.name = "Коза · SEO central smoke";
    workspace.project.website = "https://k-apple.ru";
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: "seo-central-v298",
      name: workspace.project.name,
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));
    localStorage.setItem(
      "guru-platform-workspace-v02-seo-central-v298",
      JSON.stringify(workspace)
    );
    location.reload();
  })()`);
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, 'Boolean(state) && typeof gate1SeoCentralAuditV298 === "function"');

  const setup = await evaluate(page, `(() => {
    const category = guruV189CreateCategory("Символы 2027", state);
    const products = guruV189CatalogItems(state);
    const goat = {
      id: "seo-v298-goat",
      name: "Символ 2027 года «Коза»",
      categoryId: category.id,
      continuum: "pure_product",
      createdAt: new Date().toISOString()
    };
    const horse = {
      id: "seo-v298-horse",
      name: "Создание лошадок",
      categoryId: category.id,
      continuum: "pure_product",
      createdAt: new Date().toISOString()
    };
    products.push(goat, horse);
    const gate1 = state.gates.find((gate) => gate.id === "gate-1");
    const productCard = gate1.cards.find((card) => card.id === "card-24");
    const serviceCard = gate1.cards.find((card) => card.id === "card-23");
    productCard.pageRows = [];
    serviceCard.pageRows = [];
    [goat, horse].forEach((product) => {
      const row = createPageStructureRow(product.name, false);
      row.catalogItemIdV189 = product.id;
      row.categoryId = product.categoryId;
      row.url = product.id === goat.id
        ? "https://k-apple.ru/products/goat"
        : "https://k-apple.ru/services/horse";
      row.title = "Title " + product.name;
      row.description = "Description " + product.name;
      row.contextFields = { seoKeywords: "авторский подарок, символ 2027" };
      (product.id === goat.id ? productCard : serviceCard).pageRows.push(row);
    });

    const corrupt = "Когда нужно выбрать подарок, клиент хочет порадовать�� получателя и не ошибит��ся с выбором.";
    const corruptAdditional = "Когда нужен необычный декор, клиент хочет не ошибит��ся с размером.";
    const corruptHorse = "Когда выбирают лошадку, клиент хочет порадовать�� ребёнка и не ошибит��ся с выбором.";
    state.project.gate0ScopedValuesV194 = [{
      id: "jtbd-corrupt-v298",
      field: "jtbd",
      scope: "product",
      product_id: goat.id,
      category_id: category.id,
      value: corrupt,
      jtbd: { situation: corrupt, desired_action: "", result: "" },
      confirmation_status: "confirmed"
    }];
    state.project.productBindingsV185 = {
      [goat.id]: { jtbd: corrupt, goal: {}, landing: {}, audiences: [] },
      [horse.id]: { jtbd: corruptHorse, goal: {}, landing: {}, audiences: [] }
    };
    state.project.productMainJtbds = {
      [goat.name]: corrupt,
      [horse.name]: corruptHorse
    };
    state.painV130 = state.painV130 || { productMaps: [] };
    state.painV130.productMaps = [{
      product: goat.name,
      product_id: goat.id,
      items: {
        [goat.id]: {
          semL4Model: {
            mainJtbd: corrupt,
            additionalJtbds: [corruptAdditional, corruptHorse]
          }
        }
      }
    }];

    state.gate1WebmasterV295 = {
      version: "gate1-webmaster-v295",
      company: {
        verificationMethod: "dns",
        verificationStatus: "works",
        sitemapUrl: "https://k-apple.ru/sitemap.xml",
        sitemapStatus: "works",
        robotsStatus: "needs_improvement",
        crawlErrorsStatus: "broken",
        crawlErrors: "Недоступна тестовая страница"
      },
      byProduct: {
        [goat.id]: {
          landingIndexed: "yes",
          checkedNote: "10.09.2026 · проверено"
        }
      }
    };

    const robotsCard = gate1.cards.find(isRobotsUnifiedCard);
    const robots = ensureRobotsV130(robotsCard);
    robots.url = "https://k-apple.ru/robots.txt";
    robots.yandex.errors = "0";
    robots.yandex.sitemaps = [{ url: "https://k-apple.ru/sitemap.xml", status: "ok" }];
    robots.yandex.urlResults.forEach((row) => { row.result = "Разрешено"; });
    robots.yandex.serviceResults.forEach((row) => { row.result = "Запрещено"; });

    const foundation = guruV247KeywordFoundationRecord(goat, true, state);
    foundation.keywords = [
      { value: "авторская коза", source: "manual", status: "confirmed" }
    ];
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = category.id;
    ui.selectedProductId = goat.id;
    const acc = getGate1AccordionState();
    acc.subblocks.site_audit = true;
    acc.subblocks.pain_jtbd_offer = true;
    acc.subblocks.unit_economics = true;
    acc.cards[productCard.id] = true;
    acc.cards[serviceCard.id] = true;
    acc.cards[robotsCard.id] = true;
    acc.cards[gate1.cards.find((card) => isServerResponseCard(card)).id] = true;
    prepareSystemCards(state);
    gate1WebmasterUpdateDerivedV295();
    guruNavigateToGate("gate-1");
    renderGate();
    return { build: GURU_BUILD_INFO.version, goatId: goat.id, horseId: horse.id };
  })()`);
  await waitFor(page, 'document.querySelectorAll("[data-g1-company-block-v299]").length === 4 && document.querySelectorAll("[data-g1-seo-central-v298=product]").length === 0');

  const result = await evaluate(page, `(() => {
    const root = document.querySelector(".g1-redesign");
    const company = root.querySelector('[data-g1-company-block-v299="seo-audit"]');
    const demand = root
      .querySelector(':scope > .g1-section > [data-gate1-toggle-section="pain_jtbd_offer"]')
      ?.closest(".g1-section");
    const demandBody = demand?.querySelector(":scope > .g1-section-body");
    const productContext = root.querySelector(
      ':scope > [data-guru-product-context="gate1-product-pages"]',
    );
    const productCardNode = root.querySelector('[data-card="card-24"]');
    const goatPageNode = productCardNode?.querySelector(".page-structure-card");
    const prefinal = demandBody?.querySelector("[data-gate1-final-foundation-v259]");
    const groupFinals = [...(demandBody?.querySelectorAll(
      "[data-gate1-group-final-foundation-v279]",
    ) || [])];
    const companyNodes = [...root.querySelectorAll(
      ":scope > [data-g1-company-block-v299]",
    )];
    const companyDemandPositioning = root.querySelector(
      ":scope > [data-gate1-company-demand-positioning-v357]",
    );
    const companySemantics = companyDemandPositioning?.querySelector(
      "[data-gate1-company-semantics-v264]",
    ) || root.querySelector(":scope > [data-gate1-company-semantics-v264]");
    const companyLayoutNodes = [
      companyDemandPositioning || companySemantics,
      ...companyNodes,
    ].filter(Boolean);
    const companyDivider = [...root.querySelectorAll(":scope > .gate0-section-heading")]
      .find((node) => node.querySelector(".gate0-section-heading-title")?.textContent?.trim() === "Компания");
    const productDivider = [...root.querySelectorAll(":scope > .gate0-section-heading")]
      .find((node) => node.querySelector(".gate0-section-heading-title")?.textContent?.trim() === "Продукт / Услуга");
    const productComparison = root.querySelector(
      ":scope > .project-comparison-product-v309",
    );
    const productNodes = [...root.children]
      .slice([...root.children].indexOf(productDivider) + 1)
      .filter((node) => !node.matches(".gate0-section-heading"));
    const verticalGaps = (nodes) => nodes.slice(1).map((node, index) =>
      Math.round((node.getBoundingClientRect().top - nodes[index].getBoundingClientRect().bottom) * 10) / 10
    );
    const audit = gate1SeoCentralAuditV298(state);
    const visibleText = company.textContent;
    const jtbdStrings = [];
    const walk = (value, path = "") => {
      if (typeof value === "string" && /jtbd/i.test(path)) jtbdStrings.push(value);
      else if (value && typeof value === "object")
        Object.entries(value).forEach(([key, child]) => {
          if (key === "_jtbdEncodingRepairLogV298") return;
          walk(child, path + "." + key);
        });
    };
    walk(state.project, "project");
    walk(state.painV130, "painV130");
    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    const mega = gate0.cards.find(isMegaMarketingCard);
    ensureMegaMarketing(mega, state);
    const infra = mega.megaMarketing.infra.find((row) => row.name === "Яндекс Вебмастер");
    const gate2 = state.gates.find((gate) => gate.id === "gate-2");
    const g2 = ["card-107", "card-108", "card-109", "card-110", "card-111"]
      .map((id) => gate2.cards.find((card) => card.id === id))
      .map((card) => ({ id: card.id, status: g2CardStatus(card), path: gate1WebmasterG2SourceV295(card, state).path }));
    const downloads = [];
    const previousDownloadText = window.downloadText;
    window.downloadText = (filename, contents) => downloads.push({
      filename,
      bytes: String(contents || "").length,
    });
    prefinal?.querySelector("[data-gate1-final-export-v259]")?.click();
    window.downloadText = previousDownloadText;
    return {
      domTitles: [...root.querySelectorAll(":scope > [data-g1-seo-central-v298]")]
        .map((node) => node.querySelector(":scope > .g1-section-header .g1-section-title").textContent.trim()),
      companyBlocks: audit.companyBlocks,
      legacyCompanyWrapper: audit.legacyCompanyWrapper,
      legacyAuditHeadings: [...root.querySelectorAll(":scope > .g1-section")]
        .filter((node) => node.querySelector(":scope > .g1-section-header .g1-section-title")?.textContent?.trim() === "Аудит сайта").length,
      oldSummaryPanels: root.querySelectorAll("[data-g1-seo-panel-v296]").length,
      outsideStandalone: audit.outsideSeoCount,
      auditCards: audit.auditCardsInCompany,
      standaloneSitemapAbsent: !gate1SeoCanonicalCardsV298(state).gate.cards.some((card) =>
        card.id === "card-15" || isSitemapUnifiedCard(card)
      ),
      auditDistribution: audit.auditDistribution,
      auditTitles: Object.fromEntries(
        ["seo-audit", "site-structure-audit", "legal-audit"].map((scope) => [
          scope,
          [...root.querySelectorAll('[data-g1-company-block-v299="' + scope + '"] [data-card]')]
            .map((node) => gate1SeoCanonicalCardsV298(state).gate.cards.find((card) => card.id === node.dataset.card)?.title)
            .filter(Boolean)
        ])
      ),
      activeLegacyStore: audit.activeLegacyStore,
      legacyArchived: audit.legacyArchived,
      storage: audit.canonicalStorage,
      companyTechnicalLabels: [
        "Важные URL разрешены", "Служебные URL обработаны",
        "Яндекс"
      ].filter((label) => visibleText.includes(label)),
      robotsAggregateSelectorsAbsent: !company.querySelector(
        '[data-rv2-field="importantOk"], [data-rv2-field="serviceOk"]'
      ),
      googleSearchConsoleAbsent: !visibleText.includes("Google Search Console") &&
        !company.querySelector('[data-rv2-sys="google"], [data-sm-v130-system="google"]'),
      companyItems: [
        Boolean(company.querySelector('[data-g1-webmaster-scope-v295="company"]')),
        Boolean(company.querySelector('[data-g1-seo-item-v296="canonical-redirects"]')),
        Boolean(company.querySelector('[data-g1-seo-item-v296="project-comparison"]'))
      ].filter(Boolean),
      companySemanticsAtStart: Boolean(
        companyDivider && companyDemandPositioning && companySemantics &&
        companyNodes[0] &&
        companyDivider.nextElementSibling === companyDemandPositioning &&
        companyDemandPositioning.nextElementSibling === companyNodes[0] &&
        companySemantics.closest("[data-gate1-company-demand-positioning-v357]") ===
          companyDemandPositioning &&
        !companyDemandPositioning.closest('[data-g1-company-block-v299="seo-audit"]')
      ),
      productItems: [
        goatPageNode?.querySelector('[data-g1-seo-item-v296="keyword-foundations"]') ? "keyword-foundations" : "",
        goatPageNode?.querySelector('[data-v22-site-section="seo_snippet"]') ? "seo-snippet" : "",
        goatPageNode?.querySelector('[data-g1-seo-item-v296="webmaster-product"]') ? "webmaster-product" : "",
      ].filter(Boolean),
      foundationLevels: goatPageNode?.querySelectorAll(".g1-seo-foundations-v296 .guru-strategic-card-v245").length || 0,
      snippetInside: Boolean(goatPageNode?.querySelector('[data-v22-site-section="seo_snippet"]')),
      snippetGuidanceInside: Boolean(goatPageNode?.querySelector('[data-v22-site-section="seo_snippet"] [data-g1-seo-guide-v307="snippet-block"]')),
      webmasterInsidePage: Boolean(goatPageNode?.querySelector('[data-g1-webmaster-scope-v295="product"]')),
      selectorAtProductStart: Boolean(
        productDivider && productContext &&
        productDivider.nextElementSibling === productContext &&
        productContext.querySelector(".gate0-product-context-v194")
      ),
      strategicContextWithSelector: Boolean(productContext?.querySelector(".guru-strategic-foundation-v237")),
      selectorInsideDemand: Boolean(demandBody?.querySelector('[data-guru-product-context="gate1-product-pages"]')),
      middleAtSource: productCardNode?.querySelectorAll("[data-gate1-middle-foundation-v257]").length || 0,
      prefinalInDemand: Boolean(prefinal),
      groupFinalsInDemand: groupFinals.length,
      foundationControls: {
        middleExport: Boolean(productCardNode?.querySelector("[data-gate1-middle-keyword-export]")),
        middleImport: Boolean(productCardNode?.querySelector("[data-gate1-middle-keyword-import]")),
        prefinalExport: Boolean(prefinal?.querySelector("[data-gate1-final-export-v259]")),
        prefinalImport: Boolean(prefinal?.querySelector("[data-gate1-final-import-v259]")),
        prefinalFile: Boolean(prefinal?.querySelector("[data-gate1-final-file-v259]")),
        groupExport: groupFinals.some((node) => node.querySelector("[data-gate1-group-final-export-v279]")),
        groupImport: groupFinals.some((node) => node.querySelector("[data-gate1-group-final-import-v279]")),
      },
      prefinalExportWorks: downloads.some((download) =>
        download.filename.endsWith(".csv") && download.bytes > 0
      ),
      keywordSourceTarget: Boolean(g3ProductJourneyFindSource({
        gateId: "gate-1",
        kind: "gate1-keywords",
        productId: ${JSON.stringify("seo-v298-goat")},
      })),
      rootGap: Number.parseFloat(getComputedStyle(root).rowGap || getComputedStyle(root).gap),
      companyGaps: verticalGaps(companyLayoutNodes),
      productGaps: verticalGaps(productNodes),
      productPageSnippetCount: productCardNode?.querySelectorAll('[data-v22-site-section="seo_snippet"]').length || 0,
      webmasterProductUrl: goatPageNode?.querySelector("[data-g1-webmaster-selected-url-v365]")?.textContent?.trim() || "",
      sitemapUrl: gate1SeoCanonicalCompanyFacadeV298(state).sitemapUrl,
      verification: gate1SeoCanonicalCompanyMetaV298(state).verificationMethod,
      productIndexing: gate1SeoCanonicalProductV298(${JSON.stringify("seo-v298-goat")}, state, false),
      g2,
      gate0Status: infra.status,
      gate0Derived: infra._derivedFromGate1WebmasterV295 === true,
      jtbdRepaired: jtbdStrings.filter((value) => value.includes("не ошибиться с выбором")).length,
      jtbdArtifacts: jtbdStrings.filter((value) => /�|\\?{2,}/.test(value)),
      repairLog: state.project._jtbdEncodingRepairLogV298 || [],
      errors: window.__guruErrors || []
    };
  })()`);

  console.log(JSON.stringify({ setup, result }, null, 2));
  assert(setup.build === "2.3.168", `Unexpected build ${setup.build}`);
  assert(
    JSON.stringify(result.domTitles) === JSON.stringify([]),
    `Wrong SEO block titles: ${result.domTitles.join(" | ")}`,
  );
  assert(
    JSON.stringify(result.companyBlocks) === JSON.stringify([
      "SEO-аудит",
      "Структура сайта — аудит",
      "Юриспруденция — аудит",
      "Целевая аудитория"
    ]),
    `Wrong company hierarchy: ${result.companyBlocks.join(" | ")}`,
  );
  assert(result.legacyCompanyWrapper === false, "SEO · Компания wrapper remains");
  assert(result.legacyAuditHeadings === 0, "Legacy Аудит сайта wrapper remains");
  assert(result.oldSummaryPanels === 0, "Old summary SEO panel remains");
  assert(result.outsideStandalone === 0, "Standalone SEO block remains outside");
  assert(result.auditCards >= 18, `Only ${result.auditCards} audit cards rendered`);
  assert(result.auditDistribution["seo-audit"] === 5, "SEO audit card distribution is wrong");
  assert(result.auditDistribution["site-structure-audit"] === 9, "Site structure card distribution is wrong");
  assert(result.auditDistribution["legal-audit"] === 4, "Legal audit card distribution is wrong");
  assert(result.activeLegacyStore === false, "Legacy active Webmaster store remains");
  assert(result.legacyArchived === true, "Legacy Webmaster store not archived");
  assert(result.companyItems.length === 3, "SEO audit contents are incomplete");
  assert(result.companySemanticsAtStart, "Unified company demand container was not restored before SEO audit");
  assert(
    JSON.stringify(result.productItems) === JSON.stringify(["keyword-foundations", "seo-snippet", "webmaster-product"]),
    `Product SEO was not merged into the linked page card: ${result.productItems.join(" | ")}`,
  );
  assert(result.foundationLevels === 3, `Keyword Foundation summary is incomplete in the page card (${result.foundationLevels})`);
  assert(result.snippetInside && result.snippetGuidanceInside && result.productPageSnippetCount === 1, "SEO snippet or its guidance is missing from the product page card or duplicated");
  assert(result.webmasterInsidePage, "Product Webmaster is not embedded in the product page card");
  assert(result.selectorAtProductStart, "Product selector is not directly after the product section heading");
  assert(result.strategicContextWithSelector && !result.selectorInsideDemand, "Product context was split or remained nested inside Demand");
  assert(result.middleAtSource === 1, `Middle Foundation was not restored to Product card (${result.middleAtSource})`);
  assert(result.prefinalInDemand, "Prefinal Foundation was not restored to Demand");
  assert(result.groupFinalsInDemand >= 1, "Group-final Foundation system was not restored to Demand");
  assert(
    Object.values(result.foundationControls).every(Boolean),
    `Foundation import/export controls are incomplete: ${JSON.stringify(result.foundationControls)}`,
  );
  assert(result.prefinalExportWorks, "Prefinal keyword CSV export handler did not run");
  assert(result.keywordSourceTarget, "Final keyword source navigation target is missing");
  assert(result.domTitles.length === 0, "Standalone product SEO block remains");
  assert(result.rootGap === 24, `Unexpected Gate 1 root gap: ${result.rootGap}`);
  assert(
    [...result.companyGaps, ...result.productGaps].every((gap) => Math.abs(gap - result.rootGap) <= 1),
    `Asymmetric Gate 1 gaps: ${JSON.stringify({ company: result.companyGaps, product: result.productGaps })}`,
  );
  assert(result.companyTechnicalLabels.length === 3, "Detailed Yandex Robots fields missing");
  assert(result.standaloneSitemapAbsent, "Standalone Sitemap.xml card remains in Gate 1");
  assert(result.robotsAggregateSelectorsAbsent, "Removed aggregate Robots.txt selectors are still present");
  assert(result.googleSearchConsoleAbsent, "Google Search Console is still present in Gate 1 SEO");
  assert(result.sitemapUrl === "https://k-apple.ru/sitemap.xml", "Sitemap value lost during migration");
  assert(result.verification === "dns", "Verification value lost during migration");
  assert(result.productIndexing?.landingIndexed === "yes", "Product indexing value lost");
  assert(result.webmasterProductUrl === "https://k-apple.ru/products/goat", "Selected product URL did not appear in Webmaster");
  assert(result.g2.every((item) => item.path && !item.path.includes("gate1WebmasterV295")), "Gate 2 still reads legacy store");
  assert(result.gate0Derived, "Gate 0 Webmaster flag is not derived");
  assert(result.jtbdRepaired >= 3, "JTBD mirrors were not repaired");
  assert(result.jtbdArtifacts.length === 0, "JTBD encoding artifacts remain");
  assert(result.repairLog.some((run) => run.count > 0), "JTBD repair was not logged");
  assert(result.errors.length === 0, `Runtime errors: ${result.errors.join(" | ")}`);
  console.log(JSON.stringify({ initialAssertions: "passed" }));

  const accordion = await evaluate(page, `(() => {
    /* Reproduce the cold-start case: every Gate 1 section/card is closed
       before the renderer runs. A later click must still use the mounted
       local body instead of falling back to a full Gate rebuild. */
    const coldState = getGate1AccordionState();
    Object.keys(coldState.subblocks).forEach((key) => { coldState.subblocks[key] = false; });
    Object.keys(coldState.cards).forEach((key) => { coldState.cards[key] = false; });
    const coldAudience = ensureTargetAudience();
    const coldComparison = ensureProjectComparison();
    coldAudience.open = false;
    coldAudience.segments.forEach((segment) => { segment.open = false; });
    coldComparison.open = false;
    renderGate();

    const directBody = (node) => [...(node?.children || [])].find((child) =>
      child.matches?.(".g1-section-body, .g1-seo-central-item-body-v298")
    ) || null;
    const visible = (node) => Boolean(node && getComputedStyle(node).display !== "none");
    const originalRenderGate = renderGate;
    let renderCalls = 0;
    renderGate = function () {
      renderCalls += 1;
      return originalRenderGate.apply(this, arguments);
    };
    const customKeys = [...document.querySelectorAll("[data-g1-seo-accordion-key-v300]")]
      .map((node) => node.dataset.g1SeoAccordionKeyV300);
    const custom = customKeys.map((key) => {
      const selector = '[data-g1-seo-accordion-key-v300="' + CSS.escape(key) + '"]';
      const initial = Boolean(getGate1AccordionState().subblocks[key]);
      const rootBefore = document.querySelector(".g1-redesign");
      let node = document.querySelector(selector);
      const nodeBefore = node;
      const bodyBefore = directBody(node);
      let header = node?.querySelector(':scope > [data-gate1-toggle-section="' + CSS.escape(key) + '"]');
      const topBefore = header?.getBoundingClientRect().top;
      const startedAt = performance.now();
      (header?.querySelector(".g1-section-title, strong, b") || header)?.click();
      const durationMs = performance.now() - startedAt;
      node = document.querySelector(selector);
      header = node?.querySelector(':scope > [data-gate1-toggle-section="' + CSS.escape(key) + '"]');
      const body = directBody(node);
      const toggled = Boolean(getGate1AccordionState().subblocks[key]);
      const toggledOk = toggled === !initial
        && node?.classList.contains("is-open") === toggled
        && header?.getAttribute("aria-expanded") === String(toggled)
        && visible(body) === toggled
        && Boolean(body?.hidden) === !toggled;
      const stableDom = document.querySelector(".g1-redesign") === rootBefore
        && node === nodeBefore
        && body === bodyBefore;
      const topDelta = Math.abs((header?.getBoundingClientRect().top || 0) - (topBefore || 0));
      (header?.querySelector(".g1-section-title, strong, b") || header)?.click();
      node = document.querySelector(selector);
      const restoredBody = directBody(node);
      const restored = Boolean(getGate1AccordionState().subblocks[key]);
      return {
        key,
        toggledOk,
        restoredOk: restored === initial && visible(restoredBody) === initial,
        stableDom,
        topDelta,
        durationMs,
      };
    });
    const selectorSurvivesSeoToggle = Boolean(document.querySelector(
      '.g1-redesign > [data-guru-product-context="gate1-product-pages"] .gate0-product-context-v194'
    ));

    const standardKeys = [...document.querySelectorAll(
      '.g1-redesign > .g1-section > [data-gate1-toggle-section]:not([data-gate1-toggle-section^="gate1-seo-v300-"])'
    )].map((header) => header.dataset.gate1ToggleSection);
    const standard = standardKeys.map((key) => {
      const selector = '.g1-redesign > .g1-section > [data-gate1-toggle-section="' + CSS.escape(key) + '"]';
      const initial = Boolean(getGate1AccordionState().subblocks[key]);
      const rootBefore = document.querySelector(".g1-redesign");
      let header = document.querySelector(selector);
      let section = header?.closest(".g1-section");
      const sectionBefore = section;
      const bodyBefore = section?.querySelector(":scope > .g1-section-body");
      const topBefore = header?.getBoundingClientRect().top;
      const startedAt = performance.now();
      (header?.querySelector(".g1-section-title") || header)?.click();
      const durationMs = performance.now() - startedAt;
      header = document.querySelector(selector);
      section = header?.closest(".g1-section");
      const body = section?.querySelector(":scope > .g1-section-body");
      const toggled = Boolean(getGate1AccordionState().subblocks[key]);
      const toggledOk = toggled === !initial
        && section?.classList.contains("is-open") === toggled
        && visible(body) === toggled
        && Boolean(body?.hidden) === !toggled;
      const stableDom = document.querySelector(".g1-redesign") === rootBefore
        && section === sectionBefore
        && body === bodyBefore;
      const topDelta = Math.abs((header?.getBoundingClientRect().top || 0) - (topBefore || 0));
      (header?.querySelector(".g1-section-title") || header)?.click();
      header = document.querySelector(selector);
      section = header?.closest(".g1-section");
      const restored = Boolean(getGate1AccordionState().subblocks[key]);
      return {
        key,
        toggledOk,
        restoredOk: restored === initial
          && visible(section?.querySelector(":scope > .g1-section-body")) === initial,
        stableDom,
        topDelta,
        durationMs,
      };
    });

    const allCards = [...document.querySelectorAll(
      ".g1-redesign .g1-card > [data-gate1-toggle-card]"
    )].map((initialHeader) => {
      const cardId = initialHeader.dataset.gate1ToggleCard;
      const selector = '[data-card="' + CSS.escape(cardId) + '"]';
      const initial = Boolean(getGate1AccordionState().cards[cardId]);
      const rootBefore = document.querySelector(".g1-redesign");
      let card = initialHeader.closest(".g1-card");
      const cardBefore = card;
      const bodyBefore = card?.querySelector(":scope > .g1-card-body");
      const fieldBefore = bodyBefore?.querySelector("input, textarea, select") || null;
      const topBefore = initialHeader.getBoundingClientRect().top;
      const startedAt = performance.now();
      (initialHeader.querySelector(".g1-card-title") || initialHeader).click();
      const durationMs = performance.now() - startedAt;
      card = document.querySelector(selector);
      const header = card?.querySelector(":scope > [data-gate1-toggle-card]");
      const body = card?.querySelector(":scope > .g1-card-body");
      const toggled = Boolean(getGate1AccordionState().cards[cardId]);
      const toggledOk = toggled === !initial
        && card?.classList.contains("is-open") === toggled
        && header?.getAttribute("aria-expanded") === String(toggled)
        && visible(body) === toggled
        && Boolean(body?.hidden) === !toggled;
      const stableDom = document.querySelector(".g1-redesign") === rootBefore
        && card === cardBefore
        && body === bodyBefore
        && (!fieldBefore || body?.querySelector("input, textarea, select") === fieldBefore);
      const topDelta = Math.abs((header?.getBoundingClientRect().top || 0) - (topBefore || 0));
      (header?.querySelector(".g1-card-title") || header)?.click();
      card = document.querySelector(selector);
      const restored = Boolean(getGate1AccordionState().cards[cardId]);
      return {
        id: cardId,
        title: initialHeader.querySelector(".g1-card-title")?.textContent?.trim() || "",
        mountedBody: Boolean(bodyBefore),
        toggledOk,
        restoredOk: restored === initial
          && visible(card?.querySelector(":scope > .g1-card-body")) === initial,
        stableDom,
        topDelta,
        durationMs,
      };
    });
    const regularCard = allCards.find((card) =>
      normalizeGateTitle(card.title) === normalizeGateTitle("ГЛАВНАЯ")
    );

    const independent = (selector, titleSelector, readOpen, bodySelector) => {
      const initial = Boolean(readOpen());
      const rootBefore = document.querySelector(".g1-redesign");
      let header = document.querySelector(selector);
      let section = header?.closest(".g1-section");
      const sectionBefore = section;
      const bodyBefore = section?.querySelector(bodySelector);
      const topBefore = header?.getBoundingClientRect().top;
      const startedAt = performance.now();
      (header?.querySelector(titleSelector) || header)?.click();
      const durationMs = performance.now() - startedAt;
      header = document.querySelector(selector);
      section = header?.closest(".g1-section");
      const body = section?.querySelector(bodySelector);
      const toggled = Boolean(readOpen());
      const toggledOk = toggled === !initial
        && visible(body) === toggled
        && Boolean(body?.hidden) === !toggled;
      const stableDom = document.querySelector(".g1-redesign") === rootBefore
        && section === sectionBefore
        && body === bodyBefore;
      const topDelta = Math.abs((header?.getBoundingClientRect().top || 0) - (topBefore || 0));
      (header?.querySelector(titleSelector) || header)?.click();
      const restored = Boolean(readOpen());
      return {
        toggledOk,
        restoredOk: restored === initial,
        stableDom,
        topDelta,
        durationMs,
      };
    };
    const targetAudience = independent(
      "[data-target-audience-toggle]",
      "strong",
      () => ensureTargetAudience().open,
      ":scope > .target-audience-body",
    );
    const targetAudienceCard = (() => {
      const audienceToggle = document.querySelector("[data-target-audience-toggle]");
      if (!ensureTargetAudience().open) audienceToggle?.click();
      const titleButton = document.querySelector(
        '[data-target-audience-card-toggle-anchor="title"]'
      );
      let button = document.querySelector(
        '[data-target-audience-card-toggle-anchor="control"]'
      );
      const segmentId = button?.dataset.targetAudienceCardToggle;
      const readSegment = () => ensureTargetAudience().segments.find((item) => item.id === segmentId);
      let card = button?.closest(".target-audience-card");
      const rootBefore = document.querySelector(".g1-redesign");
      const cardBefore = card;
      const bodyBefore = card?.querySelector(":scope > .target-audience-card-body");
      const initial = Boolean(readSegment()?.open);
      const topBefore = button?.getBoundingClientRect().top;
      const startedAt = performance.now();
      button?.click();
      const durationMs = performance.now() - startedAt;
      button = document.querySelector(
        '[data-target-audience-card-toggle="' + CSS.escape(segmentId || "") + '"]' +
        '[data-target-audience-card-toggle-anchor="control"]'
      );
      card = button?.closest(".target-audience-card");
      const body = card?.querySelector(":scope > .target-audience-card-body");
      const toggled = Boolean(readSegment()?.open);
      const result = {
        mountedBody: Boolean(bodyBefore),
        stableLocatorsDistinct:
          guruStableToggleLocator(titleButton)() === titleButton &&
          guruStableToggleLocator(button)() === button,
        toggledOk: toggled === !initial
          && card?.classList.contains("is-open") === toggled
          && button?.getAttribute("aria-expanded") === String(toggled)
          && visible(body) === toggled
          && Boolean(body?.hidden) === !toggled,
        stableDom: document.querySelector(".g1-redesign") === rootBefore
          && card === cardBefore
          && body === bodyBefore,
        topDelta: Math.abs((button?.getBoundingClientRect().top || 0) - (topBefore || 0)),
        durationMs,
      };
      button?.click();
      result.restoredOk = Boolean(readSegment()?.open) === initial;
      if (ensureTargetAudience().open) audienceToggle?.click();
      return result;
    })();
    const projectComparison = independent(
      "[data-project-comparison-toggle]",
      "b",
      () => ensureProjectComparison().open,
      ":scope > .project-comparison-body",
    );
    const preferencePersistence = (() => {
      const workspace = state;
      const projectId = activeProjectId;
      const probeKey = "__gate1_accordion_persistence_smoke__";
      getGate1AccordionState().subblocks[probeKey] = true;
      guruScheduleUiPreferenceSave();
      state = structuredClone(workspace);
      activeProjectId = "__different_project_smoke__";
      guruFlushUiPreferenceSave({ cloud: false });
      const stored = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + projectId) || "null");
      const capturedProjectOk = Boolean(
        stored?.ui?.gate1Accordion?.subblocks?.[probeKey]
      );
      const wrongProjectUntouched = !localStorage.getItem(
        WORKSPACE_STORAGE_PREFIX + activeProjectId
      );
      state = workspace;
      activeProjectId = projectId;
      delete getGate1AccordionState().subblocks[probeKey];
      guruPersistStateFast({ quiet: true, cloud: false });
      return { capturedProjectOk, wrongProjectUntouched };
    })();
    const fastRenderCalls = renderCalls;
    renderGate = originalRenderGate;

    return {
      custom,
      selectorSurvivesSeoToggle,
      standard,
      fastRenderCalls,
      targetAudience,
      targetAudienceCard,
      projectComparison,
      preferencePersistence,
      allCards,
      regularCard,
      errors: window.__guruErrors || [],
    };
  })()`);
  console.log(JSON.stringify({ accordion }, null, 2));
  assert(accordion.custom.length >= 7, `Only ${accordion.custom.length} centralized accordions found`);
  assert(
    accordion.custom.every((item) =>
      item.toggledOk && item.restoredOk && item.stableDom && item.topDelta <= 1
    ),
    `Centralized accordion failed: ${JSON.stringify(accordion.custom)}`,
  );
  assert(accordion.selectorSurvivesSeoToggle, "Product selector disappeared after SEO accordion toggles");
  assert(accordion.standard.length >= 2, `Only ${accordion.standard.length} standard Gate 1 sections found`);
  assert(
    accordion.standard.every((item) =>
      item.toggledOk && item.restoredOk && item.stableDom && item.topDelta <= 1
    ),
    `Standard Gate 1 accordion failed: ${JSON.stringify(accordion.standard)}`,
  );
  assert(
    accordion.targetAudience.toggledOk && accordion.targetAudience.restoredOk &&
      accordion.targetAudience.stableDom && accordion.targetAudience.topDelta <= 1,
    `Target audience accordion failed: ${JSON.stringify(accordion.targetAudience)}`,
  );
  assert(
    accordion.targetAudienceCard.mountedBody &&
      accordion.targetAudienceCard.stableLocatorsDistinct &&
      accordion.targetAudienceCard.toggledOk &&
      accordion.targetAudienceCard.restoredOk && accordion.targetAudienceCard.stableDom &&
      accordion.targetAudienceCard.topDelta <= 1,
    `Target audience card accordion failed: ${JSON.stringify(accordion.targetAudienceCard)}`,
  );
  assert(
    accordion.projectComparison.toggledOk && accordion.projectComparison.restoredOk &&
      accordion.projectComparison.stableDom && accordion.projectComparison.topDelta <= 1,
    `Project comparison accordion failed: ${JSON.stringify(accordion.projectComparison)}`,
  );
  assert(
    accordion.preferencePersistence.capturedProjectOk &&
      accordion.preferencePersistence.wrongProjectUntouched,
    `Accordion preference persistence failed: ${JSON.stringify(accordion.preferencePersistence)}`,
  );
  assert(
    accordion.allCards.length >= 18 && accordion.allCards.every((item) =>
      item.mountedBody && item.toggledOk && item.restoredOk && item.stableDom && item.topDelta <= 1
    ),
    `Gate 1 card accordion failed: ${JSON.stringify(accordion.allCards)}`,
  );
  assert(
    accordion.regularCard.title === "ГЛАВНАЯ" &&
      accordion.regularCard.toggledOk && accordion.regularCard.restoredOk &&
      accordion.regularCard.stableDom && accordion.regularCard.topDelta <= 1,
    `Regular Gate 1 card accordion failed: ${JSON.stringify(accordion.regularCard)}`,
  );
  assert(accordion.fastRenderCalls === 0, `Gate 1 accordion triggered ${accordion.fastRenderCalls} full renders`);
  assert(
    [
      ...accordion.custom,
      ...accordion.standard,
      ...accordion.allCards,
      accordion.targetAudience,
      accordion.targetAudienceCard,
      accordion.projectComparison,
    ]
      .every((item) => item.durationMs < 100),
    "Gate 1 local accordion exceeded 100 ms",
  );
  assert(accordion.errors.length === 0, `Accordion runtime errors: ${accordion.errors.join(" | ")}`);

  if (process.argv.includes("--accordion-only")) {
    console.log(JSON.stringify({ accordionAssertions: "passed" }));
    page.close();
    await browser.call("Target.disposeBrowserContext", { browserContextId });
    browser.close();
    process.exit(0);
  }

  const switched = await evaluate(page, `(() => {
    const indexing = gate1SeoCanonicalProductV298(${JSON.stringify("seo-v298-horse")}, state, true);
    indexing.landingIndexed = "no";
    indexing.checkedNote = "10.09.2026 · посадочная не найдена";
    const selector = document.querySelector('[data-gate0-scope-product-select="gate1-product-pages"]');
    selector.value = ${JSON.stringify("seo-v298-horse")};
    selector.dispatchEvent(new Event("change", { bubbles: true }));
    const ui = guruV194Ui(state);
    const directDemand = document.querySelector("[data-gate1-direct-product-v265]");
    const selectedPage = g3ProductJourneyPageSource(guruV194SelectedProduct(state));
    const serviceCard = document.querySelector('[data-card="card-23"]');
    const servicePageNode = serviceCard?.querySelector(".page-structure-card");
    const sourceProductId = selectedPage.row.catalogItemIdV189;
    const originalUrl = megaPlatformUrl("products", sourceProductId, state);
    megaPlatformSetUrl("products", sourceProductId, "", state);
    const emptyUrlHtml = document.createElement("div");
    emptyUrlHtml.innerHTML = gate1WebmasterProductHtmlV295();
    const emptyUrlWhenSourceMissing = emptyUrlHtml.querySelector("[data-g1-webmaster-selected-url-v365]")?.textContent?.trim() === "URL не указан";
    megaPlatformSetUrl("products", sourceProductId, originalUrl, state);
    return {
      selectedProductId: guruV194Ui(state).selectedProductId,
      demandProductId: directDemand?.dataset.gate1DirectProductV265 || "",
      indexingValue: gate1SeoCanonicalProductV298(ui.selectedProductId, state, false)?.landingIndexed,
      indexingNote: gate1SeoCanonicalProductV298(ui.selectedProductId, state, false)?.checkedNote,
      webmasterProductUrl: servicePageNode?.querySelector("[data-g1-webmaster-selected-url-v365]")?.textContent?.trim() || "",
      webmasterInsideServicePage: Boolean(servicePageNode?.querySelector('[data-g1-webmaster-scope-v295="product"]')),
      keywordFoundationInsideServicePage: Boolean(servicePageNode?.querySelector('[data-g1-seo-item-v296="keyword-foundations"]')),
      snippetInsideServicePage: Boolean(servicePageNode?.querySelector('[data-v22-site-section="seo_snippet"]')),
      snippetGuidanceInsideServicePage: Boolean(servicePageNode?.querySelector('[data-v22-site-section="seo_snippet"] [data-g1-seo-guide-v307="snippet-block"]')),
      selectedLandingCardId: g3ProductJourneyPageSource(guruV194SelectedProduct(state)).card?.id || "",
      emptyUrlWhenSourceMissing,
      topLevelSeoBlocks: gate1SeoCentralAuditV298(state).topLevelSeoBlocks
    };
  })()`);
  assert(switched.selectedProductId === setup.horseId, "Product selector did not switch product scope");
  assert(switched.demandProductId === setup.horseId, "Demand/JTBD blocks did not switch to the selected product_id");
  assert(switched.indexingValue === "no", "Product Webmaster value did not switch with product_id");
  assert(switched.webmasterProductUrl === "https://k-apple.ru/services/horse" && switched.selectedLandingCardId === "card-23", "Selected service URL did not appear in the service page card");
  assert(switched.keywordFoundationInsideServicePage && switched.webmasterInsideServicePage && switched.snippetInsideServicePage && switched.snippetGuidanceInsideServicePage, "SEO tools are not merged into the service page card");
  assert(switched.emptyUrlWhenSourceMissing, "Webmaster guessed a URL when the selected landing has none");
  console.log(JSON.stringify({ switched }));
  const saved = await evaluate(page, `(() => {
    /* Persistence is checked in the isolated fixture; unrelated Gates are
       removed here only to stay below the browser's localStorage quota. */
    state.gates = state.gates.filter((gate) => ["gate-0", "gate-1", "gate-2"].includes(gate.id));
    delete state.gate4Production;
    const payload = JSON.stringify(state);
    const projectId = activeProjectId || state.project.id;
    const key = WORKSPACE_STORAGE_PREFIX + projectId;
    localStorage.setItem(key, payload);
    return {
      ok: localStorage.getItem(key) === payload,
      bytes: payload.length,
      projectId
    };
  })()`);
  assert(saved.ok, `Workspace was not saved before reload (${saved.bytes} bytes)`);

  await page.call("Page.reload", { ignoreCache: true });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(page, 'typeof gate1SeoCentralAuditV298 === "function"');
  const hasChooser = await evaluate(page, 'Boolean(document.querySelector("[data-open-project]"))');
  if (hasChooser) await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, 'typeof state !== "undefined" && Boolean(state)');
  await evaluate(page, 'guruNavigateToGate("gate-1"); renderGate(); true');
  await waitFor(page, 'document.querySelectorAll("[data-g1-company-block-v299]").length === 4 && document.querySelectorAll("[data-g1-seo-central-v298=product]").length === 0');
  const reloaded = await evaluate(page, `(() => {
    const audit = gate1SeoCentralAuditV298(state);
    const ui = guruV194Ui(state);
    const servicePageNode = document.querySelector('[data-card="card-23"] .page-structure-card');
    const activeJtbd = JSON.stringify({
      scoped: state.project.gate0ScopedValuesV194,
      bindings: state.project.productBindingsV185,
      main: state.project.productMainJtbds,
      pain: state.painV130
    });
    return {
      selectedProductId: ui.selectedProductId,
      indexing: gate1SeoCanonicalProductV298(${JSON.stringify("seo-v298-horse")}, state, false),
      webmasterProductUrl: servicePageNode?.querySelector("[data-g1-webmaster-selected-url-v365]")?.textContent?.trim() || "",
      webmasterInsideServicePage: Boolean(servicePageNode?.querySelector('[data-g1-webmaster-scope-v295="product"]')),
      keywordFoundationInsideServicePage: Boolean(servicePageNode?.querySelector('[data-g1-seo-item-v296="keyword-foundations"]')),
      snippetInsideServicePage: Boolean(servicePageNode?.querySelector('[data-v22-site-section="seo_snippet"]')),
      snippetGuidanceInsideServicePage: Boolean(servicePageNode?.querySelector('[data-v22-site-section="seo_snippet"] [data-g1-seo-guide-v307="snippet-block"]')),
      titles: audit.topLevelSeoBlocks,
      companyBlocks: audit.companyBlocks,
      outsideSeoCount: audit.outsideSeoCount,
      activeLegacyStore: audit.activeLegacyStore,
      legacyArchived: audit.legacyArchived,
      sitemapUrl: gate1SeoCanonicalCompanyFacadeV298(state).sitemapUrl,
      verification: gate1SeoCanonicalCompanyMetaV298(state).verificationMethod,
      jtbdArtifacts: /�|\\?{2,}/.test(activeJtbd),
      errors: window.__guruErrors || []
    };
  })()`);
  console.log(JSON.stringify({ switched, reloaded }, null, 2));
  assert(reloaded.selectedProductId === setup.horseId, "Selected product was lost after reload");
  assert(reloaded.indexing?.landingIndexed === "no", "Per-product indexing was lost after reload");
  assert(reloaded.indexing?.checkedNote === switched.indexingNote, "Indexing note was lost after reload");
  assert(reloaded.webmasterProductUrl === "https://k-apple.ru/services/horse", "Selected service URL was lost after reload");
  assert(reloaded.keywordFoundationInsideServicePage && reloaded.webmasterInsideServicePage && reloaded.snippetInsideServicePage && reloaded.snippetGuidanceInsideServicePage, "Service SEO was not merged after reload");
  assert(reloaded.titles.length === 0 && reloaded.outsideSeoCount === 0, "Standalone SEO product block returned after reload");
  assert(reloaded.companyBlocks.length === 4, "Company audit hierarchy was lost after reload");
  assert(reloaded.activeLegacyStore === false && reloaded.legacyArchived === true, "Canonical/archive storage changed after reload");
  assert(reloaded.sitemapUrl === result.sitemapUrl && reloaded.verification === result.verification, "Canonical company SEO values were lost after reload");
  assert(reloaded.jtbdArtifacts === false, "JTBD encoding artifacts returned after reload");
  assert(reloaded.errors.length === 0, `Reload runtime errors: ${reloaded.errors.join(" | ")}`);
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
