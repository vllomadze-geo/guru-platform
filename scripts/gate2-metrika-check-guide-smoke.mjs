import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../gate2-metrika-unified.js', import.meta.url), 'utf8');
const start = source.indexOf('function g2muPublishedSiteUrl()');
const end = source.indexOf('\nfunction g2muStepHtml(', start);
assert(start >= 0 && end > start);
const context = vm.createContext({
  URL,
  state: { project: { website: '', catalogItemsV189: [] } },
  siteUrl: '',
  counterId: '',
  counter: {},
  goals: [],
  platform: 'tilda',
  filter: {},
  G2MU_DOC: {
    check: 'https://yandex.ru/support/metrica/ru/general/check-counter',
    filters: 'https://yandex.ru/support/metrica/ru/general/filters',
    popular: 'https://yandex.ru/support/metrica/ru/content/popular',
    processing: 'https://yandex.ru/support/metrica/ru/general/how-it-works',
    robots: 'https://yandex.ru/support/metrica/ru/general/robots',
    robotReport: 'https://yandex.ru/support/metrica/ru/reports/robots',
    access: 'https://yandex.ru/support/metrica/ru/general/access',
    transfer: 'https://yandex.ru/support/metrica/ru/troubleshooting/move-counter-gen',
    ecommerceTilda: 'https://yandex.ru/support/metrica/ru/ecommerce/tilda',
    ecommerce: 'https://yandex.ru/support/metrica/ru/data/e-commerce.html',
    ecommerceAutoGoals: 'https://yandex.ru/support/metrica/ru/general/e-commerce-autogoals',
    ecommerceCheck: 'https://yandex.ru/support/metrica/ru/ecommerce/check',
    ecommerceOrders: 'https://yandex.ru/support/metrica/ru/reports/content-orders',
    tildaLeads: 'https://help-ru.tilda.cc/leads',
  },
  megaPlatformUrl: (_group, _id, workspace) => workspace.siteUrl,
  megaPlatformProductUrl: (_id, workspace) => workspace.productUrl,
  g2MetrikaCompanyCounterV374: () => context.counterId,
  g2MetrikaCompanyGoalsV374: () => context.goals,
  g2wPlatform: () => context.platform,
  g2MetrikaCompanyDataV374: kind => kind === 'filter' ? context.filter : kind === 'counter' ? context.counter : {},
  escapeHtml: value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'),
  escapeAttr: value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;').replaceAll('>', '&gt;'),
});
vm.runInContext(source.slice(start, end), context);
const render = (url, id) => {
  context.state.siteUrl = url;
  context.counterId = id;
  return vm.runInContext('g2muCheckGuideHtml()', context);
};

const apple = render('https://k-apple.ru/', '105213127');
assert(apple.includes('href="https://k-apple.ru/?_ym_debug=2"'));
assert(apple.includes('счётчик для <code>k-apple.ru</code>'));
assert(apple.includes('счётчик <code>105213127</code>'));
assert(apple.includes('Часть А. Проверить наличие счётчика'));
assert(apple.includes('Часть Б. Проверить отправку PageView'));
assert(apple.includes('Часть В. Проверить получение данных'));
assert(apple.includes('Не учитывать мои визиты'));
assert(apple.includes('не доказывают, что зарегистрирован именно ваш тестовый визит'));
const wholeGuide = vm.runInContext(`g2muGuideHtml({ id: 's14', compare: ['Сверьте ID'], doc: 'check' }, 'tilda')`, context);
assert(wholeGuide.includes('Где нажать / Как проверить'));
assert(wholeGuide.includes('Часть А. Проверить наличие счётчика'));
assert(wholeGuide.includes('Сверка'));
assert(wholeGuide.includes('Официальная справка'));

const other = render('https://shop.example.org/catalog?campaign=a&source=b', '123456789');
assert(other.includes('счётчик для <code>shop.example.org</code>'));
assert(other.includes('href="https://shop.example.org/catalog?campaign=a&amp;source=b&amp;_ym_debug=2"'));
assert(other.includes('счётчик <code>123456789</code>'));
assert(!other.includes('k-apple.ru'));
assert(!other.includes('105213127'));

