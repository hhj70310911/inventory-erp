import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { resolveOrderTotals } from "@/lib/service-fee";
import { OrderTotalsSummary } from "@/components/OrderTotalsSummary";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "待確認",
  CONFIRMED: "已確認",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

type Props = { params: Promise<{ id: string }> };

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/orders");

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) notFound();
  if (order.userId !== session.user.id && session.user.role !== "ADMIN") notFound();

  const totals = resolveOrderTotals(order);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/orders" className="mb-6 inline-block text-sm underline text-neutral-600">
        ← 我的訂單
      </Link>
      <h1 className="mb-2 text-xl font-semibold">訂單 {order.orderNumber}</h1>
      <p className="mb-6 text-sm text-neutral-600">
        {STATUS_LABEL[order.status] ?? order.status} ·{" "}
        {order.createdAt.toLocaleString("zh-TW")}
      </p>
      <ul className="mb-6 divide-y divide-neutral-200 border border-neutral-200">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">{item.productTitle}</p>
              {item.specLabel ? (
                <p className="text-neutral-500">{item.specLabel}</p>
              ) : null}
              <p className="text-neutral-500">
                NT$ {item.priceTwd.toLocaleString()} × {item.quantity}
              </p>
            </div>
            <p className="font-medium">NT$ {item.lineTotal.toLocaleString()}</p>
          </li>
        ))}
      </ul>
      <OrderTotalsSummary totals={totals} className="mb-6" />
      {order.note ? (
        <p className="text-sm text-neutral-600">
          <span className="font-medium">備註：</span>
          {order.note}
        </p>
      ) : null}
    </div>
  );
}
