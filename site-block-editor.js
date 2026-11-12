/* Shared, view-only editor primitives for every Gate 1 site page block.
   The page renderers and their existing input handlers remain the data source. */
const GURU_SITE_EDITOR_COLLECTIONS_V543 = [
  ".guru-hub-preview-grid-v504",
  ".guru-category-review-grid-v511",
  ".goat-product-delivery-cards-v515",
  ".goat-product-reviews-grid-v514",
  ".guru-home-case-grid-v509",
  ".guru-home-facts-grid-v509",
  ".guru-home-generic-content-v509",
].join(",");

function guruSiteEditorCaptionV543(caption) {
  if (!caption || caption.dataset.guruSiteCaptionV542) return;
  caption.dataset.guruSiteCaptionV542 = "1";
  caption.classList.add("guru-site-field-caption-v542");
  const text = caption.textContent.trim();
  const split = text.indexOf(" · ");
  if (split < 0 || caption.children.length) return;
  const title = document.createElement("strong");
  const detail = document.createElement("small");
  title.textContent = text.slice(0, split);
  detail.textContent = text.slice(split + 3);
  caption.replaceChildren(title, detail);
}

function guruSiteEditorCtaV543(holder, control) {
  holder.classList.add("guru-site-editor-cta-v543");
  if (!control) return;
  const secondary = holder.matches(".guru-category-lead-call-v510, .goat-product-live-button-v515.is-outline") ||
    control.dataset.pageContextKey === "secondaryButton" ||
    control.dataset.pageContextKey === "catalogLeadMagnetCallButtonV510" ||
    control.dataset.buttonIndex === "1";
  holder.classList.toggle("is-secondary", secondary);
  holder.classList.toggle("is-primary", !secondary);
  holder.style.setProperty("--guru-site-cta-width-v543",
    `${Math.max(14, Math.min(42, [...String(control.value || "")].length + 2))}ch`);
}

function guruDecorateSiteBlockEditorsV542(root = els.contentArea) {
  if (!root || activeGateId !== "gate-1") return;
  root.querySelectorAll(
    ".g1-redesign .page-structure-card",
  ).forEach((page) => {
    page.classList.add("guru-site-page-editor-v542");
    page.querySelectorAll("details[data-v22-site-section]").forEach((block) => {
      block.classList.add("guru-site-block-editor-v542");
      block.querySelectorAll(
        ".guru-hub-inline-editor-v507, .goat-product-page-frame-v515, .v22-site-canvas, .route-section-grid",
      ).forEach((canvas) => canvas.classList.add("guru-site-editor-canvas-v543"));
      if (!block.querySelector(".guru-site-editor-canvas-v543"))
        block.querySelector(":scope > .v22-section-body")
          ?.classList.add("guru-site-editor-canvas-v543");
      block.querySelectorAll(GURU_SITE_EDITOR_COLLECTIONS_V543).forEach((collection) => {
        collection.classList.add("guru-site-editor-collection-v543");
        [...collection.children].forEach((item) =>
          item.classList.add("guru-site-editor-item-v543"));
      });
      block.querySelectorAll("label").forEach((label) => {
        const control = [...label.children].find((child) =>
          child.matches?.('input:not([type="file"]):not([type="checkbox"]):not([type="radio"]), textarea, select'));
        if (!control) return;
        label.classList.add("guru-site-editor-field-v543");
        const caption = [...label.children].find((child) => child.matches?.("span, small"));
        const isCta = label.classList.contains("guru-hub-inline-button-v507") ||
          label.classList.contains("guru-home-segment-cta-v541") ||
          label.closest(".goat-product-button-preview-v514.is-primary");
        if (isCta) {
          if (caption && caption.textContent.trim() !== "CTA") {
            caption.title = caption.textContent.trim();
            caption.textContent = "CTA";
          }
          guruSiteEditorCtaV543(label, control);
        }
        guruSiteEditorCaptionV543(caption);
        if (!control.value && !control.getAttribute("placeholder") &&
            /заголовок/i.test(caption?.textContent || "") &&
            control.matches("input, textarea"))
          control.placeholder = "Заголовок не заполнен";
      });
      block.querySelectorAll(".goat-product-live-button-v515").forEach((button) =>
        guruSiteEditorCtaV543(button, button.querySelector("input")));
    });
  });
}

const __guruSitePrevRenderAccordionV542 = renderGate1Accordion;
renderGate1Accordion = function () {
  const result = __guruSitePrevRenderAccordionV542.apply(this, arguments);
  guruDecorateSiteBlockEditorsV542();
  return result;
};

const __guruSitePrevMountBodyV542 = gate1MountAccordionBodyV302;
gate1MountAccordionBodyV302 = function () {
  const body = __guruSitePrevMountBodyV542.apply(this, arguments);
  if (body) guruDecorateSiteBlockEditorsV542(els.contentArea);
  return body;
};

let guruSiteBlockDecorateFrameV542 = null;
const guruSiteBlockObserverV542 = new MutationObserver((mutations) => {
  if (activeGateId !== "gate-1" || guruSiteBlockDecorateFrameV542 !== null) return;
  const changedPage = mutations.some((mutation) => [...mutation.addedNodes].some((node) =>
    node.nodeType === 1 && (node.closest?.(".page-structure-card") ||
      node.matches?.(".page-structure-card") || node.querySelector?.(".page-structure-card"))));
  if (!changedPage) return;
  guruSiteBlockDecorateFrameV542 = requestAnimationFrame(() => {
    guruSiteBlockDecorateFrameV542 = null;
    guruDecorateSiteBlockEditorsV542(els.contentArea);
  });
});
guruSiteBlockObserverV542.observe(els.contentArea, { childList: true, subtree: true });

document.addEventListener("input", (event) => {
  const holder = event.target?.closest?.(".guru-site-editor-cta-v543");
  if (holder) guruSiteEditorCtaV543(holder, event.target);
});
