console.log("checkpoint: start");
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9335";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
console.log("checkpoint: pages", pages.length);
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
  if (message.method === "Runtime.consoleAPICalled") {
    const values = (message.params?.args || []).map((item) => item.value ?? item.description);
    console.log("browser:", ...values);
  }
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
  if (response.exceptionDetails)
    throw new Error(
      response.exceptionDetails.exception?.description ||
        response.exceptionDetails.text,
    );
  return response.result.value;
}

await call("Runtime.enable");
await call("Page.enable");
console.log("checkpoint: connected");
await call("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 1200,
  deviceScaleFactor: 1,
  mobile: false,
});
await call("Page.navigate", { url: "http://127.0.0.1:3000/" });
await wait(1200);
console.log("checkpoint: navigated");
await evaluate(`(() => {
  localStorage.clear();
  localStorage.setItem("guru-platform-access-v01", "unlocked");
  localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
    id: "product-card-seven-blocks-smoke",
    name: "Product card seven blocks smoke",
    lifecycleStatus: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }]));
  return true;
})()`);
await wait(100);
console.log("checkpoint: isolated storage ready");
console.log("checkpoint: isolated functions ready");

const result = await evaluate(`(async () => {
  scheduleCloudSync = () => {};
  scheduleProjectsCloudSync = () => {};
  const card = { id: "card-24", title: "КАРТОЧКА ТОВАРА", pageRows: [] };
  const goat = {
    id: "page-goat-v253",
    catalogItemIdV189: "catalog-item-product-card-smoke-goat",
    name: "Символ 2027 года «Коза»",
    h1: "",
    title: "Коза ручной работы — символ 2027 года",
    description: "Авторский подарок с доставкой по России",
    finalCta: "",
    ctaMode: "needed",
    productGalleryPhotos: [],
    productGalleryMainPhotoId: "",
    contextFields: {
      row_h1__flag: "missing",
      row_h1__flagNote: "Символ 2027 года «Коза» ручной работы",
      productGallery: "",
      productGallery__flag: "missing",
      productGallery__flagNote: "Основное фото, фото спереди, сзади, сбоку, детали, упаковка, в интерьере. Лейбл: «Ручная работа».",
      productRating__flag: "not_needed",
      productShortDescription: "• Авторская игрушка ручной работы.\\n• Символ 2027 года для дома или подарка.\\n• Каждая работа имеет свой характер и выполнена вручную.",
      productShortDescription__flag: "missing",
      productShortDescription__flagNote: "• Авторская игрушка ручной работы.\\n• Символ 2027 года для дома или подарка.\\n• Каждая работа имеет свой характер и выполнена вручную.",
      productPrice: "???",
      productPrice__flag: "missing",
      productPrice__flagNote: "5 000",
      productAvailability__flag: "not_needed",
      productAvailability__flagNote: "В наличии",
      productButtons__flag: "missing",
      productButtons__flagNote: "Оформить заказ • Задать вопрос",
      productTrustMini: "Ручная работа • Надёжная подарочная упаковка • Доставка по России",
      productTrustMini__flag: "missing",
      productTrustMini__flagNote: "Ручная работа • Надёжная подарочная упаковка • Доставка по России",
      productTabs__flag: "missing",
      productTabs__flagNote: "Описание • Характеристики • Комплектация • Доставка и оплата",
      productDescription__flag: "missing",
      productDescription__flagNote: "Символ 2027 года, созданный вручную. Каждая коза собирается и оформляется вручную, поэтому имеет свой характер и настроение.",
      productCharacteristics__flag: "missing",
      productCharacteristics__flagNote: "Материал: текстиль, декоративные элементы.\\nИзготовление: ручная работа.\\nВысота: по запросу.\\nЦвет: как на фото или индивидуально.\\nУход: сухая чистка.\\nПроизводство: мастерская «Коричное яблоко».",
      productSet: "• Авторская коза ручной работы.\\n• Подарочная упаковка.",
      productSet__flag: "missing",
      productCrossSell: "Авторские открытки • Подарочная упаковка • Декор для дома",
      productCrossSell__flag: "missing",
      productUgc__flag: "not_needed",
      productClientResult: "Реальный отзыв появится позже",
      productRecommendationReasons: "Покупатели отмечают ручную работу",
      productDeliveryPayment__flag: "missing",
      productDeliveryPayment__flagNote: "Доставка по России • Самовывоз по согласованию • Изготовление 3–7 дней • Оплата при оформлении заказа",
      productViewed__flag: "missing",
      productViewed__flagNote: "Символ 2027 года «Коза» • Дрифтвуд"
    }
  };
  const shirt = {
    id: "page-shirt-v253",
    catalogItemIdV189: "catalog-item-1786792591872-c8b1e9",
    name: "Рубашка Upcycling с кружевом",
    h1: "Рубашка Upcycling с кружевом",
    title: "",
    description: "",
    finalCta: "",
    ctaMode: "needed",
    contextFields: {
      productShortDescription: "Эта рубашка создана в технике upcycling.",
      productPrice: "4 900 р.",
      productButtons: "Оформить заказ"
    }
  };
  card.pageRows = [goat, shirt];
  const goatChanged = productCardMigrateRowV253(goat, goat.catalogItemIdV189);
  const shirtChanged = productCardMigrateRowV253(shirt, shirt.catalogItemIdV189);
  // Имитируем уже мигрированную v2.3.17 строку: активного краткого описания
  // ещё нет, но его исходник сохранён в legacy-архиве.
  delete shirt.contextFields.productHeroShortDescriptionV254;
  const migrationWorkspace = {
    project: {
      id: "product-card-seven-blocks-smoke",
      catalogItemsV189: [
        {
          id: goat.catalogItemIdV189,
          name: goat.name,
          categoryId: "category-gifts",
          continuum: "pure_product",
          source: { kind: "gate1", cardId: card.id, rowId: goat.id, rowIndex: 0 }
        },
        {
          id: shirt.catalogItemIdV189,
          name: shirt.name,
          categoryId: "category-clothes",
          continuum: "pure_product",
          source: { kind: "gate1", cardId: card.id, rowId: shirt.id, rowIndex: 1 }
        }
      ],
      gate0ScopedValuesV194: [{
        id: "gate0-foundation-goat",
        field: "keyword_foundation",
        scope: "product",
        product_id: goat.catalogItemIdV189,
        category_id: "category-gifts",
        value: "",
        keywords: [{ value: "символ 2027 года коза", source: "generated", status: "confirmed" }]
      }]
    },
    gates: [{ id: "gate-1", cards: [card] }]
  };
  const migration = productCardMigrateWorkspaceV253(migrationWorkspace);
  const firstMeaning = goat.contextFields.productMeaningV253;
  const firstCreation = goat.contextFields.productCreationV253;
  goat.contextFields.productMeaningV253 = "Ручная редактура смысла";
  goat.contextFields.productMeaningTitleV256 = "Подарок с характером";
  goat.contextFields.productDeliveryGuaranteeTitleV255 = "Получение и гарантии";
  goat.contextFields.productDeliveryGuaranteeCardsV255[0].title = "Доставка";
  goat.contextFields.productDeliveryGuaranteeCardsV255[0].description = "По России транспортной компанией";
  goat.contextFields.productCreationV253 = "Каждое изделие создаётся вручную в мастерской";
  goat.contextFields.seoKeywords = "символ 2027 года коза, готовый SEO запрос";
  const rerun = productCardMigrateWorkspaceV253(migrationWorkspace);
  const meaningAfterRerun = goat.contextFields.productMeaningV253;

  state = migrationWorkspace;

  const targetGoat = structuredClone(goat);
  targetGoat.catalogItemIdV189 = "catalog-item-1786792591872-51f503";
  targetGoat.finalCta = "Сохранённый заголовок CTA";
  const targetHost = document.createElement("div");
  targetHost.innerHTML = v22RouteSectionsHtml(card, targetGoat, 0);
  const targetUI = {
    groups: targetHost.querySelectorAll(".goat-product-group-v514").length,
    finishGroup: Boolean(targetHost.querySelector(".product-card-group-finish-v253")),
    sections: [...targetHost.querySelectorAll(".goat-product-unified-v514 [data-goat-product-section-card-v514]")]
      .map((section) => section.querySelector("summary")?.textContent.trim() || section.textContent.trim()),
    codes: [...targetHost.querySelectorAll(".goat-product-unified-v514 .product-card-tilda-v253")]
      .map((item) => item.textContent.trim()),
    reviews: targetHost.querySelectorAll(".goat-product-review-card-v514").length,
    serviceSections: targetHost.querySelectorAll(".goat-product-service-section-v514").length,
    detailedDescriptionBeforeSeo: (() => {
      const sections = [...targetHost.querySelectorAll("[data-v22-site-section]")]
        .map((section) => section.dataset.v22SiteSection);
      return sections.indexOf("product_detailed_description_v516") >= 0 &&
        sections.indexOf("product_detailed_description_v516") < sections.indexOf("seo_snippet");
    })(),
    detailedDescriptionFields: [...targetHost.querySelectorAll('[data-v22-site-section="product_detailed_description_v516"] [data-page-context-key]')]
      .map((field) => ({ key: field.dataset.pageContextKey, maxLength: field.maxLength, tag: field.tagName })),
    finalCta: targetGoat.finalCta,
    ctaText: targetGoat.contextFields.productFinalCtaButtonTextV514,
    ctaDestination: targetGoat.contextFields.productFinalCtaDestinationV514,
    ctaStatus: targetGoat.contextFields.goat_page_status_final_cta_v514,
  };

  const host = document.createElement("div");
  host.id = "product-card-seven-blocks-host";
  host.innerHTML = v22RouteSectionsHtml(card, goat, 0);
  document.body.append(host);

  const blocks = [...host.querySelectorAll(".product-card-block-v253")];
  const groups = [...host.querySelectorAll(".product-card-group-v253")];
  const codes = [...host.querySelectorAll(".product-card-tilda-v253")].map((item) => item.textContent.trim());
  const titles = [...host.querySelectorAll(".product-card-block-v253 strong")].map((item) => item.textContent.trim());
  const heroFieldLabels = [...host.querySelectorAll(".product-card-hero-fields-v253 > .product-card-field-v253 > span")]
    .map((item) => item.textContent.trim());
  const detailedFields = [...host.querySelectorAll('[data-v22-site-section="product_detailed_description_v516"] [data-page-context-key]')];
  const detailedValues = [
    "Подарок с характером",
    "Авторская коза ручной работы",
    "Мягкая коза ручной работы, созданная в мастерской с вниманием к деталям и аккуратно подготовленная для подарка.",
  ];
  detailedFields.forEach((field, index) => {
    field.value = detailedValues[index];
    updatePageContextField({ target: field });
  });
  const detailedRerender = document.createElement("div");
  detailedRerender.innerHTML = v22RouteSectionsHtml(card, goat, 0);
  const legacy = goat.legacyPageItemsV253;
  const deletedKeysVisible = ["Рейтинг", "Наличие", "Вкладки", "Комплектация", "Отзывы / UGC", "Результат клиента", "Основания рекомендовать"]
    .filter((label) => host.textContent.includes(label));
  const activeOldKeys = Object.keys(goat.contextFields).filter((key) =>
    ["productRating", "productShortDescription", "productAvailability", "productTabs", "productDescription", "productCharacteristics", "productSet", "productCrossSell", "productUgc", "productClientResult", "productRecommendationReasons", "productDeliveryPayment", "productViewed"]
      .some((oldKey) => key === oldKey || key.startsWith(oldKey + "__"))
  );
  const blockWidths = blocks.map((item) => Math.round(item.getBoundingClientRect().width));
  const groupColumns = groups.map((item) => getComputedStyle(item).gridTemplateColumns.split(/\\s+/).filter(Boolean).length);
  const deliveryItemsBefore = host.querySelectorAll(".product-card-delivery-item-v255").length;
  renderGate = () => {};
  flashSaving = () => {};
  const statusControl = host.querySelector('[data-product-card-v253-key="productMeaningV253"]');
  statusControl.value = "works";
  statusControl.dispatchEvent(new Event("change", { bubbles: true }));
  const checkboxControl = host.querySelector('[data-product-card-v253-key="productFinalCtaImplementedV253"]');
  checkboxControl.checked = true;
  checkboxControl.dispatchEvent(new Event("change", { bubbles: true }));
  const firstDeliveryTitle = host.querySelector('[data-product-card-delivery-field-v255="title"]');
  firstDeliveryTitle.value = "Бережная доставка";
  firstDeliveryTitle.dispatchEvent(new Event("input", { bubbles: true }));
  host.querySelector("[data-product-card-delivery-add-v255]").click();
  const meaningTitle = host.querySelector('[data-page-context-key="productMeaningTitleV256"]');
  const meaningButton = host.querySelector('[data-page-context-key="productMeaningButtonV256"]');
  meaningTitle.value = "История ручной работы";
  updatePageContextField({ target: meaningTitle });
  meaningButton.value = "Посмотреть изделие";
  updatePageContextField({ target: meaningButton });
  const meaningPhotoInput = host.querySelector('[data-product-card-meaning-photo-input-v256]');
  const meaningPhotoBlob = await (await fetch("/favicon.png")).blob();
  const meaningPhotoTransfer = new DataTransfer();
  meaningPhotoTransfer.items.add(new File([meaningPhotoBlob], "meaning.png", { type: "image/png" }));
  meaningPhotoInput.files = meaningPhotoTransfer.files;
  meaningPhotoInput.dispatchEvent(new Event("change", { bubbles: true }));
  await new Promise((resolve) => setTimeout(resolve, 800));
  const middleSectionBefore = host.querySelector("[data-gate1-middle-foundation-v257]");
  console.log("middle: rendered", Boolean(middleSectionBefore));
  middleSectionBefore.querySelector("[data-gate1-middle-keyword-generate]").click();
  console.log("middle: generated");
  let middleStats = guruGate1MiddleStatsV257(goat);
  const middleFirstValues = middleStats.keywords.map(guruV247KeywordText);
  const middleFirstCount = middleStats.total;
  const gate0Values = guruV247KeywordFoundationStats(
    guruV194Product(goat.catalogItemIdV189, state),
    state,
  ).record.keywords.map(guruV247KeywordText);
  const gate0Normalized = new Set(gate0Values.map(guruV247KeywordNormalize));
  const middleOverlap = middleFirstValues.filter((value) =>
    gate0Normalized.has(guruV247KeywordNormalize(value)),
  );
  host.querySelector("[data-gate1-middle-keyword-generate]").click();
  console.log("middle: repeated");
  middleStats = guruGate1MiddleStatsV257(goat);
  const middleCountAfterRepeat = middleStats.total;
  const middleValuesAfterRepeat = middleStats.keywords.map(guruV247KeywordText);
  const middleDuplicateCount = middleValuesAfterRepeat.length - new Set(
    middleValuesAfterRepeat.map(guruV247KeywordNormalize),
  ).size;
  host.querySelector("[data-gate1-middle-keyword-confirm]")?.click();
  console.log("middle: confirmed");
  middleStats = guruGate1MiddleStatsV257(goat);
  const confirmedMiddleId = middleStats.keywords.find((entry) => entry.status === "confirmed")?.id || "";
  goat.contextFields.productMeaningV253 = "Полностью обновлённый смысл изделия";
  guruGate1MiddleRefreshV257(card, goat, 0);
  console.log("middle: stale refreshed");
  const staleMiddleCount = host.querySelectorAll(".gate1-middle-keyword-foundation-v257 .is-draft.is-stale").length;
  const confirmedMiddleStale = Boolean(
    host.querySelector(
      '[data-gate1-middle-keyword-row="' +
        CSS.escape(confirmedMiddleId) +
        '"].is-stale',
    ),
  );
  const middleCsv = guruV248KeywordFoundationCsv(middleStats.record.keywords);
  const middleCsvParsed = guruV248ParseKeywordCsv(middleCsv);
  const middleCsvAdd = guruKeywordFoundationApplyImportV257(
    middleStats.record,
    middleCsvParsed,
    "add",
    "middle.csv",
    guruGate1MiddleBlockedKeywordsV257(goat, state),
  );
  console.log("middle: csv checked");
  const panelHost = document.createElement("div");
  panelHost.innerHTML = guruStrategicFoundationHtmlV237(
    guruV194Product(goat.catalogItemIdV189, state),
  );
  console.log("middle: panel rendered");
  const panelKeywordCards = [...panelHost.querySelectorAll(".guru-strategic-keyword-card-v249")];
  const panelKeywordTitles = panelKeywordCards.map((item) => item.querySelector("strong")?.textContent.trim());
  const panelSources = panelKeywordCards.map((item) => item.querySelector("small")?.textContent.trim());
  const panelActions = panelKeywordCards.map((item) => item.querySelector(".guru-strategic-keyword-action-v258")?.textContent.trim() || "");
  const panelRowTitles = [...panelHost.querySelectorAll(".guru-strategic-row-copy-v286 > strong")]
    .map((item) => item.textContent.trim());
  return {
    migration,
    rerun,
    rowCount: card.pageRows.length,
    blockCount: blocks.length,
    groupCount: groups.length,
    codes,
    titles,
    deletedKeysVisible,
    activeOldKeys,
    firstMeaning,
    meaningAfterRerun,
    migrated: {
      h1: goat.h1,
      price: goat.contextFields.productPrice,
      buttons: goat.contextFields.productButtons,
      shortDescription: goat.contextFields.productHeroShortDescriptionV254,
      creation: firstCreation,
      delivery: goat.contextFields.productDeliveryGuaranteeV253,
      shirtMeaning: shirt.contextFields.productMeaningV253,
      shirtShortDescription: shirt.contextFields.productHeroShortDescriptionV254
    },
    delivery: {
      title: goat.contextFields.productDeliveryGuaranteeTitleV255,
      description: goat.contextFields.productDeliveryGuaranteeV253,
      itemsBefore: deliveryItemsBefore,
      itemsAfterAdd: goat.contextFields.productDeliveryGuaranteeCardsV255.length,
      firstCardTitle: goat.contextFields.productDeliveryGuaranteeCardsV255[0]?.title,
      cardFields: host.querySelectorAll("[data-product-card-delivery-field-v255]").length
    },
    meaningEditor: {
      labels: [...host.querySelectorAll(".product-card-meaning-editor-v256 > .product-card-field-v253 > span")].map((item) => item.textContent.trim()),
      photoInput: Boolean(meaningPhotoInput),
      photoStored: Boolean(goat.contextFields.productMeaningPhotoV256?.dataUrl?.startsWith("data:image/")),
      title: goat.contextFields.productMeaningTitleV256,
      text: "Ручная редактура смысла",
      button: goat.contextFields.productMeaningButtonV256
    },
    middleFoundation: {
      sectionVisible: Boolean(middleSectionBefore),
      firstCount: middleFirstCount,
      examples: middleFirstValues.slice(0, 5),
      countAfterRepeat: middleCountAfterRepeat,
      secondRunAdded: middleCountAfterRepeat - middleFirstCount,
      duplicateCount: middleDuplicateCount,
      exactSeoPhrasePreserved: middleFirstValues.includes("готовый SEO запрос"),
      slicedSeoPhrasePresent: middleFirstValues.some((value) => value === "готовый seo" || value === "seo запрос"),
      meaningPresent: middleFirstValues.includes("история ручной работы"),
      deliveryPresent: middleFirstValues.includes("бережная доставка"),
      overlap: middleOverlap,
      confirmed: middleStats.confirmed,
      staleDrafts: staleMiddleCount,
      confirmedStale: confirmedMiddleStale,
      csvHeader: middleCsv.split(/\\r?\\n/)[0],
      csvAddDuplicates: middleCsvAdd.added,
      panelKeywordTitles,
      panelSources,
      panelActions,
      panelGate0Pills: panelKeywordCards[0]?.querySelectorAll(".guru-strategic-keyword-v249").length || 0,
      panelMiddlePills: panelKeywordCards[1]?.querySelectorAll(".guru-strategic-keyword-v249").length || 0,
      panelRowTitles,
      panelJtbdCards: panelHost.querySelectorAll("[data-guru-strategic-jtbd-v286]").length,
      otherProductTotal: guruGate1MiddleStatsV257(shirt).total
    },
    archive: {
      id: legacy?.id,
      oldFieldCount: Object.keys(legacy?.context_fields || {}).filter((key) => !key.includes("__")).length,
      ratingStatus: legacy?.context_fields?.productRating__flag,
      removedSet: legacy?.context_fields?.productSet,
      removedClientResult: legacy?.context_fields?.productClientResult,
      removedRecommendation: legacy?.context_fields?.productRecommendationReasons
    },
    ui: {
      groupColumns,
      blockWidths,
      heroFieldLabels,
      statusSelects: host.querySelectorAll("[data-product-card-v253-status]").length,
      checkboxes: host.querySelectorAll("[data-product-card-v253-check]").length,
      legacySections: [...host.querySelectorAll(".v22-route-section")].filter((section) => {
        const title = section.querySelector(".v22-section-title")?.textContent.trim() || "";
        return !["seo_snippet", "product_detailed_description_v516"].includes(section.dataset.v22SiteSection) && title !== "CWV / PageSpeed Insights";
      }).length,
      seoSection: Boolean(host.querySelector('[data-v22-site-section="seo_snippet"]')),
      detailedDescriptionBeforeSeo: (() => {
        const sections = [...host.querySelectorAll("[data-v22-site-section]")]
          .map((section) => section.dataset.v22SiteSection);
        return sections.indexOf("product_detailed_description_v516") >= 0 &&
          sections.indexOf("product_detailed_description_v516") < sections.indexOf("seo_snippet");
      })(),
      detailedDescriptionFields: detailedFields.map((field) => ({
        key: field.dataset.pageContextKey,
        maxLength: field.maxLength,
        tag: field.tagName,
      })),
      detailedDescriptionSaved: [
        goat.contextFields.productDetailedTitleV516,
        goat.contextFields.productDetailedShortDescriptionV516,
        goat.contextFields.productDetailedBodyV516,
      ],
      detailedDescriptionReloaded: [...detailedRerender.querySelectorAll('[data-v22-site-section="product_detailed_description_v516"] [data-page-context-key]')]
        .map((field) => field.value),
      technicalControl: [...host.querySelectorAll(".v22-section-title")].some((item) => item.textContent.trim() === "CWV / PageSpeed Insights")
    },
    interaction: {
      meaningStatus: goat.contextFields.productMeaningV253__flag,
      finalCtaImplemented: goat.contextFields.productFinalCtaImplementedV253
    },
    directMigration: { goatChanged, shirtChanged },
    log: migrationWorkspace.project._productCardMigrationLog?.find((entry) => entry.id === PRODUCT_CARD_SEVEN_BLOCKS_V253),
    shortDescriptionLog: migrationWorkspace.project._productCardMigrationLog?.find((entry) => entry.id === PRODUCT_CARD_HERO_SHORT_DESCRIPTION_V254),
    deliveryLog: migrationWorkspace.project._productCardMigrationLog?.find((entry) => entry.id === PRODUCT_CARD_DELIVERY_STRUCTURE_V255),
    targetUI,
  };
})()`);

