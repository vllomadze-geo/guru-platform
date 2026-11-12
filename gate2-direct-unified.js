/* Company Direct: numbered steps over the existing project record. */
const G2DIRECT_CONFIG = G2_SERVICE_BLOCK_CONFIGS.get("company-yandex-direct");
const G2DIRECT_SECTIONS = Object.freeze([{ number: "1", title: "Создание и настройка кабинета", steps: [
  { id: "s11", number: "1.1", title: "Основной рекламный кабинет",
    what: "Проверить существующий кабинет, рабочий Яндекс ID и доступ к разделам «Кампании» и «Обзор». Создать кабинет только при его отсутствии." },
  { id: "s12", number: "1.2", title: "Доступы и представители",
    what: "Проверить главного представителя, его полномочия и дополнительные доступы к рекламному кабинету." },
] }]);
const G2DIRECT_REVIEW_FIELD = "directReviewV2";
const G2DIRECT_ACCOUNT_STORAGE_PREFIX = "guru-platform-direct-account-v2-";
const G2DIRECT_REPRESENTATIVES_STORAGE_PREFIX = "guru-platform-direct-representatives-v1-";
const G2DIRECT_SECTION_STORAGE_PREFIX = "guru-platform-direct-section-open-v1-";
const G2DIRECT_SECTION_UI_FIELD = "directCabinetSectionOpenV1";
const g2directHydrated = new WeakMap();
const g2directRepresentativesHydrated = new WeakMap();

