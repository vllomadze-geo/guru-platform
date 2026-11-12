/* Step 1.2 uses saved project data without presenting a sample audit as a fact. */
function g2directRepresentativesProjectHtml(workspace = state) {
  const cabinet = g2directFieldValue("accountLogin", workspace);
  const representative = g2directFieldValue("mainRepresentative", workspace);
  return `<section class="g2direct-project-data" data-g2direct-representatives-project>
    <h5>Данные выбранного проекта</h5>
    <p>Проект: ${escapeHtml(workspace?.project?.name || "Не указан")}</p>
    <p>Основной адрес сайта: ${escapeHtml(g2directMainAddress(workspace) || "Не указан")}</p>
    <p>Рабочий логин кабинета: ${escapeHtml(cabinet || "Не указан")}</p>
    <p>Главный представитель по ранее сохранённым данным: ${escapeHtml(representative || "Не указан")}</p>
    <p>Полномочия, дополнительных представителей и управляющие аккаунты проверьте в Директе. Сохранённые логины сами по себе не подтверждают текущий доступ.</p>
  </section>`;
}
function g2directRepresentativesGuideHtml(workspace = state) {
  let markdown = G2DIRECT_REPRESENTATIVES_MARKDOWN;
  markdown = g2directReplaceSection(markdown, "**Пример правильного результата:**",
    "Главный представитель может управлять", "G2DIRECT_REPRESENTATIVES_PROJECT\n\n");
  markdown = g2directReplaceSection(markdown, "### Подтверждённый результат «Коричное яблоко»",
    "## Официальные источники",
    "### Данные выбранного проекта\n\nТекущий состав пользователей и уровень их прав подтвердите в Директе. Если доступы соответствуют потребностям компании, менять их не требуется.\n\n**Следующий шаг:** 2.1. Сведения для маркировки рекламы.\n\n");
  return g2muVerbatimMarkdownHtml(markdown, "g2direct-representatives-copy", true)
    .replace("<p>G2DIRECT_REPRESENTATIVES_PROJECT</p>", g2directRepresentativesProjectHtml(workspace));
}
