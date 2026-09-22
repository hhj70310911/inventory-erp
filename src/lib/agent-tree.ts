import prisma from "@/lib/prisma";
import { OrderStatus, Role } from "@prisma/client";

export const MAX_AGENT_DEPTH = 2;
export const MAX_TREE_DEPTH = 3;

export type InviteMode = "agent" | "buyer" | "none";

export type MemberStats = {
  depth: number;
  canInvite: boolean;
  inviteMode: InviteMode;
  directReferrals: number;
  teamMembers: number;
  personalOrderThisMonth: number;
  personalPerformanceThisMonth: number;
  teamConsumptionLastMonth: number;
  teamConsumptionThisMonth: number;
  teamPerformanceThisMonth: number;
  directFirstPurchaseThisMonth: number;
};

function monthRange(offsetMonths: number): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 1);
  return { start, end };
}

export async function getUserDepth(userId: string): Promise<number> {
  let depth = 0;
  let currentId: string | null = userId;

  while (currentId) {
    const user: { sponsorId: string | null } | null = await prisma.user.findUnique({
      where: { id: currentId },
      select: { sponsorId: true },
    });
    if (!user?.sponsorId) break;
    depth += 1;
    currentId = user.sponsorId;
    if (depth > MAX_TREE_DEPTH + 5) break;
  }

  return depth;
}

export function resolveInviteMode(
  role: Role,
  depth: number,
): { canInvite: boolean; inviteMode: InviteMode } {
  if (role === Role.BUYER) return { canInvite: false, inviteMode: "none" };
  if (role !== Role.VIP && role !== Role.ADMIN) {
    return { canInvite: false, inviteMode: "none" };
  }
  if (depth < MAX_AGENT_DEPTH) return { canInvite: true, inviteMode: "agent" };
  if (depth === MAX_AGENT_DEPTH) return { canInvite: true, inviteMode: "buyer" };
  return { canInvite: false, inviteMode: "none" };
}

