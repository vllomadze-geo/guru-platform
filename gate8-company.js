/* Gate 8 company view. Product forecasts and company totals share the
 * g8ScenarioSetV3 / g8ComputeV3 calculation engine. Company state is separate
 * from gate8Forecast.byProduct and never allocates a company budget implicitly. */
const G8_COMPANY_SCENARIOS_V4 = ["base", "favorable", "unfavorable", "stress", "custom"];
const G8_COMPANY_TOTAL_KEYS_V4 = ["spend", "impressions", "clicks", "leads", "sales", "revenue", "profit"];
const G8_COMPANY_LABELS_V4 = {
  spend: "Расходы на рекламу", impressions: "Показы", clicks: "Клики",
  leads: "Заявки", sales: "Продажи", revenue: "Выручка", profit: "Прибыль",
  cpl: "CPL", cpa: "CPA", roi: "ROI", clickToLead: "Клик → заявка",
  leadToSale: "Заявка → продажа", averageCheck: "Средний чек",
};

function g8CompanyStateV4(root = ensureGate8Workspace()) {
  const base = state.gate8Forecast;
  base.companyForecast = base.companyForecast && typeof base.companyForecast === "object"
    ? base.companyForecast : {};
  const company = base.companyForecast;
  const defaults = g8DefaultPeriodV3(g8StrictGoalV3());
  company.periodStart = g8DateOnlyV3(company.periodStart) || defaults.start;
  company.periodEnd = g8DateOnlyV3(company.periodEnd) || defaults.end;
  company.resultMetric = GATE8_RESULTS.some(([key]) => key === company.resultMetric)
    ? company.resultMetric : "goal";
  company.open = { expect: true, action: true, scenario: true, data: false, history: false, ...(company.open || {}) };
  company.history = Array.isArray(company.history) ? company.history : [];
  return company;
}

function g8CompanyContributionV4(product, period, base) {
  // The company analysis normalizes Gate 8 once before iterating products.
  // Repeating that migration here also rebuilds the entire product catalogue
  // for every product, making an unrelated autosave block the main thread.
  const data = gate8EnsureProductStateV230(base, product.id);
  // A product-wide budget is counted once. With several campaigns there is no
  // implicit choice of one campaign's facts or allocation of the total budget.
  const context = g8CampaignContextV3(product, { campaignId: "" });
  const productData = context;
  const observations = g8ObservationsV3(product, context);
  const bundle = g8ParameterBundleV3(product, context, observations);
  const actual = g8ActualForPeriodV3(observations, period.start, period.end);
  const scenarios = g8ScenarioSetV3(bundle.parameters, observations, data, product, context.campaignId);
  const scenarioResults = Object.fromEntries(G8_COMPANY_SCENARIOS_V4.map((key) => {
    const definition = scenarios[key];
    const calculation = definition.available
      ? g8ComputeV3(definition.parameters, actual, period) : null;
    if (period.start > period.end && calculation) {
      calculation.errors.push({ key: "period", label: "Период", reason: "Дата начала позже окончания", gateId: "gate-8" });
      G8_COMPANY_TOTAL_KEYS_V4.forEach((metric) => { calculation.values[metric] = NaN; });
    }
    if (calculation && !bundle.parameters.budget.valid && !actual.rows.length)
      G8_COMPANY_TOTAL_KEYS_V4.forEach((metric) => { calculation.values[metric] = NaN; });
    if (calculation) {
      const ctr = g8RatioRecordV3(observations, "clicks", "impressions", {
        key: "ctr", label: "CTR", unit: "%", multiplier: 100,
      });
      calculation.values.impressions = Number.isFinite(calculation.values.clicks) && ctr?.valid && ctr.value > 0
        ? calculation.values.clicks / (ctr.value / 100) : NaN;
    }
    return [key, {
      available: Boolean(calculation),
      values: calculation?.values || {},
      used: calculation?.used || [],
      route: calculation?.route || "",
      errors: calculation?.errors || [],
      missing: calculation?.missing || [],
      changes: definition.changes || [],
      basis: definition.basis,
    }];
  }));
  return {
    project_id: activeProjectId || "",
    category_id: megaPlatformProductCategoryIds(product, state)[0] || "",
    product_id: product.id,
    productName: product.name || product.title || product.id,
    campaign_id: context.campaignId,
    campaignCount: productData.campaigns.length,
    campaignIds: productData.campaigns.map((campaign) => campaign.id),
    period,
    source: "Gate 4 → план; Gate 5 → факты; Gate 1 → экономика",
    updatedAt: [bundle.parameters.budget.updatedAt, ...observations.map((row) => row.updatedAt)]
      .filter(Boolean).sort().at(-1) || "",
    observations: observations.length,
    budget: bundle.parameters.budget,
    parameters: bundle.parameters,
    scenarios: scenarioResults,
    coverageIssue: context.needsSelection
      ? "Несколько кампаний: без правила распределения учитывается только бюджет продукта и доступные общие допущения. Факты кампаний не смешиваются."
      : "",
  };
}

