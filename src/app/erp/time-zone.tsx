'use client';
import {createContext, useContext, useEffect, useState, type ReactNode} from 'react';
import {deviceTimeZone, validTimeZone} from '@/lib/erp/time-zone';
const Context = createContext({zone:'UTC', preference:'', setPreference:(_value:string)=>{void _value;}});
const key = 'erp.display-time-zone';
export function TimeZoneProvider({children}:{children:ReactNode}) {
  const [preference,setPreferenceState]=useState('');
  const [device,setDevice]=useState('UTC');
  useEffect(()=>{
    const refresh=()=>setDevice(deviceTimeZone());
    refresh();
    try { const saved=localStorage.getItem(key); if(saved&&validTimeZone(saved))setPreferenceState(saved); } catch {}
    const sync=(event:StorageEvent)=>{if(event.key===key)setPreferenceState(event.newValue&&validTimeZone(event.newValue)?event.newValue:'');};
    window.addEventListener('focus',refresh);window.addEventListener('storage',sync);
    return()=>{window.removeEventListener('focus',refresh);window.removeEventListener('storage',sync);};
  },[]);
  const setPreference=(value:string)=>{if(value&&!validTimeZone(value))return;setPreferenceState(value);try{if(value)localStorage.setItem(key,value);else localStorage.removeItem(key);}catch{}};
  return <Context.Provider value={{zone:preference||device,preference,setPreference}}>{children}</Context.Provider>;
}
export const useTimeZone=()=>useContext(Context);
export function TimeZoneSettings(){
  const {zone,preference,setPreference}=useTimeZone();
  const zones=['Australia/Melbourne','Australia/Sydney','Australia/Brisbane','Australia/Adelaide','Australia/Darwin','Australia/Perth','Australia/Hobart','Australia/Lord_Howe','Australia/Eucla','Asia/Taipei','Asia/Shanghai','UTC'];
  return <section className="panel"><h2>時間顯示設定</h2><label>顯示時區<select aria-label="顯示時區" value={preference} onChange={e=>setPreference(e.target.value)}><option value="">自動（依裝置時區）</option>{[...new Set([...zones,...(preference?[preference]:[])])].map(z=><option key={z} value={z}>{z}</option>)}</select></label><p>目前時區：{zone}。自動套用當地夏令時間。</p><p>設定保存在目前瀏覽器，供此裝置使用；訂單圖片與操作時間統一使用此時區。手動填寫的業務日期保持不變。</p></section>;
}
