/* Gate 2 company services added in step 3. Existing wizard cards remain the storage source. */
const G2S3_DOC = Object.freeze({
  telegram: "https://ads.telegram.org/faq",
  meta: "https://help-ru.tilda.cc/facebook-pixel",
  ga4: "https://support.google.com/analytics/answer/9304153",
  ga4Tilda: "https://help-ru.tilda.cc/statistics/google-analytics",
  gsc: "https://support.google.com/webmasters/answer/9008080",
  googleAds: "https://support.google.com/google-ads/answer/1722022",
  forms: "https://help-ru.tilda.cc/forms",
  formSettings: "https://help-ru.tilda.cc/forms/settings",
  formErrors: "https://help-ru.tilda.cc/forms/errors",
  leads: "https://help-ru.tilda.cc/leads",
  tildaHttps: "https://tilda.cc/ru/answers/a/https/",
});

function g2s3Gate0Url(workspace = state) {
  return megaPlatformUrl("fixed", "home", workspace) || "";
}
function g2s3PrivacyUrl(workspace = state) {
  return megaPlatformUrl("fixed", "privacy", workspace) || "";
}
function g2s3CrmName(workspace = state) {
  return String(g2c2Marketing(workspace).infra?.find((row) => row.name === "CRM")?.comment || "").trim();
}
function g2s3Applicability(infraName, channelPlatform = "", workspace = state) {
  if (g2c2InfraStatus(infraName, workspace) === "not_needed") return "not_needed";
  if (channelPlatform) {
    const rows = (g2c2Marketing(workspace).channels || [])
      .filter((row) => row.platform === channelPlatform);
    if (rows.length && rows.every((row) => guruCanonStatus(row.status) === "not_needed"))
      return "not_needed";
  }
  return "required";
}
function g2s3AllChannelsNotNeeded(platform, workspace = state) {
  const rows = (g2c2Marketing(workspace).channels || [])
    .filter((row) => row.platform === platform);
  return rows.length > 0 && rows.every((row) => guruCanonStatus(row.status) === "not_needed")
    ? "not_needed" : "required";
}
function g2s3SiteContext() {
  const url = g2s3Gate0Url();
  return { label: "Адрес сайта из Gate 0", value: url || "URL не указан", href: url };
}
function g2s3DomainHttpsDone(workspace = state) {
  return g2wRecord(g2wDef("domain"), "", false, workspace)?.steps?.https?.result === "done";
}
function g2s3DomainHttpsLabel(workspace = state) {
  return g2s3DomainHttpsDone(workspace) ? "Выполнено" : "Не выполнено";
}
g2ServiceBlockRegister({
  id: "company-vk", cardId: "g2-marketing-vk-ads", scope: "company",
  title: "VK", afterUnit: "goal", serviceUrl: "https://vk.ru/",
  // A community can be used independently of the VK Ads account in Gate 0.
  gate0Applicability: () => "required",
  statusResolver: () => "not_started",
  emptyStepScaffold: true,
  steps: [],
});

g2ServiceBlockRegister({
  id: "company-telegram-ads", cardId: "g2-marketing-telegram-ads", scope: "company",
  title: "Telegram Ads · кабинет", afterUnit: "goal", serviceUrl: "https://ads.telegram.org/auth",
  gate0Applicability: ({ workspace }) => g2s3Applicability("Telegram Ads", "Telegram Ads", workspace),
  includeInReadiness: true,
  steps: [
    { step_id: "auth", what: "Войдите по номеру телефона в международном формате и подтвердите вход в Telegram.",
      where: "ads.telegram.org/auth", how: "Кабинет открывается.", source_url: G2S3_DOC.telegram },
    { step_id: "channels", what: "Убедитесь, что есть подходящие тематике публичные каналы: объявления показываются в публичных каналах от 1000 подписчиков, каналы выбираются вручную.",
      where: "Кабинет → список каналов.", how: "Подходящие каналы найдены.", source_url: G2S3_DOC.telegram },
    { step_id: "ad", what: "Создайте тестовое объявление: текст до 160 символов, ссылка на Telegram, список каналов.",
      where: "Кабинет → создание объявления.", how: "Объявление сохраняется.", source_url: G2S3_DOC.telegram },
    { step_id: "payment", what: "Проверьте доступный в вашем кабинете способ пополнения и баланс перед запуском.",
      where: "Telegram Ads → кабинет → «Бюджет» / баланс.", how: "Доступный баланс показан в кабинете.",
      source_url: G2S3_DOC.telegram },
  ],
});

