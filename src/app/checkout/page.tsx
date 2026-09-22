import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getCheckoutRatePercent } from "@/lib/commission";
import { computeOrderTotals } from "@/lib/service-fee";
import { canShopRole } from "@/lib/shop";
import { OrderTotalsSummary } from "@/components/OrderTotalsSummary";
import { CheckoutForm } from "./CheckoutForm";

export default async function CheckoutPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user) redirect("/login?callbackUrl=/checkout");
  if (!canShopRole(role)) redirect("/login?callbackUrl=/checkout");

  const rate = await getCheckoutRatePercent(session.user.id);

  const cartItems = await prisma.cartItem.findMany({
    where: { userId: session.user.id },
    include: { variant: { select: { priceTwd: true, acceptOrders: true } } },
  });
  if (cartItems.length === 0) redirect("/cart");

  for (const item of cartItems) {
    if (!item.variant.acceptOrders) redirect("/cart");
  }

  const subtotal = cartItems.reduce((s, i) => s + i.variant.priceTwd * i.quantity, 0);
  const totals = computeOrderTotals(subtotal, rate);

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-xl font-semibold">結帳</h1>
      <div className="mb-6">
        <OrderTotalsSummary totals={totals} />
      </div>
      <div className="mb-6 rounded border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-neutral-700">
        <p className="mb-2 font-medium text-neutral-900">運費與關稅說明</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>運費每公斤 5,700 韓元，6 公斤起寄。</li>
          <li>從韓國寄出時會裝箱秤重拍照請款，請款費用包含代購商品、服務費及運費。</li>
          <li>關稅每公斤約 50 台幣，依報關行收費為主；關稅為到付，收包裹時付給司機。</li>
        </ul>
        <p className="mt-3 text-xs text-neutral-500">
          上方「應付總額」為商品原價與代購服務費，不含韓國運費與台灣關稅。
        </p>
      </div>
      <CheckoutForm />
      <Link href="/cart" className="mt-6 inline-block text-sm underline text-neutral-600">
        ← 返回購物車
      </Link>
    </div>
  );
}
