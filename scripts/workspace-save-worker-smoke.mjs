import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import vm from 'node:vm';

const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const workerSource = readFileSync(new URL('../workspace-save-worker.js', import.meta.url), 'utf8');
const pending = [], workers = [], storage = new Map(), listeners = {};
class TestWorker {
  constructor(url) { this.url = url; this.listeners = {}; workers.push(this); }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  postMessage(data) { pending.push({ worker: this, data: structuredClone(data) }); }
  terminate() { this.terminated = true; }
}
const context = vm.createContext({
  URL, Date, Promise, setTimeout, clearTimeout, Worker: TestWorker,
  window: { addEventListener: (type, callback) => { listeners[type] = callback; } },
  document: { querySelector: () => ({ src: 'https://guru.invalid/base/app.js?v=test' }) },
  localStorage: {
    setItem: (key, value) => storage.set(key, value),
    getItem: (key) => storage.get(key) ?? null,
    removeItem: (key) => storage.delete(key),
  },
  reportStorageFailure: (_key, error) => { throw error; },
  WORKSPACE_STORAGE_PREFIX: 'workspace:', WORKSPACE_IDB_MARKER_PREFIX: 'idb:',
  PLATFORM_VERSION: 'test-schema', GURU_TAB_ID: 'test-tab',
  GURU_BUILD_INFO: { version: 'test-build' }, _guruTabDirty: false,
  els: { saveStatus: { textContent: '' }, autosaveDot: { style: {} } },
});
vm.runInContext([
  app.slice(app.indexOf('const guruStorageWriteVersions ='), app.indexOf('function reportStorageFailure(')),
  app.slice(app.indexOf('function safeStorageSet('), app.indexOf('let projects =')),
  app.slice(app.indexOf('function guruPrepareWorkspaceSave('), app.indexOf('function guruCancelDerivedRefresh(')),
].join('\n'), context);
const run = code => vm.runInContext(code, context);
const report = {};
const finish = index => {
  const message = pending.splice(index, 1)[0];
  message.worker.listeners.message({ data: { id: message.data.id, serialized: JSON.stringify(message.data.workspace) } });
};
context.state = { project: { id: 'a', name: 'Проект А' }, gates: [] };
context.activeProjectId = 'a';

const first = run('guruQueueWorkspaceSave()');
const expected = JSON.stringify(context.state);
assert(workers[0].url.href.startsWith('https://guru.invalid/base/workspace-save-worker.js?v=test-build'));
finish(0); assert.equal(await first, true);
assert.equal(storage.get('workspace:a'), expected);
report.sameJsonFormat = true;

context.state.project.name = 'Старый снимок';
const older = run('guruQueueWorkspaceSave()');
context.state.project.name = 'Новый снимок';
const newer = run('guruQueueWorkspaceSave()');
finish(1); assert.equal(await newer, true); finish(0); assert.equal(await older, false);
assert.equal(JSON.parse(storage.get('workspace:a')).project.name, 'Новый снимок');
report.outOfOrderResponses = true;

const late = run('guruQueueWorkspaceSave()');
context.state.project.name = 'Синхронное сохранение';
assert.equal(run('guruPersistStateFast()'), true);
finish(0); assert.equal(await late, false);
assert.equal(JSON.parse(storage.get('workspace:a')).project.name, 'Синхронное сохранение');
report.synchronousSaveWins = true;

const editedAgain = run('guruQueueWorkspaceSave()');
context.els.saveStatus.textContent = 'Сохраняю...';
context._guruTabDirty = true;
run('guruInvalidateQueuedWorkspaceSave("workspace:a")');
finish(0); assert.equal(await editedAgain, false);
assert.equal(context.els.saveStatus.textContent, 'Сохраняю...');
assert.equal(context._guruTabDirty, true);
const latestEdit = run('guruQueueWorkspaceSave()'); finish(0); assert.equal(await latestEdit, true);
assert.equal(context._guruTabDirty, false);
report.newEditInvalidatesSnapshot = true;
report.confirmedSaveClearsUnloadDirtyFlag = true;

