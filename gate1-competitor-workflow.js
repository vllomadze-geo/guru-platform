/* Gate 1 · Product competitor research. All saved answers belong to productsById[product_id]. */
const G1_COMPETITOR_WORKFLOW_V539 = "gate1-competitor-workflow-v539";
const G1_COMPETITOR_TYPES_V539 = {
  direct: "Прямой",
  substitute: "Заменитель",
  potential: "Потенциальный",
  unrelated: "Не конкурент",
  unclassified: "Не классифицирован",
};
const G1_COMPETITOR_STEPS_V539 = [
  { number: 3, title: "Продукт", description: "Найдите ближайший аналог на сайте конкурента и зафиксируйте его свойства.", focus: "Наши характеристики из карточки товара.", fields: [["analogName", "Название аналога"], ["analogUrl", "URL аналога"], ["characteristics", "Характеристики"]] },
  { number: 4, title: "Цена", description: "Сравните цену аналога с нашей ценой и диапазоном предложений конкурента.", focus: "Наша цена из карточки товара.", fields: [["priceAnalog", "Цена аналога, ₽"], ["priceMin", "Минимальная цена, ₽"], ["priceMax", "Максимальная цена, ₽"]] },
  { number: 5, title: "JTBD и сегмент", description: "Определите, какую задачу закрывает предложение конкурента и для кого оно сделано.", focus: "Наш JTBD и сегмент.", fields: [["jtbdFunctional", "Функциональная задача"], ["jtbdSocial", "Социальная задача"], ["jtbdEmotional", "Эмоциональная задача"], ["segment", "Сегмент конкурента"]] },
  { number: 6, title: "Позиционирование", description: "Сформулируйте позиционирование одним предложением и сохраните подтверждающую цитату.", focus: "Наше позиционирование.", fields: [["positioning", "Позиционирование одной фразой"], ["quote", "Цитата: title, H1 или УТП"]] },
  { number: 7, title: "Паритет и отличия", description: "Отделите общие свойства от отличий обеих сторон.", focus: "Наши УТП и доверие из Gate 0/1.", fields: [["parity", "Паритет"], ["competitorDifferences", "Отличия конкурента"], ["ourDifferences", "Наши отличия"]] },
  { number: 8, title: "Ключевые слова и реклама", description: "Проверьте пересечение по главным фразам в органике и рекламе.", focus: "Есть ли домен конкурента в органике и рекламе по каждой фразе.", fields: [["organicPhrases", "Пересекающиеся фразы · органика"], ["adPhrases", "Пересекающиеся фразы · реклама"], ["adTexts", "Тексты объявлений"], ["offers", "Офферы"], ["triggers", "Триггеры"]] },
  { number: 9, title: "Как продаёт", description: "Изучите посадочную страницу и источники трафика.", focus: "Путь от первого экрана до действия и условия покупки.", fields: [["landingStructure", "Структура посадочной"], ["cta", "CTA"], ["payment", "Оплата"], ["channels", "Каналы"], ["trafficSources", "Источники трафика"]] },
  { number: 10, title: "География и доставка", description: "Проверьте, где и на каких условиях конкурент доставляет заказ.", focus: "Наша география.", fields: [["regions", "Регионы"], ["deliveryTime", "Сроки"], ["deliveryCost", "Стоимость"], ["pickup", "Самовывоз"]] },
  { number: 11, title: "Доверие", description: "Сверьте публичные отзывы и повторяющиеся аргументы покупателей.", focus: "Проверяемые оценки и содержание отзывов.", fields: [["rating", "Рейтинг"], ["reviewCount", "Число отзывов"], ["praise", "Главные похвалы"], ["complaints", "Главные жалобы"]] },
  { number: 12, title: "Вывод", description: "Зафиксируйте вывод по конкуренту со ссылками на доказательства.", focus: "Три сильные и три слабые стороны, затем действие для нас.", fields: [["strength1", "Сильная сторона 1"], ["strength2", "Сильная сторона 2"], ["strength3", "Сильная сторона 3"], ["weakness1", "Слабая сторона 1"], ["weakness2", "Слабая сторона 2"], ["weakness3", "Слабая сторона 3"], ["takeaway", "Вывод для нас"], ["fixedDate", "Дата фиксации"], ["evidence", "URL / скриншоты"]] },
];
const G1_COMPETITOR_LEGACY_MAP_V539 = {
  jtbd: [5, "jtbdFunctional"],
  product_characteristics: [3, "characteristics"],
  price: [4, "priceAnalog"],
  presentation_sales: [9, "landingStructure"],
  strengths_weaknesses: [12, "legacySummary"],
};

