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
  assert.deepEqual(setup.ideaFields, ['Основная задача', 'Тема', 'Площадки', 'Готовность', 'План формата']);
  assert(setup.genericSubtitleHidden);
  assert(!setup.oldRenderer && !setup.legacyLabels);
  assert(setup.ideasTop < 900, `Idea cards begin below the fold: ${setup.ideasTop}`);
  const disclosure = await evaluate(`(async () => {
    const productId = ${JSON.stringify(setup.productId)};
    const key = 'g4-product-smm-strategy-' + productId;
    const root = () => document.querySelector('[data-g4-product-smm-workspace-v2]');
    const button = () => root().querySelector('[data-g4-product-smm-collapse-v2]');
    const toolbar = () => root().querySelector('.g4-product-smm-toolbar-v2');
    const initiallyOpen = !root().classList.contains('is-collapsed') &&
      button().getAttribute('aria-expanded') === 'true';
    button().click();
    const closed = root().classList.contains('is-collapsed') &&
      button().getAttribute('aria-expanded') === 'false' &&
      getComputedStyle(toolbar()).display === 'none' &&
      g4ProductSmmStoreV523(productId).collapsed.includes(key);
    g4ProductSmmRefreshV523(root());
    const closedAfterRefresh = root().classList.contains('is-collapsed') &&
      getComputedStyle(toolbar()).display === 'none';
    await new Promise((resolve) => setTimeout(resolve, 280));
    const saved = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + ${JSON.stringify(setup.projectId)}));
    const persisted = saved.gate4ProductSmmV523.byProduct[productId].collapsed.includes(key);
    const fresh = document.createElement('div');
    fresh.innerHTML = g4ProductSmmStrategyHtmlV523({ id: productId, name: 'Кроссовки' });
    const closedAfterNewRender = fresh.firstElementChild.classList.contains('is-collapsed') &&
      fresh.querySelector('[data-g4-product-smm-collapse-v2]').getAttribute('aria-expanded') === 'false';
    button().click();
    g4ProductSmmRefreshV523(root());
    const reopened = !root().classList.contains('is-collapsed') &&
      button().getAttribute('aria-expanded') === 'true' &&
      getComputedStyle(toolbar()).display !== 'none' &&
      !g4ProductSmmStoreV523(productId).collapsed.includes(key);
    return { initiallyOpen, closed, closedAfterRefresh, persisted, closedAfterNewRender, reopened };
  })()`);
  assert(Object.values(disclosure).every(Boolean), `Product SMM disclosure failed: ${JSON.stringify(disclosure)}`);
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
    const stageOrder = [...stages].map((stage) => stage.dataset.g4ProductSmmStageV2);
    const finalStageTitles = [...stages].slice(-2).map((stage) =>
      stage.querySelector('summary > strong')?.textContent.trim());
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
    const previewBody = preview.querySelector('[data-g4-product-smm-stage-body-v2]');
    const previewContent = previewBody.firstElementChild;
    preview.open = false;
    await new Promise((resolve) => setTimeout(resolve, 0));
    preview.open = true;
    await new Promise((resolve) => setTimeout(resolve, 0));
    const previewReused = previewBody.firstElementChild === previewContent;
    const allStagesOpen = [...stages].every((stage) => stage.open);
    const stagesReloaded = [...stages].every((stage) =>
      stage.dataset.g4ProductSmmStageV2 === 'preview' ||
      !stage.querySelector('[data-g4-product-smm-stage-body-v2] > template'));
    const refreshed = g4ProductSmmRefreshV523(document.querySelector('[data-g4-product-smm-workspace-v2]'));
    const restoredStages = [...refreshed.querySelectorAll('[data-g4-product-smm-idea-panel-v2][open] [data-g4-product-smm-stage-v2][open]')].length;
    const restoredPanel = refreshed.querySelector('[data-g4-product-smm-idea-panel-v2]');
    restoredPanel.open = false;
    return { emptyBefore, stageCount: stages.length, stageOrder, finalStageTitles,
      inertBefore, stageTimings,
      stageImmediateTimings, noDuplicateHeader,
      loadedAfter, allStagesOpen, stagesReloaded, restoredStages, previewText, previewReused };
  })()`);
  assert(lazyDetail.emptyBefore && lazyDetail.inertBefore && lazyDetail.loadedAfter && lazyDetail.noDuplicateHeader);
  assert.equal(lazyDetail.stageCount, 6);
  assert.deepEqual(lazyDetail.stageOrder,
    ['collection', 'digestion', 'incubation', 'insight', 'preview', 'verification']);
  assert.deepEqual(lazyDetail.finalStageTitles,
    ['5. Предпросмотр в соцсети', '6. Проверка и доработка']);
  assert(lazyDetail.allStagesOpen && lazyDetail.stagesReloaded && lazyDetail.restoredStages === 6 &&
    lazyDetail.previewReused &&
    lazyDetail.previewText.includes('Процесс ухода за кроссовками'));
  assert(Math.max(...Object.values(lazyDetail.stageImmediateTimings)) < 100,
    `Stage interaction was blocked: ${JSON.stringify(lazyDetail.stageImmediateTimings)}`);
  const pairFlow = await evaluate(`(async () => {
    const productId = ${JSON.stringify(setup.productId)};
    const root = () => document.querySelector('[data-g4-product-smm-workspace-v2]');
    const bucket = g4ProductSmmStoreV523(productId);
    let idea = bucket.content.ideas[0];
    const format = bucket.strategy.formats.find((row) => row.id === idea.primaryTaskFormatId);
    const matrixOnly = SMM_FORMAT_PLATFORM_MATRIX.length === 21 &&
      g4SmmMatrixRowsV529(format.id).length === 5;
    const inherited = idea.selectedPlatformIds.length === 5;
    const ideaPanel = root().querySelector('[data-g4-product-smm-idea-panel-v2]');
    ideaPanel.open = true;
    await new Promise((resolve) => setTimeout(resolve, 0));
    const stage = root().querySelector('[data-g4-product-smm-idea-panel-v2] [data-g4-product-smm-stage-v2="preview"]');
    stage.open = true;
    await new Promise((resolve) => setTimeout(resolve, 0));
    const cards = stage.querySelectorAll('[data-g4-product-smm-pair-card-v529]').length;
    const railBeforeTyping = stage.querySelector('[data-g4-product-smm-preview-rail-v529]');
    const base = stage.querySelector('[data-g4-product-smm-base-field-v529="text"]');
    base.value = 'Общий текст';
    base.dispatchEvent(new Event('input', { bubbles: true }));
    const railStableWhileTyping = railBeforeTyping === stage.querySelector('[data-g4-product-smm-preview-rail-v529]');
    const shared = [...stage.querySelectorAll('.g4-product-smm-social-caption-v2')]
      .every((node) => node.textContent.endsWith('Общий текст'));
    const igCard = stage.querySelector('[data-g4-product-smm-pair-card-v529="instagram"]');
    const override = igCard.querySelector('[data-g4-product-smm-override-field-v529="text"]');
    const inheritedWithoutCopy = override.value === '' && override.placeholder.includes('Общий текст');
    override.value = 'Подпись Instagram';
    override.dispatchEvent(new Event('input', { bubbles: true }));
    const isolated = idea.platformOverrides.instagram?.text === 'Подпись Instagram' &&
      igCard.querySelector('.g4-product-smm-social-caption-v2').textContent.endsWith('Подпись Instagram') &&
      stage.querySelector('[data-g4-product-smm-pair-card-v529="vk"] .g4-product-smm-social-caption-v2').textContent === 'Общий текст';
    override.value = 'Общий текст';
    override.dispatchEvent(new Event('input', { bubbles: true }));
    const overrideRemoved = !idea.platformOverrides.instagram;
    const youtubeChoice = stage.querySelector('[data-g4-product-smm-idea-platform-v529="youtube"]');
    youtubeChoice.checked = false;
    youtubeChoice.dispatchEvent(new Event('change', { bubbles: true }));
    idea = g4ProductSmmStoreV523(productId).content.ideas[0];
    const narrowed = idea.selectedPlatformIds.length === 4 &&
      root().querySelectorAll('[data-g4-product-smm-pair-card-v529]').length === 4;
    const restoredChoice = root().querySelector('[data-g4-product-smm-stage-v2="preview"] [data-g4-product-smm-idea-platform-v529="youtube"]');
    restoredChoice.checked = true;
    restoredChoice.dispatchEvent(new Event('change', { bubbles: true }));
    idea = g4ProductSmmStoreV523(productId).content.ideas[0];
    const selectionReversible = narrowed && idea.selectedPlatformIds.length === 5 &&
      root().querySelectorAll('[data-g4-product-smm-pair-card-v529]').length === 5 &&
      bucket.content.ideas.length === 1;
    const media = { assetId: 'test-media', kind: 'video', width: 1080, height: 1920, duration: 200 };
    idea.base.media = media;
    idea.base.title = 'Короткий ролик';
    const partial = g4SmmIdeaReadinessV529(idea);
    idea.platformOverrides.youtube = { media: { ...media, duration: 120 } };
    const complete = g4SmmIdeaReadinessV529(idea);
    delete idea.platformOverrides.youtube;
    idea.base.media = null; idea.base.title = ''; idea.base.text = '';
    idea.baseEdited = [];
    g4ProductSmmRefreshPairCardsV529(root(), idea);
    const canvas = document.createElement('canvas'); canvas.width = 10; canvas.height = 20;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    const file = new File([blob], 'smm-test.png', { type: 'image/png' });
    const imageMeta = await g4ProductSmmMediaMetaV529(file);
    const mediaId = 'smm-smoke-' + Date.now();
    await g4ProductSmmMediaStoreV529(mediaId, file);
    const restoredFile = await g4ProductSmmMediaLoadV529(mediaId);
    const mediaStored = imageMeta.width === 10 && imageMeta.height === 20 &&
      restoredFile?.size === file.size;
    const upload = root().querySelector('.g4-smm-pair-editor-v529 [data-g4-product-smm-media-upload-v529]');
    const transfer = new DataTransfer(); transfer.items.add(file); upload.files = transfer.files;
    upload.dispatchEvent(new Event('change', { bubbles: true }));
    const uploadedIdeaPhoto = await new Promise((resolve) => {
      let attempts = 0;
      const timer = setInterval(() => {
        const photo = root().querySelector('[data-g4-product-smm-idea-panel-v2="' + idea.id + '"] > summary .g4-product-smm-idea-photo-v2 img');
        if (photo?.src.startsWith('blob:') || ++attempts >= 100) {
          clearInterval(timer); resolve(Boolean(photo?.src.startsWith('blob:')));
        }
      }, 20);
    });
    idea = g4ProductSmmStoreV523(productId).content.ideas[0];
    idea.base.media = { assetId: mediaId, ...imageMeta };
    const initialMount = document.createElement('div');
    initialMount.innerHTML = g4ProductSmmStrategyHtmlV523({ id: productId, name: 'Кроссовки' });
    document.body.appendChild(initialMount);
    const initialPhoto = initialMount.querySelector('[data-g4-product-smm-bank-v2] .g4-product-smm-calendar-thumbnail-v2 img');
    const initialIdeaPhoto = initialMount.querySelector('[data-g4-product-smm-ideas-v2] .g4-product-smm-idea-photo-v2 img');
    const initialPhotoHydrated = await new Promise((resolve) => {
      let attempts = 0;
      const timer = setInterval(() => {
        if (initialPhoto?.src.startsWith('blob:') && initialIdeaPhoto?.src.startsWith('blob:') || ++attempts >= 100) {
          clearInterval(timer); resolve(Boolean(initialPhoto?.src.startsWith('blob:') && initialIdeaPhoto?.src.startsWith('blob:')));
        }
      }, 20);
    });
    initialMount.remove();
    idea = g4ProductSmmStoreV523(productId).content.ideas[0];
    g4ProductSmmRefreshV523(root());
    const ideaPhotoReady = await new Promise((resolve) => {
      let attempts = 0;
      const timer = setInterval(() => {
        const photo = root().querySelector('[data-g4-product-smm-idea-panel-v2="' + idea.id + '"] > summary.has-photo-v2 .g4-product-smm-idea-photo-v2 img');
        if (photo?.src.startsWith('blob:') || ++attempts >= 100) {
          clearInterval(timer); resolve(Boolean(photo?.src.startsWith('blob:')));
        }
      }, 20);
    });
    const bankPhoto = root().querySelector('[data-g4-product-smm-bank-v2] [data-g4-product-smm-calendar-drag-v339="' + idea.id + '"] .g4-product-smm-calendar-thumbnail-v2 img');
    for (let node = bankPhoto?.parentElement; node; node = node.parentElement)
      if (node.tagName === 'DETAILS') node.open = true;
    const visibleBankPhoto = root().querySelector('[data-g4-product-smm-bank-v2] [data-g4-product-smm-calendar-drag-v339="' + idea.id + '"] .g4-product-smm-calendar-thumbnail-v2 img');
    visibleBankPhoto?.scrollIntoView({ block: 'center' });
    if (visibleBankPhoto) visibleBankPhoto.loading = 'eager';
    await new Promise((resolve) => { if (visibleBankPhoto?.complete && visibleBankPhoto.naturalWidth) resolve();
      else { visibleBankPhoto?.addEventListener('load', resolve, { once: true }); setTimeout(resolve, 2000); } });
    const bankPhotoReady = visibleBankPhoto?.naturalWidth === 10 && visibleBankPhoto?.src.startsWith('blob:');
    const futureDay = [...root().querySelectorAll('[data-g4-product-smm-calendar-day-v2]')]
      .map((node) => node.dataset.g4ProductSmmCalendarDayV2).find((date) => date >= g4SmmIsoDateV322(new Date()));
    idea = g4ProductSmmStoreV523(productId).content.ideas[0];
    idea.scheduledDate = futureDay;
    g4ProductSmmPlanningRefreshV523(root(), { activeDay: futureDay });
    const calendarPhoto = root().querySelector('[data-g4-product-smm-calendar-date-v2="' + futureDay + '"] [data-g4-product-smm-calendar-drag-v339="' + idea.id + '"] .g4-product-smm-calendar-thumbnail-v2 img');
    const calendarPhotoHydrated = await new Promise((resolve) => {
      let attempts = 0;
      const timer = setInterval(() => {
        if (calendarPhoto?.src.startsWith('blob:') || ++attempts >= 100) {
          clearInterval(timer); resolve(Boolean(calendarPhoto?.src.startsWith('blob:')));
        }
      }, 20);
    });
    const calendarPhotoReady = calendarPhotoHydrated &&
      !root().querySelector('[data-g4-product-smm-bank-v2] [data-g4-product-smm-calendar-drag-v339="' + idea.id + '"]') &&
      parseFloat(getComputedStyle(calendarPhoto?.parentElement).height) >= 100;
    idea = g4ProductSmmStoreV523(productId).content.ideas[0];
    idea.scheduledDate = '';
    idea.base.media = null;
    g4ProductSmmRefreshV523(root());
    const noStaleIdeaPhoto = !root().querySelector('[data-g4-product-smm-idea-photo-v2="' + idea.id + '"]');
    idea = g4ProductSmmStoreV523(productId).content.ideas[0];
    idea.base.media = { assetId: 'missing-smm-photo-' + Date.now(), kind: 'image' };
    idea.scheduledDate = futureDay;
    g4ProductSmmRefreshV523(root());
    const missingPhotoFallsBack = await new Promise((resolve) => {
      let attempts = 0;
      const timer = setInterval(() => {
        const currentRoot = root();
        const summary = currentRoot?.querySelector('[data-g4-product-smm-idea-panel-v2="' + idea.id + '"] > summary');
        const card = currentRoot?.querySelector('[data-g4-product-smm-calendar-date-v2="' + futureDay + '"] [data-g4-product-smm-calendar-drag-v339="' + idea.id + '"]');
        const ready = summary && card && !summary.classList.contains('has-photo-v2') &&
          !card.classList.contains('has-photo-v2') &&
          !summary.querySelector('.g4-product-smm-idea-photo-v2') &&
          !card.querySelector('.g4-product-smm-calendar-thumbnail-v2 img');
        if (ready || ++attempts >= 100) { clearInterval(timer); resolve(Boolean(ready)); }
      }, 20);
    });
    idea = g4ProductSmmStoreV523(productId).content.ideas[0];
    idea.scheduledDate = '';
    idea.base.media = null;
    g4ProductSmmRefreshV523(root());
    const legacy = { project: {}, gate4SmmContentV299: { ideas: [{ id: 'old-idea',
      productId, primaryTaskFormatId: format.id, scheduledDate: '2026-10-16',
      publicationId: 'old-publication', name: 'Старое имя' }], publications: [{
      id: 'old-publication', sourceIdeaId: 'old-idea', productId,
      platforms: ['VK Клипы', 'Неизвестная площадка'], title: 'Старый текст', status: 'published', date: '2026-10-16'
    }] } };
    g4SmmContentEnsureV299(legacy);
    const migrated = legacy.gate4SmmContentV299.ideas[0];
    const preserved = migrated.id === 'old-idea' && migrated.scheduledDate === '2026-10-16' &&
      migrated.selectedPlatformIds.includes('vk') && migrated.selectedPlatformIds.includes('неизвестная площадка') &&
      migrated.base.title === 'Старый текст' && legacy.gate4SmmContentV299.publications[0].status === 'published' &&
      g4SmmPublicationPlatformIdsV532(legacy.gate4SmmContentV299.publications[0]).includes('vk') &&
      legacy.gate4SmmContentV299.publications[0].platforms.includes('Неизвестная площадка');
    return { matrixOnly, inherited, cards, shared, railStableWhileTyping, inheritedWithoutCopy,
      isolated, overrideRemoved, selectionReversible,
      partial: [partial.ready, partial.total], complete: [complete.ready, complete.total], preserved,
      mediaStored, uploadedIdeaPhoto, initialPhotoHydrated, ideaPhotoReady,
      bankPhotoReady, calendarPhotoReady, noStaleIdeaPhoto, missingPhotoFallsBack };
  })()`);
  assert(pairFlow.matrixOnly && pairFlow.inherited && pairFlow.cards === 5 && pairFlow.shared &&
    pairFlow.railStableWhileTyping && pairFlow.inheritedWithoutCopy &&
    pairFlow.isolated && pairFlow.overrideRemoved && pairFlow.selectionReversible &&
    pairFlow.preserved && pairFlow.mediaStored && pairFlow.uploadedIdeaPhoto &&
    pairFlow.initialPhotoHydrated && pairFlow.ideaPhotoReady && pairFlow.bankPhotoReady &&
    pairFlow.calendarPhotoReady && pairFlow.noStaleIdeaPhoto && pairFlow.missingPhotoFallsBack &&
    pairFlow.partial[0] === 4 && pairFlow.partial[1] === 5 &&
    pairFlow.complete[0] === 5 && pairFlow.complete[1] === 5,
    `Format + platform flow failed: ${JSON.stringify(pairFlow)}`);
  const nativePairs = await evaluate(`(() => {
    const bucket = g4ProductSmmStoreV523(${JSON.stringify(setup.productId)});
    const product = { id: ${JSON.stringify(setup.productId)}, name: 'Тестовый продукт' };
    const profilesComplete = SMM_FORMAT_PLATFORM_MATRIX.every((row) =>
      row.supported && row.native_content_type && row.media_requirements &&
      row.title_model && row.text_model && row.link_model && row.cta_model &&
      row.validation_rules && row.preview_renderer && row.preview_parts?.length);
    const oldStrategy = { gate4SmmStrategyV298: { formats: [{ id: 'g4-smm-format-v298-1',
      format: 'Короткое вертикальное видео', task: 'Охват',
      platforms: 'VK Клипы, Неизвестная площадка' }] } };
    const migratedFormat = g4SmmStrategyEnsureV298(oldStrategy).formats[0];
    const explicitIdsMigrated = migratedFormat.enabledPlatformIds.join() === 'vk' &&
      migratedFormat.platforms === 'VK Клипы, Неизвестная площадка' &&
      g4SmmFormatPlatformsV299(migratedFormat).join() === 'VK Клипы';
    const rendererKeys = new Set(SMM_FORMAT_PLATFORM_MATRIX.map((row) => row.preview_renderer));
    const idea = { id: 'native-pair-test', name: 'Внутреннее имя идеи', scheduledDate: '2026-10-16',
      base: { title: '', text: 'Общий текст', media: null, cta: '', link: '' }, platformOverrides: {} };
    const ordered = (formatNumber, platformId) => {
      const format = bucket.strategy.formats.find((row) => row.id.endsWith('-' + formatNumber));
      const pair = g4SmmPairProfileV529(format.id, platformId);
      const template = document.createElement('template');
      template.innerHTML = g4ProductSmmNativePreviewV532(pair,
        g4SmmIdeaEffectiveContentV529(idea, platformId), product, format, null, idea);
      const post = template.content.firstElementChild;
      const kind = (node) => node.matches('.g4-product-smm-social-author-v2') ? 'author'
        : node.matches('.g4-product-smm-social-caption-v2') ? 'text'
          : node.matches('.g4-product-smm-social-media-v2') ? 'media'
            : node.matches('.g4-product-smm-social-actions-v2') ? 'actions'
              : node.matches('.g4-smm-native-views-v532') ? 'views'
                : node.matches('.g4-smm-native-reactions-v532') ? 'reactions'
                  : node.matches('.g4-smm-native-comments-v532') ? 'comments'
                    : node.matches('.g4-smm-native-carousel-v532') ? 'carousel'
                      : node.matches('.g4-smm-native-video-controls-v532') ? 'controls'
                        : node.matches('.g4-smm-native-story-progress-v532') ? 'progress'
                          : node.matches('.g4-product-smm-social-heading-v2') ? 'title' : '?';
      const telegramBubble = post.querySelector('.g4-smm-telegram-bubble-v534');
      const maxBubble = post.querySelector('.g4-smm-max-bubble-v535');
      const vkPost = post.querySelector('.g4-smm-vk-post-v536');
      const instagramPost = post.querySelector('.g4-smm-instagram-post-v537');
      const order = telegramBubble
        ? ['channel', ...[...telegramBubble.children].map(kind), 'comments']
        : maxBubble ? ['channel', ...[...maxBubble.children].map(kind), 'composer']
          : vkPost ? ['appbar', 'tabs', 'post', 'navigation']
            : instagramPost ? ['appbar', 'post']
              : [...post.children].map(kind);
      return { order, renderer: post.dataset.g4SmmPreviewRendererV532,
        vkPostOrder: vkPost ? [...vkPost.children].map((node) => node.matches('.g4-smm-vk-post-header-v536') ? 'author'
          : node.matches('.g4-smm-vk-media-v536') ? 'media'
            : node.matches('.g4-smm-vk-actions-v536') ? 'actions' : kind(node)) : [],
        vkCarouselMarker: Boolean(post.querySelector('.g4-smm-vk-media-v536 .g4-smm-native-carousel-v532')),
        vkDate: post.querySelector('.g4-smm-vk-actions-v536 time')?.textContent || '',
        instagramPostOrder: instagramPost ? [...instagramPost.children].map((node) => node.matches('.g4-smm-instagram-post-header-v537') ? 'author'
          : node.matches('.g4-smm-instagram-media-v537') ? 'media'
            : node.matches('.g4-smm-instagram-pager-v537') ? 'pager'
              : node.matches('.g4-smm-instagram-actions-v537') ? 'actions'
                : node.matches('.g4-smm-instagram-caption-v537') ? 'text'
                  : node.matches('.g4-smm-instagram-date-v537') ? 'date' : '?') : [],
        instagramSlideMarker: Boolean(post.querySelector('.g4-smm-instagram-media-v537 .g4-smm-instagram-slide-v537')),
        instagramDate: post.querySelector('.g4-smm-instagram-date-v537')?.textContent || '',
        authorName: post.querySelector('.g4-product-smm-social-author-v2 strong, .g4-smm-telegram-header-v534 strong, .g4-smm-max-header-v535 strong')?.textContent,
        captionAccount: post.querySelector('.g4-smm-caption-account-v533')?.textContent || '',
        telegramDate: post.querySelector('.g4-smm-telegram-date-v534')?.textContent || '',
        telegramCommentsOutsideBubble: Boolean(post.querySelector('.g4-smm-telegram-chat-v534 > .g4-smm-telegram-comments-v534')),
        maxDate: post.querySelector('.g4-smm-max-date-v535')?.textContent || '',
        maxCommentsAbsent: !post.querySelector('.g4-smm-native-comments-v532'),
        fakeTitle: Boolean(post.querySelector('.g4-product-smm-social-heading-v2')) };
    };
    const square = { assetId: 'square-test', kind: 'video', width: 1080, height: 1080, duration: 120 };
    const shorts = g4SmmMediaCheckV529(square, g4SmmPairProfileV529('g4-smm-format-v298-1', 'youtube'));
    const tiktok = g4SmmMediaCheckV529(square, g4SmmPairProfileV529('g4-smm-format-v298-1', 'tiktok'));
    const originalProjectName = state.project.name;
    state.project.name = 'Новое имя компании';
    const liveProjectName = ordered(2, 'vk').authorName;
    const liveInstagramProjectName = ordered(2, 'instagram').authorName;
    state.project.name = originalProjectName;
    const telegramLinked = document.createElement('template');
    telegramLinked.innerHTML = g4ProductSmmNativePreviewV532(
      g4SmmPairProfileV529('g4-smm-format-v298-2', 'telegram'),
      { text: 'Текст сообщения', media: null, cta: 'Подробнее', link: 'https://example.test' },
      product, null, null, idea);
    const telegramFollowUpInsideBubble = Boolean(
      telegramLinked.content.querySelector('.g4-smm-telegram-bubble-v534 .g4-smm-pair-cta-v529') &&
      telegramLinked.content.querySelector('.g4-smm-telegram-bubble-v534 .g4-smm-pair-link-v529')) &&
      !telegramLinked.content.querySelector('.g4-smm-telegram-chat-v534 > .g4-smm-native-followup-v532');
    const maxLinked = document.createElement('template');
    maxLinked.innerHTML = g4ProductSmmNativePreviewV532(
      g4SmmPairProfileV529('g4-smm-format-v298-2', 'max'),
      { text: 'Текст сообщения', media: null, cta: 'Подробнее', link: 'https://example.test' },
      product, null, null, idea);
    const maxFollowUpInsideBubble = Boolean(
      maxLinked.content.querySelector('.g4-smm-max-bubble-v535 .g4-smm-pair-cta-v529') &&
      maxLinked.content.querySelector('.g4-smm-max-bubble-v535 .g4-smm-pair-link-v529')) &&
      !maxLinked.content.querySelector('.g4-smm-max-chat-v535 > .g4-smm-native-followup-v532');
    const vkLinked = document.createElement('template');
    vkLinked.innerHTML = g4ProductSmmNativePreviewV532(
      g4SmmPairProfileV529('g4-smm-format-v298-2', 'vk'),
      { text: 'Текст поста', media: { assetId: 'vk-photo', kind: 'image' }, cta: 'Подробнее', link: 'https://example.test' },
      product, null, null, idea);
    const vkPost = vkLinked.content.querySelector('.g4-smm-vk-post-v536');
    const vkContentPreserved = Boolean(vkPost?.querySelector('[data-g4-product-smm-media-asset-v529="vk-photo"]') &&
      vkPost?.querySelector('.g4-product-smm-social-caption-v2')?.textContent === 'Текст поста' &&
      vkPost?.querySelector('.g4-smm-native-followup-v532 .g4-smm-pair-cta-v529')?.textContent === 'Подробнее' &&
      vkPost?.querySelector('.g4-smm-native-followup-v532 .g4-smm-pair-link-v529')?.textContent === 'https://example.test');
    const vkArticle = document.createElement('template');
    vkArticle.innerHTML = g4ProductSmmNativePreviewV532(
      g4SmmPairProfileV529('g4-smm-format-v298-4', 'vk'),
      { text: 'Текст без фото', media: null, cta: '', link: '' }, product, null, null, idea);
    const vkArticleNoEmptyMedia = !vkArticle.content.querySelector('.g4-smm-vk-media-v536') &&
      vkArticle.content.querySelector('.g4-product-smm-social-caption-v2')?.textContent === 'Текст без фото';
    const instagramLinked = document.createElement('template');
    instagramLinked.innerHTML = g4ProductSmmNativePreviewV532(
      g4SmmPairProfileV529('g4-smm-format-v298-2', 'instagram'),
      { text: 'Текст Instagram', media: { assetId: 'instagram-photo', kind: 'image' }, cta: 'Подробнее', link: '' },
      product, null, null, idea);
    const instagramContentPreserved = Boolean(
      instagramLinked.content.querySelector('.g4-smm-instagram-media-v537 [data-g4-product-smm-media-asset-v529="instagram-photo"]') &&
      instagramLinked.content.querySelector('.g4-smm-instagram-caption-v537 .g4-product-smm-social-caption-v2')?.textContent === 'SMM V2 smoke Текст Instagram' &&
      instagramLinked.content.querySelector('.g4-smm-instagram-caption-v537 .g4-smm-pair-cta-v529')?.textContent === 'Подробнее');
    return { profilesComplete, explicitIdsMigrated,
      distinctKeys: rendererKeys.size === SMM_FORMAT_PLATFORM_MATRIX.length,
      liveProjectName, liveInstagramProjectName, telegramFollowUpInsideBubble, maxFollowUpInsideBubble,
      vkContentPreserved, vkArticleNoEmptyMedia, instagramContentPreserved,
      vk: ordered(2, 'vk'), vkCarousel: ordered(3, 'vk'),
      telegram: ordered(2, 'telegram'), max: ordered(2, 'max'),
      instagram: ordered(2, 'instagram'), igCarousel: ordered(3, 'instagram'),
      igReels: ordered(1, 'instagram'), tiktok: ordered(1, 'tiktok'),
      shorts: ordered(1, 'youtube'), shortsSquare: shorts.ready, tiktokSquare: tiktok.ready };
  })()`);
  assert(nativePairs.profilesComplete && nativePairs.explicitIdsMigrated && nativePairs.distinctKeys &&
    nativePairs.shortsSquare && !nativePairs.tiktokSquare,
    `Profile registry or media rules failed: ${JSON.stringify(nativePairs)}`);
  assert.deepEqual(nativePairs.vk.order, ['appbar', 'tabs', 'post', 'navigation']);
  assert.deepEqual(nativePairs.vk.vkPostOrder, ['author', 'media', 'text', 'actions']);
  assert.deepEqual(nativePairs.vkCarousel.vkPostOrder, ['author', 'media', 'text', 'actions']);
  assert(!nativePairs.vk.vkCarouselMarker && nativePairs.vkCarousel.vkCarouselMarker);
  assert.equal(nativePairs.vk.vkDate, '16 окт');
  assert(nativePairs.vkContentPreserved && nativePairs.vkArticleNoEmptyMedia);
  assert.deepEqual(nativePairs.telegram.order, ['channel', 'media', 'text', 'reactions', 'views', 'comments']);
  assert.equal(nativePairs.telegram.telegramDate, '16 октября');
  assert(nativePairs.telegram.telegramCommentsOutsideBubble);
  assert(nativePairs.telegramFollowUpInsideBubble);
  assert.deepEqual(nativePairs.max.order, ['channel', 'media', 'text', 'reactions', 'views', 'composer']);
  assert.equal(nativePairs.max.maxDate, '16 октября');
  assert(nativePairs.max.maxCommentsAbsent && nativePairs.maxFollowUpInsideBubble);
  assert.deepEqual(nativePairs.instagram.order, ['appbar', 'post']);
  assert.deepEqual(nativePairs.instagram.instagramPostOrder, ['author', 'media', 'actions', 'text', 'date']);
  assert.deepEqual(nativePairs.igCarousel.instagramPostOrder, ['author', 'media', 'pager', 'actions', 'text', 'date']);
  assert(!nativePairs.instagram.instagramSlideMarker && nativePairs.igCarousel.instagramSlideMarker);
  assert.equal(nativePairs.instagram.instagramDate, '16 октября');
  assert(nativePairs.instagramContentPreserved);
  assert.deepEqual(nativePairs.tiktok.order, ['media', 'controls', 'author', 'text']);
  assert.deepEqual(nativePairs.shorts.order, ['media', 'controls', 'author', 'text']);
  assert(!nativePairs.vk.fakeTitle && !nativePairs.instagram.fakeTitle &&
    nativePairs.instagram.renderer !== nativePairs.igCarousel.renderer &&
    nativePairs.igCarousel.renderer !== nativePairs.igReels.renderer);
  assert(['vk', 'telegram', 'max', 'instagram', 'igCarousel', 'igReels']
    .every((key) => nativePairs[key].authorName === 'SMM V2 smoke'));
  assert.equal(nativePairs.instagram.captionAccount, 'SMM V2 smoke');
  assert.equal(nativePairs.liveProjectName, 'Новое имя компании');
  assert.equal(nativePairs.liveInstagramProjectName, 'Новое имя компании');
  const fullscreen = await evaluate(`(async () => {
    const root = document.querySelector('[data-g4-product-smm-workspace-v2]');
    const fixture = document.createElement('div');
    fixture.dataset.g4ProductSmmFullscreenFixtureV538 = 'true';
    fixture.innerHTML = '<div class="g4-smm-pair-rail-v529" data-g4-product-smm-preview-rail-v529><article class="g4-smm-pair-card-v529" style="width:340px" data-g4-product-smm-pair-card-v529="instagram"><header><strong>Instagram</strong></header><div data-g4-product-smm-preview-launch-v538><div class="g4-smm-preview-launch-bar-v538"><button type="button" data-g4-product-smm-preview-open-v538>На весь экран</button></div>' +
      g4ProductSmmNativePreviewV532(g4SmmPairProfileV529('g4-smm-format-v298-2', 'instagram'),
        { text: 'Предпросмотр во весь экран', media: { assetId: 'fullscreen-image', kind: 'image' }, cta: '', link: '' },
        null, null, null, { id: 'fullscreen-idea', scheduledDate: '2026-10-16', base: {}, platformOverrides: {} }) + '</div></article></div>';
    root.append(fixture);
    const source = fixture.querySelector('[data-g4-product-smm-social-preview-v2]');
    source.querySelector('img').src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
    const button = fixture.querySelector('[data-g4-product-smm-preview-open-v538]');
    source.click();
    const dialog = document.querySelector('dialog.g4-smm-preview-dialog-v538');
    const openedByPreview = Boolean(dialog?.open && dialog.querySelector('.g4-smm-instagram-preview-v537') &&
      dialog.querySelector('img')?.src === source.querySelector('img').src &&
      Math.round(dialog.getBoundingClientRect().width) === innerWidth &&
      dialog.querySelector('.g4-smm-preview-fullscreen-card-v538').getBoundingClientRect().width > source.getBoundingClientRect().width);
    dialog.querySelector('.g4-smm-preview-fullscreen-close-v538').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const closedAndFocused = !document.querySelector('dialog.g4-smm-preview-dialog-v538') && document.activeElement === button;
    button.click();
    const reopenedByButton = Boolean(document.querySelector('dialog.g4-smm-preview-dialog-v538[open]'));
    document.querySelector('dialog.g4-smm-preview-dialog-v538').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const backdropClosed = !document.querySelector('dialog.g4-smm-preview-dialog-v538');
    const rail = fixture.querySelector('[data-g4-product-smm-preview-rail-v529]');
    source.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'mouse', pointerId: 42, button: 0, clientX: 120, clientY: 100 }));
    source.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, cancelable: true, pointerType: 'mouse', pointerId: 42, button: 0, clientX: 150, clientY: 100 }));
    document.body.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse', pointerId: 42, button: 0, clientX: 150, clientY: 100 }));
    source.click();
    const dragDidNotOpen = !document.querySelector('dialog.g4-smm-preview-dialog-v538') && !rail.classList.contains('is-dragging-v529');
    await new Promise((resolve) => setTimeout(resolve, 0));
    button.click();
    return { openedByPreview, closedAndFocused, reopenedByButton, backdropClosed,
      dragDidNotOpen,
      escapeReady: Boolean(document.querySelector('dialog.g4-smm-preview-dialog-v538[open]')) };
  })()`);
  assert(Object.values(fullscreen).every(Boolean), `Fullscreen preview failed: ${JSON.stringify(fullscreen)}`);
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  const fullscreenEscape = await evaluate(`(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    const closed = !document.querySelector('dialog.g4-smm-preview-dialog-v538');
    document.querySelector('[data-g4-product-smm-fullscreen-fixture-v538]')?.remove();
    return closed;
  })()`);
  assert(fullscreenEscape, 'Escape did not close the fullscreen preview');
  const fullscreenMessageText = await evaluate(`(async () => {
    const root = document.querySelector('[data-g4-product-smm-workspace-v2]');
    const results = [];
    for (const platform of ['telegram', 'max']) {
      const fixture = document.createElement('div');
      fixture.innerHTML = '<article class="g4-smm-pair-card-v529" data-g4-product-smm-pair-card-v529="' + platform + '">' +
        '<header><strong>' + platform + '</strong></header><div data-g4-product-smm-preview-launch-v538>' +
        g4ProductSmmNativePreviewV532(g4SmmPairProfileV529('g4-smm-format-v298-2', platform),
          { text: 'Текст публикации в полный экран', media: { assetId: 'fullscreen-message-image', kind: 'image' },
            cta: 'Посмотреть подробнее', link: 'https://example.test' },
          null, null, null, { id: 'fullscreen-message-' + platform, scheduledDate: '2026-10-16', base: {}, platformOverrides: {} }) +
        '</div></article>';
      root.append(fixture);
      fixture.querySelector('[data-g4-product-smm-social-preview-v2]').click();
      const dialog = document.querySelector('dialog.g4-smm-preview-dialog-v538[open]');
      const bubble = dialog?.querySelector(platform === 'telegram' ? '.g4-smm-telegram-bubble-v534' : '.g4-smm-max-bubble-v535');
      const caption = bubble?.querySelector('.g4-product-smm-social-caption-v2');
      results.push({ platform, text: caption?.textContent.trim(),
        color: caption && getComputedStyle(caption).color,
        background: bubble && getComputedStyle(bubble).backgroundColor,
        height: caption?.getBoundingClientRect().height || 0 });
      dialog?.close();
      await new Promise((resolve) => setTimeout(resolve, 0));
      fixture.remove();
    }
    return results;
  })()`);
  assert(fullscreenMessageText.every(({ text, color, background, height }) =>
    text === 'Текст публикации в полный экран' && color === 'rgb(40, 37, 33)' &&
    background === 'rgb(255, 255, 255)' && height > 0),
  `Telegram/MAX fullscreen text is not readable: ${JSON.stringify(fullscreenMessageText)}`);
  const ctaFlow = await evaluate(`(() => {
    const productId = ${JSON.stringify(setup.productId)};
    const bucket = g4ProductSmmStoreV523(productId);
    const idea = bucket.content.ideas[0];
    const product = g4SmmProductReadOnlyV299(productId);
    const otherProduct = { id: 'another-product', name: 'Другой продукт', categoryId: '' };
    state.project.catalogItemsV189.push(otherProduct);
    const records = state.project.gate0ScopedValuesV194 ||= [];
    const offer = { id: 'smm-cta-source', field: 'offers', scope: 'product', product_id: productId,
      value: 'Оффер продукта', offer: { ctaV2: { primary: 'Оформить заказ',
        secondary: 'Посмотреть подробнее', alternative: 'Задать вопрос' } } };
    records.push(offer, { id: 'smm-cta-other', field: 'offers', scope: 'product',
      product_id: otherProduct.id, value: 'Чужой оффер',
      offer: { ctaV2: { primary: 'Чужой CTA' } } });
    const sourceBefore = JSON.stringify(offer);
    const stage = document.querySelector('[data-g4-product-smm-stage-v2="preview"]');
    const slot = stage.querySelector('[data-g4-product-smm-stage-body-v2]');
    slot.innerHTML = g4ProductSmmSocialPreviewV2(idea, bucket.content, bucket.strategy, product);
    const input = slot.querySelector('[data-g4-product-smm-base-field-v529="cta"]');
    const proposed = [...slot.querySelectorAll('[data-g4-product-smm-cta-suggestion-v531]')]
      .map((button) => button.dataset.g4ProductSmmCtaSuggestionV531);
    input.value = 'Мой собственный CTA';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const customSaved = idea.base.cta === 'Мой собственный CTA';
    slot.querySelectorAll('[data-g4-product-smm-cta-suggestion-v531]')[1].click();
    const chosen = idea.base.cta === 'Посмотреть подробнее' &&
      input.value === 'Посмотреть подробнее' &&
      slot.querySelectorAll('[data-g4-product-smm-cta-suggestion-v531]')[1]
        .getAttribute('aria-pressed') === 'true';
    const override = slot.querySelector('[data-g4-product-smm-override-field-v529="cta"]');
    const overrideHasOptions = !override ||
      override.getAttribute('list') === slot.querySelector('datalist')?.id;
    const sourceReadOnly = JSON.stringify(offer) === sourceBefore;
    offer.offer.ctaV2.secondary = 'Новый CTA';
    slot.innerHTML = g4ProductSmmSocialPreviewV2(idea, bucket.content, bucket.strategy, product);
    const live = [...slot.querySelectorAll('[data-g4-product-smm-cta-suggestion-v531]')]
      .some((button) => button.dataset.g4ProductSmmCtaSuggestionV531 === 'Новый CTA') &&
      slot.querySelector('[data-g4-product-smm-base-field-v529="cta"]').value === 'Посмотреть подробнее';
    return { proposed, customSaved, chosen, overrideHasOptions, live,
      isolated: g4ProductSmmCtaSuggestionsV531(otherProduct).map((row) => row.value).join() === 'Чужой CTA',
      sourceReadOnly };
  })()`);
  assert.deepEqual(ctaFlow.proposed, ['Оформить заказ', 'Посмотреть подробнее', 'Задать вопрос']);
  assert(ctaFlow.customSaved && ctaFlow.chosen && ctaFlow.overrideHasOptions &&
    ctaFlow.live && ctaFlow.isolated && ctaFlow.sourceReadOnly,
    `CTA suggestions are not scoped or saved correctly: ${JSON.stringify(ctaFlow)}`);
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  const ctaMobile = await evaluate(`(() => {
    const suggestions = document.querySelector('.g4-smm-cta-suggestions-v531');
    const bounds = suggestions.getBoundingClientRect();
    return { viewport: innerWidth, pageWidth: document.documentElement.scrollWidth,
      buttonsFit: [...suggestions.querySelectorAll('button')].every((button) =>
        button.getBoundingClientRect().right <= bounds.right + 1) };
  })()`);
  assert(ctaMobile.pageWidth <= ctaMobile.viewport + 2 && ctaMobile.buttonsFit,
    `Mobile CTA suggestions overflow: ${JSON.stringify(ctaMobile)}`);
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
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
        selectedPlatformIds: ['instagram'], topicId: ${JSON.stringify(setup.topicId)}, scheduledDate: '2026-10-20' },
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
      Boolean(root().querySelector('[data-g4-product-smm-calendar-date-v2="' + shiftedDate + '"] [data-g4-product-smm-calendar-idea-id-v2="' + futureIdea.id + '"]'));
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
    const scheduledInDay = Boolean(root().querySelector('[data-g4-product-smm-calendar-date-v2="' + firstDate + '"] [data-g4-product-smm-calendar-idea-id-v2="' + idea.id + '"]'));
    const scheduledInBank = Boolean(root().querySelector('[data-g4-product-smm-bank-v2] [data-g4-product-smm-calendar-idea-id-v2="' + idea.id + '"]'));
    const plannedImmediately = root().querySelector('.g4-product-smm-toolbar-progress-v2 > span')?.textContent.trim();
    const secondDate = [...root().querySelectorAll('[data-g4-product-smm-calendar-day-v2]')]
      .map((day) => day.dataset.g4ProductSmmCalendarDayV2).find((value) => value > firstDate);
    const moveToSecondDay = root().querySelector('[data-g4-product-smm-calendar-idea-id-v2="' + idea.id + '"]');
    moveToSecondDay.value = secondDate;
    moveToSecondDay.dispatchEvent(new Event('change', { bubbles: true }));
    const followedMovedIdea = root().querySelector('[data-g4-product-smm-active-day-v2]')?.dataset.g4ProductSmmActiveDayV2 === secondDate &&
      Boolean(root().querySelector('[data-g4-product-smm-calendar-date-v2="' + secondDate + '"] [data-g4-product-smm-calendar-idea-id-v2="' + idea.id + '"]'));
    const moveBack = root().querySelector('[data-g4-product-smm-calendar-idea-id-v2="' + idea.id + '"]');
    moveBack.value = firstDate;
    moveBack.dispatchEvent(new Event('change', { bubbles: true }));
    panel.open = false;
    root().querySelector('[data-g4-product-smm-calendar-date-v2="' + firstDate + '"] [data-g4-product-smm-open-idea-v2="' + idea.id + '"]').click();
    const openedFromCalendar = root().querySelector('[data-g4-product-smm-idea-panel-v2="' + idea.id + '"]')?.open;
    const nextDay = root().querySelector('[data-g4-product-smm-calendar-day-v2="' + secondDate + '"]');
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
  assert(flow.planningPeriodStart <= flow.firstDate);
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
    const card = calendar.querySelector('.g4-product-smm-calendar-day-ideas-v2 .g4-product-smm-calendar-item-v2');
    card?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
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
    date.value = g4SmmIsoDateV322(new Date());
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
  const reloadedPage = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.removeEventListener('message', onMessage); reject(new Error('Browser reload timed out')); }, 15000);
    const onMessage = (event) => {
      if (JSON.parse(event.data).method !== 'Page.loadEventFired') return;
      clearTimeout(timer);
      socket.removeEventListener('message', onMessage);
      resolve();
    };
    socket.addEventListener('message', onMessage);
  });
  await call('Page.reload', { ignoreCache: true });
  await reloadedPage;
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
  assert.deepEqual(reloaded.idea, [setup.productId, setup.formatId, setup.topicId, flow.planningPeriodStart]);
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
    reloaded, deletion, calendarMobile, pairFlow, ctaFlow, ctaMobile, screenshotPath, mobilePath, previewPath,
    calendarPath, calendarMobilePath, expandedPath }, null, 2));
} finally { socket.close(); }
