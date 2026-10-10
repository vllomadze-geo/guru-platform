import { readFile } from "node:fs/promises";

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
    els.launcher.hidden=true;els.appShell.hidden=false;updateProjectChrome();guruV194Ensure(state);
    const product=guruV194Product(${JSON.stringify(productId)},state),ui=guruV194Ui(state);
    ui.selectedCategoryId=product.categoryId;ui.selectedProductId=product.id;
    const entry=ensureProjectComparisonProduct(product.id);entry.open=true;
    // Keep browser test data isolated and measure UI work without a localStorage quota dependency.
    window.__perfOriginalFlashSaving=flashSaving;
    flashSaving=()=>{};guruScheduleUiPreferenceSave=()=>{};
    renderGate();
    return {competitorIds:entry.competitors.map(c=>c.id),phraseCounts:g1BergenJtbdsV543(product).map(j=>j.phrases.length)};
  })()`);
  const metrics = await evaluate(`(() => {
    const section=document.querySelector('[data-g1bp-product-v543]');
    const sample=(callback,iterations=6)=>{const times=[];for(let i=0;i<iterations;i++){const t=performance.now();callback();times.push(performance.now()-t);}return{medianMs:times.sort((a,b)=>a-b)[Math.floor(times.length/2)],maxMs:Math.max(...times)}};
    const target=section.querySelector('[data-g1bp-domain-v543]');
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
  const persistence = await evaluate(`(async()=>{
    const writes=[];
    safeStorageSet=(key,value)=>{writes.push({key,value});return true};
    flashSaving=window.__perfOriginalFlashSaving;
    flashSaving();
    await new Promise(resolve=>setTimeout(resolve,850));
    const saved=JSON.parse(writes.at(-1)?.value||'null');
    const entry=saved?.projectComparison?.productsById?.[${JSON.stringify(productId)}];
    return {writes:writes.length,bytes:writes.at(-1)?.value?.length||0,
      competitorIds:entry?.competitors?.map(row=>row.id)||[],
      domain:entry?.competitors?.[0]?.domain||'',
      relevanceCount:Object.values(entry?.keywordRelevanceByPhraseV549||{}).filter(Boolean).length,
      selectedCount:Object.values(entry?.selectedKeywordKeysByJtbdV550||{}).flat().length};
  })()`);
  if (!metrics.stableAfterUrlChange || persistence.writes<1 ||
      JSON.stringify(persistence.competitorIds)!==JSON.stringify(setup.competitorIds) ||
      persistence.domain!=="https://example.test/product?ref=123" ||
      persistence.relevanceCount<1 || persistence.selectedCount<1)
    throw Error("Comparison edit or autosave regression: "+JSON.stringify({metrics,persistence}));
  console.log(JSON.stringify({setup,metrics,persistence},null,2));
} finally {
  page?.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
