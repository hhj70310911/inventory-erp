import prisma from "@/lib/prisma";
import { Role } from "@prisma/client";
import { computeOrderTotals, type OrderTotals } from "@/lib/service-fee";

export const PLATFORM_BASE_RATE = 5;
export const MAX_ASSIGNED_RATE = 12;

export type CommissionSplit = {
  userId: string;
  displayName: string;
  tier: number;
  subRatePercent: number;
  marginPercent: number;
  amountTwd: number;
};

export type CommissionBreakdown = {
  finalRatePercent: number;
  platformBasePercent: number;
  platformAmountTwd: number;
  chain: CommissionSplit[];
};

export type ValidateSubRateInput = {
  myRate: number;
  subRate: number;
  sponsorSubRate: number | null;
};

export type ValidateSubRateResult =
  | { ok: true }
  | { ok: false; error: string; status: 400 };

export type ValidateAssignedRateInput = {
  memberId: string;
  newRate: number;
  currentRate: number;
  ancestorRates: number[];
  descendantRates: number[];
};

export function validateSubRate(input: ValidateSubRateInput): ValidateSubRateResult {
  const { myRate, subRate, sponsorSubRate } = input;
  const floor = sponsorSubRate ?? PLATFORM_BASE_RATE;

  if (!Number.isFinite(subRate) || subRate < PLATFORM_BASE_RATE || subRate > MAX_ASSIGNED_RATE) {
    return {
      ok: false,
      error: `費率須為 ${PLATFORM_BASE_RATE}～${MAX_ASSIGNED_RATE} 之間`,
      status: 400,
    };
  }
  if (subRate < myRate) {
    return { ok: false, error: "下線預設費率不可低於您的代購費率", status: 400 };
  }
  if (subRate < floor) {
    return {
      ok: false,
      error: `下線預設費率不可低於上線設定的 ${floor}%`,
      status: 400,
    };
  }
  return { ok: true };
}

export function validateAssignedRate(
  input: ValidateAssignedRateInput,
): ValidateSubRateResult {
  const { newRate, currentRate, ancestorRates, descendantRates } = input;

  if (!Number.isFinite(newRate) || newRate < PLATFORM_BASE_RATE || newRate > MAX_ASSIGNED_RATE) {
    return {
      ok: false,
      error: `費率須為 ${PLATFORM_BASE_RATE}～${MAX_ASSIGNED_RATE} 之間`,
      status: 400,
    };
  }

  if (newRate < currentRate - 0.0001) {
    return { ok: false, error: "指派費率不可調低，僅可維持或調高", status: 400 };
  }

  for (const ancestorRate of ancestorRates) {
    if (newRate < ancestorRate - 0.0001) {
      return {
        ok: false,
        error: `費率不可低於上線的 ${ancestorRate}%`,
        status: 400,
      };
    }
  }

  for (const descendantRate of descendantRates) {
    if (newRate > descendantRate + 0.0001) {
      return {
        ok: false,
        error: `費率不可高於下線的 ${descendantRate}%`,
        status: 400,
      };
    }
  }

  return { ok: true };
}

export function validateAdminAssignedRate(
  newRate: number,
  ancestorRates: number[],
): ValidateSubRateResult {
  if (!Number.isFinite(newRate) || newRate < PLATFORM_BASE_RATE || newRate > MAX_ASSIGNED_RATE) {
    return {
      ok: false,
      error: `費率須為 ${PLATFORM_BASE_RATE}～${MAX_ASSIGNED_RATE} 之間`,
      status: 400,
    };
  }

  for (const ancestorRate of ancestorRates) {
    if (newRate < ancestorRate - 0.0001) {
      return {
        ok: false,
        error: `費率不可低於上線的 ${ancestorRate}%`,
        status: 400,
      };
    }
  }

  return { ok: true };
}

export type ValidateChildRateUpdateInput = {
  newRate: number;
  parentRate: number | null;
  minDirectChildRate: number | null;
};

export function validateChildRateUpdate(
  input: ValidateChildRateUpdateInput,
): ValidateSubRateResult {
  const { newRate, parentRate, minDirectChildRate } = input;

  if (!Number.isFinite(newRate) || newRate < PLATFORM_BASE_RATE || newRate > MAX_ASSIGNED_RATE) {
    return {
      ok: false,
      error: `費率須為 ${PLATFORM_BASE_RATE}～${MAX_ASSIGNED_RATE} 之間`,
      status: 400,
    };
  }

  if (parentRate !== null && newRate < parentRate - 0.0001) {
    return {
      ok: false,
      error: `儲存失敗：您幫下線設定的費率（${newRate}%）不能低於您自身的成本費率（${parentRate}%）。`,
      status: 400,
    };
  }

  if (
    minDirectChildRate !== null &&
    newRate > minDirectChildRate + 0.0001
  ) {
    return {
      ok: false,
      error: `無法修改！您欲指派的費率（${newRate}%）已高於該會員目前的下線成員費率（${minDirectChildRate}%）。請通知該會員先去將其下線的費率調高，或是由管理員先協助調整底層鏈路。`,
      status: 400,
    };
  }

  return { ok: true };
}

export async function getDirectChildRates(memberId: string): Promise<number[]> {
  const children = await prisma.user.findMany({
    where: {
      sponsorId: memberId,
      role: { in: [Role.VIP, Role.BUYER] },
    },
    select: { myRatePercent: true },
  });
  return children.map((c) => c.myRatePercent);
}

export async function getMinDirectChildRate(
  memberId: string,
): Promise<number | null> {
  const rates = await getDirectChildRates(memberId);
  if (rates.length === 0) return null;
  return Math.min(...rates);
}

