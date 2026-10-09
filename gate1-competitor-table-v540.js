/* Gate 1 product comparison: one aligned question table. Existing competitors
   and their v539 answers stay in the same product-scoped records. */
function g1ComparisonTableMigrateV540(entry) {
  g1CompetitorMigrateV539(entry);
  entry.archivedCompetitorsV540 = Array.isArray(entry.archivedCompetitorsV540)
    ? entry.archivedCompetitorsV540 : [];
  // v539 stored classified non-direct competitors outside the visible list.
  // Reuse each object and ID; retain the old array as a compatibility mirror.
  entry.candidatesV539.forEach((candidate, index) => {
    const existing = entry.competitors.find((row) => row.id === candidate.id);
    if (existing) entry.candidatesV539[index] = existing;
    else entry.competitors.push(candidate);
  });
  entry.competitors.forEach((competitor) => {
    if (typeof competitor.domain !== "string")
      competitor.domain = projectComparisonProductDomainV538(competitor.siteDomainV538 || "");
    if (!competitor.siteDomainV538 && competitor.domain)
      competitor.siteDomainV538 = projectComparisonProductDomainV538(competitor.domain);
    if (!competitor.visibilityByPhraseV540 || typeof competitor.visibilityByPhraseV540 !== "object")
      competitor.visibilityByPhraseV540 = {};
  });
  return entry;
}

function g1ComparisonDomainV540(competitor) {
  return projectComparisonProductDomainV538(competitor.domain || competitor.siteDomainV538 || "");
}

function g1ComparisonFieldV540(competitor, step, key, label, mode = "textarea") {
  const value = competitor.stepsV539?.[step]?.[key] || "";
  const attrs = `data-g1ct-field-v540="${escapeAttr(key)}" data-g1ct-step-v540="${step}" data-g1ct-competitor-v540="${escapeAttr(competitor.id)}"`;
  const control = mode === "date"
    ? `<input type="date" value="${escapeAttr(value)}" ${attrs}>`
    : mode === "price"
      ? `<input type="text" inputmode="decimal" value="${escapeAttr(value)}" ${attrs}>`
      : mode === "url"
        ? `<input type="url" value="${escapeAttr(value)}" ${attrs}>`
        : `<textarea rows="2" ${attrs}>${escapeHtml(value)}</textarea>`;
  return `<label class="g1ct-field-v540"><span>${escapeHtml(label)}</span>${control}</label>`;
}

function g1ComparisonFieldsV540(competitor, step, fields) {
  return `<div class="g1ct-fields-v540">${fields.map(([key, label, mode]) =>
    g1ComparisonFieldV540(competitor, step, key, label, mode)).join("")}</div>`;
}

function g1ComparisonChoiceV540(competitor, key, choices, selected) {
  return `<div class="g1ct-choices-v540" role="group">${choices.map(([value, label]) =>
    `<label><input type="radio" name="g1ct-${escapeAttr(competitor.id)}-${escapeAttr(key)}" value="${escapeAttr(value)}" data-g1ct-choice-v540="${escapeAttr(key)}" data-g1ct-competitor-v540="${escapeAttr(competitor.id)}" ${selected === value ? "checked" : ""}>${escapeHtml(label)}</label>`).join("")}</div>`;
}

function g1ComparisonOwnV540(value, target, empty = false) {
  if (empty) return '<span class="g1ct-muted-v540">—</span>';
  const text = String(value || "").trim();
  return text ? `<div class="g1ct-source-v540">${escapeHtml(text)}</div>`
    : `<div class="g1ct-missing-v540">Не заполнено в источнике${g1CompetitorSourceLinkV539(target)}</div>`;
}

function g1ComparisonOwnPartsV540(parts) {
  return `<div class="g1ct-own-parts-v540">${parts.map(([label, value, target]) =>
    `<div><b>${escapeHtml(label)}</b>${g1ComparisonOwnV540(value, target)}</div>`).join("")}</div>`;
}

function g1ComparisonQueriesV540(competitor, values, label = "Вставить в поиск") {
  const domain = g1ComparisonDomainV540(competitor);
  if (!domain) return '<p class="g1ct-muted-v540">Укажите домен конкурента</p>';
  return `<div class="g1ct-queries-v540"><small>${escapeHtml(label)}</small>${g1CompetitorCopyRowsV539(values.map((value) => value.replaceAll("<домен>", domain)))}</div>`;
}

function g1ComparisonPhraseChoicesV540(competitor, ctx) {
  const selected = new Set(competitor.foundPhraseKeysV539 || []);
  const visibleCount = ctx.phrases.ranked.filter((row) => selected.has(row.key)).length;
  if (!ctx.phrases.ranked.length) return '<span class="g1ct-muted-v540">Нет фраз с частотностью</span>';
  return `<details class="g1ct-phrase-picker-v540"><summary>Выбрать фразы · ${visibleCount}</summary><div>${ctx.phrases.ranked.map((row) =>
    `<label><input type="checkbox" value="${escapeAttr(row.key)}" data-g1ct-phrase-v540="${escapeAttr(competitor.id)}" ${selected.has(row.key) ? "checked" : ""}>${escapeHtml(row.value)}</label>`).join("")}</div></details>`;
}

function g1ComparisonPhrasesV540(ctx, count = 15, quoted = false) {
  const phrases = ctx.phrases.ranked.slice(0, count);
  if (!phrases.length) return `<div class="g1ct-missing-v540">${ctx.phrases.confirmed.length ? "Нет частотности у подтверждённых фраз" : "Нет подтверждённых фраз"}${g1CompetitorSourceLinkV539({ gateId: "gate-1", kind: "gate1-keywords", productId: ctx.product.id })}</div>`;
  const values = phrases.map((row) => quoted ? `"${row.value}"` : row.value);
  const note = quoted ? "" : `Регион: ${ctx.geography || "не указан в Gate 0"} · ${ctx.phrases.source}${ctx.phrases.file ? ` · ${ctx.phrases.file}` : ""}${ctx.phrases.archived ? " · часть метрик из архива категории" : ""}`;
  return `<div class="g1ct-phrases-v540 ${phrases.length > 3 ? "is-long" : ""}" tabindex="0" aria-label="${phrases.length} фраз для поиска">${note ? `<small>${escapeHtml(note)}</small>` : ""}${phrases.map((row, index) =>
    `<div class="g1ct-phrase-v540"><code>${escapeHtml(values[index])}</code>${quoted ? "" : `<small>${escapeHtml(String(row.frequency))} запросов</small>`}<button type="button" class="small-btn" data-g1-competitor-copy-v539="${escapeAttr(values[index])}">Копировать</button></div>`).join("")}</div>`;
}

function g1ComparisonVisibilityV540(competitor, ctx) {
  const choices = [["organic", "Органика"], ["ads", "Реклама"], ["none", "Нет"]];
  const rows = ctx.phrases.ranked.slice(0, 3).map((row) => {
    const selected = competitor.visibilityByPhraseV540?.[row.key] || "";
    return `<div class="g1ct-visibility-row-v540"><code>${escapeHtml(row.value)}</code><div>${choices.map(([value, label]) =>
      `<label><input type="radio" name="g1ct-vis-${escapeAttr(competitor.id)}-${escapeAttr(row.key)}" value="${value}" data-g1ct-visibility-v540="${escapeAttr(competitor.id)}" data-g1ct-phrase-key-v540="${escapeAttr(row.key)}" ${selected === value ? "checked" : ""}>${label}</label>`).join("")}</div></div>`;
  }).join("");
  const old = [competitor.stepsV539?.[8]?.organicPhrases && `Органика: ${competitor.stepsV539[8].organicPhrases}`,
    competitor.stepsV539?.[8]?.adPhrases && `Реклама: ${competitor.stepsV539[8].adPhrases}`].filter(Boolean).join("\n");
  return `${rows || '<span class="g1ct-muted-v540">Нет подтверждённых фраз</span>'}${old ? `<small class="g1ct-legacy-v540">Сохранённые фразы: ${escapeHtml(old)}</small>` : ""}`;
}

