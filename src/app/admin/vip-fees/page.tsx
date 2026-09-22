import Link from "next/link";
import prisma from "@/lib/prisma";
import { buildAgentTeams, getUserDepth } from "@/lib/agent-tree";
import { PLATFORM_BASE_RATE } from "@/lib/commission";
import { Role } from "@prisma/client";
import { VipTeamSection } from "./VipTeamSection";

export default async function AdminVipFeesPage() {
  const users = await prisma.user.findMany({
    where: { role: { in: [Role.VIP, Role.BUYER] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      displayName: true,
      adminNote: true,
      role: true,
      sponsorId: true,
      myRatePercent: true,
      createdAt: true,
    },
  });

  const usersWithDepth = await Promise.all(
    users.map(async (u) => ({
      ...u,
      depth: await getUserDepth(u.id),
    })),
  );

  const teams = buildAgentTeams(usersWithDepth);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">VIP 會員</h1>
        <Link href="/admin" className="text-sm underline underline-offset-4">
          ← 後台
        </Link>
      </div>
      <p className="mb-4 max-w-2xl text-sm text-neutral-600">
        管理稱呼、備註與指派費率（{PLATFORM_BASE_RATE}%～12%）。依頂層代理分組顯示，各會員費率獨立儲存。
      </p>
      {teams.length === 0 ? (
        <p className="text-sm text-neutral-500">尚無會員</p>
      ) : (
        <div className="space-y-6">
          {teams.map((team) => (
            <VipTeamSection key={team.rootId} team={team} />
          ))}
        </div>
      )}
    </div>
  );
}
