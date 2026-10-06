/* Gate 8 compact workbench — evidence-first forecast model.
 *
 * Loaded after app.js on purpose: the legacy implementation remains readable
 * for old snapshots and exports, while these final overrides are the only
 * active Gate 8 analysis and renderer. No benchmark values are introduced.
 */
const GATE8_WORKBENCH_VERSION = "gate8-evidence-model-v3.2";
const GATE8_WORKBENCH_MIGRATION = "gate8-visible-scenarios-workbench-v5";
const GATE8_SECTION_DEFAULTS = Object.freeze({
  expect: true,
  action: true,
  scenario: true,
  data: false,
  history: false,
  moreRecommendations: false,
});
const GATE8_LEGACY_SECTION_MAP = Object.freeze([
  ["1. Цель проекта", "Верхняя панель · Цель"],
  ["2. Что прогнозируем", "Верхняя панель · Цель / выбранный результат"],
  ["3. Полнота данных", "Данные и расчёт · только поля активной формулы"],
  ["4. Готовность проекта", "Чего ожидать · конкретное ограничение запуска"],
  ["5. Надёжность прогноза", "Чего ожидать · основание и объём наблюдений"],
  ["6. Прогнозируемый результат", "Чего ожидать"],
  ["7. Вероятность достижения цели", "Чего ожидать · только при фактической выборке"],
  ["8. Базовый сценарий", "Что изменится, если… · Базовый"],
  ["9. Позитивный сценарий", "Что изменится, если… · Благоприятный"],
  ["10. Негативный сценарий", "Что изменится, если… · Неблагоприятный"],
  ["11. Стрессовый сценарий", "Что изменится, если… · Стрессовый"],
  ["12. Создать свой сценарий", "Что изменится, если… · Пользовательский"],
  ["13. Что сильнее всего влияет", "Что изменится, если… · изменённые параметры"],
  ["14. Что помогает", "Что сделать · обоснованные рекомендации"],
  ["15. Что мешает", "Что сделать · ограничения"],
  ["16. Главный риск", "Что сделать · основание рекомендации"],
  ["17. Главное действие", "Что сделать · первая рекомендация"],
  ["18. Создать задачу", "Что сделать · кнопка у каждой рекомендации"],
  ["19. История прогнозов", "История: прогноз и факт"],
  ["20. Сравнение с фактом", "История: прогноз и факт"],
]);