function g1ComparisonRowsV540(ctx) {
  const productId = ctx.product.id;
  const snapshot = ctx.snapshot;
  const page = snapshot.page.row || {};
  const gate0 = (field) => ({ gateId: "gate-0", kind: "gate0-scoped", productId, field });
  const gate1Page = { gateId: "gate-1", kind: "gate1-page", cardId: snapshot.page.card?.id || "", rowId: page.id || "" };
  const gate4 = { gateId: "gate-4", productId };
  const f = (c, step, fields) => g1ComparisonFieldsV540(c, step, fields);
  const saved = (c, step, ...keys) => keys.some((key) => String(c.stepsV539?.[step]?.[key] || "").trim());
  const excludedChannels = new Set((g3Gate0Marketing().channels || []).flatMap((channel, index) =>
    ["not_needed", "not_required"].includes(guruCanonStatus(channel.status))
      ? [g4LaunchChannelKey(channel, index)] : []));
  const campaigns = (snapshot.campaigns || []).filter((row) =>
    row.source === "Gate 4" && !["not_needed", "not_required"].includes(guruCanonStatus(row.status)) &&
    !excludedChannels.has(row.channelKey))
    .map((row) => row.name).join("\n");
  const platformUrl = megaPlatformProductUrl(ctx.product, state);
  const ownUrl = platformUrl || page.url || "";
  const ownUrlTarget = platformUrl
    ? { gateId: "gate-0", kind: "gate0-landing", productId }
    : gate1Page;
  const query = (c, terms, label) => g1ComparisonQueriesV540(c, terms, label);
  return [
    { step: 1, title: "Поиск", question: "Какие фразы вставить в Яндекс?", own: () => g1ComparisonPhrasesV540(ctx), competitor: () => '<span class="g1ct-muted-v540">—</span>' },
    { step: 1, title: "Поиск", question: "По каким фразам найден?", own: () => '—', competitor: (c) => g1ComparisonPhraseChoicesV540(c, ctx), complete: (c) => ctx.phrases.ranked.some((row) => (c.foundPhraseKeysV539 || []).includes(row.key)) },
    { step: 1, title: "Поиск", question: "Сколько фраз совпало?", own: () => '—', competitor: (c) => `<strong>${ctx.phrases.ranked.filter((row) => (c.foundPhraseKeysV539 || []).includes(row.key)).length}</strong>` },
    { step: 1, title: "Поиск", question: "Где показан?", own: () => '—', competitor: (c) => g1ComparisonChoiceV540(c, "placement", [["organic", "Органика"], ["ads", "Реклама"], ["both", "Оба"]], c.organicV539 && c.adsV539 ? "both" : c.organicV539 ? "organic" : c.adsV539 ? "ads" : ""), complete: (c) => c.organicV539 || c.adsV539 },
    { step: 2, title: "Классификация", question: "Тот же JTBD, сегмент, цена и география?", own: () => g1ComparisonOwnPartsV540([["JTBD", snapshot.jtbd, gate0("jtbd")], ["Сегмент", snapshot.segment, gate0("segments")], ["Цена", ctx.price.raw && `${ctx.price.raw} ₽`, gate1Page], ["География", ctx.geography, { gateId: "gate-0" }]]), competitor: (c) => g1ComparisonChoiceV540(c, "sameMarket", [["yes", "Да"], ["no", "Нет"]], c.classificationV539?.sameMarket), complete: (c) => !!c.classificationV539?.sameMarket },
    { step: 2, title: "Классификация", question: "Тот же тип бизнеса?", own: () => g1ComparisonOwnV540(state.project?.niche || state.project?.type, { gateId: "gate-0" }), competitor: (c) => g1ComparisonChoiceV540(c, "sameBusiness", [["yes", "Да"], ["no", "Нет"]], c.classificationV539?.sameBusiness), complete: (c) => !!c.classificationV539?.sameBusiness },
    { step: 2, title: "Классификация", question: "Какой тип конкурента?", own: () => '—', competitor: (c) => `<strong>${escapeHtml(G1_COMPETITOR_TYPES_V539[g1CompetitorTypeV539(c)])}</strong>` },
    { step: 3, title: "Продукт", question: "Какой ближайший аналог?", own: () => g1ComparisonOwnPartsV540([["Название", ctx.product.name, { gateId: "gate-0", productId }], [platformUrl ? "URL · Платформа" : "URL · карточка Gate 1", ownUrl, ownUrlTarget]]), competitor: (c) => `${f(c, 3, [["analogName", "Название аналога"], ["analogUrl", "URL аналога", "url"]])}${query(c, [`site:<домен> ${ctx.mainWord}`, ctx.secondPhrase && `site:<домен> ${ctx.secondPhrase}`].filter(Boolean))}`, complete: (c) => saved(c, 3, "analogName", "analogUrl") },
    { step: 3, title: "Продукт", question: "Какие характеристики?", own: () => g1ComparisonOwnV540(snapshot.cardSummary, gate1Page), competitor: (c) => f(c, 3, [["characteristics", "Характеристики"]]), complete: (c) => saved(c, 3, "characteristics") },
    { step: 4, title: "Цена", question: "Сколько стоит?", own: () => g1ComparisonOwnV540(ctx.price.raw && `${ctx.price.raw} ₽`, gate1Page), competitor: (c) => f(c, 4, [["priceAnalog", "Цена аналога, ₽", "price"]]), complete: (c) => saved(c, 4, "priceAnalog") },
    { step: 4, title: "Цена", question: "Какой разброс цен?", own: () => '—', competitor: (c) => f(c, 4, [["priceMin", "Минимальная, ₽", "price"], ["priceMax", "Максимальная, ₽", "price"]]), complete: (c) => saved(c, 4, "priceMin", "priceMax") },
    { step: 4, title: "Цена", question: "Дешевле или дороже нас?", own: () => '—', competitor: (c) => `<strong>${escapeHtml(g1CompetitorPriceSegmentV539(c, ctx))}</strong>` },
    { step: 5, title: "JTBD и сегмент", question: "Какую задачу решает?", own: () => g1ComparisonOwnV540(snapshot.jtbd, gate0("jtbd")), competitor: (c) => f(c, 5, [["jtbdFunctional", "Функциональная"], ["jtbdSocial", "Социальная"], ["jtbdEmotional", "Эмоциональная"]]), complete: (c) => saved(c, 5, "jtbdFunctional", "jtbdSocial", "jtbdEmotional") },
    { step: 5, title: "JTBD и сегмент", question: "Для кого?", own: () => g1ComparisonOwnV540(snapshot.segment, gate0("segments")), competitor: (c) => f(c, 5, [["segment", "Сегмент"]]), complete: (c) => saved(c, 5, "segment") },
    { step: 6, title: "Позиционирование", question: "Как он себя называет одной фразой?", own: () => g1ComparisonOwnV540(snapshot.positioning, gate0("positioning")), competitor: (c) => `${f(c, 6, [["positioning", "Позиционирование"]])}${query(c, ["site:<домен>"])}`, complete: (c) => saved(c, 6, "positioning") },
    { step: 6, title: "Позиционирование", question: "Что написано в title и H1?", own: () => g1ComparisonOwnPartsV540([["title", page.title, gate1Page], ["H1", page.h1, gate1Page]]), competitor: (c) => `${f(c, 6, [["quote", "Цитата title / H1"]])}${query(c, ctx.mainWord ? [`title:${ctx.mainWord} site:<домен>`] : [])}`, complete: (c) => saved(c, 6, "quote") },
    { step: 7, title: "Паритет и отличия", question: "Что есть у обоих и обязательно для категории?", own: () => '—', competitor: (c) => f(c, 7, [["parity", "Паритет"]]), complete: (c) => saved(c, 7, "parity") },
    { step: 7, title: "Паритет и отличия", question: "Чем отличается?", own: () => g1ComparisonOwnPartsV540([["УТП", snapshot.usp, gate0("usp")], ["Доверие", snapshot.trust, gate1Page]]), competitor: (c) => f(c, 7, [["competitorDifferences", "Отличия конкурента"], ["ourDifferences", "Наши отличия"]]), complete: (c) => saved(c, 7, "competitorDifferences", "ourDifferences") },
    { step: 8, title: "Ключевые слова и реклама", question: "Показывается ли по нашим главным фразам?", own: () => g1ComparisonPhrasesV540(ctx, 3, true), competitor: (c) => g1ComparisonVisibilityV540(c, ctx), complete: (c) => Object.values(c.visibilityByPhraseV540 || {}).some(Boolean) || saved(c, 8, "organicPhrases", "adPhrases") },
    { step: 8, title: "Ключевые слова и реклама", question: "Что написано в его объявлениях?", own: () => '—', competitor: (c) => f(c, 8, [["adTexts", "Тексты"], ["offers", "Офферы"], ["triggers", "Триггеры"]]), complete: (c) => saved(c, 8, "adTexts", "offers", "triggers") },
    { step: 9, title: "Как продаёт", question: "Как устроены посадочная, CTA, каналы?", own: () => g1ComparisonOwnPartsV540([["Посадочная", snapshot.landing, gate1Page], ["CTA", snapshot.cta, gate1Page], ["Каналы Gate 4", campaigns, gate4]]), competitor: (c) => `${f(c, 9, [["landingStructure", "Посадочная"], ["cta", "CTA"], ["payment", "Оплата"], ["channels", "Каналы"], ["trafficSources", "Источники трафика"]])}${query(c, ["<домен>"], "Вставить в Similarweb")}`, complete: (c) => saved(c, 9, "landingStructure", "cta", "payment", "channels", "trafficSources") },
    { step: 10, title: "География и доставка", question: "Куда, за сколько и в какие сроки доставляет?", own: () => g1ComparisonOwnV540(ctx.geography, { gateId: "gate-0" }), competitor: (c) => `${f(c, 10, [["regions", "Регионы"], ["deliveryTime", "Сроки"], ["deliveryCost", "Стоимость"], ["pickup", "Самовывоз"]])}${query(c, ["site:<домен> доставка"])}`, complete: (c) => saved(c, 10, "regions", "deliveryTime", "deliveryCost", "pickup") },
    { step: 11, title: "Доверие", question: "Какой рейтинг и что пишут в отзывах?", own: () => '—', competitor: (c) => `${f(c, 11, [["rating", "Рейтинг"], ["reviewCount", "Число отзывов"], ["praise", "Похвалы"], ["complaints", "Жалобы"]])}${query(c, ["<домен> отзывы"])}`, complete: (c) => saved(c, 11, "rating", "reviewCount", "praise", "complaints") },
    { step: 12, title: "Вывод", question: "3 сильные и 3 слабые стороны?", own: () => '—', competitor: (c) => `${f(c, 12, [["strength1", "Сильная 1"], ["strength2", "Сильная 2"], ["strength3", "Сильная 3"], ["weakness1", "Слабая 1"], ["weakness2", "Слабая 2"], ["weakness3", "Слабая 3"]])}${c.stepsV539?.[12]?.legacySummary ? f(c, 12, [["legacySummary", "Перенесённый вывод"]]) : ""}`, complete: (c) => saved(c, 12, "strength1", "strength2", "strength3", "weakness1", "weakness2", "weakness3", "legacySummary") },
    { step: 12, title: "Вывод", question: "Что нам взять и чем отличаться?", own: () => '—', competitor: (c) => f(c, 12, [["takeaway", "Вывод для нас"]]), complete: (c) => saved(c, 12, "takeaway") },
    { step: 12, title: "Вывод", question: "Когда зафиксировано, где доказательства?", own: () => '—', competitor: (c) => f(c, 12, [["fixedDate", "Дата", "date"], ["evidence", "URL / скриншоты"]]), complete: (c) => saved(c, 12, "fixedDate", "evidence") },
  ];
}

