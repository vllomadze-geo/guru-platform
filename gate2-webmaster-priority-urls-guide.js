/* Webmaster 3.2 uses the same project page scope as 3.1, with its own review data. */
const G2WM_PRIORITY_ACTIONS = Object.freeze([
  { id: "prepare", title: "А. Подготовить адрес страницы", required: true },
  { id: "check", title: "Б. Проверить страницу в Яндекс Вебмастере" },
  { id: "monitor", title: "В. Альтернативная проверка через «Мониторинг важных страниц»", optional: true },
  { id: "diagnose", title: "Г. Проверить доступность страницы для индексирования", optional: true },
  { id: "compare", title: "Д. Сравнить фактический URL с данными проекта", optional: true },
  { id: "fix", title: "Е. Устранить обнаруженную ошибку", optional: true },
  { id: "decide", title: "Ж. Определить, нужен ли переобход", required: true },
  { id: "submit", title: "З. Отправить страницу на переобход", optional: true },
  { id: "verify", title: "И. Проверить результат переобхода", optional: true },
  { id: "record", title: "К. Зафиксировать итог проверки", required: true },
]);
const G2WM_PRIORITY_STORAGE_PREFIX = "guru-platform-webmaster-priority-v1-";
const g2wmPriorityHydrated = new WeakMap();

function g2wmPriorityHydrate(workspace = state) {
  const projectId = workspace?.project?.id;
  if (!projectId) return;
  let raw = null;
  try { raw = localStorage.getItem(G2WM_PRIORITY_STORAGE_PREFIX + projectId); }
  catch (_) { return; }
  if (!raw || g2wmPriorityHydrated.get(workspace) === raw) return;
  g2wmPriorityHydrated.set(workspace, raw);
  let saved = null;
  try { saved = JSON.parse(raw); } catch (_) { return; }
  const version = Number(saved?.updatedAt) || 0;
  if (!version) return;
  const current = g2wmReviews(workspace).s32;
  if (version <= (Number(current?.checksUpdatedAt) || 0)) return;
  const review = g2wmReviews(workspace, true).s32 ||= {};
  review.pageChecks = saved.pageChecks && typeof saved.pageChecks === "object" ? saved.pageChecks : {};
  review.actionChecks = saved.actionChecks && typeof saved.actionChecks === "object" ? saved.actionChecks : {};
  review.checksUpdatedAt = version;
}
function g2wmPrioritySaveChecks(workspace = state) {
  const projectId = workspace?.project?.id;
  const review = g2wmReviews(workspace).s32;
  if (!projectId || !review) return;
  review.checksUpdatedAt = Math.max(Date.now(), (Number(review.checksUpdatedAt) || 0) + 1);
  try {
    const raw = JSON.stringify({ updatedAt: review.checksUpdatedAt,
      pageChecks: review.pageChecks || {}, actionChecks: review.actionChecks || {} });
    localStorage.setItem(G2WM_PRIORITY_STORAGE_PREFIX + projectId, raw);
    g2wmPriorityHydrated.set(workspace, raw);
  } catch (_) {
    // The normal project save remains available if localStorage is full.
  }
}

function g2wmPriorityPages(workspace = state) {
  g2wmPriorityHydrate(workspace);
  return g2wmSearchPages(workspace);
}
function g2wmPriorityFingerprint(workspace = state) { return g2wmSearchFingerprint(workspace); }
function g2wmPriorityChecks(action = "prepare", workspace = state) {
  const review = g2wmReviews(workspace).s32;
  return action === "prepare" ? review?.pageChecks || {} : review?.actionChecks?.[action] || {};
}
function g2wmPriorityPageChecked(page, workspace = state, action = "prepare") {
  const saved = g2wmPriorityChecks(action, workspace)[g2wmSearchPageKey(page)];
  return saved?.checked === true && saved.url === page.url && saved.name === page.name;
}
function g2wmPriorityCheckedCount(pages = g2wmPriorityPages(), workspace = state, action = "prepare") {
  return pages.filter(page => g2wmPriorityPageChecked(page, workspace, action)).length;
}
function g2wmPriorityCanComplete(workspace = state) {
  const pages = g2wmPriorityPages(workspace);
  return pages.length > 0 && pages.some(page => page.group === "fixed" && page.id === "home" && page.publicUrl) &&
    pages.every(page => page.publicUrl && !page.anchor &&
      g2wmPriorityPageChecked(page, workspace, "prepare") &&
      (g2wmPriorityPageChecked(page, workspace, "check") || g2wmPriorityPageChecked(page, workspace, "monitor")) &&
      g2wmPriorityPageChecked(page, workspace, "decide") &&
      g2wmPriorityPageChecked(page, workspace, "record") &&
      (!g2wmPriorityPageChecked(page, workspace, "submit") || g2wmPriorityPageChecked(page, workspace, "verify")));
}
function g2wmPriorityHasProgress(workspace = state) {
  const pages = g2wmPriorityPages(workspace);
  return G2WM_PRIORITY_ACTIONS.some(action => g2wmPriorityCheckedCount(pages, workspace, action.id) > 0);
}

