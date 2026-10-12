const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9341";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const expected = {
  aware: "Человек впервые сталкивается с брендом — через рекламу, соцсети, поиск или совет знакомого. Он ещё ничего не выбирает и не сравнивает, просто узнаёт, что такой бренд/товар существует. Задача этапа — попасть в поле зрения и зацепить внимание хотя бы на секунду, оставить имя в памяти.",
  appeal: "Из всех брендов, о которых человек узнал, в голове остаётся короткий список тех, что зацепили — обычно 2-3. Здесь работает не логика, а первое впечатление: понятно ли, чем это лучше других, вызывает ли доверие с виду. Задача — попасть в этот короткий список, выделиться среди похожих.",
  ask: "Человек начинает целенаправленно искать подробности о брендах из короткого списка: читает отзывы, сравнивает цены, спрашивает знакомых, изучает сайт. Здесь решается, кому он поверит. Задача — дать понятные честные ответы на реальные вопросы и снять сомнения раньше, чем их озвучат.",
  act: "Человек принимает решение и совершает целевое действие — покупает, оформляет заявку, записывается. Дальше идёт первый опыт использования продукта. Задача этапа — убрать препятствия на пути к оплате и сделать первый опыт таким, чтобы не разочаровать.",
  advocate: "Со временем у человека формируется устойчивое отношение к бренду — он либо возвращается за повторной покупкой, либо уходит. Довольный клиент начинает советовать бренд другим сам, без просьбы. Задача — заслужить это доверие, а не выпросить отзыв."
};

const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = pages.find((item) => item.type === "page");
if (!page) throw new Error("Headless Chrome page was not found");

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const entry = pending.get(message.id);
  if (!entry) return;
  pending.delete(message.id);
  if (message.error) entry.reject(new Error(message.error.message));
  else entry.resolve(message.result);
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
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  }
  return response.result.value;
}

await call("Runtime.enable");
await call("Page.enable");
await call("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});
await call("Page.addScriptToEvaluateOnNewDocument", {
  source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes("/api/")
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmokeTest: true }), { status: 200, headers: { "Content-Type": "application/json" } }))
      : nativeFetch(input, init);
  }`,
});
await call("Page.navigate", { url: "http://127.0.0.1:3000/" });
await wait(1200);
await evaluate(`(() => {
  localStorage.clear();
  localStorage.setItem("guru-platform-access-v01", "unlocked");
  localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
    id: "gate3-stage-explanations-smoke",
    name: "Gate 3 stage explanations smoke",
    lifecycleStatus: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }]));
  location.reload();
  return true;
})()`);
await wait(1800);
await evaluate('document.querySelector("[data-open-project]")?.click(); true');
await wait(1600);

const result = await evaluate(`(() => {
  scheduleCloudSync = () => {};
  scheduleProjectsCloudSync = () => {};
  const now = new Date().toISOString();
  state.project.productRegistryV185 = [{
    id: "category-test",
    name: "Тестовая категория",
    legacyNames: [],
    createdAt: now
  }];
  state.project.catalogItemsV189 = [{
    id: "product-test",
    name: "Тестовый товар",
    continuum: "pure_product",
    categoryId: "category-test",
    createdAt: now,
    source: { kind: "gate0", key: "gate0:product-test" }
  }];
  state.project.gate0ScopedValuesV194 = [
    { id: "segment-test", project_id: activeProjectId, category_id: "category-test", product_id: "product-test", scope: "product", field: "segments", value: "Тестовый сегмент", confirmation_status: "confirmed", created_at: now, updated_at: now },
    { id: "jtbd-test", project_id: activeProjectId, category_id: "category-test", product_id: "product-test", scope: "product", field: "jtbd", value: "Тестовая задача клиента", confirmation_status: "confirmed", created_at: now, updated_at: now }
  ];
  state.project._gate0ProductIdMigrationLog = [
    { id: GURU_GATE0_PRODUCT_SCOPE_MIGRATION_V194, at: now, status: "test" },
    { id: GURU_GATE0_OFFER_CTA_MIGRATION_V197, at: now, status: "test" }
  ];
  state.gate3ProductJourneyV210 = { selectedProductId: "", openStepsByProduct: {} };
  guruNavigateToGate("gate-3");
  renderGate();
  const select = document.querySelector("[data-g3-product-journey-select]");
  select.value = "product-test";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  const keys = ${JSON.stringify(Object.keys(expected))};
  keys.forEach((key) => {
    const stage = document.querySelector('[data-g3-product-stage="' + key + '"]');
    if (stage && !stage.querySelector(".g1-card-body")) {
      stage.querySelector('[data-g3-product-stage-toggle="' + key + '"]')?.click();
    }
  });
  const explanations = Object.fromEntries(keys.map((key) => {
    const stage = document.querySelector('[data-g3-product-stage="' + key + '"]');
    const header = stage?.querySelector(":scope > .g1-card-header");
    const body = stage?.querySelector(":scope > .g1-card-body");
    const explanation = body?.querySelector('[data-g3-stage-explanation-v296="' + key + '"]');
    const title = header?.querySelector(".g1-card-title");
    const explanationStyle = explanation ? getComputedStyle(explanation) : null;
    const titleStyle = title ? getComputedStyle(title) : null;
    return [key, {
      text: explanation?.textContent.trim() || "",
      visible: Boolean(explanation && explanation.getClientRects().length && explanationStyle?.display !== "none" && explanationStyle?.visibility !== "hidden"),
      directlyUnderHeader: Boolean(header && body && header.nextElementSibling === body && body.firstElementChild === explanation),
      fontSize: Number.parseFloat(explanationStyle?.fontSize || "0"),
      titleFontSize: Number.parseFloat(titleStyle?.fontSize || "0"),
      color: explanationStyle?.color || ""
    }];
  }));
  return {
    build: window.GURU_BUILD_INFO?.version || "",
    stages: document.querySelectorAll("[data-g3-product-stage]").length,
    openBodies: document.querySelectorAll("[data-g3-product-stage] > .g1-card-body").length,
    executionBlocks: document.querySelectorAll("[data-g3-execution-stage-v282]").length,
    sourceLinks: document.querySelectorAll("[data-g3-product-source-stage]").length,
    statusPills: document.querySelectorAll("[data-g3-product-stage] > .g1-card-header .status-pill").length,
    explanations,
    errors: window.__guruConsoleLog?.filter((entry) => entry.level === "error") || []
  };
})()`);

if (result.build !== "2.3.152" || result.stages !== 5 || result.openBodies !== 5 || result.executionBlocks !== 5 || result.sourceLinks < 1 || result.statusPills !== 5 || result.errors.length) {
  throw new Error(`Gate 3 stage structure changed unexpectedly: ${JSON.stringify(result)}`);
}
for (const [stageKey, expectedText] of Object.entries(expected)) {
  const rendered = result.explanations[stageKey];
  if (rendered?.text !== expectedText || !rendered.visible || !rendered.directlyUnderHeader || !(rendered.fontSize < rendered.titleFontSize)) {
    throw new Error(`Gate 3 academic explanation mismatch for ${stageKey}: ${JSON.stringify({ rendered, expectedText })}`);
  }
}

console.log(JSON.stringify(result, null, 2));
socket.close();
