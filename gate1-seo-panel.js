/* ================================================================
   v2.3.147 — Gate 1: сводная SEO-панель.

   Это только read-only проекция существующих источников. Модуль не
   создаёт собственную модель, не мигрирует и не сохраняет данные:
   Компания читается из Аудита сайта, Яндекс Вебмастера, редиректов и
   Сравнения проектов; Продукт — из трёх уровней Фундамента, SEO-сниппета
   и продуктовой проверки Яндекс Вебмастера.
   ================================================================ */

const GATE1_SEO_PANEL_VERSION_V296 = "gate1-seo-panel-v296";
const GATE1_SEO_EXPLANATIONS_V297 = Object.freeze({
  "site-audit": "Служебные страницы — не формальность, а сигналы доверия: есть ли адрес, реквизиты, условия гарантии, кто автор материала. По ним и поисковик, и человек решают, можно ли верить сайту. Задача — закрыть эти страницы реальным содержанием, а не пустыми заглушками.",
  "webmaster-company": "Это то, как поисковик реально видит сайт прямо сейчас — не то, что настроено, а то, что проиндексировано и без ошибок. Даже идеальный сайт бесполезен, если робот не может его обойти. Задача — убедиться, что технических препятствий для индексации нет.",
  "canonical-redirects": "1. Вебмастер → Инструменты → Проверка ответа сервера.\n2. Введите домен сайта в поле «Основной домен».\n3. Система автоматически создаст четыре варианта: https, http, с www и без www.\n4. Для каждого варианта перенесите из Вебмастера HTTP-код и выберите результат: Ок или Ошибка.\n5. Эталон: основной https-адрес без www отдаёт 200; остальные варианты отдают 301 и ведут на него.",
  "project-comparison": "Раздел показывает, что уже есть у сайтов конкурентов, чтобы не изобретать заново. Как заполнить: добавь 3-5 главных конкурентов, отметь у каждого, какие блоки есть (отзывы, доставка, блог, гарантии). Эталон: минимум 3 конкурента разобраны, по каждому пункту видно да/нет. Как использовать: если блок есть почти у всех, а у нас нет, это повод его добавить.",
  "keyword-foundations": "Ядро SEO — реальные слова и фразы, которыми люди ищут именно этот товар, подтверждённые спросом, а не придуманные. От них строится всё остальное: заголовки, тексты, структура посадочной. Задача — знать точно, что ищут, прежде чем решать, что показывать.",
  "seo-snippet": "Title и Description — то, что человек видит в выдаче ДО перехода на сайт. Слабый сниппет теряет клик даже при хорошей позиции в поиске. Задача — сформулировать заголовок и описание так, чтобы из десяти результатов выбрали именно этот.",
  "webmaster-product": "Страница может быть идеально сделана и всё равно не приносить трафика — если её просто нет в индексе поисковика. Это последняя проверка перед тем, как считать SEO-работу над товаром завершённой. Задача — убедиться, что страницу видит не только человек, но и поисковик.",
});

function gate1SeoExplanationHtmlV297(key) {
  return g3ProductJourneyStageExplanationHtmlV296(
    key,
    "gate1-seo",
    GATE1_SEO_EXPLANATIONS_V297[key] || "",
  );
}

function gate1SeoTextV296(value) {
  return String(value ?? "").trim();
}

function gate1SeoCloneV296(value) {
  if (value === undefined) return undefined;
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch (error) {
      // JSON fallback ниже достаточен для хранимых моделей панели.
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return value;
  }
}

function gate1SeoStatusLabelV296(status) {
  return STATUS_LABELS[status] || status || STATUS_LABELS.not_started;
}

function gate1SeoCombinedStatusV296(statuses = []) {
  const values = statuses.filter(Boolean);
  if (!values.length || values.every((status) => status === "not_started"))
    return "not_started";
  if (values.some((status) => status === "problem")) return "problem";
  if (values.some((status) => status === "needs_review"))
    return "needs_review";
  if (values.every((status) => status === "ready")) return "ready";
  return "in_progress";
}

function gate1SeoCountStatusV296(total, confirmed = total) {
  const amount = Number(total) || 0;
  const approved = Number(confirmed) || 0;
  if (!amount) return "not_started";
  return approved >= amount ? "ready" : "in_progress";
}

