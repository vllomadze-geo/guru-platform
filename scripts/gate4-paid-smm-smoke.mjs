import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9379";
const appPort = process.env.GURU_APP_PORT || "3189";
const targets = await (await fetch("http://127.0.0.1:" + debugPort + "/json")).json();
const page = targets.find((entry) => entry.type === "page" && entry.url === "about:blank") ||
  targets.find((entry) => entry.type === "page");
assert(page?.webSocketDebuggerUrl);
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  const waiting = pending.get(message.id);
  if (!waiting) return;
  pending.delete(message.id);
  if (message.error) waiting.reject(new Error(message.error.message));
  else waiting.resolve(message.result);
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
  const project = { id: "paid-smm-smoke-" + Date.now(), name: "Paid SMM smoke",
    lifecycleStatus: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  state = createFreshWorkspace(project); activeProjectId = project.id;
  const product = { id: "paid-product", name: "Кроссовки", categoryId: "" };
  const other = { id: "other-product", name: "Сумки", categoryId: "" };
  state.project.catalogItemsV189.push(product, other);
  state.project.gate0ScopedValuesV194 = [
    { id: "segment-1", field: "segments", scope: "product", product_id: product.id, value: "Молодые покупатели" },
    { id: "offer-1", field: "offers", scope: "product", product_id: product.id,
      value: "Быстрая доставка", offer: { rational: "Быстрая доставка",
        ctaV2: { primary: "Заказать", secondary: "Подробнее", alternative: "Написать" } } },
    { id: "other-segment", field: "segments", scope: "product", product_id: other.id, value: "Другая аудитория" },
    { id: "other-offer", field: "offers", scope: "product", product_id: other.id,
      value: "Сумки", offer: { rational: "Сумки", ctaV2: { primary: "Купить сумку" } } },
  ];
  megaPlatformSetUrl("products", product.id, "https://example.org/shoes");
  megaPlatformSetUrl("products", other.id, "https://example.org/bags");
  const marketing = state.gates.find((gate) => gate.id === "gate-0").cards.find(isMegaMarketingCard);
  marketing.megaMarketing.channels = [{ channel: "VK Реклама", platform: "VK Реклама", type: "" }];
  const channelKey = g4CampaignCanonicalChannelV301({ ...marketing.megaMarketing.channels[0],
    key: g4LaunchChannelKey(marketing.megaMarketing.channels[0], 0) }, 0).key;
  state.gate4Production.campaigns ||= {};
  state.gate4Production.campaigns[g4CampaignStateKey(product.id, channelKey)] = {
    product: product.id, objective: "Получить заявки", budget: "5000",
    channelTargeting: { geography: "Москва", age: "18–35", gender: "Любой" },
  };
  state.gate4Production.campaigns[g4CampaignStateKey(other.id, channelKey)] = {
    product: other.id, objective: "Охват сумок", budget: "9000",
    channelTargeting: { geography: "Казань" },
  };
  const gate0Before = JSON.stringify(state.project.gate0ScopedValuesV194);
  const gate0CardsBefore = JSON.stringify(state.gates.find((gate) => gate.id === "gate-0"));
  const existingAdsBefore = JSON.stringify(state.gate4Production);
  const organic = g4ProductSmmStoreV523(product.id);
  organic.content.ideas.push({ id: "organic-1", productId: product.id,
    name: "Идея из SMM", insight: "Показать процесс ухода",
    primaryTaskFormatId: organic.strategy.formats[0].id, topicId: organic.strategy.topics[0].id });
  organic.content.publications.push({ id: "organic-pub-1", sourceIdeaId: "organic-1",
    productId: product.id, link: "https://example.org/media" });
  const organicSnapshot = JSON.stringify(organic);
  const holder = document.createElement("main");
  holder.style.cssText = "width:1120px;max-width:calc(100% - 32px);margin:16px auto";
  holder.innerHTML = g4PaidSmmStrategyHtmlV1(product);
  document.body.replaceChildren(holder);
  const root = () => holder.querySelector("[data-g4-paid-smm-v1]");
  const panel = (platform) => root().querySelector('[data-g4-paid-platform-v1="' + platform + '"]');
  const freshRenderDidNotWrite = !state.gate4PaidSmmV1;
  const verticalOrder = [...root().querySelectorAll(":scope > [data-g4-paid-platform-v1]")]
    .map((node) => node.dataset.g4PaidPlatformV1).join(",") ===
    "vk,telegram,meta" && !root().querySelector("[data-g4-paid-select-v1]");
  const independentCollapse = !panel("vk").open && !panel("telegram").open && !panel("meta").open;
  const allPlatformsAboveFold = panel("meta").getBoundingClientRect().bottom < window.innerHeight;
  panel("vk").querySelector("summary").click();
  const vkOpensIndependently = panel("vk").open && !panel("telegram").open && !panel("meta").open;
  const vkStages = panel("vk").querySelectorAll("[data-g4-paid-stage-v1]").length;
  const sourceOption = [...panel("vk").querySelectorAll('[data-g4-paid-field-v1="segmentRef"] option')]
    .some((item) => item.value === "segment-1");
  const ctaOption = [...panel("vk").querySelectorAll('[data-g4-paid-field-v1="ctaRef"] option')]
    .some((item) => item.value === "offer-1::primary");
  const sourcePrefilled = panel("vk").querySelector('[data-g4-paid-field-v1="segmentRef"]').value === "segment-1" &&
    panel("vk").querySelector('[data-g4-paid-field-v1="offerRef"]').value === "offer-1" &&
    panel("vk").querySelector('[data-g4-paid-field-v1="ctaRef"]').value === "offer-1::primary";
  const staleSourceNeedsReview = g4PaidSmmStageStatusV1("vk",
    G4_PAID_SMM_STAGES_V1.vk.find((stage) => stage.id === "audience"),
    { fields: { segmentRef: "deleted-segment" } },
    { productId: product.id, creativeCards: [] }) !== "Готово";
  const upstreamPrefilled = panel("vk").querySelector('[data-g4-paid-field-v1="promotionObject"]').value === "Кроссовки" &&
    panel("vk").querySelector('[data-g4-paid-field-v1="campaignGoal"]').value === "Получить заявки" &&
    panel("vk").querySelector('[data-g4-paid-field-v1="targetAction"]').value === "Заказать" &&
    panel("vk").querySelector('[data-g4-paid-field-v1="landingUrl"]').value === "https://example.org/shoes" &&
    panel("vk").querySelector('[data-g4-paid-field-v1="geography"]').value === "Москва" &&
    panel("vk").querySelector('[data-g4-paid-field-v1="budget"]').value === "5000";
  const productIsolation = !panel("vk").textContent.includes("Казань") &&
    ![...panel("vk").querySelectorAll('[data-g4-paid-field-v1="segmentRef"] option')]
      .some((item) => item.value === "other-segment") &&
    g4PaidSmmUpstreamV1(other, "vk").values.geography === "Казань" &&
    g4PaidSmmUpstreamV1(other, "vk").values.landingUrl === "https://example.org/bags";
  state.project.gate0ScopedValuesV194.find((row) => row.id === "segment-1").value = "Обновлённая аудитория";
  g4PaidSmmRefreshV1(root());
  const sourceUpdatesLive = root().querySelector(".g4-paid-context-v1").textContent.includes("Обновлённая аудитория") &&
    panel("vk").querySelector('[data-g4-paid-field-v1="segmentRef"] option:checked').textContent ===
      "Обновлённая аудитория";
  state.project.gate0ScopedValuesV194.find((row) => row.id === "segment-1").value = "Молодые покупатели";
  g4PaidSmmRefreshV1(root());
  const vkNode = panel("vk");
  panel("telegram").querySelector("summary").click();
  const telegramStages = panel("telegram").querySelectorAll("[data-g4-paid-stage-v1]").length;
  const telegramOnly = Boolean(panel("telegram").querySelector('[data-g4-paid-field-v1="creativeCardId"]')) &&
    !panel("telegram").querySelector('[data-g4-paid-field-v1="gender"]') &&
    !panel("telegram").querySelector('[data-g4-paid-card-field-v1="headline"]');
  const status = panel("telegram").querySelector('[data-g4-paid-field-v1="launchStatus"]');
  status.value = "Запущено";
  status.dispatchEvent(new Event("change", { bubbles: true }));
  const launchGuard = !g4PaidSmmStoreV1(product.id).platforms.telegram.fields.launchStatus;
  panel("telegram").querySelector("[data-g4-paid-organic-v1]").value = "organic-1";
  panel("telegram").querySelector("[data-g4-paid-import-v1]").click();
  const untouchedPlatformStable = panel("vk") === vkNode;
  const card = g4PaidSmmStoreV1(product.id).creativeCards[0];
  const imported = card.sourceIdeaId === "organic-1" &&
    card.sourceSnapshot.ideaText === "Показать процесс ухода" &&
    card.sourceSnapshot.format === organic.strategy.formats[0].format &&
    card.sourceSnapshot.media === "https://example.org/media" &&
    JSON.stringify(organic) === organicSnapshot;
  const cardsVisible = panel("telegram").querySelectorAll("[data-g4-paid-card-v1]").length === 1;
  const cardPanel = () => panel("telegram").querySelector("[data-g4-paid-card-v1]");
  const setCard = (key, value) => {
    const field = cardPanel().querySelector('[data-g4-paid-card-field-v1="' + key + '"]');
    field.value = value;
    field.dispatchEvent(new Event(field.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  };
  const telegramUrl = panel("telegram").querySelector('[data-g4-paid-field-v1="telegramUrl"]');
  telegramUrl.value = "t.me/example";
  telegramUrl.dispatchEvent(new Event("input", { bubbles: true }));
  setCard("format", "Sponsored message");
  setCard("text", "x".repeat(161));
  const tooLongRejected = !g4PaidSmmCreativeValidV1({ ...card, status: "Готово" }, "telegram",
    g4PaidSmmStoreV1(product.id).platforms.telegram);
  setCard("text", "Кроссовки с быстрой доставкой");
  setCard("budget", "10");
  setCard("status", "Готово");
  const cardReady = g4PaidSmmStoreV1(product.id).creativeCards[0].status === "Готово" &&
    g4PaidSmmCreativeValidV1(g4PaidSmmStoreV1(product.id).creativeCards[0], "telegram",
      g4PaidSmmStoreV1(product.id).platforms.telegram) &&
    !panel("telegram").querySelector('[data-g4-paid-card-field-v1="destination"]');
  const plan = panel("telegram").querySelector('[data-g4-paid-plan-v1="Sponsored message"]');
  plan.value = "2";
  plan.dispatchEvent(new Event("change", { bubbles: true }));
  const planFacts = panel("telegram").querySelector(".g4-paid-facts-v1").textContent.includes("2") &&
    panel("telegram").querySelector(".g4-paid-facts-v1").textContent.includes("1");
  const telegram = g4PaidSmmStoreV1(product.id).platforms.telegram;
  Object.assign(telegram.fields, {
    objectType: "Канал", telegramUrl: "t.me/example", campaignGoal: "Подписки",
    creativeCardId: card.id, channelTargets: "t.me/channel",
    cpm: "0.2", budget: "10", periodStart: "2026-10-15", periodEnd: "2026-10-30",
    policyChecked: true, requiredChecked: true, moderationStatus: "Одобрено",
  });
  telegram.fields.moderationStatus = "На модерации";
  const separateReview = g4PaidSmmStageStatusV1("telegram",
    G4_PAID_SMM_STAGES_V1.telegram.find((stage) => stage.id === "review"),
    telegram, g4PaidSmmStoreV1(product.id)) === "Готово" &&
    g4PaidSmmStageStatusV1("telegram",
      G4_PAID_SMM_STAGES_V1.telegram.find((stage) => stage.id === "moderation"),
      telegram, g4PaidSmmStoreV1(product.id)) === "На модерации";
  telegram.fields.moderationStatus = "Одобрено";
  const telegramReady = g4PaidSmmCanReadyV1("telegram", telegram, g4PaidSmmStoreV1(product.id));
  g4PaidSmmRefreshV1(root());
  panel("telegram").querySelector("[data-g4-paid-ready-v1]").click();
  const readyRecorded = telegram.fields.launchStatus === "Готово к запуску";
  const launchDate = panel("telegram").querySelector('[data-g4-paid-field-v1="launchDate"]');
  launchDate.value = "2026-10-16";
  launchDate.dispatchEvent(new Event("input", { bubbles: true }));
  panel("telegram").querySelector("[data-g4-paid-launched-v1]").click();
  const launchedRecorded = telegram.fields.launchStatus === "Запущено";
  const collapsePersisted = panel("vk").open && panel("telegram").open && !panel("meta").open;
  panel("meta").querySelector("summary").click();
  const metaStages = panel("meta").querySelectorAll("[data-g4-paid-stage-v1]").length;
  const legal = panel("meta").querySelector("[data-g4-paid-legal-v1]");
  legal.checked = true;
  legal.dispatchEvent(new Event("change", { bubbles: true }));
  const legalBlocks = g4PaidSmmStoreV1(product.id).platforms.meta.legalUnavailable &&
    !g4PaidSmmCanReadyV1("meta", g4PaidSmmStoreV1(product.id).platforms.meta,
      g4PaidSmmStoreV1(product.id)) &&
    panel("meta").querySelector('[data-g4-paid-stage-v1="launch"] .g4-paid-status-v1')
      .textContent === "Юридически недоступно";
  const meta = g4PaidSmmStoreV1(product.id).platforms.meta;
  meta.legalUnavailable = false;
  const metaCard = { id: "meta-card", productId: product.id, platform: "meta",
    format: "Reels", text: "Объявление", asset: "https://example.org/video",
    headline: "Кроссовки", destination: "https://example.org/offer",
    budget: "100", status: "Готово" };
  g4PaidSmmStoreV1(product.id).creativeCards.push(metaCard);
  Object.assign(meta.fields, {
    campaignGoal: "Leads", result: "Заявки", conversionLocation: "Website",
    segmentRef: "segment-1", geography: "Москва", age: "18–35", budget: "100",
    periodStart: "2026-10-15", periodEnd: "2026-10-30", optimizationEvent: "Lead",
    placementMode: "Advantage+ placements", creativeCardId: metaCard.id,
    offerRef: "offer-1", ctaRef: "offer-1::primary",
    policyChecked: true, previewChecked: true,
  });
  const metaReady = g4PaidSmmCanReadyV1("meta", meta, g4PaidSmmStoreV1(product.id));
  const separatePlatform = panel("vk").querySelectorAll("[data-g4-paid-card-v1]").length === 0 &&
    g4PaidSmmStoreV1(product.id).creativeCards.length === 2;
  const vk = g4PaidSmmStoreV1(product.id).platforms.vk ||= { fields: {}, formatPlans: {}, stageOverrides: {} };
  const vkCard = { id: "vk-card", productId: product.id, platform: "vk",
    format: "Короткое видео", text: "Объявление", asset: "https://example.org/video",
    headline: "Кроссовки", destination: "https://example.org/offer",
    budget: "100", status: "Готово" };
  g4PaidSmmStoreV1(product.id).creativeCards.push(vkCard);
  Object.assign(vk.fields, {
    campaignGoal: "Охват", promotionObject: "Сайт", targetAction: "Заявка",
    landingUrl: "https://example.org/offer", segmentRef: "segment-1",
    geography: "Москва", age: "18–35", gender: "Любой",
    placementMode: "Ручной", placements: "Лента", adFormat: "Короткое видео",
    creativeCardId: vkCard.id, offerRef: "offer-1", ctaRef: "offer-1::primary",
    budget: "100", periodStart: "2026-10-15", periodEnd: "2026-10-30",
    biddingStrategy: "Максимум результатов", optimization: "Лиды",
    labeling: "Проверена", policyChecked: true, requiredChecked: true,
    moderationStatus: "Одобрено",
  });
  const vkReady = g4PaidSmmCanReadyV1("vk", vk, g4PaidSmmStoreV1(product.id));
  const manualOverrideWins = g4PaidSmmEffectiveFieldsV1(product, "vk", vk,
    g4PaidSmmStoreV1(product.id)).fields.campaignGoal === "Охват";
  const separateProduct = !g4PaidSmmStoreV1(other.id);
  const group = g4FiveReadViewV523(() => g4FiveProductHtmlV523(product));
  const paidGroup = new DOMParser().parseFromString(group, "text/html")
    .querySelector('[data-g4five-aware-block-v544="paid_social"]');
  const inPaidGroup = Boolean(paidGroup?.querySelector("[data-g4-paid-smm-v1]")) &&
    paidGroup.querySelector("h4")?.textContent === "Рекламный контент · Продукт/Услуга";
  const otherGroup = g4FiveReadViewV523(() => g4FiveProductHtmlV523(other));
  const otherPaid = new DOMParser().parseFromString(otherGroup, "text/html")
    .querySelector('[data-g4five-aware-block-v544="paid_social"]');
  const selectorIsolation = otherPaid?.querySelector(".g4-paid-context-v1")?.textContent.includes("Сумки") &&
    otherPaid.querySelector('[data-g4-paid-field-v1="landingUrl"]')?.value === "https://example.org/bags" &&
    otherPaid.querySelector('[data-g4-paid-field-v1="geography"]')?.value === "Казань" &&
    !otherPaid.querySelector(".g4-paid-context-v1").textContent.includes("Кроссовки");
  const sourcesUnchanged = JSON.stringify(state.project.gate0ScopedValuesV194) === gate0Before;
  const gate0StructureUnchanged = JSON.stringify(state.gates.find((gate) => gate.id === "gate-0")) === gate0CardsBefore;
  const existingAdsUnchanged = JSON.stringify(state.gate4Production) === existingAdsBefore;
  await new Promise((resolve) => setTimeout(resolve, 300));
  const saved = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + project.id));
  const persisted = saved?.gate4PaidSmmV1?.byProduct?.[product.id]?.creativeCards?.length === 3;
  return { freshRenderDidNotWrite, vkStages, telegramStages, metaStages,
    verticalOrder, independentCollapse, allPlatformsAboveFold,
    vkOpensIndependently, untouchedPlatformStable, sourceOption, ctaOption, sourcePrefilled,
    staleSourceNeedsReview,
    upstreamPrefilled, productIsolation, sourceUpdatesLive, manualOverrideWins,
    selectorIsolation, collapsePersisted,
    telegramOnly, tooLongRejected, launchGuard, imported,
    cardsVisible, cardReady, planFacts, separateReview, telegramReady, readyRecorded, launchedRecorded,
    legalBlocks, metaReady, vkReady, separatePlatform, separateProduct,
    inPaidGroup, sourcesUnchanged, gate0StructureUnchanged, existingAdsUnchanged, persisted };
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
  assert.equal(report.vkStages, 9);
  assert.equal(report.telegramStages, 8);
  assert.equal(report.metaStages, 8);
  for (const [key, value] of Object.entries(report)) {
    if (key.endsWith("Stages")) continue;
    assert.equal(value, true, key + " failed");
  }
  await call("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  const mobileWidth = await evaluate("document.documentElement.scrollWidth <= window.innerWidth + 2");
  assert.equal(mobileWidth, true, "Paid SMM overflows mobile viewport");
  await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await evaluate("window.scrollTo(0, 0)");
  const shot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile("/tmp/gate4-paid-smm-smoke.png", Buffer.from(shot.data, "base64"));
  console.log(JSON.stringify(report, null, 2));
} finally {
  socket.close();
}