function g1ComparisonTableStatusV540(entry, ctx) {
  const direct = entry.competitors.filter((row) => g1CompetitorTypeV539(row) === "direct");
  const questions = g1ComparisonRowsV540(ctx).filter((row) => row.complete);
  const total = direct.length * questions.length;
  const filled = direct.reduce((count, competitor) => count + questions.filter((row) => row.complete(competitor)).length, 0);
  return { status: !filled ? "not_started" : filled === total ? "ready" : "in_progress", filled, total };
}

function g1ComparisonTableHtmlV540(entry, ctx) {
  const rows = g1ComparisonRowsV540(ctx);
  const columns = entry.competitors.length + 2;
  let currentStep = 0;
  const body = rows.map((row) => {
    const heading = row.step !== currentStep
      ? `<tr class="g1ct-step-heading-v540"><th colspan="${columns}" scope="colgroup">${row.step}. ${escapeHtml(row.title)}</th></tr>` : "";
    currentStep = row.step;
    const own = `<td class="g1ct-own-v540"><div class="g1ct-question-v540">${escapeHtml(row.question)}</div><div class="g1ct-answer-v540">${row.own()}</div></td>`;
    const competitors = entry.competitors.map((competitor) => {
      const direct = g1CompetitorTypeV539(competitor) === "direct";
      return `<td class="g1ct-competitor-v540 ${!direct && row.step >= 3 ? "g1ct-not-required-v540" : ""}" data-g1ct-cell-v540="${escapeAttr(competitor.id)}:${row.step}"><div class="g1ct-question-v540">${escapeHtml(row.question)}</div><div class="g1ct-answer-v540">${direct || row.step <= 2 ? row.competitor(competitor) : '<span>Не требуется</span>'}</div></td>`;
    }).join("");
    return `${heading}<tr data-g1ct-question-v540="${row.step}:${escapeAttr(row.question)}">${own}${competitors}<td class="g1ct-add-cell-v540"></td></tr>`;
  }).join("");
  return `<div class="g1ct-scroll-v540" tabindex="0" aria-label="Сравнение выбранного продукта"><table class="g1ct-table-v540" style="--comparison-columns:${entry.competitors.length}"><thead><tr><th class="g1ct-own-v540" scope="col"><span class="project-comparison-own-label">Наш продукт (авто)</span><strong>${escapeHtml(ctx.product.name)}</strong></th>${entry.competitors.map((competitor, index) => {
    const domain = competitor.domain || competitor.siteDomainV538 || "";
    return `<th class="g1ct-competitor-head-v540" scope="col" data-g1ct-head-v540="${escapeAttr(competitor.id)}"><label><span>Конкурент ${index + 1} · название</span><input value="${escapeAttr(competitor.name || "")}" data-g1ct-name-v540="${escapeAttr(competitor.id)}"></label><label><span>Домен</span><input inputmode="url" value="${escapeAttr(domain)}" data-g1ct-domain-v540="${escapeAttr(competitor.id)}"><small aria-live="polite"></small></label><div><span>Тип: <b>${escapeHtml(G1_COMPETITOR_TYPES_V539[g1CompetitorTypeV539(competitor)])}</b></span><button type="button" data-g1ct-delete-v540="${escapeAttr(competitor.id)}">Удалить</button></div></th>`;
  }).join("")}<th class="g1ct-add-head-v540" scope="col"><button type="button" class="small-btn" data-g1ct-add-v540>+ Конкурент</button></th></tr></thead><tbody>${body}</tbody></table></div>`;
}

