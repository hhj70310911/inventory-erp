import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getCheckoutRatePercent } from "@/lib/commission";
import { computeOrderTotals } from "@/lib/service-fee";
import { canShopRole } from "@/lib/shop";
import { variantSpecLabel } from "@/lib/variants";
import { OrderTotalsSummary } from "@/components/OrderTotalsSummary";
import { CartItemControls } from "./CartItemControls";

export default async function CartPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user) redirect("/login?callbackUrl=/cart");
  if (!canShopRole(role)) redirect("/login?callbackUrl=/cart");

  const rate = await getCheckoutRatePercent(session.user.id);

  const items = await prisma.cartItem.findMany({
    where: { userId: session.user.id },
    include: {
      variant: {
        include: {
          product: { select: { title: true, imageUrl: true, unitLabel: true } },
          values: { include: { optionValue: { include: { option: true } } } },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  const subtotal = items.reduce((s, i) => s + i.variant.priceTwd * i.quantity, 0);
  const totals = computeOrderTotals(subtotal, rate);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 text-xl font-semibold tracking-tight text-ink">購物車</h1>
      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">
          購物車是空的。{" "}
          <Link href="/" className="underline">
            前往選購
          </Link>
        </p>
      ) : (
        <>
          <ul className="divide-y divide-neutral-200 border border-neutral-200">
            {items.map((item) => {
              const spec = item.variant.values.length
                ? variantSpecLabel(item.variant.values)
                : "";
              return (
                <li key={item.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:gap-4">
                  <div className="h-20 w-20 shrink-0 bg-neutral-100">
                    {item.variant.product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.variant.product.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <div>
                      <p className="font-medium">{item.variant.product.title}</p>
                      {spec ? <p className="text-sm text-neutral-500">{spec}</p> : null}
                    </div>
                    <p className="text-sm">
                      NT$ {item.variant.priceTwd.toLocaleString()} × {item.quantity}
                    </p>
                    {!item.variant.acceptOrders ? (
                      <p className="text-xs text-red-600">此規格暫停接單</p>
                    ) : null}
                    <CartItemControls cartItemId={item.id} quantity={item.quantity} />
                  </div>
                  <p className="text-sm font-medium sm:text-right">
                    NT$ {(item.variant.priceTwd * item.quantity).toLocaleString()}
                  </p>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 flex flex-col items-stretch gap-4 border-t border-neutral-200 pt-6">
            <OrderTotalsSummary totals={totals} className="w-full" showCartHint />
            <Link
              href="/checkout"
              className="rounded bg-neutral-900 px-6 py-3 text-center text-sm font-medium text-white hover:bg-neutral-700"
            >
              前往結帳
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