const missing = render('', '');
assert(missing.includes('укажите опубликованный адрес сайта в Gate 0'));
assert(missing.includes('сохраните ID счётчика в пункте 1.2'));
assert(!missing.includes('href="https:///?_ym_debug=2"'));
context.state.project.website = 'https://fallback.example/';
const fallback = render('', '7654321');
assert(fallback.includes('href="https://fallback.example/?_ym_debug=2"'));
context.state.project.website = '';

const escaped = render('https://example.org/?q=<script>alert(1)</script>', '<img src=x>');
assert(!escaped.includes('<script>'));
assert(!escaped.includes('<img src=x>'));
assert(!escaped.includes('счётчик <code><img'));

const exactOrder = readFileSync(new URL('../gate2-metrika-order-3.1.1.md', import.meta.url), 'utf8');
vm.runInContext(readFileSync(new URL('../gate2-metrika-order-copy.js', import.meta.url), 'utf8'), context);
assert.equal(vm.runInContext('G2MU_ORDER_MARKDOWN', context), exactOrder);
const order = vm.runInContext('g2muOrderMarkdownHtml()', context);
assert(order.includes('<h3>3.1.1. Оформленный заказ</h3>'));
assert(order.includes('<h4>1. Что сделать (инструкция)</h4>'));
assert(order.includes('<h4>2. Где нажать / Как проверить (инструкция)</h4>'));
assert(order.includes('<h4>3. Сверка (инструкция)</h4>'));
assert(order.includes('<h5>А. Проверить существующую цель в Яндекс Метрике</h5>'));
assert(order.includes('<h5>М. Подготовить цель для Яндекс Директа</h5>'));
assert(order.includes('<table><thead>'));
assert(order.includes('<ol start="12">'));
assert(order.includes('<li>Mac: <code>Command + Shift + N</code>.</li>'));
assert(order.includes('https://example.ru/product?_ym_debug=2'));
assert(!order.includes('Сохранённые цели и связи с другими разделами'));
const fullOrder = vm.runInContext(`g2muGuideHtml({ id: 's311' }, 'tilda')`, context);
assert(fullOrder.includes(order));
context.platform = 'wordpress';
context.state.siteUrl = 'https://new.example.net/';
context.counterId = '456';
assert.equal(vm.runInContext('g2muOrderMarkdownHtml()', context), order);
assert.equal(vm.runInContext(`g2muGuideHtml({ id: 's311' }, 'wordpress')`, context), fullOrder);
const exactLead = readFileSync(new URL('../gate2-metrika-lead-3.1.2.md', import.meta.url), 'utf8');
vm.runInContext(readFileSync(new URL('../gate2-metrika-lead-copy.js', import.meta.url), 'utf8'), context);
assert.equal(vm.runInContext('G2MU_LEAD_MARKDOWN', context), exactLead);
const lead = vm.runInContext('g2muLeadMarkdownHtml()', context);
assert(lead.includes('<h3>3.1.2. Полученная заявка</h3>'));
assert(lead.includes('<h4>1. Что сделать (инструкция)</h4>'));
assert(lead.includes('<h4>2. Где нажать / Как проверить (инструкция)</h4>'));
assert(lead.includes('<h4>3. Сверка (инструкция)</h4>'));
assert(lead.includes('<h5>О. Подготовить цель для Яндекс Директа</h5>'));
assert(lead.includes('<code>/tilda/form2305306971/submitted</code>'));
assert(lead.includes('<p>Например: «Полученная заявка · Форма консультации».</p>'));
assert.equal((lead.match(/<table>/g) || []).length, 3);
assert(!lead.includes('Сохранённые проверки и связанные настройки'));
const fullLead = vm.runInContext(`g2muGuideHtml({ id: 's312' }, 'tilda')`, context);
assert(fullLead.includes(lead));
context.platform = 'wordpress';
context.state.siteUrl = 'https://another.example/';
assert.equal(vm.runInContext('g2muLeadMarkdownHtml()', context), lead);
assert.equal(vm.runInContext(`g2muGuideHtml({ id: 's312' }, 'wordpress')`, context), fullLead);
const exactPayment = readFileSync(new URL('../gate2-metrika-payment-3.1.3.md', import.meta.url), 'utf8');
vm.runInContext(readFileSync(new URL('../gate2-metrika-payment-copy.js', import.meta.url), 'utf8'), context);
assert.equal(vm.runInContext('G2MU_PAYMENT_MARKDOWN', context), exactPayment);
const payment = vm.runInContext('g2muPaymentMarkdownHtml()', context);
assert(payment.includes('<h3>3.1.3. Подтверждённая оплата</h3>'));
assert(payment.includes('<h4>1. Что сделать (инструкция)</h4>'));
assert(payment.includes('<h4>2. Где нажать / Как проверить (инструкция)</h4>'));
assert(payment.includes('<h4>3. Сверка (инструкция)</h4>'));
assert(payment.includes('<h5>Л. Подготовить цель для Яндекс Директа</h5>'));
assert(payment.includes('<code>payment_confirmed</code>'));
assert.equal((payment.match(/<table>/g) || []).length, 3);
assert(!payment.includes('Сохранённые проверки и связанные настройки'));
const fullPayment = vm.runInContext(`g2muGuideHtml({ id: 's313' }, 'tilda')`, context);
assert(fullPayment.includes(payment));
context.platform = 'wordpress';
context.state.siteUrl = 'https://another.example/';
assert.equal(vm.runInContext('g2muPaymentMarkdownHtml()', context), payment);
assert.equal(vm.runInContext(`g2muGuideHtml({ id: 's313' }, 'wordpress')`, context), fullPayment);
const exactCall = readFileSync(new URL('../gate2-metrika-call-3.1.4.md', import.meta.url), 'utf8');
vm.runInContext(readFileSync(new URL('../gate2-metrika-call-copy.js', import.meta.url), 'utf8'), context);
assert.equal(vm.runInContext('G2MU_CALL_MARKDOWN', context), exactCall);
const call = vm.runInContext('g2muCallMarkdownHtml()', context);
assert(call.includes('<h3>3.1.4. Состоявшийся целевой звонок</h3>'));
assert(call.includes('<h4>1. Что сделать (инструкция)</h4>'));
assert(call.includes('<h4>2. Где нажать / Как проверить (инструкция)</h4>'));
assert(call.includes('<h4>3. Сверка (инструкция)</h4>'));
assert(call.includes('<h5>К. Особый вариант: бесплатный коллтрекинг Яндекс Директа</h5>'));
assert(call.includes('более 30 секунд'));
assert.equal((call.match(/<table>/g) || []).length, 3);
assert(!call.includes('Сохранённые проверки и связанные настройки'));
const fullCall = vm.runInContext(`g2muGuideHtml({ id: 's314' }, 'tilda')`, context);
assert(fullCall.includes(call));
context.platform = 'wordpress';
context.state.siteUrl = 'https://another.example/';
assert.equal(vm.runInContext('g2muCallMarkdownHtml()', context), call);
assert.equal(vm.runInContext(`g2muGuideHtml({ id: 's314' }, 'wordpress')`, context), fullCall);
const exactBooking = readFileSync(new URL('../gate2-metrika-booking-3.1.5.md', import.meta.url), 'utf8');
vm.runInContext(readFileSync(new URL('../gate2-metrika-booking-copy.js', import.meta.url), 'utf8'), context);
assert.equal(vm.runInContext('G2MU_BOOKING_MARKDOWN', context), exactBooking);
const booking = vm.runInContext('g2muBookingMarkdownHtml()', context);
assert(booking.includes('<h3>3.1.5. Подтверждённая запись</h3>'));
assert(booking.includes('<h4>1. Что сделать (инструкция)</h4>'));
assert(booking.includes('<h4>2. Где нажать / Как проверить (инструкция)</h4>'));
assert(booking.includes('<h4>3. Сверка (инструкция)</h4>'));
assert(booking.includes('<h5>Л. Проверить офлайн-конверсию</h5>'));
assert(booking.includes('<code>booking_confirmed</code>'));
assert.equal((booking.match(/<table>/g) || []).length, 4);
assert(!booking.includes('Сохранённые проверки и связанные настройки'));
const fullBooking = vm.runInContext(`g2muGuideHtml({ id: 's315' }, 'tilda')`, context);
assert(fullBooking.includes(booking));
context.platform = 'wordpress';
context.state.siteUrl = 'https://another.example/';
assert.equal(vm.runInContext('g2muBookingMarkdownHtml()', context), booking);
assert.equal(vm.runInContext(`g2muGuideHtml({ id: 's315' }, 'wordpress')`, context), fullBooking);
const exactRegistration = readFileSync(new URL('../gate2-metrika-registration-3.1.6.md', import.meta.url), 'utf8');
vm.runInContext(readFileSync(new URL('../gate2-metrika-registration-copy.js', import.meta.url), 'utf8'), context);
assert.equal(vm.runInContext('G2MU_REGISTRATION_MARKDOWN', context), exactRegistration);
const registration = vm.runInContext('g2muRegistrationMarkdownHtml()', context);
assert(registration.includes('<h3>3.1.6. Успешная регистрация</h3>'));
assert(registration.includes('<h4>1. Что сделать (инструкция)</h4>'));
assert(registration.includes('<h4>2. Где нажать / Как проверить (инструкция)</h4>'));
assert(registration.includes('<h4>3. Сверка (инструкция)</h4>'));
assert(registration.includes('<h5>Н. Подготовить цель для Яндекс Директа</h5>'));
assert(registration.includes('<code>ym-register</code>'));
assert.equal((registration.match(/<table>/g) || []).length, 2);
assert(!registration.includes('Сохранённые проверки и связанные настройки'));
const fullRegistration = vm.runInContext(`g2muGuideHtml({ id: 's316' }, 'tilda')`, context);
assert(fullRegistration.includes(registration));
context.platform = 'wordpress';
context.state.siteUrl = 'https://another.example/';
assert.equal(vm.runInContext('g2muRegistrationMarkdownHtml()', context), registration);
assert.equal(vm.runInContext(`g2muGuideHtml({ id: 's316' }, 'wordpress')`, context), fullRegistration);
const exactPopupLead = readFileSync(new URL('../gate2-metrika-popup-lead-3.1.7.md', import.meta.url), 'utf8');
vm.runInContext(readFileSync(new URL('../gate2-metrika-popup-lead-copy.js', import.meta.url), 'utf8'), context);
assert.equal(vm.runInContext('G2MU_POPUP_LEAD_MARKDOWN', context), exactPopupLead);
const popupLead = vm.runInContext('g2muPopupLeadMarkdownHtml()', context);
assert(popupLead.includes('<h3>3.1.7. Полученная заявка из окна (Pop-up)</h3>'));
assert(popupLead.includes('<h4>1. Что сделать (инструкция)</h4>'));
assert(popupLead.includes('<h4>2. Где нажать / Как проверить (инструкция)</h4>'));
assert(popupLead.includes('<h4>3. Сверка (инструкция)</h4>'));
assert(popupLead.includes('<h5>П. Подготовить цель для Яндекс Директа</h5>'));
assert(popupLead.includes('<code>#popup:myform</code>'));
assert(popupLead.includes('<code>679326353</code>'));
assert.equal((popupLead.match(/<table>/g) || []).length, 7);
assert(!popupLead.includes('Сохранённые проверки и связанные настройки'));
const fullPopupLead = vm.runInContext(`g2muGuideHtml({ id: 's317' }, 'tilda')`, context);
assert(fullPopupLead.includes(popupLead));
context.platform = 'wordpress';
context.state.siteUrl = 'https://another.example/';
assert.equal(vm.runInContext('g2muPopupLeadMarkdownHtml()', context), popupLead);
assert.equal(vm.runInContext(`g2muGuideHtml({ id: 's317' }, 'wordpress')`, context), fullPopupLead);
const exactAddToCart = readFileSync(new URL('../gate2-metrika-add-to-cart-3.2.1.md', import.meta.url), 'utf8');
vm.runInContext(readFileSync(new URL('../gate2-metrika-add-to-cart-copy.js', import.meta.url), 'utf8'), context);
assert.equal(vm.runInContext('G2MU_ADD_TO_CART_MARKDOWN', context), exactAddToCart);
const addToCart = vm.runInContext('g2muAddToCartMarkdownHtml()', context);
assert(addToCart.includes('<h3>3.2.1. Добавление товара в корзину</h3>'));
assert(addToCart.includes('<h4>1. Что сделать (инструкция)</h4>'));
assert(addToCart.includes('<h4>2. Где нажать / Как проверить (инструкция)</h4>'));
assert(addToCart.includes('<h4>3. Сверка (инструкция)</h4>'));
assert(addToCart.includes('<h5>Е. Проверить достижение в отчёте</h5>'));
assert(addToCart.includes('<code>add</code>'));
assert.equal((addToCart.match(/<table>/g) || []).length, 1);
assert(!addToCart.includes('Сохранённые проверки и связанные настройки'));
const fullAddToCart = vm.runInContext(`g2muGuideHtml({ id: 's321' }, 'tilda')`, context);
assert(fullAddToCart.includes(addToCart));
context.platform = 'wordpress';
context.state.siteUrl = 'https://another.example/';
assert.equal(vm.runInContext('g2muAddToCartMarkdownHtml()', context), addToCart);
assert.equal(vm.runInContext(`g2muGuideHtml({ id: 's321' }, 'wordpress')`, context), fullAddToCart);
const exactPhoneClick = readFileSync(new URL('../gate2-metrika-phone-click-3.2.2.md', import.meta.url), 'utf8');
vm.runInContext(readFileSync(new URL('../gate2-metrika-phone-click-copy.js', import.meta.url), 'utf8'), context);
assert.equal(vm.runInContext('G2MU_PHONE_CLICK_MARKDOWN', context), exactPhoneClick);
const phoneClick = vm.runInContext('g2muPhoneClickMarkdownHtml()', context);
assert(phoneClick.includes('<h3>3.2.2. Клик по номеру телефона</h3>'));
assert(phoneClick.includes('<h4>1. Что сделать (инструкция)</h4>'));
assert(phoneClick.includes('<h4>2. Где нажать / Как проверить (инструкция)</h4>'));
assert(phoneClick.includes('<h4>3. Сверка (инструкция)</h4>'));
assert(phoneClick.includes('<h5>М. Подготовить цель для Яндекс Директа</h5>'));
assert(phoneClick.includes('<code>tel:+79169735736</code>'));
assert.equal((phoneClick.match(/<table>/g) || []).length, 3);
assert(!phoneClick.includes('Сохранённые проверки и связанные настройки'));
const fullPhoneClick = vm.runInContext(`g2muGuideHtml({ id: 's322' }, 'tilda')`, context);
assert(fullPhoneClick.includes(phoneClick));
context.platform = 'wordpress';
context.state.siteUrl = 'https://another.example/';
assert.equal(vm.runInContext('g2muPhoneClickMarkdownHtml()', context), phoneClick);
assert.equal(vm.runInContext(`g2muGuideHtml({ id: 's322' }, 'wordpress')`, context), fullPhoneClick);
const exactSiteSearch = readFileSync(new URL('../gate2-metrika-site-search-3.3.1.md', import.meta.url), 'utf8');
vm.runInContext(readFileSync(new URL('../gate2-metrika-site-search-copy.js', import.meta.url), 'utf8'), context);
assert.equal(vm.runInContext('G2MU_SITE_SEARCH_MARKDOWN', context), exactSiteSearch);
const siteSearch = vm.runInContext('g2muSiteSearchMarkdownHtml()', context);
assert(siteSearch.includes('<h3>3.3.1. Поиск по сайту</h3>'));
assert(siteSearch.includes('<h4>1. Что сделать (инструкция)</h4>'));
assert(siteSearch.includes('<h4>2. Где нажать / Как проверить (инструкция)</h4>'));
assert(siteSearch.includes('<h4>3. Сверка (инструкция)</h4>'));
assert(siteSearch.includes('Полный учёт поисковых запросов не подтверждён'));
assert(siteSearch.includes('<a href="https://help-ru.tilda.cc/search?utm_source=chatgpt.com"'));
assert(!siteSearch.includes('&#x20;'));
assert(vm.runInContext(`g2muGuideHtml({ id: 's331' }, 'tilda')`, context).includes(siteSearch));
const exactKeySectionVisit = readFileSync(new URL('../gate2-metrika-key-section-visit-3.3.2.md', import.meta.url), 'utf8');
vm.runInContext(readFileSync(new URL('../gate2-metrika-key-section-visit-copy.js', import.meta.url), 'utf8'), context);
assert.equal(vm.runInContext('G2MU_KEY_SECTION_VISIT_MARKDOWN', context), exactKeySectionVisit);
const keySectionVisit = vm.runInContext('g2muKeySectionVisitMarkdownHtml()', context);
assert(keySectionVisit.includes('<h3>3.3.2. Посещение ключевого раздела</h3>'));
assert(keySectionVisit.includes('<h4>1. Что сделать (инструкция)</h4>'));
assert(keySectionVisit.includes('<h4>2. Где нажать / Как проверить (инструкция)</h4>'));
assert(keySectionVisit.includes('<h4>3. Сверка (инструкция)</h4>'));
assert(keySectionVisit.includes('<code>680134239</code>'));
assert(vm.runInContext(`g2muGuideHtml({ id: 's332' }, 'tilda')`, context).includes(keySectionVisit));
const exactMultipleProductViews = readFileSync(new URL('../gate2-metrika-multiple-product-views-3.3.3.md', import.meta.url), 'utf8');
vm.runInContext(readFileSync(new URL('../gate2-metrika-multiple-product-views-copy.js', import.meta.url), 'utf8'), context);
assert.equal(vm.runInContext('G2MU_MULTIPLE_PRODUCT_VIEWS_MARKDOWN', context), exactMultipleProductViews);
const multipleProductViews = vm.runInContext('g2muMultipleProductViewsMarkdownHtml()', context);
assert(multipleProductViews.includes('<h3>3.3.3. Просмотр нескольких товаров</h3>'));
assert(multipleProductViews.includes('<h4>1. Что сделать (инструкция)</h4>'));
assert(multipleProductViews.includes('<h4>2. Где нажать / Как проверить (инструкция)</h4>'));
assert(multipleProductViews.includes('<h4>3. Сверка (инструкция)</h4>'));
assert(multipleProductViews.includes('число просмотров не равно числу уникальных товаров'));
assert(vm.runInContext(`g2muGuideHtml({ id: 's333' }, 'tilda')`, context).includes(multipleProductViews));
const exactPageviewCount = readFileSync(new URL('../gate2-metrika-pageview-count-3.3.4.md', import.meta.url), 'utf8');
vm.runInContext(readFileSync(new URL('../gate2-metrika-pageview-count-copy.js', import.meta.url), 'utf8'), context);
assert.equal(vm.runInContext('G2MU_PAGEVIEW_COUNT_MARKDOWN', context), exactPageviewCount);
const pageviewCount = vm.runInContext('g2muPageviewCountMarkdownHtml()', context);
assert(pageviewCount.includes('<h3>3.3.4. Количество просмотров страниц</h3>'));
assert(pageviewCount.includes('<h4>1. Что сделать (инструкция)</h4>'));
assert(pageviewCount.includes('<h4>2. Где нажать / Как проверить (инструкция)</h4>'));
assert(pageviewCount.includes('<h4>3. Сверка (инструкция)</h4>'));
assert(pageviewCount.includes('порог определяем по фактической статистике проекта'));
assert(vm.runInContext(`g2muGuideHtml({ id: 's334' }, 'tilda')`, context).includes(pageviewCount));
const exactVisitDuration = readFileSync(new URL('../gate2-metrika-visit-duration-3.3.5.md', import.meta.url), 'utf8');
vm.runInContext(readFileSync(new URL('../gate2-metrika-visit-duration-copy.js', import.meta.url), 'utf8'), context);
assert.equal(vm.runInContext('G2MU_VISIT_DURATION_MARKDOWN', context), exactVisitDuration);
const visitDuration = vm.runInContext('g2muVisitDurationMarkdownHtml()', context);
assert(visitDuration.includes('<h3>3.3.5. Продолжительность визита</h3>'));
assert(visitDuration.includes('<h4>1. Что сделать (инструкция)</h4>'));
assert(visitDuration.includes('<h4>2. Где нажать / Как проверить (инструкция)</h4>'));
assert(visitDuration.includes('<h4>3. Сверка (инструкция)</h4>'));
assert(visitDuration.includes('порог времени выбираем на основе фактических данных проекта'));
assert(vm.runInContext(`g2muGuideHtml({ id: 's335' }, 'tilda')`, context).includes(visitDuration));
const exactContentAnalytics = readFileSync(new URL('../gate2-metrika-content-analytics-4.1.md', import.meta.url), 'utf8');
vm.runInContext(readFileSync(new URL('../gate2-metrika-content-analytics-copy.js', import.meta.url), 'utf8'), context);
assert.equal(vm.runInContext('G2MU_CONTENT_ANALYTICS_MARKDOWN', context), exactContentAnalytics);
const contentAnalytics = vm.runInContext('g2muContentAnalyticsMarkdownHtml()', context);
assert(contentAnalytics.includes('<h3>4.1. Контентная аналитика</h3>'));
assert(contentAnalytics.includes('<h4>1. Что сделать (инструкция)</h4>'));
assert(contentAnalytics.includes('<h4>2. Где нажать / Как проверить (инструкция)</h4>'));
assert(contentAnalytics.includes('<h4>3. Сверка (инструкция)</h4>'));
assert(contentAnalytics.includes('Контентная аналитика не требует создания дополнительных конверсионных целей'));
assert(vm.runInContext(`g2muGuideHtml({ id: 's4content' }, 'tilda')`, context).includes(contentAnalytics));
const exactTagManager = readFileSync(new URL('../gate2-metrika-tag-manager-4.2.md', import.meta.url), 'utf8');
vm.runInContext(readFileSync(new URL('../gate2-metrika-tag-manager-copy.js', import.meta.url), 'utf8'), context);
assert.equal(vm.runInContext('G2MU_TAG_MANAGER_MARKDOWN', context), exactTagManager);
const tagManager = vm.runInContext('g2muTagManagerMarkdownHtml()', context);
assert(tagManager.includes('<h3>4.2. Яндекс Тег Менеджер</h3>'));
assert(tagManager.includes('<h4>1. Что сделать (инструкция)</h4>'));
assert(tagManager.includes('<h4>2. Где нажать / Как проверить (инструкция)</h4>'));
assert(tagManager.includes('<h4>3. Сверка (инструкция)</h4>'));
assert(tagManager.includes('не требуется второй счётчик'));
assert(vm.runInContext(`g2muGuideHtml({ id: 's4tags' }, 'tilda')`, context).includes(tagManager));

