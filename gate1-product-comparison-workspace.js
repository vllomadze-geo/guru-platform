/* Gate 1 product comparison: company-style navigation over the existing Bergen data. */
const g1ProductComparisonScreens = new WeakMap();
function g1ProductComparisonPageSize() { return window.innerWidth <= 700 ? 1 : 2; }
const G1_PRODUCT_COMPARISON_TYPES = [
  ["direct", "Прямые конкуренты"], ["substitute", "Заменители"],
  ["potential", "Потенциальные"], ["unrelated", "Не конкуренты"],
  ["unclassified", "Не классифицированы"],
];

function g1ProductComparisonScreen(productId) {
  let screens = g1ProductComparisonScreens.get(state);
  if (!screens) { screens = new Map(); g1ProductComparisonScreens.set(state, screens); }
  if (!screens.has(productId)) screens.set(productId, {
    phraseKey: "", filter: "", page: 0, querySearch: "", queryRating: "", querySort: "frequency",
    queryDirection: "desc", expandedQuery: "", matchesOpen: true, queriesOpen: false,
    expandedCompetitor: "",
  });
  return screens.get(productId);
}

function g1ProductComparisonModel(sectionOrProduct) {
  g1pcRepairDeliveryV603(state);
  const productId = typeof sectionOrProduct === "string" ? sectionOrProduct
    : sectionOrProduct?.dataset?.g1bpProductV543 || sectionOrProduct?.id;
  const product = guruV194Product(productId, state);
  if (!product) return null;
  const entry = ensureProjectComparisonProduct(productId);
  const { jtbds } = g1BergenMigrateV543(entry, product);
  return { product, entry, jtbds, ctx: g1BergenScopeContext(product), screen: g1ProductComparisonScreen(productId) };
}

function g1ProductComparisonPhrases(jtbds) {
  const phrases = new Map();
  for (const group of jtbds) for (const phrase of group.phrases) {
    const current = phrases.get(phrase.key);
    if (!current) phrases.set(phrase.key, { ...phrase, groupIds: [group.id] });
    else {
      current.groupIds.push(group.id);
      if (current.frequency === null && phrase.frequency !== null) current.frequency = phrase.frequency;
    }
  }
  return [...phrases.values()];
}

function g1ProductComparisonFinished(entry, phrase) {
  return Array.isArray(entry.searchFinishedPhraseKeysV601)
    ? entry.searchFinishedPhraseKeysV601.includes(phrase.key)
    : G1_BERGEN_RELEVANCE_V549.some(([value]) => entry.keywordRelevanceByPhraseV549?.[phrase.key] === value);
}

function g1ProductComparisonCurrent(model) {
  const phrases = g1ProductComparisonPhrases(model.jtbds);
  const ordered = [...phrases].sort((a, b) =>
    Number(g1ProductComparisonFinished(model.entry, a)) - Number(g1ProductComparisonFinished(model.entry, b)) ||
    (b.frequency ?? -1) - (a.frequency ?? -1) || a.value.localeCompare(b.value, "ru"));
  const current = phrases.find(row => row.key === model.screen.phraseKey) || ordered[0] || null;
  if (current) model.screen.phraseKey = current.key;
  return { phrases, current };
}

function g1ProductComparisonType(competitor, jtbds) {
  return g1BergenTypeV543(competitor, jtbds);
}

function g1ProductComparisonCounts(model, phraseKey) {
  const counts = Object.fromEntries(G1_PRODUCT_COMPARISON_TYPES.map(([key]) => [key, 0]));
  let total = 0;
  for (const competitor of model.entry.competitors) {
    if (!competitor.foundPhraseKeysV539?.includes(phraseKey)) continue;
    total++;
    counts[g1ProductComparisonType(competitor, model.jtbds)]++;
  }
  return { total, counts };
}

function g1ProductComparisonSearchCardHtml(competitor, options = {}) {
  const draft = options.draft === true;
  const id = escapeAttr(competitor.id);
  const data = g1BergenCompetitorSearchDataV569(competitor);
  const extraAds = String(competitor.bergenV543?.advertisements || "").split(/\r?\n/).slice(1).join("\n");
  const image = competitor.bergenV543?.searchPreviewV569?.image || "";
  const input = (name, value, placeholder, attributes = "") => `<input value="${escapeAttr(value || "")}" placeholder="${escapeAttr(placeholder)}" ${draft ? `name="${name}"` : attributes}>`;
  const text = (name, value, placeholder, attributes = "") => draft
    ? `<textarea name="${name}" rows="1" data-autosize="off" placeholder="${escapeAttr(placeholder)}">${escapeHtml(value || "")}</textarea>`
    : g1BergenSearchEditableTextV573(value, name, placeholder, placeholder, attributes, id);
  return `<div class="g1bp-serp-card-v569 g1pc-search-card"><div class="g1bp-serp-copy-v569">
    <label class="g1pc-preview-field g1pc-preview-title"><span>Заголовок в выдаче</span>${text("title", data.title, "Введите заголовок", 'data-g1bp-ad-part-v572="title"')}</label>
    <label class="g1pc-preview-field g1pc-preview-domain"><span>Домен</span>${input("domain", competitor.domain || competitor.siteDomainV538, "example.ru", `data-g1bp-domain-v543="${id}" inputmode="url"`)}${draft ? '<small data-g1pc-domain-note aria-live="polite"></small>' : '<small aria-live="polite"></small>'}</label>
    <div class="g1pc-preview-field"><span>Описание</span>${text("description", data.description, "Введите описание", 'data-g1bp-ad-part-v572="description"')}
      ${draft ? "" : `<label class="g1pc-preview-extra"><small>Доставка / дополнительная строка</small>${text("details", data.details, "Доставка / дополнительная строка", 'data-g1bp-search-field-v569="details"')}</label>`}
      ${!draft && extraAds ? `<details class="g1bp-serp-more-v572"><summary>Ещё объявления: ${extraAds.split("\n").filter(Boolean).length}</summary><textarea rows="3" data-autosize="off" aria-label="Остальные объявления конкурента" data-g1bp-ad-extra-v572 data-g1bp-competitor-v543="${id}">${escapeHtml(extraAds)}</textarea></details>` : ""}</div>
    <label class="g1pc-preview-field g1pc-preview-short"><span>Рейтинг ★</span>${input("rating", draft ? "" : data.rating || "0", "0", `data-g1bp-search-field-v569="rating" data-g1bp-competitor-v543="${id}" inputmode="decimal"`)}</label>
    <label class="g1pc-preview-field g1pc-preview-short"><span>Количество отзывов</span>${input("reviews", draft ? "" : data.reviews || "0", "0", `data-g1bp-search-field-v569="reviews" data-g1bp-competitor-v543="${id}" inputmode="numeric"`)}</label>
    <label class="g1pc-preview-field g1pc-preview-short"><span>Цена</span><span class="g1pc-preview-price">${draft
      ? '<input name="price" data-g1pc-draft-price inputmode="decimal" placeholder="—" aria-label="Цена конкурента в выдаче, ₽">'
      : g1BergenFieldV543(competitor, "price", "price")}<b>₽</b></span></label>
  </div><div class="g1pc-preview-photo"><span>Загрузка фотографии продукта</span><div class="g1bp-serp-photo-v569"><div class="g1bp-landing-photo-v575" data-g1bp-landing-photo-v575="${id}">${g1BergenLandingPhotoV575(image, competitor.name, draft ? { draft: true } : { competitorId: competitor.id })}</div>
    ${draft ? "" : `<button type="button" class="g1bp-serp-image-remove-v572" data-g1bp-search-photo-remove-v569="${id}" aria-label="Удалить фото продукта"${image ? "" : " hidden"}>×</button>`}</div></div>
  </div>`;
}

function g1ProductComparisonSimilarityChoiceHtml(competitor, context = "grid") {
  const draft = context === "draft";
  const id = escapeAttr(competitor.id);
  const value = draft ? null : competitor.bergenV543?.similarity || "";
  const name = draft ? "similarity" : `g1pc-similarity-${context}-${competitor.id}`;
  return `<div class="g1pc-choice-control g1pc-similarity-choice" data-g1pc-similarity-choice="${id}" role="group" aria-label="Похожесть предложения ${escapeAttr(competitor.name || "")}">
    <div class="g1pc-choice-segments">${[["yes", "Да"], ["no", "Нет"], ["", "Не указано"]].map(([option, label]) =>
      `<label><input type="radio" name="${escapeAttr(name)}" value="${option}"${value === option ? " checked" : ""}${draft ? "" : ` data-g1pc-similarity="${id}"`}><span>${label}</span></label>`).join("")}</div>
    <small>Сравните предложение после просмотра страницы</small></div>`;
}

function g1ProductComparisonSearchHtml(competitor, options = {}) {
  return `<div class="g1bp-serp-v569" data-g1bp-serp-v569="${escapeAttr(competitor.id)}" data-g1pc-search-edit>
    <small>Предпросмотр по введённым данным · фактический вид в поиске может отличаться</small>
    <div data-g1bp-serp-card-v569>${g1ProductComparisonSearchCardHtml(competitor, options)}</div></div>`;
}

function g1ProductComparisonMatchPanelHtml(model, competitor) {
  const id = escapeAttr(competitor.id);
  const phrases = g1ProductComparisonPhrases(model.jtbds);
  const currentKey = g1ProductComparisonCurrent(model).current?.key;
  const found = new Set(competitor.foundPhraseKeysV539 || []);
  return `<div class="g1-company-match-panel g1bp-preview-scroll-v575 g1pc-match-panel" data-g1pc-match-panel="${id}">
    <section class="g1pc-card-section"><h4>Мини-версия поисковой выдачи</h4>${g1ProductComparisonSearchHtml(competitor)}</section>
    <section class="g1pc-card-section g1pc-choice-section"><h4>Тип конкурента</h4>${g1pcTypeChoiceHtmlV603(competitor, model.jtbds, "editor")}</section>
    <section class="g1pc-card-section"><h4>Мини-версия посадочной страницы</h4>${g1BergenCompetitorLandingV575(competitor, { productComparison: true })}</section>
    <section class="g1pc-card-section g1pc-choice-section"><h4>Похожесть предложения</h4>${g1ProductComparisonSimilarityChoiceHtml(competitor, "editor")}</section>
    <div class="g1-company-match-queries"><strong>По каким запросам найден · ${phrases.filter(row => found.has(row.key)).length} из ${phrases.length}</strong>
      <ul>${phrases.filter(row => row.key !== currentKey).map(row => `<li><label><input type="checkbox" data-g1bp-found-keyword-v550="${id}" data-g1bp-keyword-jtbd-v550="${escapeAttr(row.groupIds[0])}" value="${escapeAttr(row.key)}"${found.has(row.key) ? " checked" : ""}><span>${escapeHtml(row.value)}</span></label></li>`).join("")}</ul>
    </div>
  </div>`;
}

