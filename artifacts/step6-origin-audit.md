# Происхождение записей при просмотре

Код и исходные данные в этом аудите не менялись. Для запуска старой сборки использован git archive во временный каталог, без checkout или stash рабочего дерева. Добавлены только этот отчёт и JSON результатов.

## Сравнение

До первого коммита путеводителя dd9a7f0: bc42b5b058983ae74231649be035c5e066c80b1d.
Текущая сборка: b14370cb3010ee3e979f947acfbf0af951f21986.
В старом коммите отсутствуют now-guide.js и nowGuideBuildPath. Пробы выполнены на копиях трёх сохранённых снимков в отдельных BrowserContext; сетевые API-записи отключены, обработчики сохранения на время вызовов подавлены.

## Что воспроизведено до путеводителя

- iCleaning: g2EnsureFields дописывает fields.g2Check и fields.g2Source, если их нет. Прямой вызов для старых карточек дал 44 добавленных значения. gate1LandingViewV234 создаёт ui.gate1LandingContinuumV234.byProduct[product_id], guruApplyDisclosureStateV512 создаёт ui.g1DisclosureOpenV512. Эти функции в app.js имеют одинаковые тела в bc42b5b и текущем коммите.
- SIVRCE: после штатной миграции allCardsFromWorkspace дописывает 50 значений gateId/gateTitle в старые карточки. Цикл пересчёта карточек Gate 0, который выполнялся при показе страницы уже до путеводителя, меняет card-7.status из ready в in_progress. Проба выполнялась с исходным project_id.
- ГУРУ: после штатной миграции и одного подготовительного чтения следующий вызов guruCategoryAuditRowsV491 меняет только card-22.pageRows[0].id. Цепочка существовала до путеводителя: renderGate -> guruCategoryAuditRowsV491 -> guruCatalogHubSplitV496 / recalculateStatusForCard -> ensureGate1TypedData -> createPageStructureRow. На исходном снимке без продуктов пустая строка заново создаётся при чтении.

Все три побочных записи существовали до путеводителя. Путеводитель вызывал старые функции без полной изоляции чтения, что было ошибкой его интеграции. Пробы доказывают происхождение записей функций; полный пользовательский сценарий старой сборки здесь не прогонялся.

## Граница исправления шага 6

В now-guide.js перерисовка назначения ограничена условием activeView === gate, activeGateId === nowGuideProtectedGate и отсутствием обработки пользовательского ввода guruUserEditDispatchActive. Пока этот гейт активен, защита распространяется и на последующие перерисовки. Для Gate 0 и Gate 2 расширена существующая изоляция renderGateTable. gate1ApplyLandingViewV234, guruCategoryAuditRowsV491 и guruApplyDisclosureStateV512 при этих условиях читаются на копии; отложенные записи рендера подавляются. Старые функции записи не переписаны. Это исправление не устраняет старые побочные записи при обычном прямом открытии гейта, который не выбран через путеводитель.

В app.js две строки находятся в общем обработчике клика раздела Gate 0, внутри renderGateTable. Он создаёт существующие _gate0Open и _gate0SectionsOpen, если их нет. У этого обработчика нет проверки на путеводитель. Следовательно, его поведение изменилось и при обычном раскрытии раздела: отсутствующие настройки инициализируются вместо ошибки. Если настройки уже есть, результат прежний.

## Diff шага 6

```text
 app.js                                    |   2 +
 now-guide.js                              |  35 ++++-
 scripts/other-project-now-guide-smoke.mjs | 217 ++++++++++++++++++++++++++++++
 3 files changed, 253 insertions(+), 1 deletion(-)
```

Полный diff app.js шага 6:

```diff
diff --git a/app.js b/app.js
index 3bd6796..19a5fc4 100644
--- a/app.js
+++ b/app.js
@@ -20284,6 +20284,8 @@ renderGateTable = function (gate, cards) {
       button.addEventListener("click", () => {
         const sectionKey = button.dataset.gate0SectionToggle;
         const open = button.getAttribute("aria-expanded") !== "true";
+        state._gate0Open ||= {};
+        state._gate0SectionsOpen ||= {};
         gate0SetSectionOpen(sectionKey, open, true);
         state._gate0SectionsOpen[sectionKey] = open;
         guruScheduleUiPreferenceSave();
```

Затронута одна именованная функция app.js: renderGateTable; внутри неё изменён анонимный обработчик click для [data-gate0-section-toggle]. gate0SetSectionOpen и guruScheduleUiPreferenceSave вызываются как прежде, их тела этим коммитом не менялись.

## Вся серия путеводителя от bc42b5b

```text
 app.js | 496 +++++++++++++++++++++++++++++++++++++++++++++++++----------------
 1 file changed, 378 insertions(+), 118 deletions(-)
```

Эта более широкая разница включает предыдущие шаги. Вне карточки «Сейчас» уже менялись подписи паспорта и схемы, отображение статусов Gate 0, фильтрация стратегии по product_id, чтение и раскрытие секций, общий расчёт готовности и кэширование чтений при сохранении. Поэтому утверждение, что за всю серию поведение вне путеводителя совсем не менялось, было бы неверным.

Именованные функции app.js, добавленные или изменённые за всю серию (повторные определения объединены по имени):

- `saveState`
- `guruReadinessValue`
- `guruReadinessInspect`
- `projectPassportOverviewFields`
- `renderGate`
- `renderGate1Accordion`
- `renderGateTable`
- `renderScheme`
- `v22GetFieldValue`
- `gate7SectionHtml`
- `bindGate7Journal`
- `searchFocusStatus`
- `currentOffersCtaStatus`
- `v116Status`
- `gate0CardHtml`
- `bindGate0CardTogglesV527`
- `gate0RefreshStatuses`
- `ensureMegaMarketing`
- `megaMarketingStatus`
- `sslV130Checks`
- `consentV130BlockStatus`
- `pv140ProductMapHtml`
- `pv140ProductStrategyHtml`
- `uv130StepStatus`
- `getGate2AccordionState`
- `bindGate2Events`
- `g1CollapsedSet`
- `g4CampaignStatus`
- `g4sbCampaignStatus`
- `guruGateBlockStatuses`
- `projectComparisonStatus`
- `targetAudienceSegmentProgress`
- `g8ProjectGoalStatus`
- `guruV194JtbdRecordHtml`
- `guruV194OfferCoreIsComplete`
- `guruV194OfferIsComplete`
- `guruV308CompanyPositioningStatus`
- `guruV349CompanyBrandPurposeStatus`
- `guruCompanyOfferCompleteV360`
- `guruV347CompanyOfferStatus`
- `guruCompanySegmentCompleteV360`
- `guruV309CompanySegmentationStatus`
- `guruCompanyKeywordFoundationStatusV351`
- `guruGate0BlockReadiness`
- `guruGate0ProductBlockStatus`
- `guruV194PassportFields`
- `g3ProductJourneyPrepareSource`
- `gate1CompanyDemandPositioningCompletionV357`
- `gate1WriteLinkLogSnapshot`
- `guruCreateRenderReadCacheV470`
- `guruGateScopeSetInnerV526`
- `guruSyncGateScopeV526`

Также затронут обработчик document.addEventListener("toggle") для [data-gate0-company-offer-entry] и общая константа GURU_GATE0_JTBD_EDITOR_FIELDS.

## Скриншоты

Использованы три скриншота проверенной текущей сборки из шага 6, новые снимки старой сборки не выдаются за текущие:

- step6-now-guide-icleaning.png
- step6-now-guide-sivrce.png
- step6-now-guide-guru.png