function gate1SeoTargetAttrV296(target) {
  return target?.gateId
    ? ` data-g4-jump-target="${escapeAttr(JSON.stringify(target))}"`
    : " disabled";
}

function gate1SeoSourceButtonV296(source, target) {
  return `<button type="button" class="guru-strategic-source-v286"${gate1SeoTargetAttrV296(
    target,
  )}>← ${escapeHtml(source)}</button>`;
}

function gate1SeoDetailV296(label, value, empty = "не заполнено") {
  const text = gate1SeoTextV296(value);
  return `<span class="g1-seo-detail-v296${text ? "" : " is-empty"}"><small>${escapeHtml(
    label,
  )}</small><b>${escapeHtml(text || empty)}</b></span>`;
}

function gate1SeoStatusRowV296({
  key,
  label,
  summary,
  status = "not_started",
  source,
  target,
  details = "",
  explanation = GATE1_SEO_EXPLANATIONS_V297[key] || "",
}) {
  const hasValue = status !== "not_started";
  return `<article class="passport-v116-input guru-strategic-row-v286 g1-seo-row-v296 ${
    hasValue ? "is-filled" : "is-empty"
  }" data-g1-seo-item-v296="${escapeAttr(key)}">
    <div class="guru-strategic-row-copy-v286">
      <strong>${escapeHtml(label)}</strong>
      ${explanation ? g3ProductJourneyStageExplanationHtmlV296(key, "gate1-seo", explanation) : ""}
      <span>${escapeHtml(summary || "Не начато в источнике")}</span>
      ${details ? `<div class="g1-seo-details-v296">${details}</div>` : ""}
    </div>
    <div class="guru-strategic-row-meta-v286">
      <span class="status-pill status-${escapeAttr(status)}">${escapeHtml(
        gate1SeoStatusLabelV296(status),
      )}</span>
      ${gate1SeoSourceButtonV296(source, target)}
    </div>
  </article>`;
}

function gate1SeoSiteAuditV296() {
  const gate = state?.gates?.find((item) => item.id === "gate-1");
  const section = gate
    ? getGate1Sections(gate, gate.cards || []).find(
        (item) => item.key === "site_audit",
      )
    : null;
  const cards = section?.allInnerCards || [];
  const ready = cards.filter((card) => card.status === "ready").length;
  return {
    status: getSectionStatus(cards),
    ready,
    total: cards.length,
    target: { gateId: "gate-1", kind: "gate1-site-audit" },
  };
}

function gate1SeoWebmasterCompanyV296() {
  const store = gate1WebmasterStoreV295(state);
  const company = store?.company || {};
  const statuses = [
    gate1WebmasterVerificationStatusV295(state),
    gate1WebmasterSitemapStatusV295(state),
    gate1WebmasterRobotsStatusV295(state),
    gate1WebmasterErrorsStatusV295(state),
  ];
  const methodLabels = {
    meta_tag: "Мета-тег",
    file: "Файл",
    dns: "DNS",
  };
  const errors = gate1WebmasterErrorItemsV295(state);
  const rawLabel = (value) =>
    gate1SeoTextV296(value)
      ? guruStatusLabel(value)
      : "Не проверено";
  return {
    status: gate1SeoCombinedStatusV296(statuses),
    ready: statuses.filter((status) => status === "ready").length,
    total: statuses.length,
    details: [
      gate1SeoDetailV296(
        "Подтверждение",
        [methodLabels[company.verificationMethod], rawLabel(company.verificationStatus)]
          .filter(Boolean)
          .join(" · "),
        "не проверено",
      ),
      gate1SeoDetailV296(
        "Sitemap.xml",
        [company.sitemapUrl, rawLabel(company.sitemapStatus)]
          .filter(Boolean)
          .join(" · "),
        "не проверено",
      ),
      gate1SeoDetailV296("Robots.txt", rawLabel(company.robotsStatus), "не проверено"),
      gate1SeoDetailV296(
        "Ошибки обхода",
        errors.length
          ? `${errors.length} текущих`
          : company.crawlErrorsStatus
            ? `${rawLabel(company.crawlErrorsStatus)} · список пуст`
            : "",
        "не проверено",
      ),
    ].join(""),
    target: { gateId: "gate-1", kind: "gate1-webmaster-company" },
  };
}

