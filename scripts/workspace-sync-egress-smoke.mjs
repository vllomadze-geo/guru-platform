import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const handler = require('../api/workspace-sync.js');

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';

function response({ ok = true, status = 200, json = null, text = '' } = {}) {
  return {
    ok,
    status,
    async json() { return json; },
    async text() { return text; },
  };
}

function makeRes() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; },
  };
}

async function runPost(fetchImpl, body) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    const req = { method: 'POST', body, query: {} };
    const res = makeRes();
    await handler(req, res);
    return res;
  } finally {
    globalThis.fetch = originalFetch;
  }
}

const baseState = {
  schemaVersion: 'test',
  updatedAt: '2026-09-29T12:00:00.000Z',
  project: { name: 'Smoke' },
};

{
  const calls = [];
  const res = await runPost(async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET' });
    if (String(url).includes('/rpc/guru_workspace_sync_meta')) {
      return response({ json: [{
        project_id: 'smoke',
        updated_at: '2026-09-29T11:59:00.000Z',
        state_updated_at: '2026-09-29T11:59:00.000Z',
      }] });
    }
    if (String(url).includes('/guru_workspaces?on_conflict=project_id')) {
      return response();
    }
    throw new Error(`Unexpected URL: ${url}`);
  }, {
    project_id: 'smoke',
    state: baseState,
    base_updated_at: '2026-09-29T11:59:00.000Z',
  });

  assert.equal(res.body?.ok, true);
  assert.equal(calls.length, 2, 'ordinary POST must use only meta RPC + write');
  assert(calls[0].url.includes('/rpc/guru_workspace_sync_meta'));
  assert(calls[1].url.includes('on_conflict=project_id'));
  assert(!calls.some((call) => call.url.includes('select=*')),
    'ordinary POST must not fetch full workspace');
}

{
  const calls = [];
  const cloudState = {
    ...baseState,
    updatedAt: '2026-09-29T12:05:00.000Z',
  };
  const res = await runPost(async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET' });
    if (String(url).includes('/rpc/guru_workspace_sync_meta')) {
      return response({ json: [{
        project_id: 'smoke',
        updated_at: '2026-09-29T12:05:00.000Z',
        state_updated_at: '2026-09-29T12:05:00.000Z',
      }] });
    }
    if (String(url).includes('select=*')) {
      return response({ json: [{
        project_id: 'smoke',
        workspace_data: cloudState,
        updated_at: '2026-09-29T12:05:00.000Z',
      }] });
    }
    throw new Error(`Unexpected URL: ${url}`);
  }, {
    project_id: 'smoke',
    state: baseState,
    base_updated_at: '2026-09-29T11:59:00.000Z',
  });

  assert.equal(res.body?.error, 'conflict');
  assert.deepEqual(res.body?.state, cloudState);
  assert.equal(calls.length, 2, 'conflict must use meta RPC + one full GET');
  assert(calls[0].url.includes('/rpc/guru_workspace_sync_meta'));
  assert(calls[1].url.includes('select=*'));
}

{
  const calls = [];
  const res = await runPost(async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET' });
    if (String(url).includes('/rpc/guru_workspace_sync_meta')) {
      return response({ ok: false, status: 404, text: 'function not found' });
    }
    throw new Error(`Write must not happen without migration: ${url}`);
  }, {
    project_id: 'smoke',
    state: baseState,
    base_updated_at: '',
  });

  assert.equal(res.body?.error, 'supabase_migration_required');
  assert.equal(calls.length, 1, 'missing migration must stop before write');
}

console.log('workspace-sync egress: обычный POST 2 запроса (короткий RPC + запись); конфликт RPC + полный GET; без миграции запись остановлена');