const external = run('guruQueueWorkspaceSave()');
storage.set('workspace:a', '{"external":"newer"}'); listeners.storage({ key: 'workspace:a' });
finish(0); assert.equal(await external, false);
assert.equal(storage.get('workspace:a'), '{"external":"newer"}');
report.externalWriteWins = true;

const cleared = run('guruQueueWorkspaceSave()'); listeners.storage({ key: null });
finish(0); assert.equal(await cleared, false);
report.externalClearWins = true;

const deleted = run('guruQueueWorkspaceSave()'); context.projects = [];
finish(0); assert.equal(await deleted, false);
context.projects = [{ id: 'a' }, { id: 'b' }];
report.deletedProjectNotRestored = true;

const oldProject = run('guruQueueWorkspaceSave()');
context.state = { project: { id: 'b', name: 'Проект Б' }, gates: [] }; context.activeProjectId = 'b';
const newProject = run('guruQueueWorkspaceSave()');
finish(1); assert.equal(await newProject, true);
context.els.saveStatus.textContent = 'Проект Б';
finish(0); assert.equal(await oldProject, true);
assert.equal(JSON.parse(storage.get('workspace:a')).project.id, 'a');
assert.equal(JSON.parse(storage.get('workspace:b')).project.id, 'b');
assert.equal(context.els.saveStatus.textContent, 'Проект Б');
report.projectIsolation = true;

const quietOlder = run('guruQueueWorkspaceSave()');
const quietNewer = run('guruQueueWorkspaceSave({quiet:true})');
finish(1); assert.equal(await quietNewer, true); finish(0); assert.equal(await quietOlder, false);
assert(context.els.saveStatus.textContent.startsWith('Сохранено локально:'));
report.feedbackAfterCoalescing = true;

context.state.project.name = 'Резервное сохранение';
const fallback = run('guruQueueWorkspaceSave()');
workers[0].listeners.error({ preventDefault() {} }); assert.equal(await fallback, true);
assert.equal(JSON.parse(storage.get('workspace:b')).project.name, 'Резервное сохранение');
assert(workers[0].terminated); pending.length = 0;
assert.equal(await run('guruQueueWorkspaceSave()'), true); assert.equal(workers.length, 1);
report.workerFailureFallback = true;
context.Worker = undefined;
assert.equal(await run('guruQueueWorkspaceSave()'), true);
report.unavailableWorkerFallback = true;

let receive, response;
vm.runInNewContext(workerSource, { self: {
  addEventListener: (_type, callback) => { receive = callback; },
  postMessage: value => { response = value; },
} });
receive({ data: { id: 7, workspace: structuredClone(context.state) } });
assert.equal(response.id, 7); assert.equal(response.serialized, JSON.stringify(context.state));
report.workerContract = true;
const idb = new Map();
let idbReads = 0;
context.guruWorkspaceIdbWriteV1 = async (id, serialized) => { idb.set(id, { serialized }); return true; };
context.guruWorkspaceIdbReadV1 = async (id) => { idbReads += 1; return idb.get(id) || null; };
storage.set('workspace:c', '{"previous":"local copy"}');
const migrated = await run('guruWorkspaceIdbCommit("c", "{\\"new\\":true}", "workspace:c", guruInvalidateQueuedWorkspaceSave("workspace:c"))');
assert.equal(migrated, true);
assert.equal(idbReads, 1);
assert.equal(storage.has('workspace:c'), false);
assert.equal(run('guruWorkspaceIdbMode.has("c")'), true);
const repeated = await run('guruWorkspaceIdbCommit("c", "{\\"new\\":2}", "workspace:c", guruInvalidateQueuedWorkspaceSave("workspace:c"))');
assert.equal(repeated, true);
assert.equal(idbReads, 1, 'Established IndexedDB saves read the full workspace back');
assert.equal(idb.get('c').serialized, '{"new":2}');
report.idbMigrationVerifiedOnce = true;
report.idbRepeatWritesAvoidReadback = true;
report.passed = true;
mkdirSync('artifacts/input-lag', { recursive: true });
writeFileSync('artifacts/input-lag/workspace-save-worker-results.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
console.log('workspace-save-worker-smoke: PASS');
