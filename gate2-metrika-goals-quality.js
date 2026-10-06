/* v2.3.161 — Gate 2: независимый аудит качества целей Яндекс Метрики.
   Gate 0 остаётся только фактом наличия. Ни одна из этих проверок не
   наследует его статус или общий статус старых карточек Аналитики. */

const G2_METRIKA_QUALITY_COMPANY_SECTION_V361 = "metrika_goal_quality_company";
const G2_METRIKA_QUALITY_PRODUCT_SECTION_V361 = "metrika_goal_quality_product";
const G2_METRIKA_QUALITY_SECTION_V360 = G2_METRIKA_QUALITY_COMPANY_SECTION_V361;
const G2_METRIKA_QUALITY_FIELD_V360 = "metrikaQualityV360";
const G2_METRIKA_QUALITY_CARDS_V360 = Object.freeze([
  {
    id: "g2-metrika-goals-traffic",
    title: "Контрольный визит действительно виден в Метрике",
    hint: "Проверьте реальный визит на ключевой странице, а не только наличие кода счётчика.",
  },
  {
    id: "g2-metrika-goals-primary",
    title: "Главная цель — посещение страницы «Спасибо»",
    hint: "Для каждого товара проверьте URL страницы «Спасибо» и ручное срабатывание цели. Автоцель не заменяет эту проверку.",
    scope: "product",
  },
  {
    id: "g2-metrika-goals-calls",
    title: "Звонки передаются в цели Метрики",
    hint: "Проверка нужна, если звонки — канал лидов. Факт установки коллтрекинга сам по себе недостаточен.",
    optional: true,
  },
  {
    id: "g2-metrika-goals-email",
    title: "Входящие email-лиды передаются в цели Метрики",
    hint: "Речь о письмах от клиентов, а не об уведомлениях команды о заявке.",
    optional: true,
  },
  {
    id: "g2-metrika-goals-widgets",
    title: "Ловцы лидов и виджеты подключены к целям",
    hint: "Если виджеты используются, проверьте срабатывание цели каждого из них.",
    optional: true,
  },
  {
    id: "g2-metrika-goals-kpi",
    title: "Вспомогательные цели не подменяют основную конверсию",
    hint: "Время на сайте, глубина и контакты могут помогать анализу, но не считаться главным KPI лидов.",
  },
]);
const G2_METRIKA_QUALITY_BY_ID_V360 = new Map(
  G2_METRIKA_QUALITY_CARDS_V360.map((item) => [item.id, item]),
);
const g2MetrikaQualityTextV360 = (value) => String(value ?? "").trim();

const g2MetrikaQualitySectionIndexV360 = G2_SECTIONS.findIndex(
  (section) => section.key === "technical",
);
G2_SECTIONS.splice(g2MetrikaQualitySectionIndexV360 + 1, 0, {
  key: G2_METRIKA_QUALITY_COMPANY_SECTION_V361,
  title: "Яндекс Метрика · Компания",
  match: /a^/,
});
const g2MetrikaProductInsertV361 = G2_SECTIONS.findIndex((section) => section.key === "analytics");
G2_SECTIONS.splice(g2MetrikaProductInsertV361 + 1, 0, {
  key: G2_METRIKA_QUALITY_PRODUCT_SECTION_V361,
  title: "Яндекс Метрика · Продукт/Услуга",
  match: /a^/,
});
G2_PRODUCT_SECTION_KEYS_V271.add(G2_METRIKA_QUALITY_PRODUCT_SECTION_V361);

const __g2MetrikaPrevEnsureStructureV360 = ensureGate2Structure;
ensureGate2Structure = function (gate) {
  __g2MetrikaPrevEnsureStructureV360(gate);
  if (gate?.id !== "gate-2" || !Array.isArray(gate.cards)) return;
  const existing = new Set(gate.cards.map((card) => card.id));
  const inserted = G2_METRIKA_QUALITY_CARDS_V360.filter(
    (definition) => !existing.has(definition.id),
  ).map((definition) => ({
    id: definition.id,
    title: definition.title,
    instruction: definition.hint,
    status: "not_started",
    evidence: "",
    pages: "",
    notes: "",
    fields: { [G2_METRIKA_QUALITY_FIELD_V360]: {} },
    generatedBy: "gate2-metrika-quality-v360",
  }));
  if (!inserted.length) return;
  const afterAnalytics = gate.cards.findIndex((card) => card.id === "card-105");
  gate.cards.splice(afterAnalytics < 0 ? gate.cards.length : afterAnalytics + 1, 0, ...inserted);
};

const __g2MetrikaPrevSectionKeyV360 = g2SectionKeyForCardV271;
g2SectionKeyForCardV271 = function (card) {
  const definition = G2_METRIKA_QUALITY_BY_ID_V360.get(card?.id);
  if (definition) return definition.scope === "product"
    ? G2_METRIKA_QUALITY_PRODUCT_SECTION_V361
    : G2_METRIKA_QUALITY_COMPANY_SECTION_V361;
  return __g2MetrikaPrevSectionKeyV360(card);
};

