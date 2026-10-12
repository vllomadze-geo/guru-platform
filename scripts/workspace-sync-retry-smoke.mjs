const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9395";
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const browserVersion = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new Cdp(browserVersion.webSocketDebuggerUrl);
await browser.ready;
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const target = targets.find((item) => item.id === targetId);
assert(target?.webSocketDebuggerUrl, "Isolated browser target missing");
const page = new Cdp(target.webSocketDebuggerUrl);
await page.ready;

async function evaluate(expression) {
  const result = await page.call("Runtime.evaluate", {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

async function waitFor(expression) {
  for (let i = 0; i < 100; i += 1) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await pause(100);
  }
  throw new Error(`Timed out: ${expression}`);
}

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof pushToSupabase === "function"');
  const first = await evaluate(`(async () => {
    const projectId = "workspace-sync-retry-smoke";
    activeProjectId = projectId;
    state = { project: { id: projectId, name: "Sync smoke" },
      updatedAt: "2026-09-18T10:00:00.000Z", marker: "first" };
    localStorage.setItem(WORKSPACE_STORAGE_PREFIX + projectId, JSON.stringify(state));
    window.__syncCalls = [];
    const nativeFetch = window.fetch;
    window.fetch = (input, init) => {
      if (String(input) !== "/api/workspace-sync" || init?.method !== "POST")
        return nativeFetch(input, init);
      const body = JSON.parse(init.body);
      window.__syncCalls.push(body);
      const result = window.__syncCalls.length === 1
        ? { ok: false, error: "supabase_read_before_write_error", status: 503,
            detail: "PGRST002" }
        : { ok: true, updated_at: "2026-09-18T10:00:02.000Z" };
      return Promise.resolve(new Response(JSON.stringify(result), {
        status: 200, headers: { "Content-Type": "application/json" },
      }));
    };
    const failed = await pushToSupabase(projectId, state);
    const pending = _workspaceSyncRetryTimers.has(projectId);
    const failedStatus = els.saveStatus.textContent;
    state = { ...state, updatedAt: "2026-09-18T10:00:01.000Z",
      marker: "newer-local-change" };
    localStorage.setItem(WORKSPACE_STORAGE_PREFIX + projectId, JSON.stringify(state));
    return { failed: failed?.error, pending, failedStatus };
  })()`);
  assert(first.failed === "supabase_read_before_write_error" && first.pending &&
    first.failedStatus.includes("повторим запись"),
  `Transient failure did not schedule a retry: ${JSON.stringify(first)}`);
  await waitFor('window.__syncCalls?.length === 2 && !_workspaceSyncRetryTimers.has(activeProjectId)');
  const recovered = await evaluate(`(() => ({
    calls: window.__syncCalls.length,
    retryMarker: window.__syncCalls[1].state.marker,
    retryAttempts: _workspaceSyncRetryAttempts.has(activeProjectId),
    cloudVersion: _cloudWorkspaceVersions.get(activeProjectId),
    status: els.saveStatus.textContent,
    storedMarker: JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId)).marker,
  }))()`);
  assert(recovered.calls === 2 && recovered.retryMarker === "newer-local-change" &&
    recovered.storedMarker === "newer-local-change" && !recovered.retryAttempts &&
    recovered.status.includes("Облако ✓"),
  `Retry did not sync the latest local state: ${JSON.stringify(recovered)}`);
  const conflict = await evaluate(`(async () => {
    const count = window.__syncCalls.length;
    window.fetch = (input, init) => {
      if (String(input) !== "/api/workspace-sync" || init?.method !== "POST")
        return Promise.reject(new Error("Unexpected request"));
      window.__syncCalls.push(JSON.parse(init.body));
      return Promise.resolve(new Response(JSON.stringify({
        ok: false, error: "conflict",
        cloud_updated_at: "2026-09-18T11:00:00.000Z",
        cloud_state_updated_at: "2026-09-18T11:00:00.000Z",
        state: { project: { id: activeProjectId }, updatedAt: "2026-09-18T11:00:00.000Z" },
      }), { status: 200, headers: { "Content-Type": "application/json" } }));
    };
    const result = await pushToSupabase(activeProjectId, state);
    return { error: result?.error, calls: window.__syncCalls.length - count,
      pending: _workspaceSyncRetryTimers.has(activeProjectId),
      status: els.saveStatus.textContent };
  })()`);
  assert(conflict.error === "conflict" && conflict.calls === 1 &&
    !conflict.pending && conflict.status.includes("конфликт версий"),
  `Newer cloud state was overwritten: ${JSON.stringify(conflict)}`);
  console.log(JSON.stringify({ ok: true, first, recovered, conflict }, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
