/* ================================================================
   v2.3.95 — единый источник Яндекс Вебмастера в Gate 1 и
   продуктовая проверка цели Метрики в card-167.

   Gate 0 сохраняет прежнюю строку «Яндекс Вебмастер», но она теперь
   является только производной проекцией этой модели. Пять карточек
   Gate 2 читают пять разных проверок, а не один общий флаг.
   ================================================================ */

const GATE1_WEBMASTER_MODEL_V295 = "gate1-webmaster-v295";
const GATE1_WEBMASTER_CARD_ID_V295 = "gate1-webmaster-v295";
const GATE4_METRIKA_GOAL_ROW_KEY_V295 =
  "цель_метрики_срабатывает_на_конверсионном_действии_товара";

const GATE1_WEBMASTER_G2_FIELDS_V295 = Object.freeze({
  "card-107": Object.freeze({
    key: "verification",
    title: "Яндекс Вебмастер · подтверждение сайта",
    path: "state.gate1WebmasterV295.company.{verificationMethod,verificationStatus}",
  }),
  "card-108": Object.freeze({
    key: "sitemap",
    title: "Яндекс Вебмастер · sitemap.xml",
    path: "state.gate1WebmasterV295.company.{sitemapUrl,sitemapStatus}",
  }),
  "card-109": Object.freeze({
    key: "robots",
    title: "Яндекс Вебмастер · robots.txt",
    path: "state.gate1WebmasterV295.company.robotsStatus",
  }),
  "card-110": Object.freeze({
    key: "indexing_company",
    targetField: "product_indexing",
    title: "Яндекс Вебмастер · индексация страниц по товарам",
    path: "state.gate1WebmasterV295.byProduct[*].landingIndexed (company aggregate)",
  }),
  "card-111": Object.freeze({
    key: "crawl_errors",
    title: "Яндекс Вебмастер · ошибки обхода",
    path: "state.gate1WebmasterV295.company.{crawlErrorsStatus,crawlErrors}",
  }),
});

function gate1WebmasterStoreV295(workspace = state) {
  if (!workspace) return null;
  const current = workspace.gate1WebmasterV295;
  const store = current && typeof current === "object" && !Array.isArray(current)
    ? current
    : {};
  workspace.gate1WebmasterV295 = store;
  store.version = GATE1_WEBMASTER_MODEL_V295;
  store.company = store.company && typeof store.company === "object"
    ? store.company
    : {};
  store.byProduct = store.byProduct && typeof store.byProduct === "object" && !Array.isArray(store.byProduct)
    ? store.byProduct
    : {};

  const companyDefaults = {
    verificationMethod: "",
    verificationStatus: "",
    sitemapUrl: "",
    sitemapStatus: "",
    robotsStatus: "",
    crawlErrorsStatus: "",
    crawlErrors: "",
  };
  Object.entries(companyDefaults).forEach(([key, value]) => {
    if (store.company[key] === undefined) store.company[key] = value;
  });
  return store;
}

function gate1WebmasterProductV295(productId, workspace = state, create = true) {
  const store = gate1WebmasterStoreV295(workspace);
  const id = String(productId || "").trim();
  if (!store || !id) return null;
  if (!store.byProduct[id] && create) {
    store.byProduct[id] = { landingIndexed: "", checkedNote: "" };
  }
  const item = store.byProduct[id] || null;
  if (item && item.landingIndexed === undefined) item.landingIndexed = "";
  if (item && item.checkedNote === undefined) item.checkedNote = "";
  return item;
}

function gate1WebmasterProductsV295(workspace = state) {
  if (!workspace) return [];
  if (typeof guruV194Products === "function") return guruV194Products(workspace);
  return [];
}

function gate1WebmasterStatusFromGuruV295(rawStatus) {
  const status = guruCanonStatus(rawStatus);
  if (!status) return "not_started";
  if (guruStatusIsBad(status)) return "problem";
  if (guruStatusIsOk(status)) return "ready";
  return "in_progress";
}

function gate1WebmasterVerificationStatusV295(workspace = state) {
  const company = gate1WebmasterStoreV295(workspace)?.company || {};
  const status = gate1WebmasterStatusFromGuruV295(company.verificationStatus);
  if (status === "ready" && !String(company.verificationMethod || "").trim())
    return "in_progress";
  return status;
}

function gate1WebmasterSitemapStatusV295(workspace = state) {
  const company = gate1WebmasterStoreV295(workspace)?.company || {};
  const status = gate1WebmasterStatusFromGuruV295(company.sitemapStatus);
  if (status === "ready" && !String(company.sitemapUrl || "").trim())
    return "in_progress";
  if (status === "not_started" && String(company.sitemapUrl || "").trim())
    return "in_progress";
  return status;
}

function gate1WebmasterRobotsStatusV295(workspace = state) {
  return gate1WebmasterStatusFromGuruV295(
    gate1WebmasterStoreV295(workspace)?.company?.robotsStatus,
  );
}

function gate1WebmasterErrorsStatusV295(workspace = state) {
  const company = gate1WebmasterStoreV295(workspace)?.company || {};
  if (String(company.crawlErrors || "").trim()) return "problem";
  return gate1WebmasterStatusFromGuruV295(company.crawlErrorsStatus);
}

function gate1WebmasterIndexAggregateV295(workspace = state) {
  const products = gate1WebmasterProductsV295(workspace);
  const items = products.map((product) => ({
    product_id: product.id,
    name: product.name,
    value:
      gate1WebmasterProductV295(product.id, workspace, false)?.landingIndexed ||
      "",
  }));
  const yes = items.filter((item) => item.value === "yes").length;
  const no = items.filter((item) => item.value === "no").length;
  const unchecked = items.length - yes - no;
  const status = no
    ? "problem"
    : items.length && yes === items.length
      ? "ready"
      : yes
        ? "in_progress"
        : "not_started";
  return {
    status,
    total: items.length,
    yes,
    no,
    unchecked,
    items,
    label: `${yes} из ${items.length} посадочных товаров проиндексировано`,
  };
}

function gate1WebmasterFieldStatusV295(fieldKey, workspace = state) {
  if (fieldKey === "verification")
    return gate1WebmasterVerificationStatusV295(workspace);
  if (fieldKey === "sitemap") return gate1WebmasterSitemapStatusV295(workspace);
  if (fieldKey === "robots") return gate1WebmasterRobotsStatusV295(workspace);
  if (fieldKey === "indexing_company")
    return gate1WebmasterIndexAggregateV295(workspace).status;
  if (fieldKey === "crawl_errors")
    return gate1WebmasterErrorsStatusV295(workspace);
  return "not_started";
}

function gate1WebmasterOverallV295(workspace = state) {
  const statuses = [
    "verification",
    "sitemap",
    "robots",
    "indexing_company",
    "crawl_errors",
  ].map((key) => gate1WebmasterFieldStatusV295(key, workspace));
  const readiness = statuses.some((status) => status === "problem")
    ? "problem"
    : statuses.length && statuses.every((status) => status === "ready")
      ? "ready"
      : statuses.some((status) => status !== "not_started")
        ? "in_progress"
        : "not_started";
  const infraStatus = readiness === "ready"
    ? "works"
    : readiness === "problem"
      ? "broken"
      : readiness === "in_progress"
        ? "needs_improvement"
        : "";
  return { readiness, infraStatus, statuses };
}

