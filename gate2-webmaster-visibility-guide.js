/* Webmaster 3.3: project URLs, independent page checks and durable progress. */
const G2WM_VISIBILITY_ACTIONS = Object.freeze([
  { id: "prepare", title: "А. Подготовить список страниц", required: true },
  { id: "select", title: "В. Выбрать проверяемую страницу", required: true },
  { id: "configure", title: "Г. Установить параметры отчёта", required: true },
  { id: "metrics", title: "Д. Получить первоначальные показатели", required: true },
  { id: "queries", title: "Е. Проверить поисковые запросы", optional: true },
  { id: "advanced", title: "Ж. Если нужна точная связь запроса и страницы", optional: true },
  { id: "fallback", title: "З. Если данные отсутствуют или инструменты недоступны", optional: true },
  { id: "record", title: "И. Зафиксировать результат", required: true },
]);
const G2WM_VISIBILITY_STORAGE_PREFIX = "guru-platform-webmaster-visibility-v1-";
const g2wmVisibilityHydrated = new WeakMap();

function g2wmVisibilityHydrate(workspace = state) {
  const projectId = workspace?.project?.id;
  if (!projectId) return;
  let raw = null;
  try { raw = localStorage.getItem(G2WM_VISIBILITY_STORAGE_PREFIX + projectId); }
  catch (_) { return; }
  if (!raw || g2wmVisibilityHydrated.get(workspace) === raw) return;
  g2wmVisibilityHydrated.set(workspace, raw);
  let saved = null;
  try { saved = JSON.parse(raw); } catch (_) { return; }
  const version = Number(saved?.updatedAt) || 0;
  if (!version) return;
  const current = g2wmReviews(workspace).s33;
  if (version <= (Number(current?.checksUpdatedAt) || 0)) return;
  const review = g2wmReviews(workspace, true).s33 ||= {};
  review.pageChecks = saved.pageChecks && typeof saved.pageChecks === "object" ? saved.pageChecks : {};
  review.actionChecks = saved.actionChecks && typeof saved.actionChecks === "object" ? saved.actionChecks : {};
  review.checksUpdatedAt = version;
}
function g2wmVisibilitySaveChecks(workspace = state) {
  const projectId = workspace?.project?.id;
  const review = g2wmReviews(workspace).s33;
  if (!projectId || !review) return;
  review.checksUpdatedAt = Math.max(Date.now(), (Number(review.checksUpdatedAt) || 0) + 1);
  try {
    const raw = JSON.stringify({ updatedAt: review.checksUpdatedAt,
      pageChecks: review.pageChecks || {}, actionChecks: review.actionChecks || {} });
    localStorage.setItem(G2WM_VISIBILITY_STORAGE_PREFIX + projectId, raw);
    g2wmVisibilityHydrated.set(workspace, raw);
  } catch (_) {
    // The project save still runs if localStorage has no room for this snapshot.
  }
}
function g2wmVisibilityPages(workspace = state) {
  g2wmVisibilityHydrate(workspace);
  return g2wmSearchPages(workspace);
}
function g2wmVisibilityFingerprint(workspace = state) { return g2wmSearchFingerprint(workspace); }
function g2wmVisibilityChecks(action = "prepare", workspace = state) {
  const review = g2wmReviews(workspace).s33;
  return action === "prepare" ? review?.pageChecks || {} : review?.actionChecks?.[action] || {};
}
function g2wmVisibilityPageChecked(page, workspace = state, action = "prepare") {
  const saved = g2wmVisibilityChecks(action, workspace)[g2wmSearchPageKey(page)];
  return saved?.checked === true && saved.url === page.url && saved.name === page.name;
}
function g2wmVisibilityCheckedCount(pages = g2wmVisibilityPages(), workspace = state, action = "prepare") {
  return pages.filter(page => g2wmVisibilityPageChecked(page, workspace, action)).length;
}
function g2wmVisibilityCanComplete(workspace = state) {
  const pages = g2wmVisibilityPages(workspace);
  return pages.length > 0 && pages.some(page => page.group === "fixed" && page.id === "home" && page.publicUrl) &&
    pages.every(page => page.publicUrl && !page.anchor &&
      G2WM_VISIBILITY_ACTIONS.filter(action => action.required).every(action =>
        g2wmVisibilityPageChecked(page, workspace, action.id)));
}
function g2wmVisibilityHasProgress(workspace = state) {
  const pages = g2wmVisibilityPages(workspace);
  return G2WM_VISIBILITY_ACTIONS.some(action => g2wmVisibilityCheckedCount(pages, workspace, action.id) > 0);
}

