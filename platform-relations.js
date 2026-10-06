/* Gate 0 · Платформа: единственный источник связи товара с категориями.
   Прежние поля остаются в рабочем пространстве только для миграции. */

function megaPlatformRelationText(value) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).trim() : "";
}

function megaPlatformRelationProductId(productOrId) {
  return megaPlatformRelationText(
    productOrId && typeof productOrId === "object" ? productOrId.id : productOrId,
  );
}

function megaPlatformCategoryStore(workspace = state) {
  const gate = workspace?.gates?.find((entry) => entry.id === "gate-0");
  const card = gate?.cards?.find((entry) =>
    typeof isMegaMarketingCard === "function"
      ? isMegaMarketingCard(entry)
      : entry?.id === "card-7",
  );
  if (!card) return null;
  card.megaMarketing ||= {};
  card.megaMarketing.platformV2 ||= { fundamental: [], landings: {}, extra: [] };
  const platform = card.megaMarketing.platformV2;
  const store = (platform.relationsV1 ||= {});
  if (!store.categoryIdsByProduct || typeof store.categoryIdsByProduct !== "object" ||
      Array.isArray(store.categoryIdsByProduct)) store.categoryIdsByProduct = {};
  if (!store.productOrderByCategory || typeof store.productOrderByCategory !== "object" ||
      Array.isArray(store.productOrderByCategory)) store.productOrderByCategory = {};
  if (!Array.isArray(store.migrationConflicts)) store.migrationConflicts = [];
  return store;
}

function megaPlatformRelationStableCategoryIds(workspace) {
  const platform = workspace?.gates?.find((gate) => gate.id === "gate-0")
    ?.cards?.find((card) => card.megaMarketing?.platformV2)
    ?.megaMarketing?.platformV2;
  const missing = new Set(platform?.urlsV1?.missingCategoryIds || []);
  const generated = new Set(platform?.urlsV1?.missingCategoryGeneratedIds || []);
  const categories = Array.isArray(workspace?.project?.productRegistryV185)
    ? workspace.project.productRegistryV185 : [];
  return new Set(categories
    .filter((category) => category?.manualOriginV2 ||
      !missing.has(category?.name) && !generated.has(category?.id))
    .map((category) => megaPlatformRelationText(category?.id)).filter(Boolean));
}

function megaPlatformRelationDistinctIds(values) {
  return [...new Set((Array.isArray(values) ? values : [])
    .map(megaPlatformRelationText).filter(Boolean))];
}

function megaPlatformProductCategoryIds(productOrId, workspace = state) {
  const productId = megaPlatformRelationProductId(productOrId);
  if (!productId) return [];
  const store = megaPlatformCategoryStore(workspace);
  if (!store) return [];
  return megaPlatformRelationDistinctIds(store.categoryIdsByProduct[productId]);
}

function megaPlatformProductCategoryId(productOrId, workspace = state) {
  return megaPlatformProductCategoryIds(productOrId, workspace)[0] || "";
}

function megaPlatformProductAdditionalCategoryIds(productOrId, workspace = state) {
  return megaPlatformProductCategoryIds(productOrId, workspace).slice(1);
}

function megaPlatformOrderedProductsInCategory(categoryId, products, workspace = state) {
  const order = megaPlatformCategoryStore(workspace)?.productOrderByCategory?.[categoryId];
  if (!Array.isArray(order) || !order.length) return products;
  const positions = new Map(order.map((id, index) => [id, index]));
  return products.map((product, index) => ({ product, index }))
    .sort((a, b) => (positions.get(a.product.id || a.product.urlId) ?? Infinity) -
      (positions.get(b.product.id || b.product.urlId) ?? Infinity) || a.index - b.index)
    .map(({ product }) => product);
}

function megaPlatformReorderProductInCategory(
  productId, categoryId, targetProductId = "", placement = "end", workspace = state,
) {
  const key = categoryId || "__uncategorized__";
  const products = (workspace?.project?.catalogItemsV189 || []).filter((product) => {
    const ids = megaPlatformProductCategoryIds(product.id, workspace);
    return key === "__uncategorized__" ? !ids.length : ids.includes(key);
  });
  if (!products.some((product) => product.id === productId)) return false;
  const order = megaPlatformOrderedProductsInCategory(key, products, workspace)
    .map((product) => product.id);
  const without = order.filter((id) => id !== productId);
  const targetIndex = without.indexOf(targetProductId);
  const index = placement === "start" ? 0
    : targetIndex < 0 ? without.length
      : targetIndex + (placement === "after" ? 1 : 0);
  without.splice(index, 0, productId);
  if (without.every((id, position) => id === order[position])) return false;
  megaPlatformCategoryStore(workspace).productOrderByCategory[key] = without;
  return true;
}

