import { formatFeePercent, type OrderTotals } from "@/lib/service-fee";

const CART_FEE_HINT =
  "上方金額不含國際運費與台灣關稅，詳細計費方式將於結帳頁面完整呈現。";

type Props = {
  totals: OrderTotals;
  className?: string;
  size?: "sm" | "md";
  showCartHint?: boolean;
};

export function OrderTotalsSummary({
  totals,
  className = "",
  size = "md",
  showCartHint = false,
}: Props) {
  const text = size === "sm" ? "text-sm" : "text-sm";
  const totalText = size === "sm" ? "text-base" : "text-lg";

  return (
    <div className={`flex flex-col gap-1.5 ${text} ${className}`}>
      <div className="flex justify-between text-neutral-600">
        <span>商品小計</span>
        <span>NT$ {totals.subtotalTwd.toLocaleString()}</span>
      </div>
      <div className="flex justify-between text-neutral-600">
        <span>代購服務費（{formatFeePercent(totals.serviceFeePercent)}%）</span>
        <span>NT$ {totals.serviceFeeTwd.toLocaleString()}</span>
      </div>
      <div
        className={`flex justify-between border-t border-neutral-200 pt-2 font-semibold text-neutral-900 ${totalText}`}
      >
        <span>應付總額</span>
        <span>NT$ {totals.totalTwd.toLocaleString()}</span>
      </div>
      {showCartHint ? (
        <p className="pt-1 text-xs leading-relaxed text-neutral-500">
          💡 {CART_FEE_HINT}
        </p>
      ) : null}
    </div>
  );
}
