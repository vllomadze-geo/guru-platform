/* Gate 1 product criteria: one compact view over the existing comparison record. */
const G1PC_CRITERIA_V603 = [
  { id: "audience", title: "Та же аудитория", group: 1, source: "segment", fields: [["Кому", "marketSegment"]] },
  { id: "region", title: "Тот же регион", group: 1, source: "geography", fields: [["География", "marketGeography"]] },
  { id: "business", title: "Тот же тип бизнеса и производство", group: 1, source: "business", fields: [["Тип бизнеса", "businessType"], ["Как сделан продукт", "made"], ["Сведения о продукте", "product"]] },
  { id: "channels", title: "Те же каналы продаж", group: 1, source: "channels", fields: [["Где продаёт", "salesChannels"]] },
  { id: "ads", title: "Те же запросы в рекламе", group: 1, source: "phrases", fields: [["Реклама и ключевые слова", "adsKeywords"], ["Тексты объявлений", "advertisements"]] },
  { id: "task", title: "Закрывает задачу клиента", group: 2, source: "jtbd", fields: [["Закрывает задачу клиента", "taskClosure"], ["Позиционирование", "positioning"]] },
  { id: "parity", title: "Есть всё обязательное для категории (паритет)", group: 2, source: "parity", fields: [["Паритет", "parity"], ["Сильные стороны", "strengths"], ["Слабые стороны", "weaknesses"]] },
  { id: "offer", title: "Понятный оффер и призыв к действию", group: 2, source: "offer", fields: [["Оффер / CTA", "offerCta"], ["Основной CTA", "cta"]] },
  { id: "delivery", title: "Доставка надёжная и в срок", group: 2, source: "delivery", fields: [["Доставка", "delivery"]] },
  { id: "trust", title: "Есть доверие: отзывы, гарантии", group: 2, source: "trust", fields: [["Доверие", "trust"], ["Что нам взять", "takeaway"], ["Чем отличаться", "differentiate"]] },
];

// The earlier comparison stored answers in stepsV539. Bergen copied some of
// them into bergenV543, often adding labels or combining fields. Keep the
// original text visible verbatim in Details without making it a second input.
const G1PC_ARCHIVED_FIELDS_V603 = {
  audience: [[5, "segment", "Сегмент"], [5, "jtbdFunctional", "Функциональная задача"], [5, "jtbdSocial", "Социальная задача"], [5, "jtbdEmotional", "Эмоциональная задача"]],
  region: [[10, "regions", "Регионы"]],
  business: [[3, "analogName", "Название аналога"], [3, "analogUrl", "URL аналога"], [3, "characteristics", "Характеристики"], [4, "priceAnalog", "Цена аналога"], [4, "priceMin", "Минимальная цена"], [4, "priceMax", "Максимальная цена"]],
  channels: [[9, "landingStructure", "Посадочная"], [9, "payment", "Оплата"], [9, "channels", "Каналы"], [9, "trafficSources", "Источники трафика"]],
  ads: [[8, "organicPhrases", "Органика"], [8, "adPhrases", "Реклама"], [8, "adTexts", "Тексты"], [8, "offers", "Офферы"], [8, "triggers", "Триггеры"]],
  task: [[6, "positioning", "Позиционирование"], [6, "quote", "Цитата title / H1"]],
  parity: [[7, "parity", "Паритет"], [7, "competitorDifferences", "Отличия конкурента"], [7, "ourDifferences", "Наши отличия"]],
  offer: [[9, "cta", "CTA"]],
  delivery: [[10, "deliveryTime", "Сроки"], [10, "deliveryCost", "Стоимость"], [10, "pickup", "Самовывоз"]],
  trust: [[11, "rating", "Рейтинг"], [11, "reviewCount", "Число отзывов"], [11, "praise", "Похвалы"], [11, "complaints", "Жалобы"],
    [12, "strength1", "Сильная 1"], [12, "strength2", "Сильная 2"], [12, "strength3", "Сильная 3"],
    [12, "weakness1", "Слабая 1"], [12, "weakness2", "Слабая 2"], [12, "weakness3", "Слабая 3"],
    [12, "takeaway", "Вывод для нас"], [12, "legacySummary", "Перенесённый вывод"],
    [12, "fixedDate", "Дата проверки"], [12, "evidence", "Источник проверки"]],
};

