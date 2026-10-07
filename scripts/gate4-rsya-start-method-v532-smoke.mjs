import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// Disposable browser context only: imports are copies, API writes are blocked.
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9358";
const gate4Path = process.env.GURU_GATE4_EXPORT || "/Users/vl/Downloads/gate-4.json";
const projectsPath = process.env.GURU_FOUR_PROJECTS_SOURCE || "/tmp/guru-g4-four-projects-v523.json";
const baselinePath = process.env.GURU_SEARCH_BASELINE || "/tmp/guru-rsya-search-baseline.json";
const productId = "catalog-item-1786792591872-51f503";
const otherProductId = "catalog-item-1786792591872-c8b1e9";
const smokeId = "gate4-rsya-launch-v528-smoke";
const gate4Export = JSON.parse(await readFile(gate4Path, "utf8"));
const projectSources = JSON.parse(await readFile(projectsPath, "utf8"));
const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
const projectIds = ["project-1783243907480-ec7d8c", "project-1783068059197-798d26", "project-1782674551414-146f62", "project-default"];
const localProjectSources = projectSources.origins.find((row) => row.origin === "http://localhost:3000").entries;
const fixtures = projectIds.map((id) => {
  const workspace = structuredClone(localProjectSources[`guru-platform-workspace-v02-${id}`]);
  if (!workspace?.project) throw new Error(`Actual project fixture unavailable: ${id}`);
  return { id, name: workspace.project.name, workspace };
});
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const hash = (value) => createHash("sha256").update(value).digest("hex");
const outputDir = new URL("../artifacts/", import.meta.url);
await mkdir(outputDir, { recursive: true });

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.pending = new Map();
    this.nextId = 0;
    this.exceptions = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      if (message.method === "Runtime.exceptionThrown")
        this.exceptions.push(message.params.exceptionDetails);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP timed out: ${method}`));
      }, 240000);
      this.pending.set(id, { resolve, reject, timer });
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
  const evaluate = async (expression) => {
    const result = await page.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression) => {
    for (let i = 0; i < 200; i++) { if (await evaluate(`Boolean(${expression})`)) return; await pause(100); }
    throw new Error(`Timed out: ${expression}`);
  };
  const screenshot = async (name, selector, maxHeight = 0) => {
    if (process.env.GURU_SKIP_SCREENSHOTS === '1') return;
    const clip = await evaluate(`(async () => {
      const node=document.querySelector(${JSON.stringify(selector)});
      if(!node) throw new Error('Screenshot target missing');
      node.scrollIntoView({block:'start',behavior:'instant'});
      await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      const b=node.getBoundingClientRect();
      return {x:Math.max(0,b.left+scrollX-8),y:Math.max(0,b.top+scrollY-8),width:b.width+16,height:${maxHeight} ? Math.min(b.height+16,${maxHeight}) : b.height+16,scale:1};
    })()`);
    const capture = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip });
    await writeFile(new URL(name, outputDir), Buffer.from(capture.data,"base64"));
  };
  await page.call("Runtime.enable"); await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1050, deviceScaleFactor: 1, mobile: false });
  await page.call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    const nativeFetch=window.fetch.bind(window);
    window.fetch=(input,init)=>String(input).includes('/api/') ? Promise.resolve(new Response(JSON.stringify({ok:true,isolatedSmoke:true}),{status:200,headers:{'Content-Type':'application/json'}})) : nativeFetch(input,init);
  }`});
  await page.call("Page.navigate", {url:appUrl});
  await waitFor('document.readyState === "complete" && typeof g4RsyaLaunchModelV528 === "function"');
  console.error("Browser ready; loading isolated export");
  const initial = await evaluate(`(() => {
    scheduleCloudSync=()=>{}; scheduleProjectsCloudSync=()=>{};
    const imported=${JSON.stringify(gate4Export)};
    state=createFreshWorkspace({id:${JSON.stringify(smokeId)},name:'Проверка РСЯ · Козы'});
    for(const [key,value] of Object.entries(imported.content)) state[key]=structuredClone(value);
    if(imported.structure) state.gates[state.gates.findIndex(g=>g.id==='gate-4')]=structuredClone(imported.structure);
    state.project.id=${JSON.stringify(smokeId)};
    activeProjectId=state.project.id;activeView='gate';activeGateId='gate-4';
    els.launcher.hidden=true;els.appShell.hidden=false;updateProjectChrome();guruV194Ensure(state);
    const pid=${JSON.stringify(productId)};
    const product=guruV194Product(pid,state);const ui=guruV194Ui(state);
    ui.selectedCategoryId=product.categoryId;ui.selectedProductId=pid;
    ensureGate4Production().launchProduct=pid;
    const channel=g4LaunchChannels().find(g4IsYandexRsyaChannel);
    const searchChannel=g4LaunchChannels().find(g4IsYandexSearchChannel);
    g4EnsureLaunchUiState().rows[g4CampaignStateKey(pid,channel.key)]=true;
    g4EnsureLaunchUiState().rows[g4CampaignStateKey(pid,searchChannel.key)]=true;
    const d=ensureGate4RsyaV289(pid);
    const campaign=g4RsyaCampaignV289(pid,channel.key);
    window.__strategySmoke={pid,d,campaign,channel,searchChannel,product,
      before:structuredClone(d.campaign),commonBefore:structuredClone(campaign),
      groupsBefore:JSON.stringify(d.groups),searchBefore:JSON.stringify(state.gate4SearchBuild),
      render(kind='rsya'){
        const html=kind==='search'
          ? g4sbSearchChannelCardHtml(searchChannel,g4RsyaCampaignV289(pid,searchChannel.key),0,pid)
          : g4RsyaChannelCardV289(channel,campaign,0,pid);
        els.contentArea.innerHTML=html;
        els.pageTitle.textContent='Яндекс Директ / '+(kind==='search'?'Поиск':'РСЯ')+' · '+product.name;
      }
    };
    guruPersistStateFast=()=>true;saveState=()=>true;flashSaving=()=>{};
    guruScheduleUiPreferenceSave=()=>{};renderGate=()=>window.__strategySmoke.render();
    const sd=ensureGate4SearchBuild(pid);sd.searchStepOpen={...sd.searchStepOpen,clusters:false,launch:true};
    const model=g4sbV407LaunchModel(pid,sd);
    const searchHtml=g4sbV406LaunchBodyHtml(pid,sd,model,searchChannel,g4RsyaCampaignV289(pid,searchChannel.key));
    window.__strategySmoke.render('search');
    return {searchHtml,product:product.name,metrika:[d.campaign.metrikaCounter,d.campaign.metrikaGoal]};
  })()`);
  assert(initial.searchHtml===baseline.bodyHtml, 'Search Launch HTML changed');
  await screenshot('gate4-search-unchanged-v532.png','.g1-card:has(> [data-g4sb-step="launch"])');
  const initialState = await evaluate(`(() => {
    const s=window.__strategySmoke;
    s.d.ui.workflowStepOpenV453={...s.d.ui.workflowStepOpenV453,groups:false,launch:false};
    s.render();
    return {steps:[...document.querySelectorAll('[data-g4rsya-v453-step] .g1-card-title')].map(e=>e.textContent.trim()),
      preserved:Object.entries(s.before).every(([k,v])=>['strategy','paymentModel','budgetPeriod'].includes(k)||JSON.stringify(s.d.campaign[k])===JSON.stringify(v)),
      groups:s.groupsBefore===JSON.stringify(s.d.groups),search:s.searchBefore===JSON.stringify(state.gate4SearchBuild)};
  })()`);
  assert(initialState.steps.join('|')==='1JTBD и группы|2Запуск','RSYA steps changed');
  assert(initialState.preserved&&initialState.groups&&initialState.search,'Original data changed on render');
  await screenshot('gate4-rsya-goat-collapsed-v532.png','.g4-rsya-v289');
  const empty = await evaluate(`(() => {
    const s=window.__strategySmoke;
    s.d.ui.workflowStepOpenV453.launch=true;
    Object.assign(s.d.campaign.startMethodV532,{forecastCpcRub:'',siteConversionPercent:'',expectedCpaManualRub:'',directBudgetFloorRub:''});
    s.d.campaign.weeklyBudgetRubV531='';s.d.campaign.strategyTarget.targetCpaRub='';
    s.d.ui.targetCpaEditedV532=false;s.d.ui.autoTargetCpaRubV532='';
    s.render();
    const root=document.querySelector('[data-g4rsya-strategy-v531]');
    return {budget:root.querySelector('.g4-rsya-strategy-row-v531 .status-pill')?.textContent,
      expected:root.querySelector('[data-g4rsya-v289-field="expectedCpaManualRub"]')?.value,
      target:root.querySelector('[data-g4rsya-v289-field="targetCpaRub"]')?.value,
      checks:root.querySelectorAll('[data-g4rsya-prelaunch-v532]').length,
      count:document.querySelectorAll('[data-g4rsya-launch-check]').length,
      meta:document.querySelector('[data-g4rsya-v453-step-meta="launch"]').textContent,
      colors:[...root.querySelectorAll('.g1-input')].map(e=>getComputedStyle(e).backgroundColor)};
  })()`);
  assert(empty.budget==='Недостаточно данных'&&empty.expected===''&&empty.target==='','Empty state wrong: '+JSON.stringify(empty));
  assert(empty.checks===2&&empty.count===14&&empty.meta.includes('из 17'),'Launch checklist changed');
  for(const color of empty.colors){const rgb=color.match(/[\d.]+/g)?.slice(0,3).map(Number);assert(!rgb||Math.max(...rgb)-Math.min(...rgb)<12,`Colored input: ${color}`);}
  await screenshot('gate4-rsya-start-empty-v532.png','[data-g4rsya-strategy-v531]');
  await screenshot('gate4-rsya-pre-post-v532.png','.g4-rsya-prelaunch-v532');
  await screenshot('gate4-rsya-other-launch-items-v532.png','.g4-rsya-launch-v528 > .g4-v406-launch-level',4800);
  const cases = await evaluate(`(() => {
    const s=window.__strategySmoke, out={};
    s.renderStrategy=()=>{g4RsyaMigrateStartMethodV532(s.d);
      document.querySelector('[data-g4rsya-strategy-v531]').outerHTML=g4RsyaLaunchStrategyHtmlV528(s.pid,s.channel.key,s.campaign,s.d);};
    const show=()=>{s.renderStrategy();const root=document.querySelector('[data-g4rsya-strategy-v531]');
      const fixed=[...root.querySelectorAll('.g4-rsya-start-method-v532 .g4-rsya-strategy-fixed-v531')];
      return {expected:root.querySelector('[data-g4rsya-v289-field="expectedCpaManualRub"]')?.value||fixed.find(e=>e.textContent.includes('Ожидаемая'))?.querySelector('input')?.value,
        start:fixed.find(e=>e.textContent.includes('Стартовая цена'))?.querySelector('input')?.value,
        min:fixed.find(e=>e.textContent.includes('Минимальный недельный'))?.querySelector('input')?.value,
        target:root.querySelector('[data-g4rsya-v289-field="targetCpaRub"]')?.value,
        badge:root.querySelector('.g4-rsya-strategy-row-v531 .status-pill')?.textContent,
        budgetCopyDisabled:root.querySelector('[data-g4rsya-v289-field="weeklyBudgetRubV531"]').closest('label').querySelector('[data-g4rsya-v289-copy]').disabled};};
    s.d.campaign.startMethodV532.expectedCpaManualRub='150';s.d.campaign.weeklyBudgetRubV531='1200';out.manual150low=show();
    s.d.campaign.weeklyBudgetRubV531='3000';out.manual150ok=show();
    s.d.campaign.startMethodV532.expectedCpaManualRub='300';s.d.campaign.weeklyBudgetRubV531='1200';out.manual300low=show();
    s.d.campaign.startMethodV532.expectedCpaManualRub='';s.d.campaign.startMethodV532.forecastCpcRub='3';s.d.campaign.startMethodV532.siteConversionPercent='2';s.d.campaign.weeklyBudgetRubV531='3000';out.automatic150=show();
    s.d.campaign.startMethodV532.directBudgetFloorRub='3500';out.directFloor=show();
    s.d.campaign.startMethodV532.directBudgetFloorRub='';show();
    const target=document.querySelector('[data-g4rsya-v289-field="targetCpaRub"]');target.value='400';target.dispatchEvent(new Event('input',{bubbles:true}));
    s.d.campaign.startMethodV532.forecastCpcRub='4';out.manualOverride=show();
    s.campaign.launchDate='2026-10-06';s.renderStrategy();out.tuesday=document.querySelector('.g4-rsya-weekday-v532').textContent.trim();
    s.campaign.launchDate='2026-10-05';s.renderStrategy();out.monday=document.querySelector('.g4-rsya-weekday-v532').textContent.trim();
    const check=document.querySelector('[data-g4rsya-prelaunch-v532="goalGreen"]');check.checked=true;check.dispatchEvent(new Event('change',{bubbles:true}));s.renderStrategy();out.checkSaved=s.d.ui.prelaunchChecksV532.goalGreen===true&&document.querySelector('[data-g4rsya-prelaunch-v532="goalGreen"]').checked;
    return out;
  })()`);
  assert(cases.manual150low.expected==='150'&&cases.manual150low.start==='300'&&cases.manual150low.min==='3000'&&cases.manual150low.badge.includes('3000')&&cases.manual150low.budgetCopyDisabled,'150/1200 arithmetic failed: '+JSON.stringify(cases.manual150low));
  assert(cases.manual150ok.badge==='Бюджет проверен'&&!cases.manual150ok.budgetCopyDisabled,'150/3000 budget failed');
  assert(cases.manual300low.start==='600'&&cases.manual300low.min==='6000'&&cases.manual300low.badge.includes('6000'),'300/1200 arithmetic failed');
  assert(cases.automatic150.expected==='150'&&cases.automatic150.target==='300','Automatic CPA failed');
  assert(cases.directFloor.badge.includes('3500')&&cases.manualOverride.target==='400','Floor/override failed');
  assert(cases.tuesday.includes('вторник')&&cases.tuesday.includes('Лучше')&&cases.monday.includes('понедельник')&&!cases.monday.includes('Лучше')&&cases.checkSaved,'Prelaunch checks failed');
  await evaluate(`(() => {const s=window.__strategySmoke;s.d.campaign.startMethodV532.forecastCpcRub='';s.d.campaign.startMethodV532.siteConversionPercent='';s.d.campaign.startMethodV532.expectedCpaManualRub='150';s.d.campaign.weeklyBudgetRubV531='1200';s.d.campaign.strategyTarget.targetCpaRub='300';s.renderStrategy();})()`);
  await screenshot('gate4-rsya-start-150-budget-1200-v532.png','[data-g4rsya-strategy-v531]');
  await evaluate(`(() => {const s=window.__strategySmoke;s.d.campaign.weeklyBudgetRubV531='3000';s.renderStrategy();})()`);
  await screenshot('gate4-rsya-start-150-budget-3000-v532.png','[data-g4rsya-strategy-v531]');
  await screenshot('gate4-rsya-afterlaunch-v532.png','.g4-rsya-afterlaunch-v532');
  const projects = await evaluate(`(() => {
    const sources=${JSON.stringify(fixtures.map(f=>({id:f.id,name:f.name,workspace:f.workspace})))};
    return sources.map(source=>{state=structuredClone(source.workspace);activeProjectId=state.project.id;guruV194Ensure(state);
      const product=Object.keys(state.gate4Rsya||{})[0]||${JSON.stringify(productId)};
      const channel=g4LaunchChannels().find(g4IsYandexRsyaChannel);
      const d=ensureGate4RsyaV289(product),campaign=g4RsyaCampaignV289(product,channel.key);
      const before=structuredClone(d.campaign),groups=JSON.stringify(d.groups);
      g4RsyaMigrateStrategyV531(campaign,d);g4RsyaMigrateStartMethodV532(d);
      return {project:source.name,product,preserved:Object.entries(before).every(([k,v])=>['strategy','paymentModel','budgetPeriod'].includes(k)||JSON.stringify(d.campaign[k])===JSON.stringify(v)),groups:groups===JSON.stringify(d.groups),newFields:Object.keys(d.campaign.startMethodV532).length===4};
    });
  })()`);
  assert(projects.length===4&&projects.every(p=>p.preserved&&p.groups&&p.newFields),'Four project preservation failed: '+JSON.stringify(projects));
  console.log(JSON.stringify({ok:true,product:initial.product,metrika:initial.metrika,empty,cases,projects,searchHash:hash(initial.searchHtml)},null,2));
} finally {
  page?.close();
  await browser.call('Target.disposeBrowserContext',{browserContextId});
  browser.close();
}
