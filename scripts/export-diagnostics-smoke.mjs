import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9337";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function firstJsonDiff(beforeText, afterText) {
  const before = JSON.parse(beforeText);
  const after = JSON.parse(afterText);
  const visit = (left, right, path = "root") => {
    if (Object.is(left, right)) return null;
    if (!left || !right || typeof left !== "object" || typeof right !== "object")
      return { path, before: left, after: right };
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of keys) {
      if (!(key in left) || !(key in right))
        return { path: `${path}.${key}`, before: left[key], after: right[key] };
      const diff = visit(left[key], right[key], `${path}.${key}`);
      if (diff) return diff;
    }
    return null;
  };
  return visit(before, after);
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.listeners = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      (this.listeners.get(message.method) || []).forEach((listener) => listener(message.params || {}));
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

  on(method, listener) {
    const list = this.listeners.get(method) || [];
    list.push(listener);
    this.listeners.set(method, list);
    return () => this.listeners.set(method, (this.listeners.get(method) || []).filter((item) => item !== listener));
  }

  close() {
    this.socket.close();
  }
}

const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const pageTarget = pages.find((item) => item.type === "page");
if (!pageTarget) throw new Error("Headless Chrome page was not found");
if (pageTarget.url !== "about:blank") throw new Error("Safety stop: expected isolated about:blank page");
const browserVersion = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const page = new CdpClient(pageTarget.webSocketDebuggerUrl);
const browser = new CdpClient(browserVersion.webSocketDebuggerUrl);
await Promise.all([page.ready, browser.ready]);

async function evaluate(expression) {
  const response = await page.call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  }
  return response.result.value;
}

const downloadPath = await mkdtemp(join(tmpdir(), "guru-export-downloads-"));
await browser.call("Browser.setDownloadBehavior", {
  behavior: "allowAndName",
  downloadPath,
  eventsEnabled: true,
});

async function clickAndReadDownload(clickExpression, expectedFilename) {
  let guid = "";
  let suggestedFilename = "";
  let resolveDone;
  let rejectDone;
  const done = new Promise((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });
  const timeout = setTimeout(() => rejectDone(new Error(`Download timed out: ${expectedFilename}`)), 15000);
  const offBegin = browser.on("Browser.downloadWillBegin", (event) => {
    if (expectedFilename && event.suggestedFilename !== expectedFilename) return;
    guid = event.guid;
    suggestedFilename = event.suggestedFilename;
  });
  const offProgress = browser.on("Browser.downloadProgress", (event) => {
    if (!guid || event.guid !== guid) return;
    if (event.state === "completed") resolveDone();
    if (event.state === "canceled") rejectDone(new Error(`Download canceled: ${suggestedFilename}`));
  });
  try {
    await evaluate(clickExpression);
    await done;
    const path = join(downloadPath, guid);
    const text = await readFile(path, "utf8");
    return { filename: suggestedFilename, path, bytes: (await stat(path)).size, payload: JSON.parse(text) };
  } finally {
    clearTimeout(timeout);
    offBegin();
    offProgress();
  }
}

