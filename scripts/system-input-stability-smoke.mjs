import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const port = 9535;
const appUrl = 'http://127.0.0.1:9531/';
const fixturePath = process.env.GURU_INPUT_FIXTURE || '/private/tmp/guru-competitor-recovery-original.json';
const sourceBytes = readFileSync(fixturePath);
const sourceHash = createHash('sha256').update(sourceBytes).digest('hex');
const source = JSON.parse(sourceBytes);
const workspace = source.workspace || source.content || source;
class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data), task = this.pending.get(message.id);
      if (!task) return;
      this.pending.delete(message.id); clearTimeout(task.timer);
      message.error ? task.reject(Error(message.error.message)) : task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => reject(Error(`CDP timeout: ${method}`)), 120000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}
const browserVersion = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(browserVersion.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
let page;
try {
  const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
  const evaluate = async expression => {
    const result = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  await page.call('Runtime.enable'); await page.call('Page.enable');
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `{
    const store=new Map();Storage.prototype.getItem=function(k){return store.get(String(k))??null};
    Storage.prototype.setItem=function(k,v){store.set(String(k),String(v))};
    const originalFetch=window.fetch.bind(window);
    window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}),{status:200,headers:{'Content-Type':'application/json'}})):originalFetch(u,i);
  }` });
  await page.call('Page.navigate', { url: appUrl });
  for (let i=0; i<300; i++) {
    if (await evaluate('document.readyState==="complete" && typeof g1CompanyComparisonEntry==="function"')) break;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  const setup = await evaluate(`(() => {
    rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();
    scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
    state=${JSON.stringify(workspace)};activeProjectId=state.project.id;
    state=guruExportWithoutPersistenceV223(()=>migrateWorkspace(state,activeProjectId));
    projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];
    activeView='gate';activeGateId='gate-1';
    els.launcher.hidden=true;els.appShell.hidden=false;updateProjectChrome();
    const sample=(label,fn)=>{const t=performance.now();const value=fn();return {label,ms:+(performance.now()-t).toFixed(1),value}};
    const measures=[];
    measures.push(sample('json',()=>JSON.stringify(state).length));
    measures.push(sample('guideVersion',()=>nowGuideDataVersion().length));
    const base=state.projectComparison.competitors[0];
    for(let index=state.projectComparison.competitors.length;index<119;index++){
      const competitor=structuredClone(base);
      competitor.id='diagnostic-competitor-'+index;
      competitor.name='Диагностический конкурент '+index;
      competitor.domain='diagnostic-'+index+'.invalid';
      competitor.siteDomainV538=competitor.domain;
      state.projectComparison.competitors.push(competitor);
    }
    const html=sample('companyHtml119',()=>projectComparisonHtml());
    measures.push({label:html.label,ms:html.ms,value:html.value.length});
    const host=document.createElement('div');host.innerHTML=html.value;
    measures.push(sample('companyVisibleColumns119',()=>{els.contentArea.append(host);return host.querySelectorAll('[data-g1bp-company-column]').length}));
    const section=host.querySelector('[data-g1bp-company]');
    measures.push(sample('companySuggestionRefresh119',()=>{g1CompanyComparisonSuggestionRefresh(section,state.projectComparison,g1CompanyComparisonGroups()[0]);return true}));
    const form=host.querySelector('[data-company-competitor-form]');
    form.hidden=false;
    const finding=g1BergenFindV543;
    let foundCalls=0;
    g1BergenFindV543=function(...args){foundCalls++;return finding.apply(this,args)};
    window.__pendingSave=guruQueueWorkspaceSave();
    window.__saveSnapshot=JSON.stringify(state);
    const guideVersionBefore=nowGuideDataVersion();
    const domain=form.elements.domain;
    domain.focus();domain.value='draft-only.invalid';
    const draftInput=sample('draftInput119',()=>{domain.dispatchEvent(new Event('input',{bubbles:true}));return true});
    g1BergenFindV543=finding;
    const unchanged=JSON.stringify(state)===window.__saveSnapshot;
    const guideVersionUnchanged=nowGuideDataVersion()===guideVersionBefore;
    const queuedGuide=!!nowGuideGate1RefreshTask;
    const draftFocused=document.activeElement===domain;
    // Company comparison now uses a grid. Exercise the still-used product
    // comparison table grouping with an isolated header-control fixture.
    const guideProbe=document.createElement('table');
    guideProbe.className='g1bp-table-v543';
    guideProbe.innerHTML='<thead><tr><th>Наш продукт</th><th><div class="g1bp-head-actions-v543"><strong>Проверочный конкурент</strong><button>Удалить</button></div><small>Тип: конкурент</small></th></tr></thead><tbody><tr><td></td><td data-diagnostic-missing="0"><input></td></tr><tr><td></td><td data-diagnostic-missing="1"><input></td></tr></tbody>';
    els.contentArea.append(guideProbe);
    const cells=[...guideProbe.querySelectorAll('[data-diagnostic-missing]')];
    const missing=nowGuideGroupMissing(cells.map((_,index)=>({selector:
      '[data-diagnostic-missing="'+index+'"]',label:'Заполните поле'})));
    const missingLabel=missing[0]?.label || '';
    const competitorHeading=guideProbe.querySelector('thead tr th:nth-child(2) .g1bp-head-actions-v543 strong')?.textContent.trim();
    guideProbe.remove();
    host.remove();
    measures.push(draftInput);
    return {project:state.project.name,companies:state.projectComparison.competitors.length,
      bytes:window.__saveSnapshot.length,measures,draft:{unchanged,guideVersionUnchanged,foundCalls,queuedGuide,draftFocused},missingLabel,competitorHeading};
  })()`);
  assert.equal(setup.companies,119);
  assert(setup.measures.find(row=>row.label==='guideVersion').ms<20,'Guide version still scans the workspace');
  assert.deepEqual(setup.draft,{unchanged:true,guideVersionUnchanged:true,foundCalls:0,queuedGuide:false,draftFocused:true});
  assert(setup.missingLabel.startsWith(setup.competitorHeading+':') && !/Удалить|Тип:|Ссылка на сайт/.test(setup.missingLabel),
    'Guide summary includes competitor header controls');
  const save=await evaluate(`window.__pendingSave.then(ok=>({ok,
    stored:localStorage.getItem(WORKSPACE_STORAGE_PREFIX+activeProjectId)===window.__saveSnapshot,
    pending:guruWorkspaceSaveJobs.size}))`);
  assert.deepEqual(save,{ok:true,stored:true,pending:0},'Draft input cancelled a real pending save');
  assert.equal(createHash('sha256').update(readFileSync(fixturePath)).digest('hex'),sourceHash);
  const report={...setup,save,sourceUnchanged:true,passed:true};
  mkdirSync('artifacts/input-lag',{recursive:true});
  writeFileSync('artifacts/input-lag/system-input-stability-results.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  console.log('system-input-stability-smoke: PASS');
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId }); page?.close(); browser.close();
}
