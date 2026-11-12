/* Webmaster 2.1: render project data from the existing Platform URL store. */
function g2wmIndexingPages(workspace = state) {
  const technical = new Set(["not_found", "thank_you", "privacy", "data_consent", "offer", "returns", "company_details"]);
  const seen = new Set();
  const pages = [];
  for (const page of megaPlatformAllPages(workspace)) {
    const url = String(page.url || "").trim();
    if (page.group === "fixed" && technical.has(page.id) && !url) continue;
    if (!url && page.group === "fixed" && !["home", "catalog", "contacts", "delivery", "about", "blog"].includes(page.id)) continue;
    let parsed = null;
    try { parsed = new URL(url); } catch (_) {}
    const editorUrl = parsed && ["tilda.cc", "www.tilda.cc"].includes(parsed.hostname.toLowerCase());
    const publicUrl = parsed && ["http:", "https:"].includes(parsed.protocol) && !editorUrl ? parsed.href : "";
    const anchor = Boolean(parsed?.hash);
    if (publicUrl && !anchor) {
      if (seen.has(publicUrl)) continue;
      seen.add(publicUrl);
    }
    if (publicUrl && anchor && seen.has(`${parsed.origin}${parsed.pathname}${parsed.search}`)) continue;
    const type = page.group === "categories" ? "Категория"
      : page.group === "products" ? "Товар"
      : page.group === "custom" ? page.id.startsWith("audit:") ? "Публикация или посадочная" : "Дополнительная страница"
      : page.id === "home" ? "Главная" : "Страница сайта";
    pages.push({ ...page, name: String(page.name || "Страница").trim(), type, url,
      publicUrl, anchor, technical: technical.has(page.id),
      purpose: technical.has(page.id) ? "Проверить обоснованность ограничения индексирования"
        : anchor ? "Раздел страницы; не отдельный URL для индексирования"
        : !publicUrl ? "Указать опубликованный URL в Платформе"
        : "Проверить HTTP-ответ, robots.txt и noindex" });
  }
  return pages;
}

function g2wmIndexingFingerprint(workspace = state) {
  return JSON.stringify([workspace?.project?.name || "", g2wPlatform(workspace),
    g2wmIndexingPages(workspace).map(({ group, id, name, url }) => [group, id, name, url])]);
}

function g2wmIndexingUrlsHtml(pages) {
  const rows = pages.map(page => {
    const url = page.publicUrl
      ? `<a href="${escapeAttr(page.publicUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(page.url)}</a>`
      : `<span>${page.url ? escapeHtml(page.url) : "URL не заполнен"}</span> <button type="button" data-g2wm-platform-url data-g2wm-url-group="${escapeAttr(page.group)}" data-g2wm-url-id="${escapeAttr(page.id)}">Открыть Платформу →</button>`;
    return `<tr><td>${escapeHtml(page.name)}</td><td>${escapeHtml(page.type)}</td><td>${url}</td><td>${escapeHtml(page.purpose)}</td></tr>`;
  }).join("");
  return `<section class="g2wm-indexing-urls" data-g2wm-indexing-urls><h5>Адреса страниц проекта для проверки</h5>${pages.length
    ? `<div class="g2wm-indexing-table-scroll"><table><thead><tr><th>Страница</th><th>Тип</th><th>Адрес</th><th>Назначение проверки</th></tr></thead><tbody>${rows}</tbody></table></div>`
    : '<p>В Платформе пока нет страниц для проверки.</p>'}
    <p>Данные берутся из Платформы выбранного проекта. Якорные ссылки не считаются отдельными страницами.</p></section>`;
}

function g2wmIndexingReplaceSection(markdown, start, end, replacement) {
  const from = markdown.indexOf(start), to = markdown.indexOf(end, from + start.length);
  return from < 0 || to < 0 ? markdown : markdown.slice(0, from) + replacement + markdown.slice(to);
}

