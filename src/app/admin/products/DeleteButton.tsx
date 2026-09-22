"use client";

import { useTransition } from "react";
import { deleteProductAction } from "@/app/actions/product";

export function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  function handleDelete() {
    if (!window.confirm("確定要刪除這個商品嗎？")) return;
    startTransition(async () => { await deleteProductAction(id); });
  }
  return (
    <button onClick={handleDelete} disabled={pending}
      className="text-red-500 underline underline-offset-4 hover:text-red-700 disabled:opacity-50">
      {pending ? "刪除中…" : "刪除"}
    </button>
  );
}
