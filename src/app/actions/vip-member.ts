"use server";

import { auth } from "@/auth";
import {
  getMinDirectChildRate,
  getParentRateForMember,
  validateChildRateUpdate,
} from "@/lib/commission";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Role } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("FORBIDDEN");
}

export type UpdateVipMemberState = { error?: string; success?: boolean };

function revalidateRatePaths() {
  revalidatePath("/admin/vip-fees");
  revalidatePath("/admin/orders");
  revalidatePath("/member");
  revalidatePath("/member/downlines");
  revalidatePath("/cart");
  revalidatePath("/checkout");
}

export async function updateVipMemberAction(
  _prev: UpdateVipMemberState | undefined,
  formData: FormData,
): Promise<UpdateVipMemberState> {
  try {
    await requireAdmin();
  } catch {
    return { error: "無權限" };
  }

  const userId = String(formData.get("userId") || "").trim();
  const displayName = String(formData.get("displayName") || "").trim();
  const adminNote = String(formData.get("adminNote") || "").trim();
  const myRateRaw = String(formData.get("myRatePercent") || "").trim();

  if (!userId) return { error: "缺少使用者" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      myRatePercent: true,
    },
  });
  if (!user) return { error: "使用者不存在" };

  const newMyRate = parseFloat(myRateRaw);
  const updateData: {
    displayName: string;
    adminNote: string;
    myRatePercent?: number;
  } = { displayName, adminNote };

  if (user.role === Role.VIP || user.role === Role.BUYER) {
    if (!myRateRaw) return { error: "請填寫指派費率" };

    const [parentRate, minDirectChildRate] = await Promise.all([
      getParentRateForMember(userId),
      getMinDirectChildRate(userId),
    ]);

    const check = validateChildRateUpdate({
      newRate: newMyRate,
      parentRate,
      minDirectChildRate,
    });
    if (!check.ok) return { error: check.error };

    if (Math.abs(newMyRate - user.myRatePercent) > 0.0001) {
      updateData.myRatePercent = newMyRate;
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  revalidateRatePaths();
  return { success: true };
}
