/* ================================================================
   Gate 1 · SEO: пояснения «для чайника» (v307).

   Только DOM-проекция текста: storage, поля, формулы, карточки и их
   порядок не меняются. Два заменённых пояснения живут в
   GATE1_SEO_EXPLANATIONS_V297; остальные тексты добавляются здесь.
   ================================================================ */

const GATE1_SEO_GUIDANCE_V307 = "gate1-seo-guidance-v307";

const GATE1_SEO_BLOCK_GUIDANCE_V307 = Object.freeze({
  robots: "Файл robots.txt говорит роботам, какие страницы сайта можно сканировать. Как проверить: открой в браузере site.ru/robots.txt, файл должен открываться и быть не пустым. Эталон: есть строка Sitemap: с адресом карты сайта, важные страницы (каталог, товары) не закрыты через Disallow. Если не так: попроси разработчика исправить файл на сервере.",
  meta: "Meta Robots — это тег на странице, который говорит поисковику, индексировать её или нет. Как проверить: открой исходный код страницы (Ctrl+U), найди meta name=robots. Эталон: на важных страницах index, follow (страница видна поиску), на служебных (корзина, спасибо за заказ) index не нужен. Если не так: попроси разработчика поправить тег.",
  cwv: "CWV (Core Web Vitals) — это оценка Google, насколько быстро и удобно грузится страница. Как проверить: вставь адрес страницы на pagespeed.web.dev, посмотри итоговую оценку. Эталон: зелёная зона, без красных показателей. Если не так: чаще всего причина — тяжёлые картинки или медленный сервер, нужен разработчик.",
  ssl: "1. Вебмастер → Инструменты → Проверка ответа сервера.\n2. Ввести https://site.ru, выбрать Основной робот Яндекса, нажать «Проверить».\n3. Эталон: HTTP 200 OK.\n4. Открыть SSL Labs → SSL Server Test, ввести домен.\n5. Проверить сертификат, домен, срок действия и цепочку.\n6. Эталон: сертификат действующий, домен совпадает, срок не истёк, цепочка = Trusted.",
  webmasterCompany: "Яндекс Вебмастер — это официальный сервис Яндекса, который показывает, как поисковик реально видит сайт. Как проверить: зайди на webmaster.yandex.ru, подтверди права на сайт, посмотри раздел Диагностика. Эталон: сайт подтверждён, критичных ошибок и ошибок обхода нет. Если не так: исправь ошибки из списка диагностики, они обычно с пояснением.",
  interactive: "Речь о калькуляторе, конфигураторе, тесте или похожем инструменте на сайте, который помогает выбрать товар. Как проверить: есть ли такой инструмент на сайте сейчас, да или нет. Эталон: инструмент есть и реально помогает посетителю (считает цену, подбирает вариант). Если нет: не обязательно, но такой инструмент повышает вовлечённость и может дать SEO-трафик.",
  snippet: "Title и Description — это заголовок и описание, которые человек видит в поиске до перехода на сайт. Как проверить: длина Title 20–90 знаков, Description 70–155 знаков, оба содержат главный ключевой запрос товара. Эталон: заголовок понятный и цепляющий, описание объясняет, что за товар и чем он полезен. Если не так: перепиши текст короче или добавь ключевое слово.",
  webmasterProduct: `Как проверить точно:
1. Индексирование → Страницы в поиске → вкладка «Все страницы» (не «Последние изменения»). Найди URL выбранного товара через фильтр рядом со «Статус и URL»: «Содержит» → часть адреса. Есть — страница в индексе.
2. Нет там — проверь вкладку «Исключённые страницы» тем же фильтром. Если и там пусто, это само по себе не доказывает поломку: робот мог ещё не увидеть страницу, а данные Вебмастера — обновиться с задержкой.
3. Открой sitemap сайта (например, site.ru/sitemap-store.xml), найди адрес страницы через Ctrl+F и посмотри <lastmod>. Это дата последнего обновления, не создания страницы. Если дата свежая, дай роботу время на обход.
4. Чтобы ускорить: Индексирование → Переобход страниц → отправь URL страницы. Sitemap добавь или обнови отдельно в разделе Индексирование → Файлы Sitemap. Обновление не мгновенное: оно может занять часы или дни.

Быстрая ориентировочная проверка без Вебмастера: site:k-apple.ru/адрес-страницы в поиске Яндекса (замени пример адресом своего товара).`,
  blogProduct: "Статьи блога, которые ссылаются на этот товар и приводят на него трафик из поиска. Как проверить: посмотри, есть ли хотя бы одна статья блога, которая упоминает или ссылается на карточку товара. Эталон: 1–2 статьи на товар с естественной ссылкой в тексте. Если нет: не критично для старта, но блог помогает SEO и продажам в перспективе.",
});

