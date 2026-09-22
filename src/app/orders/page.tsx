import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { resolveOrderTotals } from "@/lib/service-fee";
import { canShopRole } from "@/lib/shop";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "待確認",
  CONFIRMED: "已確認",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

export default async function MyOrdersPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user) redirect("/login?callbackUrl=/orders");
  if (!canShopRole(role)) redirect("/login?callbackUrl=/orders");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 text-xl font-semibold">我的訂單</h1>
      {orders.length === 0 ? (
        <p className="text-sm text-neutral-500">尚無訂單</p>
      ) : (
        <ul className="divide-y divide-neutral-200 border border-neutral-200">
          {orders.map((order) => {
            const totals = resolveOrderTotals(order);
            return (
              <li key={order.id} className="px-4 py-4">
                <Link
                  href={`/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 hover:opacity-80"
                >
                  <span className="font-mono text-sm font-medium">{order.orderNumber}</span>
                  <span className="text-xs text-neutral-500">
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </Link>
                <p className="mt-1 text-sm text-neutral-600">
                  {order.createdAt.toLocaleString("zh-TW")} · 應付 NT${" "}
                  {totals.totalTwd.toLocaleString()}
                </p>
                <ul className="mt-2 text-xs text-neutral-500">
                  {order.items.map((item) => (
                    <li key={item.id}>
                      {item.productTitle}
                      {item.specLabel ? ` / ${item.specLabel}` : ""} × {item.quantity}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