projectComparisonProductStatus = function (entry) {
  if (!entry?.product_id) return { status: "not_started", filled: 0, total: 0 };
  g1ComparisonTableMigrateV540(entry);
  const product = guruV194Product(entry.product_id, state);
  return product ? g1ComparisonTableStatusV540(entry, g1CompetitorContextV539(product))
    : { status: "not_started", filled: 0, total: 0 };
};

projectComparisonProductHtml = function (product = guruV194SelectedProduct(state)) {
  if (!product?.id) return `<section class="project-comparison project-comparison-product-v309 g1-section"><div class="project-comparison-heading"><b>Сравнение проектов · Продукт/Услуга</b></div><div class="project-comparison-body"><p>Выберите продукт.</p></div></section>`;
  const entry = g1ComparisonTableMigrateV540(ensureProjectComparisonProduct(product.id));
  const ctx = g1CompetitorContextV539(product);
  const status = g1ComparisonTableStatusV540(entry, ctx);
  const statusKey = `project-comparison-product-${product.id}`;
  return `<section class="project-comparison project-comparison-product-v309 g1-section g1-competitor-workflow-v539 g1ct-v540 ${entry.open ? "is-open" : ""}" data-project-comparison-product="${escapeAttr(product.id)}" data-g1ct-product-v540="${escapeAttr(product.id)}"><button type="button" class="project-comparison-heading" data-project-comparison-product-toggle data-project-comparison-product-id="${escapeAttr(product.id)}" aria-expanded="${entry.open ? "true" : "false"}"><span><b>Сравнение проектов · Продукт/Услуга</b><small>${escapeHtml(product.name)}</small></span><span class="project-comparison-heading-meta">${g1CompetitorStatusPillV539(status.status)}<span data-status-block-meta="${escapeAttr(statusKey)}">${status.filled}/${status.total} ответов прямых конкурентов · ${entry.competitors.length} колонок</span></span><i>${entry.open ? "Свернуть ↑" : "Развернуть ↓"}</i></button><div class="project-comparison-body" ${entry.open ? "" : "hidden"}><h3 class="g1ct-title-v540">Сравнение</h3>${g1ComparisonTableHtmlV540(entry, ctx)}</div></section>`;
};

function g1ComparisonFindV540(target) {
  const productId = target.closest("[data-g1ct-product-v540]")?.dataset.g1ctProductV540;
  if (!productId) return {};
  const entry = g1ComparisonTableMigrateV540(ensureProjectComparisonProduct(productId));
  const id = target.dataset.g1ctCompetitorV540 || target.dataset.g1ctNameV540 || target.dataset.g1ctDomainV540 || target.dataset.g1ctPhraseV540 || target.dataset.g1ctVisibilityV540 || target.dataset.g1ctDeleteV540;
  return { entry, productId, competitor: entry.competitors.find((row) => row.id === id) };
}

function g1ComparisonSaveV540(rerender = false) {
  flashSaving();
  if (rerender) renderGate();
}

document.addEventListener("input", (event) => {
  const target = event.target;
  if (!target.closest?.("[data-g1ct-product-v540]")) return;
  const { competitor } = g1ComparisonFindV540(target);
  if (!competitor) return;
  if (target.dataset.g1ctNameV540) competitor.name = target.value;
  else if (target.dataset.g1ctDomainV540) {
    const normalized = projectComparisonProductDomainV538(target.value);
    if (!normalized) return;
    competitor.domain = normalized;
    competitor.siteDomainV538 = normalized;
  }
  else if (target.dataset.g1ctFieldV540) {
    const step = target.dataset.g1ctStepV540;
    competitor.stepsV539[step] = competitor.stepsV539[step] || {};
    competitor.stepsV539[step][target.dataset.g1ctFieldV540] = target.value;
  } else return;
  g1ComparisonSaveV540();
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!target.closest?.("[data-g1ct-product-v540]")) return;
  const { competitor } = g1ComparisonFindV540(target);
  if (!competitor) return;
  if (target.dataset.g1ctDomainV540) {
    const normalized = projectComparisonProductDomainV538(target.value);
    const error = target.closest("label")?.querySelector("small");
    if (target.value.trim() && !normalized) {
      if (error) error.textContent = "Введите домен или URL сайта.";
      return;
    }
    competitor.domain = normalized;
    competitor.siteDomainV538 = normalized;
  } else if (target.dataset.g1ctPhraseV540) {
    const keys = new Set(competitor.foundPhraseKeysV539 || []);
    if (target.checked) keys.add(target.value);
    else keys.delete(target.value);
    competitor.foundPhraseKeysV539 = [...keys];
  } else if (target.dataset.g1ctChoiceV540 === "placement") {
    competitor.organicV539 = target.value === "organic" || target.value === "both";
    competitor.adsV539 = target.value === "ads" || target.value === "both";
  } else if (["sameMarket", "sameBusiness"].includes(target.dataset.g1ctChoiceV540)) {
    competitor.classificationV539[target.dataset.g1ctChoiceV540] = target.value;
    competitor.typeV539 = g1CompetitorTypeV539(competitor);
  } else if (target.dataset.g1ctVisibilityV540) {
    competitor.visibilityByPhraseV540[target.dataset.g1ctPhraseKeyV540] = target.value;
  } else if (target.dataset.g1ctNameV540 || target.dataset.g1ctFieldV540) {
    // The input handler already persisted the value. Re-render derived cells.
  } else return;
  g1ComparisonSaveV540(true);
});

document.addEventListener("click", (event) => {
  const add = event.target.closest?.("[data-g1ct-add-v540]");
  const remove = event.target.closest?.("[data-g1ct-delete-v540]");
  if (!add && !remove) return;
  const { entry, competitor } = g1ComparisonFindV540(add || remove);
  if (!entry) return;
  if (add) {
    entry.competitors.push({ id: makeId("comparison-product-competitor"), name: "", domain: "", siteDomainV538: "", typeV539: "unclassified", classificationV539: { sameMarket: "", sameBusiness: "" }, foundPhraseKeysV539: [], stepsV539: {}, visibilityByPhraseV540: {} });
  } else {
    if (!competitor || !window.confirm(`Удалить «${competitor.name || competitor.domain || "конкурента"}» из сравнения? Сохранённые данные останутся в архиве.`)) return;
    entry.archivedCompetitorsV540.push(competitor);
    entry.competitors = entry.competitors.filter((row) => row.id !== competitor.id);
    entry.candidatesV539 = entry.candidatesV539.filter((row) => row.id !== competitor.id);
  }
  g1ComparisonSaveV540(true);
});

