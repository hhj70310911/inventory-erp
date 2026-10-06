import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawnSync,spawn} from 'node:child_process';
import {loadEnvConfig} from '@next/env';
import bcrypt from 'bcryptjs';
loadEnvConfig(process.cwd(),true);
async function main(){
 if(!['development','test'].includes(process.env.ERP_ENVIRONMENT||''))throw Error('Test database required');
 const url=new URL(process.env.DATABASE_URL!);if(url.host+url.pathname!==process.env.ERP_DATABASE_TARGET)throw Error('Database target mismatch');
 const schema='cash_test_'+randomUUID().replaceAll('-','');url.searchParams.set('schema',schema);process.env.DATABASE_URL=url.toString();
 const migrated=spawnSync(process.execPath,['scripts/database-command.cjs','migrate-deploy'],{env:process.env,encoding:'utf8'});if(migrated.status!==0)throw Error('Test schema migration failed');
 const {default:db}=await import('../src/lib/prisma');let server:ReturnType<typeof spawn>|undefined;
 try{
 const {cashExecute:run,cashRead}=await import('../src/lib/erp/cash');const {execute}=await import('../src/lib/erp/service');const {snapshot}=await import('../src/lib/erp/read');
 const admin=await db.user.create({data:{email:'cash-admin@example.invalid',passwordHash:await bcrypt.hash('Test12345',12),role:'ADMIN'}});
 const worker=await db.user.create({data:{email:'cash-worker@example.invalid',passwordHash:'unused',role:'BUYER',employeeRole:'FINANCE'}});
 if(!process.argv.includes('--ui-only')){
 const base={action:'cashCreate',date:'2026-10-06',kind:'EXPENSE',category:'薪資',amount:'800',currency:'AUD',fxToAud:'1',account:'銀行',counterparty:'員工',note:'測試'};
 await assert.rejects(run(worker.id,randomUUID(),base));await assert.rejects(cashRead(worker.id,'2026-10'));
 const key=randomUUID();const ids=await Promise.all([run(admin.id,key,base),run(admin.id,key,base)]);assert.equal(ids[0],ids[1]);assert.equal(await db.cashEntry.count(),1);
 await assert.rejects(run(admin.id,key,{...base,amount:'900'}));
 for(const input of [{...base,date:'2026-02-30'},{...base,amount:'0'},{...base,amount:'-1'},{...base,currency:'CNY',fxToAud:'0'},{...base,amount:'1.001'}])await assert.rejects(run(admin.id,randomUUID(),input));
 await run(admin.id,randomUUID(),{...base,kind:'CAPITAL_IN',category:'老闆投入',amount:'10000'});
 await run(admin.id,randomUUID(),{...base,kind:'CAPITAL_OUT',category:'還款',amount:'1000'});
 await run(admin.id,randomUUID(),{...base,kind:'INCOME',category:'利息',amount:'500',currency:'CNY',fxToAud:'0.2'});
 await run(admin.id,randomUUID(),{...base,date:'2026-09-30',amount:'999'});
 let read=await cashRead(admin.id,'2026-10');assert.equal(read.summary.expense,'800.00');assert.equal(read.summary.income,'100.00');assert.equal(read.summary.profit,'-700.00');assert.equal(read.summary.capitalIn,'10000.00');assert.equal(read.summary.capitalOut,'1000.00');assert.equal(read.entries.length,4);
 const transact=(v:unknown)=>execute(admin.id,randomUUID(),v);
 const sku=await transact({action:'sku',code:'TEST',name:'Test',price:'0'}),warehouse=await transact({action:'warehouse',code:'W',name:'Test'}),supplier=await transact({action:'supplier',code:'S',name:'Test'}),customer=await transact({action:'customer',code:'C',name:'Test'});
 await transact({action:'receive',supplierId:supplier,warehouseId:warehouse,date:'2026-10-01',lines:[{skuId:sku,quantity:10,price:'40'}]});
 const order=await transact({action:'sale',customerId:customer,date:'2026-10-02',lines:[{skuId:sku,quantity:10,price:'60'}]});const line=await db.salesLine.findFirstOrThrow({where:{orderId:order}});
 const ship=await transact({action:'ship',orderId:order,warehouseId:warehouse,date:'2026-10-03',lines:[{lineId:line.id,quantity:5}]});
 read=await cashRead(admin.id,'2026-10');assert.equal(read.summary.gross,'100.00');assert.equal(read.summary.profit,'-600.00');
 await run(admin.id,randomUUID(),{...base,action:'cashEdit',id:ids[0],version:0,amount:'700',reason:'修正'});
 await assert.rejects(run(admin.id,randomUUID(),{...base,action:'cashEdit',id:ids[0],version:0,amount:'600',reason:'過期版本'}));
 read=await cashRead(admin.id,'2026-10');assert.equal(read.summary.profit,'-500.00');assert.equal(read.entries.find((e:{id:string})=>e.id===ids[0]).history.length,2);
 await run(admin.id,randomUUID(),{action:'cashVoid',id:ids[0],version:1,reason:'測試作廢'});read=await cashRead(admin.id,'2026-10');assert.equal(read.summary.expense,'0.00');assert.equal(read.summary.profit,'200.00');
 await assert.rejects(run(admin.id,randomUUID(),{...base,action:'cashEdit',id:ids[0],version:2,reason:'禁止編輯作廢'}));
 const allocation=await db.shipmentAllocation.findFirstOrThrow({where:{shipmentId:ship}});await db.shipmentAllocation.update({where:{id:allocation.id},data:{unitCostAud:null}});assert.equal((await cashRead(admin.id,'2026-10')).summary.profit,null);await db.shipmentAllocation.update({where:{id:allocation.id},data:{unitCostAud:40}});
 await transact({action:'reverse',kind:'shipment',id:ship,reason:'測試沖銷'});assert.equal((await cashRead(admin.id,'2026-10')).summary.gross,'0.00');
 await run(admin.id,randomUUID(),{action:'cashPermission',id:worker.id,expectedUpdatedAt:worker.updatedAt.toISOString(),cashView:true,cashEdit:false});
 assert.equal((await snapshot(worker.id)).user.cashView,true);await cashRead(worker.id,'2026-10');await assert.rejects(run(worker.id,randomUUID(),base));
 const latest=await db.user.findUniqueOrThrow({where:{id:worker.id}});await run(admin.id,randomUUID(),{action:'cashPermission',id:worker.id,expectedUpdatedAt:latest.updatedAt.toISOString(),cashView:false,cashEdit:true});await run(worker.id,randomUUID(),base);
 await assert.rejects(run(worker.id,randomUUID(),{action:'cashPermission',id:worker.id,expectedUpdatedAt:latest.updatedAt.toISOString(),cashView:true,cashEdit:true}));
 await db.user.update({where:{id:worker.id},data:{active:false}});await assert.rejects(cashRead(worker.id,'2026-10'));await assert.rejects(run(worker.id,randomUUID(),base));
 console.log('PASS: isolated migrations, FX, expense/income/capital separation, shipment profit/reversal, unknown costs, month boundaries, concurrent duplicate, audit, stale edit, void and authorization.');
 }
 if(process.argv.includes('--browser')){
 server=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','-p','3106'],{env:{...process.env,NEXTAUTH_URL:'http://127.0.0.1:3106',AUTH_URL:'http://127.0.0.1:3106'},stdio:'ignore',windowsHide:true});
 let ready=false;for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:3106/login')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}if(!ready)throw Error('Test server did not start');
 const browser=spawnSync(process.execPath,['scripts/test-cash-browser.cjs'],{env:process.env,stdio:'inherit',windowsHide:true});assert.equal(browser.status,0);
 }
 }finally{if(server){server.kill();await new Promise(r=>server!.once('exit',r));}if(!/^cash_test_[a-f0-9]{32}$/.test(schema))throw Error('Invalid schema');await db.$executeRawUnsafe('DROP SCHEMA "'+schema+'" CASCADE');await db.$disconnect();console.log('Removed isolated test schema and stopped test server.');}
}
main().catch(e=>{let message=String(e.stack||e);for(const v of [process.env.DATABASE_URL,process.env.AUTH_SECRET])if(v)message=message.split(v).join('[REDACTED]');console.error(message);process.exitCode=1;});