function g8TextV3(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function g8NumericV3(raw, { nonNegative = true, maximum = Infinity } = {}) {
  const text = g8TextV3(raw);
  if (!text) return { present: false, valid: false, value: NaN, raw, error: "Значение не задано" };
  const normalized = text
    .replace(/\u00a0/g, "")
    .replace(/\s+/g, "")
    .replace(",", ".")
    .replace(/[₽%]/g, "");
  const value = Number(normalized);
  if (!Number.isFinite(value)) return { present: true, valid: false, value: NaN, raw, error: "Нужно указать число" };
  if (nonNegative && value < 0) return { present: true, valid: false, value, raw, error: "Отрицательное значение недопустимо" };
  if (value > maximum) return { present: true, valid: false, value, raw, error: `Значение не может быть больше ${maximum}` };
  return { present: true, valid: true, value, raw, error: "" };
}

function g8OwnNumericV3(object, keys, options) {
  for (const key of keys) {
    if (!object || !Object.prototype.hasOwnProperty.call(object, key)) continue;
    const parsed = g8NumericV3(object[key], options);
    if (parsed.present) return { ...parsed, key };
  }
  return { present: false, valid: false, value: NaN, raw: undefined, key: "", error: "Значение не задано" };
}

function g8MetricRecordV3(key, label, unit, parsed, metadata = {}) {
  return {
    key,
    label,
    unit,
    value: parsed?.value,
    raw: parsed?.raw,
    present: Boolean(parsed?.present),
    valid: Boolean(parsed?.valid),
    error: parsed?.error || "",
    kind: metadata.kind || "assumption",
    source: metadata.source || "Источник не указан",
    periodStart: metadata.periodStart || "",
    periodEnd: metadata.periodEnd || "",
    updatedAt: metadata.updatedAt || "",
    productId: metadata.productId || "",
    campaignId: metadata.campaignId || "",
    observations: Number(metadata.observations || 0),
    note: metadata.note || "",
  };
}

function g8DerivedRecordV3(key, label, unit, value, metadata = {}) {
  return g8MetricRecordV3(
    key,
    label,
    unit,
    { present: Number.isFinite(value), valid: Number.isFinite(value), value, raw: value, error: "" },
    metadata,
  );
}

function g8DateOnlyV3(value) {
  const text = g8TextV3(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && Number.isFinite(Date.parse(`${text}T00:00:00Z`)) ? text : "";
}

function g8DefaultPeriodV3(goal) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
  const deadline = g8DateOnlyV3(goal?.deadline);
  return { start: today, end: deadline && deadline >= today ? deadline : monthEnd };
}

function g8CompactStateV3(product = guruV194SelectedProduct(state), goal = null) {
  const root = ensureGate8Workspace();
  if (!root) return null;
  const base = state.gate8Forecast;
  const holder = product
    ? gate8EnsureProductStateV230(base, product.id)
    : base;
  const defaults = g8DefaultPeriodV3(goal);
  holder.compactV3 = holder.compactV3 && typeof holder.compactV3 === "object" ? holder.compactV3 : {};
  const compact = holder.compactV3;
  compact.schemaVersion = 3;
  compact.open = { ...GATE8_SECTION_DEFAULTS, ...(compact.open || {}), scenario: true };
  compact.periodStart = g8DateOnlyV3(compact.periodStart) || defaults.start;
  compact.periodEnd = g8DateOnlyV3(compact.periodEnd) || defaults.end;
  compact.campaignId = g8TextV3(compact.campaignId);
  // Сценарии больше не переключаются: все пять вариантов рассчитываются и
  // отображаются одновременно. Старое UI-состояние не должно выбирать или
  // скрывать один из них.
  compact.scenario = "base";
  compact.updatedAt = compact.updatedAt || "";
  base.migrationLog = Array.isArray(base.migrationLog) ? base.migrationLog : [];
  if (!base.migrationLog.some((entry) => entry?.id === GATE8_WORKBENCH_MIGRATION)) {
    base.migrationLog.push({
      id: GATE8_WORKBENCH_MIGRATION,
      appliedAt: new Date().toISOString(),
      description: "20 legacy sections mapped to three calculation-driven workbench blocks; all five scenarios are visible together, while data details and history remain nested inside the forecast block. Existing manual values, tasks and history retained in place.",
      legacyMap: GATE8_LEGACY_SECTION_MAP,
    });
  }
  return compact;
}

const __g8WorkbenchPreviousEnsureWorkspace = ensureGate8Workspace;
ensureGate8Workspace = function (workspace = state) {
  const result = __g8WorkbenchPreviousEnsureWorkspace(workspace);
  if (workspace === state && result && state?.gate8Forecast) {
    const product = guruV194SelectedProduct(state);
    const holder = product
      ? gate8EnsureProductStateV230(state.gate8Forecast, product.id)
      : state.gate8Forecast;
    holder.compactV3 = holder.compactV3 && typeof holder.compactV3 === "object" ? holder.compactV3 : {};
  }
  return result;
};

function g8StrictGoalV3() {
  const project = state?.project || {};
  const description = g8TextV3(project.goalDescription || project.goalText || (typeof project.goal === "string" ? project.goal : project.goal?.description));
  const explicitMetric = g8TextV3(project.goalMetric || project.goal?.metric).toLowerCase();
  const aliases = { заявки: "leads", лиды: "leads", продажи: "sales", выручка: "revenue", прибыль: "profit", окупаемость: "roi" };
  const metric = GATE8_RESULTS.some(([key]) => key === explicitMetric)
    ? explicitMetric
    : aliases[explicitMetric] || g8MetricFromText(description);
  const target = g8NumericV3(project.goalTargetValue ?? project.goal?.targetValue ?? project.goal?.target);
  const budget = g8NumericV3(project.goalBudget ?? project.goal?.budget);
  const allowedCost = g8NumericV3(project.goalAllowedCost ?? project.goal?.allowedCost);
  const deadline = g8DateOnlyV3(project.goalDeadline || project.goal?.deadline);
  return {
    present: Boolean(description || metric || target.present || deadline),
    valid: Boolean(metric && target.valid),
    description,
    metric,
    target: target.valid ? target.value : NaN,
    targetRecord: target,
    deadline,
    budget: budget.valid ? budget.value : NaN,
    budgetRecord: budget,
    allowedCost: allowedCost.valid ? allowedCost.value : NaN,
    allowedCostRecord: allowedCost,
    source: "Gate 0 → Цель проекта",
    updatedAt: project.goalUpdatedAt || state?.updatedAt || "",
    missing: [!metric && "измеримый показатель цели", !target.valid && "целевое значение"].filter(Boolean),
  };
}

function g8ProductDataV3(product) {
  const original = state?.gate5 || {};
  const projected = product && typeof gate5ProductProjectionV230 === "function"
    ? gate5ProductProjectionV230(original, product.id)
    : original;
  const campaigns = Array.isArray(projected.campaignRegistry) ? projected.campaignRegistry : [];
  return { projected, campaigns };
}

function g8CampaignContextV3(product, compact) {
  const productData = g8ProductDataV3(product);
  const campaigns = productData.campaigns;
  let campaign = campaigns.find((row) => g8TextV3(row.id) === compact.campaignId) || null;
  if (!campaign && campaigns.length === 1) campaign = campaigns[0];
  return {
    ...productData,
    campaign,
    campaignId: campaign?.id || "",
    campaignLabel: campaign?.name || campaign?.campaignName || campaign?.cabinetId || "Кампания не выбрана",
    needsSelection: campaigns.length > 1 && !campaign,
  };
}

function g8LatestLinkV3(links, campaignId, start, end) {
  return (links || [])
    .filter((row) => g8TextV3(row?.campaignId) === campaignId)
    .filter((row) => {
      const rowStart = g8DateOnlyV3(row?.periodStart);
      const rowEnd = g8DateOnlyV3(row?.periodEnd || row?.date);
      if (!rowStart && !rowEnd) return false;
      return (!rowStart || rowStart === start) && (!rowEnd || rowEnd === end);
    })
    .sort((a, b) => g8TextV3(a.updatedAt || a.createdAt).localeCompare(g8TextV3(b.updatedAt || b.createdAt)))
    .at(-1) || null;
}

function g8ObservationV3(snapshot, link, product, campaign) {
  const spend = g8OwnNumericV3(snapshot, ["spend", "cost"]);
  const impressions = g8OwnNumericV3(snapshot, ["impressions"]);
  const clicks = g8OwnNumericV3(snapshot, ["clicks"]);
  const leads = g8OwnNumericV3(snapshot, ["leads", "conversions"]);
  const sales = g8OwnNumericV3(link, ["orders", "sales"]);
  let revenue = g8OwnNumericV3(link, ["actualRevenue", "revenue"]);
  const averageCheck = g8OwnNumericV3(link, ["avgCheck", "minCheck"]);
  if (!revenue.present && sales.valid && averageCheck.valid) {
    revenue = { present: true, valid: true, value: sales.value * averageCheck.value, raw: "derived", error: "" };
  }
  return {
    id: snapshot.id || `${campaign?.id || "campaign"}:${snapshot.periodStart}:${snapshot.periodEnd || snapshot.date}`,
    productId: product?.id || "",
    campaignId: campaign?.id || "",
    campaignLabel: campaign?.name || campaign?.campaignName || "",
    reportType: snapshot.reportType || "",
    periodStart: g8DateOnlyV3(snapshot.periodStart),
    periodEnd: g8DateOnlyV3(snapshot.periodEnd || snapshot.date),
    updatedAt: snapshot.updatedAt || snapshot.createdAt || snapshot.periodEnd || "",
    spend,
    impressions,
    clicks,
    leads,
    sales,
    revenue,
    link,
  };
}

function g8ObservationDaysV3(row) {
  const start = Date.parse(`${row.periodStart}T00:00:00Z`);
  const end = Date.parse(`${row.periodEnd}T00:00:00Z`);
  return Number.isFinite(start) && Number.isFinite(end) && end >= start ? Math.floor((end - start) / 86400000) + 1 : 0;
}

function g8NonOverlappingV3(rows) {
  const chosen = [];
  rows
    .slice()
    .sort((a, b) => g8ObservationDaysV3(b) - g8ObservationDaysV3(a) || g8TextV3(b.updatedAt).localeCompare(g8TextV3(a.updatedAt)))
    .forEach((row) => {
      const overlaps = chosen.some((item) => row.periodStart <= item.periodEnd && row.periodEnd >= item.periodStart);
      if (!overlaps) chosen.push(row);
    });
  return chosen.sort((a, b) => a.periodStart.localeCompare(b.periodStart));
}

function g8ObservationsV3(product, context) {
  if (!product || !context.campaign) return [];
  const raw = typeof g5CanonicalPeriodSnapshots === "function"
    ? g5CanonicalPeriodSnapshots(context.projected, context.campaign.id)
    : (context.projected.periodSnapshots || []).filter((row) => row.campaignId === context.campaign.id);
  const observations = raw.map((snapshot) => {
    const start = g8DateOnlyV3(snapshot.periodStart);
    const end = g8DateOnlyV3(snapshot.periodEnd || snapshot.date);
    return g8ObservationV3(snapshot, g8LatestLinkV3(context.projected.links, context.campaign.id, start, end), product, context.campaign);
  }).filter((row) => row.periodStart && row.periodEnd);
  return g8NonOverlappingV3(observations);
}

function g8RowsWithV3(rows, ...keys) {
  return rows.filter((row) => keys.every((key) => row[key]?.valid));
}

function g8RatioRecordV3(rows, numerator, denominator, config) {
  const usable = g8RowsWithV3(rows, numerator, denominator);
  if (!usable.length) return null;
  const numeratorSum = usable.reduce((sum, row) => sum + row[numerator].value, 0);
  const denominatorSum = usable.reduce((sum, row) => sum + row[denominator].value, 0);
  if (denominatorSum <= 0) return null;
  return g8DerivedRecordV3(config.key, config.label, config.unit, (numeratorSum / denominatorSum) * (config.multiplier || 1), {
    kind: "fact",
    source: `Gate 5 → ${usable.length} сопоставимых ${usable.length === 1 ? "период" : "периода"}`,
    periodStart: usable[0].periodStart,
    periodEnd: usable.at(-1).periodEnd,
    updatedAt: usable.at(-1).updatedAt,
    productId: usable[0].productId,
    campaignId: usable[0].campaignId,
    observations: usable.length,
  });
}

function g8AssumptionRecordV3(key, label, unit, raw, source, product, campaignId, options = {}) {
  const parsed = g8NumericV3(raw, options);
  return g8MetricRecordV3(key, label, unit, parsed, {
    kind: "assumption",
    source,
    updatedAt: state?.updatedAt || "",
    productId: product?.id || "",
    campaignId,
    observations: 0,
  });
}

function g8ParameterBundleV3(product, context, observations) {
  const plan = product ? gate8ProductGate4PlanV230(product.id) : { assumptions: {}, campaigns: [] };
  const assumptions = plan.assumptions || {};
  const exactImplementation = context.campaign
    ? plan.campaigns.find((row) => [row?.id, row?.campaignId, row?.cabinetId].some((id) => g8TextV3(id) === context.campaign.id))
    : plan.campaigns.length === 1 ? plan.campaigns[0] : null;
  const budgetRaw = Object.prototype.hasOwnProperty.call(assumptions, "budget")
    ? assumptions.budget
    : exactImplementation?.budget;
  const meta = { productId: product?.id || "", campaignId: context.campaignId };
  const factual = {
    cpc: g8RatioRecordV3(observations, "spend", "clicks", { key: "cpc", label: "Стоимость клика", unit: "₽" }),
    clickToLead: g8RatioRecordV3(observations, "leads", "clicks", { key: "clickToLead", label: "Конверсия клик → заявка", unit: "%", multiplier: 100 }),
    leadToSale: g8RatioRecordV3(observations, "sales", "leads", { key: "leadToSale", label: "Конверсия заявка → продажа", unit: "%", multiplier: 100 }),
    clickToSale: g8RatioRecordV3(observations, "sales", "clicks", { key: "clickToSale", label: "Конверсия клик → продажа", unit: "%", multiplier: 100 }),
    cpl: g8RatioRecordV3(observations, "spend", "leads", { key: "cpl", label: "Фактическая стоимость заявки", unit: "₽" }),
    cpa: g8RatioRecordV3(observations.filter((row) => row.sales?.value > 0), "spend", "sales", { key: "cpa", label: "Фактическая стоимость продажи", unit: "₽" }),
    averageCheck: g8RatioRecordV3(observations.filter((row) => row.sales?.value > 0), "revenue", "sales", { key: "averageCheck", label: "Фактический средний чек", unit: "₽" }),
  };
  const economics = product ? gate8ExactEconomicsV230(product.id) : {};
  const choose = (fact, assumption) => fact?.valid ? fact : assumption;
  const budgetRecord = g8AssumptionRecordV3("budget", "Утверждённый бюджет", "₽", budgetRaw, "Gate 4 → бюджет выбранного продукта/кампании", product, context.campaignId);
  budgetRecord.kind = "plan";
  const parameters = {
    budget: budgetRecord,
    cpc: choose(factual.cpc, g8AssumptionRecordV3("cpc", "Стоимость клика", "₽", assumptions.cpc, "Gate 4 → допущения кампании", product, context.campaignId)),
    clickToLead: choose(factual.clickToLead, g8AssumptionRecordV3("clickToLead", "Конверсия клик → заявка", "%", assumptions.siteConversion, "Gate 4 → допущения кампании", product, context.campaignId, { maximum: 100 })),
    leadToSale: choose(factual.leadToSale, g8AssumptionRecordV3("leadToSale", "Конверсия заявка → продажа", "%", assumptions.saleConversion, "Gate 4 → допущения кампании", product, context.campaignId, { maximum: 100 })),
    clickToSale: factual.clickToSale,
    cpl: choose(factual.cpl, g8AssumptionRecordV3("cpl", "Стоимость заявки", "₽", assumptions.cpl, "Gate 4 → допущения кампании", product, context.campaignId)),
    cpa: factual.cpa,
    averageCheck: choose(factual.averageCheck, g8AssumptionRecordV3("averageCheck", "Средний чек", "₽", economics.aov, "Gate 1 → Юнит-экономика продукта", product, context.campaignId)),
    margin: g8AssumptionRecordV3("margin", "Маржинальность", "%", economics.marginPercent, "Gate 1 → Юнит-экономика продукта", product, context.campaignId, { maximum: 100 }),
  };
  const allowedCpa = g8AssumptionRecordV3("allowedCpa", "Допустимый CPA", "₽", economics.allowedCpa, "Gate 1 → Юнит-экономика продукта", product, context.campaignId);
  const allowedCpl = g8AssumptionRecordV3("allowedCpl", "Допустимый CPL", "₽", economics.allowedCpl, "Gate 1 → Юнит-экономика продукта", product, context.campaignId);
  return { parameters, factual, allowedCpa, allowedCpl, plan, assumptions };
}

function g8ActualForPeriodV3(observations, start, end) {
  const rows = observations.filter((row) => row.periodStart >= start && row.periodEnd <= end);
  const sum = (key) => {
    const usable = rows.filter((row) => row[key]?.valid);
    return {
      present: usable.length > 0,
      value: usable.reduce((total, row) => total + row[key].value, 0),
      observations: usable.length,
    };
  };
  return { rows, spend: sum("spend"), clicks: sum("clicks"), leads: sum("leads"), sales: sum("sales"), revenue: sum("revenue") };
}

function g8CloneParametersV3(parameters) {
  return Object.fromEntries(Object.entries(parameters).map(([key, value]) => [key, value ? { ...value } : value]));
}

function g8ValidValueV3(record) {
  return record?.valid && Number.isFinite(record.value) ? record.value : NaN;
}

function g8ComputeV3(parameters, actual, period) {
  const errors = [];
  const missing = [];
  const used = [];
  const budgetRecord = parameters.budget;
  if (budgetRecord?.present && !budgetRecord.valid) errors.push({ key: "budget", label: "Бюджет", reason: budgetRecord.error, gateId: "gate-4" });
  const budget = g8ValidValueV3(budgetRecord);
  const today = new Date().toISOString().slice(0, 10);
  const current = period.start <= today && period.end >= today;
  const past = period.end < today;
  const actualSpend = actual.spend.present ? actual.spend.value : 0;
  let futureSpend = Number.isFinite(budget) ? budget : NaN;
  if (past) futureSpend = 0;
  else if (current && Number.isFinite(budget)) futureSpend = Math.max(0, budget - actualSpend);
  if (!Number.isFinite(budget) && !past) missing.push({ key: "budget", label: "Бюджет выбранного продукта/кампании", gateId: "gate-4", source: "Gate 4 → Кампании" });
  if (Number.isFinite(budget)) used.push(budgetRecord);

  const values = { spend: Number.isFinite(futureSpend) ? futureSpend : NaN, clicks: NaN, leads: NaN, sales: NaN, revenue: NaN, profit: NaN, cpl: NaN, cpa: NaN, roi: NaN };
  let route = "";
  if (Number.isFinite(futureSpend)) {
    if (futureSpend === 0) values.clicks = 0;
    else {
      const cpc = g8ValidValueV3(parameters.cpc);
      if (cpc > 0) {
        values.clicks = futureSpend / cpc;
        used.push(parameters.cpc);
      } else if (parameters.cpc?.present && parameters.cpc?.valid && cpc === 0) {
        errors.push({ key: "cpc", label: "Стоимость клика", reason: "При CPC = 0 нельзя рассчитать количество кликов", gateId: parameters.cpc.kind === "fact" ? "gate-5" : "gate-4" });
      }
    }

    const cpl = g8ValidValueV3(parameters.cpl);
    const clickToLead = g8ValidValueV3(parameters.clickToLead);
    if (futureSpend === 0) values.leads = 0;
    else if (cpl > 0) {
      values.leads = futureSpend / cpl;
      used.push(parameters.cpl);
      route = "бюджет ÷ фактический CPL";
    } else if (Number.isFinite(values.clicks) && Number.isFinite(clickToLead)) {
      values.leads = values.clicks * clickToLead / 100;
      used.push(parameters.clickToLead);
      route = "бюджет ÷ CPC × конверсия клик → заявка";
    }

    const cpa = g8ValidValueV3(parameters.cpa);
    const leadToSale = g8ValidValueV3(parameters.leadToSale);
    const clickToSale = g8ValidValueV3(parameters.clickToSale);
    if (futureSpend === 0) values.sales = 0;
    else if (cpa > 0) {
      values.sales = futureSpend / cpa;
      used.push(parameters.cpa);
      route = "бюджет ÷ фактическая стоимость продажи";
    } else if (Number.isFinite(values.leads) && Number.isFinite(leadToSale)) {
      values.sales = values.leads * leadToSale / 100;
      used.push(parameters.leadToSale);
      route = "бюджет ÷ CPC × конверсия клик → заявка × конверсия заявка → продажа";
    } else if (Number.isFinite(values.clicks) && Number.isFinite(clickToSale)) {
      values.sales = values.clicks * clickToSale / 100;
      used.push(parameters.clickToSale);
      route = "бюджет ÷ CPC × фактическая конверсия клик → продажа";
    }

    const averageCheck = g8ValidValueV3(parameters.averageCheck);
    if (Number.isFinite(values.sales) && Number.isFinite(averageCheck)) {
      values.revenue = values.sales * averageCheck;
      used.push(parameters.averageCheck);
    }
    const margin = g8ValidValueV3(parameters.margin);
    if (Number.isFinite(values.revenue) && Number.isFinite(margin)) {
      values.profit = values.revenue * margin / 100 - futureSpend;
      values.roi = futureSpend > 0 ? values.profit / futureSpend * 100 : NaN;
      used.push(parameters.margin);
    }
  }

  const addActual = (key, sourceKey = key) => {
    const fact = actual[sourceKey];
    if (!fact?.present) return;
    values[key] = (Number.isFinite(values[key]) ? values[key] : 0) + fact.value;
  };
  addActual("clicks");
  addActual("leads");
  addActual("sales");
  addActual("revenue");
  const totalSpend = (Number.isFinite(futureSpend) ? futureSpend : 0) + actualSpend;
  values.spend = Number.isFinite(futureSpend) || actual.spend.present ? totalSpend : NaN;
  values.cpl = Number.isFinite(values.leads) && values.leads > 0 && Number.isFinite(values.spend) ? values.spend / values.leads : NaN;
  values.cpa = Number.isFinite(values.sales) && values.sales > 0 && Number.isFinite(values.spend) ? values.spend / values.sales : NaN;
  if (actual.revenue.present && past) {
    const margin = g8ValidValueV3(parameters.margin);
    if (Number.isFinite(margin)) values.profit = values.revenue * margin / 100 - values.spend;
    if (Number.isFinite(values.profit) && values.spend > 0) values.roi = values.profit / values.spend * 100;
  }
  return {
    values,
    route,
    used: [...new Map(used.filter(Boolean).map((item) => [item.key, item])).values()],
    errors,
    missing,
    current,
    past,
    actualSpend,
    futureSpend,
    totalSpend: values.spend,
  };
}

function g8PercentileV3(values, percentile) {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!sorted.length) return NaN;
  if (sorted.length === 1) return sorted[0];
  const position = (sorted.length - 1) * percentile;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function g8OutcomeSamplesV3(observations, metric, plannedSpend, actual) {
  if (!Number.isFinite(plannedSpend)) return [];
  const actualValue = actual?.[metric]?.present ? actual[metric].value : 0;
  const actualSpend = actual?.spend?.present ? actual.spend.value : 0;
  return observations.map((row) => {
    if (!row.spend.valid || row.spend.value <= 0) return NaN;
    const incrementalSpend = Math.max(0, plannedSpend - actualSpend);
    if (["clicks", "leads", "sales", "revenue"].includes(metric)) {
      if (!row[metric]?.valid) return NaN;
      return actualValue + incrementalSpend * row[metric].value / row.spend.value;
    }
    if (metric === "cpl") {
      if (!row.leads.valid || row.leads.value <= 0) return NaN;
      return row.spend.value / row.leads.value;
    }
    if (metric === "cpa") {
      if (!row.sales.valid || row.sales.value <= 0) return NaN;
      return row.spend.value / row.sales.value;
    }
    if (["profit", "roi"].includes(metric)) {
      if (!row.revenue.valid) return NaN;
      const margin = g8NumericV3(gate8ExactEconomicsV230(row.productId)?.marginPercent, { maximum: 100 });
      if (!margin.valid) return NaN;
      const profit = row.revenue.value * margin.value / 100 - row.spend.value;
      return metric === "roi" ? profit / row.spend.value * 100 : actualValue + incrementalSpend * profit / row.spend.value;
    }
    return NaN;
  }).filter(Number.isFinite);
}

function g8ObservationDistributionV3(observations, key) {
  const ratio = (numerator, denominator, multiplier = 1, predicate = () => true) => observations
    .filter((row) => predicate(row) && row[numerator]?.valid && row[denominator]?.valid && row[denominator].value > 0)
    .map((row) => row[numerator].value / row[denominator].value * multiplier)
    .filter(Number.isFinite);
  if (key === "cpc") return ratio("spend", "clicks");
  if (key === "clickToLead") return ratio("leads", "clicks", 100);
  if (key === "leadToSale") return ratio("sales", "leads", 100);
  if (key === "clickToSale") return ratio("sales", "clicks", 100);
  if (key === "cpl") return ratio("spend", "leads");
  if (key === "cpa") return ratio("spend", "sales", 1, (row) => row.sales?.value > 0);
  if (key === "averageCheck") return ratio("revenue", "sales", 1, (row) => row.sales?.value > 0);
  return [];
}

function g8PresetParametersV3(kind, parameters, observations) {
  const copy = g8CloneParametersV3(parameters);
  if (kind === "base") return { parameters: copy, changes: [], available: true, basis: "Текущие факты и явные допущения" };
  const favorable = kind === "favorable";
  const stress = kind === "stress";
  const changes = [];
  const costKeys = new Set(["cpc", "cpl", "cpa"]);
  ["cpc", "clickToLead", "leadToSale", "clickToSale", "cpl", "cpa", "averageCheck"].forEach((key) => {
    const values = g8ObservationDistributionV3(observations, key);
    if (values.length < 2 || !copy[key]) return;
    const previous = copy[key];
    let quantile;
    if (stress) quantile = costKeys.has(key) ? 1 : 0;
    else if (favorable) quantile = costKeys.has(key) ? 0.25 : 0.75;
    else quantile = costKeys.has(key) ? 0.75 : 0.25;
    const value = g8PercentileV3(values, quantile);
    if (!Number.isFinite(value) || Math.abs(value - copy[key].value) < 0.000001) return;
    copy[key] = g8DerivedRecordV3(key, copy[key].label, copy[key].unit, value, {
      kind: "fact",
      source: `Gate 5 → ${values.length} сопоставимых периодов (${stress ? "наблюдавшаяся граница" : `квартиль ${Math.round(quantile * 100)}%`})`,
      productId: copy[key].productId,
      campaignId: copy[key].campaignId,
      observations: values.length,
      note: "Сценарное значение из наблюдавшегося диапазона, не скрытый бенчмарк",
    });
    changes.push({
      key,
      label: copy[key].label,
      fromValue: previous?.value,
      fromValid: Boolean(previous?.valid),
      value,
      unit: copy[key].unit,
      valid: true,
      basis: copy[key].source,
    });
  });
  return {
    parameters: copy,
    changes,
    available: changes.length > 0,
    basis: changes.length ? "Параметры взяты из фактического диапазона Gate 5" : "Недостаточно сопоставимых периодов для непроизвольного сценария",
  };
}

function g8CustomParametersV3(parameters, data, product, campaignId) {
  const copy = g8CloneParametersV3(parameters);
  const changes = [];
  const mapping = {
    budget: ["budget", "Бюджет сценария", "₽", {}],
    cpc: ["cpc", "Стоимость клика", "₽", {}],
    siteConversion: ["clickToLead", "Конверсия клик → заявка", "%", { maximum: 100 }],
    saleConversion: ["leadToSale", "Конверсия заявка → продажа", "%", { maximum: 100 }],
    cpl: ["cpl", "Стоимость заявки", "₽", {}],
    averageCheck: ["averageCheck", "Средний чек", "₽", {}],
    margin: ["margin", "Маржинальность", "%", { maximum: 100 }],
  };
  Object.entries(mapping).forEach(([manualKey, [key, label, unit, options]]) => {
    const raw = data.manual?.[manualKey];
    if (!g8TextV3(raw)) return;
    const previous = copy[key];
    const record = g8AssumptionRecordV3(key, label, unit, raw, "Gate 8 → пользовательский сценарий", product, campaignId, options);
    copy[key] = record;
    changes.push({
      key,
      manualKey,
      label,
      fromValue: previous?.value,
      fromValid: Boolean(previous?.valid),
      value: record.value,
      unit,
      valid: record.valid,
      error: record.error,
      basis: record.source,
    });
  });
  if (changes.some((item) => ["cpc", "clickToLead", "leadToSale"].includes(item.key))) {
    copy.cpa = null;
    if (changes.some((item) => ["cpc", "clickToLead"].includes(item.key))) copy.cpl = null;
  }
  if (changes.some((item) => item.key === "cpl")) copy.cpa = null;
  const invalid = changes.filter((item) => !item.valid);
  return {
    parameters: copy,
    changes,
    available: changes.length > 0 && invalid.length === 0,
    basis: !changes.length
      ? "Задайте хотя бы одно условие — значения не подставляются автоматически"
      : invalid.length
        ? `Исправьте условия: ${invalid.map((item) => `${item.label} — ${item.error}`).join("; ")}`
        : "Явно заданные пользователем допущения",
  };
}

function g8ScenarioSetV3(parameters, observations, data, product, campaignId) {
  return {
    base: g8PresetParametersV3("base", parameters, observations),
    favorable: g8PresetParametersV3("favorable", parameters, observations),
    unfavorable: g8PresetParametersV3("unfavorable", parameters, observations),
    stress: g8PresetParametersV3("stress", parameters, observations),
    custom: g8CustomParametersV3(parameters, data, product, campaignId),
  };
}

function g8MissingForMetricV3(metric, calculation, parameters, context) {
  const list = calculation.errors.map((item) => ({ ...item, issueType: "invalid" }));
  calculation.missing.forEach((item) => {
    if (!list.some((candidate) => candidate.key === item.key))
      list.push({ ...item, issueType: "missing" });
  });
  const push = (key, label, gateId, source, reason = "Значение не задано") => {
    if (!list.some((item) => item.key === key))
      list.push({ key, label, gateId, source, reason, issueType: "missing" });
  };
  if (context.needsSelection) push("campaign", "Кампания", "gate-5", "Gate 5 → Реестр кампаний", "Выберите одну кампанию: смешивать статистику кампаний нельзя");
  if (Number.isFinite(calculation.values[metric])) return list;
  if (["leads", "sales", "revenue", "profit", "cpl", "cpa", "roi"].includes(metric)) {
    const leadRoute = parameters.cpl?.valid || (parameters.cpc?.valid && parameters.clickToLead?.valid);
    if (!leadRoute && !parameters.cpa?.valid && !parameters.clickToSale?.valid) {
      if (!parameters.cpc?.valid) push("cpc", "Стоимость клика больше нуля", "gate-5", "Gate 5 → фактический период");
      if (!parameters.cpl?.valid && !parameters.clickToLead?.valid) push("clickToLead", "CPL или конверсия клик → заявка", "gate-5", "Gate 5 → фактический период");
    }
  }
  if (["sales", "revenue", "profit", "cpa", "roi"].includes(metric) && !parameters.cpa?.valid && !parameters.clickToSale?.valid && !parameters.leadToSale?.valid) {
    push("leadToSale", "Конверсия в подтверждённую продажу", "gate-5", "Gate 5 → Связка с бизнесом");
  }
  if (metric === "cpa" && calculation.values.sales === 0 && Number.isFinite(calculation.values.spend)) {
    push("salesForCpa", "Подтверждённые продажи больше нуля", "gate-5", "Gate 5 → Связка с бизнесом", "При измеренном нуле продаж CPA не рассчитывается");
  }
  if (["revenue", "profit", "roi"].includes(metric) && !parameters.averageCheck?.valid) push("averageCheck", "Средний чек", "gate-1", "Gate 1 → Юнит-экономика продукта");
  if (["profit", "roi"].includes(metric) && !parameters.margin?.valid) push("margin", "Маржинальность", "gate-1", "Gate 1 → Юнит-экономика продукта");
  return list;
}

function g8MetricTargetV3(goal, metric, constraints) {
  if (goal.metric === metric && Number.isFinite(goal.target)) return { value: goal.target, source: goal.source, kind: "goal" };
  if (metric === "cpl" && constraints.allowedCpl.valid) return { value: constraints.allowedCpl.value, source: constraints.allowedCpl.source, kind: "maximum" };
  if (metric === "cpa" && constraints.allowedCpa.valid) return { value: constraints.allowedCpa.value, source: constraints.allowedCpa.source, kind: "maximum" };
  return { value: NaN, source: "", kind: "" };
}

function g8MetricDifferenceV3(value, target, metric) {
  if (!Number.isFinite(value) || !Number.isFinite(target.value)) return NaN;
  return ["cpl", "cpa"].includes(metric) ? target.value - value : value - target.value;
}

function g8MetricReachedV3(value, target, metric) {
  if (!Number.isFinite(value) || !Number.isFinite(target.value)) return null;
  return ["cpl", "cpa"].includes(metric) ? value <= target.value : value >= target.value;
}

function g8RecommendationSignatureV3(recommendation, analysis) {
  return [
    GATE8_WORKBENCH_VERSION,
    activeProjectId || "",
    analysis.context.product?.id || "",
    analysis.context.campaignId || "",
    analysis.period.start,
    analysis.period.end,
    recommendation.id,
  ].join("|");
}

function g8RecommendationsV3({ missing, calculation, parameters, constraints, readiness, context, metric, data }) {
  const rows = [];
  const add = (id, what, where, basis, effect, checkWhen, gateId, implementationId = "") => {
    if (rows.some((row) => row.id === id)) return;
    rows.push({ id, what, where, basis, effect, checkWhen, gateId, implementationId });
  };
  // Пропуски и ошибки исходных данных исправляются прямыми переходами из
  // «Чего ожидать». Они не являются маркетинговыми рекомендациями и никогда
  // не должны становиться задачами Gate 7.
  const actualCost = metric === "leads" ? calculation.values.cpl : calculation.values.cpa;
  const allowed = metric === "leads" ? constraints.allowedCpl : constraints.allowedCpa;
  if (Number.isFinite(actualCost) && allowed.valid && actualCost > allowed.value) add(
    `cost-over-limit-${metric}`,
    `Снизить стоимость ${metric === "leads" ? "заявки" : "продажи"} до допустимого ограничения`,
    "Gate 4 → кампания выбранного продукта",
    `${g8Money(actualCost)} сейчас против допустимых ${g8Money(allowed.value)} из юнит-экономики`,
    `Тест считается успешным, если стоимость результата станет не выше ${g8Money(allowed.value)}`,
    "После следующего сопоставимого объёма трафика",
    "gate-4",
    context.campaignId,
  );
  return rows.slice(0, 8);
}

function g8AnalysisV3() {
  const data = ensureGate8Workspace();
  const goal = g8StrictGoalV3();
  const product = guruV194SelectedProduct(state);
  const compact = g8CompactStateV3(product, goal);
  const context = g8CampaignContextV3(product, compact);
  const observations = g8ObservationsV3(product, context);
  const parameterBundle = g8ParameterBundleV3(product, context, observations);
  const period = { start: compact.periodStart, end: compact.periodEnd };
  const periodValid = Boolean(period.start && period.end && period.start <= period.end);
  const actual = periodValid ? g8ActualForPeriodV3(observations, period.start, period.end) : g8ActualForPeriodV3([], "", "");
  const scenarios = g8ScenarioSetV3(parameterBundle.parameters, observations, data, product, context.campaignId);
  const baseCalculation = g8ComputeV3(scenarios.base.parameters, actual, period);
  const metric = g8ResolvedMetric(data.resultMetric, goal) || goal.metric || "sales";
  const selectedScenario = scenarios.base;
  const selectedCalculation = baseCalculation;
  if (!periodValid) {
    const periodError = { key: "period", label: "Период прогноза", reason: "Дата начала должна быть не позже даты окончания", gateId: "gate-8" };
    baseCalculation.errors.push(periodError);
  }
  const missing = g8MissingForMetricV3(metric, baseCalculation, parameterBundle.parameters, context);
  const selectedMissing = missing;
  const target = g8MetricTargetV3(goal, metric, parameterBundle);
  const value = baseCalculation.values[metric];
  const selectedValue = selectedCalculation.values[metric];
  const reached = g8MetricReachedV3(value, target, metric);
  const samples = g8OutcomeSamplesV3(observations, metric, g8ValidValueV3(parameterBundle.parameters.budget), actual);
  const range = samples.length >= 3
    ? { available: true, min: g8PercentileV3(samples, 0.1), max: g8PercentileV3(samples, 0.9), observations: samples.length, method: "10–90% фактических результатов сопоставимых периодов" }
    : { available: false, min: NaN, max: NaN, observations: samples.length, method: "Для диапазона нужны минимум 3 сопоставимых фактических периода" };
  const scenarioResults = Object.fromEntries(Object.entries(scenarios).map(([key, definition]) => {
    const calculation = key === "base"
      ? baseCalculation
      : definition.available
        ? g8ComputeV3(definition.parameters, actual, period)
        : null;
    if (calculation && calculation !== baseCalculation && !periodValid) {
      calculation.errors.push({ key: "period", label: "Период прогноза", reason: "Дата начала должна быть не позже даты окончания", gateId: "gate-8" });
    }
    const scenarioMissing = calculation
      ? g8MissingForMetricV3(metric, calculation, definition.parameters, context)
      : [];
    const scenarioValue = calculation?.values?.[metric];
    return [key, {
      key,
      definition,
      calculation,
      missing: scenarioMissing,
      value: scenarioValue,
      available: Boolean(definition.available && Number.isFinite(scenarioValue)),
      differenceFromBase: Number.isFinite(scenarioValue) && Number.isFinite(value) ? scenarioValue - value : NaN,
      differenceFromGoal: g8MetricDifferenceV3(scenarioValue, target, metric),
      range: key === "base" ? range : { available: false },
    }];
  }));
  const probability = range.available && Number.isFinite(target.value)
    ? {
        available: true,
        percent: samples.filter((sample) => ["cpl", "cpa"].includes(metric) ? sample <= target.value : sample >= target.value).length / samples.length * 100,
        count: samples.length,
        source: "Эмпирическая доля сопоставимых фактических периодов при выбранном плановом бюджете; не Monte Carlo",
      }
    : { available: false, percent: NaN, count: samples.length, source: "Недостаточно фактических наблюдений для процента вероятности" };
  const assumptionsUsed = baseCalculation.used.filter((item) => item.kind === "assumption");
  const factualUsed = baseCalculation.used.filter((item) => item.kind === "fact");
  const basis = !Number.isFinite(value)
    ? { label: "Не хватает данных", reason: missing[0]?.reason || `Не хватает «${missing[0]?.label || "входных данных"}»`, level: "missing" }
    : assumptionsUsed.length
      ? { label: "Используются допущения", reason: `${assumptionsUsed.map((item) => item.label).join(", ")} — не подтверждено фактической выборкой`, level: "assumption" }
      : observations.length < 3
        ? { label: "Мало наблюдений", reason: `Расчёт основан на ${observations.length} сопоставимых ${observations.length === 1 ? "периоде" : "периодах"}`, level: "small" }
        : { label: "Есть фактическая статистика", reason: `${observations.length} сопоставимых периодов выбранной кампании`, level: "fact" };
  const relevant = [...baseCalculation.used, ...missing.map((item) => ({ key: item.key, label: item.label, valid: false }))];
  const completeness = {
    required: relevant,
    filled: relevant.filter((item) => item.valid).length,
    total: relevant.length,
    percent: relevant.length ? Math.round(relevant.filter((item) => item.valid).length / relevant.length * 100) : 0,
    missing,
  };
  // Внутри одного анализа факты неизменны: собираем их один раз и тем же
  // снимком питаем readiness и итоговый bundle.
  const bundle = g8CollectFacts();
  const readiness = g8ReadinessChecks(bundle, goal);
  const reliability = {
    level: basis.level === "fact" ? "фактическая" : basis.level === "small" ? "ограниченная" : basis.level === "assumption" ? "по допущениям" : "нет основания",
    mode: assumptionsUsed.length ? "Расчёт по допущениям" : factualUsed.length ? "Прогноз по фактическим данным" : "Не хватает данных",
    factual: factualUsed.length,
    sources: baseCalculation.used.length,
    stale: factualUsed.filter((item) => g8Stale(item)).length,
    periods: observations.length,
    compared: 0,
  };
  const readinessConstraint = readiness.checks?.find((item) => !item.passed)?.label;
  const mainConstraint = baseCalculation.errors[0]?.reason || missing[0]?.reason || (readinessConstraint ? `Не подтверждено: ${readinessConstraint}` : "Критическое ограничение не выявлено");
  const recommendations = g8RecommendationsV3({ missing, calculation: baseCalculation, parameters: parameterBundle.parameters, constraints: parameterBundle, readiness, context, metric, data });
  const actionRow = recommendations[0] || { what: "Обоснованных маркетинговых изменений пока нет", where: "", effect: "", checkWhen: "", gateId: "", basis: "" };
  const action = { title: actionRow.what, where: actionRow.where, result: g8MetricLabel(metric), impact: actionRow.effect, criterion: actionRow.checkWhen, gateId: actionRow.gateId };
  const baseModel = { ...baseCalculation.values };
  const compatibilityScenarios = {
    base: { available: Number.isFinite(value), model: baseModel, changes: [] },
    positive: { available: scenarioResults.favorable.available, model: scenarioResults.favorable.calculation?.values || {}, changes: scenarios.favorable.changes },
    negative: { available: scenarioResults.unfavorable.available, model: scenarioResults.unfavorable.calculation?.values || {}, changes: scenarios.unfavorable.changes },
    stress: { available: scenarioResults.stress.available, model: scenarioResults.stress.calculation?.values || {}, changes: scenarios.stress.changes },
    custom: { available: scenarioResults.custom.available, model: scenarioResults.custom.calculation?.values || {}, changes: scenarios.custom.changes },
  };
  return {
    data,
    compact,
    context: { product, ...context },
    period,
    goal,
    metric,
    parameters: parameterBundle.parameters,
    constraints: parameterBundle,
    observations,
    actual,
    calculation: baseCalculation,
    selectedCalculation,
    selectedScenario,
    scenarios: compatibilityScenarios,
    scenarioDefinitions: scenarios,
    scenarioResults,
    baseInputs: Object.fromEntries(Object.entries(parameterBundle.parameters).map(([key, item]) => [key, g8ValidValueV3(item)])),
    baseModel,
    forecastCore: { available: Number.isFinite(value), baseModel, runs: 0, benchmarkUsed: false, range, probability },
    completeness,
    missingData: missing,
    selectedMissing,
    contradictions: baseCalculation.errors.map((item) => item.reason),
    readiness,
    reliability,
    probability,
    range,
    basis,
    target,
    value,
    selectedValue,
    reached,
    goalDifference: g8MetricDifferenceV3(value, target, metric),
    selectedDifference: g8MetricDifferenceV3(selectedValue, target, metric),
    mainConstraint,
    recommendations,
    risks: recommendations.slice(0, 3).map((item) => ({ title: item.what, consequence: item.effect, signal: item.basis, action: item.what, source: item.where, gateId: item.gateId })),
    action,
    sensitivity: Object.values(scenarios).flatMap((scenario) => scenario.changes || []),
    bundle,
  };
}

g8Analysis = g8AnalysisV3;

g8Completeness = function (_bundle, _goal, _metric, base) {
  if (base?.__g8V3Completeness) return base.__g8V3Completeness;
  return g8AnalysisV3().completeness;
};

getGate8Status = function (analysis = null) {
  return g8CalculationStateV3(analysis || g8AnalysisV3()).systemStatus;
};

g8BlockStatuses = function (analysis = null) {
  // Gate 8 имеет одно состояние расчёта. Количество экранных секций,
  // история и наличие формы сценария не участвуют в готовности гейта.
  return [g8CalculationStateV3(analysis || g8AnalysisV3()).systemStatus];
};

function g8CalculationStateV3(analysis) {
  if (analysis.calculation.errors.length) {
    return { key: "invalid", label: "Требуется исправить данные", systemStatus: "problem" };
  }
  if (!Number.isFinite(analysis.value)) {
    return { key: "missing", label: "Не хватает данных", systemStatus: "not_started" };
  }
  if (analysis.calculation.used.some((item) => item.kind === "assumption")) {
    return { key: "assumption", label: "Расчёт по допущениям", systemStatus: "in_progress" };
  }
  return { key: "calculated", label: "Рассчитано", systemStatus: "ready" };
}

const __g8WorkbenchPreviousCollectFacts = g8CollectFacts;
g8CollectFacts = function () {
  const bundle = __g8WorkbenchPreviousCollectFacts();
  const product = guruV194SelectedProduct(state);
  const units = {
    spend: "₽", budget: "₽", cpc: "₽", cpl: "₽", targetCpl: "₽", allowedCpl: "₽", allowedCpa: "₽",
    averageCheck: "₽", revenue: "₽", impressions: "показы", clicks: "клики", leads: "заявки", sales: "продажи",
    ctr: "%", siteConversion: "%", saleConversion: "%", margin: "%", taskReadiness: "%",
  };
  Object.values(bundle.facts || {}).forEach((record) => {
    record.unit = record.unit || units[record.key] || "";
    record.productId = record.productId || record.product_id || product?.id || "";
    record.campaignId = record.campaignId || (record.periodStart ? bundle.latestPeriod?.campaignId || "" : "");
    record.observations = Number(record.observations || (record.periodStart ? 1 : 0));
    record.basis = record.basis || (record.type === "факт" ? "fact" : "assumption");
    record.period = record.period || [record.periodStart, record.periodEnd].filter(Boolean).join(" — ");
  });
  return bundle;
};

/* Readiness is a list of concrete launch conditions. It is intentionally not
 * a percentage multiplier and does not contain task/history/scenario counts. */
g8ReadinessChecks = function (_bundle, goal) {
  const product = guruV194SelectedProduct(state);
  const snapshot = product ? g3ProductJourneySnapshot(product) : {};
  const plan = product ? gate8ProductGate4PlanV230(product.id) : { assumptions: {}, campaigns: [] };
  const gate2 = state?.gates?.find((gate) => gate.id === "gate-2");
  const trackingCards = (gate2?.cards || []).filter((card) => /метрика,\s*(сч[её]тчик|цели|события)/i.test(g8TextV3(card.title)));
  const trackingReady = trackingCards.length > 0 && trackingCards.every((card) => g2CardStatus(card) === "ready");
  const budgetRaw = Object.prototype.hasOwnProperty.call(plan.assumptions || {}, "budget")
    ? plan.assumptions.budget
    : plan.campaigns.length === 1 ? plan.campaigns[0]?.budget : "";
  const budget = g8NumericV3(budgetRaw);
  const economics = product ? gate8ExactEconomicsV230(product.id) : {};
  const hasEconomics = [economics.allowedCpa, economics.allowedCpl].some((value) => g8NumericV3(value).valid);
  const configuredCampaign = (plan.campaigns || []).some((campaign) =>
    [campaign?.decision, campaign?.campaignName, campaign?.launchStatus, campaign?.status].some((value) => g8TextV3(value)),
  );
  const checks = [
    { label: "Цель и целевая метрика заданы", passed: Boolean(goal?.valid), source: "Gate 0 → Цель проекта", gateId: "gate-0" },
    { label: "Посадочная выбранного продукта указана", passed: Boolean(g8TextV3(snapshot.landing)), source: "Gate 1–2 → Посадочная продукта", gateId: "gate-1" },
    { label: "Счётчик, цели и события аналитики подтверждены", passed: trackingReady, source: "Gate 2 → Аналитика", gateId: "gate-2" },
    { label: "Бюджет продукта/кампании валиден", passed: budget.valid, source: "Gate 4 → Кампании продукта", gateId: "gate-4" },
    { label: "Кампания сконфигурирована для запуска", passed: configuredCampaign, source: "Gate 4 → Кампания продукта", gateId: "gate-4" },
    { label: "Экономическое ограничение результата задано", passed: hasEconomics, source: "Gate 1 → Юнит-экономика продукта", gateId: "gate-1" },
  ];
  return { checks, ready: checks.filter((item) => item.passed).length, total: checks.length, percent: checks.length ? Math.round(checks.filter((item) => item.passed).length / checks.length * 100) : 0 };
};

function g8FormatValueV3(metric, value) {
  if (!Number.isFinite(value)) return "Недостаточно данных";
  if (["revenue", "profit", "cpl", "cpa"].includes(metric)) return g8Money(value);
  if (metric === "roi") return g8Percent(value);
  if (["sales", "leads", "clicks"].includes(metric)) {
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: value < 10 ? 1 : 0 }).format(value);
  }
  return g8NumberLabel(value, 1);
}

