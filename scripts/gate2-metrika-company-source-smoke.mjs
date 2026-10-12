import { writeFile } from "node:fs/promises";

const port = process.env.GURU_CHROME_DEBUG_PORT || "9391";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

async function evaluate(page, expression) {
  const response = await page.call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}

async function waitFor(page, expression) {
  for (let step = 0; step < 150; step += 1) {
    if (await evaluate(page, `Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out: ${expression}`);
}

async function captureSection(page, kind, file) {
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 5000, deviceScaleFactor: 1, mobile: false });
  const geometry = await evaluate(page, `(() => {
    const section = document.querySelector('[data-g2-metrika-quality-section-v360="${kind}"]');
    section.scrollIntoView({ block: "start" });
    const rect = section.getBoundingClientRect();
    return { visible: rect.top >= 0 && rect.bottom <= innerHeight, cards: section.querySelectorAll("[data-card]").length,
      clip: { x: rect.x + scrollX, y: rect.y + scrollY, width: rect.width, height: rect.height, scale: 1 } };
  })()`);
  assert(geometry.visible && geometry.cards === (kind === "company" ? 4 : 3), `${kind} section does not fit the screenshot`);
  await wait(150);
  const screenshot = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: geometry.clip });
  await writeFile(new URL(`../artifacts/${file}`, import.meta.url), Buffer.from(screenshot.data, "base64"));
  return geometry;
}

