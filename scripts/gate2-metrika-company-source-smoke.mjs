import assert from "node:assert/strict";

const browserPort = process.env.GURU_CHROME_DEBUG_PORT || "9391";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "gate2-metrika-company-source-smoke";
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
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 20000);
      this.pending.set(id, { resolve: (value) => { clearTimeout(timeout); resolve(value); },
        reject: (error) => { clearTimeout(timeout); reject(error); } });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

let browser; let page; let browserContextId; let targetId;
const evaluate = async (expression) => {
  const response = await page.call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
};
const waitFor = async (expression) => {
  for (let i = 0; i < 150; i++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timeout: ${expression}`);
};

try {
  const version = await (await fetch(`http://127.0.0.1:${browserPort}/json/version`)).json();
  browser = new Cdp(version.webSocketDebuggerUrl);
  await browser.ready;
  ({ browserContextId } = await browser.call("Target.createBrowserContext"));
  ({ targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId }));
  const targets = await (await fetch(`http://127.0.0.1:${browserPort}/json`)).json();
  page = new Cdp(targets.find((item) => item.id === targetId).webSocketDebuggerUrl);
  await page.ready;
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof g2wStatus === "function" && Boolean(window.GURU_SEED)');

  const migrated = await evaluate(`(() => {
    localStorage.clear(); rememberAccessUnlocked(); setAccessState(true);
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    projects = [{ id: ${JSON.stringify(projectId)}, name: "Gate 2 migration smoke", lifecycleStatus: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    activeProjectId = ${JSON.stringify(projectId)};
    state = structuredClone(window.GURU_SEED);
    state.project.id = ${JSON.stringify(projectId)};
    state.project.name = "Gate 2 migration smoke";
    const gate = state.gates.find((item) => item.id === 'gate-2');
    ensureGate2Structure(gate);
    const card = (id) => gate.cards.find((item) => item.id === id);
    const counter = card('g2-metrika-company-counter').fields.metrikaCompanyV374;
    counter.counterId = '12345'; counter.counterCheck = 'found';
    counter.thankYouGoalState = 'works';
    const goals = card('g2-metrika-company-goals').fields.metrikaCompanyV374;
    goals.goals = [
      { entryId: 'company-goal-1', name: 'ID 573230679', type: 'page_visit', goalId: '573230679' },
      { entryId: 'company-goal-2', name: 'Звонок', type: 'js_event', goalId: '22222' },
    ];
    goals.singleGoalMigratedV382 = false; delete goals.primaryGoal;
    card('g2-metrika-product-counter').fields.metrikaGuideChecklistV368 = { retained: 'old checklist answer' };
    gate.cards.push({ id: 'g2-metrika-company-webvisor', title: 'Старый Вебвизор', status: 'ready', fields: { metrikaCompanyV374: { enabled: 'yes', comment: 'old company answer' } } });
    gate.cards.push({ id: 'g2-metrika-product-webvisor', title: 'Старый Вебвизор продукта', status: 'ready', fields: { metrikaProductV367: { perProduct: [{ product_id: 'product-a', webvisorEnabled: 'yes' }] } } });
    ensureGate2Structure(gate);
    ensureGate2Structure(gate);
    const migratedGoals = g2MetrikaCompanyDataV374('goals');
    const productRow = g2MetrikaProductRowV367(card('g2-metrika-product-webvisor'), 'product-a');
    els.launcher.hidden = true; els.appShell.hidden = false;
    activeView = 'gate'; activeGateId = 'gate-2'; renderGate();
    return {
      counterId: g2MetrikaCompanyCounterV374(),
      primaryGoal: { ...migratedGoals.primaryGoal },
      goalCount: g2MetrikaCompanyGoalsV374().length,
      oldGoalList: Array.isArray(migratedGoals.goals),
      oldGoalState: counter.thankYouGoalState,
      oldChecklist: card('g2-metrika-product-counter').fields.metrikaGuideChecklistV368.retained,
      companyWebvisor: gate.cards.filter((item) => item.id === 'g2-metrika-company-webvisor').length,
      productWebvisor: gate.cards.filter((item) => item.id === 'g2-metrika-product-webvisor').length,
      productAnswer: productRow?.webvisorEnabled,
      oldCardsVisible: document.querySelectorAll('[data-card="g2-metrika-company-webvisor"], [data-card="g2-metrika-product-webvisor"]').length,
      initialStatus: g2MetrikaCompanyStatusV374(card('g2-metrika-company-counter')),
    };
  })()`);
  assert.equal(migrated.counterId, "12345");
  assert.equal(migrated.primaryGoal.goalId, "573230679");
  assert.equal(migrated.primaryGoal.name, "THANK YOU PAGE");
  assert.equal(migrated.goalCount, 2);
  assert.equal(migrated.oldGoalList, true);
  assert.equal(migrated.oldGoalState, "works");
  assert.equal(migrated.oldChecklist, "old checklist answer");
  assert.equal(migrated.companyWebvisor, 1);
  assert.equal(migrated.productWebvisor, 1);
  assert.equal(migrated.productAnswer, "yes");
  assert.equal(migrated.oldCardsVisible, 2);
  assert.equal(migrated.initialStatus, "not_started");

  const verified = await evaluate(`(() => {
    const counterDef = G2W_CARDS.find((item) => item.id === 'counter');
    megaPlatformSetUrl('fixed', 'home', 'https://example.org/');
    const record = g2wRecord(counterDef, '', true);
    for (const step of counterDef.steps)
      record.steps[step[0]] = { step_id: step[0], scope: 'company', project_id: ${JSON.stringify(projectId)}, product_id: '', result: 'done', params: {}, verification_type: 'self_reported_action', checked_at: new Date().toISOString(), source_url: '' };
    g2wVerify(counterDef, '', 'passed', 'manual', 'Яндекс Метрика → Проверка счётчика');
    const ready = g2MetrikaCompanyStatusV374(g2MetrikaCompanyCardV374('counter'));
    g2wSetValue(counterDef, '', 'counterId', '67890');
    const stale = g2MetrikaCompanyStatusV374(g2MetrikaCompanyCardV374('counter'));
    const gate = state.gates.find((item) => item.id === 'gate-2');
    ensureGate2Structure(gate);
    const model = guruExportRuntimeModelV223('gate-2');
    return { ready, stale, check: g2MetrikaCompanyDataV374('counter').counterCheck,
      previousVerification: g2wRecord(counterDef).verification?.source_url,
      checklist: gate.cards.find((item) => item.id === 'g2-metrika-product-counter').fields.metrikaGuideChecklistV368.retained,
      exportModel: model.model, exportUnits: model.units.length };
  })()`);
  assert.equal(verified.ready, "ready");
  assert.equal(verified.stale, "in_progress");
  assert.equal(verified.check, "");
  assert.equal(verified.previousVerification, "Яндекс Метрика → Проверка счётчика");
  assert.equal(verified.checklist, "old checklist answer");
  assert.equal(verified.exportModel, "gate2_setup_wizard");
  assert.ok(verified.exportUnits >= 7);
  const propagation = await evaluate(`(() => {
    const mark = (def) => {
      const record = g2wRecord(def, '', true);
      for (const step of def.steps)
        record.steps[step[0]] = { step_id: step[0], scope: 'company', project_id: ${JSON.stringify(projectId)},
          product_id: '', result: 'done', params: {}, verification_type: 'self_reported_action',
          checked_at: new Date().toISOString(), source_url: '' };
      g2wVerify(def, '', 'passed', 'manual', 'Контрольный тест');
    };
    const def = (id) => G2W_CARDS.find((item) => item.id === id);
    g2wRecord(def('vk'), '', true).values.used = 'no';
    g2wRecord(def('webmaster'), '', true).values.used = 'no';
    for (const [key, value] of [['homeUrl', 'https://example.org/'], ['platform', 'tilda'],
      ['registrar', 'Регистратор'], ['hosting', 'Tilda'], ['dnsRecord', 'Запись провайдера']])
      g2wSetValue(def('domain'), '', key, value);
    mark(def('domain'));
    g2wSetValue(def('counter'), '', 'counterId', '12345');
    mark(def('counter'));
    mark(def('goal'));
    g2wSetValue(def('crm'), '', 'crmName', 'email');
    mark(def('crm'));
    g2wSetValue(def('safety'), '', 'privacyUrl', 'https://example.org/privacy');
    mark(def('safety'));
    const ready = g4ReadGate2Status();
    g2wSetValue(def('counter'), '', 'counterId', '67890');
    const stale = g4ReadGate2Status();
    return { ready, stale, optional: [g2wStatus(def('vk')), g2wStatus(def('webmaster'))] };
  })()`);
  assert.deepEqual(propagation.ready, { ready: true, total: 7, done: 7 });
  assert.equal(propagation.stale.ready, false);
  assert.deepEqual(propagation.optional, ["not_needed", "not_needed"]);
  console.log(JSON.stringify({ ok: true, migration: "preserved", verified: verified.ready,
    stale: verified.stale, archivedCards: migrated.oldCardsVisible, exportUnits: verified.exportUnits,
    gate4Propagation: propagation.ready.ready && !propagation.stale.ready }));
} finally {
  if (page) page.close();
  if (browser && browserContextId) {
    try { await browser.call("Target.disposeBrowserContext", { browserContextId }); } catch {}
  }
  if (browser) browser.close();
}
