/* Confirmed Platform deletion. All matching is by stable ID. Legacy names are
   used only to retire the exact mirror of an already identified category. */

const megaPlatformDeleteApprovalsV1 = new WeakMap();

function megaPlatformSearchAdCountV1(branch) {
  const stable = Object.values(branch?.adsByGroupIdV420 || {});
  const rows = stable.some(Array.isArray)
    ? stable : Object.values(branch?.adsRows || {});
  return rows.reduce((sum, ads) => sum + (Array.isArray(ads) ? ads.length : 0), 0);
}

function megaPlatformProductCountWordV1(count) {
  const lastTwo = Math.abs(count) % 100;
  const last = lastTwo % 10;
  return lastTwo >= 11 && lastTwo <= 14 ? "товаров"
    : last === 1 ? "товар" : last >= 2 && last <= 4 ? "товара" : "товаров";
}

function megaPlatformGate5IdCountV1(gate5, key) {
  const flatten = (value) => {
    if (Array.isArray(value)) return value.flatMap(flatten);
    if (!value || typeof value !== "object") return [];
    if (Object.hasOwn(value, "product_id") || Object.hasOwn(value, "productId")) return [value];
    return Object.values(value).flatMap(flatten);
  };
  return flatten(gate5).filter((row) => row.product_id === key || row.productId === key).length;
}

function megaPlatformDeletePlan(kind, id, workspace = state) {
  return megaPlatformDeleteCollectV1(kind, id, workspace, false);
}

