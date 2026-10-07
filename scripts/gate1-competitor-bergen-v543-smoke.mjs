import { readFile, mkdir, writeFile } from "node:fs/promises";

const source = JSON.parse(await readFile(process.env.GURU_GATE1_EXPORT || "/Users/vl/Downloads/gate-1.json", "utf8"));
const fixture = JSON.parse(JSON.stringify({
  content: {
    project: source.content.project,
    projectComparison: source.content.projectComparison,
    painV130: source.content.painV130,
    unitV130: source.content.unitV130,
    unitEconomicsRoute: source.content.unitEconomicsRoute,
  },
  structure: source.structure,
}, (_key, value) => typeof value === "string" && value.startsWith("data:image/")
  ? "[image omitted for isolated test]" : value));
const productId = "catalog-item-1786792591872-51f503";
const layoutOnly = process.env.GURU_BERGEN_LAYOUT_ONLY === "1";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const port = process.env.GURU_CHROME_DEBUG_PORT || "9358";
const artifacts = new URL("../artifacts/", import.meta.url);
const assert = (condition, message) => { if (!condition) throw Error(message); };
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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
      message.error ? pending.reject(Error(message.error.message)) : pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => reject(Error(`CDP timeout: ${method}`)), 120000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const browserVersion = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(browserVersion.webSocketDebuggerUrl);
