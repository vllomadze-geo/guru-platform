import { readFile } from "node:fs/promises";

const sourceExportPath =
  process.env.GURU_GATE4_SOURCE_EXPORT || "/Users/vl/Downloads/gate-4.json";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9337";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const smokeProjectId = "gate2-company-product-smoke";
const goatId = "catalog-item-1786792591872-51f503";
const shirtId = "catalog-item-1786792591872-c8b1e9";
const companyNoteSentinel = "gate2-company-note-sentinel";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fakeCatchAllCardIds = [
  "card-93",
  "card-96",
  "card-97",
  "card-98",
  "card-107",
  "card-108",
  "card-109",
  "card-110",
  "card-111",
  "card-113",
  "card-114",
  "card-116",
  "card-117",
  "card-118",
  "card-119",
  "card-120",
  "card-129",
  "card-134",
  "card-135",
  "card-136",
  "g2-cwv",
  "g2-canonical",
  "g2-internal-filter",
  "g2-antibot",
];

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

const sourceExport = JSON.parse(await readFile(sourceExportPath, "utf8"));
assert(
  sourceExport.exportedGateId === "gate-4",
  `Not a Gate 4 export: ${sourceExportPath}`,
);
const sourceProject = sourceExport.content?.project || {};
const sourceProducts = (sourceProject.catalogItemsV189 || []).filter((item) =>
  String(item?.name || "").trim(),
);
const goat = sourceProducts.find((item) => item.id === goatId);
const shirt = sourceProducts.find((item) => item.id === shirtId);
assert(sourceProducts.length === 8, `Expected 8 products, got ${sourceProducts.length}`);
assert(goat, "Goat fixture product is missing");
assert(shirt, "Shirt fixture product is missing");

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

