import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../prisma';
import { ErpError } from './service';
import { passwordSchema } from './password-policy';
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('changePassword'),currentPassword:z.string().min(1).max(200),newPassword:passwordSchema,confirmPassword:z.string()}),
 z.object({action:z.literal('resetEmployeePassword'),employeeId:z.string().min(1).max(100),currentPassword:z.string().min(1).max(200),newPassword:passwordSchema,confirmPassword:z.string()}),
]).refine(v=>v.newPassword===v.confirmPassword,{message:'兩次輸入的新密碼不一致',path:['confirmPassword']});
export async function updatePassword(actorId:string,input:unknown){
 const parsed=schema.safeParse(input);if(!parsed.success)throw new ErpError(parsed.error.issues[0].message);
 const data=parsed.data;
 const actor=await prisma.user.findUnique({where:{id:actorId}});
 if(!actor?.active||(actor.role!=='ADMIN'&&!actor.employeeRole))throw new ErpError('帳號無效或已停用');
 if(data.action==='resetEmployeePassword'&&actor.role!=='ADMIN')throw new ErpError('只有系統管理員可以重設員工密碼');
 if(!await bcrypt.compare(data.currentPassword,actor.passwordHash))throw new ErpError('目前密碼不正確');
 const targetId=data.action==='changePassword'?actorId:data.employeeId;
 const target=targetId===actorId?actor:await prisma.user.findUnique({where:{id:targetId}});
 if(!target?.active)throw new ErpError('員工不存在或已停用');
 if(data.action==='resetEmployeePassword'&&(target.id===actorId||target.role==='ADMIN'||!target.employeeRole))throw new ErpError('只能重設其他員工帳號；自己的密碼請使用修改密碼功能');
 if(await bcrypt.compare(data.newPassword,target.passwordHash))throw new ErpError('新密碼不可與原密碼相同');
 const passwordHash=await bcrypt.hash(data.newPassword,12);
 await prisma.$transaction(async tx=>{
  const latestActor=await tx.user.findUnique({where:{id:actorId}});
  if(!latestActor?.active||latestActor.passwordHash!==actor.passwordHash||(data.action==='resetEmployeePassword'&&latestActor.role!=='ADMIN'))throw new ErpError('帳號狀態已變更，請重新登入');
  const updated=await tx.user.updateMany({where:{id:target.id,passwordHash:target.passwordHash,active:true,...(data.action==='resetEmployeePassword'?{role:{not:'ADMIN'},employeeRole:{not:null}}:{})},data:{passwordHash}});
  if(updated.count!==1)throw new ErpError('帳號已變更，請重新整理後再試');
  // Record who changed which account, never passwords, hashes or password-derived fingerprints.
  await tx.auditEvent.create({data:{actorId,action:data.action,entityType:'user',entityId:target.id,after:{passwordChanged:true}}});
 },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:20000,timeout:30000});
 return {reauthenticate:data.action==='changePassword'};
}