function g1CompetitorMigrateV539(entry) {
  if (!entry) return null;
  if (!Array.isArray(entry.candidatesV539)) entry.candidatesV539 = [];
  if (!entry.workflowUiV539 || typeof entry.workflowUiV539 !== "object")
    entry.workflowUiV539 = { openSteps: {} };
  if (!entry.workflowUiV539.openSteps || typeof entry.workflowUiV539.openSteps !== "object")
    entry.workflowUiV539.openSteps = {};
  for (const competitor of entry.competitors || []) {
    if (!competitor.typeV539) competitor.typeV539 = "direct";
    if (!competitor.classificationV539 || typeof competitor.classificationV539 !== "object")
      competitor.classificationV539 = { sameMarket: "", sameBusiness: "" };
    if (!competitor.stepsV539 || typeof competitor.stepsV539 !== "object") competitor.stepsV539 = {};
    if (!Array.isArray(competitor.foundPhraseKeysV539)) competitor.foundPhraseKeysV539 = [];
    if (!competitor.legacyCellsMigratedV539) {
      for (const criterion of entry.criteria || []) {
        const destination = G1_COMPETITOR_LEGACY_MAP_V539[criterion.coreKey];
        const text = projectComparisonCell(criterion, competitor.id).text;
        if (!destination || !text.trim()) continue;
        const [number, field] = destination;
        competitor.stepsV539[number] = competitor.stepsV539[number] || {};
        if (!String(competitor.stepsV539[number][field] || "").trim())
          competitor.stepsV539[number][field] = text;
      }
      competitor.legacyCellsMigratedV539 = true;
    }
  }
  for (const candidate of entry.candidatesV539) {
    if (!candidate.classificationV539 || typeof candidate.classificationV539 !== "object")
      candidate.classificationV539 = { sameMarket: "", sameBusiness: "" };
    if (!Array.isArray(candidate.foundPhraseKeysV539)) candidate.foundPhraseKeysV539 = [];
    if (!candidate.stepsV539 || typeof candidate.stepsV539 !== "object") candidate.stepsV539 = {};
  }
  return entry;
}

function g1CompetitorCandidatesV539(entry) {
  return [...(entry.competitors || []), ...(entry.candidatesV539 || [])];
}

function g1CompetitorTypeV539(candidate) {
  const { sameMarket, sameBusiness } = candidate.classificationV539 || {};
  if (sameMarket === "yes" && sameBusiness === "yes") return "direct";
  if (sameMarket === "yes" && sameBusiness === "no") return "substitute";
  if (sameMarket === "no" && sameBusiness === "yes") return "potential";
  if (sameMarket === "no" && sameBusiness === "no") return "unrelated";
  return candidate.typeV539 || "unclassified";
}

function g1CompetitorStepStatusV539(values) {
  if (!values.length) return { status: "not_started", filled: 0, total: 0 };
  const filled = values.filter((value) => String(value ?? "").trim()).length;
  return { status: filled === 0 ? "not_started" : filled === values.length ? "ready" : "in_progress", filled, total: values.length };
}

function g1CompetitorPhrasesV539(product) {
  const confirmed = guruGate1FinalConfirmedV259(product);
  const metrics = new Map();
  const collect = (itemData, archived = false) => {
    const file = itemData?.finalKeywordFoundationV259?.last_import?.file || "";
    (itemData?.demandRows || []).forEach((row) => {
      const key = guruV247KeywordNormalize(row.kw);
      const count = pv181DemandQueryNumberV262(row.queryCount);
      const previous = metrics.get(key);
      if (key && count !== null && (!previous || previous.archived && !archived || previous.archived === archived && count > previous.frequency))
        metrics.set(key, { frequency: count, file, archived });
    });
  };
  (state.painV130?.productMaps || []).forEach((map) => {
    collect(map.items?.[product.id]);
  });
  // A category move can archive the old product row. Keep its imported metrics
  // available as a labelled fallback while current product rows take priority.
  (state.painV130?.productMaps || []).forEach((map) => {
    Object.values(map.legacyPageItemsV237 || {}).forEach((archive) => {
      if (archive?.mapped_product_id === product.id && archive?.reason === "catalog_product_belongs_to_another_category")
        collect(archive.data, true);
    });
  });
  const matched = confirmed.map((row, index) => ({
    value: row.value,
    key: guruV247KeywordNormalize(row.value),
    frequency: metrics.get(guruV247KeywordNormalize(row.value))?.frequency ?? null,
    file: metrics.get(guruV247KeywordNormalize(row.value))?.file || "",
    archived: metrics.get(guruV247KeywordNormalize(row.value))?.archived || false,
    index,
  })).filter((row) => row.frequency !== null)
    .sort((a, b) => b.frequency - a.frequency || a.index - b.index);
  const ranked = matched.slice(0, 15);
  const files = [...new Set(ranked.map((row) => row.file).filter(Boolean))];
  const source = files.length && files.every((file) => /wordstat|вордстат/i.test(file))
    ? "Wordstat" : "Прогноз Директа";
  return { confirmed, ranked, source, file: files.join(", "), archived: ranked.some((row) => row.archived), missing: confirmed.length - matched.length };
}

function g1CompetitorContextV539(product) {
  const snapshot = g3ProductJourneySnapshot(product);
  const price = guruGate1ProductPriceV277(product.id);
  const phrases = g1CompetitorPhrasesV539(product);
  const words = String(product.name || "").toLocaleLowerCase("ru-RU")
    .replace(/[^\p{L}\s-]/gu, " ").split(/\s+/).filter((word) => word.length > 2 &&
      !/^(символ|года|год|для|или|это|товар|услуга)$/u.test(word));
  return {
    product, snapshot, price, phrases,
    geography: String(state.project?.geography || "").trim(),
    mainWord: words.at(-1) || "",
    secondPhrase: phrases.ranked[1]?.value || "",
    topThree: phrases.ranked.slice(0, 3).map((row) => row.value),
  };
}

