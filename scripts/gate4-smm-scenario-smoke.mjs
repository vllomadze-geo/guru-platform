import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || '9353';
const appPort = process.env.GURU_APP_PORT || '3188';
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = targets.find((entry) => entry.type === 'page' && entry.url === 'about:blank') || targets.find((entry) => entry.type === 'page');
assert(page?.webSocketDebuggerUrl);
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(message.error.message));
  else waiter.resolve(message.result);
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
  await new Promise((resolve) => setTimeout(resolve, 1300));
  const result = await evaluate(`(async () => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    const project = { id: 'smm-scenario-' + Date.now(), name: 'Scenario smoke',
      lifecycleStatus: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    state = createFreshWorkspace(project); activeProjectId = project.id;
    const productId = 'scenario-product';
    state.project.catalogItemsV189.push({ id: productId, name: 'Кроссовки', categoryId: '', continuum: 'pure_service' });
    const bucket = g4ProductSmmStoreV523(productId);
    const formats = bucket.strategy.formats;
    const idea = g4ProductSmmWithScopeV523(productId, () => g4SmmCreateIdeaV299(productId,
      { primaryTaskFormatId: formats[0].id }));
    const holder = document.createElement('main');
    holder.innerHTML = g4ProductSmmStrategyHtmlV523({ id: productId, name: 'Кроссовки' });
    document.body.replaceChildren(holder);
    const root = () => document.querySelector('[data-g4-product-smm-workspace-v2]');
    const open = async () => {
      const panel = root().querySelector('[data-g4-product-smm-idea-panel-v2]');
      panel.open = true;
      await new Promise((resolve) => setTimeout(resolve, 20));
      const insight = panel.querySelector('[data-g4-product-smm-stage-v2="insight"]');
      insight.open = true;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return insight;
    };
    let stage = await open();
    const short = stage.querySelector('[data-g4-product-smm-scenario-v548]');
    const first = short?.querySelector('[data-g4-product-smm-scenario-row-v548="hook"][data-g4-product-smm-scenario-field-v548="visual"]');
    const initial = { title: short?.querySelector('strong')?.textContent, rows: short?.querySelectorAll('tbody tr').length,
      headings: [...short.querySelectorAll('thead th')].map((node) => node.textContent.trim()) };
    first.value = 'Готовая пара крупным планом';
    first.dispatchEvent(new Event('input', { bubbles: true }));
    const typedWithoutRefresh = first.isConnected && document.activeElement !== null;
    const shortStored = bucket.content.ideas[0].scenarioByFormatV548[formats[0].id].rows.hook.visual;
    short.querySelector('[data-g4-product-smm-scenario-add-v548]').click();
    stage = await open();
    const added = stage.querySelectorAll('[data-g4-product-smm-scenario-v548] tbody tr').length === 6;
    const extra = stage.querySelector('[data-g4-product-smm-scenario-extra-v548="true"][data-g4-product-smm-scenario-field-v548="label"]');
    extra.value = 'Деталь'; extra.dispatchEvent(new Event('input', { bubbles: true }));
    const addedStored = bucket.content.ideas[0].scenarioByFormatV548[formats[0].id].extraRows[0].label;
    const digestion = root().querySelector('[data-g4-product-smm-stage-v2="digestion"]');
    digestion.open = true;
    await new Promise((resolve) => setTimeout(resolve, 20));
    const formatPicker = () => root().querySelector('[data-g4-product-smm-idea-field-v299="primaryTaskFormatId"]');
    formatPicker().value = formats[2].id;
    formatPicker().dispatchEvent(new Event('change', { bubbles: true }));
    stage = await open();
    const carousel = stage.querySelector('[data-g4-product-smm-scenario-v548]');
    const carouselTitle = carousel?.querySelector('strong')?.textContent;
    const slide = carousel?.querySelector('[data-g4-product-smm-scenario-row-v548="cover"][data-g4-product-smm-scenario-field-v548="visual"]');
    slide.value = 'Обложка: проблема'; slide.dispatchEvent(new Event('input', { bubbles: true }));
    formatPicker().value = formats[0].id;
    formatPicker().dispatchEvent(new Event('change', { bubbles: true }));
    stage = await open();
    const restored = stage.querySelector('[data-g4-product-smm-scenario-row-v548="hook"][data-g4-product-smm-scenario-field-v548="visual"]')?.value;
    const extrasRestored = stage.querySelectorAll('[data-g4-product-smm-scenario-v548] tbody tr').length;
    const carouselStored = bucket.content.ideas[0].scenarioByFormatV548[formats[2].id].rows.cover.visual;
    const allFormats = formats.map((format) => {
      const html = g4SmmScenarioHtmlV548({ ...bucket.content.ideas[0], primaryTaskFormatId: format.id }, bucket.strategy, false);
      const template = document.createElement('template'); template.innerHTML = html;
      return { title: template.content.querySelector('.g4-smm-scenario-head-v548 strong')?.textContent,
        rows: template.content.querySelectorAll('tbody tr').length };
    });
    await new Promise((resolve) => setTimeout(resolve, 350));
    const saved = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + project.id));
    const persisted = saved?.gate4ProductSmmV523?.byProduct?.[productId]?.content?.ideas?.[0]?.scenarioByFormatV548;
    return { initial, typedWithoutRefresh, shortStored, added, addedStored, carouselTitle,
      restored, extrasRestored, carouselStored, allFormats,
      persistedShort: persisted?.[formats[0].id]?.rows?.hook?.visual,
      persistedCarousel: persisted?.[formats[2].id]?.rows?.cover?.visual };
  })()`);
  assert.equal(result.initial.title, 'Сценарий короткого видео');
  assert.equal(result.initial.rows, 5);
  assert.deepEqual(result.initial.headings, ['Время', 'Часть и назначение', 'Кадр и текст на экране', 'Звук / озвучка']);
  assert(result.typedWithoutRefresh && result.added);
  assert.equal(result.shortStored, 'Готовая пара крупным планом');
  assert.equal(result.addedStored, 'Деталь');
  assert.equal(result.carouselTitle, 'Сценарий карусели');
  assert.equal(result.carouselStored, 'Обложка: проблема');
  assert.equal(result.restored, result.shortStored);
  assert.equal(result.extrasRestored, 6);
  assert.deepEqual(result.allFormats.map((item) => item.title), [
    'Сценарий короткого видео', 'Сценарий фото / кейса', 'Сценарий карусели',
    'План экспертного текста', 'Сценарий Stories', 'Сценарий длинного видео',
  ]);
  assert.equal(result.persistedShort, result.shortStored);
  assert.equal(result.persistedCarousel, result.carouselStored);
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  const mobile = await evaluate(`(async () => {
    const panel = document.querySelector('[data-g4-product-smm-idea-panel-v2]');
    panel.open = true;
    await new Promise((resolve) => setTimeout(resolve, 20));
    const stage = panel.querySelector('[data-g4-product-smm-stage-v2="insight"]');
    stage.open = true;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return { page: document.documentElement.scrollWidth, viewport: innerWidth,
      rows: stage.querySelectorAll('[data-g4-product-smm-scenario-v548] tbody tr').length };
  })()`);
  assert(mobile.page <= mobile.viewport + 2 && mobile.rows === 6, JSON.stringify(mobile));
  if (process.env.GURU_SCREENSHOT) {
    await evaluate(`document.querySelector('[data-g4-product-smm-stage-v2="insight"]').scrollIntoView({ block: 'start' })`);
    const capture = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(process.env.GURU_SCREENSHOT, Buffer.from(capture.data, 'base64'));
  }
  const company = await evaluate(`(() => {
    const strategy = g4SmmStrategyEnsureV298();
    const idea = g4SmmCreateIdeaV299('', { primaryTaskFormatId: strategy.formats[0].id });
    idea.name = 'Исходная идея'; idea.insight = 'Суть публикации';
    const holder = document.createElement('div');
    holder.innerHTML = g4SmmScenarioHtmlV548(idea, strategy, false);
    document.body.appendChild(holder);
    const input = holder.querySelector('[data-g4-smm-scenario-row-v548="hook"][data-g4-smm-scenario-field-v548="visual"]');
    input.value = 'Первый кадр'; input.dispatchEvent(new Event('input', { bubbles: true }));
    const saved = g4SmmContentEnsureV299().ideas.find((row) => row.id === idea.id);
    return { visual: saved.scenarioByFormatV548[strategy.formats[0].id].rows.hook.visual,
      name: saved.name, insight: saved.insight, count: g4SmmContentEnsureV299().ideas.length };
  })()`);
  assert.equal(company.visual, 'Первый кадр');
  assert.equal(company.name, 'Исходная идея');
  assert.equal(company.insight, 'Суть публикации');
  assert.equal(company.count, 1);
  console.log(JSON.stringify({ result, mobile, company }, null, 2));
} finally {
  socket.close();
}
