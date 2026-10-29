package dooz.tapcell;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.JavascriptInterface;
import android.view.Window;
import android.view.WindowManager;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.bluetooth.BluetoothServerSocket;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public class MainActivity extends Activity {
    private WebView webView;
    private static final String SCHEME_HOST = "https://dooz.game.local/";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMediaPlaybackRequiresUserGesture(false);

        webView.setWebViewClient(new WebViewClient() {
            private WebResourceResponse handleIntercept(String url) {
                if (url == null) return null;
                if (url.startsWith("https://dooz.game.local/") || url.startsWith("http://dooz.game.local/")) {
                    try {
                        String path = url.replace("https://dooz.game.local/", "")
                                         .replace("http://dooz.game.local/", "");
                        int queryIdx = path.indexOf('?');
                        if (queryIdx != -1) path = path.substring(0, queryIdx);
                        int hashIdx = path.indexOf('#');
                        if (hashIdx != -1) path = path.substring(0, hashIdx);

                        if (path.isEmpty() || path.equals("/") || path.equals("index.html")) {
                            path = "index.html";
                        }
                        if (path.startsWith("/")) {
                            path = path.substring(1);
                        }

                        String mimeType = "text/html";
                        if (path.endsWith(".js") || path.endsWith(".mjs")) mimeType = "application/javascript";
                        else if (path.endsWith(".css")) mimeType = "text/css";
                        else if (path.endsWith(".json")) mimeType = "application/json";
                        else if (path.endsWith(".png")) mimeType = "image/png";
                        else if (path.endsWith(".jpg") || path.endsWith(".jpeg")) mimeType = "image/jpeg";
                        else if (path.endsWith(".svg")) mimeType = "image/svg+xml";
                        else if (path.endsWith(".mp4")) mimeType = "video/mp4";
                        else if (path.endsWith(".wav")) mimeType = "audio/wav";
                        else if (path.endsWith(".mp3")) mimeType = "audio/mpeg";
                        else if (path.endsWith(".woff2")) mimeType = "font/woff2";
                        else if (path.endsWith(".ttf")) mimeType = "font/ttf";

                        InputStream is = null;
                        try {
                            is = getAssets().open("www/" + path);
                        } catch (Exception ex) {
                            try {
                                is = getAssets().open(path);
                            } catch (Exception ex2) {
                                is = getAssets().open("www/index.html");
                            }
                        }

                        Map<String, String> headers = new HashMap<String, String>();
                        headers.put("Access-Control-Allow-Origin", "*");
                        headers.put("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                        headers.put("Access-Control-Allow-Headers", "*");

                        return new WebResourceResponse(mimeType, "UTF-8", 200, "OK", headers, is);
                    } catch (Exception e) {
                        return null;
                    }
                }
                return null;
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                WebResourceResponse res = handleIntercept(url);
                if (res != null) return res;
                return super.shouldInterceptRequest(view, url);
            }

            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (request != null && request.getUrl() != null) {
                    WebResourceResponse res = handleIntercept(request.getUrl().toString());
                    if (res != null) return res;
                }
                return super.shouldInterceptRequest(view, request);
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("https://dooz.game.local/") || url.startsWith("http://dooz.game.local/")) {
                    return false;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                } catch (Exception ignored) {}
                return true;
            }
        });

        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new AndroidBluetoothBridge(this, webView), "AndroidBluetooth");

        setContentView(webView);
        webView.loadUrl(SCHEME_HOST + "index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}

class AndroidBluetoothBridge {
    private final Activity activity;
    private final WebView webView;
    private BluetoothAdapter adapter;
    private BluetoothServerSocket serverSocket;
    private BluetoothSocket clientSocket;
    private static final UUID DOOZ_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    public AndroidBluetoothBridge(Activity act, WebView wv) {
        this.activity = act;
        this.webView = wv;
        try {
            this.adapter = BluetoothAdapter.getDefaultAdapter();
        } catch (Exception ignored) {}
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
        return adapter != null && adapter.isEnabled();
    }

    @JavascriptInterface
    public void requestEnable() {
        if (adapter != null && !adapter.isEnabled()) {
            Intent intent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            activity.startActivity(intent);
        }
    }

    @JavascriptInterface
    public String getPairedDevices() {
        if (adapter == null) return "[]";
        try {
            Set<BluetoothDevice> paired = adapter.getBondedDevices();
            if (paired == null || paired.isEmpty()) return "[]";
            StringBuilder sb = new StringBuilder("[");
            boolean first = true;
            for (BluetoothDevice dev : paired) {
                if (!first) sb.append(",");
                first = false;
                String dName = "AndroidPhone";
                if (dev.getName() != null) {
                    dName = dev.getName().replace('"', ' ');
                }
                sb.append("{\"name\":\"").append(dName).append("\",\"address\":\"").append(dev.getAddress()).append("\"}");
            }
            sb.append("]");
            return sb.toString();
        } catch (Exception e) {
            return "[]";
        }
    }

    @JavascriptInterface
    public void startServer() {
        if (adapter == null) return;
        new Thread(new Runnable() {
            public void run() {
                try {
                    serverSocket = adapter.listenUsingRfcommWithServiceRecord("DoozIranian", DOOZ_UUID);
                    postToJs("window.onAndroidBluetoothStatus && window.onAndroidBluetoothStatus('بلوتوث میزبان فعال است. منتظر اتصال گوشی حریف...')");
                    clientSocket = serverSocket.accept();
                    String rName = clientSocket.getRemoteDevice().getName();
                    postToJs("window.onAndroidBluetoothConnected && window.onAndroidBluetoothConnected('" + (rName != null ? rName : "گوشی دوم") + "')");
                    listenForData(clientSocket);
                } catch (final Exception e) {
                    postToJs("window.onAndroidBluetoothError && window.onAndroidBluetoothError('خطا در بلوتوث: " + e.getMessage() + "')");
                }
            }
        }).start();
    }

    @JavascriptInterface
    public void connectToDevice(final String address) {
        if (adapter == null) return;
        new Thread(new Runnable() {
            public void run() {
                try {
                    postToJs("window.onAndroidBluetoothStatus && window.onAndroidBluetoothStatus('در حال اتصال به " + address + "...')");
                    BluetoothDevice device = adapter.getRemoteDevice(address);
                    clientSocket = device.createRfcommSocketToServiceRecord(DOOZ_UUID);
                    try { adapter.cancelDiscovery(); } catch (Exception ignored) {}
                    clientSocket.connect();
                    String rName = device.getName();
                    postToJs("window.onAndroidBluetoothConnected && window.onAndroidBluetoothConnected('" + (rName != null ? rName : "گوشی حریف") + "')");
                    listenForData(clientSocket);
                } catch (final Exception e) {
                    postToJs("window.onAndroidBluetoothError && window.onAndroidBluetoothError('اتصال برقرار نشد: " + e.getMessage() + "')");
                }
            }
        }).start();
    }

    @JavascriptInterface
    public void sendData(final String message) {
        new Thread(new Runnable() {
            public void run() {
                try {
                    if (clientSocket != null && clientSocket.getOutputStream() != null) {
                        byte[] bytes = message.getBytes("UTF-8");
                        byte[] len = new byte[] { (byte)(bytes.length >> 8), (byte)(bytes.length & 0xFF) };
                        clientSocket.getOutputStream().write(len);
                        clientSocket.getOutputStream().write(bytes);
                        clientSocket.getOutputStream().flush();
                    }
                } catch (Exception ignored) {}
            }
        }).start();
    }

    @JavascriptInterface
    public void disconnect() {
        try {
            if (clientSocket != null) clientSocket.close();
            if (serverSocket != null) serverSocket.close();
        } catch (Exception ignored) {}
        postToJs("window.onAndroidBluetoothDisconnected && window.onAndroidBluetoothDisconnected()");
    }

    private void listenForData(BluetoothSocket socket) {
        try {
            InputStream in = socket.getInputStream();
            byte[] lenBuf = new byte[2];
            while (in.read(lenBuf) == 2) {
                int length = ((lenBuf[0] & 0xFF) << 8) | (lenBuf[1] & 0xFF);
                if (length <= 0 || length > 65536) break;
                byte[] dataBuf = new byte[length];
                int totalRead = 0;
                while (totalRead < length) {
                    int r = in.read(dataBuf, totalRead, length - totalRead);
                    if (r == -1) break;
                    totalRead += r;
                }
                String msg = new String(dataBuf, 0, totalRead, "UTF-8");
                final String sanitized = msg.replace("'", " ");
                postToJs("window.onAndroidBluetoothData && window.onAndroidBluetoothData('" + sanitized + "')");
            }
        } catch (Exception e) {
            postToJs("window.onAndroidBluetoothDisconnected && window.onAndroidBluetoothDisconnected()");
        }
    }

    private void postToJs(final String jsCode) {
        activity.runOnUiThread(new Runnable() {
            public void run() {
                try {
                    webView.evaluateJavascript(jsCode, null);
                } catch (Exception ignored) {}
            }
        });
    }
}
