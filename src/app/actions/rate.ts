"use server";

import { auth } from "@/auth";
import { getCheckoutRatePercent, validateSubRate } from "@/lib/commission";
import { getUserDepth } from "@/lib/agent-tree";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";

export type UpdateSubRateState = { error?: string; success?: boolean };

export async function updateSubRateAction(
  _prev: UpdateSubRateState | undefined,
  formData: FormData,
): Promise<UpdateSubRateState> {
  const session = await auth();
  if (!session?.user?.id) return { error: "請先登入" };

  const role = session.user.role;
  if (role !== Role.VIP && role !== Role.ADMIN) {
    return { error: "僅代理可設定下線預設費率" };
  }

  if (role === Role.VIP) {
    const depth = await getUserDepth(session.user.id);
    if (depth !== 0) return { error: "僅頂層代理可設定新邀請預設費率" };
  }

  const raw = String(formData.get("subRatePercent") || "").trim();
  const subRate = parseFloat(raw);
  const targetUserId = String(formData.get("userId") || "").trim() || session.user.id;

  if (role === Role.VIP && targetUserId !== session.user.id) {
    return { error: "無權限" };
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      id: true,
      role: true,
      sponsor: { select: { subRatePercent: true } },
    },
  });
  if (!user || user.role !== Role.VIP) return { error: "僅可修改代理預設費率" };

  const myRate = await getCheckoutRatePercent(targetUserId);
  const check = validateSubRate({
    myRate,
    subRate,
    sponsorSubRate: user.sponsor?.subRatePercent ?? null,
  });
  if (!check.ok) return { error: check.error };

  await prisma.user.update({
    where: { id: targetUserId },
    data: { subRatePercent: subRate },
  });

  revalidatePath("/member");
  revalidatePath("/admin/vip-fees");
  return { success: true };
}
