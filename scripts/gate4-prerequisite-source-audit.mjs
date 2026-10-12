import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9346";
const auditUrl = process.env.GURU_STORAGE_AUDIT_URL || "http://localhost:3000/";
const auditPath = resolve(
  process.env.GURU_PREREQUISITE_SOURCE_AUDIT_OUTPUT ||
    "artifacts/gate4-prerequisite-source-audit-v468.json",
);
const projects = [
  { id: "project-1783243907480-ec7d8c", name: "Коричное яблоко" },
  { id: "project-1783068059197-798d26", name: "iCleaning" },
  { id: "project-1782674551414-146f62", name: "SIVRCE" },
  { id: "project-1782582860052-3a45cc", name: "360profit" },
];
const retiredCardIds = ["card-147", "card-149", "card-150"];
const generatedMethodHints = {
  "card-149":
    "1 рабочий оффер и 1 основное УТП, которые дальше идут в сайт, креативы и рекламу",
  "card-150":
    "понятно, на кого идёт первая реализация и под кого пишется весь запуск",
};

if (!/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/?$/i.test(auditUrl)) {
  throw new Error("Source audit is intentionally restricted to a local origin");
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.listeners = new Map();
    this.ready = new Promise((resolveReady, reject) => {
      this.socket.addEventListener("open", resolveReady, { once: true });
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
    return new Promise((resolveCall, reject) => {
      const id = ++this.sequence;
      this.pending.set(id, { resolve: resolveCall, reject });
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

const version = await (
  await fetch(`http://127.0.0.1:${debugPort}/json/version`)
).json();
const browser = new CdpClient(version.webSocketDebuggerUrl);
await browser.ready;
const { targetId } = await browser.call("Target.createTarget", {
  url: "about:blank",
});
const targets = await (
  await fetch(`http://127.0.0.1:${debugPort}/json`)
).json();
const target = targets.find((item) => item.id === targetId);
if (!target?.webSocketDebuggerUrl) throw new Error("Chrome target missing");
const page = new CdpClient(target.webSocketDebuggerUrl);
await page.ready;

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  page.on("Fetch.requestPaused", ({ requestId }) => {
    page.call("Fetch.fulfillRequest", {
      requestId,
      responseCode: 200,
      responseHeaders: [
        { name: "Content-Type", value: "text/html; charset=utf-8" },
      ],
      body: Buffer.from("<!doctype html><title>Local storage audit</title>").toString(
        "base64",
      ),
    }).catch(() => {});
  });
  await page.call("Fetch.enable", {
    patterns: [
      { urlPattern: "*", resourceType: "Document", requestStage: "Request" },
    ],
  });
  await page.call("Page.navigate", { url: auditUrl });
  await new Promise((resolveWait) => setTimeout(resolveWait, 250));

  const response = await page.call("Runtime.evaluate", {
    expression: `(() => {
      const projects = ${JSON.stringify(projects)};
      const retiredCardIds = ${JSON.stringify(retiredCardIds)};
      const generatedMethodHints = ${JSON.stringify(generatedMethodHints)};
      const fields = ["status", "result", "comment", "link"];
      const compact = (value) => String(value ?? "").trim();
      const rowValues = (row) => Object.fromEntries(fields
        .filter((field) => compact(row?.[field]))
        .map((field) => [field, row[field]]));
      const hasStoredValue = (value) => {
        if (Array.isArray(value)) return value.some(hasStoredValue);
        if (value && typeof value === "object")
          return Object.values(value).some(hasStoredValue);
        return Boolean(compact(value));
      };
      return projects.map((project) => {
        const storageKey = "guru-platform-workspace-v02-" + project.id;
        const raw = localStorage.getItem(storageKey);
        if (!raw) return { ...project, storageKey, found: false, cards: {} };
        let workspace;
        try { workspace = JSON.parse(raw); }
        catch (error) {
          return { ...project, storageKey, found: true, parseError: error.message, cards: {} };
        }
        const gate = workspace?.gates?.find((item) => item.id === "gate-4");
        const store = workspace?.gate4Production?.readinessV225 || {};
        const cards = Object.fromEntries(retiredCardIds.map((cardId) => {
          const card = gate?.cards?.find((item) => item.id === cardId);
          const rawTemplateRows = (card?.instructionRows || [])
            .map((row) => ({
              rowKey: row.key || row.id || row.element || "",
              values: rowValues(row),
            }))
            .filter((row) => Object.keys(row.values).length);
          const templateMethodHints = rawTemplateRows.filter((row) =>
            Object.keys(row.values).length === 1 &&
            row.values.comment === generatedMethodHints[cardId]
          );
          const templateRows = rawTemplateRows.filter(
            (row) => !templateMethodHints.includes(row),
          );
          const byProduct = Object.entries(store.byProduct || {})
            .map(([productId, productCards]) => ({
              productId,
              value: productCards?.[cardId] || null,
            }))
            .filter((item) => hasStoredValue(item.value));
          const legacyUnassigned = store.legacyUnassigned?.[cardId] || null;
          return [cardId, {
            title: card?.title || "",
            templateRows,
            templateMethodHints,
            byProduct,
            legacyUnassigned: hasStoredValue(legacyUnassigned)
              ? legacyUnassigned
              : null,
            hasStoredData: Boolean(
              templateRows.length || byProduct.length || hasStoredValue(legacyUnassigned)
            ),
          }];
        }));
        return {
          ...project,
          storageKey,
          found: true,
          workspaceProjectName: workspace?.project?.name || "",
          cards,
          card147HasManualData: Boolean(cards["card-147"]?.hasStoredData),
        };
      });
    })()`,
    returnByValue: true,
  });
  if (response.exceptionDetails) {
    throw new Error(
      response.exceptionDetails.exception?.description ||
        response.exceptionDetails.text,
    );
  }
  const auditedProjects = response.result.value;
  const report = {
    auditedAt: new Date().toISOString(),
    source: "read-only localStorage copy",
    origin: auditUrl,
    retiredCardIds,
    projects: auditedProjects,
    summary: {
      requested: projects.length,
      found: auditedProjects.filter((project) => project.found).length,
      card147WithManualData: auditedProjects
        .filter((project) => project.card147HasManualData)
        .map((project) => project.name),
    },
  };
  await writeFile(auditPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ audit: auditPath, ...report }, null, 2));
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  browser.close();
}
