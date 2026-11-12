# Шаг 7: публикация остановлена

Код не менялся. HEAD: b14370cb3010ee3e979f947acfbf0af951f21986. Push и деплой не выполнялись.

## Объём и порядок

На bc42b5b найдено 122 scripts/*smoke*.mjs, на текущем коммите 137. Добавленных тестов 15, удалённых нет. На каждый процесс установлен внешний таймаут 120 секунд. Сначала проверены четыре теста без браузера, затем тест паспорта как проверка изменённого общего счётчика. При первом новом падении дальнейшие тесты и часть B остановлены по условию пользователя.

Использованы git archive двух коммитов во временных каталогах, без переключения рабочей ветки. Браузеры имели отдельные временные профили. Серверы отдавали статические снимки сборок и заглушки /api/, не обращаясь к облаку. Браузерный тест использовал синтетический проект Passport baseline. Исходные проекты не изменялись.

Локальная версия до: 2.3.526+3f52d3b9d9c5. Локальная версия после: 2.3.526+1b98c471bf26. Это версии тестовых сборок, версии продакшена не запрашивались.

## Новое падение

project-passport-baseline-smoke.mjs: PASS на bc42b5b, FAIL на b14370c. Оба запуска завершились за 3,05 секунды, таймаут не достигнут. Сам тест между этими коммитами не менялся.

Тест проверяет, что перенос пяти карточек Gate 0 в паспорт уменьшает число блоков ровно на пять:

- До путеводителя: previous 20, current 15, moved 5; 20 - 15 = 5, проверка проходит.
- После: previous 20, current 9, moved 5; 20 - 9 = 11, проверка падает.

Причина: общий guruGateBlockStatuses для Gate 0 переопределён в now-guide.js и считает видимые блоки через nowGuideGate0Cards, исключая также скрытые и объединённые карточки. Старый тест продолжает ожидать изменение только на пять перенесённых карточек. Ошибка AssertionError: progressMoved на scripts/project-passport-baseline-smoke.mjs:122. Само условие находится на строках 105-106. Это новое падение по заданному критерию PASS -> FAIL; решение о корректировке расчёта или контракта теста в этом шаге не принималось.

## Старые падения

- gate1-category-move-non-destructive-smoke.mjs: на обеих сборках ReferenceError: guruV247KeywordNormalize is not defined в VM теста.
- gate4-upstream-links-smoke.mjs: на обеих сборках AssertionError, actual 0, expected 83, строка 22; используется экспорт по умолчанию.

До подготовки браузеров также была техническая попытка gate0-company-strategic-foundation-smoke.mjs. Оба запуска завершились fetch failed при подключении к неподготовленному CDP 9362. Это ошибка окружения, валидного сравнения теста нет. После STOP этот тест не перезапускался.

## Полная таблица

PASS и FAIL относятся к выполненным сравнениям. ОКРУЖЕНИЕ означает невалидный запуск из-за неподготовленного CDP. СТОП означает, что тест не запускался после обнаружения нового падения. Отсутствовал означает, что файла теста в bc42b5b не было.

| Тест | До, bc42b5b | После, b14370c |
| --- | --- | --- |
| category-input-smoke.mjs | СТОП | СТОП |
| company-manual-economics-gate4-strict-smoke.mjs | СТОП | СТОП |
| export-diagnostics-smoke.mjs | СТОП | СТОП |
| gate-navigation-performance-smoke.mjs | СТОП | СТОП |
| gate0-card7-card11-scope-smoke.mjs | СТОП | СТОП |
| gate0-company-brand-purpose-smoke.mjs | СТОП | СТОП |
| gate0-company-keyword-foundation-smoke.mjs | СТОП | СТОП |
| gate0-company-multiplicity-smoke.mjs | СТОП | СТОП |
| gate0-company-offer-smoke.mjs | СТОП | СТОП |
| gate0-company-segmentation-smoke.mjs | СТОП | СТОП |
| gate0-company-strategic-foundation-smoke.mjs | ОКРУЖЕНИЕ | ОКРУЖЕНИЕ |
| gate0-company-strategy-chain-smoke.mjs | СТОП | СТОП |
| gate0-gate1-jtbd-source-smoke.mjs | СТОП | СТОП |
| gate0-keyword-foundation-smoke.mjs | СТОП | СТОП |
| gate0-merged-readiness-smoke.mjs | Отсутствовал | СТОП |
| gate0-now-missing-smoke.mjs | Отсутствовал | СТОП |
| gate0-offer-foundation-source-smoke.mjs | СТОП | СТОП |
| gate0-platform-audit-navigation-smoke.mjs | СТОП | СТОП |
| gate0-product-editors-restore-smoke.mjs | СТОП | СТОП |
| gate0-product-scope-smoke.mjs | СТОП | СТОП |
| gate0-unified-readiness-smoke.mjs | Отсутствовал | СТОП |
| gate1-blog-system-smoke.mjs | СТОП | СТОП |
| gate1-catalog-audit-smoke.mjs | СТОП | СТОП |
| gate1-category-list-preview-smoke.mjs | СТОП | СТОП |
| gate1-category-move-non-destructive-smoke.mjs | FAIL | FAIL |
| gate1-company-brand-demand-copy-smoke.mjs | СТОП | СТОП |
| gate1-company-brand-demand-smoke.mjs | СТОП | СТОП |
| gate1-company-strategic-foundation-smoke.mjs | СТОП | СТОП |
| gate1-company-unified-container-smoke.mjs | СТОП | СТОП |
| gate1-comparison-performance-smoke.mjs | СТОП | СТОП |
| gate1-competitor-bergen-v543-smoke.mjs | СТОП | СТОП |
| gate1-competitor-table-v540-smoke.mjs | СТОП | СТОП |
| gate1-competitor-workflow-v539-smoke.mjs | СТОП | СТОП |
| gate1-export-self-contained-smoke.mjs | СТОП | СТОП |
| gate1-final-keyword-foundation-smoke.mjs | СТОП | СТОП |
| gate1-imported-candidates-smoke.mjs | СТОП | СТОП |
| gate1-pain-product-id-migration-smoke.mjs | СТОП | СТОП |
| gate1-project-comparison-product-card-smoke.mjs | СТОП | СТОП |
| gate1-rsya-competitor-domains-v538-smoke.mjs | СТОП | СТОП |
| gate1-seo-central-smoke.mjs | СТОП | СТОП |
| gate1-seo-guidance-smoke.mjs | СТОП | СТОП |
| gate1-seo-interactive-tool-smoke.mjs | СТОП | СТОП |
| gate1-seo-panel-smoke.mjs | СТОП | СТОП |
| gate1-webmaster-qa-smoke.mjs | СТОП | СТОП |
| gate12-now-readiness-smoke.mjs | Отсутствовал | СТОП |
| gate12-readiness-audit-smoke.mjs | Отсутствовал | СТОП |
| gate2-company-product-smoke.mjs | СТОП | СТОП |
| gate2-company-services-smoke.mjs | Отсутствовал | СТОП |
| gate2-company-services-step3-smoke.mjs | Отсутствовал | СТОП |
| gate2-company-strategic-foundation-smoke.mjs | СТОП | СТОП |
| gate2-metrika-company-product-v361-smoke.mjs | СТОП | СТОП |
| gate2-metrika-company-source-smoke.mjs | СТОП | СТОП |
| gate2-metrika-goals-quality-smoke.mjs | СТОП | СТОП |
| gate2-metrika-product-audit-smoke.mjs | СТОП | СТОП |
| gate2-product-services-step4-smoke.mjs | Отсутствовал | СТОП |
| gate2-service-block-smoke.mjs | Отсутствовал | СТОП |
| gate2-setup-wizard-smoke.mjs | СТОП | СТОП |
| gate2-status-propagation-smoke.mjs | СТОП | СТОП |
| gate3-execution-map-smoke.mjs | СТОП | СТОП |
| gate3-gate4-structure-sync-smoke.mjs | СТОП | СТОП |
| gate3-product-journey-smoke.mjs | СТОП | СТОП |
| gate3-stage-explanations-smoke.mjs | СТОП | СТОП |
| gate34-now-decisions-smoke.mjs | Отсутствовал | СТОП |
| gate34-now-readiness-smoke.mjs | Отсутствовал | СТОП |
| gate4-aware-media-smoke.mjs | СТОП | СТОП |
| gate4-aware-navigation-smoke.mjs | СТОП | СТОП |
| gate4-company-product-foundation-smoke.mjs | СТОП | СТОП |
| gate4-company-strategic-foundation-smoke.mjs | СТОП | СТОП |
| gate4-duplicate-audit-smoke.mjs | СТОП | СТОП |
| gate4-five-a-smoke.mjs | СТОП | СТОП |
| gate4-funnel-readiness-smoke.mjs | СТОП | СТОП |
| gate4-jtbd-link-id-smoke.mjs | PASS | PASS |
| gate4-paid-smm-smoke.mjs | СТОП | СТОП |
| gate4-product-id-migration-smoke.mjs | СТОП | СТОП |
| gate4-product-smm-calendar-policy-smoke.mjs | СТОП | СТОП |
| gate4-product-smm-scope-smoke.mjs | СТОП | СТОП |
| gate4-product-smm-workspace-v2-smoke.mjs | СТОП | СТОП |
| gate4-readiness-product-smoke.mjs | СТОП | СТОП |
| gate4-rsya-ad-prompt-smoke.mjs | СТОП | СТОП |
| gate4-rsya-assets-prompt-smoke.mjs | СТОП | СТОП |
| gate4-rsya-builder-smoke.mjs | СТОП | СТОП |
| gate4-rsya-direct-form-v534-smoke.mjs | СТОП | СТОП |
| gate4-rsya-direct-panel-v533-smoke.mjs | СТОП | СТОП |
| gate4-rsya-exclusions-v536-smoke.mjs | СТОП | СТОП |
| gate4-rsya-foundation-source-smoke.mjs | СТОП | СТОП |
| gate4-rsya-gate1-defaults-smoke.mjs | СТОП | СТОП |
| gate4-rsya-group-card-smoke.mjs | СТОП | СТОП |
| gate4-rsya-group-launch-v537-smoke.mjs | СТОП | СТОП |
| gate4-rsya-guidance-smoke.mjs | СТОП | СТОП |
| gate4-rsya-jtbd-groups-smoke.mjs | СТОП | СТОП |
| gate4-rsya-launch-checklist-smoke.mjs | СТОП | СТОП |
| gate4-rsya-launch-v528-smoke.mjs | СТОП | СТОП |
| gate4-rsya-launch-v541-smoke.mjs | СТОП | СТОП |
| gate4-rsya-metrika-link-smoke.mjs | СТОП | СТОП |
| gate4-rsya-product-id-smoke.mjs | СТОП | СТОП |
| gate4-rsya-project-photo-delete-smoke.mjs | СТОП | СТОП |
| gate4-rsya-promotion-smoke.mjs | СТОП | СТОП |
| gate4-rsya-start-method-v532-smoke.mjs | СТОП | СТОП |
| gate4-rsya-strategy-v531-smoke.mjs | СТОП | СТОП |
| gate4-rsya-two-step-workflow-smoke.mjs | СТОП | СТОП |
| gate4-search-duplicate-ownership-smoke.mjs | СТОП | СТОП |
| gate4-search-gate1-product-source-smoke.mjs | СТОП | СТОП |
| gate4-search-group-fixation-smoke.mjs | СТОП | СТОП |
| gate4-search-group-metrics-import-export-smoke.mjs | СТОП | СТОП |
| gate4-search-jtbd-audience-forecast-smoke.mjs | СТОП | СТОП |
| gate4-search-jtbd-readiness-smoke.mjs | СТОП | СТОП |
| gate4-search-launch-summary-period-smoke.mjs | СТОП | СТОП |
| gate4-search-launch-visibility-smoke.mjs | СТОП | СТОП |
| gate4-search-save-export-smoke.mjs | СТОП | СТОП |
| gate4-smm-campaign-key-guard-smoke.mjs | СТОП | СТОП |
| gate4-smm-content-system-smoke.mjs | СТОП | СТОП |
| gate4-smm-digestion-smoke.mjs | СТОП | СТОП |
| gate4-smm-material-foundation-smoke.mjs | СТОП | СТОП |
| gate4-smm-scenario-smoke.mjs | Отсутствовал | СТОП |
| gate4-smm-strategy-smoke.mjs | СТОП | СТОП |
| gate4-stage-explanations-smoke.mjs | СТОП | СТОП |
| gate4-upstream-integration-smoke.mjs | СТОП | СТОП |
| gate4-upstream-links-smoke.mjs | FAIL | FAIL |
| gate5-snapshot-smoke.mjs | СТОП | СТОП |
| gate6-company-strategic-foundation-smoke.mjs | СТОП | СТОП |
| gate7-company-strategic-foundation-smoke.mjs | СТОП | СТОП |
| gate8-browser-smoke.mjs | СТОП | СТОП |
| gate8-compact-workbench-smoke.mjs | СТОП | СТОП |
| gate8-ui-integration-smoke.mjs | СТОП | СТОП |
| gates-3-5-6-7-8-product-scope-smoke.mjs | СТОП | СТОП |
| local-storage-only-smoke.mjs | СТОП | СТОП |
| navigation-url-smoke.mjs | СТОП | СТОП |
| now-guide-smoke.mjs | Отсутствовал | СТОП |
| other-project-now-guide-smoke.mjs | Отсутствовал | СТОП |
| preflight-now-guide-smoke.mjs | Отсутствовал | СТОП |
| product-card-seven-blocks-smoke.mjs | СТОП | СТОП |
| product-card-unified-template-smoke.mjs | СТОП | СТОП |
| project-passport-baseline-smoke.mjs | PASS | FAIL |
| strategic-foundation-hierarchy-smoke.mjs | СТОП | СТОП |
| strategic-foundation-segments-smoke.mjs | СТОП | СТОП |
| workspace-sync-egress-smoke.mjs | PASS | PASS |
| workspace-sync-retry-smoke.mjs | СТОП | СТОП |

## Изменения вне путеводителя: было и стало

Это чтение diff, функциональное подтверждение экспорта для этих действий в шаге 7 не завершено из-за STOP.

| Область | Было | Стало |
| --- | --- | --- |
| Паспорт проекта | Готовность проекта; доля сохранённых готовых карточек | Карточек заполнено; тот же старый показатель с уточнённой подписью |
| Схема | Прогресс по Gate, блоков готово | Заполнение карточек по Gate, карточек заполнено |
| Общая готовность | Общий прежний реестр гейтов | Предполётный путь 0-3 и выбранные группы Gate 4, выбранный product_id |
| Фильтр стратегии продукта | Только пустой id или совпадение с categoryId | Дополнительно совпадение с productId |
| Раскрытие секций | Записанные настройки и их инициализация при чтении | Временное раскрытие путеводителя; явная запись при действии; инициализация карт Gate 0 при клике |
| Кэш сохранения | Общий кэш чтений только в renderGate | Кэш также на один синхронный проход saveState |

Равенство экспортов iCleaning, SIVRCE и ГУРУ в шаге 6 подтверждалось для просмотра и переходов путеводителя. Оно не является подтверждением всех перечисленных действий вне путеводителя. В этом шаге такие три сравнения не выполнены, пункт A3 не закрыт.

## Часть B и продакшен

Не выполнялась, поскольку условие отсутствия новых падений не выполнено.

- Полный список коммитов к публикации относительно актуальной удалённой ветки не проверялся.
- Схема публикации и ветка продакшена не подтверждались.
- Точка отката и команда отката не зафиксированы.
- Версия продакшена до и после не запрашивалась; деплой не выполнялся.
- Продакшен Коричного яблока не открывался, скриншотов продакшена в этом шаге нет.

Новых выявленных падений одно. Остальные непроверенные тесты могут содержать другие падения; утверждения об их отсутствии нет.
