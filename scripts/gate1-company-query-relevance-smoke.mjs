import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const endpoint = `http://127.0.0.1:${process.env.GURU_CHROME_DEBUG_PORT || '9535'}`;
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:9531/';
const output = process.env.GURU_QUERY_OUTPUT || 'artifacts/company-query-relevance';
mkdirSync(output, { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
const fixtures = process.env.GURU_QUERY_FIXTURE ? [process.env.GURU_QUERY_FIXTURE]
  : process.env.GURU_QUERY_VISUAL_ONLY ? ['/private/tmp/guru-competitor-recovery-original.json'] : [
  '/private/tmp/guru-competitor-recovery-original.json',
  '/private/tmp/guru-step6-icleaning-workspace.json',
  '/private/tmp/guru-step6-sivrce-workspace.json',
  '/private/tmp/guru-step6-guru-workspace.json',
];

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map(); this.errors = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown')
        this.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      const task = this.pending.get(message.id); if (!task) return;
      this.pending.delete(message.id); clearTimeout(task.timer);
      message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 120000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const version = await (await fetch(`${endpoint}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const tabs = await (await fetch(`${endpoint}/json`)).json();
const page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async expression => {
  const result = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async expression => {
  const start = Date.now();
  while (Date.now() - start < 30000) {
    if (await evaluate(expression)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timeout: ${expression}`);
};
const screenshot = async name => {
  await evaluate(`(()=>{document.activeElement?.blur();document.querySelector('[data-company-keyword-map]').scrollIntoView({block:'center',behavior:'instant'});return true})()`);
  const image = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${output}/${name}.png`, Buffer.from(image.data, 'base64'));
};
const baseline = `nowGuideWithReadPass(()=>{const all=nowGuideBuildAllBlocks(),path=nowGuidePreflightPath(all),current=nowGuideCurrent(path);return {gate1:nowGuideLaunchReadiness(all.filter(i=>i.gateId==='gate-1')),step:current?.key,missing:current?nowGuideMissingHtml(current):'',launch:nowGuideLaunchReadiness(path)}})`;
const outsideDom = `(()=>{const copy=document.querySelector('[data-g1bp-company]').cloneNode(true);copy.querySelector('[data-company-keyword-map]')?.remove();copy.querySelector('[data-company-query-relevance]')?.remove();return copy.outerHTML})()`;
const report = [];
try {
  await page.call('Runtime.enable'); await page.call('Page.enable');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1050, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `const mem=new Map();Storage.prototype.getItem=function(k){return mem.get(String(k))??null};Storage.prototype.setItem=function(k,v){mem.set(String(k),String(v))};Storage.prototype.removeItem=function(k){mem.delete(String(k))};Storage.prototype.clear=function(){mem.clear()};const f=fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}))):f(u,i);` });
  await page.call('Page.navigate', { url: appUrl });
  await waitFor('document.readyState==="complete"&&typeof g1CompanyQueryRelevanceDerive==="function"');
  await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};true');
  for (const [index, file] of fixtures.entries()) {
    const bytes = readFileSync(file), raw = JSON.parse(bytes), source = raw.workspace || raw.content || raw;
    await evaluate(`(()=>{guruCancelDerivedRefresh();activeProjectId=${JSON.stringify(source.project.id)};state=guruExportWithoutPersistenceV223(()=>migrateWorkspace(${JSON.stringify(source)},${JSON.stringify(source.project.id)}));projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;activeView='gate';activeGateId='gate-1';nowGuideRegistryCache=null;renderGateNav({recalculate:false});renderGate();return true})()`);
    await evaluate(`(()=>{const item=nowGuideWithReadPass(()=>nowGuideBuildAllBlocks()).find(i=>i.id==='project-comparison');nowGuideOpen(item);return true})()`);
    await waitFor(`!!document.querySelector('[data-g1bp-company] [data-company-query-relevance]')`);
    await waitFor(`!nowGuideGate1NavigationPending`);
    await evaluate(`(()=>{const section=document.querySelector('[data-g1bp-company]');section.classList.add('is-open');section.querySelector('.project-comparison-body').hidden=false;section.querySelector('.project-comparison-heading').setAttribute('aria-expanded','true');return true})()`);
    const before = await evaluate('JSON.stringify(state)');
    const guideBefore = await evaluate(baseline);
    const domBefore = await evaluate(outsideDom);
    if (process.env.GURU_QUERY_TRACE_WRITES) await evaluate(`(()=>{const original=g1CompanyComparisonEntry;g1CompanyComparisonEntry=function(write,...args){if(write)throw new Error('Write call: '+new Error().stack);return original(write,...args)};return true})()`);
    const data = await evaluate(`(()=>{const group=g1CompanyComparisonGroups()[0],entry=state.projectComparison||{},d=g1CompanyQueryRelevanceData(entry,group),f=g1CompanyKeywordFilterData(entry,group);const before=JSON.stringify(state);g1CompanyQueryRelevanceDerive(d,{search:'',relevance:'',sort:'',direction:'asc'});const companies=g1CompanyKeywordFilterDerive(f,{search:'',type:'',sort:'found',direction:'desc'});return {companies:d.companies.length,queries:d.phrases.length,ratings:d.phrases.reduce((a,p)=>(a[p.relevance]=(a[p.relevance]||0)+1,a),{}),types:[...new Set(f.competitors.map(c=>c.type))],typeCounts:f.competitors.reduce((a,c)=>(a[c.type]=(a[c.type]||0)+1,a),{}),companyOrder:companies.rows.map(row=>row.count),queryOrder:d.phrases.map(p=>({key:p.key,relevance:p.relevance,found:p.companies.length})),pure:before===JSON.stringify(state)}})()`);
    assert(data.pure);
    assert.equal(await evaluate(`document.querySelectorAll('[data-company-filter]').length`), 1);
    assert.equal(await evaluate(`document.querySelectorAll('[data-company-keyword-map]').length`), 1);
    assert.equal(await evaluate(`document.querySelectorAll('[data-company-query-relevance]').length`), 1);
    assert.equal(await evaluate(`document.querySelector('[data-company-keyword-map-toggle]').textContent.trim()`), `Компании · ${data.companies}`);
    assert.equal(await evaluate(`document.querySelector('[data-company-query-relevance-toggle]').textContent.trim()`), `Запросы и релевантность · ${data.queries}`);
    assert.equal(await evaluate(`document.querySelectorAll('.g1-company-keyword-map-row').length`), 0);
    const segments = await evaluate(`({companies:[...document.querySelectorAll('[data-company-filter-type]')].map(node=>node.textContent.trim()),queries:[...document.querySelectorAll('[data-company-query-relevance-value]')].map(node=>node.textContent.trim()),queryKeys:[...document.querySelectorAll('[data-company-query-row]')].map(node=>node.dataset.companyQueryRow)})`);
    const companyTypeOrder = ['Близкий конкурент', 'Дальний конкурент', 'Сосед по выдаче'];
    const rank = type => { const index = companyTypeOrder.indexOf(type); return index < 0 ? companyTypeOrder.length : index; };
    assert.deepEqual(segments.companies, [`Все ${data.companies}`, ...data.types.slice().sort((a,b)=>rank(a)-rank(b)).map(type=>`${type} ${data.typeCounts[type]}`)]);
    const relevanceLabels = { high:'Высокая', medium:'Средняя', low:'Низкая', unrated:'Не оценена' };
    assert.deepEqual(segments.queries, [`Все ${data.queries}`, ...Object.keys(relevanceLabels).filter(key=>data.ratings[key]).map(key=>`${relevanceLabels[key]} ${data.ratings[key]}`)]);
    assert.deepEqual(segments.queryKeys, data.queryOrder.map(row=>row.key));
    assert(data.companyOrder.every((count,index)=>index===0 || data.companyOrder[index-1]>=count));
    const relevanceRank = Object.keys(relevanceLabels);
    assert(data.queryOrder.every((row,index)=>index===0 ||
      relevanceRank.indexOf(data.queryOrder[index-1].relevance)<relevanceRank.indexOf(row.relevance) ||
      (data.queryOrder[index-1].relevance===row.relevance && data.queryOrder[index-1].found>=row.found)));
    if (index === 0 && !process.env.GURU_QUERY_FIXTURE) {
      await evaluate(`(()=>{const button=document.querySelector('[data-company-keyword-map-toggle]');if(button.getAttribute('aria-expanded')!=='true')button.click();return true})()`);
      await evaluate(`(()=>{const button=document.querySelector('[data-company-query-relevance-toggle]');if(button.getAttribute('aria-expanded')!=='true')button.click();return true})()`);
      await screenshot('01-both-expanded');
      assert.equal(await evaluate(`document.querySelectorAll('[data-company-filter-row]').length`), data.companies);
      const companySearch = await evaluate(`(()=>{const input=document.querySelector('[data-company-filter-search]');input.focus();input.value='livemaster';input.dispatchEvent(new Event('input',{bubbles:true}));return document.activeElement===input})()`);
      assert(companySearch);
      await screenshot('02-companies-search');
      await evaluate(`document.querySelector('[data-company-filter-reset]').click()`);
      if (data.types.length) {
        await evaluate(`document.querySelectorAll('[data-company-filter-type]')[1].click()`);
        await screenshot('03-companies-type');
      }
      await evaluate(`document.querySelector('[data-company-filter-type=""]').click()`);
      await evaluate(`document.querySelector('[data-company-filter-sort="name"]').click()`);
      await screenshot('04-companies-sort');
      await evaluate(`document.querySelector('[data-company-filter-sort="found"]').click()`);
      assert.equal(await evaluate(`document.querySelectorAll('.g1-company-filter-top').length`), 5);
      await evaluate(`document.querySelector('[data-company-filter-row]').click()`);
      assert(await evaluate(`!!document.querySelector('.g1-company-filter-queries [data-company-search-show-key]')`));
      await screenshot('05-companies-top5-expanded');
      await screenshot('06-queries-expanded');
      for (const rating of ['high','medium','low','unrated']) {
        if (!data.ratings[rating]) continue;
        await evaluate(`document.querySelector('[data-company-query-relevance-value="${rating}"]').click()`);
        assert.equal(await evaluate(`document.querySelectorAll('[data-company-query-row]').length`), data.ratings[rating]);
        assert.equal(await evaluate(`document.querySelector('[data-company-query-reset]').hidden`), false);
        await screenshot(`07-queries-${rating}-reset`);
      }
      await evaluate(`document.querySelector('[data-company-query-relevance-value=""]').click()`);
      const querySearch = await evaluate(`(()=>{const input=document.querySelector('[data-company-query-search]');input.focus();input.value='livemaster';input.dispatchEvent(new Event('input',{bubbles:true}));return document.activeElement===input})()`);
      assert(querySearch);
      assert.equal(await evaluate(`document.querySelector('[data-company-query-active]').hidden`), false);
      await screenshot('08-queries-search-reset');
      await evaluate(`document.querySelector('[data-company-query-reset]').click()`);
      await evaluate(`document.querySelector('[data-company-query-sort="far"]').click()`);
      await evaluate(`document.querySelector('[data-company-query-sort="far"]').click()`);
      await evaluate(`document.querySelector('[data-company-query-row]').click()`);
      assert(await evaluate(`!!document.querySelector('.g1-company-query-companies [data-company-search-show-key]')`));
      await screenshot('09-queries-sort-expanded');
      if (process.env.GURU_QUERY_VISUAL_ONLY) {
        await evaluate(`(()=>{
          const sample=structuredClone(g1CompanyQueryRelevanceData(state.projectComparison||{},g1CompanyComparisonGroups()[0]));
          for(const [index,key] of ['high','medium'].entries()){
            sample.phrases[index].relevance=key;
            sample.phrases[index].relevanceLabel=new Map(G1_COMPANY_QUERY_RELEVANCE_LABELS).get(key);
          }
          const screen=g1CompanyQueryRelevanceScreen();
          Object.assign(screen,{search:'',relevance:'',sort:'',direction:'asc',expandedKey:''});
          document.querySelector('[data-company-query-relevance]').outerHTML=g1CompanyQueryRelevanceHtml(sample);
          document.querySelector('[data-company-query-relevance-toggle]').click();
          return true;
        })()`);
        for (const rating of ['high','medium']) {
          await evaluate(`document.querySelector('[data-company-query-relevance-value="${rating}"]').click()`);
          await screenshot(`10-qa-queries-${rating}`);
        }
      }
      await evaluate(`document.querySelector('[data-company-keyword-map-toggle]').click()`);
      await evaluate(`document.querySelector('[data-company-query-relevance-toggle]').click()`);
    } else {
      await evaluate(`(()=>{document.querySelector('[data-company-keyword-map-toggle]').click();const search=document.querySelector('[data-company-filter-search]');search.value='нет совпадений';search.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-company-filter-reset]').click();document.querySelector('[data-company-filter-sort="name"]').click();document.querySelectorAll('[data-company-filter-type]')[1]?.click();document.querySelector('[data-company-filter-row]')?.click();document.querySelector('[data-company-keyword-map-toggle]').click();document.querySelector('[data-company-query-relevance-toggle]').click();const query=document.querySelector('[data-company-query-search]');query.value='нет совпадений';query.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-company-query-reset]').click();document.querySelector('[data-company-query-sort="query"]').click();document.querySelector('[data-company-query-row]')?.click();document.querySelector('[data-company-query-relevance-toggle]').click();return true})()`);
    }
    assert.equal(await evaluate(outsideDom), domBefore, `DOM outside disclosures changed: ${source.project.name}`);
    const after = await evaluate('JSON.stringify(state)');
    if (after !== before) {
      const oldState = JSON.parse(before), newState = JSON.parse(after);
      const changed = [...new Set([...Object.keys(oldState), ...Object.keys(newState)])]
        .filter(key => JSON.stringify(oldState[key]) !== JSON.stringify(newState[key]));
      const details = [];
      const find = (a, b, path) => {
        if (details.length >= 8 || JSON.stringify(a) === JSON.stringify(b)) return;
        if (a && b && typeof a === 'object' && typeof b === 'object') {
          for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) find(a[key], b[key], `${path}.${key}`);
        } else details.push({ path, before: String(a).slice(0, 80), after: String(b).slice(0, 80) });
      };
      for (const key of changed) find(oldState[key], newState[key], key);
      throw new Error(`Serialized state changed: ${source.project.name}; ${JSON.stringify(details)}`);
    }
    assert.deepEqual(await evaluate(baseline), guideBefore, `Gate 1 or guide changed: ${source.project.name}`);
    if (data.queries) {
      await evaluate(`(()=>{
        const companies=document.querySelector('[data-company-keyword-map-toggle]');
        if(companies.getAttribute('aria-expanded')!=='true')companies.click();
        document.querySelector('.g1-company-filter-queries [data-company-search-show-key]')?.click();
        const queries=document.querySelector('[data-company-query-relevance-toggle]');
        if(queries.getAttribute('aria-expanded')!=='true')queries.click();
        const current=g1CompanyComparisonSuggestedPhrase(state.projectComparison||{},g1CompanyComparisonGroups()[0]);
        const row=[...document.querySelectorAll('[data-company-query-row]')].find(node=>node.dataset.companyQueryRow===current?.key);
        if(row?.getAttribute('aria-expanded')!=='true')row?.click();
        [...document.querySelectorAll('[data-company-query-row]')]
          .find(node=>node.dataset.companyQueryRow===current?.key)
          ?.parentElement.querySelector('.g1-company-query-companies [data-company-search-show-key]')?.click();
        return true;
      })()`);
      assert.equal(await evaluate('JSON.stringify(state)'), before, `Query navigation changed project: ${source.project.name}`);
      assert.deepEqual(await evaluate(baseline), guideBefore, `Query navigation changed Gate 1 or guide: ${source.project.name}`);
    }
    report.push({ project: source.project.name, sourceSha256: sha(bytes), beforeSha256: sha(before), afterSha256: sha(after), identical: true, guide: guideBefore, ...data });
    console.log(`${source.project.name}: PASS`);
  }
  assert.deepEqual(page.errors, []);
  writeFileSync(`${output}/${process.env.GURU_QUERY_VISUAL_ONLY ? 'visual-' : ''}smoke-results.json`, JSON.stringify({ report }, null, 2));
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  page.close(); browser.close();
}
