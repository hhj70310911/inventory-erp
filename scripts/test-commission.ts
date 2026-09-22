import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";
import {
  PLATFORM_BASE_RATE,
  MAX_ASSIGNED_RATE,
  computeCommissionBreakdownFromLinks,
  validateChildRateUpdate,
  getCheckoutRatePercent,
} from "../src/lib/commission";

const prisma = new PrismaClient();
const RUN_ID = Date.now();
const prefix = `commission-test-${RUN_ID}`;

async function createUser(data: {
  email: string;
  role: Role;
  sponsorId: string | null;
  myRatePercent: number;
  subRatePercent: number | null;
}): Promise<string> {
  const passwordHash = await bcrypt.hash("testpass123", 4);
  const user = await prisma.user.create({
    data: {
      email: data.email,
      displayName: data.email.split("@")[0] ?? data.email,
      passwordHash,
      role: data.role,
      sponsorId: data.sponsorId,
      myRatePercent: data.myRatePercent,
      subRatePercent: data.subRatePercent,
    },
  });
  return user.id;
}

async function cleanup(ids: string[]): Promise<void> {
  for (const id of [...ids].reverse()) {
    await prisma.user.deleteMany({ where: { id } });
  }
}

function unitTests(): void {
  assert.equal(PLATFORM_BASE_RATE, 5);
  assert.equal(MAX_ASSIGNED_RATE, 12);

  const ruleA = validateChildRateUpdate({
    newRate: 5,
    parentRate: 7,
    minDirectChildRate: null,
  });
  assert.equal(ruleA.ok, false);
  if (!ruleA.ok) {
    assert.match(ruleA.error, /不能低於您自身的成本費率/);
  }

  const ruleB = validateChildRateUpdate({
    newRate: 7,
    parentRate: 5,
    minDirectChildRate: 5,
  });
  assert.equal(ruleB.ok, false);
  if (!ruleB.ok) {
    assert.match(ruleB.error, /已高於該會員目前的下線成員費率/);
  }

  const okAfterChildRaised = validateChildRateUpdate({
    newRate: 7,
    parentRate: 5,
    minDirectChildRate: 10,
  });
  assert.equal(okAfterChildRaised.ok, true);

  const okLower = validateChildRateUpdate({
    newRate: 8,
    parentRate: 5,
    minDirectChildRate: 10,
  });
  assert.equal(okLower.ok, true);

  const links = [
    {
      userId: "d",
      displayName: "D",
      myRatePercent: 12,
      role: Role.BUYER,
      sponsorId: "c",
    },
    {
      userId: "c",
      displayName: "C",
      myRatePercent: 10,
      role: Role.VIP,
      sponsorId: "b",
    },
    {
      userId: "b",
      displayName: "B",
      myRatePercent: 7,
      role: Role.VIP,
      sponsorId: "a",
    },
    {
      userId: "a",
      displayName: "A",
      myRatePercent: 5,
      role: Role.VIP,
      sponsorId: null,
    },
  ];
  const breakdown = computeCommissionBreakdownFromLinks(1000, 12, links);
  assert.equal(breakdown.platformAmountTwd, 50);
  assert.equal(breakdown.platformBasePercent, 5);
  assert.equal(breakdown.chain.length, 3);
  const totalMargin =
    breakdown.chain.reduce((s, c) => s + c.amountTwd, 0) + breakdown.platformAmountTwd;
  assert.equal(totalMargin, 120);

  const linksTop7 = [
    ...links.slice(0, -1),
    { ...links[3]!, myRatePercent: 7 },
  ];
  const breakdownTop7 = computeCommissionBreakdownFromLinks(1000, 12, linksTop7);
  assert.equal(breakdownTop7.platformBasePercent, 7);
  assert.equal(breakdownTop7.platformAmountTwd, 70);
  assert.equal(
    breakdownTop7.chain.reduce((s, c) => s + c.amountTwd, 0) + breakdownTop7.platformAmountTwd,
    120,
  );
}

async function integrationTests(): Promise<string[]> {
  const idA = await createUser({
    email: `${prefix}-a@test.local`,
    role: Role.VIP,
    sponsorId: null,
    myRatePercent: 5,
    subRatePercent: 7,
  });
  const idB = await createUser({
    email: `${prefix}-b@test.local`,
    role: Role.VIP,
    sponsorId: idA,
    myRatePercent: 7,
    subRatePercent: 7,
  });
  const idC = await createUser({
    email: `${prefix}-c@test.local`,
    role: Role.VIP,
    sponsorId: idB,
    myRatePercent: 10,
    subRatePercent: 10,
  });
  const idD = await createUser({
    email: `${prefix}-d@test.local`,
    role: Role.BUYER,
    sponsorId: idC,
    myRatePercent: 12,
    subRatePercent: null,
  });
  const ids = [idA, idB, idC, idD];

  assert.equal(await getCheckoutRatePercent(idA), 5);
  assert.equal(await getCheckoutRatePercent(idD), 12);

  const { computeCommissionBreakdown } = await import("../src/lib/commission");
  const dBreakdown = await computeCommissionBreakdown(1000, idD);
  assert.equal(dBreakdown.finalRatePercent, 12);
  assert.equal(
    dBreakdown.chain.reduce((s, c) => s + c.amountTwd, 0) + dBreakdown.platformAmountTwd,
    120,
  );

  const cBreakdown = await computeCommissionBreakdown(1000, idC);
  assert.equal(cBreakdown.finalRatePercent, 10);
  assert.equal(cBreakdown.chain.length, 2);

  await prisma.user.update({
    where: { id: idA },
    data: { myRatePercent: 7 },
  });
  const bUnchanged = await prisma.user.findUnique({
    where: { id: idB },
    select: { myRatePercent: true },
  });
  assert.equal(bUnchanged?.myRatePercent, 7);

  return ids;
}

async function main(): Promise<void> {
  unitTests();
  const ids = await integrationTests();
  console.log("Commission tests passed (independent absolute rates)");
  await cleanup(ids);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
