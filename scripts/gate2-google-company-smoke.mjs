import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const fixture = JSON.parse(readFileSync(process.env.GURU_GATE2_FIXTURE || '/Users/vl/Downloads/gate-2.json', 'utf8'));
const browserPort = process.env.GURU_CHROME_DEBUG_PORT || '49337';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:3000/';
const folder = 'artifacts/gate2-google-company';
mkdirSync(folder, { recursive: true });

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map(); this.errors = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown')
        this.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      const pending = this.pending.get(message.id); if (!pending) return;
      this.pending.delete(message.id); clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message)); else pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 60000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
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
  const evaluate = async expression => {
    const reply = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description || reply.exceptionDetails.text);
    return reply.result.value;
  };
  await page.call('Runtime.enable'); await page.call('Page.enable');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.navigate', { url: appUrl });
  for (let i = 0; i < 200; i++) {
    if (await evaluate('document.readyState === "complete" && typeof g2gCompanyMount === "function"')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await evaluate(`(() => {
    localStorage.clear(); rememberAccessUnlocked(); setAccessState(true);
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    projects = [{ id: 'gate2-google-isolated', name: 'Коричное яблоко', lifecycleStatus: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    saveProjects(); activeProjectId = 'gate2-google-isolated';
    state = createFreshWorkspace({ id: activeProjectId, name: 'Коричное яблоко' });
    state.project = { ...state.project, ...${JSON.stringify(fixture.content.project)}, id: activeProjectId };
    state.gates.find(gate => gate.id === 'gate-2').cards = ${JSON.stringify(fixture.gate.cards)};
    const first = guruV194Products(state)[0];
    if (first) state.project.gate0ScopeUiV194 = { selectedCategoryId: megaPlatformProductCategoryIds(first)[0] || '__uncategorized__', selectedProductId: first.id };
    window.__googleOriginalFields = ['g2-marketing-ga4','g2-marketing-gsc','g2-marketing-google-ads'].map(id =>
      JSON.stringify(state.gates.find(gate => gate.id === 'gate-2').cards.find(card => card.id === id)?.fields));
    els.launcher.hidden = true; els.appShell.hidden = false; activeView = 'gate'; activeGateId = 'gate-2';
    renderGate();
  })()`);
  const initial = await evaluate(`(() => {
    const group = document.querySelector('[data-g2g-company]');
    const ids = ['company-ga4','company-gsc','company-google-ads'];
    const cards = state.gates.find(gate => gate.id === 'gate-2').cards;
    return { count: document.querySelectorAll('[data-g2g-company]').length, yandexCount: document.querySelectorAll('[data-g2y-company]').length,
      title: group?.querySelector(':scope > summary h3')?.textContent,
      sections: [...group?.querySelectorAll(':scope > .g2y-company-section') || []].map(node => node.querySelector('h4')?.textContent),
      ids: [...group?.querySelectorAll('[data-g2sb-id]') || []].map(node => node.dataset.g2sbId),
      standalone: ids.map(id => document.querySelectorAll('.g2w-workspace [data-g2sb-id="' + id + '"]').length),
      summary: group?.querySelector('[data-g2y-summary]')?.textContent,
      cardsIntact: ['g2-marketing-ga4','g2-marketing-gsc','g2-marketing-google-ads'].every((id, index) =>
        JSON.stringify(cards.find(card => card.id === id)?.fields) === window.__googleOriginalFields[index]),
      links: ids.map(id => group?.querySelector('[data-g2sb-id="' + id + '"]')?.querySelector(':scope > summary a[href^="https://"]')?.href),
      pageWidth: document.documentElement.scrollWidth, viewport: innerWidth };
  })()`);
  console.log(JSON.stringify(initial, null, 2));
  assert.equal(initial.count, 1); assert.equal(initial.yandexCount, 1); assert.equal(initial.title, 'Google');
  assert.deepEqual(initial.sections, ['Аналитика', 'Поиск', 'Реклама']);
  assert.deepEqual(initial.ids, ['company-ga4','company-gsc','company-google-ads']);
  assert.deepEqual(initial.standalone, [1,1,1]); assert(initial.cardsIntact); assert(initial.links.every(Boolean));
  assert(initial.summary.includes('из 3 разделов готово') || initial.summary.includes('не требуется'));
  assert(initial.pageWidth <= initial.viewport + 1);
  const disclosure = await evaluate(`(() => {
    let group = document.querySelector('[data-g2g-company]');
    for (let parent = group.parentElement?.closest('details'); parent; parent = parent.parentElement?.closest('details')) parent.open = true;
    group.open = true; group.querySelector(':scope > summary').click();
    const closed = !group.open;
    renderGate(); group = document.querySelector('[data-g2g-company]');
    const stayedClosed = !group.open; group.querySelector(':scope > summary').click();
    return { closed, stayedClosed, reopened: group.open };
  })()`);
  assert.deepEqual(disclosure, { closed: true, stayedClosed: true, reopened: true });
  const editor = await evaluate(`(async () => {
    const group = document.querySelector('[data-g2g-company]');
    let block = group.querySelector('[data-g2sb-id="company-ga4"]');
    block.querySelector('[data-g2step-action="mode"]').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    block = group.querySelector('[data-g2sb-id="company-ga4"]');
    const editing = !!block.querySelector('[data-g2step-editor], .g2step-edit-group');
    const marked = block.dataset.g2yUnit === 'ga4';
    const summary = group.querySelector('[data-g2y-summary]').textContent;
    block.querySelector('[data-g2step-action="mode"]').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    const restoredBlock = group.querySelector('[data-g2sb-id="company-ga4"]');
    return { editing, marked, summary, restored: restoredBlock.dataset.g2yUnit === 'ga4',
      title: restoredBlock.querySelector(':scope > summary .g2sb-title')?.textContent };
  })()`);
  assert(editor.editing); assert(editor.marked); assert(editor.restored);
  assert.equal(editor.summary, initial.summary);
  assert.equal(editor.title, 'Google Analytics 4 · Компания');
  const statusUpdate = await evaluate(`(async () => {
    const group = document.querySelector('[data-g2g-company]');
    const block = group.querySelector('[data-g2sb-id="company-ga4"]');
    const summary = group.querySelector('[data-g2y-summary]');
    const before = summary.textContent;
    const badge = block.querySelector(':scope > summary [data-g2sb-status]');
    const oldStatus = badge.dataset.status, oldLabel = badge.textContent;
    badge.dataset.status = 'ready'; badge.textContent = 'Готово';
    await new Promise(resolve => setTimeout(resolve, 0));
    const changed = summary.textContent;
    badge.dataset.status = oldStatus; badge.textContent = oldLabel;
    await new Promise(resolve => setTimeout(resolve, 0));
    return { before, changed, restored: summary.textContent };
  })()`);
  assert.notEqual(statusUpdate.changed, statusUpdate.before);
  assert.equal(statusUpdate.restored, statusUpdate.before);
  const prepareShot = async showGa4 => evaluate(`(() => {
    const group = document.querySelector('[data-g2g-company]');
    for (let parent = group.parentElement?.closest('details'); parent; parent = parent.parentElement?.closest('details')) parent.open = true;
    group.open = true; group.querySelector('[data-g2sb-id="company-ga4"]').open = ${showGa4};
    group.querySelector('[data-g2sb-id="company-gsc"]').open = false;
    group.querySelector('[data-g2sb-id="company-google-ads"]').open = false;
    document.activeElement?.blur();
    const rect = group.getBoundingClientRect();
    return { x: Math.max(0, rect.left + scrollX), y: Math.max(0, rect.top + scrollY), width: rect.width, height: rect.height };
  })()`);
  const capture = async (name, clip) => writeFileSync(`${folder}/${name}.png`, Buffer.from((await page.call('Page.captureScreenshot',
    { format: 'png', captureBeyondViewport: true, clip: { ...clip, scale: 1 } })).data, 'base64'));
  await capture('desktop-overview', await prepareShot(false));
  await capture('desktop-ga4-open', await prepareShot(true));
  await page.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await capture('mobile-390-overview', await prepareShot(false));
  await capture('mobile-390-ga4-open', await prepareShot(true));
  const mobile = await evaluate(`(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth,
    group: document.querySelector('[data-g2g-company]').getBoundingClientRect().width }))()`);
  assert(mobile.width <= mobile.viewport + 1, JSON.stringify(mobile));
  const projectSwitch = await evaluate(`(() => {
    const original = state, savedId = activeProjectId;
    state = createFreshWorkspace({ id: 'gate2-google-other', name: 'Другой проект' });
    activeProjectId = 'gate2-google-other'; renderGate();
    const other = document.querySelectorAll('[data-g2g-company] [data-g2sb-id]').length;
    state = original; activeProjectId = savedId; renderGate();
    const cards = state.gates.find(gate => gate.id === 'gate-2').cards;
    return { other, restored: document.querySelectorAll('[data-g2g-company] [data-g2sb-id]').length,
      fieldsIntact: ['g2-marketing-ga4','g2-marketing-gsc','g2-marketing-google-ads'].every((id, index) =>
        JSON.stringify(cards.find(card => card.id === id)?.fields) === window.__googleOriginalFields[index]) };
  })()`);
  assert.equal(projectSwitch.other, 3); assert.equal(projectSwitch.restored, 3); assert(projectSwitch.fieldsIntact);
  assert.equal(page.errors.length, 0, page.errors.join('\n'));
  console.log(JSON.stringify({ disclosure, editor, statusUpdate, mobile, projectSwitch, errors: page.errors }));
  console.log('Gate 2 Google company smoke: OK');
} finally {
  page?.close();
  if (browserContextId) await browser.call('Target.disposeBrowserContext', { browserContextId });
  browser.close();
}
