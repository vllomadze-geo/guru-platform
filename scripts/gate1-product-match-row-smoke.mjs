import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const source = JSON.parse(readFileSync(process.env.GURU_GATE1_EXPORT || '/Users/vl/Downloads/gate-1.json', 'utf8'));
const fixture = JSON.parse(JSON.stringify({ content: {
  project: source.content.project, projectComparison: source.content.projectComparison,
  painV130: source.content.painV130, unitV130: source.content.unitV130,
  unitEconomicsRoute: source.content.unitEconomicsRoute,
}, structure: source.structure }, (_key, value) => typeof value === 'string' && value.startsWith('data:image/')
  ? '[image omitted for isolated test]' : value));
const productId = 'catalog-item-1786792591872-51f503';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:41323/';
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || '49337';
const outputDir = 'artifacts/product-comparison-row';
mkdirSync(outputDir, { recursive: true });

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url); this.id = 0; this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', event => {
      const message = JSON.parse(event.data), task = this.pending.get(message.id);
      if (!task) return;
      this.pending.delete(message.id); clearTimeout(task.timer);
      message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id, timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 60000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
const { browserContextId } = await browser.call('Target.createBrowserContext');
const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
const tabs = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
const evaluate = async expression => {
  const result = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
};
const capture = async (name, extraHeight = 0) => {
  const clip = await evaluate(`(async () => {
    const row=document.querySelector('.g1pc-guide .g1pc-match');
    row.scrollIntoView({block:'center',behavior:'instant'});
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const rect=row.getBoundingClientRect();
    const left=Math.max(0,rect.left-12),top=Math.max(0,rect.top-12);
    return {x:left+scrollX,y:top+scrollY,width:Math.min(innerWidth-left,rect.width+24),
      height:Math.min(innerHeight-top,rect.height+24+${extraHeight}),scale:1};
  })()`);
  console.log(`capture ${name}: ${JSON.stringify(clip)}`);
  const shot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, clip });
  writeFileSync(`${outputDir}/${name}.png`, Buffer.from(shot.data, 'base64'));
};

