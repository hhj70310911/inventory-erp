'use client';
import {useEffect,useRef,useId,type ReactNode} from 'react';
export default function ActionDrawer({title,busy,close,children}:{title:string;busy:boolean;close:()=>void;children:ReactNode}){
 const titleId=useId();
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{ref.current?.showModal();const before=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=before;};},[]);
 return <dialog ref={ref} className="action-drawer" aria-labelledby={titleId} onCancel={e=>{e.preventDefault();if(!busy)close();}}><div className="drawer-heading"><div><h2 id={titleId}>{title}</h2></div><button type="button" className="quiet" onClick={close} disabled={busy} aria-label="關閉表單">返回</button></div><div className="drawer-body">{children}</div></dialog>;
}
