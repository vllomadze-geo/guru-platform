import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const port = process.env.GURU_CHROME_DEBUG_PORT || "9441";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const fixture = JSON.parse(readFileSync(process.env.GURU_GATE0_FIXTURE ||
  "/private/tmp/guru-now-korich-workspace.json", "utf8"));
const artifact = process.env.GURU_AUDIT_OUTPUT || "/private/tmp/guru-step31-audit.json";
const copyId = "gate12-readiness-audit-smoke";
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
    width: 1800, height: 1400, deviceScaleFactor: 1, mobile: false,
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

  await evaluate(page, `window.__auditRead = function(calculate) {
    const original=state, fast=guruFastGateNavigation, navigating=guruGateNavigationInProgress, micro=window.queueMicrotask, frame=window.requestAnimationFrame,
      idle=window.requestIdleCallback, prefs=guruScheduleUiPreferenceSave;
    state=guruExportDiagnosticCloneV223(state); guruFastGateNavigation=true;guruGateNavigationInProgress=true;
    window.queueMicrotask=()=>{}; window.requestAnimationFrame=()=>0; window.requestIdleCallback=()=>0;
    guruScheduleUiPreferenceSave=()=>{};
    try { return guruExportWithoutPersistenceV223(calculate); }
    finally { state=original; guruFastGateNavigation=fast;guruGateNavigationInProgress=navigating; window.queueMicrotask=micro; window.requestAnimationFrame=frame;
      window.requestIdleCallback=idle; guruScheduleUiPreferenceSave=prefs; }
  }; true`);
  await evaluate(page,'window.__auditBefore=JSON.stringify(state); guruApplyBrownCalculatorData=()=>{}; true');
  const inventory=await evaluate(page,`__auditRead(()=>{
    recalculateAllStatuses(state);
    const selected=state.project.gate0ScopeUiV194.selectedProductId;
    const list=(gateId)=>{
      const gate=state.gates.find(g=>g.id===gateId), statuses=guruGateBlockStatuses(gate);
      return nowGuideDescriptors(gate,statuses).map(item=>{
        const card=item.kind==='card'?gate.cards.find(c=>c.id===item.id):null;
        const product=Boolean(item.productId || item.scope==='product' || item.kind==='unit' ||
          (gateId==='gate-1' && (item.calculate?.endsWith('-product') || item.calculate==='product-demand' ||
            card && typeof gate1LandingCardKindV234==='function' && gate1LandingCardKindV234(card))));
        return {...item,status:guruNormBlockStatus(item.status),product,
          product_id:product?(item.kind==='unit' && typeof nowGuideGate1Assessment!=='function'?'all_products':selected):null};
      });
    };
    return {build:GURU_BUILD_INFO.version,selected,
      products:guruV194Products(state).map(({id,name,categoryId})=>({id,name,categoryId})),
      gate1:list('gate-1'),gate2:list('gate-2'),
      gates:state.gates.map(g=>({id:g.id,...guruGateReadiness(g)})),
      project: guruProjectReadiness(),
      passport:projectPassportOverviewFields().find(f=>f.label==='Готовность проекта')};
  })`);
  console.log('Списки рассчитаны', JSON.stringify(inventory.gates.filter(g=>['gate-1','gate-2'].includes(g.id))));
  const dom=await evaluate(page,`__auditRead(()=>{
    activeView='gate'; activeGateId='gate-1';
    const gate=state.gates.find(g=>g.id==='gate-1');
    if(typeof nowGuideGate1NavigationPending!=='undefined')nowGuideGate1NavigationPending=false;
    renderGate();
    const items=nowGuideDescriptors(gate,guruGateBlockStatuses(gate));
    return items.map(item=>{
      const node=nowGuideFindNode({...item,gateId:'gate-1'}), hidden=[];
      for(let p=node;p&&p!==els.contentArea;p=p.parentElement){const s=getComputedStyle(p);
        if(s.display==='none'||s.visibility==='hidden'||p.hidden)hidden.push({tag:p.tagName,cls:p.className,hidden:p.hidden,
          collapsible:p.matches('.g1-section-body, .g1-card-body, .project-comparison-body, .target-audience-body, .pv140-product-body')});}
      const card=node?.closest('[data-card]');
      return {id:item.id,kind:item.kind,found:Boolean(node),
        hidden,cardId:card?.dataset.card,editorKinds:card?[...new Set([...card.querySelectorAll('input,select,textarea')].flatMap(n=>Object.keys(n.dataset)))]:[]};
    });
  })`);
  console.log('Проверена видимость заголовков');
  const products=[];
  for(const product of inventory.products){
    const row=await evaluate(page,`__auditRead(()=>{
      const id=${JSON.stringify(product.id)}, item=guruV194Product(id,state);
      activeView='gate';activeGateId='gate-1';
      if(typeof nowGuideGate1NavigationPending!=='undefined')nowGuideGate1NavigationPending=false;
      const category=megaPlatformProductCategoryId(item)||'__uncategorized__';
      const categorySelect=document.querySelector('[data-gate0-scope-category-select]');
      if(!categorySelect)throw Error('Нет селектора категории');
      categorySelect.value=category;
      categorySelect.dispatchEvent(new Event('change',{bubbles:true}));
      const select=document.querySelector('[data-gate0-scope-product-select]');
      if(!select||![...select.options].some(option=>option.value===id))throw Error('Нет продукта '+id);
      select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}));
      if(state.project.gate0ScopeUiV194.selectedProductId!==id)throw Error('Не переключён продукт '+id);
      const gates=['gate-1','gate-2'].map(id=>({id,...guruGateReadiness(state.gates.find(g=>g.id===id))}));
      const productItems=nowGuideDescriptors(state.gates.find(g=>g.id==='gate-1'),guruGateBlockStatuses(state.gates.find(g=>g.id==='gate-1')));
      const missingHeaders=productItems.filter(item=>!nowGuideFindNode({...item,gateId:'gate-1'})).map(item=>item.id);
      return {product_id:id,name:item.name,viaUi:true,gates,missingHeaders};
    })`);
    products.push(row); console.log('Продукт',row.product_id,JSON.stringify(row.gates));
  }
  const menu=await evaluate(page,`__auditRead(()=>{
    activeView='project';activeGateId='gate-0';guruFastGateNavigation=false;
    guruGateReadinessCache=new Map();nowGuideExpanded.clear();
    renderProject();renderGateNav({recalculate:false});
    return {gates:[...document.querySelectorAll('#gateNav .gate-btn')].map(n=>({id:n.dataset.gateId,text:n.textContent.trim()})),
      passport:[...document.querySelectorAll('.project-overview-field')].find(n=>n.querySelector('h3')?.textContent==='Готовность проекта')?.querySelector('.project-overview-value')?.textContent};
  })`);
  page.frame=null;
  await page.call('Page.startScreencast',{format:'png',maxWidth:1800,maxHeight:1400,everyNthFrame:1});
  for(let attempt=0;attempt<40&&!page.frame?.data;attempt++)await wait(100);
  assert(page.frame?.data);
  writeFileSync(artifact.replace(/\.json$/,'.png'),Buffer.from(page.frame.data,'base64'));
  await page.call('Page.stopScreencast');
  const comparison=await evaluate(page,`(async()=>{
    const before=window.__auditBefore,after=JSON.stringify(state),differences=[];
    const scan=(a,b,path)=>{if(a===b||differences.length>=10)return;
      if(!a||!b||typeof a!=='object'||typeof b!=='object'){differences.push({path,before:a,after:b});return;}
      for(const k of new Set([...Object.keys(a),...Object.keys(b)]))scan(a[k],b[k],path+'.'+k);};
    if(before!==after)scan(JSON.parse(before),JSON.parse(after),'workspace');
    const bytes=s=>new TextEncoder().encode(s),hash=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');
    return {identical:before===after,differences,beforeBytes:bytes(before).length,afterBytes:bytes(after).length,
      beforeSha256:await hash(before),afterSha256:await hash(after),updatedAtFields:(after.match(/"updated_at"\s*:/g)||[]).length};
  })()`);
  assert(comparison.identical);
  for(const list of [inventory.gate1,inventory.gate2])assert.equal(new Set(list.map(row=>row.id)).size,list.length,'Повторный id в пути');
  for(const row of dom){assert(row.found,'Нет заголовка '+row.id);assert(row.hidden.every(p=>p.collapsible),'Скрытый блок '+row.id);}
  for(const row of products){assert(row.viaUi);assert.deepEqual(row.missingHeaders,[],'Нет заголовка после переключения '+row.product_id);for(const gate of row.gates)assert(gate.done<=gate.total);}
  for(const id of ['gate-1','gate-2'])assert(menu.gates.find(g=>g.id===id).text.includes(inventory.gates.find(g=>g.id===id).percent+'%'));
  assert.equal(page.errors.length,0,page.errors.join('\n'));
  writeFileSync(artifact,JSON.stringify({passed:true,inventory,dom,products,menu,comparison},null,2));
  console.log('Readiness inventory: PASS');
} finally {
  page.close(); await browser.call('Target.disposeBrowserContext',{browserContextId}); browser.close();
}