function g8UnitValueV3(record) {
  if (!record?.valid) return record?.present ? `Ошибка: ${record.error}` : "Не задано";
  if (record.unit === "₽") return g8Money(record.value);
  if (record.unit === "%") return g8Percent(record.value);
  return `${g8NumberLabel(record.value, 2)}${record.unit ? ` ${record.unit}` : ""}`;
}

function g8DeltaLabelV3(metric, delta) {
  if (!Number.isFinite(delta)) return "Сравнение недоступно";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${g8FormatValueV3(metric, delta)}`;
}

function g8CompactDisclosureV3(key, title, _status, body, analysis, { primary = false, lockedOpen = false } = {}) {
  const open = lockedOpen || analysis.compact.open[key] !== false;
  const heading = lockedOpen
    ? `<div class="g8-workbench-section-head is-static"><span>${escapeHtml(title)}</span></div>`
    : `<button type="button" class="g8-workbench-section-head" data-g8-v3-toggle="${escapeAttr(key)}" aria-expanded="${open}">
      <span>${escapeHtml(title)}</span>
      <span class="g8-workbench-section-meta"><b aria-hidden="true">${open ? "↑" : "↓"}</b></span>
    </button>`;
  return `<section class="g8-workbench-section ${primary ? "is-primary" : "is-secondary"} ${open ? "is-open" : "is-collapsed"}" data-g8-v3-section="${escapeAttr(key)}">
    ${heading}
    <div class="g8-workbench-section-body" ${open ? "" : "hidden"}>${body}</div>
  </section>`;
}

function g8CompanyNameV3() {
  const registry = Array.isArray(projects) ? projects.find((item) => item.id === activeProjectId) : null;
  return registry?.name || state?.project?.name || state?.project?.companyName || "Текущий проект";
}

function g8UnitItemIndexV3(productId) {
  if (typeof uv130ActiveEntries !== "function") return -1;
  return uv130ActiveEntries().find(({ item }) =>
    [item?.productKey, item?.sourceItemId].some((key) => g8TextV3(key) === productId),
  )?.index ?? -1;
}

function g8SourceTargetV3(item, analysis) {
  const productId = analysis.context.product?.id || "";
  const campaignId = analysis.context.campaignId || "";
  const record = analysis.parameters[item?.key];
  if (item?.key === "campaign")
    return { gateId: "gate-8", kind: "gate8-context-v3", field: "campaignId", productId, campaignId };
  if (item?.key === "period")
    return { gateId: "gate-8", kind: "gate8-context-v3", field: "periodStart", productId, campaignId };
  if (item?.key === "salesForCpa" || record?.kind === "fact") {
    return { gateId: "gate-5", kind: "gate5-import-v3", block: "input", productId, campaignId };
  }
  if (item?.key === "averageCheck" || item?.key === "margin") {
    return {
      gateId: "gate-1",
      kind: "gate1-unit-calculator-v3",
      productId,
      campaignId,
      itemIndex: g8UnitItemIndexV3(productId),
      calculatorPath: item.key === "averageCheck" ? "pricing.actual" : "",
      calculatorLabel: item.key === "margin" ? "Маржа после комиссий" : "",
    };
  }
  const gate4Fields = {
    budget: "budget",
    cpc: "cpc",
    clickToLead: "siteConversion",
    leadToSale: "saleConversion",
    cpl: "cpl",
  };
  if (gate4Fields[item?.key]) {
    return {
      gateId: "gate-4",
      kind: "gate4-forecast-input-v3",
      field: gate4Fields[item.key],
      productId,
      campaignId,
    };
  }
  return { gateId: item?.gateId || "gate-5", kind: "gate5-import-v3", block: "input", productId, campaignId };
}

function g8SourceButtonV3(item, analysis, label = "Открыть источник") {
  const target = g8SourceTargetV3(item, analysis);
  return `<button type="button" class="g8-link" data-g8-v3-source="${escapeAttr(JSON.stringify(target))}">${escapeHtml(label)} →</button>`;
}

function g8IssueCopyV3(item) {
  const labels = {
    budget: "бюджет продукта",
    cpc: "стоимость клика",
    clickToLead: "конверсия клик → заявка",
    leadToSale: "конверсия заявка → продажа",
    salesForCpa: "подтверждённые продажи",
    averageCheck: "средний чек",
    margin: "маржинальность",
    campaign: "кампания",
    period: "период прогноза",
  };
  const missingCopy = {
    budget: "Не указан бюджет продукта",
    cpc: "Не указана стоимость клика",
    clickToLead: "Не указана конверсия клик → заявка",
    leadToSale: "Не указана конверсия заявка → продажа",
    salesForCpa: "Не указаны подтверждённые продажи",
    averageCheck: "Не указан средний чек",
    margin: "Не указана маржинальность",
    campaign: "Не выбрана кампания",
    period: "Не указан период прогноза",
  };
  const label = labels[item.key] || g8TextV3(item.label).toLocaleLowerCase("ru-RU");
  if (item.issueType === "invalid") {
    if (/отрицатель/i.test(item.reason || ""))
      return `${label.charAt(0).toUpperCase()}${label.slice(1)} содержит отрицательное значение`;
    return `${label.charAt(0).toUpperCase()}${label.slice(1)} содержит некорректное значение: ${item.reason || "проверьте значение"}`;
  }
  return missingCopy[item.key] || `Не указано значение «${label}»`;
}

function g8RequiredDataHtmlV3(analysis) {
  if (!analysis.missingData.length) return "";
  const invalid = analysis.missingData.some((item) => item.issueType === "invalid");
  return `<section class="g8-required-data ${invalid ? "has-invalid" : "has-missing"}" aria-label="Необходимые данные для прогноза">
    <strong>${invalid ? "Для прогноза нужно исправить данные" : "Для прогноза не хватает данных"}</strong>
    <div>${analysis.missingData.map((item) => `<div class="g8-required-row" data-g8-v3-required-key="${escapeAttr(item.key)}"><span>${escapeHtml(g8IssueCopyV3(item))}</span>${g8SourceButtonV3(item, analysis, item.issueType === "invalid" ? "Исправить" : item.key === "campaign" ? "Выбрать" : "Указать")}</div>`).join("")}</div>
  </section>`;
}

function g8PrepareSourceV3(target) {
  const product = guruV194Product(target.productId, state);
  if (product) {
    const ui = guruV194Ui(state);
    ui.selectedProductId = product.id;
    ui.selectedCategoryId = g8TextV3(product.categoryId) || "__uncategorized__";
  }
  if (target.kind === "gate4-forecast-input-v3") {
    const production = ensureGate4Production();
    production.launchProduct = target.productId || production.launchProduct || "";
    production.forecastAssumptionsUiV3 = production.forecastAssumptionsUiV3 || {};
    production.forecastAssumptionsUiV3[target.productId] = {
      ...(production.forecastAssumptionsUiV3[target.productId] || {}),
      open: true,
    };
  }
  if (target.kind === "gate1-unit-calculator-v3") {
    const accordion = getGate1AccordionState();
    accordion.subblocks.unit_economics = true;
    const items = ensureUnitV130().items || [];
    const item = items[target.itemIndex];
    if (item) {
      item.open = true;
      const direction = items.find((candidate) =>
        candidate.catalogKind === "direction" &&
        g8TextV3(candidate.productKey || candidate.name) === g8TextV3(item.directionKey),
      );
      if (direction) direction.open = true;
    }
  }
  if (target.kind === "gate5-import-v3") {
    const g5 = ensureGate5State();
    g5.ui.openBlocks[target.block || "input"] = true;
    if (target.campaignId && (g5.campaignRegistry || []).some((row) => row.id === target.campaignId)) {
      g5.ui.filters.campaignId = target.campaignId;
      g5.ui.filters.periodRange = "";
      g5.ui.filters.periodFrom = "";
      g5.ui.filters.periodTo = "";
    }
  }
}

function g8RevealIframeCalculatorV3(frame, target) {
  const doc = frame?.contentDocument;
  if (!doc?.body) return false;
  let node = target.calculatorPath
    ? doc.querySelector(`[data-path="${CSS.escape(target.calculatorPath)}"]`)
    : null;
  if (!node && target.calculatorLabel) {
    const label = [...doc.querySelectorAll(".field > span")]
      .find((candidate) => g8TextV3(candidate.textContent) === target.calculatorLabel);
    node = label?.closest(".field") || null;
  }
  if (!node) return false;
  const highlight = node.closest(".field, .sub") || node;
  const previousOutline = highlight.style.outline;
  const previousShadow = highlight.style.boxShadow;
  highlight.style.outline = "3px solid #2f8f52";
  highlight.style.boxShadow = "0 0 0 7px rgb(47 143 82 / 18%)";
  highlight.scrollIntoView({ behavior: "smooth", block: "center" });
  const focusable = node.matches("input, textarea, select")
    ? node
    : node.querySelector("input, textarea, select");
  if (focusable && !focusable.disabled) focusable.focus({ preventScroll: true });
  setTimeout(() => {
    highlight.style.outline = previousOutline;
    highlight.style.boxShadow = previousShadow;
  }, 4200);
  return true;
}

function g8FindSourceV3(target) {
  const esc = (value) => CSS.escape(String(value ?? ""));
  if (target.kind === "gate8-context-v3")
    return document.querySelector(`[data-g8-v3-context="${esc(target.field)}"]`);
  if (target.kind === "gate4-forecast-input-v3")
    return document.querySelector(`[data-g4-forecast-input-v3="${esc(target.field)}"][data-g4-forecast-product-v3="${esc(target.productId)}"]`);
  if (target.kind === "gate5-import-v3")
    return document.querySelector("[data-g5-yandex-file]");
  if (target.kind === "gate1-unit-calculator-v3")
    return document.querySelector(`[data-uv130-item-toggle="${esc(target.itemIndex)}"]`)?.closest(".g1-card")?.querySelector("iframe[data-brown-calculator]") || null;
  return null;
}

function g8FocusSourceV3(target, attempt = 0) {
  if (activeGateId !== target.gateId) return;
  const node = g8FindSourceV3(target);
  if (node) {
    if (target.kind === "gate1-unit-calculator-v3") {
      g3ProductJourneyRevealSource(node);
      if (g8RevealIframeCalculatorV3(node, target)) return;
    } else {
      g3ProductJourneyRevealSource(node);
      return;
    }
  }
  if (attempt < 40)
    setTimeout(() => g8FocusSourceV3(target, attempt + 1), 75);
}

function g8NavigateToSourceV3(target) {
  if (target.gateId === "gate-8") {
    g8FocusSourceV3(target);
    return;
  }
  g8PrepareSourceV3(target);
  saveState();
  guruInvalidateGateViewCache();
  guruNavigateToGate(target.gateId);
  g8FocusSourceV3(target);
}

function g8Gate4ForecastPlanV3(productId) {
  const production = ensureGate4Production();
  production.forecastAssumptionsByProduct =
    production.forecastAssumptionsByProduct &&
    typeof production.forecastAssumptionsByProduct === "object"
      ? production.forecastAssumptionsByProduct
      : {};
  return (production.forecastAssumptionsByProduct[productId] = {
    ...(production.forecastAssumptionsByProduct[productId] || {}),
    product_id: productId,
  });
}

function g8Gate4ForecastFieldV3(productId, plan, field, label, hint, options = {}) {
  const value = plan[field] ?? "";
  const parsed = g8TextV3(value)
    ? g8NumericV3(value, options.maximum ? { maximum: options.maximum } : {})
    : null;
  return `<label class="g1-field g4-forecast-field-v3 ${parsed && !parsed.valid ? "has-error" : ""}"><span>${escapeHtml(label)}</span><input class="g1-input ${g8TextV3(value) ? parsed?.valid ? "is-filled" : "is-empty" : "is-empty"}" type="number" min="0" step="any" ${options.maximum ? `max="${escapeAttr(options.maximum)}"` : ""} value="${escapeAttr(value)}" placeholder="${escapeAttr(hint)}" data-g4-forecast-input-v3="${escapeAttr(field)}" data-g4-forecast-product-v3="${escapeAttr(productId)}"><small>${parsed && !parsed.valid ? escapeHtml(parsed.error) : escapeHtml(hint)}</small></label>`;
}

function g8Gate4ForecastSourceHtmlV3(product) {
  const production = ensureGate4Production();
  const plan = g8Gate4ForecastPlanV3(product.id);
  const open = Boolean(production.forecastAssumptionsUiV3?.[product.id]?.open);
  return `<details class="g1-card g4-forecast-source-v3" data-g4-forecast-source-v3="${escapeAttr(product.id)}" ${open ? "open" : ""}>
    <summary><span><strong>Параметры прогноза выбранного продукта</strong><small>Единый источник планового бюджета и допущений для Gate 8</small></span><b>${open ? "Свернуть ↑" : "Открыть ↓"}</b></summary>
    <div class="g4-forecast-source-body-v3">
      ${g8Gate4ForecastFieldV3(product.id, plan, "budget", "Плановый бюджет продукта, ₽", "Например, 50 000")}
      ${g8Gate4ForecastFieldV3(product.id, plan, "cpc", "Допущение CPC, ₽", "Используется только при отсутствии факта Gate 5")}
      ${g8Gate4ForecastFieldV3(product.id, plan, "siteConversion", "Допущение клик → заявка, %", "От 0 до 100", { maximum: 100 })}
      ${g8Gate4ForecastFieldV3(product.id, plan, "saleConversion", "Допущение заявка → продажа, %", "От 0 до 100", { maximum: 100 })}
      ${g8Gate4ForecastFieldV3(product.id, plan, "cpl", "Допущение CPL, ₽", "Используется только при отсутствии факта Gate 5")}
    </div>
  </details>`;
}

const __g8WorkbenchPreviousGate4LaunchCenterV3 = g4CampaignLaunchCenterHtml;
g4CampaignLaunchCenterHtml = function () {
  const html = __g8WorkbenchPreviousGate4LaunchCenterV3.apply(this, arguments);
  const product = g4ProductPickSelected(state);
  if (!product || !html) return html;
  const panel = g8Gate4ForecastSourceHtmlV3(product);
  return /<\/div>\s*$/.test(html)
    ? html.replace(/<\/div>\s*$/, `${panel}</div>`)
    : `${html}${panel}`;
};

document.addEventListener("input", (event) => {
  const input = event.target?.closest?.("[data-g4-forecast-input-v3]");
  if (!input) return;
  const plan = g8Gate4ForecastPlanV3(input.dataset.g4ForecastProductV3);
  plan[input.dataset.g4ForecastInputV3] = input.value;
  plan.updatedAt = new Date().toISOString();
  const maximum = ["siteConversion", "saleConversion"].includes(input.dataset.g4ForecastInputV3) ? 100 : Infinity;
  const parsed = g8TextV3(input.value) ? g8NumericV3(input.value, { maximum }) : null;
  input.classList.toggle("is-filled", Boolean(parsed?.valid));
  input.classList.toggle("is-empty", !parsed?.valid);
  input.closest(".g4-forecast-field-v3")?.classList.toggle("has-error", Boolean(parsed && !parsed.valid));
  flashSaving();
}, true);

document.addEventListener("change", (event) => {
  const input = event.target?.closest?.("[data-g4-forecast-input-v3]");
  if (!input) return;
  setTimeout(() => saveState(), 0);
}, true);

document.addEventListener("toggle", (event) => {
  const panel = event.target?.closest?.("[data-g4-forecast-source-v3]");
  if (!panel || panel !== event.target) return;
  const production = ensureGate4Production();
  production.forecastAssumptionsUiV3 = production.forecastAssumptionsUiV3 || {};
  production.forecastAssumptionsUiV3[panel.dataset.g4ForecastSourceV3] = {
    ...(production.forecastAssumptionsUiV3[panel.dataset.g4ForecastSourceV3] || {}),
    open: panel.open,
  };
  flashSaving();
}, true);

function g8InlineDetailsV3(analysis) {
  const details = [
    ["data", "Данные и расчёт", g8DataHtmlV3(analysis)],
    ["history", "История: прогноз и факт", g8HistoryHtmlV3(analysis)],
  ];
  return `<div class="g8-expect-tools">${details.map(([key, title, body]) => {
    const open = analysis.compact.open[key] === true;
    return `<div class="g8-inline-detail ${open ? "is-open" : ""}" data-g8-v3-detail="${escapeAttr(key)}">
      <button type="button" class="secondary-btn g8-inline-detail-toggle" data-g8-v3-toggle="${escapeAttr(key)}" aria-expanded="${open}">${escapeHtml(title)} <b aria-hidden="true">${open ? "↑" : "↓"}</b></button>
      <div class="g8-inline-detail-body" ${open ? "" : "hidden"}>${body}</div>
    </div>`;
  }).join("")}</div>`;
}

function g8ContextPanelV3(analysis) {
  const products = guruV194Products(state);
  const product = analysis.context.product;
  const campaignRows = analysis.context.campaigns || [];
  const metric = analysis.data.resultMetric;
  return `<section class="g8-context-panel" aria-label="Контекст прогноза">
    <div class="g8-context-cell is-company"><span>Компания / продукт</span><strong>${escapeHtml(g8CompanyNameV3())}</strong>
      <select class="g1-input" data-g8-product-pick-select aria-label="Продукт или услуга">
        <option value="">Выберите продукт / услугу</option>${g3ProductJourneyOptions(products, product?.id || "")}
      </select>
    </div>
    <div class="g8-context-cell"><span>Период прогноза</span><div class="g8-period-inputs"><input type="date" data-g8-v3-context="periodStart" value="${escapeAttr(analysis.period.start)}" aria-label="Начало периода"><span>—</span><input type="date" data-g8-v3-context="periodEnd" value="${escapeAttr(analysis.period.end)}" aria-label="Конец периода"></div></div>
    ${analysis.parameters.budget.valid ? `<div class="g8-context-cell"><span>Бюджет продукта / кампании</span><strong>${escapeHtml(g8UnitValueV3(analysis.parameters.budget))}</strong>${g8SourceButtonV3({ key: "budget" }, analysis, "Изменить в Gate 4")}</div>` : ""}
    <div class="g8-context-cell"><span>Цель / результат</span><select data-g8-field="resultMetric">${GATE8_RESULTS.map(([key, label]) => `<option value="${escapeAttr(key)}" ${metric === key ? "selected" : ""}>${escapeHtml(label)}</option>`).join("")}</select>${g8JumpButton("gate-0", "Изменить цель в Gate 0")}</div>
    ${campaignRows.length ? `<label class="g8-context-campaign"><span>Кампания — статистика разных кампаний не смешивается</span><select data-g8-v3-context="campaignId"><option value="">${campaignRows.length > 1 ? "Выберите кампанию" : "Без отдельного выбора"}</option>${campaignRows.map((row) => `<option value="${escapeAttr(row.id)}" ${analysis.context.campaignId === row.id ? "selected" : ""}>${escapeHtml(row.name || row.campaignName || row.cabinetId || row.id)}</option>`).join("")}</select></label>` : ""}
  </section>`;
}

function g8IntermediateHtmlV3(analysis) {
  const rows = [["clicks", "Клики"], ["leads", "Заявки"], ["sales", "Продажи"], ["revenue", "Выручка"]]
    .filter(([key]) => key !== analysis.metric && Number.isFinite(analysis.calculation.values[key]));
  if (!rows.length) return "";
  return `<div class="g8-intermediate"><span>Что уже можно рассчитать</span>${rows.map(([key, label]) => `<b>${escapeHtml(label)}: ${escapeHtml(g8FormatValueV3(key, analysis.calculation.values[key]))}</b>`).join("")}</div>`;
}

function g8ExpectHtmlV3(analysis) {
  const available = Number.isFinite(analysis.value);
  const statement = !available
    ? "Недостаточно данных для прогноза"
    : analysis.reached === null
      ? "Базовый прогноз рассчитан; цель для этой метрики не задана"
      : analysis.reached
        ? "Базовый прогноз достигает цели"
        : "Базовый прогноз ниже цели";
  const resultCost = analysis.metric === "leads"
    ? analysis.calculation.values.cpl
    : analysis.metric === "sales" ? analysis.calculation.values.cpa : NaN;
  const resultCostMetric = analysis.metric === "leads" ? "cpl" : "cpa";
  const range = analysis.range.available
    ? `${g8FormatValueV3(analysis.metric, analysis.range.min)} — ${g8FormatValueV3(analysis.metric, analysis.range.max)}`
    : "";
  const actualProgress = analysis.actual.rows.length
    ? `<div class="g8-fact-progress"><span>Уже получено в выбранном периоде</span><b>Расход ${escapeHtml(g8Money(analysis.calculation.actualSpend))} · клики ${escapeHtml(g8FormatValueV3("clicks", analysis.actual.clicks.value))} · заявки ${escapeHtml(g8FormatValueV3("leads", analysis.actual.leads.value))}${analysis.actual.sales.present ? ` · продажи ${escapeHtml(g8FormatValueV3("sales", analysis.actual.sales.value))}` : ""}</b><small>В прогноз добавляется только результат на оставшийся бюджет ${escapeHtml(g8Money(Math.max(0, analysis.calculation.futureSpend || 0)))} — факт повторно не считается.</small></div>`
    : "";
  const summaryCards = available ? [
    range && ["Диапазон", range],
    Number.isFinite(analysis.target.value) && ["Цель и разница", `${g8FormatValueV3(analysis.metric, analysis.target.value)} · ${g8DeltaLabelV3(analysis.metric, analysis.goalDifference)}`],
    Number.isFinite(resultCost) && ["Стоимость результата", g8FormatValueV3(resultCostMetric, resultCost)],
    analysis.mainConstraint && ["Главное ограничение", analysis.mainConstraint],
  ].filter(Boolean) : [];
  return `<div class="g8-expect-summary ${available ? "" : "is-missing"}">
    ${available ? `<div class="g8-expect-main"><span>${escapeHtml(g8MetricLabel(analysis.metric))} · ${escapeHtml(analysis.period.start)} — ${escapeHtml(analysis.period.end)}</span><strong>${escapeHtml(g8FormatValueV3(analysis.metric, analysis.value))}</strong><b>${escapeHtml(statement)}</b></div>` : ""}
    ${g8RequiredDataHtmlV3(analysis)}
    ${summaryCards.length ? `<div class="g8-expect-grid">${summaryCards.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`).join("")}</div>` : ""}
    ${actualProgress}
    ${g8IntermediateHtmlV3(analysis)}
    ${available ? `<div class="g8-basis-line"><span class="g8-basis-tag is-${escapeAttr(analysis.basis.level)}">${escapeHtml(analysis.basis.label)}</span><b>${escapeHtml(analysis.basis.reason)}</b><small>${escapeHtml(analysis.calculation.route)}</small></div>` : ""}
    ${analysis.probability.available ? `<div class="g8-probability"><b>Историческая доля достижения цели: ${escapeHtml(g8Percent(analysis.probability.percent))}</b><span>${escapeHtml(analysis.probability.source)} · ${analysis.probability.count} периодов</span></div>` : ""}
    ${g8InlineDetailsV3(analysis)}
  </div>`;
}

