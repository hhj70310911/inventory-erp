import {randomUUID} from 'node:crypto';
import {spawnSync,spawn} from 'node:child_process';
import {loadEnvConfig} from '@next/env';
import bcrypt from 'bcryptjs';
loadEnvConfig(process.cwd(),true);
async function main(){
 if(!['development','test'].includes(process.env.ERP_ENVIRONMENT||''))throw Error('Test database required');
 const url=new URL(process.env.DATABASE_URL!);if(url.host+url.pathname!==process.env.ERP_DATABASE_TARGET)throw Error('Target mismatch');
 const schema='erp_test_'+randomUUID().replaceAll('-','');url.searchParams.set('schema',schema);url.searchParams.set('connect_timeout','30');process.env.DATABASE_URL=url.toString();
 const {default:db}=await import('../src/lib/prisma');let server:ReturnType<typeof spawn>|undefined;
 try{
 const m=spawnSync(process.execPath,['scripts/database-command.cjs','migrate-deploy'],{env:process.env,encoding:'utf8'});if(m.status!==0)throw Error('Migration failed: '+m.stdout+m.stderr);
 const {execute}=await import('../src/lib/erp/service');
 const admin=await db.user.create({data:{email:'cost-ui@example.invalid',passwordHash:await bcrypt.hash('Test12345',12),role:'ADMIN'}});const run=(input:unknown)=>execute(admin.id,randomUUID(),input);
 const skuId=await run({action:'sku',code:'IGET',name:'IGET ONE',price:'70',unit:'支'}),warehouseId=await run({action:'warehouse',code:'N',name:'北倉'}),supplierId=await run({action:'supplier',code:'S',name:'供應商'}),customerId=await run({action:'customer',code:'C',name:'客戶'});
 await run({action:'receive',warehouseId,supplierId,batchLabel:'A 批',lines:[{skuId,quantity:30,price:'40'}]});const orderId=await run({action:'sale',customerId,lines:[{skuId,quantity:20,price:'70'}]});const lineId=(await db.salesLine.findFirstOrThrow({where:{orderId}})).id;await run({action:'ship',orderId,warehouseId,lines:[{lineId,quantity:20}]});
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3102'],{env:{...process.env,NEXTAUTH_URL:'http://127.0.0.1:3102',AUTH_URL:'http://127.0.0.1:3102'},stdio:'ignore'});
 for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:3102/login')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 await new Promise<void>((resolve,reject)=>{const test=spawn(process.execPath,['scripts/test-batch-cost-browser.cjs'],{env:process.env,stdio:'inherit'});test.on('exit',code=>code===0?resolve():reject(Error('Cost browser test failed')));test.on('error',reject)});
 }finally{if(server){server.kill();await new Promise(r=>setTimeout(r,1000));}if(!/^erp_test_[a-f0-9]{32}$/.test(schema))throw Error('Invalid cleanup');await db.$executeRawUnsafe('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE');await db.$disconnect();console.log('Cost UI test schema removed.');}
}
main().catch(e=>{let m=String(e.stack||e);const u=new URL(process.env.DATABASE_URL!);for(const v of [process.env.DATABASE_URL,u.hostname,u.password,process.env.AUTH_SECRET,process.env.ADMIN_PASSWORD])if(v)m=m.split(v).join('[REDACTED]');console.error(m);process.exitCode=1});
