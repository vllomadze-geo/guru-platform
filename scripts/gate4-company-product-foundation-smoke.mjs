import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sourcePath = process.env.GURU_PROJECT_SOURCE_EXPORT ||
  resolve("artifacts/gate-4-recovered-groups-v408.json");
const gate1SourcePath = process.env.GURU_GATE1_SOURCE_EXPORT ||
  "/Users/vl/Downloads/gate-1.json";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9345";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3010/";
const goatId = "catalog-item-1786792591872-51f503";
const screenshotPath = resolve("artifacts/gate4-company-product-foundation-v466.png");
const smmPlacementScreenshotPath = resolve("artifacts/gate4-smm-strategy-placement-v467.png");
const auditPath = resolve("artifacts/gate4-company-product-foundation-v466-audit.json");
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
const gate1Export = JSON.parse(await readFile(gate1SourcePath, "utf8"));
const gate1Source = gate1Export.workspace || gate1Export.content;
assert(source?.project, "Workspace or Gate 4 export content is required");
assert(gate1Source?.painV130, "Gate 1 product JTBD source is required");
assert(
  source.project.catalogItemsV189?.some((product) => product.id === goatId),
  "Goat is missing from source export",
);

const fixture = {
  project: source.project,
  sharedEvidence: source.sharedEvidence || {},
  gate4: source.gate4 || {},
  gate4Production: source.gate4Production || {},
  gate4SearchBuild: source.gate4SearchBuild || {},
  gate4Rsya: source.gate4Rsya || {},
  demandV130: source.demandV130 || {},
  painV130: gate1Source.painV130,
  targetAudience: gate1Source.targetAudience || {},
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
  width: 1680,
  height: 1200,
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
    'document.readyState === "complete" && typeof gate4ProductionHtml === "function" && typeof guruStrategicFoundationHtmlV237 === "function"',
  );
  await evaluate(`(() => {
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    location.reload();
    return true;
  })()`);
  await waitFor(
    'document.readyState === "complete" && typeof gate4ProductionHtml === "function" && typeof guruStrategicFoundationHtmlV237 === "function" && document.querySelector("#accessGate")?.hidden === true',
  );

  const audit = await evaluate(`(() => {
    state = createFreshWorkspace({
      id: "gate4-company-product-v466-smoke",
      name: "Gate 4 company product foundation smoke",
    });
    activeProjectId = "gate4-company-product-v466-smoke";
    activeView = "project";
    els.launcher.hidden = true;
    els.appShell.hidden = false;
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const fixture = ${JSON.stringify(fixture)};
    Object.assign(state.project, structuredClone(fixture.project));
    state.sharedEvidence = structuredClone(fixture.sharedEvidence);
    state.gate4 = structuredClone(fixture.gate4);
    state.gate4Production = structuredClone(fixture.gate4Production);
    state.gate4SearchBuild = structuredClone(fixture.gate4SearchBuild);
    state.gate4Rsya = structuredClone(fixture.gate4Rsya);
    state.demandV130 = structuredClone(fixture.demandV130);
    state.painV130 = structuredClone(fixture.painV130);
    state.targetAudience = structuredClone(fixture.targetAudience);
    const ui = guruV194Ui(state);
    const goat = guruV194Product(${JSON.stringify(goatId)}, state);
    ui.selectedProductId = goat.id;
    ui.selectedCategoryId = goat.categoryId;
    activeGateId = "gate-4";
    renderGate();

    const inspect = () => {
      const root = document.querySelector("[data-g4-company-product-layout-v466]");
      const scopes = [...(root?.querySelectorAll(":scope > [data-gate-scope]") || [])];
      const company = root?.querySelector(':scope > [data-gate-scope="company"]');
      const product = root?.querySelector(':scope > [data-gate-scope="product"]');
      const selector = product?.querySelector(':scope > [data-guru-product-context="gate4-launch"]');
      const foundation = product?.querySelector(':scope > [data-guru-strategic-foundation]');
      const launch = product?.querySelector(':scope > .g1-card');
      const rows = [...(foundation?.querySelectorAll(":scope > .guru-strategic-flow-v286 > .guru-strategic-row-v286") || [])]
        .map((row) => ({
          label: row.querySelector(".guru-strategic-row-copy-v286 > strong")?.textContent.trim() || "",
          value: row.querySelector(".guru-strategic-row-copy-v286 > span")?.textContent.trim() || "",
        }));
      const jtbds = [...(foundation?.querySelectorAll("details[data-guru-strategic-jtbd-v286]") || [])]
        .map((details) => ({
          type: details.querySelector(".guru-strategic-jtbd-number-v286")?.textContent.trim() || "",
          text: details.querySelector(":scope > summary > strong")?.textContent.trim() || "",
        }));
      const productSelect = selector?.querySelector('[data-gate0-scope-product-select="gate4-launch"]');
      const categorySelect = selector?.querySelector('[data-gate0-scope-category-select="gate4-launch"]');
      const smmTool = [...(launch?.querySelectorAll('.g4-map-tool-v290') || [])].find((node) =>
        node.querySelector(':scope > .g4-map-tool-title-v290 > strong')?.textContent.trim() === "SMM / посевы"
      );
      const smmTitle = smmTool?.querySelector(':scope > .g4-map-tool-title-v290');
      const smmStrategy = smmTool?.querySelector(':scope > [data-g4-smm-strategy-v298]');
      const vkAds = [...(smmTool?.querySelectorAll(':scope > article') || [])].find((node) =>
        node.querySelector('[data-g4camp-toggle] .g1-card-title, [data-g4camp-toggle] .g4-campaign-platform strong')?.textContent.trim() === "VK Ads / Таргет"
      );
      return {
        scopeOrder: scopes.map((scope) => scope.dataset.gateScope),
        companyHeading: company?.querySelector(":scope > .gate0-section-heading .gate0-section-heading-title")?.textContent.trim() || "",
        productHeading: product?.querySelector(":scope > .gate0-section-heading .gate0-section-heading-title")?.textContent.trim() || "",
        companyFoundationCount: company?.querySelectorAll(":scope > [data-guru-strategic-foundation-company]").length || 0,
        selectorCount: document.querySelectorAll('[data-guru-product-context="gate4-launch"]').length,
        selectorInsideLaunchCount: launch?.querySelectorAll('[data-guru-product-context="gate4-launch"]').length || 0,
        productFoundationCount: product?.querySelectorAll(":scope > [data-guru-strategic-foundation]").length || 0,
        productId: foundation?.dataset.productId || "",
        category: categorySelect?.selectedOptions?.[0]?.textContent.trim() || "",
        product: productSelect?.selectedOptions?.[0]?.textContent.trim() || "",
        rows,
        jtbds,
        orderIsCorrect: Boolean(
          product && selector && foundation && launch &&
          product.firstElementChild?.classList.contains("gate0-section-heading") &&
          selector.nextElementSibling === foundation &&
          foundation.nextElementSibling === launch
        ),
        launchTitle: launch?.querySelector(":scope > .g1-card-header-static .g1-card-title")?.textContent.trim() || "",
        smmPlacement: {
          blocksTotal: document.querySelectorAll('[data-g4-smm-strategy-v298]').length,
          insideSmmTool: smmStrategy?.parentElement === smmTool,
          immediatelyAfterSmmTitle: smmTitle?.nextElementSibling === smmStrategy,
          immediatelyBeforeVkAds: smmStrategy?.nextElementSibling === vkAds,
          strategyTitle: smmStrategy?.querySelector('.g1-card-title')?.textContent.trim() || "",
          strategySubtitle: smmStrategy?.querySelector('.g1-section-progress')?.textContent.trim() || "",
          vkTitle: vkAds?.querySelector('[data-g4camp-toggle] .g1-card-title, [data-g4camp-toggle] .g4-campaign-platform strong')?.textContent.trim() || "",
        },
      };
    };

    const initial = inspect();
    const other = guruV194Products(state).find((item) => item.id !== goat.id && item.categoryId === "product-1786401011698-231009") ||
      guruV194Products(state).find((item) => item.id !== goat.id);
    const otherUi = guruV194Ui(state);
    otherUi.selectedProductId = other.id;
    otherUi.selectedCategoryId = other.categoryId || "__uncategorized__";
    renderGate();
    const switched = inspect();
    const backUi = guruV194Ui(state);
    backUi.selectedProductId = goat.id;
    backUi.selectedCategoryId = goat.categoryId;
    renderGate();
    document.querySelector('[data-gate-scope="product"]')?.scrollIntoView({ block: "start" });
    return { build: window.GURU_BUILD_INFO?.version, initial, switched, restored: inspect() };
  })()`);

  audit.runtimeExceptions = page.events
    .filter((event) => event.method === "Runtime.exceptionThrown")
    .map((event) => event.params?.exceptionDetails?.exception?.description ||
      event.params?.exceptionDetails?.text || "Unknown runtime exception");

  assert(audit.build === "2.3.236", `Unexpected build: ${audit.build}`);
  assert(
    JSON.stringify(audit.initial.scopeOrder) === JSON.stringify(["company", "product"]),
    `Gate 4 scope order is wrong: ${JSON.stringify(audit.initial.scopeOrder)}`,
  );
  assert(audit.initial.companyHeading === "Компания", "Company heading is missing");
  assert(audit.initial.productHeading === "Продукт / Услуга", "Product heading is missing");
  assert(audit.initial.companyFoundationCount === 1, "Company foundation is duplicated or missing");
  assert(audit.initial.selectorCount === 1, "Gate 4 must render exactly one product selector");
  assert(audit.initial.selectorInsideLaunchCount === 0, "Selector still lives inside the launch card");
  assert(audit.initial.productFoundationCount === 1, "Product foundation is duplicated or missing");
  assert(audit.initial.productId === goatId, "Product foundation is not bound to Goat product_id");
  assert(audit.initial.product.includes("Коза"), "Goat is not selected in the product selector");
  assert(audit.initial.category === "Дизайнерские подарки", `Wrong Goat category: ${audit.initial.category}`);
  assert(
    JSON.stringify(audit.initial.rows.map((row) => row.label)) ===
      JSON.stringify(["Посадочная страница", "Сегмент", "Позиционирование", "УТП", "Оффер + CTA"]),
    `Product foundation rows are wrong: ${JSON.stringify(audit.initial.rows)}`,
  );
  assert(
    audit.initial.rows.every((row) => row.value && !row.value.includes("Не заполнено")),
    `Goat foundation contains empty source values: ${JSON.stringify(audit.initial.rows)}`,
  );
  assert(audit.initial.jtbds.length === 3, `Expected three Goat JTBD, got ${audit.initial.jtbds.length}`);
  assert(
    audit.initial.jtbds.every((jtbd) => jtbd.text && !jtbd.text.includes("Не заполнено")),
    `Goat JTBD contains placeholders: ${JSON.stringify(audit.initial.jtbds)}`,
  );
  assert(audit.initial.orderIsCorrect, "Selector, foundation and launch card order is wrong");
  assert(audit.initial.launchTitle === "Запуск рекламных кампаний", "Launch card moved out of product scope");
  assert(audit.initial.smmPlacement.blocksTotal === 1, "SMM strategy must be rendered exactly once");
  assert(audit.initial.smmPlacement.insideSmmTool, "SMM strategy is not inside SMM / посевы");
  assert(audit.initial.smmPlacement.immediatelyAfterSmmTitle, "SMM strategy is not directly after SMM / посевы");
  assert(audit.initial.smmPlacement.immediatelyBeforeVkAds, "SMM strategy is not directly before VK Ads / Таргет");
  assert(audit.initial.smmPlacement.strategyTitle === "SMM-стратегия", "SMM strategy title changed");
  assert(audit.initial.smmPlacement.strategySubtitle === "Компания · зафиксированный справочник", "SMM strategy subtitle changed");
  assert(audit.initial.smmPlacement.vkTitle === "VK Ads / Таргет", "VK Ads card is missing after SMM strategy");
  assert(audit.switched.productId && audit.switched.productId !== goatId, "Product switch did not update foundation product_id");
  assert(audit.switched.product !== audit.initial.product, "Product switch did not update selector label");
  assert(audit.switched.selectorCount === 1 && audit.switched.productFoundationCount === 1, "Product switch created duplicates");
  assert(audit.restored.productId === goatId && audit.restored.product.includes("Коза"), "Goat context was not restored");
  assert(!audit.runtimeExceptions.length, `Runtime exceptions: ${audit.runtimeExceptions.join("\n")}`);

  await wait(250);
  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
  await evaluate(`(() => {
    let strategy = document.querySelector('[data-g4-smm-strategy-v298]');
    if (strategy && !strategy.classList.contains('is-collapsed')) {
      strategy.querySelector(':scope > [data-g1-collapse]')?.click();
      strategy = document.querySelector('[data-g4-smm-strategy-v298]');
    }
    strategy?.closest('.g4-map-tool-v290')?.scrollIntoView({ block: 'center' });
    return true;
  })()`);
  await wait(250);
  const smmPlacementClip = await evaluate(`(() => {
    const strategy = document.querySelector('[data-g4-smm-strategy-v298]');
    const tool = strategy?.closest('.g4-map-tool-v290');
    const title = tool?.querySelector(':scope > .g4-map-tool-title-v290');
    const vkAds = [...(tool?.querySelectorAll(':scope > article') || [])].find((node) =>
      node.querySelector('[data-g4camp-toggle] .g1-card-title, [data-g4camp-toggle] .g4-campaign-platform strong')?.textContent.trim() === "VK Ads / Таргет"
    );
    const nodes = [title, strategy, vkAds].filter(Boolean);
    const rects = nodes.map((node) => node.getBoundingClientRect());
    const left = Math.min(...rects.map((rect) => rect.left));
    const top = Math.min(...rects.map((rect) => rect.top));
    const right = Math.max(...rects.map((rect) => rect.right));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    return {
      x: Math.max(0, left + window.scrollX - 20),
      y: Math.max(0, top + window.scrollY - 20),
      width: Math.min(document.documentElement.scrollWidth, right - left + 40),
      height: bottom - top + 40,
      scale: 1,
    };
  })()`);
  assert(smmPlacementClip.width > 0 && smmPlacementClip.height > 0, "SMM placement screenshot area is empty");
  const smmPlacementScreenshot = await page.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: true,
    clip: smmPlacementClip,
  });
  await writeFile(smmPlacementScreenshotPath, Buffer.from(smmPlacementScreenshot.data, "base64"));
  const report = {
    auditedAt: new Date().toISOString(),
    source: sourcePath,
    gate1Source: gate1SourcePath,
    screenshot: screenshotPath,
    smmPlacementScreenshot: smmPlacementScreenshotPath,
    ...audit,
  };
  await writeFile(auditPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ audit: auditPath, screenshot: screenshotPath, smmPlacementScreenshot: smmPlacementScreenshotPath, ...audit }, null, 2));
} finally {
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  page.close();
  browser.close();
}
