const LEGACY_STORAGE_KEY = 'guru-platform-mvp-v1';
const PROJECTS_STORAGE_KEY = 'guru-platform-projects-v02';
const WORKSPACE_STORAGE_PREFIX = 'guru-platform-workspace-v02-';
const PLATFORM_VERSION = 'v0.11';
const STATUS_LABELS = {
  not_started: 'Не начато',
  in_progress: 'В работе',
  ready: 'Готово',
  needs_review: 'Проверить'
};

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
      if (isToolStatusCard(card)) {
        ensureToolItems(card);
        card.evidenceFields = [];
        card.evidence = '';
      }
      if (isCurrentResultsCard(card)) ensureCurrentResults(card);
      ensureGate1TypedData(card);
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
  const fields = ensureEvidenceFields(card);
  if (fields.length) return fields.map(field => `${field.label}: ${getEvidenceValue(field.key, workspace)}`).join('\n');
  return card.evidence || '';
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
  const gate = state.gates.find(g => g.id === activeGateId) || state.gates[0];
  if (!gate) return;
  els.pageTitle.textContent = gate.title;
  const query = els.searchInput.value.trim().toLowerCase();
  const filter = els.statusFilter.value;
  let cards = gate.cards;
  if (filter !== 'all') cards = cards.filter(c => c.status === filter);
  if (query) {
    cards = cards.filter(c => [c.title, c.instruction, composeEvidenceText(c), c.pages, c.notes].join(' ').toLowerCase().includes(query));
  }
  renderGateTable(gate, cards);
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
      const status = getSectionStatus(section.allInnerCards);
      const displayCards = queryActive ? section.filteredInnerCards : section.allInnerCards;
      return `<section class="analytics-subblock ${sectionOpen ? 'is-open is-active' : ''}">
        <button class="subblock-header" data-gate1-toggle-section="${escapeAttr(section.key)}">
          <span class="subblock-main">
            <span class="analytics-path">Gate 1 → ${escapeHtml(section.title)}</span>
            <span class="subblock-title">${escapeHtml(section.title)}</span>
            <span class="subblock-progress">${escapeHtml(getSectionProgressText(section.allInnerCards))}</span>
          </span>
          <span class="status-pill status-${status}">${STATUS_LABELS[status] || status}</span>
          <span class="subblock-toggle">${sectionOpen ? 'Закрыть' : 'Открыть'}</span>
        </button>
        ${sectionOpen ? `<div class="subblock-body">
          ${displayCards.length ? displayCards.map(card => gate1WorkBlockHtml(card, section.title)).join('') : '<div class="empty compact-empty">По текущему фильтру внутри подблока ничего не найдено.</div>'}
        </div>` : ''}
      </section>`;
    }).join('')}
  </div>`;
  bindGate1Accordion();
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
      <div class="card-text">${escapeHtml(card.instruction || 'Инструкция пока не заполнена.')}</div>
      <div class="card-fields">
        <label class="field-row">Статус${statusSelect(card)}</label>
        ${cardUserFieldsHtml(card)}
        ${getGate1CardMode(card) ? '' : `<label class="field-row">Размещено на странице<input data-field="pages" data-card-id="${escapeAttr(card.id)}" value="${escapeAttr(card.pages || '')}" /></label>`}
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
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr><th>Блок</th><th>Инструкция</th><th>Статус</th><th>Структурированное доказательство</th></tr></thead>
        <tbody>${cards.map(c => `
          <tr data-card-row="${c.id}">
            <td class="table-title">${escapeHtml(c.title)}<div class="card-source">CSV строка ${c.sourceRow || ''}</div></td>
            <td class="table-text">${escapeHtml(c.instruction || '')}</td>
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
      <div class="card-text">${escapeHtml(c.instruction || 'Инструкция пока не заполнена.')}</div>
      <div class="card-fields">
        <label class="field-row">Статус${statusSelect(c)}</label>
        ${cardUserFieldsHtml(c)}
        <label class="field-row">Размещено на странице<input data-field="pages" data-card-id="${c.id}" value="${escapeAttr(c.pages || '')}" /></label>
      </div>
    </article>`;
}

function cardUserFieldsHtml(c) {
  if (isProjectPassportCard(c)) return `<div class="field-row"><span>Паспорт проекта</span>${projectPassportFieldsHtml()}</div>`;
  if (isCurrentResultsCard(c)) return `<div class="field-row"><span>Показатели</span>${currentResultsHtml(c)}</div>`;
  if (isToolStatusCard(c)) return `<div class="field-row"><span>Статусы элементов</span>${toolItemsHtml(c)}</div>`;
  if (isStartupSummaryCard(c)) return `<div class="field-row"><span>Автоматическая сводка</span>${startupSummaryHtml()}</div>`;
  if (getGate1CardMode(c)) return gate1TypedFieldsHtml(c);
  return `<div class="field-row"><span>Доказательство</span>${evidenceStructuredHtml(c)}</div>`;
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
    <div class="tool-workspace-title">Рабочие пространства включённых инструментов</div>
    <table class="mini-table typed-table">
      <thead><tr><th>Инструмент</th><th>Статус проверки</th><th>Данные / ссылка на отчёт</th><th>Комментарий</th></tr></thead>
      <tbody>${tools.map(tool => {
        const row = workspace[tool.key] || {};
        return `<tr>
          <td>${escapeHtml(tool.name)}</td>
          <td><select data-tool-workspace-card-id="${escapeAttr(card.id)}" data-tool-workspace-key="${escapeAttr(tool.key)}" data-tool-workspace-field="status">
            <option value="" ${!row.status ? 'selected' : ''}>Не заполнено</option>
            <option value="ok" ${row.status === 'ok' ? 'selected' : ''}>Проверено</option>
            <option value="problem" ${row.status === 'problem' ? 'selected' : ''}>Есть проблема</option>
          </select></td>
          <td><input data-tool-workspace-card-id="${escapeAttr(card.id)}" data-tool-workspace-key="${escapeAttr(tool.key)}" data-tool-workspace-field="value" value="${escapeAttr(row.value || '')}" placeholder="данные, отчёт или ссылка" /></td>
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
document.getElementById('switchProjectBtn').addEventListener('click', showLauncher);
document.getElementById('projectBtn').addEventListener('click', () => { activeView = 'project'; render(); });
document.getElementById('metricsBtn').addEventListener('click', () => { activeView = 'metrics'; render(); });
document.getElementById('schemeBtn').addEventListener('click', () => { activeView = 'scheme'; render(); });
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
