import { useAuthStore } from '../store/authStore';
import { toast } from '../store/toastStore';
import { API_BASE } from '../utils/avatar';
import type { AuthTokens } from '../types';

const BASE_URL = API_BASE;

function getHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  const { tokens } = useAuthStore.getState();
  if (!tokens?.refreshToken) return null;

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokens.refreshToken}` },
      });
      if (!response.ok) return null;
      const newTokens: AuthTokens = await response.json();
      useAuthStore.getState().setTokens(newTokens);
      return newTokens.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function rebuildHeadersWithToken(headers: HeadersInit | undefined, accessToken: string): HeadersInit {
  if (!headers) return { Authorization: `Bearer ${accessToken}` };
  if (headers instanceof Headers) {
    const next = new Headers(headers);
    next.set('Authorization', `Bearer ${accessToken}`);
    return next;
  }
  if (Array.isArray(headers)) {
    const next = headers.filter(([key]) => key.toLowerCase() !== 'authorization');
    next.push(['Authorization', `Bearer ${accessToken}`]);
    return next;
  }
  return { ...(headers as Record<string, string>), Authorization: `Bearer ${accessToken}` };
}

async function request<T>(url: string, options: RequestInit = {}, retried = false): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, options);

  if (response.status === 401 && useAuthStore.getState().user && !retried && !url.startsWith('/auth/')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      const retryOptions: RequestInit = {
        ...options,
        headers: rebuildHeadersWithToken(options.headers, newToken),
      };
      return request<T>(url, retryOptions, true);
    }

    useAuthStore.getState().logout();
    toast.error('Sua sessão expirou. Entre novamente, por favor.');
    throw new Error('Sessão expirada');
  }

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Falha na requisição');
  return data;
}

export const api = {
  post: <T>(url: string, body: unknown, token?: string) =>
    request<T>(url, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify(body),
    }),

  get: <T>(url: string, token?: string) =>
    request<T>(url, {
      method: 'GET',
      headers: getHeaders(token),
    }),

  patch: <T>(url: string, body: unknown, token?: string) =>
    request<T>(url, {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify(body),
    }),

  delete: <T>(url: string, token?: string) =>
    request<T>(url, {
      method: 'DELETE',
      headers: getHeaders(token),
    }),

  upload: <T>(url: string, formData: FormData, token?: string) =>
    request<T>(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }),
};
