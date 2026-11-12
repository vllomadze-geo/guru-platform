import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../gate1-product-comparison-criteria.js', import.meta.url), 'utf8');
let saves = 0;
const context = vm.createContext({
  document: { addEventListener() {} },
  flashSaving() { saves++; },
  g1BergenTypeV543(competitor) { return competitor.type; },
  g1BergenMatchedJtbdCountV581(competitor) { return competitor.matches || 0; },
  g1BergenFieldV543(competitor, key) { return `<input value="${competitor.bergenV543?.[key] || ''}">`; },
  escapeHtml(value) { return String(value); },
  STATUS_LABELS: { ready: 'Готово', in_progress: 'В работе' },
});
vm.runInContext(`${source}\n globalThis.criteriaTest = {
  definitions: G1PC_CRITERIA_V603,
  answer: g1pcCriteriaAnswerV603,
  stats: g1pcCriteriaStatsV603,
  legacy: g1pcCriteriaLegacyFieldsV603,
  repair: g1pcRepairDeliveryV603,
};`, context);
const { definitions, answer, stats, legacy, repair } = context.criteriaTest;
assert.equal(definitions.length, 10);
assert.deepEqual(Array.from(definitions, row => row.group), [1, 1, 1, 1, 1, 2, 2, 2, 2, 2]);
const entry = { comparisonCriteriaV603: { own: {} } };
const direct = { id: 'direct', type: 'direct', matches: 1, bergenV543: {
  taskClosure: 'Лучше / Так же / сохранённый текст',
}, stepsV539: { 5: { jtbdFunctional: 'Исходная задача клиента без изменений' } } };
const substitute = { id: 'substitute', type: 'substitute', matches: 0 };
const sources = Object.fromEntries(definitions.map(row => [row.source, { text: row.group === 2 ? 'Источник' : '' }]));
const jtbds = [{ id: 'jtbd-1' }];
const task = definitions.find(row => row.id === 'task');
const audience = definitions.find(row => row.id === 'audience');
assert.equal(answer(entry, direct, audience, sources.segment, jtbds), 'yes');
assert.equal(answer(entry, direct, audience, sources.segment, []), 'unknown');
assert.equal(answer(entry, substitute, task, sources.jtbd, jtbds), 'not_required');
assert.equal(answer(entry, null, task, sources.jtbd, jtbds), 'yes');
assert.equal(answer(entry, direct, task, sources.jtbd, jtbds), 'unknown');
assert(legacy(direct, audience).includes('Исходная задача клиента без изменений'));
assert(legacy(direct, task).includes('Лучше / Так же / сохранённый текст'));

let result = stats(entry, [direct, substitute], sources, jtbds);
assert.equal(result.byCompetitor.get('direct').missing, 9);
assert.equal(result.byCompetitor.get('substitute').missing, 4);
assert.equal(result.status, 'in_progress');
direct.comparisonCriteriaV603 = { answers: { task: 'no' } };
entry.comparisonCriteriaV603.own.task = 'yes';
result = stats(entry, [direct, substitute], sources, jtbds);
assert.equal(result.byCompetitor.get('direct').up, 1);
assert.equal(result.byCompetitor.get('direct').down, 0);
assert.equal(result.byCompetitor.get('substitute').up, 0);
entry.comparisonCriteriaV603.own.task = 'no';
direct.comparisonCriteriaV603.answers.task = 'yes';
result = stats(entry, [direct, substitute], sources, jtbds);
assert.equal(result.byCompetitor.get('direct').up, 0);
assert.equal(result.byCompetitor.get('direct').down, 1);
for (const criterion of definitions) {
  if (criterion.group === 2) entry.comparisonCriteriaV603.own[criterion.id] = 'yes';
  direct.comparisonCriteriaV603.answers[criterion.id] = 'yes';
  (substitute.comparisonCriteriaV603 ||= { answers: {} }).answers[criterion.id] = 'yes';
}
result = stats(entry, [direct, substitute], sources, jtbds);
assert.equal(result.status, 'ready');
assert.equal(result.answered, result.total);
const persisted = JSON.parse(JSON.stringify({ entry, direct, substitute }));
assert.equal(persisted.direct.comparisonCriteriaV603.answers.task, 'yes');
assert.equal(persisted.entry.comparisonCriteriaV603.own.task, 'yes');

const damaged = 'Провери��, бережно упакуем и поможем получить его вовремя';
const repaired = 'Проверим, бережно упакуем и поможем получить его вовремя';
const workspace = { gates: [{ row: { productDeliveryGuaranteeV253: damaged, other: 'Не менять' } }], gate: null, structure: null };
repair(workspace);
assert.equal(workspace.gates[0].row.productDeliveryGuaranteeV253, repaired);
assert.equal(workspace.gates[0].row.other, 'Не менять');
repair(workspace);
assert.equal(saves, 1);
console.log(JSON.stringify({ criteria: definitions.length, groups: 2, legacyPreserved: true,
  substituteNotRequired: true, advantageAndDisadvantage: true, readinessAndPersistence: true,
  exactTextRepair: true }));
