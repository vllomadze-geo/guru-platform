import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:3000/';
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
class Cdp {
  constructor(url) { this.socket=new WebSocket(url); this.id=0; this.tasks=new Map(); this.ready=new Promise(resolve=>this.socket.addEventListener('open',resolve,{once:true})); this.socket.addEventListener('message',event=>{const message=JSON.parse(event.data), task=this.tasks.get(message.id); if(task){this.tasks.delete(message.id); message.error?task.reject(new Error(message.error.message)):task.resolve(message.result);}}); }
  async call(method,params={}) {await this.ready; return new Promise((resolve,reject)=>{const id=++this.id;this.tasks.set(id,{resolve,reject});this.socket.send(JSON.stringify({id,method,params}));});}
  close(){this.socket.close();}
}
const version=await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser=new Cdp(version.webSocketDebuggerUrl);
const {browserContextId}=await browser.call('Target.createBrowserContext');
const {targetId}=await browser.call('Target.createTarget',{url:'about:blank',browserContextId});
const tabs=await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page=new Cdp(tabs.find(tab=>tab.id===targetId).webSocketDebuggerUrl);
const evaluate=async expression=>{const response=await page.call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(response.exceptionDetails)throw new Error(response.exceptionDetails.exception?.description||response.exceptionDetails.text);return response.result.value;};
try {
  await page.call('Runtime.enable'); await page.call('Page.enable');
  await page.call('Page.navigate',{url:appUrl});
  for(let i=0;i<300;i++){if(await evaluate('document.readyState==="complete"&&typeof guruTargetAudienceViewHtml==="function"'))break;await wait(100);}
  await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();true');
  const raw=JSON.parse(readFileSync('/private/tmp/guru-step6-icleaning-workspace.json'));
  const workspace=raw.workspace||raw.content||raw;
  const korichRaw=JSON.parse(readFileSync('/private/tmp/guru-now-korich-workspace.json'));
  const korich=korichRaw.workspace||korichRaw.content||korichRaw;
  const records=korich.project.gate0ScopedValuesV194;
  const offer=records.find(item=>item.field==='company_offer'&&!item.archived_at);
  const segment=records.find(item=>item.id===offer.segment_id);
  assert(offer&&segment);
  const initial=await evaluate(`(()=>{const source=${JSON.stringify(workspace)};activeProjectId=source.project.id;projects=[{id:activeProjectId,name:source.project.name}];state=migrateWorkspace(source,activeProjectId);state.project.gate0ScopedValuesV194.push(${JSON.stringify(segment)},${JSON.stringify(offer)});state.targetAudience.segments[0].gate0SegmentId=${JSON.stringify(segment.id)};activeView='gate';activeGateId='gate-1';guruRenderedGateId='';guruAudienceScreen().open=true;renderGate();saveState();return {saved:!!localStorage.getItem(WORKSPACE_STORAGE_PREFIX+activeProjectId),offerId:${JSON.stringify(offer.id)},segmentId:state.targetAudience.segments[0].id}})()`);
  assert.equal(initial.saved,true,'baseline did not fit real localStorage');
  assert(await evaluate('!!document.querySelector("[data-audience-row=value] [data-audience-source]")'));
  await evaluate('document.querySelector("[data-audience-row=value] [data-audience-source]").click()');
  await evaluate('(()=>{const original=Storage.prototype.setItem;window.alert=()=>{};window.__failOfferWrite=true;Storage.prototype.setItem=function(key,value){if(window.__failOfferWrite&&String(key).startsWith(WORKSPACE_STORAGE_PREFIX)){window.__failOfferWrite=false;throw new DOMException("Тест переполнения","QuotaExceededError")}return original.call(this,key,value)};document.querySelector("[data-audience-offer-draft]").value="Утверждённый тестовый оффер";document.querySelector("[data-audience-offer-approve]").click();return true})()');
  for(let i=0;i<150;i++){if(await evaluate('!document.querySelector("[data-audience-offer-approve]")'))break;await wait(100);}
  assert.equal(await evaluate('!!document.querySelector("[data-audience-offer-approve]")'),false,'editor did not close after IndexedDB fallback');
  const persisted=await evaluate(`(async()=>{const entry=await guruWorkspaceIdbReadV1(activeProjectId);const w=JSON.parse(entry.serialized);const r=w.project.gate0ScopedValuesV194.find(x=>x.id===${JSON.stringify(offer.id)});return {value:r.value,versions:r.offerVersionsV1?.length,reason:r.offerVersionsV1?.at(-1)?.reason,marker:!!localStorage.getItem(WORKSPACE_IDB_MARKER_PREFIX+activeProjectId),foundation:document.querySelector('[data-guru-strategic-foundation-company]')?.textContent.includes(r.value)}})()`);
  assert.equal(persisted.value,'Утверждённый тестовый оффер');assert.equal(persisted.versions,2);assert.equal(persisted.reason,'Уточнено в Целевой аудитории');assert.equal(persisted.foundation,true);
  assert.equal(persisted.marker,true,'IndexedDB project marker missing');
  await evaluate(`(()=>{document.querySelector('[data-audience-row="value"] [data-audience-source]').click();const original=guruWorkspaceIdbWriteV1;let fail=true;guruWorkspaceIdbWriteV1=async(id,raw)=>{if(fail&&raw.includes('Второй утверждённый оффер')){fail=false;throw new Error('Тест отказа IndexedDB')}return original(id,raw)};document.querySelector('[data-audience-offer-draft]').value='Второй утверждённый оффер';document.querySelector('[data-audience-offer-approve]').click();return true})()`);
  for(let i=0;i<150;i++){if(await evaluate('!!document.querySelector("[data-audience-offer-error]:not([hidden])")'))break;await wait(100);}
  assert.equal(await evaluate('!!document.querySelector("[data-audience-offer-error]:not([hidden])")'),true,'storage failure was not shown');
  assert.equal(await evaluate('document.querySelector("[data-audience-offer-draft]")?.value'),'Второй утверждённый оффер','failed write discarded the draft');
  assert.equal(await evaluate(`state.project.gate0ScopedValuesV194.find(x=>x.id===${JSON.stringify(offer.id)}).value`),persisted.value,'failed write changed the canonical offer');
  await evaluate('document.querySelector("[data-audience-offer-approve]").click()');
  for(let i=0;i<150;i++){if(await evaluate('!document.querySelector("[data-audience-offer-approve]")'))break;await wait(100);}
  assert.equal(await evaluate('!!document.querySelector("[data-audience-offer-approve]")'),false,'retry did not close the editor');
  await page.call('Page.reload',{ignoreCache:true});
  await wait(1000);
  for(let i=0;i<300;i++){if(await evaluate('document.readyState==="complete"&&typeof guruTargetAudienceViewHtml==="function"&&typeof openProject==="function"'))break;await wait(100);}
  await evaluate(`bootstrapAppOnce();openProject(${JSON.stringify(workspace.project.id)});true`);
  for(let i=0;i<150;i++){if(await evaluate(`typeof state!=='undefined'&&state?.project?.gate0ScopedValuesV194?.some(x=>x.id===${JSON.stringify(offer.id)}&&x.value==='Второй утверждённый оффер')`))break;await wait(100);}
  const restored=await evaluate(`(()=>{const r=state.project.gate0ScopedValuesV194.find(x=>x.id===${JSON.stringify(offer.id)});return {value:r.value,versions:r.offerVersionsV1?.length}})()`);
  assert.equal(restored.value,'Второй утверждённый оффер');assert.equal(restored.versions,3);
  console.log('IndexedDB fallback, failure rollback, retry + reload PASS',persisted);
} finally {await browser.call('Target.disposeBrowserContext',{browserContextId}).catch(()=>{});page.close();browser.close();}
