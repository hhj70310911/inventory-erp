'use client';
import {useState} from 'react';
import {MiniIcon} from './presentation';
import ActionDrawer from './action-drawer';
type Icon='stock'|'orders'|'money'|'profit';
export function MobileNavigation({tab,tabs,navigate}:{tab:string;tabs:string[][];navigate:(tab:string)=>void}){
 const [open,setOpen]=useState(false);
 const primary=[['overview','首頁','profit'],['stock','庫存','stock'],['sales','銷售','orders']];
 return <><nav className="mobile-bottom-nav" aria-label="手機主要導覽">{primary.map(([key,label,icon])=><button key={key} type="button" aria-current={tab===key?'page':undefined} onClick={()=>navigate(key)}><MiniIcon kind={icon as Icon}/><span>{label}</span></button>)}<button type="button" aria-expanded={open} aria-current={!primary.some(([key])=>key===tab)?'page':undefined} onClick={()=>setOpen(true)}><span className="mobile-more-icon" aria-hidden="true">☰</span><span>更多</span></button></nav>{open&&<ActionDrawer title="全部功能" busy={false} close={()=>setOpen(false)}><div className="mobile-menu-grid">{tabs.map(([key,title],i)=><button type="button" key={key} aria-current={tab===key?'page':undefined} onClick={()=>{navigate(key);setOpen(false);}}><span>{String(i+1).padStart(2,'0')}</span>{title}<span aria-hidden="true">↗</span></button>)}</div></ActionDrawer>}</>;
}
export function MobileActions({permissions,navigate,sale}:{permissions:string[];navigate:(tab:string)=>void;sale:(mode:'sale'|'ship')=>void}){
 const items:{label:string;detail:string;icon:Icon;run:()=>void;permission?:string}[]=[
  {label:'新增銷售',detail:'客戶與商品',icon:'orders',permission:'sale',run:()=>sale('sale')},
  {label:'安排出貨',detail:'選倉庫出庫',icon:'stock',permission:'ship',run:()=>sale('ship')},
  {label:'採購入庫',detail:'登錄批次成本',icon:'stock',permission:'receive',run:()=>navigate('receive')},
  {label:'查詢庫存',detail:'商品與各倉庫',icon:'stock',run:()=>navigate('stock')},
  {label:'登錄收款',detail:'客戶未收款',icon:'money',permission:'payment',run:()=>navigate('payments')},
  {label:'批次帳務',detail:'調整剩餘成本',icon:'profit',permission:'adjustBatchCost',run:()=>navigate('batches')},
 ];
 return <section className="mobile-quick-actions" aria-label="常用操作"><h2>常用操作</h2><div>{items.filter(i=>!i.permission||permissions.includes(i.permission)).map(i=><button type="button" key={i.label} onClick={i.run}><span className="mobile-action-icon"><MiniIcon kind={i.icon}/></span><strong>{i.label}</strong><small>{i.detail}</small></button>)}</div></section>;
}
