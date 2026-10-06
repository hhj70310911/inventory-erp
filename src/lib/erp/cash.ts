import {Prisma, type User} from '@prisma/client';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import prisma from '../prisma';
import {ErpError} from './service';
import {dailyProfit} from './daily-profit';
export const cashAllowed=(u:Pick<User,'active'|'role'|'employeeRole'|'cashView'|'cashEdit'>,edit=false)=>u.active&&(u.role==='ADMIN'||u.employeeRole==='MANAGER'||(edit?u.cashEdit:u.cashView||u.cashEdit));
const text=z.string().trim().min(1).max(160);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v,'日期無效');
const fields={date,kind:z.enum(['EXPENSE','INCOME','CAPITAL_IN','CAPITAL_OUT']),category:text,amount:z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).refine(v=>new Prisma.Decimal(v).gt(0),'金額須大於零'),currency:z.enum(['AUD','CNY']),fxToAud:z.string().regex(/^\d{1,6}(\.\d{1,8})?$/),account:text,counterparty:z.string().trim().max(160),note:z.string().trim().max(2000)};
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('cashCreate'),...fields}),
 z.object({action:z.literal('cashEdit'),id:text,version:z.number().int().nonnegative(),reason:text,...fields}),
 z.object({action:z.literal('cashVoid'),id:text,version:z.number().int().nonnegative(),reason:text}),
 z.object({action:z.literal('cashPermission'),id:text,cashView:z.boolean(),cashEdit:z.boolean(),expectedUpdatedAt:z.string().datetime()}),
]);
const auditValue=(v:unknown)=>JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
export async function cashExecute(userId:string,key:string,input:unknown){
 if(!z.string().uuid().safeParse(key).success)throw new ErpError('操作識別碼無效');
 const p=schema.safeParse(input);if(!p.success)throw new ErpError('請檢查日期、金額與必填欄位：'+p.error.issues[0].message);
 const d=p.data;const fingerprint=createHash('sha256').update(JSON.stringify(d)).digest('hex');
 for(let attempt=0;attempt<4;attempt++)try{return await prisma.$transaction(async tx=>{
  const u=await tx.user.findUnique({where:{id:userId}});
  if(!u||!u.active||(d.action==='cashPermission'?u.role!=='ADMIN':!cashAllowed(u,true)))throw new ErpError('沒有收支操作權限');
  const previous=await tx.auditEvent.findUnique({where:{id:key}});
  if(previous){if(previous.actorId!==userId||(previous.after as {fingerprint?:string})?.fingerprint!==fingerprint)throw new ErpError('重複請求內容不一致');return previous.entityId;}
  let before:unknown=null,after:unknown=null,result='';
  if(d.action==='cashPermission'){
   const target=await tx.user.findUnique({where:{id:d.id}});
   if(!target||target.role==='ADMIN'||target.employeeRole==='MANAGER'||!target.employeeRole)throw new ErpError('管理員與主管已有完整權限；僅可分配一般員工權限');
   if(target.updatedAt.toISOString()!==d.expectedUpdatedAt)throw new ErpError('員工已被更新，請重新整理');
   before={cashView:target.cashView,cashEdit:target.cashEdit};
   after={cashView:d.cashView||d.cashEdit,cashEdit:d.cashEdit};
   await tx.user.update({where:{id:d.id},data:{cashView:d.cashView||d.cashEdit,cashEdit:d.cashEdit}});result=d.id;
  }else{
   if(d.action!=='cashCreate'){
    const old=await tx.cashEntry.findUnique({where:{id:d.id}});
    if(!old||old.voided||old.version!==d.version)throw new ErpError('收支已修改或作廢，請重新整理');
    before=old;
   }
   if(d.action==='cashVoid')after=await tx.cashEntry.update({where:{id:d.id},data:{voided:true,version:{increment:1}}});
   else{
    const rate=d.currency==='AUD'?new Prisma.Decimal(1):new Prisma.Decimal(d.fxToAud);
    if(rate.lte(0))throw new ErpError('匯率須大於零（1 CNY 等於多少 AUD）');
    const amount=new Prisma.Decimal(d.amount);
    const values={date:new Date(d.date+'T00:00:00Z'),kind:d.kind,category:d.category,amount,currency:d.currency,fxToAud:rate,amountAud:amount.mul(rate),account:d.account,counterparty:d.counterparty,note:d.note};
    after=d.action==='cashCreate'?await tx.cashEntry.create({data:{...values,actorId:userId}}):await tx.cashEntry.update({where:{id:d.id},data:{...values,version:{increment:1}}});
   }
   result=(after as {id:string}).id;
  }
  await tx.auditEvent.create({data:{id:key,actorId:userId,action:d.action,entityType:d.action==='cashPermission'?'cashPermission':'cashEntry',entityId:result,before:before?auditValue(before):undefined,after:{fingerprint,value:auditValue(after)},reason:'reason' in d?d.reason:null}});
  return result;
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:20000,timeout:30000});}
 catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&(e.code==='P2034'||e.code==='P2002')&&attempt<3)continue;throw e;}
 throw new ErpError('請重新整理後再試');
}
export async function cashRead(userId:string,month:string,summaryOnly=false){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw new ErpError('月份格式錯誤');
 const start=new Date(month+'-01T00:00:00Z');const end=new Date(start);end.setUTCMonth(end.getUTCMonth()+1);
 return prisma.$transaction(async tx=>{
 const u=await tx.user.findUnique({where:{id:userId}});if(!u||!cashAllowed(u))throw new ErpError('沒有查看收支權限');
 const entries=await tx.cashEntry.findMany({where:{date:{gte:start,lt:end}},include:{actor:{select:{displayName:true,email:true}}},orderBy:[{date:'desc'},{createdAt:'desc'}]});
 const orders=await tx.salesOrder.findMany({where:{state:'POSTED',shipments:{some:{state:'POSTED',postedAt:{gte:start,lt:end}}}},select:{state:true,orderedAt:true,fxToAud:true,shipments:{where:{state:'POSTED',postedAt:{gte:start,lt:end}},select:{state:true,postedAt:true,allocations:{select:{quantity:true,unitPrice:true,unitCostAud:true}}}}}});
 const days=dailyProfit(orders).filter(d=>d.date.startsWith(month));
 const gross=days.some(d=>d.profit===null)?null:days.reduce((n,d)=>n.add(d.profit!),new Prisma.Decimal(0));
 const sum=(kind:string)=>entries.filter(e=>!e.voided&&e.kind===kind).reduce((n,e)=>n.add(e.amountAud),new Prisma.Decimal(0));
 const expense=sum('EXPENSE'),income=sum('INCOME');
 const summary={month,gross:gross?.toFixed(2)??null,expense:expense.toFixed(2),income:income.toFixed(2),profit:gross?.add(income).sub(expense).toFixed(2)??null,capitalIn:sum('CAPITAL_IN').toFixed(2),capitalOut:sum('CAPITAL_OUT').toFixed(2)};
 if(summaryOnly)return {summary};
 const employees=u.role==='ADMIN'?await tx.user.findMany({where:{employeeRole:{not:null},role:{not:'ADMIN'}},select:{id:true,displayName:true,email:true,employeeRole:true,cashView:true,cashEdit:true,updatedAt:true,active:true},orderBy:{email:'asc'}}):[];
 const history=await tx.auditEvent.findMany({where:{entityType:'cashEntry',entityId:{in:entries.map(e=>e.id)}},include:{actor:{select:{displayName:true,email:true}}},orderBy:{createdAt:'desc'}});
 return JSON.parse(JSON.stringify({summary,edit:cashAllowed(u,true),admin:u.role==='ADMIN',employees,entries:entries.map(e=>({...e,actor:e.actor.displayName||e.actor.email,date:e.date.toISOString().slice(0,10),history:history.filter(h=>h.entityId===e.id).map(h=>({id:h.id,action:h.action,reason:h.reason,time:h.createdAt,actor:h.actor.displayName||h.actor.email,before:h.before,after:(h.after as {value?:unknown})?.value}))}))}));
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,maxWait:20000,timeout:30000});
}
