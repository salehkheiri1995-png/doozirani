import React,{useEffect}from'react';
import{androidAds}from'../utils/androidAds';
import{TAPSELL_CONFIG}from'../utils/tapsellService';
export const InterstitialAdModal:React.FC<{isOpen:boolean;onClose:()=>void}>=({isOpen,onClose})=>{useEffect(()=>{if(!isOpen)return;if(!androidAds.isAvailable()||!TAPSELL_CONFIG.zones.interstitialVideo){onClose();return;}let active=true;androidAds.request('interstitial',TAPSELL_CONFIG.zones.interstitialVideo).then(event=>active?androidAds.show('interstitial',event.requestId):Promise.reject()).catch(()=>{}).finally(()=>{if(active)onClose();});return()=>{active=false;};},[isOpen,onClose]);return null;};