async function waitFor(expression, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function openSmokeProject() {
  await waitFor(`document.querySelector('[data-open-project="${smokeProjectId}"]')`);
  await evaluate(
    `document.querySelector('[data-open-project="${smokeProjectId}"]').click(); true`,
  );
  await waitFor(
    `activeProjectId === ${JSON.stringify(smokeProjectId)} && Boolean(state)`,
  );
  await evaluate(
    'scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {}; true',
  );
}

async function verifySourceLink(cardId, expectedKey, expectedGateId) {
  await evaluate('guruNavigateToGate("gate-2"); true');
  await waitFor('activeGateId === "gate-2"');
  if (expectedKey === "G1") {
    await evaluate(`(() => {
      const gate1 = state.gates.find((gate) => gate.id === "gate-1");
      const ssl = gate1.cards.find((card) => /^ssl/i.test(card.title || ""));
      if (ssl) ssl.status = "ready";
      const gate2 = state.gates.find((gate) => gate.id === "gate-2");
      renderGate2Redesign(gate2, gate2.cards);
      return Boolean(ssl);
    })()`);
  }
  await waitFor(
    `document.querySelector('[data-card=${JSON.stringify(cardId)}] [data-g2-source-link]')`,
  );
  const before = await evaluate(`(() => {
    const link = document.querySelector('[data-card="${cardId}"] [data-g2-source-link]');
    const source = {
      key: link?.dataset.g2SourceKey || "",
      gateId: link?.dataset.g2SourceGate || "",
      path: link?.dataset.g2SourcePath || "",
    };
    link?.click();
    return {
      key: source.key,
      gateId: source.gateId,
      path: source.path,
    };
  })()`);
  await waitFor(`activeGateId === ${JSON.stringify(expectedGateId)}`);
  await waitFor('document.querySelector(".guru-source-target-v212")');
  return {
    ...before,
    activeGateId: await evaluate("activeGateId"),
    highlighted: await evaluate(
      'Boolean(document.querySelector(".guru-source-target-v212"))',
    ),
    valid: before.key === expectedKey &&
      before.gateId === expectedGateId &&
      Boolean(before.path),
  };
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
  assert(pageTarget?.webSocketDebuggerUrl, "Could not find isolated Chrome target");
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
      name: "Gate 2 Company Product smoke",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));
    return true;
  })()`);
  await page.call("Page.reload", { ignoreCache: true });
  await waitFor('document.readyState === "complete"');
  await waitFor('typeof bootstrapAppOnce === "function"');
  await openSmokeProject();

  const setup = await evaluate(`(() => {
    const fixtureProject = ${JSON.stringify(sourceProject)};
    state.project = {
      ...state.project,
      ...structuredClone(fixtureProject),
      id: ${JSON.stringify(smokeProjectId)},
    };
    state.gate4Production = {};
    state.project._gate4ProductIdMigrationLog = (
      Array.isArray(state.project._gate4ProductIdMigrationLog)
        ? state.project._gate4ProductIdMigrationLog
        : []
    ).filter((entry) => entry.id !== GATE4_READINESS_PRODUCT_STORAGE_V225);
    state.project.gate0ScopeUiV194 = {
      ...(state.project.gate0ScopeUiV194 || {}),
      selectedCategoryId: ${JSON.stringify(goat.categoryId)},
      selectedProductId: ${JSON.stringify(goatId)},
    };
    const gate2 = state.gates.find((gate) => gate.id === "gate-2");
    ensureGate2Structure(gate2);
    gate2.cards.forEach((card) => {
      card.notes = "";
      card.fields = {
        ...(card.fields || {}),
        g2Check: "",
        g2ExtraNotes: [],
      };
    });
    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    const megaCard = gate0.cards.find((card) => card.id === "card-7") ||
      gate0.cards.find(isMegaMarketingCard);
    ensureMegaMarketing(megaCard, state);
    const contacts = megaCard.megaMarketing.platformV2.fundamental.find(
      (row) => row.name === "Контакты (телефон, адрес, мессенджер)",
    );
    contacts.status = "works";
    const metrika = megaCard.megaMarketing.infra.find(
      (row) => row.name === "Яндекс Метрика",
    );
    metrika.status = "works";
    const gate1 = state.gates.find((gate) => gate.id === "gate-1");
    const ssl = gate1.cards.find((card) => /^ssl/i.test(card.title || ""));
    if (ssl) ssl.status = "ready";
    g4ReadinessMigrateWorkspaceV225(state);
    g4ReadinessStoreV225(state).byProduct = {};
    localStorage.setItem(
      WORKSPACE_STORAGE_PREFIX + ${JSON.stringify(smokeProjectId)},
      JSON.stringify(state),
    );
    return {
      gate2Cards: gate2.cards.length,
      products: guruV194Products(state).length,
      readinessProductKeys: Object.keys(
        state.gate4Production?.readinessV225?.byProduct || {},
      ),
    };
  })()`);
  assert(
    setup.gate2Cards === 52 &&
      setup.products === 8 &&
      setup.readinessProductKeys.length === 0,
    `Fixture setup failed: ${JSON.stringify(setup)}`,
  );

  await page.call("Page.reload", { ignoreCache: true });
  await waitFor('document.readyState === "complete"');
  await waitFor('typeof bootstrapAppOnce === "function"');
  await openSmokeProject();
  await evaluate('guruNavigateToGate("gate-2"); true');
  await waitFor('activeGateId === "gate-2"');
  await waitFor('document.querySelectorAll("[data-g2-scope]").length === 2');

  const baseline = await evaluate(`(() => {
    const gate2 = state.gates.find((gate) => gate.id === "gate-2");
    const company = document.querySelector('[data-g2-scope="company"]');
    const product = document.querySelector('[data-g2-scope="product"]');
    const productHeading = product?.querySelector(':scope > .gate0-section-heading');
    const productContext = product?.querySelector(':scope > [data-guru-product-context="gate2-product"]');
    const directProductSections = Array.from(
      product?.querySelectorAll(':scope > .g1-section') || [],
    );
    const audit = g2ScopeAuditV267(gate2, state);
    const diagnostics = gate2.cards
      .filter((card) => !/^\s*\d+\.\s+/.test(card.title || ""))
      .map((card) => guruExportGate2CardDiagnosticV223(card, card.status));
    const autoDiagnostics = diagnostics.filter((diagnostic) => {
      const card = gate2.cards.find((item) => item.id === diagnostic.unitId);
      return !guruCanonStatus(card?.fields?.g2Check || "") &&
        G2_AUTOMATIC_SOURCE_KEYS_V267.has(diagnostic.selectedSource?.key);
    });
    const fakeLinks = ${JSON.stringify(fakeCatchAllCardIds)}.map((cardId) => {
      const card = gate2.cards.find((item) => item.id === cardId);
      const info = g2SyncInfo(card);
      const note = document.querySelector(
        '[data-g2-scope="company"] [data-card="' + cardId + '"] .g2-sync-note',
      );
      return {
        cardId,
        sourceCardId: info.g4?.cardId || "",
        note: note?.textContent?.trim() || "",
      };
    });
    const crmLinks = ["card-122", "card-123", "card-124"].map((cardId) => {
      const card = gate2.cards.find((item) => item.id === cardId);
      const info = g2SyncInfo(card);
      return { cardId, sourceCardId: info.g4?.cardId || "", scope: info.g4?.scope || "" };
    });
    const card94 = diagnostics.find((item) => item.unitId === "card-94");
    const card94Row = document.querySelector('[data-card="card-94"]');
    const card93Row = document.querySelector('[data-card="card-93"]');
    const gate1LinkTargets = {
      "g2-cwv": "card-18",
      "card-97": "card-20",
      "card-98": "card-16",
      "g2-canonical": "card-16",
      "card-108": "gate1-webmaster-v295",
      "card-109": "gate1-webmaster-v295",
      "card-135": "card-37",
    };
    const platformLinkTargets = {
      "card-90": ["L", "gate-4", "card-152"],
      "card-91": ["F", "gate-0", "card-7"],
      "card-92": ["L", "gate-4", "card-155"],
      "card-94": ["F", "gate-0", "card-7"],
      "g2-cwv": ["G1", "gate-1", "card-18"],
    };
    return {
      modelCards: gate2.cards.length,
      modelCompany: audit.company.length,
      modelProduct: audit.product.length,
      classification: audit.rows,
      selectors: {
        category: document.querySelectorAll('[data-gate0-scope-category-select="gate2-product"]').length,
        product: document.querySelectorAll('[data-gate0-scope-product-select="gate2-product"]').length,
      },
      company: {
        heading: company?.querySelector('.gate0-section-heading-title')?.textContent.trim() || "",
        modelAttr: Number(company?.dataset.g2ModelCardCount || -1),
        visibleAttr: Number(company?.dataset.g2VisibleCardCount || -1),
        visibleRows: company?.querySelectorAll('.g2-check-row').length ?? -1,
        containsProductCard: Boolean(company?.querySelector('[data-card="card-90"]')),
        sectionTitles: Array.from(company?.querySelectorAll(':scope > .g1-section .g1-section-title') || [])
          .map((node) => node.textContent.trim()),
        crmCardIds: Array.from(company?.querySelectorAll('[data-card="card-122"], [data-card="card-123"], [data-card="card-124"]') || [])
          .map((node) => node.dataset.card),
      },
      product: {
        heading: product?.querySelector('.gate0-section-heading-title')?.textContent.trim() || "",
        modelAttr: Number(product?.dataset.g2ModelCardCount || -1),
        visibleAttr: Number(product?.dataset.g2VisibleCardCount || -1),
        visibleRows: product?.querySelectorAll('.g2-check-row').length ?? -1,
        cardIds: Array.from(product?.querySelectorAll('.g2-check-row') || []).map((node) => node.dataset.card),
        productPickers: document.querySelectorAll('[data-gate0-scope-product-select="gate2-product"]').length,
        contextInsideProduct: Boolean(productContext),
        contextOutsideProduct: document.querySelectorAll(
          '.g2-company-product-v226 > [data-guru-product-context="gate2-product"]',
        ).length,
        strategicFoundation: productContext?.querySelectorAll('[data-guru-strategic-foundation]').length ?? 0,
        strategicProductId: productContext?.querySelector('[data-guru-strategic-foundation]')?.dataset.productId || "",
        sectionTitles: directProductSections
          .map((section) => section.querySelector('.g1-section-title')?.textContent.trim() || ""),
        directSectionCount: directProductSections.length,
        legacyWrapperCount: product?.querySelectorAll(':scope > .g2-product-scope-body-v226').length ?? -1,
        contextMarginBottom: productContext
          ? getComputedStyle(productContext).marginBottom
          : "missing",
        order: [productHeading, productContext, directProductSections[0]].map((node) =>
          node ? Array.from(product.children).indexOf(node) : -1
        ),
      },
      statusPresentation: {
        legacyMismatchIds: diagnostics
          .filter((item) => item.rawStoredStatus !== item.displayedStatus)
          .map((item) => item.unitId),
        mismatchWarnings: diagnostics
          .filter((item) => item.warnings?.some((warning) => /status control differs/i.test(warning)))
          .map((item) => item.unitId),
        automaticIds: autoDiagnostics.map((item) => item.unitId),
        automaticDomOk: autoDiagnostics.every((item) => {
          const row = document.querySelector('[data-card="' + item.unitId + '"]');
          return Boolean(
            row &&
            !row.querySelector('[data-g2-field="check"]') &&
            !row.querySelector('[data-g2-field="notes"]') &&
            row.querySelector('[data-g2-source-link]')?.dataset.g2SourcePath === item.selectedSource.path
          );
        }),
        statusSelectCount: document.querySelectorAll('[data-g2-field="check"]').length,
        noteControlCount: document.querySelectorAll(
          '[data-g2-field="notes"], [data-g2-field="extra"], [data-g2-add-note], [data-g2-remove-note]',
        ).length,
        card94: {
          diagnostic: card94,
          pill: card94Row?.querySelector('.status-pill')?.textContent.trim() || "",
          hasStatusSelect: Boolean(card94Row?.querySelector('[data-g2-field="check"]')),
          hasNotes: Boolean(card94Row?.querySelector('[data-g2-field="notes"]')),
          hasLink: Boolean(card94Row?.querySelector('[data-g2-source-link]')),
        },
        card93: {
          hasStatusSelect: Boolean(card93Row?.querySelector('[data-g2-field="check"]')),
          hasNotes: Boolean(card93Row?.querySelector('[data-g2-field="notes"]')),
          hasLink: Boolean(card93Row?.querySelector('[data-g2-source-link]')),
        },
      },
      gate1Links: Object.entries(gate1LinkTargets).map(([cardId, sourceCardId]) => {
        const link = document.querySelector(
          '[data-card="' + cardId + '"] [data-g2-source-link]',
        );
        return {
          cardId,
          expectedSourceCardId: sourceCardId,
          sourceKey: link?.dataset.g2SourceKey || "",
          sourceGate: link?.dataset.g2SourceGate || "",
          sourceCardId: link?.dataset.g2SourceCard || "",
          label: link?.textContent?.trim() || "",
        };
      }),
      platformLinks: Object.entries(platformLinkTargets).map(([cardId, expected]) => {
        const link = document.querySelector(
          '[data-card="' + cardId + '"] [data-g2-source-link]',
        );
        return {
          cardId,
          expected,
          actual: [
            link?.dataset.g2SourceKey || "",
            link?.dataset.g2SourceGate || "",
            link?.dataset.g2SourceCard || "",
          ],
          label: link?.textContent?.trim() || "",
        };
      }),
      fakeLinks,
      crmLinks,
    };
  })()`);

  const expectedProductIds = [
    "card-90", "card-91", "card-92", "card-93", "card-94", "g2-cwv",
    "card-100", "card-101", "card-102", "card-103", "card-104", "card-105",
    "g2-internal-filter", "g2-antibot",
    "card-126", "card-127", "card-128", "card-129",
    "card-116", "card-117", "card-118", "card-119", "card-120",
  ];
  console.log("gate2-v267: baseline captured");
  assert(
    baseline.modelCards === 52 &&
      baseline.modelCompany === 29 &&
      baseline.modelProduct === 23 &&
      baseline.company.modelAttr === 29 &&
      baseline.product.modelAttr === 23 &&
      baseline.company.visibleRows === 19 &&
      baseline.product.visibleRows === 23 &&
      JSON.stringify(baseline.product.cardIds) === JSON.stringify(expectedProductIds),
    `Gate 2 readinessV225 classification is wrong: ${JSON.stringify(baseline)}`,
  );
  assert(
    baseline.company.heading === "Компания" &&
      baseline.product.heading === "Продукт/Услуга" &&
      baseline.selectors.category === 1 &&
      baseline.selectors.product === 1 &&
      baseline.product.productPickers === 1 &&
      baseline.product.contextInsideProduct &&
      baseline.product.contextOutsideProduct === 0 &&
      baseline.product.strategicFoundation === 1 &&
      baseline.product.strategicProductId === goatId &&
      JSON.stringify(baseline.company.sectionTitles) === JSON.stringify([
        "Техническая доступность",
        "Поисковая инфраструктура",
        "Локальное присутствие",
        "CRM и обработка лидов",
        "Сквозная аналитика",
        "Юридическая готовность",
      ]) &&
      JSON.stringify(baseline.product.sectionTitles) === JSON.stringify([
        "Платформа бренда",
        "Аналитика",
        "Интеграции",
        "Прочее",
      ]) &&
      baseline.product.directSectionCount === 4 &&
      baseline.product.legacyWrapperCount === 0 &&
      baseline.product.contextMarginBottom === "0px" &&
      JSON.stringify(baseline.company.crmCardIds) === JSON.stringify([
        "card-122", "card-123", "card-124",
      ]) &&
      JSON.stringify(baseline.product.order) === JSON.stringify([0, 1, 2]),
    `Gate 2 selector/section layout is wrong: ${JSON.stringify(baseline)}`,
  );
  assert(
    baseline.crmLinks.every(
      (item) => item.sourceCardId === "card-168",
    ),
    `CRM cards lost their existing readiness source card-168: ${JSON.stringify(baseline.crmLinks)}`,
  );
  assert(
    baseline.gate1Links.every(
      (item) =>
        item.sourceKey === "G1" &&
        item.sourceGate === "gate-1" &&
        item.sourceCardId === item.expectedSourceCardId &&
        item.label.includes("Gate 1"),
    ),
    `Gate 1 source links are missing or point to the wrong cards: ${JSON.stringify(baseline.gate1Links)}`,
  );
  assert(
    baseline.platformLinks.every(
      (item) => JSON.stringify(item.actual) === JSON.stringify(item.expected),
    ) && !baseline.statusPresentation.card93.hasLink,
    `Platform source links are missing or point to the wrong fields: ${JSON.stringify(baseline.platformLinks)}`,
  );
  assert(
    baseline.statusPresentation.automaticIds.includes("card-94") &&
      baseline.statusPresentation.automaticDomOk &&
      baseline.statusPresentation.mismatchWarnings.length === 0 &&
      baseline.statusPresentation.statusSelectCount === 0 &&
      baseline.statusPresentation.noteControlCount === 0 &&
      !baseline.statusPresentation.card94.hasStatusSelect &&
      !baseline.statusPresentation.card94.hasNotes &&
      baseline.statusPresentation.card94.hasLink &&
      !baseline.statusPresentation.card93.hasStatusSelect &&
      !baseline.statusPresentation.card93.hasNotes &&
      !baseline.statusPresentation.card93.hasLink,
    `Gate 2 must render only the status badge/source link, without right-side status or note controls: ${JSON.stringify(baseline.statusPresentation)}`,
  );

  const productSelection = await evaluate(`(() => {
    const source = g4ReadinessCardV225("card-152", state);
    const templates = g4ReadinessTemplateRowsV225(source);
    for (const productId of [${JSON.stringify(goatId)}, ${JSON.stringify(shirtId)}]) {
      for (const template of templates) {
        const row = g4ReadinessProductRowV225(productId, "card-152", template.key, state, true);
        row.status = productId === ${JSON.stringify(shirtId)} ? "works" : "";
        row.result = productId === ${JSON.stringify(shirtId)} ? "selected-shirt-ready" : "";
      }
    }
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = ${JSON.stringify(goat.categoryId)};
    ui.selectedProductId = ${JSON.stringify(goatId)};
    renderGate();
    const gate2 = state.gates.find((gate) => gate.id === "gate-2");
    const card90 = gate2.cards.find((card) => card.id === "card-90");
    const goatStatus = g2CardStatus(card90);
    const category = document.querySelector('[data-gate0-scope-category-select="gate2-product"]');
    category.value = ${JSON.stringify(shirt.categoryId)};
    category.dispatchEvent(new Event("change", { bubbles: true }));
    const product = document.querySelector('[data-gate0-scope-product-select="gate2-product"]');
    product.value = ${JSON.stringify(shirtId)};
    product.dispatchEvent(new Event("change", { bubbles: true }));
    const row = document.querySelector('[data-card="card-90"]');
    const diagnostic = guruExportGate2CardDiagnosticV223(card90, card90.status);
    return {
      goatStatus,
      selectedProductId: guruV194Ui(state).selectedProductId,
      shirtStatus: g2CardStatus(card90),
      pill: row?.querySelector('.status-pill')?.textContent.trim() || "",
      hasStatusSelect: Boolean(row?.querySelector('[data-g2-field="check"]')),
      sourceKey: diagnostic.selectedSource?.key || "",
      sourcePath: diagnostic.selectedSource?.path || "",
      strategicProductId: document.querySelector(
        '[data-g2-scope="product"] [data-guru-strategic-foundation]',
      )?.dataset.productId || "",
      hasNotes: Boolean(row?.querySelector('[data-g2-field="notes"]')),
      hasLink: Boolean(row?.querySelector('[data-g2-source-link]')),
    };
  })()`);
  console.log("gate2-v267: product selection captured");
  assert(
    productSelection.goatStatus === "not_started" &&
      productSelection.selectedProductId === shirtId &&
      productSelection.shirtStatus === "ready" &&
      productSelection.pill === "Готово" &&
      !productSelection.hasStatusSelect &&
      productSelection.sourceKey === "L" &&
      productSelection.sourcePath.includes(shirtId) &&
      productSelection.strategicProductId === shirtId &&
      !productSelection.hasNotes &&
      productSelection.hasLink,
    `card-90 does not follow the selected product: ${JSON.stringify(productSelection)}`,
  );

  const sourceNavigation = await evaluate(`(() => {
    const link = document.querySelector('[data-card="card-90"] [data-g2-source-link]');
    link?.click();
    return Boolean(link);
  })()`);
  console.log("gate2-v267: source link clicked");
  assert(sourceNavigation, "card-90 automatic source link was not rendered");
  await waitFor('activeGateId === "gate-4"');
  await waitFor('document.querySelector(\'[data-g4-readiness-card="card-152"]\')');
  const sourceTarget = await evaluate(`(() => {
    const node = document.querySelector('[data-g4-readiness-card="card-152"]');
    return {
      open: Boolean(node?.open),
      highlighted: Boolean(
        node?.closest(".guru-source-target-v212") ||
        document.querySelector(".guru-source-target-v212"),
      ),
      productId: guruV194Ui(state).selectedProductId,
    };
  })()`);
  assert(
    sourceTarget.open && sourceTarget.highlighted && sourceTarget.productId === shirtId,
    `Automatic source link did not reveal the selected product field: ${JSON.stringify(sourceTarget)}`,
  );

  const automaticSourceNavigation = {
    F: await verifySourceLink("card-94", "F", "gate-0"),
    I: await verifySourceLink("card-100", "I", "gate-0"),
  };
  await evaluate(`(() => {
    const gate1 = state.gates.find((gate) => gate.id === "gate-1");
    const ssl = gate1.cards.find((card) => /^ssl/i.test(card.title || ""));
    if (ssl) ssl.status = "ready";
    return Boolean(ssl);
  })()`);
  automaticSourceNavigation.G1 = await verifySourceLink(
    "card-97",
    "G1",
    "gate-1",
  );
  assert(
    Object.values(automaticSourceNavigation).every(
      (item) => item.valid && item.highlighted && item.activeGateId === item.gateId,
    ),
    `One of F/I/G1 source links did not reveal its field: ${JSON.stringify(automaticSourceNavigation)}`,
  );

  console.log(JSON.stringify({
    split: {
      total: baseline.modelCards,
      company: baseline.modelCompany,
      product: baseline.modelProduct,
      productIds: expectedProductIds,
    },
    selector: baseline.selectors,
    legacyBadgeMismatchIds: baseline.statusPresentation.legacyMismatchIds,
    automaticStatusCards: baseline.statusPresentation.automaticIds,
    renderedRightStatusSelects: baseline.statusPresentation.statusSelectCount,
    renderedNoteControls: baseline.statusPresentation.noteControlCount,
    gate1Links: baseline.gate1Links,
    platformLinks: baseline.platformLinks,
    card90SelectedProduct: productSelection,
    sourceNavigation: { L: sourceTarget, ...automaticSourceNavigation },
    manualOnlyCard93Controls: baseline.statusPresentation.card93,
  }, null, 2));

  if (false) {

  assert(
    baseline.modelCards === 52 &&
      baseline.modelCompany === 51 &&
      baseline.modelProduct === 1 &&
      baseline.company.modelAttr === 51 &&
      baseline.product.modelAttr === 1,
    `Gate 2 model split is wrong: ${JSON.stringify(baseline)}`,
  );
  assert(
    baseline.company.heading === "Компания" &&
      baseline.product.heading === "Продукт" &&
      baseline.company.visibleAttr === 41 &&
      baseline.company.visibleRows === 41 &&
      !baseline.company.containsProductCard &&
      baseline.product.visibleAttr === 1 &&
      baseline.product.visibleRows === 1 &&
      JSON.stringify(baseline.product.cardIds) === JSON.stringify(["card-90"]) &&
      baseline.product.productPickers === 0,
    `Gate 2 visual split is wrong: ${JSON.stringify(baseline)}`,
  );
  assert(
    baseline.aggregate.sourceCardId === "card-152" &&
      baseline.aggregate.total === 8 &&
      baseline.aggregate.ready === 0 &&
      baseline.aggregate.not_started === 8 &&
      baseline.aggregate.label ===
        "0 из 8 товаров: посадочная собрана под сегмент" &&
      baseline.aggregateDom.text === baseline.aggregate.label &&
      baseline.aggregateDom.ready === 0 &&
      baseline.aggregateDom.total === 8 &&
      baseline.aggregateDom.source === "card-152",
    `Empty product aggregate is wrong: ${JSON.stringify(baseline.aggregate)}`,
  );
  assert(
    baseline.fakeLinks.length === 24 &&
      baseline.fakeLinks.every(
        (item) =>
          !item.sourceCardId &&
          !/передано\s+в\s+gate\s*4|gate\s*4/i.test(item.note),
      ),
    `Fake Gate 4 links remain: ${JSON.stringify(baseline.fakeLinks)}`,
  );
  assert(
    baseline.crmLinks.every(
      (item) => item.sourceCardId === "card-168" && item.scope === "product",
    ),
    `CRM links no longer point to card-168: ${JSON.stringify(baseline.crmLinks)}`,
  );

  const goatSelectedAggregate = await evaluate(`(() => {
    const source = g4ReadinessCardV225("card-152", state);
    const templates = g4ReadinessTemplateRowsV225(source);
    templates.forEach((template, index) => {
      const row = g4ReadinessProductRowV225(
        ${JSON.stringify(shirtId)},
        "card-152",
        template.key,
        state,
        true,
      );
      row.status = "works";
      row.result = "shirt-card-152-ready-" + index;
    });
    const ui = state.project.gate0ScopeUiV194;
    ui.selectedCategoryId = ${JSON.stringify(goat.categoryId)};
    ui.selectedProductId = ${JSON.stringify(goatId)};
    const aggregate = g2ProductStructureAggregateV226(state);
    renderGate();
    const node = document.querySelector('[data-g2-product-aggregate]');
    return {
      selectedProductId: state.project.gate0ScopeUiV194.selectedProductId,
      templateCount: templates.length,
      aggregate,
      domText: node?.textContent.trim() || "",
      domReady: Number(node?.dataset.g2ProductReady || -1),
      domTotal: Number(node?.dataset.g2ProductTotal || -1),
    };
  })()`);
  assert(
    goatSelectedAggregate.selectedProductId === goatId &&
      goatSelectedAggregate.templateCount === 3 &&
      goatSelectedAggregate.aggregate.ready === 1 &&
      goatSelectedAggregate.aggregate.total === 8 &&
      goatSelectedAggregate.aggregate.items.find((item) => item.product_id === shirtId)?.status === "ready" &&
      goatSelectedAggregate.aggregate.items.find((item) => item.product_id === goatId)?.status === "not_started" &&
      goatSelectedAggregate.domText ===
        "1 из 8 товаров: посадочная собрана под сегмент" &&
      goatSelectedAggregate.domReady === 1 &&
      goatSelectedAggregate.domTotal === 8,
    `Aggregate depends on selected Goat: ${JSON.stringify(goatSelectedAggregate)}`,
  );

  const blankSelectionAggregate = await evaluate(`(() => {
    const ui = state.project.gate0ScopeUiV194;
    ui.selectedCategoryId = "";
    ui.selectedProductId = "";
    const aggregateBeforeRender = g2ProductStructureAggregateV226(state);
    const gate2 = state.gates.find((gate) => gate.id === "gate-2");
    const card90 = gate2.cards.find((card) => card.id === "card-90");
    const template = document.createElement("template");
    template.innerHTML = g2SyncNoteHtml(card90);
    const directNode = template.content.querySelector('[data-g2-product-aggregate]');
    const rawSelectionAfterDirectRead = {
      categoryId: ui.selectedCategoryId,
      productId: ui.selectedProductId,
    };
    renderGate();
    const domNode = document.querySelector('[data-g2-product-aggregate]');
    return {
      aggregateBeforeRender,
      directText: directNode?.textContent.trim() || "",
      directReady: Number(directNode?.dataset.g2ProductReady || -1),
      directTotal: Number(directNode?.dataset.g2ProductTotal || -1),
      rawSelectionAfterDirectRead,
      domText: domNode?.textContent.trim() || "",
      domReady: Number(domNode?.dataset.g2ProductReady || -1),
      domTotal: Number(domNode?.dataset.g2ProductTotal || -1),
      productPickers: document.querySelectorAll(
        '[data-g2-scope="product"] [data-g4-product-pick-select], ' +
        '[data-g2-scope="product"] [data-gate0-scope-product-select], ' +
        '[data-g2-scope="product"] [data-g3-product-journey-select]',
      ).length,
    };
  })()`);
  assert(
    blankSelectionAggregate.rawSelectionAfterDirectRead.categoryId === "" &&
      blankSelectionAggregate.rawSelectionAfterDirectRead.productId === "" &&
      blankSelectionAggregate.aggregateBeforeRender.ready === 1 &&
      blankSelectionAggregate.aggregateBeforeRender.total === 8 &&
      blankSelectionAggregate.directText ===
        "1 из 8 товаров: посадочная собрана под сегмент" &&
      blankSelectionAggregate.directReady === 1 &&
      blankSelectionAggregate.directTotal === 8 &&
      blankSelectionAggregate.domText === blankSelectionAggregate.directText &&
      blankSelectionAggregate.domReady === 1 &&
      blankSelectionAggregate.domTotal === 8 &&
      blankSelectionAggregate.productPickers === 0,
    `Aggregate requires a selected product: ${JSON.stringify(blankSelectionAggregate)}`,
  );

  const companyEdit = await evaluate(`(async () => {
    const note = document.querySelector(
      '[data-g2-scope="company"] [data-g2-card-id="card-93"][data-g2-field="notes"]',
    );
    if (!note) throw new Error("Company note field was not rendered");
    note.value = ${JSON.stringify(companyNoteSentinel)};
    note.dispatchEvent(new Event("input", { bubbles: true }));
    const select = document.querySelector(
      '[data-g2-scope="company"] [data-g2-card-id="card-93"][data-g2-field="check"]',
    );
    if (!select) throw new Error("Company status field was not rendered");
    select.value = "works";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();
    saveState();
    const card = state.gates
      .find((gate) => gate.id === "gate-2")
      .cards.find((item) => item.id === "card-93");
    return {
      note: card.notes || "",
      check: card.fields?.g2Check || "",
      persisted: JSON.parse(
        localStorage.getItem(
          WORKSPACE_STORAGE_PREFIX + ${JSON.stringify(smokeProjectId)},
        ) || "{}",
      ).gates
        ?.find((gate) => gate.id === "gate-2")
        ?.cards.find((item) => item.id === "card-93"),
    };
  })()`);
  assert(
    companyEdit.note === companyNoteSentinel &&
      companyEdit.check === "works" &&
      companyEdit.persisted?.notes === companyNoteSentinel &&
      companyEdit.persisted?.fields?.g2Check === "works",
    `Company card fields did not save: ${JSON.stringify(companyEdit)}`,
  );

  await page.call("Page.reload", { ignoreCache: true });
  await waitFor('document.readyState === "complete"');
  await waitFor('typeof bootstrapAppOnce === "function"');
  await openSmokeProject();
  await evaluate('guruNavigateToGate("gate-2"); true');
  await waitFor('activeGateId === "gate-2"');
  await waitFor('document.querySelectorAll("[data-g2-scope]").length === 2');

  const persisted = await evaluate(`(() => {
    const gate2 = state.gates.find((gate) => gate.id === "gate-2");
    const card = gate2.cards.find((item) => item.id === "card-93");
    const aggregate = g2ProductStructureAggregateV226(state);
    const note = document.querySelector(
      '[data-g2-scope="company"] [data-g2-card-id="card-93"][data-g2-field="notes"]',
    );
    const select = document.querySelector(
      '[data-g2-scope="company"] [data-g2-card-id="card-93"][data-g2-field="check"]',
    );
    const fakeLinks = ${JSON.stringify(fakeCatchAllCardIds)}.map((cardId) => {
      const sourceCard = gate2.cards.find((item) => item.id === cardId);
      return { cardId, sourceCardId: g2SyncInfo(sourceCard).g4?.cardId || "" };
    });
    return {
      note: card.notes || "",
      check: card.fields?.g2Check || "",
      domNote: note?.value || "",
      domCheck: select?.value || "",
      aggregate,
      domAggregate: document.querySelector('[data-g2-product-aggregate]')?.textContent.trim() || "",
      fakeLinks,
      modelCompany: Number(document.querySelector('[data-g2-scope="company"]')?.dataset.g2ModelCardCount || -1),
      modelProduct: Number(document.querySelector('[data-g2-scope="product"]')?.dataset.g2ModelCardCount || -1),
    };
  })()`);
  assert(
    persisted.note === companyNoteSentinel &&
      persisted.check === "works" &&
      persisted.domNote === companyNoteSentinel &&
      persisted.domCheck === "works",
    `Company card fields did not survive reload: ${JSON.stringify(persisted)}`,
  );
  assert(
    persisted.aggregate.ready === 1 &&
      persisted.aggregate.total === 8 &&
      persisted.domAggregate ===
        "1 из 8 товаров: посадочная собрана под сегмент" &&
      persisted.fakeLinks.every((item) => !item.sourceCardId) &&
      persisted.modelCompany === 51 &&
      persisted.modelProduct === 1,
    `Gate 2 split/aggregate regressed after reload: ${JSON.stringify(persisted)}`,
  );

  console.log(
    JSON.stringify(
      {
        source: {
          path: sourceExportPath,
          exportedAt: sourceExport.exportedAt,
          products: sourceProducts.length,
        },
        split: {
          model: { company: baseline.modelCompany, product: baseline.modelProduct },
          visible: {
            company: baseline.company.visibleRows,
            product: baseline.product.visibleRows,
          },
        },
        aggregate: {
          baseline: baseline.aggregate.label,
          selectedGoat: goatSelectedAggregate.aggregate.label,
          blankSelection: blankSelectionAggregate.aggregateBeforeRender.label,
          persisted: persisted.aggregate.label,
        },
        links: {
          removedCatchAll: baseline.fakeLinks.map((item) => item.cardId),
          retainedCard168: baseline.crmLinks,
        },
        companyPersistence: {
          cardId: "card-93",
          status: persisted.check,
          note: persisted.note,
        },
        isolationEnvironment: {
          projectId: smokeProjectId,
          browserContext: "incognito",
          persistedRealWorkspaceTouched: false,
        },
      },
      null,
      2,
    ),
  );
  }
} finally {
  if (browser && targetId) {
    try {
      await browser.call("Target.closeTarget", { targetId });
    } catch (error) {}
  }
  if (browser && browserContextId) {
    try {
      await browser.call("Target.disposeBrowserContext", { browserContextId });
    } catch (error) {}
  }
  page?.close();
  browser?.close();
}