function g8LinkedTaskV3(recommendation, analysis) {
  const signature = g8RecommendationSignatureV3(recommendation, analysis);
  const link = (analysis.data.linkedTasks || []).find((item) => item.signature === signature);
  const task = link ? ensureGate7State().tasks.find((item) => item.id === link.taskId) : null;
  return { signature, link, task };
}

function g8RecommendationCardV3(recommendation, analysis) {
  const linked = g8LinkedTaskV3(recommendation, analysis);
  return `<article class="g8-recommendation" data-g8-v3-recommendation="${escapeAttr(recommendation.id)}">
    <div class="g8-recommendation-copy"><strong>${escapeHtml(recommendation.what)}</strong>
      <dl><div><dt>Где</dt><dd>${escapeHtml(recommendation.where)}</dd></div><div><dt>Основание</dt><dd>${escapeHtml(recommendation.basis)}</dd></div><div><dt>Ожидаемый эффект</dt><dd>${escapeHtml(recommendation.effect)}</dd></div><div><dt>Когда проверить</dt><dd>${escapeHtml(recommendation.checkWhen)}</dd></div></dl>
    </div>
    <button type="button" class="${linked.task ? "secondary-btn" : "primary-btn"}" data-g8-v3-task="${escapeAttr(recommendation.id)}">${linked.task ? "Открыть задачу" : "Создать задачу"}</button>
  </article>`;
}

