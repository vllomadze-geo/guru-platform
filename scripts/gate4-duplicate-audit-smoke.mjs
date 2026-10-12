import { readFile } from "node:fs/promises";

const sourceExportPath =
  process.env.GURU_GATE4_SOURCE_EXPORT || "/Users/vl/Downloads/gate-4.json";
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
assert(sourceExport.exportedGateId === "gate-4", "Expected a Gate 4 export");
const fixture = {
  project: {
    productRegistryV185: sourceExport.content.project.productRegistryV185,
    catalogItemsV189: sourceExport.content.project.catalogItemsV189,
    gate0ScopedValuesV194: sourceExport.content.project.gate0ScopedValuesV194,
  },
  cards: sourceExport.gate.cards,
  gate4Production: sourceExport.content.gate4Production,
};

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
const pageTarget = targets.find((target) => target.id === targetId);
const page = new CdpClient(pageTarget.webSocketDebuggerUrl);
await page.ready;

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

async function waitFor(expression, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

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
  await waitFor('document.readyState === "complete"');
  await waitFor('typeof bootstrapAppOnce === "function"');
  await evaluate(`(() => {
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: "gate4-duplicate-audit-smoke",
      name: "Gate 4 duplicate audit smoke",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));
    location.reload();
    return true;
  })()`);
  await waitFor('document.querySelector("[data-open-project]")');
  await evaluate('document.querySelector("[data-open-project]").click(); true');
  await waitFor('Boolean(state)');

  const result = await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const fixture = ${JSON.stringify(fixture)};
    Object.assign(state.project, structuredClone(fixture.project));
    state.gates.find((gate) => gate.id === "gate-4").cards =
      structuredClone(fixture.cards);
    state.gate4Production = structuredClone(fixture.gate4Production);

    const canonicalKey = Object.keys(state.gate4Production.campaigns).find((key) => {
      const campaign = state.gate4Production.campaigns[key];
      return campaign?.decision === "prepare" &&
        !g4CampaignDuplicatePatternV283(key, campaign, state);
    });
    const canonicalBefore = structuredClone(
      state.gate4Production.campaigns[canonicalKey],
    );
    const cleanup = gate4DuplicateCleanupV283(state);
    g4EnsureLaunchCampaigns();
    const finalAudit = g4CampaignDuplicateAuditV283(state);
    const finalReadiness = g4ReadinessTitleAuditV283(state);
    const canonicalAfter = structuredClone(
      state.gate4Production.campaigns[canonicalKey],
    );

    const ui = guruV194Ui(state);
    const channelCounts = [];
    for (const product of state.project.catalogItemsV189) {
      ui.selectedCategoryId = product.categoryId || "";
      ui.selectedProductId = product.id;
      state.gate4Production.launchProduct = product.id;
      g4EnsureLaunchCampaigns();
      channelCounts.push({
        productId: product.id,
        productName: product.name,
        channels: g4LaunchChannels().length,
        campaigns: Object.values(state.gate4Production.campaigns).filter(
          (campaign) => campaign?.product === product.id,
        ).length,
      });
    }
    const afterEverySelection = g4CampaignDuplicateAuditV283(state);
    const log = state.project._gate4DuplicateCleanupLogV283.find(
      (entry) => entry.id === GATE4_DUPLICATE_CLEANUP_V283,
    );
    const logRunCount = log.runs.length;
    gate4DuplicateCleanupV283(state);
    const safetyWorkspace = structuredClone(state);
    const safetyKey = cleanup.removed[0].key;
    safetyWorkspace.gate4Production.campaigns[safetyKey] = {
      product: cleanup.removed[0].productId,
      objective: "Manual smoke data that must be preserved",
    };
    const safetyCleanup = gate4DuplicateCleanupV283(safetyWorkspace);
    guruNavigateToGate("gate-4");
    renderGate();
    const readinessWrapper = document.querySelector(".g4-readiness-v225");
    const readinessWrapperStyle = readinessWrapper
      ? getComputedStyle(readinessWrapper)
      : null;
    const readinessCard = document.querySelector("[data-g4-readiness-card]");
    const readinessHeader = readinessCard?.querySelector("summary");
    const readinessTitle = readinessCard?.querySelector(".g1-card-title");
    const campaignHeader = document.querySelector("[data-g4camp-toggle]");
    const campaignCard = campaignHeader?.closest(".g1-card");
    const campaignTitle = campaignCard?.querySelector(".g1-card-title");
    const classicStyle = (card, header, title) => {
      if (!card || !header || !title) return null;
      const cardStyle = getComputedStyle(card);
      const headerStyle = getComputedStyle(header);
      const titleStyle = getComputedStyle(title);
      return {
        backgroundColor: cardStyle.backgroundColor,
        borderTopWidth: cardStyle.borderTopWidth,
        borderLeftWidth: cardStyle.borderLeftWidth,
        borderTopColor: cardStyle.borderTopColor,
        borderLeftColor: cardStyle.borderLeftColor,
        borderRadius: cardStyle.borderRadius,
        headerPaddingTop: headerStyle.paddingTop,
        headerPaddingRight: headerStyle.paddingRight,
        headerPaddingBottom: headerStyle.paddingBottom,
        headerPaddingLeft: headerStyle.paddingLeft,
        titleFontSize: titleStyle.fontSize,
        titleFontWeight: titleStyle.fontWeight,
      };
    };

    return {
      build: window.GURU_BUILD_INFO?.version || "",
      before: cleanup.before,
      removed: cleanup.removed,
      preserved: cleanup.preserved,
      renamedCards: cleanup.renamedCards,
      finalAudit,
      afterEverySelection,
      titleBefore: cleanup.titleBefore,
      finalReadiness,
      canonicalKey,
      canonicalPreserved:
        JSON.stringify(canonicalBefore) === JSON.stringify(canonicalAfter),
      channelCounts,
      logRunCount,
      logStable: log.runs.length === logRunCount,
      loggedRemoved: log.runs.at(-1)?.campaigns?.removed?.length || 0,
      loggedManualReview:
        log.runs.at(-1)?.campaigns?.manualReview?.length || 0,
      nonEmptySafety: {
        preserved: safetyCleanup.preserved.length,
        removed: safetyCleanup.removed.length,
        stillExists: Boolean(
          safetyWorkspace.gate4Production.campaigns[safetyKey],
        ),
      },
      readinessWrapperStyle: readinessWrapperStyle
        ? {
            backgroundColor: readinessWrapperStyle.backgroundColor,
            borderTopWidth: readinessWrapperStyle.borderTopWidth,
            borderRadius: readinessWrapperStyle.borderRadius,
            paddingTop: readinessWrapperStyle.paddingTop,
            paddingRight: readinessWrapperStyle.paddingRight,
            paddingBottom: readinessWrapperStyle.paddingBottom,
            paddingLeft: readinessWrapperStyle.paddingLeft,
            marginTop: readinessWrapperStyle.marginTop,
            marginBottom: readinessWrapperStyle.marginBottom,
          }
        : null,
      classicUi: {
        sharedClasses: Boolean(
          readinessCard?.classList.contains("g1-card") &&
            readinessHeader?.classList.contains("g1-card-header") &&
            readinessCard
              ?.querySelector(".g4-readiness-card-body-v225")
              ?.classList.contains("g1-card-body"),
        ),
        togglePreserved:
          readinessCard
            ?.querySelector(".g4-readiness-toggle-v225")
            ?.textContent.trim() === "Открыть",
        readiness: classicStyle(
          readinessCard,
          readinessHeader,
          readinessTitle,
        ),
        campaign: classicStyle(campaignCard, campaignHeader, campaignTitle),
      },
    };
  })()`);

  const expectedBefore = [
    ["Рубашка Upcycling с кружевом", 34, 19],
    ["Летнее платье «Исландка»", 32, 17],
    ["Платье из льна", 32, 17],
    ["Лонгслив «Мак» с аппликацией", 32, 17],
    ["Свитшот с медведем для Михаила", 33, 18],
    ["Свитшот «Яра» с авторской аппликацией", 33, 18],
    ["Льняное демисезонное пальто", 34, 19],
    ["Символ 2027 года «Коза»", 33, 18],
  ];
  assert(result.build === "2.3.90", `Unexpected build ${result.build}`);
  assert(result.before.count === 263, `Expected 263 rows, got ${result.before.count}`);
  assert(result.before.duplicateCount === 143, `Expected 143 duplicates, got ${result.before.duplicateCount}`);
  assert(result.removed.length === 143, `Expected 143 removals, got ${result.removed.length}`);
  assert(result.removed.every((row) => !row.hasData), "A non-empty row was removed");
  assert(result.preserved.length === 0, "Unexpected non-empty duplicate");
  assert(result.finalAudit.count === 120, `Expected 120 rows, got ${result.finalAudit.count}`);
  assert(result.finalAudit.duplicateCount === 0, "Duplicate keys remain after cleanup");
  assert(result.afterEverySelection.duplicateCount === 0, "A duplicate returned after product switching");
  assert(result.afterEverySelection.count === 120, "Campaign count changed after product switching");
  assert(result.canonicalKey && result.canonicalPreserved, "Canonical filled campaign changed");
  assert(result.channelCounts.length === 8, "Expected all 8 products");
  assert(result.channelCounts.every((row) => row.channels === 15 && row.campaigns === 15), "Expected 15 primary channels per product");
  assert(JSON.stringify(result.before.byProduct.map((row) => [row.productName, row.count, row.duplicateCount])) === JSON.stringify(expectedBefore), "Per-product audit differs from expected export");
  assert(result.titleBefore.duplicates.length === 1, "Expected the one semantic readiness title collision");
  assert(JSON.stringify(result.titleBefore.duplicates[0].map((row) => row.id)) === JSON.stringify(["card-147", "card-148"]), "Unexpected readiness duplicate IDs");
  assert(result.finalReadiness.count === 23, "Expected 23 readiness cards");
  assert(result.finalReadiness.duplicates.length === 0, "Readiness title duplicates remain");
  assert(result.renamedCards.length === 2, "Both semantic readiness cards must be renamed");
  assert(result.loggedRemoved === 143 && result.loggedManualReview === 0, "Cleanup log is incomplete");
  assert(result.logStable, "Repeated audit appended an identical log run");
  assert(
    result.nonEmptySafety.preserved === 1 &&
      result.nonEmptySafety.removed === 0 &&
      result.nonEmptySafety.stillExists,
    "A non-empty technical duplicate was not preserved for manual review",
  );
  assert(
    result.readinessWrapperStyle &&
      result.readinessWrapperStyle.backgroundColor === "rgba(0, 0, 0, 0)" &&
      result.readinessWrapperStyle.borderTopWidth === "0px" &&
      result.readinessWrapperStyle.borderRadius === "0px" &&
      [
        result.readinessWrapperStyle.paddingTop,
        result.readinessWrapperStyle.paddingRight,
        result.readinessWrapperStyle.paddingBottom,
        result.readinessWrapperStyle.paddingLeft,
        result.readinessWrapperStyle.marginTop,
        result.readinessWrapperStyle.marginBottom,
      ].every((value) => value === "0px"),
    `Gate 4 readiness wrapper still looks like a panel: ${JSON.stringify(result.readinessWrapperStyle)}`,
  );
  assert(
    result.classicUi.sharedClasses &&
      result.classicUi.togglePreserved &&
      JSON.stringify(result.classicUi.readiness) ===
        JSON.stringify(result.classicUi.campaign),
    `Readiness does not use the classic Gate 4 card UI: ${JSON.stringify(result.classicUi)}`,
  );

  console.log(JSON.stringify({
    build: result.build,
    before: result.before.byProduct.map((row) => ({
      product: row.productName,
      campaigns: row.count,
      duplicates: row.duplicateCount,
      empty: row.emptyDuplicateCount,
      nonEmpty: row.nonEmptyDuplicateCount,
    })),
    removed: result.removed.length,
    manualReview: result.preserved.length,
    after: result.finalAudit.byProduct.map((row) => ({
      product: row.productName,
      campaigns: row.count,
      duplicates: row.duplicateCount,
    })),
    readinessRenamed: result.renamedCards,
    canonicalPreserved: result.canonicalPreserved,
    afterProductSwitching: result.afterEverySelection.count,
    logStable: result.logStable,
    nonEmptySafety: result.nonEmptySafety,
    readinessWrapperStyle: result.readinessWrapperStyle,
    classicUi: result.classicUi,
  }, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
