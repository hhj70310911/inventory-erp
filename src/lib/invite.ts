import prisma from "@/lib/prisma";
import { hashToken } from "@/lib/crypto-token";

export async function getInviteForAccept(rawToken: string) {
  const token = rawToken.trim();
  if (!token) return null;

  return prisma.inviteToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
}
