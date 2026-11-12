import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const integrity = require('../text-integrity.js');
for (const directory of ['.', 'api']) {
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isFile() && /\.(?:html|css|js|json)$/.test(name))
      integrity.decodeUtf8(readFileSync(path));
  }
}
const sample = 'Коза, ёлка, № 7 — café, 東京, 🐐, e\u0301, <>&"';
const bytes = Buffer.from(sample, 'utf8');
const firstCyrillic = Buffer.from('К', 'utf8');
assert.equal(firstCyrillic.subarray(0, 1).toString('utf8') +
  firstCyrillic.subarray(1).toString('utf8'), '��');
assert.equal(integrity.decodeUtf8(bytes), sample);
assert.equal(integrity.decodeTextFile(bytes), sample);
assert.equal(integrity.decodeTextFile(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), bytes])), sample);
assert.equal(integrity.decodeTextFile(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(sample, 'utf16le')])), sample);
const littleEndian = Buffer.from(sample, 'utf16le');
const bigEndian = Buffer.from(littleEndian);
for (let offset = 0; offset < bigEndian.length; offset += 2)
  [bigEndian[offset], bigEndian[offset + 1]] = [bigEndian[offset + 1], bigEndian[offset]];
assert.equal(integrity.decodeTextFile(Buffer.concat([Buffer.from([0xfe, 0xff]), bigEndian])), sample);
assert.throws(() => integrity.decodeUtf8(Buffer.from([0xd0])), TypeError);
assert.throws(() => integrity.decodeTextFile(Buffer.from([0xd0])), TypeError);
assert.throws(() => integrity.decodeTextFile(Buffer.from('по�ле')), /повреждённый символ/);
assert.throws(() => integrity.assertCleanImportedData([['норма', '��']]), /повреждённый символ/);
assert.throws(() => integrity.assertWellFormed('bad\ud800'), /Unicode/);
assert.deepEqual(integrity.inspect('А�Б\ud800🐐'), { replacementCount: 1, unpairedSurrogateCount: 1 });

const damagedUsp = 'Вещи, котор��е создаются с вниманием';
const cleanUsp = 'Вещи, которые создаются с вниманием';
const workspaceFixture = { project: {
  gate0ScopedValuesV194: [{ value: damagedUsp, usp: { client_gets: cleanUsp } }],
  usp: damagedUsp }, sharedEvidence: { usp: damagedUsp },
  gates: [{ evidence: `УТП: ${damagedUsp}`, untouched: sample }],
};
const repairPlan = integrity.planWorkspaceRecovery(workspaceFixture);
assert.equal(repairPlan.changes.length, 4);
assert.equal(integrity.applyWorkspaceRecovery(workspaceFixture, repairPlan), 4);
assert.equal(workspaceFixture.project.gate0ScopedValuesV194[0].value, cleanUsp);
assert.equal(workspaceFixture.project.usp, cleanUsp);
assert.equal(workspaceFixture.sharedEvidence.usp, cleanUsp);
assert.equal(workspaceFixture.gates[0].evidence, `УТП: ${cleanUsp}`);
assert.equal(workspaceFixture.gates[0].untouched, sample);
assert.equal(integrity.planWorkspaceRecovery(workspaceFixture).changes.length, 0);
const ambiguous = { rows: [{ value: 'те�т' }, { value: 'тест' }, { value: 'тект' }] };
assert.deepEqual(integrity.planWorkspaceRecovery(ambiguous), { changes: [], unresolved: 1 });
assert.equal(ambiguous.rows[0].value, 'те�т');

for (let split = 1; split < bytes.length; split += 1) {
  const decoded = await integrity.readUtf8RequestBody(Readable.from([bytes.subarray(0, split), bytes.subarray(split)]));
  assert.equal(decoded, sample, `split after byte ${split}`);
}
await assert.rejects(integrity.readUtf8RequestBody(Readable.from([Buffer.from([0xd0]), Buffer.from([0x20])])), TypeError);