function g1ProductComparisonRequestCount(count) {
  const lastTwo = count % 100, last = count % 10;
  const word = lastTwo >= 11 && lastTwo <= 14 ? "запросов" : last === 1 ? "запрос" : last >= 2 && last <= 4 ? "запроса" : "запросов";
  return `Найден по ${count} ${word}`;
}

function g1ProductComparisonGuideHtml(model) {
  const { phrases, current } = g1ProductComparisonCurrent(model);
  if (!current) return `<div class="g1-company-search-guide g1pc-guide" data-g1pc-guide>
    <strong>Поисковый запрос</strong><p>Добавьте ключевые слова продукта в блоке «Семантика и спрос».</p>
    ${g1CompetitorSourceLinkV539({ gateId: "gate-1", kind: "gate1-keywords", productId: model.product.id })}</div>`;
  const finished = g1ProductComparisonFinished(model.entry, current);
  const rated = G1_BERGEN_RELEVANCE_V549.some(([key]) => model.entry.keywordRelevanceByPhraseV549?.[current.key] === key);
  const processed = phrases.filter(row => g1ProductComparisonFinished(model.entry, row) &&
    G1_BERGEN_RELEVANCE_V549.some(([key]) => model.entry.keywordRelevanceByPhraseV549?.[row.key] === key)).length;
  const currentIndex = phrases.findIndex(row => row.key === current.key);
  const { total, counts } = g1ProductComparisonCounts(model, current.key);
  const selected = current.groupIds.some(id => model.entry.selectedKeywordKeysByJtbdV550?.[id]?.includes(current.key));
  const matching = model.entry.competitors.map((competitor, index) => ({ competitor, index }));
  return `<div class="g1-company-search-guide g1pc-guide" data-g1pc-guide>
    <div class="g1-company-search-guide-head"><strong>Поисковый запрос</strong><div class="g1-company-query-nav" data-g1pc-nav>
      <button type="button" class="g1-company-query-nav-toggle" data-g1pc-nav-toggle aria-expanded="false" aria-label="Поисковые запросы. Обработано ${processed} из ${phrases.length}. Выбрать запрос">
        <span class="g1-company-query-nav-summary">Обработано <strong>${processed} из ${phrases.length}</strong></span>
        <span class="g1-company-query-nav-position">Запрос ${currentIndex + 1} из ${phrases.length}</span>
        <span class="g1-company-query-nav-progress" aria-hidden="true"><span style="width:${phrases.length ? processed / phrases.length * 100 : 0}%"></span></span><span class="g1-company-query-nav-chevron" aria-hidden="true"></span>
      </button><div class="g1-company-query-nav-popover" data-g1pc-nav-list hidden><div class="g1-company-query-nav-list" role="group" aria-label="Выбрать поисковый запрос">
        ${phrases.map((row, index) => {
          const found = g1ProductComparisonCounts(model, row.key);
          const done = g1ProductComparisonFinished(model.entry, row) && G1_BERGEN_RELEVANCE_V549.some(([key]) => model.entry.keywordRelevanceByPhraseV549?.[row.key] === key);
          return `<button type="button" class="g1-company-query-nav-option${row.key === current.key ? " is-current" : ""}" data-g1pc-nav-option="${escapeAttr(row.key)}" aria-current="${row.key === current.key}">
            <span class="g1-company-query-nav-option-head"><span class="g1-company-query-nav-number">${index + 1}</span><strong>${escapeHtml(row.value)}</strong><small>${done ? "Обработан" : "Не обработан"}</small></span>
            <span class="g1-company-query-nav-stats"><span>Найдено по запросу: <b>${found.total}</b></span>${G1_PRODUCT_COMPARISON_TYPES.slice(0, 4).map(([kind, label]) => `<span>${label}: <b>${found.counts[kind]}</b></span>`).join("")}</span>
          </button>`;
        }).join("")}</div></div></div></div>
    <p>Скопируйте запрос, проверьте выдачу и отметьте найденных конкурентов. Затем завершите поиск и оцените релевантность.</p>
    <div class="g1-company-search-guide-phrase"><strong>${escapeHtml(current.value)}</strong><small>${current.frequency === null ? "Частотность не указана" : `${Number(current.frequency).toLocaleString("ru-RU")} запросов`}</small></div>
    <div class="g1-company-search-guide-actions">
      <button type="button" class="small-btn" data-g1pc-form-toggle aria-expanded="false">+ Конкурент</button>
      <button type="button" class="small-btn" data-g1-competitor-copy-v539="${escapeAttr(current.value)}">Копировать</button>
      <button type="button" class="small-btn" data-g1pc-finish${finished ? " disabled" : ""}>${finished ? "Поиск завершён" : "Завершить поиск по выбранному запросу"}</button>
      <button type="button" class="small-btn" data-g1pc-next${finished && (rated || total === 0) && phrases.length > 1 ? "" : " disabled"}>Следующий поисковый запрос</button>
    </div>
    <form class="g1-company-competitor-form g1pc-draft-form g1bp-preview-scroll-v575" data-g1pc-form hidden>
    <section class="g1pc-card-section"><h4>Мини-версия поисковой выдачи</h4>${g1ProductComparisonSearchHtml({ id: "draft", name: "", bergenV543: {} }, { draft: true })}</section>
    <section class="g1pc-card-section g1pc-choice-section"><h4>Тип конкурента</h4>${g1pcTypeChoiceHtmlV603({ id: "draft", name: "", bergenV543: {} }, model.jtbds, "draft")}</section>
    <section class="g1pc-card-section g1pc-draft-landing"><h4>Мини-версия посадочной страницы</h4>${g1BergenCompetitorLandingV575({ id: "draft", name: "", bergenV543: {} }, { draft: true, productComparison: true })}
      <div class="g1pc-landing-save"><button type="submit" class="small-btn" data-g1pc-save-without-landing>Сохранить без посадочной страницы</button><small>Данные страницы можно добавить позже.</small></div>
      <small role="alert" data-g1pc-landing-save-error></small></section>
    <section class="g1pc-card-section g1pc-choice-section"><h4>Похожесть предложения</h4>${g1ProductComparisonSimilarityChoiceHtml({ id: "draft", name: "", bergenV543: {} }, "draft")}</section>
    <small role="alert" data-g1pc-form-error></small><div class="g1-company-search-guide-actions">
      <button type="submit" class="small-btn">Добавить конкурента</button><button type="button" class="small-btn" data-g1pc-form-cancel>Отмена</button>
    </div></form>
    <div class="g1-company-search-guide-result">${finished ? `${g1BergenRelevanceFieldV549(model.entry, model.jtbds.find(group => group.id === current.groupIds[0]), current)}
      <button type="button" class="small-btn" data-g1pc-show aria-pressed="${selected}">${selected ? "Убрать из сравнения" : "Показать у конкурентов"}</button>` : `<small>После завершения поиска оцените релевантность запроса.</small>`}</div>
    ${finished ? `<div class="g1-company-search-match-counts" role="status"><span>Найдено по запросу: <strong>${total}</strong></span>${G1_PRODUCT_COMPARISON_TYPES.map(([kind, label]) => `<span>${label}: <strong>${counts[kind]}</strong></span>`).join("")}</div>` : ""}
    <small role="status" data-g1pc-notice></small>
    <div class="g1-company-matches"><div class="g1pc-matches-head"><button type="button" class="g1-company-matches-toggle" data-g1pc-matches-toggle aria-expanded="${model.screen.matchesOpen}">Конкуренты в сравнении · ${matching.length}</button><span class="g1pc-found-count" data-g1pc-found-count aria-live="polite">Найдено по запросу: ${total}</span></div>
      <div class="g1-company-matches-list${model.screen.expandedCompetitor ? " has-expanded-competitor" : ""}" data-g1pc-matches-list${model.screen.matchesOpen ? "" : " hidden"}>${matching.length ? matching.map(({ competitor, index }) => {
        const id = escapeAttr(competitor.id);
        const found = competitor.foundPhraseKeysV539?.includes(current.key) || false;
        const name = competitor.name || competitor.siteDomainV538 || competitor.domain || `Конкурент ${index + 1}`;
        return `<div class="g1-company-match g1pc-match"><div class="g1pc-match-identity"><b data-g1pc-match-name="${id}">${escapeHtml(name)}</b><small data-g1pc-match-domain="${id}">${escapeHtml(competitor.siteDomainV538 || projectComparisonProductDomainV538(competitor.domain) || "Домен не указан")} · ${g1ProductComparisonRequestCount(competitor.foundPhraseKeysV539?.length || 0)}</small></div>
          <div class="g1pc-match-actions" data-g1pc-match-actions>
            <button type="button" class="g1pc-edit-button" data-g1pc-competitor-toggle="${id}" aria-expanded="${model.screen.expandedCompetitor === competitor.id}">${model.screen.expandedCompetitor === competitor.id ? "Скрыть данные" : "Редактировать"}</button>
            <button type="button" class="g1pc-detail-button" data-g1pc-jump="${id}">Критерии сравнения ↗</button>
            <div class="g1pc-match-menu"><button type="button" class="g1pc-menu-trigger" data-g1pc-menu-toggle aria-haspopup="menu" aria-expanded="false" aria-label="Действия с конкурентом ${escapeAttr(name)}">⋯</button>
              <div class="g1pc-menu" role="menu" data-g1pc-menu hidden>
                <button type="button" role="menuitem" data-g1pc-match-toggle="${id}" aria-label="${escapeAttr(`${found ? "Убрать из найденных" : "Отметить найденным"}: ${name}, запрос «${current.value}»`)}">${found ? "Убрать из найденных" : "Отметить найденным"}</button>
                <span class="g1pc-menu-separator" role="separator"></span>
                <button type="button" role="menuitem" class="g1pc-menu-delete" data-g1pc-delete-open>Удалить…</button>
              </div>
            </div>
          </div>
          <div class="g1pc-match-confirm" data-g1pc-delete-confirm hidden><span>Удалить «${escapeHtml(name)}»?</span><button type="button" data-g1pc-delete-cancel>Отмена</button><button type="button" class="g1pc-confirm-delete" data-g1bp-delete-v543="${id}" data-g1pc-inline-confirmed>Удалить</button></div>
          ${model.screen.expandedCompetitor === competitor.id ? g1ProductComparisonMatchPanelHtml(model, competitor) : ""}</div>`;
      }).join("") : "<small>Найденных конкурентов пока нет.</small>"}</div></div>
    <div class="g1-company-keyword-map"><button type="button" class="g1-company-keyword-map-toggle" data-g1pc-queries-toggle aria-expanded="${model.screen.queriesOpen}">Запросы и релевантность · ${phrases.length}</button>
      <div class="g1-company-keyword-map-list g1pc-queries" data-g1pc-queries data-g1pc-query-total="${phrases.length}"${model.screen.queriesOpen ? "" : " hidden"}>${g1ProductComparisonQueryListHtml(model, phrases)}</div></div>
  </div>`;
}