await page.call("Runtime.enable");
await page.call("Page.enable");
await page.call("Page.addScriptToEvaluateOnNewDocument", {
  source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes("/api/")
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmokeTest: true }), { status: 200, headers: { "Content-Type": "application/json" } }))
      : nativeFetch(input, init);
  }`,
});
await page.call("Page.navigate", { url: "http://127.0.0.1:3000/" });
await wait(1200);
await evaluate(`(() => {
  localStorage.clear();
  localStorage.setItem("guru-platform-access-v01", "unlocked");
  localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
    id: "export-diagnostics-smoke",
    name: "Export diagnostics smoke",
    lifecycleStatus: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }]));
  location.reload();
  return true;
})()`);
await wait(1600);
await evaluate('document.querySelector("[data-open-project]")?.click(); true');
await wait(1600);

const setup = await evaluate(`(() => {
  scheduleCloudSync = () => {};
  scheduleProjectsCloudSync = () => {};
  ensureGate2Structure(state.gates.find((gate) => gate.id === "gate-2"));

  state.project.productRegistryV185 = [{ id: "export-category", name: "Экспорт", legacyNames: [] }];
  state.project.catalogItemsV189 = [{ id: "export-product", name: "Экспортный продукт", categoryId: "export-category", continuum: "pure_product" }];
  state.project.productBindingsV185 = { "export-category": { sentinel: "bindings-ok" } };
  state.project.gate0ScopedValuesV194 = [{
    id: "export-scope", project_id: activeProjectId, category_id: "export-category", product_id: "export-product",
    scope: "product", field: "jtbd", value: "scope-ok", source: { type: "manual", label: "smoke" },
    confirmation_status: "confirmed", created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  }];
  state.sharedEvidence.export_sentinel = "shared-ok";
  guruV194Ui(state).selectedCategoryId = "export-category";
  guruV194Ui(state).selectedProductId = "export-product";

  state.project._gate0ProductIdMigrationLog = [{ id: "log-g0-product" }];
  state.project._gate0SectionsMigrationLog = [{ id: "log-g0-sections" }];
  state.project._gate1SectionsMigrationLog = [{ id: "log-g1-sections" }];
  state.project._gate1ProductIdLinkLog = [{ id: "log-g1-links" }];
  ensureGate5State().migrationLog.push({ id: "log-g5" });
  ensureGate8Workspace(state).migrationLog.push({ id: "log-g8" });

  const megaCard = state.gates.find((gate) => gate.id === "gate-0").cards.find(isMegaMarketingCard);
  const mega = ensureMegaMarketing(megaCard, state);
  mega.platformV2.fundamental.find((item) => item.name === "Мобильная версия").status = "broken";
  mega.platformV2.fundamental.find((item) => item.name === "Форма заявки / корзина").status = "works";
  mega.platformV2.fundamental.find((item) => item.name === "Контакты (телефон, адрес, мессенджер)").status = "works";
  mega.platformV2.fundamental.find((item) => item.name === "Политика конфиденциальности").status = "needs_improvement";
  mega.infra.find((item) => item.name === "Яндекс Метрика").status = "missing";
  mega.infra.find((item) => item.name === "UTM-разметка").status = "works";
  mega.infra.find((item) => item.name === "CRM").status = "works";
  mega.infra.find((item) => item.name === "Уведомления о заявках").status = "works";
  mega.channels = [{ channel: "Яндекс Директ", platform: "Яндекс Директ", type: "Поиск", status: "works" }];

  const gate2 = state.gates.find((gate) => gate.id === "gate-2");
  gate2.cards.forEach((card) => { (card.fields ||= {}).g2Check = ""; });
  gate2.cards.find((card) => card.id === "card-92").fields.g2Check = "works";

  const applyFixtureStatuses = (workspace) => {
    const gate1 = workspace.gates.find((gate) => gate.id === "gate-1");
    gate1.cards.find((card) => card.id === "card-16").status = "problem";
    gate1.cards.find((card) => card.id === "card-36").status = "problem";
  };
  const nativeRecalculateAllStatuses = recalculateAllStatuses;
  recalculateAllStatuses = function (workspace = state) {
    nativeRecalculateAllStatuses(workspace);
    applyFixtureStatuses(workspace);
  };
  applyFixtureStatuses(state);

  const channels = g4LaunchChannels();
  const campaigns = g4EnsureLaunchCampaigns();
  const product = g4ProductPickSelected(state);
  const productKey = g4ProductPickKey(product, state);
  G4_READINESS_UNIQUE_CARD_IDS_V225.forEach((cardId) => {
    const card = g4ReadinessCardV225(cardId, state);
    g4ReadinessTemplateRowsV225(card).forEach((template, rowIndex) => {
      const row = g4ReadinessProductRowV225(
        productKey,
        cardId,
        template.key,
        state,
        true,
      );
      row.status = cardId === "card-152" && rowIndex === 0 ? "broken" : "works";
      row.result = "Export product readiness smoke";
    });
  });
  const channel = channels[0];
  const campaignKey = g4CampaignStateKey(productKey, channel.key);
  Object.assign(campaigns[campaignKey], {
    decision: "prepare", product: productKey, campaignName: "Export ready campaign", objective: "Smoke",
    landing: "https://example.test/", budget: "1000", utm: "utm_source=smoke", launchStatus: "ready"
  });
  return { gate2Count: gate2.cards.length, productKey, campaignKey, campaignStatus: g4CampaignStatus(campaigns[campaignKey]) };
})()`);
if (setup.gate2Count !== 52) throw new Error(`Expected 52 Gate 2 cards, got ${setup.gate2Count}`);
if (setup.campaignStatus !== "ready") throw new Error(`Current Gate 4 fixture is not ready: ${JSON.stringify(setup)}`);

const buttonChecks = [];
for (let index = 0; index <= 8; index += 1) {
  const gateId = `gate-${index}`;
  await evaluate(`guruNavigateToGate(${JSON.stringify(gateId)}); true`);
  const check = await evaluate(`(() => {
    const buttons = [...document.querySelectorAll("[data-debug-export-gate]")];
    const button = buttons[0];
    const projectButton = document.querySelector("[data-export-project-content]");
    const visible = (node) => Boolean(node && node.getClientRects().length && getComputedStyle(node).visibility !== "hidden" && getComputedStyle(node).display !== "none");
    return {
      activeGateId,
      gateButtons: buttons.length,
      gateButtonGateId: button?.dataset.gateId || "",
      gateButtonVisible: visible(button),
      projectButtonVisible: visible(projectButton),
      toolbarDisplay: getComputedStyle(document.getElementById("workspaceToolbar")).display,
    };
  })()`);
  if (check.activeGateId !== gateId || check.gateButtons !== 1 || check.gateButtonGateId !== gateId || !check.gateButtonVisible || !check.projectButtonVisible) {
    throw new Error(`Toolbar check failed for ${gateId}: ${JSON.stringify(check)}`);
  }
  buttonChecks.push(check);
  await wait(180);
}

await evaluate('guruNavigateToGate("gate-2"); true');
await wait(700);
await evaluate(`(() => {
  window.__exportSmokePersistence = { saveState: 0, flashSaving: 0, cloud: 0, projectCloud: 0 };
  const originalSaveState = saveState;
  const originalFlashSaving = flashSaving;
  const originalScheduleCloudSync = scheduleCloudSync;
  const originalScheduleProjectsCloudSync = scheduleProjectsCloudSync;
  saveState = function () {
    window.__exportSmokePersistence.saveState += 1;
    return originalSaveState.apply(this, arguments);
  };
  flashSaving = function () {
    window.__exportSmokePersistence.flashSaving += 1;
    return originalFlashSaving.apply(this, arguments);
  };
  scheduleCloudSync = function () {
    window.__exportSmokePersistence.cloud += 1;
    return originalScheduleCloudSync.apply(this, arguments);
  };
  scheduleProjectsCloudSync = function () {
    window.__exportSmokePersistence.projectCloud += 1;
    return originalScheduleProjectsCloudSync.apply(this, arguments);
  };
  return true;
})()`);
const liveSnapshotExpression = `JSON.stringify({
  state,
  workspaceStorage: localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId),
  projectsStorage: localStorage.getItem(PROJECTS_STORAGE_KEY)
})`;
const gate2StateBefore = await evaluate(liveSnapshotExpression);
const gate2Download = await clickAndReadDownload(
  'document.querySelector("[data-debug-export-gate]").click(); true',
  "gate-2.json",
);
await wait(700);
const gate2StateAfter = await evaluate("JSON.stringify(state)");
const gate2PersistenceAfter = await evaluate(liveSnapshotExpression);
if (gate2PersistenceAfter !== gate2StateBefore) {
  throw new Error(
    `Gate export mutated live workspace state: ${JSON.stringify(firstJsonDiff(gate2StateBefore, gate2PersistenceAfter))}`,
  );
}
const gate2Payload = gate2Download.payload;
const diagnosticCards = gate2Payload.diagnostics?.cards || [];
const expectedIds = Array.from({ length: 48 }, (_, index) => `card-${89 + index}`).concat([
  "g2-cwv", "g2-canonical", "g2-internal-filter", "g2-antibot",
]);
const actualIds = diagnosticCards.map((card) => card.unitId);
if (JSON.stringify(actualIds) !== JSON.stringify(expectedIds)) {
  throw new Error(`Gate 2 diagnostic card order mismatch: ${JSON.stringify(actualIds)}`);
}
if (gate2Payload.format !== "guru-gate-content-v1" || gate2Payload.exportedGateId !== "gate-2" || gate2Payload.structure.cards.length !== 52) {
  throw new Error("Original Gate export fields changed or Gate 2 raw structure is incomplete");
}
const headers = new Set(["card-89", "card-95", "card-99", "card-106", "card-112", "card-115", "card-121", "card-125", "card-130", "card-133"]);
const expectedProblem = new Set(["card-90", "card-91", "card-98", "card-100", "card-101", "card-102", "card-103", "card-104", "card-134", "g2-canonical"]);
const expectedReady = new Set(["card-92", "card-94", "card-105", "card-122", "card-123", "card-124", "card-126", "card-127", "card-128", "card-131", "card-132"]);
const middleOracle = new Map([
  ["card-91", ["F", "card-7"]], ["card-92", ["F", "card-7"]],
  ["card-94", ["F", "card-7"]], ["card-97", ["G1", "card-20"]], ["card-98", ["G1", "card-16"]],
  ...["card-100", "card-101", "card-102", "card-103", "card-104"].map((id) => [id, ["I", "card-7"]]),
  ["card-105", ["I", "card-7"]], ["card-107", ["I", "card-7"]], ["card-108", ["G1", "card-14"]],
  ["card-109", ["G1", "card-14"]], ...["card-122", "card-123", "card-124", "card-126", "card-127", "card-128", "card-129"].map((id) => [id, ["I", "card-7"]]),
  ["card-134", ["F", "card-7"]], ["card-135", ["G1", "card-37"]], ["g2-cwv", ["G1", "card-18"]], ["g2-canonical", ["G1", "card-16"]],
]);
const legacyOracle = new Map([
  ["card-90", "card-152"], ["card-91", "card-156"], ["card-92", "card-155"], ["card-94", "card-155"],
  ...["card-100", "card-101", "card-102", "card-103", "card-104"].map((id) => [id, "card-157"]),
  ["card-105", "card-158"], ...["card-122", "card-123", "card-124"].map((id) => [id, "card-168"]),
  ...["card-126", "card-127", "card-128", "card-131", "card-132"].map((id) => [id, "card-159"]),
]);
for (const card of diagnosticCards) {
  if (headers.has(card.unitId)) {
    if (card.includedInUi !== false || card.displayedStatus !== null) throw new Error(`Header diagnostics are not honest: ${card.unitId}`);
    continue;
  }
  if (card.sourceChain[0]?.key !== "M") throw new Error(`M is not first for ${card.unitId}`);
  const legacy = card.sourceChain.find((source) => source.key === "L");
  const expectedLegacyId = legacyOracle.get(card.unitId);
  if (legacy?.cardId !== expectedLegacyId) throw new Error(`Wrong explicit Gate 4 source for ${card.unitId}: ${legacy?.cardId}`);
  const middle = middleOracle.get(card.unitId);
  const hasLegacy = legacyOracle.has(card.unitId);
  const expectedSourceKeys = card.unitId === "card-134"
    ? ["M", "F", "G1"]
    : ["M", ...(middle ? [middle[0]] : []), ...(hasLegacy ? ["L"] : [])];
  const sourceKeys = card.sourceChain.map((source) => source.key);
  const expectedDiagnosticKeys = [
    ...expectedSourceKeys,
    ...(card.selectedSource?.key === "BASE" ? ["BASE"] : []),
  ];
  if (JSON.stringify(sourceKeys) !== JSON.stringify(expectedDiagnosticKeys) || card.fallbackExpression !== expectedSourceKeys.join(" → ")) {
    throw new Error(`Wrong complete fallback chain for ${card.unitId}: ${card.fallbackExpression}`);
  }
  if (middle) {
    const source = card.sourceChain.find((item) => item.key === middle[0]);
    if (!source || source.cardId !== middle[1]) throw new Error(`Wrong middle source for ${card.unitId}: ${JSON.stringify(source)}`);
  }
  if (card.unitId === "card-134") {
    const gate1Source = card.sourceChain.find((item) => item.key === "G1");
    if (gate1Source?.cardId !== "card-36" || card.selectedSource?.key !== "G1") {
      throw new Error(`Gate 0 deferred/Gate 1 priority mismatch for card-134: ${JSON.stringify(card.selectedSource)}`);
    }
  }
  const expected = expectedProblem.has(card.unitId)
    ? "problem"
    : expectedReady.has(card.unitId)
      ? "ready"
      : "not_started";
  if (card.displayedStatus !== expected || card.result !== expected) {
    throw new Error(`Wrong final status for ${card.unitId}: expected ${expected}, got ${card.displayedStatus}`);
  }
  if (card.currentProductGate4?.participatesInFinalStatus !== hasLegacy) {
    throw new Error(`Product Gate 4 participation mismatch for ${card.unitId}`);
  }
}
const selectedSourceOracle = new Map(
  "card-90:L card-91:F card-92:M card-93:BASE card-94:F card-96:BASE card-97:BASE card-98:G1 card-100:I card-101:I card-102:I card-103:I card-104:I card-105:I card-107:BASE card-108:BASE card-109:BASE card-110:BASE card-111:BASE card-113:BASE card-114:BASE card-116:BASE card-117:BASE card-118:BASE card-119:BASE card-120:BASE card-122:I card-123:I card-124:I card-126:I card-127:I card-128:I card-129:BASE card-131:L card-132:L card-134:G1 card-135:BASE card-136:BASE g2-cwv:BASE g2-canonical:G1 g2-internal-filter:BASE g2-antibot:BASE"
    .split(" ").map((entry) => entry.split(":")),
);
for (const card of diagnosticCards.filter((item) => item.includedInUi)) {
  if (card.selectedSource?.key !== selectedSourceOracle.get(card.unitId)) {
    throw new Error(`Wrong selected source for ${card.unitId}: ${card.selectedSource?.key}`);
  }
}
console.log(JSON.stringify({
  gate2LegacyStoredPillDifferences: diagnosticCards
    .filter((card) => card.includedInUi && card.rawStoredStatus !== card.displayedStatus)
    .map((card) => card.unitId),
  gate2StatusWarnings: diagnosticCards
    .filter((card) => card.includedInUi && card.warnings?.length)
    .map((card) => ({ id: card.unitId, warnings: card.warnings })),
  gate2AutomaticSources: diagnosticCards
    .filter((card) => ["F", "I", "G1", "L"].includes(card.selectedSource?.key))
    .map((card) => ({ id: card.unitId, source: card.selectedSource.key })),
}, null, 2));

await evaluate(`(() => {
  state.gates.find((gate) => gate.id === "gate-2").cards.find((card) => card.id === "card-92").fields.g2Check = "broken";
  return true;
})()`);
const gate2FreshDownload = await clickAndReadDownload(
  'document.querySelector("[data-debug-export-gate]").click(); true',
  "gate-2.json",
);
const freshCard92 = gate2FreshDownload.payload.diagnostics.cards.find((card) => card.unitId === "card-92");
if (freshCard92.displayedStatus !== "problem" || freshCard92.selectedSource?.key !== "M") {
  throw new Error(`Gate 2 diagnostics were cached or manual priority changed: ${JSON.stringify(freshCard92)}`);
}

await evaluate('guruNavigateToGate("gate-8"); true');
await wait(180);
const gate8Download = await clickAndReadDownload(
  'document.querySelector("[data-debug-export-gate]").click(); true',
  "gate-8.json",
);
if (gate8Download.payload.exportedGateId !== "gate-8" || gate8Download.payload.diagnostics.runtimeModel.units.length !== 5) {
  throw new Error("Gate 8 export does not contain its 5 compact workbench blocks");
}
const gate8Units = gate8Download.payload.diagnostics.runtimeModel.units;
if (JSON.stringify(gate8Units.map((unit) => unit.unitId)) !== JSON.stringify(["gate8-workbench-expect", "gate8-workbench-action", "gate8-workbench-scenario", "gate8-workbench-data", "gate8-workbench-history"]) ||
    gate8Units.some((unit) => unit.details.navigationReadinessStatus === undefined) ||
    gate8Download.payload.diagnostics.runtimeModel.legacySectionMap.length !== 20) {
  throw new Error("Gate 8 diagnostic order or displayed/readiness status split is wrong");
}

await wait(700);
await evaluate(`(() => {
  state._gate4Migrated = false;
  state.demandV130 = state.demandV130 || {};
  state.demandV130.search = state.demandV130.search || {};
  state.demandV130.search.steps = state.demandV130.search.steps || {};
  state.demandV130.search.steps.groups = state.demandV130.search.steps.groups || { semanticCore: "read-only migration fixture" };
  const selectedProduct = g4ProductPickSelected(state);
  const selectedProductKey = g4ProductPickKey(selectedProduct, state);
  const canonicalSearchBuildKey = normalizeAspectKey(selectedProductKey || "no_product");
  state.gate4SearchBuild = state.gate4SearchBuild || {};
  state.gate4SearchBuild[canonicalSearchBuildKey + "_�"] = { minusPhrases: "deferred migration fixture" };
  window.__exportSmokePersistence = { saveState: 0, flashSaving: 0, cloud: 0, projectCloud: 0 };
  return true;
})()`);
const projectStateBefore = await evaluate(liveSnapshotExpression);
const projectDownload = await clickAndReadDownload(
  'document.querySelector("[data-export-project-content]").click(); true',
  "guru-project-export-diagnostics-smoke-all.json",
);
await wait(700);
const projectStateAfter = await evaluate(liveSnapshotExpression);
if (projectStateAfter !== projectStateBefore) {
  throw new Error("Whole-project export mutated live workspace state");
}
const persistenceCalls = await evaluate("window.__exportSmokePersistence");
if (Object.values(persistenceCalls).some(Boolean)) {
  throw new Error(`Export triggered persistence: ${JSON.stringify(persistenceCalls)}`);
}
const projectPayload = projectDownload.payload;
const expectedGateIds = Array.from({ length: 9 }, (_, index) => `gate-${index}`);
if (JSON.stringify(projectPayload.gates.map((gate) => gate.exportedGateId)) !== JSON.stringify(expectedGateIds) ||
    JSON.stringify(Object.keys(projectPayload.diagnostics.gates)) !== JSON.stringify(expectedGateIds) ||
    projectPayload.gates.some((gate) => gate.format !== "guru-gate-content-v1" || !gate.gate || !gate.structure || !gate.content)) {
  throw new Error("Whole-project export does not contain all nine Gates");
}
if (projectPayload.globalStores.gate0ScopedValuesV194[0]?.value !== "scope-ok" ||
    projectPayload.globalStores.productRegistryV185[0]?.id !== "export-category" ||
    projectPayload.globalStores.productBindingsV185["export-category"]?.sentinel !== "bindings-ok" ||
    projectPayload.globalStores.sharedEvidence.export_sentinel !== "shared-ok") {
  throw new Error("Whole-project export lost a global store sentinel");
}
const exportedLogPaths = new Set(projectPayload.globalStores.migrationLogs.map((entry) => entry.path));
for (const path of [
  "state.project._gate0ProductIdMigrationLog", "state.project._gate0SectionsMigrationLog",
  "state.project._gate1SectionsMigrationLog", "state.project._gate1ProductIdLinkLog",
  "state.gate5.migrationLog", "state.gate8Forecast.migrationLog",
]) {
  if (!exportedLogPaths.has(path)) throw new Error(`Missing migration/log path: ${path}`);
}
const exportedLogIds = new Set(projectPayload.globalStores.migrationLogs.flatMap((entry) =>
  Array.isArray(entry.value) ? entry.value.map((item) => item?.id).filter(Boolean) : [],
));
for (const id of ["log-g0-product", "log-g0-sections", "log-g1-sections", "log-g1-links", "log-g5", "log-g8"]) {
  if (!exportedLogIds.has(id)) throw new Error(`Missing migration/log sentinel: ${id}`);
}
const gate4Runtime = projectPayload.diagnostics.gates["gate-4"].runtimeModel;
const readyCampaign = gate4Runtime.units.find((unit) => unit.unitId === setup.campaignKey);
if (!readyCampaign || readyCampaign.displayedStatus !== "ready" || !readyCampaign.sourceChain[0].path.includes("gate4Production.campaigns")) {
  throw new Error(`Current Gate 4 campaign diagnostics missing: ${JSON.stringify(readyCampaign)}`);
}

const codeFileCache = new Map();
for (const references of Object.values(projectPayload.diagnostics.codeReferences)) {
  for (const reference of references) {
    if (!codeFileCache.has(reference.file)) {
      codeFileCache.set(reference.file, (await readFile(reference.file, "utf8")).split(/\r?\n/));
    }
    const sourceLine = codeFileCache.get(reference.file)[reference.line - 1] || "";
    if (!sourceLine.includes(reference.symbol)) {
      throw new Error(`Stale code reference ${reference.file}:${reference.line} (${reference.symbol})`);
    }
  }
}

console.log(JSON.stringify({
  buttonChecks,
  gate2: {
    bytes: gate2Download.bytes,
    cards: diagnosticCards.length,
    headers: diagnosticCards.filter((card) => !card.includedInUi).length,
    runtimeMatches: diagnosticCards.filter((card) => card.includedInUi).length,
    noCacheSecondStatus: freshCard92.displayedStatus,
    strictSourceChains: diagnosticCards.filter((card) => card.includedInUi).length,
  },
  gate8: { bytes: gate8Download.bytes, syntheticBlocks: gate8Download.payload.diagnostics.runtimeModel.units.length },
  project: {
    bytes: projectDownload.bytes,
    gates: projectPayload.gates.length,
    globalStores: Object.keys(projectPayload.globalStores),
    migrationLogPaths: [...exportedLogPaths],
    gate4CampaignStatus: readyCampaign.displayedStatus,
    persistenceCalls,
  },
  downloads: { path: downloadPath },
}, null, 2));

page.close();
browser.close();
