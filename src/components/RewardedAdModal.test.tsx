import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RewardedAdModal } from './RewardedAdModal';
import { androidAds } from '../utils/androidAds';

vi.mock('../utils/tapsellService', () => ({
  TAPSELL_CONFIG: {
    packageName: 'dooz.tapcell',
    appName: 'test',
    zones: {
      rewardedVideo: 'rewarded-zone',
      standardBanner: 'banner-zone',
      interstitialVideo: 'interstitial-zone',
    },
  },
}));

interface FakeNativeAds {
  requestAd: ReturnType<typeof vi.fn>;
  showAd: ReturnType<typeof vi.fn>;
  destroyBanner: ReturnType<typeof vi.fn>;
}

let native: FakeNativeAds;

function emit(event: string, requestId: string) {
  act(() => {
    androidAds.handleNativeEvent(
      JSON.stringify({ event, requestId, format: 'rewarded', state: 'ready' })
    );
  });
}

async function openReadyAd(grant: () => boolean) {
  const user = userEvent.setup();
  const onClose = vi.fn();
  const view = render(
    <RewardedAdModal
      isOpen
      rewardAmount={50}
      onRewardGranted={grant}
      onClose={onClose}
    />
  );
  const requestId = native.requestAd.mock.calls.at(-1)?.[2] as string;
  expect(requestId).toBeTruthy();
  emit('ad_loaded', requestId);
  const showButton = await screen.findByRole('button', { name: 'نمایش تبلیغ' });
  await user.click(showButton);
  expect(native.showAd).toHaveBeenCalledWith('rewarded', requestId);
  return { user, onClose, view, requestId };
}

describe('RewardedAdModal', () => {
  beforeEach(() => {
    native = {
      requestAd: vi.fn(),
      showAd: vi.fn(),
      destroyBanner: vi.fn(),
    };
    (window as unknown as { AndroidAds: FakeNativeAds }).AndroidAds = native;
  });

  afterEach(() => {
    delete (window as unknown as { AndroidAds?: FakeNativeAds }).AndroidAds;
  });

  it('grants exactly once, only after reward_earned, even if the event repeats', async () => {
    const grant = vi.fn(() => true);
    const { requestId } = await openReadyAd(grant);

    emit('reward_earned', requestId);
    emit('reward_earned', requestId);
    emit('ad_closed', requestId);

    expect(grant).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/سکه پس از تأیید رسمی تبلیغ اضافه شد/)).toBeInTheDocument();
  });

  it('never grants coins when the ad closes without the official callback', async () => {
    const grant = vi.fn(() => true);
    const { requestId } = await openReadyAd(grant);

    emit('ad_closed', requestId);

    expect(grant).not.toHaveBeenCalled();
    expect(
      await screen.findByText('تبلیغ بدون دریافت جایزه بسته شد؛ سکه‌ای اضافه نمی‌شود.')
    ).toBeInTheDocument();
  });

  it('does not credit a reward the economy rejects and does not retry', async () => {
    const grant = vi.fn(() => false);
    const { requestId } = await openReadyAd(grant);

    emit('reward_earned', requestId);
    emit('ad_closed', requestId);
    emit('reward_earned', requestId);

    expect(grant).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/سقف روزانه|ثبت جایزه/)).toBeInTheDocument();
  });

  it('ignores delayed callbacks from a previous request after reopening', async () => {
    const grant = vi.fn(() => true);
    const first = await openReadyAd(grant);
    const oldRequestId = first.requestId;

    first.view.rerender(
      <RewardedAdModal
        isOpen={false}
        rewardAmount={50}
        onRewardGranted={grant}
        onClose={vi.fn()}
      />
    );
    first.view.rerender(
      <RewardedAdModal
        isOpen
        rewardAmount={50}
        onRewardGranted={grant}
        onClose={vi.fn()}
      />
    );
    const newRequestId = native.requestAd.mock.calls.at(-1)?.[2] as string;
    expect(newRequestId).not.toBe(oldRequestId);

    emit('ad_loaded', oldRequestId);
    emit('reward_earned', oldRequestId);
    emit('ad_closed', oldRequestId);
    expect(grant).not.toHaveBeenCalled();

    emit('ad_loaded', newRequestId);
    expect(await screen.findByRole('button', { name: 'نمایش تبلیغ' })).toBeInTheDocument();
  });
});
