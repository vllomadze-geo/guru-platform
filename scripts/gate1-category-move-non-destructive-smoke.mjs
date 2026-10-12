import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("../app.js", import.meta.url), "utf8");
const start = source.indexOf("function gate1PainHasDataV237(");
const end = source.indexOf("/* Список товаров направления", start);
assert(start >= 0 && end > start, "Gate 1 migration functions not found");

const categories = [
  { id: "cat-a", name: "Категория А" },
  { id: "cat-b", name: "Категория Б" },
];
const product = { id: "prod-1", name: "Товар", categoryIds: ["cat-b"] };
class SameMillisecondDate extends Date {
  constructor(...args) {
    super(...(args.length ? args : ["2026-10-05T12:00:00.000Z"]));
  }
  static now() {
    return Date.parse("2026-10-05T12:00:00.000Z");
  }
}
const context = vm.createContext({
  structuredClone,
  Date: SameMillisecondDate,
  GATE1_PAIN_PRODUCT_ID_STORAGE_V237: "test-migration",
  GATE1_PAIN_SHIRT_PRODUCT_ID_V237: "other-product",
  GATE1_PAIN_SHIRT_MAIN_QUERY_V237: "",
  guruV185Text: (value) => String(value ?? "").trim(),
  guruV194Products: () => [product],
  guruV188PositionRows: () => [],
  guruV185ProductById: (id) => categories.find((row) => row.id === id),
  guruV185ProductByName: (name) =>
    categories.find((row) => row.name === name),
  megaPlatformProductCategoryIds: (row) => row.categoryIds,
  pv140EmptyProductMap: () => ({ product: "", initialOffer: "" }),
  pv181KeywordText: (value) => String(value ?? ""),
});
vm.runInContext(source.slice(start, end), context);
const migrate = vm.runInContext("gate1PainMigrateWorkspaceV237", context);

const workspace = {
  project: {},
  painV130: {
    productMaps: [
      {
        product: "Категория А",
        product_id: "cat-a",
        items: {
          "prod-1": {
            product_id: "prod-1",
            semL4Model: { mainJtbd: "JTBD из А", additionalJtbds: [] },
            demandRows: [{ kw: "важная фраза", vol: 42 }],
          },
        },
      },
      { product: "Категория Б", product_id: "cat-b", items: {} },
    ],
  },
};

const first = migrate(workspace);
const rowA = workspace.painV130.productMaps[0];
const rowB = workspace.painV130.productMaps[1];
assert(first.changed && first.relocatedCategoryItems.length === 1);
assert.equal(rowA.items["prod-1"], undefined);
assert.equal(rowB.items["prod-1"].semL4Model.mainJtbd, "JTBD из А");
assert.equal(rowB.items["prod-1"].demandRows[0].vol, 42);
assert.equal(
  rowA.legacyPageItemsV237["prod-1"].data.semL4Model.mainJtbd,
  "JTBD из А",
);
assert.equal(migrate(workspace).changed, false, "migration must be idempotent");

// Clearing a field in the destination must not replay the old archive.
rowB.items["prod-1"].semL4Model.mainJtbd = "";
assert.equal(migrate(workspace).changed, false);
assert.equal(rowB.items["prod-1"].semL4Model.mainJtbd, "");

// Moving back must use the newest saved snapshot, never the older archive.
product.categoryIds = ["cat-a"];
migrate(workspace);
assert.equal(rowA.items["prod-1"].semL4Model.mainJtbd, "");
assert.equal(rowA.items["prod-1"].demandRows[0].vol, 42);
assert.equal(rowB.legacyPageItemsV237["prod-1"].data.semL4Model.mainJtbd, "");

// A second move from the same source preserves its first archive as history.
rowA.items["prod-1"].semL4Model.mainJtbd = "Новый JTBD";
product.categoryIds = ["cat-b"];
migrate(workspace);
assert.equal(rowB.items["prod-1"].semL4Model.mainJtbd, "Новый JTBD");
assert.equal(rowA.legacyPageItemsV237["prod-1"].data.semL4Model.mainJtbd,
  "JTBD из А");
assert.equal(rowA.legacyPageItemsV237[
  "prod-1::category-move-2"].data.semL4Model.mainJtbd, "Новый JTBD");
assert.equal(rowA.legacyPageItemsV237["prod-1"].archived_at,
  rowA.legacyPageItemsV237["prod-1::category-move-2"].archived_at);
assert(rowA.legacyPageItemsV237["prod-1"].archive_sequence_v521 <
  rowA.legacyPageItemsV237["prod-1::category-move-2"].archive_sequence_v521,
"same-millisecond moves must retain their true sequence");
assert.equal(workspace.project._gate1PainArchiveSequenceV521,
  rowA.legacyPageItemsV237["prod-1::category-move-2"].archive_sequence_v521);

// The current category map can be absent; the migration still restores data.
const missingMap = structuredClone(workspace);
missingMap.painV130.productMaps = [missingMap.painV130.productMaps[1]];
missingMap.painV130.productMaps[0].items["prod-1"] = {
  product_id: "prod-1", semL4Model: { mainJtbd: "Без карты", additionalJtbds: [] },
};
product.categoryIds = ["cat-a"];
migrate(missingMap);
assert.equal(missingMap.painV130.productMaps.find((row) =>
  row.product_id === "cat-a")?.items["prod-1"].semL4Model.mainJtbd,
"Без карты");

console.log("Gate 1 category move: JTBD and metrics preserved across moves");
