/* Prepare the existing workspace JSON without blocking the editing thread.
   This worker has no storage or network access. The main thread owns commits. */
self.addEventListener("message", ({ data }) => {
  try {
    self.postMessage({ id: data.id, serialized: JSON.stringify(data.workspace) });
  } catch (_) {
    // The existing synchronous save is the fallback for unsupported data.
    self.postMessage({ id: data.id });
  }
});
