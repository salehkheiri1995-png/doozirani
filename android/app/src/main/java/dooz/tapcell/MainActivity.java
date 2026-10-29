package dooz.tapcell;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
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
import org.json.JSONObject;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
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
 private static final String TAG="DoozAds";
 private static final String TRUSTED_HOST="dooz.game.local";
 private final Handler ui=new Handler(Looper.getMainLooper());
 private final Map<String,AdRecord> ads=new ConcurrentHashMap<>();
 private WebView webView; private FrameLayout bannerHost; private BannerContainer banner; private String bannerRequestId;
 @Override protected void onCreate(Bundle state){super.onCreate(state);setContentView(R.layout.activity_main);webView=findViewById(R.id.game_webview);bannerHost=findViewById(R.id.banner_container);configureWebView();webView.addJavascriptInterface(new AndroidBluetoothBridge(this,webView),"AndroidBluetooth");webView.addJavascriptInterface(new AdsBridge(),"AndroidAds");emit("init_started","init",null,"loading",null);Tapsell.setInitializationListener(()->emit("init_succeeded","init",null,"idle",null));webView.loadUrl("https://"+TRUSTED_HOST+"/index.html");}
 private void configureWebView(){WebSettings settings=webView.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setAllowFileAccessFromFileURLs(false);settings.setAllowUniversalAccessFromFileURLs(false);webView.setWebViewClient(new WebViewClient(){private WebResourceResponse local(Uri uri){if(!"https".equals(uri.getScheme())||!TRUSTED_HOST.equals(uri.getHost()))return null;try{String path=uri.getPath();if(path==null||path.equals("/"))path="/index.html";if(path.contains(".."))return null;InputStream input=getAssets().open("www"+path);String mime=path.endsWith(".js")?"application/javascript":path.endsWith(".css")?"text/css":path.endsWith(".png")?"image/png":path.endsWith(".svg")?"image/svg+xml":"text/html";Map<String,String> headers=new HashMap<>();headers.put("Content-Security-Policy","default-src 'self' https:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src https:");return new WebResourceResponse(mime,"UTF-8",200,"OK",headers,input);}catch(Exception ignored){return null;}}@Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){WebResourceResponse result=local(request.getUrl());return result!=null?result:super.shouldInterceptRequest(view,request);}@Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri uri=request.getUrl();if("https".equals(uri.getScheme())&&TRUSTED_HOST.equals(uri.getHost()))return false;if("https".equals(uri.getScheme())||"http".equals(uri.getScheme()))try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(Exception ignored){}return true;}});}
 private boolean trusted(){Uri uri=Uri.parse(webView.getUrl()==null?"":webView.getUrl());return"https".equals(uri.getScheme())&&TRUSTED_HOST.equals(uri.getHost());}
 private boolean valid(String value){return value!=null&&!value.trim().isEmpty()&&value.length()<=128;}
 private void emit(String event,String requestId,String format,String state,String message){Log.i(TAG,event+" format="+format+" requestId="+requestId);ui.post(()->{try{JSONObject json=new JSONObject().put("event",event).put("requestId",requestId).put("state",state);if(format!=null)json.put("format",format);if(message!=null)json.put("message",message);webView.evaluateJavascript("window.onAndroidAdsEvent&&window.onAndroidAdsEvent("+JSONObject.quote(json.toString())+")",null);}catch(Exception error){Log.e(TAG,"callback_failed",error);}});}
 private final class AdsBridge {@JavascriptInterface public void requestAd(String format,String zoneId,String requestId){if(!trusted()||!valid(zoneId)||!valid(requestId)||!(format.equals("rewarded")||format.equals("interstitial")||format.equals("banner")))return;ui.post(()->request(format,zoneId,requestId));}@JavascriptInterface public void showAd(String format,String requestId){if(trusted()&&valid(requestId))ui.post(()->show(format,requestId));}@JavascriptInterface public void destroyBanner(String requestId){if(trusted())ui.post(()->destroyBannerInternal(requestId));}}
 private void request(String format,String zoneId,String requestId){if(ads.containsKey(requestId)){emit("ad_load_failed",requestId,format,"error","duplicate_request");return;}ads.put(requestId,new AdRecord(format));emit("ad_requested",requestId,format,"loading",null);RequestResultListener listener=new RequestResultListener(){@Override public void onSuccess(@NonNull String adId){AdRecord ad=ads.get(requestId);if(ad==null)return;ad.adId=adId;emit("ad_loaded",requestId,format,"ready",null);if(format.equals("banner"))showBanner(requestId,ad);}@Override public void onFailure(@NonNull String message){ads.remove(requestId);emit("ad_load_failed",requestId,format,"error",message);}};if(format.equals("rewarded"))Tapsell.requestRewardedAd(zoneId,listener);else if(format.equals("interstitial"))Tapsell.requestInterstitialAd(zoneId,listener);else Tapsell.requestBannerAd(zoneId,BannerSize.BANNER_320_50,listener);}
 private void show(String format,String requestId){AdRecord ad=ads.get(requestId);if(ad==null||ad.adId==null||!ad.format.equals(format)){emit("ad_show_failed",requestId,format,"error","ad_not_ready");return;}emit("ad_show_started",requestId,format,"showing",null);if(format.equals("rewarded")){Tapsell.showRewardedAd(ad.adId,this,new AdStateListener.Rewarded(){@Override public void onAdClosed(@NonNull AdShowCompletionState completion){ads.remove(requestId);emit("ad_closed",requestId,format,"idle",null);}@Override public void onAdImpression(){}@Override public void onAdClicked(){}@Override public void onRewarded(){if(!ad.rewarded){ad.rewarded=true;emit("reward_earned",requestId,format,"showing",null);}}@Override public void onAdFailed(@NonNull String message){ads.remove(requestId);emit("ad_show_failed",requestId,format,"error",message);}});}else if(format.equals("interstitial")){Tapsell.showInterstitialAd(ad.adId,this,new AdStateListener.Interstitial(){@Override public void onAdClosed(@NonNull AdShowCompletionState completion){ads.remove(requestId);emit("ad_closed",requestId,format,"idle",null);}@Override public void onAdImpression(){}@Override public void onAdClicked(){}@Override public void onAdFailed(@NonNull String message){ads.remove(requestId);emit("ad_show_failed",requestId,format,"error",message);}});}}
 private void showBanner(String requestId,AdRecord ad){destroyBannerInternal(bannerRequestId);bannerRequestId=requestId;banner=new BannerContainer(this);bannerHost.removeAllViews();bannerHost.addView(banner);Tapsell.showBannerAd(ad.adId,banner,this,new AdStateListener.Banner(){@Override public void onAdImpression(){}@Override public void onAdClicked(){}@Override public void onAdFailed(@NonNull String message){emit("ad_show_failed",requestId,"banner","error",message);destroyBannerInternal(requestId);}});}
 private void destroyBannerInternal(String requestId){if(requestId!=null){AdRecord ad=ads.remove(requestId);if(ad!=null&&ad.adId!=null)Tapsell.destroyBannerAd(ad.adId);}if(banner!=null){bannerHost.removeView(banner);banner=null;}bannerRequestId=null;}
 @Override public void onBackPressed(){if(webView!=null&&webView.canGoBack())webView.goBack();else super.onBackPressed();}
 @Override protected void onDestroy(){destroyBannerInternal(bannerRequestId);if(webView!=null){webView.removeJavascriptInterface("AndroidAds");webView.removeJavascriptInterface("AndroidBluetooth");webView.destroy();}super.onDestroy();}
 private static final class AdRecord{final String format;String adId;boolean rewarded;AdRecord(String format){this.format=format;}}
}

