import Link from "next/link";
import { CommissionExportForm } from "./CommissionExportForm";

export default function AdminCommissionsPage() {
  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">分潤報表</h1>
        <Link href="/admin" className="text-sm underline underline-offset-4">
          ← 後台
        </Link>
      </div>
      <p className="mb-6 max-w-2xl text-sm text-neutral-600">
        匯出指定月份的級差分潤明細，供人工線下發放。資料來自訂單完成時寫入的級差紀錄。
      </p>
      <CommissionExportForm />
    </div>
  );
}
