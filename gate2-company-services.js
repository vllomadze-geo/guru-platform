/* Gate 2 company service configs. The existing wizard records stay canonical. */
const G2C2_TILDA_DOMAIN = "https://help-ru.tilda.cc/customdomain";
const G2C2_TILDA_HTTPS = "https://tilda.cc/ru/answers/a/https/";
const G2C2_BUSINESS_HELP = "https://yandex.ru/support/business-priority/ru/";
const G2C2_BUSINESS_RIGHTS = "https://www.yandex.ru/support/business-priority/ru/manage/verify";
const G2C2_BUSINESS_SITE = "https://www.yandex.ru/support/business-priority/ru/manage/contacts";
const G2C2_DIRECT_METRIKA = "https://yandex.ru/support/direct/statistics/metrika.html";
const G2C2_DIRECT_PAYMENT = "https://yandex.ru/support/direct/ru/payments/payment-methods";

function g2c2Marketing(workspace = state) {
  return workspace?.gates?.find((gate) => gate.id === "gate-0")?.cards
    ?.find(isMegaMarketingCard)?.megaMarketing || {};
}
function g2c2InfraStatus(name, workspace = state) {
  return guruCanonStatus(g2c2Marketing(workspace).infra?.find((row) => row.name === name)?.status);
}
function g2c2Applicability(kind, workspace = state) {
  const marketing = g2c2Marketing(workspace);
  if (kind === "domain") {
    const home = marketing.platformV2?.fundamental?.find((row) => row.name === "Главная страница");
    return guruCanonStatus(home?.status) === "not_needed" ? "not_needed" : "required";
  }
  if (kind === "webmaster" || kind === "direct") {
    const name = kind === "webmaster" ? "Яндекс Вебмастер" : "Яндекс Директ";
    if (g2c2InfraStatus(name, workspace) === "not_needed") return "not_needed";
    if (kind === "webmaster" && guruCanonStatus((marketing.channels || []).find((row) =>
      row.platform === "SEO" && row.type === "Страницы сайта")?.status) === "not_needed")
      return "not_needed";
    if (kind === "direct") {
      const rows = (marketing.channels || []).filter((row) => row.platform === "Яндекс Директ");
      if (rows.length && rows.every((row) => guruCanonStatus(row.status) === "not_needed")) return "not_needed";
    }
    return "required";
  }
  const maps = (marketing.channels || []).find((row) =>
    row.platform === "Яндекс Карты" && row.type === "Карточка организации");
  return guruCanonStatus(maps?.status) === "not_needed" ? "not_needed" : "required";
}
function g2c2Website(workspace = state) {
  return g2wCompanyValue("homeUrl", workspace) || "";
}
function g2c2DomainWebsite(workspace = state) {
  return megaPlatformUrl("fixed", "home", workspace) || "";
}
function g2c2MetrikaContext() {
  return [
    { label: "Счётчик Метрики", value: g2wStatus(g2wDef("counter")) === "ready" ? "Готово" : "Требует проверки",
      href: "#g2-metrika-company-counter" },
    { label: "Конверсионная цель", value: g2wStatus(g2wDef("goal")) === "ready" ? "Готово" : "Требует проверки",
      href: "#g2-metrika-company-goals" },
  ];
}
function g2c2DomainStep(id, details) {
  const old = g2wDef("domain").steps.find((step) => step[0] === id);
  return { step_id: id,
    what: () => g2wPlatform() === "tilda" ? details.what : old[1],
    where: () => g2wPlatform() === "tilda" ? details.where : g2wPlatformHint()[0],
    how: () => g2wPlatform() === "tilda" ? details.how : details.otherHow,
    source_url: () => g2wPlatform() === "tilda" ? details.help || "" : "",
    helpUnconfirmed: id === "redirect",
    existingFields: details.existingFields ?? (old[2] && id !== "address" ? [old[2]] : []),
    fieldLabels: details.fieldLabels, resultColumn: details.resultColumn,
    troubleshooting: details.troubleshooting, reconciliation: details.reconciliation,
    autoCheck: () => id === "open" && Boolean(g2c2DomainWebsite()) };
}