function gate1WebmasterDerivedCommentV295(workspace = state) {
  const store = gate1WebmasterStoreV295(workspace);
  const aggregate = gate1WebmasterIndexAggregateV295(workspace);
  const errors = String(store?.company?.crawlErrors || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean).length;
  return `Gate 1 · Яндекс Вебмастер: ${aggregate.label}; текущих ошибок: ${errors}`;
}

function gate1WebmasterApplyDerivedGate0V295(workspace, mega) {
  const store = gate1WebmasterStoreV295(workspace);
  const row = mega?.infra?.find((item) => item?.name === "Яндекс Вебмастер");
  if (!store || !row) return null;
  if (!Object.prototype.hasOwnProperty.call(store, "legacyGate0Flag")) {
    store.legacyGate0Flag = {
      status: row.status || "",
      comment: row.comment || "",
      capturedAt: new Date().toISOString(),
    };
  }
  const overall = gate1WebmasterOverallV295(workspace);
  row.status = overall.infraStatus;
  row.comment = gate1WebmasterDerivedCommentV295(workspace);
  row._derivedFromGate1WebmasterV295 = true;
  return row;
}

const __gate1WebmasterPrevEnsureMegaMarketingV295 = ensureMegaMarketing;
ensureMegaMarketing = function (card, workspace = state) {
  const mega = __gate1WebmasterPrevEnsureMegaMarketingV295.apply(this, arguments);
  if (mega) gate1WebmasterApplyDerivedGate0V295(workspace, mega);
  return mega;
};

const __gate1WebmasterPrevMegaInfraSectionHtmlV295 = megaInfraSectionHtml;
megaInfraSectionHtml = function (cardId, items) {
  const html = __gate1WebmasterPrevMegaInfraSectionHtmlV295.apply(this, arguments);
  const index = (items || []).findIndex((item) => item?.name === "Яндекс Вебмастер");
  if (index < 0 || typeof document === "undefined") return html;
  const template = document.createElement("template");
  template.innerHTML = html;
  const statusSelect = template.content.querySelector(
    `[data-mega-section="infra"][data-mega-idx="${index}"][data-mega-field="status"]`,
  );
  const row = statusSelect?.closest("tr");
  if (!row) return html;
  const overall = gate1WebmasterOverallV295(state);
  const statusCell = statusSelect.closest("td");
  const commentInput = row.querySelector(
    `[data-mega-section="infra"][data-mega-idx="${index}"][data-mega-field="comment"]`,
  );
  if (statusCell) {
    statusCell.innerHTML = `<span class="status-pill status-${escapeAttr(overall.readiness)}">${escapeHtml(
      overall.readiness === "not_started"
        ? "Не начато"
        : guruStatusLabel(overall.infraStatus),
    )}</span><small class="g1-webmaster-derived-note-v295">автоматически из Gate 1</small>`;
  }
  const commentCell = commentInput?.closest("td");
  if (commentCell) {
    commentCell.innerHTML = `<button type="button" class="g1-webmaster-source-link-v295" data-g1-webmaster-open-v295="company">← Открыть источник в Gate 1 · Яндекс Вебмастер</button>`;
  }
  row.dataset.g1WebmasterDerivedV295 = "1";
  return template.innerHTML;
};

function gate1WebmasterStatusOptionsV295(current) {
  const canon = guruCanonStatus(current);
  const options = [
    ["", "Не проверено"],
    ["works", "Работает"],
    ["needs_improvement", "Требует улучшения"],
    ["broken", "Не работает"],
    ["missing", "Отсутствует"],
    ["not_needed", "Не требуется"],
  ];
  return options
    .map(
      ([value, label]) =>
        `<option value="${escapeAttr(value)}" ${canon === value ? "selected" : ""}>${escapeHtml(label)}</option>`,
    )
    .join("");
}

function gate1WebmasterPillV295(status) {
  return `<span class="status-pill status-${escapeAttr(status)}">${escapeHtml(
    STATUS_LABELS[status] || status,
  )}</span>`;
}

