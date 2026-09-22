"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getCheckoutRatePercent } from "@/lib/commission";
import { computeOrderTotals, type OrderTotals } from "@/lib/service-fee";
import { canShopRole } from "@/lib/shop";
import { variantSpecLabel, CART_MAX_QUANTITY } from "@/lib/variants";
import { revalidatePath } from "next/cache";

async function requireShopper() {
  const session = await auth();
  const role = session?.user?.role;
  if (!canShopRole(role)) {
    throw new Error("FORBIDDEN");
  }
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  return session.user.id;
}

export type CartLineItem = {
  id: string;
  productTitle: string;
  specLabel: string;
  imageUrl: string | null;
  priceTwd: number;
  quantity: number;
  lineTotal: number;
  acceptOrders: boolean;
};

export async function getCartCount(): Promise<number> {
  const session = await auth();
  if (!session?.user?.id) return 0;
  if (!canShopRole(session.user.role)) return 0;
  return prisma.cartItem.count({ where: { userId: session.user.id } });
}

export type CartSummary = {
  items: CartLineItem[];
  totals: OrderTotals;
};

export async function getCartSummaryAction(): Promise<CartSummary | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (!canShopRole(session.user.role)) return null;

  const rate = await getCheckoutRatePercent(session.user.id);

  const items = await getCartItemsAction();
  const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  return {
    items,
    totals: computeOrderTotals(subtotal, rate),
  };
}

export async function getCartItemsAction(): Promise<CartLineItem[]> {
  const session = await auth();
  if (!session?.user?.id) return [];
  if (!canShopRole(session.user.role)) return [];

  const items = await prisma.cartItem.findMany({
    where: { userId: session.user.id },
    include: {
      variant: {
        include: {
          product: { select: { title: true, imageUrl: true } },
          values: { include: { optionValue: { include: { option: true } } } },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  return items.map((item) => ({
    id: item.id,
    productTitle: item.variant.product.title,
    specLabel: item.variant.values.length ? variantSpecLabel(item.variant.values) : "",
    imageUrl: item.variant.product.imageUrl,
    priceTwd: item.variant.priceTwd,
    quantity: item.quantity,
    lineTotal: item.variant.priceTwd * item.quantity,
    acceptOrders: item.variant.acceptOrders,
  }));
}

export type CartActionState = { error?: string; success?: boolean };

export async function addToCartAction(
  variantId: string,
  quantity = 1,
): Promise<CartActionState> {
  try {
    const userId = await requireShopper();
    const qty = Math.max(1, Math.floor(quantity));

    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { published: true, title: true } } },
    });
    if (!variant?.product.published) return { error: "商品不存在或已下架" };
    if (!variant.acceptOrders) return { error: "此規格暫停接單" };

    const existing = await prisma.cartItem.findUnique({
      where: { userId_variantId: { userId, variantId } },
    });
    const newQty = (existing?.quantity ?? 0) + qty;
    if (newQty > CART_MAX_QUANTITY) {
      return { error: `單品最多 ${CART_MAX_QUANTITY} 件` };
    }

    await prisma.cartItem.upsert({
      where: { userId_variantId: { userId, variantId } },
      create: { userId, variantId, quantity: qty },
      update: { quantity: newQty },
    });

    revalidatePath("/cart");
    return { success: true };
  } catch {
    return { error: "請先登入 VIP 會員" };
  }
}

export async function updateCartQuantityAction(
  cartItemId: string,
  quantity: number,
): Promise<CartActionState> {
  try {
    const userId = await requireShopper();
    const qty = Math.floor(quantity);
    if (qty < 1) return { error: "數量無效" };
    if (qty > CART_MAX_QUANTITY) return { error: `單品最多 ${CART_MAX_QUANTITY} 件` };

    const item = await prisma.cartItem.findFirst({
      where: { id: cartItemId, userId },
      include: { variant: true },
    });
    if (!item) return { error: "購物車項目不存在" };
    if (!item.variant.acceptOrders) return { error: "此規格已暫停接單" };

    await prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity: qty } });
    revalidatePath("/cart");
    return { success: true };
  } catch {
    return { error: "無權限" };
  }
}

export async function removeFromCartAction(cartItemId: string): Promise<CartActionState> {
  try {
    const userId = await requireShopper();
    await prisma.cartItem.deleteMany({ where: { id: cartItemId, userId } });
    revalidatePath("/cart");
    return { success: true };
  } catch {
    return { error: "無權限" };
  }
}
