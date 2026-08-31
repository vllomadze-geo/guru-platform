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
    id: "gate0-scope-smoke",
    name: "Gate 0 scope smoke",
    lifecycleStatus: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }]));
  location.reload();
  return true;
})()`);
await wait(1800);
await evaluate('document.querySelector("[data-open-project]")?.click(); true');
await wait(1800);

const result = await evaluate(`(async () => {
  scheduleCloudSync = () => {};
  scheduleProjectsCloudSync = () => {};
  state.project.productRegistryV185 = [
    { id: "category-a", name: "Категория A", legacyNames: [], createdAt: new Date().toISOString() },
    { id: "category-b", name: "Категория B", legacyNames: [], createdAt: new Date().toISOString() }
  ];
  state.project.catalogItemsV189 = [
    { id: "product-a", name: "Продукт A", continuum: "pure_product", categoryId: "category-a", createdAt: new Date().toISOString() },
    { id: "product-b", name: "Продукт B", continuum: "pure_product", categoryId: "category-a", createdAt: new Date().toISOString() },
    { id: "product-c", name: "Продукт C", continuum: "pure_product", categoryId: "category-b", createdAt: new Date().toISOString() }
  ];
  state.project.gate0ScopedValuesV194 = [];
  state.project._gate0ProductIdMigrationLog = [{ id: GURU_GATE0_PRODUCT_SCOPE_MIGRATION_V194, at: new Date().toISOString(), status: "test" }];
  const productA = guruV194Product("product-a", state);
  const productB = guruV194Product("product-b", state);
  state.project.gate0ScopedValuesV194.push({
    id: "category-jtbd",
    project_id: activeProjectId,
    category_id: "category-a",
    product_id: "",
    scope: "category",
    field: "jtbd",
    value: "Общий JTBD категории",
    source: { type: "manual", label: "Интервью" },
    confirmation_status: "confirmed",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  state.project.gate0ScopedValuesV194.push({
    id: "project-usp",
    project_id: activeProjectId,
    category_id: "",
    product_id: "",
    scope: "project",
    field: "usp",
    value: "Общее УТП проекта",
    source: { type: "manual", label: "Бриф" },
    confirmation_status: "needs_confirmation",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  guruV194Ui(state).selectedProductId = productA.id;
  guruInvalidateGateViewCache();
  guruNavigateToGate("gate-0");
  renderGate();
  let categorySelect = document.querySelector('[data-gate0-scope-category-select]');
  categorySelect.value = "category-b";
  categorySelect.dispatchEvent(new Event("change", { bubbles: true }));
  const categoryCascade = {
    selectedCategory: guruV194Ui(state).selectedCategoryId,
    selectedProduct: guruV194Ui(state).selectedProductId,
    productOptions: [...document.querySelector('[data-gate0-scope-product-select]').options].map((option) => option.value),
  };
  categorySelect = document.querySelector('[data-gate0-scope-category-select]');
  categorySelect.value = "category-a";
  categorySelect.dispatchEvent(new Event("change", { bubbles: true }));
  const before = {
    a: guruV194Resolve("jtbd", productA, state),
    b: guruV194Resolve("jtbd", productB, state),
    usp: guruV194Resolve("usp", productA, state),
  };
  guruV194Ui(state).scopeByProductField["product-a:jtbd"] = "product";
  guruInvalidateGateViewCache();
  renderGate();
  const overrideButton = document.querySelector('[data-gate0-scope-override="jtbd"]');
  const overrideDebug = {
    button: Boolean(overrideButton),
    selectedProduct: guruV194Ui(state).selectedProductId,
    selectedScope: guruV194Ui(state).scopeByProductField["product-a:jtbd"],
    renderedScopes: [...document.querySelectorAll('[data-gate0-scope-view="jtbd"]')].map((item) => item.value),
  };
  overrideButton?.click();
  [
    ["jtbd_situation", "клиент выбирает подарок"],
    ["jtbd_desired_action", "найти небанальный подарок"],
    ["jtbd_result", "подарок вызвал искреннюю радость"],
  ].forEach(([field, value]) => {
    const input = document.querySelector('[data-gate0-scope-record-field="' + field + '"]');
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
  });
  const jtbdUi = {
    parts: document.querySelectorAll('[data-gate0-scope-record-field^="jtbd_"]').length,
    sentence: document.querySelector("[data-gate0-jtbd-sentence]")?.textContent || "",
  };
  document.querySelector('[data-gate0-scope-add="segments"]')?.click();
  [
    ["segment_geography", "Москва и Московская область"],
    ["segment_demographics", "женщины 25–40 лет"],
    ["segment_psychographics", "ценят индивидуальность"],
    ["segment_behavior", "сравнивают отзывы и предложения"],
    ["segment_need_response", "реагируют на персонализацию"],
  ].forEach(([field, value]) => {
    const input = document.querySelector('[data-gate0-scope-record-field="' + field + '"]');
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
  });
  const segmentUi = {
    parts: document.querySelectorAll('[data-gate0-scope-record-field^="segment_"]').length,
    sentence: document.querySelector("[data-gate0-segment-sentence]")?.textContent || "",
    records: guruV194ExactRecords("segments", "product", productA, state).map((record) => ({ field: record.field, value: record.value, segment: record.segment || null })),
  };
  document.querySelector('[data-gate0-scope-add="positioning"]')?.click();
  [
    ["positioning_category", "авторская одежда"],
    ["positioning_key_difference", "создаём уникальные вещи из винтажных материалов"],
    ["positioning_basis", "каждую вещь мастер делает вручную"],
  ].forEach(([field, value]) => {
    const input = document.querySelector('[data-gate0-scope-record-field="' + field + '"]');
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
  });
  const positioningUi = {
    parts: document.querySelectorAll('[data-gate0-scope-record-field^="positioning_"]').length,
    segmentControls: document.querySelectorAll('[data-gate0-scope-record-field="positioning_segment_record_id"]').length,
    sentence: document.querySelector("[data-gate0-positioning-sentence]")?.textContent || "",
    records: guruV194ExactRecords("positioning", "product", productA, state).map((record) => ({ value: record.value, positioning: record.positioning || null })),
  };
  document.querySelector('[data-gate0-scope-add="usp"]')?.click();
  [
    ["usp_client_gets", "уникальную вещь, созданную вручную"],
    ["usp_client_change", "может выразить индивидуальность без массового дизайна"],
  ].forEach(([field, value]) => {
    const input = document.querySelector('[data-gate0-scope-record-field="' + field + '"]');
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
  });
  const uspIntermediateUi = {
    benefit: document.querySelector("[data-gate0-usp-benefit]")?.textContent || "",
    sentence: document.querySelector("[data-gate0-usp-sentence]")?.textContent || "",
  };
  [
    ["usp_uniqueness", "каждая вещь существует в единственном экземпляре"],
    ["usp_strength", "помогает подарить вещь с личной историей"],
  ].forEach(([field, value]) => {
    const input = document.querySelector('[data-gate0-scope-record-field="' + field + '"]');
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
  });
  const uspUi = {
    parts: document.querySelectorAll('[data-gate0-scope-record-field^="usp_"]').length,
    benefit: document.querySelector("[data-gate0-usp-benefit]")?.textContent || "",
    sentence: document.querySelector("[data-gate0-usp-sentence]")?.textContent || "",
    records: guruV194ExactRecords("usp", "product", productA, state).map((record) => ({ value: record.value, usp: record.usp || null })),
  };
  document.querySelector('[data-gate0-scope-add="offers"]')?.click();
  const setOfferPart = (field, value) => {
    const input = document.querySelector('[data-gate0-scope-record-field="' + field + '"]');
    if (!input) return;
    input.value = value;
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: value, inputType: "insertText" }));
  };
  setOfferPart("offer_rational", "бесплатная доставка и гарантия на 12 месяцев");
  const offerIncompleteUi = {
    sentence: document.querySelector("[data-gate0-offer-sentence]")?.textContent || "",
    statusBlocks: document.querySelectorAll("[data-gate0-offer-status]").length,
  };
  setOfferPart("offer_irrational", "уверенность, что подарок действительно запомнится");
  setOfferPart("offer_social", "выбор подтверждён отзывами покупателей");
  const offerCtaMissingUi = {
    sentence: document.querySelector("[data-gate0-offer-sentence]")?.textContent || "",
  };
  setOfferPart("offer_cta", "Смотреть подарок");
  const offerUi = {
    parts: document.querySelectorAll('[data-gate0-scope-record-field^="offer_"]').length,
    sentence: document.querySelector("[data-gate0-offer-sentence]")?.textContent || "",
    records: guruV194ExactRecords("offers", "product", productA, state).map((record) => ({ value: record.value, offer: record.offer || null })),
  };
  const commonSource = document.querySelector('[data-gate0-common-meta-field="source"]');
  commonSource.value = "Интервью с клиентом";
  commonSource.dispatchEvent(new InputEvent("input", { bubbles: true, data: commonSource.value, inputType: "insertText" }));
  const commonStatus = document.querySelector('[data-gate0-common-meta-field="confirmation_status"]');
  commonStatus.value = "confirmed";
  commonStatus.dispatchEvent(new Event("change", { bubbles: true }));
  const after = {
    a: guruV194Resolve("jtbd", productA, state),
    b: guruV194Resolve("jtbd", productB, state),
    segments: guruV194Resolve("segments", productA, state),
  };
  const migrationWorkspace = { project: {
    productRegistryV185: [{ id: "legacy-category", name: "Старая категория", legacyNames: [] }],
    catalogItemsV189: [{ id: "legacy-product", name: "Старый продукт", categoryId: "legacy-category", continuum: "pure_product" }],
    productBindingsV185: { "legacy-category": { jtbd: "Старый JTBD", audiences: [{ text: "Старый сегмент" }], offer: "Старый оффер", cta: "Старый CTA" } },
    positioningStatement: "Старое позиционирование",
    usp: "Старое УТП",
    _gate0ProductIdMigrationLog: [],
  } };
  guruV194Migrate(migrationWorkspace);
  guruV194MigrateOfferCtas(migrationWorkspace);
  const migrated = guruV194Records(migrationWorkspace);
  const requiredKeys = ["project_id", "category_id", "product_id", "scope", "source", "confirmation_status"];
  const layoutCard = { id: "product-layout-smoke", title: "Карточка товара" };
  const layoutRow = {
    h1: "Авторская игрушка ручной работы",
    productGalleryMainPhotoId: "photo-main",
    productGalleryPhotos: [
      { id: "photo-main", name: "Основное фото", dataUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" },
      { id: "photo-detail", name: "Деталь", dataUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" },
    ],
    contextFields: {
      productGallery: "Основное фото, детали и упаковка",
      productRating: "4,9 · 126 отзывов",
      productShortDescription: ["Ручная работа", "Подарочная упаковка", "Единственный экземпляр"].join(String.fromCharCode(10)),
      productPrice: "5 000 ₽",
      productAvailability: "В наличии",
      productButtons: "В корзину",
      productTrustMini: "Доставка · гарантия · возврат",
      productGallery__flag: "missing",
      productGallery__flagNote: "Подготовить галерею товара",
      row_h1__flag: "works",
      productRating__flag: "not_needed",
      productShortDescription__flag: "works",
      productPrice__flag: "works",
      productAvailability__flag: "needs_improvement",
      productButtons__flag: "works",
      productTrustMini__flag: "works",
    },
  };
  const layoutSection = v22TemplateForCard(layoutCard).sections.find((section) => section.key === "product_first_screen");
  const layoutHost = document.createElement("div");
  layoutHost.className = "g1-redesign";
  layoutHost.style.cssText = "position:absolute;left:-9999px;top:0;width:1200px;";
  layoutHost.innerHTML = v22RouteSectionHtml(layoutCard, layoutRow, 0, layoutSection, true);
  document.body.appendChild(layoutHost);
  const layoutCanvas = layoutHost.querySelector(".v22-site-canvas");
  const layoutElements = [...layoutHost.querySelectorAll("[data-v22-page-element]")];
  const galleryElement = layoutHost.querySelector('[data-v22-page-element="productGallery"]');
  const titleElement = layoutHost.querySelector('[data-v22-page-element="h1"]');
  const galleryContent = layoutHost.querySelector("[data-v22-product-gallery]");
  const galleryRect = galleryElement.getBoundingClientRect();
  const galleryContentRect = galleryContent.getBoundingClientRect();
  const layoutUi = {
    sectionClass: layoutHost.querySelector("[data-v22-site-section]")?.className || "",
    elements: layoutElements.length,
    keys: layoutElements.map((element) => element.dataset.v22PageElement),
    roles: [...new Set(layoutElements.flatMap((element) => [...element.classList].filter((name) => name.startsWith("v22-page-element-") && name !== "v22-page-element")))],
    statusControls: layoutHost.querySelectorAll("[data-g1-flag-select]").length,
    statusClasses: [...layoutHost.querySelectorAll("[data-g1-flag-select]")].map((element) => element.className),
    labels: [...layoutHost.querySelectorAll(".v22-page-element > .g1-field > span")].map((element) => element.textContent.trim()),
    display: getComputedStyle(layoutCanvas).display,
    columns: getComputedStyle(layoutCanvas).gridTemplateColumns.split(" ").length,
    galleryArea: getComputedStyle(galleryElement).gridArea,
    titleArea: getComputedStyle(titleElement).gridArea,
    galleryHeight: galleryElement.getBoundingClientRect().height,
    titleHeight: titleElement.getBoundingClientRect().height,
    galleryUpload: Boolean(layoutHost.querySelector("[data-v22-product-photo-input]")),
    galleryPreview: Boolean(layoutHost.querySelector(".v22-product-photo-stage > img")),
    galleryThumbs: layoutHost.querySelectorAll("[data-v22-product-photo-select]").length,
    galleryDeleteControls: layoutHost.querySelectorAll("[data-v22-product-photo-remove]").length,
    galleryContentFits: galleryContentRect.top >= galleryRect.top && galleryContentRect.bottom <= galleryRect.bottom,
  };
  const photoCanvas = document.createElement("canvas");
  photoCanvas.width = 8;
  photoCanvas.height = 8;
  photoCanvas.getContext("2d").fillRect(0, 0, 8, 8);
  const photoBlob = await new Promise((resolve) => photoCanvas.toBlob(resolve, "image/png"));
  const preparedPhoto = await v22PrepareProductPhoto(new File([photoBlob], "product.png", { type: "image/png" }));
  layoutHost.remove();
  return {
    categorySelectors: document.querySelectorAll("[data-gate0-scope-category-select]").length,
    selectors: document.querySelectorAll("[data-gate0-scope-product-select]").length,
    productOptions: document.querySelectorAll("[data-gate0-scope-product-select] option[value]").length,
    scopedFields: [...document.querySelectorAll("[data-gate0-scope-field-row]")].map((item) => item.dataset.gate0ScopeFieldRow),
    mergedCardStillStored: state.gates.find((gate) => gate.id === "gate-0").cards.some((card) => v116PassportDef(card)?.key === "positioning_utp_offers_cta" && card._merged),
    visiblePositioningCard: [...document.querySelectorAll(".gate0-card-title")].some((item) => item.textContent.includes("Текущее позиционирование, УТП")),
    categoryCascade,
    before: { aScope: before.a.scope, aValue: before.a.records[0]?.value, bScope: before.b.scope, bValue: before.b.records[0]?.value, uspScope: before.usp.scope },
    after: {
      aScope: after.a.scope,
      aValue: after.a.records[0]?.value,
      bScope: after.b.scope,
      bValue: after.b.records[0]?.value,
      segments: { records: after.segments.records.map((record) => ({ value: record.value, segment: record.segment || null })) },
    },
    overrideSourceId: after.a.records[0]?.source?.inherited_from_id || "",
    overrideDebug,
    jtbdUi,
    segmentUi,
    positioningUi,
    uspIntermediateUi,
    uspUi,
    offerIncompleteUi,
    offerCtaMissingUi,
    offerUi,
    layoutUi,
    preparedPhoto: {
      id: preparedPhoto.id,
      name: preparedPhoto.name,
      isDataUrl: preparedPhoto.dataUrl.startsWith("data:image/jpeg;base64,"),
      length: preparedPhoto.dataUrl.length,
    },
    commonMeta: {
      blocks: document.querySelectorAll(".gate0-common-meta-v194").length,
      perValueBlocks: document.querySelectorAll(".gate0-scope-meta-v194").length,
      legacyNotices: document.querySelectorAll(".gate0-jtbd-legacy-v194").length,
      perFieldScopeSelectors: document.querySelectorAll("[data-gate0-scope-view]").length,
      source: after.a.records[0]?.source?.label || "",
      status: after.a.records[0]?.confirmation_status || "",
    },
    schemaComplete: guruV194Records(state).every((record) => requiredKeys.every((key) => Object.prototype.hasOwnProperty.call(record, key))),
    migration: {
      records: migrated.length,
      categoryRecords: migrated.filter((record) => record.scope === "category" && record.category_id === "legacy-category").length,
      projectRecords: migrated.filter((record) => record.scope === "project").length,
      migratedOfferCta: migrated.find((record) => record.field === "offers" && record.scope === "category")?.offer?.cta || "",
      legacyJtbdPreserved: migrationWorkspace.project.productBindingsV185["legacy-category"].jtbd,
      statuses: [...new Set(migrated.map((record) => record.confirmation_status))],
    },
    legacyCategoryJtbd: guruV185Binding("category-a", state).jtbd,
    errors: window.__guruConsoleLog?.filter((entry) => entry.level === "error") || [],
  };
})()`);

if (result.categorySelectors !== 1 || result.selectors !== 1 || result.productOptions < 2) throw new Error(`Unified category/product selectors are incomplete: ${JSON.stringify(result)}`);
if (result.scopedFields.join() !== "jtbd,segments,positioning,usp,offers" || !result.mergedCardStillStored || result.visiblePositioningCard) throw new Error(`Positioning block was not merged safely: ${JSON.stringify(result)}`);
if (result.categoryCascade.selectedCategory !== "category-b" || result.categoryCascade.selectedProduct !== "product-c" || result.categoryCascade.productOptions.join() !== ",product-c") throw new Error(`Category → product cascade failed: ${JSON.stringify(result)}`);
if (result.before.aScope !== "category" || result.before.bScope !== "category") throw new Error(`Category inheritance failed: ${JSON.stringify(result)}`);
if (result.after.aScope !== "product" || result.after.aValue !== "Когда клиент выбирает подарок, клиент хочет найти небанальный подарок, чтобы подарок вызвал искреннюю радость.") throw new Error(`Product override failed: ${JSON.stringify(result)}`);
if (result.jtbdUi.parts !== 3 || result.jtbdUi.sentence !== result.after.aValue) throw new Error(`JTBD constructor did not build the final sentence: ${JSON.stringify(result)}`);
if (result.segmentUi.parts !== 5 || result.segmentUi.sentence !== "География: Москва и Московская область; Демография / характеристики компании: женщины 25–40 лет; Психография: ценят индивидуальность; Поведение: сравнивают отзывы и предложения; Потребность / реакция: реагируют на персонализацию." || result.after.segments.records.length !== 1 || result.after.segments.records[0]?.value !== result.segmentUi.sentence || result.after.segments.records[0]?.segment?.legacy_value) throw new Error(`Segment constructor did not build the final sentence: ${JSON.stringify(result)}`);
if (result.positioningUi.parts !== 3 || result.positioningUi.segmentControls !== 0 || result.positioningUi.sentence !== "Мы являемся авторская одежда, отличаемся создаём уникальные вещи из винтажных материалов, потому что каждую вещь мастер делает вручную." || result.positioningUi.records.length !== 1 || result.positioningUi.records[0]?.value !== result.positioningUi.sentence || result.positioningUi.records[0]?.positioning?.legacy_value) throw new Error(`Positioning constructor still renders or uses a duplicated segment: ${JSON.stringify(result)}`);
if (result.uspIntermediateUi.benefit !== "уникальную вещь, созданную вручную → может выразить индивидуальность без массового дизайна" || result.uspIntermediateUi.sentence !== "Полноценное УТП не сформировано" || result.uspUi.parts !== 4 || result.uspUi.benefit !== result.uspIntermediateUi.benefit || result.uspUi.sentence !== "уникальную вещь, созданную вручную → может выразить индивидуальность без массового дизайна. Уникальность: каждая вещь существует в единственном экземпляре. Сила предложения: помогает подарить вещь с личной историей." || result.uspUi.records.length !== 1 || result.uspUi.records[0]?.value !== result.uspUi.sentence || result.uspUi.records[0]?.usp?.legacy_value || !result.uspUi.records[0]?.usp?.uniqueness || !result.uspUi.records[0]?.usp?.strength) throw new Error(`USP constructor did not build its intermediate or final statement: ${JSON.stringify(result)}`);
if (result.offerIncompleteUi.statusBlocks !== 0 || result.offerIncompleteUi.sentence !== "Оффер не сформирован полностью" || result.offerCtaMissingUi.sentence !== "CTA не определён" || result.offerUi.parts !== 4 || result.offerUi.sentence !== "бесплатная доставка и гарантия на 12 месяцев + уверенность, что подарок действительно запомнится + выбор подтверждён отзывами покупателей → Смотреть подарок" || result.offerUi.records.length !== 1 || result.offerUi.records[0]?.value !== result.offerUi.sentence || result.offerUi.records[0]?.offer?.cta !== "Смотреть подарок") throw new Error(`Offer constructor did not build the chain or rendered a redundant status: ${JSON.stringify(result)}`);
if (!result.layoutUi.sectionClass.includes("v22-site-layout-product_first_screen") || result.layoutUi.elements !== 8 || result.layoutUi.keys.join() !== "productGallery,h1,productRating,productShortDescription,productPrice,productAvailability,productButtons,productTrustMini" || result.layoutUi.roles.length < 5 || result.layoutUi.statusControls !== 8 || !result.layoutUi.statusClasses.some((name) => name.includes("g1-flag-status-works")) || !result.layoutUi.statusClasses.some((name) => name.includes("g1-flag-status-documented")) || !result.layoutUi.labels.includes("Левая колонка") || !result.layoutUi.labels.includes("Кнопки") || result.layoutUi.display !== "grid" || result.layoutUi.columns !== 12 || result.layoutUi.galleryArea !== "gallery" || result.layoutUi.titleArea !== "title" || result.layoutUi.galleryHeight <= result.layoutUi.titleHeight || !result.layoutUi.galleryUpload || !result.layoutUi.galleryPreview || result.layoutUi.galleryThumbs !== 2 || result.layoutUi.galleryDeleteControls !== 2 || !result.layoutUi.galleryContentFits) throw new Error(`Gate 1 page elements did not render as a semantic site layout: ${JSON.stringify(result)}`);
if (!result.preparedPhoto.id || result.preparedPhoto.name !== "product.png" || !result.preparedPhoto.isDataUrl || result.preparedPhoto.length < 100) throw new Error(`Product photo preparation failed: ${JSON.stringify(result)}`);
if (result.commonMeta.blocks !== 1 || result.commonMeta.perValueBlocks !== 0 || result.commonMeta.legacyNotices !== 0 || result.commonMeta.perFieldScopeSelectors !== 0 || result.commonMeta.source !== "Интервью с клиентом" || result.commonMeta.status !== "confirmed") throw new Error(`Common metadata space is not applied correctly: ${JSON.stringify(result)}`);
if (result.after.bScope !== "category" || result.after.bValue !== "Общий JTBD категории") throw new Error(`Sibling inheritance was changed: ${JSON.stringify(result)}`);
if (result.legacyCategoryJtbd !== "Общий JTBD категории") throw new Error(`Legacy category projection was polluted by a product override: ${JSON.stringify(result)}`);
if (result.migration.categoryRecords !== 4 || result.migration.projectRecords !== 2 || result.migration.migratedOfferCta !== "Старый CTA" || result.migration.legacyJtbdPreserved !== "Старый JTBD" || result.migration.statuses.join() !== "needs_confirmation") throw new Error(`Legacy migration failed: ${JSON.stringify(result)}`);
if (!result.overrideSourceId || !result.schemaComplete || result.errors.length) throw new Error(`Record metadata or runtime errors: ${JSON.stringify(result)}`);

console.log(JSON.stringify(result, null, 2));
socket.close();
