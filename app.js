const LEGACY_STORAGE_KEY = 'guru-platform-mvp-v1';
const PROJECTS_STORAGE_KEY = 'guru-platform-projects-v02';
const WORKSPACE_STORAGE_PREFIX = 'guru-platform-workspace-v02-';
const PLATFORM_VERSION = 'v0.5';
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
let layoutMode = 'cards';

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
  if (meta) {
    workspace.project.name = workspace.project.name || meta.name;
    workspace.project.description = workspace.project.description || meta.description;
    workspace.project.website = workspace.project.website || meta.website;
    workspace.project.niche = workspace.project.niche || meta.niche || meta.type || '';
    workspace.project.geography = workspace.project.geography || meta.geography || '';
    workspace.project.owner = workspace.project.owner || meta.owner || '';
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
  fresh.project.owner = meta.owner || '';
  fresh.project.mainCta = meta.mainCta || '';
  fresh.project.usp = meta.usp || '';
  fresh.project.offer = meta.offer || '';
  fresh.project.afterMainCta = meta.afterMainCta || '';
  fresh.project.afterUsp = meta.afterUsp || '';
  fresh.project.afterOffer = meta.afterOffer || '';
  fresh.project.afterDescription = meta.afterDescription || '';
  fresh.metrics = [];
  prepareSystemCards(fresh);
  initializeEvidenceStructure(fresh);
  syncProjectPassportCard(fresh);
  return fresh;
}

