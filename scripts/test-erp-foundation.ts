import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { allocateFifo } from '../src/lib/erp/fifo';
const batches = [
  {id:'second',quantity:10,unitCost:'42.50',receivedAt:new Date('2026-09-02')},
  {id:'first',quantity:10,unitCost:'40',receivedAt:new Date('2026-09-01')},
];
const result=allocateFifo(batches,12);
assert.equal(result.totalCost.toFixed(2),'485.00');
assert.deepEqual(result.allocations.map(a=>[a.batchId,a.quantity]),[['first',10],['second',2]]);
assert.equal(batches[0].quantity,10);
assert.throws(()=>allocateFifo(batches,21),/Insufficient stock/);
assert.throws(()=>allocateFifo(batches,1.5),/Invalid quantity/);
assert.throws(()=>allocateFifo([batches[0],batches[0]],1),/Invalid batch/);
assert.equal(allocateFifo([{...batches[0],unitCost:'0.1'}],3).totalCost.toString(),'0.3');
const base={...process.env,DATABASE_URL:'postgresql://test:test@localhost:5432/erp_test',ERP_DATABASE_TARGET:'localhost:5432/erp_test',ERP_ENVIRONMENT:'test'};
for(const [name,command,extra,expected] of [
 ['valid','check',{},0],
 ['wrong-target','check',{ERP_DATABASE_TARGET:'wrong:5432/db'},1],
 ['production-dev','migrate-dev',{ERP_ENVIRONMENT:'production'},1],
 ['blocked-push','push',{},1],
] as const){
 const r=spawnSync(process.execPath,['scripts/database-command.cjs',command],{env:{...base,...extra},encoding:'utf8'});
 assert.equal(r.status,expected,name);
}
console.log('FIFO precision, allocation, stock rejection and database guards passed. No DB connection made.');