function g1ProductComparisonQueryListHtml(model, phrases = g1ProductComparisonPhrases(model.jtbds)) {
  const needle = model.screen.querySearch.trim().toLocaleLowerCase("ru");
  const labels = { high: "Высокая", medium: "Средняя", low: "Низкая", "": "Не оценена" };
  let rows = phrases.map(phrase => ({ phrase,
    rating: model.entry.keywordRelevanceByPhraseV549?.[phrase.key] || "",
    found: g1ProductComparisonCounts(model, phrase.key).total,
  })).filter(row => !model.screen.queryRating || (row.rating || "unrated") === model.screen.queryRating);
  const visibleCount = rows.filter(row => !needle || row.phrase.value.toLocaleLowerCase("ru").includes(needle)).length;
  const sign = model.screen.queryDirection === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    const key = model.screen.querySort;
    const result = key === "found" ? a.found - b.found
      : key === "relevance" ? (labels[a.rating] || "").localeCompare(labels[b.rating] || "", "ru")
      : key === "phrase" ? a.phrase.value.localeCompare(b.phrase.value, "ru")
      : (a.phrase.frequency ?? -1) - (b.phrase.frequency ?? -1);
    return sign * result || a.phrase.value.localeCompare(b.phrase.value, "ru");
  });
  return `<div class="g1-company-query-controls"><input type="search" data-g1pc-query-search placeholder="Найти запрос" aria-label="Найти запрос" value="${escapeAttr(model.screen.querySearch)}">
    <div class="g1-company-query-segments" role="group" aria-label="Релевантность">${[["", "Все"], ["high", "Высокая"], ["medium", "Средняя"], ["low", "Низкая"], ["unrated", "Не оценена"]].map(([key, label]) => `<button type="button" data-g1pc-query-rating="${key}" aria-pressed="${model.screen.queryRating === key}">${label} ${key ? phrases.filter(row => (model.entry.keywordRelevanceByPhraseV549?.[row.key] || "unrated") === key).length : phrases.length}</button>`).join("")}</div></div>
    <div class="g1-company-query-head">${[["phrase", "Запрос"], ["relevance", "Релевантность"], ["found", "Найдено конкурентов"], ["frequency", "Запросов"]].map(([key, label]) => `<button type="button" data-g1pc-query-sort="${key}" aria-pressed="${model.screen.querySort === key}">${label}${model.screen.querySort === key ? model.screen.queryDirection === "asc" ? " ↑" : " ↓" : ""}</button>`).join("")}</div>
    <div data-g1pc-query-rows>${rows.map(row => `<div class="g1-company-query-result" data-g1pc-query-text="${escapeAttr(row.phrase.value.toLocaleLowerCase("ru"))}"${needle && !row.phrase.value.toLocaleLowerCase("ru").includes(needle) ? " hidden" : ""}><button type="button" class="g1-company-query-row" data-g1pc-query-row="${escapeAttr(row.phrase.key)}" aria-expanded="${model.screen.expandedQuery === row.phrase.key}"><span class="g1-company-query-name">${escapeHtml(row.phrase.value)}</span><span>${labels[row.rating] || "Не оценена"}</span><span>Найдено: <strong>${row.found}</strong></span><span>${row.phrase.frequency === null ? "—" : Number(row.phrase.frequency).toLocaleString("ru-RU")}</span></button>
      ${model.screen.expandedQuery === row.phrase.key ? `<div class="g1-company-query-companies">${model.entry.competitors.filter(competitor => competitor.foundPhraseKeysV539?.includes(row.phrase.key)).map((competitor, index) => `<span>${escapeHtml(competitor.name || competitor.domain || `Конкурент ${index + 1}`)} <small>· ${escapeHtml(g1BergenTypeLabelV543(competitor, model.jtbds))}</small></span>`).join("") || "<small>Конкуренты не найдены</small>"}<button type="button" data-g1pc-query-select="${escapeAttr(row.phrase.key)}">Перейти к запросу</button></div>` : ""}</div>`).join("")}<p class="g1-company-query-empty"${visibleCount ? " hidden" : ""}>Ничего не найдено. Сбросьте фильтр.</p></div>
    <div class="g1-company-query-footer"><span data-g1pc-query-count>Показано ${visibleCount} из ${phrases.length}</span><button type="button" data-g1pc-query-reset${!needle && !model.screen.queryRating ? " hidden" : ""}>Сбросить</button></div>`;
}

function g1ProductComparisonRefreshQueries(section, model) {
  const source = section.querySelector("[data-g1pc-queries]");
  if (!source) return;
  const template = document.createElement("template");
  template.innerHTML = g1ProductComparisonQueryListHtml(model);
  source.querySelector("[data-g1pc-query-rows]").innerHTML =
    template.content.querySelector("[data-g1pc-query-rows]").innerHTML;
  source.querySelector(".g1-company-query-footer").innerHTML =
    template.content.querySelector(".g1-company-query-footer").innerHTML;
  source.querySelectorAll("[data-g1pc-query-rating]").forEach(button =>
    button.setAttribute("aria-pressed", String(button.dataset.g1pcQueryRating === model.screen.queryRating)));
  source.querySelectorAll("[data-g1pc-query-sort]").forEach(button => {
    const fresh = template.content.querySelector(`[data-g1pc-query-sort="${button.dataset.g1pcQuerySort}"]`);
    button.innerHTML = fresh.innerHTML;
    button.setAttribute("aria-pressed", fresh.getAttribute("aria-pressed"));
  });
}

function g1ProductComparisonFiltered(model) {
  const counts = Object.fromEntries(G1_PRODUCT_COMPARISON_TYPES.map(([key]) => [key, 0]));
  const all = model.entry.competitors.map((competitor, index) => {
    const kind = g1ProductComparisonType(competitor, model.jtbds);
    counts[kind]++;
    return { competitor, index, kind };
  });
  const rows = model.screen.filter ? all.filter(row => row.kind === model.screen.filter) : all;
  const lastPage = Math.max(0, Math.ceil(rows.length / g1ProductComparisonPageSize()) - 1);
  model.screen.page = Math.min(model.screen.page, lastPage);
  return { all, rows, counts, lastPage };
}

function g1ProductComparisonControlsHtml(model) {
  const { all, rows, counts, lastPage } = g1ProductComparisonFiltered(model);
  const size = g1ProductComparisonPageSize();
  const start = model.screen.page * size;
  const end = Math.min(rows.length, start + size);
  return `<div class="g1-company-compare-controls" data-g1pc-controls><div class="g1-company-compare-filters" role="group" aria-label="Тип конкурента в сравнении">
    <button type="button" data-g1pc-filter="" aria-pressed="${!model.screen.filter}">Все · ${all.length}</button>
    ${G1_PRODUCT_COMPARISON_TYPES.slice(0, 2).map(([key, label]) => `<button type="button" data-g1pc-filter="${key}" aria-pressed="${model.screen.filter === key}">${label} · ${counts[key]}</button>`).join("")}</div>
    <nav class="g1-company-compare-pager" aria-label="Навигация по конкурентам">
      <span>Конкуренты ${rows.length ? start + 1 : 0}–${end} из ${rows.length}</span>
      <button type="button" data-g1pc-page-prev aria-label="Предыдущие конкуренты"${model.screen.page === 0 ? " disabled" : ""}>‹</button>
      <button type="button" data-g1pc-page-next aria-label="Следующие конкуренты"${model.screen.page === lastPage ? " disabled" : ""}>›</button>
    </nav></div>`;
}

function g1ProductComparisonSourceHtml(competitor, model) {
  const raw = competitor?.bergenV543?.landingUrl || competitor?.domain || competitor?.siteDomainV538 || "";
  let url = "";
  try { url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).href; } catch { /* No usable address yet. */ }
  return url ? `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">Открыть источник ↗</a>`
    : `<button type="button" data-g1pc-open-editor="${escapeAttr(competitor.id)}">Открыть источник ↗</button>`;
}

