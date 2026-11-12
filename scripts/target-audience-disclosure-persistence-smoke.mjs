import assert from 'node:assert/strict';

const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:3000/';
const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      const task = this.pending.get(message.id);
      if (!task) return;
      this.pending.delete(message.id);
      clearTimeout(task.timer);
      message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 30000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const browserInfo = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(browserInfo.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(tabs.find((tab) => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async (expression) => {
  const result = await page.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression) => {
  for (let i = 0; i < 200; i++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await sleep(100);
  }
  throw new Error(`Timed out: ${expression}`);
};

try {
  await page.call('Page.enable');
  await page.call('Runtime.enable');
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `{
    const originalFetch = window.fetch.bind(window);
    window.fetch = (url, options) => String(url).includes('/api/')
      ? Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}),
        {status:200,headers:{'Content-Type':'application/json'}}))
      : originalFetch(url, options);
  }` });
  await page.call('Page.navigate', { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof guruAudienceSetOpenV1 === "function"');
  const projectId = await evaluate(`(() => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    const meta = {id:'audience-disclosure-smoke',name:'Audience disclosure smoke',
      lifecycleStatus:'active',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    projects = [meta];
    const workspace = createFreshWorkspace(meta);
    workspace.targetAudience = {version:2,open:false,autoSeedDismissed:true,segments:[
      targetAudienceBlankSegment({id:'segment-one',name:'Первый',problem:'Причина один; Причина два'}),
      targetAudienceBlankSegment({id:'segment-two',name:'Второй',criteria:'Цена; Срок; Качество; Дизайн'}),
    ]};
    localStorage.setItem('guru-platform-projects-v02',JSON.stringify([meta]));
    localStorage.setItem(WORKSPACE_STORAGE_PREFIX+meta.id,JSON.stringify(workspace));
    openProject(meta.id); guruNavigateToGate('gate-1');
    return meta.id;
  })()`);
  await waitFor('activeGateId === "gate-1" && !!document.querySelector("[data-audience-toggle]")');
  const initial = await evaluate(`(() => {
    const top = document.querySelector('[data-audience-toggle]');
    const initialClosed = top.getAttribute('aria-expanded') === 'false';
    top.click();
    document.querySelector('[data-audience-row="problem"] [data-audience-expand]').click();
    const firstExpanded = !!document.querySelector('[data-audience-row="problem"] .target-audience-detail');
    document.querySelector('[data-audience-row="problem"] [data-audience-expand]').click();
    const firstClosed = !document.querySelector('[data-audience-row="problem"] .target-audience-detail');
    document.querySelector('[data-audience-tab="segment-two"]').click();
    document.querySelector('[data-audience-row="criteria"] [data-audience-expand]').click();
    const secondExpanded = !!document.querySelector('[data-audience-row="criteria"] .target-audience-detail');
    top.click();
    const saved = state.ui.disclosureOpenV512;
    const generic = document.createElement('details');
    generic.dataset.uiKeeperKey = 'audience-persistence-generic';
    generic.innerHTML = '<summary>Проверка</summary><p>Содержимое</p>';
    els.contentArea.append(generic); guruApplyDisclosureStateV512(generic);
    generic.querySelector('summary').click();
    return {initialClosed,firstExpanded,firstClosed,secondExpanded,topClosed:top.getAttribute('aria-expanded')==='false',
      topSaved:saved['gate-1|target-audience']===false,
      firstSaved:saved['gate-1|target-audience|row|segment-one:problem']===false,
      secondSaved:saved['gate-1|target-audience|row|segment-two:criteria']===true,
      genericKey:generic.dataset.guruDisclosureKeyV512};
  })()`);
  assert(initial.initialClosed && initial.firstExpanded && initial.firstClosed && initial.secondExpanded &&
    initial.topClosed && initial.topSaved && initial.firstSaved && initial.secondSaved);
  await sleep(500);
  const navigation = await evaluate(`(() => {
    guruNavigateToGate('gate-0');
    return true;
  })()`);
  assert(navigation);
  await waitFor('activeGateId === "gate-0" && guruRenderedGateId === "gate-0"');
  await evaluate("guruNavigateToGate('gate-1')");
  await waitFor('activeGateId === "gate-1" && guruRenderedGateId === "gate-1" && !!document.querySelector("[data-audience-toggle]")');
  const returned = await evaluate(`(() => {
    const top = document.querySelector('[data-audience-toggle]');
    const closed = top.getAttribute('aria-expanded')==='false' &&
      document.querySelector('.target-audience-body').hidden;
    top.click();
    document.querySelector('[data-audience-tab="segment-one"]').click();
    const firstClosed = !document.querySelector('[data-audience-row="problem"] .target-audience-detail');
    document.querySelector('[data-audience-tab="segment-two"]').click();
    const second = !!document.querySelector('[data-audience-row="criteria"] .target-audience-detail');
    top.click();
    return {closed,firstClosed,second};
  })()`);
  assert(returned.closed && returned.firstClosed && returned.second);
  await sleep(500);
  const stored = await evaluate(`(() => {
    const saved=JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX+activeProjectId));
    const open=saved.ui?.disclosureOpenV512||{};
    return {top:open['gate-1|target-audience'],
      first:open['gate-1|target-audience|row|segment-one:problem'],
      second:open['gate-1|target-audience|row|segment-two:criteria'],
      generic:open[${JSON.stringify(initial.genericKey)}]};
  })()`);
  assert.deepEqual(stored,{top:false,first:false,second:true,generic:true});
  await page.call('Page.reload', { ignoreCache: true });
  await waitFor('document.readyState === "complete" && performance.getEntriesByType("navigation")[0]?.type === "reload" && typeof openProject === "function" && typeof rememberAccessUnlocked === "function"');
  await evaluate(`(() => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    scheduleCloudSync=()=>{}; scheduleProjectsCloudSync=()=>{};
    openProject(${JSON.stringify(projectId)}); guruNavigateToGate('gate-1');
  })()`);
  await waitFor('activeGateId === "gate-1" && guruRenderedGateId === "gate-1" && !!document.querySelector("[data-audience-toggle]")');
  const reloaded = await evaluate(`(() => {
    const top=document.querySelector('[data-audience-toggle]');
    const closed=top.getAttribute('aria-expanded')==='false' &&
      document.querySelector('.target-audience-body').hidden;
    top.click();
    document.querySelector('[data-audience-tab="segment-one"]').click();
    const firstClosed=!document.querySelector('[data-audience-row="problem"] .target-audience-detail');
    document.querySelector('[data-audience-tab="segment-two"]').click();
    const second=!!document.querySelector('[data-audience-row="criteria"] .target-audience-detail');
    const generic=document.createElement('details');
    generic.dataset.uiKeeperKey='audience-persistence-generic';
    generic.innerHTML='<summary>Проверка</summary><p>Содержимое</p>';
    els.contentArea.append(generic); guruApplyDisclosureStateV512(generic);
    return {closed,firstClosed,second,generic:generic.open};
  })()`);
  assert.deepEqual(reloaded,{closed:true,firstClosed:true,second:true,generic:true});
  console.log(JSON.stringify({initial,returned,stored,reloaded},null,2));
  console.log('Audience disclosure persistence: PASS');
} finally {
  await browser.call('Target.disposeBrowserContext',{browserContextId});
  page.close(); browser.close();
}
