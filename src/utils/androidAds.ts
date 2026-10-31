/**
 * Bridge to the native Tapsell Mediation SDK.
 *
 * Rules enforced here:
 * - Every request has its own id; late events from an old request are ignored.
 * - Loading and showing are separate, timed operations.
 * - A reward is reported only when the native SDK sends `reward_earned`.
 *   Nothing in this module can invent a reward.
 * - A closed or failed ad never resolves as rewarded by itself.
 */

export type AdFormat = 'rewarded' | 'interstitial' | 'banner';

export type AdPhase =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'showing'
  | 'closed'
  | 'rewarded'
  | 'error'
  | 'unavailable';

export interface NativeAdEvent {
  event: string;
  requestId: string;
  format?: AdFormat;
  message?: string;
}

export interface AdShowOutcome {
  /** True only if the official SDK callback `reward_earned` arrived. */
  rewardEarned: boolean;
}

export interface AdSession {
  readonly requestId: string;
  readonly format: AdFormat;
  /** Resolves when the SDK says the ad is loaded; rejects on failure/timeout. */
  readonly loaded: Promise<void>;
  /** Shows the loaded ad and resolves when it closes. */
  show(): Promise<AdShowOutcome>;
  /** Subscribes to all native events for this exact request id. */
  onEvent(listener: (event: NativeAdEvent) => void): () => void;
  /** Removes timers/listeners. Banners are also destroyed natively. */
  dispose(): void;
}

interface NativeAdsBridge {
  requestAd(format: string, zoneId: string, requestId: string): void;
  showAd(format: string, requestId: string): void;
  destroyBanner(requestId: string): void;
}

declare global {
  interface Window {
    AndroidAds?: NativeAdsBridge;
    onAndroidAdsEvent?: (json: string) => void;
  }
}

const LOAD_TIMEOUT_MS = 20_000;
const SHOW_TIMEOUT_MS = 120_000;
const FORMATS: AdFormat[] = ['rewarded', 'interstitial', 'banner'];

function nativeBridge(): NativeAdsBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.AndroidAds;
}

function isAdFormat(value: unknown): value is AdFormat {
  return typeof value === 'string' && (FORMATS as string[]).includes(value);
}

function parseEvent(raw: unknown): NativeAdEvent | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 4096) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.event !== 'string' || record.event.length === 0 || record.event.length > 48) {
    return null;
  }
  if (typeof record.requestId !== 'string' || record.requestId.length === 0 || record.requestId.length > 128) {
    return null;
  }
  if (record.format !== undefined && !isAdFormat(record.format)) return null;
  if (record.message !== undefined && typeof record.message !== 'string') return null;
  return {
    event: record.event,
    requestId: record.requestId,
    format: record.format as AdFormat | undefined,
    message: typeof record.message === 'string' ? record.message.slice(0, 300) : undefined,
  };
}

