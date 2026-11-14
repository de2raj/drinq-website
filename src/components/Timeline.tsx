import type { Step } from "@/lib/order-status";

const when = (d?: Date | null) =>
  d ? new Date(d).toLocaleString("en-SG", { timeZone: "Asia/Singapore", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

/** Vertical order tracker: done steps ticked, the current step highlighted. */
export function Timeline({ steps }: { steps: Step[] }) {
  return (
    <ol className="tl">
      {steps.map((s) => (
        <li key={s.key} className={`tl-${s.state}`}>
          <span className="tl-dot">{s.state === "done" ? "✓" : s.state === "stopped" ? "×" : ""}</span>
          <span className="tl-body"><b>{s.title}</b>{s.at && s.state !== "upcoming" && <small>{when(s.at)}</small>}</span>
        </li>
      ))}
    </ol>
  );
}
