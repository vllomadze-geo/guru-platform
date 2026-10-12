import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourceExportPath = process.env.GURU_GATE4_SOURCE_EXPORT ||
  "/Users/vl/Downloads/gate-4.json";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9333";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const smokeProjectId = "gate4-rsya-product-id-smoke";
const goatCatalogItemId = "catalog-item-1786792591872-51f503";
const goatProductId = "product-1786401011698-9e81ee";
const goatCategory = "Символ 2027 года «Коза»";
const screenshotPath = resolve(
  "artifacts/gate4-rsya-goat-product-id-v449.png",
);
const auditPath = resolve(
  "artifacts/gate4-rsya-product-id-v449-audit.json",
);
const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));

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

function withoutProductId(group) {
  const clone = structuredClone(group || {});
  delete clone.product_id;
  return clone;
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.listeners = new Map();
    this.ready = new Promise((resolveReady, reject) => {
      this.socket.addEventListener("open", resolveReady, { once: true });
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
      for (const listener of this.listeners.get(message.method) || [])
        listener(message.params || {});
    });
  }

  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolveCall, reject) => {
      const id = ++this.sequence;
      this.pending.set(id, { resolve: resolveCall, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

const sourceExport = JSON.parse(await readFile(sourceExportPath, "utf8"));
assert(sourceExport.exportedGateId === "gate-4", "Expected a Gate 4 export");
const fixture = sourceExport.content;
const sourceBranchKey = Object.keys(fixture.gate4Rsya || {}).find(
  (key) => key === "catalog_item_1786792591872_51f503",
);
assert(sourceBranchKey, "Goat gate4Rsya branch missing in source export");
const sourceGroup = fixture.gate4Rsya[sourceBranchKey]?.groups?.[0];
assert(sourceGroup?.category === goatCategory, "Goat category preimage changed");
assert(!String(sourceGroup.product_id || "").trim(), "Source group already has product_id");
const sourceCatalogItem = (fixture.project?.catalogItemsV189 || []).find(
  (item) => item.id === goatCatalogItemId,
);
assert(sourceCatalogItem?.categoryId === goatProductId, "Catalog mapping changed");
assert(
  (fixture.project?.productRegistryV185 || []).some(
    (product) => product.id === goatProductId,
  ),
  "Expected productRegistryV185 record missing",
);
assert(
  Object.hasOwn(fixture.project?.productBindingsV185 || {}, goatProductId),
  "Expected productBindingsV185 record missing",
);
console.log("[gate4-rsya-smoke] source verified");

const browserVersion = await (
  await fetch(`http://127.0.0.1:${debugPort}/json/version`)
).json();
const browser = new CdpClient(browserVersion.webSocketDebuggerUrl);
await browser.ready;
console.log("[gate4-rsya-smoke] browser connected");
const { targetId } = await browser.call("Target.createTarget", {
  url: "about:blank",
});
const targets = await (
  await fetch(`http://127.0.0.1:${debugPort}/json`)
).json();
const pageTarget = targets.find((target) => target.id === targetId);
assert(pageTarget?.webSocketDebuggerUrl, "Could not create Chrome target");
const page = new CdpClient(pageTarget.webSocketDebuggerUrl);
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

async function evaluate(expression) {
  const response = await page.call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails) {
    throw new Error(
      response.exceptionDetails.exception?.description ||
        response.exceptionDetails.text,
    );
  }
  return response.result.value;
}

async function waitFor(expression, timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

try {
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete"');
  await waitFor('typeof bootstrapAppOnce === "function"');
  await evaluate(`(() => {
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: ${JSON.stringify(smokeProjectId)},
      name: "Gate 4 RSYA product_id smoke",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));
    location.reload();
    return true;
  })()`);
  await waitFor('document.readyState === "complete"');
  await waitFor(`document.querySelector('[data-open-project="${smokeProjectId}"]')`);
  await evaluate(
    `document.querySelector('[data-open-project="${smokeProjectId}"]').click(); true`,
  );
  await waitFor(`activeProjectId === ${JSON.stringify(smokeProjectId)} && Boolean(state)`);
  console.log("[gate4-rsya-smoke] isolated project opened");

  await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const fixture = ${JSON.stringify(fixture)};
    state.project = {
      ...state.project,
      ...structuredClone(fixture.project),
      id: ${JSON.stringify(smokeProjectId)}
    };
    state.sharedEvidence = structuredClone(fixture.sharedEvidence || {});
    state.gate4 = structuredClone(fixture.gate4 || {});
    state.gate4Production = structuredClone(fixture.gate4Production || {});
    state.gate4SearchBuild = structuredClone(fixture.gate4SearchBuild || {});
    state.gate4Rsya = structuredClone(fixture.gate4Rsya || {});
    state.demandV130 = structuredClone(fixture.demandV130 || {});
    delete state.project._gate4RsyaProductIdMigrationLog;
    state.updatedAt = new Date(Date.now() + 60_000).toISOString();
    localStorage.setItem(
      WORKSPACE_STORAGE_PREFIX + ${JSON.stringify(smokeProjectId)},
      JSON.stringify(state)
    );
    location.reload();
    return true;
  })()`);
  await waitFor('document.readyState === "complete"');
  await waitFor(`document.querySelector('[data-open-project="${smokeProjectId}"]')`);
  await evaluate(
    `document.querySelector('[data-open-project="${smokeProjectId}"]').click(); true`,
  );
  await waitFor(`activeProjectId === ${JSON.stringify(smokeProjectId)} && Boolean(state)`);
  console.log("[gate4-rsya-smoke] fixture reloaded and migrated");

  const migrated = await evaluate(`(() => {
    const branchKey = normalizeAspectKey(${JSON.stringify(goatCatalogItemId)});
    const branch = state.gate4Rsya?.[branchKey];
    const group = branch?.groups?.[0];
    const logs = state.project._gate4RsyaProductIdMigrationLog || [];
    const entry = logs.find((item) => item.id === GATE4_RSYA_GROUP_PRODUCT_ID_V449);
    const beforeStore = JSON.stringify(state.gate4Rsya);
    const beforeRuns = entry?.runs?.length || 0;
    const rerun = g4RsyaMigrateGroupProductIdsV449(state);
    const afterStore = JSON.stringify(state.gate4Rsya);
    const afterRuns = entry?.runs?.length || 0;

    const manual = ensureGate4Rsya(${JSON.stringify(goatCatalogItemId)});
    manual.groups.push({ category: "Новая ручная группа", ads: [{ title: "", text: "", cta: "" }] });
    ensureGate4Rsya(${JSON.stringify(goatCatalogItemId)});
    const newGroup = manual.groups.at(-1);
    manual.groups.pop();
    const starter = g4RsyaStarterGroups(${JSON.stringify(goatCatalogItemId)});

    const originalRenderGate = renderGate;
    const originalFlashSaving = flashSaving;
    renderGate = () => {};
    flashSaving = () => {};
    const activeAddButton = document.createElement("button");
    activeAddButton.dataset.g4rsyaV289AddGroup = "";
    activeAddButton.dataset.g4rsyaV289Product = ${JSON.stringify(goatCatalogItemId)};
    document.body.appendChild(activeAddButton);
    const activeBefore = manual.groups.length;
    activeAddButton.click();
    const activeNewGroup = structuredClone(manual.groups.at(-1));
    manual.groups.splice(activeBefore);
    activeAddButton.remove();
    renderGate = originalRenderGate;
    flashSaving = originalFlashSaving;

    const savedGroups = manual.groups;
    manual.groups = [];
    g4RsyaChannelCardV289({
      key: "rsya-product-id-smoke",
      launchType: "media",
      channel: "Яндекс Директ",
      platform: "РСЯ",
      type: "Сети",
      status: "active",
      materials: "баннеры"
    }, {}, 0, ${JSON.stringify(goatCatalogItemId)});
    const activeDefaultGroup = structuredClone(manual.groups[0]);
    manual.groups = savedGroups;

    const conflictWorkspace = {
      project: structuredClone(state.project),
      gate4Rsya: {
        [branchKey]: { groups: [{ category: "Не менять", product_id: "existing-product-id" }] }
      }
    };
    const conflictResult = g4RsyaMigrateGroupProductIdsV449(conflictWorkspace);

    const unrelatedResults = ["iCleaning", "SIVRCE", "360profit"].map((name) => {
      const workspace = { project: { name }, gate4Rsya: {} };
      const before = JSON.stringify(workspace);
      const result = g4RsyaMigrateGroupProductIdsV449(workspace);
      return { name, changed: result.changed, unchanged: before === JSON.stringify(workspace) };
    });

    console.info("[GURU gate4Rsya store]", JSON.stringify({
      category: group?.category || "",
      product_id: group?.product_id || ""
    }));
    return {
      branchKey,
      group,
      log: entry,
      rerun,
      idempotent: beforeStore === afterStore && beforeRuns === afterRuns,
      newGroup,
      starter,
      activeNewGroup,
      activeDefaultGroup,
      conflict: {
        result: conflictResult,
        group: conflictWorkspace.gate4Rsya[branchKey].groups[0]
      },
      unrelatedResults,
    };
  })()`);

  assert(migrated.group?.category === goatCategory, "Visible category changed");
  assert(migrated.group?.product_id === goatProductId, "Goat product_id mismatch");
  assert(
    stableJson(withoutProductId(migrated.group)) ===
      stableJson(withoutProductId(sourceGroup)),
    "Migration changed fields other than product_id",
  );
  assert(migrated.idempotent, "Migration rerun changed gate4Rsya or its log");
  assert(migrated.rerun.changed === false, "Migration is not idempotent");
  const run = migrated.log?.runs?.[0];
  assert(run?.before?.groups === 1 && run.before.linked === 0, "Log before snapshot mismatch");
  assert(run?.after?.groups === 1 && run.after.linked === 1, "Log after snapshot mismatch");
  assert(run?.linked?.[0]?.product_id === goatProductId, "Log product_id mismatch");
  assert(run?.linked?.[0]?.category === goatCategory, "Log category mismatch");
  assert(migrated.newGroup?.product_id === goatProductId, "New manual group lacks product_id");
  assert(
    migrated.activeNewGroup?.product_id === goatProductId,
    "New active V289 group lacks product_id",
  );
  assert(
    migrated.activeDefaultGroup?.product_id === goatProductId,
    "Default active V289 group lacks product_id",
  );
  assert(
    migrated.starter.length === 3 &&
      migrated.starter.every((group) => group.product_id === goatProductId),
    "Starter groups lack product_id",
  );
  assert(
    migrated.starter.every((group) => group.category === goatCategory),
    "Starter group category changed",
  );
  assert(
    migrated.conflict.group.product_id === "existing-product-id" &&
      migrated.conflict.result.conflicts.length === 1,
    "Existing non-empty product_id was overwritten or not reported",
  );
  assert(
    migrated.unrelatedResults.every((item) => !item.changed && item.unchanged),
    "An unrelated project fixture changed",
  );
  console.log("[gate4-rsya-smoke] store assertions passed");

  await evaluate('guruNavigateToGate("gate-4"); true');
  await waitFor('activeGateId === "gate-4"');
  console.log("[gate4-rsya-smoke] Gate 4 opened");
  await wait(1000);
  const visualMode = await evaluate(`(() => {
    const findField = () => Array.from(
      document.querySelectorAll('[data-g4rsya-field="category"]')
    ).find((element) => element.value === ${JSON.stringify(goatCategory)});
    if (findField()) return "gate4-screen";
    const host = document.createElement("section");
    host.dataset.g4RsyaSmokeSurface = "1";
    host.innerHTML = g4RsyaBuildHtml(${JSON.stringify(goatCatalogItemId)});
    (els.contentArea || document.body).prepend(host);
    return findField() ? "live-production-renderer" : "missing";
  })()`);
  assert(visualMode !== "missing", "Could not render Goat RSYA group");
  const productIdVisibleInUi = await evaluate(
    `document.body.innerText.includes(${JSON.stringify(goatProductId)}) || Boolean(document.querySelector('[data-g4rsya-field="product_id"]'))`,
  );
  assert(!productIdVisibleInUi, "Hidden product_id leaked into visible UI");
  const clip = await evaluate(`(() => {
    const field = Array.from(document.querySelectorAll('[data-g4rsya-field="category"]'))
      .find((element) => element.value === ${JSON.stringify(goatCategory)});
    const card = field?.closest('.g1-card');
    if (!card) return null;
    for (let details = card.closest('details'); details; details = details.parentElement?.closest?.('details'))
      details.open = true;
    card.scrollIntoView({ block: "start", inline: "nearest" });
    const rect = card.getBoundingClientRect();
    return {
      x: Math.max(0, rect.left + window.scrollX),
      y: Math.max(0, rect.top + window.scrollY),
      width: Math.max(1, Math.min(rect.width, window.innerWidth)),
      height: Math.max(1, Math.min(rect.height, window.innerHeight * 1.8)),
      scale: 1
    };
  })()`);
  assert(clip, "Could not locate rendered Goat RSYA group");
  await wait(250);
  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
    clip,
  });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));

  const report = {
    auditedAt: new Date().toISOString(),
    source: {
      path: sourceExportPath,
      exportedAt: sourceExport.exportedAt,
      branchKey: sourceBranchKey,
      category: sourceGroup.category,
      product_id: sourceGroup.product_id || "",
    },
    migrated: {
      branchKey: migrated.branchKey,
      category: migrated.group.category,
      product_id: migrated.group.product_id,
      logStatus: migrated.log.status,
      idempotent: migrated.idempotent,
      visualMode,
      productIdVisibleInUi,
    },
    creation: {
      manualProductId: migrated.newGroup.product_id,
      activeProductId: migrated.activeNewGroup.product_id,
      activeDefaultProductId: migrated.activeDefaultGroup.product_id,
      starterProductIds: migrated.starter.map((group) => group.product_id),
    },
    sharedProjectsGuard: migrated.unrelatedResults,
    migrationLog: {
      id: migrated.log.id,
      status: migrated.log.status,
      run: migrated.log.runs[0],
    },
    screenshot: screenshotPath,
  };
  await writeFile(auditPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ ...report, audit: auditPath }, null, 2));
} catch (error) {
  console.log(`[gate4-rsya-smoke] failure\n${error?.stack || error}`);
  process.exitCode = 1;
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  browser.close();
}
