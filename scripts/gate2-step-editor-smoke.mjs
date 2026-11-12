import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const fixture = JSON.parse(readFileSync(process.env.GURU_GATE2_FIXTURE || '/Users/vl/Downloads/gate-2.json', 'utf8'));
const browserPort = process.env.GURU_CHROME_DEBUG_PORT || '49337';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:41323/';
const folder = 'artifacts/gate2-step-editor';
const fast = process.env.GURU_STEP_EDITOR_FAST === '1';
mkdirSync(folder, { recursive: true });

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map(); this.errors = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') this.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      const pending = this.pending.get(message.id); if (!pending) return;
      this.pending.delete(message.id); clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message)); else pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout ${method}`)); }, 30000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const version = await (await fetch(`http://127.0.0.1:${browserPort}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
let page; let browserContextId;
try {
  ({ browserContextId } = await browser.call('Target.createBrowserContext'));
  const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
  const tabs = await (await fetch(`http://127.0.0.1:${browserPort}/json`)).json();
  page = new Cdp(tabs.find((tab) => tab.id === targetId).webSocketDebuggerUrl);
  const evaluate = async (expression) => {
    const reply = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description || reply.exceptionDetails.text);
    return reply.result.value;
  };
  await page.call('Runtime.enable'); await page.call('Page.enable');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.navigate', { url: appUrl });
  for (let i = 0; i < 200; i++) {
    if (await evaluate('document.readyState === "complete" && typeof g2StepEnsure === "function"')) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  await evaluate(`(() => {
    localStorage.clear(); rememberAccessUnlocked(); setAccessState(true);
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    projects = [{ id: 'gate2-step-editor-isolated', name: 'iCleaning', lifecycleStatus: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    activeProjectId = 'gate2-step-editor-isolated';
    state = createFreshWorkspace({ id: activeProjectId, name: 'iCleaning' });
    state.project = { ...state.project, ...${JSON.stringify(fixture.content.project)}, id: activeProjectId };
    state.gates.find((gate) => gate.id === 'gate-2').cards = ${JSON.stringify(fixture.gate.cards)};
    const first = guruV194Products(state)[0];
    if (first) state.project.gate0ScopeUiV194 = { selectedCategoryId: megaPlatformProductCategoryIds(first)[0] || '__uncategorized__', selectedProductId: first.id };
    els.launcher.hidden = true; els.appShell.hidden = false; activeView = 'gate'; activeGateId = 'gate-2';
    renderGate();
    const block = document.querySelector('[data-g2sb-id="company-domain"]');
    for (let ancestor = block; ancestor; ancestor = ancestor.parentElement) {
      if (ancestor.tagName === 'DETAILS') ancestor.open = true;
      if (ancestor.matches?.('[data-g2-toggle-section]') && ancestor.getAttribute('aria-expanded') !== 'true') ancestor.click();
    }
    block.open = true;
  })()`);
  const block = '[data-g2sb-id="company-domain"]';
  const capture = async (name, width, height = 1100) => {
    if (fast) return;
    const bounds = await evaluate(`(() => { const b = document.querySelector('${block}').getBoundingClientRect(); return { x: Math.max(0,b.x), y: Math.max(0,b.y + scrollY), width: Math.min(b.width, innerWidth), height: Math.min(b.height, ${height}) }; })()`);
    const shot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
      clip: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, scale: 1 } });
    writeFileSync(`${folder}/${name}-${width}.png`, Buffer.from(shot.data, 'base64'));
  };
  const action = (selector) => evaluate(`document.querySelector(${JSON.stringify(`${block} ${selector}`)})?.click()`);
  const report = { blocks: [], checks: {}, screenshots: [], errors: [] };
  report.blocks = await evaluate(`[...document.querySelectorAll('.g2w-workspace .g2u-block:not(.g2u-panel)')].map((b) => ({ id: b.dataset.g2sbId || 'wizard-' + b.dataset.g2wCardView, edit: Boolean(b.querySelector(':scope > summary [data-g2step-action="mode"]')) }))`);
  assert(report.blocks.length >= 17); // The former Metrika wizard cards are one unified unit.
  assert(report.blocks.every((b) => b.edit));
  assert.equal(await evaluate('document.querySelectorAll(".g2u-panel [data-g2step-action=mode]").length'), 0);
  for (const width of [1440, 390]) {
    await page.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 390 });
    await capture('normal', width);
    await action('[data-g2step-action="mode"]');
    await capture('edit', width);
    await action('[data-g2step-action="edit"]');
    await capture('editor', width);
    if (width === 1440) {
      await page.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
      report.checks.dark = await evaluate(`(() => { const b = document.querySelector('${block}'); return { block: getComputedStyle(b).backgroundColor, input: getComputedStyle(b.querySelector('[data-g2step-edit-field="what"]')).backgroundColor }; })()`);
      assert.equal(report.checks.dark.input, report.checks.dark.block);
      await page.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    }
    const formState = await evaluate(`(() => { const form = document.querySelector('${block} [data-g2step-form]'); return { visible: Boolean(form), fields: [...form.querySelectorAll('[data-g2step-edit-field]')].map((n) => n.dataset.g2stepEditField), system: form.textContent.includes('Поля шага заданы системой') }; })()`);
    assert(formState.visible); assert(formState.system); report.checks[`editor${width}`] = formState;
    await evaluate('document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))');
    await action('[data-g2step-action="delete"][data-g2step-step="address"]');
    await capture('confirmation', width);
    assert.equal(await evaluate(`Boolean(document.querySelector('${block} [data-g2step-confirm]'))`), true);
    await action('[data-g2step-action="cancel-delete"]');
    await action('[data-g2step-action="mode"]');
    report.checks[`width${width}`] = await evaluate('({ page: document.documentElement.scrollWidth, viewport: innerWidth })');
    assert(report.checks[`width${width}`].page <= width);
    report.screenshots.push(...['normal', 'edit', 'editor', 'confirmation'].map((state) => `${folder}/${state}-${width}.png`));
  }
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await action('[data-g2step-action="mode"]');
  await action('[data-g2step-action="add"]');
  await evaluate(`(() => { const form = document.querySelector('${block} [data-g2step-form]'); form.querySelector('[data-g2step-edit-field="what"]').value = 'Проверить тестовый шаг'; form.querySelector('[data-g2step-action="add-field"]').click(); const row = form.querySelector('[data-g2step-field-id]'); row.querySelector('[data-g2step-field-name]').value = 'Комментарий'; form.requestSubmit(); })()`);
  report.checks.added = await evaluate(`(() => { const c = g2StepServiceConfig(G2_SERVICE_BLOCK_CONFIGS.get('company-domain')); const layout = state.project.gate2StepLayoutsV1.company['service:company-domain']; const id = Object.keys(layout.added)[0]; return { total: c.steps.length, id, progress: document.querySelector('${block} [data-g2sb-progress]')?.textContent, saved: Boolean(layout), row: Boolean(document.querySelector('${block} [data-g2step-step="'+id+'"]')) }; })()`);
  assert.equal(report.checks.added.total, 9); assert(report.checks.added.saved);
  const customId = report.checks.added.id;
  await action('[data-g2step-action="mode"]');
  report.checks.manual = await evaluate(`(() => { const row = document.querySelector('${block} [data-g2sb-step-id="${customId}"]'); const field = row.querySelector('[data-g2step-value]'); field.value = 'https://example.test/check'; field.dispatchEvent(new Event('input', { bubbles: true })); field.dispatchEvent(new Event('change', { bubbles: true })); row.querySelector('[data-g2sb-step]').click(); const record = g2ServiceBlockRecord(G2_SERVICE_BLOCK_CONFIGS.get('company-domain')); return { done: record.steps['${customId}']?.result, value: Object.values(record.steps['${customId}']?.params?.customFields || {})[0], progress: document.querySelector('${block} [data-g2sb-progress]').textContent }; })()`);
  assert.equal(report.checks.manual.done, 'done');
  assert.equal(report.checks.manual.value, 'https://example.test/check');
  await action('[data-g2step-action="mode"]');
  await action(`[data-g2step-action="edit"][data-g2step-step="${customId}"]`);
  await evaluate(`(() => { const form = document.querySelector('${block} [data-g2step-form]'); form.querySelector('[data-g2step-edit-field="what"]').value = 'Проверить обновлённый шаг'; form.querySelector('[data-g2step-field-name]').value = 'Заметка'; form.querySelector('[data-g2step-field-type]').value = 'url'; form.requestSubmit(); })()`);
  report.checks.edited = await evaluate(`(() => { const c = g2StepServiceConfig(G2_SERVICE_BLOCK_CONFIGS.get('company-domain')); const s = c.steps.find((s) => s.step_id === ${JSON.stringify(customId)}); return { what: s.what, field: s.customFields[0] }; })()`);
  assert.equal(report.checks.edited.what, 'Проверить обновлённый шаг'); assert.equal(report.checks.edited.field.type, 'url');
  report.checks.preservedValue = await evaluate(`Object.values(g2ServiceBlockRecord(G2_SERVICE_BLOCK_CONFIGS.get('company-domain')).steps['${customId}'].params.customFields)[0]`);
  assert.equal(report.checks.preservedValue, 'https://example.test/check');
  await action(`[data-g2step-action="delete"][data-g2step-step="${customId}"]`);
  assert.equal(await evaluate(`Boolean(document.querySelector('${block} [data-g2step-confirm]'))`), true);
  await action(`[data-g2step-action="confirm-delete"][data-g2step-step="${customId}"]`);
  report.checks.deleted = await evaluate(`({ count: g2StepServiceConfig(G2_SERVICE_BLOCK_CONFIGS.get('company-domain')).steps.length, toast: Boolean(document.querySelector('[data-g2step-toast]')) })`);
  assert.equal(report.checks.deleted.count, 8); assert(report.checks.deleted.toast);
  await evaluate('document.querySelector("[data-g2step-undo]").click()');
  report.checks.undone = await evaluate(`g2StepServiceConfig(G2_SERVICE_BLOCK_CONFIGS.get('company-domain')).steps.some((s) => s.step_id === ${JSON.stringify(customId)})`);
  assert(report.checks.undone);
  report.checks.restoredAnswer = await evaluate(`g2ServiceBlockRecord(G2_SERVICE_BLOCK_CONFIGS.get('company-domain')).steps['${customId}']?.result`);
  assert.equal(report.checks.restoredAnswer, 'done');
  await evaluate(`(() => { const b = document.querySelector('${block}'); b.querySelector('[data-g2step-action="mode"]').click(); renderGate(); })()`);
  report.checks.rerender = await evaluate(`({ edited: document.querySelector('${block}').querySelector('[data-g2step-action="mode"]').textContent, count: g2StepServiceConfig(G2_SERVICE_BLOCK_CONFIGS.get('company-domain')).steps.length })`);
  assert.equal(report.checks.rerender.count, 9);
  report.checks.migrated = await evaluate(`(() => { const copy = migrateWorkspace(structuredClone(state), activeProjectId); return { steps: copy.project.gate2StepLayoutsV1.company['service:company-domain'].groups.flatMap(g => g.steps).length, answer: g2ServiceBlockRecord(G2_SERVICE_BLOCK_CONFIGS.get('company-domain'), '', false, copy)?.steps?.['${customId}']?.result }; })()`);
  assert.equal(report.checks.migrated.steps, 9); assert.equal(report.checks.migrated.answer, 'done');
  const wizard = '[data-g2w-card-view="counter"]';
  if (await evaluate(`Boolean(document.querySelector('${wizard}'))`)) {
    await evaluate(`(() => { document.querySelector('${wizard}').open = true; document.querySelector('${wizard} [data-g2step-action="mode"]').click(); document.querySelector('${wizard} [data-g2step-action="add"]').click(); const f = document.querySelector('${wizard} [data-g2step-form]'); f.querySelector('[data-g2step-edit-field="what"]').value = 'Проверить связь счётчика'; f.requestSubmit(); })()`);
    report.checks.wizard = await evaluate(`({ count: g2StepWizardDef(g2wDef('counter')).steps.length, progress: document.querySelector('${wizard} .g2sb-progress')?.textContent })`);
    assert.equal(report.checks.wizard.count, 6);
  } else {
    report.checks.wizard = { unified: await evaluate('Boolean(document.querySelector("[data-g2mu-block]"))') };
    assert(report.checks.wizard.unified);
  }
  report.errors = [...browser.errors, ...page.errors]; assert.deepEqual(report.errors, []);
  writeFileSync(`${folder}/results.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ok: true, ...report }));
} finally {
  page?.close();
  if (browserContextId) await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  browser.close();
}
