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
  await waitFor('document.readyState === "complete" && typeof g1CompetitorPhrasesV539 === "function"');
  const initialized = await evaluate(`(() => {
    scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
    state=createFreshWorkspace({id:'gate1-workflow-v539-smoke',name:'Изолированная проверка Козы'});
    const imported=${JSON.stringify(fixture)};
    for(const [key,value] of Object.entries(imported.content))state[key]=structuredClone(value);
    state.gates[state.gates.findIndex(g=>g.id==='gate-1')]=structuredClone(imported.structure);
    const relationStore=megaPlatformCategoryStore(state);
    for(const catalogItem of state.project.catalogItemsV189||[])
      if(catalogItem.categoryId)relationStore.categoryIdsByProduct[catalogItem.id]=[catalogItem.categoryId];
    state.project.id='gate1-workflow-v539-smoke';activeProjectId=state.project.id;activeView='gate';activeGateId='gate-1';
    const beforeEnsure=state.painV130?.productMaps?.map(m=>Object.keys(m.items||{}).length);
    els.launcher.hidden=true;els.appShell.hidden=false;updateProjectChrome();guruV194Ensure(state);
    const afterEnsure=state.painV130?.productMaps?.map(m=>Object.keys(m.items||{}).length);
    const pid=${JSON.stringify(productId)},product=guruV194Product(pid,state),ui=guruV194Ui(state);
    ui.selectedCategoryId=product.categoryId;ui.selectedProductId=pid;
    const entry=ensureProjectComparisonProduct(pid);entry.open=true;
    guruPersistStateFast=()=>true;saveState=()=>true;flashSaving=()=>{};guruScheduleUiPreferenceSave=()=>{};
    const priorState=state;renderGate();const sameState=state===priorState;
    const phrases=g1CompetitorPhrasesV539(product);
    window.__g1cmpSmoke={pid,product,entry,before:JSON.stringify(imported.content.projectComparison),source:imported.content.projectComparison};
    return {product:product.name,price:g1CompetitorContextV539(product).price.raw,geography:state.project.geography,confirmed:phrases.confirmed.length,ranked:phrases.ranked.map(p=>({phrase:p.value,frequency:p.frequency})),source:phrases.source,file:phrases.file,competitors:entry.competitors.length,domain:entry.competitors[0]?.siteDomainV538||'',painMaps:state.painV130?.productMaps?.length,beforeEnsure,afterEnsure,sameState,categoryIds:megaPlatformProductCategoryIds(product,state),painKeys:state.painV130?.productMaps?.map(m=>({name:m.product,keys:Object.keys(m.items||{}).slice(0,5),rows:m.items?.[pid]?.demandRows?.length,archive:Object.values(m.legacyPageItemsV237||{}).filter(a=>a.mapped_product_id===pid).map(a=>a.reason).slice(-3),itemsType:typeof m.items})),painSample:state.painV130?.productMaps?.flatMap(m=>m.items?.[pid]?.demandRows||[]).filter(r=>r.kw&&r.queryCount).slice(0,2).map(r=>({kw:r.kw,queryCount:r.queryCount})),errors:window.__workflowErrors};
  })()`);
  await waitFor('document.querySelector("[data-g1-competitor-workflow-v539]")');
  assert(initialized.price==='4 900'&&initialized.geography==='Россия'&&initialized.confirmed===59&&initialized.ranked.length===15&&initialized.source==='Прогноз Директа',"Source audit failed: "+JSON.stringify(initialized));
  assert(initialized.ranked.every((row,index,rows)=>index===0||rows[index-1].frequency>=row.frequency),"Phrases not sorted descending");
  const basic = await evaluate(`(() => ({steps:[...document.querySelectorAll('[data-g1-competitor-step-v539]')].map(n=>({key:n.dataset.g1CompetitorStepV539,open:n.open})),savedOpen:window.__g1cmpSmoke.entry.workflowUiV539.openSteps,copyButtons:document.querySelectorAll('[data-g1-competitor-step-v539="1"] [data-g1-competitor-copy-v539]').length,sourcePrice:document.querySelector('[data-g1-competitor-step-v539="0"]')?.textContent.includes('4 900'),summaryEditable:!!document.querySelector('.g1-competitor-summary-v539 input,.g1-competitor-summary-v539 textarea'),oldCells:JSON.stringify(window.__g1cmpSmoke.entry.criteria.map(c=>c.cells)),otherBlocks:[...document.querySelectorAll('.g1-section:not(.g1-competitor-workflow-v539)')].slice(0,5).map(n=>({tag:n.tagName,className:n.className,text:n.textContent.trim().slice(0,80)}))}))()`);
  assert(basic.copyButtons===initialized.ranked.length&&basic.sourcePrice&&!basic.summaryEditable,"Initial render failed: "+JSON.stringify(basic));
  await screenshot("gate1-goat-competitor-step1-v539.png",'[data-g1-competitor-step-v539="1"]');
  const setDomain = await evaluate(`(() => {const field=document.querySelector('[data-project-comparison-product-competitor-site-v538]');field.value='https://www.magicmag.net/catalog/goat';field.dispatchEvent(new Event('change',{bubbles:true}));return window.__g1cmpSmoke.entry.competitors[0]?.siteDomainV538;})()`);
  assert(setDomain==='magicmag.net',"Temporary domain normalization failed: "+setDomain);
  await evaluate(`(() => {const first=document.querySelector('[data-g1-competitor-class-field-v539="sameMarket"][value="yes"]');first.checked=true;first.dispatchEvent(new Event('change',{bubbles:true}));const second=document.querySelector('[data-g1-competitor-class-field-v539="sameBusiness"][value="yes"]');second.checked=true;second.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const classified = await evaluate(`(() => ({type:window.__g1cmpSmoke.entry.competitors[0]?.typeV539,answers:window.__g1cmpSmoke.entry.competitors[0]?.classificationV539,step3:document.querySelector('[data-g1-competitor-step-v539$=":3"]')?.textContent,step4:document.querySelector('[data-g1-competitor-step-v539$=":4"]')?.textContent,summaryRows:document.querySelectorAll('.g1-competitor-summary-v539 tbody tr').length}))()`);
  assert(classified.type==='direct'&&classified.answers.sameMarket==='yes'&&classified.answers.sameBusiness==='yes'&&classified.step3.includes('site:magicmag.net коза')&&classified.step4.includes('4 900 ₽')&&classified.summaryRows===5,"Classification or queries failed: "+JSON.stringify(classified));
  await screenshot("gate1-goat-competitor-step2-v539.png",'[data-g1-competitor-step-v539="2"]');
  await evaluate(`(() => {document.querySelector('[data-g1-competitor-step-v539$=":3"]').open=true;document.querySelector('[data-g1-competitor-step-v539$=":4"]').open=true;})()`);
  await screenshot("gate1-goat-competitor-step3-v539.png",'[data-g1-competitor-step-v539$=":3"]');
  await screenshot("gate1-goat-competitor-step4-v539.png",'[data-g1-competitor-step-v539$=":4"]');
  await screenshot("gate1-goat-competitor-summary-v539.png",'.g1-competitor-summary-v539');
  await screenshot("gate1-webmaster-unchanged-v539.png",'.g1-seo-embedded-source-v298',900);
  const copied = await evaluate(`(async()=>{const button=document.querySelector('[data-g1-competitor-step-v539="1"] [data-g1-competitor-copy-v539]');button.click();await new Promise(r=>setTimeout(r,100));const field=document.createElement('input');document.body.appendChild(field);field.value=await navigator.clipboard.readText();return field.value;})()`,true);
  assert(copied===initialized.ranked[0].phrase,"Phrase copy/paste failed: "+copied);
  const migration = await evaluate(`(() => {
    const entry=window.__g1cmpSmoke.entry,legacy={id:'legacy-test',name:'Сохранённый конкурент',siteDomainV538:'legacy.example'};
    entry.competitors.push(legacy);
    const values={jtbd:'Старая задача',product_characteristics:'Старые характеристики',price:'5100',presentation_sales:'Старая посадочная',strengths_weaknesses:'Сильные и слабые'};
    for(const criterion of entry.criteria)criterion.cells[legacy.id]={text:values[criterion.coreKey]||''};
    g1CompetitorMigrateV539(entry);const first=JSON.stringify(legacy.stepsV539);g1CompetitorMigrateV539(entry);
    const result={direct:legacy.typeV539==='direct',emptyClassification:!legacy.classificationV539.sameMarket&&!legacy.classificationV539.sameBusiness,idempotent:first===JSON.stringify(legacy.stepsV539),mapped:Object.fromEntries(Object.entries(G1_COMPETITOR_LEGACY_MAP_V539).map(([key,[step,field]])=>[key,legacy.stepsV539[step]?.[field]])),oldCells:Object.fromEntries(entry.criteria.map(c=>[c.coreKey,projectComparisonCell(c,legacy.id).text]))};
    entry.competitors=entry.competitors.filter(c=>c!==legacy);for(const criterion of entry.criteria)delete criterion.cells[legacy.id];return result;
  })()`);
  assert(migration.direct&&migration.emptyClassification&&migration.idempotent&&Object.entries(migration.mapped).every(([key,value])=>value===migration.oldCells[key]),"Lossy migration: "+JSON.stringify(migration));
  const workflowRules = await evaluate(`(() => {
    const entry=window.__g1cmpSmoke.entry,product=window.__g1cmpSmoke.product,ctx=g1CompetitorContextV539(product);
    const blank={id:'temporary',siteDomainV538:'',classificationV539:{sameMarket:'',sameBusiness:''}};
    const missingDomain=g1CompetitorQueriesV539(3,blank,ctx).missingDomain;
    const types=[['yes','yes','direct'],['yes','no','substitute'],['no','yes','potential'],['no','no','unrelated']].map(([sameMarket,sameBusiness,expected])=>{blank.classificationV539={sameMarket,sameBusiness};return {expected,actual:g1CompetitorTypeV539(blank)}});
    const competitor=entry.competitors[0];competitor.stepsV539[3]={analogName:'Тестовый аналог',analogUrl:'https://magicmag.net/example',characteristics:'Тестовое свойство'};
    const status=g1CompetitorStepStatusV539(G1_COMPETITOR_STEPS_V539[0].fields.map(([key])=>competitor.stepsV539[3][key]));
    const summary=g1CompetitorSummaryV539(entry,ctx).includes('Тестовое свойство');
    delete competitor.stepsV539[3];
    return {missingDomain,types,status:status.status,summary};
  })()`);
  assert(workflowRules.missingDomain&&workflowRules.types.every(row=>row.expected===row.actual)&&workflowRules.status==='ready'&&workflowRules.summary,"Workflow rules failed: "+JSON.stringify(workflowRules));
  const projectIsolation = await evaluate(`(() => {const original=state,output=[];for(const id of ['korichnoe-yabloko','icleaning','sivrce','guru-2']){state=structuredClone(original);state.project.id=id;activeProjectId=id;const pid=${JSON.stringify(productId)},p=guruV194Product(pid,state);const html=projectComparisonProductHtml(p);output.push({id,ready:html.includes('data-g1-competitor-workflow-v539'),productId:state.projectComparison.productsById[pid].product_id,domain:state.projectComparison.productsById[pid].competitors[0]?.siteDomainV538});}state=original;activeProjectId=original.project.id;return output;})()`);
  assert(projectIsolation.length===4&&projectIsolation.every(row=>row.ready&&row.productId===productId&&row.domain==='magicmag.net'),"Shared code failed in four isolated project clones: "+JSON.stringify(projectIsolation));
  console.log(JSON.stringify({ok:true,initialized:{product:initialized.product,price:initialized.price,geography:initialized.geography,confirmed:initialized.confirmed,ranked:initialized.ranked,source:initialized.source,file:initialized.file},basic,classified,copied,migration,workflowRules,projectIsolation,errors:initialized.errors,isolatedBrowserContext:true},null,2));
} finally {
  page?.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
