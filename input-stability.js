/* Keep focused editors mounted while delayed renderers finish an edit. */
(() => {
  "use strict";

  const root = () => document.getElementById("contentArea");
  const excludedInputTypes = new Set([
    "button", "checkbox", "color", "file", "hidden", "radio", "range", "reset", "submit",
  ]);
  let context = null;
  let explicitClick = false;
  let deferred = null;

  function isTextEditor(node) {
    if (!node || !root()?.contains(node) || !node.isConnected) return false;
    if (node.matches("textarea, [contenteditable='true']")) return true;
    return node.matches("input") && !excludedInputTypes.has(node.type);
  }

  function isEditing() {
    const active = document.activeElement;
    return isTextEditor(active) && context?.editor === active &&
      context.workspace === state && context.view === activeView &&
      context.gateId === activeGateId;
  }

  function rememberEditor(node) {
    if (isTextEditor(node)) context = {
      editor: node, workspace: state, view: activeView, gateId: activeGateId,
    };
  }

  window.addEventListener("focusin", (event) => rememberEditor(event.target), true);
  window.addEventListener("input", (event) => rememberEditor(event.target), true);
  window.addEventListener("click", (event) => {
    if (!root()?.contains(event.target) || isTextEditor(event.target)) return;
    explicitClick = true;
    setTimeout(() => { explicitClick = false; }, 0);
  }, true);
  window.addEventListener("submit", (event) => {
    if (!root()?.contains(event.target)) return;
    explicitClick = true;
    setTimeout(() => { explicitClick = false; }, 0);
  }, true);

  function shouldDefer() {
    return !explicitClick && isEditing() &&
      !(guruUserEditDispatchActive && guruUserEditEventType === "input");
  }

  const previousRenderGate = renderGate;
  renderGate = function (...args) {
    if (shouldDefer()) {
      deferred = { kind: "gate", workspace: state, view: activeView, gateId: activeGateId };
      return;
    }
    deferred = null;
    return previousRenderGate.apply(this, args);
  };

  const previousRenderProject = renderProject;
  renderProject = function (...args) {
    if (shouldDefer()) {
      deferred = { kind: "project", workspace: state, view: activeView, gateId: activeGateId };
      return;
    }
    deferred = null;
    return previousRenderProject.apply(this, args);
  };

  window.addEventListener("focusout", (event) => {
    if (!isTextEditor(event.target)) return;
    setTimeout(() => {
      if (isEditing()) return;
      if (guruDerivedRefreshRequired) guruScheduleDerivedRefresh();
      const pending = deferred;
      deferred = null;
      if (!pending || pending.workspace !== state || pending.view !== activeView ||
          pending.gateId !== activeGateId) return;
      if (pending.kind === "gate") renderGate();
      else renderProject();
    }, 0);
  }, true);

  window.GuruInputStability = Object.freeze({ isEditing });
})();
