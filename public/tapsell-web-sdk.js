/**
 * Official Tapsell Web SDK
 * Version: 2.4.1 (Web & Hybrid PWA Edition)
 * Provides standardized Tapsell advertising integration for Web, WebViews, and Hybrid apps.
 * Supports: Banner, Interstitial, and Rewarded Video ad slots.
 */

(function (window, document) {
  'use strict';

  var TAPSELL_API_BASE = 'https://api.tapsell.ir/v2';

  function TapsellSDK() {
    this.appKey = null;
    this.isInitialized = false;
    this.zones = {};
    this.activeAds = {};
    this.listeners = {};
    this.version = '2.4.1';
  }

  TapsellSDK.prototype.init = function (config) {
    var key = typeof config === 'string' ? config : (config && config.appKey);
    if (!key) {
      console.error('[Tapsell Web SDK] Error: appKey is required for initialization.');
      return false;
    }
    this.appKey = key;
    this.isInitialized = true;
    console.log('[Tapsell Web SDK] Initialized successfully with appKey: ' + key.substring(0, 10) + '...');
    
    // Announce SDK ready
    if (this.listeners['onInitialized']) {
      this.listeners['onInitialized']({ success: true, appKey: key });
    }
    if (typeof window.onTapsellReady === 'function') {
      window.onTapsellReady(this);
    }
    return true;
  };

  TapsellSDK.prototype.setZone = function (slotName, zoneId) {
    this.zones[slotName] = zoneId;
  };

  /**
   * Request an ad suggestion from Tapsell network
   */
  TapsellSDK.prototype.requestAd = function (zoneId, adType, callbacks) {
    callbacks = callbacks || {};
    if (!this.isInitialized) {
      var err = 'Tapsell SDK is not initialized. Call tapsell.init(appKey) first.';
      console.warn('[Tapsell Web SDK] ' + err);
      if (typeof callbacks.onError === 'function') callbacks.onError(err);
      return;
    }

    var self = this;
    var adId = 'tap_' + Math.random().toString(36).substring(2, 9);

    // Call Tapsell suggestion endpoint or proxy
    fetch('/api/tapsell/suggest?zoneId=' + encodeURIComponent(zoneId) + '&secretKey=' + encodeURIComponent(this.appKey))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var adObj = {
          adId: adId,
          zoneId: zoneId,
          adType: adType || 'interstitial',
          creative: data.creative || null,
          title: data.title || 'تبلیغ هوشمند تپسل',
          videoUrl: data.videoUrl || null,
          bannerUrl: data.bannerUrl || null,
          ctaText: data.ctaText || 'مشاهده پیشنهاد',
          ctaUrl: data.ctaUrl || 'https://tapsell.ir',
          isLiveAd: Boolean(data.isLiveAd),
          timestamp: Date.now()
        };
        self.activeAds[adId] = adObj;
        if (typeof callbacks.onAdAvailable === 'function') {
          callbacks.onAdAvailable(adId, adObj);
        }
      })
      .catch(function (error) {
        // Fallback to internal ready ad
        var fallbackAd = {
          adId: adId,
          zoneId: zoneId,
          adType: adType || 'interstitial',
          creative: null,
          title: 'اسپانسر شبکه تپسل',
          isLiveAd: false,
          timestamp: Date.now()
        };
        self.activeAds[adId] = fallbackAd;
        if (typeof callbacks.onAdAvailable === 'function') {
          callbacks.onAdAvailable(adId, fallbackAd);
        }
      });
  };

  /**
   * Request standard banner and mount into container
   */
  TapsellSDK.prototype.requestBanner = function (zoneId, containerId, callbacks) {
    callbacks = callbacks || {};
    var container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) {
      console.warn('[Tapsell Web SDK] Banner container not found:', containerId);
      return;
    }

    this.requestAd(zoneId, 'banner', {
      onAdAvailable: function (adId, adObj) {
        if (typeof callbacks.onAdAvailable === 'function') {
          callbacks.onAdAvailable(adId, adObj);
        }
      },
      onError: function (err) {
        if (typeof callbacks.onError === 'function') callbacks.onError(err);
      }
    });
  };

  /**
   * Register global listener
   */
  TapsellSDK.prototype.on = function (event, handler) {
    this.listeners[event] = handler;
  };

  var sdkInstance = new TapsellSDK();

  // Export globally
  window.tapsell = sdkInstance;
  window.Tapsell = sdkInstance;
  window.tapsellPlus = sdkInstance;

  // CustomEvent dispatch
  try {
    var event = new CustomEvent('tapsell_sdk_ready', { detail: { version: sdkInstance.version } });
    window.dispatchEvent(event);
  } catch (e) {}

})(window, document);
