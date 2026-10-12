import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const screenshotPath = resolve("artifacts/gate4-aware-media-v522.png");
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9339";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.ready = new Promise((resolveReady, rejectReady) => {
      this.socket.addEventListener("open", resolveReady, { once: true });
      this.socket.addEventListener("error", rejectReady, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolveCall, rejectCall) => {
      const id = ++this.sequence;
      this.pending.set(id, { resolve: resolveCall, reject: rejectCall });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const browserVersion = await (
  await fetch(`http://127.0.0.1:${debugPort}/json/version`)
).json();
const browser = new CdpClient(browserVersion.webSocketDebuggerUrl);
await browser.ready;
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", {
  url: "about:blank", browserContextId,
});
const targets = await (
  await fetch(`http://127.0.0.1:${debugPort}/json`)
).json();
const pageTarget = targets.find((target) => target.id === targetId);
assert(pageTarget?.webSocketDebuggerUrl, "Chrome target is unavailable");
const page = new CdpClient(pageTarget.webSocketDebuggerUrl);
await page.ready;

async function evaluate(expression) {
  const response = await page.call("Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (response.exceptionDetails)
    throw new Error(response.exceptionDetails.exception?.description ||
      response.exceptionDetails.text);
  return response.result.value;
}

async function waitFor(expression, timeoutMs = 20000) {
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
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1600, height: 1200, deviceScaleFactor: 1, mobile: false,
  });
  await page.call("Page.navigate", { url: appUrl });
  console.log("navigated");
  await waitFor('document.readyState === "complete"');
  console.log("loaded");
  await waitFor('typeof bootstrapAppOnce === "function"');
  console.log("bootstrapped");
  await evaluate(`(() => {
    localStorage.clear();
    const project = {
      id: "gate4-aware-media-smoke", name: "Aware media smoke",
      lifecycleStatus: "active", createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([project]));
    const workspace = createFreshWorkspace(project);
    localStorage.setItem(WORKSPACE_STORAGE_PREFIX + project.id,
      JSON.stringify(workspace));
    rememberAccessUnlocked();
    setAccessState(true);
    bootstrapAppOnce();
    openProject(project.id);
    return true;
  })()`);
  console.log("local project prepared");
  await waitFor('Boolean(state)');
  console.log("project opened");

  const setup = await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const now = new Date().toISOString();
    state.project.productRegistryV185 = [
      { id: "aware-category", name: "Авторские подарки",
        legacyNames: [], createdAt: now },
    ];
    state.project.catalogItemsV189 = [
      { id: "aware-product", name: "Коза ручной работы",
        continuum: "pure_product", categoryId: "aware-category",
        createdAt: now },
    ];
    state.project.gate0ScopedValuesV194 = [];
    const product = guruV194Product("aware-product", state);
    if (!product) throw new Error("Fixture product is missing");
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = product.categoryId || "";
    ui.selectedProductId = product.id;
    ensureGate4Production().launchProduct = product.id;
    const marketing = g3Gate0Marketing();
    marketing.channels = [
      { channel: "Платная реклама", platform: "Яндекс Директ", type: "РСЯ",
        status: "active", materials: "баннеры, видео" },
      { channel: "Платная реклама", platform: "Google Ads", type: "Display",
        status: "active", materials: "баннеры, responsive ads" },
      { channel: "Платная реклама", platform: "Яндекс Директ",
        type: "Мастер кампаний", status: "active", materials: "объявления" },
      { channel: "SMM", platform: "VK", type: "Контент", status: "active" },
    ];
    const channels = g4LaunchChannels();
    const yandex = channels.find((row) => g4IsYandexRsyaChannel(row));
    const google = channels.find((row) => /google ads/i.test(row.platform) &&
      /display/i.test(row.type));
    const master = channels.find((row) => /мастер кампаний/i.test(row.type));
    if (!yandex || !google || !master) throw new Error("Media channels are missing");
    const campaigns = g4EnsureLaunchCampaigns();
    campaigns[g4CampaignStateKey(product.id, yandex.key)].creative =
      "РСЯ: сохранённый баннер и видео";
    campaigns[g4CampaignStateKey(product.id, google.key)].creative =
      "Display: сохранённый баннер";
    campaigns[g4CampaignStateKey(product.id, master.key)].creative =
      "Мастер: сохранённые материалы";
    const model = g3Gate4StructureForProductV290(product.id);
    const group = model.stages.aware.groups[0];
    const banner = group.items.find((item) => item.id === "banners_video");
    if (!banner) throw new Error("Legacy banner tool is missing");
    group.items = group.items.filter((item) => item !== banner);
    banner.channelKeys = [yandex.key, google.key];
    banner.observedChannelKeys = [yandex.key, google.key, master.key];
    const implementation = g3Gate4CreateImplementationV290(banner);
    implementation.message = "Банне��ы: сохранённый текст креатива";
    model.stages.aware.groups.push({ id: "aware-banners-legacy",
      title: "Банне��ы / видео", items: [banner] });
    guruNavigateToGate("gate-4");
    renderGate();
    return { productId: product.id, yandexKey: yandex.key,
      googleKey: google.key, masterKey: master.key,
      bannerInstanceId: banner.instanceId,
      implementationId: implementation.id };
  })()`);
  console.log("fixture rendered");
  await waitFor(`document.querySelector('[data-g4-map-stage-v290="aware"]')`);

  const result = await evaluate(`(() => {
    const stage = document.querySelector('[data-g4-map-stage-v290="aware"]');
    const model = g3Gate4StructureForProductV290(${JSON.stringify(setup.productId)});
    const campaigns = g4EnsureLaunchCampaigns();
    const cards = [...stage.querySelectorAll('[data-g4-aware-banners-v522]')];
    return {
      toolNames: [...stage.querySelectorAll('.g4-map-tool-title-v290 > strong')]
        .map((node) => node.textContent.trim()),
      groupNames: [...stage.querySelectorAll('.g4-map-group-head-v290 h4')]
        .map((node) => node.textContent.trim()),
      mediaCards: cards.map((card) => ({
        channel: card.dataset.g4AwareBannersV522,
        text: card.innerText.trim(),
        target: JSON.parse(card.querySelector('a[data-g3-execution-target-v282]')?.dataset.g3ExecutionTargetV282 || 'null'),
        insideCampaign: Boolean(card.closest('article.g1-card')),
      })),
      masterInStage: stage.textContent.includes("Мастер кампаний"),
      brokenEncoding: document.querySelector('.g4-map-v290')?.textContent.includes("Банне��ы") || false,
      bannerStored: model.stages.aware.groups.some((group) =>
        group.items.some((item) => item.instanceId ===
          ${JSON.stringify(setup.bannerInstanceId)})),
      bannerTitleRepaired: model.stages.aware.groups.some((group) =>
        group.title === "Баннеры / видео"),
      implementationText: g3Gate4ImplementationV290(
        ${JSON.stringify(setup.implementationId)})?.message || "",
      masterCreative: campaigns[g4CampaignStateKey(
        ${JSON.stringify(setup.productId)},
        ${JSON.stringify(setup.masterKey)})]?.creative || "",
    };
  })()`);

  assert(result.toolNames.length === 2 &&
    result.toolNames.includes("Медийная реклама") &&
    result.toolNames.includes("SMM / посевы"),
  `Aware tools: ${JSON.stringify(result.toolNames)}`);
  assert(!result.groupNames.some((name) => /баннер.*видео/i.test(name)),
    "Banner group remains in Aware");
  assert(result.mediaCards.length === 2 &&
    result.mediaCards.every((card) => card.target?.field === "creative" &&
      card.insideCampaign),
  `Media cards: ${JSON.stringify(result.mediaCards)}`);
  assert(result.mediaCards.some((card) => card.channel === setup.yandexKey &&
    card.text.includes("РСЯ: сохранённый баннер и видео")),
  "Yandex creative was not moved into its card");
  assert(result.mediaCards.some((card) => card.channel === setup.googleKey &&
    card.text.includes("Display: сохранённый баннер")),
  "Google creative was not moved into its card");
  assert(!result.masterInStage && !result.brokenEncoding,
    `Master placement or banner text is wrong: ${JSON.stringify(result)}`);
  assert(result.bannerStored && result.bannerTitleRepaired &&
    result.implementationText === "Баннеры: сохранённый текст креатива" &&
    result.masterCreative === "Мастер: сохранённые материалы",
  "Stored banner or Master data changed unexpectedly");

  const clip = await evaluate(`(() => {
    const stage = document.querySelector('[data-g4-map-stage-v290="aware"]');
    const rect = stage.getBoundingClientRect();
    return { x: Math.max(0, rect.left + scrollX - 12),
      y: Math.max(0, rect.top + scrollY - 12),
      width: rect.width + 24, height: rect.height + 24, scale: 1 };
  })()`);
  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png", fromSurface: true, captureBeyondViewport: true, clip,
  });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
  console.log(JSON.stringify({ screenshot: screenshotPath, ...result }, null, 2));
} finally {
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId })
    .catch(() => {});
  page.close();
  browser.close();
}
