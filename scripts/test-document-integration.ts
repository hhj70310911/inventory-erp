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
 const {orderDocument}=await import('../src/lib/erp/order-document');
 const admin=await db.user.create({data:{email:'documents@example.invalid',passwordHash:await bcrypt.hash('Test12345',12),role:'ADMIN',displayName:'測試管理員'}}),worker=await db.user.create({data:{email:'worker@example.invalid',passwordHash:'unused',role:'BUYER',employeeRole:'WAREHOUSE'}});

 // Direct fixtures isolate document reads from unrelated posting transactions.
 const skuId=randomUUID(),second=randomUUID(),warehouseId=randomUUID(),customerId=randomUUID();
 await db.inventorySku.createMany({data:[{id:skuId,code:'DOC-ONE',name:'IGET ONE 薄荷',salePrice:'60',unit:'支'},{id:second,code:'DOC-TWO',name:'測試商品第二種規格',salePrice:'99.99',unit:'箱'}]});
 await db.warehouse.create({data:{id:warehouseId,code:'N',name:'北倉'}});await db.customer.create({data:{id:customerId,code:'C',name:'測試客戶'}});
 const batchIds=[randomUUID(),randomUUID(),randomUUID()];await db.inventoryBatch.createMany({data:batchIds.map((id,i)=>({id,batchNo:'DOC-BATCH-'+i,skuId:i===2?second:skuId,unitCost:['40','45','50'][i],unitCostAud:['40','45','50'][i],fxToAud:'1',receivedAt:new Date()}))});
 const saved=await db.salesOrder.create({data:{number:'SO-DOCUMENT-TEST',customerId,state:'POSTED',fxToAud:'1',note:'INTERNAL-NOTE-DO-NOT-SHARE',lines:{create:[{skuId,skuCode:'DOC-ONE',description:'IGET ONE 薄荷',quantity:8,unitPrice:'60'},{skuId:second,skuCode:'DOC-TWO',description:'測試商品第二種規格',quantity:2,unitPrice:'99.99'}]}},include:{lines:true}});const orderId=saved.id;
 await db.customerPayment.create({data:{number:'PAY-DOCUMENT-TEST',requestKey:randomUUID(),customerId,actorId:admin.id,amount:'100',state:'POSTED',receivedAt:new Date(),allocations:{create:{orderId,amount:'100'}}}});
 const shipmentId=(await db.shipment.create({data:{number:'OUT-DOCUMENT-TEST',requestKey:randomUUID(),orderId,warehouseId,actorId:admin.id,state:'POSTED',postedAt:new Date(),allocations:{create:batchIds.map((batchId,i)=>({batchId,salesLineId:saved.lines.find(l=>l.skuId===(i===2?second:skuId))!.id,quantity:[3,2,1][i],unitPrice:i===2?'99.99':'60',unitCost:['40','45','50'][i],unitCostAud:['40','45','50'][i]}))}}})).id;
 const order=await orderDocument(admin.id,orderId),shipment=await orderDocument(admin.id,orderId,shipmentId);assert.equal(order.total,'679.98');assert.equal(order.paid,'100.00');assert.equal(order.due,'579.98');assert.equal(shipment.total,'399.99');assert.equal(shipment.rows.length,2);assert.equal(shipment.rows.find(r=>r.sku==='DOC-ONE')!.quantity,5);assert.equal(shipment.rows.find(r=>r.sku==='DOC-TWO')!.unit,'箱');assert.equal((await orderDocument(worker.id,orderId)).paid,null);assert.equal((await orderDocument(worker.id,orderId)).due,null);assert.ok(!JSON.stringify(shipment).match(/unitCost|profit|password|batchId/));await assert.rejects(orderDocument(admin.id,orderId,'invalid'));await db.user.update({where:{id:worker.id},data:{active:false}});await assert.rejects(orderDocument(worker.id,orderId));
 console.log('PASS: exact decimal totals, partial shipment, merged batch allocations, mixed units, financial visibility, disabled account, invalid shipment, customer-only fields.');
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3105'],{env:{...process.env,NEXTAUTH_URL:'http://127.0.0.1:3105',AUTH_URL:'http://127.0.0.1:3105'},stdio:'ignore'});
 for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:3105/login')).ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 await new Promise<void>((resolve,reject)=>{const test=spawn(process.execPath,['scripts/test-document-browser.cjs'],{env:process.env,stdio:'inherit'});test.on('exit',code=>code===0?resolve():reject(Error('Document browser test failed')));test.on('error',reject)});
 await db.shipment.update({where:{id:shipmentId},data:{state:'REVERSED'}});assert.equal((await orderDocument(admin.id,orderId,shipmentId)).state,'REVERSED');
 }finally{if(server){server.kill();await new Promise(r=>setTimeout(r,1000));}if(!/^erp_test_[a-f0-9]{32}$/.test(schema))throw Error('Invalid cleanup');await db.$executeRawUnsafe('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE');await db.$disconnect();console.log('Document test schema removed.');}
}
main().catch(e=>{let m=String(e.stack||e);const u=new URL(process.env.DATABASE_URL!);for(const v of [process.env.DATABASE_URL,u.hostname,u.password,process.env.AUTH_SECRET,process.env.ADMIN_PASSWORD])if(v)m=m.split(v).join('[REDACTED]');console.error(m);process.exitCode=1});
