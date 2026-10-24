import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const port = process.env.GURU_CHROME_DEBUG_PORT || "9410";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const baseline = process.env.GURU_GATE0_BASELINE === "1";
const fixture = JSON.parse(readFileSync(process.env.GURU_GATE0_FIXTURE ||
  "/private/tmp/guru-now-korich-workspace.json", "utf8"));
const artifact = "artifacts/gate0-merged-readiness-regression";
const copyId = "gate0-merged-readiness-smoke";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.errors = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
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
    return true;
  })()`);
  console.log("Коричное яблоко: тестовая копия загружена");

  const result = await evaluate(page, `(() => {
    const gate = state.gates.find((item) => item.id === "gate-0");
    const cards = nowGuideGate0Cards(gate);
    window.__gate0ExportBefore = JSON.stringify({ workspace: guruExportDiagnosticCloneV223(state) });
    const statuses = guruGateBlockStatuses(gate);
    const summary = guruGateReadiness(gate);
    return {
      project: state.project.name, build: GURU_BUILD_INFO.version,
      productId: state.project.gate0ScopeUiV194.selectedProductId,
      rows: cards.map((card, index) => ({ id: card.id,
        title: nowGuideSafeText(card.title), status: guruNormBlockStatus(statuses[index]),
        done: ["ready", "not_required"].includes(guruNormBlockStatus(statuses[index])) })),
      summary,
      merged: gate.cards.filter((card) => ["card-4", "card-5", "card-6", "card-8", "card-9"].includes(card.id))
        .map((card) => ({ id: card.id, status: card.status, merged: card._merged,
          mergedInto: card._mergedInto || "" })),
    };
  })()`);
  assert.equal(result.project, "Коричное яблоко");
  assert.equal(result.rows.length, result.summary.total);
  assert.equal(result.rows.filter((row) => row.done).length, result.summary.done);
  console.log(JSON.stringify({ summary: result.summary }));
  if (baseline) {
    writeFileSync(`${artifact}-before.json`, JSON.stringify(result, null, 2) + "\n");
    console.log(JSON.stringify(result, null, 2));
  } else {
    const before = JSON.parse(readFileSync("artifacts/gate0-merged-readiness-before.json", "utf8"));
    assert.deepEqual(result.rows.map(({ id, title }) => ({ id, title })),
      before.rows.map(({ id, title }) => ({ id, title })), "Изменился список видимых блоков");
    for (const id of ["card-2", "gate0-company-keyword-foundation"])
      assert.equal(result.rows.find((row) => row.id === id).done, true, `${id}: скрытая карточка влияет на видимый блок`);
    assert.equal(result.rows.find((row) => row.id === "card-7").done, false);

    const cases = await evaluate(page, `(() => {
      const owners = { "card-4": "card-2", "card-5": "card-2",
        "card-6": "gate0-company-keyword-foundation", "card-8": "card-7", "card-9": "card-7" };
      const output = [];
      for (const [id, ownerId] of Object.entries(owners)) {
        const owner = { id: ownerId };
        const merged = { id, _merged: true, status: "not_started" };
        const gate = { cards: [owner, merged] };
        output.push({ id, empty: nowGuideGate0MergedStatus(gate, owner, "ready") });
        merged.status = "ready";
        output.push({ id, complete: nowGuideGate0MergedStatus(gate, owner, "ready") });
        merged.status = "not_required";
        output.push({ id, notRequired: nowGuideGate0MergedStatus(gate, owner, "ready") });
        merged.status = "problem";
        output.push({ id, problem: nowGuideGate0MergedStatus(gate, owner, "ready") });
        merged._merged = false;
        output.push({ id, separate: nowGuideGate0MergedStatus(gate, owner, "ready") });
      }
      return output;
    })()`);
    for (const item of cases) {
      if ("empty" in item) assert.equal(item.empty, "ready", item.id);
      if ("complete" in item) assert.equal(item.complete, "ready", item.id);
      if ("notRequired" in item) assert.equal(item.notRequired, "ready", item.id);
      if ("problem" in item) assert.equal(item.problem, "ready", item.id);
      if ("separate" in item) assert.equal(item.separate, "ready", item.id);
    }
    await page.call("Page.startScreencast", {
      format: "png", maxWidth: 1800, maxHeight: 1000, everyNthFrame: 1,
    });
    await evaluate(page, `(() => {
      for (let index = 0; index < 20; index++)
        guruGateReadiness(state.gates.find((gate) => gate.id === "gate-0"));
      const path = nowGuideBuildPath();
      nowGuideSelect(path.find((item) => item.gateId === "gate-0" && item.id === "card-2"), path);
      return true;
    })()`);
    await waitFor(page, `(() => {
      const node = document.querySelector('details.gate0-card[data-card-row="card-2"]');
      const head = node?.querySelector(".gate0-card-head");
      const rect = head?.getBoundingClientRect();
      return activeGateId === "gate-0" && guruRenderedGateId === "gate-0" && node?.open &&
        rect?.top >= 0 && rect.top < innerHeight - 55;
    })()`, 120000);
    const exportComparison = await evaluate(page, `(async () => {
      const before = window.__gate0ExportBefore;
      const after = JSON.stringify({ workspace: guruExportDiagnosticCloneV223(state) });
      const bytes = (value) => new TextEncoder().encode(value);
      const sha = async (value) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes(value)))]
        .map((byte) => byte.toString(16).padStart(2, "0")).join("");
      const gate = state.gates.find((item) => item.id === "gate-0");
      const readiness = guruGateReadiness(gate);
      const path = nowGuideBuildPath().filter((item) => item.gateId === "gate-0");
      return { identical: before === after, beforeBytes: bytes(before).length, afterBytes: bytes(after).length,
        beforeSha256: await sha(before), afterSha256: await sha(after),
        updatedAtFields: (after.match(/"updated_at"\s*:/g) || []).length,
        menu: document.querySelector('[data-gate-id="gate-0"]')?.innerText,
        guide: document.querySelector("#nowGuide")?.innerText,
        readiness, path: path.map(({ id, status }) => ({ id, status })) };
    })()`);
    writeFileSync(`${artifact}-export-comparison.json`, JSON.stringify(exportComparison, null, 2) + "\n");
    assert.equal(exportComparison.identical, true, "Изменился экспорт проекта, включая updated_at");
    assert.deepEqual(exportComparison.path.map(({ status }) => status), result.rows.map(({ status }) => status));
    assert.deepEqual(exportComparison.readiness, result.summary);
    assert(exportComparison.menu.includes(`${result.summary.total} блоков, прогресс ${result.summary.percent}%`));
    assert.equal(page.errors.length, 0, page.errors.join("\n"));
    writeFileSync(`${artifact}-after.json`, JSON.stringify({ ...result, cases, exportComparison }, null, 2) + "\n");
    console.log(JSON.stringify({ before: before.summary, after: result.summary, exportComparison }, null, 2));
    await wait(500);
    assert(page.frame?.data, "Chrome не прислал изображение Gate 0");
    writeFileSync(`${artifact}-korichnoe-yabloko.png`, Buffer.from(page.frame.data, "base64"));
    console.log("Gate 0 merged readiness smoke: PASS");
  }
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
