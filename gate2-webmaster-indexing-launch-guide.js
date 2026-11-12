/* Webmaster 3.4: published indexable pages, saved Sitemap and Metrika data. */
const G2WM_LAUNCH_ACTIONS = Object.freeze([
  { id: "sitemap", title: "А. Сверить страницы с Sitemap", required: true },
  { id: "decide", title: "В. Определить необходимость переобхода", required: true },
  { id: "submit", title: "В. Отправить страницу на переобход", optional: true },
  { id: "verify", title: "Д. Проверить результат переобхода", optional: true },
  { id: "diagnose", title: "Е. Проверить отсутствующую страницу", optional: true },
]);
const G2WM_LAUNCH_STORAGE_PREFIX = "guru-platform-webmaster-launch-v1-";
const g2wmLaunchHydrated = new WeakMap();

function g2wmLaunchHydrate(workspace = state) {
  const projectId = workspace?.project?.id;
  if (!projectId) return;
  let raw = null;
  try { raw = localStorage.getItem(G2WM_LAUNCH_STORAGE_PREFIX + projectId); }
  catch (_) { return; }
  if (!raw || g2wmLaunchHydrated.get(workspace) === raw) return;
  g2wmLaunchHydrated.set(workspace, raw);
  let saved = null;
  try { saved = JSON.parse(raw); } catch (_) { return; }
  const version = Number(saved?.updatedAt) || 0;
  if (!version) return;
  const current = g2wmReviews(workspace).s34;
  if (version <= (Number(current?.checksUpdatedAt) || 0)) return;
  const review = g2wmReviews(workspace, true).s34 ||= {};
  review.pageChecks = saved.pageChecks && typeof saved.pageChecks === "object" ? saved.pageChecks : {};
  review.actionChecks = saved.actionChecks && typeof saved.actionChecks === "object" ? saved.actionChecks : {};
  review.checksUpdatedAt = version;
}
function g2wmLaunchSaveChecks(workspace = state) {
  const projectId = workspace?.project?.id;
  const review = g2wmReviews(workspace).s34;
  if (!projectId || !review) return;
  review.checksUpdatedAt = Math.max(Date.now(), (Number(review.checksUpdatedAt) || 0) + 1);
  try {
    const raw = JSON.stringify({ updatedAt: review.checksUpdatedAt,
      pageChecks: review.pageChecks || {}, actionChecks: review.actionChecks || {} });
    localStorage.setItem(G2WM_LAUNCH_STORAGE_PREFIX + projectId, raw);
    g2wmLaunchHydrated.set(workspace, raw);
  } catch (_) {
    // The project save still runs if localStorage has no room for this snapshot.
  }
}
const G2WM_LAUNCH_PAGE_SECTIONS = Object.freeze([
  { id: "home", title: "Главная страница" },
  { id: "contacts", title: "Контакты" },
  { id: "commercial", title: "Коммерческие страницы (Категория)" },
  { id: "about", title: "О нас / история бренда" },
  { id: "blog", title: "Блог" },
  { id: "products", title: "Товары" },
  { id: "other", title: "Другие опубликованные страницы" },
]);
function g2wmLaunchPageSection(page) {
  if (page.group === "categories" || page.group === "fixed" && page.id === "catalog") return "commercial";
  if (page.group === "products") return "products";
  if (page.group === "fixed" && ["home", "contacts", "about", "blog"].includes(page.id)) return page.id;
  return "other";
}
function g2wmLaunchPages(workspace = state) {
  g2wmLaunchHydrate(workspace);
  return g2wmIndexingPages(workspace)
    .filter(page => page.publicUrl && !page.anchor && !page.technical)
    .map(page => ({ ...page, section: g2wmLaunchPageSection(page) }))
    .sort((left, right) => G2WM_LAUNCH_PAGE_SECTIONS.findIndex(item => item.id === left.section) -
      G2WM_LAUNCH_PAGE_SECTIONS.findIndex(item => item.id === right.section));
}
function g2wmLaunchPriorityPages(workspace = state) {
  g2wmLaunchHydrate(workspace);
  return g2wmSearchPages(workspace).filter(page => page.publicUrl && !page.anchor);
}
function g2wmLaunchFingerprint(workspace = state) {
  const sitemap = g2wmSitemapData(workspace);
  const maps = sitemap.rows.map(row => [row.url, row.status]);
  return JSON.stringify([workspace?.project?.name || "", g2wPlatform(workspace),
    g2wCompanyValue("counterId", workspace), sitemap.robotsUrl, maps,
    g2wmLaunchPages(workspace).map(page => [page.group, page.id, page.name, page.url]),
    g2wmLaunchPriorityPages(workspace).map(page => [page.group, page.id, page.name, page.url])]);
}
function g2wmLaunchChecks(action = "sitemap", workspace = state) {
  const review = g2wmReviews(workspace).s34;
  return action === "sitemap" ? review?.pageChecks || {} : review?.actionChecks?.[action] || {};
}
function g2wmLaunchPageChecked(page, workspace = state, action = "sitemap") {
  const saved = g2wmLaunchChecks(action, workspace)[g2wmSearchPageKey(page)];
  return saved?.checked === true && saved.url === page.url && saved.name === page.name;
}
function g2wmLaunchCheckedCount(pages, workspace = state, action = "sitemap") {
  return pages.filter(page => g2wmLaunchPageChecked(page, workspace, action)).length;
}
function g2wmLaunchCanComplete(workspace = state) {
  const pages = g2wmLaunchPages(workspace);
  const priority = g2wmLaunchPriorityPages(workspace);
  const maps = g2wmSitemapData(workspace).rows.filter(row => row.publicUrl);
  const counterId = String(g2wCompanyValue("counterId", workspace) || "").trim();
  return pages.some(page => page.group === "fixed" && page.id === "home") && maps.length > 0 &&
    /^\d+$/.test(counterId) && pages.every(page => g2wmLaunchPageChecked(page, workspace, "sitemap")) &&
    priority.every(page => g2wmLaunchPageChecked(page, workspace, "decide") &&
      (!g2wmLaunchPageChecked(page, workspace, "submit") || g2wmLaunchPageChecked(page, workspace, "verify")));
}
function g2wmLaunchHasProgress(workspace = state) {
  const pages = g2wmLaunchPages(workspace), priority = g2wmLaunchPriorityPages(workspace);
  return g2wmLaunchCheckedCount(pages, workspace, "sitemap") > 0 ||
    G2WM_LAUNCH_ACTIONS.slice(1).some(action => g2wmLaunchCheckedCount(priority, workspace, action.id) > 0);
}
function g2wmLaunchCheckHtml(page, workspace, action) {
  const definition = G2WM_LAUNCH_ACTIONS.find(item => item.id === action);
  const disabled = g2ServiceBlockApplicability(G2WM_CONFIG, "", workspace) === "not_needed";
  return `<label class="g2wm-search-check"><input type="checkbox" data-g2wm-launch-check data-g2wm-launch-action="${action}"
    data-g2wm-url-group="${escapeAttr(page.group)}" data-g2wm-url-id="${escapeAttr(page.id)}"
    aria-label="${escapeAttr(definition.title)} — выполнено: ${escapeAttr(page.name)}"
    ${g2wmLaunchPageChecked(page, workspace, action) ? "checked" : ""} ${disabled ? "disabled" : ""}><span>${action === "submit" ? "Отправлено" : "Выполнено"}</span></label>`;
}
function g2wmLaunchStageHtml(pages, workspace = state, action = "sitemap") {
  let previousSection = "";
  if (action === "sitemap") {
    const rows = pages.map(page => {
      const group = ["commercial", "products", "other"].includes(page.section) && previousSection !== page.section
        ? `<tr class="g2wm-search-group-row"><th colspan="4">${escapeHtml(G2WM_LAUNCH_PAGE_SECTIONS.find(item => item.id === page.section).title)}</th></tr>` : "";
      previousSection = page.section;
      return `${group}<tr data-g2wm-page-group="${escapeAttr(page.group)}" data-g2wm-page-id="${escapeAttr(page.id)}"
        data-g2wm-page-section="${escapeAttr(page.section)}"><td data-label="Страница">${escapeHtml(page.name)}</td>
        <td data-label="Тип">${escapeHtml(page.type)}</td><td data-label="Адрес"><a href="${escapeAttr(page.publicUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(page.url)}</a></td>
        <td data-label="Действие">${g2wmLaunchCheckHtml(page, workspace, "sitemap")}</td></tr>`;
    }).join("");
    return `<section class="g2wm-indexing-urls" data-g2wm-launch-pages data-g2wm-launch-action="sitemap">
      <h5>Все опубликованные страницы проекта для сверки с Sitemap</h5>
      <p data-g2wm-launch-progress="sitemap">Выполнено для ${g2wmLaunchCheckedCount(pages, workspace, "sitemap")} из ${pages.length} страниц</p>
      <div class="g2wm-indexing-table-scroll"><table><thead><tr><th>Страница</th><th>Тип</th><th>Адрес</th><th>Действие</th></tr></thead>
      <tbody>${rows}</tbody></table></div><p>Список берётся из опубликованных URL Платформы: служебные страницы и якорные ссылки исключены. Проверьте каждый URL в фактических XML-файлах сайта. Отсутствующий URL сначала разберите в шаге 2.2.</p></section>`;
  }
  const rows = pages.map(page => {
    const group = page.section === "commercial" && previousSection !== "commercial"
      ? `<li class="g2wm-search-group-label">Коммерческие страницы (Категория)</li>` : "";
    previousSection = page.section;
    const controls = action === "decide"
      ? `${g2wmLaunchCheckHtml(page, workspace, "decide")}${g2wmLaunchCheckHtml(page, workspace, "submit")}`
      : g2wmLaunchCheckHtml(page, workspace, action);
    return `${group}<li data-g2wm-page-group="${escapeAttr(page.group)}" data-g2wm-page-id="${escapeAttr(page.id)}"
      data-g2wm-page-section="${escapeAttr(page.section)}"><span><strong>${escapeHtml(page.name)}</strong>
      <small>${escapeHtml(page.publicUrl)}</small></span><span class="g2wm-launch-actions">${controls}</span></li>`;
  }).join("");
  const progress = action === "decide"
    ? `<p>Решение: <span data-g2wm-launch-progress="decide">${g2wmLaunchCheckedCount(pages, workspace, "decide")} из ${pages.length} страниц</span> · Отправлено: <span data-g2wm-launch-progress="submit">${g2wmLaunchCheckedCount(pages, workspace, "submit")} из ${pages.length} страниц</span></p>`
    : `<p data-g2wm-launch-progress="${action}">Выполнено для ${g2wmLaunchCheckedCount(pages, workspace, action)} из ${pages.length} страниц</p>`;
  return `<section class="g2wm-search-stage" data-g2wm-launch-pages data-g2wm-launch-action="${action}">
    <h5>Приоритетные страницы выбранного проекта для проверки</h5>
    <p>${action === "decide" ? "В. Решить, нужен ли переобход; отметить отправленные заявки" :
      escapeHtml(G2WM_LAUNCH_ACTIONS.find(item => item.id === action).title) + " · при необходимости"}</p>
    ${progress}<details><summary>Показать страницы и отметки</summary><ul>${rows}</ul></details></section>`;
}
function g2wmLaunchProjectDataHtml(workspace = state) {
  const data = g2wmSitemapData(workspace), home = g2wmMainAddress(workspace);
  const counterId = String(g2wCompanyValue("counterId", workspace) || "").trim();
  return `<section class="g2wm-indexing-urls" data-g2wm-launch-project>
    <h5>Данные выбранного проекта</h5><p>Проект: ${escapeHtml(workspace?.project?.name || "Не указан")}</p>
    <p>Основной адрес: ${escapeHtml(home || "URL не заполнен")}</p>
    <p>Платформа: ${escapeHtml(g2wPlatform(workspace) || "Не указана")}</p>
    <p>Счётчик Яндекс Метрики: ${escapeHtml(counterId || "Не указан")}</p>
    <p>Сохранённых Sitemap с URL: ${data.rows.filter(row => row.publicUrl).length}; опубликованных страниц для сверки: ${g2wmLaunchPages(workspace).length}</p>
    <p>Привязку счётчика, включённый обход и текущий статус файлов подтвердите в Яндекс Вебмастере.</p></section>`;
}
function g2wmLaunchFilesHtml(workspace = state) {
  const data = g2wmSitemapData(workspace);
  let robots = data.publicRobotsUrl || "";
  if (!robots) {
    try { robots = new URL("/robots.txt", g2wmMainAddress(workspace)).href; } catch (_) {}
  }
  return `<section class="g2wm-indexing-urls" data-g2wm-launch-files><h5>Файлы проекта для проверки</h5>
    <p>robots.txt: ${robots ? `<a href="${escapeAttr(robots)}" target="_blank" rel="noopener noreferrer">${escapeHtml(robots)}</a>` : "Основной адрес сайта не указан"}</p>
    ${g2wmSitemapFilesHtml(data)}<p>Сохранённые адреса и статусы используются для сверки. Фактическое содержимое robots.txt и XML проверьте на опубликованном сайте.</p></section>`;
}

