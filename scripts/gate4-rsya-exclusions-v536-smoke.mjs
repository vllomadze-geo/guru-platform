import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9358";
const exportData = JSON.parse(await readFile(process.env.GURU_GATE4_EXPORT || "/Users/vl/Downloads/gate-4.json", "utf8"));
const searchBaseline = JSON.parse(await readFile(process.env.GURU_SEARCH_BASELINE || "/tmp/guru-rsya-search-baseline.json", "utf8"));
const productId = "catalog-item-1786792591872-51f503";
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const artifacts = new URL("../artifacts/", import.meta.url);
await mkdir(artifacts, { recursive: true });

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.pending = new Map(); this.id = 0;
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data), pending = this.pending.get(message.id);
      if (!pending) return;
      clearTimeout(pending.timer); this.pending.delete(message.id);
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

const browserVersion = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new Cdp(browserVersion.webSocketDebuggerUrl);
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
  const screenshot = async (name, selector, height = 0) => {
    const clip = await evaluate(`(async()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n)throw Error('Screenshot target missing');n.scrollIntoView({block:'start',behavior:'instant'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const b=n.getBoundingClientRect();return {x:Math.max(0,b.left+scrollX-8),y:Math.max(0,b.top+scrollY-8),width:b.width+16,height:${height} ? Math.min(b.height+16,${height}) : b.height+16,scale:1}})()`);
    const capture = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip });
    await writeFile(new URL(name, artifacts), Buffer.from(capture.data, "base64"));
  };
  const screenshotRange = async (name, firstSelector, lastSelector) => {
    const clip = await evaluate(`(async()=>{const a=document.querySelector(${JSON.stringify(firstSelector)}),z=document.querySelector(${JSON.stringify(lastSelector)});if(!a||!z)throw Error('Screenshot range missing');a.scrollIntoView({block:'start',behavior:'instant'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const x=a.getBoundingClientRect(),y=z.getBoundingClientRect();return {x:Math.max(0,x.left+scrollX-8),y:Math.max(0,x.top+scrollY-8),width:x.width+16,height:y.bottom-x.top+16,scale:1}})()`);
    const capture = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip });
    await writeFile(new URL(name, artifacts), Buffer.from(capture.data, "base64"));
  };
  await page.call("Runtime.enable"); await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1050, deviceScaleFactor: 1, mobile: false });
  await browser.call("Browser.grantPermissions", { permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"], origin: new URL(appUrl).origin, browserContextId });
  await page.call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    const nativeFetch=window.fetch.bind(window);
    window.fetch=(input,init)=>String(input).includes('/api/') ? Promise.resolve(new Response(JSON.stringify({ok:true,isolatedSmoke:true}),{status:200,headers:{'Content-Type':'application/json'}})) : nativeFetch(input,init);
  }` });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof g4RsyaLaunchExclusionsHtmlV536 === "function"');
  const initial = await evaluate(`(() => {
    scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
    const imported=${JSON.stringify(exportData)};
    state=createFreshWorkspace({id:'rsya-exclusions-v536-smoke',name:'Проверка РСЯ · Козы'});
    for(const [key,value] of Object.entries(imported.content)) state[key]=structuredClone(value);
    if(imported.structure) state.gates[state.gates.findIndex(g=>g.id==='gate-4')]=structuredClone(imported.structure);
    state.project.id='rsya-exclusions-v536-smoke';activeProjectId=state.project.id;activeView='gate';activeGateId='gate-4';
    els.launcher.hidden=true;els.appShell.hidden=false;updateProjectChrome();guruV194Ensure(state);
    const pid=${JSON.stringify(productId)},product=guruV194Product(pid,state),ui=guruV194Ui(state);
    ui.selectedCategoryId=product.categoryId;ui.selectedProductId=pid;ensureGate4Production().launchProduct=pid;
    const channel=g4LaunchChannels().find(g4IsYandexRsyaChannel);
    const searchChannel=g4LaunchChannels().find(g4IsYandexSearchChannel);
    g4EnsureLaunchUiState().rows[g4CampaignStateKey(pid,channel.key)]=true;
    const d=ensureGate4RsyaV289(pid),campaign=g4RsyaCampaignV289(pid,channel.key);
    const search=ensureGate4SearchBuild(pid);search.searchStepOpen={...search.searchStepOpen,clusters:false,launch:true};
    const searchHtml=g4sbV406LaunchBodyHtml(pid,search,g4sbV407LaunchModel(pid,search),searchChannel,g4RsyaCampaignV289(pid,searchChannel.key));
    window.__exclusionsSmoke={pid,d,campaign,channel,searchChannel,product,before:structuredClone(d.campaign),searchBefore:JSON.stringify(state.gate4SearchBuild),groupsBefore:JSON.stringify(d.groups),render(kind='rsya'){
      els.contentArea.innerHTML=kind==='search' ? g4sbSearchChannelCardHtml(searchChannel,g4RsyaCampaignV289(pid,searchChannel.key),0,pid) : g4RsyaChannelCardV289(channel,campaign,0,pid);
      els.pageTitle.textContent='Яндекс Директ / '+(kind==='search'?'Поиск':'РСЯ')+' · '+product.name;
    }};
    guruPersistStateFast=()=>true;saveState=()=>true;flashSaving=()=>{};guruScheduleUiPreferenceSave=()=>{};renderGate=()=>window.__exclusionsSmoke.render();
    d.ui.workflowStepOpenV453={...d.ui.workflowStepOpenV453,groups:false,launch:true};
    window.__exclusionsSmoke.render();
    return {product:product.name,searchHtml,placements:structuredClone(d.campaign.excludedPlacements)};
  })()`);
  assert(initial.searchHtml === searchBaseline.bodyHtml, "Search launch HTML changed");
  const audit = await evaluate(`(() => {
    const s=window.__exclusionsSmoke,root=document.querySelector('.g4-rsya-exclusions-v536');
    const list=[...root.querySelectorAll('.g4-rsya-starter-list-v536 li code')].map(n=>n.textContent);
    const direct=g4RsyaDirectPanelModelV533(s.pid,s.d);
    const settings=document.querySelector('[data-g4rsya-campaign-settings]');
    return {count:list.length,unique:new Set(list).size,starterInProject:s.d.campaign.excludedPlacements.some(r=>list.includes(r.placement)),settingsHasEditor:!!settings.querySelector('.g4-rsya-placement-v363'),panelEditorCount:root.querySelectorAll('.g4-rsya-placement-v363').length,rows:root.querySelectorAll('.g4-rsya-exclusions-section-v536').length,threshold:root.textContent.match(/2 × [^=]+ = [^\.]+/u)?.[0],price:direct.price,searchUnchanged:s.searchBefore===JSON.stringify(state.gate4SearchBuild),groupsUnchanged:s.groupsBefore===JSON.stringify(s.d.groups),dataUnchanged:JSON.stringify(s.before.excludedPlacements)===JSON.stringify(s.d.campaign.excludedPlacements),otherItems:document.querySelectorAll('.g4-v406-launch-item').length};
  })()`);
  assert(audit.count===54&&audit.unique===54&&audit.rows===3&&audit.panelEditorCount===1&&!audit.settingsHasEditor&&!audit.starterInProject&&audit.price===1487.86&&audit.searchUnchanged&&audit.groupsUnchanged&&audit.dataUnchanged,"Initial audit failed: "+JSON.stringify(audit));
  assert(audit.threshold?.includes('2 975,72'),"Threshold does not match 2 × conversion price: "+audit.threshold);
  await screenshot('gate4-rsya-exclusions-v536.png','.g4-rsya-exclusions-v536');
  await screenshotRange('gate4-rsya-other-items-5-13-v536.png','.g4-rsya-launch-v528 .g4-v406-launch-items > .g4-v406-launch-item:nth-child(5)','.g4-rsya-launch-v528 .g4-v406-launch-items > .g4-v406-launch-item:nth-child(13)');
  const copied = await evaluate(`(async () => {
    const button=document.querySelector('.g4-rsya-exclusions-section-v536 > header [data-g4rsya-v289-copy]');
    button.click();await new Promise(r=>setTimeout(r,60));
    const pasted=document.createElement('textarea');pasted.id='exclusions-paste-test';document.body.appendChild(pasted);
    pasted.value=await navigator.clipboard.readText();
    return {text:pasted.value,count:pasted.value.split(',').length,lines:pasted.value.split(/\\n/).length};
  })()`, true);
  assert(copied.count===54&&copied.lines===1&&copied.text.split(',')[0]==='com.fugo.wowguru',"Starter copy/paste failed");
  const edited = await evaluate(`(() => {
    const s=window.__exclusionsSmoke;
    document.querySelector('[data-g4rsya-v289-add-placement]').click();
    const input=document.querySelector('.g4-rsya-placement-row-v363:last-of-type [data-g4rsya-v289-field="placement"]');
    input.value='checko.ru';input.dispatchEvent(new Event('input',{bubbles:true}));
    const duplicate=document.querySelector('.g4-rsya-placement-row-v363:last-of-type [data-g4rsya-placement-duplicate-v536]').textContent;
    input.value='example-project.ru';input.dispatchEvent(new Event('input',{bubbles:true}));
    const ownCopy=document.querySelector('[data-g4rsya-own-copy-v536]');
    const stored=s.d.campaign.excludedPlacements.at(-1);
    const snapshot=structuredClone(state);state=snapshot;s.d=ensureGate4RsyaV289(s.pid);s.render();
    return {duplicate,copy:ownCopy.dataset.g4rsyaV289Copy,stored,restored:s.d.campaign.excludedPlacements.at(-1),count:document.querySelector('[data-g4rsya-own-count-v536]').textContent};
  })()`);
  assert(edited.duplicate.includes('стартовом списке')&&edited.stored.placement==='example-project.ru'&&edited.restored?.placement==='example-project.ru'&&edited.count.includes('из 1000'),"Project editor failed: "+JSON.stringify(edited));
  const ownCopied = await evaluate(`(async()=>{document.querySelector('[data-g4rsya-own-copy-v536]').click();await new Promise(r=>setTimeout(r,60));const field=document.querySelector('#exclusions-paste-test');field.value=await navigator.clipboard.readText();return field.value})()`,true);
  assert(ownCopied.split(',').includes('example-project.ru'),"Own list copy/paste failed");
  await pause(1700);
  await screenshot('gate4-rsya-exclusions-project-v536.png','.g4-rsya-exclusions-v536');
  const deleted = await evaluate(`(() => {
    const s=window.__exclusionsSmoke;
    document.querySelector('[data-g4rsya-v289-remove-placement]').click();
    return {remaining:s.d.campaign.excludedPlacements.length,starterNotStored:s.d.campaign.excludedPlacements.every(r=>!RSYA_STARTER_EXCLUDED_PLACEMENTS_V1.includes(r.placement)),searchUnchanged:s.searchBefore===JSON.stringify(state.gate4SearchBuild),groupsUnchanged:s.groupsBefore===JSON.stringify(s.d.groups)};
  })()`);
  assert(deleted.remaining===initial.placements.length&&deleted.starterNotStored&&deleted.searchUnchanged&&deleted.groupsUnchanged,"Delete/preservation failed: "+JSON.stringify(deleted));
  await evaluate(`window.__exclusionsSmoke.render('search')`);
  await screenshot('gate4-search-unchanged-v536.png','.g1-card:has(> [data-g4sb-step="launch"])');
  console.log(JSON.stringify({ok:true,audit,starterCopy:{count:copied.count,lines:copied.lines,sha256:hash(copied.text)},edited,ownCopied,deleted,searchHtmlSha256:hash(initial.searchHtml)},null,2));
} finally {
  page?.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
