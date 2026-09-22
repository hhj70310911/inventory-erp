import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { depthLabel, getTeamMemberIds, getUserDepth } from "@/lib/agent-tree";
import { PLATFORM_BASE_RATE } from "@/lib/commission";
import { Role } from "@prisma/client";
import { DownlineRateRow } from "./DownlineRateRow";

function roleLabel(role: Role): string {
  if (role === Role.BUYER) return "消費者";
  return "代理";
}

export default async function MemberDownlinesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/member/downlines");

  const role = session.user.role;
  if (role !== Role.VIP) redirect("/member");

  const depth = await getUserDepth(session.user.id);
  if (depth !== 0) redirect("/member");

  const teamIds = await getTeamMemberIds(session.user.id);
  const members = await prisma.user.findMany({
    where: { id: { in: teamIds }, role: Role.VIP },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      myRatePercent: true,
      sponsorId: true,
    },
  });

  const membersWithDepth = await Promise.all(
    members.map(async (m) => ({
      ...m,
      depth: await getUserDepth(m.id),
    })),
  );

  membersWithDepth.sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    const nameA = a.displayName.trim() || a.email;
    const nameB = b.displayName.trim() || b.email;
    return nameA.localeCompare(nameB, "zh-Hant");
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-ink">下線費率管理</h1>
        <Link href="/member" className="text-sm text-muted underline">
          ← 會員中心
        </Link>
      </div>
      <p className="mb-6 text-sm text-muted">
        為團隊內所有二級、三級代理個別指派代購費率（{PLATFORM_BASE_RATE}%～12%）。各會員費率獨立儲存。
      </p>

      {membersWithDepth.length === 0 ? (
        <p className="text-sm text-muted">尚無團隊代理</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-card">
          <div className="hidden min-w-[36rem] grid-cols-[1fr_5rem_5rem_6rem_auto] gap-x-2 border-b border-border bg-page px-3 py-2 text-xs font-medium text-muted sm:grid">
            <span>成員</span>
            <span>角色</span>
            <span>深度</span>
            <span>指派費率</span>
            <span />
          </div>
          <ul className="min-w-[36rem] divide-y divide-border">
            {membersWithDepth.map((m) => (
              <DownlineRateRow
                key={m.id}
                memberId={m.id}
                displayName={m.displayName}
                email={m.email}
                roleLabel={roleLabel(m.role)}
                depthLabel={depthLabel(m.depth, m.role)}
                myRatePercent={m.myRatePercent}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
