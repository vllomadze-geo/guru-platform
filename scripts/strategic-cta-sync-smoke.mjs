import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:3000/';
const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const fixturePath = process.env.GURU_CTA_FIXTURE || '/private/tmp/guru-now-korich-workspace.json';
const source = readFileSync(fixturePath);
const fixture = JSON.parse(source);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      const task = this.pending.get(msg.id);
      if (!task) return;
      this.pending.delete(msg.id);
      clearTimeout(task.timer);
      if (msg.error) task.reject(new Error(msg.error.message));
      else task.resolve(msg.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(method + ' timeout')); }, 30000);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws.close(); }
}
const info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(info.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(tabs.find((tab) => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async (expression) => {
  const result = await page.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
try {
  await page.call('Page.enable');
  await page.call('Runtime.enable');
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `const f=window.fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}),{status:200,headers:{'Content-Type':'application/json'}})):f(u,i);const m=new Map();Storage.prototype.getItem=function(k){return m.get(String(k))??null};Storage.prototype.setItem=function(k,v){m.set(String(k),String(v))};Storage.prototype.removeItem=function(k){m.delete(String(k))};` });
  await page.call('Page.navigate', { url: appUrl });
  for (let i = 0; i < 300 && !await evaluate('document.readyState === "complete" && typeof guruStrategicCtaChoicesV1 === "function"'); i++) await sleep(100);
  const result = await evaluate(`(() => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    scheduleCloudSync=()=>{}; scheduleProjectsCloudSync=()=>{};
    state=${JSON.stringify(fixture.workspace || fixture)}; activeProjectId=state.project.id;
    guruExportWithoutPersistenceV223(()=>{state=migrateWorkspace(state,activeProjectId)});
    projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];
    updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;
    const records=state.project.gate0ScopedValuesV194;
    const before=JSON.stringify(records);
    const product=state.project.catalogItemsV189.find((p)=>records.some((r)=>r.field==='offers'&&r.scope==='product'&&r.product_id===p.id));
    const company=guruStrategicCtaChoicesV1('company');
    const productChoices=guruStrategicCtaChoicesV1('product',product?.id);
    const after=JSON.stringify(records);
    const isolated={gates:[{id:'gate-0',cards:[{id:'card-7',megaMarketing:{platformV2:{}}}]}],
      project:{id:'cta-isolation',catalogItemsV189:[{id:'p1',name:'Первый'},{id:'p2',name:'Второй'}],gate0ScopedValuesV194:[
      {id:'company',project_id:'cta-isolation',field:'company_offer',scope:'project',offer:{ctaV2:{primary:'Компания'}}},
      {id:'first',project_id:'cta-isolation',field:'offers',scope:'product',product_id:'p1',offer:{ctaV2:{primary:'Продукт 1',secondary:'Узнать'}}},
      {id:'second',project_id:'cta-isolation',field:'offers',scope:'product',product_id:'p2',offer:{ctaV2:{primary:'Продукт 2'}}},
      {id:'archived',project_id:'cta-isolation',field:'offers',scope:'product',product_id:'p1',archived_at:'2020-01-01',offer:{ctaV2:{primary:'Архив'}}},
    ]}};
    const isolatedBefore=JSON.stringify(isolated);
    const isolatedValues={company:guruStrategicCtaChoicesV1('company','',isolated).map((x)=>x.value),
      first:guruStrategicCtaChoicesV1('product','p1',isolated).map((x)=>x.value),
      second:guruStrategicCtaChoicesV1('product','p2',isolated).map((x)=>x.value)};
    const isolatedReadOnly=isolatedBefore===JSON.stringify(isolated);
    isolated.project.gate0ScopedValuesV194[1].offer.ctaV2.primary='Обновлённый продукт 1';
    const refreshed=guruStrategicCtaChoicesV1('product','p1',isolated).map((x)=>x.value);
    guruNavigateToGate('gate-1'); renderGate();
    const actualInput=document.querySelector('input[data-page-context-card-id="card-21"][data-page-context-key="primaryButton"]');
    const actualTrigger=actualInput?.parentElement?.querySelector('[data-strategic-cta-trigger-v1]');
    const page=state.gates.find((g)=>g.id==='gate-1').cards.find((c)=>c.id==='card-21')?.pageRows?.[0];
    const holder=document.createElement('div');holder.innerHTML='<input data-page-context-card-id="card-21" data-page-context-index="0" data-page-context-key="primaryButton" value="Старое значение">';document.body.appendChild(holder);
    guruStrategicCtaEnhanceV1(holder);
    const input=holder.querySelector('input'); const trigger=holder.querySelector('button');
    trigger.click();const shown=[...document.querySelectorAll('[data-strategic-cta-choice-v1]')].map((n)=>n.querySelector('span').textContent);
    const unchanged=before===JSON.stringify(records)&&input.value==='Старое значение';
    guruStrategicCtaCloseV1();holder.remove();
    let selection = null;
    if (actualTrigger && company.length) {
      const oldValue=page.contextFields?.primaryButton || '';
      actualTrigger.click();
      const choice=document.querySelector('[data-strategic-cta-choice-v1]:not(:disabled)');
      const picked=choice?.querySelector('span')?.textContent || '';
      choice?.click();
      selection={oldValue,picked,saved:page.contextFields?.primaryButton || '',
        sourceUnchanged:before===JSON.stringify(records)};
    }
    let productSelection=null;
    if (productChoices.length) {
      const productCard=state.gates.find((g)=>g.id==='gate-1').cards
        .filter((c)=>['card-23','card-24'].includes(c.id))
        .map((c)=>({card:c,index:c.pageRows?.findIndex((r)=>r.catalogItemIdV189===product.id)}))
        .find((x)=>x.index>=0);
      if (productCard) {
        const productRow=productCard.card.pageRows[productCard.index];
        const holder2=document.createElement('div');
        holder2.innerHTML='<input data-page-context-card-id="'+productCard.card.id+'" data-page-context-index="'+productCard.index+'" data-page-context-key="productFinalCtaButtonTextV514" value="'+(productRow.contextFields?.productFinalCtaButtonTextV514||'')+'">';
        document.body.appendChild(holder2);guruStrategicCtaEnhanceV1(holder2);
        holder2.querySelector('input').addEventListener('input',updatePageContextField);
        holder2.querySelector('button').click();
        const visible=[...document.querySelectorAll('[data-strategic-cta-choice-v1]')].map((n)=>n.querySelector('span').textContent);
        const choice=holder2.querySelector('input').value===productChoices[0].value
          ? document.querySelector('[data-strategic-cta-choice-v1]:not(:disabled)')
          : document.querySelector('[data-strategic-cta-choice-v1]');
        const picked=choice?.querySelector('span')?.textContent||'';
        choice?.click();
        productSelection={visible,picked,saved:productRow.contextFields?.productFinalCtaButtonTextV514||'',
          sourceUnchanged:before===JSON.stringify(records)};
        holder2.remove();
      }
    }
    const probe=document.createElement('div');
    probe.innerHTML='<textarea data-gate1-page-card-id="card-21" data-gate1-page-index="0" data-gate1-page-field="finalCta">Свободный текст</textarea>'+
      '<input data-guru-hub-showcase-field="buttonText" value="Смотреть все">'+
      '<input data-guru-home-category-field-v541="buttonText" value="Смотреть все">'+
      '<input data-page-context-card-id="card-21" data-page-context-index="0" data-page-context-key="catalogFinalCtaTargetV493" value="Ссылка">';
    const smm=document.createElement('div');
    smm.dataset.g4ProductSmmProductIdV523=product.id;
    smm.innerHTML='<input data-g4-product-smm-base-field-v529="cta" value="Ручной CTA">'+
      '<input data-g4-product-smm-override-field-v529="cta" value="">'+
      '<textarea data-g4-smm-brief-field-v325="cta"></textarea>';
    probe.append(smm);document.body.append(probe);
    const coverage={};
    for(const [name, selector, expected] of [
      ['final','[data-gate1-page-field="finalCta"]',company],
      ['hub','[data-guru-hub-showcase-field="buttonText"]',company],
      ['home','[data-guru-home-category-field-v541="buttonText"]',company],
      ['smmBase','[data-g4-product-smm-base-field-v529="cta"]',productChoices],
      ['smmOverride','[data-g4-product-smm-override-field-v529="cta"]',productChoices],
      ['smmBrief','[data-g4-smm-brief-field-v325="cta"]',productChoices],
    ]) {
      const field=probe.querySelector(selector);
      field.click();
      const visible=[...document.querySelectorAll('[data-strategic-cta-choice-v1]')]
        .map((node)=>node.querySelector('span').textContent);
      coverage[name]={visible,expected:expected.map((choice)=>choice.value),
        trigger:!!field.nextElementSibling?.matches('[data-strategic-cta-trigger-v1]')};
      guruStrategicCtaCloseV1();
    }
    const excluded=probe.querySelector('[data-page-context-key="catalogFinalCtaTargetV493"]');
    excluded.click();coverage.excluded=!excluded.dataset.strategicCtaInputV1 &&
      !document.querySelector('.strategic-cta-picker-v1');
    const manual=probe.querySelector('[data-g4-product-smm-base-field-v529="cta"]');
    manual.value='Мой индивидуальный CTA';
    manual.dispatchEvent(new Event('input',{bubbles:true}));
    coverage.manual=manual.value;
    probe.remove();
    return { project:state.project.name, company, productChoices, productId:product?.id,
      readOnly:before===after, unchanged, shown, sourceUnchanged:before===JSON.stringify(records), selection,productSelection,
      isolatedValues, isolatedReadOnly, refreshed,
      pageValue:page?.contextFields?.primaryButton||'', pageExists:!!page, actualInput:!!actualInput,
      actualTrigger:!!actualTrigger,coverage };
  })()`);
  assert(result.readOnly && result.unchanged && result.sourceUnchanged);
  if (result.actualInput) assert(result.actualTrigger);
  if (result.selection) {
    assert.equal(result.selection.saved, result.selection.picked);
    assert(result.selection.sourceUnchanged);
  }
  if (result.productSelection) {
    assert.deepEqual(result.productSelection.visible,result.productChoices.map((choice)=>choice.value));
    assert.equal(result.productSelection.saved,result.productSelection.picked);
    assert(result.productSelection.sourceUnchanged);
  }
  assert.deepEqual(result.shown, result.company.map((choice) => choice.value));
  assert(result.company.every((choice) => choice.scope === 'project'));
  assert(result.productChoices.every((choice) => choice.scope !== 'company'));
  assert.deepEqual(result.isolatedValues, {company:['Компания'],first:['Продукт 1','Узнать'],second:['Продукт 2']});
  assert(result.isolatedReadOnly);
  assert.deepEqual(result.refreshed,['Обновлённый продукт 1','Узнать']);
  for(const [name, row] of Object.entries(result.coverage)) {
    if (name==='excluded'||name==='manual') continue;
    assert.deepEqual(row.visible,row.expected,`${name} CTA choices`);
    assert(row.trigger,`${name} CTA trigger`);
  }
  assert(result.coverage.excluded);
  assert.equal(result.coverage.manual,'Мой индивидуальный CTA');
  assert.equal(createHash('sha256').update(readFileSync(fixturePath)).digest('hex'), createHash('sha256').update(source).digest('hex'));
  console.log(JSON.stringify({ ...result, company: result.company.length, productChoices: result.productChoices.length }, null, 2));
  console.log('Strategic CTA sync smoke: PASS');
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId });
  page.close();browser.close();
}