function g8CompanyTotalsV4(contributions, scenarioKey) {
  const totals = {};
  for (const key of G8_COMPANY_TOTAL_KEYS_V4) {
    const included = contributions.filter((row) => Number.isFinite(row.scenarios[scenarioKey]?.values[key]));
    totals[key] = {
      value: included.length ? included.reduce((sum, row) => sum + row.scenarios[scenarioKey].values[key], 0) : NaN,
      included: included.map((row) => row.product_id),
      missing: contributions.filter((row) => !included.includes(row) || row.coverageIssue).map((row) => row.product_id),
      complete: Boolean(contributions.length && included.length === contributions.length &&
        contributions.every((row) => !row.coverageIssue)),
      source: "Сумма неповторяющихся прогнозов по product_id",
    };
  }
  const ratio = (key, numerator, denominator, multiplier = 1) => {
    const included = contributions.filter((row) => [numerator, denominator].every((metric) =>
      Number.isFinite(row.scenarios[scenarioKey]?.values[metric])));
    const top = included.reduce((sum, row) => sum + row.scenarios[scenarioKey].values[numerator], 0);
    const bottom = included.reduce((sum, row) => sum + row.scenarios[scenarioKey].values[denominator], 0);
    totals[key] = {
      value: included.length && bottom > 0 ? top / bottom * multiplier : NaN,
      included: included.map((row) => row.product_id),
      missing: contributions.filter((row) => !included.includes(row) || row.coverageIssue).map((row) => row.product_id),
      complete: Boolean(contributions.length && included.length === contributions.length && bottom > 0 &&
        contributions.every((row) => !row.coverageIssue)),
      source: `${G8_COMPANY_LABELS_V4[numerator]} ÷ ${G8_COMPANY_LABELS_V4[denominator]}`,
    };
  };
  ratio("cpl", "spend", "leads");
  ratio("cpa", "spend", "sales");
  ratio("roi", "profit", "spend", 100);
  ratio("clickToLead", "leads", "clicks", 100);
  ratio("leadToSale", "sales", "leads", 100);
  ratio("averageCheck", "revenue", "sales");
  return totals;
}

