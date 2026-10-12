import { readFile } from "node:fs/promises";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9349";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const projectId = "navigation-url-smoke-v269";
const sourcePath =
  process.env.GURU_PROJECT_EXPORT ||
  "/Users/vl/Downloads/guru-project-korichnoe-yabloko-all.json";
const goatId = "catalog-item-1786792591872-51f503";
const shirtId = "catalog-item-1786792591872-c8b1e9";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
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
      const id = ++this.sequence;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

let browser;
let page;
let browserContextId = "";

const sourcePayload = JSON.parse(await readFile(sourcePath, "utf8"));
const sourceWorkspace = sourcePayload.workspace || sourcePayload.content;
const sourceRegistry = sourceWorkspace?.project?.productRegistryV185 || [];
const sourceCatalog = sourceWorkspace?.project?.catalogItemsV189 || [];
assert(sourceCatalog.some((item) => item.id === goatId), "Goat product missing in fixture");
assert(sourceCatalog.some((item) => item.id === shirtId), "Second product missing in fixture");

async function evaluate(expression) {
  const response = await page.call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails)
    throw new Error(
      response.exceptionDetails.exception?.description ||
        response.exceptionDetails.text,
    );
  return response.result.value;
}

async function waitFor(expression, timeoutMs = 25000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function hardReload() {
  await page.call("Page.reload", { ignoreCache: true });
  await waitFor('document.readyState === "complete"');
  await waitFor('typeof guruNavigationRestoreFromUrlV269 === "function"');
}

try {
  const browserVersion = await (
    await fetch(`http://127.0.0.1:${debugPort}/json/version`)
  ).json();
  browser = new CdpClient(browserVersion.webSocketDebuggerUrl);
  await browser.ready;
  ({ browserContextId } = await browser.call("Target.createBrowserContext"));
  const { targetId } = await browser.call("Target.createTarget", {
    url: "about:blank",
    browserContextId,
  });
  const targets = await (
    await fetch(`http://127.0.0.1:${debugPort}/json`)
  ).json();
  const target = targets.find((candidate) => candidate.id === targetId);
  assert(target?.webSocketDebuggerUrl, "Isolated Chrome target missing");
  page = new CdpClient(target.webSocketDebuggerUrl);
  await page.ready;
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Page.addScriptToEvaluateOnNewDocument", {
    source: `{
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes("/api/")
        ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmokeTest: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }))
        : nativeFetch(input, init);
    }`,
  });

  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete"');
  await waitFor('typeof createFreshWorkspace === "function"');
  const fixture = await evaluate(`(() => {
    const meta = {
      id: ${JSON.stringify(projectId)},
      name: "Navigation URL smoke",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const workspace = createFreshWorkspace(meta);
    workspace.project.productRegistryV185 = structuredClone(${JSON.stringify(sourceRegistry)});
    workspace.project.catalogItemsV189 = structuredClone(${JSON.stringify(sourceCatalog)});
    const products = guruV194Products(workspace).map((item) => ({
      id: item.id,
      categoryId: item.categoryId || "__uncategorized__",
      name: item.name
    }));
    if (products.length < 2) throw new Error("Smoke fixture needs two products");
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([meta]));
    localStorage.setItem(WORKSPACE_STORAGE_PREFIX + meta.id, JSON.stringify(workspace));
    return { products };
  })()`);
  const first = fixture.products.find((item) => item.id === goatId);
  const second = fixture.products.find((item) => item.id === shirtId);
  const firstUrl = new URL(appUrl);
  firstUrl.searchParams.set("project", projectId);
  firstUrl.searchParams.set("gate", "gate-1");
  firstUrl.searchParams.set("category", first.categoryId);
  firstUrl.searchParams.set("product", first.id);
  await page.call("Page.navigate", { url: firstUrl.href });
  await waitFor('document.readyState === "complete"');
  await waitFor(`activeProjectId === ${JSON.stringify(projectId)} && activeGateId === "gate-1" && activeView === "gate"`);
  await waitFor(`guruV194Ui(state).selectedProductId === ${JSON.stringify(first.id)}`);

  const firstBefore = await evaluate(`({
    href: location.href,
    project: activeProjectId,
    gate: activeGateId,
    product: guruV194Ui(state).selectedProductId,
    category: guruV194Ui(state).selectedCategoryId
  })`);
  await hardReload();
  await waitFor(`activeProjectId === ${JSON.stringify(projectId)} && activeGateId === "gate-1" && activeView === "gate"`);
  await waitFor(`guruV194Ui(state).selectedProductId === ${JSON.stringify(first.id)}`);
  const firstAfter = await evaluate(`({
    href: location.href,
    project: activeProjectId,
    gate: activeGateId,
    product: guruV194Ui(state).selectedProductId,
    category: guruV194Ui(state).selectedCategoryId
  })`);
  assert(JSON.stringify(firstBefore) === JSON.stringify(firstAfter), "Gate 1 state changed after hard reload");

  await waitFor('document.querySelector("[data-gate0-scope-category-select]")');
  await evaluate(`(() => {
    const category = document.querySelector("[data-gate0-scope-category-select]");
    if (!category) throw new Error("Common category selector missing");
    category.value = ${JSON.stringify(second.categoryId)};
    category.dispatchEvent(new Event("change", { bubbles: true }));
    const product = document.querySelector("[data-gate0-scope-product-select]");
    if (!product) throw new Error("Common product selector missing");
    product.value = ${JSON.stringify(second.id)};
    product.dispatchEvent(new Event("change", { bubbles: true }));
    guruNavigateToGate("gate-2");
    return true;
  })()`);
  await waitFor(`activeGateId === "gate-2" && guruV194Ui(state).selectedProductId === ${JSON.stringify(second.id)}`);
  await waitFor(`new URL(location.href).searchParams.get("gate") === "gate-2" && new URL(location.href).searchParams.get("product") === ${JSON.stringify(second.id)}`);
  await hardReload();
  await waitFor(`activeProjectId === ${JSON.stringify(projectId)} && activeGateId === "gate-2" && activeView === "gate"`);
  await waitFor(`guruV194Ui(state).selectedProductId === ${JSON.stringify(second.id)}`);
  const secondAfter = await evaluate(`({
    href: location.href,
    project: activeProjectId,
    gate: activeGateId,
    product: guruV194Ui(state).selectedProductId,
    category: guruV194Ui(state).selectedCategoryId
  })`);

  await evaluate("showLauncher(); true");
  await waitFor('document.getElementById("projectLauncher")?.hidden === false');
  await waitFor('new URL(location.href).searchParams.get("project") === null');
  await evaluate(`(() => {
    const button = document.querySelector(${JSON.stringify(`[data-open-project="${projectId}"]`)});
    if (!button) throw new Error("Project launcher button missing");
    button.click();
    return true;
  })()`);
  await waitFor(`activeProjectId === ${JSON.stringify(projectId)} && activeView === "project"`);
  await waitFor(`new URL(location.href).searchParams.get("project") === ${JSON.stringify(projectId)}`);
  const projectSwitch = await evaluate(`({
    project: new URL(location.href).searchParams.get("project"),
    gate: new URL(location.href).searchParams.get("gate")
  })`);
  assert(projectSwitch.gate === null, "Project passport URL unexpectedly kept a Gate");

  const invalidUrl = new URL(appUrl);
  invalidUrl.searchParams.set("project", "deleted-project-v269");
  invalidUrl.searchParams.set("gate", "gate-1");
  await page.call("Page.navigate", { url: invalidUrl.href });
  await waitFor('document.readyState === "complete"');
  await waitFor('document.getElementById("projectLauncher")?.hidden === false');
  const invalidResult = await evaluate(`({
    activeProjectId,
    launcherVisible: document.getElementById("projectLauncher")?.hidden === false,
    projectParam: new URL(location.href).searchParams.get("project")
  })`);
  assert(!invalidResult.activeProjectId, "Invalid project unexpectedly opened");
  assert(invalidResult.launcherVisible, "Invalid project did not fall back to launcher");
  assert(invalidResult.projectParam === null, "Invalid navigation params were not cleared");

  console.log(JSON.stringify({ firstBefore, firstAfter, secondAfter, projectSwitch, invalidResult }, null, 2));
} finally {
  page?.close();
  if (browser && browserContextId)
    await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  browser?.close();
}
