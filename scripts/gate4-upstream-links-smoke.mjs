import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  guruGate4SavedGroupsV519,
  guruGate4ProductProjectionV519,
  guruGate4PhraseRowsV519,
} = require("../gate4-upstream-links.js");

const exportPath = process.env.GURU_GATE4_EXPORT || "/Users/vl/Downloads/gate-4.json";
if (!existsSync(exportPath)) throw new Error(`Gate 4 export unavailable: ${exportPath}`);
const exported = JSON.parse(readFileSync(exportPath, "utf8"));
const workspace = structuredClone(exported.content);
const before = JSON.stringify(workspace);
const goatId = "catalog-item-1786792591872-51f503";
const upcyclingId = "catalog-item-1786792591872-c8b1e9";

const goat = guruGate4ProductProjectionV519(goatId, workspace);
assert.equal(goat.groups.length, 3);
assert.equal(goat.phrases.length, 83);
assert.equal(goat.groups.reduce((total, group) => total + group.demandRows.length, 0), 83);
assert.ok(goat.groups.every((group) => group.itemId === goatId));
assert.ok(goat.groups.every((group) => group.jtbdId));
assert.ok(goat.phrases.some((row) => row.kw === "символ 2027 года коза"
  && row.vol === "206" && row.forecastClicks === "7"
  && row.forecastBudget === "148.40"));

const upcycling = guruGate4ProductProjectionV519(upcyclingId, workspace);
assert.equal(upcycling.groups.length, 1);
assert.equal(upcycling.groups[0].legacyBlankItemIdV519, true);
assert.equal(upcycling.groups[0].itemId, upcyclingId);
assert.equal(upcycling.groups[0].demandRows.length, 27);
assert.equal(upcycling.phrases.length, 26);
assert.equal(JSON.stringify(workspace), before, "projection must not mutate the export");

goat.groups[0].demandRows[0].kw = "modified projection";
goat.phrases[0].vol = "modified projection";
assert.equal(JSON.stringify(workspace), before, "returned rows must not alias the export");

const synthetic = {
  gate4SearchBuild: {
    product_1: {
      groupRows: [
        { groupId: "g1", itemId: "", col0: "First", jtbdId: "jtbd-1",
          demandRows: [{ kw: "Ёлка-игрушка", vol: "", forecastClicks: "2" }] },
        { groupId: "g2", itemId: "product-1", col0: "Second", jtbdId: "jtbd-2",
          demandRows: [{ kw: "елка игрушка", vol: "4", forecastClicks: "3" }] },
        { groupId: "foreign", itemId: "product-2", col0: "Foreign",
          demandRows: [{ kw: "leak", vol: "999" }] },
      ],
      clusters: [
        { id: "g1", itemId: "", name: "Duplicate storage",
          demandRows: [{ kw: "duplicate cluster", vol: "1" }] },
        { id: "g3", itemId: "", name: "Cluster fallback",
          demandRows: [{ kw: "fallback", vol: "5" }] },
      ],
      jtbdDraftsV388: { draft: { keywordRows: [{ kw: "draft leak", vol: "1" }] } },
    },
  },
};
const syntheticBefore = JSON.stringify(synthetic);
const groups = guruGate4SavedGroupsV519("product-1", synthetic);
const phrases = guruGate4PhraseRowsV519("product-1", synthetic);
const full = guruGate4ProductProjectionV519("product-1", synthetic);
assert.deepEqual(groups.map((group) => group.groupId), ["g1", "g2", "g3"]);
assert.deepEqual(phrases.map((row) => row.kw), ["Ёлка-игрушка", "fallback"]);
assert.equal(phrases[0].vol, "4", "a populated later metric fills an empty first value");
assert.deepEqual(phrases[0].groupIds, ["g1", "g2"]);
assert.deepEqual(phrases[0].jtbdIds, ["jtbd-1", "jtbd-2"]);
assert.equal(full.conflicts.length, 1, "different populated metrics are reported");
assert.equal(JSON.stringify(synthetic), syntheticBefore);

console.log(JSON.stringify({
  export: exportPath,
  goat: { groups: goat.groups.length, phrases: goat.phrases.length, conflicts: goat.conflicts.length },
  upcycling: { groups: upcycling.groups.length, phrases: upcycling.phrases.length,
    legacyBlankItemId: upcycling.groups[0].legacyBlankItemIdV519 },
  synthetic: { groups: groups.length, phrases: phrases.length, conflicts: full.conflicts.length },
  sourceUnchanged: true,
}, null, 2));