if (result.targetUI.groups !== 2 || result.targetUI.finishGroup || result.targetUI.reviews !== 3 || result.targetUI.serviceSections !== 2)
  throw new Error(`Target product card structure is wrong: ${JSON.stringify(result.targetUI)}`);
if (!result.targetUI.codes.includes("Tilda: TS203") || !result.targetUI.codes.includes("Tilda: BF302 + BF502N") || result.targetUI.finalCta !== "Сохранённый заголовок CTA" || result.targetUI.ctaText !== "Задать вопрос" || result.targetUI.ctaDestination !== "Попап BF502N с формой" || result.targetUI.ctaStatus !== "not_started")
  throw new Error(`Target product card values or labels are wrong: ${JSON.stringify(result.targetUI)}`);
if (!result.targetUI.detailedDescriptionBeforeSeo || result.targetUI.detailedDescriptionFields.map((field) => `${field.tag}:${field.maxLength}`).join("|") !== "INPUT:40|TEXTAREA:90|TEXTAREA:300")
  throw new Error(`Target product description block is misplaced or has wrong fields: ${JSON.stringify(result.targetUI)}`);

if (result.blockCount !== 8 || result.groupCount !== 3)
  throw new Error(`Wrong card structure: ${JSON.stringify(result)}`);
if (result.ui.statusSelects !== 5 || result.ui.checkboxes !== 2)
  throw new Error(`Wrong controls: ${JSON.stringify(result)}`);
