'use client';
import {useState} from 'react';
import type {DailyProfit} from '@/lib/erp/daily-profit';
import {money} from './presentation';
export function ProfitTrend({days}:{days:DailyProfit[]}){
 const [active,setActive]=useState<string|null>(null);
 const values=days.flatMap(d=>[d.revenue,d.profit].filter((v):v is string=>v!==null).map(Number));
 const low=Math.min(0,...values),high=Math.max(1,...values),range=high-low;
 const bottom=low<0?low-range*.12:0,top=high+range*.12;
 const y=(v:number)=>182-(v-bottom)/(top-bottom)*152;
 const x=(i:number)=>80+i*76;
 const selected=days.find(d=>d.date===active)||days[days.length-1];
 return <><div className="chart-legend"><span><i className="legend-sales"/>出貨銷售額</span><span><i className="legend-profit"/>毛利</span><small>AUD</small></div><div className="profit-chart"><svg viewBox="0 0 600 218" role="img" aria-label="近七日出貨銷售額與毛利趨勢；每日數字列於下方表格">
 {[0,1,2,3,4].map(i=>{const v=bottom+(top-bottom)*i/4;return <g key={i}><line x1="52" x2="574" y1={y(v)} y2={y(v)} stroke="#e8edf2"/><text x="45" y={y(v)+4} textAnchor="end" fontSize="10" fill="#738294">{Math.abs(v)>=1000?(v/1000).toFixed(1)+'k':v.toFixed(0)}</text></g>})}
 <line x1="52" x2="574" y1={y(0)} y2={y(0)} stroke="#c5d2da"/>
 {days.map((d,i)=><g key={d.date} onMouseEnter={()=>setActive(d.date)}><rect x={x(i)-28} y="25" width="56" height="158" fill={selected?.date===d.date?'#f0f7f6':'transparent'}/>{d.revenue!==null&&<rect x={x(i)-13} y={Math.min(y(Number(d.revenue)),y(0))} width="26" height={Math.max(1,Math.abs(y(Number(d.revenue))-y(0)))} fill="#20b995" rx="2"/>}{i>0&&d.profit!==null&&days[i-1].profit!==null&&<line x1={x(i-1)} y1={y(Number(days[i-1].profit))} x2={x(i)} y2={y(Number(d.profit))} stroke="#3188c5" strokeWidth="2"/>}{d.profit!==null&&<circle cx={x(i)} cy={y(Number(d.profit))} r="4" fill="#3188c5" stroke="white" strokeWidth="1.5"/>}<text x={x(i)} y="205" textAnchor="middle" fontSize="11" fill="#738294">{d.date.slice(5).replace('-','/')}</text></g>)}
 </svg></div><div className="trend-readout" aria-live="polite">{selected.date} <span>出貨銷售額 <b>{money(selected.revenue)}</b></span><span>毛利 <b>{money(selected.profit)}</b></span></div><div className="trend-days" aria-label="選擇趨勢日期">{days.map(d=><button key={d.date} aria-pressed={selected.date===d.date} onClick={()=>setActive(d.date)}>{d.date.slice(5).replace('-','/')}</button>)}</div><details className="trend-table"><summary>查看每日數字</summary><div className="table-scroll"><table><thead><tr><th>日期</th><th className="numeric">銷售額 AUD</th><th className="numeric">成本 AUD</th><th className="numeric">毛利 AUD</th></tr></thead><tbody>{days.map(d=><tr key={d.date}><td>{d.date}</td><td className="numeric">{money(d.revenue)}</td><td className="numeric">{money(d.cost)}</td><td className="numeric">{money(d.profit)}</td></tr>)}</tbody></table></div></details></>;
}
export function OrderDistribution({counts}:{counts:{name:string;count:number;color:string}[]}){
 const total=counts.reduce((n,c)=>n+c.count,0);let start=0;
 return <div className="distribution"><svg viewBox="0 0 200 200" role="img" aria-label={'全部訂單出貨狀態：'+counts.map(c=>`${c.name} ${c.count} 張`).join('、')}><circle cx="100" cy="100" r="69" fill="none" stroke="#edf1f5" strokeWidth="22"/>{total>0&&counts.map(c=>{const fraction=c.count/total,offset=start;start+=fraction;return <circle key={c.name} cx="100" cy="100" r="69" pathLength="100" fill="none" stroke={c.color} strokeWidth="22" strokeDasharray={`${fraction*100} ${100-fraction*100}`} strokeDashoffset={-offset*100} transform="rotate(-90 100 100)"/>})}<text x="100" y="100" textAnchor="middle" fontSize="30" fontWeight="600" fill="#31475a">{total}</text><text x="100" y="123" textAnchor="middle" fontSize="11" fill="#7c8c9a">訂單總數</text></svg><div className="distribution-legend">{counts.map(c=><div key={c.name}><i style={{background:c.color}}/><span>{c.name}</span><b>{c.count}</b><small>{total?(c.count/total*100).toFixed(0):0}%</small></div>)}</div></div>;
}
