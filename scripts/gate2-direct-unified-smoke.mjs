import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const fixture = JSON.parse(readFileSync(process.env.GURU_GATE2_FIXTURE || '/Users/vl/Downloads/gate-2.json', 'utf8'));
const source = readFileSync('gate2-direct-main-account-1.1.md', 'utf8');
const representativesSource = readFileSync('gate2-direct-representatives-1.2.md', 'utf8');
assert.equal(readFileSync('gate2-direct-main-account-copy.js', 'utf8'),
  `const G2DIRECT_MAIN_ACCOUNT_MARKDOWN = ${JSON.stringify(source)};\n`);
assert.equal(readFileSync('gate2-direct-representatives-copy.js', 'utf8'),
  `const G2DIRECT_REPRESENTATIVES_MARKDOWN = ${JSON.stringify(representativesSource)};\n`);
const browserPort = process.env.GURU_CHROME_DEBUG_PORT || '49337';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:41323/';
const folder = 'artifacts/gate2-direct-unified'; mkdirSync(folder, { recursive: true });
class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map(); this.errors = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') this.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      const task = this.pending.get(message.id); if (!task) return;
      this.pending.delete(message.id); clearTimeout(task.timer);
      if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
    });
  }
  async call(method, params = {}) { await this.ready; return new Promise((resolve, reject) => {
    const id = ++this.id, timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 90000);
    this.pending.set(id, { resolve, reject, timer }); this.socket.send(JSON.stringify({ id, method, params }));
  }); }
  close() { this.socket.close(); }
}
const version = await (await fetch(`http://127.0.0.1:${browserPort}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
let page, browserContextId;
try {
  ({ browserContextId } = await browser.call('Target.createBrowserContext'));
  const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
  const tabs = await (await fetch(`http://127.0.0.1:${browserPort}/json`)).json();
  page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
  const evaluate = async expression => { const result = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value; };
  await page.call('Runtime.enable'); await page.call('Page.enable');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.navigate', { url: appUrl });
  for (let i = 0; i < 300; i++) {
    if (await evaluate('document.readyState === "complete" && typeof g2directBlockHtml === "function"')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const initial = await evaluate(`(() => {
    localStorage.clear(); rememberAccessUnlocked(); setAccessState(true);
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    projects = [{ id: 'gate2-direct-isolated', name: 'Коричное яблоко', lifecycleStatus: 'active' }];
    activeProjectId = 'gate2-direct-isolated';
    state = createFreshWorkspace({ id: activeProjectId, name: 'Коричное яблоко' });
    state.project = { ...state.project, ...${JSON.stringify(fixture.content.project)}, id: activeProjectId };
    state.project.websiteUrl = 'https://k-apple.ru/';
    state.gates.find(gate => gate.id === 'gate-2').cards = ${JSON.stringify(fixture.gate.cards)};
    const record = g2directRecord(state, true);
    record.steps.account = { result: 'done', params: { value: 'Старое подтверждение доступа' } };
    record.steps.representatives = { result: 'done', params: { value: 'Старое подтверждение представителей' } };
    record.steps.payment = { result: 'done', params: { value: 'Старый способ оплаты' } };
    record.history.push({ stepId: 'payment', result: 'done', checkedAt: '2025-01-01' });
    (g2directData(state, true).fields ||= {}).accountLogin = 'saved-company-login';
    g2directData(state, true).fields.mainRepresentative = 'saved-representative';
    const old = JSON.stringify({ steps: record.steps, history: record.history, previous: record.directUnifiedV1 });
    const otherBefore = JSON.stringify(['company-webmaster', 'company-domain', 'company-yandex-business'].map(id =>
      G2_SERVICE_BLOCK_CONFIGS.get(id).steps.map(step => step.step_id)));
    const first = guruV194Products(state)[0];
    if (first) state.project.gate0ScopeUiV194 = { selectedCategoryId: megaPlatformProductCategoryIds(first)[0] || '__uncategorized__', selectedProductId: first.id };
    saveProjects(); els.launcher.hidden = true; els.appShell.hidden = false; activeView = 'gate'; activeGateId = 'gate-2'; renderGate();
    document.querySelector('[data-g2y-company]').open = true;
    const block = document.querySelector('[data-g2sb-id="company-yandex-direct"]'); block.open = true;
    const section = block.querySelector('[data-g2direct-section="1"]');
    const row = block.querySelector('[data-g2direct-step="s11"]');
    const guide = row.querySelector('.g2direct-main-account-copy');
    const representatives = block.querySelector('[data-g2direct-step="s12"]');
    const representativesGuide = representatives.querySelector('.g2direct-representatives-copy');
    const project = structuredClone(state); project.project.id = 'direct-other'; project.project.name = 'Другой проект';
    megaPlatformSetUrl('fixed', 'home', 'https://other.example/', project);
    const otherFields = g2directData(project, true).fields;
    otherFields.accountLogin = 'other-login'; otherFields.mainRepresentative = 'other-representative';
    const other = document.createElement('div'); other.innerHTML = g2directGuideHtml(project);
    const otherRepresentatives = document.createElement('div'); otherRepresentatives.innerHTML = g2directRepresentativesGuideHtml(project);
    return { block: !!block, title: block.querySelector('.g2sb-title')?.textContent,
      sections: block.querySelectorAll('[data-g2direct-section]').length,
      sectionTitle: section.querySelector('h4')?.textContent, sectionOpen: section.open,
      steps: block.querySelectorAll('[data-g2sb-step-id]').length,
      stepTitle: row.querySelector('.g2mu-step-heading h5')?.textContent,
      stepStatus: g2directStepStatus('s11'), productStatus: g2directStepStatus('account'),
      representativesTitle: representatives.querySelector('.g2mu-step-heading h5')?.textContent,
      representativesNumber: representatives.querySelector('.g2mu-number')?.textContent,
      representativesStatus: g2directStepStatus('s12'),
      representativesInputs: representatives.querySelectorAll('input, select, textarea').length,
      representativesGuideData: representativesGuide.textContent.includes('saved-company-login') &&
        representativesGuide.textContent.includes('saved-representative') &&
        representativesGuide.textContent.includes('Коричное яблоко'),
      representativesNoFixedResult: !representativesGuide.textContent.includes('По скриншоту от 11 ноября 2026 года') &&
        !representativesGuide.textContent.includes('k-apple-ru') && !representativesGuide.textContent.includes('G2DIRECT_'),
      otherRepresentatives: otherRepresentatives.textContent.includes('Другой проект') &&
        otherRepresentatives.textContent.includes('other-login') &&
        otherRepresentatives.textContent.includes('other-representative') &&
        !otherRepresentatives.textContent.includes('k-apple.ru') &&
        !otherRepresentatives.textContent.includes('k-apple-ru'),
      inputs: row.querySelectorAll('input, select, textarea').length,
      checks: row.querySelectorAll('[data-g2direct-account-check]').length,
      passedDisabled: row.querySelector('[data-g2direct-review="passed"]')?.disabled,
      guideSite: guide.textContent.includes('https://k-apple.ru/'),
      guideLogin: guide.textContent.includes('saved-company-login'),
      noFixedResult: !guide.textContent.includes('По скриншоту от 11 ноября 2026 года') &&
        !guide.textContent.includes('k-apple-ru') && !guide.textContent.includes('G2DIRECT_'),
      otherGuide: other.textContent.includes('Другой проект') && other.textContent.includes('https://other.example/') &&
        !other.textContent.includes('k-apple.ru') && !other.textContent.includes('k-apple-ru'),
      oldUnchanged: old === JSON.stringify({ steps: record.steps, history: record.history, previous: record.directUnifiedV1 }),
      otherUnchanged: otherBefore === JSON.stringify(['company-webmaster', 'company-domain', 'company-yandex-business'].map(id =>
        G2_SERVICE_BLOCK_CONFIGS.get(id).steps.map(step => step.step_id))),
      legacy: !!block.querySelector('.g2direct-legacy'),
      progress: block.querySelector('[data-g2sb-progress]')?.textContent,
      otherBlocks: ['company-webmaster', 'company-domain', 'company-yandex-business'].every(id => !!document.querySelector('[data-g2sb-id="' + id + '"]')),
      width: document.documentElement.scrollWidth, viewport: innerWidth };
  })()`);
  assert(initial.block && initial.otherBlocks && initial.otherUnchanged && initial.oldUnchanged && initial.legacy);
  assert.equal(initial.title, 'Яндекс Директ · кабинет · Компания');
  assert.equal(initial.sections, 1); assert.equal(initial.steps, 2);
  assert.equal(initial.sectionTitle, '1. Создание и настройка кабинета'); assert(initial.sectionOpen, JSON.stringify(initial));
  assert.equal(initial.stepTitle, 'Основной рекламный кабинет');
  assert.equal(initial.stepStatus, 'recheck'); assert.equal(initial.productStatus, 'recheck');
  assert.equal(initial.representativesTitle, 'Доступы и представители');
  assert.equal(initial.representativesNumber, '1.2'); assert.equal(initial.representativesStatus, 'recheck');
  assert.equal(initial.representativesInputs, 0);
  assert(initial.representativesGuideData && initial.representativesNoFixedResult && initial.otherRepresentatives);
  assert.equal(initial.inputs, 0); assert.equal(initial.checks, 0); assert.equal(initial.passedDisabled, false);
  assert(initial.guideSite && initial.guideLogin && initial.noFixedResult && initial.otherGuide);
  assert.equal(initial.progress, '0 из 2 шагов'); assert(initial.width <= initial.viewport + 1);
  const flow = await evaluate(`(() => {
    const block = document.querySelector('[data-g2sb-id="company-yandex-direct"]');
    const row = block.querySelector('[data-g2direct-step="s11"]');
    row.querySelector('[data-g2direct-review="pending"]').click();
    const pending = g2directStepStatus('s11') === 'needs_check';
    row.querySelector('[data-g2direct-review="failed"]').click();
    const problem = g2directStepStatus('s11') === 'problem';
    row.querySelector('[data-g2direct-review="passed"]').click();
    const ready = g2directStepStatus('s11') === 'ready' && g2directStepStatus('account') === 'ready';
    const sectionInProgress = g2directStatus() === 'in_progress' &&
      block.querySelector('[data-g2sb-progress]').textContent === '1 из 2 шагов';
    const representatives = block.querySelector('[data-g2direct-step="s12"]');
    representatives.querySelector('[data-g2direct-review="pending"]').click();
    const representativesPending = g2directStepStatus('s12') === 'needs_check' && g2directStepStatus('s11') === 'ready';
    representatives.querySelector('[data-g2direct-review="failed"]').click();
    const representativesProblem = g2directStepStatus('s12') === 'problem' && g2directStepStatus('s11') === 'ready';
    representatives.querySelector('[data-g2direct-review="passed"]').click();
    const representativesReady = g2directStepStatus('s12') === 'ready' &&
      g2directStatus() === 'ready' && block.querySelector('[data-g2sb-progress]').textContent === '2 из 2 шагов';
    const fields = g2directData(state, true).fields;
    fields.mainRepresentative = 'changed-representative';
    const representativesRecheck = g2directStepStatus('s12') === 'recheck' && g2directStepStatus('s11') === 'ready';
    fields.mainRepresentative = 'saved-representative';
    const representativesRestored = g2directStepStatus('s12') === 'ready';
    fields.accountLogin = 'changed-login';
    const recheck = g2directStepStatus('s11') === 'recheck';
    fields.accountLogin = 'saved-company-login';
    const restored = g2directStepStatus('s11') === 'ready';
    const project = structuredClone(state); project.project.id = 'direct-url-other';
    megaPlatformSetUrl('fixed', 'home', 'https://other.example/', project);
    const urlRecheck = g2directStepStatus('s11', project) === 'recheck';
    const section = block.querySelector('[data-g2direct-section="1"]'); section.querySelector(':scope > summary').click();
    return { pending, problem, ready, sectionInProgress, representativesPending,
      representativesProblem, representativesReady, representativesRecheck, representativesRestored,
      recheck, restored, urlRecheck, collapsed: !section.open,
      review: g2directReview('s11')?.result, representativesReview: g2directReview('s12')?.result,
      snapshotResult: JSON.parse(localStorage.getItem('guru-platform-direct-account-v2-' + activeProjectId)).result,
      representativesSnapshot: JSON.parse(localStorage.getItem('guru-platform-direct-representatives-v1-' + activeProjectId)).result,
      old: g2directRecord().steps.account.params.value };
  })()`);
  assert.deepEqual(flow, { pending: true, problem: true, ready: true, sectionInProgress: true,
    representativesPending: true, representativesProblem: true, representativesReady: true,
    representativesRecheck: true, representativesRestored: true, recheck: true, restored: true,
    urlRecheck: true, collapsed: true, review: 'passed', representativesReview: 'passed',
    snapshotResult: 'passed', representativesSnapshot: 'passed',
    old: 'Старое подтверждение доступа' });
  await page.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const mobile = await evaluate(`(() => {
    const block = document.querySelector('[data-g2sb-id="company-yandex-direct"]');
    block.querySelector('[data-g2direct-section="1"]').open = true;
    block.querySelector('[data-g2direct-step="s12"] .g2direct-guide').open = true;
    const r = block.getBoundingClientRect();
    return { viewport: innerWidth, width: document.documentElement.scrollWidth,
      clip: { x: Math.max(0, r.left + scrollX - 4), y: Math.max(0, r.top + scrollY - 4),
        width: Math.min(innerWidth, r.width + 8), height: Math.min(r.height + 8, 1100), scale: 1 } };
  })()`);
  assert(mobile.width <= mobile.viewport + 1, JSON.stringify(mobile));
  const image = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: mobile.clip });
  writeFileSync(`${folder}/main-account-mobile.png`, Buffer.from(image.data, 'base64'));
  const closed = await evaluate(`(() => { const section = document.querySelector('[data-g2direct-section="1"]'); section.open = false;
    return localStorage.getItem('guru-platform-direct-account-v2-' + activeProjectId) !== null &&
      localStorage.getItem('guru-platform-direct-representatives-v1-' + activeProjectId) !== null; })()`);
  assert(closed);
  const origin = await evaluate('performance.timeOrigin');
  await page.call('Page.reload', { ignoreCache: true });
  let loaded = false;
  for (let i = 0; i < 300; i++) {
    loaded = await evaluate(`performance.timeOrigin !== ${origin} && document.readyState === "complete" && typeof openProject === "function"`).catch(() => false);
    if (loaded) break; await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(loaded);
  const restored = await evaluate(`(async () => {
    rememberAccessUnlocked(); setAccessState(true); scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    await openProject('gate2-direct-isolated'); activeView = 'gate'; activeGateId = 'gate-2'; renderGate();
    const block = document.querySelector('[data-g2sb-id="company-yandex-direct"]');
    const section = block.querySelector('[data-g2direct-section="1"]');
    const result = { login: g2directFieldValue('accountLogin'), checks: g2directReview('s11')?.checks,
      representative: g2directFieldValue('mainRepresentative'),
      status: g2directStepStatus('s11'), representativesStatus: g2directStepStatus('s12'), open: section.open,
      oldAccount: g2directRecord().steps.account.params.value, oldPayment: g2directRecord().steps.payment.params.value,
      oldRepresentatives: g2directRecord().steps.representatives.params.value,
      history: g2directRecord().history.length, sections: block.querySelectorAll('[data-g2direct-section]').length,
      steps: block.querySelectorAll('[data-g2sb-step-id]').length };
    const other = createFreshWorkspace({ id: 'direct-isolated-other', name: 'Другой проект' });
    result.isolated = !g2directFieldValue('accountLogin', other) && !g2directReview('s11', other);
    return result;
  })()`);
  assert.equal(restored.login, 'saved-company-login');
  assert.equal(restored.representative, 'saved-representative');
  assert.deepEqual(restored.checks || {}, {});
  assert.equal(restored.status, 'ready'); assert.equal(restored.representativesStatus, 'ready'); assert.equal(restored.open, false);
  assert.equal(restored.oldAccount, 'Старое подтверждение доступа');
  assert.equal(restored.oldPayment, 'Старый способ оплаты');
  assert.equal(restored.oldRepresentatives, 'Старое подтверждение представителей');
  assert.equal(restored.history, 1); assert.equal(restored.sections, 1); assert.equal(restored.steps, 2); assert(restored.isolated);
  assert.deepEqual(page.errors, []);
  console.log(JSON.stringify({ initial, flow, mobile: { viewport: mobile.viewport, width: mobile.width }, restored, runtimeErrors: page.errors }, null, 2));
} finally {
  page?.close();
  if (browserContextId) await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  browser.close();
}