if (result.interaction.meaningStatus !== "works" || result.interaction.finalCtaImplemented !== "yes")
  throw new Error(`Controls do not persist values: ${JSON.stringify(result)}`);
if (result.codes.length !== 7 || !result.codes.includes("Tilda: ST210") || !result.codes.includes("Tilda: ST340"))
  throw new Error(`Tilda codes missing: ${JSON.stringify(result)}`);
if (!result.ui.detailedDescriptionBeforeSeo || result.ui.detailedDescriptionFields.map((field) => `${field.tag}:${field.maxLength}`).join("|") !== "INPUT:40|TEXTAREA:90|TEXTAREA:300" || result.ui.detailedDescriptionSaved.join("|") !== result.ui.detailedDescriptionReloaded.join("|"))
  throw new Error(`Product description fields are not placed or persisted correctly: ${JSON.stringify(result.ui)}`);
if (result.deletedKeysVisible.length || result.activeOldKeys.length)
  throw new Error(`Legacy fields remain active: ${JSON.stringify(result)}`);
if (result.meaningAfterRerun !== "Ручная редактура смысла" || result.rerun.changed)
  throw new Error(`Migration is not idempotent: ${JSON.stringify(result)}`);
if (result.migrated.h1 !== "Символ 2027 года «Коза» ручной работы" || result.migrated.price !== "5 000" || result.migrated.buttons !== "Оформить заказ • Задать вопрос")
  throw new Error(`Hero values were lost: ${JSON.stringify(result)}`);