function g2wmPriorityCheckHtml(page, workspace, action) {
  const definition = G2WM_PRIORITY_ACTIONS.find(item => item.id === action);
  const disabled = g2ServiceBlockApplicability(G2WM_CONFIG, "", workspace) === "not_needed" ||
    action !== "prepare" && (!page.publicUrl || page.anchor);
  return `<label class="g2wm-search-check"><input type="checkbox" data-g2wm-priority-check data-g2wm-priority-action="${action}"
    data-g2wm-url-group="${escapeAttr(page.group)}" data-g2wm-url-id="${escapeAttr(page.id)}"
    aria-label="${escapeAttr(definition.title)} — выполнено: ${escapeAttr(page.name)}"
    ${g2wmPriorityPageChecked(page, workspace, action) ? "checked" : ""} ${disabled ? "disabled" : ""}><span>Выполнено</span></label>`;
}
function g2wmPriorityPagesHtml(pages, workspace = state, action = "prepare") {
  const definition = G2WM_PRIORITY_ACTIONS.find(item => item.id === action);
  const progress = `<p data-g2wm-priority-progress>Выполнено для ${g2wmPriorityCheckedCount(pages, workspace, action)} из ${pages.length} страниц</p>`;
  let previousSection = "";
  if (action === "prepare") {
    const rows = pages.map(page => {
      const group = page.section === "commercial" && previousSection !== "commercial"
        ? `<tr class="g2wm-search-group-row"><th colspan="5">Коммерческие страницы (Категория)</th></tr>` : "";
      previousSection = page.section;
      const address = page.publicUrl
        ? `<a href="${escapeAttr(page.publicUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(page.url)}</a>`
        : `<span>${escapeHtml(page.url || "URL не заполнен")}</span> <button type="button" data-g2wm-platform-url data-g2wm-url-group="${escapeAttr(page.group)}" data-g2wm-url-id="${escapeAttr(page.id)}">Открыть Платформу →</button>`;
      return `${group}<tr data-g2wm-page-group="${escapeAttr(page.group)}" data-g2wm-page-id="${escapeAttr(page.id)}"
        data-g2wm-page-section="${escapeAttr(page.section)}"><td data-label="Страница">${escapeHtml(page.name)}</td>
        <td data-label="Тип">${escapeHtml(page.type)}</td><td data-label="Адрес">${address}</td>
        <td data-label="Что сделать">${page.publicUrl && !page.anchor ? "Проверить основной опубликованный URL" : "Уточнить публикацию и основной URL"}</td>
        <td data-label="Действие">${g2wmPriorityCheckHtml(page, workspace, action)}</td></tr>`;
    }).join("");
    return `<section class="g2wm-indexing-urls" data-g2wm-priority-pages data-g2wm-priority-action="prepare">
      <h5>Страницы выбранного проекта для проверки</h5>${progress}
      <div class="g2wm-indexing-table-scroll"><table><thead><tr><th>Страница</th><th>Тип</th><th>Адрес</th><th>Что сделать</th><th>Действие</th></tr></thead>
      <tbody>${rows}</tbody></table></div><p>Список берётся из Платформы выбранного проекта и совпадает со списком шага 3.1: главная, контакты, каталог и категории, «О нас» и блог. Для технической проверки нужен опубликованный URL каждой страницы. Отметьте подготовку, проверку через основной или альтернативный инструмент, решение о переобходе и фиксацию результата. Если переобход отправлен, проверьте его результат.</p></section>`;
  }
  const rows = pages.map(page => {
    const group = page.section === "commercial" && previousSection !== "commercial"
      ? `<li class="g2wm-search-group-label">Коммерческие страницы (Категория)</li>` : "";
    previousSection = page.section;
    const detail = page.publicUrl || page.url || "URL не заполнен";
    return `${group}<li data-g2wm-page-group="${escapeAttr(page.group)}" data-g2wm-page-id="${escapeAttr(page.id)}"
      data-g2wm-page-section="${escapeAttr(page.section)}"><span><strong>${escapeHtml(page.name)}</strong>
      <small>${escapeHtml(detail)}</small></span>${g2wmPriorityCheckHtml(page, workspace, action)}</li>`;
  }).join("");
  return `<section class="g2wm-search-stage" data-g2wm-priority-pages data-g2wm-priority-action="${action}">
    <h5>Страницы выбранного проекта для проверки</h5><p>${escapeHtml(definition.title)}${definition.optional ? " · при необходимости" : ""}</p>
    ${progress}<details><summary>Показать страницы и отметки</summary><ul>${rows}</ul></details></section>`;
}

