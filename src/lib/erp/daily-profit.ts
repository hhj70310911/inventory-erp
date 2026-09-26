import {Prisma} from '@prisma/client';
export type DailyProfit={date:string;revenue:string|null;cost:string|null;profit:string|null;margin:string|null;shipments:number;orders:number;incomplete:number};
type Input={state:string;orderedAt:Date;fxToAud:Prisma.Decimal|null;shipments:{state:string;postedAt:Date|null;allocations:{quantity:number;unitPrice:Prisma.Decimal;unitCostAud:Prisma.Decimal|null}[]}[]};
// postedAt is the entered business date, stored at UTC midnight; do not timezone-shift it.
export function dailyProfit(orders:Input[]):DailyProfit[]{
 const days=new Map<string,{revenue:Prisma.Decimal;cost:Prisma.Decimal;missingRevenue:boolean;missingCost:boolean;shipments:number;orders:number;incomplete:number}>();
 const day=(date:Date)=>{const key=date.toISOString().slice(0,10);if(!days.has(key))days.set(key,{revenue:new Prisma.Decimal(0),cost:new Prisma.Decimal(0),missingRevenue:false,missingCost:false,shipments:0,orders:0,incomplete:0});return days.get(key)!;};
 for(const order of orders){if(order.state!=='POSTED')continue;day(order.orderedAt).orders++;
  for(const shipment of order.shipments){if(shipment.state!=='POSTED'||!shipment.postedAt)continue;const d=day(shipment.postedAt);d.shipments++;let missing=false;
   for(const a of shipment.allocations){if(order.fxToAud===null){d.missingRevenue=true;missing=true;}else d.revenue=d.revenue.add(a.unitPrice.mul(a.quantity).mul(order.fxToAud));if(a.unitCostAud===null){d.missingCost=true;missing=true;}else d.cost=d.cost.add(a.unitCostAud.mul(a.quantity));}
   if(missing)d.incomplete++;
  }
 }
 return [...days].sort(([a],[b])=>a.localeCompare(b)).map(([date,d])=>{const known=!d.missingRevenue&&!d.missingCost;const profit=d.revenue.sub(d.cost);return {date,revenue:d.missingRevenue?null:d.revenue.toFixed(2),cost:d.missingCost?null:d.cost.toFixed(2),profit:known?profit.toFixed(2):null,margin:known&&d.revenue.gt(0)?profit.div(d.revenue).mul(100).toFixed(2):null,shipments:d.shipments,orders:d.orders,incomplete:d.incomplete};});
}
