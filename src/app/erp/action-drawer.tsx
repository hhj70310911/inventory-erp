'use client';
import {useEffect,useRef,type ReactNode} from 'react';
export default function ActionDrawer({title,busy,close,children}:{title:string;busy:boolean;close:()=>void;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{ref.current?.showModal();const before=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=before;};},[]);
 return <dialog ref={ref} className="action-drawer" aria-labelledby="drawer-title" onCancel={e=>{e.preventDefault();if(!busy)close();}}><div className="drawer-heading"><div><p className="erp-eyebrow">NEW TRANSACTION</p><h2 id="drawer-title">{title}</h2></div><button type="button" className="quiet" onClick={close} disabled={busy} aria-label="關閉表單">✕</button></div><div className="drawer-body">{children}</div></dialog>;
}