render('https://shop.example.org/catalog?campaign=a&source=b', '123456789');
context.filter.internalVisitTestV1 = {
  runId: 'run_42', siteUrl: context.state.siteUrl, counterId: context.counterId,
};
const internal = vm.runInContext('g2muInternalVisitsGuideHtml()', context);
assert(internal.includes('счётчик для <code>shop.example.org</code> с номером <code>123456789</code>'));
assert(internal.includes('href="https://shop.example.org/catalog?campaign=a&amp;source=b&amp;filter_test=owner_check_run_42"'));
assert(internal.includes('href="https://shop.example.org/catalog?campaign=a&amp;source=b&amp;filter_test=guest_check_run_42"'));
assert(internal.includes('10–15 минут'));
assert(internal.includes('Если параметры URL удаляются'));
const internalCompare = vm.runInContext('g2muInternalVisitsCompareHtml()', context);
assert(internalCompare.includes('owner_check_run_42'));
assert(internalCompare.includes('guest_check_run_42'));
assert(internalCompare.includes('Не подтверждено'));
const fullInternal = vm.runInContext(`g2muGuideHtml({ id: 's24', doc: 'filters' }, 'tilda')`, context);
assert(fullInternal.includes('Где нажать / Как проверить'));
assert(fullInternal.includes('Отчёт «Популярное»'));
assert(fullInternal.includes('Обработка данных'));

