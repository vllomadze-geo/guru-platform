import { readFile } from "node:fs/promises";

const sourceExportPath =
  process.env.GURU_GATE4_SOURCE_EXPORT || "/Users/vl/Downloads/gate-4.json";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9337";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const smokeProjectId = "gate4-readiness-product-smoke";
const goatId = "catalog-item-1786792591872-51f503";
const shirtId = "catalog-item-1786792591872-c8b1e9";
const card152RowKey =
  "проверить_что_на_странице_есть_оффер_для_кого_в_чем_польза_почему_доверять_примеры_кейсы_cta_контакты_форма";
const goatSentinel = "goat-card-152-sentinel";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const uniqueCardIds = [
  "card-147",
  "card-148",
  "card-149",
  "card-150",
  "card-151",
  "card-152",
  "card-153",
  "card-154",
  "card-160",
  "card-161",
  "card-162",
  "card-163",
  "card-164",
  "card-165",
  "card-166",
  "card-167",
  "card-168",
  "card-169",
];
const companyCardIds = [
  "card-155",
  "card-156",
  "card-157",
  "card-158",
  "card-159",
];
const readinessCardIds = [...uniqueCardIds, ...companyCardIds];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
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
const sourceCards = (sourceExport.gate?.cards || []).filter((card) =>
  readinessCardIds.includes(card.id),
);
const sourceById = new Map(sourceCards.map((card) => [card.id, card]));
const sourceRows = sourceCards.flatMap((card) => card.instructionRows || []);
const uniqueRows = uniqueCardIds.flatMap(
  (cardId) => sourceById.get(cardId)?.instructionRows || [],
);
const methodHintRows = sourceRows.filter(
  (row) => row.key === "итоговый_результат_блока" && String(row.comment || "").trim(),
);
assert(sourceCards.length === 23, `Expected 23 legacy readiness cards, got ${sourceCards.length}`);
assert(sourceRows.length === 62, `Expected 62 legacy instruction rows, got ${sourceRows.length}`);
assert(uniqueRows.length === 45, `Expected 45 product-card rows, got ${uniqueRows.length}`);
assert(
  sourceRows.every(
    (row) =>
      !String(row.status || "").trim() &&
      !String(row.result || "").trim() &&
      !String(row.link || "").trim(),
  ),
  "Legacy preimage unexpectedly contains status/result/link user values",
);
assert(
  sourceRows.every(
    (row) =>
      !String(row.comment || "").trim() ||
      row.key === "итоговый_результат_блока",
  ),
  "Legacy preimage unexpectedly contains a non-method comment",
);
assert(methodHintRows.length === 21, `Expected 21 method-hint rows, got ${methodHintRows.length}`);
assert(sourceById.get("card-152")?.instructionRows?.length === 3, "card-152 must have three rows");
assert(
  sourceById
    .get("card-152")
    ?.instructionRows?.some((row) => row.key === card152RowKey),
  "card-152 test row key is missing from the source export",
);

