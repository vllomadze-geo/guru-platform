import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:9531/';
const fixturePath = process.env.GURU_NOW_KORICH_FIXTURE || '/private/tmp/guru-now-korich-workspace.json';
const fixtureBytes = readFileSync(fixturePath);
const sourceHash = createHash('sha256').update(fixtureBytes).digest('hex');
const fixture = JSON.parse(fixtureBytes);
const output = process.env.GURU_META_CREATION_ARTIFACTS || 'artifacts/common-meta';
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
try{
  await page.call('Page.enable');await page.call('Runtime.enable');
  await page.call('Page.addScriptToEvaluateOnNewDocument',{source:`const nativeFetch=window.fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}),{status:200,headers:{'Content-Type':'application/json'}})):nativeFetch(u,i);const memory=new Map();Storage.prototype.getItem=function(k){return memory.get(String(k))??null};Storage.prototype.setItem=function(k,v){memory.set(String(k),String(v))};Storage.prototype.removeItem=function(k){memory.delete(String(k))};Storage.prototype.clear=function(){memory.clear()};`});
  await page.call('Page.navigate',{url:appUrl});
  await waitFor('document.readyState==="complete"&&typeof guruV194FieldsHtml==="function"');
  const result=await evaluate(`(async()=>{
    rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
    state=${JSON.stringify(fixture.workspace||fixture)};activeProjectId=state.project.id;
    guruExportWithoutPersistenceV223(()=>{state=migrateWorkspace(state,activeProjectId)});
    projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;
    const category=state.project.productRegistryV185[0];
    state.project.catalogItemsV189.push({id:'meta-product-a',name:'Тестовый продукт A',categoryId:category.id,continuum:'pure_product'},{id:'meta-product-b',name:'Тестовый продукт B',categoryId:category.id,continuum:'pure_product'});
    const relations=megaPlatformCategoryStore(state).categoryIdsByProduct;
    relations['meta-product-a']=[category.id];relations['meta-product-b']=[category.id];
    const ui=guruV194Ui(state);ui.selectedCategoryId=category.id;ui.selectedProductId='meta-product-a';
    guruV194Ensure(state);
    // Keep a legacy category setting and metadata which must never seed new rows.
    ui.commonMetaByProduct ||= {};
    ui.commonMetaByProduct['meta-product-a']={scope:'category',source:'Старый источник',confirmation_status:'needs_confirmation'};
    const snapshot=()=>JSON.stringify(state.project.gate0ScopedValuesV194.filter(r=>!['meta-product-a','meta-product-b'].includes(r.product_id)));
    const original=snapshot(),meta=JSON.stringify(ui.commonMetaByProduct['meta-product-a']);
    const render=()=>{els.contentArea.innerHTML='<div class="passport-v116">'+guruV194FieldsHtml(['jtbd','segments','positioning','usp','offers','keyword_foundation'],'product_segment_client_task',false)+'</div>'};
    render();
    const readBefore=JSON.stringify(state);render();const renderReadOnly=readBefore===JSON.stringify(state);
    const created=[];
    for(const field of ['jtbd','segments','offers']){
      const add=document.querySelector('[data-gate0-scope-add="'+field+'"]');
      if(!add||add.dataset.gate0ScopeAddLevel!=='product')throw new Error('Wrong add target: '+field);
      add.click();
      const record=state.project.gate0ScopedValuesV194.find(r=>r.field===field&&r.product_id==='meta-product-a');
      created.push({field,scope:record?.scope,product_id:record?.product_id,source:record?.source,confirmation_status:record?.confirmation_status});
    }
    await new Promise(r=>setTimeout(r,25));
    const offer=state.project.gate0ScopedValuesV194.find(r=>r.field==='offers'&&r.product_id==='meta-product-a');
    const focusCorrect=document.activeElement?.dataset.gate0ScopeRecord===offer.id;
    const oldRecordsUnchanged=original===snapshot();
    const metaUnchanged=meta===JSON.stringify(state.project.gate0ScopeUiV194.commonMetaByProduct['meta-product-a']);
    // A second product with a saved project scope must get its own record too.
    const currentUi=guruV194Ui(state);currentUi.selectedProductId='meta-product-b';currentUi.commonMetaByProduct['meta-product-b']={scope:'project',source:'Другой старый источник',confirmation_status:'draft'};
    render();document.querySelector('[data-gate0-scope-add="offers"]').click();
    const other=state.project.gate0ScopedValuesV194.find(r=>r.field==='offers'&&r.product_id==='meta-product-b');
    // First input in an empty non-repeatable editor also creates a product record.
    const product=guruV194Product('meta-product-b',state);
    els.contentArea.innerHTML='<section data-gate0-scope-field-row="usp">'+guruV194UspRecordHtml({id:'gate0-draft-usp',field:'usp',value:''},product,true)+'</section>';
    const input=document.querySelector('[data-gate0-scope-record-field="usp_client_gets"]');input.value='Новая выгода';input.dispatchEvent(new Event('input',{bubbles:true}));
    const draft=state.project.gate0ScopedValuesV194.find(r=>r.field==='usp'&&r.product_id==='meta-product-b');
    // Exercise the existing source and confirmation actions on a memory copy.
    const goat=guruV194Product('catalog-item-1786792591872-51f503',state);
    guruV194Ui(state).selectedProductId=goat.id;
    guruV194Ui(state).selectedCategoryId=goat.categoryId;
    guruV247KeywordFoundationRecord(goat,true,state).keywords=[];
    els.contentArea.innerHTML=guruV194FieldHtml('keyword_foundation',goat);
    document.querySelector('[data-gate0-keyword-foundation-generate]').click();
    const keywords=()=>guruV247KeywordFoundationRecord(goat,false,state).keywords;
    const generated=structuredClone(keywords());
    document.querySelector('[data-gate0-keyword-foundation-confirm]').click();
    const confirmed=structuredClone(keywords()[0]);
    document.querySelector('[data-gate0-keyword-foundation-add]').click();
    const manual=structuredClone(keywords().at(-1));
    const parsed=guruV248ParseKeywordCsv('ключевая фраза\\nТестовая импортированная фраза');
    guruV248OpenKeywordImportDialog(goat,parsed,'test.csv');
    document.querySelector('[data-gate0-keyword-import-mode="add"]').click();
    const imported=structuredClone(keywords().find(x=>x.value==='Тестовая импортированная фраза'));
    const keywordsBefore=JSON.stringify(keywords());
    const csv=guruV248KeywordFoundationCsv(keywords());
    const roundTrip=guruV248ParseKeywordCsv(csv);
    const badges={generated:!!document.querySelector('.gate0-keyword-source-v247'),confirmed:document.body.innerText.includes('Подтверждено')};
    return {renderReadOnly,created,focusCorrect,oldRecordsUnchanged,metaUnchanged,other:{scope:other.scope,product_id:other.product_id,source:other.source,confirmation_status:other.confirmation_status},draft:{scope:draft.scope,product_id:draft.product_id,source:draft.source,confirmation_status:draft.confirmation_status},keywords:{generatedCount:generated.length,generatedDraft:generated.every(x=>x.source==='generated'&&x.status==='draft'),confirmed:{source:confirmed.source,status:confirmed.status},manual:{source:manual.source,status:manual.status},imported:{source:imported.source,status:imported.status},roundTrip:roundTrip.entries.some(x=>x.source==='generated'&&x.status==='confirmed')&&roundTrip.entries.some(x=>x.source==='imported'&&x.status==='draft'),exportReadOnly:keywordsBefore===JSON.stringify(keywords()),badges},panelCount:document.querySelectorAll('.gate0-common-meta-v194').length,build:GURU_BUILD_INFO.version};
  })()`);
  writeFileSync(`${output}/creation-results.json`,JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
  assert(result.renderReadOnly&&result.oldRecordsUnchanged&&result.metaUnchanged&&result.focusCorrect);
  assert.equal(result.panelCount,0);
  for(const record of [...result.created,result.other,result.draft]){
    assert.equal(record.scope,'product');assert(record.product_id.startsWith('meta-product-'));
    assert.deepEqual(record.source,{type:'manual',label:'Введено вручную'});assert.equal(record.confirmation_status,'confirmed');
  }
  assert.equal(result.other.product_id,'meta-product-b');
  assert.equal(result.draft.product_id,'meta-product-b');
  assert(result.keywords.generatedCount>0&&result.keywords.generatedDraft);
  assert.deepEqual(result.keywords.confirmed,{source:'generated',status:'confirmed'});
  assert.deepEqual(result.keywords.manual,{source:'manual',status:'confirmed'});
  assert.deepEqual(result.keywords.imported,{source:'imported',status:'draft'});
  assert(result.keywords.roundTrip&&result.keywords.exportReadOnly);
  assert(result.keywords.badges.generated&&result.keywords.badges.confirmed);
  assert.deepEqual(page.errors,[]);
  assert.equal(createHash('sha256').update(readFileSync(fixturePath)).digest('hex'),sourceHash);
  console.log('Product creation smoke: PASS');
}finally{await browser.call('Target.disposeBrowserContext',{browserContextId});page.close();browser.close();}
