import { MMKV } from 'react-native-mmkv';

let storage: MMKV | null = null;
const getStorage = () => storage ?? (storage = new MMKV({ id: 'melostream-storage' }));
const KEY = 'search_history';
const MAX = 10;

export function getSearchHistory(): string[] {
  const raw = getStorage().getString(KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addSearchHistory(query: string): void {
  const history = getSearchHistory().filter(q => q !== query);
  history.unshift(query);
  getStorage().set(KEY, JSON.stringify(history.slice(0, MAX)));
}

export function clearSearchHistory(): void {
  getStorage().set(KEY, JSON.stringify([]));
}