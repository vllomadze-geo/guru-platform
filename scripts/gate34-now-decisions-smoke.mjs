import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const port = process.env.GURU_CHROME_DEBUG_PORT || "9461";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const fixture = JSON.parse(readFileSync(process.env.GURU_GATE0_FIXTURE ||
  "/private/tmp/guru-now-korich-workspace.json", "utf8"));

const copyId = "gate34-now-decisions-smoke";
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
    assert(page.frame?.data);const name=`artifacts/gate34-now-decisions-${label}.png`;
    writeFileSync(name,Buffer.from(page.frame.data,"base64"));await page.call("Page.stopScreencast");evidence.screenshots.push(name);
  };
  await evaluate(page,`(()=>{window.__step41Before=JSON.stringify({workspace:guruExportDiagnosticCloneV223(state)});window.__step41Writes=0;const save=guruScheduleUiPreferenceSave;guruScheduleUiPreferenceSave=function(...a){window.__step41Writes++;return save.apply(this,a)};return true})()`);

  evidence.statusesBefore=await evaluate(page,'nowGuideDisplayedPath.filter(i=>["gate-3","gate-4"].includes(i.gateId)).map(i=>({gate:i.gateId,id:i.id,status:i.status}))');
  evidence.summaryBefore=await evaluate(page,'nowGuidePlainRead(()=>Object.fromEntries(["gate-3","gate-4"].map(id=>[id,guruGateReadiness(state.gates.find(g=>g.id===id))])))');
  await select("gate-3","advocate");
  evidence.advocate=await evaluate(page,'({details:nowGuideMissingDetails(nowGuideCurrent(nowGuideDisplayedPath)),text:document.querySelector("#nowGuide .now-guide-missing").innerText,nextEnabled:!document.querySelector("[data-now-next]").disabled,nextHighlighted:document.querySelector("[data-now-next]").classList.contains("is-ready")})');
  assert(evidence.advocate.text.includes('Результат клиента: источник удалён'));
  assert(evidence.advocate.text.includes('Основания рекомендовать: источник удалён'));
  assert(evidence.advocate.text.includes('Повтор / LTV: Gate 1'));
  assert(evidence.advocate.details.needsDecision&&evidence.advocate.nextEnabled&&evidence.advocate.nextHighlighted);
  await shot('advocate');
  evidence.audit=[];
  const ids=['pr_publications','articles_cases','yandex_organization','google_organization','online_chat','online_payment','abandoned_cart','email_crm','review_collection','referral','loyalty','платная_реклама_яндекс_директ_рся_1','promo_landing','платная_реклама_яндекс_директ_поиск_0','product_gallery','vk_retargeting','buyer_retargeting'];
  for(const id of ids){
    console.log('Проверка',id);await select('gate-4',id);
    const row=await evaluate(page,'nowGuideWithReadPass(()=>{const item=nowGuideCurrent(nowGuideDisplayedPath);return {id:item.id,title:item.title,status:item.status,controls:nowGuideGate4Controls(item),details:nowGuideMissingDetails(item),text:document.querySelector("#nowGuide .now-guide-missing").innerText,nextEnabled:!document.querySelector("[data-now-next]").disabled,nextHighlighted:document.querySelector("[data-now-next]").classList.contains("is-ready")}})');
    assert(!row.text.includes('Заполните блок'),id);
    if(!row.controls.length){assert.equal(row.text,'Нет поля для заполнения: нужно решение');assert(row.details.needsDecision&&row.nextEnabled&&row.nextHighlighted,id)}
    else {
      assert(row.details.items.length>0,id);
      // Every displayed hint must reach its actual existing control.
      for(let index=0;index<Math.min(3,row.details.items.length);index++){
        await evaluate(page,`document.querySelector('[data-now-missing="${index}"]').click();true`);
        await waitFor(page,`(()=>{const c=nowGuideDisplayedMissing[${index}],n=nowGuideMissingNode(c);return n&&document.activeElement===n&&n.classList.contains('now-guide-highlight')&&n.getBoundingClientRect().top>=0&&n.getBoundingClientRect().bottom<=innerHeight})()`);
      }
      row.focused=true;
    }
    if(id==='referral'){assert(row.text.includes('Выберите статус реализации'));assert(row.controls.some(c=>c.statusControl&&c.options.some(o=>o.value==='not_required')));await shot('status-selector')}
    if(id==='online_chat'){
      await shot('no-field-next');
      await evaluate(page,'document.querySelector("[data-now-next]").click();true');
      await waitFor(page,'nowGuideCurrent(nowGuideDisplayedPath)?.id==="online_payment"&&nowGuideFindNode(nowGuideCurrent(nowGuideDisplayedPath))?.classList.contains("now-guide-highlight")');
      row.nextMovedTo='online_payment';
    }
    evidence.audit.push(row);
  }
  evidence.statusesAfter=await evaluate(page,'nowGuideBuildPath().filter(i=>["gate-3","gate-4"].includes(i.gateId)).map(i=>({gate:i.gateId,id:i.id,status:i.status}))');
  evidence.summaryAfter=await evaluate(page,'nowGuidePlainRead(()=>Object.fromEntries(["gate-3","gate-4"].map(id=>[id,guruGateReadiness(state.gates.find(g=>g.id===id))])))');
  assert.deepEqual(evidence.statusesAfter,evidence.statusesBefore);assert.deepEqual(evidence.summaryAfter,evidence.summaryBefore);
  evidence.comparison=await evaluate(page,`(async()=>{const before=window.__step41Before,after=JSON.stringify({workspace:guruExportDiagnosticCloneV223(state)});const hash=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(b=>b.toString(16).padStart(2,'0')).join('');return {identical:before===after,beforeSha256:await hash(before),afterSha256:await hash(after),bytes:new TextEncoder().encode(after).length,updatedAtFields:(after.match(/"updated_at"\\s*:/g)||[]).length,uiPreferenceWrites:window.__step41Writes}})()`);
  assert(evidence.comparison.identical,JSON.stringify(evidence.comparison));assert.equal(evidence.comparison.uiPreferenceWrites,0);
  evidence.build=await evaluate(page,'GURU_BUILD_INFO.version');
  evidence.errors=page.errors;assert.deepEqual(page.errors,[]);
  writeFileSync('artifacts/gate34-now-decisions-results.json',JSON.stringify({passed:true,...evidence},null,2));
  console.log('Gate 3-4 decisions: PASS',JSON.stringify(evidence.comparison));
} finally {await browser.call("Target.disposeBrowserContext",{browserContextId});page.close();browser.close()}
