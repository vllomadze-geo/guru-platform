import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:9530/';
const fixturePath = process.env.GURU_NOW_KORICH_FIXTURE || '/private/tmp/guru-now-korich-workspace.json';
const fixtureBytes = readFileSync(fixturePath);
const sourceHash = createHash('sha256').update(fixtureBytes).digest('hex');
const fixture = JSON.parse(fixtureBytes);
const output = process.env.GURU_SEO_URL_ARTIFACTS || 'artifacts/seo-url';
mkdirSync(output, { recursive: true });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map(); this.errors = [];
    this.ready = new Promise((resolve, reject) => { this.socket.addEventListener('open', resolve, { once: true }); this.socket.addEventListener('error', reject, { once: true }); });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') this.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      const task = this.pending.get(message.id); if (!task) return;
      this.pending.delete(message.id); clearTimeout(task.timer);
      if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id, timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
      this.pending.set(id, { resolve, reject, timer }); this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}
const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async expression => {
  const result = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async expression => {
  const start = Date.now();
  while (Date.now() - start < 30000) { if (await evaluate(expression)) return; await delay(100); }
  throw new Error(`Timeout: ${expression}`);
};
const screenshot = async name => {
  const image = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${output}/${name}.png`, Buffer.from(image.data, 'base64'));
};
const report = { sourceSha256: sourceHash, checks: {} };
try {
  await page.call('Page.enable'); await page.call('Runtime.enable'); await page.call('Page.bringToFront');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1100, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `{
    const nativeFetch=window.fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}),{status:200,headers:{'Content-Type':'application/json'}})):nativeFetch(u,i);
    const memory=new Map();window.__seoStorage=memory;Storage.prototype.getItem=function(k){return memory.get(String(k))??null};Storage.prototype.setItem=function(k,v){memory.set(String(k),String(v))};Storage.prototype.removeItem=function(k){memory.delete(String(k))};Storage.prototype.clear=function(){memory.clear()};
  }` });
  await page.call('Page.navigate', { url: appUrl });
  await waitFor('document.readyState==="complete"&&typeof megaPlatformSeoUrlFromName==="function"');
  report.checks.passiveView = await evaluate(`(()=>{
    rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
    state=${JSON.stringify(fixture.workspace || fixture)};activeProjectId=state.project.id;
    guruExportWithoutPersistenceV223(()=>{state=migrateWorkspace(state,activeProjectId)});
    projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];updateProjectChrome();
    activeView='gate';activeGateId='gate-0';guruRenderedGateId='gate-0';els.launcher.hidden=true;els.appShell.hidden=false;
    window.__seoCard=state.gates.find(g=>g.id==='gate-0').cards.find(isMegaMarketingCard);
    ensureMegaMarketing(window.__seoCard,state);guruCancelDerivedRefresh();guruDiscardUiPreferenceSave(activeProjectId);
    window.__seoRender=()=>{els.contentArea.innerHTML=megaPlatformSectionHtml(window.__seoCard.id,window.__seoCard.megaMarketing.platformV2)};
    const before=JSON.stringify(state);window.__seoRender();const same=before===JSON.stringify(state);
    renderGateNav({recalculate:false});return same;
  })()`);
  assert(report.checks.passiveView, 'Rendering must not save suggested URLs');

  report.calculation = await evaluate(`(()=>{
    const w={project:{productRegistryV185:[],catalogItemsV189:[]},gates:[{id:'gate-0',cards:[{...window.__seoCard,megaMarketing:{platformV2:{extra:[],urlsV1:{fixed:{home:'https://example.ru/shop/?from=test#top'},categories:{},products:{},custom:{}}}}}]}]};
    const names=['Летнее платье «Исландка»','Символ 2027 года «Коза»','Ёлка и щётка','Объём / Съёмка','Upcycling с кружевом','Е\\u0308лка'];
    const values=names.map(name=>megaPlatformSeoUrlFromName(name,'products','target',w));
    const store=megaPlatformUrlStore(w);w.project.catalogItemsV189=[{id:'old',name:'Товар'}];store.products.old='https://example.ru/letnee-plate-islandka/?utm_source=test#part';
    const duplicate=megaPlatformSeoUrlFromName(names[0],'products','target',w);
    delete store.fixed.home;const relative=megaPlatformSeoUrlFromName(names[0],'products','target',w);
    return{values,duplicate,relative,empty:megaPlatformSeoUrlFromName('','products','target',w),home:megaPlatformSeoUrlFromName('Главная страница','fixed','home',w)};
  })()`);
  assert.deepEqual(report.calculation.values, [
    'https://example.ru/letnee-plate-islandka', 'https://example.ru/simvol-2027-goda-koza',
    'https://example.ru/yolka-i-shchyotka', 'https://example.ru/obyom-syomka',
    'https://example.ru/upcycling-s-kruzhevom', 'https://example.ru/yolka',
  ]);
  assert.equal(report.calculation.duplicate, 'https://example.ru/letnee-plate-islandka-2');
  assert.equal(report.calculation.relative, '/letnee-plate-islandka');
  assert.equal(report.calculation.empty, ''); assert.equal(report.calculation.home, '');

  report.target = await evaluate(`(()=>{
    const input=[...document.querySelectorAll('[data-mega-url-group="products"]')].find(n=>!n.value.trim()&&n.dataset.megaUrlName.includes('Летнее платье'));
    if(!input)throw Error('Missing empty product URL');window.__seoTargetId=input.dataset.megaUrlId;window.__seoInput=input;
    const button=input.parentElement.querySelector('[data-mega-url-from-name]');input.scrollIntoView({block:'center',behavior:'instant'});button.focus();
    return{id:window.__seoTargetId,name:input.dataset.megaUrlName,buttonVisible:!button.hidden,home:megaPlatformUrl('fixed','home')};
  })()`);
  assert(report.target.buttonVisible); await screenshot('before');
  await page.call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' });
  await page.call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  report.generated = await evaluate(`(()=>{const input=window.__seoInput;return{value:input.value,stored:megaPlatformUrl('products',window.__seoTargetId),buttonHidden:input.parentElement.querySelector('button').hidden,focused:document.activeElement===input,caret:input.selectionStart}})()`);
  assert.equal(report.generated.value, 'https://k-apple.ru/letnee-plate-islandka');
  assert.equal(report.generated.stored, report.generated.value); assert(report.generated.buttonHidden && report.generated.focused);
  assert.equal(report.generated.caret, report.generated.value.length);
  await waitFor(`(()=>{const saved=JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX+activeProjectId)||'null');return saved&&megaPlatformUrl('products',window.__seoTargetId,saved)===window.__seoInput.value})()`);
  report.checks.autosave = true;
  await evaluate(`window.__seoInput.scrollIntoView({block:'center',behavior:'instant'})`); await screenshot('after');

  report.checks.replacedTable = await evaluate(`(()=>{
    window.__seoRender();const input=document.querySelector('[data-mega-url-group="products"][data-mega-url-id="'+window.__seoTargetId+'"]');
    const preserved=input.value==='https://k-apple.ru/letnee-plate-islandka';
    input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));const button=input.parentElement.querySelector('button');
    const offered=!button.hidden;button.click();const regenerated=input.value==='https://k-apple.ru/letnee-plate-islandka';
    input.value='https://k-apple.ru/custom-path?from=manual#detail';input.dispatchEvent(new Event('input',{bubbles:true}));button.click();
    const manual=megaPlatformUrl('products',window.__seoTargetId)==='https://k-apple.ru/custom-path?from=manual#detail';
    const name=input.closest('tr').querySelector('input[data-mega-platform-rename-product]');name.value='Новое название';name.dispatchEvent(new Event('input',{bubbles:true}));
    return{preserved,offered,regenerated,manual,renamePreserves:input.value==='https://k-apple.ru/custom-path?from=manual#detail'};
  })()`);
  assert(Object.values(report.checks.replacedTable).every(Boolean));

  report.checks.categoriesAndManualPages = await evaluate(`(()=>{
    const category={id:'seo-test-category',name:'Новая категория',manualOriginV2:true};state.project.productRegistryV185.push(category);
    const p=window.__seoCard.megaMarketing.platformV2;p.extra.push({id:'seo-test-page',name:'',group:'commercial',pageTypeV1:'landing'});window.__seoRender();
    const c=document.querySelector('[data-mega-url-group="categories"][data-mega-url-id="seo-test-category"]');c.parentElement.querySelector('button').click();
    const m=document.querySelector('[data-mega-url-group="custom"][data-mega-url-id="seo-test-page"]'),button=m.parentElement.querySelector('button');const hiddenWithoutName=button.hidden;
    const name=m.closest('tr').querySelector('input[data-mega-field="name"]');name.value='Страница Ёлка';name.dispatchEvent(new Event('input',{bubbles:true}));const offered=!button.hidden;button.click();
    const text=document.querySelector('input[data-mega-url-group="fixed"][data-mega-url-id="delivery"]');text.parentElement.querySelector('button').click();
    return{category:megaPlatformUrl('categories',category.id),hiddenWithoutName,offered,manual:megaPlatformUrl('custom','seo-test-page'),fixed:megaPlatformUrl('fixed','delivery')};
  })()`);
  assert.equal(report.checks.categoriesAndManualPages.category, 'https://k-apple.ru/novaya-kategoriya');
  assert(report.checks.categoriesAndManualPages.hiddenWithoutName && report.checks.categoriesAndManualPages.offered);
  assert.equal(report.checks.categoriesAndManualPages.manual, 'https://k-apple.ru/stranica-yolka');
  assert.equal(report.checks.categoriesAndManualPages.fixed, 'https://k-apple.ru/dostavka-i-oplata');
  assert.equal(createHash('sha256').update(readFileSync(fixturePath)).digest('hex'), sourceHash);
  assert.deepEqual(page.errors, []);
  report.build = await evaluate('GURU_BUILD_INFO.version'); report.errors = page.errors; report.passed = true;
  writeFileSync(`${output}/results.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2)); console.log('seo-url-transliteration-smoke: PASS');
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId }); page.close(); browser.close();
}
