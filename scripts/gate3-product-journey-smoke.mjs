const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9335";
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
  const response = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  }
  return response.result.value;
}

await call("Runtime.enable");
await call("Page.enable");
await call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false });
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
    id: "gate3-product-journey-smoke",
    name: "Gate 3 product journey smoke",
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
  state.project.productRegistryV185 = [
    { id: "category-clothes", name: "Авторская одежда", legacyNames: [], createdAt: now }
  ];
  const gate1 = state.gates.find((gate) => gate.id === "gate-1");
  const pageCard = gate1.cards.find((card) => typeof g1pcIsProductCard === "function" && g1pcIsProductCard(card) && g1pcCardKind(card) === "product");
  pageCard.pageRows = [{
    id: "product-page-row",
    name: "Рубашка Upcycling с кружевом",
    h1: "Рубашка Upcycling с кружевом",
    url: "https://example.test/upcycling-shirt",
    catalogItemIdV189: "product-shirt",
    productGalleryPhotos: [{ id: "photo-1", name: "Фото", dataUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" }],
    contextFields: {
      productShortDescription: "Единственный экземпляр · ручная работа",
      productPrice: "5 000 ₽",
      productAvailability: "В наличии",
      productButtons: "Оформить заказ",
      productRating: "4,9 · 126 отзывов",
      productTrustMini: "Доставка по России · возврат",
      productClientResult: "Покупатель отметил, что рубашка стала любимой вещью",
      productRecommendationReasons: "Советуют за уникальность и ручную работу"
    }
  }];
  state.project.catalogItemsV189 = [{
    id: "product-shirt",
    name: "Рубашка Upcycling с кружевом",
    continuum: "pure_product",
    categoryId: "category-clothes",
    createdAt: now,
    source: { kind: "gate1", key: "gate1:" + pageCard.id + ":product-page-row", cardId: pageCard.id, rowId: "product-page-row", rowIndex: 0 }
  }];
  state.project.gate0ScopedValuesV194 = [
    { id: "segment-category", project_id: activeProjectId, category_id: "category-clothes", product_id: "", scope: "category", field: "segments", value: "Женщины, которые выбирают уникальную одежду", source: { type: "manual", label: "Интервью" }, confirmation_status: "confirmed", created_at: now, updated_at: now },
    { id: "jtbd-product", project_id: activeProjectId, category_id: "category-clothes", product_id: "product-shirt", scope: "product", field: "jtbd", value: "Когда хочется выделиться, я хочу уникальную вещь, чтобы выразить индивидуальность.", source: { type: "manual", label: "Интервью" }, confirmation_status: "confirmed", created_at: now, updated_at: now },
    { id: "positioning-category", project_id: activeProjectId, category_id: "category-clothes", product_id: "", scope: "category", field: "positioning", value: "Авторская одежда из винтажных материалов", source: { type: "manual", label: "Бриф" }, confirmation_status: "confirmed", created_at: now, updated_at: now },
    { id: "usp-product", project_id: activeProjectId, category_id: "category-clothes", product_id: "product-shirt", scope: "product", field: "usp", value: "Единственный экземпляр, созданный вручную", source: { type: "manual", label: "Бриф" }, confirmation_status: "confirmed", created_at: now, updated_at: now },
    { id: "offer-product", project_id: activeProjectId, category_id: "category-clothes", product_id: "product-shirt", scope: "product", field: "offers", value: "Бесплатная доставка уникальной вещи → Оформить заказ", offer: { rational: "Бесплатная доставка", irrational: "Выразить индивидуальность", social: "Ручная работа", cta: "Оформить заказ" }, source: { type: "manual", label: "Бриф" }, confirmation_status: "confirmed", created_at: now, updated_at: now }
  ];
  state.project._gate0ProductIdMigrationLog = [
    { id: GURU_GATE0_PRODUCT_SCOPE_MIGRATION_V194, at: now, status: "test" },
    { id: GURU_GATE0_OFFER_CTA_MIGRATION_V197, at: now, status: "test" }
  ];
  state.gate3_5a = { aware: { fields: { audience: ["Старое общее значение"] } }, openSteps: {} };
  state.gate3ProductJourneyV210 = { selectedProductId: "", openStepsByProduct: {} };
  guruNavigateToGate("gate-3");
  renderGate();
  const before = {
    selector: document.querySelectorAll("[data-g3-product-journey-select]").length,
    options: document.querySelectorAll('[data-g3-product-journey-select] option[value]:not([value=""])').length,
    emptyText: document.querySelector(".g3-product-journey-empty")?.textContent.trim() || "",
    stages: document.querySelectorAll("[data-g3-product-stage]").length,
    legacyVisible: document.body.textContent.includes("Старое общее значение")
  };
  const select = document.querySelector("[data-g3-product-journey-select]");
  select.value = "product-shirt";
  select.dispatchEvent(new Event("change", { bubbles: true }));
  const appealToggle = document.querySelector('[data-g3-product-stage-toggle="appeal"]');
  if (appealToggle) appealToggle.click();
  const advocateToggle = document.querySelector('[data-g3-product-stage-toggle="advocate"]');
  if (advocateToggle) advocateToggle.click();
  const appealText = document.querySelector('[data-g3-product-stage="appeal"]')?.textContent || "";
  const advocateText = document.querySelector('[data-g3-product-stage="advocate"]')?.textContent || "";
  const productTemplate = v22PageTemplates().product;
  const productTemplateFields = productTemplate.sections.flatMap((section) => section.fields || []).map((field) => field.key || field.field);
  const productTailHost = document.createElement("div");
  productTailHost.innerHTML = v22RouteSectionHtml(pageCard, pageCard.pageRows[0], 0, productTemplate.sections.find((section) => section.key === "product_tail"), true);
  document.body.appendChild(productTailHost);
  const clientResultInput = productTailHost.querySelector('[data-page-context-key="productClientResult"]');
  const recommendationReasonsInput = productTailHost.querySelector('[data-page-context-key="productRecommendationReasons"]');
  const after = {
    selectedId: state.gate3ProductJourneyV210.selectedProductId,
    selectorValue: document.querySelector("[data-g3-product-journey-select]")?.value || "",
    availableProductIds: guruV194Products(state).map((product) => product.id),
    stages: document.querySelectorAll("[data-g3-product-stage]").length,
    manualInputs: document.querySelectorAll("[data-g3a-step], [data-g3a-tool-step], .g3-product-journey input, .g3-product-journey textarea").length,
    cells: document.querySelectorAll('[data-g3-product-stage="appeal"] .g3-product-journey-cell').length,
    productVisible: document.querySelector(".g3-product-journey-context")?.textContent.includes("Рубашка Upcycling с кружевом") || false,
    positioningVisible: appealText.includes("Авторская одежда из винтажных материалов"),
    offerVisible: appealText.includes("Бесплатная доставка уникальной вещи"),
    cardVisible: appealText.includes("Единственный экземпляр · ручная работа"),
    sourceLabels: document.querySelectorAll('[data-g3-product-stage="appeal"] .g3-product-journey-cell small').length,
    sourceButtons: document.querySelectorAll("[data-g3-product-source-stage]").length,
    productFields: {
      clientResult: productTemplateFields.includes("productClientResult"),
      recommendationReasons: productTemplateFields.includes("productRecommendationReasons"),
      clientResultEditable: clientResultInput?.tagName === "TEXTAREA" && !clientResultInput.disabled && !clientResultInput.readOnly,
      recommendationReasonsEditable: recommendationReasonsInput?.tagName === "TEXTAREA" && !recommendationReasonsInput.disabled && !recommendationReasonsInput.readOnly
    },
    advocate: {
      cells: document.querySelectorAll('[data-g3-product-stage="advocate"] .g3-product-journey-cell').length,
      clientResultVisible: advocateText.includes("Покупатель отметил, что рубашка стала любимой вещью"),
      recommendationReasonsVisible: advocateText.includes("Советуют за уникальность и ручную работу"),
      jtbdCopied: advocateText.includes("Когда хочется выделиться"),
      trustCopied: advocateText.includes("4,9 · 126 отзывов") || advocateText.includes("Доставка по России · возврат")
    },
    legacyVisible: document.body.textContent.includes("Старое общее значение"),
    gate4Promise: g4ReadGate3Appeal().promise
  };
  productTailHost.remove();

  pageCard.pageRows[0].contextFields.productClientResult = "";
  pageCard.pageRows[0].contextFields.productRecommendationReasons = "";
  pageCard.pageRows[0].contextFields.productPrice = "?".repeat(3);
  pageCard.pageRows[0].contextFields.productAvailability = String.fromCharCode(0xfffd) + "?";
  pageCard.pageRows[0].contextFields.productButtons = "?".repeat(3);
  renderGate();
  const actToggle = document.querySelector('[data-g3-product-stage-toggle="act"]');
  if (actToggle) actToggle.click();
  const cellValue = (stage, label) => {
    const cell = Array.from(document.querySelectorAll('[data-g3-product-stage="' + stage + '"] .g3-product-journey-cell'))
      .find((item) => item.querySelector("span")?.textContent.trim() === label);
    return cell?.querySelector("b")?.textContent.trim() || "";
  };
  const empty = {
    clientResult: cellValue("advocate", "Результат клиента"),
    recommendationReasons: cellValue("advocate", "Основания рекомендовать"),
    purchase: cellValue("act", "Цена / наличие / действие"),
    brokenMarkerVisible: document.querySelector(".g3-product-journey")?.textContent.includes(String.fromCharCode(0xfffd)) || false,
    tripleQuestionVisible: document.querySelector(".g3-product-journey")?.textContent.includes("?".repeat(3)) || false
  };
  return { before, after, empty, errors: window.__guruConsoleLog?.filter((entry) => entry.level === "error") || [] };
})()`);

if (result.before.selector !== 1 || result.before.options !== 1 || !result.before.emptyText.includes("Продукт не выбран") || result.before.stages !== 0 || result.before.legacyVisible) {
  throw new Error(`Gate 3 must stay empty until a product is selected: ${JSON.stringify(result)}`);
}
if (result.after.selectedId !== "product-shirt" || result.after.stages !== 5 || result.after.manualInputs !== 0 || result.after.cells !== 4 || !result.after.productVisible || !result.after.positioningVisible || !result.after.offerVisible || !result.after.cardVisible || result.after.sourceLabels !== 0 || result.after.sourceButtons !== 7 || !result.after.productFields.clientResult || !result.after.productFields.recommendationReasons || !result.after.productFields.clientResultEditable || !result.after.productFields.recommendationReasonsEditable || result.after.advocate.cells !== 3 || !result.after.advocate.clientResultVisible || !result.after.advocate.recommendationReasonsVisible || result.after.advocate.jtbdCopied || result.after.advocate.trustCopied || result.after.legacyVisible || !result.after.gate4Promise.includes("Бесплатная доставка уникальной вещи") || result.errors.length) {
  throw new Error(`Gate 3 product journey is not sourced from the selected product: ${JSON.stringify(result)}`);
}
if (result.empty.clientResult !== "Не заполнено в источнике" || result.empty.recommendationReasons !== "Не заполнено в источнике" || result.empty.purchase !== "Не заполнено в источнике" || result.empty.brokenMarkerVisible || result.empty.tripleQuestionVisible) {
  throw new Error(`Gate 3 empty and broken values are not normalized: ${JSON.stringify(result)}`);
}

const sourceNavigation = await evaluate(`(async () => {
  const waitForUi = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const resultCell = Array.from(document.querySelectorAll('[data-g3-product-stage="advocate"] .g3-product-journey-cell'))
    .find((cell) => cell.querySelector("span")?.textContent.trim() === "Результат клиента");
  resultCell?.querySelector("[data-g3-product-source-stage]")?.click();
  await waitForUi(700);
  const sourceField = document.querySelector('[data-page-context-key="productClientResult"]');
  const opened = {
    gateId: activeGateId,
    fieldKey: sourceField?.dataset.pageContextKey || "",
    focused: document.activeElement === sourceField,
    highlighted: Boolean(sourceField?.closest(".guru-source-target-v212"))
  };
  if (sourceField) {
    sourceField.value = "Реальный результат после покупки";
    sourceField.dispatchEvent(new Event("input", { bubbles: true }));
  }
  document.querySelector('[data-gate-id="gate-3"]')?.click();
  await waitForUi(700);
  const updatedCell = Array.from(document.querySelectorAll('[data-g3-product-stage="advocate"] .g3-product-journey-cell'))
    .find((cell) => cell.querySelector("span")?.textContent.trim() === "Результат клиента");
  return {
    opened,
    returnedGateId: activeGateId,
    updatedValue: updatedCell?.querySelector("b")?.textContent.trim() || "",
    selectedProductId: state.gate3ProductJourneyV210.selectedProductId
  };
})()`);

if (sourceNavigation.opened.gateId !== "gate-1" || sourceNavigation.opened.fieldKey !== "productClientResult" || !sourceNavigation.opened.focused || !sourceNavigation.opened.highlighted || sourceNavigation.returnedGateId !== "gate-3" || sourceNavigation.updatedValue !== "Реальный результат после покупки" || sourceNavigation.selectedProductId !== "product-shirt") {
  throw new Error(`Gate 3 source navigation did not focus and refresh the exact product field: ${JSON.stringify(sourceNavigation)}`);
}

const scopedNavigation = await evaluate(`(async () => {
  const waitForUi = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const positioningCell = Array.from(document.querySelectorAll('[data-g3-product-stage="appeal"] .g3-product-journey-cell'))
    .find((cell) => cell.querySelector("span")?.textContent.trim() === "Позиционирование");
  positioningCell?.querySelector("[data-g3-product-source-stage]")?.click();
  await waitForUi(700);
  const sourceField = document.querySelector('[data-gate0-scope-record="positioning-category"]');
  const result = {
    gateId: activeGateId,
    selectedCategoryId: state.project.gate0ScopeUiV194.selectedCategoryId,
    selectedProductId: state.project.gate0ScopeUiV194.selectedProductId,
    scope: state.project.gate0ScopeUiV194.commonMetaByProduct?.["product-shirt"]?.scope || "",
    recordId: sourceField?.dataset.gate0ScopeRecord || "",
    focused: document.activeElement === sourceField,
    highlighted: Boolean(sourceField?.closest(".guru-source-target-v212"))
  };
  document.querySelector('[data-gate-id="gate-3"]')?.click();
  await waitForUi(500);
  result.returnedGateId = activeGateId;
  return result;
})()`);

if (scopedNavigation.gateId !== "gate-0" || scopedNavigation.selectedCategoryId !== "category-clothes" || scopedNavigation.selectedProductId !== "product-shirt" || scopedNavigation.scope !== "category" || scopedNavigation.recordId !== "positioning-category" || !scopedNavigation.focused || !scopedNavigation.highlighted || scopedNavigation.returnedGateId !== "gate-3") {
  throw new Error(`Gate 3 scoped source navigation did not select and focus the exact inherited record: ${JSON.stringify(scopedNavigation)}`);
}

console.log(JSON.stringify({ ...result, sourceNavigation, scopedNavigation }, null, 2));
socket.close();
