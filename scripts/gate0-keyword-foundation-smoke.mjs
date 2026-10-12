import { readFile } from "node:fs/promises";

const sourceExportPath =
  process.env.GURU_GATE0_SOURCE_EXPORT ||
  "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9337";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate0-keyword-foundation-smoke";
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
        ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmokeTest: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }))
        : nativeFetch(input, init);
    }`,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(page, 'typeof bootstrapAppOnce === "function"');

  const fixture = structuredClone(source);
  fixture.project = { ...fixture.project, id: projectId };
  await evaluate(
    page,
    `(() => {
      localStorage.clear();
      localStorage.setItem("guru-platform-access-v01", "unlocked");
      localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
        id: ${JSON.stringify(projectId)},
        name: "Gate 0 keyword foundation smoke",
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
      guruNavigateToGate("gate-0");
      await new Promise((resolve) => setTimeout(resolve, 80));
      renderGate();
      const painBefore = JSON.stringify(state.painV130);
      const fields = [...document.querySelectorAll("[data-gate0-scope-field-row]")]
        .map((element) => element.dataset.gate0ScopeFieldRow);
      const offerIndex = fields.indexOf("offers");
      const foundationIndex = fields.indexOf("keyword_foundation");
      const generate = document.querySelector("[data-gate0-keyword-foundation-generate]");
      generate?.click();
      let record = guruV247KeywordFoundationRecord(product, false, state);
      const firstEntries = structuredClone(record?.keywords || []);
      const firstValues = firstEntries.map(guruV247KeywordText).filter(Boolean);
      const firstCount = firstValues.length;

      document.querySelector("[data-gate0-keyword-foundation-generate]")?.click();
      record = guruV247KeywordFoundationRecord(product, false, state);
      const afterRepeat = record.keywords.map(guruV247KeywordText).filter(Boolean);
      const normalizedAfterRepeat = afterRepeat.map(guruV247KeywordNormalize);
      const confirmButton = document.querySelector("[data-gate0-keyword-foundation-confirm]");
      const confirmedIndex = Number(confirmButton?.dataset.gate0KeywordFoundationConfirm);
      const confirmedId = record.keywords[confirmedIndex]?.id || "";
      confirmButton?.click();
      record = guruV247KeywordFoundationRecord(product, false, state);
      const confirmedEntry = structuredClone(
        record.keywords.find((keyword) => keyword.id === confirmedId),
      );

      const uspInput = document.querySelector('[data-gate0-scope-record-field="usp_unified"]');
      if (!uspInput) throw new Error("Goat USP input missing");
      uspInput.value = String(uspInput.value) + " smoke-изменение";
      uspInput.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
      const staleDrafts = document.querySelectorAll(
        '.gate0-keyword-foundation-row-v247.is-draft.is-stale .gate0-keyword-stale-v247'
      ).length;
      const confirmedRow = document.querySelector(
        '[data-gate0-keyword-foundation-row="' + CSS.escape(confirmedId) + '"]'
      );
      const panelCard = [...document.querySelectorAll(
        ".guru-strategic-foundation-v237 .guru-strategic-card-v245"
      )].find((card) => card.querySelector("strong")?.textContent.trim() === "Фундамент ключевых слов");
      const panelTarget = panelCard?.dataset.g4JumpTarget
        ? JSON.parse(panelCard.dataset.g4JumpTarget)
        : null;
      const panelValue = panelCard?.querySelector(".guru-strategic-card-value-v245")?.textContent.trim() || "";
      const sourceFound = panelTarget ? Boolean(g3ProductJourneyFindSource(panelTarget)) : false;
      panelCard?.click();
      await new Promise((resolve) => setTimeout(resolve, 30));
      const sourceHighlighted = Boolean(document.querySelector(
        '[data-gate0-scope-field-row="keyword_foundation"].guru-source-target-v212'
      ));
      document.querySelector("[data-gate0-keyword-foundation-add]")?.click();
      const manualInputs = [...document.querySelectorAll("[data-gate0-keyword-foundation-input]")];
      const manualInput = manualInputs[manualInputs.length - 1];
      manualInput.value = "ручная тестовая фраза";
      manualInput.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 0));
      record = guruV247KeywordFoundationRecord(product, false, state);
      const manualEntry = structuredClone(record.keywords[record.keywords.length - 1]);
      const exportedCsv = guruV248KeywordFoundationCsv(record.keywords);
      const parsedOwn = guruV248ParseKeywordCsv(exportedCsv);
      const beforeOwnAdd = record.keywords.length;
      guruV248OpenKeywordImportDialog(product, parsedOwn, "own.csv");
      document.querySelector('[data-gate0-keyword-import-mode="add"]')?.click();
      record = guruV247KeywordFoundationRecord(product, false, state);
      const afterOwnAdd = record.keywords.length;

      const parsedExternal = guruV248ParseKeywordCsv(
        "ключевая фраза\\nновая импортированная фраза\\nВТОРАЯ ИМПОРТИРОВАННАЯ ФРАЗА\\nНовая импортированная фраза\\n\\n"
      );
      guruV248OpenKeywordImportDialog(product, parsedExternal, "external.csv");
      document.querySelector('[data-gate0-keyword-import-mode="add"]')?.click();
      record = guruV247KeywordFoundationRecord(product, false, state);
      const externalEntries = record.keywords.filter((entry) =>
        ["новая импортированная фраза", "вторая импортированная фраза"].includes(
          guruV247KeywordNormalize(guruV247KeywordText(entry))
        )
      ).map((entry) => structuredClone(entry));

      const beforeReplaceValues = record.keywords.map(guruV247KeywordText);
      const confirmedBeforeReplace = guruV247KeywordFoundationStats(product, state).confirmed;
      const replacement = guruV248ParseKeywordCsv("замена один\\nзамена два");
      let warningMessage = "";
      window.confirm = (message) => { warningMessage = String(message); return false; };
      guruV248OpenKeywordImportDialog(product, replacement, "replace.csv");
      document.querySelector('[data-gate0-keyword-import-mode="replace"]')?.click();
      record = guruV247KeywordFoundationRecord(product, false, state);
      const cancelPreserved = JSON.stringify(beforeReplaceValues) === JSON.stringify(
        record.keywords.map(guruV247KeywordText)
      );
      window.confirm = (message) => { warningMessage = String(message); return true; };
      document.querySelector('[data-gate0-keyword-import-mode="replace"]')?.click();
      record = guruV247KeywordFoundationRecord(product, false, state);
      const replacedEntries = record.keywords.map((entry) => structuredClone(entry));
      const panelAfterImportCard = [...document.querySelectorAll(
        ".guru-strategic-foundation-v237 .guru-strategic-card-v245"
      )].find((card) => card.querySelector("strong")?.textContent.trim() === "Фундамент ключевых слов");
      const panelAfterImport = panelAfterImportCard
        ?.querySelector(".guru-strategic-card-value-v245")?.textContent.trim() || "";
      const panelKeywordRows = [...(panelAfterImportCard?.querySelectorAll(
        ".guru-strategic-keyword-v249"
      ) || [])].map((row) => row.textContent.trim());

      let downloaded = null;
      downloadText = (filename, text) => { downloaded = { filename, text }; };
      document.querySelector("[data-gate0-keyword-foundation-export]")?.click();
      await new Promise((resolve) => setTimeout(resolve, 650));
      const persistedWorkspace = JSON.parse(localStorage.getItem(
        WORKSPACE_STORAGE_PREFIX + ${JSON.stringify(projectId)}
      ));
      const persistedRecord = persistedWorkspace?.project?.gate0ScopedValuesV194?.find((item) =>
        item.field === "keyword_foundation" && item.product_id === product.id
      );
      const records = guruV194Records(state).filter(
        (item) => item.field === "keyword_foundation",
      );
      return {
        orderCorrect: offerIndex >= 0 && foundationIndex === offerIndex + 1,
        firstCount,
        examples: firstValues.slice(0, 5),
        firstAllGeneratedDraft: firstEntries.every(
          (entry) => entry.source === "generated" && entry.status === "draft",
        ),
        wordCounts: firstValues.map((value) => guruV247KeywordTokens(value).length),
        repeatAdded: afterRepeat.length - firstCount,
        uniqueAfterRepeat: new Set(normalizedAfterRepeat).size === normalizedAfterRepeat.length,
        confirmedEntry,
        staleDrafts,
        confirmedStale: Boolean(confirmedRow?.classList.contains("is-stale")),
        total: afterRepeat.length,
        panelValue,
        panelTarget,
        sourceFound,
        sourceHighlighted,
        manualEntry,
        csvHeader: exportedCsv.split(/\\r?\\n/)[0],
        ownRoundTrip: parsedOwn,
        beforeOwnAdd,
        afterOwnAdd,
        externalEntries,
        confirmedBeforeReplace,
        warningMessage,
        cancelPreserved,
        replacedEntries,
        panelAfterImport,
        panelKeywordRows,
        downloaded,
        persistedEntries: persistedRecord?.keywords || [],
        productScopedOnly: records.every(
          (item) => item.scope === "product" && item.product_id === product.id,
        ),
        painUnchanged: painBefore === JSON.stringify(state.painV130),
      };
    })()`,
  );

  assert(result.orderCorrect, "Keyword foundation is not directly after Offer");
  assert(result.firstCount > 0 && result.firstCount <= 15, `Invalid first generation count: ${result.firstCount}`);
  assert(result.firstAllGeneratedDraft, "Generated entries are not generated/draft");
  assert(result.wordCounts.every((count) => count >= 2 && count <= 4), "A candidate is not a 2–4 word n-gram");
  assert(result.uniqueAfterRepeat, "Repeated generation created duplicates");
  assert(
    result.confirmedEntry?.source === "generated" && result.confirmedEntry?.status === "confirmed",
    "Confirmation changed source or did not set confirmed",
  );
  assert(result.staleDrafts > 0, "Drafts were not marked stale after USP change");
  assert(!result.confirmedStale, "Confirmed phrase was incorrectly marked stale");
  assert(
    result.panelValue === `${result.total} предложено, 1 подтверждено`,
    `Unexpected strategic panel summary: ${result.panelValue}`,
  );
  assert(
    result.panelTarget?.gateId === "gate-0" &&
      result.panelTarget?.field === "keyword_foundation" &&
      result.sourceFound &&
      result.sourceHighlighted,
    "Strategic panel does not point to the Gate 0 keyword foundation",
  );
  assert(
    result.manualEntry?.value === "ручная тестовая фраза" &&
      result.manualEntry?.source === "manual" &&
      result.manualEntry?.status === "confirmed",
    "Manually added phrase is not manual/confirmed",
  );
  assert(result.csvHeader === "phrase,source,status", `Unexpected CSV header: ${result.csvHeader}`);
  assert(result.ownRoundTrip?.format === "guru", "Own CSV format was not recognized");
  assert(
    result.ownRoundTrip.entries.some((entry) => entry.source === "generated" && entry.status === "confirmed") &&
      result.ownRoundTrip.entries.some((entry) => entry.source === "manual" && entry.status === "confirmed"),
    "Own CSV did not preserve source/status",
  );
  assert(result.afterOwnAdd === result.beforeOwnAdd, "Own CSV add created duplicates");
  assert(
    result.externalEntries.length === 2 &&
      result.externalEntries.every((entry) => entry.source === "imported" && entry.status === "draft"),
    "External CSV was not deduplicated as imported/draft",
  );
  assert(result.cancelPreserved, "Cancelled replacement changed confirmed data");
  assert(
    result.warningMessage === `Заменить удалит ${result.confirmedBeforeReplace} уже подтверждённых слов — продолжить?`,
    `Unexpected replacement warning: ${result.warningMessage}`,
  );
  assert(
    result.replacedEntries.length === 2 &&
      result.replacedEntries.every((entry) => entry.source === "imported" && entry.status === "draft"),
    "Confirmed replacement did not fully replace the list",
  );
  assert(result.panelAfterImport === "2 предложено, 0 подтверждено", `Panel count did not include imported entries: ${result.panelAfterImport}`);
  assert(
    JSON.stringify(result.panelKeywordRows) === JSON.stringify([
      "замена один",
      "замена два",
    ]),
    `Strategic panel does not show imported phrases: ${JSON.stringify(result.panelKeywordRows)}`,
  );
  assert(
    result.downloaded?.text?.startsWith("phrase,source,status") && result.downloaded.filename.endsWith(".csv"),
    "Export button did not download the current list as CSV",
  );
  assert(
    result.persistedEntries.length === 2 &&
      result.persistedEntries.every((entry) => entry.source === "imported" && entry.status === "draft"),
    `Imported replacement was not persisted in product-scoped storage: ${JSON.stringify(result.persistedEntries)}`,
  );
  assert(result.productScopedOnly, "Keyword foundation record is not strictly product-scoped");
  assert(result.painUnchanged, "painV130 changed during Gate 0 keyword foundation workflow");

  console.log(JSON.stringify({ status: "ok", ...result }, null, 2));
} finally {
  page?.close();
  browser?.close();
}