function megaPlatformSetProductCategoryIds(productId, categoryIds = [], workspace = state) {
  const id = megaPlatformRelationProductId(productId);
  if (!id || !(workspace?.project?.catalogItemsV189 || [])
    .some((item) => megaPlatformRelationText(item?.id) === id)) return false;
  const store = megaPlatformCategoryStore(workspace);
  if (!store) return false;
  const valid = megaPlatformRelationStableCategoryIds(workspace);
  const ids = megaPlatformRelationDistinctIds(categoryIds);
  if (ids.some((categoryId) => !valid.has(categoryId))) return false;
  const previous = megaPlatformRelationDistinctIds(store.categoryIdsByProduct[id]);
  store.categoryIdsByProduct[id] = ids;
  const oldKeys = previous.length ? previous : ["__uncategorized__"];
  const newKeys = ids.length ? ids : ["__uncategorized__"];
  for (const key of oldKeys.filter((key) => !newKeys.includes(key))) {
    const order = store.productOrderByCategory[key];
    if (Array.isArray(order)) store.productOrderByCategory[key] = order.filter((item) => item !== id);
  }
  for (const key of newKeys.filter((key) => !oldKeys.includes(key))) {
    const order = store.productOrderByCategory[key];
    if (Array.isArray(order) && !order.includes(id)) order.push(id);
  }
  return true;
}

function megaPlatformSetProductCategories(
  productId, primaryId, additionalIds = [], workspace = state,
) {
  return megaPlatformSetProductCategoryIds(productId, [
    primaryId, ...(Array.isArray(additionalIds) ? additionalIds : []),
  ], workspace);
}

function megaPlatformMoveProductCategory(
  productId, fromCategoryId, toCategoryId, workspace = state,
) {
  const from = megaPlatformRelationText(fromCategoryId);
  const to = megaPlatformRelationText(toCategoryId);
  const current = megaPlatformProductCategoryIds(productId, workspace);
  const index = from ? current.indexOf(from) : 0;
  if ((from && index < 0) || from === to) return false;
  const next = from ? current.filter((id) => id !== from) : [...current];
  // A product already present under the destination only leaves its source.
  if (to && !next.includes(to)) next.splice(Math.min(index, next.length), 0, to);
  return megaPlatformSetProductCategoryIds(productId, next, workspace);
}

function megaPlatformToggleProductCategory(
  productId, categoryId, selected, workspace = state,
) {
  const category = megaPlatformRelationText(categoryId);
  if (!category) return false;
  const current = megaPlatformProductCategoryIds(productId, workspace);
  const next = selected
    ? [...current, category]
    : current.filter((id) => id !== category);
  return megaPlatformSetProductCategoryIds(productId, next, workspace);
}