function megaPlatformDeleteCollectV1(kind, id, workspace, perform) {
  const key = String(id || "");
  const project = workspace?.project || {};
  const categories = Array.isArray(project.productRegistryV185) ? project.productRegistryV185 : [];
  const products = Array.isArray(project.catalogItemsV189) ? project.catalogItemsV189 : [];
  const target = kind === "product"
    ? products.find((row) => row?.id === key)
    : kind === "category" ? categories.find((row) => row?.id === key) : null;
  if (!target || !key) return null;
  // Historical byProduct maps can also contain category IDs. A matching ID in
  // both registries is insufficient to establish which entity owns a row.
  const oppositeIdCollision = kind === "product"
    ? categories.some((row) => row?.id === key)
    : products.some((row) => row?.id === key);

  const details = [];
  const unresolved = [];
  const note = (path, count, action = null) => {
    if (!count) return;
    details.push({ path, count });
    if (perform && action) action();
  };
  const remove = (list, predicate, path) => {
    if (!Array.isArray(list)) return;
    const count = list.filter(predicate).length;
    note(path, count, () => {
      for (let index = list.length - 1; index >= 0; index -= 1)
        if (predicate(list[index])) list.splice(index, 1);
    });
  };
  const drop = (object, objectKey, path) => {
    if (!object || typeof object !== "object" || !Object.hasOwn(object, objectKey)) return;
    note(path, 1, () => { delete object[objectKey]; });
  };
  const sharedDrop = (object, objectKey, path) => {
    if (!object || typeof object !== "object" || !Object.hasOwn(object, objectKey)) return;
    if (oppositeIdCollision) {
      unresolved.push({ path, reason: "Один ID есть и у товара, и у категории; владелец записи не подтверждён" });
      return;
    }
    drop(object, objectKey, path);
  };
  const sharedRemove = (list, predicate, path) => {
    if (!Array.isArray(list)) return;
    const count = list.filter(predicate).length;
    if (oppositeIdCollision && count) {
      unresolved.push({ path: `${path}: ${count}`, reason: "Один ID есть и у товара, и у категории; владелец записей не подтверждён" });
      return;
    }
    remove(list, predicate, path);
  };
  const clear = (object, field, path) => {
    if (!object || object[field] !== key) return;
    note(path, 1, () => { object[field] = ""; });
  };
  const sharedClear = (object, field, path) => {
    if (!object || object[field] !== key) return;
    if (oppositeIdCollision) {
      unresolved.push({ path, reason: "Один ID есть и у товара, и у категории; владелец значения не подтверждён" });
      return;
    }
    clear(object, field, path);
  };
  const gate = (gateId) => (workspace.gates || []).find((row) => row?.id === gateId);
  const allCards = (workspace.gates || []).flatMap((row) => row.cards || []);
  const platform = gate("gate-0")?.cards?.find((card) =>
    card?.megaMarketing?.platformV2)?.megaMarketing?.platformV2;
  const urls = platform?.urlsV1;
  const relations = platform?.relationsV1;
  const targetName = String(target.name || "");
  const sourceRowId = kind === "product" ? String(target.source?.rowId || "") : "";
  const pageGroup = kind === "product" ? "products" : "categories";
  const promotedManualIds = new Set((platform?.extra || [])
    .filter((row) => row?.promotedV2?.kind === kind && row.promotedV2.id === key)
    .map((row) => row.id));
  const linkedPages = (Array.isArray(workspace.linkBank) ? workspace.linkBank : [])
    .filter((link) =>
      (link?.pageRefV1?.group === pageGroup && link.pageRefV1.id === key) ||
      (link?.pageRefV1?.group === "custom" && promotedManualIds.has(link.pageRefV1.id)) ||
      (kind === "category" && urls?.onOrderCategoryId === key &&
        link?.pageRefV1?.group === "fixed" && link.pageRefV1.id === "on_order"));
  note("Банк ссылок · снятые ссылки на удаляемую страницу", linkedPages.length,
    () => linkedPages.forEach((link) => { delete link.pageRefV1; }));
  // Capture membership before removing the category from the registry. The
  // ordered list is canonical; old scalar fields are retained for migration.
  const categoryLists = new Map(kind === "category" ? products
    .filter((row) => row?.id)
    .map((row) => {
      const saved = relations?.categoryIdsByProduct?.[row.id];
      const ids = Array.isArray(saved) ? saved.slice()
        : typeof megaPlatformProductCategoryIds === "function"
          ? megaPlatformProductCategoryIds(row.id, workspace) : [];
      return [row.id, ids];
    }) : []);
  const affectedProductIds = kind === "category" ? [...categoryLists]
    .filter(([, ids]) => ids.includes(key)).map(([productId]) => productId) : [];

  if (kind === "product") {
    remove(products, (row) => row?.id === key, "Что продаём · позиции");
    sharedDrop(project.productBindingsV185, key, "Gate 0 · productBindingsV185[product_id]");
    drop(project.productScopedOverridesV194, key, "Gate 0 · productScopedOverridesV194[product_id]");
    drop(project.gate0ScopeUiV194?.commonMetaByProduct, key,
      "Gate 0 · commonMetaByProduct[product_id]");
    sharedDrop(workspace.projectComparison?.productsById, key,
      "Gate 1 · сравнение продуктов[product_id]");
    sharedDrop(workspace.ui?.gate1LandingContinuumV234?.byProduct, key,
      "Gate 1 · карточка посадочной[product_id]");
    sharedDrop(workspace.gate1WebmasterV295?.byProduct, key,
      "Gate 1 · прежний Вебмастер[product_id]");
    sharedDrop(workspace.gate3ProductJourneyV210?.openStepsByProduct, key,
      "Gate 3 · раскрытые этапы[product_id]");
    clear(workspace.gate3ProductJourneyV210, "selectedProductId",
      "Gate 3 · прежний выбранный товар");
    sharedDrop(workspace.gate3Gate4StructureV290?.byProduct, key,
      "Gate 3 · структура Gate 4[product_id]");
    clear(workspace.gate4ProductPickV210, "selectedProductId",
      "Gate 4 · прежний выбранный товар");
    sharedDrop(workspace.gate4Production?.readinessV225?.byProduct, key,
      "Gate 4 · готовность[product_id]");
    sharedDrop(workspace.gate4Production?.forecastAssumptionsByProduct, key,
      "Gate 4 · прогноз[product_id]");
    sharedDrop(workspace.gate4Production?.forecastAssumptionsUiV3, key,
      "Gate 4 · интерфейс прогноза[product_id]");
    sharedDrop(workspace.gate5?.importsByProduct, key,
      "Gate 5 · импорты[product_id]");
    sharedDrop(workspace.gate6Calendar?.byProduct, key,
      "Gate 6 · календарь[product_id]");
    sharedDrop(workspace.gate8Forecast?.byProduct, key,
      "Gate 8 · прогноз и история[product_id]");
    drop(urls?.products, key, "Платформа · URL товара");
    drop(relations?.categoryIdsByProduct, key, "Платформа · категории товара");
    for (const [categoryId, order] of Object.entries(relations?.productOrderByCategory || {})) {
      if (!Array.isArray(order) || !order.includes(key)) continue;
      note(`Платформа · порядок товаров категории ${categoryId}`, 1,
        () => { relations.productOrderByCategory[categoryId] = order.filter((id) => id !== key); });
    }
    drop(relations?.primaryByProduct, key, "Платформа · основная категория товара");
    drop(relations?.additionalByProduct, key, "Платформа · доп. категории товара");
    if (project.gate0ScopeUiV194?.selectedProductId === key)
      clear(project.gate0ScopeUiV194, "selectedProductId", "Gate 0 · выбранный товар");
    clear(workspace.gate4Production, "launchProduct", "Gate 4 · выбранный товар");

    const scoped = project.gate0ScopedValuesV194;
    remove(scoped, (row) => row?.product_id === key,
      "Strategic Foundation · значения товара[product_id]");
    for (const card of allCards) {
      if (Array.isArray(card.pageRows)) {
        remove(card.pageRows, (row) => row?.catalogItemIdV189 === key ||
          Boolean(sourceRowId && row?.id === sourceRowId &&
            card.id === target.source?.cardId),
        `Gate 1 · ${card.id} · карточки товара`);
      }
      for (const field of ["metrikaQualityV360", "metrikaProductV367"])
        sharedRemove(card.fields?.[field]?.perProduct,
          (row) => row?.product_id === key,
          `Gate 2 · ${card.id} · ${field}.perProduct`);
      if (card.currentResultsMeta?.positionId === key) {
        const resultRows = (card.currentResults || []).filter((row) =>
          row?.value || row?.source || row?.comment);
        note(`Gate 0 · ${card.id} · показатели результатов товара`,
          resultRows.length, () => { card.currentResults = []; });
        note(`Gate 0 · ${card.id} · продукт результатов`, 1, () => {
          card.currentResultsMeta = {
            ...card.currentResultsMeta, period: "", sources: "", positionId: "",
          };
        });
      }
      sharedDrop(card.legacyGate1WebmasterV295?.data?.byProduct, key,
        `Gate 1 · ${card.id} · архив Вебмастера[product_id]`);
    }
    for (const [index, map] of (workspace.painV130?.productMaps || []).entries())
      sharedDrop(map?.items, key, `Gate 1 · спрос[${index}].items[product_id]`);
    for (const [index, map] of (workspace.painV130?.productMaps || []).entries()) {
      const archived = map?.legacyPageItemsV237;
      const keyed = archived?.[key];
      const conflictingOwner = keyed && [keyed.mapped_product_id, keyed.data?.product_id]
        .some((ownerId) => ownerId && ownerId !== key);
      if (conflictingOwner) unresolved.push({
        path: `Gate 1 · спрос[${index}].legacyPageItemsV237[product_id]`,
        reason: "Ключ совпадает с product_id, но вложенная запись указывает на другой товар",
      });
      else sharedDrop(archived, key,
        `Gate 1 · спрос[${index}].legacyPageItemsV237[product_id]`);
      for (const [archiveId, entry] of Object.entries(archived || {})) {
        if (archiveId === key || !entry || typeof entry !== "object") continue;
        sharedClear(entry, "mapped_product_id",
          `Gate 1 · спрос[${index}].legacyPageItemsV237[${archiveId}].mapped_product_id`);
        sharedClear(entry, "source_key",
          `Gate 1 · спрос[${index}].legacyPageItemsV237[${archiveId}].source_key`);
        sharedClear(entry.data, "product_id",
          `Gate 1 · спрос[${index}].legacyPageItemsV237[${archiveId}].data.product_id`);
      }
    }
    const archivedSemantics = workspace.painV130?.legacySemanticLevelsV264?.pageByProduct;
    const keyedSemantics = archivedSemantics?.[key];
    if (keyedSemantics?.product_id && keyedSemantics.product_id !== key)
      unresolved.push({
        path: "Gate 1 · спрос · legacySemanticLevelsV264.pageByProduct[product_id]",
        reason: "Ключ совпадает с product_id, но запись указывает на другой товар",
      });
    else sharedDrop(archivedSemantics, key,
      "Gate 1 · спрос · legacySemanticLevelsV264.pageByProduct[product_id]");
    for (const [archiveId, entry] of Object.entries(archivedSemantics || {})) {
      if (archiveId === key || !entry || typeof entry !== "object") continue;
      if (entry.product_id === key) {
        if (oppositeIdCollision)
          unresolved.push({
            path: `Gate 1 · спрос · legacySemanticLevelsV264.pageByProduct[${archiveId}]`,
            reason: "Один ID есть и у товара, и у категории; владелец записи не подтверждён",
          });
        else drop(archivedSemantics, archiveId,
          `Gate 1 · спрос · legacySemanticLevelsV264.pageByProduct[${archiveId}]`);
      } else sharedClear(entry, "source_key",
        `Gate 1 · спрос · legacySemanticLevelsV264.pageByProduct[${archiveId}].source_key`);
    }
    remove(workspace.unitV130?.items, (row) =>
      Boolean(sourceRowId && row?.sourceItemId === sourceRowId &&
        row?.catalogKind !== "direction"),
      "Gate 1 · юнит экономика товара");
    sharedRemove(workspace.unitV130?.items, (row) =>
      row?.sourceItemId === key || row?.productKey === key,
    "Gate 1 · юнит экономика товара по старому ID");
    for (const article of workspace.gate1BlogV304?.articles || [])
      remove(article?.product_links, (row) => row?.product_id === key,
        `Gate 1 · блог «${article.title || article.id || "статья"}» · связи товара`);
    const smmIdeaIds = new Set((workspace.gate4SmmContentV299?.ideas || [])
      .filter((row) => row?.productId === key).map((row) => row?.id).filter(Boolean));
    sharedRemove(workspace.gate4SmmContentV299?.ideas, (row) => row?.productId === key,
      "Gate 4 · SMM идеи товара");
    sharedRemove(workspace.gate4SmmContentV299?.publications,
      (row) => row?.productId === key || smmIdeaIds.has(row?.sourceIdeaId),
      "Gate 4 · SMM публикации товара");

    const normalized = typeof normalizeAspectKey === "function"
      ? normalizeAspectKey(key) : key;
    const keyCollision = oppositeIdCollision || [...products, ...categories].some((row) => row?.id !== key &&
      (typeof normalizeAspectKey === "function" ? normalizeAspectKey(row.id) : row.id)
        === normalized);
    const searchBranch = workspace.gate4SearchBuild?.[normalized];
    if (searchBranch && keyCollision)
      unresolved.push({ path: `Gate 4 Search · ${normalized}`,
        reason: "Ключ совпадает с другим product_id после нормализации" });
    if (searchBranch && !keyCollision) {
      note("Gate 4 Search · сборка товара", 1,
        () => { delete workspace.gate4SearchBuild[normalized]; });
      note("Gate 4 Search · группы", (searchBranch.groupRows || []).length);
      note("Gate 4 Search · объявления", megaPlatformSearchAdCountV1(searchBranch));
    }
    const rsyaBranch = workspace.gate4Rsya?.[normalized];
    const rsyaMixed = (rsyaBranch?.groups || []).some((group) =>
      group?.product_id && group.product_id !== key);
    if (rsyaBranch && (keyCollision || rsyaMixed))
      unresolved.push({ path: `Gate 4 РСЯ · ${normalized}`,
        reason: keyCollision ? "Ключ совпадает с другим product_id после нормализации" :
          "В ветке есть группы с другим product_id" });
    if (rsyaBranch && !keyCollision && !rsyaMixed) {
      note("Gate 4 РСЯ · сборка товара", 1,
        () => { delete workspace.gate4Rsya[normalized]; });
      note("Gate 4 РСЯ · группы", (rsyaBranch.groups || []).length);
      note("Gate 4 РСЯ · объявления", (rsyaBranch.groups || [])
        .reduce((sum, group) => sum + (group.ads || []).length, 0));
    }
    for (const [branchId, branch] of Object.entries(workspace.gate4Rsya || {})) {
      if (branchId === normalized && !rsyaMixed && !keyCollision) continue;
      sharedRemove(branch?.groups, (row) => row?.product_id === key,
        `Gate 4 РСЯ · ${branchId} · группы товара`);
    }
    const campaigns = workspace.gate4Production?.campaigns || {};
    const matchingCampaigns = Object.entries(campaigns).filter(([, row]) =>
      row?.product === key || row?.product_id === key || row?.productId === key);
    for (const [branchId, row] of Object.entries(campaigns))
      if (branchId.startsWith(`${normalized}_`) &&
          !row?.product && !row?.product_id && !row?.productId)
        unresolved.push({ path: `Gate 4 · кампания ${branchId}`,
          reason: "Нет подтверждённого product_id" });
    const campaignKeys = matchingCampaigns.map(([branchId]) => branchId);
    if (oppositeIdCollision && matchingCampaigns.length)
      unresolved.push({ path: `Gate 4 · кампании с общим ID: ${matchingCampaigns.length}`,
        reason: "Один ID есть и у товара, и у категории" });
    else note("Gate 4 · кампании товара", matchingCampaigns.length, () =>
      campaignKeys.forEach((branchId) => { delete campaigns[branchId]; }));
    sharedRemove(workspace.gate4?.implementations,
      (row) => row?.product_id === key || row?.productId === key,
      "Gate 4 · реализации товара");

    // Gate 5 reports and setup are owned by campaign identifiers rather than
    // product_id. Remove only records whose campaign belongs to this product.
    const g5 = workspace.gate5 || {};
    if (oppositeIdCollision) {
      const count = megaPlatformGate5IdCountV1(g5, key);
      if (count) unresolved.push({ path: `Gate 5 · записи с общим ID: ${count}`,
        reason: "Один ID есть и у товара, и у категории; кампании оставлены для сверки" });
    } else {
    const ownedCampaigns = (g5.campaignRegistry || []).filter((row) =>
      row?.product_id === key || row?.productId === key);
    const internalIds = new Set(ownedCampaigns.map((row) => String(row.id || "")).filter(Boolean));
    const cabinetIds = new Set(ownedCampaigns.map((row) => String(row.cabinetId || "")).filter(Boolean));
    const ownsInternal = (row) => internalIds.has(String(row?.campaignId || ""));
    const ownsCabinet = (row) => cabinetIds.has(String(row?.campaignId || ""));
    const ownsSetup = (row) => ownsCabinet(row) ||
      cabinetIds.has(String(row?.id || ""));
    const ownsAny = (row) => row?.product_id === key || row?.productId === key ||
      ownsInternal(row) || ownsCabinet(row);
    remove(g5.campaignRegistry,
      (row) => row?.product_id === key || row?.productId === key,
      "Gate 5 · реестр кампаний товара");
    for (const field of ["periodSnapshots", "assessments", "goals", "links",
      "iterations", "comparisons", "finalDecisions"])
      remove(g5[field], ownsAny, `Gate 5 · ${field}`);
    for (const [reportName, rows] of Object.entries(g5.reports || {}))
      remove(rows, ownsAny, `Gate 5 · отчёт ${reportName}`);
    for (const [groupName, rows] of Object.entries(g5.setup || {}))
      if (rows && typeof rows === "object" && !Array.isArray(rows))
        for (const [rowId, row] of Object.entries(rows))
          if (ownsAny(row) || ownsSetup(row))
            drop(rows, rowId, `Gate 5 · настройка ${groupName}`);
    for (const [groupName, rows] of Object.entries(g5.yandexDirect || {})) {
      if (Array.isArray(rows) && groupName === "imports") {
        const ids = (row) => String(row?.campaignId || "").split(",")
          .map((value) => value.trim()).filter(Boolean);
        remove(rows, (row) => ownsAny(row) ||
          ids(row).length > 0 && ids(row).every((value) => cabinetIds.has(value)),
        "Gate 5 · Яндекс Директ imports");
        for (const row of rows) {
          const values = ids(row);
          const owned = values.filter((value) => cabinetIds.has(value));
          if (!owned.length || owned.length === values.length) continue;
          note("Gate 5 · смешанный документ импорта · снята связь кампании", 1,
            () => { row.campaignId = values.filter((value) => !cabinetIds.has(value)).join(","); });
        }
      } else if (Array.isArray(rows)) remove(rows, ownsAny,
        `Gate 5 · Яндекс Директ ${groupName}`);
      else if (rows && typeof rows === "object")
        for (const [rowId, row] of Object.entries(rows))
          if (ownsAny(row) || ownsSetup(row)) drop(rows, rowId,
            `Gate 5 · Яндекс Директ ${groupName}`);
    }
    }
  } else {
    remove(categories, (row) => row?.id === key, "Что продаём · категория");
    sharedDrop(project.productBindingsV185, key,
      "Gate 0 · productBindingsV185[category_id]");
    sharedDrop(project.productScopedOverridesV194, key,
      "Gate 0 · прежний category_id в overrides");
    sharedDrop(workspace.projectComparison?.productsById, key,
      "Gate 1 · прежнее сравнение категории");
    sharedDrop(workspace.gate1WebmasterV295?.byProduct, key,
      "Gate 1 · прежний Вебмастер категории");
    sharedDrop(workspace.gate3ProductJourneyV210?.openStepsByProduct, key,
      "Gate 3 · прежние этапы категории");
    sharedDrop(workspace.gate3Gate4StructureV290?.byProduct, key,
      "Gate 3 · прежняя структура категории");
    sharedDrop(workspace.gate4Production?.readinessV225?.byProduct, key,
      "Gate 4 · прежняя готовность категории");
    sharedDrop(workspace.gate4Production?.forecastAssumptionsByProduct, key,
      "Gate 4 · прежний прогноз категории");
    sharedDrop(workspace.gate4Production?.forecastAssumptionsUiV3, key,
      "Gate 4 · интерфейс прежнего прогноза категории");
    sharedDrop(workspace.gate5?.importsByProduct, key,
      "Gate 5 · прежние импорты категории");
    sharedDrop(workspace.gate6Calendar?.byProduct, key,
      "Gate 6 · прежний календарь категории");
    sharedDrop(workspace.gate8Forecast?.byProduct, key,
      "Gate 8 · прежний прогноз категории");
    drop(urls?.categories, key, "Платформа · URL категории");
    drop(relations?.productOrderByCategory, key, "Платформа · порядок товаров категории");
    if (urls?.onOrderCategoryId === key) {
      drop(urls?.fixed, "on_order", "Платформа · URL «На заказ»");
      clear(urls, "onOrderCategoryId", "Платформа · категория «На заказ»");
    }
    const scoped = project.gate0ScopedValuesV194;
    remove(scoped, (row) => row?.category_id === key && row?.scope === "category",
      "Strategic Foundation · значения категории[category_id]");
    if (Array.isArray(scoped)) {
      const retained = scoped.filter((row) => row?.category_id === key && row?.scope !== "category");
      note("Strategic Foundation · обновляемые ссылки товара на категорию",
        retained.length, () => retained.forEach((row) => { row.category_id = ""; }));
    }
    if (Array.isArray(products)) {
      const affected = products.filter((row) => row?.categoryId === key);
      note("Что продаём · очищаемые прежние ссылки товаров на категорию", affected.length,
        () => affected.forEach((row) => { row.categoryId = ""; }));
    }
    if (relations?.categoryIdsByProduct) {
      note("Платформа · связи товаров с удаляемой категорией",
        affectedProductIds.length, () => affectedProductIds.forEach((productId) => {
          relations.categoryIdsByProduct[productId] = (categoryLists.get(productId) || [])
            .filter((categoryId) => categoryId !== key);
        }));
    }
    if (relations?.primaryByProduct) {
      const affected = Object.entries(relations.primaryByProduct)
        .filter(([, categoryId]) => categoryId === key);
      note("Платформа · прежние основные ссылки на категорию", affected.length,
        () => affected.forEach(([productId]) => { relations.primaryByProduct[productId] = ""; }));
    }
    if (relations?.additionalByProduct) {
      for (const [productId, extras] of Object.entries(relations.additionalByProduct)) {
        if (!Array.isArray(extras) || !extras.includes(key)) continue;
        note("Платформа · удаляемые доп. привязки товара", 1,
          () => { relations.additionalByProduct[productId] = extras.filter((id) => id !== key); });
      }
    }
    clear(project.gate0ScopeUiV194, "selectedCategoryId",
      "Gate 0 · выбранная категория");
    drop(project.catalogUiV191?.collapsedGroupsV193, key,
      "Gate 0 · раскрытие категории");

    for (const card of allCards) {
      if (card.id === "card-22")
        remove(card.pageRows, (row) => row?.categoryId === key,
          "Gate 1 · карточка категории");
      else if (Array.isArray(card.pageRows)) {
        const affected = card.pageRows.filter((row) => row?.categoryId === key);
        note(`Gate 1 · ${card.id} · привязки страниц товара к категории`,
          affected.length, () => affected.forEach((row) => { row.categoryId = ""; }));
      }
      for (const row of card.pageRows || []) {
        drop(row.catalogHubShowcaseV502, key,
          `Gate 1 · ${card.id} · витрина категории`);
        drop(row.homeSegmentImagesV509, key,
          `Gate 1 · ${card.id} · изображение категории`);
      }
      sharedClear(card.currentResultsMeta, "productId",
        `Gate 0 · ${card.id} · прежняя категория результатов`);
      for (const field of ["metrikaQualityV360", "metrikaProductV367"])
        sharedRemove(card.fields?.[field]?.perProduct,
          (row) => row?.product_id === key,
          `Gate 2 · ${card.id} · прежние цели категории`);
    }
    // Direction-level pain rows contain product-specific items. Keep those
    // items in an uncategorized shell so deleting a category cannot erase
    // surviving product semantics.
    for (const [index, map] of (workspace.painV130?.productMaps || []).entries()) {
      if (map?.product_id !== key && map?.category_id !== key) continue;
      if (oppositeIdCollision && map?.category_id !== key) {
        unresolved.push({ path: `Gate 1 · спрос[${index}] · product_id`,
          reason: "ID также принадлежит сохранённому товару; направление не подтверждено category_id" });
        continue;
      }
      const retainedItems = Object.keys(map.items || {}).filter((id) =>
        products.some((product) => product.id === id));
      note(`Gate 1 · спрос[${index}] · данные категории`, 1, () => {
        if (retainedItems.length) {
          for (const itemId of Object.keys(map.items || {}))
            if (!retainedItems.includes(itemId)) delete map.items[itemId];
          map.product_id = "";
          map.category_id = "";
          map.product = "Без категории";
        } else {
          const maps = workspace.painV130.productMaps;
          const position = maps.indexOf(map);
          if (position >= 0) maps.splice(position, 1);
        }
      });
      note(`Gate 1 · спрос[${index}] · сохранённые данные товаров`,
        retainedItems.length);
    }
    const units = workspace.unitV130?.items;
    remove(units, (row) => row?.product_id === key &&
      (row.catalogKind === "direction" || row.type === "direction"),
    "Gate 1 · юнит экономика категории");
    if (Array.isArray(units)) {
      const affected = units.filter((row) => row?.product_id === key &&
        row.catalogKind !== "direction" && row.type !== "direction");
      if (oppositeIdCollision && affected.length)
        unresolved.push({ path: `Gate 1 · юнит экономика · product_id: ${affected.length}`,
          reason: "ID также принадлежит сохранённому товару" });
      else note("Gate 1 · юнит экономика сохранённых товаров · снимаем категорию",
        affected.length, () => affected.forEach((row) => {
          row.product_id = "";
          if (row.directionKey === targetName) row.directionKey = "";
        }));
    }
    // Historical category-level campaign branches may still exist. Exact ID
    // ownership is safe; a branch keyed only by the category name is not.
    const normalized = typeof normalizeAspectKey === "function"
      ? normalizeAspectKey(key) : key;
    const collision = oppositeIdCollision || [...products, ...categories].some((row) => row?.id !== key &&
      (typeof normalizeAspectKey === "function" ? normalizeAspectKey(row.id) : row.id)
        === normalized);
    const categorySearch = workspace.gate4SearchBuild?.[normalized];
    if (categorySearch && collision)
      unresolved.push({ path: `Gate 4 Search · ${normalized}`,
        reason: "Нормализованный ключ совпадает с другим ID" });
    if (categorySearch && !collision) {
      note("Gate 4 Search · прежняя сборка категории", 1,
        () => { delete workspace.gate4SearchBuild[normalized]; });
      note("Gate 4 Search · группы категории", (categorySearch.groupRows || []).length);
      note("Gate 4 Search · объявления категории", megaPlatformSearchAdCountV1(categorySearch));
    }
    const categoryRsya = workspace.gate4Rsya?.[normalized];
    const mixedRsya = (categoryRsya?.groups || []).some((group) =>
      group?.product_id && group.product_id !== key);
    if (categoryRsya && (collision || mixedRsya))
      unresolved.push({ path: `Gate 4 РСЯ · ${normalized}`,
        reason: collision ? "Нормализованный ключ совпадает с другим ID" :
          "Есть группы товаров, которые должны сохраниться" });
    if (categoryRsya && !collision && !mixedRsya) {
      note("Gate 4 РСЯ · прежняя сборка категории", 1,
        () => { delete workspace.gate4Rsya[normalized]; });
      note("Gate 4 РСЯ · группы категории", (categoryRsya.groups || []).length);
      note("Gate 4 РСЯ · объявления категории", (categoryRsya.groups || [])
        .reduce((sum, group) => sum + (group.ads || []).length, 0));
    }
    const nameKey = typeof normalizeAspectKey === "function"
      ? normalizeAspectKey(targetName) : targetName;
    if (nameKey !== normalized && workspace.gate4SearchBuild?.[nameKey])
      unresolved.push({ path: `Gate 4 Search · ${nameKey}`,
        reason: "Старая ветка названа текстом категории, владелец не подтверждён ID" });
    if (nameKey !== normalized && workspace.gate4Rsya?.[nameKey])
      unresolved.push({ path: `Gate 4 РСЯ · ${nameKey}`,
        reason: "Старая ветка названа текстом категории, владелец не подтверждён ID" });
    for (const [branchId, branch] of Object.entries(workspace.gate4Rsya || {})) {
      if (branchId === normalized) continue;
      const count = (branch?.groups || []).filter((group) => group?.product_id === key).length;
      if (count) unresolved.push({ path: `Gate 4 РСЯ · ${branchId} · ${count} групп`,
        reason: "Группы помечены category_id, но ветка может принадлежать сохранённому товару" });
    }
    const campaigns = workspace.gate4Production?.campaigns || {};
    const categoryCampaignKeys = Object.entries(campaigns)
      .filter(([, row]) => row?.product === key || row?.product_id === key ||
        row?.productId === key).map(([campaignKey]) => campaignKey);
    if (oppositeIdCollision && categoryCampaignKeys.length)
      unresolved.push({ path: `Gate 4 · кампании с общим ID: ${categoryCampaignKeys.length}`,
        reason: "Один ID есть и у товара, и у категории" });
    else note("Gate 4 · прежние кампании категории", categoryCampaignKeys.length,
      () => categoryCampaignKeys.forEach((campaignKey) => { delete campaigns[campaignKey]; }));
    for (const [campaignKey, campaign] of Object.entries(campaigns))
      if (campaign?.product === targetName && !categoryCampaignKeys.includes(campaignKey))
        unresolved.push({ path: `Gate 4 · кампания ${campaignKey}`,
          reason: "Владелец указан только названием категории" });
    sharedRemove(workspace.gate4SmmContentV299?.ideas, (row) => row?.productId === key,
      "Gate 4 · прежние SMM идеи категории");
    sharedRemove(workspace.gate4SmmContentV299?.publications,
      (row) => row?.productId === key,
      "Gate 4 · прежние SMM публикации категории");
    const legacyGate5 = workspace.gate5 || {};
    if (oppositeIdCollision) {
      const count = megaPlatformGate5IdCountV1(legacyGate5, key);
      if (count) unresolved.push({ path: `Gate 5 · записи с общим ID: ${count}`,
        reason: "Один ID есть и у товара, и у категории; кампании оставлены для сверки" });
    } else {
    const categoryGate5Campaigns = (legacyGate5.campaignRegistry || []).filter((row) =>
      row?.product_id === key || row?.productId === key);
    const internalIds = new Set(categoryGate5Campaigns.map((row) => String(row.id || ""))
      .filter(Boolean));
    const cabinetIds = new Set(categoryGate5Campaigns.map((row) => String(row.cabinetId || ""))
      .filter(Boolean));
    const ownedByCategory = (row) => row?.product_id === key || row?.productId === key ||
      internalIds.has(String(row?.campaignId || "")) ||
      cabinetIds.has(String(row?.campaignId || ""));
    remove(legacyGate5.campaignRegistry,
      (row) => row?.product_id === key || row?.productId === key,
      "Gate 5 · прежние кампании категории");
    for (const field of ["periodSnapshots", "assessments", "goals", "links",
      "iterations", "comparisons", "finalDecisions"])
      remove(legacyGate5[field], ownedByCategory,
        `Gate 5 · прежние данные категории · ${field}`);
    for (const [reportName, rows] of Object.entries(legacyGate5.reports || {}))
      remove(rows, ownedByCategory,
        `Gate 5 · прежний отчёт категории ${reportName}`);
    for (const [groupName, rows] of Object.entries(legacyGate5.setup || {}))
      if (rows && typeof rows === "object" && !Array.isArray(rows))
        for (const [rowId, row] of Object.entries(rows))
          if (ownedByCategory(row) || cabinetIds.has(String(row?.id || "")))
            drop(rows, rowId, `Gate 5 · прежняя настройка категории ${groupName}`);
    for (const [groupName, rows] of Object.entries(legacyGate5.yandexDirect || {})) {
      if (Array.isArray(rows)) remove(rows, ownedByCategory,
        `Gate 5 · прежний Яндекс Директ категории ${groupName}`);
      else if (rows && typeof rows === "object")
        for (const [rowId, row] of Object.entries(rows))
          if (ownedByCategory(row) || cabinetIds.has(String(row?.id || "")))
            drop(rows, rowId,
              `Gate 5 · прежний Яндекс Директ категории ${groupName}`);
    }
    }
    // Exact legacy category mirror. Sync functions otherwise recreate the
    // removed category from whatSell/whatSellExtra during the next render.
    const remainingNames = categories.filter((row) => row?.id !== key)
      .map((row) => String(row.name || "")).filter(Boolean);
    const legacyNames = [project.whatSell,
      ...(Array.isArray(project.whatSellExtra) ? project.whatSellExtra : [])];
    if (JSON.stringify(legacyNames.filter(Boolean)) !== JSON.stringify(remainingNames))
      note("Gate 0 · прежний список «Что продаём»", 1, () => {
        project.whatSell = remainingNames[0] || "";
        project.whatSellExtra = remainingNames.slice(1);
        if (workspace.sharedEvidence) workspace.sharedEvidence.что_продаем = project.whatSell;
      });
    if (project.productMainJtbds?.[targetName] !== undefined &&
        !categories.some((row) => row.id !== key && row.name === targetName)) {
      const legacyJtbd = project.productMainJtbds[targetName];
      if (!oppositeIdCollision && legacyJtbd && typeof legacyJtbd === "object" &&
          (legacyJtbd.productId === key || legacyJtbd.categoryId === key))
        drop(project.productMainJtbds, targetName,
          "Gate 0 · прежний JTBD категории по названию");
      else unresolved.push({ path: `Gate 0 · прежний JTBD «${targetName}»`,
        reason: "Ключ основан на названии; category_id записи не подтверждён" });
    }
    if (project.offersV2?.productOffers?.[targetName]?.productId === key)
      sharedDrop(project.offersV2.productOffers, targetName,
        "Gate 0 · прежний оффер категории по названию");
    if (platform?.landings?.[targetName]?.productId === key)
      sharedDrop(platform.landings, targetName,
        "Платформа · прежняя посадочная категории по названию");
    for (const overrides of Object.values(project.productScopedOverridesV194 || {}))
      if (overrides && typeof overrides === "object") {
        const affected = Object.values(overrides).filter((row) => row?.category_id === key);
        note("Gate 0 · прежние производные ссылки на категорию", affected.length,
          () => affected.forEach((row) => { row.category_id = ""; }));
      }
  }

  // A page promoted from a manual row belongs to its category/product. Keep
  // the original row for migration until this confirmed, system-wide delete.
  // Match the promotion marker by stable ID, never by its editable name.
  const promotedRow = (row) => row?.promotedV2?.kind === kind &&
    String(row.promotedV2.id || "") === key;
  const promotedRows = (platform?.extra || []).filter(promotedRow);
  const promotedRowIds = [...new Set(promotedRows.map((row) =>
    String(row?.id || "")).filter(Boolean))];
  remove(platform?.extra, promotedRow,
    "Платформа · исходные строки добавленных страниц");
  for (const rowId of promotedRowIds) {
    if ((platform?.extra || []).some((row) =>
        row?.id === rowId && !promotedRow(row))) {
      unresolved.push({ path: `Платформа · старый URL добавленной страницы ${rowId}`,
        reason: "Тот же ID использует другая ручная страница; владелец URL не подтверждён" });
      continue;
    }
    drop(urls?.custom, rowId,
      "Платформа · старый URL добавленной страницы");
  }

  // Other manual pages survive; only their target is cleared. Audit landing
  // rows survive as pages too, retaining their URL and own content.
  if (Array.isArray(platform?.extra)) {
    const affected = platform.extra.filter((row) => !promotedRow(row) && row?.targetV1?.kind ===
      (kind === "product" ? "products" : "categories") && row?.targetV1?.id === key);
    note("Платформа · очищаемые привязки «Для чего»", affected.length,
      () => affected.forEach((row) => { row.targetV1 = null; }));
  }
  const targetKind = kind === "product" ? "products" : "categories";
  const auditExtra = Object.values(platform?.auditExtraV1 || {});
  const auditBindings = auditExtra.filter((row) =>
    row?.targetV1?.kind === targetKind && row?.targetV1?.id === key);
  note("Платформа · привязки аудитных лендингов «Для чего»",
    auditBindings.length,
    () => auditBindings.forEach((row) => { row.targetV1 = null; }));
  for (const card of gate("gate-1")?.cards || []) {
    if (card.id !== "card-32") continue;
    const rows = (card.pageRows || []).filter((row) =>
      row?.targetV1?.kind === targetKind && row?.targetV1?.id === key);
    note("Gate 1 · лендинги · привязка «Для чего»", rows.length,
      () => rows.forEach((row) => { row.targetV1 = null; }));
  }

  return { kind, id: key, name: targetName, details, unresolved,
    affectedProducts: affectedProductIds.length };
}

