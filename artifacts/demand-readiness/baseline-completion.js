function gate1CompanyDemandPositioningCompletionV357(workspace = state) {
  const total = 3;
  if (!workspace)
    return {
      status: "not_started",
      completed: 0,
      total,
      strategicFoundationReady: false,
      keywordFoundationReady: false,
      demandReady: false,
    };

  const strategicValues = [
    guruV185Text(guruV349ProjectBrandPurposeRecord(workspace, false)?.value),
    guruV185Text(guruV309ProjectSegmentRecord(workspace, false)?.value),
    guruV185Text(guruV308ProjectPositioningRecord(workspace, false)?.value),
    guruV185Text(guruV347ProjectCompanyOfferRecord(workspace, false)?.value),
    guruV185Text(guruCompanyPrimaryGoalV360(workspace)?.goalDescription),
  ];
  const strategicFoundationTouched = strategicValues.some(Boolean);
  const strategicFoundationReady = guruCompanyFullChainReadyV360(workspace);

  const keywordStats = guruCompanyKeywordFoundationStatsV351(workspace);
  const keywordModel = guruCompanyKeywordConfirmedModelV351(workspace);
  const keywordFoundationTouched = keywordStats.total > 0;
  const keywordFoundationReady = keywordModel.entries.length > 0;

  const demandModel = gate1CompanyBrandDemandReconcileV345(workspace);
  const demandRows = demandModel.rows.filter((row) =>
    guruV185Text(row?.kw)
  );
  const demandMetricFields = PV181_DEMAND_FIELDS_V272
    .map(([field]) => field)
    .filter((field) => field !== "kw");
  const demandTouched = demandRows.some((row) =>
    demandMetricFields.some((field) => guruV185Text(row?.[field]))
  );
  const demandReady = demandRows.length > 0 && demandRows.map((row) =>
    PV181_DEMAND_FIELDS_V272.map(([field, label]) => guruReadinessValue(guruV185Text(row?.[field]), {
      selector: `[data-pv181-company-demand-row-id-v345="${CSS.escape(row.id)}"][data-pv181-company-demand-field-v345="${field}"]`,
      label: `Спрос: ${row.kw}, ${label}`,
      group: { key: "company-demand-metrics", label: "Спрос: нет метрик", row: row.id, total: demandRows.length, noun: "слов" } })).every(Boolean)
  ).every(Boolean);

  const completed = [
    strategicFoundationReady,
    keywordFoundationReady,
    demandReady,
  ].filter(Boolean).length;
  const touched = strategicFoundationTouched ||
    keywordFoundationTouched || demandTouched;
  return {
    status: completed === total
      ? "ready"
      : touched
        ? "in_progress"
        : "not_started",
    completed,
    total,
    strategicFoundationReady,
    keywordFoundationReady,
    demandReady,
    strategicFoundationTouched,
    keywordFoundationTouched,
    demandTouched,
    demandRows: demandRows.length,
  };
}