function megaPlatformRelationMigrationCandidates(workspace, missingCategoryNames = []) {
  const project = workspace?.project || {};
  const products = Array.isArray(project.catalogItemsV189)
    ? project.catalogItemsV189 : [];
  const productIds = new Set(products.map((item) =>
    megaPlatformRelationText(item?.id)).filter(Boolean));
  const stableIds = megaPlatformRelationStableCategoryIds(workspace);
  const categories = (Array.isArray(project.productRegistryV185)
    ? project.productRegistryV185 : [])
    .filter((item) => stableIds.has(megaPlatformRelationText(item?.id)) &&
      !missingCategoryNames.includes(item?.name));
  const categoryIds = new Set(categories.map((item) =>
    megaPlatformRelationText(item.id)));
  const normalizedName = (value) => megaPlatformRelationText(value)
    .toLocaleLowerCase("ru-RU");
  const resolve = (value) => {
    const raw = megaPlatformRelationText(value);
    if (!raw) return "";
    if (categoryIds.has(raw)) return raw;
    const name = normalizedName(raw);
    const matches = categories.filter((item) =>
      [item.name, ...(Array.isArray(item.legacyNames) ? item.legacyNames : [])]
        .some((candidate) => normalizedName(candidate) === name));
    return matches.length === 1 ? megaPlatformRelationText(matches[0].id) : "";
  };
  const candidatesByProduct = {};
  const unresolved = [];
  const pendingRows = [];
  const add = (productId, value, source, options = {}) => {
    const id = megaPlatformRelationText(productId);
    const raw = megaPlatformRelationText(value);
    if (!productIds.has(id) || !raw) return;
    const categoryId = resolve(raw);
    if (!categoryId) {
      if (options.ignoreUnresolved) return;
      unresolved.push({ productId: id, source, value: raw,
        reason: "Категория не найдена по стабильному ID или однозначному имени" });
      return;
    }
    (candidatesByProduct[id] ||= []).push({ categoryId, source, value: raw });
  };

  // Самое прямое старое поле имеет приоритет перед производными снимками.
  products.forEach((item, index) => {
    const productId = megaPlatformRelationText(item?.id);
    add(productId, item?.categoryId, `project.catalogItemsV189[${index}].categoryId`);
    add(productId, item?.category_id, `project.catalogItemsV189[${index}].category_id`);
  });

  // Старые карты Gate 1 группировали позиции по ID категории. Это
  // самостоятельное свидетельство связи, даже если поле карточки товара
  // пусто; в новом хранилище карта остаётся только историческим снимком.
  const legacyMaps = workspace?.painV130?.productMaps;
  if (Array.isArray(legacyMaps)) legacyMaps.forEach((map, mapIndex) => {
    const categoryId = megaPlatformRelationText(map?.product_id);
    if (!categoryId || !map?.items || typeof map.items !== "object") return;
    Object.keys(map.items).forEach((productId) => add(productId, categoryId,
      `painV130.productMaps[${mapIndex}].items[${productId}]`));
  });

  const gate1 = workspace?.gates?.find((gate) => gate.id === "gate-1");
  for (const card of gate1?.cards || []) {
    (card.pageRows || []).forEach((row, index) => {
      if (row?.categoryId && ["card-23", "card-24"].includes(card.id))
        pendingRows.push({ cardId: card.id, rowId: megaPlatformRelationText(row.id),
          index, rawCategoryId: megaPlatformRelationText(row.categoryId) });
      const directId = megaPlatformRelationText(row?.catalogItemIdV189);
      const linked = directId ? null : products.find((item) => {
        const source = item?.source;
        if (source?.kind !== "gate1" || source.cardId !== card.id) return false;
        return source.rowId
          ? source.rowId === row.id : source.rowIndex === index;
      });
      const productId = directId || megaPlatformRelationText(linked?.id);
      add(productId, row?.categoryId,
        `gate-1.${card.id}.pageRows[${index}].categoryId`);
    });
  }

  (Array.isArray(project.gate0ScopedValuesV194)
    ? project.gate0ScopedValuesV194 : []).forEach((record, index) => {
    const productId = record?.product_id;
    add(productId, record?.category_id,
      `project.gate0ScopedValuesV194[${index}].category_id`);
    // Это текстовое поле позиционирования, поэтому принимаем его лишь при
    // точном и однозначном совпадении с существующей категорией.
    if (record?.field === "positioning") add(productId,
      record?.positioning?.category,
      `project.gate0ScopedValuesV194[${index}].positioning.category`,
      { ignoreUnresolved: true });
  });

  const overrides = project.productScopedOverridesV194;
  if (overrides && typeof overrides === "object") {
    for (const [productId, fields] of Object.entries(overrides)) {
      if (!fields || typeof fields !== "object") continue;
      for (const [field, record] of Object.entries(fields)) {
        add(productId, record?.category_id,
          `project.productScopedOverridesV194[${productId}].${field}.category_id`);
      }
    }
  }
  return { candidatesByProduct, unresolved, pendingRows };
}