function g1ProductComparisonIdentityHtml(competitor, index, model, stats) {
  const id = escapeAttr(competitor.id);
  const domain = projectComparisonProductDomainV538(competitor.domain || competitor.siteDomainV538 || "");
  const name = competitor.name || domain || `Конкурент ${index + 1}`;
  const summary = stats.byCompetitor.get(competitor.id) || { up: 0, down: 0, missing: 0 };
  return `<div class="g1pc-layer-cell g1pc-identity-cell" data-g1pc-column="${id}">
    <header><label><span>Конкурент ${index + 1}</span><input value="${escapeAttr(name)}" data-g1pc-criteria-name="${id}" aria-label="Название конкурента ${index + 1}"></label>
      ${domain ? `<div class="g1-company-compare-domain"><a href="https://${escapeAttr(domain)}" target="_blank" rel="noopener noreferrer">${escapeHtml(domain)}</a><button type="button" data-g1pc-copy-link="${escapeAttr(domain)}" aria-label="Копировать ссылку на сайт" title="Копировать ссылку"><svg class="g1-company-compare-copy-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"></rect><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"></path></svg><svg class="g1-company-compare-copy-success" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg></button><span role="status" data-g1bp-company-copy-status></span></div>` : ""}
      <small data-g1pc-criteria-summary="${id}">▲ ${summary.up} преимуществ · ▼ ${summary.down} отставаний · нужен ответ ${summary.missing}</small></header>
  </div>`;
}

function g1ProductComparisonCompactHtml(model) {
  const { rows } = g1ProductComparisonFiltered(model);
  const size = g1ProductComparisonPageSize();
  const page = rows.slice(model.screen.page * size, (model.screen.page + 1) * size);
  const competitors = page.map(row => row.competitor);
  const own = g1BergenOwnProductPreviewV602(model.ctx);
  const sources = g1pcCriteriaSourcesV603(model.ctx, model.jtbds);
  const stats = g1pcCriteriaStatsV603(model.entry, model.entry.competitors, sources, model.jtbds);
  const ownLink = g1CompetitorSourceLinkV539({ gateId: "gate-1", kind: "gate1-page", cardId: model.ctx.snapshot?.page?.card?.id || "", rowId: model.ctx.snapshot?.page?.row?.id || "" });
  const layer = (label, ownHtml, competitorHtml, extra = "") => `<div class="g1pc-layer-row ${extra}"><div class="g1pc-layer-rail">${label}</div><div class="g1pc-layer-cell g1-company-compare-own">${ownHtml}</div>${competitors.map(competitor => `<div class="g1pc-layer-cell">${competitorHtml(competitor)}</div>`).join("")}</div>`;
  const preview = (filled, html, link) => filled ? html : `<div class="g1pc-empty">Не заполнено · ${link}</div>`;
  return `<div class="g1pc-layer-grid" data-g1pc-grid style="--g1pc-columns:${competitors.length + 1}">
    <div class="g1pc-layer-row g1pc-identity-row"><div class="g1pc-layer-rail">Кто</div><div class="g1pc-layer-cell g1pc-identity-cell g1-company-compare-own"><header><strong>Мы</strong><b>${escapeHtml(own.name || model.product.name)}</b><small>${escapeHtml(own.url || "Адрес не указан")}</small><span>Наш продукт</span></header></div>${page.map(({ competitor, index }) => g1ProductComparisonIdentityHtml(competitor, index, model, stats)).join("")}</div>
    ${layer("Что клиент видит в поиске", preview(own.title || own.description, g1BergenOwnSearchV569(model.ctx, { hideNote: true, readOnlyPhoto: true }), ownLink), competitor => { const data = g1BergenCompetitorSearchDataV569(competitor); return preview(data.title || data.description, g1BergenCompetitorSearchV569(competitor, { readOnly: true }), g1ProductComparisonSourceHtml(competitor, model)); }, "g1pc-preview-row")}
    ${layer("Тип конкурента", '<span class="g1pc-muted">Выберите тип после просмотра выдачи</span>', competitor => g1pcTypeChoiceHtmlV603(competitor, model.jtbds), "g1pc-choice-row")}
    ${layer("Что клиент видит после клика", preview(own.about || own.url, g1BergenOwnLandingV575(model.ctx, { readOnlyPhoto: true }), ownLink), competitor => { const data = competitor.bergenV543 || {}; return preview(data.product || data.landingUrl || data.cta, g1BergenCompetitorLandingV575(competitor, { productComparison: true, readOnly: true }), g1ProductComparisonSourceHtml(competitor, model)); }, "g1pc-preview-row")}
    ${layer("Похожесть предложения", '<span class="g1pc-muted">Сравните с нашим предложением</span>', competitor => g1ProductComparisonSimilarityChoiceHtml(competitor), "g1pc-choice-row")}
    ${g1ProductCriteriaHtmlV603(model.entry, model.ctx, model.jtbds, competitors)}
    ${layer("Проверено: дата и источник", "<span class=\"g1pc-muted\">Наши источники указаны в деталях критериев</span>", competitor => `<div class="g1pc-verified"><label><span>Дата</span>${g1BergenFieldV543(competitor, "fixedDate", "date")}</label><label><span>URL / скриншот</span>${g1BergenFieldV543(competitor, "evidence")}</label>${g1ProductComparisonSourceHtml(competitor, model)}</div>`, "g1pc-verified-row")}
  </div>`;
}

projectComparisonProductHtml = function (product = guruV194SelectedProduct(state)) {
  if (!product?.id) return `<section class="project-comparison project-comparison-product-v309 g1-section"><div class="project-comparison-heading"><b>Сравнение проектов · Продукт/Услуга</b></div><div class="project-comparison-body"><p>Выберите продукт.</p></div></section>`;
  const model = g1ProductComparisonModel(product);
  const { entry, jtbds, ctx } = model;
  const status = projectComparisonProductStatus(entry);
  g1BergenRenderContextV552 = { productId: product.id, workspace: state, product, entry, jtbds };
  return `<section class="project-comparison project-comparison-product-v309 g1-section g1bp-v543 ${entry.open ? "is-open" : ""}" data-project-comparison-product="${escapeAttr(product.id)}" data-g1bp-product-v543="${escapeAttr(product.id)}" data-g1pc-unified>
    <button type="button" class="project-comparison-heading" data-project-comparison-product-toggle data-project-comparison-product-id="${escapeAttr(product.id)}" aria-expanded="${entry.open ? "true" : "false"}"><span><b>Сравнение проектов · Продукт/Услуга</b><small>${escapeHtml(product.name)}</small></span><span class="project-comparison-heading-meta">${g1CompetitorStatusPillV539(status.status)}<span data-g1bp-status-meta-v543>${status.filled}/${status.total} ответов прямых конкурентов · ${entry.competitors.length} колонок</span></span><i>${entry.open ? "Свернуть ↑" : "Развернуть ↓"}</i></button>
    <div class="project-comparison-body" ${entry.open ? "" : "hidden"}>${g1ProductComparisonGuideHtml(model)}
      <h3 class="g1-company-compare-title">Сравнение</h3>${g1ProductComparisonControlsHtml(model)}
      <div class="g1pc-unified-comparison">${g1ProductComparisonCompactHtml(model)}</div>
    </div>
  </section>`;
};

function g1ProductComparisonRefresh(section, parts = "all") {
  if (!section?.isConnected) return;
  const model = g1ProductComparisonModel(section);
  if (!model) return;
  if (parts === "all" || parts === "guide") {
    const guide = section.querySelector("[data-g1pc-guide]");
    if (guide) guide.outerHTML = g1ProductComparisonGuideHtml(model);
  }
  if (parts === "all" || parts === "grid") {
    const controls = section.querySelector("[data-g1pc-controls]");
    const grid = section.querySelector("[data-g1pc-grid]");
    if (controls) controls.outerHTML = g1ProductComparisonControlsHtml(model);
    if (grid) grid.outerHTML = g1ProductComparisonCompactHtml(model);
  }
}

function g1ProductComparisonSyncChoiceControls(section, competitor, jtbds) {
  const id = CSS.escape(competitor.id);
  const type = g1BergenTypeV543(competitor, jtbds);
  const similarity = competitor.bergenV543?.similarity || "";
  section.querySelectorAll(`[data-g1pc-criteria-type="${id}"]`).forEach(input => {
    input.checked = input.value === type;
  });
  section.querySelectorAll(`[data-g1pc-similarity="${id}"]`).forEach(input => {
    input.checked = input.value === similarity;
  });
  section.querySelectorAll(`[data-g1pc-type-choice="${id}"] [data-g1pc-type-note]`).forEach(note => {
    note.textContent = g1pcTypeChoiceNoteV603(competitor, jtbds);
  });
}

function g1ProductComparisonRefreshMatchState(section, model, competitor, phrase) {
  const id = CSS.escape(competitor.id);
  const found = competitor.foundPhraseKeysV539?.includes(phrase.key) || false;
  const finished = g1ProductComparisonFinished(model.entry, phrase);
  const name = competitor.name || competitor.siteDomainV538 || competitor.domain || "Конкурент";
  const action = section.querySelector(`[data-g1pc-match-toggle="${id}"]`);
  const domainLabel = section.querySelector(`[data-g1pc-match-domain="${id}"]`);
  if (domainLabel) domainLabel.textContent = `${competitor.siteDomainV538 || projectComparisonProductDomainV538(competitor.domain) || "Домен не указан"} · ${g1ProductComparisonRequestCount(competitor.foundPhraseKeysV539?.length || 0)}`;
  if (action) {
    action.textContent = found ? "Убрать из найденных" : "Отметить найденным";
    action.setAttribute("aria-label", `${action.textContent}: ${name}, запрос «${phrase.value}»`);
  }
  const edit = action?.closest(".g1pc-match")?.querySelector("[data-g1pc-competitor-toggle]");
  if (edit) edit.textContent = edit.getAttribute("aria-expanded") === "true" ? "Скрыть данные" : "Редактировать";
  const counts = g1ProductComparisonCounts(model, phrase.key);
  const foundCount = section.querySelector("[data-g1pc-found-count]");
  if (foundCount) foundCount.textContent = `Найдено по запросу: ${counts.total}`;
  const matchTotals = section.querySelector(".g1-company-search-match-counts");
  const totalValues = [counts.total, ...G1_PRODUCT_COMPARISON_TYPES.map(([key]) => counts.counts[key])];
  matchTotals?.querySelectorAll("strong").forEach((node, index) => { node.textContent = totalValues[index]; });
  const nav = section.querySelector(`[data-g1pc-nav-option="${CSS.escape(phrase.key)}"] .g1-company-query-nav-stats`);
  const navValues = [counts.total, ...G1_PRODUCT_COMPARISON_TYPES.slice(0, 4).map(([key]) => counts.counts[key])];
  nav?.querySelectorAll("b").forEach((node, index) => { node.textContent = navValues[index]; });
  const next = section.querySelector("[data-g1pc-next]");
  const rated = G1_BERGEN_RELEVANCE_V549.some(([key]) => model.entry.keywordRelevanceByPhraseV549?.[phrase.key] === key);
  if (next) next.disabled = !(finished && (rated || counts.total === 0) && g1ProductComparisonPhrases(model.jtbds).length > 1);
  g1ProductComparisonRefreshQueries(section, model);
}

let g1ProductComparisonResizeFrame = 0;
window.addEventListener("resize", () => {
  if (g1ProductComparisonResizeFrame) return;
  g1ProductComparisonResizeFrame = requestAnimationFrame(() => {
    g1ProductComparisonResizeFrame = 0;
    document.querySelectorAll("[data-g1pc-unified]").forEach(section => {
      g1ProductComparisonRefresh(section, "grid");
    });
    requestAnimationFrame(() => document.querySelectorAll("[data-g1pc-form]:not([hidden])")
      .forEach(form => g1ProductComparisonSizeDraftFields(form)));
  });
});

let g1ProductComparisonOwnRefreshFrameV602 = 0;
let g1ProductComparisonOwnPendingProductV602 = "";
function g1ProductComparisonRefreshOwnFromCardV602(productId) {
  g1ProductComparisonOwnPendingProductV602 = productId;
  if (g1ProductComparisonOwnRefreshFrameV602) return;
  g1ProductComparisonOwnRefreshFrameV602 = requestAnimationFrame(() => {
    g1ProductComparisonOwnRefreshFrameV602 = 0;
    const currentProductId = g1ProductComparisonOwnPendingProductV602;
    g1ProductComparisonOwnPendingProductV602 = "";
    const section = [...document.querySelectorAll("[data-g1pc-unified]")]
      .find((node) => node.dataset.g1bpProductV543 === currentProductId);
    if (!section?.isConnected) return;
    const product = guruV194Product(currentProductId, state);
    if (!product) return;
    const context = g1BergenScopeContext(product);
    const own = section.querySelector(".g1-company-compare-own");
    const search = own?.querySelector(".g1bp-serp-v569");
    const landing = own?.querySelector('[data-g1bp-landing-v575="own"]');
    if (search) search.outerHTML = g1BergenOwnSearchV569(context, { hideNote: true, readOnlyPhoto: true });
    if (landing) landing.outerHTML = g1BergenOwnLandingV575(context, { readOnlyPhoto: true });
  });
}

function g1ProductComparisonEditedCardProductV602(target) {
  const field = target?.closest?.("[data-goat-product-row-field-v514], [data-goat-hero-cta-v515], [data-goat-review-field-v514], [data-page-context-card-id], [data-gate1-page-card-id]");
  if (!field || !document.querySelector("[data-g1pc-unified]")) return "";
  const cardId = field.dataset.goatProductCardIdV514 || field.dataset.pageContextCardId || field.dataset.gate1PageCardId;
  const index = Number(field.dataset.goatProductPageIndexV514 ?? field.dataset.pageContextIndex ?? field.dataset.gate1PageIndex);
  return findCard(cardId)?.pageRows?.[index]?.catalogItemIdV189 || "";
}

document.addEventListener("input", (event) => {
  const productId = g1ProductComparisonEditedCardProductV602(event.target);
  if (productId) g1ProductComparisonRefreshOwnFromCardV602(productId);
});
document.addEventListener("change", (event) => {
  const productId = g1ProductComparisonEditedCardProductV602(event.target);
  if (productId) g1ProductComparisonRefreshOwnFromCardV602(productId);
});

function g1ProductComparisonRefreshReadOnlySearch(section, competitorId) {
  const productId = section?.dataset?.g1bpProductV543;
  const competitor = state.projectComparison?.productsById?.[productId]?.competitors?.find(row => row.id === competitorId);
  if (!competitor) return;
  section.querySelectorAll("[data-g1bp-serp-readonly-v569]").forEach(container => {
    if (container.dataset.g1bpSerpV569 !== competitorId) return;
    const card = container.querySelector("[data-g1bp-serp-card-v569]");
    if (card) card.innerHTML = g1BergenSearchCardV569(g1BergenCompetitorSearchDataV569(competitor));
  });
}

function g1ProductComparisonRefreshReadOnlyLanding(section, competitorId) {
  const productId = section?.dataset?.g1bpProductV543;
  const competitor = state.projectComparison?.productsById?.[productId]?.competitors?.find(row => row.id === competitorId);
  const landing = section?.querySelector(`[data-g1bp-landing-v575="${CSS.escape(competitorId)}"][data-g1pc-landing-readonly]`);
  if (!competitor || !landing) return;
  const preview = g1BergenCompetitorLandingReadOnlyValuesV575(competitor);
  landing.querySelector("[data-g1pc-landing-address]").textContent = preview.address;
  landing.querySelector("[data-g1pc-landing-name]").textContent = preview.name;
  landing.querySelector("[data-g1pc-landing-about]").textContent = preview.about;
  landing.querySelector("[data-g1pc-landing-price]").textContent = preview.price ? `${preview.price} ₽` : "Цена не указана";
  const ctas = landing.querySelector("[data-g1pc-landing-ctas]");
  const nextCtas = g1BergenCompetitorReadOnlyCtasV575(preview.ctas);
  if (ctas.textContent !== (preview.ctas.length ? preview.ctas.join("") : "Не указано"))
    ctas.innerHTML = nextCtas;
}

function g1ProductComparisonSave(section, model) {
  const status = projectComparisonProductStatus(model.entry);
  const pill = section.querySelector(".project-comparison-heading .status-pill");
  if (pill) { pill.className = `status-pill status-${status.status}`; pill.textContent = STATUS_LABELS[status.status] || status.status; }
  const meta = section.querySelector("[data-g1bp-status-meta-v543]");
  if (meta) meta.textContent = `${status.filled}/${status.total} ответов · ${model.entry.competitors.length} конкурентов`;
  if (typeof _guruTabDirty !== "undefined") _guruTabDirty = true;
  flashSaving({ skipDerivedRefresh: true });
}

function g1ProductComparisonDomainMatch(model, domain) {
  if (!domain) return null;
  const comparison = state.projectComparison || {};
  const sameDomain = row => projectComparisonProductDomainV538(row?.domain || row?.siteDomainV538) === domain;
  const current = model.entry.competitors.find(sameDomain);
  if (current) return { competitor: current, scope: "current", label: "этого продукта" };
  const productEntries = Object.entries(comparison.productsById || {});
  for (const [productId, entry] of productEntries) {
    if (productId === model.product.id) continue;
    const competitor = entry?.competitors?.find(sameDomain);
    if (competitor) return { competitor, scope: "product", productId,
      label: `продукта «${guruV194Product(productId, state)?.name || "другого продукта"}»` };
  }
  const company = comparison.competitors?.find(sameDomain);
  if (company) return { competitor: company, scope: "company", label: "компании" };
  return null;
}

function g1ProductComparisonSyncDraftDomain(form, model) {
  const domain = projectComparisonProductDomainV538(form.elements.domain.value);
  const match = g1ProductComparisonDomainMatch(model, domain);
  form.classList.toggle("is-reuse", !!match);
  const note = form.querySelector("[data-g1pc-domain-note]");
  if (note) note.textContent = match
    ? `Уже есть в сравнении ${match.label}: ${match.competitor.name || domain}. Сохранённые данные будут использованы без повторного ввода.`
    : "";
  const submit = form.querySelector('[type="submit"]:not([data-g1pc-save-without-landing])');
  if (submit) submit.textContent = match?.scope === "current" ? "Отметить для запроса"
    : match ? "Использовать данные конкурента" : "Добавить конкурента";
  return match;
}

function g1ProductComparisonReuseCompetitor(source, domain) {
  const original = source.competitor;
  const data = structuredClone(original.bergenV543 || {});
  // Classification and similarity depend on the selected product, not the domain.
  delete data.similarity;
  delete data.comparisonTypeV603;
  return {
    id: makeId("comparison-product-competitor"), name: original.name || domain,
    domain: original.domain || original.siteDomainV538 || domain, siteDomainV538: domain,
    classificationV539: { sameMarket: "", sameBusiness: "" },
    foundPhraseKeysV539: [], stepsV539: {}, bergenV543: data,
    bergenMigratedV543: true, bergenIntroMigratedV567: true,
    reusedFromV604: { scope: source.scope, id: original.id,
      ...(source.productId ? { product_id: source.productId } : {}) },
  };
}

document.addEventListener("submit", async event => {
  const form = event.target.closest?.("[data-g1pc-form]");
  if (!form) return;
  event.preventDefault();
  const section = form.closest("[data-g1bp-product-v543]");
  const model = g1ProductComparisonModel(section);
  const phrase = g1ProductComparisonCurrent(model).current;
  if (!phrase) return;
  const rawDomain = form.elements.domain.value.trim();
  const domain = projectComparisonProductDomainV538(rawDomain);
  const error = form.querySelector("[data-g1pc-form-error]");
  const landingError = form.querySelector("[data-g1pc-landing-save-error]");
  const saveWithoutLanding = event.submitter?.hasAttribute("data-g1pc-save-without-landing") || false;
  const showError = message => { error.textContent = message; if (landingError) landingError.textContent = message; };
  if (!domain) { showError("Введите корректный домен или адрес сайта"); form.elements.domain.focus(); return; }
  const source = g1ProductComparisonDomainMatch(model, domain);
  let competitor = source?.scope === "current" ? source.competitor : null;
  const name = form.elements.name.value.trim();
  const title = form.elements.title.value.trim();
  const similarity = form.elements.similarity.value;
  const comparisonType = form.elements.comparisonType.value;
  if (!source) {
    if (!title || (!saveWithoutLanding && (!name || !similarity || !comparisonType))) {
      showError(saveWithoutLanding
        ? "Укажите заголовок в выдаче"
        : "Укажите название, заголовок в выдаче, тип конкурента и похожесть предложения");
      (!title ? form.elements.title : !name ? form.elements.name : !comparisonType ? form.elements.comparisonType[0] : form.elements.similarity[0])?.focus();
      return;
    }
  }
  if (source) {
    if (!section.isConnected || model.entry !== state.projectComparison?.productsById?.[model.product.id]) return;
    if (!competitor) {
      competitor = g1ProductComparisonReuseCompetitor(source, domain);
      model.entry.competitors.push(competitor);
      model.screen.filter = "";
      model.screen.page = Math.floor((model.entry.competitors.length - 1) / g1ProductComparisonPageSize());
    }
    const foundPhrases = competitor.foundPhraseKeysV539 ||= [];
    if (!foundPhrases.includes(phrase.key)) foundPhrases.push(phrase.key);
    model.screen.expandedCompetitor = competitor.id;
    model.screen.matchesOpen = true;
    g1ProductComparisonRefresh(section);
    g1ProductComparisonSave(section, model);
    section.querySelector("[data-g1pc-notice]").textContent = source.scope === "current"
      ? "Существующий конкурент отмечен для текущего запроса."
      : "Данные конкурента использованы и связаны с текущим запросом.";
    return;
  }
  const submitButtons = [...form.querySelectorAll('[type="submit"]')];
  submitButtons.forEach(button => { button.disabled = true; });
  let image = "";
  try {
    const photo = form.g1pcDraftPhotoFile || form.elements.photo.files?.[0];
    if (photo) image = await g1BergenPrepareSearchPhotoV569(photo);
  } catch (cause) {
    showError(cause?.message || "Не удалось обработать фото");
    submitButtons.forEach(button => { button.disabled = false; });
    return;
  }
  if (!section.isConnected || model.entry !== state.projectComparison?.productsById?.[model.product.id]) return;
  if (!competitor) {
    competitor = { id: makeId("comparison-product-competitor"), name, domain: rawDomain,
      siteDomainV538: domain, classificationV539: { sameMarket: "", sameBusiness: "" },
      foundPhraseKeysV539: [], stepsV539: {}, bergenV543: { advertisements: title,
        ...(similarity ? { similarity } : {}), ...(comparisonType ? { comparisonTypeV603: comparisonType } : {}) }, bergenMigratedV543: true };
    model.entry.competitors.push(competitor);
    model.screen.filter = "";
    model.screen.page = Math.floor((model.entry.competitors.length - 1) / g1ProductComparisonPageSize());
  }
  const data = competitor.bergenV543 ||= {};
  if (name) competitor.name = name;
  if (title) data.advertisements = g1BergenSetSearchAdPartV572(data.advertisements, "title", title);
  const description = form.elements.description.value.trim();
  if (description) data.advertisements = g1BergenSetSearchAdPartV572(data.advertisements, "description", description);
  for (const key of ["landingUrl", "cta", "product"]) {
    const value = form.elements[key].value.trim();
    if (value) data[key] = value;
  }
  const extraCtas = [...form.querySelectorAll("[data-g1pc-draft-cta-extra]")]
    .map(field => field.value.trim()).filter(Boolean);
  if (extraCtas.length) {
    if (!String(data.cta || "").trim()) data.cta = extraCtas.shift();
    data.additionalCtasV576 = [...(Array.isArray(data.additionalCtasV576) ? data.additionalCtasV576 : []), ...extraCtas];
  }
  const price = g1BergenCleanPriceV579(form.elements.price.value);
  if (price) data.price = price;
  const rating = form.elements.rating.value.trim();
  const reviews = form.elements.reviews.value.trim();
  if (rating || reviews || image) {
    const preview = data.searchPreviewV569 ||= {};
    if (rating) preview.rating = rating;
    if (reviews) preview.reviews = reviews;
    if (image) preview.image = image;
  }
  if (similarity) data.similarity = similarity;
  if (comparisonType) data.comparisonTypeV603 = comparisonType;
  g1BergenRefreshTableV580(section, model.entry, model.product, model.jtbds);
  if (!competitor.foundPhraseKeysV539.includes(phrase.key)) competitor.foundPhraseKeysV539.push(phrase.key);
  g1BergenRefreshClassificationV581(section, model.entry, competitor, model.product, model.jtbds, true);
  model.screen.expandedCompetitor = competitor.id;
  model.screen.matchesOpen = true;
  g1ProductComparisonRefresh(section);
  g1ProductComparisonSave(section, model);
  section.querySelector("[data-g1pc-notice]").textContent = "Конкурент отмечен для текущего запроса.";
});

function g1ProductComparisonSizeDraftFields(form, changedField) {
  if (!form || form.hidden) return;
  const fields = changedField ? [changedField] : form.querySelectorAll(".g1pc-search-card textarea, .g1pc-landing-preview textarea");
  fields.forEach(field => {
    field.style.height = "auto";
    const style = getComputedStyle(field);
    const border = (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.borderBottomWidth) || 0);
    const minimum = field.classList.contains("g1bp-landing-cta-input-v576") ? 34 : 42;
    let height = Math.max(minimum, Math.ceil(field.scrollHeight + border));
    field.style.height = `${height}px`;
    for (let attempt = 0; attempt < 3 && field.scrollHeight > field.clientHeight; attempt++) {
      height += field.scrollHeight - field.clientHeight;
      field.style.height = `${Math.ceil(height)}px`;
    }
    if (height > minimum) field.style.height = `${Math.ceil(height + 2)}px`;
  });
}

let g1pcUndoMatch = null;
let g1pcUndoTimer = 0;

function g1pcCloseMenu(menu, restoreFocus = false) {
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  const trigger = menu.closest(".g1pc-match-menu")?.querySelector("[data-g1pc-menu-toggle]");
  trigger?.setAttribute("aria-expanded", "false");
  if (restoreFocus) trigger?.focus({ preventScroll: true });
}

function g1pcShowUndoToast(section, competitor, phrase) {
  document.querySelector("[data-g1pc-undo-toast]")?.remove();
  clearTimeout(g1pcUndoTimer);
  g1pcUndoMatch = { section, competitorId: competitor.id, phraseKey: phrase.key, phraseValue: phrase.value };
  const toast = document.createElement("div");
  toast.className = "g1pc-undo-toast";
  toast.dataset.g1pcUndoToast = "";
  toast.setAttribute("role", "status");
  const label = document.createElement("span");
  label.textContent = `«${competitor.name || competitor.siteDomainV538 || competitor.domain || "Конкурент"}» убран из найденных`;
  const undo = document.createElement("button");
  undo.type = "button";
  undo.dataset.g1pcToastUndo = "";
  undo.textContent = "Отменить";
  toast.append(label, undo);
  document.body.append(toast);
  g1pcUndoTimer = setTimeout(() => { toast.remove(); g1pcUndoMatch = null; }, 6000);
}

function g1pcApplyMatch(section, model, competitor, phrase, found) {
  const keys = new Set(competitor.foundPhraseKeysV539 || []);
  if (found) keys.add(phrase.key); else keys.delete(phrase.key);
  competitor.foundPhraseKeysV539 = [...keys];
  g1BergenRefreshClassificationV581(section, model.entry, competitor, model.product, model.jtbds, true);
  if (g1ProductComparisonCurrent(model).current?.key === phrase.key)
    g1ProductComparisonRefreshMatchState(section, model, competitor, phrase);
  else g1ProductComparisonRefresh(section, "guide");
  g1ProductComparisonRefresh(section, "grid");
  g1ProductComparisonSave(section, model);
}

document.addEventListener("click", event => {
  const undo = event.target.closest?.("[data-g1pc-toast-undo]");
  if (undo) {
    const previous = g1pcUndoMatch;
    clearTimeout(g1pcUndoTimer);
    undo.closest("[data-g1pc-undo-toast]")?.remove();
    g1pcUndoMatch = null;
    if (!previous?.section.isConnected) return;
    const model = g1ProductComparisonModel(previous.section);
    const competitor = model?.entry.competitors.find(row => row.id === previous.competitorId);
    if (competitor) g1pcApplyMatch(previous.section, model, competitor, { key: previous.phraseKey, value: previous.phraseValue }, true);
    previous.section.querySelector(`[data-g1pc-match-name="${CSS.escape(previous.competitorId)}"]`)
      ?.closest(".g1pc-match")?.querySelector("[data-g1pc-menu-toggle]")?.focus({ preventScroll: true });
    return;
  }
  const trigger = event.target.closest?.("[data-g1pc-menu-toggle]");
  if (trigger) {
    const menu = trigger.closest(".g1pc-match-menu").querySelector("[data-g1pc-menu]");
    const opening = menu.hidden;
    document.querySelectorAll(".g1pc-guide [data-g1pc-menu]:not([hidden])").forEach(open => g1pcCloseMenu(open));
    if (opening) {
      menu.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      menu.querySelector('[role="menuitem"]')?.focus({ preventScroll: true });
    } else trigger.focus({ preventScroll: true });
    return;
  }
  const deleteOpen = event.target.closest?.("[data-g1pc-delete-open]");
  if (deleteOpen) {
    const row = deleteOpen.closest(".g1pc-match");
    g1pcCloseMenu(deleteOpen.closest("[data-g1pc-menu]"));
    row.querySelector("[data-g1pc-match-actions]").hidden = true;
    const confirm = row.querySelector("[data-g1pc-delete-confirm]");
    confirm.hidden = false;
    confirm.querySelector("[data-g1pc-delete-cancel]")?.focus({ preventScroll: true });
    return;
  }
  const cancel = event.target.closest?.("[data-g1pc-delete-cancel]");
  if (cancel) {
    const row = cancel.closest(".g1pc-match");
    row.querySelector("[data-g1pc-delete-confirm]").hidden = true;
    row.querySelector("[data-g1pc-match-actions]").hidden = false;
    row.querySelector("[data-g1pc-menu-toggle]")?.focus({ preventScroll: true });
    return;
  }
  if (!event.target.closest?.(".g1pc-match-menu"))
    document.querySelectorAll(".g1pc-guide [data-g1pc-menu]:not([hidden])").forEach(open => g1pcCloseMenu(open, open.contains(document.activeElement)));
});

document.addEventListener("keydown", event => {
  const menu = event.target.closest?.(".g1pc-match-menu")?.querySelector("[data-g1pc-menu]");
  if (!menu || menu.hidden) return;
  if (event.key === "Escape") { event.preventDefault(); g1pcCloseMenu(menu, true); return; }
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const items = [...menu.querySelectorAll('[role="menuitem"]')];
  const index = items.indexOf(document.activeElement);
  const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1
    : event.key === "ArrowDown" ? (index + 1) % items.length : (index - 1 + items.length) % items.length;
  items[next]?.focus({ preventScroll: true });
});

document.addEventListener("click", async event => {
  const target = event.target.closest?.("[data-g1pc-nav-toggle], [data-g1pc-nav-option], [data-g1pc-form-toggle], [data-g1pc-form-cancel], [data-g1pc-finish], [data-g1pc-next], [data-g1pc-show], [data-g1pc-matches-toggle], [data-g1pc-match-toggle], [data-g1pc-competitor-toggle], [data-g1pc-queries-toggle], [data-g1pc-query-row], [data-g1pc-query-select], [data-g1pc-query-rating], [data-g1pc-query-sort], [data-g1pc-query-reset], [data-g1pc-filter], [data-g1pc-page-prev], [data-g1pc-page-next], [data-g1pc-jump], [data-g1pc-open-editor], [data-g1pc-copy-link]");
  const section = target?.closest("[data-g1bp-product-v543]");
  if (!section) return;
  const model = g1ProductComparisonModel(section), screen = model.screen;
  const { phrases, current } = g1ProductComparisonCurrent(model);
  if (target.hasAttribute("data-g1pc-match-toggle")) {
    const competitor = model.entry.competitors.find(row => row.id === target.dataset.g1pcMatchToggle);
    if (!competitor || !current) return;
    const wasFound = competitor.foundPhraseKeysV539?.includes(current.key) || false;
    g1pcCloseMenu(target.closest("[data-g1pc-menu]"), true);
    g1pcApplyMatch(section, model, competitor, current, !wasFound);
    if (wasFound) g1pcShowUndoToast(section, competitor, current);
    return;
  }
  if (target.hasAttribute("data-g1pc-nav-toggle")) {
    const list = target.closest("[data-g1pc-nav]").querySelector("[data-g1pc-nav-list]");
    list.hidden = !list.hidden; target.setAttribute("aria-expanded", String(!list.hidden)); return;
  }
  if (target.hasAttribute("data-g1pc-form-toggle") || target.hasAttribute("data-g1pc-form-cancel")) {
    const form = section.querySelector("[data-g1pc-form]");
    form.hidden = target.hasAttribute("data-g1pc-form-cancel") ? true : !form.hidden;
    section.querySelector("[data-g1pc-form-toggle]").setAttribute("aria-expanded", String(!form.hidden));
    if (!form.hidden) {
      g1ProductComparisonSyncDraftDomain(form, model);
      g1ProductComparisonSizeDraftFields(form);
      form.elements.domain.focus();
    }
    return;
  }
  if (target.hasAttribute("data-g1pc-nav-option") || target.hasAttribute("data-g1pc-query-select")) {
    screen.phraseKey = target.dataset.g1pcNavOption || target.dataset.g1pcQuerySelect;
    g1ProductComparisonRefresh(section, "guide"); return;
  }
  if (target.hasAttribute("data-g1pc-query-row")) {
    const key = target.dataset.g1pcQueryRow;
    screen.expandedQuery = screen.expandedQuery === key ? "" : key;
    g1ProductComparisonRefreshQueries(section, model);
    return;
  }
  if (target.hasAttribute("data-g1pc-finish") && current) {
    if (!Array.isArray(model.entry.searchFinishedPhraseKeysV601))
      model.entry.searchFinishedPhraseKeysV601 = phrases.filter(row => g1ProductComparisonFinished(model.entry, row)).map(row => row.key);
    if (!model.entry.searchFinishedPhraseKeysV601.includes(current.key)) model.entry.searchFinishedPhraseKeysV601.push(current.key);
    g1ProductComparisonRefresh(section, "guide"); g1ProductComparisonSave(section, model); return;
  }
  if (target.hasAttribute("data-g1pc-next") && current) {
    screen.phraseKey = phrases[(phrases.findIndex(row => row.key === current.key) + 1) % phrases.length].key;
    g1ProductComparisonRefresh(section, "guide"); return;
  }
  if (target.hasAttribute("data-g1pc-show") && current) {
    const shouldSelect = !current.groupIds.some(id =>
      model.entry.selectedKeywordKeysByJtbdV550?.[id]?.includes(current.key));
    for (const group of model.jtbds.filter(row => current.groupIds.includes(row.id))) {
      const keys = g1BergenSelectedKeywordKeysV550(model.entry, group);
      if (shouldSelect) keys.add(current.key); else keys.delete(current.key);
      model.entry.selectedKeywordKeysByJtbdV550[group.id] = group.phrases.filter(row => keys.has(row.key)).map(row => row.key);
    }
    section.querySelectorAll(`[data-g1bp-select-keyword-v550][data-g1bp-keyword-key-v550="${CSS.escape(current.key)}"]`).forEach(button => {
      const group = model.jtbds.find(row => row.id === button.dataset.g1bpSelectKeywordV550);
      if (!group) return;
      button.setAttribute("aria-pressed", String(shouldSelect));
      button.title = shouldSelect ? "Убрать фразу из колонок конкурентов" : "Показать фразу у конкурентов";
      const row = button.closest("tr");
      const summary = row?.querySelector(".g1bp-search-details-v548 summary span");
      if (summary) {
        const rated = group.phrases.filter(phrase => G1_BERGEN_RELEVANCE_V549.some(([value]) =>
          model.entry.keywordRelevanceByPhraseV549?.[phrase.key] === value)).length;
        summary.textContent = `Фраз: ${group.phrases.length} · оценено: ${rated} · выбрано: ${g1BergenSelectedKeywordKeysV550(model.entry, group).size}`;
      }
      row?.querySelectorAll("[data-g1bp-keywords-for-v550]").forEach(slot => {
        const competitor = model.entry.competitors.find(item => item.id === slot.dataset.g1bpKeywordsForV550);
        if (competitor) slot.innerHTML = g1BergenCompetitorKeywordsV550(model.entry, competitor, group);
      });
    });
    g1ProductComparisonRefresh(section); g1ProductComparisonSave(section, model); return;
  }
  if (target.hasAttribute("data-g1pc-matches-toggle") || target.hasAttribute("data-g1pc-queries-toggle")) {
    const matches = target.hasAttribute("data-g1pc-matches-toggle");
    screen[matches ? "matchesOpen" : "queriesOpen"] = !screen[matches ? "matchesOpen" : "queriesOpen"];
    const list = section.querySelector(matches ? "[data-g1pc-matches-list]" : "[data-g1pc-queries]");
    list.hidden = !screen[matches ? "matchesOpen" : "queriesOpen"];
    target.setAttribute("aria-expanded", String(!list.hidden)); return;
  }
  if (target.hasAttribute("data-g1pc-competitor-toggle")) {
    const id = target.dataset.g1pcCompetitorToggle;
    const list = target.closest("[data-g1pc-matches-list]");
    const previous = list.querySelector('[data-g1pc-competitor-toggle][aria-expanded="true"]');
    if (previous) {
      const previousCompetitor = model.entry.competitors.find(row => row.id === previous.dataset.g1pcCompetitorToggle);
      previous.setAttribute("aria-expanded", "false");
      previous.textContent = "Редактировать";
      previous.closest(".g1pc-match").querySelector("[data-g1pc-match-panel]")?.remove();
    }
    screen.expandedCompetitor = screen.expandedCompetitor === id ? "" : id;
    if (screen.expandedCompetitor) {
      const competitor = model.entry.competitors.find(row => row.id === id);
      if (competitor) {
        target.closest(".g1pc-match").insertAdjacentHTML("beforeend", g1ProductComparisonMatchPanelHtml(model, competitor));
        target.setAttribute("aria-expanded", "true");
        target.textContent = "Скрыть данные";
      }
    }
    list.classList.toggle("has-expanded-competitor", !!screen.expandedCompetitor);
    return;
  }
  if (target.hasAttribute("data-g1pc-query-rating") || target.hasAttribute("data-g1pc-query-sort") || target.hasAttribute("data-g1pc-query-reset")) {
    if (target.hasAttribute("data-g1pc-query-rating")) screen.queryRating = target.dataset.g1pcQueryRating;
    else if (target.hasAttribute("data-g1pc-query-sort")) {
      const sort = target.dataset.g1pcQuerySort;
      screen.queryDirection = screen.querySort === sort && screen.queryDirection === "desc" ? "asc" : "desc";
      screen.querySort = sort;
    } else { screen.querySearch = ""; screen.queryRating = ""; }
    if (target.hasAttribute("data-g1pc-query-reset"))
      section.querySelector("[data-g1pc-query-search]").value = "";
    g1ProductComparisonRefreshQueries(section, model); return;
  }
  if (target.hasAttribute("data-g1pc-filter")) {
    screen.filter = target.dataset.g1pcFilter; screen.page = 0;
    g1ProductComparisonRefresh(section, "grid"); return;
  }
  if (target.hasAttribute("data-g1pc-page-prev") || target.hasAttribute("data-g1pc-page-next")) {
    const { lastPage } = g1ProductComparisonFiltered(model);
    screen.page = Math.min(lastPage, Math.max(0, screen.page + (target.hasAttribute("data-g1pc-page-next") ? 1 : -1)));
    g1ProductComparisonRefresh(section, "grid"); return;
  }
  if (target.hasAttribute("data-g1pc-jump")) {
    section.querySelector("[data-g1pc-criteria]")?.scrollIntoView({ block: "start", behavior: "smooth" }); return;
  }
  if (target.hasAttribute("data-g1pc-open-editor")) {
    const edit = section.querySelector(`[data-g1pc-competitor-toggle="${CSS.escape(target.dataset.g1pcOpenEditor)}"]`);
    if (edit?.getAttribute("aria-expanded") !== "true") edit?.click();
    edit?.scrollIntoView({ block: "center", behavior: "smooth" }); return;
  }
  if (target.hasAttribute("data-g1pc-copy-link")) {
    try { await g4sbV141CopyText(`https://${target.dataset.g1pcCopyLink}`);
      target.dataset.g1bpCompanyCopyState = "copied";
      target.nextElementSibling.textContent = "Скопировано";
      setTimeout(() => { if (target.isConnected) {
        delete target.dataset.g1bpCompanyCopyState; target.nextElementSibling.textContent = "";
      } }, 2200);
    } catch (_error) { target.dataset.g1bpCompanyCopyState = "error";
      target.nextElementSibling.textContent = "Не удалось скопировать"; }
  }
});