class AndroidBluetoothBridge {
 private final Activity activity; private final WebView webView; private BluetoothAdapter adapter; private BluetoothServerSocket serverSocket; private BluetoothSocket clientSocket; private static final UUID DOOZ_UUID=UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
 AndroidBluetoothBridge(Activity activity,WebView webView){this.activity=activity;this.webView=webView;try{adapter=BluetoothAdapter.getDefaultAdapter();}catch(Exception ignored){}}
 @JavascriptInterface public boolean isNative(){return true;} @JavascriptInterface public boolean isSupported(){return adapter!=null;} @JavascriptInterface public boolean isEnabled(){return adapter!=null&&adapter.isEnabled();}
 @JavascriptInterface public void requestEnable(){if(adapter!=null&&!adapter.isEnabled())activity.startActivity(new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE));}
 @JavascriptInterface public String getPairedDevices(){if(adapter==null)return"[]";try{Set<BluetoothDevice> paired=adapter.getBondedDevices();if(paired==null||paired.isEmpty())return"[]";StringBuilder result=new StringBuilder("[");boolean first=true;for(BluetoothDevice device:paired){if(!first)result.append(',');first=false;String name=device.getName()==null?"AndroidPhone":device.getName().replace('"',' ');result.append("{\"name\":").append(JSONObject.quote(name)).append(",\"address\":").append(JSONObject.quote(device.getAddress())).append('}');}return result.append(']').toString();}catch(Exception ignored){return"[]";}}
 @JavascriptInterface public void startServer(){if(adapter==null)return;new Thread(()->{try{serverSocket=adapter.listenUsingRfcommWithServiceRecord("DoozIranian",DOOZ_UUID);post("window.onAndroidBluetoothStatus&&window.onAndroidBluetoothStatus('بلوتوث میزبان فعال است')");clientSocket=serverSocket.accept();post("window.onAndroidBluetoothConnected&&window.onAndroidBluetoothConnected('گوشی دوم')");listen(clientSocket);}catch(Exception error){postError(error);}}).start();}
 @JavascriptInterface public void connectToDevice(String address){if(adapter==null||address==null||!address.matches("([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}"))return;new Thread(()->{try{BluetoothDevice device=adapter.getRemoteDevice(address);clientSocket=device.createRfcommSocketToServiceRecord(DOOZ_UUID);adapter.cancelDiscovery();clientSocket.connect();post("window.onAndroidBluetoothConnected&&window.onAndroidBluetoothConnected('گوشی حریف')");listen(clientSocket);}catch(Exception error){postError(error);}}).start();}
 @JavascriptInterface public void sendData(String message){if(message==null||message.length()>65536)return;new Thread(()->{try{if(clientSocket!=null){byte[] bytes=message.getBytes("UTF-8");clientSocket.getOutputStream().write(new byte[]{(byte)(bytes.length>>8),(byte)(bytes.length&255)});clientSocket.getOutputStream().write(bytes);clientSocket.getOutputStream().flush();}}catch(Exception ignored){}}).start();}
 @JavascriptInterface public void disconnect(){try{if(clientSocket!=null)clientSocket.close();if(serverSocket!=null)serverSocket.close();}catch(Exception ignored){}post("window.onAndroidBluetoothDisconnected&&window.onAndroidBluetoothDisconnected()");}
 private void listen(BluetoothSocket socket){try{InputStream input=socket.getInputStream();byte[] lengthBuffer=new byte[2];while(input.read(lengthBuffer)==2){int length=((lengthBuffer[0]&255)<<8)|(lengthBuffer[1]&255);if(length<=0||length>65536)break;byte[] data=new byte[length];int read=0;while(read<length){int count=input.read(data,read,length-read);if(count<0)break;read+=count;}String json=new String(data,0,read,"UTF-8");post("window.onAndroidBluetoothData&&window.onAndroidBluetoothData("+JSONObject.quote(json)+")");}}catch(Exception ignored){post("window.onAndroidBluetoothDisconnected&&window.onAndroidBluetoothDisconnected()");}}
 private void postError(Exception error){post("window.onAndroidBluetoothError&&window.onAndroidBluetoothError("+JSONObject.quote("خطای بلوتوث: "+error.getMessage())+")");}
 private void post(String script){activity.runOnUiThread(()->{try{webView.evaluateJavascript(script,null);}catch(Exception ignored){}});}
}
