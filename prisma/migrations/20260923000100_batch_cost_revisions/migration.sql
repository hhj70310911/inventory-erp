
ALTER TABLE "InventoryBatch" ADD COLUMN "costVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ShipmentAllocation" ADD COLUMN "costVersion" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "BatchCostAdjustment" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "batchId" TEXT NOT NULL,
 "eventId" TEXT NOT NULL,
 "version" INTEGER NOT NULL,
 "oldCost" DECIMAL(18,4) NOT NULL,
 "newCost" DECIMAL(18,4) NOT NULL,
 "oldCostAud" DECIMAL(28,12) NOT NULL,
 "newCostAud" DECIMAL(28,12) NOT NULL,
 "quantity" INTEGER NOT NULL,
 "warehouses" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "BatchCostAdjustment_valid" CHECK ("version">0 AND "quantity">0 AND "oldCost">=0 AND "newCost">=0 AND "oldCostAud">=0 AND "newCostAud">=0),
 CONSTRAINT "BatchCostAdjustment_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "InventoryBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "BatchCostAdjustment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "AuditEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BatchCostAdjustment_eventId_key" ON "BatchCostAdjustment"("eventId");
CREATE UNIQUE INDEX "BatchCostAdjustment_batchId_version_key" ON "BatchCostAdjustment"("batchId", "version");
