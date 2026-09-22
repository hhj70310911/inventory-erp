export function buildInviteLink(rawToken: string): string {
  const base =
    process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`
      : "") ||
    "";
  return base ? `${base}/invite/${rawToken}` : `/invite/${rawToken}`;
}
