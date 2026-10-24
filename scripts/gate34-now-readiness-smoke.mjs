import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const port = process.env.GURU_CHROME_DEBUG_PORT || "9451";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const fixture = JSON.parse(readFileSync(process.env.GURU_GATE0_FIXTURE ||
  "/private/tmp/guru-now-korich-workspace.json", "utf8"));

const copyId = "gate34-now-readiness-smoke";
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
    assert(page.frame?.data);const name=`artifacts/gate34-now-readiness-${label}.png`;
    writeFileSync(name,Buffer.from(page.frame.data,"base64"));await page.call("Page.stopScreencast");evidence.screenshots.push(name);
  };
  await evaluate(page,`(()=>{window.__step4Before=JSON.stringify({workspace:guruExportDiagnosticCloneV223(state)});window.__step4Writes=0;const save=guruScheduleUiPreferenceSave;guruScheduleUiPreferenceSave=function(...a){window.__step4Writes++;return save.apply(this,a)};return true})()`);
  for(const gateId of ["gate-3","gate-4"]){
    const ids=await evaluate(page,`nowGuideDisplayedPath.filter(i=>i.gateId===${JSON.stringify(gateId)}).map(i=>i.id)`);
    for(const id of (process.env.GURU_STEP4_QUICK === "1" ? ids.slice(0,1) : ids)){console.log("Переход",gateId,id);await select(gateId,id);evidence.transitions.push(await evaluate(page,`(()=>{const i=nowGuideCurrent(nowGuideDisplayedPath),n=nowGuideFindNode(i);return {gate:activeGateId,id:i.id,details:nowGuideMissingDetails(i),highlight:n.classList.contains("now-guide-highlight"),expanded:!n.closest("details")||n.closest("details").open}})()`));}
    evidence.matrices[gateId]=await evaluate(page,`(()=>{const id=${JSON.stringify(gateId)},gate=state.gates.find(g=>g.id===id);const rows=nowGuideDisplayedPath.filter(i=>i.gateId===id).map(i=>{const n=nowGuideFindNode(i),b=n?.querySelector(".status-pill"),raw=[...(b?.classList||[])].find(n=>n!=="status-pill"&&n.startsWith("status-"))?.slice(7);return {id:i.id,title:i.title,product_id:i.productId||null,pageBadge:b?.textContent.trim(),pageStatus:guruNormBlockStatus(raw),pathStatus:i.status,found:!!n}});const diagnostic=nowGuidePlainRead(()=>guruExportGateDiagnosticsCurrentV223(id,guruExportRawCardStatusesV223(state)));return {rows,summary:guruGateReadiness(gate),navigationReadiness:diagnostic.navigationReadiness.summary,menu:document.querySelector('[data-gate-id="'+id+'"] .small').textContent}})()`);
    const m=evidence.matrices[gateId];for(const r of m.rows){assert(r.found,r.id);assert.equal(r.pageStatus,r.pathStatus,r.id)}assert(m.rows.length>0);assert.equal(m.rows.length,m.summary.total);assert.equal(m.rows.filter(r=>["ready","not_required"].includes(r.pathStatus)).length,m.summary.done);assert.equal(m.summary.total,m.navigationReadiness.total);assert.equal(m.summary.done,m.navigationReadiness.done);console.log("Матрица PASS",gateId,m.summary);
  }
  await select("gate-3","advocate");
  assert(await evaluate(page,'document.querySelector("#nowGuide .now-guide-missing").innerText.includes("Не хватает:")'));
  await shot("gate3-field");
  const g4=await evaluate(page,'nowGuideDisplayedPath.find(i=>i.gateId==="gate-4"&&i.kind==="gate4-readiness"&&i.status!=="ready")?.id');
  await select("gate-4",g4);
  await evaluate(page,'document.querySelector("#nowGuide [data-now-missing]").click();true');
  await waitFor(page,'document.activeElement?.classList.contains("now-guide-highlight")');
  await shot("gate4-field");
  await select("gate-4","smm_vk_контент_11");
  await evaluate(page,`(()=>{const item=nowGuideCurrent(nowGuideDisplayedPath),node=nowGuideFindNode(item),stage=node.closest('[data-g4-map-stage-v290]');stage.querySelector(':scope > header').scrollIntoView({block:"start",behavior:"instant"});return true})()`);
  assert(await evaluate(page,'[...document.querySelectorAll("[data-g4five-stage-scope-v523=product] > header h3")].map(n=>n.textContent).join("|") === Object.values(NOW_STAGE_NAMES).join("|")'));
  await shot("gate4-funnel");
  await select("gate-1","company_demand_positioning");
  assert(await evaluate(page,'nowGuideDisplayedMissing.some(c=>c.groupedCount>1)'));
  assert(await evaluate(page,'(()=>{const check=nowGuideDisplayedMissing[0],nodes=(check.members||[check]).map(c=>nowGuideMissingNode(c)).filter(Boolean).sort((a,b)=>a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1);return nowGuideMissingNode(check)===nodes[0]})()'));
  await evaluate(page,'document.querySelector("[data-now-missing]").click();true');await waitFor(page,'document.activeElement?.classList.contains("now-guide-highlight")');await shot("gate1-group");
  await select("gate-0","card-7");
  assert(await evaluate(page,'nowGuideDisplayedMissing.some(c=>c.groupedCount>1)'));
  assert(await evaluate(page,'(()=>{const check=nowGuideDisplayedMissing[0],nodes=(check.members||[check]).map(c=>nowGuideMissingNode(c)).filter(Boolean).sort((a,b)=>a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1);return nowGuideMissingNode(check)===nodes[0]})()'));
  await evaluate(page,'document.querySelector("[data-now-missing]").click();true');await waitFor(page,'document.activeElement?.classList.contains("now-guide-highlight")');await shot("gate0-group");
  for(const productId of (process.env.GURU_STEP4_QUICK === "1" ? [] : ["catalog-item-1786792591872-51f503","catalog-item-1786792591872-c8b1e9"])){
    const product=await evaluate(page,`nowGuidePlainRead(()=>nowGuideWithReadPass(()=>{
      const fast=guruFastGateNavigation,navigating=guruGateNavigationInProgress;
      guruFastGateNavigation=true;guruGateNavigationInProgress=true;
      try {
        activeView="gate";activeGateId="gate-4";nowGuideProtectedGate="gate-4";renderGate();
        const product=guruV194Product(${JSON.stringify(productId)},state);
        const category=document.querySelector('[data-gate0-scope-category-select]');
        category.value=product.categoryId||"__uncategorized__";category.dispatchEvent(new Event("change",{bubbles:true}));
        const select=document.querySelector('[data-gate0-scope-product-select]');
        select.value=product.id;select.dispatchEvent(new Event("change",{bubbles:true}));
        if(state.project.gate0ScopeUiV194.selectedProductId!==product.id)throw Error("Product selection failed");
        const path=nowGuideBuildPath();
        const gates=["gate-3","gate-4"].map(id=>({id,...guruGateReadiness(state.gates.find(g=>g.id===id))}));
        const rows=[];
        for(const gateId of ["gate-4","gate-3"]){
          activeGateId=gateId;nowGuideProtectedGate=gateId;renderGate();
          for(const item of path.filter(i=>i.gateId===gateId)){
            const node=nowGuideFindNode(item),badge=node?.querySelector(".status-pill");
            const raw=[...(badge?.classList||[])].find(c=>c!=="status-pill"&&c.startsWith("status-"))?.slice(7);
            rows.push({gateId,id:item.id,product_id:item.productId||null,pageBadge:badge?.textContent.trim(),pageStatus:guruNormBlockStatus(raw),pathStatus:item.status,found:!!node});
          }
        }
        return {product_id:product.id,name:product.name,viaUi:true,gates,rows};
      } finally {guruFastGateNavigation=fast;guruGateNavigationInProgress=navigating}
    }))`);
    for(const row of product.rows){assert(row.found,row.id);assert.equal(row.pageStatus,row.pathStatus,row.id)}
    evidence.products.push(product);console.log("Продукт",product.product_id,product.gates);
  }
  assert(await evaluate(page,'nowGuideDisplayedPath.filter(i=>Number(i.gateId.slice(5))>=5).every(i=>nowGuideMissingDetails(i)===null)'));
  evidence.comparison=await evaluate(page,`(async()=>{const before=window.__step4Before,after=JSON.stringify({workspace:guruExportDiagnosticCloneV223(state)}),differences=[];const scan=(a,b,p)=>{if(a===b||differences.length>=12)return;if(!a||!b||typeof a!=="object"||typeof b!=="object"){differences.push({path:p,before:a,after:b});return}for(const k of new Set([...Object.keys(a),...Object.keys(b)]))scan(a[k],b[k],p+"."+k)};if(before!==after)scan(JSON.parse(before),JSON.parse(after),"workspace");const hash=async s=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,"0")).join("");return {identical:before===after,differences,beforeSha256:await hash(before),afterSha256:await hash(after),bytes:new TextEncoder().encode(after).length,updatedAtFields:(after.match(/"updated_at"\s*:/g)||[]).length,uiPreferenceWrites:window.__step4Writes}})()`);
  console.log("Экспорт",JSON.stringify(evidence.comparison));assert(evidence.comparison.identical);assert.equal(evidence.comparison.uiPreferenceWrites,0);
  await evaluate(page,`(()=>{
    window.__step4Live=state;state=guruExportDiagnosticCloneV223(state);
    window.__step4Flash=flashSaving;flashSaving=()=>{};
    window.__step4Save=saveState;saveState=()=>{};
    guruInvalidateGateViewCache();guruGateReadinessCache=new Map();nowGuideRender();
    return true;
  })()`);
  evidence.inputRefresh=[];
  for(const [gateId,id,value] of [["gate-0","card-7","https://example.test/catalog"],["gate-1","company_demand_positioning","1"],["gate-4","card-148","works"],["gate-4","smm_telegram_контент_посевы_12","hold"]]){
    console.log("Ввод",gateId,id);
    await select(gateId,id);
    const first=await evaluate(page,'nowGuideDisplayedMissing.findIndex(c=>!c.fallback)');assert(first>=0);
    await evaluate(page,`(()=>{window.__step4Filled=nowGuideDisplayedMissing[${first}];document.querySelector('[data-now-missing="${first}"]').click();return true})()`);
    await waitFor(page,'document.activeElement===nowGuideMissingNode(window.__step4Filled)');
    await evaluate(page,`(()=>{const field=nowGuideMissingNode(window.__step4Filled);field.value=${JSON.stringify(value)};if(field.tagName==="SELECT"&&!field.value){field.value=[...field.options].find(o=>guruStatusIsOk(o.value))?.value||field.options[1].value}field.dispatchEvent(new Event(field.tagName==="SELECT"?"change":"input",{bubbles:true}));return true})()`);
    await waitFor(page,'!nowGuideDisplayedMissing.some(c=>c.selector===window.__step4Filled.selector)');
    if(gateId==="gate-4")assert(await evaluate(page,'(()=>{const item=nowGuideCurrent(nowGuideDisplayedPath),badge=nowGuideFindNode(item).querySelector(".status-pill");return document.querySelector("#nowGuide .now-guide-status").textContent===badge.textContent&&guruNormBlockStatus([...badge.classList].find(c=>c!=="status-pill"&&c.startsWith("status-")).slice(7))===item.status})()'));
    if(id==="smm_telegram_контент_посевы_12")assert(await evaluate(page,'(()=>{const item=nowGuideCurrent(nowGuideDisplayedPath),headers=[...document.querySelectorAll(item.selector)];return headers.length>=2&&headers.every(h=>h.querySelector(".status-pill").textContent===document.querySelector("#nowGuide .now-guide-status").textContent)&&item.status==="not_required"&&document.querySelector("#nowGuide .now-guide-missing").textContent==="Не требуется"})()'));
    evidence.inputRefresh.push({gateId,id,updated:true});console.log("Ввод PASS",gateId,id);
  }
  await waitFor(page,'!guruUserEditDispatchActive');
  await evaluate(page,`(()=>{
    const id=state.project.gate0ScopeUiV194.selectedProductId;
    for(const record of state.project.gate0ScopedValuesV194)if(record.field==="positioning"&&record.product_id===id)record.value="";
    guruInvalidateGateViewCache();guruGateReadinessCache=new Map();renderGateNav({recalculate:false});nowGuideRender();return true;
  })()`);
  await select("gate-3","appeal");
  const sourceHint=await evaluate(page,'nowGuideDisplayedMissing.findIndex(c=>c.sourceItem)');assert(sourceHint>=0,"Gate 3: нет ссылки на редактор источника");
  await evaluate(page,`document.querySelector('[data-now-missing="${sourceHint}"]').click();true`);
  await waitFor(page,'activeGateId==="gate-0"&&document.activeElement?.classList.contains("now-guide-highlight")&&!document.activeElement.value');
  evidence.sourceNavigation={passed:true,gate:"gate-3",targetGate:"gate-0"};
  await shot("gate3-source");
  await evaluate(page,`(()=>{const field=document.activeElement;field.value="Авторский подарок ручной работы";field.dispatchEvent(new Event("input",{bubbles:true}));return true})()`);
  await waitFor(page,'nowGuideCurrent(nowGuideDisplayedPath)?.status==="ready"&&document.querySelector("#nowGuide .now-guide-missing").innerText==="Всё заполнено"');
  evidence.sourceNavigation.liveUpdate=true;
  await evaluate(page,`(()=>{state=window.__step4Live;flashSaving=window.__step4Flash;saveState=window.__step4Save;guruCancelDerivedRefresh();guruDiscardUiPreferenceSave(${JSON.stringify(copyId)});return true})()`);
  evidence.inputCopyRestored=await evaluate(page,'JSON.stringify({workspace:guruExportDiagnosticCloneV223(state)})===window.__step4Before');assert(evidence.inputCopyRestored);
  console.log("Errors",page.errors);assert.equal(page.errors.length,0);
  evidence.fallbackBlocks=evidence.transitions.filter(t=>t.details?.items?.some(c=>c.fallback)).map(({gate,id})=>({gate,id,title:evidence.matrices[gate].rows.find(r=>r.id===id).title}));
  writeFileSync(process.env.GURU_STEP4_QUICK === "1" ? "artifacts/gate34-now-readiness-focused-results.json" : "artifacts/gate34-now-readiness-results.json",JSON.stringify({passed:true,...evidence},null,2));console.log("Gate 3-4 readiness: PASS");
} finally {await browser.call("Target.disposeBrowserContext",{browserContextId});page.close();browser.close()}
