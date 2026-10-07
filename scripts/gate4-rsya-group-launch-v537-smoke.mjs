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
    state=createFreshWorkspace({id:'rsya-group-v537-smoke',name:'Проверка группы РСЯ · Козы'});
    for(const [key,value] of Object.entries(imported.content)) state[key]=structuredClone(value);
    if(imported.structure) state.gates[state.gates.findIndex(g=>g.id==='gate-4')]=structuredClone(imported.structure);
    state.project.id='rsya-group-v537-smoke';activeProjectId=state.project.id;activeView='gate';activeGateId='gate-4';
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
  const baseline = await evaluate(`(() => {
    const s=window.__exclusionsSmoke;
    s.d.ui.launchGroupOpenV528={...s.d.ui.launchGroupOpenV528};
    for(const group of s.d.groups) s.d.ui.launchGroupOpenV528[g4RsyaLaunchGroupKeyV528(group)]=true;
    s.render();
    const group=document.querySelector('.g4-rsya-launch-group-v537');
    const rows=[...group.querySelectorAll('[data-g4rsya-launch-group-row]')];
    const ad=group.querySelector('[data-g4rsya-launch-ad]');
    const first=s.d.groups[0],defaults=g4RsyaGroupGate1DefaultsV456(s.pid,first);
    return {groupCount:document.querySelectorAll('.g4-rsya-launch-group-v537').length,
      rowNumbers:rows.map(r=>r.dataset.g4rsyaLaunchGroupRow),
      rowTitles:rows.map(r=>r.querySelector('.g4-rsya-launch-group-row-title-v537 strong').textContent),
      firstJtbd:group.querySelector('.g4-rsya-launch-group-jtbd-v537').textContent,
      keywords:rows[3].querySelector('[data-g4rsya-v289-copy]')?.dataset.g4rsyaV289Copy,
      interests:rows[4].querySelector('[data-g4rsya-v289-copy]')?.dataset.g4rsyaV289Copy,
      extraLabels:[...rows[6].querySelectorAll('.g4-rsya-launch-subrow-v537 > b')].map(n=>n.textContent),
      emptyPromotion:rows[6].querySelector('.g4-rsya-launch-subrow-v537:last-child .g4-rsya-launch-value-v537 span').textContent,
      emptyPromotionCopy:!!rows[6].querySelector('.g4-rsya-launch-subrow-v537:last-child [data-g4rsya-v289-copy]'),
      adLabels:[...ad.querySelectorAll('.g4-rsya-launch-subrow-v537 > b')].map(n=>n.textContent),
      geography:rows[0].querySelector('.g4-rsya-launch-value-v537 span').textContent,
      utm:rows[7].querySelector('[data-g4rsya-v289-copy]')?.dataset.g4rsyaV289Copy,
      sourceKeywords:defaults.keywords,sourceInterests:first.interests,
      campaignJson:JSON.stringify(s.d.campaign),groupsJson:JSON.stringify(s.d.groups),searchJson:JSON.stringify(state.gate4SearchBuild),
      noExtraInAd:!ad.textContent.includes('Быстрые ссылки')&&!ad.textContent.includes('Уточнения')};
  })()`);
  assert(baseline.groupCount===3&&baseline.rowNumbers.join(',')==='1,2,3,4,5,6,7,8,9,10',
    'Group layout failed: '+JSON.stringify(baseline));
  assert(baseline.rowTitles.join('|')==='География показов|Сценарий группы|Автотаргетинг|Тематические слова|Интересы и привычки|Сегменты аудитории|Дополнительные элементы объявлений|Параметры URL|Корректировки|Дополнительные настройки',
    'Group order changed: '+baseline.rowTitles.join('|'));
  assert(baseline.keywords===baseline.sourceKeywords&&baseline.interests===baseline.sourceInterests&&baseline.extraLabels.join('|')==='Быстрые ссылки|Уточнения|Промоакция'&&baseline.emptyPromotion==='не задано'&&!baseline.emptyPromotionCopy&&baseline.adLabels.length===4&&baseline.noExtraInAd,
    'Group/ad data lost or duplicated: '+JSON.stringify(baseline));
  await screenshot('gate4-rsya-goat-group-launch-v537.png','.g4-v444-launch-group-level:has(.g4-rsya-launch-group-v537)');
  const multiAd = await evaluate(`(() => {
    const s=window.__exclusionsSmoke,first=s.d.groups[0],ad=first.ads[0];
    const second={...ad,id:'test-second-ad',callouts:[{value:'Второе объявление'}],sitelinks:[{title:'Другая ссылка',description:'Для второго объявления'}]};
    const html=g4RsyaLaunchGroupExtrasV537({...first,ads:[ad,second]},s.d);
    return {first:html.includes('Быстрые ссылки · объявление 1'),second:html.includes('Быстрые ссылки · объявление 2'),secondCallout:html.includes('Второе объявление'),secondLink:html.includes('Другая ссылка')};
  })()`);
  assert(Object.values(multiAd).every(Boolean),'Multiple ads are mixed or lost: '+JSON.stringify(multiAd));
  const copied = await evaluate(`(async () => {
    const group=document.querySelector('.g4-rsya-launch-group-v537');
    const copy=group.querySelector('[data-g4rsya-launch-group-row="4"] [data-g4rsya-v289-copy]');
    copy.click();await new Promise(r=>setTimeout(r,60));
    const test=document.createElement('textarea');document.body.appendChild(test);test.value=await navigator.clipboard.readText();
    const phrases=test.value;
    const heading=group.querySelector('[data-g4rsya-launch-ad] .g4-rsya-launch-subrow-v537:nth-child(2) [data-g4rsya-v289-copy]');
    heading.click();await new Promise(r=>setTimeout(r,60));test.value=await navigator.clipboard.readText();
    return {phrases,headings:test.value};
  })()`,true);
  assert(copied.phrases===baseline.keywords&&copied.headings.split('\n').length===7,'Clipboard copy/paste failed');
  const derived = await evaluate(`(() => {
    const s=window.__exclusionsSmoke,before=s.d.campaign.geography;
    s.d.campaign.geography='Москва и область';s.render();
    const row=document.querySelector('[data-g4rsya-launch-group-row="1"]');
    const value=row.querySelector('[data-g4rsya-v289-copy]')?.dataset.g4rsyaV289Copy;
    s.d.campaign.geography=before;s.render();
    const preserved=baseline=>baseline.campaignJson===JSON.stringify(s.d.campaign)&&baseline.groupsJson===JSON.stringify(s.d.groups)&&baseline.searchJson===JSON.stringify(state.gate4SearchBuild);
    return {value,campaignPreserved:preserved(${JSON.stringify({campaignJson:baseline.campaignJson,groupsJson:baseline.groupsJson,searchJson:baseline.searchJson})})};
  })()`);
  assert(derived.value==='Москва и область'&&derived.campaignPreserved,'Campaign geography derivation or state preservation failed');
  await evaluate(`window.__exclusionsSmoke.render('search')`);
  await screenshot('gate4-search-unchanged-v537.png','.g1-card:has(> [data-g4sb-step="launch"])');
  console.log(JSON.stringify({ok:true,groupCount:baseline.groupCount,rowTitles:baseline.rowTitles,extraLabels:baseline.extraLabels,adLabels:baseline.adLabels,goatGeography:baseline.geography,derived,keywordsCount:baseline.keywords.split('\n').length,headingsCount:copied.headings.split('\n').length,searchHtmlSha256:hash(initial.searchHtml)},null,2));
} finally {
  page?.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
