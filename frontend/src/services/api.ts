const BASE_URL = 'http://localhost:3000';

function getHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed');
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
