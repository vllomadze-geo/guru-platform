import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const port=process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl=process.env.GURU_APP_URL || 'http://127.0.0.1:9531/';
const output='artifacts/demand-readiness';mkdirSync(output,{recursive:true});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const hash=s=>createHash('sha256').update(s).digest('hex');
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
      const id = ++this.id, timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 120000);
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
  await page.call('Page.bringToFront');
  const image = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${output}/${name}.png`, Buffer.from(image.data, 'base64'));
};

const files = [
  '/private/tmp/guru-now-korich-workspace.json',
  '/private/tmp/guru-step6-icleaning-workspace.json',
  '/private/tmp/guru-step6-sivrce-workspace.json',
  '/private/tmp/guru-step6-guru-workspace.json',
];
const legacy = readFileSync(output + '/baseline-completion.js', 'utf8');
const report = { projects: [] };
try {
  await page.call('Runtime.enable'); await page.call('Page.enable');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1200, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `
    const mem = new Map();
    Storage.prototype.getItem = function(k) { return mem.get(String(k)) ?? null; };
    Storage.prototype.setItem = function(k,v) { mem.set(String(k), String(v)); };
    Storage.prototype.removeItem = function(k) { mem.delete(String(k)); };
    const f = fetch.bind(window);
    window.fetch = (u,i) => String(u).includes('/api/') ? Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}))) : f(u,i);
  ` });
  await page.call('Page.navigate', { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof gate1CompanyBrandDemandImportIssuesV356 === "function"');
  await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};true');
  await evaluate(`window.__demandBefore = ${legacy}`);
  for (const file of files) {
    const bytes = readFileSync(file), raw = JSON.parse(bytes), source = raw.workspace || raw.content || raw;
    await evaluate(`(() => {
      guruCancelDerivedRefresh(); activeProjectId=${JSON.stringify(source.project.id)};
      state=guruExportWithoutPersistenceV223(()=>migrateWorkspace(${JSON.stringify(source)},activeProjectId));
      projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];
      activeView='gate';activeGateId='gate-1';nowGuideRegistryCache=null;
      window.__demandSnapshot = () => nowGuideWithReadPass(() => {
        nowGuideRegistryCache=null; guruGateReadinessCache=new Map();
        const all=nowGuideBuildAllBlocks(), path=nowGuidePreflightPath(all);
        const completion=gate1CompanyDemandPositioningCompletionV357(state);
        const gate=state.gates.find(g=>g.id==='gate-1');
        return {completion, progress:gate1CompanyDemandPositioningProgressV357(completion),
          status:all.find(i=>i.id==='company_demand_positioning').status,
          gate1:nowGuideLaunchReadiness(all.filter(i=>i.gateId==='gate-1')),
          navigation: guruGateReadiness(gate), launch:nowGuideLaunchReadiness(path),
          current:path.findIndex(i=>!['ready','not_required'].includes(i.status))+1,
          blocks:all.map(i=>[i.key,i.status])};
      });
      return true;
    })()`);
    const stateBefore = hash(await evaluate('JSON.stringify(state)'));
    const result = await evaluate(`(() => {
      const current=gate1CompanyDemandPositioningCompletionV357;
      let before;
      try {gate1CompanyDemandPositioningCompletionV357=__demandBefore;before=__demandSnapshot();}
      finally {gate1CompanyDemandPositioningCompletionV357=current;nowGuideRegistryCache=null;guruGateReadinessCache=new Map();}
      const after=__demandSnapshot(), html=gate1CompanySemanticsHtmlV264();
      return {before,after,serviceRows:gate1CompanyBrandDemandImportStateV356(state)?.unmatched?.length||0,
        visibleIssues:gate1CompanyBrandDemandImportIssuesV356(gate1CompanyBrandDemandImportStateV356(state)?.unmatched).length,
        addAfterRows:html.indexOf('data-company-demand-add-form')>html.indexOf('data-pv181-company-demand-rows-v345'),
        noServiceWarning:!html.includes('План кампании'),hasUnmatchedUi:html.includes('data-pv181-company-demand-unmatched-v356')};
    })()`);
    const stateAfter = hash(await evaluate('JSON.stringify(state)'));
    assert.equal(stateAfter, stateBefore, 'Reading changed ' + source.project.name);
    assert(result.addAfterRows && result.noServiceWarning);
    assert.equal(result.after.status, result.after.completion.status);
    assert.equal(result.after.gate1.total, result.after.navigation.total);
    assert.equal(result.after.gate1.done, result.after.navigation.done);
    assert.equal(result.after.gate1.percent, result.after.navigation.percent);
    assert.deepEqual(result.after.blocks.filter(([key])=>!key.endsWith(':company_demand_positioning')),
      result.before.blocks.filter(([key])=>!key.endsWith(':company_demand_positioning')),'Other readiness changed');
    assert.equal(hash(readFileSync(file)),hash(bytes));
    report.projects.push({ project:source.project.name,file,fileHash:hash(bytes),stateBefore,stateAfter,...result });
    console.log(source.project.name+': PASS');
    if (file !== files[0]) continue;
    await evaluate(`(() => {updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;
      const item=nowGuideWithReadPass(()=>nowGuideBuildAllBlocks()).find(i=>i.id==='company_demand_positioning');nowGuideOpen(item);return true;})()`);
    await delay(400);
    await evaluate(`(()=>{const root=document.querySelector('[data-gate1-company-demand-positioning-v357]');
      nowGuideOpenAncestors(root);root.querySelector('[data-pv181-company-demand-details-v345]').open=true;
      root.scrollIntoView({block:'start',behavior:'instant'});return true})()`);
    await delay(100); await screenshot('demand');
    await evaluate(`(()=>{document.querySelector('[data-company-demand-add-form]').scrollIntoView({block:'end',behavior:'instant'});return true})()`);
    await delay(100); await screenshot('add-below-words');
    report.keywordActions = await evaluate(`(() => {
      const initial=gate1CompanyBrandDemandReconcileV345(state).rows.length;
      const input=document.querySelector('[data-company-demand-new]');
      input.value='Тестовое ключевое слово';input.form.requestSubmit();
      const added=gate1CompanyBrandDemandReconcileV345(state).rows.length===initial+1;
      const addedRow=document.querySelector('[data-company-demand-phrase="Тестовое ключевое слово"]');
      const below=!!addedRow&&document.querySelector('[data-pv181-company-demand-rows-v345]')
        .compareDocumentPosition(document.querySelector('[data-company-demand-add-form]')) & Node.DOCUMENT_POSITION_FOLLOWING;
      addedRow?.click();
      return {added,removed:gate1CompanyBrandDemandReconcileV345(state).rows.length===initial,below};
    })()`);
    assert(report.keywordActions.added&&report.keywordActions.removed&&report.keywordActions.below);
    report.readers = await evaluate(`(() => {
      const empty={project:{},painV130:{companySemanticsV264:{brandDemandMetricsImportV356:{last_import:null,unmatched:null}}}};
      const before=JSON.stringify(empty);gate1CompanyBrandDemandImportStateV356(empty);gate1CompanyBrandDemandImportIssuesV356(null);
      return {pure:before===JSON.stringify(empty)};
    })()`);
    assert(report.readers.pure);
    report.import = await evaluate(`(() => {
      const copy=structuredClone(state), phrase=gate1CompanyBrandDemandReconcileV345(copy).rows[0].kw;
      const parsed=guruGate1FinalParseMetricsRowsV260([
        ['План кампании "Новая"'], ['Регионы показа: Москва и область'],
        ['Ключевое слово','Объём показов/мес','Примерное количество запросов'],
        [phrase,'0','10'],['Новая фраза из файла','10','12'],['Ошибка метрики','не число',''],
        ['Итого','20','22'],['Цены указаны без НДС.']]);
      const original=JSON.stringify(state), applied=gate1CompanyBrandDemandApplyParsedRowsV356(parsed,'forecast.csv',copy);
      return {matched:applied.matched,issues:applied.unmatched.map(r=>[r.phrase,r.reason]),
        zero:gate1CompanyBrandDemandReconcileV345(copy).rows[0].vol,
        originalSame:original===JSON.stringify(state),originalHistory:state.painV130.companySemanticsV264.brandDemandMetricsImportV356.unmatched.length};
    })()`);
    assert.equal(report.import.matched,1);assert.equal(report.import.zero,'0');assert(report.import.originalSame);
    assert.deepEqual(report.import.issues,[['Ошибка метрики','invalid_metrics'],['Новая фраза из файла','not_current_confirmed_company_candidate']]);
    report.live = await evaluate(`(() => {
      const model=gate1CompanyBrandDemandReconcileV345(state,{create:true});
      for(const row of model.rows)for(const [field] of PV181_DEMAND_FIELDS_V272)if(field!=='kw')row[field]='0';
      gate1CompanyBrandDemandRefreshV345({preserveOpen:true});
      const find=()=>document.querySelector('[data-pv181-company-demand-field-v345="vol"]');
      const header=()=>document.querySelector('[data-gate1-company-demand-positioning-v357] > .g1-section-header');
      const before=gate1CompanyDemandPositioningCompletionV357(state), filledHeader=header().textContent;
      const input=find();input.focus();input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));
      const missing=nowGuideWithReadPass(()=>{const item=nowGuideBuildAllBlocks().find(i=>i.id==='company_demand_positioning');return nowGuideGate1Assessment(item)});
      const incomplete=gate1CompanyDemandPositioningCompletionV357(state), retained=input===document.activeElement&&input===find(), incompleteHeader=header().textContent;
      input.value='0';input.dispatchEvent(new Event('input',{bubbles:true}));
      const after=__demandSnapshot();
      return {before,after:after.completion,path:after.status,retained,incomplete,filledHeader,incompleteHeader,
        missing:missing.missing.filter(r=>r.selector?.includes('company-demand-row-id')).map(r=>({label:r.label,targetExists:!!document.querySelector(r.selector)})),
        readyHeader:header().querySelector('.status-pill').textContent};
    })()`);
    assert.equal(report.live.before.status,'ready');assert.equal(report.live.after.status,'ready');assert.equal(report.live.path,'ready');
    assert.equal(report.live.incomplete.status,'in_progress');assert.equal(report.live.incomplete.completed,report.live.after.total-1);
    assert.equal(report.live.readyHeader,'Готово');assert(report.live.retained);
    assert(report.live.filledHeader.includes('Готово')&&report.live.incompleteHeader.includes('В работе'));
    assert.equal(report.live.missing.length,1);assert(report.live.missing[0].targetExists);
    await evaluate(`(()=>{renderGateNav({recalculate:false});document.querySelector('[data-gate1-company-demand-positioning-v357]').scrollIntoView({block:'start',behavior:'instant'});return true})()`);
    await delay(100);await screenshot('ready-on-memory-copy');
    report.empty = await evaluate(`(() => {
      const copy=structuredClone(state);guruCompanyKeywordFoundationRecordV351(copy,true).keywords=[];
      const before=JSON.stringify(copy), result=guruReadinessInspect(copy,view=>gate1CompanyDemandPositioningCompletionV357(view));
      return {result,pure:JSON.stringify(copy)===before};
    })()`);
    assert(report.empty.pure);assert.equal(report.empty.result.status.status,'not_started');
    assert(report.empty.result.missing.some(r=>r.selector==='[data-company-demand-new]'));
  }
  assert.deepEqual(page.errors,[],'Browser errors');
  report.build=await evaluate('GURU_BUILD_INFO.version');report.passed=true;
  writeFileSync(output+'/report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({passed:report.passed,build:report.build,live:report.live,import:report.import},null,2));
} finally {
  await browser.call('Target.disposeBrowserContext',{browserContextId}).catch(()=>{});page.close();browser.close();
}