function megaPlatformMigrateCategories(workspace = state, phase = "apply") {
  if (!workspace?.project) return null;
  const store = megaPlatformCategoryStore(workspace);
  if (!store) return null;
  const temporaryKey = "_platformRelationMigrationCandidatesV1";
  if (store.orderedMigratedAt) {
    delete workspace[temporaryKey];
    return store;
  }
  if (phase === "capture") {
    if (!workspace[temporaryKey]) {
      const missingCategoryNames = (workspace.project.productRegistryV185 || [])
        .filter((item) => !megaPlatformRelationText(item?.id))
        .map((item) => megaPlatformRelationText(item?.name));
      workspace[temporaryKey] = {
        ...megaPlatformRelationMigrationCandidates(workspace, missingCategoryNames),
        missingCategoryNames,
      };
    }
    return null;
  }
  const before = workspace[temporaryKey] ||
    megaPlatformRelationMigrationCandidates(workspace);
  const after = megaPlatformRelationMigrationCandidates(workspace,
    before.missingCategoryNames || []);
  const captured = {
    candidatesByProduct: { ...after.candidatesByProduct },
    unresolved: [...before.unresolved, ...after.unresolved],
  };
  for (const [id, entries] of Object.entries(before.candidatesByProduct || {}))
    captured.candidatesByProduct[id] = [...entries,
      ...(captured.candidatesByProduct[id] || [])];
  const categories = workspace.project.productRegistryV185 || [];
  const products = workspace.project.catalogItemsV189 || [];
  for (const pending of before.pendingRows || []) {
    const raw = pending.rawCategoryId;
    const category = categories.find((item) => megaPlatformRelationText(item.id) === raw &&
      !(before.missingCategoryNames || []).includes(item.name));
    const product = products.find((item) => item.source?.kind === "gate1" &&
      item.source.cardId === pending.cardId &&
      (pending.rowId ? item.source.rowId === pending.rowId :
        item.source.rowIndex === pending.index));
    if (!product || !category || before.candidatesByProduct?.[product.id]?.length) continue;
    const entries = (captured.candidatesByProduct[product.id] ||= []);
    entries.unshift({ categoryId: category.id,
      source: `gate-1.${pending.cardId}.pageRows[${pending.index}].categoryId (до подготовки)`,
      value: raw });
  }
  captured.unresolved = [...new Map(captured.unresolved.map((item) =>
    [`${item.productId}:${item.source}:${item.value}`, item])).values()];
  const stableIds = megaPlatformRelationStableCategoryIds(workspace);
  const conflictExists = (entry) => store.migrationConflicts.some((known) =>
    known.productId === entry.productId &&
    known.type === entry.type &&
    (entry.type === "unresolved"
      ? known.source === entry.source && known.value === entry.value
      : entry.type === "legacy_disagrees"
        ? JSON.stringify(known.platformCategoryIds || []) ===
            JSON.stringify(entry.platformCategoryIds || []) &&
          JSON.stringify((known.candidates || []).map((item) => item.categoryId)) ===
            JSON.stringify((entry.candidates || []).map((item) => item.categoryId))
      : known.primaryId === entry.primaryId &&
        JSON.stringify(known.additionalIds || []) ===
          JSON.stringify(entry.additionalIds || [])));
  const logConflict = (entry) => {
    if (!conflictExists(entry)) store.migrationConflicts.push(entry);
  };
  const productIds = [...new Set((Array.isArray(workspace.project.catalogItemsV189)
    ? workspace.project.catalogItemsV189 : [])
    .map((item) => megaPlatformRelationText(item?.id)).filter(Boolean))];
  for (const productId of productIds) {
    // An existing ordered value, including [], is an explicit user choice.
    if (Object.hasOwn(store.categoryIdsByProduct, productId)) continue;
    const hasPreviousPlatformValue =
      Object.hasOwn(store.primaryByProduct || {}, productId) ||
      Object.hasOwn(store.additionalByProduct || {}, productId);
    if (hasPreviousPlatformValue) {
      const primary = megaPlatformRelationText(store.primaryByProduct?.[productId]);
      const additional = Array.isArray(store.additionalByProduct?.[productId])
        ? store.additionalByProduct[productId] : [];
      const previous = megaPlatformRelationDistinctIds([primary, ...additional]);
      store.categoryIdsByProduct[productId] =
        previous.filter((categoryId) => stableIds.has(categoryId));
      const divergent = (captured.candidatesByProduct?.[productId] || [])
        .filter((candidate) => !previous.includes(candidate.categoryId));
      if (divergent.length) logConflict({
        type: "legacy_disagrees", productId,
        platformCategoryIds: previous,
        candidates: divergent,
      });
      for (const missing of previous.filter((categoryId) => !stableIds.has(categoryId))) {
        logConflict({ type: "unresolved", productId,
          source: primary === missing
            ? "platformV2.relationsV1.primaryByProduct"
            : "platformV2.relationsV1.additionalByProduct",
          value: missing,
          reason: "В прежней связи нет подтверждённого стабильного ID категории" });
      }
      continue;
    }
    const candidates = captured.candidatesByProduct?.[productId] || [];
    const distinct = megaPlatformRelationDistinctIds(
      candidates.map((item) => item.categoryId));
    store.categoryIdsByProduct[productId] = distinct;
    if (distinct.length > 1) logConflict({
      productId,
      primaryId: distinct[0],
      additionalIds: distinct.slice(1),
      candidates,
    });
  }
  for (const item of captured.unresolved || []) {
    logConflict({ type: "unresolved", ...item });
  }
  store.migratedAt ||= new Date().toISOString();
  store.orderedMigratedAt = new Date().toISOString();
  delete workspace[temporaryKey];
  return store;
}
