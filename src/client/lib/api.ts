import type { ApiErrorBody } from '../../shared/types';

export class ApiClientError extends Error {
  constructor(public body: ApiErrorBody, public status: number) {
    super(body.error.message);
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: options?.body ? { 'Content-Type': 'application/json', ...options.headers } : options?.headers
  });
  if (!response.ok) {
    const body = await response.json<ApiErrorBody>().catch(() => ({ error: { code: 'NETWORK_ERROR', message: '通信に失敗しました。' } }));
    throw new ApiClientError(body, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json<T>();
}

export function queryString(values: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== false) params.set(key, String(value));
  });
  const result = params.toString();
  return result ? `?${result}` : '';
}
