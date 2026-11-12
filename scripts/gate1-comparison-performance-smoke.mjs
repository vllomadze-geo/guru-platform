import { readFile, writeFile } from "node:fs/promises";

const source = JSON.parse(await readFile(process.env.GURU_GATE1_EXPORT || "/Users/vl/Downloads/gate-1.json", "utf8"));
const fixture = JSON.parse(JSON.stringify({
  content: Object.fromEntries(["project", "projectComparison", "painV130", "unitV130", "unitEconomicsRoute"]
    .map((key) => [key, source.content[key]])),
  structure: source.structure,
}, (_key, value) => typeof value === "string" && value.startsWith("data:image/")
  ? "[image omitted for isolated test]" : value));
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const port = process.env.GURU_CHROME_DEBUG_PORT || "9358";
const productId = "catalog-item-1786792591872-51f503";

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.pending = new Map();
    this.id = 0;
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      message.error ? pending.reject(Error(message.error.message)) : pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => reject(Error(`CDP timeout: ${method}`)), 120000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const browserVersion = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(browserVersion.webSocketDebuggerUrl);
const { browserContextId } = await browser.call("Target.createBrowserContext");
let page;
try {
  const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
  const target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((row) => row.id === targetId);
  page = new Cdp(target.webSocketDebuggerUrl);
  const evaluate = async (expression) => {
    const result = await page.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression) => {
    for (let attempt = 0; attempt < 300; attempt++) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw Error(`Timed out waiting for ${expression}`);
  };
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Page.bringToFront");
  await page.call("Emulation.setFocusEmulationEnabled", { enabled: true });
  await browser.call("Browser.grantPermissions", { permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"], origin: new URL(appUrl).origin, browserContextId });
  await page.call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    localStorage.setItem('guru-platform-access-v01','unlocked');
    const originalFetch=window.fetch.bind(window);
    window.fetch=(input,init)=>String(input).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,isolated:true}),{status:200,headers:{'Content-Type':'application/json'}})):originalFetch(input,init);
  }` });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof g1BergenMigrateV543 === "function"');
  const setup = await evaluate(`(() => {
    scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
    state=createFreshWorkspace({id:'gate1-comparison-perf-isolated',name:'Изолированная Коза'});
    const imported=${JSON.stringify(fixture)};
    for(const [key,value] of Object.entries(imported.content))state[key]=structuredClone(value);
    state.gates[state.gates.findIndex(g=>g.id==='gate-1')]=structuredClone(imported.structure);
    const relations=megaPlatformCategoryStore(state);
    for(const item of state.project.catalogItemsV189||[])if(item.categoryId)relations.categoryIdsByProduct[item.id]=[item.categoryId];
    state.project.id='gate1-comparison-perf-isolated';activeProjectId=state.project.id;activeView='gate';activeGateId='gate-1';
    // Worker saves reject projects absent from the project registry.
    projects=[{id:state.project.id,name:state.project.name,lifecycleStatus:'active'}];
    els.launcher.hidden=true;els.appShell.hidden=false;updateProjectChrome();guruV194Ensure(state);
    const product=guruV194Product(${JSON.stringify(productId)},state),ui=guruV194Ui(state);
    ui.selectedCategoryId=product.categoryId;ui.selectedProductId=product.id;
    const entry=ensureProjectComparisonProduct(product.id);entry.open=true;
    // Keep browser test data isolated and measure UI work without a localStorage quota dependency.
    window.__perfOriginalFlashSaving=flashSaving;
    flashSaving=()=>{};guruScheduleUiPreferenceSave=()=>{};
    renderGate();
    const pid=product.id;
    const maps=pv140EnsureProductMaps();
    const mapIndex=maps.reduce((best,map,index)=>
      (map.items?.[pid]?.demandRows?.length||0)>(maps[best]?.items?.[pid]?.demandRows?.length||0)?index:best,0);
    const host=window.__perfKeywordHost=document.createElement('div');
    host.dataset.perfKeywordHost='';
    document.querySelector('#contentArea').append(host);
    host.innerHTML=pv181SemLevelHtml(mapIndex,pid,PV181_ITEM_LEVELS[0],[],product.url,maps[mapIndex]);
    const sourceEntries=guruGate1GroupFinalEntriesV279('primary','',pid,maps[mapIndex].items[pid]);
    const additional=document.createElement('section');
    additional.dataset.perfSyntheticAdditional='';
    additional.innerHTML=guruGate1JtbdDemandListHtmlV278(sourceEntries.slice(0,3),{
      scope:'additional:isolated-check',rowsClass:'pv181-additional-jtbd-demand-rows-v274',
      mapIndex,itemId:pid,itemData:maps[mapIndex].items[pid],readOnlyScope:'additional'});
    host.append(additional);
    return {competitorIds:entry.competitors.map(c=>c.id),phraseCounts:g1BergenJtbdsV543(product).map(j=>j.phrases.length),
      groupMapIndex:mapIndex,groupCount:host.querySelectorAll('.pv181-jtbd-demand-details-v278').length};
  })()`);
  if (process.env.GURU_CAPTURE_JTBD === "1") {
    await page.call("Emulation.setDeviceMetricsOverride", { width: 1800, height: 1200, deviceScaleFactor: 1, mobile: false });
    const clip = await evaluate(`(async()=>{
      const group=document.querySelector('.pv181-jtbd-demand-details-v278');
      group.open=true;group.scrollIntoView({block:'start',behavior:'instant'});
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const rect=group.getBoundingClientRect();
      return {x:Math.max(0,rect.left+scrollX-8),y:Math.max(0,rect.top+scrollY-8),
        width:Math.min(rect.width+16,1500),height:Math.min(rect.height+16,900),scale:1};
    })()`);
    const shot = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip });
    await writeFile("/private/tmp/gate1-jtbd-keyword-actions-v553.png", Buffer.from(shot.data, "base64"));
  }
  const metrics = await evaluate(`(() => {
    const section=document.querySelector('[data-g1bp-product-v543]');
    const sample=(callback,iterations=6)=>{const times=[];for(let i=0;i<iterations;i++){const t=performance.now();callback();times.push(performance.now()-t);}return{medianMs:times.sort((a,b)=>a-b)[Math.floor(times.length/2)],maxMs:Math.max(...times)}};
    section.querySelector('[data-g1pc-competitor-toggle]')?.click();
    const target=section.querySelector('[data-g1pc-match-panel] [data-g1bp-domain-v543]');
    if(!target)throw Error('Canonical competitor domain input missing');
    const product=guruV194Product(${JSON.stringify(productId)},state),entry=ensureProjectComparisonProduct(product.id),jtbds=g1BergenJtbdsV543(product);
    const lookup=sample(()=>g1BergenFindV543(target));
    const status=sample(()=>g1BergenRefreshStatusV543(section,entry,jtbds));
    const input=sample(()=>{target.value='https://example.test/product?ref=123';target.dispatchEvent(new Event('input',{bubbles:true}));});
    target.focus();
    const t=performance.now();target.dispatchEvent(new Event('change',{bubbles:true}));const changeMs=performance.now()-t;
    const stableAfterUrlChange=section.isConnected&&target.isConnected&&document.activeElement===target;
    const select=section.querySelector('[data-g1bp-relevance-v549]');
    const t2=performance.now();select.value=select.value==='high'?'medium':'high';select.dispatchEvent(new Event('change',{bubbles:true}));const relevanceMs=performance.now()-t2;
    const button=section.querySelector('[data-g1bp-select-keyword-v550]');
    const t3=performance.now();button.click();const selectKeywordMs=performance.now()-t3;
    const t4=performance.now();const json=JSON.stringify(state);const stringifyMs=performance.now()-t4;
    return {lookup,status,input,changeMs,stableAfterUrlChange,relevanceMs,selectKeywordMs,stringifyMs,serializedBytes:new Blob([json]).size,competitorIds:entry.competitors.map(c=>c.id)};
  })()`);
  const productInputProfile = await evaluate(`(async()=>{
    const section=document.querySelector('[data-g1bp-product-v543]');
    section.querySelector('[data-g1pc-queries-toggle]')?.click();
    flashSaving=window.__perfOriginalFlashSaving;
    const selectors={name:'[data-g1pc-match-panel] [data-g1bp-name-v543]',
      domain:'[data-g1pc-match-panel] [data-g1bp-domain-v543]',
      title:'[data-g1pc-match-panel] [data-g1bp-ad-part-v572="title"]',
      description:'[data-g1pc-match-panel] [data-g1bp-ad-part-v572="description"]',
      landingUrl:'[data-g1pc-match-panel] [data-g1bp-field-v543="landingUrl"]',
      rating:'[data-g1pc-match-panel] [data-g1bp-search-field-v569="rating"]',
      reviews:'[data-g1pc-match-panel] [data-g1bp-search-field-v569="reviews"]',
      details:'[data-g1pc-match-panel] [data-g1bp-search-field-v569="details"]',
      price:'[data-g1pc-match-panel] [data-g1bp-field-v543="price"]',
      product:'[data-g1pc-match-panel] [data-g1bp-field-v543="product"]',
      positioning:'[data-g1pc-column] [data-g1bp-field-v543="positioning"]',
      evidence:'[data-g1pc-detailed] [data-g1bp-field-v543="evidence"]',
      querySearch:'[data-g1pc-query-search]'};
    const functions=['g1BergenFindV543','g1BergenRefreshStatusV543','g1ProductComparisonRefreshReadOnlySearch',
      'g1ProductComparisonModel','guruV194ScheduleProductSelectorRefreshV1',
      'guruV194RefreshProductSelectorsV1','guruQueueWorkspaceSave'];
    const original={},stats={};
    for(const name of functions){original[name]=window[name];stats[name]={calls:0,totalMs:0,maxMs:0};
      window[name]=function(...args){const start=performance.now();try{return original[name].apply(this,args)}finally{
        const elapsed=performance.now()-start;stats[name].calls++;stats[name].totalMs+=elapsed;
        stats[name].maxMs=Math.max(stats[name].maxMs,elapsed);}};}
    const fields={};
    try {for(const [name,selector] of Object.entries(selectors)){
      const field=section.querySelector(selector);if(!field){fields[name]={missing:true};continue;}
      const previous=field.value;field.focus();const start=performance.now();
      field.value=previous+'x';field.dispatchEvent(new Event('input',{bubbles:true}));
      const dispatchMs=performance.now()-start;
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      fields[name]={dispatchMs,throughPaintMs:performance.now()-start,focused:document.activeElement===field,
        connected:field.isConnected,value:field.value};
    }
      await new Promise(resolve=>setTimeout(resolve,1700));
    }finally{for(const name of functions)window[name]=original[name];flashSaving=()=>{};}
    return {fields,stats,productContexts:document.querySelectorAll('[data-guru-product-context]').length};
  })()`);
  if (productInputProfile.stats.guruV194RefreshProductSelectorsV1.calls !== 0 ||
      productInputProfile.stats.guruV194ScheduleProductSelectorRefreshV1.calls !== 0 ||
      Object.entries(productInputProfile.fields).some(([name, field]) =>
        name !== "evidence" && (field.missing || !field.focused || !field.connected)))
    throw Error("Product comparison typing rerender regression: " + JSON.stringify(productInputProfile));
  const persistence = await evaluate(`(async()=>{
    flashSaving=window.__perfOriginalFlashSaving;
    flashSaving();
    // Large workspaces are saved through a worker into IndexedDB; the small
    // localStorage project index is not a workspace snapshot.
    const saveStarted=performance.now();
    let serialized='',saved=null;
    while(performance.now()-saveStarted<20000){
      serialized=localStorage.getItem(WORKSPACE_STORAGE_PREFIX+activeProjectId)||
        (await guruWorkspaceIdbReadV1(activeProjectId))?.serialized||'';
      if(serialized){
        saved=JSON.parse(serialized);
        const comparison=saved?.projectComparison?.productsById?.[${JSON.stringify(productId)}];
        if(comparison?.competitors?.[0]?.domain==='https://example.test/product?ref=123')break;
      }
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    const entry=saved?.projectComparison?.productsById?.[${JSON.stringify(productId)}];
    return {writes:serialized?1:0,bytes:serialized.length,
      competitorIds:entry?.competitors?.map(row=>row.id)||[],
      domain:entry?.competitors?.[0]?.domain||'',
      name:entry?.competitors?.[0]?.name||'',
      title:entry?.competitors?.[0]?.bergenV543?.advertisements?.split('\\n')[0]||'',
      relevanceCount:Object.values(entry?.keywordRelevanceByPhraseV549||{}).filter(Boolean).length,
      selectedCount:Object.values(entry?.selectedKeywordKeysByJtbdV550||{}).flat().length};
  })()`);
  if (!metrics.stableAfterUrlChange || persistence.writes<1 ||
      JSON.stringify(persistence.competitorIds)!==JSON.stringify(setup.competitorIds) ||
      persistence.domain!=="https://example.test/product?ref=123" ||
      persistence.name!==productInputProfile.fields.name.value ||
      !persistence.title.includes(productInputProfile.fields.title.value) ||
      persistence.relevanceCount<1 || persistence.selectedCount<1)
    throw Error("Comparison edit or autosave regression: "+JSON.stringify({metrics,persistence}));
  const keywordActions = await evaluate(`(async()=>{
    const groups=[...document.querySelectorAll('.pv181-jtbd-demand-details-v278')];
    const scoped=groups.map(group=>({scope:group.dataset.pv181JtbdDemandDetailsV278,
      rows:group.querySelectorAll('.pv181-demand-row.g1kw-actions-v553').length,
      copies:group.querySelectorAll('.g1kw-copy-cell-v553 button').length,
      ratings:group.querySelectorAll('[data-g1kw-relevance-v553]').length,
      header:[...group.querySelectorAll('.pv181-demand-table-head-v263 > span')].map(n=>n.getAttribute('aria-label')||n.textContent.replace(/[↕↑↓]/gu,'').trim())}));
    const additionalKeys=new Set([...document.querySelectorAll('[data-perf-synthetic-additional] [data-g1kw-relevance-v553]')]
      .map(control=>control.dataset.g1kwPhraseV553));
    const target=[...document.querySelectorAll('[data-g1kw-relevance-v553]')].find(control=>
      !control.closest('[data-perf-synthetic-additional]') && additionalKeys.has(control.dataset.g1kwPhraseV553) &&
      [...document.querySelectorAll('[data-g1bp-phrase-v549]')].some(other=>
        other.dataset.g1bpPhraseV549===control.dataset.g1kwPhraseV553));
    if(!target)return {scoped,diagnostic:{groupCount:groups.length,
      groupPhrases:[...document.querySelectorAll('[data-g1kw-relevance-v553]')].slice(0,5).map(n=>n.dataset.g1kwPhraseV553),
      comparisonPhrases:[...document.querySelectorAll('[data-g1bp-phrase-v549]')].slice(0,5).map(n=>n.dataset.g1bpPhraseV549)}};
    const key=target.dataset.g1kwPhraseV553,productId=target.dataset.g1kwProductV553;
    const row=target.closest('.pv181-demand-row'),copy=row.querySelector('.g1kw-copy-cell-v553 button');
    const phrase=copy.dataset.g1CompetitorCopyV539;
    let copySaveCalls=0,comparisonChangeEvents=0;
    const originalFlashSaving=flashSaving;
    const countComparisonChange=(event)=>{if(event.target?.matches?.('[data-g1bp-phrase-v549]'))comparisonChangeEvents++};
    document.addEventListener('change',countComparisonChange);
    flashSaving=(...args)=>{copySaveCalls++;return originalFlashSaving(...args)};
    const copyStart=performance.now();copy.click();const copyClickMs=performance.now()-copyStart;
    await new Promise(resolve=>setTimeout(resolve,70));flashSaving=originalFlashSaving;
    const pasted=await navigator.clipboard.readText();
    const demandBefore=JSON.stringify(state.painV130);
    const idsBefore=state.projectComparison.productsById[productId].competitors.map(c=>c.id);
    const syncTimings={groupUiMs:0,comparisonUiMs:0,saveDispatchMs:0};
    const groupUi=guruGate1UpdateKeywordRelevanceUiV553,comparisonUi=g1BergenSyncRelevanceUiV554,saveDispatch=flashSaving;
    guruGate1UpdateKeywordRelevanceUiV553=(...args)=>{const t=performance.now();try{return groupUi(...args)}finally{syncTimings.groupUiMs+=performance.now()-t}};
    g1BergenSyncRelevanceUiV554=(...args)=>{const t=performance.now();try{return comparisonUi(...args)}finally{syncTimings.comparisonUiMs+=performance.now()-t}};
    flashSaving=(...args)=>{const t=performance.now();try{return saveDispatch(...args)}finally{syncTimings.saveDispatchMs+=performance.now()-t}};
    target.closest('details').open=true;
    target.focus();const t1=performance.now();target.value='low';target.dispatchEvent(new Event('change',{bubbles:true}));
    const fromGroupMs=performance.now()-t1;
    guruGate1UpdateKeywordRelevanceUiV553=groupUi;g1BergenSyncRelevanceUiV554=comparisonUi;flashSaving=saveDispatch;
    document.removeEventListener('change',countComparisonChange);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const comparison=[...document.querySelectorAll('[data-g1bp-phrase-v549]')].find(n=>n.dataset.g1bpPhraseV549===key);
    const comparisonAfterGroup=comparison.value;
    const groupsAfterLow=groups.map(group=>{
      const rows=[...group.querySelectorAll('.pv181-demand-row.g1kw-actions-v553')];
      const ratings=state.projectComparison.productsById[productId].keywordRelevanceByPhraseV549;
      const rank=rows.map(item=>guruGate1KeywordRelevanceRankV553(ratings[item.dataset.g1kwRowV553]));
      return rank.every((value,index)=>index===0||rank[index-1]<=value);
    });
    const groupStable=target.isConnected&&document.activeElement===target&&
      state.projectComparison.productsById[productId].keywordRelevanceByPhraseV549[key]==='low';
    const t2=performance.now();comparison.value='medium';comparison.dispatchEvent(new Event('change',{bubbles:true}));
    const fromComparisonMs=performance.now()-t2;
    const groupAfterComparison=target.value;
    const ratingSaveStarted=performance.now();
    let saved=null,seenSerialized='';
    while(performance.now()-ratingSaveStarted<5000){
      const serialized=localStorage.getItem(WORKSPACE_STORAGE_PREFIX+activeProjectId)||
        (await guruWorkspaceIdbReadV1(activeProjectId))?.serialized||'';
      if(serialized && serialized!==seenSerialized){
        seenSerialized=serialized;
        saved=JSON.parse(serialized);
      }
      if(saved?.projectComparison?.productsById?.[productId]?.keywordRelevanceByPhraseV549?.[key]==='medium')break;
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    const duplicateRatings=[...document.querySelectorAll('[data-g1kw-phrase-v553]')]
      .filter(control=>control.dataset.g1kwPhraseV553===key).map(control=>control.value);
    const rapid=[...groups[0].querySelectorAll('[data-g1kw-relevance-v553]')]
      .filter(control=>control.dataset.g1kwPhraseV553!==key).slice(0,3);
    rapid.forEach((control,index)=>{control.value=['low','high','medium'][index];control.dispatchEvent(new Event('change',{bubbles:true}))});
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const ratings=state.projectComparison.productsById[productId].keywordRelevanceByPhraseV549;
    const orderedRows=[...groups[0].querySelectorAll('.pv181-demand-row.g1kw-actions-v553')];
    const rapidGroupSorted=orderedRows.every((item,index)=>index===0||
      guruGate1KeywordRelevanceRankV553(ratings[orderedRows[index-1].dataset.g1kwRowV553])<
        guruGate1KeywordRelevanceRankV553(ratings[item.dataset.g1kwRowV553]) ||
      (guruGate1KeywordRelevanceRankV553(ratings[orderedRows[index-1].dataset.g1kwRowV553])===
       guruGate1KeywordRelevanceRankV553(ratings[item.dataset.g1kwRowV553]) &&
       Number(orderedRows[index-1].dataset.g1kwSourceOrderV553)<Number(item.dataset.g1kwSourceOrderV553)));
    const host=window.__perfKeywordHost,maps=pv140EnsureProductMaps();
    host.innerHTML=pv181SemLevelHtml(${setup.groupMapIndex},productId,PV181_ITEM_LEVELS[0],[],
      guruV194Product(productId,state).url,maps[${setup.groupMapIndex}]);
    const afterRerender=[...host.querySelectorAll('[data-g1kw-relevance-v553]')]
      .find(control=>control.dataset.g1kwPhraseV553===key)?.value;
    return {scoped,phrase,pasted,copyClickMs,copySaveCalls,comparisonChangeEvents,syncTimings,
      fromGroupMs,fromComparisonMs,comparisonAfterGroup,
      groupAfterComparison,groupStable,groupsAfterLow,duplicateRatings,rapidGroupSorted,afterRerender,
      sourceUnchanged:demandBefore===JSON.stringify(state.painV130),
      competitorIdsUnchanged:JSON.stringify(idsBefore)===JSON.stringify(state.projectComparison.productsById[productId].competitors.map(c=>c.id)),
      savedRating:saved?.projectComparison?.productsById?.[productId]?.keywordRelevanceByPhraseV549?.[key],
      savedWrites:seenSerialized?1:0};
  })()`);
  const saveScheduling = await evaluate(`(async()=>{
    guruCancelDerivedRefresh();guruDerivedRefreshRequired=false;
    flashSaving({skipDerivedRefresh:true});
    await new Promise(resolve=>setTimeout(resolve,1400));
    const relevanceOnlySkipsDerived=!guruDerivedRefreshRequired;
    guruCancelDerivedRefresh();guruDerivedRefreshRequired=false;
    flashSaving();flashSaving({skipDerivedRefresh:true});
    await new Promise(resolve=>setTimeout(resolve,700));
    const mixedEditKeepsDerived=guruDerivedRefreshRequired;
    guruCancelDerivedRefresh();guruDerivedRefreshRequired=false;
    return {relevanceOnlySkipsDerived,mixedEditKeepsDerived};
  })()`);
  if (keywordActions.scoped.length<2 || keywordActions.scoped.some(group=>
      !group.rows || group.rows!==group.copies || group.rows!==group.ratings ||
      group.header[7]!=="Копировать" || group.header[8]!=="Релевантность") ||
      keywordActions.pasted!==keywordActions.phrase || keywordActions.copySaveCalls!==0 ||
      keywordActions.comparisonChangeEvents!==0 || !keywordActions.groupStable ||
      keywordActions.comparisonAfterGroup!=="low" || keywordActions.groupAfterComparison!=="medium" ||
      !keywordActions.groupsAfterLow.every(Boolean) || !keywordActions.rapidGroupSorted ||
      keywordActions.duplicateRatings.some(value=>value!=="medium") ||
      keywordActions.afterRerender!=="medium" ||
      !keywordActions.sourceUnchanged || !keywordActions.competitorIdsUnchanged ||
      keywordActions.savedRating!=="medium" || keywordActions.savedWrites<1 ||
      !saveScheduling.relevanceOnlySkipsDerived || !saveScheduling.mixedEditKeepsDerived)
    throw Error("JTBD keyword actions regression: "+JSON.stringify({keywordActions,saveScheduling}));
  console.log(JSON.stringify({setup,metrics,productInputProfile,persistence,keywordActions,saveScheduling},null,2));
} finally {
  page?.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
