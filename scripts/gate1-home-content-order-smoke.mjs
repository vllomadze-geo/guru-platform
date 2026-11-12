import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const appPort = process.env.GURU_LOCAL_PORT || "3189";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9347";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = pages.find((entry) => entry.type === "page");
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
  pending.delete(message.id);
  if (message.error) entry.reject(new Error(message.error.message));
  else entry.resolve(message.result);
});
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timeout = setTimeout(() => {
    pending.delete(id);
    reject(new Error(`Chrome command timed out: ${method}`));
  }, 20000);
  pending.set(id, {
    resolve: (value) => { clearTimeout(timeout); resolve(value); },
    reject: (error) => { clearTimeout(timeout); reject(error); },
  });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const response = await call("Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (response.exceptionDetails) throw new Error(
    response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
};

try {
  await call("Runtime.enable");
  await call("Page.enable");
  await call("Page.navigate", { url: `http://127.0.0.1:${appPort}/` });
  await wait(900);
  await evaluate(`(() => {
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    const project = {
      id: "home-content-order-smoke", name: "Home content order smoke",
      lifecycleStatus: "active", createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([project]));
    localStorage.setItem(WORKSPACE_STORAGE_PREFIX + project.id,
      JSON.stringify(createFreshWorkspace(project)));
    location.reload();
  })()`);
  await wait(1000);
  await evaluate('document.querySelector("[data-open-project]")?.click(); true');
  await wait(1200);

  const optionalImages = await evaluate(`(() => {
    const originals = {
      sources: guruHubShowcaseSourcesV502,
      description: guruCategoryDescriptionV1,
      homeContent: guruHomeCategoryContentV541,
      products: guruCategoryProductsV510,
    };
    const source = { categoryId: "optional-image-smoke", name: "Категория", url: "/category" };
    const saved = { status: "not_started", image: "", buttonText: "Смотреть", productCount: 0 };
    const hubRow = { catalogHubShowcaseV502: { [source.categoryId]: saved } };
    const homeRow = { contextFields: { segmentTitle: "Выберите категорию",
      segmentDescription: "Описание раздела" }, homeSegmentImagesV509: {} };
    let description = "Описание категории";
    let products = [{ image: "", description: "Описание товара", url: "/product" }];
    try {
      guruHubShowcaseSourcesV502 = () => [source];
      guruCategoryDescriptionV1 = () => description;
      guruHomeCategoryContentV541 = () => ({ saved });
      guruCategoryProductsV510 = () => products;
      const hubSection = guruHubShowcaseSectionStatusV502(hubRow);
      const hubCard = guruHubShowcaseCompleteV502(saved, source);
      const homeSection = v22SectionStatus(homeRow, { key: "home_segments", fields: [] });
      const productRow = { categoryId: source.categoryId, contextFields: {} };
      const productSection = { key: "catalog_filters", fields: [] };
      const productReady = v22SectionStatus(productRow, productSection);
      const hubMarkup = guruHubInlineCategoryV507({ id: "card-22-hub" }, hubRow, 0, source);
      const legacyHubMarkup = guruHubShowcaseSectionHtmlV502(
        { id: "card-22-hub" }, hubRow, 0, { title: "2. Витрина категорий" }, true);
      const homeMarkup = guruHomeImageHtmlV509({ id: "card-21" }, homeRow, 0, "segment", source.categoryId);
      const productMarkup = guruCategoryProductCardV516(products[0], productRow);
      const uploadsAvailable = hubMarkup.includes("data-guru-hub-showcase-upload") &&
        homeMarkup.includes("data-guru-home-upload-v509") &&
        productMarkup.includes('data-guru-category-card-field-v516="image"') &&
        hubMarkup.includes("Добавить изображение · по желанию") &&
        homeMarkup.includes("Добавить изображение · по желанию");
      const redundantControlsAbsent = !hubMarkup.includes('data-guru-hub-showcase-field="productCount"') &&
        !hubMarkup.includes('data-guru-hub-showcase-field="status"') &&
        !hubMarkup.includes('data-guru-hub-showcase-pill') &&
        !hubMarkup.includes('data-guru-hub-showcase-error') &&
        !legacyHubMarkup.includes('data-guru-hub-showcase-field="productCount"') &&
        !legacyHubMarkup.includes('data-guru-hub-showcase-field="status"') &&
        !legacyHubMarkup.includes('data-guru-hub-showcase-pill');
      saved.buttonText = "";
      const missingCta = guruHubShowcaseCompleteV502(saved, source);
      saved.buttonText = "Смотреть";
      description = "";
      const missingDescription = guruHubShowcaseCompleteV502(saved, source);
      const homeMissingDescription = v22SectionStatus(homeRow, { key: "home_segments", fields: [] });
      description = "Описание категории";
      source.url = "";
      const missingUrl = guruHubShowcaseCompleteV502(saved, source);
      source.url = "/category";
      products = [{ image: "", description: "", url: "/product" }];
      const productMissingDescription = v22SectionStatus(productRow, productSection);
      products = [{ image: "", description: "Описание товара", url: "" }];
      const productMissingUrl = v22SectionStatus(productRow, productSection);
      return { hubSection, hubCard, homeSection, productReady, uploadsAvailable,
        redundantControlsAbsent, retainedStatus: saved.status,
        retainedProductCount: saved.productCount, missingCta,
        missingDescription, homeMissingDescription, missingUrl,
        productMissingDescription, productMissingUrl };
    } finally {
      guruHubShowcaseSourcesV502 = originals.sources;
      guruCategoryDescriptionV1 = originals.description;
      guruHomeCategoryContentV541 = originals.homeContent;
      guruCategoryProductsV510 = originals.products;
    }
  })()`);
  assert.deepEqual(optionalImages, {
    hubSection: "ready", hubCard: true, homeSection: "ready", productReady: "ready",
    uploadsAvailable: true, redundantControlsAbsent: true,
    retainedStatus: "not_started", retainedProductCount: 0,
    missingCta: false, missingDescription: false,
    homeMissingDescription: "in_progress", missingUrl: false,
    productMissingDescription: "in_progress", productMissingUrl: "in_progress",
  });

  const result = await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const names = ["Проверка А", "Проверка Б", "Проверка В"];
    const categories = names.map((name) => guruV189CreateCategory(name, state));
    if (categories.some((category) => !category)) throw new Error("Categories were not created");
    guruCategoryAuditRowsV491(state);
    const ids = categories.map((category) => category.id);
    const oldBinding = guruV185Binding(ids[2], state);
    oldBinding.categoryDescription = "Ручное описание из Гейта 0";
    const legacyBindingCategory = state.project.productRegistryV185.find((item) => item.id === ids[2]);
    delete legacyBindingCategory.description;
    delete legacyBindingCategory.descriptionSourceV1;
    delete legacyBindingCategory.descriptionItemsV1;
    const migratedBinding = guruCategoryDescriptionV1(ids[2]);
    const firstItemId = "category-description-product-smoke";
    const secondItemId = "category-description-service-smoke";
    guruV189CatalogItems(state).push({ id: firstItemId,
      name: "Подарочная рубашка", continuum: "pure_product" });
    if (!megaPlatformSetProductCategoryIds(firstItemId, [ids[1]], state))
      throw new Error("Product could not be linked to the category");
    const autoBefore = guruCategoryDescriptionV1(ids[1]);
    guruV189CatalogItems(state).push({ id: secondItemId,
      name: "Индивидуальный пошив", continuum: "pure_service" });
    if (!megaPlatformSetProductCategoryIds(secondItemId, [ids[1]], state))
      throw new Error("Service could not be linked to the category");
    const autoAfter = guruCategoryDescriptionV1(ids[1]);
    const marketing = state.gates.find((gate) => gate.id === "gate-0")
      ?.cards.find(isMegaMarketingCard);
    const gate0Holder = document.createElement("div");
    gate0Holder.className = "mega-platform-section";
    gate0Holder.innerHTML = megaPlatformCommercialTable(marketing.id,
      megaPlatformAutoRows(state), [], []);
    const gate0Description = gate0Holder.querySelector(
      '[data-guru-category-description-id="' + ids[1] + '"]');
    if (!gate0Description) throw new Error("Gate 0 category description is missing");
    const gate0Initial = gate0Description.value;
    document.body.append(gate0Holder);
    const gate0MeterBefore = gate0Description.closest("label")
      .querySelector("[data-guru-category-description-meter]")?.textContent;
    const productInput = gate0Holder.querySelector("[data-mega-platform-rename-product]");
    const descriptionStyle = getComputedStyle(gate0Description);
    const productStyle = getComputedStyle(productInput);
    const matchingStyles = ["backgroundColor", "borderTopColor", "borderTopWidth",
      "borderTopLeftRadius", "paddingLeft", "paddingRight", "fontFamily", "fontSize",
      "fontWeight", "color"].every((key) => descriptionStyle[key] === productStyle[key]);
    const longDescription = "Описание ассортимента и условий выбора. ".repeat(8);
    gate0Description.value = longDescription;
    gate0Description.dispatchEvent(new Event("input", { bubbles: true }));
    const gate0LongHeight = gate0Description.getBoundingClientRect().height;
    const gate0LongRowHeight = gate0Description.closest("tr").getBoundingClientRect().height;
    const gate0LongScrollHeight = gate0Description.scrollHeight;
    const gate0LongClientHeight = gate0Description.clientHeight;
    const gate0LongFits = gate0LongScrollHeight <= gate0LongClientHeight + 3;
    gate0Description.value = "Авторская одежда и пошив по запросу";
    gate0Description.dispatchEvent(new Event("input", { bubbles: true }));
    const gate0ShortHeight = gate0Description.getBoundingClientRect().height;
    const gate0ShortRowHeight = gate0Description.closest("tr").getBoundingClientRect().height;
    const gate0MeterAfter = gate0Description.closest("label")
      .querySelector("[data-guru-category-description-meter]")?.textContent;
    const gate0CategoryRow = gate0Description.closest("tr");
    const gate0Name = gate0CategoryRow.querySelector("[data-mega-platform-rename-category]");
    const gate0CategoryTitle = gate0CategoryRow.querySelector("[data-mega-platform-category-title]");
    const gate0DescriptionTitle = gate0CategoryRow.querySelector("[data-mega-platform-category-description-title]");
    const gate0Meter = gate0Description.closest("label")
      .querySelector("[data-guru-category-description-meter]");
    const centerY = (element) => {
      const rect = element.getBoundingClientRect();
      return rect.top + rect.height / 2;
    };
    const descriptionTextCenter = gate0Description.getBoundingClientRect().top +
      parseFloat(descriptionStyle.paddingTop) + parseFloat(descriptionStyle.lineHeight) / 2;
    const titleStyle = getComputedStyle(gate0DescriptionTitle);
    const descriptionTitleTextCenter = gate0DescriptionTitle.getBoundingClientRect().top +
      parseFloat(titleStyle.paddingTop) + parseFloat(titleStyle.lineHeight) / 2;
    const gate0Layout = {
      cellCount: gate0CategoryRow.cells.length,
      nameAlignment: Math.abs(centerY(gate0Name) - centerY(gate0CategoryTitle)),
      descriptionAlignment: descriptionTitleTextCenter - descriptionTextCenter,
      meterBelow: gate0Meter.previousElementSibling === gate0Description &&
        gate0Meter.getBoundingClientRect().top >= gate0Description.getBoundingClientRect().bottom,
      meterRightAlignment: Math.abs(gate0Meter.getBoundingClientRect().right -
        gate0Description.getBoundingClientRect().right),
    };
    const gate0Edited = guruCategoryDescriptionV1(ids[1]);
    const categoryRow = findCard("card-22").pageRows.find((row) => row.categoryId === ids[1]);
    const categorySection = v22TemplateForCard(findCard("card-22")).sections
      .find((section) => section.key === "catalog_hero");
    const categoryHero = guruCategorySectionContentV510(findCard("card-22"),
      categoryRow, 0, categorySection).visual;
    megaPlatformSetUrl("categories", ids[0], "https://example.test/category-a", state);
    const audit = findCard("card-22");
    const hub = findCard("card-22-hub");
    const home = findCard("card-21");
    if (!audit || !hub?.pageRows?.[0] || !home?.pageRows?.[0])
      throw new Error("Page cards were not prepared");
    const beforeRows = Object.fromEntries(audit.pageRows
      .filter((row) => ids.includes(row.categoryId))
      .map((row) => [row.categoryId, row.id]));
    const hubRow = hub.pageRows[0];
    (hubRow.catalogHubShowcaseV502 ||= {})[ids[0]] = {
      benefit: "Существующее описание", buttonText: "Смотреть работы", image: "",
      status: "not_started", productCount: 7,
    };
    const legacyCategory = state.project.productRegistryV185.find((item) => item.id === ids[0]);
    delete legacyCategory.description;
    delete legacyCategory.descriptionSourceV1;
    delete legacyCategory.descriptionItemsV1;
    const homeRow = home.pageRows[0];
    (homeRow.contextFields ||= {}).segmentTitle = "Найдите своё";
    homeRow.contextFields.segmentDescription = "Выберите подходящее направление";
    homeRow.contextFields.segmentCards = "Сохранённый старый текст";
    const section = v22TemplateForCard(home).sections.find((item) => item.key === "home_segments");
    const initial = guruHomeSectionContentV509(home, homeRow, 0, section);
    const holder = document.createElement("div");
    holder.innerHTML = initial;
    document.body.append(holder);
    const description = holder.querySelector(
      '[data-guru-home-category-id-v541="' + ids[0] + '"][data-guru-home-category-field-v541="benefit"]');
    const cta = holder.querySelector(
      '[data-guru-home-category-id-v541="' + ids[0] + '"][data-guru-home-category-field-v541="buttonText"]');
    if (!description || !cta) throw new Error("Category content controls are missing");
    const initialValues = [description.value, cta.value];
    description.value = "Общее описание категории";
    description.dispatchEvent(new Event("input", { bubbles: true }));
    const homeMeterAfter = description.closest("label")
      .querySelector("[data-guru-category-description-meter]")?.textContent;
    cta.value = "Выбрать категорию";
    cta.dispatchEvent(new Event("input", { bubbles: true }));
    const saved = guruHubShowcaseSavedV502(hubRow, ids[0]);
    const editedValues = [guruCategoryDescriptionV1(ids[0]), saved.buttonText];
    const before = guruHubShowcaseSourcesV502().map((source) => source.categoryId);
    const move = holder.querySelector(
      '[data-guru-home-category-id-v541="' + ids[0] + '"][data-guru-home-category-move-v541="down"]');
    if (!move) throw new Error("Move button is missing");
    move.click();
    const after = guruHubShowcaseSourcesV502().map((source) => source.categoryId);
    const registry = guruV185Registry(state).map((category) => category.id);
    const auditOrder = audit.pageRows.filter((row) => ids.includes(row.categoryId))
      .map((row) => row.categoryId);
    const menu = guruSiteChromeCategoryEntriesV499().map((entry) =>
      entry.key.slice("category:".length));
    const platform = megaPlatformAutoRows().required.filter((row) =>
      row.urlGroup === "categories").map((row) => row.sourceCategoryId);
    const afterRows = Object.fromEntries(audit.pageRows
      .filter((row) => ids.includes(row.categoryId))
      .map((row) => [row.categoryId, row.id]));
    const syncedGate0Field = gate0Holder.querySelector(
      '[data-guru-category-description-id="' + ids[0] + '"]');
    const syncedGate0Value = syncedGate0Field?.value;
    const syncedGate0Meter = syncedGate0Field?.closest("label")
      ?.querySelector("[data-guru-category-description-meter]")?.textContent;
    holder.remove();
    if (${Boolean(process.env.GURU_CATEGORY_DESCRIPTION_SCREENSHOT)})
      window.__guruCategoryDescriptionCapture = gate0Holder;
    else gate0Holder.remove();
    return { ids, before, after, registry, auditOrder, menu, platform,
      beforeRows, afterRows, initialValues, editedValues,
      autoBefore, autoAfter, gate0Initial, gate0Edited, migratedBinding,
      gate0MeterBefore, gate0MeterAfter, homeMeterAfter,
      syncedGate0Value, syncedGate0Meter,
      matchingStyles, gate0LongHeight, gate0LongRowHeight,
      gate0ShortHeight, gate0ShortRowHeight, gate0LongFits, gate0Layout,
      oldBindingCleared: oldBinding.categoryDescription === undefined,
      categoryHeroHasDescription: categoryHero.includes("Авторская одежда и пошив по запросу"),
      legacy: homeRow.contextFields.segmentCards,
      sectionDescription: homeRow.contextFields.segmentDescription,
      hubSaved: guruHubShowcaseSavedV502(hubRow, ids[0]),
      categoryDescription: guruCategoryDescriptionV1(ids[0]),
    };
  })()`);
  assert.deepEqual(result.initialValues, ["Существующее описание", "Смотреть работы"]);
  assert.ok(result.autoBefore.includes("Подарочная рубашка"));
  assert.ok(result.autoAfter.includes("Подарочная рубашка") &&
    result.autoAfter.includes("Индивидуальный пошив"));
  assert.equal(result.gate0Initial, result.autoAfter);
  assert.equal(result.gate0Edited, "Авторская одежда и пошив по запросу");
  assert.match(result.gate0MeterBefore, /симв\. · ориентир 100–180/);
  assert.equal(result.gate0MeterAfter, "35 симв. · ориентир 100–180");
  assert.equal(result.homeMeterAfter, "24 симв. · ориентир 100–180");
  assert.equal(result.syncedGate0Value, "Общее описание категории");
  assert.equal(result.syncedGate0Meter, result.homeMeterAfter);
  assert.equal(result.matchingStyles, true);
  assert.equal(result.gate0Layout.cellCount, 7);
  assert.ok(result.gate0Layout.nameAlignment <= 3, result.gate0Layout.nameAlignment);
  assert.ok(Math.abs(result.gate0Layout.descriptionAlignment) <= 3,
    JSON.stringify(result.gate0Layout));
  assert.equal(result.gate0Layout.meterBelow, true);
  assert.ok(result.gate0Layout.meterRightAlignment <= 1,
    result.gate0Layout.meterRightAlignment);
  assert.equal(result.gate0LongFits, true);
  assert.ok(result.gate0LongHeight > result.gate0ShortHeight + 40);
  assert.ok(result.gate0LongRowHeight > result.gate0ShortRowHeight + 40);
  assert.equal(result.migratedBinding, "Ручное описание из Гейта 0");
  assert.equal(result.oldBindingCleared, true);
  assert.equal(result.categoryHeroHasDescription, true);
  if (process.env.GURU_CATEGORY_DESCRIPTION_SCREENSHOT) {
    await call("Emulation.setDeviceMetricsOverride", {
      width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false,
    });
    await evaluate(`(() => { const holder = window.__guruCategoryDescriptionCapture; const field = holder?.querySelector('[data-guru-category-description-id="${result.ids[1]}"]'); field?.scrollIntoView({ block: 'center' }); return true; })()`);
    await wait(200);
    const capture = await call("Page.captureScreenshot", { format: "png" });
    await writeFile(process.env.GURU_CATEGORY_DESCRIPTION_SCREENSHOT,
      Buffer.from(capture.data, "base64"));
    await evaluate("window.__guruCategoryDescriptionCapture?.remove(); true");
  }
  assert.deepEqual(result.editedValues, ["Общее описание категории", "Выбрать категорию"]);
  assert.equal(result.after.indexOf(result.ids[0]), result.before.indexOf(result.ids[0]) + 1);
  assert.deepEqual(result.registry, result.after);
  assert.deepEqual(result.menu, result.after);
  assert.deepEqual(result.platform, result.after);
  assert.deepEqual(result.auditOrder,
    result.after.filter((id) => result.ids.includes(id)));
  assert.deepEqual(result.beforeRows, result.afterRows);
  assert.equal(result.legacy, "Сохранённый старый текст");
  assert.equal(result.sectionDescription, "Выберите подходящее направление");
  assert.equal(result.categoryDescription, "Общее описание категории");
  assert.equal(result.hubSaved.benefit, undefined);
  assert.equal(result.hubSaved.status, "not_started");
  assert.equal(result.hubSaved.productCount, 7);
  await evaluate('guruQueueWorkspaceSave({ durable: true, quiet: true, cloud: false })');
  await call("Page.reload", { ignoreCache: true });
  await wait(1100);
  await evaluate('document.querySelector("[data-open-project]")?.click(); true');
  await wait(1100);
  const reloaded = await evaluate(`(() => {
    const ids = ${JSON.stringify(result.ids)};
    const home = findCard("card-21")?.pageRows?.[0];
    const hub = findCard("card-22-hub")?.pageRows?.[0];
    return {
      order: guruHubShowcaseSourcesV502().map((source) => source.categoryId),
      registry: guruV185Registry(state).map((category) => category.id),
      description: home?.contextFields?.segmentDescription,
      legacy: home?.contextFields?.segmentCards,
      benefit: guruCategoryDescriptionV1(ids[0]),
      secondCategoryDescription: guruCategoryDescriptionV1(ids[1]),
      thirdCategoryDescription: guruCategoryDescriptionV1(ids[2]),
      cta: hub?.catalogHubShowcaseV502?.[ids[0]]?.buttonText,
      legacyStatus: hub?.catalogHubShowcaseV502?.[ids[0]]?.status,
      legacyProductCount: hub?.catalogHubShowcaseV502?.[ids[0]]?.productCount,
    };
  })()`);
  assert.deepEqual(reloaded.order, result.after);
  assert.deepEqual(reloaded.registry, result.after);
  assert.equal(reloaded.description, "Выберите подходящее направление");
  assert.equal(reloaded.legacy, "Сохранённый старый текст");
  assert.equal(reloaded.benefit, "Общее описание категории");
  assert.equal(reloaded.secondCategoryDescription, "Авторская одежда и пошив по запросу");
  assert.equal(reloaded.thirdCategoryDescription, "Ручное описание из Гейта 0");
  assert.equal(reloaded.cta, "Выбрать категорию");
  assert.equal(reloaded.legacyStatus, "not_started");
  assert.equal(reloaded.legacyProductCount, 7);
  await evaluate('openAuditPageCard("card-22-hub"); true');
  await wait(500);
  const showcaseUi = await evaluate(`(() => {
    const root = document.querySelector('[data-page-source-card="card-22-hub"]');
    const section = root?.querySelector('[data-v22-site-section="catalog_filters"]');
    const cards = [...(section?.querySelectorAll('[data-guru-hub-showcase-card]') || [])];
    return { count: cards.length,
      fieldsPresent: cards.every((card) =>
        card.querySelector('[data-guru-hub-showcase-field="benefit"]') &&
        card.querySelector('[data-guru-hub-showcase-field="buttonText"]') &&
        card.querySelector('[data-guru-hub-showcase-upload]')),
      controlsAbsent: cards.every((card) =>
        !card.querySelector('[data-guru-hub-showcase-field="productCount"], [data-guru-hub-showcase-field="status"], .guru-hub-inline-card-controls-v507')),
      sectionStatusPresent: Boolean(section?.querySelector('summary .v22-section-status')),
    };
  })()`);
  assert.deepEqual(showcaseUi, { count: 3, fieldsPresent: true,
    controlsAbsent: true, sectionStatusPresent: true });
  await call("Emulation.setDeviceMetricsOverride", {
    width: 1920, height: 1000, deviceScaleFactor: 1, mobile: false,
  });
  await evaluate('openAuditPageCard("card-21"); true');
  await wait(600);
  const ui = await evaluate(`(() => {
    const page = document.querySelector('[data-page-source-card="card-21"]');
    const section = page?.querySelector('.guru-home-segments-v509');
    const disclosure = section?.closest('details.v22-route-section');
    if (disclosure) disclosure.open = true;
    const description = section?.querySelector('[data-page-context-key="segmentDescription"]');
    const cards = [...(section?.querySelectorAll('[data-guru-home-segment-id-v541]') || [])];
    const positions = cards.slice(0, 3).map((card) => Math.round(card.getBoundingClientRect().top));
    return {
      section: Boolean(section),
      description: description?.value,
      cardCount: cards.length,
      positions,
      categoryUrlHidden: cards.every((card) =>
        !card.querySelector('.guru-hub-inline-source-v507 small') &&
        !card.textContent.includes('https://example.test/category-a')),
      ctaFits: cards.every((card) => {
        const input = card.querySelector('[data-guru-home-category-field-v541="buttonText"]');
        return input && input.scrollWidth <= input.clientWidth + 1;
      }),
      threeFields: cards.every((card) =>
        Boolean(card.querySelector('h3') &&
          card.querySelector('[data-guru-home-category-field-v541="benefit"]') &&
          card.querySelector('[data-guru-home-category-field-v541="buttonText"]'))),
      legacyCollapsed: Boolean(section?.querySelector('details.guru-home-legacy-note-v509:not([open])')),
    };
  })()`);
  assert.equal(ui.section, true);
  assert.equal(ui.description, "Выберите подходящее направление");
  assert.equal(ui.cardCount, result.after.length);
  assert.equal(ui.positions[0], ui.positions[1]);
  assert.ok(ui.positions[2] > ui.positions[1]);
  assert.equal(ui.categoryUrlHidden, true);
  assert.equal(ui.ctaFits, true);
  assert.equal(ui.threeFields, true);
  assert.equal(ui.legacyCollapsed, true);
  await call("Emulation.setDeviceMetricsOverride", {
    width: 600, height: 900, deviceScaleFactor: 1, mobile: false,
  });
  const narrowPositions = await evaluate(`(() => [...document.querySelectorAll(
    '[data-page-source-card="card-21"] .guru-home-segment-card-v509')]
    .slice(0, 2).map((card) => Math.round(card.getBoundingClientRect().top)))()`);
  assert.ok(narrowPositions[1] > narrowPositions[0]);
  if (process.env.GURU_PREVIEW_NARROW_SCREENSHOT) {
    await evaluate(`document.querySelector(
      '[data-page-source-card="card-21"] .guru-home-segments-v509')?.scrollIntoView({ block: 'start' })`);
    await wait(200);
    const capture = await call("Page.captureScreenshot", { format: "png" });
    await writeFile(process.env.GURU_PREVIEW_NARROW_SCREENSHOT,
      Buffer.from(capture.data, "base64"));
  }
  await call("Emulation.setDeviceMetricsOverride", {
    width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
  });
  const mobile = await evaluate(`(() => {
    const card = document.querySelector('[data-page-source-card="card-21"] .guru-home-segment-card-v509');
    const cta = card?.querySelector('[data-guru-home-category-field-v541="buttonText"]');
    const bounds = card?.getBoundingClientRect();
    return {
      cardInsideViewport: Boolean(bounds && bounds.left >= -1 && bounds.right <= innerWidth + 1),
      ctaFits: Boolean(cta && cta.scrollWidth <= cta.clientWidth + 1),
    };
  })()`);
  assert.equal(mobile.cardInsideViewport, true);
  assert.equal(mobile.ctaFits, true);
  await call("Emulation.setDeviceMetricsOverride", {
    width: 1920, height: 1000, deviceScaleFactor: 1, mobile: false,
  });
  const editedSectionDescription = await evaluate(`(() => {
    const input = document.querySelector(
      '[data-page-source-card="card-21"] [data-page-context-key="segmentDescription"]');
    input.value = "Новое описание контента";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return findCard("card-21").pageRows[0].contextFields.segmentDescription;
  })()`);
  assert.equal(editedSectionDescription, "Новое описание контента");
  if (process.env.GURU_PREVIEW_SCREENSHOT) {
    await evaluate(`(() => {
      const section = document.querySelector('[data-page-source-card="card-21"] .guru-home-segments-v509');
      const disclosure = section?.closest('details.v22-route-section');
      if (disclosure) disclosure.open = true;
      section?.scrollIntoView({ block: 'start' });
    })()`);
    await wait(300);
    const capture = await call("Page.captureScreenshot", { format: "png" });
    await writeFile(process.env.GURU_PREVIEW_SCREENSHOT,
      Buffer.from(capture.data, "base64"));
  }
  console.log("Home content, shared category fields and order: OK");
} finally {
  socket.close();
}
