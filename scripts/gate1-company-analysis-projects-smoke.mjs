import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const port=process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl=process.env.GURU_APP_URL || 'http://127.0.0.1:9531/';
const output='artifacts/company-demand-comparison';mkdirSync(output,{recursive:true});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const hash=s=>createHash('sha256').update(s).digest('hex');
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
      const id = ++this.id, timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 120000);
      this.pending.set(id, { resolve, reject, timer }); this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}
const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
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
const screenshot = async name => {
  await page.call('Page.bringToFront');
  const image = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${output}/${name}.png`, Buffer.from(image.data, 'base64'));
};


const files=process.env.GURU_COMPANY_SMOKE_FILES?.split(',').filter(Boolean)||['/private/tmp/guru-now-korich-workspace.json','/private/tmp/guru-step6-icleaning-workspace.json','/private/tmp/guru-step6-sivrce-workspace.json','/private/tmp/guru-step6-guru-workspace.json'];
const legacy=readFileSync('artifacts/company-demand-comparison/baseline-company-status.js','utf8');
const report=[];
try {
 await page.call('Runtime.enable');await page.call('Page.enable');
 await page.call('Page.addScriptToEvaluateOnNewDocument',{source:`const mem=new Map();Storage.prototype.getItem=function(k){return mem.get(String(k))??null};Storage.prototype.setItem=function(k,v){mem.set(String(k),String(v))};const f=fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}))):f(u,i);`});
 await page.call('Page.navigate',{url:appUrl});await waitFor('document.readyState==="complete"&&typeof g1CompanyComparisonEntry==="function"');
 await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};true');
 for(const file of files){
  const bytes=readFileSync(file),raw=JSON.parse(bytes),source=raw.workspace||raw.content||raw;
  await evaluate(`(()=>{guruCancelDerivedRefresh();activeProjectId=${JSON.stringify(source.project.id)};state=guruExportWithoutPersistenceV223(()=>migrateWorkspace(${JSON.stringify(source)},${JSON.stringify(source.project.id)}));activeView='gate';activeGateId='gate-1';nowGuideRegistryCache=null;return true})()`);
  await evaluate('window.__legacyComparisonStatus='+legacy.replace('function projectComparisonStatus','function'));
  const before=hash(await evaluate('JSON.stringify(state)'));
  const pure=await evaluate(`(()=>{const a=projectComparisonHtml(),b=gate1CompanySemanticsHtmlV264(),c=projectComparisonStatus();const exported=guruExportGate1CompanyComparisonV359(state);return {hasComparison:a.includes('data-g1bp-company'),hasAdd:b.includes('data-company-demand-add-form'),chipCorrect:c.total? a.includes('data-status-block="project-comparison"'):!a.includes('data-status-block="project-comparison"'),status:c,exportStatus:exported.currentComparison.readiness}})()`);
  const after=hash(await evaluate('JSON.stringify(state)'));
  assert.equal(after,before,'Viewing company changed '+source.project.name);assert.deepEqual(pure.status,pure.exportStatus);assert(pure.hasAdd&&pure.hasComparison&&pure.chipCorrect);
  const readiness=await evaluate(`nowGuideWithReadPass(()=>{const all=nowGuideBuildAllBlocks();const current=projectComparisonStatus();const old=__legacyComparisonStatus(state.projectComparison);const entry=g1CompanyComparisonEntry(false),groups=g1CompanyComparisonGroups();const analyzed=entry.competitors.filter(c=>g1BergenAnalyzedCompetitorV543(c,groups));const fieldCounterBeforeCleanup={filled:analyzed.reduce((sum,c)=>sum+G1_BERGEN_FIELDS_V543.filter(key=>String(c.bergenV543?.[key]||'').trim()).length,0),total:analyzed.length*G1_BERGEN_FIELDS_V543.length};const previous=all.map(i=>i.gateId==='gate-1'&&i.id==='project-comparison'?{...i,status:old.status}:i);if(!previous.some(i=>i.gateId==='gate-1'&&i.id==='project-comparison'))previous.push({id:'project-comparison',title:'Сравнение проекта',kind:'comparison',gateId:'gate-1',key:'gate-1:comparison::project-comparison',status:old.status});const stats=list=>nowGuideLaunchReadiness(list);return {oldComparison:old,newComparison:current,fieldCounterBeforeCleanup,gate1Before:stats(previous.filter(i=>i.gateId==='gate-1')),gate1After:stats(all.filter(i=>i.gateId==='gate-1')),launchBefore:stats(nowGuidePreflightPath(previous)),launchAfter:stats(nowGuidePreflightPath(all)),otherGates:all.filter(i=>i.gateId!=='gate-1').map(i=>[i.gateId,i.id,i.status])}})`);
  report.push({project:source.project.name,before,after,fileHash:hash(bytes),fileUnchanged:hash(readFileSync(file))===hash(bytes),...readiness});console.log(source.project.name+': PASS');
 }
 assert.deepEqual(page.errors,[]);
 writeFileSync(output+'/'+(process.env.GURU_COMPANY_SMOKE_REPORT||'four-projects.json'),JSON.stringify({build:await evaluate('GURU_BUILD_INFO.version'),projects:report},null,2));
}finally{await browser.call('Target.disposeBrowserContext',{browserContextId}).catch(()=>{});page.close();browser.close();}
