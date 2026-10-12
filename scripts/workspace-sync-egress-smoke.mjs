import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const handler = require('../api/workspace-sync.js');
const previousFetch = globalThis.fetch;
const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example.test';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role';

const timestamp = '2026-09-29T12:00:00.000Z';
const cloudState = { project: { name: 'Проект' }, updatedAt: timestamp, data: 'cloud' };
const incomingState = { project: { name: 'Проект' }, updatedAt: '2026-09-29T12:01:00.000Z', data: 'local' };

function reply(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

async function save({ row = cloudState, base = timestamp, force = false,
  state = incomingState, preflightReady = true, writeFailures = [] } = {}) {
  const calls = [];
  let writeCount = 0;
  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(input);
    const method = options.method || 'GET';
    const select = url.searchParams.get('select') || '';
    calls.push({ method, table: url.pathname.split('/').at(-1), select });
    assert.equal(url.pathname.includes('/guru_workspace_versions'), false,
      'API must not download or re-upload the old workspace for versioning');
    if (url.pathname === '/rest/v1/rpc/guru_workspace_write_metadata') {
      assert.equal(method, 'POST');
      assert.deepEqual(JSON.parse(options.body), { p_project_id: 'project-1' });
      if (!preflightReady) return reply({ code: 'PGRST202',
        message: 'Could not find guru_workspace_write_metadata' }, 404);
      return reply(row ? [{ updated_at: timestamp.replace('Z', '+00:00'),
        state_updated_at: row.updatedAt }] : []);
    }
    if (method === 'GET') {
      assert.equal(url.pathname, '/rest/v1/guru_workspaces');
      if (!row) return reply([]);
      assert.equal(select, 'updated_at,workspace_data');
      return reply([{ updated_at: timestamp.replace('Z', '+00:00'), workspace_data: row }]);
    }
    assert.equal(method, 'POST');
    assert.equal(url.pathname, '/rest/v1/guru_workspaces');
    assert.equal(JSON.parse(options.body).workspace_data.data, state.data);
    const errorCode = writeFailures[writeCount++];
    if (errorCode) return reply({ code: errorCode }, 400);
    return reply(null, 204);
  };
  const req = { method: 'POST', body: {
    project_id: 'project-1', state, base_updated_at: base, force,
  } };
  const res = {
    setHeader() {},
    status(code) { this.code = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
  await handler(req, res);
  assert.equal(res.code, 200);
  return { calls, payload: res.payload };
}

try {
  const normal = await save();
  assert.equal(normal.payload.ok, true);
  assert.deepEqual(normal.calls.map((call) => call.method), ['POST', 'POST']);
  assert.equal(normal.calls[0].table, 'guru_workspace_write_metadata');
  assert.equal(normal.calls.some((call) => call.select.includes('workspace_data')), false);

  const conflict = await save({ base: '2026-09-29T11:00:00.000Z' });
  assert.equal(conflict.payload.error, 'conflict');
  assert.deepEqual(conflict.payload.state, cloudState);
  assert.deepEqual(conflict.calls.map((call) => call.method), ['POST', 'GET']);
  assert.equal(conflict.calls[1].select, 'updated_at,workspace_data');

  const olderWithoutBase = await save({ base: '', state: {
    ...incomingState, updatedAt: '2026-09-29T11:00:00.000Z',
  } });
  assert.equal(olderWithoutBase.payload.error, 'conflict');
  assert.deepEqual(olderWithoutBase.calls.map((call) => call.method), ['POST', 'GET']);

  const forced = await save({ base: '2026-09-29T11:00:00.000Z', force: true });
  assert.equal(forced.payload.ok, true);
  assert.deepEqual(forced.calls.map((call) => call.method), ['POST', 'POST']);

  const firstSave = await save({ row: null, base: '' });
  assert.equal(firstSave.payload.ok, true);
  assert.deepEqual(firstSave.calls.map((call) => call.method), ['POST', 'POST']);

  const missingMigration = await save({ preflightReady: false });
  assert.equal(missingMigration.payload.ok, false);
  assert.equal(missingMigration.payload.status, 503);
  assert.deepEqual(missingMigration.calls.map((call) => call.method), ['POST']);

  const archiveFailure = await save({ writeFailures: ['42501'] });
  assert.equal(archiveFailure.payload.error, 'supabase_write_error');
  assert.deepEqual(archiveFailure.calls.map((call) => call.method), ['POST', 'POST']);

  const schemaFallback = await save({ writeFailures: ['PGRST204'] });
  assert.equal(schemaFallback.payload.ok, true);
  assert.deepEqual(schemaFallback.calls.map((call) => call.method), ['POST', 'POST', 'POST']);

  console.log('workspace-sync egress: обычный POST 2 запроса (короткий RPC + запись); конфликт RPC + полный GET; без миграции запись остановлена');
} finally {
  globalThis.fetch = previousFetch;
  if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
  if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
}
