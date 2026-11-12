/* Company VK community: numbered steps over the existing project card.
   Historical VK Ads and pixel answers remain in that card for other workflows. */
function g2VkCompanyValue(key, workspace = state) {
  return String(g2wValue(g2wDef("vk"), "", key, workspace) || "").trim();
}

const g2VkConfig = G2_SERVICE_BLOCK_CONFIGS.get("company-vk");
if (!g2VkConfig) throw new Error("VK company service must be registered first");
const G2_VK_COMMUNITY_REVIEW_FIELD = "vkCommunityReviewV1";
const G2_VK_RIGHTS_REVIEW_FIELD = "vkCommunityRightsReviewV1";
const G2_VK_COMPANY_INFO_REVIEW_FIELD = "vkCompanyInfoReviewV1";
const G2_VK_DESIGN_REVIEW_FIELD = "vkCommunityDesignReviewV1";
const G2_VK_CLIENT_ROUTE_REVIEW_FIELD = "vkClientRouteReviewV1";
const G2_VK_MESSAGES_REVIEW_FIELD = "vkCommunityMessagesReviewV1";
const G2_VK_ADS_CABINET_REVIEW_FIELD = "vkAdsCabinetReviewV1";
const G2_VK_ADS_RIGHTS_REVIEW_FIELD = "vkAdsRightsReviewV1";
const G2_VK_ADS_ID_REVIEW_FIELD = "vkAdsCabinetIdReviewV1";
const G2_VK_ADS_REQUISITES_REVIEW_FIELD = "vkAdsRequisitesReviewV1";
const G2_VK_SECTION_UI_FIELD = "vkCommunitySectionOpenV1";
const G2_VK_SECTION_STORAGE_PREFIX = "guru-platform-vk-community-section-open-v1-";
const G2_VK_PREPARATION_UI_FIELD = "vkPreparationSectionOpenV1";
const G2_VK_PREPARATION_STORAGE_PREFIX = "guru-platform-vk-preparation-section-open-v1-";
const G2_VK_CLIENT_ROUTE_UI_FIELD = "vkClientRouteSectionOpenV1";
const G2_VK_CLIENT_ROUTE_STORAGE_PREFIX = "guru-platform-vk-client-route-section-open-v1-";
const G2_VK_ADS_SECTION_UI_FIELD = "vkAdsSectionOpenV1";
const G2_VK_ADS_SECTION_STORAGE_PREFIX = "guru-platform-vk-ads-section-open-v1-";
const G2_VK_ADS_BASE_SECTION_UI_FIELD = "vkAdsBaseSectionOpenV1";
const G2_VK_ADS_BASE_SECTION_STORAGE_PREFIX = "guru-platform-vk-ads-base-section-open-v1-";
const G2_VK_ADS_V2_IDS = Object.freeze(["ads_cabinet_id_v2", "ads_rights_v2", "ads_requisites_v2",
  "ads_payment_v2", "ads_pixel_v2", "ads_pixel_install_v2"]);
const G2_VK_ADS_LEGACY_STEPS = Object.freeze({
  ads_cabinet_id_v2: ["account"], ads_rights_v2: [], ads_requisites_v2: [], ads_payment_v2: [],
  ads_pixel_v2: ["existing", "pixel", "id"], ads_pixel_install_v2: ["install", "publish", "visit"],
});
const G2_VK_ADS_LEGACY_REVIEWS = Object.freeze({
  ads_cabinet_id_v2: [G2_VK_ADS_CABINET_REVIEW_FIELD, G2_VK_ADS_ID_REVIEW_FIELD],
  ads_rights_v2: [G2_VK_ADS_RIGHTS_REVIEW_FIELD],
  ads_requisites_v2: [G2_VK_ADS_REQUISITES_REVIEW_FIELD],
  ads_payment_v2: [], ads_pixel_v2: [], ads_pixel_install_v2: [],
});
const G2_VK_SECTIONS = Object.freeze([{ number: "1", title: "Подключение сообщества", steps: [
  { id: "s11", number: "1.1", title: "Официальное сообщество",
    what: "Найти одно действующее официальное сообщество компании ВКонтакте. Если оно уже существует, использовать его без создания нового." },
  { id: "s12", number: "1.2", title: "Права управления",
    what: "Проверить владельца официального сообщества и действующие права администратора или владельца у уполномоченного представителя компании." },
] }, { number: "2", title: "Базовая подготовка", steps: [
  { id: "s21", number: "2.1", title: "Информация о компании",
    what: "Сверить название, описание деятельности, тематику, сайт, телефон и время связи сообщества с опубликованными данными компании." },
  { id: "s22", number: "2.2", title: "Оформление сообщества",
    what: "Проверить и при необходимости установить фирменный аватар и главную обложку сообщества, затем сверить их отображение на компьютере и телефоне." },
] }, { number: "3", title: "Получение обращений", steps: [
  { id: "s31", number: "3.1", title: "Основной маршрут клиента",
    what: "Проверить кнопку действия сообщества и настроить переход на опубликованный сайт компании, если он ещё не работает." },
  { id: "s32", number: "3.2", title: "Сообщения сообщества",
    what: "Проверить, что посетитель может написать сообществу, а уполномоченный сотрудник получает обращение и отвечает от имени компании." },
] }, { number: "ads1", displayNumber: "1", area: "ads", title: "Подключение рекламного кабинета", steps: [
  { id: "ads_cabinet_id_v2", number: "1.1", title: "Рекламный кабинет и ID",
    what: "Найти существующий рекламный кабинет VK Рекламы, проверить его доступность и сверить числовой ID с сохранённым значением проекта." },
  { id: "ads_rights_v2", number: "1.2", title: "Владелец и права доступа",
    what: "Установить владельца рекламного кабинета, проверить подключённые аккаунты и подтвердить необходимые права ответственных сотрудников." },
  { id: "ads_requisites_v2", number: "1.3", title: "Реквизиты рекламодателя",
    what: "Сверить реквизиты рекламодателя в VK Рекламе с подтверждёнными данными владельца и проверить отсутствие ошибок платформы." },
  { id: "ads_payment_v2", number: "1.4", title: "Готовность к оплате",
    what: "Проверить доступность финансового раздела, способа оплаты и отсутствие ограничений перед запуском рекламы без обязательного пополнения баланса." },
] }, { number: "ads2", displayNumber: "2", area: "ads", title: "Подключение пикселя", steps: [
  { id: "ads_pixel_v2", number: "2.1", title: "Пиксель сайта",
    what: "Найти существующий пиксель для сайта или создать один новый после проверки отсутствия подходящего, затем подтвердить его ID и домен." },
  { id: "ads_pixel_install_v2", number: "2.2", title: "Установка и проверка пикселя",
    what: "Сверить установку пикселя в Tilda и VK Рекламе, сохранить настройку, опубликовать страницы и подтвердить поступление тестовых данных." },
] }]);
const G2_VK_STEPS = Object.freeze(G2_VK_SECTIONS.flatMap(section => section.steps));
// This is evidence supplied for the current site, not a default for other projects.
const G2_VK_OBSERVED_SITE_LINKS = Object.freeze({
  "k-apple.ru": "https://vk.ru/korichnoe_yabloko",
});
const G2_VK_COMPANY_INFO_HELP = "https://object2-ac.vk-apps.com/vk-education-0554ff56-27eb-4093-a702-685722cef6d9/media/2b/eb2b5166120f439aaba4bb29deb34251.pdf";
const G2_VK_DESIGN_HELP = "https://object2-ac.vk-apps.com/vk-education-0554ff56-27eb-4093-a702-685722cef6d9/media/b0/8cb0b6d664e44c018418d9a3c756b712.pdf";