export async function getParentRateForMember(
  memberId: string,
): Promise<number | null> {
  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: {
      sponsor: { select: { myRatePercent: true } },
    },
  });
  return member?.sponsor?.myRatePercent ?? null;
}

type ChainLink = {
  userId: string;
  displayName: string;
  myRatePercent: number;
  role: Role;
  sponsorId: string | null;
};

export async function getCheckoutRatePercent(userId: string): Promise<number> {
  const user: { myRatePercent: number } | null = await prisma.user.findUnique({
    where: { id: userId },
    select: { myRatePercent: true },
  });
  if (!user) throw new Error("USER_NOT_FOUND");
  return user.myRatePercent;
}

async function loadChainFromBuyer(buyerId: string): Promise<ChainLink[]> {
  const links: ChainLink[] = [];
  let currentId: string | null = buyerId;

  while (currentId) {
    const user: {
      id: string;
      displayName: string;
      email: string;
      role: Role;
      myRatePercent: number;
      sponsorId: string | null;
    } | null = await prisma.user.findUnique({
      where: { id: currentId },
      select: {
        id: true,
        displayName: true,
        email: true,
        role: true,
        myRatePercent: true,
        sponsorId: true,
      },
    });
    if (!user) break;
    links.push({
      userId: user.id,
      displayName: user.displayName.trim() || user.email,
      myRatePercent: user.myRatePercent,
      role: user.role,
      sponsorId: user.sponsorId,
    });
    currentId = user.sponsorId;
  }

  return links;
}

export async function getAncestorRates(memberId: string): Promise<number[]> {
  const rates: number[] = [];
  let currentId: string | null = memberId;

  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: { sponsorId: true },
  });
  if (!member?.sponsorId) return rates;

  currentId = member.sponsorId;
  while (currentId) {
    const user: { myRatePercent: number; sponsorId: string | null } | null =
      await prisma.user.findUnique({
        where: { id: currentId },
        select: { myRatePercent: true, sponsorId: true },
      });
    if (!user) break;
    rates.push(user.myRatePercent);
    currentId = user.sponsorId;
  }

  return rates;
}

export async function getDescendantRates(memberId: string): Promise<number[]> {
  const users = await getDescendantUsers(memberId);
  return users.map((u) => u.myRatePercent);
}

export async function getDescendantUsers(
  memberId: string,
): Promise<{ id: string; myRatePercent: number }[]> {
  const result: { id: string; myRatePercent: number }[] = [];
  let frontier = [memberId];

  while (frontier.length > 0) {
    const children = await prisma.user.findMany({
      where: { sponsorId: { in: frontier } },
      select: { id: true, myRatePercent: true },
    });
    frontier = [];
    for (const child of children) {
      result.push({ id: child.id, myRatePercent: child.myRatePercent });
      frontier.push(child.id);
    }
  }

  return result;
}

export function computeCommissionBreakdownFromLinks(
  subtotalTwd: number,
  checkoutRate: number,
  linksBottomUp: ChainLink[],
): CommissionBreakdown {
  const chain: CommissionSplit[] = [];

  for (let i = 0; i < linksBottomUp.length - 1; i++) {
    const child = linksBottomUp[i]!;
    const parent = linksBottomUp[i + 1]!;
    if (parent.role !== Role.VIP) continue;

    const marginPercent = child.myRatePercent - parent.myRatePercent;
    if (marginPercent > 0) {
      chain.push({
        userId: parent.userId,
        displayName: parent.displayName,
        tier: linksBottomUp.length - 1 - i,
        subRatePercent: child.myRatePercent,
        marginPercent,
        amountTwd: Math.round((subtotalTwd * marginPercent) / 100),
      });
    }
  }

  const topLink = linksBottomUp[linksBottomUp.length - 1];
  const basePercent =
    topLink?.role === Role.VIP && !topLink.sponsorId
      ? topLink.myRatePercent
      : PLATFORM_BASE_RATE;
  const platformAmountTwd = Math.round((subtotalTwd * basePercent) / 100);

  return {
    finalRatePercent: checkoutRate,
    platformBasePercent: basePercent,
    platformAmountTwd,
    chain,
  };
}

export async function computeCommissionBreakdown(
  subtotalTwd: number,
  buyerId: string,
): Promise<CommissionBreakdown> {
  const checkoutRate = await getCheckoutRatePercent(buyerId);
  const links = await loadChainFromBuyer(buyerId);
  return computeCommissionBreakdownFromLinks(subtotalTwd, checkoutRate, links);
}

export async function computeOrderTotalsWithCommission(
  subtotalTwd: number,
  buyerId: string,
): Promise<{ totals: OrderTotals; breakdown: CommissionBreakdown }> {
  const checkoutRate = await getCheckoutRatePercent(buyerId);
  const totals = computeOrderTotals(subtotalTwd, checkoutRate);
  const links = await loadChainFromBuyer(buyerId);
  const breakdown = computeCommissionBreakdownFromLinks(
    subtotalTwd,
    checkoutRate,
    links,
  );
  return { totals, breakdown };
}

export async function isMemberInTeam(
  topAgentId: string,
  memberId: string,
): Promise<boolean> {
  if (topAgentId === memberId) return false;

  let currentId: string | null = memberId;
  while (currentId) {
    const user: { sponsorId: string | null } | null = await prisma.user.findUnique({
      where: { id: currentId },
      select: { sponsorId: true },
    });
    if (!user?.sponsorId) return false;
    if (user.sponsorId === topAgentId) return true;
    currentId = user.sponsorId;
  }
  return false;
}

export function parseCommissionBreakdown(value: unknown): CommissionBreakdown | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as CommissionBreakdown;
  if (typeof obj.finalRatePercent !== "number" || !Array.isArray(obj.chain)) return null;
  return obj;
}
