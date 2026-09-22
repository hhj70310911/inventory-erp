-- AlterTable
ALTER TABLE "InventorySku" ADD COLUMN     "groupName" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "currency" SET DEFAULT 'AUD';

-- AlterTable
ALTER TABLE "InventoryBatch" ADD COLUMN     "fxToAud" DECIMAL(18,8),
ADD COLUMN     "label" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "unitCostAud" DECIMAL(28,12),
ALTER COLUMN "currency" SET DEFAULT 'AUD';

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "note" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "note" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "PurchaseOrder" ALTER COLUMN "currency" SET DEFAULT 'AUD';

-- AlterTable
ALTER TABLE "PurchaseReceipt" ADD COLUMN     "note" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "SalesOrder" ADD COLUMN     "fxToAud" DECIMAL(18,8),
ADD COLUMN     "note" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "currency" SET DEFAULT 'AUD';

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "note" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "ShipmentAllocation" ADD COLUMN     "unitCostAud" DECIMAL(28,12);

-- AlterTable
ALTER TABLE "CustomerPayment" ADD COLUMN     "note" TEXT NOT NULL DEFAULT '',
ALTER COLUMN "currency" SET DEFAULT 'AUD';

-- CreateTable
CREATE TABLE "PaymentBatchAllocation" (
    "paymentId" TEXT NOT NULL,
    "shipmentAllocationId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "PaymentBatchAllocation_pkey" PRIMARY KEY ("paymentId","shipmentAllocationId")
);

-- CreateIndex
CREATE INDEX "PaymentBatchAllocation_shipmentAllocationId_idx" ON "PaymentBatchAllocation"("shipmentAllocationId");

-- AddForeignKey
ALTER TABLE "PaymentBatchAllocation" ADD CONSTRAINT "PaymentBatchAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "CustomerPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentBatchAllocation" ADD CONSTRAINT "PaymentBatchAllocation_shipmentAllocationId_fkey" FOREIGN KEY ("shipmentAllocationId") REFERENCES "ShipmentAllocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Preserve historic native currencies; only AUD has a known conversion without user input.
UPDATE "InventoryBatch" SET "fxToAud"=1,"unitCostAud"="unitCost" WHERE "currency"='AUD';
UPDATE "SalesOrder" SET "orderedAt"="createdAt";
UPDATE "SalesOrder" SET "fxToAud"=1 WHERE "currency"='AUD';
UPDATE "ShipmentAllocation" a SET "unitCostAud"=a."unitCost" FROM "InventoryBatch" b WHERE a."batchId"=b.id AND b.currency='AUD';
ALTER TABLE "InventoryBatch" ADD CONSTRAINT "batch_fx_positive" CHECK ("fxToAud" IS NULL OR "fxToAud">0);
ALTER TABLE "SalesOrder" ADD CONSTRAINT "order_fx_positive" CHECK ("fxToAud" IS NULL OR "fxToAud">0);
ALTER TABLE "PaymentBatchAllocation" ADD CONSTRAINT "batch_payment_positive" CHECK (amount>0);
-- Allocate existing posted payments by matching cumulative payment and shipment value intervals.
WITH p AS (
 SELECT a."orderId",a."paymentId",a.amount,
 SUM(a.amount) OVER (PARTITION BY a."orderId" ORDER BY p."receivedAt",p."createdAt",a."paymentId" ROWS UNBOUNDED PRECEDING) AS ending
 FROM "PaymentAllocation" a JOIN "CustomerPayment" p ON p.id=a."paymentId" WHERE p.state='POSTED'
), s AS (
 SELECT s."orderId",a.id,a."unitPrice"*a.quantity AS amount,
 SUM(a."unitPrice"*a.quantity) OVER (PARTITION BY s."orderId" ORDER BY s."postedAt",s."createdAt",s.id,a."salesLineId",b."receivedAt",b.id,a.id ROWS UNBOUNDED PRECEDING) AS ending
 FROM "ShipmentAllocation" a JOIN "Shipment" s ON s.id=a."shipmentId" JOIN "InventoryBatch" b ON b.id=a."batchId" WHERE s.state='POSTED'
)
INSERT INTO "PaymentBatchAllocation" ("paymentId","shipmentAllocationId",amount)
SELECT p."paymentId",s.id,LEAST(p.ending,s.ending)-GREATEST(p.ending-p.amount,s.ending-s.amount)
FROM p JOIN s ON s."orderId"=p."orderId" WHERE LEAST(p.ending,s.ending)>GREATEST(p.ending-p.amount,s.ending-s.amount);
