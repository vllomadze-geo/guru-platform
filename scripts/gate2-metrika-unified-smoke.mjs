import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const fixture = JSON.parse(readFileSync(process.env.GURU_GATE2_FIXTURE || '/Users/vl/Downloads/gate-2.json', 'utf8'));
const exactOrderText = readFileSync(new URL('../gate2-metrika-order-3.1.1.md', import.meta.url), 'utf8');
const exactLeadText = readFileSync(new URL('../gate2-metrika-lead-3.1.2.md', import.meta.url), 'utf8');
const exactPaymentText = readFileSync(new URL('../gate2-metrika-payment-3.1.3.md', import.meta.url), 'utf8');
const exactCallText = readFileSync(new URL('../gate2-metrika-call-3.1.4.md', import.meta.url), 'utf8');
const exactBookingText = readFileSync(new URL('../gate2-metrika-booking-3.1.5.md', import.meta.url), 'utf8');
const exactRegistrationText = readFileSync(new URL('../gate2-metrika-registration-3.1.6.md', import.meta.url), 'utf8');
const exactPopupLeadText = readFileSync(new URL('../gate2-metrika-popup-lead-3.1.7.md', import.meta.url), 'utf8');
const exactAddToCartText = readFileSync(new URL('../gate2-metrika-add-to-cart-3.2.1.md', import.meta.url), 'utf8');
const exactPhoneClickText = readFileSync(new URL('../gate2-metrika-phone-click-3.2.2.md', import.meta.url), 'utf8');
const exactSiteSearchText = readFileSync(new URL('../gate2-metrika-site-search-3.3.1.md', import.meta.url), 'utf8');
const exactKeySectionVisitText = readFileSync(new URL('../gate2-metrika-key-section-visit-3.3.2.md', import.meta.url), 'utf8');
const exactMultipleProductViewsText = readFileSync(new URL('../gate2-metrika-multiple-product-views-3.3.3.md', import.meta.url), 'utf8');
const exactPageviewCountText = readFileSync(new URL('../gate2-metrika-pageview-count-3.3.4.md', import.meta.url), 'utf8');
const exactVisitDurationText = readFileSync(new URL('../gate2-metrika-visit-duration-3.3.5.md', import.meta.url), 'utf8');
const exactContentAnalyticsText = readFileSync(new URL('../gate2-metrika-content-analytics-4.1.md', import.meta.url), 'utf8');
const exactTagManagerText = readFileSync(new URL('../gate2-metrika-tag-manager-4.2.md', import.meta.url), 'utf8');
const browserPort = process.env.GURU_CHROME_DEBUG_PORT || '49337';
const appUrl = process.env.GURU_APP_URL || 'http://127.0.0.1:41323/';
const folder = 'artifacts/gate2-metrika-unified';
mkdirSync(folder, { recursive: true });

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
      const pending = this.pending.get(message.id); if (!pending) return;
      this.pending.delete(message.id); clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message)); else pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 90000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

