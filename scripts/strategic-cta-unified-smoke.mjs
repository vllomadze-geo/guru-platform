import assert from 'node:assert/strict';

const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:38676/';
const port = process.env.GURU_CHROME_DEBUG_PORT || '38677';
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
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source:
    `const originalFetch=window.fetch.bind(window);window.fetch=(url,init)=>String(url).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}),{status:200,headers:{'Content-Type':'application/json'}})):originalFetch(url,init);` });
  await page.call('Page.navigate', { url: appUrl });
  for (let i = 0; i < 300 && !await evaluate('document.readyState === "complete" && typeof guruStrategicCtaChoicesV1 === "function" && typeof g4PaidSmmSourceOptionsV1 === "function"'); i++) await sleep(100);
  const result = await evaluate(`(() => {
    state={project:{id:'cta-test',catalogItemsV189:[{id:'p1',name:'Первый'},{id:'p2',name:'Второй'},{id:'p3',name:'Третий'}],gate0ScopedValuesV194:[
      {id:'company',project_id:'cta-test',scope:'project',field:'company_offer',offer:{ctaV2:{primary:'Черновик',secondary:'Компания 2',alternative:'Компания 3'}},ctaVersionsV1:[{value:'Компания утверждено',approved_at:'2026-01-01'}]},
      {id:'product',project_id:'cta-test',scope:'product',product_id:'p1',field:'offers',offer:{ctaV2:{primary:'Продукт 1',secondary:'Продукт 2',alternative:'Продукт 3'}}},
      {id:'other',project_id:'cta-test',scope:'product',product_id:'p2',field:'offers',offer:{ctaV2:{primary:'Другой продукт'}}},
      {id:'category',project_id:'cta-test',scope:'category',category_id:'c1',field:'offers',offer:{ctaV2:{primary:'Категория'}}},
      {id:'project-offer',project_id:'cta-test',scope:'project',field:'offers',offer:{ctaV2:{primary:'Общий оффер'}}},
      {id:'legacy',project_id:'cta-test',scope:'product',product_id:'p1',field:'cta',value:'Старый CTA'},
      {id:'archived',project_id:'cta-test',scope:'product',product_id:'p1',field:'offers',archived_at:'2026-01-01',offer:{ctaV2:{primary:'Архив'}}},
    ]},gates:[{id:'gate-1',cards:[{id:'card-21',pageRows:[{contextFields:{primaryButton:'Сохранённый CTA'}}]},{id:'card-23',pageRows:[{catalogItemIdV189:'p1',contextFields:{productFinalCtaButtonTextV514:'Мой CTA'}}]}]}]};
    const before=JSON.stringify(state);
    const values=(level,id)=>guruStrategicCtaChoicesV1(level,id).map((choice)=>choice.value);
    const company=values('company');const product=values('product','p1');const other=values('product','p2');const empty=values('product','p3');
    const paid=g4PaidSmmSourceOptionsV1(state.project.catalogItemsV189[0],'cta').map((choice)=>choice.value);
    const actualPaidHtml=g4PaidSmmStrategyHtmlV1(state.project.catalogItemsV189[0]);
    const actualPaid=document.createElement('div');actualPaid.innerHTML=actualPaidHtml;
    const actualPaidChoices=[...actualPaid.querySelectorAll('select[data-g4-paid-field-v1="ctaRef"]')]
      .flatMap((select)=>[...select.options].map((option)=>option.textContent));
    const holder=document.createElement('div');holder.innerHTML='<input data-page-context-card-id="card-21" data-page-context-index="0" data-page-context-key="primaryButton" value="Сохранённый CTA"><input data-page-context-card-id="card-23" data-page-context-index="0" data-page-context-key="productFinalCtaButtonTextV514" value="Мой CTA"><div data-g4-paid-smm-v1="p1"><input data-g4-paid-field-v1="targetAction" value="Сохранённый рекламный CTA"><select data-g4-paid-field-v1="ctaRef"><option value="">Выбрать</option><option value="product::primary">Основной</option><option value="product::secondary">Вторичный</option><option value="product::alternative">Альтернативный</option></select></div><input data-page-context-card-id="card-21" data-page-context-index="0" data-page-context-key="buttonUrl" value="/target"><textarea data-gate1-page-card-id="card-21" data-gate1-page-index="0" data-gate1-page-field="finalCta"></textarea><input data-guru-hub-showcase-field="buttonText"><input data-guru-category-card-field-v516="orderLabel" data-guru-category-card-product-v516="p1"><div data-g4-product-smm-product-id-v523="p1"><input data-g4-product-smm-base-field-v529="cta"></div>';
    document.body.append(holder);guruStrategicCtaEnhanceV1(holder);
    const inputs=[...holder.querySelectorAll('input')].slice(0,4);const contexts=inputs.map((input)=>guruStrategicCtaTargetV1(input));
    const coverage=['[data-gate1-page-field="finalCta"]','[data-guru-hub-showcase-field="buttonText"]','[data-guru-category-card-field-v516="orderLabel"]','[data-g4-product-smm-base-field-v529="cta"]']
      .map((selector)=>{const input=holder.querySelector(selector);return {target:guruStrategicCtaTargetV1(input),trigger:!!input.nextElementSibling?.matches('[data-strategic-cta-trigger-v1]')};});
    const shown=[];for(const input of inputs.slice(0,3)){input.click();shown.push([...document.querySelectorAll('[data-strategic-cta-choice-v1]')].map((button)=>button.querySelector('span').textContent));guruStrategicCtaCloseV1();}
    let changed=0;inputs[1].addEventListener('input',()=>changed++);inputs[1].click();document.querySelector('[data-strategic-cta-choice-v1]')?.click();
    const selected=inputs[1].value;
    const reference=holder.querySelector('select');let referenceChanges=0;reference.addEventListener('change',()=>referenceChanges++);
    reference.click();const referenceChoices=[...document.querySelectorAll('[data-strategic-cta-choice-v1]')].map((button)=>button.querySelector('span').textContent);
    document.querySelector('[data-strategic-cta-choice-v1="1"]')?.click();
    const referenceSelected=reference.value;
    const sourceUnchanged=before===JSON.stringify(state);
    state.project.gate0ScopedValuesV194[1].offer.ctaV2.primary='Обновлённый продукт';
    inputs[2].click();const updated=[...document.querySelectorAll('[data-strategic-cta-choice-v1]')].map((button)=>button.querySelector('span').textContent);
    guruStrategicCtaCloseV1();
    state.project.gate0ScopedValuesV194.push({id:'new-offer',project_id:'cta-test',scope:'product',product_id:'p1',field:'offers',offer:{ctaV2:{primary:'Новый CTA'}}});
    reference.click();const dynamicOption=[...reference.options].some((option)=>option.value==='new-offer::primary'&&option.textContent.includes('Новый CTA'));
    document.querySelector('[data-strategic-cta-choice-v1="3"]')?.click();const dynamicSelected=reference.value;
    state.project.gate0ScopedValuesV194[0].ctaVersionsV1.push({value:'Компания обновлено',approved_at:'2026-02-01'});
    inputs[0].click();const approved=[...document.querySelectorAll('[data-strategic-cta-choice-v1]')].map((button)=>button.querySelector('span').textContent);
    guruStrategicCtaCloseV1();
    const design=document.createElement('div');design.className='g1-redesign';
    design.innerHTML='<div class="guru-site-page-editor-v542"><div class="guru-site-block-editor-v542"><div class="guru-category-lead-actions-v510"><label class="guru-hub-inline-button-v507"><span>CTA</span><input data-page-context-card-id="card-21" data-page-context-index="0" data-page-context-key="primaryButton" value="Основной"></label><label class="guru-hub-inline-button-v507 guru-category-lead-call-v510"><span>CTA</span><input data-page-context-card-id="card-21" data-page-context-index="0" data-page-context-key="secondaryButton" value="Вторичный"></label></div></div></div>';
    document.body.append(design);
    const visualFields=[...design.querySelectorAll('label')];
    visualFields.forEach((label)=>guruSiteEditorCtaV543(label,label.querySelector('input')));
    guruStrategicCtaEnhanceV1(design);
    const visual=visualFields.map((label)=>({role:label.classList.contains('is-secondary')?'secondary':'primary',
      background:getComputedStyle(label).backgroundColor,color:getComputedStyle(label).color,
      inputColor:getComputedStyle(label.querySelector('input')).color,
      trigger:!!label.querySelector('[data-strategic-cta-trigger-v1]')}));
    design.remove();holder.remove();
    return {company,product,other,empty,paid,actualPaidChoices,contexts,coverage,shown,selected,changed,referenceChoices,referenceSelected,referenceChanges,dynamicOption,dynamicSelected,updated,approved,visual,sourceUnchanged};
  })()`);
  assert.deepEqual(result.company, ['Компания утверждено', 'Компания 2', 'Компания 3']);
  assert.deepEqual(result.product, ['Продукт 1', 'Продукт 2', 'Продукт 3']);
  assert.deepEqual(result.other, ['Другой продукт']);
  assert.deepEqual(result.empty, []);
  assert.deepEqual(result.paid, ['Основной · Продукт 1', 'Вторичный · Продукт 2', 'Альтернативный · Продукт 3']);
  assert(result.actualPaidChoices.includes('Основной · Продукт 1'));
  assert(result.actualPaidChoices.includes('Альтернативный · Продукт 3'));
  assert(!result.actualPaidChoices.some((value)=>/Категория|Общий оффер|Старый CTA/.test(value)));
  assert.deepEqual(result.contexts, [{level:'company',productId:''},{level:'product',productId:'p1'},{level:'product',productId:'p1'},null]);
  assert.deepEqual(result.coverage, [
    {target:{level:'company',productId:''},trigger:true},
    {target:{level:'company',productId:''},trigger:true},
    {target:{level:'product',productId:'p1'},trigger:true},
    {target:{level:'product',productId:'p1'},trigger:true},
  ]);
  assert.deepEqual(result.shown, [result.company,result.product,result.product]);
  assert.equal(result.selected, 'Продукт 1');
  assert.equal(result.changed, 1);
  assert.deepEqual(result.referenceChoices, result.product);
  assert.equal(result.referenceSelected, 'product::secondary');
  assert.equal(result.referenceChanges, 2);
  assert(result.dynamicOption);
  assert.equal(result.dynamicSelected, 'new-offer::primary');
  assert.deepEqual(result.updated, ['Обновлённый продукт','Продукт 2','Продукт 3']);
  assert.deepEqual(result.approved, ['Компания обновлено','Компания 2','Компания 3']);
  assert.deepEqual(result.visual, [
    {role:'primary',background:'rgb(31, 27, 22)',color:'rgb(255, 255, 255)',inputColor:'rgb(255, 255, 255)',trigger:true},
    {role:'secondary',background:'rgb(255, 255, 255)',color:'rgb(31, 27, 22)',inputColor:'rgb(31, 27, 22)',trigger:true},
  ]);
  assert(result.sourceUnchanged);
  console.log('Unified strategic CTA smoke: PASS');
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId });
  page.close(); browser.close();
}
