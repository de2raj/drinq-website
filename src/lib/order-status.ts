/** Order statuses and the tracking timeline (same steps as the Botello app). */
export const STATUS = {
  AWAITING_PAYMENT: "Awaiting payment",
  PAID: "Payment confirmed",
  PREPARING: "Preparing",
  OUT_FOR_DELIVERY: "Out for delivery",
  READY_FOR_COLLECTION: "Ready for collection",
  DELIVERED: "Delivered",
  COLLECTED: "Collected",
  CANCELLED: "Cancelled",
} as const;
export type Status = keyof typeof STATUS;
export const statusLabel = (s: string) => STATUS[s as Status] ?? s;

export const isCollection = (method: string) => method === "COLLECT";
export const PAID_STATUSES: Status[] = ["PAID", "PREPARING", "OUT_FOR_DELIVERY", "READY_FOR_COLLECTION", "DELIVERED", "COLLECTED"];

/** The next step staff can move an order to. */
export function nextStatus(status: string, method: string): Status | null {
  const collect = isCollection(method);
  switch (status) {
    case "AWAITING_PAYMENT": return "PAID";
    case "PAID": return "PREPARING";
    case "PREPARING": return collect ? "READY_FOR_COLLECTION" : "OUT_FOR_DELIVERY";
    case "OUT_FOR_DELIVERY": return "DELIVERED";
    case "READY_FOR_COLLECTION": return "COLLECTED";
    default: return null;
  }
}

export type Step = { key: string; title: string; state: "done" | "current" | "upcoming" | "stopped"; at?: Date | null };

export function timeline(o: { status: string; deliveryMethod: string; createdAt: Date; events: { status: string; at: Date }[] }): Step[] {
  const collect = isCollection(o.deliveryMethod);
  const order: Status[] = ["AWAITING_PAYMENT", "PAID", "PREPARING", collect ? "READY_FOR_COLLECTION" : "OUT_FOR_DELIVERY", collect ? "COLLECTED" : "DELIVERED"];
  const at = (s: string) => o.events.filter((e) => e.status === s).pop()?.at ?? null;
  if (o.status === "CANCELLED") {
    return [
      { key: "placed", title: "Order placed", state: "done", at: o.createdAt },
      { key: "cancelled", title: "Cancelled", state: "stopped", at: at("CANCELLED") },
    ];
  }
  // Which step is in progress: earlier steps are done.
  const current: Record<string, number> = { AWAITING_PAYMENT: 1, PAID: 2, PREPARING: 2, OUT_FOR_DELIVERY: 3, READY_FOR_COLLECTION: 3, DELIVERED: 5, COLLECTED: 5 };
  const cur = current[o.status] ?? 1;
  const titles = ["Order placed", o.status === "AWAITING_PAYMENT" ? "Awaiting payment" : "Payment confirmed", "Preparing your order", collect ? "Ready for collection" : "Out for delivery", collect ? "Collected" : "Delivered"];
  return order.map((s, i) => ({
    key: s,
    title: titles[i],
    at: i === 0 ? o.createdAt : i === 2 ? at("PREPARING") ?? (cur > 2 ? at("PAID") : null) : at(s),
    state: i < cur ? "done" : i === cur ? "current" : "upcoming",
  }));
}
