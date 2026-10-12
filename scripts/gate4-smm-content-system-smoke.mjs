const debugPort = process.env.GURU_CHROME_DEBUG_PORT || "9339";
const appUrl = process.env.GURU_APP_URL || "http://127.0.0.1:3000/";
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const expectedIdeaExplanations = [
  "Прежде чем родится идея, мозгу нужно сырьё — конкретное (всё о продукте, задаче, аудитории) и общее (широкий кругозор, чужие примеры, далёкие темы). Чем больше материала собрано, тем выше шанс, что два случайных факта соединятся во что-то новое. Задача этапа — набрать достаточно, не экономить на этом шаге.",
  "Собранные факты нужно мысленно покрутить — сопоставить, поискать связи между тем, что на первый взгляд не связано. Это неторопливая, внутренняя работа, её нельзя ускорить усилием воли. Задача этапа — не искать готовый ответ, а дать фактам столкнуться друг с другом в голове.",
  "Когда сознательные усилия исчерпаны, нужно отложить задачу совсем — переключиться на что-то другое, что увлекает. В это время подсознание продолжает работать без твоего участия. Задача этапа — перестать напрягаться специально, а не додумывать через силу.",
  "Идея приходит сама, часто неожиданно и не в момент работы над задачей — в душе, на прогулке, во сне. Это не мистика, а закономерный итог первых трёх этапов. Задача этапа — просто заметить идею и сразу записать, пока она не забылась.",
  "Сырая идея почти всегда нуждается в доработке под реальные условия — бюджет, площадку, аудиторию. Здесь же идею проверяют на других людях и честной обратной связи. Задача этапа — довести идею до практической, рабочей формы, а не оставить красивой мыслью.",
];

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  async call(method, params = {}) {
    await this.ready;
    return new Promise((resolve, reject) => {
      const id = ++this.sequence;
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() { this.socket.close(); }
}

async function evaluate(client, expression) {
  const response = await client.call("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text);
  }
  return response.result.value;
}

async function waitFor(client, expression, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(client, `Boolean(${expression})`)) return;
    await wait(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

const browserVersion = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json();
const browser = new CdpClient(browserVersion.webSocketDebuggerUrl);
await browser.ready;
const { browserContextId } = await browser.call("Target.createBrowserContext");
const { targetId } = await browser.call("Target.createTarget", { url: "about:blank", browserContextId });
const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
const target = targets.find((item) => item.id === targetId);
const page = new CdpClient(target.webSocketDebuggerUrl);
await page.ready;

try {
  await page.call("Runtime.enable");
  await page.call("Page.enable");
  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await page.call("Page.addScriptToEvaluateOnNewDocument", {
    source: `{
      const nativeFetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input).includes("/api/")
        ? Promise.resolve(new Response(JSON.stringify({ ok: true, isolatedSmokeTest: true }), { status: 200, headers: { "Content-Type": "application/json" } }))
        : nativeFetch(input, init);
    }`,
  });
  await page.call("Page.navigate", { url: appUrl });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(page, 'typeof bootstrapAppOnce === "function"');
  await evaluate(page, `(() => {
    localStorage.clear();
    localStorage.setItem("guru-platform-access-v01", "unlocked");
    localStorage.setItem("guru-platform-projects-v02", JSON.stringify([{
      id: "gate4-smm-content-smoke",
      name: "Gate 4 SMM content smoke",
      lifecycleStatus: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));
    location.reload();
    return true;
  })()`);
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, 'Boolean(state)');

  const result = await evaluate(page, `(() => {
    scheduleCloudSync = () => {};
    scheduleProjectsCloudSync = () => {};
    const now = new Date().toISOString();
    const productId = "product-goat-smm-v299";
    const categoryId = "category-gifts-smm-v299";
    state.project.productRegistryV185 = [{ id: categoryId, name: "Дизайнерские подарки", legacyNames: [], createdAt: now }];
    const gate1 = state.gates.find((gate) => gate.id === "gate-1");
    const pageCard = gate1.cards.find((card) => typeof g1pcIsProductCard === "function" && g1pcIsProductCard(card) && g1pcCardKind(card) === "product");
    pageCard.pageRows = [{
      id: "goat-smm-page-row-v299",
      name: "Символ 2027 года «Коза»",
      catalogItemIdV189: productId,
      url: "https://example.test/goat",
      contextFields: { productCreationV253: "Каждая Коза создаётся вручную мастером из льна и хлопка" }
    }];
    state.project.catalogItemsV189 = [{
      id: productId,
      name: "Символ 2027 года «Коза»",
      continuum: "pure_product",
      categoryId,
      createdAt: now,
      source: { kind: "gate1", cardId: pageCard.id, rowId: "goat-smm-page-row-v299", rowIndex: 0 }
    }];
    state.project.gate0ScopedValuesV194 = [
      ["jtbd", "Когда нужен тёплый авторский подарок, выбрать Козу ручной работы"],
      ["segments", "Женщины 25+ из Москвы, выбирающие подарки заранее"],
      ["positioning", "Авторская текстильная Коза — интерьерный декор"],
      ["usp", "Каждый экземпляр сшит вручную"],
      ["offers", "Особенный новогодний подарок, который остаётся частью домашнего уюта"]
    ].map(([field, value], index) => ({
      id: "smm-source-" + index,
      project_id: activeProjectId,
      category_id: categoryId,
      product_id: productId,
      scope: "product",
      field,
      value,
      confirmation_status: "confirmed",
      created_at: now,
      updated_at: now
    }));
    state.project._gate0ProductIdMigrationLog = [
      { id: GURU_GATE0_PRODUCT_SCOPE_MIGRATION_V194, at: now, status: "test" },
      { id: GURU_GATE0_OFFER_CTA_MIGRATION_V197, at: now, status: "test" }
    ];
    state.painV130 = {
      ...(state.painV130 || {}),
      productMaps: [{
        product_id: categoryId,
        product: "Дизайнерские подарки",
        items: {
          [productId]: {
            demandRows: [
              { kw: "интерьерная коза", finalFoundationImportedAtV259: now },
              { kw: "коза ручной работы", finalFoundationImportedAtV259: now },
              { kw: "служебный черновик без метрик" }
            ],
            semL4Model: {
              mainJtbd: "",
              additionalJtbds: [
                { id: "smm-additional-jtbd-2", situation: "Когда нужен авторский подарок", desired_action: "выбрать Козу ручной работы", result: "получить вещь с характером", source: "manual" },
                { id: "smm-additional-jtbd-3", situation: "Когда хочется обновить интерьер", desired_action: "найти необычный декор", result: "добавить дому тепла", source: "manual" }
              ]
            },
            jtbdKeywordAssignmentsV274: {
              "интерьерная коза": { target: "primary" },
              "коза ручной работы": { target: "additional", additional_jtbd_id: "smm-additional-jtbd-2" }
            }
          }
        }
      }]
    };
    const ui = guruV194Ui(state);
    ui.selectedCategoryId = categoryId;
    ui.selectedProductId = productId;
    state.gate4Production.launchProduct = productId;
    delete state.gate4SmmContentV299;
    guruNavigateToGate("gate-4");
    renderGate();

    // Baseline after all pre-existing migrations/render normalization settled.
    const before = g4SmmGateStructureAuditV299(state);
    const beforeExact = Object.fromEntries(Object.entries(before).map(([id, data]) => [id, data.exactJson]));
    const readinessBefore = g4ReadinessAllCardsV225(state).map((card) => card.id);
    const channelKeysBefore = g4LaunchChannels().map((channel) => channel.key);
    const strategyBefore = JSON.stringify(state.gate4SmmStrategyV298);

    const selectorShell = document.querySelector('[data-guru-product-context="gate4-launch"]');
    const route = selectorShell?.parentElement;
    const system = document.querySelector('[data-g4-smm-content-system-v299]');
    const aware = document.querySelector('[data-g4-map-stage-v290="aware"]');
    const smmTool = [...document.querySelectorAll('.g4-map-tool-v290')].find((node) =>
      node.querySelector(':scope > .g4-map-tool-title-v290 > strong')?.textContent.trim() === "SMM / посевы"
    );
    const smmTitle = smmTool?.querySelector(':scope > .g4-map-tool-title-v290');
    const strategyNode = smmTool?.querySelector(':scope > [data-g4-smm-strategy-v298]');
    const vkCard = [...(smmTool?.querySelectorAll(':scope > article') || [])].find((node) =>
      node.querySelector('[data-g4camp-toggle] .g1-card-title, [data-g4camp-toggle] .g4-campaign-platform strong')?.textContent.trim() === "VK Ads / Таргет"
    );
    const contentNode = strategyNode.querySelector('[data-g4-smm-content-system-v299]');
    system.querySelector('[data-g4-smm-idea-add-v299]').click();

    let ideaCard = document.querySelector('[data-g4-smm-idea-card-v299]');
    const initialMaterial = ideaCard.textContent;
    const materialFoundation = ideaCard.querySelector('[data-g4-smm-idea-foundation-v313]');
    const materialOrder = [...materialFoundation.children].slice(0, 8).map((node) =>
      node.matches('details')
        ? node.querySelector('.guru-strategic-jtbd-number-v286')?.textContent.trim()
        : node.querySelector('.guru-strategic-row-copy-v286 > strong')?.textContent.trim()
    );
    const jtbdCards = [...materialFoundation.querySelectorAll(':scope > details[data-guru-strategic-jtbd-v286]')];
    const jtbdLabels = jtbdCards.map((node) => node.querySelector('.guru-strategic-jtbd-number-v286')?.textContent.trim());
    const primaryInitiallyOpen = jtbdCards[0]?.open === true;
    const additionalInitiallyClosed = jtbdCards.slice(1).every((node) => node.open === false);
    jtbdCards[1].open = true;
    const additionalKeywordVisible = jtbdCards[1].textContent.includes('коза ручной работы');
    const productNameWalker = document.createTreeWalker(ideaCard, NodeFilter.SHOW_TEXT);
    let productNameOccurrences = 0;
    while (productNameWalker.nextNode()) {
      if (productNameWalker.currentNode.nodeValue.trim() === "Символ 2027 года «Коза»")
        productNameOccurrences += 1;
    }
    const stagesVisible = [...ideaCard.querySelectorAll('[data-g4-smm-idea-stage-view-v299]')]
      .filter((node) => node.getClientRects().length).map((node) => node.dataset.g4SmmIdeaStageViewV299);
    const explanationNodes = [...ideaCard.querySelectorAll('[data-g4-smm-idea-stage-explanation-v311]')];
    const stageExplanations = explanationNodes.map((node) => ({
      stage: node.dataset.g4SmmIdeaStageExplanationV311,
      text: node.textContent,
      classReused: node.classList.contains("g3-product-journey-stage-explanation-v296"),
      visible: Boolean(node.getClientRects().length),
      fontSize: getComputedStyle(node).fontSize,
    }));
    const taskFormat = state.gate4SmmStrategyV298.formats.find((row) => row.task === "Доверие, результат");
    const taskSelect = ideaCard.querySelector('[data-g4-smm-idea-field-v299="primaryTaskFormatId"]');
    const taskOptionLabels = [...taskSelect.options].slice(1).map((option) => option.textContent.trim());
    taskSelect.value = taskFormat.id;
    taskSelect.dispatchEvent(new Event("change", { bubbles: true }));
    ideaCard = document.querySelector('[data-g4-smm-idea-card-v299]');
    const digestionNotes = ideaCard.querySelector('[data-g4-smm-idea-field-v299="digestionNotes"]');
    const taskLiveBefore = ideaCard.querySelector('[data-g4-smm-idea-primary-task-live-v315]')?.textContent || "";
    const liveTaskFormat = state.gate4SmmStrategyV298.formats.find((row) => row.id === taskFormat.id);
    const originalPlatforms = liveTaskFormat.platforms;
    liveTaskFormat.platforms = "ВКонтакте, Telegram, MAX, Instagram, Тестовая площадка";
    renderGate();
    ideaCard = document.querySelector('[data-g4-smm-idea-card-v299]');
    const taskLiveAfterStrategyChange = ideaCard.querySelector('[data-g4-smm-idea-primary-task-live-v315]')?.textContent || "";
    state.gate4SmmStrategyV298.formats.find((row) => row.id === taskFormat.id).platforms = originalPlatforms;
    renderGate();
    ideaCard = document.querySelector('[data-g4-smm-idea-card-v299]');
    const digestionLayout = ideaCard.querySelector('[data-g4-smm-digestion-layout-v316]');
    const digestion = {
      notesRows: Number(ideaCard.querySelector('[data-g4-smm-idea-field-v299="digestionNotes"]')?.rows),
      notesMinHeight: parseFloat(getComputedStyle(ideaCard.querySelector('[data-g4-smm-idea-field-v299="digestionNotes"]')).minHeight),
      notesHeight: ideaCard.querySelector('[data-g4-smm-idea-field-v299="digestionNotes"]')?.getBoundingClientRect().height || 0,
      desktopColumns: getComputedStyle(digestionLayout).gridTemplateColumns.split(" ").length,
      leftTaskFirst: digestionLayout?.firstElementChild?.matches('[data-g4-smm-idea-primary-task-v315]') || false,
      rightThoughtsSecond: digestionLayout?.children?.[1]?.classList.contains('g4-smm-digestion-thoughts-v316') || false,
      verticalDetailRows: ideaCard.querySelectorAll('.g4-smm-idea-task-details-v316 > div').length,
      horizontalTaskTableRemoved: !ideaCard.querySelector('.g4-smm-idea-task-table-v315'),
      taskOptions: taskOptionLabels,
      selectedId: state.gate4SmmContentV299.ideas[0].primaryTaskFormatId,
      linkedRow: {
        task: taskLiveBefore.includes("Доверие, результат"),
        format: taskLiveBefore.includes("Фото / кейс"),
        topics: taskLiveBefore.includes("Кейс / результат") && taskLiveBefore.includes("До / после"),
        volume: taskLiveBefore.includes("1 за 1 неделю"),
        platforms: taskLiveBefore.includes("ВКонтакте, Telegram, MAX, Instagram"),
      },
      liveReadUpdated: taskLiveAfterStrategyChange.includes("Тестовая площадка"),
      noCopiedStrategyFields: !Object.keys(state.gate4SmmContentV299.ideas[0]).some((key) => ["task", "format", "topics", "volume", "platforms"].includes(key)),
    };
    const note = ideaCard.querySelector('[data-g4-smm-idea-field-v299="digestionNotes"]');
    const ideaName = ideaCard.querySelector('[data-g4-smm-idea-field-v299="name"]');
    const ideaNameLabel = ideaName.closest("label")?.querySelector(":scope > span")?.textContent.trim() || "";
    ideaName.value = "Коза из ткани";
    ideaName.dispatchEvent(new Event("input", { bubbles: true }));
    const ideaNameTitleLive = ideaCard.querySelector('[data-g4-smm-idea-card-title-v332]')?.textContent.trim() || "";
    const initialIdeaName = state.gate4SmmContentV299.ideas[0].name;
    note.value = "Связать ручную работу с ощущением домашнего уюта";
    note.dispatchEvent(new Event("input", { bubbles: true }));
    digestion.persistedImmediately = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId) || "{}")
      ?.gate4SmmContentV299?.ideas?.find((row) => row.id === ideaCard.dataset.g4SmmIdeaCardV299)?.digestionNotes === note.value;
    const insight = ideaCard.querySelector('[data-g4-smm-idea-field-v299="insight"]');
    insight.value = "Как рождается Коза с характером";
    insight.dispatchEvent(new Event("input", { bubbles: true }));
    digestion.insightPersistedImmediately = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId) || "{}")
      ?.gate4SmmContentV299?.ideas?.find((row) => row.id === ideaCard.dataset.g4SmmIdeaCardV299)?.insight === insight.value;
    ideaCard = document.querySelector('[data-g4-smm-idea-card-v299]');
    const weekDays = [...document.querySelectorAll('[data-g4-smm-week-day-v322]')];
    const scheduledIdeaId = ideaCard.dataset.g4SmmIdeaCardV299;
    const monday = weekDays[0];
    const wednesday = weekDays[2];
    const bankBefore = document.querySelectorAll('[data-g4-smm-calendar-drop-v339="bank"] [data-g4-smm-calendar-drag-v339="' + CSS.escape(scheduledIdeaId) + '"]').length;
    const dragIdeaTo = (targetSelector) => {
      const source = document.querySelector('[data-g4-smm-calendar-drag-v339="' + CSS.escape(scheduledIdeaId) + '"]');
      const target = document.querySelector(targetSelector);
      const transfer = new DataTransfer();
      source.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: transfer }));
      target.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: transfer }));
      target.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
      source.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer: transfer }));
    };
    dragIdeaTo('[data-g4-smm-week-day-v322="' + monday.dataset.g4SmmWeekDayV322 + '"]');
    const movedToMonday = state.gate4SmmContentV299.ideas.find((row) => row.id === scheduledIdeaId)?.scheduledDate === monday.dataset.g4SmmWeekDayV322;
    dragIdeaTo('[data-g4-smm-week-day-v322="' + wednesday.dataset.g4SmmWeekDayV322 + '"]');
    const movedBetweenDays = state.gate4SmmContentV299.ideas.find((row) => row.id === scheduledIdeaId)?.scheduledDate === wednesday.dataset.g4SmmWeekDayV322;
    dragIdeaTo('[data-g4-smm-calendar-drop-v339="bank"]');
    const returnedToBank = !state.gate4SmmContentV299.ideas.find((row) => row.id === scheduledIdeaId)?.scheduledDate;
    dragIdeaTo('[data-g4-smm-week-day-v322="' + wednesday.dataset.g4SmmWeekDayV322 + '"]');
    const scheduledIdea = state.gate4SmmContentV299.ideas.find((row) => row.id === scheduledIdeaId);
    const calendarSummary = g4SmmContentSummaryV299();
    const scheduledCalendarCard = document.querySelector('[data-g4-smm-calendar-drag-v339="' + CSS.escape(scheduledIdeaId) + '"]');
    const calendar = {
      weekdays: [...document.querySelectorAll('[data-g4-smm-week-day-v322] > header strong')].map((node) => node.textContent.trim()),
      horizontalDays: getComputedStyle(document.querySelector('.g4-smm-week-days-v322')).display === "grid" &&
        getComputedStyle(document.querySelector('.g4-smm-week-days-v322')).gridTemplateColumns.split(" ").length === 8,
      scheduledDate: scheduledIdea?.scheduledDate || "",
      wednesdayDate: wednesday.dataset.g4SmmWeekDayV322,
      bankBefore,
      bankAfter: document.querySelectorAll('[data-g4-smm-calendar-drop-v339="bank"] [data-g4-smm-calendar-drag-v339="' + CSS.escape(scheduledIdeaId) + '"]').length,
      movedToMonday,
      movedBetweenDays,
      returnedToBank,
      draggable: scheduledCalendarCard?.draggable === true,
      cardWidth: scheduledCalendarCard?.getBoundingClientRect().width || 0,
      normalWordBreak: getComputedStyle(scheduledCalendarCard?.querySelector("strong")).wordBreak !== "break-all",
      renderedOnce: document.querySelectorAll('[data-g4-smm-calendar-idea-v322="' + CSS.escape(scheduledIdeaId) + '"]').length,
      plannedCases: calendarSummary.plan.counts.cases,
      plannedTotal: calendarSummary.plan.total,
      persistedImmediately: JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId) || "{}")
        ?.gate4SmmContentV299?.ideas?.find((row) => row.id === scheduledIdeaId)?.scheduledDate === scheduledIdea?.scheduledDate,
      durableMutationMarked: Boolean(
        JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId) || "{}")?._guruDurableMutationAt,
      ),
      displayedTitle: document.querySelector('[data-g4-smm-calendar-idea-v322="' + CSS.escape(scheduledIdeaId) + '"] strong')?.textContent.trim() || "",
    };
    ideaCard = document.querySelector('[data-g4-smm-idea-card-v299="' + CSS.escape(scheduledIdeaId) + '"]');
    const convertButton = ideaCard.querySelector('[data-g4-smm-idea-convert-v299]');
    const saveAsPublicationLabel = convertButton?.textContent.trim() || "";
    convertButton.click();

    let publicationCard = document.querySelector('[data-g4-smm-publication-card-v299]');
    if (!publicationCard) throw new Error(JSON.stringify({
      diagnostic: "publication-not-rendered-after-click",
      activeGateId,
      gate4Product: state.gate4Production.launchProduct,
      contentSystems: document.querySelectorAll('[data-g4-smm-content-system-v299]').length,
      publicationLists: document.querySelectorAll('.g4-smm-publication-list-v299').length,
      publicationListHtml: document.querySelector('.g4-smm-publication-list-v299')?.innerHTML || "",
      directHtmlHasPublication: g4SmmContentSystemHtmlV299(g4ProductPickSelected(state)).includes('data-g4-smm-publication-card-v299'),
      publicationTextVisible: document.body.textContent.includes("Как рождается Коза с характером"),
      ideas: state.gate4SmmContentV299.ideas.map((row) => ({ id: row.id, stage: row.stage, publicationId: row.publicationId })),
      publications: state.gate4SmmContentV299.publications.map((row) => row.id),
    }));
    const createdWorkflow = publicationCard.closest('[data-g4-smm-idea-workflow-v324]');
    const createdIdeaCard = createdWorkflow?.querySelector(':scope > [data-g4-smm-idea-card-v299]');
    const workflowEditButton = createdIdeaCard?.querySelector('[data-g4-smm-workflow-mode-v342="edit"]');
    const lockedDuplicateFieldsHidden =
      !publicationCard.querySelector('[data-g4-smm-publication-field-v299="topicId"]') &&
      !publicationCard.querySelector('[data-g4-smm-publication-field-v299="formatId"]') &&
      !publicationCard.querySelector('[data-g4-smm-publication-field-v299="platforms"]') &&
      !publicationCard.querySelector('[data-g4-smm-publication-field-v299="status"]') &&
      !publicationCard.querySelector('[data-g4-smm-publication-order-v334="meaning"]');
    const unifiedAfterCreation = createdWorkflow?.children.length === 1 &&
      createdIdeaCard?.contains(publicationCard) &&
      !publicationCard.classList.contains('g1-card') &&
      !publicationCard.querySelector(':scope > .g1-card-header-static') &&
      !publicationCard.querySelector(':scope > .g4-smm-publication-embedded-head-v342 .status-pill') &&
      !publicationCard.textContent.includes('Публикация №');
    const oneWorkflowEditControl = createdIdeaCard?.querySelectorAll(
      '[data-g4-smm-workflow-mode-v342], [data-g4-smm-idea-mode-v330], [data-g4-smm-publication-mode-v328]',
    ).length === 1;
    const lockedAfterCreation = workflowEditButton?.textContent.trim() === "Редактировать" &&
      publicationCard.querySelector('.g4-smm-publication-lock-v328')?.disabled === true &&
      lockedDuplicateFieldsHidden && unifiedAfterCreation && oneWorkflowEditControl;
    const savedIdeaStage = document.querySelector('[data-g4-smm-idea-card-v299="' + CSS.escape(scheduledIdeaId) + '"] [data-g4-smm-idea-stage-view-v299="verification"]');
    const savedStageCompact = savedIdeaStage?.querySelector('[data-g4-smm-idea-convert-v299]') === null &&
      savedIdeaStage?.querySelector('.g4-smm-publication-saved-v329')?.textContent.trim() === "Сохранено как публикация";
    let savedIdeaCard = document.querySelector('[data-g4-smm-idea-card-v299="' + CSS.escape(scheduledIdeaId) + '"]');
    const savedIdeaFields = [...savedIdeaCard.querySelectorAll('[data-g4-smm-idea-field-v299]')];
    const ideaLockedAfterCreation = savedIdeaCard.dataset.g4SmmIdeaEditingV330 === "false" &&
      savedIdeaFields.length === 4 && savedIdeaFields.every((field) => field.disabled) &&
      savedIdeaCard.querySelector('[data-g4-smm-workflow-mode-v342="edit"]')?.textContent.trim() === "Редактировать";
    const lockedIdeaInsight = savedIdeaCard.querySelector('[data-g4-smm-idea-field-v299="insight"]');
    const storedIdeaInsightBeforeBlockedInput = scheduledIdea.insight;
    lockedIdeaInsight.value = "Эта попытка не должна сохраниться";
    lockedIdeaInsight.dispatchEvent(new Event("input", { bubbles: true }));
    const ideaLockedInputBlocked = scheduledIdea.insight === storedIdeaInsightBeforeBlockedInput;
    savedIdeaCard.querySelector('[data-g4-smm-workflow-mode-v342="edit"]').click();
    savedIdeaCard = document.querySelector('[data-g4-smm-idea-card-v299="' + CSS.escape(scheduledIdeaId) + '"]');
    publicationCard = savedIdeaCard.querySelector('[data-g4-smm-publication-card-v299]');
    const ideaEditableAfterClick = savedIdeaCard.dataset.g4SmmIdeaEditingV330 === "true" &&
      [...savedIdeaCard.querySelectorAll('[data-g4-smm-idea-field-v299]')].every((field) => !field.disabled) &&
      savedIdeaCard.querySelector('[data-g4-smm-workflow-mode-v342="save"]')?.textContent.trim() === "Сохранить";
    const editableAfterClick = publicationCard.dataset.g4SmmPublicationEditingV328 === "true" &&
      publicationCard.querySelector('.g4-smm-publication-lock-v328')?.disabled === false &&
      Boolean(publicationCard.querySelector('[data-g4-smm-publication-field-v299="topicId"]')) &&
      Boolean(publicationCard.querySelector('[data-g4-smm-publication-field-v299="formatId"]')) &&
      Boolean(publicationCard.querySelector('[data-g4-smm-publication-field-v299="platforms"]')) &&
      Boolean(publicationCard.querySelector('[data-g4-smm-publication-field-v299="status"]'));
    const publicationId = publicationCard.dataset.g4SmmPublicationCardV299;
    const storedPublication = state.gate4SmmContentV299.publications.find((row) => row.id === publicationId);
    const sourceIdea = state.gate4SmmContentV299.ideas.find((row) => row.id === storedPublication.sourceIdeaId);
    const transferred = {
      title: storedPublication.title,
      description: storedPublication.description,
      jtbd: storedPublication.sourceContext?.concrete?.find((row) => row.key === "jtbd")?.value || "",
      keywords: storedPublication.sourceContext?.keywords || []
    };
    const setPublicationSelect = (field, value) => {
      const node = document.querySelector('[data-g4-smm-publication-card-v299="' + publicationId + '"] [data-g4-smm-publication-field-v299="' + field + '"]');
      node.value = value;
      node.dispatchEvent(new Event("change", { bubbles: true }));
    };
    setPublicationSelect("topicId", state.gate4SmmStrategyV298.topics[0].id);
    setPublicationSelect("formatId", state.gate4SmmStrategyV298.formats[0].id);
    setPublicationSelect("date", g4SmmTodayV299());
    setPublicationSelect("status", "published");
    publicationCard = document.querySelector('[data-g4-smm-publication-card-v299="' + publicationId + '"]');
    const titleEmptyAfterFormatTopic = publicationCard.querySelector('[data-g4-smm-publication-field-v299="title"]')?.value === "" &&
      state.gate4SmmContentV299.publications.find((row) => row.id === publicationId)?.title === "";
    const videoMainOrder = [...publicationCard.querySelectorAll('[data-g4-smm-publication-order-v334]')]
      .map((node) => node.dataset.g4SmmPublicationOrderV334);
    const publicationBody = publicationCard.querySelector('.g4-smm-publication-lock-v328');
    const firstGroupCell = publicationCard.querySelector('.g4-smm-publication-fields-v299');
    const firstRowLabel = firstGroupCell?.querySelector(':scope > .g1-field');
    const firstRowTitle = firstRowLabel?.querySelector(':scope > span:first-child');
    const unifiedOuterCard = publicationCard.closest('[data-g4-smm-idea-card-v299]');
    const visualHierarchy = {
      bodyPaddingLeft: parseFloat(getComputedStyle(publicationBody).paddingLeft),
      labelInsetFromCard: firstRowTitle?.getBoundingClientRect().left - unifiedOuterCard.getBoundingClientRect().left || 0,
      cellBorderRadius: parseFloat(getComputedStyle(firstGroupCell).borderRadius),
      groupedSections: publicationCard.querySelectorAll('.g4-smm-publication-group-v335').length,
      singleOuterFrame: parseFloat(getComputedStyle(unifiedOuterCard).borderWidth) > 0 &&
        !publicationCard.classList.contains('g1-card'),
      embeddedDivider: parseFloat(getComputedStyle(publicationCard).borderTopWidth) > 0,
      resultsHidden: !publicationCard.querySelector('.g4-smm-publication-results-v299') &&
        !publicationCard.querySelector('[data-g4-smm-publication-result-v299]'),
    };
    const conciseTitle = "Из ткани в символ года";
    const conciseTitleField = publicationCard.querySelector('[data-g4-smm-publication-field-v299="title"]');
    const conciseTitleLabel = conciseTitleField.closest("label")?.querySelector(":scope > span")?.textContent.trim() || "";
    conciseTitleField.value = conciseTitle;
    conciseTitleField.dispatchEvent(new Event("input", { bubbles: true }));
    const publicationTitleLive = conciseTitleField.value;
    const secondaryPublicationTitleHidden = !publicationCard.querySelector('[data-g4-smm-publication-card-title-v331]') &&
      !publicationCard.textContent.includes('Публикация №');
    const ideaTitleAfterPublicationEdit = document.querySelector(
      '[data-g4-smm-idea-card-v299="' + CSS.escape(sourceIdea.id) + '"] [data-g4-smm-idea-card-title-v332]',
    )?.textContent.trim() || "";
    const calendarTitleAfterPublicationEdit = document.querySelector(
      '[data-g4-smm-calendar-idea-v322="' + CSS.escape(sourceIdea.id) + '"] strong',
    )?.textContent.trim() || "";
    const ideaAfterPublicationEdit = state.gate4SmmContentV299.ideas.find((row) => row.id === sourceIdea.id);
    const contentField = publicationCard.querySelector('[data-g4-smm-publication-field-v299="content"]');
    contentField.value = "Сценарий вертикального ролика о процессе создания";
    contentField.dispatchEvent(new Event("input", { bubbles: true }));
    const publicationImmediateLocalContent = JSON.parse(
      localStorage.getItem("guru-platform-workspace-v02-" + activeProjectId) || "{}",
    ).gate4SmmContentV299?.publications?.find((row) => row.id === publicationId)?.content || "";
    publicationCard = document.querySelector('[data-g4-smm-publication-card-v299="' + publicationId + '"]');
    const briefSet = (field, value) => {
      const node = publicationCard.querySelector('[data-g4-smm-brief-field-v325="' + field + '"]');
      if (!node) throw new Error("Missing creative brief field: " + field);
      node.value = value;
      node.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const shortBrief = publicationCard.querySelector('[data-g4-smm-creative-brief-v325]');
    const shortHint = shortBrief?.textContent || "";
    const meaningBefore = document.querySelector('[data-g4-smm-idea-id-v299="' + CSS.escape(sourceIdea.id) + '"][data-g4-smm-idea-field-v299="insight"]')?.value || "";
    const duplicateMeaningHidden = !publicationCard.querySelector('[data-g4-smm-brief-meaning-v325]') &&
      !publicationCard.querySelector('[data-g4-smm-publication-order-v334="meaning"]');
    const briefOrder = [...shortBrief.querySelectorAll('[data-g4-smm-brief-order-v334]')]
      .map((node) => node.dataset.g4SmmBriefOrderV334);
    const storyboardTrack = shortBrief.querySelector('.g4-smm-storyboard-track-v344');
    const storyboardColumns = getComputedStyle(storyboardTrack).gridTemplateColumns.split(" ").length;
    const productionStageOrder = [...shortBrief.querySelectorAll('[data-g4-smm-production-stage-v344]')]
      .map((node) => node.dataset.g4SmmProductionStageV344);
    const packageOrder = [...shortBrief.querySelectorAll('[data-g4-smm-package-order-v344]')]
      .map((node) => node.dataset.g4SmmPackageOrderV344);
    const materialMerged = productionStageOrder.length === 2 &&
      shortBrief.contains(contentField) &&
      ![...publicationCard.querySelectorAll('.g4-smm-publication-group-head-v335 > strong')]
        .some((node) => node.textContent.trim() === "Материал");
    const videoDescriptionHidden = !publicationCard.querySelector('[data-g4-smm-publication-field-v299="description"]');
    briefSet("hook", "Почему эта Коза рождается не за пять минут?");
    briefSet("promise", "Покажем весь путь от ткани до готового подарка");
    briefSet("storyboard", "0-3 сек — готовая Коза\\n3-7 сек — раскрой ткани\\n7-15 сек — сборка");
    briefSet("proof", "Готовая Коза рядом с исходным эскизом");
    briefSet("cta", "Посмотрите всю коллекцию по ссылке");
    briefSet("durationSeconds", "27");
    const packageValues = {
      caption: "Показываем, как из обычной ткани рождается авторская Коза: от первого эскиза и раскроя до ручной сборки и упаковки. Такой подарок хранит тепло работы мастера. Посмотрите всю коллекцию по ссылке.",
      firstLine: "Из ткани в символ года — весь процесс за 27 секунд.",
      hashtags: "#ручнаяработа #авторскийподарок",
      cover: "Как рождается символ года",
      shortsTitle: "Как создают авторскую Козу из ткани вручную",
    };
    Object.entries(packageValues).forEach(([field, value]) => {
      const node = publicationCard.querySelector('[data-g4-smm-package-field-v344="' + field + '"]');
      if (!node) throw new Error("Missing publication package field: " + field);
      node.value = value;
      node.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const videoLink = publicationCard.querySelector('[data-g4-smm-package-order-v344="link"] [data-g4-smm-publication-field-v299="link"]');
    videoLink.value = "https://example.test/goat?utm_source=shorts";
    videoLink.dispatchEvent(new Event("input", { bubbles: true }));
    [...publicationCard.querySelectorAll('[data-g4-smm-brief-check-v344]')].forEach((node) => node.click());
    const storyboardChecksSaved = [...publicationCard.querySelectorAll('[data-g4-smm-brief-check-v344]')].length === 5 &&
      [...publicationCard.querySelectorAll('[data-g4-smm-brief-check-v344]')].every((node) => node.checked) &&
      publicationCard.querySelector('[data-g4-smm-production-progress-v344]')?.textContent.trim() === "5/5 готово";
    const packageCountersReady = [...publicationCard.querySelectorAll('[data-g4-smm-package-counter-v344]')].length === 6 &&
      [...publicationCard.querySelectorAll('[data-g4-smm-package-counter-v344]')].every((node) => node.classList.contains('is-ready-v344'));
    const previewLive = publicationCard.querySelector('[data-g4-smm-preview-slot-v344="cover"]')?.textContent.trim() === packageValues.cover &&
      publicationCard.querySelector('[data-g4-smm-preview-slot-v344="firstLine"]')?.textContent.trim() === packageValues.firstLine &&
      publicationCard.querySelector('[data-g4-smm-preview-slot-v344="caption"]')?.textContent.trim() === packageValues.caption &&
      publicationCard.querySelector('[data-g4-smm-preview-slot-v344="link"]')?.textContent.trim() === videoLink.value &&
      publicationCard.querySelector('[data-g4-smm-preview-slot-v344="shortsTitle"]')?.textContent.trim() === packageValues.shortsTitle;
    const immediatePackage = JSON.parse(
      localStorage.getItem("guru-platform-workspace-v02-" + activeProjectId) || "{}",
    ).gate4SmmContentV299?.publications?.find((row) => row.id === publicationId)?.publicationPackage || {};
    const ideaInsightField = document.querySelector('[data-g4-smm-idea-id-v299="' + CSS.escape(sourceIdea.id) + '"][data-g4-smm-idea-field-v299="insight"]');
    ideaInsightField.value = "Живое обновление смысла для проверки";
    ideaInsightField.dispatchEvent(new Event("input", { bubbles: true }));
    const meaningLive = state.gate4SmmContentV299.ideas.find((row) => row.id === sourceIdea.id)?.insight || "";
    ideaInsightField.value = "Как рождается Коза с характером";
    ideaInsightField.dispatchEvent(new Event("input", { bubbles: true }));
    setPublicationSelect("formatId", "g4-smm-format-v298-3");
    const carouselCard = document.querySelector('[data-g4-smm-publication-card-v299="' + publicationId + '"]');
    const carouselBriefHidden = !carouselCard.querySelector('[data-g4-smm-creative-brief-v325]');
    const carouselDescription = carouselCard.querySelector('[data-g4-smm-publication-field-v299="description"]')?.value || "";
    const carouselMainOrder = [...carouselCard.querySelectorAll('[data-g4-smm-publication-order-v334]')]
      .map((node) => node.dataset.g4SmmPublicationOrderV334);
    setPublicationSelect("formatId", "g4-smm-format-v298-6");
    const longBriefText = document.querySelector('[data-g4-smm-publication-card-v299="' + publicationId + '"] [data-g4-smm-creative-brief-v325]')?.textContent || "";
    setPublicationSelect("formatId", "g4-smm-format-v298-1");
    const shortCardRestored = document.querySelector('[data-g4-smm-publication-card-v299="' + publicationId + '"]');
    const briefRetainedAfterToggle = shortCardRestored.querySelector('[data-g4-smm-brief-field-v325="hook"]')?.value === "Почему эта Коза рождается не за пять минут?" &&
      shortCardRestored.querySelector('[data-g4-smm-package-field-v344="cover"]')?.value === packageValues.cover &&
      [...shortCardRestored.querySelectorAll('[data-g4-smm-brief-check-v344]:checked')].length === 5 &&
      !shortCardRestored.querySelector('[data-g4-smm-publication-field-v299="description"]');
    const immediateBrief = JSON.parse(
      localStorage.getItem("guru-platform-workspace-v02-" + activeProjectId) || "{}",
    ).gate4SmmContentV299?.publications?.find((row) => row.id === publicationId)?.creativeBrief || {};
    document.querySelector('[data-g4-smm-idea-card-v299="' + CSS.escape(sourceIdea.id) + '"] [data-g4-smm-workflow-mode-v342="save"]').click();
    const ideaCardAfterSave = document.querySelector('[data-g4-smm-idea-card-v299="' + CSS.escape(sourceIdea.id) + '"]');
    publicationCard = ideaCardAfterSave.querySelector('[data-g4-smm-publication-card-v299="' + publicationId + '"]');
    const ideaLockedAfterSave = ideaCardAfterSave.dataset.g4SmmIdeaEditingV330 === "false" &&
      [...ideaCardAfterSave.querySelectorAll('[data-g4-smm-idea-field-v299]')].every((field) => field.disabled);
    const lockedAfterSave = publicationCard.dataset.g4SmmPublicationEditingV328 === "false" &&
      publicationCard.querySelector('.g4-smm-publication-lock-v328')?.disabled === true &&
      !publicationCard.querySelector('[data-g4-smm-publication-order-v334="meaning"]') &&
      !publicationCard.querySelector('[data-g4-smm-publication-field-v299="formatId"]');
    const insufficientBefore = g4SmmMetricVerdictV299({
      ...state.gate4SmmContentV299.publications.find((row) => row.id === publicationId),
      results: { ...state.gate4SmmContentV299.publications.find((row) => row.id === publicationId).results, views: "150" }
    }, "views");

    // Three published cards of the same format form the honest 90-day baseline.
    for (let index = 0; index < 3; index += 1) {
      const historyIdea = g4SmmCreateIdeaV299(productId);
      historyIdea.insight = "Историческая публикация " + (index + 1);
      const historical = g4SmmPublicationFromIdeaV299(historyIdea);
      historical.topicId = state.gate4SmmStrategyV298.topics[0].id;
      historical.topicLabel = state.gate4SmmStrategyV298.topics[0].value;
      historical.formatId = state.gate4SmmStrategyV298.formats[0].id;
      historical.formatLabel = state.gate4SmmStrategyV298.formats[0].format;
      historical.platforms = ["VK Клипы"];
      historical.date = g4SmmTodayV299();
      historical.status = "published";
      historical.results.views = "100";
      g4SmmContentTouchV299(historical);
    }
    renderGate();
    publicationCard = document.querySelector('[data-g4-smm-publication-card-v299="' + publicationId + '"]');
    const publicationWithHistoricalResult = state.gate4SmmContentV299.publications.find((row) => row.id === publicationId);
    publicationWithHistoricalResult.results.views = "150";
    g4SmmContentTouchV299(publicationWithHistoricalResult);
    publicationCard = document.querySelector('[data-g4-smm-publication-card-v299="' + publicationId + '"]');

    const finalPublication = state.gate4SmmContentV299.publications.find((row) => row.id === publicationId);
    const summary = g4SmmContentSummaryV299();
    const verdict = g4SmmMetricVerdictV299(finalPublication, "views");
    const verdictText = verdict.label;
    const summaryTemplate = document.createElement("template");
    summaryTemplate.innerHTML = g4SmmActionSummaryHtmlV299(state.gate4SmmContentV299, state.gate4SmmStrategyV298);
    const summaryText = summaryTemplate.content.textContent || "";
    const renderedSummary = document.querySelector('[data-g4-smm-action-summary-v299]');
    const summaryCards = [...renderedSummary.querySelectorAll('[data-g4-smm-summary-card-v341]')];
    const summaryTargets = [...renderedSummary.querySelectorAll('[data-g4-smm-summary-target-v341]')];
    const summaryCollapsibles = [...renderedSummary.querySelectorAll('details.gate1-final-unmatched-v259')];
    const collapsiblesDefaultClosed = summaryCollapsibles.length === 2 &&
      summaryCollapsibles.every((node) => !node.open);
    summaryCollapsibles.forEach((node) => node.querySelector('summary')?.click());
    const collapsiblesExpandOnClick = summaryCollapsibles.length === 2 &&
      summaryCollapsibles.every((node) => node.open);
    summaryCollapsibles.forEach((node) => node.querySelector('summary')?.click());
    const summaryVisual = {
      cards: summaryCards.map((card) => card.querySelector(':scope > header > strong')?.textContent.trim() || ""),
      cardsFramed: summaryCards.every((card) => {
        const style = getComputedStyle(card);
        return parseFloat(style.borderWidth) > 0 && parseFloat(style.borderRadius) >= 12;
      }),
      targetRows: summaryTargets.map((row) => ({
        scope: row.dataset.g4SmmSummaryTargetV341,
        fraction: row.querySelector('.g4-smm-summary-fraction-v341')?.textContent.trim() || "",
        status: row.querySelector('.g4-smm-summary-status-v341')?.textContent.trim() || "",
        visual: [...row.classList].find((name) => /^is-(ready|attention|problem)-v277$/.test(name)) || "",
      })),
      verdictComponentReused: summaryTargets.length === 7 && summaryTargets.every((row) =>
        row.classList.contains('pv181-group-benchmark-item-v277') &&
        Boolean(row.querySelector(':scope > .pv181-group-benchmark-dot-v277')),
      ),
      collapseComponentReused: summaryCollapsibles.every((node) =>
        node.classList.contains('gate1-final-unmatched-v259') &&
        Boolean(node.querySelector(':scope > .gate1-final-unmatched-list-v259')),
      ),
      collapsiblesDefaultClosed,
      collapsiblesExpandOnClick,
      collapseSummaries: summaryCollapsibles.map((node) => node.querySelector('summary')?.textContent.trim() || ""),
      yellowMapping: g4SmmSummaryTargetStatusV341(2, 3).visual === "attention",
    };
    const after = g4SmmGateStructureAuditV299(state);
    const afterExact = Object.fromEntries(Object.entries(after).map(([id, data]) => [id, data.exactJson]));
    const readinessAfter = g4ReadinessAllCardsV225(state).map((card) => card.id);
    const channelKeysAfter = g4LaunchChannels().map((channel) => channel.key);
    const rootKeys = Object.keys(state).filter((key) => /gate4SmmContent/i.test(key));
    const publicationForMulti = state.gate4SmmContentV299.publications.find((row) => row.id === publicationId);
    publicationForMulti.platforms = ["VK Клипы", "YouTube Shorts"];
    g4SmmContentTouchV299(publicationForMulti);
    g4SmmPublicationFromIdeaV299(sourceIdea);
    const idempotentConversionCount = state.gate4SmmContentV299.publications.filter((row) => row.sourceIdeaId === sourceIdea.id).length;
    const contentRoot = state.gate4SmmContentV299;
    const verifiedPublication = contentRoot.publications.find((row) => row.id === publicationId);
    const restored = migrateWorkspace(JSON.parse(JSON.stringify(state)), activeProjectId);
    const linkedPublicationCard = document.querySelector('[data-g4-smm-publication-card-v299="' + CSS.escape(publicationId) + '"]');
    const linkedWorkflow = linkedPublicationCard?.closest('[data-g4-smm-idea-workflow-v324]');
    const linkedIdeaCard = linkedWorkflow?.querySelector(':scope > [data-g4-smm-idea-card-v299]');
    const linkedStages = linkedIdeaCard ? [...linkedIdeaCard.querySelectorAll('[data-g4-smm-idea-stage-view-v299]')] : [];
    const linkedUnifiedCard = linkedWorkflow?.children.length === 1 &&
      linkedIdeaCard?.contains(linkedPublicationCard) &&
      linkedPublicationCard?.previousElementSibling === linkedStages.at(-1);
    const collapseHeader = linkedIdeaCard?.querySelector(':scope > [data-g1-collapse]');
    const collapseBody = linkedIdeaCard?.querySelector(':scope > .g1-card-collapse-body');
    const collapseTitle = collapseHeader?.querySelector('[data-g4-smm-idea-card-title-v332]');
    const visualizationSection = document.querySelector('[data-g4-smm-publications-v299]');
    const collapseKey = collapseHeader?.dataset.g1CollapseKey || "";
    const initiallyExpanded = Boolean(collapseBody) &&
      !linkedIdeaCard?.classList.contains('is-collapsed') &&
      getComputedStyle(collapseBody).display !== 'none';
    collapseTitle?.click();
    const collapsedOnTitleClick = Boolean(collapseBody) &&
      linkedIdeaCard?.classList.contains('is-collapsed') &&
      getComputedStyle(collapseBody).display === 'none';
    const persistedWhenCollapsed = Boolean(collapseKey) && g1CollapsedSet().has(collapseKey);
    const visualizationStaysVisible = Boolean(visualizationSection?.getClientRects().length);
    collapseTitle?.click();
    const expandedOnSecondClick = Boolean(collapseBody) &&
      !linkedIdeaCard?.classList.contains('is-collapsed') &&
      getComputedStyle(collapseBody).display !== 'none';
    const removedFromPersistenceWhenExpanded = Boolean(collapseKey) && !g1CollapsedSet().has(collapseKey);
    const workflowCollapse = {
      title: collapseTitle?.textContent.trim() || "",
      systemComponentReused: Boolean(
        linkedIdeaCard?.classList.contains('g1-card-collapsible') &&
        collapseHeader?.classList.contains('g1-card-collapse-header') &&
        collapseBody?.classList.contains('g1-card-collapse-body')
      ),
      initiallyExpanded,
      collapsedOnTitleClick,
      persistedWhenCollapsed,
      visualizationStaysVisible,
      expandedOnSecondClick,
      removedFromPersistenceWhenExpanded,
      containsAllFiveStages: linkedStages.length === 5 && linkedStages.every((stage) => collapseBody?.contains(stage)),
      containsLinkedPublication: Boolean(linkedPublicationCard && collapseBody?.contains(linkedPublicationCard)),
    };

    return {
      build: window.GURU_BUILD_INFO?.version || "",
      placement: {
        strategyBeforeContent: Boolean(strategyNode && contentNode && strategyNode.contains(contentNode)),
        contentInsideStrategy: Boolean(strategyNode && contentNode && strategyNode.contains(contentNode)),
        strategyInsideSmmTool: strategyNode?.parentElement === smmTool,
        strategyImmediatelyAfterSmmTitle: smmTitle?.nextElementSibling === strategyNode,
        strategyImmediatelyBeforeVkAds: strategyNode?.nextElementSibling === vkCard,
        strategyInsideAwareStage: strategyNode?.closest('[data-g4-map-stage-v290]') === aware,
        standaloneStrategies: route?.querySelectorAll(':scope > [data-g4-smm-strategy-v298]').length || 0,
        ideasDirectlyAfterPrinciple: strategyNode?.querySelector('[data-g4-smm-part-v298="principle"]')?.nextElementSibling === contentNode && contentNode?.firstElementChild?.matches('[data-g4-smm-ideas-v299]'),
        removedContentHeader: !contentNode?.querySelector(':scope > .g1-card-header-static') && !contentNode?.textContent.includes('SMM-контент-система'),
        blocks: document.querySelectorAll('[data-g4-smm-content-system-v299]').length,
        strategyReadonly: strategyNode?.dataset.g4SmmReadonlyV300 === "true",
        strategyControls: strategyNode?.querySelectorAll('[data-g4-smm-part-v298] input, [data-g4-smm-part-v298] textarea, [data-g4-smm-part-v298] select, [data-g4-smm-part-v298] button').length || 0,
        strategyAddRemove: strategyNode?.querySelectorAll('[data-g4-smm-format-add-v298], [data-g4-smm-topic-add-v298], [data-g4-smm-format-remove-v298], [data-g4-smm-topic-remove-v298]').length || 0,
        standaloneStrategicFoundationHidden: !document.querySelector('[data-guru-product-context="gate4-launch"] [data-guru-strategic-foundation]'),
        duplicateProductSelectors: system.querySelectorAll('[data-g4-smm-new-idea-product-v299]').length,
        stageSelectors: system.querySelectorAll('[data-g4-smm-idea-field-v299="stage"]').length,
        currentStageHighlights: system.querySelectorAll('.g4-smm-idea-stage-v299.is-current').length,
        ideaStageHeaderPills: system.querySelectorAll('[data-g4-smm-idea-card-v299] > .g1-card-header-static > .status-pill').length
      },
      publicationSectionTitle: [...system.querySelectorAll('.g4-smm-content-section-head-v299 h4')]
        .map((node) => node.textContent.trim())
        .find((title) => title === "Визуализация идей SMM-стратегии") || "",
      stageViews: stagesVisible,
      stageExplanations,
      digestion,
      ideaName: {
        value: initialIdeaName,
        label: ideaNameLabel,
        titleLive: ideaNameTitleLive,
        separateFromInsight: initialIdeaName !== state.gate4SmmContentV299.ideas[0].insight,
      },
      workflowCollapse,
      calendar,
      material: {
        jtbd: initialMaterial.includes("Когда нужен тёплый авторский подарок"),
        segment: initialMaterial.includes("Женщины 25+ из Москвы"),
        positioning: initialMaterial.includes("Авторская текстильная Коза"),
        usp: initialMaterial.includes("Каждый экземпляр сшит вручную"),
        offer: initialMaterial.includes("Особенный новогодний подарок"),
        creation: initialMaterial.includes("Каждая Коза создаётся вручную мастером"),
        keyword1: initialMaterial.includes("интерьерная коза"),
        keyword2: initialMaterial.includes("коза ручной работы"),
        draftExcluded: !initialMaterial.includes("служебный черновик без метрик"),
        strategyFormatExcluded: !initialMaterial.includes("Общее · живьём из SMM-стратегии") && !initialMaterial.includes("Короткое вертикальное видео"),
        strategyTopicExcluded: !initialMaterial.includes("Темы") && !initialMaterial.includes("Проблема → решение"),
        sourceCaptionGateOnly: initialMaterial.includes("Только live read-only: Gate 0–3") && !initialMaterial.includes("Gate 0–3 и SMM-стратегия"),
        exactOrder: JSON.stringify(materialOrder) === JSON.stringify(["Сегмент", "Позиционирование", "УТП", "Оффер", "Как создаётся", "№1 · Основной JTBD", "№2 · Дополнительный JTBD", "№3 · Дополнительный JTBD"]),
        jtbdLabels: JSON.stringify(jtbdLabels) === JSON.stringify(["№1 · Основной JTBD", "№2 · Дополнительный JTBD", "№3 · Дополнительный JTBD"]),
        primaryInitiallyOpen,
        additionalInitiallyClosed,
        additionalKeywordVisible,
        noGlobalKeywordList: !materialFoundation.querySelector('.g4-smm-live-keywords-v299')
      },
      productNameOccurrences,
      transferred,
      publication: {
        id: publicationId,
        saveAsPublicationLabel,
        lockedAfterCreation,
        savedStageCompact,
        editableAfterClick,
        lockedAfterSave,
        title: verifiedPublication.title,
        conciseTitleLabel,
        titleEmptyAfterFormatTopic,
        publicationTitleLive,
        secondaryPublicationTitleHidden,
        ideaTitleAfterPublicationEdit,
        calendarTitleAfterPublicationEdit,
        videoMainOrder,
        visualHierarchy,
        ideaTitleSeparated: ideaAfterPublicationEdit.insight === "Как рождается Коза с характером" &&
          ideaAfterPublicationEdit.name === "Коза из ткани",
        content: verifiedPublication.content,
        immediateLocalContent: publicationImmediateLocalContent,
        creativeBrief: {
          shortVisible: Boolean(shortBrief),
          shortHint: shortHint.includes("Рабочий диапазон: 20–45 секунд"),
          longHint: longBriefText.includes("Без строгого лимита, ориентируйся на полноту раскрытия темы"),
          carouselHidden: carouselBriefHidden,
          videoDescriptionHidden,
          carouselDescription,
          carouselMainOrder,
          briefOrder,
          storyboardColumns,
          productionStageOrder,
          packageOrder,
          materialMerged,
          storyboardChecksSaved,
          packageCountersReady,
          previewLive,
          packageValues,
          immediatePackage,
          briefRetainedAfterToggle,
          meaningBefore,
          meaningLive,
          duplicateMeaningHidden,
          immediateBrief,
        },
        platforms: verifiedPublication.platforms,
        status: verifiedPublication.status,
        idempotentConversionCount,
        oneCardForMultiplePlatforms: contentRoot.publications.filter((row) => row.id === publicationId).length,
        unifiedAfterCreation,
        oneWorkflowEditControl,
        directlyAfterOwnIdea: linkedUnifiedCard,
        ideaEndsWithVerification: linkedStages.at(-1)?.dataset.g4SmmIdeaStageViewV299 === "verification",
        duplicateInOrphanList: document.querySelectorAll('[data-g4-smm-orphan-publications-v324] [data-g4-smm-publication-card-v299="' + CSS.escape(publicationId) + '"]').length,
        contextDuplicateHidden: !publicationCard.querySelector('[data-g4-smm-publication-context-v299]') &&
          !publicationCard.textContent.includes("Контекст, перенесённый из идеи") &&
          !publicationCard.textContent.includes("Подтверждённые фразы"),
      },
      ideaEditing: {
        lockedAfterCreation: ideaLockedAfterCreation,
        lockedInputBlocked: ideaLockedInputBlocked,
        editableAfterClick: ideaEditableAfterClick,
        lockedAfterSave: ideaLockedAfterSave,
      },
      comparison: { ...verdict, text: verdictText, insufficientBefore: insufficientBefore.status },
      summary: {
        videoCount: summary.week.counts.videos,
        videoTarget: summary.week.targets.videos,
        plannedCases: summary.plan.counts.cases,
        plannedTotal: summary.plan.total,
        unusedPairs: summary.unusedPairs.length,
        staleTopics: summary.staleTopics.length,
        text: summaryText,
        visual: summaryVisual,
      },
      storage: {
        rootKeys,
        version: contentRoot.version,
        ideas: contentRoot.ideas.length,
        publications: contentRoot.publications.length,
        restoredIdeas: restored.gate4SmmContentV299?.ideas?.length || 0,
        restoredPublications: restored.gate4SmmContentV299?.publications?.length || 0,
        restoredContent: restored.gate4SmmContentV299?.publications?.find((row) => row.id === publicationId)?.content || "",
        restoredPrimaryTaskFormatId: restored.gate4SmmContentV299?.ideas?.find((row) => row.id === sourceIdea.id)?.primaryTaskFormatId || ""
      },
      safety: {
        exactGate0To3: JSON.stringify(beforeExact) === JSON.stringify(afterExact),
        exactByGate: Object.fromEntries(Object.keys(beforeExact).map((id) => [id, beforeExact[id] === afterExact[id]])),
        before: Object.fromEntries(Object.entries(before).map(([id, data]) => [id, { cards: data.cards, instructionRows: data.instructionRows, pageRows: data.pageRows }])),
        after: Object.fromEntries(Object.entries(after).map(([id, data]) => [id, { cards: data.cards, instructionRows: data.instructionRows, pageRows: data.pageRows }])),
        readinessBefore: readinessBefore.length,
        readinessAfter: readinessAfter.length,
        readinessExact: JSON.stringify(readinessBefore) === JSON.stringify(readinessAfter),
        channelsBefore: channelKeysBefore.length,
        channelsAfter: channelKeysAfter.length,
        channelsExact: JSON.stringify(channelKeysBefore) === JSON.stringify(channelKeysAfter),
        strategyExact: strategyBefore === JSON.stringify(state.gate4SmmStrategyV298)
      },
      errors: window.__guruConsoleLog?.filter((entry) => entry.level === "error") || []
    };
  })()`);

  await page.call("Page.navigate", { url: `${appUrl}?hard-reload=${Date.now()}` });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(page, 'typeof bootstrapAppOnce === "function"');
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, 'Boolean(state)');
  result.hardReload = await evaluate(page, `(() => {
    guruNavigateToGate("gate-4");
    renderGate();
    const expected = "Связать ручную работу с ощущением домашнего уюта";
    const idea = state.gate4SmmContentV299?.ideas?.find((row) => row.digestionNotes === expected);
    const field = idea
      ? document.querySelector('[data-g4-smm-idea-card-v299="' + CSS.escape(idea.id) + '"] [data-g4-smm-idea-field-v299="digestionNotes"]')
      : null;
    return {
      stored: idea?.digestionNotes || "",
      displayed: field?.value || "",
      insight: idea?.insight || "",
      ideaName: idea?.name || "",
      ideaCardTitle: idea
        ? document.querySelector('[data-g4-smm-idea-card-v299="' + CSS.escape(idea.id) + '"] [data-g4-smm-idea-card-title-v332]')?.textContent.trim() || ""
        : "",
      scheduledDate: idea?.scheduledDate || "",
      calendarDisplayed: idea
        ? document.querySelectorAll('[data-g4-smm-calendar-idea-v322="' + CSS.escape(idea.id) + '"]').length
        : 0,
      publicationContent: state.gate4SmmContentV299?.publications?.find(
        (row) => row.id === ${JSON.stringify(result.publication.id)},
      )?.content || "",
      publicationTitle: state.gate4SmmContentV299?.publications?.find(
        (row) => row.id === ${JSON.stringify(result.publication.id)},
      )?.title || "",
      publicationDescription: state.gate4SmmContentV299?.publications?.find(
        (row) => row.id === ${JSON.stringify(result.publication.id)},
      )?.description || "",
      publicationLink: state.gate4SmmContentV299?.publications?.find(
        (row) => row.id === ${JSON.stringify(result.publication.id)},
      )?.link || "",
      publicationCardTitle: document.querySelector(
        '[data-g4-smm-publication-card-v299="${result.publication.id}"] [data-g4-smm-publication-card-title-v331]',
      )?.textContent.trim() || "",
      unifiedCard: (() => {
        const publication = document.querySelector('[data-g4-smm-publication-card-v299="${result.publication.id}"]');
        const ideaCard = publication?.closest('[data-g4-smm-idea-card-v299]');
        const workflow = publication?.closest('[data-g4-smm-idea-workflow-v324]');
        return Boolean(ideaCard && workflow?.children.length === 1 && ideaCard.contains(publication));
      })(),
      duplicateMeaningHidden: !document.querySelector('[data-g4-smm-publication-card-v299="${result.publication.id}"] [data-g4-smm-publication-order-v334="meaning"]'),
      publicationBrief: state.gate4SmmContentV299?.publications?.find(
        (row) => row.id === ${JSON.stringify(result.publication.id)},
      )?.creativeBrief || {},
      publicationPackage: state.gate4SmmContentV299?.publications?.find(
        (row) => row.id === ${JSON.stringify(result.publication.id)},
      )?.publicationPackage || {},
      publicationLocked: document.querySelector('[data-g4-smm-publication-card-v299="${result.publication.id}"] .g4-smm-publication-lock-v328')?.disabled === true,
      contextDuplicateHidden: !document.querySelector('[data-g4-smm-publication-card-v299="${result.publication.id}"] [data-g4-smm-publication-context-v299]'),
      ideaLocked: (() => {
        const card = idea
          ? document.querySelector('[data-g4-smm-idea-card-v299="' + CSS.escape(idea.id) + '"]')
          : null;
        return card?.dataset.g4SmmIdeaEditingV330 === "false" &&
          [...(card?.querySelectorAll('[data-g4-smm-idea-field-v299]') || [])].every((control) => control.disabled) &&
          card?.querySelector('[data-g4-smm-workflow-mode-v342="edit"]')?.textContent.trim() === "Редактировать";
      })(),
      projectId: activeProjectId || "",
    };
  })()`);

  await page.call("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  result.mobile = await evaluate(page, `(() => {
    renderGate();
    const root = document.querySelector('[data-g4-smm-content-system-v299]');
    const publicationFields = root?.querySelector('.g4-smm-publication-fields-v299');
    const digestionLayout = root?.querySelector('[data-g4-smm-digestion-layout-v316]');
    const calendarDay = root?.querySelector('[data-g4-smm-week-day-v322]');
    const calendarTrack = root?.querySelector('.g4-smm-week-days-v322');
    const summaryGrid = root?.querySelector('.g4-smm-summary-cards-v341');
    const storyboardScroll = root?.querySelector('.g4-smm-storyboard-scroll-v344');
    const storyboardTrack = root?.querySelector('.g4-smm-storyboard-track-v344');
    const packageLayout = root?.querySelector('.g4-smm-package-layout-v344');
    const publicationPreview = root?.querySelector('[data-g4-smm-post-preview-v344]');
    return {
      visible: Boolean(root?.getClientRects().length),
      overflow: root ? root.scrollWidth - root.clientWidth : 999,
      ideaControls: root?.querySelectorAll('.g4-smm-idea-controls-v299').length || 0,
      publicationColumns: publicationFields ? getComputedStyle(publicationFields).gridTemplateColumns : "",
      digestionColumns: digestionLayout ? getComputedStyle(digestionLayout).gridTemplateColumns : "",
      summaryColumns: summaryGrid ? getComputedStyle(summaryGrid).gridTemplateColumns : "",
      summaryCards: summaryGrid?.querySelectorAll('[data-g4-smm-summary-card-v341]').length || 0,
      calendarDayColumns: calendarDay ? getComputedStyle(calendarDay).gridTemplateColumns : "",
      calendarTrackColumns: calendarTrack ? getComputedStyle(calendarTrack).gridTemplateColumns.split(" ").length : 0,
      calendarTrackScrollable: calendarTrack ? calendarTrack.scrollWidth > calendarTrack.clientWidth : false,
      calendarDays: root?.querySelectorAll('[data-g4-smm-week-day-v322]').length || 0,
      stageCards: root?.querySelectorAll('[data-g4-smm-idea-stage-view-v299]').length || 0,
      storyboardColumns: storyboardTrack ? getComputedStyle(storyboardTrack).gridTemplateColumns.split(" ").length : 0,
      storyboardScrollable: storyboardScroll ? storyboardScroll.scrollWidth > storyboardScroll.clientWidth : false,
      packageColumns: packageLayout ? getComputedStyle(packageLayout).gridTemplateColumns.split(" ").length : 0,
      publicationPreviewVisible: Boolean(publicationPreview?.getClientRects().length),
    };
  })()`);

  result.durableReloadPreparation = await evaluate(page, `(() => {
    const idea = state.gate4SmmContentV299?.ideas?.find(
      (row) => row.id === ${JSON.stringify(result.publication.id)} || row.digestionNotes === "Связать ручную работу с ощущением домашнего уюта",
    );
    const thursday = document.querySelectorAll('[data-g4-smm-week-day-v322]')[3];
    const source = idea
      ? document.querySelector('[data-g4-smm-calendar-drag-v339="' + CSS.escape(idea.id) + '"]')
      : null;
    if (!idea || !source || !thursday) return { ready: false };
    const transfer = new DataTransfer();
    source.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer: transfer }));
    thursday.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: transfer }));
    const stored = JSON.parse(localStorage.getItem(WORKSPACE_STORAGE_PREFIX + activeProjectId) || "{}");
    return {
      ready: true,
      ideaId: idea.id,
      expectedDate: thursday.dataset.g4SmmWeekDayV322,
      memoryDate: state.gate4SmmContentV299?.ideas?.find((row) => row.id === idea.id)?.scheduledDate || "",
      localDate: stored.gate4SmmContentV299?.ideas?.find((row) => row.id === idea.id)?.scheduledDate || "",
      durableAt: stored._guruDurableMutationAt || "",
    };
  })()`);

  await page.call("Page.navigate", { url: `${appUrl}?durable-dnd-reload=${Date.now()}` });
  await waitFor(page, 'document.readyState === "complete"');
  await waitFor(page, 'typeof bootstrapAppOnce === "function"');
  await waitFor(page, 'typeof guruNavigationBootstrapInProgressV269 === "undefined" || guruNavigationBootstrapInProgressV269 === false');
  await waitFor(page, 'document.querySelector("[data-open-project]")');
  await evaluate(page, 'document.querySelector("[data-open-project]").click(); true');
  await waitFor(page, 'Boolean(state)');
  result.durableReload = await evaluate(page, `(() => {
    const ideaId = ${JSON.stringify(result.durableReloadPreparation.ideaId || "")};
    const idea = state.gate4SmmContentV299?.ideas?.find((row) => row.id === ideaId);
    return {
      scheduledDate: idea?.scheduledDate || "",
      durableAt: state._guruDurableMutationAt || "",
    };
  })()`);

  const allMaterial = Object.values(result.material).every(Boolean);
  const expectedStages = ["collection", "digestion", "incubation", "insight", "verification"];
  if (
    result.build !== "2.3.236" ||
    !result.placement.strategyBeforeContent || !result.placement.contentInsideStrategy || !result.placement.strategyInsideSmmTool || !result.placement.strategyImmediatelyAfterSmmTitle || !result.placement.strategyImmediatelyBeforeVkAds || !result.placement.strategyInsideAwareStage || result.placement.standaloneStrategies !== 0 || !result.placement.ideasDirectlyAfterPrinciple || !result.placement.removedContentHeader || result.placement.blocks !== 1 ||
    !result.placement.strategyReadonly || result.placement.strategyControls !== 2 || result.placement.strategyAddRemove !== 0 || !result.placement.standaloneStrategicFoundationHidden || result.placement.duplicateProductSelectors !== 0 ||
    result.placement.stageSelectors !== 0 || result.placement.currentStageHighlights !== 0 || result.placement.ideaStageHeaderPills !== 0 ||
    JSON.stringify(result.stageViews) !== JSON.stringify(expectedStages) ||
    JSON.stringify(result.stageExplanations.map((row) => row.stage)) !== JSON.stringify(expectedStages) ||
    JSON.stringify(result.stageExplanations.map((row) => row.text)) !== JSON.stringify(expectedIdeaExplanations) ||
    result.stageExplanations.some((row) => !row.classReused || !row.visible || row.fontSize !== "12px") ||
    result.digestion.notesRows !== 14 || result.digestion.notesHeight < 260 || result.digestion.desktopColumns !== 2 ||
    !result.digestion.leftTaskFirst || !result.digestion.rightThoughtsSecond || result.digestion.verticalDetailRows !== 5 || !result.digestion.horizontalTaskTableRemoved ||
    JSON.stringify(result.digestion.taskOptions) !== JSON.stringify(["Охват, новая аудитория", "Объяснение, сохранения", "Доверие, результат", "Глубина, поиск, доверие", "Глубокое раскрытие темы", "Удержание, контакт"]) ||
    result.digestion.selectedId !== "g4-smm-format-v298-2" || Object.values(result.digestion.linkedRow).some((value) => !value) ||
    !result.digestion.liveReadUpdated || !result.digestion.noCopiedStrategyFields || !result.digestion.persistedImmediately || !result.digestion.insightPersistedImmediately ||
    result.ideaName.value !== "Коза из ткани" || result.ideaName.label !== "Название идеи" || result.ideaName.titleLive !== result.ideaName.value || !result.ideaName.separateFromInsight || result.calendar.displayedTitle !== result.ideaName.value ||
    result.workflowCollapse.title !== result.ideaName.value || !result.workflowCollapse.systemComponentReused || !result.workflowCollapse.initiallyExpanded || !result.workflowCollapse.collapsedOnTitleClick || !result.workflowCollapse.persistedWhenCollapsed || !result.workflowCollapse.visualizationStaysVisible || !result.workflowCollapse.expandedOnSecondClick || !result.workflowCollapse.removedFromPersistenceWhenExpanded || !result.workflowCollapse.containsAllFiveStages || !result.workflowCollapse.containsLinkedPublication ||
    JSON.stringify(result.calendar.weekdays) !== JSON.stringify(["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"]) ||
    !result.calendar.horizontalDays || result.calendar.bankBefore !== 1 || result.calendar.bankAfter !== 0 || !result.calendar.movedToMonday || !result.calendar.movedBetweenDays || !result.calendar.returnedToBank || !result.calendar.draggable || result.calendar.cardWidth < 210 || !result.calendar.normalWordBreak || result.calendar.scheduledDate !== result.calendar.wednesdayDate || result.calendar.renderedOnce !== 1 || result.calendar.plannedCases !== 1 || result.calendar.plannedTotal !== 1 || !result.calendar.persistedImmediately || !result.calendar.durableMutationMarked ||
    !result.durableReloadPreparation.ready || !result.durableReloadPreparation.durableAt || result.durableReloadPreparation.memoryDate !== result.durableReloadPreparation.expectedDate || result.durableReloadPreparation.localDate !== result.durableReloadPreparation.expectedDate || result.durableReload.scheduledDate !== result.durableReloadPreparation.expectedDate || result.durableReload.durableAt !== result.durableReloadPreparation.durableAt ||
    result.hardReload.stored !== "Связать ручную работу с ощущением домашнего уюта" || result.hardReload.displayed !== result.hardReload.stored || result.hardReload.insight !== "Как рождается Коза с характером" || !result.hardReload.scheduledDate || result.hardReload.calendarDisplayed !== 1 ||
    result.publicationSectionTitle !== "Визуализация идей SMM-стратегии" || !allMaterial || result.productNameOccurrences !== 1 ||
    result.transferred.title !== "" ||
    result.transferred.description !== "Связать ручную работу с ощущением домашнего уюта" ||
    !result.transferred.jtbd.includes("тёплый авторский подарок") ||
    result.transferred.keywords.length !== 2 ||
    result.publication.saveAsPublicationLabel !== "Сохранить как публикацию" || !result.publication.savedStageCompact || !result.publication.lockedAfterCreation || !result.publication.editableAfterClick || !result.publication.lockedAfterSave || !result.hardReload.publicationLocked ||
    !result.ideaEditing.lockedAfterCreation || !result.ideaEditing.lockedInputBlocked || !result.ideaEditing.editableAfterClick || !result.ideaEditing.lockedAfterSave || !result.hardReload.ideaLocked ||
    result.publication.title !== "Из ткани в символ года" || result.publication.conciseTitleLabel !== "Лаконичное название" || !result.publication.titleEmptyAfterFormatTopic || !result.publication.ideaTitleSeparated || result.publication.publicationTitleLive !== result.publication.title || !result.publication.secondaryPublicationTitleHidden || result.publication.ideaTitleAfterPublicationEdit !== "Коза из ткани" || result.publication.calendarTitleAfterPublicationEdit !== "Коза из ткани" || JSON.stringify(result.publication.videoMainOrder) !== JSON.stringify(["title", "topic", "format", "platforms", "date", "status", "content", "link"]) || result.publication.visualHierarchy.bodyPaddingLeft !== 0 || result.publication.visualHierarchy.labelInsetFromCard < 38 || result.publication.visualHierarchy.cellBorderRadius < 12 || result.publication.visualHierarchy.groupedSections !== 3 || !result.publication.visualHierarchy.singleOuterFrame || !result.publication.visualHierarchy.embeddedDivider || !result.publication.visualHierarchy.resultsHidden || result.hardReload.publicationTitle !== result.publication.title || result.hardReload.ideaName !== "Коза из ткани" || result.hardReload.publicationCardTitle !== "" || result.hardReload.ideaCardTitle !== "Коза из ткани" || !result.hardReload.unifiedCard || !result.hardReload.duplicateMeaningHidden ||
    result.publication.content !== "Сценарий вертикального ролика о процессе создания" || result.publication.immediateLocalContent !== result.publication.content || result.hardReload.publicationContent !== result.publication.content ||
    !result.publication.creativeBrief.shortVisible || !result.publication.creativeBrief.shortHint || !result.publication.creativeBrief.longHint || !result.publication.creativeBrief.carouselHidden || !result.publication.creativeBrief.videoDescriptionHidden || result.publication.creativeBrief.carouselDescription !== result.transferred.description || JSON.stringify(result.publication.creativeBrief.carouselMainOrder) !== JSON.stringify(["title", "topic", "format", "platforms", "date", "link", "status", "description", "content"]) || JSON.stringify(result.publication.creativeBrief.briefOrder) !== JSON.stringify(["hook", "promise", "storyboard", "proof", "cta"]) || result.publication.creativeBrief.storyboardColumns !== 5 || JSON.stringify(result.publication.creativeBrief.productionStageOrder) !== JSON.stringify(["storyboard", "publication"]) || JSON.stringify(result.publication.creativeBrief.packageOrder) !== JSON.stringify(["caption", "firstLine", "link", "hashtags", "cover", "shortsTitle"]) || !result.publication.creativeBrief.materialMerged || !result.publication.creativeBrief.storyboardChecksSaved || !result.publication.creativeBrief.packageCountersReady || !result.publication.creativeBrief.previewLive || JSON.stringify(result.publication.creativeBrief.immediatePackage) !== JSON.stringify(result.publication.creativeBrief.packageValues) || !result.publication.creativeBrief.briefRetainedAfterToggle || result.publication.creativeBrief.meaningBefore !== "Как рождается Коза с характером" || result.publication.creativeBrief.meaningLive !== "Живое обновление смысла для проверки" || !result.publication.creativeBrief.duplicateMeaningHidden || result.publication.creativeBrief.immediateBrief.hook !== "Почему эта Коза рождается не за пять минут?" || result.publication.creativeBrief.immediateBrief.promise !== "Покажем весь путь от ткани до готового подарка" || result.publication.creativeBrief.immediateBrief.proof !== "Готовая Коза рядом с исходным эскизом" || !Object.values(result.publication.creativeBrief.immediateBrief.checks || {}).every(Boolean) || result.hardReload.publicationBrief.durationSeconds !== "27" || !Object.values(result.hardReload.publicationBrief.checks || {}).every(Boolean) || JSON.stringify(result.hardReload.publicationPackage) !== JSON.stringify(result.publication.creativeBrief.packageValues) || result.hardReload.publicationLink !== "https://example.test/goat?utm_source=shorts" || result.hardReload.publicationDescription !== result.transferred.description ||
    result.publication.platforms.length < 2 || result.publication.status !== "published" ||
    result.publication.oneCardForMultiplePlatforms !== 1 || result.publication.idempotentConversionCount !== 1 || !result.publication.unifiedAfterCreation || !result.publication.oneWorkflowEditControl || !result.publication.directlyAfterOwnIdea || !result.publication.ideaEndsWithVerification || result.publication.duplicateInOrphanList !== 0 || !result.publication.contextDuplicateHidden || !result.hardReload.contextDuplicateHidden ||
    result.comparison.insufficientBefore !== "insufficient" || result.comparison.status !== "strong" || Math.round(result.comparison.ratio) !== 150 || result.comparison.historyCount !== 3 ||
    !result.comparison.text.includes("Сильный") ||
    result.summary.videoCount !== 4 || result.summary.videoTarget !== 3 || result.summary.plannedCases !== 1 || result.summary.plannedTotal !== 1 ||
    !result.summary.text.includes("Сверх плана: 1") || !result.summary.unusedPairs || result.summary.staleTopics !== 5 ||
    JSON.stringify(result.summary.visual.cards) !== JSON.stringify(["План идей на неделю", "Факт публикаций за неделю", "Квартальная цель", "Форматы без использования (90 дней)", "Темы без использования (3+ недели)"]) ||
    !result.summary.visual.cardsFramed || result.summary.visual.targetRows.length !== 7 || !result.summary.visual.verdictComponentReused || !result.summary.visual.collapseComponentReused || !result.summary.visual.collapsiblesDefaultClosed || !result.summary.visual.collapsiblesExpandOnClick || result.summary.visual.collapseSummaries.length !== 2 || result.summary.visual.collapseSummaries.some((value) => !value.includes("без использования · развернуть")) || !result.summary.visual.yellowMapping ||
    JSON.stringify(result.storage.rootKeys) !== JSON.stringify(["gate4SmmContentV299"]) ||
    result.storage.version !== "gate4-smm-content-v299" || result.storage.ideas !== 4 || result.storage.publications !== 4 ||
    result.storage.restoredIdeas !== 4 || result.storage.restoredPublications !== 4 || result.storage.restoredContent !== "Сценарий вертикального ролика о процессе создания" ||
    result.storage.restoredPrimaryTaskFormatId !== "g4-smm-format-v298-2" ||
    !result.mobile.visible || result.mobile.overflow > 1 || result.mobile.digestionColumns.split(" ").length !== 1 || result.mobile.summaryColumns.split(" ").length !== 1 || result.mobile.summaryCards !== 5 || result.mobile.calendarTrackColumns !== 8 || !result.mobile.calendarTrackScrollable || result.mobile.calendarDays !== 7 || result.mobile.stageCards !== 20 || result.mobile.storyboardColumns !== 5 || !result.mobile.storyboardScrollable || result.mobile.packageColumns !== 1 || !result.mobile.publicationPreviewVisible ||
    result.mobile.ideaControls !== 0 || result.mobile.publicationColumns.split(" ").length !== 1 ||
    !result.safety.exactGate0To3 || !result.safety.readinessExact || !result.safety.channelsExact || !result.safety.strategyExact ||
    result.safety.readinessBefore !== 23 || result.safety.readinessAfter !== 23 ||
    result.safety.channelsBefore !== 15 || result.safety.channelsAfter !== 15 ||
    result.errors.length
  ) {
    throw new Error(`Gate 4 SMM content system smoke failed: ${JSON.stringify({ result, allMaterial })}`);
  }

  console.log(JSON.stringify({ ...result, allMaterial }, null, 2));
} finally {
  page.close();
  await browser.call("Target.disposeBrowserContext", { browserContextId });
  browser.close();
}
