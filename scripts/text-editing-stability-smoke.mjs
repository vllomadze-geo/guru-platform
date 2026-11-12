import assert from 'node:assert/strict';

const port = process.env.GURU_CHROME_DEBUG_PORT || '38677';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:38676/';
const payloadBytes = Number(process.env.GURU_INPUT_TEST_PAYLOAD_BYTES || 0);

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      const task = this.pending.get(message.id);
      if (!task) return;
      this.pending.delete(message.id);
      message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(info.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(targets.find(target => target.id === targetId).webSocketDebuggerUrl);
const evaluate = async expression => {
  const response = await page.call('Runtime.evaluate', {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (response.exceptionDetails)
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
};

try {
  await page.call('Runtime.enable');
  await page.call('Page.enable');
  await page.call('Page.navigate', { url: appUrl });
  await page.call('Page.bringToFront');
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate('document.readyState === "complete" && typeof guruV309ProjectSegmentRecord === "function"')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const setup = await evaluate(`(() => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    const id = 'text-editing-stability-smoke';
    projects = [{ id, name: 'Проверка ввода', lifecycleStatus: 'active' }];
    activeProjectId = id;
    state = createFreshWorkspace(projects[0]);
    if (${payloadBytes} > 0) state.project.__diagnosticPayload = 'x'.repeat(${payloadBytes});
    const record = guruV309ProjectSegmentRecord(state, true);
    record.segment_name = 'Компании';
    record.value = 'Компания из Москвы, которая ценит ручную работу';
    record.segment = { geography: 'Москва', demographics: 'Компании',
      psychographics: 'Ценят качество', behavior: 'Сравнивают варианты',
      need_response: 'Ищут подарок', legacy_value: '' };
    state._gate0Open = { ...(state._gate0Open || {}),
      'gate0-company-segmentation': true };
    els.launcher.hidden = true;
    els.appShell.hidden = false;
    activeView = 'gate'; activeGateId = 'gate-0';
    renderGate();
    const selector = '[data-gate0-company-segmentation-field="unified"]';
    const field = els.contentArea.querySelector(selector);
    if (!field) return { error: 'company segment editor not rendered' };
    window.__editField = field;
    window.__recordId = record.id;
    window.__calls = {};
    for (const name of ['guruV194SyncLegacy', 'guruV309EnsureCompanySegmentationCard',
      'guruStrategicFoundationCompanyRefreshV310', 'guruCompanyKeywordFoundationRefreshV351',
      'guruStrategicFoundationRefreshV245', 'guruV194RefreshProductSelectorsV1',
      'flashSaving', 'renderGate']) {
      const original = window[name];
      if (typeof original !== 'function') continue;
      window[name] = function (...args) {
        const started = performance.now();
        try { return original.apply(this, args); }
        finally {
          const item = window.__calls[name] ||= { count: 0, ms: 0, max: 0 };
          const elapsed = performance.now() - started;
          item.count += 1; item.ms += elapsed; item.max = Math.max(item.max, elapsed);
        }
      };
    }
    return { value: field.value, connected: field.isConnected };
  })()`);
  assert(!setup.error, setup.error);
  const fieldState = () => evaluate(`(() => {
    const field = window.__editField;
    const record = guruCompanySegmentsV360(state).find(item => item.id === window.__recordId);
    return { value: field.value, model: record?.value,
      connected: field.isConnected, focused: document.activeElement === field,
      start: field.selectionStart, end: field.selectionEnd,
      calls: window.__calls };
  })()`);
  await evaluate(`(() => { const field = window.__editField;
    field.focus({ preventScroll: true });
    field.setSelectionRange(field.value.length, field.value.length);
    return true; })()`);
  const started = Date.now();
  await page.call('Input.insertText', { text: '!' });
  const typed = await fieldState();
  const inputMs = Date.now() - started;
  await page.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  await page.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  const deleted = await fieldState();
  await evaluate(`(() => { window.__editField.setSelectionRange(0, 8); return true; })()`);
  await page.call('Input.insertText', { text: 'Организация' });
  const replaced = await fieldState();
  await evaluate(`(() => { const field = window.__editField;
    field.setSelectionRange(0, field.value.length); return true; })()`);
  await page.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  await page.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  const cleared = await fieldState();
  await new Promise(resolve => setTimeout(resolve, 1000));
  const settled = await fieldState();
  const deferred = await evaluate(`(() => { renderGate(); return {
    connected: window.__editField.isConnected,
    focused: document.activeElement === window.__editField,
    value: window.__editField.value,
  }; })()`);
  await evaluate(`(() => { window.__editField.blur(); return true; })()`);
  await new Promise(resolve => setTimeout(resolve, 100));
  const afterBlur = await evaluate(`(() => {
    const field = document.querySelector('[data-gate0-company-segmentation-id="' +
      CSS.escape(window.__recordId) + '"][data-gate0-company-segmentation-field="unified"]');
    const record = guruCompanySegmentsV360(state).find(item => item.id === window.__recordId);
    return { value: field?.value, model: record?.value, oldConnected: window.__editField.isConnected };
  })()`);
  const gate8 = await evaluate(`(() => {
    activeGateId = 'gate-8'; renderGate();
    const field = els.contentArea.querySelector('[data-g8-v3-manual="budget"]');
    if (!field) return { error: 'Gate 8 scenario editor not rendered' };
    window.__gate8Field = field;
    field.focus({ preventScroll: true });
    return { value: field.value, connected: field.isConnected };
  })()`);
  assert(!gate8.error, gate8.error);
  await page.call('Input.insertText', { text: '123' });
  await new Promise(resolve => setTimeout(resolve, 350));
  const gate8Typed = await evaluate(`(() => ({
    value: window.__gate8Field.value,
    model: ensureGate8Workspace().manual.budget,
    connected: window.__gate8Field.isConnected,
    focused: document.activeElement === window.__gate8Field,
  }))()`);
  for (let index = 0; index < 3; index += 1) {
    await page.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
    await page.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
  }
  await new Promise(resolve => setTimeout(resolve, 350));
  const gate8Cleared = await evaluate(`(() => ({
    value: window.__gate8Field.value,
    model: ensureGate8Workspace().manual.budget,
    connected: window.__gate8Field.isConnected,
    focused: document.activeElement === window.__gate8Field,
  }))()`);
  await evaluate(`window.__gate8Field.blur()`);
  const stored = await evaluate(`(async () => {
    const saved = await guruQueueWorkspaceSave({ durable: true });
    const serialized = localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId) ||
      (await guruWorkspaceIdbReadV1(activeProjectId))?.serialized;
    const restored = serialized ? JSON.parse(serialized) : null;
    const segment = guruCompanySegmentsV360(restored || {}).find(item => item.id === window.__recordId);
    return { saved, segment: segment?.value, budget: restored?.gate8Forecast?.manual?.budget };
  })()`);
  const report = { inputMs, typed, deleted, replaced, cleared, settled, deferred,
    afterBlur, gate8Typed, gate8Cleared, stored };
  if (process.env.GURU_VERBOSE === '1') console.log(JSON.stringify(report, null, 2));
  else console.log(`Text editing: ${inputMs.toFixed(1)} ms insertion; segment and Gate 8 keep their editors and values`);
  assert.equal(typed.value, `${setup.value}!`);
  assert.equal(typed.model, typed.value);
  assert.equal(deleted.value, setup.value);
  assert.equal(deleted.model, deleted.value);
  assert.equal(replaced.value, `Организация${setup.value.slice(8)}`);
  assert.equal(replaced.model, replaced.value);
  assert.equal(cleared.value, '');
  assert.equal(cleared.model, '');
  assert.equal(settled.value, '');
  assert.equal(settled.model, '');
  assert(typed.focused && deleted.focused && cleared.focused && settled.focused);
  assert(typed.connected && deleted.connected && replaced.connected && cleared.connected && settled.connected);
  assert.deepEqual(deferred, { connected: true, focused: true, value: '' });
  assert.equal(afterBlur.value, '');
  assert.equal(afterBlur.model, '');
  assert.deepEqual(gate8Typed, { value: '123', model: '123', connected: true,
    focused: true });
  assert.deepEqual(gate8Cleared, { value: '', model: '', connected: true, focused: true });
  assert.deepEqual(stored, { saved: true, segment: '', budget: '' });
  if (process.env.GURU_SURVEY_GATES === '1') {
    const survey = [];
    for (let gate = 0; gate <= 8; gate += 1) {
      const sample = await evaluate(`(async () => {
        window.__gateSurveyField?.blur();
        renderGateNav();
        els.gateNav.querySelector('[data-gate-id="gate-${gate}"]')?.click();
        await new Promise(resolve => setTimeout(resolve, 150));
        const editableFields = () => [...els.contentArea.querySelectorAll('textarea, input')]
          .filter(node => !node.disabled && !node.readOnly && node.getClientRects().length &&
            !node.closest('details:not([open])') &&
            (node.matches('textarea') || ['text', 'url', 'search', 'email', 'tel'].includes(node.type)) &&
            !node.hasAttribute('maxlength'));
        let field = editableFields()[0];
        if (!field) {
          els.contentArea.querySelectorAll('details:not([open])').forEach(node => { node.open = true; });
          field = editableFields()[0];
        }
        if (!field) return null;
        window.__gateSurveyField = field;
        field.focus({ preventScroll: true });
        field.setSelectionRange(field.value.length, field.value.length);
        return { gateId: activeGateId, initial: field.value,
          focused: document.activeElement === field,
          selector: [...field.attributes]
          .find(attribute => attribute.name.startsWith('data-'))?.name || field.tagName };
      })()`);
      if (!sample) { survey.push({ gate, skipped: true }); continue; }
      await page.call('Input.insertText', { text: 'x' });
      await new Promise(resolve => setTimeout(resolve, 350));
      const typedSurvey = await evaluate(`(() => ({
        value: window.__gateSurveyField.value,
        connected: window.__gateSurveyField.isConnected,
        focused: document.activeElement === window.__gateSurveyField,
      }))()`);
      await page.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
      await page.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8 });
      const clearedSurvey = await evaluate(`(() => ({
        value: window.__gateSurveyField.value,
        connected: window.__gateSurveyField.isConnected,
        focused: document.activeElement === window.__gateSurveyField,
      }))()`);
      survey.push({ gate, selector: sample.selector, typed: typedSurvey, cleared: clearedSurvey });
      assert.equal(sample.gateId, `gate-${gate}`, `gate-${gate}: navigation did not finish`);
      assert(sample.focused, `gate-${gate}: editor could not be focused`);
      assert(typedSurvey.connected && typedSurvey.focused && clearedSurvey.connected && clearedSurvey.focused,
        `gate-${gate}: editor lost focus or was replaced`);
      assert.equal(typedSurvey.value, sample.initial + 'x', `gate-${gate}: insertion failed`);
      assert.equal(clearedSurvey.value, sample.initial, `gate-${gate}: deletion failed`);
    }
    console.log('Gate survey:', survey.map(row => row.skipped ? `${row.gate}:closed` : `${row.gate}:ok`).join(', '));
  }
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  page.close(); browser.close();
}
