import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const port = process.env.GURU_CHROME_DEBUG_PORT || "9471";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const fixture = JSON.parse(readFileSync(process.env.GURU_GATE0_FIXTURE ||
  "/private/tmp/guru-now-korich-workspace.json", "utf8"));

const copyId = "preflight-now-guide-smoke";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
const target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json())
  .find((entry) => entry.id === targetId);
const page = new Cdp(target.webSocketDebuggerUrl);

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
      id: ${JSON.stringify(copyId)}, name: "Коричное яблоко", lifecycleStatus: "active",
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
  console.log("Коричное яблоко: тестовая копия загружена");

  const evidence={matrices:{},transitions:[],screenshots:[],products:[]};
  const select=async(gateId,id)=>{
    await evaluate(page,`(()=>{const item=nowGuideDisplayedPath.find(i=>i.gateId===${JSON.stringify(gateId)}&&i.id===${JSON.stringify(id)});if(!item)throw Error("No item");nowGuideSelect(item,nowGuideDisplayedPath);return true})()`);
    await waitFor(page,`(()=>{const item=nowGuideCurrent(nowGuideDisplayedPath),node=nowGuideFindNode(item),r=node?.getBoundingClientRect();return item?.id===${JSON.stringify(id)}&&guruRenderedGateId===${JSON.stringify(gateId)}&&node?.classList.contains("now-guide-highlight")&&r.top>=0&&r.bottom<=innerHeight})()`);
  };
  const shot=async(label)=>{
    await evaluate(page,`(()=>{document.querySelector('[data-gate-id="'+activeGateId+'"]')?.scrollIntoView({block:"nearest",behavior:"instant"});return true})()`);
    await wait(500);page.frame=null;
    await page.call("Page.startScreencast",{format:"png",maxWidth:1800,maxHeight:1000,everyNthFrame:1});
    for(let n=0;n<40&&!page.frame?.data;n++)await wait(100);
    assert(page.frame?.data);const name=`artifacts/preflight-now-guide-${label}.png`;
    writeFileSync(name,Buffer.from(page.frame.data,"base64"));await page.call("Page.stopScreencast");evidence.screenshots.push(name);
  };
  await evaluate(page,`(()=>{window.__step5Before=JSON.stringify({workspace:guruExportDiagnosticCloneV223(state)});window.__step5Writes=0;const save=guruScheduleUiPreferenceSave;guruScheduleUiPreferenceSave=function(...a){window.__step5Writes++;return save.apply(this,a)};return true})()`);


  evidence.statusesBefore=await evaluate(page,'nowGuideBuildAllBlocks().map(i=>({key:i.key,status:i.status}))');
  evidence.baseline=await evaluate(page,'nowGuidePlainRead(()=>({legacyCards:projectPassportOverviewFields().find(f=>f.label==="Карточек заполнено"),launch: guruProjectReadiness(),all:nowGuideBuildAllBlocks().length,after:nowGuideAfterLaunch().length,afterNotReady:nowGuideAfterLaunch().filter(i=>!["ready","not_required"].includes(i.status)).length,schemeLabels:(()=>{const previous=activeView;renderScheme();const text=els.contentArea.innerText;activeView=previous;return {newCaption:text.includes("Заполнение карточек по Gate"),oldCaption:text.includes("Прогресс по Gate")}})()}))');
  assert(evidence.baseline.legacyCards.value.startsWith('4%'));
  assert(evidence.baseline.schemeLabels.newCaption&&!evidence.baseline.schemeLabels.oldCaption);
  assert.equal(evidence.baseline.all,147);assert.equal(evidence.baseline.after,52);
  assert.equal(evidence.baseline.launch.total,95);
  assert(await evaluate(page,'(()=>{const s=nowGuideLaunchReadiness([{status:"ready"},{status:"not_required"},{status:"in_progress"},{status:"problem"},{status:"not_started"}]);return s.total===5&&s.done===2&&s.percent===60})()'));
  const productIds=['catalog-item-1786792591872-51f503','catalog-item-1786792591872-c8b1e9'];
  for(const productId of productIds){
    console.log('Продукт',productId);
    const product=await evaluate(page,`nowGuidePlainRead(()=>nowGuideWithReadPass(()=>{
      const fast=guruFastGateNavigation,navigating=guruGateNavigationInProgress,edit=guruUserEditDispatchActive,editType=guruUserEditEventType;
      guruFastGateNavigation=true;guruGateNavigationInProgress=true;
      try {
        activeView="gate";activeGateId="gate-4";nowGuideProtectedGate="gate-4";renderGate();
        const product=guruV194Product(${JSON.stringify(productId)},state);
        const category=document.querySelector('[data-gate0-scope-category-select]');
        category.value=product.categoryId||"__uncategorized__";category.dispatchEvent(new Event("change",{bubbles:true}));
        const select=document.querySelector('[data-gate0-scope-product-select]');
        select.value=product.id;select.dispatchEvent(new Event("change",{bubbles:true}));
        if(state.project.gate0ScopeUiV194.selectedProductId!==product.id)throw Error("Product selection failed");
        nowGuideRender();
        const path=nowGuideDisplayedPath,all=nowGuideDisplayedAllBlocks;
        const gates=["gate-0","gate-1","gate-2","gate-3","gate-4"].map(id=>({id,...nowGuideLaunchReadiness(path.filter(i=>i.gateId===id)),fullNavigationReadiness:guruGateReadiness(state.gates.find(g=>g.id===id))}));
        const rows=path.map(i=>({id:i.id,gate:i.gateId,kind:i.kind,product_id:i.productId||null,status:i.status,group:i.preflightGroup||null}));
        return {product_id:product.id,name:product.name,viaUi:true,gates,rows,summary:nowGuideLaunchReadiness(path),publicReadiness:guruProjectReadiness(),all:all.length,after:nowGuideAfterLaunch(all).length,text:document.querySelector('#nowGuide').innerText};
      } finally {guruFastGateNavigation=fast;guruGateNavigationInProgress=navigating;guruUserEditDispatchActive=edit;guruUserEditEventType=editType}
    }))`);
    assert.equal(product.summary.total,95);assert.deepEqual(product.summary,product.publicReadiness);assert.equal(product.after,52);
    assert.equal(product.gates.reduce((n,g)=>n+g.total,0),product.summary.total);assert.equal(product.gates.reduce((n,g)=>n+g.done,0),product.summary.done);
    for(const g of product.gates.filter(g=>g.id!=='gate-4')){assert.equal(g.total,g.fullNavigationReadiness.total);assert.equal(g.done,g.fullNavigationReadiness.done)}
    const g4=product.rows.filter(r=>r.gate==='gate-4');assert.equal(g4.length,32);assert(g4.slice(0,20).every(r=>r.kind==='gate4-readiness'&&r.group==='preparation'));assert(g4.slice(20).every(r=>r.kind==='channel'&&r.group==='campaigns'));
    assert.equal(new Set(g4.map(r=>r.id)).size,32);
    assert(product.rows.filter(r=>r.product_id).every(r=>r.product_id===product.product_id));
    assert(product.text.includes('Готовность к запуску: '+product.summary.percent+'%'));
    assert(product.text.includes('готово '+product.summary.done+' из 95'));
    evidence.products.push(product);console.log("Итог продукта",JSON.stringify({id:product.product_id,summary:product.summary,gates:product.gates}));
  }
  // Restore the visible product after private UI projections.
  await evaluate(page,'(()=>{activeView="project";nowGuideProtectedGate="";guruGateReadinessCache=new Map();guruExportWithoutPersistenceV223(()=>render());return true})()');
  await select('gate-0','card-2');await shot('readiness');
  const checkpoint=async(action)=>{await evaluate(page,action+';true');await waitFor(page,'(()=>{const i=nowGuideCurrent(nowGuideDisplayedPath),n=nowGuideFindNode(i),r=n?.getBoundingClientRect();return guruRenderedGateId===i.gateId&&n?.classList.contains("now-guide-highlight")&&r.top>=0&&r.bottom<=innerHeight})()');evidence.transitions.push(await evaluate(page,'(()=>{const i=nowGuideCurrent(nowGuideDisplayedPath);return {id:i.id,gate:i.gateId,index:nowGuideDisplayedPath.findIndex(x=>x.key===i.key),M:nowGuideDisplayedPath.length}})()'))};
  await checkpoint('nowGuideSelect(nowGuideDisplayedPath[0],nowGuideDisplayedPath)');assert(await evaluate(page,'document.querySelector("[data-now-prev]").disabled'));
  await checkpoint('document.querySelector("[data-now-next]").click()');
  await checkpoint('document.querySelector("[data-now-prev]").click()');
  for(const gateId of ['gate-1','gate-2','gate-3','gate-4'])await checkpoint(`nowGuideSelect(nowGuideDisplayedPath.find(i=>i.gateId===${JSON.stringify(gateId)}),nowGuideDisplayedPath)`);
  await checkpoint('nowGuideSelect(nowGuideDisplayedPath.at(-1),nowGuideDisplayedPath)');assert(await evaluate(page,'document.querySelector("[data-now-next]").disabled'));assert.equal(evidence.transitions.at(-1).gate,'gate-4');
  await checkpoint('document.querySelector("[data-now-prev]").click()');
  await checkpoint('document.querySelector("[data-now-current]").click()');assert(await evaluate(page,'nowGuideCurrent(nowGuideDisplayedPath).key===nowGuideDisplayedPath.find(i=>!["ready","not_required"].includes(i.status)).key'));
  // Direct navigation to an after-launch block keeps the preflight position.
  await evaluate(page,'(()=>{window.__step5Current=nowGuideCurrent(nowGuideDisplayedPath).key;nowGuideExpanded.add("gate-4");nowGuideRender();const key=nowGuideDisplayedAllBlocks.find(i=>i.id==="online_chat").key;[...document.querySelectorAll("[data-now-step]")].find(button=>button.dataset.nowStep===key).click();return true})()');
  await waitFor(page,'activeGateId==="gate-4"&&nowGuideFindNode(nowGuideDisplayedAllBlocks.find(i=>i.id==="online_chat"))?.classList.contains("now-guide-highlight")');
  assert(await evaluate(page,'nowGuideCurrent(nowGuideDisplayedPath).key===window.__step5Current&&nowGuideDisplayedPath.length===95'));
  evidence.afterDirectNavigation=true;
  evidence.statusesAfter=await evaluate(page,'nowGuideBuildAllBlocks().map(i=>({key:i.key,status:i.status}))');assert.deepEqual(evidence.statusesAfter,evidence.statusesBefore);
  // Completion is a temporary read projection on a separate memory copy.
  await evaluate(page,`(()=>{window.__step5Live=state;state=guruExportDiagnosticCloneV223(state);window.__step5All=nowGuideBuildAllBlocks;window.__step5Projection=nowGuideBuildAllBlocks().map(i=>nowGuideIsPreflight(i)?{...i,status:'ready',pageBadge:'Готово'}:i);nowGuideBuildAllBlocks=()=>window.__step5Projection;nowGuideReviewKey=nowGuidePreflightPath(window.__step5Projection).at(-1).key;nowGuideRender();return true})()`);
  evidence.completed=await evaluate(page,'({summary:guruProjectReadiness(),text:document.querySelector("#nowGuide").innerText,afterNotReady:nowGuideAfterLaunch().filter(i=>!["ready","not_required"].includes(i.status)).length,missing:document.querySelector("#nowGuide .now-guide-missing")!==null})');
  assert.equal(evidence.completed.summary.total,95);assert.equal(evidence.completed.summary.done,95);assert.equal(evidence.completed.summary.percent,100);assert(evidence.completed.text.includes('Можно запускать рекламу'));assert(evidence.completed.text.includes('После запуска: 49 блоков не готово'));assert(!evidence.completed.missing);
  await shot('can-launch');
  await evaluate(page,'document.querySelector("[data-now-launch]").click();true');
  await waitFor(page,'(()=>{const i=nowGuideDisplayedPath.find(i=>i.gateId==="gate-4"&&i.kind==="channel"),n=nowGuideFindNode(i);return n?.classList.contains("now-guide-highlight")&&n.getBoundingClientRect().top>=0&&n.getBoundingClientRect().bottom<=innerHeight})()');
  evidence.completed.campaignLink=true;
  await evaluate(page,'document.querySelector("[data-now-after]").click();true');
  await waitFor(page,'(()=>{const i=nowGuideAfterLaunch().find(i=>!["ready","not_required"].includes(i.status)),n=nowGuideFindNode(i);return n?.classList.contains("now-guide-highlight")&&n.getBoundingClientRect().top>=0&&n.getBoundingClientRect().bottom<=innerHeight})()');
  evidence.completed.afterLink=true;
  await evaluate(page,'(()=>{nowGuideBuildAllBlocks=window.__step5All;state=window.__step5Live;guruCancelDerivedRefresh();guruDiscardUiPreferenceSave("preflight-now-guide-smoke");return true})()');
  evidence.comparison=await evaluate(page,`(async()=>{const before=window.__step5Before,after=JSON.stringify({workspace:guruExportDiagnosticCloneV223(state)}),differences=[];const scan=(a,b,p)=>{if(a===b||differences.length>=8)return;if(!a||!b||typeof a!=='object'||typeof b!=='object'){differences.push({path:p,before:a,after:b});return}for(const k of new Set([...Object.keys(a),...Object.keys(b)]))scan(a[k],b[k],p+'.'+k)};if(before!==after)scan(JSON.parse(before),JSON.parse(after),'workspace');const hash=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');return {identical:before===after,differences,beforeSha256:await hash(before),afterSha256:await hash(after),bytes:new TextEncoder().encode(after).length,updatedAtFields:(after.match(/"updated_at"\\s*:/g)||[]).length,uiPreferenceWrites:window.__step5Writes}})()`);
  console.log('Экспорт',JSON.stringify(evidence.comparison));assert(evidence.comparison.identical);assert.equal(evidence.comparison.uiPreferenceWrites,0);
  evidence.build=await evaluate(page,'GURU_BUILD_INFO.version');evidence.errors=page.errors;assert.deepEqual(page.errors,[]);
  writeFileSync('artifacts/preflight-now-guide-results.json',JSON.stringify({passed:true,...evidence},null,2));console.log('preflight-now-guide: PASS');
} finally {await browser.call("Target.disposeBrowserContext",{browserContextId});page.close();browser.close()}
