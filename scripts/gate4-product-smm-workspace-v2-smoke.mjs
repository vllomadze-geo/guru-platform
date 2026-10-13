import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || '9353';
const appPort = process.env.GURU_APP_PORT || '3188';
const screenshotPath = process.env.GURU_SCREENSHOT || '/tmp/g4-product-smm-v2-1440.png';
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = targets.find((entry) => entry.type === 'page' && entry.url === 'about:blank') || targets.find((entry) => entry.type === 'page');
assert(page?.webSocketDebuggerUrl);
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
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
  const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
try {
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes('/api/')
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, projects: [], workspaces: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }))
      : nativeFetch(input, init);
  }` });
  await call('Page.navigate', { url: `http://127.0.0.1:${appPort}/` });
  await new Promise((resolve) => setTimeout(resolve, 1300));
  const setup = await evaluate(`(() => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    const project = { id: 'product-smm-v2-' + Date.now(), name: 'SMM V2 smoke',
      lifecycleStatus: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    state = createFreshWorkspace(project); activeProjectId = project.id;
    const productId = 'smm-v2-product';
    state.project.catalogItemsV189.push({ id: productId, name: 'Кроссовки', categoryId: '', continuum: 'pure_service' });
    const bucket = g4ProductSmmStoreV523(productId);
    const format = bucket.strategy.formats[0];
    const topic = g4SmmFormatTopicsV308(format, bucket.strategy)[0];
    const existing = g4ProductSmmWithScopeV523(productId, () => g4SmmCreateIdeaV299(productId,
      { primaryTaskFormatId: format.id, topicId: topic.id }));
    const oldIdea = bucket.content.ideas.find((idea) => idea.id === existing.id);
    oldIdea.name = 'Идея №1'; oldIdea.insight = 'Процесс ухода за кроссовками';
    const before = [bucket.content.ideas.length, bucket.content.publications.length,
      bucket.strategy.topics.length, bucket.strategy.formats.length];
    const holder = document.createElement('main');
    holder.style.cssText = 'width:1120px;max-width:calc(100% - 32px);margin:16px auto';
    holder.innerHTML = g4ProductSmmStrategyHtmlV523({ id: productId, name: 'Кроссовки' });
    document.body.replaceChildren(holder);
    const root = holder.querySelector('[data-g4-product-smm-workspace-v2]');
    return { projectId: project.id, productId, formatId: format.id, topicId: topic.id, before,
      rootHeight: root.getBoundingClientRect().height,
      ideasTop: root.querySelector('[data-g4-product-smm-ideas-v2]').getBoundingClientRect().top,
      topics: root.querySelectorAll('.g4-product-smm-topic-v2').length,
      buttons: root.querySelectorAll('[data-g4-product-smm-topic-idea-add-v345]').length,
      topicButtonGap: (() => { const row = root.querySelector('.g4-product-smm-topic-v2');
        return Math.round(row.querySelector('button').getBoundingClientRect().left -
          row.querySelector('span').getBoundingClientRect().right); })(),
      initialPlan: root.querySelector('.g4-product-smm-progress-v2 strong')?.textContent.trim(),
      rows: root.querySelectorAll('.g4-product-smm-table-v2 tbody tr').length,
      oldRenderer: Boolean(root.querySelector('[data-g4-product-smm-strategy-v298], .g4-smm-period-bar-v345')),
      legacyLabels: /Количество|Единица периода/.test(root.textContent),
      platformChips: root.querySelectorAll('.g4-product-smm-platform-v2').length,
      ideaCollapsed: !root.querySelector('[data-g4-product-smm-idea-panel-v2]').open,
      ideaNumber: root.querySelector('.g4-product-smm-idea-number-v2')?.textContent.trim(),
      ideaFormat: root.querySelector('.g4-product-smm-idea-format-v2 > strong')?.textContent.trim(),
      ideaFormatIcon: root.querySelector('.g4-product-smm-idea-format-v2 .g4-product-smm-format-icon-v2')?.textContent.trim(),
      ideaTitle: root.querySelector('.g4-product-smm-idea-title-v2 > strong')?.textContent.trim(),
      ideaPlan: root.querySelector('.g4-product-smm-idea-plan-v2 > strong')?.textContent.trim(),
      bankAfterCards: root.querySelector('[data-g4-product-smm-ideas-v2]')?.nextElementSibling
        ?.matches('[data-g4-product-smm-bank-v2]'),
      calendarAfterBank: root.querySelector('[data-g4-product-smm-bank-v2]')?.nextElementSibling
        ?.matches('[data-g4-product-smm-calendar-v2]'),
      noSeparateDayPanel: !root.querySelector('[data-g4-product-smm-calendar-panel-v2]'),
      ideaFields: [...root.querySelectorAll('.g4-product-smm-idea-field-v2 > small')]
        .map((node) => node.textContent.trim()),
      genericSubtitleHidden: root.querySelector('[data-g4-product-smm-idea-subtitle-v2]')?.hidden,
      backup: Boolean(localStorage.getItem('guru-g4-product-smm-workspace-v2-backup-' + project.id + '-' + productId)) };
  })()`);
  assert.equal(setup.rows, 6);
  assert.equal(setup.topics, setup.buttons);
  assert.equal(setup.initialPlan, '1 / 3');
  assert(setup.topicButtonGap >= 0 && setup.topicButtonGap <= 8,
    `Topic button is not adjacent to its topic: ${setup.topicButtonGap}px`);
  assert(setup.platformChips > 6 && setup.ideaCollapsed && setup.backup);
  assert.equal(setup.ideaNumber, '№1');
  assert.equal(setup.ideaFormat, 'Короткое вертикальное видео');
  assert.equal(setup.ideaFormatIcon, '▶');
  assert.equal(setup.ideaTitle, 'Кроссовки');
  assert.equal(setup.ideaPlan, '1 / 3 идеи');
  assert(setup.bankAfterCards && setup.calendarAfterBank && setup.noSeparateDayPanel);
  assert.deepEqual(setup.ideaFields, ['Основная задача', 'Тема', 'Площадки', 'План формата']);
  assert(setup.genericSubtitleHidden);
  assert(!setup.oldRenderer && !setup.legacyLabels);
  assert(setup.ideasTop < 900, `Idea cards begin below the fold: ${setup.ideasTop}`);
  const capture = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(screenshotPath, Buffer.from(capture.data, 'base64'));
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  const mobile = await evaluate(`(() => {
    const root = document.querySelector('[data-g4-product-smm-workspace-v2]');
    const button = root.querySelector('[data-g4-product-smm-idea-menu-toggle-v2]').getBoundingClientRect();
    const platforms = root.querySelector('.g4-product-smm-idea-platforms-v2');
    const platformBounds = platforms.getBoundingClientRect();
    const platformsVisible = [...platforms.querySelectorAll('.g4-product-smm-platform-v2')]
      .every((chip) => { const bounds = chip.getBoundingClientRect();
        return bounds.left >= platformBounds.left && bounds.right <= platformBounds.right + 1 &&
          bounds.bottom <= platformBounds.bottom + 1; });
    return { pageWidth: document.documentElement.scrollWidth, viewport: innerWidth,
      menuVisible: button.left >= 0 && button.right <= innerWidth, platformsVisible,
      tableScrollable: root.querySelector('.g4-product-smm-table-wrap-v2').scrollWidth >
        root.querySelector('.g4-product-smm-table-wrap-v2').clientWidth };
  })()`);
  assert(mobile.pageWidth <= mobile.viewport + 2 && mobile.menuVisible &&
    mobile.platformsVisible && mobile.tableScrollable,
    `Mobile layout is broken: ${JSON.stringify(mobile)}`);
  await evaluate(`document.querySelector('[data-g4-product-smm-idea-panel-v2]').scrollIntoView({ block: 'start' })`);
  const mobilePath = screenshotPath.replace(/\.png$/, '-mobile.png');
  const mobileCapture = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(mobilePath, Buffer.from(mobileCapture.data, 'base64'));
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const lazyDetail = await evaluate(`(async () => {
    const panel = document.querySelector('[data-g4-product-smm-idea-panel-v2]');
    const slot = panel.querySelector('[data-g4-product-smm-idea-detail-v2]');
    const emptyBefore = !slot.firstElementChild;
    panel.open = true;
    await new Promise((resolve) => setTimeout(resolve, 100));
    const stages = slot.querySelectorAll('[data-g4-product-smm-stage-v2]');
    const inertBefore = !slot.querySelector('[data-g4-product-smm-idea-field-v299="name"]');
    const stageTimings = {};
    const stageImmediateTimings = {};
    for (const stage of stages) {
      const start = performance.now();
      stage.open = true;
      stageImmediateTimings[stage.dataset.g4ProductSmmStageV2] = Math.round(performance.now() - start);
      await new Promise((resolve) => setTimeout(resolve, 0));
      stageTimings[stage.dataset.g4ProductSmmStageV2] = Math.round(performance.now() - start);
    }
    const insight = slot.querySelector('[data-g4-product-smm-stage-v2="insight"]');
    const loadedAfter = Boolean(slot.querySelector('[data-g4-product-smm-idea-field-v299="name"]'));
    const noDuplicateHeader = !slot.querySelector('.g4-smm-idea-collapse-head-v343');
    const preview = slot.querySelector('[data-g4-product-smm-stage-v2="preview"]');
    const previewText = preview.querySelector('[data-g4-product-smm-social-preview-v2]')?.textContent || '';
    const allStagesOpen = [...stages].every((stage) => stage.open);
    const stagesReloaded = [...stages].every((stage) =>
      stage.dataset.g4ProductSmmStageV2 === 'preview' ||
      !stage.querySelector('[data-g4-product-smm-stage-body-v2] > template'));
    const refreshed = g4ProductSmmRefreshV523(document.querySelector('[data-g4-product-smm-workspace-v2]'));
    const restoredStages = [...refreshed.querySelectorAll('[data-g4-product-smm-idea-panel-v2][open] [data-g4-product-smm-stage-v2][open]')].length;
    const restoredPanel = refreshed.querySelector('[data-g4-product-smm-idea-panel-v2]');
    restoredPanel.open = false;
    return { emptyBefore, stageCount: stages.length, inertBefore, stageTimings,
      stageImmediateTimings, noDuplicateHeader,
      loadedAfter, allStagesOpen, stagesReloaded, restoredStages, previewText };
  })()`);
  assert(lazyDetail.emptyBefore && lazyDetail.inertBefore && lazyDetail.loadedAfter && lazyDetail.noDuplicateHeader);
  assert.equal(lazyDetail.stageCount, 6);
  assert(lazyDetail.allStagesOpen && lazyDetail.stagesReloaded && lazyDetail.restoredStages === 6 &&
    lazyDetail.previewText.includes('Процесс ухода за кроссовками'));
  assert(Math.max(...Object.values(lazyDetail.stageImmediateTimings)) < 100,
    `Stage interaction was blocked: ${JSON.stringify(lazyDetail.stageImmediateTimings)}`);
  await evaluate(`(async () => {
    const panel = document.querySelector('[data-g4-product-smm-idea-panel-v2]');
    panel.open = true;
    await new Promise((resolve) => setTimeout(resolve, 0));
    const preview = panel.querySelector('[data-g4-product-smm-stage-v2="preview"]');
    preview.open = true;
    await new Promise((resolve) => setTimeout(resolve, 0));
    preview.scrollIntoView({ block: 'center' });
  })()`);
  const previewPath = screenshotPath.replace(/\.png$/, '-preview.png');
  const previewCapture = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(previewPath, Buffer.from(previewCapture.data, 'base64'));
  await evaluate(`document.querySelector('[data-g4-product-smm-idea-panel-v2]').open = false`);
  const summaryMath = await evaluate(`(() => {
    const bucket = g4ProductSmmStoreV523(${JSON.stringify(setup.productId)});
    const strategy = structuredClone(bucket.strategy);
    strategy.planningPeriod = { count: 1, unit: 'week' };
    const formatId = ${JSON.stringify(setup.formatId)};
    const content = { calendarWeekStart: '2026-10-12', ideas: [
      { id: 'math-1', insight: 'А', primaryTaskFormatId: formatId, scheduledDate: '2026-10-12' },
      { id: 'math-2', insight: 'Б', primaryTaskFormatId: formatId, scheduledDate: '2026-10-13' },
      { id: 'math-3', insight: 'В', primaryTaskFormatId: formatId, scheduledDate: '2026-10-14' },
      { id: 'math-future', insight: 'Г', primaryTaskFormatId: formatId,
        topicId: ${JSON.stringify(setup.topicId)}, scheduledDate: '2026-10-20' },
    ], publications: [
      { id: 'math-publication', status: 'published', formatId, topicId: strategy.topics[0].id,
        date: '2026-10-12', platforms: ['VK Клипы', 'YouTube Shorts'] },
      { id: 'math-publication', status: 'published', formatId, topicId: strategy.topics[0].id,
        date: '2026-10-12', platforms: ['VK Клипы', 'YouTube Shorts'] },
      { id: 'math-planned', status: 'not_started', formatId, topicId: ${JSON.stringify(setup.topicId)},
        date: '2026-10-20', platforms: ['Instagram Reels'] },
    ] };
    const model = g4ProductSmmModelV2(content, strategy, new Date(2026, 9, 18));
    const video = model.rows.find((row) => row.format.id === formatId);
    return { plan: video.min, ideas: video.ideas, fact: video.fact, status: video.status,
      quarter: model.quarter.fact,
      futureTopic: model.topics.find((topic) => topic.name ===
        strategy.topics.find((item) => item.id === ${JSON.stringify(setup.topicId)}).value)?.status,
      futurePlatform: model.unusedPairs.find((pair) => pair.platform === 'Instagram Reels' &&
        pair.format === video.format.format)?.status };
  })()`);
  assert.deepEqual(summaryMath, { plan: 3, ideas: 3, fact: 1,
    status: 'Запланировано · опубликовано 1/3', quarter: 1,
    futureTopic: 'Запланировано', futurePlatform: 'Запланировано' });
  const flow = await evaluate(`(async () => {
    const productId = ${JSON.stringify(setup.productId)};
    const formatId = ${JSON.stringify(setup.formatId)};
    const topicId = ${JSON.stringify(setup.topicId)};
    const bucket = g4ProductSmmStoreV523(productId);
    const root = () => document.querySelector('[data-g4-product-smm-workspace-v2]');
    const firstDate = root().querySelector('[data-g4-product-smm-active-day-v2]').dataset.g4ProductSmmActiveDayV2;
    const period = root().querySelector('[data-g4-product-smm-period-select-v2]');
    period.value = '2:week'; period.dispatchEvent(new Event('change', { bubbles: true }));
    const twoWeekPlan = root().querySelector('.g4-product-smm-progress-v2 strong').textContent.trim();
    const reset = root().querySelector('[data-g4-product-smm-period-select-v2]');
    reset.value = '1:week'; reset.dispatchEvent(new Event('change', { bubbles: true }));
    root().querySelector('[data-g4-product-smm-week-shift-v322="7"]').click();
    const shiftedDate = root().querySelector('[data-g4-product-smm-active-day-v2]').dataset.g4ProductSmmActiveDayV2;
    const shiftedPlan = root().querySelector('.g4-product-smm-progress-v2 strong').textContent.trim();
    root().querySelector('[data-g4-product-smm-format-id-v345="' + formatId + '"][data-g4-product-smm-topic-id-v345="' + topicId + '"]').click();
    const futureIdea = bucket.content.ideas.at(-1);
    const futureInCalendarBank = Boolean(root().querySelector('[data-g4-product-smm-bank-v2] [data-g4-product-smm-calendar-idea-id-v2="' + futureIdea.id + '"]'));
    const futurePlanningPeriodStart = futureIdea.planningPeriodStart;
    const futureImmediatePlan = root().querySelector('.g4-product-smm-progress-v2 strong').textContent.trim();
    const futureIdeaPlan = root().querySelector('[data-g4-product-smm-idea-panel-v2="' + futureIdea.id + '"] .g4-product-smm-idea-plan-v2 strong').textContent.trim();
    const priorIdeaOutsidePeriod = root().querySelector('[data-g4-product-smm-idea-panel-v2="' + bucket.content.ideas[0].id + '"] .g4-product-smm-idea-plan-v2 strong').textContent.trim();
    const futureDraftCard = root().querySelector('[data-g4-product-smm-bank-v2] [data-g4-product-smm-calendar-drag-v339="' + futureIdea.id + '"]');
    const transfer = new DataTransfer();
    futureDraftCard.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: transfer }));
    root().querySelector('[data-g4-product-smm-calendar-day-v2="' + shiftedDate + '"]')
      .dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
    const futureDraftScheduled = futureIdea.scheduledDate === shiftedDate &&
      Boolean(root().querySelector('[data-g4-product-smm-calendar-selection-v2] [data-g4-product-smm-calendar-idea-id-v2="' + futureIdea.id + '"]'));
    const futurePanelOpenBeforeMenu = root().querySelector('[data-g4-product-smm-idea-panel-v2="' + futureIdea.id + '"]').open;
    root().querySelector('[data-g4-product-smm-idea-panel-v2="' + futureIdea.id + '"] [data-g4-product-smm-idea-menu-toggle-v2]').click();
    const menuOpenWithoutExpanding = root().querySelector('[data-g4-product-smm-idea-panel-v2="' + futureIdea.id + '"]').open === futurePanelOpenBeforeMenu &&
      !root().querySelector('[data-g4-product-smm-idea-panel-v2="' + futureIdea.id + '"] [data-g4-product-smm-idea-menu-panel-v2]').hidden;
    const originalConfirm = window.confirm;
    window.confirm = () => true;
    root().querySelector('[data-g4-product-smm-delete-idea-v2="' + futureIdea.id + '"]').click();
    window.confirm = originalConfirm;
    root().querySelector('[data-g4-product-smm-week-shift-v322="-7"]').click();
    root().querySelector('[data-g4-product-smm-format-id-v345="' + formatId + '"][data-g4-product-smm-topic-id-v345="' + topicId + '"]').click();
    const idea = bucket.content.ideas.at(-1);
    const draftInCalendarBank = Boolean(root().querySelector('[data-g4-product-smm-bank-v2] [data-g4-product-smm-calendar-idea-id-v2="' + idea.id + '"]'));
    const immediatePlan = root().querySelector('.g4-product-smm-progress-v2 strong').textContent.trim();
    const firstIdeaPlan = root().querySelector('[data-g4-product-smm-idea-panel-v2="' + bucket.content.ideas[0].id + '"] .g4-product-smm-idea-plan-v2 strong').textContent.trim();
    const immediateIdeaPlan = root().querySelector('[data-g4-product-smm-idea-panel-v2="' + idea.id + '"] .g4-product-smm-idea-plan-v2 strong').textContent.trim();
    const ideaNumbersAfterAdd = [...root().querySelectorAll('.g4-product-smm-idea-number-v2')]
      .map((node) => node.textContent.trim());
    const immediateHeader = root().querySelector('.g4-product-smm-toolbar-progress-v2 strong').textContent.trim();
    const immediateSummary = [...root().querySelectorAll('[data-g4-product-smm-summary-v2] tbody tr')]
      .find((row) => row.textContent.includes('Короткое вертикальное видео'));
    const immediateSummaryIdeas = immediateSummary?.children[2]?.textContent.trim();
    const immediateStatus = immediateSummary?.children[4]?.textContent.trim();
    const immediateScheduled = root().querySelector('.g4-product-smm-toolbar-progress-v2 > span').textContent.trim();
    const panel = root().querySelector('[data-g4-product-smm-idea-panel-v2="' + idea.id + '"]');
    const inherited = { productId: idea.productId, formatId: idea.primaryTaskFormatId, topicId: idea.topicId,
      open: panel.open };
    panel.querySelector('[data-g4-product-smm-stage-v2="insight"]').open = true;
    await new Promise((resolve) => setTimeout(resolve, 0));
    const name = panel.querySelector('[data-g4-product-smm-idea-field-v299="name"]');
    const insight = panel.querySelector('[data-g4-product-smm-idea-field-v299="insight"]');
    const tableBeforeName = root().querySelector('.g4-product-smm-table-wrap-v2');
    name.value = 'Новая идея'; name.dispatchEvent(new Event('input', { bubbles: true }));
    const liveIdeaSubtitle = root().querySelector('[data-g4-product-smm-idea-subtitle-v2="' + idea.id + '"]')?.textContent.trim();
    const liveCalendarTitle = root().querySelector('[data-g4-product-smm-calendar-title-v2="' + idea.id + '"]')?.textContent.trim();
    const tableStableOnName = tableBeforeName === root().querySelector('.g4-product-smm-table-wrap-v2');
    insight.value = 'Покажем процесс'; insight.dispatchEvent(new Event('input', { bubbles: true }));
    const tableAfterFirstInsight = root().querySelector('.g4-product-smm-table-wrap-v2');
    insight.value = 'Покажем процесс ухода'; insight.dispatchEvent(new Event('input', { bubbles: true }));
    const tableStableWhileTyping = tableAfterFirstInsight === root().querySelector('.g4-product-smm-table-wrap-v2');
    const date = root().querySelector('[data-g4-product-smm-calendar-idea-id-v2="' + idea.id + '"]');
    date.value = firstDate; date.dispatchEvent(new Event('change', { bubbles: true }));
    const scheduledDate = bucket.content.ideas.at(-1).scheduledDate;
    const dayCount = root().querySelector('[data-g4-product-smm-calendar-day-v2="' + firstDate + '"] strong')?.textContent.trim();
    const scheduledInDay = Boolean(root().querySelector('[data-g4-product-smm-calendar-selection-v2] [data-g4-product-smm-calendar-idea-id-v2="' + idea.id + '"]'));
    const scheduledInBank = Boolean(root().querySelector('[data-g4-product-smm-bank-v2] [data-g4-product-smm-calendar-idea-id-v2="' + idea.id + '"]'));
    const plannedImmediately = root().querySelector('.g4-product-smm-toolbar-progress-v2 > span')?.textContent.trim();
    const secondDate = root().querySelectorAll('[data-g4-product-smm-calendar-day-v2]')[1].dataset.g4ProductSmmCalendarDayV2;
    const moveToSecondDay = root().querySelector('[data-g4-product-smm-calendar-idea-id-v2="' + idea.id + '"]');
    moveToSecondDay.value = secondDate;
    moveToSecondDay.dispatchEvent(new Event('change', { bubbles: true }));
    const followedMovedIdea = root().querySelector('[data-g4-product-smm-active-day-v2]')?.dataset.g4ProductSmmActiveDayV2 === secondDate &&
      Boolean(root().querySelector('[data-g4-product-smm-calendar-selection-v2] [data-g4-product-smm-calendar-idea-id-v2="' + idea.id + '"]'));
    const moveBack = root().querySelector('[data-g4-product-smm-calendar-idea-id-v2="' + idea.id + '"]');
    moveBack.value = firstDate;
    moveBack.dispatchEvent(new Event('change', { bubbles: true }));
    panel.open = false;
    root().querySelector('[data-g4-product-smm-calendar-selection-v2] [data-g4-product-smm-open-idea-v2="' + idea.id + '"]').click();
    const openedFromCalendar = root().querySelector('[data-g4-product-smm-idea-panel-v2="' + idea.id + '"]')?.open;
    const nextDay = root().querySelectorAll('[data-g4-product-smm-calendar-day-v2]')[1];
    nextDay.click();
    const switchedDay = root().querySelector('[data-g4-product-smm-active-day-v2]')?.dataset.g4ProductSmmActiveDayV2;
    root().querySelector('[data-g4-product-smm-calendar-day-v2="' + firstDate + '"]').click();
    const verification = panel.querySelector('[data-g4-product-smm-stage-v2="verification"]');
    verification.open = true;
    await new Promise((resolve) => setTimeout(resolve, 0));
    panel.querySelector('[data-g4-product-smm-idea-convert-v299]').click();
    const openStageAfterConvert = document.querySelector('[data-g4-product-smm-idea-panel-v2="' + idea.id + '"] [data-g4-product-smm-stage-v2="verification"]')?.open;
    const publication = bucket.content.publications.at(-1);
    const after = [bucket.content.ideas.length, bucket.content.publications.length,
      bucket.strategy.topics.length, bucket.strategy.formats.length];
    guruPersistStateFast({ quiet: true, cloud: false });
    return { inherited, twoWeekPlan, firstDate, shiftedDate, shiftedPlan,
      futurePlanningPeriodStart, futureImmediatePlan, futureIdeaPlan, priorIdeaOutsidePeriod,
      menuOpenWithoutExpanding, futureInCalendarBank, futureDraftScheduled, draftInCalendarBank,
      liveCalendarTitle, dayCount, scheduledInDay, scheduledInBank,
      plannedImmediately, followedMovedIdea, openedFromCalendar, switchedDay,
      scheduledDate, planningPeriodStart: idea.planningPeriodStart,
      immediatePlan, firstIdeaPlan, immediateIdeaPlan, ideaNumbersAfterAdd, liveIdeaSubtitle, immediateHeader,
      immediateSummaryIdeas, immediateStatus, immediateScheduled, openStageAfterConvert,
      tableStableOnName, tableStableWhileTyping,
      publication: { formatId: publication.formatId,
      formatLabel: publication.formatLabel, topicId: publication.topicId,
      topicLabel: publication.topicLabel, platforms: publication.platforms }, after,
      stored: Boolean(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId)) };
  })()`);
  assert.deepEqual(flow.inherited, { productId: setup.productId, formatId: setup.formatId, topicId: setup.topicId, open: true });
  assert.equal(flow.twoWeekPlan, '1 / 6');
  assert.notEqual(flow.firstDate, flow.shiftedDate);
  assert.equal(flow.shiftedPlan, '0 / 3');
  assert.equal(flow.futurePlanningPeriodStart, flow.shiftedDate);
  assert.equal(flow.futureImmediatePlan, '1 / 3');
  assert.equal(flow.futureIdeaPlan, '1 / 3 идеи');
  assert.equal(flow.priorIdeaOutsidePeriod, 'Вне периода');
  assert(flow.menuOpenWithoutExpanding);
  assert(flow.futureInCalendarBank && flow.futureDraftScheduled && flow.draftInCalendarBank);
  assert.equal(flow.planningPeriodStart, flow.firstDate);
  assert.equal(flow.immediatePlan, '2 / 3');
  assert.equal(flow.firstIdeaPlan, '1 / 3 идеи');
  assert.equal(flow.immediateIdeaPlan, '2 / 3 идеи');
  assert.deepEqual(flow.ideaNumbersAfterAdd, ['№1', '№2']);
  assert.equal(flow.liveIdeaSubtitle, 'Новая идея');
  assert.equal(flow.liveCalendarTitle, 'Новая идея');
  assert.equal(flow.dayCount, '1');
  assert(flow.scheduledInDay && !flow.scheduledInBank);
  assert.equal(flow.plannedImmediately, '1 запланировано');
  assert(flow.followedMovedIdea && flow.openedFromCalendar && flow.switchedDay !== flow.firstDate);
  assert.equal(flow.immediateHeader, '2 / 10 идей');
  assert.equal(flow.immediateSummaryIdeas, '2');
  assert(flow.immediateStatus.includes('Недобор 1'));
  assert.equal(flow.immediateScheduled, '0 запланировано');
  assert.equal(flow.scheduledDate, flow.firstDate);
  assert(flow.openStageAfterConvert);
  assert(flow.tableStableOnName && flow.tableStableWhileTyping);
  assert.equal(flow.publication.formatId, setup.formatId);
  assert.equal(flow.publication.topicId, setup.topicId);
  assert(flow.publication.formatLabel && flow.publication.topicLabel && flow.publication.platforms.length > 0);
  assert.deepEqual(flow.after, [setup.before[0] + 1, setup.before[1] + 1, setup.before[2], setup.before[3]]);
  assert(flow.stored);
  await evaluate(`document.querySelector('[data-g4-product-smm-calendar-v2]').scrollIntoView({ block: 'start' })`);
  const calendarPath = screenshotPath.replace(/\.png$/, '-calendar.png');
  const calendarCapture = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(calendarPath, Buffer.from(calendarCapture.data, 'base64'));
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  const calendarMobile = await evaluate(`(() => {
    const calendar = document.querySelector('[data-g4-product-smm-calendar-v2]');
    const navigation = calendar.querySelector('.g4-product-smm-calendar-week-scroll-v2');
    const card = calendar.querySelector('[data-g4-product-smm-calendar-selection-v2] .g4-product-smm-calendar-item-v2');
    return { pageWidth: document.documentElement.scrollWidth, viewport: innerWidth,
      weekScrollable: navigation.scrollWidth > navigation.clientWidth,
      cardFits: card.getBoundingClientRect().right <= innerWidth + 1 };
  })()`);
  assert(calendarMobile.pageWidth <= calendarMobile.viewport + 2 &&
    calendarMobile.weekScrollable && calendarMobile.cardFits,
    `Mobile calendar layout is broken: ${JSON.stringify(calendarMobile)}`);
  await evaluate(`document.querySelector('[data-g4-product-smm-calendar-v2]').scrollIntoView({ block: 'start' })`);
  const calendarMobilePath = screenshotPath.replace(/\.png$/, '-calendar-mobile.png');
  const calendarMobileCapture = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(calendarMobilePath, Buffer.from(calendarMobileCapture.data, 'base64'));
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const publishedFlow = await evaluate(`(async () => {
    const root = () => document.querySelector('[data-g4-product-smm-workspace-v2]');
    const publicationId = g4ProductSmmStoreV523(${JSON.stringify(setup.productId)}).content.publications.at(-1).id;
    root().querySelector('[data-g4-product-smm-workflow-mode-v342="edit"]').click();
    const previewStage = root().querySelector('[data-g4-product-smm-stage-v2="preview"]');
    previewStage.open = true;
    await new Promise((resolve) => setTimeout(resolve, 0));
    const caption = root().querySelector('[data-g4-product-smm-publication-id-v299="' + publicationId + '"][data-g4-product-smm-package-field-v344="caption"]');
    caption.value = 'Текст для предпросмотра';
    caption.dispatchEvent(new Event('input', { bubbles: true }));
    const previewLive = previewStage.querySelector('[data-g4-product-smm-social-preview-v2]')?.textContent.includes('Текст для предпросмотра');
    const date = root().querySelector('[data-g4-product-smm-publication-id-v299="' + publicationId + '"][data-g4-product-smm-publication-field-v299="date"]');
    date.value = ${JSON.stringify('2026-10-12')};
    date.dispatchEvent(new Event('input', { bubbles: true }));
    date.dispatchEvent(new Event('change', { bubbles: true }));
    const status = root().querySelector('[data-g4-product-smm-publication-id-v299="' + publicationId + '"][data-g4-product-smm-publication-field-v299="status"]');
    status.value = 'published';
    status.dispatchEvent(new Event('change', { bubbles: true }));
    const row = [...root().querySelectorAll('[data-g4-product-smm-summary-v2] tbody tr')]
      .find((node) => node.textContent.includes('Короткое вертикальное видео'));
    const previewAfterStatus = root().querySelector('[data-g4-product-smm-stage-v2="preview"][open] [data-g4-product-smm-social-preview-v2]')?.textContent.includes('Текст для предпросмотра');
    return { fact: row?.children[3]?.textContent.trim(), previewLive, previewAfterStatus,
      quarter: root().querySelector('.g4-product-smm-quarter-v2 > span')?.textContent.trim(),
      status: g4ProductSmmStoreV523(${JSON.stringify(setup.productId)}).content.publications.at(-1).status };
  })()`);
  assert.equal(publishedFlow.fact, '1');
  assert(publishedFlow.previewLive && publishedFlow.previewAfterStatus);
  assert.equal(publishedFlow.status, 'published');
  await new Promise((resolve) => setTimeout(resolve, 650));
  const expandedLayout = await evaluate(`(() => ({
    scrollX: window.scrollX, rootLeft: document.querySelector('[data-g4-product-smm-workspace-v2]').getBoundingClientRect().left,
    pageWidth: document.documentElement.scrollWidth, viewport: window.innerWidth,
  }))()`);
  assert(expandedLayout.scrollX < 5 && expandedLayout.pageWidth <= expandedLayout.viewport + 2,
    `Expanded editor caused horizontal page overflow: ${JSON.stringify(expandedLayout)}`);
  const expandedPath = screenshotPath.replace(/\.png$/, '-expanded.png');
  const expandedCapture = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(expandedPath, Buffer.from(expandedCapture.data, 'base64'));
  await call('Page.reload', { ignoreCache: true });
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const reloaded = await evaluate(`(() => {
    const saved = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + ${JSON.stringify(setup.projectId)}));
    const bucket = saved.gate4ProductSmmV523.byProduct[${JSON.stringify(setup.productId)}];
    const idea = bucket.content.ideas.at(-1);
    const publication = bucket.content.publications.at(-1);
    return { idea: [idea.productId, idea.primaryTaskFormatId, idea.topicId, idea.planningPeriodStart],
      publication: [publication.formatId, publication.topicId],
      counts: [bucket.content.ideas.length, bucket.content.publications.length,
        bucket.strategy.topics.length, bucket.strategy.formats.length] };
  })()`);
  assert.deepEqual(reloaded.idea, [setup.productId, setup.formatId, setup.topicId, flow.firstDate]);
  assert.deepEqual(reloaded.publication, [setup.formatId, setup.topicId]);
  assert.deepEqual(reloaded.counts, flow.after);
  const deletion = await evaluate(`(async () => {
    const saved = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + ${JSON.stringify(setup.projectId)}));
    state = saved; activeProjectId = ${JSON.stringify(setup.projectId)};
    const productId = ${JSON.stringify(setup.productId)};
    const bucket = g4ProductSmmStoreV523(productId);
    const linkedIdeaId = bucket.content.ideas.at(-1).id;
    const unlinkedIdeaId = bucket.content.ideas[0].id;
    const publicationId = bucket.content.publications[0].id;
    const holder = document.createElement('main');
    holder.innerHTML = g4ProductSmmStrategyHtmlV523({ id: productId, name: 'Кроссовки' });
    document.getElementById('contentArea').replaceChildren(holder);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const root = () => document.querySelector('[data-g4-product-smm-workspace-v2]');
    const firstPanel = root().querySelector('[data-g4-product-smm-idea-panel-v2]');
    firstPanel.querySelector(':scope > summary').click();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const editor = firstPanel.querySelector('.g4-smm-idea-v299');
    const editorVisible = firstPanel.open && editor && !editor.classList.contains('is-collapsed') &&
      getComputedStyle(editor.querySelector(':scope > .g1-card-body')).display !== 'none' &&
      firstPanel.querySelectorAll('[data-g4-product-smm-stage-v2]').length === 6;
    const insightStage = firstPanel.querySelector('[data-g4-product-smm-stage-v2="insight"]');
    insightStage.querySelector(':scope > summary').click();
    await new Promise((resolve) => setTimeout(resolve, 30));
    const stageVisible = insightStage.open &&
      Boolean(insightStage.querySelector('[data-g4-product-smm-idea-field-v299="name"]')) &&
      getComputedStyle(insightStage).display !== 'none';
    const originalConfirm = window.confirm;
    window.confirm = () => false;
    const linkedPanel = root().querySelector('[data-g4-product-smm-idea-panel-v2="' + linkedIdeaId + '"]');
    linkedPanel.querySelector('[data-g4-product-smm-idea-menu-toggle-v2]').click();
    const deleteMenuVisible = !linkedPanel.querySelector('[data-g4-product-smm-idea-menu-panel-v2]').hidden;
    root().querySelector('[data-g4-product-smm-delete-idea-v2="' + linkedIdeaId + '"]').click();
    const canceled = bucket.content.ideas.length === 2;
    window.confirm = () => true;
    root().querySelector('[data-g4-product-smm-idea-panel-v2="' + unlinkedIdeaId + '"] [data-g4-product-smm-idea-menu-toggle-v2]').click();
    root().querySelector('[data-g4-product-smm-delete-idea-v2="' + unlinkedIdeaId + '"]').click();
    const renumbered = root().querySelector('[data-g4-product-smm-idea-panel-v2="' + linkedIdeaId + '"] .g4-product-smm-idea-number-v2')?.textContent.trim();
    root().querySelector('[data-g4-product-smm-idea-panel-v2="' + linkedIdeaId + '"] [data-g4-product-smm-idea-menu-toggle-v2]').click();
    root().querySelector('[data-g4-product-smm-delete-idea-v2="' + linkedIdeaId + '"]').click();
    const linkedRemoved = !bucket.content.ideas.some((idea) => idea.id === linkedIdeaId);
    const publicationKept = bucket.content.publications.some((publication) =>
      publication.id === publicationId && !publication.sourceIdeaId);
    const orphanVisible = Boolean(root().querySelector('[data-g4-product-smm-orphan-panel-v2="' + publicationId + '"]'));
    window.confirm = originalConfirm;
    const empty = bucket.content.ideas.length === 0 && bucket.content.publications.length === 1;
    const persisted = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + ${JSON.stringify(setup.projectId)}));
    return { editorVisible, stageVisible, deleteMenuVisible, canceled, renumbered, linkedRemoved, publicationKept, orphanVisible, empty,
      savedCounts: [persisted.gate4ProductSmmV523.byProduct[productId].content.ideas.length,
        persisted.gate4ProductSmmV523.byProduct[productId].content.publications.length] };
  })()`);
  assert(deletion.editorVisible && deletion.stageVisible,
    `Idea did not open in the real content area: ${JSON.stringify(deletion)}`);
  assert(deletion.deleteMenuVisible && deletion.canceled && deletion.linkedRemoved &&
    deletion.publicationKept && deletion.orphanVisible && deletion.empty);
  assert.equal(deletion.renumbered, '№1');
  assert.deepEqual(deletion.savedCounts, [0, 1]);
  console.log(JSON.stringify({ setup, mobile, lazyDetail, summaryMath, flow, publishedFlow, expandedLayout,
    reloaded, deletion, calendarMobile, screenshotPath, mobilePath, previewPath,
    calendarPath, calendarMobilePath, expandedPath }, null, 2));
} finally { socket.close(); }
