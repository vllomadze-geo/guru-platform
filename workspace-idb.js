/* Durable workspace store for projects that exceed the browser's localStorage limit. */
let guruWorkspaceDbPromiseV1;

function guruWorkspaceDbV1() {
  if (!guruWorkspaceDbPromiseV1) guruWorkspaceDbPromiseV1 = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB недоступен'));
    const request = indexedDB.open('guru-workspaces-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('workspaces');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Хранилище проектов заблокировано другой вкладкой'));
  }).catch((error) => { guruWorkspaceDbPromiseV1 = null; throw error; });
  return guruWorkspaceDbPromiseV1;
}

async function guruWorkspaceIdbReadV1(projectId) {
  const db = await guruWorkspaceDbV1();
  return new Promise((resolve, reject) => {
    const request = db.transaction('workspaces', 'readonly').objectStore('workspaces').get(projectId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function guruWorkspaceIdbWriteV1(projectId, serialized) {
  const db = await guruWorkspaceDbV1();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('workspaces', 'readwrite');
    transaction.objectStore('workspaces').put({ serialized }, projectId);
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Запись проекта прервана'));
  });
}

async function guruWorkspaceIdbDeleteV1(projectId) {
  const db = await guruWorkspaceDbV1();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('workspaces', 'readwrite');
    transaction.objectStore('workspaces').delete(projectId);
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
  });
}
