import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const port = process.env.GURU_LOCAL_PORT || "3189";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9347";
const screenshotPath = process.env.GURU_PREVIEW_SCREENSHOT || "";
const screenshotWidth = Number(process.env.GURU_PREVIEW_WIDTH || 1440);
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
  console.log("Connecting to app");
  await call("Runtime.enable");
  await call("Page.enable");
  await call("Page.navigate", { url: `http://127.0.0.1:${port}/` });
  await wait(900);
  console.log("Preparing isolated project");
  await evaluate(`(() => {
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    const project = {
      id: "category-list-preview-smoke", name: "Category list preview smoke",
      lifecycleStatus: "active", createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([project]));
    localStorage.setItem(WORKSPACE_STORAGE_PREFIX + project.id,
      JSON.stringify(createFreshWorkspace(project)));
    location.reload();
  })()`);
  await wait(1000);
  console.log("Opening project");
  await evaluate('document.querySelector("[data-open-project]")?.click(); true');
  await wait(1200);

  console.log("Checking category preview");
  const result = await evaluate(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const category = guruV189CreateCategory("Новогодние подарки 2027", state);
    if (!category) throw new Error("Category was not created");
    guruCategoryAuditRowsV491(state);
    const card = findCard("card-22");
    const row = card.pageRows.find((item) => item.categoryId === category.id);
    if (!row) throw new Error("Category audit row was not created");
    row.contextFields ||= {};
    row.contextFields.catalogIntro = "Сохранённое описание категории";
    card.title = "КАТЕГОРИЯ";
    guruCatalogHubSplitV496(state);
    if (card.pageRows.find((item) => item.categoryId === category.id) !== row ||
        row.contextFields.catalogIntro !== "Сохранённое описание категории")
      throw new Error("Renaming the section changed existing category data");
    const products = state.project.catalogItemsV189 ||= [];
    products.push(
      { id: "smoke-hat", name: "Шапка Коза", continuum: "physical_product", createdAt: new Date().toISOString() },
      { id: "smoke-goat", name: "Символ 2027 года «Коза»", continuum: "physical_product", createdAt: new Date().toISOString() }
    );
    const offer = { id: "smoke-hat-offer", project_id: state.project.id,
      scope: "product", field: "offers", product_id: "smoke-hat", category_id: category.id,
      value: "Авторская шапка", offer: { ctaV2: {
        primary: "Купить шапку", secondary: "Узнать размер", alternative: "Задать вопрос"
      } } };
    (state.project.gate0ScopedValuesV194 ||= []).push(offer);
    const relations = megaPlatformCategoryStore(state);
    relations.categoryIdsByProduct["smoke-hat"] = [category.id];
    relations.categoryIdsByProduct["smoke-goat"] = [category.id];
    relations.productOrderByCategory[category.id] = ["smoke-goat", "smoke-hat"];
    const urls = megaPlatformUrlStore(state);
    urls.products["smoke-goat"] = "https://example.test/goat";
    const productCard = findCard("card-24");
    productCard.pageRows.push({
      id: "smoke-goat-page", name: "Символ 2027 года «Коза»",
      catalogItemIdV189: "smoke-goat", contextFields: {
        productHeroShortDescriptionV254: "Текстильная коза ручной работы",
        productPrice: "4 900 р."
      }, productGalleryPhotos: [{ id: "smoke-photo", dataUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6Z9r8AAAAASUVORK5CYII=" }],
      productGalleryMainPhotoId: "smoke-photo"
    });
    const section = v22TemplateForCard(card).sections.find((item) => item.key === "catalog_filters");
    const visual = guruCategorySectionContentV510(card, row, card.pageRows.indexOf(row), section).visual;
    const pageEditor = document.createElement("div");
    pageEditor.innerHTML = v22RouteSectionsHtml(card, row, card.pageRows.indexOf(row));
    const editor = {
      heading: pageEditor.querySelector(".guru-hub-unified-head-v505 h3")?.textContent,
      repeatedInstructions: pageEditor.textContent.includes("Текст редактируется прямо в макете") ||
        pageEditor.textContent.includes("Пролистывание товаров уже встроено"),
      h1: Boolean(pageEditor.querySelector('[data-gate1-page-field="h1"]')),
      description: Boolean(pageEditor.querySelector('[data-guru-category-description-id]')),
      related: Boolean(pageEditor.querySelector('[data-guru-catalog-pagination-section-v3]')),
      cta: Boolean(pageEditor.querySelector('[data-page-context-key="catalogFinalCta"]')),
      seo: Boolean(pageEditor.querySelector('[data-v22-site-section="seo_snippet"]')),
    };
    const fixture = document.createElement("div");
    fixture.dataset.pageSourceCard = "card-22";
    fixture.innerHTML = '<details open data-v22-site-section="catalog_filters"><summary><span class="v22-section-status"></span></summary>' + visual + '</details>';
    document.body.append(fixture);
    fixture.style.cssText = "position:fixed;inset:0;z-index:99999;overflow:auto;background:#fff;padding:24px max(24px,10vw)";
    const articles = [...fixture.querySelectorAll(".guru-category-product-v516")];
    const tokenColor = (name) => {
      const probe = document.createElement("span");
      probe.style.color = 'var(' + name + ')';
      fixture.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    const before = {
      cardTitle: card.title,
      title: section.title,
      names: articles.map((article) => article.querySelector("h3")?.textContent),
      description: articles[0]?.querySelector(".guru-category-product-copy-v516 p")?.textContent,
      price: articles[0]?.querySelector(".guru-category-product-copy-v516 strong")?.textContent,
      imageCount: fixture.querySelectorAll(".guru-category-product-image-v516 img").length,
      status: v22SectionStatus(row, section),
      listColumns: getComputedStyle(fixture.querySelector(".guru-category-product-list-v516")).gridTemplateColumns.split(" ").length,
      oldGrid: Boolean(fixture.querySelector(".guru-hub-preview-grid-v504")),
      oldNote: Boolean(fixture.querySelector(".guru-category-product-note-v516")),
      editLabel: articles[0]?.querySelector(".guru-category-product-edit-v516 summary")?.textContent,
      dragHandles: fixture.querySelectorAll("[data-guru-category-drag-v542]").length,
      sourceProductIds: [...fixture.querySelectorAll("[data-guru-product-source-id]")]
        .map((button) => button.dataset.guruProductSourceId),
      urlAsCardCopy: fixture.querySelector(".guru-category-product-copy-v516")?.textContent.includes("https://example.test"),
      palette: {
        textToken: tokenColor("--text"),
        accentToken: tokenColor("--accent"),
        panelToken: tokenColor("--panel"),
        lineToken: tokenColor("--line"),
        softToken: tokenColor("--panel-soft"),
        title: getComputedStyle(articles[0].querySelector("h3")).color,
        price: getComputedStyle(articles[0].querySelector("strong")).color,
        primary: getComputedStyle(articles[0].querySelector(".guru-category-product-actions-v516 span")).backgroundColor,
        secondary: getComputedStyle(articles[0].querySelector(".guru-category-product-actions-v516 span + span")).color,
        card: getComputedStyle(articles[0]).backgroundColor,
        border: getComputedStyle(articles[0]).borderTopColor,
        section: getComputedStyle(fixture.querySelector(".guru-category-products-v510")).backgroundColor
      }
    };
    const hat = articles[1];
    const description = hat.querySelector('[data-guru-category-card-field-v516="description"]');
    description.value = "Тёплая шапка с ушками Козы";
    description.dispatchEvent(new Event("input", { bubbles: true }));
    const image = hat.querySelector('[data-guru-category-card-field-v516="image"]');
    image.value = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6Z9r8AAAAASUVORK5CYII=";
    image.dispatchEvent(new Event("input", { bubbles: true }));
    image.dispatchEvent(new Event("change", { bubbles: true }));
    const after = {
      description: hat.querySelector(".guru-category-product-copy-v516 p")?.textContent,
      image: Boolean(hat.querySelector(".guru-category-product-image-v516 img")),
      saved: row.contextFields.catalogProductCardsV516["smoke-hat"],
      statusWithoutUrl: v22SectionStatus(row, section)
    };
    urls.products["smoke-hat"] = "https://example.test/hat";
    after.statusWithUrl = v22SectionStatus(row, section);
    guruStrategicCtaEnhanceV1(fixture);
    const orderInput = hat.querySelector('[data-guru-category-card-field-v516="orderLabel"]');
    const detailsInput = hat.querySelector('[data-guru-category-card-field-v516="detailsLabel"]');
    guruStrategicCtaOpenV1(orderInput);
    const availableCtas = [...document.querySelectorAll('[data-strategic-cta-choice-v1]')]
      .map((button) => button.textContent.trim());
    document.querySelector('[data-strategic-cta-choice-v1="0"]')?.click();
    detailsInput.value = "Детали шапки";
    detailsInput.dispatchEvent(new Event("input", { bubbles: true }));
    detailsInput.dispatchEvent(new Event("change", { bubbles: true }));
    const linkedRef = row.contextFields.catalogProductCardsV516["smoke-hat"].orderCtaRefV1;
    offer.offer.ctaV2.primary = "Купить шапку сейчас";
    const cta = {
      choices: availableCtas,
      linkedRef,
      linkedValue: guruCategoryProductsV510(row).find((item) => item.id === "smoke-hat")?.orderLabel,
      manualValue: row.contextFields.catalogProductCardsV516["smoke-hat"].detailsLabel,
      manualRef: row.contextFields.catalogProductCardsV516["smoke-hat"].detailsCtaRefV1 || "",
      pickerButton: Boolean(orderInput.nextElementSibling?.matches('[data-strategic-cta-trigger-v1]')),
    };
    return { before, after, editor, cta };
  })()`);

  assert.equal(result.before.title, "2. Товары · список");
  assert.equal(result.before.cardTitle, "КАТЕГОРИИ");
  assert.deepEqual(result.before.names, ["Символ 2027 года «Коза»", "Шапка Коза"]);
  assert.equal(result.before.description, "Текстильная коза ручной работы");
  assert.equal(result.before.price, "4 900 р.");
  assert.equal(result.before.imageCount, 1);
  assert.equal(result.before.status, "in_progress");
  assert.equal(result.before.listColumns, 1);
  assert.equal(result.before.oldGrid, false);
  assert.equal(result.before.oldNote, false);
  assert.equal(result.before.editLabel, "Настроить карточку");
  assert.equal(result.before.dragHandles, 2);
  assert.deepEqual(result.before.sourceProductIds, ["smoke-goat", "smoke-hat"]);
  assert.equal(result.editor.heading, "Страница категории");
  assert.equal(result.editor.repeatedInstructions, false);
  assert(result.editor.h1 && result.editor.description && result.editor.related &&
    result.editor.cta && result.editor.seo, "Category editors must remain available");
  assert.equal(result.before.urlAsCardCopy, false);
  assert.equal(result.before.palette.title, result.before.palette.textToken);
  assert.equal(result.before.palette.price, result.before.palette.textToken);
  assert.equal(result.before.palette.primary, result.before.palette.accentToken);
  assert.equal(result.before.palette.secondary, result.before.palette.textToken);
  assert.equal(result.before.palette.card, result.before.palette.panelToken);
  assert.equal(result.before.palette.border, result.before.palette.lineToken);
  assert.equal(result.before.palette.section, result.before.palette.panelToken);
  assert.equal(result.after.description, "Тёплая шапка с ушками Козы");
  assert.equal(result.after.image, true);
  assert.equal(result.after.saved.description, "Тёплая шапка с ушками Козы");
  assert.equal(result.after.statusWithoutUrl, "in_progress");
  assert.equal(result.after.statusWithUrl, "ready");
  assert.equal(result.cta.choices.length, 3);
  assert.equal(result.cta.linkedRef, "smoke-hat-offer::primary");
  assert.equal(result.cta.linkedValue, "Купить шапку сейчас");
  assert.equal(result.cta.manualValue, "Детали шапки");
  assert.equal(result.cta.manualRef, "");
  assert.equal(result.cta.pickerButton, true);
  const drag = await evaluate(`(() => {
    const list = document.querySelector('[data-guru-category-product-list-v542]');
    const source = list.querySelector('[data-guru-category-product-id-v510="smoke-hat"] [data-guru-category-drag-v542]').getBoundingClientRect();
    const target = list.querySelector('[data-guru-category-product-id-v510="smoke-goat"]').getBoundingClientRect();
    const start = { x: source.left + source.width / 2, y: source.top + source.height / 2 };
    const end = { x: target.left + 36, y: target.top + 14 };
    return { start, end,
      startHit: document.elementFromPoint(start.x, start.y)?.closest?.('[data-guru-category-drag-v542]')?.dataset.guruCategoryDragV542 || '',
      endHit: document.elementFromPoint(end.x, end.y)?.closest?.('[data-guru-category-product-id-v510]')?.dataset.guruCategoryProductIdV510 || '' };
  })()`);
  await call("Input.dispatchMouseEvent", { type: "mousePressed", x: drag.start.x, y: drag.start.y, button: "left", buttons: 1, clickCount: 1 });
  await wait(40);
  await call("Input.dispatchMouseEvent", { type: "mouseMoved", x: drag.start.x + 8, y: drag.start.y - 16, buttons: 1 });
  await wait(40);
  await call("Input.dispatchMouseEvent", { type: "mouseMoved", x: drag.end.x, y: drag.end.y, buttons: 1 });
  await wait(40);
  const dragState = await evaluate(`(() => ({ active: guruCategoryProductDragV542?.active || false,
    drop: guruCategoryProductDragV542?.drop?.article?.dataset.guruCategoryProductIdV510 || '',
    hit: document.elementFromPoint(${drag.end.x}, ${drag.end.y})?.closest?.('[data-guru-category-product-id-v510]')?.dataset.guruCategoryProductIdV510 || '' }))()`);
  await call("Input.dispatchMouseEvent", { type: "mouseReleased", x: drag.end.x, y: drag.end.y, button: "left", buttons: 0, clickCount: 1 });
  const reordered = await evaluate(`(() => {
    const list = document.querySelector('[data-guru-category-product-list-v542]');
    const categoryId = list.dataset.guruCategoryProductListV542;
    return { visible: [...list.querySelectorAll(':scope > [data-guru-category-product-id-v510]')]
        .map((item) => item.dataset.guruCategoryProductIdV510),
      platform: megaPlatformCategoryStore(state).productOrderByCategory[categoryId],
      sourceButton: Boolean(list.querySelector('[data-guru-product-source-id="smoke-hat"]')) };
  })()`);
  assert.deepEqual(reordered.visible, ["smoke-hat", "smoke-goat"], JSON.stringify({ drag, dragState }));
  assert.deepEqual(reordered.platform, reordered.visible);
  assert.equal(reordered.sourceButton, true);
  await wait(250);
  const persisted = await evaluate(`(() => {
    const workspace = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId) || "null");
    const row = workspace?.gates?.find((gate) => gate.id === "gate-1")?.cards
      ?.find((card) => card.id === "card-22")?.pageRows
      ?.find((item) => item.name === "Новогодние подарки 2027");
    const categoryId = row?.categoryId;
    return { product: row?.contextFields?.catalogProductCardsV516?.["smoke-hat"] || {},
      order: workspace?.gates?.find((gate) => gate.id === "gate-0")?.cards
        ?.find((card) => card.id === "card-7")?.megaMarketing?.platformV2
        ?.relationsV1?.productOrderByCategory?.[categoryId] || [] };
  })()`);
  assert.equal(persisted.product.description, "Тёплая шапка с ушками Козы");
  assert.equal(persisted.product.orderCtaRefV1, "smoke-hat-offer::primary");
  assert.equal(persisted.product.detailsLabel, "Детали шапки");
  assert.deepEqual(persisted.order, ["smoke-hat", "smoke-goat"]);
  if (screenshotPath) {
    await call("Emulation.setDeviceMetricsOverride", {
      width: screenshotWidth, height: 1000, deviceScaleFactor: 1, mobile: false,
    });
    const screenshot = await call("Page.captureScreenshot", { format: "png" });
    await writeFile(screenshotPath, Buffer.from(screenshot.data, "base64"));
  }
  await evaluate(`(() => {
    document.querySelector('[data-guru-product-source-id="smoke-hat"]')?.click();
    return true;
  })()`);
  await wait(650);
  const sourceNavigation = await evaluate(`(() => {
    const source = document.querySelector('[data-mega-platform-rename-product="smoke-hat"]');
    return {
      gate: activeGateId,
      selectedProductId: guruV194Ui(state).selectedProductId,
      sourceId: source?.dataset.megaPlatformRenameProduct || '',
      sourceName: source?.value || '',
      platformCardOpen: source?.closest('details.gate0-card')?.open || false,
      sourceFocused: document.activeElement === source,
      unrelatedProductFocused: document.activeElement?.dataset.megaPlatformRenameProduct === 'smoke-goat',
    };
  })()`);
  assert.equal(sourceNavigation.gate, "gate-0");
  assert.equal(sourceNavigation.selectedProductId, "smoke-hat");
  assert.equal(sourceNavigation.sourceId, "smoke-hat");
  assert.equal(sourceNavigation.sourceName, "Шапка Коза");
  assert.equal(sourceNavigation.platformCardOpen, true);
  assert.equal(sourceNavigation.sourceFocused, true);
  assert.equal(sourceNavigation.unrelatedProductFocused, false);

  // Two legacy products may have the same name; the source link must still
  // select the exact catalog item and focus its own Platform row.
  await evaluate(`(() => {
    const categoryId = findCard('card-22').pageRows
      .find((row) => row.name === 'Новогодние подарки 2027').categoryId;
    state.project.catalogItemsV189.push({ id: 'smoke-hat-twin', name: 'Шапка Коза',
      continuum: 'physical_product', createdAt: new Date().toISOString() });
    megaPlatformCategoryStore(state).categoryIdsByProduct['smoke-hat-twin'] = [categoryId];
    const product = guruCategoryProductsV510(findCard('card-22').pageRows
      .find((row) => row.categoryId === categoryId))
      .find((item) => item.id === 'smoke-hat-twin');
    const holder = document.createElement('div');
    holder.innerHTML = guruCategoryProductCardV516(product, findCard('card-22').pageRows
      .find((row) => row.categoryId === categoryId));
    document.body.append(holder);
    holder.querySelector('[data-guru-product-source-id="smoke-hat-twin"]').click();
    holder.remove();
    return true;
  })()`);
  await wait(650);
  const duplicateNameNavigation = await evaluate(`(() => ({
    gate: activeGateId,
    selectedProductId: guruV194Ui(state).selectedProductId,
    focusedProductId: document.activeElement?.dataset.megaPlatformRenameProduct || '',
    focusedName: document.activeElement?.value || '',
  }))()`);
  assert.equal(duplicateNameNavigation.gate, 'gate-0');
  assert.equal(duplicateNameNavigation.selectedProductId, 'smoke-hat-twin');
  assert.equal(duplicateNameNavigation.focusedProductId, 'smoke-hat-twin');
  assert.equal(duplicateNameNavigation.focusedName, 'Шапка Коза');

  // The independent audit link still opens the exact Gate 1 row when it exists.
  await evaluate(`(() => {
    guruV189CatalogItemById('smoke-goat', state).continuum = 'pure_service';
    const link = document.createElement('button');
    link.dataset.megaPlatformSourceProductAudit = 'smoke-goat';
    document.body.append(link);
    link.click();
    link.remove();
    return true;
  })()`);
  await wait(650);
  const auditNavigation = await evaluate(`(() => ({
    gate: activeGateId,
    productCardOpen: getGate1AccordionState().cards['card-24'] === true,
    selectedProductId: guruV194Ui(state).selectedProductId,
    rowId: findCard('card-24')?.pageRows?.find((row) => row.catalogItemIdV189 === 'smoke-goat')?.id || '',
    visibleRow: Boolean(document.querySelector('[data-card="card-24"] [data-gate1-page-card-id="card-24"][data-gate1-page-index]')),
  }))()`);
  assert.equal(auditNavigation.gate, "gate-1");
  assert.equal(auditNavigation.productCardOpen, true);
  assert.equal(auditNavigation.selectedProductId, "smoke-goat");
  assert.equal(auditNavigation.rowId, "smoke-goat-page");
  assert.equal(auditNavigation.visibleRow, true);
  await evaluate(`(() => {
    const link = document.createElement('button');
    link.dataset.megaPlatformSourceProductAudit = 'smoke-hat';
    document.body.append(link);
    link.click();
    link.remove();
    return true;
  })()`);
  await wait(650);
  const missingAuditNavigation = await evaluate(`({
    gate: activeGateId,
    selectedProductId: guruV194Ui(state).selectedProductId,
    focusedProductId: document.activeElement?.dataset.megaPlatformRenameProduct || '',
  })`);
  assert.equal(missingAuditNavigation.gate, 'gate-0');
  assert.equal(missingAuditNavigation.selectedProductId, 'smoke-hat');
  assert.equal(missingAuditNavigation.focusedProductId, 'smoke-hat');
  await evaluate("location.reload(); true");
  await wait(900);
  await evaluate('document.querySelector("[data-open-project]")?.click(); true');
  await wait(1000);
  const restored = await evaluate(`(() => {
    const card = findCard('card-22');
    const row = card?.pageRows?.find((item) => item.name === 'Новогодние подарки 2027');
    return { title: card?.title || '',
      products: guruCategoryProductsV510(row).map((item) => ({ id: item.id, orderLabel: item.orderLabel })),
      selectedRef: row?.contextFields?.catalogProductCardsV516?.['smoke-hat']?.orderCtaRefV1 || '' };
  })()`);
  assert.equal(restored.title, "КАТЕГОРИИ");
  assert.deepEqual(restored.products.map((item) => item.id),
    ["smoke-hat", "smoke-goat", "smoke-hat-twin"]);
  assert.equal(restored.products[0].orderLabel, "Купить шапку сейчас");
  assert.equal(restored.selectedRef, "smoke-hat-offer::primary");
  console.log("Gate 1 category list preview smoke passed");
} finally {
  socket.close();
}
