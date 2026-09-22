import Link from "next/link";
import { InviteAcceptForm } from "./InviteAcceptForm";
import { getInviteForAccept } from "@/lib/invite";

type Props = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  const invite = await getInviteForAccept(token);
  const now = new Date();
  const hasDisplayName = !!invite?.displayName.trim();

  if (!invite) {
    return (
      <div className="mx-auto max-w-sm card-surface p-8 text-center">
        <h1 className="mb-2 text-lg font-semibold text-ink">邀請無效</h1>
        <p className="text-sm text-muted">連結不正確或已失效。</p>
      </div>
    );
  }

  if (invite.usedAt) {
    return (
      <div className="mx-auto max-w-sm card-surface p-8 text-center">
        <h1 className="mb-2 text-lg font-semibold text-ink">邀請已使用</h1>
        <p className="mb-4 text-sm text-muted">此邀請連結已完成註冊。</p>
        <Link href="/login" className="text-sm text-ink underline underline-offset-4">
          前往登入
        </Link>
      </div>
    );
  }

  if (invite.expiresAt < now) {
    return (
      <div className="mx-auto max-w-sm card-surface p-8 text-center">
        <h1 className="mb-2 text-lg font-semibold text-ink">邀請已過期</h1>
        <p className="text-sm text-muted">請聯絡管理員重新發送邀請。</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm card-surface p-8">
      <h1 className="mb-2 text-lg font-semibold text-ink">VIP 邀請</h1>
      <p className="mb-6 text-sm text-muted">
        {hasDisplayName
          ? "請設定登入密碼（至少 8 字元）"
          : "請填寫稱呼並設定登入密碼（至少 8 字元）"}
      </p>
      <div className="mb-6 space-y-2 rounded-lg bg-page px-4 py-3 text-sm">
        {hasDisplayName ? (
          <p>
            <span className="text-muted">稱呼：</span>
            <span className="font-medium text-ink">{invite.displayName}</span>
          </p>
        ) : null}
        <p>
          <span className="text-muted">Email：</span>
          <span className="text-ink">{invite.email}</span>
        </p>
      </div>
      <InviteAcceptForm token={token} prefilledDisplayName={invite.displayName} />
    </div>
  );
}
