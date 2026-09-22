export type UserIdentity = {
  displayName: string;
  email: string;
  adminNote?: string;
};

export function userDisplayLabel(user: UserIdentity): string {
  const name = user.displayName.trim();
  return name || user.email;
}

export function userHasDisplayName(user: UserIdentity): boolean {
  return user.displayName.trim().length > 0;
}
