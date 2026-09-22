import { userDisplayLabel, userHasDisplayName, type UserIdentity } from "@/lib/user-display";

type Props = {
  user: UserIdentity;
  showAdminNote?: boolean;
  className?: string;
};

export function AdminUserIdentity({ user, showAdminNote = false, className = "" }: Props) {
  const label = userDisplayLabel(user);
  const hasName = userHasDisplayName(user);
  const note = user.adminNote?.trim();

  return (
    <div className={className}>
      <p className="font-medium text-neutral-900">{label}</p>
      {hasName ? <p className="text-sm text-neutral-500">{user.email}</p> : null}
      {showAdminNote && note ? (
        <p className="mt-1 text-xs text-neutral-500">備註：{note}</p>
      ) : null}
    </div>
  );
}