const sourceProject = sourceExport.content?.project || {};
const catalogItems = sourceProject.catalogItemsV189 || [];
const goat = catalogItems.find((item) => item.id === goatId);
const shirt = catalogItems.find((item) => item.id === shirtId);
assert(goat?.name === "Символ 2027 года «Коза»", "Goat product fixture is missing");
assert(shirt?.name === "Рубашка Upcycling с кружевом", "Shirt product fixture is missing");

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
      response.exceptionDetails.exception?.description || response.exceptionDetails.text,
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
  assert(pageTarget?.webSocketDebuggerUrl, "Could not find the isolated Chrome target");
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
      name: "Gate 4 readiness product smoke",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));
    return true;
  })()`);
  await page.call("Page.reload", { ignoreCache: true });
  await wait(800);
  await waitFor('document.readyState === "complete"');
  await waitFor('typeof bootstrapAppOnce === "function"');
  await waitFor(`document.querySelector('[data-open-project="${smokeProjectId}"]')`);
  await evaluate(`document.querySelector('[data-open-project="${smokeProjectId}"]').click(); true`);
  await waitFor(`activeProjectId === ${JSON.stringify(smokeProjectId)} && Boolean(state)`);

  const serializedProject = JSON.stringify(sourceProject);
  const serializedCards = JSON.stringify(sourceCards);
  const rawImport = await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const fixtureProject = ${serializedProject};
    const fixtureCards = ${serializedCards};
    state.project = {
      ...state.project,
      ...structuredClone(fixtureProject),
      id: ${JSON.stringify(smokeProjectId)},
    };
    const gate4 = state.gates.find((gate) => gate.id === "gate-4");
    const fixtureById = new Map(fixtureCards.map((card) => [card.id, card]));
    gate4.cards = gate4.cards.map((card) =>
      fixtureById.has(card.id) ? structuredClone(fixtureById.get(card.id)) : card,
    );
    state.gate4Production = {};
    state.project._gate4ProductIdMigrationLog = (
      Array.isArray(state.project._gate4ProductIdMigrationLog)
        ? state.project._gate4ProductIdMigrationLog
        : []
    ).filter((entry) => entry.id !== "gate4-readiness-product-storage-v225");
    state.project.gate0ScopeUiV194 = {
      ...(state.project.gate0ScopeUiV194 || {}),
      selectedCategoryId: ${JSON.stringify(goat.categoryId)},
      selectedProductId: ${JSON.stringify(goatId)},
    };
    localStorage.setItem(
      WORKSPACE_STORAGE_PREFIX + ${JSON.stringify(smokeProjectId)},
      JSON.stringify(state),
    );
    return {
      gate4Cards: fixtureCards.length,
      rows: fixtureCards.flatMap((card) => card.instructionRows || []).length,
      selectedProductId: state.project.gate0ScopeUiV194.selectedProductId,
    };
  })()`);
  assert(
    rawImport.gate4Cards === 23 &&
      rawImport.rows === 62 &&
      rawImport.selectedProductId === goatId,
    `Raw readiness fixture import failed: ${JSON.stringify(rawImport)}`,
  );

  await page.call("Page.reload", { ignoreCache: true });
  await wait(800);
  await waitFor('document.readyState === "complete"');
  await waitFor('typeof bootstrapAppOnce === "function"');
  await waitFor(`document.querySelector('[data-open-project="${smokeProjectId}"]')`);
  await evaluate(`document.querySelector('[data-open-project="${smokeProjectId}"]').click(); true`);
  await waitFor(`activeProjectId === ${JSON.stringify(smokeProjectId)} && Boolean(state)`);

  const migration = await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const storeBefore = JSON.stringify(state.gate4Production?.readinessV225 || {});
    const logsBefore = JSON.stringify(state.project._gate4ProductIdMigrationLog || []);
    const firstNoop = g4ReadinessMigrateWorkspaceV225(state);
    const secondNoop = g4ReadinessMigrateWorkspaceV225(state);
    const storeAfter = JSON.stringify(state.gate4Production?.readinessV225 || {});
    const logsAfter = JSON.stringify(state.project._gate4ProductIdMigrationLog || []);
    const entries = (state.project._gate4ProductIdMigrationLog || []).filter(
      (entry) => entry.id === GATE4_READINESS_PRODUCT_STORAGE_V225,
    );
    const run = entries[0]?.runs?.[0] || {};
    const normalizedCards = g4ReadinessAllCardsV225(state);
    const normalizedSharedTemplate = normalizedCards.map((card) => ({
      id: card.id,
      instruction: card.instruction || "",
      instructionRows: (card.instructionRows || []).map((row) => structuredClone(row)),
    }));
    const globalStatusCardIds = normalizedCards
      .filter((card) => Object.prototype.hasOwnProperty.call(card, "status"))
      .map((card) => card.id);
    const globalWorkingFields = normalizedCards.flatMap((card) =>
      (card.instructionRows || []).flatMap((row) =>
        ["status", "result", "link"]
          .filter((field) => Object.prototype.hasOwnProperty.call(row, field))
          .map((field) => ({ cardId: card.id, rowKey: row.key || "", field }))
      )
    );
    const normalizedMethodHints = normalizedCards
      .flatMap((card) =>
        (card.instructionRows || [])
          .filter((row) => String(row.comment || "").trim())
          .map((row) => ({
            cardId: card.id,
            rowKey: row.key || "",
            comment: row.comment,
          }))
      )
      .sort((left, right) =>
        (left.cardId + ":" + left.rowKey).localeCompare(right.cardId + ":" + right.rowKey)
      );
    return {
      firstNoop,
      secondNoop,
      storeStable: storeBefore === storeAfter,
      logsStable: logsBefore === logsAfter,
      entryCount: entries.length,
      status: entries[0]?.status || "",
      before: run.before || {},
      after: run.after || {},
      initialProductKeys: Object.keys(state.gate4Production?.readinessV225?.byProduct || {}),
      normalizedSharedTemplate,
      globalStatusCardIds,
      globalWorkingFields,
      normalizedMethodHints,
    };
  })()`);
  assert(migration.entryCount === 1, `Expected one V225 migration entry: ${JSON.stringify(migration)}`);
  assert(migration.status === "completed", `V225 migration has warnings: ${JSON.stringify(migration)}`);
  assert(
    migration.before.globalCards === 23 && migration.before.instructionRows === 62,
    `V225 migration preimage counters are wrong: ${JSON.stringify(migration)}`,
  );
  assert(
    migration.after.productCards === 18 &&
      migration.after.companyReadOnlyCards === 5 &&
      migration.after.copiedInstructionTextsPerProduct === 0 &&
      migration.after.archivedUnassignedRows === 0,
    `V225 migration mapping is wrong: ${JSON.stringify(migration)}`,
  );
  assert(
    migration.firstNoop.changed === false &&
      migration.secondNoop.changed === false &&
      migration.storeStable &&
      migration.logsStable,
    `V225 migration is not idempotent: ${JSON.stringify(migration)}`,
  );
  assert(
    migration.initialProductKeys.length === 0,
    `Empty migration eagerly copied product rows: ${JSON.stringify(migration.initialProductKeys)}`,
  );
  assert(
    migration.globalStatusCardIds.length === 0,
    `Migration left global card.status on readiness templates: ${JSON.stringify(migration.globalStatusCardIds)}`,
  );
  assert(
    migration.globalWorkingFields.length === 0,
    `Migration left global instruction-row working fields: ${JSON.stringify(migration.globalWorkingFields)}`,
  );
  assert(
    migration.normalizedMethodHints.length === methodHintRows.length &&
      migration.normalizedMethodHints.some(
        (hint) =>
          hint.cardId === "card-152" &&
          hint.comment.includes("страница, на которой человеку сразу понятно"),
      ),
    `Migration did not preserve normalized method hints: ${JSON.stringify(migration.normalizedMethodHints)}`,
  );

  // From this point onward the shared-template baseline is the method-only
  // shape produced by migration, not the legacy preimage with blank work slots.
  const expectedSharedTemplate = migration.normalizedSharedTemplate;
  const expectedMethodHints = migration.normalizedMethodHints;

  await evaluate('guruNavigateToGate("gate-4"); true');
  await waitFor('activeGateId === "gate-4"');
  await waitFor(`document.querySelector('[data-g4-readiness-product="${goatId}"]')`);
  assert(
    !(await evaluate(`Boolean(document.querySelector('.g4-readiness-head-v225'))`)),
    "Duplicate Gate 4 readiness summary header is still rendered",
  );

  const goatWrite = await evaluate(`(() => {
    const pickField = (field) => Array.from(
      document.querySelectorAll('[data-g4-readiness-card-id="card-152"]')
    ).find((node) =>
      node.dataset.g4ReadinessProductId === ${JSON.stringify(goatId)} &&
      node.dataset.g4ReadinessRowKey === ${JSON.stringify(card152RowKey)} &&
      node.dataset.g4ReadinessRowField === field
    );
    const resultInput = pickField("result");
    if (!resultInput) throw new Error("Goat card-152 result input not found");
    const initialDetails = resultInput.closest('[data-g4-readiness-card="card-152"]');
    initialDetails.open = true;
    resultInput.value = ${JSON.stringify(goatSentinel)};
    resultInput.dispatchEvent(new Event("input", { bubbles: true }));
    const statusSelect = pickField("status");
    if (!statusSelect) throw new Error("Goat card-152 status select not found");
    statusSelect.value = "broken";
    statusSelect.dispatchEvent(new Event("change", { bubbles: true }));

    const problemCard = document.querySelector('[data-g4-readiness-card="card-152"]');
    const problemLink = Array.from(
      problemCard.querySelectorAll('[data-g4-readiness-row-field="link"]')
    ).find((node) => node.dataset.g4ReadinessRowKey === ${JSON.stringify(card152RowKey)});
    const problemSelect = Array.from(
      problemCard.querySelectorAll('[data-g4-readiness-row-field="status"]')
    ).find((node) => node.dataset.g4ReadinessRowKey === ${JSON.stringify(card152RowKey)});
    const panelProbe = document.createElement("div");
    panelProbe.style.background = "var(--panel)";
    panelProbe.style.color = "var(--text)";
    document.body.append(panelProbe);
    const panelBackground = getComputedStyle(panelProbe).backgroundColor;
    const textColor = getComputedStyle(panelProbe).color;
    panelProbe.remove();
    const fitsCell = (control) => {
      const cell = control?.closest("td");
      if (!control || !cell) return false;
      const controlRect = control.getBoundingClientRect();
      const cellRect = cell.getBoundingClientRect();
      return (
        controlRect.left >= cellRect.left - 1 &&
        controlRect.right <= cellRect.right + 1 &&
        control.clientWidth <= cell.clientWidth + 1
      );
    };
    const problemStyle = getComputedStyle(problemCard);
    const problemCss = {
      open: problemCard.open,
      classes: problemCard.className,
      backgroundColor: problemStyle.backgroundColor,
      panelBackground,
      color: problemStyle.color,
      textColor,
      linkMinWidth: problemLink ? getComputedStyle(problemLink).minWidth : "missing",
      selectMinWidth: problemSelect ? getComputedStyle(problemSelect).minWidth : "missing",
      linkFitsCell: fitsCell(problemLink),
      selectFitsCell: fitsCell(problemSelect),
      linkRect: problemLink
        ? {
            width: problemLink.getBoundingClientRect().width,
            cellWidth: problemLink.closest("td").getBoundingClientRect().width,
          }
        : null,
      selectRect: problemSelect
        ? {
            width: problemSelect.getBoundingClientRect().width,
            cellWidth: problemSelect.closest("td").getBoundingClientRect().width,
          }
        : null,
    };

    problemSelect.value = "works";
    problemSelect.dispatchEvent(new Event("change", { bubbles: true }));
    const row = g4ReadinessProductRowV225(
      ${JSON.stringify(goatId)},
      "card-152",
      ${JSON.stringify(card152RowKey)},
      state,
    );
    const outputKey = "итоговый_результат_блока";
    const outputComment = Array.from(
      document.querySelectorAll('[data-g4-readiness-card-id="card-152"][data-g4-readiness-row-field="comment"]')
    ).find((node) => node.dataset.g4ReadinessRowKey === outputKey);
    const hint = document.querySelector(
      '[data-g4-readiness-card="card-152"] [data-g4-readiness-row-key-view="' + outputKey + '"] .g4-readiness-method-hint'
    );
    const renderedCard = document.querySelector('[data-g4-readiness-card="card-152"]');
    const renderedInput = renderedCard?.querySelector(
      '[data-g4-readiness-row-field="result"]',
    );
    const renderedSelect = renderedCard?.querySelector(
      '[data-g4-readiness-row-field="status"]',
    );
    const cardStyle = renderedCard ? getComputedStyle(renderedCard) : null;
    return {
      selectedProductId: guruV194SelectedProduct(state)?.id || "",
      row: structuredClone(row || {}),
      cardStatus: g4ReadinessCardStatusV225(
        g4ReadinessCardV225("card-152", state),
        ${JSON.stringify(goatId)},
        state,
      ),
      outputProductComment: outputComment?.value || "",
      methodHint: hint?.textContent.trim() || "",
      detailsOpenAfterFinalStatus: Boolean(renderedCard?.open),
      problemCss,
      css: {
        classes: renderedCard?.className || "",
        hasLegacyStatusClass: Array.from(renderedCard?.classList || []).some(
          (className) => className.startsWith("status-"),
        ),
        hasScopedStatusClass: Array.from(renderedCard?.classList || []).some(
          (className) => className.startsWith("g4-readiness-state-"),
        ),
        backgroundColor: cardStyle?.backgroundColor || "",
        panelBackground,
        inputMinWidth: renderedInput ? getComputedStyle(renderedInput).minWidth : "missing",
        selectMinWidth: renderedSelect ? getComputedStyle(renderedSelect).minWidth : "missing",
      },
    };
  })()`);
  assert(goatWrite.selectedProductId === goatId, `Wrong selected product: ${JSON.stringify(goatWrite)}`);
  assert(
    goatWrite.row.result === goatSentinel && goatWrite.row.status === "works",
    `Goat card-152 did not save: ${JSON.stringify(goatWrite)}`,
  );
  assert(goatWrite.cardStatus === "in_progress", `Unexpected Goat card status: ${JSON.stringify(goatWrite)}`);
  assert(
    goatWrite.outputProductComment === "" &&
      goatWrite.methodHint.includes("страница, на которой человеку сразу понятно"),
    `Method hint leaked into the product comment: ${JSON.stringify(goatWrite)}`,
  );
  assert(
    !goatWrite.css.hasLegacyStatusClass &&
      goatWrite.css.hasScopedStatusClass &&
      goatWrite.css.backgroundColor === goatWrite.css.panelBackground &&
      goatWrite.css.inputMinWidth === "0px" &&
      goatWrite.css.selectMinWidth === "0px",
    `Gate 4 readiness CSS cascade guards failed: ${JSON.stringify(goatWrite.css)}`,
  );
  assert(
    goatWrite.problemCss.open &&
      goatWrite.detailsOpenAfterFinalStatus &&
      goatWrite.problemCss.classes.includes("g4-readiness-state-problem"),
    `Gate 4 readiness details collapsed on status change: ${JSON.stringify({
      problem: goatWrite.problemCss,
      finalOpen: goatWrite.detailsOpenAfterFinalStatus,
    })}`,
  );
  assert(
    goatWrite.problemCss.backgroundColor === goatWrite.problemCss.panelBackground &&
      goatWrite.problemCss.color === goatWrite.problemCss.textColor &&
      goatWrite.problemCss.linkMinWidth === "0px" &&
      goatWrite.problemCss.selectMinWidth === "0px" &&
      goatWrite.problemCss.linkFitsCell &&
      goatWrite.problemCss.selectFitsCell,
    `Problem readiness card CSS/overflow regression: ${JSON.stringify(goatWrite.problemCss)}`,
  );

  const shirtView = await evaluate(`(() => {
    const categorySelector = document.querySelector('[data-gate0-scope-category-select="gate4-launch"]');
    categorySelector.value = ${JSON.stringify(shirt.categoryId)};
    categorySelector.dispatchEvent(new Event("change", { bubbles: true }));
    const selector = document.querySelector("[data-g4-product-pick-select]");
    if (!selector) throw new Error("Gate 4 product selector not found");
    selector.value = ${JSON.stringify(shirtId)};
    selector.dispatchEvent(new Event("change", { bubbles: true }));
    const resultInput = Array.from(
      document.querySelectorAll('[data-g4-readiness-card-id="card-152"][data-g4-readiness-row-field="result"]')
    ).find((node) => node.dataset.g4ReadinessRowKey === ${JSON.stringify(card152RowKey)});
    const outputComment = Array.from(
      document.querySelectorAll('[data-g4-readiness-card-id="card-152"][data-g4-readiness-row-field="comment"]')
    ).find((node) => node.dataset.g4ReadinessRowKey === "итоговый_результат_блока");
    return {
      selectedProductId: guruV194SelectedProduct(state)?.id || "",
      renderedProductId: document.querySelector("[data-g4-readiness-product]")?.dataset.g4ReadinessProduct || "",
      result: resultInput?.value || "",
      outputProductComment: outputComment?.value || "",
      productState: g4ReadinessProductCardV225(${JSON.stringify(shirtId)}, "card-152", state),
      goatResult: g4ReadinessProductRowV225(
        ${JSON.stringify(goatId)},
        "card-152",
        ${JSON.stringify(card152RowKey)},
        state,
      )?.result || "",
    };
  })()`);
  assert(
    shirtView.selectedProductId === shirtId && shirtView.renderedProductId === shirtId,
    `Gate 4 did not switch to Shirt: ${JSON.stringify(shirtView)}`,
  );
  assert(
    shirtView.result === "" &&
      shirtView.outputProductComment === "" &&
      !shirtView.productState &&
      shirtView.goatResult === goatSentinel,
    `card-152 is not isolated by product_id: ${JSON.stringify(shirtView)}`,
  );

  const goatReturn = await evaluate(`(async () => {
    const categorySelector = document.querySelector('[data-gate0-scope-category-select="gate4-launch"]');
    categorySelector.value = ${JSON.stringify(goat.categoryId)};
    categorySelector.dispatchEvent(new Event("change", { bubbles: true }));
    const selector = document.querySelector("[data-g4-product-pick-select]");
    selector.value = ${JSON.stringify(goatId)};
    selector.dispatchEvent(new Event("change", { bubbles: true }));
    const resultInput = Array.from(
      document.querySelectorAll('[data-g4-readiness-card-id="card-152"][data-g4-readiness-row-field="result"]')
    ).find((node) => node.dataset.g4ReadinessRowKey === ${JSON.stringify(card152RowKey)});
    const store = g4ReadinessStoreV225(state);
    const categoryIds = new Set(guruV185Registry(state).map((item) => item.id));
    const productIds = new Set(guruV194Products(state).map((item) => item.id));
    const productKeys = Object.keys(store.byProduct || {});
    const companyBranches = productKeys.flatMap((productId) =>
      ${JSON.stringify(companyCardIds)}.filter((cardId) =>
        Object.hasOwn(store.byProduct[productId] || {}, cardId)
      ).map((cardId) => productId + ":" + cardId)
    );
    // The global change listener clears its save guard in a microtask.
    // Wait for it so this explicit save exercises the real persistence path.
    await Promise.resolve();
    saveState();
    const inspectLegacyWorkingState = (cards) => ({
      statusCardIds: cards
        .filter((card) => Object.prototype.hasOwnProperty.call(card, "status"))
        .map((card) => card.id),
      workingFields: cards.flatMap((card) =>
        (card.instructionRows || []).flatMap((row) =>
          ["status", "result", "link"]
            .filter((field) => Object.prototype.hasOwnProperty.call(row, field))
            .map((field) => ({ cardId: card.id, rowKey: row.key || "", field }))
        )
      ),
    });
    const runtimeLegacyState = inspectLegacyWorkingState(g4ReadinessAllCardsV225(state));
    const savedWorkspace = JSON.parse(
      localStorage.getItem(WORKSPACE_STORAGE_PREFIX + ${JSON.stringify(smokeProjectId)}) || "{}"
    );
    const savedReadinessCards = (savedWorkspace.gates || [])
      .find((gate) => gate.id === "gate-4")?.cards
      ?.filter((card) => ${JSON.stringify(readinessCardIds)}.includes(card.id)) || [];
    const savedLegacyState = inspectLegacyWorkingState(savedReadinessCards);
    return {
      selectedProductId: guruV194SelectedProduct(state)?.id || "",
      result: resultInput?.value || "",
      productKeys,
      allKeysAreProducts: productKeys.every((key) => productIds.has(key)),
      categoryKeys: productKeys.filter((key) => categoryIds.has(key)),
      companyBranches,
      runtimeLegacyState,
      savedLegacyState,
    };
  })()`);
  assert(
    goatReturn.selectedProductId === goatId && goatReturn.result === goatSentinel,
    `Goat card-152 value was not restored: ${JSON.stringify(goatReturn)}`,
  );
  assert(
    stableJson(goatReturn.productKeys) === stableJson([goatId]) &&
      goatReturn.allKeysAreProducts &&
      goatReturn.categoryKeys.length === 0 &&
      goatReturn.companyBranches.length === 0,
    `Readiness store contains category/company keys: ${JSON.stringify(goatReturn)}`,
  );
  assert(
    goatReturn.runtimeLegacyState.statusCardIds.length === 0 &&
      goatReturn.runtimeLegacyState.workingFields.length === 0 &&
      goatReturn.savedLegacyState.statusCardIds.length === 0 &&
      goatReturn.savedLegacyState.workingFields.length === 0,
    `saveState revived legacy global readiness storage: ${JSON.stringify({
      runtime: goatReturn.runtimeLegacyState,
      saved: goatReturn.savedLegacyState,
    })}`,
  );

  await page.call("Page.reload", { ignoreCache: true });
  await wait(800);
  await waitFor('document.readyState === "complete"');
  await waitFor('typeof bootstrapAppOnce === "function"');
  await waitFor(`document.querySelector('[data-open-project="${smokeProjectId}"]')`);
  await evaluate(`document.querySelector('[data-open-project="${smokeProjectId}"]').click(); true`);
  await waitFor(`activeProjectId === ${JSON.stringify(smokeProjectId)} && Boolean(state)`);
  await evaluate('scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {}; guruNavigateToGate("gate-4"); true');
  await waitFor('activeGateId === "gate-4"');
  await waitFor(`document.querySelector('[data-g4-readiness-product="${goatId}"]')`);

  const expectedTemplateJson = JSON.stringify(expectedSharedTemplate);
  const persisted = await evaluate(`(() => {
    const resultInput = Array.from(
      document.querySelectorAll('[data-g4-readiness-card-id="card-152"][data-g4-readiness-row-field="result"]')
    ).find((node) => node.dataset.g4ReadinessRowKey === ${JSON.stringify(card152RowKey)});
    const actualShared = g4ReadinessAllCardsV225(state).map((card) => ({
      id: card.id,
      instruction: card.instruction || "",
      instructionRows: (card.instructionRows || []).map((row) => structuredClone(row)),
    }));
    const inspectLegacyWorkingState = (cards) => ({
      statusCardIds: cards
        .filter((card) => Object.prototype.hasOwnProperty.call(card, "status"))
        .map((card) => card.id),
      workingFields: cards.flatMap((card) =>
        (card.instructionRows || []).flatMap((row) =>
          ["status", "result", "link"]
            .filter((field) => Object.prototype.hasOwnProperty.call(row, field))
            .map((field) => ({ cardId: card.id, rowKey: row.key || "", field }))
        )
      ),
    });
    const runtimeCards = g4ReadinessAllCardsV225(state);
    const runtimeLegacyState = inspectLegacyWorkingState(runtimeCards);
    const savedWorkspace = JSON.parse(
      localStorage.getItem(WORKSPACE_STORAGE_PREFIX + ${JSON.stringify(smokeProjectId)}) || "{}"
    );
    const savedReadinessCards = (savedWorkspace.gates || [])
      .find((gate) => gate.id === "gate-4")?.cards
      ?.filter((card) => ${JSON.stringify(readinessCardIds)}.includes(card.id)) || [];
    const savedLegacyState = inspectLegacyWorkingState(savedReadinessCards);
    const normalizedMethodHints = runtimeCards
      .flatMap((card) =>
        (card.instructionRows || [])
          .filter((row) => String(row.comment || "").trim())
          .map((row) => ({
            cardId: card.id,
            rowKey: row.key || "",
            comment: row.comment,
          }))
      )
      .sort((left, right) =>
        (left.cardId + ":" + left.rowKey).localeCompare(right.cardId + ":" + right.rowKey)
      );
    return {
      selectedProductId: guruV194SelectedProduct(state)?.id || "",
      value: resultInput?.value || "",
      productValue: g4ReadinessProductRowV225(
        ${JSON.stringify(goatId)},
        "card-152",
        ${JSON.stringify(card152RowKey)},
        state,
      )?.result || "",
      sharedTemplate: actualShared,
      expectedTemplate: ${expectedTemplateJson},
      runtimeLegacyState,
      savedLegacyState,
      normalizedMethodHints,
      methodComment: g4ReadinessProductRowV225(
        ${JSON.stringify(goatId)},
        "card-152",
        "итоговый_результат_блока",
        state,
      )?.comment || "",
    };
  })()`);
  assert(
    persisted.selectedProductId === goatId &&
      persisted.value === goatSentinel &&
      persisted.productValue === goatSentinel,
    `Goat readiness data did not survive reload: ${JSON.stringify(persisted)}`,
  );
  assert(
    stableJson(persisted.sharedTemplate) === stableJson(persisted.expectedTemplate),
    "Shared Gate 4 instructionRows changed while editing product readiness",
  );
  assert(
    persisted.runtimeLegacyState.statusCardIds.length === 0 &&
      persisted.runtimeLegacyState.workingFields.length === 0 &&
      persisted.savedLegacyState.statusCardIds.length === 0 &&
      persisted.savedLegacyState.workingFields.length === 0,
    `save/reload revived legacy global readiness storage: ${JSON.stringify({
      runtime: persisted.runtimeLegacyState,
      saved: persisted.savedLegacyState,
    })}`,
  );
  assert(
    stableJson(persisted.normalizedMethodHints) === stableJson(expectedMethodHints),
    `Method hints did not survive save/reload: ${JSON.stringify({
      expected: expectedMethodHints,
      actual: persisted.normalizedMethodHints,
    })}`,
  );
  assert(
    persisted.methodComment === "",
    `Method hint was persisted as a product comment: ${JSON.stringify(persisted)}`,
  );

  const readonly = await evaluate(`(() => {
    const megaCard = g4ReadinessGate0CardV225(state);
    const mega = ensureMegaMarketing(megaCard, state);
    const mobile = mega.platformV2.fundamental.find(
      (row) => row.name === "Мобильная версия",
    );
    if (!mobile) throw new Error("Gate 0 Mobile source row not found");
    mobile.status = "broken";
    renderGate();
    const brokenCard = document.querySelector('[data-g4-readiness-card="card-156"]');
    const brokenSource = brokenCard?.querySelector(
      '[data-g4-readiness-source-name="Мобильная версия"] .status-pill',
    );
    const broken = {
      cardStatus: brokenCard?.querySelector('[data-g4-readiness-status="card-156"]')?.textContent.trim() || "",
      sourceStatus: brokenSource?.textContent.trim() || "",
      controls: brokenCard?.querySelectorAll("input, textarea, select").length ?? -1,
      readonlyMarker: Boolean(brokenCard?.querySelector('[data-g4-readiness-readonly="card-156"]')),
      liveStatus: g4ReadinessCardStatusV225(g4ReadinessCardV225("card-156", state), ${JSON.stringify(goatId)}, state),
    };
    const refreshedMobile = ensureMegaMarketing(
      g4ReadinessGate0CardV225(state),
      state,
    ).platformV2.fundamental.find((row) => row.name === "Мобильная версия");
    if (!refreshedMobile) throw new Error("Refreshed Gate 0 Mobile source row not found");
    refreshedMobile.status = "works";
    renderGate();
    const worksCard = document.querySelector('[data-g4-readiness-card="card-156"]');
    const worksSource = worksCard?.querySelector(
      '[data-g4-readiness-source-name="Мобильная версия"] .status-pill',
    );
    const works = {
      cardStatus: worksCard?.querySelector('[data-g4-readiness-status="card-156"]')?.textContent.trim() || "",
      sourceStatus: worksSource?.textContent.trim() || "",
      controls: worksCard?.querySelectorAll("input, textarea, select").length ?? -1,
      readonlyMarker: Boolean(worksCard?.querySelector('[data-g4-readiness-readonly="card-156"]')),
      liveStatus: g4ReadinessCardStatusV225(g4ReadinessCardV225("card-156", state), ${JSON.stringify(goatId)}, state),
    };
    const store = g4ReadinessStoreV225(state);
    const companyBranches = Object.entries(store.byProduct || {}).flatMap(
      ([productId, productState]) => ${JSON.stringify(companyCardIds)}
        .filter((cardId) => Object.hasOwn(productState || {}, cardId))
        .map((cardId) => productId + ":" + cardId),
    );
    const diagnostics = guruExportRuntimeModelV223("gate-4");
    return {
      broken,
      works,
      companyBranches,
      readinessModel: diagnostics.readinessModel,
      readinessUnits: diagnostics.readinessUnits,
      errors: window.__guruConsoleLog?.filter((entry) => entry.level === "error") || [],
    };
  })()`);
  assert(
    readonly.broken.cardStatus === "Проблема" &&
      readonly.broken.sourceStatus === "Не работает" &&
      readonly.broken.liveStatus === "problem" &&
      readonly.broken.controls === 0 &&
      readonly.broken.readonlyMarker,
    `card-156 did not read broken live status from Gate 0: ${JSON.stringify(readonly.broken)}`,
  );
  assert(
    readonly.works.cardStatus === "Готово" &&
      readonly.works.sourceStatus === "Работает" &&
      readonly.works.liveStatus === "ready" &&
      readonly.works.controls === 0 &&
      readonly.works.readonlyMarker,
    `card-156 did not update to works from Gate 0: ${JSON.stringify(readonly.works)}`,
  );
  assert(readonly.companyBranches.length === 0, `Company cards have product storage: ${JSON.stringify(readonly.companyBranches)}`);
  assert(
    readonly.readinessModel?.selectedProduct?.id === goatId &&
      readonly.readinessModel?.productCardIds?.length === 15 &&
      readonly.readinessModel?.companyReadOnlyCardIds?.length === 5,
    `Gate 4 readiness diagnostics model is incomplete: ${JSON.stringify(readonly.readinessModel)}`,
  );
  assert(
    readonly.readinessUnits?.length === 20 &&
      readonly.readinessUnits.filter((unit) => unit.scope === "product").length === 15 &&
      readonly.readinessUnits.filter((unit) => unit.scope === "company").length === 5 &&
      readonly.readinessUnits
        .filter((unit) => unit.scope === "product")
        .every((unit) => unit.product_id === goatId) &&
      readonly.readinessUnits
        .filter((unit) => unit.scope === "company")
        .every((unit) => unit.product_id === ""),
    `Gate 4 readinessUnits are wrong: ${JSON.stringify(readonly.readinessUnits)}`,
  );
  assert(
    readonly.readinessUnits.find((unit) => unit.unitId === "card-152")?.status === "in_progress" &&
      readonly.readinessUnits.find((unit) => unit.unitId === "card-156")?.status === "ready",
    `Gate 4 readinessUnits statuses are stale: ${JSON.stringify(readonly.readinessUnits)}`,
  );
  assert(!readonly.errors.length, `Browser console errors: ${JSON.stringify(readonly.errors)}`);

  // Exercise archival independently from the main fixture. This clone mimics
  // a raw legacy workspace and never becomes the live `state`.
  const lateLegacy = await evaluate(`(() => {
    const workspace = structuredClone(state);
    workspace.project = {
      ...(workspace.project || {}),
      id: "gate4-readiness-late-legacy-clone",
      _gate4ProductIdMigrationLog: (
        Array.isArray(workspace.project?._gate4ProductIdMigrationLog)
          ? workspace.project._gate4ProductIdMigrationLog
          : []
      ).filter((entry) => entry.id !== GATE4_READINESS_PRODUCT_STORAGE_V225),
    };
    workspace.gate4Production = {
      ...(workspace.gate4Production || {}),
    };
    delete workspace.gate4Production.readinessV225;

    const card = g4ReadinessCardV225("card-152", workspace);
    const outputKey = normalizeAspectKey("Итоговый результат блока");
    const workRows = (card.instructionRows || []).filter(
      (row) => row.key !== outputKey,
    );
    const firstRow = workRows[0];
    const secondRow = workRows[1];
    if (!firstRow || !secondRow) throw new Error("card-152 legacy rows are missing");

    Object.assign(firstRow, {
      status: "broken",
      result: "first-result-sentinel",
      link: "https://example.test/first-sentinel",
      comment: "first-comment-sentinel",
    });
    card.status = "problem";

    const inspectActiveLegacy = () => {
      const cards = g4ReadinessAllCardsV225(workspace);
      return {
        statusCardIds: cards
          .filter((item) => Object.prototype.hasOwnProperty.call(item, "status"))
          .map((item) => item.id),
        workingFields: cards.flatMap((item) =>
          (item.instructionRows || []).flatMap((row) =>
            ["status", "result", "link"]
              .filter((field) => Object.prototype.hasOwnProperty.call(row, field))
              .map((field) => ({ cardId: item.id, rowKey: row.key || "", field }))
          )
        ),
        methodHint:
          card.instructionRows.find((row) => row.key === outputKey)?.comment || "",
        firstUserComment:
          card.instructionRows.find((row) => row.key === firstRow.key)?.comment || "",
      };
    };

    const firstRun = g4ReadinessMigrateWorkspaceV225(workspace);
    const store = g4ReadinessStoreV225(workspace);
    const log = workspace.project._gate4ProductIdMigrationLog.find(
      (entry) => entry.id === GATE4_READINESS_PRODUCT_STORAGE_V225,
    );
    const first = {
      run: firstRun,
      firstKey: firstRow.key,
      secondKey: secondRow.key,
      archive: structuredClone(store.legacyUnassigned?.["card-152"] || null),
      active: inspectActiveLegacy(),
      audit: structuredClone(log?.runs?.[0] || null),
    };

    const storeBeforeNoop = JSON.stringify(store);
    const logBeforeNoop = JSON.stringify(log);
    const noopOne = g4ReadinessMigrateWorkspaceV225(workspace);
    const noopTwo = g4ReadinessMigrateWorkspaceV225(workspace);
    const noop = {
      one: noopOne,
      two: noopTwo,
      storeStable: storeBeforeNoop === JSON.stringify(store),
      logStable: logBeforeNoop === JSON.stringify(log),
    };

    const lateRow = card.instructionRows.find((row) => row.key === secondRow.key);
    Object.assign(lateRow, {
      status: "works",
      result: "second-result-sentinel",
      link: "https://example.test/second-sentinel",
      comment: "second-comment-sentinel",
    });
    card.status = "ready";
    const lateRun = g4ReadinessMigrateWorkspaceV225(workspace);
    const lateAudit = log.runs?.[log.runs.length - 1] || null;
    const late = {
      run: lateRun,
      archive: structuredClone(store.legacyUnassigned?.["card-152"] || null),
      active: inspectActiveLegacy(),
      audit: structuredClone(lateAudit),
      logStatus: log.status || "",
      runCount: log.runs?.length || 0,
    };
    const storeBeforeFinalNoop = JSON.stringify(store);
    const logBeforeFinalNoop = JSON.stringify(log);
    late.finalNoop = g4ReadinessMigrateWorkspaceV225(workspace);
    late.finalStoreStable = storeBeforeFinalNoop === JSON.stringify(store);
    late.finalLogStable = logBeforeFinalNoop === JSON.stringify(log);
    return { first, noop, late };
  })()`);
  const firstArchivedRow =
    lateLegacy.first.archive?.rows?.[lateLegacy.first.firstKey] || {};
  assert(
    lateLegacy.first.run.changed === true &&
      lateLegacy.first.run.status === "completed_with_warnings" &&
      lateLegacy.first.archive?.cardStatus === "problem" &&
      firstArchivedRow.status === "broken" &&
      firstArchivedRow.result === "first-result-sentinel" &&
      firstArchivedRow.link === "https://example.test/first-sentinel" &&
      firstArchivedRow.comment === "first-comment-sentinel",
    `Initial legacy values were not archived: ${JSON.stringify(lateLegacy.first)}`,
  );
  assert(
    lateLegacy.first.active.statusCardIds.length === 0 &&
      lateLegacy.first.active.workingFields.length === 0 &&
      lateLegacy.first.active.firstUserComment === "" &&
      lateLegacy.first.active.methodHint.includes(
        "страница, на которой человеку сразу понятно",
      ),
    `Initial legacy values were not retired cleanly: ${JSON.stringify(lateLegacy.first.active)}`,
  );
  assert(
    lateLegacy.first.audit?.before?.userRowsWithoutProductId === 1 &&
      lateLegacy.first.audit?.before?.cardStatusesWithoutProductId === 1 &&
      lateLegacy.first.audit?.after?.archivedUnassignedRows === 1 &&
      lateLegacy.first.audit?.after?.archivedUnassignedCardStatuses === 1,
    `Initial legacy audit is incomplete: ${JSON.stringify(lateLegacy.first.audit)}`,
  );
  assert(
    lateLegacy.noop.one.changed === false &&
      lateLegacy.noop.two.changed === false &&
      lateLegacy.noop.storeStable &&
      lateLegacy.noop.logStable,
    `Legacy migration is not idempotent: ${JSON.stringify(lateLegacy.noop)}`,
  );
  const secondArchivedRow =
    lateLegacy.late.archive?.rows?.[lateLegacy.first.secondKey] || {};
  assert(
    lateLegacy.late.run.changed === true &&
      lateLegacy.late.archive?.rows?.[lateLegacy.first.firstKey]?.result ===
        "first-result-sentinel" &&
      lateLegacy.late.archive?.cardStatus === "problem" &&
      lateLegacy.late.archive?.conflicts?.some(
        (conflict) =>
          conflict.field === "cardStatus" &&
          conflict.kept === "problem" &&
          conflict.received === "ready",
      ) &&
      secondArchivedRow.status === "works" &&
      secondArchivedRow.result === "second-result-sentinel" &&
      secondArchivedRow.link === "https://example.test/second-sentinel" &&
      secondArchivedRow.comment === "second-comment-sentinel",
    `Late legacy values were not merged into the archive: ${JSON.stringify(lateLegacy.late)}`,
  );
  assert(
    lateLegacy.late.active.statusCardIds.length === 0 &&
      lateLegacy.late.active.workingFields.length === 0 &&
      lateLegacy.late.active.firstUserComment === "" &&
      lateLegacy.late.active.methodHint.includes(
        "страница, на которой человеку сразу понятно",
      ),
    `Late legacy values remained active: ${JSON.stringify(lateLegacy.late.active)}`,
  );
  assert(
    lateLegacy.late.logStatus === "completed_with_warnings" &&
      lateLegacy.late.runCount === 2 &&
      lateLegacy.late.audit?.reason === "late_legacy_values_archived" &&
      lateLegacy.late.audit?.before?.userRowsWithoutProductId === 1 &&
      lateLegacy.late.audit?.before?.cardStatusesWithoutProductId === 1 &&
      lateLegacy.late.audit?.after?.activeLegacyWorkingValues === 0 &&
      lateLegacy.late.audit?.archivedCards?.["card-152"]?.rowKeys?.includes(
        lateLegacy.first.secondKey,
      ) &&
      lateLegacy.late.audit?.archivedCards?.["card-152"]?.cardStatus === "ready",
    `Late legacy audit run is incomplete: ${JSON.stringify(lateLegacy.late.audit)}`,
  );
  assert(
    lateLegacy.late.finalNoop.changed === false &&
      lateLegacy.late.finalStoreStable &&
      lateLegacy.late.finalLogStable,
    `Late legacy follow-up is not idempotent: ${JSON.stringify(lateLegacy.late)}`,
  );

  console.log(
    JSON.stringify(
      {
        source: {
          path: sourceExportPath,
          exportedAt: sourceExport.exportedAt,
          cards: sourceCards.length,
          instructionRows: sourceRows.length,
          productInstructionRows: uniqueRows.length,
          methodHints: methodHintRows.length,
        },
        migration: {
          firstNoop: migration.firstNoop,
          secondNoop: migration.secondNoop,
          storeStable: migration.storeStable,
          logsStable: migration.logsStable,
          entryCount: migration.entryCount,
          status: migration.status,
          before: migration.before,
          after: migration.after,
          initialProductKeys: migration.initialProductKeys,
          normalized: {
            cards: migration.normalizedSharedTemplate.length,
            instructionRows: migration.normalizedSharedTemplate.reduce(
              (sum, card) => sum + card.instructionRows.length,
              0,
            ),
            methodHints: migration.normalizedMethodHints.length,
            globalStatusCardIds: migration.globalStatusCardIds,
            globalWorkingFields: migration.globalWorkingFields,
          },
        },
        isolation: {
          goatWrite,
          shirtView,
          goatReturn,
          persistedAfterReload: persisted.value,
        },
        readonly: {
          broken: readonly.broken,
          works: readonly.works,
          companyProductBranches: readonly.companyBranches.length,
        },
        lateLegacyArchive: {
          initial: {
            rowKey: lateLegacy.first.firstKey,
            archivedStatus: firstArchivedRow.status,
            archivedCardStatus: lateLegacy.first.archive.cardStatus,
            activeStatusCards: lateLegacy.first.active.statusCardIds.length,
            activeWorkingFields: lateLegacy.first.active.workingFields.length,
          },
          repeatedMigration: lateLegacy.noop,
          late: {
            rowKey: lateLegacy.first.secondKey,
            archivedStatus: secondArchivedRow.status,
            archivedCardStatus: lateLegacy.late.archive.cardStatus,
            auditReason: lateLegacy.late.audit.reason,
            auditRunCount: lateLegacy.late.runCount,
            activeStatusCards: lateLegacy.late.active.statusCardIds.length,
            activeWorkingFields: lateLegacy.late.active.workingFields.length,
            finalNoop: lateLegacy.late.finalNoop,
            finalStoreStable: lateLegacy.late.finalStoreStable,
            finalLogStable: lateLegacy.late.finalLogStable,
          },
        },
        diagnostics: {
          units: readonly.readinessUnits.length,
          productUnits: readonly.readinessUnits.filter((unit) => unit.scope === "product").length,
          companyUnits: readonly.readinessUnits.filter((unit) => unit.scope === "company").length,
          card152: readonly.readinessUnits.find((unit) => unit.unitId === "card-152"),
          card156: readonly.readinessUnits.find((unit) => unit.unitId === "card-156"),
        },
        isolationEnvironment: {
          projectId: smokeProjectId,
          persistedRealWorkspaceTouched: false,
        },
      },
      null,
      2,
    ),
  );
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
