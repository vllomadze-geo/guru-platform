# Платформа: категории, товары и привязки — отчёт по локальной версии

Статус: реализация и проверки на тестовых копиях выполнены; проверка данных четырёх рабочих проектов ожидает обещанные JSON-экспорты. Продакшен не обновлялся.

## Изменённые файлы

| Файл | Изменение |
|---|---|
| `app.js` | Коммерческое дерево, поля, события, проекция связи и названий по ID; защита удаления из «Что продаём»; два этапа миграции до и после подготовки проекта. |
| `platform-relations.js` | Хранилище `platformV2.relationsV1` и миграция основной/дополнительных категорий. |
| `platform-deletion.js` | План фактических данных, окно подтверждения, удаление по ID в Gate 0–8. |
| `gate1-blog-system.js` | Чтение категории товара через `megaPlatformProductCategoryId`. |
| `gate4-funnel-readiness.js` | То же для SMM/готовности Gate 4. |
| `index.html` | Подключение общих модулей перед/после `app.js`. |
| `styles.css` | Шесть колонок коммерческой группы, поля/теги и окно удаления. |

## Потребители связи «товар → категория»

| Файл | Функция или экран | Как теперь читает |
|---|---|---|
| `app.js` | `megaPlatformCommercialTable`, `megaPlatformCommercialRow` | Дерево, основная категория и доп. теги напрямую из `relationsV1`. |
| `app.js` | `guruV194Products`, `guruV194Product` | Общее представление товара отдаёт `categoryId` из Платформы; старое поле каталога остаётся для миграции. |
| `app.js` | `guruV194Records`, `guruV194ExactRecords`, `guruV194Resolve`, `guruV194SyncLegacy` | Записи Strategic Foundation читают текущую категорию через представление по `product_id`; старое `category_id` не перезаписывается при чтении. |
| `app.js` | `guruV189CatalogItemHtml`, `guruV189CategoryItems`, `guruV193CatalogGroups`, `GURU_MOVE_ADAPTERS.catalogCategory` | «Что продаём» показывает связь «из Платформы»; группировка и порядок используют её по ID. |
| `app.js` | `guruV189EnsureCatalog`, `guruV188EnsurePositionCategories` | Исторические Gate 1 поля больше не перезаписывают связь после миграции. |
| `app.js` | `guruV188CategoryPositions`, `gate1PageStructureHtml`, `g1pcContentName`, `pageStructureCardHtml` | Аудит страниц и Gate 1 показывают текущую категорию/имя по ID; ввод названия в аудитной карточке read-only. |
| `app.js` | `pv181ProductItems`, `guruCategoryProductsV510` | Список товаров категории и блок страницы категории строятся из товаров с текущей основной категорией. |
| `app.js` | `guruHubShowcaseSourcesV502`, `guruSiteChromeCategoryEntriesV499`, `guruSiteChromeProposalV499` | Витрина/меню читают названия категорий по ID; «На заказ» находится по сохранённому ID. |
| `app.js` | `g3ProductJourneyLegacyKeys`, `g3ProductJourneySnapshot`, `g3ProductJourneyOptions` | Gate 3 получает категорию через общее представление товара. |
| `app.js` | `g4ProductPickCategory`, `g4ProductPickSiblings`, `g4CampaignContext`, `g4Gate3ProductContext`, `g4ReadUnitEconomics` | Gate 4 Search использует проекцию общей связи. |
| `app.js` | `g4RsyaCatalogProductV289`, `g4RsyaWorkspaceSnapshotV455`, `g4ProductIdCategoryOwnerV224`, `g4ProductIdItemV224` | РСЯ и миграция кампаний используют текущую связь по product_id. |
| `app.js` | `guruExportRuntimeModelV223`, `guruExportGate2CurrentProductObservationV223` | Экспортные сведения о выбранном товаре получают категорию из общего представления. |
| `gate1-blog-system.js` | `gate1BlogLiveValuesV304` | Прямая проверка scope-категории берёт ID из Платформы. |
| `gate4-funnel-readiness.js` | `g4SmmScopedRecordsReadOnlyV299` | Прямая проверка SMM scope-категории берёт ID из Платформы. |
| `gate1-webmaster-qa.js`, `gate1-seo-panel.js`, `gate8-workbench.js` | Селекторы выбранного товара | Уже используют `guruV194Product`; его `categoryId` теперь проецируется из Платформы. Эти файлы не менялись. |

Старые копии имён найдены в `project.whatSell`, `whatSellExtra`, `sharedEvidence.что_продаем`, `productMainJtbds[name]`, `offersV2.productOffers[name]`, `platformV2.landings[name]`, `catalogItemsV189._sourceName`, `Gate 1 pageRows.name`, снимках кампаний Gate 4. Они сохранены как прежние данные; новые ключи Платформы основаны только на ID. Ввод имени категории/товара из коммерческой строки пишет в `productRegistryV185[id].name` / `catalogItemsV189[id].name`. Прежние сопоставления Gate 4 по `name` и `_sourceName` ещё работают как запасной путь для старых записей; карточка категории в Gate 1 продолжает сохранять историческое `pageRows.name`. Это ограничивает заявление о полном отсутствии копий до проверки четырёх рабочих экспортов.

## Что очищается после подтверждения

