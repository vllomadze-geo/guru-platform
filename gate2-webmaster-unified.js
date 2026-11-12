/* Company Webmaster: numbered steps over the existing project records.
   Historical wizard answers, technical SEO data and custom layouts stay intact. */
const G2WM_CONFIG = G2_SERVICE_BLOCK_CONFIGS.get("company-webmaster");
G2WM_CONFIG.title = "Яндекс Вебмастер · Компания";
const G2WM_SECTIONS = Object.freeze([
  { number: "1", title: "Подключение сайта", steps: [
    { id: "s11", number: "1.1", title: "Основной адрес сайта",
      what: "Проверить основной адрес сайта, настройки HTTPS и перенаправлений, затем убедиться, что именно этот адрес добавлен в Яндекс Вебмастер." },
    { id: "s12", number: "1.2", title: "Подтверждение прав",
      what: "Проверить действующие права доступа к сайту в Яндекс Вебмастере и при необходимости подтвердить право управления сайтом либо получить соответствующие полномочия от владельца." },
  ] },
  { number: "2", title: "Доступность для индексирования", steps: [
    { id: "s21", number: "2.1", title: "Проверка доступности страниц",
      what: "Проверить HTTP-ответы и ограничения индексирования для опубликованных страниц выбранного проекта." },
    { id: "s22", number: "2.2", title: "Проверка Sitemap",
      what: "Проверить доступность, структуру и обработку сохранённых карт сайта, сверив их с опубликованными страницами проекта." },
  ] },
  { number: "3", title: "Первичная проверка индексации и ранжирования", steps: [
    { id: "s31", number: "3.1", title: "Страницы в поиске",
      what: "Проверить присутствие главной страницы, контактов, коммерческих страниц, страницы «О нас» и блога выбранного проекта в поиске Яндекса." },
    { id: "s32", number: "3.2", title: "Проверка приоритетных URL",
      what: "Проверить обработку опубликованных URL выбранного проекта в Яндекс Вебмастере, исправить подтверждённые ошибки и определить необходимость переобхода." },
    { id: "s33", number: "3.3", title: "Проверка поисковой видимости и позиций",
      what: "Подтвердить показы и измеряемые позиции опубликованных страниц выбранного проекта в поиске Яндекса за указанный период." },
    { id: "s34", number: "3.4", title: "Первичный запуск индексирования всех страниц",
      what: "Сверить все опубликованные страницы для поиска с Sitemap, проверить обход по счётчику Метрики и при необходимости отправить приоритетные URL на переобход." },
  ] },
]);
const G2WM_REVIEW_FIELD = "webmasterReviewV2";
const G2WM_CONNECTION_OPEN_FIELD = "webmasterConnectionSectionOpenV1";
const G2WM_CONNECTION_STORAGE_PREFIX = "guru-platform-webmaster-connection-open-v1-";

function g2wmConnectionSectionOpen(workspace = state) {
  const projectId = workspace?.project?.id;
  let saved = null;
  try { if (projectId) saved = localStorage.getItem(G2WM_CONNECTION_STORAGE_PREFIX + projectId); }
  catch (_) {}
  const open = saved === "1" ? true : saved === "0" ? false
    : workspace?.ui?.[G2WM_CONNECTION_OPEN_FIELD] !== false;
  if (saved !== null && workspace === state && workspace.ui?.[G2WM_CONNECTION_OPEN_FIELD] !== open) {
    workspace.ui ||= {};
    workspace.ui[G2WM_CONNECTION_OPEN_FIELD] = open;
  }
  return open;
}

