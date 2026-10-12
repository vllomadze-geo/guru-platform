# Gate 1 SEO guidance v307 — verification log

## Scope

- Изменения ограничены Gate 1: `SEO → Компания` и `SEO → Продукт/Услуга`; Gate 0 используется только как источник уже введённых URL.
- Порядок блоков и расчётные формулы не изменялись. Модель Robots.txt обновлена только для Яндекс Вебмастера, повторяемых Sitemap и живой проекции URL из Gate 0.
- Старые пояснения заменены только у `Канонический URL и редиректы` и `Сравнение проектов`.
- Отдельная дублирующая карточка `card-15` удалена: 82 до / 81 после. Остальные карточки Gate 1 сохранены.

## Mapping

| Заголовок | Компонент подсказок | Существующий компонент интерфейса |
|---|---|---|
| Robots.txt: доступ поисковых роботов | `gate1SeoGuideRobotsV307` | `robotsV130FieldsHtml` |
| Канонический URL и редиректы | `gate1SeoGuideCanonicalV307` + `GATE1_SEO_EXPLANATIONS_V297[canonical-redirects]` | `redirectV130FieldsHtml` |
| Meta Robots SEO META in 1 CLICK | `gate1SeoGuideAuditSummaryV307` | `auditSummaryHtml` / `card-17` |
| CWV PageSpeed Insights | `gate1SeoGuideAuditSummaryV307` | `auditSummaryHtml` / `card-18` |
| SSL / HTTPS: безопасность домена | `gate1SeoGuideSslV307` | `sslV130FieldsHtml` |
| Яндекс Вебмастер · Компания | `gate1SeoGuideWebmasterCompanyV307` | `gate1WebmasterCompanyHtmlV295` |
| Сравнение проектов | `gate1SeoGuideComparisonV307` + `GATE1_SEO_EXPLANATIONS_V297[project-comparison]` | `projectComparisonHtml` |
| Собственный интерактивный инструмент | `gate1SeoGuideInteractiveV307` | `gate1SeoInteractiveToolHtmlV305` |
| SEO-сниппет товара | `gate1SeoGuideSnippetV307` | `v22SeoSnippetSection` |
| Яндекс Вебмастер · Продукт | `gate1SeoGuideWebmasterProductV307` | `gate1WebmasterProductHtmlV295` |
| Блог · Продукт/Услуга | `gate1SeoGuideBlogProductV307` | `gate1BlogProductHtmlV304` |

## Verification