document.addEventListener("input", event => {
  const target = event.target;
  const section = target.closest?.("[data-g1bp-product-v543]");
  if (!section) return;
  const draftForm = target.closest?.("[data-g1pc-form]");
  if (draftForm) draftForm.querySelectorAll("[data-g1pc-form-error], [data-g1pc-landing-save-error]")
    .forEach(message => { message.textContent = ""; });
  if (draftForm && target === draftForm.elements.domain) {
    g1ProductComparisonSyncDraftDomain(draftForm, g1ProductComparisonModel(section));
    return;
  }
  if (target.dataset.g1bpCtaIndexV576 !== undefined) {
    const competitorId = target.dataset.g1bpCompetitorV543;
    if (competitorId) g1ProductComparisonRefreshReadOnlyLanding(section, competitorId);
    return;
  }
  if (target.matches(".g1pc-draft-form .g1pc-search-card textarea, .g1pc-draft-form .g1pc-landing-preview textarea"))
    g1ProductComparisonSizeDraftFields(target.closest("[data-g1pc-form]"), target);
  if (target.matches("[data-g1pc-draft-price], [data-g1pc-draft-price-mirror]")) {
    const form = target.closest("[data-g1pc-form]");
    target.value = g1BergenCleanPriceV579(target.value);
    form?.querySelectorAll("[data-g1pc-draft-price], [data-g1pc-draft-price-mirror]")
      .forEach(peer => { if (peer !== target) peer.value = target.value; });
    return;
  }
  if (target.hasAttribute("data-g1pc-query-search")) {
    const screen = g1ProductComparisonScreen(section.dataset.g1bpProductV543);
    const needle = target.value.trim().toLocaleLowerCase("ru");
    screen.querySearch = target.value;
    const list = section.querySelector("[data-g1pc-queries]");
    let visibleCount = 0;
    list.querySelectorAll(".g1-company-query-result").forEach(row => {
      row.hidden = !!needle && !row.dataset.g1pcQueryText.includes(needle);
      if (!row.hidden) visibleCount++;
    });
    list.querySelector(".g1-company-query-empty").hidden = visibleCount > 0;
    list.querySelector("[data-g1pc-query-count]").textContent = `Показано ${visibleCount} из ${list.dataset.g1pcQueryTotal}`;
    list.querySelector("[data-g1pc-query-reset]").hidden = !needle && !screen.queryRating;
    return;
  }
  const key = target.dataset.g1bpFieldV543 ?? target.dataset.g1bpAdPartV572 ??
    target.dataset.g1bpSearchFieldV569 ?? target.dataset.g1bpAdExtraV572 ??
    target.dataset.g1bpNameV543 ?? target.dataset.g1bpDomainV543;
  if (key === undefined) return;
  const id = target.dataset.g1bpCompetitorV543 || target.dataset.g1bpNameV543 || target.dataset.g1bpDomainV543;
  if (!id) return;
  const selector = target.dataset.g1bpFieldV543 !== undefined ? `[data-g1bp-field-v543="${CSS.escape(key)}"][data-g1bp-competitor-v543="${CSS.escape(id)}"]`
    : target.dataset.g1bpAdPartV572 !== undefined ? `[data-g1bp-ad-part-v572="${CSS.escape(key)}"][data-g1bp-competitor-v543="${CSS.escape(id)}"]`
    : target.dataset.g1bpSearchFieldV569 !== undefined ? `[data-g1bp-search-field-v569="${CSS.escape(key)}"][data-g1bp-competitor-v543="${CSS.escape(id)}"]`
    : target.dataset.g1bpAdExtraV572 !== undefined ? `[data-g1bp-ad-extra-v572][data-g1bp-competitor-v543="${CSS.escape(id)}"]`
    : target.dataset.g1bpNameV543 !== undefined ? `[data-g1bp-name-v543="${CSS.escape(id)}"]`
    : `[data-g1bp-domain-v543="${CSS.escape(id)}"]`;
  section.querySelectorAll(selector).forEach(peer => {
    if (peer === target) return;
    peer.value = target.value;
    const grow = peer.closest(".g1bp-field-grow-v574");
    if (grow) grow.dataset.replicatedValue = target.value || "Впишите ответ";
    const priceMeasure = peer.closest(".g1bp-price-shell-v579")?.querySelector(".g1bp-price-measure-v579");
    if (priceMeasure) priceMeasure.textContent = target.value || "—";
  });
  if (target.dataset.g1bpNameV543 !== undefined) {
    const label = section.querySelector(`[data-g1pc-criteria-name="${CSS.escape(id)}"]`);
    if (label) label.value = target.value;
    const match = section.querySelector(`[data-g1pc-match-name="${CSS.escape(id)}"]`);
    if (match) match.textContent = target.value || "Конкурент";
    const landing = section.querySelector(`[data-g1bp-landing-name-v575="${CSS.escape(id)}"]`);
    if (landing) landing.textContent = target.value || "Название товара или услуги";
  }
  if (target.dataset.g1bpDomainV543 !== undefined) {
    const match = section.querySelector(`[data-g1pc-match-domain="${CSS.escape(id)}"]`);
    if (match) match.textContent = target.value || "Домен не указан";
  }
  if (target.dataset.g1bpFieldV543 === "price")
    section.querySelectorAll(`[data-g1bp-serp-v569="${CSS.escape(id)}"] [data-g1bp-serp-price-v574]`)
      .forEach(price => { price.textContent = target.value ? `${target.value} ₽` : ""; });
  if (target.dataset.g1bpNameV543 !== undefined ||
      ["product", "price", "landingUrl"].includes(target.dataset.g1bpFieldV543))
    g1ProductComparisonRefreshReadOnlyLanding(section, id);
  if (target.dataset.g1bpAdPartV572 !== undefined || target.dataset.g1bpSearchFieldV569 !== undefined ||
      target.dataset.g1bpFieldV543 === "landingUrl" || target.dataset.g1bpFieldV543 === "price")
    g1ProductComparisonRefreshReadOnlySearch(section, id);
});

