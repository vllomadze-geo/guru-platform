/* Webmaster 2.2: read the existing technical SEO record migrated into Gate 2. */
function g2wmSitemapData(workspace = state) {
  const stored = g2SeoStore("company-webmaster", "", workspace)?.cards?.["card-14"];
  const archived = workspace?.gates?.find(gate => gate.id === "gate-1")?.cards?.find(card => card.id === "card-14");
  const card = stored?.robotsV130 ? stored : archived;
  const robots = card?.robotsV130 || {};
  const saved = Array.isArray(robots.yandex?.sitemaps) ? robots.yandex.sitemaps : [];
  const rows = saved.map((row, index) => ({ index, url: String(row?.url || "").trim(),
    status: String(row?.status || "").trim(), source: "gate1" }));
  const legacy = String(workspace?.gate1WebmasterV295?.company?.sitemapUrl || "").trim();
  if (legacy && !rows.some(row => row.url)) rows.push({ index: -1, url: legacy, status: "", source: "legacy" });
  for (const row of rows) {
    try {
      const parsed = new URL(row.url);
      row.publicUrl = ["http:", "https:"].includes(parsed.protocol) &&
        !["tilda.cc", "www.tilda.cc"].includes(parsed.hostname.toLowerCase()) ? parsed.href : "";
    } catch (_) { row.publicUrl = ""; }
  }
  const unique = [];
  const seen = new Set();
  for (const row of rows) {
    if (row.publicUrl && seen.has(row.publicUrl)) continue;
    if (row.publicUrl) seen.add(row.publicUrl);
    unique.push(row);
  }
  const robotsUrl = String(robots.url || card?.robotsUnified?.url || "").trim();
  let publicRobotsUrl = "";
  try {
    const parsed = new URL(robotsUrl);
    if (["http:", "https:"].includes(parsed.protocol)) publicRobotsUrl = parsed.href;
  } catch (_) {}
  return { rows: unique, robotsUrl, publicRobotsUrl };
}

function g2wmSitemapFingerprint(workspace = state) {
  const data = g2wmSitemapData(workspace);
  return JSON.stringify([g2wmIndexingFingerprint(workspace), data.robotsUrl,
    data.rows.map(row => [row.url, row.status])]);
}

function g2wmSitemapFilesHtml(data) {
  const status = value => ({ ok: "OK", error: "Ошибка", pending: "Ожидание" })[value] || "Не указан";
  const fileRows = data.rows.map((row, position) => {
    const name = row.publicUrl && /\/sitemap\.xml$/i.test(new URL(row.publicUrl).pathname)
      ? "Основной Sitemap" : `Сохранённый Sitemap ${position + 1}`;
    const url = row.publicUrl
      ? `<a href="${escapeAttr(row.publicUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.url)}</a>`
      : row.url ? escapeHtml(row.url) : "URL не заполнен";
    return `<tr><td>${escapeHtml(name)}</td><td>${url}</td><td>${escapeHtml(status(row.status))}</td></tr>`;
  });
  const robotsUrl = data.publicRobotsUrl
    ? `<a href="${escapeAttr(data.publicRobotsUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(data.robotsUrl)}</a>`
    : data.robotsUrl ? escapeHtml(data.robotsUrl) : "URL не заполнен";
  fileRows.push(`<tr><td>Правила обхода · robots.txt</td><td>${robotsUrl}</td><td>Проверить ссылки на Sitemap</td></tr>`);
  return `<section class="g2wm-indexing-urls" data-g2wm-sitemap-files><h5>Sitemap проекта для проверки</h5>
    <div class="g2wm-indexing-table-scroll"><table><thead><tr><th>Назначение</th><th>Файл из системы</th><th>Сохранённый статус</th></tr></thead><tbody>${fileRows.join("")}</tbody></table></div>
    <p>Статус взят из сохранённой технической проверки и может устареть. Вложенные файлы берите из опубликованного XML; приложение не угадывает их адреса.</p></section>`;
}

