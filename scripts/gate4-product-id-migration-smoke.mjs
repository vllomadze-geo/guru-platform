import { createHash } from "node:crypto";
import { mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const sourceExportPath = process.env.GURU_GATE4_SOURCE_EXPORT || "/Users/vl/Downloads/gate-4.json";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9337";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const smokeProjectId = "gate4-product-id-migration-smoke";
const shirtId = "catalog-item-1786792591872-c8b1e9";
const goatId = "catalog-item-1786792591872-51f503";
const paintingCategoryId = "product-1786401011698-981bb3";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

function hash(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function normalizeAspectKey(label = "") {
  return (
    String(label || "")
      .trim()
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[«»"'`]/g, "")
      .replace(/[^a-zа-я0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "") || "aspect"
  );
}

function deepHasValue(value, ignoredKeys = new Set()) {
  if (Array.isArray(value)) return value.some((item) => deepHasValue(item, ignoredKeys));
  if (value && typeof value === "object") {
    return Object.entries(value).some(
      ([key, item]) => !ignoredKeys.has(key) && deepHasValue(item, ignoredKeys),
    );
  }
  if (typeof value === "boolean") return false;
  if (typeof value === "number") return true;
  return value !== null && value !== undefined && String(value).trim() !== "";
}

function isBlank(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return !value.trim();
  if (Array.isArray(value) || (value && typeof value === "object")) return !deepHasValue(value);
  return false;
}

function clone(value) {
  return structuredClone(value);
}

function mergePreferred(target, source) {
  for (const [key, sourceValue] of Object.entries(source || {})) {
    if (key === "product") continue;
    const targetValue = target[key];
    if (isBlank(targetValue)) {
      target[key] = clone(sourceValue);
    } else if (
      targetValue && sourceValue &&
      typeof targetValue === "object" && typeof sourceValue === "object" &&
      !Array.isArray(targetValue) && !Array.isArray(sourceValue)
    ) {
      mergePreferred(targetValue, sourceValue);
    }
  }
  return target;
}

function campaignGroups(campaigns) {
  const groups = new Map();
  for (const [key, campaign] of Object.entries(campaigns || {})) {
    const group = String(campaign?.product || "");
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push({ key, campaign });
  }
  return groups;
}

function campaignSuffix(key, label) {
  const prefix = normalizeAspectKey(label);
  return key.startsWith(prefix + "_") ? key.slice(prefix.length + 1) : "";
}

function stateKey(productId, suffix) {
  return normalizeAspectKey(`${productId}__${suffix}`);
}

function expectedGroupAfterMigration(sourceGroups, sourceLabel, productId) {
  const result = {};
  for (const { key, campaign } of sourceGroups.get(sourceLabel) || []) {
    const suffix = campaignSuffix(key, sourceLabel);
    assert(suffix, `Cannot derive campaign suffix for ${sourceLabel}: ${key}`);
    const targetKey = stateKey(productId, suffix);
    const incoming = clone(campaign);
    incoming.product = productId;
    if (!result[targetKey]) result[targetKey] = incoming;
    else mergePreferred(result[targetKey], incoming);
  }
  return result;
}

function mergeExpectedGroups(primary, inherited) {
  const result = clone(primary);
  for (const [key, campaign] of Object.entries(inherited)) {
    if (!result[key]) result[key] = clone(campaign);
    else mergePreferred(result[key], campaign);
    result[key].product = campaign.product;
  }
  return result;
}

function assertExactObject(actual, expected, label) {
  assert(
    stableJson(actual) === stableJson(expected),
    `${label} changed. expected sha256=${hash(expected)}, actual sha256=${hash(actual)}`,
  );
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
      for (const listener of this.listeners.get(message.method) || []) {
        listener(message.params || {});
      }
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
    return () => this.listeners.set(
      method,
      (this.listeners.get(method) || []).filter((item) => item !== listener),
    );
  }

  close() {
    this.socket.close();
  }
}

const sourceExport = JSON.parse(await readFile(sourceExportPath, "utf8"));
assert(sourceExport.exportedGateId === "gate-4", `Not a Gate 4 export: ${sourceExportPath}`);
const source = sourceExport.content;
const sourceCampaigns = source?.gate4Production?.campaigns || {};
const sourceGroups = campaignGroups(sourceCampaigns);
const catalogItems = source?.project?.catalogItemsV189 || [];
const categories = source?.project?.productRegistryV185 || [];
const catalogByName = new Map(catalogItems.map((item) => [item.name, item]));
const categoryByName = new Map(categories.map((item) => [item.name, item]));

const mapping = [
  ["12", "", "delete_empty_trash"],
  ["Авторская одежда", shirtId, "merge_category_to_product"],
  ["Живопись и графика", "", "drop_empty_category_without_catalog_item"],
  ["Дизайнерские подарки", goatId, "move_category_to_single_product"],
  ["Дом и сервировка", "", "drop_empty_category_without_catalog_item"],
  ["Украшение дома", "", "drop_empty_category_without_catalog_item"],
  ["На заказ", "", "drop_empty_category_without_catalog_item"],
  ...catalogItems
    .filter((item) => item.id !== goatId)
    .map((item) => [item.name, item.id, "rekey_product_name"]),
].map(([group, targetProductId, action]) => ({
  group,
  targetProductId,
  categoryId: categoryByName.get(group)?.id || catalogByName.get(group)?.categoryId || "",
  action,
}));

assert(Object.keys(sourceCampaigns).length === 447, `Expected 447 source campaigns, got ${Object.keys(sourceCampaigns).length}`);
assert(sourceGroups.size === 14, `Expected 14 source groups, got ${sourceGroups.size}`);
assert(
  stableJson([...sourceGroups.keys()].sort()) === stableJson(mapping.map((item) => item.group).sort()),
  `The 14-group preimage changed: ${JSON.stringify([...sourceGroups.keys()])}`,
);
assert(catalogItems.length === 8, `Expected 8 catalog products, got ${catalogItems.length}`);
assert(catalogByName.get("Рубашка Upcycling с кружевом")?.id === shirtId, "Shirt product_id mismatch");
assert(catalogByName.get("Символ 2027 года «Коза»")?.id === goatId, "Goat product_id mismatch");
assert(categoryByName.get("Живопись и графика")?.id === paintingCategoryId, "Painting category_id mismatch");

const trashRows = sourceGroups.get("12") || [];
assert(trashRows.length === 30, `Expected 30 trash campaigns, got ${trashRows.length}`);
assert(
  trashRows.every(({ campaign }) => !deepHasValue(campaign, new Set(["product"]))),
  "Safety stop: group 12 contains user data",
);

const authorRows = sourceGroups.get("Авторская одежда") || [];
const authorDataRows = authorRows.filter(({ campaign }) => deepHasValue(campaign, new Set(["product"])));
assert(authorRows.length === 32 && authorDataRows.length === 1, "Author category preimage is not 32 rows / one populated row");
assert(authorDataRows[0].campaign.channelTargeting?.geography === "лорпзх", "Author geography preimage changed");
const giftRows = sourceGroups.get("Дизайнерские подарки") || [];
const giftDataRows = giftRows.filter(({ campaign }) => deepHasValue(campaign, new Set(["product"])));
assert(giftRows.length === 32 && giftDataRows.length === 1, "Gifts category preimage is not 32 rows / one populated row");
assert(
  giftDataRows[0].campaign.decision === "prepare" && giftDataRows[0].campaign.launchStatus === "draft",
  "Gifts decision/launchStatus preimage changed",
);
for (const name of ["Живопись и графика", "Дом и сервировка", "Украшение дома", "На заказ"]) {
  const rows = sourceGroups.get(name) || [];
  assert(rows.length === (name === "Живопись и графика" ? 33 : 32), `${name}: unexpected row count`);
  assert(rows.every(({ campaign }) => !deepHasValue(campaign, new Set(["product"]))), `${name}: category scaffold is no longer empty`);
}

const authorBuild = source.gate4SearchBuild?.[normalizeAspectKey("Авторская одежда")];
const giftBuild = source.gate4SearchBuild?.[normalizeAspectKey("Дизайнерские подарки")];
const giftRsya = source.gate4Rsya?.[normalizeAspectKey("Дизайнерские подарки")];
assert(authorBuild?.clusters?.length === 1, "Author SearchBuild cluster missing");
assert(authorBuild.clusters[0].name === "Рубашка Upcycling с кружевом", "Author SearchBuild owner evidence changed");
assert(authorBuild.clusters[0].demandRows?.length === 27, "Expected 27 source demand rows");
assert(authorBuild.clusters[0].phraseSelection?.length === 27, "Expected 27 selected source phrases");
assert(new Set(authorBuild.clusters[0].phraseSelection).size === 26, "Expected 26 unique selected source phrases");
assert(giftBuild && giftRsya, "Gifts SearchBuild/RSYA source branches missing");

const expectedShirt = mergeExpectedGroups(
  expectedGroupAfterMigration(sourceGroups, "Рубашка Upcycling с кружевом", shirtId),
  expectedGroupAfterMigration(sourceGroups, "Авторская одежда", shirtId),
);
const expectedGoat = expectedGroupAfterMigration(sourceGroups, "Дизайнерские подарки", goatId);
const expectedDirectGroups = new Map(
  catalogItems
    .filter((item) => item.id !== goatId && item.id !== shirtId)
    .map((item) => [item.id, expectedGroupAfterMigration(sourceGroups, item.name, item.id)]),
);

let browser;
let page;
let targetId = "";
let downloadPath = "";

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

async function waitFor(expression, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function clickAndReadDownload(clickExpression, expectedFilename) {
  let guid = "";
  let suggestedFilename = "";
  let resolveDone;
  let rejectDone;
  const done = new Promise((resolve, reject) => {
    resolveDone = resolve;
    rejectDone = reject;
  });
  const timeout = setTimeout(
    () => rejectDone(new Error(`Download timed out: ${expectedFilename}`)),
    15000,
  );
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
    return {
      filename: suggestedFilename,
      path,
      bytes: (await stat(path)).size,
      payload: JSON.parse(text),
    };
  } finally {
    clearTimeout(timeout);
    offBegin();
    offProgress();
  }
}

try {
  const browserVersion = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
  browser = new CdpClient(browserVersion.webSocketDebuggerUrl);
  await browser.ready;
  ({ targetId } = await browser.call("Target.createTarget", { url: "about:blank" }));
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
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
  downloadPath = await mkdtemp(join(tmpdir(), "guru-g4-product-id-downloads-"));
  await browser.call("Browser.setDownloadBehavior", {
    behavior: "allowAndName",
    downloadPath,
    eventsEnabled: true,
  });

  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete"');
  await waitFor('typeof bootstrapAppOnce === "function"');
  await evaluate(`(() => {
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: ${JSON.stringify(smokeProjectId)},
      name: "Gate 4 product_id migration smoke",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));
    location.reload();
    return true;
  })()`);
  await waitFor('document.readyState === "complete"');
  await waitFor(`document.querySelector('[data-open-project="${smokeProjectId}"]')`);
  await evaluate(`document.querySelector('[data-open-project="${smokeProjectId}"]').click(); true`);
  await waitFor(`activeProjectId === ${JSON.stringify(smokeProjectId)} && Boolean(state)`);

  const serializedFixture = JSON.stringify(source);
  const importResult = await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const fixture = ${serializedFixture};
    state.project = { ...state.project, ...structuredClone(fixture.project), id: ${JSON.stringify(smokeProjectId)} };
    state.sharedEvidence = structuredClone(fixture.sharedEvidence || {});
    state.gate4Production = structuredClone(fixture.gate4Production || {});
    state.gate4SearchBuild = structuredClone(fixture.gate4SearchBuild || {});
    state.gate4Rsya = structuredClone(fixture.gate4Rsya || {});
    state.demandV130 = structuredClone(fixture.demandV130 || {});
    delete state.project._gate4ProductIdMigrationLog;
    state.project.gate0ScopeUiV194 = state.project.gate0ScopeUiV194 || {};
    state.project.gate0ScopeUiV194.selectedCategoryId = "product-1786401011698-231009";
    state.project.gate0ScopeUiV194.selectedProductId = ${JSON.stringify(shirtId)};
    state.updatedAt = new Date(Date.now() + 60_000).toISOString();
    localStorage.setItem(WORKSPACE_STORAGE_PREFIX + ${JSON.stringify(smokeProjectId)}, JSON.stringify(state));
    return {
      campaigns: Object.keys(state.gate4Production.campaigns || {}).length,
      groups: new Set(Object.values(state.gate4Production.campaigns || {}).map((row) => row.product)).size,
    };
  })()`);
  assert(importResult.campaigns === 447 && importResult.groups === 14, `Raw fixture import changed: ${JSON.stringify(importResult)}`);

  await evaluate("location.reload(); true");
  await waitFor('document.readyState === "complete"');
  await waitFor(`document.querySelector('[data-open-project="${smokeProjectId}"]')`);
  await evaluate(`document.querySelector('[data-open-project="${smokeProjectId}"]').click(); true`);
  await waitFor(`activeProjectId === ${JSON.stringify(smokeProjectId)} && Boolean(state)`);
  await wait(800);

  const migrated = await evaluate(`(() => {
    const firstEnsure = g4EnsureLaunchCampaigns();
    const beforeIdempotence = JSON.stringify({
      production: state.gate4Production,
      searchBuild: state.gate4SearchBuild,
      rsya: state.gate4Rsya,
    });
    const firstRerun = g4ProductIdMigrateWorkspaceV224(state);
    g4EnsureLaunchCampaigns();
    const secondRerun = g4ProductIdMigrateWorkspaceV224(state);
    const afterIdempotence = JSON.stringify({
      production: state.gate4Production,
      searchBuild: state.gate4SearchBuild,
      rsya: state.gate4Rsya,
    });
    const log = (state.project._gate4ProductIdMigrationLog || [])
      .find((entry) => entry.id === GATE4_PRODUCT_ID_STORAGE_V224);
    return {
      campaigns: state.gate4Production.campaigns,
      searchBuild: state.gate4SearchBuild,
      rsya: state.gate4Rsya,
      launchOpen: state.gate4Production.launchOpen,
      catalogItems: state.project.catalogItemsV189,
      registry: state.project.productRegistryV185,
      log,
      firstRerun,
      secondRerun,
      idempotent: beforeIdempotence === afterIdempotence,
      pickKeys: guruV194Products(state).map((item) => ({ id: item.id, key: g4ProductPickKey(item, state) })),
      launchProducts: g4LaunchProducts(),
      ensuredCampaignCount: Object.keys(firstEnsure).length,
    };
  })()`);

  const migratedGroups = campaignGroups(migrated.campaigns);
  const expectedIds = new Set(catalogItems.map((item) => item.id));
  assert(Object.keys(migrated.campaigns).length === 256, `Expected 256 campaigns after migration, got ${Object.keys(migrated.campaigns).length}`);
  assert(migratedGroups.size === 8, `Expected 8 product_id groups, got ${migratedGroups.size}`);
  assert(
    [...migratedGroups.keys()].every((key) => expectedIds.has(key)),
    `Non-product campaign key remains: ${JSON.stringify([...migratedGroups.keys()].filter((key) => !expectedIds.has(key)))}`,
  );
  assert(!migratedGroups.has("12"), "Trash group 12 remains");
  assert(mapping.filter((item) => item.categoryId).every((item) => !migratedGroups.has(item.group)), "Category/name group remains");
  assert(migrated.pickKeys.every((item) => item.key === item.id), `g4ProductPickKey is not always product_id: ${JSON.stringify(migrated.pickKeys)}`);
  assert(
    stableJson([...migrated.launchProducts].sort()) === stableJson([...expectedIds].sort()),
    `g4LaunchProducts is not the 8 product_id list: ${JSON.stringify(migrated.launchProducts)}`,
  );

  const actualShirt = Object.fromEntries(migratedGroups.get(shirtId).map(({ key, campaign }) => [key, campaign]));
  const actualGoat = Object.fromEntries(migratedGroups.get(goatId).map(({ key, campaign }) => [key, campaign]));
  assertExactObject(actualShirt, expectedShirt, "All Author/Shirt campaign fields");
  assertExactObject(actualGoat, expectedGoat, "All Gifts/Goat campaign fields");
  for (const [productId, expected] of expectedDirectGroups) {
    const actual = Object.fromEntries(migratedGroups.get(productId).map(({ key, campaign }) => [key, campaign]));
    assertExactObject(actual, expected, `All direct product fields for ${productId}`);
  }
  assert(
    [...migratedGroups.get(shirtId)].filter(({ campaign }) => deepHasValue(campaign, new Set(["product"]))).length === 1,
    "Shirt should preserve exactly one populated campaign",
  );
  assert(
    migratedGroups.get(shirtId).some(({ campaign }) => campaign.channelTargeting?.geography === "лорпзх"),
    "Author geography was not transferred to Shirt",
  );
  assert(
    migratedGroups.get(goatId).some(({ campaign }) => campaign.decision === "prepare" && campaign.launchStatus === "draft"),
    "Gifts prepare/draft state was not transferred to Goat",
  );

  const shirtBuildKey = normalizeAspectKey(shirtId);
  const goatBuildKey = normalizeAspectKey(goatId);
  assertExactObject(migrated.searchBuild[shirtBuildKey], authorBuild, "Author SearchBuild branch");
  assertExactObject(migrated.searchBuild[goatBuildKey], giftBuild, "Gifts SearchBuild branch");
  assertExactObject(migrated.rsya[goatBuildKey], giftRsya, "Gifts RSYA branch");
  for (const oldKey of [normalizeAspectKey("Авторская одежда"), normalizeAspectKey("Дизайнерские подарки")]) {
    assert(!Object.hasOwn(migrated.searchBuild, oldKey), `Legacy SearchBuild key remains: ${oldKey}`);
    assert(!Object.hasOwn(migrated.rsya, oldKey), `Legacy RSYA key remains: ${oldKey}`);
  }

  const launchRows = migrated.launchOpen?.rows || {};
  assert(Object.keys(launchRows).length === 5, `Expected 5 preserved launchOpen rows, got ${Object.keys(launchRows).length}`);
  assert(
    Object.keys(launchRows).every((key) => key.startsWith(normalizeAspectKey(shirtId) + "_") || key.startsWith(normalizeAspectKey(goatId) + "_")),
    `launchOpen row was not rekeyed: ${JSON.stringify(Object.keys(launchRows))}`,
  );
  assert(
    Object.values(launchRows).filter(Boolean).length === 3 && Object.values(launchRows).filter((value) => !value).length === 2,
    "launchOpen boolean values changed",
  );
  assert(migrated.idempotent, "A no-op rerun changed Gate 4 stores");
  assert(migrated.firstRerun.changed === false && migrated.secondRerun.changed === false, "Migration is not idempotent");

  const migrationRun = migrated.log?.runs?.[0];
  assert(migrationRun?.before?.campaigns === 447, "Migration log did not capture 447 source campaigns");
  assert(migrationRun?.after?.campaigns === 256, "Migration log did not capture 256 target campaigns");
  assert(migrationRun?.removedTrash?.campaigns === 30 && migrationRun.removedTrash.verifiedEmpty === true, "Trash deletion is not safely logged");
  assert(
    (migrationRun?.droppedEmptyCategoryScaffolds || []).reduce((sum, item) => sum + item.count, 0) === 129,
    "Expected 129 retired empty category scaffold rows",
  );
  assert(!(migrationRun?.unresolved || []).some((item) => item.hasData), "A populated group remains unresolved");
  assert((migrationRun?.conflicts || []).length === 0, "Unexpected migration conflicts");

  await evaluate('guruNavigateToGate("gate-4"); true');
  await waitFor('activeGateId === "gate-4"');
  await waitFor('document.querySelector("[data-debug-export-gate]")');
  const launchMarkup = await evaluate(`(() => {
    const probe = document.createElement('div');
    probe.innerHTML = g4CampaignLaunchCenterHtml();
    return {
      readiness: Boolean(probe.querySelector('.g4-readiness-v225')),
      selector: Boolean(probe.querySelector('[data-g4-product-pick-select]')),
      duplicateText: probe.textContent.includes('Методика общая; рабочие значения')
    };
  })()`);
  assert(!launchMarkup.readiness && !launchMarkup.duplicateText, "Removed Gate 4 readiness subblock is still rendered");
  assert(launchMarkup.selector, "Gate 4 product selector disappeared with the readiness subblock");
  const exportDownload = await clickAndReadDownload(
    'document.querySelector("[data-debug-export-gate]").click(); true',
    "gate-4.json",
  );
  const exportedUnits = exportDownload.payload?.diagnostics?.runtimeModel?.units || [];
  assert(exportDownload.payload.exportedGateId === "gate-4", "Actual button exported the wrong Gate");
  assert(exportedUnits.length === 256, `Actual Gate 4 diagnostics contain ${exportedUnits.length} units, expected 256`);
  assert(
    exportedUnits.every((unit) => expectedIds.has(unit.details?.product)),
    "Actual Gate 4 export contains a non-product_id campaign",
  );
  assert(
    new Set(exportedUnits.map((unit) => unit.details.product)).size === 8,
    "Actual Gate 4 export does not contain all eight product_id groups",
  );
  assert(
    exportedUnits.some((unit) => unit.details.product === shirtId && unit.title === "Рубашка Upcycling с кружевом"),
    "Gate 4 diagnostics lost the human-readable Shirt title",
  );
  assert(
    exportedUnits.some((unit) => unit.details.product === goatId && unit.title === "Символ 2027 года «Коза»"),
    "Gate 4 diagnostics lost the human-readable Goat title",
  );

  const secondProduct = await evaluate(`(() => {
    const categoryId = ${JSON.stringify(paintingCategoryId)};
    const first = {
      id: "catalog-item-smoke-painting-a",
      name: "Тестовая картина A",
      categoryId,
      continuum: "pure_product",
      createdAt: new Date().toISOString(),
    };
    const second = {
      id: "catalog-item-smoke-painting-b",
      name: "Тестовая картина B",
      categoryId,
      continuum: "pure_product",
      createdAt: new Date().toISOString(),
    };
    state.project.catalogItemsV189.push(first);
    const firstKeyBefore = g4ProductPickKey(first, state);
    g4EnsureLaunchCampaigns();
    const channel = g4LaunchChannels()[0];
    const firstCampaignKey = g4CampaignStateKey(firstKeyBefore, channel.key);
    Object.assign(state.gate4Production.campaigns[firstCampaignKey], {
      decision: "prepare",
      launchStatus: "draft",
      notes: "second-product-stability-sentinel",
    });
    const firstBuildKey = normalizeAspectKey(firstKeyBefore);
    state.gate4SearchBuild[firstBuildKey] = {
      sentinel: "search-build-stability-sentinel",
      clusters: [{ id: "smoke-cluster", name: first.name, demandRows: [{ kw: "стабильный ключ" }] }],
    };
    state.project.catalogItemsV189.push(second);
    const firstKeyAfter = g4ProductPickKey(first, state);
    const secondKey = g4ProductPickKey(second, state);
    g4EnsureLaunchCampaigns();
    const firstCampaign = state.gate4Production.campaigns[firstCampaignKey];
    const secondCampaignKey = g4CampaignStateKey(secondKey, channel.key);
    const categoryPrefix = normalizeAspectKey("Живопись и графика") + "_";
    return {
      firstKeyBefore,
      firstKeyAfter,
      secondKey,
      firstCampaignKey,
      secondCampaignKey,
      firstCampaign,
      secondCampaign: state.gate4Production.campaigns[secondCampaignKey],
      firstSearchBuild: state.gate4SearchBuild[firstBuildKey],
      categoryCampaignKeys: Object.keys(state.gate4Production.campaigns).filter((key) => key.startsWith(categoryPrefix)),
      firstCampaignCount: Object.values(state.gate4Production.campaigns).filter((row) => row.product === first.id).length,
      secondCampaignCount: Object.values(state.gate4Production.campaigns).filter((row) => row.product === second.id).length,
      channelCount: g4LaunchChannels().length,
    };
  })()`);
  assert(secondProduct.firstKeyBefore === "catalog-item-smoke-painting-a", "First Painting item did not start with product_id key");
  assert(secondProduct.firstKeyAfter === secondProduct.firstKeyBefore, "Adding a sibling changed the first product key");
  assert(secondProduct.secondKey === "catalog-item-smoke-painting-b", "Second Painting item did not use product_id key");
  assert(secondProduct.firstCampaign?.notes === "second-product-stability-sentinel", "Adding a sibling orphaned the first campaign");
  assert(secondProduct.firstCampaign?.decision === "prepare" && secondProduct.firstCampaign?.launchStatus === "draft", "Adding a sibling changed first campaign status fields");
  assert(secondProduct.firstSearchBuild?.sentinel === "search-build-stability-sentinel", "Adding a sibling orphaned first SearchBuild data");
  assert(secondProduct.secondCampaign?.product === "catalog-item-smoke-painting-b", "Second product campaign row was not created under its product_id");
  assert(secondProduct.categoryCampaignKeys.length === 0, "Adding Painting products recreated a category campaign key");
  assert(
    secondProduct.firstCampaignCount === secondProduct.channelCount && secondProduct.secondCampaignCount === secondProduct.channelCount,
    `New product campaign counts do not match current channels: ${JSON.stringify(secondProduct)}`,
  );

  console.log(JSON.stringify({
    source: {
      path: sourceExportPath,
      exportedAt: sourceExport.exportedAt,
      campaigns: Object.keys(sourceCampaigns).length,
      groups: sourceGroups.size,
      author: {
        campaigns: authorRows.length,
        populatedCampaigns: authorDataRows.length,
        campaignsSha256: hash(Object.fromEntries(authorRows.map(({ key, campaign }) => [key, campaign]))),
        searchBuildSha256: hash(authorBuild),
        demandRows: authorBuild.clusters[0].demandRows.length,
        selectedPhrases: authorBuild.clusters[0].phraseSelection.length,
        uniquePhrases: new Set(authorBuild.clusters[0].phraseSelection).size,
      },
      gifts: {
        campaigns: giftRows.length,
        populatedCampaigns: giftDataRows.length,
        campaignsSha256: hash(Object.fromEntries(giftRows.map(({ key, campaign }) => [key, campaign]))),
        searchBuildSha256: hash(giftBuild),
        rsyaSha256: hash(giftRsya),
      },
      trash: { campaigns: trashRows.length, verifiedEmpty: true },
    },
    mapping,
    migration: {
      campaignsBefore: migrationRun.before.campaigns,
      campaignsAfter: migrationRun.after.campaigns,
      groupsAfter: migratedGroups.size,
      removedTrash: migrationRun.removedTrash,
      droppedEmptyCategoryCampaigns: migrationRun.droppedEmptyCategoryScaffolds.reduce((sum, item) => sum + item.count, 0),
      shirt: { productId: shirtId, campaigns: migratedGroups.get(shirtId).length, geography: "лорпзх", searchBuildSha256: hash(migrated.searchBuild[shirtBuildKey]) },
      goat: { productId: goatId, campaigns: migratedGroups.get(goatId).length, decision: "prepare", launchStatus: "draft" },
      idempotent: migrated.idempotent,
    },
    actualExport: {
      filename: exportDownload.filename,
      bytes: exportDownload.bytes,
      path: exportDownload.path,
      runtimeUnits: exportedUnits.length,
      productGroups: new Set(exportedUnits.map((unit) => unit.details.product)).size,
    },
    secondProductSimulation: secondProduct,
    isolation: { projectId: smokeProjectId, persistedRealWorkspaceTouched: false },
  }, null, 2));
} finally {
  if (browser && targetId) {
    try {
      await browser.call("Target.closeTarget", { targetId });
    } catch (error) {}
  }
  page?.close();
  browser?.close();
}
