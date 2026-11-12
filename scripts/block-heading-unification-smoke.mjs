import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:9531/';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const hash = value => createHash('sha256').update(value).digest('hex');
class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
    this.tasks = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      const task = this.tasks.get(message.id);
      if (!task) return;
      this.tasks.delete(message.id);
      message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.tasks.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}
const info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(info.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', {
  url: 'about:blank', browserContextId, width: 1440, height: 1000,
});
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async expression => {
  const response = await page.call('Runtime.evaluate', {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
};
const fixtures = [
  '/private/tmp/guru-now-korich-workspace.json',
  '/private/tmp/guru-step6-icleaning-workspace.json',
  '/private/tmp/guru-step6-sivrce-workspace.json',
  '/private/tmp/guru-step6-guru-workspace.json',
];
try {
  await page.call('Runtime.enable');
  await page.call('Page.enable');
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `
    const mem = new Map();
    Storage.prototype.getItem = function(k) { return mem.get(String(k)) ?? null; };
    Storage.prototype.setItem = function(k, v) { mem.set(String(k), String(v)); };
    const originalFetch = fetch.bind(window);
    window.fetch = (url, init) => String(url).includes('/api/')
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, projects: [], workspaces: [] })))
      : originalFetch(url, init);
  ` });
  await page.call('Page.navigate', { url: appUrl });
  for (let i = 0; i < 300; i++) {
    if (await evaluate('document.readyState === "complete" && typeof guruUnifyPageCardHeadingV527 === "function"')) break;
    await wait(100);
  }
  await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};true');
  for (const file of fixtures) {
    const raw = JSON.parse(readFileSync(file));
    const source = raw.workspace || raw.content || raw;
    await evaluate(`(() => {
      guruCancelDerivedRefresh();
      activeProjectId = ${JSON.stringify(source.project.id)};
      state = guruExportWithoutPersistenceV223(() => migrateWorkspace(${JSON.stringify(source)}, ${JSON.stringify(source.project.id)}));
      activeView = 'gate'; activeGateId = 'gate-1';
      const open = getGate1AccordionState();
      state.gates.find(gate => gate.id === 'gate-1').cards.forEach(card => { open.cards[card.id] = true; });
      renderGate(); return true;
    })()`);
    // Let pre-existing Gate 0/1 compatibility mirrors settle before testing
    // the disclosure, which itself must not touch project records.
    await wait(1000);
    await evaluate('guruCancelDerivedRefresh(); guruDerivedRefreshRequired = false; true');
    const before = hash(await evaluate('JSON.stringify([state.project,state.gates])'));
    const result = await evaluate(`(() => {
      const cards = [...document.querySelectorAll('#contentArea .g1-card[data-card]')];
      const repeated = cards.map(card => {
        const outer = card.querySelector(':scope > .g1-card-header');
        const pages = [...card.querySelectorAll('.page-structure-card')];
        const head = pages.length === 1
          ? [...pages[0].children].find(node => node.classList?.contains('route-card-head'))
          : null;
        const name = head?.querySelector('.page-name-input');
        const title = outer?.querySelector('.g1-card-title')?.textContent;
        if (!title || !name || pages.length !== 1 ||
            guruPageHeadingKeyV527(findCard(card.dataset.card)?.title) !== guruPageHeadingKeyV527(name.value)) return null;
        return { card: card.dataset.card, unified: card.classList.contains('guru-unified-page-card-v527'), outerHidden: outer.hidden,
          status: !!head.querySelector('.status-pill'), usage: !!head.querySelector('[data-gate1-page-field="pageNeeded"]'),
          collapse: !!head.querySelector('[data-guru-unified-page-toggle-v527]'),
          duplicateLabel: [...card.querySelectorAll('.field-row > span')].some(node => node.textContent.trim() === 'Структура страниц'),
          contentHidden: pages[0].querySelector('[data-guru-category-page-content-v495]')?.hidden || false };
      }).filter(Boolean);
      return repeated;
    })()`);
    assert(result.length > 0, `${source.project.name}: no repeated page headings checked`);
    assert(result.every(item => item.unified && item.outerHidden && item.status && item.usage && item.collapse && !item.duplicateLabel && !item.contentHidden),
      `${source.project.name}: one or more page headers were not unified`);
    const target = result.find(item => item.card === 'card-22-hub') || result[0];
    const toggle = await evaluate(`(() => {
      const card = document.querySelector('.g1-card[data-card=${JSON.stringify(target.card)}]');
      const inner = card.querySelector('.guru-unified-page-collapse-v527');
      inner.click();
      const closed = !card.querySelector(':scope > .g1-card-header').hidden && card.querySelector(':scope > .g1-card-body').hidden;
      card.querySelector(':scope > .g1-card-header').click();
      const opened = card.querySelector(':scope > .g1-card-header').hidden && !card.querySelector(':scope > .g1-card-body').hidden;
      return { closed, opened };
    })()`);
    assert(toggle.closed && toggle.opened, `${source.project.name}: card disclosure failed`);
    const after = hash(await evaluate('JSON.stringify([state.project,state.gates])'));
    assert.equal(after, before, `${source.project.name}: display changed project data`);
    const regularToggle = await evaluate(`(() => {
      const button = [...document.querySelectorAll('#contentArea .g1-card-header[data-gate1-toggle-card]')]
        .find(node => !node.closest('.guru-unified-page-card-v527'));
      if (!button) return { checked: false };
      const card = button.closest('.g1-card[data-card]');
      const before = JSON.stringify([state.project, state.gates]);
      const wasOpen = card.classList.contains('is-open');
      button.click();
      const changed = card.classList.contains('is-open') !== wasOpen;
      button.click();
      return { checked: true, changed, restored: card.classList.contains('is-open') === wasOpen,
        sameData: JSON.stringify([state.project, state.gates]) === before };
    })()`);
    assert(!regularToggle.checked || (regularToggle.changed && regularToggle.restored && regularToggle.sameData),
      `${source.project.name}: ordinary Gate 1 disclosure changed project data`);
    await wait(400);
    assert.equal(hash(await evaluate('JSON.stringify([state.project,state.gates])')), before,
      `${source.project.name}: delayed disclosure save changed project data`);
    if (file === fixtures[0]) {
      await evaluate(`(() => {
        getGate1AccordionState().cards[${JSON.stringify(target.card)}] = false;
        renderGate(); return true;
      })()`);
      const closedBefore = hash(await evaluate('JSON.stringify([state.project,state.gates])'));
      const mounted = await evaluate(`(() => {
        const article = document.querySelector('.g1-card[data-card=${JSON.stringify(target.card)}]');
        const outer = article.querySelector(':scope > .g1-card-header');
        const compact = outer.hasAttribute('data-guru-unified-page-toggle-v527') && !article.querySelector(':scope > .g1-card-body');
        outer.click();
        return { compact, open: article.classList.contains('is-open'),
          body: !!article.querySelector(':scope > .g1-card-body:not([hidden])'),
          oneHeader: outer.hidden && !!article.querySelector('.guru-unified-page-collapse-v527') };
      })()`);
      assert(mounted.compact && mounted.open && mounted.body && mounted.oneHeader,
        'opening an initially closed page did not mount the unified header');
      assert.equal(hash(await evaluate('JSON.stringify([state.project,state.gates])')), closedBefore,
        'mounting a closed page changed project data');
      const usage = await evaluate(`(() => {
        const select = document.querySelector('[data-card="card-22-hub"] [data-gate1-page-field="pageNeeded"]');
        const expected = structuredClone([state.project, state.gates]);
        const next = select.value === 'needed' ? 'undecided' : 'needed';
        expected[1].find(gate => gate.id === 'gate-1').cards
          .find(card => card.id === 'card-22-hub').pageRows[0].pageNeeded = next;
        select.value = next;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return JSON.stringify([state.project, state.gates]) === JSON.stringify(expected);
      })()`);
      assert(usage, 'usage selector changed another project field or did not save');
    }
    console.log(`${source.project.name}: PASS (${result.length} headings)`);
  }
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  page.close(); browser.close();
}