function gate1SeoRedirectsV296() {
  const gate = state?.gates?.find((item) => item.id === "gate-1");
  const card = gate?.cards?.find(
    (item) =>
      normalizeGateTitle(item.title) ===
      normalizeGateTitle("Канонический URL и редиректы"),
  );
  if (!card) {
    return { status: "not_started", canonicalUrl: "", checked: 0, total: 0, target: null };
  }
  const copy = gate1SeoCloneV296(card);
  const status = redirectV130CardStatus(copy);
  const data = copy.redirectV130 || {};
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const checked = rows.filter((row) =>
    [row?.code, row?.result].some(gate1SeoTextV296),
  ).length;
  return {
    status,
    canonicalUrl: gate1SeoTextV296(data.canonicalUrl),
    checked,
    total: rows.length,
    target: { gateId: "gate-1", kind: "gate1-page", cardId: card.id },
  };
}

function gate1SeoComparisonV296() {
  const model = state?.projectComparison;
  if (!model || typeof model !== "object") {
    return { status: "not_started", filled: 0, total: 0, competitors: 0 };
  }
  const result = projectComparisonStatus(model);
  return {
    ...result,
    competitors: Array.isArray(model.competitors) ? model.competitors.length : 0,
  };
}

function gate1SeoKeywordCardV296({ title, value, items, source, target }) {
  let html = guruStrategicKeywordCardV249(
    { keywordFoundation: "", targets: { keywordFoundation: null } },
    {
      title,
      value,
      items,
      source,
      target,
      showItems: false,
      actionLabel: "Открыть источник",
    },
  );
  if (!html.includes("guru-strategic-card-source-v245")) {
    html = html.replace(
      /<\/(button|div)>\s*$/,
      `<small class="guru-strategic-card-source-v245">← ${escapeHtml(
        source,
      )}</small></$1>`,
    );
  }
  return html;
}

function gate1SeoProductFoundationsV296(product, snapshot) {
  const gate0 = guruV247KeywordFoundationStats(product, state);
  const rowCopy = snapshot.page.row
    ? gate1SeoCloneV296(snapshot.page.row)
    : null;
  const middle = rowCopy
    ? guruGate1MiddleStatsV257(rowCopy)
    : { record: null, keywords: [], total: 0, confirmed: 0, draft: 0 };
  const pain = guruGate1FinalPainContextV259(product, false);
  const finalEntries = guruStrategicFinalEntriesV286(pain?.itemData);
  const statuses = [
    gate1SeoCountStatusV296(gate0.total, gate0.confirmed),
    gate1SeoCountStatusV296(middle.total, middle.confirmed),
    finalEntries.length ? "ready" : "not_started",
  ];
  const gate0Target = {
    gateId: "gate-0",
    kind: "gate0-scoped",
    productId: product.id,
    field: "keyword_foundation",
    scope: "product",
    recordId: gate0.record?.id || "",
  };
  const middleTarget = g3ProductJourneyPageTarget(snapshot, {
    sectionKey: "productKeywordFoundationMiddleV257",
  });
  const finalTarget = pain
    ? {
        gateId: "gate-1",
        kind: "gate1-keywords",
        productId: product.id,
      }
    : null;
  return {
    status: gate1SeoCombinedStatusV296(statuses),
    levels: [
      {
        key: "gate0",
        total: gate0.total,
        confirmed: gate0.confirmed,
        html: gate1SeoKeywordCardV296({
          title: "Фундамент · исходный",
          value: `${gate0.confirmed}/${gate0.total} подтверждено`,
          items: gate0.record?.keywords || [],
          source: "Gate 0 · продукт",
          target: gate0Target,
        }),
      },
      {
        key: "middle",
        total: middle.total,
        confirmed: middle.confirmed,
        html: gate1SeoKeywordCardV296({
          title: "Фундамент · середина",
          value: `${middle.confirmed}/${middle.total} подтверждено`,
          items: middle.keywords,
          source: "Gate 1 · Карточка товара",
          target: middleTarget,
        }),
      },
      {
        key: "final",
        total: finalEntries.length,
        confirmed: finalEntries.length,
        html: gate1SeoKeywordCardV296({
          title: "Фундамент · Финальный",
          value: `${finalEntries.length} финальных фраз`,
          items: finalEntries,
          source: "Gate 1 · Финальный",
          target: finalTarget,
        }),
      },
    ],
  };
}

