import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const port = process.env.GURU_CHROME_DEBUG_PORT || '9341';
const url = process.env.GURU_APP_URL || 'http://127.0.0.1:4318/';
class Cdp {
  constructor(address) {
    this.socket = new WebSocket(address);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      const pending = this.pending.get(data.id);
      if (!pending) return;
      this.pending.delete(data.id);
      clearTimeout(pending.timer);
      if (data.error) pending.reject(new Error(data.error.message));
      else pending.resolve(data.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => reject(new Error('CDP timeout: ' + method)), 60000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const browserInfo = await (await fetch('http://127.0.0.1:' + port + '/json/version')).json();
const browser = new Cdp(browserInfo.webSocketDebuggerUrl);
let page;
let browserContextId;
try {
  ({ browserContextId } = await browser.call('Target.createBrowserContext'));
  const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
  const tabs = await (await fetch('http://127.0.0.1:' + port + '/json')).json();
  page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
  const evaluate = async (expression) => {
    const reply = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description || reply.exceptionDetails.text);
    return reply.result.value;
  };
  await page.call('Runtime.enable');
  await page.call('Page.enable');
  await page.call('Page.navigate', { url });
  for (let i = 0; i < 200; i++) {
    if (await evaluate('document.readyState === "complete" && typeof g2VkBlockHtml === "function"')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const browserScript = async () => {
    localStorage.clear();
    rememberAccessUnlocked();
    setAccessState(true);
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const project = { id: 'vk-ads-v2-smoke', name: 'Коричное яблоко', website: 'https://k-apple.ru/',
      lifecycleStatus: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    projects = [project];
    activeProjectId = project.id;
    state = createFreshWorkspace(project);
    state.project = { ...state.project, ...project };
    const gate = state.gates.find(item => item.id === 'gate-2');
    ensureGate2Structure(gate);
    const config = G2_SERVICE_BLOCK_CONFIGS.get('company-vk');
    g2ServiceBlockEnsureCard(config);
    const record = g2wRecord(g2wDef('vk'), '', true);
    record.values.vkAccount = '24709457';
    record.values.pixelId = '123456789';
    record.values.vkCommunityUrl = 'https://vk.ru/korichnoe_yabloko';
    const oldIds = ['account', 'existing', 'pixel', 'id', 'install', 'publish', 'visit'];
    for (const id of oldIds) record.steps[id] = { step_id: id, result: 'done', params: { saved: id } };
    const oldReviews = ['vkAdsCabinetReviewV1', 'vkAdsRightsReviewV1', 'vkAdsCabinetIdReviewV1', 'vkAdsRequisitesReviewV1'];
    for (const field of oldReviews) record[field] = { result: 'passed', fingerprint: 'old', checkedAt: '2026-10-01' };
    record.verification = { result: 'passed', fingerprint: 'old', source_url: 'VK Реклама', checked_at: '2026-10-01' };
    record.history = [{ result: 'failed', source_url: 'old-check', checked_at: '2026-09-01' }];
    const oldSteps = JSON.stringify(oldIds.map(id => record.steps[id]));
    const oldReviewValues = JSON.stringify(oldReviews.map(field => record[field]));
    const oldValues = JSON.stringify(record.values);
    const oldVerification = JSON.stringify(record.verification);
    els.launcher.hidden = true;
    els.appShell.hidden = false;
    activeView = 'gate';
    activeGateId = 'gate-2';
    renderGate();
    const block = document.querySelector('[data-g2sb-id="company-vk"]');
    const ads = block.querySelector('[aria-label="VK Реклама и пиксель"]');
    const ids = G2_VK_ADS_V2_IDS;
    const initial = {
      sectionTitles: [...ads.querySelectorAll('[data-g2vk-section] h4')].map(node => node.textContent),
      sectionCount: ads.querySelectorAll('[data-g2vk-section]').length,
      stepTitles: [...ads.querySelectorAll('[data-g2vk-step] h5')].filter(node => node.closest('.g2mu-step-heading')).map(node => node.textContent),
      stepCount: ads.querySelectorAll('[data-g2vk-step]').length,
      guideHeadings: ids.map(id => [...ads.querySelectorAll('[data-g2vk-step="' + id + '"] .g2mu-guide-body > div > h5')].map(node => node.textContent)),
      criteria: ids.map(id => ads.querySelector('[data-g2vk-step="' + id + '"] .g2mu-guide-body').textContent.includes('Критерий выполнения:')),
      statuses: ids.map(id => g2VkStepStatus(id)),
      accountField: ads.querySelector('[data-g2w-field="vkAccount"]')?.value,
      pixelField: ads.querySelector('[data-g2w-field="pixelId"]')?.value,
      accountFieldCount: ads.querySelectorAll('[data-g2w-field="vkAccount"]').length,
      pixelFieldCount: ads.querySelectorAll('[data-g2w-field="pixelId"]').length,
      legacyRows: ads.querySelectorAll('.g2vk-legacy li').length,
      finalSource: ads.querySelector('[data-g2vk-final-source]')?.value,
      finalLabel: ads.querySelector('[data-g2vk-final-state]')?.textContent,
      finalPassDisabled: ads.querySelector('[data-g2vk-final-result="passed"]').disabled,
      wizardStatus: g2wStatus(g2wDef('vk')),
      pixelDoc: !!ads.querySelector('a[href="https://ads.vk.ru/help/articles/pixel"]'),
      tildaDoc: !!ads.querySelector('a[href="https://help-ru.tilda.cc/vk-pixel"]'),
      tildaField: ads.textContent.includes('MAIL.RU COUNTER ID (VK PIXEL)'),
      otherBlocks: ['company-webmaster', 'company-yandex-direct', 'company-telegram-ads', 'company-leads']
        .every(id => !!document.querySelector('[data-g2sb-id="' + id + '"]')),
      legacyUnchanged: JSON.stringify(oldIds.map(id => record.steps[id])) === oldSteps &&
        JSON.stringify(oldReviews.map(field => record[field])) === oldReviewValues &&
        JSON.stringify(record.values) === oldValues &&
        JSON.stringify(record.verification) === oldVerification
    };
    const click = (id, result) => {
      const button = ads.querySelector('[data-g2vk-step="' + id + '"] .g2mu-actions [data-g2vk-review="' + result + '"]');
      if (!button || button.disabled) throw new Error('Review unavailable: ' + id + '/' + result);
      button.click();
    };
    click(ids[0], 'pending');
    const pending = g2VkStepStatus(ids[0]);
    click(ids[0], 'failed');
    const failed = g2VkStepStatus(ids[0]);
    click(ids[0], 'passed');
    for (const id of ids.slice(1)) click(id, 'passed');
    const afterSteps = {
      statuses: ids.map(id => g2VkStepStatus(id)),
      adsStatus: g2VkAdsStatus(),
      wizardStatus: g2wStatus(g2wDef('vk')),
      progress: block.querySelector('[data-g2sb-progress]').textContent,
      sectionProgress: [...ads.querySelectorAll('[data-g2vk-section-progress]')].map(node => node.textContent),
      finalPassEnabled: !ads.querySelector('[data-g2vk-final-result="passed"]').disabled,
      oldStepsUnchanged: JSON.stringify(oldIds.map(id => record.steps[id])) === oldSteps,
      oldReviewsUnchanged: JSON.stringify(oldReviews.map(field => record[field])) === oldReviewValues,
      valuesUnchanged: JSON.stringify(record.values) === oldValues,
      reviewKeys: Object.keys(record.steps[ids[0]]).sort()
    };
    ads.querySelector('[data-g2vk-final-source]').value = 'VK Реклама: пиксель и баланс';
    ads.querySelector('[data-g2vk-final-result="passed"]').click();
    const afterFinal = {
      status: g2VkAdsStatus(),
      wizardStatus: g2wStatus(g2wDef('vk')),
      verificationStatus: g2VkAdsVerificationStatus(),
      verificationFingerprint: record.verification.fingerprint,
      oldVerificationInHistory: record.history.some(item => JSON.stringify(item) === oldVerification),
      oldHistoryPresent: record.history.some(item => item.source_url === 'old-check')
    };
    const accountInput = ads.querySelector('[data-g2w-field="vkAccount"]');
    accountInput.value = '24709458';
    accountInput.dispatchEvent(new Event('input', { bubbles: true }));
    accountInput.dispatchEvent(new Event('change', { bubbles: true }));
    const afterAccountChange = { statuses: ids.map(id => g2VkStepStatus(id)),
      verificationStatus: g2VkAdsVerificationStatus(), wizardStatus: g2wStatus(g2wDef('vk')) };
    accountInput.value = '24709457';
    accountInput.dispatchEvent(new Event('input', { bubbles: true }));
    accountInput.dispatchEvent(new Event('change', { bubbles: true }));
    const afterAccountRestore = ids.map(id => g2VkStepStatus(id));
    const pixelInput = ads.querySelector('[data-g2w-field="pixelId"]');
    pixelInput.value = '123456788';
    pixelInput.dispatchEvent(new Event('input', { bubbles: true }));
    pixelInput.dispatchEvent(new Event('change', { bubbles: true }));
    const afterPixelChange = ids.map(id => g2VkStepStatus(id));
    pixelInput.value = '123456789';
    pixelInput.dispatchEvent(new Event('input', { bubbles: true }));
    pixelInput.dispatchEvent(new Event('change', { bubbles: true }));
    const afterPixelRestore = ids.map(id => g2VkStepStatus(id));
    record.values.used = 'no';
    const pixelNotNeeded = ids.slice(4).map(id => g2VkStepStatus(id));
    const channelNotNeeded = g2wStatus(g2wDef('vk'));
    record.values.used = '';
    const originalProducts = guruV194Products;
    guruV194Products = () => [{ id: 'test-product', name: 'Товар' }];
    const landing = g2wRecord(g2wDef('landing'), 'test-product', true);
    landing.values.route = 'messenger';
    const routePixelNotNeeded = ids.slice(4).map(id => g2VkStepStatus(id));
    landing.values.route = 'website';
    const routePixelRequired = ids.slice(4).map(id => g2VkStepStatus(id));
    guruV194Products = originalProducts;
    const section = ads.querySelector('[data-g2vk-section="ads2"]');
    section.open = true;
    await new Promise(resolve => setTimeout(resolve, 0));
    const savedSectionOpen = localStorage.getItem(G2_VK_ADS_BASE_SECTION_STORAGE_PREFIX + project.id);
    state = structuredClone(state);
    renderGate();
    const reopened = document.querySelector('[data-g2sb-id="company-vk"]');
    const afterProjectReload = {
      sectionOpen: reopened.querySelector('[data-g2vk-section="ads2"]').open,
      statuses: ids.map(id => g2VkStepStatus(id)),
      verificationStatus: g2VkAdsVerificationStatus(),
      wizardStatus: g2wStatus(g2wDef('vk')),
      oldStepsUnchanged: JSON.stringify(oldIds.map(id => g2VkRecord().steps[id])) === oldSteps,
      oldReviewsUnchanged: JSON.stringify(oldReviews.map(field => g2VkRecord()[field])) === oldReviewValues,
      oldHistoryPresent: g2VkRecord().history.some(item => item.source_url === 'old-check'),
      finalSource: reopened.querySelector('[data-g2vk-final-source]').value
    };
    const savedState = state;
    const other = { id: 'vk-other-smoke', name: 'Другой проект', website: 'https://example.org/', lifecycleStatus: 'active' };
    projects.push(other);
    activeProjectId = other.id;
    state = createFreshWorkspace(other);
    state.project = { ...state.project, ...other };
    renderGate();
    const otherResult = {
      statuses: ids.map(id => g2VkStepStatus(id)),
      accountValue: document.querySelector('[data-g2sb-id="company-vk"] [data-g2w-field="vkAccount"]')?.value,
      pixelValue: document.querySelector('[data-g2sb-id="company-vk"] [data-g2w-field="pixelId"]')?.value,
      sectionOpen: document.querySelector('[data-g2sb-id="company-vk"] [data-g2vk-section="ads2"]')?.open,
      source: document.querySelector('[data-g2sb-id="company-vk"] [data-g2vk-final-source]')?.value
    };
    activeProjectId = project.id;
    state = savedState;
    renderGate();
    saveProjects();
    await saveState();
    return { initial, pending, failed, afterSteps, afterFinal, afterAccountChange, afterAccountRestore,
      afterPixelChange, afterPixelRestore, pixelNotNeeded, channelNotNeeded, routePixelNotNeeded, routePixelRequired,
      savedSectionOpen, afterProjectReload, otherResult };
  };
  const result = await evaluate('(' + browserScript.toString() + ')()');
  assert.deepEqual(result.initial.sectionTitles, [
    '1. Подключение рекламного кабинета', '2. Подключение пикселя'
  ]);
  assert.equal(result.initial.sectionCount, 2);
  assert.deepEqual(result.initial.stepTitles, [
    'Рекламный кабинет и ID', 'Владелец и права доступа', 'Реквизиты рекламодателя',
    'Готовность к оплате', 'Пиксель сайта', 'Установка и проверка пикселя'
  ]);
  assert.equal(result.initial.stepCount, 6);
  for (const headings of result.initial.guideHeadings) assert.deepEqual(headings, [
    '1. Что сделать (инструкция)', '2. Где нажать / Как проверить (инструкция)', '3. Сверка (инструкция)'
  ]);
  assert.ok(result.initial.criteria.every(Boolean));
  assert.deepEqual(result.initial.statuses, [
    'needs_check', 'needs_check', 'needs_check', 'not_started', 'needs_check', 'needs_check'
  ]);
  assert.equal(result.initial.accountField, '24709457');
  assert.equal(result.initial.pixelField, '123456789');
  assert.equal(result.initial.accountFieldCount, 1);
  assert.equal(result.initial.pixelFieldCount, 1);
  assert.equal(result.initial.legacyRows, 11);
  assert.equal(result.initial.finalSource, 'VK Реклама');
  assert.ok(result.initial.finalLabel.includes('требуют повторной проверки'));
  assert.equal(result.initial.finalPassDisabled, true);
  assert.equal(result.initial.wizardStatus, 'in_progress');
  assert.equal(result.initial.pixelDoc, true);
  assert.equal(result.initial.tildaDoc, true);
  assert.equal(result.initial.tildaField, true);
  assert.equal(result.initial.otherBlocks, true);
  assert.equal(result.initial.legacyUnchanged, true);
  assert.equal(result.pending, 'needs_check');
  assert.equal(result.failed, 'problem');
  assert.deepEqual(result.afterSteps.statuses, Array(6).fill('ready'));
  assert.equal(result.afterSteps.adsStatus, 'in_progress');
  assert.equal(result.afterSteps.wizardStatus, 'in_progress');
  assert.equal(result.afterSteps.progress, '6 из 12 шагов');
  assert.deepEqual(result.afterSteps.sectionProgress, ['4 из 4 шагов', '2 из 2 шагов']);
  assert.equal(result.afterSteps.finalPassEnabled, true);
  assert.equal(result.afterSteps.oldStepsUnchanged, true);
  assert.equal(result.afterSteps.oldReviewsUnchanged, true);
  assert.equal(result.afterSteps.valuesUnchanged, true);
  assert.deepEqual(result.afterSteps.reviewKeys, ['checkedAt', 'fingerprint', 'result', 'step_id']);
  assert.equal(result.afterFinal.status, 'ready');
  assert.equal(result.afterFinal.wizardStatus, 'ready');
  assert.equal(result.afterFinal.verificationStatus, 'ready');
  assert.ok(result.afterFinal.verificationFingerprint.includes('vk-ads-v2'));
  assert.equal(result.afterFinal.oldVerificationInHistory, true);
  assert.equal(result.afterFinal.oldHistoryPresent, true);
  assert.ok(result.afterAccountChange.statuses.every(status => status === 'recheck'));
  assert.equal(result.afterAccountChange.verificationStatus, 'needs_check');
  assert.equal(result.afterAccountChange.wizardStatus, 'in_progress');
  assert.deepEqual(result.afterAccountRestore, Array(6).fill('ready'));
  assert.deepEqual(result.afterPixelChange, ['ready', 'ready', 'ready', 'ready', 'recheck', 'recheck']);
  assert.deepEqual(result.afterPixelRestore, Array(6).fill('ready'));
  assert.deepEqual(result.pixelNotNeeded, ['not_needed', 'not_needed']);
  assert.equal(result.channelNotNeeded, 'in_progress');
  assert.deepEqual(result.routePixelNotNeeded, ['not_needed', 'not_needed']);
  assert.deepEqual(result.routePixelRequired, ['recheck', 'recheck']);
  assert.equal(result.savedSectionOpen, '1');
  assert.equal(result.afterProjectReload.sectionOpen, true);
  assert.deepEqual(result.afterProjectReload.statuses, Array(6).fill('ready'));
  assert.equal(result.afterProjectReload.verificationStatus, 'ready');
  assert.equal(result.afterProjectReload.wizardStatus, 'ready');
  assert.equal(result.afterProjectReload.oldStepsUnchanged, true);
  assert.equal(result.afterProjectReload.oldReviewsUnchanged, true);
  assert.equal(result.afterProjectReload.oldHistoryPresent, true);
  assert.equal(result.afterProjectReload.finalSource, 'VK Реклама: пиксель и баланс');
  assert.deepEqual(result.otherResult.statuses, Array(6).fill('not_started'));
  assert.equal(result.otherResult.accountValue, '');
  assert.equal(result.otherResult.pixelValue, '');
  assert.equal(result.otherResult.sectionOpen, false);
  assert.equal(result.otherResult.source, '');
  const oldTimeOrigin = await evaluate('performance.timeOrigin');
  await page.call('Page.reload');
  for (let i = 0; i < 200; i++) {
    try {
      if (await evaluate('performance.timeOrigin !== ' + oldTimeOrigin + ' && document.readyState === "complete" && typeof openProject === "function"')) break;
    } catch (_) {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const reloadCheck = async () => {
    await openProject('vk-ads-v2-smoke');
    activeView = 'gate';
    activeGateId = 'gate-2';
    renderGate();
    return { projectId: activeProjectId, statuses: G2_VK_ADS_V2_IDS.map(id => g2VkStepStatus(id)),
      adsStatus: g2VkAdsStatus(),
      source: document.querySelector('[data-g2sb-id="company-vk"] [data-g2vk-final-source]')?.value,
      account: g2VkCompanyValue('vkAccount'), pixel: g2VkCompanyValue('pixelId'),
      oldStep: g2VkRecord()?.steps?.visit?.result,
      oldHistory: g2VkRecord()?.history?.some(item => item.source_url === 'old-check') };
  };
  const hardReload = await evaluate('(' + reloadCheck.toString() + ')()');
  assert.equal(hardReload.projectId, 'vk-ads-v2-smoke');
  assert.deepEqual(hardReload.statuses, Array(6).fill('ready'));
  assert.equal(hardReload.adsStatus, 'ready');
  assert.equal(hardReload.source, 'VK Реклама: пиксель и баланс');
  assert.equal(hardReload.account, '24709457');
  assert.equal(hardReload.pixel, '123456789');
  assert.equal(hardReload.oldStep, 'done');
  assert.equal(hardReload.oldHistory, true);
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate("var vkBlock=document.querySelector('[data-g2sb-id=\"company-vk\"]'); vkBlock.open=true; var vkAds=vkBlock.querySelector('[aria-label=\"VK Реклама и пиксель\"]'); vkAds.querySelectorAll('[data-g2vk-section]').forEach(section=>section.open=false); vkAds.scrollIntoView({ block: 'start' }); true");
  await new Promise(resolve => setTimeout(resolve, 100));
  const screenshot = await page.call('Page.captureScreenshot', { format: 'png' });
  await fs.mkdir('artifacts/gate2-vk-ads-v2', { recursive: true });
  await fs.writeFile('artifacts/gate2-vk-ads-v2/structure.png', Buffer.from(screenshot.data, 'base64'));
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1900, deviceScaleFactor: 1, mobile: false });
  await evaluate("var vkAds=document.querySelector('[aria-label=\"VK Реклама и пиксель\"]'); vkAds.querySelectorAll('[data-g2vk-section]').forEach(section=>section.open=true); vkAds.scrollIntoView({ block: 'start' }); true");
  await new Promise(resolve => setTimeout(resolve, 100));
  const expanded = await page.call('Page.captureScreenshot', { format: 'png' });
  await fs.writeFile('artifacts/gate2-vk-ads-v2/steps.png', Buffer.from(expanded.data, 'base64'));
  console.log('VK Ads 2 sections / 6 steps / 18 guides and legacy data: passed');
} finally {
  if (page) page.close();
  if (browserContextId) await browser.call('Target.disposeBrowserContext', { browserContextId });
  browser.close();
}