function g1CompetitorStatusPillV539(status) {
  return `<span class="status-pill status-${status}">${escapeHtml(STATUS_LABELS[status] || status)}</span>`;
}

function g1CompetitorSourceLinkV539(target, label = "Открыть источник") {
  return `<button type="button" class="g1-competitor-source-v539" data-g4-jump-target="${escapeAttr(JSON.stringify(target))}">${escapeHtml(label)} →</button>`;
}

function g1CompetitorStepV539(number, title, status, description, searchHtml, focusHtml, resultHtml, entry, competitor = null) {
  const key = competitor ? `${competitor.id}:${number}` : String(number);
  const explicit = entry.workflowUiV539.openSteps[key];
  const isOpen = explicit === undefined ? number <= 2 : explicit === true;
  return `<details class="g1-competitor-step-v539" data-g1-competitor-step-v539="${escapeAttr(key)}" ${isOpen ? "open" : ""}>
    <summary><span><b>${number}.</b> ${escapeHtml(title)}</span>${g1CompetitorStatusPillV539(status.status)}</summary>
    <div class="g1-competitor-step-body-v539">
      <div class="g1-competitor-explain-v539"><b>Описание</b><p>${escapeHtml(description)}</p></div>
      ${searchHtml ? `<div class="g1-competitor-explain-v539"><b>${number === 9 ? "Вставить в Similarweb" : "Вставить в поиск"}</b>${searchHtml}</div>` : ""}
      <div class="g1-competitor-explain-v539"><b>На чём фокусироваться</b><p>${focusHtml}</p></div>
      <div class="g1-competitor-results-v539"><b>Результат</b>${resultHtml}</div>
    </div>
  </details>`;
}

function g1CompetitorCopyRowsV539(values, note = "") {
  const rows = values.filter(Boolean).map((value) => `<div class="g1-competitor-copy-row-v539"><code>${escapeHtml(value)}</code><button type="button" class="small-btn" data-g1-competitor-copy-v539="${escapeAttr(value)}">Копировать</button></div>`).join("");
  return `${rows}${note ? `<small>${note}</small>` : ""}`;
}

function g1CompetitorSourceGridV539(ctx) {
  const { snapshot, product, price, phrases } = ctx;
  const sourceRows = [
    ["JTBD", snapshot.jtbd, { gateId: "gate-0", kind: "gate0-scoped", productId: product.id, field: "jtbd" }],
    ["Сегмент", snapshot.segment, { gateId: "gate-0", kind: "gate0-scoped", productId: product.id, field: "segments" }],
    ["Цена", price.raw ? `${price.raw} ₽` : "", { gateId: "gate-1", kind: "gate1-page", cardId: snapshot.page?.card?.id || "" }],
    ["География", ctx.geography, { gateId: "gate-0" }],
    ["Позиционирование", snapshot.positioning, { gateId: "gate-0", kind: "gate0-scoped", productId: product.id, field: "positioning" }],
    ["УТП", snapshot.usp, { gateId: "gate-0", kind: "gate0-scoped", productId: product.id, field: "usp" }],
    ["Ключевые фразы", phrases.confirmed.map((row) => row.value).join(" · "), { gateId: "gate-1", kind: "gate1-keywords", productId: product.id }],
  ];
  const status = g1CompetitorStepStatusV539(sourceRows.map((row) => row[1]));
  const html = `<div class="g1-competitor-source-grid-v539">${sourceRows.map(([label, value, target]) => `<div><b>${escapeHtml(label)}</b><span>${value ? escapeHtml(value) : "Не заполнено в источнике"}</span>${g1CompetitorSourceLinkV539(target)}</div>`).join("")}</div>`;
  return { html, status };
}

function g1CompetitorCandidateRowV539(candidate, entry, ctx, direct) {
  const id = escapeAttr(candidate.id);
  const selected = new Set(candidate.foundPhraseKeysV539 || []);
  const domain = String(candidate.siteDomainV538 || "");
  const matches = ctx.phrases.ranked.filter((row) => selected.has(row.key));
  const phrases = ctx.phrases.ranked.length
    ? `<details class="g1-competitor-phrase-picker-v539"><summary>Фразы, где найден: ${matches.length}</summary><div>${ctx.phrases.ranked.map((row) => `<label><input type="checkbox" data-g1-competitor-phrase-v539="${id}" data-g1-competitor-product-v539="${escapeAttr(ctx.product.id)}" value="${escapeAttr(row.key)}" ${selected.has(row.key) ? "checked" : ""}>${escapeHtml(row.value)}</label>`).join("")}</div></details>`
    : '<span>Нет фраз с частотностью — заполните метрики в Gate 1.</span>';
  return `<article class="g1-competitor-candidate-v539" data-g1-competitor-candidate-v539="${id}">
    <div class="g1-competitor-candidate-head-v539"><strong>${escapeHtml(candidate.name || domain || "Кандидат")}</strong><span>${escapeHtml(G1_COMPETITOR_TYPES_V539[g1CompetitorTypeV539(candidate)])}</span></div>
    ${direct ? `<div class="g1-competitor-domain-readonly-v539"><b>Домен</b><span>${domain ? escapeHtml(domain) : "Укажите в карточке конкурента ниже"}</span></div>` : `<label class="g1-competitor-field-v539"><span>Домен</span><input type="text" inputmode="url" value="${escapeAttr(domain)}" data-g1-competitor-domain-v539="${id}" data-g1-competitor-product-v539="${escapeAttr(ctx.product.id)}" aria-label="Домен кандидата"><small aria-live="polite"></small></label>`}
    ${phrases}
    <div class="g1-competitor-choice-row-v539"><label><input type="checkbox" data-g1-competitor-placement-v539="${id}" data-g1-competitor-product-v539="${escapeAttr(ctx.product.id)}" value="organic" ${candidate.organicV539 ? "checked" : ""}>Органика</label><label><input type="checkbox" data-g1-competitor-placement-v539="${id}" data-g1-competitor-product-v539="${escapeAttr(ctx.product.id)}" value="ads" ${candidate.adsV539 ? "checked" : ""}>Реклама</label><span>Совпавших фраз: <b>${matches.length}</b></span></div>
    ${direct ? "" : `<button type="button" class="g1-competitor-remove-v539" data-g1-competitor-remove-v539="${id}" data-g1-competitor-product-v539="${escapeAttr(ctx.product.id)}">Убрать кандидата</button>`}
  </article>`;
}