g2ServiceBlockRegister({
  id: "company-domain", cardId: "card-96", scope: "company", wizardUnitId: "domain",
  layout: "unified",
  stepGroups: [
    { title: "Адрес и платформа", steps: ["address", "platform", "provider"] },
    { title: "DNS и доступность", steps: ["dns_source", "dns_set", "open"] },
    { title: "Защита и переадресация", steps: ["https", "redirect"] },
  ],
  title: "Домен и HTTPS", beforeUnit: "counter",
  serviceUrl: () => g2c2DomainWebsite(), serviceLabel: "Открыть сайт",
  serviceUnavailableLabel: "URL не указан",
  gate0Applicability: ({ workspace }) => g2c2Applicability("domain", workspace),
  statusResolver: () => g2wStatus(g2wDef("domain")),
  steps: [
    { step_id: "address", what: "Укажите основной адрес сайта.", where: "Gate 0 → Платформа",
      how: "Адрес открывается.", source_url: "", context: () =>
        ({ label: "Адрес сайта из Gate 0", value: g2c2DomainWebsite() || "URL не указан",
          href: g2c2DomainWebsite() }) },
    { step_id: "platform", what: "Выберите платформу сайта.", where: "Выберите платформу в списке справа.",
      how: "Выбранная платформа соответствует сайту.", source_url: "", existingFields: ["platform"] },
    { step_id: "provider", what: "Укажите регистратора домена и провайдера размещения.",
      where: "Заполните поля справа.", how: "Регистратор указан верно.", source_url: "",
      existingFields: ["registrar", "hosting"] },
    g2c2DomainStep("dns_source", { what: "Получите IP для A-записи.",
      where: "Tilda: Настройки сайта → Домен → ввести домен → Сохранить. IP в блоке «Результаты проверки».",
      how: "IP показан.", otherHow: "DNS-записи получены у провайдера.", help: G2C2_TILDA_DOMAIN,
      existingFields: ["dnsRecord"], fieldLabels: {
        dnsRecord: () => g2wPlatform() === "tilda" ? "IP для A-записи (из Tilda)" : "Запись от провайдера",
      } }),
    g2c2DomainStep("dns_set", { what: "Добавьте у регистратора A-запись основного домена с этим IP. Удалите другие A-записи основного домена (допускается одна). Не используйте записи со звёздочкой в начале имени.",
      where: "Панель регистратора → управление DNS-зоной.",
      how: "Через 3-24 часа нажмите «Проверить» в Настройки сайта → Домен: в «Результатах проверки» успех.",
      otherHow: "DNS-записи совпадают с инструкцией провайдера.", help: G2C2_TILDA_DOMAIN,
      troubleshooting: "Для домена допускается только одна A-запись, удалите лишние. Не используйте записи со звёздочкой в начале имени. Проверка может занять 3-24 часа.",
      existingFields: [], resultColumn: "right" }),
    g2c2DomainStep("open", { what: "Откройте основной адрес в браузере.", where: "Адресная строка браузера.",
      how: "Сайт открывается.", otherHow: "Сайт открывается по основному адресу." }),
    g2c2DomainStep("https", { what: "Запросите сертификат.",
      where: "Tilda: Настройки сайта → SEO → Настройка HTTPS → нажмите «выключено». Если домен не куплен в Tilda, сначала подождите 24 часа после добавления A-записей.",
      how: "Через 5-30 минут статус «Защищенный протокол для сайта подключен».",
      otherHow: "Основной адрес открывается по HTTPS.", help: G2C2_TILDA_HTTPS,
      troubleshooting: "проверьте A-записи и подождите 24 часа после их добавления. Для домена, купленного в Tilda, ждать не нужно." }),
    g2c2DomainStep("redirect", { what: "Откройте адрес с www и адрес с http: оба должны вести на основной https-адрес.",
      where: "Адресная строка браузера.", how: "Конечный адрес в браузере совпадает с основным.",
      otherHow: "Перенаправления ведут на основной адрес." }),
  ],
});