function megaPlatformDeleteRequest(kind, id, workspace = state) {
  const plan = megaPlatformDeletePlan(kind, id, workspace);
  if (!plan || typeof document === "undefined") return null;
  const modal = document.createElement("dialog");
  modal.className = "mega-platform-delete-dialog";
  const type = kind === "product" ? "товар" : "категорию";
  const title = `Удалить ${type} „${plan.name}“ из всей системы?`;
  modal.innerHTML = `<div class="mega-platform-delete-content">
    <h3></h3><p>Будут удалены или очищены найденные данные:</p><ul></ul>
    ${plan.unresolved.length ? '<p>Неоднозначные записи сохранены для ручной проверки:</p><ul class="mega-platform-unresolved"></ul>' : ""}
    ${kind === "category" ? `<p class="mega-platform-delete-survivors">Товары не удаляются: ${plan.affectedProducts} ${megaPlatformProductCountWordV1(plan.affectedProducts)} ${plan.affectedProducts === 1 ? "останется" : "останутся"} в других категориях или ${plan.affectedProducts === 1 ? "перейдёт" : "перейдут"} в „Без категории“</p>` : ""}
    <p><strong>Действие необратимо</strong></p>
    <div class="mega-platform-delete-actions"><button type="button" data-platform-delete-cancel>Отмена</button><button type="button" data-platform-delete-confirm>Удалить</button></div>
  </div>`;
  modal.querySelector("h3").textContent = title;
  const list = modal.querySelector("ul");
  for (const detail of plan.details) {
    const item = document.createElement("li");
    item.textContent = `${detail.path}: ${detail.count}`;
    list.appendChild(item);
  }
  const unresolvedList = modal.querySelector(".mega-platform-unresolved");
  for (const entry of plan.unresolved) {
    const item = document.createElement("li");
    item.textContent = `${entry.path}: требуется ручное сопоставление. ${entry.reason}`;
    unresolvedList.appendChild(item);
  }
  const close = () => { modal.close?.(); modal.remove(); };
  modal.querySelector("[data-platform-delete-cancel]").onclick = close;
  modal.querySelector("[data-platform-delete-confirm]").onclick = () => {
    megaPlatformDeleteApprovalsV1.set(workspace, `${kind}:${id}`);
    const result = megaPlatformDeleteApply(kind, id, workspace);
    close();
    if (result && workspace === state) {
      if (typeof flashSaving === "function") flashSaving();
      if (typeof renderGate === "function") renderGate();
    }
  };
  modal.oncancel = (event) => { event.preventDefault(); close(); };
  document.body.appendChild(modal);
  if (typeof modal.showModal === "function") modal.showModal();
  else modal.setAttribute("open", "");
  return { modal, plan };
}

