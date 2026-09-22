"use client";

import { useState } from "react";

export function InviteLinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = link;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}`;

  return (
    <div className="max-w-xl rounded border border-neutral-200 bg-neutral-50 p-4 text-sm">
      <p className="mb-2 font-medium">請複製並傳給對方（效期 7 天）</p>
      <button
        type="button"
        onClick={copyLink}
        className="mb-2 w-full rounded bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
      >
        {copied ? "已複製到剪貼簿" : "一鍵複製連結"}
      </button>
      <button
        type="button"
        onClick={copyLink}
        className="mb-4 block w-full break-all rounded border border-neutral-200 bg-white px-2 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-100"
        title="點擊複製"
      >
        {link}
      </button>
      <div className="flex flex-col items-center gap-2">
        <p className="text-xs text-neutral-500">掃描 QR Code 加入</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl} alt="邀請 QR Code" width={200} height={200} className="rounded border border-neutral-200 bg-white p-2" />
      </div>
    </div>
  );
}
