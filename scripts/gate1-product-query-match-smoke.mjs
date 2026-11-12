import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const source = JSON.parse(readFileSync(process.env.GURU_GATE1_EXPORT || "/Users/vl/Downloads/gate-1.json", "utf8"));
const fixture = JSON.parse(JSON.stringify({
  project: source.content.project,
  projectComparison: source.content.projectComparison,
  painV130: source.content.painV130,
  gate: source.structure,
}, (_key, value) => typeof value === "string" && value.startsWith("data:image/")
  ? "[image omitted for isolated test]" : value));
const productId = "catalog-item-1786792591872-51f503";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9335";

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      const task = this.pending.get(message.id);
      if (!task) return;
      this.pending.delete(message.id);
      message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
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

const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
const tabs = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
async function evaluate(expression) {
  const result = await page.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1720, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.call("Page.navigate", { url: appUrl });
  for (let attempt = 0; attempt < 200; attempt++) {
    if (await evaluate('document.readyState === "complete" && typeof g1ProductComparisonGuideHtml === "function"')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const initial = await evaluate(`(() => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    state=createFreshWorkspace({id:'query-match-smoke',name:'Коричное яблоко'});
    const imported=${JSON.stringify(fixture)};
    state.project=structuredClone(imported.project);
    state.projectComparison=structuredClone(imported.projectComparison);
    state.painV130=structuredClone(imported.painV130);
    state.gates[state.gates.findIndex(gate=>gate.id==='gate-1')]=structuredClone(imported.gate);
    state.project.id='query-match-smoke'; activeProjectId=state.project.id;
    activeView='gate'; activeGateId='gate-1'; guruV194Ensure(state);
    els.launcher.hidden=true; els.appShell.hidden=false; document.body.classList.remove('access-locked'); updateProjectChrome();
    const product=guruV194Product(${JSON.stringify(productId)},state);
    const entry=ensureProjectComparisonProduct(product.id);
    entry.open=true;
    window.queryMatchSmoke={product,entry,companyBefore:JSON.stringify(state.projectComparison.competitors)};
    window.queryMatchSaveCalls=0; flashSaving=()=>{window.queryMatchSaveCalls++};
    els.contentArea.innerHTML=projectComparisonProductHtml(product);
    const root=document.querySelector('[data-g1pc-unified]');
    const model=g1ProductComparisonModel(root), phrase=g1ProductComparisonCurrent(model).current;
    window.queryMatchSmoke.phraseKey=phrase.key;
    const first=model.entry.competitors[0];
    return {product:product.name,competitors:model.entry.competitors.length,phrase:phrase.value,
      checkboxes:root.querySelectorAll('[data-g1pc-matches-list] input[type="checkbox"]').length,
      buttons:root.querySelectorAll('[data-g1pc-match-toggle]').length,
      count:root.querySelector('[data-g1pc-found-count]').textContent,
      firstFound:first.foundPhraseKeysV539.includes(phrase.key),
      noOverflow:document.documentElement.scrollWidth<=innerWidth};
  })()`);
  assert(initial.product && initial.competitors > 0 && initial.buttons === initial.competitors &&
    initial.checkboxes === 0 && initial.noOverflow, JSON.stringify(initial));
  await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }).then(result =>
    writeFileSync("artifacts/gate1-product-query-match-wide.png", Buffer.from(result.data, "base64")));
  const toggled = await evaluate(`(() => {
    const root=document.querySelector('[data-g1pc-unified]');
    const model=g1ProductComparisonModel(root), phrase=g1ProductComparisonCurrent(model).current;
    const competitor=model.entry.competitors[0];
    const button=root.querySelector('[data-g1pc-match-toggle]');
    const guide=root.querySelector('[data-g1pc-guide]');
    const before=competitor.foundPhraseKeysV539.includes(phrase.key);
    button.click();
    const after=competitor.foundPhraseKeysV539.includes(phrase.key);
    return {before,after,focus:document.activeElement===button,guideStable:guide===root.querySelector('[data-g1pc-guide]'),
      buttonStable:button===root.querySelector('[data-g1pc-match-toggle]'),
      status:root.querySelector('[data-g1pc-match-state]').textContent,
      action:button.textContent,count:root.querySelector('[data-g1pc-found-count]').textContent,
      expected:g1ProductComparisonCounts(model,phrase.key).total,
      saved:window.queryMatchSaveCalls>0,
      companySame:window.queryMatchSmoke.companyBefore===JSON.stringify(state.projectComparison.competitors),
      competitorsSame:model.entry.competitors.length===${initial.competitors}};
  })()`);
  assert(toggled.before !== toggled.after && toggled.focus && toggled.guideStable && toggled.buttonStable &&
    toggled.count.endsWith(String(toggled.expected)) && toggled.saved && toggled.companySame && toggled.competitorsSame,
    JSON.stringify(toggled));
  const finished = await evaluate(`(() => {
    const root=document.querySelector('[data-g1pc-unified]');
    const button=root.querySelector('[data-g1pc-match-toggle]');
    if (button.textContent !== 'Отметить найденным') button.click();
    const before=root.querySelector('[data-g1pc-match-state]').textContent;
    root.querySelector('[data-g1pc-finish]').click();
    const after=root.querySelector('[data-g1pc-match-state]').textContent;
    return {before,after,checkboxes:root.querySelectorAll('[data-g1pc-matches-list] input[type="checkbox"]').length};
  })()`);
  assert(finished.before === "Пока не отмечен" && finished.after === "Не найден по запросу" &&
    finished.checkboxes === 0, JSON.stringify(finished));
  const switched = await evaluate(`(() => {
    const root=document.querySelector('[data-g1pc-unified]');
    const original=window.queryMatchSmoke.phraseKey;
    root.querySelector('[data-g1pc-nav-toggle]').click();
    [...root.querySelectorAll('[data-g1pc-nav-option]')].find(node=>node.dataset.g1pcNavOption!==original).click();
    const second=g1ProductComparisonCurrent(g1ProductComparisonModel(root)).current;
    const expectedSecond=window.queryMatchSmoke.entry.competitors[0].foundPhraseKeysV539.includes(second.key);
    const secondState=root.querySelector('[data-g1pc-match-state]').textContent;
    const secondFinished=g1ProductComparisonFinished(window.queryMatchSmoke.entry,second);
    root.querySelector('[data-g1pc-nav-toggle]').click();
    [...root.querySelectorAll('[data-g1pc-nav-option]')].find(node=>node.dataset.g1pcNavOption===original).click();
    return {changed:second.key!==original,
      secondState,secondMatches:secondState===(expectedSecond?'Найден по запросу':secondFinished?'Не найден по запросу':'Пока не отмечен'),
      originalState:root.querySelector('[data-g1pc-match-state]').textContent,
      originalFound:window.queryMatchSmoke.entry.competitors[0].foundPhraseKeysV539.includes(original)};
  })()`);
  assert(switched.changed && switched.secondMatches && switched.originalState === "Не найден по запросу" &&
    !switched.originalFound, JSON.stringify(switched));
  await page.call("Emulation.setDeviceMetricsOverride", { width: 390, height: 850, deviceScaleFactor: 1, mobile: true });
  await evaluate('document.getElementById("sidebarClose").click(); document.querySelector(".g1pc-match").scrollIntoView({block:"start"}); true');
  await new Promise(resolve => setTimeout(resolve, 400));
  const mobile = await evaluate(`(() => {
    const root=document.querySelector('[data-g1pc-unified]');
    const row=root.querySelector('.g1pc-match');
    const identity=row.querySelector('.g1pc-match-identity').getBoundingClientRect();
    const button=row.querySelector('.g1pc-match-toggle').getBoundingClientRect();
    return {noPageOverflow:document.documentElement.scrollWidth<=innerWidth,
      noRowOverflow:row.scrollWidth<=row.clientWidth+1,
      actionBelow:button.top>=identity.bottom};
  })()`);
  assert(mobile.noPageOverflow && mobile.noRowOverflow && mobile.actionBelow, JSON.stringify(mobile));
  await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }).then(result =>
    writeFileSync("artifacts/gate1-product-query-match-mobile.png", Buffer.from(result.data, "base64")));
  console.log(JSON.stringify({ initial, toggled, finished, switched, mobile }, null, 2));
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  browser.close();
}