function g1CompetitorCandidatesStepV539(entry, ctx) {
  const all = g1CompetitorCandidatesV539(entry);
  const statuses = all.map((candidate) => [candidate.siteDomainV538,
    (candidate.foundPhraseKeysV539 || []).length ? "yes" : "",
    candidate.organicV539 || candidate.adsV539 ? "yes" : ""]);
  const status = g1CompetitorStepStatusV539(statuses.flat());
  const phraseRows = ctx.phrases.ranked.length
    ? ctx.phrases.ranked.map((row) => `<div class="g1-competitor-copy-row-v539"><code>${escapeHtml(row.value)}</code><span>${row.frequency} запросов</span><button type="button" class="small-btn" data-g1-competitor-copy-v539="${escapeAttr(row.value)}">Копировать</button></div>`).join("")
    : ctx.phrases.confirmed.length
      ? `${g1CompetitorSourceLinkV539({ gateId: "gate-1", kind: "gate1-keywords", productId: ctx.product.id }, "Нет частотности у подтверждённых фраз — заполните метрики")}`
      : `${g1CompetitorSourceLinkV539({ gateId: "gate-1", kind: "gate1-keywords", productId: ctx.product.id }, "Нет подтверждённых фраз")}`;
  const frequencyNote = ctx.phrases.ranked.length
    ? `<small>Топ ${ctx.phrases.ranked.length} из ${ctx.phrases.confirmed.length} подтверждённых фраз · ${escapeHtml(ctx.phrases.source)}${ctx.phrases.file ? ` · ${escapeHtml(ctx.phrases.file)}` : ""}${ctx.phrases.archived ? " · часть метрик взята из архива после переноса категории" : ""}. ${ctx.phrases.missing ? `${ctx.phrases.missing} без частотности не ранжированы.` : ""}</small>`
    : "";
  const result = `<div class="g1-competitor-candidates-v539"><div class="g1-competitor-candidate-toolbar-v539"><span>Список кандидатов: ${all.length}</span><button type="button" class="small-btn" data-g1-competitor-add-v539 data-g1-competitor-product-v539="${escapeAttr(ctx.product.id)}">+ Добавить кандидата</button></div>${all.map((candidate) => g1CompetitorCandidateRowV539(candidate, entry, ctx, entry.competitors.includes(candidate))).join("") || '<p>Кандидатов пока нет.</p>'}</div>`;
  return g1CompetitorStepV539(1, "Сбор кандидатов", status,
    "Возьмите подтверждённые фразы продукта с наибольшим числом запросов. Выписывайте домены из топ-10 и рекламы.",
    `${phraseRows}${frequencyNote}`, "Кандидаты — сайты, которые встречаются по нескольким фразам. Регион в Яндексе: " + escapeHtml(ctx.geography || "не указан в Gate 0"), result, entry);
}

