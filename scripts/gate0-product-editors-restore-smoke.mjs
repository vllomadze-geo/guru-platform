import { writeFile } from "node:fs/promises";

const debugPort = Number(process.env.GURU_CHROME_DEBUG_PORT || 9335);
const appPort = Number(process.env.GURU_APP_PORT || 3211);
const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = pages.find((item) => item.type === "page");
if (!page) throw new Error("Chrome page not found");

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let nextId = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  const wait = pending.get(message.id);
  if (!wait) return;
  pending.delete(message.id);
  if (message.error) wait.reject(new Error(message.error.message));
  else wait.resolve(message.result);
});
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId;
  const timer = setTimeout(() => {
    pending.delete(id);
    reject(new Error(`${method} timed out`));
  }, 30000);
  pending.set(id, {
    resolve: (value) => { clearTimeout(timer); resolve(value); },
    reject: (error) => { clearTimeout(timer); reject(error); },
  });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};

try {
  await call("Runtime.enable");
  await call("Page.enable");
  await call("Network.clearBrowserCache");
  await call("Emulation.setDeviceMetricsOverride", {
    width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false,
  });
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes("/api/")
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmokeTest: true }), {
          status: 200, headers: { "Content-Type": "application/json" }
        }))
      : nativeFetch(input, init);
  }` });
  await call("Page.navigate", { url: `http://127.0.0.1:${appPort}/` });
  console.log("Loaded test page");
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await evaluate(`(() => {
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    const project = {
      id: "gate0-product-editors-restore-smoke", name: "Product editors restore smoke",
      lifecycleStatus: "active", createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([project]));
    localStorage.setItem(WORKSPACE_STORAGE_PREFIX + project.id,
      JSON.stringify(createFreshWorkspace(project)));
    location.reload();
    return true;
  })()`);
  console.log("Created isolated test project");
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await evaluate('document.querySelector("[data-open-project]")?.click(); true');
  console.log("Opened isolated test project");
  await new Promise((resolve) => setTimeout(resolve, 1500));

  console.log("Checking restored editors");
  const result = await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const productId = "restore-product-a";
    const secondId = "restore-product-b";
    const categoryId = "restore-category";
    state.project.productRegistryV185 = [{ id: categoryId, name: "Подарки", legacyNames: [] }];
    state.project.catalogItemsV189 = [
      { id: productId, name: "Коза", categoryId, continuum: "pure_product" },
      { id: secondId, name: "Шапка", categoryId, continuum: "pure_product" }
    ];
    megaPlatformCategoryStore(state).categoryIdsByProduct = {
      [productId]: [categoryId], [secondId]: [categoryId]
    };
    state.project._gate0ProductIdMigrationLog = [{ id: GURU_GATE0_PRODUCT_SCOPE_MIGRATION_V194, status: "test" }];
    const now = new Date().toISOString();
    const data = [
      ["jtbd", "Выбрать подарок", { jtbd: { situation: "Нужен подарок", desired_action: "выбрать вещь", result: "порадовать близкого" } }],
      ["segments", "Женщины 25+", { segment: { geography: "Москва", demographics: "Женщины 25+" } }],
      ["positioning", "Авторский подарок", { positioning: { category: "подарки", key_difference: "ручная работа", basis: "своя мастерская" } }],
      ["usp", "Ручная работа", { usp: { client_gets: "уникальный подарок", uniqueness: "единственный экземпляр" } }],
      ["offers", "Подарок с доставкой", { offer: { rational: "доставка", irrational: "радость", social: "отзывы", cta: "Заказать" } }],
      ["keyword_foundation", "", { keywords: [{ id: "kw-a", value: "авторская коза", status: "confirmed" }] }]
    ];
    state.project.gate0ScopedValuesV194 = data.map(([field, value, extra], index) => ({
      id: "restore-record-" + index, project_id: activeProjectId,
      category_id: "", product_id: productId, scope: "product", field, value,
      source: { type: "manual", label: "Проверка" }, confirmation_status: "confirmed",
      created_at: now, updated_at: now, ...extra
    }));
    state.project.gate0ScopeUiV194 = {
      selectedCategoryId: categoryId, selectedProductId: productId,
      scopeByProductField: {}
    };
    guruInvalidateGateViewCache();
    guruNavigateToGate("gate-0");
    renderGate();
    const card = document.querySelector('[data-card-row="card-2"]');
    if (!card) throw new Error("Gate 0 product card not found");
    card.open = true;
    const fieldNames = () => [...card.querySelectorAll('[data-gate0-scope-field-row]')]
      .map((field) => field.dataset.gate0ScopeFieldRow);
    const before = {
      fields: fieldNames(),
      selectors: card.querySelectorAll('[data-gate0-scope-product-select]').length,
      segment: card.querySelector('[data-gate0-scope-record-field="segment_geography"]')?.value,
      offerCta: card.querySelector('[data-gate0-scope-record-field="offer_cta"]')?.value,
      keyword: card.querySelector('[data-gate0-keyword-foundation-input]')?.value,
      storedRows: state.project.gate0ScopedValuesV194.length,
      hiddenEditorCard: state.gates.find((gate) => gate.id === "gate-0").cards.some((item) =>
        v116PassportDef(item)?.key === "positioning_utp_offers_cta" && item._merged),
    };
    const cta = card.querySelector('[data-gate0-scope-record-field="offer_cta"]');
    if (!cta) throw new Error(JSON.stringify(before));
    cta.value = "Написать мастеру";
    cta.dispatchEvent(new InputEvent("input", { bubbles: true, data: "Написать мастеру", inputType: "insertText" }));
    const storedAfterEdit = guruV194ExactRecords("offers", "product", guruV194Product(productId), state)[0]?.offer?.cta;
    const selector = card.querySelector('[data-gate0-scope-product-select]');
    selector.value = secondId;
    selector.dispatchEvent(new Event("change", { bubbles: true }));
    const secondFields = [...document.querySelectorAll('[data-card-row="card-2"] [data-gate0-scope-field-row]')]
      .map((field) => field.dataset.gate0ScopeFieldRow);
    const secondOfferValues = document.querySelectorAll('[data-card-row="card-2"] [data-gate0-scope-record-field="offer_cta"]').length;
    const firstSelector = document.querySelector('[data-card-row="card-2"] [data-gate0-scope-product-select]');
    firstSelector.value = productId;
    firstSelector.dispatchEvent(new Event("change", { bubbles: true }));
    const restoredCta = document.querySelector('[data-card-row="card-2"] [data-gate0-scope-record-field="offer_cta"]')?.value;
    document.querySelector('[data-card-row="card-2"]').open = true;
    document.querySelector('[data-card-row="card-2"]').scrollIntoView();
    return { before, storedAfterEdit, secondFields, secondOfferValues, restoredCta };
  })()`);

  const expected = "jtbd,segments,positioning,usp,offers,keyword_foundation";
  if (result.before.fields.join() !== expected || result.before.selectors !== 1 ||
      result.before.segment !== "Москва" || result.before.offerCta !== "Заказать" ||
      result.before.keyword !== "авторская коза" || result.before.storedRows < 6 ||
      !result.before.hiddenEditorCard || result.storedAfterEdit !== "Написать мастеру" ||
      result.secondFields.join() !== expected || result.secondOfferValues !== 0 ||
      result.restoredCta !== "Написать мастеру")
    throw new Error(`Product editors did not restore safely: ${JSON.stringify(result)}`);

  await evaluate(`(() => {
    const card = document.querySelector('[data-card-row="card-2"]');
    card.setAttribute("open", "");
    card.scrollIntoView();
    return card.open;
  })()`);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const shot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile("artifacts/gate0-product-editors-restored.png", Buffer.from(shot.data, "base64"));
  console.log(JSON.stringify(result, null, 2));
  console.log("Screenshot: artifacts/gate0-product-editors-restored.png");
} finally {
  socket.close();
}
