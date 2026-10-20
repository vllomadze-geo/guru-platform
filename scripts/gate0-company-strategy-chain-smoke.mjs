import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";

const port = process.env.GURU_APP_PORT || "3000";
const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9362";
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
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  if (message.error) request.reject(new Error(message.error.message));
  else request.resolve(message.result);
});
function call(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails)
    throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

try {
  await call("Runtime.enable");
  if (process.env.GURU_CHAIN_WIDTH) await call("Emulation.setDeviceMetricsOverride", {
    width: Number(process.env.GURU_CHAIN_WIDTH), height: 900,
    deviceScaleFactor: 1, mobile: false,
  });
  await call("Page.navigate", { url: `http://127.0.0.1:${port}/` });
  for (let i = 0; i < 100 && !await evaluate("document.readyState === 'complete' && typeof createFreshWorkspace === 'function'"); i++)
    await new Promise((resolve) => setTimeout(resolve, 100));
  const facts = await evaluate(`(() => {
    const check = (condition, message) => { if (!condition) throw new Error(message); };
    scheduleCloudSync = () => {}; scheduleProjectsCloudSync = () => {};
    const now = new Date().toISOString();
    const project = { id: 'strategy-chain-smoke', name: 'Strategy chain smoke',
      lifecycleStatus: 'active', createdAt: now, updatedAt: now };
    state = createFreshWorkspace(project); activeProjectId = project.id;
    const record = (id, field, value, extra = {}) => ({ id, project_id: project.id,
      category_id: '', product_id: '', scope: 'project', field, value, ...extra,
      source: { type: 'manual', label: 'Smoke' }, confirmation_status: 'draft',
      created_at: now, updated_at: now });
    state.project.gate0ScopedValuesV194 = [
      record('purpose', 'brand_purpose', 'Помогать людям выбирать подарки'),
      record('segment-b2c', 'segments', 'B2C: покупатели авторских подарков', {
        is_primary: true, segment_name: 'Частные покупатели' }),
      record('segment-b2b', 'segments', 'B2B: компании для корпоративных подарков', {
        segment_name: 'Корпоративные клиенты' }),
      record('segment-old', 'segments', 'Архивный сегмент', { archived_at: now }),
      record('positioning', 'positioning', 'Мастерская авторских подарков'),
      record('offer-b2b', 'company_offer', 'Корпоративные подарки на заказ', {
        segment_ids: ['segment-b2b'], offer: {
          rational: 'Качество', irrational: 'Уверенность', social: 'Репутация',
          ctaV2: { primary: 'Запросить расчёт' } } }),
      record('offer-b2c', 'company_offer', 'Авторские подарки для близких', {
        segment_ids: ['segment-b2c'], offer: {
          rational: 'Доставка', irrational: 'Радость', social: 'Рекомендации', ctaV2: {
          primary: 'Заказать', secondary: 'Смотреть каталог', alternative: 'Задать вопрос' } } }),
      record('offer-old', 'company_offer', 'Архивный оффер', {
        segment_ids: ['segment-old'], archived_at: now }),
    ];
    state.project.companyGoalsV360 = [
      { id: 'goal-primary', is_primary: true, goalDescription: 'Получить продажи',
        goalMetric: 'sales', goalTargetValue: '11', goalDeadline: '2027-09-30',
        goalBudget: '100000', goalAllowedCost: '9000' },
      { id: 'goal-extra', is_primary: false, goalDescription: '', goalMetric: '',
        goalTargetValue: '', goalDeadline: '', goalBudget: '', goalAllowedCost: '' },
      { id: 'goal-old', archived_at: now, goalDescription: 'Архивная цель' },
    ];
    prepareSystemCards(state);
    check(guruCompanyOffersV360(state).find((item) => item.id === 'offer-b2c').segment_id === 'segment-b2c' &&
      !Object.hasOwn(guruCompanyOffersV360(state).find((item) => item.id === 'offer-b2c'), 'segment_ids') &&
      state.project.gate0ScopedValuesV194.find((item) => item.id === 'offer-old').segment_id === 'segment-old',
      'Legacy offer links were not migrated to one stable segment ID');
    const ambiguousWorkspace = structuredClone(state);
    const ambiguousOffer = ambiguousWorkspace.project.gate0ScopedValuesV194.find((item) => item.id === 'offer-b2c');
    ambiguousOffer.segment_id = '';
    ambiguousOffer.segment_ids = ['segment-old', 'segment-b2c'];
    const originalOfferText = ambiguousOffer.value;
    guruCompanyStrategyMigrateV360(ambiguousWorkspace);
    guruCompanyStrategyMigrateV360(ambiguousWorkspace);
    check(ambiguousOffer.segment_id === '' && !Object.hasOwn(ambiguousOffer, 'segment_ids') &&
      ambiguousOffer.value === originalOfferText &&
      ambiguousWorkspace.project.gate0CompanyOfferLinkArchiveV361?.length === 1 &&
      JSON.stringify(ambiguousWorkspace.project.gate0CompanyOfferLinkArchiveV361[0].legacy_segment_ids) ===
        JSON.stringify(['segment-old', 'segment-b2c']),
      'Ambiguous legacy offer links were guessed, lost, or archived twice');
    check(JSON.parse(JSON.stringify(ambiguousWorkspace)).project.gate0CompanyOfferLinkArchiveV361[0]
      .legacy_segment_ids.length === 2,
      'Migration audit links did not survive workspace export/import serialization');
    const minimalWorkspace = structuredClone(state);
    minimalWorkspace.project.gate0ScopedValuesV194 = minimalWorkspace.project.gate0ScopedValuesV194
      .filter((item) => item.field === 'segments' || item.field === 'company_offer');
    minimalWorkspace.project.companyGoalsV360 = [];
    minimalWorkspace.project.goalDescription = '';
    check(guruCompanyStrategyStatusV360(minimalWorkspace) === 'ready',
      'Linked active offer with a primary CTA did not meet the company strategy minimum');
    const partialOfferWorkspace = structuredClone(state);
    partialOfferWorkspace.project.gate0ScopedValuesV194.find((item) => item.id === 'offer-b2c')
      .offer.rational = '';
    check(!guruStrategicFoundationContextCompanyV310(partialOfferWorkspace).offerRows
      .find((item) => item.id === 'offer-b2c')?.complete,
      'Incomplete offer lenses were marked ready in the strategic summary');
    check(!guruCompanyFullChainReadyV360(minimalWorkspace) &&
      guruCompanyFullChainReadyV360(state) === false &&
      !gate1CompanyDemandPositioningCompletionV357(minimalWorkspace).strategicFoundationReady,
      'Gate 1 full-chain prerequisite was changed by the Gate 0 minimum');
    const orderingWorkspace = structuredClone(state);
    const partnerSegment = record('segment-partners', 'segments', 'Партнёры', {
      segment_name: 'Партнёры' });
    const earlyPartnerOffer = record('offer-partners-early', 'company_offer', 'Ранний оффер партнёрам', {
      segment_id: 'segment-partners', offer: { ctaV2: { primary: 'Обсудить' } } });
    const latePartnerOffer = record('offer-partners-late', 'company_offer', 'Поздний оффер партнёрам', {
      segment_id: 'segment-partners', offer: { ctaV2: { primary: 'Связаться' } } });
    earlyPartnerOffer.created_at = '2020-01-01T00:00:00.000Z';
    latePartnerOffer.created_at = '2030-01-01T00:00:00.000Z';
    orderingWorkspace.project.gate0ScopedValuesV194.push(
      partnerSegment, earlyPartnerOffer, latePartnerOffer);
    check(guruStrategicFoundationContextCompanyV310(orderingWorkspace).offerRows
      .map((item) => item.id).join('|') ===
      'offer-b2c|offer-partners-early|offer-b2b|offer-partners-late',
      'Offers did not sort primary first and then by creation time within additional segments');
    const keywords = guruCompanyKeywordFoundationRecordV351(state, true);
    keywords.keywords = [
      { id: 'kw-confirmed', value: 'авторские подарки', status: 'confirmed' },
      { id: 'kw-draft', value: 'черновик фразы', status: 'draft' },
      { id: 'kw-rejected', value: 'отклонённая фраза', status: 'rejected' },
    ];
    check(guruCompanyFullChainReadyV360(state) &&
      gate1CompanyDemandPositioningCompletionV357(state).strategicFoundationReady,
      'Gate 1 full-chain prerequisite did not recognize complete company sources');
    check(guruCompanyStrategyStatusV360(state) === 'ready', 'Minimum was not ready');
    const sourceBeforeRender = JSON.stringify(state.project.gate0ScopedValuesV194
      .filter((item) => item.field === 'segments' || item.field === 'company_offer')
      .map((item) => ({ id: item.id, field: item.field, value: item.value,
        segment_name: item.segment_name, segment_id: item.segment_id,
        archived_at: item.archived_at, confirmation_status: item.confirmation_status })));
    activeView = 'gate'; activeGateId = 'gate-0'; els.appShell.hidden = false; renderGate();
    check(sourceBeforeRender === JSON.stringify(state.project.gate0ScopedValuesV194
      .filter((item) => item.field === 'segments' || item.field === 'company_offer')
      .map((item) => ({ id: item.id, field: item.field, value: item.value,
        segment_name: item.segment_name, segment_id: item.segment_id,
        archived_at: item.archived_at, confirmation_status: item.confirmation_status }))),
      'Rendering the foundation changed offer or segment records');
    const panel = document.querySelector('[data-guru-strategic-foundation-company]');
    check(Boolean(panel), 'Company foundation missing');
    check(panel.scrollWidth <= panel.clientWidth + 1,
      'Company foundation overflows horizontally: ' + panel.scrollWidth + '/' + panel.clientWidth);
    const steps = [...panel.querySelectorAll('[data-guru-strategic-step]')]
      .map((node) => node.dataset.guruStrategicStep);
    check(JSON.stringify(steps) === JSON.stringify(['brand-purpose', 'goals', 'segments',
      'positioning', 'offers', 'keywords']), 'Wrong six-step order: ' + steps);
    check(panel.querySelectorAll('.gate0-company-foundation-goal-v360').length === 2,
      'Active goals missing or archived goal shown');
    check(panel.querySelectorAll('.gate0-company-foundation-offer-v360').length === 2,
      'Active offers missing or archived offer shown');
    const offerCards = [...panel.querySelectorAll('[data-guru-strategic-step="offers"] .gate0-company-foundation-offer-v360')];
    check(offerCards.map((card) => card.querySelector('[data-guru-company-offer-segment-label]')?.textContent.trim()).join(' | ') ===
      'Частные покупатели | Корпоративные клиенты',
      'Offer cards did not sort primary segment first or show segment names');
    check(parseFloat(getComputedStyle(offerCards[0].querySelector('[data-guru-company-offer-segment-label]')).fontSize) <= 12,
      'Segment label is not visually compact');
    check(offerCards[0].textContent.includes('Авторские подарки для близких') &&
      offerCards[0].querySelector('[data-guru-strategic-cta-v286="primary"]')?.textContent.includes('Заказать') &&
      offerCards[1].textContent.includes('Корпоративные подарки на заказ') &&
      offerCards[1].querySelector('[data-guru-strategic-cta-v286="primary"]')?.textContent.includes('Запросить расчёт') &&
      offerCards.every((card) => card.querySelectorAll('[data-guru-strategic-cta-v286]').length === 1) &&
      !panel.querySelector('[data-guru-strategic-step="offers"] select, [data-guru-strategic-step="offers"] input'),
      'Offer summary is not compact, read-only, or lacks the primary CTA');
    check(panel.querySelectorAll('[data-guru-strategic-step="segments"] .guru-strategic-row-v286').length === 2,
      'Active segments missing or archived segment shown');
    check([...panel.querySelectorAll('[data-guru-strategic-step="segments"] .guru-strategic-row-v286')]
      .every((row) => row.classList.contains('is-partial')),
      'Segment rows were marked ready without all required segment fields');
    check(!panel.textContent.includes('Архивный') && !panel.textContent.includes('черновик фразы') &&
      !panel.textContent.includes('отклонённая фраза'),
      'Archived or unconfirmed data shown: ' + ['Архивный', 'черновик фразы', 'отклонённая фраза']
        .filter((text) => panel.textContent.includes(text)).join(', '));
    check(panel.textContent.includes('Допустимый бюджет, ₽') &&
      panel.textContent.includes('Допустимая стоимость результата, ₽') &&
      panel.textContent.includes('100000') && panel.textContent.includes('9000'), 'Goal fields missing');
    check(panel.textContent.includes('B2C: покупатели') && panel.textContent.includes('B2B: компании') &&
      !panel.querySelector('[data-guru-strategic-step="offers"]')?.textContent.includes('Смотреть каталог'),
      'Company offer summary copied segment text or secondary CTAs');
    const b2bSegment = guruCompanySegmentsV360(state).find((item) => item.id === 'segment-b2b');
    const b2cOffer = guruCompanyOffersV360(state).find((item) => item.id === 'offer-b2c');
    b2bSegment.segment_name = '';
    guruStrategicFoundationCompanyRefreshV310();
    check(document.querySelectorAll('[data-guru-strategic-step="offers"] [data-guru-company-offer-segment-label]')[1]?.textContent === 'Дополнительный сегмент 1',
      'Unnamed active segment did not use numbered fallback');
    b2bSegment.segment_name = 'Корпоративные клиенты';
    guruStrategicFoundationCompanyRefreshV310();
    const b2cNameInput = document.querySelector('[data-gate0-company-segmentation-id="segment-b2c"][data-gate0-company-segmentation-field="segment_name"]');
    check(Boolean(b2cNameInput), 'Company segment name input is missing');
    b2cNameInput.value = 'Частные покупатели и семьи';
    b2cNameInput.dispatchEvent(new Event('input', { bubbles: true }));
    check(document.querySelector('[data-guru-strategic-step="offers"] [data-guru-company-offer-segment-label]')?.textContent === 'Частные покупатели и семьи',
      'Typing a new segment name did not update the linked offer label live');
    b2cNameInput.value = 'Частные покупатели';
    b2cNameInput.dispatchEvent(new Event('input', { bubbles: true }));
    b2cOffer.segment_id = '';
    guruStrategicFoundationCompanyRefreshV310();
    const unlinkedOfferCard = [...document.querySelectorAll('[data-guru-strategic-step="offers"] .gate0-company-foundation-offer-v360')]
      .find((card) => card.textContent.includes('Авторские подарки для близких'));
    check(unlinkedOfferCard?.querySelector('[data-guru-company-offer-segment-label]')?.textContent === 'Сегмент не выбран' &&
      unlinkedOfferCard.querySelector('.guru-strategic-row-v286')?.classList.contains('is-partial'),
      'Unlinked offer did not show an incomplete state');
    b2cOffer.segment_id = 'segment-old';
    guruStrategicFoundationCompanyRefreshV310();
    const archivedOfferCard = [...document.querySelectorAll('[data-guru-strategic-step="offers"] .gate0-company-foundation-offer-v360')]
      .find((card) => card.textContent.includes('Авторские подарки для близких'));
    check(archivedOfferCard?.querySelector('[data-guru-company-offer-segment-label]')?.textContent === 'Сегмент архивирован' &&
      !document.querySelector('[data-guru-strategic-step="offers"]')?.textContent.includes('Архивный сегмент'),
      'Archived segment did not show the specified warning');
    b2cOffer.segment_id = 'segment-b2c';
    guruStrategicFoundationCompanyRefreshV310();
    const keyword = panel.querySelector('[data-guru-strategic-company-keyword-foundation]');
    check(!keyword.open && keyword.textContent.includes('авторские подарки') &&
      keyword.querySelector('.guru-strategic-jtbd-count-v286')?.textContent.trim() === '1 ключевое слово',
      'Confirmed keyword count is wrong');
    const sourceTargets = [...panel.querySelectorAll('[data-g4-jump-target]')]
      .map((node) => JSON.parse(node.dataset.g4JumpTarget));
    check(sourceTargets.some((target) => target.kind === 'gate0-company-goal' &&
      target.goalId === 'goal-primary' && g3ProductJourneyFindSource(target)?.dataset.g8CompanyGoalId === 'goal-primary'),
      'Primary goal source is not exact');
    check(sourceTargets.some((target) => target.kind === 'gate0-company-offer' &&
      target.recordId === 'offer-b2b' && g3ProductJourneyFindSource(target)?.dataset.gate0CompanyOfferId === 'offer-b2b'),
      'Offer source is not exact');
    const offerB2cSelect = document.querySelector('[data-gate0-company-offer-segment-id][data-gate0-company-offer-id="offer-b2c"]');
    check(offerB2cSelect?.value === 'segment-b2c' && offerB2cSelect.options.length === 3,
      'Existing segment link is not editable or archived segments are selectable');
    offerB2cSelect.value = '';
    offerB2cSelect.dispatchEvent(new Event('change', { bubbles: true }));
    check(guruCompanyOffersV360(state).find((item) => item.id === 'offer-b2c').segment_id === '',
      'Clearing segment link did not update the single ID');
    check(guruCompanyStrategyStatusV360(state) === 'ready', 'Second linked offer did not preserve readiness');
    const offerB2bSelect = document.querySelector('[data-gate0-company-offer-segment-id][data-gate0-company-offer-id="offer-b2b"]');
    offerB2bSelect.value = '';
    offerB2bSelect.dispatchEvent(new Event('change', { bubbles: true }));
    check(guruCompanyStrategyStatusV360(state) === 'in_progress', 'Unlinked offers kept strategy ready');
    const relinkB2c = document.querySelector('[data-gate0-company-offer-segment-id][data-gate0-company-offer-id="offer-b2c"]');
    relinkB2c.value = 'segment-b2c';
    relinkB2c.dispatchEvent(new Event('change', { bubbles: true }));
    check(guruCompanyStrategyStatusV360(state) === 'ready', 'Relinking did not restore readiness');
    check(document.querySelector('[data-guru-strategic-foundation-company] .status-pill')?.textContent.trim() === 'Готово',
      'Live panel did not refresh after relinking');
    keywords.keywords[0].status = 'draft';
    guruStrategicFoundationCompanyRefreshV310();
    check(guruCompanyStrategyStatusV360(state) === 'ready' &&
      guruCompanyKeywordConfirmedModelV351(state).entries.length === 0 &&
      !guruCompanyFullChainReadyV360(state),
      'Optional keyword step changed the linked-offer minimum');
    keywords.keywords[0].status = 'confirmed';
    guruStrategicFoundationCompanyRefreshV310();
    const primaryGoal = guruCompanyPrimaryGoalV360(state);
    primaryGoal.goalBudget = '';
    check(guruCompanyStrategyStatusV360(state) === 'ready' &&
      !guruCompanyFullChainReadyV360(state),
      'Incomplete optional goal changed the linked-offer minimum');
    primaryGoal.goalBudget = '100000';
    check(guruCompanyStrategyStatusV360(state) === 'ready',
      'Completing primary goal did not restore readiness');
    localStorage.setItem('guru-platform-access-v01', 'unlocked');
    localStorage.setItem('guru-platform-projects-v02', JSON.stringify([project]));
    guruPersistStateFast({ workspace: state, projectId: project.id, durable: true, quiet: true, cloud: false });
    const saved = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + project.id));
    check(saved.project.gate0ScopedValuesV194.some((item) => item.id === 'offer-b2c' &&
      item.segment_id === 'segment-b2c' && !Object.hasOwn(item, 'segment_ids')) &&
      saved.project.companyGoalsV360.some((goal) => goal.id === 'goal-primary'),
      'Save lost offer links or goal IDs');
    const stored = structuredClone(state);
    prepareSystemCards(stored);
    check(guruCompanyStrategyStatusV360(stored) === 'ready' &&
      guruCompanyOffersV360(stored).find((item) => item.id === 'offer-b2c').segment_id === 'segment-b2c',
      'Reread changed IDs, links or readiness');
    return { steps, status: guruCompanyStrategyStatusV360(state),
      goalCount: panel.querySelectorAll('.gate0-company-foundation-goal-v360').length,
      offerCount: panel.querySelectorAll('.gate0-company-foundation-offer-v360').length,
      keywordCount: keyword.querySelector('.guru-strategic-jtbd-count-v286')?.textContent.trim() };
  })()`);
  assert.equal(facts.status, "ready");
  await call("Page.reload", { ignoreCache: true });
  for (let i = 0; i < 100 && !await evaluate("document.readyState === 'complete' && typeof bootstrapAppOnce === 'function'"); i++)
    await new Promise((resolve) => setTimeout(resolve, 100));
  if (await evaluate("Boolean(document.querySelector('[data-open-project]'))"))
    await evaluate("document.querySelector('[data-open-project]').click(); true");
  for (let i = 0; i < 100 && !await evaluate("typeof state !== 'undefined' && Boolean(state) && typeof guruCompanyStrategyStatusV360 === 'function'"); i++)
    await new Promise((resolve) => setTimeout(resolve, 100));
  const restored = await evaluate(`(() => ({
    status: guruCompanyStrategyStatusV360(state),
    segmentIds: guruCompanySegmentsV360(state).map((item) => item.id),
    offerIds: guruCompanyOffersV360(state).map((item) => item.id),
    goalIds: guruCompanyGoalsV360(state).map((item) => item.id),
    linked: guruCompanyOffersV360(state).find((item) => item.id === 'offer-b2c')?.segment_id || '',
  }))()`);
  assert.equal(restored.status, "ready", "Strategy readiness did not survive reload");
  assert.deepEqual(restored.segmentIds, ["segment-b2c", "segment-b2b"]);
  assert.deepEqual(restored.offerIds, ["offer-b2b", "offer-b2c"]);
  assert(restored.goalIds.includes("goal-primary") && restored.linked === "segment-b2c",
    "Record IDs or single segment links changed after reload");
  if (process.env.GURU_CHAIN_SCREENSHOT) {
    await evaluate(`(() => {
      activeView = 'gate'; activeGateId = 'gate-0'; renderGate();
      document.querySelector('[data-guru-strategic-foundation-company]')?.scrollIntoView();
      return true;
    })()`);
    const screenshot = await call("Page.captureScreenshot", { format: "png", fromSurface: true });
    await writeFile(process.env.GURU_CHAIN_SCREENSHOT, Buffer.from(screenshot.data, "base64"));
  }
  console.log("Gate 0 company strategy chain smoke passed", facts);
} finally {
  socket.close();
}
