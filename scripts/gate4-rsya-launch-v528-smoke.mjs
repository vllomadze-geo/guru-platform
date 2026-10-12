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
  if (id === projectIds[0]) Object.assign(workspace, structuredClone(gate4Export.content));
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
  const source = await evaluate(`(() => {
    scheduleCloudSync=()=>{}; scheduleProjectsCloudSync=()=>{};
    const imported=${JSON.stringify(gate4Export)};
    state=createFreshWorkspace({id:${JSON.stringify(smokeId)},name:'Проверка РСЯ · Коза'});
    for(const [key,value] of Object.entries(imported.content)) state[key]=structuredClone(value);
    if(imported.structure) state.gates[state.gates.findIndex(g=>g.id==='gate-4')]=structuredClone(imported.structure);
    state.project.id=${JSON.stringify(smokeId)};
    activeProjectId=state.project.id; activeView='gate'; activeGateId='gate-4';
    els.launcher.hidden=true; els.appShell.hidden=false; updateProjectChrome(); guruV194Ensure(state);
    const pid=${JSON.stringify(productId)};
    const product=guruV194Product(pid,state); const ui=guruV194Ui(state);
    ui.selectedCategoryId=product.categoryId; ui.selectedProductId=pid;
    ensureGate4Production().launchProduct=pid;
    const channel=g4LaunchChannels().find(g4IsYandexRsyaChannel);
    const searchChannel=g4LaunchChannels().find(g4IsYandexSearchChannel);
    g4EnsureLaunchUiState().rows[g4CampaignStateKey(pid,channel.key)]=true;
    g4EnsureLaunchUiState().rows[g4CampaignStateKey(pid,searchChannel.key)]=true;
    const d=ensureGate4RsyaV289(pid);
    const campaign=g4RsyaCampaignV289(pid,channel.key);
    const sourceCounts={groups:d.groups.length,ads:d.groups.reduce((n,g)=>n+(g.ads||[]).length,0)};
    window.__rsyaLaunchSmoke={pid,d,campaign,channel,searchChannel,sourceCounts,
      groupDataBefore:JSON.stringify(d.groups),
      searchBefore:JSON.stringify(state.gate4SearchBuild),
      savedPersist:guruPersistStateFast,savedPreferenceSave:guruScheduleUiPreferenceSave,
      savedSaveState:saveState,savedFlash:flashSaving,preferenceSaves:0,
      snapshot(){return JSON.stringify({campaign:d.campaign,groups:d.groups,common:campaign});},
      render(kind='rsya'){
        const html=kind==='search'
          ? g4sbSearchChannelCardHtml(searchChannel,g4RsyaCampaignV289(pid,searchChannel.key),0,pid)
          : g4RsyaChannelCardV289(channel,campaign,0,pid);
        els.contentArea.innerHTML=html;
        els.pageTitle.textContent='Яндекс Директ / '+(kind==='search'?'Поиск':'РСЯ')+' · '+product.name;
      }
    };
    guruPersistStateFast=()=>true;saveState=()=>true;flashSaving=()=>{};
    guruScheduleUiPreferenceSave=()=>{window.__rsyaLaunchSmoke.preferenceSaves++;};
    renderGate=()=>window.__rsyaLaunchSmoke.render();
    const sd=ensureGate4SearchBuild(pid);sd.searchStepOpen={...sd.searchStepOpen,clusters:false,launch:true};
    const searchModel=g4sbV407LaunchModel(pid,sd);
    const searchHtml=g4sbV406LaunchBodyHtml(pid,sd,searchModel,searchChannel,g4RsyaCampaignV289(pid,searchChannel.key));
    window.__rsyaLaunchSmoke.render('search');
    return {counts:sourceCounts,searchHtml};
  })()`);
  assert(source.searchHtml===baseline.bodyHtml,`Search Launch HTML changed: ${hash(source.searchHtml)} != ${hash(baseline.bodyHtml)}`);
  await screenshot('gate4-search-launch-unchanged-v528.png','.g1-card:has(> [data-g4sb-step="launch"])');
  console.error("Search exact HTML unchanged",hash(source.searchHtml));
  const platformSource={url:"",source:"Fresh Gate4 export does not contain Gate0 platform; missing values are verified as not set"};
  await evaluate(`(() => {
    const s=window.__rsyaLaunchSmoke;
    s.d.ui.workflowStepOpenV453={...s.d.ui.workflowStepOpenV453,groups:false,launch:false};
    s.render();
  })()`);
  await screenshot('gate4-rsya-goat-collapsed-v530.png','.g4-rsya-v289');
  await evaluate(`document.querySelector('#workspaceToolbar').style.display='none'`);
  await screenshot('gate4-rsya-goat-collapsed-context-v530.png','main.main',650);
  const initial = await evaluate(`(() => {
    const s=window.__rsyaLaunchSmoke;
    s.d.ui.workflowStepOpenV453={...s.d.ui.workflowStepOpenV453,groups:false,settings:false,launch:true};
    s.render();
    s.initialData=s.snapshot(); s.searchData=JSON.stringify(state.gate4SearchBuild);
    s.legacyChecks=JSON.stringify(s.d.launchChecklistV454);
    const body=document.querySelector('[data-g4rsya-launch-body]');
    const settings=body.querySelector('[data-g4rsya-campaign-settings]');
    const fields=[...settings.querySelectorAll('[data-g4rsya-v289-store][data-g4rsya-v289-field]')]
      .map(e=>[e.dataset.g4rsyaV289Store,e.dataset.g4rsyaV289Field,e.value]);
    const model=g4RsyaLaunchModelV528(s.pid,s.d);
    const checks=[...body.querySelectorAll('[data-g4rsya-launch-check]')];
    return {steps:[...document.querySelectorAll('[data-g4rsya-v453-step] .g1-card-title')].map(e=>e.textContent.trim()),
      settingsFirst:body.firstElementChild===settings,settingsTitle:settings.querySelector('h3')?.textContent,
      fields,legacySettingsKey:s.d.ui.workflowStepOpenV453.settings,
      bareChoose:[...settings.querySelectorAll('select')].filter(e=>e.selectedOptions[0]?.textContent.trim()==='Выбрать').length,
      emptyBackgrounds:[...settings.querySelectorAll('.g1-input.is-empty')].map(e=>getComputedStyle(e).backgroundColor),
      count:checks.length,keys:checks.map(e=>e.dataset.g4rsyaLaunchCheck),
      labels:checks.map(e=>e.parentElement.textContent.trim()),
      total:model.total,ready:model.ready,groups:model.groups.length,fixed:model.fixed,
      statuses:model.groups.map(e=>({status:e.status,source:g4RsyaGroupStatus(s.pid,e.group)})),
      meta:document.querySelector('[data-g4rsya-v453-step-meta="launch"]').textContent,
      header:body.querySelector('.g4-v407-launch-context').textContent.trim(),
      noSearchOnly:!(/Минус-фразы|Приоритизация объявлений|Дубли фраз между группами|Заявки\\/неделю|ручными ставками/i.test(body.textContent)),
      editableSources:body.querySelectorAll('input:not([type="checkbox"]):not([readonly]),textarea:not([readonly]),select').length,
      groupsCount:body.querySelectorAll('[data-g4rsya-launch-group-level]').length,
      commonFields:JSON.stringify(s.campaign)};
  })()`);
  assert(initial.steps.join('|')==='1JTBD и группы|2Запуск'&&initial.settingsFirst&&initial.settingsTitle==='Настройки кампании',`Wrong steps ${JSON.stringify(initial.steps)}`);
  assert(initial.legacySettingsKey===false && initial.fields.some(([store,field,value])=>store==='campaign'&&field==='metrikaCounter'&&value==='105213127') && initial.fields.some(([store,field,value])=>store==='campaign'&&field==='metrikaGoal'&&value==='ID 573230679'),`Settings fields missing ${JSON.stringify(initial.fields)}`);
  assert(initial.bareChoose===0,'Settings contain an empty «Выбрать» option');
  assert(initial.emptyBackgrounds.every(color=>{const rgb=color.match(/[\d.]+/g)?.slice(0,3).map(Number);return !rgb||Math.max(...rgb)-Math.min(...rgb)<12}),`Empty settings fields have color fill ${initial.emptyBackgrounds}`);
  assert(initial.count===14 && initial.keys.every((key,i)=>key===`campaign:${i+1}`),`Campaign checklist invalid ${JSON.stringify(initial)}`);
  assert(initial.total===17 && initial.groups===3 && initial.statuses.every(e=>e.status===e.source),`Status/model mismatch ${JSON.stringify(initial)}`);
  assert(initial.meta===`Готово ${initial.ready} из ${initial.total}` && initial.noSearchOnly && initial.editableSources>0,`Launch contents invalid ${JSON.stringify(initial)}`);
  assert(initial.header.includes('Итоговый бюджет:') && initial.header.includes('не задано') && initial.header.includes('из 3 групп готовы'),`Missing source/header ${initial.header}`);
  await screenshot('gate4-rsya-launch-header-v528.png','.g1-card:has(> [data-g4rsya-v453-step="launch"])',1100);
  await screenshot('gate4-rsya-goat-launch-open-v530.png','.g1-card:has(> [data-g4rsya-v453-step="launch"])',2400);
  await screenshot('gate4-rsya-launch-campaign-v528.png','[data-g4rsya-campaign-settings]',1100);
  await screenshot('gate4-rsya-goat-launch-settings-v530.png','[data-g4rsya-campaign-settings]');
  const interaction = await evaluate(`(() => {
    const s=window.__rsyaLaunchSmoke;
    const check=document.querySelector('[data-g4rsya-launch-check="campaign:1"]');
    check.checked=true;check.dispatchEvent(new Event('change',{bubbles:true}));
    const toggle=document.querySelector('[data-g4rsya-launch-group-toggle]');
    s.openKey=toggle.dataset.g4rsyaLaunchGroupToggle; toggle.click();
    const level=document.querySelector('[data-g4rsya-launch-group-level]');
    const keyData=JSON.parse(s.openKey);
    const allFields=[...document.querySelectorAll('[data-g4rsya-launch-body] textarea')];
    const colors=allFields.map(e=>getComputedStyle(e).backgroundColor);
    const groupBefore=s.d.groups[0];
    const openBefore=!level.classList.contains('is-collapsed');
    s.d.groups.reverse();s.render();
    const reordered=[...document.querySelectorAll('[data-g4rsya-launch-group-level]')].find(e=>e.dataset.g4rsyaLaunchGroupLevel===s.openKey);
    const openAfterReorder=!reordered.classList.contains('is-collapsed');
    s.d.groups.reverse();s.render();
    return {stored:s.d.ui.launchChecklistV528['campaign:1']===true,storedOpen:s.d.ui.launchGroupOpenV528[s.openKey]===true,
      keyData,expectedKey:[groupBefore.product_id,groupBefore.jtbdId],openBefore,openAfterReorder,
      newReady:g4RsyaLaunchModelV528(s.pid,s.d).ready,
      dataUnchanged:s.initialData===s.snapshot(),searchUnchanged:s.searchData===JSON.stringify(state.gate4SearchBuild),
      legacyUnchanged:s.legacyChecks===JSON.stringify(s.d.launchChecklistV454),colors,
      saves:s.preferenceSaves,groupText:document.querySelector('[data-g4rsya-launch-group-level]').textContent};
  })()`);
  assert(interaction.stored && interaction.storedOpen && interaction.openBefore && interaction.openAfterReorder && interaction.saves>=2,`UI preferences broken ${JSON.stringify(interaction)}`);
  assert(JSON.stringify(interaction.keyData)===JSON.stringify(interaction.expectedKey),`Group preference not ID based ${JSON.stringify(interaction.keyData)}`);
  assert(interaction.newReady===initial.ready+1 && interaction.dataUnchanged && interaction.searchUnchanged && interaction.legacyUnchanged,`Source data changed ${JSON.stringify(interaction)}`);
  assert(interaction.groupText.includes('Заголовки · 7/7')&&interaction.groupText.includes('Тексты · 3/3')&&interaction.groupText.includes('Изображения · 4/5'),`Creative limits absent ${interaction.groupText.slice(0,1000)}`);
  for(const color of interaction.colors){const rgb=color.match(/[\d.]+/g)?.slice(0,3).map(Number);assert(!rgb||Math.max(...rgb)-Math.min(...rgb)<12,`Colored source field ${color}`);}
  await screenshot('gate4-rsya-launch-group-v528.png','[data-g4rsya-launch-group-level]');
  const sourceRules = await evaluate(`(() => {
    const s=window.__rsyaLaunchSmoke;const settings=structuredClone(s.d.campaign);const common=structuredClone(s.campaign);
    const model=g4RsyaLaunchModelV528(s.pid,s.d);
    const platformStore=megaPlatformUrlStore(state);const originalPlatformProducts=structuredClone(platformStore.products);
    megaPlatformSetUrl('products',s.pid,'https://example.test/goat?existing=1',state);
    const parsed=(html)=>{const h=document.createElement('div');h.innerHTML=html;return h;};
    const urlField=(h)=>h.querySelector('[data-g4sb-package-field="final-url"] textarea')?.value||'';
    s.campaign.utmTemplate=G4_YANDEX_RECOMMENDED_UTM_V488.rsya;s.campaign.utm=s.campaign.utmTemplate;
    const renderedUrl=urlField(parsed(g4RsyaLaunchUrlHtmlV528(s.pid,s.campaign,s.d.groups[0],s.d.groups[0].ads[0])));
    const expectedUrl=g4RsyaFinalUrlValueV478(s.campaign,s.pid,s.d.groups[0],s.d.groups[0].ads[0]);
    s.campaign.budget='250';s.d.campaign.budgetPeriod='week';s.d.campaign.strategy='max_clicks';
    const low=parsed(g4RsyaLaunchStrategyHtmlV528(s.campaign,s.d));
    const lowBadge=low.querySelector('.status-problem')?.textContent;
    s.campaign.budget='300';const enough=parsed(g4RsyaLaunchStrategyHtmlV528(s.campaign,s.d));
    const enoughBadge=enough.querySelector('.status-ready')?.textContent;
    s.campaign.budget='40000';s.d.campaign.budgetPeriod='month';
    const monthly=parsed(g4RsyaLaunchStrategyHtmlV528(s.campaign,s.d));
    const monthlyBadge=[...monthly.querySelectorAll('.status-pill')].map(e=>e.textContent).join('|');
    const firstAd=s.d.groups[0].ads[0];const imageSnapshot=firstAd.images;
    firstAd.images=Array.from({length:8},(_,i)=>({...imageSnapshot[0],id:'overflow-'+i}));
    const overflow=parsed(g4RsyaLaunchAdHtmlV528(s.pid,s.campaign,s.d.groups[0],firstAd,0));
    const overWarning=overflow.querySelector('.status-problem')?.textContent;
    const keptImages=firstAd.images.length;
    firstAd.images=imageSnapshot;
    for(const key of Object.keys(s.campaign))delete s.campaign[key];Object.assign(s.campaign,common);s.d.campaign=settings;platformStore.products=originalPlatformProducts;
    s.render();
    return {positiveUrlFixture:'https://example.test/goat?existing=1',renderedUrl,expectedUrl,template:s.campaign.utmTemplate,lowBadge,enoughBadge,monthlyBadge,overWarning,keptImages,
      dataRestored:s.initialData===s.snapshot()};
  })()`);
  assert(sourceRules.renderedUrl===sourceRules.expectedUrl && sourceRules.renderedUrl.includes('utm_term='),`UTM diverged ${JSON.stringify(sourceRules)}`);
  assert(sourceRules.lowBadge?.includes('ниже 300')&&sourceRules.enoughBadge?.includes('≥ 300')&&sourceRules.monthlyBadge.includes('не задано'),`Budget rules invalid ${JSON.stringify(sourceRules)}`);
  assert(sourceRules.overWarning && sourceRules.keptImages===8 && sourceRules.dataRestored,`Image overflow lost data ${JSON.stringify(sourceRules)}`);
  const conditionalFields=await evaluate(`(() => {
    const s=window.__rsyaLaunchSmoke;
    const original=structuredClone(s.d.campaign);
    const inventory={};
    for(const strategy of ['max_conversions','target_cpa','target_drr']){
      s.d.campaign.strategy=strategy;
      s.d.campaign.excludedPlacements=[{id:'layout-smoke-placement',placement:'example.test',reason:'тест'}];
      const root=document.createElement('div');
      root.innerHTML=g4RsyaLaunchBodyV453(s.pid,s.channel.key,s.campaign,s.d,g4RsyaLaunchModelV528(s.pid,s.d));
      inventory[strategy]=[...root.querySelectorAll('[data-g4rsya-campaign-settings] [data-g4rsya-v289-store][data-g4rsya-v289-field]')]
        .map(e=>e.dataset.g4rsyaV289Store+'.'+e.dataset.g4rsyaV289Field);
    }
    s.d.campaign=original;
    return {inventory,dataRestored:s.initialData===s.snapshot()};
  })()`);
  for(const [strategy,fields] of Object.entries(conditionalFields.inventory)){
    for(const field of ['campaign.paymentModel','conversionVolumeCheck.from','conversionVolumeCheck.to','conversionVolumeCheck.count','conversionVolumeCheck.evidenceUrl','excludedPlacement.placement','excludedPlacement.reason'])
      assert(fields.includes(field),`Missing ${field} for ${strategy}`);
  }
  assert(conditionalFields.inventory.target_cpa.includes('strategyTarget.targetCpaRub')&&conditionalFields.inventory.target_drr.includes('strategyTarget.targetDrrPercent')&&conditionalFields.dataRestored,`Conditional settings lost ${JSON.stringify(conditionalFields)}`);
  console.error('RSYA UI/source checks passed');

  const projectsAudit=[];
  for(const fixture of fixtures){
    const result=await evaluate(`(() => {
      const previous=state;const previousId=activeProjectId;
      const stable=value=>JSON.stringify(value,(_key,row)=>row&&typeof row==='object'&&!Array.isArray(row)?Object.fromEntries(Object.keys(row).sort().map(key=>[key,row[key]])):row);
      const settingsRenderer=g4RsyaCampaignSettingsBodyV528;
      const run=(embedded)=>{
        state=structuredClone(${JSON.stringify(fixture.workspace)});
        activeProjectId=${JSON.stringify(fixture.id)};
        guruV194Ensure(state);megaPlatformUrlStore(state);megaPlatformCategoryStore(state);
        const branches=state.gate4Rsya||{};
        const entries=Object.entries(branches);
        const count={branches:entries.length,groups:entries.reduce((n,[,d])=>n+(d.groups||[]).length,0),ads:entries.reduce((n,[,d])=>n+(d.groups||[]).reduce((v,g)=>v+(g.ads||[]).length,0),0)};
        for(const [key,d] of entries){
          const pid=(state.project.catalogItemsV189||[]).find(p=>normalizeAspectKey(p.id)===key)?.id||${JSON.stringify(productId)};
          const model=g4RsyaLaunchModelV528(pid,d);
          if(!embedded)settingsRenderer(pid,'test-rsya',{},d);
          if(!embedded)g4RsyaCampaignSettingsBodyV528=()=>'';
          try{g4RsyaLaunchBodyV453(pid,'test-rsya',{},d,model);}
          finally{g4RsyaCampaignSettingsBodyV528=settingsRenderer;}
        }
        if(!entries.length){const d={campaign:{},groups:[],ui:{}};const model=g4RsyaLaunchModelV528('',d);if(model.total!==14||model.groups.length)throw new Error('Empty model failed');}
        return {count,rsya:stable(branches),gates:stable(state.gates),search:stable(state.gate4SearchBuild||{})};
      };
      const oldLayout=run(false);const newLayout=run(true);
      const sourceUnchanged=oldLayout.rsya===newLayout.rsya;
      const otherGatesUnchanged=!oldLayout.count.branches||oldLayout.gates===newLayout.gates&&oldLayout.search===newLayout.search;
      state=previous;activeProjectId=previousId;
      return {initial:oldLayout.count,after:newLayout.count,sourceUnchanged,otherGatesUnchanged};
    })()`);
    assert(JSON.stringify(result.initial)===JSON.stringify(result.after)&&result.sourceUnchanged&&result.otherGatesUnchanged,`Project data changed ${fixture.name}: ${JSON.stringify(result)}`);
    projectsAudit.push({id:fixture.id,name:fixture.name,...result});
  }
  console.error('Four actual project copies checked',JSON.stringify(projectsAudit));

  const persistenceBefore=await evaluate(`(() => {
    const s=window.__rsyaLaunchSmoke;
    // Keep every record, ID and image metadata. Replace only inline base64
    // payloads in this disposable copy so real localStorage stays within quota.
    let inlinePayloads=0;
    const compact=(value)=>{if(typeof value==='string'&&value.startsWith('data:')&&value.length>500){inlinePayloads++;return 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';}if(Array.isArray(value))return value.map(compact);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,compact(v)]));return value;};
    state=compact(state);
    const omittedDiagnosticLog={key:'project._jtbdEncodingRepairLogV298',entries:state.project._jtbdEncodingRepairLogV298?.length||0};
    delete state.project._jtbdEncodingRepairLogV298;
    const d=ensureGate4RsyaV289(s.pid);
    if(JSON.stringify(state).length>2000000)throw new Error('Persistence fixture still too large');
    activeProjectId=${JSON.stringify(smokeId)};state.project.id=activeProjectId;
    guruPersistStateFast=s.savedPersist;guruScheduleUiPreferenceSave=s.savedPreferenceSave;saveState=s.savedSaveState;flashSaving=s.savedFlash;
    projects=[state.project];safeStorageSet(PROJECTS_STORAGE_KEY,JSON.stringify(projects));
    guruPersistStateFast({durable:true});
    const channel=g4LaunchChannels().find(g4IsYandexRsyaChannel);
    renderGate=()=>{els.contentArea.innerHTML=g4RsyaChannelCardV289(channel,g4RsyaCampaignV289(s.pid,channel.key),0,s.pid);};renderGate();
    const check=document.querySelector('[data-g4rsya-launch-check="campaign:2"]');check.checked=true;check.dispatchEvent(new Event('change',{bubbles:true}));
    const toggle=[...document.querySelectorAll('[data-g4rsya-launch-group-toggle]')][1];toggle.click();
    const result={inlinePayloads,omittedDiagnosticLog,bytes:JSON.stringify(state).length,expectedUi:JSON.stringify(d.ui),groups:d.groups.length,ads:d.groups.reduce((n,g)=>n+g.ads.length,0)};
    window.__rsyaHardReloadToken=true;return result;
  })()`);
  await page.call('Page.reload',{ignoreCache:true});
  await waitFor('!window.__rsyaHardReloadToken && document.readyState === "complete" && typeof g4RsyaLaunchModelV528 === "function" && typeof WORKSPACE_STORAGE_PREFIX === "string"');
  const persistenceAfter=await evaluate(`(() => {
    scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
    activeProjectId=${JSON.stringify(smokeId)};state=JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX+activeProjectId));
    const d=ensureGate4RsyaV289(${JSON.stringify(productId)});
    const channel=g4LaunchChannels().find(g4IsYandexRsyaChannel);
    els.launcher.hidden=true;els.appShell.hidden=false;
    els.contentArea.innerHTML=g4RsyaChannelCardV289(channel,g4RsyaCampaignV289(${JSON.stringify(productId)},channel.key),0,${JSON.stringify(productId)});
    return {ui:JSON.stringify(d.ui),checked:[...document.querySelectorAll('[data-g4rsya-launch-check]:checked')].map(e=>e.dataset.g4rsyaLaunchCheck),open:document.querySelectorAll('[data-g4rsya-launch-group-level]:not(.is-collapsed)').length,groups:d.groups.length,ads:d.groups.reduce((n,g)=>n+g.ads.length,0)};
  })()`);
  assert(persistenceAfter.ui===persistenceBefore.expectedUi&&persistenceAfter.checked.includes('campaign:1')&&persistenceAfter.checked.includes('campaign:2')&&persistenceAfter.open===2,`Hard reload lost UI ${JSON.stringify({persistenceBefore,persistenceAfter})}`);
  assert(persistenceBefore.groups===persistenceAfter.groups&&persistenceBefore.ads===persistenceAfter.ads,`Hard reload lost source records`);
  assert(page.exceptions.length===0,`Browser errors ${JSON.stringify(page.exceptions)}`);
  const audit={ok:true,source:gate4Path,exportedAt:gate4Export.exportedAt,platformSource,search:{exactHtmlUnchanged:true,sha256:hash(source.searchHtml)},initial,interaction:{...interaction,groupText:undefined},sourceRules,conditionalFields,projectsAudit,persistence:{before:persistenceBefore,after:persistenceAfter},screenshots:['gate4-rsya-goat-collapsed-context-v530.png','gate4-rsya-goat-collapsed-v530.png','gate4-rsya-goat-launch-open-v530.png','gate4-rsya-goat-launch-settings-v530.png','gate4-rsya-launch-header-v528.png','gate4-rsya-launch-campaign-v528.png','gate4-rsya-launch-group-v528.png','gate4-search-launch-unchanged-v528.png']};
  await writeFile(new URL('gate4-rsya-launch-v528-audit.json',outputDir),JSON.stringify(audit,null,2)+'\n');
  console.log(JSON.stringify(audit,null,2));
} finally {
  page?.close();
  await browser.call("Target.disposeBrowserContext", {browserContextId});
  browser.close();
}