const browserVersion = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(browserVersion.webSocketDebuggerUrl);
await browser.ready;
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const target = targets.find((item) => item.id === targetId);
assert(target, "Isolated browser target missing");
const page = new Cdp(target.webSocketDebuggerUrl);
await page.ready;

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.call("Page.addScriptToEvaluateOnNewDocument", {
    source: `{
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes("/api/")
        ? Promise.resolve(new Response(JSON.stringify({ ok: true, smoke: true }), {
            status: 200, headers: { "Content-Type": "application/json" }
          })) : nativeFetch(input, init);
    }`,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(page, 'Boolean(window.GURU_SEED) && typeof g2MetrikaCompanyStatusV374 === "function"');
  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = "gate2-metrika-company-source-smoke";
    workspace.project.name = "Metrika company source smoke";
    const gate = workspace.gates.find((item) => item.id === "gate-2");
    gate.cards.push({ id: "g2-metrika-goals-traffic", title: "Контрольный визит действительно виден в Метрике",
      instruction: "", status: "not_started", evidence: "", pages: "", notes: "",
      fields: { metrikaQualityV360: { counterId: "12345" } } });
    gate.cards.push({ id: "g2-metrika-company-webvisor", title: "Вебвизор сайта",
      instruction: "", status: "ready", evidence: "", pages: "", notes: "",
      fields: { metrikaCompanyV374: { enabled: "yes", comment: "Ранее сохранённое значение" } } });
    for (const [id, title] of [
      ["g2-metrika-product-webvisor", "Вебвизор готов к диагностике страницы товара"],
      ["g2-metrika-product-internal-filter", "Внутренние визиты исключаются, внешние сохраняются"],
      ["g2-metrika-product-antibot", "Режим учёта роботов настроен безопасно"],
    ]) gate.cards.push({ id, title, instruction: "", status: "ready", evidence: "", pages: "", notes: "",
      fields: { metrikaProductV367: { perProduct: [] } } });
    const card = (id) => gate.cards.find((item) => item.id === id);
    card("g2-metrika-company-counter").fields.metrikaCompanyV374.counterCheck = "found";
    card("g2-metrika-company-counter").fields.metrikaCompanyV374.thankYouGoalState = "works";
    card("g2-metrika-product-counter").fields.metrikaProductV367.perProduct = [
      { product_id: "audit-product-a", counterId: "12345", visitAt: "2026-09-17T10:00", result: "yes", testedAt: "2026-09-17", evidenceUrl: "https://example.test/a/counter" },
    ];
    card("g2-metrika-goals-primary").fields.metrikaQualityV360.perProduct = [
      { product_id: "audit-product-a", mainAction: "Заявка", goalName: "ID 573230679", goalId: "573230679",
        triggerType: "thank_you_page", thankYouUrl: "https://example.test/a/thanks", testConversionAt: "2026-09-17T10:01",
        result: "yes", testedAt: "2026-09-17", evidenceUrl: "https://example.test/a/goal" },
    ];
    card("g2-metrika-product-goals").fields.metrikaProductV367.perProduct = [
      { product_id: "audit-product-a", result: "yes", testedAt: "2026-09-17", evidenceUrl: "https://example.test/a/goals",
        goals: [{ action: "Звонок", goalName: "Звонок", goalId: "goal-2", triggerType: "explicit_event",
          actionSteps: "Нажать кнопку звонка", testAt: "2026-09-17T10:02", result: "yes",
          testedAt: "2026-09-17", evidenceUrl: "https://example.test/a/call" }] },
    ];
    card("g2-metrika-product-webvisor").fields.metrikaProductV367.perProduct = [
      { product_id: "audit-product-a", webvisorEnabled: "yes", visitAt: "2026-09-17T10:03", result: "yes",
        testedAt: "2026-09-17", evidenceUrl: "https://example.test/a/webvisor" },
    ];
    card("g2-metrika-product-internal-filter").fields.metrikaProductV367.perProduct = [
      { product_id: "audit-product-a", filterMode: "По IP", internalVisitAt: "2026-09-17T10:04",
        externalVisitAt: "2026-09-17T10:05", result: "yes", testedAt: "2026-09-17", evidenceUrl: "https://example.test/a/filter" },
    ];
    card("g2-metrika-product-antibot").fields.metrikaProductV367.perProduct = [
      { product_id: "audit-product-a", robotMode: "Без роботов", strictFiltering: "no",
        externalVisitAt: "2026-09-17T10:06", result: "yes", testedAt: "2026-09-17", evidenceUrl: "https://example.test/a/robots" },
    ];
    workspace.ui ||= {};
    workspace.ui.gate2Accordion = { sections: {}, cards: {} };
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: workspace.project.id, name: workspace.project.name, lifecycleStatus: "active",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }]));
    localStorage.setItem("guru-platform-workspace-v02-" + workspace.project.id, JSON.stringify(workspace));
    location.reload();
  })()`);
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, 'Boolean(state) && typeof g2MetrikaProductStatusV367 === "function"');

  const initial = await evaluate(page, `(() => {
    const catalog = guruV189CatalogItems(state);
    const category = guruV189CreateCategory("Metrika company smoke", state);
    catalog.push({ id: "audit-product-a", name: "Коза", continuum: "product", categoryId: category.id });
    catalog.push({ id: "audit-product-b", name: "Товар B", continuum: "product", categoryId: category.id });
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = category.id;
    ui.selectedProductId = "audit-product-a";
    state.gates.find((gate) => gate.id === "gate-1").cards[0].pageRows = [
      { id: "audit-page-a", catalogItemIdV189: "audit-product-a", url: "https://example.test/a" },
    ];
    state.gates.find((gate) => gate.id === "gate-1").cards.find((card) => card.id === "card-31").pageRows = [
      { id: "audit-thank-you", url: "https://example.test/thanks" },
    ];
    guruNavigateToGate("gate-2");
    renderGate();
    const gate = state.gates.find((item) => item.id === "gate-2");
    const company = document.querySelector('[data-g2-metrika-quality-section-v360="company"]');
    const product = document.querySelector('[data-g2-metrika-quality-section-v360="product"]');
    const fields = (id) => [...document.querySelectorAll('[data-card="' + id + '"] [data-g2-mp-field]')].map((node) => node.dataset.g2MpField);
    const companyFields = (id) => [...document.querySelectorAll('[data-card="' + id + '"] [data-g2-mc-field]')].map((node) => node.dataset.g2McField);
    const primary = gate.cards.find((card) => card.id === "g2-metrika-goals-primary")?.fields?.metrikaQualityV360?.perProduct?.[0];
    const extra = gate.cards.find((card) => card.id === "g2-metrika-product-goals")?.fields?.metrikaProductV367?.perProduct?.[0]?.goals?.[0];
    const fresh = createFreshWorkspace({ id: "blank-goal-smoke", name: "Blank goal smoke" });
    const freshGoal = g2MetrikaCompanyDataV374("goals", fresh).primaryGoal;
    const legacy = structuredClone(window.GURU_SEED);
    const legacyGate = legacy.gates.find((item) => item.id === "gate-2");
    legacyGate.cards.find((card) => card.id === "g2-metrika-company-goals").fields.metrikaCompanyV374.goals = [
      { entryId: "company-goal-1", name: "ID 573230679", type: "page_visit", goalId: "573230679" },
    ];
    ensureGate2Structure(legacyGate);
    const blankMigrated = g2MetrikaCompanyDataV374("goals", legacy);
    return {
      freshGoalState: freshGoal?.state,
      freshGoalType: freshGoal?.type,
      blankMigration: { goal: { ...blankMigrated.primaryGoal }, status: g2MetrikaCompanyStatusV374(g2MetrikaCompanyCardV374("goals", legacy)),
        hasOldList: Object.hasOwn(blankMigrated, "goals") },
      companyIds: [...company.querySelectorAll(".g2-mc-card-v374")].map((node) => node.dataset.card),
      productIds: [...product.querySelectorAll(".g2-mp-card-v367")].map((node) => node.dataset.card),
      archivedProductCards: (gate.archivedMetrikaProductCardsV383 || []).map((card) => ({
        id: card.id, row: card.fields?.metrikaProductV367?.perProduct?.[0] })),
      productProgress: product.querySelector('.g1-section-progress')?.textContent,
      productCardText: [...product.querySelectorAll('.g2-mp-card-v367')].map((card) => card.textContent).join(" "),
      counter: g2MetrikaCompanyCounterV374(),
      goals: g2MetrikaCompanyGoalsV374().map((goal) => ({ id: goal.goalId, type: goal.type, name: goal.name, entryId: goal.entryId })),
      primaryGoal: { ...g2MetrikaCompanyDataV374("goals").primaryGoal },
      oldGoalListPresent: Object.hasOwn(g2MetrikaCompanyDataV374("goals"), "goals"),
      oldGoalStatePresent: Object.hasOwn(g2MetrikaCompanyDataV374("counter"), "thankYouGoalState"),
      archivedGoals: g2MetrikaCompanyDataV374("goals").archivedOtherGoalsV382?.length,
      refs: [primary.goalRefId, extra.goalRefId],
      companySettings: [g2MetrikaCompanyDataV374("counter").webvisorEnabled, g2MetrikaCompanyDataV374("filter").mode,
        g2MetrikaCompanyDataV374("robots").mode, g2MetrikaCompanyDataV374("robots").strictFiltering],
      oldWebvisorPresent: gate.cards.some((card) => card.id === "g2-metrika-company-webvisor"),
      oldWebvisorArchived: g2MetrikaCompanyDataV374("counter").legacyWebvisorCardV379?.fields?.metrikaCompanyV374?.comment,
      companyFields: G2_METRIKA_COMPANY_CARDS_V374.map((item) => companyFields(item.id)),
      settingsRows: [...company.querySelectorAll('[data-g2-mc-setting-row]')].map((node) => ({
        key: node.dataset.g2McSettingRow,
        title: node.querySelector('.g2-mc-setting-copy-v376 strong')?.textContent,
        explanation: node.querySelector('.g2-mc-setting-explanation-v376')?.textContent,
      })),
      ecommerceInstruction: (() => {
        const node = company.querySelector('[data-g2-mc-setting-row="ecommerce"]');
        return { headings: [...node.querySelectorAll('.g2-mc-instruction-heading-v377')].map((item) => item.textContent),
          steps: [...node.querySelectorAll('ol li')].map((item) => item.textContent.trim()),
          checks: [...node.querySelectorAll('ul li')].map((item) => item.textContent.trim()),
          code: [...node.querySelectorAll('code')].map((item) => item.textContent),
          text: node.querySelector('.g2-mc-setting-explanation-v376')?.textContent || "" };
      })(),
      thankYouInstruction: (() => {
        const node = company.querySelector('[data-g2-mc-setting-row="thank-you-goal"]');
        return { headings: [...node.querySelectorAll('.g2-mc-instruction-heading-v377')].map((item) => item.textContent),
          steps: [...node.querySelectorAll('ol li')].map((item) => item.textContent.trim()),
          checks: [...node.querySelectorAll('ul li')].map((item) => item.textContent.trim()),
          code: [...node.querySelectorAll('code')].map((item) => item.textContent),
          text: node.querySelector('.g2-mc-setting-explanation-v376')?.textContent || "" };
      })(),
      productFields: G2_METRIKA_PRODUCT_CARDS_V367.map((item) => fields(item.id)),
      fieldLabels: [...company.querySelectorAll('.g2-mc-card-v374 label > span'),
        ...product.querySelectorAll('.g2-mp-card-v367 label > span')].map((node) => node.textContent.trim()),
      context: product.querySelector("#g2-mp-context-v368")?.textContent,
      productStatuses: G2_METRIKA_PRODUCT_CARDS_V367.map((item) => g2MetrikaProductStatusV367(gate.cards.find((card) => card.id === item.id), "audit-product-a")),
      sharedCount: company.querySelectorAll('[data-g2-mc-field="counterId"]').length,
    };
  })()`);
  assert(initial.companyIds.length === 4 && JSON.stringify(initial.productIds) === JSON.stringify([
    "g2-metrika-product-counter", "g2-metrika-goals-primary", "g2-metrika-product-goals",
  ]) && initial.sharedCount === 1 &&
    !initial.oldWebvisorPresent && initial.oldWebvisorArchived === "Ранее сохранённое значение",
    `Company/product sections wrong: ${JSON.stringify(initial)}`);
  assert(initial.archivedProductCards.length === 3 &&
    initial.archivedProductCards[0].row.visitAt === "2026-09-17T10:03" &&
    initial.archivedProductCards[1].row.internalVisitAt === "2026-09-17T10:04" &&
    initial.archivedProductCards[2].row.externalVisitAt === "2026-09-17T10:06" &&
    !["Вебвизор", "Внутренние визиты", "роботов", "URL страницы «Спасибо»"].some((term) => initial.productCardText.includes(term)) &&
    initial.context.includes("https://example.test/thanks") && /из 3/.test(initial.productProgress),
    `Retired product cards or their fields remain visible: ${JSON.stringify(initial.archivedProductCards)}`);
  assert(initial.freshGoalState === "" && initial.freshGoalType === "page_visit",
    "A fresh project should default to the page visit type without a verification result");
  assert(initial.blankMigration.goal.entryId === "company-goal-1" &&
    initial.blankMigration.goal.name === "THANK YOU PAGE" && initial.blankMigration.goal.type === "page_visit" &&
    initial.blankMigration.goal.goalId === "573230679" && initial.blankMigration.goal.state === "" &&
    initial.blankMigration.status === "in_progress" && !initial.blankMigration.hasOldList,
    `A blank legacy goal was not migrated without a default status: ${JSON.stringify(initial.blankMigration)}`);
  assert(initial.counter === "12345" && initial.context.includes("12345") && initial.goals.length === 2 &&
    initial.goals[0].id === "573230679" && initial.goals[0].name === "THANK YOU PAGE" &&
    initial.goals[1].id === "goal-2" && initial.primaryGoal.type === "page_visit" &&
    initial.primaryGoal.state === "works" && !initial.oldGoalListPresent && !initial.oldGoalStatePresent &&
    initial.archivedGoals === 1 &&
    initial.refs[0] === initial.goals[0].entryId && initial.refs[1] === initial.goals[1].entryId,
    "Existing counter or goals were not migrated into company source");
  assert(JSON.stringify(initial.companySettings) === '["yes","ip","without_robots","no"]', "Company settings migration failed");
  assert(JSON.stringify(initial.companyFields.map((fields) => fields.length)) === "[9,4,1,2]",
    `Company field composition changed: ${JSON.stringify(initial.companyFields)}`);
  assert(JSON.stringify(initial.settingsRows.filter((row) => row.key !== "thank-you-goal").map((row) => row.title)) === JSON.stringify([
    "Автоматические цели", "Вебвизор сайта", "Электронная коммерция",
    "Контентная аналитика", "Тег менеджер", "Проверка счётчика",
  ]) && initial.settingsRows.at(-1)?.key === "thank-you-goal" &&
    initial.settingsRows.every((row) => row.explanation?.length > 40),
  `Counter settings or their explanations are missing: ${JSON.stringify(initial.settingsRows)}`);
  assert(initial.settingsRows.find((row) => row.key === "counter-check").explanation.includes("Настройки → указать адрес страницы → «Проверить»)") &&
    initial.settingsRows.find((row) => row.key === "counter-check").explanation.includes("Если код счётчика установлен корректно появится зелёное уведомление.") &&
    initial.settingsRows.find((row) => row.key === "counter-check").explanation.includes("редирект без передачи URL-параметров"),
    "Counter check guidance is missing");
  assert(JSON.stringify(initial.ecommerceInstruction.headings) === '["Настройка:","Проверка:","Сверка:"]' &&
    initial.ecommerceInstruction.steps.length === 4 && initial.ecommerceInstruction.checks.length === 4 &&
    JSON.stringify(initial.ecommerceInstruction.code) === '["dataLayer","?_ym_debug=1","detail","add","purchase"]' &&
    initial.ecommerceInstruction.text.includes("тестовый заказ должен появиться там с задержкой до нескольких минут") &&
    !initial.ecommerceInstruction.text.includes("Передача данных о заказах и товарах в Метрику"),
    `Ecommerce instruction was not replaced in full: ${JSON.stringify(initial.ecommerceInstruction)}`);
  assert(JSON.stringify(initial.thankYouInstruction.headings) === '["Настройка:","Проверка:","Сверка:"]' &&
    initial.thankYouInstruction.steps.length === 3 && initial.thankYouInstruction.checks.length === 3 &&
    JSON.stringify(initial.thankYouInstruction.code) === '["http://","https://"]' &&
    initial.thankYouInstruction.text.includes("прирост должен совпадать с числом тестовых отправок"),
    `Thank-you goal instruction is incomplete: ${JSON.stringify(initial.thankYouInstruction)}`);
  assert(JSON.stringify(initial.productFields.map((fields) => fields.length)) === "[1,3,4]",
    `Product field composition changed: ${JSON.stringify(initial.productFields)}`);
  const removed = new Set(["verificationStatus", "result", "testedAt", "evidenceUrl", "comment"]);
  const sharedDefinitions = new Set(["counterId", "goalId", "goalName", "triggerType", "filterMode", "robotMode", "strictFiltering", "strictReason"]);
  assert(initial.companyFields.every((fields) => !fields.some((field) => removed.has(field))) &&
    initial.productFields.every((fields) => !fields.some((field) => removed.has(field) || sharedDefinitions.has(field))) &&
    initial.productFields[1].includes("goalRefId") && initial.productFields[2].includes("goalRefId"),
    "Removed fields or company-owned definitions still appear in cards");
  assert(initial.fieldLabels.every((label) => !["Статус проверки", "Дата последней проверки", "Дата проверки",
    "Доказательство: ссылка или скрин", "Комментарий", "Результат проверки", "Результат"].includes(label)),
    "A removed field label is still visible");
  assert(initial.productStatuses.every((status) => status === "ready"), "Filled product checks should be ready without removed fields");

  const counterSettings = await evaluate(page, `(() => {
    const set = (row, field, value) => {
      const node = document.querySelector('[data-g2-mc-setting-row="' + row + '"] [data-g2-mc-field="' + field + '"]');
      if (node.type === "checkbox") node.checked = value;
      else node.value = value;
      node.dispatchEvent(new Event("change", { bubbles: true }));
    };
    set("automatic-goals", "automaticGoals", "yes");
    set("webvisor", "webvisorEnabled", "no");
    const gate = state.gates.find((item) => item.id === "gate-2");
    set("webvisor", "webvisorEnabled", "yes");
    set("ecommerce", "ecommerceEnabled", "no");
    set("ecommerce", "ecommerceContainer", "dataLayer");
    set("content-analytics", "contentAnalytics", "no");
    set("tag-manager", "tagManagerEnabled", "yes");
    set("tag-manager", "tagManagerCustomHtml", true);
    set("counter-check", "counterCheck", "not_found");
    const counterNotFound = g2MetrikaCompanyStatusV374(g2MetrikaCompanyCardV374("counter"));
    const productNotFound = g2MetrikaProductStatusV367(gate.cards.find((card) => card.id === "g2-metrika-product-counter"), "audit-product-a");
    set("counter-check", "counterCheck", "found");
    const counterFound = g2MetrikaCompanyStatusV374(g2MetrikaCompanyCardV374("counter"));
    const primary = gate.cards.find((card) => card.id === "g2-metrika-goals-primary");
    set("thank-you-goal", "state", "not_works");
    const goalNotWorking = g2MetrikaCompanyStatusV374(g2MetrikaCompanyCardV374("goals"));
    const primaryWhenBroken = g2MetrikaProductStatusV367(primary, "audit-product-a");
    set("thank-you-goal", "state", "works");
    const goalWorking = g2MetrikaCompanyStatusV374(g2MetrikaCompanyCardV374("goals"));
    const primaryWhenWorking = g2MetrikaProductStatusV367(primary, "audit-product-a");
    const data = g2MetrikaCompanyDataV374("counter");
    return { rows: document.querySelectorAll('[data-g2-mc-setting-row]').length,
      states: [data.automaticGoals, data.webvisorEnabled,
        data.ecommerceEnabled, data.contentAnalytics, data.tagManagerEnabled],
      container: data.ecommerceContainer, customHtml: data.tagManagerCustomHtml,
      counterNotFound, productNotFound, counterFound,
      goalNotWorking, goalWorking, primaryWhenBroken, primaryWhenWorking,
      counterCheckOptions: [...document.querySelector('[data-g2-mc-setting-row="counter-check"] select').options]
        .map((option) => option.textContent),
      thankYouOptions: [...document.querySelector('[data-g2-mc-setting-row="thank-you-goal"] select').options]
        .map((option) => option.textContent),
      standaloneCount: document.querySelectorAll('[data-card="g2-metrika-company-webvisor"]').length,
      checkbox: document.querySelector('[data-g2-mc-setting-row="tag-manager"] [type="checkbox"]')?.checked,
      ecommerceContainerVisible: Boolean(document.querySelector('[data-g2-mc-setting-row="ecommerce"] [data-g2-mc-field="ecommerceContainer"]')),
    };
  })()`);
  assert(counterSettings.rows === 7 && JSON.stringify(counterSettings.states) === '["yes","yes","no","no","yes"]' &&
    counterSettings.container === "dataLayer" && counterSettings.customHtml === true && counterSettings.checkbox &&
    counterSettings.counterNotFound === "problem" && counterSettings.productNotFound === "in_progress" &&
    counterSettings.counterFound === "ready" &&
    counterSettings.goalNotWorking === "problem" && counterSettings.goalWorking === "ready" &&
    counterSettings.primaryWhenBroken === "problem" && counterSettings.primaryWhenWorking === "ready" &&
    JSON.stringify(counterSettings.counterCheckOptions) === '["Не указано","Найден","Не найден"]' &&
    JSON.stringify(counterSettings.thankYouOptions) === '["Выберите состояние","Работает","Не работает"]' &&
    counterSettings.standaloneCount === 0 && counterSettings.ecommerceContainerVisible,
    `Webvisor duplicate remains or setting did not update product check: ${JSON.stringify(counterSettings)}`);

  const singleGoal = await evaluate(page, `(() => ({
    cards: document.querySelectorAll('[data-card="g2-metrika-company-goals"]').length,
    addButtons: document.querySelectorAll('[data-g2-mc-add-goal]').length,
    removeButtons: document.querySelectorAll('[data-g2-mc-remove-goal]').length,
    name: document.querySelector('[data-card="g2-metrika-company-goals"] [data-g2-mc-field="name"]').value,
    type: document.querySelector('[data-card="g2-metrika-company-goals"] [data-g2-mc-field="type"]').value,
    typeOptions: [...document.querySelector('[data-card="g2-metrika-company-goals"] [data-g2-mc-field="type"]').options]
      .map((option) => option.textContent),
    id: document.querySelector('[data-card="g2-metrika-company-goals"] [data-g2-mc-field="goalId"]').value,
    state: document.querySelector('[data-card="g2-metrika-company-goals"] [data-g2-mc-field="state"]').value,
  }))()`);
  assert(singleGoal.cards === 1 && singleGoal.addButtons === 0 && singleGoal.removeButtons === 0 &&
    singleGoal.name === "THANK YOU PAGE" && singleGoal.type === "page_visit" &&
    JSON.stringify(singleGoal.typeOptions) === '["Не выбран","Посещение страниц","JS-событие","Отправка формы","Составная","Мультицель"]' &&
    singleGoal.id === "573230679" && singleGoal.state === "works",
    `The goal was not merged into one card: ${JSON.stringify(singleGoal)}`);

  const ready = await evaluate(page, `(() => {
    const gate = state.gates.find((item) => item.id === "gate-2");
    G2_METRIKA_COMPANY_CARDS_V374.forEach((definition) => {
      const data = g2MetrikaCompanyDataV374(definition.kind);
      Object.assign(data, { verificationStatus: "in_progress", testedAt: "", evidenceUrl: "", comment: "Старое скрытое значение" });
    });
    G2_METRIKA_PRODUCT_CARDS_V367.forEach((definition) => {
      const card = gate.cards.find((item) => item.id === definition.id);
      const row = g2MetrikaProductRowV367(card, "audit-product-a");
      Object.assign(row, { result: "no", testedAt: "", evidenceUrl: "", comment: "Старое скрытое значение" });
      if (Array.isArray(row.goals)) row.goals.forEach((goal) =>
        Object.assign(goal, { result: "no", testedAt: "", evidenceUrl: "", comment: "Старое скрытое значение" }));
    });
    renderGate();
    return {
      company: G2_METRIKA_COMPANY_CARDS_V374.map((definition) => g2MetrikaCompanyStatusV374(gate.cards.find((card) => card.id === definition.id))),
      companyDiagnostics: G2_METRIKA_COMPANY_CARDS_V374.map((definition) =>
        guruExportGate2CardDiagnosticV223(gate.cards.find((card) => card.id === definition.id))
          .selectedSource?.sourceType),
      product: G2_METRIKA_PRODUCT_CARDS_V367.map((definition) => g2MetrikaProductStatusV367(gate.cards.find((card) => card.id === definition.id), "audit-product-a")),
      gate4: g4RsyaGoalQualityV363("audit-product-a", { metrikaGoal: "573230679", metrikaCounter: "12345" }),
    };
  })()`);
  assert(ready.company.every((status) => status === "ready") && ready.product.every((status) => status === "ready"),
    `Removed metadata still affects readiness: ${JSON.stringify(ready)}`);
  assert(ready.companyDiagnostics.every((source) => source === "gate2_metrika_company_register"),
    "Company diagnostics still point to the old Gate 2 fields");
  assert(ready.gate4.status === "ready" && ready.gate4.matched, "Gate 4 did not read company goal and counter");
  const isolation = await evaluate(page, `(() => {
    const gate = state.gates.find((item) => item.id === "gate-2");
    const select = (id) => {
      const node = document.querySelector('[data-gate0-scope-product-select="gate2-product"]');
      node.value = id;
      node.dispatchEvent(new Event("change", { bubbles: true }));
    };
    select("audit-product-b");
    const productB = G2_METRIKA_PRODUCT_CARDS_V367.map((definition) =>
      g2MetrikaProductStatusV367(gate.cards.find((card) => card.id === definition.id), "audit-product-b"));
    const sharedB = document.querySelector("#g2-mp-context-v368")?.textContent;
    const visibleB = {
      visitAt: document.querySelector('[data-card="g2-metrika-product-counter"] [data-g2-mp-field="visitAt"]')?.value,
      mainAction: document.querySelector('[data-card="g2-metrika-goals-primary"] [data-g2-mp-field="mainAction"]')?.value,
      extraRows: document.querySelectorAll('[data-card="g2-metrika-product-goals"] [data-g2-mp-goal-index]').length,
    };
    select("audit-product-a");
    const productA = G2_METRIKA_PRODUCT_CARDS_V367.map((definition) =>
      g2MetrikaProductStatusV367(gate.cards.find((card) => card.id === definition.id), "audit-product-a"));
    const visibleA = {
      visitAt: document.querySelector('[data-card="g2-metrika-product-counter"] [data-g2-mp-field="visitAt"]')?.value,
      mainAction: document.querySelector('[data-card="g2-metrika-goals-primary"] [data-g2-mp-field="mainAction"]')?.value,
      extraRows: document.querySelectorAll('[data-card="g2-metrika-product-goals"] [data-g2-mp-goal-index]').length,
    };
    return { productB, productA, sharedB, visibleB, visibleA,
      companyGoals: g2MetrikaCompanyGoalsV374().length,
      readinessCards: guruGateBlockStatuses(gate).length,
      expectedReadinessCards: gate.cards.filter((card) => !G2_METRIKA_PRODUCT_LEGACY_V367.has(card.id)).length };
  })()`);
  assert(isolation.productB.every((status) => status === "not_started") &&
    isolation.productA.every((status) => status === "ready") && isolation.sharedB.includes("12345") &&
    isolation.sharedB.includes("https://example.test/thanks") &&
    isolation.visibleB.visitAt === "" && isolation.visibleB.mainAction === "" && isolation.visibleB.extraRows === 0 &&
    isolation.visibleA.visitAt === "2026-09-17T10:00" && isolation.visibleA.mainAction === "Заявка" &&
    isolation.visibleA.extraRows === 1 &&
    isolation.companyGoals === 2 && isolation.readinessCards === isolation.expectedReadinessCards,
    `Product isolation or company readiness failed: ${JSON.stringify(isolation)}`);

  const labelPreview = await evaluate(page, `(() => {
    const goal = g2MetrikaCompanyDataV374("goals").primaryGoal;
    goal.name = "ID 573230679";
    goal.goalId = "ID ID 573230679";
    renderGate();
    const section = document.querySelector('[data-g2-metrika-quality-section-v360="product"]');
    const select = section.querySelector('[data-card="g2-metrika-goals-primary"] [data-g2-mp-field="goalRefId"]');
    const context = section.querySelector('#g2-mp-context-v368');
    return { label: select.selectedOptions[0].textContent,
      links: section.querySelectorAll('.g2-mp-company-goals-link-v374').length,
      extraLinks: section.querySelectorAll('[data-card="g2-metrika-product-goals"] .g2-mp-company-goals-link-v374').length,
      contextText: context.textContent,
      contextLineTops: [...context.querySelectorAll(':scope > span')].map((span) => Math.round(span.getBoundingClientRect().top)),
      contextHeight: Math.round(context.getBoundingClientRect().height),
      contextOverflow: context.scrollWidth - context.clientWidth,
      selectedProduct: guruV194SelectedProduct(state)?.name };
  })()`);
  assert(labelPreview.label === "573230679 · Посещение страниц · THANK YOU PAGE" &&
    labelPreview.links === 1 && labelPreview.extraLinks === 0 &&
    labelPreview.contextLineTops.every((top) => top === labelPreview.contextLineTops[0]) &&
    labelPreview.selectedProduct === "Коза", `Goal label, link count, or compact header wrong: ${JSON.stringify(labelPreview)}`);
  const productScreenshot = await captureSection(page, "product", "gate2-metrika-product-goat-compact-v384.png");
  await evaluate(page, `(() => { const goal = g2MetrikaCompanyDataV374("goals").primaryGoal;
    goal.name = "THANK YOU PAGE"; goal.goalId = "573230679"; renderGate(); return true; })()`);
  const companyScreenshot = await captureSection(page, "company", "gate2-metrika-company-goat-compact-v384.png");

  const changed = await evaluate(page, `(() => {
    const goal = g2MetrikaCompanyGoalsV374()[0];
    const node = document.querySelector('[data-g2-mc-goal="primary"][data-g2-mc-field="goalId"]');
    node.value = "573230679-new";
    node.dispatchEvent(new Event("change", { bubbles: true }));
    const gate = state.gates.find((item) => item.id === "gate-2");
    const primary = gate.cards.find((card) => card.id === "g2-metrika-goals-primary");
    const afterGoal = {
      source: g2MetrikaCompanyStatusV374(g2MetrikaCompanyCardV374("goals")),
      product: g2MetrikaProductStatusV367(primary, "audit-product-a"),
      oldGoal: g4RsyaGoalQualityV363("audit-product-a", { metrikaGoal: "573230679", metrikaCounter: "12345" }).status,
      newLabel: document.querySelector('[data-card="g2-metrika-goals-primary"] [data-g2-mp-field="goalRefId"]')?.selectedOptions?.[0]?.textContent,
      ref: g2MetrikaProductRowV367(primary, "audit-product-a").goalRefId,
      oldStoredId: g2MetrikaProductRowV367(primary, "audit-product-a").goalId,
    };
    renderGate();
    const counterInput = document.querySelector('[data-g2-mc-card="g2-metrika-company-counter"][data-g2-mc-field="counterId"]');
    counterInput.value = "98765";
    counterInput.dispatchEvent(new Event("change", { bubbles: true }));
    const afterCounter = {
      source: g2MetrikaCompanyStatusV374(g2MetrikaCompanyCardV374("counter")),
      product: g2MetrikaProductStatusV367(gate.cards.find((card) => card.id === "g2-metrika-product-counter"), "audit-product-a"),
      context: document.querySelector("#g2-mp-context-v368")?.textContent,
      oldCounter: g4RsyaGoalQualityV363("audit-product-a", { metrikaGoal: "573230679-new", metrikaCounter: "12345" }).status,
    };
    saveState();
    return { afterGoal, afterCounter };
  })()`);
  await wait(500);
  const stored = await evaluate(page, `(() => {
    const workspace = JSON.parse(localStorage.getItem("guru-platform-workspace-v02-" + activeProjectId));
    return { counter: g2MetrikaCompanyCounterV374(workspace),
      settings: (() => {
        const data = workspace.gates.find((item) => item.id === "gate-2").cards.find((card) => card.id === "g2-metrika-company-counter")
          .fields.metrikaCompanyV374;
        return [data.automaticGoals, data.webvisorEnabled, data.ecommerceEnabled, data.ecommerceContainer,
          data.contentAnalytics, data.tagManagerEnabled, data.tagManagerCustomHtml, data.counterCheck];
      })(),
      primaryGoal: (() => {
        const data = workspace.gates.find((item) => item.id === "gate-2").cards.find((card) => card.id === "g2-metrika-company-goals")
          .fields.metrikaCompanyV374;
        return { ...data.primaryGoal, hasOldList: Object.hasOwn(data, "goals"), archived: data.archivedOtherGoalsV382?.length };
      })(),
      legacyStatus: workspace.gates.find((item) => item.id === "gate-2").cards.find((card) => card.id === "g2-metrika-company-counter")
        .fields.metrikaCompanyV374.verificationStatus,
      legacyResult: workspace.gates.find((item) => item.id === "gate-2").cards.find((card) => card.id === "g2-metrika-product-counter")
        .fields.metrikaProductV367.perProduct[0].result,
      legacyCounter: workspace.gates.find((item) => item.id === "gate-2").cards.find((card) => card.id === "g2-metrika-product-counter")
        .fields.metrikaProductV367.perProduct[0].counterId,
      legacyThankYouUrl: workspace.gates.find((item) => item.id === "gate-2").cards.find((card) => card.id === "g2-metrika-goals-primary")
        .fields.metrikaQualityV360.perProduct[0].thankYouUrl,
      archivedProductIds: (workspace.gates.find((item) => item.id === "gate-2").archivedMetrikaProductCardsV383 || [])
        .map((card) => card.id) };
  })()`);
  assert(changed.afterGoal.source === "ready" && changed.afterGoal.product === "ready" &&
    changed.afterGoal.oldGoal === "in_progress" && changed.afterGoal.newLabel.includes("573230679-new") &&
    changed.afterGoal.ref === initial.refs[0] && changed.afterGoal.oldStoredId === "573230679", "Goal source change did not propagate");
  assert(changed.afterCounter.source === "ready" && changed.afterCounter.product === "ready" &&
    changed.afterCounter.context.includes("98765") && changed.afterCounter.oldCounter === "problem" &&
    stored.counter === "98765" && stored.legacyCounter === "12345" &&
    JSON.stringify(stored.settings) === '["yes","yes","no","dataLayer","no","yes",true,"found"]' &&
    stored.primaryGoal.goalId === "573230679-new" && stored.primaryGoal.name === "THANK YOU PAGE" &&
    stored.primaryGoal.type === "page_visit" && stored.primaryGoal.state === "works" &&
    stored.primaryGoal.entryId === initial.refs[0] && !stored.primaryGoal.hasOldList && stored.primaryGoal.archived === 1 &&
    stored.legacyStatus === "in_progress" && stored.legacyResult === "no" &&
    stored.legacyThankYouUrl === "https://example.test/a/thanks" && stored.archivedProductIds.length === 3,
    "Counter source change did not propagate or lost old data");
  const stableReferences = await evaluate(page, `(() => {
    const gate = state.gates.find((item) => item.id === "gate-2");
    const primary = gate.cards.find((card) => card.id === "g2-metrika-goals-primary");
    return { primaryRef: g2MetrikaProductRowV367(primary, "audit-product-a").goalRefId,
      companyRef: g2MetrikaCompanyDataV374("goals").primaryGoal.entryId,
      oldListPresent: Object.hasOwn(g2MetrikaCompanyDataV374("goals"), "goals") };
  })()`);
  assert(stableReferences.primaryRef === initial.refs[0] && stableReferences.companyRef === initial.refs[0] &&
    !stableReferences.oldListPresent, "The product reference changed or the old goal list returned");

  const incomplete = await evaluate(page, `(() => {
    const counter = g2MetrikaCompanyDataV374("counter");
    const previous = counter.counterId;
    const previousCheck = counter.counterCheck;
    counter.counterCheck = "";
    const unchecked = g2MetrikaCompanyStatusV374(g2MetrikaCompanyCardV374("counter"));
    counter.counterId = "";
    const source = g2MetrikaCompanyStatusV374(g2MetrikaCompanyCardV374("counter"));
    const gate = state.gates.find((item) => item.id === "gate-2");
    const product = g2MetrikaProductStatusV367(gate.cards.find((card) => card.id === "g2-metrika-product-counter"), "audit-product-a");
    counter.counterId = previous;
    counter.counterCheck = previousCheck;
    const extra = gate.cards.find((card) => card.id === "g2-metrika-product-goals");
    g2MetrikaProductRowV367(extra, "audit-product-b", true).notNeededReason = "Дополнительные цели не используются";
    return { source, unchecked, product, noExtra: g2MetrikaProductStatusV367(extra, "audit-product-b") };
  })()`);
  assert(incomplete.source === "not_started" && incomplete.unchecked === "in_progress" &&
    incomplete.product === "in_progress" && incomplete.noExtra === "not_needed",
    `Remaining fields do not drive status correctly: ${JSON.stringify(incomplete)}`);

  console.log(JSON.stringify({ ok: true, initial, counterSettings, singleGoal, ready, isolation, labelPreview, changed, stored, stableReferences, incomplete,
    screenshots: { company: companyScreenshot.cards, product: productScreenshot.cards } }, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
