"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { submitOrder } from "@/app/checkout/actions";
import { money } from "@/lib/money";
import { decode } from "@/lib/text";
import type { Arrival } from "@/lib/delivery";
import type { CheckoutInput } from "@/lib/orders";
import { useCart } from "./CartProvider";
import { PayIcon } from "./PayIcon";

export type MethodOption = {
  id: string; name: string; fee: number; freeFrom: number; address: string; notice: string[]; arrival: Arrival;
};
export type PaymentChoice = { id: string; name: string; detail: string };
export type Member = { name: string; email: string; phone: string; address: string; unit: string; postal: string; points: number } | null;
export type LoyaltyInfo = { enabled: boolean; block: number; blockValue: number; earnPerDollar: number };

type Errors = Partial<Record<keyof CheckoutInput | "form", string>>;
const DRAFT = "drinq-checkout-v2";
const blank = { name: "", email: "", phone: "", address: "", unit: "", postal: "", notes: "" };

export function CheckoutForm({ methods, payments, testMode, member, loyalty }: {
  methods: MethodOption[]; payments: PaymentChoice[]; testMode: boolean; member: Member; loyalty: LoyaltyInfo;
}) {
  const { lines, subtotal, ready, clear } = useCart();
  const [f, setF] = useState(blank);
  const [method, setMethod] = useState(methods[0]?.id ?? "");
  const [date, setDate] = useState(methods[0]?.arrival.date ?? "");
  const [slot, setSlot] = useState("");
  const [allDays, setAllDays] = useState(false);
  const [payment, setPayment] = useState(payments[0]?.id ?? "");
  const [over18, setOver18] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, start] = useTransition();
  const [usePts, setUsePts] = useState(0);

  // Keep what the customer typed (saved on this device) so nothing is lost on errors or a refresh.
  useEffect(() => {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(DRAFT) || "{}"); } catch {}
    // A signed-in customer starts with their account details.
    const mine = member ? { name: member.name, email: member.email, phone: member.phone, address: member.address, unit: member.unit, postal: member.postal } : {};
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setF({ ...blank, ...saved, ...Object.fromEntries(Object.entries(mine).filter(([, v]) => v)) });
  }, [member]);
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const n = { ...f, [k]: e.target.value };
    setF(n);
    try { localStorage.setItem(DRAFT, JSON.stringify({ ...n, notes: "" })); } catch {}
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  };

  const m = methods.find((x) => x.id === method);
  const fee = m ? (m.freeFrom > 0 && subtotal >= m.freeFrom ? 0 : m.fee) : 0;
  const collect = method === "COLLECT";
  const a = m?.arrival;
  const picks = a && a.pick !== "none";
  const shownDays = picks ? (allDays ? a.dates : a.dates.slice(0, 7)) : [];
  const dayOpt = a?.dates.find((d) => d.date === date);
  // Loyalty points: whole blocks only, never more than the products cost.
  const maxPts = member && loyalty.enabled ? Math.min(Math.floor(member.points / loyalty.block), Math.floor(subtotal / loyalty.blockValue)) * loyalty.block : 0;
  const pts = Math.min(usePts, maxPts);
  const ptsOff = Math.floor(pts / loyalty.block) * loyalty.blockValue;
  const total = subtotal - ptsOff + fee;
  const earn = loyalty.enabled ? Math.floor(((subtotal - ptsOff) / 100) * loyalty.earnPerDollar) : 0;

  function choose(x: MethodOption) {
    setMethod(x.id);
    // Start on the earliest date; slots are always chosen by the customer.
    setDate(x.arrival.date);
    setSlot("");
    setAllDays(false);
    setErrors({ ...errors, method: undefined, date: undefined, slot: undefined });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const local: Errors = {};
    if (!m) local.method = "Please choose a delivery option.";
    if (picks && !date) local.date = "Please choose a date.";
    if (a?.pick === "slot" && !slot) local.slot = "Please choose a time slot.";
    if (!over18) local.over18 = "Please confirm you are 18 or over.";
    if (Object.keys(local).length) { setErrors(local); scrollToError(); return; }
    start(async () => {
      const r = await submitOrder({ ...f, method, date, slot, payment, over18, points: pts, lines: lines.map((l) => ({ id: l.id, qty: l.qty })) });
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
                  <button type="button" key={x.id} role="radio" aria-checked={method === x.id}
                    className="dopt" onClick={() => choose(x)}>
                    <span className="dot" />
                    <span className="dtxt">
                      <b>{x.name}</b>
                      <small>{x.arrival.summary}</small>
                    </span>
                    <span className="dfee">{xfee ? money(xfee) : "FREE"}</span>
                  </button>
                );
              })}
            </div>
            {errors.method && <div className="err">{errors.method}</div>}
            {m && m.freeFrom > 0 && (
              <div className="dfree">
                {subtotal >= m.freeFrom
                  ? <b>FREE {m.name.toLowerCase().replace(/(\w+) day/, "$1-day")} unlocked 🎉</b>
                  : <>Add <b>{money(m.freeFrom - subtotal)}</b> more for FREE {m.name.toLowerCase().replace(/(\w+) day/, "$1-day")}</>}
                <div className="pbar"><i style={{ width: `${Math.min(100, (subtotal / m.freeFrom) * 100)}%` }} /></div>
              </div>
            )}
            {m && (
              <ul className="dnotice">{m.notice.map((l) => <li key={l}>{l}</li>)}</ul>
            )}

            {picks && a && (
              <>
                <h3 className="sub-h">{collect ? "Collection date" : "Delivery date"}</h3>
                <div className="days" role="group" aria-label="Date">
                  {shownDays.map((d) => {
                    const [top, dm] = d.label.split("|");
                    return (
                      <button type="button" key={d.date} className="day" aria-pressed={d.date === date} aria-label={`${top}, ${dm}`}
                        onClick={() => { setDate(d.date); setSlot(""); setErrors({ ...errors, date: undefined, slot: undefined }); }}>{top}<small>{dm}</small></button>
                    );
                  })}
                </div>
                {a.dates.length > 7 && (
                  <button type="button" className="later" onClick={() => {
                    if (allDays && a.dates.findIndex((d) => d.date === date) >= 7) { setDate(a.dates[0].date); setSlot(""); }
                    setAllDays(!allDays);
                  }}>{allDays ? "Fewer dates" : "Later dates"}</button>
                )}
                {errors.date && <div className="err">{errors.date}</div>}
                {a.pick === "date" && dayOpt && <p className="dayhours">{collect ? "Collect on" : "Arrives"} {dayOpt.full}, {dayOpt.detail}</p>}
                {a.pick === "slot" && dayOpt?.slots && (
                  <>
                    <h3 className="sub-h">Time slot</h3>
                    <div className="slots" role="group" aria-label="Time slot">
                      {dayOpt.slots.map((t) => (
                        <button type="button" key={t.id} className="slot" aria-pressed={slot === t.id}
                          onClick={() => { setSlot(t.id); setErrors({ ...errors, slot: undefined }); }}>{t.label}</button>
                      ))}
                    </div>
                    {errors.slot && <div className="err">{errors.slot}</div>}
                  </>
                )}
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
                  <div className="nm">{decode(l.name)}<small>Qty {l.qty}</small></div>
                  <b>{money(l.price * l.qty)}</b>
                </div>
              ))}
            </div>
            <div className="row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="row"><span>{m ? m.name : "Delivery"}</span><span>{m ? (fee ? money(fee) : "Free") : "—"}</span></div>
            {ptsOff > 0 && <div className="row"><span>Points ({pts})</span><span>−{money(ptsOff)}</span></div>}
            <div className="row total"><span>Total</span><span>{money(total)}</span></div>
            {loyalty.enabled && (
              <div className="ptsbox">
                {member ? (
                  member.points >= loyalty.block ? (
                    <>
                      <p><b>You have {member.points} points</b> (worth {money(Math.floor(member.points / loyalty.block) * loyalty.blockValue)}).{maxPts ? " Use them on this order?" : ""}</p>
                      {maxPts > 0 && (
                        <select className="sel" value={pts} onChange={(e) => setUsePts(+e.target.value)} aria-label="Points to use">
                          <option value={0}>Don&apos;t use points</option>
                          {Array.from({ length: maxPts / loyalty.block }, (_, i) => (i + 1) * loyalty.block).map((v) => (
                            <option key={v} value={v}>Use {v} points · −{money((v / loyalty.block) * loyalty.blockValue)}</option>
                          ))}
                        </select>
                      )}
                      {errors.points && <div className="err">{errors.points}</div>}
                    </>
                  ) : <p>You have <b>{member.points} points</b>. {loyalty.block} points = {money(loyalty.blockValue)} off.</p>
                ) : (
                  <p><Link className="u" href="/account/login?next=/checkout">Sign in</Link> to use your points, or <Link className="u" href="/account/register?next=/checkout">create an account</Link> to collect them.</p>
                )}
                {earn > 0 && <p className="earn">You&apos;ll earn <b>{earn} points</b> with this order.</p>}
              </div>
            )}
            <button className="btn btn-block" style={{ marginTop: 16 }} disabled={pending}>
              {pending ? "Placing order…" : `Place order · ${money(total)}`}
            </button>
            <Link className="u" href="/cart" style={{ display: "block", textAlign: "center", marginTop: 12, fontWeight: 700, fontSize: 14 }}>Edit cart</Link>
          </div>
        </div>
      </form>

    </div>
  );
}