const { browserContextId } = await browser.call("Target.createBrowserContext");
let page;
try {
  const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
  const target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((row) => row.id === targetId);
  page = new Cdp(target.webSocketDebuggerUrl);
  const evaluate = async (expression) => {
    const result = await page.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const waitFor = async (expression) => {
    for (let attempt = 0; attempt < 300; attempt++) {
      if (await evaluate(`Boolean(${expression})`)) return;
      await pause(100);
    }
    throw Error(`Timed out waiting for ${expression}`);
  };
  const screenshot = async (name, selector, maxHeight = 0) => {
    const clip = await evaluate(`(async()=>{const n=document.querySelector(${JSON.stringify(selector)});if(!n)throw Error('Screenshot target missing');n.scrollIntoView({block:'start',behavior:'instant'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const b=n.getBoundingClientRect();return {x:Math.max(0,b.left+scrollX-8),y:Math.max(0,b.top+scrollY-8),width:b.width+16,height:${maxHeight} ? Math.min(b.height+16,${maxHeight}) : b.height+16,scale:1}})()`);
    const result = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip });
    await writeFile(new URL(name, artifacts), Buffer.from(result.data, "base64"));
  };
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1600, height: 1050, deviceScaleFactor: 1, mobile: false });
  await browser.call("Browser.grantPermissions", { permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"], origin: new URL(appUrl).origin, browserContextId });
  await page.call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    localStorage.setItem('guru-platform-access-v01','unlocked');
    const originalFetch=window.fetch.bind(window);
    window.fetch=(input,init)=>String(input).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,isolated:true}),{status:200,headers:{'Content-Type':'application/json'}})):originalFetch(input,init);
  }` });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof g1BergenMigrateV543 === "function"');
  const initialized = await evaluate(`(() => {
    scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
    state=createFreshWorkspace({id:'gate1-bergen-v543-smoke',name:'Изолированная Коза'});
    const imported=${JSON.stringify(fixture)};
    for(const [key,value] of Object.entries(imported.content))state[key]=structuredClone(value);
    state.gates[state.gates.findIndex(g=>g.id==='gate-1')]=structuredClone(imported.structure);
    const relations=megaPlatformCategoryStore(state);
    for(const item of state.project.catalogItemsV189||[])if(item.categoryId)relations.categoryIdsByProduct[item.id]=[item.categoryId];
    state.project.id='gate1-bergen-v543-smoke';activeProjectId=state.project.id;activeView='gate';activeGateId='gate-1';
    els.launcher.hidden=true;els.appShell.hidden=false;updateProjectChrome();guruV194Ensure(state);
    const pid=${JSON.stringify(productId)},product=guruV194Product(pid,state),ui=guruV194Ui(state);
    ui.selectedCategoryId=product.categoryId;ui.selectedProductId=pid;
    const entry=ensureProjectComparisonProduct(pid),competitor=entry.competitors[0],beforeIds=entry.competitors.map(c=>c.id);
    entry.open=true;
    const jtbds=g1BergenJtbdsV543(product);
    competitor.stepsV539={...competitor.stepsV539,3:{characteristics:'Старые характеристики'},4:{priceAnalog:'4 900 ₽'},9:{landingStructure:'Старая посадочная',cta:'Купить'},12:{takeaway:'Старый вывод',fixedDate:'01.10.2026',evidence:'https://example.test/proof'}};
    competitor.classificationV539={sameMarket:'yes',sameBusiness:'yes'};
    competitor.foundPhraseKeysV539=jtbds[0]?.top[0]?[jtbds[0].top[0].key]:[];
    window.__bergen={pid,product,entry,competitor,ref:competitor,beforeIds,old:JSON.stringify({id:competitor.id,steps:competitor.stepsV539,classification:competitor.classificationV539,foundPhraseKeys:competitor.foundPhraseKeysV539})};
    guruPersistStateFast=()=>true;saveState=()=>true;flashSaving=()=>{};guruScheduleUiPreferenceSave=()=>{};
    renderGate();
    return {beforeIds,afterIds:entry.competitors.map(c=>c.id),sameObject:entry.competitors[0]===competitor,jtbds:jtbds.map(j=>({id:j.id,primary:j.primary,count:j.top.length,frequencies:j.top.map(p=>p.frequency)})),afterRenderJtbds:g1BergenJtbdsV543(product).map(j=>({id:j.id,count:j.top.length})),mapCounts:(state.painV130?.productMaps||[]).map(m=>({demand:m.items?.[pid]?.demandRows?.length||0,extra:m.items?.[pid]?.semL4Model?.additionalJtbds?.length||0})),migrated:structuredClone(competitor.bergenV543),price:g1CompetitorContextV539(product).price.raw};
  })()`);
  await waitFor('document.querySelector(".g1bp-table-v543")');
  assert(initialized.sameObject && JSON.stringify(initialized.beforeIds)===JSON.stringify(initialized.afterIds), "Competitor object or ID changed");
  assert(initialized.jtbds.length===3 && initialized.jtbds.every(j=>j.count===5 && j.frequencies.every((n,i,a)=>i===0||a[i-1]>=n)) && initialized.afterRenderJtbds.length===3 && initialized.afterRenderJtbds.every(j=>j.count===5), "JTBD phrase ranking failed before/after render: "+JSON.stringify(initialized));
  assert(initialized.migrated.product.includes('Старые характеристики') && initialized.migrated.price==='4900' && initialized.migrated.offerCta.includes('Старая посадочная') && initialized.migrated.takeaway==='Старый вывод' && initialized.migrated.matchedJtbdIdsV543.includes(initialized.jtbds[0].id), "Migration failed: "+JSON.stringify(initialized.migrated));
  const copied = await evaluate(`(async()=>{const button=document.querySelector('.g1bp-phrase-strip-v543 [data-g1-competitor-copy-v539]');const text=button.dataset.g1CompetitorCopyV539;button.click();await new Promise(r=>setTimeout(r,80));const test=document.createElement('input');document.body.append(test);test.value=await navigator.clipboard.readText();const pasted=test.value;test.remove();return{text,pasted}})()`);
  assert(copied.text===copied.pasted, "Phrase copy/paste failed: "+JSON.stringify(copied));
  if (!layoutOnly) await screenshot('gate1-bergen-goat-phrases-v543.png','.g1bp-phrase-strip-v543');
  if (layoutOnly) {
    await screenshot('gate1-bergen-goat-context-v546.png','.g1bp-v543',1450);
    await screenshot('gate1-bergen-goat-table-one-v546.png','.g1bp-scroll-v543',1250);
  }
  const populated = await evaluate(`(() => {
    const s=window.__bergen,first=s.competitor;
    const name=document.querySelector('[data-g1bp-name-v543="'+first.id+'"]');name.value='magicmag.net';name.dispatchEvent(new Event('input',{bubbles:true}));name.dispatchEvent(new Event('change',{bubbles:true}));
    const domain=document.querySelector('[data-g1bp-domain-v543="'+first.id+'"]');domain.value='https://magicmag.net/shop/goat';domain.dispatchEvent(new Event('input',{bubbles:true}));domain.dispatchEvent(new Event('change',{bubbles:true}));
    document.querySelector('[data-g1bp-add-v543]').click();const second=s.entry.competitors[1];
    const name2=document.querySelector('[data-g1bp-name-v543="'+second.id+'"]');name2.value='Другой магазин';name2.dispatchEvent(new Event('input',{bubbles:true}));name2.dispatchEvent(new Event('change',{bubbles:true}));
    const domain2=document.querySelector('[data-g1bp-domain-v543="'+second.id+'"]');domain2.value='store.example';domain2.dispatchEvent(new Event('input',{bubbles:true}));domain2.dispatchEvent(new Event('change',{bubbles:true}));
    const id=g1BergenJtbdsV543(s.product)[0].id;
    const box=document.querySelector('[data-g1bp-jtbd-v543="'+id+'"][data-g1bp-competitor-v543="'+second.id+'"]');box.checked=true;box.dispatchEvent(new Event('change',{bubbles:true}));
    const no=document.querySelector('[data-g1bp-choice-v543="similarity"][data-g1bp-competitor-v543="'+second.id+'"][value="no"]');no.checked=true;no.dispatchEvent(new Event('change',{bubbles:true}));
    return {ids:s.entry.competitors.map(c=>c.id),sameOriginal:s.entry.competitors[0]===s.ref,types:s.entry.competitors.map(c=>g1BergenTypeV543(c,g1BergenJtbdsV543(s.product))),domains:s.entry.competitors.map(c=>[c.domain,c.siteDomainV538]),oldSame:JSON.stringify({id:first.id,steps:first.stepsV539,classification:first.classificationV539,foundPhraseKeys:first.foundPhraseKeysV539})===s.old};
  })()`);
  assert(populated.sameOriginal && populated.ids[0]===initialized.beforeIds[0] && populated.types.join(',')==='direct,substitute' && populated.domains[0][0]==='https://magicmag.net/shop/goat' && populated.domains[0][1]==='magicmag.net' && populated.oldSame, "Types, domain, IDs or old data failed: "+JSON.stringify(populated));
  const layout = await evaluate(`(() => {const table=document.querySelector('.g1bp-table-v543'),s=window.__bergen,second=s.entry.competitors[1],cells=[...document.querySelectorAll('[data-g1bp-cell-v543^="'+second.id+':"]')],disabled=cells.filter(c=>c.classList.contains('g1bp-not-required-v543')),head=[...table.tHead.rows[0].cells],jtbd=[...table.querySelectorAll('[data-g1bp-cell-v543^="'+s.competitor.id+':Задача (JTBD)"] label')],firstInput=table.querySelector('[data-g1bp-field-v543="product"]'),fieldCell=firstInput.closest('td'),questionRows=[...table.tBodies[0].querySelectorAll('tr[data-g1bp-row-v543]')],sectionRows=[...table.tBodies[0].querySelectorAll('tr.g1bp-stage-v543, tr.g1bp-group-v543')];return{columns:head.length,rows:table.tBodies[0].rows.length,phraseRows:document.querySelectorAll('.g1bp-phrase-v543').length,oldSteps:document.querySelectorAll('.g1-competitor-step-v539').length,oldTable:document.querySelectorAll('.g1ct-table-v540').length,disabled:disabled.length,allDisabled:disabled.every(c=>c.textContent.includes('не требуется')),stickyOwn:getComputedStyle(document.querySelector('.g1bp-own-v543')).position,headerWidths:head.map(c=>Math.round(c.getBoundingClientRect().width)),bodyCells:questionRows.every(r=>r.cells.length===head.length),alignedLabels:questionRows.every(r=>{const labels=[...r.cells].map(c=>c.querySelector('.g1bp-criterion-v545'));return labels.every(n=>n&&n.textContent===labels[0].textContent&&Math.abs(n.getBoundingClientRect().top-labels[0].getBoundingClientRect().top)<=1)}),repeatedSections:sectionRows.every(r=>r.cells.length===head.length&&[...r.cells].every(c=>c.textContent===r.cells[0].textContent)),addButtons:head.map((c,i)=>c.querySelector('[data-g1bp-add-v543]')?i:-1).filter(i=>i>=0),jtbdLabels:jtbd.map(n=>n.textContent.trim()),jtbdAlignment:jtbd.map(n=>({gap:Math.round(n.querySelector('span').getBoundingClientRect().left-n.querySelector('input').getBoundingClientRect().right),vertical:Math.round(Math.abs(n.querySelector('span').getBoundingClientRect().top-n.querySelector('input').getBoundingClientRect().top))})),ownJtbd:table.querySelector('[data-g1bp-row-v543="Задача (JTBD)"] .g1bp-own-v543').textContent,inputHeight:Math.round(firstInput.getBoundingClientRect().height),inputWidth:Math.round(firstInput.getBoundingClientRect().width),cellInnerWidth:Math.round(fieldCell.getBoundingClientRect().width-22),textAlign:getComputedStyle(fieldCell).textAlign}})()`);
  assert(layout.columns===3 && layout.phraseRows===15 && layout.oldSteps===0 && layout.oldTable===0 && layout.disabled>=14 && layout.allDisabled && layout.stickyOwn==='sticky' && layout.bodyCells && layout.alignedLabels && layout.repeatedSections && layout.addButtons.join(',')==='2' && layout.headerWidths.every(width=>Math.abs(width-480)<=1) && layout.jtbdLabels.join('|')==='№1 · основной|№2|№3' && layout.jtbdAlignment.every(n=>n.gap>=4&&n.gap<=10&&n.vertical<=4) && layout.ownJtbd.includes('№1 · основной —') && layout.ownJtbd.includes('№2 —') && layout.ownJtbd.includes('№3 —') && layout.inputHeight===40 && Math.abs(layout.inputWidth-(layout.cellInnerWidth-6))<=2 && layout.textAlign==='left', "Table layout failed: "+JSON.stringify(layout));
  if (layoutOnly) {
    await evaluate(`(() => {const sc=document.querySelector('.g1bp-scroll-v543');sc.style.maxHeight='none';sc.style.overflow='visible';sc.scrollTop=0;})()`);
    await screenshot('gate1-bergen-goat-table-guru-v546.png','.g1bp-table-v543');
  } else {
    await screenshot('gate1-bergen-goat-table-v543.png','.g1bp-v543',1350);
    await evaluate(`(() => {const sc=document.querySelector('.g1bp-scroll-v543');sc.scrollTop=0;})()`);
    await screenshot('gate1-bergen-goat-direct-v543.png','.g1bp-scroll-v543',1000);
    await evaluate(`(() => {const sc=document.querySelector('.g1bp-scroll-v543'),row=[...document.querySelectorAll('.g1bp-stage-v543')].find(n=>n.textContent.includes('ЭТАП 2'));sc.scrollTop+=row.getBoundingClientRect().top-sc.getBoundingClientRect().top-155;})()`);
    await screenshot('gate1-bergen-goat-substitute-v543.png','.g1bp-scroll-v543',950);
  }
  const horizontal = await evaluate(`(() => {for(let n=0;n<3;n++)document.querySelector('[data-g1bp-add-v543]').click();const sc=document.querySelector('.g1bp-scroll-v543');sc.scrollLeft=500;const box=sc.getBoundingClientRect(),own=document.querySelector('.g1bp-table-v543 .g1bp-own-v543').getBoundingClientRect();return{scrollable:sc.scrollWidth>sc.clientWidth,scrollLeft:sc.scrollLeft,ownLeft:Math.round(own.left-box.left),widths:[...document.querySelector('.g1bp-table-v543 thead tr').cells].map(c=>Math.round(c.getBoundingClientRect().width))}})()`);
  assert(horizontal.scrollable && horizontal.scrollLeft>0 && Math.abs(horizontal.ownLeft)<=2 && horizontal.widths.every(width=>Math.abs(width-horizontal.widths[0])<=1), "Horizontal scrolling or sticky column failed: "+JSON.stringify(horizontal));
  await page.call("Emulation.setDeviceMetricsOverride", { width: 700, height: 1050, deviceScaleFactor: 1, mobile: false });
  const narrow = await evaluate(`(() => {const sc=document.querySelector('.g1bp-scroll-v543');sc.scrollLeft=420;const box=sc.getBoundingClientRect(),head=[...document.querySelector('.g1bp-table-v543 thead tr').cells].map(c=>Math.round(c.getBoundingClientRect().width)),own=document.querySelector('.g1bp-table-v543 .g1bp-own-v543').getBoundingClientRect();return{widths:head,scrollable:sc.scrollWidth>sc.clientWidth,ownLeft:Math.round(own.left-box.left)}})()`);
  assert(narrow.scrollable && narrow.widths.every(width=>Math.abs(width-320)<=1) && Math.abs(narrow.ownLeft)<=2, "Narrow table layout failed: "+JSON.stringify(narrow));
  const live = await evaluate(`(() => {const s=window.__bergen,c=s.competitor,input=document.querySelector('[data-g1bp-field-v543="product"][data-g1bp-competitor-v543="'+c.id+'"]');input.value='Новый аналог';input.dispatchEvent(new Event('input',{bubbles:true}));const immediate=c.bergenV543.product;input.dispatchEvent(new Event('change',{bubbles:true}));return{immediate,after:c.bergenV543.product,id:c.id,old:s.old===JSON.stringify({id:c.id,steps:c.stepsV539,classification:c.classificationV539,foundPhraseKeys:c.foundPhraseKeysV539})}})()`);
  assert(live.immediate==='Новый аналог' && live.after===live.immediate && live.id===initialized.beforeIds[0] && live.old, "Live save changed legacy data: "+JSON.stringify(live));
  const deletion = await evaluate(`(() => {const s=window.__bergen,second=s.entry.competitors[1];window.confirm=()=>false;document.querySelector('[data-g1bp-delete-v543="'+second.id+'"]').click();const cancelled=s.entry.competitors.some(c=>c.id===second.id);window.confirm=()=>true;document.querySelector('[data-g1bp-delete-v543="'+second.id+'"]').click();return{cancelled,archived:s.entry.archivedCompetitorsV540.some(c=>c.id===second.id),firstId:s.entry.competitors[0].id,secondVisible:s.entry.competitors.some(c=>c.id===second.id)}})()`);
  assert(deletion.cancelled && deletion.archived && !deletion.secondVisible && deletion.firstId===initialized.beforeIds[0], "Delete/archive failed: "+JSON.stringify(deletion));
  console.log(JSON.stringify({ok:true,initialized,populated,layout,horizontal,narrow,copied,live,deletion,errors:page.errors},null,2));
  assert(page.errors.length===0, "Browser errors: "+JSON.stringify(page.errors));
} finally {
  page?.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
