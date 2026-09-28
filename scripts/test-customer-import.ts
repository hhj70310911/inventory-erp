import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawnSync,spawn} from 'node:child_process';
import {loadEnvConfig} from '@next/env';
import bcrypt from 'bcryptjs';
import {readSheet} from 'read-excel-file/node';
import {previewCustomers} from '../src/lib/erp/customer-import';
loadEnvConfig(process.cwd(),true);
async function main(){
 const headers=['客戶編碼','客戶名稱','備註'];
 assert.throws(()=>previewCustomers([headers],[]),/沒有客戶/);
 assert.throws(()=>previewCustomers([['錯誤']],[]),/模板/);
 assert.equal(previewCustomers([headers,['001','小陳',''],[null,null,null]],[])[0].code,'001');
 assert.ok(previewCustomers([headers,['A','甲',''],[' A ','乙','']],[]).every(r=>r.errors.length));
 assert.ok(previewCustomers([headers,['A','','']],[])[0].errors.length);
 assert.ok(previewCustomers([headers,['A','甲','']],[{code:'A'}])[0].errors.length);
 assert.throws(()=>previewCustomers([headers,...Array.from({length:1001},(_,i)=>[String(i),'甲',''])],[]),/1000/);
 const template=await readSheet('public/templates/customer-import.xlsx','客戶資料');
 assert.deepEqual(template[0],headers);assert.throws(()=>previewCustomers(template,[]),/沒有客戶/);
 if(!['development','test'].includes(process.env.ERP_ENVIRONMENT||''))throw Error('Test database required');
 const url=new URL(process.env.DATABASE_URL!);if(url.host+url.pathname!==process.env.ERP_DATABASE_TARGET)throw Error('Target mismatch');
 const schema='erp_test_'+randomUUID().replaceAll('-','');url.searchParams.set('schema',schema);process.env.DATABASE_URL=url.toString();
 const {default:db}=await import('../src/lib/prisma');let server:ReturnType<typeof spawn>|undefined;
 try{
  const migration=spawnSync(process.execPath,['scripts/database-command.cjs','migrate-deploy'],{env:process.env,encoding:'utf8'});if(migration.status!==0)throw Error('Isolated migration failed');
  const {execute}=await import('../src/lib/erp/service');
  const passwordHash=await bcrypt.hash('Test12345',12);
  const admin=await db.user.create({data:{email:'admin@customer-test.invalid',role:'ADMIN',passwordHash}});
  const warehouse=await db.user.create({data:{email:'warehouse@customer-test.invalid',role:'BUYER',employeeRole:'WAREHOUSE',passwordHash}});
  const sales=await db.user.create({data:{email:'sales@customer-test.invalid',role:'BUYER',employeeRole:'SALES',passwordHash}});
  const input={action:'importCustomers',rows:[{code:'A',name:'甲',note:''},{code:'B',name:'乙',note:''}]};
  await assert.rejects(execute(warehouse.id,randomUUID(),input),/權限/);
  const key=randomUUID();await execute(sales.id,key,input);await execute(sales.id,key,input);
  assert.equal(await db.customer.count(),2);assert.equal(await db.auditEvent.count(),1);
  assert.equal((await db.auditEvent.findUniqueOrThrow({where:{id:key}})).reason,'批次新增 2 筆客戶');
  await assert.rejects(execute(admin.id,randomUUID(),{action:'importCustomers',rows:[{code:'NEW',name:'新增',note:''},input.rows[0]]}),/已存在/);
  assert.equal(await db.customer.count(),2);
  await assert.rejects(execute(admin.id,randomUUID(),{action:'importCustomers',rows:[input.rows[0],input.rows[0]]}),/重複/);
  const concurrent={action:'importCustomers',rows:[{code:'RACE',name:'同時匯入',note:''}]};
  const results=await Promise.allSettled([execute(admin.id,randomUUID(),concurrent),execute(admin.id,randomUUID(),concurrent)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(await db.customer.count(),3);
  console.log('PASS: template, validation, permissions, atomic import, idempotency, concurrent duplicates and audit.');
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3106'],{env:{...process.env,NEXTAUTH_URL:'http://127.0.0.1:3106',AUTH_URL:'http://127.0.0.1:3106'},stdio:'ignore'});
  for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:3106/login')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
  await new Promise<void>((resolve,reject)=>{const p=spawn(process.execPath,['scripts/test-customer-import-browser.cjs'],{env:process.env,stdio:'inherit'});p.on('exit',code=>code===0?resolve():reject(Error('Browser test failed')));p.on('error',reject);});
 }finally{
  if(server){server.kill();await new Promise(r=>setTimeout(r,1000));}
  if(!/^erp_test_[a-f0-9]{32}$/.test(schema))throw Error('Invalid cleanup schema');
  await db.$executeRawUnsafe('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE');await db.$disconnect();console.log('Customer test schema removed.');
 }
}
main().catch(e=>{let m=String(e.stack||e);for(const v of [process.env.DATABASE_URL,process.env.AUTH_SECRET,process.env.ADMIN_PASSWORD])if(v)m=m.split(v).join('[REDACTED]');console.error(m);process.exitCode=1;});
