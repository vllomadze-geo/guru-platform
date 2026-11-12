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
    flashSaving = () => { nowGuideMarkWorkspaceChanged(); };
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
    goat.contextFields.goat_page_status_catalog_link_v514 = "ready";
    goat.contextFields.productCatalogLinkSetV514 = "yes";
    goat.contextFields.goat_page_status_product_jsonld_v514 = "ready";
    goat.contextFields.productJsonLdAddedV514 = "yes";
    goat.contextFields.productJsonLdValidatedV514 = "no";
    goat.contextFields.pageSemanticKeywordsV1 = ["авторская коза"];
    goat.contextFields.productDetailedTitleV516 = "Сохранённый заголовок";
    goat.contextFields.productDetailedShortDescriptionV516 = "Сохранённое краткое описание";
    goat.contextFields.productDetailedBodyV516 = "Сохранённый основной текст";
    goat.contextFields.productDeliveryGuaranteeTitleV255 = "Мои условия";
    goat.contextFields.productDeliveryGuaranteeCardsV255 = [
      { id: "target-condition", title: "Особое условие", description: "Сохранить текст" },
      { id: "target-blank", title: "", description: "" },
    ];
    goat.goatProductCardSchemaV514 = GOAT_PRODUCT_CARD_SCHEMA_V514;
    const other = makeRow("other-row", "catalog-item-other-product", "Шапка Коза", "missing");
    other.contextFields.productDeliveryGuaranteeTitleV255 = "Условия источника";
    other.contextFields.productDeliveryGuaranteeV253 = "Доставка, оплата и гарантия";
    other.contextFields.productDeliveryGuaranteeCardsV255 = [
      { id: "source-delivery", title: "Доставка", description: "По России" },
      { id: "source-guarantee", title: "Гарантия", description: "30 дней" },
    ];
    card.pageRows = [goat, other];
    state = { project: { id: "product-template-smoke", catalogItemsV189: [
      { id: goat.catalogItemIdV189, name: goat.name, continuum: "pure_product" },
      { id: other.catalogItemIdV189, name: other.name, continuum: "pure_product" }
    ] }, gates: [
      { id: "gate-0", cards: [{ id: "card-7", title: "Текущее состояние маркетинговой системы · Компания", megaMarketing: { platform: [], infra: [], channels: [], platformV2: { fundamental: [], landings: {}, extra: [], urlsV1: { fixed: { data_consent: "https://k-apple.ru/soglasie" }, categories: {}, products: { [goat.catalogItemIdV189]: "https://k-apple.ru/simvol-2027-koza" }, custom: {} } } } }] },
      { id: "gate-1", cards: [card] }
    ] };
    const firstMigration = goatProductCardMigrateWorkspaceV514(state);
    const secondMigration = goatProductCardMigrateWorkspaceV514(state);
    guruV247KeywordFoundationRecord(guruV194Product(goat.catalogItemIdV189, state), true, state).keywords = [
      { value: "авторская коза", source: "manual", status: "confirmed" },
    ];
    const html = card.pageRows.map((row, index) => pageStructureCardHtml(card, row, index, true));
    const container = document.createElement("main");
    container.style.cssText = "display:grid;gap:24px;padding:24px;background:#fff;max-width:1400px;margin:auto";
    document.body.replaceChildren(container);
    html.forEach((markup, index) => {
      const article = document.createElement("article");
      article.innerHTML = '<h2 style="font:700 24px Arial;margin:0 0 16px">' + card.pageRows[index].name + '</h2>' + markup;
      container.append(article);
    });
    const snapshots = [...container.children].map((article) => ({
      steps: article.querySelectorAll('[data-goat-product-step-v517]').length,
      groups: article.querySelectorAll(".goat-product-group-v515").length,
      sections: article.querySelectorAll(".goat-product-section-v515").length,
      decisionRows: article.querySelectorAll(".goat-product-decisions-v554").length,
      implementedControls: article.querySelectorAll("[data-goat-product-implemented-v554]").length,
      excludedControls: article.querySelectorAll("[data-goat-product-exclude-v553]").length,
      controlsAtBottom: [...article.querySelectorAll(".goat-product-section-v515")].every(block =>
        block.querySelector(".goat-product-section-body-v515")?.lastElementChild
          ?.classList.contains("goat-product-decisions-v554")),
      sectionStatuses: [...article.querySelectorAll(".goat-product-section-v515")]
        .map(block => block.querySelector("[data-goat-product-status-v554]")?.textContent.trim()),
      pageDecisionBlocks: ["pageSemantics", "pageHeading", "seoSnippet"].map((key) => {
        const block = article.querySelector('[data-goat-product-section-card-v514="' + key + '"]');
        const body = block?.querySelector(":scope > .route-section-body");
        return { key, badge: block?.querySelector(":scope > summary [data-goat-product-status-v554]")?.textContent.trim(),
          atBottom: body?.lastElementChild?.classList.contains("goat-product-decisions-v554"),
          implemented: Boolean(body?.querySelector('[data-goat-product-implemented-v554="' + key + '"]')),
          excluded: Boolean(body?.querySelector('[data-goat-product-exclude-v553="' + key + '"]')) };
      }),
      manualStatusSelects: article.querySelectorAll("[data-goat-product-status-v514]").length,
      serviceSections: article.querySelectorAll(".goat-product-service-section-v515").length,
      productJsonLd: Boolean(article.querySelector('[data-goat-product-section-card-v514="product_jsonld"]')),
      cwvTitle: [...article.querySelectorAll('.v22-section-title')]
        .map(node => node.textContent.trim()).find(title => title.includes('CWV / PageSpeed Insights')),
      numberedTitles: [...article.querySelectorAll('.goat-product-section-v515 > summary .v22-section-title, .goat-product-service-section-v515 > summary .v22-section-title')]
        .map(node => node.textContent.trim()),
      legacyStatusSelects: article.querySelectorAll("[data-product-card-v253-status]").length,
      blankSelects: [...article.querySelectorAll(".goat-product-unified-v515 select, .goat-product-service-sections-v514 select")].filter((select) =>
        select.options.length === 0 || select.selectedOptions[0]?.textContent.trim() === "Выбрать").length,
      h1: article.querySelector('[data-goat-product-row-field-v514="h1"]')?.value,
      meaning: article.querySelector('[data-page-context-key="productMeaningV253"]')?.value,
      detailedDescription: Boolean(article.querySelector('[data-v22-site-section="product_detailed_description_v516"]')),
      seoSnippet: Boolean(article.querySelector('[data-v22-site-section="seo_snippet"]')),
      seoKeywords: article.querySelector('[data-v22-site-section="seo_snippet"] [data-page-context-key="seoKeywords"]')?.value,
      semanticOrder: [...article.querySelectorAll('[data-v22-site-section="page_semantics_v1"], [data-v22-site-section="page_heading_description_v513"], [data-v22-site-section="seo_snippet"]')]
        .map(node => node.dataset.v22SiteSection),
      catalogLink: Boolean(article.querySelector('[data-goat-product-section-card-v514="catalog_link"]')),
      middleFoundation: Boolean(article.querySelector('[data-gate1-middle-foundation-v257], [data-goat-product-foundation-slot-v517]')),
      heroStatus: article.querySelector('[data-goat-product-section-card-v514="hero"] [data-goat-product-status-v554]')?.textContent.trim(),
      ctaText: article.querySelector('[data-page-context-key="productFinalCtaButtonTextV514"]')?.value,
      finalForm: {
        heading: article.querySelector('[data-goat-final-preview-v552="heading"]')?.textContent,
        description: article.querySelector('[data-goat-final-preview-v552="description"]')?.textContent,
        name: Boolean(article.querySelector('.goat-product-final-cta-preview-v552 input[type="text"]')),
        phone: Boolean(article.querySelector('[data-goat-product-final-phone-v552]')),
        topic: Boolean(article.querySelector('[data-goat-final-preview-v552="topic"]')),
        consentUnchecked: article.querySelector('.goat-product-final-cta-consent-v552 input[type="checkbox"]')?.checked === false,
        consentUrl: article.querySelector('[data-goat-final-preview-v552="consentLink"]')?.getAttribute("href"),
        button: article.querySelector('[data-goat-final-preview-v552="button"]')?.textContent,
        destination: article.querySelector('[data-page-context-key="productFinalCtaDestinationV514"]')?.value,
      },
      duplicateSourceBlocks: article.querySelectorAll('.goat-product-passport-v517, [data-product-description-source]').length,
      duplicatePageHeader: article.querySelectorAll('.page-structure-card > .route-card-head, .page-structure-card > .route-top-grid').length,
      problemHeading: (() => {
        const heading = article.querySelector('.goat-product-section-v515.status-problem summary strong');
        return heading ? { text: heading.textContent, color: getComputedStyle(heading).color,
          parentColor: getComputedStyle(heading.closest('summary')).color } : null;
      })(),
    }));
    const sourceSelect = container.children[0].querySelector('[data-product-card-delivery-source-v550]');
    const sourceOptions = [...sourceSelect.options].map((option) => option.textContent);
    sourceSelect.value = other.id;
    sourceSelect.dispatchEvent(new Event("change", { bubbles: true }));
    const copyButton = container.children[0].querySelector('[data-product-card-delivery-copy-v550]');
    const selectionDidNotCopy = goat.contextFields.productDeliveryGuaranteeTitleV255 === "Мои условия" &&
      goat.contextFields.productDeliveryGuaranteeCardsV255[0].description === "Сохранить текст" &&
      copyButton.disabled === false;
    const originalConfirm = window.confirm;
    let confirmations = 0;
    window.confirm = () => { confirmations++; return false; };
    copyButton.click();
    const cancelPreserved = goat.contextFields.productDeliveryGuaranteeTitleV255 === "Мои условия" &&
      goat.contextFields.productDeliveryGuaranteeCardsV255[0].description === "Сохранить текст";
    window.confirm = () => { confirmations++; return true; };
    copyButton.click();
    window.confirm = originalConfirm;
    const copied = {
      title: goat.contextFields.productDeliveryGuaranteeTitleV255,
      description: goat.contextFields.productDeliveryGuaranteeV253,
      cards: goat.contextFields.productDeliveryGuaranteeCardsV255.map(({ id, title, description }) =>
        ({ id, title, description })),
      sourceCards: other.contextFields.productDeliveryGuaranteeCardsV255.map(({ id, title, description }) =>
        ({ id, title, description })),
      shownDescription: container.children[0].querySelector('[data-page-context-key="productDeliveryGuaranteeV253"]')?.value,
      selectionDidNotCopy, cancelPreserved, confirmations,
    };
    const copiedField = container.children[0].querySelector(
      '[data-product-card-delivery-field-v255="description"]');
    copiedField.value = "Индивидуальная доставка";
    copiedField.dispatchEvent(new Event("input", { bubbles: true }));
    const editedIndependently = goat.contextFields.productDeliveryGuaranteeCardsV255[0].description ===
      "Индивидуальная доставка";
    const sourceUnchanged = other.contextFields.productDeliveryGuaranteeCardsV255[0].description === "По России";
    const secondSelect = container.children[0].querySelector('[data-product-card-delivery-source-v550]');
    secondSelect.value = other.id;
    secondSelect.dispatchEvent(new Event("change", { bubbles: true }));
    const secondCopyButton = container.children[0].querySelector('[data-product-card-delivery-copy-v550]');
    window.confirm = () => true;
    secondCopyButton.click();
    window.confirm = originalConfirm;
    const noDuplicates = goat.contextFields.productDeliveryGuaranteeCardsV255.length === 2;
    other.contextFields.productDeliveryGuaranteeCardsV255[0].description = "Условия источника изменены";
    const sourceEditIndependent = goat.contextFields.productDeliveryGuaranteeCardsV255[0].description === "По России";
    const meaningTarget = makeRow("meaning-target-row", "meaning-target-product", "Другой товар", "missing");
    const meaningSource = makeRow("meaning-source-row", "meaning-source-product", "Источник смысла", "works");
    meaningTarget.contextFields.productMeaningTitleV256 = "Свой заголовок";
    meaningTarget.contextFields.productMeaningButtonV256 = "Своя кнопка";
    meaningTarget.contextFields.productMeaningPhotoV256 = {
      id: "meaning-target-photo", name: "old.png", dataUrl: "data:image/png;base64,aGVsbG8=",
    };
    meaningSource.contextFields.productMeaningTitleV256 = "Общий заголовок";
    meaningSource.contextFields.productMeaningV253 = "Общий текст смысла";
    meaningSource.contextFields.productMeaningButtonV256 = "Общий призыв";
    meaningSource.contextFields.productMeaningPhotoV256 = {
      id: "meaning-source-photo", name: "shared.png", dataUrl: "data:image/png;base64,d29ybGQ=",
    };
    const meaningIndex = card.pageRows.length;
    card.pageRows.push(meaningTarget, meaningSource);
    state.project.catalogItemsV189.push(
      { id: meaningTarget.catalogItemIdV189, name: meaningTarget.name },
      { id: meaningSource.catalogItemIdV189, name: meaningSource.name },
    );
    const meaningHost = document.createElement("div");
    meaningHost.innerHTML = goatProductCardMeaningEditorV514(card, meaningTarget, meaningIndex);
    container.append(meaningHost);
    const meaningSelect = meaningHost.querySelector('[data-product-card-meaning-source-v560]');
    meaningSelect.value = meaningSource.id;
    meaningSelect.dispatchEvent(new Event("change", { bubbles: true }));
    const meaningButton = meaningHost.querySelector('[data-product-card-meaning-copy-v560]');
    const meaningSelectionDidNotCopy = meaningButton.disabled === false &&
      meaningTarget.contextFields.productMeaningTitleV256 === "Свой заголовок";
    let meaningConfirmations = 0;
    window.confirm = () => { meaningConfirmations++; return false; };
    meaningButton.click();
    const meaningCancelPreserved = meaningTarget.contextFields.productMeaningTitleV256 === "Свой заголовок" &&
      meaningTarget.contextFields.productMeaningPhotoV256.id === "meaning-target-photo";
    window.confirm = () => { meaningConfirmations++; return true; };
    meaningButton.click();
    window.confirm = originalConfirm;
    const meaningCopied = {
      title: meaningTarget.contextFields.productMeaningTitleV256,
      text: meaningTarget.contextFields.productMeaningV253,
      button: meaningTarget.contextFields.productMeaningButtonV256,
      photoName: meaningTarget.contextFields.productMeaningPhotoV256?.name,
      photoDataUrl: meaningTarget.contextFields.productMeaningPhotoV256?.dataUrl,
      distinctPhoto: meaningTarget.contextFields.productMeaningPhotoV256 !==
        meaningSource.contextFields.productMeaningPhotoV256 &&
        meaningTarget.contextFields.productMeaningPhotoV256?.id !==
        meaningSource.contextFields.productMeaningPhotoV256?.id,
      shownTitle: meaningHost.querySelector('[data-page-context-key="productMeaningTitleV256"]')?.value,
      shownPhoto: meaningHost.querySelector('.product-card-meaning-photo-preview-v256 img')?.getAttribute('src'),
      meaningSelectionDidNotCopy, meaningCancelPreserved, meaningConfirmations,
    };
    const meaningEdit = meaningHost.querySelector('[data-page-context-key="productMeaningV253"]');
    meaningEdit.value = "Отдельный текст товара";
    updatePageContextField({ target: meaningEdit });
    meaningSource.contextFields.productMeaningPhotoV256.name = "source-updated.png";
    meaningCopied.independentText = meaningSource.contextFields.productMeaningV253 === "Общий текст смысла";
    meaningCopied.independentPhoto = meaningTarget.contextFields.productMeaningPhotoV256.name === "shared.png";
    meaningHost.remove();
    card.pageRows.pop();
    card.pageRows.pop();
    state.project.catalogItemsV189.pop();
    state.project.catalogItemsV189.pop();
    const phone = container.children[0].querySelector('[data-goat-product-final-phone-v552]');
    phone.value = "89991234567";
    phone.dispatchEvent(new Event("input", { bubbles: true }));
    const formattedPhone = phone.value;
    const descriptionEdit = container.children[0].querySelector('[data-page-context-key="productFinalCtaDescriptionV552"]');
    descriptionEdit.value = "Согласуем детали вашего заказа.";
    descriptionEdit.dispatchEvent(new Event("input", { bubbles: true }));
    updatePageContextField({ target: descriptionEdit });
    const descriptionPreview = container.children[0].querySelector('[data-goat-final-preview-v552="description"]')?.textContent;
    const descriptionSaved = goat.contextFields.productFinalCtaDescriptionV552;
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
        url: megaPlatformUrl("products", goat.catalogItemIdV189, state),
        duplicatePageHeader: preview.querySelectorAll('.page-structure-card > .route-card-head, .page-structure-card > .route-top-grid').length,
        cta: preview.querySelector('[data-page-context-key="productFinalCtaButtonTextV514"]')?.value,
      };
    });
    state.project.id = initialProjectId;
    const productId = "breadcrumb-product";
    const categories = [
      { id: "winter", name: "Зимние вещи", legacyNames: [] },
      { id: "gifts", name: "Подарки", legacyNames: [] },
    ];
    const breadcrumbWorkspace = {
      project: { id: "breadcrumb-smoke", catalogItemsV189: [{ id: productId, name: "Шапка Коза" }],
        productRegistryV185: categories },
      gates: [
        { id: "gate-0", cards: [{ id: "card-7", megaMarketing: { platform: [], infra: [], channels: [],
          platformV2: { fundamental: [], landings: {}, extra: [],
            relationsV1: { categoryIdsByProduct: { [productId]: ["winter"] }, productOrderByCategory: {}, migrationConflicts: [] },
            urlsV1: { fixed: { home: "https://example.test/", catalog: "https://example.test/catalog" },
              categories: { winter: "https://example.test/winter", gifts: "https://example.test/gifts" },
              products: { [productId]: "https://example.test/shapka-koza" }, custom: {} } } } }] },
        { id: "gate-1", cards: [{ id: "card-22-hub", pageRows: [{ id: "hub", name: "Коллекции" }] }] },
      ],
    };
    const breadcrumbRow = { catalogItemIdV189: productId, contextFields: {} };
    const breadcrumbState = () => {
      const holder = document.createElement("div");
      holder.innerHTML = goatProductBreadcrumbsV549(breadcrumbRow, breadcrumbWorkspace);
      const nav = holder.querySelector('nav[aria-label="Хлебные крошки"]');
      return { names: [...nav.querySelectorAll("a, span[aria-current]")].map((item) => item.textContent),
        links: [...nav.querySelectorAll("a")].map((item) => item.getAttribute("href")),
        current: nav.querySelector('[aria-current="page"]')?.textContent };
    };
    const initialBreadcrumbs = breadcrumbState();
    breadcrumbWorkspace.project.productRegistryV185[0].name = "Тёплые вещи";
    breadcrumbWorkspace.gates[1].cards[0].pageRows[0].name = "Каталог подарков";
    breadcrumbWorkspace.gates[0].cards[0].megaMarketing.platformV2.urlsV1.categories.winter = "https://example.test/warm";
    const renamedBreadcrumbs = breadcrumbState();
    breadcrumbWorkspace.gates[0].cards[0].megaMarketing.platformV2.relationsV1.categoryIdsByProduct[productId] = ["gifts"];
    const movedBreadcrumbs = breadcrumbState();
    breadcrumbWorkspace.project.catalogItemsV189[0].name = "Новая шапка";
    const renamedProductBreadcrumbs = breadcrumbState();
    breadcrumbWorkspace.gates[0].cards[0].megaMarketing.platformV2.urlsV1.categories.gifts = "/gifts";
    const relativeUrlBreadcrumbs = breadcrumbState();
    breadcrumbWorkspace.gates[0].cards[0].megaMarketing.platformV2.urlsV1.categories.gifts = "";
    const missingUrlBreadcrumbs = breadcrumbState();
    container.children[0].querySelector('[data-goat-product-section-card-v514="hero"]').open = true;
    container.children[1].querySelector('[data-goat-product-section-card-v514="hero"]').open = true;
    container.children[1].querySelector('[data-goat-product-section-card-v514="gallery"]').open = true;
    state.project.gate0ScopeUiV194 = { selectedProductId: goat.catalogItemIdV189 };
    nowGuideDisplayedAllBlocks = nowGuideBuildAllBlocks();
    nowGuideDisplayedPath = nowGuidePreflightPath(nowGuideDisplayedAllBlocks);
    const heroBlock = container.children[0].querySelector('[data-goat-product-section-card-v514="hero"]');
    const implemented = heroBlock.querySelector('[data-goat-product-implemented-v554]');
    const exclude = heroBlock.querySelector('[data-goat-product-exclude-v553]');
    const gateBefore = guruGateReadiness(state.gates[1]);
    guruGateReadinessCache.set('gate-1', gateBefore);
    const projectBefore = guruProjectReadiness();
    const decisionTimings = [];
    const clickDecision = (control) => {
      const recalculate = recalculateStatusForCard;
      const readiness = guruGateReadiness;
      const block = control.closest('[data-goat-product-section-card-v514]');
      const badge = block.querySelector('[data-goat-product-status-v554]');
      let recalculations = 0, fullReadinessCalls = 0;
      recalculateStatusForCard = function (...args) {
        recalculations++;
        return recalculate.apply(this, args);
      };
      guruGateReadiness = function (...args) {
        fullReadinessCalls++;
        return readiness.apply(this, args);
      };
      const started = performance.now();
      try { control.click(); }
      finally {
        decisionTimings.push({ ms: performance.now() - started, recalculations,
          fullReadinessCalls, blockStable: block.isConnected,
          badgeStable: badge === block.querySelector('[data-goat-product-status-v554]') });
        recalculateStatusForCard = recalculate;
        guruGateReadiness = readiness;
      }
    };
    const includedCount = () => GOAT_PRODUCT_COUNTED_SECTIONS_V553
      .filter((section) => !goatProductSectionExcludedV553(goat, section)).length;
    const exclusionsBefore = includedCount();
    clickDecision(implemented);
    const gateImplemented = guruGateReadiness(state.gates[1]);
    const implementation = {
      checked: implemented.checked,
      badge: heroBlock.querySelector('[data-goat-product-status-v554]')?.textContent.trim(),
      excluded: exclude.checked,
      stored: goat.contextFields.productCardImplementedSectionsV554.hero,
      oldStatus: goat.contextFields.goat_page_status_hero_v514,
      readyBefore: gateBefore.ready,
      readyAfter: gateImplemented.ready,
      cachedReadyAfter: guruGateReadinessCache.get('gate-1')?.ready,
      guideStatusAfter: nowGuideDisplayedAllBlocks.find(item => item.kind === 'product-card-section'
        && item.section === 'hero')?.status,
      rerendered: (() => {
        const preview = document.createElement('div');
        preview.innerHTML = productCardSectionsV253(card, JSON.parse(JSON.stringify(goat)), 0);
        return preview.querySelector('[data-goat-product-section-card-v514="hero"] [data-goat-product-status-v554]')?.textContent.trim();
      })(),
    };
    clickDecision(exclude);
    const gateExcluded = guruGateReadiness(state.gates[1]);
    const projectExcluded = guruProjectReadiness();
    const exclusion = {
      buttons: container.children[0].querySelectorAll('[data-goat-product-exclude-v553]').length,
      open: heroBlock.open,
      checked: exclude.checked,
      implementationCleared: !implemented.checked,
      badge: heroBlock.querySelector('[data-goat-product-status-v554]')?.textContent.trim(),
      statusClass: heroBlock.classList.contains('status-excluded'),
      statusStored: goat.contextFields.goat_page_status_hero_v514,
      stored: JSON.parse(JSON.stringify(goat)).contextFields.productCardExcludedSectionsV553.hero,
      implementationStored: goat.contextFields.productCardImplementedSectionsV554.hero,
      guideExcluded: !nowGuideDisplayedAllBlocks.some(item => item.kind === 'product-card-section'
        && item.section === 'hero'),
      rerendered: (() => {
        const preview = document.createElement('div');
        preview.innerHTML = productCardSectionsV253(card, JSON.parse(JSON.stringify(goat)), 0);
        return preview.querySelector('[data-goat-product-section-card-v514="hero"] [data-goat-product-status-v554]')?.textContent.trim();
      })(),
      otherUntouched: other.contextFields.productCardExcludedSectionsV553 === undefined,
      includedBefore: exclusionsBefore,
      includedAfter: includedCount(),
      gateBefore: gateBefore.total,
      gateAfter: gateExcluded.total,
      readyBefore: gateImplemented.ready,
      readyAfter: gateExcluded.ready,
      projectBefore: projectBefore.total,
      projectAfter: projectExcluded.total,
      savedMeaning: goat.contextFields.productMeaningV253,
    };
    clickDecision(exclude);
    exclusion.restored = {
      checked: exclude.checked,
      badge: heroBlock.querySelector('[data-goat-product-status-v554]')?.textContent.trim(),
      included: includedCount(),
      gate: guruGateReadiness(state.gates[1]).total,
      stored: goat.contextFields.productCardExcludedSectionsV553.hero === undefined,
      guideRestored: nowGuideDisplayedAllBlocks.some(item => item.kind === 'product-card-section'
        && item.section === 'hero' && item.status === 'in_progress'),
    };
    exclusion.allSections = [...container.children[0].querySelectorAll('[data-goat-product-exclude-v553]')]
      .map((input) => {
        const section = input.dataset.goatProductExcludeV553;
        const block = input.closest('[data-goat-product-section-card-v514]');
        const done = block.querySelector('[data-goat-product-implemented-v554]');
        const isPageDecision = ['pageSemantics', 'pageHeading', 'seoSnippet'].includes(section);
        const reopened = () => {
          const preview = document.createElement('div');
          preview.innerHTML = pageStructureCardHtml(card, JSON.parse(JSON.stringify(goat)), 0, true);
          const restored = preview.querySelector('[data-goat-product-section-card-v514="' + section + '"]');
          return { badge: restored?.querySelector('[data-goat-product-status-v554]')?.textContent.trim(),
            done: restored?.querySelector('[data-goat-product-implemented-v554]')?.checked,
            excluded: restored?.querySelector('[data-goat-product-exclude-v553]')?.checked };
        };
        const before = guruGateReadiness(state.gates[1]).total;
        clickDecision(done);
        const ready = done.checked && !input.checked && goatProductCardStatusV514(goat, section) === 'ready';
        const reopenedReady = isPageDecision ? reopened() : null;
        clickDecision(input);
        const excluded = input.checked && !done.checked
          && block.querySelector('[data-goat-product-status-v554]')?.textContent.trim() === 'Не учитывается'
          && goatProductSectionExcludedV553(goat, section)
          && guruGateReadiness(state.gates[1]).total === before - 1;
        const reopenedExcluded = isPageDecision ? reopened() : null;
        clickDecision(input);
        return { section, ready, excluded, restored: !input.checked && !done.checked
          && !goatProductSectionExcludedV553(goat, section)
          && goatProductCardStatusV514(goat, section) === 'in_progress'
          && guruGateReadiness(state.gates[1]).total === before,
          reopenedReady, reopenedExcluded, reopenedWorking: isPageDecision ? reopened() : null };
      });
    exclusion.secondProductUnchanged = other.contextFields.productCardExcludedSectionsV553 === undefined;
    exclusion.secondProductImplementationUntouched = other.contextFields.productCardImplementedSectionsV554 === undefined;
    const headingBlock = container.children[0].querySelector('[data-goat-product-section-card-v514="pageHeading"]');
    for (const key of ['page_settings_title_v513', 'page_settings_description_v513']) {
      const field = headingBlock.querySelector('[data-page-context-key="' + key + '"]');
      field.value = key === 'page_settings_title_v513' ? 'Заполненный заголовок' : 'Заполненное описание';
      field.dispatchEvent(new Event('input', { bubbles: true }));
      updatePageContextField({ target: field });
    }
    const filledHeadingStatus = {
      title: goat.contextFields.page_settings_title_v513,
      description: goat.contextFields.page_settings_description_v513,
      badge: headingBlock.querySelector('[data-goat-product-status-v554]')?.textContent.trim(),
    };
    const legacyRelated = JSON.parse(JSON.stringify(other));
    legacyRelated.contextFields.productRelatedImplementedV253 = 'yes';
    const legacyRelatedReady = goatProductCardStatusV514(legacyRelated, 'related') === 'ready';
    return { firstMigration, secondMigration,
      savedCatalogFields: [goat.contextFields.goat_page_status_catalog_link_v514,
        goat.contextFields.productCatalogLinkSetV514],
      savedJsonLdFields: [goat.contextFields.goat_page_status_product_jsonld_v514,
        goat.contextFields.productJsonLdAddedV514,
        goat.contextFields.productJsonLdValidatedV514],
      newJsonLdStatus: other.contextFields.goat_page_status_product_jsonld_v514 ?? null,
      savedDetailedText: [goat.contextFields.productDetailedTitleV516,
        goat.contextFields.productDetailedShortDescriptionV516,
        goat.contextFields.productDetailedBodyV516],
      snapshots, deliveryCopy: { sourceOptions, ...copied, editedIndependently, sourceUnchanged, sourceEditIndependent, noDuplicates },
      meaningCopy: meaningCopied,
      finalFormEdit: { formattedPhone, descriptionPreview, descriptionSaved },
      updatedName, projectChecks, implementation, exclusion, filledHeadingStatus,
      legacyRelatedReady, decisionTimings,
      breadcrumbs: { initial: initialBreadcrumbs, renamed: renamedBreadcrumbs,
        moved: movedBreadcrumbs, renamedProduct: renamedProductBreadcrumbs,
        relativeUrl: relativeUrlBreadcrumbs, missingUrl: missingUrlBreadcrumbs,
        storedPath: breadcrumbRow.contextFields.catalogBreadcrumbsPathV493 ?? null } };
  })()`);

  for (const [index, card] of result.snapshots.entries()) {
    if (card.groups !== 0 || card.sections !== 8 || card.serviceSections !== 0 ||
        card.decisionRows !== 11 || card.implementedControls !== 11 || card.excludedControls !== 11 ||
        !card.controlsAtBottom || card.manualStatusSelects ||
        card.sectionStatuses.some(status => status !== "В работе") ||
        card.pageDecisionBlocks.some(block => block.badge !== "В работе" ||
          !block.atBottom || !block.implemented || !block.excluded) ||
        card.productJsonLd || (card.cwvTitle && card.cwvTitle !== "9. CWV / PageSpeed Insights") ||
        card.steps !== 0 || card.catalogLink || card.middleFoundation ||
        card.semanticOrder.join(",") !== "page_semantics_v1,page_heading_description_v513,seo_snippet" ||
        card.numberedTitles.length !== 8 ||
        card.numberedTitles.some((title, number) => !title.startsWith(`${number + 1}.`)) ||
        card.legacyStatusSelects || card.blankSelects || card.detailedDescription ||
        !card.seoSnippet || card.problemHeading?.color === "rgb(255, 255, 255)" ||
        !card.finalForm.name || !card.finalForm.phone || !card.finalForm.topic ||
        !card.finalForm.consentUnchecked || card.finalForm.consentUrl !== "https://k-apple.ru/soglasie" ||
        card.finalForm.button !== "Своя кнопка" || card.finalForm.destination !== "Попап BF502N с формой" ||
        card.finalForm.heading !== "Сохранённый призыв" || !card.finalForm.description)
      throw new Error(`Product ${index + 1} uses an incomplete template: ${JSON.stringify(card)}`);
  }
  if (result.snapshots[0].heroStatus !== "В работе" || result.snapshots[1].heroStatus !== "В работе" ||
      result.snapshots.some((item) => item.duplicateSourceBlocks !== 0 || item.duplicatePageHeader !== 0) ||
      result.snapshots[0].seoKeywords !== "авторская коза" ||
      result.savedCatalogFields.join(",") !== "ready,yes" ||
      result.savedJsonLdFields.join(",") !== "ready,yes,no" ||
      result.newJsonLdStatus !== null ||
      result.savedDetailedText.join("|") !==
        "Сохранённый заголовок|Сохранённое краткое описание|Сохранённый основной текст" ||
      result.snapshots[1].meaning !== "Сохранённый смысл товара" ||
      result.snapshots[1].ctaText !== "Своя кнопка" ||
      result.deliveryCopy.sourceOptions.join("|") !== "Выберите товар|Шапка Коза" ||
      !result.deliveryCopy.selectionDidNotCopy || !result.deliveryCopy.cancelPreserved ||
      result.deliveryCopy.confirmations !== 2 ||
      result.deliveryCopy.title !== "Условия источника" ||
      result.deliveryCopy.description !== "Доставка, оплата и гарантия" ||
      result.deliveryCopy.shownDescription !== "Доставка, оплата и гарантия" ||
      result.deliveryCopy.cards.length !== 2 ||
      result.deliveryCopy.cards[0].description !== "По России" ||
      result.deliveryCopy.cards[0].id === "source-delivery" ||
      result.deliveryCopy.cards[1].description !== "30 дней" ||
      result.deliveryCopy.cards[1].id === "source-guarantee" ||
      !result.deliveryCopy.editedIndependently || !result.deliveryCopy.sourceUnchanged ||
      !result.deliveryCopy.sourceEditIndependent ||
      !result.deliveryCopy.noDuplicates ||
      !result.meaningCopy.meaningSelectionDidNotCopy ||
      !result.meaningCopy.meaningCancelPreserved ||
      result.meaningCopy.meaningConfirmations !== 2 ||
      result.meaningCopy.title !== "Общий заголовок" ||
      result.meaningCopy.text !== "Общий текст смысла" ||
      result.meaningCopy.button !== "Общий призыв" ||
      result.meaningCopy.photoName !== "shared.png" ||
      result.meaningCopy.photoDataUrl !== "data:image/png;base64,d29ybGQ=" ||
      !result.meaningCopy.distinctPhoto ||
      result.meaningCopy.shownTitle !== "Общий заголовок" ||
      result.meaningCopy.shownPhoto !== result.meaningCopy.photoDataUrl ||
      !result.meaningCopy.independentText || !result.meaningCopy.independentPhoto ||
      result.finalFormEdit.formattedPhone !== "+7 (999) 123-45-67" ||
      result.finalFormEdit.descriptionPreview !== "Согласуем детали вашего заказа." ||
      result.finalFormEdit.descriptionSaved !== "Согласуем детали вашего заказа." ||
      result.updatedName !== "Шапка Коза — новое название" ||
      result.projectChecks.some((item) => item.steps !== 0 ||
        item.duplicatePageHeader !== 0 ||
        item.h1 !== "Символ 2027 года «Коза»" ||
        item.url !== "https://k-apple.ru/simvol-2027-koza" ||
        item.cta !== "Своя кнопка") ||
      result.breadcrumbs.initial.names.join("|") !== "Главная|Коллекции|Зимние вещи|Шапка Коза" ||
      result.breadcrumbs.initial.links.join("|") !== "https://example.test/|https://example.test/catalog|https://example.test/winter" ||
      result.breadcrumbs.renamed.names.join("|") !== "Главная|Каталог подарков|Тёплые вещи|Шапка Коза" ||
      result.breadcrumbs.renamed.links[2] !== "https://example.test/warm" ||
      result.breadcrumbs.moved.names[2] !== "Подарки" ||
      result.breadcrumbs.moved.links[2] !== "https://example.test/gifts" ||
      result.breadcrumbs.renamedProduct.current !== "Новая шапка" ||
      result.breadcrumbs.relativeUrl.links[2] !== "https://example.test/gifts" ||
      result.breadcrumbs.missingUrl.links.length !== 2 ||
      result.breadcrumbs.missingUrl.current !== "Новая шапка" ||
      result.breadcrumbs.storedPath !== null ||
      !result.implementation.checked || result.implementation.badge !== "Готово" ||
      result.implementation.excluded || !result.implementation.stored ||
      result.implementation.oldStatus !== "ready" ||
      result.implementation.readyAfter !== result.implementation.readyBefore + 1 ||
      result.implementation.cachedReadyAfter !== result.implementation.readyAfter ||
      result.implementation.guideStatusAfter !== "ready" ||
      result.implementation.rerendered !== "Готово" ||
      result.exclusion.buttons !== 11 ||
      !result.exclusion.open || !result.exclusion.checked || !result.exclusion.implementationCleared ||
      result.exclusion.badge !== "Не учитывается" || !result.exclusion.statusClass ||
      result.exclusion.statusStored !== "ready" || !result.exclusion.stored || result.exclusion.implementationStored ||
      !result.exclusion.guideExcluded ||
      result.exclusion.rerendered !== "Не учитывается" ||
      !result.exclusion.otherUntouched || result.exclusion.includedBefore !== 11 ||
      result.exclusion.includedAfter !== 10 ||
      result.exclusion.gateAfter !== result.exclusion.gateBefore - 1 ||
      result.exclusion.readyAfter !== result.exclusion.readyBefore - 1 ||
      result.exclusion.projectAfter !== result.exclusion.projectBefore - 1 ||
      result.exclusion.savedMeaning !== "Сохранённый смысл товара" ||
      result.exclusion.restored.checked ||
      result.exclusion.restored.badge !== "В работе" ||
      result.exclusion.restored.included !== 11 ||
      result.exclusion.restored.gate !== result.exclusion.gateBefore ||
      !result.exclusion.restored.stored || !result.exclusion.restored.guideRestored ||
      result.exclusion.allSections.length !== 11 ||
      result.exclusion.allSections.some((item) => !item.ready || !item.excluded || !item.restored) ||
      result.exclusion.allSections.filter((item) => item.reopenedReady).some((item) =>
        item.reopenedReady.badge !== 'Готово' || !item.reopenedReady.done || item.reopenedReady.excluded ||
        item.reopenedExcluded.badge !== 'Не учитывается' || item.reopenedExcluded.done || !item.reopenedExcluded.excluded ||
        item.reopenedWorking.badge !== 'В работе' || item.reopenedWorking.done || item.reopenedWorking.excluded) ||
      result.filledHeadingStatus.title !== 'Заполненный заголовок' ||
      result.filledHeadingStatus.description !== 'Заполненное описание' ||
      result.filledHeadingStatus.badge !== 'В работе' ||
      !result.exclusion.secondProductUnchanged || !result.exclusion.secondProductImplementationUntouched ||
      !result.legacyRelatedReady ||
      result.decisionTimings.length !== 36 ||
      result.decisionTimings.some(item => item.recalculations || item.fullReadinessCalls ||
        !item.blockStable || !item.badgeStable) ||
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
  await writeFile("artifacts/gate1-product-flat-template-smoke.png", Buffer.from(goatScreenshot.data, "base64"));
  console.log(JSON.stringify(result, null, 2));
  console.log("Screenshot: artifacts/gate1-product-flat-template-smoke.png");
} finally {
  socket.close();
}
