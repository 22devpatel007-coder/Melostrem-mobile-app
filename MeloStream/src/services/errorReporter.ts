import { Config } from '@config/index';

const REPORT_ENDPOINT = `${Config.apiBaseUrl}/errors/report`;
const FLUSH_INTERVAL_MS = 7_000;
const DEDUP_WINDOW_MS = 5_000;
const MAX_REPORTS_PER_SESSION = 50;
const MAX_SEND_FAILURES = 5;
const FETCH_TIMEOUT_MS = 8_000;

let _lastCorrelationId: string | null = null;
let _userId: string | null = null;
let _queue: any[] = [];
let _flushTimer: ReturnType<typeof setInterval> | null = null;
let _sessionReportCount = 0;
let _consecutiveSendFailures = 0;
let _initialized = false;
const _dedupMap = new Map<string, { lastSeen: number; occurrences: number }>();

function _dedupKey(payload: any): string {
  return `${payload.message || ''}::${payload.page || ''}`;
}

function _pruneDedup() {
  const cutoff = Date.now() - DEDUP_WINDOW_MS;
  for (const [key, entry] of _dedupMap) {
    if (entry.lastSeen < cutoff) _dedupMap.delete(key);
  }
}

function _serializeError(error: unknown): string {
  if (!error) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message || 'Error (no message)';
  try { return JSON.stringify(error); } catch { return String(error); }
}

function _serializeStack(error: unknown): string | null {
  if (error instanceof Error && typeof error.stack === 'string') {
    return error.stack.slice(0, 2_000);
  }
  return null;
}

function _currentPage(): string {
  return 'mobile';
}

function _generateReportId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function _buildPayload(error: unknown, meta: any = {}): any {
  return {
    message:              _serializeError(error),
    stack:                _serializeStack(error),
    errorCode:            (error as any)?.code ?? null,
    page:                 meta.page ?? _currentPage(),
    action:               meta.action ?? null,
    componentStack:       meta.componentStack ?? null,
    boundary:             meta.boundary ?? null,
    userId:               _userId,
    timestamp:            new Date().toISOString(),
    sessionReportSeq:     _sessionReportCount + 1,
    reportId:             _generateReportId(),
    relatedCorrelationId: _lastCorrelationId,
  };
}

async function _sendBatch(batch: any[]) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(REPORT_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ reports: batch }),
      signal:  controller.signal,
    });
    clearTimeout(timeoutId);
    if (response.ok || response.status === 422) { _consecutiveSendFailures = 0; return; }
    if (response.status === 429) { _consecutiveSendFailures = MAX_SEND_FAILURES; return; }
    _consecutiveSendFailures += 1;
  } catch {
    clearTimeout(timeoutId);
    _consecutiveSendFailures += 1;
  }
}

async function _flush() {
  if (_queue.length === 0) return;
  if (_consecutiveSendFailures >= MAX_SEND_FAILURES) return;
  const batch = _queue.slice();
  _queue = [];
  try { await _sendBatch(batch); } catch {}
}

export function setLastCorrelationId(id: string | null) {
  _lastCorrelationId = id || null;
}

export function setUserId(uid: string | null) {
  _userId = uid || null;
}

export function reportError(error: unknown, meta: any = {}) {
  try {
    if (_sessionReportCount >= MAX_REPORTS_PER_SESSION) return;
    if (_consecutiveSendFailures >= MAX_SEND_FAILURES) return;
    const payload = _buildPayload(error, meta);
    const key = _dedupKey(payload);
    if (_dedupMap.has(key)) {
      const existing = _dedupMap.get(key)!;
      existing.occurrences += 1;
      existing.lastSeen = Date.now();
      const queued = _queue.find(p => _dedupKey(p) === key);
      if (queued) queued.occurrences = existing.occurrences;
      return;
    }
    _pruneDedup();
    _dedupMap.set(key, { lastSeen: Date.now(), occurrences: 1 });
    payload.occurrences = 1;
    _queue.push(payload);
    _sessionReportCount += 1;
  } catch {}
}

export function init() {
  if (_initialized) return;
  _initialized = true;
  _flushTimer = setInterval(_flush, FLUSH_INTERVAL_MS);
}

export function destroy() {
  if (_flushTimer) { clearInterval(_flushTimer); _flushTimer = null; }
  _queue = [];
  _dedupMap.clear();
  _sessionReportCount = 0;
  _consecutiveSendFailures = 0;
  _lastCorrelationId = null;
  _userId = null;
  _initialized = false;
}