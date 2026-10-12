const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "39771";
const appPort = process.env.GURU_DEV_PORT || "36771";
const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = pages.find((item) => item.type === "page");
if (!page) throw new Error("Headless Chrome page was not found");

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const entry = pending.get(message.id);
  if (!entry) return;
  pending.delete(message.id);
  if (message.error) entry.reject(new Error(message.error.message));
  else entry.resolve(message.result);
});

function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  }
  return result.result.value;
}

async function waitFor(expression, timeoutMs = 10000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function assertNoApiCalls(phase) {
  const calls = await evaluate("window.__guruBlockedApiCalls || []");
  if (calls.length) throw new Error(`${phase}: unexpected API requests ${JSON.stringify(calls)}`);
}

await call("Runtime.enable");
await call("Page.enable");
await call("Page.addScriptToEvaluateOnNewDocument", {
  source: `(() => {
    const original = window.fetch.bind(window);
    window.__guruBlockedApiCalls = [];
    window.fetch = (input, init) => {
      const url = String(input?.url || input);
      if (url.includes("/api/")) {
        window.__guruBlockedApiCalls.push({ url, method: init?.method || "GET" });
        return Promise.reject(new Error("API blocked by local-only smoke test"));
      }
      return original(input, init);
    };
  })();`,
});

await call("Page.navigate", { url: `http://127.0.0.1:${appPort}/` });
await waitFor('document.readyState === "complete"');
await evaluate(`(() => {
  localStorage.clear();
  localStorage.setItem("guru-platform-access-v01", "unlocked");
  location.reload();
  return true;
})()`);
await waitFor('document.readyState === "complete" && typeof createProjectFromModal === "function" && !document.getElementById("projectLauncher").hidden');
await assertNoApiCalls("startup");

async function createProject(name) {
  await evaluate(`(() => {
    document.getElementById("addProjectCard").click();
    document.getElementById("newProjectName").value = ${JSON.stringify(name)};
    document.getElementById("createProjectConfirm").click();
    return true;
  })()`);
  await waitFor('Boolean(activeProjectId && state && !document.getElementById("appShell").hidden)');
  const projectId = await evaluate("activeProjectId");
  const stored = await evaluate(`(() => ({
    registry: JSON.parse(localStorage.getItem(PROJECTS_STORAGE_KEY) || "[]"),
    workspace: JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId) || "null")
  }))()`);
  if (!stored.registry.some((item) => item.id === projectId) || stored.workspace?.project?.id !== projectId)
    throw new Error(`Project ${name} was not saved locally`);
  await assertNoApiCalls(`create ${name}`);
  return projectId;
}

const firstId = await createProject("Local storage smoke A");
await evaluate(`(() => {
  state.project.description = "Saved only in browser A";
  _guruTabDirty = true;
  saveState();
  if (JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId))?.project?.description !== state.project.description)
    throw new Error("First project save failed");
  showLauncher();
  return true;
})()`);
const secondId = await createProject("Local storage smoke B");
await evaluate(`(() => {
  state.project.description = "Saved only in browser B";
  _guruTabDirty = true;
  saveState();
  if (JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId))?.project?.description !== state.project.description)
    throw new Error("Second project save failed");
  openProject(${JSON.stringify(firstId)});
  return true;
})()`);
if (await evaluate("state.project.description") !== "Saved only in browser A")
  throw new Error("First project content changed after switching");
await evaluate(`openProject(${JSON.stringify(secondId)}); true`);
if (await evaluate("state.project.description") !== "Saved only in browser B")
  throw new Error("Second project content changed after switching");
await new Promise((resolve) => setTimeout(resolve, 2300));
await assertNoApiCalls("project switching");

await evaluate("location.reload(); true");
await waitFor('document.readyState === "complete" && typeof openProject === "function" && !document.getElementById("projectLauncher").hidden');
await evaluate(`openProject(${JSON.stringify(firstId)}); true`);
if (await evaluate("state.project.description") !== "Saved only in browser A")
  throw new Error("First project was not restored after reload");
await evaluate(`openProject(${JSON.stringify(secondId)}); true`);
if (await evaluate("state.project.description") !== "Saved only in browser B")
  throw new Error("Second project was not restored after reload");
await new Promise((resolve) => setTimeout(resolve, 2300));
await assertNoApiCalls("reload and reopen");
const mode = await evaluate('document.getElementById("supabaseStatus").textContent.trim()');
if (!mode.includes("Локальный режим")) throw new Error(`Unexpected storage mode: ${mode}`);

console.log(JSON.stringify({ ok: true, projects: 2, create: true, save: true, switch: true, reload: true, apiCalls: 0 }));
socket.close();
