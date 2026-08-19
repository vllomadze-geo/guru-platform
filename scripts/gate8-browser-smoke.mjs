import { mkdir, writeFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9333";
const artifactDirectory = new URL("../artifacts/", import.meta.url);
const sensitivityScreenshot = new URL("gate8-block-13-sensitivity.png", artifactDirectory);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = pages.find((item) => item.type === "page");
if (!page) throw new Error("Headless Chrome page was not found");
if (page.url !== "about:blank") throw new Error("Safety stop: Gate 8 smoke test requires an isolated Chrome page opened at about:blank");

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

function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const response = await call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}

await call("Runtime.enable");
await call("Log.enable");
await call("Page.enable");
await call("Page.addScriptToEvaluateOnNewDocument", {
  source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes("/api/")
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmokeTest: true }), { status: 200, headers: { "Content-Type": "application/json" } }))
      : nativeFetch(input, init);
  }`,
});
await call("Page.navigate", { url: "http://127.0.0.1:3000/" });
await wait(1500);
await evaluate(`(() => {
  localStorage.clear();
  localStorage.setItem("guru-platform-access-v01", "unlocked");
  localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
    id: "smoke-project",
    name: "Smoke project",
    description: "",
    website: "",
    type: "Тест",
    icon: "S",
    lifecycleStatus: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }]));
  location.reload();
  return true;
})()`);
await wait(1500);
await evaluate(`(() => {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => String(input).includes("/api/")
    ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmokeTest: true }), { status: 200, headers: { "Content-Type": "application/json" } }))
    : nativeFetch(input, init);
  scheduleCloudSync = () => {};
  scheduleProjectsCloudSync = () => {};
  pushProjectsToSupabase = async () => {};
  return true;
})()`);
await evaluate('document.querySelector("[data-open-project]")?.click(); true');
await wait(1800);
await evaluate('document.querySelector("[data-gate-id=\\"gate-8\\"]")?.click(); true');
await wait(1800);
if (!(await evaluate('document.querySelectorAll(".g8-section").length === 20'))) {
  await evaluate('document.querySelector("[data-gate-id=\\"gate-8\\"]")?.click(); true');
  await wait(1800);
}

const gate8 = await evaluate(`({
  title: document.querySelector("#pageTitle")?.textContent,
  sections: document.querySelectorAll(".g8-section").length,
  headings: [...document.querySelectorAll(".g8-section-title")].map((node) => node.textContent.trim()),
  navigator: Boolean(document.querySelector(".g8-data-navigator")),
  navigatorRows: document.querySelectorAll(".g8-data-navigator-row").length,
  navigatorLabels: [...document.querySelectorAll(".g8-data-navigator-row > div > strong")].map((node) => node.textContent.trim()),
  completenessLabels: [...document.querySelectorAll("#g8-section-body-3 .g8-missing > span")].map((node) => node.textContent.trim()),
  migrationLogged: ["gate8-missing-data-navigator-v1", "gate8-missing-priority-hard-gates-v1", "gate8-monte-carlo-core-v2", "gate8-uncertainty-calibration-v1"].every((id) => state.gate8Forecast.migrationLog?.some((entry) => entry.id === id)),
  noGoalForecastNumber: Boolean(document.querySelector(".g8-forecast-main")),
  noGoalProbabilityNumber: Boolean(document.querySelector("#g8-section-body-7 .g8-big-result")),
  status: document.querySelector(".g8-header .status-pill")?.textContent.trim(),
  navigation: document.querySelector('[data-gate-id="gate-8"]')?.innerText,
  goalMessage: document.querySelector(".g8-section-body")?.innerText,
})`);

await evaluate('document.querySelector("[data-gate-id=\\"gate-0\\"]")?.click(); true');
await wait(1600);
const gate0 = await evaluate(`({
  goalCard: document.body.innerText.includes("Цель проекта и ограничения"),
  goalInputs: document.querySelectorAll("[data-g8-project-goal]").length,
  navigation: document.querySelector('[data-gate-id="gate-0"]')?.innerText,
})`);

await evaluate(`(() => {
  const values = {
    goalDescription: "Получить 50 заявок в месяц",
    goalMetric: "leads",
    goalTargetValue: "50",
    goalDeadline: "2026-12-31",
    goalBudget: "100000",
    goalAllowedCost: "2000",
  };
  Object.entries(values).forEach(([key, value]) => {
    const field = document.querySelector('[data-g8-project-goal="' + key + '"]');
    field.value = value;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
  state.gate4 = state.gate4 || {};
  state.gate4.launchParams = state.gate4.launchParams || {};
  state.gate4.launchParams.testBudget = "100000";
  state.gate4.launchParams.targetCpl = "2000";
  saveState();
  return true;
})()`);
await wait(900);
await evaluate('document.querySelector("[data-gate-id=\\"gate-8\\"]")?.click(); true');
await wait(1500);
const calculated = await evaluate(`({
  status: document.querySelector(".g8-header .status-pill")?.textContent.trim(),
  forecast: document.querySelector(".g8-forecast-main strong")?.textContent.trim(),
  history: state.gate8Forecast.history.length,
  goalValid: g8Analysis().goal.valid,
  leads: g8Analysis().baseModel?.leads,
  coreAvailable: g8Analysis().forecastCore.available,
  runs: g8Analysis().forecastCore.runs,
  benchmarkUsed: g8Analysis().forecastCore.benchmarkUsed,
  probability: g8Analysis().probability.percent,
  ctrUncertainty: g8Analysis().forecastCore.distributions.ctr?.uncertainty,
  sensitivity: g8Analysis().sensitivity.length,
  scenarios: ["stress", "negative", "base", "positive"].map((key) => g8Analysis().scenarios[key].model?.leads),
})`);

await evaluate(`(() => {
  state.gate5 = state.gate5 || {};
  state.gate5.periodSnapshots = [
    { id: "mc-period-1", campaignId: "mc", reportType: "search", periodStart: "2026-06-01", periodEnd: "2026-06-30", spend: 100000, impressions: 100000, clicks: 2000, leads: 40, createdAt: "2026-06-30T12:00:00.000Z" },
    { id: "mc-period-2", campaignId: "mc", reportType: "search", periodStart: "2026-07-01", periodEnd: "2026-07-31", spend: 100000, impressions: 110000, clicks: 2200, leads: 44, createdAt: "2026-07-31T12:00:00.000Z" },
  ];
  saveState();
  renderGate();
  return true;
})()`);
await wait(900);
const factual = await evaluate(`({
  periods: g8Analysis().observations.length,
  ctrSourceType: g8Analysis().forecastCore.distributions.ctr?.sourceType,
  ctrCount: g8Analysis().forecastCore.distributions.ctr?.count,
  ctrUncertainty: g8Analysis().forecastCore.distributions.ctr?.uncertainty,
  uncertaintyCalibration: [2, 3, 4, 5, 8].map((count) => g8FactDistribution("ctr", "CTR", Array(count).fill(2), "Проверка").uncertainty),
  runs: g8Analysis().forecastCore.runs,
})`);

await evaluate(`(() => {
  const button = document.querySelector('[data-g8-toggle-section="13"]');
  if (button?.getAttribute("aria-expanded") === "false") button.click();
  document.querySelector('#g8-section-body-13')?.scrollIntoView({ block: "start" });
  return true;
})()`);
await wait(500);
const sensitivityBox = await evaluate(`(() => {
  const section = document.querySelector('[data-g8-toggle-section="13"]')?.closest('.g8-section');
  const rect = section?.getBoundingClientRect();
  return rect ? { x: rect.left + scrollX, y: rect.top + scrollY, width: rect.width, height: rect.height } : null;
})()`);
if (!sensitivityBox) throw new Error("Gate 8 block 13 was not found for screenshot");
const screenshot = await call("Page.captureScreenshot", {
  format: "png",
  fromSurface: true,
  captureBeyondViewport: true,
  clip: { ...sensitivityBox, scale: 1 },
});
await mkdir(artifactDirectory, { recursive: true });
await writeFile(sensitivityScreenshot, Buffer.from(screenshot.data, "base64"));

const collapsed = await evaluate(`(() => {
  const button = document.querySelector('[data-g8-toggle-section="3"]');
  button?.click();
  const currentButton = document.querySelector('[data-g8-toggle-section="3"]');
  return {
    expanded: currentButton?.getAttribute("aria-expanded"),
    bodyHidden: document.querySelector("#g8-section-body-3")?.hidden,
    persisted: state.gate8Forecast.openSections?.["3"],
  };
})()`);
await evaluate('document.querySelector(\'[data-g8-toggle-section="3"]\')?.click(); true');

await evaluate(`(() => {
  const field = document.querySelector('[data-g8-manual="budget"]');
  field.value = "120000";
  field.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
})()`);
await wait(700);
const custom = await evaluate(`({
  result: document.querySelectorAll(".g8-scenario-result strong")[4]?.textContent.trim(),
  leads: g8Analysis().scenarios.custom.model?.leads,
})`);
await evaluate('document.querySelector("[data-g8-save-scenario]")?.click(); true');
await wait(700);
await evaluate('document.querySelector("[data-g8-apply]")?.click(); true');
await wait(700);
const applied = await evaluate(`({
  budget: state.gate4.launchParams.testBudget,
  history: state.gate8Forecast.history.length,
})`);
await evaluate('document.querySelector("[data-g8-create-task]")?.click(); true');
await wait(700);
await evaluate('document.querySelector("[data-g8-add-calendar]")?.click(); true');
await wait(700);
const linked = await evaluate(`({
  tasks: state.gate7Journal.tasks.filter((item) => item.forecastLink?.gate === "gate-8").length,
  calendar: state.gate6Calendar.forecastActions?.length || 0,
  workspaceHasGate8: Boolean(JSON.parse(localStorage.getItem("guru-platform-workspace-v02-smoke-project") || "{}").gate8Forecast),
})`);
await evaluate('location.reload(); true');
await wait(1600);
await evaluate('document.querySelector("[data-open-project]")?.click(); true');
await wait(1500);
await evaluate('document.querySelector("[data-gate-id=\\"gate-8\\"]")?.click(); true');
await wait(1500);
const restored = await evaluate(`({
  manualBudget: state.gate8Forecast.manual.budget,
  history: state.gate8Forecast.history.length,
  tasks: state.gate7Journal.tasks.filter((item) => item.forecastLink?.gate === "gate-8").length,
  calendar: state.gate6Calendar.forecastActions?.length || 0,
})`);

const errors = events
  .filter((event) => event.method === "Runtime.exceptionThrown" || (event.method === "Log.entryAdded" && event.params.entry.level === "error"))
  .map((event) => event.params.exceptionDetails?.text || event.params.entry?.text || "Browser error");

const result = { gate8, gate0, calculated, factual, screenshot: decodeURIComponent(sensitivityScreenshot.pathname), collapsed, custom, applied, linked, restored, errors };
console.log(JSON.stringify(result, null, 2));
socket.close();

if (gate8.sections !== 20) throw new Error(`Expected 20 Gate 8 sections, received ${gate8.sections}`);
if (!gate8.navigator || gate8.navigatorRows > 3 || !gate8.migrationLogged) throw new Error("Gate 8 missing-data navigator or its migration log is missing");
if (gate8.noGoalForecastNumber || gate8.noGoalProbabilityNumber) throw new Error("Gate 8 rendered forecast numbers without a complete goal");
if (gate8.navigatorLabels[0] !== "Результат цели") throw new Error(`Hard gate must be first, received: ${gate8.navigatorLabels[0]}`);
if (gate8.navigatorLabels.some((label, index) => label !== gate8.completenessLabels[index])) throw new Error("Navigator and completeness block do not read the same prioritized missing-data source");
if (gate0.goalInputs !== 6) throw new Error(`Expected 6 Gate 0 goal fields, received ${gate0.goalInputs}`);
if (!calculated.goalValid || !calculated.coreAvailable || calculated.runs < 1000 || !calculated.benchmarkUsed || !Number.isFinite(calculated.probability)) throw new Error("Benchmark Monte Carlo forecast was not calculated for a complete goal without facts");
if (!(calculated.scenarios[0] < calculated.scenarios[1] && calculated.scenarios[1] < calculated.scenarios[2] && calculated.scenarios[2] < calculated.scenarios[3])) throw new Error(`Scenario percentiles are inconsistent: ${calculated.scenarios.join(", ")}`);
if (!calculated.sensitivity) throw new Error("Automatic +10% sensitivity ranking is empty");
if (factual.periods < 2 || factual.ctrSourceType !== "fact" || factual.ctrCount < 2 || factual.runs < 1000 || Math.abs(factual.ctrUncertainty - 0.2) > 0.0001 || !(factual.ctrUncertainty < calculated.ctrUncertainty)) throw new Error("Two fact periods did not retain the calibrated 20% uncertainty floor");
if (!(factual.uncertaintyCalibration[0] > factual.uncertaintyCalibration[1] && factual.uncertaintyCalibration[1] > factual.uncertaintyCalibration[2] && factual.uncertaintyCalibration[2] > factual.uncertaintyCalibration[3] && factual.uncertaintyCalibration[3] > factual.uncertaintyCalibration[4])) throw new Error(`Uncertainty does not decrease by 1/sqrt(n): ${factual.uncertaintyCalibration.join(", ")}`);
if (collapsed.expanded !== "false" || !collapsed.bodyHidden || collapsed.persisted !== false) throw new Error("Gate 8 section did not collapse and persist its state");
if (!Number.isFinite(custom.leads)) throw new Error("Manual scenario stopped calculating after Monte Carlo migration");
if (applied.budget !== "120000" || applied.history < 2) throw new Error("Custom scenario was not saved and applied");
if (!linked.tasks || !linked.calendar || !linked.workspaceHasGate8) throw new Error("Gate 7, Gate 6 or project-scoped storage link is missing");
if (restored.manualBudget !== "120000" || restored.history < 2 || !restored.tasks || !restored.calendar) throw new Error("Gate 8 data was not restored after reload");
if (errors.length) throw new Error(`Browser console contains ${errors.length} error(s)`);
