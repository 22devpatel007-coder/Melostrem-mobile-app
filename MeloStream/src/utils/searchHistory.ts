import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'melostream-storage' });

const KEY = 'search_history';
const MAX = 10;

export function getSearchHistory(): string[] {
  const raw = storage.getString(KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addSearchHistory(query: string): void {
  const history = getSearchHistory().filter(q => q !== query);
  history.unshift(query);
  storage.set(KEY, JSON.stringify(history.slice(0, MAX)));
}

export function clearSearchHistory(): void {
  storage.set(KEY, JSON.stringify([]));
}