function createRequestId(format: AdFormat): string {
  const random =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${format}-${random}`;
}

interface LoadWaiter {
  resolve: () => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface ShowWaiter {
  resolve: (outcome: AdShowOutcome) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  rewardEarned: boolean;
}

const requestListeners = new Map<string, Set<(event: NativeAdEvent) => void>>();
const loadWaiters = new Map<string, LoadWaiter>();
const showWaiters = new Map<string, ShowWaiter>();
const liveRequests = new Set<string>();

function cleanupRequest(requestId: string): void {
  const load = loadWaiters.get(requestId);
  if (load) {
    clearTimeout(load.timer);
    loadWaiters.delete(requestId);
  }
  const show = showWaiters.get(requestId);
  if (show) {
    clearTimeout(show.timer);
    showWaiters.delete(requestId);
  }
  requestListeners.delete(requestId);
  liveRequests.delete(requestId);
}

function dispatch(event: NativeAdEvent): void {
  const listeners = requestListeners.get(event.requestId);
  if (listeners) {
    for (const listener of Array.from(listeners)) {
      try {
        listener(event);
      } catch {
        // One broken subscriber must not stop the native event pipeline.
      }
    }
  }

  const load = loadWaiters.get(event.requestId);
  if (load) {
    if (event.event === 'ad_loaded') {
      clearTimeout(load.timer);
      loadWaiters.delete(event.requestId);
      load.resolve();
    } else if (
      event.event === 'ad_load_failed' ||
      event.event === 'init_failed' ||
      event.event === 'ad_no_fill'
    ) {
      clearTimeout(load.timer);
      loadWaiters.delete(event.requestId);
      load.reject(new Error(event.message || 'تبلیغ در دسترس نیست.'));
    }
  }

  const show = showWaiters.get(event.requestId);
  if (show) {
    if (event.event === 'reward_earned') {
      show.rewardEarned = true;
    } else if (event.event === 'ad_closed') {
      clearTimeout(show.timer);
      showWaiters.delete(event.requestId);
      show.resolve({ rewardEarned: show.rewardEarned });
    } else if (event.event === 'ad_show_failed') {
      clearTimeout(show.timer);
      showWaiters.delete(event.requestId);
      show.reject(new Error(event.message || 'نمایش تبلیغ انجام نشد.'));
    }
  }

  if (event.event === 'ad_closed' || event.event === 'ad_show_failed') {
    // Keep listener cleanup deterministic even when the page never called show().
    requestListeners.delete(event.requestId);
    liveRequests.delete(event.requestId);
  }
}

if (typeof window !== 'undefined') {
  window.onAndroidAdsEvent = (raw) => {
    const event = parseEvent(raw);
    if (event) dispatch(event);
  };
}

function startSession(format: AdFormat, zoneId: string): AdSession {
  const native = nativeBridge();
  const requestId = createRequestId(format);
  const listeners = new Set<(event: NativeAdEvent) => void>();
  requestListeners.set(requestId, listeners);
  liveRequests.add(requestId);

  let disposed = false;

  const loaded = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      loadWaiters.delete(requestId);
      cleanupRequest(requestId);
      reject(new Error('مهلت دریافت تبلیغ به پایان رسید.'));
    }, LOAD_TIMEOUT_MS);
    loadWaiters.set(requestId, { resolve, reject, timer });
    try {
      native?.requestAd(format, zoneId, requestId);
    } catch (error) {
      clearTimeout(timer);
      loadWaiters.delete(requestId);
      cleanupRequest(requestId);
      reject(error instanceof Error ? error : new Error('درخواست تبلیغ ناموفق بود.'));
    }
  });

  const session: AdSession = {
    requestId,
    format,
    loaded,
    show(): Promise<AdShowOutcome> {
      if (disposed) return Promise.reject(new Error('این درخواست تبلیغ بسته شده است.'));
      return new Promise<AdShowOutcome>((resolve, reject) => {
        const timer = setTimeout(() => {
          showWaiters.delete(requestId);
          cleanupRequest(requestId);
          reject(new Error('تبلیغ بسته نشد؛ دوباره تلاش کنید.'));
        }, SHOW_TIMEOUT_MS);
        showWaiters.set(requestId, { resolve, reject, timer, rewardEarned: false });
        try {
          if (!native) throw new Error('پل تبلیغات بومی در دسترس نیست.');
          native.showAd(format, requestId);
        } catch (error) {
          clearTimeout(timer);
          showWaiters.delete(requestId);
          cleanupRequest(requestId);
          reject(error instanceof Error ? error : new Error('نمایش تبلیغ ناموفق بود.'));
        }
      });
    },
    onEvent(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cleanupRequest(requestId);
      if (format === 'banner') {
        try {
          native?.destroyBanner(requestId);
        } catch {
          // Destruction is best-effort; a dead WebView must not throw.
        }
      }
    },
  };

  return session;
}

export const androidAds = {
  isAvailable(): boolean {
    return !!nativeBridge();
  },

  /** Starts a request. Returns null when native ads are unavailable. */
  request(format: AdFormat, zoneId: string): AdSession | null {
    if (!nativeBridge()) return null;
    if (!zoneId || zoneId.trim().length === 0) return null;
    return startSession(format, zoneId.trim());
  },

  /** Test/dev entry point that behaves exactly like the real native callback. */
  handleNativeEvent(raw: string): void {
    const event = parseEvent(raw);
    if (event) dispatch(event);
  },

  /** Exposed for diagnostics; never used to grant rewards. */
  pendingCount(): number {
    return liveRequests.size;
  },
};