function g8CompanyAnalysisV4(root = ensureGate8Workspace()) {
  const data = g8CompanyStateV4(root);
  const goal = g8StrictGoalV3();
  const period = { start: data.periodStart, end: data.periodEnd };
  const metric = g8ResolvedMetric(data.resultMetric, goal) || goal.metric || "sales";
  const products = guruV194Products(state);
  const contributions = products.map((product) =>
    g8CompanyContributionV4(product, period, state.gate8Forecast));
  const scenarioResults = Object.fromEntries(G8_COMPANY_SCENARIOS_V4.map((key) =>
    [key, g8CompanyTotalsV4(contributions, key)]));
  const totals = scenarioResults.base;
  const selected = totals[metric] || { value: NaN, complete: false, included: [], missing: [] };
  const targetAligned = goal.valid && goal.metric === metric && goal.deadline === period.end;
  const reached = selected.complete && targetAligned
    ? g8MetricReachedV3(selected.value, { value: goal.target }, metric) : null;
  const plannedProductBudgets = contributions.filter((row) => row.budget.valid)
    .reduce((sum, row) => sum + row.budget.value, 0);
  const missing = [];
  if (!products.length) missing.push({ label: "В проекте нет продуктов", gateId: "gate-0", key: "product" });
  if (period.start > period.end) missing.push({ label: "Дата начала позже окончания", gateId: "gate-8", key: "period" });
  contributions.forEach((row) => {
    if (!row.budget.valid) missing.push({ label: `${row.productName}: бюджет продукта`, gateId: "gate-4", key: "budget", productId: row.product_id, campaignId: row.campaign_id });
    if (row.coverageIssue) missing.push({ label: `${row.productName}: ${row.coverageIssue}`, gateId: "gate-5", key: "campaign", productId: row.product_id });
    const calculation = row.scenarios.base;
    const issues = g8MissingForMetricV3(metric, calculation, row.parameters, { needsSelection: Boolean(row.coverageIssue) });
    issues.filter((item) => item.key !== "budget" && item.key !== "campaign").forEach((item) =>
      missing.push({ ...item, label: `${row.productName}: ${item.label || item.reason}`, productId: row.product_id, campaignId: row.campaign_id }));
  });
  if (!goal.valid) missing.push({ label: "Измеримая цель компании", gateId: "gate-0", key: "goal" });
  const recommendations = [];
  const risks = [];
  if (!selected.complete) risks.push("Не по всем продуктам есть сопоставимый результат: итог частичный.");
  if (goal.budgetRecord.valid && plannedProductBudgets > goal.budget)
    risks.push(`Планы продуктов превышают бюджет компании на ${g8Money(plannedProductBudgets - goal.budget)}.`);
  const costMetric = metric === "leads" ? "cpl" : metric === "sales" ? "cpa" : "";
  const actualCost = costMetric ? totals[costMetric] : null;
  if (costMetric && goal.allowedCostRecord.valid && actualCost?.complete && actualCost.value > goal.allowedCost) {
    risks.push(`${G8_COMPANY_LABELS_V4[costMetric]} ${g8Money(actualCost.value)} выше ограничения компании ${g8Money(goal.allowedCost)}.`);
    recommendations.push({ id: "company-cost-limit", what: `Снизить общий ${G8_COMPANY_LABELS_V4[costMetric]} до допустимого уровня`,
      basis: `Текущий прогноз: ${g8Money(actualCost.value)}; предел Gate 0: ${g8Money(goal.allowedCost)}.`,
      effect: `Для выполнения ограничения требуется снижение минимум на ${g8Money(actualCost.value - goal.allowedCost)} на результат.`,
      where: "Gate 4 → планы продуктов и кампаний", gateId: "gate-4" });
  }
  if (goal.budgetRecord.valid && plannedProductBudgets > goal.budget) recommendations.push({
    id: "company-budget-overrun", what: "Согласовать планы продуктов с общим бюджетом",
    basis: `Планы продуктов: ${g8Money(plannedProductBudgets)}; бюджет компании: ${g8Money(goal.budget)}.`,
    effect: `Устранить превышение ${g8Money(plannedProductBudgets - goal.budget)} без повторного учёта общего бюджета.`,
    where: "Gate 4 → бюджеты продуктов", gateId: "gate-4",
  });
  const comparable = contributions.filter((row) => row.observations >= 3 &&
    Number.isFinite(row.scenarios.base.values.cpa) && row.scenarios.base.values.sales > 0);
  if (comparable.length >= 2) {
    const ordered = comparable.slice().sort((a, b) => a.scenarios.base.values.cpa - b.scenarios.base.values.cpa);
    if (ordered.at(-1).scenarios.base.values.cpa > ordered[0].scenarios.base.values.cpa * 1.2)
      recommendations.push({
        id: "company-cost-comparison", what: "Проверить перераспределение тестового бюджета между продуктами",
        basis: `${ordered[0].productName}: CPA ${g8Money(ordered[0].scenarios.base.values.cpa)}; ${ordered.at(-1).productName}: ${g8Money(ordered.at(-1).scenarios.base.values.cpa)}. У обоих есть не менее трёх наблюдений.`,
        effect: "Потенциальное снижение общего CPA; величина эффекта не рассчитана без данных о предельном спросе.",
        where: "Gate 4 → планы кампаний; затем проверить факт в Gate 5", gateId: "gate-4",
      });
  }
  const assignedCampaignIds = new Set(contributions.flatMap((row) => row.campaignIds));
  const unassignedCampaigns = (state?.gate5?.campaignRegistry || []).filter((campaign) =>
    !assignedCampaignIds.has(campaign.id));
  const unassignedSpend = unassignedCampaigns.reduce((sum, campaign) => {
    const snapshots = g5CanonicalPeriodSnapshots(state.gate5, campaign.id)
      .map((row) => ({ ...row, periodEnd: row.periodEnd || row.date,
        updatedAt: row.updatedAt || row.createdAt || "" }))
      .filter((row) => row.periodStart >= period.start && row.periodEnd <= period.end);
    return sum + g8NonOverlappingV3(snapshots).reduce((part, row) => {
      const spend = g8OwnNumericV3(row, ["spend", "cost"]);
      return part + (spend.valid ? spend.value : 0);
    }, 0);
  }, 0);
  return {
    scope: "company", data, goal, period, metric, contributions, scenarioResults,
    totals, selected, reached, targetAligned, missing, recommendations, risks,
    plannedProductBudgets,
    budgetGap: goal.budgetRecord.valid ? goal.budget - plannedProductBudgets : NaN,
    probability: { available: false, reason: "Общая вероятность не выводится из вероятностей продуктов: для неё нужна сопоставимая совместная история." },
    commonExpenses: {
      unassignedSpend, unassignedCampaigns: unassignedCampaigns.length,
      source: "Gate 5 → кампании без точной привязки к product_id",
      includedInForecast: false,
      rule: "Не прибавлять к расходам продуктов до явной привязки или правила распределения; возможное пересечение с импортами проверяется отдельно.",
    },
    method: "Прогноз каждого product_id рассчитан единым движком; абсолютные значения суммируются один раз на продукт, отношения пересчитываются из итоговых числителей и знаменателей.",
  };
}

function g8CompanyValueV4(metric, value) {
  if (!Number.isFinite(value)) return "Недостаточно данных";
  if (["spend", "revenue", "profit", "cpl", "cpa", "averageCheck"].includes(metric)) return g8Money(value);
  if (["roi", "clickToLead", "leadToSale"].includes(metric)) return g8Percent(value);
  return g8FormatValueV3(metric, value);
}

