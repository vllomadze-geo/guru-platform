import { readFile, writeFile } from "node:fs/promises";

const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9395";
const fullPath = process.env.GURU_PROJECT_EXPORT || "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const gate4Path = process.env.GURU_GATE4_EXPORT || "/Users/vl/Downloads/gate-4.json";
const goatId = "catalog-item-1786792591872-51f503";
const smokeId = "gate4-search-jtbd-readiness-smoke";
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
Object.entries(gate4Export.content).forEach(([key, value]) => {
  fixture[key] = structuredClone(value);
});
const gateIndex = fixture.gates.findIndex((gate) => gate.id === "gate-4");
assert(gateIndex >= 0 && gate4Export.structure?.id === "gate-4", "Gate 4 structure missing");
fixture.gates[gateIndex] = structuredClone(gate4Export.structure);
fixture.project.id = smokeId;
fixture.project.name = "Gate 4 JTBD readiness smoke";
// Keep the fixture below the browser storage quota so checklist persistence can
// be verified after saveState(), while preserving Gate 0–4 source data.
fixture.gate5 = {};
const goat = fixture.project.catalogItemsV189.find((item) => item.id === goatId);
assert(goat, "Goat product missing");

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
    workspace.project.name = "Gate 4 JTBD readiness smoke";
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
  await waitFor('Boolean(state) && typeof g4sbV166JtbdReadiness === "function"');
  const realSource = await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    state = ${JSON.stringify(fixture)};
    activeProjectId = ${JSON.stringify(smokeId)};
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = ${JSON.stringify(goat.categoryId)};
    ui.selectedProductId = ${JSON.stringify(goatId)};
    const channel = g4LaunchChannels().find(g4IsYandexSearchChannel);
    const open = g4EnsureLaunchUiState();
    open.rows[g4CampaignStateKey(${JSON.stringify(goatId)}, channel.key)] = true;
    const d = ensureGate4SearchBuild(${JSON.stringify(goatId)});
    d.searchStepOpen = d.searchStepOpen || {};
    d.searchStepOpen.launch = true;
    const original = {
      savedGroups: d.groupRows.length,
      draftGroups: Object.keys(d.jtbdDraftsV388 || {}).length,
      draftBudget: d.clusterDraft?.col4,
      landing: guruStrategicFoundationModelV286(g4sbV385ProductSource(${JSON.stringify(goatId)}).product).fields.landing?.value || '',
      landingUrl: g4sbV407LandingUrl(${JSON.stringify(goatId)}),
      campaignUrlFields: g4sbV434CampaignUrlModel(${JSON.stringify(goatId)}),
      summaryGroups: g4sbV405LaunchSummaryData(${JSON.stringify(goatId)}, d,
        g4sbV407SavedDuplicateCount(${JSON.stringify(goatId)}, d)).groups,
    };
    guruNavigateToGate("gate-4");
    return original;
  })()`);
  await waitFor("document.querySelector('[data-g4sb-step=launch]')");
  Object.assign(realSource, await evaluate(`(() => {
    const campaignUrlFields = document.querySelector(
      '.g4-v406-launch-level [data-g4sb-campaign-url-fields]'
    );
    const landing = campaignUrlFields?.querySelector('[data-g4sb-url-field="landing"]');
    const parameters = campaignUrlFields?.querySelector('[data-g4sb-url-field="final"]');
    return {
      renderedLanding: landing?.querySelector('[data-g4sb-url-value]')?.value || '',
      renderedParameters: parameters?.querySelector('code')?.textContent.trim() || '',
      copyButtons: campaignUrlFields?.querySelectorAll('[data-g4sb-copy-url-field], [data-g4sb-v488-final-url] [data-g4rsya-v289-copy]').length || 0,
      legacyFullUrlBlocks: document.querySelectorAll(
        '[data-g4sb-generate-utm], [data-g4sb-copy-utm], [data-g4sb-utm-result]'
      ).length,
      visibleSummaryGroups: Number(document.querySelector('[data-g4sb-launch-summary]')?.dataset.g4sbSummaryGroups),
      groupLevelCount: [...document.querySelectorAll('.g4-v406-launch-level')]
        .filter((level) => level.querySelectorAll('.g4-v406-launch-item').length === 9).length,
      launchMeta: document.querySelector('[data-g4sb-step-meta="launch"]')?.textContent.trim(),
    };
  })()`));
  const realClip = await evaluate(`(() => {
    const article = document.querySelector('[data-g4sb-step="launch"]').closest('article');
    const group = article.querySelector('.g4-v407-group-overview');
    article.scrollIntoView({ block: 'start' });
    const start = article.getBoundingClientRect();
    const end = group.getBoundingClientRect();
    return { x: Math.max(0, start.left + scrollX - 8), y: Math.max(0, start.top + scrollY - 8),
      width: Math.min(start.width + 16, 1510), height: end.bottom - start.top + 16, scale: 1 };
  })()`);
  const realScreenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: realClip,
  });
  await writeFile(new URL("../artifacts/gate4-search-launch-real-export-v407.png", import.meta.url),
    Buffer.from(realScreenshot.data, "base64"));
  assert(realSource.savedGroups === realSource.summaryGroups &&
    realSource.visibleSummaryGroups === realSource.summaryGroups &&
    realSource.groupLevelCount === realSource.summaryGroups &&
    realSource.renderedLanding === realSource.campaignUrlFields.landing &&
    realSource.renderedParameters === realSource.campaignUrlFields.parameters &&
    realSource.copyButtons === 2 && realSource.legacyFullUrlBlocks === 0,
  `Latest local export URL fields or saved-group count mismatch: ${JSON.stringify(realSource)}`);
  await evaluate(`(() => {
    const d = ensureGate4SearchBuild(${JSON.stringify(goatId)});
    d.groupRows = [];
    d.clusters = [];
    d.adsRows = [];
    d.jtbdDraftsV388 = {};
    d.clusterDraft.open = false;
    d.openJtbdIdsV391 = [];
    d.activeJtbdId = "";
    renderGate();
  })()`);
  await waitFor('document.querySelectorAll(".g4-v166-jtbd[data-g4sb-jtbd-id]").length === 3 && [...document.querySelectorAll("[data-g4sb-jtbd-readiness]")].every((row) => row.dataset.g4sbJtbdReadiness === "not_started")');
  const statuses = () => evaluate(`(() => [...document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')]
    .map((card) => ({ status: card.querySelector('[data-g4sb-jtbd-readiness]')?.dataset.g4sbJtbdReadiness,
      label: card.querySelector('[data-g4sb-jtbd-readiness]')?.textContent.trim(),
      count: card.querySelector('.g4-v160-jtbd-summary-actions > span')?.textContent.trim() })))()`);
  const baseline = await statuses();
  assert(baseline.every((row) => row.status === "not_started") &&
    baseline.every((row) => Number.parseInt(row.count.match(/\d+ фраз/)?.[0] || "0", 10) > 0),
  `Imported phrases must not mark a JTBD as started: ${JSON.stringify(baseline)}`);

  await evaluate(`(() => {
    const d = ensureGate4SearchBuild(${JSON.stringify(goatId)});
    const jtbds = g4sbV166DirectionJtbds(${JSON.stringify(goatId)});
    g4sbV166ActivateDraft(${JSON.stringify(goatId)}, d, jtbds[0]);
    d.jtbdDraftsV388[jtbds[0].key].minus = "бесплатно";
    const readyJtbd = jtbds[2];
    d.groupRows.push({ groupId: "smoke-ready-group", clusterId: "smoke-ready-group",
      itemId: readyJtbd.itemId, segmentIndex: G4_V166_JTBD_SCOPE,
      mainJtbdIndex: readyJtbd.index, jtbdId: readyJtbd.key,
      col0: readyJtbd.text, demandRows: g4sbV386JtbdPhraseRows(${JSON.stringify(goatId)}, readyJtbd.key).slice(0, 1),
      col2: "10", col3: "2", col4: "100" });
    d.adsRows[0] = [{ ad0: "Авторская Коза для дома", ad1: "", ad2: "" }];
    renderGate();
  })()`);
  const final = await statuses();
  assert(JSON.stringify(final.map((row) => row.status)) ===
    JSON.stringify(["in_progress", "not_started", "ready"]),
  `JTBD readiness states are incorrect: ${JSON.stringify(final)}`);
  await evaluate(`(() => {
    const list = document.querySelector('.g4-v166-jtbd-list');
    list.scrollIntoView({ block: 'start' });
    return true;
  })()`);
  const clip = await evaluate(`(() => {
    const box = document.querySelector('.g4-v166-jtbd-list').getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1510), height: box.height + 16, scale: 1 };
  })()`);
  const screenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip,
  });
  await writeFile(new URL("../artifacts/gate4-search-jtbd-readiness-v404.png", import.meta.url),
    Buffer.from(screenshot.data, "base64"));

  const summary = await evaluate(`(() => {
    const d = ensureGate4SearchBuild(${JSON.stringify(goatId)});
    const jtbds = g4sbV166DirectionJtbds(${JSON.stringify(goatId)});
    const metricRows = [
      [[100, 20, 6000], [1000, 186, 4431]],
      [[500, 100, 4000], [700, 142, 3397.5]],
      [[80, 10, 1000], [300, 81, 1220.3]],
    ];
    d.groupRows = [];
    d.clusters = [];
    d.adsRows = [];
    d.jtbdDraftsV388 = {};
    d.clusterDraft.open = false;
    jtbds.forEach((jtbd, index) => {
      const groupId = 'smoke-saved-group-' + index;
      const rows = metricRows[index].map(([vol, forecastClicks, forecastBudget], rowIndex) => ({
        kw: 'smoke jtbd ' + index + ' phrase ' + rowIndex,
        vol: String(vol), forecastClicks: String(forecastClicks),
        forecastBudget: String(forecastBudget),
      }));
      const ads = index === 1
        ? [{ ad0: 'Заголовок', ad2: 'Текст' }]
        : [{ ad0: 'Заголовок 1', ad2: 'Текст 1' }, { ad0: 'Заголовок 2', ad2: 'Текст 2' }];
      const callouts = index === 0 ? ['Ручная работа', 'На заказ', 'Авторский стиль', 'Для подарка']
        : index === 1 ? [] : ['Длинное уточнение 12345', 'Длинное уточнение 12345',
          'Длинное уточнение 12345', 'Длинное уточнение 12345'];
      d.clusters.push({ id: groupId, name: jtbd.text, itemId: jtbd.itemId,
        mainJtbdIndex: jtbd.index, jtbdId: jtbd.key, segmentIndex: G4_V166_JTBD_SCOPE });
      d.groupRows.push({ groupId, clusterId: groupId, itemId: jtbd.itemId,
        segmentIndex: G4_V166_JTBD_SCOPE, mainJtbdIndex: jtbd.index,
        jtbdId: jtbd.key, col0: jtbd.text, demandRows: rows, callouts });
      d.adsRows.push(ads);
      g4sbV166ActivateDraft(${JSON.stringify(goatId)}, d, jtbd);
      const draft = d.jtbdDraftsV388[jtbd.key];
      draft.keywordRows = [{ kw: 'ignored draft ' + index,
        vol: '99999', forecastClicks: '99999', forecastBudget: '99999' }];
      draft.ads = [{ ad0: 'Черновик', ad2: 'Не считать' }];
      draft.callouts = ['Черновик'];
      if (index === 2) {
        draft.editingClusterId = groupId;
      }
    });
    d.openJtbdIdsV391 = [];
    d.activeJtbdId = '';
    renderGate();
    const node = document.querySelector('[data-g4sb-launch-summary]');
    return {
      groups: Number(node.dataset.g4sbSummaryGroups),
      budget: Number(node.dataset.g4sbSummaryBudget),
      baseWeekly: Number(node.dataset.g4sbSummaryWeeklyBase),
      risk: Number(node.dataset.g4sbSummaryRisk),
      adsReady: Number(node.dataset.g4sbSummaryAdsReady),
      calloutsReady: Number(node.dataset.g4sbSummaryCalloutsReady),
      duplicates: Number(node.dataset.g4sbSummaryDuplicates),
      recommendations: [...node.querySelectorAll('.g4-v405-launch-recommendations li')]
        .map((item) => item.textContent.trim()),
      draftIds: Object.entries(d.jtbdDraftsV388).map(([key, draft]) => ({
        key, editing: draft.editingClusterId, rows: draft.keywordRows?.length,
      })),
      savedIds: d.groupRows.map((row) => row.groupId || row.clusterId),
      savedRows: d.groupRows.map((row) => ({ name: row.col0, jtbdId: row.jtbdId,
        rows: row.demandRows?.length, col2: row.col2, col3: row.col3, col4: row.col4,
        groupId: row.groupId })),
      text: node.textContent.trim().replace(/\\s+/g, ' '),
    };
  })()`);
  assert(summary.groups === 3 && summary.budget === 20048.8 &&
    Math.abs(summary.baseWeekly - 539 * 0.05 / 4.33) < 0.0001 &&
    summary.risk === 7000 && summary.adsReady === 2 &&
    summary.calloutsReady === 1 && summary.duplicates === 0 &&
    summary.recommendations.length === 4 &&
    summary.text.includes('только сохранённые группы'),
  `Launch summary included a draft or missed a saved group: ${JSON.stringify(summary)}`);
  const summaryClip = await evaluate(`(() => {
    const node = document.querySelector('[data-g4sb-launch-summary]');
    node.scrollIntoView({ block: 'start' });
    const box = node.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1510), height: box.height + 16, scale: 1 };
  })()`);
  const summaryScreenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: summaryClip,
  });
  await writeFile(new URL("../artifacts/gate4-search-launch-summary-v405.png", import.meta.url),
    Buffer.from(summaryScreenshot.data, "base64"));
  const launch = await evaluate(`(async () => {
    const d = ensureGate4SearchBuild(${JSON.stringify(goatId)});
    d.searchStepOpen = d.searchStepOpen || {};
    d.searchStepOpen.launch = true;
    renderGate();
    const levels = [...document.querySelectorAll('.g4-v406-launch-level')];
    const strategy = levels[0].querySelectorAll('.g4-v406-launch-item')[3];
    const lines = [...strategy.querySelectorAll('.g4-v406-launch-lines > div')]
      .map((node) => node.textContent.trim());
    levels[0].querySelectorAll('.g4-v406-launch-item input')[3].click();
    levels[1].querySelector('.g4-v406-launch-item input').click();
    await new Promise((resolve) => setTimeout(resolve, 1600));
    renderGate();
    const next = [...document.querySelectorAll('.g4-v406-launch-level')];
    const stored = JSON.parse(localStorage.getItem('guru-platform-workspace-v02-' + ${JSON.stringify(smokeId)}));
    return { levels: levels.length, campaignItems: levels[0].querySelectorAll('.g4-v406-launch-item').length,
      stepKeys: [...document.querySelectorAll('[data-g4sb-step]')].map((node) => node.dataset.g4sbStep),
      groupCounts: levels.slice(1, -1).map((level) => level.querySelectorAll('.g4-v406-launch-item').length),
      adItems: levels.at(-1).querySelectorAll('.g4-v406-launch-item').length,
      strategyLines: lines, campaignChecked: next[0].querySelectorAll('.g4-v406-launch-item input')[3].checked,
      firstGroupChecked: next[1].querySelector('.g4-v406-launch-item input').checked,
      secondGroupChecked: next[2].querySelector('.g4-v406-launch-item input').checked,
      stateLength: JSON.stringify(state).length,
      storedLength: JSON.stringify(stored).length,
      statusText: document.getElementById('saveStatus')?.textContent,
      memoryCampaignChecked: Object.values(state.gate4SearchBuild || {})
        .some((build) => build.launchChecklistV406?.['campaign:4'] === true),
      storedCampaignChecked: Object.values(stored.gate4SearchBuild || {})
        .some((build) => build.launchChecklistV406?.['campaign:4'] === true) };
  })()`);
  assert(launch.levels === 5 && launch.campaignItems === 16 &&
    JSON.stringify(launch.stepKeys) === JSON.stringify(['clusters', 'check', 'launch']) &&
    JSON.stringify(launch.groupCounts) === JSON.stringify([9, 9, 9]) &&
    launch.adItems === 14 && launch.strategyLines.length === 10 &&
    launch.strategyLines[8].startsWith('→ Перед запуском') &&
    launch.strategyLines[9].startsWith('→ "10 конверсий') &&
    launch.campaignChecked && launch.firstGroupChecked && !launch.secondGroupChecked &&
    launch.storedCampaignChecked,
  `Launch checklist rendering or persistence failed: ${JSON.stringify(launch)}`);
  const linked = await evaluate(`(async () => {
    const product = g4sbV385ProductSource(${JSON.stringify(goatId)}).product;
    const rsya = state.gate4Rsya[normalizeAspectKey(${JSON.stringify(goatId)})];
    if (!rsya?.groups?.[0]) throw new Error('Product landing row missing in smoke fixture');
    rsya.groups[0].landing = 'https://koza.example.ru/product/koza?existing=1';
    const d = ensureGate4SearchBuild(${JSON.stringify(goatId)});
    d.searchStepOpen.launch = true;
    renderGate();
    const levels = [...document.querySelectorAll('.g4-v406-launch-level')];
    const items = (level) => [...level.querySelectorAll('.g4-v406-launch-item')];
    const campaign = items(levels[0]);
    const group = items(levels[1]);
    const ad = items(levels.at(-1));
    const before = document.querySelector('[data-g4sb-step-meta="launch"]').textContent.trim();
    const weekly = campaign[3].querySelector('.g4-v407-auto-row span')?.textContent.trim();
    const duplicates = document.querySelector('.g4-v407-group-overview .g4-v407-auto-row')
      ?.querySelector('span')?.textContent.trim();
    const phrases = group[4].querySelector('.g4-v407-auto-row span')?.textContent.trim();
    const callouts = group[6].querySelector('.g4-v407-auto-row span')?.textContent.trim();
    const urlFields = campaign[6].querySelector('[data-g4sb-campaign-url-fields]');
    const landingField = urlFields.querySelector('[data-g4sb-url-field="landing"]');
    const parametersField = urlFields.querySelector('[data-g4sb-url-field="final"]');
    const landingValue = landingField.querySelector('[data-g4sb-url-value]').value;
    const parametersValue = parametersField.querySelector('code').textContent.trim();
    const originalCopy = g4sbV141CopyText;
    const originalRsyaCopy = g4RsyaCopyV289;
    const copied = [];
    g4sbV141CopyText = async (value) => { copied.push(value); };
    g4RsyaCopyV289 = async (value) => { copied.push(value); };
    landingField.querySelector('[data-g4sb-copy-url-field]').click();
    parametersField.querySelector('[data-g4rsya-v289-copy]').click();
    await new Promise((resolve) => setTimeout(resolve, 10));
    g4sbV141CopyText = originalCopy;
    g4RsyaCopyV289 = originalRsyaCopy;
    return { before, weekly, duplicates, phrases, callouts,
      campaignLabel: campaign[6].querySelector('label span')?.textContent.trim(),
      adLabel: ad[2].querySelector('label span')?.textContent.trim(),
      labels: [...urlFields.querySelectorAll('[data-g4sb-url-field] > span')]
        .map((node) => node.textContent.trim()),
      landingValue, parametersValue, copied,
      readonly: [...urlFields.querySelectorAll('[data-g4sb-url-value]')]
        .every((field) => field.readOnly),
      campaignCopyButtons: urlFields.querySelectorAll('[data-g4sb-copy-url-field], [data-g4sb-v488-final-url] [data-g4rsya-v289-copy]').length,
      adUrlFieldCount: ad[2].querySelectorAll('[data-g4sb-campaign-url-fields]').length,
      legacyFullUrlBlocks: document.querySelectorAll(
        '[data-g4sb-generate-utm], [data-g4sb-copy-utm], [data-g4sb-utm-result]'
      ).length,
      summaryBudget: document.querySelector('[data-g4sb-launch-summary]')?.dataset.g4sbSummaryBudget,
      groupSections: levels.length - 2,
      autoRows: document.querySelectorAll('.g4-v407-auto-row').length,
      autoReady: document.querySelectorAll('.g4-v407-auto-row[data-g4sb-launch-auto="ready"]').length,
    };
  })()`);
  const expectedLanding = 'https://koza.example.ru/product/koza';
  const expectedParameters = 'utm_source=yandex&utm_medium=cpc&utm_campaign={campaign_id}&utm_content={ad_id}&utm_term={keyword}';
  assert(linked.before === 'Готово 5 из 65' && linked.groupSections === 3 &&
    linked.autoRows === 8 && linked.autoReady === 3 &&
    linked.weekly.includes('6,2 - не достигается') &&
    linked.duplicates.includes('0') && linked.phrases.includes('Переплата: 1') &&
    linked.callouts.includes('47 из 66') &&
    linked.campaignLabel === '7. ПАРАМЕТРЫ URL' &&
    linked.adLabel === '3. ПАРАМЕТРЫ URL' &&
    linked.labels[0] === 'Ссылка в объявлении:' &&
    linked.labels[1] === 'Итоговая ссылка с UTM' &&
    linked.landingValue === expectedLanding && !linked.landingValue.includes('?') &&
    linked.parametersValue === expectedParameters && !linked.parametersValue.includes('://') &&
    !linked.parametersValue.startsWith('?') && linked.readonly &&
    linked.campaignCopyButtons === 2 && linked.adUrlFieldCount === 0 &&
    linked.legacyFullUrlBlocks === 0 &&
    linked.copied[0] === expectedLanding && linked.copied[1] === expectedParameters &&
    linked.summaryBudget === '20048.8',
  `Launch linked rows or inherited UTM failed: ${JSON.stringify(linked)}`);
  const urlFieldsClip = await evaluate(`(() => {
    const item = document.querySelector(
      '.g4-v406-launch > .g4-v406-launch-level .g4-v406-launch-item:nth-child(7)'
    );
    item.scrollIntoView({ block: 'center' });
    const box = item.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1510), height: box.height + 16, scale: 1 };
  })()`);
  const urlFieldsScreenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: urlFieldsClip,
  });
  await writeFile(new URL("../artifacts/gate4-search-campaign-url-fields-v434.png", import.meta.url),
    Buffer.from(urlFieldsScreenshot.data, "base64"));
  const duplicateGuard = await evaluate(`(() => {
    const d = ensureGate4SearchBuild(${JSON.stringify(goatId)});
    const row = d.groupRows[1].demandRows[0];
    const original = row.kw;
    row.kw = d.groupRows[0].demandRows[0].kw;
    renderGate();
    const result = {
      duplicates: Number(document.querySelector('[data-g4sb-launch-summary]')?.dataset.g4sbSummaryDuplicates),
      launchMeta: document.querySelector('[data-g4sb-step-meta="launch"]')?.textContent.trim(),
      duplicateAuto: document.querySelector('.g4-v407-group-overview .g4-v407-auto-row')?.dataset.g4sbLaunchAuto,
    };
    row.kw = original;
    renderGate();
    return result;
  })()`);
  assert(duplicateGuard.duplicates === 1 && duplicateGuard.launchMeta === 'Готово 4 из 65' &&
    duplicateGuard.duplicateAuto === 'pending',
  `Duplicate auto-row counted an unresolved duplicate as ready: ${JSON.stringify(duplicateGuard)}`);
  const strategyClip = await evaluate(`(() => {
    const strategy = document.querySelector('.g4-v406-launch-level .g4-v406-launch-item:nth-child(4)');
    strategy.scrollIntoView({ block: 'start' });
    const box = strategy.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1510), height: box.height + 16, scale: 1 };
  })()`);
  const strategyScreenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: strategyClip,
  });
  await writeFile(new URL("../artifacts/gate4-search-launch-strategy-v406.png", import.meta.url),
    Buffer.from(strategyScreenshot.data, "base64"));
  const launchClip = await evaluate(`(() => {
    const article = document.querySelector('[data-g4sb-step="launch"]').closest('article');
    const strategy = article.querySelector('.g4-v406-launch-level .g4-v406-launch-item:nth-child(4)');
    article.scrollIntoView({ block: 'start' });
    const start = article.getBoundingClientRect();
    const end = strategy.getBoundingClientRect();
    return { x: Math.max(0, start.left + scrollX - 8), y: Math.max(0, start.top + scrollY - 8),
      width: Math.min(start.width + 16, 1510), height: end.bottom - start.top + 16, scale: 1 };
  })()`);
  const launchScreenshot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: launchClip,
  });
  await writeFile(new URL("../artifacts/gate4-search-launch-section-v406.png", import.meta.url),
    Buffer.from(launchScreenshot.data, "base64"));
  const toggle = await evaluate(`(() => {
    const header = document.querySelector('[data-g4sb-step="launch"]');
    header.click();
    const collapsed = !document.querySelector('[data-g4sb-step="launch"]')
      .closest('article').classList.contains('is-open');
    document.querySelector('[data-g4sb-step="launch"]').click();
    const expanded = document.querySelector('[data-g4sb-step="launch"]')
      .closest('article').classList.contains('is-open');
    return { collapsed, expanded };
  })()`);
  assert(toggle.collapsed && toggle.expanded,
    `Launch section must collapse and expand: ${JSON.stringify(toggle)}`);
  console.log(JSON.stringify({ ok: true, realSource, baseline, final, summary, launch, linked, duplicateGuard,
    toggle,
    statusScreenshot: "artifacts/gate4-search-jtbd-readiness-v404.png",
    summaryScreenshot: "artifacts/gate4-search-launch-summary-v405.png",
    strategyScreenshot: "artifacts/gate4-search-launch-strategy-v406.png",
    launchScreenshot: "artifacts/gate4-search-launch-section-v406.png",
    urlFieldsScreenshot: "artifacts/gate4-search-campaign-url-fields-v434.png",
    realScreenshot: "artifacts/gate4-search-launch-real-export-v407.png" }, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