/* v543 · Compact Bergen–Peteraf comparison. The v539/v540 records remain intact. */
const G1_BERGEN_FIELDS_V543 = [
  "marketSegment", "marketGeography", "businessType", "made", "salesChannels",
  "similarity", "product", "price", "positioning", "parity", "offerCta",
  "adsKeywords", "delivery", "trust", "taskClosure", "strengths", "weaknesses",
  "takeaway", "differentiate", "fixedDate", "evidence",
];

function g1BergenJtbdsV543(product) {
  // Category moves can archive the fully populated Gate 1 row while leaving a
  // small active row. Both still belong to the same product_id.
  const maps = state.painV130?.productMaps || [];
  const active = maps.map((map) => map.items?.[product.id]);
  const archived = maps.flatMap((map) => Object.values(map.legacyPageItemsV237 || {})
    .filter((archive) => archive?.mapped_product_id === product.id)
    .map((archive) => archive.data));
  const records = [...active, ...archived].filter((row) => row && typeof row === "object");
  const main = String(guruGate1ResolvedMainJtbdV259(product.id).value || "").trim();
  const additional = [...new Map(records.flatMap((row) =>
    Array.isArray(row.semL4Model?.additionalJtbds) ? row.semL4Model.additionalJtbds : [])
    .filter((row) => row?.id).map((row) => [String(row.id), row])).values()];
  const jtbds = [
    ...(main ? [{ id: `primary:${product.id}`, text: main }] : []),
    ...additional.map((row) => ({
      id: String(row?.id || ""),
      text: String(guruV194JtbdSentence(row) || guruGate1AdditionalJtbdTextV268(row) || "").trim(),
    })).filter((row) => row.id && row.text),
  ];
  const confirmed = new Set(guruGate1FinalConfirmedV259(product)
    .map((row) => guruV247KeywordNormalize(row.value)));
  const frequencyFallback = new Map(g1CompetitorPhrasesV539(product).ranked
    .map((row) => [row.key, row.frequency]));
  const rankedRecords = [...records].sort((a, b) => (b.demandRows?.length || 0) - (a.demandRows?.length || 0) ||
    Object.keys(b.jtbdKeywordAssignmentsV274 || {}).length - Object.keys(a.jtbdKeywordAssignmentsV274 || {}).length);
  return jtbds.map((jtbd, index) => {
    const scope = jtbd.id === `primary:${product.id}` ? "primary" : "additional";
    const entries = rankedRecords.map((itemData) => guruGate1GroupFinalEntriesV279(
      scope, scope === "primary" ? "" : jtbd.id, product.id, itemData,
    )).find((rows) => rows.length) || [];
    const seen = new Set();
    const phrases = entries.flatMap(({ demandRow }) => {
      const value = String(demandRow?.kw || "").trim();
      const key = guruV247KeywordNormalize(value);
      const frequency = pv181DemandQueryNumberV262(demandRow?.queryCount) ??
        frequencyFallback.get(key) ?? null;
      if (!key || seen.has(key) || !confirmed.has(key) || frequency === null) return [];
      seen.add(key);
      return [{ key, value, frequency }];
    }).sort((a, b) => b.frequency - a.frequency || a.value.localeCompare(b.value, "ru"));
    return { id: jtbd.id, text: jtbd.text, primary: index === 0, phrases, top: phrases.slice(0, 5) };
  });
}

function g1BergenMigrateV543(entry, product) {
  g1ComparisonTableMigrateV540(entry);
  const jtbds = g1BergenJtbdsV543(product);
  entry.competitors.forEach((competitor) => {
    if (competitor.bergenMigratedV543) return;
    const data = competitor.bergenV543 && typeof competitor.bergenV543 === "object"
      ? competitor.bergenV543 : {};
    const steps = competitor.stepsV539 || {};
    const old = (step, key) => String(steps[step]?.[key] || "").trim();
    const merge = (...parts) => parts.filter((part) => String(part || "").trim()).join("\n");
    const line = (label, value) => value ? `${label}: ${value}` : "";
    const put = (key, value) => {
      if (!String(data[key] || "").trim() && String(value || "").trim()) data[key] = value;
    };
    const oldKeys = new Set(competitor.foundPhraseKeysV539 || []);
    if (!Array.isArray(data.matchedJtbdIdsV543)) data.matchedJtbdIdsV543 = jtbds
      .filter((jtbd) => jtbd.phrases.some((phrase) => oldKeys.has(phrase.key)))
      .map((jtbd) => jtbd.id);
    put("similarity", competitor.classificationV539?.sameBusiness);
    put("marketSegment", old(5, "segment"));
    put("marketGeography", old(10, "regions"));
    put("product", merge(line("Аналог", old(3, "analogName")), line("URL", old(3, "analogUrl")), old(3, "characteristics")));
    const price = old(4, "priceAnalog");
    const parsedPrice = price.replace(/[\s\u00a0₽]/g, "").replace(",", ".");
    if (parsedPrice && /^\d+(?:\.\d+)?$/.test(parsedPrice)) put("price", parsedPrice);
    put("positioning", merge(old(6, "positioning"), line("Цитата", old(6, "quote"))));
    put("parity", old(7, "parity"));
    put("salesChannels", merge(line("Каналы", old(9, "channels")), line("Источники трафика", old(9, "trafficSources"))));
    put("offerCta", merge(line("Оффер", old(8, "offers")), line("CTA", old(9, "cta")),
      line("Как продаёт", old(9, "landingStructure")), line("Оплата", old(9, "payment"))));
    const visibility = Object.entries(competitor.visibilityByPhraseV540 || {})
      .filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join("\n");
    const placement = typeof competitor.organicV539 === "boolean" || typeof competitor.adsV539 === "boolean"
      ? [competitor.organicV539 && "Органика", competitor.adsV539 && "Реклама"].filter(Boolean).join(" и ") || "Не показан"
      : "";
    put("adsKeywords", merge(line("Органика", old(8, "organicPhrases")), line("Реклама", old(8, "adPhrases")),
      old(8, "adTexts"), line("Триггеры", old(8, "triggers")), line("Где показан", placement), visibility));
    put("delivery", merge(line("Сроки", old(10, "deliveryTime")), line("Стоимость", old(10, "deliveryCost")), line("Самовывоз", old(10, "pickup"))));
    put("trust", merge(line("Рейтинг", old(11, "rating")), line("Отзывов", old(11, "reviewCount")),
      line("Хвалят", old(11, "praise")), line("Жалуются", old(11, "complaints"))));
    put("strengths", merge(...[1, 2, 3].map((n) => old(12, `strength${n}`)),
      line("Отличия конкурента", old(7, "competitorDifferences")),
      line("Прежний вывод", old(12, "legacySummary"))));
    put("weaknesses", merge(...[1, 2, 3].map((n) => old(12, `weakness${n}`))));
    put("takeaway", old(12, "takeaway"));
    put("differentiate", old(7, "ourDifferences"));
    const date = old(12, "fixedDate");
    const russianDate = date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    put("fixedDate", russianDate ? `${russianDate[3]}-${russianDate[2]}-${russianDate[1]}` : date);
    put("evidence", old(12, "evidence"));
    competitor.bergenV543 = data;
    competitor.bergenMigratedV543 = true;
  });
  return { entry, jtbds };
}

