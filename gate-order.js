/* Единый источник порядка, номеров и названий гейтов.

   Навигация, заголовки, подписи «Gate N», проводник «Сейчас» и экспорты
   берут порядок и номер только отсюда. Внутренние id (gate-0…gate-8) — это
   стабильные метки хранения: они остаются в данных проектов, URL и ключах
   без изменений и больше не означают отображаемый номер. Сохранённые
   gate.title и card.gateTitle не переписываются; на экран выводится
   название из этого списка. */
const GURU_GATE_ORDER = Object.freeze([
  Object.freeze({ id: "gate-0", number: 0, name: "Точка отсчёта" }),
  Object.freeze({ id: "gate-1", number: 1, name: "Аналитика" }),
  Object.freeze({ id: "gate-2", number: 2, name: "Готовность к трафику" }),
  Object.freeze({ id: "gate-4", number: 3, name: "Реализация" }),
  Object.freeze({ id: "gate-5", number: 4, name: "Оценка и оптимизация (постоянная петля)" }),
  Object.freeze({ id: "gate-3", number: 5, name: "Стратегия" }),
  Object.freeze({ id: "gate-8", number: 6, name: "Прогноз и моделирование" }),
  Object.freeze({ id: "gate-6", number: 7, name: "Маркетинговый календарь событий" }),
  Object.freeze({ id: "gate-7", number: 8, name: "Отчёты и журнал выполнения" }),
]);

const GURU_GATE_BY_ID = new Map(GURU_GATE_ORDER.map((gate) => [gate.id, gate]));

function guruGateMeta(gateId) {
  return GURU_GATE_BY_ID.get(String(gateId || "")) || null;
}

// Позиция гейта в порядке прохождения; неизвестные id идут в конце.
function guruGatePosition(gateId) {
  const meta = guruGateMeta(gateId);
  return meta ? meta.number : GURU_GATE_ORDER.length;
}

// «Gate 3» — короткая подпись для ссылок и источников.
function guruGateLabel(gateId) {
  const meta = guruGateMeta(gateId);
  return meta ? `Gate ${meta.number}` : "Gate";
}

// «3. Реализация» — заголовок гейта в меню и на странице.
function guruGateTitle(gateOrId) {
  const id = typeof gateOrId === "string" ? gateOrId : gateOrId?.id;
  const meta = guruGateMeta(id);
  if (meta) return `${meta.number}. ${meta.name}`;
  return typeof gateOrId === "string" ? gateOrId : String(gateOrId?.title || "");
}

// Копия массива гейтов в порядке прохождения. Сам массив в данных не
// переставляется.
function guruOrderedGates(gates) {
  return [...(gates || [])]
    .map((gate, index) => [gate, index])
    .sort((a, b) => guruGatePosition(a[0]?.id) - guruGatePosition(b[0]?.id) || a[1] - b[1])
    .map(([gate]) => gate);
}
