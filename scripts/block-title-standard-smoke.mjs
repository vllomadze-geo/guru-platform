import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const port = process.env.GURU_CHROME_DEBUG_PORT || '38677';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:38676/';
const source = process.env.GURU_TEXT_WORKSPACE
  ? JSON.parse(readFileSync(process.env.GURU_TEXT_WORKSPACE, 'utf8')) : null;

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
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
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
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate('document.readyState === "complete" && Boolean(window.GuruBlockTitles)')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.equal(await evaluate('Boolean(window.GuruBlockTitles)'), true);
  const examples = await evaluate(`[
    GuruBlockTitles.displayName('Фундамент ключевых слов · Продукт/Услуга', 'product'),
    GuruBlockTitles.displayName('Описание продукта/услуги', 'product'),
    GuruBlockTitles.displayName('Целевая аудитория', 'company'),
    GuruBlockTitles.displayName('Telegram Ads · Telegram Ads', 'product'),
  ]`);
  assert.deepEqual(examples, [
    'Фундамент ключевых слов · Продукт/Услуга',
    'Описание · Продукт/Услуга',
    'Целевая аудитория · Компания',
    'Telegram Ads · Продукт/Услуга',
  ]);
  const styledTitle = await evaluate(`(() => {
    const root = document.createElement('div');
    root.innerHTML = '<span class="g1-card-title"><span data-preserve="yes">Кластер-группа 1</span> Тест</span>';
    const marker = root.querySelector('[data-preserve]');
    GuruBlockTitles.refresh(root);
    return { preserved: root.querySelector('[data-preserve]') === marker,
      title: root.querySelector('.g1-card-title').textContent };
  })()`);
  assert.deepEqual(styledTitle, {
    preserved: true, title: 'Кластер-группа 1 Тест · Компания',
  });
  const guideTitles = await evaluate(`[
    nowGuideDisplayTitle({ gateId: 'gate-1', title: 'Целевая аудитория' }),
    nowGuideDisplayTitle({ gateId: 'gate-3', title: 'Узнал (Aware)' }),
    nowGuideDisplayTitle({ gateId: 'gate-5', title: 'Настройка отчётности' }),
  ]`);
  assert.deepEqual(guideTitles, [
    'Целевая аудитория · Компания',
    'Узнал (Aware) · Продукт/Услуга',
    'Настройка отчётности · Продукт/Услуга',
  ]);
  await evaluate(`(() => {
    const id = 'block-title-smoke';
    projects = [{ id, name: 'Проверка названий', lifecycleStatus: 'active' }];
    activeProjectId = id;
    state = ${source ? `migrateWorkspace(${JSON.stringify(source)}, id)` : 'createFreshWorkspace(projects[0])'};
    state._gate0Open = { ...(state._gate0Open || {}), 'card-2': true };
    const product = guruV194Products(state).find(item => item.name === 'ТЕРМОС в свитере');
    if (product) {
      const ui = guruV194Ui(state);
      ui.selectedCategoryId = product.categoryId;
      ui.selectedProductId = product.id;
    }
    els.launcher.hidden = true;
    els.appShell.hidden = false;
    return true;
  })()`);
  const summary = [];
  for (let gate = 0; gate <= 8; gate += 1) {
    const result = await evaluate(`(() => {
      activeView = 'gate'; activeGateId = 'gate-${gate}'; renderGate();
      const selector = '.gate0-card-title,.guru-strategic-step-title-v529,' +
        '.gate0-scope-field-head-v194 > div > strong,.g1-section-title,' +
        '.g1-card-title,.g2sb-title,.g2w-card-title > strong,' +
        '.g2-check-title > span:first-child,.g4five-map-title-v523,' +
        '.gate5-block-title,.gate6-section-head h3,' +
        '.gate7-section-head b,.g8-section-head h3,' +
        '.g8-workbench-section-head > span:first-child,.g8-model-heading h3,' +
        '.g8-final-questions > header h3';
      const headings = [...els.contentArea.querySelectorAll(selector)]
        .map(node => node.textContent.trim()).filter(Boolean);
      const invalid = headings.filter(text =>
        !text.endsWith(' · Компания') && !text.endsWith(' · Продукт/Услуга'));
      const before = JSON.stringify([state.project, state.gates]);
      const ids = [...els.contentArea.querySelectorAll('[data-card],[data-card-row]')]
        .map(node => node.dataset.card || node.dataset.cardRow);
      const html = JSON.stringify(headings);
      GuruBlockTitles.refresh(els.contentArea);
      return { count: headings.length, invalid, sameData: before === JSON.stringify([state.project, state.gates]),
        sameIds: JSON.stringify(ids) === JSON.stringify([...els.contentArea.querySelectorAll('[data-card],[data-card-row]')]
          .map(node => node.dataset.card || node.dataset.cardRow)),
        guideFound: ${gate} !== 3 || !els.contentArea.querySelector('.g1-card-title') ||
          Boolean(nowGuideFindNode({ gateId: 'gate-3',
            kind: 'heading', title: 'Узнал (Aware)' })?.classList.contains('g1-card-title')),
        idempotent: html === JSON.stringify([...els.contentArea.querySelectorAll(selector)]
          .map(node => node.textContent.trim()).filter(Boolean)) };
    })()`);
    assert.deepEqual(result.invalid, [], `gate-${gate}: headings without one level`);
    if (source || gate <= 4) assert(result.count > 0, `gate-${gate}: no block headings checked`);
    assert(result.sameData && result.sameIds && result.idempotent && result.guideFound,
      `gate-${gate}: display normalization changed data, IDs, or text twice: ${JSON.stringify(result)}`);
    summary.push(result.count);
  }
  const pageCard = await evaluate(`(() => {
    activeGateId = 'gate-1';
    const accordion = getGate1AccordionState();
    accordion.cards['card-22-hub'] = true;
    renderGate();
    const card = els.contentArea.querySelector('[data-card="card-22-hub"]');
    return { unified: card?.classList.contains('guru-unified-page-card-v527') || false,
      title: card?.querySelector('.g1-card-title')?.textContent || '',
      raw: findCard('card-22-hub')?.title || '' };
  })()`);
  assert(pageCard.unified, 'page card disclosure lost its unified heading');
  assert(pageCard.title.endsWith(' · Компания'));
  assert(!pageCard.raw.endsWith(' · Компания'), 'stored card title was renamed');
  const guide = await evaluate(`(() => {
    nowGuideRender();
    const buttons = [...document.querySelectorAll('[data-now-step]')]
      .filter(node => !['gate-6', 'gate-7'].includes(node.closest('[data-now-children]')?.dataset.nowChildren));
    return { count: buttons.length,
      invalid: buttons.map(node => node.title).filter(title =>
        !/ · (Компания|Продукт\\/Услуга)$/.test(title) ||
        (title.match(/ · (?:Компания|Продукт\\/Услуга)/g) || []).length !== 1),
      gate5: document.querySelector('[data-now-children="gate-5"] [data-now-step]')?.title || '',
      gate8: document.querySelector('[data-now-children="gate-8"] [data-now-step]')?.title || '' };
  })()`);
  assert(guide.count > 0 && guide.invalid.length === 0,
    `sidebar contains unstandardized block titles: ${guide.invalid.join(', ')}`);
  if (source) {
    assert(guide.gate5.endsWith(' · Продукт/Услуга'));
    assert(guide.gate8.endsWith(' · Продукт/Услуга'));
  }
  console.log(`Block titles: ${summary.join('/')} across Gate 0–8; data and card IDs unchanged`);
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  page.close();
  browser.close();
}
