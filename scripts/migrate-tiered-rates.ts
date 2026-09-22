import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "myRatePercent" DOUBLE PRECISION NOT NULL DEFAULT 5;
  `);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subRatePercent" DOUBLE PRECISION;
  `);

  const hasLegacy = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'User' AND column_name = 'serviceFeePercent'
    ) AS exists;
  `);

  if (hasLegacy[0]?.exists) {
    await prisma.$executeRawUnsafe(`
      UPDATE "User"
      SET
        "myRatePercent" = 5,
        "subRatePercent" = GREATEST(COALESCE("serviceFeePercent", 5), 5)
      WHERE "role" = 'VIP';
    `);
    console.log("Migrated VIP serviceFeePercent -> myRate/subRate");
  } else {
    console.log("Legacy serviceFeePercent column not found, skipping copy");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