g2ServiceBlockRegister({
  id: "company-meta-ads", cardId: "g2-marketing-meta-ads", scope: "company",
  title: "Meta Ads · кабинет и пиксель", afterUnit: "goal", serviceUrl: "https://business.facebook.com/",
  notice: "Meta Platforms признана экстремистской организацией, деятельность запрещена в РФ (решение суда от 21.03.2022, по справке Tilda).",
  gate0Applicability: ({ workspace }) => g2s3AllChannelsNotNeeded("Meta Ads", workspace),
  notNeededReason: "Не требуется: все каналы отмечены «Не требуется» в Gate 0",
  includeInReadiness: true,
  steps: [
    { step_id: "pixel", what: "Создайте пиксель.",
      where: "Менеджер рекламы Facebook → Events Manager → «Пиксели» → создать, задать название.",
      how: "Пиксель виден в списке.", source_url: G2S3_DOC.meta },
    { step_id: "id", what: "Скопируйте ID пикселя.", where: "Страница «Обзор» (Overview).",
      how: "ID скопирован.", source_url: G2S3_DOC.meta },
    { step_id: "install", what: "Вставьте ID, сохраните и переопубликуйте все страницы.",
      where: "Для Tilda: Настройки сайта → Аналитика → поле Facebook Pixel.",
      how: "ID сохранён, страницы опубликованы.", source_url: G2S3_DOC.meta },
    { step_id: "events", what: "Tilda сама передаёт PageView, Lead, ViewContent, AddToCart, InitiateCheckout. Последние три зависят от настроек блоков Tilda.",
      where: "Events Manager → пиксель.", how: "События поступают.", source_url: G2S3_DOC.meta },
  ],
});

g2ServiceBlockRegister({
  id: "company-ga4", cardId: "g2-marketing-ga4", scope: "company",
  title: "Google Analytics 4", afterUnit: "goal", serviceUrl: "https://analytics.google.com/",
  gate0Applicability: ({ workspace }) => g2s3Applicability("Google Analytics 4", "", workspace),
  notNeededReason: "Gate 0: Не требуется",
  includeInReadiness: true,
  steps: [
    { step_id: "account", what: "Создайте аккаунт.", where: "analytics.google.com",
      how: "Аккаунт открыт.", source_url: G2S3_DOC.ga4 },
    { step_id: "property", what: "Создайте ресурс: название, часовой пояс, валюта, отрасль, размер бизнеса, цели.",
      where: "«Администратор» → создать ресурс.", how: "Ресурс виден.", source_url: G2S3_DOC.ga4 },
    { step_id: "stream", what: "Добавьте веб-поток: URL сайта, название, включите расширенное измерение.",
      where: "«Администратор» → «Потоки данных» → «Добавить поток» → «Веб».",
      how: "Поток создан, виден Measurement ID с префиксом G-.", source_url: G2S3_DOC.ga4,
      context: g2s3SiteContext },
    { step_id: "install", what: "В Tilda вставьте идентификатор потока G- в поле Google Analytics, сохраните и опубликуйте все страницы.",
      where: "Tilda → «Настройки сайта» → «Аналитика» → «Google Analytics» → ID G- → «Сохранить»; список страниц → «Опубликовать все страницы».",
      how: "На опубликованной странице установлен тег с этим Measurement ID.", source_url: G2S3_DOC.ga4Tilda },
    { step_id: "check", what: "Откройте отчёт «Реальное время» и зайдите на сайт.",
      where: "GA4 → «Реальное время».", how: "Визит виден. Данные могут появиться через 30 минут.",
      source_url: G2S3_DOC.ga4, reconciliation: "данные могут появиться через 30 минут." },
  ],
});

