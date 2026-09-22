"use server";

import { auth } from "@/auth";
import {
  getMinDirectChildRate,
  getParentRateForMember,
  isMemberInTeam,
  validateChildRateUpdate,
} from "@/lib/commission";
import { getUserDepth } from "@/lib/agent-tree";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";

export type UpdateChildRateState = { error?: string; success?: boolean };

function revalidateRatePaths() {
  revalidatePath("/admin/vip-fees");
  revalidatePath("/admin/orders");
  revalidatePath("/member");
  revalidatePath("/member/downlines");
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function updateChildRateAction(
  _prev: UpdateChildRateState | undefined,
  formData: FormData,
): Promise<UpdateChildRateState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "請先登入" };

  const memberId = String(formData.get("memberId") || formData.get("userId") || "").trim();
  const raw = String(formData.get("myRatePercent") || "").trim();
  const newRate = parseFloat(raw);

  if (!memberId) return { error: "缺少會員" };
  if (!raw) return { error: "請填寫指派費率" };

  const member = await prisma.user.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      role: true,
      sponsorId: true,
      myRatePercent: true,
    },
  });
  if (!member) return { error: "會員不存在" };

  if (member.role !== Role.VIP && member.role !== Role.BUYER) {
    return { error: "僅可調整 VIP 或消費者費率" };
  }

  const editorRole = session.user.role;
  const editorId = session.user.id;

  if (editorRole === Role.ADMIN) {
    // ADMIN may edit any member rate
  } else if (editorRole === Role.VIP) {
    const depth = await getUserDepth(editorId);
    if (depth === 0) {
      const inTeam = await isMemberInTeam(editorId, memberId);
      if (!inTeam) return { error: "該會員不在您的團隊內" };
    } else if (member.sponsorId !== editorId) {
      return { error: "無權限：僅可調整直屬下線的費率" };
    }
  } else {
    return { error: "無權限" };
  }

  const [parentRate, minDirectChildRate] = await Promise.all([
    getParentRateForMember(memberId),
    getMinDirectChildRate(memberId),
  ]);

  const check = validateChildRateUpdate({
    newRate,
    parentRate,
    minDirectChildRate,
  });
  if (!check.ok) return { error: check.error };

  await prisma.user.update({
    where: { id: memberId },
    data: { myRatePercent: newRate },
  });

  revalidateRatePaths();
  return { success: true };
}