if (!result.migrated.shortDescription.includes("Авторская игрушка") || result.migrated.shirtShortDescription !== "Эта рубашка создана в технике upcycling.")
  throw new Error(`Short descriptions were not restored: ${JSON.stringify(result)}`);
if (result.ui.heroFieldLabels.join("|") !== "H1|Цена|Кнопки|Краткое описание")
  throw new Error(`Hero field order is wrong: ${JSON.stringify(result)}`);
if (!result.titles.includes("3. Доставка / оплата / гарантия") || !result.titles.includes("4. Смысл товара") || !result.titles.includes("5. Как создаётся"))
  throw new Error(`Content block order is wrong: ${JSON.stringify(result)}`);
if (result.delivery.itemsBefore !== 2 || result.delivery.itemsAfterAdd !== 3 || result.delivery.cardFields !== 4 || result.delivery.firstCardTitle !== "Бережная доставка")
  throw new Error(`Delivery cards do not work: ${JSON.stringify(result)}`);
if (!result.delivery.description.includes("Надёжная подарочная упаковка") || !result.delivery.description.includes("Самовывоз"))
  throw new Error(`Existing delivery description was lost: ${JSON.stringify(result)}`);
if (result.meaningEditor.labels.join("|") !== "Заголовок|Текст|Кнопка" || !result.meaningEditor.photoInput || !result.meaningEditor.photoStored)
  throw new Error(`Meaning editor structure or photo upload failed: ${JSON.stringify(result)}`);
