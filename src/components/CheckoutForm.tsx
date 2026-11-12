"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { submitOrder } from "@/app/checkout/actions";
import { SHOP } from "@/lib/config";
import type { DeliveryDay } from "@/lib/delivery";
import { money } from "@/lib/money";
import type { CheckoutInput } from "@/lib/orders";
import { useCart } from "./CartProvider";

type Errors = Partial<Record<keyof CheckoutInput | "form", string>>;
const DRAFT = "drinq-checkout-v1";
const blank = { name: "", email: "", phone: "", address: "", unit: "", postal: "", notes: "" };

export function CheckoutForm({ days, cardEnabled }: { days: DeliveryDay[]; cardEnabled: boolean }) {
  const { lines, subtotal, ready, clear } = useCart();
  const [f, setF] = useState(blank);
  const [date, setDate] = useState(days[0]?.date ?? "");
  const [slot, setSlot] = useState("");
  const [allDays, setAllDays] = useState(false);
  const [payment, setPayment] = useState<"PAYNOW" | "CARD">(cardEnabled ? "CARD" : "PAYNOW");
  const [over18, setOver18] = useState(false);
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

  const fee = subtotal >= SHOP.freeDeliveryFrom ? 0 : SHOP.deliveryFee;
  const day = days.find((d) => d.date === date);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const local: Errors = {};
    if (!slot) local.slot = "Please choose a delivery time.";
    if (!over18) local.over18 = "Please confirm you are 18 or over.";
    if (Object.keys(local).length) { setErrors(local); scrollToError(); return; }
    start(async () => {
      const r = await submitOrder({ ...f, date, slot, payment, over18, lines: lines.map((l) => ({ id: l.id, qty: l.qty })) });
      if (r.ok) {
        clear();
        location.href = r.redirect;
      } else {
        setErrors(r.errors);
        if (r.errors.slot) setSlot("");
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

  return (
    <div className="wrap">
      <div className="crumbs"><Link href="/">Home</Link> / <Link href="/cart">Cart</Link> / Checkout</div>
      <div className="chero"><h1 className="display">Checkout</h1></div>
      <form className="co" onSubmit={submit} noValidate>
        <div>
          {errors.form && <div className="notice bad">{errors.form}</div>}
          <div className="panel">
            <h2><span className="n">1</span>Your details</h2>
            <div className="fields">
              {field("name", "Full name", { autoComplete: "name", required: true }, true)}
              {field("email", "Email", { type: "email", autoComplete: "email", inputMode: "email", required: true })}
              {field("phone", "Mobile number", { type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "8123 4567", required: true })}
            </div>
          </div>

          <div className="panel">
            <h2><span className="n">2</span>Delivery address</h2>
            <div className="fields">
              {field("address", "Street address", { autoComplete: "street-address", placeholder: "Block and street name", required: true }, true)}
              {field("unit", "Unit number (optional)", { autoComplete: "address-line2", placeholder: "#05-12" })}
              {field("postal", "Postal code", { autoComplete: "postal-code", inputMode: "numeric", maxLength: 6, placeholder: "6 digits", required: true })}
              <div className="field full">
                <label htmlFor="notes">Notes for the driver (optional)</label>
                <textarea id="notes" value={f.notes} onChange={set("notes")} placeholder="Gate code, landmarks, call on arrival…" maxLength={500} />
              </div>
            </div>
          </div>

          <div className="panel">
            <h2><span className="n">3</span>Delivery time</h2>
            <div className="days" role="group" aria-label="Delivery day">
              {(allDays ? days : days.slice(0, 7)).map((d) => (
                <button type="button" key={d.date} className="day" aria-pressed={d.date === date} aria-label={d.label}
                  onClick={() => { setDate(d.date); if (!d.slots.some((s) => s.id === slot)) setSlot(""); }}>{d.top}<small>{d.dm}</small></button>
              ))}
            </div>
            {days.length > 7 && (
              <button type="button" className="later" onClick={() => { if (allDays && days.findIndex((d) => d.date === date) >= 7) { setDate(days[0].date); setSlot(""); } setAllDays(!allDays); }}>{allDays ? "Fewer dates" : "Later dates"}</button>
            )}
            <div className="slots" role="group" aria-label="Delivery slot">
              {day?.slots.map((s) => (
                <button type="button" key={s.id} className="slot" aria-pressed={s.id === slot}
                  onClick={() => { setSlot(s.id); setErrors({ ...errors, slot: undefined }); }}>{s.label}</button>
              ))}
            </div>
            {errors.slot && <div className="err">{errors.slot}</div>}
            <p style={{ fontSize: 13, fontWeight: 600, marginTop: 12 }}>Deliveries run 10am – 10pm. Singapore law does not allow liquor sales between 10.30pm and 7am.</p>
          </div>

          <div className="panel">
            <h2><span className="n">4</span>Payment</h2>
            <div className="pays" role="radiogroup" aria-label="Payment method">
              {cardEnabled && (
                <button type="button" role="radio" className="pay" aria-checked={payment === "CARD"} onClick={() => setPayment("CARD")}>
                  <span className="dot" /><span>Card, Apple Pay or Google Pay<small>Pay securely on the next page.</small></span>
                </button>
              )}
              <button type="button" role="radio" className="pay" aria-checked={payment === "PAYNOW"} onClick={() => setPayment("PAYNOW")}>
                <span className="dot" /><span>PayNow QR<small>Scan the QR with any Singapore banking app after placing your order.</small></span>
              </button>
            </div>
            <label className="agree" style={{ marginTop: 18 }}>
              <input type="checkbox" className="check" checked={over18} onChange={(e) => { setOver18(e.target.checked); setErrors({ ...errors, over18: undefined }); }} />
              <span>I am 18 or over and agree to the <Link className="u" href="/terms" target="_blank">Terms</Link>. I will show ID on delivery.</span>
            </label>
            {errors.over18 && <div className="err">{errors.over18}</div>}
          </div>
        </div>

        <div className="summary">
          <div className="panel">
            <h2>Order summary</h2>
            <div style={{ maxHeight: 320, overflow: "auto", scrollbarWidth: "none", marginBottom: 10 }}>
              {lines.map((l) => (
                <div key={l.id} className="line" style={{ padding: "8px 0" }}>
                  <div className="th" style={{ width: 48, height: 48 }}>{l.thumb && <img src={l.thumb} alt="" />}</div>
                  <div className="nm">{l.name}<small>Qty {l.qty}</small></div>
                  <b>{money(l.price * l.qty)}</b>
                </div>
              ))}
            </div>
            <div className="row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <div className="row"><span>Delivery</span><span>{fee ? money(fee) : "Free"}</span></div>
            <div className="row total"><span>Total</span><span>{money(subtotal + fee)}</span></div>
            <button className="btn btn-block" style={{ marginTop: 16 }} disabled={pending}>
              {pending ? "Placing order…" : payment === "CARD" ? `Continue to payment · ${money(subtotal + fee)}` : `Place order · ${money(subtotal + fee)}`}
            </button>
            <Link className="u" href="/cart" style={{ display: "block", textAlign: "center", marginTop: 12, fontWeight: 700, fontSize: 14 }}>Edit cart</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
