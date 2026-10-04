const configuredApiBase = import.meta.env.VITE_API_BASE;
const apiBase = (configuredApiBase || (import.meta.env.PROD ? '' : 'http://localhost:8787')).replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message: string, public readonly code = 'REQUEST_FAILED', public readonly status?: number, public readonly requestId?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

interface Envelope<T> { data: T; meta: { requestId: string; [key: string]: unknown } }

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<Envelope<T>> {
  if (import.meta.env.PROD && !configuredApiBase) throw new ApiError('VITE_API_BASE must be configured before deployment.', 'CONFIGURATION_ERROR');
  const requestId = crypto.randomUUID();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 10_000);
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  try {
    const response = await fetch(`${apiBase}${path}`, { headers: { Accept: 'application/json', 'X-Request-Id': requestId }, signal: controller.signal });
    const body = await response.json().catch(() => null) as { data?: T; meta?: Envelope<T>['meta']; error?: { code?: string; message?: string; requestId?: string } } | null;
    if (!response.ok) throw new ApiError(body?.error?.message || `Request failed (${response.status})`, body?.error?.code || 'HTTP_ERROR', response.status, body?.error?.requestId || requestId);
    if (!body || !('data' in body)) throw new ApiError('Worker response did not match the expected contract.', 'CONTRACT_ERROR', response.status, requestId);
    return { data: body.data as T, meta: { requestId, ...(body.meta || {}) } };
  } catch (cause) {
    if (cause instanceof ApiError) throw cause;
    if (cause instanceof DOMException && cause.name === 'AbortError') throw new ApiError('Worker request timed out.', 'TIMEOUT', undefined, requestId);
    throw new ApiError(cause instanceof Error ? cause.message : 'Unable to reach Worker.', 'NETWORK_ERROR', undefined, requestId);
  } finally { window.clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
