/* Company offer decisions. A legacy offer remains a virtual first version until approval. */
function guruCompanyOfferVersionsV1(record) {
  if (!record) return [];
  if (Array.isArray(record.offerVersionsV1) && record.offerVersionsV1.length) return record.offerVersionsV1;
  if (!String(record.value || '').trim()) return [];
  return [{ value: String(record.value || ''), approved_at: record.updated_at || record.created_at || '',
    origin: 'gate0', reason: 'Состояние Gate 0 до включения истории',
    evidence: { gate0: {
      rational: String(record.offer?.rational || ''), irrational: String(record.offer?.irrational || ''),
      social: String(record.offer?.social || ''),
    } } }];
}
function guruCompanyOfferApproveV1(record, value, { origin, reason, evidence } = {}) {
  if (!record || record.field !== 'company_offer' || record.scope !== 'project' || record.archived_at) return false;
  const next = String(value ?? '');
  const previous = String(record.value || '');
  if (next === previous) return false;
  const versions = guruCompanyOfferVersionsV1(record).map((entry) => ({ ...entry }));
  const approvedAt = new Date().toISOString();
  versions.push({ value: next, approved_at: approvedAt, origin: origin || 'gate0',
    reason: String(reason || 'Изменено в Gate 0'), evidence: evidence || null });
  record.offerVersionsV1 = versions;
  record.value = next;
  record.updated_at = approvedAt;
  return true;
}
const guruCompanyCtaRolesV1 = ['primary', 'secondary', 'alternative'];
const guruCompanyCtaLabelsV1 = { primary: 'Основной CTA', secondary: 'Вторичный CTA', alternative: 'Альтернативный CTA' };
function guruCompanyCtaCurrentV1(record, role = 'primary') {
  if (!guruCompanyCtaRolesV1.includes(role)) return '';
  const offer = record?.offer && typeof record.offer === 'object' ? record.offer : {};
  const structured = offer.ctaV2 && typeof offer.ctaV2 === 'object' ? offer.ctaV2 : null;
  return String(structured ? structured[role] || '' : role === 'primary' ? offer.cta || '' : '');
}
function guruCompanyCtaStoredVersionsV1(record, role) {
  return role === 'primary' ? record.ctaVersionsV1 : record.ctaVersionsByRoleV1?.[role];
}
function guruCompanyCtaVersionsV1(record, role = 'primary') {
  if (!record) return [];
  if (!guruCompanyCtaRolesV1.includes(role)) return [];
  const stored = guruCompanyCtaStoredVersionsV1(record, role);
  if (Array.isArray(stored) && stored.length) return stored;
  const value = guruCompanyCtaCurrentV1(record, role);
  return value.trim() ? [{ value, approved_at: record.updated_at || record.created_at || '',
    origin: 'gate0', reason: 'Состояние Gate 0 до включения истории' }] : [];
}
function guruCompanyCtaSetVersionsV1(record, role, versions) {
  if (role === 'primary') record.ctaVersionsV1 = versions;
  else record.ctaVersionsByRoleV1 = { ...(record.ctaVersionsByRoleV1 || {}), [role]: versions };
}
function guruCompanyCtaApproveV1(record, value, { role = 'primary', origin, reason, evidence } = {}) {
  if (!record || record.field !== 'company_offer' || record.scope !== 'project' || record.archived_at ||
    !guruCompanyCtaRolesV1.includes(role)) return false;
  const next = String(value ?? '');
  if (next === guruCompanyCtaCurrentV1(record, role)) return false;
  const versions = guruCompanyCtaVersionsV1(record, role).map((entry) => ({ ...entry }));
  const approvedAt = new Date().toISOString();
  versions.push({ role, value: next, approved_at: approvedAt, origin: origin || 'gate0',
    reason: String(reason || 'Изменено в Gate 0'), evidence: evidence || null });
  const previousOffer = record.offer && typeof record.offer === 'object' ? record.offer : {};
  record.offer = { ...previousOffer,
    ...(role === 'primary' ? { cta: next } : {}),
    ctaV2: { ...(previousOffer.ctaV2 && typeof previousOffer.ctaV2 === 'object' ? previousOffer.ctaV2 : {}), [role]: next } };
  guruCompanyCtaSetVersionsV1(record, role, versions);
  record.updated_at = approvedAt;
  return true;
}
function guruCompanyCtaHistoryHtmlV1(record, role = 'primary') {
  const versions = guruCompanyCtaVersionsV1(record, role);
  if (!versions.length) return '';
  return `<details class="company-offer-history company-cta-history" data-company-cta-role="${role}">
    <summary aria-label="История: ${guruCompanyCtaLabelsV1[role]}" title="История: ${guruCompanyCtaLabelsV1[role]}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 4v4h4"/><path d="M12 7v5l3 2"/></svg></summary>
    <ol>${versions.slice().reverse().map((version, index) => {
      const before = versions[versions.length - 2 - index]?.value;
      const date = version.approved_at ? new Date(version.approved_at) : null;
      const when = date && !Number.isNaN(date.valueOf()) ? date.toLocaleString('ru-RU') : 'Дата не указана';
      return `<li><div class="company-offer-history-head"><strong>${index === 0 ? 'Актуальная версия' : 'Предыдущая версия'}</strong><time>${escapeHtml(when)}</time></div>
        <p>${escapeHtml(version.value || 'Пустой CTA')}</p>
        ${before !== undefined ? `<small>Было: ${escapeHtml(before || 'Пустой CTA')}</small>` : ''}
        <small>${escapeHtml(version.reason || (version.origin === 'gate0' ? 'Гипотеза Gate 0' : 'Основание не указано'))}</small>
      </li>`;
    }).join('')}</ol></details>`;
}
const guruCompanyCtaGate0StartV1 = new WeakMap();
document.addEventListener('focusin', (event) => {
  const input = event.target.closest?.('[data-gate0-company-offer-field^="cta_"]');
  if (!input || typeof guruCompanyOffersV360 !== 'function') return;
  const role = input.dataset.gate0CompanyOfferField.slice(4);
  if (!guruCompanyCtaRolesV1.includes(role)) return;
  const record = guruCompanyOffersV360(state).find((item) => item.id === input.dataset.gate0CompanyOfferId);
  if (record) guruCompanyCtaGate0StartV1.set(input, { record, role, value: guruCompanyCtaCurrentV1(record, role),
    updated_at: record.updated_at || record.created_at || '' });
});
document.addEventListener('focusout', (event) => {
  const input = event.target.closest?.('[data-gate0-company-offer-field^="cta_"]');
  const start = input && guruCompanyCtaGate0StartV1.get(input);
  if (!start) return;
  guruCompanyCtaGate0StartV1.delete(input);
  const record = start.record;
  if (!guruCompanyOffersV360(state).includes(record)) return;
  const next = guruCompanyCtaCurrentV1(record, start.role);
  if (next === start.value) return;
  const stored = guruCompanyCtaStoredVersionsV1(record, start.role);
  const versions = Array.isArray(stored) && stored.length
    ? stored.map((entry) => ({ ...entry }))
    : start.value.trim() ? [{ value: start.value, approved_at: start.updated_at,
      origin: 'gate0', reason: 'Состояние Gate 0 до включения истории' }] : [];
  versions.push({ role: start.role, value: next, approved_at: new Date().toISOString(), origin: 'gate0',
    reason: 'Уточнено в Gate 0 · Оффер и CTA', evidence: null });
  guruCompanyCtaSetVersionsV1(record, start.role, versions);
  flashSaving();
  guruStrategicFoundationCompanyRefreshV310();
  if (typeof guruAudienceRefreshView === 'function') guruAudienceRefreshView();
});
function guruCompanyOfferHistoryHtmlV1(record, { open = false, legacyPortraitValue = '' } = {}) {
  const versions = guruCompanyOfferVersionsV1(record);
  if (!versions.length) return '';
  return `<details class="company-offer-history" ${open ? 'open' : ''}>
    <summary aria-label="История оффера" title="История оффера"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 4v4h4"/><path d="M12 7v5l3 2"/></svg></summary>
    <ol>${versions.slice().reverse().map((version, index) => {
      const before = versions[versions.length - 2 - index]?.value;
      const evidence = version.evidence;
      const items = evidence?.audience ? [['Хотят', evidence.audience.jtbd], ['Мешает', evidence.audience.problem],
        ['Выбирают по', evidence.audience.criteria], ['Сомневаются', evidence.audience.objections]].filter(([, value]) => String(value || '').trim()) : [];
      const gate0Items = evidence?.gate0 ? [['Рациональное', evidence.gate0.rational],
        ['Иррациональное', evidence.gate0.irrational], ['Социальное', evidence.gate0.social]]
        .filter(([, value]) => String(value || '').trim()) : [];
      const date = version.approved_at ? new Date(version.approved_at) : null;
      const when = date && !Number.isNaN(date.valueOf()) ? date.toLocaleString('ru-RU') : 'Дата не указана';
      return `<li><div class="company-offer-history-head"><strong>${index === 0 ? 'Актуальная версия' : 'Предыдущая версия'}</strong><time>${escapeHtml(when)}</time></div>
        <p>${escapeHtml(version.value || 'Пустой оффер')}</p>
        ${before !== undefined ? `<small>Было: ${escapeHtml(before || 'Пустой оффер')}</small>` : ''}
        <small>${escapeHtml(version.reason || (version.origin === 'gate0' ? 'Гипотеза Gate 0' : 'Основание не указано'))}</small>
        ${items.length ? `<details class="company-offer-evidence"><summary>Потребность на момент утверждения</summary><dl>${items.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl></details>` : ''}
        ${gate0Items.length ? `<details class="company-offer-evidence"><summary>Выгоды Gate 0 на момент утверждения</summary><dl>${gate0Items.map(([label, value]) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`).join('')}</dl></details>` : ''}
      </li>`;
    }).join('')}</ol>
    ${legacyPortraitValue ? `<p class="company-offer-legacy">Ранее сохранено в этом портрете, без утверждения:<br>${escapeHtml(legacyPortraitValue)}</p>` : ''}
  </details>`;
}
document.addEventListener('click', (event) => {
  const button = event.target.closest?.('[data-company-offer-history-toggle]');
  if (!button) return;
  const details = button.closest('.gate0-company-foundation-offer-v360')?.querySelector('.company-offer-history');
  if (details) details.open = !details.open;
});
