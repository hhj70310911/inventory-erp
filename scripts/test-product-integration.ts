import assert from 'node:assert/strict';
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
 const {execute}=await import('../src/lib/erp/service'),{snapshot}=await import('../src/lib/erp/read');
 const admin=await db.user.create({data:{email:'products@example.invalid',passwordHash:await bcrypt.hash('Test12345',12),role:'ADMIN'}});
 const worker=await db.user.create({data:{email:'worker@example.invalid',passwordHash:'unused',role:'BUYER',employeeRole:'WAREHOUSE'}});
 const run=(input:unknown,key=randomUUID())=>execute(admin.id,key,input);
 const operation=async(action:string,id:string,extra={})=>({action,id,expectedUpdatedAt:(await db.inventorySku.findUniqueOrThrow({where:{id}})).updatedAt.toISOString(),...extra});
 if(process.env.PRODUCT_UI_ONLY!=='1'){
 const sku=await run({action:'sku',code:'HISTORY',name:'Old name',price:'50',unit:'5000支',groupName:'Old group'});
 const edit=await operation('editSku',sku,{name:'New name',groupName:'New group',unit:'支',price:'60'});
 await assert.rejects(execute(worker.id,randomUUID(),edit),/權限/);await run(edit);await assert.rejects(run({...edit,name:'Stale edit'}),/已被更新/);
 const warehouseId=await run({action:'warehouse',code:'N',name:'北倉'}),supplierId=await run({action:'supplier',code:'S',name:'Supplier'}),customerId=await run({action:'customer',code:'C',name:'Customer'});
 const orderId=await run({action:'sale',customerId,lines:[{skuId:sku,quantity:10,price:'60'}]});const lineId=(await db.salesLine.findFirstOrThrow({where:{orderId}})).id;
 await assert.rejects(run(await operation('deleteSku',sku)),/紀錄/);await assert.rejects(run(await operation('disableSku',sku)),/待出貨/);
 await run({action:'receive',warehouseId,supplierId,lines:[{skuId:sku,quantity:10,price:'40'}]});await assert.rejects(run(await operation('disableSku',sku)),/庫存/);
 await run(await operation('editSku',sku,{name:'Current name',groupName:'',unit:'支',price:'65'}));
 assert.equal((await db.salesLine.findUniqueOrThrow({where:{id:lineId}})).description,'New name');assert.equal((await db.salesLine.findUniqueOrThrow({where:{id:lineId}})).unitPrice.toString(),'60');
 const shipment=await run({action:'ship',orderId,warehouseId,lines:[{lineId,quantity:10}]});await run(await operation('disableSku',sku));
 let snap=await snapshot(admin.id);assert.ok(!snap.skus.some((s:{id:string})=>s.id===sku));assert.ok(!snap.inventory.some((s:{id:string})=>s.id===sku));assert.ok(snap.batches.some((b:{sku:string})=>b.sku==='HISTORY'));assert.equal(snap.orders[0].cost,'400.00');assert.equal(snap.productCatalog.find((s:{id:string})=>s.id===sku).active,false);
 await assert.rejects(run({action:'sale',customerId,lines:[{skuId:sku,quantity:1,price:'60'}]}));await assert.rejects(run({action:'receive',warehouseId,supplierId,lines:[{skuId:sku,quantity:1,price:'40'}]}));
 await assert.rejects(run({action:'reverse',kind:'shipment',id:shipment,reason:'Test'}),/重新啟用/);await run(await operation('enableSku',sku));await run({action:'reverse',kind:'shipment',id:shipment,reason:'Test'});
 const virgin=await run({action:'sku',code:'DELETE',name:'Mistake',price:'0'}),key=randomUUID(),del=await operation('deleteSku',virgin);
 await assert.rejects(execute(worker.id,randomUUID(),del));await run(del,key);await run(del,key);assert.equal(await db.inventorySku.findUnique({where:{id:virgin}}),null);const audit=await db.auditEvent.findUniqueOrThrow({where:{id:key}});assert.equal((audit.before as {code:string}).code,'DELETE');
 // Even reversed receipts retain history and prevent deletion.
 const reversed=await run({action:'sku',code:'REVERSED',name:'Receipt reversed',price:'0'});const receipt=await run({action:'receive',warehouseId,supplierId,lines:[{skuId:reversed,quantity:1,price:'1'}]});await run({action:'reverse',kind:'receipt',id:receipt,reason:'Test'});await assert.rejects(run(await operation('deleteSku',reversed)),/紀錄/);
 }else{
 const history=await run({action:'sku',code:'HISTORY',name:'Pending product',price:'60'});const customerId=await run({action:'customer',code:'C',name:'Customer'});await run({action:'sale',customerId,lines:[{skuId:history,quantity:1,price:'60'}]});
 }
 await run({action:'sku',code:'UI-NEW',name:'UI product',unit:'5000支',groupName:'UI group',price:'27'});const inactive=await run({action:'sku',code:'UI-INACTIVE',name:'Inactive product',price:'0'});await run(await operation('disableSku',inactive));
 if(process.env.PRODUCT_UI_ONLY!=='1')console.log('PASS: product edit, stale-write and role rejection, original sales snapshots, history-only deletion guard, stock/pending disable guards, inactive selectors, retained financials, re-enable, reversal guard, idempotent delete audit.');
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3103'],{env:{...process.env,NEXTAUTH_URL:'http://127.0.0.1:3103',AUTH_URL:'http://127.0.0.1:3103'},stdio:'ignore'});
 for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:3103/login')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 await new Promise<void>((resolve,reject)=>{const test=spawn(process.execPath,['scripts/test-product-browser.cjs'],{env:process.env,stdio:'inherit'});test.on('exit',code=>code===0?resolve():reject(Error('Product browser test failed')));test.on('error',reject)});
 }finally{if(server){server.kill();await new Promise(r=>setTimeout(r,1000));}if(!/^erp_test_[a-f0-9]{32}$/.test(schema))throw Error('Invalid cleanup');await db.$executeRawUnsafe('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE');await db.$disconnect();console.log('Product test schema removed.');}
}
main().catch(e=>{let m=String(e.stack||e);const u=new URL(process.env.DATABASE_URL!);for(const v of [process.env.DATABASE_URL,u.hostname,u.password,process.env.AUTH_SECRET,process.env.ADMIN_PASSWORD])if(v)m=m.split(v).join('[REDACTED]');console.error(m);process.exitCode=1});
