import assert from "node:assert/strict";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9383";
const appPort = process.env.GURU_APP_PORT || "3193";
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const target = targets.find((item) => item.type === "page" && item.url === "about:blank") ||
  targets.find((item) => item.type === "page");
assert(target?.webSocketDebuggerUrl);
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  message.error ? request.reject(new Error(message.error.message)) : request.resolve(message.result);
});
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const response = await call("Runtime.evaluate", {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (response.exceptionDetails)
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}

try {
  await call("Runtime.enable");
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes('/api/')
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, projects: [], workspaces: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }))
      : nativeFetch(input, init);
  }` });
  await call("Page.navigate", { url: `http://127.0.0.1:${appPort}/` });
  await new Promise((resolve) => setTimeout(resolve, 1300));
  const report = await evaluate(`(() => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    const project = { id: 'foundation-segments-' + Date.now(), name: 'Segments',
      lifecycleStatus: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    state = createFreshWorkspace(project); activeProjectId = project.id;
    state.project.productRegistryV185 = [{ id: 'category', name: 'Подарки', legacyNames: [] }];
    state.project.catalogItemsV189 = [
      { id: 'product-a', name: 'Коза', categoryId: 'category', continuum: 'pure_product' },
      { id: 'product-b', name: 'Лиса', categoryId: 'category', continuum: 'pure_product' },
      { id: 'product-c', name: 'Сова', categoryId: 'category', continuum: 'pure_product' },
    ];
    megaPlatformCategoryStore(state).categoryIdsByProduct = {
      'product-a': ['category'], 'product-b': ['category'], 'product-c': ['category'],
    };
    const record = (id, productId, field, value) => ({ id, project_id: project.id,
      category_id: '', product_id: productId, scope: 'product', field, value,
      source: { type: 'manual', label: 'Smoke' }, confirmation_status: 'confirmed',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    state.project.gate0ScopedValuesV194 = [
      record('segment-a-1', 'product-a', 'segments', 'Частные покупатели'),
      record('segment-a-2', 'product-a', 'segments', 'Корпоративные клиенты'),
      record('segment-a-draft', 'product-a', 'segments', ''),
      record('segment-b-1', 'product-b', 'segments', 'Коллекционеры'),
      record('positioning-a', 'product-a', 'positioning', 'Авторские подарки'),
    ];
    state.project.gate0ScopedValuesV194[4].positioning = { segment_record_id: 'segment-a-2' };
    const product = (id) => guruV194Product(id, state);
    const view = (id) => new DOMParser().parseFromString(
      guruStrategicFoundationHtmlV237(product(id)), 'text/html');
    const rows = (id) => [...view(id).querySelectorAll(
      '[data-guru-strategic-step="segment"] [data-guru-strategic-segment-id]'
    )].map((node) => ({
      id: node.dataset.guruStrategicSegmentId,
      label: node.querySelector('.guru-strategic-row-copy-v286 > strong')?.textContent.trim(),
      value: node.querySelector('.guru-strategic-row-copy-v286 > span')?.textContent.trim(),
      status: node.querySelector('.status-pill')?.textContent.trim(),
      source: JSON.parse(node.querySelector('[data-g4-jump-target]')?.dataset.g4JumpTarget || '{}'),
    }));
    const original = state.project.gate0ScopedValuesV194.map(({ id, value }) => [id, value]);
    const first = rows('product-a');
    const linkedSelectionUnchanged = guruStrategicFoundationModelV286(product('product-a'))
      .fields.segment.value === 'Корпоративные клиенты';
    const other = rows('product-b');
    const empty = view('product-c').querySelectorAll(
      '[data-guru-strategic-step="segment"] .guru-strategic-row-v286').length;
    const preserved = JSON.stringify(original) === JSON.stringify(
      state.project.gate0ScopedValuesV194.map(({ id, value }) => [id, value]));
    state.project.gate0ScopedValuesV194.find((entry) => entry.id === 'segment-a-2').value = 'Команды компаний';
    const updated = rows('product-a');
    for (let index = 3; index <= 5; index += 1)
      state.project.gate0ScopedValuesV194.push(record(
        'segment-a-' + index, 'product-a', 'segments', 'Группа ' + index));
    const allFive = rows('product-a');
    return { first, other, empty, preserved, linkedSelectionUnchanged, updated,
      allFive: allFive.map((row) => row.id) };
  })()`);
  console.log(JSON.stringify(report, null, 2));
  assert.deepEqual(report.first.map((row) => row.id), ["segment-a-1", "segment-a-2"]);
  assert.deepEqual(report.first.map((row) => row.label), ["Сегмент 1", "Сегмент 2"]);
  assert.deepEqual(report.first.map((row) => row.value),
    ["Частные покупатели", "Корпоративные клиенты"]);
  assert(report.first.every((row) => row.status === "Готово" &&
    row.source.gateId === "gate-0" && row.source.recordId === row.id));
  assert.deepEqual(report.other.map((row) => row.value), ["Коллекционеры"]);
  assert.equal(report.other[0].label, "Сегмент");
  assert.equal(report.empty, 1);
  assert.equal(report.preserved, true);
  assert.equal(report.linkedSelectionUnchanged, true);
  assert.deepEqual(report.updated.map((row) => row.value),
    ["Частные покупатели", "Команды компаний"]);
  assert.deepEqual(report.allFive,
    ["segment-a-1", "segment-a-2", "segment-a-3", "segment-a-4", "segment-a-5"]);
} finally {
  socket.close();
}
