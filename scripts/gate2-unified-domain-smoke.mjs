import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const fixture = JSON.parse(readFileSync(process.env.GURU_GATE2_FIXTURE || '/Users/vl/Downloads/gate-2.json', 'utf8'));
const browserPort = process.env.GURU_CHROME_DEBUG_PORT || '49337';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:41323/';
const projectId = 'gate2-unified-domain-isolated';
const folder = 'artifacts/gate2-unified-domain';
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
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 60000);
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
    if (await evaluate('document.readyState === "complete" && typeof g2wRefresh === "function"')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await evaluate(`(() => {
    localStorage.clear(); rememberAccessUnlocked(); setAccessState(true);
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    projects = [{ id: ${JSON.stringify(projectId)}, name: 'iCleaning', lifecycleStatus: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    activeProjectId = ${JSON.stringify(projectId)};
    state = createFreshWorkspace({ id: ${JSON.stringify(projectId)}, name: 'iCleaning' });
    state.project = { ...state.project, ...${JSON.stringify(fixture.content.project)}, id: ${JSON.stringify(projectId)} };
    state.gates.find(gate => gate.id === 'gate-2').cards = ${JSON.stringify(fixture.gate.cards)};
    const first = guruV194Products(state)[0];
    if (first) state.project.gate0ScopeUiV194 = { selectedCategoryId: megaPlatformProductCategoryIds(first)[0] || '__uncategorized__', selectedProductId: first.id };
    els.launcher.hidden = true; els.appShell.hidden = false; activeView = 'gate'; activeGateId = 'gate-2';
    renderGate();
    const block = document.querySelector('[data-g2sb-id="company-domain"]');
    if (!block) throw new Error('Domain block absent');
    for (let ancestor = block; ancestor; ancestor = ancestor.parentElement) {
      if (ancestor.tagName === 'DETAILS') ancestor.open = true;
      if (ancestor.matches?.('[data-g2-toggle-section]') && ancestor.getAttribute('aria-expanded') !== 'true') ancestor.click();
    }
    block.open = true;
  })()`);
  const inspect = async () => evaluate(`(() => {
    const block = document.querySelector('[data-g2sb-id="company-domain"]');
    const config = G2_SERVICE_BLOCK_CONFIGS.get('company-domain');
    const guides = [...block.querySelectorAll('.g2u-guide')];
    return { unified: block.classList.contains('g2u-block'), groups: [...block.querySelectorAll('.g2u-group h4')].map(n => n.textContent),
      steps: [...block.querySelectorAll('.g2u-step')].map(n => n.dataset.g2sbStepId),
      openGuides: guides.filter(n => n.open).map(n => n.closest('[data-g2sb-step-id]').dataset.g2sbStepId),
      oldCompletedLabels: [...block.querySelectorAll('.g2u-step')].some(n => n.textContent.includes('Выполнено')),
      duplicateSummary: block.textContent.includes('Итог блока'),
      status: block.querySelector('[data-g2sb-status]')?.textContent,
      expectedStatus: g2ServiceBlockStatusLabel(config, g2ServiceBlockStatus(config)),
      progress: block.querySelector('[data-g2sb-progress]')?.textContent,
      related: Boolean(block.querySelector('.g2u-related')),
      fields: [...block.querySelectorAll('.g2u-step input, .g2u-step select')].length,
      source: block.querySelector('[data-g2sb-step-id="address"] .g2sb-context')?.textContent.trim(),
      width: document.documentElement.scrollWidth, viewport: innerWidth,
      dataKeys: Object.keys(g2ServiceBlockRecord(config) || {}),
    };
  })()`);
  const initial = await inspect();
  assert.equal(initial.unified, true);
  assert.deepEqual(initial.groups, ['Адрес и платформа', 'DNS и доступность', 'Защита и переадресация']);
  assert.equal(initial.steps.length, 8);
  assert.equal(initial.oldCompletedLabels, false);
  assert.equal(initial.duplicateSummary, false);
  assert.equal(initial.status, initial.expectedStatus);
  assert.equal(initial.related, true);
  let allBlocks = null;
  let panelBlocks = null;
  if (process.env.GURU_UNIFIED_ALL === '1') {
    allBlocks = await evaluate(`(() => [...document.querySelectorAll('.g2w-workspace .g2u-block:not(.g2u-panel)')].map(block => {
      const wizard = block.classList.contains('g2u-wizard');
      const id = wizard ? 'wizard-' + block.dataset.g2wCardView : block.dataset.g2sbId;
      const def = wizard ? g2wDef(block.dataset.g2wCardView) : G2_SERVICE_BLOCK_CONFIGS.get(id);
      const productId = block.dataset.g2sbProductId || '';
      const expectedStatus = wizard ? g2wStatusLabel(g2wStatus(def)) : g2ServiceBlockStatusLabel(def, g2ServiceBlockStatus(def, productId), productId);
      return { id, wizard, status: block.querySelector(':scope > summary .g2sb-status')?.textContent.trim(),
        expectedStatus, steps: block.querySelectorAll('.g2u-step').length, expectedSteps: def.steps.length,
        groups: [...block.querySelectorAll('.g2u-group h4')].map(node => node.textContent),
        oldLayout: Boolean(block.querySelector('.g2sb-step-content, .g2w-step-label')),
        related: [...block.querySelectorAll('.g2s4-related')].every(node => node.tagName === 'DETAILS') };
    }))()`);
    assert.equal(allBlocks.length, 19, 'Gate 2 should show 17 services and 2 company Metrika units');
    assert.ok(allBlocks.every(item => item.status === item.expectedStatus));
    assert.ok(allBlocks.every(item => item.steps === item.expectedSteps || item.wizard && item.steps === 0));
    assert.ok(allBlocks.every(item => !item.oldLayout && item.related));
    panelBlocks = await evaluate(`(() => [...document.querySelectorAll('.g2u-panel')].map(block => {
      const id = block.dataset.card;
      const card = state.gates.find(gate => gate.id === 'gate-2').cards.find(item => item.id === id);
      const status = g2CardStatus(card);
      const fields = block.querySelectorAll('input, select, textarea').length;
      const grid = block.querySelector('.g2-metrika-grid-v360, .g2-mp-fields-v367, .g2-mc-fields-v374');
      const gridColumns = grid ? getComputedStyle(grid).gridTemplateColumns : '';
      return { id: 'panel-' + id, status: block.querySelector('.g2sb-status')?.textContent.trim(),
        expectedStatus: STATUS_LABELS[status] || status, fields, gridColumns,
        oneColumn: gridColumns.startsWith('minmax(') || !gridColumns.includes(' ') };
    }))()`);
    assert.equal(panelBlocks.length, 12, `All Metrika checks should use the shared block shell: ${panelBlocks.map(item => item.id).join(', ')}`);
    assert.ok(panelBlocks.every(item => item.status === item.expectedStatus && item.fields > 0 && item.oneColumn),
      JSON.stringify(panelBlocks.filter(item => item.status !== item.expectedStatus || !item.fields || !item.oneColumn)));
    if (process.env.GURU_SKIP_SCREENSHOTS !== '1') for (const [width, variant] of [[1440, 'desktop'], [390, 'mobile']]) {
      mkdirSync(`${folder}/all/${variant}`, { recursive: true });
      await page.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 560 });
      for (const item of [...allBlocks, ...panelBlocks]) {
        const box = await evaluate(`(() => {
          const id = ${JSON.stringify(item.id)};
          const block = id.startsWith('panel-')
            ? document.querySelector('.g2u-panel[data-card="' + id.slice(6) + '"]')
            : id.startsWith('wizard-')
            ? document.querySelector('.g2u-wizard[data-g2w-card-view="' + id.slice(7) + '"]')
            : document.querySelector('[data-g2sb-id="' + id + '"]');
          for (const other of document.querySelectorAll('.g2w-workspace .g2u-block')) other.open = other === block;
          for (let parent = block.parentElement; parent; parent = parent.parentElement)
            if (parent.tagName === 'DETAILS') parent.open = true;
          const section = block.closest('.g2-open-section');
          if (section) {
            section.classList.add('is-open');
            const sectionBody = section.querySelector(':scope > .g2-section-body');
            if (sectionBody) sectionBody.hidden = false;
            const sectionHeader = section.querySelector(':scope > [data-g2-toggle-section]');
            if (sectionHeader) sectionHeader.setAttribute('aria-expanded', 'true');
          }
          block.scrollIntoView({ block: 'start', behavior: 'instant' });
          const rect = block.getBoundingClientRect();
          return { x: Math.max(0, rect.left + scrollX), y: Math.max(0, rect.top + scrollY),
            width: rect.width, height: Math.min(rect.height, 1100), pageWidth: document.documentElement.scrollWidth,
            minTarget: Math.min(...[...block.querySelectorAll('.g2u-step-toggle, .g2u-guide summary, .g2u-related > summary')]
              .map(node => node.getBoundingClientRect().height), 100) };
        })()`);
        assert.ok(box.pageWidth <= width, `${item.id}: horizontal overflow at ${width}px`);
        assert.ok(box.width > 0 && box.height > 0, `${item.id}: hidden block was not revealed`);
        if (width === 390) assert.ok(box.minTarget >= 44, `${item.id}: mobile target below 44px`);
        const shot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
          clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 } });
        writeFileSync(`${folder}/all/${variant}/${item.id}.png`, Buffer.from(shot.data, 'base64'));
      }
    }
    await evaluate(`(() => { document.querySelector('[data-g2sb-id="company-domain"]').open = true; })()`);
    await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  }
  const capture = async (path, width) => {
    await page.call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 560 });
    await new Promise(resolve => setTimeout(resolve, 250));
    const box = await evaluate(`(() => {
      const block = document.querySelector('[data-g2sb-id="company-domain"]');
      block.scrollIntoView({ block: 'start', behavior: 'instant' });
      const r = block.getBoundingClientRect();
      return { x: Math.max(0, r.left + scrollX), y: Math.max(0, r.top + scrollY), width: r.width, height: r.height,
        pageWidth: document.documentElement.scrollWidth, viewport: innerWidth,
        minTargets: [...block.querySelectorAll('.g2u-step-toggle, .g2u-guide summary, .g2u-related > summary, .g2u-segment-options label')].map(n => ({ width: n.getBoundingClientRect().width, height: n.getBoundingClientRect().height })),
        overflowingRows: [...block.querySelectorAll('.redirect-v130-table tr')].filter(n => n.getBoundingClientRect().right > block.getBoundingClientRect().right + 1).length };
    })()`);
    const shot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true,
      clip: { x: box.x, y: box.y, width: box.width, height: box.height, scale: 1 } });
    writeFileSync(path, Buffer.from(shot.data, 'base64'));
    return box;
  };
  const desktop = await capture(`${folder}/domain-desktop.png`, 1440);
  const mobile = await capture(`${folder}/domain-390.png`, 390);
  assert.ok(mobile.pageWidth <= 390, `Horizontal overflow: ${mobile.pageWidth}`);
  assert.ok(mobile.minTargets.every(item => item.height >= 44), 'Some mobile targets are smaller than 44px');
  assert.equal(mobile.overflowingRows, 0);
  const lightStyles = await evaluate(`(() => {
    const block = document.querySelector('[data-g2sb-id="company-domain"]');
    const input = block.querySelector('[data-g2seo-editor="https"] .g1-input');
    return { block: getComputedStyle(block).backgroundColor, input: getComputedStyle(input).backgroundColor,
      disabled: input.disabled };
  })()`);
  await page.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  const darkStyles = await evaluate(`(() => {
    const block = document.querySelector('[data-g2sb-id="company-domain"]');
    return { block: getComputedStyle(block).backgroundColor,
      input: getComputedStyle(block.querySelector('[data-g2seo-editor="https"] .g1-input')).backgroundColor };
  })()`);
  await page.call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
  assert.notEqual(darkStyles.block, lightStyles.block);
  const interactions = await evaluate(`(() => {
    const block = document.querySelector('[data-g2sb-id="company-domain"]');
    const control = block.querySelector('[data-g2sb-step="dns_set"]');
    const before = control.checked;
    control.click();
    const after = control.checked;
    const currentAfter = block.querySelector('.g2u-guide[open]')?.closest('[data-g2sb-step-id]')?.dataset.g2sbStepId;
    const stored = g2ServiceBlockRecord(G2_SERVICE_BLOCK_CONFIGS.get('company-domain'))?.steps?.dns_set?.result;
    control.click();
    const ssl = block.querySelector('input[name="g2u-https-httpsWorks"][value="yes"]');
    const priorSsl = g2SeoStore('company-domain')?.cards?.['card-20']?.sslV130?.httpsWorks || '';
    ssl.click();
    const storedSsl = g2SeoStore('company-domain')?.cards?.['card-20']?.sslV130?.httpsWorks;
    block.querySelector('input[name="g2u-https-httpsWorks"][value="' + priorSsl + '"]')?.click();
    const redirectCode = block.querySelector('[data-g2seo-editor="redirect"] .redirect-v130-table input');
    const originalCode = redirectCode.value;
    redirectCode.value = '404'; redirectCode.dispatchEvent(new Event('input', { bubbles: true }));
    const autoChanged = redirectCode.closest('tr').querySelector('.g2u-derived-result')?.textContent;
    redirectCode.value = originalCode; redirectCode.dispatchEvent(new Event('input', { bubbles: true }));
    return { before, after, currentAfter, stored, restored: control.checked, storedSsl, priorSsl, autoChanged,
      relatedOpenable: (() => { const n = block.querySelector('.g2u-related'); n.open = true; return n.open && n.querySelectorAll('[data-card]').length; })() };
  })()`);
  assert.notEqual(interactions.before, interactions.after);
  assert.equal(interactions.restored, interactions.before);
  assert.equal(interactions.currentAfter, 'open');
  assert.ok(interactions.relatedOpenable >= 1);
  assert.equal(interactions.storedSsl, 'yes');
  assert.equal(interactions.autoChanged, 'Авто: Ошибка');
  const wizardInteractions = process.env.GURU_UNIFIED_ALL === '1' ? await evaluate(`(() => {
    const def = g2wDef('counter');
    const card = document.querySelector('.g2u-wizard[data-g2w-card-view="counter"]');
    card.open = true;
    const toggle = card.querySelector('[data-g2w-step="create"]');
    const before = toggle.checked;
    toggle.click();
    const after = toggle.checked;
    const stored = g2wRecord(def)?.steps?.create?.result;
    const progress = card.querySelector('.g2sb-progress')?.textContent;
    toggle.click();
    const restored = toggle.checked;
    const input = card.querySelector('[data-g2w-field="counterId"]');
    const originalId = input.value;
    const nextId = originalId === '12345678' ? '87654321' : '12345678';
    input.value = nextId;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const storedId = g2wValue(def, '', 'counterId');
    input.value = originalId;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return { before, after, stored, progress, restored, storedId, nextId, restoredId: g2wValue(def, '', 'counterId'), originalId,
      openGuides: [...card.querySelectorAll('.g2u-guide[open]')].map(node => node.closest('[data-g2sb-step-id]')?.dataset.g2sbStepId) };
  })()`) : null;
  if (wizardInteractions) {
    assert.notEqual(wizardInteractions.before, wizardInteractions.after);
    assert.equal(wizardInteractions.restored, wizardInteractions.before);
    assert.equal(wizardInteractions.storedId, wizardInteractions.nextId);
    assert.equal(wizardInteractions.restoredId, wizardInteractions.originalId);
    assert.ok(wizardInteractions.progress.includes('из 5'));
  }
  const panelInteractions = process.env.GURU_UNIFIED_ALL === '1' ? await evaluate(`(() => {
    const quality = state.gates.find(gate => gate.id === 'gate-2').cards.find(card => card.id === 'g2-metrika-goals-traffic');
    const qualityInput = document.querySelector('[data-g2-metrika-card-v360="g2-metrika-goals-traffic"][data-g2-metrika-field-v360="counterId"]');
    const qualityOriginal = qualityInput.value;
    qualityInput.value = '12345678';
    qualityInput.dispatchEvent(new Event('input', { bubbles: true }));
    const qualityStored = g2MetrikaQualityDataV360(quality).counterId;
    qualityInput.value = qualityOriginal;
    qualityInput.dispatchEvent(new Event('input', { bubbles: true }));
    const product = guruV194SelectedProduct(state);
    const productCard = state.gates.find(gate => gate.id === 'gate-2').cards.find(card => card.id === 'g2-metrika-goals-primary');
    const productInput = document.querySelector('[data-g2-mp-card="g2-metrika-goals-primary"][data-g2-mp-field="mainAction"]');
    const productOriginal = productInput.value;
    productInput.value = 'Контрольное действие';
    productInput.dispatchEvent(new Event('input', { bubbles: true }));
    const productStored = g2MetrikaProductRowV367(productCard, product.id)?.mainAction;
    productInput.value = productOriginal;
    productInput.dispatchEvent(new Event('input', { bubbles: true }));
    return { qualityStored, qualityRestored: g2MetrikaQualityDataV360(quality).counterId, qualityOriginal,
      productStored, productRestored: g2MetrikaProductRowV367(productCard, product.id)?.mainAction, productOriginal };
  })()`) : null;
  if (panelInteractions) {
    assert.equal(panelInteractions.qualityStored, '12345678');
    assert.equal(panelInteractions.qualityRestored, panelInteractions.qualityOriginal);
    assert.equal(panelInteractions.productStored, 'Контрольное действие');
    assert.equal(panelInteractions.productRestored, panelInteractions.productOriginal);
  }
  const panelColors = process.env.GURU_UNIFIED_ALL === '1' ? await evaluate(`(() => {
    const block = document.querySelector('.g2u-quality[data-card="g2-metrika-goals-calls"]');
    const textarea = block.querySelector('textarea');
    return { block: getComputedStyle(block).backgroundColor,
      input: getComputedStyle(block.querySelector('input')).backgroundColor,
      textarea: getComputedStyle(textarea).backgroundColor,
      textareaHtml: textarea.outerHTML.slice(0, 350),
      matches: textarea.matches('.g2u-quality .g2-metrika-field-v360 textarea'),
      disabled: textarea.disabled,
      surface: getComputedStyle(block).getPropertyValue('--g2u-surface') };
  })()`) : null;
  if (panelColors) {
    assert.equal(panelColors.input, panelColors.block);
    assert.equal(panelColors.textarea, panelColors.block, JSON.stringify(panelColors));
  }
  const output = { ok: true, initial, allBlocks, panelBlocks, desktop, mobile, lightStyles, darkStyles, interactions, wizardInteractions, panelInteractions, panelColors, errors: page.errors };
  writeFileSync(`${folder}/result.json`, JSON.stringify(output, null, 2));
  assert.deepEqual(page.errors, []);
  console.log(JSON.stringify(output));
} finally {
  page?.close();
  if (browserContextId) await browser.call('Target.disposeBrowserContext', { browserContextId });
  browser.close();
}
