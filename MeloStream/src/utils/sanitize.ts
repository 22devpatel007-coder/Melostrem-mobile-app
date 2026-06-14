export function sanitizeDisplay(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, '').trim();
}