import fs from "node:fs";

const port = process.env.GURU_CHROME_DEBUG_PORT || "9339";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

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
  close() { this.socket.close(); }
}

let browser;
let page;
let contextId = "";
let targetId = "";

async function evaluate(expression) {
  const result = await page.call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

async function screenshot(name, selector, offset = 0) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)})?.scrollIntoView({block:"start"}); window.scrollBy(0, ${-offset})`);
  await wait(250);
  const shot = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const path = `artifacts/${name}`;
  fs.writeFileSync(path, Buffer.from(shot.data, "base64"));
  return path;
}

try {
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  browser = new CdpClient(version.webSocketDebuggerUrl);
  await browser.ready;
  ({ browserContextId: contextId } = await browser.call("Target.createBrowserContext"));
  ({ targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId: contextId }));
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  page = new CdpClient(targets.find((row) => row.id === targetId).webSocketDebuggerUrl);
  await page.ready;
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.call("Page.navigate", { url: appUrl });
  const started = Date.now();
  while (!(await evaluate('document.readyState === "complete" && typeof g4RsyaChannelCardV289 === "function" && typeof g2MetrikaQualityPrimaryStatusV361 === "function"'))) {
    if (Date.now() - started > 15000) throw new Error("GURU did not load");
    await wait(100);
  }

  const result = await evaluate(`(async () => {
    state = createFreshWorkspace({ id: "rsya-guidance-smoke", name: "RSYA guidance smoke" });
    activeProjectId = "rsya-guidance-smoke";
    const product = "smoke-product";
    g4RsyaCatalogProductV289 = () => ({ id: "product-1", name: "Тестовый товар" });
    const gate2 = state.gates.find((gate) => gate.id === "gate-2");
    gate2.cards = gate2.cards || [];
    Object.assign(g2MetrikaCompanyDataV374("counter"), { counterId: "123456", counterCheck: "found", verificationStatus: "ready",
      testedAt: "2026-09-15", evidenceUrl: "https://metrika.yandex.ru/counter" });
    Object.assign(g2MetrikaCompanyDataV374("goals"), { primaryGoal: { entryId: "goal-1", name: "Заявка",
      type: "page_visit", goalId: "goal-123", state: "works" }, verificationStatus: "ready",
      testedAt: "2026-09-15", evidenceUrl: "https://metrika.yandex.ru/goals" });
    const primaryCard = {
      id: "g2-metrika-goals-primary",
      fields: { metrikaQualityV360: { perProduct: [{
        product_id: "product-1", mainAction: "Заявка", goalRefId: "goal-1",
        thankYouUrl: "https://example.test/thank-you", testConversionAt: "2026-09-15T10:00",
        result: "yes", evidenceUrl: "https://metrika.yandex.ru/report",
        testedAt: "2026-09-15",
      }] } },
    };
    const existingPrimary = gate2.cards.find((card) => card.id === primaryCard.id);
    if (existingPrimary) Object.assign(existingPrimary, primaryCard);
    else gate2.cards.push(primaryCard);
    state.gate4SearchBuild = { smoke_product: { settings: { strategy: "max_conversions" }, groupRows: [{
      col0: "Поиск · отдельная группа", col2: "1000", col3: "100", col4: "30000", demandRows: [{ kw: "поисковая фраза" }],
    }] } };
    const searchBefore = JSON.stringify(state.gate4SearchBuild);
    state.gate4Rsya = { smoke_product: {
      exclusions: { themes: "Старые темы и площадки — не переносить автоматически" },
      campaign: { strategy: "target_cpa", geography: "Москва", schedule: "Ежедневно", budgetPeriod: "week", metrikaCounter: "123456", metrikaGoal: "goal-123" },
      groups: [{ name: "Группа РСЯ", segment: "Клиенты", jtbd: "Найти услугу", offer: "Получить услугу", interests: "Покупатели услуги", landing: "https://example.test/product", ads: [{ title: "Нужная услуга", text: "Закажите услугу на сайте", landing: "https://example.test/product", images: [{ id: "image-1", name: "image.png", type: "image/png", size: 1000, width: 800, height: 800, dataUrl: "data:image/png;base64,AA==" }] }] }],
    } };
    const d = ensureGate4RsyaV289(product);
    const oldStrategyPreserved = d.campaign.strategy === "target_cpa" && d.campaign.paymentModel === "";
    const legacyPreserved = d.exclusions.themes.includes("Старые темы") && d.campaign.excludedPlacements.length === 0;
    const campaign = { decision: "launch", campaignName: "РСЯ · тест", budget: "30000", utm: "utm_source=yandex" };
    const channel = { key: "yandex-rsya", launchType: "media", channel: "Яндекс Директ", platform: "РСЯ", type: "Сети", status: "active", materials: "баннеры" };
    state.gate4Production = state.gate4Production || {};
    state.gate4Production.campaigns = { [g4CampaignStateKey(product, channel.key)]: campaign };
    g4EnsureLaunchUiState().rows[g4CampaignStateKey(product, channel.key)] = true;
    d.ui.workflowStepOpenV453 = { groups: true, launch: true };
    const oldRender = renderGate, oldSaving = flashSaving;
    renderGate = () => {};
    flashSaving = () => {};
    const host = document.createElement("main");
    host.style.cssText = "max-width:1180px;margin:0 auto;padding:24px;background:#fff";
    document.body.replaceChildren(host);
    document.body.style.cssText = "display:block;background:#f7f7f4;margin:0";
    const refresh = () => { host.innerHTML = g4RsyaChannelCardV289(channel, campaign, 0, product); };
    refresh();
    const initialGuides = host.querySelectorAll(".g4-rsya-guide-v363").length;
    const guideRendererDisabled = g4RsyaGuideV363("groupTargeting", "Группа.") === "";
    const guideSourceRemoved = typeof G4_RSYA_GUIDES_V363 === "undefined";
    const metrikaGuideRendererRemoved = typeof g2MetrikaQualityGuideHtmlV361 === "undefined";
    const metrikaGuideSourceRemoved = G2_METRIKA_QUALITY_CARDS_V360.every(
      (definition) => !Object.hasOwn(definition, "guide"),
    );
    const metrikaLongHelpRemoved = !g2MetrikaQualityProductRowsV360
      .toString().includes("g2-metrika-goal-help-v366");
    const oldPaymentVisible = host.querySelector('[data-g4rsya-v289-field="paymentModel"]')?.value === "";
    const searchHint = host.querySelector(".g4-rsya-reference-v363")?.textContent.includes("Поиск · отдельная группа");
    const workflowSteps = [...host.querySelectorAll("[data-g4rsya-v453-step] .g1-card-title")].map((node) => node.textContent.trim());
    const payment = host.querySelector('[data-g4rsya-v289-field="paymentModel"]');
    payment.value = "conversions";
    payment.dispatchEvent(new Event("change", { bubbles: true }));
    refresh();
    const targetInput = host.querySelector('[data-g4rsya-v289-field="targetCpaRub"]');
    targetInput.value = "900";
    targetInput.dispatchEvent(new Event("input", { bubbles: true }));
    const today = new Date();
    const y = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const f = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
    const fmt = (date) => [date.getFullYear(), String(date.getMonth()+1).padStart(2,"0"), String(date.getDate()).padStart(2,"0")].join("-");
    Object.assign(d.campaign.conversionVolumeCheck, { from: fmt(f), to: fmt(y), evidenceUrl: "https://metrika.yandex.ru/report" });
    refresh();
    const countInput = host.querySelector('[data-g4rsya-v289-field="count"]');
    countInput.value = "5";
    countInput.dispatchEvent(new Event("input", { bubbles: true }));
    refresh();
    const fiveConversionsProblem = g4RsyaCampaignStatusV289(campaign, d, product) === "problem" && host.querySelector(".g4-rsya-v289 > .g1-card-header .status-problem")?.textContent === "Проблема";
    const volumeIssue = g4RsyaCampaignIssuesV289(campaign, d, product).some((issue) => issue.includes("5 из 10"));
    const countInputReady = host.querySelector('[data-g4rsya-v289-field="count"]');
    countInputReady.value = "12";
    countInputReady.dispatchEvent(new Event("input", { bubbles: true }));
    refresh();
    const twelveConversionsReady = g4RsyaCampaignStatusV289(campaign, d, product) === "ready";
    host.querySelector('[data-g4rsya-v289-field="from"]').dispatchEvent(new Event("input", { bubbles: true }));
    const changedPeriodInvalidatesVolume = !g4RsyaVolumeAssessmentV363(d.campaign).passed;
    host.querySelector('[data-g4rsya-v289-field="count"]').dispatchEvent(new Event("input", { bubbles: true }));
    refresh();
    const changedGoalInvalidatesVolume = !g4RsyaVolumeAssessmentV363({ ...d.campaign, metrikaGoal: "other-goal" }).passed;
    const impossibleDateRejected = !g4RsyaVolumeAssessmentV363({ ...d.campaign, conversionVolumeCheck: { ...d.campaign.conversionVolumeCheck, from: "2026-02-31" } }).passed;
    const goalLinked = g4RsyaGoalQualityV363(product, d.campaign).status === "ready";
    d.campaign.paymentModel = "clicks";
    d.campaign.conversionVolumeCheck.count = "5";
    const clickPaymentWarnsButDoesNotBlock = g4RsyaCampaignStatusV289(campaign, d, product) === "ready";
    d.campaign.paymentModel = "conversions";
    d.campaign.conversionVolumeCheck.count = "12";
    d.campaign.metrikaGoal = "wrong-goal";
    const mismatchedGoalProblem = g4RsyaCampaignStatusV289(campaign, d, product) === "problem";
    d.campaign.metrikaGoal = "goal-123";
    const targetInPackage = g4RsyaAdPackageV289(campaign, d, d.groups[0], d.groups[0].ads[0]).includes("ЦЕЛЕВАЯ ЦЕНА КОНВЕРСИИ ДЛЯ РСЯ: 900 ₽");
    host.querySelector("[data-g4rsya-v289-add-placement]").click();
    refresh();
    const placementInput = host.querySelector('[data-g4rsya-v289-store="excludedPlacement"][data-g4rsya-v289-field="placement"]');
    placementInput.value = "example-bad-site.test";
    placementInput.dispatchEvent(new Event("input", { bubbles: true }));
    const reasonInput = host.querySelector('[data-g4rsya-v289-store="excludedPlacement"][data-g4rsya-v289-field="reason"]');
    reasonInput.value = "Плохой результат по отчёту";
    reasonInput.dispatchEvent(new Event("input", { bubbles: true }));
    refresh();
    const placementInPackage = g4RsyaAdPackageV289(campaign, d, d.groups[0], d.groups[0].ads[0]).includes("example-bad-site.test");
    const searchUntouched = JSON.stringify(state.gate4SearchBuild) === searchBefore;
    const rowsBeforeSwitch = JSON.stringify(d.groups);
    const targetBeforeSwitch = d.campaign.strategyTarget.targetCpaRub;
    d.campaign.strategy = "target_drr";
    d.campaign.strategyTarget.targetDrrPercent = "15";
    refresh();
    const drrVisible = Boolean(host.querySelector('[data-g4rsya-v289-field="targetDrrPercent"]')) && g4RsyaAdPackageV289(campaign, d, d.groups[0], d.groups[0].ads[0]).includes("ЦЕЛЕВАЯ ДРР ДЛЯ РСЯ: 15 %");
    d.campaign.strategy = "target_cpa";
    refresh();
    const valuesPreserved = d.campaign.strategyTarget.targetCpaRub === targetBeforeSwitch && d.campaign.strategyTarget.targetDrrPercent === "15" && JSON.stringify(d.groups) === rowsBeforeSwitch;
    const persisted = JSON.parse(JSON.stringify(state)).gate4Rsya.smoke_product.campaign;
    const newFieldsRoundTrip = persisted.paymentModel === "conversions" && persisted.strategyTarget.targetCpaRub === "900" && persisted.strategyTarget.targetDrrPercent === "15" && persisted.excludedPlacements[0].placement === "example-bad-site.test" && persisted.conversionVolumeCheck.count === "12";
    window.__rsyaGuidanceSmoke = { host, d, campaign, channel, product, refresh, oldRender, oldSaving };
    return { oldStrategyPreserved, legacyPreserved, oldPaymentVisible, initialGuides, guideRendererDisabled, guideSourceRemoved, metrikaGuideRendererRemoved, metrikaGuideSourceRemoved, metrikaLongHelpRemoved, workflowSteps, searchHint, fiveConversionsProblem, volumeIssue, twelveConversionsReady, changedPeriodInvalidatesVolume, changedGoalInvalidatesVolume, impossibleDateRejected, goalLinked, clickPaymentWarnsButDoesNotBlock, mismatchedGoalProblem, targetInPackage, placementInPackage, searchUntouched, drrVisible, valuesPreserved, newFieldsRoundTrip };
  })()`);

  ["oldStrategyPreserved", "legacyPreserved", "oldPaymentVisible",
    "guideRendererDisabled", "guideSourceRemoved",
    "metrikaGuideRendererRemoved", "metrikaGuideSourceRemoved",
    "metrikaLongHelpRemoved", "searchHint", "searchUntouched"].forEach((key) =>
    assert(result[key], `${key} failed: ${JSON.stringify(result)}`));
  assert(result.initialGuides === 0, `Decorative guidance blocks still render: ${result.initialGuides}`);
  assert(result.workflowSteps.join("|") === "1JTBD и группы|2Запуск", "Two-step RSYA workflow not rendered");
  const settingsShot = await screenshot("gate4-rsya-settings-v363.png", "#g4-rsya-launch-settings-v453");
  await evaluate('document.querySelector(".g4-rsya-reference-v363").open = true');
  const targetShot = await screenshot("gate4-rsya-target-v363.png", '[data-g4rsya-v289-field="targetCpaRub"]', 500);
  const volumeShot = await screenshot("gate4-rsya-volume-v363.png", ".g4-rsya-volume-v363");
  const preparationShot = await screenshot("gate4-rsya-preparation-v363.png", '[data-g4rsya-v453-panel-body="launch"] .g4-rsya-preparation-v289');
  console.log(JSON.stringify({ ...result, screenshots: [settingsShot, targetShot, volumeShot, preparationShot] }, null, 2));
} finally {
  try { page?.close(); } catch (_error) {}
  try { if (contextId) await browser?.call("Target.disposeBrowserContext", { browserContextId: contextId }); } catch (_error) {}
  try { browser?.close(); } catch (_error) {}
}
