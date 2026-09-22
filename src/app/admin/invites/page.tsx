import Link from "next/link";
import prisma from "@/lib/prisma";
import { getUserDepth, MAX_AGENT_DEPTH } from "@/lib/agent-tree";
import { InviteCreateForm } from "./InviteCreateForm";
import { RevokeButton } from "./RevokeButton";

export default async function AdminInvitesPage() {
  const [invites, vips] = await Promise.all([
    prisma.inviteToken.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        inviter: { select: { email: true, displayName: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: "VIP" },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, displayName: true, sponsorId: true },
    }),
  ]);

  const sponsorOptions: { id: string; label: string }[] = [];
  for (const vip of vips) {
    const depth = await getUserDepth(vip.id);
    if (depth < MAX_AGENT_DEPTH) {
      sponsorOptions.push({
        id: vip.id,
        label: `${vip.displayName.trim() || vip.email}（${depth === 0 ? "頂層" : "二級"}）`,
      });
    }
  }

  const now = new Date();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">VIP 邀請</h1>
        <Link href="/admin" className="text-sm underline underline-offset-4">
          ← 後台首頁
        </Link>
      </div>

      <InviteCreateForm sponsorOptions={sponsorOptions} />

      {invites.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-3 text-sm font-semibold text-neutral-700">已發出的邀請</h2>
          <ul className="divide-y divide-neutral-200 border border-neutral-200 text-sm">
            {invites.map((inv) => {
              const expired = inv.expiresAt < now;
              const used = !!inv.usedAt;
              const status = used ? "已使用" : expired ? "已過期" : "待使用";
              const statusColor = used
                ? "text-green-700"
                : expired
                  ? "text-neutral-400"
                  : "text-blue-600";
              return (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">
                      {inv.displayName.trim() || inv.email}
                    </span>
                    {inv.displayName.trim() ? (
                      <span className="text-xs text-neutral-500">{inv.email}</span>
                    ) : (
                      <span className="text-xs text-neutral-400">稱呼待客戶填寫 · {inv.email}</span>
                    )}
                    <span className="text-xs text-neutral-400">
                      效期至 {inv.expiresAt.toLocaleDateString("zh-TW")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`font-medium ${statusColor}`}>{status}</span>
                    {!used && <RevokeButton id={inv.id} />}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