function g2wmVisibilityCheckHtml(page, workspace, action) {
  const definition = G2WM_VISIBILITY_ACTIONS.find(item => item.id === action);
  const disabled = g2ServiceBlockApplicability(G2WM_CONFIG, "", workspace) === "not_needed" ||
    action !== "prepare" && (!page.publicUrl || page.anchor);
  return `<label class="g2wm-search-check"><input type="checkbox" data-g2wm-visibility-check data-g2wm-visibility-action="${action}"
    data-g2wm-url-group="${escapeAttr(page.group)}" data-g2wm-url-id="${escapeAttr(page.id)}"
    aria-label="${escapeAttr(definition.title)} — выполнено: ${escapeAttr(page.name)}"
    ${g2wmVisibilityPageChecked(page, workspace, action) ? "checked" : ""} ${disabled ? "disabled" : ""}><span>Выполнено</span></label>`;
}
function g2wmVisibilityPagesHtml(pages, workspace = state, action = "prepare") {
  const definition = G2WM_VISIBILITY_ACTIONS.find(item => item.id === action);
  const progress = `<p data-g2wm-visibility-progress>Выполнено для ${g2wmVisibilityCheckedCount(pages, workspace, action)} из ${pages.length} страниц</p>`;
  let previousSection = "";
  if (action === "prepare") {
    const rows = pages.map(page => {
      const group = page.section === "commercial" && previousSection !== "commercial"
        ? `<tr class="g2wm-search-group-row"><th colspan="5">Коммерческие страницы (Категория)</th></tr>` : "";
      previousSection = page.section;
      const address = page.publicUrl
        ? `<a href="${escapeAttr(page.publicUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(page.url)}</a>`
        : `<span>${escapeHtml(page.url || "URL не заполнен")}</span> <button type="button" data-g2wm-platform-url data-g2wm-url-group="${escapeAttr(page.group)}" data-g2wm-url-id="${escapeAttr(page.id)}">Открыть Платформу →</button>`;
      const filter = g2wmSearchFilter(page, pages);
      return `${group}<tr data-g2wm-page-group="${escapeAttr(page.group)}" data-g2wm-page-id="${escapeAttr(page.id)}"
        data-g2wm-page-section="${escapeAttr(page.section)}"><td data-label="Страница">${escapeHtml(page.name)}</td>
        <td data-label="Тип">${escapeHtml(page.type)}</td><td data-label="Адрес">${address}</td>
        <td data-label="Строка для фильтра">${filter ? `<code>${escapeHtml(filter)}</code>` : "После заполнения URL"}</td>
        <td data-label="Действие">${g2wmVisibilityCheckHtml(page, workspace, action)}</td></tr>`;
    }).join("");
    return `<section class="g2wm-indexing-urls" data-g2wm-visibility-pages data-g2wm-visibility-action="prepare">
      <h5>Страницы выбранного проекта для проверки</h5>${progress}
      <div class="g2wm-indexing-table-scroll"><table><thead><tr><th>Страница</th><th>Тип</th><th>Адрес</th><th>Строка для фильтра</th><th>Действие</th></tr></thead>
      <tbody>${rows}</tbody></table></div><p>Используйте опубликованные URL из списка шагов 3.1–3.2. Для завершения отметьте выбор страницы, параметры отчёта, подтверждённые показы и позицию, а также фиксацию результата для каждой страницы. Ноль кликов допустим; отсутствие показов или позиции оставляйте на проверке.</p></section>`;
  }
  const rows = pages.map(page => {
    const group = page.section === "commercial" && previousSection !== "commercial"
      ? `<li class="g2wm-search-group-label">Коммерческие страницы (Категория)</li>` : "";
    previousSection = page.section;
    const detail = action === "queries" || action === "select" ? g2wmSearchFilter(page, pages) || page.url : page.publicUrl || page.url;
    return `${group}<li data-g2wm-page-group="${escapeAttr(page.group)}" data-g2wm-page-id="${escapeAttr(page.id)}"
      data-g2wm-page-section="${escapeAttr(page.section)}"><span><strong>${escapeHtml(page.name)}</strong>
      <small>${escapeHtml(detail || "URL не заполнен")}</small></span>${g2wmVisibilityCheckHtml(page, workspace, action)}</li>`;
  }).join("");
  return `<section class="g2wm-search-stage" data-g2wm-visibility-pages data-g2wm-visibility-action="${action}">
    <h5>Страницы выбранного проекта для проверки</h5><p>${escapeHtml(definition.title)}${definition.optional ? " · при необходимости" : ""}</p>
    ${progress}<details><summary>Показать страницы и отметки</summary><ul>${rows}</ul></details></section>`;
}