g2ServiceBlockRegister({
  id: "company-gsc", cardId: "g2-marketing-gsc", scope: "company",
  title: "Google Search Console", afterUnit: "goal", serviceUrl: "https://search.google.com/search-console/",
  gate0Applicability: ({ workspace }) => g2s3Applicability("Google Search Console", "", workspace),
  includeInReadiness: true,
  steps: [
    { step_id: "add", what: "Добавьте ресурс: URL-префикс или Domain property для всех протоколов и поддоменов.",
      where: "Search Console → добавить ресурс.", how: "Ресурс в списке.",
      source_url: G2S3_DOC.gsc, context: g2s3SiteContext },
    { step_id: "verify", what: "Подтвердите владение: HTML-файл, HTML-тег, Google Analytics, Tag Manager или DNS-запись. Для Domain property используйте DNS. После подтверждения доказательство не удаляйте.",
      where: "Страница подтверждения ресурса.", how: "После «Verify» статус «Подтверждено».",
      source_url: G2S3_DOC.gsc, troubleshooting: "попросите текущего владельца выдать вам доступ.",
      reconciliation: "после подтверждения не удаляйте файл, тег или DNS-запись." },
  ],
});

g2ServiceBlockRegister({
  id: "company-google-ads", cardId: "g2-marketing-google-ads", scope: "company",
  title: "Google Ads · конверсии", afterUnit: "goal", serviceUrl: "https://ads.google.com/",
  gate0Applicability: ({ workspace }) => g2s3AllChannelsNotNeeded("Google Ads", workspace),
  notNeededReason: "Не требуется: все каналы отмечены «Не требуется» в Gate 0",
  includeInReadiness: true,
  steps: [
    { step_id: "source", what: "Выберите источник конверсий сайта: Google tag, Google Analytics или оба.",
      where: "Google Ads → конверсии → «Website».", how: "Источник выбран.", source_url: G2S3_DOC.googleAds },
    { step_id: "action", what: "Создайте действие-конверсию для каждого ценного действия. Primary используется для ставок, Secondary для наблюдения.",
      where: "Google Ads → конверсии.", how: "Действия созданы, Primary выбран осознанно.",
      source_url: G2S3_DOC.googleAds },
    { step_id: "install", what: "Установите Google tag. При Tag Manager проверьте conversion linking tag.",
      where: "Сайт.", how: "Тег на странице.", source_url: G2S3_DOC.googleAds },
    { step_id: "status", what: "Проверьте работу тега. Для нового тега статус может быть «Не проверено» до первой конверсии.",
      where: "Google Tag Assistant и Google Ads → действие-конверсия.", how: "Статус «Активно».",
      source_url: G2S3_DOC.googleAds,
      troubleshooting: "статус «Не проверено» или «Неактивно» нормален для нового тега до первой конверсии. Если статус не «Активно», запустите средство устранения неполадок отслеживания конверсий." },
  ],
});

