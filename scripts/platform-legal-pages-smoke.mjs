import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const port = process.env.GURU_CHROME_DEBUG_PORT || '9535';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:9531/';
const fixturePath = process.env.GURU_NOW_KORICH_FIXTURE || '/private/tmp/guru-now-korich-workspace.json';
const fixtureBytes = readFileSync(fixturePath);
const sourceHash = createHash('sha256').update(fixtureBytes).digest('hex');
const fixture = JSON.parse(fixtureBytes);
const output = process.env.GURU_LEGAL_ARTIFACTS || 'artifacts/legal-pages';
mkdirSync(output, { recursive: true });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map(); this.errors = [];
    this.ready = new Promise((resolve, reject) => { this.socket.addEventListener('open', resolve, { once: true }); this.socket.addEventListener('error', reject, { once: true }); });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') this.errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      const task = this.pending.get(message.id); if (!task) return;
      this.pending.delete(message.id); clearTimeout(task.timer);
      if (message.error) task.reject(new Error(message.error.message)); else task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id, timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
      this.pending.set(id, { resolve, reject, timer }); this.socket.send(JSON.stringify({ id, method, params }));
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
  while (Date.now() - start < 30000) { if (await evaluate(expression)) return; await delay(100); }
  throw new Error(`Timeout: ${expression}`);
};
const screenshot = async name => {
  const image = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${output}/${name}.png`, Buffer.from(image.data, 'base64'));
};

const report={sourceSha256:sourceHash};
const setup=async url=>{
 await page.call('Page.navigate',{url});await waitFor('document.readyState==="complete"&&typeof megaPlatformSeoUrlFromName==="function"');
 return await evaluate(`(()=>{    rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();scheduleCloudSync=()=>{};scheduleProjectsCloudSync=()=>{};
    state=${JSON.stringify(fixture.workspace || fixture)};activeProjectId=state.project.id;
    guruExportWithoutPersistenceV223(()=>{state=migrateWorkspace(state,activeProjectId)});
    projects=[{id:activeProjectId,name:state.project.name,lifecycleStatus:'active'}];updateProjectChrome();
    activeView='gate';activeGateId='gate-0';guruRenderedGateId='gate-0';els.launcher.hidden=true;els.appShell.hidden=false;
    window.__seoCard=state.gates.find(g=>g.id==='gate-0').cards.find(isMegaMarketingCard);
    ensureMegaMarketing(window.__seoCard,state);guruCancelDerivedRefresh();guruDiscardUiPreferenceSave(activeProjectId);
    window.__seoRender=()=>{els.contentArea.innerHTML='<div class="mega-marketing">'+megaPlatformSectionHtml(window.__seoCard.id,window.__seoCard.megaMarketing.platformV2)+'</div>'};
    window.__seoRender();
    renderGateNav({recalculate:false});
    nowGuideCurrent(nowGuideDisplayedPath);nowGuideReviewKey=nowGuideDisplayedPath.find(i=>i.gateId==='gate-0'&&i.id===window.__seoCard.id).key;nowGuideRender();
    window.__legalBase=JSON.stringify(state);
    const block=[...document.querySelectorAll('.mega-subsection')].find(n=>n.querySelector('.mega-subsection-title')?.textContent==='Юридически обязательные страницы');
    window.__legalBlock=block;block.scrollIntoView({block:'center',behavior:'instant'});
    return{heads:[...block.querySelectorAll('th')].map(n=>n.textContent),widths:[...block.querySelectorAll('th')].map(n=>Math.round(n.getBoundingClientRect().width)),names:[...block.querySelectorAll('.mega-platform-page-name')].map(n=>n.textContent),urls:[...block.querySelectorAll('input')].map(n=>n.value)};
})()`);
};
try{
 await page.call('Page.enable');await page.call('Runtime.enable');await page.call('Page.bringToFront');
 await page.call('Emulation.setDeviceMetricsOverride',{width:1920,height:1100,deviceScaleFactor:1,mobile:false});
 await page.call('Page.addScriptToEvaluateOnNewDocument',{source:`const nativeFetch=window.fetch.bind(window);window.fetch=(u,i)=>String(u).includes('/api/')?Promise.resolve(new Response(JSON.stringify({ok:true,projects:[],workspaces:[]}),{status:200,headers:{'Content-Type':'application/json'}})):nativeFetch(u,i);const memory=new Map();window.__seoStorage=memory;Storage.prototype.getItem=function(k){return memory.get(String(k))??null};Storage.prototype.setItem=function(k,v){memory.set(String(k),String(v))};Storage.prototype.removeItem=function(k){memory.delete(String(k))};Storage.prototype.clear=function(){memory.clear()};`});
 report.before=await setup(process.env.GURU_BEFORE_URL||appUrl);await delay(300);if(process.env.GURU_BEFORE_URL)await screenshot('01-before');
 report.after=await setup(appUrl);await delay(300);await screenshot('02-unanswered');
 assert.deepEqual(report.after.heads,report.before.heads);assert.deepEqual(report.after.widths,report.before.widths);assert.deepEqual(report.after.names,report.before.names);assert.deepEqual(report.after.urls,report.before.urls);
 report.passive=await evaluate(`(()=>{const p=__seoCard.megaMarketing.platformV2;window.__legalBase=JSON.stringify(state);megaPlatformLegalSummary(p);nowGuideGate0Missing(nowGuideCurrent(nowGuideDisplayedPath));megaPlatformRefreshLegal(__seoCard);return{identical:__legalBase===JSON.stringify(state),exportAfterRead:(window.__legalAfterRead=JSON.stringify(state),true),keys:MEGA_PLATFORM_LEGAL_QUESTIONS.filter(q=>Object.hasOwn(p,q.key)).map(q=>q.key),selected:__legalBlock.querySelectorAll('[aria-pressed="true"]').length,summary:__legalBlock.querySelector('.mega-platform-legal-summary').textContent,missing:nowGuideGate0Missing(nowGuideCurrent(nowGuideDisplayedPath)).items.filter(i=>i.group?.key==='legal-url')}})()`);
 assert(report.passive.identical);assert.deepEqual(report.passive.keys,[]);assert.equal(report.passive.selected,0);
 report.clarity=await evaluate(`(()=>{const rows=[...__legalBlock.querySelectorAll('.mega-platform-legal-question')];return{hints:rows.map(row=>row.querySelector('small')?.textContent),compact:rows.every(row=>{const label=row.querySelector('.mega-platform-legal-question-copy').getBoundingClientRect(),control=row.querySelector('[role="group"]').getBoundingClientRect();return control.left-label.right<=21}),unknown:[...__legalBlock.querySelectorAll('[data-mega-legal-status]')].slice(2).map(n=>n.textContent),described:rows.every(row=>{const group=row.querySelector('[role="group"]');return document.getElementById(group.getAttribute('aria-labelledby'))&&document.getElementById(group.getAttribute('aria-describedby'))})}})()`);
 assert(report.clarity.compact&&report.clarity.described);assert(report.clarity.hints.every(Boolean));assert(report.clarity.unknown.every(text=>text==='Зависит от ответа'));
 // Only the two answer fields may change synchronously. Autosave uses the existing pipeline.
 report.answerDiff=await evaluate(`(()=>{document.querySelector('[data-mega-legal-answer="collectsPersonalDataV1"][data-mega-legal-value="true"]').click();document.querySelector('[data-mega-legal-answer="siteCheckoutV1"][data-mega-legal-value="true"]').click();const copy=JSON.parse(JSON.stringify(state));const p=copy.gates.find(g=>g.id==='gate-0').cards.find(isMegaMarketingCard).megaMarketing.platformV2;delete p.collectsPersonalDataV1;delete p.siteCheckoutV1;return __legalBase===JSON.stringify(copy)})()`);
 assert(report.answerDiff,'Answers must not change pre-existing fields');await delay(100);await screenshot('03-both-yes');
 await waitFor(`(()=>{const saved=JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX+activeProjectId)||'null');return saved?.gates.find(g=>g.id==='gate-0').cards.find(isMegaMarketingCard)?.megaMarketing.platformV2.siteCheckoutV1===true})()`);
 report.saved=true;
 report.exportHashes=await evaluate(`(async()=>{const hash=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(v=>v.toString(16).padStart(2,'0')).join('');return{before:await hash(__legalBase),afterRead:await hash(__legalAfterRead)}})()`);
 // This assessment uses a private copy, with every other existing requirement filled.
 report.readinessCases=await evaluate(`(()=>{const w=structuredClone(state);const c=w.gates.find(g=>g.id==='gate-0').cards.find(isMegaMarketingCard);const p=c.megaMarketing.platformV2;const auto=megaPlatformAutoRows(w);[...auto.required,...auto.conversion].forEach(r=>megaPlatformSetUrl(r.urlGroup,r.urlId,'#filled',w));p.extra.filter(r=>!r.promotedV2&&!megaPlatformHiddenLegacyExtra(r)).forEach(r=>megaPlatformSetUrl('custom',r.id,'#filled',w));c.megaMarketing.infra.forEach(r=>r.status='works');c.megaMarketing.channels.forEach(r=>r.status='works');['company_details','privacy'].forEach(id=>megaPlatformSetUrl('fixed',id,'#filled',w));['data_consent','offer','returns'].forEach(id=>megaPlatformSetUrl('fixed',id,'',w));p.collectsPersonalDataV1=false;p.siteCheckoutV1=false;const no=megaMarketingStatus(c,w);p.collectsPersonalDataV1=true;p.siteCheckoutV1=true;const yes=megaMarketingStatus(c,w);delete p.collectsPersonalDataV1;delete p.siteCheckoutV1;const unanswered=megaMarketingStatus(c,w);return{no,yes,unanswered}})()`);
 assert.deepEqual(report.readinessCases,{no:'ready',yes:'in_progress',unanswered:'in_progress'});
 const inspect=()=>evaluate(`(()=>{const p=__seoCard.megaMarketing.platformV2;return{summary:__legalBlock.querySelector('.mega-platform-legal-summary').textContent,statuses:[...__legalBlock.querySelectorAll('[data-mega-legal-status]')].map(n=>n.textContent),dim:__legalBlock.querySelectorAll('.mega-platform-legal-unneeded').length,missing:nowGuideGate0Missing(nowGuideCurrent(nowGuideDisplayedPath)).items.filter(i=>i.group?.key==='legal-url'),guide:document.querySelector('#nowGuide').innerText,status:megaMarketingStatus(__seoCard),badge:nowGuideGate0Inspect(__seoCard).status,urls:[...__legalBlock.querySelectorAll('input')].map(n=>n.value),editors:[...__legalBlock.querySelectorAll('input')].every(n=>!n.disabled&&!n.readOnly)}})()`);
 report.yes=await inspect();assert.equal(report.yes.status,report.yes.badge);assert.equal(report.yes.dim,0);assert(report.yes.summary.startsWith('Нужно страниц: 5'));
 await evaluate(`document.querySelector('[data-mega-legal-answer="collectsPersonalDataV1"][data-mega-legal-value="false"]').click();document.querySelector('[data-mega-legal-answer="siteCheckoutV1"][data-mega-legal-value="false"]').click()`);
 await delay(150);report.no=await inspect();await evaluate(`__legalBlock.scrollIntoView({block:'center',behavior:'instant'})`);await screenshot('04-both-no');
 assert.equal(report.no.dim,3);assert(report.no.editors);assert(report.no.summary.startsWith('Нужно страниц: 2'));assert.deepEqual(report.no.urls,report.before.urls);assert.equal(report.no.status,report.no.badge);
 assert(report.no.missing.every(i=>i.group.total===2&&!['Публичная оферта','Условия возврата','Согласие на обработку данных'].includes(i.group.row)));
 await evaluate(`__legalBlock.querySelector('[data-mega-legal-help]').click()`);await screenshot('05-explanation');
 assert(await evaluate(`!document.getElementById(__legalBlock.querySelector('[data-mega-legal-help]').getAttribute('aria-controls')).hidden`));
 report.expandedWidths=await evaluate(`[...__legalBlock.querySelectorAll('th')].map(n=>Math.round(n.getBoundingClientRect().width))`);assert.deepEqual(report.expandedWidths,report.before.widths,'Explanation must preserve column widths');
 await evaluate(`__legalBlock.querySelector('[data-mega-legal-help]').click()`);
 assert(await evaluate(`document.getElementById(__legalBlock.querySelector('[data-mega-legal-help]').getAttribute('aria-controls')).hidden`));
 report.exclusiveHelp=await evaluate(`(()=>{const before=JSON.stringify(state),buttons=[...__legalBlock.querySelectorAll('[data-mega-legal-help]')];buttons[0].click();buttons[1].click();const result={expanded:buttons.filter(n=>n.getAttribute('aria-expanded')==='true').length,firstHidden:document.getElementById(buttons[0].getAttribute('aria-controls')).hidden,secondVisible:!document.getElementById(buttons[1].getAttribute('aria-controls')).hidden,unchanged:before===JSON.stringify(state)};buttons[1].click();return result})()`);
 assert.deepEqual(report.exclusiveHelp,{expanded:1,firstHidden:true,secondVisible:true,unchanged:true});
 await evaluate(`__legalBlock.querySelector('[data-mega-legal-help]').focus()`);
 await page.call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
 await page.call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
 report.keyboard=await evaluate(`__legalBlock.querySelector('[data-mega-legal-help]').getAttribute('aria-expanded')==='true'`);assert(report.keyboard);
 await evaluate(`__legalBlock.querySelector('[data-mega-legal-help]').click()`);
 // Mixed answers and anchor URLs remain valid. Tests operate on an isolated memory copy.
 report.anchor=await evaluate(`(()=>{const n=__legalBlock.querySelector('[data-mega-url-id="offer"]');n.value='#offer';n.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-mega-legal-answer="siteCheckoutV1"][data-mega-legal-value="true"]').click();return{stored:megaPlatformUrl('fixed','offer'),summary:__legalBlock.querySelector('.mega-platform-legal-summary').textContent,inputSame:n===__legalBlock.querySelector('[data-mega-url-id="offer"]'),dim:__legalBlock.querySelectorAll('.mega-platform-legal-unneeded').length}})()`);
 assert.equal(report.anchor.stored,'#offer');assert(report.anchor.inputSame);assert.equal(report.anchor.dim,1);
 assert.equal(createHash('sha256').update(readFileSync(fixturePath)).digest('hex'),sourceHash);
 assert.deepEqual(page.errors,[]);report.build=await evaluate('GURU_BUILD_INFO.version');
 report.exportHashes.sourceAfter=createHash('sha256').update(readFileSync(fixturePath)).digest('hex');
 assert.equal(report.exportHashes.before,report.exportHashes.afterRead);report.passed=true;
 writeFileSync(`${output}/results.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));console.log('platform-legal-pages-smoke: PASS');
}finally{await browser.call('Target.disposeBrowserContext',{browserContextId});page.close();browser.close();}
