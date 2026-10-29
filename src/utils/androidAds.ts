export type AdFormat = 'rewarded' | 'interstitial' | 'banner';
export type AdState = 'idle' | 'loading' | 'ready' | 'showing' | 'error' | 'unavailable';
export interface NativeAdEvent { event: string; requestId: string; format?: AdFormat; state: AdState; message?: string; }
interface Bridge { requestAd(format:string,zoneId:string,requestId:string):void; showAd(format:string,requestId:string):void; destroyBanner(requestId:string):void; }
declare global { interface Window { AndroidAds?: Bridge; onAndroidAdsEvent?: (json:string)=>void; } }
const pending=new Map<string,{resolve:(event:NativeAdEvent)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
const listeners=new Set<(event:NativeAdEvent)=>void>();
const bridge=()=>typeof window==='undefined'?undefined:window.AndroidAds;
if(typeof window!=='undefined') window.onAndroidAdsEvent=(raw)=>{try{const event=JSON.parse(raw) as NativeAdEvent;if(!event.requestId||!event.event)return;listeners.forEach(listener=>listener(event));const item=pending.get(event.requestId);if(!item)return;if(['ad_loaded','ad_closed','reward_earned'].includes(event.event)){clearTimeout(item.timer);pending.delete(event.requestId);item.resolve(event);}else if(['ad_load_failed','ad_show_failed','init_failed'].includes(event.event)){clearTimeout(item.timer);pending.delete(event.requestId);item.reject(new Error(event.message||'خطای تبلیغات'));}}catch{/* Ignore malformed native callbacks. */}};
function operation(format:AdFormat,timeout:number,invoke:(native:Bridge,requestId:string)=>void){const native=bridge();if(!native)return Promise.reject(new Error('تبلیغات بومی فقط در نسخه اندروید در دسترس است'));const requestId=`${format}-${Date.now()}-${Math.random().toString(36).slice(2)}`;return new Promise<NativeAdEvent>((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('مهلت پاسخ تبلیغ به پایان رسید'));},timeout);pending.set(requestId,{resolve,reject,timer});invoke(native,requestId);});}
export const androidAds={
 isAvailable:()=>!!bridge(),
 subscribe(listener:(event:NativeAdEvent)=>void){listeners.add(listener);return()=>{listeners.delete(listener);};},
 request:(format:AdFormat,zoneId:string)=>operation(format,30000,(native,id)=>native.requestAd(format,zoneId,id)),
 show:(format:Exclude<AdFormat,'banner'>,requestId:string)=>new Promise<NativeAdEvent>((resolve,reject)=>{const native=bridge();if(!native){reject(new Error('تبلیغات بومی فقط در نسخه اندروید در دسترس است'));return;}const timer=setTimeout(()=>{pending.delete(requestId);reject(new Error('مهلت نمایش تبلیغ به پایان رسید'));},90000);pending.set(requestId,{resolve,reject,timer});native.showAd(format,requestId);}),
 destroyBanner:(requestId:string)=>bridge()?.destroyBanner(requestId)
};