function g8CompanySourceV4(item, analysis) {
  if (item.key === "goal") {
    const target = { gateId: "gate-0", kind: "gate0-company-goal", cardId: G8_PROJECT_GOAL_CARD_ID,
      goalId: guruCompanyPrimaryGoalV360(state)?.id || "",
      field: analysis.goal.metric ? "goalTargetValue" : "goalMetric" };
    return `<button type="button" class="g8-link" data-g8-v3-source="${escapeAttr(JSON.stringify(target))}">Указать цель →</button>`;
  }
  if (item.key === "product") return g8JumpButton("gate-0", "Добавить продукт");
  if (item.key === "period") return `<button type="button" class="g8-link" data-g8-company-focus-period>Исправить период →</button>`;
  const product = guruV194Product(item.productId, state);
  const contribution = analysis.contributions.find((row) => row.product_id === item.productId);
  const target = item.key === "campaign"
    ? { gateId: "gate-5", kind: "gate5-import-v3", block: "input", productId: item.productId }
    : g8SourceTargetV3(item, { context: { product, campaignId: item.campaignId || "" }, parameters: contribution?.parameters || {} });
  return `<button type="button" class="g8-link" data-g8-v3-source="${escapeAttr(JSON.stringify(target))}">Открыть источник →</button>`;
}

function g8CompanyResultHtmlV4(analysis) {
  const selected = analysis.selected;
  const coverage = `${selected.included.length} из ${analysis.contributions.length} продуктов`;
  const result = Number.isFinite(selected.value)
    ? `${g8CompanyValueV4(analysis.metric, selected.value)}${selected.complete ? "" : " · частичный результат"}`
    : "Пока не рассчитан";
  const comparison = analysis.reached === null
    ? analysis.targetAligned ? "Сравнение с целью появится после полного расчёта." : "Для сравнения нужны совпадающие метрика и срок цели компании."
    : analysis.reached ? "Прогноз достигает цели компании." : "Прогноз ниже цели компании.";
  const funnel = ["impressions", "clicks", "leads", "sales", "revenue", "profit"];
  return `<div class="g8-company-result">
    <div class="g8-company-result-main"><span>${escapeHtml(G8_COMPANY_LABELS_V4[analysis.metric] || g8MetricLabel(analysis.metric))} · ${escapeHtml(g8DateLabel(analysis.period.start))} — ${escapeHtml(g8DateLabel(analysis.period.end))}</span><strong>${escapeHtml(result)}</strong><b>${escapeHtml(comparison)}</b><small>Покрытие: ${escapeHtml(coverage)}. ${escapeHtml(analysis.method)}</small></div>
    <div class="g8-company-funnel">${funnel.map((key) => {
      const row = analysis.totals[key];
      return `<div><span>${escapeHtml(G8_COMPANY_LABELS_V4[key])}</span><b>${escapeHtml(g8CompanyValueV4(key, row.value))}</b><small>${row.complete ? "Все продукты" : `Частично · ${row.included.length} из ${analysis.contributions.length}`}</small></div>`;
    }).join("")}</div>
    <div class="g8-company-ratios">${["cpl", "cpa", "roi", "clickToLead", "leadToSale", "averageCheck"].map((key) => {
      const row = analysis.totals[key];
      return `<span>${escapeHtml(G8_COMPANY_LABELS_V4[key])}: <b>${escapeHtml(g8CompanyValueV4(key, row.value))}</b>${row.complete ? "" : " · частично"}</span>`;
    }).join("")}</div>
    <p class="g8-company-note">Общий бюджет компании ${analysis.goal.budgetRecord.valid ? escapeHtml(g8Money(analysis.goal.budget)) : "не указан"}; планы продуктов ${escapeHtml(g8Money(analysis.plannedProductBudgets))}. Общий бюджет служит ограничением и не прибавляется к расходам продуктов.</p>
    <p class="g8-company-note">Неразнесённые расходы Gate 5: ${escapeHtml(g8Money(analysis.commonExpenses.unassignedSpend))} по ${analysis.commonExpenses.unassignedCampaigns} кампаниям. ${escapeHtml(analysis.commonExpenses.rule)}</p>
    ${analysis.risks.length ? `<div class="g8-company-risks"><strong>Риски и ограничения</strong><ul>${analysis.risks.map((risk) => `<li>${escapeHtml(risk)}</li>`).join("")}</ul></div>` : ""}
    <p class="g8-company-note">${escapeHtml(analysis.probability.reason)}</p>
  </div>`;
}

function g8CompanyContributionsHtmlV4(analysis) {
  if (!analysis.contributions.length) return "";
  return `<div class="g8-company-contributions"><h4>Вклад продуктов</h4><div class="g8-company-contribution-list">${analysis.contributions.map((row) => {
    const value = row.scenarios.base.values[analysis.metric];
    const status = row.coverageIssue || (Number.isFinite(value) ? "Прогноз по выбранному периоду" : "Для этой метрики данных пока недостаточно");
    return `<div class="g8-company-contribution"><div><strong>${escapeHtml(row.productName)}</strong><small>product_id: ${escapeHtml(row.product_id)} · ${row.campaignCount} кампаний · ${row.observations} периодов</small></div><div><b>${escapeHtml(g8CompanyValueV4(analysis.metric, value))}</b><small>${escapeHtml(status)}</small></div><button type="button" class="g8-link" data-g8-company-product="${escapeAttr(row.product_id)}">Открыть продукт →</button></div>`;
  }).join("")}</div></div>`;
}

