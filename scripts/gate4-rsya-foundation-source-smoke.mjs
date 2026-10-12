import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = process.env.GURU_PROJECT_SOURCE_EXPORT ||
  resolve("artifacts/gate-4-recovered-groups-v408.json");
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9345";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3010/";
const goatId = "catalog-item-1786792591872-51f503";
const branchKey = "catalog_item_1786792591872_51f503";
const screenshotPath = resolve("artifacts/gate4-rsya-goat-foundation-v455.png");
const auditPath = resolve("artifacts/gate4-rsya-foundation-v455-audit.json");
const wait = (ms) => new Promise((done) => setTimeout(done, ms));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.events = [];
    this.ready = new Promise((resolveReady, reject) => {
      this.socket.addEventListener("open", resolveReady, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      const pending = this.pending.get(message.id);
      if (!pending) {
        if (message.method) this.events.push(message);
        return;
      }
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
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

const exported = JSON.parse(await readFile(sourcePath, "utf8"));
const source = exported.workspace || exported.content;
assert(source, "Workspace or Gate 4 export content is required");
const sourceGroup = source.gate4Rsya?.[branchKey]?.groups?.[0];
assert(sourceGroup, "Goat RSYA group is missing from source export");
const legacyFields = [
  "jtbd", "offer", "benefit", "usp", "segment", "category", "landing",
  "targetAction",
];
for (const field of legacyFields)
  assert(Object.hasOwn(sourceGroup, field), `Legacy group.${field} is missing`);

const fixture = {
  project: {
    catalogItemsV189: source.project.catalogItemsV189,
    productRegistryV185: source.project.productRegistryV185,
    productBindingsV185: source.project.productBindingsV185,
    gate0ScopedValuesV194: source.project.gate0ScopedValuesV194,
  },
  sharedEvidence: source.sharedEvidence || {},
  branch: source.gate4Rsya[branchKey],
};
const goatProductId = fixture.project.catalogItemsV189.find(
  (item) => item.id === goatId,
)?.categoryId;
assert(goatProductId, "Goat parent product_id is missing");

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
assert(pageTarget?.webSocketDebuggerUrl, "Could not create Chrome target");
const page = new CdpClient(pageTarget.webSocketDebuggerUrl);
await page.ready;
await page.call("Runtime.enable");
await page.call("Page.enable");
await page.call("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1500,
  deviceScaleFactor: 1,
  mobile: false,
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
  await waitFor(
    'document.readyState === "complete" && typeof g4RsyaGroupFoundationV455 === "function" && typeof g4RsyaAssetPromptDataV452 === "function"',
  );
  const audit = await evaluate(`(() => {
    state = createFreshWorkspace({
      id: "rsya-foundation-v455-smoke",
      name: "RSYA foundation source smoke",
    });
    activeProjectId = "rsya-foundation-v455-smoke";
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const fixture = ${JSON.stringify(fixture)};
    Object.assign(state.project, structuredClone(fixture.project));
    state.sharedEvidence = structuredClone(fixture.sharedEvidence);
    const key = normalizeAspectKey(${JSON.stringify(goatId)});
    state.gate4Rsya = { [key]: structuredClone(fixture.branch) };
    delete state.project._gate4RsyaProductIdMigrationLog;
    delete state.project._gate4RsyaFoundationMigrationLog;
    g4RsyaMigrateGroupProductIdsV449(state);
    const migration = g4RsyaMigrateGroupFoundationV455(state);
    const d = ensureGate4RsyaV289(${JSON.stringify(goatId)});
    const group = d.groups[0];
    const ad = group.ads[0];
    const foundation = g4RsyaGroupFoundationV455(${JSON.stringify(goatId)}, group);
    const adPrompt = g4RsyaAdPromptDataV451(${JSON.stringify(goatId)}, group);
    const assetPrompt = g4RsyaAssetPromptDataV452(${JSON.stringify(goatId)}, group, ad);
    const channel = {
      key: "yandex-rsya", launchType: "media", channel: "Яндекс Директ",
      platform: "РСЯ", type: "Сети", status: "active", materials: "баннеры",
    };
    const common = {
      decision: "launch", campaignName: "РСЯ · Коза",
      budget: "30000", utm: "utm_source=yandex&utm_medium=cpc",
    };
    const host = document.createElement("main");
    host.style.cssText = "max-width:1180px;margin:0 auto;padding:24px;background:#fff";
    document.body.replaceChildren(host);
    document.body.style.cssText = "display:block;background:#f7f7f4;margin:0";
    host.innerHTML = '<h2 style="margin:0 0 16px">Символ 2027 года «Коза»</h2>' +
      '<section data-smoke-foundation>' + g4RsyaFoundationHtmlV455(${JSON.stringify(goatId)}, group) + '</section>' +
      '<section data-smoke-ad-prompt>' + g4RsyaAdsHtmlV289(${JSON.stringify(goatId)}, channel.key, common, d) + '</section>';
    const foundationHost = host.querySelector('[data-smoke-foundation]');
    const foundationCard = foundationHost.querySelector('.g4-rsya-foundation-v455');
    const adPromptField = host.querySelector('[data-g4rsya-v451-ad-prompt]');
    const assetPromptField = host.querySelector('[data-g4rsya-v452-asset-prompt]');
    host.querySelectorAll('.g4-rsya-media-v289, .g4-rsya-variants-v289, .g4-rsya-extra-block-v289').forEach((node) => {
      node.hidden = true;
    });
    [adPromptField, assetPromptField].forEach((field) => {
      if (!field) return;
      field.style.height = '360px';
      field.style.minHeight = '360px';
    });

    const beforeRerun = JSON.stringify({
      branch: state.gate4Rsya,
      log: state.project._gate4RsyaFoundationMigrationLog,
    });
    const rerun = g4RsyaMigrateGroupFoundationV455(state);
    const afterRerun = JSON.stringify({
      branch: state.gate4Rsya,
      log: state.project._gate4RsyaFoundationMigrationLog,
    });

    const sourceProduct = guruV194Product(${JSON.stringify(goatId)}, state);
    const offerRecord = guruV194Resolve('offers', sourceProduct, state).records[0];
    const originalOffer = offerRecord?.value || '';
    if (offerRecord) offerRecord.value = 'Оффер обновлён напрямую в Gate 0';
    g4RsyaRefreshAdPromptsV451(${JSON.stringify(goatId)}, group);
    const refreshedPrompt = host.querySelector('[data-g4rsya-v451-ad-prompt]')?.value || '';
    if (offerRecord) offerRecord.value = originalOffer;

    const conflictWorkspace = {
      project: structuredClone(fixture.project),
      sharedEvidence: structuredClone(fixture.sharedEvidence),
      gate4Rsya: { [key]: structuredClone(fixture.branch) },
    };
    conflictWorkspace.gate4Rsya[key].groups[0].product_id = ${JSON.stringify(goatProductId)};
    conflictWorkspace.gate4Rsya[key].groups[0].offer = 'Ручной оффер, которого нет в источнике';
    const conflict = g4RsyaMigrateGroupFoundationV455(conflictWorkspace);
    const conflictGroup = conflictWorkspace.gate4Rsya[key].groups[0];
    const originalMigrationLog = state.project._gate4RsyaFoundationMigrationLog;
    state.project._gate4RsyaFoundationMigrationLog =
      conflictWorkspace.project._gate4RsyaFoundationMigrationLog;
    const conflictWarning = g4RsyaFoundationMigrationWarningV455(
      ${JSON.stringify(goatId)},
      group,
    );
    state.project._gate4RsyaFoundationMigrationLog = originalMigrationLog;

    return {
      build: window.GURU_BUILD_INFO?.version,
      product_id: group.product_id,
      foundation: Object.fromEntries([
        'jtbd', 'category', 'segment', 'offer', 'benefit', 'usp',
        'landing', 'targetAction',
      ].map((field) => [field, foundation[field]])),
      storedFields: Object.fromEntries(${JSON.stringify(legacyFields)}.map((field) => [field, Object.hasOwn(group, field)])),
      foundationBlocks: foundationHost.querySelectorAll('.g4-rsya-foundation-v455').length,
      foundationRows: foundationCard?.querySelectorAll('.g4-readonly').length || 0,
      foundationText: foundationCard?.innerText || '',
      projectDataBlocks: foundationHost.querySelectorAll('.g4-rsya-source-grid-v289').length,
      projectFillButtons: foundationHost.querySelectorAll('[data-g4rsya-v289-fill-project]').length,
      editableFoundationFields: foundationHost.querySelectorAll('[data-g4rsya-v289-store="group"][data-g4rsya-v289-field="jtbd"], [data-g4rsya-v289-store="group"][data-g4rsya-v289-field="offer"], [data-g4rsya-v289-store="group"][data-g4rsya-v289-field="segment"]').length,
      adPrompt: { ready: adPrompt.ready, prompt: adPrompt.prompt, values: adPrompt.values },
      assetPrompt: { ready: assetPrompt.ready, prompt: assetPrompt.prompt, values: assetPrompt.values },
      renderedAdPrompt: adPromptField?.value || '',
      renderedAssetPrompt: assetPromptField?.value || '',
      refreshedPrompt,
      migration: {
        status: migration.entry?.status || '',
        fieldsRemoved: migration.entry?.fields_removed || 0,
        manualReview: migration.entry?.manual_review || [],
        unresolved: migration.entry?.unresolved || [],
        idempotent: beforeRerun === afterRerun && rerun.alreadyMigrated === true,
      },
      conflict: {
        manualReview: conflict.entry?.manual_review || [],
        storedFieldRemoved: !Object.hasOwn(conflictGroup, 'offer'),
        warning: conflictWarning,
      },
      errorOverlay: Boolean(document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay')),
      bodyHasContent: document.body.innerText.trim().length > 0,
    };
  })()`);

  audit.runtimeExceptions = page.events
    .filter((event) => event.method === "Runtime.exceptionThrown")
    .map((event) => event.params?.exceptionDetails?.exception?.description ||
      event.params?.exceptionDetails?.text || "Unknown runtime exception");

  assert(audit.build === "2.3.236", `Unexpected build: ${audit.build}`);
  assert(audit.product_id === goatProductId, "Goat group product_id mismatch");
  assert(
    Object.values(audit.storedFields).every((value) => value === false),
    `Legacy fields remain in group: ${JSON.stringify(audit.storedFields)}`,
  );
  assert(audit.foundationBlocks === 1, "Expected one foundation block");
  assert(audit.foundationRows === 2, "Foundation must contain exactly two rows");
  assert(audit.foundationText.includes("JTBD"), "JTBD row is missing");
  assert(
    audit.foundationText.includes("Продукт / категория") &&
      audit.foundationText.includes("источник: Gate 4 · селектор товара"),
    "Product/category source row is wrong",
  );
  assert(audit.projectDataBlocks === 0, "Old Project data block is still rendered");
  assert(audit.projectFillButtons === 0, "Project fill button is still rendered");
  assert(audit.editableFoundationFields === 0, "Editable foundation copies remain");
  assert(audit.adPrompt.ready, "Step 3 prompt is not ready");
  assert(audit.assetPrompt.ready, "Step 5 prompt is not ready");
  for (const value of Object.values(audit.adPrompt.values)) {
    if (value) assert(audit.adPrompt.prompt.includes(value), "Step 3 prompt lost a source value");
  }
  for (const value of Object.values(audit.assetPrompt.values)) {
    if (value) assert(audit.assetPrompt.prompt.includes(value), "Step 5 prompt lost a source value");
  }
  assert(!audit.renderedAdPrompt.includes("[не заполнено]"), "Step 3 rendered placeholders");
  assert(!audit.renderedAssetPrompt.includes("[не заполнено]"), "Step 5 rendered placeholders");
  assert(
    audit.refreshedPrompt.includes("Оффер обновлён напрямую в Gate 0"),
    "Step 3 prompt did not re-read the live Gate 0 source",
  );
  assert(audit.migration.fieldsRemoved === 8, "Migration did not remove eight fields");
  assert(!audit.migration.manualReview.length, "Copied Goat values were falsely marked manual");
  assert(!audit.migration.unresolved.length, "Goat source values were unresolved");
  assert(audit.migration.idempotent, "Foundation migration is not idempotent");
  assert(
    audit.conflict.manualReview.length === 1 &&
    audit.conflict.manualReview.some((item) =>
      item.field === "offer" &&
      item.stored_value === "Ручной оффер, которого нет в источнике"),
    "Manual conflict was not preserved in migration log",
  );
  assert(audit.conflict.storedFieldRemoved, "Manual duplicate was not removed from group storage");
  assert(
    audit.conflict.warning.includes("Луке: проверить 1 расхождение") &&
      audit.conflict.warning.includes("Ручной оффер, которого нет в источнике"),
    "Manual conflict was not surfaced to Luka in the affected group",
  );
  assert(!audit.runtimeExceptions.length, `Runtime exceptions: ${audit.runtimeExceptions.join("\n")}`);
  assert(audit.bodyHasContent && !audit.errorOverlay, "Live page failed basic browser verification");

  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
  });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
  const report = {
    auditedAt: new Date().toISOString(),
    source: sourcePath,
    screenshot: screenshotPath,
    ...audit,
  };
  await writeFile(auditPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ audit: auditPath, screenshot: screenshotPath, ...audit }, null, 2));
} finally {
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  page.close();
  browser.close();
}
