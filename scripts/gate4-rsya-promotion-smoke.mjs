import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = process.env.GURU_PROJECT_SOURCE_EXPORT ||
  resolve("artifacts/gate-4-recovered-groups-v408.json");
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9345";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3010/";
const goatId = "catalog-item-1786792591872-51f503";
const branchKey = "catalog_item_1786792591872_51f503";
const screenshotPath = resolve("artifacts/gate4-rsya-goat-promotion-v457.png");
const auditPath = resolve("artifacts/gate4-rsya-promotion-v457-audit.json");
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
assert(source.gate4Rsya?.[branchKey]?.groups?.[0], "Goat RSYA group is missing");

const fixture = {
  project: {
    catalogItemsV189: source.project.catalogItemsV189,
    productRegistryV185: source.project.productRegistryV185,
    productBindingsV185: source.project.productBindingsV185,
    gate0ScopedValuesV194: source.project.gate0ScopedValuesV194,
  },
  sharedEvidence: source.sharedEvidence || {},
  rsya: source.gate4Rsya[branchKey],
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
assert(pageTarget?.webSocketDebuggerUrl, "Could not create Chrome target");
const page = new CdpClient(pageTarget.webSocketDebuggerUrl);
await page.ready;
await page.call("Runtime.enable");
await page.call("Page.enable");
await page.call("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1300,
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
    'document.readyState === "complete" && typeof g4RsyaPromotionHtmlV457 === "function"',
  );
  const audit = await evaluate(`(async () => {
    state = createFreshWorkspace({
      id: "rsya-promotion-v457-smoke",
      name: "RSYA promotion smoke",
    });
    activeProjectId = "rsya-promotion-v457-smoke";
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const fixture = ${JSON.stringify(fixture)};
    Object.assign(state.project, structuredClone(fixture.project));
    state.sharedEvidence = structuredClone(fixture.sharedEvidence);
    state.gate4Rsya = { ${JSON.stringify(branchKey)}: structuredClone(fixture.rsya) };
    delete state.project._gate4RsyaProductIdMigrationLog;
    delete state.project._gate4RsyaFoundationMigrationLog;
    g4RsyaMigrateGroupProductIdsV449(state);
    g4RsyaMigrateGroupFoundationV455(state);

    const d = ensureGate4RsyaV289(${JSON.stringify(goatId)});
    const channel = {
      key: "yandex-rsya", launchType: "media", channel: "Яндекс Директ",
      platform: "РСЯ", type: "Сети", status: "active", materials: "баннеры",
    };
    const common = {
      decision: "launch", campaignName: "РСЯ · Коза", budget: "30000", utm: "",
    };
    const promotionFields = [
      "type", "description", "discountValue", "promoCode", "dateFrom", "dateTo", "url",
    ];
    const expected = {
      type: "скидка",
      description: "Скидка на символ 2027 года",
      discountValue: "20%",
      promoCode: "KOZA20",
      dateFrom: "2026-10-01",
      dateTo: "2026-12-31",
      url: "https://k-apple.ru/promo/koza-2027",
    };
    const initial = structuredClone(d.campaign.promotion);
    const beforeModel = g4RsyaLaunchModelV454(${JSON.stringify(goatId)}, d);
    const beforeCounts = {
      ready: beforeModel.ready,
      total: beforeModel.total,
      autoReady: beforeModel.autoReady,
      autoTotal: beforeModel.autoTotal,
      manualReady: beforeModel.manualReady,
      manualTotal: beforeModel.manualTotal,
    };
    const beforeIssues = g4RsyaCampaignIssuesV289(common, d, ${JSON.stringify(goatId)});

    const host = document.createElement("main");
    host.style.cssText = "max-width:1180px;margin:0 auto;padding:24px;background:#fff";
    document.body.replaceChildren(host);
    document.body.style.cssText = "display:block;background:#f7f7f4;margin:0";
    host.innerHTML = '<h2 style="margin:0 0 16px">Коза · Настройки кампании</h2>' +
      g4RsyaSettingsHtmlV289(${JSON.stringify(goatId)}, channel.key, common, d, "campaign");

    const section = host.querySelector('[data-g4rsya-promotion-v457]');
    const field = (name) => section?.querySelector(
      '[data-g4rsya-v289-store="promotion"][data-g4rsya-v289-field="' + name + '"]',
    );
    const controls = Object.fromEntries(promotionFields.map((name) => [name, field(name)]));
    const initialDom = Object.fromEntries(
      promotionFields.map((name) => [name, controls[name]?.value ?? null]),
    );
    const typeOptions = [...(controls.type?.options || [])].map((option) => ({
      value: option.value,
      label: option.textContent.trim(),
    }));
    const hint = section?.querySelector('.g4-rsya-guide-v363')?.textContent
      .replace(/\\s+/g, ' ').trim() || '';
    const editable = promotionFields.every((name) =>
      controls[name] && !controls[name].readOnly && !controls[name].disabled,
    );
    const emptyErrors = [...(section?.querySelectorAll('[data-g4rsya-v289-error]') || [])]
      .map((node) => node.textContent.trim()).filter(Boolean);

    for (const name of promotionFields.filter((fieldName) => fieldName !== "type")) {
      controls[name].value = expected[name];
      controls[name].dispatchEvent(new Event("input", { bubbles: true }));
    }
    let renderGateCalls = 0;
    const originalRenderGate = renderGate;
    renderGate = () => { renderGateCalls += 1; };
    controls.type.value = expected.type;
    controls.type.dispatchEvent(new Event("change", { bubbles: true }));
    renderGate = originalRenderGate;

    const storedAfterInput = structuredClone(
      ensureGate4RsyaV289(${JSON.stringify(goatId)}).campaign.promotion,
    );
    const serialized = JSON.stringify(state);
    state = JSON.parse(serialized);
    const restoredD = ensureGate4RsyaV289(${JSON.stringify(goatId)});
    const restored = structuredClone(restoredD.campaign.promotion);
    const afterModel = g4RsyaLaunchModelV454(${JSON.stringify(goatId)}, restoredD);
    const afterCounts = {
      ready: afterModel.ready,
      total: afterModel.total,
      autoReady: afterModel.autoReady,
      autoTotal: afterModel.autoTotal,
      manualReady: afterModel.manualReady,
      manualTotal: afterModel.manualTotal,
    };
    const afterIssues = g4RsyaCampaignIssuesV289(common, restoredD, ${JSON.stringify(goatId)});
    const checklistHtml = g4RsyaLaunchChecklistHtmlV454(
      ${JSON.stringify(goatId)}, afterModel,
    );
    const packageText = g4RsyaAdPackageV289(
      common,
      restoredD,
      restoredD.groups[0],
      restoredD.groups[0].ads[0],
      ${JSON.stringify(goatId)},
    );

    host.innerHTML = '<h2 style="margin:0 0 6px">Коза · Настройки кампании</h2>' +
      '<p class="g1-task" style="margin:0 0 16px">Промоакция — необязательное бизнес-решение.</p>' +
      g4RsyaPromotionHtmlV457(${JSON.stringify(goatId)}, channel.key, restored) +
      '<section style="margin-top:18px"><h3 style="margin:0 0 8px">Запуск</h3>' +
      '<p class="g4-rsya-note-v289" data-smoke-ready>Готово ' + afterModel.ready +
      ' из ' + afterModel.total + ' · промоакция вне общего счёта</p></section>';

    saveState();
    await new Promise((resolve) => setTimeout(resolve, 250));
    const persistedWorkspace = JSON.parse(localStorage.getItem(
      WORKSPACE_STORAGE_PREFIX + activeProjectId,
    ) || "null");
    const persisted = persistedWorkspace?.gate4Rsya?.[${JSON.stringify(branchKey)}]
      ?.campaign?.promotion || null;

    return {
      build: window.GURU_BUILD_INFO?.version,
      promotionKeys: Object.keys(initial),
      initial,
      initialDom,
      sectionCount: document.querySelectorAll('[data-g4rsya-promotion-v457]').length,
      typeOptions,
      hint,
      editable,
      emptyErrors,
      hasInitialErrorClass: Boolean(section?.querySelector('.has-error')),
      renderGateCalls,
      expected,
      storedAfterInput,
      restored,
      persisted,
      beforeCounts,
      afterCounts,
      beforeIssues,
      afterIssues,
      launchMentionsPromotion: /промоакци/i.test(checklistHtml) ||
        afterModel.autoItems.some((item) => /промоакци/i.test(item.key + ' ' + item.text)),
      packageContainsPromotion: Object.values(expected).every((value) => packageText.includes(value)),
      packageText,
      urlHint: document.querySelector(
        '[data-g4rsya-v289-store="promotion"][data-g4rsya-v289-field="url"]',
      )?.closest('.g4-rsya-field-v289')?.querySelector('.g4-rsya-hint-v289')?.textContent.trim() || '',
      errorOverlay: Boolean(document.querySelector(
        '[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay',
      )),
      bodyHasContent: document.body.innerText.trim().length > 0,
    };
  })()`);

  audit.runtimeExceptions = page.events
    .filter((event) => event.method === "Runtime.exceptionThrown")
    .map((event) => event.params?.exceptionDetails?.exception?.description ||
      event.params?.exceptionDetails?.text || "Unknown runtime exception");

  const emptyPromotion = {
    type: "", description: "", discountValue: "", promoCode: "",
    dateFrom: "", dateTo: "", url: "",
  };
  assert(audit.build === "2.3.236", `Unexpected build: ${audit.build}`);
  assert(audit.sectionCount === 1, "Promotion block is missing or duplicated");
  assert(JSON.stringify(audit.promotionKeys) === JSON.stringify(Object.keys(emptyPromotion)), "Unexpected promotion schema");
  assert(JSON.stringify(audit.initial) === JSON.stringify(emptyPromotion), "Promotion defaults are not empty");
  assert(JSON.stringify(audit.initialDom) === JSON.stringify(emptyPromotion), "Promotion UI is not empty by default");
  assert(JSON.stringify(audit.typeOptions.map((row) => row.value)) ===
    JSON.stringify(["", "скидка", "выгода", "кешбэк", "подарок"]), "Promotion types do not match the specification");
  assert(audit.hint === "", "Decorative promotion guidance banner still renders");
  assert(audit.editable, "Every promotion field must be editable");
  assert(!audit.emptyErrors.length && !audit.hasInitialErrorClass, "Empty optional fields are marked as errors");
  assert(audit.renderGateCalls === 1, "Promotion type change did not use the standard binding flow");
  assert(JSON.stringify(audit.storedAfterInput) === JSON.stringify(audit.expected), "Filled promotion was not stored through UI bindings");
  assert(JSON.stringify(audit.restored) === JSON.stringify(audit.expected), "Filled promotion did not survive state serialization");
  assert(JSON.stringify(audit.persisted) === JSON.stringify(audit.expected), "Filled promotion was not saved to workspace storage");
  assert(JSON.stringify(audit.beforeCounts) === JSON.stringify(audit.afterCounts), "Promotion changed Launch ready/total counters");
  assert(JSON.stringify(audit.beforeIssues) === JSON.stringify(audit.afterIssues), "Promotion changed campaign validation issues");
  assert(!audit.launchMentionsPromotion, "Promotion was added to the counted Launch checklist");
  assert(audit.packageContainsPromotion, "Filled promotion is missing from the transfer package");
  assert(audit.urlHint === "Не подставляется автоматически.", "Manual URL hint is missing");
  assert(audit.bodyHasContent && !audit.errorOverlay, "Live page failed basic verification");
  assert(!audit.runtimeExceptions.length, `Runtime exceptions: ${audit.runtimeExceptions.join("\n")}`);

  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
  });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
  await writeFile(auditPath, JSON.stringify({
    auditedAt: new Date().toISOString(),
    source: sourcePath,
    screenshot: screenshotPath,
    ...audit,
  }, null, 2) + "\n");
  console.log(JSON.stringify({ audit: auditPath, screenshot: screenshotPath, ...audit }, null, 2));
} finally {
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  page.close();
  browser.close();
}
