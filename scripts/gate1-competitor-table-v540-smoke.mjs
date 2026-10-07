import { readFile, mkdir, writeFile } from "node:fs/promises";

const source = JSON.parse(await readFile(process.env.GURU_GATE1_EXPORT || "/Users/vl/Downloads/gate-1.json", "utf8"));
const trimMedia = (value) => JSON.parse(JSON.stringify(value, (_key, item) =>
  typeof item === "string" && item.startsWith("data:image/") ? "[image omitted for isolated test]" : item));
const fixture = trimMedia({
  content: {
    project: source.content.project,
    projectComparison: source.content.projectComparison,
    painV130: source.content.painV130,
    unitV130: source.content.unitV130,
    unitEconomicsRoute: source.content.unitEconomicsRoute,
  },
  structure: source.structure,
});
const productId = "catalog-item-1786792591872-51f503";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const port = process.env.GURU_CHROME_DEBUG_PORT || "9358";
const artifacts = new URL("../artifacts/", import.meta.url);
const assert = (condition, message) => { if (!condition) throw Error(message); };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await mkdir(artifacts, { recursive: true });

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
      const message = JSON.parse(data), pending = this.pending.get(message.id);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(message.id);
      message.error ? pending.reject(Error(message.error.message)) : pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id, timer = setTimeout(() => reject(Error(`CDP timeout: ${method}`)), 120000);
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
  const evaluate = async (expression, userGesture = false) => {
    const result = await page.call("Runtime.evaluate", { expression, userGesture, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression) => {
    for (let attempt = 0; attempt < 300; attempt++) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await pause(100);
    }
    throw Error(`Timed out waiting for ${expression}`);
  };
  const screenshot = async (name, selector, maxHeight = 0) => {
    const clip = await evaluate(`(async()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n)throw Error('Screenshot target missing');n.scrollIntoView({block:'start',behavior:'instant'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const b=n.getBoundingClientRect();return {x:Math.max(0,b.left+scrollX-8),y:Math.max(0,b.top+scrollY-8),width:b.width+16,height:${maxHeight} ? Math.min(b.height+16,${maxHeight}) : b.height+16,scale:1}})()`);
    const result = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip });
    await writeFile(new URL(name, artifacts), Buffer.from(result.data, "base64"));
  };
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1050, deviceScaleFactor: 1, mobile: false });
  await browser.call("Browser.grantPermissions", { permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"], origin: new URL(appUrl).origin, browserContextId });
  await page.call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    const originalFetch=window.fetch.bind(window);
    window.fetch=(input,init)=>String(input).includes('/api/') ? Promise.resolve(new Response(JSON.stringify({ok:true,isolatedSmoke:true}),{status:200,headers:{'Content-Type':'application/json'}})) : originalFetch(input,init);
    window.__workflowErrors=[];
    window.addEventListener('error',event=>window.__workflowErrors.push(event.message));
    window.addEventListener('unhandledrejection',event=>window.__workflowErrors.push(String(event.reason)));
  }` });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof g1ComparisonTableHtmlV540 === "function"');
  const initialized = await evaluate(`(() => {
    scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
    state=createFreshWorkspace({id:'gate1-comparison-v540-smoke',name:'Изолированная проверка Козы'});
    const imported=${JSON.stringify(fixture)};
    for(const [key,value] of Object.entries(imported.content))state[key]=structuredClone(value);
    state.gates[state.gates.findIndex(g=>g.id==='gate-1')]=structuredClone(imported.structure);
    const relations=megaPlatformCategoryStore(state);
    for(const item of state.project.catalogItemsV189||[])if(item.categoryId)relations.categoryIdsByProduct[item.id]=[item.categoryId];
    state.project.id='gate1-comparison-v540-smoke';activeProjectId=state.project.id;activeView='gate';activeGateId='gate-1';
    els.launcher.hidden=true;els.appShell.hidden=false;updateProjectChrome();guruV194Ensure(state);
    const pid=${JSON.stringify(productId)},product=guruV194Product(pid,state),ui=guruV194Ui(state);
    ui.selectedCategoryId=product.categoryId;ui.selectedProductId=pid;
    const entry=ensureProjectComparisonProduct(pid),original=entry.competitors[0],beforeIds=entry.competitors.map(c=>c.id);
    entry.open=true;
    original.stepsV539[3]={...(original.stepsV539[3]||{}),characteristics:'Сохранённые характеристики'};
    original.foundPhraseKeysV539=['подарок ручной работы'];
    guruPersistStateFast=()=>true;saveState=()=>true;flashSaving=()=>{};guruScheduleUiPreferenceSave=()=>{};
    renderGate();
    const phrases=g1CompetitorPhrasesV539(product);
    window.__g1ctSmoke={pid,product,entry,original,beforeIds,originalRef:original};
    return {beforeIds,afterIds:entry.competitors.map(c=>c.id),sameObject:entry.competitors[0]===original,price:g1CompetitorContextV539(product).price.raw,ranked:phrases.ranked.map(row=>({value:row.value,frequency:row.frequency})),source:phrases.source,file:phrases.file,confirmed:phrases.confirmed.length,errors:window.__workflowErrors};
  })()`);
  await waitFor('document.querySelector(".g1ct-table-v540")');
  assert(initialized.sameObject&&JSON.stringify(initialized.beforeIds)===JSON.stringify(initialized.afterIds),"Existing competitor was recreated: "+JSON.stringify(initialized));
  assert(initialized.price==='4 900'&&initialized.ranked.length===15&&initialized.confirmed===59&&initialized.source==='Прогноз Директа',"Product source failed: "+JSON.stringify(initialized));
  const first = await evaluate(`(() => ({tables:document.querySelectorAll('.g1ct-table-v540').length,oldSteps:document.querySelectorAll('.g1-competitor-step-v539').length,oldSummary:document.querySelectorAll('.g1-competitor-summary-v539').length,preserved:window.__g1ctSmoke.entry.competitors[0].stepsV539[3].characteristics,columns:document.querySelectorAll('.g1ct-table-v540 thead th').length}))()`);
  assert(first.tables===1&&first.oldSteps===0&&first.oldSummary===0&&first.preserved==='Сохранённые характеристики'&&first.columns===3,"Table replacement failed: "+JSON.stringify(first));
  const added = await evaluate(`(() => {document.querySelector('[data-g1ct-add-v540]').click();const e=window.__g1ctSmoke.entry;return {ids:e.competitors.map(c=>c.id),sameOriginal:e.competitors[0]===window.__g1ctSmoke.originalRef};})()`);
  assert(added.ids.length===2&&added.ids[0]===initialized.beforeIds[0]&&added.sameOriginal,"Adding column replaced competitor: "+JSON.stringify(added));
  const populated = await evaluate(`(() => {
    const e=window.__g1ctSmoke.entry,[first,second]=e.competitors;
    const domain1=document.querySelector('[data-g1ct-domain-v540="'+first.id+'"]');domain1.value='https://www.magicmag.net/catalog/goat';domain1.dispatchEvent(new Event('change',{bubbles:true}));
    const domain2=document.querySelector('[data-g1ct-domain-v540="'+second.id+'"]');domain2.value='substitute.example';domain2.dispatchEvent(new Event('change',{bubbles:true}));
    for(const [candidate,market,business] of [[first,'yes','yes'],[second,'yes','no']]){
      for(const [field,value] of [['sameMarket',market],['sameBusiness',business]]){
        const radio=document.querySelector('[data-g1ct-choice-v540="'+field+'"][data-g1ct-competitor-v540="'+candidate.id+'"][value="'+value+'"]');
        radio.checked=true;radio.dispatchEvent(new Event('change',{bubbles:true}));
      }
    }
    return {ids:e.competitors.map(c=>c.id),sameOriginal:e.competitors[0]===window.__g1ctSmoke.originalRef,domains:e.competitors.map(c=>[c.domain,c.siteDomainV538]),types:e.competitors.map(c=>g1CompetitorTypeV539(c)),preserved:first.stepsV539[3].characteristics};
  })()`);
  assert(populated.sameOriginal&&populated.ids[0]===initialized.beforeIds[0]&&populated.domains[0][0]==='magicmag.net'&&populated.domains[0][1]==='magicmag.net'&&populated.types.join(',')==='direct,substitute'&&populated.preserved==='Сохранённые характеристики',"Population or preservation failed: "+JSON.stringify(populated));
  const view = await evaluate(`(() => {const e=window.__g1ctSmoke.entry,second=e.competitors[1],grayCells=[...document.querySelectorAll('[data-g1ct-cell-v540^="'+second.id+':"]')].filter(n=>Number(n.dataset.g1ctCellV540.split(':').at(-1))>=3),firstRow=document.querySelector('[data-g1ct-question-v540^="3:Какой ближайший"]');return {columns:document.querySelectorAll('.g1ct-table-v540 thead th').length,phraseButtons:document.querySelectorAll('[data-g1ct-question-v540^="1:Какие фразы"] [data-g1-competitor-copy-v539]').length,step3:firstRow?.textContent,step4:document.querySelector('[data-g1ct-question-v540^="4:Сколько стоит"]')?.textContent,grayCount:grayCells.length,allGray:grayCells.every(n=>n.classList.contains('g1ct-not-required-v540')&&n.textContent.includes('Не требуется')),aligned:[...firstRow.cells].every(n=>n.getBoundingClientRect().height===firstRow.cells[0].getBoundingClientRect().height),stickyOwn:getComputedStyle(document.querySelector('.g1ct-own-v540')).position,stickyHeader:getComputedStyle(document.querySelector('.g1ct-table-v540 thead th')).position,oldSummary:!!document.querySelector('.g1-competitor-summary-v539')}})()`);
  assert(view.columns===4&&view.phraseButtons===15&&view.step3.includes('site:magicmag.net коза')&&view.step3.includes('https://k-apple.ru/simvol-2027-koza')&&view.step4.includes('4 900 ₽')&&view.grayCount>10&&view.allGray&&view.aligned&&view.stickyOwn==='sticky'&&view.stickyHeader==='sticky'&&!view.oldSummary,"Requested table content failed: "+JSON.stringify(view));
  await screenshot('gate1-goat-comparison-block-v540.png','.g1ct-v540',1100);
  await screenshot('gate1-goat-comparison-table-v540.png','.g1ct-scroll-v540');
  await evaluate(`(() => {document.querySelector('.g1ct-scroll-v540').style.maxHeight='none';const phrases=document.querySelector('.g1ct-phrases-v540.is-long');phrases.style.maxHeight='none';phrases.style.overflow='visible';})()`);
  await screenshot('gate1-goat-comparison-step1-v540.png','[data-g1ct-question-v540^="1:Какие фразы"]');
  await evaluate(`(() => {const sc=document.querySelector('.g1ct-scroll-v540');sc.style.maxHeight='';const phrases=document.querySelector('.g1ct-phrases-v540.is-long');phrases.style.maxHeight='';phrases.style.overflow='';sc.scrollTop=0;const row=document.querySelector('[data-g1ct-question-v540^="3:Какой ближайший"]');sc.scrollTop+=row.getBoundingClientRect().top-sc.getBoundingClientRect().top-260;})()`);
  await screenshot('gate1-goat-comparison-steps3-4-v540.png','.g1ct-scroll-v540');
  await evaluate(`(() => {const sc=document.querySelector('.g1ct-scroll-v540'),row=document.querySelector('[data-g1ct-question-v540^="7:Что есть"]');sc.scrollTop+=row.getBoundingClientRect().top-sc.getBoundingClientRect().top-130;})()`);
  await screenshot('gate1-goat-comparison-substitute-v540.png','.g1ct-scroll-v540');
  const selections = await evaluate(`(() => {const entry=window.__g1ctSmoke.entry,id=entry.competitors[0].id,key=g1CompetitorPhrasesV539(window.__g1ctSmoke.product).ranked[1].key,box=document.querySelector('[data-g1ct-phrase-v540="'+id+'"][value="'+key+'"]');box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));const count=document.querySelector('[data-g1ct-question-v540^="1:Сколько фраз"] [data-g1ct-cell-v540="'+id+':1"] .g1ct-answer-v540')?.textContent;const both=document.querySelector('[data-g1ct-choice-v540="placement"][data-g1ct-competitor-v540="'+id+'"][value="both"]');both.checked=true;both.dispatchEvent(new Event('change',{bubbles:true}));return {keys:entry.competitors[0].foundPhraseKeysV539,autoCount:count?.trim(),organic:entry.competitors[0].organicV539,ads:entry.competitors[0].adsV539,id:entry.competitors[0].id};})()`);
  assert(selections.keys.length===2&&selections.autoCount==='2'&&selections.organic&&selections.ads&&selections.id===initialized.beforeIds[0],"Selection or automatic count failed: "+JSON.stringify(selections));
  const copied = await evaluate(`(async()=>{const button=document.querySelector('[data-g1ct-question-v540^="1:Какие фразы"] [data-g1-competitor-copy-v539]');button.click();await new Promise(r=>setTimeout(r,100));const input=document.createElement('input');document.body.appendChild(input);input.value=await navigator.clipboard.readText();return input.value;})()`,true);
  assert(copied===initialized.ranked[0].value,"Phrase copy/paste failed: "+copied);
  const live = await evaluate(`(() => {const id=window.__g1ctSmoke.entry.competitors[0].id,field=document.querySelector('[data-g1ct-field-v540="analogName"][data-g1ct-competitor-v540="'+id+'"]');field.value='Сохранённый аналог';field.dispatchEvent(new Event('input',{bubbles:true}));const before=window.__g1ctSmoke.entry.competitors[0].stepsV539[3].analogName;field.dispatchEvent(new Event('change',{bubbles:true}));return {before,after:window.__g1ctSmoke.entry.competitors[0].stepsV539[3].analogName,id:window.__g1ctSmoke.entry.competitors[0].id};})()`);
  assert(live.before==='Сохранённый аналог'&&live.after===live.before&&live.id===initialized.beforeIds[0],"Live save failed: "+JSON.stringify(live));
  const oldCandidate = await evaluate(`(() => {const entry=structuredClone(window.__g1ctSmoke.entry),candidate={id:'saved-candidate-v539',name:'Старый заменитель',siteDomainV538:'old.example',typeV539:'substitute',classificationV539:{sameMarket:'yes',sameBusiness:'no'},foundPhraseKeysV539:['подарок ручной работы'],stepsV539:{3:{analogName:'Сохранённый аналог'}}};entry.candidatesV539.push(candidate);const before=JSON.stringify(candidate);g1ComparisonTableMigrateV540(entry);const after=entry.competitors.find(c=>c.id===candidate.id);return {id:after?.id,sameObject:after===candidate,classification:after?.classificationV539,phrases:after?.foundPhraseKeysV539,steps:after?.stepsV539,oldArrayKeepsId:entry.candidatesV539.some(c=>c.id===candidate.id),before};})()`);
  assert(oldCandidate.sameObject&&oldCandidate.id==='saved-candidate-v539'&&oldCandidate.classification.sameBusiness==='no'&&oldCandidate.phrases[0]==='подарок ручной работы'&&oldCandidate.steps[3].analogName==='Сохранённый аналог'&&oldCandidate.oldArrayKeepsId,"Saved v539 candidate migration failed: "+JSON.stringify(oldCandidate));
  const legacy = await evaluate(`(() => {const entry=structuredClone(window.__g1ctSmoke.entry),competitor={id:'saved-legacy-cells',name:'Старые ячейки',siteDomainV538:'legacy.example'},values={jtbd:'Прежняя задача',product_characteristics:'Прежние свойства',price:'5100',presentation_sales:'Прежняя посадочная',strengths_weaknesses:'Прежние сильные и слабые'};entry.competitors.push(competitor);for(const criterion of entry.criteria)criterion.cells[competitor.id]={text:values[criterion.coreKey]||''};g1ComparisonTableMigrateV540(entry);const html=g1ComparisonTableHtmlV540(entry,g1CompetitorContextV539(window.__g1ctSmoke.product));return {id:competitor.id,sameObject:entry.competitors.at(-1)===competitor,mapped:Object.fromEntries(Object.entries(G1_COMPETITOR_LEGACY_MAP_V539).map(([key,[step,field]])=>[key,competitor.stepsV539[step]?.[field]])),oldCells:Object.fromEntries(entry.criteria.map(c=>[c.coreKey,projectComparisonCell(c,competitor.id).text])),visible:Object.values(values).every(value=>html.includes(value))};})()`);
  assert(legacy.sameObject&&legacy.id==='saved-legacy-cells'&&legacy.visible&&Object.entries(legacy.mapped).every(([key,value])=>value===legacy.oldCells[key]),"Legacy criteria mapping or visibility failed: "+JSON.stringify(legacy));
  const projects = await evaluate(`(() => {const original=state,records=[];for(const id of ['korichnoe-yabloko','icleaning','sivrce','guru-2']){state=structuredClone(original);state.project.id=id;activeProjectId=id;const pid=${JSON.stringify(productId)},entry=ensureProjectComparisonProduct(pid),before=entry.competitors.map(c=>c.id),html=projectComparisonProductHtml(guruV194Product(pid,state)),after=entry.competitors.map(c=>c.id);records.push({id,before,after,table:html.includes('g1ct-table-v540'),domain:entry.competitors[0].domain});}state=original;activeProjectId=original.project.id;return records;})()`);
  assert(projects.length===4&&projects.every(row=>row.table&&JSON.stringify(row.before)===JSON.stringify(row.after)&&row.domain==='magicmag.net'),"Shared code or IDs failed across four clones: "+JSON.stringify(projects));
  const removal = await evaluate(`(() => {const entry=window.__g1ctSmoke.entry,second=entry.competitors[1],button=document.querySelector('[data-g1ct-delete-v540="'+second.id+'"]');window.confirm=()=>false;button.click();const cancelled=entry.competitors.some(c=>c.id===second.id);window.confirm=()=>true;button.click();const archived=entry.archivedCompetitorsV540.find(c=>c.id===second.id);return {cancelled,visible:entry.competitors.some(c=>c.id===second.id),archivedId:archived?.id,archivedDomain:archived?.domain,firstId:entry.competitors[0]?.id};})()`);
  assert(removal.cancelled&&!removal.visible&&removal.archivedId===added.ids[1]&&removal.archivedDomain==='substitute.example'&&removal.firstId===initialized.beforeIds[0],"Delete confirmation/archive failed: "+JSON.stringify(removal));
  console.log(JSON.stringify({ok:true,initialized,first,added,populated,view:{columns:view.columns,phraseButtons:view.phraseButtons,grayCount:view.grayCount,allGray:view.allGray,aligned:view.aligned,stickyOwn:view.stickyOwn,stickyHeader:view.stickyHeader},selections,copied,live,oldCandidate,legacy,projects,removal,isolatedBrowserContext:true},null,2));
} finally {
  page?.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
