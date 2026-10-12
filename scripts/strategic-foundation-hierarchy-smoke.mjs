import { readFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9339";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const smokeProjectId = "strategic-foundation-hierarchy-smoke";
const goatId = "catalog-item-1786792591872-51f503";
const emptyProductId = "catalog-item-1786792591872-c8b1e9";
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

const gate0Export = JSON.parse(
  await readFile("/Users/vl/Downloads/gate-0.json", "utf8"),
);
const gate1Export = JSON.parse(
  await readFile("/Users/vl/Downloads/gate-1.json", "utf8"),
);
const sourceProject = gate1Export.content.project;
const sourceGate0Mega = gate0Export.gate.cards.find((card) => card.megaMarketing);
const sourcePageCard = gate1Export.gate.cards.find((card) =>
  (card.pageRows || []).some((row) => row.catalogItemIdV189 === goatId),
);
const sourcePages = sourcePageCard.pageRows.filter((row) =>
  [goatId, emptyProductId].includes(row.catalogItemIdV189),
);
const sourceMaps = gate1Export.content.painV130.productMaps.filter((map) =>
  map.items?.[goatId] || map.items?.[emptyProductId],
);

let browser;
let page;
let browserContextId = "";
let targetId = "";

async function evaluate(expression) {
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

async function evaluateFunction(fn, argument) {
  return evaluate("(" + fn.toString() + ")(" + JSON.stringify(argument) + ")");
}

async function waitFor(expression, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate("Boolean(" + expression + ")")) return;
    await wait(100);
  }
  throw new Error("Timed out waiting for " + expression);
}