function saveState() {
  if (!state || !activeProjectId) return;
  syncProjectPassportCard(state);
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
  project.owner = state.project.owner || project.owner || '';
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
  document.getElementById('newProjectOwner').value = '';
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
  const owner = document.getElementById('newProjectOwner').value.trim();
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
    owner,
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
  ['geography', 'География'],
  ['owner', 'Ответственный']
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
  workspace.gates.forEach(gate => {
    gate.cards.forEach(card => {
      if (isToolStatusCard(card)) {
        ensureToolItems(card);
        if (TOOL_EVIDENCE_FIELD_CONFIG[card.title]) {
          card.evidenceFields = TOOL_EVIDENCE_FIELD_CONFIG[card.title].map(label => ({ key: normalizeAspectKey(label), label }));
        }
      }
      if (isCurrentResultsCard(card)) ensureCurrentResults(card);
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
  card.evidenceFields = card.evidenceFields || [];
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

function syncProjectPassportCard(workspace = state) {
  if (!workspace?.gates) return;
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
    const values = ensureEvidenceFields(card).map(field => String(getEvidenceValue(field.key, workspace) || '').trim());
    const nonEmptyEvidence = values.filter(Boolean);
    const hasAny = chosen.length || nonEmptyEvidence.length || items.some(item => item.comment);
    const evidenceReady = values.length ? (nonEmptyEvidence.length === values.length && nonEmptyEvidence.every(hasFinalPeriod)) : true;
    if (!hasAny) card.status = 'not_started';
    else if (chosen.length === items.length && evidenceReady) card.status = 'ready';
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
  const project = state.project || {};
  const inputHtml = ([key, label], prefix = '') => {
    const isLong = ['usp','offer','description','afterUsp','afterOffer','afterDescription'].includes(key);
    const value = project[key] || '';
    const title = prefix ? `${prefix} / ${label}` : label;
    return `<label>${escapeHtml(title)}${isLong
      ? `<textarea data-project-inline="${escapeAttr(key)}" rows="3">${escapeHtml(value)}</textarea>`
      : `<input data-project-inline="${escapeAttr(key)}" value="${escapeAttr(value)}" />`}</label>`;
  };
  return `<div class="project-passport-sync">
    <div class="form-grid compact-form passport-meta-grid">
      ${PROJECT_META_FIELDS.map(field => inputHtml(field)).join('')}
    </div>
    <div class="passport-compare-grid compact-compare">
      <section class="passport-column">
        <h3>До начала работ</h3>
        ${PROJECT_BEFORE_FIELDS.map(field => inputHtml(field)).join('')}
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
      card.evidence = composeEvidenceText(card, workspace);
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
  if (activeView === 'evidence') renderEvidenceIndex();
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
  if (layoutMode === 'table') renderGateTable(gate, cards);
  else renderGateCards(gate, cards);
}

function renderGateCards(gate, cards) {
  if (!cards.length) {
    els.contentArea.innerHTML = '<div class="empty">По текущему фильтру ничего не найдено.</div>';
    return;
  }
  els.contentArea.innerHTML = `<div class="cards-grid">${cards.map(cardHtml).join('')}</div>`;
  bindCardInputs();
}

function renderGateTable(gate, cards) {
  els.contentArea.innerHTML = `
    <div class="table-scroll">
      <table class="data-table">
        <thead><tr><th>Блок</th><th>Инструкция</th><th>Статус</th><th>Структурированное доказательство</th><th>Комментарий</th></tr></thead>
        <tbody>${cards.map(c => `
          <tr data-card-row="${c.id}">
            <td class="table-title">${escapeHtml(c.title)}<div class="card-source">CSV строка ${c.sourceRow || ''}</div></td>
            <td class="table-text">${escapeHtml(c.instruction || '')}</td>
            <td>${statusSelect(c)}</td>
            <td>${cardUserFieldsHtml(c)}</td>
            <td><textarea data-field="notes" data-card-id="${c.id}">${escapeHtml(c.notes || '')}</textarea></td>
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
        <label class="field-row">Комментарий<textarea data-field="notes" data-card-id="${c.id}" rows="3">${escapeHtml(c.notes || '')}</textarea></label>
      </div>
    </article>`;
}

function cardUserFieldsHtml(c) {
  if (isProjectPassportCard(c)) return `<div class="field-row"><span>Паспорт проекта</span>${projectPassportFieldsHtml()}</div>`;
  if (isCurrentResultsCard(c)) return `<div class="field-row"><span>Показатели</span>${currentResultsHtml(c)}</div>`;
  if (isToolStatusCard(c)) return `<div class="field-row"><span>Доказательство</span>${evidenceStructuredHtml(c)}</div><div class="field-row"><span>Статусы элементов</span>${toolItemsHtml(c)}</div>`;
  if (isStartupSummaryCard(c)) return `<div class="field-row"><span>Автоматическая сводка</span>${startupSummaryHtml()}</div>`;
  return `<div class="field-row"><span>Доказательство</span>${evidenceStructuredHtml(c)}</div>`;
}

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
        <p class="muted">Gate идут последовательно. В каждом Gate есть карточки. Карточки сохраняют статус, доказательство, комментарий и связь со страницей или кампанией.</p>
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
    g.cards.forEach(c => rows.push([g.title, c.title, c.instruction || '', STATUS_LABELS[c.status] || c.status, c.evidence || '', c.pages || '', c.notes || '', c.sourceRow || '']));
  });
  const catalog = getEvidenceCatalog();
  if (catalog.length) {
    rows.push([]);
    rows.push(['SHARED_EVIDENCE']);
    rows.push(['key', 'title', 'value', 'used_in_blocks']);
    catalog.forEach(item => rows.push([item.key, item.label, getEvidenceValue(item.key), item.cards.map(c => c.title).join(' | ')]));
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
document.getElementById('evidenceBtn').addEventListener('click', () => { activeView = 'evidence'; render(); });
document.getElementById('importBtn').addEventListener('click', () => els.csvInput.click());
els.csvInput.addEventListener('change', e => e.target.files[0] && importCsvFile(e.target.files[0]));
document.getElementById('exportBtn').addEventListener('click', exportCsv);
document.getElementById('exportPdfBtn').addEventListener('click', exportPdfReport);
document.getElementById('resetBtn').addEventListener('click', resetDemo);
document.getElementById('tableViewBtn').addEventListener('click', () => { layoutMode = 'table'; renderGate(); });
document.getElementById('cardsViewBtn').addEventListener('click', () => { layoutMode = 'cards'; renderGate(); });
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
