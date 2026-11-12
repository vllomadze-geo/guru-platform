import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const fixture = JSON.parse(readFileSync(process.env.GURU_GATE2_FIXTURE || '/Users/vl/Downloads/gate-2.json', 'utf8'));
const gate1Fixture = JSON.parse(readFileSync(process.env.GURU_GATE1_FIXTURE || '/Users/vl/Downloads/gate-1.json', 'utf8'));
const source = readFileSync('/Users/vl/.codex/attachments/8e147fa1-35ba-445e-aef1-080c54565853/Pasted text.txt', 'utf8');
const rightsSource = readFileSync('/Users/vl/.codex/attachments/55a660b0-3034-42e0-9074-836d017b43db/Pasted text.txt', 'utf8');
const indexingSource = readFileSync('/Users/vl/.codex/attachments/7ec71794-7e0b-4a08-9d0f-e78532993853/Pasted text.txt', 'utf8');
const sitemapSource = readFileSync('/Users/vl/.codex/attachments/49dcd2b5-5770-4a80-b7a0-f5aeed2aa5ee/Pasted text.txt', 'utf8');
const searchSource = readFileSync('/Users/vl/.codex/attachments/822f3a87-48c6-4612-b65e-3f1dce79a4e6/Pasted text.txt', 'utf8');
const prioritySource = readFileSync('/Users/vl/.codex/attachments/a94c82f7-52d1-4813-84e8-97fd2d70ac24/Pasted text.txt', 'utf8');
const visibilitySource = readFileSync('/Users/vl/.codex/attachments/19d8b076-e98f-4915-8d3e-d4e1ef226ddc/Pasted text.txt', 'utf8');
const launchSource = readFileSync('/Users/vl/.codex/attachments/f751bcc1-42eb-4431-bfb9-193ffb48fd78/Pasted text.txt', 'utf8');
assert.equal(readFileSync('gate2-webmaster-main-address-1.1.md', 'utf8'), source);
assert.equal(readFileSync('gate2-webmaster-main-address-copy.js', 'utf8'),
  `const G2WM_MAIN_ADDRESS_MARKDOWN = ${JSON.stringify(source)};\n`);
assert.equal(readFileSync('gate2-webmaster-rights-1.2.md', 'utf8'), rightsSource);
assert.equal(readFileSync('gate2-webmaster-rights-copy.js', 'utf8'),
  `const G2WM_RIGHTS_MARKDOWN = ${JSON.stringify(rightsSource)};\n`);
assert.equal(readFileSync('gate2-webmaster-indexing-2.1.md', 'utf8'), indexingSource);
assert.equal(readFileSync('gate2-webmaster-indexing-copy.js', 'utf8'),
  `const G2WM_INDEXING_MARKDOWN = ${JSON.stringify(indexingSource)};\n`);
assert.equal(readFileSync('gate2-webmaster-sitemap-2.2.md', 'utf8'), sitemapSource);
assert.equal(readFileSync('gate2-webmaster-sitemap-copy.js', 'utf8'),
  `const G2WM_SITEMAP_MARKDOWN = ${JSON.stringify(sitemapSource)};\n`);
assert.equal(readFileSync('gate2-webmaster-search-pages-3.1.md', 'utf8'), searchSource);
assert.equal(readFileSync('gate2-webmaster-search-pages-copy.js', 'utf8'),
  `const G2WM_SEARCH_PAGES_MARKDOWN = ${JSON.stringify(searchSource)};\n`);
assert.equal(readFileSync('gate2-webmaster-priority-urls-3.2.md', 'utf8'), prioritySource);
assert.equal(readFileSync('gate2-webmaster-priority-urls-copy.js', 'utf8'),
  `const G2WM_PRIORITY_URLS_MARKDOWN = ${JSON.stringify(prioritySource)};\n`);
assert.equal(readFileSync('gate2-webmaster-visibility-3.3.md', 'utf8'), visibilitySource);
assert.equal(readFileSync('gate2-webmaster-visibility-copy.js', 'utf8'),
  `const G2WM_VISIBILITY_MARKDOWN = ${JSON.stringify(visibilitySource)};\n`);
assert.equal(readFileSync('gate2-webmaster-indexing-launch-3.4.md', 'utf8'), launchSource);
assert.equal(readFileSync('gate2-webmaster-indexing-launch-copy.js', 'utf8'),
  `const G2WM_INDEXING_LAUNCH_MARKDOWN = ${JSON.stringify(launchSource)};\n`);
const folder = 'artifacts/gate2-webmaster-unified'; mkdirSync(folder, { recursive: true });
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
  async call(method, params = {}) { await this.ready; return new Promise((resolve, reject) => {
    const id = ++this.id, timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 90000);
    this.pending.set(id, { resolve, reject, timer }); this.socket.send(JSON.stringify({ id, method, params }));
  }); }
  close() { this.socket.close(); }
}

