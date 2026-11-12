import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';

const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:3000/';
const port = process.env.GURU_CHROME_DEBUG_PORT || '9548';
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
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
      const id = ++this.id;
      const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 60000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(info.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(tabs.find((tab) => tab.id === targetId).webSocketDebuggerUrl);
const runtimeErrors=[];
page.socket.addEventListener('message',(event)=>{
  const message=JSON.parse(event.data);
  if(message.method==='Runtime.exceptionThrown')
    runtimeErrors.push(message.params?.exceptionDetails?.text || 'Runtime exception');
  if(message.method==='Runtime.consoleAPICalled' && message.params?.type==='error')
    runtimeErrors.push('console.error');
});
const evaluate = async (expression) => {
  const result = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression) => {
  for (let i = 0; i < 150; i++) {
    if (await evaluate(expression)) return;
    await pause(100);
  }
  throw new Error(`Timeout: ${expression}`);
};

try {
  await page.call('Runtime.enable');
  await page.call('Page.enable');
  await page.call('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
  });
  await page.call('Page.navigate', { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof guruCatalogPaginationSectionV3 === "function"');
  const setup = await evaluate(`(() => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    scheduleCloudSync=()=>{}; scheduleProjectsCloudSync=()=>{};
    const meta={id:'catalog-v3-smoke',name:'Catalog V3 smoke',lifecycleStatus:'active'};
    projects=[meta];localStorage.setItem(PROJECTS_STORAGE_KEY,JSON.stringify(projects));
    activeProjectId=meta.id;state=createFreshWorkspace(meta);
    const hub=findCard('card-22-hub');
    const category=findCard('card-22');
    state.project.productRegistryV185=[
      {id:'cat-a',name:'Подарки',manualOriginV2:true},
      {id:'cat-b',name:'Одежда',manualOriginV2:true},
      {id:'cat-c',name:'На заказ',manualOriginV2:true},
    ];
    const first=category.pageRows[0];
    first.categoryId='cat-a'; first.name='Подарки'; first.contextFields.catalogRelated=
      'Одежда -> https://old.test/odezhda/\\nНеизвестная -> /unknown';
    category.pageRows.push({...first,id:'fixture-cat-b',categoryId:'cat-b',name:'Одежда',
      contextFields:{catalogRelated:'',catalogRelatedHeadingV512:'Связанные направления'}});
    category.pageRows.push({...first,id:'fixture-cat-c',categoryId:'cat-c',name:'На заказ',
      contextFields:{catalogRelated:''}});
    hub.pageRows[0].catalogHubLinkExclusionsV502={about:true,blog:true,on_order:true};
    const urls=megaPlatformUrlStore(state);
    urls.fixed.catalog='https://site.test/catalog';
    urls.fixed.about='https://site.test/about';
    urls.fixed.blog='https://site.test/blog';
    urls.fixed.home='https://site.test/';
    urls.categories['cat-a']='https://site.test/podarki';
    urls.categories['cat-b']='https://site.test/odezhda';
    urls.categories['cat-c']='https://site.test/na-zakaz';
    urls.onOrderCategoryId='cat-c';
    state.project.catalogItemsV189=Array.from({length:15},(_,i)=>({id:'product-'+i,name:'Товар '+(i+1)}));
    const relations=megaPlatformCategoryStore(state);
    state.project.catalogItemsV189.forEach((item)=>relations.categoryIdsByProduct[item.id]=['cat-a']);
    els.launcher.hidden=true;els.appShell.hidden=false;activeView='gate';activeGateId='gate-1';
    guruCatalogMigrateLinksV3(state);
    return {hubId:hub.pageRows[0].id, categoryId:first.categoryId,
      refs:first.contextFields.catalogRelatedPageRefsV3,
      legacy:first.contextFields.catalogRelated,
      count:guruCategoryProductsV510(first).length};
  })()`);
  assert.equal(setup.count, 15);
  assert.deepEqual(setup.refs, [{pageKey:'categories:cat-b'},{legacyIndex:1}]);
  assert(setup.legacy.includes('Неизвестная'));

  const check = await evaluate(`(() => {
    const hub=findCard('card-22-hub'),category=findCard('card-22');
    const hubRow=hub.pageRows[0], cat=category.pageRows[0], empty=category.pageRows[1];
    const hs=v22TemplateForCard(hub).sections.find(s=>s.key==='catalog_pagination');
    const cs=v22TemplateForCard(category).sections.find(s=>s.key==='catalog_pagination');
    const before={hub:guruCatalogPaginationStatusV3(hubRow,hs),category:guruCatalogPaginationStatusV3(cat,cs)};
    const emptyHtml=guruCatalogPaginationSectionV3(category,empty,1,cs);
    const categoryHtml=guruCatalogPaginationSectionV3(category,cat,0,cs);
    const order=(html)=>{
      const holder=document.createElement('div');holder.innerHTML=html;
      return [...holder.querySelectorAll('h2,.guru-catalog-links-v3,.guru-catalog-add-row-v6')]
        .map(node=>node.tagName==='H2'?'h2':node.classList.contains('guru-catalog-links-v3')?'links':'add');
    };
    const emptyOrder=order(emptyHtml),categoryOrder=order(categoryHtml);
    hubRow.contextFields.catalogRelatedPageRefsV3=[{pageKey:'categories:cat-a'},{pageKey:'categories:cat-b'},
      {pageKey:'categories:cat-c'},{pageKey:'fixed:about'},{pageKey:'fixed:blog'}];
    const five=guruCatalogPaginationStatusV3(hubRow,hs);
    hubRow.contextFields.catalogPaginationApprovedRefsV5=
      guruCatalogApprovalSignatureV5(hubRow.contextFields.catalogRelatedPageRefsV3);
    const manualAtFive=guruCatalogPaginationStatusV3(hubRow,hs);
    const originalAbout=megaPlatformUrlStore(state).fixed.about;
    megaPlatformUrlStore(state).fixed.about='';
    const invalidManual=guruCatalogPaginationStatusV3(hubRow,hs);
    megaPlatformUrlStore(state).fixed.about=originalAbout;
    hubRow.contextFields.catalogRelatedPageRefsV3.reverse();
    const changedManual=guruCatalogPaginationStatusV3(hubRow,hs);
    hubRow.contextFields.catalogRelatedPageRefsV3.reverse();
    delete hubRow.contextFields.catalogPaginationApprovedRefsV5;
    hubRow.contextFields.catalogRelatedPageRefsV3.push({pageKey:'fixed:blog'});
    const duplicateSix=guruCatalogPaginationStatusV3(hubRow,hs);
    hubRow.contextFields.catalogRelatedPageRefsV3[5]={pageKey:'fixed:home'};
    const after=guruCatalogPaginationStatusV3(hubRow,hs);
    const aboutUrl=megaPlatformUrlStore(state).fixed.about;
    megaPlatformUrlStore(state).fixed.about='';
    const missingAtSix=guruCatalogPaginationStatusV3(hubRow,hs);
    megaPlatformUrlStore(state).fixed.about=aboutUrl;
    const partialLegacy=guruCatalogInitialRefsV3(hub,
      {catalogHubLinkExclusionsV502:{about:true},contextFields:{catalogRelated:''}},
      state,guruCatalogPageSourcesV3()).refs;
    const path=guruCatalogUrlPathV3('https://other.test/odezhda/',true);
    return {before,five,manualAtFive,invalidManual,changedManual,duplicateSix,after,missingAtSix,
      path,partialLegacy,emptyHtml,categoryHtml,emptyOrder,categoryOrder,
      storedPageSize:cat.contextFields.catalogPaginationPageSizeV2,
      storedLogic:cat.contextFields.catalogPagination};
  })()`);
  assert.equal(check.before.category,'in_progress');
  assert.equal(check.before.hub,'not_required');
  assert.equal(check.five,'in_progress');
  assert.equal(check.manualAtFive,'ready');
  assert.equal(check.invalidManual,'in_progress');
  assert.equal(check.changedManual,'in_progress');
  assert.equal(check.duplicateSix,'in_progress');
  assert.equal(check.after,'ready');
  assert.equal(check.missingAtSix,'in_progress');
  assert.equal(check.path,'/odezhda');
  assert(check.partialLegacy.some(ref=>ref.pageKey==='fixed:blog'));
  assert(check.partialLegacy.some(ref=>ref.pageKey==='categories:cat-c'));
  assert(check.emptyHtml.includes('Предлагаемые страницы'));
  assert.deepEqual(check.emptyOrder,['h2','add']);
  assert.deepEqual(check.categoryOrder,['h2','links','add']);
  assert(check.emptyHtml.includes('Связанные направления'));
  assert(check.emptyHtml.includes('data-page-context-key="catalogRelatedHeadingV512"'));
  assert(!check.emptyHtml.includes('guru-catalog-preview-v3'));
  assert(check.emptyHtml.includes('Не нужна'));
  assert(!check.emptyHtml.includes('Нужна ли секция'));
  assert(check.categoryHtml.includes('Неизвестная ?'));
  assert(!check.categoryHtml.includes('Изменить страницу ссылки'));
  assert(check.categoryHtml.includes('Товары 1-8 из 15'));
  assert(!check.categoryHtml.includes('Настроить ссылки и пагинацию'));
  assert(!check.categoryHtml.includes('Логика пагинации'));
  assert(!check.categoryHtml.includes('Товаров на странице'));
  assert(!check.categoryHtml.includes('—'));
  assert(check.emptyHtml.includes('Выбрано 0 из 6 · Осталось 6'));
  assert(check.categoryHtml.includes('Выбрано 1 из 6 · Осталось 5'));

  await page.call('Emulation.setDeviceMetricsOverride', {
    width: 2200, height: 1000, deviceScaleFactor: 1, mobile: false,
  });
  const wide = await evaluate(`(() => {
    renderGate();openAuditPageCard('card-22-hub');
    const block=document.querySelector('[data-page-source-card="card-22-hub"] [data-guru-catalog-pagination-section-v3]');
    for(let node=block;node;node=node.parentElement)if(node.matches?.('details'))node.open=true;
    const body=block.querySelector(':scope > .v22-section-body');
    const preview=block.querySelector('.guru-catalog-preview-v3');
    return {body:body.getBoundingClientRect().width,preview:preview.getBoundingClientRect().width};
  })()`);
  assert(wide.body>1200 && wide.preview/wide.body>0.95,JSON.stringify(wide));
  await page.call('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
  });

  const out='artifacts/catalog-pagination-v4'; mkdirSync(out,{recursive:true});
  const shoot=async(name,cardId,index,prepare='')=>{
    await evaluate(`(() => {
      ${prepare}
      renderGate(); openAuditPageCard('${cardId}');
      return true;
    })()`);
    await pause(350);
    const result=await evaluate(`(() => {
      const blocks=[...document.querySelectorAll('[data-page-source-card="${cardId}"] [data-guru-catalog-pagination-section-v3]')];
      const block=blocks[${index}];
      if(!block) return {ok:false,count:blocks.length};
      const content=block.closest('[data-guru-category-page-content-v495]');
      if(content?.hidden) content.closest('.page-structure-card')
        ?.querySelector('[data-guru-category-page-toggle-v495]')?.click();
      for(let ancestor=block.parentElement;ancestor;ancestor=ancestor.parentElement){
        if(ancestor.matches('details')) ancestor.open=true;
        if(ancestor.classList.contains('is-collapsed')) ancestor.classList.remove('is-collapsed');
      }
      block.open=true;block.scrollIntoView({block:'start'});
      return {ok:true,text:block.innerText.slice(0,2500),count:blocks.length,
        links:block.querySelectorAll('[data-guru-catalog-link-v3]').length,
        removeButtons:block.querySelectorAll('[data-guru-catalog-remove-v3]').length,
        unmatched:!!block.querySelector('.guru-catalog-link-v3 > small')?.textContent.includes('не сопоставлено') ||
          [...block.querySelectorAll('.guru-catalog-link-v3 > small')].some(n=>n.textContent.includes('не сопоставлено')),
        pagination:block.querySelector('.guru-catalog-pagination-v3 small')?.textContent,
        missing:!!block.querySelector('[data-guru-catalog-platform-v3]'),
        suggestions:!!block.querySelector('.guru-catalog-suggestions-v3')};
    })()`);
    assert(result.ok,JSON.stringify({name,result}));
    await pause(150);
    const image=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    writeFileSync(`${out}/${name}.png`,Buffer.from(image.data,'base64'));
    return result;
  };
  const hubShot=await shoot('01-hub','card-22-hub',0);
  const categoryShot=await shoot('02-category','card-22',0);
  const emptyShot=await shoot('03-empty-suggestions','card-22',1);
  const emptyHeadingEdit=await evaluate(`(() => {
    const row=findCard('card-22').pageRows[1];
    const input=[...document.querySelectorAll('[data-page-source-card="card-22"] [data-guru-catalog-pagination-section-v3]')][1]
      ?.querySelector('[data-page-context-key="catalogRelatedHeadingV512"]');
    if(!input)return {visible:false};
    const original=input.value;
    input.value='Новое название блока';input.dispatchEvent(new Event('input',{bubbles:true}));
    const saved=row.contextFields.catalogRelatedHeadingV512==='Новое название блока';
    input.value=original;input.dispatchEvent(new Event('input',{bubbles:true}));
    return {visible:true,saved,restored:row.contextFields.catalogRelatedHeadingV512===original};
  })()`);
  assert(emptyHeadingEdit.visible && emptyHeadingEdit.saved && emptyHeadingEdit.restored);
  const pickerShot=await evaluate(`(() => {
    const block=[...document.querySelectorAll('[data-page-source-card="card-22"] [data-guru-catalog-pagination-section-v3]')][1];
    block.querySelector('[data-guru-catalog-picker-open-v4="add"]').click();
    const menu=block.querySelector('[data-guru-catalog-picker-v4]');
    const box=menu.getBoundingClientRect();
    return {visible:!menu.hidden,groups:menu.querySelectorAll('[role="group"]').length,
      onTop:!!document.elementFromPoint(box.left+20,box.top+20)?.closest('[data-guru-catalog-picker-v4]'),
      choices:menu.querySelectorAll('[data-guru-catalog-pick-v4]').length};
  })()`);
  assert(pickerShot.visible && pickerShot.groups>=3 && pickerShot.onTop && pickerShot.choices>0);
  const pickerImage=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  writeFileSync(`${out}/07-picker-open.png`,Buffer.from(pickerImage.data,'base64'));
  const pendingShot=await evaluate(`(() => {
    const block=[...document.querySelectorAll('[data-page-source-card="card-22"] [data-guru-catalog-pagination-section-v3]')][1];
    const menu=block.querySelector('[data-guru-catalog-picker-v4]');
    menu.querySelector('[data-guru-catalog-pick-v4]').click();
    return {selected:!!menu.dataset.pending,confirmEnabled:!menu.querySelector('[data-guru-catalog-confirm-v4]').disabled,
      unchanged:findCard('card-22').pageRows[1].contextFields.catalogRelatedPageRefsV3.length===0};
  })()`);
  assert(pendingShot.selected && pendingShot.confirmEnabled && pendingShot.unchanged);
  const pendingImage=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  writeFileSync(`${out}/08-picker-selected.png`,Buffer.from(pendingImage.data,'base64'));
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));`);
  assert(await evaluate(`[...document.querySelectorAll('[data-page-source-card="card-22"] [data-guru-catalog-picker-v4]')][1]?.hidden === true`));
  const missingShot=await shoot('04-missing-platform-url','card-22-hub',0,
    `findCard('card-22-hub').pageRows[0].contextFields.catalogRelatedPageRefsV3=[{pageKey:'fixed:about'}];megaPlatformUrlStore(state).fixed.about='';`);
  const unmatchedShot=await shoot('05-unmatched','card-22',0);
  const paginationShot=await shoot('06-pagination-15','card-22',0);
  const manualShot=await shoot('09-manual-approved','card-22-hub',0,
    `const hubRow=findCard('card-22-hub').pageRows[0];hubRow.contextFields.catalogRelatedPageRefsV3=[{pageKey:'categories:cat-a'}];hubRow.contextFields.catalogPaginationApprovedRefsV5=guruCatalogApprovalSignatureV5(hubRow.contextFields.catalogRelatedPageRefsV3);`);
  assert(hubShot.text.includes('Подарки'));
  assert.equal(hubShot.links,hubShot.removeButtons);
  assert.equal(hubShot.links,6);
  assert(categoryShot.unmatched);
  assert(emptyShot.suggestions);
  assert(missingShot.missing);
  assert(unmatchedShot.unmatched);
  assert.equal(paginationShot.pagination,'Товары 1-8 из 15');
  assert(manualShot.text.includes('Выбрано 1 из 6 · Осталось 5'));

  const interaction=await evaluate(`(() => {
    const card=findCard('card-22'),row=card.pageRows[1];
    renderGate();openAuditPageCard('card-22');
    let block=[...document.querySelectorAll('[data-page-source-card="card-22"] [data-guru-catalog-pagination-section-v3]')][1];
    const initialBlock=block;
    const initialTop=block.getBoundingClientRect().top;
    const initialAddX=block.querySelector('[data-guru-catalog-picker-open-v4="add"]').getBoundingClientRect().left;
    block.open=true;
    const pageContent=block.closest('[data-guru-category-page-content-v495]');
    if(pageContent)pageContent.hidden=false;
    const legacy=row.contextFields.catalogRelated;
    block.querySelector('[data-guru-catalog-picker-open-v4="add"]').click();
    const unchangedBeforeSelection=row.contextFields.catalogRelatedPageRefsV3.length===0;
    const menu=block.querySelector('[data-guru-catalog-picker-v4]');
    const confirmInitiallyDisabled=menu.querySelector('[data-guru-catalog-confirm-v4]').disabled;
    const options=[...menu.querySelectorAll('[data-guru-catalog-pick-v4]')]
      .map(option=>option.dataset.guruCatalogPickV4);
    menu.querySelector('[data-guru-catalog-pick-v4="categories:cat-a"]').click();
    const unchangedAfterSelection=row.contextFields.catalogRelatedPageRefsV3.length===0;
    menu.querySelector('[data-guru-catalog-confirm-v4]').click();
    const afterAdd=row.contextFields.catalogRelatedPageRefsV3.slice();
    block=[...document.querySelectorAll('[data-page-source-card="card-22"] [data-guru-catalog-pagination-section-v3]')][1];
    const progressAtOne=block.querySelector('.guru-catalog-progress-v5')?.textContent;
    const approvalButton=block.querySelector('[data-guru-catalog-approve-v5]');
    const statusBeforeApproval=block.querySelector('.v22-section-status')?.textContent;
    approvalButton?.click();
    const statusAfterApproval=block.querySelector('.v22-section-status')?.textContent;
    const approvalStored=row.contextFields.catalogPaginationApprovedRefsV5;
    const sameSection=block===initialBlock;
    const sectionTopShift=Math.abs(block.getBoundingClientRect().top-initialTop);
    const addXShift=Math.abs(block.querySelector('[data-guru-catalog-picker-open-v4="add"]').getBoundingClientRect().left-initialAddX);
    const resolvedEditAbsent=!block.querySelector('[data-guru-catalog-picker-open-v4="0"]');
    block.querySelector('.guru-catalog-site-link-v4').click();
    const pillClickDidNotOpen=block.querySelector('[data-guru-catalog-picker-v4]').hidden;
    block.querySelector('[data-guru-catalog-picker-open-v4="add"]').click();
    block.querySelector('[data-guru-catalog-pick-v4="fixed:catalog"]').click();
    const unchangedSecondSelection=row.contextFields.catalogRelatedPageRefsV3.length===1;
    block.querySelector('[data-guru-catalog-confirm-v4]').click();
    const afterSecondAdd=row.contextFields.catalogRelatedPageRefsV3.slice();
    block=[...document.querySelectorAll('[data-page-source-card="card-22"] [data-guru-catalog-pagination-section-v3]')][1];
    const statusAfterCompositionChange=block.querySelector('.v22-section-status')?.textContent;
    const progressAtTwo=block.querySelector('.guru-catalog-progress-v5')?.textContent;
    block.querySelector('[data-guru-catalog-remove-v3="0"]').click();
    const afterFirstRemove=row.contextFields.catalogRelatedPageRefsV3.slice();
    block.querySelector('[data-guru-catalog-remove-v3]').click();
    block=[...document.querySelectorAll('[data-page-source-card="card-22"] [data-guru-catalog-pagination-section-v3]')][1];
    block.querySelector('[data-guru-catalog-suggest-v3="categories:cat-a"]').click();
    const suggestionBeforeConfirm=row.contextFields.catalogRelatedPageRefsV3.length===0;
    block.querySelector('[data-guru-catalog-confirm-v4]').click();
    const suggestionAfterConfirm=row.contextFields.catalogRelatedPageRefsV3.slice();
    block.querySelector('[data-guru-catalog-remove-v3]').click();
    return {unchangedBeforeSelection,confirmInitiallyDisabled,unchangedAfterSelection,
      afterAdd,progressAtOne,statusBeforeApproval,statusAfterApproval,approvalStored,
      sameSection,sectionTopShift,addXShift,resolvedEditAbsent,pillClickDidNotOpen,
      unchangedSecondSelection,afterSecondAdd,statusAfterCompositionChange,progressAtTwo,
      afterFirstRemove,options,
      suggestionBeforeConfirm,suggestionAfterConfirm,
      afterRemove:row.contextFields.catalogRelatedPageRefsV3,
      pageStillExists:guruCatalogPageSourcesV3().some(source=>source.key==='fixed:catalog'),
      emptyPreview:!block.querySelector('.guru-catalog-preview-v3'),
      noMode:!block.querySelector('[data-page-context-key="catalog_pagination__mode"]'),
      status:block.querySelector('.v22-section-status')?.textContent,
      original:legacy,legacyAfter:row.contextFields.catalogRelated};
  })()`);
  assert(interaction.unchangedBeforeSelection && interaction.confirmInitiallyDisabled &&
    interaction.unchangedAfterSelection && interaction.unchangedSecondSelection);
  assert.equal(interaction.afterAdd.length,1);
  assert.equal(interaction.progressAtOne,'Выбрано 1 из 6 · Осталось 5');
  assert.equal(interaction.statusBeforeApproval,'В работе');
  assert.equal(interaction.statusAfterApproval,'Готово');
  assert.equal(interaction.approvalStored,'["categories:cat-a"]');
  assert(interaction.sameSection && interaction.resolvedEditAbsent && interaction.pillClickDidNotOpen);
  assert(interaction.sectionTopShift<=1 && interaction.addXShift<=4);
  assert.deepEqual(interaction.afterSecondAdd,[{pageKey:'categories:cat-a'},{pageKey:'fixed:catalog'}]);
  assert.equal(interaction.statusAfterCompositionChange,'В работе');
  assert.equal(interaction.progressAtTwo,'Выбрано 2 из 6 · Осталось 4');
  assert.deepEqual(interaction.afterFirstRemove,[{pageKey:'fixed:catalog'}]);
  assert(interaction.suggestionBeforeConfirm);
  assert.deepEqual(interaction.suggestionAfterConfirm,[{pageKey:'categories:cat-a'}]);
  assert.equal(new Set(interaction.options).size,interaction.options.length);
  assert.deepEqual(interaction.afterRemove,[]);
  assert(interaction.pageStillExists);
  assert(interaction.emptyPreview && interaction.noMode);
  assert.equal(interaction.status,'Не нужна');
  assert.equal(interaction.legacyAfter,interaction.original);
  const sync=await evaluate(`(() => {
    const card=findCard('card-22'),row=card.pageRows[0];
    const section=v22TemplateForCard(card).sections.find(s=>s.key==='catalog_pagination');
    const before=row.contextFields.catalogRelated;
    row.contextFields.catalogRelatedPageRefsV3=[{pageKey:'categories:cat-b'}];
    const first=guruCatalogPaginationSectionV3(card,row,0,section);
    megaPlatformUrlStore(state).categories['cat-b']='https://site.test/novaya-odezhda';
    const source=state.project.productRegistryV185.find(item=>item.id==='cat-b');
    source.name='Новое название одежды';
    const updated=guruCatalogPaginationSectionV3(card,row,0,section);
    source.name='Одежда';
    megaPlatformUrlStore(state).categories['cat-b']='';
    const missing=guruCatalogPaginationStatusV3(row,section);
    row.contextFields.catalog_pagination__mode='not_needed';
    const legacyModeIgnored={label:v22SectionStatusLabel(row,section),status:guruCatalogPaginationStatusV3(row,section)};
    row.contextFields.catalogRelatedPageRefsV3=[];
    row.contextFields.catalog_pagination__mode='needed';
    const empty={label:v22SectionStatusLabel(row,section),status:guruCatalogPaginationStatusV3(row,section)};
    delete row.contextFields.catalog_pagination__mode;
    return {first:first.includes('/odezhda'),updated:updated.includes('/novaya-odezhda'),
      nameUpdated:updated.includes('Новое название одежды'),
      missing,legacyModeIgnored,empty,legacyPreserved:before===row.contextFields.catalogRelated};
  })()`);
  assert(sync.first && sync.updated && sync.nameUpdated && sync.legacyPreserved);
  assert.equal(sync.missing,'in_progress');
  assert.deepEqual(sync.legacyModeIgnored,{label:'В работе',status:'in_progress'});
  assert.deepEqual(sync.empty,{label:'Не нужна',status:'not_required'});
  const navigation=await evaluate(`(() => {
    activeGateId='gate-1';renderGate();openAuditPageCard('card-22-hub');
    const row=findCard('card-22-hub').pageRows[0];
    row.contextFields.catalogRelatedPageRefsV3=[{pageKey:'fixed:about'}];
    renderGate();openAuditPageCard('card-22-hub');
    const button=document.querySelector('[data-page-source-card="card-22-hub"] [data-guru-catalog-platform-v3="fixed:about"]');
    if(!button)return {button:false};
    button.click();
    return {button:true,gate:activeGateId};
  })()`);
  assert.deepEqual(navigation,{button:true,gate:'gate-0'});
  await waitFor(`!!document.querySelector('[data-mega-url-group="fixed"][data-mega-url-id="about"]')`);
  assert.deepEqual(runtimeErrors,[]);
  writeFileSync(`${out}/result.json`,JSON.stringify({setup,check:{...check,emptyHtml:undefined,categoryHtml:undefined},
    interaction,sync,navigation,pickerShot,pendingShot,emptyHeadingEdit,wide,runtimeErrors,shots:['01-hub','02-category','03-empty-suggestions','04-missing-platform-url','05-unmatched','06-pagination-15','07-picker-open','08-picker-selected','09-manual-approved']},null,2));
  console.log(JSON.stringify({matched:1,unmatched:1,interaction,sync,navigation,pickerShot,pendingShot,emptyHeadingEdit,wide,consoleErrors:runtimeErrors.length,shots:9}));
} finally {
  page.close();
  await browser.call('Target.disposeBrowserContext',{browserContextId});
  browser.close();
}
