import { readFile } from "node:fs/promises";

const sourceExportPath =
  process.env.GURU_GATE1_SOURCE_EXPORT ||
  "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const forecastPath =
  process.env.GURU_GATE1_NEW_PHRASES_XLS ||
  "/Users/vl/Downloads/forecast.9808.xls";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9360";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate1-imported-candidates-smoke";
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
  await page.call("Page.addScriptToEvaluateOnNewDocument", {
    source: xlsxBrowserSource,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(page, 'typeof bootstrapAppOnce === "function"');
  await waitFor(page, "Boolean(window.XLSX)");

  const fixture = structuredClone(source);
  fixture.project = { ...fixture.project, id: projectId };
  await evaluate(
    page,
    `(() => {
      localStorage.clear();
      localStorage.setItem("guru-platform-access-v01", "unlocked");
      localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
        id: ${JSON.stringify(projectId)},
        name: "Imported candidates smoke",
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
  await waitFor(page, `document.querySelector('[data-open-project="${projectId}"]')`);
  await evaluate(
    page,
    `document.querySelector('[data-open-project="${projectId}"]').click(); true`,
  );
  await waitFor(page, `activeProjectId === ${JSON.stringify(projectId)} && Boolean(state)`);
  await wait(500);

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
      const pageSource = g3ProductJourneyPageSource(product);
      if (!pageSource?.row) throw new Error("Goat Gate 1 page missing");
      let gate0 = guruV247KeywordFoundationRecord(product, true, state);
      let middle = guruGate1MiddleRecordV257(pageSource.row, true);

      gate0.keywords = [];
      middle.keywords = [];
      guruNavigateToGate("gate-1");
      renderGate();
      const importEnabledWithoutConfirmed = !document.querySelector(
        "[data-gate1-final-import-v259]",
      )?.disabled;

      const binary = atob(${JSON.stringify(forecastBase64)});
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const file = new File([bytes], "forecast.9808.xls", {
        type: "application/vnd.ms-excel",
      });
      const parsed = await guruGate1FinalReadMetricsFileV260(file);
      const overlap = ["интерьерная игрушка коза", "интерьерная коза"];
      const byPhrase = new Map(parsed.rows.map((row) => [row.key, row]));
      gate0 = guruV247KeywordFoundationRecord(product, true, state);
      middle = guruGate1MiddleRecordV257(pageSource.row, true);
      gate0.keywords = overlap.map((phrase) =>
        guruV247KeywordEntry({ value: phrase, source: "generated", status: "confirmed" }),
      );
      middle.keywords = [];
      const context = guruGate1FinalPainContextV259(product, true);
      context.itemData.demandRows = overlap.map((phrase) => ({
        kw: phrase,
        vol: "",
        queryCount: "",
        forecastClicks: "",
        clickPrice: "",
        bid: "",
        forecastBudget: "",
        originStage: "gate1",
      }));

      const applied = guruGate1FinalApplyMetricsV259(product, parsed, file.name);
      const firstLog = structuredClone(
        state.project._gate1ProductIdMigrationLog?.find(
          (entry) => entry.id === GATE1_IMPORTED_CANDIDATES_V280,
        ) || null,
      );
      const importedDrafts = middle.keywords
        .map((entry) => guruV247KeywordEntry(entry))
        .filter((entry) => entry.source === "imported" && entry.status === "draft");
      const demandByKey = new Map(context.itemData.demandRows.map((row) => [
        guruV247KeywordNormalize(row.kw),
        structuredClone(row),
      ]));
      const metric = (phrase) => demandByKey.get(guruV247KeywordNormalize(phrase)) || null;
      const realKeys = new Set(parsed.rows.map((row) => row.key));
      const unmatched = structuredClone(
        context.itemData.finalKeywordFoundationV259?.unmatched || [],
      );
      renderGate();
      const middleRows = [...document.querySelectorAll("[data-gate1-middle-keyword-row]")];
      const visibleImportedDrafts = middleRows.filter((row) =>
        row.querySelector(".gate0-keyword-source-v247")?.textContent.trim() === "Импортировано" &&
        row.querySelector(".gate0-keyword-status-v247")?.textContent.trim() === "Черновик" &&
        row.querySelector("[data-gate1-middle-keyword-confirm]"),
      ).length;
      const unmatchedDetails = document.querySelector("[data-gate1-final-unmatched-v259]");
      const uiProbe = {
        unmatchedCollapsed: Boolean(unmatchedDetails && !unmatchedDetails.open),
        unmatchedSummary: unmatchedDetails?.querySelector("summary")?.textContent.trim() || "",
        unmatchedContainsRealPhrase: [...(unmatchedDetails?.querySelectorAll("span") || [])]
          .some((node) => realKeys.has(guruV247KeywordNormalize(node.textContent))),
        visibleImportedDrafts,
      };

      const candidateCountBeforeRepeat = gate0.keywords.length + middle.keywords.length;
      const demandCountBeforeRepeat = context.itemData.demandRows.length;
      const repeated = guruGate1FinalApplyMetricsV259(product, parsed, file.name);
      const repeatedProbe = {
        matched: repeated.matched,
        created: repeated.created,
        unmatched: repeated.unmatched,
        candidateCountUnchanged:
          gate0.keywords.length + middle.keywords.length === candidateCountBeforeRepeat,
        demandCountUnchanged:
          context.itemData.demandRows.length === demandCountBeforeRepeat,
      };
      context.itemData.semL3Groups = [];
      context.itemData.jtbdKeywordAssignmentsV274 = {};
      guruGate1EnsureAdditionalJtbdsV268(context.itemData);
      const additional = guruGate1AdditionalJtbdEntryV268(null, {
        source: "manual",
      });
      context.itemData.semL4Model.additionalJtbds = [additional];
      overlap.forEach((phrase) => {
        guruGate1AssignDemandPhraseV274(
          product.id,
          context.itemData,
          guruV247KeywordNormalize(phrase),
          "additional",
          additional.id,
        );
      });
      const groupEntriesBefore = guruGate1AdditionalJtbdDemandV274(
        product.id,
        context.itemData,
        additional.id,
      ).map((entry) => ({
        demandRow: entry.row,
        index: entry.order,
        originStage: "gate1",
      }));
      const groupApplied = guruGate1GroupApplyMetricsV279(
        product.id,
        context.itemData,
        groupEntriesBefore,
        parsed,
        file.name,
        { scope: "additional", groupId: additional.id },
      );
      const groupedPhrases = guruGate1AdditionalJtbdDemandV274(
        product.id,
        context.itemData,
        additional.id,
      ).map((entry) => entry.key);
      const middleAfterAdditionalAssignment = guruGate1MiddleStatsV257(
        pageSource.row,
      );
      const strategicAfterAdditionalAssignment =
        guruStrategicFoundationContextV237(product);
      renderGate();
      const groupNode = document.querySelector(
        '[data-pv181-additional-jtbd-keywords-v274="' + CSS.escape(additional.id) + '"]',
      );
      const groupResultText = groupNode?.querySelector(
        ".gate1-group-final-result-v280",
      )?.textContent.trim() || "";
      const removePhrase = "декоративная коза купить";
      const removeKey = guruV247KeywordNormalize(removePhrase);
      const removeButton = groupNode?.querySelector(
        '[data-pv181-jtbd-keyword-drag-v274="' + CSS.escape(removeKey) + '"] [data-pv181-demand-remove]',
      );
      const openGroupDetails = groupNode?.querySelector(
        "[data-pv181-jtbd-demand-details-v278]",
      );
      if (openGroupDetails) openGroupDetails.open = true;
      const demandCountBeforeRemove = context.itemData.demandRows.length;
      removeButton?.click();
      const afterRemoveContext = guruGate1FinalPainContextV259(product, false);
      const remainingDemandKeys = afterRemoveContext.itemData.demandRows.map((row) =>
        guruV247KeywordNormalize(row.kw),
      );
      const remainingGroupKeys = guruGate1AdditionalJtbdDemandV274(
        product.id,
        afterRemoveContext.itemData,
        additional.id,
      ).map((entry) => entry.key);
      const rerenderedGroupDetails = document.querySelector(
        '[data-pv181-additional-jtbd-keywords-v274="' + CSS.escape(additional.id) + '"] [data-pv181-jtbd-demand-details-v278]',
      );
      const removeProbe = {
        buttonFound: Boolean(removeButton),
        demandPreserved:
          afterRemoveContext.itemData.demandRows.length === demandCountBeforeRemove &&
          remainingDemandKeys.includes(removeKey),
        groupRemoved: !remainingGroupKeys.includes(removeKey),
        movedToPending:
          afterRemoveContext.itemData.jtbdKeywordAssignmentsV274?.[removeKey]?.target === "pending",
        renderedOutsideGroup:
          !document.querySelector(
            '[data-pv181-additional-jtbd-keywords-v274="' + CSS.escape(additional.id) + '"] [data-pv181-jtbd-keyword-drag-v274="' + CSS.escape(removeKey) + '"]',
          ) && Boolean(document.querySelector(
            '[data-pv181-pending-jtbd-card-v273] [data-pv181-jtbd-keyword-drag-v274="' + CSS.escape(removeKey) + '"]',
          )),
        groupStayedOpen: Boolean(rerenderedGroupDetails?.open),
      };
      return {
        parsedRows: parsed.rows.length,
        serviceRows: parsed.serviceRows.length,
        serviceReasons: parsed.serviceRows.reduce((result, row) => {
          result[row.reason] = (result[row.reason] || 0) + 1;
          return result;
        }, {}),
        applied: {
          matched: applied.matched,
          created: applied.created,
          unmatched: applied.unmatched,
        },
        importedDrafts: importedDrafts.map((entry) => entry.value).sort(),
        decorativeGoat: metric("декоративная коза"),
        goatForHome: metric("коза для дома"),
        existingInteriorGoat: metric("интерьерная коза"),
        unmatched,
        ui: uiProbe,
        importEnabledWithoutConfirmed,
        repeated: repeatedProbe,
        groupImport: {
          matched: groupApplied.matched,
          matchedInGroup: groupApplied.matchedInGroup,
          matchedElsewhere: groupApplied.matchedElsewhere,
          assignedToGroup: groupApplied.assignedToGroup,
          created: groupApplied.created,
          phrasesBefore: groupEntriesBefore.length,
          phrasesAfter: groupedPhrases.length,
          containsEveryImportedPhrase:
            parsed.rows.every((row) => groupedPhrases.includes(row.key)),
          renderedRows: groupNode?.querySelectorAll(
            ".pv181-additional-jtbd-demand-rows-v274 .pv181-demand-row",
          ).length || 0,
          resultText: groupResultText,
          importEnabled: !groupNode?.querySelector(
            "[data-gate1-group-final-import-v279]",
          )?.disabled,
          middleRawCount: middle.keywords.length,
          middleVisibleCount: middleAfterAdditionalAssignment.total,
          middleExcludedAdditional:
            middleAfterAdditionalAssignment.excludedAdditional,
          strategicMiddleCount:
            strategicAfterAdditionalAssignment.middleKeywordFoundationItems.length,
        },
        removeProbe,
        log: firstLog,
        overlapPresent: overlap.every((phrase) => byPhrase.has(guruV247KeywordNormalize(phrase))),
      };
    })()`,
  );

  console.log(JSON.stringify(result, null, 2));
  assert(result.importEnabledWithoutConfirmed, "Metric import is disabled without confirmed candidates");
  assert(result.parsedRows === 15, `Expected 15 real data rows, got ${result.parsedRows}`);
  assert(result.serviceRows === 15, `Expected 15 service rows, got ${result.serviceRows}`);
  assert(result.overlapPresent, "Expected existing overlap phrases are absent from forecast");
  assert(
    result.applied.matched === 2 && result.applied.created === 13 && result.applied.unmatched === 15,
    `Expected 2 updated, 13 created and 15 service rows; got ${JSON.stringify(result.applied)}`,
  );
  assert(result.importedDrafts.length === 13, "Imported drafts were not written to Gate 1 middle foundation");
  assert(
    result.decorativeGoat?.queryCount === "203" &&
      result.decorativeGoat?.vol === "93" &&
      result.decorativeGoat?.forecastClicks === "4" &&
      result.decorativeGoat?.clickPrice === "10.50" &&
      result.decorativeGoat?.bid === "223.00" &&
      result.decorativeGoat?.forecastBudget === "42.00",
    "Decorative-goat metrics are wrong",
  );
  assert(
    result.goatForHome?.queryCount === "171" &&
      result.goatForHome?.vol === "129" &&
      result.goatForHome?.forecastClicks === "24" &&
      result.goatForHome?.clickPrice === "31.30" &&
      result.goatForHome?.bid === "877.40" &&
      result.goatForHome?.forecastBudget === "751.20",
    "Goat-for-home metrics are wrong",
  );
  assert(result.existingInteriorGoat?.queryCount === "11", "Existing candidate was not updated");
  assert(
    result.unmatched.length === 15 &&
      result.unmatched.every((row) => ["metadata", "header", "total", "footer", "invalid_metrics", "missing_phrase"].includes(row.reason)),
    "Unmatched pool contains a real valid phrase or lacks service-row reasons",
  );
  assert(
    result.ui.visibleImportedDrafts === 13 &&
      result.ui.unmatchedCollapsed &&
      result.ui.unmatchedSummary === "Не сопоставлено: 15" &&
      !result.ui.unmatchedContainsRealPhrase,
    "Imported draft or unmatched UI is wrong",
  );
  assert(
    result.repeated.matched === 15 && result.repeated.created === 0 &&
      result.repeated.unmatched === 15 && result.repeated.candidateCountUnchanged &&
      result.repeated.demandCountUnchanged,
    "Repeated import created duplicates or duplicate Demand rows",
  );
  assert(
    result.groupImport.middleRawCount === 13 &&
      result.groupImport.middleVisibleCount === 0 &&
      result.groupImport.middleExcludedAdditional === 13 &&
      result.groupImport.strategicMiddleCount === 0,
    "Additional JTBD phrases leaked into the middle keyword foundation",
  );
  assert(
    result.log?.last_run?.created_imported_drafts === 13 &&
      result.log?.last_run?.unmatched_service_rows === 15 &&
      result.log?.last_run?.created_candidates?.length === 13,
    "V280 audit log is missing the import result",
  );
  assert(
    result.groupImport.phrasesBefore === 2 &&
      result.groupImport.matched === 15 &&
      result.groupImport.matchedInGroup === 2 &&
      result.groupImport.matchedElsewhere === 13 &&
      result.groupImport.assignedToGroup === 13 &&
      result.groupImport.created === 0 &&
      result.groupImport.phrasesAfter === 15 &&
      result.groupImport.containsEveryImportedPhrase &&
      result.groupImport.renderedRows === 15 &&
      result.groupImport.importEnabled &&
      result.groupImport.resultText.includes("метрики обновлены у 15") &&
      result.groupImport.resultText.includes("добавлено или перенесено в эту группу 13"),
    `Additional JTBD group did not receive imported phrases and metrics: ${JSON.stringify(result.groupImport)}`,
  );
  assert(
    result.removeProbe.buttonFound &&
      result.removeProbe.demandPreserved &&
      result.removeProbe.groupRemoved &&
      result.removeProbe.movedToPending &&
      result.removeProbe.renderedOutsideGroup &&
      result.removeProbe.groupStayedOpen,
    `Keyword remove button is not functional: ${JSON.stringify(result.removeProbe)}`,
  );
  console.log("Gate 1 imported-candidates smoke: PASS");
} finally {
  try {
    if (page) await page.call("Target.closeTarget");
  } catch {}
  page?.close();
  browser?.close();
}