| Объект | Хранилища и записи с подтверждённым ID |
|---|---|
| Товар | `catalogItemsV189[id]`; `productBindingsV185[id]`; `gate0ScopedValuesV194[product_id]`; `productScopedOverridesV194[id]`; `gate0ScopeUiV194.commonMetaByProduct[id]`; `projectComparison.productsById[id]`; `platformV2.urlsV1.products[id]`, `relationsV1.primaryByProduct[id]`, `additionalByProduct[id]`; Gate 1 `pageRows[catalogItemIdV189]`, `painV130.productMaps[].items[id]`, `unitV130.items[sourceItemId]`, `gate1LandingContinuumV234.byProduct[id]`, `gate1WebmasterV295.byProduct[id]`, `gate1BlogV304.articles[].product_links[]`; Gate 2 `metrikaQualityV360.perProduct[]`, `metrikaProductV367.perProduct[]`; Gate 3 `gate3ProductJourneyV210.openStepsByProduct[id]`, `gate3Gate4StructureV290.byProduct[id]`; Gate 4 `gate4Production.campaigns`, readiness/forecast branches by ID, `gate4SearchBuild[normalizeAspectKey(id)]`, `gate4Rsya[normalizeAspectKey(id)]`, SMM ideas/publications; Gate 5 `importsByProduct[id]`, campaign registry and связанные по ID отчёты/настройки; Gate 6 `gate6Calendar.byProduct[id]`; Gate 8 `gate8Forecast.byProduct[id]`. У ручных страниц очищается только `targetV1`, их URL и содержимое сохраняются. |
| Категория | `productRegistryV185[id]`, `productBindingsV185[id]`, категория в `gate0ScopedValuesV194`, URL/привязки Платформы, аудит `card-22.pageRows[categoryId]`, витрина хаба/главной по ID, исторические category-ID ветки Gate 0–8 по тем же хранилищам, если владелец подтверждён ID. Товары остаются, основная связь очищается, доп. связь удаляется. Старые `pageRows.categoryId`, scoped `category_id`, `unitV130.product_id` у сохранённых товаров очищаются без удаления самих товаров. `painV130` сохраняет товарные данные в «Без категории». |

В `painV130.productMaps[].product_id` и `unitV130.items[].product_id` старой схемы часто записан ID категории. Удаление по одному названию поля не выполняется. Неоднозначные ветки Search/РСЯ/кампаний по тексту названия показываются в окне как сохранённые для ручной проверки.
Если ID категории совпадает с ID товара, общие исторические ветки `byProduct`, Gate 2–5 и Search/РСЯ также сохраняются и показываются как неоднозначные; запись выбранной категории или товара удаляется только из его собственного хранилища.

## Миграция и проверка

- На архивном срезе «Коричного яблока» от 18.09: 6 категорий, 8 товаров, конфликтов основной категории нет. Это не актуальный рабочий экспорт.
- На синтетической копии конфликт `catalogItemsV189 → cat-a` и `Gate 1 → cat-b` сохранён как `cat-a` основная + `cat-b` дополнительная; явная очистка не оживляется повторной миграцией.
- В локальном проекте `platform-url-smoke` исторический `cat-one` не сопоставился со стабильным ID категории: один товар, повторения ссылки в каталоге, Gate 1, scoped values и вложенных overrides. Миграция сохранила его как unresolved и оставила товар без основной категории, не создав ключ из названия.
- Тестовые копии: дерево по ID, единственная редактируемая строка «На заказ» с товаром под ней, переименование категории/товара, отмена и подтверждение удаления, отсутствие восстановления удалённой записи после `prepareSystemCards`, сохранение URL ручной страницы при очистке её привязки. При совпадении ID категории и товара неоднозначные ветки не удаляются и перечисляются в подтверждении.
- В браузере нет пустого селектора без вариантов; поля имеют нейтральный фон. `node --check app.js`, проверки остальных четырёх скриптов и `git diff --check` прошли. `npm run build` в этом проекте выводит `No build` и не создаёт отдельный bundle.
- Дополнительные старые smoke-скрипты не дали положительного результата: `gate4-product-id-migration-smoke.mjs` ожидает архивные 447 кампаний, а в доступном наборе их 120; `gate1-catalog-audit-smoke.mjs` требует отдельный Chrome на порту 9335; `gate3-gate4-structure-sync-smoke.mjs` в текущем браузерном контексте не завершился за 110 секунд и был остановлен. Эти сценарии не включены в число пройденных проверок.
- Четыре актуальных JSON-экспорта «Коричное яблоко», iCleaning, SIVRCE, ГУРУ пока не приложены. Их миграционные конфликты, сохранность URL/ручных строк и дерево нужно проверить после получения файлов. Удаление на рабочих данных не запускалось.
- Если у «На заказ» в «Что продаём» нет категории со стабильным ID, в Платформе остаётся одна системная строка с URL, но переименование и удаление категории недоступны: записывать название в «Что продаём» некуда. Такой случай есть в локальной синтетической копии; состав реальных проектов ожидает проверки экспортов.

## Снимки

- [Дерево коммерческих страниц](gate0-platform-commercial-tree.png)
- [Товар с основной и дополнительной категорией](gate0-platform-product-primary-extra.png)
- [Лендинг с привязкой](gate0-platform-landing-binding.png)
- [Новая пустая строка](gate0-platform-new-blank-page.png)
- [Окно удаления категории](gate0-platform-delete-category-dialog.png)

## SHA и публикация

- Локальный `app.js`: `933a0b4e36893b84527bdd317da98872dfb62e6c7e78480957044b0c7739b866`.
- Локальные новые модули: `platform-relations.js` — `29ec7354ff78c40cacceb92c5d1f83d0396443dd85e5a52b36dd82579261a861`; `platform-deletion.js` — `7d6754fabe1a38868fc1090eee66738886e645c2d87f51266931896c479e3177`.
- Продакшен `app.js` на `guru-platform-navy.vercel.app`: `8987dbd85267c1e531aa6b527bcce031c34690744e4aa1151ee7f671eeb19d67` (01.10.2026). Он остаётся прежним; локальные изменения входят в незадеплоенный пакет.