// An older saved delivery value already contains replacement characters.
// Repair only this exact, identifiable value in the live workspace and its
// persisted mirrors; leave every other product field untouched.
const g1pcDeliveryRepairSeenV603 = new WeakMap();
function g1pcRepairDeliveryV603(workspace) {
  if (!workspace || g1pcDeliveryRepairSeenV603.get(workspace) === workspace.gates) return;
  g1pcDeliveryRepairSeenV603.set(workspace, workspace.gates);
  const damaged = "Провери��, бережно упакуем и поможем получить его вовремя";
  const repaired = "Проверим, бережно упакуем и поможем получить его вовремя";
  const seen = new WeakSet(); let changes = 0;
  const visit = value => {
    if (!value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    for (const [key, child] of Object.entries(value)) {
      if (key === "productDeliveryGuaranteeV253" && child === damaged) {
        value[key] = repaired; changes++;
      } else if (child && typeof child === "object") visit(child);
    }
  };
  visit(workspace.gates); visit(workspace.gate); visit(workspace.structure);
  if (changes) flashSaving({ skipDerivedRefresh: true });
}

function g1pcCriteriaSourcesV603(ctx, jtbds) {
  const snapshot = ctx.snapshot || {};
  const row = snapshot.page?.row || {};
  const context = row.contextFields || {};
  const reviews = (Array.isArray(context.productReviewsV514) ? context.productReviewsV514 : [])
    .map(item => String(item?.text || "").trim()).filter(Boolean);
  const delivery = [context.productDeliveryGuaranteeV253,
    ...(Array.isArray(context.productDeliveryCardsV255) ? context.productDeliveryCardsV255
      .map(item => [item.title, item.description].filter(Boolean).join(": ")) : [])]
    .filter(Boolean).join("\n");
  const gate0 = field => ({ gateId: "gate-0", kind: "gate0-scoped", productId: ctx.product.id, field });
  const gate1 = { gateId: "gate-1", kind: "gate1-page", cardId: snapshot.page?.card?.id || "", rowId: row.id || "" };
  const phrases = jtbds.flatMap(group => group.phrases.map(phrase => phrase.value));
  const uniquePhrases = [...new Set(phrases)];
  return {
    segment: { text: snapshot.segment || "", target: gate0("segments") },
    geography: { text: ctx.geography || "", target: { gateId: "gate-0" } },
    business: { text: [state.project?.niche || state.project?.type, context.productCreationV253].filter(Boolean).join(" · "), target: gate1 },
    channels: { text: [snapshot.landing, g1BergenChannelsV543(snapshot)].filter(Boolean).join(" · "), target: { gateId: "gate-4", productId: ctx.product.id } },
    phrases: { text: uniquePhrases.join("; "), target: gate0("jtbd") },
    jtbd: { text: [...jtbds.map(group => group.text), snapshot.positioning].filter(Boolean).join("\n"), target: gate0("jtbd") },
    parity: { text: [context.productCreationV253, context.productDescriptionV253, snapshot.description].filter(Boolean).join("\n"), target: gate1 },
    offer: { text: [snapshot.offer, snapshot.cta].filter(Boolean).join(" · "), target: gate0("offers") },
    delivery: { text: delivery, target: gate1 },
    trust: { text: [context.productRating && `Рейтинг: ${context.productRating}`,
      reviews.length && `Отзывы (${reviews.length}): ${reviews.join("; ")}`, context.productDeliveryGuaranteeV253].filter(Boolean).join("\n"), target: gate1 },
  };
}

function g1pcCriteriaAnswerV603(entry, competitor, criterion, source, jtbds) {
  if (!competitor) {
    if (criterion.group === 1) return "";
    return entry.comparisonCriteriaV603?.own?.[criterion.id] || (String(source?.text || "").trim() ? "yes" : "unknown");
  }
  if (criterion.group === 2 && g1BergenTypeV543(competitor, jtbds) === "substitute") return "not_required";
  const saved = competitor.comparisonCriteriaV603?.answers?.[criterion.id];
  if (["yes", "no", "unknown"].includes(saved)) return saved;
  if (criterion.id === "audience" && jtbds.length) return g1BergenMatchedJtbdCountV581(competitor, jtbds) ? "yes" : "no";
  return "unknown";
}

function g1pcCriteriaStatsV603(entry, competitors, sources, jtbds) {
  let total = 0; let answered = 0;
  const byCompetitor = new Map();
  for (const competitor of competitors) byCompetitor.set(competitor.id, { up: 0, down: 0, missing: 0 });
  for (const criterion of G1PC_CRITERIA_V603) {
    const own = g1pcCriteriaAnswerV603(entry, null, criterion, sources[criterion.source], jtbds);
    if (criterion.group === 2) { total++; if (own !== "unknown") answered++; }
    for (const competitor of competitors) {
      const answer = g1pcCriteriaAnswerV603(entry, competitor, criterion, sources[criterion.source], jtbds);
      if (answer === "not_required") continue;
      total++; if (answer !== "unknown") answered++;
      const stats = byCompetitor.get(competitor.id);
      if (answer === "unknown") stats.missing++;
      if (criterion.group === 2 && own === "yes" && answer === "no") stats.up++;
      if (criterion.group === 2 && own === "no" && answer === "yes") stats.down++;
    }
  }
  return { total, answered, status: total && answered === total ? "ready" : "in_progress", byCompetitor };
}

function g1pcCriteriaSegmentsV603(value, column, criterionId, competitorId = "") {
  const options = [["yes", "Да"], ["no", "Нет"], ["unknown", "Неизвестно"]];
  return `<div class="g1pc-criteria-segments${value === "unknown" ? " is-unknown" : ""}" role="radiogroup" aria-label="${escapeAttr(criterionId)} · ${column === "own" ? "Мы" : "Конкурент"}">
    ${options.map(([key, label]) => `<button type="button" role="radio" aria-checked="${value === key}" tabindex="${value === key ? "0" : "-1"}" data-g1pc-criteria-answer="${key}" data-g1pc-criteria-column="${column}" data-g1pc-criteria-id="${criterionId}"${competitorId ? ` data-g1pc-criteria-competitor="${escapeAttr(competitorId)}"` : ""}>${label}</button>`).join("")}</div>`;
}

function g1pcTypeChoiceNoteV603(competitor, jtbds) {
  const type = g1BergenTypeV543(competitor, jtbds);
  const explicit = ["direct", "substitute"].includes(competitor.bergenV543?.comparisonTypeV603);
  return `${explicit ? "Выбран вручную" : ["direct", "substitute"].includes(type) ? "Определён автоматически" : "Тип не определён"}${type === "substitute" ? " · этап 2 не требуется" : type === "direct" ? " · этап 2 доступен" : ""}`;
}

function g1pcTypeChoiceHtmlV603(competitor, jtbds, context = "grid") {
  const draft = context === "draft";
  const id = escapeAttr(competitor.id);
  const type = draft ? "" : g1BergenTypeV543(competitor, jtbds);
  const note = draft ? "Выберите тип после просмотра выдачи" : g1pcTypeChoiceNoteV603(competitor, jtbds);
  const name = draft ? "comparisonType" : `g1pc-type-${context}-${competitor.id}`;
  return `<div class="g1pc-choice-control g1pc-type-choice" data-g1pc-type-choice="${id}" role="group" aria-label="Тип конкурента ${escapeAttr(competitor.name || "")}">
    <div class="g1pc-choice-segments">${[["direct", "Прямой"], ["substitute", "Заменитель"]].map(([value, label]) =>
      `<label><input type="radio" name="${escapeAttr(name)}" value="${value}"${type === value ? " checked" : ""}${draft ? "" : ` data-g1pc-criteria-type="${id}"`}><span>${label}</span></label>`).join("")}</div>
    <small data-g1pc-type-note>${note}</small></div>`;
}

const G1PC_OLD_CORE_KEYS_V603 = {
  business: ["product_characteristics"], channels: ["presentation_sales"],
  task: ["jtbd"], parity: ["price", "strengths_weaknesses"],
};

function g1pcCriteriaLegacyFieldsV603(competitor, criterion, entry = null) {
  const fields = criterion.fields.map(([label, key]) => `<label class="g1pc-criteria-old-field"><span>${escapeHtml(label)}</span>${g1BergenFieldV543(competitor, key)}</label>`).join("");
  const archived = (G1PC_ARCHIVED_FIELDS_V603[criterion.id] || []).flatMap(([step, key, label]) => {
    const value = competitor.stepsV539?.[step]?.[key];
    return value == null || value === "" ? [] : [`<div class="g1pc-criteria-archive"><span>${escapeHtml(label)} · прежняя запись</span><p>${escapeHtml(String(value))}</p></div>`];
  }).join("");
  const classification = criterion.id === "audience" && competitor.classificationV539?.sameMarket
    ? `<div class="g1pc-criteria-archive"><span>Совпадение рынка · прежняя запись</span><p>${escapeHtml(String(competitor.classificationV539.sameMarket))}</p></div>`
    : criterion.id === "business" && competitor.classificationV539?.sameBusiness
      ? `<div class="g1pc-criteria-archive"><span>Совпадение бизнеса · прежняя запись</span><p>${escapeHtml(String(competitor.classificationV539.sameBusiness))}</p></div>` : "";
  const visibility = criterion.id === "ads" && competitor.visibilityByPhraseV540
    ? Object.entries(competitor.visibilityByPhraseV540).filter(([, value]) => value).map(([phrase, value]) =>
      `<div class="g1pc-criteria-archive"><span>Видимость запроса · прежняя запись</span><p>${escapeHtml(phrase)}: ${escapeHtml(String(value))}</p></div>`).join("") : "";
  const extra = criterion.id === "offer" && Array.isArray(competitor.bergenV543?.additionalCtasV576)
    ? `<div class="g1pc-criteria-old-field"><span>Дополнительные CTA</span>${g1BergenCompetitorCtasV576(competitor)}</div>` : "";
  const originalCells = (entry?.criteria || []).filter(row => G1PC_OLD_CORE_KEYS_V603[criterion.id]?.includes(row.coreKey))
    .map(row => { const cell = row.cells?.[competitor.id]; const value = typeof cell === "string" ? cell : cell?.text; return value == null || value === "" ? "" : `<div class="g1pc-criteria-archive"><span>${escapeHtml(row.name || row.coreKey)} · прежняя запись</span><p>${escapeHtml(String(value))}</p></div>`; }).join("");
  return fields + extra + archived + classification + visibility + originalCells;
}

function g1pcCriteriaRowV603(entry, criterion, sources, competitors, jtbds, ctx) {
  const source = sources[criterion.source];
  const own = g1pcCriteriaAnswerV603(entry, null, criterion, source, jtbds);
  const detailId = `g1pc-criteria-detail-${criterion.id}`;
  return `<div class="g1pc-layer-row g1pc-criteria-row" data-g1pc-criteria-row="${criterion.id}">
    <div class="g1pc-layer-rail"><button type="button" class="g1pc-criteria-detail-toggle" data-g1pc-criteria-toggle="${criterion.id}" aria-expanded="false" aria-controls="${detailId}"><span aria-hidden="true">▸</span><b>${escapeHtml(criterion.title)}</b><small>Детали</small></button></div>
    <div class="g1pc-layer-cell">${criterion.group === 1 ? `<div class="g1pc-criteria-source-line">${escapeHtml(source.text || "Источник не заполнен")}</div>` : g1pcCriteriaSegmentsV603(own, "own", criterion.id)}</div>
    ${competitors.map(competitor => { const answer = g1pcCriteriaAnswerV603(entry, competitor, criterion, source, jtbds); const ownSignal = criterion.group === 2 && own !== "unknown" && answer !== "unknown" && answer !== "not_required" ? own === "yes" && answer === "no" ? "▲" : own === "no" && answer === "yes" ? "▼" : "" : ""; return `<div class="g1pc-layer-cell" data-g1pc-criteria-cell="${escapeAttr(competitor.id)}:${criterion.id}">${answer === "not_required" ? '<span class="g1pc-criteria-na">не требуется</span>' : `${g1pcCriteriaSegmentsV603(answer, "competitor", criterion.id, competitor.id)}<span class="g1pc-criteria-signal" aria-label="${ownSignal === "▲" ? "Наше преимущество" : ownSignal === "▼" ? "Наше отставание" : ""}">${ownSignal}</span>`}</div>`; }).join("")}</div>
  <div class="g1pc-layer-row g1pc-criteria-details-row" id="${detailId}" data-g1pc-criteria-detail="${criterion.id}" hidden>
    <div class="g1pc-layer-rail">Детали</div>
    <div class="g1pc-layer-cell g1pc-criteria-detail-source"><strong>Наш источник</strong><p>${escapeHtml(source.text || "Источник не заполнен")}</p>${g1CompetitorSourceLinkV539(source.target)}${criterion.id === "ads" ? jtbds.map((group, index) => g1BergenJtbdSearchV548(ctx, group, index, entry, { companyComparison: true })).join("") : ""}</div>
    ${competitors.map(competitor => `<div class="g1pc-layer-cell g1pc-criteria-detail-competitor"><strong>${escapeHtml(competitor.name || "Конкурент")}</strong><label><span>Заметка</span><textarea rows="2" data-g1pc-criteria-note="${criterion.id}" data-g1pc-criteria-competitor="${escapeAttr(competitor.id)}" placeholder="Заметка">${escapeHtml(competitor.comparisonCriteriaV603?.notes?.[criterion.id] || "")}</textarea></label><div class="g1pc-criteria-old-fields"><b>Прежние поля: ${escapeHtml(criterion.fields.map(([label]) => label).join(", "))}</b>${g1pcCriteriaLegacyFieldsV603(competitor, criterion, entry)}</div></div>`).join("")}</div>`;
}

function g1ProductCriteriaHtmlV603(entry, ctx, jtbds, competitors = entry.competitors) {
  const sources = g1pcCriteriaSourcesV603(ctx, jtbds);
  const stats = g1pcCriteriaStatsV603(entry, entry.competitors, sources, jtbds);
  return `<div class="g1pc-layer-row g1pc-criteria-heading" id="g1pc-criteria-layer" data-g1pc-criteria><div class="g1pc-layer-rail"><h4>Критерии сравнения</h4></div><div class="g1pc-layer-cell g1pc-heading-meta"><span class="status-pill status-${stats.status}" data-g1pc-criteria-status>${escapeHtml(STATUS_LABELS[stats.status] || stats.status)}</span><small data-g1pc-criteria-count>${stats.answered} из ${stats.total} ответов</small></div></div>
      <div class="g1pc-layer-row g1pc-criteria-group"><div class="g1pc-layer-rail">Этап 1. Кто конкурент</div><div class="g1pc-layer-cell">Наш ориентир из источника</div>${competitors.map(() => '<div class="g1pc-layer-cell">Совпадает с нами?</div>').join("")}</div>
      ${G1PC_CRITERIA_V603.filter(row => row.group === 1).map(row => g1pcCriteriaRowV603(entry, row, sources, competitors, jtbds, ctx)).join("")}
      <div class="g1pc-layer-row g1pc-criteria-group"><div class="g1pc-layer-rail">Этап 2. Насколько он силён</div><div class="g1pc-layer-cell">У нас</div>${competitors.map(() => '<div class="g1pc-layer-cell">У него</div>').join("")}</div>
      ${G1PC_CRITERIA_V603.filter(row => row.group === 2).map(row => g1pcCriteriaRowV603(entry, row, sources, competitors, jtbds, ctx)).join("")}`;
}

function g1pcCriteriaRefreshV603(section, entry, ctx, jtbds) {
  if (section.querySelector("[data-g1pc-grid]")) g1ProductComparisonRefresh(section, "grid");
}

function g1pcCriteriaUpdateAnswerV603(button, entry, competitors, ctx, jtbds) {
  const group = button.closest(".g1pc-criteria-segments");
  const criteria = button.closest("[data-g1pc-grid]");
  if (!group || !criteria) return;
  group.querySelectorAll("[data-g1pc-criteria-answer]").forEach(option => {
    const selected = option === button;
    option.setAttribute("aria-checked", String(selected));
    option.tabIndex = selected ? 0 : -1;
  });
  group.classList.toggle("is-unknown", button.dataset.g1pcCriteriaAnswer === "unknown");
  const sources = g1pcCriteriaSourcesV603(ctx, jtbds);
  const stats = g1pcCriteriaStatsV603(entry, competitors, sources, jtbds);
  const status = criteria.querySelector("[data-g1pc-criteria-status]");
  if (status) {
    status.className = `status-pill status-${stats.status}`;
    status.textContent = STATUS_LABELS[stats.status] || stats.status;
  }
  const count = criteria.querySelector("[data-g1pc-criteria-count]");
  if (count) count.textContent = `${stats.answered} из ${stats.total} ответов`;
  const gateStatus = projectComparisonProductStatus(entry);
  const headerPill = criteria.closest("[data-g1pc-unified]")?.querySelector(".project-comparison-heading .status-pill");
  if (headerPill) { headerPill.className = `status-pill status-${gateStatus.status}`; headerPill.textContent = STATUS_LABELS[gateStatus.status] || gateStatus.status; }
  const headerMeta = criteria.closest("[data-g1pc-unified]")?.querySelector("[data-g1bp-status-meta-v543]");
  if (headerMeta) headerMeta.textContent = `${gateStatus.filled}/${gateStatus.total} ответов · ${entry.competitors.length} конкурентов`;
  const summaries = new Map([...button.closest("[data-g1pc-grid]").querySelectorAll("[data-g1pc-criteria-summary]")]
    .map(node => [node.dataset.g1pcCriteriaSummary, node]));
  for (const competitor of competitors) {
    const summary = summaries.get(competitor.id);
    const stat = stats.byCompetitor.get(competitor.id);
    if (summary && stat) summary.textContent = `▲ ${stat.up} преимуществ · ▼ ${stat.down} отставаний · нужен ответ ${stat.missing}`;
  }
  criteria.querySelectorAll("[data-g1pc-criteria-row]").forEach(row => {
    const criterion = G1PC_CRITERIA_V603.find(item => item.id === row.dataset.g1pcCriteriaRow);
    if (criterion?.group !== 2) return;
    const own = g1pcCriteriaAnswerV603(entry, null, criterion, sources[criterion.source], jtbds);
    for (const competitor of competitors) {
      const cell = [...row.querySelectorAll("[data-g1pc-criteria-cell]")].find(node => node.dataset.g1pcCriteriaCell === `${competitor.id}:${criterion.id}`);
      const answer = g1pcCriteriaAnswerV603(entry, competitor, criterion, null, jtbds);
      const signal = cell?.querySelector(".g1pc-criteria-signal");
      if (signal) {
        signal.textContent = own === "yes" && answer === "no" ? "▲" : own === "no" && answer === "yes" ? "▼" : "";
        signal.setAttribute("aria-label", signal.textContent === "▲" ? "Наше преимущество" : signal.textContent === "▼" ? "Наше отставание" : "");
      }
    }
  });
}

function g1pcCriteriaFitTextareasV603(scope) {
  scope.querySelectorAll("textarea").forEach(field => {
    field.style.height = "auto";
    const style = getComputedStyle(field);
    const borders = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    field.style.height = `${field.scrollHeight + borders}px`;
  });
}

document.addEventListener("click", event => {
  const toggle = event.target.closest?.("[data-g1pc-criteria-toggle]");
  if (toggle) {
    const section = toggle.closest("[data-g1pc-grid]");
    const row = section?.querySelector(`[data-g1pc-criteria-detail="${toggle.dataset.g1pcCriteriaToggle}"]`);
    if (!row) return;
    row.hidden = !row.hidden;
    toggle.setAttribute("aria-expanded", String(!row.hidden));
    if (!row.hidden) g1pcCriteriaFitTextareasV603(row);
    return;
  }
  const button = event.target.closest?.("[data-g1pc-criteria-answer]");
  if (!button) return;
  const { entry, product, jtbds } = g1BergenFindV543(button);
  if (!entry) return;
  const key = button.dataset.g1pcCriteriaId;
  if (!G1PC_CRITERIA_V603.some(row => row.id === key)) return;
  if (button.dataset.g1pcCriteriaColumn === "own") (entry.comparisonCriteriaV603 ||= { own: {} }).own[key] = button.dataset.g1pcCriteriaAnswer;
  else {
    const rowCompetitor = entry.competitors.find(row => row.id === button.dataset.g1pcCriteriaCompetitor);
    if (!rowCompetitor) return;
    ((rowCompetitor.comparisonCriteriaV603 ||= { answers: {}, notes: {} }).answers ||= {})[key] = button.dataset.g1pcCriteriaAnswer;
  }
  flashSaving({ skipDerivedRefresh: true });
  g1pcCriteriaUpdateAnswerV603(button, entry, entry.competitors, g1BergenScopeContext(product), jtbds);
  projectComparisonRefreshProductStatusUi(product.id);
});

document.addEventListener("keydown", event => {
  const button = event.target.closest?.("[data-g1pc-criteria-answer]");
  if (!button || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
  event.preventDefault();
  const buttons = [...button.parentElement.querySelectorAll("[data-g1pc-criteria-answer]")];
  const next = buttons[(buttons.indexOf(button) + (["ArrowLeft", "ArrowUp"].includes(event.key) ? buttons.length - 1 : 1)) % buttons.length];
  next.click();
  const current = button.closest("[data-g1bp-product-v543]")?.querySelector(`[data-g1pc-criteria-row="${button.dataset.g1pcCriteriaId}"] [data-g1pc-criteria-column="${button.dataset.g1pcCriteriaColumn}"]${button.dataset.g1pcCriteriaCompetitor ? `[data-g1pc-criteria-competitor="${CSS.escape(button.dataset.g1pcCriteriaCompetitor)}"]` : ""}[data-g1pc-criteria-answer="${next.dataset.g1pcCriteriaAnswer}"]`);
  current?.focus();
});

document.addEventListener("input", event => {
  const target = event.target;
  if (target.matches?.("[data-g1pc-criteria-detail] textarea")) g1pcCriteriaFitTextareasV603(target.parentElement);
  const section = target.closest?.("[data-g1bp-product-v543]");
  if (!section) return;
  const { entry } = g1BergenFindV543(target);
  if (!entry) return;
  const id = target.dataset.g1pcCriteriaName || target.dataset.g1pcCriteriaCompetitor;
  const competitor = entry.competitors.find(row => row.id === id);
  if (!competitor) return;
  if (target.dataset.g1pcCriteriaName) {
    competitor.name = target.value;
    const match = section.querySelector(`[data-g1pc-match-name="${CSS.escape(id)}"]`);
    if (match) match.textContent = target.value || "Конкурент";
  } else if (target.dataset.g1pcCriteriaNote) {
    ((competitor.comparisonCriteriaV603 ||= { answers: {}, notes: {} }).notes ||= {})[target.dataset.g1pcCriteriaNote] = target.value;
  } else return;
  g1BergenScheduleSearchSaveV569(state, { skipProductSelectorRefresh: true });
});

document.addEventListener("change", event => {
  const target = event.target;
  const section = target.closest?.("[data-g1bp-product-v543]");
  if (!section) return;
  const { entry, product, jtbds } = g1BergenFindV543(target);
  if (!entry) return;
  const competitor = entry.competitors.find(row => row.id === (target.dataset.g1pcCriteriaType || target.dataset.g1pcCriteriaCompetitor));
  if (!competitor) return;
  if (target.dataset.g1pcCriteriaType) {
    if (!["direct", "substitute"].includes(target.value)) return;
    (competitor.bergenV543 ||= {}).comparisonTypeV603 = target.value;
    const model = g1ProductComparisonModel(section);
    g1ProductComparisonRefresh(section, "grid");
    g1ProductComparisonSyncChoiceControls(section, competitor, jtbds);
    const current = g1ProductComparisonCurrent(model).current;
    if (current) g1ProductComparisonRefreshMatchState(section, model, competitor, current);
    g1ProductComparisonSave(section, model);
    (target.isConnected ? target : section.querySelector(`[data-g1pc-grid] [data-g1pc-criteria-type="${CSS.escape(competitor.id)}"][value="${target.value}"]`))
      ?.focus({ preventScroll: true });
  } else if (target.dataset.g1pcCriteriaLegacyChoice) {
    (competitor.bergenV543 ||= {})[target.dataset.g1pcCriteriaLegacyChoice] = target.value;
    g1BergenScheduleSearchSaveV569(state, { skipProductSelectorRefresh: true });
  }
});

document.addEventListener("click", event => {
  const target = event.target.closest?.("input[data-g1pc-criteria-type]");
  if (!target || !["direct", "substitute"].includes(target.value)) return;
  const section = target.closest("[data-g1bp-product-v543]");
  if (!section) return;
  const model = g1ProductComparisonModel(section);
  const competitor = model?.entry.competitors.find(row => row.id === target.dataset.g1pcCriteriaType);
  if (!competitor || g1BergenTypeV543(competitor, model.jtbds) !== target.value ||
      competitor.bergenV543?.comparisonTypeV603 === target.value) return;
  (competitor.bergenV543 ||= {}).comparisonTypeV603 = target.value;
  g1ProductComparisonSyncChoiceControls(section, competitor, model.jtbds);
  g1ProductComparisonSave(section, model);
});