function g8ActionsHtmlV3(analysis) {
  if (!analysis.recommendations.length) return `<div class="g8-empty"><strong>Обоснованных рекомендаций пока нет.</strong><span>Система не добавляет общие советы ради заполнения списка.</span></div>`;
  const main = analysis.recommendations.slice(0, 3);
  const other = analysis.recommendations.slice(3);
  const otherOpen = analysis.compact.open.moreRecommendations === true;
  return `<div class="g8-recommendations">${main.map((item) => g8RecommendationCardV3(item, analysis)).join("")}</div>
    ${other.length ? `<button type="button" class="g8-more-button" data-g8-v3-toggle="moreRecommendations">${otherOpen ? "Скрыть остальные" : `Ещё ${other.length} ${other.length === 1 ? "вывод" : "вывода"}`} ${otherOpen ? "↑" : "↓"}</button><div class="g8-recommendations" ${otherOpen ? "" : "hidden"}>${other.map((item) => g8RecommendationCardV3(item, analysis)).join("")}</div>` : ""}`;
}

function g8ScenarioFieldV3(key, label, unit, analysis) {
  const value = analysis.data.manual?.[key] ?? "";
  const options = ["siteConversion", "saleConversion", "margin"].includes(key) ? { maximum: 100 } : {};
  const parsed = g8TextV3(value) ? g8NumericV3(value, options) : null;
  return `<label class="g8-scenario-field ${parsed && !parsed.valid ? "is-error" : ""}"><span>${escapeHtml(label)}</span><input type="number" min="0" ${options.maximum ? `max="${escapeAttr(options.maximum)}"` : ""} step="any" data-g8-v3-manual="${escapeAttr(key)}" value="${escapeAttr(value)}" placeholder="не менять"><small>${parsed && !parsed.valid ? escapeHtml(parsed.error) : escapeHtml(unit)}</small></label>`;
}

