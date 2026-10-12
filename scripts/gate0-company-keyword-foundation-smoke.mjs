import { writeFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9362";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate0-company-keyword-foundation-v351-smoke";
const screenshotPath = new URL(
  "../artifacts/gate0-company-keyword-foundation-performance-v354.png",
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
      response.exceptionDetails.exception?.description ||
        response.exceptionDetails.text,
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
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1440,
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
  await waitFor(
    page,
    'typeof guruCompanyKeywordFoundationRecordV351 === "function"',
  );

  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(projectId)};
    workspace.project.name = "Company keyword foundation smoke";
    workspace.project.gate0ScopedValuesV194 = [];
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
  await waitFor(page, 'Boolean(state) && activeProjectId === ' + JSON.stringify(projectId));

  const result = await evaluate(page, `(async () => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    let segment = guruV309ProjectSegmentRecord(state, true);
    segment.segment = {
      geography: "Россия",
      demographics: "Женщины 25+, семьи, дарители и малый бизнес",
      psychographics: "Ценят авторские вещи с душой и ручную работу",
      behavior: "Сравнивают внешний вид, историю и сроки изготовления",
      need_response: "Ищут тёплый личный подарок с характером",
      legacy_value: ""
    };
    segment.value = guruCompanyLegacySegmentAutotextV352(segment);
    guruV308ProjectPositioningRecord(state, true).value =
      "Авторская мастерская создаёт тёплые вещи с характером и личной историей";
    guruV349ProjectBrandPurposeRecord(state, true).value =
      "Делать осознанное потребление естественной частью повседневной жизни";
    guruV347ProjectCompanyOfferRecord(state, true).value =
      "Познакомьтесь с историями вещей и выберите близкую вам";

    const legacyAutotext = segment.value;
    const badSnapshot = guruCompanyKeywordSourceSnapshotV351(state);
    let companyRecord = guruCompanyKeywordFoundationRecordV351(state, true);
    companyRecord.keywords = Array.from({ length: 15 }, (_, index) =>
      guruV247KeywordEntry({
        id: "legacy-company-draft-" + index,
        value: "испорченный компанийный черновик " + (index + 1),
        source: "generated",
        status: "draft",
        strategy_fingerprint: badSnapshot.fingerprint,
      })
    );
    const migrationResult = guruMigrateCompanySegmentUnifiedV352(state);
    segment = guruV309ProjectSegmentRecord(state, false);
    companyRecord = guruCompanyKeywordFoundationRecordV351(state, false);
    activeGateId = "gate-0";
    renderGate();
    const migrationAudit = {
      result: migrationResult,
      valueAfter: segment.value,
      status: segment.company_segment_unified_migration_v352?.status || "",
      archivedValue:
        segment.company_segment_unified_migration_v352?.archived_value || "",
      badFingerprint:
        segment.company_segment_unified_migration_v352?.bad_strategy_fingerprint || "",
      activeKeywords: companyRecord.keywords.length,
      archivedDrafts: companyRecord.keyword_draft_archive_v352?.length || 0,
      warning: document.querySelector(
        "[data-gate0-company-segment-migration-warning]"
      )?.textContent.trim() || "",
      legacyAutotext,
    };

    segment = guruV309ProjectSegmentRecord(state, false);
    segment.value =
      "Осознанные покупатели выбирают долговечные авторские вещи и личные подарки с историей";
    segment.company_segment_unified_migration_v352 = {
      ...segment.company_segment_unified_migration_v352,
      status: "reviewed_manual",
      reviewed_at: new Date().toISOString(),
    };
    guruV308ProjectPositioningRecord(state, true).value =
      "Авторская мастерская создаёт тёплые вещи с характером и личной историей";
    guruV349ProjectBrandPurposeRecord(state, true).value =
      "Сохранять тепло ручной работы и превращать подарки в семейную память";
    guruV347ProjectCompanyOfferRecord(state, true).value =
      "Выберите авторский подарок с характером созданный специально для близкого человека";
    companyRecord = guruCompanyKeywordFoundationRecordV351(state, false);
    companyRecord.keywords = [];

    const category = guruV189CreateCategory("Одежда", state);
    const product = {
      id: "company-keyword-product-v351",
      name: "Платье",
      categoryId: category.id,
      continuum: "pure_product",
      createdAt: new Date().toISOString()
    };
    guruV189CatalogItems(state).push(product);
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = category.id;
    ui.selectedProductId = product.id;
    const productFoundation = guruV247KeywordFoundationRecord(product, true, state);
    const productOnlyKeyword = {
      id: "product-only-keyword",
      value: "товарная фраза только продукта",
      source: "manual",
      status: "confirmed"
    };
    productFoundation.keywords = [
      productOnlyKeyword,
      {
        id: "product-delete-by-stable-id",
        value: "товарная фраза для удаления",
        source: "generated",
        status: "draft"
      },
      {
        id: "product-neighbour-keyword",
        value: "соседняя товарная фраза",
        source: "generated",
        status: "draft"
      }
    ];

    activeGateId = "gate-0";
    renderGate();
    const productDeleteButton = document.querySelector(
      '[data-keyword-foundation-row-v257="product-delete-by-stable-id"] ' +
      '[data-gate0-keyword-foundation-remove]'
    );
    productDeleteButton.dataset.gate0KeywordFoundationRemove = "0";
    productDeleteButton.click();
    await new Promise((resolve) => requestAnimationFrame(() =>
      requestAnimationFrame(resolve)
    ));
    const productAfterDelete = guruV247KeywordFoundationRecord(product, false, state);
    const productDeletionAudit = {
      targetGone: !productAfterDelete.keywords.some(
        (entry) => entry.id === "product-delete-by-stable-id"
      ),
      firstKept: productAfterDelete.keywords.some(
        (entry) => entry.id === productOnlyKeyword.id
      ),
      neighbourKept: productAfterDelete.keywords.some(
        (entry) => entry.id === "product-neighbour-keyword"
      ),
      modelCount: productAfterDelete.keywords.length,
      domCount: document.querySelectorAll(
        "[data-gate0-keyword-foundation-row]"
      ).length,
    };
    productAfterDelete.keywords = [productOnlyKeyword];
    const productFoundationControl = JSON.stringify(
      productAfterDelete.keywords
    );
    guruV194RefreshFieldHtml("keyword_foundation", product);

    const middleCard = state.gates
      .flatMap((gate) => gate.cards || [])
      .find((card) => pageTemplateContext(card) === "product");
    const previousMiddleRows = middleCard.pageRows;
    const middleRow = {
      id: "middle-delete-smoke-row",
      catalogItemIdV189: product.id,
      h1: "Платье ручной работы",
      title: "Платье ручной работы — купить",
      description: "Авторское платье ручной работы с доставкой и гарантией.",
      contextFields: {}
    };
    middleCard.pageRows = [middleRow];
    const middleRecord = guruGate1MiddleRecordV257(middleRow, true);
    middleRecord.keywords = [
      {
        id: "middle-first-keyword",
        value: "первая средняя фраза",
        source: "manual",
        status: "confirmed"
      },
      {
        id: "middle-delete-by-stable-id",
        value: "средняя фраза для удаления",
        source: "generated",
        status: "draft"
      },
      {
        id: "middle-neighbour-keyword",
        value: "соседняя средняя фраза",
        source: "generated",
        status: "draft"
      }
    ];
    const middleHost = document.createElement("div");
    middleHost.style.position = "fixed";
    middleHost.style.left = "-10000px";
    middleHost.innerHTML = guruGate1MiddleKeywordFoundationHtmlV257(
      middleCard,
      middleRow,
      0
    );
    document.body.appendChild(middleHost);
    const middleDeleteButton = middleHost.querySelector(
      '[data-keyword-foundation-row-v257="middle-delete-by-stable-id"] ' +
      '[data-gate1-middle-keyword-remove]'
    );
    const middlePayloadBeforeDelete = guruGate1MiddleRowFromIdsV257(
      middleCard.id,
      0
    );
    const middleStableIndexBeforeDelete = guruKeywordFoundationEntryIndexV353(
      middleRecord,
      middleDeleteButton,
      "gate1MiddleKeywordRemove"
    );
    middleDeleteButton.dataset.gate1MiddleKeywordRemove = "0";
    middleDeleteButton.click();
    await new Promise((resolve) => requestAnimationFrame(() =>
      requestAnimationFrame(resolve)
    ));
    const middleAfterDelete = guruGate1MiddleRecordV257(middleRow, false);
    const middleDeletionAudit = {
      targetGone: !middleAfterDelete.keywords.some(
        (entry) => entry.id === "middle-delete-by-stable-id"
      ),
      cardId: middleCard.id,
      templateContext: pageTemplateContext(middleCard),
      payloadFound: Boolean(middlePayloadBeforeDelete),
      stableIndexBeforeDelete: middleStableIndexBeforeDelete,
      firstKept: middleAfterDelete.keywords.some(
        (entry) => entry.id === "middle-first-keyword"
      ),
      neighbourKept: middleAfterDelete.keywords.some(
        (entry) => entry.id === "middle-neighbour-keyword"
      ),
      modelCount: middleAfterDelete.keywords.length,
      domCount: middleHost.querySelectorAll(
        "[data-gate1-middle-keyword-row]"
      ).length,
    };
    middleHost.remove();
    middleCard.pageRows = previousMiddleRows;
    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    const ids = gate0.cards.map((card) => card.id);
    const offerIndex = ids.indexOf("gate0-company-offer");
    const foundationIndex = ids.indexOf("gate0-company-keyword-foundation");
    const snapshot = guruCompanyKeywordSourceSnapshotV351(state);
    document.querySelector("[data-gate0-company-keyword-generate]")?.click();
    companyRecord = guruCompanyKeywordFoundationRecordV351(state, false);
    const generated = structuredClone(companyRecord.keywords);
    const generatedValues = generated.map(guruV247KeywordText);
    const generatedSourceCoverage = Object.fromEntries(
      GURU_GATE0_COMPANY_KEYWORD_SOURCE_FIELDS_V351.map((field) => [
        field,
        generated.filter((entry) => entry.strategy_source_field === field).length,
      ])
    );
    const generationMeta = structuredClone(companyRecord.last_generation);
    guruCompanyKeywordFoundationFlushDerivedV354({ cloud: false });
    const deleteIndex = 9;
    const deletedCandidateId = generated[deleteIndex].id;
    const firstCandidateId = generated[0].id;
    const deleteButton = document.querySelector(
      '[data-gate0-company-keyword-remove="' + deleteIndex + '"]'
    );
    // A stale positional attribute must not delete another row: the rendered
    // stable candidate id is the primary mutation address.
    deleteButton.dataset.gate0CompanyKeywordRemove = "0";
    document.documentElement.style.scrollBehavior = "auto";
    document.body.style.scrollBehavior = "auto";
    deleteButton.scrollIntoView({ block: "center" });
    const scrollBeforeDelete = window.scrollY;
    const mainScrollBeforeDelete = document.querySelector("main")?.scrollTop || 0;
    const areaScrollBeforeDelete = document.querySelector("#contentArea")?.scrollTop || 0;
    const rowTopBeforeDelete = deleteButton.closest(
      "[data-keyword-foundation-row-v257]"
    ).getBoundingClientRect().top;
    const deleteTimings = {};
    const deleteCalls = {};
    const timedFunctions = [
      "flashSaving",
      "guruInvalidateGateViewCache",
      "guruCompanyKeywordFoundationRefreshV351",
      "guruCompanyKeywordFoundationSyncDemandV351",
      "guruRefreshReadiness",
      "renderGateNav",
      "guruCompanyKeywordRefreshGate0NavV354",
      "guruPersistStateFast",
      "guruKeywordFoundationRestoreViewV353",
    ];
    const originalTimedFunctions = Object.fromEntries(
      timedFunctions.map((name) => [name, window[name]])
    );
    timedFunctions.forEach((name) => {
      const original = originalTimedFunctions[name];
      window[name] = function (...args) {
        const startedAt = performance.now();
        deleteCalls[name] = (deleteCalls[name] || 0) + 1;
        try {
          return original.apply(this, args);
        } finally {
          deleteTimings[name] = Math.round(
            ((deleteTimings[name] || 0) + performance.now() - startedAt) * 10
          ) / 10;
        }
      };
    });
    const deleteStartedAt = performance.now();
    deleteButton.click();
    const syncDurationMs = performance.now() - deleteStartedAt;
    const immediateCalls = structuredClone(deleteCalls);
    await new Promise((resolve) => requestAnimationFrame(() =>
      requestAnimationFrame(resolve)
    ));
    const visualDurationMs = performance.now() - deleteStartedAt;
    companyRecord = guruCompanyKeywordFoundationRecordV351(state, false);
    const deletionAudit = {
      deletedCandidateId,
      deletedCandidateGone: !companyRecord.keywords.some(
        (entry) => entry.id === deletedCandidateId
      ),
      firstCandidateKept: companyRecord.keywords.some(
        (entry) => entry.id === firstCandidateId
      ),
      modelCount: companyRecord.keywords.length,
      domCount: document.querySelectorAll(
        "[data-gate0-company-keyword-row]"
      ).length,
      scrollShift: Math.round(window.scrollY - scrollBeforeDelete),
      mainScrollShift: Math.round(
        (document.querySelector("main")?.scrollTop || 0) - mainScrollBeforeDelete
      ),
      areaScrollShift: Math.round(
        (document.querySelector("#contentArea")?.scrollTop || 0) - areaScrollBeforeDelete
      ),
      nextRowTopShift: Math.round(
        (document.querySelector(
          '[data-keyword-foundation-row-v257="' + generated[deleteIndex + 1].id + '"]'
        )?.getBoundingClientRect().top || 0) - rowTopBeforeDelete
      ),
      timings: deleteTimings,
      immediateCalls,
      syncDurationMs: Math.round(syncDurationMs * 10) / 10,
      visualDurationMs: Math.round(visualDurationMs * 10) / 10,
    };
    await new Promise((resolve) => setTimeout(resolve, 280));
    deletionAudit.afterDeferredCalls = structuredClone(deleteCalls);
    Object.entries(originalTimedFunctions).forEach(([name, original]) => {
      window[name] = original;
    });

    companyRecord = guruCompanyKeywordFoundationRecordV351(state, false);
    companyRecord.keywords = structuredClone(generated);
    guruCompanyKeywordFoundationRefreshV351();

    const burstCalls = {};
    const burstFunctionNames = [
      "guruCompanyKeywordFoundationSyncDemandV351",
      "guruRefreshReadiness",
      "renderGateNav",
      "guruCompanyKeywordRefreshGate0NavV354",
      "guruPersistStateFast",
    ];
    const originalBurstFunctions = Object.fromEntries(
      burstFunctionNames.map((name) => [name, window[name]])
    );
    burstFunctionNames.forEach((name) => {
      const original = originalBurstFunctions[name];
      window[name] = function (...args) {
        burstCalls[name] = (burstCalls[name] || 0) + 1;
        return original.apply(this, args);
      };
    });
    const burstIds = generated.slice(0, 10).map((entry) => entry.id);
    const burstStartedAt = performance.now();
    burstIds.forEach((candidateId) => {
      const button = document.querySelector(
        '[data-keyword-foundation-row-v257="' + candidateId + '"] ' +
        '[data-gate0-company-keyword-remove]'
      );
      if (button) {
        button.dataset.gate0CompanyKeywordRemove = "999";
        button.click();
      }
    });
    const burstSyncDurationMs = performance.now() - burstStartedAt;
    const burstImmediateCalls = structuredClone(burstCalls);
    const burstImmediateRecord = guruCompanyKeywordFoundationRecordV351(
      state,
      false
    );
    const burstImmediateAudit = {
      removed: burstIds.every((candidateId) =>
        !burstImmediateRecord.keywords.some((entry) => entry.id === candidateId)
      ),
      modelCount: burstImmediateRecord.keywords.length,
      domCount: document.querySelectorAll(
        "[data-gate0-company-keyword-row]"
      ).length,
      syncDurationMs: Math.round(burstSyncDurationMs * 10) / 10,
      calls: burstImmediateCalls,
    };
    await new Promise((resolve) => setTimeout(resolve, 280));
    const burstAudit = {
      ...burstImmediateAudit,
      afterDeferredCalls: structuredClone(burstCalls),
    };
    Object.entries(originalBurstFunctions).forEach(([name, original]) => {
      window[name] = original;
    });

    companyRecord = guruCompanyKeywordFoundationRecordV351(state, false);
    companyRecord.keywords = [{
      id: "company-confirmed-performance",
      value: "исходная подтвержденная фраза",
      source: "manual",
      status: "confirmed"
    }];
    const companyDemand = gate1CompanySemanticsV264(state);
    companyDemand.demandRows = [{
      id: "company-demand-performance",
      candidate_id: "company-confirmed-performance",
      kw: "исходная подтвержденная фраза",
      vol: "321",
      queryCount: "77",
      forecastClicks: "12",
      clickPrice: "9",
      bid: "11",
      forecastBudget: "108"
    }];
    companyDemand.archivedDemandRows = [];
    guruCompanyKeywordFoundationRefreshV351();

    const confirmedCalls = {};
    const confirmedFunctionNames = [
      "guruCompanyKeywordFoundationSyncDemandV351",
      "gate1CompanyBrandDemandReconcileV345",
      "guruRefreshReadiness",
      "renderGateNav",
      "guruPersistStateFast",
    ];
    const originalConfirmedFunctions = Object.fromEntries(
      confirmedFunctionNames.map((name) => [name, window[name]])
    );
    confirmedFunctionNames.forEach((name) => {
      const original = originalConfirmedFunctions[name];
      window[name] = function (...args) {
        confirmedCalls[name] = (confirmedCalls[name] || 0) + 1;
        return original.apply(this, args);
      };
    });
    const confirmedInput = document.querySelector(
      '[data-keyword-foundation-row-v257="company-confirmed-performance"] ' +
      '[data-gate0-company-keyword-input]'
    );
    for (let index = 1; index <= 10; index += 1) {
      confirmedInput.value = "быстрая подтвержденная фраза " + "я".repeat(index);
      confirmedInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    const finalConfirmedValue = confirmedInput.value;
    const confirmedImmediately = guruCompanyKeywordFoundationRecordV351(
      state,
      false
    ).keywords.find((entry) => entry.id === "company-confirmed-performance");
    const confirmedImmediateCalls = structuredClone(confirmedCalls);
    await new Promise((resolve) => setTimeout(resolve, 380));
    const demandAfterInput = structuredClone(
      gate1CompanySemanticsV264(state).demandRows || []
    );
    const confirmedAfterInputCalls = structuredClone(confirmedCalls);
    const confirmedRemove = document.querySelector(
      '[data-keyword-foundation-row-v257="company-confirmed-performance"] ' +
      '[data-gate0-company-keyword-remove]'
    );
    const confirmedDeleteStartedAt = performance.now();
    confirmedRemove.click();
    const confirmedDeleteSyncDurationMs =
      performance.now() - confirmedDeleteStartedAt;
    const confirmedDeleteImmediateCalls = structuredClone(confirmedCalls);
    const confirmedGoneImmediately = !guruCompanyKeywordFoundationRecordV351(
      state,
      false
    ).keywords.some((entry) => entry.id === "company-confirmed-performance");
    await new Promise((resolve) => setTimeout(resolve, 280));
    const companyDemandAfterDelete = gate1CompanySemanticsV264(state);
    const archivedMetric = (companyDemandAfterDelete.archivedDemandRows || [])
      .find((row) => row.id === "company-demand-performance");
    const confirmedAudit = {
      finalValueInModelImmediately:
        confirmedImmediately?.value === finalConfirmedValue,
      immediateCalls: confirmedImmediateCalls,
      afterInputCalls: confirmedAfterInputCalls,
      demandAfterInput,
      goneImmediately: confirmedGoneImmediately,
      deleteSyncDurationMs:
        Math.round(confirmedDeleteSyncDurationMs * 10) / 10,
      deleteImmediateCalls: confirmedDeleteImmediateCalls,
      afterDeleteCalls: structuredClone(confirmedCalls),
      activeDemandCount: companyDemandAfterDelete.demandRows?.length || 0,
      archivedMetric: archivedMetric ? structuredClone(archivedMetric) : null,
    };
    Object.entries(originalConfirmedFunctions).forEach(([name, original]) => {
      window[name] = original;
    });
    delete companyDemandAfterDelete.demandRows;
    delete companyDemandAfterDelete.archivedDemandRows;

    companyRecord = guruCompanyKeywordFoundationRecordV351(state, false);
    companyRecord.keywords = structuredClone(generated);
    guruCompanyKeywordFoundationRefreshV351();
    document.querySelector("[data-gate0-company-keyword-confirm]")?.click();
    companyRecord = guruCompanyKeywordFoundationRecordV351(state, false);
    const confirmedAfterGenerate = guruCompanyKeywordConfirmedModelV351(state);

    document.querySelector("[data-gate0-company-keyword-add]")?.click();
    const manualInputs = [...document.querySelectorAll(
      "[data-gate0-company-keyword-input]"
    )];
    const manualInput = manualInputs[manualInputs.length - 1];
    manualInput.value = "ручная компанийная фраза";
    manualInput.dispatchEvent(new Event("input", { bubbles: true }));
    companyRecord = guruCompanyKeywordFoundationRecordV351(state, false);
    const manualEntry = structuredClone(companyRecord.keywords.at(-1));

    const beforeImport = companyRecord.keywords.length;
    const parsed = guruV248ParseKeywordCsv(
      "keyword\\nимпортированная компанийная фраза\\nРУЧНАЯ КОМПАНИЙНАЯ ФРАЗА"
    );
    guruCompanyOpenKeywordImportDialogV351(parsed, "company.csv");
    document.querySelector(
      '[data-gate0-company-keyword-import-mode="add"]'
    )?.click();
    companyRecord = guruCompanyKeywordFoundationRecordV351(state, false);
    const imported = companyRecord.keywords.filter((entry) =>
      guruV247KeywordNormalize(guruV247KeywordText(entry)) ===
        "импортированная компанийная фраза"
    );
    const afterAddCount = companyRecord.keywords.length;

    const beforeReplaceValues = companyRecord.keywords.map(guruV247KeywordText);
    const confirmedBeforeReplace = guruCompanyKeywordFoundationStatsV351(state).confirmed;
    const replacement = guruV248ParseKeywordCsv("замена компания один\\nзамена компания два");
    let warningMessage = "";
    window.confirm = (message) => { warningMessage = String(message); return false; };
    guruCompanyOpenKeywordImportDialogV351(replacement, "replace-company.csv");
    document.querySelector(
      '[data-gate0-company-keyword-import-mode="replace"]'
    )?.click();
    companyRecord = guruCompanyKeywordFoundationRecordV351(state, false);
    const cancelPreserved = JSON.stringify(beforeReplaceValues) === JSON.stringify(
      companyRecord.keywords.map(guruV247KeywordText)
    );
    window.confirm = () => true;
    document.querySelector(
      '[data-gate0-company-keyword-import-mode="replace"]'
    )?.click();
    companyRecord = guruCompanyKeywordFoundationRecordV351(state, false);
    const replacedEntries = companyRecord.keywords.map((entry) => structuredClone(entry));

    let downloaded = null;
    downloadText = (filename, text) => { downloaded = { filename, text }; };
    document.querySelector("[data-gate0-company-keyword-export]")?.click();
    const companyExact = guruV194ExactRecords(
      "keyword_foundation", "project", null, state
    );
    const productExact = guruV194ExactRecords(
      "keyword_foundation", "product", product, state
    );
    const productResolved = guruV194Resolve("keyword_foundation", product, state);
    saveState();
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      cardCount: ids.filter((id) => id === "gate0-company-keyword-foundation").length,
      orderCorrect: foundationIndex === offerIndex + 1,
      cardVisible: Boolean(document.querySelector(
        '[data-card-row="gate0-company-keyword-foundation"]'
      )),
      productUiFoundationCount: document.querySelectorAll(
        '[data-gate0-scope-field-row="keyword_foundation"] [data-gate0-keyword-foundation-input]'
      ).length,
      productUiTitle: document.querySelector(
        '[data-gate0-scope-field-row="keyword_foundation"] .gate0-scope-field-head-v194 strong'
      )?.textContent.trim() || "",
      productDeletionAudit,
      productDataUnchanged:
        JSON.stringify(
          guruV247KeywordFoundationRecord(product, false, state)?.keywords || []
        ) === productFoundationControl,
      middleDeletionAudit,
      snapshotFields: snapshot.fields,
      snapshotTextCount: snapshot.texts.length,
      migrationAudit,
      generatedCount: generated.length,
      generatedDrafts: generated.every((entry) =>
        entry.source === "generated" && entry.status === "draft"
      ),
      generatedSourceCoverage,
      generationMeta,
      deletionAudit,
      burstAudit,
      confirmedAudit,
      generatedWordCounts: generatedValues.map((value) =>
        guruV247KeywordTokens(value).length
      ),
      containsRawMarker: generatedValues.some((value) =>
        value.includes("сырой-маркер")
      ),
      confirmedCount: confirmedAfterGenerate.entries.length,
      manualEntry,
      beforeImport,
      afterImport: afterAddCount,
      imported,
      confirmedBeforeReplace,
      warningMessage,
      cancelPreserved,
      replacedEntries,
      finalCount: companyRecord.keywords.length,
      downloaded,
      companyScopes: companyExact.map((record) => ({
        scope: record.scope,
        productId: record.product_id,
      })),
      productScopes: productExact.map((record) => ({
        scope: record.scope,
        productId: record.product_id,
      })),
      productResolved: {
        scope: productResolved.scope,
        ids: productResolved.records.map((record) => record.id),
      },
      gate1DemandRowsCreated: Object.prototype.hasOwnProperty.call(
        gate1CompanySemanticsV264(state),
        "demandRows",
      ),
      errors: window.__guruErrors,
    };
  })()`);

  assert(result.cardCount === 1 && result.cardVisible, "Company foundation card is missing or duplicated");
  assert(result.orderCorrect, "Company foundation is not directly after company Offer and CTA");
  assert(result.productUiFoundationCount === 1, "Product foundation UI no longer reads its product-scoped record");
  assert(
    result.productDeletionAudit.targetGone &&
      result.productDeletionAudit.firstKept &&
      result.productDeletionAudit.neighbourKept &&
      result.productDeletionAudit.modelCount === 2 &&
      result.productDeletionAudit.domCount === 2,
    `Product keyword deletion did not use the stable id: ${JSON.stringify(result.productDeletionAudit)}`,
  );
  assert(
    result.productDataUnchanged,
    "Company performance scenarios changed the product keyword data",
  );
  assert(
    result.middleDeletionAudit.targetGone &&
      result.middleDeletionAudit.firstKept &&
      result.middleDeletionAudit.neighbourKept &&
      result.middleDeletionAudit.modelCount === 2 &&
      result.middleDeletionAudit.domCount === 2,
    `Gate 1 middle keyword deletion did not use the stable id: ${JSON.stringify(result.middleDeletionAudit)}`,
  );
  assert(
    result.productUiTitle === "Фундамент ключевых слов · Продукт/Услуга",
    "Product foundation did not receive the explicit scope suffix",
  );
  assert(result.snapshotTextCount === 4, "Generator does not have exactly four unified sources");
  assert(
    result.snapshotFields.every((field) => field.values.length === 1),
    "A company generator source is not a single unified value",
  );
  assert(result.generatedCount > 0 && result.generatedCount <= 15, "Invalid generation count");
  assert(
    result.migrationAudit.result.status === "cleared_legacy_autotext" &&
      result.migrationAudit.result.removedDrafts === 15 &&
      result.migrationAudit.valueAfter === "" &&
      result.migrationAudit.status === "cleared_legacy_autotext" &&
      result.migrationAudit.archivedValue === result.migrationAudit.legacyAutotext &&
      result.migrationAudit.activeKeywords === 0 &&
      result.migrationAudit.archivedDrafts === 15 &&
      result.migrationAudit.warning.includes("Нужна ручная единая формулировка"),
    "Historical company segment autotext was not safely migrated",
  );
  assert(result.generatedDrafts, "Generated company candidates are not generated/draft");
  assert(
    result.deletionAudit.deletedCandidateGone &&
      result.deletionAudit.firstCandidateKept &&
      result.deletionAudit.modelCount === 14 &&
      result.deletionAudit.domCount === 14,
    `Company keyword deletion is inconsistent: ${JSON.stringify(result.deletionAudit)}`,
  );
  assert(
    result.deletionAudit.mainScrollShift === 0 &&
      result.deletionAudit.areaScrollShift === 0 &&
      Math.abs(result.deletionAudit.nextRowTopShift) <= 1,
    `Company keyword deletion moved the visible list: ${JSON.stringify(result.deletionAudit)}`,
  );
  assert(
    result.deletionAudit.syncDurationMs < 80,
    `Company draft deletion blocked the click turn for ${result.deletionAudit.syncDurationMs} ms`,
  );
  assert(
    !result.deletionAudit.immediateCalls.guruCompanyKeywordFoundationSyncDemandV351 &&
      !result.deletionAudit.immediateCalls.guruRefreshReadiness &&
      !result.deletionAudit.immediateCalls.renderGateNav,
    `Company draft deletion ran heavy derived work synchronously: ${JSON.stringify(result.deletionAudit)}`,
  );
  assert(
    !result.deletionAudit.afterDeferredCalls.guruCompanyKeywordFoundationSyncDemandV351 &&
      !result.deletionAudit.afterDeferredCalls.guruRefreshReadiness &&
      !result.deletionAudit.afterDeferredCalls.renderGateNav &&
      result.deletionAudit.afterDeferredCalls.guruCompanyKeywordRefreshGate0NavV354 === 1 &&
      result.deletionAudit.afterDeferredCalls.guruPersistStateFast === 1,
    `Draft deletion did not use the cheap coalesced path: ${JSON.stringify(result.deletionAudit)}`,
  );
  assert(
    result.burstAudit.removed &&
      result.burstAudit.modelCount === 5 &&
      result.burstAudit.domCount === 5 &&
      result.burstAudit.syncDurationMs < 250,
    `Rapid company draft deletion is inconsistent or slow: ${JSON.stringify(result.burstAudit)}`,
  );
  assert(
    !result.burstAudit.calls.guruCompanyKeywordFoundationSyncDemandV351 &&
      !result.burstAudit.calls.guruRefreshReadiness &&
      !result.burstAudit.calls.renderGateNav &&
      !result.burstAudit.afterDeferredCalls.guruCompanyKeywordFoundationSyncDemandV351 &&
      !result.burstAudit.afterDeferredCalls.guruRefreshReadiness &&
      !result.burstAudit.afterDeferredCalls.renderGateNav &&
      result.burstAudit.afterDeferredCalls.guruCompanyKeywordRefreshGate0NavV354 === 1 &&
      result.burstAudit.afterDeferredCalls.guruPersistStateFast === 1,
    `Rapid draft actions were not coalesced: ${JSON.stringify(result.burstAudit)}`,
  );
  assert(
    result.confirmedAudit.finalValueInModelImmediately &&
      !result.confirmedAudit.immediateCalls.guruCompanyKeywordFoundationSyncDemandV351 &&
      !result.confirmedAudit.immediateCalls.gate1CompanyBrandDemandReconcileV345 &&
      !result.confirmedAudit.immediateCalls.guruRefreshReadiness &&
      !result.confirmedAudit.immediateCalls.renderGateNav,
    `Confirmed input did not stay on the immediate lightweight path: ${JSON.stringify(result.confirmedAudit)}`,
  );
  assert(
    result.confirmedAudit.afterInputCalls.guruCompanyKeywordFoundationSyncDemandV351 === 1 &&
      result.confirmedAudit.afterInputCalls.gate1CompanyBrandDemandReconcileV345 === 1 &&
      result.confirmedAudit.afterInputCalls.guruPersistStateFast === 1 &&
      !result.confirmedAudit.afterInputCalls.guruRefreshReadiness &&
      !result.confirmedAudit.afterInputCalls.renderGateNav &&
      result.confirmedAudit.demandAfterInput.length === 1 &&
      result.confirmedAudit.demandAfterInput[0].candidate_id ===
        "company-confirmed-performance" &&
      result.confirmedAudit.demandAfterInput[0].queryCount === "77",
    `Ten confirmed edits did not coalesce into one metric-preserving reconcile: ${JSON.stringify(result.confirmedAudit)}`,
  );
  assert(
    result.confirmedAudit.goneImmediately &&
      result.confirmedAudit.deleteSyncDurationMs < 80 &&
      result.confirmedAudit.deleteImmediateCalls.guruCompanyKeywordFoundationSyncDemandV351 === 1 &&
      result.confirmedAudit.afterDeleteCalls.guruCompanyKeywordFoundationSyncDemandV351 === 2 &&
      result.confirmedAudit.afterDeleteCalls.gate1CompanyBrandDemandReconcileV345 === 2 &&
      result.confirmedAudit.afterDeleteCalls.guruPersistStateFast === 2 &&
      !result.confirmedAudit.afterDeleteCalls.guruRefreshReadiness &&
      !result.confirmedAudit.afterDeleteCalls.renderGateNav &&
      result.confirmedAudit.activeDemandCount === 0 &&
      result.confirmedAudit.archivedMetric?.queryCount === "77",
    `Confirmed deletion did not archive metrics through one deferred reconcile: ${JSON.stringify(result.confirmedAudit)}`,
  );
  assert(
    result.generationMeta?.selection_mode === "balanced_sources",
    "Company generator did not use the explicit balanced_sources mode",
  );
  assert(
    Object.values(result.generatedSourceCoverage).every((count) => count >= 2),
    `A company source has fewer than two guaranteed candidates: ${JSON.stringify(result.generatedSourceCoverage)}`,
  );
  assert(
    result.generatedWordCounts.every((count) => count >= 2 && count <= 4),
    "Company generator produced something other than a 2–4 word n-gram",
  );
  assert(!result.containsRawMarker, "Generator used raw segmentation parts instead of unified value");
  assert(result.confirmedCount === 1, "Confirm action did not confirm exactly one candidate");
  assert(
    result.manualEntry?.value === "ручная компанийная фраза" &&
      result.manualEntry?.source === "manual" &&
      result.manualEntry?.status === "confirmed",
    "Manual company candidate is not manual/confirmed",
  );
  assert(result.afterImport === result.beforeImport + 1, "CSV add did not deduplicate by normalized text");
  assert(
    result.imported.length === 1 &&
      result.imported[0].source === "imported" &&
      result.imported[0].status === "draft",
    "External company CSV did not reuse imported/draft semantics",
  );
  assert(result.cancelPreserved, "Cancelled company CSV replacement changed candidates");
  assert(
    result.warningMessage ===
      `Заменить удалит ${result.confirmedBeforeReplace} уже подтверждённых слов — продолжить?`,
    `Unexpected company replacement warning: ${result.warningMessage}`,
  );
  assert(
    result.replacedEntries.length === 2 &&
      result.replacedEntries.every((entry) =>
        entry.source === "imported" && entry.status === "draft"
      ),
    "Company CSV replace did not fully replace with imported/draft entries",
  );
  assert(
    result.downloaded?.filename.startsWith("keyword-foundation-company-") &&
      result.downloaded?.text.startsWith("phrase,source,status"),
    "Company CSV export has the wrong filename or shared format",
  );
  assert(
    result.companyScopes.length === 1 &&
      result.companyScopes[0].scope === "project" &&
      result.companyScopes[0].productId === "",
    "Company keyword foundation is not isolated in project scope",
  );
  assert(
    result.productScopes.length === 1 &&
      result.productScopes[0].scope === "product" &&
      result.productScopes[0].productId === "company-keyword-product-v351",
    "Product keyword foundation lost its product scope",
  );
  assert(
    result.productResolved.scope === "product" &&
      result.productResolved.ids.length === 1,
    "Product resolver inherited the company foundation",
  );
  assert(!result.gate1DemandRowsCreated, "Gate 0 automatically copied empty rows into Gate 1 storage");
  assert(result.errors.length === 0, `Browser errors: ${result.errors.join(" | ")}`);

  await evaluate(page, "location.reload(); true");
  await waitFor(
    page,
    'typeof state !== "undefined" && Boolean(state) && activeProjectId === ' +
      JSON.stringify(projectId),
  );
  const afterReload = await evaluate(page, `(() => {
    const company = guruCompanyKeywordFoundationRecordV351(state, false);
    const product = guruV194Product("company-keyword-product-v351", state);
    const productRecord = guruV247KeywordFoundationRecord(product, false, state);
    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    return {
      companyScope: company?.scope || "",
      companyProductId: company?.product_id || "",
      companyCount: company?.keywords?.length || 0,
      productCount: productRecord?.keywords?.length || 0,
      cardCount: gate0.cards.filter((card) =>
        card.id === "gate0-company-keyword-foundation"
      ).length,
      errors: window.__guruErrors,
    };
  })()`);
  assert(afterReload.companyScope === "project" && afterReload.companyProductId === "", "Company scope changed after reload");
  assert(afterReload.companyCount === result.finalCount, "Company candidates did not persist");
  assert(afterReload.productCount === 1, "Product candidates changed after reload");
  assert(afterReload.cardCount === 1, "Company foundation card duplicated after reload");
  assert(afterReload.errors.length === 0, `Browser errors after reload: ${afterReload.errors.join(" | ")}`);

  const persistedDeleteStart = await evaluate(page, `(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    activeGateId = "gate-0";
    activeView = "gate";
    state._gate0Open = state._gate0Open || {};
    state._gate0Open["gate0-company-keyword-foundation"] = true;
    renderGate();
    const record = guruCompanyKeywordFoundationRecordV351(state, false);
    const targetId = record.keywords[0].id;
    const row = [...document.querySelectorAll(
      "[data-gate0-company-keyword-row]"
    )].find((entry) => entry.dataset.gate0CompanyKeywordRow === targetId);
    const button = row?.querySelector("[data-gate0-company-keyword-remove]");
    if (!button) return { targetId, removed: false, count: record.keywords.length };
    button.dataset.gate0CompanyKeywordRemove = "999";
    button.click();
    const current = guruCompanyKeywordFoundationRecordV351(state, false);
    const audit = {
      targetId,
      removed: !current.keywords.some((entry) => entry.id === targetId),
      count: current.keywords.length,
    };
    window.dispatchEvent(new Event("pagehide"));
    audit.pendingFlushed = guruCompanyKeywordDerivedPendingV354 === null;
    return audit;
  })()`);
  assert(
    persistedDeleteStart.removed &&
      persistedDeleteStart.count === 1 &&
      persistedDeleteStart.pendingFlushed,
    `Company deletion did not update the model before save: ${JSON.stringify(persistedDeleteStart)}`,
  );
  await evaluate(page, "location.reload(); true");
  await waitFor(
    page,
    'typeof state !== "undefined" && Boolean(state) && activeProjectId === ' +
      JSON.stringify(projectId),
  );
  const persistedDeletionAudit = await evaluate(page, `(() => {
    const record = guruCompanyKeywordFoundationRecordV351(state, false);
    const targetId = ${JSON.stringify(persistedDeleteStart.targetId)};
    return {
      targetGone: !record.keywords.some(
        (entry) => entry.id === targetId
      ),
      ids: record.keywords.map((entry) => entry.id),
      count: record.keywords.length,
      errors: window.__guruErrors,
    };
  })()`);
  assert(
    persistedDeletionAudit.targetGone && persistedDeletionAudit.count === 1,
    `Company deletion did not persist after reload: ${JSON.stringify(persistedDeletionAudit)}`,
  );
  assert(
    persistedDeletionAudit.errors.length === 0,
    `Browser errors after persisted deletion: ${persistedDeletionAudit.errors.join(" | ")}`,
  );

  const screenshotAudit = await evaluate(page, `(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const record = guruCompanyKeywordFoundationRecordV351(state, true);
    record.keywords = [];
    activeGateId = "gate-0";
    state._gate0Open = state._gate0Open || {};
    state._gate0Open["gate0-company-keyword-foundation"] = true;
    renderGate();
    document.querySelector("[data-gate0-company-keyword-generate]")?.click();
    const card = document.querySelector(
      '[data-card-row="gate0-company-keyword-foundation"]'
    );
    const current = guruCompanyKeywordFoundationRecordV351(state, false);
    const coverage = Object.fromEntries(
      GURU_GATE0_COMPANY_KEYWORD_SOURCE_FIELDS_V351.map((field) => [
        field,
        (current?.keywords || []).filter((entry) =>
          entry.strategy_source_field === field
        ).length,
      ])
    );
    const rect = card.getBoundingClientRect();
    const preview = card.cloneNode(true);
    preview.open = true;
    preview.style.maxWidth = "1320px";
    preview.style.margin = "0 auto";
    document.body.replaceChildren(preview);
    document.documentElement.style.background = "#f4f1ec";
    document.body.style.margin = "0";
    document.body.style.padding = "24px";
    document.body.style.background = "#f4f1ec";
    return {
      coverage,
      count: current?.keywords?.length || 0,
      cardHeight: Math.ceil(rect.height),
      cardTop: Math.ceil(rect.top),
    };
  })()`);
  await wait(300);
  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

  console.log(JSON.stringify({
    result,
    afterReload,
    persistedDeletionAudit,
    screenshotAudit,
    screenshot: screenshotPath.pathname,
  }, null, 2));
  console.log("gate0 company keyword foundation smoke: OK");
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  browser.close();
}
