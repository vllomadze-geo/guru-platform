import { readFile, writeFile } from "node:fs/promises";

const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:4173/";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9395";
const productId = "catalog-item-1786792591872-51f503";
const smokeId = "gate4-search-launch-summary-period-smoke";
const fullPath = process.env.GURU_PROJECT_EXPORT || "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const gate4Path = process.env.GURU_GATE4_EXPORT || "/Users/vl/Downloads/gate-4.json";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const fullExport = JSON.parse(await readFile(fullPath, "utf8"));
const gate4Export = JSON.parse(await readFile(gate4Path, "utf8"));
assert(fullExport.project?.id === gate4Export.project?.id, "Project exports differ");
const fixture = structuredClone(fullExport.workspace);
Object.entries(gate4Export.content).forEach(([key, value]) => {
  fixture[key] = structuredClone(value);
});
const gateIndex = fixture.gates.findIndex((gate) => gate.id === "gate-4");
assert(gateIndex >= 0, "Gate 4 missing");
fixture.gates[gateIndex] = structuredClone(gate4Export.structure);
fixture.project.id = smokeId;
fixture.project.name = "Gate 4 summary period smoke";

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
await browser.ready;
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const target = targets.find((item) => item.id === targetId);
assert(target?.webSocketDebuggerUrl, "Isolated browser target missing");
const page = new Cdp(target.webSocketDebuggerUrl);
await page.ready;