const G8_SCENARIO_LABELS_V4 = Object.freeze({
  base: "Базовый",
  favorable: "Благоприятный",
  unfavorable: "Неблагоприятный",
  stress: "Стрессовый",
  custom: "Пользовательский",
});

function g8ScenarioValueLabelV4(value, unit) {
  if (!Number.isFinite(value)) return "не задано";
  if (unit === "₽") return g8Money(value);
  if (unit === "%") return g8Percent(value);
  return g8NumberLabel(value, 2);
}

function g8ScenarioConditionsV4(result) {
  const changes = result.definition.changes || [];
  if (!changes.length) {
    return `<div class="g8-scenario-condition is-static"><b>${result.key === "base" ? "Без изменений" : result.key === "custom" ? "Задайте условия" : "Условия не сформированы"}</b><small>${escapeHtml(result.definition.basis)}</small></div>`;
  }
  return changes.map((item) => {
    const before = item.fromValid ? g8ScenarioValueLabelV4(item.fromValue, item.unit) : "не задано";
    const after = item.valid === false ? `ошибка: ${item.error}` : g8ScenarioValueLabelV4(item.value, item.unit);
    return `<div class="g8-scenario-condition"><span>${escapeHtml(item.label)}</span><b>${escapeHtml(before)} → ${escapeHtml(after)}</b><small>${escapeHtml(item.basis)}</small></div>`;
  }).join("");
}

function g8ScenarioUnavailableReasonV4(result, analysis) {
  if (result.key === "custom" && !(result.definition.changes || []).length)
    return "Задайте хотя бы одно условие ниже — значения не подставляются автоматически.";
  if (!result.definition.available) return result.definition.basis;
  const invalidChanges = (result.definition.changes || []).filter((item) => item.valid === false);
  if (invalidChanges.length)
    return invalidChanges.map((item) => `${item.label}: ${item.error}`).join("; ");
  const commonKeys = new Set(analysis.missingData.map((item) => item.key));
  const local = (result.missing || []).filter((item) => !commonKeys.has(item.key));
  if (local.length) return local.map((item) => g8IssueCopyV3(item)).join("; ");
  if (analysis.missingData.length)
    return "Не хватает общих исходных данных — они перечислены один раз в блоке «Чего ожидать».";
  return result.calculation?.errors?.map((item) => item.reason).filter(Boolean).join("; ") || "Для этого набора условий нет обоснованного результата.";
}

function g8ScenarioResultCostV4(analysis, calculation) {
  if (!calculation) return { label: "Стоимость результата", value: "Недостаточно данных" };
  if (analysis.metric === "leads") return { label: "Стоимость результата", value: g8FormatValueV3("cpl", calculation.values.cpl) };
  if (analysis.metric === "sales") return { label: "Стоимость результата", value: g8FormatValueV3("cpa", calculation.values.cpa) };
  return { label: "Стоимость результата", value: "Не применяется к выбранной метрике" };
}

