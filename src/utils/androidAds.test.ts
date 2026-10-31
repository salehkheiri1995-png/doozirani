import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { androidAds, type AdSession } from './androidAds';

interface FakeNativeAds {
  requestAd: ReturnType<typeof vi.fn>;
  showAd: ReturnType<typeof vi.fn>;
  destroyBanner: ReturnType<typeof vi.fn>;
}

let native: FakeNativeAds;
let sessions: AdSession[];

function start(format: 'rewarded' | 'interstitial' | 'banner' = 'rewarded') {
  const session = androidAds.request(format, 'zone-test');
  expect(session).not.toBeNull();
  sessions.push(session!);
  const requestId = native.requestAd.mock.calls.at(-1)?.[2] as string;
  expect(requestId).toBe(session!.requestId);
  return { session: session!, requestId };
}

function emit(event: string, requestId: string, extra: Record<string, unknown> = {}) {
  androidAds.handleNativeEvent(
    JSON.stringify({ event, requestId, format: 'rewarded', ...extra })
  );
}

describe('native ad bridge', () => {
  beforeEach(() => {
    sessions = [];
    native = {
      requestAd: vi.fn(),
      showAd: vi.fn(),
      destroyBanner: vi.fn(),
    };
    (window as unknown as { AndroidAds: FakeNativeAds }).AndroidAds = native;
  });

  afterEach(() => {
    for (const session of sessions) session.dispose();
    delete (window as unknown as { AndroidAds?: FakeNativeAds }).AndroidAds;
    vi.useRealTimers();
  });

  it('resolves loading only after ad_loaded and reports a reward only with reward_earned', async () => {
    const { session, requestId } = start();
    expect(native.requestAd).toHaveBeenCalledWith('rewarded', 'zone-test', requestId);

    let loaded = false;
    void session.loaded.then(() => {
      loaded = true;
    });
    await Promise.resolve();
    expect(loaded).toBe(false);

    emit('ad_loaded', requestId, { state: 'ready' });
    await session.loaded;

    const outcomePromise = session.show();
    expect(native.showAd).toHaveBeenCalledWith('rewarded', requestId);

    emit('reward_earned', requestId);
    emit('reward_earned', requestId);
    emit('ad_closed', requestId);

    await expect(outcomePromise).resolves.toEqual({ rewardEarned: true });
  });

  it('reports a closed ad without a reward as not rewarded', async () => {
    const { session, requestId } = start();
    emit('ad_loaded', requestId);
    await session.loaded;

    const outcomePromise = session.show();
    emit('ad_closed', requestId);
    await expect(outcomePromise).resolves.toEqual({ rewardEarned: false });
  });

  it('rejects loading on no-fill and on SDK failure', async () => {
    const first = start();
    emit('ad_no_fill', first.requestId, { message: 'موجودی نیست' });
    await expect(first.session.loaded).rejects.toThrow('موجودی نیست');

    const second = start();
    emit('ad_load_failed', second.requestId, { message: 'شبکه قطع است' });
    await expect(second.session.loaded).rejects.toThrow('شبکه قطع است');
  });

  it('ignores events belonging to an older request', async () => {
    const first = start();
    emit('ad_loaded', first.requestId);
    await first.session.loaded;
    const firstOutcome = first.session.show();

    const second = start();
    emit('ad_loaded', second.requestId);
    await second.session.loaded;
    const secondOutcome = second.session.show();

    // A late close from the first request must not settle the second one.
    emit('reward_earned', first.requestId);
    emit('ad_closed', first.requestId);
    await expect(firstOutcome).resolves.toEqual({ rewardEarned: true });

    emit('ad_closed', second.requestId);
    await expect(secondOutcome).resolves.toEqual({ rewardEarned: false });
  });

  it('times out a load that never completes', async () => {
    vi.useFakeTimers();
    const { session } = start();
    const assertion = expect(session.loaded).rejects.toThrow(/مهلت/);
    await vi.advanceTimersByTimeAsync(20_001);
    await assertion;
  });

  it('times out a shown ad that never closes', async () => {
    vi.useFakeTimers();
    const { session, requestId } = start();
    emit('ad_loaded', requestId);
    await session.loaded;
    const outcome = session.show();
    const assertion = expect(outcome).rejects.toThrow(/بسته نشد/);
    await vi.advanceTimersByTimeAsync(120_001);
    await assertion;
  });

  it('destroys banners on dispose and refuses to show a disposed request', async () => {
    const { session, requestId } = start('banner');
    emit('ad_loaded', requestId);
    await session.loaded;
    session.dispose();
    expect(native.destroyBanner).toHaveBeenCalledWith(requestId);
    await expect(session.show()).rejects.toThrow(/بسته شده/);
  });
});
