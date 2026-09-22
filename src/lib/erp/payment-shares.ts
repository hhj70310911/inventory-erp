import { Prisma } from '@prisma/client';
// Each receipt is applied once: oldest shipped line first; excess remains an order advance.
export function allocatePayments(payments:{id:string;amount:string}[],lines:{id:string;amount:string}[]){
 const demand=lines.map(l=>({...l,left:new Prisma.Decimal(l.amount)}));
 const shares:{paymentId:string;shipmentAllocationId:string;amount:Prisma.Decimal}[]=[];
 for(const payment of payments){let remaining=new Prisma.Decimal(payment.amount);for(const line of demand){if(remaining.lte(0))break;const amount=Prisma.Decimal.min(remaining,line.left);if(amount.gt(0)){shares.push({paymentId:payment.id,shipmentAllocationId:line.id,amount});line.left=line.left.sub(amount);remaining=remaining.sub(amount);}}}
 return shares;
}
export async function rebuildPaymentShares(tx:Prisma.TransactionClient,orderId:string){
 const payments=await tx.paymentAllocation.findMany({where:{orderId,payment:{state:'POSTED'}},include:{payment:true},orderBy:[{payment:{receivedAt:'asc'}},{payment:{createdAt:'asc'}},{paymentId:'asc'}]});
 const lines=await tx.shipmentAllocation.findMany({where:{shipment:{orderId,state:'POSTED'}},orderBy:[{shipment:{postedAt:'asc'}},{shipment:{createdAt:'asc'}},{shipmentId:'asc'},{salesLineId:'asc'},{batch:{receivedAt:'asc'}},{batchId:'asc'},{id:'asc'}]});
 await tx.paymentBatchAllocation.deleteMany({where:{shipmentAllocation:{shipment:{orderId}}}});
 const shares=allocatePayments(payments.map(p=>({id:p.paymentId,amount:p.amount.toString()})),lines.map(l=>({id:l.id,amount:l.unitPrice.mul(l.quantity).toFixed(2)})));
 if(shares.length)await tx.paymentBatchAllocation.createMany({data:shares});
}
