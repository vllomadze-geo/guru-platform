function projectComparisonStatus(model = ensureProjectComparison()) {
  if (!model) return { status: "not_started", filled: 0, total: 0 };
  const competitors = Array.isArray(model.competitors) ? model.competitors : [];
  const criteria = projectComparisonCompanyCriteria(model);
  const companyPrice = criteria.find(
    (criterion) =>
      (criterion?.coreKey || projectComparisonCoreDefinition(criterion)?.key) ===
      "price",
  );
  const summaryKeys = ["marketStronger", "ourStronger", "same"];
  const cells = competitors.flatMap((competitor) =>
    criteria.map((criterion) => guruReadinessValue(projectComparisonCell(criterion, competitor.id).text,
      { selector: `[data-project-comparison-cell="${CSS.escape(criterion.id)}"][data-project-comparison-owner="${CSS.escape(competitor.id)}"][data-project-comparison-field="text"]`,
        label: `${competitor.name || "Конкурент"}: ${criterion.name || "Критерий"}` })),
  );
  const values = [
    ...competitors.map((competitor) =>
      /^конкурент\s+\d+$/i.test(String(competitor.name || "").trim())
        ? ""
        : guruReadinessValue(competitor.name, { selector: `[data-project-comparison-competitor="${CSS.escape(competitor.id)}"][data-project-comparison-competitor-field="name"]`, label: "Название конкурента" }),
    ),
    ...cells,
    ...summaryKeys.map((key) => guruReadinessValue(model.summary?.[key], {
      selector: `[data-project-comparison-summary="${key}"]`,
      label: { marketStronger: "В чём рынок сильнее нас", ourStronger: "В чём мы сильнее рынка", same: "В чём мы одинаковы" }[key] })),
    projectComparisonCompanyKeyDifference(),
    companyPrice
      ? guruReadinessValue(projectComparisonCell(companyPrice, PROJECT_COMPARISON_OWN_ID).text,
        { selector: `[data-project-comparison-cell="${CSS.escape(companyPrice.id)}"][data-project-comparison-owner="${CSS.escape(PROJECT_COMPARISON_OWN_ID)}"][data-project-comparison-field="text"]`, label: "Наш проект: цена" })
      : "",
  ];
  const total = values.length;
  const filled = values.filter((value) => String(value || "").trim()).length;
  if (!filled) return { status: "not_started", filled, total };
  if (filled === total) return { status: "ready", filled, total };
  return { status: "in_progress", filled, total };
}