document.addEventListener("change", async event => {
  const section = event.target.closest?.("[data-g1bp-product-v543]");
  if (!section) return;
  if (event.target.hasAttribute("data-g1pc-draft-photo")) {
    const input = event.target, file = input.files?.[0];
    if (!file) return;
    const form = input.closest("form");
    const error = form?.querySelector("[data-g1pc-form-error]");
    if (!/^image\/(?:jpeg|png|webp)$/i.test(file.type) || file.size > 12 * 1024 * 1024) {
      if (error) error.textContent = "Выберите JPG, PNG или WebP размером до 12 МБ.";
      input.value = "";
      return;
    }
    try {
      const url = await v22ReadFileAsDataUrl(file);
      if (!input.isConnected) return;
      form.g1pcDraftPhotoFile = file;
      form.querySelectorAll(".g1bp-landing-photo-upload-v575").forEach(label => {
        const image = document.createElement("img");
        image.src = url;
        image.alt = "Фото продукта конкурента";
        label.querySelector("img, span")?.remove();
        label.prepend(image);
      });
      if (error) error.textContent = "";
    } catch (cause) {
      if (error) error.textContent = cause?.message || "Не удалось прочитать фото.";
    }
    return;
  }
  if (event.target.hasAttribute("data-g1pc-similarity")) {
    const model = g1ProductComparisonModel(section);
    const competitor = model.entry.competitors.find(row => row.id === event.target.dataset.g1pcSimilarity);
    if (!competitor || !["", "yes", "no"].includes(event.target.value)) return;
    const before = g1BergenTypeV543(competitor, model.jtbds);
    competitor.bergenV543.similarity = event.target.value;
    if (!g1BergenRefreshClassificationV581(section, model.entry, competitor, model.product, model.jtbds,
      before !== g1BergenTypeV543(competitor, model.jtbds)))
      g1BergenRefreshTableV580(section, model.entry, model.product, model.jtbds);
    g1ProductComparisonSyncChoiceControls(section, competitor, model.jtbds);
    const current = g1ProductComparisonCurrent(model).current;
    if (current) g1ProductComparisonRefreshMatchState(section, model, competitor, current);
    g1ProductComparisonSave(section, model);
    (event.target.isConnected ? event.target : section.querySelector(`[data-g1pc-grid] [data-g1pc-similarity="${CSS.escape(competitor.id)}"][value="${event.target.value}"]`))
      ?.focus({ preventScroll: true });
    return;
  }
  if (event.target.hasAttribute("data-g1bp-relevance-v549")) {
    requestAnimationFrame(() => g1ProductComparisonRefresh(section, "guide")); return;
  }
  if (event.target.hasAttribute("data-g1bp-domain-v543")) {
    requestAnimationFrame(() => g1ProductComparisonRefresh(section, "grid")); return;
  }
  if (event.target.hasAttribute("data-g1bp-found-keyword-v550")) {
    requestAnimationFrame(() => g1ProductComparisonRefresh(section)); return;
  }
  if (event.target.hasAttribute("data-g1bp-choice-v543") && event.target.dataset.g1bpChoiceV543 === "similarity") {
    requestAnimationFrame(() => g1ProductComparisonRefresh(section)); return;
  }
});

