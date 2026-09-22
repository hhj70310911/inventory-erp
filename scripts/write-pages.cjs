const fs = require('fs');
const path = require('path');
const base = 'D:/korean proxy shopping';

function write(rel, content) {
  const full = path.join(base, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('wrote:', rel);
}

write('src/app/orders/page.tsx', `import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

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
  if (role !== "VIP" && role !== "ADMIN") redirect("/login?callbackUrl=/orders");

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
          {orders.map((order) => (
            <li key={order.id} className="px-4 py-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Link href={\`/orders/\${order.id}\`} className="font-mono text-sm underline">
                  {order.orderNumber}
                </Link>
                <span className="text-sm text-neutral-600">{STATUS_LABEL[order.status]}</span>
              </div>
              <p className="text-sm text-neutral-500">
                {order.createdAt.toLocaleString("zh-TW")} · NT$ {order.totalTwd.toLocaleString()}
              </p>
              <ul className="mt-2 text-sm text-neutral-600">
                {order.items.map((item) => (
                  <li key={item.id}>
                    {item.productTitle}
                    {item.specLabel ? \`（\${item.specLabel}）\` : ""} × {item.quantity}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
`);

write('src/app/orders/[id]/page.tsx', `import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

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

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/orders" className="mb-6 inline-block text-sm underline">
        ← 我的訂單
      </Link>
      <h1 className="mb-2 text-xl font-semibold">訂單 {order.orderNumber}</h1>
      <p className="mb-6 text-sm text-neutral-600">
        {STATUS_LABEL[order.status]} · {order.createdAt.toLocaleString("zh-TW")}
      </p>
      <ul className="mb-6 divide-y divide-neutral-200 border border-neutral-200 text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">{item.productTitle}</p>
              {item.specLabel ? <p className="text-neutral-500">{item.specLabel}</p> : null}
              <p className="text-neutral-500">
                NT$ {item.priceTwd.toLocaleString()} × {item.quantity}
              </p>
            </div>
            <p className="font-medium">NT$ {item.lineTotal.toLocaleString()}</p>
          </li>
        ))}
      </ul>
      <p className="text-right text-lg font-semibold">總計 NT$ {order.totalTwd.toLocaleString()}</p>
      {order.note ? <p className="mt-4 text-sm text-neutral-600">備註：{order.note}</p> : null}
    </div>
  );
}
`);

write('src/app/admin/orders/page.tsx', `import Link from "next/link";
import prisma from "@/lib/prisma";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "待確認",
  CONFIRMED: "已確認",
  COMPLETED: "已完成",
  CANCELLED: "已取消",
};

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { email: true } }, items: true },
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">訂單管理</h1>
        <Link href="/admin" className="text-sm underline underline-offset-4">
          ← 後台
        </Link>
      </div>
      {orders.length === 0 ? (
        <p className="text-sm text-neutral-500">尚無訂單</p>
      ) : (
        <ul className="divide-y divide-neutral-200 border border-neutral-200 text-sm">
          {orders.map((order) => (
            <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <Link href={\`/admin/orders/\${order.id}\`} className="font-mono underline">
                  {order.orderNumber}
                </Link>
                <p className="text-neutral-500">{order.user.email}</p>
              </div>
              <div className="text-right">
                <p>{STATUS_LABEL[order.status]}</p>
                <p className="font-medium">NT$ {order.totalTwd.toLocaleString()}</p>
                <p className="text-xs text-neutral-400">
                  {order.createdAt.toLocaleString("zh-TW")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
`);

write('src/app/admin/orders/[id]/page.tsx', `import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
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
    include: { user: { select: { email: true } }, items: true },
  });
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/orders" className="mb-6 inline-block text-sm underline">
        ← 訂單列表
      </Link>
      <h1 className="mb-2 text-xl font-semibold">{order.orderNumber}</h1>
      <p className="mb-4 text-sm text-neutral-600">
        {order.user.email} · {STATUS_LABEL[order.status]} ·{" "}
        {order.createdAt.toLocaleString("zh-TW")}
      </p>
      <OrderStatusForm orderId={order.id} currentStatus={order.status} />
      <ul className="my-6 divide-y divide-neutral-200 border border-neutral-200 text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 px-4 py-3">
            <div>
              <p className="font-medium">{item.productTitle}</p>
              {item.specLabel ? <p className="text-neutral-500">{item.specLabel}</p> : null}
              <p className="text-neutral-500">
                NT$ {item.priceTwd.toLocaleString()} × {item.quantity}
              </p>
            </div>
            <p className="font-medium">NT$ {item.lineTotal.toLocaleString()}</p>
          </li>
        ))}
      </ul>
      <p className="text-right text-lg font-semibold">總計 NT$ {order.totalTwd.toLocaleString()}</p>
      {order.note ? <p className="mt-4 text-sm">備註：{order.note}</p> : null}
    </div>
  );
}
`);

write('src/components/cart/FloatingCartButton.tsx', `"use client";

type Props = { count: number; onClick: () => void };

export function FloatingCartButton({ count, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="購物車"
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition hover:bg-neutral-700 active:scale-95"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6" aria-hidden>
        <path d="M6 6h15l-1.5 9h-12L6 6z" />
        <path d="M6 6 5 3H2" />
        <circle cx="9" cy="20" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="18" cy="20" r="1.5" fill="currentColor" stroke="none" />
      </svg>
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-medium">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}
`);

console.log('done');
