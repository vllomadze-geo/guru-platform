import { readFile, writeFile } from "node:fs/promises";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const files = await Promise.all([0, 1, 2, 4].map(async (id) =>
  JSON.parse(await readFile(`/Users/vl/Downloads/gate-${id}.json`, "utf8"))));
const [gate0, gate1, gate2, gate4] = files;
const goatId = "catalog-item-1786792591872-51f503";
const fixture = {
  project: Object.fromEntries(Object.entries(gate1.content.project).filter(([key]) => !key.startsWith("_"))),
  gate0Cards: gate0.gate.cards,
  gate1PageCards: gate1.gate.cards.filter((card) => (card.pageRows || []).some((row) => row.catalogItemIdV189 === goatId)),
  painV130: gate1.content.painV130,
  projectComparison: gate1.content.projectComparison,
  gate2Cards: gate2.gate.cards,
  gate4Production: gate4.content.gate4Production,
  gate4: gate4.content.gate4,
};

class CDP {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", ({ data }) => {
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
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws.close(); }
}

const version = await (await fetch("http://127.0.0.1:9335/json/version")).json();
const browser = new CDP(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
const target = (await (await fetch("http://127.0.0.1:9335/json")).json()).find((row) => row.id === targetId);
const page = new CDP(target.webSocketDebuggerUrl);
const errors = [];
async function evalJs(expression) {
  const result = await page.call("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}
async function until(expression, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evalJs(`Boolean(${expression})`)) return;
    await wait(120);
  }
  throw new Error(`Timeout: ${expression}`);
}

try {
  console.error("Gate 3 smoke: browser ready");
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  page.ws.addEventListener("message", ({ data }) => {
    const event = JSON.parse(data);
    if (event.method === "Runtime.exceptionThrown") errors.push(event.params.exceptionDetails.exception?.description || event.params.exceptionDetails.text);
  });
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1600, height: 2400, deviceScaleFactor: 1, mobile: false });
  await page.call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    const realFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes('/api/')
      ? Promise.resolve(new Response(JSON.stringify({ok:true}), {status:200,headers:{'Content-Type':'application/json'}}))
      : realFetch(input, init);
  }` });
  await page.call("Page.navigate", { url: "http://127.0.0.1:3000/" });
  await until('document.readyState === "complete" && typeof bootstrapAppOnce === "function"');
  console.error("Gate 3 smoke: app loaded");
  const setup = await evalJs(`(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const fixture = ${JSON.stringify(fixture)};
    const meta = {id:'gate3-ro-smoke',name:'Коричное яблоко',lifecycleStatus:'active'};
    projects = [meta];
    state = createFreshWorkspace(meta);
    setAccessState(true);
    activeProjectId = meta.id;
    activeView = 'gate';
    activeGateId = 'gate-3';
    els.launcher.hidden = true;
    els.appShell.hidden = false;
    Object.assign(state.project, fixture.project, {name:'Коричное яблоко'});
    for (const [id, cards] of [['gate-0', fixture.gate0Cards], ['gate-2', fixture.gate2Cards]]) {
      const gate = state.gates.find((entry) => entry.id === id);
      for (const source of cards) {
        const target = gate.cards.find((entry) => entry.id === source.id);
        if (target) Object.assign(target, source);
      }
    }
    const gateOne = state.gates.find((entry) => entry.id === 'gate-1');
    for (const source of fixture.gate1PageCards) {
      const target = gateOne.cards.find((entry) => entry.id === source.id);
      if (target) Object.assign(target, source);
    }
    state.painV130 = fixture.painV130;
    state.projectComparison = fixture.projectComparison;
    state.gate4Production = fixture.gate4Production;
    state.gate4 = fixture.gate4;
    state.project.gate0ScopeUiV194 = state.project.gate0ScopeUiV194 || {};
    state.project.gate0ScopeUiV194.selectedProductId = ${JSON.stringify(goatId)};
    renderGate();
    return {product:state.project.catalogItemsV189.find((entry) => entry.id === ${JSON.stringify(goatId)})?.name};
  })()`);
  console.error("Gate 3 smoke: fixture applied");
  await until('document.querySelectorAll("[data-g3ro-scope]").length === 2');
  const first = await evalJs(`(() => {
    const maps = [...document.querySelectorAll('[data-g3ro-scope]')];
    return {
      headings: maps.map((map) => map.querySelector('h2')?.textContent),
      counts: maps.map((map) => map.querySelector('.g3ro-map-head strong')?.textContent),
      stages: maps.map((map) => map.querySelectorAll('[data-g3ro-stage]').length),
      oldControls: document.querySelectorAll('[data-g3a-add-tool], [data-g3-product-journey-select], [data-g3-tool-add]').length,
      inputs: document.querySelectorAll('[data-gate3-readonly-5a] input, [data-gate3-readonly-5a] textarea').length,
      selectors: document.querySelectorAll('[data-gate3-readonly-5a] select').length,
      links: document.querySelectorAll('[data-gate3-readonly-5a] [data-g4-jump-target]').length,
      missingOpen: [...document.querySelectorAll('[data-g3ro-stage]')].filter((row) => row.querySelector('.g3ro-badge.is-missing')).every((row) => row.classList.contains('is-open')),
      doneClosed: [...document.querySelectorAll('[data-g3ro-stage]')].filter((row) => row.querySelector('.g3ro-badge.is-done')).every((row) => !row.classList.contains('is-open')),
      stageRows: [...document.querySelectorAll('[data-g3ro-stage]')].map((row) => ({key:row.dataset.g3roStage,open:row.classList.contains('is-open'),badge:row.querySelector('.g3ro-badge')?.textContent})),
      firstStageHtml: document.querySelector('[data-g3ro-stage]')?.outerHTML.slice(0, 250),
      noOverflow: document.documentElement.scrollWidth <= innerWidth,
      countersMatch: maps.every((map) => {
        const stages = [...map.querySelectorAll('[data-g3ro-stage]')];
        const stageCounts = stages.every((stage) => {
          const rows = [...stage.querySelectorAll('.g3ro-item:not(.is-archive)')];
          const done = rows.filter((row) => row.classList.contains('is-done')).length;
          const badgeDone = stage.querySelector('.g3ro-badge')?.textContent === 'Сделано';
          return stage.querySelector('.g3ro-stage-count')?.textContent === 
            \`${'${done}'} из ${'${rows.length}'}\` && badgeDone === (rows.length > 0 && done === rows.length);
        });
        const doneStages = stages.filter((stage) => stage.querySelector('.g3ro-badge')?.textContent === 'Сделано').length;
        return stageCounts && map.querySelector('.g3ro-map-head strong')?.textContent === 
          \`${'${doneStages}'} из 5 этапов\` && map.querySelectorAll('.g3ro-progress .is-done').length === doneStages;
      }),
      sourceTargets: [...document.querySelectorAll('[data-gate3-readonly-5a] [data-g4-jump-target]')].map((node) => JSON.parse(node.dataset.g4JumpTarget)),
      title: document.querySelector('[data-g3ro-product]')?.selectedOptions[0]?.textContent,
      exports: [...document.querySelectorAll('button')].filter((node) => /Экспорт структуры и контента|Экспорт всего проекта/.test(node.textContent)).map((node) => node.textContent.trim()),
    };
  })()`);
  if (setup.product !== 'Символ 2027 года «Коза»' || first.headings.join(',') !== 'Компания,Продукт/Услуга' ||
      first.stages.some((n) => n !== 5) || first.inputs || first.selectors !== 1 || !first.missingOpen || !first.doneClosed || !first.noOverflow || !first.countersMatch || errors.length)
    throw new Error(`Initial map mismatch: ${JSON.stringify({setup,first,errors})}`);
  const guideLink = await evalJs(`(() => {
    const button = document.querySelector('[data-g3ro-scope="product"] [data-g3-product-stage-toggle="aware"]');
    button.click();
    nowGuideReveal34({gateId:'gate-3',kind:'stage',id:'aware'});
    return {open:button.getAttribute('aria-expanded') === 'true',
      oldEditor:document.querySelectorAll('[data-gate3-readonly-5a] .g3-execution-map-v282').length};
  })()`);
  if (!guideLink.open || guideLink.oldEditor) throw new Error(`Now guide link mismatch: ${JSON.stringify(guideLink)}`);
  const screenshot = await page.call("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await writeFile("artifacts/gate3-readonly-5a-korichnoe-yabloko.png", Buffer.from(screenshot.data, "base64"));
  const snapshots = await evalJs(`(() => {
    const before = JSON.stringify(state);
    renderGate3Redesign();
    return { before, after: JSON.stringify(state) };
  })()`);
  const { before, after } = snapshots;
  const stable = before === after;
  const changed = [];
  const diff = (a, b, path = '') => {
    if (changed.length >= 12) return;
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') { changed.push(path); return; }
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) diff(a[key], b[key], `${path}.${key}`);
  };
  if (!stable) diff(JSON.parse(before), JSON.parse(after));
  const switchCheck = await evalJs(`(() => {
    const select = document.querySelector('[data-g3ro-product]');
    const previous = select.value;
    const globalBefore = state.project.gate0ScopeUiV194.selectedProductId;
    const other = [...select.options].find((option) => option.value && option.value !== previous);
    select.value = other.value;
    select.dispatchEvent(new Event('change', {bubbles:true}));
    return {previous, selected:document.querySelector('[data-g3ro-product]').value,
      globalBefore, globalAfter:state.project.gate0ScopeUiV194.selectedProductId,
      stages:document.querySelector('[data-g3ro-scope="product"]').querySelectorAll('[data-g3ro-stage]').length};
  })()`);
  await page.call("Emulation.setDeviceMetricsOverride", { width: 390, height: 1200, deviceScaleFactor: 1, mobile: true });
  const mobile = await evalJs(`({overflow:document.documentElement.scrollWidth > innerWidth,
    linksBelow:[...document.querySelectorAll('.g3ro-item')].every((row) => {
      const link=row.querySelector('.g3ro-link'), title=row.querySelector('.g3ro-item-copy');
      return !link || link.getBoundingClientRect().top >= title.getBoundingClientRect().top;
    })})`);
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1600, height: 2400, deviceScaleFactor: 1, mobile: false });
  const sampleLink = await evalJs(`(() => {
    const node = [...document.querySelectorAll('[data-g3ro-scope="company"] [data-g4-jump-target]')]
      .find((node) => JSON.parse(node.dataset.g4JumpTarget).kind === 'gate0-company-brand-purpose');
    node.click();
    return {gate:activeGateId};
  })()`);
  await until("Boolean(document.querySelector('.guru-source-target-v212'))", 12000);
  sampleLink.highlight = await evalJs("Boolean(document.querySelector('.guru-source-target-v212'))");
  if (!stable || switchCheck.selected === switchCheck.previous || switchCheck.globalAfter !== switchCheck.globalBefore ||
      switchCheck.stages !== 5 || mobile.overflow || !mobile.linksBelow || sampleLink.gate !== 'gate-0' || !sampleLink.highlight || errors.length)
    throw new Error(`Gate 3 checks failed: ${JSON.stringify({stable,changed,switchCheck,mobile,sampleLink,errors})}`);
  await evalJs("guruNavigateToGate('gate-3'); true");
  await until("Boolean(document.querySelector('[data-gate3-readonly-5a]'))");
  await evalJs(`(() => { const select=document.querySelector('[data-g3ro-product]');
    select.value=${JSON.stringify(goatId)}; select.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
  const archive = await evalJs(`(() => {
    state.gate3_5a = state.gate3_5a || {};
    state.gate3_5a.aware = { answer:'да', fields:{message:['Сохранённое первое сообщение']},
      toolStatuses:{'PR-публикации':'works'} };
    state.gate3Gate4StructureV290 = {byProduct:{[${JSON.stringify(goatId)}]:{stages:{aware:{groups:[
      {items:[{label:'Сохранённый инструмент продукта',toolId:'custom-smoke',instanceId:'custom-smoke'}]}
    ]}}}}};
    renderGate3Redesign();
    const rows = [...document.querySelectorAll('.g3ro-item.is-archive')];
    return {labels:rows.map((row) => row.querySelector('strong')?.textContent),
      contents:rows.map((row) => row.textContent),
      links:rows.filter((row) => row.querySelector('[data-g4-jump-target]')).length,
      editors:document.querySelectorAll('[data-gate3-readonly-5a] input, [data-gate3-readonly-5a] textarea').length};
  })()`);
  if (!archive.labels.includes('PR-публикации') || !archive.labels.includes('Сохранённый инструмент продукта') ||
      !archive.contents.some((value) => value.includes('Сохранённое первое сообщение')) || archive.links < 3 || archive.editors)
    throw new Error(`Archived records mismatch: ${JSON.stringify(archive)}`);
  const recalculation = await evalJs(`(() => {
    const act = () => document.querySelector('[data-g3ro-scope="product"] [data-g3ro-stage$=":act"] .g3ro-stage-count')?.textContent;
    const before = act();
    state.project.productBindingsV185[${JSON.stringify(goatId)}].landing.status = 'works';
    const mega = state.gates.find((row) => row.id === 'gate-0').cards.find(isMegaMarketingCard);
    mega.megaMarketing.platformV2.urlsV1.products[${JSON.stringify(goatId)}] = 'https://example.test/goat';
    renderGate3Redesign();
    return {before, after:act()};
  })()`);
  await evalJs("guruNavigateToGate('gate-0'); true");
  await until("activeGateId === 'gate-0' && Boolean(document.querySelector('[data-mega-legal-block]'))");
  await evalJs("guruNavigateToGate('gate-3'); true");
  await until("activeGateId === 'gate-3' && Boolean(document.querySelector('[data-gate3-readonly-5a]'))");
  recalculation.afterReturn = await evalJs("document.querySelector('[data-g3ro-scope=\"product\"] [data-g3ro-stage$=\":act\"] .g3ro-stage-count')?.textContent");
  if (recalculation.before === recalculation.after || recalculation.after !== recalculation.afterReturn)
    throw new Error(`Source recalculation mismatch: ${JSON.stringify(recalculation)}`);
  const archiveTargets = await evalJs(`[...document.querySelectorAll('.g3ro-item.is-archive [data-g4-jump-target]')].map((node) => JSON.parse(node.dataset.g4JumpTarget))`);
  let sourceTargets = [...new Map([...first.sourceTargets, ...archiveTargets].map((row) => [JSON.stringify(row), row])).values()];
  if (process.env.G3RO_AUDIT_KINDS) {
    const kinds = new Set(process.env.G3RO_AUDIT_KINDS.split(','));
    sourceTargets = sourceTargets.filter((target) => kinds.has(target.kind));
  }
  const sourceAudit = [];
  for (const target of sourceTargets) {
    await evalJs("guruNavigateToGate('gate-3'); true");
    await until("activeGateId === 'gate-3' && Boolean(document.querySelector('[data-gate3-readonly-5a]'))");
    await evalJs(`(() => {
      const target = ${JSON.stringify(target)};
      g3ProductJourneyPrepareSource(target);
      guruInvalidateGateViewCache();
      guruNavigateToGate(target.gateId);
      g3ProductJourneyFocusSource(target);
      return true;
    })()`);
    await until(`activeGateId === ${JSON.stringify(target.gateId)}`);
    let found = false;
    for (let attempt = 0; attempt < 35; attempt += 1) {
      found = await evalJs(`Boolean(g3ProductJourneyFindSource(${JSON.stringify(target)}))`);
      if (found) break;
      await wait(120);
    }
    const diagnostic = found ? null : await evalJs(`({
      main:document.querySelector('main')?.innerText.slice(0,350),
      direct:document.querySelectorAll('[data-gate1-direct-product-v265]').length,
      demand:document.querySelectorAll('[data-pv181-demand-product-v262]').length,
      final:document.querySelectorAll('[data-gate1-final-foundation-v259]').length,
      sections:[...document.querySelectorAll('.g1-section-title')].map((node)=>node.textContent.slice(0,45)),
      productScope:document.querySelector('[data-gate-scope="product"]')?.outerHTML.slice(0,450),
      accordions:typeof getGate1AccordionState==='function'?getGate1AccordionState().subblocks:null,
      selected:typeof guruV194SelectedProduct==='function'?guruV194SelectedProduct(state)?.id:null,
      section:document.querySelector('[data-gate1-toggle-section="pain_jtbd_offer"]')?.closest('section')?.outerHTML.slice(0,1300),
      route:document.querySelector('.pv140-strategy-direct')?.outerHTML.slice(0,550),
    })`);
    sourceAudit.push({kind:target.kind, field:target.field || target.area || target.rowName || '',
      gate:target.gateId, found, diagnostic});
  }
  if (sourceAudit.some((row) => !row.found)) throw new Error(`Unresolved source links: ${JSON.stringify(sourceAudit.filter((row) => !row.found))}`);
  console.log(JSON.stringify({setup,first:{...first,sourceTargets:first.sourceTargets.length},guideLink,stable,switchCheck,mobile,sampleLink,archive,recalculation,sourceAudit,errors},null,2));
} finally {
  page.close();
  await browser.call("Target.closeTarget", { targetId }).catch(() => {});
  await browser.call("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
  browser.close();
}
