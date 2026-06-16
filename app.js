const LEGACY_STORAGE_KEY = 'guru-platform-mvp-v1';
const PROJECTS_STORAGE_KEY = 'guru-platform-projects-v02';
const WORKSPACE_STORAGE_PREFIX = 'guru-platform-workspace-v02-';
const PLATFORM_VERSION = 'v0.30';
const STATUS_LABELS = {
  not_started: 'Не начато',
  in_progress: 'В работе',
  ready: 'Готово',
  needs_review: 'Проверить',
  problem: 'Проблема'
};

const V14_PAGE_BLOCK_TITLES = ['ГЛАВНАЯ','СПИСОК / КАТЕГОРИЯ','СТРАНИЦА УСЛУГИ','КАРТОЧКА ТОВАРА','СТАТЬЯ БЛОГА','О НАС','КОНТАКТЫ','ДОСТАВКА / ГАРАНТИИ','ПОЛИТИКА','404','THANK YOU PAGE ⚠️','ЛЕНДИНГ'];
const V14_REMOVED_GATE1_BLOCKS = ['Блок А: Сниппет','Блок Б: Финальный CTA'];

let projects = loadProjects();
let activeProjectId = null;
let state = null;
let activeView = 'project';
let activeGateId = null;
let layoutMode = 'table';

const els = {
  launcher: document.getElementById('projectLauncher'),
  projectGrid: document.getElementById('projectGrid'),
  appShell: document.getElementById('appShell'),
  newProjectModal: document.getElementById('newProjectModal'),
  pageTitle: document.getElementById('pageTitle'),
  gateNav: document.getElementById('gateNav'),
  contentArea: document.getElementById('contentArea'),
  summaryGrid: document.getElementById('summaryGrid'),
  searchInput: document.getElementById('searchInput'),
  statusFilter: document.getElementById('statusFilter'),
  workspaceToolbar: document.getElementById('workspaceToolbar'),
  csvInput: document.getElementById('csvInput'),
  saveStatus: document.getElementById('saveStatus'),
  autosaveDot: document.getElementById('autosaveDot'),
  brandTitle: document.getElementById('brandTitle'),
  brandMark: document.getElementById('brandMark')
};

function makeId(prefix = 'id') {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(16).slice(2, 8);
}

function loadProjects() {
  try {
    const saved = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch (err) {
    console.warn('Не удалось прочитать список проектов', err);
  }

  const defaultProject = {
    id: 'project-default',
    name: 'УНИВЕРСАЛ / ГУРУ',
    description: 'Маркетинговая операционная система на основе CSV-чеклиста',
    website: '',
    type: 'Платформа',
    icon: 'G',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy && !localStorage.getItem(WORKSPACE_STORAGE_PREFIX + defaultProject.id)) {
      localStorage.setItem(WORKSPACE_STORAGE_PREFIX + defaultProject.id, legacy);
    } else if (!localStorage.getItem(WORKSPACE_STORAGE_PREFIX + defaultProject.id)) {
      localStorage.setItem(WORKSPACE_STORAGE_PREFIX + defaultProject.id, JSON.stringify(structuredClone(window.GURU_SEED)));
    }
  } catch (err) {
    console.warn('Не удалось выполнить миграцию старой версии', err);
  }

  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([defaultProject]));
  return [defaultProject];
}

function saveProjects() {
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}

function loadState(projectId) {
  try {
    const saved = localStorage.getItem(WORKSPACE_STORAGE_PREFIX + projectId);
    if (saved) return migrateWorkspace(JSON.parse(saved), projectId);
  } catch (err) {
    console.warn('Не удалось прочитать сохранение проекта', err);
  }
  return createFreshWorkspace(projects.find(p => p.id === projectId));
}

function migrateWorkspace(workspace, projectId) {
  const meta = projects.find(p => p.id === projectId);
  workspace.project = workspace.project || {};
  workspace.gates = workspace.gates || structuredClone(window.GURU_SEED.gates);
  workspace.metrics = workspace.metrics || [];
  workspace.linkBank = Array.isArray(workspace.linkBank) ? workspace.linkBank : [];
  workspace.tools = normalizeProjectTools(workspace.tools);
  if (meta) {
    workspace.project.name = workspace.project.name || meta.name;
    workspace.project.description = workspace.project.description || meta.description;
    workspace.project.website = workspace.project.website || meta.website;
    workspace.project.niche = workspace.project.niche || meta.niche || meta.type || '';
    workspace.project.geography = workspace.project.geography || meta.geography || '';
    workspace.project.mainCta = workspace.project.mainCta || meta.mainCta || '';
    workspace.project.usp = workspace.project.usp || meta.usp || '';
    workspace.project.offer = workspace.project.offer || meta.offer || '';
    workspace.project.afterMainCta = workspace.project.afterMainCta || meta.afterMainCta || '';
    workspace.project.afterUsp = workspace.project.afterUsp || meta.afterUsp || '';
    workspace.project.afterOffer = workspace.project.afterOffer || meta.afterOffer || '';
    workspace.project.afterDescription = workspace.project.afterDescription || meta.afterDescription || '';
  }
  prepareSystemCards(workspace);
  initializeEvidenceStructure(workspace);
  harvestKnownLinks(workspace);
  syncProjectPassportCard(workspace);
  recalculateAllStatuses(workspace);
  workspace.schemaVersion = PLATFORM_VERSION;
  return workspace;
}

function createFreshWorkspace(meta = {}) {
  const fresh = structuredClone(window.GURU_SEED);
  fresh.schemaVersion = PLATFORM_VERSION;
  fresh.project.name = meta.name || 'Новый проект';
  fresh.project.description = meta.description || '';
  fresh.project.website = meta.website || '';
  fresh.project.niche = meta.niche || meta.type || '';
  fresh.project.geography = meta.geography || '';
  fresh.project.mainCta = meta.mainCta || '';
  fresh.project.usp = meta.usp || '';
  fresh.project.offer = meta.offer || '';
  fresh.project.afterMainCta = meta.afterMainCta || '';
  fresh.project.afterUsp = meta.afterUsp || '';
  fresh.project.afterOffer = meta.afterOffer || '';
  fresh.project.afterDescription = meta.afterDescription || '';
  fresh.metrics = [];
  fresh.linkBank = [];
  fresh.tools = defaultProjectTools();
  prepareSystemCards(fresh);
  initializeEvidenceStructure(fresh);
  harvestKnownLinks(fresh);
  syncProjectPassportCard(fresh);
  return fresh;
}

function saveState() {
  if (!state || !activeProjectId) return;
  syncProjectPassportCard(state);
  harvestKnownLinks(state);
  recalculateAllStatuses(state);
  syncEvidenceTexts();
  state.updatedAt = new Date().toISOString();
  state.schemaVersion = PLATFORM_VERSION;
  localStorage.setItem(WORKSPACE_STORAGE_PREFIX + activeProjectId, JSON.stringify(state));
  syncActiveProjectMeta();
  els.saveStatus.textContent = 'Сохранено: ' + new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  els.autosaveDot.style.background = '#82d48d';
}

function syncActiveProjectMeta() {
  const project = projects.find(p => p.id === activeProjectId);
  if (!project || !state?.project) return;
  project.name = state.project.name || project.name;
  project.description = state.project.description || project.description;
  project.website = state.project.website || project.website;
  project.niche = state.project.niche || project.niche || project.type || '';
  project.type = state.project.niche || project.type || '';
  project.geography = state.project.geography || project.geography || '';
  project.mainCta = state.project.mainCta || project.mainCta || '';
  project.usp = state.project.usp || project.usp || '';
  project.offer = state.project.offer || project.offer || '';
  project.afterMainCta = state.project.afterMainCta || project.afterMainCta || '';
  project.afterUsp = state.project.afterUsp || project.afterUsp || '';
  project.afterOffer = state.project.afterOffer || project.afterOffer || '';
  project.afterDescription = state.project.afterDescription || project.afterDescription || '';
  project.updatedAt = new Date().toISOString();
  project.icon = project.icon || getProjectIcon(project.name);
  saveProjects();
}

function flashSaving() {
  if (!state) return;
  els.saveStatus.textContent = 'Сохраняю...';
  els.autosaveDot.style.background = '#d4b05f';
  setTimeout(saveState, 120);
}

function showLauncher() {
  activeProjectId = null;
  state = null;
  activeView = 'project';
  activeGateId = null;
  els.appShell.hidden = true;
  els.launcher.hidden = false;
  renderProjectLauncher();
}

function openProject(projectId) {
  activeProjectId = projectId;
  state = loadState(projectId);
  activeView = 'project';
  activeGateId = state.gates[0]?.id || null;
  els.launcher.hidden = true;
  els.appShell.hidden = false;
  saveState();
  render();
}

function renderProjectLauncher() {
  els.projectGrid.innerHTML = projects.map(projectCardHtml).join('') + addProjectCardHtml();
  document.querySelectorAll('[data-open-project]').forEach(card => {
    card.addEventListener('click', () => openProject(card.dataset.openProject));
  });
  document.querySelectorAll('[data-project-site]').forEach(link => {
    link.addEventListener('click', e => e.stopPropagation());
  });
  document.getElementById('addProjectCard')?.addEventListener('click', showNewProjectModal);
}

function projectCardHtml(project) {
  const website = project.website ? normalizeUrl(project.website) : '';
  const description = project.description || 'Короткое описание проекта пока не заполнено.';
  return `
    <button class="project-card" data-open-project="${escapeAttr(project.id)}">
      <span class="project-avatar">${escapeHtml(project.icon || getProjectIcon(project.name))}</span>
      <span class="project-name">${escapeHtml(project.name)}</span>
      <span class="project-description">${escapeHtml(description)}</span>
      ${website ? `<a class="project-site" href="${escapeAttr(website)}" target="_blank" rel="noopener" data-project-site>Открыть сайт ↗</a>` : `<span class="project-site muted-link">Ссылка не указана</span>`}
    </button>`;
}

function addProjectCardHtml() {
  return `
    <button class="project-card project-card-add" id="addProjectCard">
      <span class="project-avatar add-avatar">+</span>
      <span class="project-name">Новый проект</span>
      <span class="project-description">Создать отдельный рабочий интерфейс для нового сайта, бренда или кампании.</span>
      <span class="project-site muted-link">Добавить проект</span>
    </button>`;
}

function getProjectIcon(name = '') {
  const trimmed = String(name).trim();
  return (trimmed[0] || 'G').toUpperCase();
}

function normalizeUrl(url) {
  const value = String(url || '').trim();
  if (!value) return '';
  return /^https?:\/\//i.test(value) ? value : 'https://' + value;
}

function showNewProjectModal() {
  document.getElementById('newProjectName').value = '';
  document.getElementById('newProjectType').value = '';
  document.getElementById('newProjectDescription').value = '';
  document.getElementById('newProjectWebsite').value = '';
  document.getElementById('newProjectGeography').value = '';
  document.getElementById('newProjectMainCta').value = '';
  document.getElementById('newProjectUsp').value = '';
  document.getElementById('newProjectOffer').value = '';
  document.getElementById('newProjectIcon').value = '';
  els.newProjectModal.hidden = false;
  setTimeout(() => document.getElementById('newProjectName').focus(), 0);
}

function hideNewProjectModal() {
  els.newProjectModal.hidden = true;
}

function createProjectFromModal() {
  const name = document.getElementById('newProjectName').value.trim();
  const type = document.getElementById('newProjectType').value.trim();
  const description = document.getElementById('newProjectDescription').value.trim();
  const website = document.getElementById('newProjectWebsite').value.trim();
  const geography = document.getElementById('newProjectGeography').value.trim();
  const mainCta = document.getElementById('newProjectMainCta').value.trim();
  const usp = document.getElementById('newProjectUsp').value.trim();
  const offer = document.getElementById('newProjectOffer').value.trim();
  const icon = document.getElementById('newProjectIcon').value.trim().slice(0, 2).toUpperCase();
  if (!name) {
    alert('Введите название проекта.');
    return;
  }
  const project = {
    id: makeId('project'),
    name,
    type,
    niche: type,
    description,
    website,
    geography,
    mainCta,
    usp,
    offer,
    afterMainCta: '',
    afterUsp: '',
    afterOffer: '',
    afterDescription: '',
    icon: icon || getProjectIcon(name),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  projects.push(project);
  saveProjects();
  localStorage.setItem(WORKSPACE_STORAGE_PREFIX + project.id, JSON.stringify(createFreshWorkspace(project)));
  hideNewProjectModal();
  openProject(project.id);
}

function allCards() {
  return state.gates.flatMap(g => g.cards.map(c => ({ ...c, gateId: g.id, gateTitle: g.title })));
}

function countByStatus(cards = allCards()) {
  return cards.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});
}



const TOOL_CARD_CONFIG = {
  'Текущее состояние сайта': ['Страницы сайта', 'Главные посадочные', 'Формы', 'CTA', 'Контакты', 'Блоки доверия', 'Мобильная версия'],
  'Текущая инфраструктура маркетинга': ['Яндекс Метрика', 'Цели Метрики', 'CRM', 'Формы', 'UTM', 'Уведомления', 'Рекламные кабинеты', 'Таблицы'],
  'Текущие каналы и рекламные материалы': ['Яндекс Директ', 'РСЯ', 'Медийная реклама', 'SEO', 'Карты', 'Баннеры', 'Объявления', 'Видео', 'Тексты']
};


const TOOL_EVIDENCE_FIELD_CONFIG = {
  'Текущее состояние сайта': ['какой сайт на старте', 'что в нём уже работает', 'что в нём не работает'],
  'Текущая инфраструктура маркетинга': ['какая инфраструктура уже есть', 'чего не хватает'],
  'Текущие каналы и рекламные материалы': ['список текущих каналов', 'список текущих кампаний', 'список текущих стартовых креативов']
};

const CURRENT_RESULTS_METRICS = [
  { key: 'traffic', label: 'Трафик', type: 'number' },
  { key: 'impressions', label: 'Показы', type: 'number' },
  { key: 'clicks', label: 'Клики', type: 'number' },
  { key: 'ctr', label: 'CTR', type: 'number' },
  { key: 'leads', label: 'Заявки', type: 'number' },
  { key: 'calls', label: 'Звонки', type: 'number' },
  { key: 'cpl_cpa', label: 'CPL или CPA', type: 'number' },
  { key: 'conversion', label: 'Конверсия', type: 'number' },
  { key: 'cost', label: 'Расход', type: 'number' },
  { key: 'lead_quality', label: 'Качество лидов', type: 'text' },
  { key: 'sales', label: 'Продажи, если доступны', type: 'number' }
];

const PROJECT_META_FIELDS = [
  ['name', 'Название проекта'],
  ['niche', 'Ниша'],
  ['website', 'Сайт'],
  ['geography', 'География']
];

const PROJECT_BEFORE_FIELDS = [
  ['mainCta', 'Главный CTA'],
  ['usp', 'УТП'],
  ['offer', 'Оффер'],
  ['description', 'Описание проекта']
];

const PROJECT_AFTER_FIELDS = [
  ['afterMainCta', 'Главный CTA'],
  ['afterUsp', 'УТП'],
  ['afterOffer', 'Оффер'],
  ['afterDescription', 'Описание проекта']
];

const PROJECT_PASSPORT_FIELDS = [
  ...PROJECT_META_FIELDS,
  ...PROJECT_BEFORE_FIELDS,
  ...PROJECT_AFTER_FIELDS
];


const GATE1_ANALYTICS_TITLE = '1. Аналитика';
const GATE1_SUBBLOCKS = [
  {
    key: 'site_audit',
    title: 'Аудит сайта',
    aliases: ['аудит сайта']
  },
  {
    key: 'demand_semantics',
    title: 'Спрос: семантика, кластеризация, намерения',
    aliases: ['спрос: семантика, кластеризация, намерения']
  },
  {
    key: 'pain_jtbd_offer',
    title: 'Боль → JTBD → офер',
    aliases: ['боль → jtbd → офер', 'боль -> jtbd -> офер']
  },
  {
    key: 'unit_economics',
    title: 'Юнит-экономика: целевые CPA/DRR, AOV/LTV, маржинальность',
    aliases: ['юнит-экономика: целевые cpa/drr, aov/ltv, маржинальность']
  }
];

const GATE1_UNIT_ECONOMICS_CARDS = [
  ['Целевой CPA', 'Зафиксировать допустимую стоимость привлечения заявки или клиента. Указать расчёт, источник данных и ограничение по бюджету.'],
  ['DRR', 'Зафиксировать допустимую долю рекламных расходов в выручке. Указать целевой процент и период оценки.'],
  ['AOV', 'Зафиксировать средний чек проекта. Указать источник расчёта и период.'],
  ['LTV', 'Зафиксировать ожидаемую ценность клиента за весь период работы. Указать метод расчёта и допущения.'],
  ['Маржинальность', 'Зафиксировать маржинальность продукта или услуги. Указать, какие расходы учитываются.'],
  ['Ограничения по экономике', 'Зафиксировать финансовые ограничения: минимальный чек, предельный CPA, бюджет, сезонность, узкие места продаж.']
];


const GATE1_FIXED_PAGE_TITLES = ['ГЛАВНАЯ', 'КОНТАКТЫ'];
const GATE1_REPEATABLE_PAGE_TITLES = ['СПИСОК / КАТЕГОРИЯ', 'СТРАНИЦА УСЛУГИ', 'КАРТОЧКА ТОВАРА', 'СТАТЬЯ БЛОГА', 'ЛЕНДИНГ'];
const GATE1_PAGE_STRUCTURE_TITLES = [
  ...GATE1_FIXED_PAGE_TITLES,
  ...GATE1_REPEATABLE_PAGE_TITLES,
  'О НАС', 'ДОСТАВКА / ГАРАНТИИ', 'ПОЛИТИКА', '404', 'THANK YOU PAGE ⚠️'
];

const GATE1_LINK_STATUS_OPTIONS = {
  works: ['Работает', 'Не работает'],
  placed: ['Размещена', 'Не размещена'],
  indexed: ['Индексирована', 'Не индексирована'],
  filled: ['Заполнена', 'Не заполнена']
};

const DEFAULT_PROJECT_TOOLS = [
  { key: 'yandex_webmaster', group: 'SEO и индексация', name: 'Яндекс Вебмастер', enabled: true },
  { key: 'google_search_console', group: 'SEO и индексация', name: 'Google Search Console', enabled: false },
  { key: 'yandex_direct', group: 'Реклама', name: 'Яндекс Директ', enabled: true },
  { key: 'google_ads', group: 'Реклама', name: 'Google Ads', enabled: false },
  { key: 'yandex_metrika', group: 'Аналитика', name: 'Яндекс Метрика', enabled: true },
  { key: 'google_analytics', group: 'Аналитика', name: 'Google Analytics', enabled: false },
  { key: 'crm', group: 'CRM и лиды', name: 'CRM', enabled: true },
  { key: 'forms', group: 'CRM и лиды', name: 'Формы', enabled: true },
  { key: 'calltracking', group: 'CRM и лиды', name: 'Коллтрекинг', enabled: false }
];

function defaultProjectTools() {
  return DEFAULT_PROJECT_TOOLS.map(tool => ({ ...tool }));
}


function normalizeProjectTools(tools) {
  const defaults = defaultProjectTools();
  const saved = Array.isArray(tools) ? new Map(tools.map(tool => [tool.key, tool])) : new Map();
  return defaults.map(tool => {
    const prev = saved.get(tool.key) || {};
    return { ...tool, enabled: typeof prev.enabled === 'boolean' ? prev.enabled : tool.enabled, comment: prev.comment || '' };
  });
}

function enabledTools() {
  return (state?.tools || []).filter(tool => tool.enabled);
}

function toolOptionsHtml(value = '', allowEmpty = true) {
  const tools = enabledTools();
  return `${allowEmpty ? '<option value="">Источник не выбран</option>' : ''}${tools.map(tool => `<option value="${escapeAttr(tool.key)}" ${value === tool.key ? 'selected' : ''}>${escapeHtml(tool.name)}</option>`).join('')}`;
}

function toolNameByKey(key) {
  const tool = (state?.tools || []).find(item => item.key === key);
  return tool?.name || key || '';
}


const SERVICE_LINKS = {
  yandex_webmaster: { label: 'Яндекс Вебмастер', url: 'https://webmaster.yandex.ru/' },
  google_search_console: { label: 'Google Search Console', url: 'https://search.google.com/search-console' },
  yandex_direct: { label: 'Яндекс Директ', url: 'https://direct.yandex.ru/' },
  google_ads: { label: 'Google Ads', url: 'https://ads.google.com/' },
  yandex_metrika: { label: 'Яндекс Метрика', url: 'https://metrika.yandex.ru/' },
  google_analytics: { label: 'Google Analytics', url: 'https://analytics.google.com/' },
  yandex_wordstat: { label: 'Яндекс Wordstat', url: 'https://wordstat.yandex.ru/' },
  yandex_business: { label: 'Яндекс Бизнес', url: 'https://business.yandex.ru/' },
  google_pagespeed: { label: 'PageSpeed Insights', url: 'https://pagespeed.web.dev/' }
};

const INSTRUCTION_STATUS_OPTIONS = [
  ['', 'Выбрать'],
  ['works', 'Работает'],
  ['not_works', 'Не работает'],
  ['placed', 'Размещено'],
  ['not_placed', 'Не размещено'],
  ['indexed', 'Индексировано'],
  ['not_indexed', 'Не индексировано'],
  ['filled', 'Заполнено'],
  ['not_filled', 'Не заполнено'],
  ['ok', 'ОК'],
  ['problem', 'Есть проблема']
];

function serviceLinkByToolKey(key) {
  return SERVICE_LINKS[key] || null;
}

function toolKeyByName(name = '') {
  const text = normalizeGateTitle(name);
  if (/google search console|search console|gsc/.test(text)) return 'google_search_console';
  if (/google ads|гугл ads|google реклама/.test(text)) return 'google_ads';
  if (/google analytics|ga4|гугл аналитик/.test(text)) return 'google_analytics';
  if (/pagespeed|page speed|cwv/.test(text)) return 'google_pagespeed';
  if (/wordstat|вордстат/.test(text)) return 'yandex_wordstat';
  if (/яндекс вебмастер|webmaster|вебмастер/.test(text)) return 'yandex_webmaster';
  if (/яндекс директ|direct/.test(text)) return 'yandex_direct';
  if (/яндекс метрик|metrika|метрик/.test(text)) return 'yandex_metrika';
  if (/яндекс бизнес|business/.test(text)) return 'yandex_business';
  return '';
}

function serviceLinkByName(name = '') {
  const key = toolKeyByName(name);
  return key ? SERVICE_LINKS[key] : null;
}

function instructionStatusOptionsHtml(value = '') {
  return INSTRUCTION_STATUS_OPTIONS.map(([key, label]) => `<option value="${escapeAttr(key)}" ${value === key ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
}

function instructionStatusLabel(value = '') {
  const found = INSTRUCTION_STATUS_OPTIONS.find(([key]) => key === value);
  return found?.[1] || value || 'Не заполнено';
}

function normalizeUrlValue(url = '') {
  return String(url || '').trim();
}

function linkStatusToSeoPatch(status = '') {
  if (status === 'Работает') return { availability: 'works' };
  if (status === 'Не работает') return { availability: 'not_works', errors: 'has_errors' };
  if (status === 'Индексирована') return { indexation: 'indexed' };
  if (status === 'Не индексирована') return { indexation: 'not_indexed' };
  if (status === 'Размещена' || status === 'Заполнена') return { visibility: 'visible' };
  if (status === 'Не размещена' || status === 'Не заполнена') return { visibility: 'not_visible' };
  return {};
}

function defaultSeoStatus() {
  return { availability: '', indexation: '', visibility: '', errors: '' };
}

function addOrUpdateProjectLink(rawUrl, patch = {}, workspace = state) {
  if (!workspace) return null;
  const url = normalizeUrlValue(rawUrl);
  if (!url) return null;
  workspace.linkBank = Array.isArray(workspace.linkBank) ? workspace.linkBank : [];
  let link = workspace.linkBank.find(item => normalizeUrlValue(item.url) === url);
  if (!link) {
    link = { id: makeId('link'), url, comment: '', seo: defaultSeoStatus(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    workspace.linkBank.push(link);
  }
  if (patch.comment !== undefined && patch.comment !== '') link.comment = patch.comment;
  if (patch.source !== undefined && patch.source !== '') link.source = patch.source;
  if (patch.status !== undefined && patch.status !== '') link.lastStatus = patch.status;
  link.seo = { ...defaultSeoStatus(), ...(link.seo || {}), ...(patch.seo || {}), ...linkStatusToSeoPatch(patch.status) };
  link.updatedAt = new Date().toISOString();
  return link;
}

function removeProjectLink(url, workspace = state) {
  if (!workspace?.linkBank) return;
  const target = normalizeUrlValue(url);
  workspace.linkBank = workspace.linkBank.filter(link => normalizeUrlValue(link.url) !== target);
}

function getProjectLink(url, workspace = state) {
  const target = normalizeUrlValue(url);
  return (workspace?.linkBank || []).find(link => normalizeUrlValue(link.url) === target) || null;
}

function linkSeoScore(link) {
  const seo = link?.seo || {};
  const problems = [seo.availability === 'not_works', seo.indexation === 'not_indexed', seo.visibility === 'not_visible', seo.errors === 'has_errors'].filter(Boolean).length;
  const positives = [seo.availability === 'works', seo.indexation === 'indexed', seo.visibility === 'visible', seo.errors === 'no_errors'].filter(Boolean).length;
  if (problems) return { tone: 'bad', label: 'Есть проблема' };
  if (positives >= 3) return { tone: 'good', label: 'SEO OK' };
  if (positives) return { tone: 'warn', label: 'Частично OK' };
  return { tone: 'neutral', label: 'SEO не проверено' };
}

function seoIndicatorHtml(url) {
  const link = getProjectLink(url);
  if (!link) return '<span class="seo-indicator neutral">SEO не проверено</span>';
  const score = linkSeoScore(link);
  const seo = link.seo || {};
  const title = [
    seo.availability ? `Доступность: ${seoLabel('availability', seo.availability)}` : '',
    seo.indexation ? `Индексация: ${seoLabel('indexation', seo.indexation)}` : '',
    seo.visibility ? `SEO-видимость: ${seoLabel('visibility', seo.visibility)}` : '',
    seo.errors ? `Ошибки: ${seoLabel('errors', seo.errors)}` : ''
  ].filter(Boolean).join(' · ');
  return `<span class="seo-indicator ${score.tone}" title="${escapeAttr(title || 'SEO-статусы не заполнены')}">${escapeHtml(score.label)}</span>`;
}

function seoLabel(group, value) {
  const map = {
    availability: { works: 'Работает', not_works: 'Не работает' },
    indexation: { indexed: 'Индексирована', not_indexed: 'Не индексирована' },
    visibility: { visible: 'Видна', not_visible: 'Не видна' },
    errors: { no_errors: 'Нет', has_errors: 'Есть' }
  };
  return map[group]?.[value] || value || '';
}

function projectUrlDatalistHtml() {
  const links = state?.linkBank || [];
  if (!links.length) return '';
  return `<datalist id="projectUrlOptions">${links.map(link => `<option value="${escapeAttr(link.url)}">${escapeHtml(link.comment || link.url)}</option>`).join('')}</datalist>`;
}

function harvestKnownLinks(workspace = state) {
  if (!workspace?.gates) return;
  workspace.linkBank = Array.isArray(workspace.linkBank) ? workspace.linkBank : [];
  workspace.gates.forEach(gate => gate.cards.forEach(card => {
    if (Array.isArray(card.linkRows)) {
      card.linkRows.forEach(row => addOrUpdateProjectLink(row.url, { status: row.status, comment: row.comment, source: row.source }, workspace));
    }
    if (Array.isArray(card.pageRows)) {
      card.pageRows.forEach(row => addOrUpdateProjectLink(row.url, { status: row.urlStatus, comment: row.comment, source: row.source }, workspace));
    }
  }));
}


const GATE1_LINK_STATUS_BY_TITLE = [
  { match: /robots|sitemap|редирект|ssl|cwv|pagespeed|мета|meta|изображения|404|thank you|cookie|футер|согласие/i, type: 'works' },
  { match: /индекс|яндекс вебмастер/i, type: 'indexed' },
  { match: /каналы размещения|публикац|баннер|объявлен|изображения для объявлений/i, type: 'placed' },
  { match: /партн|коллаб|инструментирование|utm|qr|crm/i, type: 'filled' }
];

const GATE1_COMPARISON_CONFIGS = [
  {
    match: /cwv|pagespeed|скорость/i,
    metrics: [
      { key: 'performance', label: 'Performance Score', norm: '≥ 90', threshold: 90, direction: 'min', unit: '' },
      { key: 'lcp', label: 'LCP', norm: '≤ 2.5 сек', threshold: 2.5, direction: 'max', unit: 'сек' },
      { key: 'inp', label: 'INP', norm: '≤ 200 мс', threshold: 200, direction: 'max', unit: 'мс' },
      { key: 'cls', label: 'CLS', norm: '≤ 0.1', threshold: 0.1, direction: 'max', unit: '' }
    ]
  },
  {
    match: /частотность|прогноз|стоимости|клики|переходы/i,
    metrics: [
      { key: 'impressions_forecast', label: 'Прогноз показов', norm: '> 0', threshold: 0, direction: 'min_exclusive', unit: '' },
      { key: 'clicks_forecast', label: 'Прогноз кликов', norm: '> 0', threshold: 0, direction: 'min_exclusive', unit: '' },
      { key: 'forecast_cpa', label: 'Прогноз CPA', norm: '≤ целевого CPA', threshold: 0, direction: 'custom', unit: '₽' }
    ]
  }
];

function isGate1Card(card) {
  return Boolean(card?.gateId === 'gate-1' || normalizeGateTitle(card?.gateTitle || '').includes(normalizeGateTitle(GATE1_ANALYTICS_TITLE)) || (state?.gates?.find(g => isGate1Analytics(g) && g.cards.some(c => c.id === card?.id))));
}

function getGate1CardMode(card) {
  if (!isGate1Card(card) || !card?.title) return null;
  const title = normalizeGateTitle(card.title);
  if (GATE1_PAGE_STRUCTURE_TITLES.some(page => title === normalizeGateTitle(page))) return 'page_structure';
  if (getComparisonConfig(card)) return 'comparison';
  if (getGate1LinkStatusType(card)) return 'links';
  return null;
}

function getGate1LinkStatusType(card) {
  const title = card?.title || '';
  const found = GATE1_LINK_STATUS_BY_TITLE.find(rule => rule.match.test(title));
  return found?.type || null;
}

function getComparisonConfig(card) {
  const title = card?.title || '';
  return GATE1_COMPARISON_CONFIGS.find(config => config.match.test(title)) || null;
}

function defaultPageNameForCard(card) {
  const title = String(card?.title || '').trim();
  if (normalizeGateTitle(title) === normalizeGateTitle('ГЛАВНАЯ')) return 'Главная страница';
  if (normalizeGateTitle(title) === normalizeGateTitle('КОНТАКТЫ')) return 'Контакты';
  return title || 'Страница';
}

function isRepeatablePageCard(card) {
  const title = normalizeGateTitle(card?.title || '');
  return GATE1_REPEATABLE_PAGE_TITLES.some(item => title === normalizeGateTitle(item));
}

function ensureGate1TypedData(card) {
  const mode = getGate1CardMode(card);
  if (!mode) return;
  if (mode === 'links') {
    if (!Array.isArray(card.linkRows) || !card.linkRows.length) {
      card.linkRows = [{ url: '', status: '', source: '', comment: '' }];
    }
  }
  if (mode === 'comparison') {
    const config = getComparisonConfig(card);
    const existing = new Map((card.comparisonRows || []).map(row => [row.key, row]));
    card.comparisonRows = (config?.metrics || []).map(metric => {
      const prev = existing.get(metric.key) || {};
      return { ...metric, value: prev.value || '', comment: prev.comment || '' };
    });
  }
  if (mode === 'page_structure') {
    if (!Array.isArray(card.pageRows) || !card.pageRows.length) {
      card.pageRows = [createPageStructureRow(defaultPageNameForCard(card), !isRepeatablePageCard(card))];
    }
    card.pageRows.forEach(row => normalizePageStructureRow(row, card));
  }
}

function createPageStructureRow(name = 'Страница', fixed = false) {
  return {
    id: makeId('page'),
    name,
    fixed: Boolean(fixed),
    url: '',
    urlStatus: '',
    h1: '',
    title: '',
    description: '',
    body: '',
    offer: '',
    ctaMode: 'needed',
    finalCta: '',
    source: '',
    comment: ''
  };
}

function normalizePageStructureRow(row, card) {
  row.id = row.id || makeId('page');
  row.name = row.name || defaultPageNameForCard(card);
  row.fixed = Boolean(row.fixed);
  row.url = row.url || '';
  row.urlStatus = row.urlStatus || '';
  row.h1 = row.h1 || '';
  row.title = row.title || '';
  row.description = row.description || '';
  row.body = row.body || '';
  row.offer = row.offer || '';
  row.ctaMode = row.ctaMode || 'needed';
  row.finalCta = row.finalCta || '';
  row.source = row.source || '';
  row.comment = row.comment || '';
  return row;
}

function evaluateLength(value, min, max) {
  const len = String(value || '').trim().length;
  if (!len) return { ok: false, label: 'Не заполнено', len };
  if (min && len < min) return { ok: false, label: `Мало: ${len}`, len };
  if (max && len > max) return { ok: false, label: `Много: ${len}`, len };
  return { ok: true, label: `ОК: ${len}`, len };
}

function evaluateComparisonRow(row) {
  const raw = String(row.value || '').replace(',', '.').trim();
  if (!raw) return { ok: null, label: 'Не заполнено' };
  const value = Number(raw);
  if (!Number.isFinite(value)) return { ok: false, label: 'Нужно число' };
  if (row.direction === 'min') return { ok: value >= row.threshold, label: value >= row.threshold ? 'Соответствует' : 'Требует улучшения' };
  if (row.direction === 'min_exclusive') return { ok: value > row.threshold, label: value > row.threshold ? 'Соответствует' : 'Требует улучшения' };
  if (row.direction === 'max') return { ok: value <= row.threshold, label: value <= row.threshold ? 'Соответствует' : 'Требует улучшения' };
  return { ok: null, label: 'Проверьте вручную' };
}

function snippetForPage(row) {
  const parts = [row.title, row.description, row.h1, row.offer, row.body].map(v => String(v || '').trim()).filter(Boolean);
  return truncateText(parts.join(' · '), 260);
}

function pageStructureStatus(row) {
  const checks = [
    Boolean(String(row.url || '').trim()),
    Boolean(row.urlStatus),
    enabledTools().length ? Boolean(row.source) : true,
    evaluateLength(row.h1, 20, 70).ok,
    evaluateLength(row.title, 30, 70).ok,
    evaluateLength(row.description, 70, 180).ok,
    evaluateLength(row.body, 300, 0).ok,
    row.ctaMode === 'not_needed' ? true : Boolean(String(row.finalCta || '').trim())
  ];
  const filled = checks.filter(Boolean).length;
  if (!filled) return 'not_started';
  if (filled === checks.length) return 'ready';
  return 'in_progress';
}

function typedDataPlain(card) {
  const mode = getGate1CardMode(card);
  ensureGate1TypedData(card);
  if (mode === 'links') {
    return (card.linkRows || []).map((row, i) => `${i + 1}. ${row.url || 'URL не указан'} — ${row.status || 'статус не выбран'}${row.source ? ` / источник: ${toolNameByKey(row.source)}` : ''}${row.comment ? ` — ${row.comment}` : ''}`).join('\n');
  }
  if (mode === 'comparison') {
    return (card.comparisonRows || []).map(row => {
      const result = evaluateComparisonRow(row).label;
      return `${row.label}: ${row.value || 'не заполнено'} ${row.unit || ''} / норма ${row.norm} / ${result}${row.comment ? ` / ${row.comment}` : ''}`;
    }).join('\n');
  }
  if (mode === 'page_structure') {
    return (card.pageRows || []).map(row => `${row.name}: ${row.url || 'URL не указан'} / ${row.urlStatus || 'статус не выбран'}${row.source ? ` / источник: ${toolNameByKey(row.source)}` : ''}\nH1: ${row.h1 || ''}\nTitle: ${row.title || ''}\nDescription: ${row.description || ''}\nСниппет: ${snippetForPage(row)}\nФинальный CTA: ${row.ctaMode === 'not_needed' ? 'не нужен' : (row.finalCta || 'не заполнен')}\nКомментарий: ${row.comment || ''}`).join('\n\n');
  }
  return '';
}


function normalizeGateTitle(title = '') {
  return String(title || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/->/g, '→')
    .replace(/\s+/g, ' ');
}

function isGate1Analytics(gate) {
  return Boolean(gate && (gate.id === 'gate-1' || normalizeGateTitle(gate.title).includes(normalizeGateTitle(GATE1_ANALYTICS_TITLE))));
}

function ensureUiState(workspace = state) {
  if (!workspace) return;
  workspace.ui = workspace.ui || {};
  workspace.ui.gate1Accordion = workspace.ui.gate1Accordion || {};
  workspace.ui.gate1Accordion.subblocks = workspace.ui.gate1Accordion.subblocks || {};
  workspace.ui.gate1Accordion.cards = workspace.ui.gate1Accordion.cards || {};
}

function ensureGate1Structure(workspace = state) {
  const gate = workspace?.gates?.find(isGate1Analytics);
  if (!gate || !Array.isArray(gate.cards)) return;
  const unitHeaderIndex = gate.cards.findIndex(card => normalizeGateTitle(card.title) === normalizeGateTitle(GATE1_SUBBLOCKS[3].title));
  if (unitHeaderIndex < 0) return;
  const existingTitles = new Set(gate.cards.map(card => normalizeGateTitle(card.title)));
  const cardsToAdd = GATE1_UNIT_ECONOMICS_CARDS
    .filter(([title]) => !existingTitles.has(normalizeGateTitle(title)))
    .map(([title, instruction], index) => ({
      id: 'gate1-unit-' + normalizeAspectKey(title),
      title,
      instruction,
      status: 'not_started',
      evidence: 'значение:\nпериод:\nкомментарий:',
      evidenceFields: [
        { key: normalizeAspectKey(title + ' значение'), label: 'Значение' },
        { key: normalizeAspectKey(title + ' период'), label: 'Период' },
        { key: normalizeAspectKey(title + ' комментарий'), label: 'Комментарий' }
      ],
      pages: '',
      notes: '',
      fields: {},
      sourceRow: 'v0.8-' + (index + 1),
      generatedBy: 'gate1-unit-economics'
    }));
  if (cardsToAdd.length) gate.cards.splice(unitHeaderIndex + 1, 0, ...cardsToAdd);
}

function getGate1Sections(gate, visibleCards = gate.cards) {
  const visibleIds = new Set((visibleCards || []).map(card => card.id));
  const starts = GATE1_SUBBLOCKS.map(config => {
    const index = gate.cards.findIndex(card => {
      const title = normalizeGateTitle(card.title);
      return config.aliases.some(alias => title === normalizeGateTitle(alias));
    });
    return { ...config, index };
  });
  return starts.map((config, order) => {
    const startIndex = config.index;
    const nextKnown = starts.slice(order + 1).map(item => item.index).find(index => index > startIndex);
    const endIndex = nextKnown ?? gate.cards.length;
    const headerCard = startIndex >= 0 ? gate.cards[startIndex] : null;
    const allInnerCards = startIndex >= 0 ? gate.cards.slice(startIndex + 1, endIndex) : [];
    const filteredInnerCards = allInnerCards.filter(card => visibleIds.has(card.id));
    return { ...config, headerCard, allInnerCards, filteredInnerCards };
  });
}

function getSectionStatus(cards) {
  if (!cards.length) return 'not_started';
  const ready = cards.filter(card => card.status === 'ready').length;
  const touched = cards.filter(card => card.status && card.status !== 'not_started').length;
  if (ready === cards.length) return 'ready';
  if (touched > 0) return 'in_progress';
  return 'not_started';
}

function getSectionProgressText(cards) {
  const ready = cards.filter(card => card.status === 'ready').length;
  return `${ready} из ${cards.length} блоков готово`;
}

function getGate1AccordionState() {
  ensureUiState(state);
  return state.ui.gate1Accordion;
}

function truncateText(text = '', limit = 160) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > limit ? clean.slice(0, limit - 1).trim() + '…' : clean;
}

function cardPreviewText(card) {
  const typed = getGate1CardMode(card) ? typedDataPlain(card) : '';
  const evidence = truncateText(typed || formatStructuredEvidencePlain(card, state), 150);
  const notes = truncateText(card.notes || '', 120);
  return evidence || notes || 'Краткий результат пока не заполнен.';
}

function isProjectPassportCard(card) {
  return card?.title === 'Паспорт проекта';
}

function isStartupSummaryCard(card) {
  return card?.title === 'Проблемы и ограничения на старте';
}

function isToolStatusCard(card) {
  return Boolean(card?.title && TOOL_CARD_CONFIG[card.title]);
}

function isCurrentResultsCard(card) {
  return card?.title === 'Текущие результаты';
}

function prepareSystemCards(workspace) {
  if (!workspace?.gates) return;
  ensureGate1Structure(workspace);
  ensureUiState(workspace);
  workspace.gates.forEach(gate => {
    gate.cards.forEach(card => {
      card.gateId = gate.id;
      card.gateTitle = gate.title;
      if (isToolStatusCard(card)) {
        ensureToolItems(card);
        card.evidenceFields = [];
        card.evidence = '';
      }
      if (isCurrentResultsCard(card)) ensureCurrentResults(card);
      ensureGate1TypedData(card);
      ensureInstructionWorkspace(card);
      if (isStartupSummaryCard(card)) card.isAutoSummary = true;
    });
  });
}

function ensureToolItems(card) {
  const config = TOOL_CARD_CONFIG[card.title] || [];
  if (!Array.isArray(card.toolItems)) card.toolItems = [];
  const existing = new Map(card.toolItems.map(item => [item.name, item]));
  card.toolItems = config.map(name => {
    const prev = existing.get(name) || {};
    return { name, status: prev.status || '', comment: prev.comment || '' };
  });
  card.evidenceFields = [];
  card.evidence = '';
  return card.toolItems;
}

function ensureCurrentResults(card) {
  if (!Array.isArray(card.currentResults)) card.currentResults = [];
  const existing = new Map(card.currentResults.map(item => [item.key, item]));
  card.currentResults = CURRENT_RESULTS_METRICS.map(metric => {
    const prev = existing.get(metric.key) || {};
    return {
      key: metric.key,
      label: metric.label,
      type: metric.type,
      value: prev.value || '',
      period: prev.period || '',
      comment: prev.comment || ''
    };
  });
  return card.currentResults;
}


function getSharedEvidenceByLabels(workspace, labels = []) {
  for (const label of labels) {
    const key = normalizeAspectKey(label);
    const value = workspace?.sharedEvidence?.[key];
    if (String(value || '').trim()) return value;
  }
  return '';
}

function syncProjectBeforeFromPositioning(workspace = state) {
  if (!workspace) return;
  workspace.project = workspace.project || {};
  workspace.sharedEvidence = workspace.sharedEvidence || {};
  const descriptionFallback = workspace.project.description || '';
  workspace.project.mainCta = getSharedEvidenceByLabels(workspace, ['главный CTA', 'список текущих CTA', 'CTA', 'основной CTA']) || workspace.project.mainCta || '';
  workspace.project.usp = getSharedEvidenceByLabels(workspace, ['УТП', 'позиционирования', 'стартовая формулировка', 'главное УТП']) || workspace.project.usp || '';
  workspace.project.offer = getSharedEvidenceByLabels(workspace, ['оффер', 'список текущих офферов', 'текущие офферы']) || workspace.project.offer || '';
  workspace.project.description = getSharedEvidenceByLabels(workspace, ['описание проекта', 'стартовая формулировка', 'позиционирования']) || descriptionFallback;
}

function syncProjectPassportCard(workspace = state) {
  if (!workspace?.gates) return;
  syncProjectBeforeFromPositioning(workspace);
  const card = workspace.gates.flatMap(g => g.cards).find(isProjectPassportCard);
  if (!card) return;
  const project = workspace.project || {};
  card.evidenceFields = [];
  const base = PROJECT_META_FIELDS.map(([key, label]) => `${label}:\n${project[key] || ''}`);
  const before = PROJECT_BEFORE_FIELDS.map(([key, label]) => `До начала работ / ${label}:\n${project[key] || ''}`);
  const after = PROJECT_AFTER_FIELDS.map(([key, label]) => `После завершения работ / ${label}:\n${project[key] || ''}`);
  card.evidence = [...base, ...before, ...after].join('\n\n');
}

function updateProjectChrome() {
  const project = projects.find(p => p.id === activeProjectId);
  const name = state?.project?.name || project?.name || 'Проект';
  const icon = project?.icon || getProjectIcon(name);
  if (els.brandTitle) els.brandTitle.textContent = name;
  if (els.brandMark) els.brandMark.textContent = icon;
}

function hasFinalPeriod(text = '') {
  const value = String(text || '').trim();
  if (!value) return false;
  return value.endsWith('.');
}

function textValuesForStatus(card, workspace = state) {
  if (!card) return [];
  if (isProjectPassportCard(card)) {
    const project = workspace?.project || {};
    return PROJECT_PASSPORT_FIELDS.map(([key]) => project[key] || '');
  }
  if (isStartupSummaryCard(card)) {
    return startupSummaryRows(workspace).map(row => row.value);
  }
  if (isCurrentResultsCard(card)) {
    return ensureCurrentResults(card).map(row => [row.value, row.period, row.comment].join(' '));
  }
  const fields = ensureEvidenceFields(card);
  if (fields.length) return fields.map(field => getEvidenceValue(field.key, workspace));
  return [card.evidence || ''];
}

function recalculateStatusForCard(card, workspace = state) {
  if (!card) return;
  if (isProjectPassportCard(card)) {
    const project = workspace?.project || {};
    const required = PROJECT_PASSPORT_FIELDS.map(([key]) => String(project[key] || '').trim());
    const nonEmpty = required.filter(Boolean);
    const longTexts = ['usp', 'offer', 'description', 'afterUsp', 'afterOffer', 'afterDescription'].map(key => String(project[key] || '').trim()).filter(Boolean);
    if (!nonEmpty.length) card.status = 'not_started';
    else if (nonEmpty.length === required.length && longTexts.every(hasFinalPeriod)) card.status = 'ready';
    else card.status = 'in_progress';
    return;
  }
  if (isToolStatusCard(card)) {
    const items = ensureToolItems(card);
    const chosen = items.filter(item => item.status === 'implemented' || item.status === 'not_implemented');
    if (!chosen.length) card.status = 'not_started';
    else if (chosen.length === items.length) card.status = 'ready';
    else card.status = 'in_progress';
    return;
  }
  if (isStartupSummaryCard(card)) {
    const toolCards = allCardsFromWorkspace(workspace).filter(isToolStatusCard);
    const items = toolCards.flatMap(c => ensureToolItems(c));
    const chosen = items.filter(item => item.status === 'implemented' || item.status === 'not_implemented');
    if (!chosen.length) card.status = 'not_started';
    else if (chosen.length === items.length) card.status = 'ready';
    else card.status = 'in_progress';
    return;
  }
  if (isCurrentResultsCard(card)) {
    const rows = ensureCurrentResults(card);
    const filled = rows.filter(row => String(row.value || '').trim() || String(row.period || '').trim() || String(row.comment || '').trim());
    const missingPeriod = rows.some(row => String(row.value || '').trim() && !String(row.period || '').trim());
    if (!filled.length) card.status = 'not_started';
    else if (missingPeriod) card.status = 'in_progress';
    else card.status = 'ready';
    return;
  }
  const gate1Mode = getGate1CardMode(card);
  if (gate1Mode) {
    ensureGate1TypedData(card);
    if (gate1Mode === 'links') {
      const rows = card.linkRows || [];
      const needsSource = enabledTools().length > 0;
      const touched = rows.filter(row => String(row.url || '').trim() || row.status || row.source || String(row.comment || '').trim()).length || (toolWorkspaceTouched(card) ? 1 : 0);
      const complete = rows.filter(row => String(row.url || '').trim() && row.status && (!needsSource || row.source)).length;
      if (!touched) card.status = 'not_started';
      else if (complete === rows.length && toolWorkspaceIsComplete(card)) card.status = 'ready';
      else card.status = 'in_progress';
      return;
    }
    if (gate1Mode === 'comparison') {
      const rows = card.comparisonRows || [];
      const touched = rows.filter(row => String(row.value || '').trim()).length;
      const done = rows.filter(row => evaluateComparisonRow(row).ok === true).length;
      const toolTouched = toolWorkspaceTouched(card);
      if (!touched && !toolTouched) card.status = 'not_started';
      else if (done === rows.length && toolWorkspaceIsComplete(card)) card.status = 'ready';
      else card.status = 'in_progress';
      return;
    }
    if (gate1Mode === 'page_structure') {
      const rows = card.pageRows || [];
      const statuses = rows.map(pageStructureStatus);
      if (statuses.every(status => status === 'not_started') && !toolWorkspaceTouched(card)) card.status = 'not_started';
      else if (statuses.every(status => status === 'ready') && toolWorkspaceIsComplete(card)) card.status = 'ready';
      else card.status = 'in_progress';
      return;
    }
  }
  const instructionRows = ensureInstructionWorkspace(card);
  if (instructionRows.length) {
    const touchedRows = instructionRows.filter(row => String(row.link || '').trim() || row.status || String(row.result || '').trim() || String(row.comment || '').trim());
    const completeRows = instructionRows.filter(row => row.status && String(row.result || '').trim());
    const evidenceValues = ensureEvidenceFields(card).map(field => String(getEvidenceValue(field.key, workspace) || '').trim()).filter(Boolean);
    if (!touchedRows.length && !evidenceValues.length) card.status = 'not_started';
    else if (completeRows.length === instructionRows.length) card.status = 'ready';
    else card.status = 'in_progress';
    return;
  }
  const values = textValuesForStatus(card, workspace).map(v => String(v || '').trim());
  const nonEmpty = values.filter(Boolean);
  if (!nonEmpty.length) card.status = 'not_started';
  else if (nonEmpty.length === values.length && nonEmpty.every(hasFinalPeriod)) card.status = 'ready';
  else card.status = 'in_progress';
}

function recalculateAllStatuses(workspace = state) {
  if (!workspace?.gates) return;
  allCardsFromWorkspace(workspace).forEach(card => recalculateStatusForCard(card, workspace));
}

function allCardsFromWorkspace(workspace = state) {
  return (workspace?.gates || []).flatMap(g => g.cards.map(c => { c.gateId = g.id; c.gateTitle = g.title; return c; }));
}

function projectPassportFieldsHtml() {
  syncProjectBeforeFromPositioning(state);
  const project = state.project || {};
  const inputHtml = ([key, label], prefix = '', options = {}) => {
    const isLong = ['usp','offer','description','afterUsp','afterOffer','afterDescription'].includes(key);
    const value = project[key] || '';
    const title = prefix ? `${prefix} / ${label}` : label;
    const readonly = options.readonly ? ' readonly' : '';
    const dataAttr = options.readonly ? '' : ` data-project-inline="${escapeAttr(key)}"`;
    return `<label>${escapeHtml(title)}${isLong
      ? `<textarea${dataAttr}${readonly} rows="3">${escapeHtml(value)}</textarea>`
      : `<input${dataAttr}${readonly} value="${escapeAttr(value)}" />`}</label>`;
  };
  return `<div class="project-passport-sync">
    <div class="form-grid compact-form passport-meta-grid">
      ${PROJECT_META_FIELDS.map(field => inputHtml(field)).join('')}
    </div>
    <div class="passport-compare-grid compact-compare">
      <section class="passport-column">
        <h3>До начала работ</h3>
        ${PROJECT_BEFORE_FIELDS.map(field => inputHtml(field, '', { readonly: true })).join('')}
      </section>
      <section class="passport-column">
        <h3>После завершения работ</h3>
        ${PROJECT_AFTER_FIELDS.map(field => inputHtml(field)).join('')}
      </section>
    </div>
  </div>`;
}

function toolItemsHtml(card) {
  const items = ensureToolItems(card);
  return `<div class="tool-status-list">
    <table class="mini-table">
      <thead><tr><th>Элемент</th><th>Статус</th><th>Комментарий</th></tr></thead>
      <tbody>${items.map((item, index) => `<tr>
        <td>${escapeHtml(item.name)}</td>
        <td><select data-tool-card-id="${escapeAttr(card.id)}" data-tool-index="${index}" data-tool-field="status">
          <option value="" ${!item.status ? 'selected' : ''}>Выбрать</option>
          <option value="implemented" ${item.status === 'implemented' ? 'selected' : ''}>Реализовано</option>
          <option value="not_implemented" ${item.status === 'not_implemented' ? 'selected' : ''}>Не реализовано</option>
        </select></td>
        <td><input data-tool-card-id="${escapeAttr(card.id)}" data-tool-index="${index}" data-tool-field="comment" value="${escapeAttr(item.comment || '')}" placeholder="Краткое уточнение" /></td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;
}

function startupSummaryRows(workspace = state) {
  return allCardsFromWorkspace(workspace)
    .filter(isToolStatusCard)
    .flatMap(card => ensureToolItems(card).map(item => ({
      group: card.title,
      name: item.name,
      implemented: item.status === 'implemented',
      selected: item.status === 'implemented' || item.status === 'not_implemented',
      value: item.status === 'implemented' ? 'Да' : 'Нет',
      comment: item.comment || ''
    })));
}

function startupSummaryHtml() {
  const rows = startupSummaryRows(state);
  if (!rows.length) return '<div class="empty compact-empty">Нет данных для автоматической сводки.</div>';
  return `<div class="startup-summary">
    <table class="mini-table">
      <thead><tr><th>Блок</th><th>Элемент</th><th>Есть на старте</th><th>Комментарий</th></tr></thead>
      <tbody>${rows.map(row => `<tr>
        <td>${escapeHtml(row.group)}</td>
        <td>${escapeHtml(row.name)}</td>
        <td><span class="yesno ${row.implemented ? 'yes' : 'no'}">${row.implemented ? 'Да' : 'Нет'}</span></td>
        <td>${escapeHtml(row.comment)}</td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;
}

function formatStructuredEvidencePlain(card, workspace = state) {
  if (getGate1CardMode(card)) return typedDataPlain(card);
  if (isProjectPassportCard(card)) {
    const project = workspace.project || {};
    const meta = PROJECT_META_FIELDS.map(([key, label]) => `${label}: ${project[key] || ''}`);
    const before = PROJECT_BEFORE_FIELDS.map(([key, label]) => `До начала работ / ${label}: ${project[key] || ''}`);
    const after = PROJECT_AFTER_FIELDS.map(([key, label]) => `После завершения работ / ${label}: ${project[key] || ''}`);
    return [...meta, ...before, ...after].join('\n');
  }
  if (isCurrentResultsCard(card)) {
    return ensureCurrentResults(card).map(row => `${row.label}: ${row.value || ''}${row.period ? ' | период: ' + row.period : ''}${row.comment ? ' | комментарий: ' + row.comment : ''}`).join('\n');
  }
  if (isToolStatusCard(card)) {
    const evidencePart = ensureEvidenceFields(card).map(field => `${field.label}: ${getEvidenceValue(field.key, workspace)}`).join('\n');
    const toolPart = ensureToolItems(card).map(item => `${item.name}: ${item.status === 'implemented' ? 'Реализовано' : item.status === 'not_implemented' ? 'Не реализовано' : 'Не выбрано'}${item.comment ? ' — ' + item.comment : ''}`).join('\n');
    return [evidencePart, toolPart].filter(Boolean).join('\n\n');
  }
  if (isStartupSummaryCard(card)) {
    return startupSummaryRows(workspace).map(row => `${row.name}: ${row.implemented ? 'Да' : 'Нет'}`).join('\n');
  }
  const instructionPart = instructionWorkspacePlain(card);
  const fields = ensureEvidenceFields(card);
  const evidencePart = fields.length ? fields.map(field => `${field.label}: ${getEvidenceValue(field.key, workspace)}`).join('\n') : (card.evidence || '');
  return [instructionPart, evidencePart].filter(Boolean).join('\n\n');
}

function normalizeAspectKey(label = '') {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[«»"'`]/g, '')
    .replace(/[^a-zа-я0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '') || 'aspect';
}

function extractEvidenceFields(raw = '') {
  const text = String(raw || '').trim();
  if (!text) return [];
  const fields = [];
  const lines = text.split(/\r?\n/);
  let current = null;
  let previousWasBlank = true;
  lines.forEach(line => {
    const clean = line.trim();
    if (!clean) { previousWasBlank = true; return; }
    const match = line.match(/^\s*([^:\n]{2,120})\s*:\s*(.*)$/);
    if (match) {
      current = {
        key: normalizeAspectKey(match[1]),
        label: match[1].trim(),
        value: (match[2] || '').trim()
      };
      fields.push(current);
    } else if (looksLikeEvidenceHeading(clean, previousWasBlank)) {
      current = { key: normalizeAspectKey(clean), label: clean, value: '' };
      fields.push(current);
    } else if (current) {
      current.value = [current.value, clean].filter(Boolean).join('\n');
    }
    previousWasBlank = false;
  });
  if (!fields.length && text) {
    const label = text.replace(/:$/,'').trim();
    fields.push({ key: normalizeAspectKey(label), label, value: '' });
  }
  return fields;
}

function looksLikeEvidenceHeading(text, previousWasBlank) {
  if (!text || text.length > 120) return false;
  if (/[.!?]$/.test(text)) return false;
  if (/[,;]/.test(text)) return false;
  if (previousWasBlank) return true;
  return /^(что|кто|кому|какой|какая|какие|какое|где|зачем|почему|ради|список|чего)\b/i.test(text);
}

function initializeEvidenceStructure(workspace) {
  workspace.sharedEvidence = workspace.sharedEvidence || {};
  (workspace.gates || []).forEach(gate => {
    (gate.cards || []).forEach(card => {
      const parsed = extractEvidenceFields(card.evidence || '');
      if (!Array.isArray(card.evidenceFields) || !card.evidenceFields.length) {
        card.evidenceFields = parsed.map(item => ({ key: item.key, label: item.label }));
      }
      parsed.forEach(item => {
        if (item.value && !workspace.sharedEvidence[item.key]) workspace.sharedEvidence[item.key] = item.value;
      });
      if (!Array.isArray(card.evidenceFields)) card.evidenceFields = [];
    });
  });
  syncEvidenceTexts(workspace);
}

function ensureEvidenceFields(card) {
  if (!card) return [];
  if (!Array.isArray(card.evidenceFields) || !card.evidenceFields.length) {
    card.evidenceFields = extractEvidenceFields(card.evidence || '').map(item => ({ key: item.key, label: item.label }));
  }
  return card.evidenceFields || [];
}

function getEvidenceValue(key, workspace = state) {
  if (!workspace) return '';
  workspace.sharedEvidence = workspace.sharedEvidence || {};
  return workspace.sharedEvidence[key] || '';
}

function setEvidenceValue(key, value, workspace = state) {
  if (!workspace) return;
  workspace.sharedEvidence = workspace.sharedEvidence || {};
  workspace.sharedEvidence[key] = value;
  syncEvidenceTexts(workspace);
}

function composeEvidenceText(card, workspace = state) {
  const fields = ensureEvidenceFields(card);
  if (!fields.length) return card?.evidence || '';
  return fields.map(field => `${field.label}:\n${getEvidenceValue(field.key, workspace)}`).join('\n\n');
}

function syncEvidenceTexts(workspace = state) {
  if (!workspace?.gates) return;
  workspace.gates.forEach(gate => {
    gate.cards.forEach(card => {
      if (isToolStatusCard(card)) {
        card.evidenceFields = [];
        card.evidence = '';
      } else if (getGate1CardMode(card)) {
        card.evidence = typedDataPlain(card);
      } else {
        card.evidence = composeEvidenceText(card, workspace);
      }
    });
  });
}

function getEvidenceCatalog() {
  const catalog = new Map();
  allCards().forEach(card => {
    ensureEvidenceFields(card).forEach(field => {
      if (!catalog.has(field.key)) {
        catalog.set(field.key, { key: field.key, label: field.label, cards: [] });
      }
      catalog.get(field.key).cards.push({ title: card.title, gateTitle: card.gateTitle, cardId: card.id });
    });
  });
  return Array.from(catalog.values()).sort((a, b) => a.label.localeCompare(b.label, 'ru'));
}

function evidenceStructuredHtml(card) {
  const fields = ensureEvidenceFields(card);
  if (!fields.length) return `<textarea data-field="evidence" data-card-id="${card.id}" rows="3">${escapeHtml(card.evidence || '')}</textarea>`;
  return `<div class="evidence-fields">${fields.map(field => `
    <label class="evidence-item">
      <span class="evidence-title">${escapeHtml(field.label)}</span>
      <textarea data-evidence-key="${escapeAttr(field.key)}" data-card-id="${escapeAttr(card.id)}" rows="3">${escapeHtml(getEvidenceValue(field.key))}</textarea>
    </label>`).join('')}</div>`;
}

function getProgress(cards = allCards()) {
  if (!cards.length) return 0;
  return Math.round((cards.filter(c => c.status === 'ready').length / cards.length) * 100);
}

function render() {
  updateProjectChrome();
  renderSummary();
  renderGateNav();
  if (activeView === 'project') renderProject();
  if (activeView === 'metrics') renderMetrics();
  if (activeView === 'scheme') renderScheme();
  if (activeView === 'gate') renderGate();
}

function renderSummary() {
  if (activeView !== 'project') {
    els.summaryGrid.hidden = true;
    els.summaryGrid.innerHTML = '';
    return;
  }
  els.summaryGrid.hidden = false;
  const cards = allCards();
  const counts = countByStatus(cards);
  const gatesCount = state.gates.length;
  const metricsCount = state.metrics?.length || 0;
  const progress = getProgress(cards);
  els.summaryGrid.innerHTML = `
    <div class="summary-card"><div class="summary-label">Gate</div><div class="summary-value">${gatesCount}</div><div class="summary-help">крупных этапов</div></div>
    <div class="summary-card"><div class="summary-label">Блоки</div><div class="summary-value">${cards.length}</div><div class="summary-help">карточек из CSV</div></div>
    <div class="summary-card"><div class="summary-label">Готово</div><div class="summary-value">${progress}%</div><div class="summary-help">${counts.ready || 0} блоков закрыто</div></div>
    <div class="summary-card"><div class="summary-label">Метрики</div><div class="summary-value">${metricsCount}</div><div class="summary-help">строк данных</div></div>
  `;
}

function renderGateNav() {
  els.gateNav.innerHTML = state.gates.map(g => {
    const progress = getProgress(g.cards);
    const cls = activeView === 'gate' && activeGateId === g.id ? 'active' : '';
    return `<button class="gate-btn ${cls}" data-gate-id="${g.id}">${escapeHtml(g.title)}<span class="small">${g.cards.length} блоков, готово ${progress}%</span></button>`;
  }).join('');
  document.querySelectorAll('[data-gate-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeView = 'gate';
      activeGateId = btn.dataset.gateId;
      render();
    });
  });
}

function setToolbarVisible(visible) {
  els.workspaceToolbar.style.display = visible ? 'flex' : 'none';
}

function renderProject() {
  activeView = 'project';
  setToolbarVisible(false);
  els.pageTitle.textContent = 'Паспорт проекта';
  const tpl = document.getElementById('projectTemplate').content.cloneNode(true);
  els.contentArea.innerHTML = '';
  els.contentArea.appendChild(tpl);
  document.querySelectorAll('[data-project]').forEach(input => {
    const key = input.dataset.project;
    input.value = state.project[key] || '';
    input.addEventListener('input', () => {
      state.project[key] = input.value;
      syncProjectPassportCard(state);
      flashSaving();
    });
  });
}

function renderGate() {
  activeView = 'gate';
  setToolbarVisible(true);
  const gate = state.gates.find(g => g.id === activeGateId);
  if (!gate) {
    els.pageTitle.textContent = 'Gate не найден';
    els.contentArea.innerHTML = '<div class="empty">Выбранный Gate не найден. Выберите нужный Gate в левом меню.</div>';
    return;
  }
  els.pageTitle.textContent = gate.title;
  const query = els.searchInput.value.trim().toLowerCase();
  const filter = els.statusFilter.value;
  let cards = Array.isArray(gate.cards) ? gate.cards : [];
  if (filter !== 'all') cards = cards.filter(c => c.status === filter);
  if (query) {
    cards = cards.filter(c => [c.title, c.instruction, composeEvidenceText(c), c.pages, c.notes].join(' ').toLowerCase().includes(query));
  }
  renderGateTable(gate, cards);
}




const DEMAND_ROUTE_DEFAULT = {
  promoted: '',
  excluded: '',
  geo: '',
  language: '',
  adSystem: 'yandex',
  yandexCampaignType: 'search_rsya',
  googleCampaignType: 'search_display',
  landing: '',
  goal: '',
  targetCpa: '',
  steps: {},
  groups: []
};

const DEMAND_ROUTE_STEPS = [
  {
    key: 'frames',
    title: '1. Рамки продвижения',
    task: 'Зафиксировать границы кампании: что продвигаем, что исключаем, куда ведём трафик и какой результат нужен.',
    fields: [
      ['value_proposition', 'Что считаем главным продуктом / услугой'],
      ['limitations', 'Ограничения и исключения'],
      ['success_metric', 'Целевое действие и критерий успеха']
    ]
  },
  {
    key: 'audience_language',
    title: '2. Язык аудитории',
    task: 'Перевести продукт на язык клиента: как он сам формулирует проблему, услугу и желаемый результат.',
    fields: [
      ['phrases', 'Фразы аудитории'],
      ['pain_words', 'Слова боли'],
      ['commercial_words', 'Коммерческие уточнения']
    ]
  },
  {
    key: 'intents',
    title: '3. Намерения',
    task: 'Разделить спрос по намерениям, чтобы не смешивать горячие заявки, сравнение, информацию и мусор.',
    fields: [
      ['hot_intents', 'Горячие интенты'],
      ['compare_intents', 'Сравнение / выбор'],
      ['trash_intents', 'Мусорные интенты']
    ]
  },
  {
    key: 'clusters',
    title: '4. Кластеры / группы',
    task: 'Собрать группы, в которых у каждой есть интент, посадочная и понятная логика показа.',
    fields: [
      ['cluster_logic', 'Правило группировки'],
      ['landing_match', 'Соответствие посадочным'],
      ['priority_groups', 'Приоритетные группы']
    ]
  },
  {
    key: 'economics',
    title: '5. Оценка спроса и экономики',
    task: 'Проверить, может ли спрос дать результат в рамках целевого CPL / CPA.',
    fields: [
      ['demand_volume', 'Оценка спроса'],
      ['forecast_cpa', 'Прогноз CPL / CPA'],
      ['decision', 'Решение по запуску / ограничению']
    ]
  },
  {
    key: 'group_content',
    title: '6. Наполнение групп',
    task: 'Заполнить группы ключами, минусами, аудиториями, объявлениями и дополнениями под выбранные системы.',
    fields: [
      ['search_logic', 'Поиск / Search: ключи, минусы, объявления'],
      ['display_logic', 'РСЯ / Display: аудитории, исключения, креативы'],
      ['assets_logic', 'Дополнения / assets']
    ]
  },
  {
    key: 'launch_package',
    title: '7. Запускной пакет',
    task: 'Собрать финальную таблицу, достаточную для запуска кампании без повторного разбора семантики.',
    fields: [
      ['launch_ready', 'Что готово к запуску'],
      ['risks', 'Что требует решения'],
      ['handoff', 'Что передаём на настройку']
    ]
  }
];

function ensureDemandRouteState() {
  if (!state) return structuredClone(DEMAND_ROUTE_DEFAULT);
  state.demandRoute = state.demandRoute || structuredClone(DEMAND_ROUTE_DEFAULT);
  state.demandRoute.steps = state.demandRoute.steps || {};
  state.demandRoute.groups = Array.isArray(state.demandRoute.groups) ? state.demandRoute.groups : [];
  DEMAND_ROUTE_STEPS.forEach(step => {
    state.demandRoute.steps[step.key] = state.demandRoute.steps[step.key] || {};
    step.fields.forEach(([key]) => { state.demandRoute.steps[step.key][key] = state.demandRoute.steps[step.key][key] || ''; });
  });
  return state.demandRoute;
}

function demandSearchEnabled(route) {
  return route.adSystem === 'yandex' || route.adSystem === 'both' || route.adSystem === 'google' || route.adSystem === 'yandex_google'
    ? ((route.adSystem === 'yandex' || route.adSystem === 'both') && /search|поиск/.test(route.yandexCampaignType || '')) || ((route.adSystem === 'google' || route.adSystem === 'both') && /search/.test(route.googleCampaignType || ''))
    : false;
}

function demandDisplayEnabled(route) {
  return ((route.adSystem === 'yandex' || route.adSystem === 'both') && /rsya|рся/.test(route.yandexCampaignType || '')) || ((route.adSystem === 'google' || route.adSystem === 'both') && /display/.test(route.googleCampaignType || ''));
}

function demandSystemLabel(value) {
  return ({ yandex: 'Яндекс', google: 'Google', both: 'Яндекс + Google' })[value] || 'Яндекс';
}

function demandCampaignTypeLabel(route) {
  const parts = [];
  if (route.adSystem === 'yandex' || route.adSystem === 'both') parts.push('Яндекс: ' + ({ search:'Поиск', rsya:'РСЯ', search_rsya:'Поиск + РСЯ' }[route.yandexCampaignType] || 'Поиск + РСЯ'));
  if (route.adSystem === 'google' || route.adSystem === 'both') parts.push('Google: ' + ({ search:'Search', display:'Display', search_display:'Search + Display' }[route.googleCampaignType] || 'Search + Display'));
  return parts.join(' · ');
}

function demandGroupHasSearchNeed(route, group) {
  return demandSearchEnabled(route) && /поиск|search|оба|поиск \+ рся|search \+ display|универс/.test(normalizeGateTitle(group.type || ''));
}

function demandGroupHasDisplayNeed(route, group) {
  return demandDisplayEnabled(route) && /рся|display|оба|поиск \+ рся|search \+ display|универс/.test(normalizeGateTitle(group.type || ''));
}

function demandChecks() {
  const route = ensureDemandRouteState();
  const issues = [];
  if (!String(route.promoted || '').trim()) issues.push({ level: 'problem', text: 'Нет «что продвигаем» — нельзя собирать семантику.' });
  if (!String(route.excluded || '').trim()) issues.push({ level: 'needs_review', text: 'Нет «что не продвигаем» — высокий риск мусорного спроса.' });
  if (!String(route.landing || '').trim()) issues.push({ level: 'problem', text: 'Нет посадочной страницы для запуска.' });
  (route.groups || []).forEach((group, index) => {
    const name = group.name || `Группа ${index + 1}`;
    if (!String(group.intent || '').trim()) issues.push({ level: 'problem', text: `${name}: нет интента.` });
    if (!String(group.landing || route.landing || '').trim()) issues.push({ level: 'problem', text: `${name}: нет посадочной.` });
    if (demandGroupHasSearchNeed(route, group) && !String(group.keywords || '').trim()) issues.push({ level: 'problem', text: `${name}: включён Поиск / Search, но нет ключевых фраз.` });
    if (demandGroupHasDisplayNeed(route, group) && !String(group.audience || '').trim()) issues.push({ level: 'problem', text: `${name}: включена РСЯ / Display, но нет аудитории.` });
    if (!String(group.negatives || '').trim()) issues.push({ level: 'needs_review', text: `${name}: нет минус-фраз / negatives.` });
    if (!String(group.ad || '').trim()) issues.push({ level: 'in_progress', text: `${name}: нет объявления.` });
    const target = Number(String(route.targetCpa || '').replace(/[^0-9.,]/g, '').replace(',', '.'));
    const forecast = Number(String(group.forecastCpa || '').replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (target && forecast && forecast > target) issues.push({ level: 'needs_review', text: `${name}: прогноз CPA выше нормы.` });
  });
  return issues;
}

function getDemandRouteStatus() {
  const route = ensureDemandRouteState();
  if (!String(route.promoted || '').trim() && !String(route.excluded || '').trim() && !String(route.landing || '').trim()) return 'not_started';
  const issues = demandChecks();
  if (issues.some(i => i.level === 'problem')) return 'problem';
  if (!(route.groups || []).length) return 'in_progress';
  if (issues.some(i => i.level === 'needs_review')) return 'needs_review';
  if (issues.some(i => i.level === 'in_progress')) return 'in_progress';
  return 'ready';
}

function getDemandProgressText() {
  const route = ensureDemandRouteState();
  const completed = DEMAND_ROUTE_STEPS.filter(step => step.fields.some(([key]) => String(route.steps?.[step.key]?.[key] || '').trim())).length;
  const groups = (route.groups || []).length;
  return `${completed} из ${DEMAND_ROUTE_STEPS.length} шагов заполнено · ${groups} групп`; 
}

function firstIncompleteDemandStepKey(route) {
  const found = DEMAND_ROUTE_STEPS.find(step => !step.fields.some(([key]) => String(route.steps?.[step.key]?.[key] || '').trim()));
  return found?.key || 'launch_package';
}

function demandInput(name, label, type = 'text', placeholder = '') {
  const route = ensureDemandRouteState();
  const value = route[name] || '';
  const tag = type === 'textarea'
    ? `<textarea data-demand-field="${escapeAttr(name)}" placeholder="${escapeAttr(placeholder)}">${escapeHtml(value)}</textarea>`
    : `<input data-demand-field="${escapeAttr(name)}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}" />`;
  return `<label class="demand-field"><span>${escapeHtml(label)}</span>${tag}</label>`;
}



const PAIN_OFFER_DEFAULT = {
  product: '',
  landing: '',
  mainSegment: '',
  finalOffer: '',
  sections: {},
  openSection: ''
};

const PAIN_OFFER_SECTIONS = [
  {
    key: 'search_demand',
    title: '1. Поисковый спрос',
    orient: 'Понять, что люди уже ищут, какими словами формулируют задачу и какой интент стоит за спросом.',
    standard: 'Есть ядро запросов, частотность / динамика, интент и короткий вывод по спросу.',
    fields: [
      ['queries', 'Основные запросы'],
      ['frequency', 'Частотность / динамика'],
      ['intent', 'Интент'],
      ['conclusion', 'Вывод']
    ]
  },
  {
    key: 'competitor_offer',
    title: '2. Конкурентное предложение',
    orient: 'Понять, что рынок уже обещает клиенту и где есть возможность отличиться.',
    standard: 'Зафиксированы конкуренты, повторяющиеся обещания, слабые места и точка отличия.',
    fields: [
      ['competitors', 'Основные конкуренты'],
      ['repeatedPromises', 'Повторяющиеся обещания'],
      ['weakSpots', 'Слабые места'],
      ['differentiation', 'Возможность отличиться']
    ]
  },
  {
    key: 'pains_reasons',
    title: '3. Боли и причины спроса',
    orient: 'Вытащить не абстрактные боли, а реальные причины, из-за которых человек ищет решение.',
    standard: 'Есть явные боли, скрытые боли, причина спроса и одна сильнейшая боль.',
    fields: [
      ['explicitPains', 'Явные боли'],
      ['hiddenPains', 'Скрытые боли'],
      ['reason', 'Причина спроса'],
      ['mainPain', 'Сильнейшая боль']
    ]
  },
  {
    key: 'jtbd',
    title: '4. JTBD',
    orient: 'Собрать работу клиента в формате ситуации, действия и желаемого результата.',
    standard: 'Заполнены функциональная, эмоциональная, социальная работа и главный JTBD по формуле.',
    fields: [
      ['functionalJob', 'Функциональная работа'],
      ['emotionalJob', 'Эмоциональная работа'],
      ['socialJob', 'Социальная работа'],
      ['mainJtbd', 'Главный JTBD: Когда [ситуация], я хочу [действие], чтобы [результат].']
    ]
  },
  {
    key: 'segments_personas',
    title: '5. ЦА, сегменты и персоны',
    orient: 'Разделить аудиторию по сценариям выбора, триггерам и критериям решения.',
    standard: 'Есть сегменты спроса, персоны, триггеры выбора и критерии выбора.',
    fields: [
      ['segments', 'Сегменты спроса'],
      ['personas', 'Персоны'],
      ['triggers', 'Триггеры выбора'],
      ['criteria', 'Критерии выбора']
    ]
  },
  {
    key: 'offer',
    title: '6. Офер',
    orient: 'Собрать обещание результата для конкретного сегмента на основе боли и JTBD.',
    standard: 'Есть сегмент, обещание результата, доказательство, CTA и финальная формула офера.',
    fields: [
      ['forWhom', 'Для кого'],
      ['resultPromise', 'Обещание результата'],
      ['proof', 'Доказательство'],
      ['cta', 'CTA'],
      ['offerFormula', 'Финальная формула: Для [сегмент] мы помогаем получить [результат] без [главный страх / барьер].']
    ]
  },
  {
    key: 'collaboration',
    title: '7. Коллаборационный потенциал',
    orient: 'Найти партнёров и внешние точки усиления офера без раздувания рекламного бюджета.',
    standard: 'Есть потенциальные партнёры, выгода для них, формат коллаборации и приоритет.',
    fields: [
      ['partners', 'Потенциальные партнёры'],
      ['partnerBenefit', 'Почему им выгодно'],
      ['format', 'Формат коллаборации'],
      ['priority', 'Приоритет']
    ]
  }
];

function ensurePainOfferState() {
  if (!state) return structuredClone(PAIN_OFFER_DEFAULT);
  state.painOfferRoute = state.painOfferRoute || structuredClone(PAIN_OFFER_DEFAULT);
  state.painOfferRoute.sections = state.painOfferRoute.sections || {};
  PAIN_OFFER_SECTIONS.forEach(section => {
    state.painOfferRoute.sections[section.key] = state.painOfferRoute.sections[section.key] || {};
    section.fields.forEach(([key]) => { state.painOfferRoute.sections[section.key][key] = state.painOfferRoute.sections[section.key][key] || ''; });
    state.painOfferRoute.sections[section.key].evidence = state.painOfferRoute.sections[section.key].evidence || '';
  });
  return state.painOfferRoute;
}

function painSectionFilled(section) {
  const route = ensurePainOfferState();
  const data = route.sections?.[section.key] || {};
  const filledFields = section.fields.filter(([key]) => String(data[key] || '').trim()).length;
  return filledFields >= Math.min(2, section.fields.length) && String(data.evidence || '').trim();
}

function painSectionTouched(section) {
  const route = ensurePainOfferState();
  const data = route.sections?.[section.key] || {};
  return section.fields.some(([key]) => String(data[key] || '').trim()) || String(data.evidence || '').trim();
}

function painSectionStatus(section) {
  if (painSectionFilled(section)) return 'ready';
  if (painSectionTouched(section)) return 'in_progress';
  return 'not_started';
}

function painOfferChecks() {
  const route = ensurePainOfferState();
  const issues = [];
  if (!String(route.product || '').trim()) issues.push({ level:'problem', text:'Нет продукта / услуги — маршрут офера не начат.' });
  const offer = route.sections.offer || {};
  const pains = route.sections.pains_reasons || {};
  const jtbd = route.sections.jtbd || {};
  if (String(route.finalOffer || '').trim() || String(offer.offerFormula || '').trim()) {
    if (!String(pains.mainPain || '').trim() || !String(jtbd.mainJtbd || '').trim()) {
      issues.push({ level:'problem', text:'Нет связи между болью, JTBD и офером.' });
    }
    if (!String(offer.cta || '').trim()) issues.push({ level:'in_progress', text:'Есть офер, но нет CTA.' });
    if (!String(offer.proof || '').trim() && !String(offer.evidence || '').trim()) issues.push({ level:'in_progress', text:'Есть офер, но нет доказательства.' });
  }
  return issues;
}

function getPainOfferStatus() {
  const route = ensurePainOfferState();
  if (!String(route.product || '').trim()) return 'not_started';
  const issues = painOfferChecks();
  if (issues.some(i => i.level === 'problem')) return 'problem';
  const readyCount = PAIN_OFFER_SECTIONS.filter(painSectionFilled).length;
  const hasFinal = String(route.finalOffer || '').trim() || String(route.sections?.offer?.offerFormula || '').trim();
  if (hasFinal && String(route.sections?.offer?.proof || '').trim() && String(route.sections?.offer?.cta || '').trim()) return 'ready';
  if (readyCount > 0) return 'in_progress';
  return 'in_progress';
}

function getPainOfferProgressText() {
  const ready = PAIN_OFFER_SECTIONS.filter(painSectionFilled).length;
  return `${ready} из ${PAIN_OFFER_SECTIONS.length} разделов готово`;
}

function firstIncompletePainSectionKey(route) {
  const found = PAIN_OFFER_SECTIONS.find(section => !painSectionFilled(section));
  return found?.key || 'offer';
}

function painInput(name, label, type = 'text', placeholder = '') {
  const route = ensurePainOfferState();
  const value = route[name] || '';
  const tag = type === 'textarea'
    ? `<textarea data-pain-field="${escapeAttr(name)}" placeholder="${escapeAttr(placeholder)}">${escapeHtml(value)}</textarea>`
    : `<input data-pain-field="${escapeAttr(name)}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}" />`;
  return `<label class="demand-field"><span>${escapeHtml(label)}</span>${tag}</label>`;
}

function renderPainOfferRoute(section) {
  const route = ensurePainOfferState();
  const status = getPainOfferStatus();
  const issues = painOfferChecks();
  const openSection = route.openSection || firstIncompletePainSectionKey(route);
  return `<div class="demand-route pain-offer-route">
    <div class="demand-route-head">
      <div>
        <div class="analytics-path">Gate 1 → ${escapeHtml(section.title)}</div>
        <h3>Боль → JTBD → офер</h3>
        <p class="muted">Цель: превратить спрос, боли и конкурентную среду в готовый офер по сегментам.</p>
      </div>
      <span class="status-pill status-${status}">${STATUS_LABELS[status] || status}</span>
    </div>
    <section class="demand-frame">
      <div class="demand-section-title"><div><h4>Верх блока</h4><p class="muted">Главный результат маршрута — финальный офер.</p></div></div>
      <div class="demand-grid three">
        ${painInput('product', 'Продукт / услуга', 'text', 'что анализируем')}
        ${painInput('landing', 'Посадочная / проект', 'text', 'к чему относится офер')}
        ${painInput('mainSegment', 'Главный сегмент', 'text', 'для кого делаем')}
        ${painInput('finalOffer', 'Финальный офер', 'textarea', 'главный результат блока')}
      </div>
    </section>
    <div class="demand-steps pain-steps">
      ${PAIN_OFFER_SECTIONS.map(item => painOfferSectionHtml(route, item, openSection === item.key)).join('')}
    </div>
    <section class="demand-checks ${issues.length ? '' : 'is-ok'}">
      <h4>Автоматические проверки</h4>
      ${issues.length ? issues.map(issue => `<div class="demand-check ${issue.level}">${escapeHtml(issue.text)}</div>`).join('') : '<div class="demand-check ready">Критичных ошибок нет. Проверьте связку: спрос → боль → JTBD → офер → CTA.</div>'}
    </section>
  </div>`;
}

function painOfferSectionHtml(route, section, isOpen) {
  const data = route.sections?.[section.key] || {};
  const status = painSectionStatus(section);
  return `<article class="demand-step pain-step ${isOpen ? 'is-open' : ''}">
    <button class="demand-step-head" data-pain-toggle-section="${escapeAttr(section.key)}">
      <span><strong>${escapeHtml(section.title)}</strong><small>${escapeHtml(section.orient)}</small></span>
      <span class="status-pill status-${status}">${STATUS_LABELS[status] || status}</span>
    </button>
    ${isOpen ? `<div class="pain-step-body">
      <div class="pain-standard"><strong>Стандарт готовности:</strong> ${escapeHtml(section.standard)}</div>
      <div class="demand-step-body">
        ${section.fields.map(([key, label]) => `<label class="demand-field"><span>${escapeHtml(label)}</span><textarea data-pain-section="${escapeAttr(section.key)}" data-pain-section-field="${escapeAttr(key)}" placeholder="результат">${escapeHtml(data[key] || '')}</textarea></label>`).join('')}
        <label class="demand-field"><span>Доказательство</span><textarea data-pain-section="${escapeAttr(section.key)}" data-pain-section-field="evidence" placeholder="ссылка, скрин, вывод или источник">${escapeHtml(data.evidence || '')}</textarea></label>
      </div>
    </div>` : ''}
  </article>`;
}

function bindPainOfferRouteEvents() {
  document.querySelectorAll('[data-pain-field]').forEach(input => {
    input.addEventListener('input', e => {
      const route = ensurePainOfferState();
      route[e.target.dataset.painField] = e.target.value;
      saveState();
    });
    input.addEventListener('change', e => {
      const route = ensurePainOfferState();
      route[e.target.dataset.painField] = e.target.value;
      saveState();
      renderGate();
    });
  });
  document.querySelectorAll('[data-pain-toggle-section]').forEach(btn => btn.addEventListener('click', () => {
    const route = ensurePainOfferState();
    route.openSection = route.openSection === btn.dataset.painToggleSection ? '' : btn.dataset.painToggleSection;
    saveState();
    renderGate();
  }));
  document.querySelectorAll('[data-pain-section]').forEach(input => {
    input.addEventListener('input', e => {
      const route = ensurePainOfferState();
      const section = e.target.dataset.painSection;
      const field = e.target.dataset.painSectionField;
      route.sections[section] = route.sections[section] || {};
      route.sections[section][field] = e.target.value;
      saveState();
    });
    input.addEventListener('change', e => {
      const route = ensurePainOfferState();
      const section = e.target.dataset.painSection;
      const field = e.target.dataset.painSectionField;
      route.sections[section] = route.sections[section] || {};
      route.sections[section][field] = e.target.value;
      saveState();
      renderGate();
    });
  });
}

function renderDemandRoute(section) {
  const route = ensureDemandRouteState();
  const status = getDemandRouteStatus();
  const issues = demandChecks();
  const openStep = route.openStep || firstIncompleteDemandStepKey(route);
  const groups = route.groups || [];
  return `<div class="demand-route">
    <div class="demand-route-head">
      <div>
        <div class="analytics-path">Gate 1 → Спрос</div>
        <h3>Спрос: подготовка кампании к запуску</h3>
        <p class="muted">Рамки → язык аудитории → намерения → группы → экономика → объявления → запуск.</p>
      </div>
      <span class="status-pill status-${status}">${escapeHtml(STATUS_LABELS[status] || status)}</span>
    </div>

    <section class="demand-frame">
      <div class="demand-grid three">
        ${demandInput('promoted', 'Что продвигаем', 'text', 'продукт / услуга')}
        ${demandInput('excluded', 'Что не продвигаем', 'text', 'мусор, вакансии, обучение, бесплатное')}
        ${demandInput('geo', 'Гео', 'text', 'город / регион / страна')}
        ${demandInput('language', 'Язык', 'text', 'если нужен для Google')}
        <label class="demand-field"><span>Рекламная система</span><select data-demand-field="adSystem">
          <option value="yandex" ${route.adSystem === 'yandex' ? 'selected' : ''}>Яндекс</option>
          <option value="google" ${route.adSystem === 'google' ? 'selected' : ''}>Google</option>
          <option value="both" ${route.adSystem === 'both' ? 'selected' : ''}>Яндекс + Google</option>
        </select></label>
        <label class="demand-field"><span>Цель</span><input data-demand-field="goal" value="${escapeAttr(route.goal || '')}" placeholder="заявка / звонок / покупка" /></label>
        ${route.adSystem === 'yandex' || route.adSystem === 'both' ? `<label class="demand-field"><span>Яндекс: тип кампании</span><select data-demand-field="yandexCampaignType">
          <option value="search" ${route.yandexCampaignType === 'search' ? 'selected' : ''}>Поиск</option>
          <option value="rsya" ${route.yandexCampaignType === 'rsya' ? 'selected' : ''}>РСЯ</option>
          <option value="search_rsya" ${route.yandexCampaignType === 'search_rsya' ? 'selected' : ''}>Поиск + РСЯ</option>
        </select></label>` : ''}
        ${route.adSystem === 'google' || route.adSystem === 'both' ? `<label class="demand-field"><span>Google: тип кампании</span><select data-demand-field="googleCampaignType">
          <option value="search" ${route.googleCampaignType === 'search' ? 'selected' : ''}>Search</option>
          <option value="display" ${route.googleCampaignType === 'display' ? 'selected' : ''}>Display</option>
          <option value="search_display" ${route.googleCampaignType === 'search_display' ? 'selected' : ''}>Search + Display</option>
        </select></label>` : ''}
        ${demandInput('landing', 'Посадочная', 'text', 'URL страницы')}
        ${demandInput('targetCpa', 'Целевой CPL / CPA', 'text', 'если известен')}
      </div>
    </section>

    <div class="demand-steps">
      ${DEMAND_ROUTE_STEPS.map(step => demandStepHtml(route, step, openStep === step.key)).join('')}
    </div>

    <section class="demand-launch-table">
      <div class="demand-section-title">
        <div><h4>Финальная таблица запуска</h4><p class="muted">Одна карта спроса даёт выход под Яндекс и Google без отдельных больших веток.</p></div>
        <button class="small-btn" data-add-demand-group>+ Добавить группу</button>
      </div>
      <div class="table-scroll"><table class="mini-table typed-table demand-table">
        <thead><tr><th>Группа / Campaign</th><th>Тип</th><th>Интент</th><th>Посадочная</th><th>Ключи / Keywords</th><th>Минусы / Negatives</th><th>Аудитория</th><th>Объявление</th><th>Дополнения / Assets</th><th>CPA прогноз</th><th>Статус</th><th></th></tr></thead>
        <tbody>${groups.map((group, index) => demandGroupRowHtml(group, index, route)).join('') || `<tr><td colspan="12" class="muted">Добавьте первую группу, чтобы собрать запускной пакет.</td></tr>`}</tbody>
      </table></div>
    </section>

    <section class="demand-checks ${issues.length ? '' : 'is-ok'}">
      <h4>Автоматические проверки</h4>
      ${issues.length ? issues.map(issue => `<div class="demand-check ${issue.level}">${escapeHtml(issue.text)}</div>`).join('') : '<div class="demand-check ready">Критичных ошибок нет. Проверьте финальный запускной пакет.</div>'}
    </section>
  </div>`;
}

function demandStepHtml(route, step, isOpen) {
  const data = route.steps?.[step.key] || {};
  const filled = step.fields.some(([key]) => String(data[key] || '').trim());
  return `<article class="demand-step ${isOpen ? 'is-open' : ''}">
    <button class="demand-step-head" data-demand-toggle-step="${escapeAttr(step.key)}">
      <span><strong>${escapeHtml(step.title)}</strong><small>${escapeHtml(step.task)}</small></span>
      <span class="status-pill status-${filled ? 'ready' : 'not_started'}">${filled ? 'Заполнено' : 'Не начато'}</span>
    </button>
    ${isOpen ? `<div class="demand-step-body">
      ${step.fields.map(([key, label]) => `<label class="demand-field"><span>${escapeHtml(label)}</span><textarea data-demand-step="${escapeAttr(step.key)}" data-demand-step-field="${escapeAttr(key)}" placeholder="результат шага">${escapeHtml(data[key] || '')}</textarea></label>`).join('')}
    </div>` : ''}
  </article>`;
}

function demandGroupRowHtml(group, index, route) {
  const selectedType = group.type || (demandSearchEnabled(route) && demandDisplayEnabled(route) ? 'universal' : demandSearchEnabled(route) ? 'search' : 'display');
  const showSearch = selectedType === 'search' || selectedType === 'universal';
  const showDisplay = selectedType === 'display' || selectedType === 'universal';
  const rowStatus = demandSingleGroupStatus(route, group);
  return `<tr>
    <td><input data-demand-group-index="${index}" data-demand-group-field="name" value="${escapeAttr(group.name || '')}" placeholder="название группы" /></td>
    <td><select data-demand-group-index="${index}" data-demand-group-field="type">
      <option value="search" ${selectedType === 'search' ? 'selected' : ''}>Поиск / Search</option>
      <option value="display" ${selectedType === 'display' ? 'selected' : ''}>РСЯ / Display</option>
      <option value="universal" ${selectedType === 'universal' ? 'selected' : ''}>Поиск + РСЯ / Search + Display</option>
    </select></td>
    <td><input data-demand-group-index="${index}" data-demand-group-field="intent" value="${escapeAttr(group.intent || '')}" placeholder="интент" /></td>
    <td><input data-demand-group-index="${index}" data-demand-group-field="landing" value="${escapeAttr(group.landing || route.landing || '')}" placeholder="URL" /></td>
    <td><textarea data-demand-group-index="${index}" data-demand-group-field="keywords" ${showSearch ? '' : 'disabled'} placeholder="ключи / keywords">${escapeHtml(group.keywords || '')}</textarea></td>
    <td><textarea data-demand-group-index="${index}" data-demand-group-field="negatives" placeholder="минусы / negatives">${escapeHtml(group.negatives || '')}</textarea></td>
    <td><textarea data-demand-group-index="${index}" data-demand-group-field="audience" ${showDisplay ? '' : 'disabled'} placeholder="аудитория РСЯ / Display">${escapeHtml(group.audience || '')}</textarea></td>
    <td><textarea data-demand-group-index="${index}" data-demand-group-field="ad" placeholder="объявление / RSA">${escapeHtml(group.ad || '')}</textarea></td>
    <td><textarea data-demand-group-index="${index}" data-demand-group-field="assets" placeholder="быстрые ссылки / callouts / assets">${escapeHtml(group.assets || '')}</textarea></td>
    <td><input data-demand-group-index="${index}" data-demand-group-field="forecastCpa" value="${escapeAttr(group.forecastCpa || '')}" placeholder="₽" /></td>
    <td><span class="status-pill status-${rowStatus}">${escapeHtml(STATUS_LABELS[rowStatus] || rowStatus)}</span></td>
    <td><button class="small-btn danger-mini" data-remove-demand-group="${index}">×</button></td>
  </tr>`;
}

function demandSingleGroupStatus(route, group) {
  if (!String(group.intent || '').trim() || !String(group.landing || route.landing || '').trim()) return 'problem';
  if (demandGroupHasSearchNeed(route, group) && !String(group.keywords || '').trim()) return 'problem';
  if (demandGroupHasDisplayNeed(route, group) && !String(group.audience || '').trim()) return 'problem';
  if (!String(group.negatives || '').trim()) return 'needs_review';
  if (!String(group.ad || '').trim()) return 'in_progress';
  return 'ready';
}

function bindDemandRouteEvents() {
  document.querySelectorAll('[data-demand-field]').forEach(input => input.addEventListener('input', e => {
    const route = ensureDemandRouteState();
    route[e.target.dataset.demandField] = e.target.value;
    saveState();
    renderGate();
  }));
  document.querySelectorAll('[data-demand-field]').forEach(input => input.addEventListener('change', e => {
    const route = ensureDemandRouteState();
    route[e.target.dataset.demandField] = e.target.value;
    saveState();
    renderGate();
  }));
  document.querySelectorAll('[data-demand-toggle-step]').forEach(btn => btn.addEventListener('click', () => {
    const route = ensureDemandRouteState();
    route.openStep = route.openStep === btn.dataset.demandToggleStep ? '' : btn.dataset.demandToggleStep;
    saveState();
    renderGate();
  }));
  document.querySelectorAll('[data-demand-step]').forEach(input => input.addEventListener('input', e => {
    const route = ensureDemandRouteState();
    route.steps[e.target.dataset.demandStep] = route.steps[e.target.dataset.demandStep] || {};
    route.steps[e.target.dataset.demandStep][e.target.dataset.demandStepField] = e.target.value;
    saveState();
  }));
  document.querySelector('[data-add-demand-group]')?.addEventListener('click', () => {
    const route = ensureDemandRouteState();
    route.groups.push({ id: makeId('demand-group'), name: '', type: demandSearchEnabled(route) && demandDisplayEnabled(route) ? 'universal' : demandSearchEnabled(route) ? 'search' : 'display', intent: '', landing: route.landing || '', keywords: '', negatives: '', audience: '', ad: '', assets: '', forecastCpa: '' });
    saveState();
    renderGate();
  });
  document.querySelectorAll('[data-demand-group-field]').forEach(input => input.addEventListener('input', updateDemandGroupField));
  document.querySelectorAll('[data-demand-group-field]').forEach(input => input.addEventListener('change', updateDemandGroupField));
  document.querySelectorAll('[data-remove-demand-group]').forEach(btn => btn.addEventListener('click', () => {
    const route = ensureDemandRouteState();
    route.groups.splice(Number(btn.dataset.removeDemandGroup), 1);
    saveState();
    renderGate();
  }));
}

function updateDemandGroupField(e) {
  const route = ensureDemandRouteState();
  const index = Number(e.target.dataset.demandGroupIndex);
  const field = e.target.dataset.demandGroupField;
  route.groups[index] = route.groups[index] || {};
  route.groups[index][field] = e.target.value;
  saveState();
  if (field === 'type') renderGate();
}

function renderGate1Accordion(gate, cards) {
  const sections = getGate1Sections(gate, cards);
  const accState = getGate1AccordionState();
  const queryActive = els.searchInput.value.trim() || els.statusFilter.value !== 'all';
  els.contentArea.innerHTML = `<div class="analytics-accordion">
    <div class="analytics-intro">
      <div class="analytics-path">Gate 1 → Аналитика</div>
      <h2>Gate 1, Аналитика</h2>
      <p class="muted">Сначала видны четыре смысловых уровня. Раскрытый уровень становится главным рабочим полем, вложенность читается через сетку, отступы и активные состояния.</p>
    </div>
    ${sections.map(section => {
      const sectionOpen = Boolean(accState.subblocks[section.key]);
      const status = section.key === 'demand_semantics' ? getDemandRouteStatus() : section.key === 'pain_jtbd_offer' ? getPainOfferStatus() : getSectionStatus(section.allInnerCards);
      const progressText = section.key === 'demand_semantics' ? getDemandProgressText() : section.key === 'pain_jtbd_offer' ? getPainOfferProgressText() : getSectionProgressText(section.allInnerCards);
      const displayCards = queryActive ? section.filteredInnerCards : section.allInnerCards;
      return `<section class="analytics-subblock ${sectionOpen ? 'is-open is-active' : ''}">
        <button class="subblock-header" data-gate1-toggle-section="${escapeAttr(section.key)}">
          <span class="subblock-main">
            <span class="analytics-path">Gate 1 → ${escapeHtml(section.title)}</span>
            <span class="subblock-title">${escapeHtml(section.title)}</span>
            <span class="subblock-progress">${escapeHtml(progressText)}</span>
          </span>
          <span class="status-pill status-${status}">${STATUS_LABELS[status] || status}</span>
          <span class="subblock-toggle">${sectionOpen ? 'Закрыть' : 'Открыть'}</span>
        </button>
        ${sectionOpen ? `<div class="subblock-body">
          ${section.key === 'demand_semantics' ? renderDemandRoute(section) : section.key === 'pain_jtbd_offer' ? renderPainOfferRoute(section) : (displayCards.length ? displayCards.map(card => gate1WorkBlockHtml(card, section.title)).join('') : '<div class="empty compact-empty">По текущему фильтру внутри подблока ничего не найдено.</div>')}
        </div>` : ''}
      </section>`;
    }).join('')}
  </div>`;
  bindGate1Accordion();
  bindDemandRouteEvents();
  bindPainOfferRouteEvents();
  bindCardInputs();
}

function gate1WorkBlockHtml(card, sectionTitle = 'Аналитика') {
  const accState = getGate1AccordionState();
  const isOpen = Boolean(accState.cards[card.id]);
  return `<article class="work-accordion-card ${isOpen ? 'is-open is-active' : ''}" data-card="${escapeAttr(card.id)}">
    <button class="work-card-header" data-gate1-toggle-card="${escapeAttr(card.id)}">
      <span class="work-card-main">
        <span class="analytics-path">Gate 1 → ${escapeHtml(sectionTitle)} → ${escapeHtml(card.title)}</span>
        <span class="work-card-title">${escapeHtml(card.title)}</span>
        <span class="work-card-preview">${escapeHtml(cardPreviewText(card))}</span>
      </span>
      <span class="status-pill status-${card.status}">${STATUS_LABELS[card.status] || card.status}</span>
      <span class="work-card-toggle">${isOpen ? 'Свернуть' : 'Раскрыть'}</span>
    </button>
    ${isOpen ? `<div class="work-card-body">
      ${instructionToggleHtml(card)}
      <div class="card-fields">
        <label class="field-row compact-status-row">Статус${statusSelect(card)}</label>
        ${cardUserFieldsHtml(card)}
      </div>
    </div>` : ''}
  </article>`;
}

function bindGate1Accordion() {
  document.querySelectorAll('[data-gate1-toggle-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.gate1ToggleSection;
      const accState = getGate1AccordionState();
      accState.subblocks[key] = !accState.subblocks[key];
      saveState();
      renderGate();
    });
  });
  document.querySelectorAll('[data-gate1-toggle-card]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cardId = btn.dataset.gate1ToggleCard;
      const accState = getGate1AccordionState();
      accState.cards[cardId] = !accState.cards[cardId];
      saveState();
      renderGate();
    });
  });
}

function renderGateCards(gate, cards) {
  if (isGate1Analytics(gate)) {
    renderGate1Accordion(gate, cards);
    return;
  }
  if (!cards.length) {
    els.contentArea.innerHTML = '<div class="empty">По текущему фильтру ничего не найдено.</div>';
    return;
  }
  els.contentArea.innerHTML = `<div class="cards-grid">${cards.map(cardHtml).join('')}</div>`;
  bindCardInputs();
}

function renderGateTable(gate, cards) {
  if (isGate1Analytics(gate)) {
    renderGate1Accordion(gate, cards);
    return;
  }
  els.contentArea.innerHTML = `
    <div class="table-scroll clean-table-wrap">
      <table class="data-table clean-data-table">
        <thead><tr><th>Блок</th><th>Статус</th><th>Структурированное доказательство / рабочие поля</th></tr></thead>
        <tbody>${cards.map(c => `
          <tr data-card-row="${c.id}">
            <td class="table-title">
              <div class="block-title-main">${escapeHtml(c.title)}</div>
              ${instructionToggleHtml(c)}
            </td>
            <td>${statusSelect(c)}</td>
            <td>${cardUserFieldsHtml(c)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  bindCardInputs();
}

function cardHtml(c) {
  return `
    <article class="card" data-card="${c.id}">
      <div class="card-head">
        <div>
          <div class="card-title">${escapeHtml(c.title)}</div>
          <div class="card-source">CSV строка ${c.sourceRow || ''}</div>
        </div>
        <span class="status-pill status-${c.status}">${STATUS_LABELS[c.status] || c.status}</span>
      </div>
      ${instructionToggleHtml(c)}
      <div class="card-fields">
        <label class="field-row compact-status-row">Статус${statusSelect(c)}</label>
        ${cardUserFieldsHtml(c)}
      </div>
    </article>`;
}


function instructionToggleHtml(card) {
  const text = String(card?.instruction || '').trim();
  if (!text) return '';
  return `<details class="instruction-toggle">
    <summary>Показать инструкцию</summary>
    <div class="instruction-text">${escapeHtml(text)}</div>
  </details>`;
}

function cardUserFieldsHtml(c) {
  if (isProjectPassportCard(c)) return `<div class="field-row"><span>Паспорт проекта</span>${projectPassportFieldsHtml()}</div>`;
  if (isCurrentResultsCard(c)) return `<div class="field-row"><span>Показатели</span>${currentResultsHtml(c)}</div>`;
  if (isToolStatusCard(c)) return `<div class="field-row"><span>Статусы элементов</span>${toolItemsHtml(c)}</div>`;
  if (isStartupSummaryCard(c)) return `<div class="field-row"><span>Автоматическая сводка</span>${startupSummaryHtml()}</div>`;
  if (getGate1CardMode(c)) return gate1TypedFieldsHtml(c);
  const evidence = evidenceStructuredHtml(c);
  const workspace = instructionWorkspaceHtml(c);
  if (evidence && workspace) return `<div class="field-row simplified-fields">${evidence}<details class="optional-workspace"><summary>Поля по инструкции</summary>${workspace}</details></div>`;
  if (evidence) return `<div class="field-row simplified-fields">${evidence}</div>`;
  if (workspace) return `<div class="field-row simplified-fields">${workspace}</div>`;
  return '';

}




function extractInstructionSection(text = '', title = '') {
  const re = new RegExp(title + '\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(Инструменты|Отвечает за|Совет|Инструкция|Что должно быть на выходе|Время|Идеал|Суть)\\s*:|$)', 'i');
  const match = String(text || '').match(re);
  return match ? match[1].trim() : '';
}

function splitInstructionActions(text = '') {
  const source = String(text || '').replace(/\r/g, '');
  const lines = source.split('\n').map(line => line.trim()).filter(Boolean);
  const numbered = lines
    .filter(line => /^\d+[.)]\s+/.test(line))
    .map(line => line.replace(/^\d+[.)]\s+/, '').trim());
  if (numbered.length) return numbered;
  return lines
    .filter(line => /→|провер|зафикс|подключ|собрать|заполн|указать|выбрать|создать|подготов|перенест|сверить|настроить|открыть/i.test(line))
    .slice(0, 8);
}

function extractToolsFromInstruction(text = '') {
  const full = String(text || '');
  const section = extractInstructionSection(full, 'Инструменты') || '';
  const source = section || full;
  const variants = [
    ['Яндекс Вебмастер', /яндекс\s+вебмастер|webmaster/i],
    ['Google Search Console', /google\s+search\s+console|search\s+console|gsc/i],
    ['Яндекс Директ', /яндекс\s+директ|директ/i],
    ['Google Ads', /google\s+ads|гугл\s+ads/i],
    ['Яндекс Метрика', /яндекс\s+метрик|метрик[аи]/i],
    ['Google Analytics', /google\s+analytics|ga4/i],
    ['Яндекс Wordstat', /wordstat|вордстат/i],
    ['PageSpeed Insights', /pagespeed|page\s*speed|cwv/i],
    ['CRM', /\bcrm\b|црм/i],
    ['Формы', /форм[ыа]/i],
    ['Коллтрекинг', /коллтрекинг|calltracking/i],
    ['UTM', /\butm\b/i]
  ];
  const found = [];
  variants.forEach(([name, re]) => { if (re.test(source) && !found.includes(name)) found.push(name); });
  return found;
}

function inferStatusKindFromText(text = '') {
  const value = normalizeGateTitle(text);
  if (/индекс/.test(value)) return 'indexed';
  if (/размещ|публикац|баннер|объявлен/.test(value)) return 'placed';
  if (/заполн|подключ|настро|utm|crm|форм/.test(value)) return 'filled';
  return 'works';
}

function createInstructionRow(card, partial = {}) {
  const label = partial.element || partial.tool || card?.title || 'Рабочий элемент';
  const service = partial.serviceUrl ? { url: partial.serviceUrl, label: partial.serviceLabel || partial.tool || 'Сервис' } : serviceLinkByName(label);
  return {
    id: partial.id || makeId('instr'),
    element: label,
    tool: partial.tool || '',
    serviceUrl: service?.url || '',
    serviceLabel: service?.label || partial.tool || '',
    link: partial.link || '',
    statusKind: partial.statusKind || inferStatusKindFromText(label + ' ' + (card?.title || '')),
    status: partial.status || '',
    result: partial.result || '',
    comment: partial.comment || ''
  };
}

function inferInstructionRows(card) {
  const instruction = card?.instruction || '';
  const rows = [];
  const tools = extractToolsFromInstruction(instruction);
  tools.forEach(tool => rows.push(createInstructionRow(card, { element: tool, tool })));

  const instructionPart = extractInstructionSection(instruction, 'Инструкция') || instruction;
  splitInstructionActions(instructionPart).forEach(action => {
    const toolMatch = action.split('→')[0]?.trim();
    const tool = serviceLinkByName(toolMatch) ? toolMatch : '';
    const element = truncateText(action, 120);
    rows.push(createInstructionRow(card, { element, tool, statusKind: inferStatusKindFromText(action) }));
  });

  const output = extractInstructionSection(instruction, 'Что должно быть на выходе');
  if (output) rows.push(createInstructionRow(card, { element: 'Итоговый результат блока', result: '', comment: truncateText(output, 120), statusKind: 'filled' }));

  if (!rows.length) rows.push(createInstructionRow(card, { element: card?.title || 'Рабочий результат', statusKind: 'filled' }));

  const unique = [];
  const seen = new Set();
  rows.forEach(row => {
    const key = normalizeAspectKey([row.element, row.tool].filter(Boolean).join(' '));
    if (seen.has(key)) return;
    seen.add(key);
    row.key = key;
    unique.push(row);
  });
  return unique.slice(0, 12);
}

function isSystemSpecialCard(card) {
  return isProjectPassportCard(card) || isCurrentResultsCard(card) || isToolStatusCard(card) || isStartupSummaryCard(card) || Boolean(getGate1CardMode(card));
}

function ensureInstructionWorkspace(card) {
  if (!card || isSystemSpecialCard(card)) return [];
  const inferred = inferInstructionRows(card);
  const existing = Array.isArray(card.instructionRows) ? new Map(card.instructionRows.map(row => [row.key || row.id || normalizeAspectKey(row.element), row])) : new Map();
  card.instructionRows = inferred.map(row => {
    const prev = existing.get(row.key) || {};
    return {
      ...row,
      id: prev.id || row.id,
      link: prev.link || row.link || '',
      status: prev.status || row.status || '',
      result: prev.result || row.result || '',
      comment: prev.comment || row.comment || ''
    };
  });
  return card.instructionRows;
}

function instructionWorkspacePlain(card) {
  const rows = ensureInstructionWorkspace(card);
  if (!rows.length) return '';
  return rows.map(row => [
    row.element,
    row.tool ? `инструмент: ${row.tool}` : '',
    row.serviceUrl ? `сервис: ${row.serviceUrl}` : '',
    row.link ? `ссылка: ${row.link}` : '',
    row.status ? `статус: ${instructionStatusLabel(row.status)}` : '',
    row.result ? `результат: ${row.result}` : '',
    row.comment ? `комментарий: ${row.comment}` : ''
  ].filter(Boolean).join(' | ')).join('\n');
}

function instructionWorkspaceHtml(card) {
  const rows = ensureInstructionWorkspace(card);
  if (!rows.length) return '';
  return `<div class="instruction-workspace">
    <div class="workspace-unit-title">Рабочие элементы из инструкции</div>
    <table class="mini-table typed-table instruction-table">
      <thead><tr><th>Элемент</th><th>Сервис</th><th>Ссылка / отчёт</th><th>Статус</th><th>Результат</th><th>Комментарий</th></tr></thead>
      <tbody>${rows.map((row, index) => `<tr>
        <td>${escapeHtml(row.element || '')}${row.tool ? `<small>${escapeHtml(row.tool)}</small>` : ''}</td>
        <td>${row.serviceUrl ? `<a href="${escapeAttr(row.serviceUrl)}" target="_blank" rel="noopener">${escapeHtml(row.serviceLabel || 'Открыть')}</a>` : '<span class="muted">Не требуется</span>'}</td>
        <td><input data-instruction-row-card-id="${escapeAttr(card.id)}" data-instruction-row-index="${index}" data-instruction-row-field="link" value="${escapeAttr(row.link || '')}" placeholder="ссылка, если нужна" /></td>
        <td><select data-instruction-row-card-id="${escapeAttr(card.id)}" data-instruction-row-index="${index}" data-instruction-row-field="status">${instructionStatusOptionsHtml(row.status)}</select></td>
        <td><input data-instruction-row-card-id="${escapeAttr(card.id)}" data-instruction-row-index="${index}" data-instruction-row-field="result" value="${escapeAttr(row.result || '')}" placeholder="результат проверки" /></td>
        <td><input data-instruction-row-card-id="${escapeAttr(card.id)}" data-instruction-row-index="${index}" data-instruction-row-field="comment" value="${escapeAttr(row.comment || '')}" placeholder="краткое уточнение" /></td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;
}

function updateInstructionRow(e) {
  const card = findCard(e.target.dataset.instructionRowCardId);
  if (!card) return;
  const index = Number(e.target.dataset.instructionRowIndex);
  const field = e.target.dataset.instructionRowField;
  const rows = ensureInstructionWorkspace(card);
  if (!rows[index]) return;
  rows[index][field] = e.target.value;
  if (field === 'link') addOrUpdateProjectLink(e.target.value, { comment: rows[index].comment, status: instructionStatusLabel(rows[index].status), source: rows[index].tool });
  recalculateStatusForCard(card);
  flashSaving();
  if (field === 'status') renderGate();
}

function relevantToolsForCard(card) {
  const mode = getGate1CardMode(card);
  const title = normalizeGateTitle(card?.title || '');
  const groups = new Set();
  if (mode === 'page_structure') groups.add('SEO и индексация');
  if (mode === 'comparison') {
    if (/cwv|pagespeed|скорость/.test(title)) groups.add('SEO и индексация');
    if (/частотность|прогноз|клики|стоимости|переходы/.test(title)) groups.add('Реклама');
  }
  if (mode === 'links') {
    const type = getGate1LinkStatusType(card);
    if (type === 'indexed' || /robots|sitemap|редирект|ssl|404/.test(title)) groups.add('SEO и индексация');
    else if (type === 'placed') groups.add('Реклама');
    else if (type === 'filled') {
      groups.add('Аналитика');
      groups.add('CRM и лиды');
    } else groups.add('SEO и индексация');
  }
  return (state.tools || []).filter(tool => tool.enabled && groups.has(tool.group));
}

function ensureToolWorkspace(card) {
  card.toolWorkspace = card.toolWorkspace || {};
  relevantToolsForCard(card).forEach(tool => {
    card.toolWorkspace[tool.key] = card.toolWorkspace[tool.key] || { status: '', value: '', comment: '' };
  });
  return card.toolWorkspace;
}

function toolWorkspaceHtml(card) {
  const tools = relevantToolsForCard(card);
  if (!tools.length) return '';
  const workspace = ensureToolWorkspace(card);
  return `<div class="tool-workspace">
    <div class="tool-workspace-title">Рабочее пространство включённых инструментов</div>
    <table class="mini-table typed-table tool-workspace-table">
      <thead><tr><th>Инструмент</th><th>Сервис</th><th>Статус</th><th>Ссылка / данные / результат</th><th>Комментарий</th></tr></thead>
      <tbody>${tools.map(tool => {
        const row = workspace[tool.key] || {};
        const service = serviceLinkByToolKey(tool.key);
        return `<tr>
          <td>${escapeHtml(tool.name)}</td>
          <td>${service ? `<a href="${escapeAttr(service.url)}" target="_blank" rel="noopener">${escapeHtml(service.label)}</a>` : '<span class="muted">Внутренний источник</span>'}</td>
          <td><select data-tool-workspace-card-id="${escapeAttr(card.id)}" data-tool-workspace-key="${escapeAttr(tool.key)}" data-tool-workspace-field="status">${instructionStatusOptionsHtml(row.status || '')}</select></td>
          <td><input data-tool-workspace-card-id="${escapeAttr(card.id)}" data-tool-workspace-key="${escapeAttr(tool.key)}" data-tool-workspace-field="value" value="${escapeAttr(row.value || '')}" placeholder="ссылка на отчёт, данные или результат проверки" /></td>
          <td><input data-tool-workspace-card-id="${escapeAttr(card.id)}" data-tool-workspace-key="${escapeAttr(tool.key)}" data-tool-workspace-field="comment" value="${escapeAttr(row.comment || '')}" placeholder="краткое уточнение" /></td>
        </tr>`;
      }).join('')}</tbody>
    </table>
  </div>`;
}

function toolWorkspaceIsComplete(card) {
  const tools = relevantToolsForCard(card);
  if (!tools.length) return true;
  const workspace = ensureToolWorkspace(card);
  return tools.every(tool => {
    const row = workspace[tool.key] || {};
    return Boolean(row.status && String(row.value || '').trim());
  });
}

function toolWorkspaceTouched(card) {
  const tools = relevantToolsForCard(card);
  const workspace = ensureToolWorkspace(card);
  return tools.some(tool => {
    const row = workspace[tool.key] || {};
    return Boolean(row.status || String(row.value || '').trim() || String(row.comment || '').trim());
  });
}

function gate1TypedFieldsHtml(card) {
  const mode = getGate1CardMode(card);
  ensureGate1TypedData(card);
  if (mode === 'links') return `<div class="field-row"><span>Ссылки и статусы</span>${gate1LinkRowsHtml(card)}</div>`;
  if (mode === 'comparison') return `<div class="field-row"><span>Сравнительные показатели</span>${gate1ComparisonRowsHtml(card)}</div>`;
  if (mode === 'page_structure') return `<div class="field-row"><span>Структура страниц</span>${gate1PageStructureHtml(card)}</div>`;
  return '';
}

function linkStatusOptionsHtml(type, value) {
  const options = GATE1_LINK_STATUS_OPTIONS[type] || GATE1_LINK_STATUS_OPTIONS.works;
  return `<option value="" ${!value ? 'selected' : ''}>Выбрать</option>${options.map(option => `<option value="${escapeAttr(option)}" ${value === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}`;
}

function gate1LinkRowsHtml(card) {
  const type = getGate1LinkStatusType(card) || 'works';
  const rows = card.linkRows || [];
  const toolRequired = enabledTools().length > 0;
  return `<div class="typed-block link-rows-block">
    ${projectUrlDatalistHtml()}
    ${inlineToolControlsHtml()}
    ${toolWorkspaceHtml(card)}
    <table class="mini-table typed-table link-bank-table">
      <thead><tr><th>Ссылка</th><th>Источник</th><th>Статус</th><th>Комментарий</th><th></th></tr></thead>
      <tbody>${rows.map((row, index) => `<tr>
        <td><input list="projectUrlOptions" data-gate1-link-card-id="${escapeAttr(card.id)}" data-gate1-link-index="${index}" data-gate1-link-field="url" value="${escapeAttr(row.url || '')}" placeholder="https://" /></td>
        <td><select data-gate1-link-card-id="${escapeAttr(card.id)}" data-gate1-link-index="${index}" data-gate1-link-field="source">${toolOptionsHtml(row.source || '', true)}</select>${toolRequired && !row.source ? '<div class="field-hint warning">Выберите источник</div>' : ''}</td>
        <td><select data-gate1-link-card-id="${escapeAttr(card.id)}" data-gate1-link-index="${index}" data-gate1-link-field="status">${linkStatusOptionsHtml(type, row.status)}</select></td>
        <td><input data-gate1-link-card-id="${escapeAttr(card.id)}" data-gate1-link-index="${index}" data-gate1-link-field="comment" value="${escapeAttr(row.comment || '')}" placeholder="краткое уточнение" /></td>
        <td><button class="small-btn danger-mini" data-remove-gate1-link="${escapeAttr(card.id)}" data-index="${index}" ${rows.length <= 1 ? 'disabled' : ''}>×</button></td>
      </tr>`).join('')}</tbody>
    </table>
    <div class="typed-actions">
      <button class="small-btn add-inline-btn" data-add-gate1-link="${escapeAttr(card.id)}">+ Добавить ссылку</button>
    </div>
  </div>`;
}


function inlineToolControlsHtml() {
  state.tools = normalizeProjectTools(state.tools);
  const groups = {};
  state.tools.forEach(tool => {
    groups[tool.group] = groups[tool.group] || [];
    groups[tool.group].push(tool);
  });
  return `<div class="inline-tools">
    <div class="inline-tools-title">Включённые источники внутри блока</div>
    <div class="inline-tools-grid">
      ${Object.entries(groups).map(([group, tools]) => `<div class="inline-tool-group"><span>${escapeHtml(group)}</span>${tools.map(tool => `<label class="inline-tool-toggle"><input type="checkbox" data-inline-tool="${escapeAttr(tool.key)}" ${tool.enabled ? 'checked' : ''} /> ${escapeHtml(tool.name)}</label>`).join('')}</div>`).join('')}
    </div>
  </div>`;
}

function updateInlineTool(e) {
  const key = e.target.dataset.inlineTool;
  state.tools = normalizeProjectTools(state.tools);
  const tool = state.tools.find(item => item.key === key);
  if (!tool) return;
  tool.enabled = e.target.checked;
  recalculateAllStatuses(state);
  flashSaving();
  renderGate();
}

function updateToolWorkspaceRow(e) {
  const card = findCard(e.target.dataset.toolWorkspaceCardId);
  if (!card) return;
  const key = e.target.dataset.toolWorkspaceKey;
  const field = e.target.dataset.toolWorkspaceField;
  card.toolWorkspace = card.toolWorkspace || {};
  card.toolWorkspace[key] = card.toolWorkspace[key] || { status: '', value: '', comment: '' };
  card.toolWorkspace[key][field] = e.target.value;
  recalculateStatusForCard(card);
  flashSaving();
}

function gate1ComparisonRowsHtml(card) {
  const rows = card.comparisonRows || [];
  return `<div class="typed-block comparison-block">
    ${inlineToolControlsHtml()}
    ${toolWorkspaceHtml(card)}
    <table class="mini-table typed-table">
      <thead><tr><th>Показатель</th><th>Значение</th><th>Норма</th><th>Результат</th><th>Комментарий</th></tr></thead>
      <tbody>${rows.map((row, index) => {
        const result = evaluateComparisonRow(row);
        const resultClass = result.ok === true ? 'ok' : result.ok === false ? 'bad' : 'neutral';
        return `<tr>
          <td>${escapeHtml(row.label)}</td>
          <td><input type="number" step="any" data-gate1-comparison-card-id="${escapeAttr(card.id)}" data-gate1-comparison-index="${index}" data-gate1-comparison-field="value" value="${escapeAttr(row.value || '')}" placeholder="значение" /></td>
          <td>${escapeHtml(row.norm)}</td>
          <td><span class="result-pill result-${resultClass}">${escapeHtml(result.label)}</span></td>
          <td><input data-gate1-comparison-card-id="${escapeAttr(card.id)}" data-gate1-comparison-index="${index}" data-gate1-comparison-field="comment" value="${escapeAttr(row.comment || '')}" placeholder="что улучшить" /></td>
        </tr>`;
      }).join('')}</tbody>
    </table>
  </div>`;
}

function pageFieldStatusHtml(value, min, max) {
  const result = evaluateLength(value, min, max);
  const cls = result.ok ? 'ok' : 'bad';
  return `<span class="result-pill result-${cls}">${escapeHtml(result.label)}</span>`;
}

function gate1PageStructureHtml(card) {
  const rows = card.pageRows || [];
  const repeatable = isRepeatablePageCard(card);
  return `<div class="typed-block pages-block">
    ${inlineToolControlsHtml()}
    ${toolWorkspaceHtml(card)}
    ${rows.map((row, pageIndex) => pageStructureCardHtml(card, row, pageIndex, repeatable)).join('')}
    ${repeatable ? `<button class="small-btn add-inline-btn" data-add-gate1-page="${escapeAttr(card.id)}">+ Добавить страницу</button>` : ''}
  </div>`;
}

function pageStructureCardHtml(card, row, pageIndex, repeatable) {
  const snippet = snippetForPage(row);
  return `<section class="page-structure-card">
    <div class="page-structure-head">
      <input class="page-name-input" data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="name" value="${escapeAttr(row.name || '')}" placeholder="Название страницы" ${row.fixed ? 'readonly' : ''} />
      <span class="status-pill status-${pageStructureStatus(row)}">${STATUS_LABELS[pageStructureStatus(row)]}</span>
      ${repeatable ? `<button class="small-btn danger-mini" data-remove-gate1-page="${escapeAttr(card.id)}" data-index="${pageIndex}" ${rowsSafeLength(card.pageRows) <= 1 ? 'disabled' : ''}>×</button>` : ''}
    </div>
    <div class="page-grid">
      <label>Ссылка<input list="projectUrlOptions" data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="url" value="${escapeAttr(row.url || '')}" placeholder="https://" />${projectUrlDatalistHtml()}</label>
      <label>Источник<select data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="source">${toolOptionsHtml(row.source || '', true)}</select></label>
      <label>Статус URL<select data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="urlStatus">${linkStatusOptionsHtml('works', row.urlStatus)}</select>${seoIndicatorHtml(row.url)}</label>
      <label>H1 <small>20–70 знаков</small><input data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="h1" value="${escapeAttr(row.h1 || '')}" />${pageFieldStatusHtml(row.h1, 20, 70)}</label>
      <label>Title <small>30–70 знаков</small><input data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="title" value="${escapeAttr(row.title || '')}" />${pageFieldStatusHtml(row.title, 30, 70)}</label>
      <label class="full">Description <small>70–180 знаков</small><textarea data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="description" rows="2">${escapeHtml(row.description || '')}</textarea>${pageFieldStatusHtml(row.description, 70, 180)}</label>
      <label class="full">Основной текст <small>минимум 300 знаков</small><textarea data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="body" rows="4">${escapeHtml(row.body || '')}</textarea>${pageFieldStatusHtml(row.body, 300, 0)}</label>
      <label class="full">Оффер страницы<textarea data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="offer" rows="2">${escapeHtml(row.offer || '')}</textarea></label>
    </div>
    <div class="embedded-block">
      <h4>Блок А: Сниппет</h4>
      <div class="snippet-preview">${snippet ? escapeHtml(snippet) : 'Сниппет появится после заполнения H1, Title, Description, смысла и оффера страницы.'}</div>
    </div>
    <div class="embedded-block">
      <h4>Блок Б: Финальный CTA</h4>
      <label class="inline-radio"><select data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="ctaMode">
        <option value="needed" ${row.ctaMode !== 'not_needed' ? 'selected' : ''}>Финальный CTA нужен</option>
        <option value="not_needed" ${row.ctaMode === 'not_needed' ? 'selected' : ''}>Финальный CTA не нужен</option>
      </select></label>
      ${row.ctaMode === 'not_needed' ? '' : `<textarea data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="finalCta" rows="2" placeholder="Текст финального CTA">${escapeHtml(row.finalCta || '')}</textarea>`}
    </div>
    <label class="full page-comment">Комментарий<input data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="comment" value="${escapeAttr(row.comment || '')}" placeholder="короткое уточнение" /></label>
  </section>`;
}

function rowsSafeLength(rows) { return Array.isArray(rows) ? rows.length : 0; }

function currentResultsHtml(card) {
  const rows = ensureCurrentResults(card);
  return `<div class="current-results">
    <table class="mini-table current-results-table">
      <thead><tr><th>Показатель</th><th>Значение</th><th>Период</th><th>Комментарий</th></tr></thead>
      <tbody>${rows.map((row, index) => `<tr>
        <td>${escapeHtml(row.label)}</td>
        <td><input ${row.type === 'number' ? 'type="number"' : ''} data-current-result-card-id="${escapeAttr(card.id)}" data-current-result-index="${index}" data-current-result-field="value" value="${escapeAttr(row.value || '')}" placeholder="${row.type === 'number' ? 'число' : 'текст'}" /></td>
        <td><input data-current-result-card-id="${escapeAttr(card.id)}" data-current-result-index="${index}" data-current-result-field="period" value="${escapeAttr(row.period || '')}" placeholder="например: 1–31 мая" /></td>
        <td><input data-current-result-card-id="${escapeAttr(card.id)}" data-current-result-index="${index}" data-current-result-field="comment" value="${escapeAttr(row.comment || '')}" placeholder="короткий комментарий" /></td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;
}

function statusSelect(c) {
  return `<select data-field="status" data-card-id="${c.id}" disabled title="Статус рассчитывается автоматически">
    ${Object.entries(STATUS_LABELS).map(([key, label]) => `<option value="${key}" ${c.status === key ? 'selected' : ''}>${label}</option>`).join('')}
  </select>`;
}

function bindCardInputs() {
  document.querySelectorAll('[data-card-id][data-field]').forEach(input => {
    input.addEventListener('input', updateCardFromInput);
    input.addEventListener('change', updateCardFromInput);
  });
  document.querySelectorAll('[data-evidence-key]').forEach(input => {
    input.addEventListener('input', updateEvidenceFromInput);
    input.addEventListener('change', updateEvidenceFromInput);
  });
  document.querySelectorAll('[data-project-inline]').forEach(input => {
    input.addEventListener('input', updateProjectFromInline);
    input.addEventListener('change', updateProjectFromInline);
  });
  document.querySelectorAll('[data-tool-card-id]').forEach(input => {
    input.addEventListener('input', updateToolItemFromInput);
    input.addEventListener('change', updateToolItemFromInput);
  });
  document.querySelectorAll('[data-current-result-card-id]').forEach(input => {
    input.addEventListener('input', updateCurrentResultFromInput);
    input.addEventListener('change', updateCurrentResultFromInput);
  });
  document.querySelectorAll('[data-instruction-row-card-id]').forEach(input => {
    input.addEventListener('input', updateInstructionRow);
    input.addEventListener('change', updateInstructionRow);
  });
  bindGate1TypedInputs();
}

function bindGate1TypedInputs() {
  document.querySelectorAll('[data-gate1-link-card-id]').forEach(input => {
    input.addEventListener('input', updateGate1LinkRow);
    input.addEventListener('change', updateGate1LinkRow);
  });
  document.querySelectorAll('[data-add-gate1-link]').forEach(btn => btn.addEventListener('click', () => addGate1LinkRow(btn.dataset.addGate1Link)));
  document.querySelectorAll('[data-remove-gate1-link]').forEach(btn => btn.addEventListener('click', () => removeGate1LinkRow(btn.dataset.removeGate1Link, Number(btn.dataset.index))));
  document.querySelectorAll('[data-inline-tool]').forEach(input => input.addEventListener('change', updateInlineTool));
  document.querySelectorAll('[data-tool-workspace-card-id]').forEach(input => {
    input.addEventListener('input', updateToolWorkspaceRow);
    input.addEventListener('change', updateToolWorkspaceRow);
  });
  document.querySelectorAll('[data-gate1-comparison-card-id]').forEach(input => {
    input.addEventListener('input', updateGate1ComparisonRow);
    input.addEventListener('change', updateGate1ComparisonRow);
  });
  document.querySelectorAll('[data-gate1-page-card-id]').forEach(input => {
    input.addEventListener('input', updateGate1PageRow);
    input.addEventListener('change', updateGate1PageRow);
  });
  document.querySelectorAll('[data-add-gate1-page]').forEach(btn => btn.addEventListener('click', () => addGate1PageRow(btn.dataset.addGate1Page)));
  document.querySelectorAll('[data-remove-gate1-page]').forEach(btn => btn.addEventListener('click', () => removeGate1PageRow(btn.dataset.removeGate1Page, Number(btn.dataset.index))));
}

function findCard(cardId) {
  for (const gate of state.gates) {
    const card = gate.cards.find(c => c.id === cardId);
    if (card) return card;
  }
  return null;
}

function updateCardFromInput(e) {
  const card = findCard(e.target.dataset.cardId);
  if (!card) return;
  const field = e.target.dataset.field;
  card[field] = e.target.value;
  recalculateStatusForCard(card);
  flashSaving();
  if (field === 'status') render();
}

function updateEvidenceFromInput(e) {
  const key = e.target.dataset.evidenceKey;
  if (!key) return;
  setEvidenceValue(key, e.target.value);
  syncProjectBeforeFromPositioning(state);
  document.querySelectorAll(`[data-evidence-key="${CSS.escape(key)}"]`).forEach(input => {
    if (input !== e.target) input.value = e.target.value;
  });
  recalculateAllStatuses(state);
  flashSaving();
}

function updateProjectFromInline(e) {
  const key = e.target.dataset.projectInline;
  if (!key) return;
  state.project[key] = e.target.value;
  syncProjectPassportCard(state);
  recalculateAllStatuses(state);
  flashSaving();
}

function updateToolItemFromInput(e) {
  const card = findCard(e.target.dataset.toolCardId);
  if (!card) return;
  const index = Number(e.target.dataset.toolIndex);
  const field = e.target.dataset.toolField;
  ensureToolItems(card);
  if (!card.toolItems[index]) return;
  card.toolItems[index][field] = e.target.value;
  recalculateStatusForCard(card);
  const summaryCard = allCardsFromWorkspace(state).find(isStartupSummaryCard);
  if (summaryCard) recalculateStatusForCard(summaryCard);
  flashSaving();
  render();
}

function updateCurrentResultFromInput(e) {
  const card = findCard(e.target.dataset.currentResultCardId);
  if (!card) return;
  const index = Number(e.target.dataset.currentResultIndex);
  const field = e.target.dataset.currentResultField;
  ensureCurrentResults(card);
  if (!card.currentResults[index]) return;
  card.currentResults[index][field] = e.target.value;
  recalculateStatusForCard(card);
  flashSaving();
}


function updateGate1LinkRow(e) {
  const card = findCard(e.target.dataset.gate1LinkCardId);
  if (!card) return;
  ensureGate1TypedData(card);
  const index = Number(e.target.dataset.gate1LinkIndex);
  const field = e.target.dataset.gate1LinkField;
  if (!card.linkRows[index]) return;
  card.linkRows[index][field] = e.target.value;
  addOrUpdateProjectLink(card.linkRows[index].url, { status: card.linkRows[index].status, comment: card.linkRows[index].comment, source: card.linkRows[index].source });
  recalculateStatusForCard(card);
  flashSaving();
  if (['url','status','source'].includes(field)) renderGate();
}

function addGate1LinkRow(cardId) {
  const card = findCard(cardId);
  if (!card) return;
  ensureGate1TypedData(card);
  card.linkRows.push({ url: '', status: '', source: '', comment: '' });
  flashSaving();
  renderGate();
}

function removeGate1LinkRow(cardId, index) {
  const card = findCard(cardId);
  if (!card) return;
  ensureGate1TypedData(card);
  if (card.linkRows.length <= 1) return;
  card.linkRows.splice(index, 1);
  recalculateStatusForCard(card);
  flashSaving();
  renderGate();
}

function updateGate1ComparisonRow(e) {
  const card = findCard(e.target.dataset.gate1ComparisonCardId);
  if (!card) return;
  ensureGate1TypedData(card);
  const index = Number(e.target.dataset.gate1ComparisonIndex);
  const field = e.target.dataset.gate1ComparisonField;
  if (!card.comparisonRows[index]) return;
  card.comparisonRows[index][field] = e.target.value;
  recalculateStatusForCard(card);
  flashSaving();
  renderGate();
}

function updateGate1PageRow(e) {
  const card = findCard(e.target.dataset.gate1PageCardId);
  if (!card) return;
  ensureGate1TypedData(card);
  const index = Number(e.target.dataset.gate1PageIndex);
  const field = e.target.dataset.gate1PageField;
  if (!card.pageRows[index]) return;
  card.pageRows[index][field] = e.target.value;
  addOrUpdateProjectLink(card.pageRows[index].url, { status: card.pageRows[index].urlStatus, comment: card.pageRows[index].comment, source: card.pageRows[index].source });
  recalculateStatusForCard(card);
  flashSaving();
  if (['url','urlStatus','source','h1','title','description','body','offer','ctaMode','finalCta'].includes(field)) renderGate();
}

function addGate1PageRow(cardId) {
  const card = findCard(cardId);
  if (!card) return;
  ensureGate1TypedData(card);
  card.pageRows.push(createPageStructureRow(defaultPageNameForCard(card), false));
  flashSaving();
  renderGate();
}

function removeGate1PageRow(cardId, index) {
  const card = findCard(cardId);
  if (!card) return;
  ensureGate1TypedData(card);
  if (!Array.isArray(card.pageRows) || card.pageRows.length <= 1) return;
  card.pageRows.splice(index, 1);
  recalculateStatusForCard(card);
  flashSaving();
  renderGate();
}

function renderEvidenceIndex() {
  activeView = 'evidence';
  setToolbarVisible(false);
  els.pageTitle.textContent = 'Доказательства';
  const catalog = getEvidenceCatalog();
  if (!catalog.length) {
    els.contentArea.innerHTML = '<div class="empty">В текущем проекте пока нет структурированных доказательств.</div>';
    return;
  }
  els.contentArea.innerHTML = `
    <div class="panel evidence-index">
      <div class="panel-head">
        <div>
          <h2>Единые данные доказательств</h2>
          <p class="muted">Здесь собраны структурированные поля доказательств проекта.</p>
        </div>
      </div>
      <div class="evidence-index-grid">
        ${catalog.map(item => `
          <label class="evidence-index-item">
            <span class="evidence-title">${escapeHtml(item.label)}</span>
            <textarea data-evidence-key="${escapeAttr(item.key)}" rows="4">${escapeHtml(getEvidenceValue(item.key))}</textarea>
          </label>`).join('')}
      </div>
    </div>`;
  document.querySelectorAll('[data-evidence-key]').forEach(input => {
    input.addEventListener('input', updateEvidenceFromInput);
    input.addEventListener('change', updateEvidenceFromInput);
  });
}


function renderLinkBank() {
  activeView = 'linkBank';
  setToolbarVisible(false);
  harvestKnownLinks(state);
  els.pageTitle.textContent = 'Ссылки проекта';
  const links = state.linkBank || [];
  els.contentArea.innerHTML = `
    <div class="panel link-bank-panel">
      <div class="panel-head">
        <div>
          <h2>Единая база ссылок проекта</h2>
          <p class="muted">Все URL, введённые в Gate 1, сохраняются здесь и предлагаются в следующих блоках.</p>
        </div>
        <button class="btn primary" id="addProjectLinkBtn">+ Добавить ссылку</button>
      </div>
      <div class="table-scroll">
        <table class="data-table link-bank-table">
          <thead><tr><th>URL</th><th>Доступность</th><th>Индексация</th><th>SEO-видимость</th><th>Ошибки</th><th>Комментарий</th><th></th></tr></thead>
          <tbody>${links.map((link, index) => linkBankRowHtml(link, index)).join('')}</tbody>
        </table>
      </div>
    </div>`;
  document.getElementById('addProjectLinkBtn')?.addEventListener('click', () => {
    state.linkBank = state.linkBank || [];
    state.linkBank.push({ id: makeId('link'), url: '', comment: '', seo: defaultSeoStatus(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    flashSaving();
    renderLinkBank();
  });
  document.querySelectorAll('[data-link-bank-index]').forEach(input => {
    input.addEventListener('input', updateLinkBankFromInput);
    input.addEventListener('change', updateLinkBankFromInput);
  });
  document.querySelectorAll('[data-remove-link-bank]').forEach(btn => btn.addEventListener('click', () => {
    const index = Number(btn.dataset.removeLinkBank);
    state.linkBank.splice(index, 1);
    flashSaving();
    renderLinkBank();
  }));
}

function linkBankRowHtml(link, index) {
  const seo = { ...defaultSeoStatus(), ...(link.seo || {}) };
  return `<tr>
    <td><input data-link-bank-index="${index}" data-link-bank-field="url" value="${escapeAttr(link.url || '')}" placeholder="https://" /></td>
    <td><select data-link-bank-index="${index}" data-link-bank-field="availability">${seoOptionsHtml('availability', seo.availability)}</select></td>
    <td><select data-link-bank-index="${index}" data-link-bank-field="indexation">${seoOptionsHtml('indexation', seo.indexation)}</select></td>
    <td><select data-link-bank-index="${index}" data-link-bank-field="visibility">${seoOptionsHtml('visibility', seo.visibility)}</select></td>
    <td><select data-link-bank-index="${index}" data-link-bank-field="errors">${seoOptionsHtml('errors', seo.errors)}</select></td>
    <td><input data-link-bank-index="${index}" data-link-bank-field="comment" value="${escapeAttr(link.comment || '')}" placeholder="краткое уточнение" /> ${seoIndicatorHtml(link.url)}</td>
    <td><button class="small-btn danger-mini" data-remove-link-bank="${index}">×</button></td>
  </tr>`;
}

function seoOptionsHtml(group, value) {
  const groups = {
    availability: [['', 'Не проверено'], ['works', 'Работает'], ['not_works', 'Не работает']],
    indexation: [['', 'Не проверено'], ['indexed', 'Индексирована'], ['not_indexed', 'Не индексирована']],
    visibility: [['', 'Не проверено'], ['visible', 'Видна'], ['not_visible', 'Не видна']],
    errors: [['', 'Не проверено'], ['no_errors', 'Нет'], ['has_errors', 'Есть']]
  };
  return (groups[group] || groups.availability).map(([key, label]) => `<option value="${escapeAttr(key)}" ${value === key ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
}

function updateLinkBankFromInput(e) {
  const index = Number(e.target.dataset.linkBankIndex);
  const field = e.target.dataset.linkBankField;
  if (!state.linkBank?.[index]) return;
  const link = state.linkBank[index];
  if (['availability','indexation','visibility','errors'].includes(field)) {
    link.seo = { ...defaultSeoStatus(), ...(link.seo || {}) };
    link.seo[field] = e.target.value;
  } else {
    link[field] = e.target.value;
  }
  link.updatedAt = new Date().toISOString();
  flashSaving();
}

function renderTools() {
  activeView = 'tools';
  setToolbarVisible(false);
  state.tools = normalizeProjectTools(state.tools);
  els.pageTitle.textContent = 'Инструменты проекта';
  const groups = {};
  state.tools.forEach(tool => {
    groups[tool.group] = groups[tool.group] || [];
    groups[tool.group].push(tool);
  });
  els.contentArea.innerHTML = `
    <div class="panel tools-panel">
      <div class="panel-head">
        <div>
          <h2>Источники данных и инструменты</h2>
          <p class="muted">Включённые инструменты учитываются в блоках. Отключённые не мешают статусу «Готово».</p>
        </div>
      </div>
      <div class="tools-grid">
        ${Object.entries(groups).map(([group, tools]) => `<section class="tool-group"><h3>${escapeHtml(group)}</h3>${tools.map(tool => toolRowHtml(tool)).join('')}</section>`).join('')}
      </div>
    </div>`;
  document.querySelectorAll('[data-project-tool]').forEach(input => input.addEventListener('change', updateProjectTool));
}

function toolRowHtml(tool) {
  return `<label class="tool-toggle-row">
    <span><strong>${escapeHtml(tool.name)}</strong><small>${tool.enabled ? 'включён, учитывается в блоках' : 'отключён, не влияет на готовность'}</small></span>
    <select data-project-tool="${escapeAttr(tool.key)}">
      <option value="enabled" ${tool.enabled ? 'selected' : ''}>Включён</option>
      <option value="disabled" ${!tool.enabled ? 'selected' : ''}>Отключён</option>
    </select>
  </label>`;
}

function updateProjectTool(e) {
  const key = e.target.dataset.projectTool;
  const tool = state.tools.find(item => item.key === key);
  if (!tool) return;
  tool.enabled = e.target.value === 'enabled';
  recalculateAllStatuses(state);
  flashSaving();
  renderTools();
}

function renderMetrics() {
  activeView = 'metrics';
  setToolbarVisible(false);
  els.pageTitle.textContent = 'Метрики';
  const tpl = document.getElementById('metricsTemplate').content.cloneNode(true);
  els.contentArea.innerHTML = '';
  els.contentArea.appendChild(tpl);
  bindMetrics();
  drawMetricsChart();
}

function bindMetrics() {
  const tbody = document.querySelector('#metricsTable tbody');
  tbody.innerHTML = (state.metrics || []).map((m, index) => metricRowHtml(m, index)).join('');
  document.getElementById('addMetricRow').addEventListener('click', () => {
    state.metrics = state.metrics || [];
    state.metrics.push({ date: new Date().toISOString().slice(0,10), channel: '', impressions: 0, clicks: 0, cost: 0, leads: 0 });
    flashSaving();
    renderMetrics();
  });
  tbody.querySelectorAll('[data-metric-index]').forEach(input => {
    input.addEventListener('input', e => {
      const idx = Number(e.target.dataset.metricIndex);
      const key = e.target.dataset.metricField;
      const val = ['impressions','clicks','cost','leads'].includes(key) ? Number(e.target.value || 0) : e.target.value;
      state.metrics[idx][key] = val;
      flashSaving();
      bindMetrics();
      drawMetricsChart();
    });
  });
  tbody.querySelectorAll('[data-remove-metric]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.removeMetric);
      state.metrics.splice(idx, 1);
      flashSaving();
      renderMetrics();
    });
  });
}

function metricRowHtml(m, index) {
  const ctr = m.impressions ? ((m.clicks / m.impressions) * 100).toFixed(2) + '%' : '0%';
  const cpa = m.leads ? Math.round(m.cost / m.leads).toLocaleString('ru-RU') : '0';
  return `<tr>
    <td><input type="date" data-metric-index="${index}" data-metric-field="date" value="${escapeAttr(m.date || '')}" /></td>
    <td><input data-metric-index="${index}" data-metric-field="channel" value="${escapeAttr(m.channel || '')}" placeholder="Директ, SEO, CRM" /></td>
    <td><input type="number" data-metric-index="${index}" data-metric-field="impressions" value="${Number(m.impressions || 0)}" /></td>
    <td><input type="number" data-metric-index="${index}" data-metric-field="clicks" value="${Number(m.clicks || 0)}" /></td>
    <td><input type="number" data-metric-index="${index}" data-metric-field="cost" value="${Number(m.cost || 0)}" /></td>
    <td><input type="number" data-metric-index="${index}" data-metric-field="leads" value="${Number(m.leads || 0)}" /></td>
    <td>${ctr}</td>
    <td>${cpa}</td>
    <td><button class="small-btn" data-remove-metric="${index}">Удалить</button></td>
  </tr>`;
}

function drawMetricsChart() {
  const chart = document.getElementById('metricsChart');
  if (!chart) return;
  const grouped = {};
  (state.metrics || []).forEach(m => {
    const key = m.channel || 'Без канала';
    grouped[key] = grouped[key] || { channel: key, cost: 0, leads: 0 };
    grouped[key].cost += Number(m.cost || 0);
    grouped[key].leads += Number(m.leads || 0);
  });
  const data = Object.values(grouped);
  if (!data.length) {
    chart.innerHTML = '<div class="empty">Добавьте строки метрик, чтобы увидеть график.</div>';
    return;
  }
  const maxCost = Math.max(...data.map(d => d.cost), 1);
  const maxLeads = Math.max(...data.map(d => d.leads), 1);
  chart.innerHTML = `<div class="bar-chart">${data.map(d => `
    <div class="bar-wrap">
      <div class="bar-value">${Math.round(d.cost).toLocaleString('ru-RU')} ₽</div>
      <div class="bar" style="height:${Math.max(4, (d.cost / maxCost) * 150)}px"></div>
      <div class="bar-value">${d.leads} лид.</div>
      <div class="bar alt" style="height:${Math.max(4, (d.leads / maxLeads) * 90)}px"></div>
      <div class="bar-label">${escapeHtml(d.channel)}</div>
    </div>`).join('')}</div>`;
}

function renderScheme() {
  activeView = 'scheme';
  setToolbarVisible(false);
  els.pageTitle.textContent = 'Схема платформы';
  els.contentArea.innerHTML = `
    <div class="panel scheme">
      <div>
        <h2>Как данные проходят через систему</h2>
        <p class="muted">Gate идут последовательно. В каждом Gate есть рабочие блоки. Данные вводятся один раз и автоматически используются в связанных местах.</p>
      </div>
      <div class="flow">
        ${state.gates.map((g, i) => `
          <div class="flow-node">
            <div class="flow-title">${escapeHtml(g.title)}</div>
            <div class="flow-meta">${g.cards.length} блоков, готово ${getProgress(g.cards)}%</div>
            <div class="progress-line"><div class="progress-fill" style="width:${getProgress(g.cards)}%"></div></div>
          </div>${i < state.gates.length - 1 ? '<div class="flow-arrow">→</div>' : ''}
        `).join('')}
      </div>
      <div class="chart-card">
        <h3>Прогресс по Gate</h3>
        <div class="bar-chart">
          ${state.gates.map(g => `
            <div class="bar-wrap">
              <div class="bar-value">${getProgress(g.cards)}%</div>
              <div class="bar" style="height:${Math.max(4, getProgress(g.cards) * 1.7)}px"></div>
              <div class="bar-label">${escapeHtml(g.title.replace(/^[0-9.]*/, '').trim())}</div>
            </div>`).join('')}
        </div>
      </div>
    </div>`;
}


function exportPdfReport() {
  syncProjectPassportCard(state);
  recalculateAllStatuses(state);
  syncEvidenceTexts(state);
  const currentGate = activeView === 'gate'
    ? state.gates.find(gate => gate.id === activeGateId)
    : state.gates[0];
  if (!currentGate) {
    alert('Не найден текущий Gate для экспорта.');
    return;
  }
  const rows = currentGate.cards.map(card => ({
    gate: currentGate.title,
    title: card.title,
    status: STATUS_LABELS[card.status] || card.status,
    evidence: formatStructuredEvidencePlain(card, state),
    notes: card.notes || ''
  }));
  const projectName = escapeHtml(state.project?.name || 'Проект');
  const gateTitle = escapeHtml(currentGate.title);
  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Отчёт ГУРУ — ${projectName} — ${gateTitle}</title>
    <style>
      body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#1f1b16;margin:28px;background:#fff;}
      h1{font-size:24px;margin:0 0 6px;} h2{font-size:16px;margin:0 0 14px;color:#756c61}.meta{color:#756c61;margin-bottom:20px;font-size:12px;}
      table{width:100%;border-collapse:collapse;font-size:11px;} th,td{border:1px solid #ded8ce;padding:8px;vertical-align:top;text-align:left;}
      th{background:#f4f1ec;text-transform:uppercase;letter-spacing:.04em;font-size:10px;}.evidence{white-space:pre-wrap;}.notes{white-space:pre-wrap;}@page{size:A4;margin:12mm;}
    </style></head><body>
    <h1>Отчёт ГУРУ: ${projectName}</h1>
    <h2>${gateTitle}</h2>
    <div class="meta">Экспорт содержит только текущий Gate и колонки: название блока, статус, структурированное доказательство, комментарий.</div>
    <table><thead><tr><th>Название блока</th><th>Статус</th><th>Структурированное доказательство</th><th>Комментарий</th></tr></thead><tbody>
    ${rows.map(row => `<tr><td>${escapeHtml(row.title)}</td><td>${escapeHtml(row.status)}</td><td class="evidence">${escapeHtml(row.evidence)}</td><td class="notes">${escapeHtml(row.notes)}</td></tr>`).join('')}
    </tbody></table>
    <script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script>
    </body></html>`;
  const reportWindow = window.open('', '_blank');
  if (!reportWindow) {
    alert('Браузер заблокировал окно печати. Разрешите всплывающие окна и повторите экспорт.');
    return;
  }
  reportWindow.document.open();
  reportWindow.document.write(html);
  reportWindow.document.close();
}

function exportCsv() {
  syncEvidenceTexts();
  const rows = [];
  rows.push(['gate', 'block', 'instruction', 'status', 'evidence', 'pages', 'notes', 'source_row']);
  state.gates.forEach(g => {
    g.cards.forEach(c => rows.push([g.title, c.title, c.instruction || '', STATUS_LABELS[c.status] || c.status, formatStructuredEvidencePlain(c, state), c.pages || '', c.notes || '', c.sourceRow || '']));
  });
  const catalog = getEvidenceCatalog();
  if (catalog.length) {
    rows.push([]);
    rows.push(['SHARED_EVIDENCE']);
    rows.push(['key', 'title', 'value', 'used_in_blocks']);
    catalog.forEach(item => rows.push([item.key, item.label, getEvidenceValue(item.key), item.cards.map(c => c.title).join(' | ')]));
  }
  if (state.linkBank?.length) {
    rows.push([]);
    rows.push(['PROJECT_LINK_BANK']);
    rows.push(['url', 'availability', 'indexation', 'visibility', 'errors', 'comment', 'source']);
    state.linkBank.forEach(link => {
      const seo = link.seo || {};
      rows.push([link.url || '', seoLabel('availability', seo.availability), seoLabel('indexation', seo.indexation), seoLabel('visibility', seo.visibility), seoLabel('errors', seo.errors), link.comment || '', toolNameByKey(link.source || '')]);
    });
  }
  if (state.tools?.length) {
    rows.push([]);
    rows.push(['PROJECT_TOOLS']);
    rows.push(['group', 'tool', 'enabled']);
    state.tools.forEach(tool => rows.push([tool.group, tool.name, tool.enabled ? 'Включён' : 'Отключён']));
  }
  if (state.metrics?.length) {
    rows.push([]);
    rows.push(['METRICS']);
    rows.push(['date', 'channel', 'impressions', 'clicks', 'cost', 'leads', 'ctr', 'cpa']);
    state.metrics.forEach(m => {
      const ctr = m.impressions ? ((m.clicks / m.impressions) * 100).toFixed(2) : 0;
      const cpa = m.leads ? (m.cost / m.leads).toFixed(2) : 0;
      rows.push([m.date || '', m.channel || '', m.impressions || 0, m.clicks || 0, m.cost || 0, m.leads || 0, ctr, cpa]);
    });
  }
  downloadText('guru-export.csv', toCsv(rows));
}

function toCsv(rows) {
  return rows.map(row => row.map(v => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\n');
}

function downloadText(filename, text) {
  const blob = new Blob(['\ufeff' + text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && inQuotes && next === '"') { cell += '"'; i++; continue; }
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { row.push(cell); cell = ''; continue; }
    if ((ch === '\n' || ch === '\r') && !inQuotes) {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = ''; continue;
    }
    cell += ch;
  }
  row.push(cell); rows.push(row);
  return rows.filter(r => r.some(v => String(v).trim() !== ''));
}

function importCsvFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCsv(reader.result);
    if (!rows.length) return alert('CSV пустой.');
    const replace = confirm('Заменить текущие карточки импортированным CSV? Нажмите “Отмена”, чтобы добавить отдельный импортированный Gate.');
    const importedGate = {
      id: 'gate-import-' + Date.now(),
      title: 'Импорт CSV ' + new Date().toLocaleDateString('ru-RU'),
      cards: rows.slice(1).map((r, idx) => ({
        id: 'import-card-' + Date.now() + '-' + idx,
        title: r[0] || r[1] || 'Без названия',
        instruction: r[1] || '',
        status: 'not_started',
        evidence: r[3] || '',
        evidenceFields: extractEvidenceFields(r[3] || '').map(item => ({ key: item.key, label: item.label })),
        pages: r[5] || '',
        notes: '',
        fields: {},
        sourceRow: idx + 2
      }))
    };
    if (replace) state.gates = [importedGate]; else state.gates.push(importedGate);
    initializeEvidenceStructure(state);
    activeView = 'gate';
    activeGateId = importedGate.id;
    flashSaving();
    render();
  };
  reader.readAsText(file, 'utf-8');
}

function resetDemo() {
  if (!activeProjectId) return;
  if (!confirm('Сбросить данные текущего проекта и вернуться к исходному CSV?')) return;
  const meta = projects.find(p => p.id === activeProjectId);
  localStorage.removeItem(WORKSPACE_STORAGE_PREFIX + activeProjectId);
  state = createFreshWorkspace(meta);
  activeView = 'project';
  activeGateId = state.gates[0]?.id || null;
  saveState();
  render();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s]));
}
function escapeAttr(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }

// Header and navigation events
document.getElementById('switchProjectBtn')?.addEventListener('click', showLauncher);
document.getElementById('projectBtn')?.addEventListener('click', () => { activeView = 'project'; render(); });
document.getElementById('importBtn').addEventListener('click', () => els.csvInput.click());
els.csvInput.addEventListener('change', e => e.target.files[0] && importCsvFile(e.target.files[0]));
document.getElementById('exportBtn').addEventListener('click', exportCsv);
document.getElementById('exportPdfBtn').addEventListener('click', exportPdfReport);
document.getElementById('resetBtn').addEventListener('click', resetDemo);

els.searchInput.addEventListener('input', renderGate);
els.statusFilter.addEventListener('change', renderGate);
document.getElementById('closeProjectModal').addEventListener('click', hideNewProjectModal);
document.getElementById('cancelProjectCreate').addEventListener('click', hideNewProjectModal);
document.getElementById('createProjectConfirm').addEventListener('click', createProjectFromModal);
els.newProjectModal.addEventListener('click', e => {
  if (e.target === els.newProjectModal) hideNewProjectModal();
});
document.getElementById('newProjectName').addEventListener('keydown', e => {
  if (e.key === 'Enter') createProjectFromModal();
});

showLauncher();

/* v0.14 — Context-first simplification overrides */

function isRemovedGate1StandaloneBlock(card) {
  const title = normalizeGateTitle(card?.title || '');
  return V14_REMOVED_GATE1_BLOCKS.some(item => title === normalizeGateTitle(item));
}

function isPageContextCard(card) {
  const title = normalizeGateTitle(card?.title || '');
  const gate = card?.gateId || '';
  if (V14_PAGE_BLOCK_TITLES.some(item => title === normalizeGateTitle(item))) return true;
  if (gate === 'gate-2' && /tilda|сайт|страниц|форма|cta|кнопк|мобильн/.test(title)) return true;
  if (gate === 'gate-4' && /посадоч|страниц|смысловой каркас|психосло|форма|мобильн/.test(title)) return true;
  return false;
}

function isAnalyticsContextCard(card) {
  const text = normalizeGateTitle([card?.title, card?.instruction].join(' '));
  return /метрик|аналитик|вебвизор|utm|цели|событ|директ|ads|рся|seo|вебмастер|search console|analytics|crm|лид|форм|коллтрекинг|sitemap|robots|ssl|редирект|pagespeed|wordstat|частот|кластер|семантик|спрос|cpa|drr|aov|ltv|маржин/.test(text);
}

function isStrategyContextCard(card) {
  return card?.gateId === 'gate-3' || /стратег|воронк|этап|матрица|сегмент|оффер|утп|целевая|аудитор/.test(normalizeGateTitle([card?.title, card?.instruction].join(' ')));
}

function isImplementationContextCard(card) {
  return card?.gateId === 'gate-4' || /реализац|готов|запуск|qa|креатив|собран|привязан|подключен|выбран|зафиксирован/.test(normalizeGateTitle([card?.title, card?.instruction].join(' ')));
}

function isTaskContextCard(card) {
  return /задач|архив|дата реализации|регулярные|проектные|реализован/.test(normalizeGateTitle(card?.title || ''));
}

function getGate1Sections(gate, visibleCards = gate.cards) {
  const visibleIds = new Set((visibleCards || []).filter(card => !isRemovedGate1StandaloneBlock(card)).map(card => card.id));
  const starts = GATE1_SUBBLOCKS.map(config => {
    const index = gate.cards.findIndex(card => {
      const title = normalizeGateTitle(card.title);
      return config.aliases.some(alias => title === normalizeGateTitle(alias));
    });
    return { ...config, index };
  });
  return starts.map((config, order) => {
    const startIndex = config.index;
    const nextKnown = starts.slice(order + 1).map(item => item.index).find(index => index > startIndex);
    const endIndex = nextKnown ?? gate.cards.length;
    const headerCard = startIndex >= 0 ? gate.cards[startIndex] : null;
    const allInnerCards = startIndex >= 0 ? gate.cards.slice(startIndex + 1, endIndex).filter(card => !isRemovedGate1StandaloneBlock(card)) : [];
    const filteredInnerCards = allInnerCards.filter(card => visibleIds.has(card.id));
    return { ...config, headerCard, allInnerCards, filteredInnerCards };
  });
}

function getGate1CardMode(card) {
  if (isRemovedGate1StandaloneBlock(card)) return null;
  if (!isGate1Card(card) || !card?.title) return null;
  const title = normalizeGateTitle(card.title);
  if (GATE1_PAGE_STRUCTURE_TITLES.some(page => title === normalizeGateTitle(page))) return 'page_structure';
  if (getComparisonConfig(card)) return 'comparison';
  if (getGate1LinkStatusType(card)) return 'links';
  return null;
}

function ensureSemanticUiState() {
  ensureUiState(state);
  state.ui.semanticAccordion = state.ui.semanticAccordion || {};
}

function getSemanticAccordionState(gateId) {
  ensureSemanticUiState();
  state.ui.semanticAccordion[gateId] = state.ui.semanticAccordion[gateId] || { sections: {}, cards: {} };
  return state.ui.semanticAccordion[gateId];
}

function isSemanticAccordionGate(gate) {
  return ['gate-2','gate-3','gate-4'].includes(gate?.id);
}

function getSemanticGateSections(gate, visibleCards = gate.cards) {
  const visibleIds = new Set((visibleCards || []).map(card => card.id));
  if (gate.id === 'gate-2') return getNumberedHeaderSections(gate, visibleIds);
  if (gate.id === 'gate-3') return getManualSemanticSections(gate, visibleIds, [
    { key:'funnel_map', title:'Воронка и карта решений', match:/список этапов|карта воронки|матрица/i },
    { key:'funnel_stages', title:'Этапы воронки', match:/этап/i },
    { key:'strategy_base', title:'Стратегическая сборка', match:/.*/i }
  ]);
  if (gate.id === 'gate-4') return getManualSemanticSections(gate, visibleIds, [
    { key:'realization_map', title:'Карта реализации', match:/карта реализации/i },
    { key:'strategic_base', title:'Стратегический фундамент', match:/продукт|оффер|сегмент|целевое действие/i },
    { key:'landing_site', title:'Посадочная и сайт', match:/посадоч|страниц|каркас|психосло|формы|контакты|мобильн/i },
    { key:'measurement_leads', title:'Измерение и лиды', match:/метрик|цели|utm|лид|статус|crm/i },
    { key:'creative_ads', title:'Креативы и рекламные сущности', match:/креатив|рекламн|посадки|бюджет/i },
    { key:'launch_ready', title:'Запусковая готовность', match:/qa|менеджер|запуск/i }
  ]);
  return [];
}

function getNumberedHeaderSections(gate, visibleIds) {
  const sections = [];
  let current = null;
  gate.cards.forEach(card => {
    const isHeader = /^\s*\d+\.\s+/.test(card.title || '');
    if (isHeader) {
      current = { key: 'sec-' + sections.length, title: card.title.replace(/^\s*\d+\.\s+/, '').trim(), headerCard: card, allInnerCards: [], filteredInnerCards: [] };
      sections.push(current);
    } else {
      if (!current) {
        current = { key: 'sec-' + sections.length, title: 'Рабочие блоки', headerCard: null, allInnerCards: [], filteredInnerCards: [] };
        sections.push(current);
      }
      current.allInnerCards.push(card);
      if (visibleIds.has(card.id)) current.filteredInnerCards.push(card);
    }
  });
  return sections.filter(section => section.allInnerCards.length || section.headerCard);
}

function getManualSemanticSections(gate, visibleIds, rules) {
  const sections = rules.map(rule => ({ ...rule, headerCard: null, allInnerCards: [], filteredInnerCards: [] }));
  gate.cards.forEach(card => {
    const target = sections.find(section => section.match.test(card.title || '')) || sections[sections.length - 1];
    target.allInnerCards.push(card);
    if (visibleIds.has(card.id)) target.filteredInnerCards.push(card);
  });
  return sections.filter(section => section.allInnerCards.length);
}

function renderGateTable(gate, cards) {
  if (isGate1Analytics(gate)) {
    renderGate1Accordion(gate, cards);
    return;
  }
  if (isSemanticAccordionGate(gate)) {
    renderSemanticGateAccordion(gate, cards);
    return;
  }
  els.contentArea.innerHTML = `
    <div class="table-scroll clean-table-wrap">
      <table class="data-table clean-data-table v14-clean-table">
        <thead><tr><th>Блок</th><th>Статус</th><th>Рабочие поля</th></tr></thead>
        <tbody>${cards.map(c => `
          <tr data-card-row="${c.id}">
            <td class="table-title">
              <div class="block-title-main">${escapeHtml(c.title)}</div>
              ${instructionToggleHtml(c)}
            </td>
            <td>${statusSelect(c)}</td>
            <td>${cardUserFieldsHtml(c)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
  bindCardInputs();
}

function renderSemanticGateAccordion(gate, cards) {
  const sections = getSemanticGateSections(gate, cards);
  const acc = getSemanticAccordionState(gate.id);
  els.contentArea.innerHTML = `<div class="semantic-accordion v14-semantic">
    <div class="analytics-intro compact-intro">
      <div class="analytics-path">${escapeHtml(gate.title)}</div>
      <h2>${escapeHtml(gate.title)}</h2>
      <p class="muted">Блоки сгруппированы по смыслу. Внутри каждого блока показываются только поля, которые нужны для его задачи.</p>
    </div>
    ${sections.map(section => {
      const isOpen = Boolean(acc.sections[section.key]);
      const status = getSectionStatus(section.allInnerCards);
      const progressText = getSectionProgressText(section.allInnerCards);
      const cardsToShow = section.filteredInnerCards;
      return `<section class="analytics-subblock semantic-subblock ${isOpen ? 'is-open is-active' : ''}">
        <button class="subblock-header" data-semantic-toggle-section="${escapeAttr(gate.id)}::${escapeAttr(section.key)}">
          <span class="subblock-main">
            <span class="analytics-path">${escapeHtml(gate.title)} → ${escapeHtml(section.title)}</span>
            <span class="subblock-title">${escapeHtml(section.title)}</span>
            <span class="subblock-progress">${escapeHtml(progressText)}</span>
          </span>
          <span class="status-pill status-${status}">${STATUS_LABELS[status] || status}</span>
          <span class="subblock-toggle">${isOpen ? 'Закрыть' : 'Открыть'}</span>
        </button>
        ${isOpen ? `<div class="subblock-body">
          ${cardsToShow.length ? cardsToShow.map(card => semanticWorkBlockHtml(gate, section.title, card)).join('') : '<div class="empty compact-empty">По текущему фильтру внутри подблока ничего не найдено.</div>'}
        </div>` : ''}
      </section>`;
    }).join('')}
  </div>`;
  bindSemanticAccordion(gate.id);
  bindCardInputs();
}

function semanticWorkBlockHtml(gate, sectionTitle, card) {
  const acc = getSemanticAccordionState(gate.id);
  const isOpen = Boolean(acc.cards[card.id]);
  return `<article class="work-accordion-card semantic-work-card ${isOpen ? 'is-open is-active' : ''}" data-card="${escapeAttr(card.id)}">
    <button class="work-card-header" data-semantic-toggle-card="${escapeAttr(gate.id)}::${escapeAttr(card.id)}">
      <span class="work-card-main">
        <span class="analytics-path">${escapeHtml(gate.title)} → ${escapeHtml(sectionTitle)} → ${escapeHtml(card.title)}</span>
        <span class="work-card-title">${escapeHtml(card.title)}</span>
        <span class="work-card-preview">${escapeHtml(cardPreviewText(card))}</span>
      </span>
      <span class="status-pill status-${card.status}">${STATUS_LABELS[card.status] || card.status}</span>
      <span class="work-card-toggle">${isOpen ? 'Свернуть' : 'Раскрыть'}</span>
    </button>
    ${isOpen ? `<div class="work-card-body">
      ${instructionToggleHtml(card)}
      <div class="card-fields v14-context-fields">${cardUserFieldsHtml(card)}</div>
    </div>` : ''}
  </article>`;
}

function bindSemanticAccordion(gateId) {
  document.querySelectorAll('[data-semantic-toggle-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [gid, key] = btn.dataset.semanticToggleSection.split('::');
      const acc = getSemanticAccordionState(gid || gateId);
      acc.sections[key] = !acc.sections[key];
      saveState();
      renderGate();
    });
  });
  document.querySelectorAll('[data-semantic-toggle-card]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [gid, cardId] = btn.dataset.semanticToggleCard.split('::');
      const acc = getSemanticAccordionState(gid || gateId);
      acc.cards[cardId] = !acc.cards[cardId];
      saveState();
      renderGate();
    });
  });
}

function cardUserFieldsHtml(c) {
  if (isProjectPassportCard(c)) return `<div class="field-row"><span>Паспорт проекта</span>${projectPassportFieldsHtml()}</div>`;
  if (isCurrentResultsCard(c)) return `<div class="field-row"><span>Показатели</span>${currentResultsHtml(c)}</div>`;
  if (isToolStatusCard(c)) return `<div class="field-row"><span>Статусы элементов</span>${toolItemsHtml(c)}</div>`;
  if (isStartupSummaryCard(c)) return `<div class="field-row"><span>Автоматическая сводка</span>${startupSummaryHtml()}</div>`;
  if (getGate1CardMode(c)) return gate1TypedFieldsHtml(c);
  if (isPageContextCard(c)) return contextPageFieldsHtml(c);
  if (isImplementationContextCard(c)) return implementationFieldsHtml(c);
  if (isStrategyContextCard(c)) return strategyFieldsHtml(c);
  if (isAnalyticsContextCard(c)) return contextualInstructionWorkspaceHtml(c);
  if (isTaskContextCard(c)) return taskFieldsHtml(c);
  const evidence = evidenceStructuredHtml(c);
  return evidence ? `<div class="field-row simplified-fields">${evidence}</div>` : '';
}

function contextualInstructionWorkspaceHtml(card) {
  const rows = ensureInstructionWorkspace(card).filter(row => row.element || row.tool || row.serviceUrl);
  if (!rows.length) return evidenceStructuredHtml(card);
  card.instructionRows = rows;
  return `<div class="field-row simplified-fields">${instructionWorkspaceHtml(card)}</div>`;
}

function ensureContextPageRows(card) {
  if (!Array.isArray(card.pageRows) || !card.pageRows.length) card.pageRows = [createPageStructureRow(defaultPageNameForCard(card), true)];
  card.pageRows.forEach(row => normalizePageStructureRow(row, card));
  return card.pageRows;
}

function contextPageFieldsHtml(card) {
  const rows = ensureContextPageRows(card);
  return `<div class="field-row"><span>Структура страницы</span><div class="typed-block pages-block contextual-pages">
    ${rows.map((row, pageIndex) => pageStructureCardHtml(card, row, pageIndex, false)).join('')}
  </div></div>`;
}

function pageStructureStatus(row) {
  const checks = [
    Boolean(String(row.url || '').trim()),
    Boolean(row.urlStatus),
    evaluateLength(row.h1, 10, 90).ok,
    evaluateLength(row.title, 20, 90).ok,
    evaluateLength(row.description, 50, 200).ok,
    row.ctaMode === 'not_needed' ? true : Boolean(String(row.finalCta || '').trim())
  ];
  const filled = checks.filter(Boolean).length;
  if (!filled) return 'not_started';
  if (filled === checks.length) return 'ready';
  return 'in_progress';
}

function pageTemplateContext(card) {
  const title = normalizeGateTitle(card?.title || '');
  if (title === normalizeGateTitle('ГЛАВНАЯ')) return 'home';
  if (/контак/.test(title)) return 'contacts';
  if (/категор|список|каталог/.test(title)) return 'catalog';
  if (/товар|карточка/.test(title)) return 'product';
  if (/услуг/.test(title)) return 'service';
  if (/лендинг|посадоч/.test(title)) return 'landing';
  return 'standard';
}

function ensurePageContextFields(row, context) {
  row.contextFields = row.contextFields || {};
  const defs = pageContextDefinitions(context);
  defs.forEach(def => { if (row.contextFields[def.key] === undefined) row.contextFields[def.key] = ''; });
  return defs;
}

function pageContextDefinitions(context) {
  const base = [
    { group:'SEO и базовая структура', key:'snippetMeaning', label:'Основной смысл страницы', type:'textarea' },
    { group:'SEO и базовая структура', key:'seoIssues', label:'Проблемы страницы', type:'input' }
  ];
  if (context === 'home') return [
    { group:'Герой-экран', key:'heroH1', label:'H1', type:'input' },
    { group:'Герой-экран', key:'heroUsp', label:'УТП', type:'textarea' },
    { group:'Герой-экран', key:'heroVisual', label:'Визуал', type:'input' },
    { group:'Герой-экран', key:'heroProof', label:'Соцдоказательство', type:'input' },
    { group:'Герой-экран', key:'heroMiniBlocks', label:'Мини-блоки: доставка / сроки / гарантия / оплата', type:'textarea' },
    { group:'Герой-экран', key:'primaryButton', label:'Основная кнопка', type:'input' },
    { group:'Герой-экран', key:'secondaryButton', label:'Альтернативная кнопка', type:'input' },
    { group:'Навигация по сегментам', key:'segmentTitle', label:'Заголовок', type:'input' },
    { group:'Навигация по сегментам', key:'segmentCards', label:'Карточки сегментов и ссылки', type:'textarea' },
    { group:'О компании', key:'aboutTitle', label:'Заголовок', type:'input' },
    { group:'О компании', key:'aboutFacts', label:'3 фактоида', type:'textarea' },
    { group:'О компании', key:'aboutText', label:'Короткий текст о подходе', type:'textarea' },
    { group:'О компании', key:'trustBadges', label:'Сертификаты / награды / значки доверия', type:'textarea' },
    { group:'Кейсы', key:'cases', label:'3–4 примера: название / категория / результат', type:'textarea' },
    { group:'Кейсы', key:'portfolioButton', label:'Кнопка портфолио', type:'input' },
    { group:'Процесс работы', key:'processTitle', label:'Заголовок', type:'input' },
    { group:'Процесс работы', key:'processSteps', label:'3–5 шагов и срок по каждому шагу', type:'textarea' },
    { group:'Процесс работы', key:'processButton', label:'Кнопка под схемой', type:'input' },
    { group:'Выгоды', key:'benefits', label:'3 тезиса с конкретной выгодой', type:'textarea' },
    { group:'Отзывы', key:'reviews', label:'Яндекс / Google Reviews или 3 цитаты', type:'textarea' },
    { group:'Отзывы', key:'reviewsButton', label:'Кнопка «Читать все отзывы»', type:'input' },
    ...base
  ];
  if (context === 'contacts') return [
    { group:'Контакты', key:'phone', label:'Телефон', type:'input' },
    { group:'Контакты', key:'messengers', label:'Мессенджеры', type:'input' },
    { group:'Контакты', key:'address', label:'Адрес / карта', type:'input' },
    { group:'Контакты', key:'hours', label:'График работы', type:'input' },
    { group:'Контакты', key:'form', label:'Форма связи', type:'textarea' },
    ...base
  ];
  if (context === 'catalog') return [
    { group:'Каталог', key:'categoryLogic', label:'Логика категорий', type:'textarea' },
    { group:'Каталог', key:'filters', label:'Фильтры / сортировка', type:'textarea' },
    { group:'Каталог', key:'cards', label:'Карточки каталога', type:'textarea' },
    { group:'Каталог', key:'catalogCta', label:'CTA каталога', type:'input' },
    ...base
  ];
  if (context === 'product') return [
    { group:'Карточка', key:'gallery', label:'Галерея / визуал', type:'input' },
    { group:'Карточка', key:'price', label:'Цена / условия', type:'input' },
    { group:'Карточка', key:'characteristics', label:'Характеристики', type:'textarea' },
    { group:'Карточка', key:'availability', label:'Наличие / сроки', type:'input' },
    { group:'Карточка', key:'productCta', label:'Кнопка действия', type:'input' },
    ...base
  ];
  if (context === 'service' || context === 'landing') return [
    { group:'Услуга / посадочная', key:'serviceProblem', label:'Проблема клиента', type:'textarea' },
    { group:'Услуга / посадочная', key:'serviceOffer', label:'Оффер страницы', type:'textarea' },
    { group:'Услуга / посадочная', key:'serviceProof', label:'Доказательства / кейсы', type:'textarea' },
    { group:'Услуга / посадочная', key:'serviceSteps', label:'Процесс / этапы', type:'textarea' },
    { group:'Услуга / посадочная', key:'serviceCta', label:'Основной CTA', type:'input' },
    ...base
  ];
  return base;
}

function pageStructureCardHtml(card, row, pageIndex, repeatable) {
  const context = pageTemplateContext(card);
  const defs = ensurePageContextFields(row, context);
  const snippet = snippetForPage(row);
  const grouped = defs.reduce((acc, def) => { (acc[def.group] = acc[def.group] || []).push(def); return acc; }, {});
  return `<section class="page-structure-card v14-page-card">
    <div class="page-structure-head">
      <input class="page-name-input" data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="name" value="${escapeAttr(row.name || '')}" placeholder="Название страницы" ${row.fixed ? 'readonly' : ''} />
      <span class="status-pill status-${pageStructureStatus(row)}">${STATUS_LABELS[pageStructureStatus(row)]}</span>
      ${repeatable ? `<button class="small-btn danger-mini" data-remove-gate1-page="${escapeAttr(card.id)}" data-index="${pageIndex}" ${rowsSafeLength(card.pageRows) <= 1 ? 'disabled' : ''}>×</button>` : ''}
    </div>
    <div class="page-grid compact-page-grid">
      <label>Ссылка<input list="projectUrlOptions" data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="url" value="${escapeAttr(row.url || '')}" placeholder="https://" />${projectUrlDatalistHtml()}</label>
      <label>Статус страницы<select data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="urlStatus">${linkStatusOptionsHtml('works', row.urlStatus)}</select></label>
      <label>H1 <small>10–90 знаков</small><input data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="h1" value="${escapeAttr(row.h1 || '')}" />${pageFieldStatusHtml(row.h1, 10, 90)}</label>
      <label>Title <small>20–90 знаков</small><input data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="title" value="${escapeAttr(row.title || '')}" />${pageFieldStatusHtml(row.title, 20, 90)}</label>
      <label class="full">Description <small>50–200 знаков</small><textarea data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="description" rows="2">${escapeHtml(row.description || '')}</textarea>${pageFieldStatusHtml(row.description, 50, 200)}</label>
    </div>
    <div class="page-context-groups">
      ${Object.entries(grouped).map(([group, items]) => `<details class="page-context-group" open>
        <summary>${escapeHtml(group)}</summary>
        <div class="page-context-grid">${items.map(def => pageContextFieldHtml(card, pageIndex, row, def)).join('')}</div>
      </details>`).join('')}
    </div>
    <div class="embedded-block clean-embedded">
      <h4>Сниппет страницы</h4>
      <div class="snippet-preview">${snippet ? escapeHtml(snippet) : 'Соберётся из H1, Title, Description, смысла и оффера страницы.'}</div>
    </div>
    <div class="embedded-block clean-embedded">
      <h4>Финальный CTA</h4>
      <select data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="ctaMode">
        <option value="needed" ${row.ctaMode !== 'not_needed' ? 'selected' : ''}>Нужен</option>
        <option value="not_needed" ${row.ctaMode === 'not_needed' ? 'selected' : ''}>Не нужен</option>
      </select>
      ${row.ctaMode === 'not_needed' ? '' : `<textarea data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="finalCta" rows="2" placeholder="Текст финального CTA">${escapeHtml(row.finalCta || '')}</textarea>`}
    </div>
  </section>`;
}

function pageContextFieldHtml(card, pageIndex, row, def) {
  const value = row.contextFields?.[def.key] || '';
  const common = `data-page-context-card-id="${escapeAttr(card.id)}" data-page-context-index="${pageIndex}" data-page-context-key="${escapeAttr(def.key)}"`;
  if (def.type === 'textarea') return `<label class="full">${escapeHtml(def.label)}<textarea ${common} rows="2">${escapeHtml(value)}</textarea></label>`;
  return `<label>${escapeHtml(def.label)}<input ${common} value="${escapeAttr(value)}" /></label>`;
}

function snippetForPage(row) {
  const ctx = row.contextFields || {};
  const parts = [row.title, row.description, row.h1, ctx.heroUsp, ctx.serviceOffer, ctx.snippetMeaning, ctx.productCta, row.finalCta].map(v => String(v || '').trim()).filter(Boolean);
  return truncateText(parts.join(' · '), 260);
}

function typedDataPlain(card) {
  const mode = getGate1CardMode(card);
  ensureGate1TypedData(card);
  if (mode === 'links') return (card.linkRows || []).map((row, i) => `${i + 1}. ${row.url || 'URL не указан'} — ${row.status || 'статус не выбран'}${row.comment ? ` — ${row.comment}` : ''}`).join('\n');
  if (mode === 'comparison') return (card.comparisonRows || []).map(row => `${row.label}: ${row.value || 'не заполнено'} ${row.unit || ''} / норма ${row.norm} / ${evaluateComparisonRow(row).label}${row.comment ? ` / ${row.comment}` : ''}`).join('\n');
  if (mode === 'page_structure') return (card.pageRows || []).map(row => `${row.name}: ${row.url || 'URL не указан'} / ${row.urlStatus || 'статус не выбран'}\nH1: ${row.h1 || ''}\nTitle: ${row.title || ''}\nDescription: ${row.description || ''}\nСниппет: ${snippetForPage(row)}\nФинальный CTA: ${row.ctaMode === 'not_needed' ? 'не нужен' : (row.finalCta || 'не заполнен')}`).join('\n\n');
  return '';
}

function gate1PageStructureHtml(card) {
  const rows = card.pageRows || [];
  const repeatable = isRepeatablePageCard(card);
  return `<div class="typed-block pages-block contextual-pages">
    ${rows.map((row, pageIndex) => pageStructureCardHtml(card, row, pageIndex, repeatable)).join('')}
    ${repeatable ? `<button class="small-btn add-inline-btn" data-add-gate1-page="${escapeAttr(card.id)}">+ Добавить страницу</button>` : ''}
  </div>`;
}

function strategyFieldsHtml(card) {
  card.strategyFields = card.strategyFields || { decision:'', source:'', nextStep:'' };
  return `<div class="strategy-fields context-panel">
    <div class="context-source">
      <strong>Автоконтекст проекта</strong>
      <span>Продукт: ${escapeHtml(getEvidenceValue('cto-prodaem') || state.project?.description || 'не заполнено')}</span>
      <span>Аудитория: ${escapeHtml(getEvidenceValue('komu-prodaem') || 'не заполнено')}</span>
      <span>УТП: ${escapeHtml(state.project?.usp || getEvidenceValue('utp') || 'не заполнено')}</span>
      <span>Оффер: ${escapeHtml(state.project?.offer || 'не заполнено')}</span>
    </div>
    <label>Стратегическое решение<textarea data-strategy-card-id="${escapeAttr(card.id)}" data-strategy-field="decision" rows="3">${escapeHtml(card.strategyFields.decision || '')}</textarea></label>
    <label>Источник решения<input data-strategy-card-id="${escapeAttr(card.id)}" data-strategy-field="source" value="${escapeAttr(card.strategyFields.source || '')}" placeholder="спрос, боль, конкурент, экономика" /></label>
    <label>Следующий шаг<input data-strategy-card-id="${escapeAttr(card.id)}" data-strategy-field="nextStep" value="${escapeAttr(card.strategyFields.nextStep || '')}" /></label>
  </div>`;
}

function implementationFieldsHtml(card) {
  card.implementationFields = card.implementationFields || { what:'', where:'', output:'', comment:'' };
  return `<div class="implementation-fields context-panel">
    <label>Что реализовать<textarea data-implementation-card-id="${escapeAttr(card.id)}" data-implementation-field="what" rows="2">${escapeHtml(card.implementationFields.what || '')}</textarea></label>
    <label>Где реализовать<input data-implementation-card-id="${escapeAttr(card.id)}" data-implementation-field="where" value="${escapeAttr(card.implementationFields.where || '')}" placeholder="страница / канал / кампания" /></label>
    <label>Результат на выходе<input data-implementation-card-id="${escapeAttr(card.id)}" data-implementation-field="output" value="${escapeAttr(card.implementationFields.output || '')}" /></label>
    <label>Комментарий<input data-implementation-card-id="${escapeAttr(card.id)}" data-implementation-field="comment" value="${escapeAttr(card.implementationFields.comment || '')}" placeholder="если нужен" /></label>
  </div>`;
}

function taskFieldsHtml(card) {
  card.taskFields = card.taskFields || { due:'', result:'', comment:'' };
  return `<div class="task-fields context-panel">
    <label>Дата / период<input data-task-card-id="${escapeAttr(card.id)}" data-task-field="due" value="${escapeAttr(card.taskFields.due || '')}" /></label>
    <label>Результат<input data-task-card-id="${escapeAttr(card.id)}" data-task-field="result" value="${escapeAttr(card.taskFields.result || '')}" /></label>
    <label>Комментарий<input data-task-card-id="${escapeAttr(card.id)}" data-task-field="comment" value="${escapeAttr(card.taskFields.comment || '')}" placeholder="если нужен" /></label>
  </div>`;
}

function bindCardInputs() {
  document.querySelectorAll('[data-card-id][data-field]').forEach(input => {
    input.addEventListener('input', updateCardFromInput);
    input.addEventListener('change', updateCardFromInput);
  });
  document.querySelectorAll('[data-evidence-key]').forEach(input => {
    input.addEventListener('input', updateEvidenceFromInput);
    input.addEventListener('change', updateEvidenceFromInput);
  });
  document.querySelectorAll('[data-project-inline]').forEach(input => {
    input.addEventListener('input', updateProjectFromInline);
    input.addEventListener('change', updateProjectFromInline);
  });
  document.querySelectorAll('[data-tool-card-id]').forEach(input => {
    input.addEventListener('input', updateToolItemFromInput);
    input.addEventListener('change', updateToolItemFromInput);
  });
  document.querySelectorAll('[data-current-result-card-id]').forEach(input => {
    input.addEventListener('input', updateCurrentResultFromInput);
    input.addEventListener('change', updateCurrentResultFromInput);
  });
  document.querySelectorAll('[data-instruction-row-card-id]').forEach(input => {
    input.addEventListener('input', updateInstructionRow);
    input.addEventListener('change', updateInstructionRow);
  });
  document.querySelectorAll('[data-inline-tool]').forEach(input => input.addEventListener('change', updateInlineTool));
  document.querySelectorAll('[data-tool-workspace-card-id]').forEach(input => {
    input.addEventListener('input', updateToolWorkspaceRow);
    input.addEventListener('change', updateToolWorkspaceRow);
  });
  document.querySelectorAll('[data-gate1-link-card-id]').forEach(input => {
    input.addEventListener('input', updateGate1LinkRow);
    input.addEventListener('change', updateGate1LinkRow);
  });
  document.querySelectorAll('[data-add-gate1-link]').forEach(btn => btn.addEventListener('click', () => addGate1LinkRow(btn.dataset.addGate1Link)));
  document.querySelectorAll('[data-remove-gate1-link]').forEach(btn => btn.addEventListener('click', () => removeGate1LinkRow(btn.dataset.removeGate1Link, Number(btn.dataset.index))));
  document.querySelectorAll('[data-gate1-comparison-card-id]').forEach(input => {
    input.addEventListener('input', updateGate1ComparisonRow);
    input.addEventListener('change', updateGate1ComparisonRow);
  });
  document.querySelectorAll('[data-gate1-page-card-id]').forEach(input => {
    input.addEventListener('input', updateGate1PageRow);
    input.addEventListener('change', updateGate1PageRow);
  });
  document.querySelectorAll('[data-page-context-card-id]').forEach(input => {
    input.addEventListener('input', updatePageContextField);
    input.addEventListener('change', updatePageContextField);
  });
  document.querySelectorAll('[data-add-gate1-page]').forEach(btn => btn.addEventListener('click', () => addGate1PageRow(btn.dataset.addGate1Page)));
  document.querySelectorAll('[data-remove-gate1-page]').forEach(btn => btn.addEventListener('click', () => removeGate1PageRow(btn.dataset.removeGate1Page, Number(btn.dataset.index))));
  document.querySelectorAll('[data-strategy-card-id]').forEach(input => {
    input.addEventListener('input', updateStrategyField);
    input.addEventListener('change', updateStrategyField);
  });
  document.querySelectorAll('[data-implementation-card-id]').forEach(input => {
    input.addEventListener('input', updateImplementationField);
    input.addEventListener('change', updateImplementationField);
  });
  document.querySelectorAll('[data-task-card-id]').forEach(input => {
    input.addEventListener('input', updateTaskField);
    input.addEventListener('change', updateTaskField);
  });
}

function updatePageContextField(e) {
  const card = findCard(e.target.dataset.pageContextCardId);
  if (!card) return;
  const index = Number(e.target.dataset.pageContextIndex);
  const key = e.target.dataset.pageContextKey;
  const rows = card.pageRows || [];
  if (!rows[index]) return;
  rows[index].contextFields = rows[index].contextFields || {};
  rows[index].contextFields[key] = e.target.value;
  recalculateStatusForCard(card);
  flashSaving();
}

function updateStrategyField(e) {
  const card = findCard(e.target.dataset.strategyCardId);
  if (!card) return;
  card.strategyFields = card.strategyFields || {};
  card.strategyFields[e.target.dataset.strategyField] = e.target.value;
  recalculateStatusForCard(card);
  flashSaving();
}

function updateImplementationField(e) {
  const card = findCard(e.target.dataset.implementationCardId);
  if (!card) return;
  card.implementationFields = card.implementationFields || {};
  card.implementationFields[e.target.dataset.implementationField] = e.target.value;
  recalculateStatusForCard(card);
  flashSaving();
}

function updateTaskField(e) {
  const card = findCard(e.target.dataset.taskCardId);
  if (!card) return;
  card.taskFields = card.taskFields || {};
  card.taskFields[e.target.dataset.taskField] = e.target.value;
  recalculateStatusForCard(card);
  flashSaving();
}

/* v0.15 — контекстный блок Robots.txt Яндекс: только Яндекс Вебмастер */
function isRobotsYandexCard(card) {
  return Boolean(isGate1Card(card) && /robots\.txt\s*яндекс/i.test(String(card?.title || '')));
}

const ROBOTS_YANDEX_DEFAULTS = {
  siteUrl: '',
  robotsUrl: '',
  fileStatus: '',
  analysisStatus: '',
  importantPagesOpen: '',
  servicePagesClosed: '',
  sitemapInRobots: '',
  evidenceUrl: '',
  comment: ''
};

const ROBOTS_YANDEX_INSTRUCTION = `Суть:
Проверить доступность и корректность файла robots.txt для Яндекса.

Контур блока:
URL сайта → Яндекс Вебмастер → статус файла → результат анализа → доказательство.

Поля блока:
URL сайта, URL robots.txt, Яндекс Вебмастер, статус файла, статус анализа, важные страницы открыты, служебные страницы закрыты, Sitemap указан, ссылка на проверку / скрин / отчёт, комментарий при проблеме.`;

function ensureRobotsYandexFields(card) {
  if (!card) return ROBOTS_YANDEX_DEFAULTS;
  card.instruction = ROBOTS_YANDEX_INSTRUCTION;
  card.robotsYandex = { ...ROBOTS_YANDEX_DEFAULTS, ...(card.robotsYandex || {}) };
  return card.robotsYandex;
}

const __guruPrevGetGate1CardModeV15 = getGate1CardMode;
getGate1CardMode = function(card) {
  if (isRobotsYandexCard(card)) return 'robots_yandex';
  return __guruPrevGetGate1CardModeV15(card);
};

const __guruPrevEnsureGate1TypedDataV15 = ensureGate1TypedData;
ensureGate1TypedData = function(card) {
  if (isRobotsYandexCard(card)) {
    ensureRobotsYandexFields(card);
    return;
  }
  return __guruPrevEnsureGate1TypedDataV15(card);
};

const ROBOTS_YANDEX_STATUS = {
  fileStatus: [['', 'Выбрать'], ['found', 'Найден'], ['not_found', 'Не найден']],
  analysisStatus: [['', 'Выбрать'], ['correct', 'Корректен'], ['errors', 'Есть ошибки']],
  importantPagesOpen: [['', 'Выбрать'], ['yes', 'Да'], ['no', 'Нет']],
  servicePagesClosed: [['', 'Выбрать'], ['yes', 'Да'], ['no', 'Нет']],
  sitemapInRobots: [['', 'Выбрать'], ['yes', 'Да'], ['no', 'Нет']]
};

function robotsYandexSelect(field, value) {
  return `<select data-robots-yandex-field="${escapeAttr(field)}">${ROBOTS_YANDEX_STATUS[field].map(([key, label]) => `<option value="${escapeAttr(key)}" ${value === key ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select>`;
}

function robotsYandexResultClass(field, value) {
  if (!value) return 'neutral';
  if (field === 'fileStatus') return value === 'found' ? 'ok' : 'bad';
  if (field === 'analysisStatus') return value === 'correct' ? 'ok' : 'bad';
  if (['importantPagesOpen', 'servicePagesClosed', 'sitemapInRobots'].includes(field)) return value === 'yes' ? 'ok' : 'bad';
  return 'neutral';
}

function robotsYandexFieldsHtml(card) {
  const fields = ensureRobotsYandexFields(card);
  const service = serviceLinkByToolKey('yandex_webmaster') || { label: 'Яндекс Вебмастер', url: 'https://webmaster.yandex.ru/' };
  const statusChip = (field, label) => `<span class="result-pill result-${robotsYandexResultClass(field, fields[field])}">${escapeHtml(label)}</span>`;
  return `<div class="robots-yandex-workspace context-panel">
    <div class="workspace-unit-title">Контур проверки: URL → Яндекс Вебмастер → статус файла → результат анализа → доказательство</div>
    <div class="robots-yandex-grid">
      <label>URL сайта<input list="projectUrlOptions" data-robots-yandex-field="siteUrl" value="${escapeAttr(fields.siteUrl || state?.project?.website || '')}" placeholder="https://site.ru" />${projectUrlDatalistHtml()}</label>
      <label>URL robots.txt<input list="projectUrlOptions" data-robots-yandex-field="robotsUrl" value="${escapeAttr(fields.robotsUrl || '')}" placeholder="https://site.ru/robots.txt" /></label>
      <label>Инструмент проверки<div class="static-tool-link"><a href="${escapeAttr(service.url)}" target="_blank" rel="noopener">${escapeHtml(service.label)}</a></div></label>
      <label>Статус файла${robotsYandexSelect('fileStatus', fields.fileStatus)}${statusChip('fileStatus', fields.fileStatus === 'found' ? 'Найден' : fields.fileStatus === 'not_found' ? 'Не найден' : 'Не выбран')}</label>
      <label>Статус анализа${robotsYandexSelect('analysisStatus', fields.analysisStatus)}${statusChip('analysisStatus', fields.analysisStatus === 'correct' ? 'Корректен' : fields.analysisStatus === 'errors' ? 'Есть ошибки' : 'Не выбран')}</label>
      <label>Важные страницы открыты${robotsYandexSelect('importantPagesOpen', fields.importantPagesOpen)}${statusChip('importantPagesOpen', fields.importantPagesOpen === 'yes' ? 'Да' : fields.importantPagesOpen === 'no' ? 'Нет' : 'Не выбран')}</label>
      <label>Служебные страницы закрыты${robotsYandexSelect('servicePagesClosed', fields.servicePagesClosed)}${statusChip('servicePagesClosed', fields.servicePagesClosed === 'yes' ? 'Да' : fields.servicePagesClosed === 'no' ? 'Нет' : 'Не выбран')}</label>
      <label>Sitemap указан в robots.txt${robotsYandexSelect('sitemapInRobots', fields.sitemapInRobots)}${statusChip('sitemapInRobots', fields.sitemapInRobots === 'yes' ? 'Да' : fields.sitemapInRobots === 'no' ? 'Нет' : 'Не выбран')}</label>
      <label class="full">Ссылка на проверку / скрин / отчёт<input data-robots-yandex-field="evidenceUrl" value="${escapeAttr(fields.evidenceUrl || '')}" placeholder="ссылка на проверку, скрин или отчёт" /></label>
      <label class="full">Комментарий, только если есть проблема<input data-robots-yandex-field="comment" value="${escapeAttr(fields.comment || '')}" placeholder="короткое уточнение" /></label>
    </div>
  </div>`;
}

const __guruPrevGate1TypedFieldsHtmlV15 = gate1TypedFieldsHtml;
gate1TypedFieldsHtml = function(card) {
  const mode = getGate1CardMode(card);
  ensureGate1TypedData(card);
  if (mode === 'robots_yandex') return `<div class="field-row"><span>Robots.txt Яндекс</span>${robotsYandexFieldsHtml(card)}</div>`;
  return __guruPrevGate1TypedFieldsHtmlV15(card);
};

function robotsYandexStatus(card) {
  const fields = ensureRobotsYandexFields(card);
  const values = ['siteUrl', 'robotsUrl', 'fileStatus', 'analysisStatus', 'importantPagesOpen', 'servicePagesClosed', 'sitemapInRobots', 'evidenceUrl'].map(key => String(fields[key] || '').trim());
  const filled = values.filter(Boolean).length;
  if (!filled && !String(fields.comment || '').trim()) return 'not_started';
  const hasProblem = fields.fileStatus === 'not_found' || fields.analysisStatus === 'errors' || fields.importantPagesOpen === 'no' || fields.servicePagesClosed === 'no' || fields.sitemapInRobots === 'no';
  if (filled === values.length && !hasProblem) return 'ready';
  return 'in_progress';
}

const __guruPrevRecalculateStatusForCardV15 = recalculateStatusForCard;
recalculateStatusForCard = function(card, workspace = state) {
  if (isRobotsYandexCard(card)) {
    card.status = robotsYandexStatus(card);
    return;
  }
  return __guruPrevRecalculateStatusForCardV15(card, workspace);
};

function updateRobotsYandexField(target) {
  const card = allCardsFromWorkspace(state).find(isRobotsYandexCard);
  if (!card) return;
  const field = target.dataset.robotsYandexField;
  const fields = ensureRobotsYandexFields(card);
  fields[field] = target.value;
  if (field === 'siteUrl' || field === 'robotsUrl') addOrUpdateProjectLink(target.value, { comment: field === 'robotsUrl' ? 'robots.txt' : 'URL сайта', source: 'Яндекс Вебмастер' });
  recalculateStatusForCard(card);
  flashSaving();
  renderGate();
}

document.addEventListener('change', event => {
  if (event.target?.dataset?.robotsYandexField) updateRobotsYandexField(event.target);
});

document.addEventListener('input', event => {
  if (event.target?.dataset?.robotsYandexField && event.target.tagName !== 'SELECT') updateRobotsYandexField(event.target);
});

(function markV15() {
  document.querySelectorAll('.launcher-kicker').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.15'); });
  document.querySelectorAll('.eyebrow').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.15'); });
})();

/* v0.16 — единый компактный блок Robots.txt: один URL, Яндекс/Google по выбору */
function isRobotsUnifiedCard(card) {
  return Boolean(isGate1Card(card) && /robots\.txt/i.test(String(card?.title || '')));
}

const ROBOTS_UNIFIED_DEFAULTS = {
  url: '',
  systems: {
    yandex: { enabled: true, status: '', evidence: '' },
    google: { enabled: false, status: '', evidence: '' }
  }
};

const ROBOTS_UNIFIED_INSTRUCTION = `Суть:
Проверить доступность и корректность robots.txt только в тех поисковых системах, где проект реально продвигается.

Логика:
Один URL robots.txt → выбор систем Яндекс / Google → статус проверки по каждой выбранной системе → доказательство.

Статус блока:
Считаются только выбранные системы. Если система отключена, она не влияет на готовность блока.`;

function cloneRobotsUnifiedDefaults() {
  return JSON.parse(JSON.stringify(ROBOTS_UNIFIED_DEFAULTS));
}

function normalizeRobotsUnifiedStatus(value = '') {
  const v = String(value || '').trim();
  if (['correct', 'found', 'ok', 'ready', 'yes', 'works', 'indexed'].includes(v)) return 'ok';
  if (['errors', 'not_found', 'bad', 'no', 'issue', 'not_working', 'not_indexed'].includes(v)) return 'issue';
  return v || '';
}

function ensureRobotsUnifiedFields(card) {
  if (!card) return cloneRobotsUnifiedDefaults();
  card.title = 'Robots.txt';
  card.instruction = ROBOTS_UNIFIED_INSTRUCTION;
  if (!card.robotsUnified) {
    const defaults = cloneRobotsUnifiedDefaults();
    const old = card.robotsYandex || {};
    if (old.siteUrl || old.robotsUrl || old.fileStatus || old.analysisStatus || old.evidenceUrl) {
      defaults.url = old.robotsUrl || old.siteUrl || '';
      defaults.systems.yandex.enabled = true;
      defaults.systems.yandex.status = normalizeRobotsUnifiedStatus(old.analysisStatus || old.fileStatus);
      defaults.systems.yandex.evidence = old.evidenceUrl || '';
    }
    card.robotsUnified = defaults;
  }
  card.robotsUnified.systems = {
    ...cloneRobotsUnifiedDefaults().systems,
    ...(card.robotsUnified.systems || {})
  };
  return card.robotsUnified;
}

const __guruPrevGetGate1CardModeV16 = getGate1CardMode;
getGate1CardMode = function(card) {
  if (isRobotsUnifiedCard(card)) return 'robots_unified';
  return __guruPrevGetGate1CardModeV16(card);
};

const __guruPrevEnsureGate1TypedDataV16 = ensureGate1TypedData;
ensureGate1TypedData = function(card) {
  if (isRobotsUnifiedCard(card)) {
    ensureRobotsUnifiedFields(card);
    return;
  }
  return __guruPrevEnsureGate1TypedDataV16(card);
};

function robotsUnifiedSystemLabel(systemKey) {
  return systemKey === 'yandex' ? 'Яндекс' : 'Google';
}

function robotsUnifiedServiceLabel(systemKey) {
  return systemKey === 'yandex' ? 'Яндекс Вебмастер' : 'Google Search Console';
}

function robotsUnifiedSelect(systemKey, value) {
  const options = [
    ['', 'Выбрать'],
    ['ok', 'Проверка пройдена'],
    ['issue', 'Есть проблема']
  ];
  return `<select data-robots-unified-system="${escapeAttr(systemKey)}" data-robots-unified-field="status">
    ${options.map(([key, label]) => `<option value="${escapeAttr(key)}" ${value === key ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
  </select>`;
}

function robotsUnifiedStatusChip(status) {
  if (!status) return '<span class="result-pill result-neutral">Не выбран</span>';
  if (status === 'ok') return '<span class="result-pill result-ok">Проверка пройдена</span>';
  return '<span class="result-pill result-bad">Есть проблема</span>';
}

function robotsUnifiedSystemCardHtml(systemKey, data) {
  return `<section class="robots-system-card ${data.status === 'ok' ? 'is-ok' : data.status === 'issue' ? 'is-issue' : ''}">
    <div class="robots-system-head">
      <div>
        <h4>${escapeHtml(robotsUnifiedSystemLabel(systemKey))}</h4>
        <span>${escapeHtml(robotsUnifiedServiceLabel(systemKey))}</span>
      </div>
      ${robotsUnifiedStatusChip(data.status)}
    </div>
    <div class="robots-system-fields">
      <label>Статус проверки${robotsUnifiedSelect(systemKey, data.status || '')}</label>
      <label>Доказательство<input data-robots-unified-system="${escapeAttr(systemKey)}" data-robots-unified-field="evidence" value="${escapeAttr(data.evidence || '')}" placeholder="ссылка на отчёт, скрин или результат проверки" /></label>
    </div>
  </section>`;
}

function robotsUnifiedFieldsHtml(card) {
  const fields = ensureRobotsUnifiedFields(card);
  const systems = fields.systems || {};
  const enabledSystems = ['yandex', 'google'].filter(key => systems[key]?.enabled);
  return `<div class="robots-unified-workspace context-panel">
    <div class="robots-unified-line">
      <label class="robots-url-field">URL robots.txt<input list="projectUrlOptions" data-robots-unified-field="url" value="${escapeAttr(fields.url || state?.project?.website || '')}" placeholder="https://site.ru/robots.txt" />${projectUrlDatalistHtml()}</label>
      <div class="robots-system-switches" aria-label="Выбор поисковых систем">
        <label><input type="checkbox" data-robots-unified-system="yandex" data-robots-unified-field="enabled" ${systems.yandex?.enabled ? 'checked' : ''} /> Яндекс</label>
        <label><input type="checkbox" data-robots-unified-system="google" data-robots-unified-field="enabled" ${systems.google?.enabled ? 'checked' : ''} /> Google</label>
      </div>
    </div>
    <div class="robots-system-grid">
      ${enabledSystems.length ? enabledSystems.map(key => robotsUnifiedSystemCardHtml(key, systems[key])).join('') : '<div class="empty compact-empty">Выберите Яндекс, Google или обе системы для проверки robots.txt.</div>'}
    </div>
  </div>`;
}

const __guruPrevGate1TypedFieldsHtmlV16 = gate1TypedFieldsHtml;
gate1TypedFieldsHtml = function(card) {
  const mode = getGate1CardMode(card);
  ensureGate1TypedData(card);
  if (mode === 'robots_unified') return `<div class="field-row"><span>Robots.txt</span>${robotsUnifiedFieldsHtml(card)}</div>`;
  return __guruPrevGate1TypedFieldsHtmlV16(card);
};

function robotsUnifiedStatus(card) {
  const fields = ensureRobotsUnifiedFields(card);
  const urlFilled = Boolean(String(fields.url || '').trim());
  const enabled = ['yandex', 'google'].filter(key => fields.systems?.[key]?.enabled);
  const anySystemTouched = ['yandex', 'google'].some(key => {
    const s = fields.systems?.[key] || {};
    return s.enabled || s.status || s.evidence;
  });
  if (!urlFilled && !anySystemTouched) return 'not_started';
  if (!urlFilled || !enabled.length) return 'in_progress';
  const allSelectedFilled = enabled.every(key => {
    const s = fields.systems[key] || {};
    return Boolean(String(s.status || '').trim()) && Boolean(String(s.evidence || '').trim());
  });
  return allSelectedFilled ? 'ready' : 'in_progress';
}

const __guruPrevRecalculateStatusForCardV16 = recalculateStatusForCard;
recalculateStatusForCard = function(card, workspace = state) {
  if (isRobotsUnifiedCard(card)) {
    card.status = robotsUnifiedStatus(card);
    return;
  }
  return __guruPrevRecalculateStatusForCardV16(card, workspace);
};

function updateRobotsUnifiedField(target) {
  const cardId = target.closest('[data-card]')?.dataset?.card;
  const card = cardId ? findCard(cardId) : allCardsFromWorkspace(state).find(isRobotsUnifiedCard);
  if (!card) return;
  const fields = ensureRobotsUnifiedFields(card);
  const systemKey = target.dataset.robotsUnifiedSystem;
  const field = target.dataset.robotsUnifiedField;
  if (systemKey) {
    fields.systems[systemKey] = fields.systems[systemKey] || { enabled: false, status: '', evidence: '' };
    fields.systems[systemKey][field] = field === 'enabled' ? target.checked : target.value;
  } else {
    fields[field] = target.value;
    if (field === 'url') addOrUpdateProjectLink(target.value, { comment: 'robots.txt', source: 'Robots.txt' });
  }
  recalculateStatusForCard(card);
  flashSaving();
  renderGate();
}

const __guruPrevTypedDataPlainV16 = typedDataPlain;
typedDataPlain = function(card) {
  if (getGate1CardMode(card) === 'robots_unified') {
    const fields = ensureRobotsUnifiedFields(card);
    const enabled = ['yandex', 'google'].filter(key => fields.systems?.[key]?.enabled);
    const lines = [`URL: ${fields.url || 'не указан'}`];
    enabled.forEach(key => {
      const s = fields.systems[key] || {};
      lines.push(`${robotsUnifiedSystemLabel(key)}: ${s.status === 'ok' ? 'проверка пройдена' : s.status === 'issue' ? 'есть проблема' : 'статус не выбран'}${s.evidence ? ` / доказательство: ${s.evidence}` : ''}`);
    });
    return lines.join('\n');
  }
  return __guruPrevTypedDataPlainV16(card);
};

document.addEventListener('change', event => {
  if (event.target?.dataset?.robotsUnifiedField) updateRobotsUnifiedField(event.target);
});

document.addEventListener('input', event => {
  if (event.target?.dataset?.robotsUnifiedField && event.target.type !== 'checkbox' && event.target.tagName !== 'SELECT') updateRobotsUnifiedField(event.target);
});

(function markV16() {
  document.querySelectorAll('.launcher-kicker').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.16'); });
  document.querySelectorAll('.eyebrow').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.16'); });
})();


/* v0.17 — Robots.txt: сетка 3 уровня, один URL, выбранные системы, автоматический статус */
STATUS_LABELS.problem = 'Проблема';

function robotsUnifiedSelect(systemKey, value) {
  const options = [
    ['', 'Не проверено'],
    ['ok', 'ОК'],
    ['issue', 'Ошибка']
  ];
  return `<select class="robots-status-select" data-robots-unified-system="${escapeAttr(systemKey)}" data-robots-unified-field="status">
    ${options.map(([key, label]) => `<option value="${escapeAttr(key)}" ${value === key ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
  </select>`;
}

function robotsUnifiedSystemCardHtml(systemKey, data) {
  const tone = data.status === 'ok' ? 'is-ok' : data.status === 'issue' ? 'is-issue' : '';
  return `<section class="robots-system-card robots-system-card-v17 ${tone}">
    <div class="robots-system-head compact-head">
      <h4>${escapeHtml(robotsUnifiedSystemLabel(systemKey))}</h4>
      <span>${escapeHtml(robotsUnifiedServiceLabel(systemKey))}</span>
    </div>
    <div class="robots-system-fields robots-system-fields-v17">
      <label>Статус проверки${robotsUnifiedSelect(systemKey, data.status || '')}</label>
      <label>Доказательство<input data-robots-unified-system="${escapeAttr(systemKey)}" data-robots-unified-field="evidence" value="${escapeAttr(data.evidence || '')}" placeholder="ссылка на отчёт, скрин или проверку" /></label>
    </div>
  </section>`;
}

function robotsUnifiedFieldsHtml(card) {
  const fields = ensureRobotsUnifiedFields(card);
  const systems = fields.systems || {};
  const enabledSystems = ['yandex', 'google'].filter(key => systems[key]?.enabled);
  return `<div class="robots-unified-workspace robots-v17 context-panel">
    <div class="robots-top-grid">
      <label class="robots-url-field">URL robots.txt<input list="projectUrlOptions" data-robots-unified-field="url" value="${escapeAttr(fields.url || '')}" placeholder="https://site.ru/robots.txt" />${projectUrlDatalistHtml()}</label>
      <div class="robots-system-switches" aria-label="Системы проверки">
        <label class="system-toggle ${systems.yandex?.enabled ? 'is-active' : ''}"><input type="checkbox" data-robots-unified-system="yandex" data-robots-unified-field="enabled" ${systems.yandex?.enabled ? 'checked' : ''} /> Яндекс</label>
        <label class="system-toggle ${systems.google?.enabled ? 'is-active' : ''}"><input type="checkbox" data-robots-unified-system="google" data-robots-unified-field="enabled" ${systems.google?.enabled ? 'checked' : ''} /> Google</label>
      </div>
    </div>
    <div class="robots-system-grid robots-system-grid-v17 ${enabledSystems.length === 1 ? 'one-card' : ''}">
      ${enabledSystems.map(key => robotsUnifiedSystemCardHtml(key, systems[key])).join('')}
    </div>
  </div>`;
}

gate1TypedFieldsHtml = function(card) {
  const mode = getGate1CardMode(card);
  ensureGate1TypedData(card);
  if (mode === 'robots_unified') return `<div class="field-row robots-field-row">${robotsUnifiedFieldsHtml(card)}</div>`;
  return __guruPrevGate1TypedFieldsHtmlV16(card);
};

function robotsUnifiedStatus(card) {
  const fields = ensureRobotsUnifiedFields(card);
  const urlFilled = Boolean(String(fields.url || '').trim());
  const enabled = ['yandex', 'google'].filter(key => fields.systems?.[key]?.enabled);
  if (!urlFilled) return 'not_started';
  if (!enabled.length) return 'in_progress';
  if (enabled.some(key => fields.systems?.[key]?.status === 'issue')) return 'problem';
  const allReady = enabled.every(key => {
    const s = fields.systems[key] || {};
    return s.status === 'ok' && Boolean(String(s.evidence || '').trim());
  });
  return allReady ? 'ready' : 'in_progress';
}

recalculateStatusForCard = function(card, workspace = state) {
  if (isRobotsUnifiedCard(card)) {
    card.status = robotsUnifiedStatus(card);
    return;
  }
  return __guruPrevRecalculateStatusForCardV16(card, workspace);
};

(function markV17() {
  document.querySelectorAll('.launcher-kicker').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.17'); });
  document.querySelectorAll('.eyebrow').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.17'); });
})();


/* v0.18 — Sitemap.xml: минимальный блок, один URL, Яндекс/Google по выбору */
function isSitemapUnifiedCard(card) {
  const title = String(card?.title || '');
  return Boolean(isGate1Card(card) && /sitemap\.xml|sitemap/i.test(title) && !/robots/i.test(title));
}

const SITEMAP_UNIFIED_DEFAULTS = {
  url: '',
  systems: {
    yandex: { enabled: true, status: '', evidence: '' },
    google: { enabled: false, status: '', evidence: '' }
  }
};

const SITEMAP_UNIFIED_INSTRUCTION = `Суть:
Проверить доступность и корректность sitemap.xml только в тех поисковых системах, где проект реально продвигается.

Логика:
Один URL sitemap.xml → выбор системы Яндекс / Google → статус проверки → доказательство.

Не входит в базовый блок:
реклама, аналитика, CRM, формы, коллтрекинг, количество страниц, Lastmod, сравнение sitemap и индекса, Sitemap в robots.txt.`;

function cloneSitemapUnifiedDefaults() {
  return JSON.parse(JSON.stringify(SITEMAP_UNIFIED_DEFAULTS));
}

function normalizeSitemapUnifiedStatus(value = '') {
  const v = String(value || '').trim();
  if (['correct', 'found', 'ok', 'ready', 'yes', 'works', 'indexed', 'placed'].includes(v)) return 'ok';
  if (['errors', 'not_found', 'bad', 'no', 'issue', 'not_working', 'not_indexed', 'not_placed'].includes(v)) return 'issue';
  return v || '';
}

function ensureSitemapUnifiedFields(card) {
  if (!card) return cloneSitemapUnifiedDefaults();
  card.title = 'Sitemap.xml';
  card.instruction = SITEMAP_UNIFIED_INSTRUCTION;
  if (!card.sitemapUnified) {
    const defaults = cloneSitemapUnifiedDefaults();
    const oldTyped = card.gate1Typed || {};
    const oldLinks = Array.isArray(oldTyped.links) ? oldTyped.links : [];
    const oldFirstUrl = oldLinks.find(row => String(row?.url || '').trim())?.url || '';
    defaults.url = oldFirstUrl || '';
    const yandexWorkspace = oldTyped.toolWorkspace?.yandex_webmaster || oldTyped.toolWorkspace?.yandex || {};
    if (yandexWorkspace.status || yandexWorkspace.result || yandexWorkspace.link) {
      defaults.systems.yandex.enabled = true;
      defaults.systems.yandex.status = normalizeSitemapUnifiedStatus(yandexWorkspace.status);
      defaults.systems.yandex.evidence = yandexWorkspace.result || yandexWorkspace.link || '';
    }
    card.sitemapUnified = defaults;
  }
  card.sitemapUnified.systems = {
    ...cloneSitemapUnifiedDefaults().systems,
    ...(card.sitemapUnified.systems || {})
  };
  return card.sitemapUnified;
}

const __guruPrevGetGate1CardModeV18 = getGate1CardMode;
getGate1CardMode = function(card) {
  if (isSitemapUnifiedCard(card)) return 'sitemap_unified';
  return __guruPrevGetGate1CardModeV18(card);
};

const __guruPrevEnsureGate1TypedDataV18 = ensureGate1TypedData;
ensureGate1TypedData = function(card) {
  if (isSitemapUnifiedCard(card)) {
    ensureSitemapUnifiedFields(card);
    return;
  }
  return __guruPrevEnsureGate1TypedDataV18(card);
};

function sitemapUnifiedSystemLabel(systemKey) {
  return systemKey === 'yandex' ? 'Яндекс' : 'Google';
}

function sitemapUnifiedServiceLabel(systemKey) {
  return systemKey === 'yandex' ? 'Яндекс Вебмастер' : 'Google Search Console';
}

function sitemapUnifiedSelect(systemKey, value) {
  const options = [
    ['', 'Не проверено'],
    ['ok', 'ОК'],
    ['issue', 'Ошибка']
  ];
  return `<select class="robots-status-select" data-sitemap-unified-system="${escapeAttr(systemKey)}" data-sitemap-unified-field="status">
    ${options.map(([key, label]) => `<option value="${escapeAttr(key)}" ${value === key ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
  </select>`;
}

function sitemapUnifiedSystemCardHtml(systemKey, data) {
  const tone = data.status === 'ok' ? 'is-ok' : data.status === 'issue' ? 'is-issue' : '';
  return `<section class="robots-system-card robots-system-card-v17 sitemap-system-card ${tone}">
    <div class="robots-system-head compact-head">
      <h4>${escapeHtml(sitemapUnifiedSystemLabel(systemKey))}</h4>
      <span>${escapeHtml(sitemapUnifiedServiceLabel(systemKey))}</span>
    </div>
    <div class="robots-system-fields robots-system-fields-v17">
      <label>Статус проверки${sitemapUnifiedSelect(systemKey, data.status || '')}</label>
      <label>Доказательство / результат<input data-sitemap-unified-system="${escapeAttr(systemKey)}" data-sitemap-unified-field="evidence" value="${escapeAttr(data.evidence || '')}" placeholder="ссылка на отчёт, скрин или короткий вывод" /></label>
    </div>
  </section>`;
}

function sitemapUnifiedFieldsHtml(card) {
  const fields = ensureSitemapUnifiedFields(card);
  const systems = fields.systems || {};
  const enabledSystems = ['yandex', 'google'].filter(key => systems[key]?.enabled);
  return `<div class="robots-unified-workspace robots-v17 sitemap-v18 context-panel">
    <div class="robots-top-grid">
      <label class="robots-url-field">URL sitemap.xml<input list="projectUrlOptions" data-sitemap-unified-field="url" value="${escapeAttr(fields.url || '')}" placeholder="https://site.ru/sitemap.xml" />${projectUrlDatalistHtml()}</label>
      <div class="robots-system-switches" aria-label="Системы проверки sitemap.xml">
        <label class="system-toggle ${systems.yandex?.enabled ? 'is-active' : ''}"><input type="checkbox" data-sitemap-unified-system="yandex" data-sitemap-unified-field="enabled" ${systems.yandex?.enabled ? 'checked' : ''} /> Яндекс</label>
        <label class="system-toggle ${systems.google?.enabled ? 'is-active' : ''}"><input type="checkbox" data-sitemap-unified-system="google" data-sitemap-unified-field="enabled" ${systems.google?.enabled ? 'checked' : ''} /> Google</label>
      </div>
    </div>
    <div class="robots-system-grid robots-system-grid-v17 ${enabledSystems.length === 1 ? 'one-card' : ''}">
      ${enabledSystems.map(key => sitemapUnifiedSystemCardHtml(key, systems[key])).join('')}
    </div>
  </div>`;
}

const __guruPrevGate1TypedFieldsHtmlV18 = gate1TypedFieldsHtml;
gate1TypedFieldsHtml = function(card) {
  const mode = getGate1CardMode(card);
  ensureGate1TypedData(card);
  if (mode === 'sitemap_unified') return `<div class="field-row robots-field-row sitemap-field-row">${sitemapUnifiedFieldsHtml(card)}</div>`;
  return __guruPrevGate1TypedFieldsHtmlV18(card);
};

function sitemapUnifiedStatus(card) {
  const fields = ensureSitemapUnifiedFields(card);
  const urlFilled = Boolean(String(fields.url || '').trim());
  const enabled = ['yandex', 'google'].filter(key => fields.systems?.[key]?.enabled);
  if (!urlFilled) return 'not_started';
  if (!enabled.length) return 'in_progress';
  if (enabled.some(key => fields.systems?.[key]?.status === 'issue')) return 'problem';
  const allReady = enabled.every(key => {
    const s = fields.systems[key] || {};
    return s.status === 'ok' && Boolean(String(s.evidence || '').trim());
  });
  return allReady ? 'ready' : 'in_progress';
}

const __guruPrevRecalculateStatusForCardV18 = recalculateStatusForCard;
recalculateStatusForCard = function(card, workspace = state) {
  if (isSitemapUnifiedCard(card)) {
    card.status = sitemapUnifiedStatus(card);
    return;
  }
  return __guruPrevRecalculateStatusForCardV18(card, workspace);
};

function updateSitemapUnifiedField(target) {
  const cardId = target.closest('[data-card]')?.dataset?.card;
  const card = cardId ? findCard(cardId) : allCardsFromWorkspace(state).find(isSitemapUnifiedCard);
  if (!card) return;
  const fields = ensureSitemapUnifiedFields(card);
  const systemKey = target.dataset.sitemapUnifiedSystem;
  const field = target.dataset.sitemapUnifiedField;
  if (systemKey) {
    fields.systems[systemKey] = fields.systems[systemKey] || { enabled: false, status: '', evidence: '' };
    fields.systems[systemKey][field] = field === 'enabled' ? target.checked : target.value;
  } else {
    fields[field] = target.value;
    if (field === 'url') addOrUpdateProjectLink(target.value, { comment: 'sitemap.xml', source: 'Sitemap.xml' });
  }
  recalculateStatusForCard(card);
  flashSaving();
  renderGate();
}

const __guruPrevTypedDataPlainV18 = typedDataPlain;
typedDataPlain = function(card) {
  if (getGate1CardMode(card) === 'sitemap_unified') {
    const fields = ensureSitemapUnifiedFields(card);
    const enabled = ['yandex', 'google'].filter(key => fields.systems?.[key]?.enabled);
    const lines = [`URL sitemap.xml: ${fields.url || 'не указан'}`];
    enabled.forEach(key => {
      const s = fields.systems[key] || {};
      lines.push(`${sitemapUnifiedSystemLabel(key)}: ${s.status === 'ok' ? 'ОК' : s.status === 'issue' ? 'ошибка' : 'не проверено'}${s.evidence ? ` / доказательство: ${s.evidence}` : ''}`);
    });
    return lines.join('\n');
  }
  return __guruPrevTypedDataPlainV18(card);
};

document.addEventListener('change', event => {
  if (event.target?.dataset?.sitemapUnifiedField) updateSitemapUnifiedField(event.target);
});

document.addEventListener('input', event => {
  if (event.target?.dataset?.sitemapUnifiedField && event.target.type !== 'checkbox' && event.target.tagName !== 'SELECT') updateSitemapUnifiedField(event.target);
});

(function markV18() {
  document.querySelectorAll('.launcher-kicker').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.18'); });
  document.querySelectorAll('.eyebrow').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.18'); });
})();


/* v0.19 — Редиректы / Проверка ответа сервера: один URL, ответ сервера, доказательство */
STATUS_LABELS.problem = 'Проблема';
STATUS_LABELS.needs_attention = 'Требует внимания';

function isServerResponseCard(card) {
  const title = String(card?.title || '').toLowerCase();
  return Boolean(isGate1Card(card) && (/редирект/.test(title) || /ответ\s+сервера/.test(title) || /проверка\s+ответа/.test(title)));
}

const SERVER_RESPONSE_INSTRUCTION = `Суть:
Проверить технический ответ конкретного URL: код ответа, финальный URL и корректность цепочки переходов.

Логика:
URL → ответ сервера → доказательство → автоматический статус.

Не входит в базовый блок:
Яндекс / Google карточки, реклама, аналитика, CRM, формы, коллтрекинг, массовая проверка всех URL, время ответа, индексация, canonical.`;

function cloneServerResponseDefaults() {
  return { url: '', response: '', result: '' };
}

function normalizeServerResponseValue(value = '') {
  const v = String(value || '').trim().toLowerCase();
  if (['ok', '200', '301', 'works', 'ready', 'correct'].includes(v)) return 'ok';
  if (['attention', 'warning', '302', 'long_chain', 'mixed', 'needs_attention', 'needs_review'].includes(v)) return 'attention';
  if (['error', 'issue', '404', '403', '500', 'cycle', 'bad', 'not_working'].includes(v)) return 'error';
  return value || '';
}

function ensureServerResponseFields(card) {
  if (!card) return cloneServerResponseDefaults();
  card.title = 'Редиректы / Проверка ответа сервера';
  card.instruction = SERVER_RESPONSE_INSTRUCTION;
  if (!card.serverResponse) {
    const defaults = cloneServerResponseDefaults();
    const oldTyped = card.gate1Typed || {};
    const oldLinks = Array.isArray(oldTyped.links) ? oldTyped.links : [];
    const oldFirstUrl = oldLinks.find(row => String(row?.url || '').trim()) || {};
    defaults.url = oldFirstUrl.url || '';
    defaults.response = normalizeServerResponseValue(oldFirstUrl.status || oldTyped.status || '');
    defaults.result = oldFirstUrl.comment || oldTyped.result || '';
    card.serverResponse = defaults;
  }
  card.serverResponse.response = normalizeServerResponseValue(card.serverResponse.response || '');
  return card.serverResponse;
}

const __guruPrevGetGate1CardModeV19 = getGate1CardMode;
getGate1CardMode = function(card) {
  if (isServerResponseCard(card)) return 'server_response';
  return __guruPrevGetGate1CardModeV19(card);
};

const __guruPrevEnsureGate1TypedDataV19 = ensureGate1TypedData;
ensureGate1TypedData = function(card) {
  if (isServerResponseCard(card)) {
    ensureServerResponseFields(card);
    return;
  }
  return __guruPrevEnsureGate1TypedDataV19(card);
};

function serverResponseSelect(value) {
  const options = [
    ['', 'Выбрать'],
    ['ok', 'ОК'],
    ['attention', 'Требует внимания'],
    ['error', 'Ошибка']
  ];
  return `<select class="server-response-select" data-server-response-field="response">
    ${options.map(([key, label]) => `<option value="${escapeAttr(key)}" ${value === key ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
  </select>`;
}

function serverResponseFieldsHtml(card) {
  const fields = ensureServerResponseFields(card);
  const tone = fields.response === 'ok' ? 'is-ok' : fields.response === 'attention' ? 'is-attention' : fields.response === 'error' ? 'is-issue' : '';
  return `<div class="server-response-workspace context-panel ${tone}">
    <div class="server-response-grid">
      <label>Проверяемый URL<input list="projectUrlOptions" data-server-response-field="url" value="${escapeAttr(fields.url || '')}" placeholder="https://site.ru/page" />${projectUrlDatalistHtml()}</label>
      <label>Ответ сервера${serverResponseSelect(fields.response || '')}</label>
      <label class="server-result-field">Результат проверки<input data-server-response-field="result" value="${escapeAttr(fields.result || '')}" placeholder="код ответа, финальный URL, ссылка на скрин или отчёт" /></label>
    </div>
  </div>`;
}

const __guruPrevGate1TypedFieldsHtmlV19 = gate1TypedFieldsHtml;
gate1TypedFieldsHtml = function(card) {
  const mode = getGate1CardMode(card);
  ensureGate1TypedData(card);
  if (mode === 'server_response') return `<div class="field-row server-response-field-row">${serverResponseFieldsHtml(card)}</div>`;
  return __guruPrevGate1TypedFieldsHtmlV19(card);
};

function serverResponseStatus(card) {
  const fields = ensureServerResponseFields(card);
  const urlFilled = Boolean(String(fields.url || '').trim());
  const resultFilled = Boolean(String(fields.result || '').trim());
  if (!urlFilled) return 'not_started';
  if (fields.response === 'error') return 'problem';
  if (fields.response === 'attention') return 'needs_attention';
  if (fields.response === 'ok' && resultFilled) return 'ready';
  return 'in_progress';
}

const __guruPrevRecalculateStatusForCardV19 = recalculateStatusForCard;
recalculateStatusForCard = function(card, workspace = state) {
  if (isServerResponseCard(card)) {
    card.status = serverResponseStatus(card);
    return;
  }
  return __guruPrevRecalculateStatusForCardV19(card, workspace);
};

function updateServerResponseField(target) {
  const cardId = target.closest('[data-card]')?.dataset?.card;
  const card = cardId ? findCard(cardId) : allCardsFromWorkspace(state).find(isServerResponseCard);
  if (!card) return;
  const fields = ensureServerResponseFields(card);
  const field = target.dataset.serverResponseField;
  fields[field] = target.value;
  if (field === 'url') addOrUpdateProjectLink(target.value, { comment: 'проверка ответа сервера', source: 'Редиректы' });
  recalculateStatusForCard(card);
  flashSaving();
  renderGate();
}

const __guruPrevTypedDataPlainV19 = typedDataPlain;
typedDataPlain = function(card) {
  if (getGate1CardMode(card) === 'server_response') {
    const fields = ensureServerResponseFields(card);
    const statusLabel = fields.response === 'ok' ? 'ОК' : fields.response === 'attention' ? 'требует внимания' : fields.response === 'error' ? 'ошибка' : 'не выбран';
    return [`URL: ${fields.url || 'не указан'}`, `Ответ сервера: ${statusLabel}`, `Результат: ${fields.result || 'не указан'}`].join('\n');
  }
  return __guruPrevTypedDataPlainV19(card);
};

const __guruPrevGate1WorkBlockHtmlV19 = gate1WorkBlockHtml;
gate1WorkBlockHtml = function(card, sectionTitle = 'Аналитика') {
  if (!isServerResponseCard(card)) return __guruPrevGate1WorkBlockHtmlV19(card, sectionTitle);
  const accState = getGate1AccordionState();
  const isOpen = Boolean(accState.cards[card.id]);
  return `<article class="work-accordion-card ${isOpen ? 'is-open is-active' : ''}" data-card="${escapeAttr(card.id)}">
    <button class="work-card-header" data-gate1-toggle-card="${escapeAttr(card.id)}">
      <span class="work-card-main">
        <span class="analytics-path">Gate 1 → ${escapeHtml(sectionTitle)} → ${escapeHtml(card.title)}</span>
        <span class="work-card-title">${escapeHtml(card.title)}</span>
        <span class="work-card-preview">${escapeHtml(cardPreviewText(card))}</span>
      </span>
      <span class="status-pill status-${card.status}">${STATUS_LABELS[card.status] || card.status}</span>
      <span class="work-card-toggle">${isOpen ? 'Свернуть' : 'Раскрыть'}</span>
    </button>
    ${isOpen ? `<div class="work-card-body server-response-body">
      ${instructionToggleHtml(card)}
      <div class="card-fields">${cardUserFieldsHtml(card)}</div>
    </div>` : ''}
  </article>`;
};

document.addEventListener('change', event => {
  if (event.target?.dataset?.serverResponseField) updateServerResponseField(event.target);
});

document.addEventListener('input', event => {
  if (event.target?.dataset?.serverResponseField && event.target.tagName !== 'SELECT') updateServerResponseField(event.target);
});

(function markV19() {
  document.querySelectorAll('.launcher-kicker').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.19'); });
  document.querySelectorAll('.eyebrow').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.19'); });
})();

/* v0.20 — Audit site: page-centric SEO/CWV/images, site-level checks remain compact */
STATUS_LABELS.problem = 'Проблема';
STATUS_LABELS.needs_attention = 'Требует внимания';

const V20_AUDIT_SUMMARY_TITLES = [
  'Meta Robots SEO META in 1 CLICK',
  'CWV PageSpeed Insights',
  'Изображения SEO META in 1 CLICK'
];

function isPageAuditSummaryCard(card) {
  const title = normalizeGateTitle(card?.title || '');
  return V20_AUDIT_SUMMARY_TITLES.some(item => title === normalizeGateTitle(item));
}

function auditSummaryType(card) {
  const title = normalizeGateTitle(card?.title || '');
  if (title === normalizeGateTitle('Meta Robots SEO META in 1 CLICK')) return 'metaRobotsStatus';
  if (title === normalizeGateTitle('CWV PageSpeed Insights')) return 'cwvStatus';
  if (title === normalizeGateTitle('Изображения SEO META in 1 CLICK')) return 'imagesStatus';
  return '';
}

function auditSummaryLabel(type) {
  if (type === 'metaRobotsStatus') return 'Meta Robots';
  if (type === 'cwvStatus') return 'CWV';
  if (type === 'imagesStatus') return 'Изображения';
  return 'Проверка';
}

function v20EnsurePageAuditFields(row) {
  row.contextFields = row.contextFields || {};
  row.metaRobotsStatus = row.metaRobotsStatus || '';
  row.cwvStatus = row.cwvStatus || '';
  row.imagesStatus = row.imagesStatus || '';
  row.auditEvidence = row.auditEvidence || '';
  return row;
}

const __guruPrevNormalizePageStructureRowV20 = normalizePageStructureRow;
normalizePageStructureRow = function(row, card) {
  const normalized = __guruPrevNormalizePageStructureRowV20(row, card);
  return v20EnsurePageAuditFields(normalized);
};

const __guruPrevEnsureGate1TypedDataV20 = ensureGate1TypedData;
ensureGate1TypedData = function(card) {
  if (isPageAuditSummaryCard(card)) return;
  __guruPrevEnsureGate1TypedDataV20(card);
  if (getGate1CardMode(card) === 'page_structure') {
    (card.pageRows || []).forEach(v20EnsurePageAuditFields);
  }
};

const __guruPrevGetGate1CardModeV20 = getGate1CardMode;
getGate1CardMode = function(card) {
  if (isPageAuditSummaryCard(card)) return 'page_audit_summary';
  return __guruPrevGetGate1CardModeV20(card);
};

function auditStatusOptions(value, type) {
  let options = [['', 'Не проверено']];
  if (type === 'meta') {
    options = options.concat([
      ['ok', 'Индексация разрешена'],
      ['closed', 'Закрыта от индексации'],
      ['error', 'Ошибка']
    ]);
  } else if (type === 'cwv') {
    options = options.concat([
      ['ok', 'ОК'],
      ['improve', 'Требует улучшения'],
      ['error', 'Проблема']
    ]);
  } else {
    options = options.concat([
      ['ok', 'ОК'],
      ['improve', 'Требует улучшения'],
      ['error', 'Критичные ошибки']
    ]);
  }
  return `<option value="" ${!value ? 'selected' : ''}>${options[0][1]}</option>${options.slice(1).map(([key, label]) => `<option value="${escapeAttr(key)}" ${value === key ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}`;
}

function auditStatusChip(value) {
  const label = value === 'ok' ? 'ОК' : value === 'improve' ? 'Требует улучшения' : value === 'closed' ? 'Закрыта' : value === 'error' ? 'Проблема' : 'Не проверено';
  const cls = value === 'ok' ? 'ready' : value === 'improve' || value === 'closed' ? 'needs_attention' : value === 'error' ? 'problem' : 'not_started';
  return `<span class="status-pill status-${cls}">${escapeHtml(label)}</span>`;
}

const __guruPrevPageStructureStatusV20 = pageStructureStatus;
pageStructureStatus = function(row) {
  v20EnsurePageAuditFields(row);
  const url = String(row.url || '').trim();
  if (!url) return 'not_started';
  if ([row.metaRobotsStatus, row.cwvStatus, row.imagesStatus].includes('error')) return 'problem';
  if ([row.cwvStatus, row.imagesStatus, row.metaRobotsStatus].includes('improve') || row.metaRobotsStatus === 'closed') return 'needs_attention';
  const checks = [
    Boolean(url),
    evaluateLength(row.h1, 10, 90).ok,
    evaluateLength(row.title, 20, 90).ok,
    evaluateLength(row.description, 50, 200).ok,
    row.metaRobotsStatus === 'ok',
    row.cwvStatus === 'ok',
    row.imagesStatus === 'ok',
    Boolean(String(row.auditEvidence || '').trim()),
    row.ctaMode === 'not_needed' ? true : Boolean(String(row.finalCta || '').trim())
  ];
  const filled = checks.filter(Boolean).length;
  if (filled === checks.length) return 'ready';
  return 'in_progress';
};

const __guruPrevPageContextDefinitionsV20 = pageContextDefinitions;
pageContextDefinitions = function(context) {
  const defs = __guruPrevPageContextDefinitionsV20(context);
  return defs.filter(def => !['seoIssues'].includes(def.key));
};

function pageAuditControlsHtml(card, row, pageIndex) {
  v20EnsurePageAuditFields(row);
  return `<details class="page-context-group page-audit-group" open>
    <summary>SEO, скорость, изображения и доказательство</summary>
    <div class="page-audit-grid">
      <label>Meta Robots<select data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="metaRobotsStatus">${auditStatusOptions(row.metaRobotsStatus, 'meta')}</select></label>
      <label>CWV<select data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="cwvStatus">${auditStatusOptions(row.cwvStatus, 'cwv')}</select></label>
      <label>Изображения<select data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="imagesStatus">${auditStatusOptions(row.imagesStatus, 'images')}</select></label>
      <label class="full">Доказательство<input data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="auditEvidence" value="${escapeAttr(row.auditEvidence || '')}" placeholder="ссылка на отчёт или скрин" /></label>
    </div>
  </details>`;
}

pageStructureCardHtml = function(card, row, pageIndex, repeatable) {
  const context = pageTemplateContext(card);
  const defs = ensurePageContextFields(row, context);
  v20EnsurePageAuditFields(row);
  const snippet = snippetForPage(row);
  const grouped = defs.reduce((acc, def) => { (acc[def.group] = acc[def.group] || []).push(def); return acc; }, {});
  const pageStatus = pageStructureStatus(row);
  return `<section class="page-structure-card v20-page-card" data-page-source-card="${escapeAttr(card.id)}">
    <div class="page-structure-head">
      <input class="page-name-input" data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="name" value="${escapeAttr(row.name || '')}" placeholder="Название страницы" ${row.fixed ? 'readonly' : ''} />
      <span class="status-pill status-${pageStatus}">${STATUS_LABELS[pageStatus] || pageStatus}</span>
      ${repeatable ? `<button class="small-btn danger-mini" data-remove-gate1-page="${escapeAttr(card.id)}" data-index="${pageIndex}" ${rowsSafeLength(card.pageRows) <= 1 ? 'disabled' : ''}>×</button>` : ''}
    </div>
    <div class="page-grid compact-page-grid">
      <label>URL<input list="projectUrlOptions" data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="url" value="${escapeAttr(row.url || '')}" placeholder="https://" />${projectUrlDatalistHtml()}</label>
      <label>H1 <small>10–90 знаков</small><input data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="h1" value="${escapeAttr(row.h1 || '')}" />${pageFieldStatusHtml(row.h1, 10, 90)}</label>
      <label>Title <small>20–90 знаков</small><input data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="title" value="${escapeAttr(row.title || '')}" />${pageFieldStatusHtml(row.title, 20, 90)}</label>
      <label class="full">Description <small>50–200 знаков</small><textarea data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="description" rows="2">${escapeHtml(row.description || '')}</textarea>${pageFieldStatusHtml(row.description, 50, 200)}</label>
    </div>
    <div class="page-context-groups">
      ${Object.entries(grouped).map(([group, items]) => `<details class="page-context-group" open>
        <summary>${escapeHtml(group)}</summary>
        <div class="page-context-grid">${items.map(def => pageContextFieldHtml(card, pageIndex, row, def)).join('')}</div>
      </details>`).join('')}
      <details class="page-context-group" open>
        <summary>Snippet</summary>
        <div class="snippet-preview">${snippet ? escapeHtml(snippet) : 'Соберётся из H1, Title, Description, смысла и оффера страницы.'}</div>
      </details>
      <details class="page-context-group" open>
        <summary>Финальный CTA</summary>
        <div class="page-context-grid">
          <label>Нужен ли CTA<select data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="ctaMode">
            <option value="needed" ${row.ctaMode !== 'not_needed' ? 'selected' : ''}>Нужен</option>
            <option value="not_needed" ${row.ctaMode === 'not_needed' ? 'selected' : ''}>Не нужен</option>
          </select></label>
          ${row.ctaMode === 'not_needed' ? '' : `<label class="full">Текст CTA<textarea data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="finalCta" rows="2">${escapeHtml(row.finalCta || '')}</textarea></label>`}
        </div>
      </details>
      ${pageAuditControlsHtml(card, row, pageIndex)}
    </div>
  </section>`;
};

function allAuditPageCards() {
  const gate = state?.gates?.find(isGate1Analytics);
  if (!gate) return [];
  return gate.cards.filter(card => getGate1CardMode(card) === 'page_structure');
}

function auditSummaryRows(type) {
  return allAuditPageCards().flatMap(card => {
    ensureGate1TypedData(card);
    return (card.pageRows || []).map((row, index) => {
      v20EnsurePageAuditFields(row);
      return { card, row, index, value: row[type] || '' };
    });
  });
}

function auditSummaryCardStatus(card) {
  const type = auditSummaryType(card);
  const rows = auditSummaryRows(type).filter(item => String(item.row.url || '').trim());
  if (!rows.length) return 'not_started';
  if (rows.some(item => item.value === 'error')) return 'problem';
  if (rows.some(item => item.value === 'improve' || item.value === 'closed')) return 'needs_attention';
  if (rows.every(item => item.value === 'ok')) return 'ready';
  return 'in_progress';
}

function auditSummaryHtml(card) {
  const type = auditSummaryType(card);
  const rows = auditSummaryRows(type);
  const label = auditSummaryLabel(type);
  if (!rows.length) return '<div class="empty compact-empty">Страницы ещё не заведены.</div>';
  return `<div class="audit-summary-block">
    <div class="summary-note">Сводка по страницам. Ручное заполнение выполняется внутри карточки конкретной страницы.</div>
    <table class="mini-table typed-table audit-summary-table">
      <thead><tr><th>Страница</th><th>URL</th><th>${escapeHtml(label)}</th><th>Переход</th></tr></thead>
      <tbody>${rows.map(item => `<tr>
        <td>${escapeHtml(item.row.name || item.card.title)}</td>
        <td>${item.row.url ? escapeHtml(item.row.url) : '<span class="muted">URL не указан</span>'}</td>
        <td>${auditStatusChip(item.value)}</td>
        <td><button class="small-btn" data-open-audit-page="${escapeAttr(item.card.id)}">Открыть страницу</button></td>
      </tr>`).join('')}</tbody>
    </table>
  </div>`;
}

const __guruPrevGate1TypedFieldsHtmlV20 = gate1TypedFieldsHtml;
gate1TypedFieldsHtml = function(card) {
  const mode = getGate1CardMode(card);
  if (mode === 'page_audit_summary') return `<div class="field-row audit-summary-row">${auditSummaryHtml(card)}</div>`;
  return __guruPrevGate1TypedFieldsHtmlV20(card);
};

const __guruPrevRecalculateStatusForCardV20 = recalculateStatusForCard;
recalculateStatusForCard = function(card, workspace = state) {
  if (isPageAuditSummaryCard(card)) {
    card.status = auditSummaryCardStatus(card);
    return;
  }
  if (getGate1CardMode(card) === 'page_structure') {
    ensureGate1TypedData(card);
    const statuses = (card.pageRows || []).map(pageStructureStatus);
    if (statuses.some(status => status === 'problem')) card.status = 'problem';
    else if (statuses.some(status => status === 'needs_attention')) card.status = 'needs_attention';
    else if (statuses.every(status => status === 'not_started')) card.status = 'not_started';
    else if (statuses.every(status => status === 'ready')) card.status = 'ready';
    else card.status = 'in_progress';
    return;
  }
  return __guruPrevRecalculateStatusForCardV20(card, workspace);
};

const __guruPrevTypedDataPlainV20 = typedDataPlain;
typedDataPlain = function(card) {
  if (getGate1CardMode(card) === 'page_audit_summary') {
    const type = auditSummaryType(card);
    return auditSummaryRows(type).map(item => `${item.row.name || item.card.title}: ${auditStatusChipText(item.value)}`).join('\n');
  }
  if (getGate1CardMode(card) === 'page_structure') {
    ensureGate1TypedData(card);
    return (card.pageRows || []).map(row => `${row.name}: ${row.url || 'URL не указан'}\nH1: ${row.h1 || ''}\nTitle: ${row.title || ''}\nDescription: ${row.description || ''}\nSnippet: ${snippetForPage(row)}\nФинальный CTA: ${row.ctaMode === 'not_needed' ? 'не нужен' : (row.finalCta || 'не заполнен')}\nMeta Robots: ${auditChipText(row.metaRobotsStatus, 'meta')}\nCWV: ${auditChipText(row.cwvStatus, 'cwv')}\nИзображения: ${auditChipText(row.imagesStatus, 'images')}\nДоказательство: ${row.auditEvidence || ''}`).join('\n\n');
  }
  return __guruPrevTypedDataPlainV20(card);
};

function auditChipText(value, type) {
  if (!value) return 'не проверено';
  if (value === 'ok') return 'ОК';
  if (value === 'improve') return 'требует улучшения';
  if (value === 'closed') return 'закрыта от индексации';
  if (value === 'error') return 'проблема';
  return value;
}
function auditSummaryChipText(value) { return auditChipText(value); }
function auditStatusChipText(value) { return auditChipText(value); }

const __guruPrevUpdateGate1PageRowV20 = updateGate1PageRow;
updateGate1PageRow = function(e) {
  __guruPrevUpdateGate1PageRowV20(e);
  const field = e.target.dataset.gate1PageField;
  if (['metaRobotsStatus','cwvStatus','imagesStatus','auditEvidence'].includes(field)) renderGate();
};

function openAuditPageCard(cardId) {
  activeView = 'gate';
  activeGateId = 'gate-1';
  const acc = getGate1AccordionState();
  acc.subblocks.site_audit = true;
  acc.cards[cardId] = true;
  saveState();
  render();
  setTimeout(() => {
    const node = document.querySelector(`[data-card="${CSS.escape(cardId)}"]`);
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 50);
}

document.addEventListener('click', event => {
  const btn = event.target.closest('[data-open-audit-page]');
  if (!btn) return;
  event.preventDefault();
  event.stopPropagation();
  openAuditPageCard(btn.dataset.openAuditPage);
});

(function markV20() {
  document.querySelectorAll('.launcher-kicker').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.20'); });
  document.querySelectorAll('.eyebrow').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.20'); });
})();

/* v0.21 — Page cards as GURU route: ориентир → действие → стандарт → доказательство → статус */
function pageRouteOrientir(card, row) {
  const context = pageTemplateContext(card);
  const name = String(row?.name || card?.title || '').trim();
  if (context === 'home' || normalizeGateTitle(name) === normalizeGateTitle('Главная')) {
    return 'Коммерческая точка входа. За 3 секунды объясняет, кто вы, для кого и почему вам можно доверять.';
  }
  if (context === 'contacts') return 'Точка доверия и связи. Помогает быстро понять, как связаться, где вы находитесь и какие действия доступны.';
  if (context === 'catalog') return 'Навигационная страница выбора. Помогает быстро перейти к нужной категории, товару или услуге.';
  if (context === 'product') return 'Страница решения о покупке. Показывает ценность, условия, доказательства и действие.';
  if (context === 'service') return 'Страница услуги. Объясняет проблему, решение, результат, процесс и следующий шаг.';
  if (context === 'landing') return 'Посадочная страница. Ведёт пользователя от боли и оффера к конкретному действию.';
  return 'Рабочая страница сайта. Фиксирует содержание, SEO-основу, техническое состояние и конверсионное действие.';
}

function rowInputField(card, pageIndex, row, field, label, standard, type = 'input', extra = '') {
  const value = row[field] || '';
  const attr = `data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="${escapeAttr(field)}"`;
  const check = field === 'h1' ? pageFieldStatusHtml(value, 10, 90) : field === 'title' ? pageFieldStatusHtml(value, 20, 90) : field === 'description' ? pageFieldStatusHtml(value, 50, 200) : '';
  if (type === 'textarea') {
    return `<label class="route-field ${extra}"><span>${escapeHtml(label)}</span><small>${escapeHtml(standard || '')}</small><textarea ${attr} rows="2">${escapeHtml(value)}</textarea>${check}</label>`;
  }
  return `<label class="route-field ${extra}"><span>${escapeHtml(label)}</span><small>${escapeHtml(standard || '')}</small><input ${attr} value="${escapeAttr(value)}" />${check}</label>`;
}

function contextInputField(card, pageIndex, row, key, label, standard, type = 'input', extra = '') {
  row.contextFields = row.contextFields || {};
  const value = row.contextFields[key] || '';
  const attr = `data-page-context-card-id="${escapeAttr(card.id)}" data-page-context-index="${pageIndex}" data-page-context-key="${escapeAttr(key)}"`;
  if (type === 'textarea') {
    return `<label class="route-field ${extra}"><span>${escapeHtml(label)}</span><small>${escapeHtml(standard || '')}</small><textarea ${attr} rows="2">${escapeHtml(value)}</textarea></label>`;
  }
  return `<label class="route-field ${extra}"><span>${escapeHtml(label)}</span><small>${escapeHtml(standard || '')}</small><input ${attr} value="${escapeAttr(value)}" /></label>`;
}

function routeSection(title, body, open = false) {
  return `<details class="route-section" ${open ? 'open' : ''}>
    <summary><span>${escapeHtml(title)}</span><strong>Открыть</strong></summary>
    <div class="route-section-body">${body}</div>
  </details>`;
}

function homeRouteSectionsHtml(card, row, pageIndex) {
  const sections = [];
  sections.push(routeSection('1. Hero-экран', `<div class="route-section-grid">
    ${rowInputField(card, pageIndex, row, 'h1', 'H1', '10–90 знаков. Кто вы, для кого и в чём ценность.')}
    ${contextInputField(card, pageIndex, row, 'heroUsp', 'УТП', '1 ясное обещание без абстракций.', 'textarea')}
    ${contextInputField(card, pageIndex, row, 'heroVisual', 'Визуал', 'Что должно быть видно на первом экране.')}
    ${contextInputField(card, pageIndex, row, 'heroProof', 'Соцдоказательство', 'Факт доверия: рейтинг, отзыв, кейс, цифра.')}
    ${contextInputField(card, pageIndex, row, 'heroMiniBlocks', 'Мини-блок: доставка / сроки / гарантия / оплата', 'Коротко, по пунктам.', 'textarea', 'full')}
    ${contextInputField(card, pageIndex, row, 'primaryButton', 'Основная кнопка', 'Главное действие пользователя.')}
    ${contextInputField(card, pageIndex, row, 'secondaryButton', 'Альтернативная кнопка', 'Мягкое действие, если пользователь не готов.')}
  </div>`, true));

  sections.push(routeSection('2. Навигация по сегментам', `<div class="route-section-grid">
    ${contextInputField(card, pageIndex, row, 'segmentTitle', 'Заголовок', 'Объясняет, как выбрать нужное направление.')}
    ${contextInputField(card, pageIndex, row, 'segmentCards', '3–6 карточек сегментов', 'В каждой карточке: фото + название + ссылка.', 'textarea', 'full')}
  </div>`));

  sections.push(routeSection('3. О компании', `<div class="route-section-grid">
    ${contextInputField(card, pageIndex, row, 'aboutTitle', 'Заголовок', 'Не общий лозунг, а смысл доверия.')}
    ${contextInputField(card, pageIndex, row, 'aboutFacts', '3 факта', 'Цифры, опыт, масштаб, специализация.', 'textarea')}
    ${contextInputField(card, pageIndex, row, 'aboutText', 'Короткий текст', 'Подход компании в 2–4 предложениях.', 'textarea')}
    ${contextInputField(card, pageIndex, row, 'trustBadges', 'Доказательства', 'Сертификаты / награды / знаки доверия.', 'textarea')}
  </div>`));

  sections.push(routeSection('4. Кейсы', `<div class="route-section-grid">
    ${contextInputField(card, pageIndex, row, 'cases', '3–4 сильных кейса', 'Название + категория + результат.', 'textarea', 'full')}
    ${contextInputField(card, pageIndex, row, 'portfolioButton', 'CTA на портфолио', 'Кнопка к подробным кейсам.')}
  </div>`));

  sections.push(routeSection('5. Процесс работы', `<div class="route-section-grid">
    ${contextInputField(card, pageIndex, row, 'processTitle', 'Заголовок', 'Показывает понятный порядок работы.')}
    ${contextInputField(card, pageIndex, row, 'processSteps', '3–5 шагов', 'Название шага + что происходит + срок.', 'textarea', 'full')}
    ${contextInputField(card, pageIndex, row, 'processButton', 'CTA под схемой', 'Следующий шаг после процесса.')}
  </div>`));

  sections.push(routeSection('6. Выгоды', `<div class="route-section-grid">
    ${contextInputField(card, pageIndex, row, 'benefits', '3 конкретные выгоды', 'Не свойства, а польза для клиента.', 'textarea', 'full')}
  </div>`));

  sections.push(routeSection('7. Отзывы', `<div class="route-section-grid">
    ${contextInputField(card, pageIndex, row, 'reviews', 'Отзывы', 'Виджет Яндекс / Google или 3 ручные цитаты.', 'textarea', 'full')}
    ${contextInputField(card, pageIndex, row, 'reviewsButton', 'CTA читать все отзывы', 'Ссылка или текст кнопки.')}
  </div>`));

  sections.push(routeSection('8. Финальный CTA', finalCtaRouteHtml(card, row, pageIndex)));
  sections.push(routeSection('SEO-сниппет', snippetRouteHtml(card, row, pageIndex)));
  sections.push(routeSection('Технический контроль', pageAuditControlsCompactHtml(card, row, pageIndex)));
  return sections.join('');
}

function genericRouteSectionsHtml(card, row, pageIndex) {
  const context = pageTemplateContext(card);
  const defs = ensurePageContextFields(row, context);
  const grouped = defs.reduce((acc, def) => { (acc[def.group] = acc[def.group] || []).push(def); return acc; }, {});
  const sections = Object.entries(grouped).map(([group, items], idx) => routeSection(group, `<div class="route-section-grid">${items.map(def => contextInputField(card, pageIndex, row, def.key, def.label, routeStandardForDef(def), def.type, def.type === 'textarea' ? 'full' : '')).join('')}</div>`, idx === 0));
  sections.push(routeSection('SEO-сниппет', snippetRouteHtml(card, row, pageIndex)));
  sections.push(routeSection('Финальный CTA', finalCtaRouteHtml(card, row, pageIndex)));
  sections.push(routeSection('Технический контроль', pageAuditControlsCompactHtml(card, row, pageIndex)));
  return sections.join('');
}

function routeStandardForDef(def) {
  if (/смысл|текст|проблем|оффер|доказ|кейс|шаг|карточ/i.test(def.label)) return 'Коротко, проверяемо, без общего текста.';
  if (/cta|кноп/i.test(def.label)) return 'Конкретное действие пользователя.';
  if (/ссылка|адрес|карта/i.test(def.label)) return 'URL или точное значение.';
  return 'Заполнить только то, что нужно для этой страницы.';
}

function snippetRouteHtml(card, row, pageIndex) {
  const snippet = snippetForPage(row);
  return `<div class="route-section-grid">
    ${rowInputField(card, pageIndex, row, 'title', 'Title', '20–90 знаков. SEO-заголовок страницы.')}
    ${rowInputField(card, pageIndex, row, 'description', 'Description', '50–200 знаков. SEO-описание страницы.', 'textarea', 'full')}
    <div class="snippet-preview route-snippet full"><strong>Snippet</strong><span>${snippet ? escapeHtml(snippet) : 'Соберётся из H1, Title, Description, смысла страницы и оффера.'}</span></div>
  </div>`;
}

function finalCtaRouteHtml(card, row, pageIndex) {
  return `<div class="route-section-grid">
    <label class="route-field"><span>Нужен ли финальный CTA</span><small>Если CTA не нужен, он не влияет на готовность страницы.</small><select data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="ctaMode">
      <option value="needed" ${row.ctaMode !== 'not_needed' ? 'selected' : ''}>Нужен</option>
      <option value="not_needed" ${row.ctaMode === 'not_needed' ? 'selected' : ''}>Не нужен</option>
    </select></label>
    ${row.ctaMode === 'not_needed' ? '' : rowInputField(card, pageIndex, row, 'finalCta', 'Текст финального CTA', 'Заголовок + основная кнопка + альтернативное действие.', 'textarea', 'full')}
  </div>`;
}

function pageAuditControlsCompactHtml(card, row, pageIndex) {
  v20EnsurePageAuditFields(row);
  return `<div class="route-tech-grid">
    <label><span>Meta Robots</span><select data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="metaRobotsStatus">${auditStatusOptions(row.metaRobotsStatus, 'meta')}</select></label>
    <label><span>CWV</span><select data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="cwvStatus">${auditStatusOptions(row.cwvStatus, 'cwv')}</select></label>
    <label><span>Изображения</span><select data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="imagesStatus">${auditStatusOptions(row.imagesStatus, 'images')}</select></label>
    <label><span>Доказательство</span><input data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="auditEvidence" value="${escapeAttr(row.auditEvidence || '')}" placeholder="ссылка на отчёт / скрин" /></label>
  </div>`;
}

pageStructureCardHtml = function(card, row, pageIndex, repeatable) {
  const context = pageTemplateContext(card);
  v20EnsurePageAuditFields(row);
  row.contextFields = row.contextFields || {};
  const pageStatus = pageStructureStatus(row);
  const nameValue = row.name || card.title || 'Страница';
  const routeHtml = context === 'home' ? homeRouteSectionsHtml(card, row, pageIndex) : genericRouteSectionsHtml(card, row, pageIndex);
  return `<section class="page-structure-card guru-route-card v21-page-card" data-page-source-card="${escapeAttr(card.id)}">
    <div class="route-card-head">
      <div>
        <div class="route-kicker">Ориентир → действие → стандарт → доказательство → статус</div>
        <input class="page-name-input route-page-name" data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="name" value="${escapeAttr(nameValue)}" placeholder="Название страницы" ${row.fixed ? 'readonly' : ''} />
      </div>
      <span class="status-pill status-${pageStatus}">${STATUS_LABELS[pageStatus] || pageStatus}</span>
      ${repeatable ? `<button class="small-btn danger-mini" data-remove-gate1-page="${escapeAttr(card.id)}" data-index="${pageIndex}" ${rowsSafeLength(card.pageRows) <= 1 ? 'disabled' : ''}>×</button>` : ''}
    </div>
    <div class="route-top-grid">
      <label class="route-field route-url"><span>URL</span><small>Адрес страницы, которую проверяем.</small><input list="projectUrlOptions" data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="url" value="${escapeAttr(row.url || '')}" placeholder="https://" />${projectUrlDatalistHtml()}</label>
      <div class="route-orientir"><strong>Краткий ориентир</strong><span>${escapeHtml(pageRouteOrientir(card, row))}</span></div>
    </div>
    <div class="route-sections">${routeHtml}</div>
  </section>`;
};

const __guruPrevPageStructureStatusV21 = pageStructureStatus;
pageStructureStatus = function(row) {
  v20EnsurePageAuditFields(row);
  const url = String(row.url || '').trim();
  if (!url) return 'not_started';
  if ([row.metaRobotsStatus, row.cwvStatus, row.imagesStatus].includes('error')) return 'problem';
  if ([row.cwvStatus, row.imagesStatus].includes('improve') || row.metaRobotsStatus === 'closed') return 'needs_attention';
  const ctx = row.contextFields || {};
  const baseChecks = [
    evaluateLength(row.h1, 10, 90).ok,
    evaluateLength(row.title, 20, 90).ok,
    evaluateLength(row.description, 50, 200).ok,
    row.metaRobotsStatus === 'ok',
    row.cwvStatus === 'ok',
    row.imagesStatus === 'ok',
    Boolean(String(row.auditEvidence || '').trim()),
    row.ctaMode === 'not_needed' ? true : Boolean(String(row.finalCta || '').trim())
  ];
  const homeKeys = ['heroUsp','primaryButton','segmentCards','aboutFacts','cases','processSteps','benefits','reviews'];
  const homeChecks = homeKeys.map(key => Boolean(String(ctx[key] || '').trim()));
  const checks = homeChecks.some(Boolean) ? baseChecks.concat(homeChecks) : baseChecks;
  if (checks.every(Boolean)) return 'ready';
  return 'in_progress';
};

(function markV21() {
  document.querySelectorAll('.launcher-kicker').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.21'); });
  document.querySelectorAll('.eyebrow').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.21'); });
})();

/* v0.22 — Page-specific route templates: не анкета, а маршрут по типу страницы */
function v22NormalizePageTitle(value = '') {
  return normalizeGateTitle(String(value || '').replace(/⚠️/g, '').trim());
}

function pageTemplateContext(card) {
  const title = v22NormalizePageTitle(card?.title || '');
  if (title === v22NormalizePageTitle('ГЛАВНАЯ')) return 'home';
  if (title.includes('лендинг')) return 'landing';
  if (title.includes('thank you')) return 'thankyou';
  if (title === '404' || title.includes('404')) return 'notfound';
  if (title.includes('политик')) return 'policy';
  if (title.includes('доставка') || title.includes('гаранти')) return 'delivery';
  if (title.includes('контакт')) return 'contacts';
  if (title.includes('о нас')) return 'about';
  if (title.includes('статья') || title.includes('блог')) return 'blog';
  if (title.includes('карточка товара') || title.includes('товар')) return 'product';
  if (title.includes('страница услуги') || title.includes('услуг')) return 'service';
  if (title.includes('список') || title.includes('категор') || title.includes('каталог')) return 'catalog';
  return 'standard';
}

function v22PageTemplates() {
  return {
    home: {
      type: 'Главная',
      orientir: 'Коммерческая точка входа. За 3 секунды объясняет, кто вы, для кого и почему вам можно доверять.',
      sections: [
        { key:'home_hero', title:'1. Hero-экран', task:'Сразу объяснить, кто вы, для кого и почему стоит остаться.', checklist:['H1 с результатом и адресатом','УТП без абстракций','Визуал результата или продукта','Соцдоказательство','Основная и альтернативная кнопки'], standard:'На первом экране понятно предложение, доверие и первое действие.', fields:[rowField('h1','H1','10–90 знаков'), ctxField('heroUsp','УТП','1 ясное обещание результата','textarea'), ctxField('heroVisual','Визуал','Что показываем на первом экране'), ctxField('heroProof','Соцдоказательство','Рейтинг / логотипы / кейс / цифра'), ctxField('heroMiniBlocks','Мини-блок: доставка / сроки / гарантия / оплата','Коротко по пунктам','textarea'), ctxField('primaryButton','Основная кнопка','Главное действие'), ctxField('secondaryButton','Альтернативная кнопка','Мягкое действие')] },
        { key:'home_segments', title:'2. Навигация по сегментам', task:'Помочь пользователю быстро выбрать свой сценарий.', checklist:['Заголовок выбора','3–6 карточек сегментов','Фото + название + ссылка в каждой карточке'], standard:'Пользователь за один экран понимает, куда ему перейти.', fields:[ctxField('segmentTitle','Заголовок','Объясняет логику выбора'), ctxField('segmentCards','Карточки сегментов','Фото + название + ссылка','textarea')] },
        { key:'home_about', title:'3. О компании', task:'Показать доверие и масштаб без длинного текста.', checklist:['Заголовок доверия','3 фактоида','Короткий текст о подходе','Сертификаты / награды / знаки доверия'], standard:'Блок отвечает, почему компании можно доверять.', fields:[ctxField('aboutTitle','Заголовок','Смысл доверия'), ctxField('aboutFacts','3 фактоида','Цифры / опыт / масштаб','textarea'), ctxField('aboutText','Короткий текст','2–4 предложения','textarea'), ctxField('trustBadges','Доказательства','Сертификаты / награды / знаки доверия','textarea')] },
        { key:'home_cases', title:'4. Кейсы', task:'Показать реальные результаты и снять страх «не получится».', checklist:['3–4 примера','Название кейса','Категория','Результат','CTA на портфолио'], standard:'Кейсы показывают конкретный результат, а не просто факт работы.', fields:[ctxField('cases','Кейсы','Название + категория + результат','textarea'), ctxField('portfolioButton','CTA на портфолио','Кнопка или ссылка')] },
        { key:'home_process', title:'5. Процесс работы', task:'Снять неопределённость и показать порядок действий.', checklist:['3–5 шагов','Что происходит на каждом шаге','Срок по каждому шагу','CTA под схемой'], standard:'Пользователь понимает, что будет после заявки.', fields:[ctxField('processTitle','Заголовок','Процесс простым языком'), ctxField('processSteps','3–5 шагов','Название + что происходит + срок','textarea'), ctxField('processButton','CTA под схемой','Следующее действие')] },
        { key:'home_benefits', title:'6. Выгоды', task:'Сформулировать пользу для клиента, а не свойства компании.', checklist:['Заголовок','3 конкретные выгоды','Каждая выгода привязана к результату клиента'], standard:'Выгоды отвечают на вопрос «что я получу».', fields:[ctxField('benefits','3 конкретные выгоды','Без общих слов','textarea')] },
        { key:'home_reviews', title:'7. Отзывы', task:'Добавить внешнее доверие перед финальным действием.', checklist:['Виджет Яндекс / Google или 3 цитаты','Кнопка «Читать все отзывы»'], standard:'Отзывы выглядят проверяемо и связаны с реальными клиентами.', fields:[ctxField('reviews','Отзывы','Виджет или 3 цитаты','textarea'), ctxField('reviewsButton','CTA читать все отзывы','Кнопка или ссылка')] },
        finalCtaSection('home_final_cta')
      ]
    },
    landing: {
      type: 'Лендинг',
      orientir: 'Ситуативная конверсионная страница под одну задачу. Без лишней навигации и отвлекающих элементов.',
      sections: [
        { key:'landing_hero', title:'1. Герой', task:'За 3 секунды передать оффер и вызвать первое действие.', checklist:['H1: результат + для кого + срок/условия','Подзаголовок: 1–2 конкретные выгоды','Визуал результата или продукта','Соцдоказательство','Мини-блок: срок / гарантия / условие','Одна яркая кнопка','Нет глобального меню'], standard:'Первый экран продаёт действие без отвлечений.', fields:[rowField('h1','H1','Результат + для кого + срок/условия'), ctxField('landingSubhead','Подзаголовок','1–2 конкретные выгоды'), ctxField('landingVisual','Визуал','Фото/видео результата или продукта'), ctxField('landingSocialProof','Соцдоказательство','Рейтинг / факты / логотипы'), ctxField('landingMiniBlock','Мини-блок','Срок / гарантия / условие','textarea'), ctxField('landingMainButton','Кнопка','Получить / Записаться / Рассчитать')] },
        { key:'landing_social', title:'2. Быстрый соцдок', task:'Сразу после героя убрать сомнение «а вы вообще кто».', checklist:['Полоса логотипов клиентов / партнёров / СМИ','3 цифры: клиенты / опыт / довольные','Формат узкий, без много места'], standard:'Первое доверие видно без скролла вглубь.', fields:[ctxField('landingLogos','Логотипы / партнёры / СМИ','Кого показываем','textarea'), ctxField('landingNumbers','3 цифры','X клиентов / X лет / X% довольных','textarea')] },
        { key:'landing_pains', title:'3. Боли', task:'Показать, что мы понимаем проблему клиента.', checklist:['Заголовок боли','3–5 болей','Визуальный разделитель или иконки','Переход к решению'], standard:'Клиент узнаёт свою ситуацию.', fields:[ctxField('landingPainTitle','Заголовок боли','Ситуация клиента'), ctxField('landingPains','3–5 болей','Заголовок + 1–2 предложения','textarea'), ctxField('landingPainBridge','Переход к решению','Короткий мост к офферу','textarea')] },
        { key:'landing_solution', title:'4. Оффер / Решение', task:'Показать продукт как прямой ответ на боль.', checklist:['Заголовок: как это решает боль','Описание продукта / услуги','Формула результата: было → стало','CTA повтор'], standard:'Понятно, что именно получит клиент.', fields:[ctxField('landingSolutionTitle','Заголовок решения','Как решает боль'), ctxField('landingSolutionText','Описание продукта/услуги','Что именно, как работает, что получает клиент','textarea'), ctxField('landingResultFormula','Формула результата','Было → стало / до → после'), ctxField('landingSolutionCta','CTA повтор','Получить / Попробовать')] },
        { key:'landing_process', title:'5. Как это работает', task:'Снять страх, что это сложно, долго или непонятно.', checklist:['Заголовок','3–5 шагов','Иконка + заголовок + 1 предложение + срок','Акцент на простоте первого шага'], standard:'Процесс выглядит простым и безопасным.', fields:[ctxField('landingProcessTitle','Заголовок','3 шага до результата / Как мы работаем'), ctxField('landingProcessSteps','3–5 шагов','Иконка + заголовок + предложение + срок','textarea')] },
        { key:'landing_cases', title:'6. Результаты / Кейсы', task:'Закрыть страх «вдруг не сработает».', checklist:['2–4 кейса','Ситуация → что сделали → результат в цифрах','Формат до/после, если есть','Цитата клиента','CTA повтор'], standard:'Есть доказательство реального результата.', fields:[ctxField('landingCases','2–4 кейса','Ситуация → действие → результат','textarea'), ctxField('landingClientQuote','Цитата клиента','Фото и имя, если возможно','textarea'), ctxField('landingCasesCta','CTA повтор','Следующее действие')] },
        { key:'landing_packages', title:'7. Пакеты / Вариации', task:'Дать выбор без перегруза.', checklist:['2–4 варианта','Название + для кого + что входит + цена/от X','Рекомендованный вариант','CTA у каждой карточки'], standard:'Выбор есть, но не создаёт паралич выбора.', fields:[ctxField('landingPackages','2–4 варианта','Название + кому + что входит + цена','textarea'), ctxField('landingRecommended','Рекомендованный вариант','Лейбл «Популярный»')] },
        { key:'landing_price', title:'8. Цена / Форма захвата', task:'Закрыть возражение по деньгам или снизить барьер первого шага.', checklist:['Цена открыта или цена по запросу','Что входит + бонус + гарантия + дедлайн','Короткая форма','Обещание времени ответа','Один из двух вариантов, не оба'], standard:'Пользователь понимает следующий шаг и не боится формы.', fields:[ctxField('landingPrice','Цена / условия','Цена + что входит + гарантия','textarea'), ctxField('landingForm','Форма','Имя + телефон / рассчитать стоимость'), ctxField('landingAnswerPromise','Обещание ответа','Ответим за X минут')] },
        { key:'landing_faq', title:'9. FAQ', task:'Снять последние возражения без менеджера.', checklist:['5–8 вопросов','Цена / сроки / гарантия / оплата / возврат / что если не подойдёт','Аккордеон','Кнопка: остался вопрос?'], standard:'FAQ отвечает на реальные возражения.', fields:[ctxField('landingFaq','5–8 вопросов','Вопрос + короткий ответ','textarea'), ctxField('landingFaqButton','Кнопка','Остался вопрос? Напишите нам')] },
        finalCtaSection('landing_final_cta')
      ]
    },
    service: {
      type: 'Страница услуги',
      orientir: 'Обязательная конверсионная страница. Проводит клиента от боли до заявки, не уводя со страницы.',
      sections: [
        { key:'service_hero', title:'1. Герой', task:'С первого экрана передать УТП, доверие и первое действие.', checklist:['H1: фраза УТП под конкретную услугу','Подзаголовок: 1–2 ключевые выгоды','Соцдок: рейтинг / логотипы / кейс-тиндер','Мини-блок: доставка / сроки / гарантия / оплата','Основная кнопка'], standard:'Первый экран сразу объясняет услугу и действие.', fields:[rowField('h1','H1','УТП под конкретную услугу'), ctxField('serviceSubhead','Подзаголовок','1–2 ключевые выгоды'), ctxField('serviceSocialProof','Соцдок','Рейтинг / логотипы / кейс'), ctxField('serviceMiniBlock','Мини-блок','Доставка / сроки / гарантия / оплата','textarea'), ctxField('serviceHeroButton','Кнопка','Основное действие')] },
        { key:'service_pain_solution', title:'2. Боли → Решение', task:'Зацепить болью и сразу показать выход.', checklist:['Заголовок блока','2–3 формулы: боль → решение','Мини-доказательства под каждой болью','Кнопка'], standard:'Проблема и решение понятны без длинного текста.', fields:[ctxField('servicePainTitle','Заголовок блока','Боль клиента'), ctxField('servicePainSolutions','2–3 формулы','Боль → решение + доказательство','textarea'), ctxField('servicePainButton','Кнопка','Следующее действие')] },
        { key:'service_cases', title:'3. Кейсы', task:'Показать реальный результат и закрыть страх.', checklist:['2–4 кейса','Формат до / после / результат','Отзывы с фото клиента','Формат слайдера или сетки'], standard:'Кейсы доказывают, что услуга работает.', fields:[ctxField('serviceCases','2–4 кейса','До / после / результат','textarea'), ctxField('serviceReviews','Отзывы клиентов','Фото + цитата','textarea'), ctxField('serviceCasesFormat','Формат','Слайдер или сетка')] },
        { key:'service_process', title:'4. Как работаем', task:'Убрать неопределённость, клиент должен знать, что будет дальше.', checklist:['Заголовок','3–5 шагов','Шаг → ожидаемый результат → срок','Видео-демо 15–30 сек, если есть','Кнопки'], standard:'Процесс прозрачен и снижает страх заявки.', fields:[ctxField('serviceProcessTitle','Заголовок','Как работаем'), ctxField('serviceProcessSteps','3–5 шагов','Шаг → результат → срок','textarea'), ctxField('serviceVideo','Видео-демо','15–30 сек, если применимо'), ctxField('serviceProcessButtons','Кнопки','Оформить заявку / консультация')] },
        { key:'service_packages', title:'5. Вариации / Пакеты', task:'Дать выбор под разные потребности и бюджеты.', checklist:['Общий заголовок + подзаголовок','3–7 карточек','Название + для кого + что входит','Кнопка у каждой карточки'], standard:'Пакеты помогают выбрать, но не перегружают.', fields:[ctxField('servicePackagesTitle','Заголовок','Общий заголовок + подзаголовок'), ctxField('servicePackages','3–7 карточек','Название + для кого + состав','textarea')] },
        { key:'service_price', title:'6. Цена', task:'Закрыть возражение по деньгам, показать ценность, не просто цифру.', checklist:['Заголовок','Цена + что входит','Бонус / спецпредложение','Гарантия + условия оплаты','Калькулятор, если применимо','Кнопки'], standard:'Цена выглядит как ценность, а не сухая сумма.', fields:[ctxField('servicePriceTitle','Заголовок','Про ценность'), ctxField('servicePrice','Цена + что входит','Цена, состав, условия','textarea'), ctxField('serviceBonus','Бонус / спецпредложение','Если есть'), ctxField('servicePayment','Гарантия + условия оплаты','Оплата / возврат / безопасность','textarea'), ctxField('serviceCalculator','Калькулятор','Если применимо'), ctxField('servicePriceButtons','Кнопки','Оформить заявку / консультация')] },
        { key:'service_faq', title:'7. FAQ', task:'Снять оставшиеся возражения без участия менеджера.', checklist:['6–10 вопросов','Сроки / гарантия / оплата / возврат / безопасность','Аккордеон','Кнопка задать вопрос'], standard:'FAQ закрывает частые сомнения.', fields:[ctxField('serviceFaq','6–10 вопросов','Вопрос + ответ','textarea'), ctxField('serviceFaqButton','Кнопка','Не нашли ответ? Задать вопрос')] },
        { key:'service_contacts', title:'8. Контакты / Связаться', task:'Финальный захват максимально простым способом связи.', checklist:['Форма: имя + телефон + сообщение','Телефон кликабельный','Мессенджеры','Часы работы + обещание времени ответа'], standard:'Пользователь может связаться одним действием.', fields:[ctxField('serviceContactForm','Форма','Имя + телефон + опционально сообщение','textarea'), ctxField('serviceContactPhone','Телефон','Кликабельный'), ctxField('serviceContactMessengers','Мессенджеры','WhatsApp / Telegram'), ctxField('serviceContactHours','Часы работы','Время ответа')] },
        { key:'service_cross', title:'9. Финальный экран + другие услуги', task:'Повторить УТП и удержать перелинковкой.', checklist:['УТП в 1–2 строки','Гарантия + кнопка','Блок других услуг: 3–6 карточек'], standard:'Есть финальный захват и продолжение маршрута.', fields:[ctxField('serviceFinalOffer','Финальное УТП','1–2 строки + гарантия'), ctxField('serviceOtherServices','Другие услуги','3–6 карточек с УТП','textarea')] }
      ]
    },
    catalog: {
      type: 'Список / категория',
      orientir: 'Навигационная страница. Разводит трафик по нужным разделам и удерживает тех, кто ещё выбирает.',
      sections: [
        { key:'catalog_hero', title:'1. Герой', task:'Подтвердить, что пользователь попал в нужный раздел.', checklist:['H1: название категории + гео/уточнение','Intro: 2–3 предложения о разделе'], standard:'Сразу ясно, что это за категория и кому она подходит.', fields:[rowField('h1','H1','Название категории + гео/уточнение'), ctxField('catalogIntro','Intro','2–3 предложения','textarea')] },
        { key:'catalog_filters', title:'2. Фильтры + сетка', task:'Упростить выбор и дать достаточно информации для клика.', checklist:['Фильтры: табы / теги / сортировка, если позиций больше 10','Карточка: фото + категория + H3 + атрибуты + CTA'], standard:'Пользователь быстро находит подходящий вариант.', fields:[ctxField('catalogFilters','Фильтры','Табы / теги / сортировка','textarea'), ctxField('catalogCards','Карточки','Фото + категория + H3 + атрибуты + CTA','textarea')] },
        { key:'catalog_lead_magnet', title:'3. Лид-магнит врезка', task:'Поймать тех, кто устал листать или не может выбрать.', checklist:['Вставляется после 3–6 карточки','Заголовок «Не знаете что выбрать?»','Кнопка консультации'], standard:'Есть мягкий захват для неопределившихся.', fields:[ctxField('catalogLeadMagnetPlace','Место вставки','После 3–6 карточки'), ctxField('catalogLeadMagnetTitle','Заголовок','Не знаете что выбрать?'), ctxField('catalogLeadMagnetButton','Кнопка','Получить консультацию')] },
        { key:'catalog_pagination', title:'4. Пагинация + перелинковка', task:'Техническая навигация и удержание, если категория не подошла.', checklist:['Показать ещё AJAX для UX','Числовая пагинация для роботов','Смотрите также: 3–4 смежные категории','Финальный CTA'], standard:'Навигация удобна человеку и понятна поисковым системам.', fields:[ctxField('catalogPagination','Пагинация','AJAX + числовая пагинация','textarea'), ctxField('catalogRelated','Смотрите также','3–4 смежные категории','textarea'), ctxField('catalogFinalCta','Финальный CTA','Если нужен')] }
      ]
    },
    product: {
      type: 'Карточка товара',
      orientir: 'Обязательная e-commerce страница. Даёт всё необходимое для решения о покупке на одном экране.',
      sections: [
        { key:'product_first_screen', title:'1. Первый экран', task:'Показать товар и дать всё для принятия решения без ухода со страницы.', checklist:['Левая колонка: галерея + миниатюры + лейблы','Правая колонка: H1 + рейтинг + краткое описание + цена + наличие + кнопки','Мини-блок доверия'], standard:'Покупатель видит товар, цену, наличие и действие.', fields:[ctxField('productGallery','Левая колонка','Галерея + миниатюры + лейблы','textarea'), rowField('h1','H1','Название товара'), ctxField('productRating','Рейтинг','Рейтинг и отзывы'), ctxField('productShortDescription','Краткое описание','2–3 буллита','textarea'), ctxField('productPrice','Цена','Текущая + старая зачёркнутая, если есть'), ctxField('productAvailability','Наличие','Наличие / сроки'), ctxField('productButtons','Кнопки','В корзину / Купить'), ctxField('productTrustMini','Мини-блок доверия','Гарантия / доставка / возврат','textarea')] },
        { key:'product_content', title:'2. Контент товара', task:'Продать через эмоцию и закрыть рациональные вопросы.', checklist:['Вкладки: описание / характеристики / комплектация / отзывы','Описание: проблема + формула было → стало + lifestyle-фото','Характеристики: таблица параметров','Комплектация: список или фото-раскладка'], standard:'Страница отвечает и эмоцией, и фактами.', fields:[ctxField('productTabs','Вкладки','Описание / характеристики / комплектация / отзывы','textarea'), ctxField('productDescription','Описание','Проблема + было→стало + lifestyle','textarea'), ctxField('productCharacteristics','Характеристики','Таблица параметров','textarea'), ctxField('productSet','Комплектация','Список или фото-раскладка','textarea')] },
        { key:'product_tail', title:'3. Конверсионный хвост', task:'Увеличить чек и не отпустить, если не купил.', checklist:['Cross-sell: 3–4 карточки аксессуаров + кнопка добавить','Отзывы / UGC','Доставка и оплата','Вы недавно смотрели'], standard:'Есть допродажа, доверие и возвращение к выбору.', fields:[ctxField('productCrossSell','Cross-sell','3–4 аксессуара + кнопка','textarea'), ctxField('productUgc','Отзывы / UGC','Рейтинг + фото + список отзывов','textarea'), ctxField('productDeliveryPayment','Доставка и оплата','Способы + сроки + возврат','textarea'), ctxField('productViewed','Вы недавно смотрели','Карусель просмотренных')] }
      ]
    },
    blog: {
      type: 'Статья блога',
      orientir: 'Вторичная трафиковая страница. Привлекает SEO-трафик и конвертирует читателя в лида.',
      sections: [
        { key:'blog_hero', title:'1. Герой + введение', task:'Заголовком продать клик, введением удержать.', checklist:['H1: главный ключ + интрига / цифра','Хлебные крошки + автор + дата + время чтения','Уникальное cover-фото','Лид-абзац: проблема + обещание решения','TOC: якорные ссылки'], standard:'Читатель понимает тему, пользу и структуру статьи.', fields:[rowField('h1','H1','Ключ + интрига / цифра'), ctxField('blogMeta','Крошки + автор + дата + время чтения','Навигационная мета-информация','textarea'), ctxField('blogCover','Cover-фото','Уникальное, не стоковое'), ctxField('blogLead','Лид-абзац','Проблема + обещание решения','textarea'), ctxField('blogToc','TOC','Якорные ссылки на разделы','textarea')] },
        { key:'blog_body', title:'2. Тело + экспертные вставки', task:'Передать экспертность с конкретной пользой.', checklist:['Абзацы до 5 строк','H2/H3 со вторичными ключами','Чередование текста и списков','Pro Tips','Визуалы: скриншоты / графики / примеры'], standard:'Статья читается легко и доказывает экспертизу.', fields:[ctxField('blogBodyStructure','Структура текста','Абзацы, H2/H3, списки','textarea'), ctxField('blogProTips','Pro Tips','Блоки с советом эксперта','textarea'), ctxField('blogVisuals','Визуалы','Скриншоты / графики / подписи','textarea')] },
        { key:'blog_conversion', title:'3. Конверсия внутри статьи', task:'Поймать горячих читателей и удержать остальных.', checklist:['Mid-CTA после 1–2 раздела','FAQ 5–7 вопросов','Заключение: 3–4 вывода','Bottom CTA'], standard:'Статья не только информирует, но и ведёт к заявке.', fields:[ctxField('blogMidCta','Mid-CTA','Баннер с контекстным оффером','textarea'), ctxField('blogFaq','FAQ','5–7 вопросов','textarea'), ctxField('blogConclusion','Заключение','3–4 вывода списком','textarea'), ctxField('blogBottomCta','Bottom CTA','Текст + форма + кнопка')] },
        { key:'blog_eat', title:'4. E-E-A-T + удержание', task:'Доказать, что писал эксперт, и не отпустить с сайта.', checklist:['Карточка автора','Соцсети','Читать далее: 3 релевантные статьи'], standard:'Есть авторство, доверие и перелинковка.', fields:[ctxField('blogAuthorCard','Карточка автора','Фото + должность + био + соцсети','textarea'), ctxField('blogRelated','Читать далее','3 релевантные статьи','textarea')] }
      ]
    },
    about: {
      type: 'О нас',
      orientir: 'Вторичная доверительная страница. Превращает безликое «мы» в живых людей и продаёт экспертность.',
      sections: [
        { key:'about_hero', title:'1. Герой + факты', task:'Быстро передать масштаб и зачем работает компания.', checklist:['H1: миссия, не название компании','Реальное фото команды или процесса','3–4 фактоида: год / объём / дифференциатор / локация'], standard:'Сразу видно, кто стоит за бизнесом.', fields:[rowField('h1','H1','Формулировка миссии'), ctxField('aboutHeroPhoto','Фото команды или процесса','Реальное фото'), ctxField('aboutFactoids','3–4 фактоида','Год / объём / отличие / локация','textarea')] },
        { key:'about_people', title:'2. Люди + процесс', task:'Показать лицо бренда и систему за ним.', checklist:['Фото основателя + прямая речь','Команда: фото + роли','Backstage: фото/видео процесса + системность результата'], standard:'Компания выглядит живой и управляемой.', fields:[ctxField('aboutFounder','Основатель','Фото + речь 3–5 строк','textarea'), ctxField('aboutTeam','Команда','Фото + роли','textarea'), ctxField('aboutBackstage','Backstage','Фото/видео процесса + что делает результат системным','textarea')] },
        { key:'about_trust_cta', title:'3. Доверие + CTA', task:'Финальное социальное доказательство и захват.', checklist:['Лого-стена клиентов','Сертификаты / награды / лицензии','Финальный CTA'], standard:'Страница закрывает доверие и ведёт к действию.', fields:[ctxField('aboutClientWall','Лого-стена клиентов','Кого показываем','textarea'), ctxField('aboutCertificates','Сертификаты / награды / лицензии','Проверяемые доказательства','textarea'), ctxField('aboutFinalCta','Финальный CTA','Следующее действие')] }
      ]
    },
    contacts: {
      type: 'Контакты',
      orientir: 'Обязательная сервисная страница. Обеспечивает максимальную доступность и подтверждает легальность бизнеса.',
      sections: [
        { key:'contacts_communication', title:'1. Связь', task:'Любой способ связи в одно касание.', checklist:['Телефон кликабельный, крупно','Мессенджеры WhatsApp + Telegram','Email','Часы работы'], standard:'Пользователь сразу видит, как связаться.', fields:[ctxField('contactsPhone','Телефон','Кликабельный, крупно'), ctxField('contactsMessengers','Мессенджеры','WhatsApp + Telegram'), ctxField('contactsEmail','Email','Рабочий email'), ctxField('contactsHours','Часы работы','Понятный график')] },
        { key:'contacts_map', title:'2. Карта + реквизиты', task:'Local SEO + доверие для B2B.', checklist:['Интерактивная карта, не скриншот','Полный адрес + схема проезда','Юрлицо + ИНН + ОГРН','Форма с согласием'], standard:'Контакты подтверждают реальность и легальность компании.', fields:[ctxField('contactsMap','Интерактивная карта','Ссылка/виджет, не скриншот'), ctxField('contactsAddress','Адрес + схема проезда','Полный адрес'), ctxField('contactsLegal','Юрлицо + ИНН + ОГРН','Реквизиты','textarea'), ctxField('contactsForm','Форма','Имя + Email + тема + чекбокс согласия','textarea')] }
      ]
    },
    delivery: {
      type: 'Доставка / гарантии',
      orientir: 'Рекомендуемая сервисная страница. Снимает страхи о том, что будет после оплаты.',
      sections: [
        { key:'delivery_service', title:'1. Процесс передачи результата', task:'Снять страхи: что получу, когда, и что если что-то пойдёт не так.', checklist:['Форматы передачи результата','Сроки в таблице','Гарантии: качество + хранение + конфиденциальность','Оплата: способы + предоплата/постоплата'], standard:'Пользователь понимает условия до обращения.', fields:[ctxField('deliveryFormats','Форматы передачи результата','Ссылка / файл / самовывоз','textarea'), ctxField('deliveryTiming','Сроки','Таблица тип → срок','textarea'), ctxField('deliveryGuarantees','Гарантии','Качество + хранение + конфиденциальность','textarea'), ctxField('deliveryPayment','Оплата','Способы + предоплата/постоплата','textarea')] }
      ]
    },
    policy: {
      type: 'Политика',
      orientir: 'Обязательная юридическая страница. Защищает от штрафов по 152-ФЗ и разблокирует рекламные кабинеты.',
      sections: [
        { key:'policy_legal', title:'1. Юридическая защита сбора данных', task:'Закрыть требования для форм и рекламы.', checklist:['Кто мы: название + адрес + ИНН + email ответственного','Какие данные собираем и зачем','Cookies: сервисы + инструкция отключения','Права пользователя: срок хранения + право удаления'], standard:'Политика покрывает формы, cookies и рекламные требования.', fields:[ctxField('policyWho','Кто мы','Название + адрес + ИНН + email','textarea'), ctxField('policyData','Какие данные','Список + зачем','textarea'), ctxField('policyCookies','Cookies','Сервисы + инструкция отключения','textarea'), ctxField('policyRights','Права пользователя','Срок хранения + право удаления','textarea')] }
      ]
    },
    notfound: {
      type: '404',
      orientir: 'Техническая удерживающая страница. Не даёт пользователю уйти, когда он попал в тупик.',
      sections: [
        { key:'notfound_exit', title:'1. Выход из тупика', task:'Не дать закрыть вкладку и предложить продолжение.', checklist:['H1: «Страница не найдена», нейтральный тон','Строка поиска по сайту','Кнопка на главную','Ссылки на топ-разделы'], standard:'Пользователь получает понятный выход.', fields:[rowField('h1','H1','Страница не найдена, нейтрально'), ctxField('notfoundSearch','Поиск по сайту','Есть / нет'), ctxField('notfoundHomeButton','Кнопка на главную','Текст кнопки'), ctxField('notfoundTopLinks','Топ-разделы','3–6 ссылок','textarea')] }
      ]
    },
    thankyou: {
      type: 'Thank You Page',
      orientir: 'Обязательная аналитическая страница. На ней настраивается цель в Метрике для обучения Директа.',
      sections: [
        { key:'thankyou_confirm', title:'1. Подтверждение заявки', task:'Подтвердить заявку и прогреть горячего клиента.', checklist:['H1 «Спасибо» + зелёная галочка','Текст: кто / когда / как свяжется','Прогрев: Telegram / портфолио / полезный контент','URL /thank-you → цель в Метрике'], standard:'Пользователь понимает, что заявка принята, а аналитика получает цель.', fields:[rowField('h1','H1','Спасибо + зелёная галочка'), ctxField('thankyouText','Текст подтверждения','Кто / когда / как свяжется','textarea'), ctxField('thankyouWarmup','Прогрев','Telegram / портфолио / полезный контент','textarea'), ctxField('thankyouGoal','Цель в Метрике','URL /thank-you → цель')] }
      ]
    },
    standard: {
      type: 'Страница',
      orientir: 'Рабочая страница сайта. Фиксирует содержание, SEO-основу, техническое состояние и конверсионное действие.',
      sections: [
        { key:'standard_content', title:'1. Контент и задача', task:'Понять, какую роль выполняет страница.', checklist:['H1','Краткое описание','Главное действие','Доказательство'], standard:'Страница имеет понятную задачу и результат.', fields:[rowField('h1','H1','Главный заголовок'), ctxField('standardRole','Роль страницы','Зачем нужна страница','textarea'), ctxField('standardMainAction','Главное действие','Что должен сделать пользователь'), ctxField('standardProof','Доказательство','Ссылка / скрин / факт','textarea')] }
      ]
    }
  };
}

function ctxField(key, label, standard, type = 'input') { return { kind:'context', key, label, standard, type, required:true }; }
function rowField(field, label, standard, type = 'input') { return { kind:'row', field, label, standard, type, required:true }; }
function finalCtaSection(key) {
  return { key, title:'Финальный CTA', task:'Последний шанс захватить тех, кто дошёл до конца.', checklist:['Повтор главного оффера в 1–2 строки','Усилитель: гарантия / бонус / дедлайн / ограничение мест','Форма или кнопка максимально простые','Альтернатива: WhatsApp / Telegram, если форма не подходит'], standard:'В конце страницы есть понятное действие или осознанное решение, что CTA не нужен.', fields:[ctxField(`${key}_headline`,'Заголовок','Повтор главного оффера'), ctxField(`${key}_button`,'Основная кнопка','Максимально конкретное действие'), ctxField(`${key}_alt`,'Альтернативное действие','WhatsApp / Telegram / звонок, если нужно')] };
}

function v22TemplateForCard(card) {
  const context = pageTemplateContext(card);
  const templates = v22PageTemplates();
  return templates[context] || templates.standard;
}

function v22PageTypeLabel(card) {
  return v22TemplateForCard(card).type;
}

function pageRouteOrientir(card, row) {
  return v22TemplateForCard(card).orientir;
}

function v22IsFilled(value) {
  return String(value || '').trim().length > 0;
}

function v22GetFieldValue(row, field) {
  if (field.kind === 'row') return row[field.field];
  row.contextFields = row.contextFields || {};
  return row.contextFields[field.key];
}

function v22SectionMode(row, section) {
  row.contextFields = row.contextFields || {};
  return row.contextFields[`${section.key}__mode`] || 'needed';
}

function v22SectionStatus(row, section) {
  if (v22SectionMode(row, section) === 'not_needed') return 'ready';
  const requiredFields = (section.fields || []).filter(field => field.required !== false);
  const checks = requiredFields.map(field => v22IsFilled(v22GetFieldValue(row, field)));
  const resultFilled = v22IsFilled(row.contextFields?.[`${section.key}__result`]);
  const proofFilled = v22IsFilled(row.contextFields?.[`${section.key}__proof`]);
  const all = checks.concat([resultFilled, proofFilled]);
  const filled = all.filter(Boolean).length;
  if (!filled) return 'not_started';
  if (filled === all.length) return 'ready';
  return 'in_progress';
}

function v22SectionStatusLabel(row, section) {
  if (v22SectionMode(row, section) === 'not_needed') return 'Не нужна';
  const status = v22SectionStatus(row, section);
  return STATUS_LABELS[status] || status;
}

function v22SectionFieldHtml(card, pageIndex, row, field) {
  if (field.kind === 'row') return rowInputField(card, pageIndex, row, field.field, field.label, field.standard, field.type, field.type === 'textarea' ? 'full' : '');
  return contextInputField(card, pageIndex, row, field.key, field.label, field.standard, field.type, field.type === 'textarea' ? 'full' : '');
}

function v22SectionMetaInput(card, pageIndex, row, section, suffix, label, standard, type = 'textarea') {
  const key = `${section.key}__${suffix}`;
  return contextInputField(card, pageIndex, row, key, label, standard, type, 'full');
}

function v22RouteSectionHtml(card, row, pageIndex, section, open = false) {
  row.contextFields = row.contextFields || {};
  const modeKey = `${section.key}__mode`;
  const mode = v22SectionMode(row, section);
  const status = v22SectionStatus(row, section);
  return `<details class="route-section v22-route-section status-${status}" ${open ? 'open' : ''}>
    <summary>
      <span class="v22-section-title">${escapeHtml(section.title)}</span>
      <span class="v22-section-status status-pill status-${status}">${escapeHtml(v22SectionStatusLabel(row, section))}</span>
    </summary>
    <div class="route-section-body v22-section-body">
      <div class="v22-section-guidance">
        <div><strong>Задача</strong><p>${escapeHtml(section.task || '')}</p></div>
        <div><strong>Чек-пункты</strong><ul>${(section.checklist || []).map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></div>
        <div><strong>Стандарт готовности</strong><p>${escapeHtml(section.standard || '')}</p></div>
      </div>
      <label class="route-field v22-section-mode"><span>Нужна ли секция</span><small>Если секция не нужна, она не влияет на готовность страницы.</small><select data-page-context-card-id="${escapeAttr(card.id)}" data-page-context-index="${pageIndex}" data-page-context-key="${escapeAttr(modeKey)}">
        <option value="needed" ${mode !== 'not_needed' ? 'selected' : ''}>Нужна</option>
        <option value="not_needed" ${mode === 'not_needed' ? 'selected' : ''}>Не нужна</option>
      </select></label>
      ${mode === 'not_needed' ? `<div class="v22-section-skipped">Секция исключена из расчёта готовности страницы.</div>` : `<div class="route-section-grid v22-route-fields">
        ${(section.fields || []).map(field => v22SectionFieldHtml(card, pageIndex, row, field)).join('')}
        ${v22SectionMetaInput(card, pageIndex, row, section, 'result', 'Результат секции', 'Коротко зафиксируйте, что должно быть на странице.', 'textarea')}
        ${v22SectionMetaInput(card, pageIndex, row, section, 'proof', 'Доказательство', 'Ссылка на макет, скрин, отчёт или короткое подтверждение.', 'input')}
      </div>`}
    </div>
  </details>`;
}

function v22SeoSnippetSection(card, row, pageIndex, open = false) {
  const section = { key:'seo_snippet', title:'SEO-сниппет', task:'Собрать поисковый вид страницы из H1, Title и Description.', checklist:['Title отражает смысл страницы','Description объясняет ценность и действие','Snippet читается как короткое предложение'], standard:'Страница понятно выглядит в поиске и не требует отдельного блока сниппета.', fields:[rowField('title','Title','20–90 знаков. SEO-заголовок страницы.'), rowField('description','Description','50–200 знаков. SEO-описание страницы.','textarea')] };
  const snippet = snippetForPage(row);
  const base = v22RouteSectionHtml(card, row, pageIndex, section, open);
  return base.replace('</div>\n  </details>', `<div class="snippet-preview route-snippet v22-snippet-preview full"><strong>Snippet</strong><span>${snippet ? escapeHtml(snippet) : 'Соберётся из H1, Title, Description, смысла и оффера страницы.'}</span></div></div>\n  </details>`);
}

function v22FinalCtaSection(card, row, pageIndex, open = false) {
  const status = row.ctaMode === 'not_needed' ? 'ready' : (v22IsFilled(row.finalCta) ? 'ready' : 'not_started');
  return `<details class="route-section v22-route-section status-${status}" ${open ? 'open' : ''}>
    <summary><span class="v22-section-title">Финальный CTA</span><span class="v22-section-status status-pill status-${status}">${row.ctaMode === 'not_needed' ? 'Не нужен' : (STATUS_LABELS[status] || status)}</span></summary>
    <div class="route-section-body v22-section-body">
      <div class="v22-section-guidance">
        <div><strong>Задача</strong><p>Последний шанс захватить тех, кто дошёл до конца страницы.</p></div>
        <div><strong>Чек-пункты</strong><ul><li>Повтор главного оффера</li><li>Основная кнопка</li><li>Альтернативное действие, если нужно</li></ul></div>
        <div><strong>Стандарт готовности</strong><p>Пользователь понимает, что делать дальше.</p></div>
      </div>
      ${finalCtaRouteHtml(card, row, pageIndex)}
    </div>
  </details>`;
}

function v22TechnicalControlHtml(card, row, pageIndex) {
  return `<section class="v22-tech-control">
    <div class="v22-tech-head">
      <strong>Технический контроль</strong>
      <span>Компактная проверка страницы, без отдельной простыни.</span>
    </div>
    ${pageAuditControlsCompactHtml(card, row, pageIndex)}
  </section>`;
}

function v22RouteSectionsHtml(card, row, pageIndex) {
  const template = v22TemplateForCard(card);
  const sections = [...(template.sections || [])];
  const statuses = sections.map(section => v22SectionStatus(row, section));
  let firstOpen = statuses.findIndex(status => status !== 'ready');
  const html = sections.map((section, index) => v22RouteSectionHtml(card, row, pageIndex, section, index === firstOpen)).join('');
  const seoOpen = firstOpen === -1 && (!v22IsFilled(row.title) || !v22IsFilled(row.description));
  const ctaOpen = firstOpen === -1 && row.ctaMode !== 'not_needed' && !v22IsFilled(row.finalCta) && !seoOpen;
  return html + v22SeoSnippetSection(card, row, pageIndex, seoOpen) + v22FinalCtaSection(card, row, pageIndex, ctaOpen) + v22TechnicalControlHtml(card, row, pageIndex);
}

pageStructureCardHtml = function(card, row, pageIndex, repeatable) {
  v20EnsurePageAuditFields(row);
  row.contextFields = row.contextFields || {};
  const pageStatus = pageStructureStatus(row);
  const template = v22TemplateForCard(card);
  const nameValue = row.name || card.title || template.type || 'Страница';
  return `<section class="page-structure-card guru-route-card v22-page-card" data-page-source-card="${escapeAttr(card.id)}">
    <div class="route-card-head v22-route-card-head">
      <div>
        <div class="route-kicker">Ориентир → секции страницы → чек-пункты → стандарт → доказательство → статус</div>
        <input class="page-name-input route-page-name" data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="name" value="${escapeAttr(nameValue)}" placeholder="Название страницы" ${row.fixed ? 'readonly' : ''} />
        <div class="v22-page-type">Тип страницы: ${escapeHtml(template.type || 'Страница')}</div>
      </div>
      <span class="status-pill status-${pageStatus}">${STATUS_LABELS[pageStatus] || pageStatus}</span>
      ${repeatable ? `<button class="small-btn danger-mini" data-remove-gate1-page="${escapeAttr(card.id)}" data-index="${pageIndex}" ${rowsSafeLength(card.pageRows) <= 1 ? 'disabled' : ''}>×</button>` : ''}
    </div>
    <div class="route-top-grid v22-route-top-grid">
      <label class="route-field route-url"><span>URL</span><small>Адрес страницы, которую проверяем.</small><input list="projectUrlOptions" data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="url" value="${escapeAttr(row.url || '')}" placeholder="https://" />${projectUrlDatalistHtml()}</label>
      <div class="route-orientir"><strong>Краткий ориентир</strong><span>${escapeHtml(template.orientir || pageRouteOrientir(card, row))}</span></div>
    </div>
    <div class="route-sections v22-route-sections">${v22RouteSectionsHtml(card, row, pageIndex)}</div>
  </section>`;
};

const __guruPrevPageStructureStatusV22 = pageStructureStatus;
pageStructureStatus = function(row) {
  v20EnsurePageAuditFields(row);
  if (!v22IsFilled(row.url)) return 'not_started';
  if ([row.metaRobotsStatus, row.cwvStatus, row.imagesStatus].includes('error')) return 'problem';
  if ([row.cwvStatus, row.imagesStatus].includes('improve') || row.metaRobotsStatus === 'closed') return 'needs_attention';
  const template = v22PageTemplates()[pageTemplateContext({ title: row.name || '' })] || null;
  // Actual card context is not available here, so route section readiness is evaluated by keys present on the row.
  const context = row.contextFields || {};
  const sectionKeys = Object.keys(context).filter(key => key.endsWith('__result')).map(key => key.replace(/__result$/, ''));
  const requiredSectionsReady = sectionKeys.length ? sectionKeys.every(key => context[`${key}__mode`] === 'not_needed' || (v22IsFilled(context[`${key}__result`]) && v22IsFilled(context[`${key}__proof`]))) : false;
  const seoReady = v22IsFilled(row.h1) && v22IsFilled(row.title) && v22IsFilled(row.description);
  const ctaReady = row.ctaMode === 'not_needed' || v22IsFilled(row.finalCta);
  const techReady = row.metaRobotsStatus === 'ok' && row.cwvStatus === 'ok' && row.imagesStatus === 'ok' && v22IsFilled(row.auditEvidence);
  if (requiredSectionsReady && seoReady && ctaReady && techReady) return 'ready';
  return 'in_progress';
};

const __guruPrevTypedDataPlainV22 = typedDataPlain;
typedDataPlain = function(card) {
  if (getGate1CardMode(card) === 'page_structure') {
    ensureGate1TypedData(card);
    return (card.pageRows || []).map(row => {
      const ctx = row.contextFields || {};
      const sections = Object.keys(ctx).filter(key => key.endsWith('__result')).map(key => key.replace(/__result$/, '')).map(key => `${key}: ${ctx[`${key}__mode`] === 'not_needed' ? 'не нужна' : (ctx[`${key}__result`] || 'не заполнено')} / доказательство: ${ctx[`${key}__proof`] || 'нет'}`).join('\n');
      return `${row.name || card.title}: ${row.url || 'URL не указан'}\nH1: ${row.h1 || ''}\nTitle: ${row.title || ''}\nDescription: ${row.description || ''}\nSnippet: ${snippetForPage(row)}\nФинальный CTA: ${row.ctaMode === 'not_needed' ? 'не нужен' : (row.finalCta || 'не заполнен')}\n${sections}\nMeta Robots: ${auditChipText(row.metaRobotsStatus, 'meta')}\nCWV: ${auditChipText(row.cwvStatus, 'cwv')}\nИзображения: ${auditChipText(row.imagesStatus, 'images')}\nДоказательство: ${row.auditEvidence || ''}`;
    }).join('\n\n');
  }
  return __guruPrevTypedDataPlainV22(card);
};

const __guruPrevUpdatePageContextFieldV22 = updatePageContextField;
updatePageContextField = function(e) {
  __guruPrevUpdatePageContextFieldV22(e);
  const key = e.target.dataset.pageContextKey || '';
  if (key.endsWith('__mode')) renderGate();
};

(function markV22() {
  document.querySelectorAll('.launcher-kicker').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.22'); });
  document.querySelectorAll('.eyebrow').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.22'); });
})();

const __guruPrevUpdatePageContextFieldV22b = updatePageContextField;
updatePageContextField = function(e) {
  __guruPrevUpdatePageContextFieldV22b(e);
  const key = e.target.dataset.pageContextKey || '';
  if ((key.endsWith('__mode') || key.endsWith('__result') || key.endsWith('__proof')) && e.type === 'change') renderGate();
};


/* v0.23 — Юридико-доверительный контроль: cookie/footer компактно, согласия внутри страниц + сводка */
(function markV23() {
  document.querySelectorAll('.launcher-kicker').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.23'); });
  document.querySelectorAll('.eyebrow').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.23'); });
})();

const V23_LEGAL_COOKIE_TITLE = 'Cookie-баннер';
const V23_LEGAL_FOOTER_TITLE = 'Футер: Политика + Реквизиты';
const V23_FORM_CONSENT_TITLE = 'Согласие в формах';

function isV23CookieCard(card) { return normalizeGateTitle(card?.title || '') === normalizeGateTitle(V23_LEGAL_COOKIE_TITLE); }
function isV23FooterCard(card) { return normalizeGateTitle(card?.title || '') === normalizeGateTitle(V23_LEGAL_FOOTER_TITLE); }
function isV23FormConsentSummaryCard(card) { return normalizeGateTitle(card?.title || '') === normalizeGateTitle(V23_FORM_CONSENT_TITLE); }
function isV23LegalTrustCard(card) { return isV23CookieCard(card) || isV23FooterCard(card); }

const __guruPrevGetGate1CardModeV23 = getGate1CardMode;
getGate1CardMode = function(card) {
  if (isV23CookieCard(card)) return 'legal_cookie';
  if (isV23FooterCard(card)) return 'legal_footer';
  if (isV23FormConsentSummaryCard(card)) return 'form_consent_summary';
  return __guruPrevGetGate1CardModeV23(card);
};

function ensureV23LegalTrustFields(card, type) {
  card.legalTrust = card.legalTrust || {};
  card.legalTrust.type = type;
  card.legalTrust.url = card.legalTrust.url || '';
  card.legalTrust.status = card.legalTrust.status || '';
  card.legalTrust.evidence = card.legalTrust.evidence || '';
  card.legalTrust.checks = card.legalTrust.checks || {};
  const checklist = v23LegalChecklist(type);
  checklist.forEach(item => {
    if (card.legalTrust.checks[item.key] === undefined) card.legalTrust.checks[item.key] = false;
  });
  return card.legalTrust;
}

function v23LegalChecklist(type) {
  if (type === 'cookie') return [
    { key:'shown', label:'баннер показывается' },
    { key:'clearText', label:'текст понятный' },
    { key:'policyLink', label:'есть ссылка на политику' },
    { key:'notBlocking', label:'баннер не перекрывает ключевое действие' }
  ];
  return [
    { key:'policyLink', label:'есть ссылка на политику' },
    { key:'legalDetails', label:'есть реквизиты / юридические данные' },
    { key:'contacts', label:'есть контакты' },
    { key:'linksOpen', label:'ссылки открываются' }
  ];
}

function v23LegalStatusOptions(value) {
  const options = [
    ['', 'Не проверено'],
    ['ok', 'ОК'],
    ['error', 'Ошибка']
  ];
  return options.map(([key, label]) => `<option value="${escapeAttr(key)}" ${value === key ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
}

function v23LegalTrustStatus(card) {
  const type = isV23CookieCard(card) ? 'cookie' : 'footer';
  const fields = ensureV23LegalTrustFields(card, type);
  const hasUrl = String(fields.url || '').trim().length > 0;
  const hasEvidence = String(fields.evidence || '').trim().length > 0;
  if (!hasUrl && !fields.status && !hasEvidence) return 'not_started';
  if (fields.status === 'error') return 'problem';
  if (fields.status === 'ok' && hasEvidence) return 'ready';
  return 'in_progress';
}

function v23LegalTrustHtml(card, type) {
  const fields = ensureV23LegalTrustFields(card, type);
  const title = type === 'cookie' ? 'Cookie-баннер' : 'Футер: Политика + Реквизиты';
  const essence = type === 'cookie'
    ? 'Проверить, что на сайте есть понятное уведомление о cookie / обработке данных и ссылка на политику.'
    : 'Проверить, что в подвале сайта есть юридическая база и доверительные данные компании.';
  const urlLabel = type === 'cookie' ? 'URL проверки' : 'URL проверки';
  return `<div class="legal-trust-card context-panel v23-legal-card">
    <div class="v23-legal-head">
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(essence)}</span>
      </div>
      <span class="status-pill status-${v23LegalTrustStatus(card)}">${escapeHtml(STATUS_LABELS[v23LegalTrustStatus(card)] || v23LegalTrustStatus(card))}</span>
    </div>
    <div class="v23-legal-grid">
      <label><span>${escapeHtml(urlLabel)}</span><input list="projectUrlOptions" data-v23-legal-field="url" value="${escapeAttr(fields.url || '')}" placeholder="https://" />${projectUrlDatalistHtml()}</label>
      <label><span>${type === 'cookie' ? 'Статус cookie-баннера' : 'Статус футера'}</span><select data-v23-legal-field="status">${v23LegalStatusOptions(fields.status || '')}</select></label>
      <label class="full"><span>Доказательство / результат</span><input data-v23-legal-field="evidence" value="${escapeAttr(fields.evidence || '')}" placeholder="скрин + короткий вывод" /></label>
    </div>
    <div class="v23-legal-checklist">
      ${v23LegalChecklist(type).map(item => `<label class="v23-check"><input type="checkbox" data-v23-legal-check="${escapeAttr(item.key)}" ${fields.checks?.[item.key] ? 'checked' : ''} /><span>${escapeHtml(item.label)}</span></label>`).join('')}
    </div>
  </div>`;
}

function updateV23LegalTrustField(target) {
  const cardId = target.closest('[data-card]')?.dataset?.card;
  const card = cardId ? findCard(cardId) : null;
  if (!card || !isV23LegalTrustCard(card)) return;
  const type = isV23CookieCard(card) ? 'cookie' : 'footer';
  const fields = ensureV23LegalTrustFields(card, type);
  const field = target.dataset.v23LegalField;
  fields[field] = target.value;
  if (field === 'url') addOrUpdateProjectLink(target.value, { comment: type === 'cookie' ? 'проверка cookie-баннера' : 'проверка футера' });
  recalculateStatusForCard(card);
  flashSaving();
  if (field === 'status') renderGate();
}

function updateV23LegalTrustCheck(target) {
  const cardId = target.closest('[data-card]')?.dataset?.card;
  const card = cardId ? findCard(cardId) : null;
  if (!card || !isV23LegalTrustCard(card)) return;
  const type = isV23CookieCard(card) ? 'cookie' : 'footer';
  const fields = ensureV23LegalTrustFields(card, type);
  fields.checks[target.dataset.v23LegalCheck] = target.checked;
  flashSaving();
}

function v23FormConsentLabel(status, hasForm) {
  if (hasForm === 'no') return 'формы нет';
  if (status === 'ok') return 'ОК';
  if (status === 'error') return 'Ошибка';
  return 'Не проверено';
}

function v23FormConsentStatusClass(status, hasForm) {
  if (hasForm === 'no') return 'not_started';
  if (status === 'ok') return 'ready';
  if (status === 'error') return 'problem';
  return 'not_started';
}

const __guruPrevV20EnsurePageAuditFieldsV23 = v20EnsurePageAuditFields;
v20EnsurePageAuditFields = function(row) {
  const normalized = __guruPrevV20EnsurePageAuditFieldsV23(row);
  normalized.hasForm = normalized.hasForm || '';
  normalized.formConsentStatus = normalized.formConsentStatus || '';
  normalized.formConsentEvidence = normalized.formConsentEvidence || '';
  normalized.formConsentIssue = normalized.formConsentIssue || '';
  return normalized;
};

const __guruPrevPageAuditControlsCompactHtmlV23 = pageAuditControlsCompactHtml;
pageAuditControlsCompactHtml = function(card, row, pageIndex) {
  v20EnsurePageAuditFields(row);
  const base = __guruPrevPageAuditControlsCompactHtmlV23(card, row, pageIndex);
  const consent = `<div class="v23-form-consent-inline">
    <label><span>Форма на странице</span><select data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="hasForm">
      <option value="" ${!row.hasForm ? 'selected' : ''}>Не проверено</option>
      <option value="yes" ${row.hasForm === 'yes' ? 'selected' : ''}>Есть форма</option>
      <option value="no" ${row.hasForm === 'no' ? 'selected' : ''}>Формы нет</option>
    </select></label>
    ${row.hasForm === 'yes' ? `<label><span>Согласие в форме</span><select data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="formConsentStatus">
      <option value="" ${!row.formConsentStatus ? 'selected' : ''}>Не проверено</option>
      <option value="ok" ${row.formConsentStatus === 'ok' ? 'selected' : ''}>ОК</option>
      <option value="error" ${row.formConsentStatus === 'error' ? 'selected' : ''}>Ошибка</option>
    </select></label>
    <label><span>Доказательство согласия</span><input data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="formConsentEvidence" value="${escapeAttr(row.formConsentEvidence || '')}" placeholder="скрин формы" /></label>
    <label><span>Причина, если проблема</span><input data-gate1-page-card-id="${escapeAttr(card.id)}" data-gate1-page-index="${pageIndex}" data-gate1-page-field="formConsentIssue" value="${escapeAttr(row.formConsentIssue || '')}" placeholder="короткая причина" /></label>` : ''}
  </div>`;
  return base.replace('</div>', consent + '</div>');
};

function v23AllPageRowsForConsent() {
  return allAuditPageCards().flatMap(card => {
    ensureGate1TypedData(card);
    return (card.pageRows || []).map((row, index) => {
      v20EnsurePageAuditFields(row);
      return { card, row, index };
    });
  });
}

function v23FormConsentSummaryStatus(card) {
  const rows = v23AllPageRowsForConsent().filter(item => String(item.row.url || '').trim() || item.row.hasForm);
  if (!rows.length) return 'not_started';
  if (rows.some(item => item.row.hasForm === 'yes' && item.row.formConsentStatus === 'error')) return 'problem';
  const relevant = rows.filter(item => item.row.hasForm === 'yes');
  if (!relevant.length && rows.some(item => item.row.hasForm === 'no')) return 'ready';
  if (relevant.length && relevant.every(item => item.row.formConsentStatus === 'ok' && String(item.row.formConsentEvidence || '').trim())) return 'ready';
  return 'in_progress';
}

function v23FormConsentSummaryHtml(card) {
  const rows = v23AllPageRowsForConsent();
  if (!rows.length) return '<div class="empty compact-empty">Страницы ещё не заведены.</div>';
  return `<div class="form-consent-summary context-panel v23-consent-summary">
    <div class="v23-summary-head">
      <strong>Согласие в формах</strong>
      <span>Сводка проблем. Заполнение выполняется внутри конкретной страницы и формы.</span>
      <span class="status-pill status-${v23FormConsentSummaryStatus(card)}">${escapeHtml(STATUS_LABELS[v23FormConsentSummaryStatus(card)] || v23FormConsentSummaryStatus(card))}</span>
    </div>
    <table class="mini-table typed-table">
      <thead><tr><th>Страница</th><th>Форма</th><th>Статус</th><th>Проблема / доказательство</th><th>Переход</th></tr></thead>
      <tbody>${rows.map(item => {
        const label = v23FormConsentLabel(item.row.formConsentStatus, item.row.hasForm);
        const cls = v23FormConsentStatusClass(item.row.formConsentStatus, item.row.hasForm);
        const proof = item.row.hasForm === 'yes'
          ? (item.row.formConsentStatus === 'error' ? (item.row.formConsentIssue || 'причина не указана') : (item.row.formConsentEvidence || 'доказательство не указано'))
          : '';
        return `<tr>
          <td>${escapeHtml(item.row.name || item.card.title)}</td>
          <td>${item.row.hasForm === 'yes' ? 'есть форма' : item.row.hasForm === 'no' ? 'формы нет' : 'не проверено'}</td>
          <td><span class="status-pill status-${cls}">${escapeHtml(label)}</span></td>
          <td>${escapeHtml(proof)}</td>
          <td><button class="small-btn" data-open-audit-page="${escapeAttr(item.card.id)}">Открыть страницу</button></td>
        </tr>`;
      }).join('')}</tbody>
    </table>
  </div>`;
}

const __guruPrevGate1TypedFieldsHtmlV23 = gate1TypedFieldsHtml;
gate1TypedFieldsHtml = function(card) {
  const mode = getGate1CardMode(card);
  if (mode === 'legal_cookie') return `<div class="field-row v23-legal-row">${v23LegalTrustHtml(card, 'cookie')}</div>`;
  if (mode === 'legal_footer') return `<div class="field-row v23-legal-row">${v23LegalTrustHtml(card, 'footer')}</div>`;
  if (mode === 'form_consent_summary') return `<div class="field-row v23-legal-row">${v23FormConsentSummaryHtml(card)}</div>`;
  return __guruPrevGate1TypedFieldsHtmlV23(card);
};

const __guruPrevRecalculateStatusForCardV23 = recalculateStatusForCard;
recalculateStatusForCard = function(card, workspace = state) {
  const mode = getGate1CardMode(card);
  if (mode === 'legal_cookie' || mode === 'legal_footer') {
    card.status = v23LegalTrustStatus(card);
    return;
  }
  if (mode === 'form_consent_summary') {
    card.status = v23FormConsentSummaryStatus(card);
    return;
  }
  return __guruPrevRecalculateStatusForCardV23(card, workspace);
};

const __guruPrevTypedDataPlainV23 = typedDataPlain;
typedDataPlain = function(card) {
  const mode = getGate1CardMode(card);
  if (mode === 'legal_cookie' || mode === 'legal_footer') {
    const type = mode === 'legal_cookie' ? 'cookie' : 'footer';
    const fields = ensureV23LegalTrustFields(card, type);
    const checks = v23LegalChecklist(type).map(item => `${item.label}: ${fields.checks?.[item.key] ? 'да' : 'нет'}`).join('; ');
    return `URL: ${fields.url || ''}\nСтатус: ${fields.status || 'не проверено'}\nДоказательство: ${fields.evidence || ''}\nЧек-пункты: ${checks}`;
  }
  if (mode === 'form_consent_summary') {
    return v23AllPageRowsForConsent().map(item => `${item.row.name || item.card.title}: ${v23FormConsentLabel(item.row.formConsentStatus, item.row.hasForm)}${item.row.formConsentIssue ? ` / ${item.row.formConsentIssue}` : ''}`).join('\n');
  }
  return __guruPrevTypedDataPlainV23(card);
};

const __guruPrevUpdateGate1PageRowV23 = updateGate1PageRow;
updateGate1PageRow = function(e) {
  __guruPrevUpdateGate1PageRowV23(e);
  const field = e.target.dataset.gate1PageField;
  if (['hasForm','formConsentStatus','formConsentEvidence','formConsentIssue'].includes(field)) renderGate();
};

document.addEventListener('change', event => {
  if (event.target?.dataset?.v23LegalField) updateV23LegalTrustField(event.target);
  if (event.target?.dataset?.v23LegalCheck) updateV23LegalTrustCheck(event.target);
});

document.addEventListener('input', event => {
  if (event.target?.dataset?.v23LegalField && event.target.tagName !== 'SELECT') updateV23LegalTrustField(event.target);
});


/* v0.24 — SSL / HTTPS: compact site-level block */
STATUS_LABELS.needs_attention = 'Требует внимания';
STATUS_LABELS.problem = 'Проблема';

function isSslHttpsCard(card) {
  const title = String(card?.title || '');
  return Boolean(isGate1Card(card) && /ssl|https|ssl shopper/i.test(title));
}

const SSL_HTTPS_INSTRUCTION = `Суть:
Проверить, что сайт безопасно открывается по HTTPS, сертификат валиден, цепочка корректна и браузер не показывает предупреждения.

Формула блока:
Домен → SSL-статус → доказательство → автоматический статус.

Не входит в блок:
Яндекс Вебмастер, Google Search Console, реклама, аналитика, CRM, формы, коллтрекинг и таблицы источников.`;

function cloneSslHttpsDefaults() {
  return { domain: '', status: '', result: '' };
}

function normalizeSslHttpsStatus(value = '') {
  const v = String(value || '').trim().toLowerCase();
  if (['ok', 'ready', 'valid', 'works', 'correct', 'yes', 'https'].includes(v)) return 'ok';
  if (['attention', 'warning', 'soon', 'expires_soon', 'needs_attention', 'needs_review'].includes(v)) return 'attention';
  if (['error', 'issue', 'expired', 'mismatch', 'untrusted', 'no_https', 'bad', 'problem'].includes(v)) return 'error';
  return value || '';
}

function ensureSslHttpsFields(card) {
  if (!card) return cloneSslHttpsDefaults();
  card.title = 'SSL / HTTPS';
  card.instruction = SSL_HTTPS_INSTRUCTION;
  if (!card.sslHttps) {
    const defaults = cloneSslHttpsDefaults();
    const oldTyped = card.gate1Typed || {};
    const oldLinks = Array.isArray(oldTyped.links) ? oldTyped.links : [];
    const firstLink = oldLinks.find(row => String(row?.url || '').trim()) || {};
    defaults.domain = firstLink.url || card.pages || state?.project?.website || '';
    defaults.status = normalizeSslHttpsStatus(firstLink.status || oldTyped.status || '');
    defaults.result = firstLink.comment || oldTyped.result || card.evidence || '';
    card.sslHttps = defaults;
  }
  card.sslHttps.status = normalizeSslHttpsStatus(card.sslHttps.status || '');
  return card.sslHttps;
}

const __guruPrevGetGate1CardModeV24 = getGate1CardMode;
getGate1CardMode = function(card) {
  if (isSslHttpsCard(card)) return 'ssl_https';
  return __guruPrevGetGate1CardModeV24(card);
};

const __guruPrevEnsureGate1TypedDataV24 = ensureGate1TypedData;
ensureGate1TypedData = function(card) {
  if (isSslHttpsCard(card)) {
    ensureSslHttpsFields(card);
    return;
  }
  return __guruPrevEnsureGate1TypedDataV24(card);
};

function sslHttpsSelect(value) {
  const options = [
    ['', 'Не проверено'],
    ['ok', 'ОК'],
    ['attention', 'Требует внимания'],
    ['error', 'Ошибка']
  ];
  return `<select class="ssl-https-select" data-ssl-https-field="status">
    ${options.map(([key, label]) => `<option value="${escapeAttr(key)}" ${value === key ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
  </select>`;
}

function sslHttpsFieldsHtml(card) {
  const fields = ensureSslHttpsFields(card);
  const tone = fields.status === 'ok' ? 'is-ok' : fields.status === 'attention' ? 'is-attention' : fields.status === 'error' ? 'is-issue' : '';
  return `<div class="ssl-https-workspace context-panel ${tone}">
    <div class="ssl-https-grid">
      <label>Проверяемый домен<input list="projectUrlOptions" data-ssl-https-field="domain" value="${escapeAttr(fields.domain || '')}" placeholder="https://site.ru" />${projectUrlDatalistHtml()}</label>
      <label>Статус SSL${sslHttpsSelect(fields.status || '')}</label>
      <label class="full">Доказательство / результат<input data-ssl-https-field="result" value="${escapeAttr(fields.result || '')}" placeholder="срок действия, ошибка, ссылка на отчёт или скрин" /></label>
    </div>
  </div>`;
}

const __guruPrevGate1TypedFieldsHtmlV24 = gate1TypedFieldsHtml;
gate1TypedFieldsHtml = function(card) {
  const mode = getGate1CardMode(card);
  ensureGate1TypedData(card);
  if (mode === 'ssl_https') return `<div class="field-row ssl-https-field-row">${sslHttpsFieldsHtml(card)}</div>`;
  return __guruPrevGate1TypedFieldsHtmlV24(card);
};

function sslHttpsStatus(card) {
  const fields = ensureSslHttpsFields(card);
  const domainFilled = Boolean(String(fields.domain || '').trim());
  const resultFilled = Boolean(String(fields.result || '').trim());
  if (!domainFilled) return 'not_started';
  if (fields.status === 'error') return 'problem';
  if (fields.status === 'attention') return 'needs_attention';
  if (fields.status === 'ok' && resultFilled) return 'ready';
  return 'in_progress';
}

const __guruPrevRecalculateStatusForCardV24 = recalculateStatusForCard;
recalculateStatusForCard = function(card, workspace = state) {
  if (isSslHttpsCard(card)) {
    card.status = sslHttpsStatus(card);
    return;
  }
  return __guruPrevRecalculateStatusForCardV24(card, workspace);
};

function updateSslHttpsField(target) {
  const cardId = target.closest('[data-card]')?.dataset?.card;
  const card = cardId ? findCard(cardId) : allCardsFromWorkspace(state).find(isSslHttpsCard);
  if (!card) return;
  const fields = ensureSslHttpsFields(card);
  const field = target.dataset.sslHttpsField;
  fields[field] = target.value;
  if (field === 'domain') addOrUpdateProjectLink(target.value, { comment: 'SSL / HTTPS', source: 'SSL' });
  recalculateStatusForCard(card);
  flashSaving();
  renderGate();
}

const __guruPrevTypedDataPlainV24 = typedDataPlain;
typedDataPlain = function(card) {
  if (getGate1CardMode(card) === 'ssl_https') {
    const fields = ensureSslHttpsFields(card);
    const statusLabel = fields.status === 'ok' ? 'ОК' : fields.status === 'attention' ? 'требует внимания' : fields.status === 'error' ? 'ошибка' : 'не проверено';
    return [`Домен: ${fields.domain || 'не указан'}`, `Статус SSL: ${statusLabel}`, `Доказательство: ${fields.result || 'не указано'}`].join('\n');
  }
  return __guruPrevTypedDataPlainV24(card);
};

const __guruPrevGate1WorkBlockHtmlV24 = gate1WorkBlockHtml;
gate1WorkBlockHtml = function(card, sectionTitle = 'Аналитика') {
  if (!isSslHttpsCard(card)) return __guruPrevGate1WorkBlockHtmlV24(card, sectionTitle);
  const accState = getGate1AccordionState();
  const isOpen = Boolean(accState.cards[card.id]);
  return `<article class="work-accordion-card ${isOpen ? 'is-open is-active' : ''}" data-card="${escapeAttr(card.id)}">
    <button class="work-card-header" data-gate1-toggle-card="${escapeAttr(card.id)}">
      <span class="work-card-main">
        <span class="analytics-path">Gate 1 → ${escapeHtml(sectionTitle)} → ${escapeHtml(card.title)}</span>
        <span class="work-card-title">${escapeHtml(card.title)}</span>
        <span class="work-card-preview">${escapeHtml(cardPreviewText(card))}</span>
      </span>
      <span class="status-pill status-${card.status}">${STATUS_LABELS[card.status] || card.status}</span>
      <span class="work-card-toggle">${isOpen ? 'Свернуть' : 'Раскрыть'}</span>
    </button>
    ${isOpen ? `<div class="work-card-body ssl-https-body">
      ${instructionToggleHtml(card)}
      <div class="card-fields">${cardUserFieldsHtml(card)}</div>
    </div>` : ''}
  </article>`;
};

document.addEventListener('change', event => {
  if (event.target?.dataset?.sslHttpsField) updateSslHttpsField(event.target);
});

document.addEventListener('input', event => {
  if (event.target?.dataset?.sslHttpsField && event.target.tagName !== 'SELECT') updateSslHttpsField(event.target);
});

(function markV24() {
  document.querySelectorAll('.launcher-kicker').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.24'); });
  document.querySelectorAll('.eyebrow').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.24'); });
})();


/* v0.29 — Юнит-экономика: один маршрут от чека к CPA/CPL и решению о запуске */

const UNIT_ECONOMICS_DEFAULT = {
  product: '',
  period: '',
  salesModel: '',
  finalCpaCpl: '',
  sections: {},
  openSection: ''
};

const UNIT_ECONOMICS_SECTIONS = [
  {
    key: 'revenue_aov',
    title: '1. Выручка / AOV',
    orient: 'Понять, сколько приносит одна продажа до рекламных расходов.',
    standard: 'Понятен средний чек, источник данных и период оценки.',
    fields: [
      ['aov', 'Средний чек'],
      ['source', 'Источник данных'],
      ['period', 'Период'],
      ['comment', 'Комментарий']
    ]
  },
  {
    key: 'margin',
    title: '2. Маржинальность',
    orient: 'Понять, сколько денег остаётся после себестоимости и переменных расходов.',
    standard: 'Понятна маржа, переменные расходы и валовая прибыль с продажи.',
    fields: [
      ['marginPercent', 'Маржа %'],
      ['variableCosts', 'Себестоимость / переменные расходы'],
      ['grossProfit', 'Валовая прибыль с продажи'],
      ['comment', 'Комментарий']
    ]
  },
  {
    key: 'ltv',
    title: '3. LTV',
    orient: 'Понять, считаем экономику по первой продаже или по долгой ценности клиента.',
    standard: 'Зафиксированы повторные покупки, среднее число покупок, LTV и допущение.',
    fields: [
      ['repeatPurchases', 'Повторные покупки'],
      ['avgPurchaseCount', 'Среднее число покупок'],
      ['ltv', 'LTV'],
      ['assumption', 'Допущение']
    ]
  },
  {
    key: 'drr',
    title: '4. Допустимый DRR',
    orient: 'Определить безопасную долю выручки, которую можно отдавать рекламе.',
    standard: 'Есть целевой DRR, причина лимита, безопасный коридор и статус риска.',
    fields: [
      ['targetDrr', 'Целевой DRR'],
      ['limitReason', 'Причина лимита'],
      ['safeCorridor', 'Безопасный коридор'],
      ['riskStatus', 'Статус риска']
    ]
  },
  {
    key: 'cpa_cpl',
    title: '5. Целевой CPA / CPL',
    orient: 'Рассчитать, сколько можно платить за клиента и за заявку.',
    standard: 'Есть конверсия из лида в продажу, допустимый CPA, допустимый CPL и решение.',
    fields: [
      ['leadToSaleConversion', 'Конверсия из лида в продажу'],
      ['allowedCpa', 'Допустимый CPA'],
      ['allowedCpl', 'Допустимый CPL'],
      ['decision', 'Решение']
    ]
  },
  {
    key: 'economic_limits',
    title: '6. Ограничения по экономике',
    orient: 'Отделить направления, которые можно запускать в рекламу, от экономически опасных.',
    standard: 'Понятно, что продвигать, что исключить, какой нужен тестовый бюджет и где риск.',
    fields: [
      ['promoteAllowed', 'Что можно продвигать'],
      ['promoteForbidden', 'Что нельзя продвигать'],
      ['minTestBudget', 'Минимальный бюджет теста'],
      ['risk', 'Риск']
    ]
  }
];

function ensureUnitEconomicsState() {
  if (!state) return structuredClone(UNIT_ECONOMICS_DEFAULT);
  state.unitEconomicsRoute = state.unitEconomicsRoute || structuredClone(UNIT_ECONOMICS_DEFAULT);
  state.unitEconomicsRoute.sections = state.unitEconomicsRoute.sections || {};
  UNIT_ECONOMICS_SECTIONS.forEach(section => {
    state.unitEconomicsRoute.sections[section.key] = state.unitEconomicsRoute.sections[section.key] || {};
    section.fields.forEach(([key]) => { state.unitEconomicsRoute.sections[section.key][key] = state.unitEconomicsRoute.sections[section.key][key] || ''; });
    state.unitEconomicsRoute.sections[section.key].evidence = state.unitEconomicsRoute.sections[section.key].evidence || '';
  });
  return state.unitEconomicsRoute;
}

function parseUnitNumber(value) {
  const cleaned = String(value || '').replace(/\s/g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : 0;
}

function parseUnitRate(value) {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  const number = parseUnitNumber(raw);
  if (!number) return 0;
  if (raw.includes('%') || number > 1) return number / 100;
  return number;
}

function formatUnitMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '—';
  return Math.round(number).toLocaleString('ru-RU') + ' ₽';
}

function unitEconomicsComputed() {
  const route = ensureUnitEconomicsState();
  const revenue = route.sections.revenue_aov || {};
  const margin = route.sections.margin || {};
  const drr = route.sections.drr || {};
  const cpa = route.sections.cpa_cpl || {};
  const limits = route.sections.economic_limits || {};
  const aov = parseUnitNumber(revenue.aov);
  const marginRate = parseUnitRate(margin.marginPercent);
  const drrRate = parseUnitRate(drr.targetDrr);
  const conversionRate = parseUnitRate(cpa.leadToSaleConversion);
  const grossProfit = parseUnitNumber(margin.grossProfit) || (aov && marginRate ? aov * marginRate : 0);
  const allowedCpaAuto = aov && marginRate && drrRate ? aov * marginRate * drrRate : 0;
  const allowedCpaManual = parseUnitNumber(cpa.allowedCpa);
  const allowedCpa = allowedCpaManual || allowedCpaAuto;
  const allowedCplAuto = allowedCpa && conversionRate ? allowedCpa * conversionRate : 0;
  const allowedCplManual = parseUnitNumber(cpa.allowedCpl);
  const allowedCpl = allowedCplManual || allowedCplAuto;
  const marginProblem = Boolean(marginRate && marginRate < 0.1);
  const riskText = [drr.riskStatus, limits.risk, cpa.decision].join(' ').toLowerCase();
  const explicitProblem = /слишком низк|не запуск|нельзя|убыт|критич|выше допустим|проблем/i.test(riskText);
  return { aov, marginRate, drrRate, conversionRate, grossProfit, allowedCpa, allowedCpl, marginProblem, explicitProblem };
}

function unitSectionFilled(section) {
  const route = ensureUnitEconomicsState();
  const data = route.sections?.[section.key] || {};
  const filledFields = section.fields.filter(([key]) => String(data[key] || '').trim()).length;
  if (section.key === 'revenue_aov') return Boolean(String(data.aov || '').trim() && String(data.period || '').trim());
  if (section.key === 'margin') return Boolean(String(data.marginPercent || '').trim() && (String(data.grossProfit || '').trim() || String(data.variableCosts || '').trim()));
  if (section.key === 'drr') return Boolean(String(data.targetDrr || '').trim());
  if (section.key === 'cpa_cpl') return Boolean((String(data.allowedCpa || '').trim() || unitEconomicsComputed().allowedCpa) && (String(data.allowedCpl || '').trim() || unitEconomicsComputed().allowedCpl) && String(data.decision || '').trim());
  if (section.key === 'economic_limits') return Boolean(String(data.promoteAllowed || '').trim() || String(data.promoteForbidden || '').trim());
  return filledFields >= Math.min(2, section.fields.length);
}

function unitSectionTouched(section) {
  const route = ensureUnitEconomicsState();
  const data = route.sections?.[section.key] || {};
  return section.fields.some(([key]) => String(data[key] || '').trim()) || String(data.evidence || '').trim();
}

function unitSectionStatus(section) {
  if (unitSectionFilled(section)) return 'ready';
  if (unitSectionTouched(section)) return 'in_progress';
  return 'not_started';
}

function unitEconomicsChecks() {
  const route = ensureUnitEconomicsState();
  const c = unitEconomicsComputed();
  const issues = [];
  const revenue = route.sections.revenue_aov || {};
  const margin = route.sections.margin || {};
  const cpa = route.sections.cpa_cpl || {};
  if (!String(route.product || '').trim()) issues.push({ level: 'problem', text: 'Нет продукта / услуги — экономику нельзя считать.' });
  if (!String(revenue.aov || '').trim()) issues.push({ level: 'in_progress', text: 'Нет AOV / среднего чека.' });
  if (String(revenue.aov || '').trim() && !String(margin.marginPercent || '').trim()) issues.push({ level: 'in_progress', text: 'Есть AOV, но нет маржинальности.' });
  if (String(revenue.aov || '').trim() && String(margin.marginPercent || '').trim() && !c.allowedCpa && !String(cpa.allowedCpa || '').trim()) issues.push({ level: 'in_progress', text: 'Есть AOV и маржа, но не рассчитан CPA / CPL.' });
  if (c.marginProblem) issues.push({ level: 'problem', text: 'Маржа слишком низкая для безопасного запуска рекламы.' });
  if (c.explicitProblem) issues.push({ level: 'problem', text: 'В решении или рисках указано экономическое ограничение.' });
  return issues;
}

function getUnitEconomicsStatus() {
  const route = ensureUnitEconomicsState();
  if (!String(route.product || '').trim()) return 'not_started';
  const issues = unitEconomicsChecks();
  if (issues.some(i => i.level === 'problem')) return 'problem';
  const cpaData = route.sections.cpa_cpl || {};
  const c = unitEconomicsComputed();
  if ((c.allowedCpa || String(cpaData.allowedCpa || '').trim()) && (c.allowedCpl || String(cpaData.allowedCpl || '').trim()) && String(cpaData.decision || '').trim()) return 'ready';
  return 'in_progress';
}

function getUnitEconomicsProgressText() {
  const ready = UNIT_ECONOMICS_SECTIONS.filter(unitSectionFilled).length;
  return `${ready} из ${UNIT_ECONOMICS_SECTIONS.length} разделов готово`;
}

function firstIncompleteUnitSectionKey() {
  const found = UNIT_ECONOMICS_SECTIONS.find(section => !unitSectionFilled(section));
  return found?.key || 'cpa_cpl';
}

function unitInput(name, label, type = 'text', placeholder = '') {
  const route = ensureUnitEconomicsState();
  const value = route[name] || '';
  const tag = type === 'textarea'
    ? `<textarea data-unit-field="${escapeAttr(name)}" placeholder="${escapeAttr(placeholder)}">${escapeHtml(value)}</textarea>`
    : `<input data-unit-field="${escapeAttr(name)}" value="${escapeAttr(value)}" placeholder="${escapeAttr(placeholder)}" />`;
  return `<label class="demand-field"><span>${escapeHtml(label)}</span>${tag}</label>`;
}

function renderUnitEconomicsRoute(section) {
  const route = ensureUnitEconomicsState();
  const status = getUnitEconomicsStatus();
  const issues = unitEconomicsChecks();
  const openSection = route.openSection || firstIncompleteUnitSectionKey();
  const c = unitEconomicsComputed();
  const drrLabel = c.drrRate ? Math.round(c.drrRate * 1000) / 10 + '%' : '—';
  const cplDecision = route.sections?.cpa_cpl?.decision || '—';
  return `<div class="demand-route unit-economics-route">
    <div class="demand-route-head">
      <div>
        <div class="analytics-path">Gate 1 → Юнит-экономика</div>
        <h3>Юнит-экономика: решение о запуске рекламы</h3>
        <p class="muted">Чек → маржа → LTV → DRR → CPA/CPL → решение о запуске.</p>
      </div>
      <span class="status-pill status-${status}">${escapeHtml(STATUS_LABELS[status] || status)}</span>
    </div>
    <section class="demand-frame">
      <div class="demand-section-title"><div><h4>Верх блока</h4><p class="muted">Главный итог — сколько можно платить за заявку / клиента и можно ли запускать рекламу.</p></div></div>
      <div class="demand-grid three">
        ${unitInput('product', 'Продукт / услуга', 'text', 'что считаем')}
        ${unitInput('period', 'Период оценки', 'text', 'месяц / квартал / сезон')}
        ${unitInput('salesModel', 'Модель продажи', 'text', 'заявка / звонок / покупка / бронь')}
        ${unitInput('finalCpaCpl', 'Финальный допустимый CPA / CPL', 'textarea', 'главный итог блока')}
      </div>
    </section>
    <section class="unit-result context-panel">
      <div class="demand-section-title"><div><h4>Финальный результат</h4><p class="muted">Расчёт обновляется из AOV, маржи, DRR и конверсии.</p></div></div>
      <div class="unit-summary-grid">
        <div><span>Допустимый CPA</span><strong>${escapeHtml(formatUnitMoney(c.allowedCpa))}</strong></div>
        <div><span>Допустимый CPL</span><strong>${escapeHtml(formatUnitMoney(c.allowedCpl))}</strong></div>
        <div><span>Допустимый DRR</span><strong>${escapeHtml(drrLabel)}</strong></div>
        <div><span>Решение</span><strong>${escapeHtml(cplDecision)}</strong></div>
      </div>
      <div class="unit-promo-split">
        <div><span>Что можно продвигать</span><p>${escapeHtml(route.sections?.economic_limits?.promoteAllowed || '—')}</p></div>
        <div><span>Что нельзя продвигать</span><p>${escapeHtml(route.sections?.economic_limits?.promoteForbidden || '—')}</p></div>
      </div>
    </section>
    <div class="demand-steps unit-steps">
      ${UNIT_ECONOMICS_SECTIONS.map(item => unitSectionHtml(route, item, openSection === item.key)).join('')}
    </div>
    <section class="demand-checks ${issues.length ? '' : 'is-ok'}">
      <h4>Автоматические проверки</h4>
      ${issues.length ? issues.map(issue => `<div class="demand-check ${issue.level}">${escapeHtml(issue.text)}</div>`).join('') : '<div class="demand-check ready">Критичных ошибок нет. Проверьте итоговое решение и ограничения.</div>'}
    </section>
  </div>`;
}

function unitSectionHtml(route, section, isOpen) {
  const data = route.sections?.[section.key] || {};
  const status = unitSectionStatus(section);
  return `<article class="demand-step unit-step ${isOpen ? 'is-open' : ''}">
    <button class="demand-step-head" data-unit-toggle-section="${escapeAttr(section.key)}">
      <span><strong>${escapeHtml(section.title)}</strong><small>${escapeHtml(section.orient)}</small></span>
      <span class="status-pill status-${status}">${escapeHtml(STATUS_LABELS[status] || status)}</span>
    </button>
    ${isOpen ? `<div class="pain-step-body">
      <div class="pain-standard"><strong>Стандарт готовности:</strong> ${escapeHtml(section.standard)}</div>
      <div class="demand-step-body">
        ${section.fields.map(([key, label]) => `<label class="demand-field"><span>${escapeHtml(label)}</span><textarea data-unit-section="${escapeAttr(section.key)}" data-unit-section-field="${escapeAttr(key)}" placeholder="результат">${escapeHtml(data[key] || '')}</textarea></label>`).join('')}
        <label class="demand-field"><span>Доказательство</span><textarea data-unit-section="${escapeAttr(section.key)}" data-unit-section-field="evidence" placeholder="ссылка, источник расчёта или короткий вывод">${escapeHtml(data.evidence || '')}</textarea></label>
      </div>
    </div>` : ''}
  </article>`;
}

function bindUnitEconomicsRouteEvents() {
  document.querySelectorAll('[data-unit-field]').forEach(input => {
    input.addEventListener('input', e => {
      const route = ensureUnitEconomicsState();
      route[e.target.dataset.unitField] = e.target.value;
      saveState();
    });
    input.addEventListener('change', e => {
      const route = ensureUnitEconomicsState();
      route[e.target.dataset.unitField] = e.target.value;
      saveState();
      renderGate();
    });
  });
  document.querySelectorAll('[data-unit-toggle-section]').forEach(btn => btn.addEventListener('click', () => {
    const route = ensureUnitEconomicsState();
    route.openSection = route.openSection === btn.dataset.unitToggleSection ? '' : btn.dataset.unitToggleSection;
    saveState();
    renderGate();
  }));
  document.querySelectorAll('[data-unit-section]').forEach(input => {
    input.addEventListener('input', e => {
      const route = ensureUnitEconomicsState();
      const section = e.target.dataset.unitSection;
      const field = e.target.dataset.unitSectionField;
      route.sections[section] = route.sections[section] || {};
      route.sections[section][field] = e.target.value;
      saveState();
    });
    input.addEventListener('change', e => {
      const route = ensureUnitEconomicsState();
      const section = e.target.dataset.unitSection;
      const field = e.target.dataset.unitSectionField;
      route.sections[section] = route.sections[section] || {};
      route.sections[section][field] = e.target.value;
      saveState();
      renderGate();
    });
  });
}

const __guruPrevRenderGate1AccordionV27 = renderGate1Accordion;
renderGate1Accordion = function(gate, cards) {
  const sections = getGate1Sections(gate, cards);
  const accState = getGate1AccordionState();
  const queryActive = els.searchInput.value.trim() || els.statusFilter.value !== 'all';
  els.contentArea.innerHTML = `<div class="analytics-accordion">
    <div class="analytics-intro">
      <div class="analytics-path">Gate 1 → Аналитика</div>
      <h2>Gate 1, Аналитика</h2>
      <p class="muted">Сначала видны четыре смысловых уровня. Раскрытый уровень становится главным рабочим полем.</p>
    </div>
    ${sections.map(section => {
      const sectionOpen = Boolean(accState.subblocks[section.key]);
      const status = section.key === 'demand_semantics' ? getDemandRouteStatus()
        : section.key === 'pain_jtbd_offer' ? getPainOfferStatus()
        : section.key === 'unit_economics' ? getUnitEconomicsStatus()
        : getSectionStatus(section.allInnerCards);
      const progressText = section.key === 'demand_semantics' ? getDemandProgressText()
        : section.key === 'pain_jtbd_offer' ? getPainOfferProgressText()
        : section.key === 'unit_economics' ? getUnitEconomicsProgressText()
        : getSectionProgressText(section.allInnerCards);
      const displayCards = queryActive ? section.filteredInnerCards : section.allInnerCards;
      return `<section class="analytics-subblock ${sectionOpen ? 'is-open is-active' : ''}">
        <button class="subblock-header" data-gate1-toggle-section="${escapeAttr(section.key)}">
          <span class="subblock-main">
            <span class="analytics-path">Gate 1 → ${escapeHtml(section.title)}</span>
            <span class="subblock-title">${escapeHtml(section.title)}</span>
            <span class="subblock-progress">${escapeHtml(progressText)}</span>
          </span>
          <span class="status-pill status-${status}">${escapeHtml(STATUS_LABELS[status] || status)}</span>
          <span class="subblock-toggle">${sectionOpen ? 'Закрыть' : 'Открыть'}</span>
        </button>
        ${sectionOpen ? `<div class="subblock-body">
          ${section.key === 'demand_semantics' ? renderDemandRoute(section)
            : section.key === 'pain_jtbd_offer' ? renderPainOfferRoute(section)
            : section.key === 'unit_economics' ? renderUnitEconomicsRoute(section)
            : (displayCards.length ? displayCards.map(card => gate1WorkBlockHtml(card, section.title)).join('') : '<div class="empty compact-empty">По текущему фильтру внутри подблока ничего не найдено.</div>')}
        </div>` : ''}
      </section>`;
    }).join('')}
  </div>`;
  bindGate1Accordion();
  bindDemandRouteEvents();
  bindPainOfferRouteEvents();
  bindUnitEconomicsRouteEvents();
  bindCardInputs();
};

(function markV27() {
  document.querySelectorAll('.launcher-kicker').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.29'); });
  document.querySelectorAll('.eyebrow').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.29'); });
})();

/* v0.29 — Gate 5 integrated advertising reporting loop */
STATUS_LABELS.needs_attention = STATUS_LABELS.needs_attention || 'Требует внимания';

const GATE5_REPORTS = {
  perf: { title: 'Перфоманс-кампании', short: 'Перфоманс', desc: 'расход, показы, клики, конверсии, кампании, группы и объявления' },
  query: { title: 'Поисковые запросы', short: 'Запросы', desc: 'реальные запросы, кандидаты на минус-слова и слабые зоны' },
  placement: { title: 'Условия показа', short: 'Условия', desc: 'таргетинги, фразы, автотаргетинг и причины показа' }
};

function gate5BlankState() {
  return {
    ui: { openBlock: 'setup' },
    setup: { projectName: '', campaigns: {}, groups: {}, ads: {} },
    reports: { perf: [], query: [], placement: [] },
    imports: {},
    goals: [],
    links: [],
    pending: {}
  };
}

function ensureGate5State() {
  state.gate5 = state.gate5 || gate5BlankState();
  state.gate5.ui = state.gate5.ui || { openBlock: 'setup' };
  state.gate5.setup = state.gate5.setup || { projectName: '', campaigns: {}, groups: {}, ads: {} };
  state.gate5.setup.campaigns = state.gate5.setup.campaigns || {};
  state.gate5.setup.groups = state.gate5.setup.groups || {};
  state.gate5.setup.ads = state.gate5.setup.ads || {};
  state.gate5.reports = state.gate5.reports || { perf: [], query: [], placement: [] };
  state.gate5.reports.perf = Array.isArray(state.gate5.reports.perf) ? state.gate5.reports.perf : [];
  state.gate5.reports.query = Array.isArray(state.gate5.reports.query) ? state.gate5.reports.query : [];
  state.gate5.reports.placement = Array.isArray(state.gate5.reports.placement) ? state.gate5.reports.placement : [];
  state.gate5.imports = state.gate5.imports || {};
  state.gate5.goals = Array.isArray(state.gate5.goals) ? state.gate5.goals : [];
  state.gate5.links = Array.isArray(state.gate5.links) ? state.gate5.links : [];
  state.gate5.pending = state.gate5.pending || {};
  return state.gate5;
}

function g5Esc(value) { return escapeHtml(value == null ? '' : value); }
function g5Attr(value) { return escapeAttr(value == null ? '' : value); }
function g5Slug(value) { return String(value || '').trim().toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'unknown'; }
function g5Num(value) {
  if (value == null) return 0;
  let s = String(value).trim();
  if (!s || s === '-' || s === '—') return 0;
  s = s.replace(/[\s\u00a0\u202f₽%]/g, '').replace(',', '.');
  const x = parseFloat(s);
  return Number.isFinite(x) ? x : 0;
}
function g5Div(a, b) { return b ? a / b : 0; }
function g5Int(value) { return Math.round(value || 0).toLocaleString('ru-RU'); }
function g5Rub(value) { return Math.round(value || 0).toLocaleString('ru-RU') + ' ₽'; }
function g5Pct(value) { return ((value || 0) * 100).toFixed(1).replace('.', ',') + '%'; }
function g5DateTime(iso) { try { return iso ? new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'; } catch (_) { return iso || '—'; } }
function g5ParseDate(value) {
  let s = String(value || '').trim();
  if (!s || /итого|total/i.test(s)) return '';
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}
function g5NormHeader(value) { return String(value || '').trim().toLowerCase().replace(/["«»]/g, '').replace(/ё/g, 'е').replace(/[,.;:()]/g, ' ').replace(/\s+/g, ' ').trim(); }
function g5FindCol(headers, aliases, contains = false) {
  const normalized = headers.map(g5NormHeader);
  const needles = aliases.map(g5NormHeader);
  for (const needle of needles) {
    const exact = normalized.indexOf(needle);
    if (exact >= 0) return exact;
  }
  if (contains) {
    for (let i = 0; i < normalized.length; i += 1) {
      if (needles.some(needle => normalized[i].includes(needle))) return i;
    }
  }
  return -1;
}
function g5Col(headers, exact, contains) {
  const i = g5FindCol(headers, exact || []);
  return i >= 0 ? i : g5FindCol(headers, contains || exact || [], true);
}
function g5MapColumns(headers) {
  return {
    date: g5Col(headers, ['День', 'Дата', 'Date'], ['день', 'дата', 'date']),
    campaignId: g5Col(headers, ['№ Кампании','№ кампании','№ Компании','Номер кампании','Campaign ID','ID Campaign'], ['№ камп','номер камп','campaign id','id campaign']),
    campaignName: g5Col(headers, ['Название кампании','Название компании','Кампания','Campaign Name'], ['название камп','campaign name']),
    groupId: g5Col(headers, ['№ Группы','№ группы','Номер группы','Group ID','ID Group'], ['№ групп','номер групп','group id','id group']),
    groupName: g5Col(headers, ['Название группы','Название группы объявлений','Группа','Group Name','Ad Group'], ['название групп','group name','ad group']),
    adId: g5Col(headers, ['№ Объявления','№ объявления','Номер объявления','Ad ID','ID Ad'], ['№ объяв','номер объяв','ad id','id ad']),
    adTitle: g5Col(headers, ['Заголовок объявления','Заголовок 1','Заголовок','Название объявления','Ad Title','Title'], ['заголовок','ad title','название объяв']),
    landing: g5Col(headers, ['Посадочная','Посадочная страница','URL','Landing Page','Ссылка'], ['посадоч','url','landing','ссылка']),
    query: g5Col(headers, ['Поисковый запрос','Search Query','Запрос'], ['поисковый запрос','search query','запрос']),
    conditionType: g5Col(headers, ['Тип условия показа','Тип условия','Condition Type'], ['тип условия','condition type']),
    conditionName: g5Col(headers, ['Условие показа','Ключевая фраза','Фраза','Keyword','Condition'], ['условие показа','ключевая фраза','keyword','condition']),
    impressions: g5Col(headers, ['Показы','Impressions'], ['показы','impressions']),
    clicks: g5Col(headers, ['Клики','Clicks'], ['клики','clicks']),
    spend: g5Col(headers, ['Расход','Расход ₽','Расход, ₽','Cost','Spend'], ['расход','cost','spend']),
    conversions: g5ConvCol(headers)
  };
}
function g5ConvCol(headers) {
  let exact = g5Col(headers, ['Конверсии', 'Conversions', 'Лиды', 'Leads'], ['конверсии', 'conversions', 'лиды', 'leads']);
  if (exact >= 0) return exact;
  for (let i = 0; i < headers.length; i += 1) {
    const h = g5NormHeader(headers[i]);
    if (h.includes('конверс') && !h.includes('%') && !h.includes('cpa') && !h.includes('цена')) return i;
  }
  return -1;
}
function g5DetectDelimiter(line) {
  const variants = [',', ';', '\t'];
  let best = ',', bestCount = -1;
  variants.forEach(delim => {
    let count = 0, quote = false;
    for (let i = 0; i < line.length; i += 1) {
      const c = line[i];
      if (c === '"') quote = !quote;
      else if (c === delim && !quote) count += 1;
    }
    if (count > bestCount) { best = delim; bestCount = count; }
  });
  return best;
}
function g5ParseCSV(text) {
  text = String(text || '').replace(/^\uFEFF/, '');
  const delim = g5DetectDelimiter(text.split(/\r?\n/)[0] || ',');
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (c === delim && !quoted) {
      row.push(cell); cell = '';
    } else if ((c === '\n' || c === '\r') && !quoted) {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell);
      if (row.some(x => String(x).trim())) rows.push(row.map(x => String(x).trim()));
      row = []; cell = '';
    } else cell += c;
  }
  row.push(cell);
  if (row.some(x => String(x).trim())) rows.push(row.map(x => String(x).trim()));
  return rows;
}
async function g5ReadTableFile(file) {
  const name = (file.name || '').toLowerCase();
  const buf = await file.arrayBuffer();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    if (!window.XLSX) throw new Error('XLSX-библиотека не загрузилась. Сохрани файл как CSV или проверь интернет.');
    const wb = XLSX.read(buf, { type: 'array', cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  }
  const bytes = new Uint8Array(buf);
  let text;
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) text = new TextDecoder('utf-16le').decode(bytes.subarray(2));
  else if (bytes[0] === 0xFE && bytes[1] === 0xFF) text = new TextDecoder('utf-16be').decode(bytes.subarray(2));
  else text = new TextDecoder('utf-8').decode(bytes[(bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) ? 'subarray' : 'slice']((bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) ? 3 : 0));
  return g5ParseCSV(text);
}
function g5BestHeaderRow(rows, kind = 'report') {
  let best = 0, scoreMax = -1;
  for (let i = 0; i < Math.min(rows.length, 35); i += 1) {
    const cols = g5MapColumns(rows[i] || []);
    let score = 0;
    ['campaignId','campaignName','groupId','groupName','adId','adTitle'].forEach(k => { if (cols[k] >= 0) score += 1; });
    if (kind === 'report') ['date','impressions','clicks','spend','conversions'].forEach(k => { if (cols[k] >= 0) score += 2; });
    if (kind === 'structure') ['campaignId','groupId','adId'].forEach(k => { if (cols[k] >= 0) score += 2; });
    if (score > scoreMax) { best = i; scoreMax = score; }
  }
  return best;
}
function g5Cell(row, index) { return index >= 0 && index < row.length ? String(row[index] || '').trim() : ''; }
function g5RecordId(id, name, prefix) { return String(id || '').trim() || `${prefix}_${g5Slug(name)}`; }
function g5ExtractRows(rows, kind = 'report') {
  const hi = g5BestHeaderRow(rows, kind === 'structure' ? 'structure' : 'report');
  const headers = rows[hi] || [];
  const c = g5MapColumns(headers);
  const out = [];
  for (let i = hi + 1; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const first = row.find(x => String(x).trim()) || '';
    if (/^итого$|^total$/i.test(String(first).trim())) continue;
    const rec = {
      date: g5ParseDate(g5Cell(row, c.date)),
      campaignId: g5Cell(row, c.campaignId),
      campaignName: g5Cell(row, c.campaignName),
      groupId: g5Cell(row, c.groupId),
      groupName: g5Cell(row, c.groupName),
      adId: g5Cell(row, c.adId),
      adTitle: g5Cell(row, c.adTitle),
      landing: g5Cell(row, c.landing),
      query: g5Cell(row, c.query),
      conditionType: g5Cell(row, c.conditionType),
      conditionName: g5Cell(row, c.conditionName),
      impressions: g5Num(g5Cell(row, c.impressions)),
      clicks: g5Num(g5Cell(row, c.clicks)),
      spend: g5Num(g5Cell(row, c.spend)),
      conversions: g5Num(g5Cell(row, c.conversions))
    };
    if (!rec.campaignId && rec.campaignName) rec.campaignId = g5RecordId('', rec.campaignName, 'camp');
    if (!rec.groupId && rec.groupName) rec.groupId = g5RecordId('', `${rec.campaignId}_${rec.groupName}`, 'grp');
    if (!rec.adId && rec.adTitle) rec.adId = g5RecordId('', `${rec.groupId}_${rec.adTitle}`, 'ad');
    if (!rec.date) rec.date = new Date().toISOString().slice(0, 10);
    if (kind === 'structure' && !(rec.campaignId || rec.campaignName || rec.groupId || rec.groupName || rec.adId || rec.adTitle)) continue;
    if (kind === 'query' && !rec.query) continue;
    if (kind === 'placement' && !(rec.conditionType || rec.conditionName)) continue;
    if (kind !== 'structure' && !(rec.impressions || rec.clicks || rec.spend || rec.conversions)) continue;
    out.push(rec);
  }
  const dates = out.map(x => x.date).filter(Boolean).sort();
  return { records: out, cols: c, headers, meta: { rows: out.length, from: dates[0] || '', to: dates[dates.length - 1] || '', uploadedAt: new Date().toISOString() } };
}
function g5SyncStructure(records) {
  const g5 = ensureGate5State();
  (records || []).forEach(r => {
    const campaignId = g5RecordId(r.campaignId, r.campaignName, 'camp');
    if (campaignId || r.campaignName) g5.setup.campaigns[campaignId] = { id: campaignId, name: r.campaignName || campaignId };
    const groupId = r.groupId ? g5RecordId(r.groupId, r.groupName, 'grp') : '';
    if (groupId) g5.setup.groups[groupId] = { id: groupId, campaignId, name: r.groupName || groupId, landing: r.landing || '' };
    const adId = r.adId ? g5RecordId(r.adId, r.adTitle, 'ad') : '';
    if (adId) g5.setup.ads[adId] = { id: adId, campaignId, groupId, title: r.adTitle || adId, landing: r.landing || '' };
  });
}
function g5AddM(dst, src) { dst.impressions = (dst.impressions || 0) + g5Num(src.impressions); dst.clicks = (dst.clicks || 0) + g5Num(src.clicks); dst.spend = (dst.spend || 0) + g5Num(src.spend); dst.conversions = (dst.conversions || 0) + g5Num(src.conversions); return dst; }
function g5Metrics(obj) { const im = g5Num(obj.impressions), cl = g5Num(obj.clicks), sp = g5Num(obj.spend), cv = g5Num(obj.conversions); return { impressions: im, clicks: cl, spend: sp, conversions: cv, ctr: g5Div(cl, im), cr: g5Div(cv, cl), cpa: g5Div(sp, cv) }; }
function g5ActiveGoal() { const g5 = ensureGate5State(); return g5.goals.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null; }
function g5LatestLink() { const g5 = ensureGate5State(); return g5.links.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null; }
function g5BuildModel() {
  const g5 = ensureGate5State();
  const model = { total: { impressions: 0, clicks: 0, spend: 0, conversions: 0 }, campaigns: {}, groups: {}, ads: {}, queries: [], placements: [] };
  function ensureCampaign(id, name) { id = g5RecordId(id, name, 'camp'); const item = model.campaigns[id] || { id, name: name || g5.setup.campaigns[id]?.name || id, impressions: 0, clicks: 0, spend: 0, conversions: 0 }; if (name) item.name = name; model.campaigns[id] = item; return item; }
  function ensureGroup(id, campaignId, name, landing) { id = g5RecordId(id, `${campaignId}_${name || 'group'}`, 'grp'); const item = model.groups[id] || { id, campaignId, name: name || g5.setup.groups[id]?.name || id, landing: landing || g5.setup.groups[id]?.landing || '', impressions: 0, clicks: 0, spend: 0, conversions: 0 }; model.groups[id] = item; return item; }
  function ensureAd(id, campaignId, groupId, title, landing) { id = g5RecordId(id, `${groupId}_${title || 'ad'}`, 'ad'); const item = model.ads[id] || { id, campaignId, groupId, title: title || g5.setup.ads[id]?.title || id, landing: landing || g5.setup.ads[id]?.landing || '', impressions: 0, clicks: 0, spend: 0, conversions: 0 }; model.ads[id] = item; return item; }
  Object.values(g5.setup.campaigns).forEach(c => ensureCampaign(c.id, c.name));
  Object.values(g5.setup.groups).forEach(gr => ensureGroup(gr.id, gr.campaignId, gr.name, gr.landing));
  Object.values(g5.setup.ads).forEach(a => ensureAd(a.id, a.campaignId, a.groupId, a.title, a.landing));
  g5.reports.perf.forEach(r => {
    const cid = g5RecordId(r.campaignId, r.campaignName, 'camp');
    const gid = g5RecordId(r.groupId, `${cid}_${r.groupName || 'group'}`, 'grp');
    const aid = r.adId ? g5RecordId(r.adId, r.adTitle, 'ad') : '';
    g5AddM(ensureCampaign(cid, r.campaignName), r);
    g5AddM(ensureGroup(gid, cid, r.groupName || 'Кампания целиком', r.landing), r);
    if (aid) g5AddM(ensureAd(aid, cid, gid, r.adTitle || aid, r.landing), r);
    g5AddM(model.total, r);
  });
  g5.reports.query.forEach(r => { model.queries.push(r); });
  g5.reports.placement.forEach(r => { model.placements.push(r); });
  return model;
}
function g5RowMetrics(row) { const m = g5Metrics(row); return { spend: g5Rub(m.spend), impressions: g5Int(m.impressions), clicks: g5Int(m.clicks), conversions: g5Int(m.conversions), ctr: g5Pct(m.ctr), cr: g5Pct(m.cr), cpa: m.conversions ? g5Rub(m.cpa) : '—' }; }
function g5Finance() {
  const model = g5BuildModel();
  const link = g5LatestLink();
  const revenue = link ? (g5Num(link.actualRevenue) || g5Num(link.orders) * (g5Num(link.avgCheck) || g5Num(link.minCheck))) : 0;
  const marginRate = link ? g5Num(link.margin) / 100 : 0;
  const gross = revenue * (marginRate || 1);
  const spend = model.total.spend;
  const leads = model.total.conversions;
  const orders = link ? g5Num(link.orders) : 0;
  return { model, link, revenue, gross, spend, leads, orders, cpa: g5Div(spend, leads), cac: g5Div(spend, orders), roas: g5Div(revenue, spend), drr: g5Div(spend, revenue), roi: g5Div((marginRate ? gross : revenue) - spend, spend) };
}
function g5ProblemStatusForMetric(metric, target) {
  if (!target || !metric) return 'in_progress';
  return metric <= target ? 'ready' : 'problem';
}
function getGate5Status() {
  const g5 = ensureGate5State();
  const hasReports = Object.values(g5.reports).some(arr => Array.isArray(arr) && arr.length);
  const hasStructure = Object.keys(g5.setup.campaigns).length || Object.keys(g5.setup.groups).length || Object.keys(g5.setup.ads).length;
  const goal = g5ActiveGoal();
  const link = g5LatestLink();
  const f = g5Finance();
  if (!hasReports && !hasStructure) return 'not_started';
  if (hasStructure && !goal) return 'in_progress';
  if (hasReports && goal && !link) return 'in_progress';
  if (goal && ((goal.cpa && f.cpa > goal.cpa) || (goal.cac && f.cac > goal.cac) || (goal.drr && f.drr > goal.drr / 100))) return 'problem';
  if (hasReports && goal && link && f.revenue) return 'ready';
  return 'in_progress';
}
function getGate5BlockStatus(key) {
  const g5 = ensureGate5State();
  const f = g5Finance();
  const goal = g5ActiveGoal();
  if (key === 'setup') return Object.keys(g5.setup.campaigns).length || Object.keys(g5.setup.groups).length || Object.keys(g5.setup.ads).length ? 'ready' : 'not_started';
  if (key === 'input') return Object.values(g5.reports).some(x => x.length) ? (goal ? 'ready' : 'in_progress') : 'not_started';
  if (key === 'ad') return g5.reports.perf.length ? (f.cpa && goal?.cpa && f.cpa > goal.cpa ? 'problem' : 'ready') : 'not_started';
  if (key === 'bridge') return g5LatestLink() ? 'ready' : (f.leads ? 'in_progress' : 'not_started');
  if (key === 'finance') return f.revenue ? (goal && ((goal.cpa && f.cpa > goal.cpa) || (goal.cac && f.cac > goal.cac) || (goal.drr && f.drr > goal.drr / 100)) ? 'problem' : 'ready') : 'not_started';
  return 'not_started';
}
function getGate5Progress() { const ready = ['setup','input','ad','bridge','finance'].filter(key => getGate5BlockStatus(key) === 'ready').length; return Math.round((ready / 5) * 100); }

function renderGate5Integrated(gate) {
  const g5 = ensureGate5State();
  const f = g5Finance();
  const m = g5Metrics(f.model.total);
  const status = getGate5Status();
  els.contentArea.innerHTML = `<div class="gate5-loop">
    <section class="gate5-intro">
      <div class="gate5-intro-top">
        <div>
          <div class="analytics-path">Gate 5 → Оценка и оптимизация</div>
          <h2>Оценка и оптимизация, постоянная петля</h2>
          <p class="muted">Инструмент рекламной отчётности встроен в общий интерфейс ГУРУ. Нет отдельного header, тёмной темы и автономной навигации. Внутренние разделы стали подблоками Gate 5.</p>
        </div>
        <span class="status-pill status-${status}">${g5Esc(STATUS_LABELS[status] || status)}</span>
      </div>
      <div class="gate5-formula"><span>данные</span><span>цель</span><span>реклама</span><span>лиды</span><span>заказы</span><span>финансы</span><span>решение</span><span>следующая оптимизация</span></div>
      <div class="gate5-kpis">
        <div class="gate5-kpi"><span>Расход</span><strong>${g5Rub(m.spend)}</strong><small>из отчёта рекламы</small></div>
        <div class="gate5-kpi"><span>Лиды</span><strong>${g5Int(m.conversions)}</strong><small>конверсии / цели</small></div>
        <div class="gate5-kpi"><span>CPA</span><strong>${m.conversions ? g5Rub(m.cpa) : '—'}</strong><small>расход / лиды</small></div>
        <div class="gate5-kpi"><span>Заказы</span><strong>${g5Int(f.orders)}</strong><small>из бизнес-связки</small></div>
        <div class="gate5-kpi"><span>ROI</span><strong>${f.spend ? g5Pct(f.roi) : '—'}</strong><small>финансовый итог</small></div>
      </div>
    </section>
    ${g5AccordionBlock('setup', '1. Настройка отчётности', 'Структура кампаний распознана: кампании, группы, объявления и ключи связки.', renderGate5Setup())}
    ${g5AccordionBlock('input', '2. Ввод данных', 'Отчёты и цели загружены, период анализа зафиксирован.', renderGate5Input())}
    ${g5AccordionBlock('ad', '3. Рекламная оценка', 'Понятно, что работает, а что сливает бюджет.', renderGate5Ad())}
    ${g5AccordionBlock('bridge', '4. Связка с бизнесом', 'Лиды связаны с заказами, выручкой и конверсией лид → заказ.', renderGate5Bridge())}
    ${g5AccordionBlock('finance', '5. Финансовая оценка', 'Понятно, окупается реклама или нет: CPA, CAC, ROAS, DRR, ROI и решение.', renderGate5Finance())}
  </div>`;
  bindGate5Events();
}
function g5AccordionBlock(key, title, desc, body) {
  const g5 = ensureGate5State();
  const open = g5.ui.openBlock === key;
  const status = getGate5BlockStatus(key);
  return `<section class="gate5-block ${open ? 'is-open' : ''}">
    <button class="gate5-block-head" data-gate5-open="${g5Attr(key)}">
      <span><span class="gate5-block-title">${g5Esc(title)}</span><span class="gate5-block-desc">${g5Esc(desc)}</span></span>
      <span class="status-pill status-${status}">${g5Esc(STATUS_LABELS[status] || status)}</span>
      <span class="gate5-block-toggle">${open ? 'Свернуть' : 'Открыть'}</span>
    </button>
    ${open ? `<div class="gate5-block-body">${body}</div>` : ''}
  </section>`;
}
function renderGate5Setup() {
  const g5 = ensureGate5State();
  const c = Object.values(g5.setup.campaigns), gr = Object.values(g5.setup.groups), a = Object.values(g5.setup.ads);
  return `<div class="gate5-grid-2">
    <div class="gate5-card"><h4>Импорт структуры</h4><p>Загрузите XLSX / CSV со столбцами: № кампании, название кампании, № группы, название группы, № объявления, заголовок.</p>
      <div class="gate5-fileline"><label class="gate5-field">Файл структуры<input type="file" data-gate5-import="structure" accept=".xlsx,.xls,.csv,.tsv,.txt"></label><button class="btn secondary" data-gate5-clear="structure">Очистить структуру</button></div>
    </div>
    <div class="gate5-card"><h4>Что распознано</h4><p>Кампаний: <b>${c.length}</b>. Групп: <b>${gr.length}</b>. Объявлений: <b>${a.length}</b>.</p><div class="gate5-note">Ключ связки: № кампании → № группы → № объявления.</div></div>
  </div>${g5StructureTable()}`;
}
function g5StructureTable() {
  const g5 = ensureGate5State();
  const rows = Object.values(g5.setup.ads).slice(0, 80).map(a => `<tr><td>${g5Esc(a.campaignId)}</td><td>${g5Esc(g5.setup.campaigns[a.campaignId]?.name || '—')}</td><td>${g5Esc(a.groupId)}</td><td>${g5Esc(g5.setup.groups[a.groupId]?.name || '—')}</td><td>${g5Esc(a.id)}</td><td>${g5Esc(a.title)}</td></tr>`).join('');
  const empty = Object.keys(g5.setup.ads).length ? '' : '<tr><td colspan="6">Структура ещё не импортирована.</td></tr>';
  return `<div class="gate5-table-wrap"><table class="gate5-table"><thead><tr><th>№ кампании</th><th>Кампания</th><th>№ группы</th><th>Группа</th><th>№ объявления</th><th>Объявление</th></tr></thead><tbody>${rows || empty}</tbody></table></div>`;
}
function renderGate5Input() {
  const g5 = ensureGate5State();
  return `<div class="gate5-report-list">${Object.entries(GATE5_REPORTS).map(([key, rep]) => {
    const meta = g5.imports[key];
    return `<div class="gate5-report-card"><h4>${g5Esc(rep.title)}</h4><small>${g5Esc(rep.desc)}</small><small>${meta ? `Загружен: ${g5DateTime(meta.uploadedAt)} · строк: ${meta.rows}` : 'Не загружен'}</small><div class="gate5-fileline"><label class="gate5-field">Файл<input type="file" data-gate5-import="${g5Attr(key)}" accept=".xlsx,.xls,.csv,.tsv,.txt"></label><button class="btn secondary" data-gate5-clear="${g5Attr(key)}">Очистить</button></div></div>`;
  }).join('')}</div>${g5GoalFormAndHistory()}`;
}
function g5GoalFormAndHistory() {
  const goal = g5ActiveGoal();
  const rows = ensureGate5State().goals.slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).map(g => `<tr><td>${g5DateTime(g.createdAt)}</td><td>${g5Int(g.leads)}</td><td>${g5Rub(g.cpa)}</td><td>${g5Rub(g.cac)}</td><td>${g.drr ? g.drr + '%' : '—'}</td><td>${g5Esc(g.comment || '—')}</td></tr>`).join('');
  return `<div class="gate5-card" style="margin-top:12px"><h4>Цели</h4><p>Цели нужны, чтобы статусы стали управленческими, а не просто отчётными.</p><div class="gate5-grid-4" style="margin-top:10px">
    <label class="gate5-field">Лиды<input data-gate5-goal="leads" inputmode="numeric"></label>
    <label class="gate5-field">CPA ₽<input data-gate5-goal="cpa" inputmode="decimal"></label>
    <label class="gate5-field">CAC ₽<input data-gate5-goal="cac" inputmode="decimal"></label>
    <label class="gate5-field">DRR %<input data-gate5-goal="drr" inputmode="decimal"></label>
  </div><label class="gate5-field" style="margin-top:10px">Комментарий<input data-gate5-goal="comment"></label><div class="gate5-actions"><button class="btn primary" data-gate5-save-goal>Сохранить цель</button></div>${goal ? `<div class="gate5-note gate5-good">Активная цель: ${g5Int(goal.leads)} лидов · CPA ${g5Rub(goal.cpa)} · CAC ${g5Rub(goal.cac)} · DRR ${goal.drr || '—'}%</div>` : '<div class="gate5-note">Цель ещё не задана.</div>'}</div><div class="gate5-table-wrap"><table class="gate5-table"><thead><tr><th>Дата</th><th>Лиды</th><th>CPA</th><th>CAC</th><th>DRR</th><th>Комментарий</th></tr></thead><tbody>${rows || '<tr><td colspan="6">Истории целей пока нет.</td></tr>'}</tbody></table></div>`;
}
function renderGate5Ad() {
  const model = g5BuildModel();
  const rows = Object.values(model.campaigns).filter(x => x.spend || x.clicks || x.conversions).sort((a,b)=>b.spend-a.spend).map(c => { const r = g5RowMetrics(c); const st = g5AdRowStatus(c); return `<tr><td><b>${g5Esc(c.name)}</b><br><span class="gate5-muted">${g5Esc(c.id)}</span></td><td>${r.spend}</td><td>${r.impressions}</td><td>${r.clicks}</td><td>${r.ctr}</td><td>${r.conversions}</td><td>${r.cr}</td><td>${r.cpa}</td><td><span class="status-pill status-${st}">${g5Esc(STATUS_LABELS[st] || st)}</span></td></tr>`; }).join('');
  const problemQueries = ensureGate5State().reports.query.filter(q => q.spend && !q.conversions).sort((a,b)=>b.spend-a.spend).slice(0,30);
  return `<div class="gate5-table-wrap"><table class="gate5-table"><thead><tr><th>Кампания</th><th>Расход</th><th>Показы</th><th>Клики</th><th>CTR</th><th>Лиды</th><th>CR</th><th>CPA</th><th>Статус</th></tr></thead><tbody>${rows || '<tr><td colspan="9">Отчёт рекламы ещё не загружен.</td></tr>'}</tbody></table></div><h4 style="margin-top:16px">Проблемные зоны</h4>${g5ProblemsTable(problemQueries)}`;
}
function g5AdRowStatus(row) { const goal = g5ActiveGoal(); const m = g5Metrics(row); if (goal?.cpa && m.cpa && m.cpa > goal.cpa) return 'problem'; if (m.conversions) return 'ready'; if (m.spend) return 'needs_review'; return 'in_progress'; }
function g5ProblemsTable(rows) { return `<div class="gate5-table-wrap"><table class="gate5-table"><thead><tr><th>Запрос / условие</th><th>Кампания</th><th>Расход</th><th>Клики</th><th>Лиды</th><th>Решение</th></tr></thead><tbody>${rows.map(q => `<tr><td>${g5Esc(q.query || q.conditionName || '—')}</td><td>${g5Esc(q.campaignName || q.campaignId || '—')}</td><td>${g5Rub(q.spend)}</td><td>${g5Int(q.clicks)}</td><td>${g5Int(q.conversions)}</td><td><span class="status-pill status-needs_review">Проверить / минусовать</span></td></tr>`).join('') || '<tr><td colspan="6">Проблемные запросы появятся после загрузки отчёта поисковых запросов.</td></tr>'}</tbody></table></div>`; }
function renderGate5Bridge() {
  const f = g5Finance();
  const link = g5LatestLink();
  const rows = ensureGate5State().links.slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).map(l => { const revenue = g5Num(l.actualRevenue) || g5Num(l.orders) * (g5Num(l.avgCheck) || g5Num(l.minCheck)); const cac = g5Div(g5Num(l.adSpend), g5Num(l.orders)); return `<tr><td>${g5DateTime(l.createdAt)}</td><td>${g5Int(l.leads)}</td><td>${g5Int(l.orders)}</td><td>${g5Pct(g5Div(l.orders,l.leads))}</td><td>${g5Rub(l.adSpend)}</td><td>${g5Rub(cac)}</td><td>${g5Rub(revenue)}</td><td>${g5Esc(l.comment || '—')}</td></tr>`; }).join('');
  return `<div class="gate5-grid-4"><label class="gate5-field">Лиды<input data-gate5-link="leads" value="${g5Attr(f.leads)}"></label><label class="gate5-field">Заказы<input data-gate5-link="orders" inputmode="numeric"></label><label class="gate5-field">Средний чек ₽<input data-gate5-link="avgCheck" inputmode="decimal"></label><label class="gate5-field">Фактическая выручка ₽<input data-gate5-link="actualRevenue" inputmode="decimal"></label></div><div class="gate5-grid-4" style="margin-top:10px"><label class="gate5-field">Расход рекламы<input data-gate5-link="adSpend" value="${g5Attr(Math.round(f.spend))}"></label><label class="gate5-field">Маржинальность %<input data-gate5-link="margin" inputmode="decimal"></label><label class="gate5-field">Минимальный чек ₽<input data-gate5-link="minCheck" inputmode="decimal"></label><label class="gate5-field">Комментарий<input data-gate5-link="comment"></label></div><div class="gate5-actions"><button class="btn primary" data-gate5-save-link>Сохранить связку</button></div>${link ? `<div class="gate5-note gate5-good">Последняя связка: ${g5Int(link.leads)} лидов → ${g5Int(link.orders)} заказов.</div>` : '<div class="gate5-note">Связка с заказами ещё не сохранена.</div>'}<div class="gate5-table-wrap"><table class="gate5-table"><thead><tr><th>Дата</th><th>Лиды</th><th>Заказы</th><th>Лид → заказ</th><th>Расход</th><th>CAC</th><th>Выручка</th><th>Комментарий</th></tr></thead><tbody>${rows || '<tr><td colspan="8">Истории связки пока нет.</td></tr>'}</tbody></table></div>`;
}
function renderGate5Finance() {
  const f = g5Finance();
  const goal = g5ActiveGoal();
  const status = getGate5Status();
  let decision = 'Нет данных для решения';
  if (f.revenue && status === 'ready') decision = 'Масштабировать / удерживать';
  if (f.revenue && status === 'problem') decision = 'Оптимизировать или остановить';
  if (f.spend && !f.revenue) decision = 'Нужна связка с заказами';
  return `<div class="gate5-grid-4"><div class="gate5-kpi"><span>CPA</span><strong>${f.cpa ? g5Rub(f.cpa) : '—'}</strong><small>цель ${goal?.cpa ? g5Rub(goal.cpa) : '—'}</small></div><div class="gate5-kpi"><span>CAC</span><strong>${f.cac ? g5Rub(f.cac) : '—'}</strong><small>цель ${goal?.cac ? g5Rub(goal.cac) : '—'}</small></div><div class="gate5-kpi"><span>ROAS</span><strong>${f.roas ? f.roas.toFixed(2).replace('.', ',') + '×' : '—'}</strong><small>выручка / расход</small></div><div class="gate5-kpi"><span>DRR</span><strong>${f.drr ? g5Pct(f.drr) : '—'}</strong><small>цель ${goal?.drr ? goal.drr + '%' : '—'}</small></div></div><div class="gate5-decision ${status === 'problem' ? 'gate5-problem' : status === 'ready' ? 'gate5-good' : 'gate5-warning'}" style="margin-top:14px"><strong>${g5Esc(decision)}</strong><p class="gate5-muted">ROI: ${f.spend ? g5Pct(f.roi) : '—'}. Решение строится из связки: рекламные отчёты → цели → лиды → заказы → выручка.</p></div>${g5FinanceChecks()}`;
}
function g5FinanceChecks() { const f = g5Finance(); const goal = g5ActiveGoal(); const checks = []; if (!f.spend) checks.push(['not_started','Нет загруженных рекламных отчётов.']); if (!goal) checks.push(['in_progress','Нет целей CPA / CAC / DRR.']); if (!g5LatestLink()) checks.push(['in_progress','Нет связки лидов с заказами и выручкой.']); if (goal?.cpa && f.cpa > goal.cpa) checks.push(['problem','CPA выше допустимого значения.']); if (goal?.cac && f.cac > goal.cac) checks.push(['problem','CAC выше допустимого значения.']); if (goal?.drr && f.drr > goal.drr / 100) checks.push(['problem','DRR выше допустимого значения.']); if (!checks.length) checks.push(['ready','Критичных финансовых проблем не найдено.']); return `<div class="gate5-checks">${checks.map(([st, text]) => `<div class="gate5-check"><span class="status-pill status-${st}">${g5Esc(STATUS_LABELS[st] || st)}</span> ${g5Esc(text)}</div>`).join('')}</div>`; }
function bindGate5Events() {
  document.querySelectorAll('[data-gate5-open]').forEach(btn => btn.addEventListener('click', () => { const g5 = ensureGate5State(); g5.ui.openBlock = g5.ui.openBlock === btn.dataset.gate5Open ? '' : btn.dataset.gate5Open; saveState(); renderGate(); }));
  document.querySelectorAll('[data-gate5-import]').forEach(input => input.addEventListener('change', async e => { const kind = e.target.dataset.gate5Import; const file = e.target.files?.[0]; if (!file) return; try { const rows = await g5ReadTableFile(file); const ex = g5ExtractRows(rows, kind === 'structure' ? 'structure' : kind); const g5 = ensureGate5State(); if (kind === 'structure') { g5SyncStructure(ex.records); } else { g5.reports[kind] = ex.records; g5.imports[kind] = { ...ex.meta, type: kind }; g5SyncStructure(ex.records); } saveState(); renderGate(); } catch (err) { alert(err.message || 'Не удалось импортировать файл'); } }));
  document.querySelectorAll('[data-gate5-clear]').forEach(btn => btn.addEventListener('click', () => { const kind = btn.dataset.gate5Clear; const g5 = ensureGate5State(); if (kind === 'structure') { g5.setup = { projectName: '', campaigns: {}, groups: {}, ads: {} }; } else { g5.reports[kind] = []; delete g5.imports[kind]; } saveState(); renderGate(); }));
  document.querySelector('[data-gate5-save-goal]')?.addEventListener('click', () => { const goal = { id: makeId('g5-goal'), createdAt: new Date().toISOString() }; document.querySelectorAll('[data-gate5-goal]').forEach(input => { goal[input.dataset.gate5Goal] = ['comment'].includes(input.dataset.gate5Goal) ? input.value : g5Num(input.value); }); ensureGate5State().goals.push(goal); saveState(); renderGate(); });
  document.querySelector('[data-gate5-save-link]')?.addEventListener('click', () => { const link = { id: makeId('g5-link'), createdAt: new Date().toISOString() }; document.querySelectorAll('[data-gate5-link]').forEach(input => { link[input.dataset.gate5Link] = ['comment'].includes(input.dataset.gate5Link) ? input.value : g5Num(input.value); }); ensureGate5State().links.push(link); saveState(); renderGate(); });
}

const __guruPrevRenderGateTableV29 = renderGateTable;
renderGateTable = function(gate, cards) {
  if (gate && gate.id === 'gate-5') {
    renderGate5Integrated(gate, cards);
    return;
  }
  __guruPrevRenderGateTableV29(gate, cards);
};

const __guruPrevRenderGateNavV29 = renderGateNav;
renderGateNav = function() {
  els.gateNav.innerHTML = state.gates.map(g => {
    const progress = g.id === 'gate-5' ? getGate5Progress() : getProgress(g.cards);
    const cls = activeView === 'gate' && activeGateId === g.id ? 'active' : '';
    return `<button class="gate-btn ${cls}" data-gate-id="${g.id}">${escapeHtml(g.title)}<span class="small">${g.id === 'gate-5' ? '5 подблоков' : g.cards.length + ' блоков'}, готово ${progress}%</span></button>`;
  }).join('');
  document.querySelectorAll('[data-gate-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeView = 'gate';
      activeGateId = btn.dataset.gateId;
      render();
    });
  });
};

(function markV29() {
  document.querySelectorAll('.launcher-kicker').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.29'); });
  document.querySelectorAll('.eyebrow').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.29'); });
})();


/* =========================================================
   v0.30 · Gate 6 — Marketing event calendar as decision route
   Logic: event → demand → segment → offer → channel → deadline → launch
   ========================================================= */

const GATE6_EVENT_STATUS_LABELS = {
  not_started: 'Не начато',
  in_progress: 'В работе',
  ready_prepare: 'Готово к подготовке',
  ready_launch: 'Готово к запуску',
  problem: 'Проблема',
  excluded: 'Исключено'
};
const GATE6_EVENT_STATUS_CLASS = {
  not_started: 'not_started',
  in_progress: 'in_progress',
  ready_prepare: 'ready',
  ready_launch: 'ready',
  problem: 'problem',
  excluded: 'needs_review'
};
const GATE6_CHANNELS = ['Сайт', 'Email', 'Push', 'Telegram', 'Реклама', 'Соцсети', 'Персонально 1:1'];
const GATE6_SEASONS = [
  {
    key: 'winter',
    title: '1. Зима',
    phase: 'перегрузка, утрата контроля, износ, прокрастинация',
    factors: ['Праздники, алкоголь, поездки', 'Снижение самоконтроля', 'Игнорирование последствий', 'Физический износ: влага, соль, холод'],
    value: 'контроль, экспертиза, предотвращение ущерба',
    events: [
      { key: 'new_year', date: '1 января', name: 'Новый год', seed: 'Post-Stress Check-Up после периода перегруза, хаотичного использования и снижения контроля. Персональное сообщение 1:1. Не использовать слова «акция» и «предложение».' },
      { key: 'christmas', date: '7 января', name: 'Рождество', seed: 'Silent Service Mode: эмоциональный спад и потребность в такте. Только входящие запросы. Контроль тишины.' },
      { key: 'old_new_year', date: '13 января', name: 'Старый Новый год', seed: 'Deferred Decision Reminder: мягкое напоминание «вы планировали — мы зафиксировали». Без CTA и дедлайнов.' },
      { key: 'epiphany', date: '19 января', name: 'Крещение', seed: 'Risk Advisory: холод, соль, влага и недооценка накопленного ущерба. Фактический материал без DIY-инструкций.' },
      { key: 'tatiana', date: '25 января', name: 'Татьянин день', seed: 'Формирование привычки долгосрочного ухода. Образовательный контент про «уход как инвестицию», без офферов.' },
      { key: 'valentine', date: '14 февраля', name: 'День святого Валентина', seed: 'Paired Asset Care: парные и статусные объекты, подарки, совместные покупки. Индивидуальные сценарии обслуживания.' },
      { key: 'maslenitsa_winter', date: '16–22 февраля', name: 'Масленица', seed: 'Pre-Spring Reset: переход от зимней усталости к активности. Профилактические сценарии без акций.' },
      { key: 'defender_day', date: '23 февраля', name: 'День защитника Отечества', seed: 'Business Appearance Control: возврат к рабочему ритму. Сохранение формы, структуры и имиджа деловых вещей.' }
    ]
  },
  {
    key: 'early_spring',
    title: '2. Ранняя весна',
    phase: 'обострение, эксперименты, рост ошибок',
    factors: ['Весеннее обострение', 'Эксперименты и DIY', 'Снижение критичности', 'Желание «обновить всё сразу»'],
    value: 'безопасность решений и защита от ошибок',
    events: [
      { key: 'march_8', date: '8 марта', name: 'Международный женский день', seed: 'Risk-Free Appearance Protocol: социальный выход и публичность. Индивидуальный сценарий с акцентом на контроль рисков.' },
      { key: 'april_1', date: '1 апреля', name: 'День смеха', seed: 'Anti-DIY Education: последствия самостоятельных экспериментов. Без юмора.' },
      { key: 'cosmonautics', date: '12 апреля', name: 'День космонавтики', seed: 'Process Transparency: доверие к технологиям и системам. Демонстрация протоколов, этапов и контроля качества.' },
      { key: 'easter_spring', date: '12 апреля', name: 'Пасха', seed: 'Symbolic Clean Reset: внутреннее обновление. Спокойный имиджевый контент без продаж.' }
    ]
  },
  {
    key: 'spring_summer',
    title: '3. Весна → Лето',
    phase: 'активизация, выход в социум, смена гардероба',
    factors: ['Публичность', 'Мероприятия', 'Смена сезона', 'Повышенное внимание к внешнему виду'],
    value: 'соответствие стандартам и социальному контексту',
    events: [
      { key: 'may_1', date: '1 мая', name: 'Праздник Весны и Труда', seed: 'Seasonal Maintenance Protocol: плановое сезонное обслуживание при смене климата и гардероба. Без сроков.' },
      { key: 'may_9', date: '9 мая', name: 'День Победы', seed: 'Reputation Silence Rule: общественная чувствительность. Полный запрет на коммерческие сообщения.' },
      { key: 'russia_day', date: '12 июня', name: 'День России', seed: 'Brand Standard Reinforcement: идентичность, качество, стандарты сервиса и ответственность.' },
      { key: 'june_22', date: '22 июня', name: 'День памяти и скорби', seed: 'Absolute Marketing Silence: репутационная норма luxury-сегмента. Контроль отсутствия публикаций.' },
      { key: 'youth_day', date: '27 июня', name: 'День молодёжи', seed: 'Early Habit Formation: поиск идентичности и эксперименты. Образовательный контент о культуре обращения с ценными вещами.' }
    ]
  },
  {
    key: 'summer',
    title: '4. Лето',
    phase: 'расфокус, отпуска, снижение контроля',
    factors: ['Отпуска', 'Переезды', 'Хаотичное использование', 'Отложенные решения'],
    value: 'стабильность и сохранность во время отсутствия контроля',
    events: [
      { key: 'family_day', date: '8 июля', name: 'День семьи, любви и верности', seed: 'Family Asset Strategy: долгосрочное планирование и забота. Персональные сценарии для семейных клиентов.' },
      { key: 'flag_day', date: '22 августа', name: 'День флага России', seed: 'Stability & Trust Signal: конец лета перед снижением активности. Имиджевый контент без офферов.' }
    ]
  },
  {
    key: 'autumn',
    title: '5. Осень',
    phase: 'возврат структуры, рациональность, хандра',
    factors: ['Возврат к режиму', 'Снижение энергии', 'Рост рациональности', 'Желание порядка'],
    value: 'надёжность, системность, зрелость бренда',
    events: [
      { key: 'knowledge_day', date: '1 сентября', name: 'День знаний', seed: 'Authority Re-Anchoring: возврат к структуре и правилам. Гайды, объяснение процессов и стандартов.' },
      { key: 'icleaning_birthday', date: '9 сентября', name: 'День рождения iCleaning', seed: 'Heritage & Proof: доверие к зрелым системам. Кейсы, цифры, процессы. Запрет на скидки.' },
      { key: 'moscow_day', date: '13–14 сентября', name: 'День города Москвы', seed: 'Local Belonging Pattern: городская активность. Контекст города, сервис как часть среды.' },
      { key: 'unity_day', date: '4 ноября', name: 'День народного единства', seed: 'Consistency Signal: осенняя хандра и снижение мотивации. Имиджевый контент о стабильности.' }
    ]
  },
  {
    key: 'late_autumn_winter',
    title: '6. Поздняя осень → Зима',
    phase: 'контроль, правила, подготовка к нагрузке',
    factors: ['Рациональные решения', 'Внимание к регламентам', 'Подготовка к зиме'],
    value: 'прозрачность правил, гарантий и ответственности',
    events: [
      { key: 'constitution_day', date: '12 декабря', name: 'День Конституции РФ', seed: 'Rule Transparency: рост рациональности и контроля. Публикация правил, гарантий и ответственности.' }
    ]
  },
  {
    key: 'movable',
    title: '7. Подвижные события',
    phase: 'плавающие поводы, которые нужно привязать к календарю заранее',
    factors: ['Дата меняется каждый год', 'Нужна ранняя подготовка материалов', 'Повод использовать только при ясном сценарии спроса'],
    value: 'аккуратный повод без календарной механики ради механики',
    events: [
      { key: 'maslenitsa_movable', date: 'подвижная дата', name: 'Масленица', seed: 'Pre-Spring Reset: профилактические сценарии без акций.' },
      { key: 'easter_movable', date: 'подвижная дата', name: 'Пасха', seed: 'Symbolic Clean Reset: спокойный имиджевый контент без продаж.' }
    ]
  }
];

function isGate6Calendar(gate) {
  return Boolean(gate && (gate.id === 'gate-6' || normalizeGateTitle(gate.title).includes('маркетинговый календарь')));
}
function gate6EventKey(seasonKey, eventKey) { return seasonKey + '__' + eventKey; }
function gate6FindEvent(fullKey) {
  for (const season of GATE6_SEASONS) {
    const ev = season.events.find(e => gate6EventKey(season.key, e.key) === fullKey);
    if (ev) return { season, event: ev };
  }
  return null;
}
function ensureGate6State() {
  state.gate6Calendar = state.gate6Calendar || {};
  const g6 = state.gate6Calendar;
  g6.context = g6.context || {};
  if (!g6.context.period) g6.context.period = 'Год / сезон';
  if (!g6.context.project) g6.context.project = state.project?.name || '';
  if (!g6.context.audience) g6.context.audience = 'Премиальные клиенты, владельцы ценных вещей, деловой гардероб, семейные клиенты';
  if (!g6.context.channels) g6.context.channels = 'Сайт, email, push, Telegram, реклама, соцсети, персонально 1:1';
  g6.openSeasons = g6.openSeasons || {};
  g6.events = g6.events || {};
  GATE6_SEASONS.forEach(season => season.events.forEach(ev => {
    const key = gate6EventKey(season.key, ev.key);
    g6.events[key] = g6.events[key] || { relevance: '', scenario: '', segment: '', offer: '', channel: '', materialsDeadline: '', deadlineDate: '', materialState: '' };
  }));
  if (!Object.values(g6.openSeasons).some(Boolean)) {
    const first = getGate6FirstUnfinishedSeasonKey();
    g6.openSeasons[first || GATE6_SEASONS[0].key] = true;
  }
  return g6;
}
function gate6HasText(v) { return String(v || '').trim().length > 0; }
function gate6EventStatus(item) {
  if (!item) return 'not_started';
  if (item.relevance === 'not_relevant') return 'excluded';
  const hasDecision = gate6HasText(item.relevance) || gate6HasText(item.segment) || gate6HasText(item.scenario) || gate6HasText(item.offer) || gate6HasText(item.channel) || gate6HasText(item.materialsDeadline);
  if (!hasDecision) return 'not_started';
  const hasCore = gate6HasText(item.segment) && gate6HasText(item.scenario) && gate6HasText(item.offer) && gate6HasText(item.channel);
  const hasDeadline = gate6HasText(item.materialsDeadline) || gate6HasText(item.deadlineDate);
  const soon = item.deadlineDate && gate6DaysUntil(item.deadlineDate) <= 7 && gate6DaysUntil(item.deadlineDate) >= 0;
  if (soon && item.materialState !== 'ready') return 'problem';
  if (item.materialState === 'ready' && hasCore) return 'ready_launch';
  if (hasCore && hasDeadline) return 'ready_prepare';
  return 'in_progress';
}
function gate6DaysUntil(date) {
  const d = new Date(String(date || '') + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return 99999;
  const today = new Date();
  today.setHours(0,0,0,0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}
function gate6SeasonStatus(season) {
  const g6 = ensureGate6State();
  const statuses = season.events.map(ev => gate6EventStatus(g6.events[gate6EventKey(season.key, ev.key)]));
  if (statuses.includes('problem')) return 'problem';
  if (statuses.some(s => s === 'ready_prepare' || s === 'ready_launch')) return 'ready';
  if (statuses.some(s => s === 'in_progress')) return 'in_progress';
  return 'not_started';
}
function getGate6Status() {
  const g6 = ensureGate6State();
  if (!gate6HasText(g6.context.period) || !gate6HasText(g6.context.project) || !gate6HasText(g6.context.audience)) return 'not_started';
  const statuses = Object.values(g6.events).map(gate6EventStatus);
  if (statuses.includes('problem')) return 'problem';
  if (statuses.some(s => s === 'ready_prepare' || s === 'ready_launch')) return 'ready';
  if (statuses.some(s => s === 'in_progress' || s === 'excluded')) return 'in_progress';
  return 'not_started';
}
function getGate6Progress() {
  const g6 = ensureGate6State();
  const statuses = Object.values(g6.events).map(gate6EventStatus).filter(s => s !== 'excluded');
  if (!statuses.length) return 0;
  const done = statuses.filter(s => s === 'ready_prepare' || s === 'ready_launch').length;
  return Math.round((done / statuses.length) * 100);
}
function getGate6FirstUnfinishedSeasonKey() {
  const g6 = state?.gate6Calendar;
  if (!g6?.events) return GATE6_SEASONS[0]?.key;
  for (const season of GATE6_SEASONS) {
    const unfinished = season.events.some(ev => !['ready_prepare', 'ready_launch', 'excluded'].includes(gate6EventStatus(g6.events[gate6EventKey(season.key, ev.key)])));
    if (unfinished) return season.key;
  }
  return GATE6_SEASONS[0]?.key;
}
function gate6StatusPill(status) {
  const cls = GATE6_EVENT_STATUS_CLASS[status] || status;
  return `<span class="status-pill status-${escapeAttr(cls)}">${escapeHtml(GATE6_EVENT_STATUS_LABELS[status] || STATUS_LABELS[status] || status)}</span>`;
}
function renderGate6Calendar(gate) {
  const g6 = ensureGate6State();
  const status = getGate6Status();
  const plan = gate6CampaignPlan();
  els.contentArea.innerHTML = `<div class="gate6-calendar">
    <section class="gate6-intro">
      <div class="gate6-intro-top">
        <div>
          <div class="analytics-path">Gate 6 → Маркетинговый календарь событий</div>
          <h2>Маркетинговый календарь событий</h2>
          <p class="muted">Не таблица дат. Маршрут принятия решения: событие → спрос → сегмент → офер → канал → дедлайн → запуск.</p>
        </div>
        ${gate6StatusPill(status)}
      </div>
      <div class="gate6-formula"><span>событие</span><span>спрос</span><span>сегмент</span><span>офер</span><span>канал</span><span>дедлайн</span><span>запуск</span></div>
      <div class="gate6-context-grid">
        <label class="gate6-field">Период<input data-g6-context="period" value="${escapeAttr(g6.context.period)}" placeholder="год / квартал / сезон"></label>
        <label class="gate6-field">Проект<input data-g6-context="project" value="${escapeAttr(g6.context.project)}" placeholder="бренд / сайт / услуга"></label>
        <label class="gate6-field">Главная аудитория<input data-g6-context="audience" value="${escapeAttr(g6.context.audience)}" placeholder="для кого ищем поводы"></label>
        <label class="gate6-field">Каналы<input data-g6-context="channels" value="${escapeAttr(g6.context.channels)}" placeholder="сайт / email / push / Telegram / реклама / соцсети"></label>
      </div>
    </section>
    <section class="gate6-seasons">
      ${GATE6_SEASONS.map(season => gate6SeasonHtml(season)).join('')}
    </section>
    <section class="gate6-plan">
      <div class="gate6-section-head"><div><h3>Финальный план кампаний</h3><p class="muted">Сюда попадают только события, по которым есть решение, сегмент, офер, канал или дедлайн. Это не архив дат, а запускной план.</p></div><span class="gate6-count">${plan.length} кампаний</span></div>
      ${gate6PlanTable(plan)}
    </section>
  </div>`;
  bindGate6Events();
}
function gate6SeasonHtml(season) {
  const g6 = ensureGate6State();
  const open = Boolean(g6.openSeasons[season.key]);
  const status = gate6SeasonStatus(season);
  const ready = season.events.filter(ev => ['ready_prepare','ready_launch'].includes(gate6EventStatus(g6.events[gate6EventKey(season.key, ev.key)]))).length;
  return `<section class="gate6-season ${open ? 'is-open' : ''}">
    <button class="gate6-season-head" data-g6-open="${escapeAttr(season.key)}">
      <span class="gate6-season-main"><span class="gate6-season-title">${escapeHtml(season.title)}</span><span class="gate6-season-meta">Фаза: ${escapeHtml(season.phase)} · готово ${ready}/${season.events.length}</span></span>
      ${gate6StatusPill(status)}
      <span class="gate6-toggle">${open ? 'Свернуть' : 'Открыть'}</span>
    </button>
    ${open ? `<div class="gate6-season-body">
      <div class="gate6-season-context">
        <div><b>Поведенческие факторы</b><ul>${season.factors.map(f => `<li>${escapeHtml(f)}</li>`).join('')}</ul></div>
        <div><b>Что продаётся на самом деле</b><p>${escapeHtml(season.value)}</p></div>
      </div>
      <div class="gate6-events">${season.events.map(ev => gate6EventHtml(season, ev)).join('')}</div>
    </div>` : ''}
  </section>`;
}
function gate6EventHtml(season, ev) {
  const g6 = ensureGate6State();
  const key = gate6EventKey(season.key, ev.key);
  const item = g6.events[key] || {};
  const status = gate6EventStatus(item);
  return `<article class="gate6-event" id="g6-${escapeAttr(key)}" data-g6-event-card="${escapeAttr(key)}">
    <div class="gate6-event-head">
      <div><h4>${escapeHtml(ev.date)} — ${escapeHtml(ev.name)}</h4><p>${escapeHtml(ev.seed)}</p></div>
      ${gate6StatusPill(status)}
    </div>
    <div class="gate6-event-decision">
      <label class="gate6-field compact">Актуальность<select data-g6-relevance="${escapeAttr(key)}">
        ${gate6Option('', 'Под вопросом', item.relevance)}
        ${gate6Option('relevant', 'Подходит', item.relevance)}
        ${gate6Option('not_relevant', 'Не подходит', item.relevance)}
      </select></label>
      <label class="gate6-field compact">Сценарий спроса<textarea data-g6-field="${escapeAttr(key)}" data-field="scenario" rows="2" placeholder="почему человек купит именно сейчас">${escapeHtml(item.scenario || '')}</textarea></label>
      <label class="gate6-field compact">Сегмент<input data-g6-field="${escapeAttr(key)}" data-field="segment" value="${escapeAttr(item.segment || '')}" placeholder="кому это важно"></label>
      <label class="gate6-field compact">Офер<input data-g6-field="${escapeAttr(key)}" data-field="offer" value="${escapeAttr(item.offer || '')}" placeholder="что предлагаем"></label>
      <label class="gate6-field compact">Канал<select data-g6-field="${escapeAttr(key)}" data-field="channel">
        ${gate6Option('', 'Выбрать канал', item.channel)}
        ${GATE6_CHANNELS.map(ch => gate6Option(ch, ch, item.channel)).join('')}
      </select></label>
      <label class="gate6-field compact wide-field">Материалы / дедлайн<input data-g6-field="${escapeAttr(key)}" data-field="materialsDeadline" value="${escapeAttr(item.materialsDeadline || '')}" placeholder="что подготовить и к какой дате"></label>
      <label class="gate6-field compact">Дата дедлайна<input type="date" data-g6-field="${escapeAttr(key)}" data-field="deadlineDate" value="${escapeAttr(item.deadlineDate || '')}"></label>
      <label class="gate6-field compact">Готовность<select data-g6-field="${escapeAttr(key)}" data-field="materialState">
        ${gate6Option('', 'Материалы не готовы', item.materialState)}
        ${gate6Option('ready', 'Материалы готовы', item.materialState)}
      </select></label>
    </div>
  </article>`;
}
function gate6Option(value, label, current) {
  return `<option value="${escapeAttr(value)}" ${String(current || '') === String(value) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
}
function gate6CampaignPlan() {
  const g6 = ensureGate6State();
  const out = [];
  GATE6_SEASONS.forEach(season => season.events.forEach(ev => {
    const key = gate6EventKey(season.key, ev.key);
    const item = g6.events[key] || {};
    const status = gate6EventStatus(item);
    const hasWork = item.relevance || item.scenario || item.segment || item.offer || item.channel || item.materialsDeadline || item.deadlineDate || item.materialState;
    if (!hasWork || status === 'excluded') return;
    out.push({ key, season: season.title, date: ev.date, event: ev.name, segment: item.segment, scenario: item.scenario, offer: item.offer, channel: item.channel, material: item.materialsDeadline, deadline: item.deadlineDate, status });
  }));
  return out;
}
function gate6PlanTable(rows) {
  if (!rows.length) return '<div class="empty compact-empty">План пока пуст. Выберите релевантное событие и заполните сегмент, офер, канал и дедлайн.</div>';
  return `<div class="table-scroll gate6-plan-table"><table class="data-table clean-data-table"><thead><tr><th>Дата</th><th>Событие</th><th>Сегмент</th><th>Офер</th><th>Канал</th><th>Материал</th><th>Дедлайн</th><th>Статус</th></tr></thead><tbody>${rows.map(row => `<tr data-g6-jump="${escapeAttr(row.key)}"><td>${escapeHtml(row.date)}</td><td class="table-title"><button class="linklike" data-g6-jump-btn="${escapeAttr(row.key)}">${escapeHtml(row.event)}</button><div class="muted mini-text">${escapeHtml(row.season)}</div></td><td>${escapeHtml(row.segment || '—')}</td><td>${escapeHtml(row.offer || '—')}</td><td>${escapeHtml(row.channel || '—')}</td><td>${escapeHtml(row.material || '—')}</td><td>${escapeHtml(row.deadline || '—')}</td><td>${gate6StatusPill(row.status)}</td></tr>`).join('')}</tbody></table></div>`;
}
function bindGate6Events() {
  document.querySelectorAll('[data-g6-context]').forEach(input => input.addEventListener('input', () => {
    const g6 = ensureGate6State();
    g6.context[input.dataset.g6Context] = input.value;
    saveState();
  }));
  document.querySelectorAll('[data-g6-open]').forEach(btn => btn.addEventListener('click', () => {
    const g6 = ensureGate6State();
    const key = btn.dataset.g6Open;
    g6.openSeasons[key] = !g6.openSeasons[key];
    saveState();
    renderGate();
  }));
  document.querySelectorAll('[data-g6-relevance]').forEach(input => input.addEventListener('change', () => {
    const g6 = ensureGate6State();
    const key = input.dataset.g6Relevance;
    g6.events[key] = g6.events[key] || {};
    g6.events[key].relevance = input.value;
    saveState();
    renderGate();
  }));
  document.querySelectorAll('[data-g6-field]').forEach(input => input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => {
    const g6 = ensureGate6State();
    const key = input.dataset.g6Field;
    const field = input.dataset.field;
    g6.events[key] = g6.events[key] || {};
    g6.events[key][field] = input.value;
    saveState();
  }));
  document.querySelectorAll('[data-g6-jump-btn]').forEach(btn => btn.addEventListener('click', () => {
    const found = gate6FindEvent(btn.dataset.g6JumpBtn);
    if (!found) return;
    const g6 = ensureGate6State();
    g6.openSeasons[found.season.key] = true;
    saveState();
    renderGate();
    setTimeout(() => document.getElementById('g6-' + btn.dataset.g6JumpBtn)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 40);
  }));
}

const __guruPrevRenderGateTableV30 = renderGateTable;
renderGateTable = function(gate, cards) {
  if (isGate6Calendar(gate)) {
    renderGate6Calendar(gate, cards);
    return;
  }
  __guruPrevRenderGateTableV30(gate, cards);
};

const __guruPrevRenderGateNavV30 = renderGateNav;
renderGateNav = function() {
  els.gateNav.innerHTML = state.gates.map(g => {
    const progress = g.id === 'gate-5' ? getGate5Progress() : (g.id === 'gate-6' ? getGate6Progress() : getProgress(g.cards));
    const cls = activeView === 'gate' && activeGateId === g.id ? 'active' : '';
    const countText = g.id === 'gate-5' ? '5 подблоков' : (g.id === 'gate-6' ? '7 сезонов' : g.cards.length + ' блоков');
    return `<button class="gate-btn ${cls}" data-gate-id="${escapeAttr(g.id)}">${escapeHtml(g.title)}<span class="small">${countText}, готово ${progress}%</span></button>`;
  }).join('');
  document.querySelectorAll('[data-gate-id]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeView = 'gate';
      activeGateId = btn.dataset.gateId;
      render();
    });
  });
};

(function markV30() {
  document.querySelectorAll('.launcher-kicker').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.30'); });
  document.querySelectorAll('.eyebrow').forEach(el => { el.textContent = el.textContent.replace(/v0\.\d+/g, 'v0.30'); });
})();
