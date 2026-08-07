const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9333";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = pages.find((item) => item.type === "page");
if (!page) throw new Error("Gate 5 smoke test requires an available browser page");

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let sequence = 0;
const pending = new Map();
const events = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) {
    events.push(message);
    return;
  }
  const entry = pending.get(message.id);
  if (!entry) return;
  pending.delete(message.id);
  if (message.error) entry.reject(new Error(message.error.message));
  else entry.resolve(message.result);
});
const call = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  pending.set(id, { resolve, reject });
  socket.send(JSON.stringify({ id, method, params }));
});
async function evaluate(expression) {
  const response = await call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}

await call("Runtime.enable");
await call("Log.enable");
await call("Page.addScriptToEvaluateOnNewDocument", {
  source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes("/api/")
    ? Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } }))
    : nativeFetch(input, init);
  }`,
});
await call("Page.navigate", { url: "http://127.0.0.1:3000/" });
await wait(1400);
await evaluate('localStorage.clear(); localStorage.setItem("guru-platform-access-v01", "unlocked"); location.reload(); true');
await wait(1600);
await evaluate('document.querySelector("[data-open-project]")?.click(); true');
await wait(1600);

const navigation = await evaluate(`(async () => {
  const results = [];
  const transitionGates = [state.gates[0], state.gates[4], state.gates[8], state.gates[1], state.gates[4], state.gates[0]].filter(Boolean);
  for (const gate of transitionGates) {
    window.scrollTo(0, 10000);
    const main = document.querySelector("main");
    if (main) main.scrollTop = 10000;
    const startedAt = performance.now();
    guruNavigateToGate(gate.id);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    results.push({
      id: gate.id,
      title: document.getElementById("pageTitle")?.textContent?.trim() || "",
      active: activeGateId,
      hasContent: Boolean(document.getElementById("contentArea")?.children.length),
      scrollY: window.scrollY,
      mainScroll: main?.scrollTop || 0,
      renderMs: Math.round(performance.now() - startedAt),
      cache: document.getElementById("contentArea")?.dataset?.guruViewCache || "",
    });
  }
  return results;
})()`);

const result = await evaluate(`(() => {
  const g5 = ensureGate5State();
  const today = new Date().toISOString().slice(0, 10);
  g5.ui.filters = { campaignId: "", periodFrom: "2025-01-01", periodTo: "2025-01-31", type: "", platform: "" };
  g5.migrationLog = g5.migrationLog.filter((entry) => entry.id !== GATE5_SNAPSHOT_PERIOD_SELECTOR_MIGRATION);
  const periodSelectorMigration = g5MigrateSnapshotPeriodSelector(g5);
  const migratedLegacyRange = g5.ui.filters.periodRange;
  g5.campaignRegistry = [{ id: "internal-123456", cabinetId: "123456", name: "Тестовая кампания", platform: "Яндекс Директ", type: "Поиск" }];
  g5.periodSnapshots = [
    { id: "broken-today", campaignId: "internal-123456", reportType: "query", periodStart: today, periodEnd: today, source: "aggregate.xlsx", createdAt: today + "T08:00:00.000Z" },
    { id: "duplicate-old", campaignId: "internal-123456", reportType: "perf", periodStart: "2026-06-01", periodEnd: "2026-06-30", source: "old.xlsx", createdAt: "2026-07-01T08:00:00.000Z", impressions: 1000, clicks: 100 },
    { id: "duplicate-new", campaignId: "internal-123456", reportType: "perf", periodStart: "2026-06-01", periodEnd: "2026-06-30", source: "new.xlsx", createdAt: "2026-07-02T08:00:00.000Z", impressions: 1100, clicks: 110 },
    { id: "different-type", campaignId: "internal-123456", reportType: "query", periodStart: "2026-06-01", periodEnd: "2026-06-30", source: "query.xlsx", createdAt: "2026-07-02T09:00:00.000Z", impressions: 200, clicks: 80 },
  ];
  g5.reports.query = [{ date: today, campaignId: "123456", impressions: 359, clicks: 209, spend: 2142, conversions: 0 }];
  g5.migrationLog = g5.migrationLog.filter((entry) => entry.id !== GATE5_SNAPSHOT_INTEGRITY_MIGRATION);
  state.gate8Forecast = state.gate8Forecast || { history: [] };
  state.gate8Forecast.history = [
    { id: "polluted", sourceUpdatedAt: today + "T08:00:00.000Z" },
    { id: "clean", sourceUpdatedAt: "2026-07-01T08:00:00.000Z" },
  ];
  const migration = g5MigrateSnapshotIntegrity(g5);
  const normalizedReportDate = g5.reports.query[0].date;

  const parsed = g5ExtractRows([
    ["Дата", "ID кампании", "Показы", "Клики", "Расход", "Конверсии"],
    ["", "123456", "1000", "100", "500", "2"],
  ], "perf");
  const businessParsed = g5ParseBusinessReport("business.xlsx", [
    ["ID кампании", "Дата", "Лиды", "Заказы", "Выручка"],
    ["123456", "", "2", "1", "5000"],
  ], 0);
  const beforeNoPeriod = g5.periodSnapshots.length;
  const noPeriodResult = g5ImportYandexReport({
    type: "perf", typeLabel: "Перфоманс-кампании", fileName: "without-period.xlsx",
    records: [{ date: "", campaignId: "123456", campaignName: "Тестовая кампания", impressions: 1000, clicks: 100, spend: 500, conversions: 2 }],
    meta: { from: "", to: "" }, counts: { campaigns: 1, rows: 1 },
  });
  const afterNoPeriod = g5.periodSnapshots.length;

  const firstPayload = {
    type: "perf", typeLabel: "Перфоманс-кампании", fileName: "period-a.xlsx",
    records: [{ date: "2026-07-15", campaignId: "123456", campaignName: "Тестовая кампания", impressions: 1000, clicks: 100, spend: 500, conversions: 2 }],
    meta: { from: "2026-07-15", to: "2026-07-15" }, counts: { campaigns: 1, rows: 1 },
  };
  g5ImportYandexReport(firstPayload);
  const countAfterFirst = g5.periodSnapshots.length;
  const duplicatePayload = structuredClone(firstPayload);
  duplicatePayload.fileName = "same-period-different-name.xlsx";
  duplicatePayload.records[0].impressions = 2000;
  duplicatePayload.records[0].clicks = 120;
  const duplicatesBefore = g5DuplicateSnapshots(duplicatePayload).length;
  const duplicateHtml = (() => { g5YandexPendingImport = duplicatePayload; return renderGate5YandexImport(); })();
  const skipResult = g5ImportYandexReport(duplicatePayload, "skip");
  const countAfterSkip = g5.periodSnapshots.length;
  const updateResult = g5ImportYandexReport(duplicatePayload, "update");
  const updated = g5.periodSnapshots.find((snapshot) => snapshot.reportType === "perf" && snapshot.periodStart === "2026-07-15");

  g5.periodSnapshots = [
    { id: "canonical-perf", campaignId: "internal-123456", reportType: "perf", periodStart: "2026-08-01", periodEnd: "2026-08-05", createdAt: "2026-08-05T10:00:00.000Z", impressions: 1000, clicks: 100, spend: 500, leads: 2 },
    { id: "overlap-query", campaignId: "internal-123456", reportType: "query", periodStart: "2026-08-01", periodEnd: "2026-08-05", createdAt: "2026-08-05T11:00:00.000Z", impressions: 200, clicks: 80, spend: 300, leads: 1 },
  ];
  const canonical = g8LatestGate5Periods()[0];
  g5.campaignRegistry = [
    { id: "apple-search", cabinetId: "100001", name: "Коричное яблоко · Поиск", platform: "Яндекс Директ", type: "Поиск" },
    { id: "apple-rsya", cabinetId: "100002", name: "Коричное яблоко · РСЯ", platform: "Яндекс Директ", type: "РСЯ" },
  ];
  g5.periodSnapshots = [
    { id: "apple-perf", campaignId: "apple-search", reportType: "perf", periodStart: "2026-08-01", periodEnd: "2026-08-05", createdAt: "2026-08-05T10:00:00.000Z", impressions: 1000, clicks: 100, spend: 500, leads: 2, cpa: 250 },
    { id: "apple-placement", campaignId: "apple-search", reportType: "search_placement", periodStart: "2026-08-01", periodEnd: "2026-08-05", createdAt: "2026-08-05T11:00:00.000Z", impressions: 1000, clicks: 100, spend: 500, leads: 2, cpa: 250 },
    { id: "rsya-first", campaignId: "apple-rsya", reportType: "perf", periodStart: "2026-07-01", periodEnd: "2026-07-31", createdAt: "2026-07-31T10:00:00.000Z", impressions: 800, clicks: 80, spend: 200, leads: 1, cpa: 200 },
    { id: "rsya-last", campaignId: "apple-rsya", reportType: "perf", periodStart: "2026-08-01", periodEnd: "2026-08-31", createdAt: "2026-08-31T10:00:00.000Z", impressions: 1200, clicks: 120, spend: 300, leads: 3, cpa: 100 },
  ];
  g5.reports.query = [];
  g5.links = [];
  g5.ui.filters = { campaignId: "", periodRange: "", periodFrom: "", periodTo: "", type: "", platform: "" };
  const allPeriodsFilter = renderGate5Filters();
  g5.ui.filters.periodRange = "2026-07-01|2026-07-31";
  g5.ui.filters.periodFrom = "2026-07-01";
  g5.ui.filters.periodTo = "2026-07-31";
  const existingPeriodFilter = renderGate5Filters();
  const existingPeriodSnapshots = g5FilterSnapshots(g5.periodSnapshots).length;
  g5.ui.filters.periodRange = "2025-01-01|2025-01-31";
  g5.ui.filters.periodFrom = "2025-01-01";
  g5.ui.filters.periodTo = "2025-01-31";
  const missingPeriodFilter = renderGate5Filters();
  const missingPeriodSnapshots = g5FilterSnapshots(g5.periodSnapshots).length;
  g5.ui.filters = { campaignId: "", periodRange: "", periodFrom: "", periodTo: "", type: "", platform: "" };
  const allCampaignComparison = renderGate5Comparison();
  const allCampaignDecision = renderGate5FinalDecision();
  const applePeriods = g8LatestGate5Periods();
  g5.ui.filters.campaignId = "apple-rsya";
  const rsyaComparison = renderGate5Comparison();
  const rsyaDecision = renderGate5FinalDecision();
  return {
    migration: { removedCount: migration.removedCount, reasons: migration.removed.map((item) => item.reason), snapshotsLeft: migration ? 2 : -1, reportDate: normalizedReportDate, historyIds: state.gate8Forecast.history.map((item) => item.id), logged: g5.migrationLog.some((entry) => entry.id === GATE5_SNAPSHOT_INTEGRITY_MIGRATION) },
    parser: { date: parsed.records[0]?.date, from: parsed.meta.from, to: parsed.meta.to, businessDate: businessParsed.records[0]?.date },
    noPeriod: { before: beforeNoPeriod, after: afterNoPeriod, withoutSnapshot: noPeriodResult.withoutSnapshot },
    duplicate: { duplicatesBefore, prompt: duplicateHtml.includes("Уже импортировано, обновить?"), hasUpdate: duplicateHtml.includes('value="update"'), hasVersion: duplicateHtml.includes('value="version"'), skipped: skipResult.skipped, countAfterFirst, countAfterSkip, updated: !updateResult.skipped, source: updated?.source, impressions: updated?.impressions },
    canonical: { periods: 1, impressions: canonical?.impressions, clicks: canonical?.clicks, ctr: canonical?.ctr },
    campaignScope: {
      allCampaignsVisible: allCampaignComparison.includes("Коричное яблоко · Поиск") && allCampaignComparison.includes("Коричное яблоко · РСЯ") && allCampaignDecision.includes("Коричное яблоко · Поиск") && allCampaignDecision.includes("Коричное яблоко · РСЯ"),
      appleComparisonBlocked: allCampaignComparison.includes("Недостаточно данных для сравнения"),
      gate8Facts: applePeriods.length,
      searchFacts: applePeriods.filter((item) => item.campaignId === "apple-search").length,
      rsyaComparisonUsesTwoPeriods: rsyaComparison.includes("2026-07-01") && rsyaComparison.includes("2026-08-31"),
      rsyaDecisionOnly: rsyaDecision.includes("Коричное яблоко · РСЯ") && rsyaDecision.includes("300 ₽") && !rsyaDecision.includes("500 ₽"),
    },
    periodSelector: {
      migratedLegacyRange: migratedLegacyRange === "2025-01-01|2025-01-31" && periodSelectorMigration?.id === GATE5_SNAPSHOT_PERIOD_SELECTOR_MIGRATION,
      noCalendar: !allPeriodsFilter.includes('type="date"'),
      hasAllPeriods: allPeriodsFilter.includes("Все периоды"),
      hasRealPeriods: allPeriodsFilter.includes('value="2026-07-01|2026-07-31"') && allPeriodsFilter.includes('value="2026-08-01|2026-08-31"'),
      existingPeriodFiltersSnapshots: existingPeriodSnapshots === 1 && existingPeriodFilter.includes("2026-07-01 — 2026-07-31"),
      missingPeriodWarns: missingPeriodSnapshots === 0 && missingPeriodFilter.includes("Такого периода нет в загруженных данных") && missingPeriodFilter.includes("2026-07-01 — 2026-07-31"),
    },
  };
})()`);

const errors = events
  .filter((event) => event.method === "Runtime.exceptionThrown" || (event.method === "Log.entryAdded" && event.params.entry.level === "error"))
  .map((event) => event.params.exceptionDetails?.text || event.params.entry?.text || "Browser error");
result.errors = errors;
result.navigation = navigation;
console.log(JSON.stringify(result, null, 2));
socket.close();

if (result.migration.removedCount !== 2 || result.migration.snapshotsLeft !== 2 || result.migration.reportDate !== "" || !result.migration.logged || result.migration.historyIds.includes("polluted")) throw new Error("Snapshot integrity migration did not remove today's snapshot and exact duplicate");
if (result.parser.date !== "" || result.parser.from !== "" || result.parser.to !== "" || result.parser.businessDate !== "") throw new Error("Parser still fabricates today's date for an undated report");
if (!result.noPeriod.withoutSnapshot || result.noPeriod.before !== result.noPeriod.after) throw new Error("Undated report created a fact snapshot");
if (result.duplicate.duplicatesBefore !== 1 || !result.duplicate.prompt || !result.duplicate.hasUpdate || result.duplicate.hasVersion || !result.duplicate.skipped || result.duplicate.countAfterFirst !== result.duplicate.countAfterSkip || !result.duplicate.updated || result.duplicate.source !== "same-period-different-name.xlsx" || result.duplicate.impressions !== 2000) throw new Error("Duplicate import guard or update path is incorrect");
if (result.canonical.periods !== 1 || result.canonical.impressions !== 1000 || result.canonical.clicks !== 100 || Math.abs(result.canonical.ctr - 10) > 0.001) throw new Error("Gate 8 still sums overlapping report types for one campaign period");
if (!result.campaignScope.allCampaignsVisible || !result.campaignScope.appleComparisonBlocked || result.campaignScope.gate8Facts !== 3 || result.campaignScope.searchFacts !== 1 || !result.campaignScope.rsyaComparisonUsesTwoPeriods || !result.campaignScope.rsyaDecisionOnly) throw new Error("Campaign overview failed for Gate 5 comparison, Gate 8 facts, or final decision");
if (!result.periodSelector.migratedLegacyRange || !result.periodSelector.noCalendar || !result.periodSelector.hasAllPeriods || !result.periodSelector.hasRealPeriods || !result.periodSelector.existingPeriodFiltersSnapshots || !result.periodSelector.missingPeriodWarns) throw new Error("Snapshot period selector does not limit filtering to real periods or does not warn about a missing saved period");
if (result.navigation.length !== 6 || result.navigation.some((item) => item.id !== item.active || !item.hasContent || !item.title || item.scrollY !== 0 || item.mainScroll !== 0) || result.navigation.at(-2)?.cache !== "hit" || result.navigation.at(-1)?.cache !== "hit") throw new Error("Gate navigation left stale content, did not render the selected Gate, kept the previous Gate scroll position, or did not restore a cached Gate view");
if (errors.length) throw new Error(`Browser console contains ${errors.length} error(s)`);
