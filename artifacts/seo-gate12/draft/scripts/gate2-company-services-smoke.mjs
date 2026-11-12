import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(process.env.GURU_GATE2_FIXTURE || "/Users/vl/Downloads/gate-2.json", "utf8"));
const gate0Fixture = JSON.parse(readFileSync(process.env.GURU_GATE0_FIXTURE || "/Users/vl/Downloads/gate-0.json", "utf8"));
const browserPort = process.env.GURU_CHROME_DEBUG_PORT || "9341";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:4318/";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Cdp {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.id = 0;
    this.pending = new Map();
    this.exceptions = [];
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.method === "Runtime.exceptionThrown")
        this.exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }
  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 30000);
      this.pending.set(id, { resolve: (value) => { clearTimeout(timer); resolve(value); },
        reject: (error) => { clearTimeout(timer); reject(error); } });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.socket.close(); }
}

let browser; let page; let browserContextId; let targetId;
const evaluate = async (expression) => {
  const response = await page.call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
};
const waitFor = async (expression) => {
  for (let i = 0; i < 150; i++) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timeout: ${expression}`);
};
const screenshotBlock = async (id, path, firstStepOnly = false) => {
  const rect = await evaluate(`(() => { const node = document.querySelector('[data-g2sb-id="${id}"]');
    node.open = true;
    node.scrollIntoView({ block: 'start', behavior: 'instant' });
    const r = node.getBoundingClientRect();
    const firstStep = node.querySelector('.g2sb-step');
    return { x: Math.max(0, r.left + scrollX), y: Math.max(0, r.top + scrollY),
      width: Math.ceil(r.width), height: Math.min(900, Math.ceil(${firstStepOnly} && firstStep
        ? firstStep.getBoundingClientRect().bottom - r.top : r.height)) }; })()`);
  await wait(150);
  const result = await page.call("Page.captureScreenshot", {
    format: "png", captureBeyondViewport: true, clip: { ...rect, scale: 1 },
  });
  writeFileSync(path, Buffer.from(result.data, "base64"));
};

try {
  const version = await (await fetch(`http://127.0.0.1:${browserPort}/json/version`)).json();
  browser = new Cdp(version.webSocketDebuggerUrl);
  await browser.ready;
  ({ browserContextId } = await browser.call("Target.createBrowserContext"));
  ({ targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId }));
  const targets = await (await fetch(`http://127.0.0.1:${browserPort}/json`)).json();
  page = new Cdp(targets.find((item) => item.id === targetId).webSocketDebuggerUrl);
  await page.ready;
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor('document.readyState === "complete" && typeof g2c2Applicability === "function"');

  const real = await evaluate(`(() => {
    localStorage.clear(); rememberAccessUnlocked(); setAccessState(true);
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    const id = ${JSON.stringify(fixture.project.id)};
    projects = [{ id, name: 'iCleaning', lifecycleStatus: 'active',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    activeProjectId = id;
    state = createFreshWorkspace({ id, name: 'iCleaning' });
    state.project = { ...state.project, ...${JSON.stringify(fixture.content.project)}, id };
    state.gates.find((gate) => gate.id === 'gate-0').cards = ${JSON.stringify(gate0Fixture.gate.cards)};
    const gate = state.gates.find((item) => item.id === 'gate-2');
    gate.cards = ${JSON.stringify(fixture.gate.cards)};
    ensureGate2Structure(gate);
    const before = JSON.stringify(gate.cards.find((card) => card.id === 'card-96').fields.g2SetupWizardV1 || null);
    const homeUrl = megaPlatformUrl('fixed', 'home');
    els.launcher.hidden = true; els.appShell.hidden = false;
    activeView = 'gate'; activeGateId = 'gate-2'; renderGate();
    const after = JSON.stringify(gate.cards.find((card) => card.id === 'card-96').fields.g2SetupWizardV1 || null);
    const domain = document.querySelector('[data-g2sb-id="company-domain"]');
    const webmaster = document.querySelector('[data-g2sb-id="company-webmaster"]');
    const step = (id) => domain.querySelectorAll('.g2sb-step')[['address','platform','provider','dns_source','dns_set','open','https','redirect'].indexOf(id)];
    const fields = (id) => [...step(id).querySelectorAll('[data-g2w-field]')].map((node) => node.dataset.g2wField);
    const label = (id, key) => step(id).querySelector('[data-g2w-field="' + key + '"]')?.closest('label')?.querySelector('span')?.textContent;
    const help = webmaster.querySelector('.g2sb-step:first-child .g2sb-help');
    return { projectId: state.project.id, homeUrl, displayedUrl: step('address').textContent,
      headerUrl: domain.querySelector('.g2sb-header a')?.href,
      before, after, providerFields: fields('provider'), sourceFields: fields('dns_source'),
      dnsSetFields: fields('dns_set'), platformOptions: step('platform').querySelectorAll('select option').length,
      sourceLabel: label('dns_source','dnsRecord'), providerWhere: step('provider').querySelectorAll('.g2sb-copy p')[0]?.textContent,
      platformWhere: step('platform').querySelectorAll('.g2sb-copy p')[0]?.textContent,
      dnsSetCheckbox: Boolean(step('dns_set').querySelector('[data-g2sb-step="dns_set"]')),
      webmasterHelpColumn: getComputedStyle(help).gridColumnStart,
      webmasterHelpUrl: help.href, hasEmDash: domain.textContent.includes('\\u2014'),
      emptyBackground: getComputedStyle(step('dns_source').querySelector('input')).backgroundColor };
  })()`);
  assert.equal(real.projectId, gate0Fixture.project.id);
  assert.equal(real.homeUrl, gate0Fixture.gate.cards.find((card) => card.megaMarketing)
    .megaMarketing.platformV2.urlsV1.fixed.home);
  assert.equal(real.headerUrl, real.homeUrl);
  assert.ok(real.displayedUrl.includes(real.homeUrl));
  assert.equal(real.before, real.after);
  assert.deepEqual(real.providerFields, ['registrar', 'hosting']);
  assert.deepEqual(real.sourceFields, ['dnsRecord']);
  assert.deepEqual(real.dnsSetFields, []);
  assert.equal(real.sourceLabel, 'Запись от провайдера');
  assert.equal(real.platformWhere, 'Выберите платформу в списке справа.');
  assert.equal(real.providerWhere, 'Заполните поля справа.');
  assert.equal(real.dnsSetCheckbox, true);
  assert.ok(real.platformOptions > 2);
  assert.equal(real.webmasterHelpColumn, '2');
  assert.equal(real.webmasterHelpUrl, 'https://yandex.ru/support/webmaster/ru/service/quick-start');
  assert.equal(real.hasEmDash, false);
  assert.equal(real.emptyBackground, 'rgb(255, 255, 255)');
  if (process.env.GURU_CAPTURE_SCREENSHOTS === '1') {
    await screenshotBlock('company-domain', 'artifacts/gate2-correction-icleaning-domain.png');
    await screenshotBlock('company-webmaster', 'artifacts/gate2-correction-icleaning-webmaster-step01.png', true);
  }

  const preserved = await evaluate(`(() => {
    const domain = g2wRecord(g2wDef('domain'), '', true);
    Object.assign(domain.values, { platform: 'tilda', registrar: 'Регистратор из сохранённой записи',
      hosting: 'Провайдер из сохранённой записи', dnsRecord: 'IP из сохранённой записи' });
    const before = JSON.stringify(domain.values);
    renderGate();
    const after = JSON.stringify(g2wRecord(g2wDef('domain')).values);
    const block = document.querySelector('[data-g2sb-id="company-domain"]');
    const source = block.querySelectorAll('.g2sb-step')[3];
    const shown = [...block.querySelectorAll('[data-g2w-field]')].map((field) =>
      [field.dataset.g2wField, field.value]);
    const label = source.querySelector('[data-g2w-field="dnsRecord"]').closest('label').querySelector('span').textContent;
    megaPlatformSetUrl('fixed', 'home', '');
    state.project.websiteUrl = 'https://legacy.example.test/';
    renderGate();
    const empty = document.querySelector('[data-g2sb-id="company-domain"]');
    return { before, after, shown, label,
      emptyHeader: empty.querySelector('.g2sb-header').textContent,
      emptyAddress: empty.querySelector('.g2sb-step:first-child').textContent,
      emptyAutoButton: Boolean(empty.querySelector('[data-g2w-auto]')) };
  })()`);
  assert.equal(preserved.before, preserved.after, 'stored field keys and values must survive render');
  assert.ok(preserved.shown.some(([key, value]) => key === 'registrar' && value === 'Регистратор из сохранённой записи'));
  assert.ok(preserved.shown.some(([key, value]) => key === 'hosting' && value === 'Провайдер из сохранённой записи'));
  assert.ok(preserved.shown.some(([key, value]) => key === 'dnsRecord' && value === 'IP из сохранённой записи'));
  assert.equal(preserved.label, 'IP для A-записи (из Tilda)');
  assert.ok(preserved.emptyHeader.includes('URL не указан'));
  assert.ok(preserved.emptyAddress.includes('URL не указан'));
  assert.equal(preserved.emptyAutoButton, false);
  assert.ok(!preserved.emptyHeader.includes('example.org') && !preserved.emptyAddress.includes('example.org'));
  const otherPlatforms = await evaluate(`(() => {
    const values = g2wRecord(g2wDef('domain')).values;
    const read = () => {
      const block = document.querySelector('[data-g2sb-id="company-domain"]');
      return { label: block.querySelectorAll('.g2sb-step')[3]
        .querySelector('[data-g2w-field="dnsRecord"]').closest('label').querySelector('span').textContent,
        provider: [...block.querySelectorAll('.g2sb-step')[2].querySelectorAll('[data-g2w-field]')]
          .map((field) => field.dataset.g2wField) };
    };
    values.platform = 'wordpress'; renderGate(); const wordpress = read();
    values.platform = 'vercel'; renderGate(); const vercel = read();
    values.platform = 'custom'; renderGate(); const custom = read();
    return { wordpress, vercel, custom };
  })()`);
  for (const platform of Object.values(otherPlatforms)) {
    assert.equal(platform.label, 'Запись от провайдера');
    assert.deepEqual(platform.provider, ['registrar', 'hosting']);
  }

  const setup = await evaluate(`(() => {
    localStorage.clear(); rememberAccessUnlocked(); setAccessState(true);
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    const id = 'gate2-company-services-smoke';
    projects = [{ id, name: 'iCleaning', lifecycleStatus: 'active',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
    activeProjectId = id;
    state = createFreshWorkspace({ id, name: 'iCleaning' });
    state.project = { ...state.project, ...${JSON.stringify(fixture.content.project)}, id };
    const gate = state.gates.find((item) => item.id === 'gate-2');
    gate.cards = ${JSON.stringify(fixture.gate.cards)};
    ensureGate2Structure(gate);
    const first = guruV194Products(state)[0];
    if (first) state.project.gate0ScopeUiV194 = {
      selectedCategoryId: megaPlatformProductCategoryIds(first)[0] || '__uncategorized__',
      selectedProductId: first.id };
    const marketing = state.gates.find((item) => item.id === 'gate-0').cards.find(isMegaMarketingCard).megaMarketing;
    const infra = (name, status) => { const row = marketing.infra.find((item) => item.name === name); row.status = status; };
    infra('Яндекс Вебмастер', 'works'); infra('Яндекс Директ', 'works');
    marketing.channels.find((item) => item.platform === 'Яндекс Карты' && item.type === 'Карточка организации').status = 'works';
    megaPlatformSetUrl('fixed', 'home', 'https://example.org/');
    const domain = g2wRecord(g2wDef('domain'), '', true);
    domain.values.platform = 'tilda'; domain.values.registrar = 'Проверочный регистратор';
    domain.steps.platform = { step_id: 'platform', scope: 'company', project_id: id, product_id: '',
      result: 'done', params: { platform: 'tilda' }, verification_type: 'self_reported_action',
      checked_at: '2026-10-20T00:00:00.000Z', source_url: '' };
    const webmaster = g2wRecord(g2wDef('webmaster'), '', true);
    webmaster.steps.open = { step_id: 'open', scope: 'company', project_id: id, product_id: '',
      result: 'done', params: {}, verification_type: 'self_reported_action',
      checked_at: '2026-10-20T00:00:00.000Z', source_url: 'https://yandex.ru/support/webmaster/ru/service/quick-start' };
    const before = JSON.stringify({ domain, webmaster });
    els.launcher.hidden = true; els.appShell.hidden = false;
    activeView = 'gate'; activeGateId = 'gate-2'; renderGate();
    const after = JSON.stringify({ domain: g2wRecord(g2wDef('domain')), webmaster: g2wRecord(g2wDef('webmaster')) });
    const scope = document.querySelector('[data-g2w-scope="company"]');
    const order = [...scope.children].map((node) => node.dataset.g2sbId || node.dataset.g2wCardView).filter(Boolean);
    const help = [...document.querySelectorAll('[data-g2sb-id="company-domain"] .g2sb-help, [data-g2sb-id="company-webmaster"] .g2sb-help, [data-g2sb-id="company-yandex-business"] .g2sb-help, [data-g2sb-id="company-yandex-direct"] .g2sb-help')].map((node) => node.href);
    const unconfirmed = [...document.querySelectorAll('.g2sb-help-note')].map((node) => node.textContent);
    const oldIds = new Set(${JSON.stringify(fixture.gate.cards.map((card) => card.id))});
    return { before, after, order, help, unconfirmed, sourceCards: oldIds.size,
      keptCards: gate.cards.filter((card) => oldIds.has(card.id)).length,
      legacyCards: document.querySelectorAll('.g2w-workspace [data-card]').length,
      productUnits: document.querySelectorAll('[data-g2w-scope="product"] .g2w-card').length,
      businessSteps: document.querySelectorAll('[data-g2sb-id="company-yandex-business"] .g2sb-step').length,
      directSteps: document.querySelectorAll('[data-g2sb-id="company-yandex-direct"] .g2sb-step').length,
      addressInputs: document.querySelectorAll('[data-g2sb-id="company-domain"] [data-g2sb-step="address"][type=text], [data-g2sb-id="company-domain"] [data-g2w-field="homeUrl"]').length,
      platformOptions: document.querySelectorAll('[data-g2sb-id="company-domain"] [data-g2w-field="platform"] option').length,
      emptyBackground: getComputedStyle(document.querySelector('[data-g2sb-id="company-domain"] [data-g2w-field="dnsRecord"]')).backgroundColor,
      hasEmDash: [...document.querySelectorAll('.g2sb-block')].some((node) => node.textContent.includes('\\u2014')) };
  })()`);
  assert.equal(setup.before, setup.after, 'existing domain and Webmaster records must not change on render');
  assert.deepEqual(setup.order, [
    'company-domain', 'counter', 'goal', 'company-webmaster',
    'company-yandex-business', 'company-yandex-direct', 'company-vk',
    'company-telegram-ads', 'company-meta-ads', 'company-ga4', 'company-gsc',
    'company-google-ads', 'company-leads', 'company-safety',
  ]);
  assert.equal(setup.sourceCards, 71);
  assert.equal(setup.keptCards, 71);
  assert.equal(setup.legacyCards, 62);
  assert.equal(setup.productUnits, 0);
  assert.equal(setup.businessSteps, 5);
  assert.equal(setup.directSteps, 6);
  assert.equal(setup.addressInputs, 0);
  assert.ok(setup.platformOptions > 2);
  assert.equal(setup.emptyBackground, 'rgb(255, 255, 255)');
  assert.equal(setup.hasEmDash, false);
  const official = new Set([
    'https://help-ru.tilda.cc/customdomain', 'https://tilda.cc/ru/answers/a/https/',
    'https://yandex.ru/support/webmaster/ru/service/quick-start',
    'https://yandex.ru/support/webmaster/ru/service/rights',
    'https://yandex.ru/support/webmaster/ru/indexing-options/robots-txt-analyzer',
    'https://yandex.ru/support/webmaster/ru/controlling-robot/sitemap',
    'https://yandex.ru/support/business-priority/ru/',
    'https://www.yandex.ru/support/business-priority/ru/manage/verify',
    'https://www.yandex.ru/support/business-priority/ru/manage/contacts',
    'https://yandex.ru/support/direct/statistics/metrika.html',
    'https://yandex.ru/support/direct/ru/payments/payment-methods',
  ]);
  assert.ok(setup.help.every((url) => official.has(url)), 'all help links must be from the approved list');
  assert.ok(!setup.unconfirmed.includes('Справка: требует уточнения'));

  for (const [blockId, stepId] of [
    ['company-yandex-business', 'add'], ['company-yandex-direct', 'account'],
    ['company-domain', 'dns_set'],
  ]) await evaluate(`(() => {
    const control = document.querySelector('[data-g2sb-id="${blockId}"] [data-g2sb-step="${stepId}"]');
    control.checked = true; control.dispatchEvent(new Event('change', { bubbles: true }));
    return control.checked;
  })()`);
  await evaluate(`(() => {
    const control = [...document.querySelectorAll('[data-g2seo-editor="advice"] select')]
      .find(node => JSON.parse(node.dataset.g2seoControl || '{}')['data-g1-webmaster-company-v295'] === 'crawlErrorsStatus');
    control.value = 'works'; control.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  const saved = await evaluate(`(() => {
    const gate = state.gates.find((item) => item.id === 'gate-2');
    const step = (id, name) => gate.cards.find((card) => card.id === id).fields.g2SetupWizardV1.company.steps[name];
    return { business: step('g2-service-company-yandex-business', 'add'),
      direct: step('g2-service-company-yandex-direct', 'account'),
      advice: g2SeoStore('company-webmaster').cards['card-13'].webmasterCompanyV298.crawlErrorsStatus,
      domain: step('card-96', 'dns_set'),
      homeUrl: megaPlatformUrl('fixed', 'home') };
  })()`);
  assert.equal(saved.business.result, 'done');
  assert.equal(saved.business.product_id, '');
  assert.equal(saved.direct.result, 'done');
  assert.equal(saved.advice, 'works');
  assert.equal(saved.domain.result, 'done');
  assert.equal(saved.homeUrl, 'https://example.org/');
  await wait(700);
  const persisted = await evaluate(`(() => {
    const workspace = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId));
    return workspace.gates.find((item) => item.id === 'gate-2').cards
      .find((card) => card.id === 'g2-service-company-yandex-business')
      .fields.g2SetupWizardV1.company.steps.add.result;
  })()`);
  assert.equal(persisted, 'done');

  for (const id of ['company-domain', 'company-webmaster', 'company-yandex-business', 'company-yandex-direct'])
    if (process.env.GURU_CAPTURE_SCREENSHOTS === '1')
      await screenshotBlock(id, `artifacts/gate2-step2-${id}.png`);

  const skipped = await evaluate(`(() => {
    const marketing = state.gates.find((item) => item.id === 'gate-0').cards.find(isMegaMarketingCard).megaMarketing;
    marketing.platformV2.fundamental.find((row) => row.name === 'Главная страница').status = 'not_needed';
    marketing.infra.find((row) => row.name === 'Яндекс Вебмастер').status = 'not_needed';
    marketing.channels.find((row) => row.platform === 'SEO' && row.type === 'Страницы сайта').status = 'not_needed';
    marketing.infra.find((row) => row.name === 'Яндекс Директ').status = 'not_needed';
    marketing.channels.find((row) => row.platform === 'Яндекс Карты' && row.type === 'Карточка организации').status = 'not_needed';
    renderGate();
    return [...document.querySelectorAll('.g2sb-block')].slice(0, 4).map((block) => ({
      id: block.dataset.g2sbId, gray: block.classList.contains('is-not-needed'),
      label: block.querySelector('[data-g2sb-status]').textContent,
      steps: block.querySelectorAll('.g2sb-step').length }));
  })()`);
  assert.equal(skipped.length, 4);
  assert.ok(skipped.every((item) => item.gray && item.label === 'Не требуется по Gate 0' && item.steps > 0));

  const cleanProjects = [];
  for (const name of ['Коричное яблоко', 'SIVRCE', 'ГУРУ']) {
    const opened = await evaluate(`(() => {
      const name = ${JSON.stringify(name)};
      const id = 'clean-' + name.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-');
      activeProjectId = id; state = createFreshWorkspace({ id, name });
      const category = guruV189CreateCategory('Проверочная категория', state);
      const productId = id + '-product';
      guruV189CatalogItems(state).push({ id: productId, name: 'Проверочный продукт', continuum: 'product' });
      megaPlatformSetProductCategoryIds(productId, [category.id], state);
      state.project.gate0ScopeUiV194 = { selectedCategoryId: category.id, selectedProductId: productId };
      activeView = 'gate'; activeGateId = 'gate-2'; renderGate();
      return { name: state.project.name, blocks: document.querySelectorAll('.g2sb-block').length,
        products: document.querySelectorAll('[data-g2w-scope="product"] .g2w-card').length };
    })()`);
    assert.deepEqual(opened, { name, blocks: 17, products: 0 });
    cleanProjects.push(name);
  }
  assert.deepEqual(page.exceptions, [], 'Gate 2 should open without uncaught browser errors');
  console.log(JSON.stringify({ ok: true, realProjectId: real.projectId, realGate0Url: real.homeUrl,
    realDomainRecordUnchanged: real.before === real.after,
    realDomainRecordPresent: real.before !== 'null',
    savedFieldValuesPreserved: preserved.before === preserved.after,
    webmasterHelpRight: real.webmasterHelpColumn === '2', platformsChecked: 4,
    order: setup.order, recordsUnchanged: true,
    oldCards: setup.keptCards, helpLinks: setup.help.length, liveSaved: true,
    grayBlocks: skipped.length, cleanProjects, browserErrors: page.exceptions.length }));
} finally {
  if (page) page.close();
  if (browser && browserContextId) {
    try { await browser.call("Target.disposeBrowserContext", { browserContextId }); } catch {}
  }
  if (browser) browser.close();
}