const version = await (await fetch(`http://127.0.0.1:${browserPort}/json/version`)).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
let page, browserContextId;
try {
  ({ browserContextId } = await browser.call('Target.createBrowserContext'));
  const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
  const tabs = await (await fetch(`http://127.0.0.1:${browserPort}/json`)).json();
  page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
  const evaluate = async expression => {
    const reply = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.exception?.description || reply.exceptionDetails.text);
    return reply.result.value;
  };
  await page.call('Runtime.enable'); await page.call('Page.enable');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.navigate', { url: appUrl });
  for (let i = 0; i < 200; i++) {
    if (await evaluate('document.readyState === "complete" && typeof g2muMount === "function"')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await evaluate(`(() => {
    localStorage.clear(); rememberAccessUnlocked(); setAccessState(true);
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    projects = [{ id: 'gate2-metrika-isolated', name: 'Коричное яблоко', lifecycleStatus: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    saveProjects();
    activeProjectId = 'gate2-metrika-isolated';
    state = createFreshWorkspace({ id: activeProjectId, name: 'Коричное яблоко' });
    state.project = { ...state.project, ...${JSON.stringify(fixture.content.project)}, id: activeProjectId };
    state.gates.find(gate => gate.id === 'gate-2').cards = ${JSON.stringify(fixture.gate.cards)};
    const first = guruV194Products(state)[0];
    if (first) state.project.gate0ScopeUiV194 = { selectedCategoryId: megaPlatformProductCategoryIds(first)[0] || '__uncategorized__', selectedProductId: first.id };
    els.launcher.hidden = true; els.appShell.hidden = false; activeView = 'gate'; activeGateId = 'gate-2';
    renderGate();
  })()`);
  const initial = await evaluate(`(() => {
    const root = document.querySelector('[data-g2y-company]');
    const block = root?.querySelector('[data-g2mu-block]');
    const cards = state.gates.find(gate => gate.id === 'gate-2').cards;
    return { groupCount: document.querySelectorAll('[data-g2y-company]').length,
      blockCount: document.querySelectorAll('[data-g2mu-block]').length,
      sections: [...block?.querySelectorAll('[data-g2mu-section]') || []].map(node => node.querySelector(':scope > summary h4')?.textContent),
      conversionSubsections: [...block?.querySelectorAll('[data-g2mu-section="3"] [data-g2mu-subsection]') || []]
        .map(node => ({ number: node.dataset.g2muSubsection, title: node.querySelector(':scope > h5')?.textContent,
          steps: [...node.querySelectorAll('[data-g2mu-step]')].map(row => row.querySelector('.g2mu-number')?.textContent) })),
      toolSteps: [...block?.querySelectorAll('[data-g2mu-section="4"] [data-g2mu-step]') || []]
        .map(row => row.querySelector('.g2mu-number')?.textContent),
      steps: block?.querySelectorAll('[data-g2mu-step]').length,
      markers: block?.querySelectorAll('.g2mu-step-marker').length,
      guides: block?.querySelectorAll('.g2mu-guide').length,
      oldWizard: document.querySelectorAll('.g2w-workspace [data-g2w-card-view="counter"], .g2w-workspace [data-g2w-card-view="goal"]').length,
      oldQuality: document.querySelectorAll('[data-g2-metrika-quality-section-v360="company"]').length,
      originalIds: ['g2-metrika-company-counter','g2-metrika-company-goals','g2-metrika-company-internal-filter','g2-metrika-company-robots'].map(id => cards.some(card => card.id === id)),
      counterId: g2MetrikaCompanyCounterV374(), goals: g2MetrikaCompanyGoalsV374().map(goal => [goal.entryId,goal.name,goal.goalId]),
      unitIds: [...root?.querySelectorAll('[data-g2y-unit]') || []].map(node => node.dataset.g2yUnit),
      related: block?.querySelectorAll('.g2mu-related [data-card]').length,
      relatedTitle: block?.textContent.includes('Сохранённые проверки и связанные настройки'),
      qualityRecords: ['g2-metrika-goals-traffic','g2-metrika-goals-calls','g2-metrika-goals-email','g2-metrika-goals-widgets','g2-metrika-goals-kpi'].filter(id => cards.some(card => card.id === id)).length,
      serviceLink: root?.querySelectorAll('[data-g2y-service-link]').length,
      extraCardsVisible: [...document.querySelectorAll('.g2w-additional [data-card]')].filter(node => ['g2-metrika-company-counter','g2-metrika-company-goals','g2-metrika-company-internal-filter','g2-metrika-company-robots'].includes(node.dataset.card)).length,
      errorCount: document.querySelectorAll('.g2mu-block .undefined').length,
    };
  })()`);
  console.log(JSON.stringify(initial, null, 2));
  assert.equal(initial.groupCount, 1);
  assert.equal(initial.blockCount, 1);
  assert.deepEqual(initial.sections, [
    '1. Подключение счётчика', '2. Базовые настройки',
    '3. Конверсионные цели', '4. Дополнительные инструменты',
  ]);
  assert.equal(initial.steps, 26);
  assert.equal(initial.markers, 26);
  assert.equal(initial.guides, 26);
  assert.deepEqual(initial.conversionSubsections, [
    { number: '3.1', title: '3.1. Основные конверсии', steps: [
      '3.1.1', '3.1.2', '3.1.3', '3.1.4', '3.1.5', '3.1.6', '3.1.7'] },
    { number: '3.2', title: '3.2. Промежуточные конверсии', steps: ['3.2.1', '3.2.2'] },
    { number: '3.3', title: '3.3. Поведенческие цели', steps: ['3.3.1', '3.3.2', '3.3.3', '3.3.4', '3.3.5'] },
  ]);
  assert.deepEqual(initial.toolSteps, ['4.1', '4.2']);
  assert.equal(initial.oldWizard, 0);
  assert.equal(initial.oldQuality, 0);
  assert(initial.originalIds.every(Boolean));
  assert.deepEqual(initial.unitIds, ['metrika', 'webmaster', 'business', 'direct']);
  assert.equal(initial.serviceLink, 1);
  assert.equal(initial.extraCardsVisible, 0);
  assert.equal(initial.related, 0);
  assert.equal(initial.relatedTitle, false);
  assert.equal(initial.qualityRecords, 5);
  assert.equal(initial.counterId, '105213127');
  const parameterCheck = await evaluate(`(() => {
    const counter = g2MetrikaCompanyDataV374('counter');
    counter.timezone = ''; counter.currency = ''; counter.additionalAddresses = '';
    renderGate();
    const row = document.querySelector('[data-g2mu-step="s21"]');
    const fields = [...row.querySelectorAll('.g2mu-fields input, .g2mu-fields select')];
    const site = row.querySelector('.g2mu-source strong')?.textContent;
    row.querySelector('.g2mu-step-marker').click();
    return { fields: fields.length, site, status: g2muStatus('s21'),
      pressed: row.querySelector('.g2mu-step-marker').getAttribute('aria-pressed'),
      review: g2muReview().s21?.result };
  })()`);
  assert.deepEqual(parameterCheck, { fields: 0, site: 'https://k-apple.ru/',
    status: 'ready', pressed: 'true', review: 'passed' });
  const robotsCheck = await evaluate(`(() => {
    const robots = g2MetrikaCompanyDataV374('robots');
    robots.mode = ''; robots.strictFiltering = ''; robots.strictReason = '';
    renderGate();
    const row = document.querySelector('[data-g2mu-step="s25"]');
    const fields = row.querySelectorAll('.g2mu-fields input, .g2mu-fields select').length;
    const personalized = row.querySelector('.g2mu-robots-guide')?.textContent.includes('105213127') &&
      row.querySelector('.g2mu-robots-guide')?.textContent.includes('k-apple.ru');
    row.querySelector('.g2mu-step-marker').click();
    return { fields, personalized, status: g2muStatus('s25'),
      pressed: row.querySelector('.g2mu-step-marker').getAttribute('aria-pressed') };
  })()`);
  assert.deepEqual(robotsCheck, { fields: 0, personalized: true, status: 'ready', pressed: 'true' });
  const accessCheck = await evaluate(`(() => {
    g2MetrikaCompanyDataV374('counter').accessOwner = '';
    renderGate();
    const row = document.querySelector('[data-g2mu-step="s26"]');
    const fields = row.querySelectorAll('.g2mu-fields input, .g2mu-fields select').length;
    const personalized = row.querySelector('.g2mu-access-guide')?.textContent.includes('105213127') &&
      row.querySelector('.g2mu-access-guide')?.textContent.includes('k-apple.ru');
    row.querySelector('.g2mu-step-marker').click();
    return { fields, personalized, status: g2muStatus('s26'),
      pressed: row.querySelector('.g2mu-step-marker').getAttribute('aria-pressed') };
  })()`);
  assert.deepEqual(accessCheck, { fields: 0, personalized: true, status: 'ready', pressed: 'true' });
  const disclosure = await evaluate(`(async () => {
    const root = document.querySelector('[data-g2y-company]');
    for (let parent = root.parentElement?.closest('details'); parent; parent = parent.parentElement?.closest('details')) parent.open = true;
    root.open = true;
    const heightOpen = root.getBoundingClientRect().height;
    root.querySelector(':scope > summary').click();
    await new Promise(resolve => requestAnimationFrame(resolve));
    const closed = !root.open && root.getBoundingClientRect().height < heightOpen;
    renderGate();
    const restored = document.querySelector('[data-g2y-company]');
    const stayedClosed = !restored.open;
    restored.querySelector(':scope > summary').click();
    return { closed, stayedClosed, reopened: restored.open };
  })()`);
  assert.deepEqual(disclosure, { closed: true, stayedClosed: true, reopened: true });
  const guideCheck = await evaluate(`(() => {
    const guides = [...document.querySelectorAll('[data-g2mu-block] .g2mu-guide')];
    return { count: guides.length, complete: guides.every(node =>
      ['s311', 's312', 's313', 's314', 's315', 's316', 's317', 's321', 's322', 's331', 's332', 's333', 's334', 's335', 's4content', 's4tags'].includes(node.closest('[data-g2mu-step]')?.dataset.g2muStep)
        ? Boolean(node.querySelector('.g2mu-verbatim-copy h3'))
        : node.querySelectorAll('h6').length === 2 && node.querySelector('a[href^="https://"]') &&
          node.closest('[data-g2mu-step]').querySelector('.g2mu-kicker')?.textContent === 'Что сделать'),
      goalData: g2MetrikaCompanyGoalsV374().map(goal => [goal.entryId, goal.name, goal.goalId]),
      wizardCounterStatus: g2wStatus(g2wDef('counter')), sourceCounterStatus: g2MetrikaCompanyStatusV374(g2MetrikaCompanyCardV374('counter')) };
  })()`);
  assert.equal(guideCheck.count, 26); assert.equal(guideCheck.complete, true);
  const orderStep = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-step="s311"]');
    const guide = row.querySelector('.g2mu-order-copy')?.textContent || '';
    return { number: row.querySelector('.g2mu-number')?.textContent,
      fields: row.querySelectorAll('.g2mu-fields input, .g2mu-fields select, .g2mu-evidence input').length,
      oldSteps: document.querySelectorAll('[data-g2mu-step="s31"], [data-g2mu-step="s32"], [data-g2mu-step="s33"], [data-g2mu-step="s34"], [data-g2mu-step="s35"], [data-g2mu-step="s36"]').length,
      originalTitle: guide.includes('3.1.1. Оформленный заказ'),
      originalExample: guide.includes('https://example.ru/product?_ym_debug=2'),
      adaptedDomain: guide.includes('k-apple.ru'), adaptedCounter: guide.includes('105213127'),
      registry: Boolean(document.querySelector('.g2mu-goal-registry')),
      tableRows: row.querySelectorAll('.g2mu-order-copy table tbody tr').length };
  })()`);
  assert.deepEqual(orderStep, { number: '3.1.1', fields: 0, oldSteps: 0,
    originalTitle: true, originalExample: true, adaptedDomain: false, adaptedCounter: false,
    registry: false, tableRows: 9 });
  assert.equal(await evaluate('G2MU_ORDER_MARKDOWN'), exactOrderText);
  const leadStep = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-step="s312"]');
    const copy = row.querySelector('.g2mu-lead-copy')?.textContent || '';
    return { number: row.querySelector('.g2mu-number')?.textContent,
      fields: row.querySelectorAll('.g2mu-fields input, .g2mu-fields select, .g2mu-evidence input').length,
      originalTitle: copy.includes('3.1.2. Полученная заявка'),
      originalExample: copy.includes('/tilda/form2305306971/submitted'),
      originalProject: copy.includes('Коричное яблоко'),
      extraBlock: copy.includes('Сохранённые проверки и связанные настройки'),
      tableCount: row.querySelectorAll('.g2mu-lead-copy table').length,
      notNeededButton: Boolean(row.querySelector('[data-g2mu-review="not_needed"]')) };
  })()`);
  assert.deepEqual(leadStep, { number: '3.1.2', fields: 0, originalTitle: true,
    originalExample: true, originalProject: true, extraBlock: false, tableCount: 3,
    notNeededButton: true });
  assert.equal(await evaluate('G2MU_LEAD_MARKDOWN'), exactLeadText);
  const paymentStep = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-step="s313"]');
    const copy = row.querySelector('.g2mu-payment-copy')?.textContent || '';
    return { number: row.querySelector('.g2mu-number')?.textContent,
      fields: row.querySelectorAll('.g2mu-fields input, .g2mu-fields select, .g2mu-evidence input').length,
      originalTitle: copy.includes('3.1.3. Подтверждённая оплата'),
      csvTarget: copy.includes('payment_confirmed'),
      offlineConversion: copy.includes('Офлайн-конверсии'),
      extraBlock: copy.includes('Сохранённые проверки и связанные настройки'),
      tableCount: row.querySelectorAll('.g2mu-payment-copy table').length,
      notNeededButton: Boolean(row.querySelector('[data-g2mu-review="not_needed"]')) };
  })()`);
  assert.deepEqual(paymentStep, { number: '3.1.3', fields: 0, originalTitle: true,
    csvTarget: true, offlineConversion: true, extraBlock: false, tableCount: 3,
    notNeededButton: true });
  assert.equal(await evaluate('G2MU_PAYMENT_MARKDOWN'), exactPaymentText);
  const callStep = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-step="s314"]');
    const copy = row.querySelector('.g2mu-call-copy')?.textContent || '';
    return { number: row.querySelector('.g2mu-number')?.textContent,
      fields: row.querySelectorAll('.g2mu-fields input, .g2mu-fields select, .g2mu-evidence input').length,
      originalTitle: copy.includes('3.1.4. Состоявшийся целевой звонок'),
      tracking: copy.includes('Динамический коллтрекинг'),
      qualification: copy.includes('Квалифицированный звонок'),
      extraBlock: copy.includes('Сохранённые проверки и связанные настройки'),
      tableCount: row.querySelectorAll('.g2mu-call-copy table').length,
      notNeededButton: Boolean(row.querySelector('[data-g2mu-review="not_needed"]')) };
  })()`);
  assert.deepEqual(callStep, { number: '3.1.4', fields: 0, originalTitle: true,
    tracking: true, qualification: true, extraBlock: false, tableCount: 3,
    notNeededButton: true });
  assert.equal(await evaluate('G2MU_CALL_MARKDOWN'), exactCallText);
  const bookingStep = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-step="s315"]');
    const copy = row.querySelector('.g2mu-booking-copy')?.textContent || '';
    return { number: row.querySelector('.g2mu-number')?.textContent,
      fields: row.querySelectorAll('.g2mu-fields input, .g2mu-fields select, .g2mu-evidence input').length,
      originalTitle: copy.includes('3.1.5. Подтверждённая запись'),
      yclients: copy.includes('YCLIENTS'),
      bookingConfirmed: copy.includes('booking_confirmed'),
      extraBlock: copy.includes('Сохранённые проверки и связанные настройки'),
      tableCount: row.querySelectorAll('.g2mu-booking-copy table').length,
      notNeededButton: Boolean(row.querySelector('[data-g2mu-review="not_needed"]')) };
  })()`);
  assert.deepEqual(bookingStep, { number: '3.1.5', fields: 0, originalTitle: true,
    yclients: true, bookingConfirmed: true, extraBlock: false, tableCount: 4,
    notNeededButton: true });
  assert.equal(await evaluate('G2MU_BOOKING_MARKDOWN'), exactBookingText);
  const registrationStep = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-step="s316"]');
    const copy = row.querySelector('.g2mu-registration-copy')?.textContent || '';
    return { number: row.querySelector('.g2mu-number')?.textContent,
      fields: row.querySelectorAll('.g2mu-fields input, .g2mu-fields select, .g2mu-evidence input').length,
      originalTitle: copy.includes('3.1.6. Успешная регистрация'),
      event: copy.includes('ym-register'),
      signup: copy.includes('/members/signup'),
      extraBlock: copy.includes('Сохранённые проверки и связанные настройки'),
      tableCount: row.querySelectorAll('.g2mu-registration-copy table').length,
      notNeededButton: Boolean(row.querySelector('[data-g2mu-review="not_needed"]')) };
  })()`);
  assert.deepEqual(registrationStep, { number: '3.1.6', fields: 0, originalTitle: true,
    event: true, signup: true, extraBlock: false, tableCount: 2,
    notNeededButton: true });
  assert.equal(await evaluate('G2MU_REGISTRATION_MARKDOWN'), exactRegistrationText);
  const popupLeadStep = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-step="s317"]');
    const copy = row.querySelector('.g2mu-popup-lead-copy')?.textContent || '';
    return { number: row.querySelector('.g2mu-number')?.textContent,
      fields: row.querySelectorAll('.g2mu-fields input, .g2mu-fields select, .g2mu-evidence input').length,
      originalTitle: copy.includes('3.1.7. Полученная заявка из окна (Pop-up)'),
      popupLink: copy.includes('#popup:myform'),
      confirmedGoal: copy.includes('679326353'),
      extraBlock: copy.includes('Сохранённые проверки и связанные настройки'),
      tableCount: row.querySelectorAll('.g2mu-popup-lead-copy table').length,
      notNeededButton: Boolean(row.querySelector('[data-g2mu-review="not_needed"]')) };
  })()`);
  assert.deepEqual(popupLeadStep, { number: '3.1.7', fields: 0, originalTitle: true,
    popupLink: true, confirmedGoal: true, extraBlock: false, tableCount: 7,
    notNeededButton: true });
  assert.equal(await evaluate('G2MU_POPUP_LEAD_MARKDOWN'), exactPopupLeadText);
  const addToCartStep = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-step="s321"]');
    const copy = row.querySelector('.g2mu-add-to-cart-copy')?.textContent || '';
    return { number: row.querySelector('.g2mu-number')?.textContent,
      fields: row.querySelectorAll('.g2mu-fields input, .g2mu-fields select, .g2mu-evidence input').length,
      originalTitle: copy.includes('3.2.1. Добавление товара в корзину'),
      ecommerce: copy.includes('Ecommerce: добавление в корзину'),
      st100: copy.includes('ST100'),
      extraBlock: copy.includes('Сохранённые проверки и связанные настройки'),
      tableCount: row.querySelectorAll('.g2mu-add-to-cart-copy table').length,
      notNeededButton: Boolean(row.querySelector('[data-g2mu-review="not_needed"]')) };
  })()`);
  assert.deepEqual(addToCartStep, { number: '3.2.1', fields: 0, originalTitle: true,
    ecommerce: true, st100: true, extraBlock: false, tableCount: 1,
    notNeededButton: true });
  assert.equal(await evaluate('G2MU_ADD_TO_CART_MARKDOWN'), exactAddToCartText);
  const phoneClickStep = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-step="s322"]');
    const copy = row.querySelector('.g2mu-phone-click-copy')?.textContent || '';
    return { number: row.querySelector('.g2mu-number')?.textContent,
      fields: row.querySelectorAll('.g2mu-fields input, .g2mu-fields select, .g2mu-evidence input').length,
      originalTitle: copy.includes('3.2.2. Клик по номеру телефона'),
      phoneLink: copy.includes('tel:+79169735736'),
      confirmedGoal: copy.includes('679332675'),
      extraBlock: copy.includes('Сохранённые проверки и связанные настройки'),
      tableCount: row.querySelectorAll('.g2mu-phone-click-copy table').length,
      notNeededButton: Boolean(row.querySelector('[data-g2mu-review="not_needed"]')) };
  })()`);
  assert.deepEqual(phoneClickStep, { number: '3.2.2', fields: 0, originalTitle: true,
    phoneLink: true, confirmedGoal: true, extraBlock: false, tableCount: 3,
    notNeededButton: true });
  assert.equal(await evaluate('G2MU_PHONE_CLICK_MARKDOWN'), exactPhoneClickText);
  assert.equal(await evaluate('G2MU_SITE_SEARCH_MARKDOWN'), exactSiteSearchText);
  const siteSearchStep = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-subsection="3.3"] [data-g2mu-step="s331"]');
    const copy = row.querySelector('.g2mu-site-search-copy')?.textContent || '';
    return { number: row.querySelector('.g2mu-number')?.textContent,
      fields: row.querySelectorAll('.g2mu-fields input, .g2mu-fields select, .g2mu-evidence input').length,
      originalTitle: copy.includes('3.3.1. Поиск по сайту'),
      measurementLimit: copy.includes('Полный учёт поисковых запросов не подтверждён'),
      notNeededButton: Boolean(row.querySelector('[data-g2mu-review="not_needed"]')) };
  })()`);
  assert.deepEqual(siteSearchStep, { number: '3.3.1', fields: 0, originalTitle: true,
    measurementLimit: true, notNeededButton: true });
  assert.equal(await evaluate('G2MU_KEY_SECTION_VISIT_MARKDOWN'), exactKeySectionVisitText);
  const keySectionVisitStep = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-subsection="3.3"] [data-g2mu-step="s332"]');
    const copy = row.querySelector('.g2mu-key-section-visit-copy')?.textContent || '';
    return { number: row.querySelector('.g2mu-number')?.textContent,
      fields: row.querySelectorAll('.g2mu-fields input, .g2mu-fields select, .g2mu-evidence input').length,
      originalTitle: copy.includes('3.3.2. Посещение ключевого раздела'),
      goalId: copy.includes('680134239'),
      pendingReport: copy.includes('На последней проверке данных ещё не было'),
      notNeededButton: Boolean(row.querySelector('[data-g2mu-review="not_needed"]')) };
  })()`);
  assert.deepEqual(keySectionVisitStep, { number: '3.3.2', fields: 0, originalTitle: true,
    goalId: true, pendingReport: true, notNeededButton: true });
  assert.equal(await evaluate('G2MU_MULTIPLE_PRODUCT_VIEWS_MARKDOWN'), exactMultipleProductViewsText);
  const multipleProductViewsStep = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-subsection="3.3"] [data-g2mu-step="s333"]');
    const copy = row.querySelector('.g2mu-multiple-product-views-copy')?.textContent || '';
    return { number: row.querySelector('.g2mu-number')?.textContent,
      fields: row.querySelectorAll('.g2mu-fields input, .g2mu-fields select, .g2mu-evidence input').length,
      originalTitle: copy.includes('3.3.3. Просмотр нескольких товаров'),
      ecommerce: copy.includes('Ecommerce'),
      limitation: copy.includes('число просмотров не равно числу уникальных товаров'),
      notNeededButton: Boolean(row.querySelector('[data-g2mu-review="not_needed"]')) };
  })()`);
  assert.deepEqual(multipleProductViewsStep, { number: '3.3.3', fields: 0, originalTitle: true,
    ecommerce: true, limitation: true, notNeededButton: true });
  assert.equal(await evaluate('G2MU_PAGEVIEW_COUNT_MARKDOWN'), exactPageviewCountText);
  const pageviewCountStep = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-subsection="3.3"] [data-g2mu-step="s334"]');
    const copy = row.querySelector('.g2mu-pageview-count-copy')?.textContent || '';
    return { number: row.querySelector('.g2mu-number')?.textContent,
      fields: row.querySelectorAll('.g2mu-fields input, .g2mu-fields select, .g2mu-evidence input').length,
      originalTitle: copy.includes('3.3.4. Количество просмотров страниц'),
      thresholdRule: copy.includes('порог определяем по фактической статистике проекта'),
      projectDecision: copy.includes('Пока не создаём цель с произвольным порогом'),
      notNeededButton: Boolean(row.querySelector('[data-g2mu-review="not_needed"]')) };
  })()`);
  assert.deepEqual(pageviewCountStep, { number: '3.3.4', fields: 0, originalTitle: true,
    thresholdRule: true, projectDecision: true, notNeededButton: true });
  assert.equal(await evaluate('G2MU_VISIT_DURATION_MARKDOWN'), exactVisitDurationText);
  const visitDurationStep = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-subsection="3.3"] [data-g2mu-step="s335"]');
    const copy = row.querySelector('.g2mu-visit-duration-copy')?.textContent || '';
    return { number: row.querySelector('.g2mu-number')?.textContent,
      fields: row.querySelectorAll('.g2mu-fields input, .g2mu-fields select, .g2mu-evidence input').length,
      originalTitle: copy.includes('3.3.5. Продолжительность визита'),
      thresholdRule: copy.includes('порог времени выбираем на основе фактических данных проекта'),
      projectDecision: copy.includes('Порог времени пока не устанавливаем'),
      notNeededButton: Boolean(row.querySelector('[data-g2mu-review="not_needed"]')) };
  })()`);
  assert.deepEqual(visitDurationStep, { number: '3.3.5', fields: 0, originalTitle: true,
    thresholdRule: true, projectDecision: true, notNeededButton: true });
  assert.equal(await evaluate('G2MU_CONTENT_ANALYTICS_MARKDOWN'), exactContentAnalyticsText);
  const contentAnalyticsStep = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-section="4"] [data-g2mu-step="s4content"]');
    const copy = row.querySelector('.g2mu-content-analytics-copy')?.textContent || '';
    return { number: row.querySelector('.g2mu-number')?.textContent,
      fields: row.querySelectorAll('.g2mu-fields input, .g2mu-fields select, .g2mu-evidence input').length,
      originalTitle: copy.includes('4.1. Контентная аналитика'),
      jsonLd: copy.includes('Schema.org JSON-LD'),
      noExtraGoals: copy.includes('Контентная аналитика не требует создания дополнительных конверсионных целей'),
      notNeededButton: Boolean(row.querySelector('[data-g2mu-review="not_needed"]')),
      oldRows: document.querySelectorAll('[data-g2mu-step="s41"], [data-g2mu-step="s51"], [data-g2mu-step="s52"]').length };
  })()`);
  assert.deepEqual(contentAnalyticsStep, { number: '4.1', fields: 0, originalTitle: true,
    jsonLd: true, noExtraGoals: true, notNeededButton: true, oldRows: 0 });
  assert.equal(await evaluate('G2MU_TAG_MANAGER_MARKDOWN'), exactTagManagerText);
  const tagManagerStep = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-section="4"] [data-g2mu-step="s4tags"]');
    const copy = row.querySelector('.g2mu-tag-manager-copy')?.textContent || '';
    return { number: row.querySelector('.g2mu-number')?.textContent,
      fields: row.querySelectorAll('.g2mu-fields input, .g2mu-fields select, .g2mu-evidence input').length,
      originalTitle: copy.includes('4.2. Яндекс Тег Менеджер'),
      duplicateRule: copy.includes('не требуется второй счётчик'),
      reviewBeforePublish: copy.includes('Проверить тег перед публикацией'),
      notNeededButton: Boolean(row.querySelector('[data-g2mu-review="not_needed"]')) };
  })()`);
  assert.deepEqual(tagManagerStep, { number: '4.2', fields: 0, originalTitle: true,
    duplicateRule: true, reviewBeforePublish: true, notNeededButton: true });
  const orderReview = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-step="s311"]');
    const beforeGoal = JSON.stringify(g2MetrikaCompanyDataV374('goals').primaryGoal);
    row.querySelector('[data-g2mu-review="pending"]').click();
    const pending = g2muStatus('s311');
    row.querySelector('[data-g2mu-review="passed"]').click();
    const ready = g2muStatus('s311');
    row.querySelector('.g2mu-step-marker').click();
    const reset = g2muStatus('s311');
    return { pending, ready, reset,
      goalUnchanged: beforeGoal === JSON.stringify(g2MetrikaCompanyDataV374('goals').primaryGoal) };
  })()`);
  assert.deepEqual(orderReview, { pending: 'needs_check', ready: 'ready', reset: 'not_started', goalUnchanged: true });
  const leadReview = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-step="s312"]');
    const beforeDecision = g2MetrikaCompanyDataV374('counter').ecommerceApplicability;
    row.querySelector('[data-g2mu-review="pending"]').click();
    const pending = g2muStatus('s312');
    row.querySelector('[data-g2mu-review="passed"]').click();
    const ready = g2muStatus('s312');
    row.querySelector('.g2mu-step-marker').click();
    const reset = g2muStatus('s312');
    row.querySelector('[data-g2mu-review="not_needed"]').click();
    return { pending, ready, reset, notNeeded: g2muStatus('s312'),
      decisionUnchanged: beforeDecision === g2MetrikaCompanyDataV374('counter').ecommerceApplicability };
  })()`);
  assert.deepEqual(leadReview, { pending: 'needs_check', ready: 'ready', reset: 'not_started',
    notNeeded: 'not_needed', decisionUnchanged: true });
  const paymentReview = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-step="s313"]');
    const beforeDecision = g2MetrikaCompanyDataV374('counter').ecommerceApplicability;
    row.querySelector('[data-g2mu-review="pending"]').click();
    const pending = g2muStatus('s313');
    row.querySelector('[data-g2mu-review="passed"]').click();
    const ready = g2muStatus('s313');
    row.querySelector('.g2mu-step-marker').click();
    const reset = g2muStatus('s313');
    row.querySelector('[data-g2mu-review="not_needed"]').click();
    return { pending, ready, reset, notNeeded: g2muStatus('s313'),
      decisionUnchanged: beforeDecision === g2MetrikaCompanyDataV374('counter').ecommerceApplicability };
  })()`);
  assert.deepEqual(paymentReview, { pending: 'needs_check', ready: 'ready', reset: 'not_started',
    notNeeded: 'not_needed', decisionUnchanged: true });
  const callReview = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-step="s314"]');
    const beforeDecision = g2MetrikaCompanyDataV374('counter').ecommerceApplicability;
    row.querySelector('[data-g2mu-review="pending"]').click();
    const pending = g2muStatus('s314');
    row.querySelector('[data-g2mu-review="passed"]').click();
    const ready = g2muStatus('s314');
    row.querySelector('.g2mu-step-marker').click();
    const reset = g2muStatus('s314');
    row.querySelector('[data-g2mu-review="not_needed"]').click();
    return { pending, ready, reset, notNeeded: g2muStatus('s314'),
      decisionUnchanged: beforeDecision === g2MetrikaCompanyDataV374('counter').ecommerceApplicability };
  })()`);
  assert.deepEqual(callReview, { pending: 'needs_check', ready: 'ready', reset: 'not_started',
    notNeeded: 'not_needed', decisionUnchanged: true });
  const bookingReview = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-step="s315"]');
    const beforeDecision = g2MetrikaCompanyDataV374('counter').ecommerceApplicability;
    row.querySelector('[data-g2mu-review="pending"]').click();
    const pending = g2muStatus('s315');
    row.querySelector('[data-g2mu-review="passed"]').click();
    const ready = g2muStatus('s315');
    row.querySelector('.g2mu-step-marker').click();
    const reset = g2muStatus('s315');
    row.querySelector('[data-g2mu-review="not_needed"]').click();
    return { pending, ready, reset, notNeeded: g2muStatus('s315'),
      decisionUnchanged: beforeDecision === g2MetrikaCompanyDataV374('counter').ecommerceApplicability };
  })()`);
  assert.deepEqual(bookingReview, { pending: 'needs_check', ready: 'ready', reset: 'not_started',
    notNeeded: 'not_needed', decisionUnchanged: true });
  const registrationReview = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-step="s316"]');
    const beforeDecision = g2MetrikaCompanyDataV374('counter').ecommerceApplicability;
    row.querySelector('[data-g2mu-review="pending"]').click();
    const pending = g2muStatus('s316');
    row.querySelector('[data-g2mu-review="passed"]').click();
    const ready = g2muStatus('s316');
    row.querySelector('.g2mu-step-marker').click();
    const reset = g2muStatus('s316');
    row.querySelector('[data-g2mu-review="not_needed"]').click();
    return { pending, ready, reset, notNeeded: g2muStatus('s316'),
      decisionUnchanged: beforeDecision === g2MetrikaCompanyDataV374('counter').ecommerceApplicability };
  })()`);
  assert.deepEqual(registrationReview, { pending: 'needs_check', ready: 'ready', reset: 'not_started',
    notNeeded: 'not_needed', decisionUnchanged: true });
  const popupLeadReview = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-step="s317"]');
    const beforeDecision = g2MetrikaCompanyDataV374('counter').ecommerceApplicability;
    row.querySelector('[data-g2mu-review="pending"]').click();
    const pending = g2muStatus('s317');
    row.querySelector('[data-g2mu-review="passed"]').click();
    const ready = g2muStatus('s317');
    row.querySelector('.g2mu-step-marker').click();
    const reset = g2muStatus('s317');
    row.querySelector('[data-g2mu-review="not_needed"]').click();
    return { pending, ready, reset, notNeeded: g2muStatus('s317'),
      decisionUnchanged: beforeDecision === g2MetrikaCompanyDataV374('counter').ecommerceApplicability };
  })()`);
  assert.deepEqual(popupLeadReview, { pending: 'needs_check', ready: 'ready', reset: 'not_started',
    notNeeded: 'not_needed', decisionUnchanged: true });
  const addToCartReview = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-step="s321"]');
    const beforeDecision = g2MetrikaCompanyDataV374('counter').ecommerceApplicability;
    row.querySelector('[data-g2mu-review="pending"]').click();
    const pending = g2muStatus('s321');
    row.querySelector('[data-g2mu-review="passed"]').click();
    const ready = g2muStatus('s321');
    row.querySelector('.g2mu-step-marker').click();
    const reset = g2muStatus('s321');
    row.querySelector('[data-g2mu-review="not_needed"]').click();
    return { pending, ready, reset, notNeeded: g2muStatus('s321'),
      decisionUnchanged: beforeDecision === g2MetrikaCompanyDataV374('counter').ecommerceApplicability };
  })()`);
  assert.deepEqual(addToCartReview, { pending: 'needs_check', ready: 'ready', reset: 'not_started',
    notNeeded: 'not_needed', decisionUnchanged: true });
  const phoneClickReview = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-step="s322"]');
    const beforeDecision = g2MetrikaCompanyDataV374('counter').ecommerceApplicability;
    row.querySelector('[data-g2mu-review="pending"]').click();
    const pending = g2muStatus('s322');
    row.querySelector('[data-g2mu-review="passed"]').click();
    const ready = g2muStatus('s322');
    row.querySelector('.g2mu-step-marker').click();
    const reset = g2muStatus('s322');
    row.querySelector('[data-g2mu-review="not_needed"]').click();
    return { pending, ready, reset, notNeeded: g2muStatus('s322'),
      decisionUnchanged: beforeDecision === g2MetrikaCompanyDataV374('counter').ecommerceApplicability };
  })()`);
  assert.deepEqual(phoneClickReview, { pending: 'needs_check', ready: 'ready', reset: 'not_started',
    notNeeded: 'not_needed', decisionUnchanged: true });
  assert.deepEqual(guideCheck.goalData, initial.goals);
  assert.equal(guideCheck.wizardCounterStatus, guideCheck.sourceCounterStatus);
  const click = await evaluate(`(() => {
    const row = document.querySelector('[data-g2mu-step="s12"]');
    const marker = row.querySelector('.g2mu-step-marker');
    const before = g2muStatus('s12');
    marker.click();
    const after = g2muStatus('s12');
    const pressed = marker.getAttribute('aria-pressed');
    marker.click();
    const reset = g2muStatus('s12');
    const idAfterReset = g2MetrikaCompanyCounterV374();
    marker.click();
    return { before, after, pressed, reset, idAfterReset, restored: g2muStatus('s12'),
      id: g2MetrikaCompanyCounterV374(), stored: Boolean(g2muReview().s12),
      marker: marker.textContent, history: g2muReview().s12.history?.length || 0 };
  })()`);
  assert.equal(click.before, 'recheck'); assert.equal(click.after, 'ready');
  assert.equal(click.pressed, 'true'); assert.equal(click.reset, 'recheck');
  assert.equal(click.idAfterReset, '105213127'); assert.equal(click.restored, 'ready');
  assert.equal(click.marker, '✓'); assert(click.history >= 1); assert.equal(click.id, '105213127');
  const reload = await evaluate(`(() => { renderGate(); return { id: g2MetrikaCompanyCounterV374(), status: g2muStatus('s12'), sections: document.querySelectorAll('[data-g2mu-section]').length }; })()`);
  assert.deepEqual(reload, { id: '105213127', status: 'ready', sections: 4 });
  const stale = await evaluate(`(() => {
    const field = document.querySelector('[data-g2mu-step="s12"] [data-g2-mc-field="counterId"]');
    field.value = '105213128'; field.dispatchEvent(new Event('input', { bubbles: true }));
    const afterEdit = g2muStatus('s12');
    const markerAfterEdit = document.querySelector('[data-g2mu-step="s12"] .g2mu-step-marker').getAttribute('aria-pressed');
    field.value = '105213127'; field.dispatchEvent(new Event('input', { bubbles: true }));
    const restored = g2muStatus('s12');
    document.querySelector('[data-g2mu-step="s12"] [data-g2mu-review="passed"]').click();
    return { afterEdit, markerAfterEdit, restored, afterRecheck: g2muStatus('s12'), history: g2muReview().s12.history?.length || 0 };
  })()`);
  assert.equal(stale.afterEdit, 'recheck'); assert.equal(stale.restored, 'recheck');
  assert.equal(stale.markerAfterEdit, 'false');
  assert.equal(stale.afterRecheck, 'ready'); assert(stale.history >= 3);
  const screenshots = [];
  for (const width of [1440, 390]) {
    await page.call('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 1250 : 900, deviceScaleFactor: 1, mobile: width === 390 });
    const metrics = await evaluate(`(() => {
      const root = document.querySelector('[data-g2y-company]'); root.open = true;
      const block = root.querySelector('[data-g2mu-block]'); block.open = true;
      block.scrollIntoView({block:'start'});
      const first = block.querySelector('[data-g2mu-section="1"]'); first.open = true;
      const all = [...block.querySelectorAll('[data-g2mu-section]')]; all.slice(1).forEach(section => section.open = false);
      return { viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
        blockWidth: block.getBoundingClientRect().width, firstHeight: first.getBoundingClientRect().height };
    })()`);
    assert(metrics.scrollWidth <= metrics.viewport + 1, `horizontal overflow at ${width}: ${JSON.stringify(metrics)}`);
    const screenshot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const path = `${folder}/metrika-${width}.png`;
    writeFileSync(path, Buffer.from(screenshot.data, 'base64'));
    screenshots.push({ path, metrics });
    await evaluate(`(() => {
      const block = document.querySelector('[data-g2mu-block]');
      block.querySelectorAll('[data-g2mu-section]').forEach(section => section.open = false);
      block.scrollIntoView({block:'start'});
    })()`);
    const overview = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const overviewPath = `${folder}/metrika-overview-${width}.png`;
    writeFileSync(overviewPath, Buffer.from(overview.data, 'base64'));
    screenshots.push({ path: overviewPath });
    const orderMetrics = await evaluate(`(() => {
      const block = document.querySelector('[data-g2mu-block]'); block.open = true;
      const section = block.querySelector('[data-g2mu-section="3"]'); section.open = true;
      section.querySelector('.g2mu-guide').open = true;
      section.scrollIntoView({block:'start'});
      return { viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
        orderNumber: section.querySelector('.g2mu-number')?.textContent,
        guideOpen: section.querySelector('.g2mu-guide')?.open };
    })()`);
    assert(orderMetrics.scrollWidth <= orderMetrics.viewport + 1, `order horizontal overflow at ${width}: ${JSON.stringify(orderMetrics)}`);
    assert.equal(orderMetrics.orderNumber, '3.1.1'); assert.equal(orderMetrics.guideOpen, true);
    const orderShot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const orderPath = `${folder}/metrika-order-${width}.png`;
    writeFileSync(orderPath, Buffer.from(orderShot.data, 'base64'));
    screenshots.push({ path: orderPath, metrics: orderMetrics });
    const leadMetrics = await evaluate(`(() => {
      const row = document.querySelector('[data-g2mu-step="s312"]');
      row.querySelector('.g2mu-guide').open = true;
      row.scrollIntoView({block:'start'});
      return { viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
        leadNumber: row.querySelector('.g2mu-number')?.textContent,
        guideOpen: row.querySelector('.g2mu-guide')?.open };
    })()`);
    assert(leadMetrics.scrollWidth <= leadMetrics.viewport + 1,
      `lead horizontal overflow at ${width}: ${JSON.stringify(leadMetrics)}`);
    assert.equal(leadMetrics.leadNumber, '3.1.2'); assert.equal(leadMetrics.guideOpen, true);
    const leadShot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const leadPath = `${folder}/metrika-lead-${width}.png`;
    writeFileSync(leadPath, Buffer.from(leadShot.data, 'base64'));
    screenshots.push({ path: leadPath, metrics: leadMetrics });
    const paymentMetrics = await evaluate(`(() => {
      const row = document.querySelector('[data-g2mu-step="s313"]');
      row.querySelector('.g2mu-guide').open = true;
      row.scrollIntoView({block:'start'});
      return { viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
        paymentNumber: row.querySelector('.g2mu-number')?.textContent,
        guideOpen: row.querySelector('.g2mu-guide')?.open };
    })()`);
    assert(paymentMetrics.scrollWidth <= paymentMetrics.viewport + 1,
      `payment horizontal overflow at ${width}: ${JSON.stringify(paymentMetrics)}`);
    assert.equal(paymentMetrics.paymentNumber, '3.1.3'); assert.equal(paymentMetrics.guideOpen, true);
    const paymentShot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const paymentPath = `${folder}/metrika-payment-${width}.png`;
    writeFileSync(paymentPath, Buffer.from(paymentShot.data, 'base64'));
    screenshots.push({ path: paymentPath, metrics: paymentMetrics });
    const callMetrics = await evaluate(`(() => {
      const row = document.querySelector('[data-g2mu-step="s314"]');
      row.querySelector('.g2mu-guide').open = true;
      row.scrollIntoView({block:'start'});
      return { viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
        callNumber: row.querySelector('.g2mu-number')?.textContent,
        guideOpen: row.querySelector('.g2mu-guide')?.open };
    })()`);
    assert(callMetrics.scrollWidth <= callMetrics.viewport + 1,
      `call horizontal overflow at ${width}: ${JSON.stringify(callMetrics)}`);
    assert.equal(callMetrics.callNumber, '3.1.4'); assert.equal(callMetrics.guideOpen, true);
    const callShot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const callPath = `${folder}/metrika-call-${width}.png`;
    writeFileSync(callPath, Buffer.from(callShot.data, 'base64'));
    screenshots.push({ path: callPath, metrics: callMetrics });
    const bookingMetrics = await evaluate(`(() => {
      const row = document.querySelector('[data-g2mu-step="s315"]');
      row.querySelector('.g2mu-guide').open = true;
      row.scrollIntoView({block:'start'});
      return { viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
        bookingNumber: row.querySelector('.g2mu-number')?.textContent,
        guideOpen: row.querySelector('.g2mu-guide')?.open };
    })()`);
    assert(bookingMetrics.scrollWidth <= bookingMetrics.viewport + 1,
      `booking horizontal overflow at ${width}: ${JSON.stringify(bookingMetrics)}`);
    assert.equal(bookingMetrics.bookingNumber, '3.1.5'); assert.equal(bookingMetrics.guideOpen, true);
    const bookingShot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const bookingPath = `${folder}/metrika-booking-${width}.png`;
    writeFileSync(bookingPath, Buffer.from(bookingShot.data, 'base64'));
    screenshots.push({ path: bookingPath, metrics: bookingMetrics });
    const registrationMetrics = await evaluate(`(() => {
      const row = document.querySelector('[data-g2mu-step="s316"]');
      row.querySelector('.g2mu-guide').open = true;
      row.scrollIntoView({block:'start'});
      return { viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
        registrationNumber: row.querySelector('.g2mu-number')?.textContent,
        guideOpen: row.querySelector('.g2mu-guide')?.open };
    })()`);
    assert(registrationMetrics.scrollWidth <= registrationMetrics.viewport + 1,
      `registration horizontal overflow at ${width}: ${JSON.stringify(registrationMetrics)}`);
    assert.equal(registrationMetrics.registrationNumber, '3.1.6'); assert.equal(registrationMetrics.guideOpen, true);
    const registrationShot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const registrationPath = `${folder}/metrika-registration-${width}.png`;
    writeFileSync(registrationPath, Buffer.from(registrationShot.data, 'base64'));
    screenshots.push({ path: registrationPath, metrics: registrationMetrics });
    const popupLeadMetrics = await evaluate(`(() => {
      const row = document.querySelector('[data-g2mu-step="s317"]');
      row.querySelector('.g2mu-guide').open = true;
      row.scrollIntoView({block:'start'});
      return { viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
        popupLeadNumber: row.querySelector('.g2mu-number')?.textContent,
        guideOpen: row.querySelector('.g2mu-guide')?.open };
    })()`);
    assert(popupLeadMetrics.scrollWidth <= popupLeadMetrics.viewport + 1,
      `popup lead horizontal overflow at ${width}: ${JSON.stringify(popupLeadMetrics)}`);
    assert.equal(popupLeadMetrics.popupLeadNumber, '3.1.7'); assert.equal(popupLeadMetrics.guideOpen, true);
    const popupLeadShot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const popupLeadPath = `${folder}/metrika-popup-lead-${width}.png`;
    writeFileSync(popupLeadPath, Buffer.from(popupLeadShot.data, 'base64'));
    screenshots.push({ path: popupLeadPath, metrics: popupLeadMetrics });
    const nextSubsection = await evaluate(`(() => {
      const heading = document.querySelector('[data-g2mu-subsection="3.2"] > h5');
      heading.scrollIntoView({block:'center'});
      return { text: heading.textContent, viewport: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth };
    })()`);
    assert.equal(nextSubsection.text, '3.2. Промежуточные конверсии');
    assert(nextSubsection.scrollWidth <= nextSubsection.viewport + 1);
    const nextShot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const nextPath = `${folder}/metrika-next-subsection-${width}.png`;
    writeFileSync(nextPath, Buffer.from(nextShot.data, 'base64'));
    screenshots.push({ path: nextPath, metrics: nextSubsection });
    const addToCartMetrics = await evaluate(`(() => {
      const row = document.querySelector('[data-g2mu-step="s321"]');
      row.querySelector('.g2mu-guide').open = true;
      row.scrollIntoView({block:'start'});
      return { viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
        addToCartNumber: row.querySelector('.g2mu-number')?.textContent,
        guideOpen: row.querySelector('.g2mu-guide')?.open };
    })()`);
    assert(addToCartMetrics.scrollWidth <= addToCartMetrics.viewport + 1,
      `add to cart horizontal overflow at ${width}: ${JSON.stringify(addToCartMetrics)}`);
    assert.equal(addToCartMetrics.addToCartNumber, '3.2.1'); assert.equal(addToCartMetrics.guideOpen, true);
    const addToCartShot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const addToCartPath = `${folder}/metrika-add-to-cart-${width}.png`;
    writeFileSync(addToCartPath, Buffer.from(addToCartShot.data, 'base64'));
    screenshots.push({ path: addToCartPath, metrics: addToCartMetrics });
    const phoneClickMetrics = await evaluate(`(() => {
      const row = document.querySelector('[data-g2mu-step="s322"]');
      row.querySelector('.g2mu-guide').open = true;
      row.scrollIntoView({block:'start'});
      return { viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
        phoneClickNumber: row.querySelector('.g2mu-number')?.textContent,
        guideOpen: row.querySelector('.g2mu-guide')?.open };
    })()`);
    assert(phoneClickMetrics.scrollWidth <= phoneClickMetrics.viewport + 1,
      `phone click horizontal overflow at ${width}: ${JSON.stringify(phoneClickMetrics)}`);
    assert.equal(phoneClickMetrics.phoneClickNumber, '3.2.2'); assert.equal(phoneClickMetrics.guideOpen, true);
    const phoneClickShot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const phoneClickPath = `${folder}/metrika-phone-click-${width}.png`;
    writeFileSync(phoneClickPath, Buffer.from(phoneClickShot.data, 'base64'));
    screenshots.push({ path: phoneClickPath, metrics: phoneClickMetrics });
    const siteSearchMetrics = await evaluate(`(() => {
      const row = document.querySelector('[data-g2mu-step="s331"]');
      row.querySelector('.g2mu-guide').open = true;
      row.scrollIntoView({block:'start'});
      return { viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
        siteSearchNumber: row.querySelector('.g2mu-number')?.textContent,
        guideOpen: row.querySelector('.g2mu-guide')?.open };
    })()`);
    assert(siteSearchMetrics.scrollWidth <= siteSearchMetrics.viewport + 1,
      `site search horizontal overflow at ${width}: ${JSON.stringify(siteSearchMetrics)}`);
    assert.equal(siteSearchMetrics.siteSearchNumber, '3.3.1'); assert.equal(siteSearchMetrics.guideOpen, true);
    const siteSearchShot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const siteSearchPath = `${folder}/metrika-site-search-${width}.png`;
    writeFileSync(siteSearchPath, Buffer.from(siteSearchShot.data, 'base64'));
    screenshots.push({ path: siteSearchPath, metrics: siteSearchMetrics });
    const keySectionVisitMetrics = await evaluate(`(() => {
      const row = document.querySelector('[data-g2mu-step="s332"]');
      row.querySelector('.g2mu-guide').open = true;
      row.scrollIntoView({block:'start'});
      return { viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
        keySectionVisitNumber: row.querySelector('.g2mu-number')?.textContent,
        guideOpen: row.querySelector('.g2mu-guide')?.open };
    })()`);
    assert(keySectionVisitMetrics.scrollWidth <= keySectionVisitMetrics.viewport + 1,
      `key section visit horizontal overflow at ${width}: ${JSON.stringify(keySectionVisitMetrics)}`);
    assert.equal(keySectionVisitMetrics.keySectionVisitNumber, '3.3.2'); assert.equal(keySectionVisitMetrics.guideOpen, true);
    const keySectionVisitShot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const keySectionVisitPath = `${folder}/metrika-key-section-visit-${width}.png`;
    writeFileSync(keySectionVisitPath, Buffer.from(keySectionVisitShot.data, 'base64'));
    screenshots.push({ path: keySectionVisitPath, metrics: keySectionVisitMetrics });
    const multipleProductViewsMetrics = await evaluate(`(() => {
      const row = document.querySelector('[data-g2mu-step="s333"]');
      row.querySelector('.g2mu-guide').open = true;
      row.scrollIntoView({block:'start'});
      return { viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
        multipleProductViewsNumber: row.querySelector('.g2mu-number')?.textContent,
        guideOpen: row.querySelector('.g2mu-guide')?.open };
    })()`);
    assert(multipleProductViewsMetrics.scrollWidth <= multipleProductViewsMetrics.viewport + 1,
      `multiple product views horizontal overflow at ${width}: ${JSON.stringify(multipleProductViewsMetrics)}`);
    assert.equal(multipleProductViewsMetrics.multipleProductViewsNumber, '3.3.3'); assert.equal(multipleProductViewsMetrics.guideOpen, true);
    const multipleProductViewsShot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const multipleProductViewsPath = `${folder}/metrika-multiple-product-views-${width}.png`;
    writeFileSync(multipleProductViewsPath, Buffer.from(multipleProductViewsShot.data, 'base64'));
    screenshots.push({ path: multipleProductViewsPath, metrics: multipleProductViewsMetrics });
    const pageviewCountMetrics = await evaluate(`(() => {
      const row = document.querySelector('[data-g2mu-step="s334"]');
      row.querySelector('.g2mu-guide').open = true;
      row.scrollIntoView({block:'start'});
      return { viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
        pageviewCountNumber: row.querySelector('.g2mu-number')?.textContent,
        guideOpen: row.querySelector('.g2mu-guide')?.open };
    })()`);
    assert(pageviewCountMetrics.scrollWidth <= pageviewCountMetrics.viewport + 1,
      `pageview count horizontal overflow at ${width}: ${JSON.stringify(pageviewCountMetrics)}`);
    assert.equal(pageviewCountMetrics.pageviewCountNumber, '3.3.4'); assert.equal(pageviewCountMetrics.guideOpen, true);
    const pageviewCountShot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const pageviewCountPath = `${folder}/metrika-pageview-count-${width}.png`;
    writeFileSync(pageviewCountPath, Buffer.from(pageviewCountShot.data, 'base64'));
    screenshots.push({ path: pageviewCountPath, metrics: pageviewCountMetrics });
    const visitDurationMetrics = await evaluate(`(() => {
      const row = document.querySelector('[data-g2mu-step="s335"]');
      row.querySelector('.g2mu-guide').open = true;
      row.scrollIntoView({block:'start'});
      return { viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
        visitDurationNumber: row.querySelector('.g2mu-number')?.textContent,
        guideOpen: row.querySelector('.g2mu-guide')?.open };
    })()`);
    assert(visitDurationMetrics.scrollWidth <= visitDurationMetrics.viewport + 1,
      `visit duration horizontal overflow at ${width}: ${JSON.stringify(visitDurationMetrics)}`);
    assert.equal(visitDurationMetrics.visitDurationNumber, '3.3.5'); assert.equal(visitDurationMetrics.guideOpen, true);
    const visitDurationShot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const visitDurationPath = `${folder}/metrika-visit-duration-${width}.png`;
    writeFileSync(visitDurationPath, Buffer.from(visitDurationShot.data, 'base64'));
    screenshots.push({ path: visitDurationPath, metrics: visitDurationMetrics });
    const contentAnalyticsMetrics = await evaluate(`(() => {
      const row = document.querySelector('[data-g2mu-step="s4content"]');
      row.closest('[data-g2mu-section="4"]').open = true;
      row.querySelector('.g2mu-guide').open = true;
      row.scrollIntoView({block:'start'});
      return { viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
        contentAnalyticsNumber: row.querySelector('.g2mu-number')?.textContent,
        guideOpen: row.querySelector('.g2mu-guide')?.open,
        visible: row.getBoundingClientRect().height > 0 };
    })()`);
    assert(contentAnalyticsMetrics.scrollWidth <= contentAnalyticsMetrics.viewport + 1,
      `content analytics horizontal overflow at ${width}: ${JSON.stringify(contentAnalyticsMetrics)}`);
    assert.equal(contentAnalyticsMetrics.contentAnalyticsNumber, '4.1');
    assert.equal(contentAnalyticsMetrics.guideOpen, true); assert.equal(contentAnalyticsMetrics.visible, true);
    const contentAnalyticsShot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const contentAnalyticsPath = `${folder}/metrika-content-analytics-${width}.png`;
    writeFileSync(contentAnalyticsPath, Buffer.from(contentAnalyticsShot.data, 'base64'));
    screenshots.push({ path: contentAnalyticsPath, metrics: contentAnalyticsMetrics });
    const tagManagerMetrics = await evaluate(`(() => {
      const row = document.querySelector('[data-g2mu-step="s4tags"]');
      row.closest('[data-g2mu-section="4"]').open = true;
      row.querySelector('.g2mu-guide').open = true;
      row.scrollIntoView({block:'start'});
      return { viewport: window.innerWidth, scrollWidth: document.documentElement.scrollWidth,
        tagManagerNumber: row.querySelector('.g2mu-number')?.textContent,
        guideOpen: row.querySelector('.g2mu-guide')?.open,
        visible: row.getBoundingClientRect().height > 0 };
    })()`);
    assert(tagManagerMetrics.scrollWidth <= tagManagerMetrics.viewport + 1,
      `tag manager horizontal overflow at ${width}: ${JSON.stringify(tagManagerMetrics)}`);
    assert.equal(tagManagerMetrics.tagManagerNumber, '4.2');
    assert.equal(tagManagerMetrics.guideOpen, true); assert.equal(tagManagerMetrics.visible, true);
    const tagManagerShot = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    const tagManagerPath = `${folder}/metrika-tag-manager-${width}.png`;
    writeFileSync(tagManagerPath, Buffer.from(tagManagerShot.data, 'base64'));
    screenshots.push({ path: tagManagerPath, metrics: tagManagerMetrics });
  }
  await new Promise(resolve => setTimeout(resolve, 650));
  const beforeReloadOrigin = await evaluate('performance.timeOrigin');
  await page.call('Page.reload', { ignoreCache: true });
  let reopenedReady = false;
  for (let i = 0; i < 500; i++) {
    if (await evaluate(`performance.timeOrigin !== ${beforeReloadOrigin} && document.readyState === "complete" && typeof openProject === "function" && typeof rememberAccessUnlocked === "function"`)) { reopenedReady = true; break; }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!reopenedReady) console.log('reload-diagnostic', await evaluate('({url:location.href,title:document.title,ready:document.readyState,body:document.body?.innerText.slice(0,180),open:typeof openProject,access:typeof rememberAccessUnlocked})'), page.errors.slice(-3));
  assert.equal(reopenedReady, true, 'app must load after browser reload');
  const persistence = await evaluate(`(async () => {
    rememberAccessUnlocked(); setAccessState(true);
    await openProject('gate2-metrika-isolated');
    activeView = 'gate'; activeGateId = 'gate-2'; renderGate();
    return { id: g2MetrikaCompanyCounterV374(), status: g2muStatus('s12'),
      goalData: g2MetrikaCompanyGoalsV374().map(goal => [goal.entryId, goal.name, goal.goalId]),
      leadReview: g2muReview().s312?.result, leadStatus: g2muStatus('s312'),
      paymentReview: g2muReview().s313?.result, paymentStatus: g2muStatus('s313'),
      callReview: g2muReview().s314?.result, callStatus: g2muStatus('s314'),
      bookingReview: g2muReview().s315?.result, bookingStatus: g2muStatus('s315'),
      registrationReview: g2muReview().s316?.result, registrationStatus: g2muStatus('s316'),
      popupLeadReview: g2muReview().s317?.result, popupLeadStatus: g2muStatus('s317'),
      addToCartReview: g2muReview().s321?.result, addToCartStatus: g2muStatus('s321'),
      phoneClickReview: g2muReview().s322?.result, phoneClickStatus: g2muStatus('s322'),
      blockCount: document.querySelectorAll('[data-g2mu-block]').length };
  })()`);
  assert.equal(persistence.id, '105213127'); assert.equal(persistence.status, 'ready');
  assert.equal(persistence.leadReview, 'stale'); assert.equal(persistence.leadStatus, 'recheck');
  assert.equal(persistence.paymentReview, 'stale'); assert.equal(persistence.paymentStatus, 'recheck');
  assert.equal(persistence.callReview, 'stale'); assert.equal(persistence.callStatus, 'recheck');
  assert.equal(persistence.bookingReview, 'stale'); assert.equal(persistence.bookingStatus, 'recheck');
  assert.equal(persistence.registrationReview, 'stale'); assert.equal(persistence.registrationStatus, 'recheck');
  assert.equal(persistence.popupLeadReview, 'stale'); assert.equal(persistence.popupLeadStatus, 'recheck');
  assert.equal(persistence.addToCartReview, 'stale'); assert.equal(persistence.addToCartStatus, 'recheck');
  assert.equal(persistence.phoneClickReview, 'stale'); assert.equal(persistence.phoneClickStatus, 'recheck');
  assert.deepEqual(persistence.goalData, initial.goals); assert.equal(persistence.blockCount, 1);
  const navigation = await evaluate(`(() => {
    location.hash = '#g2-metrika-company-goals'; g2wOpenHash();
    const target = document.getElementById('g2-metrika-company-goals');
    return { found: Boolean(target), groupOpen: target?.closest('[data-g2y-company]')?.open,
      blockOpen: target?.closest('[data-g2mu-block]')?.open,
      sectionOpen: target?.closest('[data-g2mu-section]')?.open,
      productCounter: g2wCompanyValue('counterId'),
      productGoal: g2wCompanyValue('goalId') };
  })()`);
  assert.equal(navigation.found, true); assert.equal(navigation.groupOpen, true);
  assert.equal(navigation.blockOpen, true); assert.equal(navigation.sectionOpen, true);
  assert.equal(navigation.productCounter, persistence.id);
  const switchProject = await evaluate(`(async () => {
    const savedId = activeProjectId;
    const otherId = 'gate2-metrika-other-isolated';
    state = createFreshWorkspace({ id: otherId, name: 'Пустой проект' });
    activeProjectId = otherId; activeView = 'gate'; activeGateId = 'gate-2'; renderGate();
    const emptyCounter = g2MetrikaCompanyCounterV374();
    await openProject(savedId);
    activeView = 'gate'; activeGateId = 'gate-2'; renderGate();
    return { emptyCounter, restoredCounter: g2MetrikaCompanyCounterV374(),
      restoredGoals: g2MetrikaCompanyGoalsV374().map(goal => [goal.entryId, goal.name, goal.goalId]),
      blockCount: document.querySelectorAll('[data-g2mu-block]').length };
  })()`);
  assert.equal(switchProject.emptyCounter, ''); assert.equal(switchProject.restoredCounter, persistence.id);
  assert.deepEqual(switchProject.restoredGoals, initial.goals); assert.equal(switchProject.blockCount, 1);
  const optional = await evaluate(`(() => {
    const reviews = g2muReview(true);
    reviews.s41 = { result: 'passed', fingerprint: 'old-ecommerce' };
    reviews.s51 = { result: 'passed', fingerprint: 'old-content' };
    reviews.s52 = { result: 'passed', fingerprint: 'old-tag-manager' };
    const legacyBefore = JSON.stringify([reviews.s41, reviews.s51, reviews.s52]);
    const counterValueBefore = g2MetrikaCompanyDataV374('counter').contentAnalytics;
    const tagValueBefore = g2MetrikaCompanyDataV374('counter').tagManagerEnabled;
    const initialStatus = g2muStatus('s4content');
    const initialTagStatus = g2muStatus('s4tags');
    document.querySelector('[data-g2mu-step="s4content"] [data-g2mu-review="not_needed"]').click();
    document.querySelector('[data-g2mu-step="s4tags"] [data-g2mu-review="not_needed"]').click();
    return { initialStatus, status: g2muStatus('s4content'),
      initialTagStatus, tagStatus: g2muStatus('s4tags'),
      legacyUnchanged: JSON.stringify([reviews.s41, reviews.s51, reviews.s52]) === legacyBefore,
      counterUnchanged: g2MetrikaCompanyDataV374('counter').contentAnalytics === counterValueBefore,
      tagCounterUnchanged: g2MetrikaCompanyDataV374('counter').tagManagerEnabled === tagValueBefore,
      retiredStatus: g2muStatus('s41') };
  })()`);
  assert.deepEqual(optional, { initialStatus: 'not_started', status: 'not_needed',
    initialTagStatus: 'not_started', tagStatus: 'not_needed',
    legacyUnchanged: true, counterUnchanged: true, tagCounterUnchanged: true,
    retiredStatus: 'not_started' });
  const technical = await evaluate(`(() => {
    const evidence = document.querySelector('[data-g2mu-evidence="s14"]');
    evidence.value = 'Контрольный визит найден'; evidence.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-g2mu-step="s14"] [data-g2mu-review="passed"]').click();
    const passed = { state: g2MetrikaCompanyDataV374('counter').counterCheck, status: g2muStatus('s14') };
    document.querySelector('[data-g2mu-step="s14"] [data-g2mu-review="failed"]').click();
    return { passed, failed: { state: g2MetrikaCompanyDataV374('counter').counterCheck,
      status: g2muStatus('s14'), marker: document.querySelector('[data-g2mu-step="s14"] .g2mu-step-marker').textContent,
      history: g2muReview().s14.history?.length || 0 },
      conditionEditors: document.querySelectorAll('[data-g2mu-block] [data-g2-mc-field="condition"]').length };
  })()`);
  assert.deepEqual(technical.passed, { state: 'found', status: 'ready' });
  assert.equal(technical.failed.state, 'not_found'); assert.equal(technical.failed.status, 'problem');
  assert.equal(technical.failed.marker, '!');
  assert(technical.failed.history >= 1); assert.equal(technical.conditionEditors, 0);
  const internalVisits = await evaluate(`(() => {
    const select = document.querySelector('[data-g2mu-step="s24"] [data-g2-mc-field="mode"]');
    select.value = 'cookie'; select.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('[data-g2mu-step="s24"] [data-g2mu-new-filter-test]').click();
    const first = g2muInternalVisitContext();
    const row = document.querySelector('[data-g2mu-step="s24"]');
    row.querySelector('.g2mu-step-marker').click();
    const status = g2muStatus('s24');
    renderGate();
    const second = g2muInternalVisitContext();
    return { mode: g2MetrikaCompanyDataV374('filter').mode,
      ownerUrl: first.ownerUrl, guestUrl: first.guestUrl,
      preserved: first.ownerUrl === second.ownerUrl && first.guestUrl === second.guestUrl,
      status };
  })()`);
  assert.equal(internalVisits.mode, 'cookie');
  assert(internalVisits.ownerUrl.startsWith('https://k-apple.ru/?filter_test=owner_check_'));
  assert(internalVisits.guestUrl.startsWith('https://k-apple.ru/?filter_test=guest_check_'));
  assert.equal(internalVisits.preserved, true);
  assert.equal(internalVisits.status, 'ready');
  console.log(JSON.stringify({ parameterCheck, robotsCheck, accessCheck, disclosure, click, reload, stale, guideCheck, screenshots, persistence, navigation, switchProject, optional, technical, internalVisits, runtimeErrors: page.errors }, null, 2));
  assert.equal(page.errors.length, 0);
} finally {
  page?.close();
  if (browserContextId) await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  browser.close();
}
