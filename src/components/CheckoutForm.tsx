"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { submitOrder } from "@/app/checkout/actions";
import { money } from "@/lib/money";
import type { CheckoutInput } from "@/lib/orders";
import { useCart } from "./CartProvider";
import { PayIcon } from "./PayIcon";

export type MethodOption = {
  id: string; name: string; fee: number; freeFrom: number; when: string; address: string;
  notice: string[]; open: boolean; reason: string; pickDate: boolean; dates: { date: string; label: string }[];
};
export type PaymentChoice = { id: string; name: string; detail: string };

type Errors = Partial<Record<keyof CheckoutInput | "form", string>>;
const DRAFT = "drinq-checkout-v2";
const blank = { name: "", email: "", phone: "", address: "", unit: "", postal: "", notes: "" };

export function CheckoutForm({ methods, payments, testMode }: { methods: MethodOption[]; payments: PaymentChoice[]; testMode: boolean }) {
  const { lines, subtotal, ready, clear } = useCart();
  const [f, setF] = useState(blank);
  const [method, setMethod] = useState(methods.find((m) => m.open)?.id ?? "");
  const [date, setDate] = useState("");
  const [allDays, setAllDays] = useState(false);
  const [payment, setPayment] = useState(payments[0]?.id ?? "");
  const [over18, setOver18] = useState(false);
  const [closed, setClosed] = useState<MethodOption | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, start] = useTransition();

  // Keep what the customer typed (saved on this device) so nothing is lost on errors or a refresh.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { setF({ ...blank, ...JSON.parse(localStorage.getItem(DRAFT) || "{}") }); } catch {}
  }, []);
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const n = { ...f, [k]: e.target.value };
    setF(n);
    try { localStorage.setItem(DRAFT, JSON.stringify({ ...n, notes: "" })); } catch {}
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  };

  const m = methods.find((x) => x.id === method);
  const fee = m ? (m.freeFrom > 0 && subtotal >= m.freeFrom ? 0 : m.fee) : 0;
  const collect = method === "COLLECT";
  const shownDays = m?.pickDate ? (allDays ? m.dates : m.dates.slice(0, 7)) : [];

  function choose(x: MethodOption) {
    if (!x.open) { setClosed(x); return; }
    setMethod(x.id);
    if (!x.dates.some((d) => d.date === date)) setDate("");
    setErrors({ ...errors, method: undefined, date: undefined });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const local: Errors = {};
    if (!m) local.method = "Please choose a delivery option.";
    if (m?.pickDate && !date) local.date = "Please choose a date.";
    if (!over18) local.over18 = "Please confirm you are 18 or over.";
    if (Object.keys(local).length) { setErrors(local); scrollToError(); return; }
    start(async () => {
      const r = await submitOrder({ ...f, method, date, payment, over18, lines: lines.map((l) => ({ id: l.id, qty: l.qty })) });
      if (r.ok) {
        clear();
        location.href = r.redirect;
      } else {
        setErrors(r.errors);
        scrollToError();
      }
    });
  }
  const scrollToError = () => setTimeout(() => document.querySelector(".err, .notice.bad")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);

  if (!ready) return <div className="wrap" style={{ minHeight: "60vh" }} />;
  if (!lines.length) {
    return (
      <div className="wrap">
        <div className="chero"><h1 className="display">Checkout</h1></div>
        <div className="panel" style={{ textAlign: "center" }}>
          <p style={{ fontWeight: 600, marginBottom: 18 }}>Your cart is empty.</p>
          <Link className="btn" href="/whisky">Start shopping</Link>
        </div>
      </div>
    );
  }

  const field = (k: keyof typeof blank, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, full = false) => (
    <div className={`field ${full ? "full" : ""} ${errors[k] ? "bad" : ""}`}>
      <label htmlFor={k}>{label}</label>
      <input id={k} name={k} value={f[k]} onChange={set(k)} aria-invalid={!!errors[k]} {...props} />
      {errors[k] && <div className="err">{errors[k]}</div>}
    </div>
  );

  let n = 0;
  return (
    <div className="wrap">
      <div className="crumbs"><Link href="/">Home</Link> / <Link href="/cart">Cart</Link> / Checkout</div>
      <div className="chero"><h1 className="display">Checkout</h1></div>
      <form className="co" onSubmit={submit} noValidate>
        <div>
          {errors.form && <div className="notice bad">{errors.form}</div>}
          <div className="panel">
            <h2><span className="n">{++n}</span>Your details</h2>
            <div className="fields">
              {field("name", "Full name", { autoComplete: "name", required: true }, true)}
              {field("email", "Email", { type: "email", autoComplete: "email", inputMode: "email", required: true })}
              {field("phone", "Mobile number", { type: "tel", autoComplete: "tel", inputMode: "tel", required: true })}
            </div>
          </div>

          <div className={`panel ${errors.method ? "badp" : ""}`}>
            <h2><span className="n">{++n}</span>Delivery</h2>
            <div className="dopts" role="radiogroup" aria-label="Delivery option">
              {methods.map((x) => {
                const xfee = x.freeFrom > 0 && subtotal >= x.freeFrom ? 0 : x.fee;
                return (
                  <button type="button" key={x.id} role="radio" aria-checked={method === x.id} aria-disabled={!x.open}
                    className={`dopt ${x.open ? "" : "shut"}`} onClick={() => choose(x)}>
                    <span className="dot" />
                    <span className="dtxt">
                      <b>{x.name}</b>
                      <small>{x.open ? x.when : "Not available right now"}</small>
                    </span>
                    <span className="dfee">{xfee ? money(xfee) : "FREE"}</span>
                  </button>
                );
              })}
            </div>
            {errors.method && <div className="err">{errors.method}</div>}
            {m && (
              <ul className="dnotice">{m.notice.map((l) => <li key={l}>{l}</li>)}</ul>
            )}

            {m?.pickDate && (
              <>
                <h3 className="sub-h">{collect ? "Collection date" : "Delivery date"}</h3>
                <div className="days" role="group" aria-label="Date">
                  {shownDays.map((d) => {
                    const [top, dm] = d.label.split("|");
                    return (
                      <button type="button" key={d.date} className="day" aria-pressed={d.date === date} aria-label={`${top}, ${dm}`}
                        onClick={() => { setDate(d.date); setErrors({ ...errors, date: undefined }); }}>{top}<small>{dm}</small></button>
                    );
                  })}
                </div>
                {m.dates.length > 7 && (
                  <button type="button" className="later" onClick={() => {
                    if (allDays && m.dates.findIndex((d) => d.date === date) >= 7) setDate("");
                    setAllDays(!allDays);
                  }}>{allDays ? "Fewer dates" : "Later dates"}</button>
                )}
                {errors.date && <div className="err">{errors.date}</div>}
              </>
            )}

            {collect ? (
              <div className="collect"><b>Collect from</b><span>{m?.address}</span></div>
            ) : (
              <div className="fields" style={{ marginTop: 18 }}>
                {field("address", "Street address", { autoComplete: "street-address", required: true }, true)}
                {field("unit", "Unit number (optional)", { autoComplete: "address-line2" })}
                {field("postal", "Postal code", { autoComplete: "postal-code", inputMode: "numeric", maxLength: 6, required: true })}
              </div>
            )}
            <div className="field full" style={{ marginTop: 14 }}>
              <label htmlFor="notes">{collect ? "Notes (optional)" : "Notes for the driver (optional)"}</label>
              <textarea id="notes" value={f.notes} onChange={set("notes")} maxLength={500} />
            </div>
          </div>

          <div className={`panel ${errors.payment ? "badp" : ""}`}>
            <h2><span className="n">{++n}</span>Payment</h2>
            <div className="pays" role="radiogroup" aria-label="Payment method">
              {payments.map((p) => (
                <button type="button" key={p.id} role="radio" className="pay" aria-checked={payment === p.id} onClick={() => setPayment(p.id)}>
                  <span className="dot" /><PayIcon id={p.id} /><span>{p.name}<small>{p.detail}</small></span>
                </button>
              ))}
            </div>
            {errors.payment && <div className="err">{errors.payment}</div>}
            {testMode && <p className="testnote">Test mode: no money is taken. After placing the order you can simulate the payment.</p>}
            <label className="agree" style={{ marginTop: 18 }}>
              <input type="checkbox" className="check" checked={over18} onChange={(e) => { setOver18(e.target.checked); setErrors({ ...errors, over18: undefined }); }} />
              <span>I am 18 or over and agree to the <Link className="u" href="/terms" target="_blank">Terms</Link>. I will show ID on delivery or collection.</span>
            </label>
            {errors.over18 && <div className="err">{errors.over18}</div>}
          </div>
        </div>

        <div className="summary">
          <div className="panel">
            <h2>Order summary</h2>
            <div className="sumlines">
              {lines.map((l) => (
                <div key={l.id} className="line" style={{ padding: "8px 0" }}>
                  <div className="th" style={{ width: 48, height: 48 }}>{l.thumb && <img src={l.thumb} alt="" />}</div>
                  <div className="nm">{l.name}<small>Qty {l.qty}</small></div>
                  <b>{money(l.price * l.qty)}</b>
                </div>
              ))}
            </div>
            <div className="row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="row"><span>{m ? m.name : "Delivery"}</span><span>{m ? (fee ? money(fee) : "Free") : "—"}</span></div>
            <div className="row total"><span>Total</span><span>{money(subtotal + fee)}</span></div>
            <button className="btn btn-block" style={{ marginTop: 16 }} disabled={pending}>
              {pending ? "Placing order…" : `Place order · ${money(subtotal + fee)}`}
            </button>
            <Link className="u" href="/cart" style={{ display: "block", textAlign: "center", marginTop: 12, fontWeight: 700, fontSize: 14 }}>Edit cart</Link>
          </div>
        </div>
      </form>

      {closed && (
        <div className="modal" role="alertdialog" aria-labelledby="closedTitle" onClick={() => setClosed(null)}>
          <div className="mbox" onClick={(e) => e.stopPropagation()}>
            <h3 id="closedTitle">{closed.name} isn&apos;t available</h3>
            <p>{closed.reason}</p>
            <button className="btn btn-block" onClick={() => setClosed(null)}>OK, got it</button>
          </div>
        </div>
      )}
    </div>
  );
}
