import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const appUrl = process.env.GURU_APP_URL || "http://localhost:3000/";
const port = process.env.GURU_CHROME_DEBUG_PORT || "9358";
const productId = "catalog-item-1786792591872-51f503";
const projectIds = ["project-1783243907480-ec7d8c", "project-1783068059197-798d26", "project-1782674551414-146f62", "project-default"];
const exportData = JSON.parse(await readFile("/Users/vl/Downloads/gate-4.json", "utf8"));
const fourProjects = JSON.parse(await readFile("/tmp/guru-g4-four-projects-v523.json", "utf8"));
const origin = fourProjects.origins.find((row) => row.origin === "http://localhost:3000");
const fixtures = projectIds.map((id) => {
  const workspace = structuredClone(origin.entries[`guru-platform-workspace-v02-${id}`]);
  if (!workspace?.project) throw new Error(`Нет данных проекта ${id}`);
  if (id === projectIds[0]) Object.assign(workspace, structuredClone(exportData.content));
  return { id, name: workspace.project.name, workspace };
});
const assert = (ok, text) => { if (!ok) throw new Error(text); };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hash = (value) => createHash("sha256").update(value).digest("hex");
const artifacts = new URL("../artifacts/", import.meta.url);
await mkdir(artifacts, { recursive: true });

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.pending = new Map();
    this.id = 0;
    this.errors = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      if (message.method === "Runtime.exceptionThrown") this.errors.push(message.params.exceptionDetails.text);
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
      const id = ++this.id;
      const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 60000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const version = await (await fetch(`http://localhost:${port}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call("Target.createBrowserContext");
let page;
try {
  const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
  const target = (await (await fetch(`http://localhost:${port}/json`)).json()).find((row) => row.id === targetId);
  page = new Cdp(target.webSocketDebuggerUrl);
  const evaluate = async (expression) => {
    const result = await page.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression) => {
    for (let i = 0; i < 200; i++) { if (await evaluate(`Boolean(${expression})`)) return; await pause(100); }
    throw new Error(`Timeout: ${expression}`);
  };
  const screenshot = async (name, selector, height = 0) => {
    const clip = await evaluate(`(async()=>{const el=document.querySelector(${JSON.stringify(selector)});if(!el)throw Error('Нет блока ${name}');el.scrollIntoView({block:'start',behavior:'instant'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const r=el.getBoundingClientRect();return{x:Math.max(0,r.left+scrollX-8),y:Math.max(0,r.top+scrollY-8),width:r.width+16,height:${height}?Math.min(r.height+16,${height}):r.height+16,scale:1}})()`);
    const result = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip });
    await writeFile(new URL(name, artifacts), Buffer.from(result.data, "base64"));
  };
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1500, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    localStorage.setItem('guru-platform-access-v01','unlocked');
    const nativeFetch=window.fetch.bind(window);
    window.fetch=(input,init)=>String(input).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,isolated:true}),{status:200,headers:{'Content-Type':'application/json'}})):nativeFetch(input,init);
  }` });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof g4RsyaLaunchBodyV453 === "function"');
  const initialized = await evaluate(`(() => {
    scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
    const workspace=${JSON.stringify(fixtures[0].workspace)};
    state=workspace;state.project.id='isolated-v541';activeProjectId=state.project.id;activeView='gate';activeGateId='gate-4';
    els.launcher.hidden=true;els.appShell.hidden=false;updateProjectChrome();guruV194Ensure(state);
    const pid=${JSON.stringify(productId)},product=guruV194Product(pid,state),ui=guruV194Ui(state);
    ui.selectedCategoryId=product.categoryId;ui.selectedProductId=pid;ensureGate4Production().launchProduct=pid;
    const channel=g4LaunchChannels().find(g4IsYandexRsyaChannel),searchChannel=g4LaunchChannels().find(g4IsYandexSearchChannel);
    const d=ensureGate4RsyaV289(pid),campaign=g4RsyaCampaignV289(pid,channel.key);
    g4RsyaMigrateStrategyV531(campaign,d);g4RsyaMigrateStartMethodV532(d);g4RsyaCampaignUtmTemplateV478(campaign);
    d.ui.workflowStepOpenV453={...d.ui.workflowStepOpenV453,groups:false,launch:true};
    const search=state.gate4SearchBuild?.[normalizeAspectKey(pid)];
    const searchHtml=search?g4sbV406LaunchBodyHtml(pid,search,g4sbV407LaunchModel(pid,search),searchChannel,g4RsyaCampaignV289(pid,searchChannel.key)):'';
    window.__smoke={pid,d,campaign,channel,searchChannel,searchHtml,
      before:JSON.stringify({campaign:d.campaign,groups:d.groups,common:campaign,search:state.gate4SearchBuild}),
      render(){els.contentArea.innerHTML=g4RsyaChannelCardV289(channel,campaign,0,pid);els.pageTitle.textContent='Яндекс Директ / РСЯ · '+product.name;}
    };
    guruPersistStateFast=()=>true;saveState=()=>true;flashSaving=()=>{};guruScheduleUiPreferenceSave=()=>{};
    renderGate=()=>window.__smoke.render();window.__smoke.render();
    return {groups:d.groups.length,ads:d.groups.reduce((n,g)=>n+(g.ads||[]).length,0),keys:Object.keys(d.campaign).length,searchHash:searchHtml.length};
  })()`);
  const inspect = await evaluate(`(() => {
    const s=window.__smoke,body=document.querySelector('[data-g4rsya-launch-body]');
    const campaign=body.querySelector('.g4-rsya-launch-campaign-v541');
    const actions=[...body.querySelectorAll('[data-g4rsya-launch-action]')].map(e=>({kind:e.dataset.g4rsyaLaunchAction,label:e.querySelector('.g4-rsya-launch-group-row-title-v537 strong,.g4-rsya-direct-label-v533')?.textContent.trim()||'',copies:e.querySelectorAll('[data-g4rsya-v289-copy]').length}));
    const bad=actions.filter(a=>(a.kind==='ВЫБРАТЬ'||a.kind==='ПРОПУСТИТЬ')&&a.copies);
    const budget=body.querySelector('.g4-rsya-direct-row-v533 .g4-rsya-direct-label-v533');
    const direct=body.querySelector('[data-g4rsya-direct-v533]');
    return {head:body.querySelector('.g4-v407-launch-context').textContent.trim(),stepMeta:document.querySelector('[data-g4rsya-v453-step-meta="launch"]')?.textContent.trim(),campaignRows:[...campaign.querySelectorAll(':scope > .g4-v406-launch-items > [data-g4rsya-launch-group-row]')].map(e=>e.querySelector('strong')?.textContent.trim()),groups:body.querySelectorAll('[data-g4rsya-launch-group-level]').length,ads:body.querySelectorAll('[data-g4rsya-launch-ad]').length,oldSettings:!!body.querySelector('[data-g4rsya-campaign-settings]'),oldPreparation:!!body.querySelector('.g4-rsya-preparation-v289'),afterlaunch:!!body.querySelector('.g4-rsya-afterlaunch-v532'),cleaning:body.textContent.includes('Когда добавлять после запуска'),scheduleBlocks:g4RsyaCampaignIssuesV289(s.campaign,s.d,s.pid).some(v=>v.startsWith('Расписание:')),geoInputs:body.querySelectorAll('[data-g4rsya-v289-store="campaign"][data-g4rsya-v289-field="geography"]').length,utmInputs:body.querySelectorAll('[data-g4rsya-v289-store="campaignCommon"][data-g4rsya-v289-field="utmTemplate"]').length,nameInputs:body.querySelectorAll('[data-g4rsya-v289-store="campaignCommon"][data-g4rsya-v289-field="campaignName"]').length,bad,actions,directRows:[...direct.querySelectorAll('.g4-rsya-direct-row-v533')].map(e=>[e.querySelector('.g4-rsya-direct-label-v533')?.textContent.trim(),e.dataset.g4rsyaLaunchAction])};
  })()`);
  assert(initialized.groups === 3 && initialized.ads === 3, "Экспорт Козы: ожидались 3 группы и 3 объявления");
  assert(inspect.groups === 3 && inspect.ads === 3, "Число групп/объявлений в UI изменилось");
  assert(!inspect.oldSettings && !inspect.oldPreparation && !inspect.afterlaunch && !inspect.cleaning, "Старые блоки всё ещё видны");
  assert(inspect.stepMeta?.endsWith("из 4") && !inspect.scheduleBlocks, "Скрытые чекбоксы или расписание всё ещё блокируют прогресс");
  assert(inspect.geoInputs === 1 && inspect.utmInputs === 1 && inspect.nameInputs === 1, "Повторный ввод кампании");
  assert(inspect.bad.length === 0, `Копирование на ВЫБРАТЬ/ПРОПУСТИТЬ: ${JSON.stringify(inspect.bad)}`);
  await screenshot("gate4-rsya-launch-v541-header.png", ".g4-rsya-launch-v528 .g4-v407-launch-context");
  await screenshot("gate4-rsya-launch-v541-campaign-top.png", ".g4-rsya-launch-campaign-v541", 1850);
  await screenshot("gate4-rsya-launch-v541-strategy.png", "[data-g4rsya-direct-v533]", 2500);
  await screenshot("gate4-rsya-launch-v541-campaign-bottom.png", ".g4-rsya-launch-campaign-v541", 4000);
  const copied = await evaluate(`(async()=>{
    const s=window.__smoke,body=document.querySelector('[data-g4rsya-launch-body]');
    let copied='';Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async v=>{copied=v},readText:async()=>copied}});
    const rows=[...body.querySelectorAll('.g4-rsya-direct-row-v533')];
    const budget=rows.find(e=>e.querySelector('.g4-rsya-direct-label-v533')?.textContent.includes('Бюджет'));
    const price=body.querySelector('.g4-rsya-direct-goal-price-v534 [data-g4rsya-v289-copy]');
    if(!budget?.querySelector('[data-g4rsya-v289-copy]')||!price)return{budget:'',price:''};
    budget.querySelector('[data-g4rsya-v289-copy]').click();await new Promise(r=>setTimeout(r,50));const budgetCopied=copied;
    const test=document.createElement('input');test.value=await navigator.clipboard.readText();body.append(test);const pastedBudget=test.value;test.remove();
    price.click();await new Promise(r=>setTimeout(r,50));test.value=await navigator.clipboard.readText();body.append(test);const pastedPrice=test.value;test.remove();
    return{budget:budgetCopied,price:copied,pastedBudget,pastedPrice};
  })()`);
  assert(/^\d+(?:\.\d+)?$/.test(copied.budget) && /^\d+(?:\.\d+)?$/.test(copied.price), `Деньги скопированы с форматированием: ${JSON.stringify(copied)}`);
  assert(copied.budget === copied.pastedBudget && copied.price === copied.pastedPrice, "Вставка чисел не совпала с копированием");
  const placements = await evaluate(`(async()=>{const button=document.querySelector('[data-g4rsya-exclusions-copy-v541]');button.click();await new Promise(r=>setTimeout(r,50));const input=document.createElement('input');input.value=await navigator.clipboard.readText();document.body.append(input);const result={count:input.value.split(',').length,first:input.value.split(',')[0],same:input.value===button.dataset.g4rsyaV289Copy};input.remove();return result})()`);
  assert(placements.count >= 54 && placements.same, `Список площадок скопирован неверно: ${JSON.stringify(placements)}`);
  const opened = await evaluate(`(() => {const s=window.__smoke;const key=g4RsyaLaunchGroupKeyV528(s.d.groups[0]);s.d.ui.launchGroupOpenV528={...s.d.ui.launchGroupOpenV528,[key]:true};s.render();return {key,group:!!document.querySelector('.g4-rsya-launch-group-v537'),ad:!!document.querySelector('.g4-rsya-launch-ad-v537')}})()`);
  assert(opened.group && opened.ad, "Группа/объявление не раскрылись");
  await screenshot("gate4-rsya-launch-v541-group-context.png", ".g4-rsya-launch-v528 .g4-v407-group-overview");
  await screenshot("gate4-rsya-launch-v541-group.png", ".g4-v444-launch-group-level:not(.is-collapsed)", 2200);
  await screenshot("gate4-rsya-launch-v541-ad.png", ".g4-rsya-launch-ad-v537");
  const preserved = await evaluate(`(() => {const s=window.__smoke;const now=JSON.stringify({campaign:s.d.campaign,groups:s.d.groups,common:s.campaign,search:state.gate4SearchBuild});const search=state.gate4SearchBuild?.[normalizeAspectKey(s.pid)];const html=search?g4sbV406LaunchBodyHtml(s.pid,search,g4sbV407LaunchModel(s.pid,search),s.searchChannel,g4RsyaCampaignV289(s.pid,s.searchChannel.key)):'';return{sameData:s.before===now,searchSame:s.searchHtml===html,groups:s.d.groups.length,ads:s.d.groups.reduce((n,g)=>n+(g.ads||[]).length,0),campaignKeys:Object.keys(s.d.campaign).length}})()`);
  assert(preserved.sameData && preserved.searchSame, "Рендер изменил данные РСЯ или Search");
  const edits = await evaluate(`(() => {const s=window.__smoke,body=document.querySelector('[data-g4rsya-launch-body]');const set=(store,field,value)=>{const input=body.querySelector('[data-g4rsya-v289-store="'+store+'"][data-g4rsya-v289-field="'+field+'"]');input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}))};set('campaign','geography','Москва и область');set('campaign','launchDateV541','2026-10-12');set('campaignCommon','utmTemplate','utm_source=yandex&utm_medium=cpc');set('campaignCommon','campaignName','РСЯ · Тест');return{geography:s.d.campaign.geography,date:s.d.campaign.launchDateV541,utm:g4RsyaCampaignV289(s.pid,s.channel.key).utmTemplate,name:g4RsyaCampaignV289(s.pid,s.channel.key).campaignName}})()`);
  assert(edits.geography === "Москва и область" && edits.date === "2026-10-12" && edits.utm === "utm_source=yandex&utm_medium=cpc" && edits.name === "РСЯ · Тест", `Единственные поля ввода не сохраняются: ${JSON.stringify(edits)}`);
  await evaluate(`(() => {const s=window.__smoke;s.d.ui.workflowStepOpenV453={...s.d.ui.workflowStepOpenV453,groups:true,launch:false};s.render()})()`);
  await screenshot("gate4-rsya-launch-v541-other-rsya.png", ".g4-rsya-v289", 900);
  await evaluate(`(() => {const s=window.__smoke;els.contentArea.innerHTML=g4sbSearchChannelCardHtml(s.searchChannel,g4RsyaCampaignV289(s.pid,s.searchChannel.key),0,s.pid)})()`);
  await screenshot("gate4-rsya-launch-v541-search-unchanged.png", ".g1-card:has(> [data-g4sb-step=\"launch\"])", 850);
  const alternatives = await evaluate(`(async()=>{
    const s=window.__smoke;state.projectComparison=state.projectComparison||{productsById:{}};state.projectComparison.productsById=state.projectComparison.productsById||{};
    state.projectComparison.productsById[s.pid]={competitors:[{id:'isolated-competitor',siteDomainV538:'magicmag.net'}]};
    s.d.campaign.promotion.type='скидка';s.d.campaign.promotion.description='Подарок';
    s.d.ui.workflowStepOpenV453={...s.d.ui.workflowStepOpenV453,groups:false,launch:true};s.render();
    const row=document.querySelector('[data-g4rsya-launch-group-row="10"]');
    const promo=document.querySelector('.g4-rsya-launch-campaign-v541 [data-g4rsya-launch-group-row="10"]');
    const first=g4RsyaLaunchCompetitorInterestsV538(s.pid);
    let copied='';Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async v=>{copied=v},readText:async()=>copied}});
    const domainButton=document.createElement('div');domainButton.innerHTML=first;const button=domainButton.querySelector('[data-g4rsya-v289-copy]');button&&await navigator.clipboard.writeText(button.dataset.g4rsyaV289Copy);
    return{promoAction:promo?.dataset.g4rsyaLaunchAction,promoCopy:promo?.querySelectorAll('[data-g4rsya-v289-copy]').length,domain:copied,source:!!document.querySelector('.g4-rsya-competitor-interests-v538')};
  })()`);
  assert(alternatives.promoAction === "ВСТАВИТЬ" && alternatives.promoCopy > 0 && alternatives.domain === "magicmag.net", "Ветви промоакции или домена конкурента не работают");
  await screenshot("gate4-rsya-launch-v541-promotion.png", ".g4-rsya-launch-campaign-v541 [data-g4rsya-launch-group-row=\"10\"]");
  const projects = fixtures.map(({ id, name, workspace }) => ({ id, name, rsyaProducts: Object.keys(workspace.gate4Rsya || {}).length }));
  console.log(JSON.stringify({ ok: true, initialized, inspect: { ...inspect, actions: inspect.actions.length }, copied, placements, preserved, edits, alternatives, projects, errors: page.errors }, null, 2));
  assert(page.errors.length === 0, "Ошибка браузера");
} finally {
  page?.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
