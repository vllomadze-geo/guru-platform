import assert from "node:assert/strict";

const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const port = process.env.GURU_CHROME_DEBUG_PORT || "9362";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", {
  url: "about:blank", browserContextId,
});
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(tabs.find((tab) => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async (expression) => {
  const result = await page.call("Runtime.evaluate", {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (expression) => {
  for (let i = 0; i < 200; i += 1) {
    if (await evaluate(expression)) return;
    await wait(100);
  }
  throw new Error(`Timeout: ${expression}`);
};

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof guruCatalogHubPageNameV1 === "function"');
  console.log("catalog hub smoke: loaded");
  await evaluate(`(() => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    const meta = { id: "catalog-hub-name-smoke", name: "Catalog hub name smoke", lifecycleStatus: "active" };
    projects = [meta]; localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    activeProjectId = meta.id; state = createFreshWorkspace(meta);
    state.project.productRegistryV185.push({
      id: "catalog-hub-smoke-category", name: "Новогодние подарки", legacyNames: [],
    });
    guruCategoryAuditRowsV491(state);
    megaPlatformSetUrl("fixed", "home", "https://example.ru/");
    megaPlatformSetUrl("fixed", "catalog", "https://example.ru/katalog-podarkov");
    state._gate0Open = { ...(state._gate0Open || {}), "card-7": true };
    els.launcher.hidden = true; els.appShell.hidden = false;
    activeView = "gate"; activeGateId = "gate-0";
    renderGateNav(); renderGate();
    return true;
  })()`);
  console.log("catalog hub smoke: initialized");
  await waitFor('Boolean(document.querySelector("[data-mega-platform-rename-hub]"))');
  console.log("catalog hub smoke: editor visible");
  const result = await evaluate(`(async () => {
    const input = document.querySelector("[data-mega-platform-rename-hub]");
    const row = guruCatalogHubPageRowV1();
    const card = findCard("card-22-hub");
    const initial = { name: input.value, rowId: row.id, cardId: card.id,
      count: card.pageRows.length, url: megaPlatformUrl("fixed", "catalog"),
      removable: Boolean(input.closest("tr").querySelector("[data-mega-platform-delete-kind]")) };
    const desired = "Подарки ручной работы";
    input.value = desired;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    const rowName = row.name;
    const required = megaPlatformAutoRows().required;
    const platformName = required.find((entry) => entry.urlId === "catalog")?.name;
    const catalogSlot = required.findIndex((entry) => entry.urlId === "catalog");
    const catalogCount = required.filter((entry) => entry.urlId === "catalog").length;
    const hubType = input.closest("tr").children[1]?.textContent.trim();
    const allPagesName = megaPlatformAllPages().find((entry) => entry.group === "fixed" && entry.id === "catalog")?.name;
    const siteName = guruSiteChromeProposalV499().find((entry) => entry.key === "catalog")?.name;
    const footerName = guruSiteChromeTopLevelV498(["card-22-hub"])[0]?.name;
    const footerHasCategory = guruSiteChromeFieldsV497(findCard(GURU_SITE_FOOTER_ID_V497))
      .includes("Новогодние подарки");
    const urlAfterRename = megaPlatformUrl("fixed", "catalog");
    const urlInput = input.closest("tr").querySelector('[data-mega-url-group="fixed"][data-mega-url-id="catalog"]');
    const urlActionHidden = urlInput.closest(".mega-platform-url-field")
      .querySelector("[data-mega-url-from-name]")?.hidden;
    const suggestedUrl = megaPlatformSeoUrlFromName(desired, "fixed", "catalog");
    input.value = "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    const blankRestored = input.value;
    await new Promise((resolve) => setTimeout(resolve, 500));
    const savedText = localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId);
    const saved = savedText ? JSON.parse(savedText) :
      JSON.parse((await guruWorkspaceIdbReadV1(activeProjectId)).serialized);
    const savedName = guruCatalogHubPageNameV1(saved);
    const savedUrl = megaPlatformUrl("fixed", "catalog", saved);
    megaPlatformSetUrl("fixed", "catalog", "");
    urlInput.value = "";
    megaPlatformSyncSeoUrlAction(urlInput);
    const urlAction = urlInput.closest(".mega-platform-url-field")
      .querySelector("[data-mega-url-from-name]");
    const urlActionVisible = !urlAction.hidden;
    urlAction.click();
    const generatedUrl = megaPlatformUrl("fixed", "catalog");
    return { initial, desired, rowName, platformName, catalogSlot, catalogCount, hubType,
      allPagesName, siteName, footerName,
      footerHasCategory,
      urlAfterRename, urlActionHidden, suggestedUrl, blankRestored, savedName, savedUrl,
      urlActionVisible, generatedUrl,
      rowIdAfter: row.id, cardIdAfter: card.id, countAfter: card.pageRows.length };
  })()`);
  const auditOpen = await evaluate('openAuditPageCard("card-22-hub")');
  await waitFor('Boolean(document.querySelector("[data-card=card-22-hub] [data-gate1-page-field=name]"))');
  result.auditName = await evaluate('document.querySelector("[data-card=card-22-hub] [data-gate1-page-field=name]").value');
  assert.equal(auditOpen, true);
  assert.equal(result.initial.name, "Каталог (Хаб)");
  assert.equal(result.initial.cardId, "card-22-hub");
  assert.equal(result.initial.removable, false);
  assert.equal(result.catalogSlot, 1);
  assert.equal(result.catalogCount, 1);
  assert.equal(result.hubType, "Хаб");
  for (const key of ["rowName", "platformName", "allPagesName", "siteName",
    "footerName", "blankRestored", "savedName", "auditName"])
    assert.equal(result[key], result.desired, `${key} was not synchronized`);
  assert.equal(result.urlAfterRename, result.initial.url);
  assert.equal(result.footerHasCategory, true);
  assert.equal(result.savedUrl, result.initial.url);
  assert.equal(result.urlActionHidden, true);
  assert.equal(result.urlActionVisible, true);
  assert.equal(result.suggestedUrl, "https://example.ru/podarki-ruchnoj-raboty");
  assert.equal(result.generatedUrl, result.suggestedUrl);
  assert.equal(result.rowIdAfter, result.initial.rowId);
  assert.equal(result.cardIdAfter, result.initial.cardId);
  assert.equal(result.countAfter, result.initial.count);
  const legacyNamePreserved = await evaluate(`(() => {
    megaPlatformRenameHubPage("Каталог");
    guruCatalogHubSplitV496(state);
    return guruCatalogHubPageNameV1();
  })()`);
  assert.equal(legacyNamePreserved, "Каталог");
  console.log(JSON.stringify(result, null, 2));
  console.log("catalog-hub-name-smoke: PASS");
} finally {
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  page.close();
  browser.close();
}
