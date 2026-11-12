import assert from "node:assert/strict";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9535";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:9531/";
const browserInfo = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();

function client(url) {
  const socket = new WebSocket(url);
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);
    message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
  });
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  return {
    async call(method, params = {}) {
      await ready;
      return new Promise((resolve, reject) => {
        const id = ++sequence;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() { socket.close(); },
  };
}

const browser = client(browserInfo.webSocketDebuggerUrl);
const { browserContextId } = await browser.call("Target.createBrowserContext");
let page;
try {
  const { targetId } = await browser.call("Target.createTarget", {
    url: "about:blank", browserContextId,
  });
  const target = (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json())
    .find((entry) => entry.id === targetId);
  assert(target?.webSocketDebuggerUrl);
  page = client(target.webSocketDebuggerUrl);
  const evaluate = async (expression) => {
    const response = await page.call("Runtime.evaluate", {
      expression, awaitPromise: true, returnByValue: true,
    });
    if (response.exceptionDetails)
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
    return response.result.value;
  };
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Page.navigate", { url: appUrl });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate('document.readyState === "complete" && typeof guruWorkspaceIdbCommit === "function"')) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const initial = await evaluate(`(async () => {
    const id = "idb-performance-smoke";
    const project = { id, name: "IndexedDB smoke", lifecycleStatus: "active",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    const workspace = createFreshWorkspace(project);
    workspace.project.description = "Сохранённая исходная версия";
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([project]));
    projects = [project]; state = workspace; activeProjectId = id;
    const key = WORKSPACE_STORAGE_PREFIX + id;
    localStorage.setItem(key, JSON.stringify(workspace));
    const originalRead = guruWorkspaceIdbReadV1;
    let reads = 0;
    guruWorkspaceIdbReadV1 = async (...args) => { reads += 1; return originalRead(...args); };
    const first = await guruWorkspaceIdbCommit(id, JSON.stringify(workspace), key,
      guruInvalidateQueuedWorkspaceSave(key));
    const migrated = { first, reads, localCopyRemoved: localStorage.getItem(key) === null,
      marker: Boolean(localStorage.getItem(WORKSPACE_IDB_MARKER_PREFIX + id)) };
    workspace.project.description = "Сохранённая новая версия";
    const second = await guruQueueWorkspaceSave({ durable: true });
    const repeated = { second, reads, marker: Boolean(localStorage.getItem(WORKSPACE_IDB_MARKER_PREFIX + id)) };
    guruWorkspaceIdbReadV1 = originalRead;
    return { migrated, repeated };
  })()`);
  assert.deepEqual(initial.migrated,
    { first: true, reads: 1, localCopyRemoved: true, marker: true });
  assert.deepEqual(initial.repeated, { second: true, reads: 1, marker: true });
  await page.call("Page.reload", { ignoreCache: true });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate('document.readyState === "complete" && typeof openProject === "function"')) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.equal(await evaluate('typeof openProject'), "function",
    JSON.stringify(await evaluate('({ href: location.href, ready: document.readyState, scripts: [...document.scripts].map(item => item.src).filter(Boolean).slice(-5) })')));
  const reopened = await evaluate(`(async () => {
    await openProject("idb-performance-smoke");
    return { description: state?.project?.description,
      id: activeProjectId, mode: guruWorkspaceIdbMode.has(activeProjectId) };
  })()`);
  assert.deepEqual(reopened,
    { description: "Сохранённая новая версия", id: "idb-performance-smoke", mode: true });
  console.log(JSON.stringify({ ...initial, reopened, passed: true }));
} finally {
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  page?.close(); browser.close();
}