function g2directRecord(workspace = state, create = false) {
  if (create) g2ServiceBlockEnsureCard(G2DIRECT_CONFIG, workspace);
  return g2ServiceBlockRecord(G2DIRECT_CONFIG, "", create, workspace);
}
function g2directData(workspace = state, create = false) {
  const record = g2directRecord(workspace, create);
  if (create && record) record.directUnifiedV1 ||= { fields: {}, reviews: {} };
  return record?.directUnifiedV1 || {};
}
function g2directFieldValue(key, workspace = state) {
  return String(g2directData(workspace).fields?.[key] || "").trim();
}
function g2directReviews(workspace = state, create = false) {
  const record = g2directRecord(workspace, create);
  if (create && record) record[G2DIRECT_REVIEW_FIELD] ||= {};
  return record?.[G2DIRECT_REVIEW_FIELD] || {};
}
function g2directReview(id = "s11", workspace = state) {
  return g2directReviews(workspace)[id] || null;
}
function g2directHydrate(workspace = state) {
  const id = workspace?.project?.id;
  if (!id) return;
  let raw = null;
  try { raw = localStorage.getItem(G2DIRECT_ACCOUNT_STORAGE_PREFIX + id); } catch (_) { return; }
  if (!raw || g2directHydrated.get(workspace) === raw) return;
  g2directHydrated.set(workspace, raw);
  let saved = null;
  try { saved = JSON.parse(raw); } catch (_) { return; }
  const version = Number(saved?.updatedAt) || 0;
  if (!version || version <= (Number(g2directReview("s11", workspace)?.checksUpdatedAt) || 0)) return;
  const review = g2directReviews(workspace, true).s11 ||= {};
  review.checks = saved.checks && typeof saved.checks === "object" ? saved.checks : {};
  review.result = typeof saved.result === "string" ? saved.result : review.result;
  review.fingerprint = typeof saved.fingerprint === "string" ? saved.fingerprint : review.fingerprint;
  review.checkedAt = typeof saved.checkedAt === "string" ? saved.checkedAt : review.checkedAt;
  if (Array.isArray(saved.history)) review.history = saved.history;
  review.checksUpdatedAt = version;
  if (typeof saved.login === "string") (g2directData(workspace, true).fields ||= {}).accountLogin = saved.login;
}
function g2directSaveSnapshot(workspace = state) {
  const id = workspace?.project?.id;
  const review = g2directReviews(workspace, true).s11 ||= {};
  if (!id) return;
  review.checksUpdatedAt = Math.max(Date.now(), (Number(review.checksUpdatedAt) || 0) + 1);
  try {
    const raw = JSON.stringify({ updatedAt: review.checksUpdatedAt,
      login: g2directFieldValue("accountLogin", workspace), checks: review.checks || {},
      result: review.result || "", fingerprint: review.fingerprint || "",
      checkedAt: review.checkedAt || "", history: review.history || [] });
    localStorage.setItem(G2DIRECT_ACCOUNT_STORAGE_PREFIX + id, raw);
    g2directHydrated.set(workspace, raw);
  } catch (_) {
    // The project save remains the primary record if local storage is full.
  }
}
function g2directRepresentativesHydrate(workspace = state) {
  const id = workspace?.project?.id;
  if (!id) return;
  let raw = null;
  try { raw = localStorage.getItem(G2DIRECT_REPRESENTATIVES_STORAGE_PREFIX + id); } catch (_) { return; }
  if (!raw || g2directRepresentativesHydrated.get(workspace) === raw) return;
  g2directRepresentativesHydrated.set(workspace, raw);
  let saved = null;
  try { saved = JSON.parse(raw); } catch (_) { return; }
  const version = Number(saved?.updatedAt) || 0;
  if (!version || version <= (Number(g2directReview("s12", workspace)?.updatedAt) || 0)) return;
  const review = g2directReviews(workspace, true).s12 ||= {};
  review.result = typeof saved.result === "string" ? saved.result : review.result;
  review.fingerprint = typeof saved.fingerprint === "string" ? saved.fingerprint : review.fingerprint;
  review.checkedAt = typeof saved.checkedAt === "string" ? saved.checkedAt : review.checkedAt;
  if (Array.isArray(saved.history)) review.history = saved.history;
  review.updatedAt = version;
}
function g2directRepresentativesSave(workspace = state) {
  const id = workspace?.project?.id;
  if (!id) return;
  const review = g2directReviews(workspace, true).s12 ||= {};
  review.updatedAt = Math.max(Date.now(), (Number(review.updatedAt) || 0) + 1);
  try {
    const raw = JSON.stringify({ updatedAt: review.updatedAt, result: review.result || "",
      fingerprint: review.fingerprint || "", checkedAt: review.checkedAt || "", history: review.history || [] });
    localStorage.setItem(G2DIRECT_REPRESENTATIVES_STORAGE_PREFIX + id, raw);
    g2directRepresentativesHydrated.set(workspace, raw);
  } catch (_) {
    // The project save remains the primary record if local storage is full.
  }
}
function g2directSectionOpen(workspace = state) {
  const id = workspace?.project?.id;
  let saved = null;
  try { if (id) saved = localStorage.getItem(G2DIRECT_SECTION_STORAGE_PREFIX + id); } catch (_) {}
  const open = saved === "1" ? true : saved === "0" ? false : workspace?.ui?.[G2DIRECT_SECTION_UI_FIELD] !== false;
  if (workspace === state && saved !== null && workspace.ui?.[G2DIRECT_SECTION_UI_FIELD] !== open) {
    workspace.ui ||= {}; workspace.ui[G2DIRECT_SECTION_UI_FIELD] = open;
  }
  return open;
}
function g2directMainAddress(workspace = state) {
  return String(g2c2DomainWebsite(workspace) || g2wCompanyValue("homeUrl", workspace) || "").trim();
}
function g2directFingerprint(id = "s11", workspace = state) {
  return JSON.stringify(id === "s12"
    ? [g2directMainAddress(workspace), g2directFieldValue("accountLogin", workspace),
      g2directFieldValue("mainRepresentative", workspace)]
    : [g2directMainAddress(workspace), g2directFieldValue("accountLogin", workspace)]);
}
function g2directStepStatus(id, workspace = state) {
  if (g2ServiceBlockApplicability(G2DIRECT_CONFIG, "", workspace) === "not_needed") return "not_needed";
  if (id === "account") id = "s11";
  if (id === "representatives") id = "s12";
  if (id !== "s11" && id !== "s12") {
    return g2directRecord(workspace)?.steps?.[id]?.result === "done" ? "recheck" : "not_started";
  }
  if (id === "s11") g2directHydrate(workspace);
  else g2directRepresentativesHydrate(workspace);
  const review = g2directReview(id, workspace);
  if (review?.result && review.fingerprint !== g2directFingerprint(id, workspace)) return "recheck";
  if (review?.result === "failed") return "problem";
  if (review?.result === "pending") return "needs_check";
  if (review?.result === "passed") return "ready";
  const oldId = id === "s11" ? "account" : "representatives";
  if (g2directRecord(workspace)?.steps?.[oldId]?.result === "done" ||
      g2directData(workspace).reviews?.[oldId]?.result === "passed") return "recheck";
  if (g2directFieldValue(id === "s11" ? "accountLogin" : "mainRepresentative", workspace)) return "in_progress";
  return "not_started";
}
function g2directStatus(workspace = state) {
  const statuses = G2DIRECT_SECTIONS[0].steps.map(step => g2directStepStatus(step.id, workspace));
  if (statuses.every(value => value === "not_needed")) return "not_needed";
  if (statuses.includes("problem")) return "problem";
  if (statuses.every(value => value === "ready")) return "ready";
  if (statuses.some(value => ["ready", "in_progress", "recheck", "needs_check"].includes(value))) return "in_progress";
  return "not_started";
}
function g2directLabel(status) {
  return { ready: "Готово", in_progress: "В работе", not_started: "Не начато",
    recheck: "Требует повторной проверки", needs_check: "Требует проверки",
    problem: "Проблема", not_needed: "Не требуется" }[status] || "Не начато";
}
function g2directReplaceSection(markdown, start, end, replacement) {
  const from = markdown.indexOf(start), to = markdown.indexOf(end, from + start.length);
  return from < 0 || to < 0 ? markdown : markdown.slice(0, from) + replacement + markdown.slice(to);
}
function g2directProjectHtml(workspace = state) {
  return `<section class="g2direct-project-data" data-g2direct-project-data>
    <h5>Данные выбранного проекта</h5>
    <p>Проект: ${escapeHtml(workspace?.project?.name || "Не указан")}</p>
    <p>Основной адрес сайта: ${escapeHtml(g2directMainAddress(workspace) || "Не указан")}</p>
    <p>Рабочий логин кабинета: ${escapeHtml(g2directFieldValue("accountLogin", workspace) || "Не указан")}</p>
    <p>Наличие кабинета и доступ к разделам Директа подтвердите в рабочем Яндекс ID. Сохранённый логин сам по себе не подтверждает доступ.</p></section>`;
}
function g2directPayerHtml(workspace = state) {
  const fields = g2directData(workspace).fields || {};
  return `<section class="g2direct-project-data" data-g2direct-payer-data><h5>Регистрационные данные проекта</h5>
    <p>Страна плательщика: ${escapeHtml(fields.country || "Не указана")}</p>
    <p>Валюта расчётов: ${escapeHtml(fields.currency || "Не указана")}</p>
    <p>Контактный email: ${escapeHtml(fields.email || "Не указан")}</p>
    <p>Рабочий телефон: ${escapeHtml(fields.phone || "Не указан")}</p>
    <p>Значения из ранее сохранённой записи Директа; сверяйте их с фактическим кабинетом. При регистрации используйте данные конкретной компании и плательщика.</p></section>`;
}
function g2directGuideHtml(workspace = state) {
  let markdown = G2DIRECT_MAIN_ACCOUNT_MARKDOWN;
  markdown = g2directReplaceSection(markdown, '**Пример для «Коричного яблока»:**',
    'Если кабинет существует и проверка успешна', 'G2DIRECT_PROJECT_DATA\n\n');
  markdown = g2directReplaceSection(markdown, '**Пример для российского плательщика:**',
    'Не создавайте рекламные кампании', 'G2DIRECT_PAYER_DATA\n\n');
  markdown = g2directReplaceSection(markdown, '### Подтверждённый результат проекта «Коричное яблоко»',
    '## Официальные источники', '### Данные выбранного проекта\n\nG2DIRECT_REVIEW_DATA\n\n**Следующий шаг:** 1.2. Доступы и представители.\n\n');
  let html = g2muVerbatimMarkdownHtml(markdown, "g2direct-main-account-copy", true);
  html = html.replace('<p>G2DIRECT_PROJECT_DATA</p>', g2directProjectHtml(workspace))
    .replace('<p>G2DIRECT_PAYER_DATA</p>', g2directPayerHtml(workspace))
    .replace('<p>G2DIRECT_REVIEW_DATA</p>', '<p>Подтвердите текущий результат проверками кабинета, «Кампаний» и «Обзора» выше.</p>');
  return html;
}
function g2directLegacyHtml(record) {
  const saved = Object.entries(record?.steps || {}).filter(([, value]) => value?.result || value?.params && Object.keys(value.params).length);
  const oldReviews = record?.directUnifiedV1?.reviews || {};
  if (!saved.length && !record?.history?.length && !Object.keys(oldReviews).length) return "";
  return `<details class="g2direct-legacy"><summary>Прежние результаты и история</summary>
    ${saved.map(([id, value]) => `<div><strong>${escapeHtml(id)}</strong><pre>${escapeHtml(JSON.stringify(value, null, 2))}</pre></div>`).join("")}
    ${Object.keys(oldReviews).length ? `<pre>${escapeHtml(JSON.stringify(oldReviews, null, 2))}</pre>` : ""}
    ${record.history?.length ? `<pre>${escapeHtml(JSON.stringify(record.history, null, 2))}</pre>` : ""}</details>`;
}
function g2directMarkerState(marker, step, status) {
  const ready = status === "ready";
  marker.dataset.g2directReview = ready ? "reset" : "passed";
  marker.disabled = status === "not_needed";
  marker.setAttribute("aria-pressed", String(ready));
  marker.setAttribute("aria-label", `Шаг ${step.number}: ${step.title}. ${g2directLabel(status)}. ${ready ? "Снять подтверждение" : "Подтвердить сверку"}`);
  marker.textContent = ready ? "✓" : status === "problem" ? "!" : "";
}
function g2directStepHtml(step) {
  const status = g2directStepStatus(step.id);
  const marker = document.createElement("button");
  marker.type = "button"; marker.className = "g2mu-step-marker g2direct-step-marker";
  marker.dataset.g2directMarker = step.id; g2directMarkerState(marker, step, status);
  const guide = step.id === "s12" ? g2directRepresentativesGuideHtml() : g2directGuideHtml();
  return `<article class="g2mu-step g2direct-step" data-g2direct-step="${step.id}" data-g2sb-step-id="${step.id}">
    <div class="g2mu-step-heading"><span class="g2mu-number">${step.number}</span>${marker.outerHTML}<div>
      <span class="g2mu-kicker">Что сделать</span><h5>${step.title}</h5><p>${escapeHtml(step.what)}</p></div>
      <span class="g2mu-step-status g2direct-step-status" data-g2direct-status="${status}">${g2directLabel(status)}</span></div>
    <div class="g2mu-actions"><button type="button" data-g2direct-review="passed" data-g2direct-id="${step.id}" ${status === "not_needed" ? "disabled" : ""}>Готово</button>
      <button type="button" data-g2direct-review="pending" data-g2direct-id="${step.id}" ${status === "not_needed" ? "disabled" : ""}>Требует проверки</button>
      <button type="button" data-g2direct-review="failed" data-g2direct-id="${step.id}" ${status === "not_needed" ? "disabled" : ""}>Проблема</button></div>
    <details class="g2mu-guide g2direct-guide" data-ui-keeper-key="g2direct:guide:${escapeAttr(activeProjectId)}:${step.id}"><summary>Как сделать</summary>
      <div class="g2mu-guide-body">${guide}</div></details></article>`;
}
function g2directBlockHtml() {
  const status = g2directStatus(), steps = G2DIRECT_SECTIONS[0].steps;
  const ready = steps.filter(step => g2directStepStatus(step.id) === "ready").length;
  return `<details class="g2sb-block g2u-block g2wm-block g2direct-block ${status === "not_needed" ? "is-not-needed" : ""}"
    data-g2sb-id="company-yandex-direct" data-g2sb-product-id="" data-ui-keeper-key="g2sb:company::company-yandex-direct" open>
    <summary class="g2sb-header"><span class="g2sb-header-main"><span class="g2sb-heading"><strong id="g2sb-company-yandex-direct-company" class="g2sb-title">Яндекс Директ · кабинет · Компания</strong><span class="g2sb-status" data-g2sb-status data-status="${status}">${g2directLabel(status)}</span></span>
      <span class="g2sb-progress" data-g2sb-progress>${ready} из ${steps.length} шагов</span><progress class="g2u-progress" value="${ready}" max="${steps.length}" aria-label="Готовность блока"></progress></span>
      <span class="g2step-heading-actions"><a href="https://direct.yandex.ru/" target="_blank" rel="noopener noreferrer">Открыть сервис ↗</a></span></summary>
    <div class="g2sb-body g2wm-body"><details class="g2mu-section g2direct-section" data-g2direct-section="1" data-ui-keeper-key="g2direct:v2:section:${escapeAttr(activeProjectId)}:1" ${g2directSectionOpen() ? "open" : ""}>
      <summary><div><h4>1. Создание и настройка кабинета</h4></div><span class="g2mu-section-meta"><span data-g2direct-section-progress>${ready} из ${steps.length} шагов</span>
        <span class="status-pill status-${status}" data-g2direct-section-status="${status}">${g2directLabel(status)}</span></span></summary>
      <div class="g2mu-section-body">${steps.map(g2directStepHtml).join("")}</div></details>${g2directLegacyHtml(g2directRecord())}</div></details>`;
}
function g2directRefresh(block, options = {}) {
  if (!block) return;
  const status = g2directStatus(), steps = G2DIRECT_SECTIONS[0].steps;
  const ready = steps.filter(step => g2directStepStatus(step.id) === "ready").length;
  block.classList.toggle("is-not-needed", status === "not_needed");
  const badge = block.querySelector(":scope > summary [data-g2sb-status]");
  if (badge) { badge.dataset.status = status; badge.textContent = g2directLabel(status); }
  const progress = block.querySelector(":scope > summary [data-g2sb-progress]");
  if (progress) progress.textContent = `${ready} из ${steps.length} шагов`;
  const bar = block.querySelector(":scope > summary progress"); if (bar) bar.value = ready;
  const sectionProgress = block.querySelector("[data-g2direct-section-progress]");
  if (sectionProgress) sectionProgress.textContent = `${ready} из ${steps.length} шагов`;
  const sectionBadge = block.querySelector("[data-g2direct-section-status]");
  if (sectionBadge) { sectionBadge.className = `status-pill status-${status}`;
    sectionBadge.dataset.g2directSectionStatus = status; sectionBadge.textContent = g2directLabel(status); }
  for (const step of steps) {
    const row = block.querySelector(`[data-g2direct-step="${step.id}"]`);
    const stepStatus = g2directStepStatus(step.id);
    const rowBadge = row?.querySelector("[data-g2direct-status]");
    if (rowBadge) { rowBadge.dataset.g2directStatus = stepStatus; rowBadge.textContent = g2directLabel(stepStatus); }
    const marker = row?.querySelector("[data-g2direct-marker]");
    if (marker) g2directMarkerState(marker, step, stepStatus);
    row?.querySelectorAll("[data-g2direct-review]").forEach(button => { button.disabled = stepStatus === "not_needed"; });
    if (!options.skipGuide) {
      const body = row?.querySelector(".g2mu-guide-body");
      if (body) body.innerHTML = step.id === "s12" ? g2directRepresentativesGuideHtml() : g2directGuideHtml();
    }
  }
}

