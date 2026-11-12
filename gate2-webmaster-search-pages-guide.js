/* Webmaster 3.1: page list comes from the selected project's Platform. */
const G2WM_SEARCH_PAGE_SECTIONS = Object.freeze([
  { id: "home", title: "Главная страница" },
  { id: "contacts", title: "Контакты" },
  { id: "commercial", title: "Коммерческие страницы (Категория)" },
  { id: "about", title: "О нас / история бренда" },
  { id: "blog", title: "Блог" },
]);
function g2wmSearchPages(workspace = state) {
  const pages = [];
  for (const page of megaPlatformAllPages(workspace)) {
    const section = page.group === "categories" || page.group === "fixed" && page.id === "catalog"
      ? "commercial" : page.group === "fixed" && ["home", "contacts", "about", "blog"].includes(page.id)
        ? page.id : "";
    if (!section) continue;
    const url = String(page.url || "").trim();
    let parsed = null;
    try { parsed = new URL(url); } catch (_) {}
    const editorUrl = parsed && ["tilda.cc", "www.tilda.cc"].includes(parsed.hostname.toLowerCase());
    const publicUrl = parsed && ["http:", "https:"].includes(parsed.protocol) && !editorUrl ? parsed.href : "";
    const anchor = Boolean(parsed?.hash);
    const type = page.group === "categories" ? "Категория"
      : page.id === "catalog" ? "Каталог"
      : page.id === "home" ? "Главная" : "Страница сайта";
    const name = String(page.name || "Страница").trim();
    const entry = { ...page, name, section, type, url, publicUrl, anchor, technical: false };
    pages.push(entry);
  }
  return pages.sort((left, right) => G2WM_SEARCH_PAGE_SECTIONS.findIndex(section => section.id === left.section) -
    G2WM_SEARCH_PAGE_SECTIONS.findIndex(section => section.id === right.section));
}

function g2wmSearchFingerprint(workspace = state) {
  return JSON.stringify([workspace?.project?.name || "", g2wPlatform(workspace),
    g2wmSearchPages(workspace).map(page => [page.group, page.id, page.name, page.url])]);
}

const G2WM_SEARCH_ACTIONS = Object.freeze([
  { id: "prepare", title: "А. Подготовить список страниц", required: true },
  { id: "open", title: "Б. Открыть Яндекс Вебмастер", required: true },
  { id: "verify", title: "Г. Проверить результат индексирования", required: true },
  { id: "history", title: "Д. Проверить последние изменения", required: false },
  { id: "search", title: "Е. Проверить через Поиск Яндекса", required: false },
  { id: "record", title: "Ж. Зафиксировать результаты", required: true },
]);
function g2wmSearchPageKey(page) { return `${page.group}:${page.id}`; }
function g2wmSearchChecks(action = "prepare", workspace = state) {
  const review = g2wmReviews(workspace).s31;
  return action === "prepare" ? review?.pageChecks || {} : review?.actionChecks?.[action] || {};
}
function g2wmSearchPageChecked(page, workspace = state, action = "prepare") {
  const saved = g2wmSearchChecks(action, workspace)[g2wmSearchPageKey(page)];
  return saved?.checked === true && saved.url === page.url && saved.name === page.name;
}
function g2wmSearchCheckedCount(pages = g2wmSearchPages(), workspace = state, action = "prepare") {
  const checks = g2wmSearchChecks(action, workspace);
  return pages.filter(page => {
    const saved = checks[g2wmSearchPageKey(page)];
    return saved?.checked === true && saved.url === page.url && saved.name === page.name;
  }).length;
}
function g2wmSearchCanComplete(workspace = state) {
  const pages = g2wmSearchPages(workspace);
  return pages.length > 0 && pages.some(page => page.group === "fixed" && page.id === "home" && page.publicUrl) &&
    G2WM_SEARCH_ACTIONS.filter(action => action.required).every(action =>
      g2wmSearchCheckedCount(pages, workspace, action.id) === pages.length);
}
function g2wmSearchHasProgress(workspace = state) {
  const pages = g2wmSearchPages(workspace);
  return G2WM_SEARCH_ACTIONS.some(action => g2wmSearchCheckedCount(pages, workspace, action.id) > 0);
}
function g2wmSearchFilter(page, pages) {
  if (!page.publicUrl) return "";
  const parsed = new URL(page.publicUrl);
  const path = parsed.pathname.replace(/^\/+|\/+$/g, "") + parsed.search;
  if (!path || pages.filter(item => item.publicUrl && item.publicUrl.includes(path)).length !== 1)
    return page.publicUrl;
  return path;
}