function g8ScenarioCustomFieldsV4(analysis) {
  return `<div class="g8-scenario-fields" aria-label="Условия пользовательского сценария">
    ${g8ScenarioFieldV3("budget", "Бюджет", "₽", analysis)}
    ${g8ScenarioFieldV3("cpc", "CPC", "₽", analysis)}
    ${g8ScenarioFieldV3("cpl", "CPL", "₽", analysis)}
    ${g8ScenarioFieldV3("siteConversion", "Клик → заявка", "%", analysis)}
    ${g8ScenarioFieldV3("saleConversion", "Заявка → продажа", "%", analysis)}
    ${g8ScenarioFieldV3("averageCheck", "Средний чек", "₽", analysis)}
    ${g8ScenarioFieldV3("margin", "Маржинальность", "%", analysis)}
    <button type="button" class="secondary-btn" data-g8-v3-reset-scenario>Сбросить условия</button>
  </div>`;
}

function g8ScenarioCardV4(result, analysis) {
  const calculation = result.calculation;
  const budgetRecord = result.definition.parameters?.budget;
  const budget = calculation && Number.isFinite(calculation.totalSpend)
    ? g8Money(calculation.totalSpend)
    : g8UnitValueV3(budgetRecord);
  const range = result.range?.available
    ? `${g8FormatValueV3(analysis.metric, result.range.min)} — ${g8FormatValueV3(analysis.metric, result.range.max)}`
    : "Не рассчитан: нет отдельного основания";
  const cost = g8ScenarioResultCostV4(analysis, calculation);
  const fromBase = Number.isFinite(result.differenceFromBase)
    ? g8DeltaLabelV3(analysis.metric, result.differenceFromBase)
    : "Нет сопоставимого базового расчёта";
  const fromGoal = Number.isFinite(result.differenceFromGoal)
    ? g8DeltaLabelV3(analysis.metric, result.differenceFromGoal)
    : "Цель для метрики не задана или расчёт недоступен";
  const status = result.available
    ? result.key === "base" ? "Базовый расчёт" : result.key === "custom" ? "Явное допущение" : "По фактическому диапазону"
    : result.key === "custom" && !(result.definition.changes || []).length ? "Задайте условия" : "Нет расчёта";
  return `<article class="g8-scenario-card ${result.available ? "is-available" : "is-unavailable"}" data-g8-v3-scenario-card="${escapeAttr(result.key)}">
    <header><div><strong>${escapeHtml(G8_SCENARIO_LABELS_V4[result.key])}</strong><span>${escapeHtml(g8MetricLabel(analysis.metric))} · ${escapeHtml(analysis.period.start)} — ${escapeHtml(analysis.period.end)}</span></div><span class="g8-scenario-status">${escapeHtml(status)}</span></header>
    <div class="g8-scenario-conditions"><strong>Условия</strong>${g8ScenarioConditionsV4(result)}</div>
    ${result.key === "custom" ? g8ScenarioCustomFieldsV4(analysis) : ""}
    ${result.available ? "" : `<div class="g8-scenario-unavailable"><strong>Результат не рассчитан</strong><span>${escapeHtml(g8ScenarioUnavailableReasonV4(result, analysis))}</span></div>`}
    <div class="g8-scenario-metrics">
      <div><span>Бюджет</span><b>${escapeHtml(budget)}</b></div>
      <div><span>Прогноз · ${escapeHtml(g8MetricLabel(analysis.metric))}</span><b>${escapeHtml(g8FormatValueV3(analysis.metric, result.value))}</b><small>Диапазон: ${escapeHtml(range)}</small></div>
      <div><span>${escapeHtml(cost.label)}</span><b>${escapeHtml(cost.value)}</b></div>
      <div><span>Разница с базой</span><b>${escapeHtml(result.key === "base" && result.available ? g8DeltaLabelV3(analysis.metric, 0) : fromBase)}</b></div>
      <div><span>Разница с целью</span><b>${escapeHtml(fromGoal)}</b></div>
    </div>
  </article>`;
}

function g8ScenarioHtmlV3(analysis) {
  const order = ["base", "favorable", "unfavorable", "stress", "custom"];
  return `<div class="g8-scenario-context"><strong>${escapeHtml(g8MetricLabel(analysis.metric))}</strong><span>${escapeHtml(analysis.context.product?.name || "Продукт не выбран")} · ${escapeHtml(analysis.context.campaignLabel || "Кампания не выбрана")} · ${escapeHtml(analysis.period.start)} — ${escapeHtml(analysis.period.end)}</span></div>
    <div class="g8-scenario-list">${order.map((key) => g8ScenarioCardV4(analysis.scenarioResults[key], analysis)).join("")}</div>
    <p class="g8-scenario-note">Все варианты используют один проект, продукт, кампанию и период. Сценарные условия хранятся отдельно и не изменяют факты Gate 5, утверждённый бюджет Gate 4 или историю.</p>`;
}

function g8DataHtmlV3(analysis) {
  const records = analysis.calculation.used;
  const limitations = [
    analysis.range.available ? "Диапазон рассчитан только по наблюдавшимся результатам сопоставимых периодов." : analysis.range.method,
    "Сезонность и доступный объём спроса не изменяют результат без измеренной поправки для этой кампании.",
    "Готовность гейтов и закрытие задач не используются как множитель результата.",
    "Перенос прошлой эффективности предполагает тот же продукт, кампанию, способ учёта и сопоставимый период.",
  ];
  return `<div class="g8-data-summary"><div><span>Режим</span><b>${escapeHtml(analysis.reliability.mode)}</b></div><div><span>Формула</span><b>${escapeHtml(analysis.calculation.route || "Не выбрана: не хватает входных данных")}</b></div><div><span>Наблюдения</span><b>${analysis.observations.length} сопоставимых периодов</b></div><div><span>Заполненность активной формулы</span><b>${analysis.completeness.filled} из ${analysis.completeness.total}</b><small>Это не процент уверенности и не прогноз продаж.</small></div></div>
    <div class="g8-data-list">${records.map((record) => `<div class="g8-data-row"><div><strong>${escapeHtml(record.label)}</strong><span>${record.kind === "fact" ? "Факт" : record.kind === "plan" ? "Утверждённый план" : "Допущение"} · ${escapeHtml(record.unit || "без единицы")}</span></div><div><b>${escapeHtml(g8UnitValueV3(record))}</b><small>${escapeHtml(record.source)}${record.periodStart ? ` · ${escapeHtml(record.periodStart)} — ${escapeHtml(record.periodEnd)}` : ""}</small><small>product_id: ${escapeHtml(record.productId || "—")} · campaign_id: ${escapeHtml(record.campaignId || "—")} · наблюдений: ${record.observations || 0} · обновлено: ${escapeHtml(g8DateLabel(record.updatedAt))}</small></div>${g8SourceButtonV3(record, analysis, "Источник")}</div>`).join("")}</div>
    <div class="g8-constraints"><strong>Ограничения экономики — не фактические затраты</strong><span>Допустимый CPL: ${escapeHtml(g8UnitValueV3(analysis.constraints.allowedCpl))}</span><span>Допустимый CPA: ${escapeHtml(g8UnitValueV3(analysis.constraints.allowedCpa))}</span></div>
    <div class="g8-limitations"><strong>Допущения и границы применимости</strong><ul>${limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>
    <details class="g8-legacy-map"><summary>Технические подробности модели</summary><div><p><b>Версия расчёта</b><span>${escapeHtml(GATE8_WORKBENCH_VERSION)}</span></p>${GATE8_LEGACY_SECTION_MAP.map(([before, after]) => `<p><b>${escapeHtml(before)}</b><span>→ ${escapeHtml(after)}</span></p>`).join("")}</div></details>`;
}

function g8SnapshotActualV3(snapshot) {
  const today = new Date().toISOString().slice(0, 10);
  if (!snapshot?.forecastPeriod?.end || snapshot.forecastPeriod.end >= today) return { available: false, reason: "Период ещё не завершён" };
  if (!snapshot.product_id || snapshot.product_id !== guruV194SelectedProduct(state)?.id) return { available: false, reason: "Нет точного product_id для сопоставления" };
  const product = guruV194Product(snapshot.product_id, state);
  const productData = g8ProductDataV3(product);
  const campaign = productData.campaigns.find((row) => row.id === snapshot.campaignId);
  if (snapshot.campaignId && !campaign) return { available: false, reason: "Кампания снимка не найдена в текущем проекте" };
  const context = { ...productData, campaign, campaignId: campaign?.id || "", needsSelection: false };
  const observations = campaign ? g8ObservationsV3(product, context) : [];
  const actual = g8ActualForPeriodV3(observations, snapshot.forecastPeriod.start, snapshot.forecastPeriod.end);
  const spend = actual.spend.present ? actual.spend.value : NaN;
  let value = actual[snapshot.metric]?.present ? actual[snapshot.metric].value : NaN;
  if (snapshot.metric === "cpl") value = actual.leads.present && actual.leads.value > 0 && Number.isFinite(spend) ? spend / actual.leads.value : NaN;
  if (snapshot.metric === "cpa") value = actual.sales.present && actual.sales.value > 0 && Number.isFinite(spend) ? spend / actual.sales.value : NaN;
  if (["profit", "roi"].includes(snapshot.metric)) {
    const revenue = actual.revenue.present ? actual.revenue.value : NaN;
    const marginRecord = (snapshot.inputs || []).find((item) => item.key === "margin");
    const margin = marginRecord?.valid ? marginRecord.value : NaN;
    const profit = Number.isFinite(revenue) && Number.isFinite(margin) && Number.isFinite(spend) ? revenue * margin / 100 - spend : NaN;
    value = snapshot.metric === "roi" && spend > 0 ? profit / spend * 100 : profit;
  }
  if (!Number.isFinite(value)) return { available: false, reason: "Для той же метрики и контекста факт пока не загружен" };
  const forecastValue = Number(snapshot.result?.value ?? snapshot.forecastValue);
  const absolute = Number.isFinite(forecastValue) ? value - forecastValue : NaN;
  const percent = Number.isFinite(absolute) && forecastValue !== 0 ? absolute / Math.abs(forecastValue) * 100 : NaN;
  return { available: true, value, absolute, percent, observations: actual.rows.length };
}

function g8HistoryHtmlV3(analysis) {
  const rows = (analysis.data.history || []).slice().reverse();
  return `<div class="g8-history-actions"><button type="button" class="primary-btn" data-g8-v3-snapshot ${Number.isFinite(analysis.selectedValue) ? "" : "disabled"}>Зафиксировать прогноз</button><span>Запись создаётся только по нажатию. Изменения полей не переписывают историю.</span></div>
    ${rows.length ? `<div class="g8-history-list">${rows.map((item) => {
      const oldModel = item.modelVersion !== GATE8_WORKBENCH_VERSION;
      const metric = item.metric || "sales";
      const forecastValue = Number(item.result?.value ?? item.forecastValue);
      const actual = g8SnapshotActualV3(item);
      const range = Array.isArray(item.range) ? item.range : item.range?.available ? [item.range.min, item.range.max] : [];
      return `<article class="g8-history-card"><div><strong>${escapeHtml(g8DateLabel(item.createdAt))}</strong><span>${escapeHtml(item.scenario === "custom" ? "Пользовательский сценарий" : item.scenario || "Базовый сценарий")}</span>${oldModel ? '<em>Рассчитано прежней моделью</em>' : ""}</div><div><span>Период и контекст</span><b>${escapeHtml(item.forecastPeriod ? `${item.forecastPeriod.start} — ${item.forecastPeriod.end}` : "В старом снимке период не зафиксирован")}</b><small>product_id: ${escapeHtml(item.product_id || "не зафиксирован")} · campaign_id: ${escapeHtml(item.campaignId || "не зафиксирован")}</small></div><div><span>Прогноз</span><b>${escapeHtml(g8FormatValueV3(metric, forecastValue))}</b>${range.length === 2 ? `<small>${escapeHtml(g8FormatValueV3(metric, Number(range[0])))} — ${escapeHtml(g8FormatValueV3(metric, Number(range[1])))}</small>` : ""}</div><div><span>Факт и отклонение</span>${actual.available ? `<b>${escapeHtml(g8FormatValueV3(metric, actual.value))}</b><small>абсолютно ${escapeHtml(g8DeltaLabelV3(metric, actual.absolute))}${Number.isFinite(actual.percent) ? ` · ${escapeHtml(g8Percent(actual.percent))}` : " · процент не рассчитывается при нулевом прогнозе"}</small>` : `<b>Пока не сопоставлен</b><small>${escapeHtml(actual.reason)}</small>`}</div></article>`;
    }).join("")}</div>` : `<div class="g8-empty"><strong>История пуста.</strong><span>Корректный прогноз можно зафиксировать явным действием выше.</span></div>`}`;
}

function g8StoreSnapshotV3() {
  const analysis = g8AnalysisV3();
  if (!Number.isFinite(analysis.selectedValue) || !analysis.context.product) {
    analysis.data.message = "Прогноз не зафиксирован: сначала получите рассчитываемый результат для выбранного продукта.";
    saveState();
    renderGate();
    return;
  }
  const selectedKey = analysis.compact.scenario;
  const record = {
    id: makeId("g8-forecast"),
    createdAt: new Date().toISOString(),
    product_id: analysis.context.product.id,
    productName: analysis.context.product.name,
    campaignId: analysis.context.campaignId || "",
    campaignName: analysis.context.campaignLabel || "",
    forecastPeriod: { start: analysis.period.start, end: analysis.period.end },
    metric: analysis.metric,
    scenario: selectedKey,
    inputs: structuredClone(analysis.selectedCalculation.used),
    assumptions: structuredClone(analysis.selectedCalculation.used.filter((item) => item.kind === "assumption")),
    result: { value: analysis.selectedValue, unit: g8MetricLabel(analysis.metric) },
    forecastValue: analysis.selectedValue,
    range: selectedKey === "base" ? structuredClone(analysis.range) : { available: false },
    sourceUpdatedAt: analysis.observations.at(-1)?.updatedAt || state?.updatedAt || "",
    modelVersion: GATE8_WORKBENCH_VERSION,
  };
  analysis.data.history.push(record);
  analysis.data.history = analysis.data.history.slice(-60);
  analysis.data.message = "Прогноз зафиксирован. Последующие изменения исходных данных этот снимок не пересчитают.";
  saveState();
  renderGate();
}

