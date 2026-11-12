import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const stage=process.env.GURU_META_STAGE||'after';
const port=process.env.GURU_CHROME_DEBUG_PORT||'9535';
const appUrl=process.env.GURU_APP_URL||'http://127.0.0.1:9531/';
const output=process.env.GURU_META_ARTIFACTS||'artifacts/common-meta';
const sources=process.env.GURU_META_SOURCES?JSON.parse(readFileSync(process.env.GURU_META_SOURCES,'utf8')):[
 {label:'apple',file:'/private/tmp/guru-now-korich-workspace.json'},
 {label:'icleaning',file:'/private/tmp/guru-step6-icleaning-workspace.json'},
 {label:'sivrce',file:'/private/tmp/guru-step6-sivrce-workspace.json'},
 {label:'guru',file:'/private/tmp/guru-step6-guru-workspace.json'}];
const baseline=stage==='after'?JSON.parse(readFileSync(`${output}/before.json`,'utf8')):null;
mkdirSync(output,{recursive:true});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let page;
class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map(); this.errors = [];
    this.ready = new Promise((resolve, reject) => { this.socket.addEventListener('open', resolve, { once: true }); this.socket.addEventListener('error', reject, { once: true }); });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') this.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      const task = this.pending.get(message.id); if (!task) return;
      this.pending.delete(message.id); clearTimeout(task.timer);
      if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id, timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
      this.pending.set(id, { resolve, reject, timer }); this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}
const evaluate = async expression => {
  const result = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async expression => {
  const start = Date.now();
  while (Date.now() - start < 30000) { if (await evaluate(expression)) return; await delay(100); }
  throw new Error(`Timeout: ${expression}`);
};
const version=await(await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser=new Cdp(version.webSocketDebuggerUrl);
const reports=[];
try {
  for(const source of sources){
    const bytes=readFileSync(source.file), sha=createHash('sha256').update(bytes).digest('hex');
    const payload=JSON.parse(bytes),fixture=payload.workspace||payload;
    const records=fixture.project.gate0ScopedValuesV194||[];
    const scopes=Object.fromEntries(['product','category','project'].map(scope=>[scope,records.filter(r=>r.scope===scope).length]));
    const {browserContextId}=await browser.call('Target.createBrowserContext');
    try{
      const {targetId}=await browser.call('Target.createTarget',{url:'about:blank',browserContextId});
      const tabs=await(await fetch(`http://127.0.0.1:${port}/json`)).json();
      page=new Cdp(tabs.find(t=>t.id===targetId).webSocketDebuggerUrl);
      await page.call('Page.enable');await page.call('Runtime.enable');
      await page.call('Emulation.setDeviceMetricsOverride',{width:1800,height:1100,deviceScaleFactor:1,mobile:false});
      await page.call('Page.addScriptToEvaluateOnNewDocument',{source:`const nativeFetch=window.fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}),{status:200,headers:{'Content-Type':'application/json'}})):nativeFetch(u,i);const memory=new Map();Storage.prototype.getItem=function(k){return memory.get(String(k))??null};Storage.prototype.setItem=function(k,v){memory.set(String(k),String(v))};Storage.prototype.removeItem=function(k){memory.delete(String(k))};Storage.prototype.clear=function(){memory.clear()};`});
      await page.call('Page.navigate',{url:appUrl});
      await waitFor('document.readyState==="complete"&&typeof nowGuideBuildPath==="function"');
      const report=await evaluate(`(()=>{
        rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
        state=${JSON.stringify(fixture)};activeProjectId=state.project.id;
        guruExportWithoutPersistenceV223(()=>{state=migrateWorkspace(state,activeProjectId)});
        projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;
        activeView='gate';activeGateId='gate-0';state._gate0Open={...(state._gate0Open||{}),'card-3':true};
        guruExportWithoutPersistenceV223(()=>{renderGate()});guruCancelDerivedRefresh();guruDiscardUiPreferenceSave(activeProjectId);
        nowGuideReviewKey='';nowGuideRegistryCache=null;
        const path=nowGuideBuildPath(),current=nowGuideCurrent(path);
        const gate0= guruReadinessFromStatuses(path.filter(x=>x.gateId==='gate-0').map(x=>x.status));
        const snapshot={gate0,step:current?path.findIndex(x=>x.key===current.key)+1:0,M:path.length,current:current?.id,product_id:state.project.gate0ScopeUiV194?.selectedProductId||'',statuses:path.filter(x=>x.gateId==='gate-0').map(x=>[x.id,x.status])};
        const before=JSON.stringify(state),rowsBefore=JSON.stringify(state.project.gate0ScopedValuesV194),metaBefore=JSON.stringify(state.project.gate0ScopeUiV194?.commonMetaByProduct);
        guruV194FieldsHtml(['jtbd','segments','positioning','usp','offers','keyword_foundation'],'product_segment_client_task',false);
        return {name:state.project.name,build:GURU_BUILD_INFO.version,snapshot,renderReadOnly:before===JSON.stringify(state),recordsUnchanged:rowsBefore===JSON.stringify(state.project.gate0ScopedValuesV194),metaUnchanged:metaBefore===JSON.stringify(state.project.gate0ScopeUiV194?.commonMetaByProduct),panelCount:document.querySelectorAll('.gate0-common-meta-v194').length};
      })()`);
      report.label=source.label;report.source={...source,sha256:sha};report.scopes=scopes;
      report.nonProduct=records.filter(r=>r.scope!=='product').length;
      report.nonProductRecords=records.filter(r=>r.scope!=='product').map(r=>({id:r.id,field:r.field,scope:r.scope,archived:!!r.archived_at}));
      reports.push(report);
      writeFileSync(`${output}/${stage}.json`,JSON.stringify(reports,null,2));
      if(baseline){
        assert.deepEqual(report.snapshot,baseline.find(x=>x.label===source.label).snapshot,'СТОП: изменились процент или шаг для '+report.name);
        assert(report.renderReadOnly&&report.recordsUnchanged&&report.metaUnchanged,'Render wrote project data: '+report.name);
        assert.equal(report.panelCount,0);
        if(source.label==='apple'){
          await delay(500);
          await evaluate(`(()=>{const node=document.querySelector('[data-gate0-scope-field-row="keyword_foundation"]');for(let p=node?.parentElement;p;p=p.parentElement)if(p.matches('details'))p.open=true;node?.scrollIntoView({block:'end',behavior:'instant'})})()`);
          await delay(200);
          const shot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
          writeFileSync(`${output}/without-panel.png`,Buffer.from(shot.data,'base64'));
        }
      }
      assert.deepEqual(page.errors,[]);
      assert.equal(createHash('sha256').update(readFileSync(source.file)).digest('hex'),sha);
      console.log(JSON.stringify({name:report.name,...report.snapshot,readOnly:report.renderReadOnly,scopes}));
    }finally{await browser.call('Target.disposeBrowserContext',{browserContextId});page?.close();}
  }
  console.log(`Common meta ${stage}: PASS`);
}finally{browser.close();}
