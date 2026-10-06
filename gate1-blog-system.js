/* ================================================================
   Gate 1 · Блог как система (v304).

   Это отдельная модель планирования блога. Она не добавляет карточки в
   gate-1.cards и не меняет card-25 «СТАТЬЯ БЛОГА» или данные других Gate.
   Компания хранит архитектуру хаба и карточки статей; product_links[]
   связывает одну статью с несколькими product_id и хранит статус связи.
   ================================================================ */

const GATE1_BLOG_SYSTEM_V304 = "gate1-blog-system-v304";
const GATE1_BLOG_STATUSES_V304 = [
  ["not_started", "Не начато"],
  ["in_progress", "В работе"],
  ["ready", "Готово"],
  ["published", "Опубликовано"],
];

function gate1BlogTextV304(value) {
  return String(value ?? "").trim();
}

function gate1BlogIdV304(prefix) {
  return typeof makeId === "function"
    ? makeId(prefix)
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function gate1BlogStoreV304(workspace = state) {
  if (!workspace || typeof workspace !== "object") return null;
  const store = workspace.gate1BlogV304 && typeof workspace.gate1BlogV304 === "object"
    ? workspace.gate1BlogV304
    : {};
  workspace.gate1BlogV304 = store;
  store.version = GATE1_BLOG_SYSTEM_V304;
  store.hub = store.hub && typeof store.hub === "object" ? store.hub : {};
  store.hub.title = gate1BlogTextV304(store.hub.title) || "Блог";
  store.hub.path = gate1BlogTextV304(store.hub.path) || "/blog";
  store.hub.description = String(store.hub.description || "");
  store.articles = Array.isArray(store.articles) ? store.articles : [];
  store.articles = store.articles.map((article) => {
    const normalized = article && typeof article === "object" ? article : {};
    normalized.id = gate1BlogTextV304(normalized.id) || gate1BlogIdV304("gate1-blog-article");
    normalized.title = String(normalized.title || "");
    normalized.summary = String(normalized.summary || "");
    normalized.publication_date = String(normalized.publication_date || "");
    normalized.updated_date = String(normalized.updated_date || "");
    normalized.reading_minutes = String(normalized.reading_minutes || "");
    normalized.toc = Array.isArray(normalized.toc) && normalized.toc.length
      ? normalized.toc.map((entry) => ({
          id: gate1BlogTextV304(entry?.id) || gate1BlogIdV304("gate1-blog-toc"),
          title: String(entry?.title || ""),
        }))
      : [{ id: gate1BlogIdV304("gate1-blog-toc"), title: "" }];
    normalized.faq = Array.isArray(normalized.faq) && normalized.faq.length
      ? normalized.faq.map((entry) => ({
          id: gate1BlogTextV304(entry?.id) || gate1BlogIdV304("gate1-blog-faq"),
          question: String(entry?.question || ""),
          answer: String(entry?.answer || ""),
        }))
      : [{ id: gate1BlogIdV304("gate1-blog-faq"), question: "", answer: "" }];
    normalized.author = normalized.author && typeof normalized.author === "object"
      ? normalized.author
      : {};
    normalized.author.name = String(normalized.author.name || "");
    normalized.author.role = String(normalized.author.role || "");
    normalized.author.credentials = String(normalized.author.credentials || "");
    normalized.author.social_url = String(normalized.author.social_url || "");
    const seenProducts = new Set();
    normalized.product_links = (Array.isArray(normalized.product_links)
      ? normalized.product_links
      : []).reduce((links, link) => {
        const productId = gate1BlogTextV304(link?.product_id);
        if (!productId || seenProducts.has(productId)) return links;
        seenProducts.add(productId);
        const status = GATE1_BLOG_STATUSES_V304.some(([key]) => key === link?.status)
          ? link.status
          : "not_started";
        links.push({ product_id: productId, status });
        return links;
      }, []);
    return normalized;
  });
  return store;
}

function gate1BlogNewArticleV304() {
  return {
    id: gate1BlogIdV304("gate1-blog-article"),
    title: "",
    summary: "",
    publication_date: "",
    updated_date: "",
    reading_minutes: "",
    toc: [{ id: gate1BlogIdV304("gate1-blog-toc"), title: "" }],
    faq: [{ id: gate1BlogIdV304("gate1-blog-faq"), question: "", answer: "" }],
    author: { name: "", role: "", credentials: "", social_url: "" },
    product_links: [],
  };
}

function gate1BlogArticleV304(articleId) {
  return gate1BlogStoreV304(state)?.articles.find(
    (article) => article.id === gate1BlogTextV304(articleId),
  ) || null;
}

function gate1BlogStatusLabelV304(status) {
  return GATE1_BLOG_STATUSES_V304.find(([key]) => key === status)?.[1] || "Не начато";
}

function gate1BlogArticleReadyV304(article) {
  return Boolean(
    gate1BlogTextV304(article?.title) &&
    gate1BlogTextV304(article?.summary) &&
    gate1BlogTextV304(article?.publication_date) &&
    gate1BlogTextV304(article?.reading_minutes) &&
    article?.toc?.some((entry) => gate1BlogTextV304(entry.title)) &&
    article?.faq?.some((entry) =>
      gate1BlogTextV304(entry.question) && gate1BlogTextV304(entry.answer),
    ) &&
    gate1BlogTextV304(article?.author?.name) &&
    gate1BlogTextV304(article?.author?.role)
  );
}

function gate1BlogCompanyStatusV304(store) {
  if (!store?.articles.length) return "not_started";
  return store.articles.every(gate1BlogArticleReadyV304) ? "ready" : "in_progress";
}

function gate1BlogProductStatusV304(articles, productId) {
  const statuses = articles
    .map((article) => article.product_links.find((link) => link.product_id === productId)?.status)
    .filter(Boolean);
  if (!statuses.length) return "not_started";
  return statuses.every((status) => status === "ready" || status === "published")
    ? "ready"
    : "in_progress";
}

function gate1BlogAccordionV304(scope) {
  const key = `gate1-blog-v304-${scope}`;
  const subblocks = getGate1AccordionState().subblocks;
  if (!Object.prototype.hasOwnProperty.call(subblocks, key)) subblocks[key] = true;
  return { key, open: Boolean(subblocks[key]) };
}

function gate1BlogSectionV304(scope, title, note, status, body) {
  const accordion = gate1BlogAccordionV304(scope);
  const section = document.createElement("section");
  section.className = `g1-section gate1-blog-section-v304 ${accordion.open ? "is-open" : ""}`;
  section.dataset[`gate1Blog${scope === "company" ? "Company" : "Product"}V304`] = "1";
  section.innerHTML = `<button type="button" class="g1-section-header" data-gate1-toggle-section="${escapeAttr(accordion.key)}" aria-expanded="${accordion.open ? "true" : "false"}">
    <span class="g1-section-left">
      <span class="g1-section-title">${escapeHtml(title)}</span>
      <span class="g1-section-progress">${escapeHtml(note)}</span>
    </span>
    <span class="status-pill status-${escapeAttr(status)}">${escapeHtml(STATUS_LABELS[status] || status)}</span>
    <span class="g1-section-toggle">${accordion.open ? "Закрыть" : "Открыть"}</span>
  </button>
  <div class="g1-section-body gate1-blog-body-v304"${accordion.open ? "" : " hidden"}>${body}</div>`;
  return section;
}

function gate1BlogProductsV304() {
  const products = state?.project?.catalogItemsV189;
  return Array.isArray(products)
    ? products.filter((product) => gate1BlogTextV304(product?.id) && gate1BlogTextV304(product?.name))
    : [];
}

function gate1BlogSelectedProductV304() {
  const productId = gate1BlogTextV304(
    state?.project?.gate0ScopeUiV194?.selectedProductId,
  );
  return gate1BlogProductsV304().find((product) => product.id === productId) || null;
}

function gate1BlogLiveValuesV304(field, product) {
  const records = Array.isArray(state?.project?.gate0ScopedValuesV194)
    ? state.project.gate0ScopedValuesV194
    : [];
  const categoryId = megaPlatformProductCategoryId(product, state);
  const valuesAt = (scope) => records.filter((record) => {
    if (record?.field !== field || record?.scope !== scope) return false;
    if (scope === "product") return record.product_id === product.id;
    if (scope === "category") return Boolean(categoryId) && record.category_id === categoryId;
    return scope === "project";
  }).map((record) => gate1BlogTextV304(record.value)).filter(Boolean);
  return valuesAt("product").length
    ? valuesAt("product")
    : valuesAt("category").length
      ? valuesAt("category")
      : valuesAt("project");
}

function gate1BlogHubRowsV304(articles) {
  if (!articles.length)
    return '<div class="gate1-blog-empty-v304">Статей пока нет. После добавления здесь появится будущий список хаба.</div>';
  return `<div class="gate1-blog-hub-table-v304">
    <div class="gate1-blog-hub-row-v304 is-head"><span>Дата публикации</span><span>Название</span><span>Краткое описание</span></div>
    ${articles.map((article) => `<div class="gate1-blog-hub-row-v304" data-gate1-blog-hub-article-v304="${escapeAttr(article.id)}">
      <span>${escapeHtml(article.publication_date || "Не задана")}</span>
      <strong>${escapeHtml(article.title || "Без названия")}</strong>
      <span>${escapeHtml(article.summary || "Описание пока не заполнено")}</span>
    </div>`).join("")}
  </div>`;
}

function gate1BlogProductChecklistV304(article, products) {
  if (!products.length)
    return '<div class="gate1-blog-empty-v304">Сначала добавьте товары или услуги в единый каталог.</div>';
  const linked = new Set(article.product_links.map((link) => link.product_id));
  return `<div class="gate1-blog-product-checklist-v304">
    ${products.map((product) => `<label>
      <input type="checkbox" data-gate1-blog-product-link-v304="${escapeAttr(product.id)}" data-gate1-blog-article-id-v304="${escapeAttr(article.id)}" ${linked.has(product.id) ? "checked" : ""}>
      <span>${escapeHtml(product.name || "Товар")}</span>
    </label>`).join("")}
  </div>`;
}

function gate1BlogArticleEditorV304(article, index, products) {
  return `<article class="gate1-blog-article-editor-v304" data-gate1-blog-article-v304="${escapeAttr(article.id)}">
    <header><div><span>Статья ${index + 1}</span><strong>${escapeHtml(article.title || "Новая статья")}</strong></div><span>${article.product_links.length} связей с товарами</span></header>
    <div class="gate1-blog-fields-grid-v304">
      <label class="g1-field gate1-blog-wide-v304"><span>Заголовок</span><input class="g1-input" data-gate1-blog-article-id-v304="${escapeAttr(article.id)}" data-gate1-blog-article-field-v304="title" value="${escapeAttr(article.title)}" placeholder="Название статьи"></label>
      <label class="g1-field"><span>Дата публикации</span><input type="date" class="g1-input" data-gate1-blog-article-id-v304="${escapeAttr(article.id)}" data-gate1-blog-article-field-v304="publication_date" value="${escapeAttr(article.publication_date)}"></label>
      <label class="g1-field"><span>Дата обновления</span><input type="date" class="g1-input" data-gate1-blog-article-id-v304="${escapeAttr(article.id)}" data-gate1-blog-article-field-v304="updated_date" value="${escapeAttr(article.updated_date)}"></label>
      <label class="g1-field"><span>Время чтения, мин.</span><input type="number" min="1" class="g1-input" data-gate1-blog-article-id-v304="${escapeAttr(article.id)}" data-gate1-blog-article-field-v304="reading_minutes" value="${escapeAttr(article.reading_minutes)}" placeholder="7"></label>
      <label class="g1-field gate1-blog-wide-v304"><span>Краткое описание для списка хаба</span><textarea class="g1-input" rows="2" data-gate1-blog-article-id-v304="${escapeAttr(article.id)}" data-gate1-blog-article-field-v304="summary" placeholder="О чём статья и какую задачу читателя решает">${escapeHtml(article.summary)}</textarea></label>
    </div>
    <div class="gate1-blog-template-grid-v304">
      <section><div class="gate1-blog-subhead-v304"><strong>Оглавление</strong><button type="button" class="small-btn" data-gate1-blog-add-toc-v304="${escapeAttr(article.id)}">+ раздел</button></div>
        ${article.toc.map((entry, entryIndex) => `<div class="gate1-blog-inline-row-v304">
          <input class="g1-input" data-gate1-blog-article-id-v304="${escapeAttr(article.id)}" data-gate1-blog-toc-index-v304="${entryIndex}" value="${escapeAttr(entry.title)}" placeholder="Название раздела">
          <button type="button" class="small-btn danger-mini" data-gate1-blog-remove-toc-v304="${escapeAttr(article.id)}" data-gate1-blog-index-v304="${entryIndex}" ${article.toc.length <= 1 ? "disabled" : ""}>×</button>
        </div>`).join("")}
      </section>
      <section><div class="gate1-blog-subhead-v304"><strong>FAQ для микроразметки</strong><button type="button" class="small-btn" data-gate1-blog-add-faq-v304="${escapeAttr(article.id)}">+ вопрос</button></div>
        <small>Минимум одна заполненная пара «вопрос — ответ».</small>
        ${article.faq.map((entry, entryIndex) => `<div class="gate1-blog-faq-row-v304">
          <input class="g1-input" data-gate1-blog-article-id-v304="${escapeAttr(article.id)}" data-gate1-blog-faq-index-v304="${entryIndex}" data-gate1-blog-faq-field-v304="question" value="${escapeAttr(entry.question)}" placeholder="Вопрос">
          <textarea class="g1-input" rows="2" data-gate1-blog-article-id-v304="${escapeAttr(article.id)}" data-gate1-blog-faq-index-v304="${entryIndex}" data-gate1-blog-faq-field-v304="answer" placeholder="Ответ">${escapeHtml(entry.answer)}</textarea>
          <button type="button" class="small-btn danger-mini" data-gate1-blog-remove-faq-v304="${escapeAttr(article.id)}" data-gate1-blog-index-v304="${entryIndex}" ${article.faq.length <= 1 ? "disabled" : ""}>×</button>
        </div>`).join("")}
      </section>
    </div>
    <section class="gate1-blog-author-v304"><strong>Автор</strong><div class="gate1-blog-fields-grid-v304">
      ${[["name", "Имя"], ["role", "Должность"], ["credentials", "Регалии"], ["social_url", "Ссылка на соцсети"]].map(([field, label]) => `<label class="g1-field"><span>${escapeHtml(label)}</span><input class="g1-input" data-gate1-blog-article-id-v304="${escapeAttr(article.id)}" data-gate1-blog-author-field-v304="${escapeAttr(field)}" value="${escapeAttr(article.author[field])}"></label>`).join("")}
    </div></section>
    <section class="gate1-blog-links-v304"><strong>Связанные товары и услуги</strong><small>Одна статья может быть связана с несколькими product_id.</small>${gate1BlogProductChecklistV304(article, products)}</section>
  </article>`;
}

function gate1BlogCompanyHtmlV304(store) {
  const products = gate1BlogProductsV304();
  return `<section class="gate1-blog-panel-v304">
    <div class="gate1-blog-panel-head-v304"><div><strong>Хаб-страница блога</strong><span>Справочная модель будущей страницы. Ничего не публикует и не создаёт страницы автоматически.</span></div></div>
    <div class="gate1-blog-fields-grid-v304">
      <label class="g1-field"><span>Название хаба</span><input class="g1-input" data-gate1-blog-hub-field-v304="title" value="${escapeAttr(store.hub.title)}"></label>
      <label class="g1-field"><span>Будущий путь</span><input class="g1-input" data-gate1-blog-hub-field-v304="path" value="${escapeAttr(store.hub.path)}"></label>
      <label class="g1-field gate1-blog-wide-v304"><span>Описание хаба</span><textarea class="g1-input" rows="2" data-gate1-blog-hub-field-v304="description" placeholder="Какую пользу даёт раздел блога">${escapeHtml(store.hub.description)}</textarea></label>
    </div>
    ${gate1BlogHubRowsV304(store.articles)}
  </section>
  <section class="gate1-blog-panel-v304">
    <div class="gate1-blog-panel-head-v304"><div><strong>Шаблон карточки статьи</strong><span>Заголовок · даты публикации и обновления · время чтения · оглавление · FAQ · автор.</span></div><button type="button" class="small-btn add-inline-btn" data-gate1-blog-create-v304>+ Добавить статью</button></div>
    <div class="gate1-blog-template-note-v304">FAQ допускает минимум одну пару — это обязательная основа для будущей автоматической микроразметки.</div>
    <div class="gate1-blog-article-list-v304">${store.articles.length
      ? store.articles.map((article, index) => gate1BlogArticleEditorV304(article, index, products)).join("")
      : '<div class="gate1-blog-empty-v304">Добавьте первую статью — она появится в модели хаба и станет доступна для привязки к товарам.</div>'}</div>
  </section>`;
}

function gate1BlogLiveContextV304(product) {
  if (!product) return "";
  const fields = [
    ["jtbd", "JTBD"],
    ["segments", "Сегмент"],
    ["positioning", "Позиционирование"],
    ["usp", "УТП"],
  ];
  const rows = fields.map(([field, label]) => {
    const values = gate1BlogLiveValuesV304(field, product);
    return values.length
      ? `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(values.join(" · "))}</strong></div>`
      : "";
  }).filter(Boolean);
  return `<section class="gate1-blog-context-v304"><div><strong>Живой контекст выбранного товара</strong><small>Читается из существующих JTBD, сегментов и стратегии; повторного ввода нет.</small></div>${rows.length ? rows.join("") : '<div class="gate1-blog-empty-v304">Контекст товара пока не заполнен в исходных данных.</div>'}</section>`;
}

function gate1BlogStatusOptionsV304(current) {
  return GATE1_BLOG_STATUSES_V304.map(([key, label]) =>
    `<option value="${escapeAttr(key)}" ${key === current ? "selected" : ""}>${escapeHtml(label)}</option>`,
  ).join("");
}

function gate1BlogProductHtmlV304(store, product) {
  if (!product)
    return '<div class="gate1-blog-empty-v304">Выберите категорию и товар в общем селекторе выше.</div>';
  const linkedArticles = store.articles.filter((article) =>
    article.product_links.some((link) => link.product_id === product.id),
  );
  const available = store.articles.filter((article) =>
    !article.product_links.some((link) => link.product_id === product.id),
  );
  return `${gate1BlogLiveContextV304(product)}
    <section class="gate1-blog-panel-v304">
      <div class="gate1-blog-panel-head-v304"><div><strong>Статьи для «${escapeHtml(product.name || "Товар") }»</strong><span>Связь хранится по product_id; одна статья может относиться к нескольким товарам.</span></div></div>
      <div class="gate1-blog-link-picker-v304">
        <select class="g1-input" data-gate1-blog-link-select-v304>
          <option value="">${available.length ? "Выберите существующую статью" : "Все статьи уже привязаны"}</option>
          ${available.map((article) => `<option value="${escapeAttr(article.id)}">${escapeHtml(article.title || "Без названия")}</option>`).join("")}
        </select>
        <button type="button" class="small-btn" data-gate1-blog-link-selected-v304="${escapeAttr(product.id)}" ${available.length ? "" : "disabled"}>Привязать статью</button>
      </div>
      <div class="gate1-blog-linked-list-v304">${linkedArticles.length
        ? linkedArticles.map((article) => {
            const link = article.product_links.find((entry) => entry.product_id === product.id);
            return `<article data-gate1-blog-linked-article-v304="${escapeAttr(article.id)}">
              <div><span>${escapeHtml(article.publication_date || "Дата не задана")} · ${escapeHtml(article.reading_minutes ? `${article.reading_minutes} мин.` : "время не задано")}</span><strong>${escapeHtml(article.title || "Без названия")}</strong><p>${escapeHtml(article.summary || "Краткое описание пока не заполнено")}</p></div>
              <label><span>Статус</span><select class="g1-input status-${escapeAttr(link.status)}" data-gate1-blog-link-status-v304 data-gate1-blog-article-id-v304="${escapeAttr(article.id)}" data-gate1-blog-product-id-v304="${escapeAttr(product.id)}">${gate1BlogStatusOptionsV304(link.status)}</select></label>
            </article>`;
          }).join("")
        : '<div class="gate1-blog-empty-v304">К выбранному товару пока не привязана ни одна статья.</div>'}</div>
    </section>`;
}

function gate1BlogFindDividerV304(root, title) {
  if (typeof gate1SeoFindDividerV298 === "function")
    return gate1SeoFindDividerV298(root, title);
  return [...root.querySelectorAll(":scope > .gate0-section-heading")].find(
    (node) => node.querySelector(".gate0-section-heading-title")?.textContent?.trim() === title,
  ) || null;
}

// Gate 1 собирается несколькими независимыми проекциями. Упорядочиваем уже
// созданные DOM-узлы, не меняя gate.cards и сохранённые данные разделов.
function gate1BlogOrderProductSectionsV368(root) {
  const selector = root?.querySelector?.(
    ':scope > [data-guru-product-context="gate1-product-pages"]',
  );
  if (!selector) return;
  const gate = state?.gates?.find((item) => item.id === "gate-1");
  const landingKinds = new Map((gate?.cards || [])
    .map((card) => [card.id, gate1LandingCardKindV234(card)])
    .filter(([, kind]) => kind === "product" || kind === "service"));
  const landings = [...root.children]
    .filter((node) => node.matches("[data-card]") && landingKinds.has(node.dataset.card))
    .sort((a, b) => Number(landingKinds.get(a.dataset.card) === "product") -
      Number(landingKinds.get(b.dataset.card) === "product"));
  const section = (key) => root.querySelector(
    `:scope > .g1-section > [data-gate1-toggle-section="${key}"]`,
  )?.closest(".g1-section");
  const sequence = [
    ...landings,
    root.querySelector(':scope > [data-g1-seo-central-v298="product"]'),
    section("pain_jtbd_offer"),
    root.querySelector(":scope > [data-gate1-blog-product-v304]"),
    section("unit_economics"),
    root.querySelector(":scope > .project-comparison-product-v309"),
  ];
  let anchor = selector;
  sequence.filter((node) => node && node.parentElement === root).forEach((node) => {
    anchor.insertAdjacentElement("afterend", node);
    anchor = node;
  });
}

function gate1BlogInjectV304() {
  if (activeGateId !== "gate-1") return;
  const root = els.contentArea?.querySelector?.(".g1-redesign");
  if (!root || root.querySelector("[data-gate1-blog-company-v304]")) return;
  const store = gate1BlogStoreV304(state);
  const product = gate1BlogSelectedProductV304();
  const companyBlock = gate1BlogSectionV304(
    "company",
    "Блог · Компания",
    `${store.articles.length} статей · архитектура хаба и шаблон`,
    gate1BlogCompanyStatusV304(store),
    gate1BlogCompanyHtmlV304(store),
  );
  const linked = product
    ? store.articles.filter((article) =>
        article.product_links.some((link) => link.product_id === product.id),
      )
    : [];
  const productBlock = gate1BlogSectionV304(
    "product",
    "Блог · Продукт/Услуга",
    product ? `${product.name} · ${linked.length} связанных статей` : "Выберите категорию и товар",
    product ? gate1BlogProductStatusV304(store.articles, product.id) : "not_started",
    gate1BlogProductHtmlV304(store, product),
  );
  const productDivider = gate1BlogFindDividerV304(root, "Продукт / Услуга");
  if (productDivider) productDivider.insertAdjacentElement("beforebegin", companyBlock);
  else root.prepend(companyBlock);
  const productSeo = root.querySelector(':scope > [data-g1-seo-central-v298="product"]');
  const selector = root.querySelector(':scope > [data-guru-product-context="gate1-product-pages"]');
  if (productSeo) productSeo.insertAdjacentElement("afterend", productBlock);
  else if (selector) selector.insertAdjacentElement("afterend", productBlock);
  else if (productDivider) productDivider.insertAdjacentElement("afterend", productBlock);
  else root.append(productBlock);
  gate1BlogOrderProductSectionsV368(root);
  root.dataset.gate1BlogSystemV304 = "1";
  bindGate1Accordion();
}

function gate1BlogRefreshV304() {
  if (activeGateId !== "gate-1") return;
  const root = els.contentArea?.querySelector?.(".g1-redesign");
  if (!root) return;
  root.querySelector(":scope > [data-gate1-blog-company-v304]")?.remove();
  root.querySelector(":scope > [data-gate1-blog-product-v304]")?.remove();
  delete root.dataset.gate1BlogSystemV304;
  gate1BlogInjectV304();
}

const __gate1BlogPrevRenderV304 = renderGate1Accordion;
renderGate1Accordion = function (gate, cards) {
  const result = __gate1BlogPrevRenderV304.apply(this, arguments);
  gate1BlogInjectV304();
  return result;
};

document.addEventListener("click", (event) => {
  const create = event.target?.closest?.("[data-gate1-blog-create-v304]");
  const addToc = event.target?.closest?.("[data-gate1-blog-add-toc-v304]");
  const removeToc = event.target?.closest?.("[data-gate1-blog-remove-toc-v304]");
  const addFaq = event.target?.closest?.("[data-gate1-blog-add-faq-v304]");
  const removeFaq = event.target?.closest?.("[data-gate1-blog-remove-faq-v304]");
  const linkSelected = event.target?.closest?.("[data-gate1-blog-link-selected-v304]");
  if (!create && !addToc && !removeToc && !addFaq && !removeFaq && !linkSelected) return;
  const store = gate1BlogStoreV304(state);
  if (create) store.articles.push(gate1BlogNewArticleV304());
  if (addToc) gate1BlogArticleV304(addToc.dataset.gate1BlogAddTocV304)?.toc.push({
    id: gate1BlogIdV304("gate1-blog-toc"),
    title: "",
  });
  if (removeToc) {
    const article = gate1BlogArticleV304(removeToc.dataset.gate1BlogRemoveTocV304);
    if (article?.toc.length > 1) article.toc.splice(Number(removeToc.dataset.gate1BlogIndexV304), 1);
  }
  if (addFaq) gate1BlogArticleV304(addFaq.dataset.gate1BlogAddFaqV304)?.faq.push({
    id: gate1BlogIdV304("gate1-blog-faq"),
    question: "",
    answer: "",
  });
  if (removeFaq) {
    const article = gate1BlogArticleV304(removeFaq.dataset.gate1BlogRemoveFaqV304);
    if (article?.faq.length > 1) article.faq.splice(Number(removeFaq.dataset.gate1BlogIndexV304), 1);
  }
  if (linkSelected) {
    const select = linkSelected.closest(".gate1-blog-link-picker-v304")
      ?.querySelector("[data-gate1-blog-link-select-v304]");
    const article = gate1BlogArticleV304(select?.value);
    const productId = linkSelected.dataset.gate1BlogLinkSelectedV304;
    if (article && productId && !article.product_links.some((link) => link.product_id === productId))
      article.product_links.push({ product_id: productId, status: "not_started" });
  }
  flashSaving();
  gate1BlogRefreshV304();
});

document.addEventListener("input", (event) => {
  const hub = event.target?.closest?.("[data-gate1-blog-hub-field-v304]");
  const articleField = event.target?.closest?.("[data-gate1-blog-article-field-v304]");
  const authorField = event.target?.closest?.("[data-gate1-blog-author-field-v304]");
  const tocField = event.target?.closest?.("[data-gate1-blog-toc-index-v304]");
  const faqField = event.target?.closest?.("[data-gate1-blog-faq-field-v304]");
  if (!hub && !articleField && !authorField && !tocField && !faqField) return;
  if (hub) gate1BlogStoreV304(state).hub[hub.dataset.gate1BlogHubFieldV304] = hub.value;
  const target = articleField || authorField || tocField || faqField;
  const article = target ? gate1BlogArticleV304(target.dataset.gate1BlogArticleIdV304) : null;
  if (articleField && article)
    article[articleField.dataset.gate1BlogArticleFieldV304] = articleField.value;
  if (authorField && article)
    article.author[authorField.dataset.gate1BlogAuthorFieldV304] = authorField.value;
  if (tocField && article?.toc[Number(tocField.dataset.gate1BlogTocIndexV304)])
    article.toc[Number(tocField.dataset.gate1BlogTocIndexV304)].title = tocField.value;
  if (faqField && article?.faq[Number(faqField.dataset.gate1BlogFaqIndexV304)])
    article.faq[Number(faqField.dataset.gate1BlogFaqIndexV304)][faqField.dataset.gate1BlogFaqFieldV304] = faqField.value;
  flashSaving();
});

document.addEventListener("change", (event) => {
  const productLink = event.target?.closest?.("[data-gate1-blog-product-link-v304]");
  const statusSelect = event.target?.closest?.("[data-gate1-blog-link-status-v304]");
  if (!productLink && !statusSelect) return;
  const target = productLink || statusSelect;
  const article = gate1BlogArticleV304(target.dataset.gate1BlogArticleIdV304);
  if (!article) return;
  if (productLink) {
    const productId = productLink.dataset.gate1BlogProductLinkV304;
    const index = article.product_links.findIndex((link) => link.product_id === productId);
    if (productLink.checked && index < 0)
      article.product_links.push({ product_id: productId, status: "not_started" });
    if (!productLink.checked && index >= 0) article.product_links.splice(index, 1);
  }
  if (statusSelect) {
    const link = article.product_links.find(
      (entry) => entry.product_id === statusSelect.dataset.gate1BlogProductIdV304,
    );
    if (link && GATE1_BLOG_STATUSES_V304.some(([key]) => key === statusSelect.value))
      link.status = statusSelect.value;
  }
  flashSaving();
  gate1BlogRefreshV304();
});

if (activeGateId === "gate-1") gate1BlogInjectV304();
