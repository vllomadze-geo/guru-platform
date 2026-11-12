/* Gate 1 / Компания / Целевая аудитория. Disclosure preferences share the
   project-scoped registry used by other blocks; editor drafts remain local. */
const guruAudienceScreens = new WeakMap();
const GURU_AUDIENCE_OPEN_KEY_V1 = 'gate-1|target-audience';
const GURU_AUDIENCE_ROW_PREFIX_V1 = 'gate-1|target-audience|row|';
const guruAudienceZones = [
  { key: 'need', sign: '', title: 'Потребность', fields: [['jtbd', 'Хотят'], ['problem', 'Мешает'], ['criteria', 'Выбирают по'], ['objections', 'Сомневаются']] },
  { key: 'benefits', sign: '+', title: 'Выгоды', fields: [['rational', 'Рациональное'], ['irrational', 'Иррациональное'], ['social', 'Социальное']] },
  { key: 'result', sign: '=', title: 'Единый оффер компании', fields: [['value', 'Оффер'], ['cta_primary', 'Основной CTA'], ['cta_secondary', 'Вторичный CTA'], ['cta_alternative', 'Альтернативный CTA']] },
];
function guruAudienceScreen(workspace = state) {
  if (!workspace || typeof workspace !== 'object') return { open: false, activeId: '', expanded: new Set(), editing: '' };
  let view = guruAudienceScreens.get(workspace);
  if (!view) {
    const saved = workspace.ui?.disclosureOpenV512 || {};
    const open = Object.prototype.hasOwnProperty.call(saved, GURU_AUDIENCE_OPEN_KEY_V1)
      ? saved[GURU_AUDIENCE_OPEN_KEY_V1] === true : workspace.targetAudience?.open === true;
    const expanded = new Set(Object.keys(saved)
      .filter((key) => key.startsWith(GURU_AUDIENCE_ROW_PREFIX_V1) && saved[key] === true)
      .map((key) => key.slice(GURU_AUDIENCE_ROW_PREFIX_V1.length)));
    view = { open, activeId: '', expanded, editing: '' };
    guruAudienceScreens.set(workspace, view);
  }
  return view;
}
function guruAudienceSetOpenV1(open, { save = true } = {}) {
  const view = guruAudienceScreen();
  view.open = Boolean(open);
  guruSetDisclosurePreferenceV512(GURU_AUDIENCE_OPEN_KEY_V1, view.open, { save });
}
function guruAudienceSetRowOpenV1(segmentId, field, open) {
  const rowKey = `${segmentId}:${field}`;
  const view = guruAudienceScreen();
  if (open) view.expanded.add(rowKey);
  else view.expanded.delete(rowKey);
  guruSetDisclosurePreferenceV512(GURU_AUDIENCE_ROW_PREFIX_V1 + rowKey, open);
}
function guruAudienceRestoreDisclosureV1() {
  if (activeGateId !== 'gate-1') return;
  const section = els.contentArea?.querySelector('.target-audience');
  if (!section) return;
  const open = guruAudienceScreen().open;
  section.classList.toggle('is-open', open);
  const toggle = section.querySelector(':scope > [data-audience-toggle]');
  toggle?.setAttribute('aria-expanded', String(open));
  const body = section.querySelector(':scope > .target-audience-body');
  if (body) body.hidden = !open;
}
const guruAudiencePreviousRenderGateV1 = renderGate;
renderGate = function (...args) {
  const result = guruAudiencePreviousRenderGateV1.apply(this, args);
  guruAudienceRestoreDisclosureV1();
  return result;
};
function guruAudienceItems(value, field) {
  const seen = new Set();
  return String(value || '').split(/\r?\n|;\s*/u).map((part) => part.trim()).filter((part) => {
    if (!part) return false;
    if (field !== 'jtbd') return true;
    const key = part.replace(/\s+/gu, ' ').toLocaleLowerCase('ru');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function guruAudienceLinkedOffer(workspace, segment) {
  // Never infer identity from a display name: a link is an explicit record ID.
  const sourceId = String(segment?.gate0SegmentId || segment?.id || '');
  if (!sourceId) return null;
  const records = workspace?.project?.gate0ScopedValuesV194;
  if (!Array.isArray(records)) return null;
  const source = records.find((record) => record.field === 'segments' && record.scope === 'project' && !record.archived_at && record.id === sourceId);
  if (!source) return null;
  const offer = records.find((record) => record.field === 'company_offer' && record.scope === 'project' && !record.archived_at && record.segment_id === sourceId);
  return { source, offer };
}
function guruAudienceCompanySources(workspace) {
  const records = workspace?.project?.gate0ScopedValuesV194;
  return Array.isArray(records) ? records.filter((record) => record.field === 'segments' &&
    record.scope === 'project' && !record.archived_at) : [];
}
function guruAudienceRowSource(segment, row, linked) {
  if (['rational', 'irrational', 'social'].includes(row.field)) return linked?.offer
    ? { label: `Оффер компании · ${guruGateLabel("gate-0")}`, cardId: 'gate0-company-offer', recordId: linked.offer.id,
      selector: row.field }
    : null;
  if (row.field === 'value' && linked?.offer) return { label: 'Уточнить оффер', field: 'value' };
  if (row.field.startsWith('cta_') && linked?.offer) return { label: `Уточнить ${row.label}`, field: row.field };
  if (!String(row.raw || '').trim()) return null;
  return { label: 'Сохранено в этом портрете', field: row.field, readonly: !row.editable };
}
function guruAudienceIcon(name) {
  const paths = {
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L9 17l-4 1 1-4Z"/>',
    source: '<path d="M13 5h6v6"/><path d="m19 5-9 9"/><path d="M19 13v6H5V5h6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7L12.5 19"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    delete: '<path d="M4 7h16"/><path d="M10 4h4"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v5m4-5v5"/>',
    expand: '<path d="m6 9 6 6 6-6"/>',
  };
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ''}</svg>`;
}
// Pure projection: source records and screen state are only read.
function guruTargetAudienceDerive(data, screenState) {
  const segments = Array.isArray(data?.segments) ? data.segments : [];
  const active = segments.find((segment) => segment.id === screenState.activeId) || segments[0] || null;
  if (!active) return { segments, active: null, zones: [], name: '', who: '', geography: '',
    companySources: guruAudienceCompanySources(screenState.workspace) };
  const linked = guruAudienceLinkedOffer(screenState.workspace, active);
  const name = targetAudienceResolvedValue(active, 'name');
  const who = targetAudienceResolvedValue(active, 'who');
  const offer = linked?.offer?.offer || {};
  const zones = guruAudienceZones.map((zone) => {
    const rows = zone.fields.map(([field, label]) => {
      const fromOffer = ['rational', 'irrational', 'social'].includes(field);
      const raw = field.startsWith('cta_') ? (linked?.offer ? guruCompanyCtaCurrentV1(linked.offer, field.slice(4)) : '')
        : fromOffer ? String(offer[field] || '') : targetAudienceResolvedValue(active, field);
      const items = guruAudienceItems(raw, field);
      const preview = field === 'criteria' ? items.slice(0, 3).join(' · ') : items[0] || '';
      const more = Math.max(0, items.length - (field === 'criteria' ? 3 : 1));
      const editable = field.startsWith('cta_') ? Boolean(linked?.offer)
        : !fromOffer && (field !== 'value' || Boolean(linked?.offer || active.manualFields?.value || String(active.value || '').trim()));
      const row = { field, label, raw, items, preview, more, editable,
        linked: Boolean(linked?.offer), offerRecord: (field === 'value' || field.startsWith('cta_')) ? linked?.offer || null : null,
        legacyValue: field === 'value' && String(active.value || '').trim() !== String(raw || '').trim() ? String(active.value || '') : '',
        hasSourceSegment: Boolean(linked?.source) };
      row.source = guruAudienceRowSource(active, row, linked);
      return row;
    });
    return { ...zone, rows };
  });
  return { segments, active, zones, name, who, geography: String(linked?.source?.segment?.geography || ''), linked,
    companySources: guruAudienceCompanySources(screenState.workspace) };
}
function guruAudienceRowHtml(row, view, segmentId) {
  const key = `${segmentId}:${row.field}`;
  const expanded = view.expanded.has(key);
  const editing = view.editing === key;
  const ctaRow = row.field.startsWith('cta_');
  const offerEditing = editing && (row.field === 'value' || ctaRow) && row.offerRecord;
  const isMissingSource = (['rational', 'irrational', 'social', 'value'].includes(row.field) || ctaRow) && !row.linked && !row.editable && !String(row.raw || '').trim();
  const missingLabel = !row.hasSourceSegment ? 'Сегмент компании не связан' : `Для сегмента нет оффера ${guruGateLabel("gate-0")}`;
  const extraItems = row.items.slice(row.field === 'criteria' ? 3 : 1);
  const itemHtml = extraItems.map((value) => `<li>${escapeHtml(value)}</li>`).join('');
  const empty = !String(row.raw || '').trim();
  const display = isMissingSource ? 'Нет данных' : row.preview || (row.editable ? 'Добавить' : 'Нет данных');
  const source = row.source && !editing
    ? `<a href="#${row.source.cardId ? 'gate-0' : 'target-audience'}" class="target-audience-icon" data-audience-source="${escapeAttr(JSON.stringify({ ...row.source, segmentId }))}" title="${escapeAttr(row.source.cardId ? `Открыть источник: ${row.source.label}` : `Изменить: ${row.label}`)}" aria-label="${escapeAttr(row.source.cardId ? `Открыть источник поля «${row.label}»: ${row.source.label}` : `Изменить поле «${row.label}»`)}">${guruAudienceIcon(row.source.cardId ? 'source' : 'edit')}</a>`
    : isMissingSource ? `<button type="button" class="target-audience-icon" ${row.hasSourceSegment ? 'data-audience-open-offers' : 'data-audience-focus-link'} title="${escapeAttr(missingLabel)}" aria-label="${escapeAttr(row.hasSourceSegment ? `Открыть офферы ${guruGateLabel("gate-0")}` : 'Связать с сегментом компании')}">${guruAudienceIcon('link')}</button>` : '';
  return `<div class="target-audience-row${expanded ? ' is-expanded' : ''}" data-audience-row="${escapeAttr(row.field)}" data-audience-segment="${escapeAttr(segmentId)}">
    <span class="target-audience-row-label">${escapeHtml(row.label)}</span>
    <div class="target-audience-row-content">${offerEditing
      ? `<div class="target-audience-offer-editor"><textarea class="target-audience-editor" data-audience-${ctaRow ? 'cta' : 'offer'}-draft="${escapeAttr(segmentId)}" rows="3" aria-label="Новая версия ${ctaRow ? row.label : 'оффера'}">${escapeHtml(row.raw)}</textarea><input type="text" data-audience-${ctaRow ? 'cta' : 'offer'}-reason="${escapeAttr(segmentId)}" aria-label="Основание изменения" placeholder="Основание изменения (по желанию)" value="${escapeAttr(view.offerReason || '')}"><div><button type="button" class="small-btn" data-audience-${ctaRow ? 'cta' : 'offer'}-approve="${escapeAttr(segmentId)}">Утвердить</button><button type="button" class="small-btn" data-audience-${ctaRow ? 'cta' : 'offer'}-cancel="${escapeAttr(segmentId)}">Отмена</button></div><p class="target-audience-offer-error" data-audience-${ctaRow ? 'cta' : 'offer'}-error hidden role="alert"></p></div>`
      : editing
      ? `<textarea class="target-audience-editor" data-audience-editor="${escapeAttr(row.field)}" data-audience-segment="${escapeAttr(segmentId)}" rows="3" placeholder="Добавить">${escapeHtml(row.raw)}</textarea>`
      : `<div class="target-audience-row-line">${empty && row.editable
          ? `<button type="button" class="target-audience-row-main is-empty" data-audience-edit="${escapeAttr(row.field)}">${escapeHtml(display)}</button>`
          : row.offerRecord
            ? `<button type="button" class="target-audience-row-main${empty ? ' is-empty' : ''}" data-audience-${ctaRow ? 'cta' : 'offer'}-history="${escapeAttr(segmentId)}">${escapeHtml(display)}</button>`
          : extraItems.length
            ? `<button type="button" class="target-audience-row-main" data-audience-expand="${escapeAttr(row.field)}" aria-expanded="${expanded}"><span>${escapeHtml(display)}</span><small>· ещё ${extraItems.length}</small>${guruAudienceIcon('expand')}</button>`
            : `<span class="target-audience-row-main${empty ? ' is-empty' : ''}">${escapeHtml(display)}</span>`}
          ${source}</div>
          ${row.offerRecord ? ctaRow ? guruCompanyCtaHistoryHtmlV1(row.offerRecord, row.field.slice(4)) : guruCompanyOfferHistoryHtmlV1(row.offerRecord, { legacyPortraitValue: row.legacyValue }) : ''}
          ${expanded && extraItems.length ? `<div class="target-audience-detail"><ul>${itemHtml}</ul></div>` : ''}`}
    </div>
  </div>`;
}
function guruAudienceZoneHtml(zone, view, segmentId) {
  return `<section class="target-audience-zone" data-audience-zone="${escapeAttr(zone.key)}"><header><span class="target-audience-zone-sign">${zone.sign}</span><strong>${escapeHtml(zone.title)}</strong></header><div>${zone.rows.map((row) => guruAudienceRowHtml(row, view, segmentId)).join('')}</div></section>`;
}
function guruAudienceTabsHtml(projection) {
  const linked = new Set(projection.segments.map((segment) => segment.gate0SegmentId || segment.id));
  return projection.segments.map((segment, index) => `<button type="button" class="${segment === projection.active ? 'is-active' : ''}" data-audience-tab="${escapeAttr(segment.id)}" aria-current="${segment === projection.active ? 'page' : 'false'}">Сегмент ${index + 1}</button>`).join('') +
    projection.companySources.filter((source) => !linked.has(source.id)).map((source) => `<button type="button" data-audience-create-source="${escapeAttr(source.id)}">+ ${escapeHtml(source.segment_name || `Сегмент ${guruGateLabel("gate-0")}`)}</button>`).join('') +
    '<button type="button" class="target-audience-add" data-audience-add>+ Добавить сегмент</button>';
}
function guruAudiencePanelHtml(projection, view) {
  const active = projection.active;
  if (!active) return '<div class="target-audience-empty">Сегментов пока нет. Добавьте первый сегмент.</div>';
  const subtitle = [projection.who && projection.who.trim() !== projection.name.trim() ? projection.who : '', projection.geography].filter(Boolean);
  const linkOpen = view.linkMenuOpen === active.id;
  return `<article class="target-audience-panel" data-audience-panel="${escapeAttr(active.id)}">
    <header class="target-audience-panel-head"><button type="button" class="target-audience-name" data-audience-name>${escapeHtml(projection.name || 'Добавить название')}</button><div class="target-audience-subline"><span>${subtitle.map(escapeHtml).join(' · ')}</span><span class="target-audience-actions"><button type="button" class="target-audience-icon" data-audience-link-toggle aria-expanded="${linkOpen}" aria-label="Связать с сегментом компании" title="Связать с сегментом компании">${guruAudienceIcon('link')}</button>${projection.linked?.source ? `<a href="#gate-0" class="target-audience-icon" data-audience-source="${escapeAttr(JSON.stringify({ cardId: 'gate0-company-segmentation', recordId: projection.linked.source.id, selector: 'segment_name', segmentId: active.id }))}" aria-label="Открыть связанный сегмент в ${guruGateLabel("gate-0")}" title="Открыть связанный сегмент в ${guruGateLabel("gate-0")}">${guruAudienceIcon('source')}</a>` : ''}<button type="button" class="target-audience-icon" data-audience-duplicate="${escapeAttr(active.id)}" aria-label="Дублировать сегмент" title="Дублировать сегмент">${guruAudienceIcon('copy')}</button><button type="button" class="target-audience-icon" data-audience-delete="${escapeAttr(active.id)}" aria-label="Удалить сегмент" title="Удалить сегмент">${guruAudienceIcon('delete')}</button></span></div><div class="target-audience-link-popover" data-audience-link-popover ${linkOpen ? '' : 'hidden'}><label>Сегмент компании · ${guruGateLabel("gate-0")} <select data-audience-company-link="${escapeAttr(active.id)}"><option value="">Не связан</option>${projection.companySources.map((source) => `<option value="${escapeAttr(source.id)}" ${projection.linked?.source?.id === source.id ? 'selected' : ''}>${escapeHtml(source.segment_name || 'Сегмент без названия')}</option>`).join('')}</select></label></div></header>
    <div class="target-audience-zones">${projection.zones.map((zone) => guruAudienceZoneHtml(zone, view, active.id)).join('')}</div>
  </article>`;
}
function guruTargetAudienceViewHtml(model) {
  const view = guruAudienceScreen();
  const projection = guruTargetAudienceDerive(model, { ...view, workspace: state });
  const status = targetAudienceStatus(model);
  return `<section class="target-audience g1-section ${view.open ? 'is-open' : ''}">
    <button type="button" class="target-audience-heading" data-audience-toggle data-target-audience-toggle aria-expanded="${view.open}"><span><strong>Целевая аудитория</strong><small>Кого мы хотим привлечь и почему этот человек покупает</small></span><span class="target-audience-heading-meta"><span class="status-pill status-${status.status}" data-status-block="target-audience">${escapeHtml(STATUS_LABELS[status.status] || status.status)}</span><span data-status-block-meta="target-audience">${status.filled}/${status.total}</span></span></button>
    <div class="target-audience-body"${view.open ? '' : ' hidden'}><p class="target-audience-intro">Здесь хранится логика аудитории. География, возраст, пол и способы таргетинга задаются отдельно внутри конкретной рекламной кампании.</p>
      <nav class="target-audience-tabs" aria-label="Сегменты аудитории">${guruAudienceTabsHtml(projection)}</nav>
      <div class="target-audience-view">${guruAudiencePanelHtml(projection, view)}</div>
    </div></section>`;
}
function guruAudienceRefreshView() {
  const section = document.querySelector('.target-audience');
  if (!section) return;
  const view = guruAudienceScreen();
  const projection = guruTargetAudienceDerive(state?.targetAudience, { ...view, workspace: state });
  const tabs = section.querySelector('.target-audience-tabs');
  if (tabs) tabs.innerHTML = guruAudienceTabsHtml(projection);
  const panel = section.querySelector('.target-audience-view');
  if (panel) panel.innerHTML = guruAudiencePanelHtml(projection, view);
  guruRefreshDynamicBlockStatusUi();
}
function guruAudienceRefreshRow(field, segmentId) {
  const section = document.querySelector('.target-audience');
  const rowElement = [...(section?.querySelectorAll('[data-audience-row]') || [])].find((node) => node.dataset.audienceRow === field && node.dataset.audienceSegment === segmentId);
  if (!rowElement) return;
  const view = guruAudienceScreen();
  const projection = guruTargetAudienceDerive(state?.targetAudience, { ...view, workspace: state });
  const zone = projection.zones.find((entry) => entry.rows.some((row) => row.field === field));
  const row = zone?.rows.find((entry) => entry.field === field);
  if (!row) return;
  rowElement.outerHTML = guruAudienceRowHtml(row, view, segmentId);
  guruRefreshDynamicBlockStatusUi();
}
function guruAudienceStartEdit(field, segmentId) {
  const view = guruAudienceScreen();
  guruAudienceSetRowOpenV1(segmentId, field, true);
  view.editing = `${segmentId}:${field}`;
  if (field === 'value' || field.startsWith('cta_')) view.offerReason = '';
  if (field === 'name') {
    const panel = document.querySelector(`[data-audience-panel="${CSS.escape(segmentId)}"]`);
    const name = panel?.querySelector('.target-audience-name');
    if (!name) return;
    const value = targetAudienceResolvedValue(state.targetAudience.segments.find((segment) => segment.id === segmentId), 'name');
    name.outerHTML = `<textarea class="target-audience-name-editor" data-audience-editor="name" data-audience-segment="${escapeAttr(segmentId)}" rows="1" placeholder="Добавить название">${escapeHtml(value)}</textarea>`;
    panel.querySelector('[data-audience-editor="name"]')?.focus();
  } else {
    guruAudienceRefreshRow(field, segmentId);
    document.querySelector(`[data-audience-row="${CSS.escape(field)}"] [data-audience-offer-draft],[data-audience-row="${CSS.escape(field)}"] [data-audience-cta-draft],[data-audience-row="${CSS.escape(field)}"] [data-audience-editor]`)?.focus();
  }
}
function guruAudienceOpenGate0Source(source) {
  const records = state?.project?.gate0ScopedValuesV194;
  const record = Array.isArray(records) && records.find((item) => item.id === source.recordId &&
    !item.archived_at && item.scope === 'project' &&
    item.field === (source.cardId === 'gate0-company-offer' ? 'company_offer' : 'segments'));
  if (!record) { guruAudienceRefreshView(); return; }
  const field = source.cardId === 'gate0-company-offer' ?
    (source.selector === 'unified' ? 'offer' : source.selector) : source.selector;
  state._gate0Open ||= {};
  state._gate0Open[source.cardId] = true;
  guruInvalidateGateViewCache();
  guruNavigateToGate('gate-0');
  const focusSource = (attempt = 0) => {
    if (activeGateId !== 'gate-0') return;
    const selector = source.cardId === 'gate0-company-offer'
      ? `[data-gate0-company-offer-id="${CSS.escape(source.recordId)}"][data-gate0-company-offer-field="${CSS.escape(field)}"]`
      : `[data-gate0-company-segmentation-id="${CSS.escape(source.recordId)}"][data-gate0-company-segmentation-field="${CSS.escape(field)}"]`;
    const node = document.querySelector(selector);
    if (node) g3ProductJourneyRevealSource(node);
    else if (attempt < 40) setTimeout(() => focusSource(attempt + 1), 50);
  };
  focusSource();
}
function guruAudienceOpenGate0Card(cardId) {
  state._gate0Open ||= {};
  state._gate0Open[cardId] = true;
  guruInvalidateGateViewCache();
  guruNavigateToGate('gate-0');
  const focusCard = (attempt = 0) => {
    if (activeGateId !== 'gate-0') return;
    const node = document.querySelector(`[data-card-row="${CSS.escape(cardId)}"]`);
    if (node) g3ProductJourneyRevealSource(node);
    else if (attempt < 40) setTimeout(() => focusCard(attempt + 1), 50);
  };
  focusCard();
}
document.addEventListener('click', (event) => {
  const portraitLink = event.target.closest?.('[data-gate0-company-portrait-link]');
  if (portraitLink) {
    event.preventDefault();
    const sourceId = portraitLink.dataset.gate0CompanyPortraitLink;
    const segment = state?.targetAudience?.segments?.find((item) => item.gate0SegmentId === sourceId || item.id === sourceId);
    if (!segment) return;
    const view = guruAudienceScreen();
    view.activeId = segment.id;
    guruAudienceSetOpenV1(true);
    g3ProductJourneyPrepareSource({ gateId: 'gate-1', kind: 'gate1-target-audience' });
    guruNavigateToGate('gate-1');
    const focusPortrait = (attempt = 0) => {
      if (activeGateId !== 'gate-1') return;
      const panel = document.querySelector(`[data-audience-panel="${CSS.escape(segment.id)}"]`);
      if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      else if (attempt < 40) setTimeout(() => focusPortrait(attempt + 1), 50);
    };
    focusPortrait();
    return;
  }
  const sourceButton = event.target.closest?.('[data-audience-source]');
  if (sourceButton) {
    event.preventDefault();
    const source = JSON.parse(sourceButton.dataset.audienceSource);
    if (source.field) {
      if (source.readonly) {
        guruAudienceSetRowOpenV1(source.segmentId, source.field, true);
        guruAudienceRefreshRow(source.field, source.segmentId);
        document.querySelector(`[data-audience-panel="${CSS.escape(source.segmentId)}"] [data-audience-row="${CSS.escape(source.field)}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else guruAudienceStartEdit(source.field, source.segmentId);
    } else if (source.cardId) guruAudienceOpenGate0Source(source);
    return;
  }
  const offerHistory = event.target.closest?.('[data-audience-offer-history]');
  if (offerHistory) {
    const details = offerHistory.closest('[data-audience-row]')?.querySelector('.company-offer-history');
    if (details) details.open = !details.open;
    return;
  }
  const ctaHistory = event.target.closest?.('[data-audience-cta-history]');
  if (ctaHistory) {
    const details = ctaHistory.closest('[data-audience-row]')?.querySelector('.company-cta-history');
    if (details) details.open = !details.open;
    return;
  }
  const ctaCancel = event.target.closest?.('[data-audience-cta-cancel]');
  if (ctaCancel) {
    const field = ctaCancel.closest('[data-audience-row]')?.dataset.audienceRow;
    if (!field?.startsWith('cta_')) return;
    const view = guruAudienceScreen();
    view.editing = '';
    guruAudienceRefreshRow(field, ctaCancel.dataset.audienceCtaCancel);
    return;
  }
  const ctaApprove = event.target.closest?.('[data-audience-cta-approve]');
  if (ctaApprove) {
    const field = ctaApprove.closest('[data-audience-row]')?.dataset.audienceRow;
    if (!field?.startsWith('cta_')) return;
    const role = field.slice(4);
    const segmentId = ctaApprove.dataset.audienceCtaApprove;
    const segment = state?.targetAudience?.segments?.find((item) => item.id === segmentId);
    const linked = guruAudienceLinkedOffer(state, segment);
    const editor = ctaApprove.closest('.target-audience-offer-editor');
    const draft = editor?.querySelector('[data-audience-cta-draft]');
    const reason = editor?.querySelector('[data-audience-cta-reason]');
    if (!linked?.offer || !draft || !reason || ctaApprove.disabled) return;
    if (!draft.value.trim()) { draft.setCustomValidity('Введите CTA.'); draft.reportValidity(); return; }
    const workspace = state;
    const record = linked.offer;
    const previous = { offer: record.offer, updated_at: record.updated_at,
      hasUpdatedAt: Object.hasOwn(record, 'updated_at'),
      versions: record.ctaVersionsV1, hasVersions: Object.hasOwn(record, 'ctaVersionsV1'),
      versionsByRole: record.ctaVersionsByRoleV1, hasVersionsByRole: Object.hasOwn(record, 'ctaVersionsByRoleV1') };
    const restore = () => {
      record.offer = previous.offer;
      if (previous.hasUpdatedAt) record.updated_at = previous.updated_at;
      else delete record.updated_at;
      if (previous.hasVersions) record.ctaVersionsV1 = previous.versions;
      else delete record.ctaVersionsV1;
      if (previous.hasVersionsByRole) record.ctaVersionsByRoleV1 = previous.versionsByRole;
      else delete record.ctaVersionsByRoleV1;
    };
    const changed = guruCompanyCtaApproveV1(record, draft.value, { role, origin: 'gate1-target-audience',
      reason: reason.value.trim() || 'Уточнено в Целевой аудитории',
      evidence: { audienceSegmentId: segmentId, gate0SegmentId: linked.source.id } });
    if (!changed) {
      const view = guruAudienceScreen();
      view.editing = '';
      guruAudienceRefreshRow(field, segmentId);
      return;
    }
    ctaApprove.disabled = true;
    ctaApprove.textContent = 'Сохраняю...';
    const error = editor.querySelector('[data-audience-cta-error]');
    if (error) error.hidden = true;
    guruQueueWorkspaceSave({ durable: true }).then((saved) => {
      if (workspace !== state) return;
      if (!saved) {
        restore();
        ctaApprove.disabled = false;
        ctaApprove.textContent = 'Утвердить';
        if (error) { error.textContent = 'CTA не сохранён. Повторите попытку после освобождения места в хранилище.'; error.hidden = false; }
        return;
      }
      const view = guruAudienceScreen();
      if (view.editing === `${segmentId}:${field}`) {
        view.editing = '';
        guruAudienceRefreshRow(field, segmentId);
      }
      guruStrategicFoundationCompanyRefreshV310();
      guruScheduleDerivedRefresh();
    }).catch((saveError) => {
      console.error('Не удалось сохранить утверждённый CTA', saveError);
      if (workspace !== state) return;
      restore();
      ctaApprove.disabled = false;
      ctaApprove.textContent = 'Утвердить';
      if (error) { error.textContent = 'CTA не сохранён. Повторите попытку.'; error.hidden = false; }
    });
    return;
  }
  const offerCancel = event.target.closest?.('[data-audience-offer-cancel]');
  if (offerCancel) {
    const view = guruAudienceScreen();
    view.editing = '';
    guruAudienceRefreshRow('value', offerCancel.dataset.audienceOfferCancel);
    return;
  }
  const offerApprove = event.target.closest?.('[data-audience-offer-approve]');
  if (offerApprove) {
    const segmentId = offerApprove.dataset.audienceOfferApprove;
    const segment = state?.targetAudience?.segments?.find((item) => item.id === segmentId);
    const linked = guruAudienceLinkedOffer(state, segment);
    const editor = offerApprove.closest('.target-audience-offer-editor');
    const draft = editor?.querySelector('[data-audience-offer-draft]');
    const reason = editor?.querySelector('[data-audience-offer-reason]');
    if (!linked?.offer || !draft || !reason || offerApprove.disabled) return;
    if (!draft.value.trim()) { draft.setCustomValidity('Введите оффер.'); draft.reportValidity(); return; }
    const evidence = { audienceSegmentId: segmentId, gate0SegmentId: linked.source.id,
      audience: Object.fromEntries(['jtbd', 'problem', 'criteria', 'objections'].map((field) => [field, targetAudienceResolvedValue(segment, field)])),
      gate0: Object.fromEntries(['rational', 'irrational', 'social'].map((field) => [field, String(linked.offer.offer?.[field] || '')])) };
    const workspace = state;
    const previousOffer = {
      value: linked.offer.value, updated_at: linked.offer.updated_at,
      hasUpdatedAt: Object.hasOwn(linked.offer, 'updated_at'),
      hasVersions: Object.hasOwn(linked.offer, 'offerVersionsV1'),
      versions: linked.offer.offerVersionsV1,
    };
    const restoreOffer = () => {
      linked.offer.value = previousOffer.value;
      if (previousOffer.hasUpdatedAt) linked.offer.updated_at = previousOffer.updated_at;
      else delete linked.offer.updated_at;
      if (previousOffer.hasVersions) linked.offer.offerVersionsV1 = previousOffer.versions;
      else delete linked.offer.offerVersionsV1;
    };
    guruCompanyOfferApproveV1(linked.offer, draft.value, { origin: 'gate1-target-audience',
      reason: reason.value.trim() || 'Уточнено в Целевой аудитории', evidence });
    offerApprove.disabled = true;
    offerApprove.textContent = 'Сохраняю...';
    const error = editor.querySelector('[data-audience-offer-error]');
    if (error) error.hidden = true;
    // Await the durable write. Closing the editor before it completes made a
    // failed localStorage write look like a successful approval.
    guruQueueWorkspaceSave({ durable: true }).then((saved) => {
      if (workspace !== state) return;
      if (!saved) {
        restoreOffer();
        offerApprove.disabled = false;
        offerApprove.textContent = 'Утвердить';
        if (error) { error.textContent = 'Оффер не сохранён. Повторите попытку после освобождения места в хранилище.'; error.hidden = false; }
        return;
      }
      const view = guruAudienceScreen();
      if (view.editing === `${segmentId}:value`) {
        view.editing = '';
        guruAudienceRefreshRow('value', segmentId);
      }
      guruStrategicFoundationCompanyRefreshV310();
      guruCompanyKeywordFoundationRefreshV351();
      guruScheduleDerivedRefresh();
    }).catch((saveError) => {
      console.error('Не удалось сохранить утверждённый оффер', saveError);
      if (workspace !== state) return;
      restoreOffer();
      offerApprove.disabled = false;
      offerApprove.textContent = 'Утвердить';
      if (error) { error.textContent = 'Оффер не сохранён. Повторите попытку.'; error.hidden = false; }
    });
    return;
  }
  const clickedRow = event.target.closest?.('.target-audience-row');
  if (clickedRow && !event.target.closest('button, textarea')) {
    clickedRow.querySelector('[data-audience-expand]')?.click();
    return;
  }
  const target = event.target.closest?.('[data-audience-toggle],[data-audience-tab],[data-audience-create-source],[data-audience-expand],[data-audience-edit],[data-audience-name],[data-audience-add],[data-audience-duplicate],[data-audience-delete],[data-audience-focus-link],[data-audience-open-offers],[data-audience-link-toggle]');
  if (!target) return;
  const view = guruAudienceScreen();
  const section = target.closest('.target-audience');
  if (!section) return;
  if (target.hasAttribute('data-audience-toggle')) {
    guruAudienceSetOpenV1(target.getAttribute('aria-expanded') !== 'true');
    section.classList.toggle('is-open', view.open);
    target.setAttribute('aria-expanded', String(view.open));
    section.querySelector(':scope > .target-audience-body').hidden = !view.open;
    return;
  }
  if (target.hasAttribute('data-audience-focus-link')) {
    if (guruAudienceCompanySources(state).length) {
      const toggle = section.querySelector('[data-audience-link-toggle]');
      const popover = section.querySelector('[data-audience-link-popover]');
      if (popover?.hidden) toggle?.click();
      popover?.querySelector('[data-audience-company-link]')?.focus();
    }
    else guruAudienceOpenGate0Card('gate0-company-segmentation');
    return;
  }
  if (target.hasAttribute('data-audience-open-offers')) { guruAudienceOpenGate0Card('gate0-company-offer'); return; }
  if (target.hasAttribute('data-audience-link-toggle')) {
    const popover = section.querySelector('[data-audience-link-popover]');
    if (!popover) return;
    popover.hidden = !popover.hidden;
    view.linkMenuOpen = popover.hidden ? '' : section.querySelector('[data-audience-panel]')?.dataset.audiencePanel || '';
    target.setAttribute('aria-expanded', String(!popover.hidden));
    if (!popover.hidden) popover.querySelector('select')?.focus();
    return;
  }
  if (target.hasAttribute('data-audience-tab')) { view.activeId = target.dataset.audienceTab; view.editing = ''; guruAudienceRefreshView(); return; }
  if (target.hasAttribute('data-audience-create-source')) {
    const sourceId = target.dataset.audienceCreateSource;
    const source = guruAudienceCompanySources(state).find((item) => item.id === sourceId);
    const model = ensureTargetAudience();
    if (!source || model.segments.some((item) => item.gate0SegmentId === sourceId || item.id === sourceId)) return;
    const segment = targetAudienceBlankSegment({ gate0SegmentId: sourceId, autoProject: false });
    model.segments.push(segment);
    view.activeId = segment.id;
    saveState();
    guruAudienceRefreshView();
    return;
  }
  const segmentId = target.closest('[data-audience-panel]')?.dataset.audiencePanel || '';
  if (target.hasAttribute('data-audience-name')) { guruAudienceStartEdit('name', segmentId); return; }
  if (target.hasAttribute('data-audience-edit')) { guruAudienceStartEdit(target.dataset.audienceEdit, segmentId); return; }
  if (target.hasAttribute('data-audience-expand')) {
    const field = target.dataset.audienceExpand;
    const row = guruTargetAudienceDerive(state?.targetAudience, { ...view, workspace: state }).zones.flatMap((zone) => zone.rows).find((entry) => entry.field === field);
    if (!row) return;
    if (!String(row.raw || '').trim() && row.editable) { guruAudienceStartEdit(field, segmentId); return; }
    const key = `${segmentId}:${field}`;
    guruAudienceSetRowOpenV1(segmentId, field, !view.expanded.has(key));
    guruAudienceRefreshRow(field, segmentId);
    return;
  }
  if (target.hasAttribute('data-audience-add')) {
    const model = ensureTargetAudience();
    const segment = targetAudienceBlankSegment();
    model.segments.push(segment);
    view.activeId = segment.id;
    saveState();
    guruAudienceRefreshView();
    return;
  }
  if (target.hasAttribute('data-audience-duplicate')) {
    const model = ensureTargetAudience();
    const index = model.segments.findIndex((segment) => segment.id === target.dataset.audienceDuplicate);
    if (index < 0) return;
    const resolved = targetAudienceResolvedSegment(model.segments[index]);
    const manualFields = Object.fromEntries(TARGET_AUDIENCE_ALL_FIELDS.map((field) => [field, true]));
    const copy = targetAudienceBlankSegment({ ...resolved, id: '', gate0SegmentId: '', name: `${resolved.name || 'Сегмент'} - копия`, autoProject: false, manualFields });
    model.segments.splice(index + 1, 0, copy);
    view.activeId = copy.id;
    saveState();
    guruAudienceRefreshView();
    return;
  }
  if (target.hasAttribute('data-audience-delete')) {
    const model = ensureTargetAudience();
    const id = target.dataset.audienceDelete;
    if (model.segments.find((segment) => segment.id === id)?.autoProject) model.autoSeedDismissed = true;
    model.segments = model.segments.filter((segment) => segment.id !== id);
    const campaigns = g4EnsureLaunchCampaigns();
    Object.values(campaigns).forEach((campaign) => {
      if (campaign.audienceSegmentId === id) { campaign.audienceSegmentId = ''; campaign.audienceJtbdId = ''; }
    });
    view.activeId = model.segments[0]?.id || '';
    saveState();
    guruAudienceRefreshView();
  }
});
document.addEventListener('change', (event) => {
  const select = event.target.closest?.('[data-audience-company-link]');
  if (!select) return;
  const segment = state?.targetAudience?.segments?.find((item) => item.id === select.dataset.audienceCompanyLink);
  if (!segment) return;
  const nextId = select.value;
  if (nextId && !guruAudienceCompanySources(state).some((item) => item.id === nextId)) return;
  if (nextId && state.targetAudience.segments.some((item) => item !== segment &&
    (item.gate0SegmentId === nextId || item.id === nextId))) {
    select.value = segment.gate0SegmentId || '';
    return;
  }
  if ((segment.gate0SegmentId || '') === nextId) return;
  if (nextId) segment.gate0SegmentId = nextId;
  else delete segment.gate0SegmentId;
  guruAudienceScreen().linkMenuOpen = '';
  saveState();
  guruAudienceRefreshView();
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const popover = event.target.closest?.('[data-audience-link-popover]');
  if (!popover) return;
  popover.hidden = true;
  guruAudienceScreen().linkMenuOpen = '';
  const toggle = popover.closest('[data-audience-panel]')?.querySelector('[data-audience-link-toggle]');
  toggle?.setAttribute('aria-expanded', 'false');
  toggle?.focus();
});
document.addEventListener('input', (event) => {
  if (event.target.matches?.('[data-audience-offer-draft],[data-audience-offer-reason],[data-audience-cta-draft],[data-audience-cta-reason]'))
    event.target.setCustomValidity('');
});
document.addEventListener('focusout', (event) => {
  const editor = event.target.closest?.('[data-audience-editor]');
  if (!editor || !editor.closest('.target-audience')) return;
  const field = editor.dataset.audienceEditor;
  const segmentId = editor.dataset.audienceSegment;
  const view = guruAudienceScreen();
  const segment = state?.targetAudience?.segments?.find((item) => item.id === segmentId);
  if (!segment) return;
  const value = editor.value;
  const prior = targetAudienceResolvedValue(segment, field);
  if (value !== prior) {
    segment[field] = value;
    segment.manualFields = segment.manualFields || {};
    segment.manualFields[field] = true;
    flashSaving();
  }
  view.editing = '';
  if (field === 'name') guruAudienceRefreshView();
  else guruAudienceRefreshRow(field, segmentId);
});
