"use client";

import { useTransition } from "react";
import { updateOrderStatusAction } from "@/app/actions/order";
import type { OrderStatus } from "@prisma/client";

const OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "PENDING", label: "待確認" },
  { value: "CONFIRMED", label: "已確認" },
  { value: "COMPLETED", label: "已完成" },
  { value: "CANCELLED", label: "已取消" },
];

export function OrderStatusForm({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-neutral-600">更新狀態：</span>
      <select
        defaultValue={currentStatus}
        disabled={pending}
        onChange={(e) => {
          const status = e.target.value as OrderStatus;
          startTransition(async () => {
            await updateOrderStatusAction(orderId, status);
          });
        }}
        className="border border-neutral-300 px-2 py-1 rounded"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {pending ? <span className="text-neutral-400">更新中…</span> : null}
    </div>
  );
}
