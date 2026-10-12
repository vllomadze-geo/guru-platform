import { readFile, writeFile } from "node:fs/promises";

const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9395";
const fullPath = process.env.GURU_PROJECT_EXPORT || "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const gate4Path = process.env.GURU_GATE4_EXPORT || "/Users/vl/Downloads/gate-4.json";
const goatId = "catalog-item-1786792591872-51f503";
const shirtId = "catalog-item-1786792591872-c8b1e9";
const smokeId = "gate4-search-jtbd-audience-forecast-smoke";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

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

const fullExport = JSON.parse(await readFile(fullPath, "utf8"));
const gate4Export = JSON.parse(await readFile(gate4Path, "utf8"));
assert(fullExport.project?.id === gate4Export.project?.id, "Project exports differ");
const fixture = structuredClone(fullExport.workspace);
fixture.project.id = smokeId;
fixture.project.name = "Gate 4 JTBD audience forecast smoke";
fixture.gate4SearchBuild = structuredClone(gate4Export.content.gate4SearchBuild);
fixture.gate4Production = structuredClone(gate4Export.content.gate4Production);
const goatBuildFixture = Object.entries(fixture.gate4SearchBuild)
  .find(([key]) => key.includes("51f503"))?.[1];
if (goatBuildFixture?.clusterDraft) goatBuildFixture.clusterDraft.open = false;
const products = fixture.project.catalogItemsV189 || [];
const goat = products.find((item) => item.id === goatId);
const shirt = products.find((item) => item.id === shirtId);
assert(goat && shirt, "Goat and Shirt products missing");

const browserVersion = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new Cdp(browserVersion.webSocketDebuggerUrl);
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
  for (let i = 0; i < 180; i += 1) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await pause(100);
  }
  throw new Error(`Timed out: ${expression}`);
}

