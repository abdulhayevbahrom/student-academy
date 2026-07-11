const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = configuredApiBaseUrl || '/api';
export const SOCKET_URL = API_BASE_URL.replace(/\/api\/?$/, '');

export function resolveBackendAssetUrl(value: string) {
  if (!value || /^(?:data:|blob:|https?:\/\/)/i.test(value)) return value;

  const apiUrl = new URL(API_BASE_URL, window.location.origin);
  return new URL(value, apiUrl.origin).toString();
}
