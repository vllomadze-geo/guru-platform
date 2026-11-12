import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const source = JSON.parse(readFileSync(process.env.GURU_GATE1_EXPORT || '/Users/vl/Downloads/gate-1.json', 'utf8'));
const fixture = JSON.parse(JSON.stringify({ content: {
  project: source.content.project, projectComparison: source.content.projectComparison,
  painV130: source.content.painV130, unitV130: source.content.unitV130,
  unitEconomicsRoute: source.content.unitEconomicsRoute,
}, structure: source.structure }, (_key, value) => typeof value === 'string' && value.startsWith('data:image/')
  ? '[image omitted for isolated test]' : value));
const productId = 'catalog-item-1786792591872-51f503';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:41323/';
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || '49337';

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data), task = this.pending.get(message.id);
      if (!task) return;
      this.pending.delete(message.id); clearTimeout(task.timer);
      message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id, timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 60000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const tabs = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async expression => {
  const result = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};

try {
  await page.call('Runtime.enable'); await page.call('Page.enable');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1720, height: 1050, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.navigate', { url: appUrl });
  for (let attempt = 0; attempt < 200; attempt++) {
    if (await evaluate('document.readyState === "complete" && typeof g1ProductComparisonCompactHtml === "function"')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();true');
  const initial = await evaluate(`(() => {
    state=createFreshWorkspace({id:'product-comparison-parity',name:'Проверка сравнения'});
    const imported=${JSON.stringify(fixture)};
    for(const [key,value] of Object.entries(imported.content)) state[key]=structuredClone(value);
    state.gates[state.gates.findIndex(g=>g.id==='gate-1')]=structuredClone(imported.structure);
    state.project.id='product-comparison-parity';activeProjectId=state.project.id;
    activeView='gate';activeGateId='gate-1';guruV194Ensure(state);
    els.launcher.hidden=true;els.appShell.hidden=false;document.body.classList.remove('access-locked');updateProjectChrome();
    const pid=${JSON.stringify(productId)}, product=guruV194Product(pid,state),entry=ensureProjectComparisonProduct(pid);
    const ownRow=g3ProductJourneyPageSource(product).row;
    ownRow.productGalleryPhotos=[{id:'comparison-own-photo',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg=='}];
    ownRow.productGalleryMainPhotoId='comparison-own-photo';
    const jtbds=g1BergenMigrateV543(entry,product).jtbds;
    entry.open=true;
    entry.keywordRelevanceByPhraseV549={};
    entry.searchFinishedPhraseKeysV601=[];
    const base=structuredClone(entry.competitors[0]);
    entry.competitors=Array.from({length:8},(_,index)=>({ ...structuredClone(base),id:'parity-'+index,
      name:'Конкурент '+index,domain:'competitor'+index+'.example',siteDomainV538:'competitor'+index+'.example',
      foundPhraseKeysV539:index<4?[jtbds[0].phrases[0].key]:[],
      bergenV543:{...structuredClone(base.bergenV543), similarity:index<4&&index!==3?'yes':'no',
        landingUrl:'https://competitor'+index+'.example/item',
        product:'Описание конкурента '+index,price:String(700+index),cta:'Купить',
        searchPreviewV569:{...structuredClone(base.bergenV543.searchPreviewV569||{}),
          image:index===3?ownRow.productGalleryPhotos[0].dataUrl:''}} }));
    window.__comparison={pid,product,entry,companyBefore:JSON.stringify(state.projectComparison.competitors),
      idsBefore:entry.competitors.map(row=>row.id), firstPhrase:g1ProductComparisonCurrent({jtbds,entry,screen:g1ProductComparisonScreen(pid)}).current.key};
    flashSaving=()=>{};guruPersistStateFast=()=>true;saveState=()=>true;
    const before=JSON.stringify(entry), start=performance.now();
    els.contentArea.innerHTML=projectComparisonProductHtml(product);
    return {renderMs:Math.round(performance.now()-start),sameData:before===JSON.stringify(entry),
      guide:!!document.querySelector('[data-g1pc-guide]'),grid:!!document.querySelector('[data-g1pc-grid]'),
      table:!!document.querySelector('.g1bp-table-v543'),jtbds:jtbds.length,phrases:g1ProductComparisonPhrases(jtbds).length,
      columns:document.querySelectorAll('[data-g1pc-column]').length,
      ownHeaderEmpty:document.querySelector('[data-g1pc-grid] .g1-company-compare-own > header')?.textContent.trim()==='',
      previewHeadings:[...document.querySelectorAll('[data-g1pc-grid] > .g1-company-compare-column > .g1-company-compare-section:first-of-type h4')].map(node=>node.textContent.trim()),
      ownPreviewNoteAbsent:!document.querySelector('[data-g1pc-grid] .g1-company-compare-own .g1bp-serp-v569 > small'),
      companyUnchanged:window.__comparison.companyBefore===JSON.stringify(state.projectComparison.competitors),
      htmlValid:!!document.querySelector('[data-g1pc-unified] .g1pc-unified-comparison .g1bp-table-v543'),
      unified:document.querySelectorAll('[data-g1pc-unified] .g1pc-unified-comparison').length===1,
      duplicatedHeadings:document.querySelectorAll('[data-g1pc-unified] .g1bp-toolbar-v543, [data-g1pc-unified] [data-g1pc-detailed]').length,
      duplicatePreviewRows:document.querySelectorAll('.g1bp-table-v543 .g1bp-search-row-v570, .g1bp-table-v543 .g1bp-landing-row-v575').length,
      duplicateJtbdRows:document.querySelectorAll('.g1bp-table-v543 [data-g1bp-row-v543="Задача (JTBD)"]').length,
      jtbdContexts:document.querySelectorAll('[data-g1pc-grid] .g1pc-jtbd-context').length,
      uniqueCriteria:!!document.querySelector('.g1bp-table-v543 [data-g1bp-row-v543="Тип бизнеса"]'),
      comparisonRowsAligned:(()=>{const columns=[...document.querySelectorAll('[data-g1pc-grid] > .g1-company-compare-column')];
        if(columns.length!==2)return false;
        return [0,1].every(index=>{const sections=columns.map(column=>column.querySelectorAll(':scope > .g1-company-compare-section')[index]?.getBoundingClientRect());
          return sections.every(Boolean)&&Math.abs(sections[0].top-sections[1].top)<2&&Math.abs(sections[0].bottom-sections[1].bottom)<2;});})(),
      matchLayout:(()=>{const card=document.querySelector('.g1pc-guide .g1pc-match');
        const identity=card.querySelector('.g1pc-match-identity').getBoundingClientRect();
        const similarity=card.querySelector('.g1pc-type-label').getBoundingClientRect();
        const actions=card.querySelector('.g1pc-match-actions').getBoundingClientRect();
        return {columns:getComputedStyle(card).gridTemplateColumns.split(' ').length,
          aligned:Math.abs(identity.top+identity.height/2-similarity.top-similarity.height/2)<2&&
            Math.abs(identity.top+identity.height/2-actions.top-actions.height/2)<2,
          positions:{identity:[identity.top,identity.height],similarity:[similarity.top,similarity.height],actions:[actions.top,actions.height]},
          editVisible:card.querySelector('[data-g1pc-competitor-toggle]').getClientRects().length>0,
          fits:card.scrollWidth<=card.clientWidth+1};})()};
  })()`);
  assert(initial.guide && initial.grid && initial.table && initial.htmlValid && initial.unified &&
    initial.duplicatedHeadings===0 && initial.columns === 1 && initial.comparisonRowsAligned && initial.ownHeaderEmpty &&
    initial.previewHeadings.length===2 && initial.previewHeadings.every(text=>text==='Мини-версия поисковой выдачи') && initial.ownPreviewNoteAbsent,
    `Product workspace missing: ${JSON.stringify(initial)}`);
  assert(initial.sameData && initial.companyUnchanged && initial.phrases > 0 &&
    !initial.duplicatePreviewRows && !initial.duplicateJtbdRows &&
    initial.jtbdContexts===initial.jtbds && initial.uniqueCriteria, `Render changed data: ${JSON.stringify(initial)}`);
  assert(initial.matchLayout.columns===3 && initial.matchLayout.aligned &&
    initial.matchLayout.editVisible && initial.matchLayout.fits, JSON.stringify(initial.matchLayout));
  if (process.env.GURU_CAPTURE_UNIFIED_COMPARISON === '1') {
    await evaluate(`(async()=>{document.querySelector('.g1pc-unified-comparison').scrollIntoView({block:'start',behavior:'instant'});
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));})()`);
    const shot=await page.call('Page.captureScreenshot',{format:'png'});
    writeFileSync('/private/tmp/gate1-product-unified-comparison.png',Buffer.from(shot.data,'base64'));
  }
  const ownLanding = await evaluate(`(() => {
    const root=document.querySelector('[data-g1bp-product-v543]');
    const own=()=>root.querySelector('.g1-company-compare-own [data-g1bp-landing-v575="own"]');
    const layout=landing=>{const photo=landing.querySelector('.g1bp-landing-photo-v575').getBoundingClientRect();
      const content=landing.querySelector('.g1bp-landing-content-v575').getBoundingClientRect();
      return {photoLeft:photo.right<=content.left+1,
        aligned:Math.abs(photo.top-content.top)<2,
        photoVisible:photo.width>=100&&photo.height>=150,
        contentVisible:content.width>=100,
        fits:landing.scrollWidth<=landing.clientWidth+1};};
    const competitorLanding=id=>{const column=root.querySelector('[data-g1pc-column="'+id+'"]');
      const landing=column?.querySelector('[data-g1pc-landing-readonly]');
      if(!landing)return {exists:false};
      const fields=[...landing.querySelector('.g1bp-landing-content-v575').children];
      const photo=landing.querySelector('.g1bp-landing-photo-v575');
      return {exists:true,labels:fields.map(field=>field.querySelector('small')?.textContent),
        name:landing.querySelector('[data-g1pc-landing-name]')?.textContent,
        about:landing.querySelector('[data-g1pc-landing-about]')?.textContent,
        cta:landing.querySelector('[data-g1pc-landing-ctas]')?.textContent,
        price:landing.querySelector('[data-g1pc-landing-price]')?.textContent,
        address:landing.querySelector('[data-g1pc-landing-address]')?.textContent,
        image:photo.querySelector('img')?.src||'',
        ordered:fields.every((element,index,array)=>index===0||
          element.getBoundingClientRect().top>=array[index-1].getBoundingClientRect().top),
        layout:layout(landing),
        fits:landing.scrollWidth<=landing.clientWidth+1,
        editable:!!landing.querySelector('input,textarea,button')};};
    const read=()=>{const landing=own(),content=landing.querySelector('.g1bp-landing-content-v575');
      const fields=[...content.children],photo=landing.querySelector('[data-g1bp-landing-photo-v575="own"]');
      const row=g3ProductJourneyPageSource(window.__comparison.product).row;
      const search=root.querySelector('.g1-company-compare-own .g1bp-serp-v569');
      return {labels:fields.map(field=>field.querySelector('small')?.textContent),
        name:fields[0].querySelector('h4')?.textContent,
        expectedName:row.h1||window.__comparison.product.name,
        about:fields[1].querySelector('p')?.textContent,
        expectedAbout:row.contextFields?.productMeaningV253||row.contextFields?.productHeroShortDescriptionV254||'Не указано',
        cta:fields[2].textContent,price:fields[3].textContent,
        searchTitle:search.querySelector('.g1bp-serp-title-v569')?.textContent,
        searchDescription:search.querySelector('.g1bp-serp-description-v569')?.textContent,
        searchPrice:search.querySelector('.g1bp-serp-price-v569')?.textContent,
        searchPhotoEditable:!!search.querySelector('input[type="file"]'),
        image:photo.querySelector('img')?.src,sourceImage:row.productGalleryPhotos[0].dataUrl,
        ordered:fields.every((element,index,array)=>index===0||
          element.getBoundingClientRect().top>=array[index-1].getBoundingClientRect().top),
        layout:layout(landing),
        fits:landing.scrollWidth<=landing.clientWidth+1,
        site:!!landing.querySelector('.g1bp-landing-site-v575')};};
    const initial=read(),initialCompetitor=competitorLanding('parity-0');
    root.querySelector('[data-g1pc-filter="substitute"]').click();
    const substitute={pressed:root.querySelector('[data-g1pc-filter="substitute"]').getAttribute('aria-pressed'),
      competitor:root.querySelectorAll('[data-g1pc-column]').length,landing:read(),
      competitorLanding:competitorLanding('parity-3')};
    root.querySelector('[data-g1pc-filter=""]').click();
    const all=read();
    const row=g3ProductJourneyPageSource(window.__comparison.product).row;
    const before=row.contextFields.productMeaningV253,priceBefore=row.contextFields.productPrice;
    const titleBefore=row.title,descriptionBefore=row.description,buttonsBefore=row.contextFields.productButtons;
    row.contextFields.productMeaningV253='Обновлённое описание для проверки синхронизации';
    row.contextFields.productPrice='1 234';
    row.title='Обновлённый заголовок поиска';
    row.description='Обновлённое описание поиска';
    row.contextFields.productButtons='Купить сейчас • Узнать больше';
    g1ProductComparisonRefresh(root,'grid');
    const changed=read();
    row.contextFields.productMeaningV253=before;row.contextFields.productPrice=priceBefore;
    row.title=titleBefore;row.description=descriptionBefore;row.contextFields.productButtons=buttonsBefore;
    g1ProductComparisonRefresh(root,'grid');
    const restored=read();
    const second=state.project.catalogItemsV189.find(product=>product.id!==window.__comparison.pid&&
      String(g3ProductJourneyPageSource(product).row?.contextFields?.productMeaningV253||
        g3ProductJourneyPageSource(product).row?.contextFields?.productHeroShortDescriptionV254||'').trim());
    const secondRow=g3ProductJourneyPageSource(second).row;
    els.contentArea.innerHTML=projectComparisonProductHtml(second);
    const secondLanding=document.querySelector('.g1-company-compare-own [data-g1bp-landing-v575="own"]');
    const other={name:secondLanding.querySelector('.g1bp-landing-content-v575 h4')?.textContent,
      about:secondLanding.querySelector('.g1bp-landing-content-v575 > :nth-child(2) p')?.textContent,
      expectedName:secondRow.h1||second.name,
      expectedAbout:secondRow.contextFields?.productMeaningV253||secondRow.contextFields?.productHeroShortDescriptionV254||'Не указано'};
    els.contentArea.innerHTML=projectComparisonProductHtml(window.__comparison.product);
    return {initial,initialCompetitor,substitute,all,changed,restored,other};
  })()`);
  assert.deepEqual(ownLanding.initial.labels,['Наименование продукта/услуги','О продукте','CTA','Цена']);
  assert(ownLanding.initial.name===ownLanding.initial.expectedName &&
    ownLanding.initial.about===ownLanding.initial.expectedAbout &&
    ownLanding.initial.searchTitle && ownLanding.initial.searchDescription &&
    !ownLanding.initial.searchPhotoEditable &&
    ownLanding.initial.ordered && ownLanding.initial.fits && ownLanding.initial.site &&
    ownLanding.initial.layout.photoLeft && ownLanding.initial.layout.aligned &&
    ownLanding.initial.layout.photoVisible && ownLanding.initial.layout.contentVisible &&
    ownLanding.initial.image===ownLanding.initial.sourceImage && ownLanding.substitute.pressed==='true' &&
    ownLanding.substitute.competitor===1 && ownLanding.substitute.landing.about===ownLanding.initial.about &&
    ownLanding.all.about===ownLanding.initial.about &&
    ownLanding.changed.about==='Обновлённое описание для проверки синхронизации' &&
    ownLanding.changed.price.includes('1 234') && ownLanding.changed.searchPrice.includes('1 234') &&
    ownLanding.changed.searchTitle==='Обновлённый заголовок поиска' &&
    ownLanding.changed.searchDescription==='Обновлённое описание поиска' &&
    ownLanding.changed.cta.includes('Купить сейчас') && ownLanding.changed.cta.includes('Узнать больше') &&
    ownLanding.restored.about===ownLanding.initial.about &&
    ownLanding.other.name===ownLanding.other.expectedName && ownLanding.other.about===ownLanding.other.expectedAbout &&
    ownLanding.other.about!==ownLanding.initial.about,
    JSON.stringify(ownLanding));
  assert.deepEqual(ownLanding.initialCompetitor.labels,['Наименование продукта/услуги','О продукте','CTA','Цена']);
  assert(ownLanding.initialCompetitor.exists && ownLanding.initialCompetitor.ordered &&
    ownLanding.initialCompetitor.layout.photoLeft && ownLanding.initialCompetitor.layout.aligned &&
    ownLanding.initialCompetitor.layout.photoVisible && ownLanding.initialCompetitor.layout.contentVisible &&
    ownLanding.initialCompetitor.fits && !ownLanding.initialCompetitor.editable &&
    ownLanding.initialCompetitor.about==='Описание конкурента 0' &&
    ownLanding.initialCompetitor.cta==='Купить' && ownLanding.initialCompetitor.price==='700 ₽' &&
    ownLanding.initialCompetitor.address==='https://competitor0.example/item' &&
    ownLanding.substitute.competitorLanding.exists && ownLanding.substitute.competitorLanding.ordered &&
    ownLanding.substitute.competitorLanding.layout.photoLeft &&
    ownLanding.substitute.competitorLanding.about==='Описание конкурента 3' &&
    ownLanding.substitute.competitorLanding.price==='703 ₽' &&
    ownLanding.substitute.competitorLanding.image===ownLanding.initial.sourceImage,
    JSON.stringify(ownLanding));
  const liveCardEdit = await evaluate(`(async () => {
    const product=window.__comparison.product,source=g3ProductJourneyPageSource(product);
    const index=source.card.pageRows.indexOf(source.row),before=source.row.h1;
    const input=document.createElement('input');
    input.dataset.goatProductRowFieldV514='h1';
    input.dataset.goatProductCardIdV514=source.card.id;
    input.dataset.goatProductPageIndexV514=String(index);
    document.body.append(input);
    input.value='Название из изменённой карточки';
    input.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const changed=document.querySelector('.g1-company-compare-own [data-g1bp-landing-v575="own"] h4')?.textContent;
    input.value=before;
    input.dispatchEvent(new Event('input',{bubbles:true}));
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const restored=document.querySelector('.g1-company-compare-own [data-g1bp-landing-v575="own"] h4')?.textContent;
    input.remove();
    return {changed,restored,source:source.row.h1};
  })()`);
  assert(liveCardEdit.changed==='Название из изменённой карточки' &&
    liveCardEdit.restored===liveCardEdit.source,JSON.stringify(liveCardEdit));
  if (process.env.GURU_CAPTURE_OWN_LANDING === '1') {
    await evaluate(`(async () => {
      const root=document.querySelector('[data-g1bp-product-v543]');
      root.querySelector('[data-g1pc-filter="substitute"]').click();
      root.querySelector('.g1-company-compare-own [data-g1bp-landing-v575="own"]').scrollIntoView({block:'center'});
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    })()`);
    const shot=await page.call('Page.captureScreenshot',{format:'png'});
    writeFileSync('/private/tmp/guru-own-landing.png',Buffer.from(shot.data,'base64'));
    await evaluate(`document.querySelector('[data-g1pc-filter=""]').click();true`);
  }
  const actions = await evaluate(`(() => {
    const root=document.querySelector('[data-g1bp-product-v543]'),entry=window.__comparison.entry;
    const disclosure=[];const mark=step=>disclosure.push([step,!!root.querySelector('.g1pc-unified-comparison .g1bp-table-v543')]);
    mark('start');
    root.querySelector('[data-g1pc-filter="direct"]').click();
    mark('filter');
    const filtered={count:root.querySelectorAll('[data-g1pc-column]').length,pressed:root.querySelector('[data-g1pc-filter="direct"]').getAttribute('aria-pressed')};
    root.querySelector('[data-g1pc-filter=""]').click();
    mark('all');
    root.querySelector('[data-g1pc-page-next]').click();
    mark('page');
    const page={names:[...root.querySelectorAll('[data-g1pc-column] header strong')].map(node=>node.textContent),
      detailCount:root.querySelectorAll('.g1bp-table-v543 thead [data-g1bp-head-v543]').length,
      ownAbout:root.querySelector('.g1-company-compare-own [data-g1bp-landing-v575="own"] .g1bp-landing-content-v575 > :nth-child(2) p')?.textContent};
    root.querySelector('[data-g1pc-nav-toggle]').click();
    mark('nav');
    const navOpen=!root.querySelector('[data-g1pc-nav-list]').hidden;
    root.querySelector('[data-g1pc-nav-option]').click();
    mark('nav-option');
    root.querySelector('[data-g1pc-finish]').click();
    mark('finish');
    const finish=entry.searchFinishedPhraseKeysV601.includes(window.__comparison.firstPhrase);
    const match=root.querySelector('[data-g1pc-match]');match.checked=!match.checked;
    match.dispatchEvent(new Event('change',{bubbles:true}));
    mark('match');
    const sync=entry.competitors[0].foundPhraseKeysV539.includes(window.__comparison.firstPhrase)===match.checked;
    return {filtered,page,navOpen,finish,sync,disclosure,detailOpen:!!root.querySelector('.g1pc-unified-comparison .g1bp-table-v543'),
      companyUnchanged:window.__comparison.companyBefore===JSON.stringify(state.projectComparison.competitors),
      idsSame:JSON.stringify(window.__comparison.idsBefore)===JSON.stringify(entry.competitors.map(row=>row.id))};
  })()`);
  assert(actions.filtered.count > 0 && actions.filtered.count <= 3 && actions.filtered.pressed === 'true', JSON.stringify(actions));
  assert(actions.page.detailCount === 8 && actions.page.names.some(name => name.includes('1')) &&
    actions.page.ownAbout===ownLanding.initial.about, JSON.stringify(actions));
  assert(actions.navOpen && actions.finish && actions.sync && actions.companyUnchanged && actions.idsSame, JSON.stringify(actions));
  if (process.env.GURU_CAPTURE_PRODUCT_COMPARISON === '1') {
    await evaluate(`(async()=>{const root=document.querySelector('[data-g1bp-product-v543]');
      root.querySelector('[data-g1pc-form-toggle]').click();
      root.querySelector('[data-g1pc-form]').scrollIntoView({block:'start',behavior:'instant'});
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      return true;})()`);
    const shot = await page.call('Page.captureScreenshot', { format:'png' });
    writeFileSync('/private/tmp/gate1-product-comparison-draft.png',Buffer.from(shot.data,'base64'));
    await evaluate(`document.querySelector('[data-g1pc-form-toggle]').click();true`);
  }
  const editing = await evaluate(`(async() => {
    const root=document.querySelector('[data-g1bp-product-v543]'),entry=window.__comparison.entry;
    root.querySelector('[data-g1pc-form-toggle]').click();
    const form=root.querySelector('[data-g1pc-form]');
    const fields=[form.elements.title,form.elements.description,form.elements.product,form.elements.cta];
    const sizes=()=>fields.map(field=>({height:field.getBoundingClientRect().height,scroll:field.scrollHeight,client:field.clientHeight}));
    const initialSizes=sizes();
    fields.forEach(field=>{field.value='Длинный текст для проверки высоты поля.\\n'.repeat(4);field.dispatchEvent(new Event('input',{bubbles:true}));});
    const expandedSizes=sizes();
    root.querySelector('[data-g1pc-form-toggle]').click();
    root.querySelector('[data-g1pc-form-toggle]').click();
    const reopenedSizes=sizes();
    fields.forEach(field=>{field.value='';field.dispatchEvent(new Event('input',{bubbles:true}));});
    const draftSizing={initial:initialSizes,expanded:expandedSizes,reopened:reopenedSizes,
      initialVisible:initialSizes.every((size,index)=>size.height>=(index===3?34:42)),
      expandedVisible:expandedSizes.every((size,index)=>size.height>initialSizes[index].height+8&&size.scroll<=size.client+2),
      reopenedVisible:reopenedSizes.every((size,index)=>size.height>=expandedSizes[index].height-2&&size.scroll<=size.client+2)};
    form.elements.domain.value='new-product-competitor.example';
    form.elements.title.value='Новый конкурент в поиске';
    form.elements.description.value='Описание нового конкурента в выдаче';
    form.elements.rating.value='4.6';
    form.elements.reviews.value='23';
    form.elements.name.value='Новый конкурент';
    form.elements.landingUrl.value='https://new-product-competitor.example/item';
    const landingPrice=form.querySelector('[data-g1pc-draft-price-mirror]');
    landingPrice.value='2500';landingPrice.dispatchEvent(new Event('input',{bubbles:true}));
    form.elements.cta.value='Купить';
    const addDraftCta=form.querySelector('[data-g1pc-draft-cta-add]');
    addDraftCta.click();
    let draftExtra=form.querySelector('[data-g1pc-draft-cta-extra]');
    draftExtra.value='Временная кнопка';
    draftExtra.closest('.g1pc-draft-cta-extra-row').querySelector('[data-g1pc-draft-cta-remove]').click();
    addDraftCta.click();
    draftExtra=form.querySelector('[data-g1pc-draft-cta-extra]');
    draftExtra.value='Узнать больше';
    draftExtra.dispatchEvent(new Event('input',{bubbles:true}));
    const draftCtaReady=form.querySelectorAll('[data-g1pc-draft-cta-extra]').length===1&&
      draftExtra.value==='Узнать больше';
    form.elements.product.value='Описание нового конкурента';
    form.elements.similarity.value='yes';
    const searchFields=[...form.querySelectorAll('.g1pc-search-card .g1pc-preview-field')].map(node=>node.querySelector(':scope > span')?.textContent);
    const landingFields=[...form.querySelectorAll('.g1pc-landing-preview .g1bp-landing-content-v575 > *')].map(node=>node.querySelector('small')?.textContent);
    const visualOrder=(selectors)=>{const tops=selectors.map(selector=>form.querySelector(selector)?.getBoundingClientRect().top);
      return tops.every((top,index)=>Number.isFinite(top)&&(index===0||top>=tops[index-1]));};
    const draftOrder=visualOrder(['.g1pc-preview-title','.g1pc-preview-domain','.g1pc-search-card .g1pc-preview-field:nth-child(3)',
      '.g1pc-search-card .g1pc-preview-field:nth-child(4)','.g1pc-search-card .g1pc-preview-field:nth-child(5)',
      '.g1pc-search-card .g1pc-preview-field:nth-child(6)','.g1pc-preview-photo','.g1pc-preview-similarity'])&&
      visualOrder(['.g1pc-landing-preview .g1bp-landing-content-v575 > :nth-child(1)',
        '.g1pc-landing-preview .g1bp-landing-content-v575 > :nth-child(2)',
        '.g1pc-landing-preview .g1bp-landing-content-v575 > :nth-child(3)',
        '.g1pc-landing-preview .g1bp-landing-content-v575 > :nth-child(4)']);
    const draftPhoto=form.querySelector('.g1pc-landing-preview .g1bp-landing-photo-v575').getBoundingClientRect();
    const draftContent=form.querySelector('.g1pc-landing-preview .g1bp-landing-content-v575').getBoundingClientRect();
    const draftTwoColumn=draftPhoto.right<=draftContent.left+1&&Math.abs(draftPhoto.top-draftContent.top)<2;
    const draftLanding=!!form.querySelector('.g1pc-draft-landing [data-g1bp-landing-v575]');
    const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg=='),char=>char.charCodeAt(0));
    const transfer=new DataTransfer();transfer.items.add(new File([bytes],'draft.png',{type:'image/png'}));
    form.elements.photo.files=transfer.files;
    form.elements.photo.dispatchEvent(new Event('change',{bubbles:true}));
    const previewStart=performance.now();
    while(performance.now()-previewStart<3000 && !form.querySelector('.g1pc-draft-landing .g1bp-landing-photo-v575 img'))
      await new Promise(resolve=>setTimeout(resolve,20));
    const draftPhotoPreview=!!form.querySelector('.g1pc-draft-landing .g1bp-landing-photo-v575 img')&&
      !!form.querySelector('.g1pc-search-card .g1bp-landing-photo-v575 img');
    form.requestSubmit();
    const saveStart=performance.now();
    while(performance.now()-saveStart<5000 && (entry.competitors.length<9 || form.isConnected))
      await new Promise(resolve=>setTimeout(resolve,30));
    const added=entry.competitors.at(-1),add={count:entry.competitors.length,
      name:added.name,found:added.foundPhraseKeysV539.includes(window.__comparison.firstPhrase),
      draftLanding,draftPhotoPreview,draftOrder,draftTwoColumn,searchFields,landingFields,photoSaved:/^data:image\\//.test(added.bergenV543.searchPreviewV569?.image||''),
      price:added.bergenV543.price,cta:added.bergenV543.cta,
      additionalCtas:added.bergenV543.additionalCtasV576,draftCtaReady,
      compactCtas:g1BergenCompetitorLandingV575(added,{productComparison:true,readOnly:true}),
      description:g1BergenCompetitorSearchDataV569(added).description,
      rating:added.bergenV543.searchPreviewV569.rating,reviews:added.bergenV543.searchPreviewV569.reviews,
      product:added.bergenV543.product,landingUrl:added.bergenV543.landingUrl,
      detailed:root.querySelectorAll('.g1bp-table-v543 thead [data-g1bp-head-v543]').length};
    root.querySelector('[data-g1pc-form-toggle]').click();
    const existingForm=root.querySelector('[data-g1pc-form]');
    existingForm.elements.domain.value='new-product-competitor.example';
    existingForm.requestSubmit();
    const mergeStart=performance.now();
    while(performance.now()-mergeStart<3000 && existingForm.isConnected)
      await new Promise(resolve=>setTimeout(resolve,20));
    const mergePreserved=entry.competitors.length===9&&added.bergenV543.searchPreviewV569.rating==='4.6'&&
      added.bergenV543.searchPreviewV569.reviews==='23';
    const compact=root.querySelector('[data-g1pc-column] [data-g1bp-field-v543="positioning"]');
    compact.value='Синхронное позиционирование';compact.dispatchEvent(new Event('input',{bubbles:true}));
    const peers=[...root.querySelectorAll('[data-g1bp-field-v543="positioning"][data-g1bp-competitor-v543="'+compact.dataset.g1bpCompetitorV543+'"]')];
    const fieldSync=peers.length===1&&peers[0].value==='Синхронное позиционирование'&&
      entry.competitors.some(row=>row.id===compact.dataset.g1bpCompetitorV543&&row.bergenV543.positioning==='Синхронное позиционирование');
    const rating=root.querySelector('[data-g1pc-guide] [data-g1bp-relevance-v549]');
    rating.value='high';rating.dispatchEvent(new Event('change',{bubbles:true}));
    root.querySelector('[data-g1pc-show]').click();
    const selected=window.__comparison.firstPhrase;
    const phraseButtons=[...root.querySelectorAll('[data-g1bp-select-keyword-v550]')]
      .filter(button=>button.dataset.g1bpKeywordKeyV550===selected);
    return {add,draftSizing,mergePreserved,fieldSync,rating:entry.keywordRelevanceByPhraseV549[window.__comparison.firstPhrase],
      keywordSync:phraseButtons.length>0&&phraseButtons.every(button=>button.getAttribute('aria-pressed')==='true'),
      companyUnchanged:window.__comparison.companyBefore===JSON.stringify(state.projectComparison.competitors)};
  })()`);
  assert(editing.draftSizing.initialVisible && editing.draftSizing.expandedVisible && editing.draftSizing.reopenedVisible,
    JSON.stringify(editing.draftSizing));
  assert(editing.add.count===9 && editing.add.name==='Новый конкурент' && editing.add.found && editing.add.detailed===9 &&
    editing.add.draftLanding && editing.add.draftPhotoPreview && editing.add.draftOrder &&
    editing.add.draftTwoColumn && editing.add.photoSaved &&
    editing.add.price==='2500' && editing.add.cta==='Купить' &&
    editing.add.draftCtaReady && JSON.stringify(editing.add.additionalCtas)===JSON.stringify(['Узнать больше']) &&
    editing.add.compactCtas.includes('Купить') && editing.add.compactCtas.includes('Узнать больше') &&
    editing.add.description==='Описание нового конкурента в выдаче' &&
    editing.add.rating==='4.6' && editing.add.reviews==='23' &&
    JSON.stringify(editing.add.searchFields)===JSON.stringify(['Заголовок в выдаче','Домен','Описание','Рейтинг ★','Количество отзывов','Цена','Похожесть предложения']) &&
    JSON.stringify(editing.add.landingFields)===JSON.stringify(['Наименование продукта/услуги','О продукте','CTA','Цена']) &&
    editing.add.product==='Описание нового конкурента' && editing.add.landingUrl==='https://new-product-competitor.example/item',
    JSON.stringify(editing));
  assert(editing.mergePreserved && editing.fieldSync && editing.rating==='high' && editing.keywordSync && editing.companyUnchanged, JSON.stringify(editing));
  const panel = await evaluate(`(async () => {
    const root=document.querySelector('[data-g1bp-product-v543]'),entry=window.__comparison.entry;
    const page=root.querySelector('[data-g1pc-page-select]');page.value='0';page.dispatchEvent(new Event('change',{bubbles:true}));
    const guide=root.querySelector('[data-g1pc-guide]');
    const toggle=root.querySelector('[data-g1pc-competitor-toggle="parity-0"]');toggle.click();
    const localToggle=guide.isConnected&&toggle.isConnected&&toggle.getAttribute('aria-expanded')==='true';
    const pane=root.querySelector('[data-g1pc-match-panel="parity-0"]');
    const name=pane.querySelector('[data-g1bp-name-v543]');
    name.value='Обновлённый конкурент';name.dispatchEvent(new Event('input',{bubbles:true}));
    name.dispatchEvent(new Event('change',{bubbles:true}));
    const phrase=pane.querySelectorAll('[data-g1bp-found-keyword-v550]')[1];
    phrase.checked=true;phrase.dispatchEvent(new Event('change',{bubbles:true}));
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const current=root.querySelector('[data-g1pc-match-panel="parity-0"]');
    const edit=(selector,value)=>{const field=current.querySelector(selector);field.value=value;
      field.dispatchEvent(new Event('input',{bubbles:true}));return field;};
    edit('[data-g1bp-ad-part-v572="title"]','Единый заголовок');
    edit('[data-g1bp-ad-part-v572="description"]','Единое описание');
    edit('[data-g1bp-field-v543="landingUrl"]','https://landing.example/product');
    edit('[data-g1bp-search-field-v569="rating"]','4.8');
    edit('[data-g1bp-search-field-v569="reviews"]','12');
    edit('[data-g1bp-field-v543="price"]','1900');
    edit('[data-g1bp-landing-v575] [data-g1bp-field-v543="price"]','1950');
    current.querySelector('[data-g1bp-cta-add-v576]').click();
    edit('[data-g1bp-cta-index-v576="0"]','Заказать');
    edit('[data-g1bp-field-v543="product"]','Уникальное описание продукта');
    const compactLanding=root.querySelector('[data-g1pc-column="parity-0"] [data-g1pc-landing-readonly]');
    const compactLandingSynced=compactLanding.querySelector('[data-g1pc-landing-name]').textContent==='Обновлённый конкурент'&&
      compactLanding.querySelector('[data-g1pc-landing-about]').textContent==='Уникальное описание продукта'&&
      compactLanding.querySelector('[data-g1pc-landing-price]').textContent==='1950 ₽'&&
      compactLanding.querySelector('[data-g1pc-landing-address]').textContent==='https://landing.example/product'&&
      compactLanding.querySelector('[data-g1pc-landing-ctas]').textContent.includes('Заказать');
    const preview=root.querySelector('[data-g1bp-serp-readonly-v569][data-g1bp-serp-v569="parity-0"]');
    const searchData=g1BergenCompetitorSearchDataV569(entry.competitors[0]);
    const growthFields=['[data-g1bp-ad-part-v572="title"]','[data-g1bp-ad-part-v572="description"]',
      '[data-g1bp-field-v543="product"]','[data-g1bp-cta-index-v576="0"]'].map(selector=>current.querySelector(selector));
    const originalValues=growthFields.map(field=>field.value);
    const fieldHeights=()=>growthFields.map(field=>({height:field.getBoundingClientRect().height,scroll:field.scrollHeight,client:field.clientHeight}));
    const beforeGrowth=fieldHeights();
    growthFields.forEach(field=>{field.value='Проверка длинного текста. '.repeat(40);field.dispatchEvent(new Event('input',{bubbles:true}));});
    const afterGrowth=fieldHeights();
    growthFields.forEach((field,index)=>{field.value=originalValues[index];field.dispatchEvent(new Event('input',{bubbles:true}));});
    const editSizing={before:beforeGrowth,after:afterGrowth,
      visible:beforeGrowth.every((size,index)=>size.height>=(index===3?30:42)),
      grows:afterGrowth.every((size,index)=>size.height>beforeGrowth[index].height+8&&size.scroll<=size.client+2)};
    return {open:!!current,localToggle,compactLandingSynced,editSizing,phraseCount:current?.querySelectorAll('[data-g1bp-found-keyword-v550]').length,
      searchTitleInputs:root.querySelectorAll('[data-g1bp-ad-part-v572="title"][data-g1bp-competitor-v543="parity-0"]').length,
      searchPhotoInputs:root.querySelectorAll('[data-g1bp-search-photo-v569][data-g1bp-competitor-v543="parity-0"]').length,
      landingPhotoInput:!!current.querySelector('[data-g1bp-landing-v575] [data-g1bp-search-photo-v569]'),
      searchPhotoInput:!!current.querySelector('[data-g1bp-serp-v569] [data-g1bp-search-photo-v569]'),
      priceInputs:root.querySelectorAll('[data-g1bp-field-v543="price"][data-g1bp-competitor-v543="parity-0"]').length,
      priceValues:[...current.querySelectorAll('[data-g1bp-field-v543="price"]')].map(input=>input.value),
      landingPriceInput:!!current.querySelector('[data-g1bp-landing-v575] [data-g1bp-field-v543="price"]'),
      domainInputs:root.querySelectorAll('[data-g1bp-domain-v543="parity-0"]').length,
      nameInputs:root.querySelectorAll('[data-g1bp-name-v543="parity-0"]').length,
      landingNameInput:!!current.querySelector('[data-g1bp-landing-v575] [data-g1bp-name-v543]'),
      searchSynced:searchData.title==='Единый заголовок'&&searchData.description==='Единое описание'&&
        searchData.url==='https://landing.example/product'&&searchData.rating==='4.8'&&searchData.reviews==='12'&&
        preview.textContent.includes('Единый заголовок')&&preview.textContent.includes('Единое описание')&&
        preview.textContent.includes('landing.example/product'),
      searchData,previewText:preview.textContent.slice(0,250),
      landingSynced:entry.competitors[0].bergenV543.price==='1950'&&
        entry.competitors[0].bergenV543.cta==='Заказать'&&
        entry.competitors[0].bergenV543.product==='Уникальное описание продукта'&&
        current.querySelector('[data-g1bp-landing-v575] [data-g1bp-field-v543="landingUrl"]')?.value==='https://landing.example/product',
      landingAddressCount:current.querySelectorAll('[data-g1bp-landing-v575] [data-g1bp-field-v543="landingUrl"]').length,
      name:entry.competitors[0].name,found:entry.competitors[0].foundPhraseKeysV539.includes(phrase.value),
      detailed:root.querySelectorAll('.g1bp-table-v543 thead [data-g1bp-head-v543]').length,
      companyUnchanged:window.__comparison.companyBefore===JSON.stringify(state.projectComparison.competitors)};
  })()`);
  assert(panel.editSizing.visible && panel.editSizing.grows, JSON.stringify(panel.editSizing));
  assert(panel.open && panel.localToggle && panel.phraseCount===initial.phrases-1 && panel.name==='Обновлённый конкурент' &&
    panel.searchTitleInputs===1 && panel.searchPhotoInputs===2 && panel.priceInputs===2 &&
    panel.priceValues.every(value=>value==='1950') &&
    panel.landingPhotoInput && panel.searchPhotoInput && panel.landingPriceInput &&
    panel.domainInputs===1 && panel.nameInputs===1 && panel.landingNameInput && panel.searchSynced && panel.landingSynced &&
    panel.compactLandingSynced && panel.found && panel.detailed===9 && panel.companyUnchanged, JSON.stringify(panel));
  const fieldGrid = await evaluate(`(() => {
    const pane=document.querySelector('[data-g1pc-match-panel="parity-0"]');
    const selectors=['[data-g1bp-ad-part-v572="title"]','[data-g1bp-domain-v543]',
      '[data-g1bp-ad-part-v572="description"]','[data-g1bp-search-field-v569="rating"]',
      '[data-g1bp-search-field-v569="reviews"]','.g1pc-search-card [data-g1bp-field-v543="price"]',
      '[data-g1bp-landing-v575] [data-g1bp-name-v543]',
      '[data-g1bp-landing-v575] [data-g1bp-field-v543="product"]',
      '[data-g1bp-landing-v575] [data-g1bp-field-v543="price"]'];
    const fields=selectors.map(selector=>{const node=pane.querySelector(selector),style=getComputedStyle(node);
      return {selector,width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height,
        border:style.borderTopWidth,color:style.borderTopColor,style:style.borderTopStyle};});
    const search=pane.querySelector('.g1pc-search-card').getBoundingClientRect();
    const landing=pane.querySelector('.g1pc-landing-preview').getBoundingClientRect();
    const photo=pane.querySelector('.g1pc-landing-preview .g1bp-landing-photo-v575').getBoundingClientRect();
    const content=pane.querySelector('.g1pc-landing-preview .g1bp-landing-content-v575').getBoundingClientRect();
    return {fields,sameLeft:Math.abs(search.left-landing.left)<2,
      sameWidth:Math.abs(search.width-landing.width)<2,
      photoLeft:photo.right<=content.left+1,photoAligned:Math.abs(photo.top-content.top)<2,
      fits:pane.scrollWidth<=pane.clientWidth+1};
  })()`);
  assert(fieldGrid.sameLeft && fieldGrid.sameWidth && fieldGrid.photoLeft &&
    fieldGrid.photoAligned && fieldGrid.fits &&
    fieldGrid.fields.every(field=>field.width>=100 && field.height>=30 &&
      field.style==='solid' && parseFloat(field.border)>=1 &&
      field.color!=='rgba(0, 0, 0, 0)'), JSON.stringify(fieldGrid));
  const reopenedPanel = await evaluate(`(() => {
    const root=document.querySelector('[data-g1bp-product-v543]');
    root.querySelector('[data-g1pc-competitor-toggle="parity-0"]').click();
    root.querySelector('[data-g1pc-competitor-toggle="parity-0"]').click();
    const pane=root.querySelector('[data-g1pc-match-panel="parity-0"]');
    const fields=['[data-g1bp-ad-part-v572="title"]','[data-g1bp-ad-part-v572="description"]',
      '[data-g1bp-field-v543="product"]','[data-g1bp-cta-index-v576="0"]'].map(selector=>pane.querySelector(selector));
    return {visible:fields.every((field,index)=>field.getBoundingClientRect().height>=(index===3?30:42)),
      values:fields.map(field=>field.value)};
  })()`);
  assert(reopenedPanel.visible && JSON.stringify(reopenedPanel.values)===
    JSON.stringify(['Единый заголовок','Единое описание','Уникальное описание продукта','Заказать']),
    JSON.stringify(reopenedPanel));
  const photo = await evaluate(`(async()=>{
    const root=document.querySelector('[data-g1bp-product-v543]');
    const input=root.querySelector('[data-g1pc-match-panel="parity-0"] [data-g1bp-landing-v575] [data-g1bp-search-photo-v569]');
    const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg=='),char=>char.charCodeAt(0));
    const transfer=new DataTransfer();transfer.items.add(new File([bytes],'photo.png',{type:'image/png'}));
    input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
    const start=performance.now();
    while(performance.now()-start<5000 && !/^data:image\\//.test(window.__comparison.entry.competitors[0].bergenV543.searchPreviewV569?.image||''))
      await new Promise(resolve=>setTimeout(resolve,40));
    const image=window.__comparison.entry.competitors[0].bergenV543.searchPreviewV569?.image||'';
    const landingImage=root.querySelector('[data-g1pc-match-panel="parity-0"] [data-g1bp-landing-v575] [data-g1bp-landing-photo-v575] img');
    const searchImage=root.querySelector('[data-g1pc-match-panel="parity-0"] [data-g1bp-serp-v569] img');
    return {saved:/^data:image\\//.test(image),landingImage:!!landingImage,
      searchImage:!!searchImage,sharedImage:landingImage?.src===searchImage?.src,
      compactImage:!!root.querySelector('[data-g1pc-column="parity-0"] [data-g1bp-serp-v569] img')};
  })()`);
  assert(photo.saved && photo.landingImage && photo.searchImage && photo.sharedImage && photo.compactImage, JSON.stringify(photo));
  const photoRemoval=await evaluate(`(()=>{const root=document.querySelector('[data-g1bp-product-v543]');
    root.querySelector('[data-g1pc-match-panel="parity-0"] [data-g1bp-search-photo-remove-v569]').click();
    return {removed:!window.__comparison.entry.competitors[0].bergenV543.searchPreviewV569?.image,
      search:!root.querySelector('[data-g1pc-match-panel="parity-0"] [data-g1bp-serp-v569] img'),
      landing:!root.querySelector('[data-g1pc-match-panel="parity-0"] [data-g1bp-landing-v575] img')};})()`);
  assert(photoRemoval.removed&&photoRemoval.search&&photoRemoval.landing,JSON.stringify(photoRemoval));
  if (process.env.GURU_CAPTURE_PRODUCT_COMPARISON === '1') {
    await evaluate(`(async()=>{document.querySelector('[data-g1pc-match-panel]').scrollIntoView({block:'start',behavior:'instant'});
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));})()`);
    const shot = await page.call('Page.captureScreenshot', { format:'png' });
    writeFileSync('/private/tmp/gate1-product-comparison-card.png',Buffer.from(shot.data,'base64'));
  }
  const followup = await evaluate(`(() => {
    const root=document.querySelector('[data-g1bp-product-v543]'),entry=window.__comparison.entry;
    root.querySelector('[data-g1pc-queries-toggle]').click();
    const input=root.querySelector('[data-g1pc-query-search]');
    const stableRow=root.querySelector('.g1-company-query-result');
    const prefix=stableRow.querySelector('.g1-company-query-name').textContent.slice(0,3);
    input.focus();input.value='несуществующий поисковый запрос';input.dispatchEvent(new Event('input',{bubbles:true}));
    const search={focused:document.activeElement===input,empty:!!root.querySelector('.g1-company-query-empty')};
    search.emptyVisible=!root.querySelector('.g1-company-query-empty').hidden;
    input.value=prefix;input.dispatchEvent(new Event('input',{bubbles:true}));
    search.narrow=[...root.querySelectorAll('.g1-company-query-result')].filter(row=>!row.hidden).length;
    input.value=prefix.slice(0,1);input.dispatchEvent(new Event('input',{bubbles:true}));
    search.broad=[...root.querySelectorAll('.g1-company-query-result')].filter(row=>!row.hidden).length;
    search.rowStable=stableRow.isConnected;
    root.querySelector('[data-g1pc-query-reset]').click();
    search.restored=root.querySelectorAll('[data-g1pc-query-row]').length>0;
    const competitor=entry.competitors[0],before=competitor.bergenV543.similarity;
    const select=root.querySelector('[data-g1pc-similarity="'+competitor.id+'"]');
    select.value=before==='yes'?'no':'yes';select.dispatchEvent(new Event('change',{bubbles:true}));
    const classification=competitor.bergenV543.similarity!==before;
    const domain=root.querySelector('[data-g1pc-match-panel] [data-g1bp-domain-v543]');
    const detailOpen=!!root.querySelector('.g1pc-unified-comparison .g1bp-table-v543');
    const domainVisible=domain.getClientRects().length>0;
    domain.focus();const focusedBefore=document.activeElement===domain;
    domain.value='https://focus-check.example/product';
    domain.dispatchEvent(new Event('input',{bubbles:true}));const focusedAfterInput=document.activeElement===domain;
    domain.dispatchEvent(new Event('change',{bubbles:true}));
    const domainFocus={connected:domain.isConnected,detailOpen,domainVisible,focusedBefore,focusedAfterInput,
      focused:document.activeElement===domain,active:document.activeElement?.outerHTML.slice(0,160),
      saved:entry.competitors.some(row=>row.domain==='https://focus-check.example/product')};
    const saved=JSON.stringify(entry),company=JSON.stringify(state.projectComparison.competitors);
    els.contentArea.innerHTML=projectComparisonProductHtml(window.__comparison.product);
    const reopened=document.querySelector('[data-g1bp-product-v543]');
    return {search,classification,domainFocus,persisted:saved===JSON.stringify(entry),
      rating:entry.keywordRelevanceByPhraseV549[window.__comparison.firstPhrase],
      competitorCount:reopened.querySelectorAll('.g1bp-table-v543 thead [data-g1bp-head-v543]').length,
      companyUnchanged:company===window.__comparison.companyBefore};
  })()`);
  assert(followup.search.focused && followup.search.empty && followup.search.emptyVisible &&
    followup.search.narrow>0 && followup.search.broad>=followup.search.narrow &&
    followup.search.rowStable && followup.search.restored &&
    followup.classification && followup.domainFocus.connected && followup.domainFocus.focused &&
    followup.domainFocus.saved && followup.persisted && followup.rating==='high' &&
    followup.competitorCount===9 && followup.companyUnchanged, JSON.stringify(followup));
  const removal = await evaluate(`(async () => {
    const root=document.querySelector('[data-g1bp-product-v543]'),entry=window.__comparison.entry;
    const target=root.querySelector('.g1pc-guide .g1-company-match [data-g1bp-delete-v543]');
    const id=target.dataset.g1bpDeleteV543;
    window.confirm=()=>true;target.click();
    await new Promise(resolve=>requestAnimationFrame(resolve));
    return {count:entry.competitors.length,archived:entry.archivedCompetitorsV540?.some(row=>row.id===id),
      detailed:root.querySelectorAll('.g1bp-table-v543 thead [data-g1bp-head-v543]').length,
      companyUnchanged:window.__comparison.companyBefore===JSON.stringify(state.projectComparison.competitors)};
  })()`);
  assert(removal.count===8 && removal.archived && removal.detailed===8 && removal.companyUnchanged,
    JSON.stringify(removal));
  await page.call('Emulation.setDeviceMetricsOverride', { width: 680, height: 1000, deviceScaleFactor: 1, mobile: false });
  const mobile = await evaluate(`(() => {const grid=document.querySelector('[data-g1pc-grid]');
    const card=document.querySelector('.g1pc-guide .g1pc-match');
    document.querySelector('[data-g1pc-form-toggle]').click();
    const form=document.querySelector('[data-g1pc-form]');
    const draftFields=[form.elements.title,form.elements.description,form.elements.product,form.elements.cta];
    const landingLayout=landing=>{const photo=landing.querySelector('.g1bp-landing-photo-v575').getBoundingClientRect();
      const content=landing.querySelector('.g1bp-landing-content-v575').getBoundingClientRect();
      const stacked=landing.getBoundingClientRect().width<=520;
      return {stacked,correct:stacked ? photo.bottom<=content.top+1 : photo.right<=content.left+1,
        fits:landing.scrollWidth<=landing.clientWidth+1};};
    const landingLayouts=[...grid.querySelectorAll('.g1pc-landing-preview')].map(landingLayout);
    landingLayouts.push(landingLayout(form.querySelector('.g1pc-landing-preview')));
    return {columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,
      fits:grid.scrollWidth<=grid.clientWidth+1,
      matchFits:card.scrollWidth<=card.clientWidth+1,
      editVisible:card.querySelector('[data-g1pc-competitor-toggle]').getClientRects().length>0,
      fieldsVisible:draftFields.every((field,index)=>field.getBoundingClientRect().height>=(index===3?34:42)),
      formFits:form.scrollWidth<=form.clientWidth+1,landingLayouts}})()`);
  assert(mobile.columns<=2 && mobile.fits && mobile.matchFits && mobile.editVisible &&
    mobile.fieldsVisible && mobile.formFits && mobile.landingLayouts.length>=3 &&
    mobile.landingLayouts.every(layout=>layout.correct&&layout.fits), JSON.stringify(mobile));
  const noCompetitors = await evaluate(`(() => {
    const {entry,product,pid,firstPhrase}=window.__comparison;
    entry.competitors=[];entry.searchFinishedPhraseKeysV601=[];
    delete entry.keywordRelevanceByPhraseV549[firstPhrase];
    g1ProductComparisonScreen(pid).phraseKey=firstPhrase;
    els.contentArea.innerHTML=projectComparisonProductHtml(product);
    const root=document.querySelector('[data-g1bp-product-v543]');
    const before={nextDisabled:root.querySelector('[data-g1pc-next]').disabled,
      matches:root.querySelectorAll('[data-g1pc-match]').length};
    root.querySelector('[data-g1pc-finish]').click();
    const finished=entry.searchFinishedPhraseKeysV601.includes(firstPhrase);
    const next=root.querySelector('[data-g1pc-next]');
    const enabled=!next.disabled;
    next.click();
    return {before,finished,enabled,advanced:g1ProductComparisonScreen(pid).phraseKey!==firstPhrase,
      noCompetitors:entry.competitors.length===0};
  })()`);
  assert(noCompetitors.before.nextDisabled && noCompetitors.before.matches===0 &&
    noCompetitors.finished && noCompetitors.enabled && noCompetitors.advanced &&
    noCompetitors.noCompetitors, JSON.stringify(noCompetitors));
  console.log(JSON.stringify({ ok: true, initial, ownLanding, actions, editing, panel, fieldGrid, reopenedPanel, photo, followup, removal, mobile, noCompetitors }, null, 2));
} finally {
  page.close(); await browser.call('Target.disposeBrowserContext', { browserContextId }); browser.close();
}