function gate1WebmasterErrorItemsV295(workspace = state) {
  return String(
    gate1WebmasterStoreV295(workspace)?.company?.crawlErrors || "",
  )
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function gate1WebmasterPluralV295(value, one, few, many) {
  const amount = Math.abs(Number(value) || 0) % 100;
  const units = amount % 10;
  if (amount > 10 && amount < 20) return many;
  if (units === 1) return one;
  if (units >= 2 && units <= 4) return few;
  return many;
}

function gate1WebmasterErrorsListHtmlV295(workspace = state) {
  const items = gate1WebmasterErrorItemsV295(workspace);
  return `<div class="g1-webmaster-errors-list-v295${items.length ? " has-errors" : " is-empty"}" data-g1-webmaster-errors-list-v295 aria-live="polite">
    <div class="g1-webmaster-errors-list-head-v295"><strong>Текущий перечень</strong><span>${items.length ? `${items.length} ${gate1WebmasterPluralV295(items.length, "ошибка", "ошибки", "ошибок")}` : "Ошибок нет"}</span></div>
    ${items.length
      ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : `<p>Список пуст — текущие ошибки обхода не зафиксированы.</p>`}
  </div>`;
}

function gate1WebmasterCompanyHtmlV295() {
  const company = gate1WebmasterStoreV295(state)?.company || {};
  const overall = gate1WebmasterOverallV295(state);
  return `<section class="g1-section is-open g1-webmaster-block-v295" data-g1-webmaster-scope-v295="company">
    <div class="g1-section-header g2-open-header">
      <span class="g1-section-left">
        <span class="g1-section-title">Яндекс Вебмастер</span>
        <span class="g1-section-progress">Компания · единый источник для Gate 0 и Gate 2</span>
      </span>
      ${gate1WebmasterPillV295(overall.readiness)}
    </div>
    <div class="g1-section-body g1-webmaster-body-v295">
      <div class="g1-webmaster-check-v295" data-g1-webmaster-field="verification">
        <div class="g1-webmaster-check-head-v295"><strong>Подтверждение сайта</strong>${gate1WebmasterPillV295(gate1WebmasterVerificationStatusV295(state))}</div>
        <div class="g1-webmaster-fields-v295">
          <label><span>Способ подтверждения</span><select class="passport-v116-input" data-g1-webmaster-company-v295="verificationMethod">
            <option value="" ${!company.verificationMethod ? "selected" : ""}>Не указан</option>
            <option value="meta_tag" ${company.verificationMethod === "meta_tag" ? "selected" : ""}>Мета-тег</option>
            <option value="file" ${company.verificationMethod === "file" ? "selected" : ""}>Файл</option>
            <option value="dns" ${company.verificationMethod === "dns" ? "selected" : ""}>DNS</option>
          </select></label>
          <label><span>Статус</span><select class="passport-v116-input" data-g1-webmaster-company-v295="verificationStatus">${gate1WebmasterStatusOptionsV295(company.verificationStatus)}</select></label>
        </div>
      </div>
      <div class="g1-webmaster-check-v295" data-g1-webmaster-field="sitemap">
        <div class="g1-webmaster-check-head-v295"><strong>Sitemap.xml</strong>${gate1WebmasterPillV295(gate1WebmasterSitemapStatusV295(state))}</div>
        <div class="g1-webmaster-fields-v295">
          <label><span>Реальный URL</span><input class="passport-v116-input" type="url" data-g1-webmaster-company-v295="sitemapUrl" value="${escapeAttr(company.sitemapUrl || "")}" placeholder="https://site.ru/sitemap.xml" /></label>
          <label><span>Статус</span><select class="passport-v116-input" data-g1-webmaster-company-v295="sitemapStatus">${gate1WebmasterStatusOptionsV295(company.sitemapStatus)}</select></label>
        </div>
      </div>
      <div class="g1-webmaster-check-v295" data-g1-webmaster-field="robots">
        <div class="g1-webmaster-check-head-v295"><strong>Robots.txt</strong>${gate1WebmasterPillV295(gate1WebmasterRobotsStatusV295(state))}</div>
        <label><span>Статус</span><select class="passport-v116-input" data-g1-webmaster-company-v295="robotsStatus">${gate1WebmasterStatusOptionsV295(company.robotsStatus)}</select></label>
      </div>
      <div class="g1-webmaster-check-v295" data-g1-webmaster-field="crawl_errors">
        <div class="g1-webmaster-check-head-v295"><strong>Ошибки обхода</strong>${gate1WebmasterPillV295(gate1WebmasterErrorsStatusV295(state))}</div>
        <label><span>Результат диагностики</span><select class="passport-v116-input" data-g1-webmaster-company-v295="crawlErrorsStatus">${gate1WebmasterStatusOptionsV295(company.crawlErrorsStatus)}</select></label>
        <label><span>Текущие ошибки — по одной на строку</span><textarea class="passport-v116-input" rows="4" data-g1-webmaster-company-v295="crawlErrors" placeholder="Список может быть пустым, если ошибок нет">${escapeHtml(company.crawlErrors || "")}</textarea></label>
        ${gate1WebmasterErrorsListHtmlV295(state)}
      </div>
    </div>
  </section>`;
}

function gate1WebmasterProductHtmlV295() {
  const product = guruV194SelectedProduct(state);
  if (!product) {
    return `<section class="g1-section is-open g1-webmaster-block-v295" data-g1-webmaster-scope-v295="product"><div class="g1-empty">Выберите продукт, чтобы проверить индексацию его посадочной.</div></section>`;
  }
  const values = gate1WebmasterProductV295(product.id, state, true);
  const page = typeof g3ProductJourneyPageSource === "function"
    ? g3ProductJourneyPageSource(product)
    : null;
  const landingUrl = megaPlatformProductUrl(product, state);
  const status = values.landingIndexed === "yes"
    ? "ready"
    : values.landingIndexed === "no"
      ? "problem"
      : "not_started";
  return `<section class="g1-section is-open g1-webmaster-block-v295" data-g1-webmaster-scope-v295="product" data-g1-webmaster-product-id-v295="${escapeAttr(product.id)}">
    <div class="g1-section-header g2-open-header">
      <span class="g1-section-left">
        <span class="g1-section-title">Яндекс Вебмастер · Продукт/Услуга</span>
        <span class="g1-section-progress">Продукт · ${escapeHtml(product.name)}</span>
      </span>
      ${gate1WebmasterPillV295(status)}
    </div>
    <div class="g1-section-body g1-webmaster-body-v295">
      <div class="g1-webmaster-check-v295" data-g1-webmaster-field="product_indexing">
        <div class="g1-webmaster-check-head-v295"><strong>Проиндексирована ли посадочная этого товара / услуги</strong>${gate1WebmasterPillV295(status)}</div>
        <div class="g1-webmaster-fields-v295">
          <label class="g1-webmaster-product-url-v365"><span>URL выбранного продукта / услуги</span><span class="mega-platform-source-value" data-g1-webmaster-selected-url-v365>${escapeHtml(landingUrl || "URL не указан")}</span><small>из Платформы</small></label>
          <label><span>Результат</span><select class="passport-v116-input" data-g1-webmaster-product-v295="landingIndexed">
            <option value="" ${!values.landingIndexed ? "selected" : ""}>Не проверено</option>
            <option value="yes" ${values.landingIndexed === "yes" ? "selected" : ""}>Да</option>
            <option value="no" ${values.landingIndexed === "no" ? "selected" : ""}>Нет</option>
          </select></label>
          <label><span>Когда и что проверялось</span><input class="passport-v116-input" data-g1-webmaster-product-v295="checkedNote" value="${escapeAttr(values.checkedNote || "")}" placeholder="Например: 07.09.2026 · URL проверен в Вебмастере" /></label>
        </div>
      </div>
    </div>
  </section>`;
}

function gate1WebmasterInjectV295() {
  if (activeGateId !== "gate-1") return;
  const root = els.contentArea?.querySelector?.(".g1-redesign");
  if (!root) return;
  const companyHead = [...root.querySelectorAll(".gate0-section-heading")].find(
    (node) => node.querySelector(".gate0-section-heading-title")?.textContent?.trim() === "Компания",
  );
  if (companyHead && !root.querySelector('[data-g1-webmaster-scope-v295="company"]'))
    companyHead.insertAdjacentHTML("afterend", gate1WebmasterCompanyHtmlV295());

  const productShell = root.querySelector(
    '[data-guru-product-context="gate1-product-pages"]',
  );
  const productContext = productShell?.querySelector(".gate0-product-context-v194");
  if (productContext && !productShell.querySelector('[data-g1-webmaster-scope-v295="product"]'))
    productContext.insertAdjacentHTML("afterend", gate1WebmasterProductHtmlV295());
}

const __gate1WebmasterPrevRenderGate1AccordionV295 = renderGate1Accordion;
renderGate1Accordion = function (gate, cards) {
  const result = __gate1WebmasterPrevRenderGate1AccordionV295.apply(this, arguments);
  gate1WebmasterInjectV295();
  return result;
};

function gate1WebmasterG2ConfigV295(card) {
  return GATE1_WEBMASTER_G2_FIELDS_V295[card?.id] || null;
}

function gate1WebmasterG2SourceV295(card, workspace = state) {
  const config = gate1WebmasterG2ConfigV295(card);
  if (!config) return null;
  const result = gate1WebmasterFieldStatusV295(config.key, workspace);
  return {
    key: "G1",
    sourceType: "gate1_webmaster_field",
    gateId: "gate-1",
    cardId: GATE1_WEBMASTER_CARD_ID_V295,
    itemId: config.targetField || config.key,
    path: config.path,
    title: config.title,
    rawStatus: result,
    canonicalSourceStatus: result,
    normalizedStatus: result,
    readinessNormalizedStatus: result,
    statusLabel: STATUS_LABELS[result] || result,
    found: true,
    consulted: true,
    participatesInFinalStatus: true,
    decision: "selected",
    result,
    lookup: { kind: "stable_field_key", value: config.key },
  };
}

const __gate1WebmasterPrevG2SyncInfoV295 = g2SyncInfo;
g2SyncInfo = function (card) {
  const source = gate1WebmasterG2SourceV295(card, state);
  if (source) return { g0: null, source: { ...source, gate: "Gate 1", status: source.result }, g4: null };
  return __gate1WebmasterPrevG2SyncInfoV295.apply(this, arguments);
};

const __gate1WebmasterPrevG2CardStatusV295 = g2CardStatus;
g2CardStatus = function (card) {
  const source = gate1WebmasterG2SourceV295(card, state);
  return source ? source.result : __gate1WebmasterPrevG2CardStatusV295.apply(this, arguments);
};

const __gate1WebmasterPrevG2ResolvedSourceV295 = g2ResolvedSourceV267;
g2ResolvedSourceV267 = function (card) {
  return gate1WebmasterG2SourceV295(card, state) ||
    __gate1WebmasterPrevG2ResolvedSourceV295.apply(this, arguments);
};

const __gate1WebmasterPrevG2PrepareSourceV295 = g2PrepareSourceV267;
g2PrepareSourceV267 = function (source) {
  if (source?.cardId === GATE1_WEBMASTER_CARD_ID_V295) {
    if (els.searchInput) els.searchInput.value = "";
    if (els.statusFilter) els.statusFilter.value = "all";
    if (source.itemId === "product_indexing") {
      const aggregate = gate1WebmasterIndexAggregateV295(state);
      const currentProduct = guruV194SelectedProduct(state);
      const target = aggregate.items.find((item) => item.value === "no") ||
        aggregate.items.find((item) => !item.value) ||
        aggregate.items.find((item) => item.product_id === currentProduct?.id) ||
        aggregate.items[0];
      const product = target
        ? gate1WebmasterProductsV295(state).find(
            (item) => item.id === target.product_id,
          )
        : null;
      if (product) {
        const ui = guruV194Ui(state);
        ui.selectedCategoryId = product.categoryId || "__uncategorized__";
        ui.selectedProductId = product.id;
      }
    }
    return;
  }
  return __gate1WebmasterPrevG2PrepareSourceV295.apply(this, arguments);
};

const __gate1WebmasterPrevG2FindSourceNodeV295 = g2FindSourceNodeV267;
g2FindSourceNodeV267 = function (source) {
  if (source?.cardId === GATE1_WEBMASTER_CARD_ID_V295) {
    return document.querySelector(
      `[data-g1-webmaster-field="${CSS.escape(String(source.itemId || ""))}"]`,
    );
  }
  return __gate1WebmasterPrevG2FindSourceNodeV295.apply(this, arguments);
};

const __gate1WebmasterPrevGate2DiagnosticV295 =
  guruExportGate2CardDiagnosticV223;
guruExportGate2CardDiagnosticV223 = function (card, rawStatus) {
  const diagnostic = __gate1WebmasterPrevGate2DiagnosticV295.apply(this, arguments);
  const source = gate1WebmasterG2SourceV295(card, state);
  if (!source || !diagnostic) return diagnostic;
  diagnostic.resolver = {
    name: "gate1_webmaster_v295",
    codeAnchor: "gate1-webmaster-qa.js:gate1WebmasterG2SourceV295",
  };
  diagnostic.fallbackOrder = ["G1"];
  diagnostic.fallbackExpression = "G1: конкретное поле Gate 1 · Яндекс Вебмастер";
  diagnostic.sourceChain = [source];
  diagnostic.selectedSource = source;
  diagnostic.recalculatedStatus = source.result;
  diagnostic.readinessStatus = source.result;
  diagnostic.readinessNormalizedStatus = source.result;
  diagnostic.displayedStatus = source.result;
  diagnostic.statusLabel = STATUS_LABELS[source.result] || source.result;
  diagnostic.result = source.result;
  diagnostic.warnings = (diagnostic.warnings || []).filter(
    (warning) => !/status pill|stored\/recalculated/i.test(String(warning)),
  );
  return diagnostic;
};

function gate1WebmasterEnsureCard167V295(workspace = state) {
  const card = workspace?.gates
    ?.find((gate) => gate.id === "gate-4")
    ?.cards?.find((item) => item.id === "card-167");
  if (!card) return null;
  card.instructionRows = Array.isArray(card.instructionRows)
    ? card.instructionRows
    : inferInstructionRows(card);
  let row = card.instructionRows.find(
    (item) =>
      item?.key === GATE4_METRIKA_GOAL_ROW_KEY_V295 ||
      /цель\s+метрики\s+срабатывает/i.test(String(item?.element || "")),
  );
  if (!row) {
    row = {
      id: "card-167-metrika-goal-v295",
      key: GATE4_METRIKA_GOAL_ROW_KEY_V295,
      element: "Цель Метрики срабатывает на конверсионном действии товара",
      tool: "Яндекс Метрика",
      serviceUrl: "https://metrika.yandex.ru/",
      serviceLabel: "Яндекс Метрика",
      statusKind: "works",
      status: "",
      result: "",
      link: "",
      comment: "",
    };
    card.instructionRows.push(row);
  } else {
    row.key = GATE4_METRIKA_GOAL_ROW_KEY_V295;
    row.element = "Цель Метрики срабатывает на конверсионном действии товара";
    row.tool = row.tool || "Яндекс Метрика";
    row.serviceUrl = row.serviceUrl || "https://metrika.yandex.ru/";
    row.serviceLabel = row.serviceLabel || "Яндекс Метрика";
  }
  return row;
}

const __gate1WebmasterPrevReadinessRowsV295 = g4ReadinessTemplateRowsV225;
g4ReadinessTemplateRowsV225 = function (card) {
  if (card?.id === "card-167") gate1WebmasterEnsureCard167V295(state);
  return __gate1WebmasterPrevReadinessRowsV295.apply(this, arguments);
};

function gate1WebmasterMetrikaGoalStatusOptionsV295(current) {
  const canon = guruCanonStatus(current);
  return [
    ["", "Не проверено"],
    ["works", "Работает"],
    ["broken", "Не работает"],
  ].map(([value, label]) =>
    `<option value="${escapeAttr(value)}" ${canon === value ? "selected" : ""}>${escapeHtml(label)}</option>`,
  ).join("");
}

const __gate1WebmasterPrevFunnelManualRowV295 =
  g4FunnelManualRowHtmlV294;
g4FunnelManualRowHtmlV294 = function (card, row, product) {
  if (
    card?.id !== "card-167" ||
    row?.key !== GATE4_METRIKA_GOAL_ROW_KEY_V295
  ) return __gate1WebmasterPrevFunnelManualRowV295.apply(this, arguments);
  const values =
    g4ReadinessProductRowV225(product.id, card.id, row.key, state) || {};
  const attrs = `data-g4-readiness-product-id="${escapeAttr(product.id)}" data-g4-readiness-card-id="${escapeAttr(card.id)}" data-g4-readiness-row-key="${escapeAttr(row.key)}"`;
  return `<tr class="g4-funnel-readiness-row-v294 is-manual g4-metrika-goal-qa-v295" data-g4-readiness-row-key-view="${escapeAttr(row.key)}" data-g4-funnel-row-mode-v294="manual">
    <td data-label="Элемент"><strong>${escapeHtml(row.element)}</strong><small class="g4-readiness-method-hint">Проверка относится только к выбранному товару.</small></td>
    <td data-label="Сервис">${g4ReadinessServiceHtmlV225(row)}</td>
    <td data-label="Ссылка / отчёт"><input ${attrs} data-g4-readiness-row-field="link" value="${escapeAttr(values.link || "")}" placeholder="ссылка на проверку, если есть" /></td>
    <td data-label="Статус"><select ${attrs} data-g4-readiness-row-field="status">${gate1WebmasterMetrikaGoalStatusOptionsV295(values.status || "")}</select></td>
    <td data-label="Какая цель проверялась"><input ${attrs} data-g4-readiness-row-field="result" value="${escapeAttr(values.result || "")}" placeholder="ID или название цели" /></td>
    <td data-label="Комментарий"><input ${attrs} data-g4-readiness-row-field="comment" value="${escapeAttr(values.comment || "")}" placeholder="как проверяли конверсионное действие" /></td>
  </tr>`;
};

function gate1WebmasterMigrationV295(workspace = state) {
  if (!workspace?.project) return null;
  const store = gate1WebmasterStoreV295(workspace);
  const card167Row = gate1WebmasterEnsureCard167V295(workspace);
  const gate0Card = workspace.gates
    ?.find((gate) => gate.id === "gate-0")
    ?.cards?.find(isMegaMarketingCard);
  if (gate0Card) ensureMegaMarketing(gate0Card, workspace);

  const logs = workspace.project._gate1WebmasterMigrationLogV295 =
    Array.isArray(workspace.project._gate1WebmasterMigrationLogV295)
      ? workspace.project._gate1WebmasterMigrationLogV295
      : [];
  let entry = logs.find((item) => item.id === GATE1_WEBMASTER_MODEL_V295);
  if (!entry) {
    entry = {
      id: GATE1_WEBMASTER_MODEL_V295,
      at: new Date().toISOString(),
      status: "completed",
      sourceOfTruth: "state.gate1WebmasterV295",
      previousReaders: [
        "Gate 2 card-107 → Gate 0 megaMarketing.infra[Яндекс Вебмастер]",
        "Gate 2 card-108 → legacy Gate 1 Sitemap.xml card",
        "Gate 2 card-109 → legacy Gate 1 Robots.txt card",
        "Gate 2 card-110/card-111 → без отдельного точного источника",
        "Gate 0 infrastructure renderer/export → общий infra-row",
      ],
      newReaders: Object.entries(GATE1_WEBMASTER_G2_FIELDS_V295).map(
        ([cardId, config]) => `${cardId} → ${config.key}`,
      ),
      gate0Projection: "megaMarketing.infra[Яндекс Вебмастер] · read-only derived",
      gate4Added: card167Row
        ? `card-167.rows[${GATE4_METRIKA_GOAL_ROW_KEY_V295}] · per product_id`
        : "card-167 not found",
      yandexMetrikaGate0Changed: false,
    };
    logs.push(entry);
  }
  return { store, entry, card167Row };
}

const __gate1WebmasterPrevPrepareSystemCardsV295 = prepareSystemCards;
prepareSystemCards = function (workspace) {
  __gate1WebmasterPrevPrepareSystemCardsV295(workspace);
  gate1WebmasterMigrationV295(workspace);
};

const __gate1WebmasterPrevMigrateWorkspaceV295 = migrateWorkspace;
migrateWorkspace = function (workspace, projectId) {
  const migrated = __gate1WebmasterPrevMigrateWorkspaceV295(workspace, projectId);
  gate1WebmasterMigrationV295(migrated);
  return migrated;
};

const __gate1WebmasterPrevCreateFreshWorkspaceV295 = createFreshWorkspace;
createFreshWorkspace = function (meta) {
  const workspace = __gate1WebmasterPrevCreateFreshWorkspaceV295(meta);
  gate1WebmasterMigrationV295(workspace);
  return workspace;
};

function gate1WebmasterAuditV295(workspace = state) {
  const card167 = workspace?.gates
    ?.find((gate) => gate.id === "gate-4")
    ?.cards?.find((card) => card.id === "card-167");
  const gate0Card = workspace?.gates
    ?.find((gate) => gate.id === "gate-0")
    ?.cards?.find(isMegaMarketingCard);
  if (gate0Card) ensureMegaMarketing(gate0Card, workspace);
  const gate0Webmaster = gate0Card?.megaMarketing?.infra?.find(
    (row) => row.name === "Яндекс Вебмастер",
  );
  const gate0Metrika = gate0Card?.megaMarketing?.infra?.find(
    (row) => row.name === "Яндекс Метрика",
  );
  return {
    model: GATE1_WEBMASTER_MODEL_V295,
    company: { ...gate1WebmasterStoreV295(workspace)?.company },
    indexing: gate1WebmasterIndexAggregateV295(workspace),
    gate0Webmaster: gate0Webmaster ? { ...gate0Webmaster } : null,
    gate0Metrika: gate0Metrika ? { ...gate0Metrika } : null,
    gate2: Object.entries(GATE1_WEBMASTER_G2_FIELDS_V295).map(
      ([cardId, config]) => ({
        cardId,
        field: config.key,
        status: gate1WebmasterFieldStatusV295(config.key, workspace),
        sourcePath: config.path,
      }),
    ),
    card167: {
      rowCount: g4ReadinessTemplateRowsV225(card167).length,
      metrikaGoalRows: g4ReadinessTemplateRowsV225(card167).filter(
        (row) => row.key === GATE4_METRIKA_GOAL_ROW_KEY_V295,
      ).length,
      storage:
        "state.gate4Production.readinessV225.byProduct[product_id][card-167].rows[row_key]",
    },
  };
}

function gate1WebmasterUpdateDerivedV295() {
  const gate0Card = state?.gates
    ?.find((gate) => gate.id === "gate-0")
    ?.cards?.find(isMegaMarketingCard);
  if (gate0Card) ensureMegaMarketing(gate0Card, state);
}

document.addEventListener("input", (event) => {
  const companyInput = event.target?.closest?.("[data-g1-webmaster-company-v295]");
  const productInput = event.target?.closest?.("[data-g1-webmaster-product-v295]");
  if (!companyInput && !productInput) return;
  if (companyInput) {
    const fieldKey = companyInput.dataset.g1WebmasterCompanyV295;
    gate1WebmasterStoreV295(state).company[fieldKey] = companyInput.value;
    if (fieldKey === "crawlErrors") {
      const currentList = companyInput
        .closest('[data-g1-webmaster-field="crawl_errors"]')
        ?.querySelector("[data-g1-webmaster-errors-list-v295]");
      if (currentList)
        currentList.outerHTML = gate1WebmasterErrorsListHtmlV295(state);
    }
  } else {
    const holder = productInput.closest("[data-g1-webmaster-product-id-v295]");
    const values = gate1WebmasterProductV295(
      holder?.dataset.g1WebmasterProductIdV295,
      state,
      true,
    );
    if (values)
      values[productInput.dataset.g1WebmasterProductV295] = productInput.value;
  }
  gate1WebmasterUpdateDerivedV295();
  guruPersistStateFast({ durable: true });
});

document.addEventListener("change", (event) => {
  const field = event.target?.closest?.(
    "[data-g1-webmaster-company-v295], [data-g1-webmaster-product-v295]",
  );
  if (!field) return;
  gate1WebmasterUpdateDerivedV295();
  guruPersistStateFast({ durable: true });
  guruInvalidateGateViewCache();
  renderGate();
});

document.addEventListener("click", (event) => {
  const link = event.target?.closest?.("[data-g1-webmaster-open-v295]");
  if (!link) return;
  event.preventDefault();
  event.stopPropagation();
  guruInvalidateGateViewCache();
  guruNavigateToGate("gate-1");
  setTimeout(() => {
    const node = document.querySelector(
      `[data-g1-webmaster-scope-v295="${CSS.escape(link.dataset.g1WebmasterOpenV295 || "company")}"]`,
    );
    if (node) g3ProductJourneyRevealSource(node);
  }, 0);
}, true);

if (typeof GURU_EXPORT_CODE_REFERENCES_V223 !== "undefined") {
  GURU_EXPORT_CODE_REFERENCES_V223["gate-1"]?.push?.({
    file: "gate1-webmaster-qa.js",
    symbol: "gate1WebmasterStoreV295",
    role: "company/product Yandex Webmaster source of truth",
  });
  GURU_EXPORT_CODE_REFERENCES_V223["gate-2"]?.push?.({
    file: "gate1-webmaster-qa.js",
    symbol: "gate1WebmasterG2SourceV295",
    role: "five field-specific Gate 2 Webmaster resolvers",
  });
  GURU_EXPORT_CODE_REFERENCES_V223["gate-4"]?.push?.({
    file: "gate1-webmaster-qa.js",
    symbol: "gate1WebmasterEnsureCard167V295",
    role: "per-product Metrika conversion-goal QA row in card-167",
  });
}

window.gate1WebmasterAuditV295 = gate1WebmasterAuditV295;

/* ================================================================
   v2.3.148 — единый физический источник SEO / Яндекс Вебмастер.

   Более полный card.robotsV130 остаётся владельцем технических фактов,
   включая список Sitemap из Яндекс Вебмастера. Подтверждение и ошибки обхода живут на заголовочной
   карточке «Аудит сайта», продуктовая индексация — на catalogItemsV189 по
   product_id. Прежний state.gate1WebmasterV295 переносится в legacy-снимок
   той же заголовочной карточки и больше не является активным хранилищем.
   Совместимое публичное имя gate1WebmasterStoreV295 ниже возвращает только
   эфемерный getter/setter-адаптер и никогда не записывается в workspace.
   ================================================================ */

const GATE1_SEO_CENTRAL_MODEL_V298 = "gate1-seo-central-v298";

function gate1SeoCanonicalCardsV298(workspace = state) {
  const gate = workspace?.gates?.find((item) => item.id === "gate-1");
  const cards = gate?.cards || [];
  return {
    gate,
    audit: cards.find(
      (card) => normalizeGateTitle(card?.title) === normalizeGateTitle("Аудит сайта"),
    ) || null,
    robots: cards.find((card) => isRobotsUnifiedCard(card)) || null,
    sitemap: cards.find((card) => isSitemapUnifiedCard(card)) || null,
  };
}

function gate1SeoCanonicalCompanyMetaV298(workspace = state, create = true) {
  const audit = gate1SeoCanonicalCardsV298(workspace).audit;
  if (!audit) return null;
  if (!audit.webmasterCompanyV298 && create) {
    audit.webmasterCompanyV298 = {
      verificationMethod: "",
      verificationStatus: "",
      crawlErrorsStatus: "",
      crawlErrors: "",
    };
  }
  const meta = audit.webmasterCompanyV298 || null;
  if (!meta) return null;
  [
    "verificationMethod",
    "verificationStatus",
    "crawlErrorsStatus",
    "crawlErrors",
  ].forEach((key) => {
    if (meta[key] === undefined) meta[key] = "";
  });
  return meta;
}

function gate1SeoCanonicalProductV298(
  productId,
  workspace = state,
  create = true,
) {
  const product = guruV194Product(String(productId || "").trim(), workspace);
  if (!product) return null;
  if (!product.webmasterV298 && create) {
    product.webmasterV298 = { landingIndexed: "", checkedNote: "" };
  }
  const values = product.webmasterV298 || null;
  if (!values) return null;
  if (values.landingIndexed === undefined) values.landingIndexed = "";
  if (values.checkedNote === undefined) values.checkedNote = "";
  return values;
}

function gate1SeoStatusToReadinessV298(value) {
  return gate1WebmasterStatusFromGuruV295(value);
}

function gate1SeoCanonicalSitemapStatusV298(workspace = state) {
  const card = gate1SeoCanonicalCardsV298(workspace).robots;
  if (!card) return "not_started";
  const rows = ensureRobotsV130(card, workspace)?.yandex?.sitemaps || [];
  const filled = rows.filter(
    (row) => String(row?.url || "").trim() || String(row?.status || "").trim(),
  );
  if (!filled.length) return "not_started";
  if (filled.some((row) => String(row?.status || "").trim() === "error"))
    return "problem";
  if (
    filled.some(
      (row) => !String(row?.url || "").trim() || row?.status !== "ok",
    )
  )
    return "in_progress";
  return "ready";
}

function gate1SeoPrimarySitemapRowV308(workspace = state, create = true) {
  const card = gate1SeoCanonicalCardsV298(workspace).robots;
  if (!card) return null;
  const rows = ensureRobotsV130(card, workspace).yandex.sitemaps;
  let row = rows.find((item) => String(item?.url || "").trim()) || rows[0];
  if (!row && create) {
    row = { url: "", status: "" };
    rows.push(row);
  }
  return row || null;
}

function gate1SeoCanonicalRobotsStatusV298(workspace = state) {
  const card = gate1SeoCanonicalCardsV298(workspace).robots;
  if (!card) return "not_started";
  const data = ensureRobotsV130(card, workspace);
  const yandex = data?.yandex || {};
  const sitemapRows = Array.isArray(yandex.sitemaps) ? yandex.sitemaps : [];
  const importantRows = Array.isArray(yandex.urlResults) ? yandex.urlResults : [];
  const serviceRows = Array.isArray(yandex.serviceResults) ? yandex.serviceResults : [];
  const hasDetailedValue = Boolean(
    String(data?.url || "").trim() ||
      String(yandex.errors || "").trim() ||
      sitemapRows.some((row) => String(row?.url || "").trim() || row?.status) ||
      importantRows.some((row) => row?.result) ||
      serviceRows.some((row) => row?.result || String(row?.comment || "").trim()),
  );
  if (!hasDetailedValue && yandex.legacyStatusV298)
    return gate1SeoStatusToReadinessV298(yandex.legacyStatusV298);
  if (!hasDetailedValue) return "not_started";
  return robotsV130CardStatus(card, workspace);
}

function gate1SeoCanonicalCompanyFacadeV298(workspace = state) {
  const facade = {};
  const descriptor = (get, set) => ({ enumerable: true, get, set });
  Object.defineProperties(facade, {
    verificationMethod: descriptor(
      () => gate1SeoCanonicalCompanyMetaV298(workspace)?.verificationMethod || "",
      (value) => {
        const meta = gate1SeoCanonicalCompanyMetaV298(workspace);
        if (meta) meta.verificationMethod = value;
      },
    ),
    verificationStatus: descriptor(
      () => gate1SeoCanonicalCompanyMetaV298(workspace)?.verificationStatus || "",
      (value) => {
        const meta = gate1SeoCanonicalCompanyMetaV298(workspace);
        if (meta) meta.verificationStatus = value;
      },
    ),
    sitemapUrl: descriptor(
      () => gate1SeoPrimarySitemapRowV308(workspace, false)?.url || "",
      (value) => {
        const row = gate1SeoPrimarySitemapRowV308(workspace, true);
        if (row) row.url = value;
      },
    ),
    sitemapStatus: descriptor(
      () => {
        const status = gate1SeoPrimarySitemapRowV308(workspace, false)?.status || "";
        if (status === "ok") return "works";
        if (status === "error") return "broken";
        if (status === "pending") return "in_progress";
        return "";
      },
      (value) => {
        const row = gate1SeoPrimarySitemapRowV308(workspace, true);
        if (!row) return;
        const status = guruCanonStatus(value);
        row.status = guruStatusIsOk(status) ? "ok" :
          guruStatusIsBad(status) ? "error" : String(value || "").trim() ? "pending" : "";
      },
    ),
    robotsStatus: descriptor(
      () => {
        const card = gate1SeoCanonicalCardsV298(workspace).robots;
        return card ? ensureRobotsV130(card, workspace)?.yandex?.legacyStatusV298 || "" : "";
      },
      (value) => {
        const card = gate1SeoCanonicalCardsV298(workspace).robots;
        if (card) ensureRobotsV130(card, workspace).yandex.legacyStatusV298 = value;
      },
    ),
    crawlErrorsStatus: descriptor(
      () => gate1SeoCanonicalCompanyMetaV298(workspace)?.crawlErrorsStatus || "",
      (value) => {
        const meta = gate1SeoCanonicalCompanyMetaV298(workspace);
        if (meta) meta.crawlErrorsStatus = value;
      },
    ),
    crawlErrors: descriptor(
      () => gate1SeoCanonicalCompanyMetaV298(workspace)?.crawlErrors || "",
      (value) => {
        const meta = gate1SeoCanonicalCompanyMetaV298(workspace);
        if (meta) meta.crawlErrors = value;
      },
    ),
  });
  return facade;
}

gate1WebmasterStoreV295 = function (workspace = state) {
  if (!workspace) return null;
  return {
    version: GATE1_SEO_CENTRAL_MODEL_V298,
    company: gate1SeoCanonicalCompanyFacadeV298(workspace),
    byProduct: {},
    canonical: true,
  };
};

gate1WebmasterProductV295 = function (
  productId,
  workspace = state,
  create = true,
) {
  return gate1SeoCanonicalProductV298(productId, workspace, create);
};

gate1WebmasterSitemapStatusV295 = function (workspace = state) {
  return gate1SeoCanonicalSitemapStatusV298(workspace);
};

gate1WebmasterRobotsStatusV295 = function (workspace = state) {
  return gate1SeoCanonicalRobotsStatusV298(workspace);
};

gate1WebmasterFieldStatusV295 = function (fieldKey, workspace = state) {
  if (fieldKey === "verification")
    return gate1WebmasterVerificationStatusV295(workspace);
  if (fieldKey === "sitemap") return gate1SeoCanonicalSitemapStatusV298(workspace);
  if (fieldKey === "robots") return gate1SeoCanonicalRobotsStatusV298(workspace);
  if (fieldKey === "indexing_company")
    return gate1WebmasterIndexAggregateV295(workspace).status;
  if (fieldKey === "crawl_errors")
    return gate1WebmasterErrorsStatusV295(workspace);
  return "not_started";
};

const GATE1_WEBMASTER_G2_FIELDS_V298 = Object.freeze({
  "card-107": Object.freeze({
    key: "verification",
    title: "Яндекс Вебмастер · подтверждение сайта",
    path: "gate-1.cards[Аудит сайта].webmasterCompanyV298.{verificationMethod,verificationStatus}",
  }),
  "card-108": Object.freeze({
    key: "sitemap",
    title: "Яндекс Вебмастер · sitemap.xml",
    path: "gate-1.cards[Robots.txt].robotsV130.yandex.sitemaps",
  }),
  "card-109": Object.freeze({
    key: "robots",
    title: "Яндекс Вебмастер · robots.txt",
    path: "gate-1.cards[Robots.txt].robotsV130.yandex",
  }),
  "card-110": Object.freeze({
    key: "indexing_company",
    targetField: "product_indexing",
    title: "Яндекс Вебмастер · индексация страниц по товарам",
    path: "project.catalogItemsV189[product_id].webmasterV298.landingIndexed",
  }),
  "card-111": Object.freeze({
    key: "crawl_errors",
    title: "Яндекс Вебмастер · ошибки обхода",
    path: "gate-1.cards[Аудит сайта].webmasterCompanyV298.{crawlErrorsStatus,crawlErrors}",
  }),
});

gate1WebmasterG2ConfigV295 = function (card) {
  return GATE1_WEBMASTER_G2_FIELDS_V298[card?.id] || null;
};

gate1WebmasterG2SourceV295 = function (card, workspace = state) {
  const config = gate1WebmasterG2ConfigV295(card);
  if (!config) return null;
  const result = gate1WebmasterFieldStatusV295(config.key, workspace);
  return {
    key: "G1",
    sourceType: "gate1_seo_canonical_v298",
    gateId: "gate-1",
    cardId: GATE1_WEBMASTER_CARD_ID_V295,
    itemId: config.targetField || config.key,
    path: config.path,
    title: config.title,
    rawStatus: result,
    canonicalSourceStatus: result,
    normalizedStatus: result,
    readinessNormalizedStatus: result,
    statusLabel: STATUS_LABELS[result] || result,
    found: true,
    consulted: true,
    participatesInFinalStatus: true,
    decision: "selected",
    result,
    lookup: { kind: "canonical_seo_field", value: config.key },
  };
};

function gate1SeoSeedRobotsLegacyStatusV298(data, value) {
  if (!data || !String(value || "").trim()) return;
  if (!data.yandex) data.yandex = {};
  if (!data.yandex.legacyStatusV298) data.yandex.legacyStatusV298 = value;
}

function gate1SeoMigrateWebmasterV298(workspace = state) {
  if (!workspace?.project) return null;
  const cards = gate1SeoCanonicalCardsV298(workspace);
  if (!cards.audit) return null;
  const legacy = workspace.gate1WebmasterV295 &&
    typeof workspace.gate1WebmasterV295 === "object"
    ? workspace.gate1WebmasterV295
    : null;
  const company = legacy?.company || {};
  const meta = gate1SeoCanonicalCompanyMetaV298(workspace, true);
  const robots = cards.robots ? ensureRobotsV130(cards.robots, workspace) : null;
  const moved = [];
  const moveIfEmpty = (target, key, value, path) => {
    if (!target || target[key] !== undefined && String(target[key] || "").trim())
      return;
    if (!String(value || "").trim()) return;
    target[key] = value;
    moved.push(path);
  };
  moveIfEmpty(meta, "verificationMethod", company.verificationMethod, "verificationMethod");
  moveIfEmpty(meta, "verificationStatus", company.verificationStatus, "verificationStatus");
  moveIfEmpty(meta, "crawlErrorsStatus", company.crawlErrorsStatus, "crawlErrorsStatus");
  moveIfEmpty(meta, "crawlErrors", company.crawlErrors, "crawlErrors");
  const sitemap = robots ? gate1SeoPrimarySitemapRowV308(workspace, true) : null;
  moveIfEmpty(sitemap, "url", company.sitemapUrl, "robotsV130.yandex.sitemaps[0].url");
  if (sitemap && !String(sitemap.status || "").trim() && String(company.sitemapStatus || "").trim()) {
    const status = guruCanonStatus(company.sitemapStatus);
    sitemap.status = guruStatusIsOk(status) ? "ok" : guruStatusIsBad(status) ? "error" : "pending";
    moved.push("robotsV130.yandex.sitemaps[0].status");
  }
  if (robots && company.robotsStatus) {
    const before = robots.yandex?.legacyStatusV298 || "";
    gate1SeoSeedRobotsLegacyStatusV298(robots, company.robotsStatus);
    if (!before && robots.yandex?.legacyStatusV298)
      moved.push("robotsV130.yandex.legacyStatusV298");
  }
  const movedProducts = [];
  Object.entries(legacy?.byProduct || {}).forEach(([productId, values]) => {
    const target = gate1SeoCanonicalProductV298(productId, workspace, true);
    if (!target) return;
    moveIfEmpty(target, "landingIndexed", values?.landingIndexed, `catalogItemsV189[${productId}].webmasterV298.landingIndexed`);
    moveIfEmpty(target, "checkedNote", values?.checkedNote, `catalogItemsV189[${productId}].webmasterV298.checkedNote`);
    movedProducts.push(productId);
  });

  if (legacy && !cards.audit.legacyGate1WebmasterV295) {
    cards.audit.legacyGate1WebmasterV295 = {
      archivedAt: new Date().toISOString(),
      reason: "replaced_by_detailed_gate1_seo_sources_v298",
      data: legacy,
    };
  }
  if (legacy) delete workspace.gate1WebmasterV295;

  const logs = workspace.project._gate1WebmasterMigrationLogV295 =
    Array.isArray(workspace.project._gate1WebmasterMigrationLogV295)
      ? workspace.project._gate1WebmasterMigrationLogV295
      : [];
  let log = logs.find((item) => item.id === GATE1_SEO_CENTRAL_MODEL_V298);
  if (!log) {
    log = {
      id: GATE1_SEO_CENTRAL_MODEL_V298,
      at: new Date().toISOString(),
      status: "completed",
      sourceOfTruth: {
        verificationAndErrors:
          "gate-1.cards[Аудит сайта].webmasterCompanyV298",
        sitemap: "gate-1.cards[Robots.txt].robotsV130.yandex.sitemaps",
        robots: "gate-1.cards[Robots.txt].robotsV130",
        productIndexing:
          "project.catalogItemsV189[product_id].webmasterV298",
      },
      archive:
        "gate-1.cards[Аудит сайта].legacyGate1WebmasterV295.data",
      movedFields: moved,
      movedProductIds: movedProducts,
      activeLegacyStoreRemoved: !Object.prototype.hasOwnProperty.call(
        workspace,
        "gate1WebmasterV295",
      ),
      consumers: [
        "Gate 1 · SEO-аудит / карточка товара или страница услуги",
        "Gate 0 · megaMarketing.infra[Яндекс Вебмастер] (derived)",
        "Gate 2 · card-107..card-111",
      ],
    };
    logs.push(log);
  }
  const previous = logs.find((item) => item.id === GATE1_WEBMASTER_MODEL_V295);
  if (previous) {
    previous.status = "archived";
    previous.replacedBy = GATE1_SEO_CENTRAL_MODEL_V298;
    previous.sourceOfTruth = "archived; see gate1-seo-central-v298";
  }
  return { cards, meta, sitemap, robots, log };
}

gate1WebmasterCompanyHtmlV295 = function () {
  const company = gate1WebmasterStoreV295(state)?.company || {};
  const overall = gate1WebmasterOverallV295(state);
  const sitemapStatus = gate1SeoCanonicalSitemapStatusV298(state);
  const robotsStatus = gate1SeoCanonicalRobotsStatusV298(state);
  return `<section class="g1-webmaster-block-v295 g1-webmaster-embedded-v298" data-g1-webmaster-scope-v295="company" data-g1-seo-item-v296="webmaster-company">
    <div class="g1-section-header g2-open-header">
      <span class="g1-section-left">
        <span class="g1-section-title">Яндекс Вебмастер · Компания</span>
        <span class="g1-section-progress">Единый источник для Gate 0 и пяти карточек Gate 2</span>
      </span>
      ${gate1WebmasterPillV295(overall.readiness)}
    </div>
    <div class="g1-section-body g1-webmaster-body-v295">
      <div class="g1-webmaster-check-v295" data-g1-webmaster-field="verification">
        <div class="g1-webmaster-check-head-v295"><strong>Подтверждение сайта</strong>${gate1WebmasterPillV295(gate1WebmasterVerificationStatusV295(state))}</div>
        <div class="g1-webmaster-fields-v295">
          <label><span>Способ подтверждения</span><select class="passport-v116-input" data-g1-webmaster-company-v295="verificationMethod">
            <option value="" ${!company.verificationMethod ? "selected" : ""}>Не указан</option>
            <option value="meta_tag" ${company.verificationMethod === "meta_tag" ? "selected" : ""}>Мета-тег</option>
            <option value="file" ${company.verificationMethod === "file" ? "selected" : ""}>Файл</option>
            <option value="dns" ${company.verificationMethod === "dns" ? "selected" : ""}>DNS</option>
          </select></label>
          <label><span>Статус</span><select class="passport-v116-input" data-g1-webmaster-company-v295="verificationStatus">${gate1WebmasterStatusOptionsV295(company.verificationStatus)}</select></label>
        </div>
      </div>
      <div class="g1-webmaster-canonical-links-v298">
        <div class="g1-webmaster-check-v295 is-derived" data-g1-webmaster-field="sitemap"><div class="g1-webmaster-check-head-v295"><strong>Sitemap.xml</strong>${gate1WebmasterPillV295(sitemapStatus)}</div><small>Список файлов и их статусы находятся в карточке Robots.txt внутри этого блока.</small></div>
        <div class="g1-webmaster-check-v295 is-derived" data-g1-webmaster-field="robots"><div class="g1-webmaster-check-head-v295"><strong>Robots.txt</strong>${gate1WebmasterPillV295(robotsStatus)}</div><small>Единые подробные поля находятся в карточке Robots.txt внутри этого блока.</small></div>
      </div>
      <div class="g1-webmaster-check-v295" data-g1-webmaster-field="crawl_errors">
        <div class="g1-webmaster-check-head-v295"><strong>Ошибки обхода</strong>${gate1WebmasterPillV295(gate1WebmasterErrorsStatusV295(state))}</div>
        <label><span>Результат диагностики</span><select class="passport-v116-input" data-g1-webmaster-company-v295="crawlErrorsStatus">${gate1WebmasterStatusOptionsV295(company.crawlErrorsStatus)}</select></label>
        <label><span>Текущие ошибки — по одной на строку</span><textarea class="passport-v116-input" rows="4" data-g1-webmaster-company-v295="crawlErrors" placeholder="Список может быть пустым, если ошибок нет">${escapeHtml(company.crawlErrors || "")}</textarea></label>
        ${gate1WebmasterErrorsListHtmlV295(state)}
      </div>
    </div>
  </section>`;
};

const __gate1SeoCanonicalPrevPrepareV298 = prepareSystemCards;
prepareSystemCards = function (workspace) {
  __gate1SeoCanonicalPrevPrepareV298(workspace);
  gate1SeoMigrateWebmasterV298(workspace);
};

const __gate1SeoCanonicalPrevMigrateV298 = migrateWorkspace;
migrateWorkspace = function (workspace, projectId) {
  const migrated = __gate1SeoCanonicalPrevMigrateV298(workspace, projectId);
  gate1SeoMigrateWebmasterV298(migrated);
  return migrated;
};

const __gate1SeoCanonicalPrevFreshV298 = createFreshWorkspace;
createFreshWorkspace = function (meta) {
  const workspace = __gate1SeoCanonicalPrevFreshV298(meta);
  gate1SeoMigrateWebmasterV298(workspace);
  return workspace;
};

document.addEventListener("input", (event) => {
  if (!event.target?.closest?.("[data-rv2], [data-rv2-sys], [data-rv2-sum], [data-rv2-table], [data-sm-v130-field]"))
    return;
  queueMicrotask(() => gate1WebmasterUpdateDerivedV295());
}, true);

document.addEventListener("change", (event) => {
  if (!event.target?.closest?.("[data-rv2], [data-rv2-sys], [data-rv2-sum], [data-rv2-table], [data-sm-v130-field]"))
    return;
  queueMicrotask(() => {
    gate1WebmasterUpdateDerivedV295();
    if (typeof robotsV130ScheduleDurablePersist === "function")
      robotsV130ScheduleDurablePersist();
  });
}, true);

window.gate1SeoMigrateWebmasterV298 = gate1SeoMigrateWebmasterV298;
