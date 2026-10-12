import { readFile } from "node:fs/promises";

const sourceExportPath =
  process.env.GURU_GATE1_SOURCE_EXPORT ||
  "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const forecastPath =
  process.env.GURU_GATE1_FORECAST_XLS ||
  "/Users/vl/Downloads/forecast.7110.xls";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9349";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate1-final-keyword-foundation-smoke";
const goatId = "catalog-item-1786792591872-51f503";
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
  throw new Error(`Timed out waiting for: ${expression}`);
}

const payload = JSON.parse(await readFile(sourceExportPath, "utf8"));
const source = payload.workspace || payload.content;
assert(source?.project, "Workspace missing in fixture");
const sourceGate0Landings = source.gates
  ?.find((gate) => gate.id === "gate-0")
  ?.cards?.find((card) => card.id === "card-7")
  ?.megaMarketing?.platformV2?.landings;
assert(
  sourceGate0Landings && Object.keys(sourceGate0Landings).length === 6,
  "Expected six Gate 0 direction landings in fixture",
);
const xlsxBrowserSource = await readFile(
  new URL("../node_modules/xlsx/dist/xlsx.full.min.js", import.meta.url),
  "utf8",
);
const forecastBase64 = (await readFile(forecastPath)).toString("base64");

let browser;
let page;
try {
  const browserVersion = await (
    await fetch(`http://127.0.0.1:${debugPort}/json/version`)
  ).json();
  browser = new CdpClient(browserVersion.webSocketDebuggerUrl);
  await browser.ready;
  const { targetId } = await browser.call("Target.createTarget", {
    url: "about:blank",
  });
  const targets = await (
    await fetch(`http://127.0.0.1:${debugPort}/json`)
  ).json();
  const target = targets.find((candidate) => candidate.id === targetId);
  assert(target?.webSocketDebuggerUrl, "Chrome target missing");
  page = new CdpClient(target.webSocketDebuggerUrl);
  await page.ready;
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1600,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
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
  await page.call("Page.addScriptToEvaluateOnNewDocument", {
    source: xlsxBrowserSource,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(page, 'typeof bootstrapAppOnce === "function"');
  await waitFor(page, 'Boolean(window.XLSX)');

  const fixture = structuredClone(source);
  fixture.project = { ...fixture.project, id: projectId };
  const fixtureMaps = fixture.painV130?.productMaps || [];
  assert(fixtureMaps.length >= 2, "Direction maps missing in fixture");
  fixtureMaps[0].semL1 = ["бренд альфа", "общий дубль"];
  fixtureMaps[1].semL1 = ["общий дубль", "бренд бета"];
  await evaluate(
    page,
    `(() => {
      localStorage.clear();
      localStorage.setItem("guru-platform-access-v01", "unlocked");
      localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
        id: ${JSON.stringify(projectId)},
        name: "Gate 1 final keyword foundation smoke",
        lifecycleStatus: "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }]));
      localStorage.setItem(
        WORKSPACE_STORAGE_PREFIX + ${JSON.stringify(projectId)},
        ${JSON.stringify(JSON.stringify(fixture))}
      );
      location.reload();
      return true;
    })()`,
  );
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(
    page,
    `document.querySelector('[data-open-project="${projectId}"]')`,
  );
  await evaluate(
    page,
    `document.querySelector('[data-open-project="${projectId}"]').click(); true`,
  );
  await waitFor(
    page,
    `activeProjectId === ${JSON.stringify(projectId)} && Boolean(state)`,
  );
  await wait(700);

  const result = await evaluate(
    page,
    `(async () => {
      scheduleCloudSync = () => {};
      scheduleProjectsCloudSync = () => {};
      const product = guruV194Product(${JSON.stringify(goatId)}, state);
      if (!product) throw new Error("Goat product missing");
      const ui = guruV194Ui(state);
      ui.selectedCategoryId = product.categoryId;
      ui.selectedProductId = product.id;
      const gate0LandingsBefore = JSON.stringify(
        g3Gate0Marketing().platformV2.landings,
      );

      const forecastBinary = atob(${JSON.stringify(forecastBase64)});
      const forecastBytes = Uint8Array.from(
        forecastBinary,
        (character) => character.charCodeAt(0),
      );
      const forecastFile = new File(
        [forecastBytes],
        "forecast.7110.xls",
        { type: "application/vnd.ms-excel" },
      );
      const parsedXls = await guruGate1FinalReadMetricsFileV260(forecastFile);

      /* Исторический экспорт проекта продолжает пополняться реальными
         фразами и JTBD-назначениями. Smoke проверяет фиксированный набор из
         forecast.7110.xls, поэтому изолируем именно его до любых UI-проверок:
         так старые данные проекта не меняют ожидаемые счётчики, порядок и
         состав picker между запусками. */
      const isolatedPain = guruGate1FinalPainContextV259(product, true).itemData;
      isolatedPain.demandRows = parsedXls.rows.map((row) => ({
        kw: row.phrase,
        originStage: "gate1",
      }));
      isolatedPain.semL3Groups = [{ mainQuery: "", keywords: [] }];
      isolatedPain.semL3 = [""];
      isolatedPain.semL3GroupingDraftsV266 = [];
      isolatedPain.semL3GroupingMetaV266 = null;
      isolatedPain.jtbdKeywordAssignmentsV274 = {};
      isolatedPain.semL4Model.additionalJtbds = [];
      pv181SyncJtbdModel(isolatedPain);

      const gate0 = guruV247KeywordFoundationRecord(product, true, state);
      gate0.keywords = [
        ...parsedXls.rows.slice(0, 10).map((row) =>
          guruV247KeywordEntry({ value: row.phrase, source: "generated", status: "confirmed" }),
        ),
        guruV247KeywordEntry({ value: "черновая фраза", source: "generated", status: "draft" }),
      ];
      const pageSource = g3ProductJourneyPageSource(product);
      if (!pageSource.row) throw new Error("Goat Gate 1 page missing");
      const middle = guruGate1MiddleRecordV257(pageSource.row, true);
      middle.keywords = [
        ...parsedXls.rows.slice(10).map((row) =>
          guruV247KeywordEntry({ value: row.phrase, source: "imported", status: "confirmed" }),
        ),
        guruV247KeywordEntry({ value: "середина черновик", source: "generated", status: "draft" }),
      ];

      let jtbdRecord = guruV194ExactRecords("jtbd", "product", product, state)[0];
      if (!jtbdRecord) {
        jtbdRecord = {
          id: makeId("gate0-value"),
          ...guruV194RecordLocation("product", product),
          field: "jtbd",
          value: "Первый живой JTBD",
          source: { type: "manual", label: "Smoke" },
          confirmation_status: "confirmed",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        guruV194Records(state).push(jtbdRecord);
      } else jtbdRecord.value = "Первый живой JTBD";

      guruNavigateToGate("gate-1");
      getGate1AccordionState().subblocks.pain_jtbd_offer = true;
      renderGate();
      const finalBlock = document.querySelector("[data-gate1-final-foundation-v259]");
      const directProduct = document.querySelector('[data-gate1-direct-product-v265="${goatId}"]');
      const finalBeforeProduct = Boolean(
        finalBlock && directProduct &&
        (finalBlock.compareDocumentPosition(directProduct) & Node.DOCUMENT_POSITION_FOLLOWING)
      );
      const confirmed = guruGate1FinalConfirmedV259(product);
      const exported = guruV248KeywordFoundationCsv(confirmed);
      const csvText =
        "План кампании\\n" +
        "Срок кампании: месяц\\n\\n" +
        "Фраза;Примерное количество запросов;Объём трафика;Примерное количество показов в месяц;Примерное количество переходов в месяц (при выбранном объёме трафика);Средняя списываемая цена клика (при выбранном объёме трафика), руб.;Средняя установленная ставка (при выбранном объёме трафика), руб.;Примерный бюджет, руб. (при выбранном объёме трафика);CTR\\n" +
        "авторская коза;11;100;8;2;3.50;137.40;7.00;4.5%\\n" +
        "Итого;11;100;8;2;3.50;137.40;7.00;4.5%\\n" +
        "Служебное примечание";
      const parsedCsv = guruGate1FinalParseMetricsCsvV259(csvText);
      const parsedTrafficAnomaly = guruGate1FinalParseMetricsCsvV259(
        "Фраза;Объём трафика;Примерное количество показов в месяц\\n" +
        "первая фраза;80;10\\n" +
        "вторая фраза;100;20",
      );
      const appliedResult = guruGate1FinalApplyMetricsV259(
        product,
        parsedXls,
        forecastFile.name,
      );
      const applied = { matched: appliedResult.matched, unmatched: appliedResult.unmatched };
      renderGate();
      const pain = guruGate1FinalPainContextV259(product, false).itemData;
      const orderedFinal = document.querySelector("[data-gate1-final-foundation-v259]");
      const orderedDemand = document.querySelector(".pv181-demand-level-v266");
      const orderedJtbd = document.querySelector(".pv181-jtbd-level");
      const orderedQueries = document.querySelector(".pv181-query-level");
      const jtbdLevelTitle = orderedJtbd
        ?.querySelector(".pv181-query-level-title")?.textContent.trim() || "";
      const queryLevelTitle = orderedQueries
        ?.querySelector(".pv181-query-level-title")?.textContent.trim() || "";
      const queryRudimentAbsent = !orderedQueries && !document.querySelector(
        "[data-pv181-query-group-add], [data-pv181-grouping-suggest-v266], " +
        "[data-pv181-main-query], [data-pv181-query-keyword], " +
        "[data-gate1-final-picker-v259]",
      );
      const requiredBlockOrder = Boolean(
        orderedFinal && orderedDemand && orderedJtbd &&
        (orderedFinal.compareDocumentPosition(orderedDemand) & Node.DOCUMENT_POSITION_FOLLOWING) &&
        (orderedDemand.compareDocumentPosition(orderedJtbd) & Node.DOCUMENT_POSITION_FOLLOWING)
      );
      const groupsBeforeSuggest = structuredClone(pain.semL3Groups);
      const mirrorBeforeSuggest = structuredClone(pain.semL3);
      const groupingSuggestion = guruGate1SuggestGroupingV266(pain, product.id);
      guruGate1RecordGroupingRunV266(
        { itemData: pain, itemId: product.id, mapIndex: 0 },
        groupingSuggestion,
      );
      const groupingContextAfterSuggest = guruGate1FinalPainContextV259(product, false);
      const draftsAfterSuggest = structuredClone(
        groupingContextAfterSuggest.itemData.semL3GroupingDraftsV266 || [],
      );
      const activeGroupsUnchangedBySuggest =
        JSON.stringify(groupingContextAfterSuggest.itemData.semL3Groups) ===
          JSON.stringify(groupsBeforeSuggest) &&
        JSON.stringify(groupingContextAfterSuggest.itemData.semL3) ===
          JSON.stringify(mirrorBeforeSuggest);
      renderGate();
      const draftDomCount = document.querySelectorAll(
        "[data-pv181-grouping-draft-v266]",
      ).length;
      const confirmAllVisible = Boolean(
        document.querySelector("[data-pv181-grouping-confirm-all-v266]"),
      );
      const allDraftsInactive = draftsAfterSuggest.every(
        (draft) => draft.status === "draft",
      );
      const draftMainsAreMostFrequent = draftsAfterSuggest.every((draft) => {
        const main = draft.phrases.find((phrase) => phrase.value === draft.mainQuery);
        const maximum = Math.max(...draft.phrases.map((phrase) => phrase.queryCount ?? -Infinity));
        return main && (main.queryCount ?? -Infinity) === maximum;
      });
      const firstDraft = draftsAfterSuggest[0] || null;
      if (!firstDraft) throw new Error("Grouping algorithm did not create a draft");
      if (!guruGate1ConfirmGroupingDraftV266(pain, firstDraft))
        throw new Error("Grouping draft could not be confirmed through the data helper");
      pain.semL3GroupingDraftsV266 = draftsAfterSuggest.filter(
        (draft) => draft.id !== firstDraft.id,
      );
      renderGate();
      const groupingContextAfterConfirm = guruGate1FinalPainContextV259(product, false);
      const groupsAfterConfirm = groupingContextAfterConfirm.itemData.semL3Groups;
      const existingGroupsPreserved =
        JSON.stringify(groupsAfterConfirm.slice(0, groupsBeforeSuggest.length)) ===
        JSON.stringify(groupsBeforeSuggest);
      const confirmedDraftGroup = groupsAfterConfirm.at(-1);
      const confirmedGroupEditable = Boolean(
        document.querySelector(
          '[data-pv181-query-group="' + (groupsAfterConfirm.length - 1) + '"][data-pv181-main-query]',
        ),
      );
      const demand = pain.demandRows.filter((row) => row.originStage !== "gate4" && row.kw).map((row) => ({
        kw: row.kw,
        vol: row.vol,
        queryCount: row.queryCount,
        forecastClicks: row.forecastClicks,
        clickPrice: row.clickPrice,
        bid: row.bid,
        forecastBudget: row.forecastBudget,
        originStage: row.originStage,
      }));
      const authorGoat = demand.find((row) => row.kw === "авторская коза") || null;
      const v277PhraseNames = [
        "коза ручной работы",
        "авторская коза",
        "интерьерная игрушка коза",
        "текстильная коза",
      ];
      const v277Entries = v277PhraseNames.map((phrase) => {
        const index = pain.demandRows.findIndex((row) => row.kw === phrase);
        return { demandRow: pain.demandRows[index], index };
      }).filter((entry) => entry.demandRow);
      if (v277Entries.length !== 4) throw new Error("V277 Goat benchmark phrases missing");
      const v277PageSource = g3ProductJourneyPageSource(product);
      v277PageSource.row.contextFields = v277PageSource.row.contextFields || {};
      const v277PriceBefore = v277PageSource.row.contextFields.productPrice;
      v277PageSource.row.contextFields.productPrice = "4 900";
      const v277Benchmark = guruGate1GroupBenchmarksV277(v277Entries, product.id);
      const v277ExpectedWeighted = (field) => {
        const weighted = v277Entries.reduce((result, entry) => {
          const row = entry.demandRow || {};
          const clicks = parseUnitNumber(row.forecastClicks);
          if (!guruV185Text(row[field]) || clicks <= 0) return result;
          result.value += parseUnitNumber(row[field]) * clicks;
          result.clicks += clicks;
          return result;
        }, { value: 0, clicks: 0 });
        return weighted.clicks > 0
          ? Math.round((weighted.value / weighted.clicks) * 100) / 100
          : null;
      };
      const v277Probe = document.createElement("div");
      v277Probe.innerHTML = '<div class="pv181-demand-table-v263">' +
        pv181DemandRowsHtmlV272(v277Entries, {
          mapIndex: 0,
          itemId: product.id,
          itemData: pain,
          readOnly: true,
          draggable: true,
          showRemove: false,
        }) +
        pv181DemandTotalsHtmlV276(v277Entries, { itemId: product.id }) +
        '</div>';
      const v277CtrNode = v277Probe.querySelector('[data-pv181-group-benchmark-v277="ctr"]');
      const v277ReliabilityNode = v277Probe.querySelector('[data-pv181-group-benchmark-v277="reliability"]');
      const v277SizeNode = v277Probe.querySelector('[data-pv181-group-benchmark-v277="size"]');
      const v277PriceNode = v277Probe.querySelector('[data-pv181-group-benchmark-v277="price"]');
      const v277AnomalyRows = [...v277Probe.querySelectorAll(".is-anomaly-v277")]
        .map((row) => row.dataset.pv181JtbdKeywordDragV274);
      const v277AnomalyTitle = v277Probe.querySelector(".pv181-demand-anomaly-v277")?.title || "";
      const v277TotalsDom = Object.fromEntries(
        [...v277Probe.querySelectorAll("[data-pv181-demand-total-field-v276]")]
          .map((cell) => [
            cell.dataset.pv181DemandTotalFieldV276,
            Number(cell.dataset.pv181DemandTotalValueV276),
          ]),
      );
      const v277AnomalyDefinition = {
        noImpressions: guruGate1DemandAnomalyV277({
          queryCount: "10",
          vol: "0",
          forecastClicks: "0",
        }),
        impressionsWithoutClicks: guruGate1DemandAnomalyV277({
          queryCount: "10",
          vol: "25",
          forecastClicks: "0",
        }),
        noQueries: guruGate1DemandAnomalyV277({
          queryCount: "0",
          vol: "0",
          forecastClicks: "0",
        }),
      };
      const v277ZeroCtrHtml = guruGate1GroupBenchmarksHtmlV277([
        { demandRow: { kw: "нет показов", vol: "0", queryCount: "10", forecastClicks: "0" }, index: 0 },
      ], product.id);
      const v281ReliabilityEntries = (reliableCount) => Array.from(
        { length: 15 },
        (_, index) => ({
          demandRow: {
            kw: "проверка надёжности " + (index + 1),
            vol: index < reliableCount ? "50" : "49",
            queryCount: "1",
            forecastClicks: "1",
          },
          index,
        }),
      );
      const v281LowReliabilityHtml = guruGate1GroupBenchmarksHtmlV277(
        v281ReliabilityEntries(2),
        product.id,
      );
      const v281MajorityReliabilityHtml = guruGate1GroupBenchmarksHtmlV277(
        v281ReliabilityEntries(8),
        product.id,
      );
      const v277ThresholdStatuses = [
        [10, "ready"],
        [5, "attention"],
        [4, "problem"],
      ].map(([clicks, expected]) => ({
        expected,
        actual: guruGate1GroupBenchmarksV277([
          { demandRow: { vol: "100", queryCount: "100", forecastClicks: String(clicks) }, index: 0 },
        ], product.id).ctrStatus,
      }));
      v277PageSource.row.contextFields.productPrice = "";
      const v277MissingPriceHtml = guruGate1GroupBenchmarksHtmlV277(v277Entries, product.id);
      v277PageSource.row.contextFields.productPrice = v277PriceBefore;
      const v277 = {
        totals: v277Benchmark.totals,
        ctr: v277Benchmark.ctr,
        ctrStatus: v277Benchmark.ctrStatus,
        ctrText: v277CtrNode?.textContent.trim() || "",
        reliable: v277Benchmark.reliablePhraseCount,
        reliabilityText: v277ReliabilityNode?.textContent.trim() || "",
        sizeText: v277SizeNode?.textContent.trim() || "",
        productPrice: v277Benchmark.productPrice.value,
        weightedClickPrice: v277Benchmark.weightedClickPrice,
        weightedBid: v277Benchmark.totals.bid,
        expectedWeightedClickPrice: v277ExpectedWeighted("clickPrice"),
        expectedWeightedBid: v277ExpectedWeighted("bid"),
        totalsDom: v277TotalsDom,
        clickPriceShare: v277Benchmark.clickPriceShare,
        priceText: v277PriceNode?.textContent.trim() || "",
        priceHiddenWhenMissing: !v277MissingPriceHtml.includes('data-pv181-group-benchmark-v277="price"'),
        anomalyRows: v277AnomalyRows,
        anomalyTitle: v277AnomalyTitle,
        anomalyDefinition: v277AnomalyDefinition,
        zeroCtrSafe: v277ZeroCtrHtml.includes("Недостаточно данных для CTR") && !v277ZeroCtrHtml.includes("Infinity") && !v277ZeroCtrHtml.includes("NaN"),
        thresholdStatuses: v277ThresholdStatuses,
        lowReliabilityHintAtTwoOfFifteen:
          v281LowReliabilityHtml.includes("data-pv181-low-reliability-hint-v281") &&
          v281LowReliabilityHtml.includes("Небольшой объём — не проблема для исправления"),
        lowReliabilityHintHiddenAtEightOfFifteen:
          !v281MajorityReliabilityHtml.includes("data-pv181-low-reliability-hint-v281"),
      };
      const queryCountLabelVisible = document.body.textContent.includes("Примерное количество запросов");
      const queryCountEditable = Boolean(document.querySelector('[data-pv181-dfield="queryCount"]'));
      const importedValueVisible = [...document.querySelectorAll(".pv181-demand-imported-value-v261")]
        .some((node) => node.textContent.trim() === "11");
      const importedPriceFieldsEditable = Boolean(
        document.querySelector('[data-pv181-dfield="forecastClicks"], [data-pv181-dfield="clickPrice"], [data-pv181-dfield="bid"], [data-pv181-dfield="forecastBudget"]'),
      );
      const importedRows = new Set(parsedXls.rows.map((row) => row.key));
      const allImportedMetricsFilled = demand
        .filter((row) => importedRows.has(guruV247KeywordNormalize(row.kw)))
        .every((row) =>
          guruV185Text(row.forecastClicks) &&
          guruV185Text(row.clickPrice) &&
          guruV185Text(row.bid) &&
          guruV185Text(row.forecastBudget)
        );
      const wordstatFieldRemoved = pain.demandRows.every((row) =>
        !Object.prototype.hasOwnProperty.call(row, "source")
      );
      const trafficVolumeLabel = document.querySelector(".pv181-demand-traffic-v270")?.textContent.trim() || "";
      const storedOrderBeforeView = pain.demandRows.map((row) => row.kw);

      let demandCard = document.querySelector('[data-pv181-demand-product-v262="${goatId}"]');
      const demandViewControlCount = demandCard?.querySelectorAll(".pv181-demand-view-controls-v262 input, .pv181-demand-view-controls-v262 select").length || 0;
      const analyticsRowsBeforeSort = [...demandCard.querySelectorAll(".pv181-demand-analytics-rows-v262 .pv181-demand-row")]
        .map((row) => ({
          phrase: row.querySelector('[data-pv181-dfield="kw"]')?.value || "",
          queryCount: Number(row.querySelector('[data-pv181-imported-field-v262="queryCount"]')?.textContent || NaN),
        }));
      const sort = demandCard.querySelector("[data-pv181-demand-sort-v262]");
      if (!sort) throw new Error("Demand query-count sort missing");
      sort.value = "desc";
      sort.dispatchEvent(new Event("change", { bubbles: true }));
      demandCard = document.querySelector('[data-pv181-demand-product-v262="${goatId}"]');
      const descendingCounts = [...demandCard.querySelectorAll('.pv181-demand-analytics-rows-v262 [data-pv181-imported-field-v262="queryCount"]')]
        .map((node) => Number(node.textContent));
      const demandGridHead = demandCard.querySelector(".pv181-demand-table-head-v263");
      const demandGridRows = [...demandCard.querySelectorAll(".pv181-demand-analytics-rows-v262 .pv181-demand-row")];
      const demandGridFirstRow = demandGridRows[0] || null;
      const demandGridSecondRow = demandGridRows[1] || null;
      const demandGridControls = demandGridFirstRow
        ? [...demandGridFirstRow.querySelectorAll(".pv181-demand-cell-v263 > .g1-input")]
        : [];
      const demandGridColumnRects = (row) => row
        ? [...row.querySelectorAll(".pv181-demand-cell-v263")].map((cell) => {
            const rect = cell.getBoundingClientRect();
            return { left: Math.round(rect.left), width: Math.round(rect.width) };
          })
        : [];
      const demandGridLayout = {
        headVisible: Boolean(demandGridHead && getComputedStyle(demandGridHead).display === "grid"),
        headColumns: demandGridHead ? getComputedStyle(demandGridHead).gridTemplateColumns : "",
        rowColumns: demandGridFirstRow ? getComputedStyle(demandGridFirstRow).gridTemplateColumns : "",
        firstRow: demandGridColumnRects(demandGridFirstRow),
        secondRow: demandGridColumnRects(demandGridSecondRow),
        controlTops: demandGridControls.map((control) => Math.round(control.getBoundingClientRect().top)),
        repeatedDesktopLabels: demandGridFirstRow
          ? [...demandGridFirstRow.querySelectorAll(".pv181-demand-cell-label-v263")]
              .some((label) => getComputedStyle(label).display !== "none")
          : true,
      };
      const wordstatLabelVisible = Boolean(
        demandCard && (demandCard.textContent || "")
          .toLocaleLowerCase("ru-RU")
          .includes("wordstat/тренды"),
      );
      const demandTrendsRemovalLog = state.project._gate1ProductIdMigrationLog?.find(
        (entry) => entry.id === GATE1_DEMAND_TRENDS_REMOVAL_V271,
      ) || null;
      const v267GroupsBefore = structuredClone(pain.semL3Groups);
      const v267DemandBefore = structuredClone(pain.demandRows);
      const v267DraftsBefore = structuredClone(pain.semL3GroupingDraftsV266 || []);
      const v267MetaBefore = structuredClone(pain.semL3GroupingMetaV266 || null);
      const v267LegacyAdditionalBefore = structuredClone(pain.semL4Model.additionalJtbds);
      const v274HadAssignmentsBefore = Object.prototype.hasOwnProperty.call(
        pain,
        "jtbdKeywordAssignmentsV274",
      );
      const v274AssignmentsBefore = structuredClone(
        pain.jtbdKeywordAssignmentsV274 || {},
      );
      pain.semL4Model.additionalJtbds = ["Старый плоский дополнительный JTBD"];
      guruGate1EnsureAdditionalJtbdsV268(pain);
      const v268MigratedLegacy = structuredClone(pain.semL4Model.additionalJtbds[0]);
      const firstJtbd = document.querySelector("[data-gate1-live-jtbd-v259]")?.textContent.trim() || "";
      const jtbdRecordForV267 = guruV194ExactRecords("jtbd", "product", product, state)[0];
      const jtbdBeforeV267 = jtbdRecordForV267.value;
      jtbdRecordForV267.value = "Когда Нужно выбрать подарок к Новому году, клиент хочет Найти необычный авторский подарок, связанный с символом 2027 года, чтобы Порадовать получателя и не ошибиться с выбором.";
      pain.semL3Groups = [{ mainQuery: "", keywords: [] }];
      pain.demandRows.push(
        { kw: "экспресс доставка москва", vol: "12", queryCount: "30", originStage: "gate1" },
        { kw: "доставка по россии быстро", vol: "9", queryCount: "20", originStage: "gate1" },
        { kw: "бережная упаковка тканью", vol: "7", queryCount: "15", originStage: "gate1" },
        { kw: "упаковка из переработанной ткани", vol: "5", queryCount: "10", originStage: "gate1" },
      );
      const v267Primary = guruGate1PrimaryJtbdMatchV267(product.id, pain);
      const v267Suggestion = guruGate1SuggestGroupingV266(pain, product.id);
      guruGate1RecordGroupingRunV266(
        { itemData: pain, itemId: product.id, mapIndex: 0 },
        v267Suggestion,
      );
      const v267FirstDraft = v267Suggestion.drafts[0];
      if (!v267FirstDraft) throw new Error("V267 remainder grouping draft missing");
      guruGate1ConfirmGroupingDraftV266(pain, v267FirstDraft);
      pain.semL3GroupingDraftsV266 = v267Suggestion.drafts.filter(
        (draft) => draft.id !== v267FirstDraft.id,
      );
      // Основная JTBD-группа должна иметь собственный фиксированный порядок,
      // даже когда таблица «Спрос» показывается в порядке ввода.
      pv181DemandViewV262(product.id).sortQueryCount = "none";
      renderGate();
      const secondJtbd = document.querySelector("[data-gate1-live-jtbd-v259]")?.textContent.trim() || "";
      const v267LinkedGroup = pain.semL3Groups.at(-1);
      const v268LinkedEntry = pain.semL4Model.additionalJtbds.find((entry) =>
        entry.linked_group_id === v267LinkedGroup.id,
      );
      const v268LinkedForm = document.querySelector(
        '[data-pv181-additional-jtbd-v268="' + CSS.escape(v268LinkedEntry.id) + '"]',
      );
      const v267FormInputs = [...v268LinkedForm.querySelectorAll("[data-pv181-jtbd-part-v268]")];
      const v267StatsBeforeFill = guruGate1JtbdDemandStatsV267(product.id, pain);
      const v267PrimaryGroupDom = document.querySelector(
        "[data-pv181-primary-jtbd-group-v267]",
      );
      const v267MainJtbdFieldDom = document
        .querySelector("[data-gate1-live-jtbd-v259]")
        ?.closest("label");
      const v267AdditionalJtbdsDom = document.querySelector(
        ".pv181-additional-jtbds-v268",
      );
      const v267PrimaryRows = [...v267PrimaryGroupDom.querySelectorAll(
        "[data-pv181-primary-demand-row-v272]",
      )];
      const v267PrimaryHead = v267PrimaryGroupDom.querySelector(
        ".pv181-demand-table-head-v263",
      );
      const v273Pending = guruGate1PendingJtbdDemandV273(product.id, pain);
      const v273PendingCard = document.querySelector(
        "[data-pv181-pending-jtbd-card-v273]",
      );
      const v273PendingRows = [...v273PendingCard.querySelectorAll(
        "[data-pv181-pending-jtbd-demand-row-v273]",
      )];
      const v273PendingHead = v273PendingCard.querySelector(
        ".pv181-demand-table-head-v263",
      );
      const v278CollapseProbe = (root) => {
        const details = root.querySelector("[data-pv181-jtbd-demand-details-v278]");
        const rows = details?.querySelector("[class*='-jtbd-demand-rows-']");
        const totals = root.querySelector("[data-pv181-demand-totals-v276]");
        const benchmarks = root.querySelector("[data-pv181-group-benchmarks-v277]");
        const visible = (node) => Boolean(
          node && getComputedStyle(node).display !== "none" && node.getClientRects().length,
        );
        const snapshot = () => ({
          open: Boolean(details?.open),
          rowsVisible: visible(rows),
          totalsVisible: visible(totals),
          benchmarksVisible: visible(benchmarks),
          benchmarkItems: benchmarks?.querySelectorAll(
            "[data-pv181-group-benchmark-v277]",
          ).length || 0,
        });
        const initial = snapshot();
        details?.querySelector("summary")?.click();
        const expanded = snapshot();
        details?.querySelector("summary")?.click();
        const collapsedAgain = snapshot();
        return { initial, expanded, collapsedAgain };
      };
      const v278PrimaryCollapse = v278CollapseProbe(v267PrimaryGroupDom);
      const v278AdditionalCollapse = v278CollapseProbe(v268LinkedForm);
      const v276ReadTotals = (root) => Object.fromEntries(
        [...root.querySelectorAll("[data-pv181-demand-total-field-v276]")]
          .map((cell) => [
            cell.dataset.pv181DemandTotalFieldV276,
            Number(cell.dataset.pv181DemandTotalValueV276),
          ]),
      );
      const v276ExpectedTotals = (phrases) => pv181DemandTotalsV276(
        phrases.map((entry) => ({ demandRow: entry.row })),
      );
      const v276PrimaryTotals = v276ReadTotals(v267PrimaryGroupDom);
      const v276PendingTotals = v276ReadTotals(v273PendingCard);
      const v276AdditionalPhrases = guruGate1AdditionalJtbdDemandV274(
        product.id,
        pain,
        v268LinkedEntry.id,
      );
      const v276AdditionalTotals = v276ReadTotals(v268LinkedForm);
      const v276TotalsRowCount = document.querySelectorAll(
        "[data-pv181-demand-totals-v276]",
      ).length;
      const v276NonEmptyGroupTableCount = document.querySelectorAll(
        ".pv181-primary-jtbd-demand-table-v272, .pv181-pending-jtbd-demand-table-v273, .pv181-additional-jtbd-demand-table-v274",
      ).length;
      const v277IntegratedBenchmarkCount = document.querySelectorAll(
        "[data-pv181-group-benchmarks-v277]",
      ).length;
      const v277PendingBenchmarkCount = v273PendingCard.querySelectorAll(
        "[data-pv181-group-benchmarks-v277]",
      ).length;
      const v277BenchmarksImmediatelyAfterTotals = [...document.querySelectorAll(
        "[data-pv181-demand-totals-v276]",
      )].filter((row) => !row.closest(
        "[data-pv181-pending-jtbd-card-v273]",
      )).every((row) => row.nextElementSibling?.matches(
        "[data-pv181-group-benchmarks-v277]",
      ));
      const v267PrimaryQueryCounts = v267PrimaryRows.map((row) =>
        Number(row.querySelector(
          '[data-pv181-primary-demand-field-v272="queryCount"]',
        )?.textContent || NaN),
      );
      const v267PrimaryMetricsMatchDemand = v267PrimaryRows.every((row) => {
        const phrase = row.querySelector(
          '[data-pv181-primary-demand-field-v272="kw"]',
        )?.textContent.trim() || "";
        const source = pain.demandRows.find((demandRow) =>
          guruV247KeywordNormalize(demandRow.kw) === guruV247KeywordNormalize(phrase),
        );
        return Boolean(source) && PV181_DEMAND_FIELDS_V272.every(([field, label]) => {
          const actual = row.querySelector(
            '[data-pv181-primary-demand-field-v272="' + field + '"]',
          )?.textContent.trim() || "";
          return actual === (guruV185Text(source[field]) || label);
        });
      });
      const v273PendingQueryCounts = v273PendingRows.map((row) =>
        Number(row.querySelector(
          '[data-pv181-pending-jtbd-demand-field-v273="queryCount"]',
        )?.textContent || NaN),
      );
      const v273PendingPhrases = v273PendingRows.map((row) =>
        row.querySelector(
          '[data-pv181-pending-jtbd-demand-field-v273="kw"]',
        )?.textContent.trim() || "",
      );
      const v273PendingMetricsMatchDemand = v273PendingRows.every((row) => {
        const phrase = row.querySelector(
          '[data-pv181-pending-jtbd-demand-field-v273="kw"]',
        )?.textContent.trim() || "";
        const source = pain.demandRows.find((demandRow) =>
          guruV247KeywordNormalize(demandRow.kw) === guruV247KeywordNormalize(phrase),
        );
        return Boolean(source) && PV181_DEMAND_FIELDS_V272.every(([field, label]) => {
          const actual = row.querySelector(
            '[data-pv181-pending-jtbd-demand-field-v273="' + field + '"]',
          )?.textContent.trim() || "";
          return actual === (guruV185Text(source[field]) || label);
        });
      });
      const v267UiBeforeFill = {
        primaryChips: document.querySelectorAll(".pv181-primary-jtbd-phrases-v267 > span").length,
        primaryRows: v267PrimaryRows.length,
        primaryGroupCount: document.querySelectorAll(
          "[data-pv181-primary-jtbd-group-v267]",
        ).length,
        primaryTitle: v267PrimaryGroupDom.querySelector("header strong")?.textContent.trim() || "",
        primaryHeaders: [...v267PrimaryHead.querySelectorAll(":scope > span")]
          .slice(0, -1)
          .map((node) => node.textContent.trim()),
        primaryImmediatelyAfterMain:
          v267MainJtbdFieldDom?.nextElementSibling === v267PrimaryGroupDom,
        primaryBeforeAdditional:
          v267PrimaryGroupDom?.nextElementSibling === v267AdditionalJtbdsDom,
        primaryInsideQueryLevel: Boolean(v267PrimaryGroupDom.closest(".pv181-query-level")),
        primaryEditableControls: [...v267PrimaryGroupDom.querySelectorAll(
          "textarea, input, select, button",
        )].filter((control) =>
          !control.closest("[data-gate1-group-final-foundation-v279]") &&
          !control.matches("[data-pv181-demand-remove]"),
        ).length,
        primaryRemoveButtons: v267PrimaryGroupDom.querySelectorAll(
          "[data-pv181-demand-remove]",
        ).length,
        primaryMetricsMatchDemand: v267PrimaryMetricsMatchDemand,
        primaryGridAligned:
          getComputedStyle(v267PrimaryHead).gridTemplateColumns ===
          getComputedStyle(v267PrimaryRows[0]).gridTemplateColumns,
        primaryQueryCounts: v267PrimaryQueryCounts,
        primarySortedDescending: v267PrimaryQueryCounts.every(
          (value, index, values) => index === 0 || values[index - 1] >= value,
        ),
        pendingAfterAdditional:
          v267AdditionalJtbdsDom?.nextElementSibling === v273PendingCard,
        pendingAfterAddButton:
          v267AdditionalJtbdsDom?.lastElementChild?.matches?.(
            "[data-pv181-jtbd-add]",
          ) === true,
        pendingTitle: v273PendingCard.querySelector("header strong")?.textContent.trim() || "",
        pendingRows: v273PendingRows.length,
        pendingComputed: v273Pending.phrases.length,
        pendingPhrases: v273PendingPhrases,
        pendingQueryCounts: v273PendingQueryCounts,
        pendingSortedDescending: v273PendingQueryCounts.every(
          (value, index, values) => index === 0 || values[index - 1] >= value,
        ),
        pendingMetricsMatchDemand: v273PendingMetricsMatchDemand,
        pendingGridAligned:
          getComputedStyle(v273PendingHead).gridTemplateColumns ===
          getComputedStyle(v273PendingRows[0]).gridTemplateColumns,
        pendingEditableControls: [...v273PendingCard.querySelectorAll(
          "textarea, input, select, button",
        )].filter((control) =>
          !control.matches("[data-pv181-demand-remove]"),
        ).length,
        pendingRemoveButtons: v273PendingCard.querySelectorAll(
          "[data-pv181-demand-remove]",
        ).length,
        demandBadges: document.querySelectorAll(".pv181-primary-jtbd-badge-v267").length,
        additionalForms: document.querySelectorAll("[data-pv181-additional-jtbd-v268]").length,
        emptyFields: v267FormInputs.filter((input) => !input.value).length,
        fieldHints: [...v268LinkedForm.querySelectorAll(".gate0-jtbd-parts-v194 label > small")]
          .map((node) => node.textContent.trim()),
        unifiedTitle: v268LinkedForm.querySelector(".gate0-jtbd-sentence-v194 > small")?.textContent.trim() || "",
        unifiedHint: v268LinkedForm.querySelector(".gate0-unified-hint-v246")?.textContent.trim() || "",
        unifiedExample: v268LinkedForm.querySelector(".gate0-unified-example-v246")?.textContent.trim() || "",
        collapsibleLists: {
          primary: v278PrimaryCollapse,
          additional: v278AdditionalCollapse,
        },
        statsText: document.querySelector("[data-pv181-jtbd-demand-stats-v267]")?.textContent.trim() || "",
        groupTotals: {
          primary: v276PrimaryTotals,
          primaryExpected: v276ExpectedTotals(v267Primary.phrases),
          pending: v276PendingTotals,
          pendingExpected: v276ExpectedTotals(v273Pending.phrases),
          additional: v276AdditionalTotals,
          additionalExpected: v276ExpectedTotals(v276AdditionalPhrases),
          rows: v276TotalsRowCount,
          nonEmptyGroups: v276NonEmptyGroupTableCount,
          fields: Object.keys(v276PrimaryTotals),
          benchmarkBlocks: v277IntegratedBenchmarkCount,
          pendingBenchmarkBlocks: v277PendingBenchmarkCount,
          benchmarksImmediatelyAfterTotals: v277BenchmarksImmediatelyAfterTotals,
        },
      };
      ["Срочно нужна доставка", "получить заказ по России", "успеть к нужной дате"]
        .forEach((value, index) => {
          v267FormInputs[index].value = value;
          v267FormInputs[index].dispatchEvent(new Event("input", { bubbles: true }));
        });
      const v269LinkedSentence = v268LinkedForm
        .querySelector("[data-pv181-additional-jtbd-sentence-v269]")
        ?.textContent.trim() || "";
      const v267StatsAfterFill = guruGate1JtbdDemandStatsV267(product.id, pain);
      const v267StatsTextAfterFill = document.querySelector("[data-pv181-jtbd-demand-stats-v267]")?.textContent.trim() || "";
      const v267LinkedParts = structuredClone(
        pain.semL4Model.additionalJtbds.find((entry) =>
          entry.id === v268LinkedEntry.id,
        ),
      );
      await Promise.resolve();
      const addAdditionalButton = document.querySelector("[data-pv181-jtbd-add]");
      addAdditionalButton.click();
      const v268ManualEntry = pain.semL4Model.additionalJtbds.at(-1);
      const v268ManualProbe = document.createElement("div");
      v268ManualProbe.innerHTML = pv181JtbdModelHtml(
        0,
        product.id,
        pain,
        { title: "Уровень 3", hints: [] },
      );
      const v268ManualForm = v268ManualProbe.querySelector(
        '[data-pv181-additional-jtbd-v268="' + CSS.escape(v268ManualEntry.id) + '"]',
      );
      if (!v268ManualForm) throw new Error("Manual form missing: " + JSON.stringify({
        buttonDisabled: addAdditionalButton.disabled,
        entries: pain.semL4Model.additionalJtbds.map((entry) => ({ id: entry.id, source: entry.source })),
        dom: [...v268ManualProbe.querySelectorAll("[data-pv181-additional-jtbd-v268]")].map((node) => node.dataset.pv181AdditionalJtbdV268),
      }));
      const v268ManualInputs = [...v268ManualForm.querySelectorAll("[data-pv181-jtbd-part-v268]")];
      const v268ManualAdd = {
        count: pain.semL4Model.additionalJtbds.length,
        fields: v268ManualInputs.map((input) => input.dataset.pv181JtbdFieldV268),
        allEmpty: v268ManualInputs.every((input) => !input.value),
        noPlaceholders: v268ManualInputs.every((input) => !input.hasAttribute("placeholder")),
        hasUnifiedCard: Boolean(v268ManualForm.querySelector(".gate0-jtbd-sentence-v194")),
      };
      const groupsAtJtbdLimit = pain.semL3Groups.length;
      v268ManualAdd.fourthGroupBlocked =
        guruGate1ConfirmGroupingDraftV266(pain, v267Suggestion.drafts[1]) === false &&
        pain.semL3Groups.length === groupsAtJtbdLimit &&
        pain.semL4Model.additionalJtbds.length === 3;
      const v268ManualRemoveButton = document.querySelector(
        '[data-pv181-additional-jtbd-v268="' + CSS.escape(v268ManualEntry.id) + '"] ' +
          '[data-pv181-jtbd-remove]',
      );
      if (!v268ManualRemoveButton) throw new Error("Manual JTBD remove button missing");
      v268ManualRemoveButton.click();
      v268ManualAdd.removeWorked =
        pain.semL4Model.additionalJtbds.length === 2 &&
        !pain.semL4Model.additionalJtbds.some((entry) => entry.id === v268ManualEntry.id) &&
        !document.querySelector(
          '[data-pv181-additional-jtbd-v268="' + CSS.escape(v268ManualEntry.id) + '"]',
        );
      // Предыдущие синтетические input-события сбрасывают защитный флаг
      // плавного ввода в microtask. В реальном браузере drag-and-drop всегда
      // начинается отдельным пользовательским событием; воспроизводим ту же
      // границу задачи перед проверкой повторного рендера.
      await Promise.resolve();
      renderGate();
      const v274DragPhrase = "символ года 2027 купить";
      const v274DragKey = guruV247KeywordNormalize(v274DragPhrase);
      const v274AdditionalId = v268MigratedLegacy.id;
      const v274RuntimeErrors = [];
      const v274ErrorListener = (event) => v274RuntimeErrors.push(
        event.error?.stack || event.message || "unknown runtime error",
      );
      window.addEventListener("error", v274ErrorListener);
      const v274DragTo = (targetSelector) => {
        const source = document.querySelector(
          '[data-pv181-jtbd-keyword-drag-v274="' + CSS.escape(v274DragKey) + '"]',
        );
        const target = document.querySelector(targetSelector);
        if (!source || !target) throw new Error("V274 drag source/target missing");
        const transfer = new DataTransfer();
        source.dispatchEvent(new DragEvent("dragstart", {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
        }));
        target.dispatchEvent(new DragEvent("dragover", {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
        }));
        target.dispatchEvent(new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
        }));
      };
      const v274InitialTargets = document.querySelectorAll(
        '[data-pv181-jtbd-drop-target-v274][data-pv181-item-i="' +
          CSS.escape(product.id) + '"]',
      ).length;
      const v274InitialDraggableRows = document.querySelectorAll(
        '[data-pv181-jtbd-keyword-drag-v274][data-pv181-item-i="' +
          CSS.escape(product.id) + '"]',
      ).length;
      v274DragTo('[data-pv181-jtbd-drop-target-v274="pending"]');
      const v274AfterPending = {
        primary: guruGate1PrimaryJtbdMatchV267(product.id, pain).phrases.length,
        pending: guruGate1PendingJtbdDemandV273(product.id, pain).phrases.length,
        assignment: structuredClone(pain.jtbdKeywordAssignmentsV274[v274DragKey]),
      };
      v274DragTo(
        '[data-pv181-jtbd-drop-target-v274="additional"]' +
          '[data-pv181-additional-jtbd-id-v274="' + CSS.escape(v274AdditionalId) + '"]',
      );
      const v274AdditionalEntry = pain.semL4Model.additionalJtbds.find(
        (entry) => entry.id === v274AdditionalId,
      );
      const v274AdditionalGroup = guruGate1AdditionalJtbdGroupV268(
        pain,
        v274AdditionalEntry,
      );
      const v274RenderedDragSource = document.querySelector(
        '[data-pv181-jtbd-keyword-drag-v274="' + CSS.escape(v274DragKey) + '"]',
      );
      guruPersistStateFast({ quiet: true });
      const v274PersistedWorkspace = JSON.parse(localStorage.getItem(
        WORKSPACE_STORAGE_PREFIX + activeProjectId,
      ));
      const v274PersistedAssignment = v274PersistedWorkspace.painV130.productMaps
        .find((map) => map?.items?.[product.id])
        ?.items?.[product.id]?.jtbdKeywordAssignmentsV274?.[v274DragKey];
      const v274AfterAdditional = {
        primary: guruGate1PrimaryJtbdMatchV267(product.id, pain).phrases.length,
        pending: guruGate1PendingJtbdDemandV273(product.id, pain).phrases.length,
        additional: guruGate1AdditionalJtbdDemandV274(
          product.id,
          pain,
          v274AdditionalId,
        ).map((entry) => entry.value),
        groupHasPhrase: guruGate1GroupPhraseKeysV274(v274AdditionalGroup)
          .has(v274DragKey),
        assignment: structuredClone(pain.jtbdKeywordAssignmentsV274[v274DragKey]),
        persistedAssignment: structuredClone(v274PersistedAssignment || null),
        renderedRows: document.querySelectorAll(
          '[data-pv181-additional-jtbd-keywords-v274="' +
            CSS.escape(v274AdditionalId) + '"] ' +
          '[data-pv181-additional-jtbd-demand-row-v274]',
        ).length,
        totalAdditionalRows: document.querySelectorAll(
          "[data-pv181-additional-jtbd-demand-row-v274]",
        ).length,
        renderedDragSourceAdditionalId: v274RenderedDragSource
          ?.closest("[data-pv181-additional-jtbd-v268]")
          ?.dataset.pv181AdditionalJtbdV268 || "",
      };
      v274DragTo('[data-pv181-jtbd-drop-target-v274="primary"]');
      const v274CurrentAdditionalEntry = pain.semL4Model.additionalJtbds.find(
        (entry) => entry.id === v274AdditionalId,
      );
      const v274CurrentAdditionalGroup = guruGate1AdditionalJtbdGroupV268(
        pain,
        v274CurrentAdditionalEntry,
      );
      const v274AfterReturn = {
        primary: guruGate1PrimaryJtbdMatchV267(product.id, pain).phrases.length,
        pending: guruGate1PendingJtbdDemandV273(product.id, pain).phrases.length,
        additional: guruGate1AdditionalJtbdDemandV274(
          product.id,
          pain,
          v274AdditionalId,
        ).length,
        assignment: structuredClone(pain.jtbdKeywordAssignmentsV274[v274DragKey]),
        groupStillHasPhrase: guruGate1GroupPhraseKeysV274(v274CurrentAdditionalGroup)
          .has(v274DragKey),
      };
      const v274DragDrop = {
        phrase: v274DragPhrase,
        initialTargets: v274InitialTargets,
        initialDraggableRows: v274InitialDraggableRows,
        afterPending: v274AfterPending,
        afterAdditional: v274AfterAdditional,
        afterReturn: v274AfterReturn,
        runtimeErrors: v274RuntimeErrors,
      };
      window.removeEventListener("error", v274ErrorListener);
      const v267Log = structuredClone(
        state.project._gate1ProductIdMigrationLog?.find(
          (entry) => entry.id === GATE1_JTBD_DEMAND_LINK_V267,
        ) || null,
      );
      const v268Log = structuredClone(
        state.project._gate1ProductIdMigrationLog?.find(
          (entry) => entry.id === GATE1_ADDITIONAL_JTBD_STRUCTURED_V268,
        ) || null,
      );
      const v267RestorePain = guruGate1FinalPainContextV259(product, false).itemData;
      v267RestorePain.semL3Groups = v267GroupsBefore;
      v267RestorePain.demandRows = v267DemandBefore;
      v267RestorePain.semL3GroupingDraftsV266 = v267DraftsBefore;
      v267RestorePain.semL3GroupingMetaV266 = v267MetaBefore;
      v267RestorePain.semL4Model.additionalJtbds = v267LegacyAdditionalBefore;
      if (v274HadAssignmentsBefore)
        v267RestorePain.jtbdKeywordAssignmentsV274 = v274AssignmentsBefore;
      else delete v267RestorePain.jtbdKeywordAssignmentsV274;
      guruV194ExactRecords("jtbd", "product", product, state).forEach((record) => {
        record.value = jtbdBeforeV267;
      });
      pv181SyncQueryGroups(v267RestorePain);
      renderGate();
      const painAfterV267Restore = guruGate1FinalPainContextV259(product, false).itemData;
      const v279PrimaryControl = document.querySelector(
        '[data-gate1-group-final-foundation-v279][data-gate1-group-final-scope-v279="primary"]',
      );
      const v279PrimaryContext = guruGate1GroupFinalContextV279(v279PrimaryControl);
      if (!v279PrimaryContext?.entries?.length)
        throw new Error("V279 primary final foundation has no group entries");
      const v279PrimaryExport = guruGate1FinalMetricsCsvV279(
        v279PrimaryContext.entries,
      );
      const v279PrimaryExportParsed = guruGate1FinalParseMetricsCsvV259(
        v279PrimaryExport,
      );
      const v279TopExportParsed = guruGate1FinalParseMetricsCsvV259(
        guruGate1FinalMetricsCsvV279(guruGate1FinalExportEntriesV279(product)),
      );
      const v279TopExpectedRows = guruGate1FinalConfirmedV259(product).length;
      const v279PrimaryKeys = new Set(v279PrimaryContext.entries.map((entry) =>
        guruV247KeywordNormalize(entry.demandRow.kw),
      ));
      const v279PrimaryEntry = v279PrimaryContext.entries[0];
      const v279ElsewhereEntry = guruGate1UniqueDemandV267(painAfterV267Restore)
        .find((entry) => !v279PrimaryKeys.has(entry.key));
      if (!v279ElsewhereEntry)
        throw new Error("V279 test needs a Demand phrase outside the primary group");
      const v279DemandBefore = structuredClone(painAfterV267Restore.demandRows);
      const v279MiddleRecord = guruGate1MiddleRecordV257(
        g3ProductJourneyPageSource(product).row,
        true,
      );
      const v279MiddleBefore = structuredClone(v279MiddleRecord.keywords);
      const v279ImportStateBefore = structuredClone(
        painAfterV267Restore.finalKeywordFoundationV259 || null,
      );
      const v279MembershipBefore = JSON.stringify({
        groups: painAfterV267Restore.semL3Groups,
        assignments: painAfterV267Restore.jtbdKeywordAssignmentsV274 || {},
      });
      const v279StorageKeysBefore = Object.keys(painAfterV267Restore).sort();
      const v279GroupImportCsv = guruGate1FinalMetricsCsvV279([
        { demandRow: {
          kw: v279PrimaryEntry.demandRow.kw,
          vol: "901",
          queryCount: "902",
          forecastClicks: "90",
          clickPrice: "9.01",
          bid: "901.00",
          forecastBudget: "9010.00",
        } },
        { demandRow: {
          kw: v279ElsewhereEntry.row.kw,
          vol: "801",
          queryCount: "802",
          forecastClicks: "80",
          clickPrice: "8.01",
          bid: "801.00",
          forecastBudget: "8010.00",
        } },
        { demandRow: {
          kw: "неизвестная фраза v279",
          vol: "701",
          queryCount: "702",
          forecastClicks: "70",
          clickPrice: "7.01",
          bid: "701.00",
          forecastBudget: "7010.00",
        } },
      ]);
      const v279GroupImportParsed = guruGate1FinalParseMetricsCsvV259(
        v279GroupImportCsv,
      );
      const v279Apply = guruGate1GroupApplyMetricsV279(
        product.id,
        painAfterV267Restore,
        v279PrimaryContext.entries,
        v279GroupImportParsed,
        "group-v279.csv",
      );
      const v279MembershipAfter = JSON.stringify({
        groups: painAfterV267Restore.semL3Groups,
        assignments: painAfterV267Restore.jtbdKeywordAssignmentsV274 || {},
      });
      const v279PrimaryStored = painAfterV267Restore.demandRows.find((row) =>
        guruV247KeywordNormalize(row.kw) ===
          guruV247KeywordNormalize(v279PrimaryEntry.demandRow.kw),
      );
      const v279ElsewhereStored = painAfterV267Restore.demandRows.find((row) =>
        guruV247KeywordNormalize(row.kw) === v279ElsewhereEntry.key,
      );
      const v279CreatedStored = painAfterV267Restore.demandRows.find((row) =>
        guruV247KeywordNormalize(row.kw) ===
          guruV247KeywordNormalize("неизвестная фраза v279"),
      );
      renderGate();
      const v279PrimaryDomRow = document.querySelector(
        '[data-pv181-primary-demand-row-v272][data-pv181-jtbd-keyword-drag-v274="' +
          CSS.escape(guruV247KeywordNormalize(v279PrimaryEntry.demandRow.kw)) + '"]',
      );
      const v279DemandDomRow = [...document.querySelectorAll(
        ".pv181-demand-analytics-rows-v262 .pv181-demand-row",
      )].find((row) =>
        row.querySelector('[data-pv181-dfield="kw"]')?.value ===
          v279PrimaryEntry.demandRow.kw,
      );
      const v279SharedImportState = structuredClone(
        painAfterV267Restore.finalKeywordFoundationV259,
      );
      const v279 = {
        title: v279PrimaryControl?.querySelector("strong")?.textContent.trim() || "",
        buttonLabels: [...(v279PrimaryControl?.querySelectorAll("button") || [])]
          .map((button) => button.textContent.trim()),
        controls: document.querySelectorAll(
          "[data-gate1-group-final-foundation-v279]",
        ).length,
        additionalControls: document.querySelectorAll(
          '[data-gate1-group-final-scope-v279="additional"]',
        ).length,
        additionalForms: document.querySelectorAll(
          "[data-pv181-additional-jtbd-v268]",
        ).length,
        pendingHasControl: Boolean(document.querySelector(
          "[data-pv181-pending-jtbd-card-v273] [data-gate1-group-final-foundation-v279]",
        )),
        primaryEntryCount: v279PrimaryContext.entries.length,
        primaryExportRows: v279PrimaryExportParsed.rows.length,
        primaryExportAllMembers: v279PrimaryExportParsed.rows.every((row) =>
          v279PrimaryKeys.has(row.key),
        ),
        primaryExportMetricColumns: [
          v279PrimaryExportParsed.volumeIndex,
          v279PrimaryExportParsed.queryCountIndex,
          v279PrimaryExportParsed.monthlyClicksIndex,
          v279PrimaryExportParsed.clickPriceIndex,
          v279PrimaryExportParsed.bidIndex,
          v279PrimaryExportParsed.budgetIndex,
        ],
        topExportRows: v279TopExportParsed.rows.length,
        topExpectedRows: v279TopExpectedRows,
        apply: v279Apply,
        primaryStored: {
          vol: v279PrimaryStored?.vol,
          queryCount: v279PrimaryStored?.queryCount,
        },
        elsewhereStored: {
          vol: v279ElsewhereStored?.vol,
          queryCount: v279ElsewhereStored?.queryCount,
        },
        createdStored: {
          vol: v279CreatedStored?.vol,
          queryCount: v279CreatedStored?.queryCount,
        },
        primaryDomVolume: v279PrimaryDomRow?.querySelector(
          '[data-pv181-primary-demand-field-v272="vol"]',
        )?.textContent.trim() || "",
        demandDomVolume: v279DemandDomRow?.querySelector(
          '[data-pv181-dfield="vol"]',
        )?.value || "",
        sharedLastImport: v279SharedImportState?.last_import || null,
        sharedUnmatched: v279SharedImportState?.unmatched?.map((row) => row.phrase) || [],
        demandCountIncreasedByOne:
          painAfterV267Restore.demandRows.length === v279DemandBefore.length + 1,
        membershipUnchanged: v279MembershipAfter === v279MembershipBefore,
        storageKeysUnchanged:
          JSON.stringify(Object.keys(painAfterV267Restore).sort()) ===
            JSON.stringify(v279StorageKeysBefore),
      };
      painAfterV267Restore.demandRows = v279DemandBefore;
      v279MiddleRecord.keywords = v279MiddleBefore;
      if (v279ImportStateBefore)
        painAfterV267Restore.finalKeywordFoundationV259 = v279ImportStateBefore;
      else delete painAfterV267Restore.finalKeywordFoundationV259;
      renderGate();
      const v267 = {
        primaryCount: v267Primary.phrases.length,
        primaryPhrases: v267Primary.phrases.map((entry) => entry.value),
        concepts: v267Primary.concepts,
        remainderCount: v267Suggestion.candidates.length,
        drafts: v267Suggestion.drafts.map((draft) => ({
          core: draft.coreLabel,
          phrases: draft.phrases.map((phrase) => phrase.value),
        })),
        statsBeforeFill: v267StatsBeforeFill,
        statsAfterFill: v267StatsAfterFill,
        uiBeforeFill: v267UiBeforeFill,
        linkedSentence: v269LinkedSentence,
        statsTextAfterFill: v267StatsTextAfterFill,
        linkedParts: v267LinkedParts,
        excludedCategoryConcepts: v267Primary.excludedCategoryConcepts,
        category: v267Primary.category,
        migratedLegacy: v268MigratedLegacy,
        manualAdd: v268ManualAdd,
        dragDrop: v274DragDrop,
        legacyAdditionalPreserved:
          JSON.stringify(painAfterV267Restore.semL4Model.additionalJtbds) === JSON.stringify(v267LegacyAdditionalBefore),
        log: v267Log,
        v268Log,
      };
      const storedOrderAfterView = painAfterV267Restore.demandRows.map((row) => row.kw);

      const pickerEntries = guruGate1DemandPickerEntriesV264(painAfterV267Restore);
      const pickerInteractionGroup = painAfterV267Restore.semL3Groups[0];
      const pickerInteractionKeys = new Set(
        pickerEntries.slice(0, 2).map((entry) => guruV247KeywordNormalize(entry.value)),
      );
      pickerInteractionGroup.mainQuery = "";
      pickerInteractionGroup.keywords = pickerInteractionGroup.keywords.filter((entry) =>
        !pickerInteractionKeys.has(guruV247KeywordNormalize(pv181KeywordText(entry))),
      );
      pv181SyncQueryGroups(painAfterV267Restore);
      renderGate();
      const pickerSelector =
        '[data-gate1-final-picker-v259][data-pv181-item-i="${goatId}"][data-pv181-query-group-i="0"]';
      const initialPicker = document.querySelector(pickerSelector);
      const initialPickerSelect = initialPicker?.querySelector(
        "[data-gate1-final-picker-select-v259]",
      );
      const pickerUiOptions = [...(initialPickerSelect?.options || [])]
        .slice(1)
        .map((option) => option.textContent.trim());
      const expectedPickerUiOptions = pickerEntries.map((entry) =>
        entry.value + (entry.queryCount === null ? "" : " · " + entry.queryCount + " запросов")
      );
      const pickerUiPresent = Boolean(
        initialPicker &&
        initialPickerSelect &&
        initialPicker.querySelector("[data-gate1-final-pick-main-v259]") &&
        initialPicker.querySelector("[data-gate1-final-pick-related-v259]")
      );
      if (pickerUiPresent && pickerEntries[0]) {
        initialPickerSelect.value = "0";
        initialPicker.querySelector("[data-gate1-final-pick-main-v259]").click();
      }
      const groupAfterMain = guruGate1FinalPainContextV259(product, false)
        .itemData.semL3Groups[0];
      const mainAfterPick = groupAfterMain?.mainQuery || "";
      const relatedPicker = document.querySelector(pickerSelector);
      const relatedPickerSelect = relatedPicker?.querySelector(
        "[data-gate1-final-picker-select-v259]",
      );
      if (relatedPickerSelect && pickerEntries[1]) {
        relatedPickerSelect.value = "1";
        relatedPicker.querySelector("[data-gate1-final-pick-related-v259]").click();
      }
      const groupAfterRelated = guruGate1FinalPainContextV259(product, false)
        .itemData.semL3Groups[0];
      const relatedValues = (groupAfterRelated?.keywords || []).map(pv181KeywordText);
      const relatedPickedOccurrences = relatedValues.filter((value) =>
        guruV247KeywordNormalize(value) ===
          guruV247KeywordNormalize(pickerEntries[1]?.value),
      ).length;
      const renderedMainAfterPick = document.querySelector(
        '[data-pv181-query-group="0"][data-pv181-main-query]',
      )?.value || "";
      const renderedRelatedAfterPick = [...document.querySelectorAll(
        '[data-pv181-query-group="0"][data-pv181-query-keyword]',
      )].map((input) => input.value);
      const companySection = document.querySelector("[data-gate1-company-semantics-v264]");
      const currentDirectProduct = document.querySelector('[data-gate1-direct-product-v265="${goatId}"]');
      const systemHeadings = [...document.querySelectorAll(".gate0-section-heading")];
      const companyHeading = systemHeadings.find((heading) =>
        heading.querySelector(".gate0-section-heading-title")?.textContent.trim() === "Компания"
      );
      const productHeading = systemHeadings.find((heading) =>
        heading.querySelector(".gate0-section-heading-title")?.textContent.trim() === "Продукт / Услуга"
      );
      const companyBrandLines = (document.querySelector("[data-gate1-company-brand-v264]")?.value || "")
        .split(/\\r?\\n/)
        .filter(Boolean);
      const companyBrandLabel = document.querySelector("[data-gate1-company-brand-v264]")
        ?.closest("label")?.querySelector(":scope > span")?.textContent.trim() || "";
      const companyInsideSeoAudit = Boolean(
        companySection?.closest('[data-g1-company-block-v299="seo-audit"]'),
      );
      const companyIsDirectGateChild = Boolean(
        companySection && companySection.parentElement === companySection.closest(".g1-redesign"),
      );
      const companyBeforeProduct = Boolean(
        companySection && currentDirectProduct &&
        (companySection.compareDocumentPosition(currentDirectProduct) & Node.DOCUMENT_POSITION_FOLLOWING)
      );
      const companyBetweenSystemDividers = Boolean(
        companyHeading && companySection && productHeading &&
        (companyHeading.compareDocumentPosition(companySection) & Node.DOCUMENT_POSITION_FOLLOWING) &&
        (companySection.compareDocumentPosition(productHeading) & Node.DOCUMENT_POSITION_FOLLOWING)
      );
      const activeBrandInputs = document.querySelectorAll('[data-pv180-sem="semL1"]').length;
      const activePageInputs = document.querySelectorAll('[data-pv181-list="semL2"]').length;
      const activeBrandValues = state.painV130.productMaps.flatMap((row) => row.semL1 || []).filter((value) => String(value).trim());
      const activePageValues = state.painV130.productMaps.flatMap((row) =>
        Object.values(row.items || {}).flatMap((item) => item.semL2 || [])
      ).filter((value) => String(value).trim());
      const semanticCleanupLog = state.project._gate1ProductIdMigrationLog?.find(
        (entry) => entry.id === GATE1_SEMANTIC_CLEANUP_V264,
      ) || null;
      const shirtPageArchive = state.painV130.legacySemanticLevelsV264?.pageByProduct?.[
        "catalog-item-1786792591872-c8b1e9"
      ] || null;
      const metriclessPickerProbe = guruGate1DemandPickerEntriesV264({
        demandRows: [
          { kw: "без метрик", queryCount: "" },
          { kw: "с метрикой", queryCount: "10" },
          { kw: "Gate 4 отдельно", queryCount: "1000", originStage: "gate4" },
        ],
      });
      const painSection = [...document.querySelectorAll(".g1-section")].find(
        (section) => section.querySelector(".g1-section-title")?.textContent.trim() ===
          "Спрос, ценность, позиционирование · Продукт/Услуга",
      );
      const painText = painSection?.querySelector(".g1-section-body")?.textContent || "";
      const painSectionStatusText = painSection?.querySelector(
        ":scope > .g1-section-header .status-pill",
      )?.textContent.trim() || "";
      const directLabels = [...(currentDirectProduct?.querySelectorAll(".pv181-product-landing-v265 > span, .pv181-query-level-title, .pv140-section-title") || [])]
        .map((node) => node.textContent.trim());
      const gate0LandingsAfter = JSON.stringify(
        g3Gate0Marketing().platformV2.landings,
      );
      const selectedProductCompletion = guruGate1SelectedProductCompletionV282();

      return {
        finalBeforeProduct,
        confirmed: confirmed.map((entry) => entry.value),
        exported,
        xlsRows: parsedXls.rows.length,
        headerIndex: parsedXls.headerIndex,
        headers: parsedXls.headers,
        volumeIndex: parsedXls.volumeIndex,
        queryCountIndex: parsedXls.queryCountIndex,
        clickPriceIndex: parsedXls.clickPriceIndex,
        bidIndex: parsedXls.bidIndex,
        trafficVolumeIndex: parsedXls.trafficVolumeIndex,
        monthlyClicksIndex: parsedXls.monthlyClicksIndex,
        budgetIndex: parsedXls.budgetIndex,
        trafficVolumeValues: parsedXls.trafficVolumeValues,
        trafficVolumeAnomaly: parsedXls.trafficVolumeAnomaly,
        serviceRows: parsedXls.serviceRows.length,
        csvProbe: {
          rows: parsedCsv.rows.length,
          phrase: parsedCsv.rows[0]?.phrase,
          volume: parsedCsv.rows[0]?.volume,
          queryCount: parsedCsv.rows[0]?.queryCount,
          clickPrice: parsedCsv.rows[0]?.clickPrice,
          bid: parsedCsv.rows[0]?.bid,
          trafficVolume: parsedCsv.rows[0]?.trafficVolume,
          monthlyClicks: parsedCsv.rows[0]?.monthlyClicks,
          budget: parsedCsv.rows[0]?.budget,
          hasTrendsField: Object.prototype.hasOwnProperty.call(parsedCsv.rows[0] || {}, "trends"),
          headerIndex: parsedCsv.headerIndex,
        },
        trafficAnomalyProbe: {
          values: parsedTrafficAnomaly.trafficVolumeValues,
          anomaly: parsedTrafficAnomaly.trafficVolumeAnomaly,
        },
        applied,
        queryRudimentAbsent,
        jtbdLevelTitle,
        queryLevelTitle,
        requiredBlockOrder,
        grouping: {
          drafts: draftsAfterSuggest.map((draft) => ({
            core: draft.coreLabel,
            mainQuery: draft.mainQuery,
            phrases: draft.phrases.map((phrase) => phrase.value),
          })),
          draftDomCount,
          confirmAllVisible,
          allDraftsInactive,
          draftMainsAreMostFrequent,
          activeGroupsUnchangedBySuggest,
          existingGroupsPreserved,
          confirmedMainQuery: confirmedDraftGroup?.mainQuery || "",
          confirmedGroupEditable,
          remainingDrafts:
            groupingContextAfterConfirm.itemData.semL3GroupingDraftsV266?.length || 0,
          log: state.project._gate1ProductIdMigrationLog?.find(
            (entry) => entry.id === GATE1_DEMAND_GROUPING_DRAFTS_V266,
          ) || null,
        },
        v279,
        v267,
        v277,
        demand,
        authorGoat,
        unmatched: pain.finalKeywordFoundationV259?.unmatched || [],
        growthVisible: document.body.textContent.includes("Общее число запросов за"),
        queryCountLabelVisible,
        queryCountEditable,
        importedValueVisible,
        importedPriceFieldsEditable,
        allImportedMetricsFilled,
        wordstatFieldRemoved,
        wordstatLabelVisible,
        demandTrendsRemovalLog,
        trafficVolumeLabel,
        demandViewControlCount,
        analyticsRowsBeforeSort,
        descendingCounts,
        demandGridLayout,
        viewDidNotMutateRows:
          JSON.stringify(storedOrderBeforeView) === JSON.stringify(storedOrderAfterView),
        lastImport: pain.finalKeywordFoundationV259?.last_import || null,
        firstJtbd,
        secondJtbd,
        mainAfterPick,
        relatedValues,
        relatedPickedOccurrences,
        renderedMainAfterPick,
        renderedRelatedAfterPick,
        pickerEntries,
        pickerUiPresent,
        pickerUiOptions,
        expectedPickerUiOptions,
        metriclessPickerProbe,
        companyBrandLines,
        companyBrandLabel,
        companyInsideSeoAudit,
        companyIsDirectGateChild,
        companyBeforeProduct,
        companyBetweenSystemDividers,
        companySectionCount: document.querySelectorAll("[data-gate1-company-semantics-v264]").length,
        companyInsideProductStrategy: Boolean(companySection?.closest(".pv140-product-strategy")),
        companyInsideProductAccordion: Boolean(companySection?.closest(".g1-section")),
        activeBrandInputs,
        activePageInputs,
        activeBrandValues,
        activePageValues,
        shirtPageArchive,
        semanticCleanupLog,
        brandLevelVisible: document.body.textContent.includes("Уровень 1 — Брендовый"),
        pageLevelVisible: document.body.textContent.includes("Уровень 1 — Страничный"),
        gate4ChannelVisible: document.body.textContent.includes("Добавлено на этапе реализации"),
        directProductCount: document.querySelectorAll("[data-gate1-direct-product-v265]").length,
        directionWrapperCount: painSection?.querySelectorAll(".pv140-product-card").length || 0,
        nestedProductAccordionCount: painSection?.querySelectorAll(".pv181-item-card").length || 0,
        directionToggleCount: painSection?.querySelectorAll('[data-gate1-filter-toggle="pv140"]').length || 0,
        directionLanguageVisible: /Направление/i.test(painText),
        directionLandingVisible: painText.includes("Посадочная направления"),
        directLabels,
        selectedProductCompletion,
        selectedProductSectionStatus: getPainOfferStatus(),
        selectedProductProgressText: getPainOfferProgressText(),
        painSectionStatusText,
        gate0LandingsCount: Object.keys(g3Gate0Marketing().platformV2.landings || {}).length,
        gate0LandingsUntouched: gate0LandingsBefore === gate0LandingsAfter,
        gate0LandingsMatchFixture:
          gate0LandingsAfter === ${JSON.stringify(JSON.stringify(sourceGate0Landings))},
        directLog: state.project._gate1SectionsMigrationLog?.find(
          (entry) => entry.id === GATE1_DIRECT_PRODUCT_DEMAND_V265,
        ) || null,
        log: state.project._gate1ProductIdMigrationLog?.find((entry) => entry.id === GATE1_FINAL_KEYWORD_FOUNDATION_V259) || null,
      };
    })()`,
  );

  console.log(JSON.stringify(process.env.GURU_SMOKE_SUMMARY
    ? {
        demandV270: {
          rows: result.demand.length,
          authorGoat: result.authorGoat,
          allImportedMetricsFilled: result.allImportedMetricsFilled,
          wordstatFieldRemoved: result.wordstatFieldRemoved,
          wordstatLabelVisible: result.wordstatLabelVisible,
          demandTrendsRemovalLog: result.demandTrendsRemovalLog,
          trafficVolumeLabel: result.trafficVolumeLabel,
          lastImport: result.lastImport,
          trafficAnomalyProbe: result.trafficAnomalyProbe,
        },
        firstJtbd: result.firstJtbd,
        secondJtbd: result.secondJtbd,
        v279: result.v279,
        v267: result.v267,
      }
    : result, null, 2));
  assert(result.finalBeforeProduct, "Final foundation is not above the selected product content");
  assert(result.confirmed.length === 20, `Expected 20 confirmed phrases, got ${result.confirmed.length}`);
  assert(!result.exported.includes("черновая фраза") && !result.exported.includes("середина черновик"), "Draft phrases leaked into export");
  assert(result.xlsRows === 20, `Expected 20 forecast rows, got ${result.xlsRows}`);
  assert(result.headerIndex === 7, `Expected header at row 8, got ${result.headerIndex + 1}`);
  assert(result.volumeIndex === 3 && result.queryCountIndex === 1, "Forecast metric columns were not mapped by header names");
  assert(result.clickPriceIndex === 6 && result.bidIndex === 5, "CPC and bid columns were not mapped by header names");
  assert(result.trafficVolumeIndex === 2 && result.monthlyClicksIndex === 4 && result.budgetIndex === 7, "Traffic, monthly-click and budget columns were not mapped by header names");
  assert(JSON.stringify(result.trafficVolumeValues) === JSON.stringify(["100"]) && !result.trafficVolumeAnomaly, "Uniform forecast traffic volume was not detected");
  assert(result.headers[0] === "Предложенные фразы", "Real XLS header was not found");
  assert(result.serviceRows === 15, `Expected 15 audited service rows, got ${result.serviceRows}`);
  assert(result.csvProbe.rows === 1 && result.csvProbe.phrase === "авторская коза" && result.csvProbe.volume === "8" && result.csvProbe.queryCount === "11" && result.csvProbe.clickPrice === "3.50" && result.csvProbe.bid === "137.40" && result.csvProbe.trafficVolume === "100" && result.csvProbe.monthlyClicks === "2" && result.csvProbe.budget === "7.00" && !result.csvProbe.hasTrendsField, "Metadata-prefixed CSV was parsed incorrectly or retained the removed trends field");
  assert(result.trafficAnomalyProbe.anomaly && JSON.stringify(result.trafficAnomalyProbe.values) === JSON.stringify(["80", "100"]), "Different traffic volumes were not recorded as an anomaly");
  assert(result.applied.matched === 20 && result.applied.unmatched === 15, "Forecast matching result is wrong");
  assert(result.requiredBlockOrder && result.queryRudimentAbsent, "Final → Demand → JTBD order is wrong or the retired query-group editor returned");
  assert(result.jtbdLevelTitle === "Уровень 2 — Основной и дополнительные JTBD" && !result.queryLevelTitle, "JTBD numbering is wrong or the retired query level still has a title");
  assert(result.grouping.drafts.length >= 1 && result.grouping.draftDomCount === 0, "Grouping data helper failed or retired query-group drafts leaked into the UI");
  assert(!result.grouping.confirmAllVisible && result.grouping.allDraftsInactive && result.grouping.draftMainsAreMostFrequent, "Retired grouping confirmation UI returned or grouping data is invalid");
  assert(result.grouping.drafts.every((draft) => !["коза", "подарок"].includes(draft.core)), "A deliberately broad core leaked into grouping drafts");
  assert(result.grouping.activeGroupsUnchangedBySuggest, "Draft suggestion changed active query groups or the semL3 mirror");
  assert(result.grouping.existingGroupsPreserved && !result.grouping.confirmedGroupEditable, "Confirming one historical draft changed an existing group or leaked the retired editor into the UI");
  assert(result.grouping.confirmedMainQuery === result.grouping.drafts[0].mainQuery && result.grouping.remainingDrafts === result.grouping.drafts.length - 1, "Per-group confirmation activated the wrong draft");
  assert(result.grouping.log?.algorithm?.maximum_core_share === 0.45 && result.grouping.log?.runs?.length, "Grouping threshold or audit result is missing");
  assert(result.v279.title === "Фундамент ключевых слов (Финальный)" && JSON.stringify(result.v279.buttonLabels) === JSON.stringify(["Экспорт CSV", "Импорт CSV/XLS/XLSX с метриками"]), "Per-group final foundation title or controls are wrong");
  assert(result.v279.controls === result.v279.additionalForms + 1 && result.v279.additionalControls === result.v279.additionalForms && !result.v279.pendingHasControl, "Final-foundation controls are missing from a JTBD group or leaked into Pending");
  assert(result.v279.primaryExportRows === result.v279.primaryEntryCount && result.v279.primaryExportAllMembers && result.v279.primaryExportMetricColumns.every((index) => index > 0) && result.v279.topExportRows === result.v279.topExpectedRows, "Group/top metric export does not use the shared format or group membership filter");
  assert(result.v279.apply.matched === 2 && result.v279.apply.matchedInGroup === 1 && result.v279.apply.matchedElsewhere === 1 && result.v279.apply.created === 1 && result.v279.apply.unmatched === 0, "Group metric import did not update existing phrases and create the new valid imported draft");
  assert(result.v279.primaryStored.vol === "901" && result.v279.primaryStored.queryCount === "902" && result.v279.elsewhereStored.vol === "801" && result.v279.elsewhereStored.queryCount === "802", "Group import did not update the unified Demand rows");
  assert(result.v279.primaryDomVolume === "901" && result.v279.demandDomVolume === "901", "Updated metric is not visible in both the JTBD group and common Demand table");
  assert(result.v279.createdStored.vol === "701" && result.v279.createdStored.queryCount === "702" && result.v279.sharedLastImport?.scope === "group" && result.v279.sharedLastImport?.created === 1 && result.v279.sharedUnmatched.length === 0, "Group import did not create the valid imported draft in the shared Demand storage");
  assert(result.v279.demandCountIncreasedByOne && result.v279.membershipUnchanged && result.v279.storageKeysUnchanged, "Group import changed membership or introduced separate group metric storage");
  assert(result.v267.primaryCount === 17 && result.v267.uiBeforeFill.primaryRows === 17 && result.v267.uiBeforeFill.primaryChips === 0 && result.v267.uiBeforeFill.demandBadges === 0, "Primary JTBD phrases were not rendered as Demand rows or a removed chip/badge returned");
  assert(result.v267.uiBeforeFill.primaryGroupCount === 1 && result.v267.uiBeforeFill.primaryImmediatelyAfterMain && result.v267.uiBeforeFill.primaryBeforeAdditional && !result.v267.uiBeforeFill.primaryInsideQueryLevel, "Primary keyword group is duplicated or is not directly below the Main JTBD field");
  assert(result.v267.uiBeforeFill.primaryTitle === "Основная группа ключевых слов, подходящих к JTBD", "Primary keyword group title is wrong");
  assert(JSON.stringify(result.v267.uiBeforeFill.primaryHeaders) === JSON.stringify(["Ключевое слово", "Объём показов/мес", "Примерное количество запросов", "Переходы/мес", "Цена клика, руб.", "Ставка, руб.", "Примерный бюджет, руб."]), "Primary keyword group does not reuse the Demand columns");
  assert(result.v267.uiBeforeFill.primaryEditableControls === 0 && result.v267.uiBeforeFill.primaryMetricsMatchDemand && result.v267.uiBeforeFill.primaryGridAligned, "Primary keyword rows are editable, lost Demand metrics, or no longer align with the Demand grid");
  assert(result.v267.uiBeforeFill.primaryRemoveButtons === result.v267.uiBeforeFill.primaryRows, "A Primary JTBD keyword row is missing its remove button");
  assert(result.v267.uiBeforeFill.primarySortedDescending, "Primary JTBD keyword group is not ordered by descending approximate query count");
  assert(result.v267.uiBeforeFill.pendingAfterAdditional && result.v267.uiBeforeFill.pendingAfterAddButton && result.v267.uiBeforeFill.pendingTitle === "Ждут распределения в JTBD", "Pending-JTBD card is not rendered after the Additional JTBD add button");
  assert(result.v267.uiBeforeFill.pendingRows === 5 && result.v267.uiBeforeFill.pendingRows === result.v267.uiBeforeFill.pendingComputed, "Pending-JTBD card contains the wrong number of unassigned phrases");
  assert(result.v267.uiBeforeFill.pendingSortedDescending && result.v267.uiBeforeFill.pendingMetricsMatchDemand && result.v267.uiBeforeFill.pendingGridAligned && result.v267.uiBeforeFill.pendingEditableControls === 0, "Pending-JTBD rows are not sorted, aligned, read-only Demand rows with matching metrics");
  assert(result.v267.uiBeforeFill.pendingRemoveButtons === result.v267.uiBeforeFill.pendingRows, "A Pending JTBD keyword row is missing its remove button");
  assert(result.v267.uiBeforeFill.pendingPhrases.includes("подарок ручной работы") && !result.v267.uiBeforeFill.pendingPhrases.some((phrase) => result.v267.primaryPhrases.includes(phrase)), "Pending-JTBD card lost the category-only remainder or duplicated a primary phrase");
  for (const [scope, probe] of Object.entries(result.v267.uiBeforeFill.collapsibleLists)) {
    assert(!probe.initial.open && !probe.initial.rowsVisible && probe.initial.totalsVisible && probe.initial.benchmarksVisible, `${scope} JTBD keyword list is not collapsed by default with totals and benchmarks visible`);
    assert(probe.expanded.open && probe.expanded.rowsVisible && probe.expanded.totalsVisible && probe.expanded.benchmarksVisible, `${scope} JTBD keyword list does not expand independently of totals and benchmarks`);
    assert(!probe.collapsedAgain.open && !probe.collapsedAgain.rowsVisible && probe.collapsedAgain.totalsVisible && probe.collapsedAgain.benchmarksVisible, `${scope} JTBD keyword list does not collapse again cleanly`);
    assert(probe.initial.benchmarkItems === 5, `${scope} JTBD does not keep all five benchmark checks visible`);
  }
  assert(JSON.stringify(result.v267.uiBeforeFill.groupTotals.fields) === JSON.stringify(["vol", "queryCount", "forecastClicks", "clickPrice", "bid", "forecastBudget"]), "JTBD group totals do not contain all four sums and both click-weighted metrics");
  assert(result.v267.uiBeforeFill.groupTotals.rows === result.v267.uiBeforeFill.groupTotals.nonEmptyGroups, "A non-empty JTBD group is missing its totals row");
  const sameGroupTotals = (actual, expected) =>
    ["vol", "queryCount", "forecastClicks", "clickPrice", "bid", "forecastBudget"]
      .every((field) => actual?.[field] === expected?.[field]);
  assert(sameGroupTotals(result.v267.uiBeforeFill.groupTotals.primary, result.v267.uiBeforeFill.groupTotals.primaryExpected) && sameGroupTotals(result.v267.uiBeforeFill.groupTotals.pending, result.v267.uiBeforeFill.groupTotals.pendingExpected) && sameGroupTotals(result.v267.uiBeforeFill.groupTotals.additional, result.v267.uiBeforeFill.groupTotals.additionalExpected), "Primary, pending or additional JTBD totals are incorrect");
  assert(result.v267.uiBeforeFill.groupTotals.pendingBenchmarkBlocks === 0 && result.v267.uiBeforeFill.groupTotals.benchmarkBlocks === result.v267.uiBeforeFill.groupTotals.rows - 1 && result.v267.uiBeforeFill.groupTotals.benchmarksImmediatelyAfterTotals, "Pending JTBD still has benchmarks or another JTBD benchmark block is missing");
  assert(result.v277.totals.vol === 48 && result.v277.totals.queryCount === 94 && result.v277.totals.forecastClicks === 6 && result.v277.totals.forecastBudget === 21.6 && result.v277.totals.clickPrice === result.v277.expectedWeightedClickPrice && result.v277.totals.bid === result.v277.expectedWeightedBid && result.v277.ctr === 12.5 && result.v277.ctrStatus === "ready" && result.v277.ctrText.includes("12.5%") && result.v277.ctrText.includes("Здоровый CTR"), "The four-phrase Goat sums, click-weighted metrics, or green 12.5% CTR are wrong");
  assert(result.v277.expectedWeightedClickPrice !== null && result.v277.expectedWeightedBid !== null && result.v277.totalsDom.clickPrice === result.v277.expectedWeightedClickPrice && result.v277.totalsDom.bid === result.v277.expectedWeightedBid, "The totals row does not render the real click-weighted CPC and bid");
  assert(result.v277.reliable === 0 && result.v277.reliabilityText.includes("Фраз с показами ≥ 50: 0 из 4") && result.v277.reliabilityText.includes("Все данные группы ориентировочные, не окончательные"), "The ≥50-impression reliability check is wrong");
  assert(result.v277.lowReliabilityHintAtTwoOfFifteen && result.v277.lowReliabilityHintHiddenAtEightOfFifteen, "The low-reliability interpretation is not conditional at the 50% threshold");
  assert(result.v277.sizeText.includes("Меньше рекомендуемого минимума (5-15 фраз)"), "The under-five phrase warning is missing");
  assert(result.v277.productPrice === 4900 && Math.abs(result.v277.weightedClickPrice - 3.6) < 0.0001 && result.v277.weightedBid === result.v277.expectedWeightedBid && result.v277.priceText.includes("Цена клика ≈ 0.07% от цены товара") && result.v277.priceText.includes("Справочно. Не показывает выгодность") && result.v277.priceHiddenWhenMissing, "The weighted click-price/product-price benchmark, weighted bid, or disclaimer is wrong");
  assert(JSON.stringify(result.v277.anomalyRows) === JSON.stringify(["текстильная коза"]) && result.v277.anomalyTitle === "Запросы есть, а показы отсутствуют — стоит перепроверить вручную в Директе", "The no-impressions Goat anomaly or its narrowed explanation is wrong");
  assert(result.v277.anomalyDefinition.noImpressions && !result.v277.anomalyDefinition.impressionsWithoutClicks && !result.v277.anomalyDefinition.noQueries, "Anomaly detection is not narrowed to queries with zero impressions");
  assert(result.v277.zeroCtrSafe && result.v277.thresholdStatuses.every((entry) => entry.actual === entry.expected), "CTR zero-division protection or traffic-light thresholds are wrong");
  assert(result.v267.dragDrop.initialTargets === 4 && result.v267.dragDrop.initialDraggableRows === 24, "Primary, pending or additional JTBD drag targets/rows are missing");
  assert(result.v267.dragDrop.afterPending.primary === 16 && result.v267.dragDrop.afterPending.pending === 6 && result.v267.dragDrop.afterPending.assignment.target === "pending", "Dragging a primary phrase to Pending did not persist the override");
  assert(result.v267.dragDrop.afterAdditional.primary === 16 && result.v267.dragDrop.afterAdditional.pending === 5 && result.v267.dragDrop.afterAdditional.additional.includes(result.v267.dragDrop.phrase) && result.v267.dragDrop.afterAdditional.groupHasPhrase && result.v267.dragDrop.afterAdditional.renderedRows === 1 && result.v267.dragDrop.afterAdditional.renderedDragSourceAdditionalId === result.v267.migratedLegacy.id && result.v267.dragDrop.afterAdditional.assignment.target === "additional" && result.v267.dragDrop.afterAdditional.persistedAssignment.target === "additional", "Dragging a pending phrase to Additional JTBD №2 did not update and persist its table/link");
  assert(result.v267.dragDrop.afterReturn.primary === 17 && result.v267.dragDrop.afterReturn.pending === 5 && result.v267.dragDrop.afterReturn.additional === 0 && !result.v267.dragDrop.afterReturn.groupStillHasPhrase && result.v267.dragDrop.afterReturn.assignment.target === "primary", "Dragging a phrase from Additional JTBD back to Primary did not cleanly move it");
  assert(result.v267.dragDrop.runtimeErrors.length === 0, "JTBD drag-and-drop raised a runtime error");
  assert(!result.v267.primaryPhrases.includes("подарок ручной работы") && result.v267.primaryPhrases.includes("символ года 2027 купить"), "Primary matching ignored the category exclusion or the 2027 concept");
  assert(JSON.stringify(result.v267.concepts) === JSON.stringify(["необычный", "авторский", "символ", "2027", "коза"]), "The Goat-specific JTBD concept set is wrong");
  assert(result.v267.category === "Дизайнерские подарки" && result.v267.excludedCategoryConcepts.includes("подарки"), "The selected category was not used as the exclusion set");
  assert(result.v267.remainderCount === 7 && result.v267.drafts.length === 3 && result.v267.drafts.every((draft) => draft.phrases.length === 2), "The category-filtered remainder was not clustered correctly");
  assert(result.v267.uiBeforeFill.additionalForms === 2 && result.v267.uiBeforeFill.emptyFields === 3, "Confirming a remainder group did not create one empty three-part JTBD form beside the migrated legacy form");
  assert(JSON.stringify(result.v267.uiBeforeFill.fieldHints) === JSON.stringify(["В какой ситуации у клиента возникает потребность", "Что клиент хочет сделать или получить", "Зачем ему это, какой конечный результат нужен"]), "Additional JTBD field questions do not match the Gate 0 pattern");
  assert(result.v267.uiBeforeFill.unifiedTitle === "Единая формулировка JTBD" && result.v267.uiBeforeFill.unifiedHint === "Когда…, клиент хочет…, чтобы…" && result.v267.uiBeforeFill.unifiedExample.includes("Christensen"), "Additional JTBD unified card is incomplete");
  assert(result.v267.linkedSentence === "Когда Срочно нужна доставка, клиент хочет получить заказ по России, чтобы успеть к нужной дате.", "Additional JTBD unified sentence did not update live");
  assert(result.v267.statsBeforeFill.total === 24 && result.v267.statsBeforeFill.primary === 17 && result.v267.statsBeforeFill.distributed === 2 && result.v267.statsBeforeFill.created === 2 && result.v267.statsBeforeFill.filled === 0, "JTBD-demand statistics before filling are wrong");
  assert(result.v267.statsAfterFill.filled === 1 && !result.v267.statsTextAfterFill, "JTBD-demand data did not update or the retired query-editor summary returned to the UI");
  assert(result.v267.linkedParts.situation === "Срочно нужна доставка" && result.v267.linkedParts.desired_action === "получить заказ по России" && result.v267.linkedParts.result === "успеть к нужной дате", "The linked three-part JTBD form did not save all fields");
  assert(result.v267.migratedLegacy.desired_action === "Старый плоский дополнительный JTBD" && !result.v267.migratedLegacy.situation && !result.v267.migratedLegacy.result, "The flat legacy JTBD was not moved to desired_action");
  assert(result.v267.manualAdd.count === 3 && JSON.stringify(result.v267.manualAdd.fields) === JSON.stringify(["situation", "desired_action", "result"]) && result.v267.manualAdd.allEmpty && result.v267.manualAdd.noPlaceholders && result.v267.manualAdd.hasUnifiedCard && result.v267.manualAdd.fourthGroupBlocked && result.v267.manualAdd.removeWorked, "Manual add/remove or confirmed grouping did not respect the three-form limit or full JTBD pattern");
  assert(result.v267.legacyAdditionalPreserved, "Existing manual additional JTBD values were changed");
  assert(result.v267.log?.status === "completed" && result.v267.log?.runs?.at(-1)?.primary_jtbd_phrases === 17, "V267 audit log is missing the category-filtered Goat matching result");
  assert(result.v267.v268Log?.status === "completed" && result.v267.v268Log?.audit?.flat === 1, "V268 structured-JTBD migration audit is missing the existing flat value");
  assert(result.authorGoat?.vol === "8" && result.authorGoat?.queryCount === "11" && result.authorGoat?.forecastClicks === "2" && result.authorGoat?.clickPrice === "3.50" && result.authorGoat?.bid === "137.40" && result.authorGoat?.forecastBudget === "7.00", "Author-goat metrics are wrong");
  assert(result.wordstatFieldRemoved && !result.wordstatLabelVisible, "Wordstat/trends remains in demand-row data or UI");
  assert(result.demandTrendsRemovalLog?.status === "completed" && result.demandTrendsRemovalLog?.active_ui === "removed", "Wordstat/trends removal audit log is missing");
  assert(result.unmatched.length === 15 && result.unmatched.every((row) => row.reason), "Service rows were not isolated from candidates");
  assert(!result.growthVisible, "Removed demand growth field is still visible");
  assert(result.queryCountLabelVisible && !result.queryCountEditable && result.importedValueVisible, "Imported query-count field is not read-only or visible");
  assert(!result.importedPriceFieldsEditable && result.allImportedMetricsFilled, "Imported clicks/CPC/bid/budget fields are missing or editable");
  assert(result.trafficVolumeLabel === "Импортировано при объёме трафика: 100%", "The shared traffic-volume import label is missing or wrong");
  assert(result.demandViewControlCount === 1 && result.analyticsRowsBeforeSort.length === 20, "Demand table has an unexpected extra view control");
  assert(JSON.stringify(result.descendingCounts) === JSON.stringify([816, 734, 460, 397, 362, 187, 55, 51, 47, 31, 11, 11, 10, 9, 8, 3, 1, 1, 1, 0]), "Descending query-count sort is wrong");
  assert(result.demandGridLayout.headVisible, "Standard demand-table header is missing");
  assert(result.demandGridLayout.headColumns === result.demandGridLayout.rowColumns, "Demand header and rows use different column grids");
  assert(JSON.stringify(result.demandGridLayout.firstRow) === JSON.stringify(result.demandGridLayout.secondRow), "Demand rows do not share aligned column positions");
  assert(new Set(result.demandGridLayout.controlTops).size === 1, "Demand controls do not start on one horizontal line");
  assert(!result.demandGridLayout.repeatedDesktopLabels, "Demand row labels are still repeated on desktop");
  assert(result.viewDidNotMutateRows, "Filter/sort changed stored demand-row order");
  assert(result.lastImport?.header_row === 8 && result.lastImport?.volume_column.includes("показов в месяц") && result.lastImport?.query_count_column.includes("количество запросов") && result.lastImport?.click_price_column.includes("цена клика") && result.lastImport?.bid_column.includes("ставка") && result.lastImport?.monthly_clicks_column.includes("переходов в месяц") && result.lastImport?.budget_column.includes("бюджет") && result.lastImport?.traffic_volume_column.includes("Объём трафика") && result.lastImport?.traffic_volume === "100" && JSON.stringify(result.lastImport?.traffic_volume_values) === JSON.stringify(["100"]) && !result.lastImport?.traffic_volume_anomaly, "Import diagnostics do not record detected columns or the shared traffic volume");
  assert(result.firstJtbd === "Первый живой JTBD" && result.secondJtbd.includes("символом 2027 года"), "Main JTBD is not a live Gate 0 read");
  assert(!result.pickerUiPresent && result.pickerUiOptions.length === 0 && !result.renderedMainAfterPick && result.renderedRelatedAfterPick.length === 0, "The retired Demand picker or query inputs returned to the UI");
  assert(result.companyBeforeProduct, "Company semantics is not before the selected product content");
  assert(result.companyBetweenSystemDividers && result.companySectionCount === 1 && result.companyIsDirectGateChild && !result.companyInsideSeoAudit && !result.companyInsideProductStrategy && !result.companyInsideProductAccordion, "Company semantics is duplicated, nested under SEO audit, or still rendered inside Product / Service");
  assert(result.companyBrandLabel === "Уровень 1 — Брендовый", "The project-wide brand field did not regain its semantic-level label");
  assert(JSON.stringify(result.companyBrandLines) === JSON.stringify(["бренд альфа", "общий дубль", "общий дубль", "бренд бета"]), "Direction brand phrases were not merged line-by-line with duplicates preserved");
  assert(!result.activeBrandInputs && !result.activePageInputs && !result.activeBrandValues.length && !result.activePageValues.length, "Removed semantic levels are still active");
  assert(result.shirtPageArchive?.lines?.length === 7, "Filled Shirt page semantics was not preserved in the legacy archive");
  assert(result.semanticCleanupLog?.status === "completed" && result.semanticCleanupLog.runs?.some((run) => run.brand_lines_moved === 4) && result.semanticCleanupLog.runs?.some((run) => run.page_lines_archived === 7), "Semantic cleanup audit log is incomplete");
  assert(result.brandLevelVisible && !result.pageLevelVisible && result.gate4ChannelVisible, "The restored Branded level, removed Page level, or untouched Gate 4 channel has the wrong visibility");
  assert(result.directProductCount === 1, `Expected one direct selected-product view, got ${result.directProductCount}`);
  assert(!result.directionWrapperCount && !result.nestedProductAccordionCount && !result.directionToggleCount, "Direction/product wrappers or the show-all toggle are still rendered");
  assert(!result.directionLanguageVisible && !result.directionLandingVisible, "Direction wording or direction landing is still visible in the demand screen");
  assert(!result.directLabels.includes("Посадочная товара") && result.directLabels.includes("Уровень 2 — Основной и дополнительные JTBD") && !result.directLabels.includes("Уровень 2 — Главный запрос + Ключевые фразы") && result.directLabels.includes("Спрос"), "The landing/query rudiment returned or the direct Demand → JTBD content is incomplete");
  assert(result.selectedProductCompletion.status === "ready" && result.selectedProductCompletion.completed === 3 && result.selectedProductCompletion.total === 3 && result.selectedProductCompletion.foundationReady && result.selectedProductCompletion.demandReady && result.selectedProductCompletion.jtbdReady && !("queryReady" in result.selectedProductCompletion) && result.selectedProductSectionStatus === "ready" && result.selectedProductProgressText.includes("3 из 3 блоков готово") && result.painSectionStatusText === "Готово", "The filled selected product is not reported as ready by the three active Gate 1 blocks");
  assert(result.gate0LandingsCount === 6 && result.gate0LandingsUntouched, "Gate 0 direction landings changed while rendering Gate 1");
  assert(result.directLog?.status === "completed" && result.directLog.gate0_storage?.includes("не изменялось") && result.directLog.hidden_from_gate1?.includes("Уровень 2 — Главный запрос + Ключевые фразы") && !result.directLog.restored_to_gate1, "Direct product-view audit log does not record the retired query editor as hidden");
  assert(result.log?.status === "completed", "Audit log missing");
} finally {
  page?.close();
  browser?.close();
}
