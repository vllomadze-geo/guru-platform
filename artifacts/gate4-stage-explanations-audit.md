# Gate 4 · академические пояснения этапов 5A — v2.3.97

Дата проверки: 2026-09-08.

## READ / WRITE

- Заголовки пяти этапов Gate 4 рендерятся в `g4FunnelStageHtmlV294`.
- «Вне воронки — предусловие» рендерится отдельно и пояснение 5A не получает.
- Gate 3 и Gate 4 используют один источник текстов `GATE3_5A_STAGE_EXPLANATIONS_V296`, один HTML-компонент `g3ProductJourneyStageExplanationHtmlV296` и один CSS-класс `g3-product-journey-stage-explanation-v296`.
- Новые тексты и новые стили для Gate 4 не создавались.

## VERIFY

- Порядок разделов: `outside → aware → appeal → ask → act → advocate`.
- Подсказки Aware, Appeal, Ask, Act и Advocate видны непосредственно под заголовком.
- Все пять текстов посимвольно совпадают с текстами Gate 3.
- Размер текста — `12px`, цвет — общий приглушённый `var(--muted)`.
- У раздела «Вне воронки» подсказка отсутствует.
- Сохранены 23 карточки readinessV225 и 15 фактических каналов кампаний.
- Ошибок браузерного выполнения нет.

Проверка: `node scripts/gate4-stage-explanations-smoke.mjs`.
