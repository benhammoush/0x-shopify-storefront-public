import { describe, expect, it, vi } from 'vitest';
import { apiGet } from './client';

describe('apiGet', () => {
  it('returns the Worker response envelope', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { ok: true }, meta: {} }), { status: 200 })));
    await expect(apiGet<{ ok: boolean }>('/health')).resolves.toMatchObject({ data: { ok: true } });
  });
});