if (process.env.GURU_TEXT_WORKSPACE) {
  const workspace = JSON.parse(readFileSync(process.env.GURU_TEXT_WORKSPACE, 'utf8'));
  assert.equal(workspace.gates.length, 9, 'expected all nine GURU Gates');
  const fullPlan = integrity.planWorkspaceRecovery(workspace);
  assert.equal(integrity.applyWorkspaceRecovery(workspace, fullPlan), fullPlan.changes.length);
  assert.equal(integrity.planWorkspaceRecovery(workspace).changes.length, 0);
  const serialized = JSON.stringify(workspace);
  const payload = Buffer.from(serialized, 'utf8');
  function* pieces() {
    for (let offset = 0; offset < payload.length; offset += 257)
      yield payload.subarray(offset, offset + 257);
  }
  const received = await integrity.readUtf8RequestBody(Readable.from(pieces()));
  assert.equal(received, serialized);
  assert.deepEqual(JSON.parse(received), workspace);
}

const availablePort = await new Promise((resolve, reject) => {
  const listener = createServer();
  listener.once('error', reject);
  listener.listen(0, '127.0.0.1', () => {
    const port = listener.address().port;
    listener.close(() => resolve(port));
  });
});
const server = spawn(process.execPath, ['local-dev-server.js'], {
  cwd: process.cwd(), env: { ...process.env, PORT: String(availablePort), LIVE_RELOAD: '0',
    NEXT_PUBLIC_SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' }, stdio: 'ignore',
});
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${availablePort}/__build-id`,
        { signal: AbortSignal.timeout(500) });
      if (response.ok) { ready = true; break; }
    } catch (_) { /* wait for the local test server */ }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  assert(ready, 'local server did not start');
  const endpoint = `http://127.0.0.1:${availablePort}/api/workspace-sync`;
  const valid = await fetch(endpoint, { method: 'POST', body: Buffer.from('{"note":"Коза 🐐"}'),
    signal: AbortSignal.timeout(2000) });
  assert.equal(valid.status, 200);
  assert.equal((await valid.json()).error, 'missing_env');
  const invalid = await fetch(endpoint, { method: 'POST', body: Buffer.from([0x7b, 0x22, 0xd0, 0x22, 0x7d]),
    signal: AbortSignal.timeout(2000) });
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error, 'invalid_utf8');
  const malformedJson = await fetch(endpoint, { method: 'POST', body: Buffer.from('{"note":'),
    signal: AbortSignal.timeout(2000) });
  assert.equal(malformedJson.status, 400);
  assert.equal((await malformedJson.json()).error, 'invalid_json');
} finally {
  server.kill('SIGTERM');
}

const listeners = new Map();
let errors = 0;
integrity.installInputGuard({ addEventListener(type, handler) { listeners.set(type, handler); } }, () => { errors += 1; });
const event = (text, type = 'beforeinput') => {
  let blocked = false;
  const input = { target: { closest: () => ({}) }, data: text, clipboardData: { getData: () => text },
    preventDefault() { blocked = true; } };
  listeners.get(type)(input);
  return blocked;
};
assert.equal(event(sample), false);
assert.equal(event('��'), true);
assert.equal(event('�', 'paste'), true);
assert.equal(errors, 2);

const dir = mkdtempSync(join(tmpdir(), 'guru-text-integrity-'));
const source = join(dir, 'original.json');
const restored = join(dir, 'restored.json');
const reportPath = join(dir, 'report.json');
const original = { format: 'guru-project-content-v1', workspace: {
  rows: [{ title: 'подарок в виде лошади' }, { title: 'подарок в ��иде лошади' },
    { title: 'неизвест��ая фраза' }], untouched: sample,
  'диза��нерская коза': { value: 'сохранить ключ до проверки коллизий' } } };
writeFileSync(source, JSON.stringify(original, null, 2), 'utf8');
const result = spawnSync('python3', ['scripts/recover-guru-text.py', source, restored, reportPath],
  { cwd: process.cwd(), encoding: 'utf8' });
assert.equal(result.status, 0, result.stderr || result.stdout);
assert.deepEqual(JSON.parse(readFileSync(source, 'utf8')), original);
const repaired = JSON.parse(readFileSync(restored, 'utf8'));
assert.equal(repaired.workspace.rows[1].title, original.workspace.rows[0].title);
assert.equal(repaired.workspace.rows[2].title, original.workspace.rows[2].title);
assert.equal(repaired.workspace.untouched, sample);
assert.deepEqual(repaired.workspace['диза��нерская коза'], original.workspace['диза��нерская коза']);
const report = JSON.parse(readFileSync(reportPath, 'utf8'));
assert.equal(report.restoredOccurrences, 1);
assert.equal(report.unresolvedOccurrences, 1);
assert.equal(report.unresolvedKeyOccurrences, 1);

console.log('UTF-8 boundaries, malformed bytes, imports, input guard, and recovery: OK');