function gate1SeoGuideTextV307(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function gate1SeoGuideNodeV307(kind, text, large = false) {
  const node = document.createElement(large ? "p" : "small");
  node.dataset.g1SeoGuideV307 = kind;
  if (large)
    node.className = "g3-product-journey-stage-explanation-v296";
  else node.className = "guru-strategic-card-source-v245";
  node.textContent = text;
  if (text.includes("\n")) node.style.whiteSpace = "pre-line";
  return node;
}

function gate1SeoGuidePrependV307(container, kind, text) {
  if (!container || container.querySelector(`:scope > [data-g1-seo-guide-v307="${kind}"]`))
    return;
  container.prepend(gate1SeoGuideNodeV307(kind, text, true));
}

function gate1SeoGuideAfterV307(anchor, kind, text) {
  if (!anchor || anchor.parentElement?.querySelector(`[data-g1-seo-guide-v307="${kind}"]`))
    return;
  anchor.insertAdjacentElement("afterend", gate1SeoGuideNodeV307(kind, text));
}

function gate1SeoGuideLabelV307(container, selector, kind, text) {
  const control = container?.querySelector?.(selector);
  const label = control?.closest?.("label");
  if (!label || label.querySelector(`[data-g1-seo-guide-v307="${kind}"]`)) return;
  const title = label.querySelector(":scope > span");
  const hint = gate1SeoGuideNodeV307(kind, text);
  if (title) title.insertAdjacentElement("afterend", hint);
  else label.insertBefore(hint, control || label.firstChild);
}

function gate1SeoGuideLinkedLabelV310(container, selector, kind, text, source) {
  gate1SeoGuideLabelV307(container, selector, kind, text);
  const hint = container?.querySelector?.(`[data-g1-seo-guide-v307="${kind}"]`);
  if (!hint || !source?.url || hint.querySelector("a")) return;
  const link = document.createElement("a");
  link.href = source.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = source.label;
  hint.append(" (", link, ")");
}

function gate1SeoGuideCardV307(root, title) {
  return [...(root?.querySelectorAll?.("[data-card]") || [])].find(
    (node) => gate1SeoGuideTextV307(
      node.querySelector(":scope > .g1-card-header .g1-card-title")?.textContent,
    ) === title,
  ) || null;
}

function gate1SeoGuideRobotsV307(root) {
  const card = gate1SeoGuideCardV307(root, "Robots.txt: доступ поисковых роботов");
  const body = card?.querySelector(":scope > .g1-card-body");
  gate1SeoGuidePrependV307(body, "robots-block", GATE1_SEO_BLOCK_GUIDANCE_V307.robots);
  gate1SeoGuideLabelV307(body, '[data-rv2="url"]', "robots-url", "Полный адрес файла, например https://k-apple.ru/robots.txt.");
  gate1SeoGuideLabelV307(body, '[data-rv2="domain"]', "robots-domain", "Главный адрес сайта без /robots.txt, например https://k-apple.ru.");
  gate1SeoGuideLabelV307(body, '[data-rv2-sys="yandex"][data-rv2-field="enabled"]', "robots-yandex-enabled", "Да, если сверял по Вебмастеру; Нет, если ещё не проверял.");
  gate1SeoGuideLabelV307(body, '[data-rv2-sys="yandex"][data-rv2-field="errors"]', "robots-errors", "1. webmaster → Инструменты → Анализ robots.txt\n2. Эталон: Результаты анализа robots.txt → 0 ошибок");
  gate1SeoGuideAfterV307(body?.querySelector('[data-rv2-sitemap-list] > span'), "robots-sitemap", "1. Вебмастер → Индексирование → Файлы Sitemap.\n2. Проверить каждый найденный Sitemap.\n3. Эталон: статус OK.");
  gate1SeoGuideAfterV307(body?.querySelector('[data-rv2-url-heading="important"]'), "robots-important", "Вебмастер → Инструменты → Анализ robots.txt.\n1. В блоке «Доступ к страницам» вставить важные URL: главную, категории, товары, услуги.\n2. Нажать Проверить.\n3. Эталон: для всех важных страниц Яндекс показывает, что доступ разрешён.");
  gate1SeoGuideAfterV307(body?.querySelector('[data-rv2-url-heading="service"]'), "robots-service", "4. Вебмастер → Инструменты → Анализ robots.txt.\n5. Проверить реальные служебные URL сайта.\n6. Эталон: ненужные для поиска страницы закрыты от обхода или индексирования.\n7. Важные коммерческие страницы при этом открыты.");
  gate1SeoGuideAfterV307(body?.querySelector('[data-rv2-url-title="important"]'), "robots-important-urls", "URL подставляются автоматически из Gate 0 → Точка отсчёта. Здесь зафиксируй результат проверки каждого адреса.");
  gate1SeoGuideAfterV307(body?.querySelector('[data-rv2-url-title="service"]'), "robots-service-urls", "Служебные URL определяются автоматически среди страниц Gate 0 → Точка отсчёта. Здесь зафиксируй результат и комментарий.");
}

function gate1SeoGuideCanonicalV307(root) {
  const card = gate1SeoGuideCardV307(root, "Канонический URL и редиректы");
  const body = card?.querySelector(":scope > .g1-card-body");
  const explanation = card?.querySelector('[data-g1-seo-explanation-v297="canonical-redirects"]');
  if (explanation) explanation.dataset.g1SeoGuideV307 = "canonical-block";
  gate1SeoGuideLabelV307(body, '[data-rdr-v130-field="domain"]', "canonical-url", "Введите только домен без протокола и пути, например site.ru.");
  const table = body?.querySelector(".g1-table-scroll");
  const tableHint = "Для каждого варианта укажите HTTP-код и выберите Результат: Ок или Ошибка.";
  if (table && !body.querySelector('[data-g1-seo-guide-v307="canonical-table"]'))
    table.insertAdjacentElement("beforebegin", gate1SeoGuideNodeV307("canonical-table", tableHint));
  else if (!table)
    gate1SeoGuideAfterV307(
      body?.querySelector('[data-rdr-v130-field="domain"]')?.closest("label"),
      "canonical-table",
      tableHint,
    );
}

function gate1SeoGuideAuditSummaryV307(root, title, key, text, hint) {
  const card = gate1SeoGuideCardV307(root, title);
  const body = card?.querySelector(":scope > .g1-card-body");
  gate1SeoGuidePrependV307(body, `${key}-block`, text);
  const note = body?.querySelector(".summary-note");
  gate1SeoGuideAfterV307(note, `${key}-table`, hint);
}

function gate1SeoGuideSslV307(root) {
  const card = gate1SeoGuideCardV307(root, "SSL / HTTPS: безопасность домена");
  const body = card?.querySelector(":scope > .g1-card-body");
  gate1SeoGuidePrependV307(body, "ssl-block", GATE1_SEO_BLOCK_GUIDANCE_V307.ssl);
  const hints = [
    ["domain", "Введи домен без протокола и пути, например site.ru.\nЭталон: поле заполнено."],
    ["httpsWorks", "Где: Вебмастер → Инструменты → Проверка ответа сервера.\nЧто вводим: https://site.ru → робот Основной робот Яндекса.\nЭталон: 200 OK, сообщений об ошибке SSL нет.", { label: "Яндекс", url: "https://yandex.ru/support/webmaster/ru/indexing-options/server-response" }],
    ["httpCode", "Фиксируем HTTP-код из проверки ответа сервера.\nЭталон: 200."],
    ["certValid", "Где: SSL Labs → SSL Server Test → ввести домен.\nЭталон: сертификат без ошибок, тест успешно завершён.", { label: "SSL Labs", url: "https://www.ssllabs.com/ssltest/" }],
    ["domainMatch", "Где: SSL Labs → Certificate #1 → Subject / Alternative names.\nЭталон: присутствует домен site.ru или подходящая маска *.site.ru. Сертификат на другой домен считается ошибкой.", { label: "Яндекс", url: "https://yandex.ru/support/webmaster/ru/diagnosis/mistakes" }],
    ["expiresIn", "Где: SSL Labs → Certificate #1 → Valid until.\nФиксируем число дней до окончания.\nЭталон: сертификат ещё действует.", { label: "Qualys SSL Labs", url: "https://www.ssllabs.com/ssltest/" }],
    ["chain", "Где: SSL Labs → Certification Paths.\nЭталон: Trusted.", { label: "Qualys SSL Labs", url: "https://www.ssllabs.com/ssltest/" }],
    ["evidence", "Сохраняем ссылку на отчёт SSL Labs или скрин результата."],
  ];
  hints.forEach(([field, text, source]) =>
    gate1SeoGuideLinkedLabelV310(
      body,
      `[data-ssl-v130-field="${field}"]`,
      `ssl-${field}`,
      text,
      source,
    ),
  );
}

function gate1SeoGuideWebmasterCompanyV307(root) {
  const block = root?.querySelector?.('[data-g1-webmaster-scope-v295="company"]');
  const body = block?.querySelector(":scope > .g1-section-body");
  gate1SeoGuidePrependV307(body, "webmaster-company-block", GATE1_SEO_BLOCK_GUIDANCE_V307.webmasterCompany);
  gate1SeoGuideLabelV307(body, '[data-g1-webmaster-company-v295="verificationMethod"]', "webmaster-method", "Как подтверждено право на сайт: мета-тег, файл или DNS-запись.");
  gate1SeoGuideLabelV307(body, '[data-g1-webmaster-company-v295="verificationStatus"]', "webmaster-status", "Подтверждён сайт в Вебмастере или нет.");
  gate1SeoGuideLabelV307(body, '[data-g1-webmaster-company-v295="crawlErrorsStatus"]', "webmaster-diagnostics", "Есть ли критичные ошибки в разделе Диагностика.");
  gate1SeoGuideLabelV307(body, '[data-g1-webmaster-company-v295="crawlErrors"]', "webmaster-errors", "Перечисли ошибки как в Вебмастере; если ошибок нет, оставь пусто.");
}

function gate1SeoGuideComparisonV307(root) {
  const block = root?.querySelector?.('[data-g1-seo-item-v296="project-comparison"]');
  const explanation = block?.querySelector('[data-g1-seo-explanation-v297="project-comparison"]');
  if (explanation) explanation.dataset.g1SeoGuideV307 = "comparison-block";
  const toolbar = block?.querySelector(".project-comparison-toolbar");
  if (!toolbar || block.querySelector('[data-g1-seo-guide-v307="comparison-fields"]')) return;
  const group = document.createElement("div");
  group.dataset.g1SeoGuideV307 = "comparison-fields";
  group.className = "g3-product-journey-stage-explanation-v296";
  group.append(
    gate1SeoGuideNodeV307("comparison-competitors", "Список конкурентов — добавь 3–5 прямых сайтов из той же ниши."),
    document.createElement("br"),
    gate1SeoGuideNodeV307("comparison-criteria", "Критерии компании — 7 пунктов: Целевая аудитория, Ассортимент, Цена, Каналы продаж, Продвижение, Сильные стороны, Слабые стороны. По каждому конкуренту отметь, что у него сильнее, слабее или отсутствует. Конкурентов конкретного товара заполняй отдельно в блоке «Сравнение проектов · Продукт/Услуга»."),
  );
  toolbar.insertAdjacentElement("afterend", group);
}

function gate1SeoGuideInteractiveV307(root) {
  const block = root?.querySelector?.("[data-g1-seo-interactive-tool-v305]");
  const header = block?.querySelector(":scope > header");
  if (header && !block.querySelector(':scope > [data-g1-seo-guide-v307="interactive-block"]'))
    header.insertAdjacentElement("afterend", gate1SeoGuideNodeV307("interactive-block", GATE1_SEO_BLOCK_GUIDANCE_V307.interactive, true));
  gate1SeoGuideLabelV307(block, '[data-g1-seo-interactive-tool-field-v305="exists_now"]', "interactive-exists", "Выбери Да или Нет.");
  gate1SeoGuideLabelV307(block, '[data-g1-seo-interactive-tool-field-v305="idea"]', "interactive-idea", "В 1–2 предложениях опиши, что инструмент должен считать, подбирать или помогать выбрать.");
}

function gate1SeoGuideSnippetV307(root) {
  const product = typeof guruV194SelectedProduct === "function"
    ? guruV194SelectedProduct(state)
    : null;
  const selectedPage = typeof gate1SeoSelectedPageV298 === "function"
    ? gate1SeoSelectedPageV298(product)
    : null;
  const selectedPageNode = typeof gate1SeoSelectedPageNodeV298 === "function"
    ? gate1SeoSelectedPageNodeV298(root, selectedPage)
    : null;
  const block = selectedPageNode?.querySelector('[data-v22-site-section="seo_snippet"]') ||
    root?.querySelector?.('[data-g1-seo-item-v296="seo-snippet"]');
  const body = block?.querySelector(":scope > .route-section-body") ||
    block?.querySelector(":scope > .g1-seo-central-item-body-v298");
  gate1SeoGuidePrependV307(body, "snippet-block", GATE1_SEO_BLOCK_GUIDANCE_V307.snippet);
  gate1SeoGuideLabelV307(body, '[data-gate1-page-field="title"]', "snippet-title", "Заголовок страницы товара: 20–90 знаков, ключевое слово ближе к началу.");
  gate1SeoGuideLabelV307(body, '[data-gate1-page-field="description"]', "snippet-description", "Описание страницы: 70–155 знаков, объясняет, что это за товар и зачем его покупать.");
  gate1SeoGuideLabelV307(body, '[data-page-context-key="seoKeywords"]', "snippet-keywords", "Главные запросы, по которым товар должны находить; перечисли через запятую.");
}

function gate1SeoGuideWebmasterProductV307(root) {
  const block = root?.querySelector?.('[data-g1-webmaster-scope-v295="product"]');
  const body = block?.querySelector(":scope > .g1-section-body");
  gate1SeoGuidePrependV307(body, "webmaster-product-block", GATE1_SEO_BLOCK_GUIDANCE_V307.webmasterProduct);
  gate1SeoGuideLabelV307(body, '[data-g1-webmaster-product-v295="landingIndexed"]', "webmaster-product-result", "Попала ли страница товара в индекс Яндекса.");
  gate1SeoGuideLabelV307(body, '[data-g1-webmaster-product-v295="checkedNote"]', "webmaster-product-note", "Дата и краткое пояснение, например: 07.09.2026, URL проверен в Вебмастере.");
}

function gate1SeoGuideBlogProductV307(root) {
  const block = root?.querySelector?.(':scope > [data-gate1-blog-product-v304]');
  const body = block?.querySelector(":scope > .gate1-blog-body-v304");
  gate1SeoGuidePrependV307(body, "blog-product-block", GATE1_SEO_BLOCK_GUIDANCE_V307.blogProduct);
  const picker = body?.querySelector(".gate1-blog-link-picker-v304");
  if (picker && !body.querySelector('[data-g1-seo-guide-v307="blog-product-links"]'))
    picker.insertAdjacentElement("beforebegin", gate1SeoGuideNodeV307("blog-product-links", "Связанные статьи — нажми «Привязать статью» и выбери нужную из списка существующих статей блога. Если подходящей статьи ещё нет, сначала создай её в разделе Блог, потом привязывай сюда."));
}

function gate1SeoGuidanceInjectV307() {
  if (activeGateId !== "gate-1") return;
  const root = els.contentArea?.querySelector?.(".g1-redesign");
  if (!root) return;
  gate1SeoGuideRobotsV307(root);
  gate1SeoGuideCanonicalV307(root);
  gate1SeoGuideAuditSummaryV307(root, "Meta Robots SEO META in 1 CLICK", "meta", GATE1_SEO_BLOCK_GUIDANCE_V307.meta, "Для каждой страницы открой исходный код, найди meta name=robots, зафиксируй значение и статус проверки.");
  gate1SeoGuideAuditSummaryV307(root, "CWV PageSpeed Insights", "cwv", GATE1_SEO_BLOCK_GUIDANCE_V307.cwv, "Для каждой страницы проверь URL на pagespeed.web.dev, зафиксируй оценку числом или цветом и статус проверки.");
  gate1SeoGuideSslV307(root);
  gate1SeoGuideWebmasterCompanyV307(root);
  gate1SeoGuideComparisonV307(root);
  gate1SeoGuideInteractiveV307(root);
  gate1SeoGuideSnippetV307(root);
  gate1SeoGuideWebmasterProductV307(root);
  gate1SeoGuideBlogProductV307(root);
  root.dataset.g1SeoGuidanceV307 = GATE1_SEO_GUIDANCE_V307;
}

const __gate1SeoGuidancePrevRenderV307 = renderGate1Accordion;
renderGate1Accordion = function (gate, cards) {
  const result = __gate1SeoGuidancePrevRenderV307.apply(this, arguments);
  gate1SeoGuidanceInjectV307();
  return result;
};

if (typeof gate1SeoInteractiveToolRefreshV305 === "function") {
  const __gate1SeoGuidancePrevInteractiveRefreshV307 =
    gate1SeoInteractiveToolRefreshV305;
  gate1SeoInteractiveToolRefreshV305 = function () {
    const result = __gate1SeoGuidancePrevInteractiveRefreshV307.apply(this, arguments);
    gate1SeoGuidanceInjectV307();
    return result;
  };
}

if (typeof gate1BlogRefreshV304 === "function") {
  const __gate1SeoGuidancePrevBlogRefreshV307 = gate1BlogRefreshV304;
  gate1BlogRefreshV304 = function () {
    const result = __gate1SeoGuidancePrevBlogRefreshV307.apply(this, arguments);
    gate1SeoGuidanceInjectV307();
    return result;
  };
}

if (activeGateId === "gate-1") gate1SeoGuidanceInjectV307();