function g8CompanyDataHtmlV4(analysis) {
  return `<div class="g8-company-data"><p>${escapeHtml(analysis.method)}</p>${analysis.contributions.map((row) => `<article><strong>${escapeHtml(row.productName)}</strong><span>${escapeHtml(row.source)}</span><span>project_id: ${escapeHtml(row.project_id)} · category_id: ${escapeHtml(row.category_id || "—")} · product_id: ${escapeHtml(row.product_id)} · campaign_id: ${escapeHtml(row.campaign_id || "—")}</span><span>Период: ${escapeHtml(row.period.start)} — ${escapeHtml(row.period.end)} · обновлено: ${escapeHtml(g8DateLabel(row.updatedAt))}</span><span>Бюджет: ${escapeHtml(g8UnitValueV3(row.budget))} · ${escapeHtml(row.budget.kind)} · ${escapeHtml(row.budget.source)}</span><span>Метод: ${escapeHtml(row.scenarios.base.route || "Расчёт недоступен")}</span></article>`).join("")}</div>`;
}

function g8CompanySnapshotActualV4(snapshot) {
  if (!snapshot?.period?.end || snapshot.period.end >= new Date().toISOString().slice(0, 10))
    return { available: false, reason: "Период ещё не завершён" };
  const contributions = (snapshot.contributions || []).map((saved) => {
    const product = guruV194Product(saved.product_id, state);
    const projected = product && g8ProductDataV3(product);
    const campaign = projected?.campaigns.find((row) => row.id === saved.campaign_id);
    const context = { ...(projected || {}), campaign, campaignId: campaign?.id || "" };
    const observations = campaign ? g8ObservationsV3(product, context) : [];
    const rows = g8ActualForPeriodV3(observations, snapshot.period.start, snapshot.period.end);
    const values = Object.fromEntries(G8_COMPANY_TOTAL_KEYS_V4.map((key) => [key, NaN]));
    for (const key of ["spend", "clicks", "leads", "sales", "revenue"])
      if (rows[key]?.present) values[key] = rows[key].value;
    const impressions = rows.rows.filter((row) => row.impressions?.valid);
    if (rows.rows.length && impressions.length === rows.rows.length)
      values.impressions = impressions.reduce((sum, row) => sum + row.impressions.value, 0);
    if (Number.isFinite(values.revenue) && Number.isFinite(values.spend) &&
        Number.isFinite(saved.marginPercent))
      values.profit = values.revenue * saved.marginPercent / 100 - values.spend;
    return { product_id: saved.product_id, coverageIssue: !campaign || !rows.rows.length ? "Нет точного факта" : "",
      scenarios: { base: { values } } };
  });
  const result = g8CompanyTotalsV4(contributions, "base")[snapshot.metric];
  return result && Number.isFinite(result.value)
    ? { available: true, value: result.value, complete: result.complete,
      included: result.included.length, total: contributions.length }
    : { available: false, reason: "Нет подтверждённых данных для этой метрики и периода" };
}

function g8CompanyHistoryHtmlV4(analysis) {
  const rows = analysis.data.history.slice().reverse();
  return `<div class="g8-company-history"><button type="button" class="secondary-btn" data-g8-company-snapshot>Зафиксировать прогноз компании</button><small>Снимок сохраняет результат и основания. Изменение сценария не меняет прошлые записи.</small>${rows.map((row) => {
    const actual = g8CompanySnapshotActualV4(row);
    return `<article><strong>${escapeHtml(g8DateLabel(row.createdAt))} · ${escapeHtml(G8_COMPANY_LABELS_V4[row.metric] || row.metric)}</strong><span>Прогноз: ${escapeHtml(g8CompanyValueV4(row.metric, Number.isFinite(row.value) ? row.value : NaN))} · ${row.complete ? "полный" : "частичный"}</span><span>Факт: ${actual.available ? `${escapeHtml(g8CompanyValueV4(row.metric, actual.value))}${actual.complete ? "" : ` · частично (${actual.included} из ${actual.total})`}` : escapeHtml(actual.reason)}</span><small>${escapeHtml(row.period?.start || "")} — ${escapeHtml(row.period?.end || "")} · ${row.contributions?.length || 0} продуктов</small></article>`;
  }).join("")}</div>`;
}

function g8CompanyExpectHtmlV4(analysis) {
  return `${g8CompanyResultHtmlV4(analysis)}
    ${analysis.missing.length ? `<section class="g8-required-data has-missing"><strong>Что мешает полному прогнозу</strong><div>${analysis.missing.map((item) => `<div class="g8-required-row"><span>${escapeHtml(item.label)}</span>${g8CompanySourceV4(item, analysis)}</div>`).join("")}</div></section>` : ""}
    ${g8CompanyContributionsHtmlV4(analysis)}
    <div class="g8-expect-tools"><details class="g8-company-subdetail" data-g8-company-subdetail="data" ${analysis.data.open.data ? "open" : ""}><summary>Данные и расчёт</summary>${g8CompanyDataHtmlV4(analysis)}</details><details class="g8-company-subdetail" data-g8-company-subdetail="history" ${analysis.data.open.history ? "open" : ""}><summary>История: прогноз и факт</summary><div data-g8-company-history-slot>${analysis.data.open.history ? g8CompanyHistoryHtmlV4(analysis) : ""}</div></details></div>`;
}

