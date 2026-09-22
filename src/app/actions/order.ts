"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { generateOrderNumber } from "@/lib/order-number";
import { computeOrderTotalsWithCommission } from "@/lib/commission";
import { canShopRole } from "@/lib/shop";
import { variantSpecLabel } from "@/lib/variants";
import { revalidatePath } from "next/cache";
import { OrderStatus, type Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

async function requireShopper() {
  const session = await auth();
  const role = session?.user?.role;
  if (!canShopRole(role)) throw new Error("FORBIDDEN");
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user.id;
}

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") throw new Error("FORBIDDEN");
}

export type PlaceOrderState = { error?: string };

export async function placeOrderAction(
  _prev: PlaceOrderState | undefined,
  formData: FormData,
): Promise<PlaceOrderState> {
  let userId: string;
  try {
    userId = await requireShopper();
  } catch {
    return { error: "請先登入 VIP 會員" };
  }

  const note = String(formData.get("note") || "").trim() || null;

  const cartItems = await prisma.cartItem.findMany({
    where: { userId },
    include: {
      variant: {
        include: {
          product: { select: { id: true, title: true, published: true } },
          values: {
            include: { optionValue: { include: { option: true } } },
          },
        },
      },
    },
  });

  if (cartItems.length === 0) return { error: "購物車是空的" };

  for (const item of cartItems) {
    if (!item.variant.product.published) {
      return { error: `「${item.variant.product.title}」已下架` };
    }
    if (!item.variant.acceptOrders) {
      return { error: `「${item.variant.product.title}」此規格暫停接單，請移出購物車` };
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) return { error: "使用者不存在" };

  const orderNumber = await generateOrderNumber();
  let subtotalTwd = 0;
  const lineItems = cartItems.map((item) => {
    const lineTotal = item.variant.priceTwd * item.quantity;
    subtotalTwd += lineTotal;
    const specLabel = item.variant.values.length
      ? variantSpecLabel(item.variant.values)
      : "";
    return {
      productId: item.variant.product.id,
      variantId: item.variant.id,
      productTitle: item.variant.product.title,
      specLabel,
      priceTwd: item.variant.priceTwd,
      priceKrw: item.variant.priceKrw,
      quantity: item.quantity,
      lineTotal,
    };
  });

  const { totals, breakdown } = await computeOrderTotalsWithCommission(
    subtotalTwd,
    userId,
  );

  await prisma.$transaction(async (tx) => {
    await tx.order.create({
      data: {
        orderNumber,
        userId,
        subtotalTwd: totals.subtotalTwd,
        serviceFeePercent: totals.serviceFeePercent,
        serviceFeeTwd: totals.serviceFeeTwd,
        totalTwd: totals.totalTwd,
        commissionBreakdown: breakdown as unknown as Prisma.InputJsonValue,
        note,
        items: { create: lineItems },
      },
    });
    await tx.cartItem.deleteMany({ where: { userId } });
  });

  revalidatePath("/cart");
  revalidatePath("/orders");
  revalidatePath("/admin/orders");
  redirect(`/orders/success?no=${encodeURIComponent(orderNumber)}`);
}

export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus,
): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch {
    return { error: "無權限" };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { error: "訂單不存在" };

  await prisma.order.update({ where: { id: orderId }, data: { status } });

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/orders");
  return {};
}
