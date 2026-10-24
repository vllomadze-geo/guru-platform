import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {createHash} from "node:crypto";
const port=process.env.GURU_CHROME_DEBUG_PORT||"9481";
const appUrl=process.env.GURU_APP_URL||"http://127.0.0.1:3000/";
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const sources=JSON.parse(readFileSync(process.env.GURU_STEP6_SOURCES||'/private/tmp/guru-step6-storage-sources.json','utf8')).filter(s=>!process.env.GURU_STEP6_ONLY||s.label===process.env.GURU_STEP6_ONLY);
mkdirSync('artifacts',{recursive:true});
const results=[];
class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.errors = [];
    this.dialogs = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.method === "Page.javascriptDialogOpening") {
        this.dialogs.push(message.params.message);
        this.socket.send(JSON.stringify({ id: ++this.sequence, method: "Page.handleJavaScriptDialog",
          params: { accept: true } }));
      }
      if (message.method === "Page.screencastFrame") {
        this.frame = message.params;
        this.socket.send(JSON.stringify({ id: ++this.sequence, method: "Page.screencastFrameAck",
          params: { sessionId: message.params.sessionId } }));
      }
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') this.errors.push(message.params.args.map(a=>a.value||a.description||'').join(' '));
      if (message.method === "Runtime.exceptionThrown")
        this.errors.push(message.params.exceptionDetails.exception?.description ||
          message.params.exceptionDetails.text);
      const entry = this.pending.get(message.id);
      if (!entry) return;
      this.pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 120000);
      this.pending.set(id, {
        resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (error) => { clearTimeout(timer); reject(error); },
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

async function evaluate(page, expression) {
  const response = await page.call("Runtime.evaluate", {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (response.exceptionDetails)
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}

async function waitFor(page, expression, timeout = 90000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(page, `Boolean(${expression})`)) return;
    await wait(150);
  }
  throw new Error(`Timeout: ${expression}`);
}


const version=await(await fetch('http://127.0.0.1:'+port+'/json/version')).json();
const browser=new Cdp(version.webSocketDebuggerUrl);
for(const source of sources){
 const fixture=JSON.parse(readFileSync(source.file,'utf8'));
 const sourceHashBefore=createHash('sha256').update(readFileSync(source.file)).digest('hex');
 const copyId='step6-'+source.label+'-copy';
 const {browserContextId}=await browser.call('Target.createBrowserContext');
 const {targetId}=await browser.call('Target.createTarget',{url:'about:blank',browserContextId});
 const target=(await(await fetch('http://127.0.0.1:'+port+'/json')).json()).find(t=>t.id===targetId);
 const page=new Cdp(target.webSocketDebuggerUrl);
 const result={project:source.name,label:source.label,source,products:[],transitions:[],screenshots:[],issues:[]};
 try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Page.bringToFront");
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1800, height: 1000, deviceScaleFactor: 1, mobile: false,
  });
  await page.call("Page.addScriptToEvaluateOnNewDocument", {
    source: `{
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes("/api/")
        ? Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200,
            headers: { "Content-Type": "application/json" } })) : nativeFetch(input, init);
    }`,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete" && typeof nowGuideBuildPath === "function"');
  await evaluate(page, `(() => {
    const workspace = structuredClone(window.GURU_SEED);
    workspace.project.id = ${JSON.stringify(copyId)};
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: ${JSON.stringify(copyId)}, name: ${JSON.stringify(fixture.project.name)}, lifecycleStatus: "active",
      createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z"
    }]));
    localStorage.setItem("guru-platform-workspace-v02-" + ${JSON.stringify(copyId)}, JSON.stringify(workspace));
    location.reload();
    return true;
  })()`);
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, `activeProjectId === ${JSON.stringify(copyId)} && document.querySelector("#nowGuide")`);
  await evaluate(page, `(() => {
    const source = ${JSON.stringify(fixture)};
    source.project.id = ${JSON.stringify(copyId)};
    guruExportWithoutPersistenceV223(() => {
      state = migrateWorkspace(source, ${JSON.stringify(copyId)});
      guruGateReadinessCache = new Map();
      activeView = "project";
      render();
    });
    guruCancelDerivedRefresh();
    guruDiscardUiPreferenceSave(${JSON.stringify(copyId)});
    return true;
  })()`);

 console.log('Загружен',source.name);
 await evaluate(page,'(()=>{window.__step6Before=JSON.stringify({workspace:guruExportDiagnosticCloneV223(state)});window.__step6Writes=0;const save=guruScheduleUiPreferenceSave;guruScheduleUiPreferenceSave=function(...a){window.__step6Writes++;return save.apply(this,a)};nowGuideGate1PassiveCalculators=true;return true})()');
 const products=await evaluate(page,'nowGuidePlainRead(()=>guruV194Products(state).map(p=>({id:p.id,name:p.name,categoryId:p.categoryId})))');
 result.productCount=products.length;
 result.default=await evaluate(page,'nowGuidePlainRead(()=>({selectedProductId:state.project.gate0ScopeUiV194?.selectedProductId||null,summary:nowGuideLaunchReadiness(nowGuideDisplayedPath),gates:state.gates.filter(g=>Number(g.id.slice(5))<=4).map(g=>({id:g.id,preflight:nowGuideLaunchReadiness(nowGuideDisplayedPath.filter(i=>i.gateId===g.id)),full: guruGateReadiness(g)})),path:nowGuideDisplayedPath.map(i=>({gate:i.gateId,id:i.id,product_id:i.productId||null,status:i.status})),emptyGates:state.gates.filter(g=>guruGateBlockStatuses(g).length===0).map(g=>g.id),missingGates:[0,1,2,3,4,5,6,7,8].map(n=>"gate-"+n).filter(id=>!state.gates.some(g=>g.id===id)),card:document.querySelector("#nowGuide").innerText}))');
 for(const product of process.env.GURU_STEP6_SKIP_MATRIX?[]:products.length?products:[{id:'',name:'Без выбранного продукта'}]){
  console.log('Матрица',source.label,product.id||'нет продукта');
  const matrix=await evaluate(page,`nowGuidePlainRead(()=>nowGuideWithReadPass(()=>{
   const fast=guruFastGateNavigation,navigating=guruGateNavigationInProgress,edit=guruUserEditDispatchActive,editType=guruUserEditEventType;
   guruFastGateNavigation=true;guruGateNavigationInProgress=true;
   try {
    state.project.gate0ScopeUiV194 ||= {};state.project.gate0ScopeUiV194.selectedProductId=${JSON.stringify(product.id)};state.project.gate0ScopeUiV194.selectedCategoryId=${JSON.stringify(product.categoryId||'')};
    guruGateReadinessCache=new Map();const all=nowGuideBuildAllBlocks(),path=nowGuidePreflightPath(all);nowGuideDisplayedAllBlocks=all;nowGuideDisplayedPath=path;
    const rows=[],gates=[],hintErrors=[];
    for(const gateId of ['gate-0','gate-1','gate-2','gate-3','gate-4']){
     const gate=state.gates.find(g=>g.id===gateId);if(!gate)continue;
     guruInvalidateGateViewCache();activeView='gate';activeGateId=gateId;nowGuideProtectedGate=gateId;
     if(gateId==='gate-1'){const acc=getGate1AccordionState();for(const section of getGate1Sections(gate,gate.cards))acc.subblocks[section.key]=true;nowGuideGate1NavigationPending=true;nowGuideGate1PassiveCalculators=true}
     renderGate();
     for(const item of path.filter(i=>i.gateId===gateId)){
      for(let n=0;n<4&&!nowGuideFindNode(item);n++)nowGuideReveal(item);
      const header=nowGuideFindNode(item),badge=header?.querySelector('.status-pill,.gate0-card-status,[data-g2sb-status],.g2w-status');
      const text=badge?.textContent.trim()||'',raw=[...(badge?.classList||[])].find(n=>n!=='status-pill'&&n.startsWith('status-'))?.slice(7);
      const status=text.startsWith('Не требуется')||text.startsWith('Gate 0: Не требуется')?'not_required':raw?guruNormBlockStatus(raw):({'Готово':'ready','В работе':'in_progress','Не начато':'not_started','Проблема':'problem'})[text];
      rows.push({gate:gateId,id:item.id,title:item.title,kind:item.kind,product_id:item.productId||null,found:!!header,pageBadge:text,pageStatus:status||null,pathStatus:item.status});
      try {const d=nowGuideMissingDetails(item);if(!d||!d.text&&!d.items?.length||d.items?.some(i=>!i.label?.trim()))hintErrors.push({gate:gateId,id:item.id,error:'Пустая подсказка'});}catch(error){hintErrors.push({gate:gateId,id:item.id,error:String(error)})}
     }
     const full=guruGateReadiness(gate),pre=nowGuideLaunchReadiness(path.filter(i=>i.gateId===gateId));
     const diagnostic=guruExportGateDiagnosticsCurrentV223(gateId,guruExportRawCardStatusesV223(state));
     gates.push({id:gateId,preflight:pre,full,navigationReadiness:diagnostic.navigationReadiness.summary,registry:nowGuideLaunchReadiness(all.filter(i=>i.gateId===gateId))});
    }
    return {product_id:${JSON.stringify(product.id)}||null,name:${JSON.stringify(product.name)},summary:nowGuideLaunchReadiness(path),rows,gates,hintErrors};
   } finally {guruFastGateNavigation=fast;guruGateNavigationInProgress=navigating;guruUserEditDispatchActive=edit;guruUserEditEventType=editType;nowGuideGate1NavigationPending=false}
  }))`);
  for(const row of matrix.rows)if(!row.found||row.pageStatus!==row.pathStatus)result.issues.push({type:'badge',product_id:matrix.product_id,...row});
  for(const gate of matrix.gates){for(const key of ['total','done']){if(gate.full[key]!==gate.navigationReadiness[key]||gate.full[key]!==gate.registry[key])result.issues.push({type:'sum',product_id:matrix.product_id,gate:gate.id,key,values:gate});if(gate.id!=='gate-4'&&gate.preflight[key]!==gate.full[key])result.issues.push({type:'preflight-sum',gate:gate.id,key});}}
  result.issues.push(...matrix.hintErrors);result.products.push(matrix);console.log('Матрица завершена',source.label,matrix.summary,'ошибок',result.issues.length);
 }
 result.edgeCases=await evaluate(page,`nowGuidePlainRead(()=>{
 const original=state.gates;const checks=[];
 for(const scenario of ['без Gate 4 и Gate 7','пустые карточки Gate 4','пустой путь']){
  state.gates=scenario==='пустой путь'?[]:scenario==='без Gate 4 и Gate 7'?original.filter(g=>!['gate-4','gate-7'].includes(g.id)):original.map(g=>g.id==='gate-4'?{...g,cards:[]}:g);
  const all=nowGuideBuildAllBlocks(),path=nowGuidePreflightPath(all);nowGuideRender(path,all);
  checks.push({scenario,summary:nowGuideLaunchReadiness(path),gate4InPath:path.filter(i=>i.gateId==='gate-4').length,gate7InPath:path.filter(i=>i.gateId==='gate-7').length,card:document.querySelector('#nowGuide').innerText});
 }
 state.gates=original;return checks;
})`);
 for(const check of result.edgeCases){assert.equal(check.gate7InPath,0);if(check.scenario==='без Gate 4 и Gate 7')assert.equal(check.gate4InPath,0);assert(!check.card.includes('NaN'));if(check.scenario==='пустой путь'){assert.equal(check.summary.total,0);assert(check.card.includes('Предполётный путь пока пуст'))}}
 // Restore the original product's rendered view after private projections.
 await evaluate(page,'(()=>{guruInvalidateGateViewCache();activeView="project";nowGuideProtectedGate="";guruGateReadinessCache=new Map();guruExportWithoutPersistenceV223(()=>render());return true})()');
 const delta=async phase=>{const d=await evaluate(page,`(()=>{const a=JSON.parse(window.__step6Before).workspace,b=state,out=[];const scan=(x,y,p)=>{if(x===y||out.length>=30)return;if(!x||!y||typeof x!=='object'||typeof y!=='object'){out.push(p);return}for(const k of new Set([...Object.keys(x),...Object.keys(y)]))scan(x[k],y[k],p+'.'+k)};scan(a,b,'state');return out})()`);(result.phaseDifferences||=[]).push({phase,paths:d})}; await delta('после матрицы и render');
 const checkTarget=async(itemKey)=>{await waitFor(page,`(()=>{const i=nowGuideDisplayedAllBlocks.find(i=>i.key===${JSON.stringify(itemKey)}),n=i&&nowGuideFindNode(i),r=n?.getBoundingClientRect();return i&&guruRenderedGateId===i.gateId&&n?.classList.contains('now-guide-highlight')&&r.top>=0&&r.bottom<=innerHeight})()`);return evaluate(page,`(()=>{const i=nowGuideDisplayedAllBlocks.find(i=>i.key===${JSON.stringify(itemKey)}),n=nowGuideFindNode(i),r=n.getBoundingClientRect();return {id:i.id,gate:i.gateId,visible:r.top>=0&&r.bottom<=innerHeight,highlight:n.classList.contains('now-guide-highlight'),expanded:(!n.closest('details')||n.closest('details').open)&&(!n.closest('.g1-card')||n.closest('.g1-card').classList.contains('is-open'))}})()`)};
 for(const gateId of ['gate-0','gate-2','gate-4']){
  const destination=await evaluate(page,`(()=>{const path=nowGuideDisplayedPath,i=path.find(i=>i.gateId===${JSON.stringify(gateId)}),fallback=nowGuideDisplayedAllBlocks.find(i=>i.gateId===${JSON.stringify(gateId)});return {key:(i||fallback)?.key||null,inPath:!!i,index:i?path.indexOf(i):-1}})()`);
  if(!destination.key){result.transitions.push({gate:gateId,empty:true});continue}
  if(destination.inPath&&destination.index>0){await evaluate(page,`nowGuideSelect(nowGuideDisplayedPath[${destination.index-1}],nowGuideDisplayedPath);true`);await checkTarget(await evaluate(page,'nowGuideCurrent(nowGuideDisplayedPath).key'));await evaluate(page,'document.querySelector("[data-now-next]").click();true');}
  else await evaluate(page,`(()=>{const i=nowGuideDisplayedAllBlocks.find(i=>i.key===${JSON.stringify(destination.key)});if(nowGuideIsPreflight(i))nowGuideSelect(i,nowGuideDisplayedPath);else nowGuideOpen(i);return true})()`);
  const evidence=await checkTarget(destination.key);evidence.action=destination.inPath&&destination.index>0?'Далее':'Прямой переход';evidence.inPath=destination.inPath;
  if(destination.inPath){const index=await evaluate(page,'nowGuideDisplayedPath.findIndex(i=>i.key===nowGuideCurrent(nowGuideDisplayedPath).key)');if(index+1<await evaluate(page,'nowGuideDisplayedPath.length')){await evaluate(page,'document.querySelector("[data-now-next]").click();true');await checkTarget(await evaluate(page,'nowGuideCurrent(nowGuideDisplayedPath).key'));await evaluate(page,'document.querySelector("[data-now-prev]").click();true');evidence.back=await checkTarget(destination.key)}await evaluate(page,'document.querySelector("[data-now-current]").click();true');evidence.current=await checkTarget(await evaluate(page,'nowGuideCurrent(nowGuideDisplayedPath).key'));assert(await evaluate(page,'nowGuideCurrent(nowGuideDisplayedPath).key===nowGuideDisplayedPath.find(i=>!["ready","not_required"].includes(i.status))?.key'))}
  assert(evidence.expanded);result.transitions.push(evidence);await delta(gateId);
 }
 await evaluate(page,'document.querySelector("[data-now-current]").click();true');await checkTarget(await evaluate(page,'nowGuideCurrent(nowGuideDisplayedPath).key'));
 await wait(200);await page.call('Page.bringToFront');page.frame=null;await page.call('Page.startScreencast',{format:'png',maxWidth:1800,maxHeight:1000,everyNthFrame:1});await evaluate(page,"document.body.style.outline='1px solid transparent';window.dispatchEvent(new Event('resize'));true");for(let n=0;n<100&&!page.frame?.data;n++)await wait(100);await page.call('Page.stopScreencast');
 const capture=page.frame?.data?{data:page.frame.data}:await page.call('Page.captureScreenshot',{format:'png',fromSurface:false,captureBeyondViewport:false});
 assert(capture?.data);const shot='artifacts/step6-now-guide-'+source.label+'.png';writeFileSync(shot,Buffer.from(capture.data,'base64'));result.screenshots.push(shot);
 result.comparison=await evaluate(page,`(async()=>{const before=window.__step6Before,after=JSON.stringify({workspace:guruExportDiagnosticCloneV223(state)}),diff=[];const scan=(a,b,p)=>{if(a===b||diff.length>=100)return;if(!a||!b||typeof a!=='object'||typeof b!=='object'){diff.push({path:p,before:a,after:b});return}for(const k of new Set([...Object.keys(a),...Object.keys(b)]))scan(a[k],b[k],p+'.'+k)};if(before!==after)scan(JSON.parse(before),JSON.parse(after),'workspace');const hash=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');return {identical:before===after,beforeSha256:await hash(before),afterSha256:await hash(after),bytes:new TextEncoder().encode(after).length,updatedAtFields:(after.match(/"updated_at"\\s*:/g)||[]).length,uiPreferenceWrites:window.__step6Writes,differences:diff}})()`);
 if(!result.comparison.identical)result.issues.push({type:'export',...result.comparison});if(result.comparison.uiPreferenceWrites)result.issues.push({type:'preferences',count:result.comparison.uiPreferenceWrites});
 // After the read-only export check, verify editing on this disposable copy.
 if(source.label==='sivrce'){
  result.editorRegression=await evaluate(page,`(()=>{
   document.querySelector('[data-gate0-section-toggle="company"]').click();
   const field=document.querySelector('[data-gate0-company-brand-purpose-field="functional"]');
   field.value='Проверка редактора на копии';field.dispatchEvent(new Event('input',{bubbles:true}));
   return {saved:JSON.stringify(guruV349ProjectBrandPurposeRecord(state,false)).includes('Проверка редактора на копии')};
  })()`);await wait(500);assert(result.editorRegression.saved);
 }
 result.consoleErrors=page.errors;result.issues.push(...page.errors.map(error=>({type:'console',error})));result.build=await evaluate(page,'GURU_BUILD_INFO.version');
 }catch(error){result.issues.push({type:'test-error',error:String(error),stack:error.stack});console.log('Ошибка проверки',source.label,String(error))}
 finally {await browser.call('Target.disposeBrowserContext',{browserContextId});page.close()}
 result.sourceHashBefore=sourceHashBefore;result.sourceHashAfter=createHash('sha256').update(readFileSync(source.file)).digest('hex');result.passed=result.issues.length===0&&result.sourceHashBefore===result.sourceHashAfter;results.push(result);writeFileSync('artifacts/step6-now-guide-'+source.label+'-results.json',JSON.stringify(result,null,2));console.log('Итог',source.label,result.passed,result.issues.slice(0,5));
}
browser.close();writeFileSync('artifacts/step6-now-guide-results.json',JSON.stringify({passed:results.every(r=>r.passed),projects:results},null,2));if(results.some(r=>!r.passed))process.exitCode=1;