if (result.meaningEditor.title !== "История ручной работы" || result.meaningEditor.button !== "Посмотреть изделие" || result.meaningEditor.text !== "Ручная редактура смысла")
  throw new Error(`Meaning editor values were not preserved: ${JSON.stringify(result)}`);
if (!result.middleFoundation.sectionVisible || result.middleFoundation.firstCount <= 15 || result.middleFoundation.secondRunAdded !== 0 || result.middleFoundation.duplicateCount)
  throw new Error(`Middle foundation generation failed: ${JSON.stringify(result)}`);
if (!result.middleFoundation.exactSeoPhrasePreserved || result.middleFoundation.slicedSeoPhrasePresent)
  throw new Error(`SEO keyword phrases were sliced instead of preserved: ${JSON.stringify(result)}`);
if (!result.middleFoundation.meaningPresent || !result.middleFoundation.deliveryPresent)
  throw new Error(`Meaning or delivery candidates were omitted: ${JSON.stringify(result)}`);
if (result.middleFoundation.overlap.length)
  throw new Error(`Middle foundation duplicates Gate 0: ${JSON.stringify(result)}`);
if (result.middleFoundation.otherProductTotal !== 0)
  throw new Error(`Middle foundation leaked into another product: ${JSON.stringify(result)}`);