g2ServiceBlockRegister({
  id: "company-webmaster", cardId: "card-107", scope: "company", wizardUnitId: "webmaster",
  title: "Яндекс Вебмастер", afterUnit: "goal", serviceUrl: "https://webmaster.yandex.ru/",
  emptyStepScaffold: true,
  gate0Applicability: ({ workspace }) => g2c2Applicability("webmaster", workspace),
  statusResolver: () => g2wStatus(g2wDef("webmaster")),
  steps: [],
});

g2ServiceBlockRegister({
  id: "company-yandex-business", scope: "company", title: "Яндекс Бизнес",
  afterUnit: "goal", serviceUrl: "https://business.yandex.ru/",
  gate0Applicability: ({ workspace }) => g2c2Applicability("business", workspace),
  includeInReadiness: true,
  steps: [
    { step_id: "add", what: "Найдите свою организацию в Яндекс Картах. Если нет, добавьте (бесплатно).",
      where: "Справка Яндекс Бизнеса → «Добавить компанию в Яндекс».",
      how: "Организация находится поиском по названию и городу.", source_url: G2C2_BUSINESS_HELP },
    { step_id: "rights", what: "Подтвердите права на карточку кодом из звонка или СМС.",
      where: "Яндекс Бизнес → «Организации» → найти компанию → «Получить доступ» → выбрать телефон → получить и ввести код.",
      how: "Компания доступна для редактирования с ролью «Владелец» или «Представитель».",
      source_url: G2C2_BUSINESS_RIGHTS },
    { step_id: "info", what: "Заполните сферу деятельности, услуги и товары, фотографии.",
      where: "Справка → «Заполнить информацию о компании».",
      how: "Данные в карточке соответствуют Gate 0.", source_url: G2C2_BUSINESS_HELP },
    { step_id: "site", what: "Проверьте, что в карточке указан адрес сайта из «Платформы».",
      where: "Яндекс Бизнес → «Организации» → выбрать компанию → «О компании» → «Данные» → «Сайт и социальные сети».",
      how: "Опубликованная ссылка ведёт на основной адрес сайта из Gate 0.", source_url: G2C2_BUSINESS_SITE,
      context: () => ({ label: "Адрес сайта из Gate 0", value: g2c2Website(), href: g2c2Website() || "" }) },
    { step_id: "reviews", what: "Откройте отзывы и ответьте на них.",
      where: "Справка → «Отзывы и рейтинг» → «Ответить на отзыв».",
      how: "Нет неотвеченных отзывов.", source_url: G2C2_BUSINESS_HELP },
  ],
});

g2ServiceBlockRegister({
  id: "company-yandex-direct", scope: "company", title: "Яндекс Директ · кабинет",
  afterUnit: "goal", serviceUrl: "https://direct.yandex.ru/",
  gate0Applicability: ({ workspace }) => g2c2Applicability("direct", workspace),
  includeInReadiness: true,
  steps: [
    { step_id: "account", what: "Войдите в Директ под рабочим Яндекс ID.",
      where: "direct.yandex.ru → «Войти» → выбрать рабочий Яндекс ID.",
      how: "В кабинете видны нужные кампании и профиль рекламодателя.", source_url: G2C2_DIRECT_METRIKA },
    { step_id: "counter", what: "Убедитесь, что счётчик и цели созданы в блоке «Яндекс Метрика · Компания» этого же Gate 2.",
      where: "Gate 2 → Яндекс Метрика.", how: "Статус счётчика и цели из Метрики.",
      source_url: G2C2_DIRECT_METRIKA, context: g2c2MetrikaContext },
    { step_id: "link", what: "В параметрах кампании заполните поле «Счётчики Метрики». Для многих кампаний укажите номер в поле «Счётчик Метрики для новых кампаний» в настройках пользователя.",
      where: "Директ → параметры кампании.", how: "Номер счётчика совпадает с Метрикой.",
      source_url: G2C2_DIRECT_METRIKA,
      context: () => ({ label: "Номер счётчика из Метрики", value: g2wCompanyValue("counterId") }) },
    { step_id: "access", what: "Если счётчика нет в списке, нажмите «Запросить доступ». Чтобы агентству не открывать весь счётчик, в Метрике на странице «Цели» включите «Разрешить в кампаниях оптимизацию по целям без доступа к счетчику».",
      where: "Метрика → Цели; Директ → «Запросить доступ».",
      how: "Нужный счётчик выбирается в кампании.", source_url: G2C2_DIRECT_METRIKA,
      troubleshooting: "без доступа к счётчику ретаргетинг и подбор аудитории по этим целям настроить нельзя." },
    { step_id: "yclid", what: "Проверьте, что сайт не теряет метку yclid, в том числе при редиректах.",
      where: "Откройте посадочную с добавленным ?yclid=test.",
      how: "Метка сохраняется в конечном адресе.", source_url: G2C2_DIRECT_METRIKA,
      troubleshooting: "при редиректах метка должна передаваться в конечный URL.",
      context: () => ({ label: "Посадочная из Gate 0", value: g2c2Website(), href: g2c2Website() || "" }) },
    { step_id: "payment", what: "Проверьте оплату и баланс.",
      where: "Яндекс Директ → общий счёт / баланс → «Пополнить» → выбрать способ оплаты.",
      how: "Сумма зачислена и показана на балансе кабинета.", source_url: G2C2_DIRECT_PAYMENT },
  ],
});

