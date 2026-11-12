import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';

const source = JSON.parse(readFileSync(process.env.GURU_GATE1_EXPORT || '/Users/vl/Downloads/gate-1.json', 'utf8'));
const fixture = JSON.parse(JSON.stringify({ content: {
  project: source.content.project, projectComparison: source.content.projectComparison,
  painV130: source.content.painV130, unitV130: source.content.unitV130,
  unitEconomicsRoute: source.content.unitEconomicsRoute,
}, structure: source.structure }, (_key, value) => typeof value === 'string' && value.startsWith('data:image/')
  ? '[image omitted for isolated test]' : value));
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
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.navigate', { url: appUrl });
  for (let attempt = 0; attempt < 200; attempt++) {
    if (await evaluate('document.readyState === "complete" && typeof g1ProductComparisonCompactHtml === "function"')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();true');
  const setup = await evaluate(`(() => {
    state=createFreshWorkspace({id:'comparison-grid-isolated',name:'Коричное яблоко — проверка'});
    const imported=${JSON.stringify(fixture)};
    for(const [key,value] of Object.entries(imported.content)) state[key]=structuredClone(value);
    state.gates[state.gates.findIndex(g=>g.id==='gate-1')]=structuredClone(imported.structure);
    state.project.id='comparison-grid-isolated';activeProjectId=state.project.id;
    activeView='gate';activeGateId='gate-1';guruV194Ensure(state);
    els.launcher.hidden=true;els.appShell.hidden=false;document.body.classList.remove('access-locked');updateProjectChrome();
    const pid='catalog-item-1786792591872-51f503',product=guruV194Product(pid,state),entry=ensureProjectComparisonProduct(pid);
    window.__gridTest={pid,product,entry,originalId:entry.product_id,originalText:entry.competitors[0].bergenV543.positioning};
    flashSaving=()=>{};guruPersistStateFast=()=>true;saveState=()=>true;
    const pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';
    const ownRow=g3ProductJourneyPageSource(product).row;
    ownRow.productGalleryPhotos=[{id:'grid-layout-photo',dataUrl:pixel}];
    ownRow.productGalleryMainPhotoId='grid-layout-photo';
    entry.competitors.slice(0,2).forEach(competitor => ((competitor.bergenV543 ||= {}).searchPreviewV569 ||= {}).image=pixel);
    entry.competitors[0].bergenV543.comparisonTypeV603='direct';
    window.__landingLayoutProbe=(root)=>[...root.querySelectorAll('[data-g1pc-landing-layout="media-left"]')]
      .filter(preview=>preview.getClientRects().length).map(preview=>{
        const hero=preview.querySelector('.g1bp-landing-hero-v575');
        const photo=hero?.querySelector(':scope > .g1bp-landing-photo-v575');
        const content=hero?.querySelector(':scope > .g1bp-landing-content-v575');
        if(!hero||!photo||!content) return {id:preview.dataset.g1bpLandingV575,valid:false};
        const p=photo.getBoundingClientRect(),c=content.getBoundingClientRect(),h=hero.getBoundingClientRect();
        const image=photo.querySelector('img');const imageRect=image?.getBoundingClientRect();
        return {id:preview.dataset.g1bpLandingV575,valid:hero.firstElementChild===photo&&hero.children[1]===content&&
          Math.abs(p.top-c.top)<1&&p.right<=c.left+1&&p.left>=h.left-1&&c.right<=h.right+1&&
          p.width>0&&c.width>0&&getComputedStyle(hero).gridTemplateColumns.split(' ').length===2&&
          (!imageRect||(imageRect.left>=p.left-1&&imageRect.right<=p.right+1)),
          image:!!image,photoWidth:p.width,contentWidth:c.width};
      });
    entry.open=true;els.contentArea.innerHTML=projectComparisonProductHtml(product);
    const root=document.querySelector('[data-g1pc-unified]');
    const grid=root.querySelector('[data-g1pc-grid]');
    const rows=[...grid.querySelectorAll('.g1pc-preview-row,.g1pc-criteria-row,.g1pc-verified-row')];
    const tracks=getComputedStyle(grid).gridTemplateColumns.split(' ').map(parseFloat);
    const header=grid.querySelector('.g1pc-identity-row');
    const result={columns:grid.querySelectorAll('.g1pc-identity-cell').length,
      tracks,headerY:[...header.querySelectorAll('.g1pc-layer-cell')].map(cell=>cell.getBoundingClientRect().y),
      headerWidths:[...header.querySelectorAll('.g1pc-layer-cell')].map(cell=>cell.getBoundingClientRect().width),
      landingLayouts:window.__landingLayoutProbe(grid),
      rows:grid.querySelectorAll('[data-g1pc-criteria-row]').length,
      oldGrid:!!root.querySelector('.g1-company-compare-grid,.g1pc-criteria-table,.g1bp-table-v543,[data-g1pc-page-select]'),
      sticky:getComputedStyle(header).position,
      firstX:rows.map(row=>row.querySelector('.g1pc-layer-cell')?.getBoundingClientRect().x).filter(x=>x!=null),
      firstWidths:rows.map(row=>row.querySelector('.g1pc-layer-cell')?.getBoundingClientRect().width).filter(x=>x!=null),
      repaired:JSON.stringify(state.gates).includes('Проверим, бережно упакуем и поможем получить его вовремя'),
      damaged:JSON.stringify(state.gates).includes('Провери��'),
      productId:entry.product_id};
    return result;
  })()`);
  assert.equal(setup.columns,3,JSON.stringify(setup));
  assert(setup.tracks.length===4&&setup.headerY.every(y=>Math.abs(y-setup.headerY[0])<1)&&setup.headerWidths.every(width=>Math.abs(width-setup.headerWidths[0])<1),JSON.stringify(setup));
  assert.equal(setup.rows,10,JSON.stringify(setup));
  assert(setup.landingLayouts.length===3&&setup.landingLayouts.every(layout=>layout.valid&&layout.image),JSON.stringify(setup.landingLayouts));
  assert(!setup.oldGrid && setup.sticky==='sticky' && setup.firstX.every(x=>Math.abs(x-setup.firstX[0])<1)&&setup.firstWidths.every(x=>Math.abs(x-setup.firstWidths[0])<1),JSON.stringify(setup));
  assert(setup.repaired&&!setup.damaged,JSON.stringify(setup));
  const wrappedCriteria=await evaluate(`(() => {
    const grid=document.querySelector('[data-g1pc-grid]');
    const sourceCells=[...grid.querySelectorAll('.g1pc-criteria-source-line')];
    const textFits=node=>node.scrollWidth<=node.clientWidth+1&&node.scrollHeight<=node.clientHeight+1;
    const sourceFit=sourceCells.every(node=>textFits(node)&&getComputedStyle(node).whiteSpace==='pre-wrap'&&getComputedStyle(node).textOverflow!=='ellipsis');
    const longest=sourceCells.reduce((best,node)=>node.textContent.length>best.textContent.length?node:best,sourceCells[0]);
    const sourceWraps=longest.getBoundingClientRect().height>parseFloat(getComputedStyle(longest).lineHeight)*1.5;
    grid.querySelector('[data-g1pc-criteria-toggle="audience"]').click();
    const detail=grid.querySelector('[data-g1pc-criteria-detail="audience"]');
    const note=detail.querySelector('[data-g1pc-criteria-note]');
    note.value='Длинная заметка о совпадении аудитории. '.repeat(30);
    note.dispatchEvent(new Event('input',{bubbles:true}));
    const legacy=detail.querySelector('[data-g1bp-field-v543="marketSegment"]');
    legacy.value='Историческое описание сегмента с длинным текстом и адресом https://example.test/very/long/continuous/path/that/must/wrap '.repeat(24);
    legacy.dispatchEvent(new Event('input',{bubbles:true}));
    const fields=[...detail.querySelectorAll('textarea')];
    const fieldsFit=fields.every(node=>textFits(node)&&getComputedStyle(node).maxHeight==='none');
    const archiveFit=[...detail.querySelectorAll('.g1pc-criteria-archive p')].every(textFits);
    const columnsAligned=[...detail.querySelectorAll('.g1pc-layer-cell')].every((cell,index)=>Math.abs(cell.getBoundingClientRect().x-grid.querySelectorAll('.g1pc-identity-row .g1pc-layer-cell')[index].getBoundingClientRect().x)<1);
    return {sourceCount:sourceCells.length,sourceFit,sourceWraps,fieldsFit,archiveFit,columnsAligned,
      sourceHeight:longest.clientHeight,fields:fields.map(node=>({height:node.clientHeight,scrollHeight:node.scrollHeight,maxHeight:getComputedStyle(node).maxHeight}))};
  })()`);
  assert(wrappedCriteria.sourceCount===5&&wrappedCriteria.sourceFit&&wrappedCriteria.sourceWraps&&wrappedCriteria.fieldsFit&&wrappedCriteria.archiveFit&&wrappedCriteria.columnsAligned,JSON.stringify(wrappedCriteria));
  await evaluate(`document.querySelector('[data-g1pc-criteria-row="audience"]').scrollIntoView({block:'center'});true`);
  const criteriaScreenshot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  writeFileSync('artifacts/product-comparison-criteria-wrapped-wide.png',Buffer.from(criteriaScreenshot.data,'base64'));
  const allCriteriaFit=await evaluate(`(() => {
    const grid=document.querySelector('[data-g1pc-grid]');
    const failures=[];
    for(const toggle of grid.querySelectorAll('[data-g1pc-criteria-toggle]')) {
      if(toggle.getAttribute('aria-expanded')!=='true') toggle.click();
      const id=toggle.dataset.g1pcCriteriaToggle;
      const detail=grid.querySelector('[data-g1pc-criteria-detail="'+id+'"]');
      const contents=[...detail.querySelectorAll('textarea,.g1pc-criteria-detail-source p,.g1pc-criteria-archive p')];
      for(const node of contents) if(node.scrollHeight>node.clientHeight+1||node.scrollWidth>node.clientWidth+1)
        failures.push({id,tag:node.tagName,height:node.clientHeight,scrollHeight:node.scrollHeight,width:node.clientWidth,scrollWidth:node.scrollWidth});
      toggle.click();
    }
    return {rows:grid.querySelectorAll('[data-g1pc-criteria-toggle]').length,failures};
  })()`);
  assert(allCriteriaFit.rows===10&&allCriteriaFit.failures.length===0,JSON.stringify(allCriteriaFit));
  await evaluate(`document.querySelector('[data-g1pc-grid]').scrollIntoView({block:'start'}); true`);
  const wideScreenshot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  writeFileSync('artifacts/product-comparison-unified-grid-wide.png',Buffer.from(wideScreenshot.data,'base64'));
  await evaluate(`(() => { const row=document.querySelectorAll('[data-g1pc-grid] .g1pc-preview-row')[1]; const head=document.querySelector('.g1pc-identity-row'); window.scrollBy(0,row.getBoundingClientRect().top-head.getBoundingClientRect().height-20); return true; })()`);
  const landingWideScreenshot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  writeFileSync('artifacts/product-comparison-landing-wide.png',Buffer.from(landingWideScreenshot.data,'base64'));
  await evaluate(`document.querySelector('[data-g1pc-grid] .g1pc-similarity-choice').scrollIntoView({block:'center'}); true`);
  const similarityWideScreenshot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  writeFileSync('artifacts/product-comparison-similarity-wide.png',Buffer.from(similarityWideScreenshot.data,'base64'));
  const choicePlacementAndLiveUpdate=await evaluate(`(() => {
    const {entry}=window.__gridTest;
    const competitor=entry.competitors[0],root=document.querySelector('[data-g1pc-unified]');
    const order=container=>[...container.querySelectorAll(':scope > .g1pc-layer-row, :scope > .g1pc-card-section')]
      .map(row=>row.querySelector(':scope > .g1pc-layer-rail, :scope > h4')?.textContent.trim());
    const gridOrder=order(root.querySelector('[data-g1pc-grid]'));
    const draftOrder=order(root.querySelector('[data-g1pc-form]'));
    const typeAfterSearch=gridOrder.indexOf('Тип конкурента')===gridOrder.indexOf('Что клиент видит в поиске')+1;
    const similarityAfterLanding=gridOrder.indexOf('Похожесть предложения')===gridOrder.indexOf('Что клиент видит после клика')+1;
    root.querySelector('[data-g1pc-competitor-toggle="'+competitor.id+'"]').click();
    const panel=root.querySelector('[data-g1pc-match-panel="'+competitor.id+'"]');
    const editorOrder=order(panel);
    const form=root.querySelector('[data-g1pc-form]');
    form.elements.domain.value='unfinished.example.test';
    const samePanel=panel;
    const model=g1ProductComparisonModel(root);
    const beforeType=g1BergenTypeV543(competitor,model.jtbds);
    const matchCount=g1BergenMatchedJtbdCountV581(competitor,model.jtbds);
    delete competitor.bergenV543.comparisonTypeV603;
    panel.querySelector('[data-g1pc-similarity="'+competitor.id+'"][value=""]').click();
    panel.querySelector('[data-g1pc-similarity="'+competitor.id+'"][value="no"]').click();
    const afterType=g1BergenTypeV543(competitor,model.jtbds);
    const autoType=panel.querySelector('[data-g1pc-criteria-type="'+competitor.id+'"][value="substitute"]').checked;
    const gridType=root.querySelector('[data-g1pc-grid] [data-g1pc-criteria-type="'+competitor.id+'"][value="substitute"]').checked;
    const stage2NotRequired=root.querySelectorAll('[data-g1pc-criteria-cell^="'+competitor.id+':"] .g1pc-criteria-na').length;
    const panelPreserved=panel.isConnected&&root.querySelector('[data-g1pc-match-panel="'+competitor.id+'"]')===samePanel;
    const draftPreserved=form.isConnected&&form.elements.domain.value==='unfinished.example.test';
    panel.querySelector('[data-g1pc-criteria-type="'+competitor.id+'"][value="substitute"]').click();
    const sameTypeConfirmed=competitor.bergenV543.comparisonTypeV603==='substitute'&&
      panel.querySelector('[data-g1pc-type-note]').textContent.includes('Выбран вручную');
    panel.querySelector('[data-g1pc-criteria-type="'+competitor.id+'"][value="direct"]').click();
    const manualType=competitor.bergenV543.comparisonTypeV603==='direct';
    const stage2Restored=root.querySelectorAll('[data-g1pc-criteria-cell^="'+competitor.id+':"] .g1pc-criteria-na').length===0;
    const editorAndGridSynced=panel.querySelector('[data-g1pc-criteria-type="'+competitor.id+'"][value="direct"]').checked&&
      root.querySelector('[data-g1pc-grid] [data-g1pc-criteria-type="'+competitor.id+'"][value="direct"]').checked;
    const manualNote=panel.querySelector('[data-g1pc-type-note]').textContent.includes('Выбран вручную');
    panel.querySelector('[data-g1pc-similarity="'+competitor.id+'"][value="yes"]').click();
    const similaritySynced=panel.querySelector('[data-g1pc-similarity="'+competitor.id+'"][value="yes"]').checked&&
      root.querySelector('[data-g1pc-grid] [data-g1pc-similarity="'+competitor.id+'"][value="yes"]').checked;
    return {gridOrder,draftOrder,editorOrder,typeAfterSearch,similarityAfterLanding,beforeType,afterType,matchCount,similarity:competitor.bergenV543.similarity,explicitType:competitor.bergenV543.comparisonTypeV603,sameTypeConfirmed,
      draftOrderCorrect:draftOrder.join('|').includes('Мини-версия поисковой выдачи|Тип конкурента|Мини-версия посадочной страницы|Похожесть предложения'),
      editorOrderCorrect:editorOrder.join('|').includes('Мини-версия поисковой выдачи|Тип конкурента|Мини-версия посадочной страницы|Похожесть предложения'),
      autoType,gridType,stage2NotRequired,panelPreserved,draftPreserved,manualType,stage2Restored,editorAndGridSynced,manualNote,similaritySynced};
  })()`);
  assert(choicePlacementAndLiveUpdate.typeAfterSearch&&choicePlacementAndLiveUpdate.similarityAfterLanding&&
    choicePlacementAndLiveUpdate.draftOrderCorrect&&choicePlacementAndLiveUpdate.editorOrderCorrect&&
    choicePlacementAndLiveUpdate.autoType&&choicePlacementAndLiveUpdate.gridType&&choicePlacementAndLiveUpdate.stage2NotRequired===5&&
    choicePlacementAndLiveUpdate.panelPreserved&&choicePlacementAndLiveUpdate.draftPreserved&&choicePlacementAndLiveUpdate.sameTypeConfirmed&&
    choicePlacementAndLiveUpdate.manualType&&choicePlacementAndLiveUpdate.stage2Restored&&
    choicePlacementAndLiveUpdate.editorAndGridSynced&&choicePlacementAndLiveUpdate.manualNote&&choicePlacementAndLiveUpdate.similaritySynced,
    JSON.stringify(choicePlacementAndLiveUpdate));
  const interactions=await evaluate(`(() => {
    const {entry,product,pid,originalId,originalText}=window.__gridTest;
    const root=document.querySelector('[data-g1pc-unified]'),grid=root.querySelector('[data-g1pc-grid]');
    const competitor=entry.competitors[0];
    const row=grid.querySelector('[data-g1pc-criteria-row="task"]');
    const ownYes=row.querySelector('[data-g1pc-criteria-column="own"][data-g1pc-criteria-answer="yes"]');if(!ownYes) throw new Error(row.outerHTML.slice(0,1800));ownYes.click();
    row.querySelector('[data-g1pc-criteria-competitor="'+competitor.id+'"][data-g1pc-criteria-answer="no"]').click();
    const signal=row.querySelector('[data-g1pc-criteria-cell="'+competitor.id+':task"] .g1pc-criteria-signal').textContent;
    const summary=grid.querySelector('[data-g1pc-criteria-summary="'+competitor.id+'"]').textContent;
    const realLegacyStatus=g1BergenStatusV543;
    g1BergenStatusV543=()=>({status:'ready',filled:5,total:5});
    const legacyReadyPreserved=projectComparisonProductStatus(entry).status==='ready';
    g1BergenStatusV543=realLegacyStatus;
    grid.querySelector('[data-g1pc-criteria-toggle="task"]').click();
    const detail=grid.querySelector('[data-g1pc-criteria-detail="task"]');
    const source=!!detail.querySelector('[data-g4-jump-target]');
    const oldChoice=detail.querySelector('[data-g1bp-field-v543="taskClosure"]')?.value;
    const oldPositioning=detail.querySelector('[data-g1bp-field-v543="positioning"]')?.value;
    const oldCells=entry.criteria.map(criterion=>projectComparisonCell(criterion,competitor.id).text).filter(Boolean);
    const oldCellsVisible=oldCells.every(text=>grid.textContent.includes(text));
    const keyboard=grid.querySelector('[data-g1pc-criteria-row="trust"] [data-g1pc-criteria-column="own"][data-g1pc-criteria-answer="unknown"]');
    keyboard.focus();keyboard.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
    const keyboardValue=entry.comparisonCriteriaV603?.own?.trust;
    const previous=grid.querySelector('[data-g1pc-page-prev]');
    const next=root.querySelector('[data-g1pc-page-next]');next.click();
    const page2=root.querySelector('[data-g1pc-grid]').querySelectorAll('.g1pc-identity-cell').length;
    root.querySelector('[data-g1pc-filter="substitute"]').click();
    const filtered=root.querySelector('[data-g1pc-filter="substitute"]').getAttribute('aria-pressed');
    return {signal,summary,detailOpen:!detail.hidden,source,oldChoice,
      oldTextKept:originalText===competitor.bergenV543.positioning&&oldPositioning===(originalText||''),oldCellsVisible,keyboardValue,legacyReadyPreserved,productIdKept:entry.product_id===originalId,
      saved:competitor.comparisonCriteriaV603.answers.task,page2,filtered,pager:root.querySelector('.g1-company-compare-pager span').textContent,
      oldSelect:!!root.querySelector('[data-g1pc-page-select]'),addEnabled:!root.querySelector('[data-g1pc-form-toggle]').disabled};
  })()`);
  assert.equal(interactions.signal,'▲',JSON.stringify(interactions));
  assert(interactions.summary.includes('▲ 1')&&interactions.detailOpen&&interactions.source&&interactions.oldTextKept&&interactions.oldCellsVisible&&interactions.keyboardValue==='yes'&&interactions.legacyReadyPreserved&&interactions.productIdKept,JSON.stringify(interactions));
  assert(interactions.page2===3&&interactions.filtered==='true'&&!interactions.oldSelect&&interactions.addEnabled,JSON.stringify(interactions));
  await evaluate(`document.querySelector('[data-g1pc-filter=\"\"]')?.click(); true`);
  await page.call('Emulation.setDeviceMetricsOverride', { width: 700, height: 844, deviceScaleFactor: 1, mobile: false });
  await new Promise(resolve=>setTimeout(resolve,100));
  const at700=await evaluate(`({columns:document.querySelectorAll('[data-g1pc-grid] .g1pc-identity-cell').length,layouts:window.__landingLayoutProbe(document.querySelector('[data-g1pc-grid]'))})`);
  await page.call('Emulation.setDeviceMetricsOverride', { width: 701, height: 844, deviceScaleFactor: 1, mobile: false });
  await new Promise(resolve=>setTimeout(resolve,100));
  const at701=await evaluate(`({columns:document.querySelectorAll('[data-g1pc-grid] .g1pc-identity-cell').length,layouts:window.__landingLayoutProbe(document.querySelector('[data-g1pc-grid]'))})`);
  assert(at700.columns===2&&at701.columns===3&&at700.layouts.length===2&&at701.layouts.length===3&&[...at700.layouts,...at701.layouts].every(layout=>layout.valid),JSON.stringify({at700,at701}));
  await page.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await new Promise(resolve=>setTimeout(resolve,150));
  const narrow=await evaluate(`(() => {
    const root=document.querySelector('[data-g1pc-unified]');
    root.querySelector('[data-g1pc-filter=""]').click();
    const grid=root.querySelector('[data-g1pc-grid]'),rail=grid.querySelector('.g1pc-preview-row .g1pc-layer-rail'),cells=[...grid.querySelector('.g1pc-preview-row').querySelectorAll('.g1pc-layer-cell')];
    const sourceFit=[...grid.querySelectorAll('.g1pc-criteria-source-line')].every(node=>node.scrollWidth<=node.clientWidth+1&&node.scrollHeight<=node.clientHeight+1);
    grid.querySelector('[data-g1pc-criteria-toggle="audience"]').click();
    const detail=grid.querySelector('[data-g1pc-criteria-detail="audience"]');
    const detailFit=[...detail.querySelectorAll('textarea,.g1pc-criteria-detail-source p,.g1pc-criteria-archive p')].every(node=>node.scrollWidth<=node.clientWidth+1&&node.scrollHeight<=node.clientHeight+1);
    grid.querySelector('[data-g1pc-criteria-toggle="audience"]').click();
    return {columns:grid.querySelectorAll('.g1pc-identity-cell').length,
      railAbove:rail.getBoundingClientRect().bottom<=cells[0].getBoundingClientRect().top+1,
      cellsSideBySide:Math.abs(cells[0].getBoundingClientRect().top-cells[1].getBoundingClientRect().top)<1,
      landingLayouts:window.__landingLayoutProbe(grid),
      noPageOverflow:document.documentElement.scrollWidth<=window.innerWidth+1,sourceFit,detailFit,
      pager:root.querySelector('.g1-company-compare-pager span').textContent,
      sticky:getComputedStyle(grid.querySelector('.g1pc-identity-row')).position};
  })()`);
  assert(narrow.columns===2&&narrow.railAbove&&narrow.cellsSideBySide&&narrow.noPageOverflow&&narrow.sourceFit&&narrow.detailFit&&narrow.sticky==='sticky'&&narrow.landingLayouts.length===2&&narrow.landingLayouts.every(layout=>layout.valid&&layout.image),JSON.stringify(narrow));
  await evaluate(`(() => { document.querySelector('[data-g1pc-grid]').scrollIntoView({block:'start'}); return true; })()`);
  await new Promise(resolve=>setTimeout(resolve,100));
  const stickyAfterScroll=await evaluate(`(() => { const h=document.querySelector('.g1pc-identity-row');let p=h;const a=[];while(p&&a.length<9){a.push([p.tagName,p.className?.toString().slice(0,35),getComputedStyle(p).overflowY,p.getBoundingClientRect().top]);p=p.parentElement;}return {top:getComputedStyle(h).top,rect:h.getBoundingClientRect().top,scrollY:window.scrollY,ancestors:a};})()`);
  const screenshot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  writeFileSync('artifacts/product-comparison-unified-grid-mobile.png',Buffer.from(screenshot.data,'base64'));
  await evaluate(`(() => { const row=document.querySelectorAll('[data-g1pc-grid] .g1pc-preview-row')[1]; const head=document.querySelector('.g1pc-identity-row'); window.scrollBy(0,row.getBoundingClientRect().top-head.getBoundingClientRect().height-20); return true; })()`);
  const landingMobileScreenshot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  writeFileSync('artifacts/product-comparison-landing-mobile.png',Buffer.from(landingMobileScreenshot.data,'base64'));
  await evaluate(`document.querySelector('[data-g1pc-grid] .g1pc-similarity-choice').scrollIntoView({block:'center'}); true`);
  const similarityMobileScreenshot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  writeFileSync('artifacts/product-comparison-similarity-mobile.png',Buffer.from(similarityMobileScreenshot.data,'base64'));
  const saveWithoutLandingSetup=await evaluate(`(() => {
    const {entry,product}=window.__gridTest;
    entry.competitors=[];entry.open=true;
    els.contentArea.innerHTML=projectComparisonProductHtml(product);
    const root=document.querySelector('[data-g1pc-unified]');
    root.querySelector('[data-g1pc-form-toggle]').click();
    const form=root.querySelector('[data-g1pc-form]');
    form.elements.domain.value='without-landing.example.test';
    const button=form.querySelector('[data-g1pc-save-without-landing]');
    button.scrollIntoView({block:'center'});
    return {insideLanding:!!button.closest('.g1pc-draft-landing'),visible:button.getClientRects().length>0,
      buttonBackground:getComputedStyle(button).backgroundColor,panelColor:getComputedStyle(button).getPropertyValue('--panel').trim(),
      noPageOverflow:document.documentElement.scrollWidth<=innerWidth+1,
      nameBlank:form.elements.name.value==='',landingUrlBlank:form.elements.landingUrl.value==='',
      similarityBlank:form.elements.similarity.value==='',typeBlank:form.elements.comparisonType.value===''};
  })()`);
  assert(saveWithoutLandingSetup.insideLanding&&saveWithoutLandingSetup.visible&&saveWithoutLandingSetup.noPageOverflow&&saveWithoutLandingSetup.nameBlank&&
    saveWithoutLandingSetup.landingUrlBlank&&saveWithoutLandingSetup.similarityBlank&&saveWithoutLandingSetup.typeBlank,
    JSON.stringify(saveWithoutLandingSetup));
  const saveWithoutLandingScreenshot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  writeFileSync('artifacts/product-comparison-save-without-landing-mobile.png',Buffer.from(saveWithoutLandingScreenshot.data,'base64'));
  const saveWithoutLanding=await evaluate(`(async () => {
    const {entry,originalId}=window.__gridTest,root=document.querySelector('[data-g1pc-unified]');
    const form=root.querySelector('[data-g1pc-form]'),button=form.querySelector('[data-g1pc-save-without-landing]');
    button.click();
    const missingTitleBlocked=entry.competitors.length===0&&form.querySelector('[data-g1pc-landing-save-error]').textContent.includes('заголовок')&&document.activeElement===form.elements.title;
    form.elements.title.value='Результат поиска без посадочной страницы';
    form.elements.title.dispatchEvent(new Event('input',{bubbles:true}));
    const errorsClear=!form.querySelector('[data-g1pc-landing-save-error]').textContent&&!form.querySelector('[data-g1pc-form-error]').textContent;
    button.click();
    await new Promise(resolve=>setTimeout(resolve,60));
    const competitor=entry.competitors[0];
    const grid=root.querySelector('[data-g1pc-grid]');
    const landingEmpty=!!grid.querySelectorAll('.g1pc-preview-row')[1]?.querySelector('.g1pc-empty');
    const editor=root.querySelector('[data-g1pc-match-panel="'+competitor.id+'"]');
    const saved=entry.competitors.length===1&&competitor.domain==='without-landing.example.test'&&
      competitor.bergenV543.advertisements.includes('Результат поиска без посадочной страницы')&&
      competitor.name===''&&!competitor.bergenV543.landingUrl&&!competitor.bergenV543.product&&
      !competitor.bergenV543.similarity&&!competitor.bergenV543.comparisonTypeV603;
    const phrase=g1ProductComparisonCurrent(g1ProductComparisonModel(root)).current;
    const found=competitor.foundPhraseKeysV539.includes(phrase.key);
    const laterName=editor.querySelector('[data-g1bp-name-v543="'+competitor.id+'"]');
    laterName.value='Название добавлено позже';laterName.dispatchEvent(new Event('input',{bubbles:true}));
    const updatedLater=competitor.name==='Название добавлено позже'&&entry.competitors.length===1&&entry.product_id===originalId;
    return {missingTitleBlocked,errorsClear,saved,found,landingEmpty,editorOpen:!!editor,updatedLater};
  })()`);
  assert(Object.values(saveWithoutLanding).every(Boolean),JSON.stringify(saveWithoutLanding));
  const addAndSubstitute=await evaluate(`(async () => {
    const {entry,product}=window.__gridTest;
    entry.competitors=[];entry.open=true;
    els.contentArea.innerHTML=projectComparisonProductHtml(product);
    const root=document.querySelector('[data-g1pc-unified]');
    const form=root.querySelector('[data-g1pc-form]');
    form.elements.domain.value='new.example.test';form.elements.name.value='Новый конкурент';
    form.elements.title.value='Новый результат';
    form.querySelector('[name="comparisonType"][value="direct"]').click();
    form.querySelector('[name="similarity"][value="yes"]').click();
    form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    await new Promise(resolve=>setTimeout(resolve,60));
    const competitor=entry.competitors[0];
    const grid=root.querySelector('[data-g1pc-grid]');
    const added=entry.competitors.length===1&&competitor.name==='Новый конкурент';
    const nameField=grid.querySelector('[data-g1pc-criteria-name=\"'+competitor.id+'\"]');
    nameField.value='Имя после правки';nameField.dispatchEvent(new Event('input',{bubbles:true}));
    const nameSaved=competitor.name==='Имя после правки';
    const copyIcon=!!grid.querySelector('[data-g1pc-copy-link]');
    const editorPanel=root.querySelector('[data-g1pc-match-panel]');
    const editorLayouts=editorPanel?window.__landingLayoutProbe(editorPanel):[];
    const draftForm=root.querySelector('[data-g1pc-form]');draftForm.hidden=false;
    const draftLayouts=window.__landingLayoutProbe(draftForm);draftForm.hidden=true;
    const empty=grid.querySelector('.g1pc-preview-row:nth-of-type(3) .g1pc-empty');
    const emptyLink=!!grid.querySelector('.g1pc-preview-row .g1pc-empty a[href^="https://"]');
    const type=grid.querySelector('[data-g1pc-criteria-type="'+competitor.id+'"][value="substitute"]');
    type.click();
    const na=root.querySelectorAll('.g1pc-criteria-na').length;
    const typeSaved=competitor.bergenV543.comparisonTypeV603;
    const newType=root.querySelector('[data-g1pc-grid] [data-g1pc-criteria-type="'+competitor.id+'"][value="direct"]');
    newType.click();
    const row=root.querySelector('[data-g1pc-criteria-row="task"]');
    row.querySelector('[data-g1pc-criteria-column="own"][data-g1pc-criteria-answer="no"]').click();
    row.querySelector('[data-g1pc-criteria-competitor="'+competitor.id+'"][data-g1pc-criteria-answer="yes"]').click();
    const down=row.querySelector('.g1pc-criteria-signal').textContent;
    const date=root.querySelector('[data-g1bp-field-v543="fixedDate"][data-g1bp-competitor-v543="'+competitor.id+'"]');
    date.value='2026-11-03';date.dispatchEvent(new Event('input',{bubbles:true}));
    const evidence=root.querySelector('[data-g1bp-field-v543="evidence"][data-g1bp-competitor-v543="'+competitor.id+'"]');
    evidence.value='https://new.example.test/proof';evidence.dispatchEvent(new Event('input',{bubbles:true}));
    const verified=competitor.bergenV543.fixedDate==='2026-11-03'&&competitor.bergenV543.evidence==='https://new.example.test/proof';
    root.querySelector('[data-g1pc-criteria-toggle="task"]').click();
    const sourceLink=root.querySelector('[data-g1pc-criteria-detail="task"] [data-g4-jump-target]');
    return {added,nameSaved,copyIcon,editorLayouts,draftLayouts,empty:!!empty,emptyLink,typeSaved,na,down,verified,sourceLink:!!sourceLink};
  })()`);
  assert(addAndSubstitute.added&&addAndSubstitute.nameSaved&&addAndSubstitute.copyIcon&&addAndSubstitute.editorLayouts.length===1&&addAndSubstitute.editorLayouts[0].valid&&addAndSubstitute.draftLayouts.length===1&&addAndSubstitute.draftLayouts[0].valid&&addAndSubstitute.emptyLink&&addAndSubstitute.na>=5&&addAndSubstitute.typeSaved==='substitute'&&addAndSubstitute.down==='▼'&&addAndSubstitute.verified,JSON.stringify(addAndSubstitute));
  assert(addAndSubstitute.sourceLink,JSON.stringify(addAndSubstitute));
  await evaluate(`setTimeout(() => document.querySelector('[data-g1pc-criteria-detail=\"task\"] [data-g4-jump-target]')?.click(), 0); true`);
  await new Promise(resolve=>setTimeout(resolve,150));
  const sourceNavigationGate=await evaluate('activeGateId');
  assert.equal(sourceNavigationGate,'gate-0',sourceNavigationGate);
  const fifthCompetitor=await evaluate(`(async () => {
    const {entry,product,originalId}=window.__gridTest;
    const base=entry.competitors[0];
    entry.competitors=Array.from({length:4},(_,index)=>({ ...structuredClone(base), id:'existing-'+index,
      name:'Существующий '+(index+1),domain:'existing-'+index+'.example.test',siteDomainV538:'existing-'+index+'.example.test',
      foundPhraseKeysV539:[],bergenV543:{...structuredClone(base.bergenV543),advertisements:'Заголовок '+(index+1)} }));
    const screen=g1ProductComparisonScreen(product.id);screen.filter='direct';screen.page=1;
    els.contentArea.innerHTML=projectComparisonProductHtml(product);
    const root=document.querySelector('[data-g1pc-unified]');
    const before=entry.competitors.map(row=>({id:row.id,name:row.name,domain:row.domain,advertisements:row.bergenV543.advertisements}));
    const addEnabledBefore=!root.querySelector('[data-g1pc-form-toggle]').disabled;
    root.querySelector('[data-g1pc-form-toggle]').click();
    const form=root.querySelector('[data-g1pc-form]');
    form.elements.domain.value='fifth.example.test';form.elements.title.value='Пятый конкурент в выдаче';
    form.querySelector('[data-g1pc-save-without-landing]').click();
    await new Promise(resolve=>setTimeout(resolve,60));
    const fifth=entry.competitors[4],grid=root.querySelector('[data-g1pc-grid]');
    const preserved=before.every((row,index)=>Object.entries(row).every(([key,value])=>
      key==='advertisements'?entry.competitors[index].bergenV543.advertisements===value:entry.competitors[index][key]===value));
    return {count:entry.competitors.length,addEnabledBefore,addEnabledAfter:!root.querySelector('[data-g1pc-form-toggle]').disabled,
      preserved,productIdKept:entry.product_id===originalId,filter:screen.filter,page:screen.page,
      pageSize:g1ProductComparisonPageSize(),pager:root.querySelector('.g1-company-compare-pager span').textContent,
      newVisible:!!grid.querySelector('[data-g1pc-column="'+fifth.id+'"]'),
      noPageOverflow:document.documentElement.scrollWidth<=innerWidth+1};
  })()`);
  assert(fifthCompetitor.count===5&&fifthCompetitor.addEnabledBefore&&fifthCompetitor.addEnabledAfter&&
    fifthCompetitor.preserved&&fifthCompetitor.productIdKept&&fifthCompetitor.filter===''&&
    fifthCompetitor.page===4&&fifthCompetitor.pageSize===1&&fifthCompetitor.pager==='Конкуренты 5–5 из 5'&&
    fifthCompetitor.newVisible&&fifthCompetitor.noPageOverflow,JSON.stringify(fifthCompetitor));
  await evaluate(`document.querySelector('[data-g1pc-grid]').scrollIntoView({block:'start'});true`);
  const fiveMobileScreenshot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  writeFileSync('artifacts/product-comparison-five-competitors-mobile.png',Buffer.from(fiveMobileScreenshot.data,'base64'));
  await evaluate(`document.querySelector('[data-g1pc-guide]').scrollIntoView({block:'start'});true`);
  const addAfterFiveScreenshot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  writeFileSync('artifacts/product-comparison-add-after-five-mobile.png',Buffer.from(addAfterFiveScreenshot.data,'base64'));
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await new Promise(resolve=>setTimeout(resolve,150));
  const sixthCompetitor=await evaluate(`(async () => {
    const {entry}=window.__gridTest,root=document.querySelector('[data-g1pc-unified]');
    const previousIds=entry.competitors.map(row=>row.id);
    root.querySelector('[data-g1pc-form-toggle]').click();
    const form=root.querySelector('[data-g1pc-form]');
    form.elements.domain.value='sixth.example.test';form.elements.title.value='Шестой конкурент в выдаче';
    form.elements.name.value='Шестой конкурент';
    form.querySelector('[name="comparisonType"][value="direct"]').click();
    form.querySelector('[name="similarity"][value="yes"]').click();
    form.querySelector('.g1-company-search-guide-actions button[type="submit"]').click();
    await new Promise(resolve=>setTimeout(resolve,60));
    const sixth=entry.competitors[5],grid=root.querySelector('[data-g1pc-grid]');
    return {count:entry.competitors.length,previousIdsKept:previousIds.every((id,index)=>entry.competitors[index].id===id),
      addEnabled:!root.querySelector('[data-g1pc-form-toggle]').disabled,
      page:g1ProductComparisonScreen(window.__gridTest.pid).page,pageSize:g1ProductComparisonPageSize(),
      pager:root.querySelector('.g1-company-compare-pager span').textContent,
      columns:grid.querySelectorAll('.g1pc-identity-cell').length,
      fifthVisible:!!grid.querySelector('[data-g1pc-column="'+entry.competitors[4].id+'"]'),
      sixthVisible:!!grid.querySelector('[data-g1pc-column="'+sixth.id+'"]'),
      noPageOverflow:document.documentElement.scrollWidth<=innerWidth+1};
  })()`);
  assert(sixthCompetitor.count===6&&sixthCompetitor.previousIdsKept&&sixthCompetitor.addEnabled&&
    sixthCompetitor.page===2&&sixthCompetitor.pageSize===2&&sixthCompetitor.pager==='Конкуренты 5–6 из 6'&&
    sixthCompetitor.columns===3&&sixthCompetitor.fifthVisible&&sixthCompetitor.sixthVisible&&sixthCompetitor.noPageOverflow,
    JSON.stringify(sixthCompetitor));
  await evaluate(`document.querySelector('[data-g1pc-grid]').scrollIntoView({block:'start'});true`);
  const sixWideScreenshot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  writeFileSync('artifacts/product-comparison-six-competitors-wide.png',Buffer.from(sixWideScreenshot.data,'base64'));
  const draftFieldSizing=await evaluate(`(() => {
    const root=document.querySelector('[data-g1pc-unified]');
    root.querySelector('[data-g1pc-form-toggle]').click();
    const form=root.querySelector('[data-g1pc-form]');
    return Object.fromEntries(['title','domain','description','rating','reviews','price'].map(name=>{
      const field=form.elements[name],style=getComputedStyle(field);
      return [name,{height:field.getBoundingClientRect().height,scrollHeight:field.scrollHeight,
        rows:field.rows||null,inlineHeight:field.style.height,minHeight:style.minHeight,
        lineHeight:style.lineHeight,padding:style.padding}];
    }));
  })()`);
  assert(Object.values(draftFieldSizing).every(field=>field.height===42&&field.scrollHeight<=field.height&&
    (field.rows===null||field.rows===1)),JSON.stringify(draftFieldSizing));
  await evaluate(`document.querySelector('[data-g1pc-form] .g1pc-search-card').scrollIntoView({block:'start'});true`);
  const draftWideScreenshot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  writeFileSync('artifacts/product-comparison-draft-fields-wide.png',Buffer.from(draftWideScreenshot.data,'base64'));
  const draftLongWide=await evaluate(`(() => {
    const form=document.querySelector('[data-g1pc-form]');
    const title=form.elements.title,description=form.elements.description;
    window.__longTitle='Длинный заголовок товара для поисковой выдачи с подробным описанием особенностей предложения и преимуществ покупки. '.repeat(5);
    window.__longDescription='Описание с подробностями доставки, гарантии и условий покупки для сравнения предложений. '.repeat(8);
    title.value=window.__longTitle;title.dispatchEvent(new Event('input',{bubbles:true}));
    description.value=window.__longDescription;description.dispatchEvent(new Event('input',{bubbles:true}));
    return {titleHeight:title.clientHeight,descriptionHeight:description.clientHeight,
      titleFits:title.scrollHeight<=title.clientHeight+1,descriptionFits:description.scrollHeight<=description.clientHeight+1};
  })()`);
  assert(draftLongWide.titleHeight>42&&draftLongWide.descriptionHeight>42&&
    draftLongWide.titleFits&&draftLongWide.descriptionFits,JSON.stringify(draftLongWide));
  await page.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  await new Promise(resolve=>setTimeout(resolve,150));
  const draftLongNarrow=await evaluate(`(() => {
    const form=document.querySelector('[data-g1pc-form]'),title=form.elements.title,description=form.elements.description;
    const before={titleHeight:title.clientHeight,descriptionHeight:description.clientHeight,
      titleScroll:title.scrollHeight,descriptionScroll:description.scrollHeight,
      titleInline:title.style.height,descriptionInline:description.style.height,
      titleFits:title.scrollHeight<=title.clientHeight+1,descriptionFits:description.scrollHeight<=description.clientHeight+1,
      valuesKept:title.value===window.__longTitle&&description.value===window.__longDescription,
      noPageOverflow:document.documentElement.scrollWidth<=innerWidth+1};
    title.value='';title.dispatchEvent(new Event('input',{bubbles:true}));
    description.value='';description.dispatchEvent(new Event('input',{bubbles:true}));
    return {...before,titleShrunk:title.getBoundingClientRect().height===42,
      titleEmptyHeight:title.getBoundingClientRect().height,
      descriptionShrunk:description.getBoundingClientRect().height===42,
      descriptionEmptyHeight:description.getBoundingClientRect().height};
  })()`);
  assert(draftLongNarrow.titleHeight>draftLongWide.titleHeight&&
    draftLongNarrow.descriptionHeight>draftLongWide.descriptionHeight&&
    draftLongNarrow.titleFits&&draftLongNarrow.descriptionFits&&draftLongNarrow.valuesKept&&
    draftLongNarrow.noPageOverflow&&draftLongNarrow.titleShrunk&&draftLongNarrow.descriptionShrunk,
    JSON.stringify(draftLongNarrow));
  await evaluate(`document.querySelector('[data-g1pc-form] .g1pc-search-card').scrollIntoView({block:'start'});true`);
  const draftMobileScreenshot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  writeFileSync('artifacts/product-comparison-draft-fields-mobile.png',Buffer.from(draftMobileScreenshot.data,'base64'));
  console.log(JSON.stringify({setup,wrappedCriteria,allCriteriaFit,choicePlacementAndLiveUpdate,interactions,narrow,stickyAfterScroll,saveWithoutLandingSetup,saveWithoutLanding,addAndSubstitute,fifthCompetitor,sixthCompetitor,draftFieldSizing,draftLongWide,draftLongNarrow},null,2));
} finally {
  page.close(); await browser.call('Target.disposeBrowserContext',{browserContextId});browser.close();
}