if (result.middleFoundation.confirmed !== 1 || !result.middleFoundation.staleDrafts || result.middleFoundation.confirmedStale)
  throw new Error(`Middle foundation status or stale marker failed: ${JSON.stringify(result)}`);
if (result.middleFoundation.csvHeader !== "phrase,source,status" || result.middleFoundation.csvAddDuplicates !== 0)
  throw new Error(`Middle foundation CSV compatibility failed: ${JSON.stringify(result)}`);
if (result.middleFoundation.panelKeywordTitles.length || result.middleFoundation.panelSources.length || result.middleFoundation.panelActions.length || result.middleFoundation.panelGate0Pills || result.middleFoundation.panelMiddlePills || result.middleFoundation.panelRowTitles.join("|") !== "Посадочная страница|Сегмент|Позиционирование|УТП|Оффер + CTA" || result.middleFoundation.panelJtbdCards)
  throw new Error(`Strategic panel hierarchy failed: ${JSON.stringify(result)}`);
if (!result.firstMeaning.includes("Авторская игрушка") || !result.firstMeaning.includes("Каждая коза собирается"))
  throw new Error(`Meaning draft is incomplete: ${JSON.stringify(result)}`);
if (!result.migrated.creation.includes("Изготовление: ручная работа") || !result.migrated.creation.includes("Производство: мастерская") || result.migrated.creation.includes("Материал:"))
  throw new Error(`Production extraction is wrong: ${JSON.stringify(result)}`);
