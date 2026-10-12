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
    throw new Error(
      response.exceptionDetails.exception?.description || response.exceptionDetails.text,
    );
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
    id: "gate1-catalog-audit-smoke",
    name: "Gate 1 catalog audit smoke",
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
  const gate = state.gates.find((item) => item.id === "gate-1");
  const card = gate.cards.find((item) => gate1IsCatalogAuditCard(item));
  if (!card) throw new Error("Catalog page card is missing");

  card.pageRows = [{
    id: "catalog-page-preserved",
    name: "Каталог",
    fixed: false,
    pageNeeded: "needed",
    url: "Каталог",
    urlStatus: "works",
    h1: "Каталог дизайнерских подарков",
    title: "Дизайнерские подарки — каталог авторских работ",
    description: "Каталог авторских подарков с понятной навигацией, описанием категорий и удобным выбором подходящей работы.",
    body: "",
    offer: "",
    ctaMode: "needed",
    finalCta: "Смотреть каталог",
    source: "",
    comment: "Существующий комментарий каталога",
    contextFields: {
      catalogIntro: "Авторские подарки ручной работы для дома и особых событий.",
      catalogFilters: "Табы по назначению и сортировка по цене",
      catalogCards: "Фото, категория, название, цена и кнопка перехода",
      catalogLeadMagnetPlace: "После шестой карточки",
      catalogLeadMagnetTitle: "Не знаете, что выбрать?",
      catalogLeadMagnetButton: "Получить консультацию",
      catalogPagination: "Показать ещё и числовая пагинация",
      catalogRelated: "Подарки для дома, одежда, графика",
      catalogFinalCta: "Подобрать подарок",
      seoKeywords: "авторские подарки, дизайнерские подарки"
    },
    cwvData: {
      mobile: { performance: "62", lcp: "", inp: "", cls: "", issue: "Нужно оптимизировать изображения", status: "needs_improvement" },
      desktop: { performance: "", lcp: "", inp: "", cls: "", issue: "", status: "" },
      evidence: "https://pagespeed.web.dev/catalog"
    }
  }];
  ensureGate1TypedData(card);
  const row = card.pageRows[0];
  const template = v22TemplateForCard(card);
  const statusByKey = Object.fromEntries(template.sections.map((section) => [section.key, v22SectionStatus(row, section)]));
  const beforeRow = JSON.stringify(row);
  const beforeCardRef = card;

  recalculateStatusForCard(card, state);
  const sections = getGate1Sections(gate, gate.cards);
  const siteAudit = sections.find((section) => section.key === "site_audit");
  const productPages = sections.find((section) => section.key === "__g1_product_pages");
  const siteTitles = siteAudit.allInnerCards.map((item) => item.title);
  const productTitles = productPages.allInnerCards.map((item) => item.title);
  const log = state.project._gate1SectionsMigrationLog.find((entry) => entry.id === GATE1_CATALOG_AUDIT_MIGRATION_V222);

  const acc = getGate1AccordionState();
  acc.subblocks.site_audit = true;
  acc.cards[card.id] = true;
  guruNavigateToGate("gate-1");
  renderGate();
  const renderedCard = document.querySelector('[data-card="' + CSS.escape(card.id) + '"]');
  const seoSection = renderedCard?.querySelector('[data-v22-site-section="seo_snippet"]');
  if (seoSection) seoSection.open = true;
  guruAutosizeVisible(seoSection);
  const seoCanvas = seoSection?.querySelector(".v22-site-canvas");
  const seoElements = [...(seoCanvas?.querySelectorAll(":scope > .v22-page-element") || [])];
  const seoWidths = seoElements.map((element) => Math.round(element.getBoundingClientRect().width));
  const seoTextareas = seoElements.map((element) => element.querySelector("textarea"));
  const renderedSection = renderedCard?.closest(".g1-section");
  const renderedSectionTitle = renderedSection?.querySelector(".g1-section-title")?.textContent.trim() || "";
  const renderedSectionProgress = renderedSection?.querySelector(".g1-section-progress")?.textContent.trim() || "";
  const productSelector = document.querySelector('[data-gate0-scope-category-select], [data-gate0-scope-product-select]');

  return {
    counts: { siteAudit: siteAudit.allInnerCards.length, productPages: productPages.allInnerCards.length },
    siteTitles,
    productTitles,
    positions: {
      home: siteTitles.indexOf("ГЛАВНАЯ"),
      catalog: siteTitles.indexOf("СПИСОК / КАТЕГОРИЯ"),
      blog: siteTitles.indexOf("СТАТЬЯ БЛОГА"),
      about: siteTitles.indexOf("О НАС")
    },
    data: {
      sameCardReference: gate.cards.find((item) => item.id === card.id) === beforeCardRef,
      sameRowJson: JSON.stringify(card.pageRows[0]) === beforeRow,
      rowId: card.pageRows[0].id,
      url: card.pageRows[0].url,
      comment: card.pageRows[0].comment
    },
    statuses: {
      hero: statusByKey.catalog_hero,
      leadMagnet: statusByKey.catalog_lead_magnet,
      seo: v22SectionStatus(row, { key: "seo_snippet", fields: [rowField("title", "Title", ""), rowField("description", "Description", "")] }),
      cwv: cwvBlockStatus(row)
    },
    rendered: {
      card: Boolean(renderedCard),
      sectionTitle: renderedSectionTitle,
      sectionProgress: renderedSectionProgress,
      selectorExists: Boolean(productSelector),
      catalogContainsSelector: Boolean(renderedCard?.querySelector('[data-gate0-scope-category-select], [data-gate0-scope-product-select]'))
    },
    seoUi: {
      fieldCount: seoElements.length,
      columnCount: getComputedStyle(seoCanvas).gridTemplateColumns.split(/\\s+/).filter(Boolean).length,
      widths: seoWidths,
      allTextareas: seoTextareas.every(Boolean),
      values: seoTextareas.map((textarea) => textarea?.value || ""),
      heights: seoTextareas.map((textarea) => Math.round(textarea?.getBoundingClientRect().height || 0)),
      fieldClasses: seoElements.map((element) => ({
        element: element.className,
        label: element.querySelector("label")?.className || "",
      })),
      computed: seoTextareas.map((textarea) => textarea ? ({
        minHeight: getComputedStyle(textarea).minHeight,
        fontSize: getComputedStyle(textarea).fontSize,
        inlineHeight: textarea.style.height,
      }) : null),
    },
    log,
    errors: window.__guruConsoleLog?.filter((entry) => entry.level === "error") || []
  };
})()`);

if (result.counts.siteAudit !== 19 || result.counts.productPages !== 2) {
  throw new Error(`Unexpected section counters: ${JSON.stringify(result)}`);
}
if (!result.siteTitles.includes("СПИСОК / КАТЕГОРИЯ") || result.productTitles.includes("СПИСОК / КАТЕГОРИЯ") || !result.productTitles.includes("СТРАНИЦА УСЛУГИ") || !result.productTitles.includes("КАРТОЧКА ТОВАРА")) {
  throw new Error(`Catalog page is in the wrong section: ${JSON.stringify(result)}`);
}
if (!(result.positions.home < result.positions.catalog && result.positions.catalog < result.positions.blog && result.positions.catalog < result.positions.about)) {
  throw new Error(`Catalog page has the wrong audit order: ${JSON.stringify(result)}`);
}
if (!result.data.sameCardReference || !result.data.sameRowJson || result.data.rowId !== "catalog-page-preserved" || result.data.url !== "Каталог" || result.data.comment !== "Существующий комментарий каталога") {
  throw new Error(`Catalog page data changed during relocation: ${JSON.stringify(result)}`);
}
if (result.statuses.hero !== "ready" || result.statuses.leadMagnet !== "ready" || result.statuses.seo !== "ready" || result.statuses.cwv !== "in_progress") {
  throw new Error(`Catalog page statuses were not preserved: ${JSON.stringify(result)}`);
}
if (!result.rendered.card || result.rendered.sectionTitle !== "Аудит сайта" || !result.rendered.sectionProgress.includes("из 19 блоков") || result.rendered.catalogContainsSelector) {
  throw new Error(`Catalog page rendering is not independent from product selection: ${JSON.stringify(result)}`);
}
if (
  result.seoUi.fieldCount !== 3 ||
  result.seoUi.columnCount !== 1 ||
  !result.seoUi.allTextareas ||
  Math.max(...result.seoUi.widths) - Math.min(...result.seoUi.widths) > 2 ||
  result.seoUi.values[0] !== "Дизайнерские подарки — каталог авторских работ" ||
  result.seoUi.values[1] !== "Каталог авторских подарков с понятной навигацией, описанием категорий и удобным выбором подходящей работы." ||
  result.seoUi.values[2] !== "авторские подарки, дизайнерские подарки" ||
  result.seoUi.heights.some((height) => height < 44)
) {
  throw new Error(`SEO snippet UI is not normalized: ${JSON.stringify(result)}`);
}
if (result.log?.counters?.before?.siteAudit !== 18 || result.log?.counters?.after?.siteAudit !== 19 || result.log?.counters?.before?.productPages !== 3 || result.log?.counters?.after?.productPages !== 2 || result.errors.length) {
  throw new Error(`Migration log or runtime diagnostics failed: ${JSON.stringify(result)}`);
}

console.log(JSON.stringify(result, null, 2));
socket.close();