export async function getDirectReferralIds(userId: string): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: {
      sponsorId: userId,
      role: { in: [Role.VIP, Role.BUYER] },
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function getTeamMemberIds(
  userId: string,
  maxDepth = MAX_TREE_DEPTH,
): Promise<string[]> {
  const ids = new Set<string>();
  let frontier = [userId];

  for (let level = 1; level <= maxDepth; level++) {
    if (frontier.length === 0) break;
    const children = await prisma.user.findMany({
      where: {
        sponsorId: { in: frontier },
        role: { in: [Role.VIP, Role.BUYER] },
      },
      select: { id: true },
    });
    frontier = children.map((c) => c.id);
    for (const id of frontier) ids.add(id);
  }

  return [...ids];
}

async function sumSubtotalForUsers(
  userIds: string[],
  start: Date,
  end: Date,
): Promise<number> {
  if (userIds.length === 0) return 0;
  const result = await prisma.order.aggregate({
    where: {
      userId: { in: userIds },
      status: OrderStatus.COMPLETED,
      createdAt: { gte: start, lt: end },
    },
    _sum: { subtotalTwd: true },
  });
  return result._sum.subtotalTwd ?? 0;
}

async function countDirectFirstPurchaseThisMonth(
  userId: string,
  monthStart: Date,
  monthEnd: Date,
): Promise<number> {
  const directIds = await getDirectReferralIds(userId);
  if (directIds.length === 0) return 0;

  let count = 0;
  for (const memberId of directIds) {
    const firstOrder = await prisma.order.findFirst({
      where: { userId: memberId, status: OrderStatus.COMPLETED },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    if (
      firstOrder &&
      firstOrder.createdAt >= monthStart &&
      firstOrder.createdAt < monthEnd
    ) {
      count += 1;
    }
  }
  return count;
}

export async function computeMemberStats(
  userId: string,
  role: Role,
): Promise<MemberStats> {
  const depth = await getUserDepth(userId);
  const { canInvite, inviteMode } = resolveInviteMode(role, depth);
  const directIds = await getDirectReferralIds(userId);
  const teamIds = await getTeamMemberIds(userId);

  const thisMonth = monthRange(0);
  const lastMonth = monthRange(-1);

  const personalOrderThisMonth = await sumSubtotalForUsers(
    [userId],
    thisMonth.start,
    thisMonth.end,
  );
  const teamConsumptionThisMonth = await sumSubtotalForUsers(
    teamIds,
    thisMonth.start,
    thisMonth.end,
  );
  const teamConsumptionLastMonth = await sumSubtotalForUsers(
    teamIds,
    lastMonth.start,
    lastMonth.end,
  );
  const teamPerformanceThisMonth =
    personalOrderThisMonth + teamConsumptionThisMonth;
  const directFirstPurchaseThisMonth = await countDirectFirstPurchaseThisMonth(
    userId,
    thisMonth.start,
    thisMonth.end,
  );

  return {
    depth,
    canInvite,
    inviteMode,
    directReferrals: directIds.length,
    teamMembers: teamIds.length,
    personalOrderThisMonth,
    personalPerformanceThisMonth: personalOrderThisMonth,
    teamConsumptionLastMonth,
    teamConsumptionThisMonth,
    teamPerformanceThisMonth,
    directFirstPurchaseThisMonth,
  };
}

export async function validateSponsorAssignment(
  sponsorId: string | null,
  inviteeRole: Role = Role.VIP,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!sponsorId) return { ok: true };

  const sponsor = await prisma.user.findUnique({
    where: { id: sponsorId },
    select: { id: true, role: true },
  });
  if (!sponsor || sponsor.role !== Role.VIP) {
    return { ok: false, error: "指定的上線無效" };
  }

  const depth = await getUserDepth(sponsorId);

  if (inviteeRole === Role.BUYER) {
    if (depth !== MAX_AGENT_DEPTH) {
      return { ok: false, error: "僅第三層代理可邀請消費者" };
    }
    return { ok: true };
  }

  if (depth >= MAX_AGENT_DEPTH) {
    return { ok: false, error: "上線已是第三層代理，無法再新增下線代理" };
  }

  return { ok: true };
}

export function depthLabel(depth: number, role?: Role): string {
  if (role === Role.BUYER) return "消費者";
  if (depth === 0) return "頂層代理";
  if (depth === 1) return "二級代理";
  if (depth === 2) return "三級代理";
  return `第 ${depth} 層`;
}

export type AgentTeamMemberInput = {
  id: string;
  email: string;
  displayName: string;
  adminNote: string;
  role: Role;
  sponsorId: string | null;
  myRatePercent: number;
  depth: number;
};

export type AgentTeamMember = AgentTeamMemberInput & {
  indentLevel: number;
  memberLabel: string;
};

export type AgentTeam = {
  rootId: string;
  rootLabel: string;
  members: AgentTeamMember[];
};

function memberLabel(user: { displayName: string; email: string }): string {
  return user.displayName.trim() || user.email;
}

export function buildAgentTeams(users: AgentTeamMemberInput[]): AgentTeam[] {
  const byId = new Map(users.map((u) => [u.id, u]));

  function getRootId(userId: string): string {
    let currentId = userId;
    const visited = new Set<string>();
    while (true) {
      const user = byId.get(currentId);
      if (!user?.sponsorId) return currentId;
      if (visited.has(currentId)) return currentId;
      visited.add(currentId);
      if (!byId.has(user.sponsorId)) return currentId;
      currentId = user.sponsorId;
    }
  }

  const teamsMap = new Map<string, AgentTeamMemberInput[]>();
  for (const user of users) {
    const rootId = getRootId(user.id);
    const list = teamsMap.get(rootId) ?? [];
    list.push(user);
    teamsMap.set(rootId, list);
  }

  const teams: AgentTeam[] = [];

  for (const [rootId, members] of teamsMap) {
    const root = byId.get(rootId);
    const rootLabel = root ? memberLabel(root) : rootId;
    const memberIds = new Set(members.map((m) => m.id));

    const childrenOf = new Map<string, AgentTeamMemberInput[]>();
    for (const m of members) {
      if (m.id === rootId) continue;
      const parentId =
        m.sponsorId && memberIds.has(m.sponsorId) ? m.sponsorId : rootId;
      const list = childrenOf.get(parentId) ?? [];
      list.push(m);
      childrenOf.set(parentId, list);
    }

    for (const children of childrenOf.values()) {
      children.sort((a, b) =>
        memberLabel(a).localeCompare(memberLabel(b), "zh-Hant"),
      );
    }

    const ordered: AgentTeamMember[] = [];
    function walk(nodeId: string, indent: number) {
      const node = members.find((m) => m.id === nodeId);
      if (!node) return;
      ordered.push({
        ...node,
        indentLevel: indent,
        memberLabel: memberLabel(node),
      });
      for (const child of childrenOf.get(nodeId) ?? []) {
        walk(child.id, indent + 1);
      }
    }
    walk(rootId, 0);

    teams.push({ rootId, rootLabel, members: ordered });
  }

  teams.sort((a, b) => a.rootLabel.localeCompare(b.rootLabel, "zh-Hant"));
  return teams;
}

export async function resolveInviteeRoleForInviter(
  inviterId: string,
  inviterRole: Role,
): Promise<Role> {
  if (inviterRole === Role.ADMIN) return Role.VIP;
  const depth = await getUserDepth(inviterId);
  if (depth === MAX_AGENT_DEPTH) return Role.BUYER;
  return Role.VIP;
}