function megaPlatformDeleteApply(kind, id, workspace = state) {
  if (megaPlatformDeleteApprovalsV1.get(workspace) !== `${kind}:${id}`) return null;
  megaPlatformDeleteApprovalsV1.delete(workspace);
  const plan = megaPlatformDeletePlan(kind, id, workspace);
  if (!plan) return null;
  megaPlatformDeleteCollectV1(kind, id, workspace, true);
  return plan;
}

// Exact IDs explicitly requested for removal from «Коричное яблоко».
// The guards prevent deleting a later edited product or a category that is no
// longer the empty duplicate shown in the supplied Gate 0 export.
function megaPlatformApplyRequestedCleanupV2(workspace = state) {
  if (!workspace?.project) return false;
  const productId = "catalog-item-1790858859476-58e86f";
  const duplicateId = "platform-page-1790856979268-85128b";
  const survivorId = "platform-page-1790858796945-b73ebf";
  const products = workspace.project.catalogItemsV189 || [];
  const categories = workspace.project.productRegistryV185 || [];
  const product = products.find((item) => item.id === productId);
  const duplicate = categories.find((item) => item.id === duplicateId);
  const survivor = categories.find((item) => item.id === survivorId);
  const remove = (kind, id) => {
    megaPlatformDeleteApprovalsV1.set(workspace, `${kind}:${id}`);
    return Boolean(megaPlatformDeleteApply(kind, id, workspace));
  };
  let changed = false;
  // Remove only genuinely empty orphan products. A blank name with any URL,
  // continuum, source audit row or gate data is preserved for review.
  const emptyPaths = new Set(["Что продаём · позиции", "Платформа · категории товара"]);
  for (const item of [...products]) {
    if (String(item?.name || "").trim() || String(item?.continuum || "").trim() ||
        item?.source || megaPlatformUrl("products", item.id, workspace)) continue;
    const meaningfulField = Object.entries(item).some(([field, value]) =>
      !["id", "name", "continuum", "categoryId", "createdAt", "manualOriginV2"].includes(field) &&
      value !== "" && value !== null && value !== undefined);
    if (meaningfulField) continue;
    const plan = megaPlatformDeletePlan("product", item.id, workspace);
    if (plan?.unresolved?.length || plan?.details?.some((entry) => !emptyPaths.has(entry.path))) continue;
    changed = remove("product", item.id) || changed;
  }
  if (workspace.project.id !== "project-1783243907480-ec7d8c") return changed;
  if (product && !String(product.name || "").trim() &&
      !megaPlatformUrl("products", productId, workspace) &&
      !megaPlatformProductCategoryIds(productId, workspace).length)
    changed = remove("product", productId) || changed;
  if (duplicate && survivor && duplicate.name === "Символ 2027" &&
      survivor.name === duplicate.name &&
      !megaPlatformUrl("categories", duplicateId, workspace))
    changed = remove("category", duplicateId) || changed;
  return changed;
}

queueMicrotask(() => {
  if (typeof state === "undefined" || !megaPlatformApplyRequestedCleanupV2(state)) return;
  if (typeof flashSaving === "function") flashSaving();
  if (typeof guruInvalidateGateViewCache === "function") guruInvalidateGateViewCache();
  if (typeof render === "function") render();
});
