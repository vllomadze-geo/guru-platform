import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:9531/';
const fixturePath = process.env.GURU_NOW_KORICH_FIXTURE || '/private/tmp/guru-now-korich-workspace.json';
const fixtureBytes = readFileSync(fixturePath);
const sourceHash = createHash('sha256').update(fixtureBytes).digest('hex');
const fixture = JSON.parse(fixtureBytes);
const output = process.env.GURU_LEGAL_ARTIFACTS || '/private/tmp/guru-legal-copy-artifacts';
mkdirSync(output, { recursive: true });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
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
  const image = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${output}/${name}.png`, Buffer.from(image.data, 'base64'));
};


const report={sourceSha256:sourceHash};
async function load(url){
 await page.call('Page.navigate',{url});await waitFor('document.readyState==="complete"&&typeof nowGuideBuildPath==="function"');
 await evaluate(`(()=>{rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
 state=${JSON.stringify(fixture.workspace||fixture)};activeProjectId=state.project.id;
 guruExportWithoutPersistenceV223(()=>{state=migrateWorkspace(state,activeProjectId)});
 projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];updateProjectChrome();
 els.launcher.hidden=true;els.appShell.hidden=false;
 guruExportWithoutPersistenceV223(()=>{activeView='project';render()});guruCancelDerivedRefresh();guruDiscardUiPreferenceSave(activeProjectId);
 window.__card=state.gates.find(g=>g.id==='gate-0').cards.find(isMegaMarketingCard);
 window.__measure=()=>nowGuideWithReadPass(()=>{const gate=state.gates.find(g=>g.id==='gate-0'),path=nowGuideBuildPath(),current=nowGuideCurrent(path),p=__card.megaMarketing.platformV2;return{answers:MEGA_PLATFORM_LEGAL_QUESTIONS.map(q=>({key:q.key,present:Object.hasOwn(p,q.key),value:p[q.key]??null})),readiness:guruGateReadiness(gate),step:path.indexOf(current)+1,M:path.length,current:current?.key,statuses:path.filter(i=>i.gateId==='gate-0').map(i=>({id:i.id,status:i.status}))}});
 window.__baseState=JSON.stringify(state);window.__observed=__measure();
 const path=nowGuideDisplayedPath;nowGuideSelect(path.find(i=>i.gateId==='gate-0'&&i.id===__card.id),path);return true})()`);
 await waitFor(`document.querySelector('[data-mega-legal-block]')&&document.querySelector('details.gate0-card[data-card-row="card-7"]')?.open`);
 return await evaluate(`(()=>{window.__block=document.querySelector('[data-mega-legal-block]');const baseline=__observed;
 const p=__card.megaMarketing.platformV2,had=Object.hasOwn(p,'siteCheckoutV1'),old=p.siteCheckoutV1;
 const states=[true,false].map(value=>{p.siteCheckoutV1=value;guruGateReadinessCache=new Map();return __measure()});
 if(had)p.siteCheckoutV1=old;else delete p.siteCheckoutV1;guruGateReadinessCache=new Map();
 return{baseline,states,afterRenderUnchanged:__baseState===JSON.stringify(state),build:GURU_BUILD_INFO.version}})()`);
}
try{
 await page.call('Page.enable');await page.call('Runtime.enable');await page.call('Page.bringToFront');
 await page.call('Emulation.setDeviceMetricsOverride',{width:1920,height:1100,deviceScaleFactor:1,mobile:false});
 await page.call('Page.addScriptToEvaluateOnNewDocument',{source:`const nativeFetch=window.fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}),{status:200,headers:{'Content-Type':'application/json'}})):nativeFetch(u,i);const memory=new Map();Storage.prototype.getItem=function(k){return memory.get(String(k))??null};Storage.prototype.setItem=function(k,v){memory.set(String(k),String(v))};Storage.prototype.removeItem=function(k){memory.delete(String(k))};Storage.prototype.clear=function(){memory.clear()};`});
 report.before=await load('http://127.0.0.1:9532/');
 report.after=await load(appUrl);
 assert.deepEqual(report.after.baseline,report.before.baseline,'STOP: default answers, readiness or guide changed');
 assert.deepEqual(report.after.states,report.before.states,'STOP: saved yes/no behavior changed');
 assert(report.before.afterRenderUnchanged&&report.after.afterRenderUnchanged,'STOP: rendering wrote data');
 await evaluate(`__block.scrollIntoView({block:'center',behavior:'instant'})`);await delay(300);await screenshot('01-collapsed');
 report.copy=await evaluate(`(()=>{const second=__block.querySelector('[data-mega-legal-answer="siteCheckoutV1"]').closest('.mega-platform-legal-question');return{question:second.querySelector('.mega-platform-legal-question-copy span').textContent,hint:second.querySelector('small').textContent,help:['offer','returns'].map(id=>__block.querySelector('[data-mega-legal-row="'+id+'"] .mega-platform-legal-explanation').childNodes[0].textContent.trim())}})()`);
 assert.equal(report.copy.question,'Заказ оформляется на сайте?');assert.equal(report.copy.hint,'Заказ через сайт: корзина, форма заказа, заявка на покупку. Оплата на сайте не обязательна.');assert.deepEqual(report.copy.help,['Нужна, если заказ оформляется на сайте','Нужна, если заказ оформляется на сайте']);
 report.helpReadOnly=await evaluate(`(()=>{const before=JSON.stringify(state);__block.querySelector('[data-mega-legal-row="offer"] [data-mega-legal-help]').click();return before===JSON.stringify(state)})()`);assert(report.helpReadOnly);await screenshot('02-expanded');
 await evaluate(`__block.querySelector('[data-mega-legal-row="offer"] [data-mega-legal-help]').click()`);
 for(const value of [true,false]){
  const selected=await evaluate(`(()=>{__card.megaMarketing.platformV2.siteCheckoutV1=${value};megaPlatformRefreshLegal(__card);return __block.querySelector('[data-mega-legal-answer="siteCheckoutV1"][data-mega-legal-value="${value}"]').getAttribute('aria-pressed')==='true'})()`);assert(selected);
  await screenshot(value?'03-yes':'04-no');
 }
 assert.equal(createHash('sha256').update(readFileSync(fixturePath)).digest('hex'),sourceHash);assert.deepEqual(page.errors,[]);
 report.passed=true;writeFileSync(`${output}/results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.call('Target.disposeBrowserContext',{browserContextId});page.close();browser.close();}
