import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9379";
const appPort = process.env.GURU_APP_PORT || "3189";
const targets = await (await fetch("http://127.0.0.1:" + debugPort + "/json")).json();
const page = targets.find((item) => item.type === "page" && item.url === "about:blank") ||
  targets.find((item) => item.type === "page");
assert(page?.webSocketDebuggerUrl);
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const response = JSON.parse(event.data);
  const request = pending.get(response.id);
  if (!request) return;
  pending.delete(response.id);
  response.error ? request.reject(new Error(response.error.message)) : request.resolve(response.result);
});
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

async function browserScenario() {
  rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
  scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
  const project = { id: "gate4-nav-smoke-" + Date.now(), name: "Navigation smoke",
    lifecycleStatus: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  state = createFreshWorkspace(project); activeProjectId = project.id;
  const product = { id: "nav-shoes", name: "Кроссовки", categoryId: "" };
  const other = { id: "nav-bags", name: "Сумки", categoryId: "" };
  state.project.catalogItemsV189.push(product, other);
  const marketing = state.gates.find((gate) => gate.id === "gate-0").cards.find(isMegaMarketingCard);
  marketing.megaMarketing.channels = [
    { channel: "Контент · VK", platform: "VK", type: "Контент" },
    { channel: "Канал и посевы · Telegram", platform: "Telegram", type: "Канал" },
    { channel: "Посевы · Telegram", platform: "Telegram", type: "Посевы" },
    { channel: "Контент · Instagram", platform: "Instagram", type: "Reels" },
    { channel: "Видео · YouTube", platform: "YouTube", type: "Shorts" },
    { channel: "Видео · YouTube", platform: "YouTube", type: "Pre-roll" },
    { channel: "VK Реклама", platform: "VK Реклама", type: "Таргет" },
    { channel: "Telegram Ads", platform: "Telegram Ads", type: "Реклама" },
    { channel: "Meta Ads", platform: "Meta Ads", type: "Feed / Reels" },
    { channel: "Яндекс Директ", platform: "РСЯ", type: "Медийная" },
    { channel: "Google Ads", platform: "Display", type: "Медийная" },
  ];
  const gate0Before = JSON.stringify(state.gates.find((gate) => gate.id === "gate-0"));
  const paidBefore = JSON.stringify(state.gate4PaidSmmV1);
  const organicBefore = JSON.stringify(state.gate4ProductSmmV523);
  const campaignsBefore = JSON.stringify(state.gate4Production?.campaigns);
  const holder = document.createElement("main");
  holder.style.cssText = "width:100%;min-width:0";
  holder.innerHTML = g4FiveReadViewV523(() => g4FiveProductHtmlV523(product));
  document.getElementById("appShell").hidden = false;
  document.querySelector(".content-area").replaceChildren(holder);
  const group = (id) => holder.querySelector('[data-g4five-aware-block-v544="' + id + '"]');
  const row = (id) => holder.querySelector('[data-g4five-nav-row-v545="' + id + '"]');
  const groups = [...holder.querySelectorAll('[data-g4-map-stage-v290="aware"] [data-g4five-aware-block-v544]')]
    .map((item) => item.dataset.g4fiveAwareBlockV544).join(",");
  const organicRows = [...group("content_smm").querySelectorAll(":scope > .g4five-aware-block-content-v544 > [data-g4five-nav-row-v545]")]
    .map((item) => item.dataset.g4fiveNavRowV545).join(",");
  const paidRows = [...group("paid_social").querySelectorAll(":scope > .g4five-aware-block-content-v544 > [data-g4five-nav-row-v545]")]
    .map((item) => item.dataset.g4fiveNavRowV545).join(",");
  const mediaRows = [...group("media").querySelectorAll(":scope > .g4five-aware-block-content-v544 > [data-g4five-nav-row-v545]")]
    .map((item) => item.dataset.g4fiveNavRowV545).join(",");
  const headings = ["content_smm", "paid_social", "media"].map((id) => group(id).querySelector("h4").textContent).join("|");
  const navigationVisible = group("content_smm").getBoundingClientRect().width > 0;
  const allInitiallyClosed = [...holder.querySelectorAll("[data-g4five-nav-row-v545]")].every((item) => !item.open);
  const strategyIntact = Boolean(row("organic_strategy").querySelector("[data-g4-product-smm-workspace-v2]"));
  const platformsIntact = ["vk", "telegram", "meta"].every((id) =>
    row("paid_" + (id === "telegram" ? "telegram_ads" : id))
      ?.querySelector('[data-g4-paid-platform-v1="' + id + '"]'));
  const dedicatedSeeding = row("paid_telegram_seeding").querySelectorAll("[data-g4five-channel-v523]").length === 1 &&
    row("organic_telegram").querySelectorAll("[data-g4five-channel-v523]").length === 1;
  const dedicatedPreRoll = row("media_youtube").querySelectorAll("[data-g4five-channel-v523]").length === 1 &&
    row("organic_youtube").querySelectorAll("[data-g4five-channel-v523]").length === 1;
  const routingCounts = ["organic_telegram", "paid_telegram_seeding", "organic_youtube", "media_youtube"]
    .map((id) => [id, row(id).querySelectorAll("[data-g4five-channel-v523]").length]);
  const routingSource = g4FiveReadViewV523(() => g4LaunchChannels()
    .filter((item) => /telegram|youtube/i.test(g4FiveChannelTextV523(item)))
    .map((item) => [g4FiveChannelTextV523(item), g4FiveTelegramSeedingV545(item),
      g4FiveYouTubePreRollV545(item)]));
  const protectedRsya = Boolean(row("media_yandex").querySelector(".g4five-protected-v523"));
  const sourceUnchanged = JSON.stringify(state.gates.find((gate) => gate.id === "gate-0")) === gate0Before &&
    JSON.stringify(state.gate4PaidSmmV1) === paidBefore &&
    JSON.stringify(state.gate4ProductSmmV523) === organicBefore &&
    JSON.stringify(state.gate4Production?.campaigns) === campaignsBefore;
  activeView = "gate";
  activeGateId = "gate-4";
  const renderBefore = renderGate;
  let fullRenders = 0;
  renderGate = function () { fullRenders += 1; return renderBefore.apply(this, arguments); };
  const groupsInitiallyClosed = ["content_smm", "paid_social", "media"].every((id) => !group(id).open);
  const organicContent = group("content_smm").querySelector(".g4five-aware-block-content-v544");
  group("content_smm").querySelector("summary").click();
  const groupOpens = group("content_smm").open && organicContent.getClientRects().length > 0 &&
    state.gate4FiveAV523?.byProduct?.[product.id]?.openBlocksV547?.includes("content_smm");
  group("content_smm").querySelector("summary").click();
  const groupCloses = !group("content_smm").open && organicContent.getClientRects().length === 0 &&
    !state.gate4FiveAV523?.byProduct?.[product.id]?.openBlocksV547?.includes("content_smm");
  group("content_smm").querySelector("summary").click();
  for (const id of ["paid_social", "media"]) group(id).querySelector("summary").click();
  const groupsIndependent = ["content_smm", "paid_social", "media"].every((id) =>
    group(id).open && state.gate4FiveAV523?.byProduct?.[product.id]?.openBlocksV547?.includes(id)) &&
    group("content_smm").querySelector(".g4five-aware-block-content-v544") === organicContent && fullRenders === 0;
  const sameProduct = new DOMParser().parseFromString(
    g4FiveReadViewV523(() => g4FiveProductHtmlV523(product)), "text/html");
  const groupsRestore = ["content_smm", "paid_social", "media"].every((id) =>
    sameProduct.querySelector('[data-g4five-aware-block-v544="' + id + '"]')?.open);
  const campaignRow = row("organic_vk");
  campaignRow.open = true;
  const campaignButton = campaignRow.querySelector("[data-g4camp-toggle]");
  const campaignCard = campaignButton.closest(".g1-card, .g4-campaign-shell");
  campaignButton.click();
  const campaignBody = campaignCard.querySelector(":scope > .g1-card-body, :scope > .g4-campaign-row");
  const campaignOpensInPlace = holder.isConnected && campaignRow.isConnected &&
    campaignCard.isConnected && Boolean(campaignBody) && campaignCard.classList.contains("is-open");
  campaignButton.click();
  const campaignClosesInPlace = campaignBody?.isConnected &&
    getComputedStyle(campaignBody).display === "none" && !campaignCard.classList.contains("is-open");
  campaignButton.click();
  const campaignReusesBody = campaignBody?.isConnected &&
    campaignCard.querySelector(":scope > .g1-card-body, :scope > .g4-campaign-row") === campaignBody &&
    getComputedStyle(campaignBody).display !== "none" && fullRenders === 0;
  campaignButton.click();
  const rsyaRow = row("media_yandex");
  rsyaRow.open = true;
  const rsyaButton = rsyaRow.querySelector(".g4five-protected-v523 [data-g4camp-toggle]");
  rsyaButton.click();
  const rsyaCard = rsyaButton.closest(".g1-card");
  const rsyaStep = rsyaCard.querySelector('[data-g4rsya-v453-step="launch"]');
  rsyaStep?.click();
  const rsyaLocal = Boolean(rsyaCard.isConnected && rsyaStep?.closest(".g1-card")
    ?.querySelector(":scope > .g1-card-body") && fullRenders === 0);
  const searchButton = holder.querySelector('[data-g4-map-stage-v290="ask"] [data-g4camp-toggle]');
  searchButton.click();
  const searchCard = searchButton.closest(".g1-card");
  const searchStep = searchCard.querySelector("[data-g4sb-step]");
  searchStep?.click();
  const searchLocal = Boolean(searchCard.isConnected && searchStep?.closest(".g1-card")
    ?.querySelector(":scope > .g1-card-body") && fullRenders === 0);
  renderGate = renderBefore;
  const preparation = holder.querySelector("[data-g4five-preparation-v523]");
  const preparationGroup = preparation.querySelector("[data-g4-funnel-readiness-stage-v294]");
  const preparationInitiallyOpen = preparation.open &&
    preparation.querySelectorAll("[data-g4-readiness-card]").length === 20 &&
    preparationGroup.getClientRects().length > 0;
  preparation.querySelector("summary").click();
  const preparationCloses = !preparation.open &&
    preparationGroup.getClientRects().length === 0 &&
    state.gate4FiveAV523?.byProduct?.[product.id]?.preparationOpenV523 === false;
  const closedRender = new DOMParser().parseFromString(
    g4FiveReadViewV523(() => g4FiveProductHtmlV523(product)), "text/html");
  const preparationRerenderClosed = !closedRender.querySelector("[data-g4five-preparation-v523]").open;
  preparation.querySelector("summary").click();
  const preparationReopens = preparation.open &&
    preparationGroup.getClientRects().length > 0 &&
    state.gate4FiveAV523?.byProduct?.[product.id]?.preparationOpenV523 === true;
  preparation.querySelector("summary").click();
  row("organic_strategy").querySelector("summary").click();
  const strategyOpens = row("organic_strategy").open &&
    !row("organic_strategy").querySelector(".g4-product-smm-v523").classList.contains("is-collapsed") &&
    state.gate4FiveAV523?.byProduct?.[product.id]?.openRowsV545?.includes("organic_strategy");
  row("organic_strategy").querySelector("summary").click();
  const strategyCloses = !row("organic_strategy").open &&
    !state.gate4FiveAV523?.byProduct?.[product.id]?.openRowsV545?.includes("organic_strategy");
  row("paid_vk").querySelector("summary").click();
  const paidOpens = row("paid_vk").open &&
    row("paid_vk").querySelector('[data-g4-paid-platform-v1="vk"]').open;
  const field = row("paid_vk").querySelector('[data-g4-paid-field-v1="campaignGoal"]');
  field.value = "Продажи кроссовок";
  field.dispatchEvent(new Event("input", { bubbles: true }));
  const paidStillEdits = g4PaidSmmStoreV1(product.id)?.platforms?.vk?.fields?.campaignGoal === "Продажи кроссовок";
  const paidStatusLive = row("paid_vk").querySelector(".g4five-nav-status-v545").classList.contains("status-in_progress") &&
    row("paid_vk").querySelector(".g4five-nav-status-v545").textContent === "В работе";
  const nativeNavigationStyle = getComputedStyle(group("content_smm").querySelector("h4")).fontSize ===
    getComputedStyle(document.documentElement).getPropertyValue("--text-md").trim() &&
    getComputedStyle(row("organic_vk")).borderRadius ===
    getComputedStyle(document.documentElement).getPropertyValue("--r-md").trim() &&
    row("organic_vk").querySelector(".status-pill")?.textContent === "Не начато";
  const otherHtml = g4FiveReadViewV523(() => g4FiveProductHtmlV523(other));
  const otherNode = new DOMParser().parseFromString(otherHtml, "text/html");
  const productIsolation = !otherNode.querySelector('[data-g4five-nav-row-v545="paid_vk"]').open &&
    !otherNode.querySelector('[data-g4five-nav-row-v545="organic_strategy"]').open &&
    !otherNode.querySelector('[data-g4five-aware-block-v544="content_smm"]').open &&
    otherNode.querySelector("[data-g4five-preparation-v523]").open &&
    !g4PaidSmmStoreV1(other.id);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const saved = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + project.id));
  const navigationSaved = saved?.gate4FiveAV523?.byProduct?.[product.id]?.openRowsV545?.includes("paid_vk") &&
    saved?.gate4FiveAV523?.byProduct?.[product.id]?.openBlocksV547?.length === 3 &&
    saved?.gate4PaidSmmV1?.byProduct?.[product.id]?.platforms?.vk?.fields?.campaignGoal === "Продажи кроссовок";
  const preparationSaved = saved?.gate4FiveAV523?.byProduct?.[product.id]?.preparationOpenV523 === false;
  const headingTemplate = document.createElement("template");
  headingTemplate.innerHTML = gate0SectionHeadingHtml("Продукт / Услуга", "", "product");
  const heading = headingTemplate.content.firstElementChild;
  holder.before(heading);
  const scopeButton = heading.querySelector("[data-gate0-section-toggle]");
  const scopeRenderBefore = renderGate;
  let scopeFullRenders = 0;
  renderGate = function () { scopeFullRenders += 1; return scopeRenderBefore.apply(this, arguments); };
  scopeButton.click();
  const scopeClosesInPlace = holder.isConnected && holder.classList.contains("gate0-section-content-hidden");
  scopeButton.click();
  const scopeReopensInPlace = holder.isConnected && !holder.classList.contains("gate0-section-content-hidden") &&
    scopeFullRenders === 0;
  renderGate = scopeRenderBefore;
  heading.remove();
  return { groups, organicRows, paidRows, mediaRows, headings, routingCounts, routingSource, navigationVisible, allInitiallyClosed,
    groupsInitiallyClosed, groupOpens, groupCloses, groupsIndependent, groupsRestore,
    strategyIntact, platformsIntact, dedicatedSeeding, dedicatedPreRoll, protectedRsya,
    sourceUnchanged, campaignOpensInPlace, campaignClosesInPlace, campaignReusesBody,
    rsyaLocal, searchLocal,
    strategyOpens, strategyCloses, paidOpens, paidStillEdits, paidStatusLive, nativeNavigationStyle,
    preparationInitiallyOpen, preparationCloses, preparationRerenderClosed, preparationReopens,
    productIsolation, navigationSaved, preparationSaved, scopeClosesInPlace, scopeReopensInPlace };
}

