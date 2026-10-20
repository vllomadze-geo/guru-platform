/* Read-only Gate 8 plan audit. Every answer is derived from the live, scoped
 * stores used by the forecast; this module never writes an answer back. */
const G8_AUDIT_STATUS_V1 = {
  not_started: "Не начато", in_progress: "В работе", ready: "Готово",
  needs_attention: "Требует внимания", problem: "Проблема", not_required: "Не требуется",
};

function g8AuditSourceV1(gateId, label, target) {
  return { gateId, label, target: { gateId, ...target } };
}

function g8AuditExecutionV1(productId = "") {
  const gate2 = state?.gates?.find((gate) => gate.id === "gate-2");
  const cards = gate2?.cards || [];
  const ready = cards.filter((card) => g2CardStatus(card) === "ready").length;
  const blocker = cards.find((card) => g2CardStatus(card) === "problem") ||
    cards.find((card) => g2CardStatus(card) !== "ready");
  const tasks = (state?.gate7Journal?.tasks || []).filter((task) =>
    !productId || guruV185Text(task.product_id) === productId);
  const pending = tasks.filter((task) => gate7TaskStatus(task) !== "ready");
  return {
    ready, total: cards.length, blocker, tasks, pending,
    gate2Source: g8AuditSourceV1("gate-2", "Gate 2 · Техническая готовность",
      { kind: "gate2-card", cardId: blocker?.id || cards[0]?.id || "", field: "notes" }),
    gate7Source: g8AuditSourceV1("gate-7", "Gate 7 · Исполнение",
      { kind: "gate7-task-v1", taskId: pending[0]?.id || tasks[0]?.id || "" }),
  };
}

function g8AuditQuestionV1(title, answer, checks, sources, options = {}) {
  const present = checks.filter((value) => Boolean(value)).length;
  const missingIndex = checks.findIndex((value) => !value);
  const availableSources = sources.filter(Boolean);
  const nextSource = options.actionSource || availableSources[missingIndex] || availableSources[0];
  const orderedSources = nextSource
    ? [nextSource, ...availableSources.filter((source) => source !== nextSource)] : availableSources;
  const status = options.problem ? "problem"
    : options.notRequired ? "not_required"
      : !present ? "not_started"
        : present < checks.length ? "in_progress"
          : options.attention ? "needs_attention" : "ready";
  return { title, answer, status, sources: orderedSources, nextSource,
    notice: [options.problem, options.notice].filter(Boolean).join(" ") };
}

function g8AuditScopedV1(field, product, fieldLabel) {
  const resolved = guruV194Resolve(field, product, state);
  const record = resolved.records.find((row) => guruV185Text(row.value)) || null;
  const scopeLabel = { product: "продукт", category: "категория", project: "компания" }[resolved.scope];
  const scopedTarget = { kind: "gate0-scoped", productId: product?.id || "", scope: resolved.scope,
    field, recordId: record?.id || "", recordField: {
      segments: "segment_unified", jtbd: "jtbd_result", positioning: "positioning_unified",
      usp: "value", offers: "value",
    }[field] || "value" };
  const target = resolved.scope === "project" && field === "segments"
    ? { kind: "gate0-company-segmentation", cardId: GURU_GATE0_COMPANY_SEGMENTATION_CARD_ID_V309,
        recordId: record?.id || "", field: "unified" }
    : resolved.scope === "project" && field === "positioning"
      ? { kind: "gate0-company-positioning", cardId: GURU_GATE0_COMPANY_POSITIONING_CARD_ID_V308,
          field: "unified" } : scopedTarget;
  return {
    value: guruV185Text(record?.value), record, scope: resolved.scope,
    source: g8AuditSourceV1("gate-0", `Gate 0 · ${fieldLabel} · ${scopeLabel}`,
      target),
    confirmed: !record || !record.confirmation_status || record.confirmation_status === "confirmed",
  };
}