async function capture(selector, file, maxHeight = 1800) {
  const clip = await evaluate(`(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    if (!node) return null;
    node.scrollIntoView({ block: "start" });
    const box = node.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 12),
      y: Math.max(0, box.top + scrollY - 12),
      width: Math.min(box.width + 24, 1510),
      height: Math.min(box.height + 24, ${maxHeight}), scale: 1 };
  })()`);
  assert(clip, `Screenshot target missing: ${selector}`);
  await pause(200);
  const result = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip,
  });
  await writeFile(new URL(`../artifacts/${file}`, import.meta.url), Buffer.from(result.data, "base64"));
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
    workspace.project.name = "Gate 4 JTBD audience forecast smoke";
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
  await waitFor('Boolean(state) && typeof g4sbV386JtbdPhraseRows === "function"');
  const setup = await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    state = ${JSON.stringify(fixture)};
    activeProjectId = ${JSON.stringify(smokeId)};
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = ${JSON.stringify(goat.categoryId)};
    ui.selectedProductId = ${JSON.stringify(goatId)};
    const channel = g4LaunchChannels().find(g4IsYandexSearchChannel);
    if (!channel) throw new Error("Yandex Search channel missing");
    const open = g4EnsureLaunchUiState();
    open.rows[g4CampaignStateKey(${JSON.stringify(goatId)}, channel.key)] = true;
    open.rows[g4CampaignStateKey(${JSON.stringify(shirtId)}, channel.key)] = true;
    const goatCampaign = g4EnsureLaunchCampaigns()[g4CampaignStateKey(${JSON.stringify(goatId)}, channel.key)];
    const shirtCampaign = g4EnsureLaunchCampaigns()[g4CampaignStateKey(${JSON.stringify(shirtId)}, channel.key)];
    const audience = ensureTargetAudience().segments[0];
    const initialTargeting = JSON.stringify(goatCampaign.channelTargeting);
    const shirtTargeting = JSON.stringify(shirtCampaign.channelTargeting);
    const shirtBuild = ensureGate4SearchBuild(${JSON.stringify(shirtId)});
    const shirtPhrases = JSON.stringify(shirtBuild.groupRows[0]?.demandRows || []);
    const shirtGroup = JSON.stringify(shirtBuild.groupRows[0] || {});
    guruNavigateToGate("gate-4");
    return { channelKey: channel.key, segmentId: audience.id,
      initialTargeting, shirtTargeting, shirtPhrases, shirtGroup };
  })()`);
  await waitFor(`document.querySelector('[data-gate0-scope-product-select="gate4-launch"]')?.value === ${JSON.stringify(goatId)}`);

  await evaluate(`(() => {
    const input = document.querySelector('[data-campaign-audience-product="${goatId}"][data-campaign-audience-channel="${setup.channelKey}"]');
    if (!input) throw new Error("Audience selector missing");
    input.value = ${JSON.stringify(setup.segmentId)};
    input.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await waitFor(`document.querySelector('[data-campaign-audience-jtbd-product="${goatId}"]')`);
  const noLink = await evaluate(`(() => {
    const panel = document.querySelector('[data-campaign-audience-panel="' + g4CampaignStateKey(${JSON.stringify(goatId)}, ${JSON.stringify(setup.channelKey)}) + '"]');
    return [...panel.querySelectorAll('.campaign-audience-summary b')].map((node) => node.textContent.trim());
  })()`);
  assert(noLink[2] === "Выберите JTBD выбранного товара", `Unlinked JTBD was guessed: ${JSON.stringify(noLink)}`);
  assert(!noLink.join(" ").includes("Ноить одежду"), "Shirt JTBD leaked into Goat audience");

  const additional = await evaluate(`g4sbItemJtbdList(${JSON.stringify(goatId)}, ${JSON.stringify(goatId)})[2]`);
  assert(additional?.id?.startsWith("additional-jtbd-"), "Second additional JTBD ID missing");
  await evaluate(`(() => {
    const input = document.querySelector('[data-campaign-audience-jtbd-product="${goatId}"][data-campaign-audience-jtbd-channel="${setup.channelKey}"]');
    input.value = ${JSON.stringify(additional.id)};
    input.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await waitFor(`g4EnsureLaunchCampaigns()[g4CampaignStateKey(${JSON.stringify(goatId)}, ${JSON.stringify(setup.channelKey)})]?.audienceJtbdId === ${JSON.stringify(additional.id)}`);
  const audience = await evaluate(`(() => {
    const campaign = g4EnsureLaunchCampaigns()[g4CampaignStateKey(${JSON.stringify(goatId)}, ${JSON.stringify(setup.channelKey)})];
    const panel = document.querySelector('[data-campaign-audience-panel="' + g4CampaignStateKey(${JSON.stringify(goatId)}, ${JSON.stringify(setup.channelKey)}) + '"]');
    return { values: [...panel.querySelectorAll('.campaign-audience-summary b')].map((node) => node.textContent.trim()),
      targeting: JSON.stringify(campaign.channelTargeting), jtbdId: campaign.audienceJtbdId };
  })()`);
  assert(audience.values[2] === additional.text, "Audience did not show one selected JTBD");
  assert(!audience.values.join(" ").includes("Ноить одежду"), "Cross-product audience aggregation remains");
  assert(audience.targeting === setup.initialTargeting, "Manual targeting was changed");
  await capture(`[data-campaign-audience-panel]`, "gate4-search-audience-v386.png", 1100);

  const goatStructure = await evaluate(`(() => {
    const coverage = document.querySelector('.g4-v166-coverage');
    const list = coverage?.querySelector('.g4-v166-jtbd-list');
    const open = [...list.querySelectorAll(':scope > .g4-v166-jtbd[data-g4sb-jtbd-id][open]')];
    const button = coverage?.querySelector('[data-g4sb-draft-save]');
    return { cards: list?.querySelectorAll(':scope > .g4-v166-jtbd').length || 0,
      buttons: coverage?.querySelectorAll('[data-g4sb-draft-save]').length || 0,
      oldButtons: coverage?.querySelectorAll('[data-g4sb-create-group-for-jtbd]').length || 0,
      redundantSelect: Boolean(coverage?.querySelector('[data-g4sb-create-jtbd-select]')),
      openCards: open.length,
      buttonInsideOpenCard: open[0]?.contains(button) || false,
      buttonLabel: button?.textContent.trim() || "",
      editorInsideOpenCard: Boolean(open[0]?.querySelector('.g4-v126-editor')),
      fullStructure: ["Фундамент группы", "Ключевые фразы группы", "Прогноз группы",
        "Минус-фразы группы", "Объявления группы"].every((section) =>
        open[0]?.querySelector('.g4-v126-editor')?.textContent.includes(section)),
      selectedRows: [...open[0]?.querySelectorAll('.g4-v128-selector:not(.g4-v150-excluded-table) [data-g4sb-phrase-select]') || []]
        .filter((row) => row.checked).length };
  })()`);
  assert(goatStructure.cards === 3 && goatStructure.buttons === 1 &&
    goatStructure.oldButtons === 0 && !goatStructure.redundantSelect &&
    goatStructure.openCards === 1 && goatStructure.buttonInsideOpenCard &&
    goatStructure.buttonLabel === "+ Создать группу объявлений" &&
    goatStructure.editorInsideOpenCard && goatStructure.fullStructure &&
    goatStructure.selectedRows > 0,
  `Goat JTBD structure is unclear: ${JSON.stringify(goatStructure)}`);
  await capture(".g4-v166-coverage", "gate4-search-jtbd-structure-v390.png", 1600);

  const gate1VsSearch = await evaluate(`(() => {
    const product = ${JSON.stringify(goatId)};
    const { itemData } = g4sbV385ProductSource(product);
    const currentMain = guruGate1ResolvedMainJtbdV259(product).value;
    const legacyMain = itemData.semL4?.[0] || "";
    const main = g4sbItemJtbdList(product, product)[0];
    const sourceRows = guruGate1GroupFinalEntriesV279("primary", "", product, itemData)
      .map((entry) => entry.demandRow);
    const searchRows = g4sbV386JtbdPhraseRows(product, main.id);
    const metrics = (row) => ["kw", "vol", "forecastClicks", "forecastBudget"]
      .map((key) => String(row?.[key] ?? ""));
    const sourceByKey = new Map(sourceRows.map((row) => [guruV247KeywordNormalize(row.kw), metrics(row)]));
    const visibleRows = [...document.querySelectorAll(
      '.g4-v166-jtbd[open] .g4-v128-selector:not(.g4-v150-excluded-table) [data-g4sb-phrase-select]'
    )].filter((input) => input.checked).map((input) => input.getAttribute('data-g4sb-phrase-select'));
    return { currentMain, legacyMain, searchMain: main.text,
      gate1Count: sourceRows.length, searchCount: searchRows.length,
      sameMetrics: searchRows.every((row) => JSON.stringify(metrics(row)) ===
        JSON.stringify(sourceByKey.get(guruV247KeywordNormalize(row.kw)))),
      sameOrder: JSON.stringify(visibleRows) === JSON.stringify(sourceRows.map((row) => row.kw)),
      firstVisible: visibleRows[0],
      sample: searchRows.find((row) => guruV247KeywordNormalize(row.kw) ===
        guruV247KeywordNormalize("подарок на новый год 2027")) };
  })()`);
  assert(gate1VsSearch.currentMain === gate1VsSearch.searchMain &&
    gate1VsSearch.currentMain !== gate1VsSearch.legacyMain &&
    gate1VsSearch.gate1Count === 14 && gate1VsSearch.searchCount === 14 &&
    gate1VsSearch.sameMetrics && gate1VsSearch.sameOrder &&
    gate1VsSearch.sample?.vol === "413" &&
    gate1VsSearch.sample?.forecastClicks === "48",
  `Search still differs from Gate 1 primary JTBD: ${JSON.stringify(gate1VsSearch)}`);

  const costAnalysis = await evaluate(`(() => {
    const product = ${JSON.stringify(goatId)};
    const draft = ensureGate4SearchBuild(product).clusterDraft;
    const group = g4sbV392GroupCost(draft.keywordRows);
    const card = document.querySelector('.g4-v166-jtbd[data-g4sb-jtbd-id][open]');
    const row = (phrase) => [...card.querySelectorAll('.g4-v128-selector:not(.g4-v150-excluded-table) tbody tr')]
      .find((tr) => tr.querySelector('[data-g4sb-phrase-select]')?.dataset.g4sbPhraseSelect === phrase);
    const overpay = row('новогодний подарок Москва');
    const normal = row('подарок на новый год 2027');
    const zero = row('дизайнерская коза');
    const under = row('символ 2027 года коза');
    const lowReach = row('коза для интерьера');
    const partial = g4sbV128Forecast([
      { kw: 'с метриками', vol: '10', forecastClicks: '2', forecastBudget: '20' },
      { kw: 'без метрик', vol: '', forecastClicks: '', forecastBudget: '' },
    ]);
    const forecastValue = (label) => [...card.querySelectorAll('.g4-v140-forecast-table > table > tbody > tr')]
      .find((tr) => tr.querySelector('td:first-child strong')?.textContent.trim() === label)
      ?.querySelector('td:nth-child(3)')?.textContent.replace(/\\s/g, '') || '';
    return { forecast: group.forecast, groupCpc: group.cpc,
      displayedForecast: { impressions: forecastValue('Прогноз показов'),
        clicks: forecastValue('Прогноз кликов'), budget: forecastValue('Бюджет') },
      overpay: { cpc: Number(overpay?.dataset.g4sbCostCpc),
        index: Number(overpay?.dataset.g4sbCostIndex), status: overpay?.dataset.g4sbCostStatus,
        editableDerived: overpay?.querySelectorAll('td:nth-child(6) input, td:nth-child(7) input').length },
      normal: { cpc: Number(normal?.dataset.g4sbCostCpc),
        index: Number(normal?.dataset.g4sbCostIndex), status: normal?.dataset.g4sbCostStatus },
      zero: { index: zero?.dataset.g4sbCostIndex, status: zero?.dataset.g4sbCostStatus,
        action: zero?.querySelector('.g4-v392-cost-status small')?.textContent },
      under: { status: under?.dataset.g4sbCostStatus,
        action: under?.querySelector('.g4-v392-cost-status small')?.textContent },
      lowReach: { status: lowReach?.dataset.g4sbCostStatus },
      top: card.querySelector('[data-g4sb-top-overpay]')?.textContent.trim() || '',
      partial: { impressions: partial.impressions, clicks: partial.clicks,
        budget: partial.budget, coverage: partial.coverage } };
  })()`);
  assert(costAnalysis.forecast.count === 14 &&
    costAnalysis.forecast.impressions === 1182 &&
    costAnalysis.forecast.clicks === 121 &&
    costAnalysis.forecast.budget === 12189.7 &&
    costAnalysis.displayedForecast.impressions.includes('1182') &&
    costAnalysis.displayedForecast.clicks.includes('121') &&
    costAnalysis.displayedForecast.budget.includes('12189,7₽') &&
    Math.abs(costAnalysis.groupCpc - 100.74) < 0.01 &&
    costAnalysis.overpay.cpc === 234.8 &&
    Math.abs(costAnalysis.overpay.index - 2.33) < 0.01 &&
    costAnalysis.overpay.status === 'overpay' && !costAnalysis.overpay.editableDerived &&
    Math.abs(costAnalysis.normal.index - 1.06) < 0.01 &&
    costAnalysis.normal.status === 'normal' &&
    costAnalysis.zero.index === '' && costAnalysis.zero.status === 'zero' &&
    costAnalysis.zero.action === 'заменить формулировку' &&
    costAnalysis.under.status === 'under' &&
    costAnalysis.under.action === 'поднять ставку/охват' &&
    costAnalysis.lowReach.status === 'lowReach' &&
    costAnalysis.top.includes('новогодний подарок Москва') &&
    costAnalysis.top.includes('минус-слова или лимит ставки') &&
    costAnalysis.partial.impressions === 10 && costAnalysis.partial.clicks === 2 &&
    costAnalysis.partial.budget === 20 && costAnalysis.partial.coverage.clicks === 1,
  `Goat keyword cost analysis is wrong: ${JSON.stringify(costAnalysis)}`);
  const budgetRisk = await evaluate(`(() => {
    const card = document.querySelector('.g4-v166-jtbd[data-g4sb-jtbd-id][open]');
    const find = (label) => [...card.querySelectorAll('.g4-v140-forecast-table > table > tbody > tr')]
      .find((tr) => tr.querySelector('td:first-child strong')?.textContent.trim() === label);
    const visible = find('Бюджет в зоне риска');
    const currentDraft = ensureGate4SearchBuild(${JSON.stringify(goatId)}).clusterDraft;
    const current = g4sbV395BudgetRisk(currentDraft.keywordRows);
    const overpaidInSection3 = card.querySelectorAll(
      '.g4-v128-selector:not(.g4-v150-excluded-table) tr[data-g4sb-cost-status="overpay"]',
    ).length;
    const overpaid = [2000, 1800, 1700, 1600, 1867].map((budget, index) => ({
      kw: 'переплата ' + index, vol: '100',
      forecastClicks: String([2, 3, 10, 12, 13][index]),
      forecastBudget: String(budget),
    }));
    const regular = Array.from({ length: 25 }, (_, index) => ({
      kw: 'обычная ' + index, vol: '100',
      forecastClicks: index === 24 ? '20' : '10',
      forecastBudget: index === 24 ? '716.87' : '400',
    }));
    const rows = [...overpaid, ...regular];
    const forecast = g4sbV128Forecast(rows);
    const risk = g4sbV395BudgetRisk(rows);
    const assessment = g4sbV140ForecastAssessment({
      keywordRows: rows, col2: String(forecast.impressions),
      col3: String(forecast.clicks), col4: String(forecast.budget),
    }, rows.length, {}, ${JSON.stringify(goatId)});
    const riskRow = assessment.rows.find((row) => row.key === 'risk-budget');
    const budgetRow = assessment.rows.find((row) => row.key === 'budget');
    const noRisk = g4sbV395BudgetRisk([
      { kw: 'ровный 1', vol: '100', forecastClicks: '10', forecastBudget: '100' },
      { kw: 'ровный 2', vol: '100', forecastClicks: '10', forecastBudget: '100' },
    ]);
    return { visible: visible?.textContent.trim() || '', current,
      overpaidInSection3, forecast, risk, riskRow, budgetOfficial: budgetRow.official,
      noRisk };
  })()`);
  assert(budgetRisk.current?.count === budgetRisk.overpaidInSection3 &&
    budgetRisk.visible.includes('Бюджет в зоне риска') &&
    budgetRisk.visible.includes('1 фраза') &&
    budgetRisk.risk?.budget === 8967 &&
    Math.abs(budgetRisk.risk.share - 46.5) < 0.05 &&
    budgetRisk.risk.count === 5 && budgetRisk.risk.lowClickCount === 2 &&
    budgetRisk.forecast.count === 30 &&
    budgetRisk.riskRow.value.includes('8 967 ₽ (46,5%), 5 фраз') &&
    budgetRisk.riskRow.detail.includes('2 из 5 фраз в Переплате основаны на ≤3 кликах') &&
    budgetRisk.budgetOfficial === 'См. актуальный минимум в кабинете Директа при создании кампании' &&
    budgetRisk.noRisk.count === 0 && budgetRisk.noRisk.lowClickCount === 0,
  `Budget risk calculation failed: ${JSON.stringify(budgetRisk)}`);
  await capture('.g4-v166-jtbd[data-g4sb-jtbd-id][open] .g4-v126-keywords',
    'gate4-search-goat-keyword-cost-v392.png', 1900);
  await capture('.g4-v166-jtbd[data-g4sb-jtbd-id][open] .g4-v127-editor-section',
    'gate4-search-goat-group-forecast-v392.png', 1150);

  const migratedAutoDraft = await evaluate(`(() => {
    const product = ${JSON.stringify(goatId)};
    const build = ensureGate4SearchBuild(product);
    const { product: catalogProduct, itemData } = g4sbV385ProductSource(product);
    const jtbdId = "primary:" + product;
    const previousRows = g4sbV390LegacyAutoPhraseRows(catalogProduct, itemData, jtbdId);
    build.clusterDraft.keywordRows = previousRows;
    build.clusterDraft.minus = "Сохранить введённые минус-фразы";
    delete build.clusterDraft.autoSourceSignatureV390;
    renderGate();
    return { oldCount: previousRows.length, newCount: build.clusterDraft.keywordRows.length,
      minus: build.clusterDraft.minus, savedGroups: build.groupRows.length };
  })()`);
  assert(migratedAutoDraft.oldCount === 2 && migratedAutoDraft.newCount === 14 &&
    migratedAutoDraft.minus === "Сохранить введённые минус-фразы" &&
    migratedAutoDraft.savedGroups === 0,
  `Earlier auto draft did not refresh safely: ${JSON.stringify(migratedAutoDraft)}`);

  const expected = await evaluate(`(() => {
    const jtbds = g4sbItemJtbdList(${JSON.stringify(goatId)}, ${JSON.stringify(goatId)});
    return jtbds.map((jtbd) => ({ id: jtbd.id,
      phrases: g4sbV386JtbdPhraseRows(${JSON.stringify(goatId)}, jtbd.id)
        .map((row) => ({ kw: row.kw, vol: row.vol, clicks: row.forecastClicks, budget: row.forecastBudget })) }));
  })()`);
  assert(expected.length === 3, `Goat JTBD count changed: ${expected.length}`);
  assert(expected[1].phrases.length > 0 && expected[2].phrases.length > 0,
    "Additional JTBDs have no assigned phrases");
  assert(!expected[2].phrases.some((row) => expected[1].phrases.some((other) => other.kw === row.kw)),
    "Additional JTBD phrases overlap");

  const selectedCard = await evaluate(`(() => {
    const jtbd = g4sbV166DirectionJtbds(${JSON.stringify(goatId)})[2];
    document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[2].querySelector('summary').click();
    const card = document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[2];
    const button = card?.querySelector('[data-g4sb-draft-save]');
    if (card?.dataset.g4sbJtbdId !== jtbd.key || !button)
      throw new Error("Full group editor was not scoped to the expanded JTBD");
    const draft = ensureGate4SearchBuild(${JSON.stringify(goatId)}).clusterDraft;
    return { id: card.dataset.g4sbJtbdId,
      rows: draft.keywordRows.map((row) => ({ kw: row.kw, vol: row.vol,
        clicks: row.forecastClicks, budget: row.forecastBudget })),
      selected: [...card.querySelectorAll('.g4-v128-selector:not(.g4-v150-excluded-table) [data-g4sb-phrase-select]')]
        .filter((row) => row.checked).length,
      buttonLabel: button.textContent.trim(),
      fullStructure: ["Фундамент группы", "Ключевые фразы группы", "Прогноз группы",
        "Минус-фразы группы", "Объявления группы"].every((section) =>
        card.querySelector('.g4-v126-editor')?.textContent.includes(section)),
      buttons: document.querySelectorAll('[data-g4sb-draft-save]').length,
      openCards: document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id][open]').length,
      firstStillOpen: document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[0].open };
  })()`);
  assert(selectedCard.id === expected[2].id &&
    selectedCard.rows.length === expected[2].phrases.length &&
    selectedCard.rows.every((row, index) => JSON.stringify(row) === JSON.stringify(expected[2].phrases[index])) &&
    selectedCard.selected === selectedCard.rows.length &&
    selectedCard.fullStructure && selectedCard.buttons === 2 &&
    selectedCard.openCards === 2 && selectedCard.firstStillOpen &&
    selectedCard.buttonLabel === "+ Создать группу объявлений",
  `Selected JTBD shows wrong Gate 1 rows: ${JSON.stringify(selectedCard)}`);
  await capture(`.g4-v166-jtbd[data-g4sb-jtbd-id="${expected[2].id}"]`, "gate4-search-goat-jtbd3-v391.png", 4200);
  await waitFor(`ensureGate4SearchBuild(${JSON.stringify(goatId)}).clusterDraft.jtbdId === ${JSON.stringify(additional.id)}`);
  const group = await evaluate(`(() => {
    const build = ensureGate4SearchBuild(${JSON.stringify(goatId)});
    const draft = build.clusterDraft;
    const forecast = g4sbV128Forecast(draft.keywordRows, draft);
    return { savedGroups: build.groupRows.length, jtbdId: draft.jtbdId,
      phraseCount: draft.keywordRows.length,
      phrases: draft.keywordRows.map((row) => row.kw),
      forecast: { impressions: forecast.impressions, clicks: forecast.clicks,
        budget: forecast.budget, hasClicks: forecast.hasPhraseClicks },
      visibleRows: [...document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id="${expected[2].id}"] .g4-v128-selector:not(.g4-v150-excluded-table) [data-g4sb-phrase-select]')].map((node) => ({ kw: node.dataset.g4sbPhraseSelect, checked: node.checked })) };
  })()`);
  assert(group.savedGroups === 0, "Opening a draft created a saved group");
  assert(group.phraseCount === expected[2].phrases.length, "Additional JTBD draft phrase count differs from Gate 1");
  assert(group.visibleRows.length === group.phraseCount && group.visibleRows.every((row) => row.checked),
    "Additional JTBD phrase bank is not scoped to its selected phrases");
  const expectedForecast = {
    impressions: expected[2].phrases.reduce((sum, row) => sum + Number(row.vol), 0),
    clicks: expected[2].phrases.reduce((sum, row) => sum + Number(row.clicks), 0),
    budget: Math.round(expected[2].phrases.reduce((sum, row) => sum + Number(row.budget), 0) * 100) / 100,
  };
  assert(group.forecast.impressions === expectedForecast.impressions &&
    group.forecast.clicks === expectedForecast.clicks && group.forecast.budget === expectedForecast.budget,
    `Additional JTBD forecast sums differ: ${JSON.stringify(group.forecast)}`);
  await capture(`.g4-v166-jtbd[data-g4sb-jtbd-id="${expected[2].id}"] .g4-v128-selector:not(.g4-v150-excluded-table)`, "gate4-search-goat-additional-phrases-v391.png", 1800);
  await capture(`.g4-v166-jtbd[data-g4sb-jtbd-id="${expected[2].id}"] .g4-v127-editor-section`, "gate4-search-goat-additional-forecast-v391.png", 1200);

  for (const index of [1, 0]) {
    const next = await evaluate(`(() => {
      const build = ensureGate4SearchBuild(${JSON.stringify(goatId)});
      const jtbd = g4sbV166DirectionJtbds(${JSON.stringify(goatId)})[${index}];
      const target = document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[${index}];
      if (!target.open) target.querySelector('summary').click();
      const card = document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[${index}];
      card?.querySelector('[data-g4sb-draft-oper="minus"]')?.focus();
      const button = card?.querySelector('[data-g4sb-draft-save]');
      if (card?.dataset.g4sbJtbdId !== jtbd.key || !button)
        throw new Error("Full editor missing from expanded JTBD card");
      return { jtbdId: build.clusterDraft.jtbdId,
        phrases: build.clusterDraft.keywordRows.map((row) => row.kw),
        savedGroups: build.groupRows.length,
        buttonLabel: button.textContent.trim(),
        fullStructure: ["Фундамент группы", "Ключевые фразы группы", "Прогноз группы",
          "Минус-фразы группы", "Объявления группы"].every((section) =>
          card.querySelector('.g4-v126-editor')?.textContent.includes(section)),
        selected: [...card.querySelectorAll('.g4-v128-selector:not(.g4-v150-excluded-table) [data-g4sb-phrase-select]')]
          .filter((row) => row.checked).length,
        openCards: document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id][open]').length,
        buttons: document.querySelectorAll('[data-g4sb-draft-save]').length };
    })()`);
    assert(next.jtbdId === expected[index].id &&
      next.phrases.length === expected[index].phrases.length &&
      next.selected === next.phrases.length && next.fullStructure &&
      next.buttonLabel === "+ Создать группу объявлений" && next.savedGroups === 0 &&
      next.openCards === 3 && next.buttons === 3,
    `JTBD ${index} draft is not isolated: ${JSON.stringify(next)}`);
    await capture(`.g4-v166-jtbd[data-g4sb-jtbd-id="${expected[index].id}"]`,
      `gate4-search-goat-jtbd${index + 1}-v391.png`, 4200);
  }

  const multiOpenSelection = await evaluate(`(() => {
    const build = ensureGate4SearchBuild(${JSON.stringify(goatId)});
    const firstId = ${JSON.stringify(expected[0].id)};
    const thirdId = ${JSON.stringify(expected[2].id)};
    const firstCard = [...document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')]
      .find((card) => card.dataset.g4sbJtbdId === firstId);
    const checkbox = firstCard.querySelector('.g4-v128-selector:not(.g4-v150-excluded-table) [data-g4sb-phrase-select]:checked');
    const phrase = checkbox.dataset.g4sbPhraseSelect;
    const beforeFirst = build.jtbdDraftsV388[firstId].keywordRows.length;
    const beforeThird = build.jtbdDraftsV388[thirdId].keywordRows.length;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    const afterFirst = build.jtbdDraftsV388[firstId].keywordRows.length;
    const afterThird = build.jtbdDraftsV388[thirdId].keywordRows.length;
    const refreshed = [...document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')]
      .find((card) => card.dataset.g4sbJtbdId === firstId);
    const restore = [...refreshed.querySelectorAll('[data-g4sb-phrase-select]')]
      .find((input) => input.dataset.g4sbPhraseSelect === phrase);
    restore.checked = true;
    restore.dispatchEvent(new Event('change', { bubbles: true }));
    return { beforeFirst, afterFirst,
      restoredFirst: build.jtbdDraftsV388[firstId].keywordRows.length,
      beforeThird, afterThird,
      openCards: document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id][open]').length };
  })()`);
  assert(multiOpenSelection.beforeFirst === 14 && multiOpenSelection.afterFirst === 13 &&
    multiOpenSelection.restoredFirst === 14 &&
    multiOpenSelection.beforeThird === 10 && multiOpenSelection.afterThird === 10 &&
    multiOpenSelection.openCards === 3,
  `Editing one open JTBD changed another: ${JSON.stringify(multiOpenSelection)}`);

  const independentDrafts = await evaluate(`(async () => {
    const build = ensureGate4SearchBuild(${JSON.stringify(goatId)});
    const firstCard = document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[0];
    const first = firstCard.querySelector('[data-g4sb-draft-oper="minus"]');
    if (!first) throw new Error("First JTBD has no editable group fields");
    first.value = "smoke-only-first-jtbd";
    first.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();
    const firstId = build.clusterDraft.jtbdId;
    const beforeSwitch = { active: build.activeJtbdId, draftId: build.clusterDraft.jtbdId,
      map: Object.fromEntries(Object.entries(build.jtbdDraftsV388 || {}).map(([id, draft]) => [id, draft.minus || ""])) };
    const third = document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[2]
      .querySelector('[data-g4sb-draft-oper="minus"]');
    third.value = "smoke-only-third-jtbd";
    third.dispatchEvent(new Event("input", { bubbles: true }));
    await Promise.resolve();
    const afterThird = { active: build.activeJtbdId, draftId: build.clusterDraft.jtbdId,
      open: document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id][open]').length,
      map: Object.fromEntries(Object.entries(build.jtbdDraftsV388 || {}).map(([id, draft]) => [id, draft.minus || ""])) };
    document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[1].querySelector('summary').click();
    const afterClose = document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id][open]').length;
    document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[1].querySelector('summary').click();
    const afterReopen = document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id][open]').length;
    return { first: build.jtbdDraftsV388[${JSON.stringify(expected[0].id)}]?.minus,
      firstVisible: document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[0]
        .querySelector('[data-g4sb-draft-oper="minus"]')?.value,
      firstId, beforeSwitch, afterThird, afterClose, afterReopen,
      thirdStored: build.jtbdDraftsV388[${JSON.stringify(expected[2].id)}]?.minus,
      savedGroups: build.groupRows.length };
  })()`);
  assert(independentDrafts.first === "smoke-only-first-jtbd" &&
    independentDrafts.firstVisible === independentDrafts.first &&
    independentDrafts.thirdStored === "smoke-only-third-jtbd" &&
    independentDrafts.afterThird.open === 3 && independentDrafts.afterClose === 2 &&
    independentDrafts.afterReopen === 3 &&
    independentDrafts.savedGroups === 0,
  `JTBD draft fields leak or disappear: ${JSON.stringify(independentDrafts)}`);

  const missing = await evaluate(`(() => {
    const forecast = g4sbV128Forecast([{ kw: "без прогноза кликов", vol: "100",
      forecastClicks: "", forecastBudget: "25" }], {});
    const build = ensureGate4SearchBuild(${JSON.stringify(goatId)});
    const emptyId = build.clusterDraft.jtbdId;
    build.clusterDraft.keywordRows = [];
    renderGate();
    return { hasClicks: forecast.hasPhraseClicks, clicks: forecast.clicks,
      emptyText: [...document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')]
        .find((card) => card.dataset.g4sbJtbdId === emptyId)
        ?.querySelector('.g4-v126-editor')?.textContent.includes('Выберите фразы группы') || false };
  })()`);
  assert(missing.hasClicks === false && missing.clicks === null, "Missing clicks were estimated");
  assert(missing.emptyText, "Empty group does not prompt to choose phrases");
  await capture(`.g4-v166-jtbd[data-g4sb-jtbd-id="${expected[1].id}"] .g4-v127-editor-section`, "gate4-search-empty-forecast-v391.png", 1200);

  await evaluate(`(() => {
    const category = document.querySelector('[data-gate0-scope-category-select="gate4-launch"]');
    category.value = ${JSON.stringify(shirt.categoryId)};
    category.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await waitFor(`document.querySelector('[data-gate0-scope-category-select="gate4-launch"]')?.value === ${JSON.stringify(shirt.categoryId)}`);
  await evaluate(`(() => {
    const product = document.querySelector('[data-gate0-scope-product-select="gate4-launch"]');
    product.value = ${JSON.stringify(shirtId)};
    product.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await waitFor(`guruV194SelectedProduct(state)?.id === ${JSON.stringify(shirtId)}`);
  const shirtResult = await evaluate(`(() => {
    const channel = g4LaunchChannels().find(g4IsYandexSearchChannel);
    const campaign = g4EnsureLaunchCampaigns()[g4CampaignStateKey(${JSON.stringify(shirtId)}, channel.key)];
    const build = ensureGate4SearchBuild(${JSON.stringify(shirtId)});
    return { groups: build.groupRows.length, phrases: JSON.stringify(build.groupRows[0]?.demandRows || []),
      group: JSON.stringify(build.groupRows[0] || {}),
      targeting: JSON.stringify(campaign.channelTargeting), jtbdId: build.groupRows[0]?.jtbdId || "" };
  })()`);
  assert(shirtResult.groups === 1 && JSON.parse(shirtResult.phrases).length === 27,
    "Existing Shirt group was lost");
  assert(shirtResult.phrases === setup.shirtPhrases, "Existing Shirt phrase data changed");
  assert(shirtResult.group === setup.shirtGroup, "Existing Shirt group fields changed");
  assert(shirtResult.targeting === setup.shirtTargeting, "Existing Shirt targeting changed");
  assert(!shirtResult.jtbdId, "Ambiguous legacy Shirt group was assigned a JTBD by guess");
  await capture(".g4-v166-coverage", "gate4-search-shirt-existing-v386.png", 1300);

  const shirtLinked = await evaluate(`(() => {
    const input = document.querySelector('[data-g4sb-link-legacy-group]');
    const primary = g4sbItemJtbdList(${JSON.stringify(shirtId)}, ${JSON.stringify(shirtId)})[0];
    if (!input || !primary) throw new Error("Manual legacy link control missing");
    input.value = primary.id;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    const build = ensureGate4SearchBuild(${JSON.stringify(shirtId)});
    const group = build.groupRows[0];
    return { jtbdId: group.jtbdId, phrases: JSON.stringify(group.demandRows),
      legacyTitle: group.legacyGroupTitleV386,
      orphaned: Boolean(document.querySelector('.g4-v166-jtbd.is-orphaned')) };
  })()`);
  assert(shirtLinked.jtbdId === `primary:${shirtId}` &&
    shirtLinked.phrases === setup.shirtPhrases &&
    shirtLinked.legacyTitle === "Рубашка Upcycling с кружевом" &&
    shirtLinked.orphaned === false,
  `Explicit Shirt JTBD link lost data: ${JSON.stringify(shirtLinked)}`);
  await capture(".g4-v166-coverage", "gate4-search-shirt-linked-v386.png", 1300);

  const twoGroups = await evaluate(`(() => {
    const build = ensureGate4SearchBuild(${JSON.stringify(shirtId)});
    const duplicate = structuredClone(build.groupRows[0]);
    duplicate.groupId = "smoke-second-group";
    duplicate.clusterId = "smoke-second-group";
    build.groupRows.push(duplicate);
    build.clusters.push({ id: duplicate.clusterId, itemId: duplicate.itemId,
      mainJtbdIndex: duplicate.mainJtbdIndex, jtbdId: duplicate.jtbdId,
      name: duplicate.col0, demandRows: duplicate.demandRows });
    renderGate();
    const coverage = document.querySelector('.g4-v166-coverage');
    const cards = [...coverage.querySelectorAll('.g4-v127-group-row')];
    const button = coverage.querySelector('[data-g4sb-draft-save]');
    const editor = coverage.querySelector('.g4-v126-editor');
    return { groups: cards.length, buttons: coverage.querySelectorAll('[data-g4sb-draft-save]').length,
      editorAfterGroups: editor.getBoundingClientRect().top > cards.at(-1).getBoundingClientRect().bottom,
      buttonInEditor: editor.contains(button),
      buttonInJtbd: Boolean(button.closest('.g4-v166-jtbd[data-g4sb-jtbd-id][open]')),
      redundantSelect: Boolean(coverage.querySelector('[data-g4sb-create-jtbd-select]')) };
  })()`);
  assert(twoGroups.groups === 2 && twoGroups.buttons === 1 &&
    twoGroups.editorAfterGroups && twoGroups.buttonInEditor &&
    twoGroups.buttonInJtbd && !twoGroups.redundantSelect,
  `Full editor is not below the last of two groups: ${JSON.stringify(twoGroups)}`);
  await capture(".g4-v166-coverage", "gate4-search-two-groups-v390.png", 1600);
  await evaluate(`(() => {
    const build = ensureGate4SearchBuild(${JSON.stringify(shirtId)});
    build.groupRows = build.groupRows.filter((row) => row.groupId !== "smoke-second-group");
    build.clusters = build.clusters.filter((row) => row.id !== "smoke-second-group");
    renderGate();
  })()`);

  await evaluate(`(() => {
    const category = document.querySelector('[data-gate0-scope-category-select="gate4-launch"]');
    category.value = ${JSON.stringify(goat.categoryId)};
    category.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
  await waitFor(`guruV194SelectedProduct(state)?.id === ${JSON.stringify(goatId)}`);
  const goatReturn = await evaluate(`(() => {
    const channel = g4LaunchChannels().find(g4IsYandexSearchChannel);
    const campaign = g4EnsureLaunchCampaigns()[g4CampaignStateKey(${JSON.stringify(goatId)}, channel.key)];
    const build = ensureGate4SearchBuild(${JSON.stringify(goatId)});
    return { jtbdId: campaign.audienceJtbdId, groups: build.groupRows.length,
      targeting: JSON.stringify(campaign.channelTargeting),
      openJtbds: [...document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id][open]')]
        .map((card) => card.dataset.g4sbJtbdId),
      firstJtbdDraftMinus: build.jtbdDraftsV388?.[${JSON.stringify(expected[0].id)}]?.minus || "",
      thirdJtbdDraftMinus: build.jtbdDraftsV388?.[${JSON.stringify(expected[2].id)}]?.minus || "",
      exactLegacyMatch: g4sbV386GroupJtbd(${JSON.stringify(goatId)}, {
        itemId: ${JSON.stringify(goatId)}, mainJtbdIndex: 2,
        col0: ${JSON.stringify(additional.text)},
      })?.id || "",
      ambiguousLegacyMatch: g4sbV386GroupJtbd(${JSON.stringify(goatId)}, {
        itemId: ${JSON.stringify(goatId)}, mainJtbdIndex: 2,
        col0: "Другая цель",
      })?.id || "" };
  })()`);
  assert(goatReturn.jtbdId === additional.id && goatReturn.groups === 0,
    "Goat campaign state mixed with Shirt or draft was saved");
  assert(goatReturn.openJtbds.length === 3 &&
    expected.every((jtbd) => goatReturn.openJtbds.includes(jtbd.id)),
  "Open JTBD cards were lost after switching products");
  assert(goatReturn.targeting === setup.initialTargeting, "Goat targeting changed after switching");
  assert(goatReturn.firstJtbdDraftMinus === "smoke-only-first-jtbd" &&
    goatReturn.thirdJtbdDraftMinus === "smoke-only-third-jtbd",
  "Per-JTBD draft fields were lost when switching products");
  assert(goatReturn.exactLegacyMatch === additional.id && !goatReturn.ambiguousLegacyMatch,
    "Legacy group ID mapping ignored exact-match protection");

  process.stdout.write(JSON.stringify({ ok: true, exportedAt: {
    workspace: fullExport.exportedAt, gate4: gate4Export.exportedAt,
  }, audience, jtbdPhraseCounts: expected.map((item) => ({ id: item.id, count: item.phrases.length })),
    gate1VsSearch, costAnalysis, budgetRisk, migratedAutoDraft, additionalForecast: group.forecast,
  missingClicks: missing, goatStructure, multiOpenSelection,
  independentDrafts, twoGroups, shirt: {
    groups: shirtResult.groups, phrases: JSON.parse(shirtResult.phrases).length,
    legacyJtbdUnassigned: !shirtResult.jtbdId,
    manualLinkPreservedPhrases: shirtLinked.phrases === setup.shirtPhrases,
  }, goatReturn, screenshots: [
    "artifacts/gate4-search-audience-v386.png",
    "artifacts/gate4-search-jtbd-structure-v390.png",
    "artifacts/gate4-search-goat-keyword-cost-v392.png",
    "artifacts/gate4-search-goat-group-forecast-v392.png",
    "artifacts/gate4-search-goat-jtbd1-v391.png",
    "artifacts/gate4-search-goat-jtbd2-v391.png",
    "artifacts/gate4-search-goat-jtbd3-v391.png",
    "artifacts/gate4-search-goat-additional-phrases-v391.png",
    "artifacts/gate4-search-goat-additional-forecast-v391.png",
    "artifacts/gate4-search-empty-forecast-v391.png",
    "artifacts/gate4-search-shirt-existing-v386.png",
    "artifacts/gate4-search-shirt-linked-v386.png",
    "artifacts/gate4-search-two-groups-v390.png",
  ] }, null, 2) + "\n");
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
