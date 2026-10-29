import {useEffect,useState} from 'react';
import {androidAds,AdState} from '../utils/androidAds';
export function useTapsell(){
 const[state,setState]=useState<AdState>(androidAds.isAvailable()?'idle':'unavailable');
 useEffect(()=>androidAds.subscribe(event=>setState(event.state)),[]);
 return{isInitialized:androidAds.isAvailable(),state,stats:{officialRevenue:null}};
}