g2ServiceBlockRegister({
  id: "company-leads", cardId: "card-122", scope: "company", wizardUnitId: "crm",
  title: "Приём заявок", afterUnit: "goal", serviceUrl: "https://tilda.cc/",
  gate0Applicability: ({ workspace }) => g2s3Applicability("CRM", "", workspace),
  statusResolver: () => g2wStatus(g2wDef("crm")),
  steps: [
    { step_id: "system", what: "Определите, куда приходят заявки: раздел «Заявки» Tilda, Email, Telegram, amoCRM или Битрикс24. Сервисы работают только при активной подписке.",
      where: "Tilda: Настройки сайта → нужный сервис.", how: "Способ выбран.", source_url: G2S3_DOC.forms,
      context: () => ({ label: "CRM из Gate 0", value: g2s3CrmName() || "Не указана в Gate 0" }) },
    { step_id: "connect", what: "Подключите сервис и привяжите его к форме.",
      where: "Настройки сайта → сервис → заполнить поля → активировать. Затем на странице: настройки блока формы → отметить сервис → сохранить.",
      how: "Сервис отмечен в блоке формы.", source_url: G2S3_DOC.forms },
    { step_id: "fields", what: "Проверьте передачу имени, контакта, источника и страницы обращения.",
      where: "Tilda → ваш сайт → «Заявки» → открыть тестовую заявку; затем открыть её в подключённом сервисе.",
      how: "Контактные поля и страница отправки совпадают в заявке и сервисе.", source_url: G2S3_DOC.formSettings },
    { step_id: "utm", what: "Проверьте UTM и привязку к продукту, если данные доступны.",
      where: "Tilda → ваш сайт → «Заявки» → открыть тестовую заявку с UTM-ссылки; затем открыть её в подключённом сервисе.",
      how: "В заявке есть ожидаемые UTM и идентификатор продукта, если они передаются формой.",
      source_url: G2S3_DOC.formSettings },
    { step_id: "send", what: "Опубликуйте страницу и отправьте тестовую заявку.",
      where: "Сайт.", how: "Отправлено.", source_url: G2S3_DOC.forms,
      context: g2s3SiteContext },
    { step_id: "receive", what: "Убедитесь, что заявка пришла в сервис и есть в разделе «Заявки».",
      where: "Tilda → ваш сайт → «Заявки»; затем открыть подключённый сервис.",
      how: "Тестовая заявка есть в обоих местах.", source_url: G2S3_DOC.leads },
    { step_id: "storage", what: "Проверьте срок хранения заявок. По умолчанию один месяц.",
      where: "Настройки сайта → Формы → Общие настройки форм (1, 7, 60, 90 дней или не хранить).",
      how: "Срок выбран осознанно.", source_url: G2S3_DOC.leads },
  ],
});

g2ServiceBlockRegister({
  id: "company-safety", cardId: "card-134", scope: "company", wizardUnitId: "safety",
  title: "Юридическая защита", afterUnit: "goal",
  serviceUrl: () => g2s3PrivacyUrl(), serviceLabel: "Открыть политику",
  serviceUnavailableLabel: "URL политики не указан",
  statusResolver: () => g2wStatus(g2wDef("safety")),
  steps: g2wDef("safety").steps.map(([id, what]) => ({
    step_id: id, what,
    where: ({ step }) => ({ https: "Блок «Домен и HTTPS» → шаг «HTTPS».",
      policy: "Gate 0 → Платформа → URL политики.", consent: "Формы на сайте.",
      spam: "Формы на сайте.", test: "Тестовая заявка на сайте." })[step.step_id],
    how: ({ step }) => ({ https: "Статус шага HTTPS в блоке «Домен и HTTPS».",
      policy: "Политика опубликована и открывается.", consent: "Согласия видны и работают.",
      spam: "Защита формы работает.", test: "Заявка получена." })[step.step_id],
    source_url: ({ step }) => ({ https: G2S3_DOC.tildaHttps,
      policy: G2S3_DOC.formSettings, consent: G2S3_DOC.formSettings,
      spam: G2S3_DOC.formErrors, test: G2S3_DOC.leads })[step.step_id],
    resultType: id === "https" ? "reference" : "checkbox",
    doneResolver: id === "https" ? ({ workspace }) => g2s3DomainHttpsDone(workspace) : undefined,
    context: id === "https" ? () => ({ label: "HTTPS в блоке «Домен и HTTPS»",
      value: g2s3DomainHttpsLabel(), href: "#g2sb-company-domain-company" })
      : id === "policy" ? () => ({ label: "URL политики из Gate 0",
        value: g2s3PrivacyUrl() || "URL политики не указан", href: g2s3PrivacyUrl() }) : undefined,
  })),
});

const g2s3PreviousWizardCardHtml = g2wCardHtml;
g2wCardHtml = function (def, productId = "") {
  if (def?.scope === "company" && ["vk", "crm", "safety"].includes(def.id)) return "";
  return g2s3PreviousWizardCardHtml.apply(this, arguments);
};