function g2VkSiteUrl(workspace = state) {
  return g2ServiceBlockSafeHref(g2c2DomainWebsite(workspace) ||
    g2wCompanyValue("homeUrl", workspace) || workspace?.project?.website || "");
}
function g2VkCommunityCandidate(workspace = state) {
  const project = workspace?.project || {};
  const saved = [g2VkCommunityData(workspace).url, project.vkCommunityUrl, project.socialLinks?.vk,
    project.socialLinks?.vkontakte, project.social?.vk]
    .map(g2ServiceBlockSafeHref).find((url) => /^https:\/\/(?:m\.)?vk\.(?:ru|com)\/.+/i.test(url));
  if (saved) return { url: saved, source: "Ссылка из данных проекта" };
  const site = g2VkSiteUrl(workspace);
  let host = "";
  try { host = new URL(site).hostname.replace(/^www\./i, "").toLowerCase(); } catch (_) {}
  const observed = G2_VK_OBSERVED_SITE_LINKS[host];
  return observed ? { url: observed, source: "Предварительная ссылка с опубликованного сайта" }
    : { url: "", source: "" };
}
function g2VkRecord(workspace = state, create = false) {
  if (create) g2ServiceBlockEnsureCard(g2VkConfig, workspace);
  return g2ServiceBlockRecord(g2VkConfig, "", create, workspace);
}
function g2VkCommunityData(workspace = state) {
  const values = g2VkRecord(workspace)?.values || {};
  return { url: String(values.vkCommunityUrl || "").trim(),
    id: String(values.vkCommunityId || "").trim() };
}
function g2VkCompanyProfile(workspace = state) {
  const project = workspace?.project || {};
  let fields = {};
  try {
    const card = typeof guruSiteChromeCardsV497 === "function"
      ? guruSiteChromeCardsV497(workspace).find(row => row.id === "card-27") : null;
    fields = card?.pageRows?.[0]?.contextFields || {};
  } catch (_) {}
  const value = (...items) => items.map(item => String(item || "").trim()).find(Boolean) || "";
  return {
    name: value(project.name), site: g2VkSiteUrl(workspace),
    contactsUrl: g2ServiceBlockSafeHref(value(megaPlatformUrl("fixed", "contacts", workspace), project.contactsUrl)),
    description: value(project.businessDescription, project.description),
    phone: value(fields.contactsPhone, project.contactPhone, project.phone),
    email: value(fields.contactsEmail, project.contactEmail, project.email),
    hours: value(fields.contactsHours, project.workingHours, project.hours),
  };
}
function g2VkReview(workspace = state, id = "s11") {
  if (G2_VK_ADS_V2_IDS.includes(id)) return g2VkRecord(workspace)?.steps?.[id] || null;
  const field = id === "s32" ? G2_VK_MESSAGES_REVIEW_FIELD :
    id === "s31" ? G2_VK_CLIENT_ROUTE_REVIEW_FIELD :
    id === "s22" ? G2_VK_DESIGN_REVIEW_FIELD :
    id === "s21" ? G2_VK_COMPANY_INFO_REVIEW_FIELD :
    id === "s12" ? G2_VK_RIGHTS_REVIEW_FIELD : G2_VK_COMMUNITY_REVIEW_FIELD;
  return g2VkRecord(workspace)?.[field] || null;
}
function g2VkFingerprint(workspace = state, id = "s11") {
  if (G2_VK_ADS_V2_IDS.includes(id)) {
    const common = [workspace?.project?.id || "", workspace?.project?.name || "", g2VkCompanyValue("vkAccount", workspace)];
    return JSON.stringify(id.startsWith("ads_pixel_")
      ? [...common, g2VkSiteUrl(workspace), g2VkCompanyValue("pixelId", workspace), g2VkPixelRouteSignature(workspace)]
      : common);
  }
  const common = [workspace?.project?.name || "", g2VkSiteUrl(workspace)];
  return JSON.stringify(id === "s21" ? [...common, g2VkCommunityCandidate(workspace).url, g2VkCompanyProfile(workspace)]
    : [...common, g2VkCommunityCandidate(workspace).url]);
}
function g2VkCanConfirmInfo(workspace = state) {
  return g2VkStepStatus("s11", workspace) === "ready" &&
    g2VkStepStatus("s12", workspace) === "ready";
}
function g2VkCanConfirmDesign(workspace = state) {
  return g2VkCanConfirmInfo(workspace) && g2VkStepStatus("s21", workspace) === "ready";
}
function g2VkCanConfirmRights(workspace = state) {
  return g2VkStepStatus("s11", workspace) === "ready";
}
function g2VkCanConfirmClientRoute(workspace = state) {
  return g2VkCanConfirmInfo(workspace) && Boolean(g2VkSiteUrl(workspace));
}
function g2VkCanConfirmMessages(workspace = state) {
  return g2VkCanConfirmInfo(workspace);
}
function g2VkPixelRouteSignature(workspace = state) {
  const products = typeof guruV194Products === "function" ? guruV194Products(workspace) : [];
  return products.map(product => [product.id, g2wRecord(g2wDef("landing"), product.id, false, workspace)?.values?.route || ""]);
}
function g2VkPixelNotNeeded(workspace = state) {
  if (g2wUsage("vk", workspace) === "no") return true;
  const routes = g2VkPixelRouteSignature(workspace);
  return routes.length > 0 && routes.every(([, route]) => route === "messenger" || route === "lead_form");
}
function g2VkHasLegacyEvidence(id, workspace = state) {
  const record = g2VkRecord(workspace);
  if (!record) return false;
  const marked = (G2_VK_ADS_LEGACY_STEPS[id] || []).some(oldId => record.steps?.[oldId]?.result);
  const reviewed = (G2_VK_ADS_LEGACY_REVIEWS[id] || []).some(field => record[field]?.result);
  return marked || reviewed || id === "ads_pixel_v2" && Boolean(g2VkCompanyValue("pixelId", workspace));
}
function g2VkCanConfirmAdsV2(id, workspace = state) {
  if (id === "ads_cabinet_id_v2") return /^\d+$/.test(g2VkCompanyValue("vkAccount", workspace));
  if (id === "ads_rights_v2") return g2VkStepStatus("ads_cabinet_id_v2", workspace) === "ready";
  if (id === "ads_requisites_v2") return g2VkStepStatus("ads_rights_v2", workspace) === "ready";
  if (id === "ads_payment_v2") return g2VkStepStatus("ads_requisites_v2", workspace) === "ready";
  if (g2VkPixelNotNeeded(workspace)) return false;
  if (id === "ads_pixel_v2") return g2VkStepStatus("ads_cabinet_id_v2", workspace) === "ready" &&
    Boolean(g2VkSiteUrl(workspace)) && /^\d+$/.test(g2VkCompanyValue("pixelId", workspace));
  if (id === "ads_pixel_install_v2") return g2VkStepStatus("ads_pixel_v2", workspace) === "ready";
  return false;
}
function g2VkStepStatus(id = "s11", workspace = state) {
  if (G2_VK_ADS_V2_IDS.includes(id)) {
    if (id.startsWith("ads_pixel_") && g2VkPixelNotNeeded(workspace)) return "not_needed";
    const review = g2VkReview(workspace, id);
    if (!review?.result) return g2VkHasLegacyEvidence(id, workspace) ? "needs_check" : "not_started";
    if (review.fingerprint !== g2VkFingerprint(workspace, id)) return "recheck";
    if (review.result === "passed" && !g2VkCanConfirmAdsV2(id, workspace)) return "recheck";
    return { passed: "ready", pending: "needs_check", failed: "problem" }[review.result] || "not_started";
  }
  if ((id === "s12" || id === "s21" || id === "s22" || id === "s31" || id === "s32") && g2VkStepStatus("s11", workspace) === "not_needed") return "not_needed";
  const review = g2VkReview(workspace, id);
  if (review?.result && review.fingerprint !== g2VkFingerprint(workspace, id)) return "recheck";
  if (id === "s12" && review?.result === "passed" && !g2VkCanConfirmRights(workspace)) return "recheck";
  if (id === "s21" && review?.result === "passed" && !g2VkCanConfirmInfo(workspace)) return "recheck";
  if (id === "s22" && review?.result === "passed" && !g2VkCanConfirmDesign(workspace)) return "recheck";
  if (id === "s31" && review?.result === "passed" && !g2VkCanConfirmClientRoute(workspace)) return "recheck";
  if (id === "s32" && review?.result === "passed" && !g2VkCanConfirmMessages(workspace)) return "recheck";
  if (id === "s32" && review?.result === "not_needed" && !g2VkCanConfirmRights(workspace)) return "recheck";
  if (!review?.result) return "not_started";
  return { passed: "ready", pending: "needs_check", failed: "problem",
    not_needed: "not_needed" }[review.result] || "not_started";
}
function g2VkStatus(workspace = state) {
  const statuses = G2_VK_STEPS.map(step => g2VkStepStatus(step.id, workspace));
  if (statuses.every(status => status === "not_needed")) return "not_needed";
  if (statuses.includes("problem")) return "problem";
  if (statuses.every(status => status === "ready" || status === "not_needed") &&
    (g2VkAdsVerificationStatus(workspace) === "ready" || g2VkAdsStatus(workspace) === "not_needed")) return "ready";
  if (statuses.some(status => ["ready", "needs_check", "recheck", "in_progress"].includes(status))) return "in_progress";
  return "not_started";
}
function g2VkSectionStatus(section, workspace = state) {
  const statuses = section.steps.map(step => g2VkStepStatus(step.id, workspace));
  if (statuses.every(status => status === "not_needed")) return "not_needed";
  if (statuses.includes("problem")) return "problem";
  if (statuses.every(status => status === "ready" || status === "not_needed")) return "ready";
  if (statuses.some(status => ["ready", "needs_check", "recheck", "in_progress"].includes(status))) return "in_progress";
  return "not_started";
}
function g2VkCompletedCount(steps, workspace = state) {
  return steps.filter(step => ["ready", "not_needed"].includes(g2VkStepStatus(step.id, workspace))).length;
}
function g2VkAdsVerificationFingerprint(workspace = state) {
  return JSON.stringify(["vk-ads-v2", ...G2_VK_ADS_V2_IDS.map(id =>
    [id, g2VkStepStatus(id, workspace), g2VkFingerprint(workspace, id)])]);
}
function g2VkAdsVerificationStatus(workspace = state) {
  const verification = g2VkRecord(workspace)?.verification;
  if (!verification) return "not_started";
  if (verification.fingerprint !== g2VkAdsVerificationFingerprint(workspace)) return "needs_check";
  return verification.result === "passed" ? "ready" : verification.result === "failed" ? "problem" : "needs_check";
}
function g2VkAdsStatus(workspace = state) {
  const statuses = G2_VK_ADS_V2_IDS.map(id => g2VkStepStatus(id, workspace));
  if (statuses.every(status => status === "not_needed")) return "not_needed";
  if (statuses.includes("problem") || g2VkAdsVerificationStatus(workspace) === "problem") return "problem";
  if (statuses.every(status => status === "ready" || status === "not_needed") &&
    g2VkAdsVerificationStatus(workspace) === "ready") return "ready";
  if (statuses.some(status => status !== "not_started") || g2VkRecord(workspace)?.verification) return "in_progress";
  return "not_started";
}
function g2VkCommunityStatus(workspace = state) {
  const steps = G2_VK_SECTIONS.filter(section => section.area !== "ads").flatMap(section => section.steps);
  return g2VkSectionStatus({ steps }, workspace);
}
function g2VkGroupSummary(workspace = state) {
  const statuses = [g2VkCommunityStatus(workspace), g2VkAdsStatus(workspace)];
  const skipped = statuses.filter(status => status === "not_needed").length;
  const ready = statuses.filter(status => status === "ready").length;
  return `${ready} из ${statuses.length - skipped} разделов готово${skipped ? ` · ${skipped} не требуется` : ""}`;
}
function g2VkSubserviceOpen(area) {
  try { return localStorage.getItem(`g2vk:subservice:${activeProjectId}:${area}`) === "1"; }
  catch (_) { return false; }
}
function g2VkLegacyHtml(id, workspace = state) {
  if (!G2_VK_ADS_V2_IDS.includes(id)) return "";
  const record = g2VkRecord(workspace);
  const oldSteps = (G2_VK_ADS_LEGACY_STEPS[id] || []).map(oldId => {
    const source = g2wDef("vk")?.steps?.find(step => step[0] === oldId);
    const saved = record?.steps?.[oldId];
    return saved ? `<li>${escapeHtml(source?.[1] || oldId)} — <strong>${saved.result === "done" ? "отмечено" : "не выполнено"}</strong></li>` : "";
  }).filter(Boolean);
  const oldReviews = (G2_VK_ADS_LEGACY_REVIEWS[id] || []).map(field => {
    const review = record?.[field];
    if (!review?.result) return "";
    const label = { passed: "Готово", pending: "Требует проверки", failed: "Проблема" }[review.result] || review.result;
    return `<li>Предыдущая проверка — <strong>${escapeHtml(label)}</strong></li>`;
  }).filter(Boolean);
  const rows = [...oldSteps, ...oldReviews];
  return rows.length ? `<details class="g2vk-legacy"><summary>Сохранённые отметки прежней структуры</summary><p>Отметки сохранены как история. Критерии нового шага подтвердите отдельно.</p><ul>${rows.join("")}</ul></details>` : "";
}
function g2VkLabel(status) {
  return { ready: "Готово", in_progress: "В работе", not_started: "Не начато",
    needs_check: "Требует проверки", recheck: "Требует повторной проверки",
    problem: "Проблема", not_needed: "Не требуется" }[status] || "Не начато";
}
function g2VkSectionPreference(number) {
  if (number === "1") return { field: G2_VK_SECTION_UI_FIELD, prefix: G2_VK_SECTION_STORAGE_PREFIX };
  if (number === "2") return { field: G2_VK_PREPARATION_UI_FIELD, prefix: G2_VK_PREPARATION_STORAGE_PREFIX };
  if (number === "3") return { field: G2_VK_CLIENT_ROUTE_UI_FIELD, prefix: G2_VK_CLIENT_ROUTE_STORAGE_PREFIX };
  if (number === "ads1") return { field: G2_VK_ADS_SECTION_UI_FIELD, prefix: G2_VK_ADS_SECTION_STORAGE_PREFIX };
  return { field: G2_VK_ADS_BASE_SECTION_UI_FIELD, prefix: G2_VK_ADS_BASE_SECTION_STORAGE_PREFIX };
}
function g2VkSectionOpen(number = "1", workspace = state) {
  const { field, prefix } = g2VkSectionPreference(number);
  const projectId = workspace?.project?.id;
  let saved = null;
  try { if (projectId) saved = localStorage.getItem(prefix + projectId); }
  catch (_) {}
  const open = saved === "1" ? true : saved === "0" ? false
    : number === "1" ? workspace?.ui?.[field] !== false : workspace?.ui?.[field] === true;
  if (workspace === state && saved !== null && workspace.ui?.[field] !== open) {
    workspace.ui ||= {};
    workspace.ui[field] = open;
  }
  return open;
}
function g2VkGuideHtml(workspace = state) {
  const name = escapeHtml(workspace?.project?.name || "Не указано в проекте");
  const site = g2VkSiteUrl(workspace);
  const candidate = g2VkCommunityCandidate(workspace);
  const siteHtml = site
    ? `<a href="${escapeAttr(site)}" target="_blank" rel="noopener noreferrer">${escapeHtml(site)}</a>`
    : "Адрес официального сайта не указан в проекте";
  const communityHtml = candidate.url
    ? `<a href="${escapeAttr(candidate.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(candidate.url)}</a>`
    : "Ссылка на сообщество пока не найдена в данных проекта. Найдите её на официальном сайте.";
  return `<div class="g2mu-verbatim-copy g2vk-community-guide">
    <h5>1. Что сделать</h5>
    <p>Найдите существующее официальное сообщество компании ВКонтакте. Если оно существует, используйте его без создания нового. Сообщество представляет компанию, помогает общаться с аудиторией и продвигаться внутри VK.</p>
    <p><strong>Ожидаемый результат:</strong> определено одно официальное сообщество для дальнейших настроек.</p>
    <h5>2. Где нажать / Как проверить</h5>
    <h6>А. Проверить существующее сообщество</h6>
    <ol>
      <li>Откройте официальный сайт компании.</li>
      <li>Найдите ссылку «ВКонтакте» в разделе социальных сетей.</li>
      <li>Нажмите на неё.</li>
      <li>Убедитесь, что открылась страница сообщества ВКонтакте.</li>
      <li>Проверьте название сообщества и его принадлежность компании по опубликованным сведениям.</li>
      <li>Убедитесь, что страница доступна и не заблокирована.</li>
      <li>Если сообщество существует и принадлежит компании, оставьте его без изменений. Новое создавать не требуется.</li>
    </ol>
    <h6>Для проекта «${name}»</h6>
    <div class="g2mu-source"><span>Официальный сайт</span>${siteHtml}</div>
    <div class="g2mu-source"><span>${escapeHtml(candidate.source || "Ссылка на сообщество")}</span>${communityHtml}</div>
    <p>Откройте ссылку с сайта и подтвердите, что она ведёт на действующее сообщество выбранной компании. Адрес в данных проекта служит ориентиром до этой проверки.</p>
    <h6>Б. Если подходящего сообщества действительно нет</h6>
    <ol>
      <li>Откройте <a href="https://vk.ru/" target="_blank" rel="noopener noreferrer">ВКонтакте</a> и авторизуйтесь.</li>
      <li>В левом меню нажмите «Сообщества».</li>
      <li>Выполните поиск по названию компании и убедитесь, что официального сообщества ещё нет.</li>
      <li>Нажмите «Создать сообщество».</li>
      <li>Если появится экран «Какая у вас цель?», выберите «Развивать бизнес».</li>
      <li>В поле «Название» введите название компании из данных проекта.</li>
      <li>В поле «Тематика» выберите категорию, соответствующую её деятельности.</li>
      <li>Заполните остальные обязательные поля формы.</li>
      <li>Нажмите «Создать сообщество».</li>
      <li>Если VK предложит добавить контакты или пригласить участников, завершите обязательные этапы создания. Остальные настройки выполняются в следующих разделах.</li>
      <li>Откройте созданное сообщество и убедитесь, что его публичная страница доступна.</li>
    </ol>
    <h6>Если возникла ошибка</h6>
    <ul>
      <li><strong>Страница не открывается:</strong> проверьте адрес и авторизацию, затем повторите открытие в другом браузере.</li>
      <li><strong>Несколько похожих сообществ:</strong> установите принадлежность компании до создания нового.</li>
      <li><strong>Нет доступа к управлению:</strong> не создавайте дубликат; права проверяются в шаге 1.2.</li>
      <li><strong>Ошибка создания:</strong> прочитайте сообщение VK, устраните указанную причину и повторите попытку.</li>
    </ul>
    <h5>3. Сверка</h5>
    <ul>
      <li><strong>Готово:</strong> официальное сообщество существует, принадлежит компании, публично открывается и не требует создания дубликата.</li>
      <li><strong>Требует проверки:</strong> принадлежность не установлена, страница временно недоступна или официальное сообщество нельзя достоверно определить.</li>
      <li><strong>Проблема:</strong> ссылка ведёт на постороннее сообщество либо создание отсутствующего официального сообщества завершилось ошибкой.</li>
    </ul>
    <p><strong>Критерий выполнения:</strong> найдено или создано одно действующее официальное сообщество; подтверждены его принадлежность и публичная доступность.</p>
    <p>Права управления, оформление, контакты и получение обращений проверяются в следующих шагах.</p>
  </div>`;
}
function g2VkRightsGuideHtml(workspace = state) {
  const candidate = g2VkCommunityCandidate(workspace);
  const community = candidate.url
    ? `<a href="${escapeAttr(candidate.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(candidate.url)}</a>`
    : "Откройте сообщество, подтверждённое в шаге 1.1.";
  return `<div class="g2mu-verbatim-copy g2vk-community-guide">
    <h5>1. Что сделать</h5>
    <p>Проверьте, кто владеет официальным сообществом компании и имеет право изменять его настройки. Если необходимые права уже предоставлены, ничего изменять не нужно.</p>
    <p><strong>Ожидаемый результат:</strong> владелец известен, а у уполномоченного представителя компании есть действующие права администратора или владельца.</p>
    <div class="g2mu-source"><span>Сообщество из шага 1.1</span>${community}</div>
    <h5>2. Где нажать / Как проверить</h5>
    <h6>А. Проверить существующие права</h6>
    <ol>
      <li>Откройте официальное сообщество по адресу выше.</li>
      <li>Войдите через VK ID аккаунта, с которого планируете управлять сообществом.</li>
      <li>В меню сообщества нажмите «Управление».</li>
      <li>В открывшемся меню выберите «Подписчики».</li>
      <li>Перейдите на вкладку «Руководители».</li>
      <li>Найдите аккаунт со статусом «Владелец» и убедитесь, что он принадлежит уполномоченному представителю компании.</li>
      <li>Найдите собственный аккаунт и посмотрите указанную роль.</li>
      <li>Если указано «Администратор» или «Владелец», переходите к контрольной проверке ниже.</li>
    </ol>
    <p>Если у вас роль редактора, модератора, рекламодателя или вы отсутствуете в списке, для полной настройки сообщества потребуются административные права.</p>
    <h6>Б. Получить права, если их нет</h6>
    <p>Следующие действия выполняет действующий владелец или администратор сообщества:</p>
    <ol>
      <li>Попросите нужного сотрудника подписаться на сообщество, если он ещё не подписан.</li>
      <li>Откройте страницу сообщества.</li>
      <li>Нажмите «Управление» → «Подписчики» → «Руководители».</li>
      <li>Нажмите «Добавить руководителя».</li>
      <li>В поиске введите имя сотрудника или ссылку на его профиль VK.</li>
      <li>Найдите нужного человека и нажмите «Назначить руководителем».</li>
      <li>Выберите роль «Администратор».</li>
      <li>Проверьте, что выбран правильный аккаунт.</li>
      <li>Нажмите «Назначить руководителем» для подтверждения.</li>
      <li>Вернитесь к списку руководителей и убедитесь, что сотрудник появился с ролью «Администратор».</li>
    </ol>
    <p><strong>Важно:</strong> права администратора выдавайте только уполномоченным сотрудникам. При уже настроенных правах повторное назначение не требуется.</p>
    <h6>В. Контрольная проверка</h6>
    <ol>
      <li>Войдите во ВКонтакте через аккаунт сотрудника, которому предоставлены права.</li>
      <li>Откройте то же официальное сообщество по адресу выше.</li>
      <li>Нажмите «Управление».</li>
      <li>Откройте «Настройки».</li>
      <li>Убедитесь, что доступно редактирование основной информации сообщества.</li>
      <li>Вернитесь в «Подписчики» → «Руководители».</li>
      <li>Убедитесь, что аккаунт имеет роль «Администратор» или «Владелец».</li>
    </ol>
    <p>Ничего изменять и сохранять для теста не требуется.</p>
    <h6>Если возникла ошибка</h6>
    <ul>
      <li><strong>Нет пункта «Управление»:</strong> проверьте, что вошли через аккаунт с предоставленными правами.</li>
      <li><strong>Сотрудник не находится через поиск:</strong> убедитесь, что он подписан на сообщество.</li>
      <li><strong>Нет кнопки назначения:</strong> действие должен выполнить владелец или администратор с соответствующими полномочиями.</li>
      <li><strong>Права назначены, но настройки недоступны:</strong> обновите страницу, повторно войдите и проверьте назначенную роль.</li>
      <li><strong>Нет доступа ни к одному уполномоченному аккаунту:</strong> обратитесь в <a href="https://vk.com/support" target="_blank" rel="noopener noreferrer">поддержку VK</a>.</li>
    </ul>
    <p><strong>Tilda:</strong> действий нет. Права управления сообществом VK не связаны с доступом к сайту.</p>
    <h5>3. Сверка</h5>
    <p>Сравните фактические роли в списке «Руководители» с полномочиями лиц, которым компания разрешила управлять сообществом.</p>
    <ul>
      <li><strong>Готово:</strong> владелец установлен и уполномочен; ответственный сотрудник имеет права администратора или владельца и может открыть настройки.</li>
      <li><strong>Требует проверки:</strong> принадлежность владельца не установлена, права ещё не предоставлены или доступ к настройкам не подтверждён.</li>
      <li><strong>Проблема:</strong> обнаружен посторонний владелец, необходимые права невозможно получить через действующих руководителей или назначена неподходящая роль.</li>
    </ul>
    <p><strong>Критерий выполнения:</strong> компания контролирует официальное сообщество, владелец установлен, административные полномочия подтверждены фактическим доступом к настройкам.</p>
  </div>`;
}
function g2VkCompanyInfoGuideHtml(workspace = state) {
  const profile = g2VkCompanyProfile(workspace);
  const candidate = g2VkCommunityCandidate(workspace);
  const display = (value) => value ? escapeHtml(value) : "Проверьте на опубликованном сайте";
  const link = (url) => url
    ? `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>`
    : "Адрес не указан в проекте";
  const community = candidate.url ? link(candidate.url) : "Откройте сообщество, подтверждённое в шаге 1.1.";
  return `<div class="g2mu-verbatim-copy g2vk-community-guide">
    <h5>1. Что сделать</h5>
    <p>Приведите сведения официального сообщества в соответствие с опубликованными данными компании. Проверьте название, описание деятельности, тематику, сайт, телефон и время связи; исправьте только подтверждённые расхождения.</p>
    <p><strong>Ожидаемый результат:</strong> посетитель получает достоверную информацию о компании, может открыть её сайт и воспользоваться контактами. Сообщество и права управления уже проверяются в шагах 1.1 и 1.2.</p>
    <h5>2. Где нажать / Как проверить</h5>
    <h6>А. Сверить данные с опубликованным сайтом</h6>
    <ol>
      <li>Откройте официальный сайт выбранного проекта.</li>
      <li>Проверьте название компании и описание её деятельности на главной странице.</li>
      <li>Откройте страницу «Контакты» и проверьте опубликованные телефон, email и время связи.</li>
      <li>Используйте только подтверждённые сведения как исходные значения для проверки VK.</li>
    </ol>
    <p><strong>Данные выбранного проекта:</strong> если значение ещё не заполнено в GURU, возьмите его с опубликованного сайта перед изменением сообщества.</p>
    <table><thead><tr><th>Сведения</th><th>Значение или источник</th></tr></thead><tbody>
      <tr><td>Название</td><td>${display(profile.name)}</td></tr>
      <tr><td>Сайт</td><td>${link(profile.site)}</td></tr>
      <tr><td>Страница «Контакты»</td><td>${profile.contactsUrl ? link(profile.contactsUrl) : "Найдите на опубликованном сайте"}</td></tr>
      <tr><td>Телефон</td><td>${display(profile.phone)}</td></tr>
      <tr><td>Email</td><td>${display(profile.email)}</td></tr>
      <tr><td>Время связи</td><td>${display(profile.hours)}</td></tr>
      <tr><td>Описание деятельности</td><td>${display(profile.description)}</td></tr>
    </tbody></table>
    <h6>Б. Проверить и при необходимости исправить информацию в VK</h6>
    <div class="g2mu-source"><span>Сообщество выбранного проекта</span>${community}</div>
    <ol>
      <li>Откройте официальное сообщество и войдите через аккаунт с правами, подтверждёнными в шаге 1.2.</li>
      <li>Нажмите «Управление». Откройте «Настройки», если основная информация не показана сразу.</li>
      <li>В разделе «Основная информация» сравните название с названием компании на сайте. При совпадении оставьте его без изменений.</li>
      <li>Проверьте описание. Если оно пустое или не соответствует деятельности компании, составьте текст из подтверждённых сведений сайта: чем занимается компания, что предлагает, ссылку на сайт и действующие контакты.</li>
      <li>В разделе «Дополнительная информация» проверьте поле «Сайт» и укажите опубликованный адрес проекта, если он отсутствует или неверен.</li>
      <li>Проверьте телефон и укажите действующий номер с сайта, если значение отсутствует или неверно.</li>
      <li>Проверьте тематику: она должна соответствовать фактическим товарам или услугам. Подходящую категорию не меняйте.</li>
      <li>Сохраните изменения в VK, только если что-то исправляли.</li>
    </ol>
    <p>Не добавляйте физический адрес, если он не опубликован компанией. Если email или график уже отражены в описании, отдельные неподтверждённые поля искать не требуется. На сайте Tilda в этом шаге ничего менять не нужно.</p>
    <h6>В. Проверить опубликованный результат</h6>
    <ol>
      <li>Обновите страницу VK и повторно откройте «Управление», чтобы убедиться, что изменения сохранились.</li>
      <li>Вернитесь на главную страницу сообщества и раскройте информацию о компании.</li>
      <li>Проверьте описание, телефон, время связи и ссылку на сайт.</li>
      <li>Откройте ссылку сайта и убедитесь, что она ведёт на опубликованный адрес выбранного проекта.</li>
      <li>Повторите проверку из аккаунта обычного посетителя.</li>
    </ol>
    <p><strong>Если возникла ошибка:</strong> при несохранении проверьте сообщение VK и административные права. Если сайт не открывается, проверьте опубликованный адрес, не заменяя его технической ссылкой конструктора. Если сведения сохранены, но не видны публично, проверьте режим посетителя и настройки отображения.</p>
    <p><a href="${escapeAttr(G2_VK_COMPANY_INFO_HELP)}" target="_blank" rel="noopener noreferrer">VK Бизнес: чек-лист сообщества ↗</a></p>
    <h5>3. Сверка</h5>
    <table><thead><tr><th>Проверка</th><th>Критерий</th></tr></thead><tbody>
      <tr><td>Название</td><td>Соответствует компании</td></tr>
      <tr><td>Описание</td><td>Отражает фактическую деятельность</td></tr>
      <tr><td>Тематика</td><td>Соответствует товарам или услугам</td></tr>
      <tr><td>Сайт</td><td>Открывает опубликованный сайт проекта</td></tr>
      <tr><td>Телефон и email</td><td>Совпадают с опубликованными контактами</td></tr>
      <tr><td>Время связи</td><td>Соответствует графику на сайте</td></tr>
      <tr><td>Сохранение</td><td>Изменения сохранены и видны посетителю</td></tr>
    </tbody></table>
    <p><strong>Готово:</strong> сведения корректны и доступны посетителю. <strong>Требует проверки:</strong> сохранение или публичное отображение отдельных сведений пока не подтверждено. <strong>Проблема:</strong> есть подтверждённое расхождение или ссылка ведёт на неправильный сайт.</p>
    <p><strong>Критерий выполнения:</strong> основная информация сообщества соответствует действующим сведениям компании и корректно отображается после сохранения.</p>
  </div>`;
}
function g2VkDesignGuideHtml(workspace = state) {
  const candidate = g2VkCommunityCandidate(workspace);
  const community = candidate.url
    ? `<a href="${escapeAttr(candidate.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(candidate.url)}</a>`
    : "Откройте сообщество, подтверждённое в шаге 1.1.";
  const site = g2VkSiteUrl(workspace);
  const siteLink = site
    ? `<a href="${escapeAttr(site)}" target="_blank" rel="noopener noreferrer">${escapeHtml(site)}</a>`
    : "Адрес сайта не указан в проекте";
  return `<div class="g2mu-verbatim-copy g2vk-community-guide">
    <h5>1. Что сделать</h5>
    <p>Проверьте и при необходимости установите аватар и главную обложку официального сообщества. Оформление должно соответствовать фирменному стилю компании и помогать посетителю узнать бренд и его товары или услуги.</p>
    <p>Если подходящие изображения уже установлены, заменять их не нужно. <strong>Ожидаемый результат:</strong> аватар и обложка корректно отображаются в компьютерной и мобильной версиях VK.</p>
    <div class="g2mu-source"><span>Сообщество выбранного проекта</span>${community}</div>
    <div class="g2mu-source"><span>Сайт как ориентир фирменного стиля</span>${siteLink}</div>
    <h5>2. Где нажать / Как проверить</h5>
    <h6>А. Подготовить изображения</h6>
    <p>Подготовьте два файла:</p>
    <table><thead><tr><th>Элемент</th><th>Рекомендуемый размер</th><th>Формат</th></tr></thead><tbody>
      <tr><td>Аватар</td><td>400 × 400 px</td><td>PNG или JPG</td></tr>
      <tr><td>Главная обложка</td><td>1920 × 768 px</td><td>PNG или JPG</td></tr>
    </tbody></table>
    <p>Аватар должен содержать узнаваемый логотип или фирменный знак. Разместите важное в центре: миниатюра VK круглая. Обложка должна отражать деятельность компании; не помещайте важный текст у краёв, которые могут обрезаться на телефоне.</p>
    <h6>Б. Проверить и при необходимости загрузить аватар</h6>
    <ol>
      <li>Откройте официальное сообщество по ссылке выше и войдите через аккаунт с правами из шага 1.2.</li>
      <li>Посмотрите на аватар рядом с названием. Если он соответствует фирменному стилю и корректно отображается, оставьте его без изменений.</li>
      <li>Если аватара нет, нажмите «Загрузить фотографию» в области изображения сообщества. Для замены существующего наведите на него курсор и выберите «Обновить фотографию».</li>
      <li>Выберите подготовленный файл на компьютере и настройте область отображения.</li>
      <li>Нажмите «Сохранить и продолжить», затем настройте круглую миниатюру: логотип должен быть полностью виден и находиться в центре.</li>
      <li>Нажмите «Сохранить изменения», вернитесь на главную страницу и убедитесь, что аватар отображается.</li>
    </ol>
    <h6>В. Проверить и при необходимости загрузить главную обложку</h6>
    <ol>
      <li>На странице сообщества нажмите «Управление» → «Настройки».</li>
      <li>В «Основной информации» найдите строку «Обложка» и нажмите «Управление».</li>
      <li>Откройте блок «Главная обложка сообщества». Если существующая обложка соответствует фирменному стилю и качеству, оставьте её без изменений.</li>
      <li>Если обложки нет или её нужно исправить, нажмите «Добавить обложку» и выберите подготовленный файл 1920 × 768 px.</li>
      <li>Проверьте предварительный просмотр, при необходимости настройте область отображения и нажмите «Сохранить и продолжить».</li>
      <li>Вернитесь на главную страницу сообщества и убедитесь, что обложка появилась.</li>
    </ol>
    <p>Живую обложку с вертикальными изображениями или видео на этом этапе не настраивайте: для базовой готовности она не обязательна.</p>
    <h6>Г. Проверить результат на компьютере и телефоне</h6>
    <ol>
      <li>На компьютере проверьте, что оба изображения чёткие, а текст на обложке читается.</li>
      <li>Откройте то же сообщество в мобильном приложении VK и проверьте круглую миниатюру аватара.</li>
      <li>Проверьте обложку: основные изображения и текст не должны быть обрезаны.</li>
      <li>Если важное содержимое скрыто, исправьте исходный файл, загрузите его повторно и ещё раз проверьте оба устройства.</li>
    </ol>
    <p><strong>Если возникла ошибка:</strong> при отказе загрузки проверьте формат и размеры файла. Если оформление не меняется, проверьте права администратора. При обрезке исправьте компоновку изображения и повторите загрузку.</p>
    <p><strong>Tilda:</strong> дополнительных настроек нет. Сайт служит визуальным ориентиром; изменять его в этом шаге не требуется.</p>
    <p><a href="${escapeAttr(G2_VK_DESIGN_HELP)}" target="_blank" rel="noopener noreferrer">VK Бизнес: оформление и параметры обложки ↗</a></p>
    <h5>3. Сверка</h5>
    <table><thead><tr><th>Проверка</th><th>Правильный результат</th></tr></thead><tbody>
      <tr><td>Аватар</td><td>Фирменный знак или подходящее изображение установлено</td></tr>
      <tr><td>Миниатюра</td><td>Основной элемент полностью виден</td></tr>
      <tr><td>Обложка</td><td>Отражает деятельность и фирменный стиль</td></tr>
      <tr><td>Компьютер</td><td>Оба изображения отображаются корректно</td></tr>
      <tr><td>Телефон</td><td>Важные элементы видны, текст не обрезан</td></tr>
      <tr><td>Сохранение</td><td>Изображения остаются после повторного открытия страницы</td></tr>
    </tbody></table>
    <p><strong>Готово:</strong> оба изображения установлены и правильно отображаются на компьютере и телефоне. <strong>Требует проверки:</strong> отображение на одном из устройств пока не подтверждено. <strong>Проблема:</strong> изображение отсутствует, не загружается или важные элементы обрезаны.</p>
    <p><strong>Критерий выполнения:</strong> аватар и главная обложка соответствуют фирменному стилю, сохранены в VK и корректно отображаются на обоих типах устройств.</p>
  </div>`;
}
function g2VkClientRouteGuideHtml(workspace = state) {
  const communityUrl = g2VkCommunityCandidate(workspace).url;
  const siteUrl = g2VkSiteUrl(workspace);
  const community = communityUrl
    ? `<a href="${escapeAttr(communityUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(communityUrl)}</a>`
    : "Укажите или подтвердите официальное сообщество проекта в шаге 1.1.";
  const site = siteUrl
    ? `<a href="${escapeAttr(siteUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(siteUrl)}</a>`
    : "Основной адрес сайта пока не указан в данных проекта.";
  return `<div class="g2mu-verbatim-copy g2vk-community-guide">
    <h5>1. Что сделать</h5>
    <p>Настройте кнопку действия официального сообщества ВКонтакте для перехода на опубликованный сайт компании. Посетитель сможет открыть сайт и перейти к выбору товаров или услуг. Если кнопка уже работает правильно, повторно изменять её не требуется.</p>
    <p><strong>Ожидаемый результат:</strong> нажатие кнопки действия открывает опубликованный сайт выбранного проекта.</p>
    <div class="g2mu-source"><span>Сообщество выбранного проекта</span>${community}</div>
    <div class="g2mu-source"><span>Основной адрес сайта · из проекта</span>${site}</div>
    <h5>2. Где нажать / Как проверить</h5>
    <h6>А. Проверить существующую настройку ВКонтакте</h6>
    <ol>
      <li>Откройте сообщество по ссылке выше и войдите через аккаунт с правами управления из шага 1.2.</li>
      <li>На странице сообщества нажмите «Управление», затем в меню «Настройки» выберите «Кнопка действия».</li>
      <li>Убедитесь, что переключатель «Показывать кнопку действия» включён.</li>
      <li>Проверьте «Тип действия»: «Открыть сайт».</li>
      <li>Сравните поле «Ссылка» с основным адресом сайта выбранного проекта, показанным выше. Используйте действующий опубликованный адрес.</li>
      <li>Проверьте «Текст на кнопке»: «Открыть сайт». Если все значения верны, оставьте их без изменений.</li>
    </ol>
    <h6>Б. Сохранить и проверить настройки</h6>
    <ol>
      <li>Если вы меняли настройки, завершите редактирование. Используйте кнопку сохранения, если она показана в вашей версии VK; если отдельной кнопки нет, дождитесь применения изменений.</li>
      <li>Обновите страницу и проверьте, что переключатель включён, а тип действия, ссылка и текст кнопки сохранились.</li>
      <li>Если значения сбросились, повторите настройку, проверьте права управления и сообщение об ошибке VK.</li>
    </ol>
    <h6>В. Проверить переход на сайт</h6>
    <ol>
      <li>Вернитесь на страницу сообщества и найдите кнопку действия. В некоторых версиях VK переход по внешней ссылке расположен рядом с кнопкой «Сообщение».</li>
      <li>Нажмите кнопку перехода и сравните открывшийся адрес с сайтом проекта, указанным выше.</li>
      <li>Убедитесь, что опубликованная главная страница загружается и позволяет перейти к товарам или услугам.</li>
      <li>Повторите переход с телефона и проверьте доступность сайта в мобильном браузере.</li>
    </ol>
    <h6>Г. Если переход не работает</h6>
    <ol>
      <li>Откройте основной адрес сайта напрямую в браузере.</li>
      <li>Если сайт доступен напрямую, вернитесь в «Управление» → «Кнопка действия», исправьте ссылку при необходимости и повторите переход.</li>
      <li>Если сайт недоступен напрямую, проверьте публикацию главной страницы в системе, где размещён сайт. Для проекта на Tilda: откройте нужный проект на tilda.cc, найдите главную страницу и опубликуйте её, только если публикация действительно требуется.</li>
      <li>После исправления повторно откройте сайт и проверьте переход из сообщества.</li>
    </ol>
    <p>Если сайт уже работает, переопубликовывать его не нужно.</p>
    <h5>3. Сверка</h5>
    <table><thead><tr><th>Проверка</th><th>Правильный результат</th></tr></thead><tbody>
      <tr><td>Кнопка действия</td><td>Показывается посетителю</td></tr>
      <tr><td>Тип и текст</td><td>«Открыть сайт»</td></tr>
      <tr><td>Ссылка</td><td>Ведёт на опубликованный сайт выбранного проекта</td></tr>
      <tr><td>Сохранение</td><td>Настройки сохраняются после обновления страницы</td></tr>
      <tr><td>Переход</td><td>Сайт открывается на компьютере и телефоне</td></tr>
    </tbody></table>
    <p><strong>Готово:</strong> настройки сохраняются, а фактическое нажатие открывает действующий сайт компании. <strong>Требует проверки:</strong> настройки сохранены, но переход пока не проверен. <strong>Проблема:</strong> кнопка отсутствует, настройки сбрасываются, открывается неправильный адрес или сайт недоступен.</p>
    <p><strong>Критерий выполнения:</strong> кнопка действия сообщества открывает правильную опубликованную страницу сайта компании; переход подтверждён фактическим нажатием.</p>
  </div>`;
}
function g2VkMessagesGuideHtml(workspace = state) {
  const communityUrl = g2VkCommunityCandidate(workspace).url;
  const community = communityUrl
    ? `<a href="${escapeAttr(communityUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(communityUrl)}</a>`
    : "Укажите или подтвердите официальное сообщество проекта в шаге 1.1.";
  let settingsUrl = "";
  if (communityUrl) {
    const url = new URL(communityUrl);
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/settings/messages`;
    url.search = "";
    url.hash = "";
    settingsUrl = url.href;
  }
  const settings = settingsUrl
    ? `<a href="${escapeAttr(settingsUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(settingsUrl)}</a>`
    : "Откройте настройки сообщений из меню подтверждённого сообщества.";
  return `<div class="g2mu-verbatim-copy g2vk-community-guide">
    <h5>1. Что сделать</h5>
    <p>Проверьте, что посетители могут отправлять сообщения официальному сообществу, а ответственный сотрудник получает обращения и отвечает от имени компании. Если сообщения уже включены, изменять настройки не требуется.</p>
    <p><strong>Ожидаемый результат:</strong> тестовое сообщение получено сообществом, сотрудник отправил ответ, посетитель получил его.</p>
    <div class="g2mu-source"><span>Сообщество выбранного проекта</span>${community}</div>
    <div class="g2mu-source"><span>Настройки сообщений</span>${settings}</div>
    <h5>2. Где нажать / Как проверить</h5>
    <h6>А. Проверить настройки сообщений</h6>
    <ol>
      <li>Откройте сообщество выбранного проекта и войдите через аккаунт с административными правами из шага 1.2.</li>
      <li>На странице сообщества нажмите «Управление» → «Сообщения» и откройте настройки по ссылке выше.</li>
      <li>В поле «Сообщения сообщества» проверьте значение «Включены». Если стоит «Отключены», выберите «Включены».</li>
      <li>Поле «Приветствие» оставьте без изменений: оно необязательно для приёма сообщений.</li>
      <li>В разделе «Виджет сообщений» оставьте флажок «Разрешить использование виджета» выключенным, если чат VK не встраивается на внешний сайт.</li>
      <li>Если изменили настройку, нажмите «Сохранить». Если ничего не меняли, повторное сохранение не требуется.</li>
      <li>Обновите страницу и убедитесь, что сообщения по-прежнему включены.</li>
    </ol>
    <h6>Б. Проверить получение обращения</h6>
    <ol>
      <li>В другом аккаунте VK без административных прав откройте это же сообщество и нажмите «Сообщение».</li>
      <li>Отправьте текст «Тестовое обращение. Проверка работы сообщений».</li>
      <li>Вернитесь в аккаунт администратора. На главной странице сообщества откройте «Сообщения» в меню сообщества: это входящие диалоги, а не настройки сообщений.</li>
      <li>Найдите диалог с тестовым аккаунтом и убедитесь, что обращение получено полностью.</li>
    </ol>
    <h6>В. Проверить отправку ответа</h6>
    <ol>
      <li>В открытом диалоге от имени сообщества отправьте текст «Ваше тестовое обращение получено».</li>
      <li>Переключитесь на аккаунт посетителя, откройте переписку и убедитесь, что ответ появился без изменения текста.</li>
    </ol>
    <h6>Г. Если проверка не прошла</h6>
    <ol>
      <li>Если посетитель не видит кнопку «Сообщение», проверьте, включены ли сообщения в настройках.</li>
      <li>Если обращение не появилось во входящих, убедитесь, что оба аккаунта открыли одно и то же сообщество. Обновите диалоги и повторите тест.</li>
      <li>Если сотрудник не может ответить, проверьте его права управления и ограничения переписки.</li>
      <li>После исправления повторите отправку обращения и ответа.</li>
    </ol>
    <p><strong>Tilda:</strong> ничего настраивать не требуется. Здесь проверяется переписка во ВКонтакте. Формы сайта относятся к отдельному блоку GURU «Приём заявок».</p>
    <h5>3. Сверка</h5>
    <table><thead><tr><th>Проверка</th><th>Правильный результат</th></tr></thead><tbody>
      <tr><td>Сообщения сообщества</td><td>Включены</td></tr>
      <tr><td>Приветствие</td><td>Необязательно, может быть пустым</td></tr>
      <tr><td>Виджет сообщений</td><td>Выключен, если не используется на сайте</td></tr>
      <tr><td>Тестовое обращение</td><td>Получено сообществом</td></tr>
      <tr><td>Ответ сотрудника</td><td>Отправлен от имени сообщества</td></tr>
      <tr><td>Получение ответа</td><td>Подтверждено в аккаунте посетителя</td></tr>
    </tbody></table>
    <p><strong>Готово:</strong> сообщения включены, обращение получено, ответ отправлен и виден посетителю. <strong>Требует проверки:</strong> сообщения включены, но двусторонний обмен ещё не подтверждён. <strong>Проблема:</strong> посетитель не может отправить обращение, оно не поступает либо сотрудник не может ответить. <strong>Не требуется:</strong> сообщения сообщества не используются в маршруте обращений компании.</p>
    <p><strong>Критерий выполнения:</strong> подтверждена двусторонняя переписка посетителя с уполномоченным сотрудником от имени официального сообщества.</p>
  </div>`;
}
function g2VkAdsRightsGuideHtml() {
  return `<div class="g2mu-verbatim-copy g2vk-community-guide">
    <h5>1. Что сделать</h5>
    <p>Проверьте, кто владеет рекламным кабинетом VK Рекламы и какие права предоставлены сотрудникам и подрядчикам. Компания должна сохранять контроль над кабинетом, а ответственные сотрудники — иметь полномочия для своих задач. Если доступы уже настроены правильно, изменять их не требуется.</p>
    <p><strong>Ожидаемый результат:</strong> установлены владелец, список пользователей и достаточность действующих прав для дальнейшей настройки.</p>
    <h5>2. Где нажать / Как проверить</h5>
    <h6>А. Проверить владельца и существующие доступы</h6>
    <ol>
      <li>Откройте <a href="https://ads.vk.ru/hq/overview" target="_blank" rel="noopener noreferrer">VK Реклама → «Обзор»</a> через аккаунт из шага 1.1.</li>
      <li>В левом нижнем углу откройте «Настройки» → «Общие». Найдите тип кабинета и связанный VK ID.</li>
      <li>Установите, является ли вошедший аккаунт первоначальным владельцем кабинета или использует доступ, предоставленный другим владельцем.</li>
      <li>Перейдите на вкладку «Права доступа» → «Мои доступы» и проверьте, не предоставлен ли доступ к выбранному кабинету другим владельцем.</li>
      <li>В списке «Имеют доступ к этому кабинету» просмотрите подключённые аккаунты и их фактические полномочия.</li>
      <li>Сравните список с сотрудниками и подрядчиками, которым компания разрешила управлять рекламой.</li>
    </ol>
    <p><strong>Важно:</strong> имя, показанное вверху кабинета, само по себе не доказывает принадлежность рекламного кабинета этому человеку или компании. Если первоначальный владелец не указан в интерфейсе, подтвердите его по сведениям о регистрации или через поддержку VK. Реквизиты проверяются отдельно в шаге 1.3.</p>
    <h6>Б. Проверить полномочия</h6>
    <p>В «Правах доступа» сопоставьте возможности каждого подключённого аккаунта с его задачами:</p>
    <ul>
      <li>«Только чтение» — просмотр доступных данных без изменения настроек.</li>
      <li>«Расширенные права» — редактирование в пределах выданных разрешений.</li>
      <li>Доступ к кампаниям — просмотр либо редактирование рекламных кампаний.</li>
      <li>Доступ к финансовой информации — просмотр либо управление финансовыми данными в пределах выданных прав.</li>
    </ul>
    <p>Сотруднику, который будет настраивать рекламу и пиксель, нужны соответствующие права на изменение настроек. Финансовые права предоставляются только при необходимости. Если полномочий достаточно, переходите к контрольной проверке.</p>
    <h6>В. Получить необходимые права, если их нет</h6>
    <p>Эти действия выполняет владелец кабинета или пользователь, которому разрешено выдавать доступы:</p>
    <ol>
      <li>Откройте «Настройки» → «Права доступа» и нажмите «Выдать доступ».</li>
      <li>Выберите «Таргетологу», если доступ получает специалист.</li>
      <li>Попросите получателя открыть собственный кабинет VK Рекламы и найти его «ID кабинета» в «Настройки» → «Общие».</li>
      <li>Получатель передаёт владельцу именно ID своего рекламного кабинета, а не ID личной страницы ВКонтакте.</li>
      <li>Введите ID кабинета получателя, выберите нужные разрешения для кампаний и «Расширенные права», если сотрудник должен изменять настройки. Финансовые права выдавайте только по обязанностям.</li>
      <li>Подтвердите выдачу доступа кнопкой «Сохранить», если она показана.</li>
      <li>Получатель открывает «Настройки» → «Права доступа» → «Мои доступы», находит приглашение и нажимает «Принять доступ».</li>
      <li>После обновления страницы получатель выбирает предоставленный кабинет из списка.</li>
    </ol>
    <p>Отправленное приглашение ещё не означает, что права получены: получатель должен принять его. Если права кабинета, подключённого через eLama, управляются партнёром, обратитесь в его поддержку; повторно создавать кабинет не нужно.</p>
    <h6>Г. Контрольная проверка</h6>
    <ol>
      <li>Войдите через аккаунт сотрудника и откройте нужный кабинет на странице «Обзор».</li>
      <li>В «Настройки» → «Права доступа» проверьте действующее разрешение.</li>
      <li>Откройте «Кампании». Если предоставлено редактирование, убедитесь, что соответствующие элементы управления доступны.</li>
      <li>Не создавайте и не изменяйте кампании ради проверки.</li>
      <li>Если доступ недостаточен, попросите владельца исправить конкретное разрешение и повторите проверку.</li>
    </ol>
    <p><strong>Tilda:</strong> действий не требуется. Доступы VK Рекламы и Tilda управляются независимо.</p>
    <h5>3. Сверка</h5>
    <p>Сравните фактического владельца с уполномоченной стороной компании, подключённые аккаунты — с согласованными сотрудниками и подрядчиками, а разрешения — с их задачами.</p>
    <p><strong>Готово:</strong> владелец установлен, компания контролирует кабинет, ответственный сотрудник имеет необходимые действующие права и может открыть нужные функции.</p>
    <p><strong>Требует проверки:</strong> первоначальный владелец не установлен, приглашение ещё не принято или достаточность прав не подтверждена.</p>
    <p><strong>Проблема:</strong> кабинет контролируется неуполномоченным лицом, необходимых прав нет либо сотрудник не может выполнять требуемые действия.</p>
    <p><strong>Критерий выполнения:</strong> владелец и права доступа установлены, полномочия ответственного сотрудника фактически подтверждены. Повторная выдача корректных доступов не требуется.</p>
  </div>`;
}
function g2VkAdsRequisitesGuideHtml(workspace = state) {
  let currentProjectNote = "";
  try {
    if (new URL(g2VkSiteUrl(workspace)).hostname.replace(/^www\./i, "") === "k-apple.ru") {
      currentProjectNote = `<p>По предоставленным данным проекта «Коричное яблоко» тип кабинета — «Физлицо». Проверьте это значение в выбранном кабинете и оставьте его без изменений, если оно верно.</p>`;
    }
  } catch (_) {}
  return `<div class="g2mu-verbatim-copy g2vk-community-guide">
    <h5>1. Что сделать</h5>
    <p>Проверьте реквизиты рекламодателя в VK Рекламе. Для кабинета физического лица ФИО и ИНН должны соответствовать подтверждённым данным владельца. Тип «Физлицо» сам по себе не является ошибкой настройки; менять его на «ИП» или «Юрлицо» только ради этого шага не требуется.</p>
    <p>Корректные реквизиты нужны для идентификации рекламодателя и учёта интернет-рекламы. Если они уже указаны правильно, изменять их не нужно. <strong>Ожидаемый результат:</strong> данные соответствуют владельцу, а VK Реклама не показывает ошибок их проверки.</p>
    ${currentProjectNote}
    <h5>2. Где нажать / Как проверить</h5>
    <h6>А. Проверить существующие реквизиты</h6>
    <ol>
      <li>Откройте <a href="https://ads.vk.ru/hq/settings" target="_blank" rel="noopener noreferrer">настройки VK Рекламы</a> в кабинете, подтверждённом в разделе 1, и выберите вкладку «Общие».</li>
      <li>Найдите «Тип кабинета». Если указан «Физлицо», оставьте корректный тип без изменений. Если тип другой, сверяйте реквизиты по фактическому типу рекламодателя.</li>
      <li>Прокрутите страницу до раздела «Реквизиты».</li>
      <li>Для физического лица найдите «ФИО» и сравните фамилию, имя и отчество с документами владельца кабинета.</li>
      <li>Найдите «ИНН»: у физического лица в России он состоит из 12 цифр. Сверьте его с подтверждённым налоговым номером владельца.</li>
    </ol>
    <h6>Б. При необходимости подтвердить ИНН через ФНС</h6>
    <ol>
      <li>Сам владелец открывает <a href="https://service.nalog.ru/inn.do" target="_blank" rel="noopener noreferrer">официальный сервис ФНС «Узнай свой ИНН»</a>.</li>
      <li>Указывает требуемые сервисом ФИО, дату рождения и сведения документа, удостоверяющего личность.</li>
      <li>Отправляет запрос и сравнивает полученный ИНН с полем VK Рекламы.</li>
    </ol>
    <p>Паспортные данные, ФИО и ИНН владельца в GURU для этого шага не вводите и не передавайте.</p>
    <h6>В. Проверить состояние реквизитов в VK Рекламе</h6>
    <ol>
      <li>Вернитесь в «Настройки» → «Общие» и убедитесь, что обязательные для фактического типа кабинета поля заполнены.</li>
      <li>Проверьте отсутствие сообщения об ошибке реквизитов или требования исправить данные.</li>
      <li>Если данные правильные и ошибок нет, ничего не изменяйте.</li>
      <li>Обновите страницу и убедитесь, что реквизиты сохранились.</li>
    </ol>
    <h6>Г. Если обнаружена ошибка</h6>
    <ol>
      <li>Не отмечайте шаг выполненным, если ФИО или ИНН отличаются от подтверждённых данных владельца.</li>
      <li>Определите неверное значение. Если VK разрешает редактирование, исправьте его по документам владельца и сохраните предусмотренным способом.</li>
      <li>Если редактирование недоступно или VK отклоняет данные, обратитесь в поддержку через «Помощь и обучение».</li>
      <li>После исправления повторите проверку и убедитесь, что ошибка устранена.</li>
    </ol>
    <p>Не создавайте новый рекламный кабинет только из-за типа «Физлицо». <strong>Tilda:</strong> действий нет; здесь проверяются реквизиты рекламного кабинета.</p>
    <p><strong>Отдельная правовая проверка:</strong> требования к предпринимательской деятельности, налогам и сведениям о продавце при дистанционной продаже товаров оцениваются отдельно от типа рекламного кабинета.</p>
    <h5>3. Сверка</h5>
    <table><thead><tr><th>Что проверяем</th><th>Правильный результат</th></tr></thead><tbody>
      <tr><td>Тип кабинета</td><td>Соответствует фактическому рекламодателю; «Физлицо» допустим</td></tr>
      <tr><td>ФИО для физического лица</td><td>Совпадает с документами владельца</td></tr>
      <tr><td>ИНН для физического лица</td><td>Совпадает с подтверждённым ИНН владельца</td></tr>
      <tr><td>Сохранение</td><td>Данные остаются после обновления страницы</td></tr>
      <tr><td>Проверка VK</td><td>Нет неустранённых ошибок реквизитов</td></tr>
    </tbody></table>
    <p><strong>Готово:</strong> реквизиты подтверждены, сохранены и VK не показывает ошибок. <strong>Требует проверки:</strong> данные заполнены, но их достоверность или результат проверки платформой пока не подтверждены. <strong>Проблема:</strong> выявлено неверное ФИО, несовпадение ИНН или подтверждённое отклонение данных VK.</p>
    <p><strong>Критерий выполнения:</strong> реквизиты соответствуют подтверждённым данным рекламодателя, сохранены и не имеют неустранённых ошибок проверки VK. Регистрация ИП или юридического лица только для этого шага не требуется.</p>
  </div>`;
}
function g2VkAdsCabinetIdV2GuideHtml(workspace = state) {
  const def = g2wDef("vk");
  const account = def?.steps?.find(step => step[0] === "account");
  const field = account ? g2wFieldHtml(def, "", account, { suppressProviderDocs: true }) : "";
  return `<div class="g2mu-verbatim-copy g2vk-community-guide">
    <h5>1. Что сделать (инструкция)</h5>
    <p>Найдите существующий кабинет компании в VK Рекламе, подтвердите доступ к «Обзору» и «Кампаниям», затем найдите его числовой ID. Если кабинет уже есть, новый не создавайте.</p>
    <p><strong>Ожидаемый результат:</strong> открывается один подходящий кабинет; его ID в VK совпадает с сохранённым ID выбранного проекта.</p>
    <div class="g2vk-existing-id"><p><strong>Существующее поле GURU — «Название или ID кабинета»:</strong></p>${field}</div>
    <h5>2. Где нажать / Как проверить (инструкция)</h5>
    <h6>А. Найти и открыть кабинет</h6>
    <ol><li>Откройте <a href="https://ads.vk.ru/hq/overview" target="_blank" rel="noopener noreferrer">VK Реклама → «Обзор»</a> и войдите под рабочей учётной записью.</li>
      <li>Проверьте, что «Обзор» загружается без ошибки. В левом меню откройте «Кампании» и убедитесь, что виден список кампаний либо пустой список этого кабинета.</li>
      <li>Если доступно переключение кабинетов рядом с именем аккаунта, просмотрите список и выберите кабинет компании. Сверьте его с ранее используемыми кампаниями и сведениями компании.</li>
      <li>Вернитесь в «Обзор» и убедитесь, что выбранный кабинет остался тем же после обновления страницы.</li></ol>
    <h6>Б. Найти и сопоставить ID</h6>
    <ol><li>В левом меню откройте <a href="https://ads.vk.ru/hq/settings" target="_blank" rel="noopener noreferrer">«Настройки»</a> → «Общие».</li>
      <li>Найдите строку «ID кабинета» и перепишите только число. Не используйте ID личной страницы, кампании или пикселя.</li>
      <li>Сравните его цифра за цифрой с существующим полем GURU выше. Если там сохранено название или пусто, внесите подтверждённый числовой ID в это же поле; новое поле не требуется.</li>
      <li>Если числа различаются, вернитесь в «Обзор», проверьте переключатель кабинетов и повторите поиск ID. Не заменяйте старое значение, пока не выяснена причина.</li>
      <li>Обновите «Настройки» → «Общие» и проверьте, что ID относится к тому же кабинету, который открывался в «Кампаниях».</li></ol>
    <h6>В. Если кабинет недоступен</h6>
    <ol><li>Проверьте, под каким VK ID выполнен вход, и повторно откройте «Обзор».</li>
      <li>Если видна регистрация, выясните, не существует ли кабинет под другим рабочим аккаунтом. Если он найден, запросите доступ в шаге 1.2.</li>
      <li>Создавайте кабинет только после подтверждения отсутствия подходящего. Кампании и баланс здесь не меняйте.</li></ol>
    <h5>3. Сверка (инструкция)</h5>
    <p><strong>Готово:</strong> «Обзор» и «Кампании» открываются, числовой ID найден в «Настройки» → «Общие» и совпадает с сохранённым значением. <strong>Требует проверки:</strong> кабинет открывается, но ID ещё не сопоставлен. <strong>Проблема:</strong> кабинет недоступен или сохранённый ID подтверждённо относится к другому кабинету.</p>
    <p><strong>Критерий выполнения:</strong> доступный кабинет компании и его числовой ID проверены как одна связанная сущность без повторного создания.</p>
    <p><a href="${escapeAttr(G2W_DOC.vk)}" target="_blank" rel="noopener noreferrer">Официальный материал VK Рекламы о кабинете ↗</a></p>
  </div>`;
}
function g2VkAdsPaymentGuideHtml() {
  return `<div class="g2mu-verbatim-copy g2vk-community-guide">
    <h5>1. Что сделать (инструкция)</h5>
    <p>Проверьте, что у подтверждённого рекламного кабинета доступен финансовый раздел, подходящий компании способ оплаты и нет явной ошибки, препятствующей оплате. Пополнять баланс ради этой проверки не требуется.</p>
    <p><strong>Ожидаемый результат:</strong> ответственный сотрудник может открыть финансовые настройки и понимает доступный способ пополнения до запуска кампаний.</p>
    <h5>2. Где нажать / Как проверить (инструкция)</h5>
    <h6>А. Проверить текущий кабинет</h6>
    <ol><li>Откройте <a href="https://ads.vk.ru/hq/overview" target="_blank" rel="noopener noreferrer">VK Рекламу</a> под аккаунтом из шага 1.2.</li>
      <li>Сверьте выбранный кабинет и его ID с шагом 1.1, чтобы не проверять баланс другого кабинета.</li>
      <li>В левом меню откройте финансовый раздел: в разных версиях он называется «Баланс» или «Бюджет». Посмотрите текущий баланс и доступные действия по оплате.</li>
      <li>Проверьте, доступен ли способ пополнения для фактического типа рекламодателя, и нет ли сообщения об ограничении или ошибке реквизитов. Не вводите платёжные данные и не проводите платёж для теста.</li>
      <li>Если интерфейс показывает платёжные документы или историю, убедитесь, что они относятся к выбранному кабинету. Обновите страницу и проверьте, что финансовый раздел снова открывается.</li></ol>
    <h6>Б. Если финансовый раздел недоступен</h6>
    <ol><li>Проверьте права доступа из шага 1.2: сотруднику может быть запрещён просмотр финансов.</li>
      <li>Проверьте реквизиты из шага 1.3 и сообщение VK об ограничении. Исправляйте только подтверждённую ошибку.</li>
      <li>Если причина неясна, откройте «Помощь и обучение» в кабинете и обратитесь в поддержку VK, указав ID кабинета и текст ошибки.</li>
      <li>После изменения прав или устранения ошибки повторно откройте финансовый раздел и проверьте доступный способ оплаты.</li></ol>
    <h5>3. Сверка (инструкция)</h5>
    <p><strong>Готово:</strong> финансовый раздел нужного кабинета открывается, способ оплаты доступен и блокирующей ошибки нет. <strong>Требует проверки:</strong> раздел открыт, но способ оплаты или полномочия ещё не подтверждены. <strong>Проблема:</strong> подтверждённое ограничение не позволяет подготовить оплату.</p>
    <p><strong>Критерий выполнения:</strong> готовность кабинета к оплате подтверждена без обязательного пополнения и без изменения рекламных кампаний.</p>
    <p><a href="https://object2-ac.vk-apps.com/vk-education-0554ff56-27eb-4093-a702-685722cef6d9/media/18/bc18e2a7d8e3437abead53f20b431385.pdf" target="_blank" rel="noopener noreferrer">Официальный материал VK о финансовом разделе ↗</a></p>
  </div>`;
}
function g2VkAdsPixelGuideHtml(workspace = state) {
  const def = g2wDef("vk");
  const idStep = def?.steps?.find(step => step[0] === "id");
  const field = idStep ? g2wFieldHtml(def, "", idStep, { suppressProviderDocs: true }) : "";
  const site = g2VkSiteUrl(workspace);
  return `<div class="g2mu-verbatim-copy g2vk-community-guide">
    <h5>1. Что сделать (инструкция)</h5>
    <p>Для маршрута на сайт найдите уже созданный пиксель VK Рекламы для домена выбранного проекта. Создайте новый только если подходящего пикселя нет; если пиксель принадлежит другому кабинету, запросите доступ. Сверьте его числовой ID.</p>
    <p><strong>Ожидаемый результат:</strong> один подходящий пиксель связан с опубликованным доменом и доступен в нужном рекламном кабинете.</p>
    <p>Сайт проекта: ${site ? `<a href="${escapeAttr(site)}" target="_blank" rel="noopener noreferrer">${escapeHtml(site)}</a>` : "адрес ещё не указан в проекте"}.</p>
    <div class="g2vk-existing-id"><p><strong>Существующее поле GURU — «ID пикселя / Top.Mail.ru»:</strong></p>${field}</div>
    <h5>2. Где нажать / Как проверить (инструкция)</h5>
    <h6>А. Проверить существующий пиксель в VK</h6>
    <ol><li>Откройте <a href="https://ads.vk.ru/hq/pixels" target="_blank" rel="noopener noreferrer">VK Реклама → пиксели</a> в кабинете, подтверждённом в шаге 1.1.</li>
      <li>Найдите раздел «Конверсии» → вкладку «Пиксели». Если интерфейс показывает раздел «Сайты», откройте список пикселей там.</li>
      <li>Просмотрите существующие пиксели и сопоставьте домен каждого с основным адресом проекта. Откройте настройку найденного пикселя и найдите его ID.</li>
      <li>Сравните ID с сохранённым значением GURU выше. Если они совпадают, ничего не создавайте. Если различаются, уточните, какой пиксель уже установлен на сайте, прежде чем менять поле.</li></ol>
    <h6>Б. Если подходящего пикселя нет</h6>
    <ol><li>Проверьте другие доступные кабинеты и данные сайта на существующий код Top.Mail.ru, чтобы не создать дубликат.</li>
      <li>Если пиксель существует в другом кабинете, в окне «Добавить пиксель» выберите вкладку «ID пикселя», укажите его ID и почту пользователя, который его настраивал, и запросите доступ. Дождитесь подтверждения доступа.</li>
      <li>Если пикселя действительно нет, в «Конверсии» → «Пиксели» нажмите «Добавить пиксель», проверьте домен на вкладке «Домен сайта» и подтвердите создание.</li>
      <li>Откройте созданный пиксель, сверьте домен и скопируйте числовой ID в существующее поле GURU. Обновите список: пиксель должен оставаться доступным.</li></ol>
    <h6>В. Если обнаружено расхождение</h6>
    <ol><li>Не заменяйте сохранённый ID только по названию пикселя. Сверьте домен, код на опубликованном сайте и выбранный кабинет.</li>
      <li>При недостатке прав запросите доступ к существующему пикселю; при ошибке домена используйте поддержку VK. После исправления повторите сопоставление.</li></ol>
    <p><strong>Tilda:</strong> здесь только сверяем, какой ID понадобится для установки. Сохранение в настройках сайта и публикация выполняются в шаге 2.2. Если рекламный маршрут подтверждённо не ведёт на сайт, пикселю применяется статус «Не требуется».</p>
    <h5>3. Сверка (инструкция)</h5>
    <p><strong>Готово:</strong> найден один подходящий пиксель, его домен и ID совпадают с проектом и сохранённым значением. <strong>Требует проверки:</strong> пиксель найден, но ID, домен или доступ ещё не сопоставлены. <strong>Проблема:</strong> подтверждён неправильный пиксель либо доступ к нужному отсутствует.</p>
    <p><strong>Критерий выполнения:</strong> существующий или один новый пиксель выбран без дублирования, его ID и домен подтверждены в VK.</p>
    <p><a href="https://ads.vk.ru/help/articles/pixel" target="_blank" rel="noopener noreferrer">Официальная справка VK о пикселе ↗</a> · <a href="https://help-ru.tilda.cc/vk-pixel" target="_blank" rel="noopener noreferrer">Инструкция Tilda ↗</a></p>
  </div>`;
}
function g2VkAdsPixelInstallGuideHtml(workspace = state) {
  const site = g2VkSiteUrl(workspace);
  const pixelId = g2VkCompanyValue("pixelId", workspace);
  return `<div class="g2mu-verbatim-copy g2vk-community-guide">
    <h5>1. Что сделать (инструкция)</h5>
    <p>Установите выбранный пиксель на опубликованный сайт, сохраните настройки, переопубликуйте нужные страницы и подтвердите передачу фактического посещения в VK Рекламу. Сначала проверьте уже существующую интеграцию, чтобы не поставить код дважды.</p>
    <p><strong>Ожидаемый результат:</strong> на опубликованном сайте работает именно пиксель из шага 2.1; VK получает данные тестового визита.</p>
    <p>Данные проекта: сайт ${site ? `<a href="${escapeAttr(site)}" target="_blank" rel="noopener noreferrer">${escapeHtml(site)}</a>` : "не указан"}; ID пикселя ${pixelId ? `<code>${escapeHtml(pixelId)}</code>` : "не указан"}.</p>
    <h5>2. Где нажать / Как проверить (инструкция)</h5>
    <h6>А. Проверить код в VK Рекламе</h6>
    <ol><li>Откройте <a href="https://ads.vk.ru/hq/pixels" target="_blank" rel="noopener noreferrer">пиксели VK Рекламы</a> в нужном кабинете и выберите пиксель из шага 2.1.</li>
      <li>Откройте его настройку и вкладку «Код пикселя». Сверьте числовой ID внутри кода с сохранённым значением. Не копируйте код другого пикселя.</li>
      <li>Посмотрите текущее состояние поступления данных. Сообщение «Данные не поступают» до публикации ещё не доказывает ошибку установки.</li></ol>
    <h6>Б. Проверить и при необходимости сохранить настройку в Tilda</h6>
    <ol><li>Войдите в <a href="https://tilda.cc/" target="_blank" rel="noopener noreferrer">Tilda</a>, откройте проект опубликованного сайта и перейдите в «Настройки сайта» → «Аналитика».</li>
      <li>Найдите поле <strong>MAIL.RU COUNTER ID (VK PIXEL)</strong> и сравните его с ID из VK. Проверьте также «Вставку кода в Head», чтобы один и тот же пиксель не был добавлен вторым способом.</li>
      <li>Если ID уже указан правильно и пиксель не дублируется, оставьте настройки без изменений. Если интеграции нет, вставьте только числовой ID в поле Mail.ru, сохраните настройки сайта.</li>
      <li>Не используйте старое поле «VK Pixel» для нового пикселя VK Рекламы. Если выбран способ установки полным кодом в Head, используйте только его и не заполняйте поле Mail.ru тем же пикселем.</li>
      <li>После изменения настройки вернитесь к списку страниц и опубликуйте все страницы сайта. Дождитесь завершения публикации и откройте рабочий домен, а не предпросмотр редактора.</li></ol>
    <h6>В. Проверить отправку и поступление данных</h6>
    <ol><li>Откройте опубликованную страницу сайта в браузере. Если на сайте есть согласие на рекламные cookie, выполните действие, разрешающее рекламные скрипты, прежде чем проверять пиксель.</li>
      <li>В инструментах разработчика откройте вкладку Network, обновите страницу и отфильтруйте запросы по <code>top-mail</code>. Сверьте ID в запросах трекера с ID выбранного пикселя.</li>
      <li>Вернитесь в VK Рекламу к тому же пикселю и проверьте поступление события просмотра или показателей посещений. Данные могут появиться с задержкой; при необходимости повторите проверку позже.</li>
      <li>Повторите визит на другой опубликованной странице и убедитесь, что используется тот же пиксель.</li></ol>
    <h6>Г. Если проверка не прошла</h6>
    <ol><li>Если запросов нет, проверьте сохранение ID в Tilda, публикацию страниц, согласие на cookie и возможную блокировку браузерным расширением.</li>
      <li>Если запросы есть, а VK показывает «Данные не поступают», сверьте ID и кабинет, выполните ещё несколько визитов и дождитесь обработки данных. Если ошибка сохраняется, обратитесь в поддержку VK с ID пикселя и адресом опубликованной страницы.</li>
      <li>При обнаружении двух одинаковых установок оставьте один подтверждённый способ, сохраните настройку, переопубликуйте страницы и повторите контрольный визит.</li></ol>
    <h5>3. Сверка (инструкция)</h5>
    <p><strong>Готово:</strong> в Tilda сохранён правильный ID без дублирующего кода, страницы опубликованы, запросы с тем же ID видны на рабочем сайте и VK получил тестовые данные. <strong>Требует проверки:</strong> код отправляет запросы, но поступление данных в VK ещё не подтверждено. <strong>Проблема:</strong> после устранения задержки и блокировок запросов нет, ID не совпадает или VK подтверждает ошибку.</p>
    <p><strong>Критерий выполнения:</strong> фактическое событие опубликованного сайта поступило в выбранный пиксель VK Рекламы после сохранения и публикации.</p>
    <p><a href="https://ads.vk.ru/help/articles/pixel" target="_blank" rel="noopener noreferrer">Официальная справка VK ↗</a> · <a href="https://help-ru.tilda.cc/vk-pixel" target="_blank" rel="noopener noreferrer">Официальная инструкция Tilda ↗</a> · <a href="https://help-ru.tilda.cc/cookies-consent" target="_blank" rel="noopener noreferrer">Tilda о cookie ↗</a></p>
  </div>`;
}
function g2VkAdsGuideHtml(id) {
  if (id === "ads_cabinet_id_v2") return g2VkAdsCabinetIdV2GuideHtml();
  if (id === "ads_payment_v2") return g2VkAdsPaymentGuideHtml();
  if (id === "ads_pixel_v2") return g2VkAdsPixelGuideHtml();
  if (id === "ads_pixel_install_v2") return g2VkAdsPixelInstallGuideHtml();
  const previous = id === "ads_rights_v2" ? g2VkAdsRightsGuideHtml() : g2VkAdsRequisitesGuideHtml();
  return previous.replace("<h5>1. Что сделать</h5>", "<h5>1. Что сделать (инструкция)</h5>")
    .replace("<h5>2. Где нажать / Как проверить</h5>", "<h5>2. Где нажать / Как проверить (инструкция)</h5>")
    .replace("<h5>3. Сверка</h5>", "<h5>3. Сверка (инструкция)</h5>");
}
function g2VkCanPass(id, workspace = state) {
  if (G2_VK_ADS_V2_IDS.includes(id)) return g2VkCanConfirmAdsV2(id, workspace);
  return id === "s11" || id === "s12" && g2VkCanConfirmRights(workspace) ||
    id === "s21" && g2VkCanConfirmInfo(workspace) || id === "s22" && g2VkCanConfirmDesign(workspace) ||
    id === "s31" && g2VkCanConfirmClientRoute(workspace) || id === "s32" && g2VkCanConfirmMessages(workspace);
}
function g2VkAdsVerificationLabel(workspace = state) {
  const verification = g2VkRecord(workspace)?.verification;
  if (!verification) return "Итоговая проверка ещё не выполнена.";
  const status = g2VkAdsVerificationStatus(workspace);
  if (status === "needs_check") return "Прежняя итоговая проверка сохранена. Критерии новой структуры требуют повторной проверки.";
  return status === "ready" ? "Работа настройки подтверждена." : "Проверка показала проблему.";
}
function g2VkAdsVerificationHtml(workspace = state) {
  const source = g2VkRecord(workspace)?.verification?.source_url || "";
  const canPass = G2_VK_ADS_V2_IDS.every(id => ["ready", "not_needed"].includes(g2VkStepStatus(id, workspace)));
  return `<div class="g2w-verify g2sb-verification g2vk-ads-final" data-g2vk-final>
    <div><strong>Проверка результата</strong><small>Подтвердите работу кабинета и, если нужен сайт, поступление данных пикселя после выполнения шести шагов.</small></div>
    <label>Где проверили<input data-g2vk-final-source value="${escapeAttr(source)}" placeholder="Ссылка на отчёт или название сервиса"></label>
    <div class="g2w-verify-actions"><button type="button" data-g2vk-final-result="passed" ${canPass ? "" : "disabled"}>Работает</button>
      <button type="button" data-g2vk-final-result="failed">Не работает</button></div>
    <small class="g2w-verification-state" data-g2vk-final-state>${escapeHtml(g2VkAdsVerificationLabel(workspace))}</small>
    <small class="g2w-verification-state" data-g2vk-final-history>Сохранённых записей истории: ${g2VkRecord(workspace)?.history?.length || 0}</small></div>`;
}
function g2VkStepHtml(step) {
  const status = g2VkStepStatus(step.id);
  const ready = status === "ready";
  const markerAction = ready ? "reset" : "passed";
  const canPass = g2VkCanPass(step.id);
  const inheritedNotNeeded = step.id.startsWith("s") && step.id !== "s11" && g2VkStepStatus("s11") === "not_needed";
  const choices = [["passed", "Готово"], ["pending", "Требует проверки"], ["failed", "Проблема"],
    ...(step.id === "s32" ? [["not_needed", "Не требуется"]] : [])];
  return `<article class="g2mu-step g2vk-step" data-g2vk-step="${step.id}" data-g2sb-step-id="${step.id}">
    <div class="g2mu-step-heading"><span class="g2mu-number">${step.number}</span>
      <button type="button" class="g2mu-step-marker" data-g2vk-review="${markerAction}" data-g2vk-step-id="${step.id}" aria-label="Шаг ${step.number}: ${step.title}. ${g2VkLabel(status)}. ${ready ? "Снять подтверждение" : "Подтвердить сверку"}" aria-pressed="${ready}" ${status === "not_needed" || !ready && !canPass ? "disabled" : ""}>${ready ? "✓" : status === "problem" ? "!" : ""}</button>
      <div><span class="g2mu-kicker">Что сделать</span><h5>${step.title}</h5><p>${escapeHtml(step.what)}</p></div>
      <span class="g2mu-step-status" data-g2vk-status="${status}">${g2VkLabel(status)}</span></div>
    <div class="g2mu-actions">${choices.map(([result, label]) => `<button type="button" data-g2vk-review="${result}" data-g2vk-step-id="${step.id}" aria-pressed="${String(g2VkReview(state, step.id)?.result === result && status !== "recheck")}" ${inheritedNotNeeded || status === "not_needed" || result === "passed" && !canPass || result === "not_needed" && !g2VkCanConfirmRights() ? "disabled" : ""}>${label}</button>`).join("")}</div>
    ${g2VkLegacyHtml(step.id)}
    <details class="g2mu-guide g2vk-guide" data-ui-keeper-key="g2vk:guide:${escapeAttr(activeProjectId)}:${step.id}"><summary>Как сделать</summary>
      <div class="g2mu-guide-body">${G2_VK_ADS_V2_IDS.includes(step.id) ? g2VkAdsGuideHtml(step.id) :
        step.id === "s32" ? g2VkMessagesGuideHtml() :
        step.id === "s31" ? g2VkClientRouteGuideHtml() :
        step.id === "s22" ? g2VkDesignGuideHtml() :
        step.id === "s21" ? g2VkCompanyInfoGuideHtml() :
        step.id === "s12" ? g2VkRightsGuideHtml() : g2VkGuideHtml()}</div></details></article>`;
}
function g2VkSectionHtml(section) {
  const status = g2VkSectionStatus(section);
  const ready = g2VkCompletedCount(section.steps);
  const progressText = `${ready} из ${section.steps.length} ${section.steps.length === 1 ? "шага" : "шагов"}`;
  return `<details class="g2mu-section g2vk-section" data-g2vk-section="${section.number}"
      data-ui-keeper-key="g2vk:section:${escapeAttr(activeProjectId)}:${section.number}" ${g2VkSectionOpen(section.number) ? "open" : ""}>
      <summary><div><h4>${section.displayNumber || section.number}. ${section.title}</h4></div><span class="g2mu-section-meta"><span data-g2vk-section-progress>${progressText}</span>
        <span class="status-pill status-${status}" data-g2vk-section-status="${status}">${g2VkLabel(status)}</span></span></summary>
      <div class="g2mu-section-body">${section.steps.map(g2VkStepHtml).join("")}</div></details>`;
}
function g2VkBlockHtml(config) {
  const status = g2VkStatus();
  const total = G2_VK_STEPS.length;
  const ready = g2VkCompletedCount(G2_VK_STEPS);
  const progressText = `${ready} из ${total} ${total === 1 ? "шага" : "шагов"}`;
  const communitySections = G2_VK_SECTIONS.filter(section => section.area !== "ads");
  const adsSections = G2_VK_SECTIONS.filter(section => section.area === "ads");
  const communitySteps = communitySections.flatMap(section => section.steps);
  const adsSteps = adsSections.flatMap(section => section.steps);
  const communityReady = g2VkCompletedCount(communitySteps);
  const adsReady = g2VkCompletedCount(adsSteps);
  const communityStatus = g2VkCommunityStatus();
  const adsStatus = g2VkAdsStatus();
  return `<details class="g2sb-block g2u-block g2wm-block g2vk-block ${status === "not_needed" ? "is-not-needed" : ""}"
    data-g2sb-id="company-vk" data-g2sb-product-id="" data-ui-keeper-key="g2sb:company::company-vk" open>
    <summary class="g2sb-header"><span class="g2sb-header-main"><span class="g2sb-heading"><strong id="g2sb-company-vk-company" class="g2sb-title">VK</strong>
      <span class="g2sb-status" data-g2sb-status data-status="${status}">${g2VkLabel(status)}</span></span>
      <span class="g2sb-progress" data-g2sb-progress>${progressText}</span><progress class="g2u-progress" value="${ready}" max="${total}" aria-label="Готовность блока"></progress></span>
      <span class="g2vk-group-summary" data-g2vk-group-summary>${g2VkGroupSummary()}</span></summary>
    <div class="g2sb-body g2wm-body">
      <section class="g2vk-subservice" aria-label="Сообщество VK">
        <div class="g2vk-category-header">Сообщество</div>
        <details class="g2vk-service" data-g2vk-subservice="community" data-ui-keeper-key="g2vk:subservice:${escapeAttr(activeProjectId)}:community" ${g2VkSubserviceOpen("community") ? "open" : ""}>
          <summary class="g2vk-service-header"><span class="g2vk-service-main"><span class="g2vk-service-heading"><strong>Сообщество VK · Компания</strong>
            <span class="status-pill status-${communityStatus}" data-g2vk-community-status>${g2VkLabel(communityStatus)}</span></span>
            <span class="g2vk-service-progress" data-g2vk-community-progress>${communityReady} из ${communitySteps.length} шагов</span>
            <progress class="g2u-progress" data-g2vk-community-meter value="${communityReady}" max="${communitySteps.length}" aria-label="Готовность сообщества"></progress></span>
            <span class="g2vk-service-actions"><a href="https://vk.ru/" target="_blank" rel="noopener noreferrer">Открыть сервис ↗</a></span></summary>
          <div class="g2vk-service-body">${communitySections.map(g2VkSectionHtml).join("")}</div>
        </details>
      </section>
      <section class="g2vk-subservice" aria-label="VK Реклама и пиксель">
        <div class="g2vk-category-header">Реклама</div>
        <details class="g2vk-service" data-g2vk-subservice="ads" data-ui-keeper-key="g2vk:subservice:${escapeAttr(activeProjectId)}:ads" ${g2VkSubserviceOpen("ads") ? "open" : ""}>
          <summary class="g2vk-service-header"><span class="g2vk-service-main"><span class="g2vk-service-heading"><strong>VK Реклама и пиксель · Компания</strong>
            <span class="status-pill status-${adsStatus}" data-g2vk-ads-status>${g2VkLabel(adsStatus)}</span></span>
            <span class="g2vk-service-progress" data-g2vk-ads-progress>${adsReady} из ${adsSteps.length} шагов</span>
            <progress class="g2u-progress" data-g2vk-ads-meter value="${adsReady}" max="${adsSteps.length}" aria-label="Готовность VK Рекламы"></progress></span></summary>
          <div class="g2vk-service-body">${adsSections.map(g2VkSectionHtml).join("")}
            ${g2VkAdsVerificationHtml()}</div>
        </details>
      </section>
    </div></details>`;
}
function g2VkRefresh(block) {
  if (!block) return;
  const status = g2VkStatus();
  const steps = G2_VK_STEPS;
  const ready = g2VkCompletedCount(steps);
  const progressText = `${ready} из ${steps.length} ${steps.length === 1 ? "шага" : "шагов"}`;
  block.classList.toggle("is-not-needed", status === "not_needed");
  const badge = block.querySelector(":scope > summary [data-g2sb-status]");
  if (badge) { badge.dataset.status = status; badge.textContent = g2VkLabel(status); }
  const progress = block.querySelector(":scope > summary [data-g2sb-progress]");
  if (progress) progress.textContent = progressText;
  const meter = block.querySelector(":scope > summary progress");
  if (meter) meter.value = ready;
  const groupSummary = block.querySelector("[data-g2vk-group-summary]");
  if (groupSummary) groupSummary.textContent = g2VkGroupSummary();
  const communitySections = G2_VK_SECTIONS.filter(section => section.area !== "ads");
  const communitySteps = communitySections.flatMap(section => section.steps);
  const communityReady = g2VkCompletedCount(communitySteps);
  const communityBadge = block.querySelector("[data-g2vk-community-status]");
  if (communityBadge) { const communityStatus = g2VkCommunityStatus(); communityBadge.className = `status-pill status-${communityStatus}`;
    communityBadge.textContent = g2VkLabel(communityStatus); }
  const communityProgress = block.querySelector("[data-g2vk-community-progress]");
  if (communityProgress) communityProgress.textContent = `${communityReady} из ${communitySteps.length} шагов`;
  const communityMeter = block.querySelector("[data-g2vk-community-meter]");
  if (communityMeter) communityMeter.value = communityReady;
  const adsSteps = G2_VK_SECTIONS.filter(section => section.area === "ads").flatMap(section => section.steps);
  const adsReady = g2VkCompletedCount(adsSteps);
  const adsProgress = block.querySelector("[data-g2vk-ads-progress]");
  if (adsProgress) adsProgress.textContent = `${adsReady} из ${adsSteps.length} шагов`;
  const adsMeter = block.querySelector("[data-g2vk-ads-meter]");
  if (adsMeter) adsMeter.value = adsReady;
  const adsBadge = block.querySelector("[data-g2vk-ads-status]");
  if (adsBadge) { const adsStatus = g2VkAdsStatus(); adsBadge.className = `status-pill status-${adsStatus}`;
    adsBadge.textContent = g2VkLabel(adsStatus); }
  for (const section of G2_VK_SECTIONS) {
    const element = block.querySelector(`[data-g2vk-section="${section.number}"]`);
    if (!element) continue;
    const sectionStatus = g2VkSectionStatus(section);
    const sectionReady = g2VkCompletedCount(section.steps);
    const sectionProgress = element.querySelector("[data-g2vk-section-progress]");
    if (sectionProgress) sectionProgress.textContent = `${sectionReady} из ${section.steps.length} ${section.steps.length === 1 ? "шага" : "шагов"}`;
    const sectionBadge = element.querySelector("[data-g2vk-section-status]");
    if (sectionBadge) { sectionBadge.dataset.g2vkSectionStatus = sectionStatus;
      sectionBadge.className = `status-pill status-${sectionStatus}`; sectionBadge.textContent = g2VkLabel(sectionStatus); }
  }
  for (const step of steps) {
    const row = block.querySelector(`[data-g2vk-step="${step.id}"]`);
    if (!row) continue;
    const stepStatus = g2VkStepStatus(step.id);
    const readyStep = stepStatus === "ready";
    const canPass = g2VkCanPass(step.id);
    const inheritedNotNeeded = step.id.startsWith("s") && step.id !== "s11" && g2VkStepStatus("s11") === "not_needed";
    const stepBadge = row.querySelector("[data-g2vk-status]");
    if (stepBadge) { stepBadge.dataset.g2vkStatus = stepStatus; stepBadge.textContent = g2VkLabel(stepStatus); }
    const marker = row.querySelector(".g2mu-step-marker[data-g2vk-review]");
    if (marker) {
      marker.dataset.g2vkReview = readyStep ? "reset" : "passed";
      marker.disabled = stepStatus === "not_needed" || !readyStep && !canPass;
      marker.setAttribute("aria-pressed", String(readyStep));
      marker.setAttribute("aria-label", `Шаг ${step.number}: ${step.title}. ${g2VkLabel(stepStatus)}. ${readyStep ? "Снять подтверждение" : "Подтвердить сверку"}`);
      marker.textContent = readyStep ? "✓" : stepStatus === "problem" ? "!" : "";
    }
    row.querySelectorAll(".g2mu-actions [data-g2vk-review]").forEach((button) => {
      button.disabled = inheritedNotNeeded || stepStatus === "not_needed" || button.dataset.g2vkReview === "passed" && !canPass ||
        button.dataset.g2vkReview === "not_needed" && !g2VkCanConfirmRights();
      button.setAttribute("aria-pressed", String(g2VkReview(state, step.id)?.result === button.dataset.g2vkReview &&
        stepStatus !== "recheck" && stepStatus !== "not_needed"));
    });
  }
  const finalPass = block.querySelector('[data-g2vk-final-result="passed"]');
  if (finalPass) finalPass.disabled = !G2_VK_ADS_V2_IDS.every(id =>
    ["ready", "not_needed"].includes(g2VkStepStatus(id)));
  const finalState = block.querySelector("[data-g2vk-final-state]");
  if (finalState) finalState.textContent = g2VkAdsVerificationLabel();
  const history = block.querySelector("[data-g2vk-final-history]");
  if (history) history.textContent = `Сохранённых записей истории: ${g2VkRecord()?.history?.length || 0}`;
}

g2VkConfig.statusResolver = ({ workspace }) => g2VkStatus(workspace);
// Product VK checks still ask the legacy wizard for the company VK status.
// Resolve that one unit from the new six-step workflow without changing its stored records.
const g2VkPreviousWizardStatus = g2wStatus;
g2wStatus = function (def, productId = "", workspace = state) {
  if (def?.id === "vk") return g2wApplicability(def, productId, workspace) === "not_needed"
    ? "not_needed" : g2VkAdsStatus(workspace);
  return g2VkPreviousWizardStatus.apply(this, arguments);
};
const g2VkPreviousBlockHtml = g2UnifiedBlockHtml;
g2UnifiedBlockHtml = function (config, productId = "") {
  return config?.id === "company-vk" ? g2VkBlockHtml(config)
    : g2VkPreviousBlockHtml.apply(this, arguments);
};
const g2VkPreviousRefresh = g2ServiceBlockRefresh;
g2ServiceBlockRefresh = function (block, config, productId) {
  return config?.id === "company-vk" ? g2VkRefresh(block)
    : g2VkPreviousRefresh.apply(this, arguments);
};

document.addEventListener("click", (event) => {
  const button = event.target?.closest?.('[data-g2sb-id="company-vk"] [data-g2vk-review]');
  if (!button) return;
  const stepId = button.dataset.g2vkStepId;
  if (!G2_VK_STEPS.some(step => step.id === stepId)) return;
  const result = button.dataset.g2vkReview;
  if (!["passed", "pending", "failed", "not_needed", "reset"].includes(result)) return;
  if (result === "not_needed" && (stepId !== "s32" || !g2VkCanConfirmRights())) return;
  if (G2_VK_ADS_V2_IDS.includes(stepId) && g2VkStepStatus(stepId) === "not_needed") return;
  if (result === "passed" && G2_VK_ADS_V2_IDS.includes(stepId) && !g2VkCanConfirmAdsV2(stepId)) return;
  if (result === "passed" && stepId === "s12" && !g2VkCanConfirmRights()) return;
  if (result === "passed" && stepId === "s21" && !g2VkCanConfirmInfo()) return;
  if (result === "passed" && stepId === "s22" && !g2VkCanConfirmDesign()) return;
  if (result === "passed" && stepId === "s31" && !g2VkCanConfirmClientRoute()) return;
  if (result === "passed" && stepId === "s32" && !g2VkCanConfirmMessages()) return;
  if (result === "reset" && g2VkStepStatus(stepId) !== "ready") return;
  const record = g2VkRecord(state, true);
  if (!record) return;
  if (G2_VK_ADS_V2_IDS.includes(stepId)) {
    record.steps ||= {};
    const previous = record.steps[stepId];
    if (previous?.result) (record.history ||= []).push({ ...previous });
    record.steps[stepId] = { step_id: stepId, result: result === "reset" ? "" : result,
      fingerprint: g2VkFingerprint(state, stepId), checkedAt: new Date().toISOString() };
    guruGateReadinessCache.delete("gate-2");
    g2wSave({ afterPaint: true });
    g2VkRefresh(button.closest('[data-g2sb-id="company-vk"]'));
    g2wRefresh({ changedServiceId: "company-vk" });
    return;
  }
  const reviewField = stepId === "s32" ? G2_VK_MESSAGES_REVIEW_FIELD :
    stepId === "s31" ? G2_VK_CLIENT_ROUTE_REVIEW_FIELD :
    stepId === "s22" ? G2_VK_DESIGN_REVIEW_FIELD :
    stepId === "s21" ? G2_VK_COMPANY_INFO_REVIEW_FIELD :
    stepId === "s12" ? G2_VK_RIGHTS_REVIEW_FIELD : G2_VK_COMMUNITY_REVIEW_FIELD;
  const historyField = stepId === "s32" ? "vkCommunityMessagesReviewHistoryV1" :
    stepId === "s31" ? "vkClientRouteReviewHistoryV1" :
    stepId === "s22" ? "vkCommunityDesignReviewHistoryV1" :
    stepId === "s21" ? "vkCompanyInfoReviewHistoryV1" :
    stepId === "s12" ? "vkCommunityRightsReviewHistoryV1" : "vkCommunityReviewHistoryV1";
  const previous = record[reviewField];
  if (previous?.result) (record[historyField] ||= []).push({ ...previous });
  record[reviewField] = { result: result === "reset" ? "" : result,
    fingerprint: g2VkFingerprint(state, stepId), checkedAt: new Date().toISOString() };
  guruGateReadinessCache.delete("gate-2");
  g2wSave({ afterPaint: true });
  g2VkRefresh(button.closest('[data-g2sb-id="company-vk"]'));
  g2wRefresh({ changedServiceId: "company-vk" });
});
document.addEventListener("click", (event) => {
  const button = event.target?.closest?.('[data-g2sb-id="company-vk"] [data-g2vk-final-result]');
  if (!button) return;
  const result = button.dataset.g2vkFinalResult;
  if (result !== "passed" && result !== "failed") return;
  if (result === "passed" && !G2_VK_ADS_V2_IDS.every(id =>
    ["ready", "not_needed"].includes(g2VkStepStatus(id)))) return;
  const sourceInput = button.closest("[data-g2vk-final]")?.querySelector("[data-g2vk-final-source]");
  const source = String(sourceInput?.value || "").trim();
  if (!source) { sourceInput?.focus(); return; }
  const record = g2VkRecord(state, true);
  if (record.verification) (record.history ||= []).push({ ...record.verification });
  record.verification = { step_id: "final_verification", scope: "company", project_id: guruV194ProjectId(),
    product_id: "", result, params: {}, verification_type: "manual", checked_at: new Date().toISOString(),
    source_url: source, fingerprint: g2VkAdsVerificationFingerprint() };
  guruGateReadinessCache.delete("gate-2");
  g2wSave({ afterPaint: true });
  g2VkRefresh(button.closest('[data-g2sb-id="company-vk"]'));
  g2wRefresh({ changedServiceId: "company-vk" });
});
document.addEventListener("change", (event) => {
  const field = event.target;
  if (!field?.matches?.('[data-g2sb-id="company-vk"] [data-g2w-card="vk"]:is([data-g2w-field="vkAccount"], [data-g2w-field="pixelId"])')) return;
  g2VkRefresh(field.closest('[data-g2sb-id="company-vk"]'));
  g2wRefresh({ changedServiceId: "company-vk" });
});
document.addEventListener("toggle", (event) => {
  const section = event.target;
  if (section instanceof HTMLDetailsElement &&
      section.matches('[data-g2sb-id="company-vk"] [data-g2vk-subservice]') &&
      section.isConnected && activeProjectId) {
    try { localStorage.setItem(`g2vk:subservice:${activeProjectId}:${section.dataset.g2vkSubservice}`, section.open ? "1" : "0"); }
    catch (_) {}
    return;
  }
  if (!(section instanceof HTMLDetailsElement) ||
      !section.matches('[data-g2sb-id="company-vk"] [data-g2vk-section]') ||
      !section.isConnected || !state || !activeProjectId) return;
  const number = section.dataset.g2vkSection;
  if (!G2_VK_SECTIONS.some(row => row.number === number)) return;
  const { field, prefix } = g2VkSectionPreference(number);
  const value = section.open ? "1" : "0";
  let saved = null;
  try { saved = localStorage.getItem(prefix + activeProjectId); } catch (_) {}
  if (state.ui?.[field] === section.open && saved === value) return;
  state.ui ||= {};
  state.ui[field] = section.open;
  try { localStorage.setItem(prefix + activeProjectId, value); } catch (_) {}
  guruScheduleUiPreferenceSave();
}, true);