function g1BergenTypeV543(competitor, jtbds) {
  const data = competitor.bergenV543 || {};
  const ids = new Set(data.matchedJtbdIdsV543 || []);
  const market = jtbds.some((jtbd) => ids.has(jtbd.id));
  if (!["yes", "no"].includes(data.similarity)) return "unclassified";
  return market ? data.similarity === "yes" ? "direct" : "substitute"
    : data.similarity === "yes" ? "potential" : "unrelated";
}

function g1BergenPhraseStripV543(ctx, jtbds) {
  const target = { gateId: "gate-1", kind: "gate1-keywords", productId: ctx.product.id };
  return `<section class="g1bp-phrase-strip-v543" aria-label="Что вставить в Яндекс">
    <header><strong>Что вставить в Яндекс</strong><span>Регион: ${ctx.geography ? escapeHtml(ctx.geography) : `Не заполнено в Gate 0 ${g1CompetitorSourceLinkV539({ gateId: "gate-0" })}`}</span></header>
    ${jtbds.length ? jtbds.map((jtbd) => `<div class="g1bp-phrase-jtbd-v543"><b>${jtbd.primary ? "Основной JTBD" : "JTBD"} · ${escapeHtml(jtbd.text)}</b>
      ${jtbd.top.length ? jtbd.top.map((phrase) => `<div class="g1bp-phrase-v543"><code>${escapeHtml(phrase.value)}</code><small>${Number(phrase.frequency).toLocaleString("ru-RU")} запросов</small><button type="button" class="small-btn" data-g1-competitor-copy-v539="${escapeAttr(phrase.value)}">Копировать</button></div>`).join("") : `<div class="g1ct-missing-v540">Нет финальных фраз с частотностью ${g1CompetitorSourceLinkV539(target)}</div>`}
    </div>`).join("") : `<div class="g1ct-missing-v540">Не заполнено в источнике ${g1CompetitorSourceLinkV539({ gateId: "gate-0", kind: "gate0-scoped", productId: ctx.product.id, field: "jtbd" })}</div>`}
  </section>`;
}

function g1BergenFieldV543(competitor, key, mode = "text") {
  const value = String(competitor.bergenV543?.[key] || "");
  const attrs = `data-g1bp-field-v543="${escapeAttr(key)}" data-g1bp-competitor-v543="${escapeAttr(competitor.id)}"`;
  if (mode === "price") return `<input type="number" min="0" step="0.01" inputmode="decimal" value="${escapeAttr(value)}" ${attrs} aria-label="Цена конкурента, ₽">`;
  if (mode === "date") return `<input type="${!value || /^\d{4}-\d{2}-\d{2}$/.test(value) ? "date" : "text"}" value="${escapeAttr(value)}" ${attrs} aria-label="Дата фиксации">`;
  return `<textarea rows="2" ${attrs} aria-label="${escapeAttr(key)}" placeholder="Впишите ответ">${escapeHtml(value)}</textarea>`;
}

function g1BergenChoicesV543(competitor, key, choices) {
  const selected = competitor.bergenV543?.[key] || "";
  return `<div class="g1bp-choices-v543" role="group">${choices.map(([value, label]) => `<label><input type="radio" name="g1bp-${escapeAttr(competitor.id)}-${escapeAttr(key)}" value="${escapeAttr(value)}" data-g1bp-choice-v543="${escapeAttr(key)}" data-g1bp-competitor-v543="${escapeAttr(competitor.id)}" ${selected === value ? "checked" : ""}>${escapeHtml(label)}</label>`).join("")}</div>`;
}

function g1BergenJtbdChoicesV543(competitor, jtbds) {
  const selected = new Set(competitor.bergenV543?.matchedJtbdIdsV543 || []);
  return jtbds.length ? `<div class="g1bp-jtbd-choices-v543">${jtbds.map((jtbd, index) => `<label><input type="checkbox" data-g1bp-jtbd-v543="${escapeAttr(jtbd.id)}" data-g1bp-competitor-v543="${escapeAttr(competitor.id)}" ${selected.has(jtbd.id) ? "checked" : ""}><span>№${index + 1}${jtbd.primary ? " · основной" : ""}</span></label>`).join("")}</div>`
    : '<span class="g1ct-muted-v540">Сначала добавьте JTBD продукта в Gate 0.</span>';
}

function g1BergenChannelsV543(snapshot) {
  const excluded = new Set((g3Gate0Marketing().channels || []).flatMap((channel, index) =>
    ["not_needed", "not_required"].includes(guruCanonStatus(channel.status))
      ? [g4LaunchChannelKey(channel, index)] : []));
  return (snapshot.campaigns || []).filter((row) => row.source === "Gate 4" &&
    !["not_needed", "not_required"].includes(guruCanonStatus(row.status)) &&
    !excluded.has(row.channelKey)).map((row) => row.name).join("\n");
}

