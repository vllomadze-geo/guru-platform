import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import XLSX from 'xlsx';

const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:3000/';
const port = process.env.GURU_CHROME_DEBUG_PORT || '9548';
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      const task = this.pending.get(message.id);
      if (!task) return;
      this.pending.delete(message.id);
      clearTimeout(task.timer);
      message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 60000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const browserInfo = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = new Cdp(browserInfo.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const page = new Cdp(tabs.find((tab) => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async (expression) => {
  const response = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
};
const waitFor = async (expression) => {
  for (let i = 0; i < 200; i++) {
    if (await evaluate(expression)) return;
    await pause(100);
  }
  throw new Error(`Timeout: ${expression}`);
};
const decideImport = async (mode = 'add') => {
  await waitFor('!!document.querySelector("[data-gate0-keyword-import-dialog]")');
  await evaluate(`document.querySelector('[data-gate0-keyword-import-mode="${mode}"]').click()`);
  await waitFor('!document.querySelector("[data-gate0-keyword-import-dialog]")');
};

try {
  await page.call('Runtime.enable');
  await page.call('Page.enable');
  await page.call('Emulation.setDeviceMetricsOverride', {width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await page.call('Page.navigate', { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof guruPageSemanticsHtmlV1 === "function"');
  await evaluate(`(() => {
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    scheduleCloudSync=()=>{}; scheduleProjectsCloudSync=()=>{};
    const meta={id:'page-semantics-smoke',name:'Page semantics smoke',lifecycleStatus:'active'};
    projects=[meta]; localStorage.setItem(PROJECTS_STORAGE_KEY,JSON.stringify(projects));
    activeProjectId=meta.id; state=createFreshWorkspace(meta);
    els.launcher.hidden=true; els.appShell.hidden=false; activeView='gate'; activeGateId='gate-1';
    return true;
  })()`);
  const cards = [];
  for (const id of ['card-21', 'card-22-hub', 'card-22', 'card-24']) {
    assert(await evaluate(`openAuditPageCard(${JSON.stringify(id)})`), `Missing page card ${id}`);
    await waitFor(`!!document.querySelector('[data-card="${id}"] [data-v22-site-section="page_semantics_v1"]')`);
    const result = await evaluate(`(() => {
      const card=findCard(${JSON.stringify(id)});
      const page=document.querySelector('[data-card="${id}"] .page-structure-card');
      const semantic=page.querySelector('[data-v22-site-section="page_semantics_v1"]');
      const heading=page.querySelector('[data-v22-site-section="page_heading_description_v513"]');
      const seo=page.querySelector('[data-v22-site-section="seo_snippet"]');
      const row=card.pageRows[Number(semantic.dataset.pageSemanticsIndexV1)];
      const placed=semantic.nextElementSibling===(heading||seo) && (!heading||heading.nextElementSibling===seo);
      const seoRestored=!!seo.querySelector('[data-page-context-key="seoKeywords"]');
      const previous=document.createElement('template');
      previous.innerHTML=guruPageSemanticsPreviousCardHtmlV1(card,row,Number(semantic.dataset.pageSemanticsIndexV1),false);
      const originalSeo=previous.content.querySelector('[data-v22-site-section="seo_snippet"]');
      const seoUnchanged=[...originalSeo.querySelectorAll('[data-page-context-key]')]
        .every(field=>!!seo.querySelector('[data-page-context-key="'+field.dataset.pageContextKey+'"]'));
      const statusControlsRemoved=seo.querySelectorAll('[data-g1-flag-select], [data-page-context-key$="__flagNote"]').length===0;
      const hintsPreserved=seo.textContent.includes('20–90 знаков') && seo.textContent.includes('70–155 знаков');
      const flagged=structuredClone(row);
      flagged.title='Текст SEO-заголовка'; flagged.description='Текст SEO-описания';
      flagged.contextFields={...flagged.contextFields,seoKeywords:'поисковый запрос',
        seo_snippet__mode:'not_needed',row_title__flag:'broken',row_title__flagNote:'старый текст',
        row_description__flag:'missing',seoKeywords__flag:'not_needed'};
      const flaggedSeo=document.createElement('template');
      flaggedSeo.innerHTML=v22SeoSnippetSection(card,flagged,0,false);
      const legacyDataPreserved=flagged.contextFields.row_title__flagNote==='старый текст' &&
        flaggedSeo.content.querySelectorAll('[data-g1-flag-select], [data-page-context-key$="__flagNote"]').length===0 &&
        flaggedSeo.content.querySelector('[data-gate1-page-field="title"]')?.value===flagged.title;
      const canonical=structuredClone(flagged);
      canonical.contextFields={...canonical.contextFields,seoKeywords:'старый запрос',
        pageSemanticKeywordsTextV1:'старый запрос',pageSemanticKeywordsV1:['актуальный запрос']};
      const canonicalBefore=JSON.stringify(canonical);
      const canonicalSeo=document.createElement('template');
      canonicalSeo.innerHTML=v22SeoSnippetSection(card,canonical,0,false);
      const canonicalText=canonicalSeo.content.querySelector('[data-page-context-key="seoKeywords"]')?.value;
      const canonicalProjection=canonicalText==='актуальный запрос' &&
        v22GetFieldValue(canonical,ctxField('seoKeywords','Ключевые слова',''))==='актуальный запрос' &&
        canonical.title===flagged.title && canonical.description===flagged.description &&
        JSON.stringify(canonical)===canonicalBefore;
      const seoDefinition={key:'seo_snippet',fields:[rowField('title','Title',''),
        rowField('description','Description',''),ctxField('seoKeywords','Ключевые слова','')]};
      const readyWithoutStatuses=v22SectionStatus(flagged,seoDefinition)==='ready';
      flagged.title='';
      const missingTextNotReady=v22SectionStatus(flagged,seoDefinition)==='in_progress';
      const tildaFree=!semantic.querySelector('[data-guru-tilda-edit-v528]');
      row.h1='Подарки ручной работы для дома';
      row.contextFields=row.contextFields||{};
      row.contextFields.seoKeywords='подарки ручной работы';
      guruPageSemanticsPaintV1(semantic,row);
      semantic.open=true;
      semantic.querySelector('[data-page-semantic-analyze-v1]').click();
      const generated=guruPageSemanticsValuesV1(row);
      semantic.querySelector('[data-page-semantic-add-v1]').click();
      const blank=[...semantic.querySelectorAll('[data-page-semantic-input-v1]')].at(-1);
      blank.value='авторские подарки'; blank.dispatchEvent(new Event('input',{bubbles:true}));
      blank.dispatchEvent(new Event('change',{bubbles:true}));
      const seoInput=seo.querySelector('[data-page-context-key="seoKeywords"]');
      const added=guruPageSemanticsValuesV1(row).includes('авторские подарки') &&
        seoInput?.value.includes('авторские подарки');
      const remove=[...semantic.querySelectorAll('[data-page-semantic-input-v1]')].find(x=>x.value==='авторские подарки')?.closest('.guru-page-semantic-row-v1')?.querySelector('[data-page-semantic-remove-v1]');
      remove?.click();
      const removed=!guruPageSemanticsValuesV1(row).includes('авторские подарки') &&
        !seoInput?.value.includes('авторские подарки');
      const csv=guruGate1FinalMetricsCsvV279(guruPageSemanticsValuesV1(row).map(value=>({demandRow:{kw:value}})));
      const parsed=guruV248ParseKeywordCsv(csv);
      return {id:${JSON.stringify(id)},placed,seoRestored,seoUnchanged,statusControlsRemoved,hintsPreserved,legacyDataPreserved,canonicalProjection,readyWithoutStatuses,missingTextNotReady,tildaFree,generated:generated.length,unique:new Set(generated.map(guruV247KeywordNormalize)).size===generated.length,added,removed,csv:parsed.entries.length===generated.length};
    })()`);
    assert(result.placed && result.seoRestored && result.seoUnchanged && result.statusControlsRemoved &&
      result.hintsPreserved && result.legacyDataPreserved && result.canonicalProjection && result.readyWithoutStatuses &&
      result.missingTextNotReady && result.tildaFree && result.generated > 1 && result.unique &&
      result.added && result.removed && result.csv, JSON.stringify(result));
    cards.push(result);
    if (id === 'card-22' && process.env.GURU_PAGE_SEMANTICS_SHOT === '1') {
      await evaluate(`(() => { const block=document.querySelector('[data-card="card-22"] [data-v22-site-section="page_semantics_v1"]'); block.open=true; block.scrollIntoView({block:'center'}); return true; })()`);
      await pause(200);
      const shot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      writeFileSync('/private/tmp/guru-page-semantics.png', Buffer.from(shot.data, 'base64'));
    }
  }
  const serviceTemplate = await evaluate(`(() => {
    const card=findCard('card-23');
    const row=card?.pageRows?.[0] || createPageStructureRow('Услуга');
    const fragment=document.createElement('template');
    fragment.innerHTML=pageStructureCardHtml(card,row,0,false);
    const semantic=fragment.content.querySelector('[data-v22-site-section="page_semantics_v1"]');
    const heading=fragment.content.querySelector('[data-v22-site-section="page_heading_description_v513"]');
    const seo=fragment.content.querySelector('[data-v22-site-section="seo_snippet"]');
    return {present:!!semantic,placed:semantic?.nextElementSibling===(heading||seo) && (!heading||heading.nextElementSibling===seo),
      statusControlsRemoved:seo?.querySelectorAll('[data-g1-flag-select]').length===0};
  })()`);
  assert(serviceTemplate.present && serviceTemplate.placed && serviceTemplate.statusControlsRemoved);
  assert(await evaluate('openAuditPageCard("card-22")'));
  await waitFor(`!!document.querySelector('[data-card="card-22"] [data-page-semantic-file-v1]')`);
  await evaluate(`(() => {
    const file=new File(['phrase,source,status\\nуникальный поисковый запрос,imported,draft\\nПодарки ручной работы,imported,draft'], 'queries.csv', {type:'text/csv'});
    const transfer=new DataTransfer(); transfer.items.add(file);
    const input=document.querySelector('[data-card="card-22"] [data-page-semantic-file-v1]');
    input.files=transfer.files; input.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  })()`);
  await waitFor('!!document.querySelector("[data-gate0-keyword-import-dialog]")');
  assert(!(await evaluate('guruPageSemanticsValuesV1(findCard("card-22").pageRows[0]).includes("уникальный поисковый запрос")')),
    'Import changed page semantics before a user decision');
  await decideImport();
  await waitFor('guruPageSemanticsValuesV1(findCard("card-22").pageRows[0]).includes("уникальный поисковый запрос")');
  const imported = await evaluate(`(() => {
    const values=guruPageSemanticsValuesV1(findCard('card-22').pageRows[0]);
    return {added:values.includes('уникальный поисковый запрос'),
      deduplicated:values.filter(value=>guruV247KeywordNormalize(value)==='подарки ручной работы').length===1};
  })()`);
  assert(imported.added && imported.deduplicated);
  const beforeRepeat = await evaluate('guruPageSemanticsValuesV1(findCard("card-22").pageRows[0]).length');
  await evaluate(`(() => {
    const file=new File(['phrase,source,status\\nуникальный поисковый запрос,imported,draft'], 'queries.csv', {type:'text/csv'});
    const transfer=new DataTransfer(); transfer.items.add(file);
    const input=document.querySelector('[data-card="card-22"] [data-page-semantic-file-v1]');
    input.files=transfer.files; input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await decideImport();
  assert.equal(await evaluate('guruPageSemanticsValuesV1(findCard("card-22").pageRows[0]).length'), beforeRepeat,
    'Repeated import duplicated an existing phrase');
  await evaluate(`(() => {
    const file=new File(['phrase,source,status\\nотменённый запрос,imported,draft'], 'cancel.csv', {type:'text/csv'});
    const transfer=new DataTransfer(); transfer.items.add(file);
    const input=document.querySelector('[data-card="card-22"] [data-page-semantic-file-v1]');
    input.files=transfer.files; input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await waitFor('!!document.querySelector("[data-gate0-keyword-import-dialog]")');
  await evaluate('document.querySelector("[data-gate0-keyword-import-cancel]").click()');
  assert(!(await evaluate('guruPageSemanticsValuesV1(findCard("card-22").pageRows[0]).includes("отменённый запрос")')),
    'Cancel applied imported data');
  await evaluate(`(() => {
    const section=document.querySelector('[data-card="card-22"] [data-v22-site-section="page_semantics_v1"]');
    const csv=guruGate1FinalMetricsCsvV279([
      {demandRow:{kw:'метрическая фраза',vol:'120',queryCount:'25',forecastClicks:'8',clickPrice:'12',bid:'16',forecastBudget:'96',trafficVolume:'40'}},
      {demandRow:{kw:'фраза без метрик'}},
    ],{includeTrafficVolume:true});
    const file=new File([csv], 'metrics.csv', {type:'text/csv'});
    const transfer=new DataTransfer(); transfer.items.add(file);
    const input=section.querySelector('[data-page-semantic-file-v1]');
    input.files=transfer.files; input.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  })()`);
  await decideImport();
  await waitFor('guruPageSemanticsValuesV1(findCard("card-22").pageRows[0]).includes("метрическая фраза")');
  const metricCsv = await evaluate(`(() => {
    const row=findCard('card-22').pageRows[0];
    const metrics=guruPageSemanticsMetricsV1(row)['метрическая фраза'];
    const section=document.querySelector('[data-card="card-22"] [data-v22-site-section="page_semantics_v1"]');
    return {metrics,emptyIncluded:guruPageSemanticsValuesV1(row).includes('фраза без метрик'),
      shown:section.textContent.includes('Показы: 120'),
      source:row.contextFields.pageSemanticImportRowsV1?.['метрическая фраза']};
  })()`);
  assert(metricCsv.metrics?.vol === '120' && metricCsv.metrics?.queryCount === '25' &&
    metricCsv.metrics?.forecastClicks === '8' && metricCsv.metrics?.forecastBudget === '96' &&
    metricCsv.metrics?.trafficVolume === '40' &&
    metricCsv.emptyIncluded && metricCsv.shown &&
    metricCsv.source?.headers?.[0] === 'Ключевое слово' &&
    metricCsv.source?.cells?.[0] === 'метрическая фраза', JSON.stringify(metricCsv));
  await evaluate(`(() => {
    const csv='Ключевое слово,Объём показов/мес,Источник\\n"подарок, ручной работы",7,Яндекс';
    const file=new File([csv], 'quoted.csv', {type:'text/csv'});
    const transfer=new DataTransfer();transfer.items.add(file);
    const input=document.querySelector('[data-card="card-22"] [data-page-semantic-file-v1]');
    input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await decideImport();
  const quoted = await evaluate(`(() => {
    const row=findCard('card-22').pageRows[0];
    const key=guruV247KeywordNormalize('подарок, ручной работы');
    return {phrase:guruPageSemanticsValuesV1(row).includes('подарок, ручной работы'),
      metric:guruPageSemanticsMetricsV1(row)[key]?.vol,
      source:row.contextFields.pageSemanticImportRowsV1?.[key]};
  })()`);
  assert(quoted.phrase && quoted.metric === '7' && quoted.source?.cells?.[2] === 'Яндекс',
    JSON.stringify(quoted));
  const serviceRows = await evaluate(`(async () => {
    const file=new File(['Отчёт Яндекс Директ\\nКлючевое слово,Объём показов/мес\\nтестовая фраза,50\\nИтого,50\\nСлужебный подвал'], 'report.csv');
    const imported=await guruPageSemanticsImportFileV1(file);
    return imported.keywords.entries.map(guruV247KeywordText);
  })()`);
  assert.deepEqual(serviceRows, ['тестовая фраза']);
  await evaluate(`new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src='/node_modules/xlsx/dist/xlsx.full.min.js';
    script.onload=resolve;script.onerror=reject;document.head.appendChild(script);
  })`);
  for (const [extension, phrase, metric] of [['xlsx','из xlsx',220], ['xls','из xls',330]]) {
    const workbook=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet([
      ['Ключевое слово','Объём показов/мес'],[phrase,metric],
    ]),'Семантика');
    const base64=XLSX.write(workbook,{bookType:extension==='xls'?'biff8':'xlsx',type:'base64'});
    await evaluate(`(() => {
      const bytes=Uint8Array.from(atob(${JSON.stringify(base64)}),character=>character.charCodeAt(0));
      const file=new File([bytes],${JSON.stringify(`metrics.${extension}`)});
      const transfer=new DataTransfer();transfer.items.add(file);
      const input=document.querySelector('[data-card="card-22"] [data-page-semantic-file-v1]');
      input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
      return true;
    })()`);
    await decideImport();
    await waitFor(`guruPageSemanticsMetricsV1(findCard('card-22').pageRows[0])[${JSON.stringify(phrase)}]?.vol === ${JSON.stringify(String(metric))}`);
  }
  const multiSheet = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(multiSheet, XLSX.utils.aoa_to_sheet([
    ['Отчёт поиска'], ['Ключевое слово', 'Объём показов/мес', 'Исходная колонка'],
    ['лист один', 44, 'сохранить'], ['Итого', 44, ''], ['Подвал'],
  ]), 'Первый');
  XLSX.utils.book_append_sheet(multiSheet, XLSX.utils.aoa_to_sheet([
    ['phrase', 'source', 'status'], ['лист два', 'manual', 'confirmed'],
  ]), 'Второй');
  const multiBase64 = XLSX.write(multiSheet, { bookType: 'xlsx', type: 'base64' });
  const sharedImport = await evaluate(`(async () => {
    const bytes=Uint8Array.from(atob(${JSON.stringify(multiBase64)}),character=>character.charCodeAt(0));
    const parsed=await guruV248ReadKeywordFile(new File([bytes],'several.xlsx'));
    const record={keywords:[]};
    guruKeywordFoundationApplyImportV257(record,parsed,'add','several.xlsx');
    guruKeywordFoundationApplyImportV257(record,parsed,'add','several.xlsx');
    return {fileType:parsed.fileType,phrases:record.keywords.map(guruV247KeywordText),
      metric:record.keywords[0]?.importedMetricsV1?.vol,
      source:record.keywords[0]?.importColumnsV1,
      status:record.keywords[1]?.status,
      importType:record.last_import.file_type};
  })()`);
  assert.deepEqual(sharedImport.phrases, ['лист один', 'лист два']);
  assert(sharedImport.fileType === 'xlsx' && sharedImport.metric === '44' &&
    sharedImport.source?.sheet === 'Первый' &&
    sharedImport.source?.cells?.[2] === 'сохранить' &&
    sharedImport.status === 'confirmed' && sharedImport.importType === 'xlsx',
    JSON.stringify(sharedImport));
  const actions = await evaluate(`(async () => {
    let exported=null,copied=null;
    downloadText=(filename,content)=>{exported={filename,content};};
    g4sbV141CopyText=async (value)=>{copied=value;};
    const section=document.querySelector('[data-card="card-22"] [data-v22-site-section="page_semantics_v1"]');
    section.querySelector('[data-page-semantic-export-v1]').click();
    section.querySelector('[data-page-semantic-copy-v1]').click();
    await Promise.resolve();
    const row=findCard('card-22').pageRows[0];
    const parsed=guruGate1FinalParseMetricsCsvV259(exported.content);
    const seo=section.closest('.page-structure-card').querySelector('[data-page-context-key="seoKeywords"]');
    seo.value+=', фраза из SEO';seo.dispatchEvent(new Event('input',{bubbles:true}));
    const seoToList=[...section.querySelectorAll('[data-page-semantic-input-v1]')].some(x=>x.value==='фраза из SEO');
    const semantic=[...section.querySelectorAll('[data-page-semantic-input-v1]')].find(x=>x.value==='фраза из SEO');
    semantic.value='фраза из списка';semantic.dispatchEvent(new Event('input',{bubbles:true}));
    semantic.dispatchEvent(new Event('change',{bubbles:true}));
    return {file:exported.filename.endsWith('.csv'),metric:parsed.rows.find(x=>x.phrase==='метрическая фраза')?.volume,
      traffic:parsed.rows.find(x=>x.phrase==='метрическая фраза')?.trafficVolume,
      copied:copied===guruPageSemanticsValuesV1(row).filter(x=>x!=='фраза из списка').join('\\n'),
      seoToList,listToSeo:seo.value.includes('фраза из списка')};
  })()`);
  assert(actions.file && actions.metric === '120' && actions.traffic === '40' && actions.copied && actions.seoToList && actions.listToSeo, JSON.stringify(actions));
  await pause(600);
  const saved = await evaluate(`(async () => {
    const id='page-semantics-smoke';
    const serialized=guruWorkspaceIdbMode.has(id)
      ? (await guruWorkspaceIdbReadV1(id))?.serialized
      : localStorage.getItem(WORKSPACE_STORAGE_PREFIX+id);
    const workspace=JSON.parse(serialized||'null');
    const row=workspace?.gates?.find(gate=>gate.id==='gate-1')?.cards
      ?.find(card=>card.id==='card-22')?.pageRows?.[0];
    return String(row?.contextFields?.seoKeywords||'').includes('уникальный поисковый запрос') &&
      row?.contextFields?.pageSemanticMetricsV1?.['метрическая фраза']?.vol==='120' &&
      row?.contextFields?.pageSemanticMetricsV1?.['из xlsx']?.vol==='220' &&
      row?.contextFields?.pageSemanticMetricsV1?.['из xls']?.vol==='330';
  })()`);
  assert(saved, 'Page semantic phrases or imported metrics were not saved');
  await page.call('Page.reload', {ignoreCache:true});
  await waitFor('document.readyState === "complete" && performance.getEntriesByType("navigation")[0]?.type === "reload" && typeof openProject === "function"');
  await evaluate(`Promise.resolve(openProject('page-semantics-smoke')).then(() => { guruNavigateToGate('gate-1'); return true; })`);
  const reloaded = await evaluate(`(() => {
    const row=findCard('card-22').pageRows[0];
    return guruPageSemanticsValuesV1(row).includes('уникальный поисковый запрос') &&
      guruPageSemanticsMetricsV1(row)['метрическая фраза']?.vol==='120';
  })()`);
  assert(reloaded, 'Page semantics or imported metrics disappeared after reload');
  assert(await evaluate(`(() => {
    const row=findCard('card-22').pageRows[0];
    const key=guruV247KeywordNormalize('подарок, ручной работы');
    return guruPageSemanticsValuesV1(row).includes('подарок, ручной работы') &&
      row.contextFields.pageSemanticImportRowsV1?.[key]?.cells?.[2]==='Яндекс';
  })()`), 'Quoted keyword or source columns were lost after reload');
  assert(await evaluate('openAuditPageCard("card-22")'));
  await waitFor(`!!document.querySelector('[data-card="card-22"] [data-page-semantic-file-v1]')`);
  await evaluate(`(() => {
    const file=new File(['phrase,source,status\\nтолько замена,imported,draft'], 'replace.csv', {type:'text/csv'});
    const transfer=new DataTransfer();transfer.items.add(file);
    const input=document.querySelector('[data-card="card-22"] [data-page-semantic-file-v1]');
    input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await decideImport('replace');
  assert(await evaluate(`(() => {
    const row=findCard('card-22').pageRows[0];
    const key=guruV247KeywordNormalize('подарок, ручной работы');
    return guruPageSemanticsValuesV1(row).join('|')==='только замена' &&
      !guruPageSemanticsMetricsV1(row)['метрическая фраза'] &&
      !row.contextFields.pageSemanticImportRowsV1?.[key];
  })()`), 'Replace did not replace keywords, metrics, and source rows together');
  console.log(JSON.stringify({passed:true,cards}));
} finally {
  await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  page.close(); browser.close();
}