function gate1SeoSnippetV296(snapshot) {
  const row = snapshot?.page?.row || null;
  const context = row?.contextFields || {};
  const fields = [
    ["Title", row?.title],
    ["Description", row?.description],
    ["Ключевые слова", context.seoKeywords],
  ];
  const filled = fields.filter(([, value]) => gate1SeoTextV296(value)).length;
  return {
    status: !filled ? "not_started" : filled === fields.length ? "ready" : "in_progress",
    filled,
    total: fields.length,
    details: fields
      .map(([label, value]) => gate1SeoDetailV296(label, value))
      .join(""),
    target: snapshot
      ? g3ProductJourneyPageTarget(snapshot, { sectionKey: "seo_snippet" })
      : null,
  };
}

function gate1SeoWebmasterProductV296(product) {
  const values = product
    ? gate1WebmasterProductV295(product.id, state, false)
    : null;
  const indexed = values?.landingIndexed || "";
  return {
    status: indexed === "yes" ? "ready" : indexed === "no" ? "problem" : "not_started",
    value: indexed === "yes" ? "Да" : indexed === "no" ? "Нет" : "Не проверено",
    note: gate1SeoTextV296(values?.checkedNote),
    target: product
      ? {
          gateId: "gate-1",
          kind: "gate1-webmaster-product",
          productId: product.id,
        }
      : null,
  };
}

function gate1SeoCompanyHtmlV296() {
  const audit = gate1SeoSiteAuditV296();
  const webmaster = gate1SeoWebmasterCompanyV296();
  const redirects = gate1SeoRedirectsV296();
  const comparison = gate1SeoComparisonV296();
  return {
    statuses: [audit.status, webmaster.status, redirects.status, comparison.status],
    html: `<section class="g1-seo-scope-v296" data-g1-seo-scope-v296="company">
      <div class="g1-seo-scope-head-v296"><div><strong>Компания</strong><small>Один раз на проект · без выбора товара</small></div><span>Техническая основа и рынок</span></div>
      <div class="g1-seo-rows-v296">
        ${gate1SeoStatusRowV296({
          key: "site-audit",
          label: "Аудит сайта",
          summary: audit.total ? `${audit.ready}/${audit.total} блоков готово` : "Блоки аудита не найдены",
          status: audit.status,
          source: "Gate 1 · Аудит сайта",
          target: audit.target,
        })}
        ${gate1SeoStatusRowV296({
          key: "webmaster-company",
          label: "Яндекс Вебмастер",
          summary: `${webmaster.ready}/${webmaster.total} проверок готово`,
          status: webmaster.status,
          source: "Gate 1 · Яндекс Вебмастер",
          target: webmaster.target,
          details: webmaster.details,
        })}
        ${gate1SeoStatusRowV296({
          key: "canonical-redirects",
          label: "Канонический URL и редиректы",
          summary: redirects.canonicalUrl || "Канонический URL не указан",
          status: redirects.status,
          source: "Gate 1 · Канонический URL и редиректы",
          target: redirects.target,
          details: gate1SeoDetailV296(
            "Проверки вариантов",
            redirects.total ? `${redirects.checked}/${redirects.total} заполнено` : "",
          ),
        })}
        ${gate1SeoStatusRowV296({
          key: "project-comparison",
          label: "Сравнение проектов · Компания",
          summary: comparison.total
            ? `${comparison.filled}/${comparison.total} полей · ${comparison.competitors} конкурентов`
            : "Анализ конкурентов не начат",
          status: comparison.status,
          source: "Gate 1 · Сравнение проектов · Компания (данные Gate 0–1)",
          target: { gateId: "gate-1", kind: "gate1-project-comparison" },
        })}
      </div>
    </section>`,
  };
}

function gate1SeoProductEmptyHtmlV296() {
  const empty = (key, label, source) =>
    gate1SeoStatusRowV296({
      key,
      label,
      summary: "Сначала выберите товар в селекторе выше",
      status: "not_started",
      source,
      target: null,
    });
  return {
    statuses: ["not_started", "not_started", "not_started"],
    html: `<section class="g1-seo-scope-v296" data-g1-seo-scope-v296="product">
      <div class="g1-seo-scope-head-v296"><div><strong>Продукт</strong><small>Живой срез выбранного товара</small></div><span>Товар не выбран</span></div>
      <div class="g1-seo-rows-v296">
        ${empty("keyword-foundations", "Фундамент ключевых слов", "Gate 0–1 · три уровня")}
        ${empty("seo-snippet", "SEO-сниппет товара", "Gate 1 · Карточка товара")}
        ${empty("webmaster-product", "Яндекс Вебмастер · индексация посадочной", "Gate 1 · Яндекс Вебмастер")}
      </div>
    </section>`,
  };
}