async function evaluate(expression) {
  const result = await page.call("Runtime.evaluate", {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression) {
  for (let index = 0; index < 200; index += 1) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await pause(100);
  }
  throw new Error(`Timed out: ${expression}`);
}

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false,
  });
  await page.call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes("/api/")
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmoke: true }), {
          status: 200, headers: { "Content-Type": "application/json" }
        })) : nativeFetch(input, init);
  }` });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && Boolean(window.GURU_SEED)');
  await evaluate(`(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(smokeId)};
    workspace.project.name = "Gate 4 summary period smoke";
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: workspace.project.id, name: workspace.project.name, lifecycleStatus: "active",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }]));
    localStorage.setItem("guru-platform-workspace-v02-" + workspace.project.id, JSON.stringify(workspace));
    location.reload();
  })()`);
  await waitFor('document.querySelector("[data-open-project]")');
  await evaluate('document.querySelector("[data-open-project]").click(); true');
  await waitFor('Boolean(state) && typeof g4sbV419ControlModel === "function"');

  const emptyFact = await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    state = ${JSON.stringify(fixture)};
    window.__g4SummaryFixture = structuredClone(state);
    activeProjectId = ${JSON.stringify(smokeId)};
    const product = guruV194Product(${JSON.stringify(productId)}, state);
    if (!product) throw new Error("Smoke product missing");
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = product.categoryId;
    ui.selectedProductId = product.id;
    ensureGate4Production().launchProduct = product.id;
    const channel = g4LaunchChannels().find(g4IsYandexSearchChannel);
    g4EnsureLaunchUiState().rows = {
      [g4CampaignStateKey(product.id, channel.key)]: true,
    };
    guruNavigateToGate("gate-4");
    const d = ensureGate4SearchBuild(product.id);
    d.settings = { ...d.settings, strategy: "max_conversions",
      dateFrom: "01.10.2026", dateTo: "30.10.2026" };
    const jtbd = g4sbV166DirectionJtbds(product.id)[0];
    d.clusters = [{ id: "summary-period-group-1", name: jtbd.text,
      itemId: jtbd.itemId, segmentIndex: G4_V166_JTBD_SCOPE,
      mainJtbdIndex: jtbd.index, jtbdId: jtbd.key }];
    d.groupRows = [{
      groupId: "summary-period-group-1", clusterId: "summary-period-group-1",
      itemId: jtbd.itemId, segmentIndex: G4_V166_JTBD_SCOPE,
      mainJtbdIndex: jtbd.index, jtbdId: jtbd.key,
      col0: jtbd.text, isFixed: true, minus: "бесплатно",
      demandRows: [
        { kw: "первая фраза", vol: "1000", forecastClicks: "100", forecastBudget: "3000" },
        { kw: "вторая фраза", vol: "500", forecastClicks: "50", forecastBudget: "1500" },
      ],
      callouts: ["Доставка", "Гарантия", "На заказ", "Ручная работа"],
    }];
    d.adsRows = [[
      { ad0: "Первое объявление", ad2: "Первый текст" },
      { ad0: "Второе объявление", ad2: "Второй текст" },
    ]];
    d.jtbdDraftsV388 = {};
    d.clusterDraft.open = false;
    d.openJtbdIdsV391 = [];
    d.activeJtbdId = "";
    state.gate5 = gate5BlankState();
    renderGate();
    const node = document.querySelector('[data-g4sb-summary-product="${productId}"]');
    if (!node) throw new Error("Smoke launch summary missing");
    const tableRows = [...node.querySelectorAll('.g4-v419-period-result tbody tr')]
      .map((row) => [...row.children].map((cell) => cell.textContent.trim()));
    const metrics = node.querySelector('[data-g4sb-direct-metrics]');
    return {
      directGroups: ensureGate4SearchBuild(product.id).groupRows.length,
      directBudget: g4sbV405LaunchSummaryData(product.id, ensureGate4SearchBuild(product.id), 0).budget,
      summaryBudgets: [...document.querySelectorAll('[data-g4sb-launch-summary]')]
        .map((item) => ({ product: item.dataset.g4sbSummaryProduct,
          budget: item.dataset.g4sbSummaryBudget })),
      days: Number(metrics.dataset.g4sbPeriodDays),
      start: metrics.dataset.g4sbPeriodStart,
      end: metrics.dataset.g4sbPeriodEnd,
      baseLeads: Number(metrics.dataset.g4sbPeriodLeadsBase),
      existingCards: node.querySelectorAll(':scope > .g4-v405-launch-summary-grid > div').length,
      existingLabels: [...node.querySelectorAll(':scope > .g4-v405-launch-summary-grid > div > span:first-child')]
        .map((item) => item.textContent.trim()),
      metrics: metrics.textContent.trim().replace(/\\s+/g, ' '),
      scenarios: Object.fromEntries([...metrics.querySelectorAll('[data-g4sb-direct-scenario]')]
        .map((item) => [item.dataset.g4sbDirectScenario,
          item.textContent.trim().replace(/\\s+/g, ' ')])),
      oldDuplicateElements: node.querySelectorAll(
        '[data-g4sb-period-line], [data-g4sb-period-details], [data-g4sb-period-leads]'
      ).length,
      reference: node.querySelector('.g4-v419-control-reference')?.textContent.trim(),
      timelineDays: [...node.querySelectorAll('[data-g4sb-control-day]')]
        .map((item) => Number(item.dataset.g4sbControlDay)),
      checkpoint7: node.querySelector('[data-g4sb-checkpoint="7"]')
        .textContent.trim().replace(/\\s+/g, ' '),
      checkpoint14: node.querySelector('[data-g4sb-checkpoint="14"]')
        .textContent.trim().replace(/\\s+/g, ' '),
      riskAction: node.querySelector('[data-g4sb-risk-action]')
        .textContent.trim().replace(/\\s+/g, ' '),
      decision: node.querySelector('.g4-v419-decision').textContent.trim().replace(/\\s+/g, ' '),
      recommendations: [...node.querySelectorAll('.g4-v405-launch-recommendations li')]
        .map((item) => item.textContent.trim()),
      tableRows,
    };
  })()`);
  const expectedBase = (150 * 0.05 / 4.33) * 30 / 7;
  assert(emptyFact.days === 30 && emptyFact.start === "2026-10-01" &&
    emptyFact.end === "2026-10-30" && Math.abs(emptyFact.baseLeads - expectedBase) < 0.000001,
  `Explicit period or lead formula failed: ${JSON.stringify(emptyFact)}`);
  assert(emptyFact.existingCards === 4 && [
    "Бюджет в зоне риска, суммарно", "Готовность объявлений",
    "Готовность уточнений", "Дубли фраз продукта",
  ].every((label) => emptyFact.existingLabels.includes(label)) &&
    !emptyFact.existingLabels.includes("Итоговый бюджет") &&
    !emptyFact.existingLabels.includes("Заявки/неделю по сценариям"),
  `Existing summary cards changed: ${JSON.stringify(emptyFact.existingLabels)}`);
  assert(emptyFact.metrics.includes("01.10.2026 — 30.10.2026 (30 дней)") &&
    emptyFact.metrics.includes("4 500 ₽ за период") &&
    emptyFact.metrics.includes("150 ₽/день · 1 050 ₽/неделю") &&
    emptyFact.scenarios.cautious.includes("1 в неделю / 4,5 за период (30 дней)") &&
    emptyFact.scenarios.cautious.includes("примерно 1 заявка каждые 6,7 дня") &&
    emptyFact.scenarios.base.includes("1,7 в неделю / 7,4 за период (30 дней)") &&
    emptyFact.scenarios.base.includes("примерно 1 заявка каждые 4 дня") &&
    emptyFact.scenarios.optimistic.includes("2,8 в неделю / 11,9 за период (30 дней)") &&
    emptyFact.scenarios.optimistic.includes("примерно 1 заявка каждые 2,5 дня") &&
    emptyFact.metrics.includes("Цель 10/неделю: не достигается при базовом сценарии") &&
    emptyFact.metrics.includes("Прогноз, не гарантированное количество заявок") &&
    emptyFact.oldDuplicateElements === 0 &&
    emptyFact.reference.includes("≥10 конверсий в неделю") &&
    emptyFact.reference.includes("около 2 недель") &&
    JSON.stringify(emptyFact.timelineDays) === JSON.stringify([0, 3, 7, 14, 21, 30]) &&
    emptyFact.checkpoint7.includes("Клики: факт — / ожидается ≈35") &&
    emptyFact.checkpoint7.includes("Расход: факт — / ожидается ≈1 050 ₽") &&
    emptyFact.checkpoint7.includes("Конверсии/заявки: факт — / ожидается ≈1,7") &&
    emptyFact.checkpoint14.includes("Расход: факт — / ожидается ≈2 100 ₽") &&
    emptyFact.checkpoint14.includes("Заявки: факт — / ожидается ≈3,5") &&
    emptyFact.riskAction.includes("Если CPC фраз со статусом «Переплата»") &&
    emptyFact.decision.includes("Данные Gate 5 за этот период ещё не внесены - корректировки вносить рано") &&
    !emptyFact.decision.includes("нет фактического периода Gate 5") &&
    emptyFact.tableRows.every((row) => row[2] === "—" && row[3] === "—") &&
    emptyFact.recommendations.length > 0,
  `Empty-fact summary extension failed: ${JSON.stringify(emptyFact)}`);

  const lowFact = await evaluate(`(() => {
    const d = ensureGate4SearchBuild(${JSON.stringify(productId)});
    state.gate5 = gate5BlankState();
    state.gate5.campaignRegistry.push({
      id: "summary-period-campaign", cabinetId: "777000111", name: "Поиск · smoke",
      product_id: ${JSON.stringify(productId)}, platform: "Яндекс", type: "Поиск",
      launchDate: "2026-10-01", stopDate: "2026-10-30",
    });
    state.gate5.periodSnapshots.push({
      id: "summary-period-fact", campaignId: "summary-period-campaign",
      periodStart: "2026-10-01", periodEnd: "2026-10-14", reportType: "perf",
      spend: 500, impressions: 1000, clicks: 20, conversions: 1, leads: 1,
      createdAt: "2026-10-15T10:00:00.000Z",
    });
    renderGate();
    const node = document.querySelector('[data-g4sb-summary-product="${productId}"]');
    return node.querySelector('.g4-v419-decision').textContent.trim().replace(/\\s+/g, ' ');
  })()`);
  assert(lowFact.includes("Данные Gate 5 за этот период ещё не внесены - корректировки вносить рано") &&
    !lowFact.includes("кликов 20 из 30") && !lowFact.includes("конверсий 1 из 10"),
  `Calendar time incorrectly unlocked a recommendation: ${lowFact}`);

  const withFact = await evaluate(`(() => {
    const snapshot = state.gate5.periodSnapshots[0];
    Object.assign(snapshot, { spend: 3000, impressions: 10000,
      clicks: 100, conversions: 10, leads: 10 });
    const d = ensureGate4SearchBuild(${JSON.stringify(productId)});
    renderGate();
    const node = document.querySelector('[data-g4sb-summary-product="${productId}"]');
    return {
      basis: node.querySelector('.g4-v419-data-basis').textContent.trim().replace(/\\s+/g, ' '),
      decision: node.querySelector('.g4-v419-decision').textContent.trim().replace(/\\s+/g, ' '),
      rows: [...node.querySelectorAll('.g4-v419-period-result tbody tr')]
        .map((row) => [...row.children].map((cell) => cell.textContent.trim().replace(/\\s+/g, ' '))),
      metrics: node.querySelector('[data-g4sb-direct-metrics]').textContent.trim().replace(/\\s+/g, ' '),
      cardLabels: [...node.querySelectorAll('.g4-v405-launch-summary-grid > div > span:first-child')]
        .map((item) => item.textContent.trim()),
      oldRecommendations: [...node.querySelectorAll('.g4-v405-launch-recommendations li')]
        .map((item) => item.textContent.trim()),
    };
  })()`);
  assert(withFact.basis.includes("Факт за 14 дней") &&
    withFact.basis.includes("Максимум конверсий") &&
    !withFact.decision.includes("Недостаточно данных для корректировки") &&
    withFact.decision.includes("Проверить дневной бюджет") &&
    withFact.decision.includes("фактический CTR ниже прогноза") &&
    withFact.rows.find((row) => row[0] === "Расход")?.[1] === "2 100 ₽" &&
    withFact.rows.find((row) => row[0] === "Расход")?.[2] === "3 000 ₽" &&
    withFact.metrics.includes("4 500 ₽ за период") &&
    withFact.metrics.includes("Базовый") && withFact.cardLabels.length === 4 &&
    withFact.oldRecommendations.length > 0,
  `Fact-driven decision or existing content failed: ${JSON.stringify(withFact)}`);

  const fallback = await evaluate(`(() => {
    const d = ensureGate4SearchBuild(${JSON.stringify(productId)});
    d.settings.dateFrom = "";
    d.settings.dateTo = "";
    state.gate5 = gate5BlankState();
    renderGate();
    const node = document.querySelector('[data-g4sb-summary-product="${productId}"]');
    const metrics = node.querySelector('[data-g4sb-direct-metrics]');
    return {
      days: Number(metrics.dataset.g4sbPeriodDays),
      start: metrics.dataset.g4sbPeriodStart,
      end: metrics.dataset.g4sbPeriodEnd,
      metrics: metrics.textContent.trim().replace(/\\s+/g, ' '),
    };
  })()`);
  assert(fallback.days === 30 && /^\d{4}-\d{2}-\d{2}$/.test(fallback.start) &&
    /^\d{4}-\d{2}-\d{2}$/.test(fallback.end) &&
    fallback.metrics.includes("30-дневная база текущего бюджета"),
  `Budget-period fallback failed: ${JSON.stringify(fallback)}`);

  const realThreeGroups = await evaluate(`(() => {
    state = structuredClone(window.__g4SummaryFixture);
    activeProjectId = ${JSON.stringify(smokeId)};
    const product = guruV194Product(${JSON.stringify(productId)}, state);
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = product.categoryId;
    ui.selectedProductId = product.id;
    ensureGate4Production().launchProduct = product.id;
    const channel = g4LaunchChannels().find(g4IsYandexSearchChannel);
    g4EnsureLaunchUiState().rows = {
      [g4CampaignStateKey(product.id, channel.key)]: true,
    };
    const d = ensureGate4SearchBuild(product.id);
    const draft = structuredClone(
      d.jtbdDraftsV388['primary:' + product.id] || d.clusterDraft
    );
    const savedRows = structuredClone(d.groupRows);
    const savedAds = structuredClone(d.adsRows);
    const groupId = 'summary-real-primary';
    const primaryRow = {
      groupId, clusterId: groupId,
      itemId: draft.itemId || product.id,
      segmentIndex: draft.segmentIndex || G4_V166_JTBD_SCOPE,
      mainJtbdIndex: draft.mainJtbdIndex ?? 0,
      jtbdId: draft.jtbdId || ('primary:' + product.id),
      col0: draft.name,
      minus: draft.minus,
      col2: draft.col2,
      col3: draft.col3,
      col4: draft.col4,
      budgetType: draft.budgetType,
      desiredLeads: draft.desiredLeads,
      desiredCpaScenario: draft.desiredCpaScenario,
      demandRows: structuredClone(draft.keywordRows || []),
      callouts: structuredClone(draft.callouts || []),
      isFixed: true,
    };
    const savedPrimary = savedRows.some((row) =>
      g4sbV166GroupJtbdKey(product.id, row) === ('primary:' + product.id)
    );
    d.groupRows = (savedPrimary ? savedRows : [primaryRow, ...savedRows.map((row) => ({
      ...row,
      demandRows: (row.demandRows || []).filter((phrase) =>
        g4sbV128PhraseKey(phrase.kw) !== g4sbV128PhraseKey('купить козу Москва')
      ),
    }))]).map((row) => ({ ...row, isFixed: true }));
    d.adsRows = savedPrimary ? savedAds : [
      structuredClone(draft.ads || []),
      ...savedAds.map((rows) => structuredClone(rows || [])),
    ];
    d.adsByGroupIdV420 = Object.fromEntries(d.groupRows.map((row, index) => [
      String(row.groupId || row.clusterId), structuredClone(d.adsRows[index] || []),
    ]));
    // The fixed groups are deliberately stored in reverse order. Launch packages
    // must still follow JTBD priority and put the primary JTBD first.
    d.groupRows.reverse();
    d.groupRows.forEach((row, rowIndex) => {
      const isPrimary = g4sbV166GroupJtbdKey(product.id, row) === ('primary:' + product.id);
      row.sitelinkRows = isPrimary ? [
        { sl0: 'Каталог Коз', sl1: 'Все варианты авторских текстильных Коз', sl2: 'https://k-apple.ru/kozy' },
        { sl0: 'Ручная работа', sl1: 'Как создаются интерьерные Козы вручную', sl2: 'https://k-apple.ru/handmade' },
        { sl0: 'Доставка', sl1: 'Условия доставки и получения заказа', sl2: 'https://k-apple.ru/delivery' },
        { sl0: 'О мастерской', sl1: 'История Коричного яблока и мастера', sl2: 'https://k-apple.ru/about' },
      ] : [{
        sl0: 'Коза в подарок',
        sl1: 'Подбор авторской Козы для подарка',
        sl2: 'https://k-apple.ru/gifts-' + (rowIndex + 1),
      }];
    });
    d.clusters = d.groupRows.map((row) => ({
      id: row.clusterId, name: row.col0, itemId: row.itemId,
      segmentIndex: row.segmentIndex, mainJtbdIndex: row.mainJtbdIndex,
      jtbdId: row.jtbdId,
    }));
    d.settings = { ...d.settings, dateFrom: '', dateTo: '' };
    d.jtbdDraftsV388 = {};
    d.clusterDraft = { ...d.clusterDraft, open: false, editingClusterId: '' };
    d.openJtbdIdsV391 = [];
    d.activeJtbdId = '';
    d.searchStepOpen = { ...(d.searchStepOpen || {}), clusters: true, launch: true };
    state.gate5 = gate5BlankState();
    guruNavigateToGate('gate-4');
    renderGate();
    const launchStep = document.querySelector('[data-g4sb-step="launch"]');
    if (launchStep) launchStep.open = true;
    const node = document.querySelector('[data-g4sb-summary-product="${productId}"]');
    const metrics = node.querySelector('[data-g4sb-direct-metrics]');
    const summary = g4sbV405LaunchSummaryData(product.id, d, 0);
    const period = g4sbV419Period(product.id, d);
    const model = g4sbV419ControlModel(product.id, d, summary, period);
    const expected = {
      budget: g4sbV419Money(summary.budget),
      daily: g4sbV419Money(summary.budget / period.days),
      weeklyBudget: g4sbV419Money(summary.budget / period.days * 7),
      scenarios: Object.fromEntries(['cautious', 'base', 'optimistic'].map((key) => [
        key, {
          weekly: g4sbV419Format(summary.weekly[key], 1),
          period: g4sbV419Format(model.periodLeads[key], 1),
          interval: g4sbV419Interval(summary.weekly[key]),
        },
      ])),
    };
    const scenarios = Object.fromEntries([...metrics.querySelectorAll(
      '[data-g4sb-direct-scenario]'
    )].map((item) => [item.dataset.g4sbDirectScenario,
      item.textContent.trim().replace(/\\s+/g, ' ')]));
    const result = {
      productName: product.name,
      groups: summary.groups,
      days: period.days,
      start: period.start.iso,
      end: period.end.iso,
      budget: summary.budget,
      weekly: summary.weekly,
      periodLeads: model.periodLeads,
      riskCount: summary.riskCount,
      riskBudget: summary.riskBudget,
      riskShare: summary.riskShare,
      expected,
      metrics: metrics.textContent.trim().replace(/\\s+/g, ' '),
      scenarios,
      compactBlocks: node.querySelectorAll('[data-g4sb-direct-metrics]').length,
      cards: node.querySelectorAll(':scope > .g4-v405-launch-summary-grid > div').length,
      cardLabels: [...node.querySelectorAll(
        ':scope > .g4-v405-launch-summary-grid > div > span:first-child'
      )].map((item) => item.textContent.trim()),
      oldDuplicateElements: node.querySelectorAll(
        '[data-g4sb-period-line], [data-g4sb-period-details], [data-g4sb-period-leads]'
      ).length,
      timelineDays: [...node.querySelectorAll('[data-g4sb-control-day]')]
        .map((item) => Number(item.dataset.g4sbControlDay)),
      checkpoint7: node.querySelector('[data-g4sb-checkpoint="7"]')
        .textContent.trim().replace(/\\s+/g, ' '),
      checkpoint14: node.querySelector('[data-g4sb-checkpoint="14"]')
        .textContent.trim().replace(/\\s+/g, ' '),
      riskAction: node.querySelector('[data-g4sb-risk-action]')
        .textContent.trim().replace(/\\s+/g, ' '),
      decision: node.querySelector('.g4-v419-decision')
        .textContent.trim().replace(/\\s+/g, ' '),
      controlStack: (() => {
        const grid = node.querySelector('.g4-v419-control-grid');
        const gridRect = grid.getBoundingClientRect();
        const cards = [...grid.children].map((item) => item.getBoundingClientRect());
        return {
          count: cards.length,
          fullWidth: cards.every((card) => Math.abs(card.width - gridRect.width) < 1),
          vertical: cards.every((card, index) =>
            index === 0 || card.top > cards[index - 1].bottom),
        };
      })(),
      topLevelSteps: [...document.querySelectorAll('[data-g4sb-step]')]
        .map((item) => ({ key: item.dataset.g4sbStep,
          title: item.querySelector('.g1-card-title')?.textContent.trim() || '' })),
      launchCopyUi: (() => {
        const launch = document.querySelector(
          '[data-g4sb-step="launch"][data-g4sb-product="${productId}"]'
        )?.closest('article.g1-card');
        const buttons = [...(launch?.querySelectorAll('button') || [])]
          .filter((button) => [...button.attributes]
            .some((attribute) => attribute.name.startsWith('data-g4sb-copy-')));
        const supported = [
          '[data-g4sb-copy-campaign-name]',
          '[data-g4sb-copy-target-cpa]',
          '[data-g4sb-copy-url-field]',
          '[data-g4sb-copy-package]',
        ].join(',');
        return {
          count: buttons.length,
          unexpected: buttons.filter((button) => !button.matches(supported)).length,
          iconOnly: buttons.every((button) =>
            button.classList.contains('g4-v446-copy-icon') &&
            Boolean(button.querySelector(':scope > svg')) &&
            button.textContent.trim() === ''),
          accessible: buttons.every((button) =>
            button.getAttribute('aria-label')?.startsWith('Копировать') &&
            button.title.startsWith('Копировать')),
          beforeField: buttons.every((button) => {
            const field = button.parentElement?.querySelector(
              ':scope > input[readonly], :scope > textarea[readonly]'
            );
            return Boolean(field && button.nextElementSibling === field &&
              button.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING);
          }),
          textualCopyButtons: [...(launch?.querySelectorAll('button') || [])]
            .filter((button) => /Копировать/i.test(button.textContent)).length,
          kinds: Object.fromEntries([
            ['campaign', '[data-g4sb-copy-campaign-name]'],
            ['targetCpa', '[data-g4sb-copy-target-cpa]'],
            ['url', '[data-g4sb-copy-url-field]'],
            ['package', '[data-g4sb-copy-package]'],
          ].map(([key, selector]) => [key, launch?.querySelectorAll(selector).length || 0])),
        };
      })(),
      campaignName: (() => {
        const campaign = document.querySelector('.g4-v406-launch > .g4-v406-launch-level');
        const firstItem = campaign?.querySelector('.g4-v406-launch-item:nth-child(1)');
        const control = firstItem?.querySelector('[data-g4sb-campaign-name]');
        const field = control?.querySelector('[data-g4sb-campaign-name-value]');
        const selectedProductId = String(guruV194Ui(state)?.selectedProductId || '');
        const selectedProduct = guruV194Product(selectedProductId, state);
        const channelLabel = g4LaunchChannelLabel(channel);
        return {
          value: field?.value || '',
          readonly: Boolean(field?.readOnly),
          copyButtons: control?.querySelectorAll('[data-g4sb-copy-campaign-name]').length || 0,
          insideFirstItem: Boolean(control && firstItem?.contains(control)),
          selectedProductId,
          selectedProductName: selectedProduct?.name || '',
          renderedProductId: control?.dataset.g4sbCampaignNameProductId || '',
          channelLabel,
        };
      })(),
      targetCpaProposal: (() => {
        const campaign = document.querySelector('.g4-v406-launch > .g4-v406-launch-level');
        const strategy = campaign?.querySelector('.g4-v406-launch-item:nth-child(4)');
        const targetLine = [...(strategy?.querySelectorAll('.g4-v406-launch-lines > div') || [])]
          .find((item) => item.textContent.trim().startsWith(
            '- Целевые действия и их цена'
          ));
        const control = strategy?.querySelector('[data-g4sb-target-cpa]');
        const field = control?.querySelector('[data-g4sb-target-cpa-value]');
        const weeklyBudgetModel = g4sbV431WeeklyBudgetModel(product.id, d, summary);
        const targetCpaModel = g4sbV435TargetCpaModel(weeklyBudgetModel.weeklyBudget);
        const summaryCpa = model.comparable.cpa;
        const summaryCpaRow = node.querySelector(
          '[data-g4sb-checkpoint="7"] [data-g4sb-control-metric="cpa"]'
        );
        return {
          value: field?.value || '',
          readonly: Boolean(field?.readOnly),
          copyButtons: control?.querySelectorAll('[data-g4sb-copy-target-cpa]').length || 0,
          insideStrategy: Boolean(control && strategy?.contains(control)),
          directlyAfterTargetLine: Boolean(control && targetLine?.nextElementSibling === control),
          weeklyBudget: targetCpaModel.weeklyBudget,
          targetCpa: targetCpaModel.targetCpa,
          renderedWeeklyBudget: Number(control?.dataset.g4sbWeeklyBudget),
          summaryCpa,
          summaryCpaDataset: Number(metrics.dataset.g4sbBaseCpa),
          summaryCpaRow: summaryCpaRow?.textContent.trim().replace(/\\s+/g, ' ') || '',
          summaryCpaValue: g4sbV419Money(summaryCpa),
          expectedValue: targetCpaModel.value,
        };
      })(),
      campaignUrlFields: (() => {
        const campaign = document.querySelector('.g4-v406-launch > .g4-v406-launch-level');
        const item = campaign?.querySelector('.g4-v406-launch-item:nth-child(7)');
        const control = item?.querySelector('[data-g4sb-campaign-url-fields]');
        const field = (kind) => control?.querySelector('[data-g4sb-url-field="' + kind + '"]');
        const value = (kind) => field(kind)?.querySelector('[data-g4sb-url-value]')?.value || '';
        const label = (kind) => field(kind)?.querySelector(':scope > span')?.textContent.trim() || '';
        return {
          landing: value('landing'),
          parameters: field('final')?.querySelector('code')?.textContent.trim() || '',
          landingLabel: label('landing'),
          parametersLabel: label('final'),
          templateEditable: Boolean(control?.querySelector('[data-g4sb-v488-utm-template]:not([readonly])')),
          emptyTemplateHint: Boolean(control?.querySelector('.g4-yandex-utm-hint-v488')),
          readonly: [...(control?.querySelectorAll('[data-g4sb-url-value]') || [])]
            .every((input) => input.readOnly),
          copyButtons: control?.querySelectorAll('[data-g4sb-copy-url-field], [data-g4sb-v488-final-url] [data-g4rsya-v289-copy]').length || 0,
          insideItem7: Boolean(control && item?.contains(control)),
          model: g4sbV434CampaignUrlModel(product.id),
          cleanedQueryFixture: g4sbV434CleanLandingUrl(
            'https://k-apple.ru/simvol-2027-koza?existing=1&utm_source=old#buy'
          ),
          adLevelControls: [...document.querySelectorAll('.g4-v406-launch-level')].at(-1)
            ?.querySelectorAll('[data-g4sb-campaign-url-fields]').length || 0,
          legacyFullUrlBlocks: document.querySelectorAll(
            '[data-g4sb-generate-utm], [data-g4sb-copy-utm], [data-g4sb-utm-result]'
          ).length,
        };
      })(),
      strategyBudget: (() => {
        const campaign = document.querySelector('.g4-v406-launch > .g4-v406-launch-level');
        const strategy = campaign?.querySelector('.g4-v406-launch-item:nth-child(4)');
        const budgetLines = [...document.querySelectorAll('.g4-v406-launch-lines > div')]
          .filter((item) => item.textContent.trim().startsWith('- Бюджет - В неделю'));
        const line = budgetLines[0];
        const calculation = g4sbV431WeeklyBudgetModel(product.id, d, summary);
        return {
          line: line?.textContent.trim() || '',
          budgetLineCount: budgetLines.length,
          calculation,
          optimizationBlocks: document.querySelectorAll(
            '[data-g4sb-budget-optimization]'
          ).length,
          underPhraseRows: document.querySelectorAll('[data-g4sb-under-phrase]').length,
          visualNoisePresent: [
            'Путь к цели 10 заявок/неделю',
            'С учётом оптимизации переплаченных фраз',
            'Недобор-фраза',
            'Резерв без нового бюджета',
          ].some((text) => document.body.textContent.includes(text)),
        };
      })(),
      adLevels: (() => {
        const levels = [...document.querySelectorAll('[data-g4sb-group-ad-level]')];
        const details = levels.map((level) => {
          const groupLevel = level.closest('.g4-v406-launch-level');
          const items = [...level.querySelectorAll(
            ':scope > .g4-v406-launch-items > .g4-v406-launch-item'
          )];
          const textItem = items[4];
          const textLink = textItem?.querySelector('[data-g4sb-group-ads-link]');
          const target = textLink ? document.getElementById(
            decodeURIComponent(textLink.getAttribute('href').slice(1))
          ) : null;
          const groupId = level.dataset.g4sbGroupAdId || '';
          const row = d.groupRows.find((candidate) =>
            g4sbV420GroupId(candidate) === groupId);
          const rowIndex = d.groupRows.indexOf(row);
          const sourcePools = g4sbV439SavedPools(
            row, row ? g4sbV420GroupAds(d, row, rowIndex) : [],
          );
          const sourceAds = g4sbV439PoolsToLegacyAds(sourcePools, false)
            .map((ad) => ({ headline: ad.ad0 || '', text: ad.ad2 || '' }))
            .filter((ad) => ad.headline || ad.text);
          const adCards = [...(textItem?.querySelectorAll(
            '[data-g4sb-launch-ad-card]'
          ) || [])].map((card) => ({
            label: card.querySelector(':scope > strong')?.textContent.trim() || '',
            headline: card.querySelector(
              '[data-g4sb-package-field^="launch-ad-headline-"] [data-g4sb-package-value]'
            )?.value || '',
            text: card.querySelector(
              '[data-g4sb-package-field^="launch-ad-text-"] [data-g4sb-package-value]'
            )?.value || '',
            readonly: [...card.querySelectorAll('[data-g4sb-package-value]')]
              .every((field) => field.readOnly),
            copyButtons: card.querySelectorAll('[data-g4sb-copy-package]').length,
          }));
          return {
            groupId,
            groupTitle: groupLevel?.querySelector(':scope > h4')?.textContent.trim() || '',
            title: level.querySelector('h5')?.textContent.trim() || '',
            type: items[0]?.textContent.trim().replace(/\s+/g, ' ') || '',
            textRule: textItem?.textContent.trim().replace(/\s+/g, ' ') || '',
            adCards,
            sourceAds,
            adCopyButtons: textItem?.querySelectorAll(
              '[data-g4sb-launch-ad-card] [data-g4sb-copy-package]'
            ).length || 0,
            numbers: items.map((item) => Number(item.querySelector('label b')?.textContent
              .replace('.', ''))),
            keys: items.map((item) => item.querySelector('[data-g4sb-launch-check]')
              ?.dataset.g4sbLaunchCheck || ''),
            finalInstruction: level.querySelector('.g4-v406-launch-final')
              ?.textContent.trim().replace(/\s+/g, ' ') || '',
            insideGroup: Boolean(groupLevel && groupLevel !== level),
            directlyAfterGroupItems: level.previousElementSibling?.classList
              .contains('g4-v406-launch-items') || false,
            linkHref: textLink?.getAttribute('href') || '',
            linkTargetsOwnAds: Boolean(target &&
              target.matches('[data-g4sb-ad-source-target]') &&
              target.dataset.g4sbSavedGroupId === level.dataset.g4sbGroupAdId),
          };
        });
        return {
          count: levels.length,
          details,
          topLevelCommon: [...document.querySelectorAll(
            '.g4-v406-launch > .g4-v406-launch-level'
          )].filter((level) =>
            level.querySelector(':scope > h4')?.textContent.trim() === 'Уровень объявления'
          ).length,
          topLevelFinals: document.querySelectorAll(
            '.g4-v406-launch > .g4-v406-launch-final'
          ).length,
        };
      })(),
      integratedGroups: (() => {
        const contents = [...document.querySelectorAll('[data-g4sb-launch-group-content]')];
        const levels = contents.map((item) => item.closest('.g4-v406-launch-level'));
        const first = levels[0];
        const items = [...(first?.querySelectorAll('.g4-v406-launch-item') || [])];
        const value = (kind) => first?.querySelector(
          '[data-g4sb-package-field="' + kind + '"] [data-g4sb-package-value]'
        )?.value || '';
        const priorityIds = g4sbV425FixedGroupEntries(product.id, d)
          .map((entry) => g4sbV420GroupId(entry.group));
        return {
          count: contents.length,
          groupIds: contents.map((item) => item.dataset.g4sbLaunchGroupId),
          jtbdIds: contents.map((item) => item.dataset.g4sbLaunchJtbdId),
          priorityIds,
          titles: levels.map((item) => item?.querySelector('h4')?.textContent.trim() || ''),
          name: value('name'),
          keywords: value('keywords'),
          minus: value('minus'),
          callouts: value('callouts'),
          sourceCounts: contents.map((content) => document.getElementById(
            g4sbV441GroupAdsAnchor(content.dataset.g4sbLaunchGroupId)
          )?.querySelector('.g4-v127-group-main small')?.textContent.trim() || ''),
          renamedCounterNoise: document.body.textContent.includes('1 (Комбинаторное)'),
          adsLinks: [...(items[6]?.querySelectorAll('[data-g4sb-group-ads-link]') || [])]
            .map((link) => link.getAttribute('href')),
          launchAdFields: items[6]?.querySelectorAll(
            '[data-g4sb-package-field="ads"], [data-g4sb-package-field="ad-headlines"], [data-g4sb-package-field="ad-texts"]'
          ).length || 0,
          legacyAdCards: first?.querySelectorAll(
            '[data-g4sb-package-field^="ad-"]:not([data-g4sb-package-field="ad-headlines"]):not([data-g4sb-package-field="ad-texts"])'
          ).length || 0,
          sitelinks: [...(first?.querySelectorAll(
            '[data-g4sb-package-field="sitelinks"] [data-g4sb-package-field^="sitelink-"] [data-g4sb-package-value]'
          ) || [])].map((item) => item.value),
          readonly: [...(first?.querySelectorAll('[data-g4sb-package-value]') || [])]
            .every((item) => item.readOnly),
          copyButtons: first?.querySelectorAll('[data-g4sb-copy-package]').length || 0,
          sitelinkPlaceholder: first?.querySelector('.g4-v425-package-sitelinks')
            ?.textContent.trim() || '',
          emptyFields: first?.querySelectorAll('.g4-v425-package-field.is-empty').length || 0,
          nameInsideItem1: Boolean(items[0]?.querySelector('[data-g4sb-package-field="name"]')),
          phrasesInsideItem5: Boolean(
            items[4]?.querySelector('[data-g4sb-package-field="keywords"]') &&
            items[4]?.querySelector('[data-g4sb-package-field="minus"]') &&
            items[4]?.querySelector('.g4-v407-auto-row')
          ),
          assetsInsideItem7: Boolean(
            items[6]?.querySelector('[data-g4sb-launch-ads-link]') &&
            items[6]?.querySelector('[data-g4sb-package-field="callouts"]') &&
            items[6]?.querySelector('[data-g4sb-package-sitelinks]') &&
            items[6]?.querySelector('.g4-v407-auto-row')
          ),
          separatePackages: document.querySelectorAll(
            '[data-g4sb-launch-package], .g4-v425-group-package'
          ).length,
          legacyHeadings: [...document.querySelectorAll('.g4-v406-launch *')]
            .filter((item) => /ЗАФИКСИРОВАННАЯ ГРУППА|Комплект для группы/.test(
              item.textContent || ''
            )).length,
        };
      })(),
    };
    node.scrollIntoView({ block: 'start' });
    return result;
  })()`);
  assert(realThreeGroups.productName.includes("Коза") && realThreeGroups.groups === 3 &&
    realThreeGroups.compactBlocks === 1 && realThreeGroups.cards === 4 &&
    realThreeGroups.oldDuplicateElements === 0 &&
    realThreeGroups.controlStack.count === 5 &&
    realThreeGroups.controlStack.fullWidth &&
    realThreeGroups.controlStack.vertical &&
    JSON.stringify(realThreeGroups.topLevelSteps.map((item) => item.key)) ===
      JSON.stringify(['clusters', 'launch']) &&
    realThreeGroups.topLevelSteps[0].title.startsWith('1') &&
    realThreeGroups.topLevelSteps[1].title.startsWith('2') &&
    JSON.stringify(realThreeGroups.timelineDays) === JSON.stringify([0, 3, 7, 14, 21, 30]),
  `Real three-group structure failed: ${JSON.stringify(realThreeGroups)}`);
  const jtbdToggleInteraction = await evaluate(`(async () => {
    const cards = [...document.querySelectorAll(
      '.g4-v166-jtbd[data-g4sb-jtbd-id][data-g4sb-product="${productId}"]'
    )];
    const d = g4sbV445CurrentSearchBuild(${JSON.stringify(productId)});
    const originalRenderGate = renderGate;
    let renderGateCalls = 0;
    renderGate = (...args) => {
      renderGateCalls += 1;
      return originalRenderGate(...args);
    };
    const identities = [...cards];
    const groupsBefore = JSON.stringify(d.groupRows);
    const scrollBefore = window.scrollY;
    const openTimings = [];
    const closeTimings = [];
    for (const card of cards) {
      const started = performance.now();
      card.querySelector(':scope > summary').click();
      openTimings.push(performance.now() - started);
    }
    const allOpen = cards.every((card) => card.open);
    const openIds = [...(d.openJtbdIdsV391 || [])];
    for (const card of cards) {
      const started = performance.now();
      card.querySelector(':scope > summary').click();
      closeTimings.push(performance.now() - started);
    }
    await new Promise((resolve) => requestAnimationFrame(() =>
      requestAnimationFrame(resolve)));
    const allClosed = cards.every((card) => !card.open);
    const sameCards = cards.every((card, index) => card === identities[index] && card.isConnected);
    const groupsUnchanged = JSON.stringify(d.groupRows) === groupsBefore;
    const finalOpenIds = [...(d.openJtbdIdsV391 || [])];
    renderGate = originalRenderGate;
    return {
      count: cards.length,
      renderGateCalls,
      allOpen,
      allClosed,
      sameCards,
      groupsUnchanged,
      openIds,
      finalOpenIds,
      maxOpenMs: Math.max(0, ...openTimings),
      maxCloseMs: Math.max(0, ...closeTimings),
      scrollDelta: Math.abs(window.scrollY - scrollBefore),
    };
  })()`);
  assert(jtbdToggleInteraction.count === 3 &&
    jtbdToggleInteraction.renderGateCalls === 0 &&
    jtbdToggleInteraction.allOpen && jtbdToggleInteraction.allClosed &&
    jtbdToggleInteraction.sameCards && jtbdToggleInteraction.groupsUnchanged &&
    jtbdToggleInteraction.openIds.length === 3 &&
    jtbdToggleInteraction.finalOpenIds.length === 0 &&
    jtbdToggleInteraction.scrollDelta <= 1,
  `JTBD toggle interaction is not local: ${JSON.stringify(jtbdToggleInteraction)}`);
  assert(realThreeGroups.launchCopyUi.count > 0 &&
    realThreeGroups.launchCopyUi.unexpected === 0 &&
    realThreeGroups.launchCopyUi.iconOnly &&
    realThreeGroups.launchCopyUi.accessible &&
    realThreeGroups.launchCopyUi.beforeField &&
    realThreeGroups.launchCopyUi.textualCopyButtons === 1 &&
    realThreeGroups.launchCopyUi.kinds.campaign === 1 &&
    realThreeGroups.launchCopyUi.kinds.targetCpa === 1 &&
    realThreeGroups.launchCopyUi.kinds.url === 1 &&
    realThreeGroups.launchCopyUi.kinds.package > 0,
  `Launch copy controls are inconsistent: ${JSON.stringify(realThreeGroups.launchCopyUi)}`);
  assert(realThreeGroups.campaignName.value ===
      `${realThreeGroups.campaignName.channelLabel} - ${realThreeGroups.campaignName.selectedProductName}` &&
    realThreeGroups.campaignName.channelLabel === "Яндекс Директ / Поиск" &&
    realThreeGroups.campaignName.selectedProductId === productId &&
    realThreeGroups.campaignName.renderedProductId === productId &&
    realThreeGroups.campaignName.readonly &&
    realThreeGroups.campaignName.copyButtons === 1 &&
    realThreeGroups.campaignName.insideFirstItem,
  `Campaign name mapping failed: ${JSON.stringify(realThreeGroups.campaignName)}`);
  const expectedUrlParameters =
    'utm_source=yandex&utm_medium=cpc&utm_campaign={campaign_id}&utm_content={ad_id}&utm_term={keyword}';
  assert(realThreeGroups.campaignUrlFields.landing ===
      realThreeGroups.campaignUrlFields.model.landing &&
    !realThreeGroups.campaignUrlFields.landing.includes('?') &&
    !realThreeGroups.campaignUrlFields.landing.includes('#') &&
    realThreeGroups.campaignUrlFields.parameters === expectedUrlParameters &&
    !realThreeGroups.campaignUrlFields.parameters.startsWith('?') &&
    !realThreeGroups.campaignUrlFields.parameters.includes('://') &&
    realThreeGroups.campaignUrlFields.landingLabel === 'Ссылка в объявлении:' &&
    realThreeGroups.campaignUrlFields.parametersLabel === 'Итоговая ссылка с UTM' &&
    realThreeGroups.campaignUrlFields.templateEditable &&
    realThreeGroups.campaignUrlFields.emptyTemplateHint &&
    realThreeGroups.campaignUrlFields.cleanedQueryFixture ===
      'https://k-apple.ru/simvol-2027-koza' &&
    realThreeGroups.campaignUrlFields.readonly &&
    realThreeGroups.campaignUrlFields.copyButtons === 2 &&
    realThreeGroups.campaignUrlFields.insideItem7 &&
    realThreeGroups.campaignUrlFields.adLevelControls === 0 &&
    realThreeGroups.campaignUrlFields.legacyFullUrlBlocks === 0,
  `Campaign URL fields failed: ${JSON.stringify(realThreeGroups.campaignUrlFields)}`);
  const copiedCampaignUrlFields = await evaluate(`(async () => {
    const copied = [];
    g4sbV141CopyText = async (value) => { copied.push(value); };
    g4RsyaCopyV289 = async (value) => { copied.push(value); };
    const control = document.querySelector('[data-g4sb-campaign-url-fields]');
    control.querySelector('[data-g4sb-url-field="landing"] [data-g4sb-copy-url-field]').click();
    control.querySelector('[data-g4sb-v488-final-url] [data-g4rsya-v289-copy]').click();
    await new Promise((resolve) => setTimeout(resolve, 30));
    return copied;
  })()`);
  assert(copiedCampaignUrlFields[0] === realThreeGroups.campaignUrlFields.landing &&
    copiedCampaignUrlFields[1] === realThreeGroups.campaignUrlFields.parameters,
  `Campaign URL copy buttons copied wrong values: ${JSON.stringify(copiedCampaignUrlFields)}`);
  const copiedCampaignName = await evaluate(`(async () => {
    window.__g4CampaignNameCopied = '';
    g4sbV141CopyText = async (value) => { window.__g4CampaignNameCopied = value; };
    document.querySelector('[data-g4sb-copy-campaign-name]').click();
    await new Promise((resolve) => setTimeout(resolve, 30));
    return window.__g4CampaignNameCopied;
  })()`);
  assert(copiedCampaignName === realThreeGroups.campaignName.value,
    `Campaign name copy button copied the wrong value: ${JSON.stringify(copiedCampaignName)}`);
  const emptyCampaignName = await evaluate(`(() => {
    const ui = guruV194Ui(state);
    const selectedProductId = ui.selectedProductId;
    ui.selectedProductId = '';
    const channel = g4LaunchChannels().find(g4IsYandexSearchChannel);
    const template = document.createElement('template');
    template.innerHTML = g4sbV432CampaignNameHtml(channel, ${JSON.stringify(productId)}).trim();
    ui.selectedProductId = selectedProductId;
    const control = template.content.firstElementChild;
    return {
      value: control.querySelector('[data-g4sb-campaign-name-value]')?.value || '',
      copyButtons: control.querySelectorAll('[data-g4sb-copy-campaign-name]').length,
    };
  })()`);
  assert(emptyCampaignName.value === "[товар не выбран в селекторе]" &&
    emptyCampaignName.copyButtons === 0,
  `Empty product campaign name failed: ${JSON.stringify(emptyCampaignName)}`);
  const cpaProposal = realThreeGroups.targetCpaProposal;
  assert(cpaProposal.value === cpaProposal.expectedValue &&
    cpaProposal.value === "610,826 ₽" &&
    cpaProposal.weeklyBudget === 6108.26 &&
    cpaProposal.targetCpa === 610.826 &&
    cpaProposal.renderedWeeklyBudget === cpaProposal.weeklyBudget &&
    cpaProposal.targetCpa * 10 === cpaProposal.weeklyBudget &&
    Math.abs(cpaProposal.summaryCpa - cpaProposal.summaryCpaDataset) < 0.000001 &&
    cpaProposal.summaryCpaRow.includes(`ожидается ≈${cpaProposal.summaryCpaValue}`) &&
    !cpaProposal.summaryCpaRow.includes(cpaProposal.value) &&
    cpaProposal.readonly &&
    cpaProposal.copyButtons === 1 &&
    cpaProposal.insideStrategy &&
    cpaProposal.directlyAfterTargetLine,
  `Target CPA proposal mapping failed: ${JSON.stringify(cpaProposal)}`);
  const copiedTargetCpa = await evaluate(`(async () => {
    window.__g4TargetCpaCopied = '';
    g4sbV141CopyText = async (value) => { window.__g4TargetCpaCopied = value; };
    const button = document.querySelector('[data-g4sb-copy-target-cpa]');
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const copied = window.__g4TargetCpaCopied;
    button.textContent = 'Копировать';
    button.disabled = false;
    return copied;
  })()`);
  assert(copiedTargetCpa === cpaProposal.value,
    `Target CPA copy button copied the wrong value: ${JSON.stringify(copiedTargetCpa)}`);
  const emptyTargetCpa = await evaluate(`(() => {
    const template = document.createElement('template');
    template.innerHTML = g4sbV435TargetCpaHtml(g4sbV435TargetCpaModel(null)).trim();
    const control = template.content.firstElementChild;
    return {
      value: control.querySelector('[data-g4sb-target-cpa-value]')?.value || '',
      copyButtons: control.querySelectorAll('[data-g4sb-copy-target-cpa]').length,
    };
  })()`);
  assert(emptyTargetCpa.value ===
      "[Цена цели пока не рассчитана - нет рекомендованного недельного бюджета]" &&
    emptyTargetCpa.copyButtons === 0,
  `Empty target CPA proposal failed: ${JSON.stringify(emptyTargetCpa)}`);
  const expectedAdNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14];
  const expectedAdFinal =
    "Выбрать тип объявления 'Комбинаторное' → создать до 3 объявлений → в каждом вставить заголовок и текст из соответствующей пары";
  assert(realThreeGroups.adLevels.count === 3 &&
    realThreeGroups.adLevels.topLevelCommon === 0 &&
    realThreeGroups.adLevels.topLevelFinals === 0 &&
    realThreeGroups.adLevels.details.every((level, index) =>
      level.title === 'Уровень объявления' &&
      level.groupTitle.startsWith(`Уровень группы ${index + 1} · `) &&
      level.type.includes(
        'Комбинаторное (преемник текстово-графического, доступно с 2026 года)'
      ) &&
      !level.type.includes('ТИП ОБЪЯВЛЕНИЯ — Текстово-графическое') &&
      level.type.includes('Почему не остальные типы') &&
      level.textRule.includes('3 объявления этой группы (заголовок + текст в паре)') &&
      level.textRule.includes('Перейти к объявлениям этой группы') &&
      !level.textRule.includes('Генерировать') &&
      level.adCards.length === 3 &&
      level.adCards.every((card, adIndex) =>
        card.label === `Объявление ${adIndex + 1}` && card.readonly &&
        card.copyButtons === 2) &&
      level.adCopyButtons === 6 &&
      JSON.stringify(level.adCards.map(({ headline, text }) => ({ headline, text }))) ===
        JSON.stringify(level.sourceAds) &&
      JSON.stringify(level.numbers) === JSON.stringify(expectedAdNumbers) &&
      new Set(level.keys).size === expectedAdNumbers.length &&
      level.keys.every((key, keyIndex) =>
        key === `group:${level.groupId}:ad:${expectedAdNumbers[keyIndex]}`) &&
      level.finalInstruction === expectedAdFinal &&
      level.insideGroup && level.directlyAfterGroupItems && level.linkTargetsOwnAds
    ),
  `Per-group combinatorial ad instructions failed: ${JSON.stringify(realThreeGroups.adLevels)}`);
  const copiedLaunchAdFields = await evaluate(`(async () => {
    const item = document.querySelector(
      '[data-g4sb-group-ad-level] > .g4-v406-launch-items > .g4-v406-launch-item:nth-child(5)'
    );
    const expected = [...item.querySelectorAll('[data-g4sb-package-value]')]
      .map((field) => field.value);
    const copied = [];
    g4sbV141CopyText = async (value) => { copied.push(value); };
    [...item.querySelectorAll('[data-g4sb-launch-ad-card] [data-g4sb-copy-package]')]
      .forEach((button) => button.click());
    await new Promise((resolve) => setTimeout(resolve, 30));
    return { expected, copied };
  })()`);
  assert(copiedLaunchAdFields.expected.length === 6 &&
    JSON.stringify(copiedLaunchAdFields.copied) ===
      JSON.stringify(copiedLaunchAdFields.expected),
  `Launch ad copy buttons copied wrong values: ${JSON.stringify(copiedLaunchAdFields)}`);
  const independentAdTypeChecks = await evaluate(`(() => {
    const boxes = [...document.querySelectorAll(
      '[data-g4sb-group-ad-level] > .g4-v406-launch-items > .g4-v406-launch-item:first-child [data-g4sb-launch-check]'
    )];
    const before = boxes.map((box) => box.checked);
    boxes[0].click();
    const after = boxes.map((box) => box.checked);
    const keys = boxes.map((box) => box.dataset.g4sbLaunchCheck);
    const stored = keys.map((key) => Boolean(
      ensureGate4SearchBuild(${JSON.stringify(productId)}).launchChecklistV406?.[key]
    ));
    boxes[0].click();
    return { before, after, keys, stored };
  })()`);
  assert(independentAdTypeChecks.keys.length === 3 &&
    new Set(independentAdTypeChecks.keys).size === 3 &&
    independentAdTypeChecks.after[0] === !independentAdTypeChecks.before[0] &&
    independentAdTypeChecks.after.slice(1).every((value, index) =>
      value === independentAdTypeChecks.before[index + 1]) &&
    independentAdTypeChecks.stored[0] === independentAdTypeChecks.after[0] &&
    independentAdTypeChecks.stored.slice(1).every((value, index) =>
      value === independentAdTypeChecks.after[index + 1]),
  `Per-group type checkboxes are not independent: ${JSON.stringify(independentAdTypeChecks)}`);
  const integratedGroups = realThreeGroups.integratedGroups;
  assert(integratedGroups.count === 3 &&
    JSON.stringify(integratedGroups.groupIds) === JSON.stringify(integratedGroups.priorityIds) &&
    integratedGroups.jtbdIds[0] === `primary:${productId}` &&
    integratedGroups.titles[0].startsWith("Уровень группы 1 · ") &&
    integratedGroups.name === integratedGroups.titles[0]
      .replace("Уровень группы 1 · ", "") &&
    integratedGroups.keywords.split("\n").filter(Boolean).length > 0 &&
    integratedGroups.minus.length > 0 &&
    integratedGroups.legacyAdCards === 0 &&
    integratedGroups.launchAdFields === 0 &&
    integratedGroups.adsLinks.length === 1 &&
    integratedGroups.sourceCounts.every((value) => value.includes('3 объявления')) &&
    !integratedGroups.renamedCounterNoise &&
    integratedGroups.sitelinks.length === 4 &&
    integratedGroups.sitelinks.every((link) =>
      link.includes("Заголовок:") && link.includes("Описание:") && link.includes("Ссылка:")) &&
    integratedGroups.callouts.split("\n").filter(Boolean).length >= 4 &&
    integratedGroups.readonly &&
    integratedGroups.copyButtons === 4 +
      integratedGroups.sitelinks.length +
      realThreeGroups.adLevels.details[0].adCopyButtons &&
    integratedGroups.emptyFields === 0 &&
    integratedGroups.nameInsideItem1 && integratedGroups.phrasesInsideItem5 &&
    integratedGroups.assetsInsideItem7 && integratedGroups.separatePackages === 0 &&
    integratedGroups.legacyHeadings === 0 &&
    integratedGroups.sitelinkPlaceholder === "",
  `Integrated fixed group launch content failed: ${JSON.stringify(integratedGroups)}`);
  const launchGroupCollapse = await evaluate(`(() => {
    const levels = [...document.querySelectorAll('[data-g4sb-launch-group-level]')];
    const first = levels[0];
    const second = levels[1];
    const button = first?.querySelector('[data-g4sb-launch-group-toggle]');
    const product = button?.dataset.g4sbProduct;
    const groupId = button?.dataset.g4sbLaunchGroupToggle;
    const title = button?.textContent.trim() || '';
    const locationBefore = location.href;
    const checklistBefore = JSON.stringify(
      ensureGate4SearchBuild(product).launchChecklistV406 || {}
    );
    button.click();
    const collapsed = first.classList.contains('is-collapsed') &&
      button.getAttribute('aria-expanded') === 'false' &&
      getComputedStyle(first.querySelector('.g4-v406-launch-items')).display === 'none';
    const secondUnaffected = !second.classList.contains('is-collapsed') &&
      second.querySelector('[data-g4sb-launch-group-toggle]')
        ?.getAttribute('aria-expanded') === 'true';
    const storedClosed = ensureGate4SearchBuild(product)
      .launchGroupOpenV444?.[groupId] === false;
    button.click();
    const reopened = !first.classList.contains('is-collapsed') &&
      button.getAttribute('aria-expanded') === 'true' &&
      getComputedStyle(first.querySelector('.g4-v406-launch-items')).display !== 'none';
    const storedOpen = ensureGate4SearchBuild(product)
      .launchGroupOpenV444?.[groupId] === true;
    return { count: levels.length, title, collapsed, reopened, secondUnaffected,
      storedClosed, storedOpen, locationStable: location.href === locationBefore,
      checklistStable: JSON.stringify(
        ensureGate4SearchBuild(product).launchChecklistV406 || {}
      ) === checklistBefore };
  })()`);
  assert(launchGroupCollapse.count === 3 &&
    launchGroupCollapse.title.startsWith('Уровень группы 1 · ') &&
    launchGroupCollapse.collapsed && launchGroupCollapse.reopened &&
    launchGroupCollapse.secondUnaffected && launchGroupCollapse.storedClosed &&
    launchGroupCollapse.storedOpen && launchGroupCollapse.locationStable &&
    launchGroupCollapse.checklistStable,
  `Launch group collapse failed: ${JSON.stringify(launchGroupCollapse)}`);
  const copiedKeywords = await evaluate(`(async () => {
    window.__g4PackageCopied = '';
    g4sbV141CopyText = async (value) => { window.__g4PackageCopied = value; };
    const button = document.querySelector(
      '[data-g4sb-launch-group-content]'
    ).closest('.g4-v406-launch-level').querySelector(
      '[data-g4sb-package-field="keywords"] [data-g4sb-copy-package]'
    );
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const copied = window.__g4PackageCopied;
    button.textContent = 'Копировать';
    button.disabled = false;
    return copied;
  })()`);
  assert(copiedKeywords === integratedGroups.keywords,
    `Integrated group copy button copied the wrong value: ${JSON.stringify(copiedKeywords)}`);
  const launchAdsNavigation = await evaluate(`(() => {
    const level = document.querySelector('[data-g4sb-launch-group-content]')
      .closest('.g4-v406-launch-level');
    const link = level.querySelector('.g4-v406-launch-item:nth-child(7) [data-g4sb-group-ads-link]');
    const groupId = level.querySelector('[data-g4sb-launch-group-content]')
      .dataset.g4sbLaunchGroupId;
    const d = ensureGate4SearchBuild(${JSON.stringify(productId)});
    const group = d.groupRows.find((row) => g4sbV420GroupId(row) === groupId);
    const fixedBefore = g4sbGroupIsFixed(group);
    link.click();
    const target = document.getElementById(link.dataset.g4sbGroupAdsLink);
    return {
      href: link.getAttribute('href'), expectedHref: '#' + g4sbV441GroupAdsAnchor(groupId), groupId,
      targetGroupId: target?.dataset.g4sbSavedGroupId || '',
      targetHighlighted: target?.classList.contains('g4-phrase-conflict-group-target') || false,
      targetVisible: Boolean(target && !target.closest('details:not([open])')),
      fixedBefore, fixedAfter: g4sbGroupIsFixed(group),
      launchAdFields: level.querySelectorAll(
        '[data-g4sb-package-field="ads"], [data-g4sb-package-field="ad-headlines"], [data-g4sb-package-field="ad-texts"]'
      ).length,
    };
  })()`);
  assert(launchAdsNavigation.href === launchAdsNavigation.expectedHref &&
    launchAdsNavigation.targetGroupId === launchAdsNavigation.groupId &&
    launchAdsNavigation.targetHighlighted && launchAdsNavigation.targetVisible &&
    launchAdsNavigation.fixedBefore && launchAdsNavigation.fixedAfter &&
    launchAdsNavigation.launchAdFields === 0,
  `Launch ad navigation failed: ${JSON.stringify(launchAdsNavigation)}`);
  const copiedLaunchSitelink = await evaluate(`(async () => {
    window.__g4LaunchSitelinkCopied = '';
    g4sbV141CopyText = async (value) => { window.__g4LaunchSitelinkCopied = value; };
    const button = document.querySelector(
      '[data-g4sb-launch-group-content]'
    ).closest('.g4-v406-launch-level').querySelector(
      '[data-g4sb-package-field="sitelink-1"] [data-g4sb-copy-package]'
    );
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const copied = window.__g4LaunchSitelinkCopied;
    button.textContent = 'Копировать';
    button.disabled = false;
    return copied;
  })()`);
  assert(copiedLaunchSitelink === integratedGroups.sitelinks[0],
    `Launch sitelink copy button copied the wrong value: ${JSON.stringify(copiedLaunchSitelink)}`);
  const plain = (value) => String(value).replace(/\s+/g, " ");
  const g4sbMoneyForTest = (value) =>
    `${Number(value).toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`;
  const budgetCalculation = realThreeGroups.strategyBudget.calculation;
  const expectedCurrentWeeklyBudget = realThreeGroups.budget / 4.33;
  const expectedExtraClicksLevel1 = budgetCalculation.overpayBudget /
    budgetCalculation.campaignCpc - budgetCalculation.overpayClicks;
  const expectedExtraLeadsLevel1 = expectedExtraClicksLevel1 * 0.03;
  const expectedLeadsAfterLevel1 = realThreeGroups.weekly.cautious +
    expectedExtraLeadsLevel1;
  const expectedClicksNeeded = Math.max(0, (10 - expectedLeadsAfterLevel1) / 0.03);
  const expectedClicksTaken = Math.min(expectedClicksNeeded,
    budgetCalculation.underReserveClicks);
  const expectedUnderCpc = budgetCalculation.underBudget /
    budgetCalculation.underClicks;
  const expectedAdditionalBudget = expectedClicksTaken * expectedUnderCpc;
  const expectedWeeklyBudget = expectedCurrentWeeklyBudget + expectedAdditionalBudget;
  assert(Math.abs(budgetCalculation.currentWeeklyBudget - expectedCurrentWeeklyBudget) < 0.000001 &&
    Math.abs(budgetCalculation.extraClicksLevel1 - expectedExtraClicksLevel1) < 0.000001 &&
    Math.abs(budgetCalculation.extraLeadsLevel1 - expectedExtraLeadsLevel1) < 0.000001 &&
    Math.abs(budgetCalculation.leadsAfterLevel1 - expectedLeadsAfterLevel1) < 0.000001 &&
    Math.abs(budgetCalculation.additionalClicksNeeded - expectedClicksNeeded) < 0.000001 &&
    Math.abs(budgetCalculation.additionalClicksTaken - expectedClicksTaken) < 0.000001 &&
    Math.abs(budgetCalculation.underCpc - expectedUnderCpc) < 0.000001 &&
    Math.abs(budgetCalculation.additionalBudget - expectedAdditionalBudget) < 0.000001 &&
    Math.abs(budgetCalculation.weeklyBudget - expectedWeeklyBudget) < 0.000001 &&
    realThreeGroups.strategyBudget.line ===
      `- Бюджет - В неделю: ${g4sbMoneyForTest(expectedWeeklyBudget)}` &&
    realThreeGroups.strategyBudget.budgetLineCount === 1 &&
    realThreeGroups.strategyBudget.optimizationBlocks === 0 &&
    realThreeGroups.strategyBudget.underPhraseRows === 0 &&
    !realThreeGroups.strategyBudget.visualNoisePresent,
  `Compact weekly budget line failed: ${JSON.stringify(realThreeGroups.strategyBudget)}`);
  assert(realThreeGroups.metrics.includes(plain(realThreeGroups.expected.budget) + " за период") &&
    realThreeGroups.metrics.includes(plain(realThreeGroups.expected.daily) + "/день") &&
    realThreeGroups.metrics.includes(plain(realThreeGroups.expected.weeklyBudget) + "/неделю") &&
    ["cautious", "base", "optimistic"].every((key) => {
      const expected = realThreeGroups.expected.scenarios[key];
      const row = realThreeGroups.scenarios[key];
      return row.includes(expected.weekly + " в неделю") &&
        row.includes(expected.period + " за период") &&
        row.includes(expected.interval);
    }),
  `Real three-group values were lost: ${JSON.stringify(realThreeGroups)}`);
  assert(realThreeGroups.checkpoint7.includes("Клики: факт — / ожидается ≈126") &&
    realThreeGroups.checkpoint7.includes("Расход: факт — / ожидается ≈4 678,05 ₽") &&
    realThreeGroups.checkpoint7.includes("Конверсии/заявки: факт — / ожидается ≈6,2") &&
    ["Показы:", "CTR:", "CPC:", "Поисковые запросы:", "CPA:"]
      .every((label) => realThreeGroups.checkpoint7.includes(label)) &&
    realThreeGroups.checkpoint14.includes("Расход: факт — / ожидается ≈9 356,11 ₽") &&
    realThreeGroups.checkpoint14.includes("Клики: факт — / ожидается ≈252") &&
    realThreeGroups.checkpoint14.includes("Заявки: факт — / ожидается ≈12,4") &&
    ["CTR:", "CPC:", "CVR:", "CPA:"]
      .every((label) => realThreeGroups.checkpoint14.includes(label)) &&
    realThreeGroups.riskAction.includes(
      `${realThreeGroups.riskCount} фраз, ${plain(g4sbMoneyForTest(realThreeGroups.riskBudget))}`
    ) &&
    realThreeGroups.riskAction.includes(
      `${Number(realThreeGroups.riskShare).toLocaleString("ru-RU", { maximumFractionDigits: 1 })}% бюджета`
    ) &&
    realThreeGroups.decision.includes(
      "Данные Gate 5 за этот период ещё не внесены - корректировки вносить рано"
    ) && !realThreeGroups.decision.includes("нет фактического периода Gate 5"),
  `Real control checkpoints failed: ${JSON.stringify(realThreeGroups)}`);
  const clip = await evaluate(`(() => {
    const node = document.querySelector('[data-g4sb-summary-product="${productId}"]');
    const box = node.getBoundingClientRect();
    const recommendations = node.querySelector('.g4-v405-launch-recommendations');
    const bottom = (recommendations || node.querySelector('.g4-v405-launch-summary-grid'))
      .getBoundingClientRect().bottom + scrollY;
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1540),
      height: bottom - (box.top + scrollY) + 16, scale: 1 };
  })()`);
  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip,
  });
  await writeFile(new URL("../artifacts/gate4-search-launch-summary-compact-v421.png", import.meta.url),
    Buffer.from(screenshot.data, "base64"));
  const planClip = await evaluate(`(() => {
    const plan = document.querySelector('[data-g4sb-summary-product="${productId}"] [data-g4sb-control-plan]');
    const decision = plan.querySelector('.g4-v419-decision');
    const box = plan.getBoundingClientRect();
    const bottom = decision.getBoundingClientRect().bottom + scrollY;
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1540),
      height: bottom - (box.top + scrollY) + 16, scale: 1 };
  })()`);
  const planScreenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: planClip,
  });
  await writeFile(new URL("../artifacts/gate4-search-control-plan-v421.png", import.meta.url),
    Buffer.from(planScreenshot.data, "base64"));
  const integratedGroupClip = await evaluate(`(() => {
    const item = document.querySelector('[data-g4sb-launch-group-content]')
      .closest('.g4-v406-launch-level');
    item.scrollIntoView({ block: 'start' });
    const box = item.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1540), height: box.height + 16, scale: 1 };
  })()`);
  const integratedGroupScreenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: integratedGroupClip,
  });
  await writeFile(new URL("../artifacts/gate4-search-launch-group-sitelinks-v437.png", import.meta.url),
    Buffer.from(integratedGroupScreenshot.data, "base64"));
  const perGroupClips = await evaluate(`(() => {
    return [...document.querySelectorAll('[data-g4sb-launch-group-content]')].map((content) => {
      const level = content.closest('.g4-v406-launch-level');
      const box = level.getBoundingClientRect();
      return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
        width: Math.min(box.width + 16, 1540), height: box.height + 16, scale: 1 };
    });
  })()`);
  const perGroupScreenshots = [];
  for (const [index, groupClip] of perGroupClips.entries()) {
    const fileName = `artifacts/gate4-search-launch-group-${index + 1}-ad-level-v441.png`;
    const image = await page.call("Page.captureScreenshot", {
      format: "png", captureBeyondViewport: true, clip: groupClip,
    });
    await writeFile(new URL(`../${fileName}`, import.meta.url),
      Buffer.from(image.data, "base64"));
    perGroupScreenshots.push(fileName);
  }
  const collapsedGroupClip = await evaluate(`(() => {
    const level = document.querySelector('[data-g4sb-launch-group-level]');
    level.querySelector('[data-g4sb-launch-group-toggle]').click();
    level.scrollIntoView({ block: 'center' });
    const box = level.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1540), height: box.height + 16, scale: 1 };
  })()`);
  const collapsedGroupScreenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: collapsedGroupClip,
  });
  await writeFile(new URL(
    "../artifacts/gate4-search-launch-group-collapsed-v444.png", import.meta.url,
  ), Buffer.from(collapsedGroupScreenshot.data, "base64"));
  await evaluate(`(() => {
    const level = document.querySelector('[data-g4sb-launch-group-level]');
    level.querySelector('[data-g4sb-launch-group-toggle]').click();
  })()`);
  const launchAdsLinkClip = await evaluate(`(() => {
    const level = document.querySelector('[data-g4sb-launch-group-content]')
      .closest('.g4-v406-launch-level');
    const item = level.querySelector('.g4-v406-launch-item:nth-child(7)');
    item.scrollIntoView({ block: 'start' });
    const box = item.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1540), height: box.height + 16, scale: 1 };
  })()`);
  const launchAdsLinkScreenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: launchAdsLinkClip,
  });
  await writeFile(new URL(
    "../artifacts/gate4-search-launch-ads-link-v441.png", import.meta.url,
  ), Buffer.from(launchAdsLinkScreenshot.data, "base64"));
  const launchAdCardsClip = await evaluate(`(() => {
    const item = document.querySelector(
      '[data-g4sb-group-ad-level] > .g4-v406-launch-items > .g4-v406-launch-item:nth-child(5)'
    );
    item.scrollIntoView({ block: 'start' });
    const box = item.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1540), height: box.height + 16, scale: 1 };
  })()`);
  const launchAdCardsScreenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: launchAdCardsClip,
  });
  await writeFile(new URL(
    "../artifacts/gate4-search-launch-ad-cards-v442.png", import.meta.url,
  ), Buffer.from(launchAdCardsScreenshot.data, "base64"));
  const strategyBudgetClip = await evaluate(`(() => {
    const campaign = document.querySelector('.g4-v406-launch > .g4-v406-launch-level');
    const item = campaign.querySelector('.g4-v406-launch-item:nth-child(4)');
    item.scrollIntoView({ block: 'center' });
    const box = item.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1540), height: box.height + 16, scale: 1 };
  })()`);
  const strategyBudgetScreenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: strategyBudgetClip,
  });
  await writeFile(new URL("../artifacts/gate4-search-strategy-weekly-budget-v431.png", import.meta.url),
    Buffer.from(strategyBudgetScreenshot.data, "base64"));
  await writeFile(new URL("../artifacts/gate4-search-strategy-target-cpa-v435.png", import.meta.url),
    Buffer.from(strategyBudgetScreenshot.data, "base64"));
  const campaignNameClip = await evaluate(`(() => {
    const campaign = document.querySelector('.g4-v406-launch > .g4-v406-launch-level');
    const item = campaign.querySelector('.g4-v406-launch-item:nth-child(1)');
    item.scrollIntoView({ block: 'center' });
    const box = item.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1540), height: box.height + 16, scale: 1 };
  })()`);
  const campaignNameScreenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: campaignNameClip,
  });
  await writeFile(new URL("../artifacts/gate4-search-campaign-name-v432.png", import.meta.url),
    Buffer.from(campaignNameScreenshot.data, "base64"));
  const campaignUrlFieldsClip = await evaluate(`(() => {
    const campaign = document.querySelector('.g4-v406-launch > .g4-v406-launch-level');
    const item = campaign.querySelector('.g4-v406-launch-item:nth-child(7)');
    item.scrollIntoView({ block: 'center' });
    const box = item.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1540), height: box.height + 16, scale: 1 };
  })()`);
  const campaignUrlFieldsScreenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: campaignUrlFieldsClip,
  });
  await writeFile(new URL("../artifacts/gate4-search-campaign-url-fields-v434.png", import.meta.url),
    Buffer.from(campaignUrlFieldsScreenshot.data, "base64"));

  const groupAdCounterClip = await evaluate(`(() => {
    const groupId = document.querySelector('[data-g4sb-launch-group-content]')
      ?.dataset.g4sbLaunchGroupId || '';
    const card = document.getElementById(g4sbV441GroupAdsAnchor(groupId));
    card?.scrollIntoView({ block: 'center' });
    const box = card.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1540), height: box.height + 16, scale: 1 };
  })()`);
  const groupAdCounterScreenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: groupAdCounterClip,
  });
  await writeFile(new URL(
    "../artifacts/gate4-search-group-ad-count-v441.png", import.meta.url,
  ), Buffer.from(groupAdCounterScreenshot.data, "base64"));

  const groupSitelinks = await evaluate(`(() => {
    const product = guruV194Product(${JSON.stringify(productId)}, state);
    const d = ensureGate4SearchBuild(product.id);
    const entry = g4sbV425FixedGroupEntries(product.id, d)[0];
    const expected = structuredClone(entry.group.sitelinkRows);
    const expectedAdPools = structuredClone(entry.group.adPoolsV439);
    const draft = g4sbOpenSavedGroupEditor(product.id, d, entry.group, entry.jtbd);
    renderGate();
    const section = document.querySelector('[data-g4sb-group-sitelinks]');
    const callouts = section?.parentElement?.querySelector('[data-g4sb-callouts]');
    const adPromptField = document.querySelector(
      '.g4-v166-jtbd[data-g4sb-jtbd-id="' + entry.jtbdId + '"] [data-g4sb-ad-prompt]'
    );
    const adPoolsEditor = document.querySelector(
      '.g4-v166-jtbd[data-g4sb-jtbd-id="' + entry.jtbdId + '"] [data-g4sb-ad-pools-editor]'
    );
    const promptCard = section?.querySelector('[data-g4sb-sitelink-prompt-card]');
    const promptField = promptCard?.querySelector('[data-g4sb-sitelink-prompt]');
    const firstCard = section?.querySelector('[data-g4sb-group-sitelink-card="0"]');
    const context = g4sbV437PromptContext(product.id, d, draft);
    const phrases = g4sbV398AdPromptPhraseList(product.id, context.source, false);
    const strategic = g4sbV398StrategicPromptFields(product.id);
    const ad = context.ads[0];
    const rows = [...(section?.querySelectorAll('[data-g4sb-group-sitelink-card]') || [])]
      .map((card) => Object.fromEntries([...card.querySelectorAll(
        '[data-g4sb-group-sitelink-field]'
      )].map((field) => [field.dataset.g4sbGroupSitelinkField, field.value])));
    const firstTitle = section?.querySelector(
      '[data-g4sb-group-sitelink-index="0"][data-g4sb-group-sitelink-field="sl0"]'
    );
    const originalTitle = firstTitle?.value || '';
    if (firstTitle) {
      firstTitle.value = originalTitle + ' · тест';
      firstTitle.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const inputWrite = draft.sitelinkRows?.[0]?.sl0 === originalTitle + ' · тест';
    if (firstTitle) {
      firstTitle.value = originalTitle;
      firstTitle.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return {
      heading: section?.querySelector('.g4-upstream-title')?.textContent.trim() || '',
      group: context.name,
      jtbd: context.jtbd,
      expected,
      rows,
      inputWrite,
      afterCallouts: Boolean(callouts && section &&
        callouts.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING),
      promptBeforeCards: Boolean(promptCard && firstCard &&
        promptCard.compareDocumentPosition(firstCard) & Node.DOCUMENT_POSITION_FOLLOWING),
      prompt: promptField?.value || '',
      adPrompt: adPromptField?.value || '',
      adPromptReadonly: Boolean(adPromptField?.readOnly),
      adPromptCopyButtons: adPromptField?.closest('.g4-v398-ad-prompt-card')
        ?.querySelectorAll('[data-g4sb-copy-ad-prompt]').length || 0,
      adPools: {
        cards: adPoolsEditor?.querySelectorAll('[data-g4sb-ad-card]').length || 0,
        headlines: [...(adPoolsEditor?.querySelectorAll(
          '[data-g4sb-ad-pool-kind="headlines"]'
        ) || [])].map((field) => field.value),
        texts: [...(adPoolsEditor?.querySelectorAll(
          '[data-g4sb-ad-pool-kind="texts"]'
        ) || [])].map((field) => field.value),
        expected: expectedAdPools,
        draft: structuredClone(draft.adPoolsV439),
        pairs: [...(adPoolsEditor?.querySelectorAll('[data-g4sb-ad-card]') || [])]
          .map((card) => ({
            headline: card.querySelector('[data-g4sb-ad-pool-kind="headlines"]')?.value || '',
            text: card.querySelector('[data-g4sb-ad-pool-kind="texts"]')?.value || '',
          })),
        copyButtons: adPoolsEditor?.querySelectorAll('[data-g4sb-copy-ad-field]').length || 0,
        poolCopyButtons: adPoolsEditor?.querySelectorAll('[data-g4sb-copy-ad-pool]').length || 0,
        legacyCards: adPoolsEditor?.querySelectorAll('.g4-v127-ad').length || 0,
        cardLabels: [...(adPoolsEditor?.querySelectorAll('.g4-v441-ad-card-head strong') || [])]
          .map((item) => item.textContent.trim()),
        extraHeadlineLabels: [...(adPoolsEditor?.querySelectorAll('span, strong') || [])]
          .filter((item) => /Доп\. заголовок/.test(item.textContent || '')).length,
        poolLabels: [...(adPoolsEditor?.querySelectorAll('span, strong') || [])]
          .filter((item) => /Пул заголовков|Пул текстов/.test(item.textContent || '')).length,
        addDisabled: Boolean(adPoolsEditor?.querySelector('[data-g4sb-ad-card-add]')?.disabled),
        variantPrompts: [...(adPoolsEditor?.querySelectorAll('[data-g4sb-ad-card]') || [])]
          .map((card) => {
            const field = card.querySelector('[data-g4sb-ad-variants-prompt]');
            return {
              value: field?.value || '',
              readonly: Boolean(field?.readOnly),
              copyButtons: card.querySelectorAll('[data-g4sb-copy-ad-variants-prompt]').length,
              headlineRows: card.querySelectorAll(
                '[data-g4sb-ad-pool-kind="headlines"]'
              ).length,
              textRows: card.querySelectorAll('[data-g4sb-ad-pool-kind="texts"]').length,
            };
          }),
      },
      promptReadonly: Boolean(promptField?.readOnly),
      promptCopyButtons: promptCard?.querySelectorAll(
        '[data-g4sb-copy-sitelink-prompt]'
      ).length || 0,
      offer: strategic.offer,
      positioning: strategic.positioning,
      adTitle: ad?.ad0 || '',
      adText: ad?.ad2 || '',
      phrases,
      variantPhrases: g4sbV443AdVariantPhraseList(product.id, context.source),
      zeroPhrases: (context.source.keywordRows || []).filter((row) =>
        g4sbV392PhraseCost(row, null).status === 'zero'
      ).map((row) => String(row.kw || '').trim()).filter(Boolean),
      domain: g4sbV426SiteDomain(product.id),
      topLevelCheckSteps: document.querySelectorAll('[data-g4sb-step="check"]').length,
      legacyGlobalFields: document.querySelectorAll('[data-g4sb-sl]').length,
    };
  })()`);
  assert(groupSitelinks.heading === '8. Быстрые ссылки группы' &&
    groupSitelinks.group === groupSitelinks.jtbd && groupSitelinks.afterCallouts &&
    groupSitelinks.promptBeforeCards && groupSitelinks.promptReadonly &&
    groupSitelinks.inputWrite &&
    groupSitelinks.promptCopyButtons === 1 && groupSitelinks.domain === 'https://k-apple.ru' &&
    JSON.stringify(groupSitelinks.rows) === JSON.stringify(groupSitelinks.expected) &&
    groupSitelinks.rows.length === 4 && groupSitelinks.topLevelCheckSteps === 0 &&
    groupSitelinks.legacyGlobalFields === 0 &&
    groupSitelinks.prompt.startsWith(
      'Ты пишешь быстрые ссылки для ОДНОЙ группы объявлений Яндекс.Директ (Поиск).'
    ) &&
    groupSitelinks.prompt.includes(`JTBD: ${groupSitelinks.jtbd}`) &&
    groupSitelinks.prompt.includes(`Оффер/УТП: ${groupSitelinks.offer}`) &&
    groupSitelinks.prompt.includes(`Позиционирование: ${groupSitelinks.positioning}`) &&
    groupSitelinks.prompt.includes(
      `Уже написан заголовок объявления: ${groupSitelinks.adTitle}`
    ) &&
    groupSitelinks.prompt.includes(`Уже написан текст объявления: ${groupSitelinks.adText}`) &&
    groupSitelinks.phrases.every((phrase) => groupSitelinks.prompt.includes(`- ${phrase}`)) &&
    groupSitelinks.zeroPhrases.every((phrase) => !groupSitelinks.prompt.includes(`- ${phrase}`)) &&
    groupSitelinks.prompt.includes('Домен сайта: https://k-apple.ru'),
  `Group sitelinks editor failed: ${JSON.stringify(groupSitelinks)}`);
  assert(groupSitelinks.adPools.cards === 3 &&
    groupSitelinks.adPools.headlines.length === 3 &&
    groupSitelinks.adPools.texts.length === 3 &&
    JSON.stringify(groupSitelinks.adPools.headlines) ===
      JSON.stringify(groupSitelinks.adPools.expected.headlines) &&
    JSON.stringify(groupSitelinks.adPools.texts) ===
      JSON.stringify(groupSitelinks.adPools.expected.texts) &&
    JSON.stringify(groupSitelinks.adPools.draft) ===
      JSON.stringify(groupSitelinks.adPools.expected) &&
    JSON.stringify(groupSitelinks.adPools.pairs) === JSON.stringify(
      groupSitelinks.adPools.expected.headlines.map((headline, index) => ({
        headline, text: groupSitelinks.adPools.expected.texts[index],
      }))
    ) &&
    groupSitelinks.adPools.copyButtons === 6 &&
    groupSitelinks.adPools.poolCopyButtons === 0 &&
    groupSitelinks.adPools.legacyCards === 0 &&
    JSON.stringify(groupSitelinks.adPools.cardLabels) ===
      JSON.stringify(['Объявление 1', 'Объявление 2', 'Объявление 3']) &&
    groupSitelinks.adPools.extraHeadlineLabels === 0 &&
    groupSitelinks.adPools.poolLabels === 0 && groupSitelinks.adPools.addDisabled &&
    groupSitelinks.adPools.variantPrompts.length === 3 &&
    groupSitelinks.adPools.variantPrompts.every((prompt) =>
      prompt.readonly && prompt.copyButtons === 1 &&
      prompt.headlineRows === 1 && prompt.textRows === 1),
  `Group ad pool editor failed: ${JSON.stringify(groupSitelinks.adPools)}`);
  const firstVariantPrompt = groupSitelinks.adPools.variantPrompts[0].value;
  assert(firstVariantPrompt.startsWith(
      'Ты дополняешь ОДНО конкретное комбинаторное объявление Яндекс.Директ (Поиск).'
    ) &&
    firstVariantPrompt.includes(`JTBD группы: ${groupSitelinks.jtbd}`) &&
    firstVariantPrompt.includes(
      `Уже есть заголовок этого объявления: ${groupSitelinks.adPools.pairs[0].headline}`
    ) &&
    firstVariantPrompt.includes(
      `Уже есть текст этого объявления: ${groupSitelinks.adPools.pairs[0].text}`
    ) &&
    !firstVariantPrompt.includes(groupSitelinks.adPools.pairs[1].headline) &&
    !firstVariantPrompt.includes(groupSitelinks.adPools.pairs[1].text) &&
    groupSitelinks.variantPhrases.length === 27 &&
    groupSitelinks.variantPhrases.every((phrase) =>
      firstVariantPrompt.includes(`- ${phrase}`)) &&
    groupSitelinks.zeroPhrases.every((phrase) => !firstVariantPrompt.includes(`- ${phrase}`)) &&
    firstVariantPrompt.includes('5 дополнительных заголовков, каждый ≤56 символов') &&
    firstVariantPrompt.includes('2 дополнительных текста, каждый ≤81 символа') &&
    firstVariantPrompt.includes(
      'https://yandex.ru/support/direct/moderation/ad-rules'
    ),
  `Per-ad variants prompt failed: ${JSON.stringify(firstVariantPrompt)}`);
  const copiedEditorAdFields = await evaluate(`(async () => {
    const copied = [];
    g4sbV141CopyText = async (value) => { copied.push(value); };
    const editor = document.querySelector('[data-g4sb-ad-pools-editor]');
    for (const card of editor.querySelectorAll('[data-g4sb-ad-card]')) {
      for (const button of card.querySelectorAll('[data-g4sb-copy-ad-field]')) {
      button.click();
      await new Promise((resolve) => setTimeout(resolve, 30));
      button.textContent = 'Копировать';
      button.disabled = false;
      }
    }
    return copied;
  })()`);
  assert(JSON.stringify(copiedEditorAdFields) === JSON.stringify(
    groupSitelinks.adPools.pairs.flatMap((pair) => [pair.headline, pair.text])
  ), `Editor ad field copy buttons failed: ${JSON.stringify(copiedEditorAdFields)}`);
  const copiedAdVariantsPrompt = await evaluate(`(async () => {
    window.__g4AdVariantsPromptCopied = '';
    g4sbV141CopyText = async (value) => { window.__g4AdVariantsPromptCopied = value; };
    const button = document.querySelector(
      '[data-g4sb-ad-card="0"] [data-g4sb-copy-ad-variants-prompt]'
    );
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 30));
    return window.__g4AdVariantsPromptCopied;
  })()`);
  assert(copiedAdVariantsPrompt === firstVariantPrompt,
    'Per-ad variants prompt copy button copied the wrong value');
  const adVariantInteraction = await evaluate(`(async () => {
    const d = ensureGate4SearchBuild(${JSON.stringify(productId)});
    const draft = d.clusterDraft;
    const card = document.querySelector('[data-g4sb-ad-card="0"]');
    const prompt = card.querySelector('[data-g4sb-ad-variants-prompt]');
    const originalStored = draft.adPoolsV439.headlines[0];
    const originalRenderGate = renderGate;
    let renderGateCalls = 0;
    renderGate = (...args) => {
      renderGateCalls += 1;
      return originalRenderGate(...args);
    };
    const scrollBefore = window.scrollY;
    const started = performance.now();
    card.querySelector('[data-g4sb-ad-variant-add="headlines"]').click();
    const synchronousMs = performance.now() - started;
    await new Promise((resolve) => requestAnimationFrame(() =>
      requestAnimationFrame(resolve)));
    const settledMs = performance.now() - started;
    const currentCard = document.querySelector('[data-g4sb-ad-card="0"]');
    const fields = [...currentCard.querySelectorAll(
      '[data-g4sb-ad-pool-kind="headlines"]'
    )];
    const addedField = fields[1];
    const sameCard = currentCard === card;
    const samePrompt = currentCard.querySelector('[data-g4sb-ad-variants-prompt]') === prompt;
    const focused = document.activeElement === addedField;
    addedField.value = 'Дополнительный заголовок без перерисовки';
    addedField.dispatchEvent(new Event('input', { bubbles: true }));
    const storedAfterInput = draft.adPoolsV439.headlines[0];
    addedField.closest('[data-g4sb-ad-field-row]')
      .querySelector('[data-g4sb-ad-variant-remove="headlines"]').click();
    await new Promise((resolve) => requestAnimationFrame(() =>
      requestAnimationFrame(resolve)));
    const restoredRows = document.querySelectorAll(
      '[data-g4sb-ad-card="0"] [data-g4sb-ad-pool-kind="headlines"]'
    ).length;
    const restoredStored = draft.adPoolsV439.headlines[0];
    renderGate = originalRenderGate;
    return {
      renderGateCalls, synchronousMs, settledMs, sameCard, samePrompt, focused,
      addedRows: fields.length, restoredRows,
      storedAdditionalValue: storedAfterInput.includes(
        'Дополнительный заголовок без перерисовки'
      ),
      storageRestored: restoredStored === originalStored,
      scrollDelta: Math.abs(window.scrollY - scrollBefore),
    };
  })()`);
  assert(adVariantInteraction.renderGateCalls === 0 &&
    adVariantInteraction.sameCard && adVariantInteraction.samePrompt &&
    adVariantInteraction.focused && adVariantInteraction.addedRows === 2 &&
    adVariantInteraction.restoredRows === 1 &&
    adVariantInteraction.storedAdditionalValue &&
    adVariantInteraction.storageRestored && adVariantInteraction.scrollDelta <= 1,
  `Ad variant interaction is not local: ${JSON.stringify(adVariantInteraction)}`);
  const adVariantLimits = await evaluate(`(() => {
    const d = ensureGate4SearchBuild(${JSON.stringify(productId)});
    const source = d.clusterDraft;
    const draft = structuredClone(source);
    const originalHeadline = g4sbV443PrimaryVariant(
      source.adPoolsV439.headlines[0], G4SB_V443_HEADLINE_VARIANT_MAX, 56
    );
    const originalText = g4sbV443PrimaryVariant(
      source.adPoolsV439.texts[0], G4SB_V443_TEXT_VARIANT_MAX, 81
    );
    draft.adPoolsV439 = {
      headlines: [[originalHeadline, 'Заголовок 2', 'Заголовок 3', 'Заголовок 4',
        'Заголовок 5', 'Заголовок 6', 'Заголовок 7'].join('\\n')],
      texts: [[originalText, 'Текст 2', 'Текст 3'].join('\\n')],
    };
    draft.ads = [];
    const template = document.createElement('template');
    template.innerHTML = g4sbV441AdCardsEditorHtml(
      ${JSON.stringify(productId)}, draft, ${JSON.stringify(groupSitelinks.jtbd)}
    ).trim();
    const editor = template.content.firstElementChild;
    const legacy = g4sbV439PoolsToLegacyAds(draft.adPoolsV439, false);
    return {
      headlineRows: editor.querySelectorAll(
        '[data-g4sb-ad-card="0"] [data-g4sb-ad-pool-kind="headlines"]'
      ).length,
      textRows: editor.querySelectorAll(
        '[data-g4sb-ad-card="0"] [data-g4sb-ad-pool-kind="texts"]'
      ).length,
      headlineAddDisabled: Boolean(editor.querySelector(
        '[data-g4sb-ad-card="0"] [data-g4sb-ad-variant-add="headlines"]'
      )?.disabled),
      textAddDisabled: Boolean(editor.querySelector(
        '[data-g4sb-ad-card="0"] [data-g4sb-ad-variant-add="texts"]'
      )?.disabled),
      legacyHeadline: legacy[0]?.ad0 || '',
      legacyText: legacy[0]?.ad2 || '',
      originalHeadline,
      originalText,
    };
  })()`);
  assert(adVariantLimits.headlineRows === 7 && adVariantLimits.textRows === 3 &&
    adVariantLimits.headlineAddDisabled && adVariantLimits.textAddDisabled &&
    adVariantLimits.legacyHeadline === adVariantLimits.originalHeadline &&
    adVariantLimits.legacyText === adVariantLimits.originalText,
  `Per-ad variant limits failed: ${JSON.stringify(adVariantLimits)}`);
  assert(groupSitelinks.adPromptReadonly && groupSitelinks.adPromptCopyButtons === 1 &&
    groupSitelinks.adPrompt.startsWith(
      'Ты пишешь контент для ОДНОЙ группы комбинаторного объявления Яндекс.Директ (Поиск).'
    ) &&
    groupSitelinks.adPrompt.includes('Создай до 3 отдельных комбинаторных объявлений') &&
    groupSitelinks.adPrompt.includes('Объявление 1\nЗаголовок: ...\nТекст: ...') &&
    groupSitelinks.adPrompt.includes('Объявление 3\nЗаголовок: ...\nТекст: ...') &&
    !groupSitelinks.adPrompt.includes('Доп. заголовок') &&
    !groupSitelinks.adPrompt.includes('Пул заголовков') &&
    !groupSitelinks.adPrompt.includes('Пул текстов'),
  `Combinatorial ad prompt failed: ${JSON.stringify(groupSitelinks.adPrompt)}`);

  const editorAdCardsClip = await evaluate(`(() => {
    const section = document.querySelector('[data-g4sb-ad-pools-editor]');
    const prompt = section.querySelector('.g4-v398-ad-prompt-card');
    prompt.hidden = true;
    section.scrollIntoView({ block: 'start' });
    const box = section.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1540), height: box.height + 16, scale: 1 };
  })()`);
  const editorAdCardsScreenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: editorAdCardsClip,
  });
  await writeFile(new URL(
    "../artifacts/gate4-search-group-ad-cards-v441.png", import.meta.url,
  ), Buffer.from(editorAdCardsScreenshot.data, "base64"));
  const adVariantsPromptClip = await evaluate(`(() => {
    const card = document.querySelector('[data-g4sb-ad-card="0"]');
    const field = card.querySelector('[data-g4sb-ad-variants-prompt]');
    field.style.maxHeight = 'none';
    field.style.height = field.scrollHeight + 'px';
    field.style.resize = 'none';
    card.scrollIntoView({ block: 'start' });
    const box = card.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1540), height: box.height + 16, scale: 1 };
  })()`);
  const adVariantsPromptScreenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: adVariantsPromptClip,
  });
  await writeFile(new URL(
    "../artifacts/gate4-search-goat-ad-1-variants-prompt-v443.png", import.meta.url,
  ), Buffer.from(adVariantsPromptScreenshot.data, "base64"));
  await evaluate(`(() => {
    const prompt = document.querySelector(
      '[data-g4sb-ad-pools-editor] .g4-v398-ad-prompt-card'
    );
    if (prompt) prompt.hidden = false;
  })()`);

  const copiedSitelinkPrompt = await evaluate(`(async () => {
    window.__g4SitelinkPromptCopied = '';
    g4sbV141CopyText = async (value) => { window.__g4SitelinkPromptCopied = value; };
    const button = document.querySelector(
      '[data-g4sb-group-sitelinks] [data-g4sb-copy-sitelink-prompt]'
    );
    button.click();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const copied = window.__g4SitelinkPromptCopied;
    button.textContent = 'Копировать';
    button.disabled = false;
    return copied;
  })()`);
  assert(copiedSitelinkPrompt === groupSitelinks.prompt,
    'Sitelink prompt copy button copied the wrong value');

  const groupSitelinksClip = await evaluate(`(() => {
    const item = document.querySelector('[data-g4sb-group-sitelinks]');
    item.scrollIntoView({ block: 'start' });
    const box = item.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1540), height: box.height + 16, scale: 1 };
  })()`);
  const groupSitelinksScreenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: groupSitelinksClip,
  });
  await writeFile(new URL("../artifacts/gate4-search-group-sitelinks-v437.png", import.meta.url),
    Buffer.from(groupSitelinksScreenshot.data, "base64"));

  const combinatorialPromptClip = await evaluate(`(() => {
    const field = document.querySelector('[data-g4sb-ad-prompt]');
    const section = field.closest('.g4-v127-editor-section');
    const card = field.closest('.g4-v398-ad-prompt-card');
    field.style.maxHeight = 'none';
    field.style.height = field.scrollHeight + 'px';
    field.style.resize = 'none';
    section.scrollIntoView({ block: 'start' });
    const sectionBox = section.getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    return { x: Math.max(0, sectionBox.left + scrollX - 8),
      y: Math.max(0, sectionBox.top + scrollY - 8),
      width: Math.min(sectionBox.width + 16, 1540),
      height: cardBox.bottom - sectionBox.top + 16, scale: 1 };
  })()`);
  const combinatorialPromptScreenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: combinatorialPromptClip,
  });
  await writeFile(new URL(
    "../artifacts/gate4-search-goat-combinatorial-ad-prompt-v441.png", import.meta.url,
  ), Buffer.from(combinatorialPromptScreenshot.data, "base64"));

  const savedGroupSitelinks = await evaluate(`(() => {
    const d = ensureGate4SearchBuild(${JSON.stringify(productId)});
    const expected = structuredClone(d.clusterDraft.sitelinkRows);
    const expectedAdPools = g4sbV439CleanPools(d.clusterDraft.adPoolsV439);
    const saved = g4sbSaveClusterDraft(${JSON.stringify(productId)}, d);
    const row = d.groupRows.find((item) => g4sbV420GroupId(item) === String(saved?.id || ''));
    const index = d.groupRows.indexOf(row);
    return { saved: Boolean(saved), fixed: g4sbGroupIsFixed(row),
      rows: structuredClone(row?.sitelinkRows || []), expected,
      adPools: structuredClone(row?.adPoolsV439 || {}), expectedAdPools,
      extraHeadlines: (d.adsRows?.[index] || []).map((ad) => ad.ad1)
        .filter((value) => String(value || '').trim()),
    };
  })()`);
  assert(savedGroupSitelinks.saved && savedGroupSitelinks.fixed &&
    JSON.stringify(savedGroupSitelinks.rows) === JSON.stringify(savedGroupSitelinks.expected) &&
    JSON.stringify(savedGroupSitelinks.adPools) ===
      JSON.stringify(savedGroupSitelinks.expectedAdPools) &&
    savedGroupSitelinks.extraHeadlines.length === 0,
  `Group sitelinks were not saved with the group: ${JSON.stringify(savedGroupSitelinks)}`);

  console.log(JSON.stringify({
    ok: true,
    emptyFact,
    lowFact,
    withFact,
    fallback,
    realThreeGroups,
    screenshot: "artifacts/gate4-search-launch-summary-compact-v421.png",
    planScreenshot: "artifacts/gate4-search-control-plan-v421.png",
    integratedGroupScreenshot: "artifacts/gate4-search-launch-group-sitelinks-v437.png",
    launchAdsLinkScreenshot: "artifacts/gate4-search-launch-ads-link-v441.png",
    launchAdCardsScreenshot: "artifacts/gate4-search-launch-ad-cards-v442.png",
    perGroupScreenshots,
    groupSitelinksScreenshot: "artifacts/gate4-search-group-sitelinks-v437.png",
    editorAdCardsScreenshot: "artifacts/gate4-search-group-ad-cards-v441.png",
    adVariantsPromptScreenshot:
      "artifacts/gate4-search-goat-ad-1-variants-prompt-v443.png",
    combinatorialPromptScreenshot:
      "artifacts/gate4-search-goat-combinatorial-ad-prompt-v441.png",
    groupSitelinks,
    savedGroupSitelinks,
    copiedKeywords,
    launchAdsNavigation,
    copiedEditorAdFields,
    copiedAdVariantsPrompt,
    adVariantInteraction,
    jtbdToggleInteraction,
    adVariantLimits,
    copiedLaunchAdFields,
    copiedLaunchSitelink,
    copiedSitelinkPrompt,
    strategyBudgetScreenshot: "artifacts/gate4-search-strategy-weekly-budget-v431.png",
    targetCpaScreenshot: "artifacts/gate4-search-strategy-target-cpa-v435.png",
    campaignNameScreenshot: "artifacts/gate4-search-campaign-name-v432.png",
    campaignUrlFieldsScreenshot: "artifacts/gate4-search-campaign-url-fields-v434.png",
    groupAdCounterScreenshot: "artifacts/gate4-search-group-ad-count-v441.png",
    copiedCampaignName,
    copiedCampaignUrlFields,
    emptyCampaignName,
    copiedTargetCpa,
    emptyTargetCpa,
    independentAdTypeChecks,
  }, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
