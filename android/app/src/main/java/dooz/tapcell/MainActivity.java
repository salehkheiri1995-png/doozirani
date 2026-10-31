package dooz.tapcell;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothServerSocket;
import android.bluetooth.BluetoothSocket;

import ir.tapsell.mediation.Tapsell;
import ir.tapsell.mediation.ad.AdStateListener;
import ir.tapsell.mediation.ad.request.BannerSize;
import ir.tapsell.mediation.ad.request.RequestResultListener;
import ir.tapsell.mediation.ad.show.AdShowCompletionState;
import ir.tapsell.mediation.ad.views.banner.BannerContainer;

public class MainActivity extends AppCompatActivity {
    private static final String TAG = "DoozApp";
    static final int BT_PERMISSION_REQUEST = 1001;
    static final int BT_ENABLE_REQUEST = 1002;
    private static final String TRUSTED_HOST = "dooz.game.local";

    private final Handler ui = new Handler(Looper.getMainLooper());
    private final Map<String, AdRecord> ads = new ConcurrentHashMap<>();
    private WebView webView;
    private FrameLayout bannerHost;
    private BannerContainer banner;
    private String bannerRequestId;
    private AndroidBluetoothBridge bluetoothBridge;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.game_webview);
        bannerHost = findViewById(R.id.banner_container);
        configureWebView();

        bluetoothBridge = new AndroidBluetoothBridge(this, webView);
        webView.addJavascriptInterface(bluetoothBridge, "AndroidBluetooth");
        webView.addJavascriptInterface(new AdsBridge(), "AndroidAds");

        emit("init_started", "init", null, "loading", null);
        try {
            Tapsell.setInitializationListener(() -> emit("init_succeeded", "init", null, "idle", null));
        } catch (Throwable error) {
            emit("init_failed", "init", null, "error", describe(error));
        }
        webView.loadUrl("https://" + TRUSTED_HOST + "/index.html");
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        webView.setWebViewClient(new WebViewClient() {
            private WebResourceResponse local(Uri uri) {
                if (!"https".equals(uri.getScheme()) || !TRUSTED_HOST.equals(uri.getHost())) {
                    return null;
                }
                try {
                    String path = uri.getPath();
                    if (path == null || path.equals("/")) path = "/index.html";
                    if (path.contains("..") || path.indexOf('\0') >= 0) return null;
                    InputStream input = getAssets().open("www" + path);
                    String mime = mimeOf(path);
                    Map<String, String> headers = new HashMap<>();
                    headers.put(
                            "Content-Security-Policy",
                            "default-src 'self' https:; "
                                    + "img-src 'self' data: https:; "
                                    + "style-src 'self' 'unsafe-inline'; "
                                    + "script-src 'self'; "
                                    + "font-src 'self' data:; "
                                    + "connect-src 'self' https: wss:; "
                                    + "media-src 'self' https:"
                    );
                    headers.put("X-Content-Type-Options", "nosniff");
                    return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, input);
                } catch (Exception ignored) {
                    return null;
                }
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse result = local(request.getUrl());
                return result != null ? result : super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && TRUSTED_HOST.equals(uri.getHost())) {
                    return false;
                }
                if ("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    } catch (Exception ignored) {
                        // No browser installed; keep the app usable.
                    }
                }
                return true;
            }
        });
    }

    private static String mimeOf(String path) {
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".webp")) return "image/webp";
        if (path.endsWith(".woff2")) return "font/woff2";
        if (path.endsWith(".woff")) return "font/woff";
        if (path.endsWith(".json") || path.endsWith(".webmanifest")) return "application/json";
        return "text/html";
    }

    private boolean trusted() {
        Uri uri = Uri.parse(webView == null || webView.getUrl() == null ? "" : webView.getUrl());
        return "https".equals(uri.getScheme()) && TRUSTED_HOST.equals(uri.getHost());
    }

    private static boolean valid(String value, int max) {
        return value != null && !value.trim().isEmpty() && value.length() <= max;
    }

    private String describe(Throwable error) {
        String message = error.getMessage();
        return message == null || message.trim().isEmpty()
                ? error.getClass().getSimpleName()
                : message;
    }

    private void emit(
            String event,
            String requestId,
            String format,
            String state,
            String message
    ) {
        Log.i(TAG, event + " format=" + format + " requestId=" + requestId);
        ui.post(() -> {
            if (webView == null) return;
            try {
                JSONObject json = new JSONObject()
                        .put("event", event)
                        .put("requestId", requestId)
                        .put("state", state);
                if (format != null) json.put("format", format);
                if (message != null) json.put("message", message);
                webView.evaluateJavascript(
                        "window.onAndroidAdsEvent&&window.onAndroidAdsEvent("
                                + JSONObject.quote(json.toString()) + ")",
                        null
                );
            } catch (Exception error) {
                Log.e(TAG, "ad_callback_failed", error);
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            @NonNull String[] permissions,
            @NonNull int[] grantResults
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (bluetoothBridge != null) {
            bluetoothBridge.handlePermissionResult(requestCode, permissions, grantResults);
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (bluetoothBridge != null) {
            bluetoothBridge.handleActivityResult(requestCode, resultCode);
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (bluetoothBridge != null) bluetoothBridge.shutdown();
        destroyBannerInternal(bannerRequestId);
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidAds");
            webView.removeJavascriptInterface("AndroidBluetooth");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private final class AdsBridge {
        @JavascriptInterface
        public void requestAd(final String format, final String zoneId, final String requestId) {
            ui.post(() -> {
                if (!trusted()) return;
                if (!valid(requestId, 128) || !valid(zoneId, 256)) {
                    emit("ad_load_failed", requestId == null ? "invalid" : requestId, format, "error", "درخواست تبلیغ نامعتبر است.");
                    return;
                }
                if (!"rewarded".equals(format) && !"interstitial".equals(format) && !"banner".equals(format)) {
                    emit("ad_load_failed", requestId, format, "error", "نوع تبلیغ پشتیبانی نمی‌شود.");
                    return;
                }
                requestAdInternal(format, zoneId, requestId);
            });
        }

        @JavascriptInterface
        public void showAd(final String format, final String requestId) {
            ui.post(() -> {
                if (!trusted() || !valid(requestId, 128)) return;
                showAdInternal(format, requestId);
            });
        }

        @JavascriptInterface
        public void destroyBanner(final String requestId) {
            ui.post(() -> {
                if (trusted()) destroyBannerInternal(requestId);
            });
        }
    }

    private void requestAdInternal(String format, String zoneId, String requestId) {
        if (ads.containsKey(requestId)) {
            emit("ad_load_failed", requestId, format, "error", "این درخواست قبلاً ثبت شده است.");
            return;
        }
        final AdRecord ad = new AdRecord(format);
        ads.put(requestId, ad);
        emit("ad_requested", requestId, format, "loading", null);

        RequestResultListener listener = new RequestResultListener() {
            @Override
            public void onSuccess(@NonNull String adId) {
                AdRecord current = ads.get(requestId);
                if (current == null || current != ad) return;
                current.adId = adId;
                emit("ad_loaded", requestId, format, "ready", null);
                if ("banner".equals(format)) {
                    ui.post(() -> showBanner(requestId, current));
                }
            }

            @Override
            public void onFailure(@NonNull String message) {
                ads.remove(requestId);
                emit("ad_load_failed", requestId, format, "error", message);
            }
        };

        try {
            if ("rewarded".equals(format)) {
                Tapsell.requestRewardedAd(zoneId, listener);
            } else if ("interstitial".equals(format)) {
                Tapsell.requestInterstitialAd(zoneId, listener);
            } else {
                Tapsell.requestBannerAd(zoneId, BannerSize.BANNER_320_50, listener);
            }
        } catch (Throwable error) {
            ads.remove(requestId);
            emit("ad_load_failed", requestId, format, "error", describe(error));
        }
    }

    private void showAdInternal(String format, String requestId) {
        AdRecord ad = ads.get(requestId);
        if (ad == null || ad.adId == null || (format != null && !format.equals(ad.format))) {
            emit("ad_show_failed", requestId, format, "error", "تبلیغ آماده نمایش نیست.");
            return;
        }
        emit("ad_show_started", requestId, ad.format, "showing", null);

        if ("rewarded".equals(ad.format)) {
            Tapsell.showRewardedAd(ad.adId, this, new AdStateListener.Rewarded() {
                @Override
                public void onAdClosed(@NonNull AdShowCompletionState completion) {
                    ads.remove(requestId);
                    emit("ad_closed", requestId, ad.format, "closed", null);
                }

                @Override
                public void onAdImpression() {
                    emit("ad_impression", requestId, ad.format, "showing", null);
                }

                @Override
                public void onAdClicked() {
                    emit("ad_clicked", requestId, ad.format, "showing", null);
                }

                @Override
                public void onRewarded() {
                    // The one and only source of a rewarded-ad credit.
                    if (!ad.rewarded) {
                        ad.rewarded = true;
                        emit("reward_earned", requestId, ad.format, "showing", null);
                    }
                }

                @Override
                public void onAdFailed(@NonNull String message) {
                    ads.remove(requestId);
                    emit("ad_show_failed", requestId, ad.format, "error", message);
                }
            });
        } else if ("interstitial".equals(ad.format)) {
            Tapsell.showInterstitialAd(ad.adId, this, new AdStateListener.Interstitial() {
                @Override
                public void onAdClosed(@NonNull AdShowCompletionState completion) {
                    ads.remove(requestId);
                    emit("ad_closed", requestId, ad.format, "closed", null);
                }

                @Override
                public void onAdImpression() {
                    emit("ad_impression", requestId, ad.format, "showing", null);
                }

                @Override
                public void onAdClicked() {
                    emit("ad_clicked", requestId, ad.format, "showing", null);
                }

                @Override
                public void onAdFailed(@NonNull String message) {
                    ads.remove(requestId);
                    emit("ad_show_failed", requestId, ad.format, "error", message);
                }
            });
        }
    }

    private void showBanner(String requestId, AdRecord ad) {
        AdRecord current = ads.get(requestId);
        if (current == null || current != ad || current.adId == null) return;
        destroyBannerInternal(bannerRequestId);
        bannerRequestId = requestId;
        banner = new BannerContainer(this);
        if (bannerHost == null) return;
        bannerHost.removeAllViews();
        bannerHost.addView(banner);
        try {
            Tapsell.showBannerAd(ad.adId, banner, this, new AdStateListener.Banner() {
                @Override
                public void onAdImpression() {
                    emit("ad_impression", requestId, "banner", "showing", null);
                }

                @Override
                public void onAdClicked() {
                    emit("ad_clicked", requestId, "banner", "showing", null);
                }

                @Override
                public void onAdFailed(@NonNull String message) {
                    emit("ad_show_failed", requestId, "banner", "error", message);
                    destroyBannerInternal(requestId);
                }
            });
        } catch (Throwable error) {
            emit("ad_show_failed", requestId, "banner", "error", describe(error));
            destroyBannerInternal(requestId);
        }
    }

    private void destroyBannerInternal(String requestId) {
        if (requestId != null) {
            AdRecord ad = ads.remove(requestId);
            if (ad != null && ad.adId != null) {
                try {
                    Tapsell.destroyBannerAd(ad.adId);
                } catch (Throwable ignored) {
                    // Best effort.
                }
            }
        }
        if (banner != null && bannerHost != null) {
            bannerHost.removeView(banner);
        }
        banner = null;
        bannerRequestId = null;
    }

    private static final class AdRecord {
        final String format;
        String adId;
        boolean rewarded;

        AdRecord(String format) {
            this.format = format;
        }
    }
}

/**
 * Classic Bluetooth RFCOMM bridge.
 *
 * The wire format is: 4-byte big-endian payload length, then that many UTF-8
 * bytes. Lengths are capped at 64 KiB to match the TypeScript protocol.
 * One socket, one reader thread, one writer queue. The server start is
 * idempotent and every callback is posted back to the WebView thread.
 */
class AndroidBluetoothBridge {
    private static final String TAG = "DoozBluetooth";
    private static final int MAX_FRAME_BYTES = 64 * 1024;
    private static final UUID DOOZ_UUID =
            UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private final Activity activity;
    private final WebView webView;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final Object lock = new Object();
    private final BluetoothAdapter adapter;

    private BluetoothServerSocket serverSocket;
    private Thread acceptThread;
    private Thread connectThread;
    private volatile BluetoothSocket pendingConnectSocket;
    private Connection connection;
    private boolean shuttingDown;
    private boolean permissionRequested;
    private volatile boolean acceptCancelled;

    AndroidBluetoothBridge(Activity activity, WebView webView) {
        this.activity = activity;
        this.webView = webView;
        BluetoothAdapter found = null;
        try {
            found = BluetoothAdapter.getDefaultAdapter();
        } catch (Throwable ignored) {
            found = null;
        }
        this.adapter = found;
    }

    private boolean hasPermission() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return activity.checkSelfPermission(Manifest.permission.BLUETOOTH)
                    == PackageManager.PERMISSION_GRANTED;
        }
        return activity.checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT)
                == PackageManager.PERMISSION_GRANTED;
    }

    private String permissionState() {
        if (hasPermission()) return "granted";
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return "required";
        boolean requested = permissionRequested;
        boolean rationale = false;
        try {
            rationale = activity.shouldShowRequestPermissionRationale(Manifest.permission.BLUETOOTH_CONNECT);
        } catch (Throwable ignored) {
            rationale = true;
        }
        if (requested && !rationale) return "permanently_denied";
        return "required";
    }

    @JavascriptInterface
    public boolean isNative() {
        return true;
    }

    @JavascriptInterface
    public boolean isSupported() {
        return adapter != null;
    }

    @JavascriptInterface
    public boolean isEnabled() {
        if (!hasPermission()) return false;
        try {
            return adapter != null && adapter.isEnabled();
        } catch (Throwable ignored) {
            return false;
        }
    }

    @JavascriptInterface
    public String getStatus() {
        boolean supported = adapter != null;
        String permission = permissionState();
        boolean enabled = false;
        if (supported && "granted".equals(permission)) {
            try {
                enabled = adapter.isEnabled();
            } catch (Throwable ignored) {
                enabled = false;
            }
        }
        try {
            return new JSONObject()
                    .put("supported", supported)
                    .put("enabled", enabled)
                    .put("permission", permission)
                    .toString();
        } catch (Exception error) {
            return "{\"supported\":false,\"enabled\":false,\"permission\":\"required\"}";
        }
    }

    @JavascriptInterface
    public void requestPermissions() {
        if (hasPermission()) {
            postPermission(true, false);
            return;
        }
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            // Legacy Bluetooth permissions are install-time only.
            postPermission(false, false);
            return;
        }
        permissionRequested = true;
        ui.post(() -> {
            try {
                activity.requestPermissions(
                        new String[]{Manifest.permission.BLUETOOTH_CONNECT},
                        MainActivity.BT_PERMISSION_REQUEST
                );
            } catch (Throwable error) {
                postError("درخواست مجوز بلوتوث ناموفق بود: " + describe(error));
            }
        });
    }

    void handlePermissionResult(int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode != MainActivity.BT_PERMISSION_REQUEST) return;
        boolean granted = grantResults.length > 0;
        for (int result : grantResults) {
            if (result != PackageManager.PERMISSION_GRANTED) granted = false;
        }
        boolean permanentlyDenied = false;
        if (!granted && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                permanentlyDenied = !activity.shouldShowRequestPermissionRationale(
                        Manifest.permission.BLUETOOTH_CONNECT
                );
            } catch (Throwable ignored) {
                permanentlyDenied = false;
            }
        }
        postPermission(granted, permanentlyDenied);
    }

    @JavascriptInterface
    public void requestEnable() {
        if (adapter == null) {
            postError("این گوشی بلوتوث کلاسیک ندارد.");
            return;
        }
        if (!hasPermission()) {
            postStatus("برای روشن‌کردن بلوتوث، ابتدا مجوز «دستگاه‌های نزدیک» را تأیید کنید.");
            postPermission(false, "permanently_denied".equals(permissionState()));
            return;
        }
        ui.post(() -> {
            try {
                activity.startActivityForResult(
                        new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE),
                        MainActivity.BT_ENABLE_REQUEST
                );
            } catch (Throwable error) {
                postError("درخواست روشن‌کردن بلوتوث ناموفق بود: " + describe(error));
            }
        });
    }

    void handleActivityResult(int requestCode, int resultCode) {
        if (requestCode != MainActivity.BT_ENABLE_REQUEST) return;
        if (resultCode == Activity.RESULT_OK) {
            postEnabled();
        } else {
            postStatus("بلوتوث روشن نشد؛ برای اتصال دو گوشی باید روشن باشد.");
        }
    }

    @JavascriptInterface
    public String getPairedDevices() {
        if (adapter == null) return "[]";
        if (!hasPermission()) {
            postStatus("برای دیدن گوشی‌های جفت‌شده، مجوز «دستگاه‌های نزدیک» لازم است.");
            return "[]";
        }
        JSONArray result = new JSONArray();
        try {
            Set<BluetoothDevice> bonded = adapter.getBondedDevices();
            if (bonded != null) {
                for (BluetoothDevice device : bonded) {
                    if (device == null) continue;
                    if (device.getBondState() != BluetoothDevice.BOND_BONDED) continue;
                    String name;
                    try {
                        name = device.getName();
                    } catch (Throwable ignored) {
                        name = null;
                    }
                    if (name == null || name.trim().isEmpty()) name = "گوشی اندروید";
                    if (name.length() > 80) name = name.substring(0, 80);
                    result.put(new JSONObject()
                            .put("name", name)
                            .put("address", device.getAddress()));
                }
            }
        } catch (Throwable error) {
            postError("خواندن فهرست گوشی‌های جفت‌شده ناموفق بود: " + describe(error));
            return "[]";
        }
        return result.toString();
    }

    @JavascriptInterface
    public void startServer() {
        if (adapter == null) {
            postError("این گوشی بلوتوث کلاسیک ندارد.");
            return;
        }
        if (!hasPermission()) {
            postStatus("برای میزبانی، مجوز «دستگاه‌های نزدیک» لازم است.");
            postPermission(false, "permanently_denied".equals(permissionState()));
            return;
        }
        if (!isEnabled()) {
            postStatus("بلوتوث خاموش است. ابتدا آن را روشن کنید.");
            return;
        }
        synchronized (lock) {
            if (shuttingDown) return;
            if (acceptThread != null && acceptThread.isAlive()) {
                postStatus("میزبانی از قبل فعال است و منتظر گوشی دوم است.");
                return;
            }
            acceptCancelled = false;
            closeServerSocketLocked();
            acceptThread = new Thread(this::acceptLoop, "dooz-bt-accept");
            acceptThread.start();
        }
    }

    @JavascriptInterface
    public void cancelServer() {
        synchronized (lock) {
            acceptCancelled = true;
            closeServerSocketLocked();
        }
        postStatus("میزبانی متوقف شد.");
    }

    @JavascriptInterface
    public void connectToDevice(String address) {
        if (adapter == null) {
            postError("این گوشی بلوتوث کلاسیک ندارد.");
            return;
        }
        if (!hasPermission()) {
            postStatus("برای اتصال، مجوز «دستگاه‌های نزدیک» لازم است.");
            postPermission(false, "permanently_denied".equals(permissionState()));
            return;
        }
        if (!isEnabled()) {
            postStatus("بلوتوث خاموش است. ابتدا آن را روشن کنید.");
            return;
        }
        if (address == null || !BluetoothAdapter.checkBluetoothAddress(address)) {
            postError("آدرس گوشی حریف معتبر نیست.");
            return;
        }
        synchronized (lock) {
            if (shuttingDown) return;
            closeServerSocketLocked();
            if (connectThread != null && connectThread.isAlive()) {
                postStatus("یک تلاش اتصال دیگر در جریان است.");
                return;
            }
            connectThread = new Thread(() -> connectLoop(address), "dooz-bt-connect");
            connectThread.start();
        }
    }

    @JavascriptInterface
    public void sendData(String message) {
        if (message == null) {
            postError("پیام خالی ارسال نمی‌شود.");
            return;
        }
        byte[] payload;
        try {
            payload = message.getBytes(StandardCharsets.UTF_8);
        } catch (Throwable error) {
            postError("تبدیل پیام به UTF-8 ناموفق بود.");
            return;
        }
        if (payload.length == 0 || payload.length > MAX_FRAME_BYTES) {
            postError("اندازه پیام بلوتوث مجاز نیست.");
            return;
        }
        Connection current;
        synchronized (lock) {
            current = connection;
        }
        if (current == null) {
            postError("اتصال بلوتوث برقرار نیست.");
            return;
        }
        if (!current.enqueue(payload)) {
            postError("صف ارسال بلوتوث پر است؛ دوباره تلاش کنید.");
        }
    }

    @JavascriptInterface
    public void disconnect() {
        closeAll(true);
        postDisconnected();
        postStatus("اتصال بلوتوث قطع شد.");
    }

    void shutdown() {
        shuttingDown = true;
        closeAll(false);
    }

    private void closeAll(boolean notify) {
        Connection current;
        synchronized (lock) {
            acceptCancelled = true;
            closeServerSocketLocked();
            current = connection;
            connection = null;
            if (connectThread != null) {
                connectThread.interrupt();
                connectThread = null;
            }
            BluetoothSocket pending = pendingConnectSocket;
            pendingConnectSocket = null;
            if (pending != null) {
                try {
                    pending.close();
                } catch (IOException ignored) {
                }
            }
        }
        if (current != null) current.close(notify);
    }

    private void acceptLoop() {
        BluetoothServerSocket created = null;
        try {
            created = adapter.listenUsingRfcommWithServiceRecord("DoozIranian", DOOZ_UUID);
            synchronized (lock) {
                if (shuttingDown) {
                    try {
                        created.close();
                    } catch (IOException ignored) {
                    }
                    return;
                }
                serverSocket = created;
            }
            postStatus("در انتظار اتصال گوشی دوم...");
            BluetoothSocket accepted = created.accept();
            synchronized (lock) {
                serverSocket = null;
            }
            try {
                created.close();
            } catch (IOException ignored) {
            }
            if (accepted != null && !shuttingDown) {
                attachSocket(accepted);
            }
        } catch (Throwable error) {
            synchronized (lock) {
                if (serverSocket == created) serverSocket = null;
            }
            if (!shuttingDown && !acceptCancelled) {
                postError("میزبانی بلوتوث ناموفق بود: " + describe(error));
            }
        } finally {
            if (created != null) {
                try {
                    created.close();
                } catch (IOException ignored) {
                }
            }
            synchronized (lock) {
                if (acceptThread == Thread.currentThread()) acceptThread = null;
            }
        }
    }

    private void connectLoop(String address) {
        BluetoothSocket socket = null;
        try {
            BluetoothDevice device = adapter.getRemoteDevice(address);
            socket = device.createRfcommSocketToServiceRecord(DOOZ_UUID);
            synchronized (lock) {
                if (shuttingDown) {
                    try {
                        socket.close();
                    } catch (IOException ignored) {
                    }
                    return;
                }
                pendingConnectSocket = socket;
            }
            postStatus("در حال اتصال به گوشی میزبان...");
            socket.connect();
            synchronized (lock) {
                if (pendingConnectSocket == socket) pendingConnectSocket = null;
            }
            if (shuttingDown) {
                try {
                    socket.close();
                } catch (IOException ignored) {
                }
                return;
            }
            attachSocket(socket);
        } catch (Throwable error) {
            synchronized (lock) {
                if (pendingConnectSocket == socket) pendingConnectSocket = null;
            }
            if (socket != null) {
                try {
                    socket.close();
                } catch (IOException ignored) {
                }
            }
            if (!shuttingDown) {
                postError("اتصال به گوشی میزبان ناموفق بود: " + describe(error));
            }
        } finally {
            synchronized (lock) {
                if (connectThread == Thread.currentThread()) connectThread = null;
            }
        }
    }

    private void attachSocket(BluetoothSocket socket) {
        Connection previous;
        Connection created = new Connection(socket);
        synchronized (lock) {
            if (shuttingDown) {
                try {
                    socket.close();
                } catch (IOException ignored) {
                }
                return;
            }
            previous = connection;
            connection = created;
            closeServerSocketLocked();
        }
        if (previous != null) previous.close(false);
        String name = "گوشی حریف";
        try {
            BluetoothDevice device = socket.getRemoteDevice();
            if (device != null && device.getName() != null && !device.getName().trim().isEmpty()) {
                name = device.getName();
            }
        } catch (Throwable ignored) {
            // Name needs BLUETOOTH_CONNECT; fall back to a generic label.
        }
        if (name.length() > 80) name = name.substring(0, 80);
        created.start();
        postConnected(name);
    }

    private void closeServerSocketLocked() {
        BluetoothServerSocket current = serverSocket;
        serverSocket = null;
        if (current != null) {
            try {
                current.close();
            } catch (IOException ignored) {
            }
        }
        if (acceptThread != null && acceptThread != Thread.currentThread()) {
            acceptThread.interrupt();
            acceptThread = null;
        }
    }

    private void notifyDisconnected(Connection source) {
        synchronized (lock) {
            if (connection == source) connection = null;
            else return;
        }
        postDisconnected();
    }

    private final class Connection {
        private final BluetoothSocket socket;
        private final LinkedBlockingQueue<byte[]> outbound = new LinkedBlockingQueue<>(128);
        private volatile boolean closed;
        private Thread reader;
        private Thread writer;

        Connection(BluetoothSocket socket) {
            this.socket = socket;
        }

        void start() {
            reader = new Thread(this::readLoop, "dooz-bt-reader");
            writer = new Thread(this::writeLoop, "dooz-bt-writer");
            reader.start();
            writer.start();
        }

        boolean enqueue(byte[] payload) {
            if (closed) return false;
            return outbound.offer(payload);
        }

        void close(boolean notify) {
            boolean wasClosed = closed;
            closed = true;
            try {
                socket.close();
            } catch (IOException ignored) {
            }
            if (writer != null) writer.interrupt();
            if (!wasClosed && notify) notifyDisconnected(this);
        }

        private void readLoop() {
            try {
                InputStream input = socket.getInputStream();
                byte[] header = new byte[4];
                while (!closed) {
                    if (!readFully(input, header, 4)) break;
                    int length = ((header[0] & 0xFF) << 24)
                            | ((header[1] & 0xFF) << 16)
                            | ((header[2] & 0xFF) << 8)
                            | (header[3] & 0xFF);
                    if (length <= 0 || length > MAX_FRAME_BYTES) {
                        postError("قاب پیام بلوتوث نامعتبر است.");
                        break;
                    }
                    byte[] payload = new byte[length];
                    if (!readFully(input, payload, length)) {
                        postError("پیام بلوتوث ناقص رسید و اتصال بسته شد.");
                        break;
                    }
                    postData(new String(payload, StandardCharsets.UTF_8));
                }
            } catch (Throwable error) {
                if (!closed) postError("دریافت پیام بلوتوث ناموفق بود: " + describe(error));
            } finally {
                close(true);
            }
        }

        private boolean readFully(InputStream input, byte[] target, int length)
                throws IOException {
            int offset = 0;
            while (offset < length) {
                int read = input.read(target, offset, length - offset);
                if (read < 0) return false;
                if (read == 0) continue;
                offset += read;
            }
            return true;
        }

        private void writeLoop() {
            try {
                OutputStream output = socket.getOutputStream();
                while (!closed) {
                    byte[] payload = outbound.poll(500, TimeUnit.MILLISECONDS);
                    if (payload == null) continue;
                    int length = payload.length;
                    byte[] frame = new byte[4 + length];
                    frame[0] = (byte) (length >>> 24);
                    frame[1] = (byte) (length >>> 16);
                    frame[2] = (byte) (length >>> 8);
                    frame[3] = (byte) length;
                    System.arraycopy(payload, 0, frame, 4, length);
                    output.write(frame);
                    output.flush();
                }
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            } catch (Throwable error) {
                if (!closed) postError("ارسال پیام بلوتوث ناموفق بود: " + describe(error));
            } finally {
                close(true);
            }
        }
    }

    private void postPermission(boolean granted, boolean permanentlyDenied) {
        try {
            JSONObject json = new JSONObject()
                    .put("granted", granted)
                    .put("permanentlyDenied", permanentlyDenied);
            postScript("window.onAndroidBluetoothPermission&&window.onAndroidBluetoothPermission("
                    + JSONObject.quote(json.toString()) + ")");
        } catch (Exception ignored) {
        }
    }

    private void postStatus(String message) {
        postScript("window.onAndroidBluetoothStatus&&window.onAndroidBluetoothStatus("
                + JSONObject.quote(message) + ")");
    }

    private void postConnected(String name) {
        postScript("window.onAndroidBluetoothConnected&&window.onAndroidBluetoothConnected("
                + JSONObject.quote(name) + ")");
    }

    private void postDisconnected() {
        postScript("window.onAndroidBluetoothDisconnected&&window.onAndroidBluetoothDisconnected()");
    }

    private void postData(String json) {
        postScript("window.onAndroidBluetoothData&&window.onAndroidBluetoothData("
                + JSONObject.quote(json) + ")");
    }

    private void postError(String message) {
        Log.w(TAG, message);
        postScript("window.onAndroidBluetoothError&&window.onAndroidBluetoothError("
                + JSONObject.quote(message) + ")");
    }

    private void postEnabled() {
        postScript("window.onAndroidBluetoothEnabled&&window.onAndroidBluetoothEnabled()");
    }

    private void postScript(String script) {
        ui.post(() -> {
            if (webView == null) return;
            try {
                webView.evaluateJavascript(script, null);
            } catch (Throwable ignored) {
            }
        });
    }

    private static String describe(Throwable error) {
        String message = error.getMessage();
        return message == null || message.trim().isEmpty()
                ? error.getClass().getSimpleName()
                : message;
    }
}