function g8AuditCompanyQuestionsV1(a) {
  const goal = a.goal;
  const goalRecord = guruCompanyPrimaryGoalV360(state);
  const goalSource = (field = "goalTargetValue") => g8AuditSourceV1("gate-0", `Gate 0 · Цель компании · ${{
    goalMetric: "показатель", goalTargetValue: "целевое значение", goalDeadline: "срок", goalBudget: "бюджет",
  }[field] || field}`,
    { kind: "gate0-company-goal", cardId: G8_PROJECT_GOAL_CARD_ID, goalId: goalRecord?.id || "", field });
  const segments = guruCompanySegmentsV360(state);
  const segment = segments.find((row) => guruV185Text(row.value)) || segments[0];
  const segmentSource = g8AuditSourceV1("gate-0", "Gate 0 · Сегмент компании",
    { kind: "gate0-company-segmentation", cardId: GURU_GATE0_COMPANY_SEGMENTATION_CARD_ID_V309,
      recordId: segment?.id || "", field: "unified" });
  const geography = guruV185Text(state?.project?.geography);
  const passportCard = state?.gates?.find((gate) => gate.id === "gate-0")?.cards?.find(isProjectPassportCard);
  const geographySource = g8AuditSourceV1("gate-0", "Gate 0 · Паспорт проекта · География",
    { kind: "gate0-project-field", cardId: passportCard?.id || "", field: "geography" });
  const positioning = guruV308ProjectPositioningRecord(state, false);
  const offers = guruCompanyOffersV360(state);
  const offer = offers.find((row) => guruV185Text(row.value || row.offer?.value)) || offers[0];
  const positioningSource = g8AuditSourceV1("gate-0", "Gate 0 · Позиционирование компании",
    { kind: "gate0-company-positioning", cardId: GURU_GATE0_COMPANY_POSITIONING_CARD_ID_V308, field: "unified" });
  const offerSource = g8AuditSourceV1("gate-0", "Gate 0 · Оффер компании",
    { kind: "gate0-company-offer", cardId: GURU_GATE0_COMPANY_OFFER_CARD_ID_V347,
      recordId: offer?.id || "", field: "offer" });
  const productCount = a.contributions.length;
  const campaignCount = a.contributions.reduce((sum, row) => sum + row.campaignCount, 0);
  const incompleteJourney = a.contributions.find((row) => {
    const product = guruV194Product(row.product_id, state);
    return !product || g3ProductJourneyOverallStatus(g3ProductJourneyStages(g3ProductJourneySnapshot(product))) !== "ready";
  });
  const demandProduct = a.contributions.map((row) => guruV194Product(row.product_id, state))
    .find((product) => product && guruGate1FinalConfirmedV259(product, state).length);
  const companyComparison = state?.projectComparison
    ? projectComparisonStatus(state.projectComparison) : { status: "not_started", filled: 0 };
  const productSource = g8AuditSourceV1("gate-0", "Gate 0 · Каталог продуктов", { kind: "gate0-catalog" });
  const campaignSource = g8AuditSourceV1("gate-4", "Gate 4 · Кампании продуктов", { kind: "gate4-campaign", productId: a.contributions[0]?.product_id || "" });
  const journeySource = g8AuditSourceV1("gate-3", "Gate 3 · Маршрут 5A",
    { kind: "gate3-journey", productId: incompleteJourney?.product_id || a.contributions[0]?.product_id || "" });
  const budgetSource = goalSource("goalBudget");
  const forecastSource = g8AuditSourceV1("gate-8", "Gate 8 · Прогноз компании", { kind: "gate8-audit-section", scope: "company", section: "expect" });
  const factsSource = g8AuditSourceV1("gate-5", "Gate 5 · Фактическая статистика", { kind: "gate5-import-v3", block: "input" });
  const budgetOverrun = goal.budgetRecord.valid && a.plannedProductBudgets > goal.budget;
  const goalMismatch = goal.valid && (goal.metric !== a.metric || goal.deadline && goal.deadline !== a.period.end);
  const periodInvalid = a.period.start > a.period.end;
  const noFact = !a.contributions.some((row) => row.observations > 0);
  const unassignedSpend = a.commonExpenses.unassignedSpend > 0;
  const execution = g8AuditExecutionV1();
  return [
    g8AuditQuestionV1("Какую цель и к какому сроку мы хотим достичь?",
      goal.valid ? `${g8FinalMetricPhraseV3(goal.metric, goal.target)}${goal.deadline ? ` до ${g8DateLabel(goal.deadline)}` : " · срок не указан"}.` : "Измеримая цель компании не задана.",
      [goal.metric, goal.targetRecord.valid, goal.deadline], [goalSource("goalMetric"), goalSource(), goalSource("goalDeadline")],
      { attention: goalMismatch, notice: goalMismatch ? "Показатель или срок цели не совпадает с выбранным прогнозом." : "" }),
    g8AuditQuestionV1("На каком рынке и для кого мы работаем?",
      [geography && `География: ${geography}.`, segment?.value && `Сегмент: ${guruV185Text(segment.value)}.`, demandProduct && "Есть подтверждённые данные спроса Gate 1."].filter(Boolean).join(" ") || "Рынок и аудитория пока не определены.",
      [geography, segment?.value, demandProduct], [geographySource, segmentSource, g8AuditSourceV1("gate-1", "Gate 1 · Подтверждённый спрос", { kind: "gate1-keywords", productId: demandProduct?.id || a.contributions[0]?.product_id || "" })],
      { attention: segment && segment.confirmation_status && segment.confirmation_status !== "confirmed",
        notice: !geography || !segment?.value ? "Уточните географию и сегмент." : !demandProduct ? "Нет подтверждённых данных спроса Gate 1 для продуктов." : "" }),
    g8AuditQuestionV1("Почему клиенты должны выбирать именно нас?",
      [positioning?.value && `Позиционирование: ${guruV185Text(positioning.value)}.`, offer?.value && `Оффер: ${guruV185Text(offer.value)}.`, companyComparison.filled && "Сравнение с конкурентами есть в Gate 1."].filter(Boolean).join(" ") || "Позиционирование и оффер компании не заданы.",
      [positioning?.value, offer?.value, companyComparison.filled], [positioningSource, offerSource, g8AuditSourceV1("gate-1", "Gate 1 · Сравнение компании с конкурентами", { kind: "gate1-project-comparison" })],
      { attention: [positioning, offer].some((row) => row?.confirmation_status && row.confirmation_status !== "confirmed") || companyComparison.status === "in_progress",
        notice: companyComparison.status === "not_started" ? "Конкурентное сравнение компании в Gate 1 не заполнено." : "" }),
    g8AuditQuestionV1("За счёт каких продуктов и каналов мы достигнем цели?",
      productCount ? `${productCount} продуктов; ${campaignCount} кампаний с привязкой к продуктам.` : "Продуктовый портфель не задан.",
      [productCount, !incompleteJourney && productCount, campaignCount], [productSource, journeySource, campaignSource],
      { notice: incompleteJourney ? `Маршрут 5A продукта «${incompleteJourney.productName}» не завершён.` : productCount && !campaignCount ? "Каналы не подтверждены кампаниями; отсутствие необязательного канала не является ошибкой." : "" }),
    g8AuditQuestionV1("Хватит ли ресурсов и оправданы ли вложения?",
      `Лимит компании: ${goal.budgetRecord.valid ? g8Money(goal.budget) : "не указан"}; планы продуктов: ${g8Money(a.plannedProductBudgets)}.`,
      [goal.budgetRecord.valid, a.contributions.some((row) => row.budget.valid)],
      [budgetSource, campaignSource, forecastSource],
      { problem: budgetOverrun ? `Планы продуктов превышают лимит компании на ${g8Money(a.plannedProductBudgets - goal.budget)}.` : "",
        notice: unassignedSpend ? `Неразнесённые расходы Gate 5: ${g8Money(a.commonExpenses.unassignedSpend)}; они не включены повторно.` : "" }),
    g8AuditQuestionV1("Какого результата ожидать и насколько надёжен прогноз?",
      Number.isFinite(a.selected.value)
        ? `${g8FinalMetricPhraseV3(a.metric, a.selected.value)}; покрытие ${a.selected.included.length} из ${productCount} продуктов. ${a.probability.available ? `Вероятность ${g8Percent(a.probability.percent)}.` : "Вероятность не рассчитана."}`
        : "Прогноз компании пока не рассчитан.",
      [Number.isFinite(a.selected.value), a.selected.complete, !noFact], [forecastSource, factsSource],
      { problem: periodInvalid ? "Начало периода прогноза позже окончания." : "",
        attention: !a.selected.complete || noFact || !a.probability.available,
        notice: !a.selected.complete ? "Не все продукты имеют сопоставимый расчёт; общий итог частичный." : noFact ? "Нет фактических периодов для проверки устойчивости прогноза." : !a.probability.available ? a.probability.reason : "" }),
    g8AuditQuestionV1("Что может помешать и когда необходимо корректировать план?",
      `${a.risks.length ? a.risks[0] : "Расчётных ограничений пока не выявлено."} Gate 2: ${execution.ready} из ${execution.total} проверок готово; Gate 7: ${execution.pending.length} незавершённых задач.`,
      [productCount, execution.total && execution.ready === execution.total],
      [execution.gate2Source, execution.gate7Source, forecastSource],
      { actionSource: execution.blocker ? execution.gate2Source : execution.pending.length ? execution.gate7Source : forecastSource,
        attention: a.risks.length > 0 || execution.pending.length > 0,
        notice: a.risks[0] || (execution.blocker ? "Техническая готовность Gate 2 не подтверждена полностью." : "") }),
  ];
}

