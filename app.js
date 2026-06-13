const LEGACY_STORAGE_KEY = 'guru-platform-mvp-v1';
const PROJECTS_STORAGE_KEY = 'guru-platform-projects-v02';
const WORKSPACE_STORAGE_PREFIX = 'guru-platform-workspace-v02-';
const PLATFORM_VERSION = 'v0.2';
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
  autosaveDot: document.getElementById('autosaveDot')
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
  }
  workspace.schemaVersion = PLATFORM_VERSION;
  return workspace;
}

function createFreshWorkspace(meta = {}) {
  const fresh = structuredClone(window.GURU_SEED);
  fresh.schemaVersion = PLATFORM_VERSION;
  fresh.project.name = meta.name || 'Новый проект';
  fresh.project.description = meta.description || '';
  fresh.project.website = meta.website || '';
  fresh.project.niche = meta.type || '';
  fresh.metrics = [];
  return fresh;
}

function saveState() {
  if (!state || !activeProjectId) return;
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
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openProject(card.dataset.openProject);
      }
    });
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
    <article class="project-card" data-open-project="${escapeAttr(project.id)}" role="button" tabindex="0">
      <span class="project-avatar">${escapeHtml(project.icon || getProjectIcon(project.name))}</span>
      <span class="project-name">${escapeHtml(project.name)}</span>
      <span class="project-description">${escapeHtml(description)}</span>
      ${website ? `<a class="project-site" href="${escapeAttr(website)}" target="_blank" rel="noopener" data-project-site>Открыть сайт ↗</a>` : `<span class="project-site muted-link">Ссылка не указана</span>`}
    </article>`;
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
  const icon = document.getElementById('newProjectIcon').value.trim().slice(0, 2).toUpperCase();
  if (!name) {
    alert('Введите название проекта.');
    return;
  }
  const project = {
    id: makeId('project'),
    name,
    type,
    description,
    website,
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

function getProgress(cards = allCards()) {
  if (!cards.length) return 0;
  return Math.round((cards.filter(c => c.status === 'ready').length / cards.length) * 100);
}

function render() {
  renderSummary();
  renderGateNav();
  if (activeView === 'project') renderProject();
  if (activeView === 'metrics') renderMetrics();
  if (activeView === 'scheme') renderScheme();
  if (activeView === 'gate') renderGate();
}

function renderSummary() {
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
    cards = cards.filter(c => [c.title, c.instruction, c.evidence, c.pages, c.notes].join(' ').toLowerCase().includes(query));
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
        <thead><tr><th>Блок</th><th>Инструкция</th><th>Статус</th><th>Доказательство</th><th>Комментарий</th></tr></thead>
        <tbody>${cards.map(c => `
          <tr data-card-row="${c.id}">
            <td class="table-title">${escapeHtml(c.title)}<div class="card-source">CSV строка ${c.sourceRow || ''}</div></td>
            <td class="table-text">${escapeHtml(c.instruction || '')}</td>
            <td>${statusSelect(c)}</td>
            <td><textarea data-field="evidence" data-card-id="${c.id}">${escapeHtml(c.evidence || '')}</textarea></td>
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
        <label class="field-row">Доказательство<textarea data-field="evidence" data-card-id="${c.id}" rows="3">${escapeHtml(c.evidence || '')}</textarea></label>
        <label class="field-row">Размещено на странице<input data-field="pages" data-card-id="${c.id}" value="${escapeAttr(c.pages || '')}" /></label>
        <label class="field-row">Комментарий<textarea data-field="notes" data-card-id="${c.id}" rows="3">${escapeHtml(c.notes || '')}</textarea></label>
      </div>
    </article>`;
}

function statusSelect(c) {
  return `<select data-field="status" data-card-id="${c.id}">
    ${Object.entries(STATUS_LABELS).map(([key, label]) => `<option value="${key}" ${c.status === key ? 'selected' : ''}>${label}</option>`).join('')}
  </select>`;
}

function bindCardInputs() {
  document.querySelectorAll('[data-card-id]').forEach(input => {
    input.addEventListener('input', updateCardFromInput);
    input.addEventListener('change', updateCardFromInput);
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
  flashSaving();
  if (field === 'status') render();
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

function exportCsv() {
  const rows = [];
  rows.push(['gate', 'block', 'instruction', 'status', 'evidence', 'pages', 'notes', 'source_row']);
  state.gates.forEach(g => {
    g.cards.forEach(c => rows.push([g.title, c.title, c.instruction || '', STATUS_LABELS[c.status] || c.status, c.evidence || '', c.pages || '', c.notes || '', c.sourceRow || '']));
  });
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
        pages: r[5] || '',
        notes: '',
        fields: {},
        sourceRow: idx + 2
      }))
    };
    if (replace) state.gates = [importedGate]; else state.gates.push(importedGate);
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
