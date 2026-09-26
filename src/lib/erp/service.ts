import bcrypt from 'bcryptjs';
import { Prisma, type User } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import prisma from '../prisma';
import { employeeEditError } from './employee-policy';
import { passwordSchema } from './password-policy';
import { allocateFifo } from './fifo';
import { rebuildPaymentShares } from './payment-shares';
export class ErpError extends Error {}
const id=z.string().min(1).max(100);
const text=z.string().trim().min(1).max(160);
const money=z.string().regex(/^\d{1,10}(\.\d{1,4})?$/,'金額最多四位小數');
const cents=z.string().regex(/^\d{1,10}(\.\d{1,2})?$/,'售價與收款最多兩位小數');
const qty=z.coerce.number().int().positive().max(1000000);
const note=z.string().trim().max(2000).default('');
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'日期無效').optional();
const currency=z.enum(['AUD','CNY']).default('AUD');
const fx=z.string().regex(/^\d{1,6}(\.\d{1,8})?$/).optional();
const businessDate=(v?:string)=>v?new Date(v+'T00:00:00Z'):new Date();
function exchange(c:string,v?:string){if(c==='AUD')return new Prisma.Decimal(1);if(!v||new Prisma.Decimal(v).lte(0))throw new ErpError('人民幣交易必須填寫大於零的匯率（1 CNY 等於多少 AUD）');return new Prisma.Decimal(v);}
const line=z.object({skuId:id,quantity:qty,price:money});
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('editSku'),id,expectedUpdatedAt:z.string().datetime(),name:text,groupName:z.string().trim().max(160),unit:z.string().trim().min(1).max(20),price:cents}),
 z.object({action:z.literal('deleteSku'),id,expectedUpdatedAt:z.string().datetime()}),
 z.object({action:z.literal('disableSku'),id,expectedUpdatedAt:z.string().datetime()}),
 z.object({action:z.literal('enableSku'),id,expectedUpdatedAt:z.string().datetime()}),
 z.object({action:z.literal('adjustBatchCost'),batchId:id,expectedVersion:z.coerce.number().int().nonnegative(),newCost:money,reason:text}),
 z.object({action:z.literal('sku'),code:text,name:text,price:cents,groupName:z.string().trim().max(160).default(''),unit:z.string().trim().min(1).max(20).default('件')}),
 z.object({action:z.literal('warehouse'),code:text,name:text}),
 z.object({action:z.literal('customer'),code:text,name:text,note}),
 z.object({action:z.literal('supplier'),code:text,name:text,note}),
 z.object({action:z.literal('receive'),supplierId:id,warehouseId:id,currency,fxToAud:fx,date:day,note,batchLabel:z.string().trim().max(160).default(''),lines:z.array(line).min(1).max(50)}),
 z.object({action:z.literal('sale'),customerId:id,currency,fxToAud:fx,date:day,note,lines:z.array(line.extend({price:cents})).min(1).max(50)}),
 z.object({action:z.literal('ship'),orderId:id,date:day,note,warehouseId:id,lines:z.array(z.object({lineId:id,quantity:qty})).min(1).max(50)}),
 z.object({action:z.literal('payment'),orderId:id,amount:cents,date:day,note}),
 z.object({action:z.literal('reverse'),kind:z.enum(['shipment','payment','receipt']),id,reason:text}),
 z.object({action:z.literal('employee'),email:z.string().trim().email().max(160),name:text,password:passwordSchema,role:z.enum(['MANAGER','WAREHOUSE','SALES','FINANCE'])}),
 z.object({action:z.literal('disableEmployee'),id}),
 z.object({action:z.literal('editEmployee'),id,expectedUpdatedAt:z.string().datetime(),email:z.string().trim().email().max(160),name:text,role:z.enum(['ADMIN','MANAGER','WAREHOUSE','SALES','FINANCE']),active:z.boolean()}),
]);
export function can(user:Pick<User,'role'|'employeeRole'|'active'>,action:string) {
 if(!user.active)return false;
 if(user.role==='ADMIN'||user.employeeRole==='MANAGER')return true;
 const permissions:Record<string,string[]>={WAREHOUSE:['ship'],SALES:['sale','customer'],FINANCE:['payment']};
 return !!user.employeeRole && !!permissions[user.employeeRole]?.includes(action);
}
export const seeMoney=(u:Pick<User,'role'|'employeeRole'|'active'>)=>can(u,'payment')||can(u,'receive');
export async function employee(userId:string){const u=await prisma.user.findUnique({where:{id:userId}});if(!u?.active||(!u.employeeRole&&u.role!=='ADMIN'))throw new ErpError('帳號未啟用或沒有 ERP 權限');return u;}
const number=(prefix:string)=>prefix+'-'+new Date().toISOString().slice(0,10).replaceAll('-','')+'-'+randomUUID().slice(0,8).toUpperCase();
const decimal=(v:string)=>new Prisma.Decimal(v);
export async function execute(userId:string,requestKey:string,input:unknown){
 if(!z.string().uuid().safeParse(requestKey).success)throw new ErpError('無效的操作識別碼');
 const parsed=schema.safeParse(input);if(!parsed.success)throw new ErpError('欄位不完整或格式錯誤：'+parsed.error.issues[0].message);
 const data=parsed.data;
 const fingerprint=createHash('sha256').update(JSON.stringify(data)).digest('hex');
 let passwordHash:string|undefined;
 if(data.action==='employee')passwordHash=await bcrypt.hash(data.password,12);
 for(let attempt=0;attempt<4;attempt++){
 try{return await prisma.$transaction(async tx=>{
  const user=await tx.user.findUnique({where:{id:userId}});
  if(!user||!can(user,data.action))throw new ErpError('沒有操作權限');
  const previous=await tx.auditEvent.findUnique({where:{id:requestKey}});
  if(previous){const meta=previous.after as {fingerprint?:string};if(previous.actorId!==userId||meta?.fingerprint!==fingerprint)throw new ErpError('重複請求內容不一致');return previous.entityId;}
  const event=await tx.auditEvent.create({data:{id:requestKey,actorId:userId,action:data.action,entityType:data.action,entityId:'pending',after:{fingerprint},reason:(data.action==='reverse'||data.action==='adjustBatchCost')?data.reason:null}});
  let result='';
  if(data.action==='sku'){result=(await tx.inventorySku.create({data:{code:data.code,name:data.name,salePrice:data.price,groupName:data.groupName,unit:data.unit}})).id;}
  if(data.action==='editSku'||data.action==='deleteSku'||data.action==='disableSku'||data.action==='enableSku'){
   const sku=await tx.inventorySku.findUnique({where:{id:data.id},include:{_count:{select:{batches:true,purchaseLines:true,salesLines:true}}}});
   if(!sku)throw new ErpError('商品不存在或已刪除，請重新整理');
   if(sku.updatedAt.toISOString()!==data.expectedUpdatedAt)throw new ErpError('商品已被更新，請重新整理後再操作');
   const before={code:sku.code,name:sku.name,groupName:sku.groupName,unit:sku.unit,price:sku.salePrice.toString(),active:sku.active};
   await tx.auditEvent.update({where:{id:event.id},data:{before}});
   if(data.action==='deleteSku'){
    if(sku._count.batches||sku._count.purchaseLines||sku._count.salesLines)throw new ErpError('商品已有進貨或訂單紀錄，不能刪除；請改用停用');
    await tx.inventorySku.delete({where:{id:sku.id}});
    await tx.auditEvent.update({where:{id:event.id},data:{after:{fingerprint,deleted:true,code:sku.code,name:sku.name}}});
   }else{
    if(data.action==='disableSku'){
     if(await tx.batchBalance.count({where:{batch:{skuId:sku.id},quantity:{gt:0}}}))throw new ErpError('商品仍有剩餘庫存，不能停用');
     const lines=await tx.salesLine.findMany({where:{skuId:sku.id,order:{state:'POSTED'}},include:{allocations:{where:{shipment:{state:'POSTED'}}}}});
     if(lines.some(l=>l.quantity>l.allocations.reduce((n,a)=>n+a.quantity,0)))throw new ErpError('商品仍有待出貨訂單，不能停用');
    }
    const changes=data.action==='editSku'?{name:data.name,groupName:data.groupName,unit:data.unit,salePrice:data.price}:{active:data.action==='enableSku'};
    const updated=await tx.inventorySku.update({where:{id:sku.id},data:changes});
    await tx.auditEvent.update({where:{id:event.id},data:{after:{fingerprint,code:updated.code,name:updated.name,groupName:updated.groupName,unit:updated.unit,price:updated.salePrice.toString(),active:updated.active}}});
   }
   result=sku.id;
  }
  if(data.action==='warehouse'||data.action==='customer'||data.action==='supplier'){
   const v={code:data.code,name:data.name,...(data.action==='warehouse'?{}:{note:data.note})};
   result=data.action==='warehouse'?(await tx.warehouse.create({data:v})).id:data.action==='customer'?(await tx.customer.create({data:v})).id:(await tx.supplier.create({data:v})).id;
  }
  if(data.action==='employee'){
   if(user.role!=='ADMIN'&&data.role==='MANAGER')throw new ErpError('只有系統管理員可以指派主管');
   result=(await tx.user.create({data:{email:data.email.toLowerCase(),displayName:data.name,passwordHash:passwordHash!,employeeRole:data.role,role:'BUYER'}})).id;
   await tx.auditEvent.update({where:{id:event.id},data:{after:{fingerprint,email:data.email.toLowerCase(),displayName:data.name,employeeRole:data.role,active:true}}});
  }
  if(data.action==='editEmployee'||data.action==='disableEmployee'){
   const target=await tx.user.findUnique({where:{id:data.id}});
   if(!target)throw new ErpError('員工不存在，請重新整理');
   const next=data.action==='editEmployee'?{role:data.role,active:data.active}:{role:target.role==='ADMIN'?'ADMIN':target.employeeRole||'',active:false};
   const policyError=employeeEditError(user,target,next);if(policyError)throw new ErpError(policyError);
   if(data.action==='editEmployee'&&target.updatedAt.toISOString()!==data.expectedUpdatedAt)throw new ErpError('員工資料已被更新，請重新整理後再編輯');
   const before={email:target.email,displayName:target.displayName,employeeRole:target.employeeRole,role:target.role,active:target.active};
   const changes=data.action==='editEmployee'?{email:data.email.toLowerCase(),displayName:data.name,employeeRole:target.role==='ADMIN'?target.employeeRole:data.role as 'MANAGER'|'WAREHOUSE'|'SALES'|'FINANCE',active:data.active}:{active:false};
   if(data.action==='editEmployee'&&await tx.user.findFirst({where:{email:{equals:data.email.toLowerCase(),mode:'insensitive'},id:{not:target.id}},select:{id:true}}))throw new ErpError('Email 已被其他帳號使用');
   const updated=await tx.user.update({where:{id:target.id},data:changes});
   const after={email:updated.email,displayName:updated.displayName,employeeRole:updated.employeeRole,role:updated.role,active:updated.active};
   const fields=Object.keys(before).filter(k=>before[k as keyof typeof before]!==after[k as keyof typeof after]);
   const labels:Record<string,string>={email:'Email',displayName:'姓名',employeeRole:'角色',role:'系統角色',active:'啟用狀態'};
   await tx.auditEvent.update({where:{id:event.id},data:{before,after:{fingerprint,...after},reason:fields.length?'修改欄位：'+fields.map(k=>labels[k]).join('、'):'資料未變更'}});
   result=target.id;
  }
  if(data.action==='receive'||data.action==='sale'){
   const rate=exchange(data.currency,data.fxToAud);
   const skus=await tx.inventorySku.findMany({where:{id:{in:data.lines.map(l=>l.skuId)},active:true}});
   if(data.lines.some(l=>!skus.some(s=>s.id===l.skuId)))throw new ErpError('商品不存在、停用或幣別不符');
   if(data.action==='sale'){
    if(!await tx.customer.findFirst({where:{id:data.customerId,active:true}}))throw new ErpError('客戶不存在或已停用');
    const order=await tx.salesOrder.create({data:{number:number('SO'),customerId:data.customerId,currency:data.currency,fxToAud:rate,orderedAt:businessDate(data.date),note:data.note,state:'POSTED',lines:{create:data.lines.map(l=>{const s=skus.find(s=>s.id===l.skuId)!;return {skuId:s.id,skuCode:s.code,description:s.name,quantity:l.quantity,unitPrice:l.price};})}}});result=order.id;
   }else{
    if(!await tx.supplier.findFirst({where:{id:data.supplierId,active:true}})||!await tx.warehouse.findFirst({where:{id:data.warehouseId,active:true}}))throw new ErpError('供應商或倉庫不存在／停用');
    const purchase=await tx.purchaseOrder.create({data:{number:number('PO'),supplierId:data.supplierId,currency:data.currency}});
    const receipt=await tx.purchaseReceipt.create({data:{number:number('IN'),requestKey,note:data.note,warehouseId:data.warehouseId,actorId:userId,state:'POSTED',postedAt:new Date()}});result=receipt.id;
    for(const l of data.lines){
     const pl=await tx.purchaseLine.create({data:{purchaseId:purchase.id,skuId:l.skuId,quantity:l.quantity,unitCost:l.price}});
     const batch=await tx.inventoryBatch.create({data:{batchNo:number('LOT'),skuId:l.skuId,unitCost:l.price,currency:data.currency,fxToAud:rate,unitCostAud:decimal(l.price).mul(rate),label:data.batchLabel,receivedAt:businessDate(data.date),balances:{create:{warehouseId:data.warehouseId,quantity:l.quantity}}}});
     const rl=await tx.receiptLine.create({data:{receiptId:receipt.id,purchaseLineId:pl.id,batchId:batch.id,quantity:l.quantity}});
     await tx.stockMovement.create({data:{batchId:batch.id,warehouseId:data.warehouseId,kind:'RECEIPT',quantityDelta:l.quantity,sourceType:'receipt',sourceId:receipt.id,sourceLineId:rl.id,eventId:event.id}});
    }
   }
  }
  if(data.action==='adjustBatchCost'){
   const batch=await tx.inventoryBatch.findUnique({where:{id:data.batchId},include:{receiptLine:{include:{receipt:true}},balances:{include:{warehouse:true}}}});
   if(!batch||batch.receiptLine?.receipt.state!=='POSTED')throw new ErpError('找不到有效入庫批次');
   if(batch.costVersion!==data.expectedVersion)throw new ErpError('批次成本已被更新，請重新整理後再操作');
   const quantity=batch.balances.reduce((v,b)=>v+b.quantity,0);
   if(quantity<=0)throw new ErpError('此批已無剩餘庫存，不能調整成本');
   if(!batch.fxToAud||!batch.unitCostAud)throw new ErpError('批次缺少原始匯率，請先補齊');
   const newCost=decimal(data.newCost),newCostAud=newCost.mul(batch.fxToAud);
   if(newCost.eq(batch.unitCost))throw new ErpError('新成本與目前成本相同');
   const version=batch.costVersion+1;
   const changed=await tx.inventoryBatch.updateMany({where:{id:batch.id,costVersion:data.expectedVersion},data:{unitCost:newCost,unitCostAud:newCostAud,costVersion:version}});
   if(changed.count!==1)throw new ErpError('批次成本已變動，請重新整理');
   await tx.batchCostAdjustment.create({data:{batchId:batch.id,eventId:event.id,version,oldCost:batch.unitCost,newCost,oldCostAud:batch.unitCostAud,newCostAud,quantity,warehouses:batch.balances.filter(b=>b.quantity>0).map(b=>({id:b.warehouseId,name:b.warehouse.name,quantity:b.quantity}))}});
   result=batch.id;
  }
  if(data.action==='ship'){

   if(new Set(data.lines.map(l=>l.lineId)).size!==data.lines.length)throw new ErpError('出貨明細重複');
   const order=await tx.salesOrder.findUnique({where:{id:data.orderId},include:{lines:{include:{allocations:{where:{shipment:{state:'POSTED'}}}}}}});
   if(!order||order.state!=='POSTED')throw new ErpError('找不到有效訂單');
   if(!await tx.warehouse.findFirst({where:{id:data.warehouseId,active:true}}))throw new ErpError('倉庫不存在或已停用');
   const shipment=await tx.shipment.create({data:{number:number('OUT'),requestKey,note:data.note,orderId:order.id,warehouseId:data.warehouseId,actorId:userId,state:'POSTED',postedAt:businessDate(data.date)}});result=shipment.id;
   for(const l of data.lines){
    const ol=order.lines.find(x=>x.id===l.lineId);
    if(!ol||l.quantity>ol.quantity-ol.allocations.reduce((s,a)=>s+a.quantity,0))throw new ErpError('出貨數量超過訂單未出貨量');
    const balances=await tx.batchBalance.findMany({where:{warehouseId:data.warehouseId,quantity:{gt:0},batch:{skuId:ol.skuId}},include:{batch:true}});
    let allocation;try{allocation=allocateFifo(balances.map(b=>({id:b.batchId,quantity:b.quantity,unitCost:b.batch.unitCost.toString(),receivedAt:b.batch.receivedAt})),l.quantity);}catch{throw new ErpError('倉庫庫存不足：'+ol.skuCode);}
    for(const a of allocation.allocations){
     const updated=await tx.batchBalance.updateMany({where:{batchId:a.batchId,warehouseId:data.warehouseId,quantity:{gte:a.quantity}},data:{quantity:{decrement:a.quantity}}});
     if(updated.count!==1)throw new ErpError('庫存已變動，請重新操作');
     const source=balances.find(b=>b.batchId===a.batchId)!.batch;
     if(!source.unitCostAud||!order.fxToAud)throw new ErpError('舊批次或訂單缺少澳幣換算成本，請先補齊資料');
     const row=await tx.shipmentAllocation.create({data:{shipmentId:shipment.id,salesLineId:ol.id,batchId:a.batchId,quantity:a.quantity,costVersion:source.costVersion,unitCost:a.unitCost,unitCostAud:source.unitCostAud,unitPrice:ol.unitPrice}});
     await tx.stockMovement.create({data:{batchId:a.batchId,warehouseId:data.warehouseId,kind:'SHIPMENT',quantityDelta:-a.quantity,sourceType:'shipment',sourceId:shipment.id,sourceLineId:row.id,eventId:event.id}});
    }
   }
  }
  if(data.action==='ship')await rebuildPaymentShares(tx,data.orderId);
  if(data.action==='payment'){
   const order=await tx.salesOrder.findUnique({where:{id:data.orderId},include:{lines:true,payments:{where:{payment:{state:'POSTED'}}}}});
   if(!order||order.state!=='POSTED')throw new ErpError('找不到有效訂單');
   const total=order.lines.reduce((s,l)=>s.add(l.unitPrice.mul(l.quantity)),decimal('0'));
   const paid=order.payments.reduce((s,p)=>s.add(p.amount),decimal('0'));
   const amount=decimal(data.amount);if(amount.lte(0)||amount.gt(total.sub(paid)))throw new ErpError('收款必須大於零，且不可超過未收款');
   result=(await tx.customerPayment.create({data:{number:number('PAY'),requestKey,customerId:order.customerId,actorId:userId,amount,currency:order.currency,state:'POSTED',receivedAt:businessDate(data.date),note:data.note,allocations:{create:{orderId:order.id,amount}}}})).id;
  }
  if(data.action==='payment')await rebuildPaymentShares(tx,data.orderId);
  if(data.action==='reverse'){
   if(data.kind==='payment'){
    const p=await tx.customerPayment.findUnique({where:{id:data.id}});if(!p||p.state!=='POSTED')throw new ErpError('收款不存在或已沖銷');
    await tx.customerPayment.update({where:{id:p.id},data:{state:'REVERSED'}});result=p.id;
    for(const link of await tx.paymentAllocation.findMany({where:{paymentId:p.id}}))await rebuildPaymentShares(tx,link.orderId);
   }else{
    const doc=data.kind==='shipment'?await tx.shipment.findUnique({where:{id:data.id}}):await tx.purchaseReceipt.findUnique({where:{id:data.id}});
    if(!doc||doc.state!=='POSTED')throw new ErpError('單據不存在或已沖銷');
    const movements=await tx.stockMovement.findMany({where:{sourceType:data.kind,sourceId:doc.id,kind:data.kind==='shipment'?'SHIPMENT':'RECEIPT'}});
    for(const m of movements){
     if(data.kind==='shipment'){
      const batch=await tx.inventoryBatch.findUniqueOrThrow({where:{id:m.batchId},include:{sku:true}});
      if(!batch.sku.active)throw new ErpError('商品已停用，請先重新啟用商品再沖銷出貨');
     }
     if(data.kind==='receipt'&&await tx.batchCostAdjustment.count({where:{batchId:m.batchId}}))throw new ErpError('此批已有成本調整紀錄，不能沖銷入庫');
     if(data.kind==='receipt'&&await tx.stockMovement.count({where:{batchId:m.batchId,kind:{not:'RECEIPT'}}}))throw new ErpError('此批次已有後續異動，不能沖銷入庫');
     const changed=await tx.batchBalance.updateMany({where:{batchId:m.batchId,warehouseId:m.warehouseId,...(m.quantityDelta>0?{quantity:{gte:m.quantityDelta}}:{})},data:{quantity:{decrement:m.quantityDelta}}});
     if(changed.count!==1)throw new ErpError('剩餘庫存不足以沖銷');
     await tx.stockMovement.create({data:{batchId:m.batchId,warehouseId:m.warehouseId,kind:'REVERSAL',quantityDelta:-m.quantityDelta,sourceType:data.kind,sourceId:doc.id,sourceLineId:m.sourceLineId,eventId:event.id,reversalOfId:m.id}});
    }
    if(data.kind==='shipment')await tx.shipment.update({where:{id:doc.id},data:{state:'REVERSED'}});else await tx.purchaseReceipt.update({where:{id:doc.id},data:{state:'REVERSED'}});result=doc.id;
    if(data.kind==='shipment'){const sh=await tx.shipment.findUniqueOrThrow({where:{id:doc.id}});await rebuildPaymentShares(tx,sh.orderId);}
   }
  }
  await tx.auditEvent.update({where:{id:event.id},data:{entityId:result}});
  return result;
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:20000,timeout:30000});}
 catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError && (e.code==='P2034'||e.code==='P2002')&&attempt<3)continue;throw e;}
 }
 throw new ErpError('操作衝突，請重試');
}
