import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:9531/';
const fixture = process.env.GURU_GATE1_SOURCE_EXPORT || '/private/tmp/guru-now-korich-workspace.json';
const output = 'artifacts/company-competitor-keywords';
mkdirSync(output, { recursive: true });
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const before = readFileSync(fixture), raw = JSON.parse(before), source = raw.workspace || raw.content || raw;

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map(); this.errors = []; this.dialogs = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown')
        this.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      if (message.method === 'Page.javascriptDialogOpening') {
        this.dialogs.push(message.params);
        this.call('Page.handleJavaScriptDialog', { accept: true }).catch(error => this.errors.push(error.message));
      }
      const task = this.pending.get(message.id); if (!task) return;
      this.pending.delete(message.id); clearTimeout(task.timer);
      if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id, timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 120000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
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

try {
  await page.call('Runtime.enable'); await page.call('Page.enable');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1200, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `const mem=new Map();Storage.prototype.getItem=function(k){return mem.get(String(k))??null};Storage.prototype.setItem=function(k,v){mem.set(String(k),String(v))};Storage.prototype.removeItem=function(k){mem.delete(String(k))};Storage.prototype.clear=function(){mem.clear()};const f=fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}))):f(u,i);` });
  await page.call('Page.navigate', { url: appUrl });
  await waitFor('document.readyState==="complete"&&typeof g1CompanyComparisonSuggestionHtml==="function"');
  await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};true');
  await evaluate(`(()=>{guruCancelDerivedRefresh();activeProjectId=${JSON.stringify(source.project.id)};state=guruExportWithoutPersistenceV223(()=>migrateWorkspace(${JSON.stringify(source)},${JSON.stringify(source.project.id)}));projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];updateProjectChrome();els.launcher.hidden=true;els.appShell.hidden=false;activeView='gate';activeGateId='gate-1';nowGuideRegistryCache=null;renderGateNav({recalculate:false});return true})()`);
  await evaluate(`(()=>{const item=nowGuideWithReadPass(()=>nowGuideBuildAllBlocks()).find(i=>i.id==='project-comparison');nowGuideOpen(item);return true})()`);
  await evaluate(`(()=>{const section=document.querySelector('[data-g1bp-company]');section.classList.add('is-open');section.querySelector('.project-comparison-body').hidden=false;section.scrollIntoView({block:'start',behavior:'instant'});return true})()`);
  await page.call('Page.bringToFront');
  const initial = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${output}/company-search-guide-initial.png`, Buffer.from(initial.data, 'base64'));
  await evaluate(`(()=>{document.querySelector('[data-g1bp-company] [data-company-competitor-toggle]').click();return true})()`);
  const formImage = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${output}/company-competitor-form.png`, Buffer.from(formImage.data, 'base64'));
  await evaluate(`(()=>{document.querySelector('[data-g1bp-company] [data-company-competitor-cancel]').click();return true})()`);
  const report = await evaluate(`(()=>{
    const section=document.querySelector('[data-g1bp-company]');
    if(!section) throw Error('Company comparison missing');
    const projectBefore=JSON.stringify(state), productsBefore=JSON.stringify(state.projectComparison?.productsById);
    const html=projectComparisonHtml();
    const pure=projectBefore===JSON.stringify(state);
    const noPriceInput=!html.includes('Ценовой уровень компании')&&!section.querySelector('[data-project-comparison-cell][data-project-comparison-owner]');
    let guide=section.querySelector('[data-company-search-guide]');
    const groups=g1CompanyComparisonGroups()[0];
    const disclosurePairs=[
      ['[data-company-keyword-map-toggle]','[data-company-keyword-map-list]'],
      ['[data-company-query-relevance-toggle]','[data-company-query-relevance-list]'],
      ['[data-company-matches-toggle]','[data-company-matches-list]'],
    ];
    const disclosureState=expanded=>disclosurePairs.every(([toggle,list])=>{
      const button=section.querySelector(toggle), body=section.querySelector(list);
      return button?.getAttribute('aria-expanded')===String(expanded)&&body?.hidden===!expanded;
    });
    const disclosuresDefaultOpen=disclosureState(true);
    const beforeDisclosure=JSON.stringify(state);
    disclosurePairs.forEach(([toggle])=>section.querySelector(toggle).click());
    const disclosuresCollapsed=disclosureState(false);
    g1CompanyComparisonSuggestionRefresh(section,state.projectComparison,groups);
    const disclosuresStayCollapsed=disclosureState(false);
    const rerendered=document.createElement('div');
    rerendered.innerHTML=projectComparisonHtml();
    const disclosuresStayCollapsedAcrossRender=disclosurePairs.every(([toggle,list])=>
      rerendered.querySelector(toggle)?.getAttribute('aria-expanded')==='false'&&
      rerendered.querySelector(list)?.hidden===true);
    disclosurePairs.forEach(([toggle])=>section.querySelector(toggle).click());
    const disclosuresReopened=disclosureState(true);
    const disclosuresReadOnly=beforeDisclosure===JSON.stringify(state);
    guide=section.querySelector('[data-company-search-guide]');
    const firstKey=g1CompanyComparisonSuggestedPhrase(state.projectComparison,groups).key;
    const highestUnrated=[...groups.phrases].sort((a,b)=>(b.frequency??-1)-(a.frequency??-1)||a.value.localeCompare(b.value,'ru'))[0];
    const actionOrder=[...guide.querySelectorAll(':scope > .g1-company-search-guide-actions > button')].map(node=>node.textContent.trim());
    const ratingHiddenBeforeFinish=!guide.querySelector('[data-g1bp-relevance-v549]');
    const tableRatingLockedBeforeFinish=[...section.querySelectorAll('.g1bp-phrase-list-v548 [data-g1bp-phrase-v549]')].find(node=>node.dataset.g1bpPhraseV549===firstKey)?.disabled;
    const nextBlockedBeforeFinish=guide.querySelector('[data-company-search-next]').disabled;
    guide.querySelector('[data-company-search-next]')?.click();
    const nextBlocked=projectBefore===JSON.stringify(state)&&g1CompanyComparisonSuggestedPhrase(state.projectComparison,groups).key===firstKey;
    section.querySelector('[data-company-competitor-toggle]').click();
    const form=section.querySelector('[data-company-competitor-form]');
    const formOpens=!form.hidden;
    const formOrder=[...form.querySelectorAll('.g1-company-competitor-fields > label')].map(label=>label.firstChild.textContent.trim());
    const formStartsAtDomain=document.activeElement===form.elements.domain;
    form.elements.name.value='Тестовый конкурент';
    form.elements.domain.value='https://test-competitor.example/catalog';
    form.elements.title.value='Заголовок тестового конкурента';
    form.querySelector('[name="type"][value="close"]').checked=true;
    const countBefore=state.projectComparison.competitors.length;
    form.requestSubmit();
    const competitor=state.projectComparison.competitors.at(-1);
    const added=state.projectComparison.competitors.length===countBefore+1;
    const foundDraftBeforeFinish=section.querySelector('[data-company-found-draft="'+competitor.id+'"]')?.checked;
    const foundStoredBeforeFinish=competitor.foundPhraseKeysV539.includes(firstKey);
    const foundShownBeforeFinish=section.querySelector('[data-company-competitor-query-count="'+competitor.id+'"]')?.textContent==='1 из '+groups.phrases.length&&
      section.querySelector('[data-g1bp-keywords-for-v550="'+competitor.id+'"] [value="'+CSS.escape(firstKey)+'"]')?.checked;
    g1CompanySearchSessions.delete(state);
    g1CompanyComparisonSuggestionRefresh(section,state.projectComparison,groups);
    const foundRestoredBeforeFinish=section.querySelector('[data-company-found-draft="'+competitor.id+'"]')?.checked&&
      !g1CompanySearchSession(state.projectComparison,g1CompanyComparisonSuggestedPhrase(state.projectComparison,groups)).finished;
    const draftTop=section.querySelector('.g1-company-match [data-company-found-draft="'+competitor.id+'"]');
    draftTop.checked=false;draftTop.dispatchEvent(new Event('change',{bubbles:true}));
    const draftUncheckStored=!g1CompanySearchSession(state.projectComparison,g1CompanyComparisonSuggestedPhrase(state.projectComparison,groups)).foundIds.has(competitor.id)&&
      !competitor.foundPhraseKeysV539.includes(firstKey);
    section.querySelector('[data-company-competitor-disclosure="'+competitor.id+'"]').click();
    const draftDetail=section.querySelector('[data-company-competitor-panel="'+competitor.id+'"] [data-company-found-draft="'+competitor.id+'"]');
    draftDetail.checked=true;draftDetail.dispatchEvent(new Event('change',{bubbles:true}));
    const draftSynced=section.querySelector('.g1-company-match [data-company-found-draft="'+competitor.id+'"]')?.checked&&
      g1CompanySearchSession(state.projectComparison,g1CompanyComparisonSuggestedPhrase(state.projectComparison,groups)).foundIds.has(competitor.id)&&
      competitor.foundPhraseKeysV539.includes(firstKey);
    section.querySelector('[data-company-competitor-disclosure="'+competitor.id+'"]').click();
    const titleStored=g1BergenSearchAdV570(competitor.bergenV543.advertisements).title==='Заголовок тестового конкурента';
    const typeClose=g1BergenTypeV543(competitor,g1CompanyComparisonGroups())==='direct';
    const titleVisible=[...section.querySelectorAll('[data-g1bp-serp-v569]')].some(node=>node.dataset.g1bpSerpV569===competitor.id&&node.textContent.includes('Заголовок тестового конкурента'));
    const linksBeforeFinish=JSON.stringify(state.projectComparison.competitors.map(row=>[row.id,row.foundPhraseKeysV539]));
    section.querySelector('[data-company-search-finish]').click();
    const finishKeptLinks=linksBeforeFinish===JSON.stringify(state.projectComparison.competitors.map(row=>[row.id,row.foundPhraseKeysV539]));
    const foundStored=competitor.foundPhraseKeysV539.includes(firstKey);
    const completionStored=state.projectComparison.searchFinishedPhraseKeysV601?.includes(firstKey);
    g1CompanySearchSessions.delete(state);
    g1CompanyComparisonSuggestionRefresh(section,state.projectComparison,groups);
    const completionRestored=g1CompanySearchSession(state.projectComparison,g1CompanyComparisonSuggestedPhrase(state.projectComparison,groups)).finished;
    const ratingVisibleAfterFinish=!!section.querySelector('[data-company-search-guide] [data-g1bp-relevance-v549]');
    const matchCounts=()=>section.querySelector('[data-company-search-match-counts]')?.textContent.replace(/\s+/g,' ').trim() || '';
    const closeCountAfterFinish=matchCounts().includes('Найдено по запросу: 1')&&matchCounts().includes('Близкий конкурент 1');
    const tableRatingUnlockedAfterFinish=![...section.querySelectorAll('.g1bp-phrase-list-v548 [data-g1bp-phrase-v549]')].find(node=>node.dataset.g1bpPhraseV549===firstKey)?.disabled;
    const nextBlockedUntilRating=section.querySelector('[data-company-search-next]').disabled;
    const select=section.querySelector('[data-company-search-guide] [data-g1bp-relevance-v549]');
    select.value='high';select.dispatchEvent(new Event('change',{bubbles:true}));
    const ratingStored=state.projectComparison.keywordRelevanceByPhraseV549[firstKey]==='high';
    const nextEnabledAfterRating=!section.querySelector('[data-company-search-next]').disabled;
    const tableRating=[...section.querySelectorAll('.g1bp-phrase-list-v548 [data-g1bp-phrase-v549]')].find(node=>node.dataset.g1bpPhraseV549===firstKey)?.value;
    const chosen=state.projectComparison.selectedKeywordKeysByJtbdV550.company.includes(firstKey);
    const topPressed=section.querySelector('[data-company-search-select]')?.getAttribute('aria-pressed');
    const stayedOnFirst=g1CompanyComparisonSuggestedPhrase(state.projectComparison,groups).key===firstKey;
    section.querySelector('[data-company-competitor-toggle]').click();
    const sameForm=section.querySelector('[data-company-competitor-form]');
    sameForm.elements.domain.value='https://www.test-competitor.example/other-page';
    sameForm.elements.domain.dispatchEvent(new Event('input',{bubbles:true}));
    const sameDomainNotice=sameForm.querySelector('[data-company-competitor-domain-note]').textContent.includes('уже отмечен');
    const sameDomainDisabled=sameForm.querySelector('[data-company-competitor-submit]').disabled&&
      sameForm.querySelector('[data-company-competitor-submit]').textContent==='Уже отмечен';
    sameForm.querySelector('[data-company-competitor-cancel]').click();
    const sameDomainNoDuplicate=state.projectComparison.competitors.length===countBefore+1&&
      g1CompanySearchSession(state.projectComparison,g1CompanyComparisonSuggestedPhrase(state.projectComparison,groups)).finished;
    const closeTotal=projectComparisonStatus().total;
    const typeSelect=()=>section.querySelector('[data-company-competitor-type="'+competitor.id+'"]');
    typeSelect().value='far';typeSelect().dispatchEvent(new Event('change',{bubbles:true}));
    const typeFar=g1BergenTypeV543(competitor,g1CompanyComparisonGroups())==='substitute';
    const farCountAfterClassify=matchCounts().includes('Дальний конкурент 1')&&matchCounts().includes('Близкий конкурент 0');
    const farInAnalysis=projectComparisonStatus().total===closeTotal&&closeTotal>0;
    const stageCell=()=>[...section.querySelectorAll('[data-g1bp-cell-v543]')].find(node=>node.dataset.g1bpCellV543===competitor.id+':Позиционирование');
    const farEditable=stageCell()&&!stageCell().classList.contains('g1bp-not-required-v543');
    typeSelect().value='neighbor';typeSelect().dispatchEvent(new Event('change',{bubbles:true}));
    const typeNeighbor=g1BergenTypeV543(competitor,g1CompanyComparisonGroups())==='unrelated';
    const neighborCountAfterClassify=matchCounts().includes('Сосед по выдаче 1')&&matchCounts().includes('Дальний конкурент 0');
    const neighborExcluded=projectComparisonStatus().total===closeTotal-g1BergenRequiredFieldsV543(g1CompanyComparisonGroups()).length;
    const neighborDisabled=stageCell()?.classList.contains('g1bp-not-required-v543')&&section.querySelector('[data-g1bp-head-v543="'+competitor.id+'"] small b')?.textContent==='Сосед по выдаче';
    section.querySelector('[data-company-search-next]').click();
    const secondKey=g1CompanyComparisonSuggestedPhrase(state.projectComparison,groups).key;
    section.querySelector('[data-company-competitor-toggle]').click();
    const again=section.querySelector('[data-company-competitor-form]');
    again.elements.domain.value='test-competitor.example';
    again.elements.domain.dispatchEvent(new Event('input',{bubbles:true}));
    const duplicateNotice=again.querySelector('[data-company-competitor-domain-note]').textContent.includes('уже в сравнении');
    const duplicateAction=again.querySelector('[data-company-competitor-submit]').textContent==='Отметить для запроса'&&
      !again.querySelector('[data-company-competitor-submit]').disabled&&again.classList.contains('is-existing')&&
      [...again.querySelectorAll('[data-company-competitor-new-only]')].every(node=>getComputedStyle(node).display==='none');
    again.elements.domain.value='fresh-competitor.example';
    again.elements.domain.dispatchEvent(new Event('input',{bubbles:true}));
    const newActionRestored=again.querySelector('[data-company-competitor-submit]').textContent==='Добавить конкурента'&&
      !again.classList.contains('is-existing')&&
      [...again.querySelectorAll('[data-company-competitor-new-only]')].every(node=>getComputedStyle(node).display!=='none');
    again.elements.domain.value='test-competitor.example';
    again.elements.domain.dispatchEvent(new Event('input',{bubbles:true}));
    again.requestSubmit();
    const duplicateLinkedBeforeFinish=state.projectComparison.competitors.length===countBefore+1&&
      competitor.foundPhraseKeysV539.includes(secondKey)&&section.querySelector('[data-company-found-draft="'+competitor.id+'"]')?.checked;
    section.querySelector('[data-company-search-finish]').click();
    const duplicateLinked=competitor.foundPhraseKeysV539.includes(secondKey);
    const nextQueryCount=matchCounts().includes('Найдено по запросу: 1')&&matchCounts().includes('Сосед по выдаче 1');
    const secondRating=section.querySelector('[data-company-search-guide] [data-g1bp-relevance-v549]');
    secondRating.value='medium';secondRating.dispatchEvent(new Event('change',{bubbles:true}));
    const foundVisible=[firstKey,secondKey].every(key=>section.querySelector('[data-company-competitor-panel="'+competitor.id+'"] .g1-company-match-queries [value="'+CSS.escape(key)+'"]')?.checked);
    const column=()=>section.querySelector('[data-g1bp-keywords-for-v550="'+competitor.id+'"]');
    const columnCheck=key=>column()?.querySelector('[data-g1bp-found-keyword-v550][value="'+CSS.escape(key)+'"]');
    const detailCheck=key=>section.querySelector('[data-company-competitor-panel="'+competitor.id+'"] .g1-company-match-queries [value="'+CSS.escape(key)+'"]');
    const twoFoundInColumns=column()?.textContent.includes('Ключевые фразы · 2')&&
      [firstKey,secondKey].every(key=>columnCheck(key)?.checked);
    columnCheck(secondKey).checked=false;columnCheck(secondKey).dispatchEvent(new Event('change',{bubbles:true}));
    const currentQueryUncheckSynced=!g1CompanySearchSession(state.projectComparison,g1CompanyComparisonSuggestedPhrase(state.projectComparison,groups)).foundIds.has(competitor.id)&&
      !section.querySelector('.g1-company-match [data-company-found-draft="'+competitor.id+'"]')?.checked;
    columnCheck(secondKey).checked=true;columnCheck(secondKey).dispatchEvent(new Event('change',{bubbles:true}));
    const currentQueryCheckSynced=g1CompanySearchSession(state.projectComparison,g1CompanyComparisonSuggestedPhrase(state.projectComparison,groups)).foundIds.has(competitor.id)&&
      section.querySelector('.g1-company-match [data-company-found-draft="'+competitor.id+'"]')?.checked;
    section.querySelector('[data-company-search-finish]').click();
    columnCheck(firstKey).checked=false;columnCheck(firstKey).dispatchEvent(new Event('change',{bubbles:true}));
    const columnUncheckSynced=!competitor.foundPhraseKeysV539.includes(firstKey)&&!detailCheck(firstKey)?.checked&&
      !columnCheck(firstKey)?.checked;
    detailCheck(firstKey).checked=true;detailCheck(firstKey).dispatchEvent(new Event('change',{bubbles:true}));
    const detailCheckSynced=competitor.foundPhraseKeysV539.includes(firstKey)&&detailCheck(firstKey)?.checked&&
      columnCheck(firstKey)?.checked;
    const arbitrary=groups.phrases.find(row=>![firstKey,secondKey].includes(row.key));
    const disclosure=section.querySelector('[data-company-competitor-disclosure="'+competitor.id+'"]');
    disclosure.click();
    const arbitraryControl=section.querySelector('[data-company-competitor-panel="'+competitor.id+'"] [data-g1bp-found-keyword-v550][value="'+CSS.escape(arbitrary.key)+'"]');
    const initiallyClear=!arbitraryControl.checked;
    arbitraryControl.checked=true;arbitraryControl.dispatchEvent(new Event('change',{bubbles:true}));
    const arbitraryLinked=competitor.foundPhraseKeysV539.includes(arbitrary.key)&&detailCheck(arbitrary.key)?.checked;
    const arbitraryShown=column()?.textContent.includes('Ключевые фразы · 3')&&columnCheck(arbitrary.key)?.checked;
    const countVisible=section.querySelector('[data-company-competitor-query-count="'+competitor.id+'"]')?.textContent===competitor.foundPhraseKeysV539.length+' из '+groups.phrases.length;
    const mapToggle=section.querySelector('[data-company-keyword-map-toggle]');
    if(mapToggle.getAttribute('aria-expanded')!=='true')mapToggle.click();
    const map=section.querySelector('[data-company-keyword-map-list]');
    const competitorRow=map.querySelector('[data-company-filter-row="'+CSS.escape(competitor.id)+'"]');
    competitorRow?.click();
    const mapQuery=map.querySelector('.g1-company-filter-queries [data-company-search-show-key="'+CSS.escape(arbitrary.key)+'"]');
    const mapLinked=!map.hidden&&competitorRow?.textContent.includes('Тестовый конкурент')&&!!mapQuery;
    const beforeMapNavigation=JSON.stringify(state);
    const secondSessionFinishedBeforeMap=g1CompanySearchSession(state.projectComparison,g1CompanyComparisonSuggestedPhrase(state.projectComparison,groups)).finished;
    const secondRatedBeforeMap=g1CompanySearchRated(state.projectComparison,secondKey);
    mapQuery.click();
    const mapNavigationReadOnly=beforeMapNavigation===JSON.stringify(state)&&g1CompanyComparisonSuggestedPhrase(state.projectComparison,groups).key===arbitrary.key&&
      section.querySelector('[data-company-keyword-map-toggle]')?.getAttribute('aria-expanded')==='true';
    section.querySelector('[data-company-competitor-disclosure="'+competitor.id+'"]').click();
    section.querySelector('[data-company-search-finish]').click();
    const arbitraryRating=section.querySelector('[data-company-search-guide] [data-g1bp-relevance-v549]');
    arbitraryRating.value='low';arbitraryRating.dispatchEvent(new Event('change',{bubbles:true}));
    const emptyPhrase=groups.phrases.find(row=>!state.projectComparison.competitors.some(item=>item.foundPhraseKeysV539?.includes(row.key))&&row.key!==arbitrary.key);
    const emptyDetails=section.querySelector('.g1-company-filter-unmatched');
    emptyDetails.open=true;
    emptyDetails.querySelector('[data-company-search-show-key="'+CSS.escape(emptyPhrase.key)+'"]').click();
    const noResultsBeforeFinish=g1CompanySearchSession(state.projectComparison,emptyPhrase).foundIds.size===0;
    section.querySelector('[data-company-search-finish]').click();
    const noResultsCompleted=state.projectComparison.searchFinishedPhraseKeysV601.includes(emptyPhrase.key)&&
      !state.projectComparison.selectedKeywordKeysByJtbdV550.company.includes(emptyPhrase.key)&&
      !!section.querySelector('[data-company-search-guide] [data-g1bp-relevance-v549]');
    const emptyQueryCount=matchCounts().includes('Найдено по запросу: 0')&&matchCounts().includes('Сосед по выдаче 0');
    const emptyRating=section.querySelector('[data-company-search-guide] [data-g1bp-relevance-v549]');
    emptyRating.value='low';emptyRating.dispatchEvent(new Event('change',{bubbles:true}));
    const noResultsCanAdvance=!section.querySelector('[data-company-search-next]').disabled;
    const productSample={bergenV543:{similarity:'yes'},classificationV539:{sameMarket:'no',sameBusiness:'no'},foundPhraseKeysV539:['product-key']};
    const productGroup=[{id:'product',phrases:[{key:'product-key'}]}];
    const productClassificationUntouched=g1BergenTypeV543(productSample,productGroup)==='direct'&&g1BergenAnalyzedCompetitorV543(productSample,productGroup);
    const productKeywordFilterUntouched=g1BergenCompetitorKeywordsV550({selectedKeywordKeysByJtbdV550:{product:[]}},productSample,productGroup[0]).includes('Нажмите фразу');
    const guideStatus=nowGuideWithReadPass(()=>nowGuideBuildAllBlocks().find(item=>item.id==='project-comparison')?.status);
    const statusAligned=guideStatus===projectComparisonStatus().status&&section.querySelector('.project-comparison-heading .status-pill').textContent===STATUS_LABELS[guideStatus];
    const productsSame=productsBefore===JSON.stringify(state.projectComparison?.productsById);
    section.scrollIntoView({block:'start',behavior:'instant'});
    return {pure,noPriceInput,disclosuresDefaultOpen,disclosuresCollapsed,disclosuresStayCollapsed,disclosuresStayCollapsedAcrossRender,disclosuresReopened,disclosuresReadOnly,firstKey,highestUnrated:highestUnrated?.key,actionOrder,ratingHiddenBeforeFinish,tableRatingLockedBeforeFinish,nextBlockedBeforeFinish,nextBlocked,secondKey,ratingStored,ratingVisibleAfterFinish,closeCountAfterFinish,farCountAfterClassify,neighborCountAfterClassify,nextQueryCount,emptyQueryCount,tableRatingUnlockedAfterFinish,nextBlockedUntilRating,nextEnabledAfterRating,tableRating,chosen,topPressed,stayedOnFirst,sameDomainNotice,sameDomainDisabled,sameDomainNoDuplicate,formOpens,formOrder,formStartsAtDomain,added,foundDraftBeforeFinish,foundStoredBeforeFinish,foundShownBeforeFinish,foundRestoredBeforeFinish,draftUncheckStored,draftSynced,foundStored,finishKeptLinks,completionStored,completionRestored,titleStored,typeClose,titleVisible,typeFar,farInAnalysis,farEditable,typeNeighbor,neighborExcluded,neighborDisabled,duplicateNotice,duplicateAction,newActionRestored,duplicateLinkedBeforeFinish,duplicateLinked,foundVisible,twoFoundInColumns,currentQueryUncheckSynced,currentQueryCheckSynced,columnUncheckSynced,detailCheckSynced,initiallyClear,arbitraryLinked,arbitraryShown,countVisible,mapLinked,secondSessionFinishedBeforeMap,secondRatedBeforeMap,mapNavigationReadOnly,noResultsBeforeFinish,noResultsCompleted,noResultsCanAdvance,productsSame,productClassificationUntouched,productKeywordFilterUntouched,statusAligned,status:projectComparisonStatus().status,guideText:section.querySelector('[data-company-search-guide]')?.innerText};
  })()`);
  assert(report.pure && report.noPriceInput && report.ratingHiddenBeforeFinish && report.tableRatingLockedBeforeFinish && report.nextBlockedBeforeFinish && report.nextBlocked);
  assert(report.disclosuresDefaultOpen && report.disclosuresCollapsed && report.disclosuresStayCollapsed &&
    report.disclosuresStayCollapsedAcrossRender &&
    report.disclosuresReopened && report.disclosuresReadOnly);
  assert.deepEqual(report.actionOrder,['+ Конкурент','Копировать','Завершить поиск по выбранному запросу','Следующий поисковый запрос']);
  assert.equal(report.firstKey, report.highestUnrated);
  assert.notEqual(report.firstKey, report.secondKey);
  assert(report.ratingStored && report.ratingVisibleAfterFinish && report.tableRatingUnlockedAfterFinish && report.nextBlockedUntilRating && report.nextEnabledAfterRating && report.tableRating === 'high' && report.chosen && report.topPressed === 'true' && report.stayedOnFirst);
  assert(report.formOpens && report.formStartsAtDomain && report.added && report.foundDraftBeforeFinish && report.foundStoredBeforeFinish && report.foundShownBeforeFinish && report.foundRestoredBeforeFinish && report.draftUncheckStored && report.draftSynced && report.foundStored && report.finishKeptLinks && report.completionStored && report.completionRestored && report.titleStored && report.typeClose && report.titleVisible);
  assert(report.sameDomainNotice && report.sameDomainDisabled && report.sameDomainNoDuplicate);
  assert.deepEqual(report.formOrder,['Домен','Заголовок в выдаче','Название']);
  assert(report.typeFar && report.farInAnalysis && report.farEditable && report.typeNeighbor && report.neighborExcluded && report.neighborDisabled);
  assert(report.closeCountAfterFinish && report.farCountAfterClassify && report.neighborCountAfterClassify && report.nextQueryCount && report.emptyQueryCount, JSON.stringify(report));
  report.eightCompetitors = await evaluate(`(()=>{
    const kind=(sameMarket,sameBusiness)=>({foundPhraseKeysV539:['sample-query'],classificationV539:{sameMarket,sameBusiness}});
    const competitors=[kind('yes','no'),...Array.from({length:7},()=>kind('no','no')),kind('yes','yes')];
    competitors.at(-1).foundPhraseKeysV539=['another-query'];
    return g1CompanySearchMatchCounts({competitors},{id:'company'},'sample-query');
  })()`);
  assert.deepEqual(report.eightCompetitors,{total:8,close:0,far:1,neighbor:7,unclassified:0});
  assert(report.duplicateNotice && report.duplicateAction && report.newActionRestored && report.duplicateLinkedBeforeFinish && report.duplicateLinked && report.foundVisible && report.twoFoundInColumns && report.currentQueryUncheckSynced && report.currentQueryCheckSynced && report.columnUncheckSynced && report.detailCheckSynced && report.initiallyClear && report.arbitraryLinked && report.arbitraryShown && report.countVisible && report.mapLinked && report.mapNavigationReadOnly && report.noResultsBeforeFinish && report.noResultsCompleted && report.noResultsCanAdvance && report.productsSame && report.productClassificationUntouched && report.productKeywordFilterUntouched && report.statusAligned);
  report.inlineEditor = await evaluate(`(async()=>{
    const section=document.querySelector('[data-g1bp-company]'), entry=state.projectComparison;
    const competitor=entry.competitors.at(-1), id=competitor.id;
    const disclosure=()=>section.querySelector('[data-company-competitor-disclosure="'+CSS.escape(id)+'"]');
    const panel=()=>section.querySelector('[data-company-competitor-panel="'+CSS.escape(id)+'"]');
    const beforeOpen=JSON.stringify(state);
    disclosure().click();
    const openReadOnly=beforeOpen===JSON.stringify(state);
    const originalPanel=panel();
    const editorOrder=[...panel().querySelectorAll('.g1-company-competitor-fields > label')].map(label=>label.firstChild.textContent.trim());
    const name=panel().querySelector('[data-g1bp-name-v543]');
    name.value='Конкурент из поиска';name.dispatchEvent(new Event('input',{bubbles:true}));
    const nameStored=competitor.name===name.value&&
      section.querySelector('[data-g1bp-head-v543="'+CSS.escape(id)+'"] strong')?.textContent===name.value&&
      section.querySelector('.g1bp-table-v543 [data-g1bp-name-v543="'+CSS.escape(id)+'"]')?.value===name.value;
    name.dispatchEvent(new Event('change',{bubbles:true}));
    const domain=panel().querySelector('[data-g1bp-domain-v543]');
    domain.value='https://updated-competitor.example/catalog';domain.dispatchEvent(new Event('change',{bubbles:true}));
    const domainStored=competitor.siteDomainV538==='updated-competitor.example'&&
      section.querySelector('.g1bp-table-v543 [data-g1bp-domain-v543="'+CSS.escape(id)+'"]')?.value===domain.value;
    const panelRetained=originalPanel===panel()&&name.isConnected&&domain.isConnected;
    const title=panel().querySelector('[data-g1bp-ad-part-v572="title"]');
    title.value='Новый заголовок конкурента';title.dispatchEvent(new Event('input',{bubbles:true}));
    const titleStored=g1BergenSearchAdV570(competitor.bergenV543.advertisements).title===title.value&&
      section.querySelector('.g1bp-table-v543 [data-g1bp-ad-part-v572="title"][data-g1bp-competitor-v543="'+CSS.escape(id)+'"]')?.value===title.value;
    const selected=panel().querySelector('[data-g1bp-found-keyword-v550][value="'+CSS.escape(competitor.foundPhraseKeysV539[0])+'"]');
    selected.checked=false;selected.dispatchEvent(new Event('change',{bubbles:true}));
    await Promise.resolve();
    const expanded=disclosure()?.getAttribute('aria-expanded')==='true'&&!panel().hidden;
    const queryUnlinked=!competitor.foundPhraseKeysV539.includes(selected.value);
    const beforeToggle=JSON.stringify(state);
    disclosure().click();const closed=panel().hidden&&disclosure().getAttribute('aria-expanded')==='false';
    disclosure().click();const reopened=!panel().hidden&&disclosure().getAttribute('aria-expanded')==='true';
    return {nameStored,domainStored,titleStored,queryUnlinked,expanded,openReadOnly,closed,reopened,panelRetained,editorOrder,toggleReadOnly:beforeToggle===JSON.stringify(state)};
  })()`);
  assert(report.inlineEditor.nameStored && report.inlineEditor.domainStored && report.inlineEditor.titleStored &&
    report.inlineEditor.queryUnlinked && report.inlineEditor.expanded, JSON.stringify(report.inlineEditor));
  assert.deepEqual(report.inlineEditor.editorOrder,['Домен','Заголовок в выдаче','Название']);
  report.domainDraft = await evaluate(`(()=>{
    const section=document.querySelector('[data-g1bp-company]');
    section.querySelector('[data-company-competitor-toggle]').click();
    const form=section.querySelector('[data-company-competitor-form]');
    const input=form.elements.domain;
    const before=JSON.stringify(state);
    input.value='123';input.dispatchEvent(new Event('input',{bubbles:true}));
    const numericRejected=projectComparisonProductDomainV538('123')===''&&
      projectComparisonProductDomainV538('http://123')===''&&
      projectComparisonProductDomainV538('example.ru')==='example.ru'&&
      !form.querySelector('[data-company-competitor-domain-note]').textContent.includes('уже отмечен')&&
      !form.querySelector('[data-company-competitor-submit]').disabled;
    form.requestSubmit();
    const numericNotSaved=before===JSON.stringify(state)&&
      form.querySelector('[data-company-competitor-error]').textContent.includes('корректный домен');
    input.value='cursor.example';input.dispatchEvent(new Event('input',{bubbles:true}));
    const errorClearedOnCorrection=!form.querySelector('[data-company-competitor-error]').textContent;
    input.focus();input.setSelectionRange(4,4);
    const beforeRefresh=JSON.stringify(state);
    g1CompanyComparisonSuggestionRefresh(section,state.projectComparison,g1CompanyComparisonGroups()[0]);
    const formPreserved=form===section.querySelector('[data-company-competitor-form]')&&
      document.activeElement===input&&input.selectionStart===4&&input.selectionEnd===4&&
      input.value==='cursor.example'&&beforeRefresh===JSON.stringify(state);
    form.querySelector('[data-company-competitor-cancel]').click();
    return {numericRejected,numericNotSaved,errorClearedOnCorrection,formPreserved};
  })()`);
  assert.deepEqual(report.domainDraft,{numericRejected:true,numericNotSaved:true,
    errorClearedOnCorrection:true,formPreserved:true});
  await evaluate(`document.querySelector('[data-g1bp-company] [data-company-competitor-panel]:not([hidden])').scrollIntoView({block:'center',behavior:'instant'})`);
  const detailsImage = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${output}/company-competitor-details.png`, Buffer.from(detailsImage.data, 'base64'));
  const removalPoint = await evaluate(`(()=>{
    const section=document.querySelector('[data-g1bp-company]');
    const id=state.projectComparison.competitors.at(-1).id;
    section.querySelector('[data-company-competitor-toggle]').click();
    const form=section.querySelector('[data-company-competitor-form]');
    form.elements.domain.value='updated-competitor.example';
    form.elements.domain.dispatchEvent(new Event('input',{bubbles:true}));
    window.__domainNoticeBeforeDelete=form.querySelector('[data-company-competitor-domain-note]').textContent.includes('уже в сравнении');
    _guruTabDirty=false;
    const button=section.querySelector('.g1-company-match [data-g1bp-delete-v543="'+CSS.escape(id)+'"]');
    button.scrollIntoView({block:'center',behavior:'instant'});
    const rect=button.getBoundingClientRect();
    return {x:rect.left+rect.width/2,y:rect.top+rect.height/2,id};
  })()`);
  await page.call('Input.dispatchMouseEvent',{type:'mousePressed',x:removalPoint.x,y:removalPoint.y,button:'left',clickCount:1});
  await page.call('Input.dispatchMouseEvent',{type:'mouseReleased',x:removalPoint.x,y:removalPoint.y,button:'left',clickCount:1});
  report.synchronizedRemoval = await evaluate(`(async()=>{
    const section=document.querySelector('[data-g1bp-company]');
    const entry=state.projectComparison;
    const productsBefore=JSON.stringify(entry.productsById);
    const firstId=entry.competitors[0]?.id;
    const addedId=${JSON.stringify(removalPoint.id)};
    const lists=()=>[...section.querySelectorAll('.g1-company-match [data-g1bp-delete-v543]')].map(node=>node.dataset.g1bpDeleteV543);
    const columns=()=>[...section.querySelectorAll('[data-g1bp-head-v543]')].map(node=>node.dataset.g1bpHeadV543);
    const aligned=()=>JSON.stringify(lists())===JSON.stringify(columns())&&JSON.stringify(columns())===JSON.stringify(entry.competitors.map(row=>row.id));
    const titleAligned=()=>entry.competitors.every((row,index)=>{
      const title=g1BergenCompetitorTitleV580(row,index,[{company:true}]);
      return section.querySelector('[data-company-competitor-name="'+CSS.escape(row.id)+'"]')?.textContent===title&&
        section.querySelector('[data-g1bp-head-v543="'+CSS.escape(row.id)+'"] .g1bp-head-actions-v543 strong')?.textContent===title;
    });
    const before=entry.competitors.length===1&&entry.archivedCompetitorsV540.some(row=>row.id===addedId);
    const deletionMarkedDirty=_guruTabDirty;
    const form=section.querySelector('[data-company-competitor-form]');
    const staleNoticeCleared=window.__domainNoticeBeforeDelete&&!form.hidden&&
      form.elements.domain.value==='updated-competitor.example'&&
      !form.querySelector('[data-company-competitor-domain-note]').textContent.includes('уже')&&
      !form.querySelector('[data-company-competitor-submit]').disabled;
    const confirm=window.confirm;window.confirm=()=>true;
    try {
      const fromList=aligned()&&!entry.competitors.some(row=>row.id===addedId)&&
        entry.archivedCompetitorsV540.some(row=>row.id===addedId);
      section.querySelector('[data-g1bp-head-v543="'+CSS.escape(firstId)+'"] [data-g1bp-delete-v543]').click();
      await Promise.resolve();
      const fromColumn=aligned()&&titleAligned()&&!entry.competitors.some(row=>row.id===firstId)&&
        entry.archivedCompetitorsV540.some(row=>row.id===firstId);
      return {before,deletionMarkedDirty,fromList,fromColumn,staleNoticeCleared,productsSame:productsBefore===JSON.stringify(entry.productsById),remaining:entry.competitors.length};
    } finally {window.confirm=confirm;}
  })()`);
  report.synchronizedRemoval.dialogOpened = page.dialogs.some(dialog => dialog.message.includes('Сохранённые данные') || dialog.message.includes('архиве'));
  assert(report.synchronizedRemoval.before && report.synchronizedRemoval.deletionMarkedDirty && report.synchronizedRemoval.fromList &&
    report.synchronizedRemoval.fromColumn && report.synchronizedRemoval.staleNoticeCleared &&
    report.synchronizedRemoval.productsSame && report.synchronizedRemoval.dialogOpened);
  report.persistedRemoval = await evaluate(`(async()=>{
    guruPersistStateFast({quiet:true});
    const stored=JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX+activeProjectId));
    const reopened=guruExportWithoutPersistenceV223(()=>migrateWorkspace(structuredClone(stored),activeProjectId));
    const id=${JSON.stringify(removalPoint.id)};
    return {
      savedWithoutActive:!stored.projectComparison.competitors.some(row=>row.id===id),
      archived:stored.projectComparison.archivedCompetitorsV540.some(row=>row.id===id),
      reopenedWithoutActive:!reopened.projectComparison.competitors.some(row=>row.id===id),
    };
  })()`);
  assert.deepEqual(report.persistedRemoval,{savedWithoutActive:true,archived:true,reopenedWithoutActive:true});
  assert.deepEqual(page.errors, []);
  assert.equal(hash(readFileSync(fixture)), hash(before));
  report.build = await evaluate('GURU_BUILD_INFO.version');
  report.fixtureHash = hash(before); report.passed = true;
  await page.call('Page.bringToFront');
  const image = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${output}/company-search-guide.png`, Buffer.from(image.data, 'base64'));
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  page.close(); browser.close();
}
