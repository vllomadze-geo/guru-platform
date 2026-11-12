import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:9531/';
const fixturePath = process.env.GURU_NOW_KORICH_FIXTURE || '/private/tmp/guru-now-korich-workspace.json';
const fixtureBytes = readFileSync(fixturePath);
const sourceHash = createHash('sha256').update(fixtureBytes).digest('hex');
const fixture = JSON.parse(fixtureBytes);
const output = process.env.GURU_LEGAL_ARTIFACTS || 'artifacts/legal-structure';
const uiOnly = process.env.GURU_LEGAL_UI_ONLY === '1';
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
  // Gate navigation restores its own scroll anchor after lazy rendering.
  // Capture only after explicitly positioning the legal section in the viewport.
  await delay(150);
  await evaluate(`document.querySelector('[data-mega-legal-block]')?.scrollIntoView({block:'center',behavior:'instant'})`);
  await evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
  const visible=await evaluate(`(()=>{const r=document.querySelector('[data-mega-legal-block]').getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight})()`);
  assert(visible,'Legal block must be visible in the screenshot');
  const image = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${output}/${name}.png`, Buffer.from(image.data, 'base64'));
};


const report={sourceSha256:sourceHash};
async function load(url){
 console.log(`Loading fixture: ${url}`);
 await page.call('Page.navigate',{url});await waitFor('document.readyState==="complete"&&typeof nowGuideBuildPath==="function"');
 return await evaluate(`(()=>{rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
 state=${JSON.stringify(fixture.workspace||fixture)};activeProjectId=state.project.id;
 guruExportWithoutPersistenceV223(()=>{state=migrateWorkspace(state,activeProjectId)});
 projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;
 window.__card=state.gates.find(g=>g.id==='gate-0').cards.find(isMegaMarketingCard);ensureMegaMarketing(__card,state);guruCancelDerivedRefresh();guruDiscardUiPreferenceSave(activeProjectId);

 window.__measure=()=>{const gate=state.gates.find(g=>g.id==='gate-0'),cards=nowGuideGate0Cards(gate);const statuses=cards.map(card=>guruGate0BlockReadiness(card,state).status);const path=nowGuideBuildPath(),current=nowGuideCurrent(path);return{answers:MEGA_PLATFORM_LEGAL_QUESTIONS.map(q=>({key:q.key,present:Object.hasOwn(__card.megaMarketing.platformV2,q.key),value:__card.megaMarketing.platformV2[q.key]??null})),readiness:guruReadinessFromStatuses(statuses),step:path.indexOf(current)+1,M:path.length,current:current?.key,rows:cards.map((c,i)=>({id:c.id,status:statuses[i]})),missing:nowGuideGate0Inspect(__card).missing.filter(m=>m.selector?.includes('mega-url-id="delivery"')).map(m=>m.label)}};
 const p=__card.megaMarketing.platformV2,keys=['collectsPersonalDataV1','siteCheckoutV1'],old=keys.map(key=>({key,present:Object.hasOwn(p,key),value:p[key]}));
 const baseline=__measure();
 const cases=${uiOnly ? "[]" : "[true,false]"}.flatMap(personal=>[true,false].map(order=>{p.collectsPersonalDataV1=personal;p.siteCheckoutV1=order;guruGateReadinessCache=new Map();return{personal,order,...__measure()}}));
 old.forEach(item=>{if(item.present)p[item.key]=item.value;else delete p[item.key]});guruGateReadinessCache=new Map();
 return{baseline,cases,build:GURU_BUILD_INFO.version}})()`);
}
try{
 await page.call('Page.enable');await page.call('Runtime.enable');await page.call('Page.bringToFront');await page.call('Emulation.setDeviceMetricsOverride',{width:1920,height:1100,deviceScaleFactor:1,mobile:false});
 await page.call('Page.addScriptToEvaluateOnNewDocument',{source:`const nativeFetch=window.fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}),{status:200,headers:{'Content-Type':'application/json'}})):nativeFetch(u,i);const memory=new Map();Storage.prototype.getItem=function(k){return memory.get(String(k))??null};Storage.prototype.setItem=function(k,v){memory.set(String(k),String(v))};Storage.prototype.removeItem=function(k){memory.delete(String(k))};Storage.prototype.clear=function(){memory.clear()};`});
 if(!uiOnly) report.before=await load(process.env.GURU_BEFORE_URL||'http://127.0.0.1:9532/');report.after=await load(appUrl);
 writeFileSync(`${output}/comparison.json`,JSON.stringify(report,null,2));
 function compare(a,b,order){
  assert.deepEqual(a.answers,b.answers,'Saved answers changed');assert.equal(a.M,b.M,'Path size changed');
  const changed=b.rows.filter((row,i)=>row.status!==a.rows[i].status);assert(changed.every(row=>row.id==='card-7')&&(!changed.length||order===false),'Unexpected status change');
  if(!changed.length){assert.deepEqual(a.readiness,b.readiness);assert.equal(a.step,b.step);assert.equal(a.current,b.current)}
  assert.equal(b.missing.length,order===false?0:a.missing.length,'Delivery was not conditionally excluded');
  return changed.length?'Доставка исключена при ответе Нет, остальные требования блока заполнены.':'Процент и шаг совпадают; остальные пустоты сохраняют статус блока.';
 }
 if(!uiOnly) {
 report.comparison=[{state:'Исходные ответы',explanation:compare(report.before.baseline,report.after.baseline,report.after.baseline.answers[1].value)}];
 report.after.cases.forEach((after,i)=>report.comparison.push({personal:after.personal,order:after.order,explanation:compare(report.before.cases[i],after,after.order)}));
 console.log("Before/after readiness matched");
 }
 report.pure=await evaluate(`(()=>{
 const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value)}return value};
 const cases=[true,false].flatMap(personal=>[true,false].map(order=>{
  const w=freeze({gates:[{id:'gate-0',cards:[{id:'card-7',megaMarketing:{platformV2:{collectsPersonalDataV1:personal,siteCheckoutV1:order,urlsV1:{fixed:{company_details:'#company',privacy:'#privacy',data_consent:'#consent',offer:'#offer',returns:'#returns',delivery:'#delivery'}}}}}]}]});
  const before=JSON.stringify(w),m=deriveLegalPages(w);return{personal,order,total:m.total,done:m.done,ready:m.ready,unchanged:before===JSON.stringify(w),cookie:m.rows.some(r=>r.id==='cookie_banner')};
 }));
 const before=JSON.stringify(state),html=megaPlatformLegalHtml(__card.id,state),unchanged=before===JSON.stringify(state);return{cases,renderUnchanged:unchanged,html:html.includes('mega-platform-legal-disclosure'),emptyUnchanged:JSON.stringify(deriveLegalPages(freeze({})))===JSON.stringify(deriveLegalPages({}))}})()`);
 for(const c of report.pure.cases){assert(c.unchanged&&c.ready);assert.equal(c.cookie,c.personal);assert.equal(c.total,2+(c.personal?1:0)+(c.order?3:0));assert.equal(c.done,c.total)}assert(report.pure.renderUnchanged&&report.pure.html&&report.pure.emptyUnchanged);
 await evaluate(`(()=>{const path=nowGuideBuildPath();nowGuideSelect(path.find(i=>i.gateId==='gate-0'&&i.id===__card.id),path)})()`);
 await waitFor(`document.querySelector('[data-mega-legal-block]')&&document.querySelector('details.gate0-card[data-card-row="card-7"]')?.open`);
 await evaluate(`window.__block=document.querySelector('[data-mega-legal-block]');__block.scrollIntoView({block:'center',behavior:'instant'});guruCancelDerivedRefresh();guruDiscardUiPreferenceSave(activeProjectId)`);await delay(700);
 assert.equal(await evaluate(`__block.querySelector('details').open`),false);await screenshot('01-collapsed');
 report.disclosureReadOnly=await evaluate(`(()=>{const before=JSON.stringify(state);__block.querySelector('summary').click();return before===JSON.stringify(state)})()`);assert(report.disclosureReadOnly);assert(await evaluate(`__block.querySelector('details').open`));await screenshot('02-expanded');
 const originalUrls=await evaluate(`JSON.stringify(__card.megaMarketing.platformV2.urlsV1)`);
 report.ui=[];
 for(const personal of [true,false])for(const order of [true,false]){
  await evaluate(`__block.querySelector('[data-mega-legal-answer="collectsPersonalDataV1"][data-mega-legal-value="${personal}"]').click();__block.querySelector('[data-mega-legal-answer="siteCheckoutV1"][data-mega-legal-value="${order}"]').click()`);await delay(75);
  const ui=await evaluate(`(()=>{const m=deriveLegalPages(state),rows=[...__block.querySelectorAll('[data-mega-legal-row]')];return{total:m.total,done:m.done,ready:m.ready,ids:rows.map(r=>r.dataset.megaLegalRow),staticUnneeded:rows.filter(r=>r.classList.contains('mega-platform-legal-unneeded')).every(r=>r.querySelector('[data-mega-legal-value]').textContent==='Не требуется'&&!r.querySelector('input')),fundamentalEditors:document.querySelectorAll('[data-mega-url-id="delivery"]').length,deliveryEditor:!!__block.querySelector('[data-mega-legal-row="delivery"] input'),cookieText:__block.querySelector('[data-mega-legal-row="cookie_banner"] [data-mega-legal-value]')?.textContent||'',summary:__block.querySelector('.mega-platform-legal-summary').textContent,urls:JSON.stringify(__card.megaMarketing.platformV2.urlsV1)}})()`);
  assert(ui.staticUnneeded);assert.equal(ui.fundamentalEditors,order?1:0);assert.equal(ui.deliveryEditor,order);assert.equal(ui.urls,originalUrls);
  assert.deepEqual(ui.ids,['delivery','company_details','privacy',...(personal?['cookie_banner']:[]),'data_consent','offer','returns']);assert.equal(ui.total,2+(personal?1:0)+(order?3:0));if(personal)assert.equal(ui.cookieText,'Блок «Cookie-баннер» в Gate 1');
  report.ui.push({personal,order,...ui});await evaluate(`__block.scrollIntoView({block:'center',behavior:'instant'})`);await screenshot(`answers-${personal?'yes':'no'}-${order?'yes':'no'}`);
 }
 await evaluate(`__block.querySelector('[data-mega-legal-answer="siteCheckoutV1"][data-mega-legal-value="true"]').click()`);
 report.writes=await evaluate(`(()=>{const input=__block.querySelector('[data-mega-url-id="delivery"]'),before=JSON.stringify(state),original=flashSaving;let saves=0;flashSaving=()=>{saves++};try{input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));const same={saves,unchanged:before===JSON.stringify(state)};input.value='#delivery-changed';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));const changed={saves,url:megaPlatformUrl('fixed','delivery'),sameNode:input===__block.querySelector('[data-mega-url-id="delivery"]')};__block.querySelector('[data-mega-legal-answer="siteCheckoutV1"][data-mega-legal-value="true"]').click();return{same,changed,duplicateAnswerSaves:saves}}finally{flashSaving=original}})()`);
 assert.deepEqual(report.writes.same,{saves:0,unchanged:true});assert.equal(report.writes.changed.saves,1);assert.equal(report.writes.changed.url,'#delivery-changed');assert(report.writes.changed.sameNode);assert.equal(report.writes.duplicateAnswerSaves,1);
 report.auditLinks=[];
 for(const [id,target] of [['delivery','card-28'],['company_details','card-27'],['privacy','card-29'],['cookie_banner','card-35'],['data_consent','card-37'],['offer','card-28'],['returns','card-28']]){
  await evaluate(`(()=>{const path=nowGuideBuildPath();nowGuideSelect(path.find(i=>i.gateId==='gate-0'&&i.id===__card.id),path)})()`);
  await waitFor(`document.querySelector('[data-mega-legal-block]')`);
  await evaluate(`(()=>{const block=document.querySelector('[data-mega-legal-block]');block.querySelector('[data-mega-legal-answer="collectsPersonalDataV1"][data-mega-legal-value="true"]').click();block.querySelector('[data-mega-legal-answer="siteCheckoutV1"][data-mega-legal-value="true"]').click()})()`);
  const destination=await evaluate(`(()=>{const button=document.querySelector('[data-mega-legal-row="${id}"] td:last-child button');const target=button?.dataset.openAuditPage;button?.click();return target})()`);
  assert.equal(destination,target);
  await waitFor(`activeGateId==='gate-1'&&document.querySelector('[data-card="${target}"]')`);
  await delay(200);
  assert(await evaluate(`(()=>{const n=document.querySelector('[data-card="${target}"]');return n.getBoundingClientRect().height>0&&!n.closest('details:not([open])')})()`),`Audit card must be revealed: ${id} -> ${target}`);
  report.auditLinks.push({id,target,opened:true});
 }
 assert.deepEqual(page.errors,[]);assert.equal(createHash('sha256').update(readFileSync(fixturePath)).digest('hex'),sourceHash);report.passed=true;
 writeFileSync(`${output}/results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));console.log('platform-legal-structure-smoke: PASS');
}finally{await browser.call('Target.disposeBrowserContext',{browserContextId});page.close();browser.close();}
