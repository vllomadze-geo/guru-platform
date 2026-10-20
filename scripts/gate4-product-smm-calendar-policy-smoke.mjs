import assert from 'node:assert/strict';

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || '9353';
const appPort = process.env.GURU_APP_PORT || '3188';
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = targets.find((entry) => entry.type === 'page' && entry.url === 'about:blank') ||
  targets.find((entry) => entry.type === 'page');
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
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes('/api/')
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, projects: [], workspaces: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }))
      : nativeFetch(input, init);
  }` });
  await call('Page.navigate', { url: `http://127.0.0.1:${appPort}/` });
  await new Promise((resolve) => setTimeout(resolve, 1300));
  const result = await evaluate(`(() => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    const project = { id: 'smm-calendar-policy-' + Date.now(), name: 'Calendar policy smoke',
      lifecycleStatus: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    state = createFreshWorkspace(project); activeProjectId = project.id;
    const productId = 'calendar-policy-product';
    state.project.catalogItemsV189.push({ id: productId, name: 'Кроссовки', categoryId: '', continuum: 'pure_service' });
    const bucket = g4ProductSmmStoreV523(productId);
    const format = bucket.strategy.formats[0];
    const topic = g4SmmFormatTopicsV308(format, bucket.strategy)[0];
    const makeIdea = (name) => {
      const made = g4ProductSmmWithScopeV523(productId, () => g4SmmCreateIdeaV299(productId,
        { primaryTaskFormatId: format.id, topicId: topic.id }));
      return { id: made.id, name };
    };
    const historical = makeIdea('Старая публикация');
    const first = makeIdea('Первая идея с длинным названием');
    const second = makeIdea('Вторая идея с длинным названием');
    for (const entry of [historical, first, second])
      bucket.content.ideas.find((row) => row.id === entry.id).name = entry.name;
    const now = new Date();
    const today = g4SmmIsoDateV322(now);
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = g4SmmIsoDateV322(yesterdayDate);
    bucket.content.ideas.find((row) => row.id === historical.id).scheduledDate = yesterday;
    bucket.content.calendarWeekStart = g4SmmIsoDateV322(g4SmmStartOfWeekV299(yesterdayDate));
    const holder = document.createElement('main');
    holder.style.cssText = 'width:1120px;max-width:calc(100% - 32px);margin:16px auto';
    holder.innerHTML = g4ProductSmmStrategyHtmlV523({ id: productId, name: 'Кроссовки' });
    document.body.replaceChildren(holder);
    const root = () => document.querySelector('[data-g4-product-smm-workspace-v2]');
    const pastTile = root().querySelector('[data-g4-product-smm-calendar-date-v2="' + yesterday + '"]');
    const historicalVisible = Boolean(pastTile?.querySelector('[data-g4-product-smm-calendar-drag-v339="' + historical.id + '"]'));
    const pastDropDisabled = !pastTile?.hasAttribute('data-g4-product-smm-calendar-drop-v339');
    const pastMenuDate = pastTile?.querySelector('[data-g4-product-smm-calendar-assign-v2] option[value="' + yesterday + '"]');
    bucket.content.calendarWeekStart = g4SmmIsoDateV322(g4SmmStartOfWeekV299(now));
    g4ProductSmmRefreshV523(root());
    const day = () => root().querySelector('[data-g4-product-smm-calendar-date-v2="' + today + '"]');
    const bankCard = (idea) => root().querySelector('[data-g4-product-smm-bank-v2] [data-g4-product-smm-calendar-drag-v339="' + idea.id + '"]');
    const select = bankCard(first).querySelector('[data-g4-product-smm-calendar-assign-v2]');
    const pastExcludedFromMenu = ![...select.options].some((option) => option.value === yesterday);
    select.add(new Option('Прошедшая дата', yesterday));
    select.value = yesterday;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    const scheduledDate = (idea) => bucket.content.ideas.find((row) => row.id === idea.id)?.scheduledDate;
    const menuRejected = !scheduledDate(first);
    const legacy = document.createElement('select');
    legacy.dataset.g4ProductSmmCalendarPlaceV322 = yesterday;
    legacy.add(new Option('Идея', first.id));
    root().append(legacy);
    legacy.dispatchEvent(new Event('change', { bubbles: true }));
    const legacyRejected = !scheduledDate(first);
    legacy.remove();
    const drag = (idea, target) => {
      const transfer = new DataTransfer();
      bankCard(idea).dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: transfer }));
      target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
      target.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: transfer }));
    };
    day().dataset.g4ProductSmmCalendarDropV339 = yesterday;
    drag(first, day());
    const dropRejected = !scheduledDate(first);
    day().dataset.g4ProductSmmCalendarDropV339 = today;
    drag(first, day());
    const oneHeight = day().getBoundingClientRect().height;
    const firstVisible = Boolean(day().querySelector('[data-g4-product-smm-calendar-drag-v339="' + first.id + '"]'));
    drag(second, day());
    const twoHeight = day().getBoundingClientRect().height;
    const inlineCards = [...day().querySelectorAll('.g4-product-smm-calendar-item-v2.is-day-v2')];
    const fit = inlineCards.every((card) => card.getBoundingClientRect().bottom <= day().getBoundingClientRect().bottom + 1);
    return { today, yesterday, historicalVisible, pastDropDisabled, pastSavedOptionDisabled: pastMenuDate?.disabled,
      pastExcludedFromMenu, menuRejected, legacyRejected, dropRejected, firstVisible,
      firstDate: scheduledDate(first), secondDate: scheduledDate(second),
      oneHeight, twoHeight, inlineCount: inlineCards.length, fit,
      separatePreviewAbsent: !root().querySelector('.g4-product-smm-calendar-selection-v2') };
  })()`);
  console.log(JSON.stringify(result, null, 2));
  assert(result.historicalVisible && result.pastDropDisabled && result.pastSavedOptionDisabled);
  assert(result.pastExcludedFromMenu && result.menuRejected && result.legacyRejected && result.dropRejected);
  assert(result.firstVisible && result.separatePreviewAbsent && result.fit);
  assert.equal(result.firstDate, result.today);
  assert.equal(result.secondDate, result.today);
  assert.equal(result.inlineCount, 2);
  assert(result.twoHeight > result.oneHeight, `Day did not grow for two ideas: ${JSON.stringify(result)}`);
} finally {
  socket.close();
}