function g8AuditProductQuestionsV1(a) {
  const product = a.context.product;
  if (!product) return Array.from({ length: 7 }, (_, index) => g8AuditQuestionV1([
    "Какой результат должен дать продукт и к какому сроку?", "Кто наш покупатель?", "Какую задачу клиента решаем и какую выгоду даём?",
    "Почему клиент выберет нас, а не альтернативу?", "Как мы доведём клиента до покупки?", "Сколько вложим и какой результат получим?",
    "Что может помешать и как мы отреагируем?",
  ][index], "Продукт не выбран.", [false], [g8AuditSourceV1("gate-0", "Gate 0 · Каталог продуктов", { kind: "gate0-catalog" })]));
  const goal = a.goal;
  const projectedGoals = g8ProductDataV3(product).projected.goals || [];
  const otherGoals = projectedGoals.filter((row) => {
    const metric = guruV185Text(row.metric || row.goalMetric || row.resultMetric);
    const target = guruV185Text(row.targetValue ?? row.goalTargetValue ?? row.target);
    return metric && target && (metric !== goal.metric || Number(target) !== goal.target || g8DateOnlyV3(row.deadline || row.goalDeadline) !== goal.deadline);
  });
  const goalSource = g8AuditSourceV1("gate-5", "Gate 5 · Цель выбранного продукта",
    { kind: "gate5-goal-v1", block: "input", productId: product.id,
      recordId: projectedGoals.find((row) => row.id)?.id || "" });
  const segment = g8AuditScopedV1("segments", product, "Сегмент");
  const jtbd = g8AuditScopedV1("jtbd", product, "JTBD");
  const usp = g8AuditScopedV1("usp", product, "УТП");
  const positioning = g8AuditScopedV1("positioning", product, "Позиционирование");
  const offer = g8AuditScopedV1("offers", product, "Оффер");
  const snapshot = g3ProductJourneySnapshot(product);
  const stages = g3ProductJourneyStages(snapshot);
  const journeyReady = g3ProductJourneyOverallStatus(stages) === "ready";
  const landingSource = g8AuditSourceV1("gate-1", "Gate 1 · Посадочная продукта", g3ProductJourneyLandingTarget(snapshot));
  const routeSource = g8AuditSourceV1("gate-3", "Gate 3 · Маршрут 5A", { kind: "gate3-journey", productId: product.id });
  const campaignSource = g8AuditSourceV1("gate-4", "Gate 4 · Кампания и CTA", g3ProductJourneyChannelTarget(snapshot));
  const budgetSource = g8AuditSourceV1("gate-4", "Gate 4 · Бюджет продукта", g8SourceTargetV3({ key: "budget" }, a));
  const economicsSource = g8AuditSourceV1("gate-1", "Gate 1 · Юнит-экономика", { kind: "gate1-unit", itemIndex: g8UnitItemIndexV3(product.id) });
  const factsSource = g8AuditSourceV1("gate-5", "Gate 5 · Факт продукта", a.observations[0]?.id
    ? { kind: "gate5-snapshot-v1", block: "input", productId: product.id,
        campaignId: a.context.campaignId, recordId: a.observations[0].id }
    : { kind: "gate5-import-v3", block: "input", productId: product.id, campaignId: a.context.campaignId });
  const forecastSource = g8AuditSourceV1("gate-8", "Gate 8 · Прогноз продукта", { kind: "gate8-audit-section", scope: "product", section: "expect" });
  const campaignCount = a.context.campaigns.length;
  const execution = g8AuditExecutionV1(product.id);
  const productComparison = state?.projectComparison?.productsById?.[product.id];
  const comparisonStatus = productComparison
    ? projectComparisonProductStatus(productComparison) : { status: "not_started", filled: 0 };
  const periodInvalid = a.period.start > a.period.end;
  const goalPeriodMismatch = goal.deadline && goal.deadline !== a.period.end;
  const budget = a.parameters.budget;
  const costLimit = goal.allowedCostRecord.valid && (a.metric === "leads" ? a.calculation.values.cpl : a.metric === "sales" ? a.calculation.values.cpa : NaN);
  const costOverrun = Number.isFinite(costLimit) && costLimit > goal.allowedCost;
  const partialFactPeriod = a.observations.some((row) =>
    row.periodStart <= a.period.end && row.periodEnd >= a.period.start &&
    (row.periodStart < a.period.start || row.periodEnd > a.period.end));
  const conversionMismatch = a.observations.some((row) => {
    const snapshot = (a.context.projected?.periodSnapshots || []).find((item) => item.id === row.id);
    const adConversions = g8OwnNumericV3(snapshot, ["conversions"]);
    const confirmedLeads = g8OwnNumericV3(row.link, ["leads", "confirmedLeads"]);
    return adConversions.valid && confirmedLeads.valid && adConversions.value !== confirmedLeads.value;
  });
  const sourceScope = (row) => row.scope === "product" ? "продукт" : row.scope === "category" ? "наследовано из категории" : "наследовано от компании";
  return [
    g8AuditQuestionV1("Какой результат должен дать продукт и к какому сроку?",
      goal.valid ? `${g8FinalMetricPhraseV3(goal.metric, goal.target)}${goal.deadline ? ` до ${g8DateLabel(goal.deadline)}` : " · срок не указан"}.` : "Отдельная измеримая цель продукта в Gate 5 не задана.",
      [goal.metric, goal.targetRecord.valid, goal.deadline], [goalSource],
      { problem: otherGoals.length ? "Для этого product_id сохранены несовпадающие цели или сроки Gate 5." : "",
        attention: goalPeriodMismatch, notice: goalPeriodMismatch ? "Срок цели продукта не совпадает с концом прогноза." : "" }),
    g8AuditQuestionV1("Кто наш покупатель?",
      segment.value ? `${segment.value} (${sourceScope(segment)}).` : "Сегмент выбранного продукта не определён.",
      [segment.value], [segment.source], { attention: !segment.confirmed }),
    g8AuditQuestionV1("Какую задачу клиента решаем и какую выгоду даём?",
      [jtbd.value && `Задача: ${jtbd.value} (${sourceScope(jtbd)}).`, usp.value && `Выгода из УТП: ${usp.value} (${sourceScope(usp)}).`].filter(Boolean).join(" ") || "JTBD и выгода из УТП не заданы.",
      [jtbd.value, usp.value], [jtbd.source, usp.source], { attention: !jtbd.confirmed || !usp.confirmed }),
    g8AuditQuestionV1("Почему клиент выберет нас, а не альтернативу?",
      [positioning.value && `Позиционирование: ${positioning.value}.`, usp.value && `УТП: ${usp.value}.`, offer.value && `Оффер: ${offer.value}.`, comparisonStatus.filled && "Есть сравнение с альтернативами Gate 1."].filter(Boolean).join(" ") || "Отличие и предложение продукта не сформулированы.",
      [positioning.value, usp.value, offer.value, comparisonStatus.filled], [positioning.source, usp.source, offer.source,
        g8AuditSourceV1("gate-1", "Gate 1 · Сравнение выбранного продукта", { kind: "gate1-project-comparison", productId: product.id })],
      { attention: !positioning.confirmed || !usp.confirmed || !offer.confirmed || comparisonStatus.status === "in_progress",
        notice: comparisonStatus.status === "not_started" ? "Нет сравнения выбранного продукта с альтернативами в Gate 1." : "" }),
    g8AuditQuestionV1("Как мы доведём клиента до покупки?",
      [snapshot.landing && `Посадочная: ${snapshot.landing}.`, campaignCount && `${campaignCount} кампаний; маршрут 5A: ${journeyReady ? "готов" : "не завершён"}.`, snapshot.cta && `CTA: ${snapshot.cta}.`, execution.total && `Gate 2: ${execution.ready} из ${execution.total} проверок готово.`].filter(Boolean).join(" ") || "Посадочная, маршрут и кампания не определены.",
      [snapshot.landing, journeyReady, campaignCount, snapshot.cta, execution.total && execution.ready === execution.total],
      [landingSource, execution.gate2Source, routeSource, campaignSource],
      { actionSource: !snapshot.landing ? landingSource : !journeyReady ? routeSource : !campaignCount || !snapshot.cta ? campaignSource : execution.gate2Source,
        notice: !snapshot.landing ? "Для проверки пути к покупке нужна посадочная выбранного продукта." : !journeyReady ? "Маршрут 5A выбранного продукта не завершён." : execution.blocker ? "Техническая готовность Gate 2 не подтверждена полностью." : "" }),
    g8AuditQuestionV1("Сколько вложим и какой результат получим?",
      `Бюджет продукта: ${budget.valid ? g8Money(budget.value) : "не указан"}; прогноз: ${Number.isFinite(a.value) ? g8FinalMetricPhraseV3(a.metric, a.value) : "не рассчитан"}.`,
      [budget.valid, Number.isFinite(a.value)], [economicsSource, budgetSource, factsSource, forecastSource],
      { actionSource: !budget.valid ? budgetSource : !Number.isFinite(a.value) ? forecastSource : costOverrun ? economicsSource : undefined,
        problem: costOverrun ? `Прогнозная стоимость результата ${g8Money(costLimit)} выше ограничения продукта ${g8Money(goal.allowedCost)}.` : periodInvalid ? "Начало периода прогноза позже окончания." : "",
        attention: a.basis.level !== "fact" || partialFactPeriod || conversionMismatch,
        notice: [!budget.valid && "Бюджет компании не заменяет бюджет этого продукта.",
          !Number.isFinite(a.value) && a.basis.reason,
          partialFactPeriod && "Часть фактических периодов пересекает прогноз лишь частично и не включена в сопоставимый факт.",
          conversionMismatch && "Рекламные конверсии не совпадают с подтверждёнными обращениями; проверьте определение цели."].filter(Boolean).join(" ") }),
    g8AuditQuestionV1("Что может помешать и как мы отреагируем?",
      `${a.mainConstraint && a.mainConstraint !== "Критическое ограничение не выявлено" ? a.mainConstraint : "Расчётных препятствий пока не выявлено."} Gate 7: ${execution.pending.length} незавершённых задач выбранного продукта.`,
      [Number.isFinite(a.value), execution.total && execution.ready === execution.total],
      [execution.gate2Source,
        g8AuditSourceV1("gate-6", "Gate 6 · Календарь", { kind: "gate6-calendar" }),
        execution.gate7Source, forecastSource],
      { actionSource: !Number.isFinite(a.value) ? forecastSource : execution.blocker ? execution.gate2Source : execution.gate7Source,
        attention: Boolean(a.missingData.length || execution.pending.length), notice: a.missingData[0] ? g8IssueCopyV3(a.missingData[0]) : execution.blocker ? "Техническая готовность Gate 2 не подтверждена полностью." : "" }),
  ];
}

