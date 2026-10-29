import React,{useEffect,useState}from'react';
import{androidAds}from'../utils/androidAds';
import{TAPSELL_CONFIG}from'../utils/tapsellService';
export const TapsellBanner:React.FC=()=>{const[msg,setMsg]=useState('');useEffect(()=>{if(!androidAds.isAvailable()){setMsg('بنر بومی فقط در نسخه اندروید نمایش داده می‌شود');return;}if(!TAPSELL_CONFIG.zones.standardBanner){setMsg('شناسه تبلیغ‌گاه Mediation بنر تنظیم نشده است');return;}let requestId='';androidAds.request('banner',TAPSELL_CONFIG.zones.standardBanner).then(event=>{requestId=event.requestId;}).catch(error=>setMsg(error.message));return()=>{if(requestId)androidAds.destroyBanner(requestId);};},[]);return msg?<div className="text-center text-[10px] text-stone-500 py-2">{msg}</div>:null;};