function g8CompanyActionsHtmlV4(analysis) {
  if (!analysis.recommendations.length) return `<div class="g8-empty"><strong>Обоснованных рекомендаций по распределению пока нет.</strong><span>Сначала нужны сопоставимые результаты продуктов. Недостающие источники перечислены в «Чего ожидать».</span></div>`;
  return `<div class="g8-recommendations">${analysis.recommendations.map((item) => `<article class="g8-recommendation"><div class="g8-recommendation-copy"><strong>${escapeHtml(item.what)}</strong><dl><div><dt>Почему</dt><dd>${escapeHtml(item.basis)}</dd></div><div><dt>Ожидаемый эффект</dt><dd>${escapeHtml(item.effect)}</dd></div><div><dt>Где реализовать</dt><dd>${escapeHtml(item.where)}</dd></div></dl></div>${g8JumpButton(item.gateId, "Открыть Gate")}</article>`).join("")}</div>`;
}

function g8CompanyScenariosHtmlV4(analysis) {
  return `<div class="g8-company-scenarios">${G8_COMPANY_SCENARIOS_V4.map((key) => {
    const totals = analysis.scenarioResults[key];
    const result = totals[analysis.metric];
    const available = Number.isFinite(result.value);
    const changed = analysis.contributions.filter((row) => row.scenarios[key].changes.length);
    const budgetRisk = analysis.goal.budgetRecord.valid && totals.spend.complete && totals.spend.value > analysis.goal.budget
      ? `Расходы выше бюджета компании на ${g8Money(totals.spend.value - analysis.goal.budget)}.` : "";
    return `<article class="g8-scenario-card ${available ? "is-available" : "is-unavailable"}" data-g8-company-scenario="${escapeAttr(key)}"><header><div><strong>${escapeHtml(G8_SCENARIO_LABELS_V4[key])}</strong><span>${escapeHtml(analysis.period.start)} — ${escapeHtml(analysis.period.end)}</span></div><span class="g8-scenario-status">${result.complete ? "Все продукты" : `Частично · ${result.included.length} из ${analysis.contributions.length}`}</span></header><div class="g8-scenario-metrics"><div><span>${escapeHtml(G8_COMPANY_LABELS_V4[analysis.metric] || g8MetricLabel(analysis.metric))}</span><b>${escapeHtml(g8CompanyValueV4(analysis.metric, result.value))}</b></div><div><span>Расходы продуктов</span><b>${escapeHtml(g8CompanyValueV4("spend", totals.spend.value))}</b></div><div><span>Разница с базой</span><b>${available && Number.isFinite(analysis.selected.value) ? escapeHtml(g8CompanyValueV4(analysis.metric, result.value - analysis.selected.value)) : "Недоступна"}</b></div><div><span>Разница с целью компании</span><b>${available && analysis.targetAligned && result.complete ? escapeHtml(g8CompanyValueV4(analysis.metric, result.value - analysis.goal.target)) : "Недоступна"}</b></div></div><p class="g8-scenario-note">${key === "base" ? "Текущие факты и утверждённые планы." : changed.length ? `Сценарные изменения: ${changed.map((row) => row.productName).join(", ")}.` : key === "custom" ? "Настройте пользовательские условия в продуктах: исходные данные не меняются." : "Не хватает сопоставимых фактических периодов для этого варианта."} ${budgetRisk ? escapeHtml(budgetRisk) : ""}</p>${key === "custom" ? `<div class="g8-company-custom-links">${analysis.contributions.map((row) => `<button type="button" class="g8-link" data-g8-company-product="${escapeAttr(row.product_id)}">${escapeHtml(row.productName)} →</button>`).join("")}</div>` : ""}</article>`;
  }).join("")}</div>`;
}

function g8CompanySectionV4(key, title, body, analysis) {
  return `<details class="g8-workbench-section is-primary g8-company-section" data-g8-company-section="${escapeAttr(key)}" ${analysis.data.open[key] ? "open" : ""}><summary class="g8-workbench-section-head"><span>${escapeHtml(title)}</span><span class="g8-workbench-section-meta"><b aria-hidden="true">⌄</b></span></summary><div class="g8-workbench-section-body">${body}</div></details>`;
}

