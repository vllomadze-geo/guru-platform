import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const sourcePath = process.env.GURU_FOUR_PROJECTS_SOURCE || "/private/tmp/guru-g4-four-projects-v523.json";
const freshApplePath = process.env.GURU_APPLE_GATE4_SOURCE || "/Users/vl/Downloads/gate-4.json";
const gate1Path = process.env.GURU_APPLE_GATE1_SOURCE || "/Users/vl/Downloads/gate-1.json";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9341";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectIds = ["project-1783243907480-ec7d8c", "project-1783068059197-798d26", "project-1782674551414-146f62", "project-1782582860052-3a45cc"];
const goatId = "catalog-item-1786792591872-51f503";
const shirtId = "catalog-item-1786792591872-c8b1e9";
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.ready = new Promise((done, fail) => {
      this.socket.addEventListener("open", done, { once: true });
      this.socket.addEventListener("error", fail, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      const request = this.pending.get(message.id);
      if (!request) return;
      this.pending.delete(message.id);
      message.error ? request.fail(new Error(message.error.message)) : request.done(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((done, fail) => {
      const id = ++this.sequence;
      this.pending.set(id, { done, fail });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const sources = JSON.parse(await readFile(sourcePath, "utf8"));
const origin = sources.origins.find((row) => row.origin.includes("vercel.app"));
assert(origin, "Production-origin local copies are missing");
const freshExport = JSON.parse(await readFile(freshApplePath, "utf8"));
const fresh = freshExport.workspace || freshExport.content;
let gate1 = null;
try { const file = JSON.parse(await readFile(gate1Path, "utf8")); gate1 = file.workspace || file.content; } catch {}
const fixtures = projectIds.map((id) => {
  const workspace = structuredClone(origin.entries[`guru-platform-workspace-v02-${id}`]);
  assert(workspace?.project, `Actual workspace missing: ${id}`);
  if (id === projectIds[0]) {
    Object.assign(workspace.project, structuredClone(fresh.project));
    ["sharedEvidence", "gate4", "gate4Production", "gate4SearchBuild", "gate4Rsya", "demandV130"].forEach((key) => {
      if (fresh[key]) workspace[key] = structuredClone(fresh[key]);
    });
    if (gate1) ["painV130", "targetAudience"].forEach((key) => {
      if (gate1[key]) workspace[key] = structuredClone(gate1[key]);
    });
  }
  return { id, workspace };
});

const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
const target = (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()).find((row) => row.id === targetId);
const page = new Cdp(target.webSocketDebuggerUrl);
const errors = [];
page.socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
});
async function evaluate(expression) {
  const result = await page.call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression) {
  const started = Date.now();
  while (Date.now() - started < 20000) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((done) => setTimeout(done, 100));
  }
  throw new Error(`Timed out: ${expression}`);
}
async function screenshot(selector, name) {
  const clip = await evaluate(`(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    if (!node) throw new Error('Screenshot element missing');
    const box = node.getBoundingClientRect();
    return { x: Math.max(0, box.left + scrollX - 12), y: Math.max(0, box.top + scrollY - 12), width: box.width + 24, height: box.height + 24, scale: 1 };
  })()`);
  const result = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, fromSurface: true, clip });
  const path = resolve(`artifacts/${name}.png`);
  await writeFile(path, Buffer.from(result.data, "base64"));
  return path;
}

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1680, height: 1200, deviceScaleFactor: 1, mobile: false });
  await page.call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes('/api/')
      ? Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}), {status:200,headers:{'Content-Type':'application/json'}}))
      : nativeFetch(input, init);
  }` });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof g4FiveProductHtmlV523 === "function"');
  await evaluate(`(() => { rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce(); scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {}; return true; })()`);

  const report = { version: "gate4-five-a-v523", projects: [], screenshots: {}, hidden: ["Баннеры / видео (две карточки)", "Яндекс Директ / Мастер кампаний и его креативы", "Карточка товара", "Сравнение с конкурентами", "FAQ", "Квизы / тесты", "CTA", "Формы / корзина", "CRM и обработка лидов"], errors };
  for (const fixture of fixtures) {
    const checks = await evaluate(`(() => {
      state = migrateWorkspace(${JSON.stringify(fixture.workspace)}, ${JSON.stringify(fixture.id)});
      activeProjectId = ${JSON.stringify(fixture.id)};
      activeView = 'gate'; activeGateId = 'gate-4';
      els.launcher.hidden = true; els.appShell.hidden = false;
      const products = g4ProductPickProducts();
      const selected = products.find((item) => item.id === ${JSON.stringify(goatId)}) || products[0] || null;
      if (selected) { const ui = guruV194Ui(state); ui.selectedProductId = selected.id; ui.selectedCategoryId = selected.categoryId || '__uncategorized__'; }
      __g4FivePrevProductionHtmlV523();
      const exactBefore = JSON.stringify(state);
      const oldCompany = g4FiveReadViewV523(() => g4SmmStrategyHtmlV298(g4ProductPickProducts()[0] || null));
      const oldProtected = g4FiveReadViewV523(() => {
        const channels = g4LaunchChannels(); const campaigns = g4EnsureLaunchCampaigns();
        return selected ? channels.filter((row) => !g4FiveChannelExcludedV523(row) && (g4IsYandexRsyaChannel(row) || g4IsYandexSearchChannel(row)))
          .map((row) => ({key:row.key, html:g4CampaignRowHtml(row, campaigns[g4CampaignStateKey(selected.id,row.key)],0,selected.id)})) : [];
      });
      const html = gate4ProductionHtml();
      const unchanged = exactBefore === JSON.stringify(state);
      els.contentArea.innerHTML = html;
      const normalize = (html) => { const node=document.createElement('template'); node.innerHTML=html; return node.innerHTML; };
      const company = document.querySelector('[data-g4five-company-v523]');
      const product = document.querySelector('[data-g4five-product-v523]');
      const protectedEqual = oldProtected.every(({key,html}) => {
        const host = [...document.querySelectorAll('.g4five-protected-v523')].find((row) => row.dataset.g4fiveChannelV523 === key);
        return host && normalize(html) === host.innerHTML;
      });
      const companyEqual = normalize(oldCompany) === company.querySelector('[data-g4-smm-strategy-v298]')?.outerHTML;
      const hiddenTitles = ['Баннеры / видео','Яндекс Директ / Мастер кампаний','Карточка товара','Сравнение с конкурентами','FAQ','Квизы / тесты','CTA','Формы / корзина','CRM и обработка лидов'];
      const visibleTitles = [...document.querySelectorAll('.g4five-tool-list-v523 > *')].map((row) => row.querySelector('.g1-card-title')?.textContent || '');
      return {
        id:state.project.id,name:state.project.name,products:products.length,selected:selected?.id,
        unchanged,protectedEqual,companyEqual,
        companyStages:[...company.querySelectorAll('.g4five-stage-v523 > header h3')].map((node)=>node.textContent),
        productStages:product ? [...product.querySelectorAll('.g4five-stage-v523 > header h3')].map((node)=>node.textContent):[],
        preparationCards:product?.querySelectorAll('[data-g4five-preparation-v523] [data-g4-readiness-card]').length || 0,
        stageReadiness:document.querySelectorAll('.g4five-stage-v523 [data-g4-readiness-card]').length,
        hiddenPresent:visibleTitles.filter((title)=>hiddenTitles.some((hidden)=>title===hidden)),
        outsidePresent:Boolean(document.querySelector('.g4-map-outside-v290')),
        referral:company.querySelector('[data-g4five-tool-v523="referral"]')?.dataset.g4fiveInstanceV523,
        productGallery:product?.querySelector('[data-g4five-tool-v523="product_gallery"]')?.textContent || '',
        companyServiceCount:company.querySelectorAll('.g4five-card-v523 .g4five-service-v523').length,
        emptyFieldBackground:getComputedStyle(company.querySelector('[data-g4five-service-input-v523]')).backgroundColor,
        emptyFieldBorder:getComputedStyle(company.querySelector('[data-g4five-service-input-v523]')).borderColor,
        emptyChoose:[...document.querySelectorAll('.g4five-card-v523 select, .g4five-linked-tool-v523 select, .g4five-preparation-v523 select')]
          .filter((select)=>!select.closest('.g4five-protected-v523') && !select.value && /выбрать|выберите/i.test(select.selectedOptions[0]?.textContent || '')).length,
        retargetMoved:!product || Boolean(product.querySelector('[data-g4-map-stage-v290="act"] [data-g4-map-instance-v290="g3-5a-advocate-retargeting"]')),
        companyData:JSON.stringify({strategy:state.gate4SmmStrategyV298,content:state.gate4SmmContentV299}),
        sourceCounts:{campaigns:Object.keys(state.gate4Production?.campaigns || {}).length,implementations:state.gate4?.implementations?.length || 0},
      };
    })()`);
    assert(checks.unchanged, `${checks.name}: rendering mutated workspace`);
    assert(checks.protectedEqual && checks.companyEqual, `${checks.name}: protected component changed`);
    assert(checks.companyStages.length === 5, `${checks.name}: company stages missing`);
    assert(!checks.hiddenPresent.length && !checks.outsidePresent, `${checks.name}: hidden card remains`);
    assert(checks.stageReadiness === 0 && (!checks.selected || checks.preparationCards === 20), `${checks.name}: readiness placement incorrect (${checks.preparationCards})`);
    assert(checks.referral === "g3-5a-advocate-referral", `${checks.name}: referral identity lost`);
    assert(checks.emptyChoose === 0 && checks.emptyFieldBackground === 'rgb(255, 255, 255)', `${checks.name}: new empty field is colored or has empty Choose`);
    assert(!/255, 178|255, 0|198, 40|180, 50/.test(checks.emptyFieldBorder), `${checks.name}: new empty field has a red border`);
    if (checks.selected) assert(checks.productStages.length === 5, `${checks.name}: product stages missing`);
    report.projects.push({ ...checks, companyData: hash(checks.companyData) });
    console.log(`${checks.name}: ${checks.products} products, protected components and source data unchanged`);

    if (fixture.id !== projectIds[0]) continue;
    assert(checks.selected === goatId && checks.productGallery.includes("Нет реализации") && checks.productGallery.includes("товарный фид"), "Goat/gallery acceptance failed");
    report.screenshots.company = await screenshot('[data-g4five-company-v523]', 'gate4-five-a-company-v523');
    report.screenshots.goat = await screenshot('[data-g4five-product-v523]', 'gate4-five-a-goat-v523');
    report.screenshots.gallery = await screenshot('[data-g4five-tool-v523="product_gallery"]', 'gate4-product-gallery-v523');
    await evaluate(`document.querySelector('[data-g4-smm-strategy-v298]').classList.remove('is-collapsed'); document.querySelector('.g4-product-smm-v523').classList.remove('is-collapsed'); true`);
    report.screenshots.companySmm = await screenshot('[data-g4-smm-strategy-v298]', 'gate4-smm-company-v523');
    report.screenshots.productSmm = await screenshot('.g4-product-smm-v523', 'gate4-smm-product-v523');

    const switching = await evaluate(`(() => {
      const beforeCompany = document.querySelector('[data-g4five-company-v523]').outerHTML;
      const originalCompanyData = JSON.stringify({strategy:state.gate4SmmStrategyV298,content:state.gate4SmmContentV299});
      const sourceBefore = JSON.stringify({rsya:state.gate4Rsya,search:state.gate4SearchBuild,readiness:state.gate4Production?.readinessV225,campaigns:state.gate4Production?.campaigns});
      const otherGates = JSON.stringify(state.gates.filter((gate)=>gate.id!=='gate-4'));
      const goat = g4ProductPickProducts().find((row)=>row.id===${JSON.stringify(goatId)});
      const shirt = g4ProductPickProducts().find((row)=>row.id===${JSON.stringify(shirtId)});
      if (!shirt) throw new Error('Second actual product missing');
      const rsyaChannel = g4FiveReadViewV523(()=>g4LaunchChannels().find(g4IsYandexRsyaChannel));
      const goatPayload=JSON.stringify(state.gate4Production.campaigns[g4CampaignStateKey(goat.id,rsyaChannel.key)] || {});
      const shirtPayload=JSON.stringify(state.gate4Production.campaigns[g4CampaignStateKey(shirt.id,rsyaChannel.key)] || {});
      const companyBefore = g4FiveReadViewV523(g4FiveCompanyHtmlV523);
      const ui=guruV194Ui(state); ui.selectedProductId=shirt.id; ui.selectedCategoryId=shirt.categoryId;
      const html=gate4ProductionHtml(); els.contentArea.innerHTML=html;
      const companyAfter=g4FiveReadViewV523(g4FiveCompanyHtmlV523);
      return {companySame:companyBefore===companyAfter,companyDataSame:originalCompanyData===JSON.stringify({strategy:state.gate4SmmStrategyV298,content:state.gate4SmmContentV299}),protectedDataSame:sourceBefore===JSON.stringify({rsya:state.gate4Rsya,search:state.gate4SearchBuild,readiness:state.gate4Production?.readinessV225,campaigns:state.gate4Production?.campaigns}),otherGatesSame:otherGates===JSON.stringify(state.gates.filter((gate)=>gate.id!=='gate-4')),differentPayload:goatPayload!==shirtPayload,selected:document.querySelector('[data-g4five-product-v523]')?.dataset.g4fiveProductV523,shirtName:shirt.name};
    })()`);
    assert(switching.companySame && switching.companyDataSame && switching.protectedDataSame && switching.otherGatesSame, "Product switch affected protected/company/other-gate state");
    assert(switching.differentPayload && switching.selected === shirtId, "Product views do not use distinct product_id payloads");
    report.productSwitch = switching;
    report.screenshots.shirt = await screenshot('[data-g4five-product-v523]', 'gate4-five-a-shirt-v523');

    const exclusions = await evaluate(`(() => {
      const original = state;
      state=structuredClone(original);
      try {
        const marketing=g3Gate0Marketing();
        marketing.channels.forEach((row)=>{ if (/яндекс.*директ|google.*ads|vk.*(?:ads|таргет)|seo/i.test(g4FiveChannelTextV523(row))) row.status='not_needed'; });
        const html=gate4ProductionHtml(); const node=document.createElement('template'); node.innerHTML=html;
        const product=node.content.querySelector('[data-g4five-product-v523]');
        const forbidden=['rsya','display','vk_target','yandex_search','google_search','product_gallery','seo','vk_retargeting','buyer_retargeting'];
        return {remaining:forbidden.filter((id)=>product.querySelector('[data-g4five-tool-v523="'+id+'"]')),originalUntouched:true};
      } finally {state=original;}
    })()`);
    assert(!exclusions.remaining.length, `Gate0 excluded channels remain: ${exclusions.remaining.join(',')}`);
    report.gate0Exclusions = exclusions;
  }
  assert(!errors.length, `Browser exceptions: ${errors.join('; ')}`);
  await writeFile(resolve("artifacts/gate4-five-a-audit-v523.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ projects: report.projects.map(({name,unchanged,protectedEqual,companyEqual,preparationCards})=>({name,unchanged,protectedEqual,companyEqual,preparationCards})), productSwitch: report.productSwitch, screenshots: report.screenshots }, null, 2));
} finally {
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  page.close(); browser.close();
}