function g2MetrikaQualityDataV360(card) {
  const value = card?.fields?.[G2_METRIKA_QUALITY_FIELD_V360];
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function g2MetrikaQualityEnsureDataV360(card) {
  card.fields = card.fields && typeof card.fields === "object" ? card.fields : {};
  const value = g2MetrikaQualityDataV360(card);
  card.fields[G2_METRIKA_QUALITY_FIELD_V360] = value;
  return value;
}

function g2MetrikaQualityProductsV360(workspace = state) {
  return typeof guruV194Products === "function"
    ? guruV194Products(workspace).filter((product) => g2MetrikaQualityTextV360(product?.id))
    : [];
}

function g2MetrikaQualityTouchedV360(value) {
  if (Array.isArray(value)) return value.some(g2MetrikaQualityTouchedV360);
  if (value && typeof value === "object")
    return Object.values(value).some(g2MetrikaQualityTouchedV360);
  return g2MetrikaQualityTextV360(value) !== "";
}

function g2MetrikaQualityPrimaryStatusV361(card, productId) {
  if (!productId) return "not_started";
  const data = g2MetrikaQualityDataV360(card);
  const row = (Array.isArray(data.perProduct) ? data.perProduct : [])
    .find((item) => item?.product_id === productId);
  if (!row || !Object.entries(row).some(([key, value]) =>
    key !== "product_id" && key !== "thankYouUrl" &&
      g2MetrikaQualityTouchedV360(value)) &&
    !megaPlatformUrl("fixed", "thank_you", state)) return "not_started";
  if (row.triggerType === "auto_goal" || row.goalFired === "no" || guruStatusIsBad(row.result))
    return "problem";
  if (
    g2MetrikaQualityTextV360(row.goalId) &&
    row.triggerType === "thank_you_page" &&
    g2MetrikaQualityTextV360(megaPlatformUrl("fixed", "thank_you", state)) &&
    g2MetrikaQualityTextV360(row.testConversionAt) &&
    row.goalFired === "yes" &&
    guruCanonStatus(row.result) === "works" &&
    g2MetrikaQualityTextV360(row.evidenceUrl) &&
    g2MetrikaQualityTextV360(row.testedAt)
  ) return "ready";
  return "in_progress";
}

function g2MetrikaQualityPrimaryAggregateV361(card, workspace = state) {
  const products = g2MetrikaQualityProductsV360(workspace);
  if (!products.length) return "not_started";
  const statuses = products.map((product) => g2MetrikaQualityPrimaryStatusV361(card, product.id));
  if (statuses.includes("problem")) return "problem";
  if (statuses.every((status) => status === "ready")) return "ready";
  if (statuses.some((status) => status !== "not_started")) return "in_progress";
  return "not_started";
}

function g2MetrikaQualitySpecificV360(card, data) {
  const yes = (value) => value === "yes";
  const no = (value) => value === "no";
  if (card.id === "g2-metrika-goals-traffic") {
    const rows = Array.isArray(data.pageChecks) ? data.pageChecks : [];
    return {
      failed: rows.some((row) => no(row?.visitObserved)),
      complete: Boolean(
        g2MetrikaQualityTextV360(data.counterId) &&
        yes(data.coverageConfirmed) && rows.length && rows.every((row) =>
          g2MetrikaQualityTextV360(megaPlatformPageRefUrl(row?.pageRefV1, state)) &&
          g2MetrikaQualityTextV360(row?.testVisitAt) &&
          g2MetrikaQualityTextV360(row?.evidenceUrl) &&
          yes(row?.visitObserved))
      ),
    };
  }
  if (card.id === "g2-metrika-goals-calls") {
    const rows = Array.isArray(data.callRoutes) ? data.callRoutes : [];
    return {
      failed: rows.some((row) => no(row?.callObserved)),
      complete: Boolean(
        g2MetrikaQualityTextV360(data.calltrackingSystem) &&
        yes(data.coverageConfirmed) && rows.length && rows.every((row) =>
          g2MetrikaQualityTextV360(row?.phoneNumber) &&
          g2MetrikaQualityTextV360(megaPlatformPageRefUrl(row?.pageRefV1, state)) &&
          g2MetrikaQualityTextV360(row?.goalId) &&
          g2MetrikaQualityTextV360(row?.testCallAt) &&
          g2MetrikaQualityTextV360(row?.evidenceUrl) &&
          yes(row?.callObserved))
      ),
    };
  }
  if (card.id === "g2-metrika-goals-email") {
    const rows = Array.isArray(data.emailRoutes) ? data.emailRoutes : [];
    return {
      failed: rows.some((row) => no(row?.emailReceived) || no(row?.goalObserved)),
      complete: Boolean(
        g2MetrikaQualityTextV360(data.trackingSystem) &&
        yes(data.coverageConfirmed) && rows.length && rows.every((row) =>
          g2MetrikaQualityTextV360(row?.emailAddress) &&
          g2MetrikaQualityTextV360(megaPlatformPageRefUrl(row?.pageRefV1, state)) &&
          g2MetrikaQualityTextV360(row?.goalId) &&
          g2MetrikaQualityTextV360(row?.testEmailAt) &&
          g2MetrikaQualityTextV360(row?.evidenceUrl) &&
          yes(row?.emailReceived) && yes(row?.goalObserved))
      ),
    };
  }
  if (card.id === "g2-metrika-goals-widgets") {
    const widgets = Array.isArray(data.widgets) ? data.widgets : [];
    return {
      failed: widgets.some((widget) => no(widget?.goalFired)),
      complete: yes(data.coverageConfirmed) && Boolean(widgets.length) && widgets.every((widget) =>
        g2MetrikaQualityTextV360(widget?.name) &&
        g2MetrikaQualityTextV360(widget?.placementUrl) &&
        g2MetrikaQualityTextV360(widget?.goalId) &&
        g2MetrikaQualityTextV360(widget?.testAt) &&
        g2MetrikaQualityTextV360(widget?.evidenceUrl) &&
        yes(widget?.goalFired),
      ),
    };
  }
  const campaigns = Array.isArray(data.campaignChecks) ? data.campaignChecks : [];
  return {
    failed: no(data.policyConfirmed) || campaigns.some((row) => yes(row?.auxiliaryUsedAsPrimary)),
    complete: yes(data.policyConfirmed) && yes(data.coverageConfirmed) &&
      Boolean(campaigns.length) && campaigns.every((row) =>
        g2MetrikaQualityTextV360(row?.campaign) &&
        g2MetrikaQualityTextV360(row?.mainGoalId) &&
        g2MetrikaQualityTextV360(row?.evidenceUrl) &&
        no(row?.auxiliaryUsedAsPrimary)),
  };
}

function g2MetrikaQualityStatusV360(card, workspace = state) {
  const definition = G2_METRIKA_QUALITY_BY_ID_V360.get(card?.id);
  if (!definition) return "not_started";
  if (definition.scope === "product")
    return g2MetrikaQualityPrimaryStatusV361(card, guruV194SelectedProduct(workspace)?.id || "");
  const data = g2MetrikaQualityDataV360(card);
  if (definition.optional && data.applicability === "not_needed")
    return g2MetrikaQualityTextV360(data.applicabilityReason)
      ? "not_needed"
      : "in_progress";
  if (!g2MetrikaQualityTouchedV360(data)) return "not_started";
  const specific = g2MetrikaQualitySpecificV360(card, data);
  if (specific.failed || guruStatusIsBad(data.result)) return "problem";
  if (
    guruCanonStatus(data.result) === "works" &&
    g2MetrikaQualityTextV360(data.evidenceUrl) &&
    g2MetrikaQualityTextV360(data.testedAt) &&
    specific.complete &&
    (!definition.optional || data.applicability === "required")
  ) return "ready";
  return "in_progress";
}

STATUS_LABELS.not_needed = "Не требуется";
const __g2MetrikaPrevCardStatusV360 = g2CardStatus;
g2CardStatus = function (card) {
  return G2_METRIKA_QUALITY_BY_ID_V360.has(card?.id)
    ? g2MetrikaQualityStatusV360(card, state)
    : __g2MetrikaPrevCardStatusV360(card);
};

const __g2MetrikaPrevRecalculateCardV360 = recalculateStatusForCard;
recalculateStatusForCard = function (card, workspace = state) {
  if (G2_METRIKA_QUALITY_BY_ID_V360.has(card?.id)) {
    card.status = card.id === "g2-metrika-goals-primary"
      ? g2MetrikaQualityPrimaryAggregateV361(card, workspace)
      : g2MetrikaQualityStatusV360(card, workspace);
    return;
  }
  return __g2MetrikaPrevRecalculateCardV360.apply(this, arguments);
};

const __g2MetrikaPrevExportDiagnosticV360 = guruExportGate2CardDiagnosticV223;
guruExportGate2CardDiagnosticV223 = function (card, rawStatus) {
  if (!G2_METRIKA_QUALITY_BY_ID_V360.has(card?.id))
    return __g2MetrikaPrevExportDiagnosticV360.apply(this, arguments);
  const isProduct = card.id === "g2-metrika-goals-primary";
  const product = isProduct ? guruV194SelectedProduct(state) : null;
  const status = g2MetrikaQualityStatusV360(card, state);
  const readinessStatus = isProduct
    ? g2MetrikaQualityPrimaryAggregateV361(card, state)
    : status;
  const basePath = `state.gates[gate-2].cards[${card.id}].fields.${G2_METRIKA_QUALITY_FIELD_V360}`;
  const path = isProduct
    ? `${basePath}.perProduct[product_id=${product?.id || "not-selected"}]`
    : basePath;
  const productRows = g2MetrikaQualityDataV360(card).perProduct;
  const selectedRow = (Array.isArray(productRows) ? productRows : [])
    .find((row) => row?.product_id === product?.id);
  const source = guruExportDiagnosticSourceV223({
    key: "METRIKA_QUALITY",
    sourceType: "gate2_metrika_quality_manual_audit",
    gateId: "gate-2",
    cardId: card.id,
    path,
    title: `${card.title} · собственная проверка Gate 2`,
    rawStatus: status,
    found: isProduct
      ? Boolean(selectedRow && Object.entries(selectedRow).some(([key, value]) =>
        key !== "product_id" && g2MetrikaQualityTouchedV360(value)))
      : g2MetrikaQualityTouchedV360(g2MetrikaQualityDataV360(card)),
    lookup: isProduct
      ? { kind: "card_id_and_product_id", cardId: card.id, productId: product?.id || "" }
      : { kind: "card_id", value: card.id },
  });
  source.consulted = true;
  source.decision = "selected";
  source.result = status;
  return {
    unitId: card.id,
    unitKind: "card",
    gateId: "gate-2",
    title: card.title,
    includedInUi: true,
    includedInGateReadiness: true,
    rawStoredStatus: rawStatus ?? null,
    recalculatedStatus: card.status || readinessStatus,
    readinessStatus,
    readinessNormalizedStatus: guruExportDiagnosticNormalizedV223(readinessStatus),
    displayedStatus: status,
    statusLabel: guruExportDiagnosticStatusLabelV223(status),
    resolver: { name: "g2MetrikaQualityStatusV360", codeAnchor: "gate2-metrika-goals-quality.js" },
    fallbackOrder: ["METRIKA_QUALITY"],
    fallbackExpression: isProduct
      ? "выбранный product_id; готовность Gate 2 — по всем товарам; Gate 0 не наследуется"
      : "собственная ручная проверка Gate 2; Gate 0 не наследуется",
    sourceChain: [source],
    selectedSource: {
      key: source.key,
      sourceType: source.sourceType,
      gateId: source.gateId,
      cardId: source.cardId,
      itemId: "",
      path: source.path,
      title: source.title,
      rawStatus: source.rawStatus,
      result: status,
    },
    result: status,
    selectedProduct: product ? { id: product.id, name: product.name || "" } : null,
    productStatuses: isProduct
      ? g2MetrikaQualityProductsV360(state).map((item) => ({
        product_id: item.id,
        name: item.name || "",
        status: g2MetrikaQualityPrimaryStatusV361(card, item.id),
      }))
      : undefined,
    warnings: card.status && card.status !== readinessStatus
      ? ["Stored card.status differs from the independent Gate 2 check."]
      : [],
  };
};

function g2MetrikaQualitySectionResultV360(cards) {
  const statuses = cards.map((card) => g2MetrikaQualityStatusV360(card, state));
  const applicable = statuses.filter((status) => status !== "not_needed");
  const ready = applicable.filter((status) => status === "ready").length;
  const skipped = statuses.length - applicable.length;
  const status = applicable.some((item) => item === "problem")
    ? "problem"
    : applicable.length && ready === applicable.length
      ? "ready"
      : applicable.some((item) => item !== "not_started") || skipped
        ? "in_progress"
        : "not_started";
  return {
    status,
    progress: `${ready} из ${applicable.length} готово${skipped ? ` · ${skipped} не требуется` : ""}`,
  };
}

const __g2MetrikaPrevSectionStatusV360 = g2SectionStatus;
g2SectionStatus = function (cards) {
  return cards?.length && cards.every((card) => G2_METRIKA_QUALITY_BY_ID_V360.has(card.id))
    ? g2MetrikaQualitySectionResultV360(cards).status
    : __g2MetrikaPrevSectionStatusV360(cards);
};
const __g2MetrikaPrevSectionProgressV360 = g2SectionProgress;
g2SectionProgress = function (cards) {
  return cards?.length && cards.every((card) => G2_METRIKA_QUALITY_BY_ID_V360.has(card.id))
    ? g2MetrikaQualitySectionResultV360(cards).progress
    : __g2MetrikaPrevSectionProgressV360(cards);
};

function g2MetrikaQualityFieldV360(card, key, label, value, type = "text", placeholder = "", extra = "") {
  return `<label class="g2-metrika-field-v360"><span>${escapeHtml(label)}</span><input type="${escapeAttr(type)}" data-g2-metrika-card-v360="${escapeAttr(card.id)}" data-g2-metrika-field-v360="${escapeAttr(key)}" ${extra} value="${escapeAttr(value || "")}" placeholder="${escapeAttr(placeholder)}" /></label>`;
}

function g2MetrikaQualitySelectV360(card, key, label, value, options, extra = "") {
  return `<label class="g2-metrika-field-v360"><span>${escapeHtml(label)}</span><select data-g2-metrika-card-v360="${escapeAttr(card.id)}" data-g2-metrika-field-v360="${escapeAttr(key)}" ${extra}>${options.map(([option, text]) => `<option value="${escapeAttr(option)}"${value === option ? " selected" : ""}>${escapeHtml(text)}</option>`).join("")}</select></label>`;
}

function g2MetrikaPlatformPageV1(card, row, index, collection) {
  const selected = row?.pageRefV1?.group && row?.pageRefV1?.id
    ? `${row.pageRefV1.group}:${row.pageRefV1.id}` : "";
  const url = megaPlatformPageRefUrl(row?.pageRefV1, state);
  const label = collection === "pageChecks" ? "URL проверенной страницы" : "Страница показа";
  return `<label class="g2-metrika-field-v360"><span>${label} · из Платформы</span>
    <select data-g2-metrika-platform-page-v1="${escapeAttr(card.id)}" data-g2-metrika-collection-v1="${escapeAttr(collection)}" data-g2-metrika-index-v1="${index}">
      <option value="">Страница не выбрана</option>${megaPlatformAllPages(state).map((page) =>
        `<option value="${escapeAttr(`${page.group}:${page.id}`)}" ${selected === `${page.group}:${page.id}` ? "selected" : ""}>${escapeHtml(page.name)}</option>`).join("")}
    </select><span class="mega-platform-source-value">${url ? escapeHtml(url) : "URL не указан"}</span></label>`;
}

document.addEventListener("change", (event) => {
  const select = event.target?.closest?.("[data-g2-metrika-platform-page-v1]");
  if (!select) return;
  const card = state?.gates?.find((gate) => gate.id === "gate-2")?.cards
    ?.find((item) => item.id === select.dataset.g2MetrikaPlatformPageV1);
  const row = g2MetrikaQualityDataV360(card)?.[select.dataset.g2MetrikaCollectionV1]
    ?.[Number(select.dataset.g2MetrikaIndexV1)];
  if (!row) return;
  const colon = select.value.indexOf(":");
  row.pageRefV1 = colon < 0 ? null : {
    group: select.value.slice(0, colon), id: select.value.slice(colon + 1),
  };
  flashSaving();
  renderGate();
});

const G2_METRIKA_YES_NO_V360 = [["", "Не проверено"], ["yes", "Да"], ["no", "Нет"]];
const G2_METRIKA_GOAL_FIRED_V366 = [["", "Не проверено"], ["yes", "Сработала"], ["no", "Не сработала"]];
const G2_METRIKA_RESULT_OPTIONS_V360 = [
  ["", "Не проверено"],
  ["works", "Работает"],
  ["needs_improvement", "Требует улучшения"],
  ["broken", "Не работает"],
  ["missing", "Отсутствует"],
];

const G2_METRIKA_COLLECTIONS_V361 = Object.freeze({
  pageChecks: {
    label: "Страница", add: "+ Добавить страницу",
    fields: [
      ["url", "URL проверенной страницы", "url"],
      ["testVisitAt", "Время контрольного визита", "datetime-local"],
      ["visitObserved", "Визит виден в Метрике?", "select", G2_METRIKA_YES_NO_V360],
      ["evidenceUrl", "Ссылка на отчёт для этой страницы", "url"],
    ],
  },
  callRoutes: {
    label: "Номер / маршрут", add: "+ Добавить номер или маршрут",
    fields: [
      ["phoneNumber", "Номер телефона"],
      ["landingUrl", "Страница или маршрут показа номера"],
      ["goalId", "ID цели звонка"],
      ["testCallAt", "Время тестового звонка", "datetime-local"],
      ["callObserved", "Звонок виден в цели?", "select", G2_METRIKA_YES_NO_V360],
      ["evidenceUrl", "Ссылка на подтверждение звонка", "url"],
    ],
  },
  emailRoutes: {
    label: "Адрес / маршрут", add: "+ Добавить адрес или маршрут",
    fields: [
      ["emailAddress", "Адрес входящих писем", "email"],
      ["landingUrl", "Страница или маршрут с адресом"],
      ["goalId", "ID цели входящего письма"],
      ["testEmailAt", "Время тестового письма", "datetime-local"],
      ["emailReceived", "Письмо реально получено?", "select", G2_METRIKA_YES_NO_V360],
      ["goalObserved", "Цель сработала?", "select", G2_METRIKA_YES_NO_V360],
      ["evidenceUrl", "Ссылка на подтверждение", "url"],
    ],
  },
  widgets: {
    label: "Виджет", add: "+ Добавить виджет",
    fields: [
      ["name", "Название виджета"],
      ["placementUrl", "Где показывается виджет"],
      ["goalId", "ID цели"],
      ["testAt", "Время тестового обращения", "datetime-local"],
      ["goalFired", "Цель сработала?", "select", G2_METRIKA_YES_NO_V360],
      ["evidenceUrl", "Ссылка на подтверждение", "url"],
    ],
  },
  campaignChecks: {
    label: "Кампания / запуск", add: "+ Добавить кампанию или план запуска",
    fields: [
      ["campaign", "Кампания или планируемый запуск"],
      ["mainGoalId", "Главная бизнес-цель этой кампании"],
      ["auxiliaryGoalIds", "Вспомогательные цели (если есть)"],
      ["auxiliaryUsedAsPrimary", "Вспомогательные цели выбраны главным KPI?", "select", G2_METRIKA_YES_NO_V360],
      ["evidenceUrl", "Ссылка на настройки / доказательство", "url"],
    ],
  },
});

function g2MetrikaQualityCollectionHtmlV361(card, data, key) {
  const config = G2_METRIKA_COLLECTIONS_V361[key];
  const rows = Array.isArray(data[key]) ? data[key] : [];
  return `<div class="g2-metrika-wide-v360 g2-metrika-collection-v361" data-g2-metrika-list-v361="${escapeAttr(key)}">
    ${rows.length ? rows.map((row, index) => {
      const attrs = `data-g2-metrika-card-v360="${escapeAttr(card.id)}" data-g2-metrika-collection-v361="${escapeAttr(key)}" data-g2-metrika-index-v361="${index}"`;
      return `<div class="g2-metrika-product-v360"><div class="g2-metrika-widget-head-v360"><strong>${escapeHtml(config.label)} ${index + 1}</strong><button type="button" class="small-btn" data-g2-metrika-remove-row-v361="${escapeAttr(key)}" data-g2-metrika-card-v360="${escapeAttr(card.id)}" data-g2-metrika-index-v361="${index}">Удалить</button></div>
        <div class="g2-metrika-grid-v360">${config.fields.map(([field, label, type = "text", options]) =>
          (key === "pageChecks" && field === "url") ||
          (["callRoutes", "emailRoutes"].includes(key) && field === "landingUrl")
          ? g2MetrikaPlatformPageV1(card, row, index, key) : type === "select"
          ? g2MetrikaQualitySelectV360(card, field, label, row?.[field] || "", options, attrs)
          : g2MetrikaQualityFieldV360(card, field, label, row?.[field], type, "", attrs)
        ).join("")}</div></div>`;
    }).join("") : '<p class="g2-metrika-hint-v360">Пока нет проверенных вариантов.</p>'}
    <button type="button" class="small-btn" data-g2-metrika-add-row-v361="${escapeAttr(key)}" data-g2-metrika-card-v360="${escapeAttr(card.id)}">${escapeHtml(config.add)}</button>
  </div>`;
}

function g2MetrikaQualityProductRowsV360(card, data) {
  const product = guruV194SelectedProduct(state);
  if (!product)
    return '<p class="g2-metrika-hint-v360">Сначала выберите категорию и товар в общем селекторе выше.</p>';
  const row = (Array.isArray(data.perProduct) ? data.perProduct : [])
    .find((item) => item?.product_id === product.id) || {};
  const attrs = `data-g2-metrika-product-v360="${escapeAttr(product.id)}"`;
  return `<div class="g2-metrika-wide-v360 g2-metrika-selected-product-v361" data-g2-metrika-selected-product-v361="${escapeAttr(product.id)}">
    <strong>Проверяем только: ${escapeHtml(product.name || product.id)}</strong>
    <div class="g2-metrika-grid-v360">
      ${g2MetrikaQualityFieldV360(card, "goalId", "ID или название цели", row.goalId, "text", "", attrs)}
      ${g2MetrikaQualitySelectV360(card, "triggerType", "Тип срабатывания", row.triggerType || "", [["", "Не выбран"], ["thank_you_page", "Страница «Спасибо»"], ["explicit_event", "Явное событие — требует проверки"], ["auto_goal", "Автоцель — не подходит"]], attrs)}
      <label class="g2-metrika-field-v360"><span>URL страницы «Спасибо» · из Платформы</span><span class="mega-platform-source-value">${escapeHtml(megaPlatformUrl("fixed", "thank_you", state) || "URL не указан")}</span></label>
      ${g2MetrikaQualityFieldV360(card, "testConversionAt", "Время тестовой конверсии", row.testConversionAt, "datetime-local", "", attrs)}
      ${g2MetrikaQualitySelectV360(card, "goalFired", "Цель сработала?", row.goalFired || "", G2_METRIKA_GOAL_FIRED_V366, attrs)}
      ${g2MetrikaQualitySelectV360(card, "result", "Итог ручной проверки", row.result || "", G2_METRIKA_RESULT_OPTIONS_V360, attrs)}
      ${g2MetrikaQualityFieldV360(card, "evidenceUrl", "Ссылка на отчёт / доказательство", row.evidenceUrl, "url", "https://…", attrs)}
      ${g2MetrikaQualityFieldV360(card, "testedAt", "Когда проверено", row.testedAt, "datetime-local", "", attrs)}
      <label class="g2-metrika-field-v360 g2-metrika-wide-v360"><span>Комментарий по выбранному товару</span><textarea data-g2-metrika-card-v360="${escapeAttr(card.id)}" data-g2-metrika-product-v360="${escapeAttr(product.id)}" data-g2-metrika-field-v360="comment" rows="2">${escapeHtml(row.comment || "")}</textarea></label>
    </div>
  </div>`;
}

function g2MetrikaQualitySpecificFieldsV360(card, data) {
  const coverage = g2MetrikaQualitySelectV360(card, "coverageConfirmed", "Все используемые варианты перечислены?", data.coverageConfirmed || "", G2_METRIKA_YES_NO_V360);
  if (card.id === "g2-metrika-goals-traffic") return `
    ${g2MetrikaQualityFieldV360(card, "counterId", "ID счётчика", data.counterId)}
    ${coverage}${g2MetrikaQualityCollectionHtmlV361(card, data, "pageChecks")}`;
  if (card.id === "g2-metrika-goals-primary") return g2MetrikaQualityProductRowsV360(card, data);
  if (card.id === "g2-metrika-goals-calls") return `
    ${g2MetrikaQualityFieldV360(card, "calltrackingSystem", "Система коллтрекинга", data.calltrackingSystem)}
    ${coverage}${g2MetrikaQualityCollectionHtmlV361(card, data, "callRoutes")}`;
  if (card.id === "g2-metrika-goals-email") return `
    ${g2MetrikaQualityFieldV360(card, "trackingSystem", "Система email-трекинга / CRM", data.trackingSystem)}
    ${coverage}${g2MetrikaQualityCollectionHtmlV361(card, data, "emailRoutes")}`;
  if (card.id === "g2-metrika-goals-widgets") return `
    ${coverage}${g2MetrikaQualityCollectionHtmlV361(card, data, "widgets")}`;
  return `
    ${g2MetrikaQualitySelectV360(card, "policyConfirmed", "Правило для бизнес-конверсий согласовано?", data.policyConfirmed || "", G2_METRIKA_YES_NO_V360)}
    ${coverage}${g2MetrikaQualityCollectionHtmlV361(card, data, "campaignChecks")}`;
}

const G2_METRIKA_LEGACY_FIELDS_V361 = Object.freeze({
  "g2-metrika-goals-traffic": [["checkedPages", "Проверенные страницы"], ["testVisitAt", "Время визита"], ["visitObserved", "Визит виден"]],
  "g2-metrika-goals-primary": [["result", "Общий результат"], ["evidenceUrl", "Общее доказательство"], ["testedAt", "Общая дата проверки"], ["comment", "Общий комментарий"]],
  "g2-metrika-goals-calls": [["goalId", "Прежняя одиночная цель"], ["testCallAt", "Прежний тестовый звонок"], ["callObserved", "Прежний результат"]],
  "g2-metrika-goals-email": [["goalId", "Прежняя одиночная цель"], ["testEmailAt", "Прежнее тестовое письмо"], ["emailObserved", "Прежний результат"]],
  "g2-metrika-goals-kpi": [["primaryGoalIds", "Прежний общий список главных целей"], ["auxiliaryGoalIds", "Прежний список вспомогательных целей"], ["auxiliaryUsedAsPrimary", "Прежний ответ о KPI"]],
});

function g2MetrikaQualityLegacyHtmlV361(card, data) {
  const rows = (G2_METRIKA_LEGACY_FIELDS_V361[card.id] || [])
    .filter(([key]) => g2MetrikaQualityTouchedV360(data[key]));
  if (!rows.length) return "";
  return `<details class="g2-metrika-legacy-v361"><summary>Ранее введённые общие значения · не засчитываются автоматически</summary>
    <dl>${rows.map(([key, label]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(String(data[key]))}</dd></div>`).join("")}</dl>
  </details>`;
}

function g2MetrikaQualityCardHtmlV360(card) {
  const definition = G2_METRIKA_QUALITY_BY_ID_V360.get(card.id);
  const data = g2MetrikaQualityDataV360(card);
  const status = g2MetrikaQualityStatusV360(card, state);
  const product = definition.scope === "product";
  return `<article class="g2-check-row g2-metrika-card-v360" data-card="${escapeAttr(card.id)}" data-g2-scope-kind="${product ? "product" : "company"}">
    <div class="g2-check-title"><span>${escapeHtml(card.title)}</span><span class="status-pill status-${escapeAttr(status)}">${escapeHtml(STATUS_LABELS[status] || status)}</span></div>
    <div class="g2-metrika-grid-v360">
      ${definition.optional ? g2MetrikaQualitySelectV360(card, "applicability", "Применимость", data.applicability || "", [["", "Не определено"], ["required", "Используется"], ["not_needed", "Не требуется"]]) : ""}
      ${definition.optional ? g2MetrikaQualityFieldV360(card, "applicabilityReason", "Почему не требуется (если применимо)", data.applicabilityReason) : ""}
      ${g2MetrikaQualitySpecificFieldsV360(card, data)}
      ${product ? "" : `
        ${g2MetrikaQualitySelectV360(card, "result", "Итог ручной проверки", data.result || "", G2_METRIKA_RESULT_OPTIONS_V360)}
        ${g2MetrikaQualityFieldV360(card, "evidenceUrl", "Общая ссылка на отчёт / доказательство", data.evidenceUrl, "url", "https://…")}
        ${g2MetrikaQualityFieldV360(card, "testedAt", "Когда проверено", data.testedAt, "datetime-local")}
        <label class="g2-metrika-field-v360 g2-metrika-wide-v360"><span>Комментарий</span><textarea data-g2-metrika-card-v360="${escapeAttr(card.id)}" data-g2-metrika-field-v360="comment" rows="2">${escapeHtml(data.comment || "")}</textarea></label>`}
    </div>
    ${g2MetrikaQualityLegacyHtmlV361(card, data)}
  </article>`;
}

const __g2MetrikaPrevCardHtmlV360 = g2CardHtml;
g2CardHtml = function (card) {
  if (G2_METRIKA_QUALITY_BY_ID_V360.has(card?.id))
    return g2MetrikaQualityCardHtmlV360(card);
  return __g2MetrikaPrevCardHtmlV360(card);
};

const __g2MetrikaPrevCompanySectionHtmlV360 = g2CompanySectionHtmlV226;
function g2MetrikaProductContextHtmlV368(product) {
  const page = product && typeof g3ProductJourneyPageSource === "function"
    ? g3ProductJourneyPageSource(product) : null;
  const landingUrl = product ? megaPlatformProductUrl(product, state) : "";
  const companyCounter = typeof g2MetrikaCompanyCounterV374 === "function"
    ? g2MetrikaCompanyCounterV374(state) : "";
  const thankYouUrl = megaPlatformUrl("fixed", "thank_you", state);
  return `<div id="g2-mp-context-v368" class="g2-mp-context-v368" aria-label="Общий контекст проверки">
    <span>Проверка только выбранного товара: <strong>${escapeHtml(product?.name || product?.id || "Товар не выбран")}</strong>.</span>
    <span>URL посадочной · из Платформы: <strong>${escapeHtml(landingUrl || "URL не указан")}</strong></span>
    <span>Номер счётчика · Компания: <a href="#g2-metrika-company-counter" data-g2-mc-link="g2-metrika-company-counter"><strong>${escapeHtml(companyCounter || "Не указан")}</strong></a></span>
    <span>URL страницы «Спасибо» · из Платформы: <strong>${escapeHtml(thankYouUrl || "URL не указан")}</strong></span>
    <span class="g2-mp-context-note-v368">Остальные товары не показаны и не изменяются.</span>
  </div>`;
}

g2CompanySectionHtmlV226 = function (section, scope = "company") {
  if (![G2_METRIKA_QUALITY_COMPANY_SECTION_V361, G2_METRIKA_QUALITY_PRODUCT_SECTION_V361].includes(section?.key))
    return __g2MetrikaPrevCompanySectionHtmlV360(section, scope);
  const status = g2SectionStatus(section.cards);
  const isProduct = section.key === G2_METRIKA_QUALITY_PRODUCT_SECTION_V361;
  const product = isProduct ? guruV194SelectedProduct(state) : null;
  const accordionKey = g2SectionAccordionKeyV362(section, scope);
  const open = getGate2AccordionState().sections[accordionKey] !== false;
  const bodyId = `g2-section-${scope}-${section.key}`;
  return `<section class="g1-section ${open ? "is-open" : ""} g2-open-section g2-metrika-section-v360" data-g2-accordion-key-v362="${escapeAttr(accordionKey)}" data-g2-metrika-quality-section-v360="${isProduct ? "product" : "company"}">
    <button type="button" class="g1-section-header g2-open-header" data-g2-toggle-section="${escapeAttr(accordionKey)}" aria-expanded="${open ? "true" : "false"}" aria-controls="${escapeAttr(bodyId)}"><span class="g1-section-left"><span class="g1-section-title">${escapeHtml(section.title)}</span><span class="g1-section-progress">${escapeHtml(g2SectionProgress(section.cards))}</span></span><span class="status-pill status-${escapeAttr(status)}">${escapeHtml(STATUS_LABELS[status] || status)}</span><span class="g2-section-chevron-v362" aria-hidden="true"></span></button>
    <div id="${escapeAttr(bodyId)}" class="g1-section-body g2-section-body" ${open ? "" : "hidden"}>${isProduct
      ? g2MetrikaProductContextHtmlV368(product)
      : '<p class="g2-metrika-intro-v360">Общие настройки счётчика для всего проекта. Товарные проверки читают данные отсюда.</p>'}${section.cards.map(g2CardHtml).join("")}
    </div>
  </section>`;
};

function g2MetrikaQualityRefreshV360(card) {
  const row = document.querySelector(`[data-card="${CSS.escape(card.id)}"]`);
  const status = g2MetrikaQualityStatusV360(card, state);
  card.status = card.id === "g2-metrika-goals-primary"
    ? g2MetrikaQualityPrimaryAggregateV361(card, state)
    : status;
  const pill = row?.querySelector(".g2-check-title .status-pill");
  if (pill) {
    pill.className = `status-pill status-${status}`;
    pill.textContent = STATUS_LABELS[status] || status;
  }
  const section = row?.closest("[data-g2-metrika-quality-section-v360]");
  const gate = state?.gates?.find((item) => item.id === "gate-2");
  const cards = G2_METRIKA_QUALITY_CARDS_V360.map((definition) =>
    (definition.scope === "product") === (section?.dataset.g2MetrikaQualitySectionV360 === "product")
      ? gate?.cards?.find((item) => item.id === definition.id)
      : null,
  ).filter(Boolean);
  const result = g2MetrikaQualitySectionResultV360(cards);
  const sectionPill = section?.querySelector(":scope > .g1-section-header .status-pill");
  const progress = section?.querySelector(":scope > .g1-section-header .g1-section-progress");
  if (sectionPill) {
    sectionPill.className = `status-pill status-${result.status}`;
    sectionPill.textContent = STATUS_LABELS[result.status] || result.status;
  }
  if (progress) progress.textContent = result.progress;
  renderGateNav();
}

function g2MetrikaQualityUpdateV360(target) {
  const card = state?.gates?.find((gate) => gate.id === "gate-2")
    ?.cards?.find((item) => item.id === target.dataset.g2MetrikaCardV360);
  if (!card || !G2_METRIKA_QUALITY_BY_ID_V360.has(card.id)) return;
  const field = target.dataset.g2MetrikaFieldV360;
  if (!field) return;
  const data = g2MetrikaQualityEnsureDataV360(card);
  const productId = target.dataset.g2MetrikaProductV360;
  const collection = target.dataset.g2MetrikaCollectionV361;
  const collectionIndex = target.dataset.g2MetrikaIndexV361;
  if (productId) {
    if (guruV194SelectedProduct(state)?.id !== productId) return;
    data.perProduct = Array.isArray(data.perProduct) ? data.perProduct : [];
    let row = data.perProduct.find((item) => item.product_id === productId);
    if (!row) {
      row = { product_id: productId };
      data.perProduct.push(row);
    }
    row[field] = target.value;
  } else if (collection && Object.hasOwn(G2_METRIKA_COLLECTIONS_V361, collection)) {
    const rows = Array.isArray(data[collection]) ? data[collection] : [];
    const row = rows[Number(collectionIndex)];
    if (!row) return;
    row[field] = target.value;
  } else {
    data[field] = target.value;
  }
  g2MetrikaQualityRefreshV360(card);
  flashSaving();
}

document.addEventListener("input", (event) => {
  const target = event.target?.closest?.("[data-g2-metrika-card-v360][data-g2-metrika-field-v360]");
  if (target && target.tagName !== "SELECT" && target.type !== "datetime-local")
    g2MetrikaQualityUpdateV360(target);
});
document.addEventListener("change", (event) => {
  const target = event.target?.closest?.("[data-g2-metrika-card-v360][data-g2-metrika-field-v360]");
  if (target && (target.tagName === "SELECT" || target.type === "datetime-local"))
    g2MetrikaQualityUpdateV360(target);
});
document.addEventListener("click", (event) => {
  const removeRow = event.target?.closest?.("[data-g2-metrika-remove-row-v361]");
  if (removeRow) {
    const card = state?.gates?.find((gate) => gate.id === "gate-2")
      ?.cards?.find((item) => item.id === removeRow.dataset.g2MetrikaCardV360);
    const data = card && g2MetrikaQualityEnsureDataV360(card);
    const collection = removeRow.dataset.g2MetrikaRemoveRowV361;
    const index = Number(removeRow.dataset.g2MetrikaIndexV361);
    if (!Object.hasOwn(G2_METRIKA_COLLECTIONS_V361, collection) ||
      !Array.isArray(data?.[collection]) || !Number.isInteger(index) ||
      index < 0 || index >= data[collection].length) return;
    data[collection].splice(index, 1);
    if (card) recalculateStatusForCard(card, state);
    flashSaving();
    renderGate();
    return;
  }
  const addRow = event.target?.closest?.("[data-g2-metrika-add-row-v361]");
  if (addRow) {
    const card = state?.gates?.find((gate) => gate.id === "gate-2")
      ?.cards?.find((item) => item.id === addRow.dataset.g2MetrikaCardV360);
    if (!card) return;
    const collection = addRow.dataset.g2MetrikaAddRowV361;
    if (!Object.hasOwn(G2_METRIKA_COLLECTIONS_V361, collection)) return;
    const data = g2MetrikaQualityEnsureDataV360(card);
    data[collection] = Array.isArray(data[collection]) ? data[collection] : [];
    data[collection].push({});
    recalculateStatusForCard(card, state);
    flashSaving();
    renderGate();
    return;
  }
});

const __g2MetrikaPrevPrepareCardsV360 = prepareSystemCards;
prepareSystemCards = function (workspace) {
  __g2MetrikaPrevPrepareCardsV360(workspace);
  const gate = workspace?.gates?.find((item) => item.id === "gate-2");
  if (gate) ensureGate2Structure(gate);
};

window.g2MetrikaQualityStatusV360 = g2MetrikaQualityStatusV360;
