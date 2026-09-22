import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { AdminUserIdentity } from "@/components/AdminUserIdentity";
import { resolveOrderTotals } from "@/lib/service-fee";
import { parseCommissionBreakdown } from "@/lib/commission";
import { OrderTotalsSummary } from "@/components/OrderTotalsSummary";
import { OrderStatusForm } from "./OrderStatusForm";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "待確認",
  CONFIRMED: "已確認",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, displayName: true, adminNote: true } },
      items: true,
    },
  });
  if (!order) notFound();

  const totals = resolveOrderTotals(order);
  const breakdown = parseCommissionBreakdown(order.commissionBreakdown);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/orders" className="mb-6 inline-block text-sm underline text-neutral-600">
        ← 訂單列表
      </Link>
      <h1 className="mb-2 text-xl font-semibold">訂單 {order.orderNumber}</h1>
      <AdminUserIdentity user={order.user} showAdminNote className="mb-2" />
      <p className="mb-6 text-sm text-neutral-600">
        {STATUS_LABEL[order.status] ?? order.status} ·{" "}
        {order.createdAt.toLocaleString("zh-TW")}
      </p>
      <OrderStatusForm orderId={order.id} currentStatus={order.status} />
      <ul className="mb-6 mt-6 divide-y divide-neutral-200 border border-neutral-200">
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
      {breakdown ? (
        <div className="mb-6 rounded border border-neutral-200 bg-neutral-50 p-4 text-sm">
          <p className="mb-2 font-medium">級差分潤紀錄</p>
          <p className="text-neutral-600">
            平台抽成（{breakdown.platformBasePercent}%）：NT${" "}
            {breakdown.platformAmountTwd.toLocaleString()}
          </p>
          <ul className="mt-2 space-y-1 text-neutral-700">
            {breakdown.chain.map((split) => (
              <li key={split.userId}>
                {split.displayName}（第 {split.tier} 層，+{split.marginPercent}%）：NT${" "}
                {split.amountTwd.toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mb-6 text-sm text-neutral-500">此訂單為舊版，無級差分潤紀錄。</p>
      )}
      {order.note ? (
        <p className="text-sm text-neutral-600">
          <span className="font-medium">備註：</span>
          {order.note}
        </p>
      ) : null}
    </div>
  );
}
