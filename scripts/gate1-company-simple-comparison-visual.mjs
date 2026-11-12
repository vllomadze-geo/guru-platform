import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

const mode = process.argv[2] || 'after';
const appUrl = process.env.GURU_VISUAL_URL || 'http://127.0.0.1:9531/';
const folder = 'artifacts/company-simple-comparison';
mkdirSync(folder, { recursive: true });
const raw = JSON.parse(readFileSync('/private/tmp/guru-now-korich-workspace.json'));
const source = raw.workspace || raw.content || raw;
const legacyStatus = readFileSync('artifacts/company-demand-comparison/baseline-company-status.js', 'utf8');

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data), task = this.pending.get(message.id);
      if (!task) return;
      this.pending.delete(message.id); clearTimeout(task.timer);
      if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id, timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 60000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const version = await (await fetch('http://127.0.0.1:9535/json/version')).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const tabs = await (await fetch('http://127.0.0.1:9535/json')).json();
const page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async expression => {
  const result = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
try {
  await page.call('Runtime.enable'); await page.call('Page.enable');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1880, height: 1200, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `const mem=new Map();Storage.prototype.getItem=function(k){return mem.get(String(k))??null};Storage.prototype.setItem=function(k,v){mem.set(String(k),String(v))};Storage.prototype.removeItem=function(k){mem.delete(String(k))};Storage.prototype.clear=function(){mem.clear()};const f=fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}))):f(u,i);` });
  await page.call('Page.navigate', { url: appUrl });
  const start = Date.now();
  while (!(await evaluate('document.readyState==="complete" && typeof projectComparisonHtml==="function"'))) {
    if (Date.now() - start > 30000) throw new Error('App load timeout');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};true');
  const layout = await evaluate(`(()=>{
    guruCancelDerivedRefresh();activeProjectId=${JSON.stringify(source.project.id)};
    state=guruExportWithoutPersistenceV223(()=>migrateWorkspace(${JSON.stringify(source)},${JSON.stringify(source.project.id)}));
    projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];
    updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;
    activeView='gate';activeGateId='gate-1';
    const phrases=g1CompanyComparisonGroups()[0].phrases;
    const sample=(id,name,domain,type,fields)=>({id,name,domain,siteDomainV538:domain,
      foundPhraseKeysV539:[phrases[0].key],
      classificationV539:{sameMarket:type==='neighbor'?'no':'yes',sameBusiness:type==='close'?'yes':'no'},
      typeV539:type==='close'?'direct':type==='far'?'substitute':'unrelated',
      bergenV543:{advertisements:name+' — подарки ручной работы\\nАвторские изделия и доставка по Москве',...fields},
      bergenMigratedV543:true,companyComparisonAdapted:true});
    state.projectComparison.competitors=[
      sample('compare-close','Мастерская Север','sever.example','close',{positioning:'Авторские подарки на заказ',strengths:'Своя мастерская',weaknesses:'Ограниченный ассортимент',takeaway:'Ясная подача изделий',differentiate:'Упор на персонализацию'}),
      sample('compare-far','Подарки Города','gorod.example','far',{positioning:'Быстрые подарки',strengths:'Широкий выбор',weaknesses:'Нет ручной работы',takeaway:'Удобный каталог',differentiate:'Ручное изготовление'}),
      sample('compare-neighbor','Витрина идей','vitrina.example','neighbor',{positioning:'Идеи для дома',strengths:'Хорошая выдача',weaknesses:'Другая задача клиента'})];
    state.projectComparison.open=true;state.projectComparison.ownColumnCollapsedV577=false;
    els.contentArea.innerHTML=projectComparisonHtml();
    const section=els.contentArea.querySelector('[data-g1bp-company]');
    section.scrollIntoView({block:'start',behavior:'instant'});
    const rect=section.getBoundingClientRect();
    return {x:Math.max(0,rect.left+scrollX),y:Math.max(0,rect.top+scrollY),width:Math.min(1800,rect.width),height:Math.min(5100,rect.height)};
  })()`);
  await page.call('Page.bringToFront');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1880, height: 1200, deviceScaleFactor: 1, mobile: false });
  const image = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...layout, scale: 1 } });
  writeFileSync(`${folder}/${mode}-comparison.png`, Buffer.from(image.data, 'base64'));
  if (mode === 'after') {
    for (const [name, selector] of [
      ['after-block', '[data-g1bp-company-compare]'],
      ['own-column', '.g1-company-compare-own'],
    ]) {
      const region=await evaluate(`(()=>{const rect=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:rect.x+scrollX,y:rect.y+scrollY,width:rect.width,height:rect.height}})()`);
      const shot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{...region,scale:1}});
      writeFileSync(`${folder}/${name}.png`,Buffer.from(shot.data,'base64'));
    }
    const checks = await evaluate(`(()=>{
      const grid=document.querySelector('[data-g1bp-company-compare]');
      const cols=[...grid.querySelectorAll('.g1-company-compare-column')];
      const labels=cols.map(col=>col.querySelector('header strong')?.textContent.trim());
      const neighbor=cols.at(-1),close=cols[1],far=cols[2];
      const before=JSON.stringify(state);
      projectComparisonHtml();projectComparisonStatus();
      const companyReadOnly=before===JSON.stringify(state);
      const product=projectComparisonProductHtml();
      const oldStatus=projectComparisonStatus();
      const input=close.querySelector('[data-g1bp-field-v543="positioning"]');
      input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));
      const blankStatus=projectComparisonStatus();
      input.value='Обновлённое позиционирование';input.dispatchEvent(new Event('input',{bubbles:true}));
      const filledStatus=projectComparisonStatus();
      return {labels,columns:cols.length,noHorizontalScroll:grid.scrollWidth<=grid.clientWidth,
        noOldSections:!/(Мини версия посадочной страницы|ЭТАП 1|ЭТАП 2|Ссылка на сайт целиком|не требуется)/.test(grid.textContent),
        ownReadOnly:!cols[0].querySelector('input,textarea'),
        directFields:[close,far].every(col=>!!col.querySelector('[data-g1bp-field-v543="takeaway"]')&&!!col.querySelector('[data-g1bp-field-v543="differentiate"]')),
        neighborFields:!neighbor.querySelector('[data-g1bp-field-v543="takeaway"],[data-g1bp-field-v543="differentiate"]'),
        optionalUncounted:JSON.stringify(oldStatus)===JSON.stringify(blankStatus)&&JSON.stringify(oldStatus)===JSON.stringify(filledStatus),
        optionalSaved:state.projectComparison.competitors[0].bergenV543.positioning==='Обновлённое позиционирование',
        companyReadOnly,productOldTable:product.includes('g1bp-table-v543')&&product.includes('Мини версия посадочной страницы')&&product.includes('Оффер / CTA')};
    })()`);
    assert.equal(checks.columns,4);assert(checks.noHorizontalScroll&&checks.noOldSections&&checks.ownReadOnly&&checks.directFields&&checks.neighborFields&&checks.optionalUncounted&&checks.optionalSaved&&checks.companyReadOnly&&checks.productOldTable,JSON.stringify(checks));
    const fieldRegion=await evaluate(`(()=>{const field=document.querySelector('[data-g1bp-company-column="compare-close"] [data-g1bp-field-v543="positioning"]');const rect=field.closest('.g1-company-compare-column').getBoundingClientRect();return {x:rect.x+scrollX,y:rect.y+scrollY,width:rect.width,height:Math.min(rect.height,660)}})()`);
    const fieldImage=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{...fieldRegion,scale:1}});
    writeFileSync(`${folder}/filled-field.png`,Buffer.from(fieldImage.data,'base64'));
    const productLayout = await evaluate(`(()=>{const holder=document.createElement('div');holder.innerHTML=projectComparisonProductHtml();document.body.append(holder);const section=holder.querySelector('.project-comparison');section.querySelector('.project-comparison-body').hidden=false;section.style.width='1450px';const rect=section.getBoundingClientRect();return {x:rect.x+scrollX,y:rect.y+scrollY,width:Math.min(1450,rect.width),height:Math.min(1050,rect.height)}})()`);
    const productImage = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { ...productLayout, scale: 1 } });
    writeFileSync(`${folder}/product-comparison.png`, Buffer.from(productImage.data, 'base64'));
    const productEdit=await evaluate(`(()=>{const section=document.querySelector('[data-g1bp-product-v543]');const field=section.querySelector('[data-g1bp-field-v543="marketSegment"]');if(!field)return {found:false};const target=g1BergenFindV543(field).competitor;const original=target.bergenV543.marketSegment;field.value='Проверка продуктового ввода';field.focus();field.dispatchEvent(new Event('input',{bubbles:true}));const result={found:true,saved:target.bergenV543.marketSegment==='Проверка продуктового ввода',focused:document.activeElement===field};target.bergenV543.marketSegment=original;return result})()`);
    assert(productEdit.found&&productEdit.saved&&productEdit.focused,JSON.stringify(productEdit));
    const panelSetup = await evaluate(`(()=>{
      for(const competitor of state.projectComparison.competitors)
        for(const key of ['positioning','strengths','weaknesses','takeaway','differentiate'])
          delete competitor.bergenV543[key];
      nowGuideRegistryCache=null;
      const comparison=nowGuideWithReadPass(()=>nowGuideBuildAllBlocks().find(item=>item.id==='project-comparison'));
      nowGuideReviewKey=comparison.key;nowGuideRender();
      return {status:projectComparisonStatus(),current:document.querySelector('.now-guide-block')?.textContent,
        nextEnabled:document.querySelector('[data-now-next]')?.classList.contains('is-ready'),
        missing:document.querySelector('.now-guide-missing')?.textContent};
    })()`);
    assert(panelSetup.nextEnabled,JSON.stringify(panelSetup));
    const sideLayout={x:0,y:0,width:300,height:920,scale:1};
    const afterPanel=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:sideLayout});
    writeFileSync(`${folder}/now-after.png`,Buffer.from(afterPanel.data,'base64'));
    await evaluate(`window.__currentProjectComparisonStatus=projectComparisonStatus;window.__legacyComparisonStatus=${legacyStatus.replace('function projectComparisonStatus','function')};projectComparisonStatus=__legacyComparisonStatus;nowGuideRegistryCache=null;nowGuideRender();true`);
    const beforePanel=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:sideLayout});
    writeFileSync(`${folder}/now-before.png`,Buffer.from(beforePanel.data,'base64'));
    const navigation=await evaluate(`(()=>{projectComparisonStatus=__currentProjectComparisonStatus;nowGuideRegistryCache=null;nowGuideRender();const button=document.querySelector('[data-now-next]');const before=nowGuideReviewKey;button.click();return {before,after:nowGuideReviewKey,advanced:before!==nowGuideReviewKey}})()`);
    assert(navigation.advanced,JSON.stringify(navigation));
    writeFileSync(`${folder}/visual-checks.json`,JSON.stringify(checks,null,2));
    console.log(JSON.stringify({mode,layout,checks,panelSetup,navigation}));
  } else {
    const scroll = await evaluate(`(()=>{const node=document.querySelector('[data-g1bp-company] .g1bp-scroll-v543');if(!node)return null;const rect=node.getBoundingClientRect();return {x:rect.x+scrollX,y:rect.y+scrollY,width:rect.width,height:Math.min(1050,rect.height),maxScroll:node.scrollWidth-node.clientWidth}})()`);
    if (scroll) for (const [name,position] of [['close',0],['far',Math.round(scroll.maxScroll/2)],['neighbor',scroll.maxScroll]]) {
      await evaluate(`(()=>{document.querySelector('[data-g1bp-company] .g1bp-scroll-v543').scrollLeft=${position};return true})()`);
      const shot=await page.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:scroll.x,y:scroll.y,width:scroll.width,height:scroll.height,scale:1}});
      writeFileSync(`${folder}/before-${name}.png`,Buffer.from(shot.data,'base64'));
    }
    console.log(JSON.stringify({mode,layout,scroll}));
  }
} finally {
  page.close(); await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {}); browser.close();
}
