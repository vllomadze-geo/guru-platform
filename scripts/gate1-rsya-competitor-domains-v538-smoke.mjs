import { readFile, mkdir, writeFile } from "node:fs/promises";

const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9358";
const exportData = JSON.parse(await readFile(process.env.GURU_GATE4_EXPORT || "/Users/vl/Downloads/gate-4.json", "utf8"));
const searchBaseline = JSON.parse(await readFile(process.env.GURU_SEARCH_BASELINE || "/tmp/guru-rsya-search-baseline.json", "utf8"));
const productId = "catalog-item-1786792591872-51f503";
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
      this.pending.delete(message.id);
      message.error ? pending.reject(Error(message.error.message)) : pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id, timer = setTimeout(() => reject(Error(`CDP timeout: ${method}`)), 120000);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (error) => { clearTimeout(timer); reject(error); },
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call("Target.createBrowserContext");
let page;
try {
  const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
  const target = (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()).find((row) => row.id === targetId);
  page = new Cdp(target.webSocketDebuggerUrl);
  const evaluate = async (expression, userGesture = false) => {
    const result = await page.call("Runtime.evaluate", { expression, userGesture, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression) => {
    for (let i = 0; i < 200; i++) { if (await evaluate(`Boolean(${expression})`)) return; await pause(100); }
    throw Error(`Timed out: ${expression}`);
  };
  const screenshot = async (name, selector, maxHeight = 0) => {
    const clip = await evaluate(`(async()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n)throw Error('Screenshot target missing: '+${JSON.stringify(selector)});n.scrollIntoView({block:'start',behavior:'instant'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const b=n.getBoundingClientRect();return {x:Math.max(0,b.left+scrollX-8),y:Math.max(0,b.top+scrollY-8),width:b.width+16,height:${maxHeight} ? Math.min(b.height+16,${maxHeight}) : b.height+16,scale:1}})()`);
    const result = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip });
    await writeFile(new URL(name, artifacts), Buffer.from(result.data, "base64"));
  };
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1050, deviceScaleFactor: 1, mobile: false });
  await browser.call("Browser.grantPermissions", { permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"], origin: new URL(appUrl).origin, browserContextId });
  await page.call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    const nativeFetch=window.fetch.bind(window);
    window.fetch=(input,init)=>String(input).includes('/api/') ? Promise.resolve(new Response(JSON.stringify({ok:true,isolatedSmoke:true}),{status:200,headers:{'Content-Type':'application/json'}})) : nativeFetch(input,init);
  }` });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof g4RsyaLaunchCompetitorInterestsV538 === "function"');
  const initial = await evaluate(`(() => {
    scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
    const imported=${JSON.stringify(exportData)};
    state=createFreshWorkspace({id:'competitor-domains-v538-smoke',name:'Одноразовая проверка конкурентов'});
    for(const [key,value] of Object.entries(imported.content)) state[key]=structuredClone(value);
    if(imported.structure) state.gates[state.gates.findIndex(g=>g.id==='gate-4')]=structuredClone(imported.structure);
    state.project.id='competitor-domains-v538-smoke';activeProjectId=state.project.id;activeView='gate';activeGateId='gate-4';
    els.launcher.hidden=true;els.appShell.hidden=false;updateProjectChrome();guruV194Ensure(state);
    const pid=${JSON.stringify(productId)},product=guruV194Product(pid,state),ui=guruV194Ui(state);
    ui.selectedCategoryId=product.categoryId;ui.selectedProductId=pid;ensureGate4Production().launchProduct=pid;
    const channel=g4LaunchChannels().find(g4IsYandexRsyaChannel);
    const searchChannel=g4LaunchChannels().find(g4IsYandexSearchChannel);
    g4EnsureLaunchUiState().rows[g4CampaignStateKey(pid,channel.key)]=true;
    const d=ensureGate4RsyaV289(pid),campaign=g4RsyaCampaignV289(pid,channel.key);
    d.ui.workflowStepOpenV453={...d.ui.workflowStepOpenV453,groups:false,launch:true};
    d.ui.launchGroupOpenV528={...d.ui.launchGroupOpenV528};
    for(const group of d.groups) d.ui.launchGroupOpenV528[g4RsyaLaunchGroupKeyV528(group)]=true;
    const search=ensureGate4SearchBuild(pid);search.searchStepOpen={...search.searchStepOpen,clusters:false,launch:true};
    const searchHtml=g4sbV406LaunchBodyHtml(pid,search,g4sbV407LaunchModel(pid,search),searchChannel,g4RsyaCampaignV289(pid,searchChannel.key));
    const originalRender=renderGate;
    window.__competitorSmoke={pid,product,d,campaign,channel,searchChannel,searchHtml,
      beforeGroups:JSON.stringify(d.groups),beforeCampaign:JSON.stringify(d.campaign),beforeSearch:JSON.stringify(state.gate4SearchBuild),
      render(kind='rsya'){
        activeGateId='gate-4';
        els.contentArea.innerHTML=kind==='search' ? g4sbSearchChannelCardHtml(searchChannel,g4RsyaCampaignV289(pid,searchChannel.key),0,pid) : g4RsyaChannelCardV289(channel,campaign,0,pid);
      }};
    guruPersistStateFast=()=>true;saveState=()=>true;flashSaving=()=>{};guruScheduleUiPreferenceSave=()=>{};
    renderGate=()=>activeGateId==='gate-1' ? originalRender() : window.__competitorSmoke.render();
    window.__competitorSmoke.render();
    window.__competitorSmoke.beforeGroups=JSON.stringify(d.groups);
    window.__competitorSmoke.beforeCampaign=JSON.stringify(d.campaign);
    window.__competitorSmoke.beforeSearch=JSON.stringify(state.gate4SearchBuild);
    return {product:product.name,groupCount:d.groups.length,oldInterests:d.groups.map(g=>g.interests),searchHtml};
  })()`);
  assert(initial.searchHtml === searchBaseline.bodyHtml, "Search launch HTML changed");
  assert(initial.groupCount > 1, "Expected multiple RSYA groups");
  const empty = await evaluate(`(() => {const rows=[...document.querySelectorAll('[data-g4rsya-launch-group-row="5"]')];return {count:rows.length,text:rows[0]?.textContent,links:rows.map(r=>Boolean(r.querySelector('[data-g4-jump-target]'))),copies:rows.map(r=>r.querySelectorAll('[data-g4rsya-v289-copy]').length)};})()`);
  assert(empty.count===initial.groupCount&&empty.links.every(Boolean)&&empty.copies.every(n=>n===0)&&empty.text.includes('0 из 30')&&empty.text.includes('Добавьте ключевых конкурентов'),"Empty state failed: "+JSON.stringify(empty));
  await screenshot("gate4-rsya-competitor-domains-empty-v538.png",'[data-g4rsya-launch-group-row="5"]');
  await evaluate(`document.querySelector('[data-g4rsya-launch-group-row="5"] [data-g4-jump-target]').click()`);
  await waitFor(`activeGateId === 'gate-1' && Boolean(document.querySelector('[data-project-comparison-product="${productId}"]'))`);
  const jumped = await evaluate(`(() => ({gate:activeGateId,entryOpen:state.projectComparison?.productsById?.[${JSON.stringify(productId)}]?.open,card:!!document.querySelector('[data-project-comparison-product="${productId}"]')}))()`);
  assert(jumped.gate==='gate-1'&&jumped.entryOpen&&jumped.card,"Gate 1 jump failed: "+JSON.stringify(jumped));
  await screenshot("gate1-competitor-domains-other-blocks-v538.png",'[data-guru-product-context="gate1-product-pages"]',900);
  const edited = await evaluate(`(() => {
    const pid=${JSON.stringify(productId)},card=document.querySelector('[data-project-comparison-product="${productId}"]');
    card.querySelector('[data-project-comparison-product-add-competitor]').click();
    const field=document.querySelector('[data-project-comparison-product-competitor-site-v538]');
    field.value='https://www.MagicMag.net/catalog/goats?utm=demo';field.dispatchEvent(new Event('input',{bubbles:true}));field.dispatchEvent(new Event('change',{bubbles:true}));
    const entry=state.projectComparison.productsById[pid];
    const normalized=entry.competitors[0].siteDomainV538;
    field.value='not-a-domain';field.dispatchEvent(new Event('change',{bubbles:true}));
    const rejected=entry.competitors[0].siteDomainV538===normalized && Boolean(field.closest('label').querySelector('small').textContent);
    field.value=normalized;field.dispatchEvent(new Event('change',{bubbles:true}));
    return {domain:entry.competitors[0].siteDomainV538,input:field.value,key:entry.product_id,rejected,companyHasSite:state.projectComparison.competitors?.some(c=>c.siteDomainV538) || false};
  })()`);
  assert(edited.domain==='magicmag.net'&&edited.input==='magicmag.net'&&edited.key===productId&&edited.rejected&&!edited.companyHasSite,"Domain normalization or storage failed: "+JSON.stringify(edited));
  await screenshot("gate1-competitor-site-field-v538.png",'.project-comparison-product-v309');
  const otherProduct = await evaluate(`(() => {const entries=state.projectComparison.productsById;entries['smoke-other-product']={product_id:'smoke-other-product',competitors:[{id:'smoke-other-competitor',siteDomainV538:'other.example'}]};const isolated=g4RsyaCompetitorDomainsV538(${JSON.stringify(productId)}).join(',')==='magicmag.net';delete entries['smoke-other-product'];return isolated;})()`);
  assert(otherProduct,"Domain leaked to another product");
  await evaluate(`window.__competitorSmoke.render()`);
  const populated = await evaluate(`(() => {
    const s=window.__competitorSmoke,rows=[...document.querySelectorAll('[data-g4rsya-launch-group-row="5"]')];
    return {counts:rows.map(r=>r.querySelector('.g4-rsya-competitor-count-v538 strong')?.textContent),domains:rows.map(r=>[...r.querySelectorAll('[data-g4rsya-v289-copy]')].map(b=>b.dataset.g4rsyaV289Copy)),oldInterestsStillStored:s.beforeGroups===JSON.stringify(s.d.groups),campaignPreserved:s.beforeCampaign===JSON.stringify(s.d.campaign),searchPreserved:s.beforeSearch===JSON.stringify(state.gate4SearchBuild),oldPhraseVisible:rows.some(r=>s.d.groups.some(g=>g.interests&&r.textContent.includes(g.interests)))};
  })()`);
  assert(populated.counts.every(v=>v==='1 из 30')&&populated.domains.every(v=>v.join(',')==='magicmag.net')&&populated.oldInterestsStillStored&&populated.campaignPreserved&&populated.searchPreserved&&!populated.oldPhraseVisible,"RSYA data or scope failed: "+JSON.stringify(populated));
  await screenshot("gate4-rsya-competitor-domains-populated-v538.png",'.g4-rsya-launch-group-v537');
  const copied = await evaluate(`(async () => {
    const button=document.querySelector('[data-g4rsya-launch-group-row="5"] [data-g4rsya-v289-copy]');button.click();await new Promise(r=>setTimeout(r,100));
    const test=document.createElement('input');test.setAttribute('aria-label','Проверка вставки домена');document.body.appendChild(test);test.value=await navigator.clipboard.readText();return test.value;
  })()`,true);
  assert(copied==='magicmag.net',"Clipboard paste failed: "+copied);
  await screenshot("gate4-rsya-competitor-domains-other-rows-v538.png",'.g4-rsya-launch-ad-v537');
  await evaluate(`window.__competitorSmoke.render('search')`);
  await screenshot("gate4-search-competitor-domains-unchanged-v538.png",'.g1-card:has(> [data-g4sb-step="launch"])');
  const removed = await evaluate(`(() => {activeGateId='gate-1';renderGate();document.querySelector('[data-project-comparison-product-remove-competitor]').click();const entry=state.projectComparison.productsById[${JSON.stringify(productId)}];window.__competitorSmoke.render();return {active:entry.competitors.length,archived:entry.archivedCompetitors?.some(c=>c.siteDomainV538==='magicmag.net'),empty:document.querySelector('[data-g4rsya-launch-group-row="5"]')?.textContent.includes('0 из 30')};})()`);
  assert(removed.active===0&&removed.archived&&removed.empty,"Temporary competitor cleanup failed: "+JSON.stringify(removed));
  console.log(JSON.stringify({ok:true,product:initial.product,groupCount:initial.groupCount,edited,populated,copied,removed,searchUnchanged:true,isolatedContext:true},null,2));
} finally {
  page?.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