document.addEventListener("click", event => {
  const button = event.target.closest?.("[data-g1pc-draft-cta-add], [data-g1pc-draft-cta-remove]");
  const form = button?.closest("[data-g1pc-form]");
  if (!form) return;
  if (button.hasAttribute("data-g1pc-draft-cta-remove")) {
    button.closest(".g1pc-draft-cta-extra-row")?.remove();
    return;
  }
  const list = form.querySelector("[data-g1pc-draft-cta-list]");
  if (!list) return;
  const row = document.createElement("div");
  row.className = "g1bp-landing-cta-row-v576 g1pc-draft-cta-extra-row";
  const field = document.createElement("textarea");
  field.name = "additionalCtasV576";
  field.rows = 1;
  field.dataset.autosize = "off";
  field.dataset.g1pcDraftCtaExtra = "";
  field.className = "g1bp-landing-cta-input-v576";
  field.placeholder = "Текст кнопки";
  field.setAttribute("aria-label", `CTA ${list.children.length + 1}`);
  const remove = document.createElement("button");
  remove.type = "button";
  remove.dataset.g1pcDraftCtaRemove = "";
  remove.setAttribute("aria-label", "Удалить CTA");
  remove.textContent = "×";
  row.append(field, remove);
  list.append(row);
  field.focus();
});

document.addEventListener("click", event => {
  const target = event.target.closest?.("[data-g1bp-cta-add-v576], [data-g1bp-cta-remove-v576]");
  const section = target?.closest("[data-g1bp-product-v543]");
  const competitorId = target?.dataset?.g1bpCompetitorV543;
  if (section && competitorId) g1ProductComparisonRefreshReadOnlyLanding(section, competitorId);
});

document.addEventListener("click", event => {
  const target = event.target.closest?.("[data-g1bp-add-v543], [data-g1bp-delete-v543], [data-g1bp-select-keyword-v550]");
  const section = target?.closest("[data-g1bp-product-v543]");
  if (!section) return;
  requestAnimationFrame(() => g1ProductComparisonRefresh(section));
});

