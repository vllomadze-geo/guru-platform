import { readFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9339";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new CdpClient(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = new CdpClient(targets.find((target) => target.id === targetId).webSocketDebuggerUrl);
async function evaluate(expression) {
  const result = await page.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out: ${expression}`);
}

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes("/api/")
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmokeTest: true }), { status: 200 }))
      : originalFetch(input, init);
  }` });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof bootstrapAppOnce === "function"');
  await evaluate(`(() => {
    localStorage.clear();
    const project = { id: "product-smm-isolation", name: "Product SMM isolation", lifecycleStatus: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([project]));
    localStorage.setItem(WORKSPACE_STORAGE_PREFIX + project.id, JSON.stringify(createFreshWorkspace(project)));
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce(); openProject(project.id);
    return true;
  })()`);
  await waitFor("Boolean(state)");
  if (!await evaluate('typeof g4ProductSmmStrategyHtmlV523 === "function"'))
    await evaluate(await readFile("gate4-product-smm.js", "utf8"));
  const result = await evaluate(`(() => {
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    flashSaving = () => {}; guruPersistStateFast = () => true;
    const products = [{ id: "product-smm-goat", name: "Символ 2027 года Коза" }, { id: "product-smm-other", name: "Другой товар" }];
    state.project.catalogItemsV189 = products;
    const companyStrategy = g4SmmStrategyEnsureV298();
    companyStrategy.volume.shortVideos = 77;
    companyStrategy.planningPeriod.count = 88;
    companyStrategy.topics[0].value = "Компания: отдельная тема";
    g4SmmCreateIdeaV299("").insight = "Компания: сохранённая идея";
    const companySnapshot = JSON.stringify([state.gate4SmmStrategyV298, state.gate4SmmContentV299]);
    const otherGateSnapshot = JSON.stringify(state.gates.filter((gate) => gate.id !== "gate4" && gate.id !== "gate-4"));
    const holder = document.createElement("div"); document.body.append(holder);
    const renderProduct = (product) => {
      const original = state;
      try { state = structuredClone(original); holder.innerHTML = g4ProductSmmStrategyHtmlV523(product); }
      finally { state = original; }
    };
    const click = (selector) => { const node = holder.querySelector(selector); if (!node) throw new Error("Missing " + selector); node.click(); };
    const input = (selector, value, kind = "input") => {
      const node = holder.querySelector(selector); if (!node) throw new Error("Missing " + selector);
      node.value = value; node.dispatchEvent(new Event(kind, { bubbles: true }));
    };
    renderProduct(products[0]);
    const renderDidNotWriteProduct = !state.gate4ProductSmmV523;
    input('[data-g4-product-smm-period-count-v304]', "2");
    const defaultsSeparate = state.gate4ProductSmmV523.byProduct[products[0].id].strategy.volume.shortVideos === 3 &&
      state.gate4ProductSmmV523.byProduct[products[0].id].strategy.planningPeriod.count === 2 &&
      state.gate4ProductSmmV523.byProduct[products[0].id].content.ideas.length === 0;
    click("[data-g4-product-smm-idea-add-v299]");
    input('[data-g4-product-smm-idea-field-v299="name"]', "Коза: идея продукта");
    input('[data-g4-product-smm-idea-field-v299="insight"]', "Коза: особенный подарок");
    input('[data-g4-product-smm-idea-field-v299="digestionNotes"]', "Связь с ручной работой");
    input('[data-g4-product-smm-idea-field-v299="primaryTaskFormatId"]', "g4-smm-format-v298-1", "change");
    click("[data-g4-product-smm-idea-convert-v299]");
    click('[data-g4-product-smm-workflow-mode-v342="edit"]');
    input('[data-g4-product-smm-publication-field-v299="formatId"]', "g4-smm-format-v298-1", "change");
    input('[data-g4-product-smm-publication-field-v299="topicId"]', "g4-smm-topic-v298-1", "change");
    input('[data-g4-product-smm-brief-field-v325="hook"]', "Подарок с характером");
    input('[data-g4-product-smm-package-field-v344="caption"]', "Коза: уникальная подпись");
    click('[data-g4-product-smm-workflow-mode-v342="save"]');
    input('[data-g4-product-smm-period-count-v304]', "3", "change");
    renderProduct(products[1]);
    click("[data-g4-product-smm-idea-add-v299]");
    input('[data-g4-product-smm-idea-field-v299="name"]', "Другой товар: другая идея");
    input('[data-g4-product-smm-idea-field-v299="insight"]', "Другой товар: свой контекст");
    const first = state.gate4ProductSmmV523.byProduct[products[0].id];
    const second = state.gate4ProductSmmV523.byProduct[products[1].id];
    const separateProducts = first.strategy.planningPeriod.count === 3 && second.strategy.planningPeriod.count === 1 &&
      first.content.ideas[0].insight !== second.content.ideas[0].insight && second.content.publications.length === 0;
    renderProduct(products[0]);
    let threw = false;
    try { g4ProductSmmWithScopeV523(products[0], () => { state.project.name = "Temporary mutation"; throw new Error("Scope exception"); }); }
    catch { threw = true; }
    const root = holder.querySelector("[data-g4-product-smm-product-id-v523]");
    return {
      defaultsSeparate, separateProducts, threw, renderDidNotWriteProduct,
      companyUnchanged: companySnapshot === JSON.stringify([state.gate4SmmStrategyV298, state.gate4SmmContentV299]),
      otherGatesUnchanged: otherGateSnapshot === JSON.stringify(state.gates.filter((gate) => gate.id !== "gate4" && gate.id !== "gate-4")),
      companyAttrsAbsent: !root.querySelector('[data-g4-smm-idea-field-v299], [data-g4-smm-idea-add-v299], [data-g4-smm-period-count-v304]'),
      firstIdea: first.content.ideas[0].name, secondIdea: second.content.ideas[0].name,
      publicationHook: first.content.publications[0].creativeBrief.hook,
      publicationCaption: first.content.publications[0].publicationPackage.caption,
      restoredFirstProduct: root.textContent.includes("Коза: идея продукта") && !root.textContent.includes("Другой товар: другая идея"),
      emptyFieldsNeutral: !root.querySelector(".g1-input.is-empty, .g1-input.is-optional"),
      emptySelectLabels: [...root.querySelectorAll('select option[value=""]')].every((option) => option.textContent.trim() && option.textContent.trim() !== "Выбрать"),
    };
  })()`);
  for (const key of ["defaultsSeparate", "separateProducts", "threw", "renderDidNotWriteProduct", "companyUnchanged", "otherGatesUnchanged", "companyAttrsAbsent", "restoredFirstProduct", "emptyFieldsNeutral", "emptySelectLabels"])
    assert(result[key], `Product SMM check failed: ${key}`);
  assert(result.publicationHook === "Подарок с характером", "Publication hook was not retained");
  assert(result.publicationCaption === "Коза: уникальная подпись", "Publication caption was not retained");
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  page.close(); browser.close();
}