render('https://another.example/', '987654321');
const switched = vm.runInContext('g2muInternalVisitsGuideHtml()', context);
assert(!switched.includes('shop.example.org'));
assert(!switched.includes('owner_check_run_42'));
assert(!switched.includes('guest_check_run_42'));
assert(switched.includes('счётчик для <code>another.example</code> с номером <code>987654321</code>'));
context.filter.internalVisitTestV1 = {
  runId: '<svg onload=alert(1)>', siteUrl: context.state.siteUrl, counterId: context.counterId,
};
const invalidRun = vm.runInContext('g2muInternalVisitsGuideHtml()', context);
assert(!invalidRun.includes('<svg'));
assert(!invalidRun.includes('filter_test=owner_check_'));
render('', '');
const missingInternal = vm.runInContext('g2muInternalVisitsGuideHtml()', context);
assert(missingInternal.includes('укажите опубликованный адрес сайта в Gate 0'));
assert(missingInternal.includes('сохраните числовой ID счётчика в пункте 1.2'));
assert(missingInternal.includes('data-g2mu-new-filter-test disabled'));
render('https://shop.example.org/catalog', '123456789');
const robotsGuide = vm.runInContext('g2muRobotsGuideHtml()', context);
assert(robotsGuide.includes('счётчик для <code>shop.example.org</code> с номером <code>123456789</code>'));
assert(robotsGuide.includes('Фильтровать роботов по поведению'));
assert(robotsGuide.includes('Последние 30 дней'));
assert(robotsGuide.includes('Сравнить с данными с роботами'));
const robotsCompare = vm.runInContext('g2muRobotsCompareHtml()', context);
assert(robotsCompare.includes('shop.example.org'));
assert(robotsCompare.includes('123456789'));
const fullRobots = vm.runInContext(`g2muGuideHtml({ id: 's25', doc: 'robots' }, 'tilda')`, context);
assert(fullRobots.includes('Где нажать / Как проверить'));
assert(fullRobots.includes('Отчёт «Роботы»'));
assert(fullRobots.includes('Фильтры и операции'));
render('https://another.example/', '987654321');
const switchedRobots = vm.runInContext('g2muRobotsGuideHtml()', context);
assert(switchedRobots.includes('another.example'));
assert(switchedRobots.includes('987654321'));
assert(!switchedRobots.includes('shop.example.org'));
render('', '');
const missingRobots = vm.runInContext('g2muRobotsGuideHtml()', context);
assert(missingRobots.includes('укажите опубликованный адрес сайта в Gate 0'));
assert(missingRobots.includes('сохраните ID счётчика в пункте 1.2'));
render('https://shop.example.org/catalog', '123456789');
const accessGuide = vm.runInContext('g2muAccessGuideHtml()', context);
assert(accessGuide.includes('счётчик для <code>shop.example.org</code> с номером <code>123456789</code>'));
assert(accessGuide.includes('Индивидуальный доступ'));
assert(accessGuide.includes('Представители'));
assert(accessGuide.includes('Публичный доступ к статистике'));
assert(accessGuide.includes('Перенести на другой аккаунт'));
const accessCompare = vm.runInContext('g2muAccessCompareHtml()', context);
assert(accessCompare.includes('shop.example.org'));
assert(accessCompare.includes('123456789'));
const fullAccess = vm.runInContext(`g2muGuideHtml({ id: 's26', doc: 'access' }, 'tilda')`, context);
assert(fullAccess.includes('Где нажать / Как проверить'));
assert(fullAccess.includes('Перенос счётчика'));
render('https://another.example/', '987654321');
const switchedAccess = vm.runInContext('g2muAccessGuideHtml()', context);
assert(switchedAccess.includes('another.example'));
assert(switchedAccess.includes('987654321'));
assert(!switchedAccess.includes('shop.example.org'));
render('', '');
const missingAccess = vm.runInContext('g2muAccessGuideHtml()', context);
assert(missingAccess.includes('укажите опубликованный адрес сайта в Gate 0'));
assert(missingAccess.includes('сохраните ID счётчика в пункте 1.2'));
const requiredStart = source.indexOf('function g2muRequiredValues(');
const requiredEnd = source.indexOf('\nfunction g2muAggregate(', requiredStart);
assert(requiredStart >= 0 && requiredEnd > requiredStart);
vm.runInContext(source.slice(requiredStart, requiredEnd), context);
context.filter.mode = 'cookie';
assert.equal(vm.runInContext('g2muRequiredValues("s24")', context), true);
context.filter.mode = 'off';
assert.equal(vm.runInContext('g2muRequiredValues("s24")', context), false);
assert.equal(vm.runInContext('g2muRequiredValues("s25")', context), true);
assert.equal(vm.runInContext('g2muRequiredValues("s26")', context), true);

console.log('Metrika 1.4 and 2.4–2.6 dynamic guides; 3.1.1–4.2 verbatim copies verified');
