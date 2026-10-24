import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const port = process.env.GURU_CHROME_DEBUG_PORT || "9431";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const fixture = JSON.parse(readFileSync(process.env.GURU_GATE0_FIXTURE ||
  "/private/tmp/guru-now-korich-workspace.json", "utf8"));
const artifact = process.env.GURU_GATE12_QUICK === "1" ? "/private/tmp/guru-step3-quick" : "artifacts/gate12-now-readiness";
const copyId = "gate12-now-readiness-smoke";
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

  const evidence = { matrices: {}, transitions: [], hints: {}, screenshots: [] };
  const select = async (gateId, id) => {
    await evaluate(page, `(() => {
      const path = nowGuideDisplayedPath;
      const item = path.find(item => item.gateId === ${JSON.stringify(gateId)} && item.id === ${JSON.stringify(id)});
      if (!item) throw new Error("Нет блока " + ${JSON.stringify(id)});
      nowGuideSelect(item, path); return true;
    })()`);
    await waitFor(page, `(() => {
      const item = nowGuideCurrent(nowGuideDisplayedPath); const node = nowGuideFindNode(item);
      const r = node?.getBoundingClientRect();
      return item?.id === ${JSON.stringify(id)} && guruRenderedGateId === ${JSON.stringify(gateId)} &&
        node?.classList.contains("now-guide-highlight") && r.top >= 0 && r.bottom <= innerHeight;
    })()`, process.env.GURU_GATE12_QUICK === "1" ? 20000 : 90000);
  };
  const matrix = (gateId) => evaluate(page, `(() => {
    const gateId = ${JSON.stringify(gateId)};
    const rows = nowGuideDisplayedPath.filter(item => item.gateId === gateId).map(item => {
      const header = nowGuideFindNode(item);
      const badge = header?.querySelector(".status-pill, [data-g2sb-status], .g2w-status");
      const classes = [...(badge?.classList || [])];
      const label = badge?.textContent.trim() || "";
      const raw = classes.find(name => name !== "status-pill" && name.startsWith("status-"))?.slice(7);
      const pageStatus = label.startsWith("Не требуется") || label.startsWith("Gate 0: Не требуется") ? "not_required"
        : raw ? guruNormBlockStatus(raw) : ({ "Готово":"ready", "В работе":"in_progress", "Не начато":"not_started", "Проблема":"problem" })[label];
      return { id: item.id, kind: item.kind, title: item.title, pageBadge: label,
        pageStatus: pageStatus || null, pathStatus: item.status, headerFound: Boolean(header) };
    });
    const gate = state.gates.find(g => g.id === gateId);
    const diagnostic = ${process.env.GURU_GATE12_QUICK === "1"} ? { navigationReadiness: { summary: guruGateReadiness(gate) } }
      : guruExportWithoutPersistenceV223(() => nowGuideGate12WithView(() =>
          guruExportGateDiagnosticsCurrentV223(gateId, guruExportRawCardStatusesV223(state)),
          guruExportDiagnosticCloneV223(state)));
    return { rows, summary: guruGateReadiness(gate), navigationReadiness: diagnostic.navigationReadiness.summary,
      menu: document.querySelector('[data-gate-id="' + gateId + '"] .small').textContent };
  })()`);
  const assertMatrix = (gateId, result) => {
    assert(result.rows.length > 0);
    for (const row of result.rows) {
      assert(row.headerFound, `${gateId} ${row.id}: нет заголовка`);
      assert.equal(row.pageStatus, row.pathStatus, `${gateId} ${row.id}: значок и путь`);
    }
    assert.equal(result.rows.length, result.summary.total);
    assert.equal(result.rows.filter(row => ["ready", "not_required"].includes(row.pathStatus)).length, result.summary.done);
    assert.equal(result.summary.total, result.navigationReadiness.total);
    assert.equal(result.summary.done, result.navigationReadiness.done);
    assert(result.menu.includes(`${result.summary.percent}%`));
  };
  const shot = async (label) => {
    await evaluate(page, `(() => {
      const gate = document.querySelector('[data-gate-id="' + activeGateId + '"]');
      if (gate) gate.scrollIntoView({ block: "nearest", behavior: "instant" });
      return true;
    })()`);
    page.frame = null;
    await page.call("Page.startScreencast", { format: "png", maxWidth: 1800, maxHeight: 1000, everyNthFrame: 1 });
    for (let attempt = 0; attempt < 30 && !page.frame?.data; attempt++) await wait(100);
    assert(page.frame?.data);
    const filename = `${artifact}-${label}.png`;
    writeFileSync(filename, Buffer.from(page.frame.data, "base64"));
    await page.call("Page.stopScreencast");
    evidence.screenshots.push(filename);
  };
  await evaluate(page, `(() => {
    window.__gate12Before = JSON.stringify({workspace:guruExportDiagnosticCloneV223(state)});
    window.__gate12UiWrites = 0;
    const schedule = guruScheduleUiPreferenceSave;
    guruScheduleUiPreferenceSave = function(...args) { window.__gate12UiWrites++; return schedule.apply(this,args); };
    return true;
  })()`);
  for (const gateId of ["gate-1", "gate-2"]) {
    const ids = await evaluate(page, `nowGuideDisplayedPath.filter(item => item.gateId === ${JSON.stringify(gateId)}).map(item=>item.id)`);
    for (const id of (process.env.GURU_GATE12_QUICK === "1" ? ids.filter((id,index)=>index===0||id==="unit-economics") : ids)) {
      console.log("Переход", gateId, id);
      await select(gateId, id);
      const transition = await evaluate(page, `(() => {
        const item = nowGuideCurrent(nowGuideDisplayedPath); const node = nowGuideFindNode(item);
        const details = nowGuideMissingDetails(item);
        return { gate: item.gateId, id: item.id, title: item.title, status: item.status,
          highlighted: node.classList.contains("now-guide-highlight"), details };
      })()`);
      assert(transition.highlighted);
      evidence.transitions.push(transition);
    }
    evidence.matrices[gateId] = await matrix(gateId);
    console.log("Матрица", JSON.stringify(evidence.matrices[gateId]));
    assertMatrix(gateId, evidence.matrices[gateId]);
  }
  await select("gate-1", "company_demand_positioning");
  await evaluate(page, 'document.querySelector("#nowGuide [data-now-missing]").click(); true');
  await waitFor(page, `(() => { const field=nowGuideMissingNode(nowGuideDisplayedMissing[0]); const r=field?.getBoundingClientRect();
    return field===document.activeElement && !field.value && r.top>=0 && r.bottom<=innerHeight; })()`);
  evidence.hints.gate1 = await evaluate(page, '({items:nowGuideDisplayedMissing,focused:document.activeElement.classList.contains("now-guide-highlight")})');
  await shot("gate1-field");
  await select("gate-2", "company-domain");
  const stepHints = await evaluate(page, 'nowGuideDisplayedMissing');
  assert(stepHints[0].label.startsWith("Шаг 01:"));
  assert(stepHints.some(item=>item.label.startsWith("Шаг 03:")));
  assert.equal(await evaluate(page, 'document.querySelectorAll("#nowGuide [data-now-missing]").length'), 3);
  assert(await evaluate(page, 'document.querySelector("#nowGuide .now-guide-missing").innerText.includes("и ещё ")'));
  await evaluate(page, 'document.querySelectorAll("#nowGuide [data-now-missing]")[2].click(); true');
  await waitFor(page, `(() => { const node=nowGuideMissingNode(nowGuideDisplayedMissing[2]); const r=node?.getBoundingClientRect();
    return node?.classList.contains("now-guide-highlight") && node.closest("details").open && r.top>=0 && r.top<innerHeight; })()`);
  evidence.hints.gate2 = stepHints;
  await shot("gate2-step03");
  const skipped = evidence.matrices["gate-2"].rows.find(row => row.pathStatus === "not_required");
  assert(skipped);
  await select("gate-2", skipped.id);
  assert.equal(await evaluate(page, 'document.querySelector("#nowGuide .now-guide-missing").textContent'), "Не требуется");
  assert(await evaluate(page, 'document.querySelector("#nowGuide [data-now-next]").classList.contains("is-ready")'));
  await shot("gate2-not-required");
  evidence.noOldGate2 = await evaluate(page, `(() => {
    const items = nowGuideDisplayedPath.filter(item=>item.gateId==="gate-2");
    return { count:items.length, legacyCards:items.filter(item=>item.kind==="card"),
      allVisible:items.every(item=>Boolean(nowGuideFindNode(item))) };
  })()`);
  assert.equal(evidence.noOldGate2.legacyCards.length,0);
  assert(evidence.noOldGate2.allVisible);
  evidence.laterGatesHidden = await evaluate(page, `(() => {
    const old=nowGuideReviewKey, path=nowGuideDisplayedPath;
    const result=[...new Set(path.filter(item=>Number(item.gateId.slice(5))>=3).map(item=>item.gateId))].map(gateId=>{
      nowGuideReviewKey=path.find(item=>item.gateId===gateId).key; nowGuideRender(path);
      return { gateId, hidden:!document.querySelector("#nowGuide .now-guide-missing") };
    }); nowGuideReviewKey=old; nowGuideRender(path); return result;
  })()`);
  assert(evidence.laterGatesHidden.every(item=>item.hidden));
  evidence.exportComparison = await evaluate(page, `(async()=>{
    const before=window.__gate12Before, after=JSON.stringify({workspace:guruExportDiagnosticCloneV223(state)});
    const differences=[];
    const scan=(a,b,path)=>{ if(a===b || differences.length>=20)return;
      if(!a || !b || typeof a!=="object" || typeof b!=="object") { differences.push({path,before:a,after:b}); return; }
      for(const k of new Set([...Object.keys(a),...Object.keys(b)])) scan(a[k],b[k],path+"."+k); };
    if(before!==after)scan(JSON.parse(before),JSON.parse(after),"export");
    const bytes=s=>new TextEncoder().encode(s), hash=async s=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes(s)))].map(b=>b.toString(16).padStart(2,"0")).join("");
    return { identical:before===after,differences,beforeBytes:bytes(before).length,afterBytes:bytes(after).length,
      beforeSha256:await hash(before),afterSha256:await hash(after),
      updatedAtFields:(after.match(/"updated_at"\s*:/g)||[]).length,uiPreferenceWrites:window.__gate12UiWrites,
      passiveCalculators:nowGuideGate1PassiveCalculators };
  })()`);
  console.log("Экспорт",JSON.stringify(evidence.exportComparison));
  assert(evidence.exportComparison.identical,"Просмотр изменил экспорт проекта");
  assert.equal(evidence.exportComparison.uiPreferenceWrites,0);
  assert.equal(page.errors.length,0,page.errors.join("\n"));
  assert.deepEqual(page.dialogs,[]);
  // Edits run on a separate memory copy with persistence disabled. This
  // also verifies that private rendering did not retain scratch handlers.
  await evaluate(page, `(() => {
    window.__gate12Live=state; state=guruExportDiagnosticCloneV223(state);
    window.__gate12Flash=flashSaving; flashSaving=()=>{};
    window.__gate12Nav=renderGateNav; renderGateNav=()=>{};
    return true;
  })()`);
  await select("gate-1","company_demand_positioning");
  await evaluate(page, `(() => {
    const check=nowGuideDisplayedMissing[0]; window.__gate12FilledCheck=check;
    document.querySelector('#nowGuide [data-now-missing]').click(); return true;
  })()`);
  await waitFor(page,'document.activeElement===nowGuideMissingNode(window.__gate12FilledCheck)');
  await evaluate(page, `(() => {
    const field=nowGuideMissingNode(window.__gate12FilledCheck);
    field.value='1'; field.dispatchEvent(new Event('input',{bubbles:true})); return true;
  })()`);
  await waitFor(page,'!nowGuideDisplayedMissing.some(item=>item.selector===window.__gate12FilledCheck.selector)');
  evidence.inputRefresh=await evaluate(page,'({passed:true,removed:window.__gate12FilledCheck.label})');
  await select("gate-1","unit-economics");
  await waitFor(page,`[...document.querySelectorAll('iframe[data-brown-calculator]')].some(frame=>frame.contentDocument?.querySelector('[data-path="pricing.actual"]'))`);
  await evaluate(page, `(() => {
    const frame=[...document.querySelectorAll('iframe[data-brown-calculator]')].find(frame=>frame.contentDocument?.querySelector('[data-path="pricing.actual"]'));
    window.__gate12EditedFrame=frame; window.__gate12CalculatorKey=new URL(frame.src).searchParams.get('key');
    const input=frame.contentDocument.querySelector('[data-path="pricing.actual"]'); input.value='8123';
    input.dispatchEvent(new frame.contentWindow.Event('input',{bubbles:true}));
    input.dispatchEvent(new frame.contentWindow.Event('change',{bubbles:true})); return true;
  })()`);
  await waitFor(page,`state.unitV130.items.find(item=>String(item.productKey||item.sourceItemId||item.name||'unit').trim()===window.__gate12CalculatorKey)?.steps.revenue.avgCheck==='8123'`);
  evidence.calculatorEdit=await evaluate(page,`(() => {
    nowGuideEditedCalculatorWindows.delete(window.__gate12EditedFrame.contentWindow);
    state=window.__gate12Live; flashSaving=window.__gate12Flash; renderGateNav=window.__gate12Nav;
    return {passed:true,originalRestored:JSON.stringify({workspace:guruExportDiagnosticCloneV223(state)})===window.__gate12Before};
  })()`);
  assert(evidence.calculatorEdit.originalRestored);
  evidence.fallbackBlocks = evidence.transitions.filter(item=>item.details?.items?.some(check=>check.fallback))
    .map(({gate,id,title})=>({gate,id,title}));
  evidence.build=await evaluate(page,'GURU_BUILD_INFO.version');
  writeFileSync(`${artifact}-results.json`,JSON.stringify({passed:true,...evidence},null,2)+"\n");
  console.log("Gate 1 and Gate 2 guide smoke: PASS");
} catch (error) {
  console.error("Состояние сбоя", JSON.stringify(await evaluate(page, `(() => {
    const item=nowGuideCurrent(nowGuideDisplayedPath), node=nowGuideFindNode(item);
    return {activeGateId,guruRenderedGateId,pending:nowGuideGate1NavigationPending,current:item,
      rect:node?.getBoundingClientRect().toJSON(),node:node?.outerHTML.slice(0,500),
      headers:[...document.querySelectorAll('[data-gate1-toggle-section]')].map(n=>n.dataset.gate1ToggleSection),
      body:els.contentArea.innerHTML.slice(0,1200)};
  })()`).catch(()=>null)));
  console.error("Ошибки браузера", JSON.stringify(page.errors));
  throw error;
} finally {
  page.close(); await browser.call("Target.disposeBrowserContext",{browserContextId}); browser.close();
}