function g1BergenRowsV543(ctx, jtbds) {
  const { product, snapshot } = ctx;
  const page = snapshot.page?.row || {};
  const context = page.contextFields || {};
  const gate0 = (field) => ({ gateId: "gate-0", kind: "gate0-scoped", productId: product.id, field });
  const gate1 = { gateId: "gate-1", kind: "gate1-page", cardId: snapshot.page?.card?.id || "", rowId: page.id || "" };
  const gate4 = { gateId: "gate-4", productId: product.id };
  const own = (value, target) => g1ComparisonOwnV540(value, target);
  const none = '<span class="g1ct-muted-v540">—</span>';
  const channels = g1BergenChannelsV543(snapshot);
  const reviews = (Array.isArray(context.productReviewsV514) ? context.productReviewsV514 : [])
    .map((row) => String(row?.text || "").trim()).filter(Boolean);
  const trust = [context.productRating && `Рейтинг: ${context.productRating}`,
    reviews.length && `Отзывы (${reviews.length}): ${reviews.join("; ")}`].filter(Boolean).join("\n");
  const delivery = [context.productDeliveryGuaranteeV253,
    ...(Array.isArray(context.productDeliveryCardsV255) ? context.productDeliveryCardsV255
      .map((row) => [row.title, row.description].filter(Boolean).join(": ")) : [])]
    .filter(Boolean).join("\n");
  const match = (c) => {
    const selected = new Set(c.bergenV543?.matchedJtbdIdsV543 || []);
    const count = jtbds.filter((jtbd) => selected.has(jtbd.id)).length;
    return `<strong>${count ? `Да (${count} из ${jtbds.length} JTBD)` : "Нет"}</strong>`;
  };
  const row = (label, ownHtml, competitor, key = "") => ({ label, ownHtml, competitor, key });
  return [
    { title: "ЭТАП 1. КТО КОНКУРЕНТ", groups: [
      { title: "Пересечение рынков", rows: [
        row("Задача (JTBD)", jtbds.length ? `<div class="g1bp-own-list-v543">${jtbds.map((jtbd, index) => `<div>№${index + 1}${jtbd.primary ? " · основной" : ""} — ${escapeHtml(jtbd.text)}</div>`).join("")}</div>` : own("", gate0("jtbd")), (c) => g1BergenJtbdChoicesV543(c, jtbds), "matchedJtbdIdsV543"),
        row("Кому", own(snapshot.segment, gate0("segments")), (c) => g1BergenFieldV543(c, "marketSegment"), "marketSegment"),
        row("География", own(ctx.geography, { gateId: "gate-0" }), (c) => g1BergenFieldV543(c, "marketGeography"), "marketGeography"),
        row("→ Совпадает?", none, match),
      ] },
      { title: "Сходство ресурсов", rows: [
        row("Тип бизнеса", own(state.project?.niche || state.project?.type, { gateId: "gate-0" }), (c) => g1BergenFieldV543(c, "businessType"), "businessType"),
        row("Как сделан продукт", own(context.productCreationV253, gate1), (c) => g1BergenFieldV543(c, "made"), "made"),
        row("Где продаёт", g1ComparisonOwnPartsV540([["Сайт", snapshot.landing, gate0("landing")], ["Каналы Gate 4", channels, gate4]]), (c) => g1BergenFieldV543(c, "salesChannels"), "salesChannels"),
        row("→ Похожи?", none, (c) => g1BergenChoicesV543(c, "similarity", [["yes", "Да"], ["no", "Нет"]]), "similarity"),
        row("Тип конкурента", none, (c) => `<strong>${escapeHtml(G1_COMPETITOR_TYPES_V539[g1BergenTypeV543(c, jtbds)])}</strong>`),
      ] },
    ] },
    { title: "ЭТАП 2. НАСКОЛЬКО ОН СИЛЁН", directOnly: true, groups: [
      { rows: [
        row("Продукт", own([product.name, snapshot.cardSummary].filter(Boolean).join("\n"), gate1), (c) => g1BergenFieldV543(c, "product"), "product"),
        row("Цена", own(ctx.price.raw && `${ctx.price.raw} ₽`, gate1), (c) => g1BergenFieldV543(c, "price", "price"), "price"),
        row("Позиционирование", own(snapshot.positioning, gate0("positioning")), (c) => g1BergenFieldV543(c, "positioning"), "positioning"),
        row("Что обязательно для категории (паритет)", none, (c) => g1BergenFieldV543(c, "parity"), "parity"),
        row("Оффер / CTA", g1ComparisonOwnPartsV540([["Оффер", snapshot.offer, gate0("offers")], ["CTA", snapshot.cta, gate0("cta")]]), (c) => g1BergenFieldV543(c, "offerCta"), "offerCta"),
        row("Реклама и ключевые слова", own(channels, gate4), (c) => g1BergenFieldV543(c, "adsKeywords"), "adsKeywords"),
        row("Доставка", own(delivery, gate1), (c) => g1BergenFieldV543(c, "delivery"), "delivery"),
        row("Доверие", own(trust, gate1), (c) => g1BergenFieldV543(c, "trust"), "trust"),
        row("Закрывает задачу клиента", none, (c) => g1BergenChoicesV543(c, "taskClosure", [["better", "Лучше"], ["same", "Так же"], ["worse", "Хуже"]]), "taskClosure"),
        row("Сильные стороны", none, (c) => g1BergenFieldV543(c, "strengths"), "strengths"),
        row("Слабые стороны", none, (c) => g1BergenFieldV543(c, "weaknesses"), "weaknesses"),
      ] },
    ] },
    { title: "ИТОГ", directOnly: true, groups: [
      { rows: [
        row("Что нам взять", none, (c) => g1BergenFieldV543(c, "takeaway"), "takeaway"),
        row("Чем отличаться", none, (c) => g1BergenFieldV543(c, "differentiate"), "differentiate"),
        row("Дата и источник", none, (c) => `<div class="g1bp-date-source-v543"><label><span>Дата</span>${g1BergenFieldV543(c, "fixedDate", "date")}</label><label><span>URL / скриншот</span>${g1BergenFieldV543(c, "evidence")}</label></div>`, "fixedDate,evidence"),
      ] },
    ] },
  ];
}

function g1BergenStatusV543(entry, ctx, jtbds) {
  const direct = entry.competitors.filter((competitor) => g1BergenTypeV543(competitor, jtbds) === "direct");
  const total = direct.length * (G1_BERGEN_FIELDS_V543.length + 1);
  const filled = direct.reduce((sum, competitor) => {
    const data = competitor.bergenV543 || {};
    return sum + G1_BERGEN_FIELDS_V543.filter((key) => String(data[key] || "").trim()).length +
      Number((data.matchedJtbdIdsV543 || []).some((id) => jtbds.some((jtbd) => jtbd.id === id)));
  }, 0);
  return { status: !filled ? "not_started" : filled === total ? "ready" : "in_progress", filled, total };
}

function g1BergenTableHtmlV543(entry, ctx, jtbds) {
  const sections = g1BergenRowsV543(ctx, jtbds);
  const sectionCells = (title) => `<th class="g1bp-own-v543" scope="row">${escapeHtml(title)}</th>${entry.competitors.map(() => `<td class="g1bp-competitor-v543">${escapeHtml(title)}</td>`).join("")}`;
  const phraseRow = `<tr class="g1bp-phrase-row-v547"><td class="g1bp-phrase-cell-v547" colspan="${entry.competitors.length + 1}">${g1BergenPhraseStripV543(ctx, jtbds)}</td></tr>`;
  const body = sections.map((section, index) => `<tr class="g1bp-stage-v543">${sectionCells(section.title)}</tr>${index === 0 ? phraseRow : ""}${section.groups.map((group) => `${group.title ? `<tr class="g1bp-group-v543">${sectionCells(group.title)}</tr>` : ""}${group.rows.map((row) => `<tr data-g1bp-row-v543="${escapeAttr(row.label)}">
    <td class="g1bp-own-v543"><small class="g1bp-criterion-v545">${escapeHtml(row.label)}</small>${row.ownHtml}</td>
    ${entry.competitors.map((competitor) => {
      const inactive = section.directOnly && g1BergenTypeV543(competitor, jtbds) !== "direct";
      return `<td class="g1bp-competitor-v543 ${inactive ? "g1bp-not-required-v543" : ""}" data-g1bp-cell-v543="${escapeAttr(competitor.id)}:${escapeAttr(row.label)}"><small class="g1bp-criterion-v545">${escapeHtml(row.label)}</small>${inactive ? '<span>не требуется</span>' : row.competitor(competitor)}</td>`;
    }).join("")}
  </tr>`).join("")}`).join("")}`).join("");
  return `<div class="g1bp-scroll-v543" tabindex="0" aria-label="Таблица сравнения продукта" style="--comparison-min-width:${(entry.competitors.length + 1) * 480}px;--comparison-mobile-min-width:${(entry.competitors.length + 1) * 320}px;--comparison-data-share:${100 / (entry.competitors.length + 1)}%"><table class="g1bp-table-v543"><colgroup><col span="${entry.competitors.length + 1}"></colgroup><thead><tr>
    <th class="g1bp-own-v543" scope="col"><span class="project-comparison-own-label">Наш продукт (авто)</span><strong>${escapeHtml(ctx.product.name)}</strong><small class="g1bp-own-head-note-v546">Сведения о нашем продукте · только чтение</small>${entry.competitors.length ? "" : '<button type="button" class="small-btn g1bp-add-v543" data-g1bp-add-v543>+ Конкурент</button>'}</th>
    ${entry.competitors.map((competitor, index) => `<th class="g1bp-competitor-head-v543" scope="col" data-g1bp-head-v543="${escapeAttr(competitor.id)}">
      <label><span>Конкурент ${index + 1} · название</span><input value="${escapeAttr(competitor.name || "")}" data-g1bp-name-v543="${escapeAttr(competitor.id)}" aria-label="Название конкурента ${index + 1}"></label>
      <label><span>Сайт или магазин на площадке</span><input type="text" inputmode="url" value="${escapeAttr(competitor.domain || competitor.siteDomainV538 || "")}" data-g1bp-domain-v543="${escapeAttr(competitor.id)}" aria-label="Сайт или магазин конкурента ${index + 1}"><small aria-live="polite"></small></label>
      <div class="g1bp-head-actions-v543"><span>Тип: <b>${escapeHtml(G1_COMPETITOR_TYPES_V539[g1BergenTypeV543(competitor, jtbds)])}</b></span><span><button type="button" data-g1bp-delete-v543="${escapeAttr(competitor.id)}">Удалить</button>${index === entry.competitors.length - 1 ? '<button type="button" class="small-btn g1bp-add-v543" data-g1bp-add-v543>+ Конкурент</button>' : ""}</span></div>
    </th>`).join("")}
  </tr></thead><tbody>${body}</tbody></table></div>`;
}