function g8CompanyHtmlV4(analysis) {
  const status = analysis.selected.complete && Number.isFinite(analysis.selected.value)
    ? "Рассчитано" : "Частичный прогноз";
  return `${gate0SectionHeadingHtml("Компания", "Цель, итоговая проверка и прогноз по всем продуктам.")}
    ${g8GoalCardV5("company", analysis.goal)}
    ${g8AuditHtmlV1("company", analysis)}
    <section class="g8-model" data-g8-model-scope="company" aria-label="Прогноз и моделирование компании">
      <header class="g8-model-heading"><h3>Прогноз и моделирование</h3></header>
      <div class="g8-company-context"><label><span>Период прогноза</span><div class="g8-period-inputs"><input type="date" data-g8-company-period="periodStart" value="${escapeAttr(analysis.period.start)}" aria-label="Начало периода компании"><span>—</span><input type="date" data-g8-company-period="periodEnd" value="${escapeAttr(analysis.period.end)}" aria-label="Конец периода компании"></div></label><label><span>Показатель прогноза</span><select data-g8-company-metric>${GATE8_RESULTS.map(([key, label]) => `<option value="${escapeAttr(key)}" ${analysis.data.resultMetric === key ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select></label><div class="g8-company-status"><span>Состояние</span><strong>${escapeHtml(status)}</strong><small>${analysis.contributions.length} продуктов · ${analysis.selected.included.length} с результатом</small></div></div>
      <div class="g8-primary-stack">${g8CompanySectionV4("expect", "Чего ожидать", g8CompanyExpectHtmlV4(analysis), analysis)}${g8CompanySectionV4("action", "Что сделать", g8CompanyActionsHtmlV4(analysis), analysis)}${g8CompanySectionV4("scenario", "Что изменится, если…", g8CompanyScenariosHtmlV4(analysis), analysis)}</div>
    </section>`;
}

function g8CompanyRefreshV4() {
  if (activeView !== "gate" || activeGateId !== "gate-8") return;
  const section = els.contentArea.querySelector('.g8-workbench [data-gate-scope="company"]');
  if (!section) return;
  const analysis = g8CompanyAnalysisV4();
  section.innerHTML = g8CompanyHtmlV4(analysis);
  const open = state?.ui?.gateScopeOpenV526?.["gate-8"]?.company !== false;
  gate0SetSectionOpen("company", open);
}

function g8CombinedStatusV4(company = g8CompanyAnalysisV4(), product = g8AnalysisV3()) {
  if (company.period.start > company.period.end)
    return { key: "invalid", label: "Требуется исправить период", systemStatus: "problem" };
  const companyReady = company.selected.complete && Number.isFinite(company.selected.value);
  const productReady = Number.isFinite(product.value);
  if (companyReady && productReady && company.goal.valid)
    return { key: "calculated", label: "Рассчитано", systemStatus: "ready" };
  if (companyReady && !productReady)
    return { key: "company-only", label: "Компания рассчитана", systemStatus: "in_progress" };
  if (companyReady || productReady)
    return { key: "partial", label: "Частичный прогноз", systemStatus: "in_progress" };
  return { key: "missing", label: "Не хватает данных", systemStatus: "not_started" };
}

// The navigation only needs the selected product's base result. Keep its
// inputs and calculation identical to g8AnalysisV3, without collecting the
// entire Gate 0–7 fact report and all five presentation scenarios.
function g8ProductStatusV4(data = ensureGate8Workspace()) {
  const product = data?.product_id
    ? guruV194Product(data.product_id, state)
    : null;
  const goal = g8ProductGoalV4(product);
  const compact = g8CompactStateV3(product, goal, data);
  const context = g8CampaignContextV3(product, compact);
  const observations = g8ObservationsV3(product, context);
  const parameters = g8ParameterBundleV3(product, context, observations).parameters;
  const period = { start: compact.periodStart, end: compact.periodEnd };
  const periodValid = Boolean(period.start && period.end && period.start <= period.end);
  const actual = periodValid
    ? g8ActualForPeriodV3(observations, period.start, period.end)
    : g8ActualForPeriodV3([], "", "");
  const base = g8PresetParametersV3("base", parameters, observations);
  const metric = g8ResolvedMetric(data.resultMetric, goal) || goal.metric || "sales";
  return { value: g8ComputeV3(base.parameters, actual, period).values[metric] };
}

g8BlockStatuses = function (analysis = null) {
  const root = ensureGate8Workspace();
  return [g8CombinedStatusV4(g8CompanyAnalysisV4(root), analysis || g8ProductStatusV4(root)).systemStatus];
};

const __g8CompanyPreviousRenderForecastV4 = renderGate8Forecast;
renderGate8Forecast = function () {
  __g8CompanyPreviousRenderForecastV4.apply(this, arguments);
  g8CompanyRefreshV4();
  // The shared export control is part of the Gate, including this custom view.
  guruDebugEnsureToolbarButtonV119();
};

document.addEventListener("change", (event) => {
  const period = event.target?.dataset?.g8CompanyPeriod;
  const metric = event.target?.matches?.("[data-g8-company-metric]");
  if (!period && !metric) return;
  const company = g8CompanyStateV4();
  if (period) company[period] = event.target.value;
  if (metric) company.resultMetric = event.target.value;
  company.updatedAt = new Date().toISOString();
  guruPersistStateFast({ durable: true });
  g8CompanyRefreshV4();
}, true);

document.addEventListener("click", (event) => {
  const summary = event.target?.closest?.("summary");
  const disclosure = summary?.parentElement;
  if (disclosure?.matches?.("[data-g8-company-section], [data-g8-company-subdetail]")) {
    requestAnimationFrame(() => {
      if (!disclosure.isConnected || !els.contentArea.contains(disclosure)) return;
      const key = disclosure.dataset.g8CompanySection || disclosure.dataset.g8CompanySubdetail;
      const company = g8CompanyStateV4();
      if (company.open[key] === disclosure.open) return;
      company.open[key] = disclosure.open;
      if (key === "history" && disclosure.open)
        disclosure.querySelector("[data-g8-company-history-slot]").innerHTML = g8CompanyHistoryHtmlV4({ data: company });
      guruScheduleUiPreferenceSave();
    });
  }
  const productButton = event.target?.closest?.("[data-g8-company-product]");
  if (productButton) {
    const product = guruV194Product(productButton.dataset.g8CompanyProduct, state);
    if (!product) return;
    const ui = guruV194Ui(state);
    ui.selectedProductId = product.id;
    ui.selectedCategoryId = megaPlatformProductCategoryIds(product, state)[0] || "__uncategorized__";
    guruScheduleUiPreferenceSave();
    renderGate();
    requestAnimationFrame(() => els.contentArea.querySelector('[data-gate-scope="product"]')
      ?.scrollIntoView({ behavior: "smooth", block: "start" }));
    return;
  }
  if (event.target?.closest?.("[data-g8-company-focus-period]")) {
    els.contentArea.querySelector('[data-g8-company-period="periodStart"]')?.focus();
    return;
  }
  if (event.target?.closest?.("[data-g8-company-snapshot]")) {
    const analysis = g8CompanyAnalysisV4();
    analysis.data.history.push({
      id: makeId("g8-company-snapshot"),
      createdAt: new Date().toISOString(),
      project_id: activeProjectId || "",
      period: { ...analysis.period }, metric: analysis.metric,
      value: analysis.selected.value, complete: analysis.selected.complete,
      target: analysis.targetAligned ? analysis.goal.target : null,
      contributions: analysis.contributions.map((row) => ({
        product_id: row.product_id, campaign_id: row.campaign_id,
        value: row.scenarios.base.values[analysis.metric],
        marginPercent: row.parameters.margin?.valid ? row.parameters.margin.value : null,
        method: row.scenarios.base.route, source: row.source,
      })),
      modelVersion: GATE8_WORKBENCH_VERSION,
    });
    guruPersistStateFast({ durable: true });
    g8CompanyRefreshV4();
  }
}, true);

function g8ResolvedForecastExportV4() {
  const live = state;
  try {
    state = guruExportDiagnosticCloneV223(live);
    const company = g8CompanyAnalysisV4();
    const product = g8AnalysisV3();
    return {
      modelVersion: GATE8_WORKBENCH_VERSION,
      generatedAt: new Date().toISOString(),
      company: {
        project_id: activeProjectId || "", period: company.period, goal: company.goal,
        metric: company.metric, selected: company.selected, reached: company.reached,
        totals: company.totals, scenarioResults: company.scenarioResults,
        contributions: company.contributions, missing: company.missing,
        recommendations: company.recommendations, risks: company.risks, commonExpenses: company.commonExpenses,
        budgetGap: company.budgetGap, method: company.method,
        probability: company.probability,
        history: company.data.history,
        audit: typeof g8AuditQuestionsV1 === "function" ? g8AuditQuestionsV1("company", company) : [],
      },
      product: {
        project_id: activeProjectId || "",
        category_id: product.context.product
          ? megaPlatformProductCategoryIds(product.context.product, state)[0] || "" : "",
        product_id: product.context.product?.id || "",
        campaign_id: product.context.campaignId,
        period: product.period, goal: product.goal, metric: product.metric,
        value: product.value, reached: product.reached,
        calculation: product.calculation, parameters: product.parameters,
        scenarioResults: product.scenarioResults,
        missing: product.missingData, recommendations: product.recommendations,
        probability: product.probability, history: product.data.history,
        audit: typeof g8AuditQuestionsV1 === "function" ? g8AuditQuestionsV1("product", product) : [],
      },
    };
  } finally {
    state = live;
  }
}

const __g8CompanyPreviousGatePayloadV4 = guruGateContentPayloadV120;
guruGateContentPayloadV120 = function (gateId = activeGateId) {
  const payload = __g8CompanyPreviousGatePayloadV4.apply(this, arguments);
  if (gateId === "gate-8") payload.resolvedForecast = g8ResolvedForecastExportV4();
  return payload;
};
window.guruGateContentPayload = guruGateContentPayloadV120;

const __g8CompanyPreviousProjectPayloadV4 = guruExportProjectPayloadV223;
guruExportProjectPayloadV223 = function () {
  const payload = __g8CompanyPreviousProjectPayloadV4.apply(this, arguments);
  const gate8 = payload.gates.find((gate) => gate.exportedGateId === "gate-8");
  if (gate8) gate8.resolvedForecast = g8ResolvedForecastExportV4();
  return payload;
};
window.guruExportProjectPayload = guruExportProjectPayloadV223;

if (GURU_EXPORT_CODE_REFERENCES_V223?.["gate-8"]) {
  GURU_EXPORT_CODE_REFERENCES_V223["gate-8"].push({
    file: "gate8-company.js", line: 1, symbol: "g8CompanyAnalysisV4",
    role: "Company aggregation and resolved Gate 8 export over the shared product forecast engine",
  });
}
