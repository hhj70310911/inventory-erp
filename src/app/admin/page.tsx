import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="mb-8 text-xl font-semibold">{"\u5f8c\u53f0"}</h1>
      <ul className="flex flex-col gap-4 text-sm">
        <li>
          <Link href="/admin/products" className="underline underline-offset-4">
            {"\u5546\u54c1\u7ba1\u7406"}
          </Link>
        </li>
        <li>
          <Link href="/admin/products/import" className="underline underline-offset-4">
            從 Olive Young 匯入
          </Link>
        </li>
        <li>
          <Link href="/admin/invites" className="underline underline-offset-4">
            VIP 邀請
          </Link>
        </li>
        <li>
          <Link href="/admin/vip-fees" className="underline underline-offset-4">
            VIP 會員
          </Link>
        </li>
        <li>
          <Link href="/admin/orders" className="underline underline-offset-4">
            訂單管理
          </Link>
        </li>
        <li>
          <Link href="/admin/commissions" className="underline underline-offset-4">
            分潤報表
          </Link>
        </li>
      </ul>
    </div>
  );
}
