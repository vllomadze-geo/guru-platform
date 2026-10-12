import { writeFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9368";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate0-card7-card11-v348-smoke";
const productAId = "gate0-v348-product-koza";
const productBId = "gate0-v348-product-lisa";
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
  if (response.exceptionDetails) {
    throw new Error(
      response.exceptionDetails.exception?.description ||
        response.exceptionDetails.text,
    );
  }
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

async function screenshotViewport(page, path) {
  await wait(150);
  const shot = await page.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  await writeFile(path, Buffer.from(shot.data, "base64"));
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
  await page.call("Network.enable");
  await page.call("Network.setCacheDisabled", { cacheDisabled: true });
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1800,
    height: 1200,
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
  await waitFor(
    page,
    'typeof prepareSystemCards === "function" && typeof diag5AScopeModelV348 === "function" && typeof gate0DiagnosticScope === "function"',
  );

  const bootstrapCounts = await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(projectId)};
    workspace.project.name = "Gate 0 card-7/card-11 scope smoke";
    prepareSystemCards(workspace);
    const gate0 = workspace.gates.find((gate) => gate.id === "gate-0");
    gate0.cards = gate0.cards.filter(
      (card) =>
        card.id !== "gate0-landing-check-v215" &&
        card.id !== "gate0-product-diagnostic",
    );
    const legacyCompanyCard = gate0.cards.find((card) => card.id === "card-11");
    legacyCompanyCard.title = "Диагностика точки отсчёта";
    legacyCompanyCard.notes = "legacy-company-note-v350";
    delete legacyCompanyCard.diagnosticScope;
    const mega = gate0.cards.find((card) => card.id === "card-7");
    mega.title = "Legacy custom marketing title";
    const megaRecognizedBeforeRename = isMegaMarketingCard(mega);
    const legacyBefore = gate0.cards.length;
    const legacyDiagnosticCount = gate0.cards.filter(isStartupSummaryCard).length;
    prepareSystemCards(workspace);
    const afterMigration = gate0.cards.length;
    const diagnosticCounts = {
      company: gate0.cards.filter((card) => card.id === "card-11").length,
      product: gate0.cards.filter((card) => card.id === "gate0-product-diagnostic").length,
    };
    const migration = {
      addedOneDiagnostic:
        legacyDiagnosticCount === 1 &&
        diagnosticCounts.company + diagnosticCounts.product === 2,
      sameCompanyObject: gate0.cards.find((card) => card.id === "card-11") === legacyCompanyCard,
      companyNotes: legacyCompanyCard.notes,
      megaRecognizedBeforeRename,
    };
    prepareSystemCards(workspace);
    gate0.cards = gate0.cards.filter((card) => card.id !== "gate0-landing-check-v215");
    const before = gate0.cards.length;
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
    return { legacyBefore, afterMigration, before, diagnosticCounts, migration };
  })()`);
  await evaluate(page, "location.reload(); true");
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(
    page,
    'Boolean(state) && typeof gate0EnsureLandingCheckCardV348 === "function"',
  );

  const initialCard = await evaluate(page, `(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    const landingCards = gate0.cards.filter((card) => card.id === "gate0-landing-check-v215");
    const companyOrder = gate0.cards
      .filter((card) => GATE0_COMPANY_SECTION_TITLES.includes(card.title))
      .map((card) => card.id);
    const productOrder = gate0.cards
      .filter((card) => GATE0_PRODUCT_SECTION_TITLES.includes(card.title))
      .map((card) => card.id);
    const companyDiagnostic = gate0.cards.find((card) => card.id === "card-11");
    const productDiagnostic = gate0.cards.find((card) => card.id === "gate0-product-diagnostic");
    const mega = gate0.cards.find((card) => card.id === "card-7");
    return {
      count: gate0.cards.length,
      landingCount: landingCards.length,
      companyOrder,
      productOrder,
      orderCorrect: productOrder[0] === "card-2" && productOrder[1] === "gate0-landing-check-v215",
      status: landingCards[0]?.status || "",
      companyDiagnostic: {
        title: companyDiagnostic?.title || "",
        scope: gate0DiagnosticScope(companyDiagnostic),
      },
      productDiagnostic: {
        title: productDiagnostic?.title || "",
        scope: gate0DiagnosticScope(productDiagnostic),
      },
      megaTitle: mega?.title || "",
    };
  })()`);
  assert(
    initialCard.count === bootstrapCounts.before + 1,
    `Gate 0 must gain exactly one card (${bootstrapCounts.before} -> ${initialCard.count})`,
  );
  assert(initialCard.landingCount === 1, "Landing card is missing or duplicated in state");
  assert(
    bootstrapCounts.diagnosticCounts.company === 1 &&
      bootstrapCounts.diagnosticCounts.product === 1,
    `Diagnostic migration is not idempotent: ${JSON.stringify(bootstrapCounts)}`,
  );
  assert(
    bootstrapCounts.migration.addedOneDiagnostic &&
      bootstrapCounts.migration.sameCompanyObject &&
      bootstrapCounts.migration.companyNotes === "legacy-company-note-v350" &&
      bootstrapCounts.migration.megaRecognizedBeforeRename,
    `Legacy diagnostic migration was not safe: ${JSON.stringify(bootstrapCounts.migration)}`,
  );
  assert(
    initialCard.orderCorrect,
    `Landing card is not immediately after card-2 inside the product section: ${JSON.stringify(initialCard)}`,
  );
  assert(initialCard.status === "not_started", "Empty landing card must be not_started");
  assert(initialCard.companyOrder.at(-1) === "card-11", "Company diagnostic is not the last company card");
  assert(initialCard.productOrder.at(-1) === "gate0-product-diagnostic", "Product diagnostic is not the last product card");
  assert(
    initialCard.companyDiagnostic.title === "Диагностика точки отсчёта · Компания" &&
      initialCard.companyDiagnostic.scope === "company",
    `Company diagnostic identity is wrong: ${JSON.stringify(initialCard.companyDiagnostic)}`,
  );
  assert(
    initialCard.productDiagnostic.title === "Диагностика точки отсчёта · Продукт/Услуга" &&
      initialCard.productDiagnostic.scope === "product",
    `Product diagnostic identity is wrong: ${JSON.stringify(initialCard.productDiagnostic)}`,
  );
  assert(
    initialCard.megaTitle === "Текущее состояние маркетинговой системы · Компания",
    `card-7 title is wrong: ${initialCard.megaTitle}`,
  );

  const seeded = await evaluate(page, `(() => {
    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    const mega = gate0.cards.find((card) => card.id === "card-7");
    const companyDiagnostic = gate0.cards.find((card) => card.id === "card-11");
    const productDiagnostic = gate0.cards.find((card) => card.id === "gate0-product-diagnostic");
    const currentResultsCard = gate0.cards.find((card) => isCurrentResultsCard(card));
    const marketing = ensureMegaMarketing(mega, state);
    marketing.platformV2.fundamental.forEach((item) => item.status = "works");
    marketing.platformV2.extra.forEach((item) => item.status = "works");
    marketing.infra.forEach((item) => item.status = "works");
    marketing.channels.forEach((item) => item.status = "works");
    marketing.platformV2.landings = {
      "Чужое имя": { url: "https://legacy.invalid/", status: "broken" },
      "Коза": { url: "https://legacy-koza.invalid/", status: "broken" }
    };

    state.project.productRegistryV185 = [];
    state.project.catalogItemsV189 = [];
    state.project.productBindingsV185 = {};
    state.project.gate0ScopedValuesV194 = [];
    const category = guruV189CreateCategory("Игрушки", state);
    const now = new Date().toISOString();
    const productA = {
      id: ${JSON.stringify(productAId)},
      name: "Коза",
      categoryId: category.id,
      continuum: "pure_product",
      createdAt: now
    };
    const productB = {
      id: ${JSON.stringify(productBId)},
      name: "Лиса",
      categoryId: category.id,
      continuum: "pure_product",
      createdAt: now
    };
    guruV189CatalogItems(state).push(productA, productB);
    state.project.productBindingsV185[productA.id] = {
      audiences: [],
      goal: {},
      landing: {
        url: "https://example.test/koza",
        status: "works",
        comment: "Точная посадочная Козы"
      }
    };
    state.project.productBindingsV185[productB.id] = {
      audiences: [],
      goal: {},
      landing: { url: "", status: "", comment: "" }
    };

    const base = {
      project_id: ${JSON.stringify(projectId)},
      source: { type: "manual", label: "v348 smoke" },
      confirmation_status: "confirmed",
      created_at: now,
      updated_at: now
    };
    guruV194Records(state).push(
      {
        ...base,
        id: "positioning-product-a-v348",
        category_id: category.id,
        product_id: productA.id,
        scope: "product",
        field: "positioning",
        value: "Позиционирование Козы",
        positioning: {
          category: "Интерьерная игрушка",
          key_difference: "Авторская ручная работа",
          basis: "Собственная мастерская"
        }
      },
      {
        ...base,
        id: "offer-product-a-v348",
        category_id: category.id,
        product_id: productA.id,
        scope: "product",
        field: "offers",
        value: "Подарок с характером",
        offer: {
          rational: "Готово к вручению",
          irrational: "Тёплая эмоция",
          social: "Отзывы покупателей",
          cta: "Выбрать Козу"
        }
      },
      {
        ...base,
        id: "positioning-category-conflict-v348",
        category_id: category.id,
        product_id: "",
        scope: "category",
        field: "positioning",
        value: "Чужое позиционирование категории",
        positioning: {
          category: "Категорийная рамка",
          key_difference: "Не для Лисы",
          basis: "Категорийное доказательство"
        }
      },
      {
        ...base,
        id: "offer-project-conflict-v348",
        category_id: "",
        product_id: "",
        scope: "project",
        field: "offers",
        value: "Общий оффер, который нельзя наследовать",
        offer: {
          rational: "Общая выгода",
          irrational: "Общая эмоция",
          social: "Общее доверие",
          cta: "Общий CTA"
        }
      }
    );

    const ui = guruV194Ui(state);
    ui.selectedCategoryId = category.id;
    ui.selectedProductId = productA.id;
    currentResultsCard.currentResultsMeta = {
      ...(currentResultsCard.currentResultsMeta || {}),
      positionId: productA.id,
      period: "01.09.2026–14.09.2026",
      sources: "Яндекс Метрика"
    };
    ensureCurrentResults(currentResultsCard).forEach((row, index) => {
      row.value = String((index + 1) * 10);
      row.source = "Яндекс Метрика";
    });
    state._gate0Open = state._gate0Open || {};
    state._gate0Open["card-7"] = true;
    state._gate0Open["gate0-landing-check-v215"] = true;
    state._gate0Open["card-11"] = true;
    state._gate0Open["gate0-product-diagnostic"] = true;
    gate0EnsureLandingCheckCardV348(state);
    recalculateStatusForCard(mega, state);
    recalculateStatusForCard(currentResultsCard, state);
    recalculateStatusForCard(companyDiagnostic, state);
    recalculateStatusForCard(productDiagnostic, state);
    const exportBefore = JSON.stringify(startupSummaryRows(state));
    activeGateId = "gate-0";
    renderGate();
    // Some legacy-recovery wrappers materialize a missing infrastructure row
    // on the first render. Complete the now-final company collection, then
    // prove that deliberately broken/empty landing sources do not affect it.
    const stableMarketing = ensureMegaMarketing(mega, state);
    stableMarketing.platformV2.fundamental.forEach((item) => item.status = "works");
    stableMarketing.platformV2.extra.forEach((item) => item.status = "works");
    stableMarketing.infra.forEach((item) => item.status = "works");
    stableMarketing.channels.forEach((item) => item.status = "works");
    recalculateStatusForCard(mega, state);
    renderGate();
    const megaBeforeLandingToggle = megaMarketingStatus(mega);
    Object.values(stableMarketing.platformV2.landings).forEach((landing) => {
      landing.status = "works";
    });
    state.project.productBindingsV185[productB.id].landing = {
      url: "https://example.test/lisa",
      status: "works",
      comment: "Временная проверка независимости"
    };
    const megaAfterLandingToggle = megaMarketingStatus(mega);
    state.project.productBindingsV185[productB.id].landing = {
      url: "",
      status: "",
      comment: ""
    };
    stableMarketing.platformV2.landings["Чужое имя"].status = "broken";
    stableMarketing.platformV2.landings["Коза"].status = "broken";
    recalculateStatusForCard(mega, state);
    recalculateStatusForCard(gate0.cards.find((card) => card.id === "gate0-landing-check-v215"), state);
    renderGate();
    window.__v348ExportBefore = exportBefore;
    return {
      categoryId: category.id,
      megaStatus: mega.status,
      megaBeforeLandingToggle,
      megaAfterLandingToggle,
      landingStatus: gate0.cards.find((card) => card.id === "gate0-landing-check-v215")?.status || "",
      megaComputed: megaMarketingStatus(mega),
      unfilled: [
        ...marketing.platformV2.fundamental,
        ...marketing.platformV2.extra,
        ...marketing.infra,
        ...marketing.channels,
      ].filter((item) => !item.status).map((item) => item.name || item.channel || item.platform || "unnamed"),
      statusSourceHasLandingItems: megaMarketingStatus.toString().includes("landingItems"),
    };
  })()`);
  assert(
    seeded.megaBeforeLandingToggle === seeded.megaAfterLandingToggle &&
      seeded.megaStatus === seeded.megaBeforeLandingToggle,
    `card-7 status changed with landing completeness: ${JSON.stringify(seeded)}`,
  );
  assert(!seeded.statusSourceHasLandingItems, "megaMarketingStatus still contains landingItems");
  assert(seeded.landingStatus === "in_progress", "Separate landing card must be in_progress for 1/2 products");

  const audit = await evaluate(page, `(() => {
    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    const model = diag5AScopeModelV348(state);
    const companyItems = model.companyStages.flatMap((stage) => stage.items);
    const koza = model.productGroups.find((group) => group.product.id === ${JSON.stringify(productAId)});
    const lisa = model.productGroups.find((group) => group.product.id === ${JSON.stringify(productBId)});
    const kozaPositioning = koza.stages.find((stage) => stage.name === "Позиционирование и посадочная");
    const kozaOffer = koza.stages.find((stage) => stage.name === "Офферы и CTA");
    const lisaPositioning = lisa.stages.find((stage) => stage.name === "Позиционирование и посадочная");
    const lisaOffer = lisa.stages.find((stage) => stage.name === "Офферы и CTA");
    const card11 = document.querySelector('[data-card-row="card-11"]');
    const productDiagnostic = document.querySelector('[data-card-row="gate0-product-diagnostic"]');
    const card2 = document.querySelector('[data-card-row="card-2"]');
    const landingCard = document.querySelector('[data-card-row="gate0-landing-check-v215"]');
    const landingUrl = landingCard?.querySelector('[data-mega-field="url"]')?.value || "";
    return {
      landingDomCount: document.querySelectorAll('[data-card-row="gate0-landing-check-v215"]').length,
      landingFollowsCard2: card2?.nextElementSibling === landingCard,
      landingUrl,
      scopeCount:
        (card11?.querySelectorAll(':scope .diag-scope-v348[data-gate0-diagnostic-scope]').length || 0) +
        (productDiagnostic?.querySelectorAll(':scope .diag-scope-v348[data-gate0-diagnostic-scope]').length || 0),
      companyScopeCount: card11?.querySelectorAll('[data-gate0-diagnostic-scope="company"]').length || 0,
      companyCardHasProductScope: card11?.querySelectorAll('[data-gate0-diagnostic-scope="product"]').length || 0,
      productScopeCount: productDiagnostic?.querySelectorAll('[data-gate0-diagnostic-scope="product"]').length || 0,
      productCardHasCompanyScope: productDiagnostic?.querySelectorAll('[data-gate0-diagnostic-scope="company"]').length || 0,
      productGroupCount: productDiagnostic?.querySelectorAll('[data-gate0-diagnostic-product-id]').length || 0,
      productGroupIds: [...(productDiagnostic?.querySelectorAll('[data-gate0-diagnostic-product-id]') || [])]
        .map((element) => element.dataset.gate0DiagnosticProductId),
      aggregateProductGroupCount: model.productGroups.length,
      companyNames: companyItems.map((item) => item.text),
      companyCounts: {
        channels: model.companyStages.find((stage) => stage.key === "company:channels")?.items.length || 0,
        infra: model.companyStages.find((stage) => stage.key === "company:infrastructure")?.items.length || 0,
        fundamental: model.companyStages.find((stage) => stage.key === "company:fundamental")?.items.length || 0,
      },
      kozaPositioning: kozaPositioning?.items.map((item) => item.status) || [],
      kozaOffer: kozaOffer?.items.map((item) => item.status) || [],
      kozaHasResults: koza.stages.some((stage) => stage.name === "Текущие результаты"),
      lisaPositioning: lisaPositioning?.items.map((item) => item.status) || [],
      lisaOffer: lisaOffer?.items.map((item) => item.status) || [],
      lisaHasResults: lisa.stages.some((stage) => stage.name === "Текущие результаты"),
      unassignedCount: model.unassignedStages.length,
      summaryCardCount: gate0.cards.filter(isStartupSummaryCard).length,
      companyDiagnosticCount: gate0.cards.filter((card) => card.id === "card-11").length,
      productDiagnosticCount: gate0.cards.filter((card) => card.id === "gate0-product-diagnostic").length,
      companyDiagnosticStatus: gate0.cards.find((card) => card.id === "card-11")?.status || "",
      productDiagnosticStatus: gate0.cards.find((card) => card.id === "gate0-product-diagnostic")?.status || "",
      titleOnlyIsNotDiagnostic: isStartupSummaryCard({ id: "unrelated", title: "Диагностика точки отсчёта" }),
      megaTitle: gate0.cards.find((card) => card.id === "card-7")?.title || "",
      productBlockTitles: ["segments", "positioning", "offers"].map((field) =>
        card2?.querySelector('[data-gate0-scope-field-row="' + field + '"] .gate0-scope-field-head-v194 strong')?.textContent.trim() || ""
      ),
      productStrategicTitle: card2?.querySelector(".guru-strategic-foundation-title-v246")?.textContent.trim() || "",
      companyStrategicTitle: document.querySelector("[data-guru-strategic-foundation-company] .guru-strategic-foundation-title-v246")?.textContent.trim() || "",
      startupExportUnchanged: JSON.stringify(startupSummaryRows(state)) === window.__v348ExportBefore,
      errors: window.__guruErrors.slice(),
    };
  })()`);
  assert(audit.landingDomCount === 1, "Landing card is missing or duplicated in DOM");
  assert(audit.landingFollowsCard2, "Landing card does not visually follow card-2 in the product section");
  assert(audit.landingUrl === "https://example.test/koza", "Landing UI read the legacy name mirror instead of current product binding");
  assert(audit.scopeCount === 2 && audit.companyScopeCount === 1 && audit.productScopeCount === 1, "Two diagnostic cards must contain one matching scope each");
  assert(audit.companyCardHasProductScope === 0, "Company diagnostic rendered the product scope");
  assert(audit.productCardHasCompanyScope === 0, "Product diagnostic rendered the company scope");
  assert(
    audit.productGroupCount === 1 && audit.productGroupIds[0] === productAId,
    `Product diagnostic must render only selected product A: ${JSON.stringify(audit.productGroupIds)}`,
  );
  assert(audit.aggregateProductGroupCount === 2, "Aggregate diagnostic model must keep all products for export");
  assert(audit.companyCounts.channels > 0, "Company subsection lost channels");
  assert(audit.companyCounts.infra > 0, "Company subsection lost infrastructure");
  assert(audit.companyCounts.fundamental === 3, "Company subsection must contain all three fundamental items");
  for (const label of ["Форма заявки / корзина", "Блоки доверия", "Контакты"]) {
    assert(audit.companyNames.some((value) => value.startsWith(label + " —")), `Company subsection lost ${label}`);
  }
  assert(audit.kozaPositioning.every((status) => status === "works"), "Exact Koza positioning was not read");
  assert(audit.kozaOffer.every((status) => status === "works"), "Exact Koza offer was not read");
  assert(audit.kozaHasResults, "Current results were not attached by exact positionId");
  assert(audit.lisaPositioning.includes("missing"), "Lisa inherited category positioning");
  assert(audit.lisaOffer.includes("missing"), "Lisa inherited project offer");
  assert(!audit.lisaHasResults, "Lisa received current results belonging to Koza");
  assert(audit.unassignedCount === 0, "Exact current results produced an unassigned duplicate");
  assert(
    audit.summaryCardCount === 2 &&
      audit.companyDiagnosticCount === 1 &&
      audit.productDiagnosticCount === 1,
    `Diagnostics were not split into exactly two physical cards: ${JSON.stringify(audit)}`,
  );
  assert(audit.companyDiagnosticStatus === "ready", `Company diagnostic status is not independent: ${audit.companyDiagnosticStatus}`);
  assert(audit.productDiagnosticStatus === "ready", `Selected product A diagnostic status is wrong: ${audit.productDiagnosticStatus}`);
  assert(!audit.titleOnlyIsNotDiagnostic, "isStartupSummaryCard still recognizes diagnostics by title");
  assert(audit.megaTitle === "Текущее состояние маркетинговой системы · Компания", "card-7 did not keep the approved company title");
  assert(
    JSON.stringify(audit.productBlockTitles) === JSON.stringify([
      "Сегментация · Продукт/Услуга",
      "Позиционирование · Продукт/Услуга",
      "Оффер и CTA · Продукт/Услуга",
    ]),
    `Product block suffixes are wrong: ${JSON.stringify(audit.productBlockTitles)}`,
  );
  assert(audit.productStrategicTitle === "Стратегическая основа · Продукт/Услуга", `Product strategic title is wrong: ${audit.productStrategicTitle}`);
  assert(audit.companyStrategicTitle === "Стратегическая основа · Компания", `Company strategic title is wrong: ${audit.companyStrategicTitle}`);
  assert(audit.startupExportUnchanged, "startupSummaryRows export was changed by the new diagnostic renderer");
  assert(audit.errors.length === 0, `Runtime errors: ${audit.errors.join(" | ")}`);

  const switchedProduct = await evaluate(page, `(() => {
    const select = document.querySelector('[data-card-row="card-2"] [data-gate0-scope-product-select]');
    if (!select) throw new Error("Shared Gate 0 product selector is missing");
    select.value = ${JSON.stringify(productBId)};
    select.dispatchEvent(new Event("change", { bubbles: true }));
    const productDiagnostic = document.querySelector('[data-card-row="gate0-product-diagnostic"]');
    return {
      selectedProductId: guruV194Ui(state).selectedProductId,
      productGroupIds: [...(productDiagnostic?.querySelectorAll('[data-gate0-diagnostic-product-id]') || [])]
        .map((element) => element.dataset.gate0DiagnosticProductId),
      stageStatuses: (diag5ASelectedProductGroupV350(state)?.stages || []).map((stage) => ({
        name: stage.name,
        status: stage.status,
        items: stage.items.map((item) => item.status)
      })),
      status: state.gates.find((gate) => gate.id === "gate-0").cards.find(
        (card) => card.id === "gate0-product-diagnostic"
      )?.status || ""
    };
  })()`);
  assert(
    switchedProduct.selectedProductId === productBId &&
      switchedProduct.productGroupIds.length === 1 &&
      switchedProduct.productGroupIds[0] === productBId,
    `Product diagnostic did not follow selector to product B: ${JSON.stringify(switchedProduct)}`,
  );
  assert(switchedProduct.status === "in_progress", `Selected product B diagnostic status is wrong: ${JSON.stringify(switchedProduct)}`);

  const switchedBack = await evaluate(page, `(() => {
    const select = document.querySelector('[data-card-row="card-2"] [data-gate0-scope-product-select]');
    select.value = ${JSON.stringify(productAId)};
    select.dispatchEvent(new Event("change", { bubbles: true }));
    const productDiagnostic = document.querySelector('[data-card-row="gate0-product-diagnostic"]');
    return {
      selectedProductId: guruV194Ui(state).selectedProductId,
      productGroupIds: [...(productDiagnostic?.querySelectorAll('[data-gate0-diagnostic-product-id]') || [])]
        .map((element) => element.dataset.gate0DiagnosticProductId),
      status: state.gates.find((gate) => gate.id === "gate-0").cards.find(
        (card) => card.id === "gate0-product-diagnostic"
      )?.status || ""
    };
  })()`);
  assert(
    switchedBack.selectedProductId === productAId &&
      switchedBack.productGroupIds.length === 1 &&
      switchedBack.productGroupIds[0] === productAId &&
      switchedBack.status === "ready",
    `Product diagnostic did not follow selector back to product A: ${JSON.stringify(switchedBack)}`,
  );

  const invalidBinding = await evaluate(page, `(() => {
    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    const currentResultsCard = gate0.cards.find((card) => isCurrentResultsCard(card));
    currentResultsCard.currentResultsMeta.positionId = "missing-product-v348";
    const model = diag5AScopeModelV348(state);
    const productResultCount = model.productGroups.reduce(
      (sum, group) => sum + group.stages.filter((stage) => stage.name === "Текущие результаты").length,
      0,
    );
    currentResultsCard.currentResultsMeta.positionId = ${JSON.stringify(productAId)};
    return {
      productResultCount,
      unassignedCount: model.unassignedStages.length,
      unassignedLabel: model.unassignedStages[0]?.label || "",
    };
  })()`);
  assert(invalidBinding.productResultCount === 0, "Invalid positionId was guessed as a product");
  assert(invalidBinding.unassignedCount === 1, "Invalid positionId must produce one explicit unassigned stage");
  assert(invalidBinding.unassignedLabel === "Не назначено продукту", "Unassigned result warning has the wrong label");

  await evaluate(page, `(() => {
    document.querySelectorAll('[data-card-row="card-11"] details[data-gate0-diagnostic-stage], [data-card-row="gate0-product-diagnostic"] details[data-gate0-diagnostic-stage]').forEach((item) => item.open = false);
    const previous = document.getElementById("v348-card7-landing-proof");
    if (previous) previous.remove();
    const host = document.createElement("section");
    host.id = "v348-card7-landing-proof";
    host.style.cssText = "position:fixed;inset:0;z-index:99999;background:#f7f5ef;padding:28px;display:grid;align-content:start;gap:16px;overflow:hidden;";
    host.innerHTML = '<div style="font-size:22px;font-weight:900">Gate 0 · независимые карточки компании и продукта</div><div style="font-weight:800;color:#6f695f">card-7 · Компания</div>';
    const card7 = document.querySelector('[data-card-row="card-7"]')?.cloneNode(true);
    const landing = document.querySelector('[data-card-row="gate0-landing-check-v215"]')?.cloneNode(true);
    if (card7) {
      card7.removeAttribute("open");
      host.append(card7);
    }
    const caption = document.createElement("div");
    caption.style.cssText = "font-weight:800;color:#6f695f;margin-top:8px";
    caption.textContent = "Отдельная карточка · Продукт / Услуга";
    host.append(caption);
    if (landing) {
      landing.setAttribute("open", "");
      host.append(landing);
    }
    document.body.append(host);
    return true;
  })()`);
  await screenshotViewport(page, "artifacts/gate0-card7-company-v350.png");
  await evaluate(page, `(() => {
    document.getElementById("v348-card7-landing-proof")?.remove();
    const previous = document.getElementById("v350-diagnostics-proof");
    if (previous) previous.remove();
    const host = document.createElement("section");
    host.id = "v350-diagnostics-proof";
    host.style.cssText = "position:fixed;inset:0;z-index:99999;background:#f7f5ef;padding:24px;overflow:auto;display:grid;gap:16px;align-content:start;";
    const card11 = document.querySelector('[data-card-row="card-11"]')?.cloneNode(true);
    const productDiagnostic = document.querySelector('[data-card-row="gate0-product-diagnostic"]')?.cloneNode(true);
    if (card11) {
      card11.setAttribute("open", "");
      card11.querySelectorAll('details[data-gate0-diagnostic-stage]').forEach((item) => item.removeAttribute("open"));
      host.append(card11);
    }
    if (productDiagnostic) {
      productDiagnostic.setAttribute("open", "");
      productDiagnostic.querySelectorAll('details[data-gate0-diagnostic-stage]').forEach((item) => item.removeAttribute("open"));
      host.append(productDiagnostic);
    }
    document.body.append(host);
    return true;
  })()`);
  await screenshotViewport(page, "artifacts/gate0-diagnostics-split-v350.png");
  await evaluate(page, 'document.getElementById("v350-diagnostics-proof")?.remove(); true');

  const persistence = await evaluate(page, `(() => {
    saveState();
    return {
      saved: Boolean(localStorage.getItem("guru-platform-workspace-v02-" + ${JSON.stringify(projectId)})),
    };
  })()`);
  assert(persistence.saved, "Workspace was not written before reload");
  await wait(300);
  await evaluate(page, "location.reload(); true");
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, 'Boolean(state) && typeof diag5AScopeModelV348 === "function"');

  const afterReload = await evaluate(page, `(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    activeGateId = "gate-0";
    renderGate();
    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    const model = diag5AScopeModelV348(state);
    return {
      landingCardCount: gate0.cards.filter((card) => card.id === "gate0-landing-check-v215").length,
      landingStatus: gate0.cards.find((card) => card.id === "gate0-landing-check-v215")?.status || "",
      kozaLanding: gate0LandingRecordReadV348(guruV194Product(${JSON.stringify(productAId)}, state), state).url || "",
      companyScopeCount: document.querySelectorAll('[data-card-row="card-11"] [data-gate0-diagnostic-scope="company"]').length,
      productScopeCount: document.querySelectorAll('[data-card-row="gate0-product-diagnostic"] [data-gate0-diagnostic-scope="product"]').length,
      diagnosticCardCount: gate0.cards.filter(isStartupSummaryCard).length,
      productDiagnosticStatus: gate0.cards.find((card) => card.id === "gate0-product-diagnostic")?.status || "",
      megaTitle: gate0.cards.find((card) => card.id === "card-7")?.title || "",
      aggregateProductGroupCount: model.productGroups.length,
      productGroupIds: [...document.querySelectorAll(
        '[data-card-row="gate0-product-diagnostic"] [data-gate0-diagnostic-product-id]'
      )].map((element) => element.dataset.gate0DiagnosticProductId),
      resultOwner: model.productGroups.find((group) =>
        group.stages.some((stage) => stage.name === "Текущие результаты")
      )?.product.id || "",
      errors: window.__guruErrors.slice(),
    };
  })()`);
  assert(afterReload.landingCardCount === 1, "Hard reload duplicated or removed the landing card");
  assert(afterReload.landingStatus === "in_progress", "Landing card status was not preserved/recomputed after reload");
  assert(afterReload.kozaLanding === "https://example.test/koza", "Current landing source was lost after reload");
  assert(afterReload.companyScopeCount === 1 && afterReload.productScopeCount === 1, "Split diagnostic scopes were lost after reload");
  assert(afterReload.diagnosticCardCount === 2, "Hard reload duplicated or removed a diagnostic card");
  assert(afterReload.productDiagnosticStatus === "ready", "Selected product diagnostic status was not recomputed after reload");
  assert(afterReload.megaTitle === "Текущее состояние маркетинговой системы · Компания", "card-7 title was not preserved after reload");
  assert(afterReload.aggregateProductGroupCount === 2, "Aggregate product groups were lost after reload");
  assert(
    afterReload.productGroupIds.length === 1 && afterReload.productGroupIds[0] === productAId,
    `Selected product diagnostic was not preserved after reload: ${JSON.stringify(afterReload.productGroupIds)}`,
  );
  assert(afterReload.resultOwner === productAId, "currentResultsMeta.positionId was not preserved after reload");
  assert(afterReload.errors.length === 0, `Runtime errors after reload: ${afterReload.errors.join(" | ")}`);

  console.log(JSON.stringify({
    ok: true,
    gate0Count: { before: bootstrapCounts.before, after: initialCard.count },
    card7: { status: seeded.megaStatus, landingIndependent: true },
    landingCard: { status: seeded.landingStatus, count: audit.landingDomCount },
    diagnostics: {
      physicalCards: audit.summaryCardCount,
      scopes: audit.scopeCount,
      aggregateProducts: audit.aggregateProductGroupCount,
      visibleProducts: audit.productGroupCount,
      selectorSwitch: `${productAId} → ${productBId} → ${productAId}`,
      fundamentalItems: audit.companyCounts.fundamental,
      exactProductId: true,
      companyStatus: audit.companyDiagnosticStatus,
      productStatus: audit.productDiagnosticStatus,
    },
    startupSummaryRowsUntouched: audit.startupExportUnchanged,
    hardReload: true,
    screenshots: [
      "artifacts/gate0-card7-company-v350.png",
      "artifacts/gate0-diagnostics-split-v350.png"
    ]
  }, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
