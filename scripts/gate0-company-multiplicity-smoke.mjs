import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const appPort = process.env.GURU_APP_PORT || "3193";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9365";
const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const page = pages.find((item) => item.type === "page");
assert(page?.webSocketDebuggerUrl, "Chrome page is available");
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});
let sequence = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id) return;
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
});
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => reject(new Error(`${method} timed out`)), 30000);
    pending.set(id, {
      resolve(value) { clearTimeout(timer); resolve(value); },
      reject(error) { clearTimeout(timer); reject(error); },
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const response = await call("Runtime.evaluate", {
    expression, awaitPromise: true, returnByValue: true,
  });
  if (response.exceptionDetails)
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  return response.result.value;
}

try {
  await call("Runtime.enable");
  await call("Page.addScriptToEvaluateOnNewDocument", { source: `{
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => String(input).includes('/api/')
      ? Promise.resolve(new Response(JSON.stringify({ ok: true, projects: [], workspaces: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }))
      : nativeFetch(input, init);
  }` });
  await call("Page.navigate", { url: `http://127.0.0.1:${appPort}/` });
  await new Promise((resolve) => setTimeout(resolve, 1400));
  const result = await evaluate(`(async () => {
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    rememberAccessUnlocked(); setAccessState(true); bootstrapAppOnce();
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    const project = { id: 'company-multiple-' + Date.now(), name: 'Company multiple smoke',
      lifecycleStatus: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    state = createFreshWorkspace(project); activeProjectId = project.id;
    Object.assign(state.project, {
      goalDescription: 'Получить 100 заказов', goalMetric: 'sales', goalTargetValue: '100',
      goalDeadline: '2027-12-31', goalBudget: '100000', goalAllowedCost: '1000',
    });
    const now = new Date().toISOString();
    const record = (id, field, value, extra) => ({ id, project_id: project.id,
      category_id: '', product_id: '', scope: 'project', field, value, ...extra,
      source: { type: 'manual', label: 'Smoke' }, confirmation_status: 'draft',
      created_at: now, updated_at: now });
    state.project.gate0ScopedValuesV194 = [
      record('legacy-segment', 'segments', 'Женщины 25+ и семьи, которые ценят уют и авторские подарки', { segment: {
        geography: 'Россия', demographics: 'Взрослые', psychographics: 'Ценят ручную работу',
        behavior: 'Выбирают онлайн', need_response: 'Ищут необычный подарок' } }),
      record('archived-segment', 'segments', 'Прежняя аудитория', {
        segment_name: 'Бывшие клиенты', archived_at: now }),
      record('legacy-offer', 'company_offer', 'Авторские подарки с доставкой', { offer: {
        rational: 'Доставка', irrational: 'Радость', social: 'Рекомендации', cta: 'Выбрать подарок' } }),
      record('legacy-purpose', 'brand_purpose', 'Помогать выбирать подарки', { brandPurpose: {
        functional: 'Подбирать подарки', higher: 'Объединять людей' } }),
      record('legacy-positioning', 'positioning', 'Авторские подарки ручной работы', { positioning: {
        category: 'Подарки', key_difference: 'Авторская работа', basis: 'Мастера' } }),
    ];
    prepareSystemCards(state);
    check(guruCompanySegmentsV360(state)[0].id === 'legacy-segment', 'Segment ID changed');
    check(Object.hasOwn(guruCompanySegmentsV360(state)[0], 'segment_name') &&
      guruCompanySegmentsV360(state)[0].segment_name === '',
      'Legacy segment name was generated or missing after migration');
    check(guruV309CompanySegmentationStatus(state) === 'in_progress',
      'Unnamed primary segment was marked ready');
    guruCompanySegmentsV360(state)[0].segment_name = 'Частные покупатели';
    check(guruV309CompanySegmentationStatus(state) === 'ready',
      'A fully described and named primary segment was not ready');
    check(guruStrategicFoundationContextCompanyV310(state).segmentRows[0]?.complete,
      'Complete segment was not ready in the strategic summary');
    guruCompanySegmentsV360(state)[0].segment_name = '';
    check(guruCompanyOffersV360(state)[0].id === 'legacy-offer', 'Offer ID changed');
    check(guruCompanyOffersV360(state)[0].segment_id === '' &&
      !Object.hasOwn(guruCompanyOffersV360(state)[0], 'segment_ids'),
      'Legacy offer did not gain a blank single segment ID');
    const linkedHistory = structuredClone(state);
    guruCompanyOffersV360(linkedHistory)[0].segment_ids = ['legacy-segment'];
    guruCompanyStrategyMigrateV360(linkedHistory);
    check(guruCompanyOffersV360(linkedHistory)[0].segment_id === 'legacy-segment' &&
      !Object.hasOwn(guruCompanyOffersV360(linkedHistory)[0], 'segment_ids'),
      'Migration did not convert an existing historical segment link');
    check(guruV194OfferParts(guruCompanyOffersV360(state)[0]).ctaV2.primary === 'Выбрать подарок', 'Legacy CTA lost');
    check(guruCompanyPrimaryGoalV360(state).goalDescription === 'Получить 100 заказов', 'Legacy goal lost');
    prepareSystemCards(state);
    check(guruCompanySegmentsV360(state).length === 1 && guruCompanyOffersV360(state).length === 1 &&
      guruCompanyGoalsV360(state).length === 1, 'Migration created duplicates');
    const fixture = document.createElement('div');
    fixture.innerHTML = guruV309CompanySegmentationHtml() + guruV347CompanyOfferHtml() +
      '<div class="field-row g8-goal-source-row">' + g8ProjectGoalSourceHtml() + '</div>';
    document.body.append(fixture);
    check(document.querySelector('[data-gate0-company-offer-segment-id] option[value="legacy-segment"]')?.textContent === 'Основной сегмент' &&
      !document.querySelector('.gate0-company-offer-segments-v360'),
      'Unnamed segment fallback or compact offer header is wrong');
    const click = (selector) => {
      const node = document.querySelector(selector);
      check(node && !node.disabled, 'Missing enabled action: ' + selector);
      node.click();
    };
    for (let i = 0; i < 4; i++) click('[data-gate0-company-segment-add]');
    check(guruCompanySegmentsV360(state).length === 5, 'Segment limit did not reach 5');
    check(guruV309CompanySegmentationStatus(state) === 'in_progress',
      'Blank additional segments were marked ready');
    check(document.querySelector('[data-gate0-company-segment-add]')?.disabled, 'Segment add not disabled');
    const secondSegmentId = guruCompanySegmentsV360(state)[1].id;
    check(document.querySelector('[data-gate0-company-offer-segment-id] option[value="' + secondSegmentId + '"]')?.textContent === 'Дополнительный сегмент 1',
      'Unnamed additional segment did not use the role-based fallback');
    const setSegmentName = (id, value) => {
      const input = document.querySelector('[data-gate0-company-segmentation-id="' + id + '"][data-gate0-company-segmentation-field="segment_name"]');
      check(Boolean(input), 'Segment name field missing for ' + id);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return input;
    };
    const primaryNameInput = setSegmentName('legacy-segment', 'Частные покупатели');
    check(primaryNameInput.compareDocumentPosition(document.querySelector('[data-gate0-company-segmentation-id="legacy-segment"][data-gate0-company-segmentation-field="geography"]')) & Node.DOCUMENT_POSITION_FOLLOWING,
      'Segment name is not before geography');
    setSegmentName(secondSegmentId, 'Корпоративные клиенты');
    check(document.querySelector('[data-gate0-company-segment-entry="legacy-segment"] [data-gate0-company-segment-title]')?.textContent === 'Частные покупатели' &&
      document.querySelector('[data-gate0-company-segment-entry="' + secondSegmentId + '"] [data-gate0-company-segment-title]')?.textContent === 'Корпоративные клиенты',
      'Named segment headings did not update');
    const duplicateInput = setSegmentName(secondSegmentId, '  ЧАСТНЫЕ   ПОКУПАТЕЛИ  ');
    check(!duplicateInput.validity.valid && duplicateInput.getAttribute('aria-invalid') === 'true' &&
      guruCompanySegmentsV360(state).find((item) => item.id === secondSegmentId).segment_name === 'Корпоративные клиенты',
      'Duplicate segment name was saved or not reported');
    const archivedDuplicateInput = setSegmentName(secondSegmentId, ' бывшие КЛИЕНТЫ ');
    check(archivedDuplicateInput.validity.valid &&
      guruCompanySegmentsV360(state).find((item) => item.id === secondSegmentId).segment_name === 'бывшие КЛИЕНТЫ' &&
      guruCompanySegmentNameConflictV360('Бывшие клиенты', 'archived-segment', state)?.id === secondSegmentId &&
      !document.querySelector('[data-gate0-company-segment-restore="archived-segment"]')
        ?.closest('.gate0-company-archive-row-v360')?.querySelector('[data-gate0-company-archived-name-conflict]')?.hidden,
      'Archived duplicate did not remain allowed or restoration was not protected');
    setSegmentName(secondSegmentId, 'Корпоративные клиенты');
    const segmentInput = document.querySelector('[data-gate0-company-segmentation-id="' + secondSegmentId + '"][data-gate0-company-segmentation-field="unified"]');
    segmentInput.value = 'Дополнительная аудитория';
    segmentInput.dispatchEvent(new Event('input', { bubbles: true }));
    check(guruCompanySegmentsV360(state).find((item) => item.id === secondSegmentId)?.value === 'Дополнительная аудитория',
      'Segment editor wrote to the wrong record');
    click('[data-gate0-company-segment-primary="' + secondSegmentId + '"]');
    check(guruCompanySegmentsV360(state).filter((item) => item.is_primary).length === 1 &&
      guruCompanySegmentsV360(state)[0].id === secondSegmentId, 'Segment primary not exclusive');
    click('[data-gate0-company-segment-archive="' + secondSegmentId + '"]');
    check(guruCompanySegmentsV360(state).length === 4, 'Archived segment remained active');
    click('[data-gate0-company-segment-restore="' + secondSegmentId + '"]');
    check(guruCompanySegmentsV360(state).length === 5, 'Segment restore failed');
    check(Boolean(document.querySelector('[data-gate0-company-offer-segment-id]')) &&
      !document.querySelector('[data-gate0-company-offer-archive]'),
      'Offer segment selector is missing or archive control returned');
    check(document.querySelector('[data-gate0-company-offer-entry="legacy-offer"]')?.open,
      'First offer is not open by default');
    document.querySelector('[data-gate0-company-offer-entry="legacy-offer"] > summary').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    guruCompanyStrategyRefreshV360();
    check(!document.querySelector('[data-gate0-company-offer-entry="legacy-offer"]')?.open,
      'Closing the first offer did not persist');
    document.querySelector('[data-gate0-company-offer-entry="legacy-offer"] > summary').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    guruCompanyStrategyRefreshV360();
    check(document.querySelector('[data-gate0-company-offer-entry="legacy-offer"]')?.open,
      'Reopening the first offer did not persist');
    click('[data-gate0-company-segment-archive="' + secondSegmentId + '"]');
    check(guruV347CompanyOfferStatus(state) === 'in_progress',
      'Unlinked offer was marked ready');
    const independentSummary = new DOMParser().parseFromString(guruStrategicFoundationCompanyHtmlV310(state), 'text/html');
    check(independentSummary.querySelector('.gate0-company-foundation-offer-v360 .guru-strategic-row-v286')?.classList.contains('is-partial'),
      'Unlinked offer was marked ready in the strategic summary');
    click('[data-gate0-company-segment-restore="' + secondSegmentId + '"]');
    const offerSegment = document.querySelector('[data-gate0-company-offer-segment-id][data-gate0-company-offer-id="legacy-offer"]');
    offerSegment.value = 'legacy-segment';
    offerSegment.dispatchEvent(new Event('change', { bubbles: true }));
    setSegmentName('legacy-segment', 'Частные покупатели и семьи');
    check(guruCompanyOffersV360(state)[0].segment_id === 'legacy-segment',
      'Renaming a segment broke the offer link by ID');
    check(document.querySelector('[data-gate0-company-offer-segment-id][data-gate0-company-offer-id="legacy-offer"] option:checked')?.textContent === 'Частные покупатели и семьи',
      'Renamed segment did not update the offer selector');
    check(guruV347CompanyOfferStatus(state) === 'ready',
      'Complete offer with an active segment was not ready');
    const activeOfferSelect = document.querySelector('[data-gate0-company-offer-segment-id][data-gate0-company-offer-id="legacy-offer"]');
    activeOfferSelect.click();
    check(document.querySelector('[data-gate0-company-offer-entry="legacy-offer"]')?.open,
      'Using the header selector closed the offer card');
    activeOfferSelect.value = secondSegmentId;
    activeOfferSelect.dispatchEvent(new Event('change', { bubbles: true }));
    click('[data-gate0-company-segment-archive="' + secondSegmentId + '"]');
    check(guruCompanyOffersV360(state)[0].segment_id === secondSegmentId &&
      guruV347CompanyOfferStatus(state) === 'in_progress' &&
      ![...document.querySelector('[data-gate0-company-offer-segment-id][data-gate0-company-offer-id="legacy-offer"]').options]
        .some((option) => option.value === secondSegmentId) &&
      document.querySelector('[data-gate0-company-offer-entry="legacy-offer"] > summary .gate0-company-offer-archived-status-v361')?.textContent.includes('Сегмент архивирован'),
      'Archived segment was selectable, lost its link, or did not warn');
    const replacementSelect = document.querySelector('[data-gate0-company-offer-segment-id][data-gate0-company-offer-id="legacy-offer"]');
    replacementSelect.value = 'legacy-segment';
    replacementSelect.dispatchEvent(new Event('change', { bubbles: true }));
    check(guruCompanyOffersV360(state)[0].segment_id === 'legacy-segment' &&
      guruV347CompanyOfferStatus(state) === 'ready' &&
      !document.querySelector('[data-gate0-company-offer-entry="legacy-offer"] .gate0-company-offer-archived-status-v361'),
      'Replacing an archived segment did not recover the offer');
    click('[data-gate0-company-segment-restore="' + secondSegmentId + '"]');
    check(guruCompanyOffersV360(state)[0].segment_id === 'legacy-segment' &&
      guruV347CompanyOfferStatus(state) === 'ready' &&
      !document.querySelector('[data-gate0-company-offer-entry="legacy-offer"] .gate0-company-offer-archived-status-v361'),
      'Restoring an old segment changed the replacement link');
    check(new DOMParser().parseFromString(guruStrategicFoundationCompanyHtmlV310(state), 'text/html')
      .querySelector('[data-guru-strategic-step="offers"] [data-guru-company-offer-segment-label]')?.textContent === 'Частные покупатели и семьи',
      'Offer summary did not resolve the renamed segment by ID');
    const keywordFoundation = guruCompanyKeywordFoundationRecordV351(state, true);
    keywordFoundation.keywords = [{ id: 'confirmed-strategy-keyword', value: 'авторские подарки', status: 'confirmed' }];
    for (let i = 0; i < 4; i++) click('[data-gate0-company-offer-add]');
    check(guruCompanyOffersV360(state).length === 5 &&
      document.querySelector('[data-gate0-company-offer-add]')?.disabled, 'Offer limit failed');
    const extraOfferId = guruCompanyOffersV360(state)[1].id;
    check(!document.querySelector('[data-gate0-company-offer-entry="' + extraOfferId + '"]')?.open,
      'Additional offer opened by default');
    document.querySelector('[data-gate0-company-offer-entry="' + extraOfferId + '"] > summary').click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    guruCompanyStrategyRefreshV360();
    check(document.querySelector('[data-gate0-company-offer-entry="' + extraOfferId + '"]')?.open,
      'Offer open state was lost on refresh');
    const secondaryCta = document.querySelector('[data-gate0-company-offer-id="' + extraOfferId + '"][data-gate0-company-offer-field="cta_secondary"]');
    secondaryCta.value = 'Узнать подробнее';
    secondaryCta.dispatchEvent(new Event('input', { bubbles: true }));
    check(guruV194OfferParts(guruCompanyOffersV360(state).find((item) => item.id === extraOfferId)).ctaV2.secondary === 'Узнать подробнее',
      'Offer editor wrote CTA to the wrong record');
    guruCompanyOffersV360(state).find((item) => item.id === extraOfferId).archived_at = now;
    guruCompanyStrategyRefreshV360();
    check(guruCompanyOffersV360(state).length === 4, 'Archived offer remained active');
    click('[data-gate0-company-offer-restore="' + extraOfferId + '"]');
    check(guruCompanyOffersV360(state).length === 5, 'Offer restore failed');
    click('[data-g8-company-goal-add]'); click('[data-g8-company-goal-add]');
    check(guruCompanyGoalsV360(state).filter((goal) => !goal.archived_at).length === 3 &&
      document.querySelector('[data-g8-company-goal-add]')?.disabled, 'Goal limit failed');
    const secondGoalId = guruCompanyGoalsV360(state)[1].id;
    click('[data-g8-company-goal-primary="' + secondGoalId + '"]');
    const goalInput = document.querySelector('[data-g8-company-goal-id="' + secondGoalId + '"][data-g8-company-goal-field="goalDescription"]');
    goalInput.value = 'Получить 50 заявок';
    goalInput.dispatchEvent(new Event('input', { bubbles: true }));
    check(state.project.goalDescription === 'Получить 50 заявок', 'Primary goal mirror not updated');
    click('[data-g8-company-goal-archive="' + secondGoalId + '"]');
    check(state.project.goalDescription === 'Получить 100 заказов' &&
      guruCompanyGoalsV360(state).find((goal) => goal.id === secondGoalId)?.goalDescription === 'Получить 50 заявок',
      'Goal archive lost data or kept wrong KPI');
    check(guruCompanyStrategyStatusV360(state) === 'ready', 'Additional blanks blocked minimum readiness');
    const summary = new DOMParser().parseFromString(guruStrategicFoundationCompanyHtmlV310(state), 'text/html');
    check(summary.querySelectorAll('.gate0-company-foundation-group-v360').length === 3, 'Summary groups missing');
    check(summary.querySelectorAll('.gate0-company-foundation-offer-v360').length === 5, 'Offers glued in summary');
    check(summary.querySelectorAll('.gate0-company-foundation-goal-v360').length === 2, 'Goals glued in summary');
    check(guruV194Resolve('segments', { id: 'any-product', categoryId: '' }, state).records.length === 5,
      'Downstream segment resolution did not read active records');
    const firstGoalId = guruCompanyPrimaryGoalV360(state).id;
    const remainingGoalId = guruCompanyGoalsV360(state).find((goal) => !goal.archived_at && goal.id !== firstGoalId).id;
    click('[data-g8-company-goal-archive="' + firstGoalId + '"]');
    click('[data-g8-company-goal-archive="' + remainingGoalId + '"]');
    check(!g8GoalCandidate().raw && !state.project.goalDescription, 'Archived goal still feeds Gate 8');
    click('[data-g8-company-goal-restore="' + firstGoalId + '"]');
    click('[data-g8-company-goal-restore="' + remainingGoalId + '"]');
    check(guruCompanyStrategyStatusV360(state) === 'ready', 'Restored primary goal did not recover readiness');
    saveState();
    const saved = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + project.id));
    check(saved.project.gate0ScopedValuesV194.some((item) => item.id === 'legacy-segment') &&
      saved.project.gate0ScopedValuesV194.some((item) => item.id === 'legacy-segment' && item.segment_name === 'Частные покупатели и семьи') &&
      saved.project.gate0ScopedValuesV194.some((item) => item.id === secondSegmentId && item.segment_name === 'Корпоративные клиенты') &&
      saved.project.companyGoalsV360.some((goal) => goal.id === secondGoalId && goal.archived_at),
      'Saved workspace lost legacy or archived data');
    state = saved;
    prepareSystemCards(state);
    check(guruCompanySegmentsV360(state).length === 5 && guruCompanyOffersV360(state).length === 5 &&
      guruCompanyGoalsV360(state).length === 3, 'Reload migration duplicated or removed records');
    const noSegmentWorkspace = structuredClone(state);
    noSegmentWorkspace.project.gate0ScopedValuesV194 = noSegmentWorkspace.project.gate0ScopedValuesV194
      .filter((item) => !['segments', 'company_offer'].includes(item.field));
    const independentOffer = guruV347ProjectCompanyOfferRecord(noSegmentWorkspace, true);
    check(Boolean(independentOffer),
      'Offer creation still requires a segment');
    independentOffer.value = 'Независимый оффер';
    Object.assign(independentOffer.offer, {
      rational: 'Выгода', irrational: 'Радость', social: 'Доверие', cta: 'Купить',
    });
    check(guruV347CompanyOfferStatus(noSegmentWorkspace) === 'in_progress',
      'Offer without an active segment was marked ready');
    check(guruV194InsertStrategyRecords([{ id: 'independent-offer', field: 'company_offer',
      scope: 'project', project_id: project.id, category_id: '', product_id: '', value: '' }],
      null, noSegmentWorkspace, 'companyOffer'),
      'Scoped store rejected an offer without a segment');
    check(guruCompanyKeywordSourceSnapshotV351(noSegmentWorkspace).fields
      .find((field) => field.field === 'company_offer')?.values.includes('Независимый оффер'),
      'Independent offer was lost from keyword sources');
    const currentWorkspace = state;
    state = noSegmentWorkspace;
    const noSegmentOfferUi = new DOMParser().parseFromString(guruV347CompanyOfferHtml(), 'text/html');
    state = currentWorkspace;
    check(!noSegmentOfferUi.querySelector('[data-gate0-company-offer-add]')?.disabled &&
      Boolean(noSegmentOfferUi.querySelector('[data-gate0-company-offer-segment-id]')) &&
      !noSegmentOfferUi.querySelector('[data-gate0-company-offer-archive]'),
      'Offer creation depends on segments or selector/archival state is wrong');
    const oldGoalWorkspace = structuredClone(state);
    delete oldGoalWorkspace.project.companyGoalsV360;
    G8_PROJECT_GOAL_FIELDS.forEach(([key]) => { oldGoalWorkspace.project[key] = ''; });
    oldGoalWorkspace.project.goal = { description: 'Получить 12 заявок', metric: 'leads',
      targetValue: 12, deadline: '2027-03-31', budget: 12000, allowedCost: 1000 };
    check(guruCompanyPrimaryGoalV360(oldGoalWorkspace)?.goalDescription === 'Получить 12 заявок' &&
      guruCompanyGoalsV360(oldGoalWorkspace).length === 1, 'Legacy object goal was not migrated');
    G8_PROJECT_GOAL_FIELDS.forEach(([key]) => {
      guruCompanyPrimaryGoalV360(oldGoalWorkspace)[key] = '';
    });
    guruCompanySyncPrimaryGoalV360(oldGoalWorkspace);
    check(!guruCompanyPrimaryGoalV360(oldGoalWorkspace).goalDescription,
      'Cleared goal was unexpectedly restored from old object');
    const overflowWorkspace = structuredClone(state);
    overflowWorkspace.project.gate0ScopedValuesV194
      .filter((item) => item.field === 'segments' && !item.archived_at)
      .forEach((item) => { item.is_primary = false; });
    const overflowSegment = structuredClone(guruCompanySegmentsV360(overflowWorkspace)[0]);
    overflowSegment.id = 'overflow-primary-segment'; overflowSegment.is_primary = true;
    const overflowOffer = structuredClone(guruCompanyOffersV360(overflowWorkspace)[0]);
    overflowOffer.id = 'overflow-offer';
    overflowWorkspace.project.gate0ScopedValuesV194.push(overflowSegment, overflowOffer);
    const overflowGoal = structuredClone(guruCompanyPrimaryGoalV360(overflowWorkspace));
    overflowGoal.id = 'overflow-goal-1'; overflowGoal.is_primary = false;
    overflowWorkspace.project.companyGoalsV360.push(overflowGoal,
      { ...overflowGoal, id: 'overflow-goal-2' });
    guruCompanyStrategyMigrateV360(overflowWorkspace);
    const overflowFacts = {
      segmentIds: guruCompanySegmentsV360(overflowWorkspace).map((item) => item.id),
      offerIds: guruCompanyOffersV360(overflowWorkspace).map((item) => item.id),
      activeGoalIds: guruCompanyGoalsV360(overflowWorkspace).filter((goal) => !goal.archived_at).map((goal) => goal.id),
      archivedOverflowOffer: overflowWorkspace.project.gate0ScopedValuesV194.some((item) =>
        item.id === 'overflow-offer' && item.archived_at),
    };
    check(overflowFacts.segmentIds.length === 5 &&
      overflowFacts.segmentIds[0] === 'overflow-primary-segment' &&
      overflowFacts.offerIds.length === 5 &&
      overflowFacts.activeGoalIds.length === 3 && overflowFacts.archivedOverflowOffer,
      'Over-limit migration failed: ' + JSON.stringify(overflowFacts));
    fixture.remove();
    activeGateId = 'gate-0';
    state._gate0Open ||= {};
    state._gate0Open['gate0-company-offer'] = true;
    els.appShell.hidden = false;
    renderGate();
    check(Boolean(document.querySelector('[data-gate0-company-segment-add]')) &&
      Boolean(document.querySelector('[data-gate0-company-offer-add]')) &&
      Boolean(document.querySelector('[data-g8-company-goal-add]')),
      'Gate 0 did not render the three company collections');
    check(g3ProductJourneyFindSource({ kind: 'gate0-company-segmentation', recordId: secondSegmentId,
      field: 'unified' })?.dataset.gate0CompanySegmentationId === secondSegmentId &&
      g3ProductJourneyFindSource({ kind: 'gate0-company-offer', recordId: extraOfferId,
        field: 'cta_secondary' })?.dataset.gate0CompanyOfferId === extraOfferId,
      'Summary navigation did not resolve exact company record');
    check(document.querySelector('[data-gate0-company-offer-entry="legacy-offer"]')?.open &&
      document.querySelector('[data-gate0-company-offer-entry="' + extraOfferId + '"]')?.open,
      'Offer open state was lost on full render: ' + JSON.stringify({
        stored: state._gate0CompanyOfferOpenV361,
        first: document.querySelector('[data-gate0-company-offer-entry="legacy-offer"]')?.open,
        second: document.querySelector('[data-gate0-company-offer-entry="' + extraOfferId + '"]')?.open,
        entries: [...document.querySelectorAll('[data-gate0-company-offer-entry]')].map((node) => ({
          id: node.dataset.gate0CompanyOfferEntry, open: node.open,
          html: node.outerHTML.slice(0, 180),
          card: node.closest('[data-card-row]')?.dataset.cardRow,
        })),
      }));
    check(!document.querySelector('.gate0-company-offer-v347 [data-gate0-company-offer-archive]') &&
      Boolean(document.querySelector('.gate0-company-offer-v347 [data-gate0-company-offer-segment-id]')),
      'Offer segment selector disappeared on full render');
    return { segments: guruCompanySegmentsV360(state).length, offers: guruCompanyOffersV360(state).length,
      activeGoals: guruCompanyGoalsV360(state).filter((goal) => !goal.archived_at).length,
      status: guruCompanyStrategyStatusV360(state) };
  })()`);
  assert.deepEqual(result, { segments: 5, offers: 5, activeGoals: 2, status: "ready" });
  for (const width of [1440, 756, 375]) {
    await call("Emulation.setDeviceMetricsOverride", {
      width, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    const layout = await evaluate(`(() => [...document.querySelectorAll('.gate0-company-offer-entry-v361')]
      .map((entry) => {
        const box = entry.getBoundingClientRect();
        const summary = entry.querySelector('summary').getBoundingClientRect();
        const body = entry.querySelector('.gate0-company-offer-body-v361').getBoundingClientRect();
        const selector = entry.querySelector('[data-gate0-company-offer-segment-id]').getBoundingClientRect();
        return { open: entry.open, width: box.width, height: box.height,
          summaryWidth: summary.width, bodyWidth: body.width, bodyHeight: body.height,
          selectorRight: selector.right, summaryRight: summary.right };
      }))()`);
    assert.equal(layout.length, 5, `Offer entries missing at ${width}px`);
    assert.ok(layout[0].open && layout[0].bodyHeight > 200,
      `First offer is not visibly open at ${width}px`);
    assert.ok(layout.every((entry) => entry.summaryWidth > 100 &&
      entry.summaryWidth <= entry.width && entry.selectorRight <= entry.summaryRight + 1 &&
      (!entry.open || entry.bodyWidth <= entry.width)),
      `Offer accordion overflows at ${width}px: ${JSON.stringify(layout)}`);
  }
  if (process.env.GURU_OFFER_SCREENSHOT) {
    await call("Emulation.setDeviceMetricsOverride", {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    });
    await evaluate(`document.querySelector('[data-gate0-company-offer-entry]')
      ?.scrollIntoView({ block: 'start' })`);
    const screenshot = await call("Page.captureScreenshot", { format: "png", fromSurface: true });
    await writeFile(process.env.GURU_OFFER_SCREENSHOT, Buffer.from(screenshot.data, "base64"));
  }
  console.log("Gate 0 company multiplicity smoke passed", result);
} finally {
  socket.close();
}
