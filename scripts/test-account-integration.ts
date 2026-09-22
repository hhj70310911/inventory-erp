import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync, spawn } from 'node:child_process';
import { loadEnvConfig } from '@next/env';
import bcrypt from 'bcryptjs';
loadEnvConfig(process.cwd(),true);
async function main(){
 if(!['development','test'].includes(process.env.ERP_ENVIRONMENT||''))throw Error('Test database required');
 const url=new URL(process.env.DATABASE_URL!);if(url.host+url.pathname!==process.env.ERP_DATABASE_TARGET)throw Error('Target mismatch');
 const schema='erp_test_'+randomUUID().replaceAll('-','');url.searchParams.set('schema',schema);url.searchParams.set('connect_timeout','30');process.env.DATABASE_URL=url.toString();

 const {default:db}=await import('../src/lib/prisma');let server:ReturnType<typeof spawn>|undefined;
 try{
 const migrate=spawnSync(process.execPath,['scripts/database-command.cjs','migrate-deploy'],{env:process.env,encoding:'utf8'});if(migrate.status!==0)throw Error('Isolated migration failed: '+migrate.stdout+' '+migrate.stderr);
 const {updatePassword}=await import('../src/lib/erp/account');const {credentialStamp,matchesCredential}=await import('../src/lib/erp/credential-session');const {execute}=await import('../src/lib/erp/service');
 const {passwordSchema}=await import('../src/lib/erp/password-policy');assert.ok(passwordSchema.safeParse('12345678').success);assert.ok(!passwordSchema.safeParse('密'.repeat(25)).success);
 const old='Old12345',next='New12345',reset='Reset123';const passwordHash=await bcrypt.hash(old,12);
 const admin=await db.user.create({data:{email:'admin@account-test.invalid',passwordHash,role:'ADMIN'}});
 const employee=await db.user.create({data:{email:'employee@account-test.invalid',passwordHash,role:'BUYER',employeeRole:'WAREHOUSE'}});
 const manager=await db.user.create({data:{email:'manager@account-test.invalid',passwordHash,role:'BUYER',employeeRole:'MANAGER'}});
 if(process.env.ERP_ACCOUNT_BROWSER_ONLY!=='1'){
 const change={action:'changePassword',currentPassword:old,newPassword:next,confirmPassword:next};
 await assert.rejects(updatePassword(employee.id,{...change,currentPassword:'wrong'}));
 await assert.rejects(updatePassword(employee.id,{...change,newPassword:'1234567',confirmPassword:'1234567'}));
 await assert.rejects(updatePassword(employee.id,{...change,confirmPassword:'mismatch'}));
 const stamp=credentialStamp(passwordHash);await updatePassword(employee.id,change);
 let updated=await db.user.findUniqueOrThrow({where:{id:employee.id}});assert.ok(await bcrypt.compare(next,updated.passwordHash));assert.ok(!await bcrypt.compare(old,updated.passwordHash));assert.ok(!matchesCredential(stamp,updated.passwordHash));assert.ok(matchesCredential(credentialStamp(updated.passwordHash),updated.passwordHash));assert.ok(!matchesCredential(undefined,updated.passwordHash));
 const resetInput={action:'resetEmployeePassword',employeeId:employee.id,currentPassword:old,newPassword:reset,confirmPassword:reset};
 await assert.rejects(updatePassword(manager.id,resetInput));await assert.rejects(updatePassword(employee.id,{...resetInput,currentPassword:next}));await assert.rejects(updatePassword(admin.id,{...resetInput,employeeId:admin.id}));await assert.rejects(updatePassword(admin.id,{...resetInput,currentPassword:'wrong'}));
 await updatePassword(admin.id,resetInput);updated=await db.user.findUniqueOrThrow({where:{id:employee.id}});assert.ok(await bcrypt.compare(reset,updated.passwordHash));
 await db.user.update({where:{id:employee.id},data:{active:false}});await assert.rejects(updatePassword(employee.id,{...change,currentPassword:reset}));await assert.rejects(updatePassword(admin.id,resetInput));await db.user.update({where:{id:employee.id},data:{active:true}});
 const events=await db.auditEvent.findMany();assert.equal(events.length,2);for(const e of events)assert.deepEqual(e.after,{passwordChanged:true});
 await execute(admin.id,randomUUID(),{action:'employee',email:'eight@account-test.invalid',name:'Eight',password:'12345678',role:'SALES'});
 await assert.rejects(execute(admin.id,randomUUID(),{action:'employee',email:'seven@account-test.invalid',name:'Seven',password:'1234567',role:'SALES'}));
 console.log('PASS: eight-character creation/change, old-password verification, confirmation, admin-only reset, disabled accounts, invalidated credentials and redacted audit.');
 }
 await db.user.update({where:{id:employee.id},data:{passwordHash:await bcrypt.hash(reset,12)}});
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3101'],{env:{...process.env,NEXTAUTH_URL:'http://127.0.0.1:3101',AUTH_URL:'http://127.0.0.1:3101'},stdio:'ignore'});
 await new Promise<void>((resolve,reject)=>{const test=spawn(process.execPath,['scripts/test-account-browser.cjs'],{env:process.env,stdio:'inherit'});test.on('exit',code=>code===0?resolve():reject(Error('Browser account test failed')));test.on('error',reject)});
 }finally{
 if(server){server.kill();await new Promise(r=>setTimeout(r,1000));}
 if(!/^erp_test_[a-f0-9]{32}$/.test(schema))throw Error('Invalid cleanup schema');await db.$executeRawUnsafe('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE');await db.$disconnect();console.log('Account test schema removed.');
 }
}
main().catch(e=>{let m=String(e.stack||e);const u=new URL(process.env.DATABASE_URL!);for(const v of [process.env.DATABASE_URL,u.hostname,u.password,process.env.AUTH_SECRET,process.env.ADMIN_PASSWORD])if(v)m=m.split(v).join('[REDACTED]');console.error(m);process.exitCode=1});
