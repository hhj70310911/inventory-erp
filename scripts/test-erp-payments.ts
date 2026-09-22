import assert from 'node:assert/strict';
import { allocatePayments } from '../src/lib/erp/payment-shares';
const result=allocatePayments([{id:'P1',amount:'70.10'},{id:'P2',amount:'80.20'}],[{id:'B1',amount:'100.00'},{id:'B2',amount:'40.00'}]);
assert.deepEqual(result.map(x=>[x.paymentId,x.shipmentAllocationId,x.amount.toFixed(2)]),[['P1','B1','70.10'],['P2','B1','29.90'],['P2','B2','40.00']]);
assert.equal(allocatePayments([{id:'advance',amount:'150'}],[]).length,0);
assert.equal(allocatePayments([],[{id:'batch',amount:'40'}]).length,0);
assert.equal(allocatePayments([{id:'p',amount:'10'}],[{id:'free',amount:'0'},{id:'paid',amount:'10'}])[0].shipmentAllocationId,'paid');
for(let i=1;i<100;i++){
 const payments=[{id:'p1',amount:(i/100).toFixed(2)},{id:'p2',amount:(i/50).toFixed(2)}];const lines=[{id:'l1',amount:'0.70'},{id:'l2',amount:'1.25'}];const shares=allocatePayments(payments,lines);
 for(const p of payments){const cents=shares.filter(s=>s.paymentId===p.id).reduce((v,s)=>v+Number(s.amount.mul(100).toFixed(0)),0);assert.ok(cents<=Math.round(Number(p.amount)*100));}
 for(const l of lines){const cents=shares.filter(s=>s.shipmentAllocationId===l.id).reduce((v,s)=>v+Number(s.amount.mul(100).toFixed(0)),0);assert.ok(cents<=Math.round(Number(l.amount)*100));}
 const total=shares.reduce((v,s)=>v+Number(s.amount.mul(100).toFixed(0)),0);assert.equal(total,Math.min(i*3,195));
}
console.log('PASS: batch payment cents conservation, partial receipts, advance receipts and zero-price shipments.');