- 11/11 оставшихся блочных описаний найдены.
- 34/34 подсказки к фактическим полям найдены.
- Поле `Дата проверки` в Robots.txt удалено из модели по умолчанию, рендера и слоя подсказок.
- Google Search Console удалён из Robots.txt: модель, миграция сохранённых полей, рендер, расчёт статусов, обработчики и подсказки теперь работают только с Яндекс Вебмастером.
- Самостоятельный блок `Sitemap.xml: карта важных страниц` (`card-15`) удалён из seed и сохранённых workspace как дубль. Его URL и статус Яндекс переносятся без потери в `robotsV130.yandex.sitemaps`.
- Сводка Sitemap и карточка Gate 2 `card-108` читают новый единый источник `gate-1.cards[Robots.txt].robotsV130.yandex.sitemaps`.
- `Sitemap в robots.txt` переведён из одиночного селектора в повторяемые строки `URL + статус`; доступны добавление и удаление строк, значения сохраняются в `robotsV130.yandex.sitemaps`.
- Таблицы `Проверка важных URL` и `Проверка служебных URL` больше не содержат демонстрационные `/services`, `/catalog`, `/admin` и другие фиксированные адреса.
- Источник строк — `Gate 0 → Точка отсчёта → megaMarketing.platformV2`: `fundamental`, `landings`, `extra`. Пустые URL пропускаются, одинаковые URL не дублируются.
- Коммерческие страницы автоматически направляются в важные; корзина, личный кабинет, политика, 404, thank-you, поиск, фильтры и admin — в служебные. Выбранные результаты и комментарии сохраняются по URL при повторном рендере.
- Публичный URL контактов (`/contacts`, `/contact`, `/kontakty`, `/kontakti`, `/контакты`) имеет приоритет над неоднозначным названием строки Gate 0 и всегда направляется в важные URL.
- Smoke-маршрутизация: главная, каталог, контакты, посадочная «Козы» и доставка → важные; корзина и thank-you → служебные.
- Проекция Robots.txt обновляется только из workspace, которому физически принадлежит карточка. Нормализация ещё не активированного проекта больше не может стереть его сохранённые результаты данными другого/пустого проекта.
- При смене классификации URL между важными и служебными сохранённый результат переносится по нормализованному URL.
- Изменения строк Robots.txt немедленно фиксируются в локальном workspace до фонового пересчёта. Smoke с настоящей жёсткой перезагрузкой подтвердил сохранение `Требует внимания` и в state, и в DOM.
- Устранена задержка при выборе результата: обработчик больше не сериализует workspace дважды и не вызывает синхронный `renderGateNav()` для всего проекта. Локальный бейдж обновляется сразу, общая навигация и durable-save — после ближайшего кадра с объединением повторных запросов.
- Контрольный замер: `change` 312–338 мс до исправления → 4,3 мс после; следующий кадр — 12,1 мс. Жёсткая перезагрузка после выбора по-прежнему восстанавливает значение.
- `Канонический URL и редиректы` перестроен в автоматический сценарий: единственный общий ввод — `Основной домен`; система создаёт ровно четыре корневых URL (`https/http`, `www/без www`) и заранее задаёт эталон `200` для `https` без `www`, `301 → основной URL` для остальных.
- В строках оставлены только два ручных значения: `HTTP-код` и `Финальный URL`. Ручные вариант URL, статус, доказательство, добавление/удаление строк и проверки `/page` удалены из активного UI.
- Вердикт каждой строки (`Корректно`, `Проблема`, до заполнения — `Не проверено`), канонический URL, счётчик `N из 4` и статус карточки вычисляются автоматически. Контроль: корректный набор даёт `Канонический URL: https://example.ru/ · 4 из 4 корректны`; неверный финальный URL даёт `Проблема`.
- Состояние нового блока, четыре кода, четыре финальных URL, автоматический canonical и статус `Готово` подтверждены после жёсткой перезагрузки.
- Таблица `Проверка важных URL` расположена сразу после заголовка и инструкции `Важные URL разрешены`, а `Проверка служебных URL` — сразу после заголовка и инструкции `Служебные URL обработаны`. Отдельные рамки и сворачиваемые `<details>` вокруг таблиц удалены.
- Общие селекторы под `Важные URL разрешены` и `Служебные URL обработаны` удалены как рудимент; сохранённые `robotsV130.yandex.importantOk/serviceOk` очищаются миграцией.
- Статус Robots.txt и связанная сводка Яндекс Вебмастера теперь вычисляются из реальных построчных результатов: важные URL должны быть разрешены, служебные — запрещены или не требоваться.
- У обеих URL-таблиц добавлена кнопка `Копировать все ссылки · N`: важные и служебные адреса копируются раздельными многострочными списками; операция не изменяет workspace.
- 46 DOM-маркеров уникальны, дублей нет.
- Старые заменяемые тексты в интерфейсе не обнаружены.
- Проекция текста не изменила workspace state.
- Другие гейты не изменились.
- Ошибок JavaScript нет.
- Smoke: `gate1-seo-guidance-smoke.mjs` — passed.
- Regression: `gate1-seo-central-smoke.mjs --accordion-only` — passed.
- Regression: `gate1-seo-interactive-tool-smoke.mjs` — passed.
- Regression: `gate1-blog-system-smoke.mjs` — passed.
- Regression: `gate1-project-comparison-product-card-smoke.mjs` — passed.

## Task-scoped diff

- Added `gate1-seo-guidance.js`: view-only descriptions and field hints with reinjection after Gate 1 local refreshes.
- Added `scripts/gate1-seo-guidance-smoke.mjs`: text, duplication, state-integrity, gate-integrity and screenshot checks.
- Updated `gate1-seo-panel.js`: exactly two approved explanatory-text replacements.
- Updated `app.js`: Robots.txt читает URL из Gate 0, распределяет их в две таблицы и сохраняет результаты проверки по URL; также удалён superseded inline subtitle под `Сравнение проектов`.
- Updated `seed-data.js`: удалён `card-15` из новых проектов.
- Updated `gate1-seo-central.js` и `gate1-webmaster-qa.js`: миграция старой карточки, единое хранение Sitemap в Robots.txt и сохранение связанного статуса Gate 2.
- Updated `scripts/gate1-seo-panel-smoke.mjs`: expected values for the two replacements.
- Updated `index.html`: loads `gate1-seo-guidance.js` after the existing Gate 1 SEO/blog components.
- Другие гейты не редактировались; структура их карточек и данных не менялась.
