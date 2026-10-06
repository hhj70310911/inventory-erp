ALTER TABLE "User" ADD COLUMN "cashView" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "cashEdit" BOOLEAN NOT NULL DEFAULT false;
CREATE TABLE "CashEntry" (
 "id" TEXT PRIMARY KEY, "date" DATE NOT NULL, "kind" VARCHAR(20) NOT NULL,
 "category" TEXT NOT NULL, "amount" DECIMAL(18,2) NOT NULL, "currency" VARCHAR(3) NOT NULL,
 "fxToAud" DECIMAL(18,8) NOT NULL, "amountAud" DECIMAL(28,10) NOT NULL,
 "account" TEXT NOT NULL, "counterparty" TEXT NOT NULL DEFAULT '', "note" TEXT NOT NULL DEFAULT '',
 "actorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "version" INTEGER NOT NULL DEFAULT 0, "voided" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CashEntry_valid_amount" CHECK ("amount" > 0 AND "fxToAud" > 0 AND "amountAud" = "amount" * "fxToAud"),
 CONSTRAINT "CashEntry_valid_currency" CHECK ("currency" IN ('AUD','CNY') AND ("currency" != 'AUD' OR "fxToAud" = 1)),
 CONSTRAINT "CashEntry_valid_kind" CHECK ("kind" IN ('EXPENSE','INCOME','CAPITAL_IN','CAPITAL_OUT'))
);
CREATE INDEX "CashEntry_date_voided_idx" ON "CashEntry"("date","voided");
CREATE INDEX "CashEntry_actorId_idx" ON "CashEntry"("actorId");