function g2wmSitemapPagesHtml(pages) {
  const rows = pages.map(page => {
    const url = page.publicUrl
      ? `<a href="${escapeAttr(page.publicUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(page.url)}</a>`
      : `${page.url ? escapeHtml(page.url) : "URL не заполнен"} <button type="button" data-g2wm-platform-url data-g2wm-url-group="${escapeAttr(page.group)}" data-g2wm-url-id="${escapeAttr(page.id)}">Открыть Платформу →</button>`;
    return `<tr><td>${escapeHtml(page.name)}</td><td>${escapeHtml(page.technical ? "Служебная" : page.type)}</td><td>${url}</td></tr>`;
  }).join("");
  return `<section class="g2wm-indexing-urls" data-g2wm-sitemap-pages><h5>Целевые страницы проекта из шага 2.1</h5>
    <div class="g2wm-indexing-table-scroll"><table><thead><tr><th>Страница</th><th>Тип</th><th>Адрес</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p>Служебные страницы сверяйте отдельно: их присутствие в Sitemap зависит от назначения.</p></section>`;
}

function g2wmSitemapGuideHtml(workspace = state) {
  const data = g2wmSitemapData(workspace), pages = g2wmIndexingPages(workspace);
  const validMaps = data.rows.filter(row => row.publicUrl);
  const targets = pages.filter(page => page.publicUrl && !page.anchor && !page.technical);
  const home = g2wmMainAddress(workspace);
  const homePublic = pages.find(page => page.group === "fixed" && page.id === "home")?.publicUrl || "";
  const platform = String(g2wPlatform(workspace) || "").trim();
  const isTilda = platform.toLowerCase() === "tilda";
  const primary = validMaps.find(row => /\/sitemap\.xml$/i.test(new URL(row.publicUrl).pathname)) || validMaps[0];
  let markdown = G2WM_SITEMAP_MARKDOWN;
  markdown = g2wmIndexingReplaceSection(markdown,
    "Для «Коричного яблока»:", "Адреса дополнительных карт необходимо получать",
    "G2WM_SITEMAP_FILES\n\n");
  markdown = markdown.replace("Если URL отсутствует, показывать «URL не заполнен» и переход к существующему месту ввода.",
    "Если URL отсутствует, показывать «URL не заполнен» и переход к существующему месту ввода.\n\nG2WM_SITEMAP_PAGES");
  markdown = markdown.replace("Пример:\n\n`https://k-apple.ru/sitemap.xml`",
    `Адрес из выбранного проекта:\n\n${primary ? `\`${primary.url}\`` : "URL Sitemap не сохранён в проекте"}`);
  markdown = g2wmIndexingReplaceSection(markdown,
    "**Для «Коричного яблока»:**", "**Часть 3. Проверить структуру**",
    "Если файл является индексом, возьмите адреса вложенных карт из его элементов `loc` и проверьте каждый опубликованный файл. Не выводите количество статей из названия файла.\n\n");
  markdown = markdown.replace("https://example.ru/</loc>", `${homePublic || "URL_СТРАНИЦЫ"}</loc>`)
    .replace("https://example.ru/sitemap-articles.xml</loc>", "URL_ВЛОЖЕННОГО_SITEMAP</loc>");
  markdown = markdown.replace("Для «Коричного яблока»:\n\n`https://k-apple.ru/sitemap-store.xml`",
    "Откройте товарную карту из списка сохранённых файлов выше, если она существует.");
  markdown = markdown.replace("Для «Коричного яблока» используется блок **FD101N**, подключённый к потоку «Блог».",
    "Проверяйте связь опубликованного потока со страницей публикаций по фактическим настройкам проекта.");
  markdown = markdown.replaceAll("`sitemap-feeds.xml`", "индекс Sitemap публикаций");
  markdown = markdown.replace(/\*\*Ограничение Tilda:\*\*[^\n]+\n\nЭто ограничение генератора Tilda\. Яндекс поддерживает Sitemap большего размера\./,
    "**Ограничения генератора:** сверяйте актуальные лимиты в справке используемой платформы.");
  markdown = g2wmIndexingReplaceSection(markdown,
    "**Срок обработки:** обычно до двух недель", "Не используйте лимит ускоренных проверок без необходимости.",
    "**Срок обработки:** зависит от очереди и текущего состояния Яндекс Вебмастера. Сверяйте дату последней загрузки и результат повторной проверки. Если доступен ускоренный переобход, используйте его только для действительно изменённого файла.\n\n");
  const directives = validMaps.map(row => `Sitemap: ${row.url}`).join("\n");
  markdown = markdown.replace(/Пример:\n\n```text\nSitemap: https:\/\/example\.ru\/sitemap\.xml\nSitemap: https:\/\/example\.ru\/sitemap-store\.xml\n```/,
    directives ? `Адреса из сохранённого списка для сверки с robots.txt:\n\n\`\`\`text\n${directives}\n\`\`\``
      : "Сверьте директивы `Sitemap:` в robots.txt с опубликованными файлами. URL карт пока не сохранены в проекте.");
  const examplePath = targets.find(page => page.group === "categories" || page.group === "products")?.publicUrl || targets[0]?.publicUrl;
  let pathname = "";
  if (examplePath) pathname = new URL(examplePath).pathname;
  markdown = markdown.replace("Например:\n\n`/novogodnie-podarki-2027`",
    pathname ? `Например, путь сохранённого URL проекта:\n\n\`${pathname}\``
      : "Введите путь опубликованной страницы из списка проекта выше.");
  markdown = g2wmIndexingReplaceSection(markdown,
    "## Фактическое состояние проекта «Коричное яблоко»", "## Официальные источники",
    `## Данные выбранного проекта\n\n| Параметр | Значение из GURU |\n|---|---|\n| Проект | ${workspace?.project?.name || "Не указан"} |\n| Основной сайт | ${home || "URL не заполнен"} |\n| Платформа | ${platform || "Не указана"} |\n| Сохранённых Sitemap | ${validMaps.length} |\n| URL целевых страниц | ${targets.length} |\n| robots.txt | ${data.robotsUrl || "URL не заполнен"} |\n| Текущий HTTP-ответ и XML | Проверить по опубликованным файлам |\n| Текущая обработка Яндексом | Проверить в Яндекс Вебмастере |\n\nСохранённые статусы файлов могут отражать предыдущую загрузку. Решение по шагу принимайте после проверки текущих файлов и дат обработки.\n\n`);
  if (!isTilda) {
    markdown = g2wmIndexingReplaceSection(markdown,
      "### В. Проверить автоматическую генерацию Sitemap в Tilda", "### Г. Проверить товарный Sitemap",
      "### В. Проверить генерацию Sitemap в используемой платформе\n\nОткройте настройки SEO или карты сайта своей платформы. Если Sitemap создаётся автоматически и опубликованный файл работает, сохраняйте этот режим. При ручной генерации проверьте, кто обновляет XML после публикации и изменения URL. Меняйте способ генерации только при подтверждённой проблеме.\n\n");
    markdown = g2wmIndexingReplaceSection(markdown,
      "### Г. Проверить товарный Sitemap", "### Д. Проверить Sitemap публикаций",
      "### Г. Проверить товарный Sitemap\n\nВыполняйте, если проект использует каталог и товары имеют собственные опубликованные URL. Найдите товарную карту среди сохранённых или опубликованных файлов, затем сравните элементы `loc` с адресами товаров из Платформы. Если карты нет, проверьте настройки каталога и публикации в своей платформе. Не создавайте дубли страниц ради Sitemap.\n\n");
    markdown = g2wmIndexingReplaceSection(markdown,
      "### Д. Проверить Sitemap публикаций", "### Е. Проверить ссылки на Sitemap в robots.txt",
      "### Д. Проверить Sitemap публикаций\n\nВыполняйте, если проект публикует статьи через CMS. Проверьте опубликованный статус статей и отсутствие нежелательного запрета индексирования. Найдите карту публикаций среди фактических файлов сайта; если это индекс, откройте вложенные URL из `loc`. Сверьте их с адресами статей, сохранёнными в Платформе. Не отключайте работающую CMS ради старого предупреждения Вебмастера.\n\n");
    markdown = markdown.replace(/\*\*Tilda, автоматическая генерация Sitemap:\*\*[\s\S]*$/, "");
  }
  const snippets = [];
  markdown = markdown.replace(/```(?:xml|text)\n([\s\S]*?)\n```/g, (_match, body) => {
    const token = `G2WM_SITEMAP_CODE_${snippets.length}`;
    snippets.push({ token, body });
    return token;
  });
  let html = g2muVerbatimMarkdownHtml(markdown, "g2wm-sitemap-copy", true)
    .replace("<p>G2WM_SITEMAP_FILES</p>", g2wmSitemapFilesHtml(data))
    .replace("<p>G2WM_SITEMAP_PAGES</p>", g2wmSitemapPagesHtml(pages));
  for (const { token, body } of snippets)
    html = html.replace(`<p>${token}</p>`, `<pre><code>${escapeHtml(body)}</code></pre>`);
  return html;
}
