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
  assert(initial.searchHtml===baseline.bodyHtml,'Search Launch HTML changed');
  await screenshot('gate4-search-unchanged-v533.png','.g1-card:has(> [data-g4sb-step="launch"])');
  const source = await evaluate(`(() => {
    const s=window.__strategySmoke;
    const original=JSON.stringify(state.gate4SearchBuild);
    const p=g4RsyaDirectPanelModelV533(s.pid,s.d);
    const search=state.gate4SearchBuild[normalizeAspectKey(s.pid)];
    const groups=search.groupRows.map(g=>({jtbdId:g.jtbdId,forecast:g4sbV128Forecast(g.demandRows||[])}));
    return {model:{hasSearch:p.hasSearch,missing:p.missing,groupCount:p.groupCount,jtbdIds:p.jtbdIds,expected:p.expected,price:p.price,budget:p.budget,expectedTen:p.expectedTen,monthlyBaseLeads:p.monthlyBaseLeads,summaryBudget:p.summary?.budget,weeklyBase:p.summary?.weekly?.base},groups,searchUnchanged:original===JSON.stringify(state.gate4SearchBuild)};
  })()`);
  assert(source.model.hasSearch&&source.model.groupCount===3&&source.model.jtbdIds.length===3&&source.searchUnchanged,'Search source audit failed');
  assert(source.model.summaryBudget===20048.8&&Math.abs(source.model.monthlyBaseLeads-26.95)<1e-8,'Search sums changed: '+JSON.stringify(source));
  assert(source.model.expected===743.93&&source.model.price===1487.86&&source.model.budget===14878.6&&source.model.expectedTen===7439.3,'Calculation failed: '+JSON.stringify(source.model));
  const edgeCases = await evaluate(`(() => {
    const s=window.__strategySmoke,key=normalizeAspectKey(s.pid),saved=state.gate4SearchBuild[key];
    const incomplete=structuredClone(saved);incomplete.groupRows[0].demandRows[0].forecastBudget='';
    state.gate4SearchBuild[key]=incomplete;
    const missing=g4RsyaDirectPanelModelV533(s.pid,s.d).missing;
    state.gate4SearchBuild[key]=saved;
    const before=structuredClone(s.d.campaign.conversionVolumeCheck);
    const now=new Date(),yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1),from=new Date(yesterday.getFullYear(),yesterday.getMonth(),yesterday.getDate()-6);
    const day=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    Object.assign(s.d.campaign.conversionVolumeCheck,{from:day(from),to:day(yesterday),count:'9',evidenceUrl:'https://metrika.yandex.ru/stat/',checkedAt:now.toISOString(),goalId:s.d.campaign.metrikaGoal,counterId:s.d.campaign.metrikaCounter});
    const low=g4RsyaDirectPanelModelV533(s.pid,s.d).strategy;
    s.d.campaign.conversionVolumeCheck.count='10';
    const high=g4RsyaDirectPanelModelV533(s.pid,s.d).strategy;
    s.d.campaign.conversionVolumeCheck=before;
    return {missing,low,high};
  })()`);
  assert(edgeCases.missing.some(x=>x.includes('группа 1: прогноз бюджета у 25 из 26 фраз'))&&edgeCases.low==='Оптимизация кликов'&&edgeCases.high==='Максимум конверсий','Partial forecast/volume strategy failed: '+JSON.stringify(edgeCases));
  await evaluate(`(() => {const s=window.__strategySmoke;s.d.ui.workflowStepOpenV453={...s.d.ui.workflowStepOpenV453,groups:false,launch:false};s.render();})()`);
  await screenshot('gate4-rsya-goat-collapsed-v533.png','.g4-rsya-v289',1200);
  const visible = await evaluate(`(() => {
    const s=window.__strategySmoke;
    s.d.ui.workflowStepOpenV453={...s.d.ui.workflowStepOpenV453,groups:false,launch:false};s.render();
    const steps=[...document.querySelectorAll('[data-g4rsya-v453-step] .g1-card-title')].map(e=>e.textContent.trim());
    s.d.ui.workflowStepOpenV453.launch=true;s.render();
    const root=document.querySelector('[data-g4rsya-direct-v533]');
    const rows=[...root.querySelectorAll('.g4-rsya-direct-panel-v533 .g4-rsya-direct-row-v533')].map(e=>({label:e.querySelector('.g4-rsya-direct-label-v533').textContent,value:e.querySelector('.g4-rsya-direct-value-v533').textContent,copy:e.querySelector('button')?.dataset.g4rsyaV289Copy}));
    const oldFields=['forecastCpcRub','siteConversionPercent','directBudgetFloorRub','targetDrrPercent','weeklyBudgetRubV531','targetCpaRub'];
    return {steps,rows,hiddenOld:oldFields.every(k=>!root.querySelector('[data-g4rsya-v289-field="'+k+'"]')),
      oldData:Object.entries(s.before).every(([k,v])=>['strategy','paymentModel','budgetPeriod'].includes(k)||JSON.stringify(s.d.campaign[k])===JSON.stringify(v)),
      metrika:[...root.querySelectorAll('.g4-rsya-direct-detail-v533[aria-label="Метрика"] .g4-rsya-direct-value-v533')].map(e=>e.textContent),
      volume:Boolean(root.querySelector('.g4-rsya-volume-v363')),preChecks:root.querySelectorAll('[data-g4rsya-prelaunch-v532]').length,
      dateFields:root.querySelectorAll('[data-g4rsya-v289-field="launchDate"]').length,
      checkCount:document.querySelectorAll('[data-g4rsya-launch-check]').length,
      meta:document.querySelector('[data-g4rsya-v453-step-meta="launch"]').textContent,
      searchUnchanged:s.searchBefore===JSON.stringify(state.gate4SearchBuild),groupsUnchanged:s.groupsBefore===JSON.stringify(s.d.groups)};
  })()`);
  assert(visible.steps.join('|')==='1JTBD и группы|2Запуск'&&visible.hiddenOld&&visible.oldData&&visible.searchUnchanged&&visible.groupsUnchanged,'Other state changed: '+JSON.stringify(visible));
  assert(visible.rows.length===5&&visible.rows[0].copy==='14878.6'&&visible.rows[1].copy==='1487.86'&&visible.rows.every(e=>e.copy),'Panel copy rows wrong: '+JSON.stringify(visible.rows));
  assert(visible.metrika[0]===initial.metrika[0]&&visible.metrika[1]===initial.metrika[1]&&visible.volume&&visible.preChecks===2&&visible.dateFields===1&&visible.checkCount===14&&visible.meta.includes('из 17'),'Metrika/volume/checklist changed');
  await screenshot('gate4-rsya-direct-filled-v533.png','[data-g4rsya-direct-v533]');
  await screenshot('gate4-rsya-other-launch-items-v533.png','.g4-rsya-launch-v528 > .g4-v406-launch-level',4800);
  const copied = await evaluate(`(async () => {
    window.__copiedV533='';g4sbV141CopyText=async value=>{window.__copiedV533=String(value)};
    const button=document.querySelector('.g4-rsya-direct-main-v533 .g4-rsya-direct-row-v533 button');
    button.click();await new Promise(r=>setTimeout(r,0));
    const test=document.createElement('input');test.setAttribute('data-g4rsya-test-paste-v533','');document.body.appendChild(test);test.value=window.__copiedV533;
    return {clipboard:window.__copiedV533,pasted:test.value,button:button.textContent};
  })()`);
  assert(copied.clipboard==='14878.6'&&copied.pasted==='14878.6'&&!/[\s₽]/.test(copied.pasted),'Numeric copy/paste failed: '+JSON.stringify(copied));
  const missing = await evaluate(`(() => {
    const s=window.__strategySmoke,key=normalizeAspectKey(s.pid),saved=state.gate4SearchBuild[key];
    delete state.gate4SearchBuild[key];
    const p=g4RsyaDirectPanelModelV533(s.pid,s.d);
    document.querySelector('[data-g4rsya-direct-v533]').outerHTML=g4RsyaLaunchStrategyHtmlV528(s.pid,s.channel.key,s.campaign,s.d);
    const root=document.querySelector('[data-g4rsya-direct-v533]');
    const result={hasSearch:p.hasSearch,missing:p.missing,badge:root.querySelector('.g4-rsya-direct-status-v533 .status-pill').textContent,
      fallback:root.querySelectorAll('[data-g4rsya-v289-field="expectedCpaManualRub"]').length,
      copyBudget:Boolean(root.querySelector('.g4-rsya-direct-main-v533 .g4-rsya-direct-row-v533 button')),
      reason:root.querySelector('.g4-rsya-direct-status-v533 p')?.textContent,
      panelInputs:root.querySelectorAll('.g4-rsya-direct-panel-v533 input').length};
    state.gate4SearchBuild[key]=saved;return result;
  })()`);
  assert(!missing.hasSearch&&missing.fallback===1&&!missing.copyBudget&&missing.panelInputs===0&&missing.badge.includes('Search-прогноз: шаг 2')&&missing.reason.includes('нет сохранённых групп'),'No-forecast state failed: '+JSON.stringify(missing));
  await screenshot('gate4-rsya-direct-no-search-v533.png','[data-g4rsya-direct-v533]');
  const fallback = await evaluate(`(() => {
    const s=window.__strategySmoke,key=normalizeAspectKey(s.pid),saved=state.gate4SearchBuild[key];delete state.gate4SearchBuild[key];
    s.d.campaign.startMethodV532.expectedCpaManualRub='150';
    const p=g4RsyaDirectPanelModelV533(s.pid,s.d);
    const html=g4RsyaLaunchStrategyHtmlV528(s.pid,s.channel.key,s.campaign,s.d);
    s.d.campaign.startMethodV532.expectedCpaManualRub='';state.gate4SearchBuild[key]=saved;
    return {expected:p.expected,price:p.price,budget:p.budget,hasSearch:p.hasSearch,
      sourceShown:html.includes('своя оценка цены заявки 150'),emptySearchFormula:html.includes('Search · 0 групп'),
      readyBadge:html.includes('Бюджета достаточно для обучения')};
  })()`);
  assert(!fallback.hasSearch&&fallback.expected===150&&fallback.price===300&&fallback.budget===3000&&fallback.sourceShown&&!fallback.emptySearchFormula&&fallback.readyBadge,'Manual fallback failed: '+JSON.stringify(fallback));
  const projects = await evaluate(`(() => {
    const sources=${JSON.stringify(fixtures.map(f=>({id:f.id,name:f.name,workspace:f.workspace})))};
    return sources.map(source=>{state=structuredClone(source.workspace);activeProjectId=state.project.id;guruV194Ensure(state);
      const product=Object.keys(state.gate4Rsya||{})[0]||${JSON.stringify(productId)};
      const channel=g4LaunchChannels().find(g4IsYandexRsyaChannel);
      const d=ensureGate4RsyaV289(product),campaign=g4RsyaCampaignV289(product,channel.key);
      const before=structuredClone(d.campaign),groups=JSON.stringify(d.groups),search=JSON.stringify(state.gate4SearchBuild);
      g4RsyaMigrateStrategyV531(campaign,d);g4RsyaMigrateStartMethodV532(d);g4RsyaDirectPanelModelV533(product,d);
      return {project:source.name,product,preserved:Object.entries(before).every(([k,v])=>['strategy','paymentModel','budgetPeriod'].includes(k)||JSON.stringify(d.campaign[k])===JSON.stringify(v)),groups:groups===JSON.stringify(d.groups),search:search===JSON.stringify(state.gate4SearchBuild)};
    });
  })()`);
  assert(projects.length===4&&projects.every(p=>p.preserved&&p.groups&&p.search),'Data preservation failed: '+JSON.stringify(projects));
  console.log(JSON.stringify({ok:true,source,edgeCases,visible,copied,missing,fallback,projects,searchHash:hash(initial.searchHtml)},null,2));
} finally {
  page?.close();
  await browser.call('Target.disposeBrowserContext',{browserContextId});
  browser.close();
}
