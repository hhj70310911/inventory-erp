import type {Order} from './workspace';
export const money=(value:string|number|null)=>value===null?'—':Number(value).toLocaleString('zh-TW',{minimumFractionDigits:2,maximumFractionDigits:2});
export function orderStatus(order:Order){
 const pending=order.lines.some(l=>l.remaining>0);
 if(!order.lines.length)return '待出貨';
 if(!pending)return '已出貨';
 return order.lines.some(l=>l.remaining<l.quantity)?'部分出貨':'待出貨';
}
export function Status({value}:{value:string}){return <span className={'status-pill '+(['已出貨','已收清'].includes(value)?'status-green':value==='已沖銷'?'status-neutral':value==='部分出貨'?'status-blue':'status-amber')}><i aria-hidden="true"/>{value}</span>;}
export function MiniIcon({kind}:{kind:'stock'|'orders'|'money'|'profit'}){
 const paths={stock:'M3 7l9-4 9 4v10l-9 4-9-4V7zm0 0l9 4 9-4M12 11v10M7 5l10 4',orders:'M7 3h10v4H7zM5 5H3v16h18V5h-2M7 12h10M7 16h6',money:'M3 6h18v14H3zM3 10h18M7 15h3M6 6V3h12v3',profit:'M4 20V4M4 20h17M8 15l4-5 4 2 5-7'};
 return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]}/></svg>;
}
