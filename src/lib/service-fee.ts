export type OrderTotals = {
  subtotalTwd: number;
  serviceFeePercent: number;
  serviceFeeTwd: number;
  totalTwd: number;
};

/** Service fee rounded to whole TWD. */
export function computeOrderTotals(
  subtotalTwd: number,
  serviceFeePercent: number,
): OrderTotals {
  const serviceFeeTwd = Math.round((subtotalTwd * serviceFeePercent) / 100);
  return {
    subtotalTwd,
    serviceFeePercent,
    serviceFeeTwd,
    totalTwd: subtotalTwd + serviceFeeTwd,
  };
}

export function formatFeePercent(percent: number): string {
  if (Number.isInteger(percent)) return String(percent);
  return percent.toFixed(1).replace(/\.0$/, "");
}

export function resolveOrderTotals(order: {
  subtotalTwd: number;
  serviceFeePercent: number;
  serviceFeeTwd: number;
  totalTwd: number;
}): OrderTotals {
  if (order.subtotalTwd > 0 || order.serviceFeeTwd > 0) {
    return {
      subtotalTwd: order.subtotalTwd,
      serviceFeePercent: order.serviceFeePercent,
      serviceFeeTwd: order.serviceFeeTwd,
      totalTwd: order.totalTwd,
    };
  }
  return {
    subtotalTwd: order.totalTwd,
    serviceFeePercent: 0,
    serviceFeeTwd: 0,
    totalTwd: order.totalTwd,
  };
}
