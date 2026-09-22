import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { computeMemberStats, depthLabel, getUserDepth } from "@/lib/agent-tree";
import { getCheckoutRatePercent } from "@/lib/commission";
import { formatFeePercent } from "@/lib/service-fee";
import { Role } from "@prisma/client";
import { MemberInviteForm } from "./MemberInviteForm";
import { MemberRateForm } from "./MemberRateForm";

function formatTwd(amount: number): string {
  return `NT$ ${amount.toLocaleString()}`;
}

type StatRow = { label: string; value: string };

function buildStatRows(
  stats: Awaited<ReturnType<typeof computeMemberStats>>,
  depth: number,
): StatRow[] {
  const personalRows: StatRow[] = [
    { label: "我的當月訂單累積金額", value: formatTwd(stats.personalOrderThisMonth) },
    { label: "當月個人業績", value: formatTwd(stats.personalPerformanceThisMonth) },
  ];

  if (depth >= 2) {
    return personalRows;
  }

  return [
    { label: "團隊成員", value: `${stats.teamMembers} 人` },
    { label: "推薦成員", value: `${stats.directReferrals} 人` },
    ...personalRows,
    {
      label: "上月團隊商品消費總額（不含自己）",
      value: formatTwd(stats.teamConsumptionLastMonth),
    },
    {
      label: "當月團隊商品消費總額（不含自己）",
      value: formatTwd(stats.teamConsumptionThisMonth),
    },
    { label: "當月團隊業績（含自己）", value: formatTwd(stats.teamPerformanceThisMonth) },
    {
      label: "當月直推首購商品",
      value: `${stats.directFirstPurchaseThisMonth} 人`,
    },
  ];
}

export default async function MemberPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/member");

  const role = session.user.role;
  if (role !== Role.VIP && role !== Role.BUYER && role !== Role.ADMIN) {
    redirect("/login?callbackUrl=/member");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      displayName: true,
      email: true,
      role: true,
      sponsorId: true,
      myRatePercent: true,
      subRatePercent: true,
      sponsor: {
        select: { displayName: true, email: true },
      },
    },
  });
  if (!user) redirect("/login?callbackUrl=/member");

  const depth = await getUserDepth(session.user.id);
  const checkoutRate = await getCheckoutRatePercent(session.user.id);
  const isTopAgent = role === Role.VIP && depth === 0;
  const stats = await computeMemberStats(session.user.id, role);
  const rows = buildStatRows(stats, depth);

  const displayTitle = user.displayName.trim() || user.email;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-xl font-semibold text-ink">會員中心</h1>

      <div className="mb-6 rounded-lg border border-border bg-surface p-4 shadow-card">
        <p className="text-lg font-medium text-ink">{displayTitle}</p>
        <p className="mt-1 text-sm text-muted">
          {depthLabel(stats.depth, user.role)}
        </p>
        <p className="mt-2 text-sm text-muted">
          我的代購費率：{formatFeePercent(checkoutRate)}%
          {!isTopAgent && user.sponsor ? (
            <span className="block text-xs">（由上線指派，僅供查看）</span>
          ) : null}
        </p>
        {user.sponsor ? (
          <p className="mt-1 text-xs text-muted">
            上線：{user.sponsor.displayName.trim() || user.sponsor.email}
          </p>
        ) : null}
      </div>

      {isTopAgent ? (
        <>
          <div className="mb-6">
            <Link
              href="/member/downlines"
              className="inline-block rounded border border-border bg-surface px-4 py-2 text-sm font-medium text-ink shadow-card hover:bg-page"
            >
              下線費率管理
            </Link>
          </div>
          <MemberRateForm
            userId={user.id}
            myRatePercent={checkoutRate}
            subRatePercent={user.subRatePercent ?? checkoutRate}
          />
        </>
      ) : null}

      {user.role !== Role.BUYER ? (
        <ul className="mb-8 divide-y divide-border rounded-lg border border-border bg-surface shadow-card">
          {rows.map((row) => (
            <li
              key={row.label}
              className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
            >
              <span className="text-muted">{row.label}</span>
              <span className="shrink-0 font-medium text-ink">{row.value}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {user.role === Role.VIP ? (
        <MemberInviteForm
          canInvite={stats.canInvite}
          inviteMode={stats.inviteMode}
        />
      ) : null}
    </div>
  );
}
