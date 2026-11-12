# Шаг 7: разбор паспорта и полный прогон

Публикация и часть B не выполнялись. Код приложения не менялся. Изменён только scripts/project-passport-baseline-smoke.mjs, отдельный локальный коммит ceffa020e25db24df9e4ca8e5a3a3460eb7d9e95.

Локальная версия: 2.3.526+1b98c471bf26. Полный SHA-256 runtime: 1b98c471bf26a313cfd0abffc6ddf84a501baef5931178906dc455806f61142b. Приложение идентично b14370cb3010ee3e979f947acfbf0af951f21986; коммит ceffa02 меняет только smoke-тест и не меняет fingerprint приложения.

## 1. Исходные строки 80-120

Это код до исправления, одинаковый в bc42b5b и b14370c.

```js
 80:     companyDiagnostic.querySelector('summary').click();
 81:     card('card-12').querySelector('summary').click();
 82:     const open = card('card-12').open;
 83:     const date = card('card-12').querySelector('[data-control-fixation-key]');
 84:     date.value = '2026-10-15';
 85:     date.dispatchEvent(new Event('input', { bubbles: true }));
 86:     const resultOwner = card('card-10').querySelector('[data-cr-meta-field="positionId"]');
 87:     resultOwner.value = 'passport-product-a';
 88:     resultOwner.dispatchEvent(new Event('change', { bubbles: true }));
 89:     const product = baseline().querySelector('[data-gate0-scope-product-select]');
 90:     product.value = 'passport-product-b';
 91:     product.dispatchEvent(new Event('change', { bubbles: true }));
 92:     const switched = activeView === 'project' &&
 93:       guruV194Ui(state).selectedProductId === 'passport-product-b' &&
 94:       card('gate0-landing-check-v215').textContent.includes('Лиса') &&
 95:       card('card-12').open;
 96:     const companyUnaffectedByProduct = card('card-11').open &&
 97:       card('card-11').querySelector('.diag-5a')?.textContent === companyContent;
 98:     const diagnosticFollowsProduct = card('gate0-product-diagnostic')
 99:       .querySelector('[data-gate0-diagnostic-product-id]')?.dataset.gate0DiagnosticProductId === 'passport-product-b';
100:     renderProject();
101:     const rerendered = card('card-11').open && card('card-12').open &&
102:       card('card-12').querySelector('[data-control-fixation-key]').value === '2026-10-15' &&
103:       card('card-10').querySelector('[data-cr-meta-field="positionId"]').value === 'passport-product-a';
104:     const gate0 = state.gates.find((gate) => gate.id === 'gate-0');
105:     const progressMoved = __guruPassportPrevGateBlockStatusesV527(gate0).length -
106:       guruGateBlockStatuses(gate0).length === ids.length;
107:     renderGate();
108:     const absentFromGate0 = ids.every((id) => !document.querySelector('.gate0-vertical [data-card-row="' + id + '"]'));
109:     await new Promise((resolve) => setTimeout(resolve, 350));
110:     const saved = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + project.id));
111:     return { inPassport, companyBeforeProductSelector, companyScopeOnly,
112:       companyUnaffectedByProduct, open, switched, diagnosticFollowsProduct,
113:       rerendered, progressMoved, absentFromGate0,
114:       dataPreserved: saved?.project?.controlFixationDate === '2026-10-15' &&
115:         saved?.gates?.find((gate) => gate.id === 'gate-0')?.cards?.find((entry) => entry.id === 'card-10')
116:           ?.currentResultsMeta?.positionId === 'passport-product-a',
117:       errors: window.__guruErrors };
118:   })()`);
119:   console.log(JSON.stringify(report, null, 2));
120:   for (const [key, value] of Object.entries(report)) {
```

progressMoved проверяет уменьшение количества статусов-блоков Gate 0 при переносе пяти карточек в паспорт. Число 5 равно длине GURU_PASSPORT_GATE0_CARD_IDS_V527. Это card-11, gate0-landing-check-v215, card-10, gate0-product-diagnostic, card-12. Их записи остаются в Gate 0 как источники данных, а редакторы показаны в паспорте.

На bc42b5b вспомогательный счётчик до исключения возвращает 20, счётчик после исключения 15. Разница 5. На текущей сборке старый вспомогательный счётчик всё ещё возвращает 20, а новый общий счётчик возвращает 9 видимых блоков. Разница 11 включает также шесть скрытых единиц: card-3 и объединённые card-4, card-5, card-6, card-8, card-9. Исходное условие смешивало два разных реестра.

## 2. Смысл проверки на текущей сборке

При одинаковых правилах видимости до переноса 14 блоков, после переноса 9. Уменьшение ровно на 5. Ни один другой id не исчезает, порядок остальных сохраняется. Ни одна сохранённая карточка не удалялась и не перемещалась в данных.

Для пробы на синтетическом проекте временно отключалось только условие исключения паспортных карточек из отображаемого реестра, с восстановлением функции в finally. Это расчёт в изолированном браузере, файлы приложения и данные исходных проектов не менялись.

| id | До исключения из Gate 0 | После исключения |
| --- | --- | --- |
| card-1 | Да | Да |
| gate0-project-goal | Да | Да |
| gate0-company-brand-purpose | Да | Да |
| gate0-company-segmentation | Да | Да |
| gate0-company-positioning | Да | Да |
| gate0-company-offer | Да | Да |
| gate0-company-keyword-foundation | Да | Да |
| card-7 | Да | Да |
| card-11 | Да | Нет, в паспорте |
| card-2 | Да | Да |
| gate0-product-diagnostic | Да | Нет, в паспорте |
| gate0-landing-check-v215 | Да | Нет, в паспорте |
| card-10 | Да | Нет, в паспорте |
| card-12 | Да | Нет, в паспорте |

Вывод: вариант (а), смысл сохранён. В тесте сравнивается один и тот же реестр видимых блоков: 14 - 9 = 5. Проверка остаётся строгой, условие не заменено на >= 5. Дополнительно проверяются пять конкретных id и сохранность всех остальных id и их порядка. Контрольные пробы отвергают отсутствие переноса и исключение неправильной карточки. Существующие проверки редакторов паспорта, отсутствия в Gate 0, изменения продукта и сохранения ответов сохранены.

## 3. Diff и коммит

```diff
diff --git a/scripts/project-passport-baseline-smoke.mjs b/scripts/project-passport-baseline-smoke.mjs
index bb6c8ee..3ec04d0 100644
--- a/scripts/project-passport-baseline-smoke.mjs
+++ b/scripts/project-passport-baseline-smoke.mjs
@@ -102,8 +102,28 @@ try {
       card('card-12').querySelector('[data-control-fixation-key]').value === '2026-10-15' &&
       card('card-10').querySelector('[data-cr-meta-field="positionId"]').value === 'passport-product-a';
     const gate0 = state.gates.find((gate) => gate.id === 'gate-0');
-    const progressMoved = __guruPassportPrevGateBlockStatusesV527(gate0).length -
-      guruGateBlockStatuses(gate0).length === ids.length;
+    let beforeMovedCount;
+    let movedIdsExcluded = true;
+    if (typeof nowGuideGate0Cards === 'function') {
+      // Compare the same visible-block registry with and without the passport
+      // exclusion. Other visibility rules must remain identical in both counts.
+      const isMoved = guruPassportMovedGate0CardV527;
+      let beforeMovedIds;
+      try {
+        guruPassportMovedGate0CardV527 = () => false;
+        beforeMovedIds = nowGuideGate0Cards(gate0).map((entry) => entry.id);
+      } finally {
+        guruPassportMovedGate0CardV527 = isMoved;
+      }
+      const afterMovedIds = nowGuideGate0Cards(gate0).map((entry) => entry.id);
+      beforeMovedCount = beforeMovedIds.length;
+      movedIdsExcluded = ids.every((id) => beforeMovedIds.includes(id) && !afterMovedIds.includes(id)) &&
+        JSON.stringify(beforeMovedIds.filter((id) => !ids.includes(id))) === JSON.stringify(afterMovedIds);
+    } else {
+      beforeMovedCount = __guruPassportPrevGateBlockStatusesV527(gate0).length;
+    }
+    const progressMoved = movedIdsExcluded &&
+      beforeMovedCount - guruGateBlockStatuses(gate0).length === ids.length;
     renderGate();
     const absentFromGate0 = ids.every((id) => !document.querySelector('.gate0-vertical [data-card-row="' + id + '"]'));
     await new Promise((resolve) => setTimeout(resolve, 350));
```

Коммит: ceffa020e25db24df9e4ca8e5a3a3460eb7d9e95, «Тест паспорта: сравнение одинакового набора видимых блоков». Push не выполнялся. Исправленный тест проходил на обеих сборках до коммита. После полного прогона последовательный повтор исходного теста на bc42b5b и исправленного теста на текущей сборке снова дал PASS.

В массовом прогоне исходный тест bc42b5b один раз упал на dataPreserved после фиксированного ожидания 350 мс; progressMoved был true. Последовательный повтор PASS. Это сохранено в таблице, результат массового прогона не заменён повтором.

## 4. Полный прогон

| Сборка | PASS | FAIL | Таймаут 120 с | Нет файла |
| --- | ---: | ---: | ---: | ---: |
| bc42b5b | 28 | 66 | 28 | 15 |
| Текущая | 28 | 75 | 34 | 0 |

На текущей сборке выполнены все 137 файлов scripts/*smoke*.mjs. На bc42b5b выполнены все 122 существовавших там файла. Ещё 15 файлов добавлены после bc42b5b, в таблице у них «Нет файла». Несуществующим тестам не присваивался выдуманный результат PASS или FAIL.

Таймаут каждого процесса 120 секунд. Внутренние таймауты CDP самих тестов 20 или 30 секунд не увеличивались; такой исход отмечен FAIL с причиной, а превышение внешних 120 секунд отмечено TIMEOUT. Прогон не останавливался на первом падении.

Использованы git archive обеих версий, отдельные временные BrowserContext и профили Chrome, статические локальные серверы с заглушками /api/. Исходный сервер пользователя на порту 3000 не останавливался. Для старых тестов с жёстким URL 127.0.0.1:3000 переписывался только CDP Page.navigate на URL соответствующего изолированного снимка. Приложение и assertions тестов этим не менялись.

Очереди распределялись между браузерами. Повторное назначение уже выполненного или выполняющегося файла пропускалось служебным кодом 85 при совпадении SHA-256 теста. Эти назначения исключены из результатов. Проверено: все 259 комбинаций версия/существовавший тест имеют журнал реального запуска без служебного кода 85. Дополнительные запуски сохранены отдельно. Источники: combined-results.json, skipped-duplicate-assignments.json, test-source-hashes.json.

Пять тестов между версиями изменились: gate-navigation-performance-smoke.mjs, gate2-setup-wizard-smoke.mjs, gate4-product-smm-workspace-v2-smoke.mjs, gate8-ui-integration-smoke.mjs, project-passport-baseline-smoke.mjs. Поэтому для двух новых падений по времени дополнительно проверялся смысл нового условия и выполнялись последовательные повторы.

### Полная таблица 137 файлов

FAIL и TIMEOUT не означают автоматически дефект приложения: в старом наборе есть устаревшие ожидания, отсутствующие фикстуры и ошибки ожидания UI. Каждому исходу соответствует реальный журнал.

| Тест | bc42b5b | Текущая сборка |
| --- | --- | --- |
| category-input-smoke.mjs | TIMEOUT | TIMEOUT |
| company-manual-economics-gate4-strict-smoke.mjs | PASS | FAIL; два повтора PASS |
| export-diagnostics-smoke.mjs | TIMEOUT | TIMEOUT |
| gate-navigation-performance-smoke.mjs | FAIL | FAIL |
| gate0-card7-card11-scope-smoke.mjs | FAIL | FAIL |
| gate0-company-brand-purpose-smoke.mjs | FAIL | FAIL |
| gate0-company-keyword-foundation-smoke.mjs | FAIL | FAIL |
| gate0-company-multiplicity-smoke.mjs | PASS | PASS |
| gate0-company-offer-smoke.mjs | FAIL | FAIL |
| gate0-company-segmentation-smoke.mjs | FAIL | FAIL |
| gate0-company-strategic-foundation-smoke.mjs | PASS | PASS |
| gate0-company-strategy-chain-smoke.mjs | PASS | PASS |
| gate0-gate1-jtbd-source-smoke.mjs | PASS | PASS |
| gate0-keyword-foundation-smoke.mjs | FAIL | FAIL |
| gate0-merged-readiness-smoke.mjs | Нет файла | PASS |
| gate0-now-missing-smoke.mjs | Нет файла | PASS |
| gate0-offer-foundation-source-smoke.mjs | PASS | PASS |
| gate0-platform-audit-navigation-smoke.mjs | PASS | PASS |
| gate0-product-editors-restore-smoke.mjs | FAIL | FAIL |
| gate0-product-scope-smoke.mjs | TIMEOUT | TIMEOUT |
| gate0-unified-readiness-smoke.mjs | Нет файла | PASS |
| gate1-blog-system-smoke.mjs | FAIL | FAIL |
| gate1-catalog-audit-smoke.mjs | TIMEOUT | TIMEOUT |
| gate1-category-list-preview-smoke.mjs | PASS | PASS |
| gate1-category-move-non-destructive-smoke.mjs | FAIL | FAIL |
| gate1-company-brand-demand-copy-smoke.mjs | FAIL | PASS |
| gate1-company-brand-demand-smoke.mjs | FAIL | FAIL |
| gate1-company-strategic-foundation-smoke.mjs | FAIL | FAIL |
| gate1-company-unified-container-smoke.mjs | PASS | PASS |
| gate1-comparison-performance-smoke.mjs | FAIL | FAIL |
| gate1-competitor-bergen-v543-smoke.mjs | PASS | PASS |
| gate1-competitor-table-v540-smoke.mjs | FAIL | FAIL |
| gate1-competitor-workflow-v539-smoke.mjs | FAIL | FAIL |
| gate1-export-self-contained-smoke.mjs | FAIL | FAIL |
| gate1-final-keyword-foundation-smoke.mjs | FAIL | FAIL |
| gate1-imported-candidates-smoke.mjs | TIMEOUT | TIMEOUT |
| gate1-pain-product-id-migration-smoke.mjs | FAIL | FAIL |
| gate1-project-comparison-product-card-smoke.mjs | FAIL | FAIL |
| gate1-rsya-competitor-domains-v538-smoke.mjs | FAIL | FAIL |
| gate1-seo-central-smoke.mjs | FAIL | FAIL |
| gate1-seo-guidance-smoke.mjs | FAIL | FAIL |
| gate1-seo-interactive-tool-smoke.mjs | FAIL | FAIL |
| gate1-seo-panel-smoke.mjs | FAIL | FAIL |
| gate1-webmaster-qa-smoke.mjs | FAIL | FAIL |
| gate12-now-readiness-smoke.mjs | Нет файла | TIMEOUT |
| gate12-readiness-audit-smoke.mjs | Нет файла | TIMEOUT |
| gate2-company-product-smoke.mjs | FAIL | FAIL |
| gate2-company-services-smoke.mjs | Нет файла | FAIL |
| gate2-company-services-step3-smoke.mjs | Нет файла | FAIL |
| gate2-company-strategic-foundation-smoke.mjs | FAIL | FAIL |
| gate2-metrika-company-product-v361-smoke.mjs | PASS | FAIL |
| gate2-metrika-company-source-smoke.mjs | PASS | FAIL |
| gate2-metrika-goals-quality-smoke.mjs | PASS | FAIL |
| gate2-metrika-product-audit-smoke.mjs | PASS | FAIL |
| gate2-product-services-step4-smoke.mjs | Нет файла | FAIL |
| gate2-service-block-smoke.mjs | Нет файла | FAIL |
| gate2-setup-wizard-smoke.mjs | PASS | FAIL |
| gate2-status-propagation-smoke.mjs | PASS | FAIL |
| gate3-execution-map-smoke.mjs | TIMEOUT | TIMEOUT |
| gate3-gate4-structure-sync-smoke.mjs | TIMEOUT | TIMEOUT |
| gate3-product-journey-smoke.mjs | TIMEOUT | TIMEOUT |
| gate3-stage-explanations-smoke.mjs | TIMEOUT | TIMEOUT |
| gate34-now-decisions-smoke.mjs | Нет файла | PASS |
| gate34-now-readiness-smoke.mjs | Нет файла | TIMEOUT |
| gate4-aware-media-smoke.mjs | FAIL | FAIL |
| gate4-aware-navigation-smoke.mjs | PASS | PASS |
| gate4-company-product-foundation-smoke.mjs | FAIL | FAIL |
| gate4-company-strategic-foundation-smoke.mjs | FAIL | FAIL |
| gate4-duplicate-audit-smoke.mjs | TIMEOUT | TIMEOUT |
| gate4-five-a-smoke.mjs | FAIL | FAIL |
| gate4-funnel-readiness-smoke.mjs | TIMEOUT | TIMEOUT |
| gate4-jtbd-link-id-smoke.mjs | PASS | PASS |
| gate4-paid-smm-smoke.mjs | PASS | PASS |
| gate4-product-id-migration-smoke.mjs | FAIL | FAIL |
| gate4-product-smm-calendar-policy-smoke.mjs | PASS | PASS |
| gate4-product-smm-scope-smoke.mjs | PASS | PASS |
| gate4-product-smm-workspace-v2-smoke.mjs | TIMEOUT | PASS |
| gate4-readiness-product-smoke.mjs | FAIL | FAIL |
| gate4-rsya-ad-prompt-smoke.mjs | FAIL | FAIL |
| gate4-rsya-assets-prompt-smoke.mjs | FAIL | FAIL |
| gate4-rsya-builder-smoke.mjs | FAIL | FAIL |
| gate4-rsya-direct-form-v534-smoke.mjs | FAIL | FAIL |
| gate4-rsya-direct-panel-v533-smoke.mjs | FAIL | FAIL |
| gate4-rsya-exclusions-v536-smoke.mjs | FAIL | FAIL |
| gate4-rsya-foundation-source-smoke.mjs | FAIL | FAIL |
| gate4-rsya-gate1-defaults-smoke.mjs | FAIL | FAIL |
| gate4-rsya-group-card-smoke.mjs | FAIL | FAIL |
| gate4-rsya-group-launch-v537-smoke.mjs | FAIL | FAIL |
| gate4-rsya-guidance-smoke.mjs | FAIL | FAIL |
| gate4-rsya-jtbd-groups-smoke.mjs | FAIL | FAIL |
| gate4-rsya-launch-checklist-smoke.mjs | FAIL | FAIL |
| gate4-rsya-launch-v528-smoke.mjs | FAIL | FAIL |
| gate4-rsya-launch-v541-smoke.mjs | FAIL | FAIL |
| gate4-rsya-metrika-link-smoke.mjs | FAIL | FAIL |
| gate4-rsya-product-id-smoke.mjs | FAIL | FAIL |
| gate4-rsya-project-photo-delete-smoke.mjs | PASS | PASS |
| gate4-rsya-promotion-smoke.mjs | FAIL | FAIL |
| gate4-rsya-start-method-v532-smoke.mjs | FAIL | FAIL |
| gate4-rsya-strategy-v531-smoke.mjs | FAIL | FAIL |
| gate4-rsya-two-step-workflow-smoke.mjs | TIMEOUT | TIMEOUT |
| gate4-search-duplicate-ownership-smoke.mjs | TIMEOUT | TIMEOUT |
| gate4-search-gate1-product-source-smoke.mjs | TIMEOUT | TIMEOUT |
| gate4-search-group-fixation-smoke.mjs | FAIL | FAIL |
| gate4-search-group-metrics-import-export-smoke.mjs | TIMEOUT | TIMEOUT |
| gate4-search-jtbd-audience-forecast-smoke.mjs | TIMEOUT | TIMEOUT |
| gate4-search-jtbd-readiness-smoke.mjs | TIMEOUT | TIMEOUT |
| gate4-search-launch-summary-period-smoke.mjs | TIMEOUT | TIMEOUT |
| gate4-search-launch-visibility-smoke.mjs | FAIL | FAIL |
| gate4-search-save-export-smoke.mjs | TIMEOUT | TIMEOUT |
| gate4-smm-campaign-key-guard-smoke.mjs | TIMEOUT | TIMEOUT |
| gate4-smm-content-system-smoke.mjs | TIMEOUT | TIMEOUT |
| gate4-smm-digestion-smoke.mjs | PASS | PASS |
| gate4-smm-material-foundation-smoke.mjs | PASS | PASS |
| gate4-smm-scenario-smoke.mjs | Нет файла | PASS |
| gate4-smm-strategy-smoke.mjs | TIMEOUT | TIMEOUT |
| gate4-stage-explanations-smoke.mjs | TIMEOUT | TIMEOUT |
| gate4-upstream-integration-smoke.mjs | FAIL | FAIL |
| gate4-upstream-links-smoke.mjs | FAIL | FAIL |
| gate5-snapshot-smoke.mjs | FAIL | FAIL |
| gate6-company-strategic-foundation-smoke.mjs | FAIL | FAIL |
| gate7-company-strategic-foundation-smoke.mjs | FAIL | FAIL |
| gate8-browser-smoke.mjs | TIMEOUT | TIMEOUT |
| gate8-compact-workbench-smoke.mjs | TIMEOUT | TIMEOUT |
| gate8-ui-integration-smoke.mjs | PASS | FAIL |
| gates-3-5-6-7-8-product-scope-smoke.mjs | TIMEOUT | TIMEOUT |
| local-storage-only-smoke.mjs | FAIL | FAIL |
| navigation-url-smoke.mjs | FAIL | TIMEOUT |
| now-guide-smoke.mjs | Нет файла | TIMEOUT |
| other-project-now-guide-smoke.mjs | Нет файла | TIMEOUT |
| preflight-now-guide-smoke.mjs | Нет файла | TIMEOUT |
| product-card-seven-blocks-smoke.mjs | FAIL | FAIL |
| product-card-unified-template-smoke.mjs | PASS | PASS |
| project-passport-baseline-smoke.mjs | FAIL: dataPreserved; повтор PASS | PASS |
| strategic-foundation-hierarchy-smoke.mjs | TIMEOUT | TIMEOUT |
| strategic-foundation-segments-smoke.mjs | PASS | PASS |
| workspace-sync-egress-smoke.mjs | PASS | PASS |
| workspace-sync-retry-smoke.mjs | FAIL | FAIL |


### Новые падения по правилу PASS -> FAIL или TIMEOUT

Всего 8 входных файлов, четыре причины. Исправленный progressMoved в этот список больше не входит.

| Тест | Причина нового падения | Вывод |
| --- | --- | --- |
| company-manual-economics-gate4-strict-smoke.mjs | После location.reload проверка успела прочитать старый state; следующий вызов renderProject попал в ещё не загруженный документ. | Гонка ожидания в тесте. Два повтора текущей сборки PASS. Функциональный дефект приложения не воспроизведён. |
| gate2-metrika-company-product-v361-smoke.mjs | gate2-metrika-company-source-smoke.mjs:150: gate2_service_readiness вместо gate2_setup_wizard. | Устаревшее ожидание модели и фикстуры из 7 wizard-блоков. Это один общий тест через пять входных файлов. |
| gate2-metrika-company-source-smoke.mjs | gate2-metrika-company-source-smoke.mjs:150: gate2_service_readiness вместо gate2_setup_wizard. | Устаревшее ожидание модели и фикстуры из 7 wizard-блоков. Это один общий тест через пять входных файлов. |
| gate2-metrika-goals-quality-smoke.mjs | gate2-metrika-company-source-smoke.mjs:150: gate2_service_readiness вместо gate2_setup_wizard. | Устаревшее ожидание модели и фикстуры из 7 wizard-блоков. Это один общий тест через пять входных файлов. |
| gate2-metrika-product-audit-smoke.mjs | gate2-metrika-company-source-smoke.mjs:150: gate2_service_readiness вместо gate2_setup_wizard. | Устаревшее ожидание модели и фикстуры из 7 wizard-блоков. Это один общий тест через пять входных файлов. |
| gate2-setup-wizard-smoke.mjs | Начальная подготовка и renderGate не отвечают за внутренние 30 с. Последовательный повтор тоже FAIL. Экспорт iCleaning содержит 62 продукта. | Реальный дефект производительности. Профиль: 30,62 с; guruReadinessInspect 26,52 с включительно, guruV194Records 25,21 с. |
| gate2-status-propagation-smoke.mjs | gate2-metrika-company-source-smoke.mjs:150: gate2_service_readiness вместо gate2_setup_wizard. | Устаревшее ожидание модели и фикстуры из 7 wizard-блоков. Это один общий тест через пять входных файлов. |
| gate8-ui-integration-smoke.mjs | Новая проверка 62 продуктов требует saveState < 5000 мс: массовый запуск 6371 мс, последовательный 5849 мс. | Реальная проблема времени сохранения. Старый тест этого порога не проверял. Контроль того же сценария: до 5072 мс, после 7876 мс. |

Общая проверка Метрики до строки 150 проходит и на текущей сборке: миграция целей и ответов сохранена, ready после проверки счётчика, in_progress после изменения id, прежний checklist сохранён. Диагностика после этого ожидания показала: старая модель 7 wizard-блоков, новая 14 видимых сервисных блоков. Заполнение старых семи даёт до 7/7, после 4/14. Старые значения used = no в заменённых wizard-блоках также не равны новому правилу применимости из Gate 0. Простая замена строки модели не исправила бы смысл всего старого сценария. Эти пять входных файлов не правились. Изменение модели находится в gate2-product-services-step4.js:417-454 и пришло с dd9a7f0. Данные диагностики: metrika-diagnostic.json.

У ручной экономики ожидание после reload проверяет наличие state, но не смену документа и загрузку renderProject. Это допускает успешную проверку в старом документе. Два повторных запуска текущей сборки PASS, повтор на baseline PASS. Их журналы и смены контекстов сохранены. Тест не менялся.

### Последовательные повторы без параллельных smoke-тестов

| Тест | Версия | Результат | Секунды |
| --- | --- | --- | ---: |
| project-passport-baseline-smoke.mjs | before | PASS | 6.26 |
| project-passport-baseline-smoke.mjs | after | PASS | 3.15 |
| gate2-setup-wizard-smoke.mjs | before | PASS | 26.88 |
| gate2-setup-wizard-smoke.mjs | after | FAIL | 32.09 |
| gate8-ui-integration-smoke.mjs | after | FAIL | 20.27 |

Gate 8 в последовательном запуске: 62 продукта, статус вычислен за 53 мс, сохранение за 5849 мс, persisted = true. Падение именно по порогу 5000 мс, потери сохранённого описания не выявлено.

Контроль одинакового исходного состояния и сценария «добавить 60 продуктов, прочитать статус, сохранить» без физической записи Storage:

| Версия | Продуктов | Расчёт статуса, мс | Сохранение, мс |
| --- | ---: | ---: | ---: |
| bc42b5b | 62 | 4190 | 5072 |
| Текущая | 62 | 95 | 7876 |

Новый порог сохранения не выполнялся бы и на baseline в этом контрольном сценарии. Текущая сборка сохраняет медленнее, а статус Gate 8 считает быстрее. Это подтверждает существующую проблему производительности и ухудшение времени сохранения в данной пробе; один старый PASS не доказывал выполнения нового порога. Артефакты: save-benchmark-comparison.json, save-benchmark-comparison-under-load.json, save-benchmark-after.json.

### Причина задержки Gate 2

Профилировался точный начальный callback текущего gate2-setup-wizard-smoke.mjs. Он завершился за 30620 мс и вернул 62 продукта, 72 сохранённые записи карточек, сохранённые historical answer и retired answer. Экспорт-фикстура iCleaning от 2026-10-20 уже содержал эти 62 продукта до запуска, его файл не изменён тестами.

Включительное время в стеке: nowGuideGate12WithView 28,84 с, guruReadinessInspect 26,52 с, guruV194Records 25,21 с. Самостоятельное время map внутри guruV194Records, app.js:52722, 11,53 с. Дополнительно около 8,04 с суммарного самостоятельного времени у readOnly и ловушек proxy app.js:2226-2238. Рендер тратит основное время на повторную нормализацию записей и чтение через защитный proxy. Это измеренная причина выхода за внутренний лимит 30 с. Приложение не исправлялось, поскольку это запрещено текущей задачей. Профиль: gate2-seed.cpuprofile; сводки: gate2-seed-profile-summary.json, gate2-profile-inclusive.json.

## 5. Экспорты трёх проектов

Два разных результата:

1. Исходные файлы снимков на диске побайтно идентичны до и после всех тестов. Они только читались. Записи в исходные хранилища и облако не выполнялись.
2. Полный экспорт копии workspace после обычного просмотра паспорта, схемы, расчёта готовности, стратегии продукта и прямого открытия Gate 0-4 НЕ идентичен исходному состоянию копии. Это воспроизводится на обеих сборках. Широкое условие «просмотр любого экрана не меняет данные» не выполнено.

Хеши ниже считаются от JSON.stringify({workspace: guruExportDiagnosticCloneV223(state)}). Никакие поля, включая updated_at, не исключались. Штатная миграция выполнена до первого хеша, чтобы отдельно измерить эффекты просмотра. SHA исходного экспорта до миграции также сохранён в exports.json. Все записи при расширенном аудите перехвачены, изменялась только копия в памяти.

| Проект и версия | SHA-256 до просмотра | SHA-256 после просмотра | Идентичны |
| --- | --- | --- | --- |
| icleaning, before | 138bda181100d3e5dfa2e3c99179d0e879be17f0850694b7acf7e31d715c13e7 | d955c1e1dc0c04d7ca304e349c5ccc729acfbc59969c9470c5fcff9b2f30c893 | Нет |
| sivrce, before | 69bddc543e064236b0b409ab4861c949b7bf964bdc2efafc045ce293642e2e7a | afbe57adef7a2cd1a29f27e242caa41fb3cda1078aec69fbb78fceee65c33aaf | Нет |
| guru, before | fce1d421afe51529d75cba1444e436ca8d9dab6e176ccde4a088e496659c40f5 | e910f77caa87b8ed7ef05e36a53da9cd282ed0cb128b72f8da860243ea6f53ac | Нет |
| icleaning, after | b43ae957191c5b1773881308f1b056bd7a3c12389038b63583d98ff4a59c2f84 | 0005da5facbf38e4998df3ccdbaf45378f5d7a5b571bffbe139dc5b7d7df01e1 | Нет |
| sivrce, after | 1459f3f26b3b76a68a53def8268ebd8bfd80b1c46e55dfabb40bf4c8d8cae170 | ad51f1c93b20960d006823adb042a3c463fd88c732098286cdb854573f4973e7 | Нет |
| guru, after | e36f63a6bd01c4061b667c69f13ccafe80d8b9bdf907cf0cd0c9ee4424d47243 | 9104f3cea988d467e6a577a6979e5f54fac3fa675f8df7efe6427140e176318c | Нет |

Побайтная неизменность исходных файлов:

| Исходный файл проекта | SHA-256 до и после, одинаковый |
| --- | --- |
| icleaning | a1baa877f77727f7813f80cc0749763bd5122f8f56d48136fa1527542ea19c71 |
| sivrce | 59c7656d64ab0f86da8791c2531768249d6feb64b40673ed174654ea650c413c |
| guru | 847765127374ca95d9db93631e5c416b1d1b2518e56f6754a6b7b6ae058a2360 |

Источники: локальные полные снимки iCleaning от 2026-10-13, SIVRCE от 2026-09-01, ГУРУ от 2026-07-12 из предыдущей проверки. Свежесть облака не подтверждалась. Отдельные экспорты Gate 0/2 iCleaning для smoke-тестов новее и содержат 62 продукта; это другой набор фикстур. Полные источники и даты перечислены в artifacts/step6-source-manifest.json.

### Что менялось в копиях при чтении

- iCleaning: pv140ProductStrategyHtml через существующие читатели создаёт продуктовые JTBD и scope/override-записи; прямой Gate 1 создаёт настройки представления, Gate 2 добавляет пустые g2Check/g2Source, Gate 3 инициализирует структуру и журнал связи, Gate 4 создаёт карту раскрытий.
- SIVRCE: чтение отдельных гейтов инициализирует Gate 8, прямой Gate 0 добавляет gateId/gateTitle и пересчитывает старые статусы, Gate 1 создаёт настройки и поля старых таблиц, Gate 2 добавляет пустые g2Check/g2Source.
- ГУРУ: паспорт создаёт ui.gate0Diagnostics и пересчитывает старую карточку; прямой Gate 1 и последующие рендеры заново создают id пустой строки card-22; также появляются старые настройки и поля Gate 2/7/8.

Это существовавшие до путеводителя эффекты старых ensure/read-функций. Проверка не позволяет объявить все обычные экраны чистыми при чтении. Подробные пути до/после, без фильтра полей, в exports.json. Защищённые переходы путеводителя из шага 6 не заменяют эту расширенную проверку.

### Изменения вне карточки путеводителя: было и стало

| Область | Было | Стало | Проверка данных |
| --- | --- | --- | --- |
| Подпись паспорта | «Готовность проекта», сохранённые карточки | «Карточек заполнено», тот же карточный показатель | Просмотр проверен на трёх копиях; у ГУРУ есть старые побочные записи рендера |
| Подписи схемы | «Прогресс по Gate», «блоков готово» в базовом рендере | «Заполнение карточек по Gate», «карточек заполнено» в базовом рендере; специализированные надписи Gate 2 продолжают брать его рабочие блоки | Сам renderScheme в расширенном сценарии не менял workspace |
| Общая готовность | Общий старый реестр всех гейтов | Предполётный путь Gate 0-3 и выбранные группы Gate 4 | Проверены общий расчёт и счётчики всех гейтов; отдельные старые счётчики Gate 7/8 инициализируют данные |
| Фильтр product_id | Пустой id либо совпадение с categoryId | Дополнительно совпадение с productId | Чтение стратегии продукта проверено; старый ensure-читатель iCleaning создаёт записи и на baseline |
| Раскрытие секций | Читатели инициализируют сохранённые карты раскрытий | У путеводителя временное раскрытие; при явном клике Gate 0 инициализируются существующие карты | Прямые рендеры проверены; старые карты по-прежнему появляются. Явный клик сохраняет UI-настройку и не выдаётся за неизменный экспорт |
| Кэш saveState | Кэш одного renderGate | Тот же механизм на один синхронный saveState | На одинаковых копиях результат с кэшем и без кэша идентичен для всех трёх проектов |

Для сравнения сохранения с кэшем и без него зафиксированы время и последовательность случайных id; после каждого вызова проверено освобождение кэша. Это проверка эквивалентности двух вариантов сохранения. Она не утверждает, что сам saveState не меняет данные или даты.

| Проект | SHA-256 после сохранения с кэшем и без кэша | Совпадает |
| --- | --- | --- |
| icleaning | f23af4d6fdad0073c6ca648fc2f442f6d342116396a77fa737569f117b869500 | Да |
| sivrce | 0d68b0f54ac7235e525392a044f08024d529450e7a9c927e9082bcd68f94339f | Да |
| guru | ff2c7d399dbf2fd2031fc36d27c341fccda248a090be9775501b6d24eff21361 | Да |

## Реальные неисправленные проблемы

- Gate 2: вычисление готовности и начальный рендер на экспортной копии iCleaning с 62 продуктами занимают около 30 с. Профиль локализует повторную нормализацию в guruV194Records через guruReadinessInspect. Последовательный smoke падает на 30-секундном CDP-ожидании.
- Сохранение 62 продуктов превышает новый порог 5 с: 5,849 с в последовательном полном Gate 8 smoke. Контроль общего сценария показал проблему и до путеводителя, а текущая сборка в этой пробе сохраняет медленнее.
- Обычные экраны вне защищённого перехода путеводителя меняют workspace при чтении. Экспорты трёх копий отличаются и на baseline. Неизменность всех данных при обычном просмотре не подтверждена.

Пять падений Метрики относятся к одному устаревшему контракту. Первичное падение ручной экономики относится к ожиданию reload в тесте. Они не перечислены как пять или шесть доказанных новых дефектов приложения.

## Изменённые файлы и границы проверки

Единственный изменённый исходный файл в этой задаче: scripts/project-passport-baseline-smoke.mjs. git diff b14370c..HEAD по runtime-файлам пуст. Добавлены отчёт и артефакты в artifacts/step7-continuation/. Приложение, SMM-стратегия и структуры рекламных каналов этим шагом не менялись.

Не проверено или не завершено из-за результатов тестов:

- В тестах с FAIL/TIMEOUT не выполнены assertions после точки падения. Сам запуск всех файлов завершён, это не равнозначно прохождению всех сценариев.
- У 15 новых файлов нет исторического запуска на bc42b5b, потому что их там нет.
- Некоторые старые тесты блокируются на alert об отсутствующей локальной копии: они создают только запись реестра без workspace. Журнал браузера подтверждает этот источник таймаутов.
- Отсутствуют старые фикстуры /private/tmp/guru-g4-four-projects-v523.json и /tmp/guru-rsya-search-baseline.json. Ряд проверок РСЯ останавливается с ENOENT на обеих версиях. Данные для их обхода не выдумывались.
- Полноценный новый контракт Метрики не переписан; разрешена правка только теста паспорта. Диагностические фазы выполнены отдельно.
- Свежесть облачных проектов, удалённые коммиты, деплой, версия продакшена и продакшен-интерфейс не проверялись. Часть B запрещена этим заданием и не запускалась.

Итог: исправление теста паспорта корректно и зафиксировано отдельно. Полный прогон имеет новые падения и подтверждённые проблемы производительности, широкое условие неизменности экспорта не выполнено. Публикация не выполнялась.
