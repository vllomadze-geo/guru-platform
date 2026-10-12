const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9363";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate1-company-brand-demand-v356-smoke";
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
    'typeof gate1CompanyBrandDemandReconcileV345 === "function" && ' +
      'typeof guruCompanyKeywordFoundationRecordV351 === "function" && ' +
      'typeof gate1CompanyBrandDemandExportEntriesV356 === "function" && ' +
      'typeof gate1CompanyBrandDemandApplyParsedRowsV356 === "function" && ' +
      'typeof guruGate1FinalMetricsCsvV279 === "function" && ' +
      'typeof guruGate1FinalParseMetricsCsvV259 === "function"',
  );

  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(projectId)};
    workspace.project.name = "Gate 1 company foundation demand smoke";
    workspace.project.gate0ScopedValuesV194 = [];
    workspace.painV130 = workspace.painV130 || { openSteps: {}, steps: {} };
    workspace.painV130.companySemanticsV264 = {
      brandPhrases: "SMM-фраза, которая не должна попасть в Спрос"
    };
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

  const initial = await evaluate(page, `(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const fixtureAt = "2026-09-15T00:00:00.000Z";
    const categoryId = "product-category-sentinel-v356";
    const productId = "product-sentinel-v356";
    const pageId = "product-page-sentinel-v356";
    state.project.productRegistryV185 = [{
      id: categoryId,
      name: "Smoke product category",
      legacyNames: [],
      createdAt: fixtureAt,
    }];
    state.project.catalogItemsV189 = [{
      id: productId,
      name: "Smoke product",
      continuum: "pure_product",
      categoryId,
      createdAt: fixtureAt,
      source: {
        kind: "gate1",
        cardId: "card-24",
        rowId: pageId,
        rowIndex: 0,
      },
    }];
    const productCard = state.gates
      .find((gate) => gate.id === "gate-1")
      ?.cards?.find((card) => card.id === "card-24");
    if (!productCard) throw new Error("Gate 1 product card fixture is missing");
    const productPage = createPageStructureRow("Smoke product", false);
    productPage.id = pageId;
    productPage.direction = "Smoke product category";
    productPage.categoryId = categoryId;
    productPage.catalogItemIdV189 = productId;
    productPage.contextFields = {};
    productCard.pageRows = [productPage];
    state.painV130.productMaps = [{
      ...pv140EmptyProductMap("Smoke product category"),
      product_id: categoryId,
      items: {},
    }];
    const products = guruV194Products(state);
    const product = products.find((candidate) =>
      Boolean(g3ProductJourneyPageSource(candidate)?.row)
    ) || products[0];
    if (!product) throw new Error("Product fixture is missing");
    const productUi = guruV194Ui(state);
    productUi.selectedCategoryId = product.categoryId || "__uncategorized__";
    productUi.selectedProductId = product.id;

    const productGate0 = guruV247KeywordFoundationRecord(product, true, state);
    productGate0.keywords = [{
      id: "product-gate0-sentinel-v356",
      value: "товарный кандидат не менять",
      source: "manual",
      status: "confirmed"
    }];
    const pageSource = g3ProductJourneyPageSource(product);
    if (!pageSource.row) throw new Error("Product Gate 1 page fixture is missing");
    const productMiddle = guruGate1MiddleRecordV257(pageSource.row, true);
    productMiddle.keywords = [{
      id: "product-middle-sentinel-v356",
      value: "товарный middle кандидат не менять",
      source: "manual",
      status: "confirmed"
    }];
    const productPain = guruGate1FinalPainContextV259(product, true);
    if (!productPain?.itemData)
      throw new Error("Product Gate 1 demand fixture is missing");
    productPain.itemData.demandRows = [{
      id: "product-demand-sentinel-v356",
      kw: "товарный кандидат не менять",
      vol: "901",
      queryCount: "902",
      forecastClicks: "903",
      clickPrice: "904",
      bid: "905",
      forecastBudget: "906",
      originStage: "gate1"
    }];
    productPain.itemData.finalKeywordFoundationV259 = {
      unmatched: [{ phrase: "товарная служебная строка", reason: "smoke" }],
      last_import: { file: "product-sentinel.csv", matched: 1 }
    };

    const record = guruCompanyKeywordFoundationRecordV351(state, true);
    record.keywords = [
      { id: "company-candidate-a", value: "Коричное яблоко", source: "manual", status: "confirmed" },
      { id: "company-candidate-b", value: "купить коричное яблоко", source: "generated", status: "confirmed" },
      { id: "company-candidate-draft", value: "черновая компанийная фраза", source: "generated", status: "draft" },
      { id: "company-candidate-duplicate", value: "  КОРИЧНОЕ ЯБЛОКО  ", source: "imported", status: "confirmed" }
    ];
    const company = gate1CompanySemanticsV264(state);
    delete company.demandRows;
    delete company.archivedDemandRows;
    delete company.brandDemandMetricsImportV356;

    window.__productKeywordBytesV356 = () => {
      const gate1Middle = [];
      (state?.gates || []).forEach((gate, gateIndex) =>
        (gate?.cards || []).forEach((card, cardIndex) =>
          (card?.pageRows || []).forEach((row, rowIndex) => {
            const fields = row?.contextFields;
            if (!fields || !Object.prototype.hasOwnProperty.call(
              fields,
              "productKeywordFoundationMiddleV257",
            )) return;
            gate1Middle.push({
              gateIndex,
              gateId: gate?.id,
              cardIndex,
              cardId: card?.id,
              rowIndex,
              rowId: row?.id,
              productId: row?.catalogItemIdV189,
              record: fields.productKeywordFoundationMiddleV257,
            });
          })));
      const demand = [];
      (state?.painV130?.productMaps || []).forEach((map, mapIndex) =>
        Object.entries(map?.items || {}).forEach(([productId, item]) => {
          demand.push({
            mapIndex,
            mapProductId: map?.product_id,
            productId,
            demandRowsPresent: Boolean(
              item && Object.prototype.hasOwnProperty.call(item, "demandRows"),
            ),
            demandRows: item?.demandRows,
            importStatePresent: Boolean(
              item && Object.prototype.hasOwnProperty.call(
                item,
                "finalKeywordFoundationV259",
              ),
            ),
            finalKeywordFoundationV259: item?.finalKeywordFoundationV259,
          });
        }));
      return JSON.stringify({
        gate0: (state?.project?.gate0ScopedValuesV194 || []).filter(
          (entry) => entry?.field === "keyword_foundation" &&
            entry?.scope === "product",
        ),
        gate1Middle,
        demand,
      });
    };

    activeGateId = "gate-1";
    getGate1AccordionState().subblocks.pain_jtbd_offer = true;
    renderGate();
    const root = document.querySelector("[data-pv181-company-demand-v345]");
    if (!root) throw new Error("Company demand UI is missing");
    const keywords = [...root.querySelectorAll(
      "[data-pv181-company-demand-keyword-v345]"
    )].map((node) => node.textContent.trim());
    saveState();
    const productScopeBefore = window.__productKeywordBytesV356();
    return {
      keywords,
      duplicateWarning: root.querySelector(
        "[data-pv181-company-demand-duplicates-v345]"
      )?.textContent.trim() || "",
      editableCount: root.querySelectorAll(
        "[data-pv181-company-demand-input-v345]"
      ).length,
      kwControls: root.querySelectorAll(
        "textarea[data-pv181-company-demand-keyword-v345], input[data-pv181-company-demand-keyword-v345]"
      ).length,
      hasRowsAfterRender: Object.prototype.hasOwnProperty.call(company, "demandRows"),
      hasArchiveAfterRender: Object.prototype.hasOwnProperty.call(company, "archivedDemandRows"),
      companyHeading: document.querySelector(
        "[data-gate1-company-demand-positioning-v357] > .g1-section-header .g1-section-title"
      )?.textContent.trim() || "",
      productHeading: document.querySelector(
        '[data-gate1-toggle-section="pain_jtbd_offer"] .g1-section-title'
      )?.textContent.trim() || "",
      productWebmasterHeading: document.querySelector(
        '[data-g1-webmaster-scope-v295="product"] .g1-section-title'
      )?.textContent.trim() || "",
      hasExportButton: Boolean(root.querySelector(
        "[data-pv181-company-demand-export-v356]"
      )),
      hasImportButton: Boolean(root.querySelector(
        "[data-pv181-company-demand-import-v356]"
      )),
      hasFileInput: Boolean(root.querySelector(
        "[data-pv181-company-demand-file-v356]"
      )),
      productScopeBefore,
      productScopeCounts: {
        gate0: JSON.parse(productScopeBefore).gate0.length,
        middle: JSON.parse(productScopeBefore).gate1Middle.length,
        demand: JSON.parse(productScopeBefore).demand.reduce(
          (total, entry) => total + (entry.demandRows?.length || 0),
          0,
        ),
      },
      errors: window.__guruErrors,
    };
  })()`);

  assert(
    initial.keywords.join("|") === "Коричное яблоко|купить коричное яблоко",
    `Gate 1 source is not the unique confirmed company candidates: ${initial.keywords.join("|")}`,
  );
  assert(!initial.keywords.some((value) => value.includes("SMM")), "brandPhrases still feeds company demand");
  assert(!initial.keywords.some((value) => value.includes("черновая")), "Draft foundation candidate entered company demand");
  assert(initial.duplicateWarning.includes("КОРИЧНОЕ ЯБЛОКО"), "Confirmed duplicate warning is missing");
  assert(initial.editableCount === 12 && initial.kwControls === 0, "Company demand editability changed");
  assert(!initial.hasRowsAfterRender && !initial.hasArchiveAfterRender, "Read-only render persisted demand rows");
  assert(
    initial.companyHeading === "Спрос, ценность, позиционирование · Компания",
    `Company heading mismatch: ${initial.companyHeading}`,
  );
  assert(
    initial.productHeading ===
      "Спрос, ценность, позиционирование · Продукт/Услуга",
    `Product heading mismatch: ${initial.productHeading}`,
  );
  assert(
    initial.productWebmasterHeading === "Яндекс Вебмастер · Продукт/Услуга",
    `Product Webmaster heading mismatch: ${initial.productWebmasterHeading}`,
  );
  assert(
    initial.hasExportButton && initial.hasImportButton && initial.hasFileInput,
    "Company CSV controls are missing",
  );
  assert(
    initial.productScopeCounts.gate0 > 0 &&
      initial.productScopeCounts.middle > 0 &&
      initial.productScopeCounts.demand > 0,
    `Product isolation fixture is incomplete: ${JSON.stringify(initial.productScopeCounts)}`,
  );

  const brandIsolation = await evaluate(page, `(() => {
    const input = document.querySelector("[data-gate1-company-brand-v264]");
    input.value = "Новая SMM-фраза\\nЕщё одна SMM-фраза";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    const model = gate1CompanyBrandDemandReconcileV345(state);
    const semantics = g4ProductSemantics("");
    return {
      brandPhrases: gate1CompanySemanticsV264(state).brandPhrases,
      demandKeywords: model.rows.map((row) => row.kw),
      gate4BrandPhrases: semantics.brandPhrases,
    };
  })()`);
  assert(
    brandIsolation.demandKeywords.join("|") === initial.keywords.join("|"),
    "Editing brandPhrases changed the Gate 1 company demand source",
  );
  assert(
    brandIsolation.gate4BrandPhrases.join("|") === "Новая SMM-фраза|Ещё одна SMM-фраза",
    "Gate 4 stopped reading brandPhrases",
  );

  const exactOnly = await evaluate(page, `(() => {
    const company = gate1CompanySemanticsV264(state);
    company.demandRows = [
      {
        id: "legacy-exact-row",
        kw: "  КОРИЧНОЕ ЯБЛОКО  ",
        vol: "100",
        queryCount: "40",
        forecastClicks: "20",
        clickPrice: "10",
        bid: "12",
        forecastBudget: "200"
      },
      {
        id: "legacy-positional-row",
        kw: "совсем другая старая фраза",
        vol: "999",
        queryCount: "999",
        forecastClicks: "999",
        clickPrice: "999",
        bid: "999",
        forecastBudget: "999"
      }
    ];
    company.archivedDemandRows = [];
    const model = gate1CompanyBrandDemandReconcileV345(state, { create: true });
    return {
      rows: structuredClone(model.rows),
      archived: structuredClone(model.archivedRows),
    };
  })()`);
  assert(exactOnly.rows[0].id === "legacy-exact-row", "Normalized exact match did not preserve the legacy row");
  assert(exactOnly.rows[0].vol === "100", "Normalized exact match lost metrics");
  assert(exactOnly.rows[0].candidate_id === "company-candidate-a", "Exact match was not bound to stable candidate_id");
  assert(exactOnly.rows[1].id !== "legacy-positional-row", "Positional fallback is still active");
  assert(exactOnly.rows[1].vol === "", "A nonmatching row leaked metrics by position");
  assert(
    exactOnly.archived.some((row) =>
      row.id === "legacy-positional-row" &&
      row.archivedReason === "removed_from_company_keyword_foundation"
    ),
    "Unmatched legacy row was not archived",
  );

  const stableIdAndNoPosition = await evaluate(page, `(() => {
    const company = gate1CompanySemanticsV264(state);
    let record = guruCompanyKeywordFoundationRecordV351(state, false);
    record.keywords.find((entry) => entry.id === "company-candidate-a").value =
      "Коричное яблоко официальный сайт";
    record.keywords.find((entry) => entry.id === "company-candidate-duplicate").value =
      "  КОРИЧНОЕ ЯБЛОКО ОФИЦИАЛЬНЫЙ САЙТ  ";
    let model = gate1CompanyBrandDemandReconcileV345(state, { create: true });
    const renamed = structuredClone(model.rows.find((row) =>
      row.candidate_id === "company-candidate-a"
    ));
    const oldB = model.rows.find((row) => row.candidate_id === "company-candidate-b");
    oldB.vol = "222";
    oldB.queryCount = "22";
    record = guruCompanyKeywordFoundationRecordV351(state, false);
    const indexB = record.keywords.findIndex((entry) => entry.id === "company-candidate-b");
    record.keywords[indexB] = {
      id: "company-candidate-new-same-position",
      value: "новая фраза на той же позиции",
      source: "manual",
      status: "confirmed"
    };
    model = gate1CompanyBrandDemandReconcileV345(state, { create: true });
    const replacement = model.rows.find((row) =>
      row.candidate_id === "company-candidate-new-same-position"
    );
    const archivedB = model.archivedRows.find((row) =>
      row.candidate_id === "company-candidate-b"
    );
    saveState();
    return {
      renamed,
      replacement: structuredClone(replacement),
      archivedB: structuredClone(archivedB),
      active: structuredClone(model.rows),
      archived: structuredClone(model.archivedRows),
      productScopeAfter: window.__productKeywordBytesV356(),
    };
  })()`);
  assert(
    stableIdAndNoPosition.renamed.id === "legacy-exact-row" &&
      stableIdAndNoPosition.renamed.vol === "100" &&
      stableIdAndNoPosition.renamed.kw === "Коричное яблоко официальный сайт",
    "Stable candidate_id did not preserve metrics after a future text edit",
  );
  assert(
    stableIdAndNoPosition.replacement.vol === "" &&
      stableIdAndNoPosition.replacement.id !== exactOnly.rows[1].id,
    "A replacement candidate inherited metrics or row ID from the same position",
  );
  assert(
    stableIdAndNoPosition.archivedB?.vol === "222" &&
      stableIdAndNoPosition.archivedB?.archivedReason ===
        "removed_from_company_keyword_foundation",
    "Replaced candidate metrics were not archived",
  );
  assert(
    stableIdAndNoPosition.productScopeAfter === initial.productScopeBefore,
    "Company reconciliation changed product keyword/demand data",
  );

  const csvSuite = await evaluate(page, `(() => {
    const record = guruCompanyKeywordFoundationRecordV351(state, false);
    const company = gate1CompanySemanticsV264(state);
    const modelBefore = gate1CompanyBrandDemandReconcileV345(state, {
      create: true,
    });
    const candidatesBefore = JSON.stringify(record.keywords);
    const identitiesBefore = JSON.stringify(modelBefore.rows.map((row) => ({
      id: row.id,
      kw: row.kw,
      candidate_id: row.candidate_id,
    })));
    const archivedBefore = JSON.stringify(modelBefore.archivedRows);
    const rowCountBefore = modelBefore.rows.length;
    const productBefore = window.__productKeywordBytesV356();

    const exportEntries = gate1CompanyBrandDemandExportEntriesV356(state);
    const exportCsv = guruGate1FinalMetricsCsvV279(exportEntries);
    const exportRows = guruV248ParseCsvRows(exportCsv, ",");
    const exportFileName = gate1CompanyBrandDemandFileNameV356(state);

    const fullCsv = guruGate1FinalMetricsCsvV279([
      { demandRow: {
        kw: "Коричное яблоко официальный сайт",
        vol: "101",
        queryCount: "102",
        forecastClicks: "103",
        clickPrice: "104",
        bid: "105",
        forecastBudget: "106",
      } },
      { demandRow: {
        kw: "новая фраза на той же позиции",
        vol: "201",
        queryCount: "202",
        forecastClicks: "203",
        clickPrice: "204",
        bid: "205",
        forecastBudget: "206",
      } },
    ]);
    const parsedFull = guruGate1FinalParseMetricsCsvV259(fullCsv);
    const fullResult = gate1CompanyBrandDemandApplyParsedRowsV356(
      parsedFull,
      "company-full.csv",
      state,
    );
    const fullMetrics = Object.fromEntries(fullResult.rows.map((row) => [
      row.candidate_id,
      {
        vol: row.vol,
        queryCount: row.queryCount,
        forecastClicks: row.forecastClicks,
        clickPrice: row.clickPrice,
        bid: row.bid,
        forecastBudget: row.forecastBudget,
      },
    ]));

    const partialCsv =
      "Ключевое слово,Примерное количество запросов\\r\\n" +
      "Коричное яблоко официальный сайт,777";
    const parsedPartial = guruGate1FinalParseMetricsCsvV259(partialCsv);
    const partialResult = gate1CompanyBrandDemandApplyParsedRowsV356(
      parsedPartial,
      "company-partial.csv",
      state,
    );
    const partialRow = structuredClone(partialResult.rows.find((row) =>
      row.candidate_id === "company-candidate-a"
    ));

    const duplicateCsv =
      "Ключевое слово,Примерное количество запросов\\r\\n" +
      "Коричное яблоко официальный сайт,888\\r\\n" +
      "  КОРИЧНОЕ ЯБЛОКО ОФИЦИАЛЬНЫЙ САЙТ  ,999";
    const parsedDuplicate = guruGate1FinalParseMetricsCsvV259(duplicateCsv);
    const duplicateResult = gate1CompanyBrandDemandApplyParsedRowsV356(
      parsedDuplicate,
      "company-duplicate.csv",
      state,
    );
    const duplicateRow = structuredClone(duplicateResult.rows.find((row) =>
      row.candidate_id === "company-candidate-a"
    ));

    const unmatchedCsv =
      "Ключевое слово,Примерное количество запросов\\r\\n" +
      "совершенно неизвестная фраза,301\\r\\n" +
      "черновая компанийная фраза,302\\r\\n" +
      "купить коричное яблоко,303";
    const parsedUnmatched = guruGate1FinalParseMetricsCsvV259(unmatchedCsv);
    const unmatchedResult = gate1CompanyBrandDemandApplyParsedRowsV356(
      parsedUnmatched,
      "company-unmatched.csv",
      state,
    );
    const finalModel = gate1CompanyBrandDemandReconcileV345(state);
    const importState = gate1CompanyBrandDemandImportStateV356(state, false);
    gate1CompanyBrandDemandRefreshV345({ preserveOpen: true });
    const root = document.querySelector("[data-pv181-company-demand-v345]");
    const productAfter = window.__productKeywordBytesV356();
    saveState();
    return {
      exportFileName,
      exportCsv,
      exportRows,
      exportEntryCount: exportEntries.length,
      fullParsedCount: parsedFull.rows.length,
      fullMatched: fullResult.matched,
      fullUnmatched: fullResult.unmatchedCount,
      fullMetrics,
      partialMatched: partialResult.matched,
      partialUnmatched: partialResult.unmatchedCount,
      partialRow,
      duplicateParsedCount: parsedDuplicate.rows.length,
      duplicateMatched: duplicateResult.matched,
      duplicateRow,
      unmatchedCount: unmatchedResult.unmatchedCount,
      unmatchedPhrases: unmatchedResult.unmatched.map((row) => row.phrase),
      candidatesUnchanged: JSON.stringify(record.keywords) === candidatesBefore,
      identitiesUnchanged: JSON.stringify(finalModel.rows.map((row) => ({
        id: row.id,
        kw: row.kw,
        candidate_id: row.candidate_id,
      }))) === identitiesBefore,
      archivesUnchanged: JSON.stringify(finalModel.archivedRows) === archivedBefore,
      rowCountBefore,
      rowCountAfter: finalModel.rows.length,
      candidateCountBefore: JSON.parse(candidatesBefore).length,
      candidateCountAfter: record.keywords.length,
      importState: structuredClone(importState),
      unmatchedUiText: root.querySelector(
        "[data-pv181-company-demand-unmatched-v356]"
      )?.textContent.trim() || "",
      lastImportUiText: root.querySelector(
        "[data-pv181-company-demand-last-import-v356]"
      )?.textContent.trim() || "",
      productUnchanged: productBefore === productAfter,
      productBytesBefore: new TextEncoder().encode(productBefore).byteLength,
      productBytesAfter: new TextEncoder().encode(productAfter).byteLength,
      errors: window.__guruErrors,
    };
  })()`);

  assert(csvSuite.exportFileName.startsWith("brand-demand-company-"),
    `Company export filename mismatch: ${csvSuite.exportFileName}`);
  assert(csvSuite.exportFileName.endsWith(".csv"),
    `Company export extension mismatch: ${csvSuite.exportFileName}`);
  assert(
    csvSuite.exportRows.length === 3 && csvSuite.exportEntryCount === 2,
    `Export must contain one header and two current confirmed phrases: ${csvSuite.exportCsv}`,
  );
  assert(
    csvSuite.exportRows.every((row) => row.length === 7),
    `Company export does not have seven columns: ${JSON.stringify(csvSuite.exportRows)}`,
  );
  assert(
    csvSuite.exportRows[0].join("|") === [
      "Ключевое слово",
      "Объём показов/мес",
      "Примерное количество запросов",
      "Переходы/мес",
      "Цена клика, руб.",
      "Ставка, руб.",
      "Примерный бюджет, руб.",
    ].join("|"),
    `Company export header mismatch: ${csvSuite.exportRows[0].join("|")}`,
  );
  assert(
    csvSuite.exportRows.slice(1).map((row) => row[0]).join("|") ===
      "Коричное яблоко официальный сайт|новая фраза на той же позиции",
    `Export leaked draft, duplicate, archived or SMM phrases: ${csvSuite.exportCsv}`,
  );
  assert(
    csvSuite.fullParsedCount === 2 &&
      csvSuite.fullMatched === 2 &&
      csvSuite.fullUnmatched === 0,
    `Full company CSV import mismatch: ${JSON.stringify(csvSuite)}`,
  );
  assert(
    JSON.stringify(csvSuite.fullMetrics["company-candidate-a"]) ===
      JSON.stringify({
        vol: "101",
        queryCount: "102",
        forecastClicks: "103",
        clickPrice: "104",
        bid: "105",
        forecastBudget: "106",
      }) &&
      JSON.stringify(csvSuite.fullMetrics["company-candidate-new-same-position"]) ===
        JSON.stringify({
          vol: "201",
          queryCount: "202",
          forecastClicks: "203",
          clickPrice: "204",
          bid: "205",
          forecastBudget: "206",
        }),
    `Full import did not update all six metrics: ${JSON.stringify(csvSuite.fullMetrics)}`,
  );
  assert(
    csvSuite.partialMatched === 1 && csvSuite.partialUnmatched === 0 &&
      csvSuite.partialRow.vol === "101" &&
      csvSuite.partialRow.queryCount === "777" &&
      csvSuite.partialRow.forecastClicks === "103" &&
      csvSuite.partialRow.clickPrice === "104" &&
      csvSuite.partialRow.bid === "105" &&
      csvSuite.partialRow.forecastBudget === "106",
    `Partial CSV erased an absent metric: ${JSON.stringify(csvSuite.partialRow)}`,
  );
  assert(
    csvSuite.duplicateParsedCount === 1 &&
      csvSuite.duplicateMatched === 1 &&
      csvSuite.duplicateRow.queryCount === "888",
    `Duplicate CSV rows are not first-only: ${JSON.stringify(csvSuite.duplicateRow)}`,
  );
  assert(
    csvSuite.unmatchedCount === 3 &&
      csvSuite.unmatchedPhrases.join("|") ===
        "совершенно неизвестная фраза|черновая компанийная фраза|купить коричное яблоко",
    `Unknown, draft and archived phrases were not unmatched: ${csvSuite.unmatchedPhrases.join("|")}`,
  );
  assert(
    csvSuite.candidatesUnchanged && csvSuite.identitiesUnchanged &&
      csvSuite.archivesUnchanged &&
      csvSuite.rowCountAfter === csvSuite.rowCountBefore &&
      csvSuite.candidateCountAfter === csvSuite.candidateCountBefore,
    "Company import changed candidates, row identities, archives or row count",
  );
  assert(
    csvSuite.lastImportUiText.includes("обновлено 0") &&
      csvSuite.lastImportUiText.includes("не сопоставлено 3") &&
      csvSuite.unmatchedUiText.includes("Не сопоставлено: 3"),
    `Company import result is missing in UI: ${csvSuite.lastImportUiText} / ${csvSuite.unmatchedUiText}`,
  );
  assert(
    csvSuite.productUnchanged &&
      csvSuite.productBytesBefore === csvSuite.productBytesAfter,
    `Company CSV changed product data bytes: ${csvSuite.productBytesBefore} -> ${csvSuite.productBytesAfter}`,
  );
  assert(csvSuite.errors.length === 0,
    `Browser errors during CSV suite: ${csvSuite.errors.join(" | ")}`);

  const projectSwitchGuard = await evaluate(page, `(async () => {
    const input = document.querySelector(
      "[data-pv181-company-demand-file-v356]",
    );
    if (!input) throw new Error("Company demand file input is missing");
    const parsed = guruGate1FinalParseMetricsCsvV259(
      "Ключевое слово,Примерное количество запросов\\r\\n" +
      "Коричное яблоко официальный сайт,444",
    );
    const originalWorkspace = state;
    const originalProjectId = activeProjectId;
    const otherWorkspace = structuredClone(originalWorkspace);
    otherWorkspace.project.id = "project-switch-race-v356";
    otherWorkspace.project.name = "Project switch race target";
    const originalBefore = JSON.stringify(originalWorkspace);
    const otherBefore = JSON.stringify(otherWorkspace);
    const previousReader = guruGate1FinalReadMetricsFileV260;
    const previousApply = gate1CompanyBrandDemandApplyParsedRowsV356;
    const previousSave = saveState;
    const previousAlert = window.alert;
    let releaseReader = null;
    let applyCalls = 0;
    let saveCalls = 0;
    const alerts = [];
    guruGate1FinalReadMetricsFileV260 = () => new Promise((resolve) => {
      releaseReader = () => resolve(parsed);
    });
    gate1CompanyBrandDemandApplyParsedRowsV356 = (...args) => {
      applyCalls += 1;
      return previousApply(...args);
    };
    saveState = (...args) => {
      saveCalls += 1;
      return previousSave(...args);
    };
    window.alert = (message) => alerts.push(String(message || ""));
    const file = new File(
      ["delayed company import"],
      "company-project-switch.csv",
      { type: "text/csv" },
    );
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [file],
    });
    try {
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await Promise.resolve();
      if (!releaseReader)
        throw new Error("Delayed company CSV reader was not called");
      state = otherWorkspace;
      activeProjectId = otherWorkspace.project.id;
      releaseReader();
      for (let index = 0; index < 20 && !alerts.length; index += 1)
        await new Promise((resolve) => setTimeout(resolve, 0));
      return {
        applyCalls,
        saveCalls,
        alerts,
        originalUnchanged: JSON.stringify(originalWorkspace) === originalBefore,
        otherUnchanged: JSON.stringify(otherWorkspace) === otherBefore,
      };
    } finally {
      state = originalWorkspace;
      activeProjectId = originalProjectId;
      guruGate1FinalReadMetricsFileV260 = previousReader;
      gate1CompanyBrandDemandApplyParsedRowsV356 = previousApply;
      saveState = previousSave;
      window.alert = previousAlert;
    }
  })()`);
  assert(
    projectSwitchGuard.applyCalls === 0 && projectSwitchGuard.saveCalls === 0,
    `Project-switch guard allowed apply/save: ${JSON.stringify(projectSwitchGuard)}`,
  );
  assert(
    projectSwitchGuard.originalUnchanged && projectSwitchGuard.otherUnchanged,
    `Project-switch import mutated a workspace: ${JSON.stringify(projectSwitchGuard)}`,
  );
  assert(
    projectSwitchGuard.alerts.length === 1 &&
      projectSwitchGuard.alerts[0].includes("переключён проект") &&
      projectSwitchGuard.alerts[0].includes("Импорт отменён"),
    `Project-switch cancellation message mismatch: ${projectSwitchGuard.alerts.join(" | ")}`,
  );

  await evaluate(page, "location.reload(); true");
  await waitFor(
    page,
    'typeof state !== "undefined" && Boolean(state) && activeProjectId === ' +
      JSON.stringify(projectId),
  );
  const afterReload = await evaluate(page, `(() => {
    window.__productKeywordBytesV356 = () => {
      const gate1Middle = [];
      (state?.gates || []).forEach((gate, gateIndex) =>
        (gate?.cards || []).forEach((card, cardIndex) =>
          (card?.pageRows || []).forEach((row, rowIndex) => {
            const fields = row?.contextFields;
            if (!fields || !Object.prototype.hasOwnProperty.call(
              fields,
              "productKeywordFoundationMiddleV257",
            )) return;
            gate1Middle.push({
              gateIndex,
              gateId: gate?.id,
              cardIndex,
              cardId: card?.id,
              rowIndex,
              rowId: row?.id,
              productId: row?.catalogItemIdV189,
              record: fields.productKeywordFoundationMiddleV257,
            });
          })));
      const demand = [];
      (state?.painV130?.productMaps || []).forEach((map, mapIndex) =>
        Object.entries(map?.items || {}).forEach(([productId, item]) => {
          demand.push({
            mapIndex,
            mapProductId: map?.product_id,
            productId,
            demandRowsPresent: Boolean(
              item && Object.prototype.hasOwnProperty.call(item, "demandRows"),
            ),
            demandRows: item?.demandRows,
            importStatePresent: Boolean(
              item && Object.prototype.hasOwnProperty.call(
                item,
                "finalKeywordFoundationV259",
              ),
            ),
            finalKeywordFoundationV259: item?.finalKeywordFoundationV259,
          });
        }));
      return JSON.stringify({
        gate0: (state?.project?.gate0ScopedValuesV194 || []).filter(
          (entry) => entry?.field === "keyword_foundation" &&
            entry?.scope === "product",
        ),
        gate1Middle,
        demand,
      });
    };
    activeGateId = "gate-1";
    getGate1AccordionState().subblocks.pain_jtbd_offer = true;
    renderGate();
    const company = gate1CompanySemanticsV264(state);
    const importState = gate1CompanyBrandDemandImportStateV356(state, false);
    const rowsByCandidate = Object.fromEntries((company.demandRows || []).map(
      (row) => [row.candidate_id, structuredClone(row)],
    ));
    return {
      rows: structuredClone(company.demandRows || []),
      archived: structuredClone(company.archivedDemandRows || []),
      rowsByCandidate,
      rendered: [...document.querySelectorAll(
        "[data-pv181-company-demand-keyword-v345]"
      )].map((node) => node.textContent.trim()),
      brandPhrases: company.brandPhrases,
      importState: structuredClone(importState),
      unmatchedUiText: document.querySelector(
        "[data-pv181-company-demand-unmatched-v356]"
      )?.textContent.trim() || "",
      lastImportUiText: document.querySelector(
        "[data-pv181-company-demand-last-import-v356]"
      )?.textContent.trim() || "",
      companyHeading: document.querySelector(
        "[data-gate1-company-demand-positioning-v357] > .g1-section-header .g1-section-title"
      )?.textContent.trim() || "",
      productHeading: document.querySelector(
        '[data-gate1-toggle-section="pain_jtbd_offer"] .g1-section-title'
      )?.textContent.trim() || "",
      productWebmasterHeading: document.querySelector(
        '[data-g1-webmaster-scope-v295="product"] .g1-section-title'
      )?.textContent.trim() || "",
      productScopeAfterReload: window.__productKeywordBytesV356(),
      errors: window.__guruErrors,
    };
  })()`);
  console.log(JSON.stringify({
    initial,
    brandIsolation,
    exactOnly,
    stableIdAndNoPosition,
    csvSuite,
    projectSwitchGuard,
    afterReload,
  }, null, 2));
  assert(afterReload.rows.length === 2, "Active company demand rows did not persist");
  assert(afterReload.archived.length === 2, "Archived unmatched rows did not persist");
  assert(
    afterReload.rendered.join("|") ===
      "Коричное яблоко официальный сайт|новая фраза на той же позиции",
    "Reloaded table is not driven by current confirmed candidates",
  );
  assert(
    afterReload.brandPhrases === "Новая SMM-фраза\nЕщё одна SMM-фраза",
    "brandPhrases changed while switching the demand source",
  );
  assert(
    afterReload.rowsByCandidate["company-candidate-a"]?.vol === "101" &&
      afterReload.rowsByCandidate["company-candidate-a"]?.queryCount === "888" &&
      afterReload.rowsByCandidate["company-candidate-a"]?.forecastClicks === "103" &&
      afterReload.rowsByCandidate["company-candidate-a"]?.clickPrice === "104" &&
      afterReload.rowsByCandidate["company-candidate-a"]?.bid === "105" &&
      afterReload.rowsByCandidate["company-candidate-a"]?.forecastBudget === "106" &&
      afterReload.rowsByCandidate[
        "company-candidate-new-same-position"
      ]?.forecastBudget === "206",
    `Imported metrics did not survive hard reload: ${JSON.stringify(afterReload.rowsByCandidate)}`,
  );
  assert(
    afterReload.importState?.last_import?.file === "company-unmatched.csv" &&
      afterReload.importState?.last_import?.unmatched === 3 &&
      afterReload.importState?.unmatched?.length === 3 &&
      afterReload.lastImportUiText.includes("не сопоставлено 3") &&
      afterReload.unmatchedUiText.includes("Не сопоставлено: 3"),
    "Company import report did not survive hard reload",
  );
  assert(
    afterReload.companyHeading === initial.companyHeading &&
      afterReload.productHeading === initial.productHeading &&
      afterReload.productWebmasterHeading === initial.productWebmasterHeading,
    "Renamed Gate 1 headings changed after hard reload",
  );
  assert(
    afterReload.productScopeAfterReload === initial.productScopeBefore,
    "Company CSV changed product Gate 0/Gate 1 candidate or demand bytes after hard reload",
  );
  assert(afterReload.errors.length === 0, `Browser errors: ${afterReload.errors.join(" | ")}`);

  console.log("gate1 company brand demand smoke: OK");
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  browser.close();
}
