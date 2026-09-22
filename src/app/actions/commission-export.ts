"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { parseCommissionBreakdown } from "@/lib/commission";
import { OrderStatus } from "@prisma/client";

function monthBounds(yearMonth: string): { start: Date; end: Date } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  if (month < 0 || month > 11) return null;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return { start, end };
}

function csvEscape(value: string | number): string {
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: (string | number)[][]): string {
  return `\uFEFF${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}`;
}

export type ExportCommissionState = {
  error?: string;
  base64?: string;
  filename?: string;
};

export async function exportCommissionExcelAction(
  _prev: ExportCommissionState | undefined,
  formData: FormData,
): Promise<ExportCommissionState> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "無權限" };

  const yearMonth = String(formData.get("yearMonth") || "").trim();
  const bounds = monthBounds(yearMonth);
  if (!bounds) return { error: "請選擇有效月份" };

  const orders = await prisma.order.findMany({
    where: {
      status: OrderStatus.COMPLETED,
      createdAt: { gte: bounds.start, lt: bounds.end },
    },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { email: true, displayName: true } },
    },
  });

  const detailRows: (string | number)[][] = [
    [
      "訂單號",
      "日期",
      "買家",
      "商品小計",
      "最終費率%",
      "代購費",
      "平台抽成",
      "代理分潤明細",
      "備註",
    ],
  ];

  const agentTotals = new Map<string, { name: string; total: number }>();
  let platformTotal = 0;

  for (const order of orders) {
    const breakdown = parseCommissionBreakdown(order.commissionBreakdown);
    const agentParts = breakdown
      ? breakdown.chain.map((c) => `${c.displayName}:${c.amountTwd}`).join(" / ")
      : "舊版單";

    if (breakdown) {
      platformTotal += breakdown.platformAmountTwd;
      for (const split of breakdown.chain) {
        const prev = agentTotals.get(split.userId);
        if (prev) {
          prev.total += split.amountTwd;
        } else {
          agentTotals.set(split.userId, {
            name: split.displayName,
            total: split.amountTwd,
          });
        }
      }
    }

    detailRows.push([
      order.orderNumber,
      order.createdAt.toLocaleString("zh-TW"),
      order.user.displayName.trim() || order.user.email,
      order.subtotalTwd,
      breakdown?.finalRatePercent ?? order.serviceFeePercent,
      order.serviceFeeTwd,
      breakdown?.platformAmountTwd ?? "",
      agentParts,
      breakdown ? "" : "無級差紀錄",
    ]);
  }

  const summaryRows: (string | number)[][] = [["代理", "當月級差利潤合計"]];
  for (const [, value] of agentTotals) {
    summaryRows.push([value.name, value.total]);
  }
  summaryRows.push(["平台", platformTotal]);

  const csv = `${toCsv(detailRows)}\n\n${toCsv(summaryRows)}`;
  const base64 = Buffer.from(csv, "utf-8").toString("base64");

  return {
    base64,
    filename: `commission-${yearMonth}.csv`,
  };
}
