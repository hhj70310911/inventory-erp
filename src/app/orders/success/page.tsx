import Link from "next/link";

type Props = { searchParams: Promise<{ no?: string }> };

export default async function OrderSuccessPage({ searchParams }: Props) {
  const { no } = await searchParams;
  const lineUrl = process.env.NEXT_PUBLIC_LINE_URL?.trim();

  return (
    <div className="mx-auto max-w-md text-center">
      <h1 className="mb-4 text-xl font-semibold">訂單已送出</h1>
      {no ? (
        <p className="mb-6 text-sm text-neutral-600">
          訂單編號：<span className="font-mono font-medium text-neutral-900">{no}</span>
        </p>
      ) : null}
      <p className="mb-8 text-sm text-neutral-600">
        我們會盡快與您確認訂單，請留意後續聯繫。
      </p>
      <div className="flex flex-col items-center gap-3">
        <Link href="/orders" className="underline text-sm">
          查看我的訂單
        </Link>
        <Link href="/" className="underline text-sm">
          回到商品
        </Link>
        {lineUrl ? (
          <a
            href={lineUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 border border-neutral-900 px-4 py-2 text-sm font-medium"
          >
            聯絡我們（LINE）
          </a>
        ) : null}
      </div>
    </div>
  );
}
