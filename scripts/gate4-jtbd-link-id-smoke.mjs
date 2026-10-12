import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const start = app.indexOf("function g4sbSegmentJtbdLinkKey(");
const end = app.indexOf("// ---- Кластеры", start);
assert.ok(start >= 0 && end > start, "Gate 4 JTBD link resolver missing");
const context = { globalThis: {} };
vm.runInNewContext(`${app.slice(start, end)}\n` +
  "globalThis.resolve = g4sbSegmentJtbdIdsV521;", context);
const resolve = context.globalThis.resolve;

const exportPath = process.env.GURU_GATE4_EXPORT ||
  "/Users/vl/Downloads/gate-4.json";
const payload = JSON.parse(await readFile(exportPath, "utf8"));
const productId = "catalog-item-1786792591872-51f503";
const build = structuredClone(payload.content.gate4SearchBuild
  .catalog_item_1786792591872_51f503);
const legacyBefore = JSON.stringify(build.segmentJtbdLinks);
const groupsBefore = JSON.stringify(build.groupRows);
const primaryId = `primary:${productId}`;
const firstAdditional = "additional-jtbd-1788615285799-9a35ef";
const secondAdditional = "additional-jtbd-1788609074828-88a3f1";

// An unrelated blank Gate 1 form occupies index 1. Recovered saved forms
// receive display indices 2 and 3, while the legacy link remains [0, 2, 1].
const choices = [
  { index: 0, id: primaryId, text: "Основной JTBD" },
  { index: 2, id: firstAdditional, text: "Сохранённый JTBD 1",
    source: "gate4-saved" },
  { index: 3, id: secondAdditional, text: "Сохранённый JTBD 2",
    source: "gate4-saved" },
];
const ids = resolve(productId, productId, "__jtbd__", build, choices);
assert.deepEqual([...ids], [primaryId, firstAdditional, secondAdditional]);
assert.equal(JSON.stringify(build.segmentJtbdLinks), legacyBefore,
  "reading rewrote legacy numeric links");
assert.equal(JSON.stringify(build.groupRows), groupsBefore,
  "reading rewrote saved Search groups");

// New edits are addressed by ID and must not re-enable an unselected
// numeric legacy link. A saved group remains linked while it exists.
build.segmentJtbdIdsV521 = {
  [`${productId}::__jtbd__`]: [primaryId],
};
assert.deepEqual([...resolve(productId, productId, "__jtbd__", build, choices)],
  [primaryId, firstAdditional, secondAdditional]);
assert.equal(JSON.stringify(build.segmentJtbdLinks), legacyBefore);

const blankItemGroup = structuredClone(build);
delete blankItemGroup.segmentJtbdIdsV521;
blankItemGroup.groupRows = [{
  itemId: "", segmentIndex: "__jtbd__", mainJtbdIndex: 2,
  jtbdId: firstAdditional,
}, {
  itemId: "catalog-item-unrelated", segmentIndex: "__jtbd__",
  mainJtbdIndex: 1, jtbdId: secondAdditional,
}];
blankItemGroup.segmentJtbdLinks = {
  [`${productId}::__jtbd__`]: [2, 1],
};
const blankBefore = JSON.stringify(blankItemGroup);
assert.deepEqual([...resolve(productId, productId, "__jtbd__",
  blankItemGroup, choices)], [firstAdditional]);
assert.deepEqual([...resolve("catalog-item-other-branch", productId,
  "__jtbd__", blankItemGroup, choices)], [],
  "a blank itemId was claimed by a different product branch");
assert.equal(JSON.stringify(blankItemGroup), blankBefore,
  "blank-id legacy resolution mutated the saved branch");

console.log(JSON.stringify({ productId, legacy: build.segmentJtbdLinks,
  resolvedJtbdIds: ids, sourceUnchanged: true }, null, 2));
