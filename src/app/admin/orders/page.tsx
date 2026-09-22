import Link from "next/link";
import prisma from "@/lib/prisma";
import { AdminUserIdentity } from "@/components/AdminUserIdentity";
import { resolveOrderTotals } from "@/lib/service-fee";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "待確認",
  CONFIRMED: "已確認",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true, displayName: true, adminNote: true } },
      items: true,
    },
  });

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">訂單管理</h1>
        <Link href="/admin" className="text-sm underline underline-offset-4">
          ← 後台
        </Link>
      </div>
      {orders.length === 0 ? (
        <p className="text-sm text-neutral-500">尚無訂單</p>
      ) : (
        <ul className="divide-y divide-neutral-200 border border-neutral-200">
          {orders.map((order) => {
            const totals = resolveOrderTotals(order);
            return (
              <li key={order.id} className="px-4 py-4">
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 hover:opacity-80"
                >
                  <span className="font-mono text-sm font-medium">{order.orderNumber}</span>
                  <span className="text-xs text-neutral-500">
                    {STATUS_LABEL[order.status] ?? order.status}
                  </span>
                </Link>
                <AdminUserIdentity user={order.user} showAdminNote className="mt-1" />
                <p className="text-sm text-neutral-600">
                  應付 NT$ {totals.totalTwd.toLocaleString()}（含服務費 NT${" "}
                  {totals.serviceFeeTwd.toLocaleString()}）·{" "}
                  {order.createdAt.toLocaleString("zh-TW")}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
