import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const port = process.env.GURU_CHROME_DEBUG_PORT || "9362";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const fixtures = [
  ["icleaning", process.env.GURU_NOW_ICLEANING_FIXTURE || "/private/tmp/guru-now-icleaning-workspace.json"],
  ["korichnoe-yabloko", process.env.GURU_NOW_KORICH_FIXTURE || "/private/tmp/guru-now-korich-workspace.json"],
].filter(([label]) => !process.env.GURU_NOW_ONLY || process.env.GURU_NOW_ONLY === label);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const seedText = readFileSync(new URL("../seed-data.js", import.meta.url), "utf8");
const seed = JSON.parse(seedText.match(/window\.GURU_SEED = (\{[\s\S]*\});?\s*$/)[1]);

function fixture(label, filename) {
  if (existsSync(filename)) return JSON.parse(readFileSync(filename, "utf8"));
  const copy = structuredClone(seed);
  copy.project.name = label === "icleaning" ? "iCleaning" : "Коричное яблоко";
  return copy;
}

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.errors = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.method === "Runtime.exceptionThrown")
        this.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
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
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
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
await browser.ready;
const results = [];

try {
  for (const [label, filename] of fixtures) {
    const workspace = fixture(label, filename);
    const copyId = `now-guide-smoke-${label}`;
    const { browserContextId } = await browser.call("Target.createBrowserContext");
    const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const target = targets.find((item) => item.id === targetId);
    const page = new Cdp(target.webSocketDebuggerUrl);
    await page.ready;
    try {
      await page.call("Runtime.enable");
      await page.call("Page.enable");
      await page.call("Emulation.setDeviceMetricsOverride", {
        width: 1800, height: 900, deviceScaleFactor: 1, mobile: false,
      });
      await page.call("Page.addScriptToEvaluateOnNewDocument", {
        source: `{
          const nativeFetch = window.fetch.bind(window);
          window.fetch = (input, init) => String(input).includes("/api/")
            ? Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200,
                headers: { "Content-Type": "application/json" } })) : nativeFetch(input, init);
          window.__nowErrors = [];
          window.addEventListener("error", event => window.__nowErrors.push(event.message));
          window.addEventListener("unhandledrejection", event =>
            window.__nowErrors.push(String(event.reason?.message || event.reason)));
        }`,
      });
      await page.call("Page.navigate", { url: appUrl });
      await waitFor(page, 'document.readyState === "complete" && typeof nowGuideBuildPath === "function"');
      await evaluate(page, `(() => {
        const workspace = ${label === "icleaning" ? JSON.stringify(workspace) : "structuredClone(window.GURU_SEED)"};
        workspace.project.id = ${JSON.stringify(copyId)};
        workspace.project.name = ${JSON.stringify(workspace.project.name)};
        localStorage.clear();
        localStorage.setItem("guru-platform-access-v01", "unlocked");
        localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
          id: ${JSON.stringify(copyId)}, name: workspace.project.name,
          lifecycleStatus: "active", createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }]));
        localStorage.setItem("guru-platform-workspace-v02-" + ${JSON.stringify(copyId)},
          JSON.stringify(workspace));
        location.reload();
        return true;
      })()`);
      await waitFor(page, 'document.querySelector("[data-open-project]")');
      await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
      await waitFor(page, `activeProjectId === ${JSON.stringify(copyId)} && document.querySelector("#nowGuide .now-guide-block, #nowGuide .now-guide-finished")`);
      if (label !== "icleaning") {
        await evaluate(page, `(() => {
          const source = ${JSON.stringify(workspace)};
          source.project.id = ${JSON.stringify(copyId)};
          guruExportWithoutPersistenceV223(() => {
            state = migrateWorkspace(source, ${JSON.stringify(copyId)});
            guruGateReadinessCache = new Map();
            activeView = "project";
            render();
          });
          return true;
        })()`);
        await waitFor(page, 'state.project.name === "Коричное яблоко" && document.querySelector("#nowGuide .now-guide-block, #nowGuide .now-guide-finished")');
      }
      if (label === "icleaning") {
        await evaluate(page, 'guruNavigateToGate("gate-0"); true');
        await waitFor(page, 'activeGateId === "gate-0" && guruRenderedGateId === "gate-0"');
        await evaluate(page, 'guruCancelDerivedRefresh(); true');
      }
      const initial = await evaluate(page, `(() => {
        const path = nowGuideBuildPath();
        const all = nowGuideBuildAllBlocks();
        const diagnostics = ${process.env.GURU_NOW_SKIP_DIAG === "1"
          ? "Object.fromEntries(state.gates.map(gate => [gate.id, { navigationReadiness: { summary: guruGateReadiness(gate) } }]))"
          : "guruExportAllGateDiagnosticsFreshV223(state)"};
        const summary = Object.values(diagnostics).reduce((out, gate) => {
          out.total += gate.navigationReadiness.summary.total;
          out.done += gate.navigationReadiness.summary.done;
          return out;
        }, { total: 0, done: 0 });
        const done = path.filter(item => ["ready", "not_required"].includes(item.status)).length;
        const perGate = Object.entries(diagnostics).map(([id, gate]) => ({
          id, total: gate.navigationReadiness.summary.total,
          done: gate.navigationReadiness.summary.done,
          path: path.filter(item => item.gateId === id).length,
          all: all.filter(item => item.gateId === id).length,
        }));
        const gate0Path = path.filter(item => item.gateId === "gate-0");
        const gate0Cards = state.gates.find(gate => gate.id === "gate-0")?.cards || [];
        const hiddenGate0InPath = gate0Path.filter(item => {
          const card = gate0Cards.find(card => card.id === item.id);
          return card?._merged || isOfferPsychCard(card) || guruPassportMovedGate0CardV527(card);
        }).map(item => item.id);
        const hiddenGate1InPath = path.some(item => item.gateId === "gate-1" && item.id === "demand-route");
        return { project: state.project.name, pathTotal: path.length, pathDone: done,
          diagnosticTotal: summary.total, diagnosticDone: summary.done,
          registryTotal: all.length, registryDone: all.filter(item => ["ready", "not_required"].includes(item.status)).length,
          launchReadiness: guruProjectReadiness(),
          perGate, hiddenGate0InPath, hiddenGate1InPath,
          card: document.querySelector("#nowGuide")?.innerText,
          errors: window.__nowErrors,
          productId: state.project.gate0ScopeUiV194?.selectedProductId || "",
          products: guruV194Products(state).map(item => ({ id: item.id, name: item.name, categoryId: item.categoryId })),
        };
      })()`);
      console.log(label, JSON.stringify(initial.perGate));
      assert.equal(initial.registryTotal, initial.diagnosticTotal, `${label}: registry total differs from diagnostics`);
      assert.equal(initial.pathTotal, initial.launchReadiness.total);
      assert.equal(initial.pathDone, initial.launchReadiness.done);
      assert(initial.perGate.filter(item => Number(item.id.slice(5)) < 4).every(item => item.path === item.total));
      assert(initial.perGate.filter(item => Number(item.id.slice(5)) > 4).every(item => item.path === 0));
      assert.equal(initial.registryDone, initial.diagnosticDone, `${label}: registry done differs from diagnostics`);
      assert.deepEqual(initial.hiddenGate0InPath, [], `${label}: hidden Gate 0 card in path`);
      assert.equal(initial.hiddenGate1InPath, false, `${label}: hidden Gate 1 route in path`);
      if (label === "korichnoe-yabloko")
        assert.equal(initial.perGate.find(item => item.id === "gate-0")?.path, 9);
      assert.equal(initial.errors.length, 0, `${label}: browser errors`);
      console.log(`${label}: initial checks complete`);
      if (process.env.GURU_NOW_DIAG_ONLY === "1") {
        results.push({ label, ...initial });
        console.log(`${label}: M=${initial.pathTotal}, done=${initial.pathDone}, diagnostics=${initial.diagnosticTotal}/${initial.diagnosticDone}`);
        continue;
      }
      await evaluate(page, 'guruCancelDerivedRefresh(); true');
      const beforeBytes = await evaluate(page,
        '(window.__nowExportBefore = JSON.stringify({ workspace: guruExportDiagnosticCloneV223(state) })).length');
      const screenshot = await page.call("Page.captureScreenshot", {
        format: "png", captureBeyondViewport: false,
        clip: { x: 0, y: 0, width: 370, height: 900, scale: 1 },
      });
      writeFileSync(`artifacts/now-guide-${label}.png`, Buffer.from(screenshot.data, "base64"));
      console.log(`${label}: screenshot saved`);
      const exportComparison = await evaluate(page, `(() => {
        const after = JSON.stringify({ workspace: guruExportDiagnosticCloneV223(state) });
        const before = window.__nowExportBefore;
        let at = 0;
        if (before !== after) while (at < before.length && at < after.length && before[at] === after[at]) at++;
        const result = { same: window.__nowExportBefore === after,
          beforeBytes: ${beforeBytes}, afterBytes: after.length,
          firstDifferentByte: before === after ? -1 : at,
          beforeExcerpt: before === after ? "" : before.slice(Math.max(0, at - 45), at + 100),
          afterExcerpt: before === after ? "" : after.slice(Math.max(0, at - 45), at + 100) };
        return result;
      })()`);
      if (!exportComparison.same) console.log(`${label}: export difference`, JSON.stringify(exportComparison));
      assert.equal(exportComparison.same, true, `${label}: screenshot changed exported workspace`);
      console.log(`${label}: export identical`);
      if (label === "icleaning") await evaluate(page, `(() => {
        const journal = ensureGate7State();
        for (let index = 0; index < 3; index++) journal.tasks.push({
          id: "now-guide-check-" + index, sectionId: "new", order: index,
          task: "Проверка перехода " + (index + 1), status: "not_started",
          date: "", where: "", result: "", createdAt: "2026-01-01T00:00:00.000Z",
        });
        guruCancelDerivedRefresh();
        window.__nowExportBefore = JSON.stringify({ workspace: guruExportDiagnosticCloneV223(state) });
        return true;
      })()`);
      else await evaluate(page, `(async () => {
        const exported = JSON.stringify({ workspace: guruExportDiagnosticCloneV223(state) });
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(exported));
        window.__nowHashBefore = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
        window.__nowBytesBefore = exported.length;
        window.__nowExportBefore = null;
        return true;
      })()`);
      const tenTransitions = [];
      const actions = label === "icleaning" ? [
        "gate0-second", "next", "prev", "current", "gate4-first",
        "prev", "next", "current", "gate4-last", "prev",
      ] : [
        "gate2-first", "next", "prev", "next", "next",
        "prev", "next", "next", "prev", "next",
      ];
      for (const [index, action] of actions.entries()) {
        console.log(`${label}: selecting transition ${index + 1} ${action}`);
        const selected = await evaluate(page, `(() => {
          const path = window.__nowSmokePath || (window.__nowSmokePath = nowGuideBuildPath());
          const action = ${JSON.stringify(action)};
          if (action === "gate0-second")
            nowGuideSelect(path.filter(item => item.gateId === "gate-0")[1], path);
          else if (action === "gate2-first")
            nowGuideSelect(path.find(item => item.gateId === "gate-2"), path);
          else if (action === "gate4-first" || action === "gate4-last")
            nowGuideSelect(path.filter(item => item.gateId === "gate-4")[action === "gate4-first" ? 0 : path.filter(item => item.gateId === "gate-4").length - 1], path);
          else document.querySelector('[data-now-' + action + ']')?.click();
          const item = path.find(entry => entry.key === nowGuideReviewKey);
          window.__nowSmokeTarget = item;
          return { key: item.key, gateId: item.gateId, title: item.title, kind: item.kind };
        })()`);
        await waitFor(page, `(() => {
          const item = window.__nowSmokeTarget;
          const node = nowGuideFindNode(item);
          const rect = node?.getBoundingClientRect();
          const expanded = item.gateId === "gate-0"
            ? node?.closest("details.gate0-card")?.open === true
            : item.gateId === "gate-7"
              ? node?.closest(".gate7-section")?.classList.contains("is-open") : true;
          return item?.key === ${JSON.stringify(selected.key)} &&
            activeGateId === item.gateId && guruRenderedGateId === item.gateId &&
            expanded && node?.classList.contains("now-guide-highlight") &&
            rect && rect.top >= 0 && rect.top < innerHeight - 55 && rect.bottom > 55;
        })()`, 120000);
        const evidence = await evaluate(page, `(() => {
          const item = window.__nowSmokeTarget;
          const node = nowGuideFindNode(item);
          const rect = node.getBoundingClientRect();
          return { action: ${JSON.stringify(action)}, gate: item.gateId,
            title: item.title, expanded: item.gateId === "gate-0"
              ? node.closest("details.gate0-card")?.open === true
              : item.gateId === "gate-7"
                ? node.closest(".gate7-section")?.classList.contains("is-open") : true,
            headingVisible: rect.top >= 0 && rect.top < innerHeight - 55 && rect.bottom > 55,
            highlighted: node.classList.contains("now-guide-highlight"),
            headingTop: Math.round(rect.top),
            exportUnchanged: ${label === "icleaning" ?
              "window.__nowExportBefore === JSON.stringify({ workspace: guruExportDiagnosticCloneV223(state) })" :
              "null"} };
        })()`);
        tenTransitions.push(evidence);
        if (label === "icleaning") assert.equal(evidence.exportUnchanged, true,
          `${label}: transition ${index + 1} changed exported workspace`);
        console.log(`${label}: transition ${index + 1} ${action} ${evidence.gate} top=${evidence.headingTop}`);
        if (label === "icleaning" && (index === 0 || index === 8)) {
          const gate = index === 0 ? "gate0" : "gate4";
          const shot = await page.call("Page.captureScreenshot", {
            format: "png", captureBeyondViewport: false,
          });
          writeFileSync(`artifacts/now-guide-${label}-${gate}.png`, Buffer.from(shot.data, "base64"));
        }
      }
      const tenTransitionExportComparison = await evaluate(page, `${label === "icleaning" ? `(() => {
        const before = window.__nowExportBefore;
        const after = JSON.stringify({ workspace: guruExportDiagnosticCloneV223(state) });
        let firstDifferentByte = 0;
        if (before !== after)
          while (firstDifferentByte < before.length && firstDifferentByte < after.length &&
            before[firstDifferentByte] === after[firstDifferentByte]) firstDifferentByte++;
        return { same: before === after, beforeBytes: before.length, afterBytes: after.length,
          firstDifferentByte: before === after ? -1 : firstDifferentByte,
          beforeExcerpt: before === after ? "" : before.slice(firstDifferentByte, firstDifferentByte + 120),
          afterExcerpt: before === after ? "" : after.slice(firstDifferentByte, firstDifferentByte + 120) };
      })()` : `(async () => {
        const after = JSON.stringify({ workspace: guruExportDiagnosticCloneV223(state) });
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(after));
        const afterSha256 = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
        return { same: window.__nowHashBefore === afterSha256 && window.__nowBytesBefore === after.length,
          beforeBytes: window.__nowBytesBefore, afterBytes: after.length,
          beforeSha256: window.__nowHashBefore, afterSha256 };
      })()`}`);
      console.log(`${label}: ten transitions export`, JSON.stringify(tenTransitionExportComparison));
      assert.equal(tenTransitionExportComparison.same, true,
        `${label}: ten guide transitions changed exported workspace`);
      const gate2Target = await evaluate(page, `(() => {
        const path = nowGuideBuildPath();
        const item = path.find(entry => entry.gateId === "gate-2");
        nowGuideSelect(item, path);
        return item.key;
      })()`);
      await waitFor(page, `(() => {
        const item = nowGuideCurrent(nowGuideBuildPath());
        const node = nowGuideFindNode(item);
        const rect = node?.getBoundingClientRect();
        return item?.key === ${JSON.stringify(gate2Target)} &&
          activeGateId === "gate-2" && guruRenderedGateId === "gate-2" &&
          node?.classList.contains("now-guide-highlight") &&
          rect && rect.top >= 0 && rect.top < innerHeight - 55 && rect.bottom > 55;
      })()`, 120000);
      if (label === "icleaning") {
        const gate2Shot = await page.call("Page.captureScreenshot", {
          format: "png", captureBeyondViewport: false,
        });
        writeFileSync(`artifacts/now-guide-${label}-gate2.png`, Buffer.from(gate2Shot.data, "base64"));
      }
      let korichTarget = null;
      if (label === "korichnoe-yabloko" && process.env.GURU_NOW_KORICH_NAV === "1") {
        const selected = await evaluate(page, `(() => {
          const path = nowGuideBuildPath();
          const item = path.find(entry => entry.gateId === "gate-0" && entry.id === "card-2");
          nowGuideSelect(item, path);
          return { key: item.key, gateId: item.gateId };
        })()`);
        await waitFor(page, `(() => {
          const item = ${JSON.stringify({ gateId: selected.gateId, id: "card-2", kind: "card" })};
          const node = nowGuideFindNode(item);
          const rect = node?.getBoundingClientRect();
          return activeGateId === item.gateId && guruRenderedGateId === item.gateId &&
            rect && rect.top >= 0 && rect.top < innerHeight - 55;
        })()`, 45000);
        korichTarget = await evaluate(page, `(() => {
          const node = nowGuideFindNode({ gateId: "gate-0", kind: "card", id: "card-2" });
          const rect = node.getBoundingClientRect();
          return { key: ${JSON.stringify(selected.key)}, gate: activeGateId,
            headingTop: Math.round(rect.top), headingBottom: Math.round(rect.bottom),
            viewportHeight: innerHeight, scrollY: Math.round(scrollY),
            expanded: node.closest("details.gate0-card")?.open === true,
            highlighted: node.classList.contains("now-guide-highlight") };
        })()`);
        assert.equal(korichTarget.expanded, true, "korichnoe-yabloko: Gate 0 card stayed closed");
        assert.equal(korichTarget.highlighted, true, "korichnoe-yabloko: Gate 0 highlight missing");
        console.log("korichnoe-yabloko: card-2 visible at its heading", JSON.stringify(korichTarget));
      }
      if (label !== "icleaning") {
        const navigationExportComparison = await evaluate(page, `(async () => {
          const after = JSON.stringify({ workspace: guruExportDiagnosticCloneV223(state) });
          const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(after));
          const afterSha256 = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
          return { same: window.__nowHashBefore === afterSha256 && window.__nowBytesBefore === after.length,
            beforeBytes: window.__nowBytesBefore, afterBytes: after.length,
            beforeSha256: window.__nowHashBefore, afterSha256 };
        })()`);
        assert.equal(navigationExportComparison.same, true, `${label}: navigation changed exported workspace`);
        results.push({ label, ...initial, navigation: korichTarget, tenTransitions,
          tenTransitionExportComparison, productSwitch: null,
          exportComparison, navigationExportComparison, filledBlock: null,
          screenshot: `artifacts/now-guide-${label}.png` });
        writeFileSync("artifacts/now-guide-smoke-results.json", JSON.stringify(results, null, 2));
        console.log(`${label}: M=${initial.pathTotal}, done=${initial.pathDone}, diagnostics=${initial.diagnosticTotal}/${initial.diagnosticDone}`);
        continue;
      }

      const navigation = await evaluate(page, `(() => {
        const reveal = nowGuideReveal;
        nowGuideReveal = (item) => {
          const found = reveal(item);
          if (found) window.__nowSmokeRevealed = item.key;
          return found;
        };
        const path = nowGuideBuildPath();
        const first = nowGuideCurrent(path);
        const index = path.findIndex(item => item.key === first.key);
        document.querySelector("[data-now-next]")?.click();
        const second = nowGuideCurrent(nowGuideBuildPath());
        document.querySelector("[data-now-current]")?.click();
        const reset = nowGuideCurrent(nowGuideBuildPath());
        window.__nowSmokeTarget = reset;
        return { initial: index, second: second?.key, reset: reset?.key,
          nextNeutral: !document.querySelector("[data-now-next]")?.classList.contains("is-ready") };
      })()`);
      console.log(`${label}: navigation selection`, JSON.stringify(navigation));
      assert.equal(navigation.reset, (await evaluate(page, 'nowGuideBuildPath().find(item => !["ready", "not_required"].includes(item.status))?.key')));
      await waitFor(page, `activeGateId === "gate-0" &&
        window.__nowSmokeRevealed === window.__nowSmokeTarget?.key &&
        (() => { const rect = nowGuideFindNode(window.__nowSmokeTarget)?.getBoundingClientRect();
          return Boolean(rect && rect.top < innerHeight - 55 && rect.bottom > 55); })()`, 45000);
      const disclosure = await evaluate(page, `(() => {
        nowGuideExpanded.delete("gate-0");
        nowGuideRender();
        document.querySelector('[data-now-disclosure="gate-0"]').click();
        const list = document.querySelector('[data-now-children="gate-0"]');
        return { expanded: !list.hidden, currentMarked: Boolean(list.querySelector('.now-guide-child.is-current')) };
      })()`);
      assert.equal(disclosure.expanded, true);
      assert.equal(disclosure.currentMarked, true);

      const exportDelta = async () => evaluate(page, `(() => {
        const before = window.__nowExportBefore;
        const after = JSON.stringify({ workspace: guruExportDiagnosticCloneV223(state) });
        let at = 0;
        if (before !== after) while (at < before.length && at < after.length && before[at] === after[at]) at++;
        return { same: before === after, at,
          before: before === after ? "" : before.slice(Math.max(0, at - 60), at + 120),
          after: before === after ? "" : after.slice(Math.max(0, at - 60), at + 120) };
      })()`);
      console.log(`${label}: export after Gate 0`, JSON.stringify(await exportDelta()));

      let routeMatrix = null;
      if (process.env.GURU_NOW_ROUTE_MATRIX === "1") {
        routeMatrix = [];
        for (const gateId of ["gate-1", "gate-2", "gate-3", "gate-4", "gate-5", "gate-6", "gate-8"]) {
          const selected = await evaluate(page, `(() => {
            const path = nowGuideBuildPath();
            const item = nowGuideBuildAllBlocks().find(entry => entry.gateId === ${JSON.stringify(gateId)});
            window.__nowRouteTarget = item;
            if(nowGuideIsPreflight(item)) nowGuideSelect(item, path); else nowGuideOpen(item);
            return { key: item.key, gateId: item.gateId, kind: item.kind };
          })()`);
          try { await waitFor(page, `(() => {
            const item = window.__nowRouteTarget;
            const node = item && nowGuideFindNode(item);
            const rect = node?.getBoundingClientRect();
            return activeGateId === ${JSON.stringify(gateId)} && guruRenderedGateId === activeGateId &&
              rect && rect.height > 0 && rect.top < innerHeight - 55 && rect.bottom > 55;
          })()`, 15000); } catch (error) {
            console.log(`${label}: route debug`, JSON.stringify(await evaluate(page, `(() => {
              const item = window.__nowRouteTarget;
              const node = item && nowGuideFindNode(item);
              const rect = node?.getBoundingClientRect();
              const sections = [...document.querySelectorAll('.g1-section')].map(entry => ({
                key: entry.querySelector('[data-gate1-toggle-section]')?.dataset.gate1ToggleSection,
                open: entry.classList.contains('is-open'), cards: [...entry.querySelectorAll('[data-card]')].map(card => card.dataset.card),
              }));
              return { activeGateId, guruRenderedGateId, item, node: Boolean(node),
                rect: rect && { top: rect.top, bottom: rect.bottom, height: rect.height }, sections,
                contentStart: document.getElementById('contentArea')?.innerText.slice(0, 500),
                errors: window.__nowErrors };
            })()`)));
            throw error;
          }
          routeMatrix.push(await evaluate(page, `(() => {
            const item = window.__nowRouteTarget;
            const rect = nowGuideFindNode(item).getBoundingClientRect();
            return { gate: activeGateId, kind: item.kind, key: item.key,
              headingTop: Math.round(rect.top), headingBottom: Math.round(rect.bottom) };
          })()`));
          console.log(`${label}: route ${gateId} visible`);
          console.log(`${label}: export after ${gateId}`, JSON.stringify(await exportDelta()));
        }
        console.log(`${label}: route matrix`, JSON.stringify(routeMatrix));
      }

      const navigationExportComparison = await evaluate(page, `(() => {
        const after = JSON.stringify({ workspace: guruExportDiagnosticCloneV223(state) });
        return { same: window.__nowExportBefore === after,
          beforeBytes: window.__nowExportBefore.length, afterBytes: after.length };
      })()`);
      assert.equal(navigationExportComparison.same, true, `${label}: navigation changed exported workspace`);

      const products = initial.products;
      let productSwitch = null;
      const other = products.find((item) => item.id !== initial.productId);
      if (other) {
        productSwitch = await evaluate(page, `(() => {
          const before = nowGuideBuildPath().filter(item => item.gateId === "gate-3" || item.gateId === "gate-4")
            .map(item => [item.key, item.status]);
          const category = [...document.querySelectorAll('[data-gate0-scope-category-select]')]
            .find(node => [...node.options].some(option => option.value === ${JSON.stringify(other.categoryId)}));
          let viaUi = false;
          if (category) {
            category.value = ${JSON.stringify(other.categoryId)};
            category.dispatchEvent(new Event("change", { bubbles: true }));
            const product = [...document.querySelectorAll('[data-gate0-scope-product-select]')]
              .find(node => [...node.options].some(option => option.value === ${JSON.stringify(other.id)}));
            if (product) {
              product.value = ${JSON.stringify(other.id)};
              product.dispatchEvent(new Event("change", { bubbles: true }));
              viaUi = true;
            }
          }
          if (!viaUi) {
            state.project.gate0ScopeUiV194.selectedCategoryId = ${JSON.stringify(other.categoryId)};
            state.project.gate0ScopeUiV194.selectedProductId = ${JSON.stringify(other.id)};
          }
          guruGateReadinessCache = new Map();
          renderGateNav({ recalculate: false });
          const after = nowGuideBuildPath().filter(item => item.gateId === "gate-3" || item.gateId === "gate-4")
            .map(item => [item.key, item.status]);
          return { before, after, viaUi, selectedProductId: state.project.gate0ScopeUiV194.selectedProductId,
            statusChanged: before.map(item => item[1]).join(",") !== after.map(item => item[1]).join(",") };
        })()`);
        assert.equal(productSwitch.selectedProductId, other.id);
        assert.equal(productSwitch.viaUi, true, `${label}: shared product selector was not used`);
        assert.equal(productSwitch.statusChanged, true, `${label}: product readiness did not change`);
        assert.notDeepEqual(productSwitch.before, productSwitch.after, `${label}: product path did not change`);
      }

      let filledBlock = null;
      if (label === "icleaning") {
        filledBlock = await evaluate(page, `(async () => {
          guruNavigateToGate("gate-7");
          await new Promise(resolve => {
            const check = () => guruRenderedGateId === "gate-7" && document.querySelector("[data-g7-add-task]")
              ? resolve() : requestAnimationFrame(check);
            check();
          });
          document.querySelector("[data-g7-add-task]").click();
          const row = document.querySelector('[data-g7-task="' + CSS.escape(ensureGate7State().tasks[0].id) + '"]');
          const taskId = row.dataset.g7Task;
          const title = row.querySelector('[data-g7-task-field="task"]');
          title.value = "Проверка путеводителя";
          title.dispatchEvent(new Event("input", { bubbles: true }));
          const item = nowGuideBuildAllBlocks().find(entry => entry.gateId === "gate-7" && entry.id === taskId);
          if(nowGuideBuildPath().some(entry=>entry.key===item.key))throw Error("Gate 7 entered preflight");
          nowGuideRender();
          const before = { status: item.status, launch: guruProjectReadiness(),
            nextReady: document.querySelector("[data-now-next]").classList.contains("is-ready") };
          const select = row.querySelector("[data-g7-status-select]");
          select.value = "ready";
          select.dispatchEvent(new Event("change", { bubbles: true }));
          const updated = nowGuideBuildAllBlocks().find(entry => entry.gateId === "gate-7" && entry.id === taskId);
          nowGuideRender();
          return { before, after: { status: updated.status, launch: guruProjectReadiness(),
            nextReady: document.querySelector("[data-now-next]").classList.contains("is-ready") } };
        })()`);
        assert.notEqual(filledBlock.before.status, "ready");
        assert.deepEqual(filledBlock.after.launch, filledBlock.before.launch);
        assert.equal(filledBlock.after.status, "ready");
        assert.equal(filledBlock.after.nextReady, filledBlock.before.nextReady);
      }

      results.push({ label, ...initial, navigation, disclosure, routeMatrix,
        tenTransitions, tenTransitionExportComparison, productSwitch: productSwitch && {
        selectedProductId: productSwitch.selectedProductId,
        viaUi: productSwitch.viaUi,
        statusChanged: productSwitch.statusChanged,
        changed: JSON.stringify(productSwitch.before) !== JSON.stringify(productSwitch.after),
      }, exportComparison, navigationExportComparison, filledBlock,
        screenshot: `artifacts/now-guide-${label}.png` });
      writeFileSync("artifacts/now-guide-smoke-results.json", JSON.stringify(results, null, 2));
      console.log(`${label}: M=${initial.pathTotal}, done=${initial.pathDone}, diagnostics=${initial.diagnosticTotal}/${initial.diagnosticDone}`);
    } finally {
      page.close();
      await browser.call("Target.disposeBrowserContext", { browserContextId });
    }
  }
  writeFileSync(process.env.GURU_NOW_DIAG_ONLY === "1"
    ? "artifacts/now-guide-diagnostics-results.json" : "artifacts/now-guide-smoke-results.json",
    JSON.stringify(results, null, 2));
  console.log("now-guide-smoke: OK");
} finally {
  browser.close();
}