function g8CreateOrOpenTaskV3(recommendationId) {
  const analysis = g8AnalysisV3();
  const recommendation = analysis.recommendations.find((item) => item.id === recommendationId);
  if (!recommendation) return;
  const linked = g8LinkedTaskV3(recommendation, analysis);
  if (linked.task) {
    const g7 = ensureGate7State();
    g7.ui.openSections[linked.task.sectionId || "new"] = true;
    saveState();
    guruNavigateToGate("gate-7");
    requestAnimationFrame(() => document.querySelector(`[data-g7-task="${CSS.escape(linked.task.id)}"]`)?.scrollIntoView({ block: "center" }));
    return;
  }
  const product = analysis.context.product;
  const g7 = ensureGate7State();
  const task = {
    id: makeId("g7-task"),
    product_id: product.id,
    campaign_id: analysis.context.campaignId || "",
    implementation_id: recommendation.implementationId || "",
    task: recommendation.what,
    where: recommendation.where,
    date: analysis.period.end,
    result: "",
    status: "not_started",
    sectionId: "new",
    order: typeof gate7InsertAtTop === "function" ? gate7InsertAtTop("new") : 0,
    createdAt: new Date().toISOString(),
    priority: "Высокий",
    readinessCriterion: recommendation.checkWhen,
    sourceProblem: recommendation.basis,
    forecastLink: {
      gate: "gate-8",
      recommendationId: recommendation.id,
      product_id: product.id,
      campaignId: analysis.context.campaignId || "",
      periodStart: analysis.period.start,
      periodEnd: analysis.period.end,
      metric: analysis.metric,
    },
  };
  g7.tasks.push(task);
  analysis.data.linkedTasks.push({ signature: linked.signature, taskId: task.id, product_id: product.id, campaignId: analysis.context.campaignId || "", recommendationId: recommendation.id, createdAt: task.createdAt });
  analysis.data.message = "Задача создана и связана с рекомендацией, продуктом, кампанией и периодом.";
  saveState();
  renderGate();
}

renderGate8Forecast = function () {
  setToolbarVisible(false);
  const analysis = g8AnalysisV3();
  const calculationState = g8CalculationStateV3(analysis);
  els.contentArea.innerHTML = `<div class="g8-workbench" data-g8-workbench-version="${escapeAttr(GATE8_WORKBENCH_VERSION)}">
    <header class="g8-workbench-header"><div><div class="analytics-path">Gate 8 → Прогноз и моделирование</div><h2>Прогноз, решение и проверка условий</h2><p>Факты выбранного продукта и кампании не смешиваются с допущениями.</p></div><span class="status-pill status-${escapeAttr(calculationState.systemStatus)} g8-calculation-state" data-g8-calculation-state="${escapeAttr(calculationState.key)}">${escapeHtml(calculationState.label)}</span></header>
    ${g8ContextPanelV3(analysis)}
    <div class="g8-primary-stack">
      ${g8CompactDisclosureV3("expect", "Чего ожидать", "", g8ExpectHtmlV3(analysis), analysis, { primary: true })}
      ${g8CompactDisclosureV3("action", "Что сделать", "", g8ActionsHtmlV3(analysis), analysis, { primary: true })}
      ${g8CompactDisclosureV3("scenario", "Что изменится, если…", "", g8ScenarioHtmlV3(analysis), analysis, { primary: true, lockedOpen: true })}
    </div>
    ${analysis.data.message ? `<div class="g8-toast">${escapeHtml(analysis.data.message)}</div>` : ""}
  </div>`;
};

let g8ManualScenarioRenderTimerV4 = 0;

function g8UpdateManualScenarioV4(input, renderImmediately = false) {
  const key = input?.dataset?.g8V3Manual;
  if (key === undefined) return;
  const data = ensureGate8Workspace();
  data.manual[key] = input.value;
  data.message = "";
  flashSaving();
  clearTimeout(g8ManualScenarioRenderTimerV4);
  const commit = () => {
    g8ManualScenarioRenderTimerV4 = 0;
    saveState();
    if (activeView !== "gate" || activeGateId !== "gate-8") return;
    renderGate();
    const next = document.querySelector(`[data-g8-v3-manual="${CSS.escape(key)}"]`);
    next?.focus({ preventScroll: true });
  };
  if (renderImmediately) commit();
  else g8ManualScenarioRenderTimerV4 = setTimeout(commit, 220);
}

document.addEventListener("input", (event) => {
  const input = event.target?.closest?.("[data-g8-v3-manual]");
  if (!input) return;
  g8UpdateManualScenarioV4(input);
}, true);

document.addEventListener("change", (event) => {
  if (event.target?.matches?.("[data-g8-product-pick-select]")) {
    saveState();
    return;
  }
  const contextKey = event.target?.dataset?.g8V3Context;
  if (contextKey !== undefined) {
    const goal = g8StrictGoalV3();
    const compact = g8CompactStateV3(guruV194SelectedProduct(state), goal);
    compact[contextKey] = event.target.value;
    compact.updatedAt = new Date().toISOString();
    flashSaving();
    saveState();
    renderGate();
    return;
  }
  const manualKey = event.target?.dataset?.g8V3Manual;
  if (manualKey !== undefined) {
    g8UpdateManualScenarioV4(event.target, true);
  }
});

document.addEventListener("click", (event) => {
  const sourceButton = event.target?.closest?.("[data-g8-v3-source]");
  if (sourceButton) {
    let target = null;
    try {
      target = JSON.parse(sourceButton.dataset.g8V3Source || "null");
    } catch (_error) {
      return;
    }
    if (!target?.gateId) return;
    event.preventDefault();
    event.stopPropagation();
    g8NavigateToSourceV3(target);
    return;
  }
  const toggle = event.target?.closest?.("[data-g8-v3-toggle]");
  if (toggle) {
    const compact = g8CompactStateV3(guruV194SelectedProduct(state), g8StrictGoalV3());
    const key = toggle.dataset.g8V3Toggle;
    compact.open[key] = !compact.open[key];
    compact.updatedAt = new Date().toISOString();
    saveState();
    renderGate();
    return;
  }
  const task = event.target?.closest?.("[data-g8-v3-task]");
  if (task) {
    g8CreateOrOpenTaskV3(task.dataset.g8V3Task);
    return;
  }
  if (event.target?.closest?.("[data-g8-v3-snapshot]")) {
    g8StoreSnapshotV3();
    return;
  }
  if (event.target?.closest?.("[data-g8-v3-reset-scenario]")) {
    const data = ensureGate8Workspace();
    data.manual = { ...g8BlankState().manual };
    data.message = "Пользовательские допущения сброшены. Исходные данные проекта не менялись.";
    saveState();
    renderGate();
  }
});

function g8EnsureMigrationV3(workspace) {
  if (!workspace) return workspace;
  const base = __g8WorkbenchPreviousEnsureWorkspace(workspace);
  if (!base) return workspace;
  base.migrationLog = Array.isArray(base.migrationLog) ? base.migrationLog : [];
  if (!base.migrationLog.some((entry) => entry?.id === GATE8_WORKBENCH_MIGRATION)) {
    base.migrationLog.push({
      id: GATE8_WORKBENCH_MIGRATION,
      appliedAt: new Date().toISOString(),
      description: "Gate 8 uses three calculation-driven blocks. All five scenarios render together, data/history are nested, missing inputs use exact source targets, and legacy manual values, task links and history are preserved.",
      sourceTargets: {
        gate4: "gate4Production.forecastAssumptionsByProduct[product_id]",
        gate1: "unitV130.items[product_id] / embedded Brown calculator",
        gate5: "gate5 product projection + selected campaign import",
      },
      legacyMap: GATE8_LEGACY_SECTION_MAP,
    });
  }
  return workspace;
}

const __g8WorkbenchPreviousPrepareCards = prepareSystemCards;
prepareSystemCards = function (workspace) {
  __g8WorkbenchPreviousPrepareCards(workspace);
  g8EnsureMigrationV3(workspace);
};

const __g8WorkbenchPreviousMigrate = migrateWorkspace;
migrateWorkspace = function (workspace, projectId) {
  return g8EnsureMigrationV3(__g8WorkbenchPreviousMigrate(workspace, projectId));
};

const __g8WorkbenchPreviousFresh = createFreshWorkspace;
createFreshWorkspace = function (meta) {
  return g8EnsureMigrationV3(__g8WorkbenchPreviousFresh(meta));
};

if (state) g8EnsureMigrationV3(state);

const __g8WorkbenchPreviousRenderGateNavV3 = renderGateNav;
renderGateNav = function () {
  const result = __g8WorkbenchPreviousRenderGateNavV3.apply(this, arguments);
  // Быстрый переход меняет в меню только active-состояние. Полный анализ
  // Gate 8 здесь не нужен и заметно задерживал открытие любого другого Gate.
  if (
    (typeof guruFastGateNavigation !== "undefined" && guruFastGateNavigation) ||
    (typeof guruUserEditDispatchActive !== "undefined" &&
      guruUserEditDispatchActive &&
      guruUserEditEventType === "input")
  )
    return result;
  try {
    const button = els.gateNav?.querySelector?.('[data-gate-id="gate-8"]');
    const label = button?.querySelector?.(".small");
    if (label) {
      // Core уже свёл единственный статус Gate 8 в readiness-кэш. Эта
      // проекция полностью эквивалентна повторному g8AnalysisV3(), но не
      // пересобирает весь прогноз второй раз ради подписи меню.
      const readiness =
        typeof guruGateReadinessCache !== "undefined"
          ? guruGateReadinessCache.get("gate-8")
          : null;
      const calculationState = readiness?.problem
        ? { key: "invalid", label: "Требуется исправить данные" }
        : readiness?.notStarted
          ? { key: "missing", label: "Не хватает данных" }
          : readiness?.inProgress
            ? { key: "assumption", label: "Расчёт по допущениям" }
            : readiness?.total && readiness.ready + readiness.notRequired === readiness.total
              ? { key: "calculated", label: "Рассчитано" }
              : g8CalculationStateV3(g8AnalysisV3());
      label.textContent = calculationState.label;
      button.dataset.g8CalculationState = calculationState.key;
    }
  } catch (_error) {}
  return result;
};

/* Diagnostics describe only the three actual Gate 8 blocks. Nested data and
 * history remain auditable details, not readiness units of their own. */
const __g8WorkbenchPreviousRuntimeExport = guruExportRuntimeModelV223;
guruExportRuntimeModelV223 = function (gateId) {
  if (gateId !== "gate-8") return __g8WorkbenchPreviousRuntimeExport(gateId);
  try {
    const analysis = g8AnalysisV3();
    const definitions = [
      ["expect", "Чего ожидать", GATE8_LEGACY_SECTION_MAP.slice(3, 7)],
      ["action", "Что сделать", GATE8_LEGACY_SECTION_MAP.slice(13, 18)],
      ["scenario", "Что изменится, если…", GATE8_LEGACY_SECTION_MAP.slice(7, 13)],
    ];
    const calculationState = g8CalculationStateV3(analysis);
    const units = definitions.map(([key, title, legacySections], index) => guruExportModelUnitV223({
      unitId: `gate8-workbench-${key}`,
      gateId,
      title,
      status: calculationState.systemStatus,
      displayedStatus: calculationState.systemStatus,
      sourceType: "gate8_compact_workbench_block",
      path: "g8CalculationStateV3(g8Analysis())",
      displayedPath: `renderGate8Forecast → data-g8-v3-section=${key}`,
      includedInGateReadiness: index === 0,
      details: {
        blockNumber: index + 1,
        calculationState: calculationState.label,
        nestedViews: key === "expect" ? ["Данные и расчёт", "История: прогноз и факт"] : [],
        legacySections: key === "expect" ? [...GATE8_LEGACY_SECTION_MAP.slice(0, 7), ...GATE8_LEGACY_SECTION_MAP.slice(18, 20)] : legacySections,
      },
    }));
    return {
      model: "gate8_visible_scenarios_workbench_v5",
      modelVersion: GATE8_WORKBENCH_VERSION,
      displayedStatus: getGate8Status(analysis),
      displayedStatusLabel: calculationState.label,
      forecastAvailable: Boolean(analysis.forecastCore.available),
      completeness: analysis.completeness.percent,
      reliability: analysis.reliability.level,
      benchmarkUsed: false,
      legacySectionMap: GATE8_LEGACY_SECTION_MAP,
      units,
    };
  } catch (error) {
    return { model: "gate8_visible_scenarios_workbench_v5", modelVersion: GATE8_WORKBENCH_VERSION, units: [], error: String(error?.message || error) };
  }
};

if (GURU_EXPORT_CODE_REFERENCES_V223?.["gate-8"]) {
  GURU_EXPORT_CODE_REFERENCES_V223["gate-8"].push({
    file: "gate8-workbench.js",
    line: 1,
    symbol: "g8AnalysisV3 / renderGate8Forecast",
    role: "Active compact evidence-first Gate 8 model, renderer, scenarios, recommendations and explicit history",
  });
}