try {
  await call("Runtime.enable");
  await call("Page.enable");
  await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await call("Page.addScriptToEvaluateOnNewDocument", { source:
    "{ const nativeFetch = window.fetch.bind(window); window.fetch = (input, init) => String(input).includes('/api/') ? Promise.resolve(new Response(JSON.stringify({ ok: true, projects: [], workspaces: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } })) : nativeFetch(input, init); }" });
  await call("Page.navigate", { url: "http://127.0.0.1:" + appPort + "/" });
  await new Promise((resolve) => setTimeout(resolve, 1300));
  const report = await evaluate("(" + browserScenario.toString() + ")()");
  console.log(JSON.stringify(report, null, 2));
  assert.equal(report.groups, "content_smm,paid_social,media");
  assert.equal(report.organicRows, "organic_strategy,organic_vk,organic_telegram,organic_instagram,organic_youtube");
  assert.equal(report.paidRows, "paid_vk,paid_telegram_ads,paid_telegram_seeding,paid_meta");
  assert.equal(report.mediaRows, "media_yandex,media_google,media_youtube");
  assert.equal(report.headings, "Органический контент · Продукт/Услуга|Рекламный контент · Продукт/Услуга|Медийная реклама");
  for (const [key, value] of Object.entries(report)) {
    if (["groups", "organicRows", "paidRows", "mediaRows", "headings", "routingCounts", "routingSource"].includes(key)) continue;
    assert.equal(value, true, key + " failed");
  }
  const clip = await evaluate(`(() => {
    document.querySelectorAll('[data-g4five-nav-row-v545]').forEach((row) => { row.open = false; });
    const first = document.querySelector('[data-g4five-aware-block-v544="content_smm"]');
    const last = document.querySelector('[data-g4five-aware-block-v544="media"]');
    const a = first.getBoundingClientRect(), b = last.getBoundingClientRect();
    return { x: Math.max(0, a.left + scrollX - 12), y: Math.max(0, a.top + scrollY - 12),
      width: a.width + 24, height: b.bottom - a.top + 24, scale: 1 };
  })()`);
  const shot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip });
  await writeFile("/tmp/gate4-aware-navigation-smoke.png", Buffer.from(shot.data, "base64"));
  await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  assert.equal(await evaluate("document.documentElement.scrollWidth <= window.innerWidth + 2"), true,
    "Navigation overflows mobile viewport");
  const mobileClip = await evaluate(`(() => {
    const row = document.querySelector('[data-g4five-nav-row-v545="organic_vk"]');
    const box = row.getBoundingClientRect();
    return { x: 0, y: Math.max(0, box.top + scrollY - 20), width: window.innerWidth,
      height: Math.min(520, document.documentElement.scrollHeight - box.top - scrollY + 20), scale: 1 };
  })()`);
  const mobileShot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: mobileClip });
  await writeFile("/tmp/gate4-aware-navigation-mobile-smoke.png", Buffer.from(mobileShot.data, "base64"));
} finally {
  socket.close();
}