function gate1SeoProductHtmlV296(product) {
  if (!product) return gate1SeoProductEmptyHtmlV296();
  const snapshot = g3ProductJourneySnapshot(product);
  const foundations = gate1SeoProductFoundationsV296(product, snapshot);
  const snippet = gate1SeoSnippetV296(snapshot);
  const webmaster = gate1SeoWebmasterProductV296(product);
  return {
    statuses: [foundations.status, snippet.status, webmaster.status],
    html: `<section class="g1-seo-scope-v296" data-g1-seo-scope-v296="product" data-g1-seo-product-id-v296="${escapeAttr(product.id)}">
      <div class="g1-seo-scope-head-v296"><div><strong>Продукт</strong><small>По выбранному товару в селекторе выше</small></div><span>${escapeHtml(product.name)}</span></div>
      <div class="g1-seo-rows-v296">
        <article class="passport-v116-input guru-strategic-row-v286 g1-seo-row-v296 g1-seo-foundations-v296 ${
          foundations.status === "not_started" ? "is-empty" : "is-filled"
        }" data-g1-seo-item-v296="keyword-foundations">
          <div class="g1-seo-foundations-head-v296"><strong>Фундамент ключевых слов</strong><span class="status-pill status-${escapeAttr(
            foundations.status,
          )}">${escapeHtml(gate1SeoStatusLabelV296(foundations.status))}</span></div>
          ${gate1SeoExplanationHtmlV297("keyword-foundations")}
          <div class="g1-seo-keyword-levels-v296">${foundations.levels
            .map((level) => level.html)
            .join("")}</div>
        </article>
        ${gate1SeoStatusRowV296({
          key: "seo-snippet",
          label: "SEO-сниппет товара",
          summary: `${snippet.filled}/${snippet.total} полей заполнено`,
          status: snippet.status,
          source: "Gate 1 · Карточка товара · SEO-сниппет",
          target: snippet.target,
          details: snippet.details,
        })}
        ${gate1SeoStatusRowV296({
          key: "webmaster-product",
          label: "Яндекс Вебмастер · индексация посадочной",
          summary: webmaster.value,
          status: webmaster.status,
          source: "Gate 1 · Яндекс Вебмастер",
          target: webmaster.target,
          details: gate1SeoDetailV296("Последняя проверка", webmaster.note, "дата и заметка не указаны"),
        })}
      </div>
    </section>`,
  };
}

function gate1SeoPanelHtmlV296() {
  const product = guruV194SelectedProduct(state);
  const company = gate1SeoCompanyHtmlV296();
  const productSection = gate1SeoProductHtmlV296(product);
  const statuses = [...company.statuses, ...productSection.statuses];
  const status = gate1SeoCombinedStatusV296(statuses);
  const ready = statuses.filter((value) => value === "ready").length;
  return `<section class="g1-section is-open g1-seo-panel-v296" data-g1-seo-panel-v296 data-g1-seo-selected-product-v296="${escapeAttr(
    product?.id || "",
  )}">
    <div class="g1-section-header g2-open-header g1-seo-panel-head-v296">
      <span class="g1-section-left"><span class="g1-section-title">SEO</span><span class="g1-section-progress">Живое чтение существующих источников · ${ready}/${statuses.length} пунктов готово</span></span>
      <span class="status-pill status-${escapeAttr(status)}">${escapeHtml(
        gate1SeoStatusLabelV296(status),
      )}</span>
    </div>
    <div class="g1-section-body g1-seo-panel-body-v296">
      ${company.html}
      ${productSection.html}
    </div>
  </section>`;
}

function gate1SeoCreatePanelV296() {
  const template = document.createElement("template");
  template.innerHTML = gate1SeoPanelHtmlV296().trim();
  return template.content.firstElementChild;
}