function g2wmIndexingGuideHtml(workspace = state) {
  const pages = g2wmIndexingPages(workspace);
  const targets = pages.filter(page => page.publicUrl && !page.anchor && !page.technical);
  const missing = pages.filter(page => !page.publicUrl);
  const home = g2wmMainAddress(workspace);
  const platform = String(g2wPlatform(workspace) || "").trim();
  const isTilda = platform.toLowerCase() === "tilda";
  let markdown = G2WM_INDEXING_MARKDOWN;
  markdown = g2wmIndexingReplaceSection(markdown,
    "Пример для «Коричного яблока»:", "**Требования к автоматическому списку:**",
    "G2WM_PROJECT_URLS\n\n");
  markdown = markdown.replace(/Для проекта «Коричное яблоко»:\n\n`https:\/\/k-apple\.ru\/`/,
    `Для выбранного проекта:\n\n${home ? `\`${home}\`` : "URL не заполнен в Платформе"}`);
  markdown = g2wmIndexingReplaceSection(markdown,
    "Пример:\n\n`https://k-apple.ru/`", "При большом количестве адресов",
    "Используйте адреса из списка страниц выбранного проекта выше.\n\n");
  markdown = g2wmIndexingReplaceSection(markdown,
    "## Фактическое состояние проекта «Коричное яблоко»", "## Официальные источники",
    `## Данные выбранного проекта\n\n| Параметр | Значение из GURU |\n|---|---|\n| Проект | ${workspace?.project?.name || "Не указан"} |\n| Основной сайт | ${home || "URL не заполнен"} |\n| Платформа | ${platform || "Не указана"} |\n| Целевых URL для проверки | ${targets.length} |\n| Страниц без опубликованного URL | ${missing.length} |\n| HTTP-ответы, robots.txt и Meta Robots | Проверить в Яндекс Вебмастере |\n\n**Текущий результат:** определяется после проверки перечисленных адресов.\n\n`);
  markdown = markdown.replace("Использовать опубликованные адреса, а не ссылки на редактор Tilda.",
    "Использовать опубликованные адреса, а не ссылки на редактор сайта.");
  markdown = markdown.replace(/\*\*Особенность Tilda:\*\*[^\n]+/,
    "**Особенность платформы:** если каталог создаёт собственные URL товаров, берите их из опубликованного каталога или сохранённых данных, а не из названия товара.");
  markdown = markdown.replace(/\*\*Важно:\*\* Tilda автоматически формирует `robots\.txt`\.[^\n]+/,
    isTilda ? "**Важно:** Tilda автоматически формирует `robots.txt`. Не заменяйте весь файл пользовательским кодом ради исправления одного правила без проверки последствий."
      : "**Важно:** меняйте правила `robots.txt` только после подтверждения причины и оценки последствий для всего сайта.");
  markdown = markdown.replace("7. Если изменялась Tilda, опубликуйте соответствующие страницы.",
    "7. Если настройки менялись в платформе сайта, опубликуйте соответствующие страницы.");
  if (!isTilda) {
    markdown = g2wmIndexingReplaceSection(markdown,
      "### Ж. Исправить ошибочный noindex на Tilda", "### З. Проверить общий запрет индексирования сайта",
      "### Ж. Исправить ошибочный noindex\n\nВыполняйте только при подтверждённом нежелательном запрете. Откройте настройки SEO проблемной страницы в используемой платформе, снимите запрет индексирования, сохраните и опубликуйте страницу. Затем повторите анализ в Яндекс Вебмастере. Не добавляйте `index, follow` вручную без необходимости.\n\n");
    markdown = g2wmIndexingReplaceSection(markdown,
      "### З. Проверить общий запрет индексирования сайта", "### И. Проверить товарные страницы интернет-магазина",
      "### З. Проверить общий запрет индексирования сайта\n\nПри массовых проблемах проверьте настройки индексации всего сайта в используемой платформе. Для публичного сайта, предназначенного для поиска, общий запрет должен быть выключен. Изменяйте настройку только при подтверждённой ошибке, затем опубликуйте сайт и повторите проверку. Не открывайте закрытый или тестовый сайт без решения владельца.\n\n");
    markdown = g2wmIndexingReplaceSection(markdown,
      "### И. Проверить товарные страницы интернет-магазина", "### К. Индивидуально проверить проблемные URL",
      "### И. Проверить товарные страницы интернет-магазина\n\nВыполняйте, если проект продаёт товары и у них есть самостоятельные опубликованные URL. Используйте фактические адреса товаров из Платформы. Проверьте, что товар опубликован и открывается по указанному адресу. При проблеме проверьте HTTP-ответ и ограничения индексирования в Яндекс Вебмастере. URL не формируйте из названия товара. Полноту Sitemap проверяйте на этапе 2.2.\n\n");
    markdown = markdown.replace(/\*\*Tilda, SEO и индексация:\*\*[\s\S]*$/, "");
  }
  const html = g2muVerbatimMarkdownHtml(markdown, "g2wm-indexing-copy", true);
  return html.replace("<p>G2WM_PROJECT_URLS</p>", g2wmIndexingUrlsHtml(pages));
}

document.addEventListener("click", event => {
  const button = event.target?.closest?.('[data-g2sb-id="company-webmaster"] [data-g2wm-platform-url]');
  if (!button) return;
  const group = button.dataset.g2wmUrlGroup, id = button.dataset.g2wmUrlId;
  guruNavigateToGate("gate-0");
  let attempts = 0;
  const reveal = () => {
    const input = document.querySelector(`[data-mega-url-group="${CSS.escape(group)}"][data-mega-url-id="${CSS.escape(id)}"]`);
    if (input) {
      gate0RevealSectionForNode(input.closest(".mega-platform-section") || input);
      input.scrollIntoView({ block: "center" });
      input.focus({ preventScroll: true });
    } else if (++attempts < 16) requestAnimationFrame(reveal);
  };
  requestAnimationFrame(reveal);
});
