# Платформа · коммерческое дерево — отчёт по локальному пакету

Дата проверки: 01.10.2026. Код общий для всех проектов ГУРУ. Изменения остаются в локальном, ещё не опубликованном пакете. Четыре актуальных экспорта «Коричное яблоко», iCleaning, SIVRCE и ГУРУ пока не приложены; проверка сохранности их рабочих данных ожидает эти файлы.

## Изменённые файлы

| Файл | Что изменено |
|---|---|
| `app.js` | Пять колонок коммерческой таблицы, дерево с одним товаром под каждой его категорией, drag and drop, «+ товар», компактное «Для чего», тип «Категория» у ручной коммерческой страницы, переименование по ID; активные читатели связей и названий переведены на канонические данные. |
| `platform-relations.js` | `platformV2.relationsV1.categoryIdsByProduct[product_id]`: упорядоченный список стабильных ID категорий, операции переноса и переключения, однократная миграция старых полей и вложенных карт Gate 1. |
| `platform-deletion.js` | Фактический план удаления, подтверждение, очистка по точному ID в Gate 0–8, старых картах Gate 1 и ссылках банка без удаления самих несвязанных ссылок. |
| `styles.css` | Отступы дерева, ручка переноса, чекбоксы, нейтральные поля и компактная пилюля «Для чего». |
| `index.html` | Версии подключаемых CSS и JS для локального пакета. |
| `gate1-blog-system.js`, `gate4-funnel-readiness.js` | Уже входящие в этот неопубликованный пакет читатели единой связи для блога и SMM. |

## Хранение и поведение

- Товар: ключ `product_id`; категория: существующий стабильный `productRegistryV185[id]`; ручная страница: её постоянный `id`. Название не используется как ключ новой связи.
- Связь хранится только как упорядоченный список `categoryIdsByProduct[product_id]` в данных Платформы. Старые `primaryByProduct`, `additionalByProduct`, `catalogItemsV189.categoryId` и другие поля оставлены для сохранения прежних данных; новые правки связей их не обновляют.
- Товар отображается под всеми категориями из списка. Для потребителя одной категории берётся первая. Перенос заменяет исходную категорию целевой на том же месте списка; если целевая уже есть, удаляется только исходная. «+ товар» добавляет категорию в конец. Пустой список выводит товар в «Без категории».
- Название категории редактирует `productRegistryV185[id].name`, товара — `catalogItemsV189[id].name`; одинаковые видимые строки товара и URL синхронизируются при вводе. «На заказ» имеет одну строку и ведёт себя как категория при наличии её подтверждённого ID в «Что продаём».
- Для вручную добавленной коммерческой страницы `pageTypeV1` принимает «Лендинг», «Категория» или «Другая». Выбор «Категория» классифицирует эту ручную страницу и не создаёт новую запись в «Что продаём»; её постоянный ID, URL и «Для чего» остаются прежними.
- URL и их формат не менялись: остаётся `platformV2.urlsV1`, ввод с `#` разрешён. Фундаментальная, юридическая и служебная группы не менялись.

## Потребители связи и названий

