import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:3000/';
const source = process.env.GURU_TEXT_WORKSPACE;
if (!source) throw new Error('GURU_TEXT_WORKSPACE is required');
const workspace = JSON.parse(readFileSync(source, 'utf8'));
const broken = 'Авторские изделия ручной работы: подарки, одежда и вещи для дома, котор��е создаются с вниманием к человеку, поводу и ощущению дома';
const restored = 'Авторские изделия ручной работы: подарки, одежда и вещи для дома, которые создаются с вниманием к человеку, поводу и ощущению дома';
assert(workspace.project.usp.includes(broken));

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const result = JSON.parse(event.data);
      const pending = this.pending.get(result.id);
      if (!pending) return;
      this.pending.delete(result.id);
      if (result.error) pending.reject(new Error(result.error.message));
      else pending.resolve(result.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      this.pending.set(++this.id, { resolve, reject });
      this.socket.send(JSON.stringify({ id: this.id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const browserVersion = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new Cdp(browserVersion.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = new Cdp(targets.find((target) => target.id === targetId).webSocketDebuggerUrl);
const evaluate = async (expression) => {
  const result = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${expression}`);
};

try {
  await page.call('Runtime.enable');
  await page.call('Page.enable');
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (url, options) => String(url).includes('/api/')
      ? Promise.resolve(new Response(JSON.stringify({ok:false,error:'offline_smoke'}),
          {status:200,headers:{'Content-Type':'application/json'}}))
      : nativeFetch(url, options);
  }` });
  await page.call('Page.navigate', { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof guruOpenProjectLoaded === "function"');
  const result = await evaluate(`(async () => {
    const workspace = ${JSON.stringify(workspace)};
    const id = workspace.project.id;
    projects = [{ id, name: workspace.project.name, lifecycleStatus: 'active' }];
    localStorage.setItem('guru-platform-access-v01', 'unlocked');
    const opened = await guruOpenProjectLoaded(id, workspace, ++guruProjectOpenRequestV1);
    if (!opened) throw new Error('Project did not open');
    const product = guruV194Products(state).find((item) => item.name === 'ТЕРМОС в свитере');
    if (!product) throw new Error('Thermos product not found');
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = product.categoryId;
    ui.selectedProductId = product.id;
    activeView = 'gate'; activeGateId = 'gate-1'; renderGate();
    await (guruWorkspaceIdbWrites.get(id) || Promise.resolve());
    const savedEntry = await guruWorkspaceIdbReadV1(id);
    const saved = savedEntry?.serialized ? JSON.parse(savedEntry.serialized)
      : JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + id) || 'null');
    return {
      source: state.project.gate0ScopedValuesV194.find((row) =>
        row.id === 'gate0-value-1787592562068-d0372f')?.value,
      project: state.project.usp,
      shared: state.sharedEvidence.usp,
      gateText: document.getElementById('contentArea')?.innerText || '',
      renderedGate: guruRenderedGateId,
      selectedProduct: guruV194SelectedProduct(state)?.name || '',
      savedUsp: saved?.project?.usp || '',
      hasStorageMarker: Boolean(localStorage.getItem(WORKSPACE_IDB_MARKER_PREFIX + id)),
      backupKeys: Object.keys(localStorage).filter((key) => key.startsWith('guru-platform-text-recovery-v1-')).length,
    };
  })()`);
  assert.equal(result.source, restored);
  assert.equal(result.project, restored);
  assert.equal(result.shared, restored);
  assert.equal(result.savedUsp, restored);
  assert(result.hasStorageMarker, 'recovered project was not committed before rendering');
  console.log(JSON.stringify({ renderedGate: result.renderedGate,
    selectedProduct: result.selectedProduct, gateTextLength: result.gateText.length,
    hasRestored: result.gateText.includes(restored), hasDamaged: result.gateText.includes(broken),
    backupKeys: result.backupKeys }));
  assert(result.gateText.includes(restored), 'restored USP not rendered in Gate 1');
  assert(!result.gateText.includes(broken), 'damaged USP still rendered in Gate 1');
  assert(result.backupKeys > 0, 'original values were not backed up');
  const reopened = await evaluate(`(async () => {
    const id = ${JSON.stringify(workspace.project.id)};
    if (!await openProject(id)) throw new Error('Stored project did not reopen');
    const product = guruV194Products(state).find((item) => item.name === 'ТЕРМОС в свитере');
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = product.categoryId;
    ui.selectedProductId = product.id;
    activeView = 'gate'; activeGateId = 'gate-1'; renderGate();
    return { usp: state.project.usp,
      gateText: document.getElementById('contentArea')?.innerText || '',
      backupKeys: Object.keys(localStorage).filter((key) =>
        key.startsWith('guru-platform-text-recovery-v1-')).length };
  })()`);
  assert.equal(reopened.usp, restored);
  assert(reopened.gateText.includes(restored), 'restored USP vanished after reopening');
  assert(!reopened.gateText.includes(broken), 'damaged USP returned after reopening');
  assert.equal(reopened.backupKeys, result.backupKeys);
  console.log('Browser project load, repair, backup, and Gate 1 rendering: OK');
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  page.close();
  browser.close();
}
