export type OrderDocument = {
 kind:'order'|'shipment'; number:string; orderNumber:string; customer:string;
 date:string; generatedAt:string; currency:string; state:string;
 warehouse?:string; actor?:string; note:string;
 rows:{sku:string;name:string;unit:string;quantity:number;price:string;amount:string}[];
 total:string; orderTotal:string; paid:string|null; due:string|null;
};
