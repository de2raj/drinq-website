"use client";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { saveOrder as save } from "@/app/admin/orders/actions";
import { money } from "@/lib/money";
import type { StaffOrderInput } from "@/lib/staff-orders";

export type PickProduct = { id: string; name: string; price: number; thumb: string; inStock: boolean };
export type PickMethod = { id: string; name: string; fee: number; freeFrom: number; date: string; slot: string; slots: string[] };
type Line = { productId: string; name: string; qty: number; unitPrice: number; thumb: string };

const dollars = (c: number) => (c / 100).toFixed(2);
const toCents = (v: string) => Math.max(0, Math.round(parseFloat(v || "0") * 100) || 0);

export function OrderEditor({ products, methods, payments, initial }: {
  products: PickProduct[];
  methods: PickMethod[];
  payments: { id: string; name: string }[];
  initial?: Omit<StaffOrderInput, "lines"> & { lines: Line[] };
}) {
  const router = useRouter();
  const editing = !!initial?.id;
  const first = methods.find((m) => m.id === initial?.method) ?? methods[0];
  const [f, setF] = useState({
    name: initial?.name ?? "", email: initial?.email ?? "", phone: initial?.phone ?? "",
    address: initial?.address ?? "", unit: initial?.unit ?? "", postal: initial?.postal ?? "", notes: initial?.notes ?? "",
    method: first.id, date: initial?.date ?? first.date, slot: initial?.slot ?? first.slot,
    payment: initial?.payment ?? payments[0]?.id ?? "", paid: false,
  });
  const [lines, setLines] = useState<Line[]>(initial?.lines ?? []);
  const [fee, setFee] = useState<string | null>(initial ? dollars(initial.deliveryFee) : null); // null = work it out
  const [find, setFind] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, start] = useTransition();

  const m = methods.find((x) => x.id === f.method) ?? first;
  const collect = m.id === "COLLECT";
  const subtotal = lines.reduce((a, l) => a + l.unitPrice * l.qty, 0);
  const autoFee = m.freeFrom > 0 && subtotal >= m.freeFrom ? 0 : m.fee;
  const feeCents = fee === null ? autoFee : toCents(fee);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const matches = useMemo(() => {
    const w = find.toLowerCase().split(/\s+/).filter(Boolean);
    if (!w.length) return [];
    return products.filter((p) => w.every((x) => p.name.toLowerCase().includes(x))).slice(0, 8);
  }, [find, products]);

  const add = (p: PickProduct) => {
    setLines((ls) => ls.some((l) => l.productId === p.id)
      ? ls.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + 1 } : l))
      : [...ls, { productId: p.id, name: p.name, qty: 1, unitPrice: p.price, thumb: p.thumb }]);
    setFind("");
  };
  const edit = (id: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.productId === id ? { ...l, ...patch } : l)));

  const chooseMethod = (id: string) => {
    const x = methods.find((y) => y.id === id)!;
    setF({ ...f, method: id, date: x.date, slot: x.slot });
    if (!editing) setFee(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await save({ ...f, id: initial?.id, deliveryFee: feeCents, lines: lines.map(({ productId, name, qty, unitPrice }) => ({ productId, name, qty, unitPrice })) });
      if (r.ok) router.push(`/admin/orders/${r.id}`);
      else setErrors(r.errors);
    });
  };
  const err = (k: string) => errors[k] && <span className="err">{errors[k]}</span>;

  return (
    <form className="oedit" onSubmit={submit} noValidate>
      {errors.form && <div className="notice bad">{errors.form}</div>}
      <section className="panel">
        <h2>Products</h2>
        <div className="pfind">
          <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Type a product name to add it" aria-label="Find a product"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (matches[0]) add(matches[0]); } }} />
          {matches.length > 0 && (
            <ul className="pfound">
              {matches.map((p) => (
                <li key={p.id}><button type="button" onClick={() => add(p)}>
                  <span className="th">{p.thumb && <img src={p.thumb} alt="" />}</span>
                  <span className="nm">{p.name}{!p.inStock && <small> · sold out</small>}</span><b>{money(p.price)}</b>
                </button></li>
              ))}
            </ul>
          )}
        </div>
        {err("lines")}
        {lines.length > 0 && (
          <div className="elines">
            <div className="elh"><span>Product</span><span>Price ($)</span><span>Qty</span><span>Total</span><span /></div>
            {lines.map((l) => (
              <div className="el" key={l.productId}>
                <span className="nm"><span className="th">{l.thumb && <img src={l.thumb} alt="" />}</span>{l.name}</span>
                <input inputMode="decimal" aria-label={`${l.name} price`} defaultValue={dollars(l.unitPrice)} onBlur={(e) => edit(l.productId, { unitPrice: toCents(e.target.value) })} />
                <input type="number" min={1} max={999} aria-label={`${l.name} quantity`} value={l.qty} onChange={(e) => edit(l.productId, { qty: Math.max(1, Math.floor(+e.target.value || 1)) })} />
                <b>{money(l.unitPrice * l.qty)}</b>
                <button type="button" className="x" aria-label={`Remove ${l.name}`} onClick={() => setLines((ls) => ls.filter((x) => x.productId !== l.productId))}>×</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <h2>Customer</h2>
        <div className="fields">
          <div className="field"><label>Name</label><input value={f.name} onChange={set("name")} />{err("name")}</div>
          <div className="field"><label>Mobile number</label><input value={f.phone} onChange={set("phone")} inputMode="tel" />{err("phone")}</div>
          <div className="field full"><label>Email (optional)</label><input value={f.email} onChange={set("email")} inputMode="email" />{err("email")}</div>
        </div>
      </section>

      <section className="panel">
        <h2>Delivery</h2>
        <div className="mtabs">
          {methods.map((x) => <button type="button" key={x.id} aria-current={x.id === f.method ? "page" : undefined} onClick={() => chooseMethod(x.id)}>{x.name}</button>)}
        </div>
        {err("method")}
        <div className="fields">
          <div className="field"><label>{collect ? "Collection date" : "Delivery date"}</label><input type="date" value={f.date} onChange={set("date")} />{err("date")}</div>
          <div className="field"><label>Time</label>
            {m.slots.length
              ? <select className="sel" value={f.slot} onChange={set("slot")}>{m.slots.map((s) => <option key={s}>{s}</option>)}</select>
              : <input value={f.slot} onChange={set("slot")} />}
          </div>
          {!collect && <>
            <div className="field full"><label>Street address</label><input value={f.address} onChange={set("address")} />{err("address")}</div>
            <div className="field"><label>Unit (optional)</label><input value={f.unit} onChange={set("unit")} /></div>
            <div className="field"><label>Postal code</label><input value={f.postal} onChange={set("postal")} inputMode="numeric" />{err("postal")}</div>
          </>}
          <div className="field full"><label>Notes (optional)</label><input value={f.notes} onChange={set("notes")} /></div>
        </div>
      </section>

      <section className="panel">
        <h2>Payment</h2>
        <div className="fields">
          <div className="field"><label>Payment method</label>
            <select className="sel" value={f.payment} onChange={set("payment")}>{payments.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>{err("payment")}
          </div>
          <div className="field"><label>Delivery fee ($)</label>
            <input inputMode="decimal" value={fee ?? dollars(autoFee)} onChange={(e) => setFee(e.target.value)} />
          </div>
        </div>
        {!editing && (
          <label className="agree"><input type="checkbox" className="check" checked={f.paid} onChange={(e) => setF({ ...f, paid: e.target.checked })} />
            <span>Customer has already paid (in store). Leave unticked to send them a payment link.</span></label>
        )}
        <div className="summary etot">
          <div className="row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div className="row"><span>{m.name}</span><span>{feeCents ? money(feeCents) : "Free"}</span></div>
          <div className="row total"><span>Total</span><span>{money(subtotal + feeCents)}</span></div>
        </div>
        <button className="btn btn-block" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : f.paid ? "Create paid order" : "Create order & get payment link"}</button>
      </section>
    </form>
  );
}
