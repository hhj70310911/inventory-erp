import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { PrismaClient, OrderStatus, Role } from "@prisma/client";
import {
  MAX_AGENT_DEPTH,
  computeMemberStats,
  depthLabel,
  getDirectReferralIds,
  getTeamMemberIds,
  getUserDepth,
  validateSponsorAssignment,
} from "../src/lib/agent-tree";

const prisma = new PrismaClient();
const RUN_ID = Date.now();
const prefix = `agent-test-${RUN_ID}`;

async function createVip(
  email: string,
  sponsorId: string | null,
  subRatePercent = 5,
): Promise<string> {
  const passwordHash = await bcrypt.hash("testpass123", 4);
  const myRatePercent = sponsorId ? subRatePercent : 5;
  const user = await prisma.user.create({
    data: {
      email,
      displayName: email.split("@")[0] ?? email,
      passwordHash,
      role: Role.VIP,
      sponsorId,
      myRatePercent,
      subRatePercent,
    },
  });
  return user.id;
}

async function createOrder(userId: string, subtotalTwd: number): Promise<void> {
  await prisma.order.create({
    data: {
      orderNumber: `${prefix}-ord-${userId.slice(-6)}-${subtotalTwd}`,
      userId,
      status: OrderStatus.COMPLETED,
      subtotalTwd,
      serviceFeePercent: 5,
      serviceFeeTwd: Math.round(subtotalTwd * 0.05),
      totalTwd: subtotalTwd + Math.round(subtotalTwd * 0.05),
    },
  });
}

async function cleanup(ids: string[]): Promise<void> {
  await prisma.order.deleteMany({ where: { userId: { in: ids } } });
  await prisma.inviteToken.deleteMany({
    where: { email: { startsWith: prefix } },
  });
  for (const id of [...ids].reverse()) {
    await prisma.user.deleteMany({ where: { id } });
  }
}

async function main(): Promise<void> {
  assert.equal(MAX_AGENT_DEPTH, 2);
  assert.equal(depthLabel(0), "頂層代理");
  assert.equal(depthLabel(1), "二級代理");
  assert.equal(depthLabel(2), "三級代理");

  const emailA = `${prefix}-a@test.local`;
  const emailB = `${prefix}-b@test.local`;
  const emailC = `${prefix}-c@test.local`;

  const idA = await createVip(emailA, null, 7);
  const idB = await createVip(emailB, idA, 10);
  const idC = await createVip(emailC, idB, 12);

  assert.equal(await getUserDepth(idA), 0);
  assert.equal(await getUserDepth(idB), 1);
  assert.equal(await getUserDepth(idC), 2);

  assert.deepEqual(await getDirectReferralIds(idA), [idB]);
  assert.deepEqual(await getDirectReferralIds(idB), [idC]);
  assert.deepEqual(await getDirectReferralIds(idC), []);

  const teamA = await getTeamMemberIds(idA);
  assert.equal(teamA.length, 2);
  assert.ok(teamA.includes(idB));
  assert.ok(teamA.includes(idC));

  const teamB = await getTeamMemberIds(idB);
  assert.deepEqual(teamB, [idC]);

  const blockAgentUnderC = await validateSponsorAssignment(idC, Role.VIP);
  assert.equal(blockAgentUnderC.ok, false);

  const allowBuyerUnderC = await validateSponsorAssignment(idC, Role.BUYER);
  assert.equal(allowBuyerUnderC.ok, true);

  const allowA = await validateSponsorAssignment(idA, Role.VIP);
  assert.equal(allowA.ok, true);

  await createOrder(idA, 1000);
  await createOrder(idB, 2000);
  await createOrder(idC, 3000);

  const statsA = await computeMemberStats(idA, Role.VIP);
  assert.equal(statsA.depth, 0);
  assert.equal(statsA.canInvite, true);
  assert.equal(statsA.inviteMode, "agent");
  assert.equal(statsA.directReferrals, 1);
  assert.equal(statsA.teamMembers, 2);
  assert.equal(statsA.personalOrderThisMonth, 1000);
  assert.equal(statsA.teamConsumptionThisMonth, 5000);
  assert.equal(statsA.teamPerformanceThisMonth, 6000);

  const statsB = await computeMemberStats(idB, Role.VIP);
  assert.equal(statsB.depth, 1);
  assert.equal(statsB.canInvite, true);
  assert.equal(statsB.inviteMode, "agent");

  const statsC = await computeMemberStats(idC, Role.VIP);
  assert.equal(statsC.depth, 2);
  assert.equal(statsC.canInvite, true);
  assert.equal(statsC.inviteMode, "buyer");
  assert.equal(statsC.directReferrals, 0);
  assert.equal(statsC.teamMembers, 0);

  console.log("Agent tree integration checks passed (A→B→C)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    const emails = [
      `${prefix}-a@test.local`,
      `${prefix}-b@test.local`,
      `${prefix}-c@test.local`,
    ];
    const users = await prisma.user.findMany({
      where: { email: { in: emails } },
      select: { id: true },
    });
    if (users.length > 0) {
      await cleanup(users.map((u) => u.id));
    }
    await prisma.$disconnect();
  });