function g2wmRecord(workspace = state, create = false) {
  if (create) g2ServiceBlockEnsureCard(G2WM_CONFIG, workspace);
  return g2ServiceBlockRecord(G2WM_CONFIG, "", create, workspace);
}
function g2wmReviews(workspace = state, create = false) {
  const record = g2wmRecord(workspace, create);
  if (create && record) record[G2WM_REVIEW_FIELD] ||= {};
  return record?.[G2WM_REVIEW_FIELD] || {};
}
function g2wmMainAddress(workspace = state) {
  return String(g2c2DomainWebsite(workspace) || g2wCompanyValue("homeUrl", workspace) || "").trim();
}
function g2wmFingerprint(id, workspace = state) {
  if (id === "s21") return g2wmIndexingFingerprint(workspace);
  if (id === "s22") return g2wmSitemapFingerprint(workspace);
  if (id === "s31") return g2wmSearchFingerprint(workspace);
  if (id === "s32") return g2wmPriorityFingerprint(workspace);
  if (id === "s33") return g2wmVisibilityFingerprint(workspace);
  if (id === "s34") return g2wmLaunchFingerprint(workspace);
  return JSON.stringify(["s11", "s12"].includes(id)
    ? [g2wmMainAddress(workspace), g2wPlatform(workspace)] : []);
}
function g2wmStepStatus(id, workspace = state) {
  if (g2ServiceBlockApplicability(G2WM_CONFIG, "", workspace) === "not_needed") return "not_needed";
  if (!["s11", "s12", "s21", "s22", "s31", "s32", "s33", "s34"].includes(id)) return "not_started";
  if (id === "s32") g2wmPriorityHydrate(workspace);
  if (id === "s33") g2wmVisibilityHydrate(workspace);
  if (id === "s34") g2wmLaunchHydrate(workspace);
  const review = g2wmReviews(workspace)[id];
  if (review?.result === "stale" || review?.result && review.fingerprint !== g2wmFingerprint(id, workspace)) return "recheck";
  if (review?.result === "failed") return "problem";
  if (review?.result === "pending") return "needs_check";
  if (review?.result === "passed") {
    if (id === "s11" && !/^https:\/\//i.test(g2wmMainAddress(workspace))) return "in_progress";
    if (id === "s21") {
      const pages = g2wmIndexingPages(workspace);
      if (!pages.some(page => page.group === "fixed" && page.id === "home" && page.publicUrl) ||
          !pages.some(page => page.publicUrl && !page.anchor && !page.technical)) return "needs_check";
    }
    if (id === "s22" && (!g2wmIndexingPages(workspace).some(page => page.group === "fixed" && page.id === "home" && page.publicUrl) ||
        !g2wmSitemapData(workspace).rows.some(row => row.publicUrl))) return "needs_check";
    if (id === "s31" && !g2wmSearchCanComplete(workspace)) return "needs_check";
    if (id === "s32" && !g2wmPriorityCanComplete(workspace)) return "needs_check";
    if (id === "s33" && !g2wmVisibilityCanComplete(workspace)) return "needs_check";
    if (id === "s34" && !g2wmLaunchCanComplete(workspace)) return "needs_check";
    return "ready";
  }
  if (id === "s31" && g2wmSearchHasProgress(workspace)) return "in_progress";
  if (id === "s32" && g2wmPriorityHasProgress(workspace)) return "in_progress";
  if (id === "s33" && g2wmVisibilityHasProgress(workspace)) return "in_progress";
  if (id === "s34" && g2wmLaunchHasProgress(workspace)) return "in_progress";
  const legacy = g2wmRecord(workspace);
  if ((id === "s11" && (legacy?.steps?.open?.result === "done" || legacy?.webmasterUnifiedV1?.open?.result)) ||
      (id === "s12" && legacy?.steps?.rights?.result === "done"))
    return "recheck";
  return "not_started";
}
function g2wmAggregate(statuses) {
  if (statuses.every(status => status === "not_needed")) return "not_needed";
  if (statuses.includes("problem")) return "problem";
  if (statuses.every(status => status === "ready")) return "ready";
  if (statuses.some(status => ["ready", "in_progress", "needs_check", "recheck"].includes(status))) return "in_progress";
  return "not_started";
}
function g2wmStatus(workspace = state) {
  return g2wmAggregate(G2WM_SECTIONS.flatMap(section =>
    section.steps.map(step => g2wmStepStatus(step.id, workspace))));
}
function g2wmLabel(status) {
  return { ready: "Готово", in_progress: "В работе", not_started: "Не начато",
    problem: "Проблема", not_needed: "Не требуется", recheck: "Требует повторной проверки",
    needs_check: "Требует проверки" }[status] || "Не начато";
}
const g2wmTotalWord = count => count === 1 ? "шага" : "шагов";
function g2wmMarkerState(marker, step, status) {
  const ready = status === "ready";
  marker.dataset.g2wmReview = ready ? "reset" : "passed";
  marker.disabled = status === "not_needed";
  marker.setAttribute("aria-pressed", String(ready));
  marker.setAttribute("aria-label", `Шаг ${step.number}: ${step.title}. ${g2wmLabel(status)}. ${ready ? "Снять подтверждение" : "Подтвердить сверку"}`);
  marker.textContent = ready ? "✓" : status === "problem" ? "!" : "";
}
function g2wmStepHtml(step) {
  const status = g2wmStepStatus(step.id);
  const marker = document.createElement("button");
  marker.type = "button";
  marker.className = "g2mu-step-marker g2wm-step-marker";
  marker.dataset.g2wmMarker = step.id;
  g2wmMarkerState(marker, step, status);
  if (step.id === "s31" && status !== "ready" && !g2wmSearchCanComplete() ||
      step.id === "s32" && status !== "ready" && !g2wmPriorityCanComplete() ||
      step.id === "s33" && status !== "ready" && !g2wmVisibilityCanComplete() ||
      step.id === "s34" && status !== "ready" && !g2wmLaunchCanComplete()) marker.disabled = true;
  const source = step.id === "s11"
    ? `<div class="g2mu-fields"><div class="g2mu-source"><span>Основной адрес · из ${guruGateLabel("gate-0")}</span><strong>${escapeHtml(g2wmMainAddress() || "Не указан")}</strong></div></div>` : "";
  const markdown = { s11: G2WM_MAIN_ADDRESS_MARKDOWN, s12: G2WM_RIGHTS_MARKDOWN }[step.id];
  const copyClass = step.id === "s11" ? "g2wm-main-address-copy" : "g2wm-rights-copy";
  const guide = step.id === "s21" ? g2wmIndexingGuideHtml()
    : step.id === "s22" ? g2wmSitemapGuideHtml()
    : step.id === "s31" ? g2wmSearchGuideHtml()
    : step.id === "s32" ? g2wmPriorityGuideHtml()
    : step.id === "s33" ? g2wmVisibilityGuideHtml()
    : step.id === "s34" ? g2wmLaunchGuideHtml() : g2muVerbatimMarkdownHtml(markdown, copyClass, true);
  const passedDisabled = status === "not_needed" || step.id === "s31" && !g2wmSearchCanComplete() ||
    step.id === "s32" && !g2wmPriorityCanComplete() || step.id === "s33" && !g2wmVisibilityCanComplete() ||
    step.id === "s34" && !g2wmLaunchCanComplete();
  return `<article class="g2mu-step g2wm-step" data-g2wm-step="${step.id}" data-g2sb-step-id="${step.id}">
    <div class="g2mu-step-heading"><span class="g2mu-number">${step.number}</span>${marker.outerHTML}<div><span class="g2mu-kicker">Что сделать</span><h5>${escapeHtml(step.title)}</h5><p>${escapeHtml(step.what)}</p></div><span class="g2mu-step-status g2wm-step-status" data-g2wm-status="${status}">${g2wmLabel(status)}</span></div>
    ${source}
    <div class="g2mu-actions"><button type="button" data-g2wm-review="passed" data-g2wm-step-id="${step.id}" ${passedDisabled ? "disabled" : ""}>Готово</button><button type="button" data-g2wm-review="pending" data-g2wm-step-id="${step.id}" ${status === "not_needed" ? "disabled" : ""}>Требует проверки</button><button type="button" data-g2wm-review="failed" data-g2wm-step-id="${step.id}" ${status === "not_needed" ? "disabled" : ""}>Проблема</button></div>
    <details class="g2mu-guide g2wm-guide" data-ui-keeper-key="g2wm:guide:${step.id}"><summary>Как сделать</summary><div class="g2mu-guide-body">${guide}</div></details>
  </article>`;
}
function g2wmSectionHtml(section) {
  const statuses = section.steps.map(step => g2wmStepStatus(step.id));
  const status = g2wmAggregate(statuses);
  const ready = statuses.filter(value => value === "ready").length;
  return `<details class="g2mu-section g2wm-section" data-g2wm-section="${section.number}" data-ui-keeper-key="g2wm:v2:section:${section.number}" ${section.number === "1" && g2wmConnectionSectionOpen() ? "open" : ""}><summary><div><h4>${section.number}. ${escapeHtml(section.title)}</h4></div><span class="g2mu-section-meta"><span data-g2wm-section-progress>${ready} из ${section.steps.length} ${g2wmTotalWord(section.steps.length)}</span><span class="status-pill status-${status}" data-g2wm-section-status="${status}">${g2wmLabel(status)}</span></span></summary><div class="g2mu-section-body">${section.steps.map(g2wmStepHtml).join("")}</div></details>`;
}
function g2wmBlockHtml(base) {
  const status = g2wmStatus();
  const steps = G2WM_SECTIONS.flatMap(section => section.steps);
  const ready = steps.filter(step => g2wmStepStatus(step.id) === "ready").length;
  return `<details class="g2sb-block g2u-block g2wm-block ${status === "not_needed" ? "is-not-needed" : ""}" data-g2sb-id="company-webmaster" data-g2sb-product-id="" data-ui-keeper-key="g2sb:company::company-webmaster" open>
    <summary class="g2sb-header"><span class="g2sb-header-main"><span class="g2sb-heading"><strong id="g2sb-company-webmaster-company" class="g2sb-title">${escapeHtml(base.title)}</strong><span class="g2sb-status" data-g2sb-status data-status="${status}">${g2wmLabel(status)}</span></span><span class="g2sb-progress" data-g2sb-progress>${ready} из ${steps.length} ${g2wmTotalWord(steps.length)}</span><progress class="g2u-progress" value="${ready}" max="${steps.length}" aria-label="Готовность блока"></progress></span><span class="g2step-heading-actions"><a href="https://webmaster.yandex.ru/" target="_blank" rel="noopener noreferrer">Открыть сервис ↗</a></span></summary>
    <div class="g2sb-body g2wm-body">${G2WM_SECTIONS.map(g2wmSectionHtml).join("")}</div></details>`;
}
function g2wmRefresh(block, options = {}) {
  if (!block) return;
  const status = g2wmStatus();
  block.classList.toggle("is-not-needed", status === "not_needed");
  const badge = block.querySelector(":scope > summary [data-g2sb-status]");
  if (badge) { badge.dataset.status = status; badge.textContent = g2wmLabel(status); }
  const steps = G2WM_SECTIONS.flatMap(section => section.steps);
  const ready = steps.filter(step => g2wmStepStatus(step.id) === "ready").length;
  const progress = block.querySelector(":scope > summary [data-g2sb-progress]");
  if (progress) progress.textContent = `${ready} из ${steps.length} ${g2wmTotalWord(steps.length)}`;
  const bar = block.querySelector(":scope > summary progress");
  if (bar) bar.value = ready;
  for (const section of G2WM_SECTIONS) {
    const node = block.querySelector(`[data-g2wm-section="${section.number}"]`);
    const statuses = section.steps.map(step => g2wmStepStatus(step.id));
    const sectionStatus = g2wmAggregate(statuses);
    const sectionProgress = node?.querySelector("[data-g2wm-section-progress]");
    if (sectionProgress) sectionProgress.textContent = `${statuses.filter(value => value === "ready").length} из ${statuses.length} ${g2wmTotalWord(statuses.length)}`;
    const sectionBadge = node?.querySelector("[data-g2wm-section-status]");
    if (sectionBadge) { sectionBadge.dataset.g2wmSectionStatus = sectionStatus;
      sectionBadge.className = `status-pill status-${sectionStatus}`; sectionBadge.textContent = g2wmLabel(sectionStatus); }
    for (const step of section.steps) {
      const row = node?.querySelector(`[data-g2wm-step="${step.id}"]`);
      const stepStatus = g2wmStepStatus(step.id);
      const stepBadge = row?.querySelector("[data-g2wm-status]");
      if (stepBadge) { stepBadge.dataset.g2wmStatus = stepStatus; stepBadge.textContent = g2wmLabel(stepStatus); }
      const marker = row?.querySelector("[data-g2wm-marker]");
      if (marker) g2wmMarkerState(marker, step, stepStatus);
      if (step.id === "s31" && marker && stepStatus !== "ready" && !g2wmSearchCanComplete()) marker.disabled = true;
      if (step.id === "s32" && marker && stepStatus !== "ready" && !g2wmPriorityCanComplete()) marker.disabled = true;
      if (step.id === "s33" && marker && stepStatus !== "ready" && !g2wmVisibilityCanComplete()) marker.disabled = true;
      if (step.id === "s34" && marker && stepStatus !== "ready" && !g2wmLaunchCanComplete()) marker.disabled = true;
      row?.querySelectorAll("[data-g2wm-review]").forEach(button => {
        button.disabled = stepStatus === "not_needed" || button.dataset.g2wmReview === "passed" &&
          (step.id === "s31" && !g2wmSearchCanComplete() || step.id === "s32" && !g2wmPriorityCanComplete() ||
            step.id === "s33" && !g2wmVisibilityCanComplete() || step.id === "s34" && !g2wmLaunchCanComplete());
      });
      const address = row?.querySelector(".g2mu-source strong");
      if (address) address.textContent = g2wmMainAddress() || "Не указан";
      if (step.id === "s21" && !options.skipGuides) {
        const body = row?.querySelector(".g2mu-guide-body");
        if (body) body.innerHTML = g2wmIndexingGuideHtml();
      }
      if (step.id === "s22" && !options.skipGuides) {
        const body = row?.querySelector(".g2mu-guide-body");
        if (body) body.innerHTML = g2wmSitemapGuideHtml();
      }
      if (step.id === "s31" && !options.skipGuides) {
        const body = row?.querySelector(".g2mu-guide-body");
        if (body) body.innerHTML = g2wmSearchGuideHtml();
      }
      if (step.id === "s32" && !options.skipGuides) {
        const body = row?.querySelector(".g2mu-guide-body");
        if (body) body.innerHTML = g2wmPriorityGuideHtml();
      }
      if (step.id === "s33" && !options.skipGuides) {
        const body = row?.querySelector(".g2mu-guide-body");
        if (body) body.innerHTML = g2wmVisibilityGuideHtml();
      }
      if (step.id === "s34" && !options.skipGuides) {
        const body = row?.querySelector(".g2mu-guide-body");
        if (body) body.innerHTML = g2wmLaunchGuideHtml();
      }
    }
  }
}

const g2wmPreviousBlockHtml = g2UnifiedBlockHtml;
g2UnifiedBlockHtml = function (config, productId = "") {
  return config?.id === "company-webmaster" ? g2wmBlockHtml(config)
    : g2wmPreviousBlockHtml.apply(this, arguments);
};
const g2wmPreviousServiceStatus = g2ServiceBlockStatus;
g2ServiceBlockStatus = function (config, productId = "", workspace = state) {
  return config?.id === "company-webmaster" ? g2wmStatus(workspace)
    : g2wmPreviousServiceStatus.apply(this, arguments);
};
const g2wmPreviousWizardStatus = g2wStatus;
g2wStatus = function (def, productId = "", workspace = state) {
  return def?.id === "webmaster" && def.scope === "company" ? g2wmStatus(workspace)
    : g2wmPreviousWizardStatus.apply(this, arguments);
};
const g2wmPreviousRefresh = g2ServiceBlockRefresh;
let g2wmSkipGuidesDuringRefresh = false;
g2ServiceBlockRefresh = function (block, config, productId) {
  return config?.id === "company-webmaster" ? g2wmRefresh(block, { skipGuides: g2wmSkipGuidesDuringRefresh })
    : g2wmPreviousRefresh.apply(this, arguments);
};

document.addEventListener("click", event => {
  const button = event.target?.closest?.('[data-g2sb-id="company-webmaster"] [data-g2wm-review], [data-g2sb-id="company-webmaster"] [data-g2wm-marker]');
  if (!button) return;
  const id = button.dataset.g2wmStepId || button.dataset.g2wmMarker;
  if (!G2WM_SECTIONS.some(section => section.steps.some(step => step.id === id))) return;
  if (g2wmStepStatus(id) === "not_needed") return;
  const result = button.dataset.g2wmReview;
  if (result === "reset" && g2wmStepStatus(id) !== "ready") return;
  if (id === "s31" && result === "passed" && !g2wmSearchCanComplete()) return;
  if (id === "s32" && result === "passed" && !g2wmPriorityCanComplete()) return;
  if (id === "s33" && result === "passed" && !g2wmVisibilityCanComplete()) return;
  if (id === "s34" && result === "passed" && !g2wmLaunchCanComplete()) return;
  const reviews = g2wmReviews(state, true), previous = reviews[id] || {};
  if (previous.result) (previous.history ||= []).push({ result: previous.result,
    fingerprint: previous.fingerprint, evidence: previous.evidence, checkedAt: previous.checkedAt });
  reviews[id] = { ...previous, result: result === "reset" ? "" : result,
    fingerprint: g2wmFingerprint(id), checkedAt: new Date().toISOString() };
  guruGateReadinessCache.delete("gate-2");
  g2wSave({ afterPaint: true });
  g2wmRefresh(button.closest('[data-g2sb-id="company-webmaster"]'));
  g2wRefresh({ changedCardId: "webmaster" });
});

document.addEventListener("change", event => {
  const checkbox = event.target?.closest?.('[data-g2sb-id="company-webmaster"] [data-g2wm-search-check]');
  if (!checkbox || g2wmStepStatus("s31") === "not_needed") return;
  const page = g2wmSearchPages().find(item => item.group === checkbox.dataset.g2wmUrlGroup && item.id === checkbox.dataset.g2wmUrlId);
  if (!page) return;
  const reviews = g2wmReviews(state, true);
  const review = reviews.s31 ||= {};
  const action = checkbox.dataset.g2wmSearchAction;
  if (!G2WM_SEARCH_ACTIONS.some(item => item.id === action)) return;
  const checks = action === "prepare" ? (review.pageChecks ||= {}) : ((review.actionChecks ||= {})[action] ||= {});
  const key = g2wmSearchPageKey(page);
  if (checkbox.checked) checks[key] = { checked: true, url: page.url, name: page.name, checkedAt: new Date().toISOString() };
  else delete checks[key];
  const progress = checkbox.closest('[data-g2wm-search-pages]')?.querySelector('[data-g2wm-search-progress]');
  if (progress) progress.textContent = `Выполнено для ${g2wmSearchCheckedCount(g2wmSearchPages(), state, action)} из ${g2wmSearchPages().length} страниц`;
  guruGateReadinessCache.delete("gate-2");
  g2wSave({ afterPaint: true });
  g2wmSkipGuidesDuringRefresh = true;
  try { g2wRefresh({ changedCardId: "webmaster" }); }
  finally { g2wmSkipGuidesDuringRefresh = false; }
});

document.addEventListener("change", event => {
  const checkbox = event.target?.closest?.('[data-g2sb-id="company-webmaster"] [data-g2wm-priority-check]');
  if (!checkbox || g2wmStepStatus("s32") === "not_needed") return;
  const action = checkbox.dataset.g2wmPriorityAction;
  if (!G2WM_PRIORITY_ACTIONS.some(item => item.id === action)) return;
  const page = g2wmPriorityPages().find(item => item.group === checkbox.dataset.g2wmUrlGroup && item.id === checkbox.dataset.g2wmUrlId);
  if (!page || action !== "prepare" && (!page.publicUrl || page.anchor)) return;
  const reviews = g2wmReviews(state, true);
  const review = reviews.s32 ||= {};
  const checks = action === "prepare" ? (review.pageChecks ||= {}) : ((review.actionChecks ||= {})[action] ||= {});
  const key = g2wmSearchPageKey(page);
  if (checkbox.checked) checks[key] = { checked: true, url: page.url, name: page.name, checkedAt: new Date().toISOString() };
  else delete checks[key];
  g2wmPrioritySaveChecks();
  const progress = checkbox.closest('[data-g2wm-priority-pages]')?.querySelector('[data-g2wm-priority-progress]');
  if (progress) progress.textContent = `Выполнено для ${g2wmPriorityCheckedCount(g2wmPriorityPages(), state, action)} из ${g2wmPriorityPages().length} страниц`;
  guruGateReadinessCache.delete("gate-2");
  g2wSave({ afterPaint: true });
  g2wmSkipGuidesDuringRefresh = true;
  try { g2wRefresh({ changedCardId: "webmaster" }); }
  finally { g2wmSkipGuidesDuringRefresh = false; }
});

document.addEventListener("change", event => {
  const checkbox = event.target?.closest?.('[data-g2sb-id="company-webmaster"] [data-g2wm-visibility-check]');
  if (!checkbox || g2wmStepStatus("s33") === "not_needed") return;
  const action = checkbox.dataset.g2wmVisibilityAction;
  if (!G2WM_VISIBILITY_ACTIONS.some(item => item.id === action)) return;
  const page = g2wmVisibilityPages().find(item => item.group === checkbox.dataset.g2wmUrlGroup && item.id === checkbox.dataset.g2wmUrlId);
  if (!page || action !== "prepare" && (!page.publicUrl || page.anchor)) return;
  const reviews = g2wmReviews(state, true);
  const review = reviews.s33 ||= {};
  const checks = action === "prepare" ? (review.pageChecks ||= {}) : ((review.actionChecks ||= {})[action] ||= {});
  const key = g2wmSearchPageKey(page);
  if (checkbox.checked) checks[key] = { checked: true, url: page.url, name: page.name, checkedAt: new Date().toISOString() };
  else delete checks[key];
  g2wmVisibilitySaveChecks();
  const progress = checkbox.closest('[data-g2wm-visibility-pages]')?.querySelector('[data-g2wm-visibility-progress]');
  if (progress) progress.textContent = `Выполнено для ${g2wmVisibilityCheckedCount(g2wmVisibilityPages(), state, action)} из ${g2wmVisibilityPages().length} страниц`;
  guruGateReadinessCache.delete("gate-2");
  g2wSave({ afterPaint: true });
  g2wmSkipGuidesDuringRefresh = true;
  try { g2wRefresh({ changedCardId: "webmaster" }); }
  finally { g2wmSkipGuidesDuringRefresh = false; }
});

document.addEventListener("change", event => {
  const checkbox = event.target?.closest?.('[data-g2sb-id="company-webmaster"] [data-g2wm-launch-check]');
  if (!checkbox || g2wmStepStatus("s34") === "not_needed") return;
  const action = checkbox.dataset.g2wmLaunchAction;
  if (!G2WM_LAUNCH_ACTIONS.some(item => item.id === action)) return;
  const pages = action === "sitemap" ? g2wmLaunchPages() : g2wmLaunchPriorityPages();
  const page = pages.find(item => item.group === checkbox.dataset.g2wmUrlGroup && item.id === checkbox.dataset.g2wmUrlId);
  if (!page) return;
  const review = g2wmReviews(state, true).s34 ||= {};
  const checks = action === "sitemap" ? (review.pageChecks ||= {}) : ((review.actionChecks ||= {})[action] ||= {});
  const key = g2wmSearchPageKey(page);
  if (checkbox.checked) checks[key] = { checked: true, url: page.url, name: page.name, checkedAt: new Date().toISOString() };
  else delete checks[key];
  g2wmLaunchSaveChecks();
  const progress = checkbox.closest('[data-g2wm-launch-pages]')?.querySelector(`[data-g2wm-launch-progress="${action}"]`);
  if (progress) progress.textContent = action === "decide" || action === "submit"
    ? `${g2wmLaunchCheckedCount(pages, state, action)} из ${pages.length} страниц`
    : `Выполнено для ${g2wmLaunchCheckedCount(pages, state, action)} из ${pages.length} страниц`;
  guruGateReadinessCache.delete("gate-2");
  g2wSave({ afterPaint: true });
  g2wmSkipGuidesDuringRefresh = true;
  try { g2wRefresh({ changedCardId: "webmaster" }); }
  finally { g2wmSkipGuidesDuringRefresh = false; }
});

document.addEventListener("toggle", event => {
  const section = event.target;
  if (!(section instanceof HTMLDetailsElement) || !section.matches('[data-g2sb-id="company-webmaster"] [data-g2wm-section="1"]') ||
      !section.isConnected || !state || !activeProjectId) return;
  const value = section.open ? "1" : "0";
  let saved = null;
  try { saved = localStorage.getItem(G2WM_CONNECTION_STORAGE_PREFIX + activeProjectId); }
  catch (_) {}
  if (state.ui?.[G2WM_CONNECTION_OPEN_FIELD] === section.open && saved === value) return;
  state.ui ||= {};
  state.ui[G2WM_CONNECTION_OPEN_FIELD] = section.open;
  try { localStorage.setItem(G2WM_CONNECTION_STORAGE_PREFIX + activeProjectId, value); }
  catch (_) {}
  guruScheduleUiPreferenceSave();
}, true);
