import { Prisma } from '@prisma/client';
import prisma from '../prisma';
import { employee, can, seeMoney } from './service';
const zero=()=>new Prisma.Decimal(0);
const sum=(values:Prisma.Decimal[])=>values.reduce((a,b)=>a.add(b),zero());
export async function snapshot(userId:string){
 const user=await employee(userId);const financial=seeMoney(user);const manager=can(user,'employee');
 return prisma.$transaction(async tx=>{
 const [skus,warehouses,customers,suppliers,balances,orders,receipts,events,employees,batches]=await Promise.all([
  tx.inventorySku.findMany({include:{_count:{select:{batches:true,purchaseLines:true,salesLines:true}}},orderBy:{code:'asc'}}),tx.warehouse.findMany({orderBy:{code:'asc'}}),
  tx.customer.findMany({orderBy:{code:'asc'}}),tx.supplier.findMany({orderBy:{code:'asc'}}),
  tx.batchBalance.findMany({relationLoadStrategy:'join',include:{batch:{include:{sku:true}},warehouse:true},orderBy:{batch:{receivedAt:'asc'}}}),
  tx.salesOrder.findMany({relationLoadStrategy:'join',include:{customer:true,lines:true,payments:{include:{payment:{include:{actor:{select:{displayName:true,email:true}}}}}},shipments:{include:{actor:{select:{displayName:true,email:true}},warehouse:true,allocations:{include:{batch:true,salesLine:true,paymentShares:true}}}}},orderBy:{createdAt:'desc'}}),
  financial?tx.purchaseReceipt.findMany({relationLoadStrategy:'join',include:{actor:{select:{displayName:true,email:true}},warehouse:true,lines:{include:{batch:{include:{sku:true}},purchaseLine:{include:{purchase:{include:{supplier:true}}}}}}},orderBy:{createdAt:'desc'},take:200}):[],
  manager?tx.auditEvent.findMany({relationLoadStrategy:'join',include:{actor:{select:{displayName:true,email:true}}},orderBy:{createdAt:'desc'},take:200}):[],
  manager?tx.user.findMany({where:{OR:[{role:'ADMIN'},{employeeRole:{not:null}}]},select:{id:true,email:true,displayName:true,employeeRole:true,role:true,active:true}}):[],
  financial?tx.inventoryBatch.findMany({relationLoadStrategy:'join',include:{costAdjustments:{include:{event:{include:{actor:{select:{displayName:true,email:true}}}}},orderBy:{version:'desc'}},sku:true,receiptLine:{include:{receipt:{include:{warehouse:true}},purchaseLine:{include:{purchase:{include:{supplier:true}}}}}},balances:{include:{warehouse:true}}},orderBy:[{receivedAt:'desc'},{id:'asc'}]}):[],
 ]);
 const sales=orders.map(o=>{
  const total=sum(o.lines.map(l=>l.unitPrice.mul(l.quantity)));
  const paid=sum(o.payments.filter(p=>p.payment.state==='POSTED').map(p=>p.amount));
  const allocations=o.shipments.filter(s=>s.state==='POSTED').flatMap(s=>s.allocations);
  const known=!!o.fxToAud&&allocations.every(a=>a.unitCostAud!==null);
  const cost=sum(allocations.map(a=>(a.unitCostAud||zero()).mul(a.quantity)));
  const revenue=sum(allocations.map(a=>a.unitPrice.mul(a.quantity))).mul(o.fxToAud||0);
  const assigned=sum(allocations.flatMap(a=>a.paymentShares.map(p=>p.amount)));
  return {id:o.id,number:o.number,customerId:o.customerId,customer:o.customer.name,currency:o.currency,fxToAud:o.fxToAud?.toString()||null,note:o.note,createdAt:o.createdAt,orderedAt:o.orderedAt,total:total.toFixed(2),paid:financial?paid.toFixed(2):null,due:financial?total.sub(paid).toFixed(2):null,advance:financial?paid.sub(assigned).toFixed(2):null,cost:financial&&known?cost.toFixed(2):null,profit:financial&&known?revenue.sub(cost).toFixed(2):null,
   lines:o.lines.map(l=>({id:l.id,name:l.description,sku:l.skuCode,quantity:l.quantity,price:l.unitPrice.toString(),remaining:l.quantity-allocations.filter(a=>a.salesLineId===l.id).reduce((s,a)=>s+a.quantity,0)})),
   shipments:o.shipments.map(s=>({id:s.id,number:s.number,state:s.state,time:s.postedAt,note:s.note,warehouse:s.warehouse.name,actor:s.actor.displayName||s.actor.email,allocations:s.allocations.map(a=>({sku:a.salesLine.skuCode,batch:a.batch.batchNo,quantity:a.quantity,costVersion:a.costVersion,cost:financial?a.unitCostAud?.toString()||null:null}))})),
   payments:financial?o.payments.map(p=>({id:p.payment.id,number:p.payment.number,amount:p.amount.toFixed(2),state:p.payment.state,note:p.payment.note,actor:p.payment.actor.displayName||p.payment.actor.email,time:p.payment.receivedAt})):[],
  };
 });
 const summaries=customers.flatMap(c=>[...new Set(orders.filter(o=>o.customerId===c.id).map(o=>o.currency))].map(currency=>{
  const os=sales.filter(o=>o.customerId===c.id&&o.currency===currency);const total=sum(os.map(o=>new Prisma.Decimal(o.total)));const paid=sum(os.map(o=>new Prisma.Decimal(o.paid||0)));return {id:c.id+':'+currency,name:c.name,currency,total:total.toFixed(2),paid:paid.toFixed(2),due:total.sub(paid).toFixed(2)};
 }));
 const hasUnknown=orders.some(o=>!o.fxToAud)||sales.some(o=>o.cost===null);
 const allDue=sum(sales.map(o=>new Prisma.Decimal(o.due||0).mul(o.fxToAud||0)));
 const allProfit=sum(sales.map(o=>new Prisma.Decimal(o.profit||0)));
 const batchReports=batches.filter(b=>b.receiptLine?.receipt.state==='POSTED').map(b=>{
  const received=b.receiptLine!.quantity;
  const rows=orders.flatMap(o=>o.shipments.filter(s=>s.state==='POSTED').flatMap(s=>s.allocations.filter(a=>a.batchId===b.id).map(a=>{
   const due=a.unitPrice.mul(a.quantity);const paid=sum(a.paymentShares.map(p=>p.amount));
   return {id:a.id,order:o.number,customer:o.customer.name,date:s.postedAt,actor:s.actor.displayName||s.actor.email,warehouse:s.warehouse.name,quantity:a.quantity,price:a.unitPrice.toString(),currency:o.currency,fx:o.fxToAud,lockedCost:a.unitCostAud,costVersion:a.costVersion,receivable:due,paid,due:due.sub(paid)};
  })));
  const known=rows.every(r=>r.fx!==null&&r.lockedCost!==null);const shipped=rows.reduce((s,r)=>s+r.quantity,0);
  const revenue=sum(rows.map(r=>r.receivable.mul(r.fx||0)));const paid=sum(rows.map(r=>r.paid.mul(r.fx||0)));const cost=sum(rows.map(r=>(r.lockedCost||zero()).mul(r.quantity)));
  return {id:b.id,batch:b.batchNo,label:b.label,sku:b.sku.code,name:b.sku.name,unit:b.sku.unit,date:b.receivedAt,supplier:b.receiptLine!.purchaseLine.purchase.supplier.name,warehouse:b.receiptLine!.receipt.warehouse.name,note:b.receiptLine!.receipt.note,currency:b.currency,fxToAud:b.fxToAud?.toString()||null,unitCost:b.unitCost.toString(),originalCost:b.receiptLine!.purchaseLine.unitCost.toString(),costVersion:b.costVersion,remainingValue:b.unitCost.mul(b.balances.reduce((s,v)=>s+v.quantity,0)).toFixed(2),adjustments:b.costAdjustments.map(a=>({id:a.id,version:a.version,oldCost:a.oldCost.toString(),newCost:a.newCost.toString(),quantity:a.quantity,valueChangeAud:a.newCostAud.sub(a.oldCostAud).mul(a.quantity).toFixed(2),warehouses:a.warehouses,date:a.createdAt,actor:a.event.actor.displayName||a.event.actor.email,reason:a.event.reason})),totalCost:b.receiptLine!.purchaseLine.unitCost.mul(received).toFixed(2),received,shipped,remaining:b.balances.reduce((s,v)=>s+v.quantity,0),warehouses:b.balances.map(v=>({name:v.warehouse.name,quantity:v.quantity})),revenue:known?revenue.toFixed(2):null,paid:known?paid.toFixed(2):null,due:known?revenue.sub(paid).toFixed(2):null,cost:known?cost.toFixed(2):null,profit:known?revenue.sub(cost).toFixed(2):null,rows:rows.map(r=>({...r,fx:undefined,lockedCost:r.lockedCost?.toString()??null,receivable:r.receivable.toFixed(2),paid:r.paid.toFixed(2),due:r.due.toFixed(2)}))};
 });
 const inventory=skus.filter(s=>s.active).map(s=>({id:s.id,code:s.code,name:s.name,group:s.groupName,unit:s.unit,warehouses:warehouses.map(w=>({id:w.id,name:w.name,quantity:balances.filter(b=>b.batch.skuId===s.id&&b.warehouseId===w.id).reduce((v,b)=>v+b.quantity,0)})),total:balances.filter(b=>b.batch.skuId===s.id).reduce((v,b)=>v+b.quantity,0)}));
 const groups=[...new Set(inventory.filter(s=>s.group).map(s=>JSON.stringify([s.group,s.unit])))].map(key=>{const [group,unit]=JSON.parse(key);const items=inventory.filter(s=>s.group===group&&s.unit===unit);return {id:key,name:group,unit,total:items.reduce((v,s)=>v+s.total,0),warehouses:warehouses.map(w=>({id:w.id,name:w.name,quantity:items.reduce((v,s)=>v+(s.warehouses.find(x=>x.id===w.id)?.quantity||0),0)}))};});
 return JSON.parse(JSON.stringify({inventory,groups,batches:batchReports,customerSummaries:financial?summaries:[],totals:{due:financial&&!hasUnknown?allDue.toFixed(2):null,profit:financial&&!hasUnknown?allProfit.toFixed(2):null},user:{id:user.id,email:user.email,admin:user.role==='ADMIN',name:user.displayName||user.email,manager,financial,permissions:['sku','warehouse','customer','supplier','receive','sale','ship','payment','reverse','employee','adjustBatchCost','editSku','deleteSku','disableSku','enableSku'].filter(a=>can(user,a))},productCatalog:skus.map(s=>({id:s.id,code:s.code,name:s.name,groupName:s.groupName,unit:s.unit,price:s.salePrice.toString(),active:s.active,updatedAt:s.updatedAt,hasHistory:!!(s._count.batches||s._count.purchaseLines||s._count.salesLines),stock:balances.filter(b=>b.batch.skuId===s.id).reduce((v,b)=>v+b.quantity,0),pending:orders.filter(o=>o.state==='POSTED').flatMap(o=>o.lines.filter(l=>l.skuId===s.id).map(l=>Math.max(0,l.quantity-o.shipments.filter(sh=>sh.state==='POSTED').flatMap(sh=>sh.allocations.filter(a=>a.salesLineId===l.id)).reduce((n,a)=>n+a.quantity,0)))).reduce((n,q)=>n+q,0)})),skus:skus.filter(s=>s.active).map(s=>({id:s.id,code:s.code,name:s.name,group:s.groupName,unit:s.unit,price:s.salePrice.toString()})),warehouses,customers,suppliers,balances:balances.map(b=>({sku:b.batch.sku.code,name:b.batch.sku.name,warehouse:b.warehouse.name,batch:b.batch.batchNo,quantity:b.quantity,currency:b.batch.currency,cost:financial?b.batch.unitCost.toString():null,receivedAt:b.batch.receivedAt})),orders:sales,receipts:receipts.map(r=>({id:r.id,number:r.number,state:r.state,note:r.note,time:r.postedAt,warehouse:r.warehouse.name,actor:r.actor.displayName||r.actor.email,lines:r.lines.map(l=>({sku:l.batch.sku.code,batch:l.batch.batchNo,label:l.batch.label,date:l.batch.receivedAt,currency:l.batch.currency,quantity:l.quantity,cost:l.purchaseLine.unitCost.toString(),supplier:l.purchaseLine.purchase.supplier.name}))})),events:events.map(e=>({id:e.id,action:e.action,entityId:e.entityId,reason:e.reason,time:e.createdAt,actor:e.actor.displayName||e.actor.email})),employees}));
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,maxWait:20000,timeout:30000});
}