function g2wmPriorityGuideHtml(workspace = state) {
  const pages = g2wmPriorityPages(workspace);
  const home = pages.find(page => page.group === "fixed" && page.id === "home")?.publicUrl || "";
  const platform = String(g2wPlatform(workspace) || "").trim();
  const isTilda = platform.toLowerCase() === "tilda";
  let markdown = G2WM_PRIORITY_URLS_MARKDOWN;
  markdown = markdown.replace("**Целевое действие:** проверить состояние одной приоритетной страницы в Яндекс Вебмастере, устранить подтверждённые ошибки и выполнить переобход, только если он необходим.",
    "**Целевое действие:** проверить каждый опубликованный URL из списка выбранного проекта в Яндекс Вебмастере, устранить подтверждённые ошибки и выполнить переобход только при необходимости.");
  markdown = g2wmIndexingReplaceSection(markdown,
    "**Пример для «Коричного яблока»:**", "Если у страницы ранее менялся адрес",
    "G2WM_PRIORITY_PAGE_LIST_PREPARE\n\n");
  markdown = markdown.replace("1. Возьмите список приоритетных страниц, проверенных в шаге 3.1.",
    "1. Используйте список страниц выбранного проекта из шага 3.1 ниже.");
  markdown = markdown.replace("1. Откройте опубликованную страницу в Google Chrome.",
    "1. Откройте опубликованную страницу в браузере с просмотром исходного кода.");
  markdown = markdown.replace("На Tilda canonical обычно формируется автоматически после подключения собственного домена. Ручное изменение без подтверждённой ошибки не требуется.",
    isTilda ? "На Tilda canonical обычно формируется автоматически после подключения собственного домена. Ручное изменение без подтверждённой ошибки не требуется."
      : "Проверьте, как выбранная платформа формирует canonical. Меняйте его только после подтверждённой ошибки.");
  markdown = markdown.replace("Повторная публикация сайта только ради отправки заявки не требуется. Если вы предварительно исправляли страницу на Tilda, изменения должны быть опубликованы до отправки.",
    "Повторная публикация сайта только ради отправки заявки не требуется. Если вы предварительно исправляли страницу в используемой платформе, опубликуйте изменения до отправки.");
  if (!isTilda) {
    markdown = g2wmIndexingReplaceSection(markdown,
      "**Ситуация 1. Страница закрыта от индексирования на Tilda**", "**Ситуация 4. Ошибка HTTP или загрузки**",
      `**Ситуация 1. Страница ошибочно закрыта от индексирования**

1. Откройте настройки SEO проблемной страницы в используемой платформе.
2. Найдите запрет индексирования и снимите его только после подтверждения ошибки.
3. Сохраните и опубликуйте страницу.
4. Повторите анализ индексируемости в Яндекс Вебмастере.

Если запрет действует на весь сайт, используйте инструкцию 2.1.

**Ситуация 2. Неправильный canonical**

1. Найдите настройку основного адреса или canonical страницы в используемой платформе.
2. Сравните её с опубликованным URL из списка проекта.
3. Исправьте ошибочное переопределение, сохраните и опубликуйте страницу.
4. Повторно проверьте canonical в исходном коде.

**Ситуация 3. Неправильное перенаправление**

1. Найдите правило для прежнего адреса в настройках сайта или сервера.
2. Исправьте адрес назначения только при подтверждённой ошибке; корректное правило не дублируйте.
3. Сохраните изменения и повторно проверьте HTTP-ответ и конечный URL.

`);
    markdown = markdown.replace(/\n7\. Tilda, «SEO и индексирование»:[\s\S]*$/, "");
  }
  markdown = g2wmIndexingReplaceSection(markdown,
    "   Пример:\n\n   `https://k-apple.ru/simvol-2027-koza`", "9. Нажмите **«Отправить»**.",
    "   Используйте основной опубликованный URL из списка выбранного проекта выше.\n\n");
  markdown = g2wmIndexingReplaceSection(markdown,
    "### Подтверждённые данные проекта «Коричное яблоко»", "### Результат для аналитики",
    `### Данные выбранного проекта

G2WM_PRIORITY_PROJECT_DATA

Результаты проверки, canonical, HTTP-ответы и статус переобхода определяются по фактическим данным Яндекс Вебмастера. Сохранённый в Платформе URL сам по себе не подтверждает индексацию.

`);
  markdown = markdown.replace("**Шаг 3.2 можно подтвердить после проверки всех обязательных приоритетных URL и получения достаточных доказательств корректной обработки каждого из них.**",
    "**Шаг 3.2 можно подтвердить после проверки всех опубликованных URL из списка выбранного проекта и фиксации результата по каждому из них.**");
  markdown = markdown.replace("### В. Альтернативная проверка через «Мониторинг важных страниц»",
      "G2WM_PRIORITY_PAGE_LIST_CHECK\n\n### В. Альтернативная проверка через «Мониторинг важных страниц»")
    .replace("### Г. Проверить доступность страницы для индексирования",
      "G2WM_PRIORITY_PAGE_LIST_MONITOR\n\n### Г. Проверить доступность страницы для индексирования")
    .replace("### Д. Сравнить фактический URL с данными проекта",
      "G2WM_PRIORITY_PAGE_LIST_DIAGNOSE\n\n### Д. Сравнить фактический URL с данными проекта")
    .replace("### Е. Устранить обнаруженную ошибку",
      "G2WM_PRIORITY_PAGE_LIST_COMPARE\n\n### Е. Устранить обнаруженную ошибку")
    .replace("### Ж. Определить, нужен ли переобход",
      "G2WM_PRIORITY_PAGE_LIST_FIX\n\n### Ж. Определить, нужен ли переобход")
    .replace("### З. Отправить страницу на переобход",
      "G2WM_PRIORITY_PAGE_LIST_DECIDE\n\n### З. Отправить страницу на переобход")
    .replace("### И. Проверить результат переобхода",
      "G2WM_PRIORITY_PAGE_LIST_SUBMIT\n\n### И. Проверить результат переобхода")
    .replace("### К. Зафиксировать итог проверки",
      "G2WM_PRIORITY_PAGE_LIST_VERIFY\n\n### К. Зафиксировать итог проверки")
    .replace("## 3. Сверка (инструкция)",
      "G2WM_PRIORITY_PAGE_LIST_RECORD\n\n## 3. Сверка (инструкция)");
  let html = g2muVerbatimMarkdownHtml(markdown, "g2wm-priority-copy", true);
  for (const action of G2WM_PRIORITY_ACTIONS)
    html = html.replace(`<p>G2WM_PRIORITY_PAGE_LIST_${action.id.toUpperCase()}</p>`,
      g2wmPriorityPagesHtml(pages, workspace, action.id));
  const projectData = `<section class="g2wm-indexing-urls" data-g2wm-priority-project>
    <h5>Данные выбранного проекта</h5><p>Проект: ${escapeHtml(workspace?.project?.name || "Не указан")}</p>
    <p>Основной сайт: ${escapeHtml(home || "URL не заполнен")}</p>
    <p>Платформа: ${escapeHtml(platform || "Не указана")}</p>
    <p>Страниц в списке: ${pages.length}; без опубликованного URL: ${pages.filter(page => !page.publicUrl).length}</p></section>`;
  return html.replace("<p>G2WM_PRIORITY_PROJECT_DATA</p>", projectData);
}
