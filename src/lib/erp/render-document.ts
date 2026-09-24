import type {OrderDocument} from './document-types';
type Command={text:string;x:number;y:number;size:number;bold:boolean;align:CanvasTextAlign};
export async function renderDocument(doc:OrderDocument,company:string,includeNote:boolean):Promise<Blob[]>{
 await document.fonts.ready;
 const width=800,margin=48,maxHeight=4200,font='"Microsoft JhengHei", "PingFang TC", Arial, sans-serif';
 const measure=document.createElement('canvas').getContext('2d');if(!measure)throw Error('瀏覽器不支援圖片產生');
 const pages:{commands:Command[];height:number}[]=[];let commands:Command[]=[],y=0;
 function wrap(text:string,size:number,bold=false,maxWidth=width-margin*2){measure!.font=`${bold?'bold ':''}${size}px ${font}`;const lines:string[]=[];for(const para of text.split(/\r?\n/)){let line='';for(const ch of Array.from(para)){if(line&&measure!.measureText(line+ch).width>maxWidth){lines.push(line);line='';}line+=ch;}lines.push(line);}return lines;}
 function raw(text:string,size=24,bold=false,align:CanvasTextAlign='left',x=margin){commands.push({text,x,y,size,bold,align});y+=size*1.5;}
 function start(){commands=[];y=38;for(const line of wrap(company.trim()||'庫務 ERP',32,true))raw(line,32,true,'center',width/2);raw(doc.kind==='order'?'銷售訂單明細':'銷售出貨單',30,true,'center',width/2);raw(doc.state==='REVERSED'?'已沖銷 · 不作有效出貨憑證':doc.state==='DRAFT'?'草稿':doc.kind==='shipment'?'本次出貨':'訂單明細 · 非出貨證明',20,true,'center',width/2);y+=18;}
 function next(){pages.push({commands,height:y+90});start();}
 function space(h:number){if(y+h>maxHeight-90)next();}
 function add(text:string,size=24,bold=false){for(const line of wrap(text,size,bold)){space(size*1.5);raw(line,size,bold);}}
 function rule(){space(28);raw('────────────────────────────────────────',20);}
 start();add('單據編號：'+doc.number,22);if(doc.kind==='shipment')add('訂單編號：'+doc.orderNumber,22);add('客戶：'+doc.customer);add((doc.kind==='order'?'訂單日期：':'出貨日期：')+doc.date.slice(0,10));add('幣別：'+doc.currency);if(doc.warehouse)add('出貨倉庫：'+doc.warehouse);if(doc.actor)add('經手人：'+doc.actor);rule();
 for(const row of doc.rows){const names=wrap(row.name,26,true),codes=wrap('SKU：'+row.sku,18);const values=[row.quantity+' '+row.unit,row.price,row.amount];const cells=values.map(v=>wrap(v,24,false,204));const height=names.length*39+codes.length*27+34+Math.max(...cells.map(c=>c.length))*36+24;space(height);for(const line of names)raw(line,26,true);for(const line of codes)raw(line,18);const headY=y;['數量','單價','金額'].forEach((text,i)=>commands.push({text,x:margin+i*236,y:headY,size:20,bold:true,align:'left'}));y+=34;const valueY=y;cells.forEach((lines,i)=>lines.forEach((text,j)=>commands.push({text,x:margin+i*236,y:valueY+j*36,size:24,bold:false,align:'left'})));y+=Math.max(...cells.map(c=>c.length))*36+24;}
 rule();const units=new Map<string,number>();for(const row of doc.rows)units.set(row.unit,(units.get(row.unit)||0)+row.quantity);add('數量合計：'+[...units].map(([u,n])=>n+' '+u).join(' ／ '));add((doc.kind==='order'?'訂單總額：':'本次出貨金額：')+doc.currency+' '+doc.total,28,true);
 if(doc.paid!==null&&doc.due!==null){if(doc.kind==='shipment')add('以下收款為整張訂單累計，非本次出貨收款',19);add('整張訂單已收：'+doc.currency+' '+doc.paid);add('整張訂單未收：'+doc.currency+' '+doc.due);}
 if(includeNote&&doc.note){rule();add('備註：',24,true);add(doc.note,22);}
 rule();add('感謝您的惠顧',24);add('產生時間（台灣）：'+new Date(doc.generatedAt).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false}),18);pages.push({commands,height:y+75});
 return Promise.all(pages.map(async(page,index)=>{const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=Math.ceil(page.height*1.5);const ctx=canvas.getContext('2d');if(!ctx)throw Error('圖片產生失敗');ctx.scale(1.5,1.5);ctx.fillStyle='#fff';ctx.fillRect(0,0,width,page.height);ctx.fillStyle='#111';ctx.textBaseline='top';for(const c of page.commands){ctx.font=`${c.bold?'bold ':''}${c.size}px ${font}`;ctx.textAlign=c.align;ctx.fillText(c.text,c.x,c.y);}ctx.font=`18px ${font}`;ctx.textAlign='center';ctx.fillText(`第 ${index+1} / ${pages.length} 頁`,width/2,page.height-40);return new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNG 產生失敗')),'image/png'));}));
}