function g2wmVisibilityGuideHtml(workspace = state) {
  const pages = g2wmVisibilityPages(workspace);
  const home = pages.find(page => page.group === "fixed" && page.id === "home")?.publicUrl || "";
  const region = String(workspace?.project?.geography || "").trim();
  let markdown = G2WM_VISIBILITY_MARKDOWN;
  markdown = markdown.replace("1. Возьмите из проекта список приоритетных страниц, для которых необходимо привлекать органический поисковый трафик.",
    "1. Используйте список страниц выбранного проекта ниже; он совпадает со списком шагов 3.1–3.2.");
  markdown = g2wmIndexingReplaceSection(markdown,
    "**Пример для проекта «Коричное яблоко»:**", "Если данные по этой странице уже имеются",
    "G2WM_VISIBILITY_PAGE_LIST_PREPARE\n\n");
  markdown = markdown.replace("**Пример:**\n\n`/simvol-2027-koza`",
    "Для выбора страницы используйте её опубликованный URL или строку для фильтра из списка выше.");
  markdown = markdown.replace("Например, если проект ориентирован на Москву, но в списке доступен только Центральный федеральный округ, не следует выдавать его показатели за статистику исключительно Москвы.",
    "Если нужного региона проекта нет в списке, не выдавайте статистику другого региона за показатели целевого. Используйте фактическую географию выбранного проекта.");
  markdown = markdown.replace("   Например:\n\n   `simvol-2027-koza`",
    "   Используйте строку для фильтра соответствующей страницы из списка выше.");
  markdown = markdown.replace("8. Убедитесь, что под фильтрами появилось условие `URL содержит simvol-2027-koza`.",
    "8. Убедитесь, что под фильтрами появилось условие с адресом или путём выбранной страницы.");
  markdown = markdown.replace("Не изменяйте Tilda, Sitemap, Яндекс Метрику или настройки индексирования ради исправления ошибки аналитического сервиса Яндекса.",
    "Не изменяйте платформу сайта, Sitemap, Яндекс Метрику или настройки индексирования ради исправления ошибки аналитического сервиса Яндекса.");
  markdown = g2wmIndexingReplaceSection(markdown,
    "### Подтверждённые данные проекта «Коричное яблоко»", "### Результат для аналитики",
    `### Данные выбранного проекта

G2WM_VISIBILITY_PROJECT_DATA

Показы, клики, CTR, позиции и поисковые запросы необходимо сверить с фактическим отчётом Яндекс Вебмастера. Платформа не определяет эти показатели по адресу страницы.

`);
  markdown = markdown.replace("**После проверки первоначального ранжирования всех обязательных страниц можно завершить шаг 3.3 и подтвердить выполнение раздела 3 «Первичная проверка индексации и ранжирования».**",
    "**После проверки первоначального ранжирования всех опубликованных страниц из списка проекта можно завершить шаг 3.3 и подтвердить выполнение раздела 3 «Первичная проверка индексации и ранжирования».**");
  markdown = markdown.replace("### Г. Установить параметры отчёта",
      "G2WM_VISIBILITY_PAGE_LIST_SELECT\n\n### Г. Установить параметры отчёта")
    .replace("### Д. Получить первоначальные показатели",
      "G2WM_VISIBILITY_PAGE_LIST_CONFIGURE\n\n### Д. Получить первоначальные показатели")
    .replace("### Е. Проверить поисковые запросы",
      "G2WM_VISIBILITY_PAGE_LIST_METRICS\n\n### Е. Проверить поисковые запросы")
    .replace("### Ж. Если нужна точная связь запроса и страницы",
      "G2WM_VISIBILITY_PAGE_LIST_QUERIES\n\n### Ж. Если нужна точная связь запроса и страницы")
    .replace("### З. Если данные отсутствуют или инструменты недоступны",
      "G2WM_VISIBILITY_PAGE_LIST_ADVANCED\n\n### З. Если данные отсутствуют или инструменты недоступны")
    .replace("### И. Зафиксировать результат",
      "G2WM_VISIBILITY_PAGE_LIST_FALLBACK\n\n### И. Зафиксировать результат")
    .replace("## 3. Сверка (инструкция)",
      "G2WM_VISIBILITY_PAGE_LIST_RECORD\n\n## 3. Сверка (инструкция)");
  let html = g2muVerbatimMarkdownHtml(markdown, "g2wm-visibility-copy", true);
  for (const action of G2WM_VISIBILITY_ACTIONS)
    html = html.replace(`<p>G2WM_VISIBILITY_PAGE_LIST_${action.id.toUpperCase()}</p>`,
      g2wmVisibilityPagesHtml(pages, workspace, action.id));
  const projectData = `<section class="g2wm-indexing-urls" data-g2wm-visibility-project>
    <h5>Данные выбранного проекта</h5><p>Проект: ${escapeHtml(workspace?.project?.name || "Не указан")}</p>
    <p>Основной сайт: ${escapeHtml(home || "URL не заполнен")}</p>
    <p>Регион проекта: ${escapeHtml(region || "Не указан")}</p>
    <p>Страниц в списке: ${pages.length}; без опубликованного URL: ${pages.filter(page => !page.publicUrl).length}</p></section>`;
  return html.replace("<p>G2WM_VISIBILITY_PROJECT_DATA</p>", projectData);
}
