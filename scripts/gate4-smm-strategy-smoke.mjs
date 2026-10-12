const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9339";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const expectedFormats = [
  ["Короткое вертикальное видео", "Охват, новая аудитория", "VK Клипы, RUTUBE Shorts, Instagram Reels, TikTok, YouTube Shorts"],
  ["Фото / кейс", "Доверие, результат", "ВКонтакте, Telegram, MAX, Instagram"],
  ["Карусель / подборка", "Объяснение, сохранения", "ВКонтакте, Instagram"],
  ["Экспертный текст / статья", "Глубина, поиск, доверие", "Дзен, Telegram, ВКонтакте, MAX"],
  ["Stories", "Удержание, контакт", "ВКонтакте, Telegram, Instagram"],
  ["Длинное видео", "Глубокое раскрытие темы", "VK Видео, RUTUBE, YouTube"],
];
const expectedTopics = [
  "Проблема → решение",
  "До / после",
  "Полезное объяснение",
  "Процесс / backstage",
  "Кейс / результат",
  "Тренд / реактивный контент",
];

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
      if (!message.id) return;
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

  close() {
    this.socket.close();
  }
}

async function evaluate(client, expression) {
  const response = await client.call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  }
  return response.result.value;
}

async function waitFor(client, expression, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(client, `Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

const browserVersion = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new CdpClient(browserVersion.webSocketDebuggerUrl);
await browser.ready;
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", {
  url: "about:blank",
  browserContextId,
});
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const target = targets.find((item) => item.id === targetId);
const page = new CdpClient(target.webSocketDebuggerUrl);
await page.ready;

try {
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
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(page, 'typeof bootstrapAppOnce === "function"');
  await evaluate(page, `(() => {
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: "gate4-smm-strategy-smoke",
      name: "Gate 4 SMM strategy smoke",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));
    location.reload();
    return true;
  })()`);
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, 'Boolean(state)');

  const result = await evaluate(page, `(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const now = new Date().toISOString();
    state.project.productRegistryV185 = [{ id: "category-smm", name: "SMM", legacyNames: [], createdAt: now }];
    state.project.catalogItemsV189 = [
      { id: "product-smm-a", name: "Товар A", continuum: "pure_product", categoryId: "category-smm", createdAt: now, source: { kind: "gate0", key: "gate0:product-smm-a" } },
      { id: "product-smm-b", name: "Товар B", continuum: "pure_product", categoryId: "category-smm", createdAt: now, source: { kind: "gate0", key: "gate0:product-smm-b" } }
    ];
    state.project._gate0ProductIdMigrationLog = [
      { id: GURU_GATE0_PRODUCT_SCOPE_MIGRATION_V194, at: now, status: "test" },
      { id: GURU_GATE0_OFFER_CTA_MIGRATION_V197, at: now, status: "test" }
    ];
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = "category-smm";
    ui.selectedProductId = "product-smm-a";
    state.gate4Production.launchProduct = "product-smm-a";
    delete state.gate4SmmStrategyV298;
    state.g1Collapsed = (state.g1Collapsed || []).filter((key) => key !== "g4-smm-strategy-company-v298");
    const channelsBefore = g4LaunchChannels();
    const channelKeysBefore = channelsBefore.map((channel) => channel.key);
    const smmChannelKeysBefore = channelsBefore.filter((channel) =>
      channel.channel === "SMM" || ["VK Ads", "Meta Ads", "Telegram Ads"].includes(channel.platform)
    ).map((channel) => channel.key);
    guruNavigateToGate("gate-4");
    renderGate();

    const strategy = state.gate4SmmStrategyV298;
    const selectorShell = document.querySelector('[data-guru-product-context="gate4-launch"]');
    const route = selectorShell?.parentElement;
    const aware = document.querySelector('[data-g4-map-stage-v290="aware"]');
    const smmTool = [...document.querySelectorAll('.g4-map-tool-v290')].find((node) =>
      node.querySelector(':scope > .g4-map-tool-title-v290 > strong')?.textContent.trim() === "SMM / посевы"
    );
    const toolTitle = smmTool?.querySelector(':scope > .g4-map-tool-title-v290');
    const block = smmTool?.querySelector(':scope > [data-g4-smm-strategy-v298]');
    const vkCard = [...(smmTool?.querySelectorAll(':scope > article') || [])].find((node) =>
      node.querySelector('[data-g4camp-toggle] .g1-card-title, [data-g4camp-toggle] .g4-campaign-platform strong')?.textContent.trim() === "VK Ads / Таргет"
    );
    const defaultResult = {
      build: window.GURU_BUILD_INFO?.version || "",
      scope: block?.dataset.g4SmmScopeV298 || "",
      blocksInAware: aware?.querySelectorAll('[data-g4-smm-strategy-v298]').length || 0,
      blocksTotal: document.querySelectorAll('[data-g4-smm-strategy-v298]').length,
      readonly: block?.dataset.g4SmmReadonlyV300 === "true",
      interactiveControls: block?.querySelectorAll('[data-g4-smm-part-v298] input, [data-g4-smm-part-v298] textarea, [data-g4-smm-part-v298] select, [data-g4-smm-part-v298] button').length || 0,
      addButtons: block?.querySelectorAll('[data-g4-smm-format-add-v298], [data-g4-smm-topic-add-v298]').length || 0,
      removeButtons: block?.querySelectorAll('[data-g4-smm-format-remove-v298], [data-g4-smm-topic-remove-v298]').length || 0,
      insideSmmTool: block?.parentElement === smmTool,
      immediatelyAfterSmmTitle: toolTitle?.nextElementSibling === block,
      immediatelyBeforeVkAds: block?.nextElementSibling === vkCard,
      insideAwareStage: block?.closest('[data-g4-map-stage-v290]') === aware,
      standaloneBlocks: route?.querySelectorAll(':scope > [data-g4-smm-strategy-v298]').length || 0,
      parts: [...(block?.querySelectorAll('[data-g4-smm-part-v298]') || [])].map((node) => node.dataset.g4SmmPartV298),
      formatHeaders: [...(block?.querySelectorAll('.g4-smm-table-v298 thead th') || [])].map((node) => node.textContent.trim()),
      displayedFormats: [...(block?.querySelectorAll('[data-g4-smm-format-row-v298]') || [])].map((row) => ({
        id: row.dataset.g4SmmFormatRowV298,
        stage: row.dataset.g4SmmFormatStageV303,
        task: row.children[0]?.textContent.trim() || "",
        format: row.children[1]?.textContent.trim() || "",
        topics: [...(row.children[2]?.querySelectorAll('[data-g4-smm-format-topic-v308]') || [])].map((node) => node.textContent.trim()),
        volume: row.children[3]?.textContent.trim() || "",
        platforms: row.children[4]?.textContent.trim() || "",
      })),
      semanticRouting: {
        aware: g4SmmFormatStageV303({ task: "Охват новой аудитории" }),
        appeal: g4SmmFormatStageV303({ task: "Объяснение и сохранения" }),
        ask: g4SmmFormatStageV303({ task: "Глубина, поиск и доверие" }),
        act: g4SmmFormatStageV303({ task: "Продажи и конверсия" }),
        advocate: g4SmmFormatStageV303({ task: "Удержание и лояльность" }),
      },
      volume: { ...strategy.volume },
      planningPeriod: { ...strategy.planningPeriod },
      periodOptions: [...(block?.querySelectorAll('[data-g4-smm-period-unit-v304] option') || [])].map((option) => [option.value, option.textContent.trim()]),
      total: block?.querySelector('[data-g4-smm-total-v298]')?.textContent.trim() || "",
      separateVolumeSections: block?.querySelectorAll('[data-g4-smm-part-v298="volume"]').length || 0,
      separateTopicSections: block?.querySelectorAll('[data-g4-smm-part-v298="topics"]').length || 0,
      formats: strategy.formats.map((row) => [row.format, row.task, row.platforms]),
      topics: strategy.topics.map((row) => row.value),
      thresholdSections: block?.querySelectorAll('[data-g4-smm-part-v298="thresholds"]').length || 0,
      thresholdsTitleVisible: block?.textContent.includes("Пороги оценки результата") || false,
      obsoletePlatformsStored: Object.prototype.hasOwnProperty.call(strategy, "platforms"),
      principle: block?.querySelector('.g4-smm-principle-v298')?.textContent.trim() || "",
      productScopedKeys: Object.keys(strategy).filter((key) => /product|byProduct/i.test(key)),
      channelKeysBefore,
      smmChannelKeysBefore,
      renderedChannelsBefore: new Set([...document.querySelectorAll('[data-g4camp-toggle]')].map((node) => node.dataset.g4campToggle)).size,
    };

    const collapseKey = "g4-smm-strategy-company-v298";
    block.querySelector(':scope > [data-g1-collapse]').click();
    const closedOnClick = block.classList.contains("is-collapsed") &&
      getComputedStyle(block.querySelector(':scope > .g1-card-collapse-body')).display === "none" &&
      g1CollapsedSet().has(collapseKey);
    renderGate();
    const restoredBlock = document.querySelector('[data-g4-smm-strategy-v298]');
    const closedAfterRender = restoredBlock.classList.contains("is-collapsed") &&
      getComputedStyle(restoredBlock.querySelector(':scope > .g1-card-collapse-body')).display === "none";
    restoredBlock.querySelector(':scope > [data-g1-collapse]').click();
    const openAgain = !restoredBlock.classList.contains("is-collapsed") &&
      getComputedStyle(restoredBlock.querySelector(':scope > .g1-card-collapse-body')).display !== "none" &&
      !g1CollapsedSet().has(collapseKey);
    const toggle = { closedOnClick, closedAfterRender, openAgain };

    let periodCount = document.querySelector('[data-g4-smm-period-count-v304]');
    periodCount.value = "2";
    periodCount.dispatchEvent(new Event("change", { bubbles: true }));
    let periodUnit = document.querySelector('[data-g4-smm-period-unit-v304]');
    periodUnit.value = "month";
    periodUnit.dispatchEvent(new Event("change", { bubbles: true }));
    const customProjection = {
      planningPeriod: { ...state.gate4SmmStrategyV298.planningPeriod },
      total: document.querySelector('[data-g4-smm-total-v298]')?.textContent.trim() || "",
      volumes: [...document.querySelectorAll('[data-g4-smm-format-volume-v305]')].map((cell) => cell.textContent.trim()),
    };
    const strategyBeforeReadonlyView = JSON.stringify(state.gate4SmmStrategyV298);

    ui.selectedProductId = "product-smm-b";
    state.gate4Production.launchProduct = "product-smm-b";
    renderGate();
    const afterSwitch = {
      blocksTotal: document.querySelectorAll('[data-g4-smm-strategy-v298]').length,
      readonly: document.querySelector('[data-g4-smm-strategy-v298]')?.dataset.g4SmmReadonlyV300 === "true",
      interactiveControls: document.querySelector('[data-g4-smm-strategy-v298]')?.querySelectorAll('[data-g4-smm-part-v298] input, [data-g4-smm-part-v298] textarea, [data-g4-smm-part-v298] select, [data-g4-smm-part-v298] button').length || 0,
      selectedProductId: guruV194Ui(state).selectedProductId,
      total: document.querySelector('[data-g4-smm-total-v298]')?.textContent.trim() || "",
      planningPeriod: { ...state.gate4SmmStrategyV298.planningPeriod },
      firstFormat: state.gate4SmmStrategyV298.formats[0]?.format || "",
      firstTopic: state.gate4SmmStrategyV298.topics[0]?.value || "",
      obsoletePlatformsStored: Object.prototype.hasOwnProperty.call(state.gate4SmmStrategyV298, "platforms"),
      formats: state.gate4SmmStrategyV298.formats.length,
      topics: state.gate4SmmStrategyV298.topics.length,
      channelKeysAfter: g4LaunchChannels().map((channel) => channel.key),
      smmChannelKeysAfter: g4LaunchChannels().filter((channel) =>
        channel.channel === "SMM" || ["VK Ads", "Meta Ads", "Telegram Ads"].includes(channel.platform)
      ).map((channel) => channel.key),
      renderedChannelsAfter: new Set([...document.querySelectorAll('[data-g4camp-toggle]')].map((node) => node.dataset.g4campToggle)).size,
      rootStorage: Boolean(state.gate4SmmStrategyV298),
      productScopedKeys: Object.keys(state.gate4SmmStrategyV298).filter((key) => /product|byProduct/i.test(key)),
    };
    const strategyAfterReadonlyView = JSON.stringify(state.gate4SmmStrategyV298);
    const restored = migrateWorkspace(JSON.parse(JSON.stringify(state)), activeProjectId);
    return {
      defaultResult,
      toggle,
      customProjection,
      afterSwitch,
      readonlyViewPreservedData: strategyBeforeReadonlyView === strategyAfterReadonlyView,
      serializedAtRoot: Boolean(restored.gate4SmmStrategyV298),
      serializedFirstFormat: restored.gate4SmmStrategyV298?.formats?.[0]?.format || "",
      errors: window.__guruConsoleLog?.filter((entry) => entry.level === "error") || []
    };
  })()`);

  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  result.mobile = await evaluate(page, `(() => {
    renderGate();
    const block = document.querySelector('[data-g4-smm-strategy-v298]');
    const controls = block?.querySelector('.g4-smm-period-controls-v304');
    return {
      visible: Boolean(block?.getClientRects().length),
      overflow: block ? block.scrollWidth - block.clientWidth : 999,
      controlColumns: controls ? getComputedStyle(controls).gridTemplateColumns : "",
      formatRows: block?.querySelectorAll('[data-g4-smm-format-row-v298]').length || 0,
    };
  })()`);

  const d = result.defaultResult;
  const c = result.customProjection;
  const a = result.afterSwitch;
  const expectedParts = ["formats", "principle"];
  const exactDefaults =
    JSON.stringify(d.formats) === JSON.stringify(expectedFormats) &&
    JSON.stringify(d.topics) === JSON.stringify(expectedTopics);
  const channelsPreserved =
    JSON.stringify(d.channelKeysBefore) === JSON.stringify(a.channelKeysAfter) &&
    JSON.stringify(d.smmChannelKeysBefore) === JSON.stringify(a.smmChannelKeysAfter) &&
    d.smmChannelKeysBefore.length === 7 &&
    d.renderedChannelsBefore === a.renderedChannelsAfter;
  if (
    !d.build ||
    d.scope !== "company-project" ||
    d.blocksInAware !== 1 ||
    d.blocksTotal !== 1 ||
    !d.readonly || d.interactiveControls !== 2 || d.addButtons !== 0 || d.removeButtons !== 0 ||
    !d.insideSmmTool || !d.immediatelyAfterSmmTitle || !d.immediatelyBeforeVkAds || !d.insideAwareStage || d.standaloneBlocks !== 0 ||
    JSON.stringify(d.parts) !== JSON.stringify(expectedParts) ||
    JSON.stringify(d.formatHeaders) !== JSON.stringify(["Основная задача", "Формат", "Темы", "Объём контента", "Площадки"]) ||
    JSON.stringify(d.displayedFormats.map((row) => row.format)) !== JSON.stringify([
      "Короткое вертикальное видео",
      "Карусель / подборка",
      "Фото / кейс",
      "Экспертный текст / статья",
      "Длинное видео",
      "Stories",
    ]) ||
    JSON.stringify(d.displayedFormats.map((row) => row.stage)) !== JSON.stringify([
      "aware", "appeal", "ask", "ask", "ask", "advocate",
    ]) ||
    JSON.stringify(d.displayedFormats.map((row) => row.topics)) !== JSON.stringify([
      ["Тренд / реактивный контент", "Полезное объяснение", "Процесс / backstage", "Кейс / результат"],
      ["Полезное объяснение", "Проблема → решение", "Кейс / результат"],
      ["Кейс / результат", "До / после"],
      ["Проблема → решение", "Полезное объяснение", "Кейс / результат"],
      ["Процесс / backstage"],
      ["Процесс / backstage"],
    ]) ||
    new Set(d.displayedFormats.map((row) => row.id)).size !== 6 ||
    JSON.stringify(d.semanticRouting) !== JSON.stringify({ aware: "aware", appeal: "appeal", ask: "ask", act: "act", advocate: "advocate" }) ||
    JSON.stringify(d.volume) !== JSON.stringify({ shortVideos: 3, carousels: 1, cases: 1, storiesMin: 5, storiesMax: 7 }) ||
    JSON.stringify(d.planningPeriod) !== JSON.stringify({ count: 1, unit: "week" }) ||
    JSON.stringify(d.periodOptions) !== JSON.stringify([["week", "Недели"], ["month", "Месяцы"], ["quarter", "Кварталы"], ["year", "Годы"]]) ||
    d.total !== "Итого за 1 неделю: 4-5 основных публикаций" ||
    d.separateVolumeSections !== 0 || d.separateTopicSections !== 0 ||
    JSON.stringify(d.displayedFormats.map((row) => row.volume)) !== JSON.stringify([
      "3 за 1 неделюНорма: 3 в неделю",
      "1 за 1 неделюНорма: 1 в неделю",
      "1 за 1 неделюНорма: 1 в неделю",
      "Не задан отдельноФормат сохранён; отдельной нормы в стратегии нет",
      "Не задан отдельноФормат сохранён; отдельной нормы в стратегии нет",
      "5-7 активных дней за 1 неделюНорма: 5-7 активных дней в неделю",
    ]) ||
    JSON.stringify(c.planningPeriod) !== JSON.stringify({ count: 2, unit: "month" }) ||
    c.total !== "Итого за 2 месяца: ≈35-43 основных публикаций" ||
    JSON.stringify(c.volumes) !== JSON.stringify([
      "≈26 за 2 месяцаНорма: 3 в неделю",
      "≈9 за 2 месяцаНорма: 1 в неделю",
      "≈9 за 2 месяцаНорма: 1 в неделю",
      "Не задан отдельноФормат сохранён; отдельной нормы в стратегии нет",
      "Не задан отдельноФормат сохранён; отдельной нормы в стратегии нет",
      "≈43-61 активных дней за 2 месяцаНорма: 5-7 активных дней в неделю",
    ]) ||
    !exactDefaults ||
    d.thresholdSections !== 0 || d.thresholdsTitleVisible ||
    d.obsoletePlatformsStored ||
    d.principle !== "Одно вертикальное видео = одна единица контента, даже если опубликовано на нескольких площадках." ||
    d.productScopedKeys.length ||
    a.blocksTotal !== 1 ||
    !a.readonly || a.interactiveControls !== 2 ||
    a.selectedProductId !== "product-smm-b" ||
    a.total !== "Итого за 2 месяца: ≈35-43 основных публикаций" ||
    JSON.stringify(a.planningPeriod) !== JSON.stringify({ count: 2, unit: "month" }) ||
    a.firstFormat !== "Короткое вертикальное видео" ||
    a.firstTopic !== "Проблема → решение" ||
    a.obsoletePlatformsStored ||
    a.formats !== 6 ||
    a.topics !== 6 ||
    !a.rootStorage ||
    a.productScopedKeys.length ||
    !channelsPreserved ||
    !result.readonlyViewPreservedData ||
    !result.toggle.closedOnClick || !result.toggle.closedAfterRender || !result.toggle.openAgain ||
    !result.serializedAtRoot ||
    result.serializedFirstFormat !== "Короткое вертикальное видео" ||
    !result.mobile.visible || result.mobile.overflow > 1 ||
    result.mobile.controlColumns.split(" ").length !== 1 || result.mobile.formatRows !== 6 ||
    result.errors.length
  ) {
    throw new Error(`Gate 4 SMM strategy smoke failed: ${JSON.stringify({ result, exactDefaults, channelsPreserved })}`);
  }

  console.log(JSON.stringify({ ...result, exactDefaults, channelsPreserved }, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
