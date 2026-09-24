import {Prisma} from '@prisma/client';
import prisma from '../prisma';
import {employee,seeMoney,ErpError} from './service';
import type {OrderDocument} from './document-types';
export async function orderDocument(userId:string,orderId:string,shipmentId?:string):Promise<OrderDocument>{
 const user=await employee(userId);
 return prisma.$transaction(async tx=>{
  const order=await tx.salesOrder.findUnique({where:{id:orderId},select:{id:true,number:true,state:true,orderedAt:true,currency:true,note:true,customer:{select:{name:true}},lines:{select:{quantity:true,unitPrice:true,skuCode:true,description:true,sku:{select:{unit:true}}}},payments:{where:{payment:{state:'POSTED'}},select:{amount:true}}}});
  if(!order)throw new ErpError('找不到訂單');
  const sum=(values:Prisma.Decimal[])=>values.reduce((n,v)=>n.add(v),new Prisma.Decimal(0));
  const orderTotal=sum(order.lines.map(l=>l.unitPrice.mul(l.quantity))),paid=sum(order.payments.map(p=>p.amount));
  const base={orderNumber:order.number,customer:order.customer.name,currency:order.currency,generatedAt:new Date().toISOString(),orderTotal:orderTotal.toFixed(2),paid:seeMoney(user)?paid.toFixed(2):null,due:seeMoney(user)?orderTotal.sub(paid).toFixed(2):null};
  if(!shipmentId)return {...base,kind:'order',number:order.number,date:order.orderedAt.toISOString(),state:order.state,note:order.note,total:orderTotal.toFixed(2),rows:order.lines.map(l=>({sku:l.skuCode,name:l.description,unit:l.sku.unit,quantity:l.quantity,price:l.unitPrice.toFixed(2),amount:l.unitPrice.mul(l.quantity).toFixed(2)}))};
  const shipment=await tx.shipment.findFirst({where:{id:shipmentId,orderId:order.id},select:{number:true,state:true,postedAt:true,createdAt:true,note:true,warehouse:{select:{name:true}},actor:{select:{displayName:true}},allocations:{select:{salesLineId:true,quantity:true,unitPrice:true,salesLine:{select:{skuCode:true,description:true,sku:{select:{unit:true}}}}}}}});
  if(!shipment)throw new ErpError('找不到此訂單的出貨紀錄');
  const grouped=new Map<string,{sku:string;name:string;unit:string;quantity:number;price:Prisma.Decimal}>();
  for(const a of shipment.allocations){const key=a.salesLineId+':'+a.unitPrice.toString();const row=grouped.get(key);if(row)row.quantity+=a.quantity;else grouped.set(key,{sku:a.salesLine.skuCode,name:a.salesLine.description,unit:a.salesLine.sku.unit,quantity:a.quantity,price:a.unitPrice});}
  const rows=[...grouped.values()];
  return {...base,kind:'shipment',number:shipment.number,date:(shipment.postedAt||shipment.createdAt).toISOString(),state:shipment.state,warehouse:shipment.warehouse.name,actor:shipment.actor.displayName||'員工',note:shipment.note,total:sum(rows.map(r=>r.price.mul(r.quantity))).toFixed(2),rows:rows.map(r=>({...r,price:r.price.toFixed(2),amount:r.price.mul(r.quantity).toFixed(2)}))};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,maxWait:20000,timeout:30000});
}