projectComparisonProductStatus = function (entry) {
  if (!entry?.product_id) return { status: "not_started", filled: 0, total: 0 };
  const product = guruV194Product(entry.product_id, state);
  if (!product) return { status: "not_started", filled: 0, total: 0 };
  const { jtbds } = g1BergenMigrateV543(entry, product);
  return g1BergenStatusV543(entry, g1CompetitorContextV539(product), jtbds);
};

projectComparisonProductHtml = function (product = guruV194SelectedProduct(state)) {
  if (!product?.id) return `<section class="project-comparison project-comparison-product-v309 g1-section"><div class="project-comparison-heading"><b>Сравнение проектов · Продукт/Услуга</b></div><div class="project-comparison-body"><p>Выберите продукт.</p></div></section>`;
  const entry = ensureProjectComparisonProduct(product.id);
  const { jtbds } = g1BergenMigrateV543(entry, product);
  const ctx = g1CompetitorContextV539(product);
  const status = g1BergenStatusV543(entry, ctx, jtbds);
  return `<section class="project-comparison project-comparison-product-v309 g1-section g1bp-v543 ${entry.open ? "is-open" : ""}" data-project-comparison-product="${escapeAttr(product.id)}" data-g1bp-product-v543="${escapeAttr(product.id)}">
    <button type="button" class="project-comparison-heading" data-project-comparison-product-toggle data-project-comparison-product-id="${escapeAttr(product.id)}" aria-expanded="${entry.open ? "true" : "false"}"><span><b>Сравнение проектов · Продукт/Услуга</b><small>${escapeHtml(product.name)}</small></span><span class="project-comparison-heading-meta">${g1CompetitorStatusPillV539(status.status)}<span data-g1bp-status-meta-v543>${status.filled}/${status.total} ответов прямых конкурентов · ${entry.competitors.length} колонок</span></span><i>${entry.open ? "Свернуть ↑" : "Развернуть ↓"}</i></button>
    <div class="project-comparison-body" ${entry.open ? "" : "hidden"}><h3 class="g1bp-title-v543">Сравнение</h3>${g1BergenTableHtmlV543(entry, ctx, jtbds)}</div>
  </section>`;
};

function g1BergenFindV543(target) {
  const section = target.closest?.("[data-g1bp-product-v543]");
  const productId = section?.dataset.g1bpProductV543;
  const product = productId ? guruV194Product(productId, state) : null;
  if (!product) return {};
  const entry = ensureProjectComparisonProduct(productId);
  const { jtbds } = g1BergenMigrateV543(entry, product);
  const id = target.dataset.g1bpCompetitorV543 || target.dataset.g1bpNameV543 ||
    target.dataset.g1bpDomainV543 || target.dataset.g1bpDeleteV543;
  return { section, product, entry, jtbds, competitor: entry.competitors.find((row) => row.id === id) };
}

function g1BergenRefreshStatusV543(section, entry, product, jtbds) {
  const status = g1BergenStatusV543(entry, g1CompetitorContextV539(product), jtbds);
  const pill = section.querySelector(".project-comparison-heading .status-pill");
  if (pill) {
    pill.className = `status-pill status-${status.status}`;
    pill.textContent = STATUS_LABELS[status.status] || status.status;
  }
  const meta = section.querySelector("[data-g1bp-status-meta-v543]");
  if (meta) meta.textContent = `${status.filled}/${status.total} ответов прямых конкурентов · ${entry.competitors.length} колонок`;
}

document.addEventListener("input", (event) => {
  const target = event.target;
  if (!target.closest?.("[data-g1bp-product-v543]")) return;
  const { section, product, entry, jtbds, competitor } = g1BergenFindV543(target);
  if (!competitor) return;
  if (target.dataset.g1bpNameV543) competitor.name = target.value;
  else if (target.dataset.g1bpDomainV543) {
    competitor.domain = target.value;
    const domain = projectComparisonProductDomainV538(target.value);
    if (domain) competitor.siteDomainV538 = domain;
  } else if (target.dataset.g1bpFieldV543) {
    competitor.bergenV543[target.dataset.g1bpFieldV543] = target.value;
  } else return;
  flashSaving();
  g1BergenRefreshStatusV543(section, entry, product, jtbds);
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (!target.closest?.("[data-g1bp-product-v543]")) return;
  const { competitor, jtbds } = g1BergenFindV543(target);
  if (!competitor) return;
  if (target.dataset.g1bpDomainV543) {
    const raw = target.value.trim();
    const domain = projectComparisonProductDomainV538(raw);
    const error = target.closest("label")?.querySelector("small");
    if (raw && !domain) {
      if (error) error.textContent = "Введите домен или URL сайта либо магазина.";
      return;
    }
    if (error) error.textContent = "";
    competitor.domain = raw;
    competitor.siteDomainV538 = domain;
  } else if (target.dataset.g1bpJtbdV543) {
    const valid = new Set(jtbds.map((jtbd) => jtbd.id));
    if (!valid.has(target.dataset.g1bpJtbdV543)) return;
    const selected = new Set(competitor.bergenV543.matchedJtbdIdsV543 || []);
    if (target.checked) selected.add(target.dataset.g1bpJtbdV543);
    else selected.delete(target.dataset.g1bpJtbdV543);
    competitor.bergenV543.matchedJtbdIdsV543 = [...selected];
  } else if (target.dataset.g1bpChoiceV543) {
    competitor.bergenV543[target.dataset.g1bpChoiceV543] = target.value;
  } else if (!target.dataset.g1bpFieldV543 && !target.dataset.g1bpNameV543) return;
  flashSaving();
  renderGate();
});

document.addEventListener("click", (event) => {
  const target = event.target.closest?.("[data-g1bp-add-v543], [data-g1bp-delete-v543]");
  if (!target) return;
  const { entry, competitor } = g1BergenFindV543(target);
  if (!entry) return;
  if (target.dataset.g1bpAddV543 !== undefined) {
    entry.competitors.push({ id: makeId("comparison-product-competitor"), name: "", domain: "",
      siteDomainV538: "", classificationV539: { sameMarket: "", sameBusiness: "" },
      foundPhraseKeysV539: [], stepsV539: {}, bergenV543: { matchedJtbdIdsV543: [] }, bergenMigratedV543: true });
  } else {
    if (!competitor || !window.confirm(`Удалить «${competitor.name || competitor.domain || "конкурента"}» из таблицы? Все его данные сохранятся в архиве.`)) return;
    entry.archivedCompetitorsV540 = Array.isArray(entry.archivedCompetitorsV540) ? entry.archivedCompetitorsV540 : [];
    entry.archivedCompetitorsV540.push(competitor);
    entry.competitors = entry.competitors.filter((row) => row.id !== competitor.id);
    entry.candidatesV539 = (entry.candidatesV539 || []).filter((row) => row.id !== competitor.id);
  }
  flashSaving();
  renderGate();
});