| Файл, функции | Что читается из Платформы / по ID |
|---|---|
| `app.js`: `megaPlatformCommercialTable`, `megaPlatformProductPickerRows`, `megaPlatformMoveProductCategory`, `megaPlatformToggleProductCategory` | Все категории товара, дерево, перенос и отметки в списке. |
| `app.js`: `guruV194Products`, `guruV194Product`, `guruV194Records`, `guruV194ExactRecords`, `guruV194Resolve` | Общая проекция товара и Strategic Foundation; одиночная категория — первый ID списка. |
| `app.js`: `guruV189CatalogItemHtml`, `guruV189CategoryItems`, `guruV193CatalogGroups`, `GURU_MOVE_ADAPTERS.catalogCategory`, `guruV194Ui`, `guruV194ProductSelectHtml` | «Что продаём», группировки, выбор товара; прежний ввод связи показывается read-only «из Платформы». |
| `app.js`: `pageStructureStatus`, `guruV189EnsureCatalog`, `pv181ProductItems`, `guruV188CategoryPositions`, `gate1PageStructureHtml`, `guruCategoryProductsV510`, `gate1PainMigrateWorkspaceV237` | Gate 1, аудит страниц и товары категорий. Проверки присутствия товара используют весь список; редактируемые названия аудита заменены чтением по ID. |
| `app.js`: `guruHubShowcaseSourcesV502`, `guruSiteChromeCategoryEntriesV499`, `guruSiteChromeProposalV499` | Витрина хаба и меню используют категорию по ID. Витрина хранит настройки карточки категории, отдельной связи товара с категорией в ней нет. |
| `app.js`: `g3ProductJourneySnapshot`, `g3ProductJourneyOptions`, `g4ProductPickCategory`, `g4ProductPickSiblings`, `g4CampaignContext`, `g4Gate3ProductContext`, `g4ReadUnitEconomics` | Gate 3 и Gate 4 Search читают каноническую связь через общую проекцию; при одной нужной категории берут первую. |
| `app.js`: `g4RsyaCatalogProductV289`, `g4RsyaWorkspaceSnapshotV455`, `g4ProductIdCategoryOwnerV224`, `g4ProductIdItemV224` | РСЯ и миграция кампаний читают связь по `product_id`. |
| `app.js`: `guruExportRuntimeModelV223`, `guruExportGate2CurrentProductObservationV223`, `guruExportProjectPayloadV223` | Экспорты получают текущую связь через общую проекцию и включают всё хранилище Платформы в workspace. |
| `gate1-blog-system.js`: `gate1BlogLiveValuesV304`; `gate4-funnel-readiness.js`: `g4SmmScopedRecordsReadOnlyV299` | Блог и SMM читают первую категорию товара из Платформы. |
| `app.js`: `guruV185CategoryNames`, `pv130ProductsFromGate0`, `g4ReadGate0`, `readGate0Value`, `projectComparisonAutoValue`, `g8CollectFacts` и автоконтексты Gate 0 | Живые названия категорий берутся из `productRegistryV185` по стабильным ID; старые строки `whatSell` больше не являются источником для этих экранов. |

Старые копии названий найдены в `project.whatSell`, `project.whatSellExtra`, `sharedEvidence.что_продаем`, `productMainJtbds[name]`, `offersV2.productOffers[name]`, `platformV2.landings[name]`, `catalogItemsV189._sourceName`, `Gate 1 pageRows.name`, снимках кампаний Gate 4 и журналах миграции. Они **не удалены** по условию задачи. Старые зеркала `whatSell` всё ещё синхронизируются ради совместимости старых словарей и защиты от повторного появления удалённой категории. Активные потребители, перечисленные выше, читают текущие имена по ID; физическое отсутствие всех исторических копий до проверки четырёх экспортов заявлять нельзя.

## Очистка после подтверждённого удаления

| Объект | Хранилища, проверяемые по точному ID |
|---|---|
| Товар | `project.catalogItemsV189`, `productBindingsV185`, `gate0ScopedValuesV194`, `productScopedOverridesV194`, `gate0ScopeUiV194`, `projectComparison.productsById`; `platformV2.urlsV1.products`, `relationsV1.categoryIdsByProduct` и прежние primary/additional, ручные `targetV1`; `linkBank.pageRefV1`. |
| Gate 1 для товара | `pageRows[catalogItemIdV189]`, `painV130.productMaps[].items`, `legacyPageItemsV237`, `legacySemanticLevelsV264.pageByProduct`, `unitV130.items`, `gate1LandingContinuumV234.byProduct`, `gate1WebmasterV295.byProduct`, `gate1BlogV304.articles[].product_links`, `projectComparison`. |
| Gate 2–8 для товара | Gate 2 `metrikaQualityV360.perProduct`, `metrikaProductV367.perProduct`; Gate 3 `gate3ProductJourneyV210`, `gate3Gate4StructureV290`; Gate 4 `gate4SearchBuild`, `gate4Rsya`, `gate4Production`, `gate4SmmContentV299`, `gate4.implementations`; Gate 5 `importsByProduct`, `campaignRegistry`, отчёты, настройки и импорты связанной кампании; Gate 6 `gate6Calendar.byProduct`; Gate 8 `gate8Forecast.byProduct`. |
| Категория | `project.productRegistryV185`, `productBindingsV185`, category-scope `gate0ScopedValuesV194`, `catalogUiV191`; `platformV2.urlsV1.categories` или системный `fixed.on_order`, категория из всех упорядоченных списков товаров и прежних primary/additional, ручные `targetV1`, `linkBank.pageRefV1`; Gate 1 `card-22.pageRows`, витрина и изображения по ID, `painV130.productMaps`, `unitV130.items`; исторические ветки Gate 2–8 по подтверждённому ID в тех же видах хранилищ, что у товара. Сами товары сохраняются. |

