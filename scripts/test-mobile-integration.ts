import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawnSync,spawn} from 'node:child_process';
import {loadEnvConfig} from '@next/env';
import bcrypt from 'bcryptjs';
loadEnvConfig(process.cwd(),true);
async function main(){
 if(!['development','test'].includes(process.env.ERP_ENVIRONMENT||''))throw Error('Test database required');
 const url=new URL(process.env.DATABASE_URL!);if(url.host+url.pathname!==process.env.ERP_DATABASE_TARGET)throw Error('Target mismatch');
 const schema='erp_test_'+randomUUID().replaceAll('-','');url.searchParams.set('schema',schema);process.env.DATABASE_URL=url.toString();
 const {default:db}=await import('../src/lib/prisma');let server:ReturnType<typeof spawn>|undefined;
 try{
  const migration=spawnSync(process.execPath,['scripts/database-command.cjs','migrate-deploy'],{env:process.env,encoding:'utf8'});if(migration.status!==0)throw Error('Isolated migration failed');
  const {execute}=await import('../src/lib/erp/service');
  const passwordHash=await bcrypt.hash('Test12345',12);
  const admin=await db.user.create({data:{email:'admin@mobile-test.invalid',displayName:'測試管理員',role:'ADMIN',passwordHash}});
  const run=(input:unknown)=>execute(admin.id,randomUUID(),input);
  const sku=await run({action:'sku',code:'BAR-01',name:'Bar pro',groupName:'Bar 系列',unit:'支',price:'0'});
  const warehouse=await run({action:'warehouse',code:'NORTH',name:'北倉'});
  const west=await run({action:'warehouse',code:'WEST',name:'西倉'});
  const supplier=await run({action:'supplier',code:'S001',name:'測試供應商',note:''});
  const customer=await run({action:'customer',code:'C001',name:'小陳',note:''});
  for(const [warehouseId,quantity] of [[warehouse,300],[west,700]] as const)await run({action:'receive',supplierId:supplier,warehouseId,currency:'AUD',date:'2026-09-30',note:'',lines:[{skuId:sku,quantity,price:'40'}]});
  const orderId=await run({action:'sale',customerId:customer,currency:'AUD',date:'2026-09-30',note:'手機操作測試',lines:[{skuId:sku,quantity:10,price:'60'}]});
  const order=await db.salesOrder.findUniqueOrThrow({where:{id:orderId},include:{lines:true}});
  await run({action:'ship',orderId,warehouseId:warehouse,date:'2026-09-30',note:'',lines:[{lineId:order.lines[0].id,quantity:4}]});
  assert.equal(await db.salesOrder.count(),1);
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3106'],{env:{...process.env,NEXTAUTH_URL:'http://127.0.0.1:3106',AUTH_URL:'http://127.0.0.1:3106'},stdio:'ignore'});
  for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:3106/login')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
  await new Promise<void>((resolve,reject)=>{const p=spawn(process.execPath,['scripts/test-mobile-workspace.cjs'],{env:process.env,stdio:'inherit'});p.on('exit',code=>code===0?resolve():reject(Error('Mobile browser test failed')));p.on('error',reject);});
 }finally{
  if(server){server.kill();await new Promise(r=>setTimeout(r,1000));}
  if(!/^erp_test_[a-f0-9]{32}$/.test(schema))throw Error('Invalid cleanup schema');
  await db.$executeRawUnsafe('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE');await db.$disconnect();console.log('Mobile test schema removed.');
 }
}
main().catch(e=>{let m=String(e.stack||e);for(const v of [process.env.DATABASE_URL,process.env.AUTH_SECRET,process.env.ADMIN_PASSWORD])if(v)m=m.split(v).join('[REDACTED]');console.error(m);process.exitCode=1;});
