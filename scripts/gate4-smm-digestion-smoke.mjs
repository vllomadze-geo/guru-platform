import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || '9353';
const appPort = process.env.GURU_APP_PORT || '3188';
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = targets.find((entry) => entry.type === 'page' && entry.url === 'about:blank') ||
  targets.find((entry) => entry.type === 'page');
assert(page?.webSocketDebuggerUrl, 'Chrome debugging target is unavailable');
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
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes('/api/')
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, projects: [], workspaces: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }))
      : nativeFetch(input, init);
  }` });
  await call('Page.navigate', { url: `http://127.0.0.1:${appPort}/` });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const desktop = await evaluate(`(async () => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    const project = { id: 'digestion-smoke-' + Date.now(), name: 'Digestion smoke',
      lifecycleStatus: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    state = createFreshWorkspace(project); activeProjectId = project.id;
    const productId = 'digestion-product';
    state.project.catalogItemsV189.push({ id: productId, name: 'Кроссовки', categoryId: '', continuum: 'pure_service' });
    const bucket = g4ProductSmmStoreV523(productId);
    const formatId = 'g4-smm-format-v298-1';
    const topicId = 'g4-smm-topic-v298-6';
    const idea = g4ProductSmmWithScopeV523(productId, () => g4SmmCreateIdeaV299(productId,
      { primaryTaskFormatId: formatId, topicId }));
    const expectedPairs = Object.entries(G4_SMM_FORMAT_TOPICS_V308).flatMap(([format, topics]) =>
      topics.map((topic) => [format, topic]));
    const uncovered = expectedPairs.filter(([format, topic]) => !g4SmmDigestionRoadmapV527(format, topic));
    const invalid = Object.values(G4_SMM_DIGESTION_ROADMAPS_V527).filter((steps) =>
      !steps.length || steps.some(([title, description]) => !title || !description));
    const holder = document.createElement('main');
    holder.style.cssText = 'width:1120px;max-width:calc(100% - 32px);margin:16px auto';
    holder.innerHTML = g4ProductSmmStrategyHtmlV523({ id: productId, name: 'Кроссовки' });
    document.body.replaceChildren(holder);
    const panel = holder.querySelector('[data-g4-product-smm-idea-panel-v2]');
    panel.open = true;
    await new Promise((resolve) => setTimeout(resolve, 0));
    const stage = panel.querySelector('[data-g4-product-smm-stage-v2="digestion"]');
    stage.open = true;
    await new Promise((resolve) => setTimeout(resolve, 0));
    const layout = stage.querySelector('[data-g4-product-smm-digestion-layout-v316]');
    const roadmap = stage.querySelector('[data-g4-product-smm-digestion-roadmap-v527]');
    const notes = stage.querySelector('[data-g4-product-smm-idea-field-v299="digestionNotes"]');
    notes.value = 'Сравнить процесс чистки с восстановлением формы';
    notes.dispatchEvent(new Event('input', { bubbles: true }));
    const columns = getComputedStyle(layout).gridTemplateColumns.split(' ').length;
    const order = [...layout.children].map((node) => node.className.split(' ')[0]);
    const snapshot = { routeCount: Object.keys(G4_SMM_DIGESTION_ROADMAPS_V527).length,
      expectedCount: expectedPairs.length, uncovered: uncovered.length, invalid: invalid.length,
      columns, order, routeTitles: [...roadmap.querySelectorAll('li strong')].map((node) => node.textContent),
      notesStored: bucket.content.ideas.find((row) => row.id === idea.id)?.digestionNotes === notes.value,
      summary: stage.querySelector('[data-g4-product-smm-idea-primary-task-live-v315]')?.textContent || '',
      selectedFormat: stage.querySelector('[data-g4-product-smm-idea-field-v299="primaryTaskFormatId"]')?.selectedOptions[0]?.textContent,
      placeholder: notes.placeholder,
      readonlySummary: !stage.querySelector('[data-g4-product-smm-idea-primary-task-v315] input, [data-g4-product-smm-idea-primary-task-v315] select'),
    };
    stage.scrollIntoView({ block: 'start' });
    return snapshot;
  })()`);
  assert.equal(desktop.routeCount, 14);
  assert.equal(desktop.expectedCount, 14);
  assert.equal(desktop.uncovered, 0);
  assert.equal(desktop.invalid, 0);
  assert.equal(desktop.columns, 3);
  assert.deepEqual(desktop.order, ['g4-smm-idea-primary-task-v315', 'g4-smm-digestion-roadmap-v527',
    'g1-field']);
  assert.equal(desktop.routeTitles[0], 'Узнаваемый тренд / событие');
  assert.equal(desktop.routeTitles.at(-1), 'CTA');
  assert(desktop.notesStored && desktop.readonlySummary && desktop.summary.includes('Кроссовки') === false);
  assert(desktop.summary.includes('Охват, новая аудитория'));
  assert.equal(desktop.selectedFormat, 'Короткое вертикальное видео');
  assert(desktop.placeholder.startsWith('Фиксируйте наблюдения, ассоциации'));
  const capture = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile('/tmp/guru-smm-digestion-desktop.png', Buffer.from(capture.data, 'base64'));

  const changed = await evaluate(`(async () => {
    const root = () => document.querySelector('[data-g4-product-smm-workspace-v2]');
    const stage = () => root().querySelector('[data-g4-product-smm-stage-v2="digestion"]');
    const topic = stage().querySelector('[data-g4-product-smm-idea-field-v299="topicId"]');
    topic.value = 'g4-smm-topic-v298-5';
    topic.dispatchEvent(new Event('change', { bubbles: true }));
    const caseTitles = [...stage().querySelectorAll('[data-g4-product-smm-digestion-roadmap-v527] li strong')]
      .map((node) => node.textContent);
    const format = stage().querySelector('[data-g4-product-smm-idea-field-v299="primaryTaskFormatId"]');
    format.value = 'g4-smm-format-v298-3';
    format.dispatchEvent(new Event('change', { bubbles: true }));
    const carouselCaseTitles = [...stage().querySelectorAll('[data-g4-product-smm-digestion-roadmap-v527] li strong')]
      .map((node) => node.textContent);
    const carouselTopic = stage().querySelector('[data-g4-product-smm-idea-field-v299="topicId"]');
    carouselTopic.value = 'g4-smm-topic-v298-1';
    carouselTopic.dispatchEvent(new Event('change', { bubbles: true }));
    const finalTitles = [...stage().querySelectorAll('[data-g4-product-smm-digestion-roadmap-v527] li strong')]
      .map((node) => node.textContent);
    const notes = stage().querySelector('[data-g4-product-smm-idea-field-v299="digestionNotes"]');
    const ideaId = root().querySelector('[data-g4-product-smm-idea-panel-v2]').dataset.g4ProductSmmIdeaPanelV2;
    const stored = g4ProductSmmStoreV523('digestion-product').content.ideas.find((row) => row.id === ideaId);
    return { caseTitles, carouselCaseTitles, finalTitles, notes: notes?.value,
      storedNotes: stored?.digestionNotes, stageOpen: stage().open,
      format: stored?.primaryTaskFormatId, topic: stored?.topicId };
  })()`);
  assert.equal(changed.caseTitles.length, 7);
  assert.equal(changed.caseTitles[0], 'Результат первым кадром');
  assert.equal(changed.carouselCaseTitles.length, 9);
  assert.equal(changed.carouselCaseTitles[0], 'Результат на обложке');
  assert.equal(changed.finalTitles.length, 8);
  assert.equal(changed.finalTitles[0], 'Проблема на обложке');
  assert.equal(changed.notes, 'Сравнить процесс чистки с восстановлением формы');
  assert.equal(changed.notes, changed.storedNotes);
  assert(changed.stageOpen);
  assert.equal(changed.format, 'g4-smm-format-v298-3');
  assert.equal(changed.topic, 'g4-smm-topic-v298-1');

  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  const mobile = await evaluate(`(() => {
    const layout = document.querySelector('[data-g4-product-smm-digestion-layout-v316]');
    const children = [...layout.children];
    return { columns: getComputedStyle(layout).gridTemplateColumns.split(' ').length,
      summaryBeforeRoadmap: children[0].getBoundingClientRect().top < children[1].getBoundingClientRect().top,
      roadmapBeforeNotes: children[1].getBoundingClientRect().top < children[2].getBoundingClientRect().top,
      pageWidth: document.documentElement.scrollWidth, viewport: innerWidth };
  })()`);
  assert.equal(mobile.columns, 1);
  assert(mobile.summaryBeforeRoadmap && mobile.roadmapBeforeNotes);
  assert(mobile.pageWidth <= mobile.viewport + 2, `Mobile overflow: ${JSON.stringify(mobile)}`);
  const mobileCapture = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile('/tmp/guru-smm-digestion-mobile.png', Buffer.from(mobileCapture.data, 'base64'));
  console.log(JSON.stringify({ desktop, changed, mobile }, null, 2));
} finally {
  socket.close();
}