G2DIRECT_CONFIG.title = "Яндекс Директ · кабинет · Компания";
G2DIRECT_CONFIG.steps = [];
G2DIRECT_CONFIG.stepGroups = [];
G2DIRECT_CONFIG.emptyStepScaffold = true;
G2DIRECT_CONFIG.statusResolver = ({ workspace }) => g2directStatus(workspace);
const g2directPreviousBlockHtml = g2UnifiedBlockHtml;
g2UnifiedBlockHtml = function (config, productId = "") {
  return config?.id === "company-yandex-direct" ? g2directBlockHtml()
    : g2directPreviousBlockHtml.apply(this, arguments);
};
const g2directPreviousServiceStatus = g2ServiceBlockStatus;
g2ServiceBlockStatus = function (config, productId = "", workspace = state) {
  return config?.id === "company-yandex-direct" ? g2directStatus(workspace)
    : g2directPreviousServiceStatus.apply(this, arguments);
};
const g2directPreviousRefresh = g2ServiceBlockRefresh;
g2ServiceBlockRefresh = function (block, config, productId) {
  return config?.id === "company-yandex-direct" ? g2directRefresh(block)
    : g2directPreviousRefresh.apply(this, arguments);
};
document.addEventListener("click", event => {
  const button = event.target?.closest?.('[data-g2sb-id="company-yandex-direct"] [data-g2direct-review], [data-g2sb-id="company-yandex-direct"] [data-g2direct-marker]');
  if (!button) return;
  const id = button.dataset.g2directId || button.dataset.g2directMarker;
  if (!G2DIRECT_SECTIONS[0].steps.some(step => step.id === id)) return;
  const result = button.dataset.g2directReview;
  if (g2directStepStatus(id) === "not_needed") return;
  if (result === "reset" && g2directStepStatus(id) !== "ready") return;
  const review = g2directReviews(state, true)[id] ||= {};
  if (review.result) (review.history ||= []).push({ result: review.result,
    fingerprint: review.fingerprint, checkedAt: review.checkedAt });
  review.result = result === "reset" ? "" : result;
  review.fingerprint = g2directFingerprint(id);
  review.checkedAt = new Date().toISOString();
  if (id === "s11") g2directSaveSnapshot();
  else g2directRepresentativesSave();
  guruGateReadinessCache.delete("gate-2");
  g2wSave({ afterPaint: true });
  g2directRefresh(button.closest('[data-g2sb-id="company-yandex-direct"]'));
  g2wRefresh({ changedCardId: "yandexDirect" });
});
document.addEventListener("toggle", event => {
  const section = event.target;
  if (!(section instanceof HTMLDetailsElement) ||
      !section.matches('[data-g2sb-id="company-yandex-direct"] [data-g2direct-section="1"]') ||
      !section.isConnected || !state || !activeProjectId) return;
  const value = section.open ? "1" : "0";
  let saved = null;
  try { saved = localStorage.getItem(G2DIRECT_SECTION_STORAGE_PREFIX + activeProjectId); } catch (_) {}
  if (state.ui?.[G2DIRECT_SECTION_UI_FIELD] === section.open && saved === value) return;
  state.ui ||= {}; state.ui[G2DIRECT_SECTION_UI_FIELD] = section.open;
  try { localStorage.setItem(G2DIRECT_SECTION_STORAGE_PREFIX + activeProjectId, value); } catch (_) {}
  guruScheduleUiPreferenceSave();
}, true);
