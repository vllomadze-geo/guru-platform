/* Gate 3 is a read-only projection of source blocks. Never call an ensure
   helper on the live workspace while assembling this map. */
(() => {
  const STAGES = [
    ["aware", "Узнал (Aware)", "Клиент впервые встречает компанию или продукт."],
    ["appeal", "Понравился (Appeal)", "Клиент замечает предложение и хочет узнать больше."],
    ["ask", "Изучает (Ask)", "Клиент ищет ответы и сравнивает варианты."],
    ["act", "Покупает (Act)", "Клиент переходит к заказу и его результат можно измерить."],
    ["advocate", "Рекомендует (Advocate)", "Клиент делится опытом и рекомендует выбор."],
  ];
  const selection = new WeakMap();
  const opened = new WeakMap();
  const stageKey = (scope, id, stage) => `${scope}:${id || "project"}:${stage}`;
  const text = (value) => String(value ?? "").trim();
  const gate = (id, workspace = state) => workspace?.gates?.find((row) => row.id === id);
  const card = (id, cardId, workspace = state) => gate(id, workspace)?.cards?.find((row) => row.id === cardId);
  const checked = (calculate) => guruReadinessInspect(state, calculate).status;
  const asStatus = (value) => typeof value === "object" ? value?.status : value;
  const item = (label, source, target, status, gap) => ({ label, source, target, ready: asStatus(status) === "ready", gap });
  const productTarget = (product, field) => {
    const resolved = checked((view) => guruV194Resolve(field, guruV194Product(product.id, view), view));
    const record = resolved?.records?.[0];
    return { gateId: "gate-0", kind: "gate0-scoped", productId: product.id,
      field, scope: resolved?.scope || "product", recordId: record?.id || "" };
  };
  const companyTarget = (kind, cardId, field = "unified") => ({ gateId: "gate-0", kind, cardId, field });
  const companyCardItem = (label, kind, cardId, status, gap, field) =>
    card("gate-0", cardId) ? item(label, `Gate 0 · ${label}`, companyTarget(kind, cardId, field), checked(status), gap) : null;
  const sourcePlatform = () => gate("gate-0")?.cards?.find(isMegaMarketingCard);
  const platformTarget = (kind, cardId, extra = {}) => ({ gateId: "gate-0", kind, cardId, ...extra });
  const platformRows = () => sourcePlatform()?.megaMarketing?.platformV2?.fundamental || [];
  const fixedPage = (name) => platformRows().find((row) => text(row?.name) === name);
  const platformFixedItem = (label, names, gap) => {
    const source = sourcePlatform();
    if (!source) return null;
    const rows = names.map(fixedPage).filter(Boolean);
    if (!rows.length) return null;
    const firstMissing = rows.find((row) => guruCanonStatus(row.status) !== "works") || rows[0];
    return item(label, `Gate 0 · Платформа`, platformTarget("gate0-fundamental", source.id,
      { rowName: firstMissing.name }), rows.every((row) => guruCanonStatus(row.status) === "works") ? "ready" : "in_progress", gap);
  };
  const allReady = (rows) => rows.length && rows.every((row) => row === "ready") ? "ready" : "in_progress";

  function companyStages() {
    const s = Object.fromEntries(STAGES.map(([key]) => [key, []]));
    const add = (key, row) => { if (row) s[key].push(row); };
    add("aware", companyCardItem("Цель бренда", "gate0-company-brand-purpose",
      GURU_GATE0_COMPANY_BRAND_PURPOSE_CARD_ID_V349, (view) => guruV349CompanyBrandPurposeStatus(view), "Не задана цель бренда"));
    add("aware", companyCardItem("ЦА компании", "gate0-company-segmentation",
      GURU_GATE0_COMPANY_SEGMENTATION_CARD_ID_V309, (view) => guruV309CompanySegmentationStatus(view), "Не завершена сегментация компании"));
    if (typeof g4SmmStrategyHtmlV298 === "function") add("aware", item("SMM-стратегия компании",
      "Gate 4 · SMM-стратегия компании", { gateId: "gate-4", kind: "gate4-company-smm" },
      "in_progress", "У блока нет статуса «Готово»"));
    if (typeof G4_FIVE_A_COMPANY_V523 !== "undefined") add("aware", item("Каналы",
      "Gate 4 · Каналы компании", { gateId: "gate-4", kind: "gate4-company-stage", stage: "aware" },
      "in_progress", "У блока нет общего статуса «Готово»"));
    add("appeal", companyCardItem("Позиционирование бренда", "gate0-company-positioning",
      GURU_GATE0_COMPANY_POSITIONING_CARD_ID_V308, (view) => guruV308CompanyPositioningStatus(view), "Не завершено позиционирование бренда"));
    add("appeal", companyCardItem("Оффер и CTA", "gate0-company-offer",
      GURU_GATE0_COMPANY_OFFER_CARD_ID_V347, (view) => guruV347CompanyOfferStatus(view), "Не завершены оффер и CTA", "offer"));
    add("appeal", platformFixedItem("Обязательные страницы сайта",
      ["Главная страница", "Страница продукта / услуги / каталог", "Контакты (телефон, адрес, мессенджер)"],
      "Не все обязательные страницы готовы"));
    add("ask", companyCardItem("Фундамент ключевых слов", "gate0-company-keyword-foundation",
      GURU_GATE0_COMPANY_KEYWORD_FOUNDATION_CARD_ID_V351, (view) => guruCompanyKeywordFoundationStatusV351(view), "Не подтверждены ключевые слова"));
    if (state?.projectComparison) add("ask", item("Сравнение проектов · Компания",
      "Gate 1 · Сравнение проектов", { gateId: "gate-1", kind: "gate1-project-comparison" },
      checked((view) => projectComparisonStatus(view.projectComparison)), "Сравнение проектов не готово"));
    add("ask", platformFixedItem("Блок доверия на сайте", ["Блоки доверия (отзывы, гарантии, сертификаты)"], "Блок доверия не готов"));
    const metriks = ["g2-metrika-company-counter", "g2-metrika-company-goals", "g2-metrika-company-internal-filter", "g2-metrika-company-robots"]
      .map((id) => card("gate-2", id)).filter(Boolean);
    if (metriks.length) {
      const statuses = metriks.map((source) => checked((view) => g2MetrikaCompanyStatusV374(card("gate-2", source.id, view))));
      const missing = metriks[statuses.findIndex((status) => status !== "ready")] || metriks[0];
      add("act", item("Яндекс Метрика · Компания", "Gate 2 · Яндекс Метрика · Компания",
        { gateId: "gate-2", kind: "gate2-card", cardId: missing.id }, allReady(statuses), "Не все проверки Метрики готовы"));
    }
    const platform = sourcePlatform();
    if (platform) add("act", item("Юридические страницы", "Gate 0 · Платформа",
      platformTarget("gate0-legal", platform.id), deriveLegalPages(state).ready ? "ready" : "in_progress",
      "Не все обязательные юридические страницы готовы"));
    return s;
  }

  function productStages(product) {
    const s = Object.fromEntries(STAGES.map(([key]) => [key, []]));
    const add = (key, row) => { if (row) s[key].push(row); };
    const gate0Product = gate("gate-0")?.cards?.find((row) => v116PassportDef(row)?.key === "product_segment_client_task");
    const gate0Status = gate0Product
      ? checked((view) => guruGate0ProductBlockStatus(card("gate-0", gate0Product.id, view), view, product.id)) : null;
    const strategic = (key, label, field, gap) => {
      if (gate0Product) add(key, item(label, "Gate 0 · Продукт, сегмент и задача клиента",
        productTarget(product, field), gate0Status, gap));
    };
    strategic("aware", "Сегмент ЦА", "segments", "Не завершён блок сегмента ЦА");
    strategic("aware", "JTBD", "jtbd", "Не завершён блок JTBD");
    const campaignRows = Object.values(state?.gate4Production?.campaigns || {})
      .filter((row) => row?.product === product.id && row.decision !== "hold");
    const campaignStatus = (row) => g4CampaignStatus(row);
    const campaignItem = (key, label, match, gap, area) => {
      if (typeof G4_FIVE_A_STAGES_V523 === "undefined") return;
      const rows = campaignRows.filter(match);
      add(key, item(label, `Gate 4 · ${label}`,
        { gateId: "gate-4", kind: "gate4-product-stage", productId: product.id, stage: "aware", area },
        allReady(rows.map(campaignStatus)), gap));
    };
    campaignItem("aware", "Каналы привлечения", () => true, "Нет готовых каналов привлечения");
    campaignItem("aware", "Медийная реклама", (row) => /media|display|баннер|медийн/i.test(`${row.channelKey || ""} ${row.channel || ""}`),
      "Медийная реклама не готова", "media");
    campaignItem("aware", "SMM и посевы", (row) => /smm|social|telegram|vk|посев/i.test(`${row.channelKey || ""} ${row.channel || ""}`),
      "SMM и посевы не готовы", "paid_social");
    strategic("appeal", "Позиционирование", "positioning", "Не завершено позиционирование");
    strategic("appeal", "УТП", "usp", "Не завершено УТП");
    strategic("appeal", "Оффер и CTA", "offers", "Не завершены оффер и CTA");
    const comparison = state?.projectComparison?.productsById?.[product.id];
    const comparisonStatus = comparison
      ? checked((view) => projectComparisonProductStatus(view.projectComparison?.productsById?.[product.id])) : null;
    if (comparison) {
      const target = { gateId: "gate-1", kind: "gate1-project-comparison", productId: product.id };
      add("appeal", item("Мини-версия поисковой выдачи", "Gate 1 · Сравнение", target,
        comparisonStatus, "Сравнение с конкурентами не готово"));
      add("ask", item("Сравнение с конкурентами", "Gate 1 · Сравнение", target,
        comparisonStatus, "Сравнение с конкурентами не готово"));
    }
    const demandRow = (state?.painV130?.productMaps || []).find((row) =>
      row?.items?.[product.id] || row?.product_id === product.id);
    if (demandRow) add("ask", item("Спрос / ключевые слова", "Gate 1 · Спрос / ключевые слова",
      { gateId: "gate-1", kind: "gate1-keywords", productId: product.id }, "in_progress",
      "У продуктового блока спроса нет статуса «Готово»"));
    const platform = sourcePlatform();
    if (platform) {
      const landing = checked((view) => gate0LandingRecordReadV348(guruV194Product(product.id, view), view));
      const url = text(platform.megaMarketing?.platformV2?.urlsV1?.products?.[product.id]);
      add("act", item("Посадочная страница", "Gate 0 · Платформа",
        platformTarget("gate0-landing", platform.id, { productId: product.id, field: "status" }),
        guruCanonStatus(landing?.status) === "works" && url ? "ready" : "in_progress",
        "Посадочная страница или её URL не готовы"));
    }
    const page = g3ProductJourneyPageSource(product);
    if (page.row && page.card) {
      const rowIndex = page.card.pageRows.indexOf(page.row);
      add("act", item("Доставка и оплата", "Gate 1 · Карточка продукта",
        { gateId: "gate-1", kind: "gate1-page", cardId: page.card.id, rowIndex,
          rowId: page.row.id, sectionKey: "delivery", contextKey: "productDeliveryGuaranteeV253" },
        goatProductCardStatusV514(page.row, "delivery"), "Доставка и оплата не готовы"));
    }
    const metrika = ["g2-metrika-product-counter", "g2-metrika-goals-primary", "g2-metrika-product-goals"]
      .map((id) => card("gate-2", id)).filter(Boolean);
    if (metrika.length) {
      const statuses = metrika.map((source) => checked((view) =>
        g2MetrikaProductStatusV367(card("gate-2", source.id, view), product.id, view)));
      const missing = metrika[statuses.findIndex((status) => status !== "ready")] || metrika[0];
      add("act", item("Яндекс Метрика · Продукт", "Gate 2 · Яндекс Метрика · Продукт",
        { gateId: "gate-2", kind: "gate2-card", cardId: missing.id, productId: product.id },
        allReady(statuses), missing.id === "g2-metrika-goals-primary" ? "Не задана главная конверсия" : "Не все проверки Метрики готовы"));
    }
    if (typeof G4_FIVE_A_STAGES_V523 !== "undefined") add("act", item("Кампании продукта", "Gate 4 · Кампании продукта",
      { gateId: "gate-4", kind: "gate4-product-stage", productId: product.id, stage: "act" },
      allReady(campaignRows.map(campaignStatus)), "Не все кампании продукта готовы"));
    productArchive(product).forEach(({ stage, row }) => add(stage, row));
    return s;
  }

  function productArchive(product) {
    const model = state?.gate3Gate4StructureV290?.byProduct?.[product.id] || {};
    const root = model.stages || {};
    const saved = (stage) => [
      ...(root[stage]?.groups || []).flatMap((group) => group.items || []),
      ...(model.outside || []).filter((entry) => entry.previousStageKey === stage),
    ];
    return STAGES.flatMap(([stage]) => saved(stage)
      .filter((entry) => entry?.label && (String(entry.toolId || "").startsWith("custom-")
        || entry.implementationId || entry.channelKeys?.length || entry.observedChannelKeys?.length))
      .map((entry) => ({ stage, row: { label: entry.label, archive: true,
        archiveId: `product:${product.id}:${entry.instanceId || entry.id || entry.label}`,
        source: "Gate 3 · сохранённый инструмент",
        target: { gateId: "gate-3", kind: "gate3-archive", productId: product.id,
          archiveId: `product:${product.id}:${entry.instanceId || entry.id || entry.label}`, stage },
        gap: "Сохранённая запись; статус этапа не меняет" } })));
  }

  function companyArchive() {
    const root = state?.gate3_5a || {};
    return Object.fromEntries(STAGES.map(([stage]) => {
      const saved = root[stage] || {};
      const def = G3_5A_STEPS.find((entry) => entry.key === stage);
      const rows = [];
      if (text(saved.answer)) rows.push({ label: "Прежний ответ", value: saved.answer });
      Object.entries(saved.fields || {}).forEach(([key, values]) =>
        (Array.isArray(values) ? values : [values]).filter(text).forEach((value) =>
          rows.push({ label: def?.fields?.find((field) => field.k === key)?.label || key, value })));
      Object.entries(saved.toolStatuses || {}).filter(([, status]) => status && status !== "unused")
        .forEach(([name, status]) => rows.push({ label: name, value: status }));
      return [stage, rows.map((row, index) => ({ ...row, archive: true,
        archiveId: `company:${stage}:${index}`,
        source: "Gate 3 · сохранённая запись",
        target: { gateId: "gate-3", kind: "gate3-archive", stage,
          archiveId: `company:${stage}:${index}` } }))];
    }));
  }

  function stageModels(rows, archive = {}) {
    return STAGES.map(([key, title, definition]) => {
      const entries = rows[key] || [];
      const counted = entries.filter((entry) => !entry.archive);
      const complete = counted.length > 0 && counted.every((entry) => entry.ready);
      return { key, title, definition, entries: [...counted.filter((entry) => !entry.ready),
        ...counted.filter((entry) => entry.ready), ...entries.filter((entry) => entry.archive), ...(archive[key] || [])],
        done: counted.filter((entry) => entry.ready).length, total: counted.length, complete };
    });
  }
  const count = (stages) => stages.filter((stage) => stage.complete).length;
  const jump = (target, label, ready = false) => target
    ? `<button type="button" class="g3ro-link" data-g4-jump-target="${escapeAttr(JSON.stringify(target))}">${escapeHtml(label)} ${ready ? "↗" : "→"}</button>` : "";
  const rowHtml = (entry) => `<div class="g3ro-item${entry.ready ? " is-done" : ""}${entry.archive ? " is-archive" : ""}"${entry.archiveId ? ` data-g3ro-archive-id="${escapeAttr(entry.archiveId)}"` : ""}>
    <span class="g3ro-check" aria-hidden="true">${entry.ready ? "✓" : entry.archive ? "·" : ""}</span>
    <div class="g3ro-item-copy"><strong>${escapeHtml(entry.label)}</strong>
      ${entry.archive ? `<small>${escapeHtml(entry.value || entry.gap || "Сохранённый инструмент")}</small>` : entry.ready ? "" : `<small>${escapeHtml(entry.gap || "Блок не готов")}</small>`}</div>
    ${jump(entry.target, entry.source, entry.ready || entry.archive)}
  </div>`;
  function stageHtml(scope, id, stage) {
    const key = stageKey(scope, id, stage.key);
    const map = opened.get(state) || new Map();
    const isOpen = map.has(key) ? map.get(key) : !stage.complete;
    return `<section class="g3ro-stage${isOpen ? " is-open" : ""}" data-g3ro-stage="${escapeAttr(key)}">
      <button type="button" class="g3ro-stage-head" data-g3ro-stage-toggle${scope === "product" ? ` data-g3-product-stage-toggle="${escapeAttr(stage.key)}"` : ""} aria-expanded="${isOpen}">
        <span class="g3ro-triangle" aria-hidden="true">▸</span><strong>${stage.title}</strong>
        <span class="g3ro-stage-count">${stage.done} из ${stage.total}</span>
        <span class="g3ro-badge ${stage.complete ? "is-done status-ready" : "is-missing status-in_progress"}">${stage.complete ? "Сделано" : "Не сделано"}</span></button>
      <div class="g3ro-stage-body"${isOpen ? "" : " hidden"}><p>${escapeHtml(stage.definition)}</p>
        ${stage.entries.length ? stage.entries.map(rowHtml).join("") : `<div class="g3ro-no-source">Раздела в системе пока нет</div>`}</div>
    </section>`;
  }
  function mapHtml(scope, id, title, stages, selector = "") {
    const next = stages.flatMap((stage) => stage.entries).find((entry) => !entry.ready && !entry.archive);
    return `<section class="g3ro-map" data-g3ro-scope="${scope}">
      <header class="g3ro-map-head"><h2>${title}</h2><strong>${count(stages)} из 5 этапов</strong></header>
      <div class="g3ro-progress" aria-label="${count(stages)} из 5 этапов">${stages.map((stage) =>
        `<span class="${stage.complete ? "is-done" : ""}" title="${escapeAttr(stage.title)}"></span>`).join("")}</div>
      ${selector}
      <div class="g3ro-next"><span>Следующий шаг</span><strong>${escapeHtml(next?.label || "Раздела в системе пока нет")}</strong>
        ${next?.target ? jump(next.target, `Заполнить: ${next.source}`) : ""}</div>
      <div class="g3ro-stages">${stages.map((stage) => stageHtml(scope, id, stage)).join("")}</div>
    </section>`;
  }

  function productSelector(products, selected, models) {
    const categories = state?.project?.productRegistryV185 || [];
    const groups = new Map();
    products.forEach((product) => {
      const id = product.categoryId || "";
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(product);
    });
    const options = [...groups].map(([id, members]) => {
      const label = categories.find((row) => row.id === id)?.name || "Без категории";
      return `<optgroup label="${escapeAttr(label)}">${members.map((product) =>
        `<option value="${escapeAttr(product.id)}"${product.id === selected.id ? " selected" : ""}>${escapeHtml(product.name)} · ${count(models.get(product.id))} из 5</option>`).join("")}</optgroup>`;
    }).join("");
    return `<label class="g3ro-picker"><span>Продукт/Услуга</span><select data-g3ro-product aria-label="Продукт/Услуга">${options}</select></label>`;
  }

  renderGate3Redesign = function () {
    const products = checked((view) => guruV194Products(view)) || [];
    const requested = selection.get(state) || state?.project?.gate0ScopeUiV194?.selectedProductId;
    const product = products.find((row) => row.id === requested) || products[0];
    if (product) selection.set(state, product.id);
    const models = new Map(products.map((row) => [row.id, stageModels(productStages(row))]));
    const company = stageModels(companyStages(), companyArchive());
    els.contentArea.innerHTML = `<div class="g3ro" data-gate3-readonly-5a>
      ${mapHtml("company", "project", "Компания", company)}
      ${product ? mapHtml("product", product.id, "Продукт/Услуга", models.get(product.id),
        productSelector(products, product, models)) : `<section class="g3ro-map"><h2>Продукт/Услуга</h2><p>Добавьте продукт в Gate 0.</p></section>`}
    </div>`;
    renderGateNav();
  };

  // Source edits can happen in any Gate. Always rebuild this projection when
  // returning, even when the shared navigation cache holds an older view.
  const priorRestoreCachedGateView = guruRestoreCachedGateView;
  guruRestoreCachedGateView = function (gateId) {
    return gateId === "gate-3" ? false : priorRestoreCachedGateView(gateId);
  };

  document.addEventListener("change", (event) => {
    const select = event.target?.closest?.("[data-g3ro-product]");
    if (!select) return;
    selection.set(state, select.value);
    renderGate3Redesign();
  }, true);
  document.addEventListener("click", (event) => {
    const button = event.target?.closest?.("[data-g3ro-stage-toggle]");
    const detail = button?.closest?.("[data-g3ro-stage]");
    if (!detail) return;
    let map = opened.get(state);
    if (!map) { map = new Map(); opened.set(state, map); }
    const next = !detail.classList.contains("is-open");
    map.set(detail.dataset.g3roStage, next);
    detail.classList.toggle("is-open", next);
    button.setAttribute("aria-expanded", String(next));
    detail.querySelector(".g3ro-stage-body").hidden = !next;
  }, true);

  // The shared Now guide still points at Gate 3 stage keys. Open the new
  // read-only row without mounting its former inline editor.
  if (typeof nowGuideReveal34 === "function") {
    const priorReveal34 = nowGuideReveal34;
    nowGuideReveal34 = function (item) {
      if (item?.gateId !== "gate-3") return priorReveal34(item);
      const button = document.querySelector(`[data-g3ro-scope="product"] [data-g3-product-stage-toggle="${CSS.escape(item.id)}"]`);
      if (button && button.getAttribute("aria-expanded") !== "true") button.click();
    };
  }

  const priorPrepare = g3ProductJourneyPrepareSource;
  g3ProductJourneyPrepareSource = function (target) {
    priorPrepare(target);
    if (!target) return;
    if (["gate0-fundamental", "gate0-legal"].includes(target.kind)) {
      state._gate0Open = state._gate0Open || {};
      state._gate0Open[target.cardId] = true;
    }
    if (target.kind === "gate4-product-stage" && target.productId) {
      const product = guruV194Product(target.productId, state);
      if (product) {
        const ui = guruV194Ui(state);
        ui.selectedProductId = product.id;
        ui.selectedCategoryId = product.categoryId || "__uncategorized__";
      }
    }
    if (target.kind === "gate3-archive" && target.productId) selection.set(state, target.productId);
  };
  const priorFind = g3ProductJourneyFindSource;
  g3ProductJourneyFindSource = function (target) {
    const previous = priorFind(target);
    if (previous || !target) return previous;
    const esc = (value) => CSS.escape(String(value ?? ""));
    if (target.kind === "gate0-fundamental") {
      const rows = platformRows();
      const index = rows.findIndex((row) => text(row.name) === target.rowName);
      return document.querySelector(`[data-mega-card="${esc(target.cardId)}"][data-mega-pv2="fundamental"][data-mega-idx="${index}"][data-mega-field="status"]`)
        || document.querySelector(`[data-card-row="${esc(target.cardId)}"]`);
    }
    if (target.kind === "gate0-legal") return document.querySelector("[data-mega-legal-block]");
    if (target.kind === "gate3-archive") return document.querySelector(`[data-g3ro-archive-id="${esc(target.archiveId)}"]`);
    if (target.kind === "gate1-keywords") return document.querySelector(
      `[data-gate1-direct-product-v265="${esc(target.productId)}"]`)
      || document.querySelector(`[data-pv181-demand-product-v262="${esc(target.productId)}"]`)
      || document.querySelector('[data-gate1-toggle-section="pain_jtbd_offer"]')
        ?.closest("section")?.querySelector(".pv181-keyword-empty");
    if (target.kind === "gate4-map-implementation" && target.instanceId)
      return document.querySelector(`[data-g4-map-instance-v290="${esc(target.instanceId)}"]`);
    if (target.kind === "gate4-company-smm") return document.querySelector("[data-g4-smm-strategy-v298], .g4-smm-strategy-v298");
    if (target.kind === "gate4-company-stage") return document.querySelector(`[data-g4five-company-v523] [data-g4-map-stage-v290="${esc(target.stage)}"]`);
    if (target.kind === "gate4-product-stage") return document.querySelector(
      `[data-g4five-product-v523="${esc(target.productId)}"] [data-g4five-aware-block-v544="${esc(target.area)}"]`)
      || document.querySelector(`[data-g4five-product-v523="${esc(target.productId)}"] [data-g4-map-stage-v290="${esc(target.stage)}"]`);
    return null;
  };
})();
