import { readFile, writeFile } from "node:fs/promises";

const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9395";
const fullPath = process.env.GURU_PROJECT_EXPORT || "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const gate4Path = process.env.GURU_GATE4_EXPORT || "/Users/vl/Downloads/gate-4.json";
const goatId = "catalog-item-1786792591872-51f503";
const smokeId = "gate4-search-duplicate-ownership-smoke";
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
fixture.project.name = "Gate 4 duplicate ownership smoke";
fixture.gate4SearchBuild = structuredClone(gate4Export.content.gate4SearchBuild);
fixture.gate4Production = structuredClone(gate4Export.content.gate4Production);
const goatBuild = Object.entries(fixture.gate4SearchBuild)
  .find(([key]) => key.includes("51f503"))?.[1];
if (goatBuild?.clusterDraft) goatBuild.clusterDraft.open = false;
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
    workspace.project.name = "Gate 4 duplicate ownership smoke";
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
  await waitFor('Boolean(state) && typeof g4sbV403DuplicateCount === "function"');
  await evaluate(`(() => {
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
    guruNavigateToGate("gate-4");
  })()`);
  await waitFor('document.querySelectorAll(".g4-v166-jtbd[data-g4sb-jtbd-id]").length >= 2');
  await evaluate(`(() => {
    const first = document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[0];
    if (!first.open) first.querySelector('summary').click();
    return true;
  })()`);
  await waitFor('document.querySelectorAll(".g4-v166-jtbd[data-g4sb-jtbd-id]")[0]?.querySelector(".g4-v126-editor")');
  await evaluate(`(() => {
    const second = document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[1];
    if (!second.open) second.querySelector('summary').click();
    return true;
  })()`);
  await waitFor('document.querySelectorAll(".g4-v166-jtbd[data-g4sb-jtbd-id]")[1]?.querySelector(".g4-v126-editor")');

  const baseline = await evaluate(`(() => {
    const cards = [...document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')];
    const phrases = (card) => [...card.querySelectorAll('tr[data-g4sb-membership-status="В этой группе"]')]
      .map((row) => row.querySelector('[data-g4sb-phrase-select]')?.dataset.g4sbPhraseSelect)
      .filter(Boolean);
    const first = phrases(cards[0]);
    const second = phrases(cards[1]);
    const lowerKeys = new Set(second.map(g4sbV128PhraseKey));
    return { first, second, exact: first.filter((phrase) => lowerKeys.has(g4sbV128PhraseKey(phrase))),
      firstButtons: cards[0].querySelectorAll('button[data-g4sb-remove-from-draft]').length,
      firstDuplicateButtons: [...cards[0].querySelectorAll('button')]
        .filter((button) => button.textContent.trim() === 'Убрать дубль').length,
      secondDuplicateButtons: [...cards[1].querySelectorAll('button')]
        .filter((button) => button.textContent.trim() === 'Убрать дубль').length,
      summary: Number(document.querySelector('[data-g4sb-product-duplicate-count]')?.dataset.g4sbProductDuplicateCount),
      similar: first.includes('коза авторской работы') && second.includes('авторская коза') };
  })()`);
  assert(baseline.first.length && baseline.second.length && !baseline.exact.length &&
    baseline.firstDuplicateButtons === 0 && baseline.secondDuplicateButtons === 0,
  `Goat/handmade similar phrases triggered duplicates: ${JSON.stringify(baseline)}`);
  const baselineClip = await evaluate(`(() => {
    const node = document.querySelector('[data-g4sb-product-duplicate-count]');
    node.scrollIntoView({ block: 'start' });
    const box = node.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1510), height: box.height + 16, scale: 1 };
  })()`);
  const baselineShot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: baselineClip,
  });
  await writeFile(new URL("../artifacts/gate4-search-duplicate-summary-v403.png", import.meta.url),
    Buffer.from(baselineShot.data, "base64"));
  const handmadeClip = await evaluate(`(() => {
    const card = document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[1];
    const row = [...card.querySelectorAll('tr[data-g4sb-membership-status="В этой группе"]')]
      .find((item) => item.querySelector('[data-g4sb-phrase-select]')?.dataset.g4sbPhraseSelect
        === 'авторская коза');
    row.scrollIntoView({ block: 'center' });
    const box = row.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 8), y: Math.max(0, box.top + scrollY - 8),
      width: Math.min(box.width + 16, 1510), height: box.height + 16, scale: 1 };
  })()`);
  const handmadeShot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: handmadeClip,
  });
  await writeFile(new URL("../artifacts/gate4-search-handmade-similar-row-v403.png", import.meta.url),
    Buffer.from(handmadeShot.data, "base64"));

  const injected = await evaluate(`(() => {
    const d = ensureGate4SearchBuild(${JSON.stringify(goatId)});
    const jtbds = g4sbV166DirectionJtbds(${JSON.stringify(goatId)});
    const owner = d.jtbdDraftsV388[jtbds[0].key];
    const lower = d.jtbdDraftsV388[jtbds[1].key];
    const otherKeys = new Set([...Object.values(d.jtbdDraftsV388)]
      .filter((draft) => draft !== owner).flatMap((draft) => draft.keywordRows || [])
      .map((row) => g4sbV128PhraseKey(row.kw)));
    const row = owner.keywordRows.find((item) => !otherKeys.has(g4sbV128PhraseKey(item.kw)));
    if (!row) throw new Error('No owner-only phrase for positive duplicate check');
    lower.keywordRows.push(g4sbKeywordRow(row));
    renderGate();
    return row.kw;
  })()`);
  const positive = await evaluate(`(() => {
    const cards = [...document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')];
    const matches = (card) => [...card.querySelectorAll('tr[data-g4sb-membership-status="В этой группе"]')]
      .filter((row) => row.querySelector('[data-g4sb-phrase-select]')?.dataset.g4sbPhraseSelect === ${JSON.stringify(injected)});
    const top = matches(cards[0])[0];
    const lower = matches(cards[1])[0];
    return { top: Boolean(top), lower: Boolean(lower),
      topButton: Boolean([...top?.querySelectorAll('button') || []]
        .find((button) => button.textContent.trim() === 'Убрать дубль')),
      lowerButton: Boolean([...lower?.querySelectorAll('button') || []]
        .find((button) => button.textContent.trim() === 'Убрать дубль')),
      lowerActions: [...lower?.querySelectorAll('button') || []].map((button) => button.textContent.trim()),
      summary: Number(document.querySelector('[data-g4sb-product-duplicate-count]')?.dataset.g4sbProductDuplicateCount) };
  })()`);
  assert(positive.top && positive.lower && !positive.topButton && positive.lowerButton &&
    positive.lowerActions.includes('Убрать') && positive.lowerActions.includes('Удалить') &&
    positive.summary === baseline.summary + 1,
  `Duplicate button missing or shown on owner: ${JSON.stringify(positive)}`);

  const removed = await evaluate(`(() => {
    const lower = document.querySelectorAll('.g4-v166-jtbd[data-g4sb-jtbd-id]')[1];
    const button = [...lower.querySelectorAll('button')]
      .find((node) => node.textContent.trim() === 'Убрать дубль');
    button.click();
    const d = ensureGate4SearchBuild(${JSON.stringify(goatId)});
    const jtbds = g4sbV166DirectionJtbds(${JSON.stringify(goatId)});
    const key = g4sbV128PhraseKey(${JSON.stringify(injected)});
    return { owner: d.jtbdDraftsV388[jtbds[0].key].keywordRows.some((row) => g4sbV128PhraseKey(row.kw) === key),
      lower: d.jtbdDraftsV388[jtbds[1].key].keywordRows.some((row) => g4sbV128PhraseKey(row.kw) === key),
      excluded: (d.excludedCampaignPhrases || []).some((phrase) => g4sbV128PhraseKey(phrase) === key),
      deleted: (d.deletedBankPhrases || []).some((phrase) => g4sbV128PhraseKey(phrase) === key),
      summary: Number(document.querySelector('[data-g4sb-product-duplicate-count]')?.dataset.g4sbProductDuplicateCount) };
  })()`);
  assert(removed.owner && !removed.lower && !removed.excluded && !removed.deleted &&
    removed.summary === baseline.summary,
  `Remove duplicate affected owner or global bank: ${JSON.stringify(removed)}`);

  const reversePriority = await evaluate(`(() => {
    const product = ${JSON.stringify(goatId)};
    const d = ensureGate4SearchBuild(product);
    const jtbds = g4sbV166DirectionJtbds(product);
    if (jtbds.length < 2) throw new Error('Need primary and additional JTBD');
    const phrase = 'авторская коза ручной работы 2027';
    const phraseRow = g4sbKeywordRow({ kw: phrase, vol: '120', forecastClicks: '12',
      forecastBudget: '1200', originStage: 'gate4', searchJtbdIdV394: jtbds[0].key });
    const makeGroup = (id, jtbd) => ({
      groupId: id, clusterId: id, itemId: jtbd.itemId,
      segmentIndex: G4_V166_JTBD_SCOPE, mainJtbdIndex: jtbd.index,
      jtbdId: jtbd.key, col0: jtbd.text, searchIntent: jtbd.text,
      demandRows: [g4sbKeywordRow(phraseRow)], minus: '-бесплатно',
      col2: '120', col3: '12', col4: '1200', budgetType: 'period',
      desiredLeads: '', desiredCpaScenario: 'base',
      callouts: ['Ручная работа', 'На заказ', 'Для подарка', 'С доставкой'],
      isFixed: true,
    });
    const additional = makeGroup('priority-additional-first', jtbds[1]);
    const primary = makeGroup('priority-primary-second', jtbds[0]);
    d.groupRows = [additional, primary];
    d.clusters = d.groupRows.map((group) => ({ id: group.clusterId,
      itemId: group.itemId, segmentIndex: group.segmentIndex,
      mainJtbdIndex: group.mainJtbdIndex, jtbdId: group.jtbdId,
      name: group.col0, searchIntent: group.searchIntent,
      demandRows: group.demandRows.map(g4sbKeywordRow),
      phraseSelection: group.demandRows.map((row) => row.kw) }));
    d.adsRows = {
      0: [{ ad0: 'Дополнительная группа 1', ad1: '', ad2: 'Текст объявления 1' },
        { ad0: 'Дополнительная группа 2', ad1: '', ad2: 'Текст объявления 2' }],
      1: [{ ad0: 'Основная группа 1', ad1: '', ad2: 'Текст объявления 1' },
        { ad0: 'Основная группа 2', ad1: '', ad2: 'Текст объявления 2' }],
    };
    d.jtbdDraftsV388 = {};
    d.clusterDraft = { open: false };
    d.openJtbdIdsV391 = [];
    d.activeJtbdId = '';
    const key = g4sbV128PhraseKey(phrase);
    const priorityDraft = { open: true, editingClusterId: '', itemId: jtbds[0].itemId,
      jtbdId: jtbds[0].key, mainJtbdIndex: jtbds[0].index, keywordRows: [] };
    const priorityProbe = {
      groupRows: [
        { groupId: 'priority-legacy-first', clusterId: 'priority-legacy-first', demandRows: [] },
        makeGroup('priority-primary-first', jtbds[0]),
        makeGroup('priority-primary-next', jtbds[0]),
        makeGroup('priority-additional-after', jtbds[1]),
      ],
      jtbdDraftsV388: { [jtbds[0].key]: priorityDraft },
      clusterDraft: priorityDraft,
    };
    const priorityMatrix = g4sbV411ProductGroupEntries(product, priorityProbe)
      .map((entry) => entry.ownerId);
    const probe = { open: true, jtbdId: 'probe', keywordRows: [] };
    const priorityRecords = (g4sbV128PhraseUsage(product, d, probe).get(key) || [])
      .filter((record) => record.sameCampaign);
    const entries = g4sbV403ProductGroupEntries(product, d)
      .filter((entry) => (entry.rows || []).some((row) => g4sbV128PhraseKey(row.kw) === key));
    const importDraft = { open: true, itemId: jtbds[1].itemId,
      jtbdId: jtbds[1].key, mainJtbdIndex: jtbds[1].index,
      keywordRows: [], forecastBaselineRows: [], minus: '', ads: [], callouts: [] };
    const importResult = g4sbV393ApplyGroupMetricImport(product, d, importDraft, {
      volumeIndex: 0, queryCountIndex: -1, monthlyClicksIndex: -1,
      clickPriceIndex: -1, bidIndex: -1, budgetIndex: -1,
      rows: [{ phrase, volume: '999' }], serviceRows: [],
    }, 'priority-smoke.csv');
    const draft = g4sbOpenSavedGroupEditor(product, d, additional, jtbds[1]);
    d.openJtbdIdsV391 = [jtbds[1].key];
    d.activeJtbdId = jtbds[1].key;
    d.clusterDraft = draft;
    d.jtbdDraftsV388[jtbds[1].key] = draft;
    const occupied = (g4sbV128PhraseUsage(product, d, draft).get(key) || [])
      .find((record) => record.sameCampaign);
    const saveBlocked = g4sbSaveClusterDraft(product, d) === null;
    const saveOwner = draft.phraseConflictTarget?.ownerId || '';
    g4sbClearPhraseConflict(draft);
    draft.validationError = '';
    draft.validationErrorKind = '';
    renderGate();
    return {
      phrase,
      primaryJtbd: jtbds[0].key,
      additionalJtbd: jtbds[1].key,
      priorityMatrix,
      rawOrder: d.groupRows.map((group) => group.groupId),
      usageOrder: priorityRecords.map((record) => record.groupId),
      visualOrder: entries.map((entry) => entry.ownerId),
      occupied: occupied?.groupId || '',
      importOccupied: importResult.occupied,
      importOwner: importDraft.phraseConflictTarget?.ownerId || '',
      saveBlocked,
      saveOwner,
    };
  })()`);
  assert(reversePriority.rawOrder[0] === 'priority-additional-first' &&
    JSON.stringify(reversePriority.priorityMatrix) === JSON.stringify([
      'priority-primary-first', 'priority-primary-next',
      `draft:${reversePriority.primaryJtbd}`,
      'priority-additional-after', 'priority-legacy-first',
    ]) &&
    reversePriority.usageOrder[0] === 'priority-primary-second' &&
    reversePriority.visualOrder[0] === 'priority-primary-second' &&
    reversePriority.occupied === 'priority-primary-second' &&
    reversePriority.importOccupied === 1 &&
    reversePriority.importOwner === 'priority-primary-second' &&
    reversePriority.saveBlocked && reversePriority.saveOwner === 'priority-primary-second',
  `Primary JTBD lost with reversed groupRows: ${JSON.stringify(reversePriority)}`);
  await evaluate(`(() => {
    const input = document.querySelector('[data-g4sb-manual-phrase]');
    input.value = ${JSON.stringify("авторская коза ручной работы 2027")};
    document.querySelector('[data-g4sb-manual-phrase-add]').click();
    return true;
  })()`);
  await waitFor('document.querySelector("[data-g4sb-conflict-panel]")');

  const conflictUi = await evaluate(`(() => {
    const panel = document.querySelector('[data-g4sb-conflict-panel]');
    const choices = [...panel.querySelectorAll('.g4-phrase-conflict-choice')];
    const buttons = [...panel.querySelectorAll('[data-g4sb-conflict-choice]')];
    const recommended = panel.querySelector('.g4-phrase-conflict-choice.is-recommended');
    panel.scrollIntoView({ block: 'center' });
    const box = panel.getBoundingClientRect();
    return {
      choices: choices.length,
      buttonLabels: buttons.map((button) => button.querySelector('span')?.textContent.trim()),
      recommended: recommended?.querySelector('.g4-phrase-conflict-choice-head span')?.textContent.trim(),
      explicitUnfix: buttons.find((button) => button.dataset.g4sbConflictChoice === 'current')
        ?.textContent.includes('Вернуть группы в редактирование и перенести'),
      clip: { x: Math.max(0, box.left + scrollX - 10), y: Math.max(0, box.top + scrollY - 10),
        width: Math.min(box.width + 20, 1510), height: box.height + 20, scale: 1 },
    };
  })()`);
  assert(conflictUi.choices === 2 &&
    conflictUi.buttonLabels.every((label) => label === 'Оставить в этой группе') &&
    conflictUi.recommended === 'Основной JTBD' && conflictUi.explicitUnfix,
  `Interactive conflict UI differs: ${JSON.stringify(conflictUi)}`);
  const conflictShot = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: conflictUi.clip,
  });
  await writeFile(new URL("../artifacts/gate4-search-phrase-conflict-choice-v411.png", import.meta.url),
    Buffer.from(conflictShot.data, "base64"));

  const viewSafety = await evaluate(`(() => {
    const d = ensureGate4SearchBuild(${JSON.stringify(goatId)});
    const primary = d.groupRows.find((group) => group.groupId === 'priority-primary-second');
    const before = { fixed: g4sbGroupIsFixed(primary), fixedAt: primary.fixedAt || '',
      draft: Boolean(d.jtbdDraftsV388?.[${JSON.stringify("PLACEHOLDER")}]) };
    document.querySelector('[data-g4sb-conflict-group="priority-primary-second"]').click();
    return { before, after: { fixed: g4sbGroupIsFixed(primary), fixedAt: primary.fixedAt || '',
      draft: Boolean(d.jtbdDraftsV388?.[${JSON.stringify("PLACEHOLDER")}]) },
      highlighted: Boolean(document.querySelector('[data-g4sb-saved-group-id="priority-primary-second"].g4-phrase-conflict-group-target')) };
  })()`.replaceAll('PLACEHOLDER', reversePriority.primaryJtbd));
  assert(viewSafety.before.fixed && viewSafety.after.fixed &&
    !viewSafety.before.draft && !viewSafety.after.draft && viewSafety.highlighted,
  `Viewing conflict changed fixation: ${JSON.stringify(viewSafety)}`);

  await evaluate(`document.querySelector('[data-g4sb-conflict-choice="current"]').click(); true`);
  await waitFor('!document.querySelector("[data-g4sb-conflict-panel]")');
  const transferred = await evaluate(`(() => {
    const product = ${JSON.stringify(goatId)};
    const d = ensureGate4SearchBuild(product);
    const key = g4sbV128PhraseKey(${JSON.stringify("авторская коза ручной работы 2027")});
    const primary = d.groupRows.find((group) => group.groupId === 'priority-primary-second');
    const additional = d.groupRows.find((group) => group.groupId === 'priority-additional-first');
    const primaryDraft = d.jtbdDraftsV388[${JSON.stringify("PLACEHOLDER_PRIMARY")}];
    const additionalDraft = d.jtbdDraftsV388[${JSON.stringify("PLACEHOLDER_ADDITIONAL")}];
    const has = (draft) => (draft?.keywordRows || []).some((row) => g4sbV128PhraseKey(row.kw) === key);
    const row = [...document.querySelectorAll('[data-g4sb-phrase-row]')]
      .find((item) => item.dataset.g4sbPhraseRow === key);
    return {
      primaryFixed: g4sbGroupIsFixed(primary),
      additionalFixed: g4sbGroupIsFixed(additional),
      primaryDraftHasPhrase: has(primaryDraft),
      additionalDraftHasPhrase: has(additionalDraft),
      primaryForecast: [primaryDraft?.col2, primaryDraft?.col3, primaryDraft?.col4],
      additionalForecast: [additionalDraft?.col2, additionalDraft?.col3, additionalDraft?.col4],
      duplicates: g4sbV403DuplicateCount(product, d),
      activeJtbd: d.activeJtbdId,
      costStatus: row?.dataset.g4sbCostStatus || '',
      highlighted: Boolean(row?.classList.contains('g4-phrase-conflict-target')),
    };
  })()`
    .replaceAll('PLACEHOLDER_PRIMARY', reversePriority.primaryJtbd)
    .replaceAll('PLACEHOLDER_ADDITIONAL', reversePriority.additionalJtbd));
  assert(!transferred.primaryFixed && !transferred.additionalFixed &&
    !transferred.primaryDraftHasPhrase && transferred.additionalDraftHasPhrase &&
    transferred.primaryForecast.every((value) => !value) &&
    JSON.stringify(transferred.additionalForecast) === JSON.stringify(['120', '12', '1200']) &&
    transferred.duplicates === 0 &&
    transferred.activeJtbd === reversePriority.additionalJtbd &&
    transferred.costStatus === 'normal' && transferred.highlighted,
  `Atomic transfer failed: ${JSON.stringify(transferred)}`);

  const ownerChoice = await evaluate(`(() => {
    const product = ${JSON.stringify(goatId)};
    const d = ensureGate4SearchBuild(product);
    const phrase = ${JSON.stringify("авторская коза ручной работы 2027")};
    const key = g4sbV128PhraseKey(phrase);
    const primary = d.groupRows.find((group) => group.groupId === 'priority-primary-second');
    const additional = d.groupRows.find((group) => group.groupId === 'priority-additional-first');
    const additionalDraft = d.jtbdDraftsV388[${JSON.stringify("PLACEHOLDER_ADDITIONAL")}];
    primary.isFixed = true;
    delete primary.fixedAt;
    delete d.jtbdDraftsV388[${JSON.stringify("PLACEHOLDER_PRIMARY")}];
    additional.isFixed = false;
    additionalDraft.keywordRows = [g4sbKeywordRow(primary.demandRows[0])];
    g4sbV411RefreshDraftForecast(additionalDraft);
    d.clusterDraft = additionalDraft;
    d.activeJtbdId = additionalDraft.jtbdId;
    const occupied = (g4sbV128PhraseUsage(product, d, additionalDraft).get(key) || [])
      .find((record) => record.sameCampaign);
    g4sbSetPhraseConflict(additionalDraft, occupied, phrase);
    const resolved = g4sbV411ResolvePhraseConflict(
      product, additionalDraft.jtbdId, occupied.ownerId, 'owner');
    return {
      resolved,
      primaryFixed: g4sbGroupIsFixed(primary),
      primaryHasPhrase: primary.demandRows.some((row) => g4sbV128PhraseKey(row.kw) === key),
      additionalHasPhrase: additionalDraft.keywordRows.some((row) => g4sbV128PhraseKey(row.kw) === key),
      additionalForecast: [additionalDraft.col2, additionalDraft.col3, additionalDraft.col4],
      duplicates: g4sbV403DuplicateCount(product, d),
    };
  })()`
    .replaceAll('PLACEHOLDER_PRIMARY', reversePriority.primaryJtbd)
    .replaceAll('PLACEHOLDER_ADDITIONAL', reversePriority.additionalJtbd));
  assert(ownerChoice.resolved && ownerChoice.primaryFixed && ownerChoice.primaryHasPhrase &&
    !ownerChoice.additionalHasPhrase && ownerChoice.additionalForecast.every((value) => !value) &&
    ownerChoice.duplicates === 0,
  `Owner choice failed: ${JSON.stringify(ownerChoice)}`);

  const editingOwnerChoice = await evaluate(`(() => {
    const product = ${JSON.stringify(goatId)};
    const d = ensureGate4SearchBuild(product);
    const jtbds = g4sbV166DirectionJtbds(product);
    const primaryJtbd = jtbds[0];
    const additionalJtbd = jtbds[1];
    const phrase = ${JSON.stringify("купить козу Москва")};
    const key = g4sbV128PhraseKey(phrase);
    const ownerGroup = {
      groupId: 'editing-owner-group', clusterId: 'editing-owner-group',
      itemId: additionalJtbd.itemId, segmentIndex: G4_V166_JTBD_SCOPE,
      mainJtbdIndex: additionalJtbd.index, jtbdId: additionalJtbd.key,
      col0: additionalJtbd.text, searchIntent: additionalJtbd.text,
      demandRows: [g4sbKeywordRow({ kw: phrase, vol: '91', forecastClicks: '9',
        forecastBudget: '910', originStage: 'gate4', searchJtbdIdV394: additionalJtbd.key })],
      minus: '-бесплатно', col2: '91', col3: '9', col4: '910',
      budgetType: 'period', desiredLeads: '', desiredCpaScenario: 'base',
      callouts: ['Ручная работа', 'На заказ', 'Для подарка', 'С доставкой'],
      isFixed: false,
    };
    d.groupRows = [ownerGroup];
    d.clusters = [{ id: ownerGroup.clusterId, itemId: ownerGroup.itemId,
      segmentIndex: ownerGroup.segmentIndex, mainJtbdIndex: ownerGroup.mainJtbdIndex,
      jtbdId: ownerGroup.jtbdId, name: ownerGroup.col0,
      searchIntent: ownerGroup.searchIntent,
      demandRows: ownerGroup.demandRows.map(g4sbKeywordRow), phraseSelection: [phrase] }];
    d.adsRows = { 0: [{ ad0: 'Объявление 1', ad1: '', ad2: 'Текст 1' },
      { ad0: 'Объявление 2', ad1: '', ad2: 'Текст 2' }] };
    d.jtbdDraftsV388 = {};
    d.clusterDraft = { open: false };
    const ownerDraft = g4sbOpenSavedGroupEditor(product, d, ownerGroup, additionalJtbd);
    const currentDraft = structuredClone(ownerDraft);
    Object.assign(currentDraft, {
      open: true, editingClusterId: '', itemId: primaryJtbd.itemId,
      mainJtbdIndex: primaryJtbd.index, jtbdId: primaryJtbd.key,
      searchIntent: primaryJtbd.text, name: primaryJtbd.text,
      keywordRows: [], forecastBaselineRows: [], phraseSelection: [], extraPhrases: [],
      col2: '', col3: '', col4: '', phraseConflictMessage: '', phraseConflictTarget: null,
    });
    d.jtbdDraftsV388 = {
      [additionalJtbd.key]: ownerDraft,
      [primaryJtbd.key]: currentDraft,
    };
    d.clusterDraft = currentDraft;
    d.activeJtbdId = primaryJtbd.key;
    d.openJtbdIdsV391 = [primaryJtbd.key, additionalJtbd.key];
    const occupied = (g4sbV128PhraseUsage(product, d, currentDraft).get(key) || [])
      .find((record) => record.sameCampaign);
    if (!occupied) throw new Error('Editing owner is not visible in phrase usage');
    g4sbSetPhraseConflict(currentDraft, occupied, phrase);
    window.__g4ConflictClickTrace = [];
    const originalResolve = g4sbV411ResolvePhraseConflict;
    g4sbV411ResolvePhraseConflict = (...args) => {
      try {
        const result = originalResolve(...args);
        window.__g4ConflictClickTrace.push({ args, result });
        return result;
      } catch (error) {
        window.__g4ConflictClickTrace.push({ args, error: String(error?.stack || error) });
        throw error;
      }
    };
    renderGate();
    const currentButton = document.querySelector(
      '[data-g4sb-conflict-choice="current"][data-g4sb-conflict-source-jtbd="' +
      CSS.escape(primaryJtbd.key) + '"]');
    if (!currentButton) throw new Error('Current-choice button missing');
    // Имитируем реальный переход между двумя раскрытыми редакторами: видимая
    // панель принадлежит clusterDraft, а индекс JTBD уже указывает на другой
    // экземпляр черновика без конфликта.
    const staleIndexedDraft = structuredClone(currentDraft);
    staleIndexedDraft.phraseConflictMessage = '';
    staleIndexedDraft.phraseConflictTarget = null;
    d.jtbdDraftsV388[primaryJtbd.key] = staleIndexedDraft;
    d.clusterDraft = currentDraft;
    currentButton.click();
    const active = d.clusterDraft;
    const loser = d.jtbdDraftsV388[additionalJtbd.key];
    return {
      clickTrace: window.__g4ConflictClickTrace,
      panelStillVisible: Boolean(document.querySelector('[data-g4sb-conflict-panel]')),
      ownerWasEditing: ownerDraft.editingClusterId === ownerGroup.groupId,
      currentWasNew: !currentDraft.editingClusterId,
      staleIndexWasReplaced: d.jtbdDraftsV388[primaryJtbd.key] === currentDraft,
      currentHasPhrase: (active?.keywordRows || []).some((row) => g4sbV128PhraseKey(row.kw) === key),
      ownerHasPhrase: (loser?.keywordRows || []).some((row) => g4sbV128PhraseKey(row.kw) === key),
      activeJtbd: d.activeJtbdId,
      duplicates: g4sbV403DuplicateCount(product, d),
    };
  })()`);
  assert(editingOwnerChoice.clickTrace.length === 1 &&
    editingOwnerChoice.clickTrace[0].result === true &&
    !editingOwnerChoice.panelStillVisible && editingOwnerChoice.ownerWasEditing &&
    editingOwnerChoice.currentWasNew && editingOwnerChoice.staleIndexWasReplaced &&
    editingOwnerChoice.currentHasPhrase &&
    !editingOwnerChoice.ownerHasPhrase &&
    editingOwnerChoice.activeJtbd === reversePriority.primaryJtbd &&
    editingOwnerChoice.duplicates === 0,
  `Click transfer from editing owner failed: ${JSON.stringify(editingOwnerChoice)}`);

  console.log(JSON.stringify({ ok: true, baseline, injected, positive, removed,
    reversePriority, conflictUi: { ...conflictUi, clip: undefined }, viewSafety, transferred,
    ownerChoice, editingOwnerChoice,
    summaryScreenshot: "artifacts/gate4-search-duplicate-summary-v403.png",
    handmadeScreenshot: "artifacts/gate4-search-handmade-similar-row-v403.png",
    conflictScreenshot: "artifacts/gate4-search-phrase-conflict-choice-v411.png" }, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
