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
 const {execute,can,employee:loadEmployee}=await import('../src/lib/erp/service');
 const passwordHash=await bcrypt.hash('Test12345',12);
 const admin=await db.user.create({data:{email:'admin@employee-test.invalid',passwordHash,role:'ADMIN',displayName:'管理員'}});
 const manager=await db.user.create({data:{email:'manager@employee-test.invalid',passwordHash,role:'BUYER',employeeRole:'MANAGER',displayName:'主管'}});
 const worker=await db.user.create({data:{email:'worker@employee-test.invalid',passwordHash,role:'BUYER',employeeRole:'WAREHOUSE',displayName:'原員工'}});
 const input={action:'editEmployee',id:worker.id,expectedUpdatedAt:worker.updatedAt.toISOString(),email:' EDITED@employee-test.invalid ',name:'已編輯員工',role:'FINANCE',active:false};
 const key=randomUUID();await execute(admin.id,key,input);await execute(admin.id,key,input);
 let saved=await db.user.findUniqueOrThrow({where:{id:worker.id}});assert.equal(saved.email,'edited@employee-test.invalid');assert.equal(saved.displayName,'已編輯員工');assert.equal(saved.employeeRole,'FINANCE');assert.equal(saved.active,false);assert.equal(saved.passwordHash,passwordHash);await assert.rejects(loadEmployee(worker.id));
 const audit=await db.auditEvent.findUniqueOrThrow({where:{id:key}});assert.equal(audit.actorId,admin.id);assert.equal(audit.entityId,worker.id);assert.ok(JSON.stringify(audit.before).includes('原員工'));assert.ok(!JSON.stringify(audit).includes('passwordHash'));assert.equal(await db.auditEvent.count(),1);
 await assert.rejects(execute(admin.id,randomUUID(),input),/已被更新/);
 await execute(manager.id,randomUUID(),{...input,email:saved.email,active:true,expectedUpdatedAt:saved.updatedAt.toISOString()});saved=await db.user.findUniqueOrThrow({where:{id:worker.id}});assert.ok(can(saved,'payment'));assert.ok(!can(saved,'ship'));
 const current={...input,email:saved.email,active:true,expectedUpdatedAt:saved.updatedAt.toISOString()};
 await assert.rejects(execute(worker.id,randomUUID(),current),/沒有操作權限/);
 await assert.rejects(execute(manager.id,randomUUID(),{...current,role:'MANAGER'}),/只有系統管理員/);
 await assert.rejects(execute(admin.id,randomUUID(),{...current,email:admin.email.toUpperCase()}),/Email 已被/);
 await assert.rejects(execute(manager.id,randomUUID(),{action:'disableEmployee',id:admin.id}));
 await assert.rejects(execute(admin.id,randomUUID(),{action:'disableEmployee',id:admin.id}));
 await execute(admin.id,randomUUID(),{...current,role:'SALES'});
 console.log('PASS: edit persistence, normalized email, stale edit, idempotency, audit, disable/reactivate, live role changes and backend denial.');
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3106'],{env:{...process.env,NEXTAUTH_URL:'http://127.0.0.1:3106',AUTH_URL:'http://127.0.0.1:3106'},stdio:'ignore'});
 for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:3106/login')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 await new Promise<void>((resolve,reject)=>{const test=spawn(process.execPath,['scripts/test-employee-browser.cjs'],{env:process.env,stdio:'inherit'});test.on('exit',code=>code===0?resolve():reject(Error('Employee browser test failed')));test.on('error',reject)});
 }finally{
 if(server){server.kill();await new Promise(r=>setTimeout(r,1000));}
 if(!/^erp_test_[a-f0-9]{32}$/.test(schema))throw Error('Invalid cleanup schema');await db.$executeRawUnsafe('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE');await db.$disconnect();console.log('Employee test schema removed.');
 }
}
main().catch(e=>{let m=String(e.stack||e);const u=new URL(process.env.DATABASE_URL!);for(const v of [process.env.DATABASE_URL,u.hostname,u.password,process.env.AUTH_SECRET,process.env.ADMIN_PASSWORD])if(v)m=m.split(v).join('[REDACTED]');console.error(m);process.exitCode=1});
