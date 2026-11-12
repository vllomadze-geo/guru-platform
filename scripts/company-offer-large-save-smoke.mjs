import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
    this.tasks = new Map();
    this.ready = new Promise((resolve) => this.socket.addEventListener('open', resolve, { once: true }));
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data), task = this.tasks.get(message.id);
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
const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:3000/';
const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(tabs.find((tab) => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async (expression) => {
  const response = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
};
const raw = JSON.parse(readFileSync('/private/tmp/guru-now-korich-workspace.json'));
const workspace = raw.workspace || raw.content || raw;
try {
  await page.call('Runtime.enable');
  await page.call('Page.enable');
  await page.call('Page.navigate', { url: appUrl });
  for (let i = 0; i < 300; i++) {
    if (await evaluate('document.readyState === "complete" && typeof guruTargetAudienceViewHtml === "function"')) break;
    await wait(100);
  }
  const setup = await evaluate(`(() => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    const source = ${JSON.stringify(workspace)};
    activeProjectId = source.project.id;
    projects = [{ id: activeProjectId, name: source.project.name }];
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    localStorage.setItem(WORKSPACE_STORAGE_PREFIX + activeProjectId,
      JSON.stringify({ project: { id: activeProjectId, name: source.project.name }, gates: [] }));
    state = migrateWorkspace(source, activeProjectId);
    const offer = state.project.gate0ScopedValuesV194.find((item) => item.field === 'company_offer' && !item.archived_at);
    window.__largeOfferBefore = structuredClone(offer);
    const segment = state.targetAudience.segments[0];
    segment.gate0SegmentId = offer.segment_id;
    guruAudienceScreen().activeId = segment.id;
    guruAudienceScreen().open = true;
    activeView = 'gate'; activeGateId = 'gate-1'; guruRenderedGateId = '';
    renderGate();
    window.__largeProjectBefore = JSON.stringify(state.project);
    return { projectId: activeProjectId, offerId: offer.id, original: offer.value,
      beforeSize: JSON.stringify(state).length,
      localBefore: localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId)?.length || 0 };
  })()`);
  assert(setup.beforeSize > 10_000_000, 'fixture is not larger than localStorage');
  assert(setup.localBefore > 0, 'local backup missing before approval');
  await evaluate('document.querySelector("[data-audience-row=value] [data-audience-source]").click()');
  await evaluate('(() => { document.querySelector("[data-audience-offer-draft]").value = "Итоговый оффер после анализа потребностей и выгод"; document.querySelector("[data-audience-offer-approve]").click(); return true })()');
  let approved = false;
  for (let i = 0; i < 300; i++) {
    approved = await evaluate('!document.querySelector("[data-audience-offer-approve]")');
    if (approved) break;
    await wait(100);
  }
  assert(approved, 'approval did not complete for the large workspace');
  const stored = await evaluate(`(async () => {
    const id = ${JSON.stringify(setup.projectId)};
    const entry = await guruWorkspaceIdbReadV1(id);
    const project = JSON.parse(entry.serialized);
    const offer = project.project.gate0ScopedValuesV194.find((item) => item.id === ${JSON.stringify(setup.offerId)});
    const originalIndex = project.project.gate0ScopedValuesV194.findIndex((item) => item.id === ${JSON.stringify(setup.offerId)});
    project.project.gate0ScopedValuesV194[originalIndex] = window.__largeOfferBefore;
    return { value: offer.value, versions: offer.offerVersionsV1?.length,
      marker: Boolean(localStorage.getItem(WORKSPACE_IDB_MARKER_PREFIX + id)),
      legacyRaw: localStorage.getItem(WORKSPACE_STORAGE_PREFIX + id),
      projectSize: entry.serialized.length,
      unrelatedProjectUnchanged: JSON.stringify(project.project) === window.__largeProjectBefore };
  })()`);
  assert.equal(stored.value, 'Итоговый оффер после анализа потребностей и выгод');
  assert(stored.versions >= 2, 'offer history missing');
  assert.equal(stored.marker, true, 'durable-store marker missing');
  assert.equal(stored.legacyRaw, null, 'stale localStorage copy still takes quota');
  assert(stored.projectSize > 10_000_000, 'full project was not preserved');
  assert.equal(stored.unrelatedProjectUnchanged, true, 'unrelated project data changed');
  await page.call('Page.reload', { ignoreCache: true });
  let restored = false;
  for (let i = 0; i < 300; i++) {
    restored = await evaluate(`typeof state !== 'undefined' && (state?.project?.gate0ScopedValuesV194?.some((item) => item.id === ${JSON.stringify(setup.offerId)} && item.value === 'Итоговый оффер после анализа потребностей и выгод') || false)`);
    if (restored) break;
    await wait(100);
  }
  assert(restored, 'approved offer was not restored after reload');
  let after = null;
  for (let i = 0; i < 150; i++) {
    after = await evaluate(`(() => { if (typeof state === 'undefined' || !state?.project?.gate0ScopedValuesV194) return null;
      const offer = state.project.gate0ScopedValuesV194.find((item) => item.id === ${JSON.stringify(setup.offerId)});
      return offer ? { projectId: state.project.id, offer: offer.value,
        history: offer.offerVersionsV1?.length || 0, idbMode: guruWorkspaceIdbMode.has(activeProjectId) } : null;
    })()`);
    if (after?.idbMode) break;
    await wait(100);
  }
  assert(after, 'project was not available after reload');
  assert.equal(after.idbMode, true);
  assert.equal(after.offer, stored.value);
  console.log(JSON.stringify({ project: workspace.project.name, beforeSize: setup.beforeSize,
    projectSize: stored.projectSize, versions: after.history, reloaded: true }));
  console.log('company-offer-large-save-smoke: PASS');
} finally {
  page.close();
  await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  browser.close();
}