const g2c2PreviousWizardCardHtml = g2wCardHtml;
g2wCardHtml = function (def, productId = "") {
  if (def?.scope === "company" && ["domain", "webmaster"].includes(def.id)) return "";
  return g2c2PreviousWizardCardHtml.apply(this, arguments);
};

const g2c2PreviousApplicability = g2wApplicability;
g2wApplicability = function (def, productId = "", workspace = state) {
  if (def?.id === "webmaster") return g2c2Applicability("webmaster", workspace);
  return g2c2PreviousApplicability.apply(this, arguments);
};

const g2c2PreviousBlockStatuses = guruGateBlockStatuses;
guruGateBlockStatuses = function (gate) {
  const result = g2c2PreviousBlockStatuses.apply(this, arguments);
  if (gate?.id !== "gate-2") return result;
  return [...result, ...[...G2_SERVICE_BLOCK_CONFIGS.values()].filter((config) => config.includeInReadiness)
    .map((config) => g2ServiceBlockStatus(config))];
};

const g2c2PreviousExportRuntime = guruExportRuntimeModelV223;
guruExportRuntimeModelV223 = function (gateId) {
  const model = g2c2PreviousExportRuntime.apply(this, arguments);
  if (gateId !== "gate-2") return model;
  const units = [...model.units, ...[...G2_SERVICE_BLOCK_CONFIGS.values()]
    .filter((config) => config.includeInReadiness)
    .map((baseConfig) => {
      const config = typeof g2StepServiceConfig === "function" ? g2StepServiceConfig(baseConfig) : baseConfig;
      return guruExportModelUnitV223({
      unitId: `g2sb-${config.id}`, gateId, title: config.title,
      status: g2ServiceBlockStatus(config), sourceType: "gate2_service_block",
      path: `state.gates[gate-2].cards[${g2ServiceBlockCardId(config)}].fields.g2SetupWizardV1.company`,
      includedInGateReadiness: true, includedInDisplayedOverall: true,
      readinessRole: "direct", details: {
        scope: config.scope, sourceCardId: g2ServiceBlockCardId(config),
        progress: config.steps.filter((step) =>
          g2ServiceBlockRecord(config)?.steps?.[step.step_id]?.result === "done").length,
        total: config.steps.length,
      },
    }); })];
  return { ...model, units,
    displayedStatus: guruExportDiagnosticOverallV223(units.map((unit) => unit.status)) };
};

g2wUpdateNav = function () {
  if (activeGateId !== "gate-2") return;
  const label = els.gateNav?.querySelector('[data-gate-id="gate-2"] .small');
  if (!label) return;
  const readiness = guruReadinessFromStatuses(guruGateBlockStatuses(g2wGate()));
  label.textContent = `${readiness.total} блоков, прогресс ${readiness.percent}%`;
};

const g2c2PreviousMount = g2ServiceBlockMountRegistered;
g2ServiceBlockMountRegistered = function () {
  const result = g2c2PreviousMount.apply(this, arguments);
  g2wUpdateNav();
  return result;
};