function g1CompetitorClassificationStepV539(entry, ctx) {
  const all = g1CompetitorCandidatesV539(entry);
  const status = g1CompetitorStepStatusV539(all.flatMap((candidate) => [candidate.classificationV539?.sameMarket, candidate.classificationV539?.sameBusiness]));
  const result = `<div class="g1-competitor-classification-v539">${all.map((candidate) => {
    const id = escapeAttr(candidate.id), answers = candidate.classificationV539 || {};
    const choice = (field, label) => `<fieldset><legend>${label}</legend>${[["yes", "Да"], ["no", "Нет"]].map(([value, text]) => `<label><input type="radio" name="g1cmp-${id}-${field}" value="${value}" data-g1-competitor-classify-v539="${id}" data-g1-competitor-product-v539="${escapeAttr(ctx.product.id)}" data-g1-competitor-class-field-v539="${field}" ${answers[field] === value ? "checked" : ""}>${text}</label>`).join("")}</fieldset>`;
    return `<article data-g1-competitor-classification-v539="${id}"><strong>${escapeHtml(candidate.siteDomainV538 || candidate.name || "Кандидат без домена")}</strong>${choice("sameMarket", "Тот же JTBD, сегмент, цена, география?")}${choice("sameBusiness", "Тот же тип бизнеса?")}<span>Тип: <b>${escapeHtml(G1_COMPETITOR_TYPES_V539[g1CompetitorTypeV539(candidate)])}</b></span></article>`;
  }).join("") || '<p>Сначала добавьте кандидатов в шаге 1.</p>'}</div>`;
  const focus = `Наш JTBD: ${escapeHtml(ctx.snapshot.jtbd || "не заполнен")}. Сегмент: ${escapeHtml(ctx.snapshot.segment || "не заполнен")}. Цена: ${escapeHtml(ctx.price.raw || "не заполнена")} ₽. Тип бизнеса: ${escapeHtml(state.project?.niche || "не заполнен в Gate 0")}.`;
  return g1CompetitorStepV539(2, "Классификация", status,
    "Ответьте на два вопроса для каждого кандидата. Тип считается автоматически: Да/Да — Прямой, Да/Нет — Заменитель, Нет/Да — Потенциальный, Нет/Нет — Не конкурент.",
    "", focus, result, entry);
}

function g1CompetitorQueriesV539(number, candidate, ctx) {
  const domain = projectComparisonProductDomainV538(candidate.siteDomainV538);
  if (number >= 3 && number <= 11 && !domain) return { missingDomain: true, values: [] };
  const site = `site:${domain}`;
  if (number === 3 || number === 4) return { values: [ctx.mainWord && `${site} ${ctx.mainWord}`, ctx.secondPhrase && `${site} ${ctx.secondPhrase}`].filter(Boolean) };
  if (number === 5) return { values: [site] };
  if (number === 6) return { values: [site, ctx.mainWord && `title:${ctx.mainWord} ${site}`].filter(Boolean) };
  if (number === 8) return { values: ctx.topThree.map((phrase) => `"${phrase}"`) };
  if (number === 9) return { values: [domain] };
  if (number === 10) return { values: [`${site} доставка`] };
  if (number === 11) return { values: [`${domain} отзывы`] };
  return { values: [] };
}

function g1CompetitorPriceSegmentV539(candidate, ctx) {
  const own = ctx.price.value;
  const analog = parseUnitNumber(candidate.stepsV539?.[4]?.priceAnalog);
  if (!own || !analog) return "Не определяется: нет одной из цен";
  return analog < own ? "Ниже" : analog > own ? "Выше" : "Равно";
}

function g1CompetitorResultFieldsV539(step, candidate, ctx) {
  const saved = candidate.stepsV539?.[step.number] || {};
  const fields = step.fields.map(([field, label]) => `<label class="g1-competitor-field-v539"><span>${escapeHtml(label)}</span>${field === "fixedDate"
    ? `<input type="date" value="${escapeAttr(saved[field] || "")}" data-g1-competitor-result-v539="${escapeAttr(candidate.id)}" data-g1-competitor-product-v539="${escapeAttr(ctx.product.id)}" data-g1-competitor-step-number-v539="${step.number}" data-g1-competitor-result-field-v539="${field}">`
    : `<textarea rows="2" data-g1-competitor-result-v539="${escapeAttr(candidate.id)}" data-g1-competitor-product-v539="${escapeAttr(ctx.product.id)}" data-g1-competitor-step-number-v539="${step.number}" data-g1-competitor-result-field-v539="${field}">${escapeHtml(saved[field] || "")}</textarea>`}</label>`).join("");
  const legacy = step.number === 12 && saved.legacySummary
    ? `<label class="g1-competitor-field-v539"><span>Перенесённый текст прежней таблицы</span><textarea rows="3" data-g1-competitor-result-v539="${escapeAttr(candidate.id)}" data-g1-competitor-product-v539="${escapeAttr(ctx.product.id)}" data-g1-competitor-step-number-v539="12" data-g1-competitor-result-field-v539="legacySummary">${escapeHtml(saved.legacySummary)}</textarea></label>` : "";
  return `${fields}${step.number === 4 ? `<p class="g1-competitor-derived-v539">Ценовой сегмент: <strong>${escapeHtml(g1CompetitorPriceSegmentV539(candidate, ctx))}</strong></p>` : ""}${legacy}`;
}

