import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'kali_customer_token';
const API_URL_KEY = 'kali_api_url';
const isWeb = Platform.OS === 'web';
const DEFAULT_API_URL = isWeb ? 'http://localhost:8000' : (process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000');

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export async function getApiUrl() {
  if (isWeb) return localStorage.getItem(API_URL_KEY) ?? DEFAULT_API_URL;
  return (await SecureStore.getItemAsync(API_URL_KEY)) ?? DEFAULT_API_URL;
}

export async function saveApiUrl(url: string) {
  const cleaned = url.trim().replace(/\/$/, '');
  if (isWeb) localStorage.setItem(API_URL_KEY, cleaned);
  else await SecureStore.setItemAsync(API_URL_KEY, cleaned);
}

export async function getToken() {
  if (isWeb) return localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function saveToken(token: string) {
  if (isWeb) localStorage.setItem(TOKEN_KEY, token);
  else await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken() {
  if (isWeb) localStorage.removeItem(TOKEN_KEY);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const [baseUrl, token] = await Promise.all([getApiUrl(), getToken()]);
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(typeof body?.detail === 'string' ? body.detail : 'Impossibile completare la richiesta', response.status);
  }
  return response.json() as Promise<T>;
}