const version = await (await fetch('http://127.0.0.1:49337/json/version')).json();
const browser = new Cdp(version.webSocketDebuggerUrl);
let page, browserContextId;
try {
  ({ browserContextId } = await browser.call('Target.createBrowserContext'));
  const { targetId } = await browser.call('Target.createTarget', { url: 'about:blank', browserContextId });
  const tabs = await (await fetch('http://127.0.0.1:49337/json')).json();
  page = new Cdp(tabs.find(tab => tab.id === targetId).webSocketDebuggerUrl);
  const evaluate = async expression => { const result = await page.call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value; };
  await page.call('Runtime.enable'); await page.call('Page.enable');
  await page.call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.call('Page.navigate', { url: 'http://127.0.0.1:41323/' });
  for (let i = 0; i < 300; i++) {
    if (await evaluate('document.readyState === "complete" && typeof g2wmBlockHtml === "function"')) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  const init = await evaluate(`(() => {
    localStorage.clear(); rememberAccessUnlocked(); setAccessState(true); scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    projects = [{ id: 'webmaster-empty-isolated', name: 'Коричное яблоко', lifecycleStatus: 'active' }]; activeProjectId = 'webmaster-empty-isolated';
    state = createFreshWorkspace({ id: activeProjectId, name: 'Коричное яблоко' });
    state.project = { ...state.project, ...${JSON.stringify(fixture.content.project)}, id: activeProjectId };
    state.gates.find(gate => gate.id === 'gate-2').cards = ${JSON.stringify(fixture.gate.cards)};
    megaPlatformSetUrl('fixed', 'home', 'https://k-apple.ru/', state);
    const first = guruV194Products(state)[0]; if (first) state.project.gate0ScopeUiV194 = { selectedCategoryId: megaPlatformProductCategoryIds(first)[0] || '__uncategorized__', selectedProductId: first.id };
    const legacyLayout = { groups: [{ title: 'Подключение сайта', steps: ['open', 'rights'] }],
      edits: { open: { what: 'Исторический текст' } }, added: {}, templateIds: ['open', 'rights'] };
    state.project.gate2StepLayoutsV1 ||= { company: {}, products: {} };
    state.project.gate2StepLayoutsV1.company['service:company-webmaster'] = structuredClone(legacyLayout);
    const record = g2wRecord(g2wDef('webmaster'), '', true);
    record.steps.open = { result: 'done' };
    record.steps.rights = { result: 'done' };
    record.webmasterUnifiedV1 = { open: { result: 'passed', evidence: 'Историческая проверка' } };
    record.technicalSeoV1 = { schema: 1, migrated: true, marker: 'Сохранённый SEO-источник' };
    record.technicalSeoV1.cards = { 'card-14': ${JSON.stringify(gate1Fixture.gate.cards.find(card => card.id === 'card-14'))} };
    const before = JSON.stringify({ layout: state.project.gate2StepLayoutsV1.company['service:company-webmaster'],
      record, sitemap: g2SeoStore('company-webmaster').cards['card-14'].robotsV130 });
    const other = Object.fromEntries(['company-domain', 'company-yandex-business', 'company-yandex-direct'].map(id => [id, G2_SERVICE_BLOCK_CONFIGS.get(id).steps.map(step => step.step_id)]));
    els.launcher.hidden = true; els.appShell.hidden = false; activeView = 'gate'; activeGateId = 'gate-2'; renderGate();
    document.querySelector('[data-g2y-company]').open = true;
    const block = document.querySelector('[data-g2sb-id="company-webmaster"]'); block.open = true;
    const after = JSON.stringify({ layout: state.project.gate2StepLayoutsV1.company['service:company-webmaster'],
      record: g2wRecord(g2wDef('webmaster')),
      sitemap: g2SeoStore('company-webmaster').cards['card-14'].robotsV130 });
    const currentOther = Object.fromEntries(['company-domain', 'company-yandex-business', 'company-yandex-direct'].map(id => [id, G2_SERVICE_BLOCK_CONFIGS.get(id).steps.map(step => step.step_id)]));
    const roundTrip = migrateWorkspace(structuredClone(state), activeProjectId);
    const notNeeded = structuredClone(state);
    const infra = g2c2Marketing(notNeeded).infra?.find(row => row.name === 'Яндекс Вебмастер');
    if (infra) infra.status = 'not_needed';
    const section = block.querySelector('[data-g2wm-section="1"]');
    const step = section?.querySelector('[data-g2wm-step="s11"]');
    const guide = step?.querySelector('.g2wm-main-address-copy');
    const rights = section?.querySelector('[data-g2wm-step="s12"]');
    const rightsGuide = rights?.querySelector('.g2wm-rights-copy');
    const indexingSection = block.querySelector('[data-g2wm-section="2"]');
    const indexing = indexingSection?.querySelector('[data-g2wm-step="s21"]');
    const indexingGuide = indexing?.querySelector('.g2wm-indexing-copy');
    const sitemap = indexingSection?.querySelector('[data-g2wm-step="s22"]');
    const sitemapGuide = sitemap?.querySelector('.g2wm-sitemap-copy');
    const searchSection = block.querySelector('[data-g2wm-section="3"]');
    const search = searchSection?.querySelector('[data-g2wm-step="s31"]');
    const searchGuide = search?.querySelector('.g2wm-search-copy');
    const priority = searchSection?.querySelector('[data-g2wm-step="s32"]');
    const priorityGuide = priority?.querySelector('.g2wm-priority-copy');
    const visibility = searchSection?.querySelector('[data-g2wm-step="s33"]');
    const visibilityGuide = visibility?.querySelector('.g2wm-visibility-copy');
    const launch = searchSection?.querySelector('[data-g2wm-step="s34"]');
    const launchGuide = launch?.querySelector('.g2wm-launch-copy');
    return { exists: !!block, title: block?.querySelector('.g2sb-title')?.textContent,
      status: block?.querySelector('[data-g2sb-status]')?.dataset.status,
      sectionTitle: section?.querySelector('summary h4')?.textContent,
      sectionOpen: section?.open,
      stepTitle: step?.querySelector('.g2mu-step-heading h5')?.textContent,
      stepNumber: step?.querySelector('.g2mu-number')?.textContent,
      stepStatus: step?.querySelector('[data-g2wm-status]')?.dataset.g2wmStatus,
      rightsTitle: rights?.querySelector('.g2mu-step-heading h5')?.textContent,
      rightsNumber: rights?.querySelector('.g2mu-number')?.textContent,
      rightsStatus: rights?.querySelector('[data-g2wm-status]')?.dataset.g2wmStatus,
      rightsFields: rights?.querySelectorAll('input, select, textarea, .g2mu-fields').length,
      rightsHeadings: [...(rightsGuide?.querySelectorAll('h3, h4, h5, h6') || [])].map(node => node.textContent),
      rightsCurrentResult: rightsGuide?.textContent.includes('Текущий результат: требует проверки роли пользователя.'),
      indexingSectionTitle: indexingSection?.querySelector('summary h4')?.textContent,
      indexingTitle: indexing?.querySelector('h5')?.textContent,
      indexingNumber: indexing?.querySelector('.g2mu-number')?.textContent,
      indexingStatus: indexing?.querySelector('[data-g2wm-status]')?.dataset.g2wmStatus,
      indexingFields: indexing?.querySelectorAll('input, select, textarea, .g2mu-fields').length,
      indexingHeading: [...(indexingGuide?.querySelectorAll('h3,h4,h5,h6') || [])].map(node => node.textContent),
      indexingPages: indexingGuide?.querySelectorAll('[data-g2wm-indexing-urls] tbody tr').length,
      indexingUrl: indexingGuide?.querySelector('[data-g2wm-indexing-urls] a')?.href,
      indexingNoExample: !indexingGuide?.textContent.includes('Пример для «Коричного яблока»') &&
        !indexingGuide?.textContent.includes('204 мс') && !indexingGuide?.textContent.includes('178,87 КБ'),
      sitemapTitle: sitemap?.querySelector('.g2mu-step-heading h5')?.textContent,
      sitemapNumber: sitemap?.querySelector('.g2mu-number')?.textContent,
      sitemapStatus: sitemap?.querySelector('[data-g2wm-status]')?.dataset.g2wmStatus,
      sitemapFields: sitemap?.querySelectorAll('input, select, textarea, .g2mu-fields').length,
      sitemapHeadings: [...(sitemapGuide?.querySelectorAll('h3,h4,h5,h6') || [])].map(node => node.textContent),
      sitemapFiles: [...(sitemapGuide?.querySelectorAll('[data-g2wm-sitemap-files] tbody a') || [])].map(node => node.href),
      sitemapSavedStatus: sitemapGuide?.querySelector('[data-g2wm-sitemap-files]')?.textContent.includes('Ошибка'),
      sitemapTargetPages: sitemapGuide?.querySelectorAll('[data-g2wm-sitemap-pages] tbody tr').length,
      sitemapNoOldClaims: !sitemapGuide?.textContent.includes('16 ссылок') && !sitemapGuide?.textContent.includes('117 мс') &&
        !sitemapGuide?.textContent.includes('FD101N') && !sitemapGuide?.textContent.includes('10.10.2026') &&
        !sitemapGuide?.textContent.includes('example.ru') && !sitemapGuide?.textContent.includes('Для «Коричного яблока»'),
      searchSectionTitle: searchSection?.querySelector('summary h4')?.textContent,
      searchTitle: search?.querySelector('.g2mu-step-heading h5')?.textContent,
      searchNumber: search?.querySelector('.g2mu-number')?.textContent,
      searchStatus: search?.querySelector('[data-g2wm-status]')?.dataset.g2wmStatus,
      searchFields: search?.querySelectorAll('input, select, textarea, .g2mu-fields').length,
      searchHeadings: [...(searchGuide?.querySelectorAll('h3,h4,h5,h6') || [])].map(node => node.textContent),
      searchPages: searchGuide?.querySelectorAll('[data-g2wm-search-action="prepare"] tbody tr[data-g2wm-page-group]').length,
      searchPageSections: [...new Set([...(searchGuide?.querySelectorAll('[data-g2wm-search-action="prepare"] tbody tr[data-g2wm-page-section]') || [])]
        .map(row => row.dataset.g2wmPageSection))],
      searchCommercialHeading: searchGuide?.querySelector('[data-g2wm-search-action="prepare"] .g2wm-search-group-row th')?.textContent,
      searchActions: [...(searchGuide?.querySelectorAll('[data-g2wm-search-pages][data-g2wm-search-action]') || [])].map(section => ({
        action: section.dataset.g2wmSearchAction, count: section.querySelectorAll('[data-g2wm-search-check]').length,
        progress: section.querySelector('[data-g2wm-search-progress]')?.textContent })),
      searchCheckboxes: searchGuide?.querySelectorAll('[data-g2wm-search-check]').length,
      searchChecked: searchGuide?.querySelectorAll('[data-g2wm-search-check]:checked').length,
      searchProgress: searchGuide?.querySelector('[data-g2wm-search-progress]')?.textContent,
      searchPassedDisabled: search?.querySelector('[data-g2wm-review="passed"]')?.disabled,
      searchFilterCount: [...(searchGuide?.querySelectorAll('[data-g2wm-search-action="prepare"] tbody tr[data-g2wm-page-group]') || [])]
        .filter(row => row.querySelector('a') && row.cells[3]?.textContent.trim()).length,
      searchNoSingleExample: !searchGuide?.textContent.includes('Для страницы из выбранного проекта:') &&
        !searchGuide?.textContent.includes('novogodnie-podarki-2027'),
      searchExclusions: !searchGuide?.querySelector('[data-g2wm-page-group="fixed"][data-g2wm-page-id="thank_you"]') &&
        !searchGuide?.querySelector('[data-g2wm-page-group="products"]') &&
        !searchGuide?.querySelector('[data-g2wm-page-group="fixed"][data-g2wm-page-id="delivery"]') &&
        !searchGuide?.querySelector('[data-g2wm-page-group="fixed"][data-g2wm-page-id="not_found"]'),
      searchCatalog: !!searchGuide?.querySelector('[data-g2wm-page-group="fixed"][data-g2wm-page-id="catalog"]'),
      searchAllOtherPages: searchGuide?.querySelectorAll('[data-g2wm-search-action="prepare"] tbody tr[data-g2wm-page-group]').length ===
        megaPlatformAllPages(state).filter(page => page.group === 'categories' ||
          page.group === 'fixed' && ['home', 'contacts', 'catalog', 'about', 'blog'].includes(page.id)).length,
      searchHome: searchGuide?.querySelector('[data-g2wm-page-group="fixed"][data-g2wm-page-id="home"] a')?.href,
      searchNoOldClaims: !searchGuide?.textContent.includes('Подтверждённый результат для проекта') &&
        !searchGuide?.textContent.includes('11 ноября 2026 года') && !searchGuide?.textContent.includes('20.09.2026'),
      priorityTitle: priority?.querySelector('.g2mu-step-heading h5')?.textContent,
      priorityNumber: priority?.querySelector('.g2mu-number')?.textContent,
      priorityStatus: priority?.querySelector('[data-g2wm-status]')?.dataset.g2wmStatus,
      priorityPages: priorityGuide?.querySelectorAll('[data-g2wm-priority-action="prepare"] tbody tr[data-g2wm-page-group]').length,
      prioritySections: [...new Set([...(priorityGuide?.querySelectorAll('[data-g2wm-priority-action="prepare"] tbody tr[data-g2wm-page-section]') || [])]
        .map(row => row.dataset.g2wmPageSection))],
      priorityActions: [...(priorityGuide?.querySelectorAll('[data-g2wm-priority-pages][data-g2wm-priority-action]') || [])].map(section => ({
        action: section.dataset.g2wmPriorityAction, count: section.querySelectorAll('[data-g2wm-priority-check]').length,
        progress: section.querySelector('[data-g2wm-priority-progress]')?.textContent })),
      priorityCheckBoxes: priorityGuide?.querySelectorAll('[data-g2wm-priority-check]').length,
      priorityPassedDisabled: priority?.querySelector('[data-g2wm-review="passed"]')?.disabled,
      priorityNoOldClaims: !priorityGuide?.textContent.includes('Подтверждённые данные проекта «Коричное яблоко»') &&
        !priorityGuide?.textContent.includes('11.11.2026') && !priorityGuide?.textContent.includes('simvol-2027-koza'),
      priorityNoPlaceholders: !priorityGuide?.textContent.includes('G2WM_PRIORITY_'),
      visibilityTitle: visibility?.querySelector('.g2mu-step-heading h5')?.textContent,
      visibilityNumber: visibility?.querySelector('.g2mu-number')?.textContent,
      visibilityStatus: visibility?.querySelector('[data-g2wm-status]')?.dataset.g2wmStatus,
      visibilityPages: visibilityGuide?.querySelectorAll('[data-g2wm-visibility-action="prepare"] tbody tr[data-g2wm-page-group]').length,
      visibilitySections: [...new Set([...(visibilityGuide?.querySelectorAll('[data-g2wm-visibility-action="prepare"] tbody tr[data-g2wm-page-section]') || [])]
        .map(row => row.dataset.g2wmPageSection))],
      visibilityActions: [...(visibilityGuide?.querySelectorAll('[data-g2wm-visibility-pages][data-g2wm-visibility-action]') || [])].map(section => ({
        action: section.dataset.g2wmVisibilityAction, count: section.querySelectorAll('[data-g2wm-visibility-check]').length,
        progress: section.querySelector('[data-g2wm-visibility-progress]')?.textContent })),
      visibilityCheckBoxes: visibilityGuide?.querySelectorAll('[data-g2wm-visibility-check]').length,
      visibilityPassedDisabled: visibility?.querySelector('[data-g2wm-review="passed"]')?.disabled,
      visibilityNoOldClaims: !visibilityGuide?.textContent.includes('Подтверждённые данные проекта «Коричное яблоко»') &&
        !visibilityGuide?.textContent.includes('6 сентября - 6 октября 2026 года') &&
        !visibilityGuide?.textContent.includes('simvol-2027-koza'),
      visibilityNoPlaceholders: !visibilityGuide?.textContent.includes('G2WM_VISIBILITY_'),
      launchTitle: launch?.querySelector('.g2mu-step-heading h5')?.textContent,
      launchNumber: launch?.querySelector('.g2mu-number')?.textContent,
      launchStatus: launch?.querySelector('[data-g2wm-status]')?.dataset.g2wmStatus,
      launchAllPages: launchGuide?.querySelectorAll('[data-g2wm-launch-action="sitemap"] tbody tr[data-g2wm-page-group]').length,
      launchPriorityPages: launchGuide?.querySelectorAll('[data-g2wm-launch-action="decide"] li[data-g2wm-page-group]').length,
      launchActions: [...(launchGuide?.querySelectorAll('[data-g2wm-launch-check]') || [])].reduce((counts, check) => {
        counts[check.dataset.g2wmLaunchAction] = (counts[check.dataset.g2wmLaunchAction] || 0) + 1; return counts;
      }, {}),
      launchProjectData: launchGuide?.querySelector('[data-g2wm-launch-project]')?.textContent,
      launchSitemapUrls: [...(launchGuide?.querySelectorAll('[data-g2wm-launch-files] [data-g2wm-sitemap-files] a') || [])].map(a => a.href),
      launchNoFixedExamples: !launchGuide?.textContent.includes('simvol-2027-koza') &&
        !launchGuide?.textContent.includes('G2WM_LAUNCH_'),
      launchPassedDisabled: launch?.querySelector('[data-g2wm-review="passed"]')?.disabled,
      progressLabel: block?.querySelector('[data-g2sb-progress]')?.textContent,
      guideHeadings: [...(guide?.querySelectorAll('h3, h4, h5, h6') || [])].map(node => node.textContent),
      hasSslError: guide?.textContent.includes('NET::ERR_CERT_AUTHORITY_INVALID'),
      hasCurrentResult: guide?.textContent.includes('Текущий результат: требует проверки.'),
      sourceAddress: step?.querySelector('.g2mu-source strong')?.textContent,
      link: block?.querySelector('a[href="https://webmaster.yandex.ru/"]')?.href,
      sections: block?.querySelectorAll('[data-g2wm-section]').length, steps: block?.querySelectorAll('[data-g2sb-step-id]').length,
      editors: block?.querySelectorAll('[data-g2step-action], [data-g2seo-editor]').length,
      related: block?.querySelectorAll('.g2s4-related').length,
      progress: block?.querySelectorAll('progress').length,
      evidenceInputs: block?.querySelectorAll('[data-g2wm-evidence], .g2mu-evidence').length,
      newReviews: Object.keys(g2wmReviews()).length,
      serviceSteps: G2WM_CONFIG.steps.length, wizardSteps: g2wDef('webmaster').steps.length,
      effectiveSteps: g2StepServiceConfig(G2WM_CONFIG).steps.length,
      sourcesAvailable: !!G2_SEO_STEPS['company-webmaster']?.rights && typeof g2SeoSnapshot === 'function',
      unchanged: before === after, roundTripRecord: JSON.stringify(g2wRecord(g2wDef('webmaster'), '', false, roundTrip)) === JSON.stringify(record),
      roundTripLayout: JSON.stringify(roundTrip.project.gate2StepLayoutsV1.company['service:company-webmaster']) === JSON.stringify(legacyLayout),
      notNeededStatus: infra ? g2wmStatus(notNeeded) : 'missing_infra',
      wizardStatus: g2wStatus(g2wDef('webmaster')), serviceStatus: g2ServiceBlockStatus(G2WM_CONFIG),
      otherUnchanged: JSON.stringify(other) === JSON.stringify(currentOther),
      otherBlocks: ['company-domain', 'company-yandex-business', 'company-yandex-direct'].every(id => !!document.querySelector('[data-g2sb-id="' + id + '"]')),
      viewport: innerWidth, width: document.documentElement.scrollWidth };
  })()`);
  assert(init.exists); assert.equal(init.title, 'Яндекс Вебмастер · Компания');
  assert.equal(init.sectionTitle, '1. Подключение сайта');
  assert.equal(init.sectionOpen, true);
  assert.equal(init.stepTitle, 'Основной адрес сайта'); assert.equal(init.stepNumber, '1.1');
  assert.equal(init.stepStatus, 'recheck'); assert.equal(init.progressLabel, '0 из 8 шагов');
  assert.equal(init.rightsTitle, 'Подтверждение прав'); assert.equal(init.rightsNumber, '1.2');
  assert.equal(init.rightsStatus, 'recheck'); assert.equal(init.rightsFields, 0);
  assert(init.rightsHeadings.includes('1.2. Подтверждение прав'));
  assert(init.rightsHeadings.includes('Б. Проверить существующие права доступа'));
  assert(init.rightsCurrentResult);
  assert.equal(init.indexingSectionTitle, '2. Доступность для индексирования');
  assert.equal(init.indexingTitle, 'Проверка доступности страниц');
  assert.equal(init.indexingNumber, '2.1'); assert.equal(init.indexingStatus, 'not_started');
  assert.equal(init.indexingFields, 0);
  assert(init.indexingHeading.includes('2.1. Проверка доступности страниц'));
  assert(init.indexingHeading.includes('Адреса страниц проекта для проверки'));
  assert(init.indexingPages > 0 && init.indexingUrl === 'https://k-apple.ru/');
  assert(init.indexingNoExample);
  assert.equal(init.sitemapTitle, 'Проверка Sitemap'); assert.equal(init.sitemapNumber, '2.2');
  assert.equal(init.sitemapStatus, 'not_started'); assert.equal(init.sitemapFields, 0);
  assert(init.sitemapHeadings.includes('2.2. Проверка Sitemap'));
  assert(init.sitemapHeadings.includes('Sitemap проекта для проверки'));
  assert(init.sitemapFiles.includes('https://k-apple.ru/sitemap.xml'));
  assert(init.sitemapFiles.includes('https://k-apple.ru/sitemap-store.xml'));
  assert(init.sitemapFiles.includes('https://k-apple.ru/sitemap-feeds.xml'));
  assert(init.sitemapSavedStatus && init.sitemapTargetPages === init.indexingPages && init.sitemapNoOldClaims);
  assert.equal(init.searchSectionTitle, '3. Первичная проверка индексации и ранжирования');
  assert.equal(init.searchTitle, 'Страницы в поиске'); assert.equal(init.searchNumber, '3.1');
  assert.equal(init.searchStatus, 'not_started'); assert.equal(init.searchFields, init.searchPages * 6);
  assert(init.searchHeadings.includes('3.1. Страницы в поиске'));
  assert(init.searchHeadings.includes('Страницы выбранного проекта для проверки'));
  assert(init.searchPages > 0 && init.searchExclusions && init.searchCatalog && init.searchAllOtherPages);
  assert.deepEqual(init.searchPageSections, ['home', 'contacts', 'commercial', 'about', 'blog']);
  assert.equal(init.searchCommercialHeading, 'Коммерческие страницы (Категория)');
  assert.deepEqual(init.searchActions.map(item => item.action), ['prepare', 'open', 'verify', 'history', 'search', 'record']);
  assert(init.searchActions.every(item => item.count === init.searchPages && item.progress === `Выполнено для 0 из ${init.searchPages} страниц`));
  assert.equal(init.searchCheckboxes, init.searchPages * 6); assert.equal(init.searchChecked, 0);
  const openHeading = init.searchHeadings.indexOf('Б. Открыть Яндекс Вебмастер');
  const findHeading = init.searchHeadings.indexOf('В. Найти конкретную страницу');
  const verifyHeading = init.searchHeadings.indexOf('Г. Проверить результат индексирования');
  assert(openHeading >= 0 && findHeading > openHeading &&
    init.searchHeadings.slice(openHeading + 1, findHeading).includes('Страницы выбранного проекта для проверки'));
  assert(verifyHeading > findHeading &&
    !init.searchHeadings.slice(findHeading + 1, verifyHeading).includes('Страницы выбранного проекта для проверки'));
  assert.equal(init.searchProgress, `Выполнено для 0 из ${init.searchPages} страниц`);
  assert(init.searchPassedDisabled && init.searchFilterCount > 0 && init.searchNoSingleExample);
  assert.equal(init.searchHome, 'https://k-apple.ru/'); assert(init.searchNoOldClaims);
  assert.equal(init.priorityTitle, 'Проверка приоритетных URL'); assert.equal(init.priorityNumber, '3.2');
  assert.equal(init.priorityStatus, 'not_started'); assert.equal(init.priorityPages, init.searchPages);
  assert.deepEqual(init.prioritySections, ['home', 'contacts', 'commercial', 'about', 'blog']);
  assert.deepEqual(init.priorityActions.map(item => item.action),
    ['prepare', 'check', 'monitor', 'diagnose', 'compare', 'fix', 'decide', 'submit', 'verify', 'record']);
  assert(init.priorityActions.every(item => item.count === init.priorityPages &&
    item.progress === `Выполнено для 0 из ${init.priorityPages} страниц`));
  assert.equal(init.priorityCheckBoxes, init.priorityPages * 10);
  assert(init.priorityPassedDisabled && init.priorityNoOldClaims && init.priorityNoPlaceholders);
  assert.equal(init.visibilityTitle, 'Проверка поисковой видимости и позиций');
  assert.equal(init.visibilityNumber, '3.3'); assert.equal(init.visibilityStatus, 'not_started');
  assert.equal(init.visibilityPages, init.searchPages);
  assert.deepEqual(init.visibilitySections, ['home', 'contacts', 'commercial', 'about', 'blog']);
  assert.deepEqual(init.visibilityActions.map(item => item.action),
    ['prepare', 'select', 'configure', 'metrics', 'queries', 'advanced', 'fallback', 'record']);
  assert(init.visibilityActions.every(item => item.count === init.visibilityPages &&
    item.progress === `Выполнено для 0 из ${init.visibilityPages} страниц`));
  assert.equal(init.visibilityCheckBoxes, init.visibilityPages * 8);
  assert(init.visibilityPassedDisabled && init.visibilityNoOldClaims && init.visibilityNoPlaceholders);
  assert.equal(init.launchTitle, 'Первичный запуск индексирования всех страниц');
  assert.equal(init.launchNumber, '3.4'); assert.equal(init.launchStatus, 'not_started');
  assert(init.launchAllPages > 0 && init.launchPriorityPages > 0);
  assert.deepEqual(init.launchActions, { sitemap: init.launchAllPages, decide: init.launchPriorityPages,
    submit: init.launchPriorityPages, verify: init.launchPriorityPages, diagnose: init.launchPriorityPages });
  assert(init.launchProjectData.includes('Коричное яблоко') && init.launchProjectData.includes('https://k-apple.ru/'));
  assert(init.launchSitemapUrls.includes('https://k-apple.ru/sitemap.xml'));
  assert(init.launchNoFixedExamples && init.launchPassedDisabled);
  const priorityFlow = await evaluate(`(() => {
    const row = document.querySelector('[data-g2wm-step="s32"]');
    const first = row.querySelector('[data-g2wm-priority-action="prepare"] [data-g2wm-priority-check]');
    first.click();
    const partial = g2wmStepStatus('s32') === 'in_progress' && g2wmPriorityCheckedCount() === 1 &&
      g2wmSearchCheckedCount() === 0 && first.isConnected;
    first.click();
    const reset = g2wmStepStatus('s32') === 'not_started' && g2wmPriorityCheckedCount() === 0;
    const project = structuredClone(state);
    project.project.name = 'Другой проект';
    g2wRecord(g2wDef('domain'), '', true, project).values.platform = 'wordpress';
    megaPlatformSetUrl('fixed', 'home', 'https://other.example/', project);
    for (const page of g2wmPriorityPages(project)) {
      if (page.group !== 'fixed' || page.id !== 'home')
        megaPlatformSetUrl(page.group, page.id, 'https://other.example/page-' + encodeURIComponent(page.id), project);
    }
    const alternativeGuide = document.createElement('div'); alternativeGuide.innerHTML = g2wmPriorityGuideHtml(project);
    const adapted = alternativeGuide.textContent.includes('Другой проект') &&
      alternativeGuide.textContent.includes('https://other.example/') &&
      !alternativeGuide.textContent.includes('k-apple.ru') && !alternativeGuide.textContent.includes('Tilda') &&
      !alternativeGuide.textContent.includes('G2WM_PRIORITY_');
    const pages = g2wmPriorityPages(project);
    const review = g2wmReviews(project, true).s32 ||= {};
    review.pageChecks ||= {}; review.actionChecks ||= {};
    const mark = (action, page) => {
      const checks = action === 'prepare' ? review.pageChecks : (review.actionChecks[action] ||= {});
      checks[g2wmSearchPageKey(page)] = { checked: true, url: page.url, name: page.name,
        checkedAt: new Date().toISOString() };
    };
    for (const page of pages) for (const action of ['prepare', 'monitor', 'decide', 'record']) mark(action, page);
    const alternativeComplete = g2wmPriorityCanComplete(project) && g2wmSearchCheckedCount(g2wmSearchPages(project), project) === 0;
    review.result = 'passed'; review.fingerprint = g2wmFingerprint('s32', project);
    const ready = g2wmStepStatus('s32', project) === 'ready';
    mark('submit', pages[0]);
    const followupRequired = !g2wmPriorityCanComplete(project) && g2wmStepStatus('s32', project) === 'needs_check';
    mark('verify', pages[0]);
    const followupComplete = g2wmStepStatus('s32', project) === 'ready';
    megaPlatformSetUrl(pages[0].group, pages[0].id, 'https://other.example/changed-url', project);
    const changedUrlRecheck = g2wmStepStatus('s32', project) === 'recheck';
    return { partial, reset, adapted, alternativeComplete, ready, followupRequired, followupComplete,
      changedUrlRecheck, pageCount: pages.length };
  })()`);
  assert(Object.entries(priorityFlow).every(([key, value]) => key === 'pageCount' ? value === init.priorityPages : value === true));
  const visibilityFlow = await evaluate(`(() => {
    const row = document.querySelector('[data-g2wm-step="s33"]');
    const first = row.querySelector('[data-g2wm-visibility-action="prepare"] [data-g2wm-visibility-check]');
    first.click();
    const partial = g2wmStepStatus('s33') === 'in_progress' && g2wmVisibilityCheckedCount() === 1 &&
      g2wmPriorityCheckedCount() === 0 && g2wmSearchCheckedCount() === 0 && first.isConnected;
    first.click();
    const reset = g2wmStepStatus('s33') === 'not_started' && g2wmVisibilityCheckedCount() === 0;
    const project = structuredClone(state);
    project.project.name = 'Другой проект'; project.project.geography = 'Санкт-Петербург';
    megaPlatformSetUrl('fixed', 'home', 'https://other.example/', project);
    for (const page of g2wmVisibilityPages(project)) {
      if (page.group !== 'fixed' || page.id !== 'home')
        megaPlatformSetUrl(page.group, page.id, 'https://other.example/page-' + encodeURIComponent(page.id), project);
    }
    const guide = document.createElement('div'); guide.innerHTML = g2wmVisibilityGuideHtml(project);
    const adapted = guide.textContent.includes('Другой проект') && guide.textContent.includes('Санкт-Петербург') &&
      guide.textContent.includes('https://other.example/') && !guide.textContent.includes('k-apple.ru') &&
      !guide.textContent.includes('simvol-2027-koza') && !guide.textContent.includes('Tilda') &&
      !guide.textContent.includes('G2WM_VISIBILITY_');
    const pages = g2wmVisibilityPages(project);
    const review = g2wmReviews(project, true).s33 ||= {};
    review.pageChecks ||= {}; review.actionChecks ||= {};
    const mark = (action, page) => {
      const checks = action === 'prepare' ? review.pageChecks : (review.actionChecks[action] ||= {});
      checks[g2wmSearchPageKey(page)] = { checked: true, url: page.url, name: page.name,
        checkedAt: new Date().toISOString() };
    };
    for (const page of pages) for (const action of ['prepare', 'select', 'configure', 'record']) mark(action, page);
    const metricsRequired = !g2wmVisibilityCanComplete(project);
    for (const page of pages) mark('queries', page);
    const optionalDoesNotComplete = !g2wmVisibilityCanComplete(project);
    for (const page of pages) mark('metrics', page);
    const complete = g2wmVisibilityCanComplete(project) && g2wmSearchCheckedCount(g2wmSearchPages(project), project) === 0;
    review.result = 'passed'; review.fingerprint = g2wmFingerprint('s33', project);
    const ready = g2wmStepStatus('s33', project) === 'ready';
    megaPlatformSetUrl(pages[0].group, pages[0].id, 'https://other.example/changed-url', project);
    const changedUrlRecheck = g2wmStepStatus('s33', project) === 'recheck';
    return { partial, reset, adapted, metricsRequired, optionalDoesNotComplete, complete, ready,
      changedUrlRecheck, pageCount: pages.length };
  })()`);
  assert(Object.entries(visibilityFlow).every(([key, value]) => key === 'pageCount' ? value === init.visibilityPages : value === true));
  const launchFlow = await evaluate(`(() => {
    const row = document.querySelector('[data-g2wm-step="s34"]');
    const first = row.querySelector('[data-g2wm-launch-action="sitemap"] [data-g2wm-launch-check]');
    first.click();
    const partial = g2wmStepStatus('s34') === 'in_progress' && g2wmLaunchCheckedCount(g2wmLaunchPages()) === 1 &&
      g2wmPriorityCheckedCount() === 0 && first.isConnected;
    first.click();
    const reset = g2wmStepStatus('s34') === 'not_started' && g2wmLaunchCheckedCount(g2wmLaunchPages()) === 0;
    const project = structuredClone(state);
    project.project.id = 'webmaster-launch-other'; project.project.name = 'Другой проект';
    g2wRecord(g2wDef('domain'), '', true, project).values.platform = 'wordpress';
    megaPlatformSetUrl('fixed', 'home', 'https://other.example/', project);
    const product = guruV194Products(project)[0];
    megaPlatformSetUrl('products', product.id, 'https://other.example/product-1', project);
    const seo = g2SeoStore('company-webmaster', '', project).cards['card-14'].robotsV130;
    seo.url = 'https://other.example/robots.txt';
    seo.yandex.sitemaps = [{ url: 'https://other.example/sitemap.xml', status: 'ok' }];
    const counterCard = g2MetrikaCompanyCardV374('counter', project);
    (counterCard.fields[G2_METRIKA_COMPANY_FIELD_V374] ||= {}).counterId = '246813579';
    const pages = g2wmLaunchPages(project), priority = g2wmLaunchPriorityPages(project);
    const hasProduct = pages.some(page => page.group === 'products' && page.id === product.id) &&
      !priority.some(page => page.group === 'products');
    const guide = document.createElement('div'); guide.innerHTML = g2wmLaunchGuideHtml(project);
    const adapted = guide.textContent.includes('Другой проект') && guide.textContent.includes('246813579') &&
      guide.textContent.includes('https://other.example/sitemap.xml') &&
      guide.querySelector('[data-g2wm-launch-action="sitemap"] tbody tr[data-g2wm-page-group="products"]') &&
      !guide.textContent.includes('k-apple.ru') && !guide.textContent.includes('105213127') &&
      !guide.textContent.includes('Tilda') && !guide.textContent.includes('G2WM_LAUNCH_');
    const review = g2wmReviews(project, true).s34 ||= {};
    review.pageChecks ||= {}; review.actionChecks ||= {};
    const mark = (action, page) => {
      const checks = action === 'sitemap' ? review.pageChecks : (review.actionChecks[action] ||= {});
      checks[g2wmSearchPageKey(page)] = { checked: true, url: page.url, name: page.name,
        checkedAt: new Date().toISOString() };
    };
    for (const page of pages) mark('sitemap', page);
    for (const page of priority) mark('decide', page);
    const complete = g2wmLaunchCanComplete(project);
    review.result = 'passed'; review.fingerprint = g2wmFingerprint('s34', project);
    const ready = g2wmStepStatus('s34', project) === 'ready';
    mark('submit', priority[0]);
    const followupRequired = !g2wmLaunchCanComplete(project) && g2wmStepStatus('s34', project) === 'needs_check';
    mark('verify', priority[0]);
    const followupComplete = g2wmStepStatus('s34', project) === 'ready';
    seo.url = 'https://other.example/changed-robots.txt';
    const changedRobotsRecheck = g2wmStepStatus('s34', project) === 'recheck';
    seo.url = 'https://other.example/robots.txt';
    megaPlatformSetUrl('products', product.id, 'https://other.example/product-updated', project);
    const changedUrlRecheck = g2wmStepStatus('s34', project) === 'recheck';
    return { partial, reset, hasProduct, adapted: !!adapted, complete, ready, followupRequired,
      followupComplete, changedRobotsRecheck, changedUrlRecheck, allCount: pages.length, priorityCount: priority.length };
  })()`);
  assert(Object.entries(launchFlow).every(([key, value]) => ['allCount', 'priorityCount'].includes(key)
    ? value > 0 : value === true), JSON.stringify(launchFlow));
  assert(launchFlow.allCount > launchFlow.priorityCount);
  assert.equal(init.sourceAddress, 'https://k-apple.ru/');
  assert(init.guideHeadings.includes('1. Подключение сайта'));
  assert(init.guideHeadings.includes('1.1. Основной адрес сайта'));
  assert(init.guideHeadings.includes('А. Определить основной адрес сайта'));
  assert(init.hasSslError && init.hasCurrentResult);
  assert.equal(init.link, 'https://webmaster.yandex.ru/');
  assert.equal(init.sections, 3); assert.equal(init.steps, 8); assert.equal(init.editors, 0); assert.equal(init.related, 0); assert.equal(init.progress, 1);
  assert.equal(init.evidenceInputs, 0);
  assert.equal(init.newReviews, 0);
  assert.equal(init.serviceSteps, 0); assert.equal(init.wizardSteps, 0); assert.equal(init.effectiveSteps, 0);
  assert(init.sourcesAvailable && init.unchanged && init.roundTripRecord && init.roundTripLayout);
  assert(init.otherUnchanged && init.otherBlocks); assert(init.width <= init.viewport + 1);
  assert.equal(init.status, 'in_progress');
  assert.equal(init.notNeededStatus, 'not_needed');
  assert.equal(init.wizardStatus, init.status); assert.equal(init.serviceStatus, init.status);
  const desktopClip = await evaluate(`(() => { const block = document.querySelector('[data-g2sb-id="company-webmaster"]'); block.querySelector('.g2wm-section').open = true; block.querySelector('.g2wm-guide').open = true;
    const r = block.getBoundingClientRect(); return { x: Math.max(0,r.left + scrollX - 8), y: Math.max(0,r.top + scrollY - 8), width: r.width + 16, height: Math.min(r.height + 16, 1200), scale: 1 }; })()`);
  const desktop = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: desktopClip });
  writeFileSync(`${folder}/main-address-desktop.png`, Buffer.from(desktop.data, 'base64'));
  const rightsDesktopClip = await evaluate(`(() => { const row = document.querySelector('[data-g2wm-step="s12"]'); row.querySelector('.g2wm-guide').open = true;
    const r = row.getBoundingClientRect(); return { x: Math.max(0,r.left + scrollX - 8), y: Math.max(0,r.top + scrollY - 8), width: r.width + 16, height: Math.min(r.height + 16, 1100), scale: 1 }; })()`);
  const rightsDesktop = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: rightsDesktopClip });
  writeFileSync(`${folder}/rights-desktop.png`, Buffer.from(rightsDesktop.data, 'base64'));
  const indexingDesktopClip = await evaluate(`(() => { const row = document.querySelector('[data-g2wm-step="s21"]');
    row.closest('[data-g2wm-section]').open = true; row.querySelector('.g2wm-guide').open = true;
    const r = row.getBoundingClientRect(); return { x: Math.max(0,r.left + scrollX - 8), y: Math.max(0,r.top + scrollY - 8), width: r.width + 16, height: Math.min(r.height + 16, 1250), scale: 1 }; })()`);
  const indexingDesktop = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: indexingDesktopClip });
  writeFileSync(`${folder}/indexing-desktop.png`, Buffer.from(indexingDesktop.data, 'base64'));
  const sitemapDesktopClip = await evaluate(`(() => { const row = document.querySelector('[data-g2wm-step="s22"]');
    row.closest('[data-g2wm-section]').open = true; row.querySelector('.g2wm-guide').open = true;
    const r = row.getBoundingClientRect(); return { x: Math.max(0,r.left + scrollX - 8), y: Math.max(0,r.top + scrollY - 8), width: r.width + 16, height: Math.min(r.height + 16, 1250), scale: 1 }; })()`);
  const sitemapDesktop = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: sitemapDesktopClip });
  writeFileSync(`${folder}/sitemap-desktop.png`, Buffer.from(sitemapDesktop.data, 'base64'));
  const sitemapFilesClip = await evaluate(`(() => { const r = document.querySelector('[data-g2wm-step="s22"] [data-g2wm-sitemap-files]').getBoundingClientRect();
    return { x: Math.max(0, r.left + scrollX - 8), y: Math.max(0, r.top + scrollY - 8), width: r.width + 16, height: r.height + 16, scale: 1 }; })()`);
  const sitemapFilesImage = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: sitemapFilesClip });
  writeFileSync(`${folder}/sitemap-files-desktop.png`, Buffer.from(sitemapFilesImage.data, 'base64'));
  const searchDesktopClip = await evaluate(`(() => { const row = document.querySelector('[data-g2wm-step="s31"]');
    row.closest('[data-g2wm-section]').open = true; row.querySelector('.g2wm-guide').open = true;
    const r = row.getBoundingClientRect(); return { x: Math.max(0,r.left + scrollX - 8), y: Math.max(0,r.top + scrollY - 8), width: r.width + 16, height: Math.min(r.height + 16, 1250), scale: 1 }; })()`);
  const searchDesktop = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: searchDesktopClip });
  writeFileSync(`${folder}/search-desktop.png`, Buffer.from(searchDesktop.data, 'base64'));
  const priorityDesktopClip = await evaluate(`(() => { const row = document.querySelector('[data-g2wm-step="s32"]');
    row.closest('[data-g2wm-section]').open = true; row.querySelector('.g2wm-guide').open = true;
    const r = row.getBoundingClientRect(); return { x: Math.max(0,r.left + scrollX - 8), y: Math.max(0,r.top + scrollY - 8), width: r.width + 16, height: Math.min(r.height + 16, 1250), scale: 1 }; })()`);
  const priorityDesktop = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: priorityDesktopClip });
  writeFileSync(`${folder}/priority-desktop.png`, Buffer.from(priorityDesktop.data, 'base64'));
  const visibilityDesktopClip = await evaluate(`(async () => { const row = document.querySelector('[data-g2wm-step="s33"]');
    row.closest('[data-g2wm-section]').open = true; row.querySelector('.g2wm-guide').open = true;
    row.scrollIntoView({ block: 'start' });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const r = row.getBoundingClientRect(); return { x: Math.max(0,r.left + scrollX - 8), y: Math.max(0,r.top + scrollY - 8), width: r.width + 16, height: Math.min(r.height + 16, 1250), scale: 1 }; })()`);
  const visibilityDesktop = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: visibilityDesktopClip });
  writeFileSync(`${folder}/visibility-desktop.png`, Buffer.from(visibilityDesktop.data, 'base64'));
  await page.call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  const mobile = await evaluate(`(() => { renderGate(); document.querySelector('[data-g2y-company]').open = true;
    const block = document.querySelector('[data-g2sb-id="company-webmaster"]'); block.open = true;
    block.querySelector('.g2wm-section').open = true; block.querySelector('.g2wm-guide').open = true;
    return { sections: block.querySelectorAll('[data-g2wm-section]').length, steps: block.querySelectorAll('[data-g2sb-step-id]').length,
      related: block.querySelectorAll('.g2s4-related').length,
      title: block.querySelector('[data-g2wm-step="s11"] h5')?.textContent,
      rightsTitle: block.querySelector('[data-g2wm-step="s12"] h5')?.textContent,
      rightsFields: block.querySelector('[data-g2wm-step="s12"]').querySelectorAll('input, select, textarea, .g2mu-fields').length,
      sourceAddress: block.querySelector('.g2mu-source strong')?.textContent,
      viewport: innerWidth, width: document.documentElement.scrollWidth,
      record: g2wRecord(g2wDef('webmaster')).webmasterUnifiedV1.open.evidence,
      source: g2SeoStore('company-webmaster').marker }; })()`);
  assert.equal(mobile.sections, 3); assert.equal(mobile.steps, 8); assert.equal(mobile.related, 0);
  assert.equal(mobile.title, 'Основной адрес сайта'); assert.equal(mobile.sourceAddress, 'https://k-apple.ru/');
  assert.equal(mobile.rightsTitle, 'Подтверждение прав'); assert.equal(mobile.rightsFields, 0);
  assert.equal(mobile.record, 'Историческая проверка'); assert.equal(mobile.source, 'Сохранённый SEO-источник');
  assert(mobile.width <= mobile.viewport + 1);
  const mobileClip = await evaluate(`(() => { const r = document.querySelector('[data-g2sb-id="company-webmaster"]').getBoundingClientRect(); return { x: Math.max(0,r.left + scrollX - 4), y: Math.max(0,r.top + scrollY - 4), width: Math.min(innerWidth, r.width + 8), height: Math.min(r.height + 8, 1200), scale: 1 }; })()`);
  const image = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: mobileClip });
  writeFileSync(`${folder}/main-address-mobile.png`, Buffer.from(image.data, 'base64'));
  const rightsMobileClip = await evaluate(`(() => { const row = document.querySelector('[data-g2wm-step="s12"]'); row.querySelector('.g2wm-guide').open = true;
    const r = row.getBoundingClientRect(); return { x: Math.max(0,r.left + scrollX - 4), y: Math.max(0,r.top + scrollY - 4), width: Math.min(innerWidth, r.width + 8), height: Math.min(r.height + 8, 1100), scale: 1 }; })()`);
  const rightsImage = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: rightsMobileClip });
  writeFileSync(`${folder}/rights-mobile.png`, Buffer.from(rightsImage.data, 'base64'));
  const indexingMobileClip = await evaluate(`(() => { const row = document.querySelector('[data-g2wm-step="s21"]'); row.closest('[data-g2wm-section]').open = true;
    row.querySelector('.g2wm-guide').open = true; const r = row.getBoundingClientRect();
    return { x: Math.max(0,r.left + scrollX - 4), y: Math.max(0,r.top + scrollY - 4), width: Math.min(innerWidth, r.width + 8), height: Math.min(r.height + 8, 1250), scale: 1 }; })()`);
  const indexingMobile = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: indexingMobileClip });
  writeFileSync(`${folder}/indexing-mobile.png`, Buffer.from(indexingMobile.data, 'base64'));
  const sitemapMobileClip = await evaluate(`(() => { const row = document.querySelector('[data-g2wm-step="s22"]'); row.closest('[data-g2wm-section]').open = true;
    row.querySelector('.g2wm-guide').open = true; const r = row.getBoundingClientRect();
    return { x: Math.max(0,r.left + scrollX - 4), y: Math.max(0,r.top + scrollY - 4), width: Math.min(innerWidth, r.width + 8), height: Math.min(r.height + 8, 1250), scale: 1 }; })()`);
  const sitemapMobile = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: sitemapMobileClip });
  writeFileSync(`${folder}/sitemap-mobile.png`, Buffer.from(sitemapMobile.data, 'base64'));
  const sitemapMobileWidth = await evaluate('document.documentElement.scrollWidth');
  assert(sitemapMobileWidth <= 390);
  const searchMobileClip = await evaluate(`(() => { const row = document.querySelector('[data-g2wm-step="s31"]'); row.closest('[data-g2wm-section]').open = true;
    row.querySelector('.g2wm-guide').open = true; const r = row.getBoundingClientRect();
    return { x: Math.max(0,r.left + scrollX - 4), y: Math.max(0,r.top + scrollY - 4), width: Math.min(innerWidth, r.width + 8), height: Math.min(r.height + 8, 1250), scale: 1 }; })()`);
  const searchMobile = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: searchMobileClip });
  writeFileSync(`${folder}/search-mobile.png`, Buffer.from(searchMobile.data, 'base64'));
  assert(await evaluate('document.documentElement.scrollWidth <= 390'));
  const mobileSearchList = await evaluate(`(() => { const list = document.querySelector('[data-g2wm-step="s31"] [data-g2wm-search-pages]');
    const first = list.querySelector('tbody tr'); const box = first.querySelector('[data-g2wm-search-check]').getBoundingClientRect();
    const r = list.getBoundingClientRect();
    return { visibleCheck: box.left >= 0 && box.right <= innerWidth,
      clip: { x: Math.max(0, r.left + scrollX - 4), y: Math.max(0, r.top + scrollY - 4),
        width: Math.min(innerWidth, r.width + 8), height: Math.min(r.height + 8, 1200), scale: 1 } }; })()`);
  assert(mobileSearchList.visibleCheck);
  const mobileSearchListImage = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: mobileSearchList.clip });
  writeFileSync(`${folder}/search-pages-mobile.png`, Buffer.from(mobileSearchListImage.data, 'base64'));
  const mobilePriorityList = await evaluate(`(() => { const row = document.querySelector('[data-g2wm-step="s32"]');
    row.closest('[data-g2wm-section]').open = true; row.querySelector('.g2wm-guide').open = true;
    const list = row.querySelector('[data-g2wm-priority-action="prepare"]');
    const first = list.querySelector('tbody tr[data-g2wm-page-group]');
    const box = first.querySelector('[data-g2wm-priority-check]').getBoundingClientRect();
    const r = list.getBoundingClientRect();
    return { visibleCheck: box.left >= 0 && box.right <= innerWidth, width: document.documentElement.scrollWidth,
      clip: { x: Math.max(0, r.left + scrollX - 4), y: Math.max(0, r.top + scrollY - 4),
        width: Math.min(innerWidth, r.width + 8), height: Math.min(r.height + 8, 1200), scale: 1 } }; })()`);
  assert(mobilePriorityList.visibleCheck && mobilePriorityList.width <= 390);
  const mobilePriorityImage = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: mobilePriorityList.clip });
  writeFileSync(`${folder}/priority-pages-mobile.png`, Buffer.from(mobilePriorityImage.data, 'base64'));
  const mobileVisibilityList = await evaluate(`(() => { const row = document.querySelector('[data-g2wm-step="s33"]');
    row.closest('[data-g2wm-section]').open = true; row.querySelector('.g2wm-guide').open = true;
    const list = row.querySelector('[data-g2wm-visibility-action="prepare"]');
    const first = list.querySelector('tbody tr[data-g2wm-page-group]');
    const box = first.querySelector('[data-g2wm-visibility-check]').getBoundingClientRect();
    const r = list.getBoundingClientRect();
    return { visibleCheck: box.left >= 0 && box.right <= innerWidth, width: document.documentElement.scrollWidth,
      clip: { x: Math.max(0, r.left + scrollX - 4), y: Math.max(0, r.top + scrollY - 4),
        width: Math.min(innerWidth, r.width + 8), height: Math.min(r.height + 8, 1200), scale: 1 } }; })()`);
  assert(mobileVisibilityList.visibleCheck && mobileVisibilityList.width <= 390);
  const mobileVisibilityImage = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: mobileVisibilityList.clip });
  writeFileSync(`${folder}/visibility-pages-mobile.png`, Buffer.from(mobileVisibilityImage.data, 'base64'));
  const mobileLaunchList = await evaluate(`(() => { const row = document.querySelector('[data-g2wm-step="s34"]');
    row.closest('[data-g2wm-section]').open = true; row.querySelector('.g2wm-guide').open = true;
    const list = row.querySelector('[data-g2wm-launch-action="sitemap"]');
    const first = list.querySelector('tbody tr[data-g2wm-page-group]');
    const box = first.querySelector('[data-g2wm-launch-check]').getBoundingClientRect();
    const r = list.getBoundingClientRect();
    return { visibleCheck: box.left >= 0 && box.right <= innerWidth, width: document.documentElement.scrollWidth,
      clip: { x: Math.max(0, r.left + scrollX - 4), y: Math.max(0, r.top + scrollY - 4),
        width: Math.min(innerWidth, r.width + 8), height: Math.min(r.height + 8, 1200), scale: 1 } }; })()`);
  assert(mobileLaunchList.visibleCheck && mobileLaunchList.width <= 390);
  const mobileLaunchImage = await page.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: mobileLaunchList.clip });
  writeFileSync(`${folder}/launch-pages-mobile.png`, Buffer.from(mobileLaunchImage.data, 'base64'));
  const reviews = await evaluate(`(() => {
    const row = document.querySelector('[data-g2wm-step="s11"]');
    const rightsRow = document.querySelector('[data-g2wm-step="s12"]');
    const old = JSON.stringify({ legacy: g2wmRecord().webmasterUnifiedV1,
      seo: g2SeoStore('company-webmaster'), layout: state.project.gate2StepLayoutsV1.company['service:company-webmaster'] });
    row.querySelector('[data-g2wm-review="pending"]').click();
    const pending = g2wmStepStatus('s11');
    row.querySelector('[data-g2wm-review="failed"]').click();
    const problem = g2wmStepStatus('s11');
    row.querySelector('[data-g2wm-review="passed"]').click();
    const ready = g2wmStepStatus('s11'), blockAfterFirst = g2wmStatus();
    const readyWithoutEvidence = ready === 'ready' && !g2wmReviews().s11.evidence;
    rightsRow.querySelector('[data-g2wm-review="pending"]').click();
    const rightsPending = g2wmStepStatus('s12');
    rightsRow.querySelector('[data-g2wm-review="failed"]').click();
    const rightsProblem = g2wmStepStatus('s12');
    rightsRow.querySelector('[data-g2wm-review="passed"]').click();
    const rightsReady = g2wmStepStatus('s12'), blockReady = g2wmStatus();
    const firstUnchanged = g2wmStepStatus('s11') === 'ready';
    const indexingRow = document.querySelector('[data-g2wm-step="s21"]');
    indexingRow.querySelector('[data-g2wm-review="pending"]').click();
    const indexingPending = g2wmStepStatus('s21');
    indexingRow.querySelector('[data-g2wm-review="failed"]').click();
    const indexingProblem = g2wmStepStatus('s21');
    indexingRow.querySelector('[data-g2wm-review="passed"]').click();
    const indexingReady = g2wmStepStatus('s21'), blockAfterIndexing = g2wmStatus();
    const sitemapRow = document.querySelector('[data-g2wm-step="s22"]');
    sitemapRow.querySelector('[data-g2wm-review="pending"]').click();
    const sitemapPending = g2wmStepStatus('s22');
    sitemapRow.querySelector('[data-g2wm-review="failed"]').click();
    const sitemapProblem = g2wmStepStatus('s22');
    sitemapRow.querySelector('[data-g2wm-review="passed"]').click();
    const sitemapReady = g2wmStepStatus('s22'), blockFullyReady = g2wmStatus();
    const searchRow = document.querySelector('[data-g2wm-step="s31"]');
    const searchBoxes = [...searchRow.querySelectorAll('[data-g2wm-search-action="prepare"] [data-g2wm-search-check]')];
    searchBoxes[0].click();
    const searchPartial = g2wmStepStatus('s31');
    const firstSaved = g2wmReviews().s31.pageChecks[g2wmSearchPageKey(g2wmSearchPages()[0])]?.checked;
    const firstConnected = searchBoxes[0].isConnected;
    searchBoxes[0].click();
    const searchUnchecked = g2wmStepStatus('s31');
    const searchUncheckedCount = g2wmSearchCheckedCount();
    const secondConnected = searchBoxes[0].isConnected;
    const firstDomChecked = searchRow.querySelector('[data-g2wm-search-action="prepare"] [data-g2wm-search-check]')?.checked;
    searchRow.querySelector('[data-g2wm-search-action="verify"] details').open = true;
    const verifyFirstBeforeReview = searchRow.querySelector('[data-g2wm-search-action="verify"] [data-g2wm-search-check]');
    verifyFirstBeforeReview.click();
    const stageIndependent = g2wmSearchCheckedCount(g2wmSearchPages(), state, 'verify') === 1 && g2wmSearchCheckedCount() === 0;
    verifyFirstBeforeReview.click();
    searchRow.querySelector('[data-g2wm-search-action="open"] details').open = true;
    const openFirstBeforeReview = searchRow.querySelector('[data-g2wm-search-action="open"] [data-g2wm-search-check]');
    openFirstBeforeReview.click();
    const openIndependent = g2wmSearchCheckedCount(g2wmSearchPages(), state, 'open') === 1 &&
      g2wmSearchCheckedCount(g2wmSearchPages(), state, 'verify') === 0;
    openFirstBeforeReview.click();
    searchRow.querySelector('[data-g2wm-review="pending"]').click();
    const searchPending = g2wmStepStatus('s31');
    searchRow.querySelector('[data-g2wm-review="failed"]').click();
    const searchProblem = g2wmStepStatus('s31');
    const searchPassedDisabled = searchRow.querySelector('[data-g2wm-review="passed"]').disabled;
    const searchBoxesAfterReview = [...searchRow.querySelectorAll('[data-g2wm-search-action="prepare"] [data-g2wm-search-check]')];
    searchBoxesAfterReview.forEach(box => box.click());
    const prepareCompleteButNotReady = searchRow.querySelector('[data-g2wm-review="passed"]').disabled;
    for (const action of ['open', 'verify', 'record']) {
      const stage = searchRow.querySelector('[data-g2wm-search-action="' + action + '"]');
      stage.querySelector('details').open = true;
      stage.querySelectorAll('[data-g2wm-search-check]').forEach(box => box.click());
    }
    const searchAllChecked = ['prepare', 'open', 'verify', 'record'].every(action =>
      searchRow.querySelectorAll('[data-g2wm-search-action="' + action + '"] [data-g2wm-search-check]:checked').length === searchBoxesAfterReview.length);
    const searchOptionalUnchecked = ['history', 'search'].every(action =>
      searchRow.querySelectorAll('[data-g2wm-search-action="' + action + '"] [data-g2wm-search-check]:checked').length === 0);
    const searchProgress = searchRow.querySelector('[data-g2wm-search-action="prepare"] [data-g2wm-search-progress]')?.textContent;
    const searchPassedEnabled = !searchRow.querySelector('[data-g2wm-review="passed"]').disabled;
    searchRow.querySelector('[data-g2wm-review="passed"]').click();
    const searchReady = g2wmStepStatus('s31'), blockFullyReadyAfterSearch = g2wmStatus();
    const readySearchBox = searchRow.querySelector('[data-g2wm-search-action="verify"] [data-g2wm-search-check]');
    readySearchBox.click();
    const searchReopened = g2wmStepStatus('s31');
    readySearchBox.click();
    const searchRestored = g2wmStepStatus('s31');
    const changedSite = structuredClone(state);
    megaPlatformSetUrl('fixed', 'home', 'https://other.example/', changedSite);
    const stale = g2wmStepStatus('s11', changedSite), rightsStale = g2wmStepStatus('s12', changedSite);
    const indexingStale = g2wmStepStatus('s21', changedSite);
    const sitemapStale = g2wmStepStatus('s22', changedSite);
    const searchStale = g2wmStepStatus('s31', changedSite);
    const noHome = structuredClone(state);
    megaPlatformSetUrl('fixed', 'home', '', noHome);
    g2wmReviews(noHome).s21.fingerprint = g2wmFingerprint('s21', noHome);
    const indexingWithoutHome = g2wmStepStatus('s21', noHome);
    g2wmReviews(noHome).s22.fingerprint = g2wmFingerprint('s22', noHome);
    const sitemapWithoutHome = g2wmStepStatus('s22', noHome);
    g2wmReviews(noHome).s31.fingerprint = g2wmFingerprint('s31', noHome);
    const searchWithoutHome = g2wmStepStatus('s31', noHome);
    const noMaps = structuredClone(state);
    g2SeoStore('company-webmaster', '', noMaps).cards['card-14'].robotsV130.yandex.sitemaps = [{ url: '', status: '' }];
    g2wmReviews(noMaps).s22.fingerprint = g2wmFingerprint('s22', noMaps);
    const sitemapWithoutFiles = g2wmStepStatus('s22', noMaps);
    changedSite.project.name = 'Другой проект';
    g2wRecord(g2wDef('domain'), '', true, changedSite).values.platform = 'wordpress';
    const category = changedSite.project.productRegistryV185?.[0];
    const product = changedSite.project.catalogItemsV189?.[0];
    if (category) megaPlatformSetUrl('categories', category.id, 'https://other.example/category', changedSite);
    if (product) megaPlatformSetUrl('products', product.id, 'https://other.example/product', changedSite);
    const altRobots = g2SeoStore('company-webmaster', '', changedSite).cards['card-14'].robotsV130;
    altRobots.url = 'https://other.example/robots.txt';
    altRobots.yandex.sitemaps = [{ url: 'https://other.example/sitemap.xml', status: 'ok' },
      { url: 'https://other.example/products.xml', status: 'pending' }];
    const altGuide = document.createElement('div'); altGuide.innerHTML = g2wmIndexingGuideHtml(changedSite);
    const altRows = [...altGuide.querySelectorAll('[data-g2wm-indexing-urls] tbody tr')];
    const altUrls = altRows.map(row => row.querySelector('a')?.href).filter(Boolean);
    const alt = { name: altGuide.textContent.includes('Другой проект'),
      home: altUrls.includes('https://other.example/'),
      category: !category || altUrls.includes('https://other.example/category'),
      product: !product || altUrls.includes('https://other.example/product'),
      noOldDomain: !altGuide.textContent.includes('k-apple.ru'),
      noOldFacts: !altGuide.textContent.includes('204 мс'),
      noTilda: !altGuide.textContent.includes('Tilda') && !altGuide.textContent.includes('tilda.cc'),
      missingLinks: [...altGuide.querySelectorAll('[data-g2wm-platform-url]')].every(button => button.dataset.g2wmUrlId),
      deduplicated: altUrls.length === new Set(altUrls).size };
    const altSitemapGuide = document.createElement('div'); altSitemapGuide.innerHTML = g2wmSitemapGuideHtml(changedSite);
    const altSitemap = { name: altSitemapGuide.textContent.includes('Другой проект'),
      maps: [...altSitemapGuide.querySelectorAll('[data-g2wm-sitemap-files] a')].map(a => a.href)
        .includes('https://other.example/sitemap.xml'),
      products: altSitemapGuide.textContent.includes('https://other.example/products.xml'),
      noOldDomain: !altSitemapGuide.textContent.includes('k-apple.ru'),
      noOldFacts: !altSitemapGuide.textContent.includes('16 ссылок') && !altSitemapGuide.textContent.includes('117 мс'),
      noTilda: !altSitemapGuide.textContent.includes('Tilda') && !altSitemapGuide.textContent.includes('tilda.cc'),
      pages: altSitemapGuide.querySelectorAll('[data-g2wm-sitemap-pages] tbody tr').length === altRows.length };
    const altSearchGuide = document.createElement('div'); altSearchGuide.innerHTML = g2wmSearchGuideHtml(changedSite);
    const altSearchRows = [...altSearchGuide.querySelectorAll('[data-g2wm-search-action="prepare"] tbody tr[data-g2wm-page-group]')];
    const altSearchUrls = altSearchRows.map(row => row.querySelector('a')?.href).filter(Boolean);
    const altSearch = {
      name: altSearchGuide.textContent.includes('Другой проект'),
      home: altSearchUrls.includes('https://other.example/'),
      category: !category || altSearchUrls.includes('https://other.example/category'),
      productExcluded: !product || !altSearchUrls.includes('https://other.example/product'),
      catalogIncluded: altSearchRows.some(row => row.dataset.g2wmPageGroup === 'fixed' && row.dataset.g2wmPageId === 'catalog'),
      excluded: !altSearchRows.some(row => row.dataset.g2wmPageGroup === 'products' ||
        row.dataset.g2wmPageGroup === 'fixed' && row.dataset.g2wmPageId === 'thank_you'),
      allIncluded: altSearchRows.length === megaPlatformAllPages(changedSite).filter(page =>
        page.group === 'categories' || page.group === 'fixed' &&
        ['home', 'contacts', 'catalog', 'about', 'blog'].includes(page.id)).length,
      noOldDomain: !altSearchGuide.textContent.includes('k-apple.ru'),
      noOldClaims: !altSearchGuide.textContent.includes('Подтверждённый результат для проекта') && !altSearchGuide.textContent.includes('20.09.2026'),
      noTilda: !altSearchGuide.textContent.includes('Tilda') && !altSearchGuide.textContent.includes('tilda.cc'),
      missingLinks: [...altSearchGuide.querySelectorAll('[data-g2wm-platform-url]')].every(button => button.dataset.g2wmUrlId),
      changedUrlsRecheck: altSearchRows.some(row => row.dataset.g2wmPageGroup === 'fixed' && row.dataset.g2wmPageId === 'home' && !row.querySelector('[data-g2wm-search-check]')?.checked) };
    const cleanProject = createFreshWorkspace({ id: 'separate-webmaster-project', name: 'Новый проект' });
    megaPlatformSetUrl('fixed', 'home', 'https://fresh.example/', cleanProject);
    const cleanSearchGuide = document.createElement('div'); cleanSearchGuide.innerHTML = g2wmSearchGuideHtml(cleanProject);
    const separateProjectChecks = cleanSearchGuide.querySelectorAll('[data-g2wm-search-check]:checked').length === 0 &&
      cleanSearchGuide.textContent.includes('https://fresh.example/') && !cleanSearchGuide.textContent.includes('k-apple.ru');
    const roundTrip = migrateWorkspace(structuredClone(state), activeProjectId);
    const durable = JSON.stringify(g2wmReviews(roundTrip)) === JSON.stringify(g2wmReviews());
    rightsRow.querySelector('[data-g2wm-marker]').click();
    const rightsReset = g2wmStepStatus('s12');
    indexingRow.querySelector('[data-g2wm-marker]').click();
    const indexingReset = g2wmStepStatus('s21');
    sitemapRow.querySelector('[data-g2wm-marker]').click();
    const sitemapReset = g2wmStepStatus('s22');
    searchRow.querySelector('[data-g2wm-marker]').click();
    const searchReset = g2wmStepStatus('s31');
    row.querySelector('[data-g2wm-marker]').click();
    const reset = g2wmStepStatus('s11');
    const sameOld = old === JSON.stringify({ legacy: g2wmRecord().webmasterUnifiedV1,
      seo: g2SeoStore('company-webmaster'), layout: state.project.gate2StepLayoutsV1.company['service:company-webmaster'] });
    renderGate();
    document.querySelector('[data-g2y-company]').open = true;
    document.querySelector('[data-g2sb-id="company-webmaster"]').open = true;
    const rerenderedChecks = document.querySelectorAll('[data-g2wm-step="s31"] [data-g2wm-search-check]:checked').length === searchBoxes.length * 4;
    return { readyWithoutEvidence, pending, problem, ready, blockAfterFirst,
      rightsPending, rightsProblem, rightsReady, blockReady, firstUnchanged,
      indexingPending, indexingProblem, indexingReady, blockAfterIndexing, indexingStale, indexingReset,
      sitemapPending, sitemapProblem, sitemapReady, blockFullyReady, sitemapStale, sitemapReset,
      searchPartial, firstSaved, firstConnected, secondConnected, firstDomChecked, stageIndependent, openIndependent,
      searchUnchecked, searchUncheckedCount, searchPending, searchProblem, searchPassedDisabled,
      searchAllChecked, searchOptionalUnchecked, prepareCompleteButNotReady,
      searchProgress, searchPassedEnabled, searchReady, searchReopened, searchRestored,
      blockFullyReadyAfterSearch, searchStale, searchReset, rerenderedChecks, separateProjectChecks,
      indexingWithoutHome, sitemapWithoutHome, searchWithoutHome, sitemapWithoutFiles, alt, altSitemap, altSearch,
      stale, rightsStale, durable, reset, rightsReset,
      history: g2wmReviews().s11.history?.length, rightsHistory: g2wmReviews().s12.history?.length,
      indexingHistory: g2wmReviews().s21.history?.length, sitemapHistory: g2wmReviews().s22.history?.length,
      searchHistory: g2wmReviews().s31.history?.length, sameOld,
      progress: document.querySelector('[data-g2sb-id="company-webmaster"] [data-g2sb-progress]').textContent };
  })()`);
  assert(reviews.readyWithoutEvidence && reviews.durable && reviews.sameOld);
  assert.equal(reviews.pending, 'needs_check'); assert.equal(reviews.problem, 'problem');
  assert.equal(reviews.ready, 'ready'); assert.equal(reviews.blockAfterFirst, 'in_progress');
  assert.equal(reviews.rightsPending, 'needs_check'); assert.equal(reviews.rightsProblem, 'problem');
  assert.equal(reviews.rightsReady, 'ready'); assert.equal(reviews.blockReady, 'in_progress');
  assert.equal(reviews.indexingPending, 'needs_check'); assert.equal(reviews.indexingProblem, 'problem');
  assert.equal(reviews.indexingReady, 'ready'); assert.equal(reviews.blockAfterIndexing, 'in_progress');
  assert.equal(reviews.sitemapPending, 'needs_check'); assert.equal(reviews.sitemapProblem, 'problem');
  assert.equal(reviews.sitemapReady, 'ready'); assert.equal(reviews.blockFullyReady, 'in_progress');
  assert.equal(reviews.searchPartial, 'in_progress'); assert(reviews.firstSaved);
  assert.equal(reviews.searchUnchecked, 'not_started');
  assert.equal(reviews.searchUncheckedCount, 0);
  assert(reviews.firstConnected && reviews.secondConnected && !reviews.firstDomChecked &&
    reviews.stageIndependent && reviews.openIndependent);
  assert.equal(reviews.searchPending, 'needs_check'); assert.equal(reviews.searchProblem, 'problem');
  assert(reviews.searchPassedDisabled && reviews.prepareCompleteButNotReady && reviews.searchAllChecked &&
    reviews.searchOptionalUnchecked && reviews.searchPassedEnabled);
  assert.equal(reviews.searchProgress, `Выполнено для ${init.searchPages} из ${init.searchPages} страниц`);
  assert.equal(reviews.searchReady, 'ready'); assert.equal(reviews.blockFullyReadyAfterSearch, 'in_progress');
  assert.equal(reviews.searchReopened, 'needs_check'); assert.equal(reviews.searchRestored, 'ready');
  assert.equal(reviews.searchStale, 'recheck'); assert.equal(reviews.searchReset, 'in_progress');
  assert.equal(reviews.searchWithoutHome, 'needs_check');
  assert(reviews.rerenderedChecks && reviews.separateProjectChecks);
  assert.equal(reviews.sitemapStale, 'recheck'); assert.equal(reviews.sitemapReset, 'not_started');
  assert.equal(reviews.sitemapWithoutHome, 'needs_check'); assert.equal(reviews.sitemapWithoutFiles, 'needs_check');
  assert.equal(reviews.indexingStale, 'recheck'); assert.equal(reviews.indexingReset, 'not_started');
  assert.equal(reviews.indexingWithoutHome, 'needs_check');
  assert(Object.values(reviews.alt).every(Boolean));
  assert(Object.values(reviews.altSitemap).every(Boolean));
  assert(Object.values(reviews.altSearch).every(Boolean));
  assert(reviews.firstUnchanged);
  assert.equal(reviews.stale, 'recheck'); assert.equal(reviews.rightsStale, 'recheck');
  assert.equal(reviews.reset, 'recheck'); assert.equal(reviews.rightsReset, 'recheck');
  assert.equal(reviews.history, 3); assert.equal(reviews.rightsHistory, 3);
  assert.equal(reviews.indexingHistory, 3);
  assert.equal(reviews.sitemapHistory, 3);
  assert.equal(reviews.searchHistory, 3);
  assert.equal(reviews.progress, '0 из 8 шагов');
  const missingTarget = await evaluate(`(() => { const button = document.querySelector('[data-g2wm-step="s21"] [data-g2wm-platform-url]');
    if (!button) return null; const key = [button.dataset.g2wmUrlGroup, button.dataset.g2wmUrlId]; button.click(); return key; })()`);
  assert(missingTarget);
  let platformNavigation = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    platformNavigation = await evaluate(`(() => activeGateId === 'gate-0' && !!document.querySelector('[data-mega-url-group="${missingTarget[0]}"][data-mega-url-id="${missingTarget[1]}"]'))()`);
    if (platformNavigation) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(platformNavigation);
  const addedUrl = 'https://k-apple.ru/indexing-check-page';
  const updatedInPlatform = await evaluate(`(() => { const input = document.querySelector('[data-mega-url-group="${missingTarget[0]}"][data-mega-url-id="${missingTarget[1]}"]');
    input.value = '${addedUrl}'; input.dispatchEvent(new Event('input', { bubbles: true }));
    return megaPlatformUrl('${missingTarget[0]}', '${missingTarget[1]}') === '${addedUrl}'; })()`);
  assert(updatedInPlatform);
  await evaluate(`guruNavigateToGate('gate-2')`);
  let updatedInGuide = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    updatedInGuide = await evaluate(`(() => !!document.querySelector('[data-g2wm-step="s21"] [data-g2wm-indexing-urls] a[href="${addedUrl}"]'))()`);
    if (updatedInGuide) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert(updatedInGuide);
  const firstSection = await evaluate(`(() => {
    const priorityCheck = document.querySelector('[data-g2wm-step="s32"] [data-g2wm-priority-action="prepare"] [data-g2wm-priority-check]');
    priorityCheck.click();
    const priorityChecked = g2wmPriorityCheckedCount() === 1;
    const visibilityCheck = document.querySelector('[data-g2wm-step="s33"] [data-g2wm-visibility-action="prepare"] [data-g2wm-visibility-check]');
    visibilityCheck.click();
    const visibilityChecked = g2wmVisibilityCheckedCount() === 1;
    const launchCheck = document.querySelector('[data-g2wm-step="s34"] [data-g2wm-launch-action="sitemap"] [data-g2wm-launch-check]');
    launchCheck.click();
    const launchChecked = g2wmLaunchCheckedCount(g2wmLaunchPages()) === 1;
    saveProjects();
    const section = document.querySelector('[data-g2sb-id="company-webmaster"] [data-g2wm-section="1"]');
    const defaultOpenInAnotherProject = g2wmConnectionSectionOpen(createFreshWorkspace({ id: 'another-project', name: 'Другой проект' }));
    section.querySelector(':scope > summary').click();
    return { collapsed: !section.open, defaultOpenInAnotherProject, priorityChecked, visibilityChecked, launchChecked };
  })()`);
  assert(firstSection.collapsed && firstSection.defaultOpenInAnotherProject && firstSection.priorityChecked &&
    firstSection.visibilityChecked && firstSection.launchChecked);
  let savedClosed = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    savedClosed = await evaluate(`state.ui?.webmasterConnectionSectionOpenV1 === false &&
      localStorage.getItem('guru-platform-webmaster-connection-open-v1-' + activeProjectId) === '0'`);
    if (savedClosed) break;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert(savedClosed);
  const reloadSection = async () => {
    const previousOrigin = await evaluate('performance.timeOrigin');
    await page.call('Page.reload', { ignoreCache: true });
    let loaded = false;
    for (let attempt = 0; attempt < 300; attempt++) {
      loaded = await evaluate(`performance.timeOrigin !== ${previousOrigin} && document.readyState === "complete" &&
        typeof g2wmConnectionSectionOpen === "function" && typeof rememberAccessUnlocked === "function" &&
        typeof openProject === "function"`).catch(() => false);
      if (loaded) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(loaded, 'reloaded app must finish loading');
    return evaluate(`(async () => {
      rememberAccessUnlocked(); setAccessState(true);
      scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
      await openProject('webmaster-empty-isolated');
      activeView = 'gate'; activeGateId = 'gate-2'; renderGate();
      const section = document.querySelector('[data-g2sb-id="company-webmaster"] [data-g2wm-section="1"]');
      return { open: section?.open, preference: state.ui?.webmasterConnectionSectionOpenV1,
        projectId: activeProjectId, otherSections: document.querySelectorAll('[data-g2sb-id="company-webmaster"] [data-g2wm-section]').length,
        priorityChecked: g2wmPriorityCheckedCount(), priorityStep: g2wmStepStatus('s32'),
        visibilityChecked: g2wmVisibilityCheckedCount(), visibilityStep: g2wmStepStatus('s33'),
        launchChecked: g2wmLaunchCheckedCount(g2wmLaunchPages()), launchStep: g2wmStepStatus('s34') };
    })()`);
  };
  const afterClosedReload = await reloadSection();
  assert.deepEqual(afterClosedReload, { open: false, preference: false,
    projectId: 'webmaster-empty-isolated', otherSections: 3, priorityChecked: 1, priorityStep: 'in_progress',
    visibilityChecked: 1, visibilityStep: 'in_progress', launchChecked: 1, launchStep: 'in_progress' });
  const reopened = await evaluate(`(() => {
    const section = document.querySelector('[data-g2sb-id="company-webmaster"] [data-g2wm-section="1"]');
    section.querySelector(':scope > summary').click();
    return section.open;
  })()`);
  assert(reopened);
  let savedOpen = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    savedOpen = await evaluate(`state.ui?.webmasterConnectionSectionOpenV1 === true &&
      localStorage.getItem('guru-platform-webmaster-connection-open-v1-' + activeProjectId) === '1'`);
    if (savedOpen) break;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert(savedOpen);
  const afterOpenReload = await reloadSection();
  assert.deepEqual(afterOpenReload, { open: true, preference: true,
    projectId: 'webmaster-empty-isolated', otherSections: 3, priorityChecked: 1, priorityStep: 'in_progress',
    visibilityChecked: 1, visibilityStep: 'in_progress', launchChecked: 1, launchStep: 'in_progress' });
  assert.deepEqual(page.errors, []);
  console.log(JSON.stringify({ desktop: init, mobile, reviews, afterClosedReload, afterOpenReload,
    runtimeErrors: page.errors }, null, 2));
} finally {
  page?.close();
  if (browserContextId) await browser.call('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
  browser.close();
}
