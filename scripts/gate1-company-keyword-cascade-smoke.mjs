import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:9531/';
const source = JSON.parse(readFileSync('/private/tmp/guru-now-korich-workspace.json'));
const fixture = source.workspace || source.content || source;

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      const task = this.pending.get(message.id);
      if (!task) return;
      this.pending.delete(message.id);
      clearTimeout(task.timer);
      if (message.error) task.reject(new Error(message.error.message));
      else task.resolve(message.result);
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

try {
  await page.call('Runtime.enable');
  await page.call('Page.addScriptToEvaluateOnNewDocument', { source: `const mem=new Map();Storage.prototype.getItem=function(k){return mem.get(String(k))??null};Storage.prototype.setItem=function(k,v){mem.set(String(k),String(v))};Storage.prototype.removeItem=function(k){mem.delete(String(k))};const f=fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}))):f(u,i);` });
  await page.call('Page.navigate', { url: appUrl });
  const loaded = Date.now();
  while (!(await evaluate('document.readyState==="complete"&&typeof g1CompanyReconcileKeywordCompetitorsV624==="function"'))) {
    if (Date.now() - loaded > 30000) throw new Error('App did not load');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};true');
  await evaluate(`(()=>{guruCancelDerivedRefresh();activeProjectId=${JSON.stringify(fixture.project.id)};state=guruExportWithoutPersistenceV223(()=>migrateWorkspace(${JSON.stringify(fixture)},${JSON.stringify(fixture.project.id)}));projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];return true})()`);
  const report = await evaluate(`(()=>{
    const record=g1CompanyKeywordRecord(state), keys=gate1CompanyKeywordFoundationDemandSourceV351(state).lines.map(row=>row.key);
    const [deleted, retained]=keys;
    if(!deleted||!retained) throw Error('Fixture needs two confirmed company keywords');
    const entry=state.projectComparison;
    const originalProduct=JSON.stringify(entry.productsById);
    const sample=(id,domain,found)=>({id,name:id,domain,siteDomainV538:domain,foundPhraseKeysV539:found,stepsV539:{search:{note:'preserved'}},created_at:'2020-01-01T00:00:00.000Z'});
    const migrationInput=structuredClone(state);
    migrationInput.projectComparison.competitors.push(sample('migration-orphan','old.example',['deleted-company-keyword']));
    const migrated=guruExportWithoutPersistenceV223(()=>migrateWorkspace(migrationInput,activeProjectId));
    const migrationArchived=!migrated.projectComparison.competitors.some(row=>row.id==='migration-orphan')&&
      migrated.projectComparison.archivedCompetitorsV540.some(row=>row.id==='migration-orphan');
    const orphan=sample('orphan-123','123.ru',[]);
    const linked=sample('deleted-123','123.example',[deleted]);
    const shared=sample('shared-123','shared.example',[deleted,retained]);
    const draft=sample('blank-draft','',[]);
    entry.competitors.push(orphan,linked,shared,draft);
    const originalLinked=JSON.stringify(linked), originalOrphan=JSON.stringify(orphan);
    const first=g1CompanyReconcileKeywordCompetitorsV624(state);
    const orphanArchived=!entry.competitors.some(row=>row.id===orphan.id)&&entry.archivedCompetitorsV540.some(row=>row.id===orphan.id);
    const stable=JSON.stringify(entry);
    const second=g1CompanyReconcileKeywordCompetitorsV624(state);
    const idempotent=second.archived===0&&second.restored===0&&stable===JSON.stringify(entry);
    const trigger=document.createElement('button');
    trigger.dataset.companyDemandRemove='';trigger.dataset.companyDemandPhrase=deleted;
    document.body.append(trigger);trigger.click();trigger.remove();
    const deletedArchived=!entry.competitors.some(row=>row.id===linked.id)&&entry.archivedCompetitorsV540.some(row=>row.id===linked.id);
    const sharedRetained=entry.competitors.includes(shared)&&shared.foundPhraseKeysV539.includes(retained);
    const draftRetained=entry.competitors.includes(draft);
    const activeKeys=g1CompanyComparisonGroups(state)[0].phrases.map(row=>row.key);
    const filter=g1CompanyKeywordFilterData(g1CompanyComparisonEntry(),g1CompanyComparisonGroups(state)[0]);
    const absentEverywhere=!filter.competitors.some(row=>[orphan.id,linked.id].includes(row.id))&&
      !g1CompanyComparisonEntry().competitors.some(row=>[orphan.id,linked.id].includes(row.id));
    const projectFieldsPreserved=JSON.stringify(entry.productsById)===originalProduct;
    const archivedLinked=entry.archivedCompetitorsV540.find(row=>row.id===linked.id);
    const archivedOrphan=entry.archivedCompetitorsV540.find(row=>row.id===orphan.id);
    const archiveFieldsPreserved=JSON.stringify({...archivedLinked,companyKeywordArchiveReasonV624:undefined})===originalLinked&&
      JSON.stringify({...archivedOrphan,companyKeywordArchiveReasonV624:undefined})===originalOrphan;
    record.keywords.push({value:deleted,status:'confirmed',id:'restored-test-keyword'});
    guruCompanyKeywordFoundationSyncDemandV351(state,{refreshUi:false});
    const restored=entry.competitors.some(row=>row.id===linked.id)&&!entry.archivedCompetitorsV540.some(row=>row.id===linked.id);
    record.keywords=record.keywords.filter(row=>row.id!=='restored-test-keyword');
    guruCompanyKeywordFoundationScheduleDerivedV354({syncDemand:true,workspace:state,projectId:activeProjectId});
    const gate0Cascaded=!entry.competitors.some(row=>row.id===linked.id)&&
      entry.archivedCompetitorsV540.some(row=>row.id===linked.id);
    return {first,migrationArchived,orphanArchived,idempotent,deletedArchived,sharedRetained,draftRetained,absentEverywhere,projectFieldsPreserved,archiveFieldsPreserved,restored,gate0Cascaded,keywordRemoved:!activeKeys.includes(deleted)};
  })()`);
  for (const [key, value] of Object.entries(report)) if (key !== 'first') assert.equal(value, true, key);
  assert.ok(report.first.archived >= 1);
  console.log(JSON.stringify(report));
} finally {
  page.close();
  await browser.call('Target.disposeBrowserContext', { browserContextId });
  browser.close();
}