function g1CompetitorDirectCardV539(candidate, entry, ctx) {
  const domain = String(candidate.siteDomainV538 || "");
  const steps = G1_COMPETITOR_STEPS_V539.map((step) => {
    const saved = candidate.stepsV539?.[step.number] || {};
    const status = g1CompetitorStepStatusV539(step.fields.map(([field]) => saved[field]));
    const queries = g1CompetitorQueriesV539(step.number, candidate, ctx);
    const search = queries.missingDomain
      ? '<p>Укажите домен конкурента.</p>'
      : g1CompetitorCopyRowsV539(queries.values,
        step.number === 8 && !ctx.topThree.length ? g1CompetitorSourceLinkV539({ gateId: "gate-1", kind: "gate1-keywords", productId: ctx.product.id }, "Нет подтверждённых фраз с частотностью") : "");
    const focus = step.number === 3 ? ctx.snapshot.cardSummary || "Не заполнено в карточке товара"
      : step.number === 4 ? `Наша цена: ${ctx.price.raw ? `${ctx.price.raw} ₽` : "не заполнена в карточке товара"}`
      : step.number === 5 ? `JTBD: ${ctx.snapshot.jtbd || "не заполнен"}. Сегмент: ${ctx.snapshot.segment || "не заполнен"}.`
      : step.number === 6 ? ctx.snapshot.positioning || "Не заполнено в Gate 0"
      : step.number === 7 ? `УТП: ${ctx.snapshot.usp || "не заполнено"}. Доверие: ${ctx.snapshot.trust || "не заполнено"}.`
      : step.number === 10 ? ctx.geography || "Не заполнено в Gate 0"
      : step.focus;
    return g1CompetitorStepV539(step.number, step.title, status, step.description, search,
      escapeHtml(focus), g1CompetitorResultFieldsV539(step, candidate, ctx), entry, candidate);
  }).join("");
  return `<section class="g1-competitor-direct-v539" data-g1-competitor-direct-v539="${escapeAttr(candidate.id)}">
    <div class="g1-competitor-direct-head-v539"><div><b>Прямой конкурент</b><input value="${escapeAttr(candidate.name || domain)}" data-project-comparison-product-competitor="${escapeAttr(candidate.id)}" data-project-comparison-product-id="${escapeAttr(ctx.product.id)}" aria-label="Название конкурента продукта"></div><label class="project-comparison-product-site-v538"><span>Сайт (домен)</span><input type="text" inputmode="url" value="${escapeAttr(domain)}" data-project-comparison-product-competitor-site-v538="${escapeAttr(candidate.id)}" data-project-comparison-product-id="${escapeAttr(ctx.product.id)}" aria-label="Сайт конкурента продукта (домен)"><small aria-live="polite"></small></label><button type="button" class="g1-competitor-remove-v539" data-project-comparison-product-remove-competitor="${escapeAttr(candidate.id)}" data-project-comparison-product-id="${escapeAttr(ctx.product.id)}">Удалить</button></div>
    ${steps}
  </section>`;
}

function g1CompetitorSummaryValueV539(criterion, candidate) {
  const step = candidate.stepsV539 || {};
  const result = criterion.coreKey === "jtbd" ? [step[5]?.jtbdFunctional, step[5]?.jtbdSocial, step[5]?.jtbdEmotional, step[5]?.segment]
    : criterion.coreKey === "product_characteristics" ? [step[3]?.analogName, step[3]?.analogUrl, step[3]?.characteristics]
      : criterion.coreKey === "price" ? [step[4]?.priceAnalog, step[4]?.priceMin, step[4]?.priceMax]
        : criterion.coreKey === "presentation_sales" ? [step[9]?.landingStructure, step[9]?.cta, step[9]?.payment, step[9]?.channels, step[9]?.trafficSources]
          : criterion.coreKey === "strengths_weaknesses" ? [step[12]?.strength1, step[12]?.strength2, step[12]?.strength3, step[12]?.weakness1, step[12]?.weakness2, step[12]?.weakness3, step[12]?.takeaway, step[12]?.legacySummary]
            : [];
  return result.map((value) => String(value || "").trim()).filter(Boolean).join("\n") || projectComparisonCell(criterion, candidate.id).text;
}

