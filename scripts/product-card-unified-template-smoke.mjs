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
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async (expression) => {
  const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};

try {
  await call("Page.enable");
  await call("Runtime.enable");
  await call("Network.clearBrowserCache");
  await call("Emulation.setDeviceMetricsOverride", {
    width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
  });
  await call("Page.navigate", { url: `http://127.0.0.1:${appPort}/` });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const result = await evaluate(`(() => {
    if (typeof v22RouteSectionsHtml !== "function") throw new Error("App did not load");
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    flashSaving = () => {};
    const card = { id: "card-24", title: "КАРТОЧКА ТОВАРА", pageRows: [] };
    const makeRow = (id, productId, name, legacyStatus) => ({
      id, catalogItemIdV189: productId, name, h1: name,
      title: name, description: "SEO текст", finalCta: "Сохранённый призыв",
      productCardSchemaV253: PRODUCT_CARD_SEVEN_BLOCKS_V253,
      contextFields: {
        productHeroV253__flag: legacyStatus,
        productGalleryV253__flag: "missing",
        productDeliveryGuaranteeV253__flag: "works",
        productMeaningV253__flag: "works",
        productCreationV253__flag: "missing",
        productPrice: "4 900", productButtons: "Оформить заказ • Задать вопрос",
        productHeroShortDescriptionV254: "Ручная работа",
        productMeaningV253: "Сохранённый смысл товара",
        productFinalCtaButtonTextV514: "Своя кнопка"
      },
    });
    const goat = makeRow("goat-row", "catalog-item-1786792591872-51f503", "Символ 2027 года «Коза»", "works");
    goat.contextFields.goat_page_status_hero_v514 = "ready";
    goat.goatProductCardSchemaV514 = GOAT_PRODUCT_CARD_SCHEMA_V514;
    const other = makeRow("other-row", "catalog-item-other-product", "Шапка Коза", "missing");
    card.pageRows = [goat, other];
    state = { project: { id: "product-template-smoke", catalogItemsV189: [
      { id: goat.catalogItemIdV189, name: goat.name, continuum: "pure_product" },
      { id: other.catalogItemIdV189, name: other.name, continuum: "pure_product" }
    ] }, gates: [
      { id: "gate-0", cards: [{ id: "card-7", title: "Текущее состояние маркетинговой системы · Компания", megaMarketing: { platform: [], infra: [], channels: [], platformV2: { fundamental: [], landings: {}, extra: [], urlsV1: { fixed: {}, categories: {}, products: { [goat.catalogItemIdV189]: "https://k-apple.ru/simvol-2027-koza" }, custom: {} } } } }] },
      { id: "gate-1", cards: [card] }
    ] };
    const firstMigration = goatProductCardMigrateWorkspaceV514(state);
    const secondMigration = goatProductCardMigrateWorkspaceV514(state);
    guruV247KeywordFoundationRecord(guruV194Product(goat.catalogItemIdV189, state), true, state).keywords = [
      { value: "авторская коза", source: "manual", status: "confirmed" },
    ];
    const controlKeys = (markup) => {
      const template = document.createElement("template");
      template.innerHTML = markup;
      return [...template.content.querySelectorAll("input, textarea, select, button")]
        .map((node) => [node.tagName, [...node.attributes]
          .filter((attr) => attr.name.startsWith("data-"))
          .map((attr) => attr.name + ":" + attr.value).join("|")].join(":"))
        .sort();
    };
    const beforeControls = controlKeys(__goatProductPrevRouteSectionsV517(card, goat, 0));
    const afterControls = controlKeys(v22RouteSectionsHtml(card, goat, 0));
    const fieldsPreserved = JSON.stringify(beforeControls) === JSON.stringify(afterControls);
    const html = card.pageRows.map((row, index) => pageStructureCardHtml(card, row, index, true));
    const container = document.createElement("main");
    container.style.cssText = "display:grid;gap:24px;padding:24px;background:#fff;max-width:1400px;margin:auto";
    document.body.replaceChildren(container);
    html.forEach((markup, index) => {
      const article = document.createElement("article");
      article.innerHTML = '<h2 style="font:700 24px Arial;margin:0 0 16px">' + card.pageRows[index].name + '</h2>' + markup;
      container.append(article);
    });
    const firstPage = container.children[0].querySelector('.page-structure-card');
    const foundation = gate1SeoProductFoundationNodeV298(guruV194Product(goat.catalogItemIdV189, state));
    if (foundation) firstPage.querySelector('[data-goat-product-foundation-slot-v517]').append(foundation);
    firstPage.querySelector('[data-goat-product-webmaster-slot-v517]').insertAdjacentHTML('beforeend', gate1WebmasterProductHtmlV295());
    firstPage.querySelector('[data-goat-product-step-v517="buyers"]').insertAdjacentHTML('beforeend', '<button class="small-btn add-inline-btn" data-g1pc-add="card-24">+ Добавить содержимое</button>');
    const snapshots = [...container.children].map((article) => ({
      steps: [...article.querySelectorAll('[data-goat-product-step-v517]')].map((step) => step.dataset.goatProductStepV517),
      groups: article.querySelectorAll(".goat-product-group-v515").length,
      sections: article.querySelectorAll(".goat-product-section-v515").length,
      serviceSections: article.querySelectorAll(".goat-product-service-section-v515").length,
      legacyStatusSelects: article.querySelectorAll("[data-product-card-v253-status]").length,
      blankSelects: [...article.querySelectorAll(".goat-product-unified-v515 select, .goat-product-service-sections-v514 select")].filter((select) =>
        select.options.length === 0 || select.selectedOptions[0]?.textContent.trim() === "Выбрать").length,
      h1: article.querySelector('[data-goat-product-row-field-v514="h1"]')?.value,
      meaning: article.querySelector('[data-page-context-key="productMeaningV253"]')?.value,
      detailedDescription: Boolean(article.querySelector('[data-v22-site-section="product_detailed_description_v516"]')),
      seoSnippet: Boolean(article.querySelector('[data-v22-site-section="seo_snippet"]')),
      heroStatus: article.querySelector('[data-goat-product-section-card-v514="hero"] [data-goat-product-status-v514]')?.value,
      ctaText: article.querySelector('[data-page-context-key="productFinalCtaButtonTextV514"]')?.value,
      foundation: Boolean(article.querySelector('[data-goat-product-foundation-slot-v517] [data-g1-seo-item-v296="keyword-foundations"]')),
      passportKeywords: article.querySelector('.goat-product-passport-sources-v517 > div:nth-child(2) strong')?.textContent,
      webmaster: Boolean(article.querySelector('[data-goat-product-webmaster-slot-v517] [data-g1-webmaster-scope-v295="product"]')),
      problemHeading: (() => {
        const heading = article.querySelector('.goat-product-section-v515.status-problem summary strong');
        return heading ? { text: heading.textContent, color: getComputedStyle(heading).color,
          parentColor: getComputedStyle(heading.closest('summary')).color } : null;
      })(),
    }));
    const edit = container.children[1].querySelector('[data-goat-product-row-field-v514="h1"]');
    edit.value = "Шапка Коза — новое название";
    edit.dispatchEvent(new Event("input", { bubbles: true }));
    const updatedName = other.h1;
    const initialProjectId = state.project.id;
    const projectChecks = ["Коричное яблоко", "iCleaning", "SIVRCE", "ГУРУ"].map((name) => {
      state.project.id = name;
      const preview = document.createElement("div");
      preview.innerHTML = pageStructureCardHtml(card, goat, 0, true);
      return {
        name,
        steps: preview.querySelectorAll("[data-goat-product-step-v517]").length,
        h1: preview.querySelector('[data-goat-product-row-field-v514="h1"]')?.value,
        url: preview.querySelector(".mega-platform-source-value")?.textContent,
        cta: preview.querySelector('[data-page-context-key="productFinalCtaButtonTextV514"]')?.value,
      };
    });
    state.project.id = initialProjectId;
    container.children[0].querySelector('[data-goat-product-section-card-v514="hero"]').open = true;
    container.children[1].querySelector('[data-goat-product-section-card-v514="hero"]').open = true;
    container.children[1].querySelector('[data-goat-product-section-card-v514="gallery"]').open = true;
    return { firstMigration, secondMigration, fieldsPreserved, controlCount: beforeControls.length,
      snapshots, updatedName, projectChecks };
  })()`);

  for (const [index, card] of result.snapshots.entries()) {
    if (card.groups !== 6 || card.sections !== 8 || card.serviceSections !== 2 ||
        card.steps.join(",") !== "passport,working,buyers,keywords,snippet,technical,indexing" ||
        card.legacyStatusSelects || card.blankSelects || !card.detailedDescription ||
        !card.seoSnippet || card.problemHeading?.color === "rgb(255, 255, 255)")
      throw new Error(`Product ${index + 1} uses an incomplete template: ${JSON.stringify(card)}`);
  }
  if (result.snapshots[0].heroStatus !== "ready" || result.snapshots[1].heroStatus !== "problem" ||
      result.snapshots[0].passportKeywords !== "авторская коза" ||
      !result.snapshots[0].foundation || !result.snapshots[0].webmaster ||
      result.snapshots[1].meaning !== "Сохранённый смысл товара" ||
      result.snapshots[1].ctaText !== "Своя кнопка" ||
      result.updatedName !== "Шапка Коза — новое название" ||
      result.projectChecks.some((item) => item.steps !== 7 ||
        item.h1 !== "Символ 2027 года «Коза»" ||
        item.url !== "https://k-apple.ru/simvol-2027-koza" ||
        item.cta !== "Своя кнопка") ||
      !result.fieldsPreserved ||
      !result.firstMigration.changed || result.secondMigration.changed)
    throw new Error(`Migration or live editing failed: ${JSON.stringify(result)}`);

  const screenshot = await call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile("artifacts/product-card-unified-template-smoke.png", Buffer.from(screenshot.data, "base64"));
  const rect = await evaluate(`(() => {
    const bounds = document.querySelector("article:first-child").getBoundingClientRect();
    return { x: bounds.x - 16, y: bounds.y - 8, width: bounds.width + 32, height: bounds.height + 16 };
  })()`);
  const goatScreenshot = await call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: { ...rect, scale: 1 },
  });
  await writeFile("artifacts/gate1-product-goat-steps-0-6-test-copy.png", Buffer.from(goatScreenshot.data, "base64"));
  console.log(JSON.stringify(result, null, 2));
  console.log("Screenshot: artifacts/gate1-product-goat-steps-0-6-test-copy.png");
} finally {
  socket.close();
}