function g8AuditQuestionsV1(scope, analysis) {
  return scope === "company" ? g8AuditCompanyQuestionsV1(analysis) : g8AuditProductQuestionsV1(analysis);
}

function g8AuditConclusionV1(scope, questions) {
  const issue = questions.find((row) => row.status === "problem") ||
    questions.find((row) => row.status === "not_started") ||
    questions.find((row) => row.status === "in_progress") ||
    questions.find((row) => row.status === "needs_attention");
  const ready = questions.every((row) => ["ready", "not_required"].includes(row.status));
  const readiness = ready ? "План согласован по проверенным данным" : "План пока не подтверждён полностью";
  const limitation = issue ? issue.notice || issue.answer : "Существенных ограничений не выявлено";
  const source = issue?.nextSource || issue?.sources?.[0];
  const action = source ? `Проверьте ${source.label}.` : "Сверяйте план с фактическим результатом.";
  return { scope, readiness, limitation, action, source };
}

function g8AuditSourceHtmlV1(source) {
  return `<span class="g8-audit-source"><span>${escapeHtml(source.label)}</span><button type="button" class="g8-link" data-g8-audit-source="${escapeAttr(JSON.stringify(source.target))}">Открыть источник →</button></span>`;
}

function g8AuditHtmlV1(scope, analysis) {
  const questions = g8AuditQuestionsV1(scope, analysis);
  const conclusion = g8AuditConclusionV1(scope, questions);
  const title = scope === "company" ? "Итоговая проверка компании" : "Итоговая проверка продукта";
  return `<section class="g8-final-questions g8-audit" data-g8-audit-scope="${scope}" aria-label="${title}">
    <header><h3>${title}</h3></header>
    <div class="g8-audit-conclusion"><div><small>Готовность плана</small><strong>${escapeHtml(conclusion.readiness)}</strong></div><div><small>Главное ограничение</small><span>${escapeHtml(conclusion.limitation)}</span></div><div><small>Следующее действие</small><span>${escapeHtml(conclusion.action)}</span></div></div>
    <ol class="g8-final-question-list">${questions.map((row, index) => {
      const detailsId = `g8-audit-${scope}-${index + 1}-sources`;
      const questionNumber = index + 1;
      return `<li data-g8-audit-question="${questionNumber}" data-g8-audit-status="${row.status}"><details class="g8-audit-item" data-g8-audit-detail="${scope}:${questionNumber}" data-ui-keeper-key="g8-audit-${scope}-${questionNumber}"><summary><span class="g8-final-question-number">0${questionNumber}</span><h4>${escapeHtml(row.title)}</h4><span class="g8-audit-status is-${row.status}">${G8_AUDIT_STATUS_V1[row.status]}</span><span class="g8-audit-chevron" aria-hidden="true">⌄</span></summary><div class="g8-audit-copy"><p>${escapeHtml(row.answer)}</p>${row.notice ? `<small class="g8-audit-notice">${escapeHtml(row.notice)}</small>` : ""}<div class="g8-audit-sources">${row.sources[0] ? g8AuditSourceHtmlV1(row.sources[0]) : ""}${row.sources.length > 1 ? `<button type="button" class="g8-link" data-g8-audit-expand="${detailsId}" aria-expanded="false" aria-controls="${detailsId}">Ещё основания ↓</button><div class="g8-audit-extra" id="${detailsId}" hidden>${row.sources.slice(1).map(g8AuditSourceHtmlV1).join("")}</div>` : ""}</div></div></details></li>`;
    }).join("")}</ol>
  </section>`;
}

