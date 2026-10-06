/* Saved Gate 4 Search data projected into earlier gates without writing it back.
   Product identity is always the catalog item id. Names are display text only. */
(function (root) {
  "use strict";

  const METRIC_FIELDS = ["vol", "forecastClicks", "forecastBudget"];

  function clone(value) {
    if (typeof root.structuredClone === "function") return root.structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function productBranchKey(productId) {
    return String(productId || "")
      .trim()
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[«»"'`]/g, "")
      .replace(/[^a-zа-я0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "");
  }

  function phraseKey(value) {
    return String(value || "")
      .toLocaleLowerCase("ru-RU")
      .replace(/ё/g, "е")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .replace(/\s+/g, " ");
  }

  function searchBuild(workspace, productId) {
    const store = workspace?.gate4SearchBuild || workspace?.content?.gate4SearchBuild;
    if (!store || typeof store !== "object") return null;
    const id = String(productId || "").trim();
    if (!id) return null;
    const branch = store[id] || store[productBranchKey(id)];
    return branch && typeof branch === "object" && !Array.isArray(branch)
      ? branch : null;
  }

  function groupId(group) {
    return String(group?.groupId || group?.clusterId || group?.id || "").trim();
  }

  function matchesProduct(group, productId) {
    const explicitId = String(group?.itemId || "").trim();
    // Older saved groups sometimes have no itemId. The exact branch id owns them.
    return !explicitId || explicitId === productId;
  }

  function hasSavedContent(group) {
    return Boolean(groupId(group) || String(group?.col0 || group?.name || "").trim()
      || (Array.isArray(group?.demandRows) && group.demandRows.length));
  }

  function normalizeGroup(group, productId, source, fallbackRows) {
    const projected = clone(group);
    const rows = Array.isArray(group?.demandRows) && group.demandRows.length
      ? group.demandRows : fallbackRows;
    projected.groupId = groupId(group);
    projected.itemId = productId;
    projected.legacyBlankItemIdV519 = !String(group?.itemId || "").trim();
    projected.col0 = String(group?.col0 || group?.name || "").trim();
    projected.jtbdId = String(group?.jtbdId || "").trim();
    projected.searchIntent = String(group?.searchIntent || "").trim();
    projected.demandRows = Array.isArray(rows) ? clone(rows) : [];
    projected._sourceGate4V519 = source;
    return projected;
  }

  function guruGate4SavedGroupsV519(productId, workspace) {
    const id = String(productId || "").trim();
    const build = searchBuild(workspace, id);
    if (!build) return [];

    const clusters = Array.isArray(build.clusters) ? build.clusters : [];
    const clusterById = new Map(clusters
      .filter((cluster) => matchesProduct(cluster, id) && groupId(cluster))
      .map((cluster) => [groupId(cluster), cluster]));
    const groups = [];
    const represented = new Set();
    const blocked = new Set();

    (Array.isArray(build.groupRows) ? build.groupRows : []).forEach((group) => {
      const identity = groupId(group);
      if (!matchesProduct(group, id)) {
        if (identity) blocked.add(identity);
        return;
      }
      if (!hasSavedContent(group)) return;
      const matchingCluster = clusterById.get(identity);
      groups.push(normalizeGroup(group, id, "groupRows", matchingCluster?.demandRows));
      if (identity) represented.add(identity);
    });

    // Clusters are a legacy saved representation. Include only ones not already
    // represented by a group row, and never use drafts as additional groups.
    clusters.forEach((cluster) => {
      const identity = groupId(cluster);
      if (!matchesProduct(cluster, id) || !hasSavedContent(cluster)
        || (identity && (represented.has(identity) || blocked.has(identity)))) return;
      groups.push(normalizeGroup(cluster, id, "clusters", null));
      if (identity) represented.add(identity);
    });

    return groups;
  }

  function guruGate4ProductProjectionV519(productId, workspace) {
    const id = String(productId || "").trim();
    const groups = guruGate4SavedGroupsV519(id, workspace);
    const phrases = [];
    const byPhrase = new Map();
    const conflicts = [];

    groups.forEach((group) => {
      group.demandRows.forEach((sourceRow) => {
        const key = phraseKey(sourceRow?.kw);
        if (!key) return;
        const row = clone(sourceRow);
        const existing = byPhrase.get(key);
        if (!existing) {
          row._linkedGate4V519 = true;
          row._gate4GroupIdV519 = group.groupId;
          row._gate4JtbdIdV519 = group.jtbdId;
          row._gate4GroupTitleV519 = group.col0;
          row._gate4GroupIdsV519 = group.groupId ? [group.groupId] : [];
          row._gate4JtbdIdsV519 = group.jtbdId ? [group.jtbdId] : [];
          row.groupId = group.groupId;
          row.jtbdId = group.jtbdId;
          row.groupIds = row._gate4GroupIdsV519;
          row.jtbdIds = row._gate4JtbdIdsV519;
          byPhrase.set(key, row);
          phrases.push(row);
          return;
        }
        if (group.groupId && !existing._gate4GroupIdsV519.includes(group.groupId))
          existing._gate4GroupIdsV519.push(group.groupId);
        if (group.jtbdId && !existing._gate4JtbdIdsV519.includes(group.jtbdId))
          existing._gate4JtbdIdsV519.push(group.jtbdId);
        METRIC_FIELDS.forEach((field) => {
          const first = String(existing[field] ?? "").trim();
          const next = String(row[field] ?? "").trim();
          if (first && next && first !== next) {
            conflicts.push({ phrase: existing.kw, field, first, next,
              firstGroupId: existing._gate4GroupIdV519, nextGroupId: group.groupId });
          }
          // A saved group with no metric does not mask a later populated value.
          if (!first && next) existing[field] = row[field];
        });
      });
    });
    return { productId: id, groups, phrases, conflicts };
  }

  // Keep the JTBD identity saved with each group available to earlier gates.
  // A missing Gate 1 form must not make its saved phrases look unassigned.
  function guruGate4SavedJtbdsV520(productId, workspace) {
    const groups = guruGate4SavedGroupsV519(productId, workspace);
    const byId = new Map();
    const conflicts = [];
    groups.forEach((group) => {
      const id = String(group.jtbdId || "").trim();
      if (!id) return;
      const title = String(group.col0 || group.searchIntent || "").trim();
      let descriptor = byId.get(id);
      if (!descriptor) {
        descriptor = { id, text: title, groupIds: [], phrases: [] };
        byId.set(id, descriptor);
      } else if (title && descriptor.text && title !== descriptor.text) {
        conflicts.push({ type: "group-title", jtbdId: id,
          first: descriptor.text, next: title, groupId: group.groupId });
      } else if (!descriptor.text && title) {
        descriptor.text = title;
      }
      if (group.groupId) descriptor.groupIds.push(group.groupId);
      const seen = new Set(descriptor.phrases.map((row) => phraseKey(row.kw)));
      group.demandRows.forEach((row) => {
        const key = phraseKey(row?.kw);
        if (!key) return;
        const rowJtbdId = String(row?.searchJtbdIdV394 || "").trim();
        if (rowJtbdId && rowJtbdId !== id)
          conflicts.push({ type: "phrase-jtbd", phrase: row.kw,
            groupId: group.groupId, groupJtbdId: id, rowJtbdId });
        if (!seen.has(key)) {
          descriptor.phrases.push(clone(row));
          seen.add(key);
        }
      });
    });
    return { descriptors: [...byId.values()], conflicts };
  }

  function guruGate4PhraseRowsV519(productId, workspace) {
    return guruGate4ProductProjectionV519(productId, workspace).phrases;
  }

  function guruGate4PhraseConflictsV519(productId, workspace) {
    return guruGate4ProductProjectionV519(productId, workspace).conflicts;
  }

  const api = {
    guruGate4SavedGroupsV519,
    guruGate4ProductProjectionV519,
    guruGate4PhraseRowsV519,
    guruGate4PhraseConflictsV519,
    guruGate4SavedJtbdsV520,
  };
  root.GuruGate4UpstreamLinks = api;
  Object.assign(root, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(globalThis);