try {
  await page.call('Runtime.enable'); await page.call('Page.enable');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.navigate', { url: appUrl });
  for (let attempt = 0; attempt < 200; attempt++) {
    if (await evaluate('document.readyState === "complete" && typeof g1ProductComparisonGuideHtml === "function"')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await evaluate('rememberAccessUnlocked();setAccessState(true);bootstrapAppOnce();true');
  const initial = await evaluate(`(() => {
    state=createFreshWorkspace({id:'product-match-row',name:'Проверка строки конкурента'});
    const imported=${JSON.stringify(fixture)};
    for(const [key,value] of Object.entries(imported.content)) state[key]=structuredClone(value);
    state.gates[state.gates.findIndex(g=>g.id==='gate-1')]=structuredClone(imported.structure);
    state.project.id='product-match-row';activeProjectId=state.project.id;
    activeView='gate';activeGateId='gate-1';guruV194Ensure(state);
    els.launcher.hidden=true;els.appShell.hidden=false;document.body.classList.remove('access-locked');updateProjectChrome();
    const product=guruV194Product(${JSON.stringify(productId)},state);
    const entry=ensureProjectComparisonProduct(product.id);
    const jtbds=g1BergenMigrateV543(entry,product).jtbds;
    entry.open=true;
    const phrase=g1ProductComparisonCurrent({jtbds,entry,screen:g1ProductComparisonScreen(product.id)}).current;
    const competitor=entry.competitors[0]; competitor.foundPhraseKeysV539=[phrase.key];
    window.__rowTest={product,entry,competitor,phrase};
    flashSaving=()=>{};guruPersistStateFast=()=>true;saveState=()=>true;
    els.contentArea.innerHTML=projectComparisonProductHtml(product);
    const row=document.querySelector('.g1pc-guide .g1pc-match');
    const identity=row.querySelector('.g1pc-match-identity'),actions=row.querySelector('.g1pc-match-actions');
    const identityRect=identity.getBoundingClientRect(),actionsRect=actions.getBoundingClientRect();
    return {name:competitor.name,rows:document.querySelectorAll('.g1pc-guide .g1pc-match').length,
      subtitle:document.querySelector('.g1pc-match-identity small')?.textContent,
      nameStyle:[getComputedStyle(identity.querySelector('b')).fontSize,getComputedStyle(identity.querySelector('b')).fontWeight],
      subtitleSize:getComputedStyle(identity.querySelector('small')).fontSize,
      actionHeights:[...actions.querySelectorAll(':scope > button, .g1pc-menu-trigger')].map(node=>node.getBoundingClientRect().height),
      verticallyAligned:Math.abs(identityRect.top+identityRect.height/2-actionsRect.top-actionsRect.height/2)<2,
      oldState:!!document.querySelector('.g1pc-match-state, .g1pc-match-toggle'),
      plural:[0,1,2,4,5,11,14,21,22,25].map(g1ProductComparisonRequestCount)};
  })()`);
  assert(initial.rows > 0 && !initial.oldState && initial.subtitle.includes('Найден по 1 запрос'), JSON.stringify(initial));
  assert.deepEqual(initial.nameStyle,['15px','600']);
  assert(initial.subtitleSize==='13px' && initial.verticallyAligned && initial.actionHeights.every(height=>height===32),JSON.stringify(initial));
  assert.deepEqual(initial.plural, ['Найден по 0 запросов','Найден по 1 запрос','Найден по 2 запроса',
    'Найден по 4 запроса','Найден по 5 запросов','Найден по 11 запросов','Найден по 14 запросов',
    'Найден по 21 запрос','Найден по 22 запроса','Найден по 25 запросов']);
  await capture('desktop');

  const menu = await evaluate(`(() => {
    const row=document.querySelector('.g1pc-guide .g1pc-match'),trigger=row.querySelector('[data-g1pc-menu-toggle]');
    trigger.click();
    const popup=row.querySelector('[data-g1pc-menu]');
    const first=document.activeElement.textContent.trim();
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
    const second=document.activeElement.textContent.trim();
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true}));
    const back=document.activeElement.textContent.trim();
    return {open:!popup.hidden,first,second,back,expanded:trigger.getAttribute('aria-expanded')};
  })()`);
  assert(menu.open && menu.expanded === 'true' && menu.first === 'Убрать из найденных' && menu.second === 'Удалить…' && menu.back === menu.first, JSON.stringify(menu));
  await capture('menu', 100);
  const escape = await evaluate(`(() => {
    document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
    const row=document.querySelector('.g1pc-guide .g1pc-match');
    return {closed:row.querySelector('[data-g1pc-menu]').hidden,focus:document.activeElement===row.querySelector('[data-g1pc-menu-toggle]')};
  })()`);
  assert(escape.closed && escape.focus, JSON.stringify(escape));
  const outside = await evaluate(`(() => {
    const row=document.querySelector('.g1pc-guide .g1pc-match');
    row.querySelector('[data-g1pc-menu-toggle]').click(); document.body.click();
    return {closed:row.querySelector('[data-g1pc-menu]').hidden,focus:document.activeElement===row.querySelector('[data-g1pc-menu-toggle]')};
  })()`);
  assert(outside.closed && outside.focus, JSON.stringify(outside));
  const confirmation = await evaluate(`(() => {
    const row=document.querySelector('.g1pc-guide .g1pc-match');
    row.querySelector('[data-g1pc-menu-toggle]').click(); row.querySelector('[data-g1pc-delete-open]').click();
    return {visible:!row.querySelector('[data-g1pc-delete-confirm]').hidden,
      actionsHidden:row.querySelector('[data-g1pc-match-actions]').hidden,
      focus:document.activeElement===row.querySelector('[data-g1pc-delete-cancel]')};
  })()`);
  assert(confirmation.visible && confirmation.actionsHidden && confirmation.focus, JSON.stringify(confirmation));
  await capture('confirmation');
  const cancel = await evaluate(`(() => {
    const row=document.querySelector('.g1pc-guide .g1pc-match');
    row.querySelector('[data-g1pc-delete-cancel]').click();
    return {restored:!row.querySelector('[data-g1pc-match-actions]').hidden,
      count:window.__rowTest.entry.competitors.length};
  })()`);
  assert(cancel.restored, JSON.stringify(cancel));
  const removed = await evaluate(`(() => {
    const row=document.querySelector('.g1pc-guide .g1pc-match');
    row.querySelector('[data-g1pc-menu-toggle]').click(); row.querySelector('[data-g1pc-match-toggle]').click();
    return {found:window.__rowTest.competitor.foundPhraseKeysV539.includes(window.__rowTest.phrase.key),
      count:window.__rowTest.entry.competitors.length,toast:document.querySelector('[data-g1pc-undo-toast]')?.textContent,
      subtitle:row.querySelector('.g1pc-match-identity small')?.textContent};
  })()`);
  assert(!removed.found && removed.count === cancel.count && removed.toast.includes('Отменить') && removed.subtitle.includes('0 запросов'), JSON.stringify(removed));
  const toastShot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(`${outputDir}/undo-toast.png`, Buffer.from(toastShot.data, 'base64'));
  const undone = await evaluate(`(() => {
    document.querySelector('[data-g1pc-toast-undo]').click();
    return {found:window.__rowTest.competitor.foundPhraseKeysV539.includes(window.__rowTest.phrase.key),
      toast:!!document.querySelector('[data-g1pc-undo-toast]')};
  })()`);
  assert(undone.found && !undone.toast, JSON.stringify(undone));
  await evaluate(`(() => {
    const row=document.querySelector('.g1pc-guide .g1pc-match');
    row.querySelector('[data-g1pc-menu-toggle]').click();row.querySelector('[data-g1pc-match-toggle]').click();
  })()`);
  await new Promise(resolve => setTimeout(resolve, 6200));
  const timeout = await evaluate(`(() => ({
    toastGone:!document.querySelector('[data-g1pc-undo-toast]'),
    stillUnmarked:!window.__rowTest.competitor.foundPhraseKeysV539.includes(window.__rowTest.phrase.key)
  }))()`);
  assert(timeout.toastGone && timeout.stillUnmarked,JSON.stringify(timeout));
  await evaluate(`(() => {
    const row=document.querySelector('.g1pc-guide .g1pc-match');
    row.querySelector('[data-g1pc-menu-toggle]').click();row.querySelector('[data-g1pc-match-toggle]').click();
  })()`);

  await page.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const mobile = await evaluate(`(async () => {
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    document.activeElement?.blur();
    const row=document.querySelector('.g1pc-guide .g1pc-match');
    const name=row.querySelector('.g1pc-match-identity').getBoundingClientRect();
    const actions=row.querySelector('.g1pc-match-actions').getBoundingClientRect();
    const actionButtons=[...row.querySelectorAll('.g1pc-match-actions > button, .g1pc-menu-trigger')];
    return {fits:row.scrollWidth<=row.clientWidth+1,below:actions.top>=name.bottom,
      buttonHeights:actionButtons.map(node=>node.getBoundingClientRect().height),
      buttonWidths:actionButtons.map(node=>node.getBoundingClientRect().width),actionsWidth:actions.width,
      oneLine:actionButtons.every(node=>Math.abs(node.getBoundingClientRect().top-actionButtons[0].getBoundingClientRect().top)<2),
      viewport:innerWidth};
  })()`);
  assert(mobile.fits && mobile.below && mobile.oneLine && mobile.buttonHeights.every(height=>height>=44), JSON.stringify(mobile));
  await capture('mobile-390');

  const theme = await evaluate(`(() => {
    const row=document.querySelector('.g1pc-guide .g1pc-match');
    row.style.setProperty('--text','#eee');row.style.setProperty('--panel','#111');
    row.style.setProperty('--accent','#7af');row.style.setProperty('--danger','#f77');
    const result={edit:getComputedStyle(row.querySelector('.g1pc-edit-button')).color,
      criteria:getComputedStyle(row.querySelector('.g1pc-detail-button')).color,
      delete:getComputedStyle(row.querySelector('.g1pc-menu-delete')).color,
      menu:getComputedStyle(row.querySelector('.g1pc-menu')).backgroundColor};
    ['--text','--panel','--accent','--danger'].forEach(name=>row.style.removeProperty(name));
    return result;
  })()`);
  assert.deepEqual(theme,{edit:'rgb(238, 238, 238)',criteria:'rgb(119, 170, 255)',
    delete:'rgb(255, 119, 119)',menu:'rgb(17, 17, 17)'});

  const deleted = await evaluate(`(() => {
    const row=document.querySelector('.g1pc-guide .g1pc-match');
    window.__rowTest.nativeConfirmCalls=0;
    window.confirm=()=>{window.__rowTest.nativeConfirmCalls++;return false};
    row.querySelector('[data-g1pc-menu-toggle]').click();row.querySelector('[data-g1pc-delete-open]').click();
    row.querySelector('[data-g1bp-delete-v543]').click();
    return {removed:!window.__rowTest.entry.competitors.some(item=>item.id===window.__rowTest.competitor.id),
      archived:window.__rowTest.entry.archivedCompetitorsV540?.some(item=>item.id===window.__rowTest.competitor.id),
      nativeConfirmCalls:window.__rowTest.nativeConfirmCalls};
  })()`);
  assert(deleted.removed && deleted.archived && deleted.nativeConfirmCalls === 0, JSON.stringify(deleted));
  console.log(JSON.stringify({ initial, menu, escape, outside, confirmation, cancel, removed, undone, timeout, mobile, theme, deleted,
    screenshots:['desktop.png','menu.png','confirmation.png','mobile-390.png','undo-toast.png'] }, null, 2));
} finally {
  page.close();
  await browser.call('Target.disposeBrowserContext', { browserContextId });
  browser.close();
}