function g1CompetitorSummaryV539(entry, ctx) {
  const criteria = entry.criteria.filter((row) => G1_COMPETITOR_LEGACY_MAP_V539[row.coreKey]);
  return `<section class="g1-competitor-summary-v539"><h3>Сводная таблица</h3><p>Только чтение · значения конкурентов берутся из шагов 3, 4, 5, 9 и 12.</p><div class="project-comparison-scroll" tabindex="0"><table style="--comparison-columns:${entry.competitors.length}"><thead><tr><th class="project-comparison-criterion-sticky">Критерий продукта</th><th class="project-comparison-own-sticky">Наш продукт<br><strong>${escapeHtml(ctx.product.name)}</strong></th>${entry.competitors.map((row) => `<th>${escapeHtml(row.name || row.siteDomainV538 || "Конкурент")}</th>`).join("")}</tr></thead><tbody>${criteria.map((criterion) => `<tr><th class="project-comparison-criterion-sticky">${escapeHtml(criterion.name)}</th><td class="project-comparison-own-sticky">${escapeHtml(projectComparisonProductAutoValue(criterion, ctx.product) || "Не заполнено в источнике")}</td>${entry.competitors.map((row) => `<td>${escapeHtml(g1CompetitorSummaryValueV539(criterion, row) || "Не заполнено")}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;
}

function g1CompetitorOverallStatusV539(entry, ctx) {
  const source = g1CompetitorSourceGridV539(ctx).status;
  const all = g1CompetitorCandidatesV539(entry);
  const candidates = g1CompetitorStepStatusV539(all.flatMap((row) => [row.siteDomainV538,
    (row.foundPhraseKeysV539 || []).length ? "yes" : "",
    row.organicV539 || row.adsV539 ? "yes" : ""]));
  const classification = g1CompetitorStepStatusV539(all.flatMap((row) => [row.classificationV539?.sameMarket, row.classificationV539?.sameBusiness]));
  const statuses = [source, candidates, classification, ...entry.competitors.flatMap((candidate) => G1_COMPETITOR_STEPS_V539.map((step) => g1CompetitorStepStatusV539(step.fields.map(([field]) => candidate.stepsV539?.[step.number]?.[field]))))];
  const ready = statuses.filter((row) => row.status === "ready").length;
  return { status: ready === statuses.length ? "ready" : statuses.some((row) => row.status !== "not_started") ? "in_progress" : "not_started", filled: ready, total: statuses.length };
}

projectComparisonProductStatus = function (entry) {
  if (!entry?.product_id) return { status: "not_started", filled: 0, total: 0 };
  g1CompetitorMigrateV539(entry);
  const product = guruV194Product(entry.product_id, state);
  return product ? g1CompetitorOverallStatusV539(entry, g1CompetitorContextV539(product))
    : { status: "not_started", filled: 0, total: 0 };
};

projectComparisonProductHtml = function (product = guruV194SelectedProduct(state)) {
  if (!product?.id) return `<section class="project-comparison project-comparison-product-v309 g1-section"><div class="project-comparison-heading"><b>Сравнение проектов · Продукт/Услуга</b></div><div class="project-comparison-body"><p>Выберите продукт.</p></div></section>`;
  Object.values(state.projectComparison?.productsById || {}).forEach(g1CompetitorMigrateV539);
  const entry = g1CompetitorMigrateV539(ensureProjectComparisonProduct(product.id));
  const ctx = g1CompetitorContextV539(product);
  const source = g1CompetitorSourceGridV539(ctx);
  const status = g1CompetitorOverallStatusV539(entry, ctx);
  const statusKey = `project-comparison-product-${product.id}`;
  return `<section class="project-comparison project-comparison-product-v309 g1-section g1-competitor-workflow-v539 ${entry.open ? "is-open" : ""}" data-project-comparison-product="${escapeAttr(product.id)}" data-g1-competitor-workflow-v539="${escapeAttr(product.id)}">
    <button type="button" class="project-comparison-heading" data-project-comparison-product-toggle data-project-comparison-product-id="${escapeAttr(product.id)}" aria-expanded="${entry.open ? "true" : "false"}"><span><b>Сравнение проектов · Продукт/Услуга</b><small>${escapeHtml(product.name)}</small></span><span class="project-comparison-heading-meta">${g1CompetitorStatusPillV539(status.status)}<span data-status-block-meta="${escapeAttr(statusKey)}">${status.filled}/${status.total} шагов · ${entry.competitors.length} прямых</span></span><i>${entry.open ? "Свернуть ↑" : "Развернуть ↓"}</i></button>
    <div class="project-comparison-body" ${entry.open ? "" : "hidden"}>
      <div class="g1-competitor-workflow-intro-v539">Сначала соберите и классифицируйте кандидатов. Шаги 3–12 появляются только у прямых конкурентов этого product_id.</div>
      ${g1CompetitorStepV539(0, "Система отсчёта", source.status, "Сверьте исходные данные своего продукта перед исследованием конкурентов.", "", "Данные читаются из Gate 0/1 и здесь не редактируются.", source.html, entry)}
      ${g1CompetitorCandidatesStepV539(entry, ctx)}
      ${g1CompetitorClassificationStepV539(entry, ctx)}
      ${entry.competitors.map((candidate) => g1CompetitorDirectCardV539(candidate, entry, ctx)).join("")}
      ${g1CompetitorSummaryV539(entry, ctx)}
    </div>
  </section>`;
};

function g1CompetitorFindV539(productId, candidateId) {
  const entry = ensureProjectComparisonProduct(productId);
  g1CompetitorMigrateV539(entry);
  return { entry, candidate: g1CompetitorCandidatesV539(entry).find((row) => row.id === candidateId) };
}

function g1CompetitorSaveV539(rerender = false) {
  flashSaving();
  if (rerender) renderGate();
}

document.addEventListener("click", async (event) => {
  const copy = event.target?.closest?.("[data-g1-competitor-copy-v539]");
  if (copy) {
    const iconOnly = copy.hasAttribute("data-g1kw-copy-icon-v559");
    try {
      await g4sbV141CopyText(copy.dataset.g1CompetitorCopyV539);
      if (iconOnly) {
        copy.dataset.g1kwCopyState = "copied";
        copy.title = "Скопировано";
        copy.setAttribute("aria-label", "Ключевое слово скопировано");
        setTimeout(() => {
          if (!copy.isConnected) return;
          delete copy.dataset.g1kwCopyState;
          copy.title = "Копировать";
          copy.setAttribute("aria-label", `Копировать ключевое слово ${copy.dataset.g1CompetitorCopyV539}`);
        }, 1400);
      } else {
        copy.textContent = "Скопировано";
        setTimeout(() => { if (copy.isConnected) copy.textContent = "Копировать"; }, 1400);
      }
    } catch (_error) {
      if (iconOnly) {
        copy.dataset.g1kwCopyState = "error";
        copy.title = "Не удалось скопировать";
        copy.setAttribute("aria-label", "Не удалось скопировать ключевое слово");
      } else copy.textContent = "Не удалось скопировать";
    }
    return;
  }
  const add = event.target?.closest?.("[data-g1-competitor-add-v539]");
  if (add) {
    const entry = ensureProjectComparisonProduct(add.dataset.g1CompetitorProductV539);
    g1CompetitorMigrateV539(entry);
    entry.candidatesV539.push({ id: makeId("comparison-candidate"), name: "", siteDomainV538: "", typeV539: "unclassified", foundPhraseKeysV539: [], classificationV539: { sameMarket: "", sameBusiness: "" }, stepsV539: {} });
    g1CompetitorSaveV539(true);
    return;
  }
  const remove = event.target?.closest?.("[data-g1-competitor-remove-v539]");
  if (remove) {
    const entry = ensureProjectComparisonProduct(remove.dataset.g1CompetitorProductV539);
    const candidate = entry.candidatesV539?.find((row) => row.id === remove.dataset.g1CompetitorRemoveV539);
    if (!candidate) return;
    entry.archivedCandidatesV539 = Array.isArray(entry.archivedCandidatesV539) ? entry.archivedCandidatesV539 : [];
    entry.archivedCandidatesV539.push({ ...candidate, archived_at: new Date().toISOString() });
    entry.candidatesV539 = entry.candidatesV539.filter((row) => row.id !== candidate.id);
    g1CompetitorSaveV539(true);
  }
});

document.addEventListener("toggle", (event) => {
  const details = event.target?.closest?.("[data-g1-competitor-step-v539]");
  if (!details || !details.isConnected) return;
  const productId = details.closest("[data-g1-competitor-workflow-v539]")?.dataset.g1CompetitorWorkflowV539;
  if (!productId) return;
  const entry = g1CompetitorMigrateV539(ensureProjectComparisonProduct(productId));
  entry.workflowUiV539.openSteps[details.dataset.g1CompetitorStepV539] = details.open;
  guruScheduleUiPreferenceSave();
}, true);

document.addEventListener("input", (event) => {
  const field = event.target?.closest?.("[data-g1-competitor-result-v539]");
  if (!field) return;
  const { candidate } = g1CompetitorFindV539(field.dataset.g1CompetitorProductV539, field.dataset.g1CompetitorResultV539);
  if (!candidate) return;
  const number = field.dataset.g1CompetitorStepNumberV539;
  candidate.stepsV539[number] = candidate.stepsV539[number] || {};
  candidate.stepsV539[number][field.dataset.g1CompetitorResultFieldV539] = field.value;
  g1CompetitorSaveV539();
});

document.addEventListener("change", (event) => {
  const target = event.target;
  const productId = target?.dataset?.g1CompetitorProductV539;
  const candidateId = target?.dataset?.g1CompetitorPhraseV539 || target?.dataset?.g1CompetitorPlacementV539 || target?.dataset?.g1CompetitorClassifyV539 || target?.dataset?.g1CompetitorDomainV539 || target?.dataset?.g1CompetitorResultV539;
  if (target?.dataset?.projectComparisonProductCompetitorSiteV538 && target.closest(".g1-competitor-workflow-v539")) {
    g1CompetitorSaveV539(true);
    return;
  }
  if (!productId || !candidateId) return;
  const { entry, candidate } = g1CompetitorFindV539(productId, candidateId);
  if (!candidate) return;
  if (target.dataset.g1CompetitorDomainV539) {
    const domain = projectComparisonProductDomainV538(target.value);
    const error = target.closest("label")?.querySelector("small");
    if (target.value.trim() && !domain) {
      if (error) error.textContent = "Введите домен или URL сайта.";
      return;
    }
    candidate.siteDomainV538 = domain;
  } else if (target.dataset.g1CompetitorPhraseV539) {
    const selected = new Set(candidate.foundPhraseKeysV539 || []);
    if (target.checked) selected.add(target.value);
    else selected.delete(target.value);
    candidate.foundPhraseKeysV539 = [...selected];
  } else if (target.dataset.g1CompetitorPlacementV539) {
    candidate[target.value === "organic" ? "organicV539" : "adsV539"] = target.checked;
  } else if (target.dataset.g1CompetitorClassifyV539) {
    candidate.classificationV539[target.dataset.g1CompetitorClassFieldV539] = target.value;
    const type = g1CompetitorTypeV539(candidate);
    candidate.typeV539 = type;
    const isDirect = entry.competitors.includes(candidate);
    if (type === "direct" && !isDirect) {
      entry.candidatesV539 = entry.candidatesV539.filter((row) => row !== candidate);
      if (!candidate.name) candidate.name = candidate.siteDomainV538 || `Конкурент продукта ${entry.competitors.length + 1}`;
      entry.competitors.push(candidate);
    } else if (type !== "direct" && type !== "unclassified" && isDirect) {
      entry.competitors = entry.competitors.filter((row) => row !== candidate);
      entry.candidatesV539.push(candidate);
    }
  } else if (target.dataset.g1CompetitorResultV539) {
    const number = target.dataset.g1CompetitorStepNumberV539;
    candidate.stepsV539[number] = candidate.stepsV539[number] || {};
    candidate.stepsV539[number][target.dataset.g1CompetitorResultFieldV539] = target.value;
  }
  g1CompetitorSaveV539(true);
});
