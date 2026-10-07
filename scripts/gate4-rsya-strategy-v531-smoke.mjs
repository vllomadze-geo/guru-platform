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
      }, 60000);
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
  await screenshot('gate4-search-unchanged-v531.png','.g1-card:has(> [data-g4sb-step="launch"])');
  const layout = await evaluate(`(() => {
    const s=window.__strategySmoke;
    s.d.ui.workflowStepOpenV453={...s.d.ui.workflowStepOpenV453,groups:false,launch:false};
    s.render();
    return [...document.querySelectorAll('[data-g4rsya-v453-step] .g1-card-title')].map(e=>e.textContent.trim());
  })()`);
  assert(layout.join('|')==='1JTBD и группы|2Запуск','RSYA steps changed: '+JSON.stringify(layout));
  await screenshot('gate4-rsya-goat-collapsed-v531.png','.g4-rsya-v289');
  const fields = await evaluate(`(() => {
    const s=window.__strategySmoke;
    s.d.ui.workflowStepOpenV453.launch=true;s.render();
    const root=document.querySelector('[data-g4rsya-strategy-v531]');
    const labels=[...root.querySelectorAll('.g4-rsya-strategy-fixed-v531 > strong,.g4-rsya-strategy-row-v531 > strong')].map(e=>e.textContent.trim());
    const controls=[...root.querySelectorAll('[data-g4rsya-v289-bind]')].map(e=>[e.dataset.g4rsyaV289Store,e.dataset.g4rsyaV289Field,e.value]);
    const settings=document.querySelector('[data-g4rsya-campaign-settings]');
    const duplicate=[...settings.querySelectorAll('[data-g4rsya-v289-field]')].filter(e=>['strategy','paymentModel','budget','budgetPeriod','targetCpaRub','targetDrrPercent','metrikaCounter','metrikaGoal','weeklyBudgetRubV531','from','to','count','evidenceUrl'].includes(e.dataset.g4rsyaV289Field)).length;
    return {labels,controls,duplicate,source:s.before,after:structuredClone(s.d.campaign),commonAfter:structuredClone(s.campaign),
      colors:[...root.querySelectorAll('.g1-input')].map(e=>getComputedStyle(e).backgroundColor),
      meta:document.querySelector('[data-g4rsya-v453-step-meta="launch"]').textContent,
      checkCount:document.querySelectorAll('[data-g4rsya-launch-check]').length,
      otherLabels:[...document.querySelectorAll('[data-g4rsya-launch-check]')].map(e=>e.parentElement.textContent.trim()),
      searchUnchanged:s.searchBefore===JSON.stringify(state.gate4SearchBuild),groupUnchanged:s.groupsBefore===JSON.stringify(s.d.groups)};
  })()`);
  assert(fields.labels.join('|')==='1. Стратегия|2. Оплата|3. Бюджет · В неделю|4. Ограничение расхода|5. Целевая цена конверсии, ₽|6. Целевая ДРР|7. Метрика|8. Проверка объёма конверсий','Wrong field order: '+JSON.stringify(fields.labels));
  assert(fields.duplicate===0,'Duplicate settings input');
  assert(fields.controls.some(e=>e[1]==='metrikaCounter'&&e[2]===initial.metrika[0])&&fields.controls.some(e=>e[1]==='metrikaGoal'&&e[2]===initial.metrika[1]),'Metrika values lost');
  assert(fields.checkCount===14&&fields.meta.includes('из 17')&&fields.searchUnchanged&&fields.groupUnchanged,'Other launch content changed');
  for(const [key,value] of Object.entries(fields.source)) if(!['strategy','paymentModel','budgetPeriod'].includes(key)) assert(JSON.stringify(fields.after[key])===JSON.stringify(value),`Existing ${key} changed`);
  for(const color of fields.colors){const rgb=color.match(/[\d.]+/g)?.slice(0,3).map(Number);assert(!rgb||Math.max(...rgb)-Math.min(...rgb)<12,`Colored input: ${color}`);}
  await screenshot('gate4-rsya-strategy-full-v531.png','[data-g4rsya-strategy-v531]');
  await screenshot('gate4-rsya-other-launch-items-v531.png','.g4-rsya-launch-v528 > .g4-v406-launch-level',4800);
  const cases = await evaluate(`(() => {
    const s=window.__strategySmoke;
    const result={};
    s.d.campaign.weeklyBudgetRubV531='299';s.render();
    result.budgetLow={error:document.querySelector('[data-g4rsya-strategy-v531]').textContent.includes('Ошибка: меньше 300 ₽'),copyDisabled:document.querySelector('[data-g4rsya-v289-field="weeklyBudgetRubV531"]').closest('label').querySelector('[data-g4rsya-v289-copy]').disabled};
    s.d.campaign.weeklyBudgetRubV531='300';s.render();
    result.budgetOk=!document.querySelector('[data-g4rsya-v289-field="weeklyBudgetRubV531"]').closest('label').querySelector('[data-g4rsya-v289-copy]').disabled;
    const check=s.d.campaign.conversionVolumeCheck;const now=new Date();const yesterday=new Date(now.getFullYear(),now.getMonth(),now.getDate()-1);const from=new Date(yesterday.getFullYear(),yesterday.getMonth(),yesterday.getDate()-6);const date=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    Object.assign(check,{from:date(from),to:date(yesterday),count:'9',evidenceUrl:'https://metrika.yandex.ru/stat/',checkedAt:now.toISOString(),goalId:s.d.campaign.metrikaGoal,counterId:s.d.campaign.metrikaCounter});
    s.render();result.low={strategy:s.d.campaign.strategy,value:document.querySelector('.g4-rsya-strategy-fixed-v531 input').value,badge:document.querySelector('.g4-rsya-volume-result-v363 .status-pill').textContent};
    check.count='10';s.render();result.high={strategy:s.d.campaign.strategy,value:document.querySelector('.g4-rsya-strategy-fixed-v531 input').value,badge:document.querySelector('.g4-rsya-volume-result-v363 .status-pill').textContent};
    check.count='21';s.render();result.above20=document.querySelector('.g4-rsya-volume-result-v363 .status-pill').textContent;
    s.campaign.launchDate=date(new Date(now.getFullYear(),now.getMonth(),now.getDate()-7));s.render();result.cpaOpen=!document.querySelector('[data-g4rsya-v289-field="targetCpaRub"]').disabled;
    s.d.campaign.strategyTarget.targetCpaRub='0.8';s.render();result.cpaLow=document.querySelector('[data-g4rsya-v289-field="targetCpaRub"]').closest('label').querySelector('[data-g4rsya-v289-copy]').disabled;
    s.d.campaign.strategyTarget.targetCpaRub='0.9';s.render();result.cpaOk=!document.querySelector('[data-g4rsya-v289-field="targetCpaRub"]').closest('label').querySelector('[data-g4rsya-v289-copy]').disabled;
    const weekly={budget:'1 250 ₽'};const weeklyData={campaign:{strategy:'target_cpa',paymentModel:'conversions',budgetPeriod:'week'},ui:{}};
    g4RsyaMigrateStrategyV531(weekly,weeklyData);
    result.weeklyMigration={amount:weeklyData.campaign.weeklyBudgetRubV531,old:weeklyData.campaign.legacyStrategySettingsV531,budget:weekly.budget};
    const monthly={budget:'12 000'};const monthlyData={campaign:{strategy:'target_drr',paymentModel:'conversions',budgetPeriod:'month'},ui:{}};
    g4RsyaMigrateStrategyV531(monthly,monthlyData);
    result.monthlyMigration={amount:monthlyData.campaign.weeklyBudgetRubV531,old:monthlyData.campaign.legacyStrategySettingsV531,budget:monthly.budget};
    result.legacy=JSON.stringify(s.d.campaign.legacyStrategySettingsV531);
    return result;
  })()`);
  assert(cases.budgetLow.error&&cases.budgetLow.copyDisabled&&cases.budgetOk,'Budget minimum broken');
  assert(cases.low.strategy==='max_clicks'&&cases.low.value==='Оптимизация кликов'&&cases.high.strategy==='max_conversions'&&cases.high.value==='Максимум конверсий'&&cases.high.badge==='10–20 подтверждено'&&cases.above20==='>20 подтверждено','Strategy threshold broken: '+JSON.stringify(cases));
  assert(cases.cpaOpen&&cases.cpaLow&&cases.cpaOk,'CPA unlock/minimum broken');
  assert(cases.weeklyMigration.amount==='1250'&&cases.weeklyMigration.old.budget==='1 250 ₽'&&cases.weeklyMigration.old.paymentModel==='conversions'&&cases.weeklyMigration.budget==='1 250 ₽','Weekly migration lost old values');
  assert(cases.monthlyMigration.amount===''&&cases.monthlyMigration.old.budget==='12 000'&&cases.monthlyMigration.old.budgetPeriod==='month'&&cases.monthlyMigration.budget==='12 000','Monthly budget was reinterpreted');
  const inputFlow = await evaluate(`(() => {
    const s=window.__strategySmoke;
    const budget=document.querySelector('[data-g4rsya-v289-field="weeklyBudgetRubV531"]');
    budget.value='350';budget.dispatchEvent(new Event('input',{bubbles:true}));
    const stored=s.d.campaign.weeklyBudgetRubV531;
    const copy=budget.closest('label').querySelector('[data-g4rsya-v289-copy]');
    const copyValue=copy.dataset.g4rsyaV289Copy;
    budget.dispatchEvent(new Event('change',{bubbles:true}));
    const rendered=document.querySelector('[data-g4rsya-v289-field="weeklyBudgetRubV531"]')?.value;
    return {stored,copyValue,rendered};
  })()`);
  assert(inputFlow.stored==='350'&&inputFlow.copyValue==='350'&&inputFlow.rendered==='350','Budget input/copy persistence broken: '+JSON.stringify(inputFlow));
  const projects = await evaluate(`(() => {
    const sources=${JSON.stringify(fixtures.map(f=>({id:f.id,name:f.name,workspace:f.workspace})))};
    const out=[];
    for(const source of sources){
      state=structuredClone(source.workspace);activeProjectId=state.project.id;guruV194Ensure(state);
      const productKeys=new Set([...Object.keys(state.gate4Rsya||{}),...Object.keys(state.gate4SearchBuild||{})]);
      const product=[...productKeys][0]||${JSON.stringify(productId)};
      const channel=g4LaunchChannels().find(g4IsYandexRsyaChannel);
      const d=ensureGate4RsyaV289(product);const campaign=g4RsyaCampaignV289(product,channel.key);
      const before=structuredClone(d.campaign);const groupBefore=JSON.stringify(d.groups);
      g4RsyaMigrateStrategyV531(campaign,d);
      const preserved=Object.entries(before).every(([key,val])=>['strategy','paymentModel','budgetPeriod'].includes(key)||JSON.stringify(d.campaign[key])===JSON.stringify(val));
      out.push({project:source.name,product,preserved,groups:groupBefore===JSON.stringify(d.groups),weeklyKey:Object.hasOwn(d.campaign,'weeklyBudgetRubV531'),migration:d.campaign.strategyMigrationV531});
    }
    return out;
  })()`);
  assert(projects.length===4&&projects.every(p=>p.preserved&&p.groups&&p.weeklyKey&&p.migration),'Four project migration failed: '+JSON.stringify(projects));
  console.log(JSON.stringify({ok:true,product:initial.product,fields:fields.labels,metrika:initial.metrika,checkCount:fields.checkCount,meta:fields.meta,cases,projects,searchHash:hash(initial.searchHtml)},null,2));
} finally {
  page?.close();
  await browser.call('Target.disposeBrowserContext',{browserContextId});
  browser.close();
}