const g2s3PreviousApplicability = g2wApplicability;
g2wApplicability = function (def, productId = "", workspace = state) {
  if (def?.scope === "company" && def.id === "vk")
    return g2s3Applicability("VK Ads", "VK Ads", workspace);
  if (def?.scope === "company" && def.id === "crm")
    return g2s3Applicability("CRM", "", workspace);
  return g2s3PreviousApplicability.apply(this, arguments);
};

const g2s3PreviousFieldValid = g2wFieldValid;
g2wFieldValid = function (def, productId, key, workspace = state) {
  if (def?.id === "crm" && key === "crmName") return Boolean(g2s3CrmName(workspace));
  return g2s3PreviousFieldValid.apply(this, arguments);
};

const g2s3PreviousInputs = g2wInputs;
g2wInputs = function (def, productId = "", workspace = state) {
  const inputs = g2s3PreviousInputs.apply(this, arguments);
  if (def?.id === "vk") {
    const steps = g2wRecord(def, productId, false, workspace)?.steps || {};
    const search = String(steps.existing?.params?.value || "").trim();
    const report = String(steps.visit?.params?.value || "").trim();
    return JSON.stringify([inputs, search, report]);
  }
  if (def?.id === "crm") return JSON.stringify([inputs, g2s3CrmName(workspace)]);
  if (def?.id === "safety") return JSON.stringify([inputs, g2s3DomainHttpsDone(workspace)]);
  return inputs;
};

const g2s3PreviousCanConfirm = g2wCanConfirm;
function g2s3VkDataEvidence(workspace = state) {
  const steps = g2wRecord(g2wDef("vk"), "", false, workspace)?.steps || {};
  return ["existing", "visit"].every((id) =>
    steps[id]?.result === "done" && Boolean(String(steps[id].params?.value || "").trim()));
}
g2wCanConfirm = function (def, productId = "", workspace = state) {
  if (def?.id === "vk" && !g2s3VkDataEvidence(workspace)) return false;
  if (def?.id !== "safety") return g2s3PreviousCanConfirm.apply(this, arguments);
  const withoutHttps = { ...def, steps: def.steps.filter((step) => step[0] !== "https") };
  return g2s3DomainHttpsDone(workspace) && g2s3PreviousCanConfirm(withoutHttps, productId, workspace);
};

const g2s3PreviousStatus = g2wStatus;
g2wStatus = function (def, productId = "", workspace = state) {
  if (def?.id === "vk") {
    const status = g2s3PreviousStatus.apply(this, arguments);
    return status === "ready" && !g2s3VkDataEvidence(workspace) ? "in_progress" : status;
  }
  if (def?.id !== "safety") return g2s3PreviousStatus.apply(this, arguments);
  const withoutHttps = { ...def, steps: def.steps.filter((step) => step[0] !== "https") };
  const status = g2s3PreviousStatus(withoutHttps, productId, workspace);
  if (status === "ready" && !g2s3DomainHttpsDone(workspace)) return "in_progress";
  if (status === "not_started" && g2s3DomainHttpsDone(workspace)) return "in_progress";
  return status;
};

const g2s3PreviousProgress = g2wProgress;
g2wProgress = function (def, productId = "") {
  if (def?.id !== "safety") return g2s3PreviousProgress.apply(this, arguments);
  const record = g2wRecord(def, productId);
  const done = def.steps.filter((step) => step[0] === "https"
    ? g2s3DomainHttpsDone() : record?.steps?.[step[0]]?.result === "done").length;
  return `${done} из ${def.steps.length} шагов`;
};

const g2s3PreviousRefresh = g2wRefresh;
g2wRefresh = function () {
  const result = g2s3PreviousRefresh.apply(this, arguments);
  const link = document.querySelector('[data-g2sb-id="company-safety"] [data-g2sb-step-id="https"] .g2sb-context a');
  if (link) link.textContent = g2s3DomainHttpsLabel();
  return result;
};