function g2wmSearchPagesHtml(pages, workspace = state, action = "prepare") {
  const checked = g2wmSearchCheckedCount(pages, workspace, action);
  const disabled = g2ServiceBlockApplicability(G2WM_CONFIG, "", workspace) === "not_needed";
  const actionDef = G2WM_SEARCH_ACTIONS.find(item => item.id === action);
  const check = page => `<label class="g2wm-search-check"><input type="checkbox" data-g2wm-search-check data-g2wm-search-action="${action}" data-g2wm-url-group="${escapeAttr(page.group)}" data-g2wm-url-id="${escapeAttr(page.id)}" aria-label="${escapeAttr(actionDef.title)} — выполнено: ${escapeAttr(page.name)}" ${g2wmSearchPageChecked(page, workspace, action) ? "checked" : ""} ${disabled ? "disabled" : ""}><span>Выполнено</span></label>`;
  if (action !== "prepare") {
    let previousSection = "";
    const rows = pages.map(page => {
      const detail = action === "search" && page.publicUrl ? `url:${page.publicUrl}` : page.publicUrl || page.url;
      const group = page.section === "commercial" && previousSection !== "commercial"
        ? `<li class="g2wm-search-group-label">${escapeHtml(G2WM_SEARCH_PAGE_SECTIONS[2].title)}</li>` : "";
      previousSection = page.section;
      return `${group}<li data-g2wm-page-group="${escapeAttr(page.group)}" data-g2wm-page-id="${escapeAttr(page.id)}" data-g2wm-page-section="${escapeAttr(page.section)}"><span><strong>${escapeHtml(page.name)}</strong><small>${detail ? escapeHtml(detail) : "URL не заполнен"}</small></span>${check(page)}</li>`;
    }).join("");
    return `<section class="g2wm-search-stage" data-g2wm-search-pages data-g2wm-search-action="${action}"><h5>Страницы выбранного проекта для проверки</h5>
      <p>${escapeHtml(actionDef.title)}${actionDef.required ? "" : " · при необходимости"}</p>
      <p data-g2wm-search-progress>Выполнено для ${checked} из ${pages.length} страниц</p>
      <details><summary>Показать страницы и отметки</summary><ul>${rows}</ul></details></section>`;
  }
  let previousSection = "";
  const rows = pages.map(page => {
    const address = `<div class="g2wm-search-address">${page.publicUrl
      ? `<a href="${escapeAttr(page.publicUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(page.url)}</a>`
      : `<span>${page.url ? escapeHtml(page.url) : "URL не заполнен"}</span> <button type="button" data-g2wm-platform-url data-g2wm-url-group="${escapeAttr(page.group)}" data-g2wm-url-id="${escapeAttr(page.id)}">Открыть Платформу →</button>`}</div>`;
    const goal = page.technical ? "Определить, должна ли быть в поиске"
      : page.anchor ? "Определить основной URL"
      : page.publicUrl ? "Проверить опубликованный адрес" : "Проверить публикацию; при необходимости указать URL";
    const filter = g2wmSearchFilter(page, pages);
    const group = page.section === "commercial" && previousSection !== "commercial"
      ? `<tr class="g2wm-search-group-row"><th colspan="6">${escapeHtml(G2WM_SEARCH_PAGE_SECTIONS[2].title)}</th></tr>` : "";
    previousSection = page.section;
    return `${group}<tr data-g2wm-page-group="${escapeAttr(page.group)}" data-g2wm-page-id="${escapeAttr(page.id)}" data-g2wm-page-section="${escapeAttr(page.section)}"><td data-label="Страница">${escapeHtml(page.name)}</td><td data-label="Тип">${escapeHtml(page.type)}</td><td data-label="Адрес">${address}</td><td data-label="Фильтр">${filter ? `<code>${escapeHtml(filter)}</code>` : "После заполнения URL"}</td><td data-label="Что сверить">${escapeHtml(goal)}</td><td data-label="Действие">${check(page)}</td></tr>`;
  }).join("");
  return `<section class="g2wm-indexing-urls" data-g2wm-search-pages data-g2wm-search-action="prepare"><h5>Страницы выбранного проекта для проверки</h5>
    <p data-g2wm-search-progress>Выполнено для ${checked} из ${pages.length} страниц</p>
    <div class="g2wm-indexing-table-scroll"><table><thead><tr><th>Страница</th><th>Тип</th><th>Адрес</th><th>Строка для фильтра</th><th>Что сверить</th><th>Действие</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p>Список берётся из Платформы выбранного проекта: главная страница, контакты, коммерческие страницы (каталог и категории), «О нас» и блог. Отмечайте «Выполнено» после действия для каждой страницы; если URL отсутствует, сначала выясните, опубликована ли она. Для завершения шага нужны отметки в подготовке, открытии Вебмастера, проверке результата и фиксации. История изменений и Поиск Яндекса используются при необходимости.</p></section>`;
}

function g2wmSearchGuideHtml(workspace = state) {
  const pages = g2wmSearchPages(workspace);
  const home = pages.find(page => page.group === "fixed" && page.id === "home")?.publicUrl || "";
  const published = pages.filter(page => page.publicUrl && !page.anchor);
  const missing = pages.filter(page => !page.publicUrl);
  let markdown = G2WM_SEARCH_PAGES_MARKDOWN;
  markdown = markdown.replace("Проверить, что приоритетные страницы опубликованного сайта присутствуют в поисковой базе Яндекса.",
    "Проверить присутствие страниц опубликованного сайта из списка проекта в поисковой базе Яндекса.")
    .replace("**Целевое действие:** подтвердить фактическое присутствие каждой приоритетной страницы проекта в поиске Яндекса.",
      "**Целевое действие:** сверить фактическое состояние каждой страницы из списка проекта в поиске Яндекса.")
    .replace("**Ожидаемый результат:** получено подтверждение индексации обязательных страниц, определены отсутствующие URL.",
      "**Ожидаемый результат:** проверены все страницы из списка проекта и определены отсутствующие URL.");
  markdown = markdown.replace("2. Определите опубликованные страницы, которые должны привлекать органический поисковый трафик: главную, основные категории, товары, услуги и приоритетные посадочные страницы.",
    "2. Используйте страницы Платформы в таком порядке: главная, контакты, коммерческие страницы (каталог и категории), «О нас / история бренда», блог.")
    .replace("5. Исключите технические страницы и другие URL, для которых индексирование намеренно не предусмотрено.",
      "5. Служебные и другие страницы вне этого списка проверяйте в соответствующих шагах проекта.")
    .replace("3. Скопируйте полные URL этих страниц.",
      "3. Используйте полные URL опубликованных страниц из списка проекта. Для страниц без адреса сначала выясните, опубликованы ли они.")
    .replace("4. Откройте каждый URL в браузере и убедитесь, что он ведёт на нужную страницу.",
      "4. Откройте каждый опубликованный URL в браузере и убедитесь, что он ведёт на нужную страницу.")
    .replace("Для каждой приоритетной страницы зафиксируйте:", "Для каждой страницы из списка проекта зафиксируйте:")
    .replace("| Проверяемые страницы | Соответствуют приоритетным URL проекта |",
      "| Проверяемые страницы | Совпадают со списком выбранного проекта с указанными исключениями |")
    .replace("- Проверены все обязательные приоритетные страницы проекта.",
      "- Проверены все страницы из списка выбранного проекта.")
    .replace("- Присутствие каждой из них в поиске Яндекса подтверждено.",
      "- Для страниц из списка подтверждено присутствие в поиске либо зафиксирована причина отсутствия.")
    .replace("- **Основной критерий:** присутствие обязательных URL в поисковой базе.",
      "- **Основной критерий:** присутствие страниц из списка проекта в поисковой базе.")
    .replace("**После подтверждения индексации всех обязательных страниц можно завершить шаг 3.1 и перейти к 3.2.**",
      "**После сверки всех страниц из списка проекта можно завершить шаг 3.1 и перейти к 3.2.**");
  markdown = g2wmIndexingReplaceSection(markdown,
    "**Пример для проекта «Коричное яблоко»:**", "Проверяемые URL должны определяться",
    "G2WM_SEARCH_PAGE_LIST_PREPARE\n\n");
  markdown = markdown.replace("   Например:\n\n   `simvol-2027-koza`",
    "   Для каждой опубликованной страницы используйте её строку из колонки «Строка для фильтра» в списке выше. Если URL отсутствует, проверьте публикацию страницы и при необходимости укажите адрес в Платформе.");
  markdown = markdown.replace("- `@simvol-2027-koza` означает, что URL содержит указанную строку.\n- `~simvol-2027-koza` означает поиск по регулярному выражению.",
    "- `@` перед строкой из списка означает поиск URL, содержащего эту строку.\n- `~` перед выражением означает поиск по регулярному выражению.");
  markdown = markdown.replace("Не изменяйте robots.txt, canonical или настройки Tilda непосредственно в этом шаге.",
    "Не изменяйте robots.txt, canonical или настройки платформы сайта непосредственно в этом шаге.");
  markdown = g2wmIndexingReplaceSection(markdown,
    "**Пример из проверки `k-apple.ru`:**", "Однако «Последние изменения» являются историей событий.",
    "Изучайте фактические даты и статусы выбранного URL в Вебмастере. Последнее отображаемое изменение не подтверждает текущее состояние само по себе.\n\n");
  markdown = markdown.replace("   **Пример:**\n\n   `url:https://k-apple.ru/simvol-2027-koza`",
    "   Для каждой страницы подставьте полный опубликованный адрес из списка выше после `url:`.");
  markdown = g2wmIndexingReplaceSection(markdown,
    "### Подтверждённый результат для проекта «Коричное яблоко»", "### Результат для аналитики",
    `### Данные выбранного проекта\n\n| Параметр | Значение из GURU |\n|---|---|\n| Проект | ${workspace?.project?.name || "Не указан"} |\n| Основной сайт | ${home || "URL не заполнен"} |\n| Страниц в списке | ${pages.length} |\n| Опубликованных URL | ${published.length} |\n| Страниц без опубликованного URL | ${missing.length} |\n| Присутствие в поиске Яндекса | Проверить в Яндекс Вебмастере или Поиске Яндекса |\n\nСохранённые адреса показывают, какие страницы нужно сверить. Наличие страницы в поисковой базе нельзя вывести только из данных Платформы.\n\n`);
  markdown = markdown.replace("- Обязательная страница подтверждённо исключена из поиска.",
      "- Страница, предназначенная для поиска, подтверждённо исключена из него.");
  markdown = markdown.replace("### В. Найти конкретную страницу",
      "G2WM_SEARCH_PAGE_LIST_OPEN\n\n### В. Найти конкретную страницу")
    .replace("### Д. Если доступны только «Последние изменения»",
      "G2WM_SEARCH_PAGE_LIST_VERIFY\n\n### Д. Если доступны только «Последние изменения»")
    .replace("### Е. Альтернативная проверка через Поиск Яндекса",
      "G2WM_SEARCH_PAGE_LIST_HISTORY\n\n### Е. Альтернативная проверка через Поиск Яндекса")
    .replace("### Ж. Зафиксировать результаты",
      "G2WM_SEARCH_PAGE_LIST_SEARCH\n\n### Ж. Зафиксировать результаты")
    .replace("## 3. Сверка (инструкция)",
      "G2WM_SEARCH_PAGE_LIST_RECORD\n\n## 3. Сверка (инструкция)");
  let html = g2muVerbatimMarkdownHtml(markdown, "g2wm-search-copy", true);
  for (const action of G2WM_SEARCH_ACTIONS)
    html = html.replace(`<p>G2WM_SEARCH_PAGE_LIST_${action.id.toUpperCase()}</p>`, g2wmSearchPagesHtml(pages, workspace, action.id));
  return html;
}