try {
  const version = await (
    await fetch("http://127.0.0.1:" + debugPort + "/json/version")
  ).json();
  browser = new CdpClient(version.webSocketDebuggerUrl);
  await browser.ready;
  ({ browserContextId } = await browser.call("Target.createBrowserContext"));
  ({ targetId } = await browser.call("Target.createTarget", {
    url: "about:blank",
    browserContextId,
  }));
  const targets = await (
    await fetch("http://127.0.0.1:" + debugPort + "/json")
  ).json();
  const pageTarget = targets.find((target) => target.id === targetId);
  page = new CdpClient(pageTarget.webSocketDebuggerUrl);
  await page.ready;
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Page.addScriptToEvaluateOnNewDocument", {
    source: "{ const nativeFetch = window.fetch.bind(window); window.fetch = (input, init) => String(input).includes('/api/') ? Promise.resolve(new Response(JSON.stringify({ ok: true, smoke: true }), { status: 200, headers: { 'Content-Type': 'application/json' } })) : nativeFetch(input, init); }",
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor("document.readyState === 'complete'");
  await waitFor("typeof bootstrapAppOnce === 'function'");
  await evaluateFunction((projectId) => {
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: projectId,
      name: "Strategic foundation hierarchy smoke",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }]));
    location.reload();
    return true;
  }, smokeProjectId);
  await waitFor("document.querySelector('[data-open-project]')");
  await evaluate("document.querySelector('[data-open-project]').click(); true");
  await waitFor("Boolean(state)");

  await evaluateFunction((payload) => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    Object.assign(state.project, structuredClone(payload.sourceProject));
    const gate0 = state.gates.find((gate) => gate.id === "gate-0");
    const mega = gate0.cards.find((card) => card.id === payload.mega.id) ||
      gate0.cards.find(isMegaMarketingCard);
    mega.megaMarketing = structuredClone(payload.mega.megaMarketing);
    const gate1 = state.gates.find((gate) => gate.id === "gate-1");
    const pageCard = gate1.cards.find((card) => card.id === payload.pageCardId);
    pageCard.pageRows = structuredClone(payload.pages);
    state.painV130 = state.painV130 || {};
    state.painV130.productMaps = structuredClone(payload.maps);
    const product = guruV194Product(payload.goatId, state);
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = product.categoryId;
    ui.selectedProductId = product.id;
    guruNavigateToGate("gate-2");
    renderGate();
    return true;
  }, {
    sourceProject,
    mega: sourceGate0Mega,
    pageCardId: sourcePageCard.id,
    pages: sourcePages,
    maps: sourceMaps,
    goatId,
  });
  await waitFor("document.querySelector('[data-guru-strategic-foundation]')");

  const goat = await evaluateFunction((productId) => {
    const product = guruV194Product(productId, state);
    const model = guruStrategicFoundationModelV286(product);
    const panel = document.querySelector("[data-guru-strategic-foundation]");
    const selector = panel.closest(".guru-product-context-shell-v237")
      ?.querySelector(".gate0-product-context-v194");
    const firstFilledRow = panel.querySelector(".guru-strategic-row-v286.is-filled");
    const filledSelect = selector?.querySelector("select.is-filled");
    const surfaceSignature = (node) => {
      const css = getComputedStyle(node);
      return [
        css.backgroundColor,
        css.borderTopColor,
        css.borderTopWidth,
        css.borderRadius,
        css.paddingTop,
        css.paddingRight,
        css.paddingBottom,
        css.paddingLeft,
        css.boxShadow,
      ].join("|");
    };
    const fieldSignature = (node) => {
      const css = getComputedStyle(node);
      return [
        css.backgroundColor,
        css.borderTopColor,
        css.borderTopWidth,
        css.borderRadius,
        css.paddingRight,
        css.paddingLeft,
      ].join("|");
    };
    const rows = Array.from(panel.querySelectorAll(".guru-strategic-row-v286"))
      .map((row) => row.querySelector(".guru-strategic-row-copy-v286 > strong")?.textContent.trim());
    const details = Array.from(panel.querySelectorAll("[data-guru-strategic-jtbd-v286]"));
    const descriptorData = details.map((node) => {
      const chips = Array.from(node.querySelectorAll(".guru-strategic-keyword-group-v286 span"))
        .map((entry) => entry.textContent.trim().toLocaleLowerCase("ru-RU"));
      return {
        id: node.dataset.guruStrategicJtbdV286,
        open: node.open,
        label: node.querySelector(".guru-strategic-jtbd-number-v286")?.textContent.trim(),
        count: chips.length,
        unique: new Set(chips).size,
        groups: Array.from(node.querySelectorAll(".guru-strategic-keyword-group-v286 > strong"))
          .map((entry) => entry.textContent.trim()),
      };
    });
    return {
      build: window.GURU_BUILD_INFO?.version || "",
      contextKey: model.contextKey,
      primaryId: model.primaryId,
      rows,
      descriptors: descriptorData,
      modelCounts: model.descriptors.map((descriptor) => ({
        id: descriptor.id,
        sourceType: descriptor.sourceType,
        count: descriptor.entries.length,
      })),
      finalCount: model.keywordModel.finalEntries.length,
      linkedCount: model.descriptors.reduce((sum, descriptor) => sum + descriptor.entries.length, 0),
      querySum: model.descriptors.reduce((sum, descriptor) =>
        sum + descriptor.entries.reduce((subtotal, entry) =>
          subtotal + (pv181DemandQueryNumberV262(entry.row?.queryCount) || 0), 0), 0),
      unlinked: model.keywordModel.unlinked.length,
      firstIsMain: descriptorData[0]?.id === model.primaryId &&
        descriptorData[0]?.label.includes("Основной JTBD"),
      secondId: descriptorData[1]?.id || "",
      oldFoundationCards: panel.querySelectorAll(".guru-strategic-keyword-card-v249").length,
      hasOldFoundationText: /Фундамент ключевых слов \\(середина\\)/.test(panel.textContent),
      offerRows: rows.filter((label) => label === "Оффер + CTA").length,
      assignedOffers: panel.querySelectorAll(".guru-strategic-assigned-offer-v286").length,
      primaryActions: panel.querySelectorAll("[data-guru-strategic-primary-v286]").length,
      hasPrimaryActionText: panel.textContent.includes("Сделать основным"),
      verticalFlow: getComputedStyle(panel.querySelector(".guru-strategic-flow-v286")).gridTemplateColumns,
      selectorSurfaceMatch: Boolean(selector) &&
        surfaceSignature(panel) === surfaceSignature(selector),
      selectorFieldMatch: Boolean(firstFilledRow && filledSelect) &&
        fieldSignature(firstFilledRow) === fieldSignature(filledSelect),
      selectorFieldSignature: filledSelect ? fieldSignature(filledSelect) : "",
      strategicFieldSignature: firstFilledRow ? fieldSignature(firstFilledRow) : "",
    };
  }, goatId);

  assert(goat.build === "2.3.90", "Unexpected build " + goat.build);
  assert(
    goat.rows.join("|") === "Посадочная страница|Сегмент|Позиционирование|УТП|Оффер + CTA",
    "The strategic order is wrong: " + goat.rows.join("|"),
  );
  assert(goat.descriptors.length >= 2, "Main/additional JTBD cards are missing");
  assert(goat.firstIsMain && goat.descriptors[0].open, "Main JTBD is not first and open");
  assert(
    goat.descriptors.slice(1).every((descriptor) => !descriptor.open),
    "Additional JTBD must be collapsed by default",
  );
  assert(
    goat.modelCounts.some((entry) => entry.sourceType === "gate0" && entry.count > 0) &&
      goat.modelCounts.some((entry) => entry.sourceType === "additional" && entry.count > 0),
    "Final keywords are not linked to both main and additional JTBD",
  );
  assert(
    goat.descriptors.every((descriptor) => descriptor.count === descriptor.unique),
    "A JTBD card contains duplicate keywords",
  );
  assert(
    !goat.oldFoundationCards && !goat.hasOldFoundationText,
    "Initial/middle keyword foundations still render in the summary",
  );
  assert(goat.offerRows === 1, "The common Offer + CTA block is duplicated");
  assert(
    goat.assignedOffers === 0,
    "An individual offer was invented without an explicit stable assignment",
  );
  assert(goat.verticalFlow.split(" ").length === 1, "The flow is not single-column");
  assert(
    goat.selectorSurfaceMatch,
    "Strategic foundation does not use the selector surface UI",
  );
  assert(
    goat.selectorFieldMatch,
    "Filled strategic rows do not use the selector field UI: " +
      goat.strategicFieldSignature + " !== " + goat.selectorFieldSignature,
  );
  assert(
    goat.primaryActions === 0 && !goat.hasPrimaryActionText,
    "The removed make-primary action is still rendered",
  );
  console.log("phase:initial");

  const additionalId = goat.secondId;
  await evaluateFunction((jtbdId) => {
    const details = document.querySelector(
      "[data-guru-strategic-jtbd-v286='" + CSS.escape(jtbdId) + "']",
    );
    details.querySelector(":scope > summary").click();
    return true;
  }, additionalId);
  await waitFor("document.querySelector(\"[data-guru-strategic-jtbd-v286='\" + CSS.escape(" + JSON.stringify(additionalId) + ") + \"']\").open");

  const gate4Persistence = await evaluateFunction((payload) => {
    guruNavigateToGate("gate-4");
    const product = guruV194Product(payload.productId, state);
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = product.categoryId;
    ui.selectedProductId = product.id;
    renderGate();
    const model = guruStrategicFoundationModelV286(product);
    const details = document.querySelector(
      "[data-guru-strategic-jtbd-v286='" + CSS.escape(payload.jtbdId) + "']",
    );
    return {
      gate: activeGateId,
      contextKey: model.contextKey,
      open: Boolean(details?.open),
    };
  }, { productId: goatId, jtbdId: additionalId });
  assert(
    gate4Persistence.gate === "gate-4" &&
      gate4Persistence.contextKey === goat.contextKey &&
      gate4Persistence.open,
    "Expansion state did not persist between gates",
  );
  console.log("phase:gate4");

  await evaluate("saveState(); true");
  console.log("phase:before-reload");
  await page.call("Page.navigate", {
    url: appUrl + "?strategic-reopen=" + Date.now(),
  });
  console.log("phase:after-reload-call");
  await waitFor("document.readyState === 'complete'");
  await waitFor("typeof bootstrapAppOnce === 'function'");
  await waitFor("document.querySelector('[data-open-project]') || Boolean(state)");
  await evaluate("document.querySelector('[data-open-project]')?.click(); true");
  await waitFor("Boolean(state)");
  const reloadPersistence = await evaluateFunction((payload) => {
    scheduleCloudSync = () => {};
    const product = guruV194Product(payload.productId, state);
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = product.categoryId;
    ui.selectedProductId = product.id;
    guruNavigateToGate("gate-2");
    renderGate();
    const details = document.querySelector(
      "[data-guru-strategic-jtbd-v286='" + CSS.escape(payload.jtbdId) + "']",
    );
    return {
      contextKey: guruStrategicFoundationModelV286(product).contextKey,
      open: Boolean(details?.open),
      isolatedDefault: Object.keys(
        guruStrategicFoundationUiV286({ project: {} }, false).openByContext,
      ).length === 0,
    };
  }, { productId: goatId, jtbdId: additionalId });
  assert(
    reloadPersistence.contextKey === goat.contextKey && reloadPersistence.open,
    "Expansion state did not persist after reload/project reopen",
  );
  assert(reloadPersistence.isolatedDefault, "Another project inherited UI state");
  console.log("phase:reload");

  const renameStability = await evaluateFunction((payload) => {
    const product = guruV194Product(payload.productId, state);
    const context = guruGate1FinalPainContextV259(product, false);
    const entry = guruGate1EnsureAdditionalJtbdsV268(context.itemData)
      .find((candidate) => "gate1:" + candidate.id === payload.jtbdId);
    const before = entry.desired_action;
    entry.desired_action = before + " · проверка переименования";
    renderGate();
    const node = document.querySelector(
      "[data-guru-strategic-jtbd-v286='" + CSS.escape(payload.jtbdId) + "']",
    );
    const result = {
      open: Boolean(node?.open),
      renamed: node?.textContent.includes("проверка переименования"),
    };
    entry.desired_action = before;
    renderGate();
    return result;
  }, { productId: goatId, jtbdId: additionalId });
  assert(
    renameStability.open && renameStability.renamed,
    "Rename reset a stable JTBD expansion state",
  );
  console.log("phase:rename");

  const noMainState = await evaluateFunction((productId) => {
    const product = guruV194Product(productId, state);
    const snapshot = g3ProductJourneySnapshot(product);
    const source = snapshot.scoped.jtbd.records[0];
    const extra = {
      ...structuredClone(source),
      id: "gate0-value-strategic-smoke-extra",
      value: "Второй JTBD для проверки явного выбора",
      jtbd: {
        situation: "есть второй контекст",
        desired_action: "выбрать задачу",
        result: "сохранить явный выбор",
      },
    };
    const records = state.project.gate0ScopedValuesV194;
    records.push(extra);
    const temporaryModel = guruStrategicFoundationModelV286(product);
    const ui = guruStrategicFoundationUiV286(state, true);
    const oldPrimary = ui.primaryByContext[temporaryModel.contextKey];
    delete ui.primaryByContext[temporaryModel.contextKey];
    renderGate();
    const result = {
      notice: Boolean(document.querySelector(".guru-strategic-primary-notice-v286")),
      primaryActions: document.querySelectorAll("[data-guru-strategic-primary-v286]").length,
      cardCount: document.querySelectorAll("[data-guru-strategic-jtbd-v286]").length,
    };
    records.splice(records.indexOf(extra), 1);
    if (oldPrimary) ui.primaryByContext[temporaryModel.contextKey] = oldPrimary;
    else delete ui.primaryByContext[temporaryModel.contextKey];
    renderGate();
    return result;
  }, goatId);
  assert(
    noMainState.notice &&
      noMainState.cardCount >= 2 &&
      noMainState.primaryActions === 0,
    "No-main state is missing its prompt or still renders make-primary actions",
  );
  console.log("phase:no-main");

  const empty = await evaluateFunction((productId) => {
    const product = guruV194Product(productId, state);
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = product.categoryId;
    ui.selectedProductId = product.id;
    renderGate();
    const model = guruStrategicFoundationModelV286(product);
    return {
      finalCount: model.keywordModel.finalEntries.length,
      notice: document.querySelector(".guru-strategic-final-notice-v286")?.textContent.trim() || "",
      renderedCards: document.querySelectorAll("[data-guru-strategic-jtbd-v286]").length,
      modelCards: model.descriptors.length,
    };
  }, emptyProductId);
  assert(
    empty.finalCount === 0 &&
      empty.notice === "Финальные ключевые слова не сформированы" &&
      empty.renderedCards === empty.modelCards,
    "Empty Final state is wrong or synthetic JTBD cards were added",
  );
  console.log("phase:empty");

  await evaluateFunction((payload) => {
    const product = guruV194Product(payload.productId, state);
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = product.categoryId;
    ui.selectedProductId = product.id;
    renderGate();
    const details = document.querySelector(
      "[data-guru-strategic-jtbd-v286='" + CSS.escape(payload.jtbdId) + "']",
    );
    details.open = true;
    Array.from(details.querySelectorAll("[data-g4-jump-target]"))
      .find((button) => button.textContent.includes("финальные ключевые слова"))
      .click();
    return true;
  }, { productId: goatId, jtbdId: additionalId });
  await waitFor("activeGateId === 'gate-1'");
  await waitFor("document.querySelector('[data-pv181-additional-jtbd-v268].guru-source-target-v212')");
  const navigation = await evaluateFunction((jtbdId) => ({
    gate: activeGateId,
    product: guruV194SelectedProduct(state)?.id || "",
    exact: Boolean(document.querySelector(
      "[data-pv181-additional-jtbd-v268='" +
        CSS.escape(jtbdId.replace("gate1:", "")) +
        "'].guru-source-target-v212",
    )),
  }), additionalId);
  assert(
    navigation.gate === "gate-1" &&
      navigation.product === goatId &&
      navigation.exact,
    "Final keyword source link did not open the exact additional JTBD",
  );
  console.log("phase:navigation");

  console.log(JSON.stringify({
    goat: {
      finalCount: goat.finalCount,
      linkedCount: goat.linkedCount,
      querySum: goat.querySum,
      unlinked: goat.unlinked,
      groups: goat.descriptors.map((descriptor) => descriptor.groups),
    },
    persistence: {
      betweenGates: gate4Persistence.open,
      afterReload: reloadPersistence.open,
      afterRename: renameStability.open,
      isolatedProject: reloadPersistence.isolatedDefault,
    },
    noMainState,
    empty,
    navigation,
  }, null, 2));
} finally {
  if (page) page.close();
  if (browser && targetId) {
    try {
      await browser.call("Target.closeTarget", { targetId });
    } catch {}
  }
  if (browser && browserContextId) {
    try {
      await browser.call("Target.disposeBrowserContext", { browserContextId });
    } catch {}
  }
  if (browser) browser.close();
}