Окно показывает **фактически найденные** ненулевые количества. При совпадении ID товара и категории, нормализованных ключей или при старом ключе только по названию сомнительная запись остаётся и выводится как неоднозначная. Исторические журналы миграции сохраняются. Публичный путь `megaPlatformDeleteApply` отклоняет удаление без подтверждения в окне.

## Миграция, неоднозначности и проверки

- Однократно собираются старые `primaryByProduct` и `additionalByProduct` (основная первой), затем кандидаты из `catalogItemsV189`, карт `painV130.productMaps[].items`, Gate 1 `pageRows`, `gate0ScopedValuesV194`, вложенных overrides и точного `positioning.category`. Конфликтующие кандидаты без прежнего значения Платформы становятся дополнительными категориями и попадают в `migrationConflicts`. Витрина хаба и секции категорий проверены: в них нет самостоятельного сохранённого списка product ID для миграции.
- Копия архивного экспорта «Коричного яблока» от 28.09.2026: 6 категорий, 8 товаров, 8 упорядоченных списков связей, 0 конфликтов; 5 заполненных старых URL представлены в новом URL-хранилище, существующая `platformV2.extra` сохранена. Архив не равен актуальному рабочему проекту.
- На синтетической копии `catalogItemsV189 → cat-a` и `Gate 1 → cat-b` дали первую и дополнительную категории; явное очищение списка повторной миграцией не восстанавливается. В старой локальной тестовой копии `platform-url-smoke` значение `cat-one` не имело подтверждённого стабильного ID категории и записано как `unresolved`, без выдуманного ключа.
- На тестовых копиях проверены две строки одного `product_id` с одним URL, `#` в URL, drag and drop с заменой позиции и переносом в «Без категории», добавление/снятие галочки в «+ товар», редактирование имени, удаление товара и категории через подтверждение, сохранение URL ручной страницы при очистке её «Для чего». На архивной копии повторно проверена очистка точных ссылок `linkBank`, `legacyPageItemsV237` и `legacySemanticLevelsV264`; исходный JSON не изменялся.
- Локальный браузер после загрузки итогового кода: ошибок консоли нет. `node --check` для пяти задействованных JS-файлов, `git diff --check` и проверка пробелов в новых модулях прошли. `npm run build` возвращает `No build`: отдельный bundle в репозитории не создаётся.
- Четыре обещанных актуальных экспорта не доступны в рабочей области. Миграция, URL и ручные строки именно этих четырёх рабочих проектов пока не сверены; рабочие данные не удалялись и не переносились.

## Скриншоты тестовой копии

- [Дерево коммерческой группы целиком](gate0-platform-ordered-tree.png)
- [Один товар под двумя категориями](gate0-platform-ordered-two-categories.png)
- [Открытый список «+ товар»](gate0-platform-ordered-add-product-open.png)
- [Результат переноса товара](gate0-platform-ordered-drag-result.png)
- [Лендинг с пилюлей «Для чего»](gate0-platform-ordered-landing-purpose.png)
- [Ручная страница с типом «Категория»](gate0-platform-manual-page-type-category.png)
- [Подтверждение удаления категории](gate0-platform-ordered-delete-category-dialog.png)

## SHA

- Локальная версия `app.js`: `e789d12fd674783da366f276150f00727fe9e58cbef195b8098322f241852fa2`.
- Локальные модули: `platform-relations.js` — `c3a2ad631bf71b1ed1577c8ae4b746824a9b473003f945c4f94783ba35e75b57`; `platform-deletion.js` — `ab1e17c0b348e678e3588b1929b7092e8bbe4b29abb87f85b359e20b987d3812`.
- Продакшен `app.js` на `https://guru-platform-navy.vercel.app` — `8987dbd85267c1e531aa6b527bcce031c34690744e4aa1151ee7f671eeb19d67` (проверен 01.10.2026). Публикации не было.
