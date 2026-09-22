import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {loadEnvConfig} from '@next/env';
loadEnvConfig(process.cwd(),true);
async function main(){
 if(!['development','test'].includes(process.env.ERP_ENVIRONMENT||''))throw Error('Test database required');
 const url=new URL(process.env.DATABASE_URL!);if(url.host+url.pathname!==process.env.ERP_DATABASE_TARGET)throw Error('Target mismatch');
 const schema='erp_test_'+randomUUID().replaceAll('-','');url.searchParams.set('schema',schema);url.searchParams.set('connect_timeout','30');process.env.DATABASE_URL=url.toString();
 const {default:db}=await import('../src/lib/prisma');
 try{
 const m=spawnSync(process.execPath,['scripts/database-command.cjs','migrate-deploy'],{env:process.env,encoding:'utf8'});if(m.status!==0)throw Error('Migration failed: '+m.stdout+m.stderr);
 const {execute}=await import('../src/lib/erp/service');const {snapshot}=await import('../src/lib/erp/read');
 const admin=await db.user.create({data:{email:'cost@example.invalid',passwordHash:'unused',role:'ADMIN'}});
 const worker=await db.user.create({data:{email:'warehouse@example.invalid',passwordHash:'unused',role:'BUYER',employeeRole:'WAREHOUSE'}});
 const run=(input:unknown,key=randomUUID())=>execute(admin.id,key,input);
 const skuId=await run({action:'sku',code:'IGET',name:'IGET ONE',price:'70',unit:'支'});
 const supplierId=await run({action:'supplier',code:'S',name:'Supplier'}),customerId=await run({action:'customer',code:'C',name:'Customer'});
 const warehouses=await Promise.all(['北倉','西倉','其他倉'].map((name,i)=>run({action:'warehouse',code:String(i),name})));
 const batches:string[]=[];
 for(let i=0;i<3;i++){const id=await run({action:'receive',supplierId,warehouseId:warehouses[i],date:'2026-09-0'+(i+1),lines:[{skuId,quantity:[30,30,40][i],price:['40','50','45'][i]}]});batches.push((await db.receiptLine.findFirstOrThrow({where:{receiptId:id}})).batchId);}
 const orderId=await run({action:'sale',customerId,lines:[{skuId,quantity:100,price:'70'}]});const lineId=(await db.salesLine.findFirstOrThrow({where:{orderId}})).id;
 const ship=(i:number,quantity:number)=>run({action:'ship',orderId,warehouseId:warehouses[i],lines:[{lineId,quantity}]});
 for(let i=0;i<3;i++)await ship(i,[20,10,20][i]);
 await run({action:'payment',orderId,amount:'1000'});
 const before=await snapshot(admin.id);assert.equal(before.orders[0].cost,'2200.00');assert.equal(before.inventory[0].total,50);
 const oldRows=await db.shipmentAllocation.findMany({orderBy:{id:'asc'}});
 const change={action:'adjustBatchCost',batchId:batches[0],expectedVersion:0,newCost:'45',reason:'運費補入'};
 await assert.rejects(execute(worker.id,randomUUID(),change));await assert.rejects(run({...change,reason:''}));await assert.rejects(run({...change,newCost:'-1'}));
 const key=randomUUID();assert.equal(await run(change,key),await run(change,key));
 await assert.rejects(run({...change,newCost:'46'}));
 for(let i=1;i<3;i++)await run({...change,batchId:batches[i],newCost:['45','55','50'][i]});
 assert.deepEqual(await db.shipmentAllocation.findMany({orderBy:{id:'asc'}}),oldRows);
 const after=await snapshot(admin.id);assert.equal(after.orders[0].cost,'2200.00');assert.equal(after.orders[0].profit,'1300.00');assert.equal(after.orders[0].paid,'1000.00');assert.equal(after.orders[0].due,before.orders[0].due);assert.equal(after.inventory[0].total,50);
 for(const b of after.batches){const i=batches.indexOf(b.id);assert.equal(b.originalCost,['40','50','45'][i]);assert.equal(b.totalCost,['1200.00','1500.00','1800.00'][i]);assert.equal(b.cost,['800.00','500.00','900.00'][i]);assert.equal(b.adjustments[0].quantity,[10,20,20][i]);assert.equal(b.adjustments[0].warehouses[0].quantity,[10,20,20][i]);}
 for(let i=0;i<3;i++)await ship(i,5);
 const final=await snapshot(admin.id);assert.equal(final.orders[0].cost,'2950.00');assert.equal(final.orders[0].profit,'1600.00');assert.equal(final.inventory[0].total,35);assert.equal(final.batches.reduce((v:number,b:{cost:string})=>v+Number(b.cost),0),2950);
 assert.equal(await db.shipmentAllocation.count({where:{costVersion:1}}),3);
 // Cost adjustments and shipment posting must serialize using a single consistent version.
 const race=await Promise.allSettled([run({...change,expectedVersion:1,newCost:'47'}),ship(0,1)]);assert.ok(race.every(r=>r.status==='fulfilled'));
 const latest=await db.shipmentAllocation.findMany({where:{batchId:batches[0],costVersion:{gt:0}}});for(const r of latest)assert.equal(r.unitCost.toString(),r.costVersion===1?'45':'47');
 // CNY uses the batch's original FX; old snapshots and receipt prices remain unchanged.
 const fxSku=await run({action:'sku',code:'FX-COST',name:'FX',price:'50'});
 const receipt=await run({action:'receive',supplierId,warehouseId:warehouses[0],currency:'CNY',fxToAud:'0.2',lines:[{skuId:fxSku,quantity:2,price:'100'}]});
 const batch=(await db.receiptLine.findFirstOrThrow({where:{receiptId:receipt}})).batchId;
 await run({...change,batchId:batch,newCost:'110'});assert.equal((await db.inventoryBatch.findUniqueOrThrow({where:{id:batch}})).unitCostAud?.toString(),'22');
 await assert.rejects(run({action:'reverse',kind:'receipt',id:receipt,reason:'Cannot erase cost history'}));
 const fxOrder=await run({action:'sale',customerId,lines:[{skuId:fxSku,quantity:2,price:'50'}]});const fxLine=(await db.salesLine.findFirstOrThrow({where:{orderId:fxOrder}})).id;
 await run({action:'ship',orderId:fxOrder,warehouseId:warehouses[0],lines:[{lineId:fxLine,quantity:2}]});await assert.rejects(run({...change,batchId:batch,expectedVersion:1,newCost:'120'}));
 const warehouseView=await snapshot(worker.id);assert.equal(warehouseView.batches.length,0);assert.ok(!warehouseView.user.permissions.includes('adjustBatchCost'));
 console.log('PASS: 100 received / 50 sold; unchanged historical costs, profit and payments; future shipment revision costs; original receipt prices; warehouse quantities; idempotency; stale-version/role/empty-stock denial; concurrent shipment and adjustment; CNY conversion.');
 }finally{if(!/^erp_test_[a-f0-9]{32}$/.test(schema))throw Error('Invalid cleanup');await db.$executeRawUnsafe('DROP SCHEMA IF EXISTS "'+schema+'" CASCADE');await db.$disconnect();console.log('Cost test schema removed.');}
}
main().catch(e=>{let m=String(e.stack||e);const u=new URL(process.env.DATABASE_URL!);for(const v of [process.env.DATABASE_URL,u.hostname,u.password,process.env.AUTH_SECRET,process.env.ADMIN_PASSWORD])if(v)m=m.split(v).join('[REDACTED]');console.error(m);process.exitCode=1});
