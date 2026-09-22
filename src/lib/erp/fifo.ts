import { Prisma } from '@prisma/client';
type Batch = { id: string; quantity: number; unitCost: string; receivedAt: Date };
// Caller must lock warehouse balances and post allocations in one transaction.
export function allocateFifo(batches: Batch[], quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity <= 0) throw Error('Invalid quantity');
  const ids = new Set<string>();
  for (const batch of batches) {
    if (ids.has(batch.id) || !Number.isSafeInteger(batch.quantity) || batch.quantity < 0 ||
        !Number.isFinite(batch.receivedAt.getTime())) throw Error('Invalid batch');
    ids.add(batch.id);
    const cost = new Prisma.Decimal(batch.unitCost);
    if (!cost.isFinite() || cost.isNegative()) throw Error('Invalid cost');
  }
  const sorted = [...batches].sort((a,b) => a.receivedAt.getTime()-b.receivedAt.getTime() || a.id.localeCompare(b.id));
  let remaining = quantity;
  const allocations: {batchId:string;quantity:number;unitCost:Prisma.Decimal;cost:Prisma.Decimal}[] = [];
  let totalCost = new Prisma.Decimal(0);
  for (const batch of sorted) {
    if (!remaining) break;
    const take = Math.min(remaining,batch.quantity);
    if (!take) continue;
    const unitCost = new Prisma.Decimal(batch.unitCost);
    const cost = unitCost.mul(take);
    allocations.push({batchId:batch.id,quantity:take,unitCost,cost});
    totalCost = totalCost.add(cost);
    remaining -= take;
  }
  if (remaining) throw Error('Insufficient stock');
  return {allocations,totalCost};
}
