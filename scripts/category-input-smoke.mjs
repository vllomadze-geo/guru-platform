const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9334";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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
    id: "category-input-smoke",
    name: "Category input smoke",
    description: "",
    website: "",
    type: "Тест",
    icon: "C",
    lifecycleStatus: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }]));
  location.reload();
  return true;
})()`);
await wait(1200);
await evaluate('document.querySelector("[data-open-project]")?.click(); true');
await wait(1400);
await evaluate(`(() => {
  scheduleCloudSync = () => {};
  scheduleProjectsCloudSync = () => {};
  const catalog = guruV189EnsureCatalog(state);
  let item = catalog.items.find((entry) => entry.id === "category-smoke-item");
  if (!item) {
    item = { id: "category-smoke-item", name: "Тестовая услуга", continuum: "pure_service", categoryId: "", createdAt: new Date().toISOString() };
    catalog.items.unshift(item);
  }
  guruNavigateToGate("gate-0");
  return true;
})()`);
await wait(2000);

const setup = await evaluate(`(() => {
  const select = document.querySelector('[data-guru-catalog-category="category-smoke-item"]');
  if (!select) return {
    error: "category select was not rendered",
    activeProjectId,
    activeGateId,
    activeView,
    pageTitle: document.querySelector("#pageTitle")?.textContent || "",
    catalogItems: state?.project?.catalogItemsV189 || [],
    body: document.body.innerText.slice(0, 1000),
  };
  select.value = "__new__";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  const input = document.querySelector('[data-guru-catalog-inline-category-name="category-smoke-item"]');
  window.__categoryFullFieldScans = 0;
  const originalApplyFieldStates = guruApplyFieldStates;
  guruApplyFieldStates = function () {
    window.__categoryFullFieldScans += 1;
    return originalApplyFieldStates.apply(this, arguments);
  };
  return {
    inputRendered: Boolean(input),
    focused: document.activeElement === input,
    controls: document.querySelectorAll(".content-area input, .content-area textarea, .content-area select").length,
  };
})()`);

const typing = await evaluate(`(() => {
  const input = document.querySelector('[data-guru-catalog-inline-category-name="category-smoke-item"]');
  if (!input) return { error: "inline category input was not rendered" };
  input.focus();
  const samples = [];
  for (const char of "Новая тестовая категория") {
    const startedAt = performance.now();
    input.value += char;
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: char, inputType: "insertText" }));
    samples.push(performance.now() - startedAt);
  }
  return {
    value: input.value,
    focused: document.activeElement === input,
    connected: input.isConnected,
    maxMs: Math.max(...samples),
    averageMs: samples.reduce((sum, value) => sum + value, 0) / samples.length,
    fullFieldScans: window.__categoryFullFieldScans,
    samples,
  };
})()`);

const rerender = await evaluate(`(() => {
  renderGate();
  const input = document.querySelector('[data-guru-catalog-inline-category-name="category-smoke-item"]');
  return {
    value: input?.value || "",
    focused: document.activeElement === input,
    draft: guruV189CatalogItemById("category-smoke-item", state)?._categoryDraft || "",
  };
})()`);

const enter = await evaluate(`(() => {
  const input = document.querySelector('[data-guru-catalog-inline-category-name="category-smoke-item"]');
  input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
  return {
    inputStillOpen: Boolean(document.querySelector('[data-guru-catalog-inline-category-name="category-smoke-item"]')),
    selectedCategory: guruV189CatalogItemById("category-smoke-item", state)?.categoryId || "",
  };
})()`);

if (!setup.inputRendered || !setup.focused) {
  throw new Error(`Inline category input did not receive focus: ${JSON.stringify(setup)}`);
}
if (!typing.focused || !typing.connected || typing.fullFieldScans !== 0) {
  throw new Error(`Category typing was unstable: ${JSON.stringify(typing)}`);
}
if (rerender.value !== typing.value || rerender.draft !== typing.value || !rerender.focused) {
  throw new Error(`Category draft did not survive renderGate(): ${JSON.stringify(rerender)}`);
}
if (enter.inputStillOpen || !enter.selectedCategory) {
  throw new Error(`Enter did not create and select a category: ${JSON.stringify(enter)}`);
}

console.log(JSON.stringify({ setup, typing, rerender, enter }, null, 2));
socket.close();