if (!result.migrated.delivery.includes("Надёжная подарочная упаковка") || !result.migrated.delivery.includes("Самовывоз"))
  throw new Error(`Delivery draft is incomplete: ${JSON.stringify(result)}`);
if (result.archive.ratingStatus !== "not_needed" || !result.archive.removedSet || !result.archive.removedClientResult || !result.archive.removedRecommendation)
  throw new Error(`Legacy archive is incomplete: ${JSON.stringify(result)}`);
if (result.ui.groupColumns.some((count) => count !== 1) || result.ui.legacySections || !result.ui.seoSection || !result.ui.technicalControl)
  throw new Error(`UI grouping or retained controls failed: ${JSON.stringify(result)}`);
if (result.log?.before?.active_fields !== 17 || result.log?.after?.active_blocks !== 7)
  throw new Error(`Migration log is incomplete: ${JSON.stringify(result)}`);
if (result.shortDescriptionLog?.field !== "contextFields.productHeroShortDescriptionV254")
  throw new Error(`Short-description migration log is incomplete: ${JSON.stringify(result)}`);
if (result.deliveryLog?.position !== 3 || result.deliveryLog?.fields?.cards !== "contextFields.productDeliveryGuaranteeCardsV255[]")
  throw new Error(`Delivery migration log is incomplete: ${JSON.stringify(result)}`);

console.log(JSON.stringify(result, null, 2));
socket.close();
