import assert from "node:assert/strict";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9384";
const appPort = process.env.GURU_APP_PORT || "3194";
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
  await new Promise((resolve) => setTimeout(resolve, 1400));
  const report = await evaluate(`(() => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    const now = new Date().toISOString();
    const project = { id: 'smm-material-' + Date.now(), name: 'Material',
      lifecycleStatus: 'active', createdAt: now, updatedAt: now };
    state = createFreshWorkspace(project); activeProjectId = project.id;
    state.project.productRegistryV185 = [{ id: 'category', name: 'Подарки', legacyNames: [] }];
    state.project.catalogItemsV189 = [
      { id: 'product-a', name: 'Коза', categoryId: 'category', continuum: 'pure_product' },
      { id: 'product-b', name: 'Лиса', categoryId: 'category', continuum: 'pure_product' },
    ];
    megaPlatformCategoryStore(state).categoryIdsByProduct = {
      'product-a': ['category'], 'product-b': ['category'],
    };
    const pageCard = state.gates.find((gate) => gate.id === 'gate-1').cards.find((card) =>
      g1pcIsProductCard(card) && g1pcCardKind(card) === 'product');
    pageCard.pageRows = [{ id: 'page-a', catalogItemIdV189: 'product-a', name: 'Коза',
      url: 'https://example.test/goat', contextFields: { productCreationV253: 'Ручная работа' } }];
    state.project.catalogItemsV189[0].source = {
      kind: 'gate1', cardId: pageCard.id, rowId: 'page-a', rowIndex: 0,
    };
    megaPlatformUrlStore(state).products['product-a'] = 'https://example.test/goat';
    const record = (id, productId, field, value) => ({ id, project_id: project.id,
      category_id: '', product_id: productId, scope: 'product', field, value,
      confirmation_status: 'confirmed', created_at: now, updated_at: now });
    state.project.gate0ScopedValuesV194 = [
      record('jtbd-a-1', 'product-a', 'jtbd', 'Когда нужен подарок, выбрать Козу'),
      record('jtbd-a-2', 'product-a', 'jtbd', 'Когда нужен декор, выбрать Козу'),
      record('segment-a-1', 'product-a', 'segments', 'Частные покупатели'),
      record('segment-a-2', 'product-a', 'segments', 'Корпоративные клиенты'),
      record('positioning-a', 'product-a', 'positioning', 'Авторский подарок'),
      record('usp-a', 'product-a', 'usp', 'Ручная работа'),
      record('offer-a', 'product-a', 'offers', 'Коза под заказ'),
      record('segment-b', 'product-b', 'segments', 'Коллекционеры'),
    ];
    state.project.gate0ScopedValuesV194[6].offer = {
      ctaV2: { primary: 'Оформить заказ', secondary: 'Подробнее', alternative: '' },
    };
    const render = (id) => new DOMParser().parseFromString(
      g4SmmIdeaMaterialHtmlV299({ productId: id }), 'text/html');
    const source = new DOMParser().parseFromString(
      guruStrategicFoundationHtmlV237(state.project.catalogItemsV189[0]), 'text/html'
    ).querySelector('[data-guru-strategic-product-flow]');
    const before = JSON.stringify({
      scoped: state.project.gate0ScopedValuesV194,
      gates: state.gates.filter((gate) => ['gate-0', 'gate-1', 'gate-2', 'gate-3'].includes(gate.id)),
      pain: state.painV130,
    });
    const first = render('product-a');
    const flow = first.querySelector('[data-g4-smm-idea-foundation-v313]');
    const steps = [...flow.querySelectorAll(':scope > [data-guru-strategic-step]')]
      .map((node) => node.dataset.guruStrategicStep);
    const segments = [...flow.querySelectorAll('[data-guru-strategic-segment-id]')]
      .map((node) => ({ value: node.querySelector('.guru-strategic-row-copy-v286 > span')?.textContent.trim(),
        target: JSON.parse(node.querySelector('[data-g4-jump-target]')?.dataset.g4JumpTarget || '{}') }));
    const mainJtbd = flow.querySelector('[data-guru-strategic-step="jtbd"] details');
    const offer = flow.querySelector('[data-guru-strategic-step="offer"]');
    const landing = flow.querySelector('[data-guru-strategic-step="landing"]');
    const parity = flow.innerHTML === source.innerHTML;
    state.project.gate0ScopedValuesV194.find((row) => row.id === 'segment-a-2').value = 'Команды компаний';
    const updated = render('product-a');
    const other = render('product-b');
    const companyAudit = structuredClone(state);
    companyAudit.project.gate0ScopedValuesV194.push(
      { ...record('company-active', '', 'segments', 'Активная аудитория'), scope: 'project' },
      { ...record('company-archived', '', 'segments', 'Архивная аудитория'),
        scope: 'project', archived_at: now },
    );
    const activeCompanyMaterial = g4SmmScopedValueReadOnlyV299(null, 'segments', companyAudit).value;
    const liveWorkspace = state;
    state = companyAudit;
    const activeCompanyBlog = gate1BlogLiveValuesV304('segments', { id: 'missing-product' });
    state = liveWorkspace;
    const after = JSON.stringify({
      scoped: state.project.gate0ScopedValuesV194,
      gates: state.gates.filter((gate) => ['gate-0', 'gate-1', 'gate-2', 'gate-3'].includes(gate.id)),
      pain: state.painV130,
    });
    return { steps, segments, parity,
      jtbd: flow.querySelectorAll('[data-guru-strategic-step="jtbd"] details').length,
      mainJtbd: mainJtbd?.textContent.includes('Когда нужен подарок'),
      ctas: [...offer.querySelectorAll('[data-guru-strategic-cta-v286]')].map((node) => node.textContent.trim()),
      landing: landing.textContent.includes('https://example.test/goat'),
      creation: first.querySelector('.g4-smm-material-extra-v529')?.textContent.includes('Ручная работа'),
      updated: updated.body.textContent.includes('Команды компаний') && !updated.body.textContent.includes('Корпоративные клиенты'),
      other: other.body.textContent.includes('Коллекционеры') && !other.body.textContent.includes('Частные покупатели'),
      archivedCompanyExcluded: activeCompanyMaterial === 'Активная аудитория' &&
        JSON.stringify(activeCompanyBlog) === JSON.stringify(['Активная аудитория']),
      sourceUntouched: (() => {
        const baseline = JSON.parse(before);
        const current = JSON.parse(after);
        baseline.scoped.find((row) => row.id === 'segment-a-2').value = 'Команды компаний';
        return JSON.stringify(baseline) === JSON.stringify(current);
      })(),
    };
  })()`);
  console.log(JSON.stringify(report, null, 2));
  assert.deepEqual(report.steps, ["jtbd", "segment", "positioning", "usp", "offer", "landing"]);
  assert.deepEqual(report.segments.map((row) => row.value), ["Частные покупатели", "Корпоративные клиенты"]);
  assert(report.segments.every((row) => row.target.productId === "product-a" &&
    row.target.recordId.startsWith("segment-a-")));
  assert.equal(report.jtbd, 2);
  assert.equal(report.mainJtbd, true);
  assert.deepEqual(report.ctas, ["Основной CTAОформить заказ", "Вторичный CTAПодробнее"]);
  assert.equal(report.landing, true);
  assert.equal(report.creation, true);
  assert.equal(report.parity, true);
  assert.equal(report.updated, true);
  assert.equal(report.other, true);
  assert.equal(report.archivedCompanyExcluded, true);
  assert.equal(report.sourceUntouched, true);
} finally {
  socket.close();
}
