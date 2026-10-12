import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9333";
const cloudAuditUrl = process.env.GURU_CLOUD_AUDIT_URL || "";
const auditPath = resolve(
  process.env.GURU_STORAGE_AUDIT_OUTPUT ||
    "artifacts/gate4-rsya-shared-projects-preflight-v449.json",
);
const origins = (process.env.GURU_STORAGE_AUDIT_URLS || [
  "https://guru-platform-navy.vercel.app/",
  "http://localhost:3000/",
  "http://localhost:8765/",
  "file:///Users/vl/Developer/guru-platform/README.md",
].join(","))
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.listeners = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      for (const listener of this.listeners.get(message.method) || [])
        listener(message.params || {});
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

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  close() {
    this.socket.close();
  }
}

function workspaceSummary(key, workspace) {
  const branches = workspace?.gate4Rsya && typeof workspace.gate4Rsya === "object"
    ? Object.entries(workspace.gate4Rsya)
    : [];
  const groups = branches.flatMap(([catalogItemKey, value]) =>
    (Array.isArray(value?.groups) ? value.groups : []).map((group, groupIndex) => ({
      catalogItemKey,
      groupIndex,
      category: String(group?.category || ""),
      product_id: String(group?.product_id || ""),
    })),
  );
  return {
    storageKey: key,
    projectId: String(workspace?.project?.id || workspace?.projectId || ""),
    projectName: String(workspace?.project?.name || ""),
    catalogItems: Array.isArray(workspace?.project?.catalogItemsV189)
      ? workspace.project.catalogItemsV189.length
      : 0,
    registryProducts: Array.isArray(workspace?.project?.productRegistryV185)
      ? workspace.project.productRegistryV185.length
      : 0,
    productBindings: workspace?.project?.productBindingsV185 &&
      typeof workspace.project.productBindingsV185 === "object"
      ? Object.keys(workspace.project.productBindingsV185).length
      : 0,
    rsyaBranches: branches.length,
    rsyaGroups: groups.length,
    rsyaGroupsWithProductId: groups.filter((group) => group.product_id).length,
    rsyaGroupsMissingProductId: groups.filter((group) => !group.product_id).length,
    groups,
  };
}

async function auditUrl(browser, url) {
  const { targetId } = await browser.call("Target.createTarget", { url: "about:blank" });
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
  const target = targets.find((item) => item.id === targetId);
  if (!target?.webSocketDebuggerUrl) throw new Error(`Target missing for ${url}`);
  const page = new CdpClient(target.webSocketDebuggerUrl);
  await page.ready;
  await page.call("Runtime.enable");
  await page.call("Page.enable");

  if (!url.startsWith("file:")) {
    page.on("Fetch.requestPaused", ({ requestId }) => {
      page.call("Fetch.fulfillRequest", {
        requestId,
        responseCode: 200,
        responseHeaders: [{ name: "Content-Type", value: "text/html; charset=utf-8" }],
        body: Buffer.from("<!doctype html><title>GURU storage audit</title>").toString("base64"),
      }).catch(() => {});
    });
    await page.call("Fetch.enable", {
      patterns: [{ urlPattern: "*", resourceType: "Document", requestStage: "Request" }],
    });
  }

  await page.call("Page.navigate", { url });
  await new Promise((resolve) => setTimeout(resolve, 250));
  const result = await page.call("Runtime.evaluate", {
    expression: `(() => {
      const keys = Object.keys(localStorage).filter((key) =>
        key === "guru-platform-projects-v02" ||
        key.startsWith("guru-platform-workspace-v02-"));
      const workspaces = [];
      for (const key of keys.filter((item) => item.startsWith("guru-platform-workspace-v02-"))) {
        try { workspaces.push([key, JSON.parse(localStorage.getItem(key))]); }
        catch (error) { workspaces.push([key, { __parseError: error.message }]); }
      }
      let projects = [];
      try { projects = JSON.parse(localStorage.getItem("guru-platform-projects-v02") || "[]"); }
      catch (error) { projects = [{ __parseError: error.message }]; }
      return { href: location.href, origin: location.origin, keys, projects, workspaces };
    })()`,
    returnByValue: true,
  });
  page.close();
  await browser.call("Target.closeTarget", { targetId });
  const value = result.result.value;
  return {
    url,
    href: value.href,
    origin: value.origin,
    keys: value.keys,
    projects: value.projects,
    workspaces: value.workspaces.map(([key, workspace]) =>
      workspaceSummary(key, workspace)),
  };
}

const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new CdpClient(version.webSocketDebuggerUrl);
await browser.ready;
try {
  const audits = [];
  for (const url of origins) audits.push(await auditUrl(browser, url));
  let cloudRegistry = { checked: false };
  if (cloudAuditUrl) {
    try {
      const response = await fetch(cloudAuditUrl);
      const payload = await response.json();
      const projects = Array.isArray(payload?.state)
        ? payload.state
        : Array.isArray(payload?.state?.projects)
          ? payload.state.projects
          : [];
      cloudRegistry = payload?.ok
        ? {
            checked: true,
            ok: true,
            url: cloudAuditUrl,
            projects: projects.map((project) => ({
              id: String(project?.id || ""),
              name: String(project?.name || ""),
            })),
          }
        : {
            checked: true,
            ok: false,
            url: cloudAuditUrl,
            error: String(payload?.error || `http_${response.status}`),
            status: Number(payload?.status || response.status),
          };
    } catch (error) {
      cloudRegistry = {
        checked: true,
        ok: false,
        url: cloudAuditUrl,
        error: String(error?.message || error),
      };
    }
  }
  const report = {
    auditedAt: new Date().toISOString(),
    cloudRegistry,
    audits,
  };
  await writeFile(auditPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ ...report, audit: auditPath }, null, 2));
} finally {
  browser.close();
}