document.addEventListener("click", (event) => {
  const expand = event.target?.closest?.("[data-g8-audit-expand]");
  if (expand) {
    const details = document.getElementById(expand.dataset.g8AuditExpand);
    if (details) {
      details.hidden = !details.hidden;
      expand.setAttribute("aria-expanded", String(!details.hidden));
      expand.textContent = details.hidden ? "Ещё основания ↓" : "Свернуть ↑";
    }
    return;
  }
  const button = event.target?.closest?.("[data-g8-audit-source]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  let target;
  try { target = JSON.parse(button.dataset.g8AuditSource); } catch { return; }
  if (!target?.gateId) return;
  if (target.gateId === "gate-8") {
    const section = document.querySelector(`[data-g8-audit-scope="${target.scope}"]`)?.closest("[data-gate-scope]")
      ?.querySelector(target.scope === "company" ? `[data-g8-company-section="${target.section}"]` : `[data-g8-v3-section="${target.section}"]`);
    if (section) { if (section.tagName === "DETAILS") section.open = true; section.scrollIntoView({ behavior: "smooth", block: "start" }); }
    return;
  }
  if (["gate0-scoped", "gate0-company-goal", "gate0-company-segmentation", "gate0-company-positioning",
    "gate0-company-offer", "gate0-project-field", "gate0-catalog", "gate1-page", "gate1-analysis", "gate1-unit",
    "gate1-target-audience", "gate1-keywords", "gate1-project-comparison", "gate2-card", "gate3-journey", "gate4-campaign"].includes(target.kind)) {
    g3ProductJourneyPrepareSource(target);
    guruInvalidateGateViewCache();
    guruNavigateToGate(target.gateId);
    g3ProductJourneyFocusSource(target);
  } else {
    g8NavigateToSourceV3(target);
  }
}, true);