function gate1SeoInjectV296() {
  if (activeGateId !== "gate-1") return;
  const shell = els.contentArea?.querySelector?.(
    '[data-guru-product-context="gate1-product-pages"]',
  );
  const selector = shell?.querySelector?.(".gate0-product-context-v194");
  if (!selector || shell.querySelector("[data-g1-seo-panel-v296]")) return;
  const panel = gate1SeoCreatePanelV296();
  if (panel) selector.insertAdjacentElement("afterend", panel);
}

function gate1SeoRefreshV296() {
  if (activeGateId !== "gate-1") return;
  const current = els.contentArea?.querySelector?.("[data-g1-seo-panel-v296]");
  if (!current) return;
  const next = gate1SeoCreatePanelV296();
  if (next) current.replaceWith(next);
}

let gate1SeoRefreshQueuedV296 = false;
function gate1SeoQueueRefreshV296() {
  if (gate1SeoRefreshQueuedV296 || activeGateId !== "gate-1") return;
  gate1SeoRefreshQueuedV296 = true;
  queueMicrotask(() => {
    gate1SeoRefreshQueuedV296 = false;
    gate1SeoRefreshV296();
  });
}

const __gate1SeoPrevRenderGate1AccordionV296 = renderGate1Accordion;
renderGate1Accordion = function (gate, cards) {
  const result = __gate1SeoPrevRenderGate1AccordionV296.apply(this, arguments);
  gate1SeoInjectV296();
  return result;
};

document.addEventListener("input", gate1SeoQueueRefreshV296);
document.addEventListener("change", gate1SeoQueueRefreshV296);

const __gate1SeoPrevPrepareSourceV296 = g3ProductJourneyPrepareSource;
g3ProductJourneyPrepareSource = function (target) {
  __gate1SeoPrevPrepareSourceV296(target);
  if (!target) return;
  if (target.kind === "gate1-site-audit") {
    getGate1AccordionState().subblocks.site_audit = true;
  }
  if (target.kind === "gate1-webmaster-product" && target.productId) {
    const product = guruV194Product(target.productId, state);
    if (product) {
      const ui = guruV194Ui(state);
      ui.selectedCategoryId = gate1SeoTextV296(product.categoryId) || "__uncategorized__";
      ui.selectedProductId = product.id;
    }
  }
};

const __gate1SeoPrevFindSourceV296 = g3ProductJourneyFindSource;
g3ProductJourneyFindSource = function (target) {
  const previous = __gate1SeoPrevFindSourceV296(target);
  if (previous || !target) return previous;
  if (target.kind === "gate1-site-audit")
    return document.querySelector('[data-gate1-toggle-section="site_audit"]');
  if (target.kind === "gate1-webmaster-company")
    return document.querySelector('[data-g1-webmaster-scope-v295="company"]');
  if (target.kind === "gate1-webmaster-product")
    return document.querySelector(
      `[data-g1-webmaster-scope-v295="product"][data-g1-webmaster-product-id-v295="${CSS.escape(
        target.productId || "",
      )}"] [data-g1-webmaster-field="product_indexing"]`,
    );
  return null;
};

function gate1SeoAuditV296() {
  const product = guruV194SelectedProduct(state);
  const company = gate1SeoCompanyHtmlV296();
  const productSection = gate1SeoProductHtmlV296(product);
  return {
    version: GATE1_SEO_PANEL_VERSION_V296,
    storageCreated: false,
    selectedProductId: product?.id || "",
    companyStatuses: company.statuses,
    productStatuses: productSection.statuses,
    sources: {
      company: [
        "Gate 1 · Аудит сайта",
        "Gate 1 · Яндекс Вебмастер",
        "Gate 1 · Канонический URL и редиректы",
        "Gate 1 · Сравнение проектов · Компания (данные Gate 0–1)",
      ],
      product: [
        "Gate 0–1 · Фундамент ключевых слов",
        "Gate 1 · Карточка товара · SEO-сниппет",
        "Gate 1 · Яндекс Вебмастер",
      ],
    },
  };
}

if (typeof GURU_EXPORT_CODE_REFERENCES_V223 !== "undefined") {
  GURU_EXPORT_CODE_REFERENCES_V223["gate-1"]?.push?.({
    file: "gate1-seo-panel.js",
    symbol: "gate1SeoPanelHtmlV296",
    role: "read-only SEO projection over existing company and product sources",
  });
}

window.gate1SeoAuditV296 = gate1SeoAuditV296;