function g2wmLaunchGuideHtml(workspace = state) {
  const allPages = g2wmLaunchPages(workspace), priority = g2wmLaunchPriorityPages(workspace);
  const isTilda = String(g2wPlatform(workspace) || "").trim().toLowerCase() === "tilda";
  let markdown = G2WM_INDEXING_LAUNCH_MARKDOWN;
  const robots = (() => { try { return new URL("/robots.txt", g2wmMainAddress(workspace)).href; } catch (_) { return "URL не заполнен"; } })();
  markdown = markdown.replace("   **Пример:** https://k-apple.ru/robots.txt",
    `   Адрес для проверки в выбранном проекте: ${robots}`);
  markdown = g2wmIndexingReplaceSection(markdown,
    "**Пример того, как могут выглядеть строки в robots.txt сайта на Tilda:**", "**Если Sitemap отсутствует или сформирован неправильно:**",
    "G2WM_LAUNCH_FILES\n\nСверяйте назначение карт по фактическим опубликованным XML-файлам; не выводите его только из имени файла.\n\n");
  if (!isTilda) markdown = g2wmIndexingReplaceSection(markdown,
    "**Если Sitemap отсутствует или сформирован неправильно:**", "**Шаг 2. Проверить обработку Sitemap в Яндексе**",
    "**Если Sitemap отсутствует или сформирован неправильно:** откройте настройки карты сайта в используемой платформе, проверьте автоматическую генерацию и опубликованный XML. Сохраняйте или меняйте настройки только после подтверждения ошибки, затем повторно проверьте нужные URL.\n\n");
  markdown = g2wmIndexingReplaceSection(markdown,
    "**Пример правильного результата для сайта «Коричное яблоко»:**", "**Что означает правильный результат:**",
    "Сравните фактические файлы в Вебмастере с сохранённым списком проекта выше. Файлы, которых нет на опубликованном сайте, добавлять не нужно.\n\n");
  markdown = g2wmIndexingReplaceSection(markdown,
    "**Пример для «Коричного яблока»:**", "Если счётчик уже связан",
    "G2WM_LAUNCH_COUNTER\n\n");
  markdown = markdown.replace("**Пример правильного URL:**\n\n`https://k-apple.ru/simvol-2027-koza`",
    "Используйте окончательный опубликованный URL из списка приоритетных страниц ниже.");
  markdown = markdown.replace("   Например:\n\n   `url:https://k-apple.ru/simvol-2027-koza`",
    "   Для нужной страницы используйте `url:` и полный опубликованный адрес из списка проекта без пробела.");
  if (!isTilda) {
    markdown = markdown.replace("| Режим Sitemap Tilda | «Автоматическая генерация» |",
      "| Генерация Sitemap | Соответствует настройкам выбранной платформы |")
      .replace(/\n4\. Tilda, «Гид по SEO»:[\s\S]*$/, "");
  }
  markdown = markdown.replace("### Б. Включить автоматический обход по Метрике",
      "G2WM_LAUNCH_PAGE_LIST_SITEMAP\n\n### Б. Включить автоматический обход по Метрике")
    .replace("### Г. Сроки обработки",
      "G2WM_LAUNCH_PAGE_LIST_DECIDE\n\n### Г. Сроки обработки")
    .replace("### Е. Если страница не появилась в поиске",
      "G2WM_LAUNCH_PAGE_LIST_VERIFY\n\n### Е. Если страница не появилась в поиске")
    .replace("## 3. Сверка (инструкция)",
      "G2WM_LAUNCH_PAGE_LIST_DIAGNOSE\n\n## 3. Сверка (инструкция)");
  let html = g2muVerbatimMarkdownHtml(markdown, "g2wm-launch-copy", true);
  html = html.replace("<p>G2WM_LAUNCH_FILES</p>", g2wmLaunchFilesHtml(workspace))
    .replace("<p>G2WM_LAUNCH_COUNTER</p>", g2wmLaunchProjectDataHtml(workspace))
    .replace("<p>G2WM_LAUNCH_PAGE_LIST_SITEMAP</p>", g2wmLaunchStageHtml(allPages, workspace, "sitemap"))
    .replace("<p>G2WM_LAUNCH_PAGE_LIST_DECIDE</p>", g2wmLaunchStageHtml(priority, workspace, "decide"))
    .replace("<p>G2WM_LAUNCH_PAGE_LIST_VERIFY</p>", g2wmLaunchStageHtml(priority, workspace, "verify"))
    .replace("<p>G2WM_LAUNCH_PAGE_LIST_DIAGNOSE</p>", g2wmLaunchStageHtml(priority, workspace, "diagnose"));
  return html;
}
