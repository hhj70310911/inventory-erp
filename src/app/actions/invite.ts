"use server";

import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { auth, signIn } from "@/auth";
import {
  getUserDepth,
  resolveInviteeRoleForInviter,
  validateSponsorAssignment,
} from "@/lib/agent-tree";
import { PLATFORM_BASE_RATE } from "@/lib/commission";
import { generateInviteToken, hashToken } from "@/lib/crypto-token";
import { buildInviteLink } from "@/lib/invite-link";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type CreateInviteState = { error?: string; link?: string };

async function createInviteRecord(data: {
  email: string;
  displayName: string;
  inviterId: string | null;
  sponsorId: string | null;
  inviteeRole: Role;
}): Promise<CreateInviteState> {
  const email = data.email.toLowerCase().trim();
  const displayName = data.displayName.trim();

  if (!email || !email.includes("@")) {
    return { error: "Email 無效" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "該 Email 已註冊" };
  }

  const sponsorCheck = await validateSponsorAssignment(
    data.sponsorId,
    data.inviteeRole,
  );
  if (!sponsorCheck.ok) return { error: sponsorCheck.error };

  await prisma.inviteToken.deleteMany({
    where: { email, usedAt: null },
  });

  const raw = generateInviteToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.inviteToken.create({
    data: {
      email,
      displayName,
      tokenHash,
      expiresAt,
      inviterId: data.inviterId,
      sponsorId: data.sponsorId,
      inviteeRole: data.inviteeRole,
    },
  });

  return { link: buildInviteLink(raw) };
}

export async function createInviteAction(
  _prev: CreateInviteState | undefined,
  formData: FormData,
): Promise<CreateInviteState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { error: "無權限" };
  }

  const email = String(formData.get("email") || "");
  const displayName = String(formData.get("displayName") || "");
  const sponsorIdRaw = String(formData.get("sponsorId") || "").trim();
  const sponsorId = sponsorIdRaw || null;

  const result = await createInviteRecord({
    email,
    displayName,
    inviterId: session.user.id,
    sponsorId,
    inviteeRole: Role.VIP,
  });

  if (result.link) revalidatePath("/admin/invites");
  return result;
}

export async function createMemberInviteAction(
  _prev: CreateInviteState | undefined,
  formData: FormData,
): Promise<CreateInviteState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "請先登入" };

  const role = session.user.role;
  if (role !== "VIP" && role !== "ADMIN") {
    return { error: "無權限" };
  }

  const email = String(formData.get("email") || "");
  const displayName = String(formData.get("displayName") || "");

  const inviteeRole =
    role === "ADMIN"
      ? Role.VIP
      : await resolveInviteeRoleForInviter(session.user.id, role);

  if (role === "VIP") {
    const depth = await getUserDepth(session.user.id);
    if (inviteeRole === Role.VIP && depth >= 2) {
      return { error: "您已是第三層代理，無法再邀請下線代理" };
    }
    if (inviteeRole === Role.BUYER && depth !== 2) {
      return { error: "僅第三層代理可邀請消費者" };
    }
  }

  const sponsorId =
    role === "VIP" ? session.user.id : String(formData.get("sponsorId") || "").trim() || null;

  const result = await createInviteRecord({
    email,
    displayName,
    inviterId: session.user.id,
    sponsorId,
    inviteeRole,
  });

  if (result.link) revalidatePath("/member");
  return result;
}

export type RevokeInviteState = { error?: string; success?: boolean };

export async function revokeInviteAction(id: string): Promise<RevokeInviteState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "無權限" };
  await prisma.inviteToken.delete({ where: { id } });
  revalidatePath("/admin/invites");
  return { success: true };
}

export type AcceptInviteState = { success?: boolean; error?: string };

export async function acceptInviteAction(
  _prev: AcceptInviteState | undefined,
  formData: FormData,
): Promise<AcceptInviteState> {
  const rawToken = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  const displayNameFromForm = String(formData.get("displayName") || "").trim();

  if (password.length < 8) return { error: "密碼至少 8 字元" };
  if (password !== confirm) return { error: "兩次密碼不同" };

  const tokenHash = hashToken(rawToken);
  const invite = await prisma.inviteToken.findUnique({ where: { tokenHash } });

  if (!invite || invite.usedAt) return { error: "邀請無效或已使用" };
  if (invite.expiresAt < new Date()) return { error: "邀請已過期" };

  const taken = await prisma.user.findUnique({ where: { email: invite.email } });
  if (taken) return { error: "該 Email 已註冊" };

  const displayName = invite.displayName.trim() || displayNameFromForm;
  if (!displayName) return { error: "請填稱呼" };

  const sponsorCheck = await validateSponsorAssignment(
    invite.sponsorId,
    invite.inviteeRole,
  );
  if (!sponsorCheck.ok) return { error: sponsorCheck.error };

  const myRatePercent = PLATFORM_BASE_RATE;
  const subRatePercent: number | null =
    invite.inviteeRole === Role.BUYER ? null : PLATFORM_BASE_RATE;

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction([
    prisma.user.create({
      data: {
        email: invite.email,
        displayName,
        passwordHash,
        role: invite.inviteeRole,
        myRatePercent,
        subRatePercent,
        sponsorId: invite.sponsorId,
      },
    }),
    prisma.inviteToken.update({ where: { id: invite.id }, data: { usedAt: new Date() } }),
  ]);

  await signIn("credentials", { email: invite.email, password, redirectTo: "/" });

  return { success: true };
}
