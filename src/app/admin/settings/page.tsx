import type { Metadata } from "next";
import { AdminNav } from "@/components/AdminNav";
import { PayIcon } from "@/components/PayIcon";
import { allProducts } from "@/lib/catalogue";
import { SlideImage } from "@/components/SlideImage";
import { getSetting, THEMES, WEEKDAYS } from "@/lib/settings";
import { saveDelivery, savePayments, saveStore } from "./actions";

export const metadata: Metadata = { title: "Settings · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";
const dollars = (c: number) => (c ? (c / 100).toFixed(2) : "");

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const saved = (await searchParams).saved;
  const [store, delivery, payments, products] = await Promise.all([getSetting("store"), getSetting("delivery"), getSetting("payments"), allProducts()]);
  const withPhoto = products.filter((p) => p.image);
  const ok = (s: string) => saved === s && <div className="notice">Saved.</div>;

  return (
    <div className="wrap admin">
      <AdminNav active="settings" />
      <nav className="snav"><a href="#homepage">Homepage</a><a href="#delivery">Delivery</a><a href="#payments">Payments</a></nav>

      <form action={saveStore} className="panel" id="homepage" encType="multipart/form-data">
        <h2>Homepage</h2>
        {ok("homepage")}
        <div className="fields">
          <div className="field full"><label htmlFor="announcement">Top bar text</label><input id="announcement" name="announcement" defaultValue={store.announcement} /></div>
          <div className="field full"><label htmlFor="freeNote">Free-delivery footnote (the *)</label><input id="freeNote" name="freeNote" defaultValue={store.freeNote} /></div>
        </div>
        <h3 className="sub-h">Rotating banner (up to 5 slides)</h3>
        <datalist id="plist">{withPhoto.map((p) => <option key={p.id} value={p.name} />)}</datalist>
        <div className="slides-ed">
          {store.slides.map((sl, i) => {
            const p = withPhoto.find((x) => x.slug === sl.slug);
            const k = (f: string) => `slide${i}.${f}`;
            return (
              <fieldset key={i} className="dm sl">
                <legend><label className="agree"><input type="checkbox" className="check" name={k("show")} defaultChecked={sl.show} />Slide {i + 1}</label></legend>
                <SlideImage name={`slide${i}`} current={sl.image} fallback={p?.thumb ?? ""} />
                <div className="fields">
                  <div className="field full"><label>Product</label><input name={k("product")} list="plist" defaultValue={p?.name ?? ""} /></div>
                  <div className="field"><label>Small label</label><input name={k("pill")} defaultValue={sl.pill} /></div>
                  <div className="field"><label>Colour</label>
                    <select name={k("theme")} defaultValue={sl.theme} className="sel" style={{ width: "100%", height: 50, borderRadius: 12 }}>
                      {Object.entries(THEMES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Headline</label><input name={k("title")} defaultValue={sl.title} /></div>
                  <div className="field"><label>Headline, 2nd line (accent colour)</label><input name={k("highlight")} defaultValue={sl.highlight} /></div>
                  <div className="field full"><label>Text</label><input name={k("text")} defaultValue={sl.text} /></div>
                </div>
              </fieldset>
            );
          })}
        </div>
        <button className="btn">Save homepage</button>
      </form>

      <form action={saveDelivery} className="panel" id="delivery">
        <h2>Delivery</h2>
        {ok("delivery")}
        <p className="snote">Customers can always order. These rules decide when each order arrives.</p>
        {delivery.map((m) => {
          const k = (f: string) => `${m.id}.${f}`;
          const hoursName = m.id === "EXPRESS" ? "Express runs" : m.id === "COLLECT" ? "Collection hours" : "Delivery hours";
          const dayName = m.id === "COLLECT" ? "Collection day" : "Delivery day";
          return (
            <fieldset key={m.id} className="dm">
              <legend><label className="agree"><input type="checkbox" className="check" name={k("enabled")} defaultChecked={m.enabled} />{m.name}</label></legend>
              <div className="fields three">
                <div className="field"><label>Name</label><input name={k("name")} defaultValue={m.name} /></div>
                <div className="field"><label>Fee ($)</label><input name={k("fee")} defaultValue={dollars(m.fee) || "0"} inputMode="decimal" /></div>
                <div className="field"><label>Free from ($, blank = never)</label><input name={k("freeFrom")} defaultValue={dollars(m.freeFrom)} inputMode="decimal" /></div>
                {(m.id === "SAME_DAY" || m.id === "NEXT_DAY" || m.id === "COLLECT") && (
                  <div className="field"><label>{m.id === "SAME_DAY" ? "Order by (for today)" : m.id === "COLLECT" ? "Today can be picked until" : "Order by"}</label>
                    <input type="time" name={k("cutoff")} defaultValue={m.cutoff} /></div>
                )}
                {m.id === "TIMED" && <>
                  <div className="field"><label>Earliest slot (hours from ordering)</label><input name={k("leadHours")} defaultValue={String(m.leadHours)} inputMode="numeric" /></div>
                  <div className="field full"><label>Slots (comma between)</label><input name={k("slots")} defaultValue={m.slots.map((r) => `${r.from}-${r.to}`).join(", ")} /></div>
                </>}
                {m.id === "COLLECT" && <div className="field full"><label>Collection address</label><input name={k("address")} defaultValue={m.address} /></div>}
                <div className="field full"><label>Rules shown at checkout (one per line)</label><textarea name={k("notice")} defaultValue={m.notice} rows={3} /></div>
              </div>
              <div className="wins2">
                <span className="wh">Day</span><span className="wh">{dayName}</span><span className="wh">{hoursName}</span>
                {WEEKDAYS.map(({ key, label }) => (
                  <div key={key} className="wrow">
                    <span>{label}</span>
                    <label className="agree"><input type="checkbox" className="check" name={k(`${key}.service`)} defaultChecked={m.serviceDays[key]} aria-label={`${label} ${dayName}`} /></label>
                    <input name={k(`${key}.hours`)} defaultValue={(m.hours[key] ?? []).map((r) => `${r.from}-${r.to}`).join(", ")} aria-label={`${label} ${hoursName}`} />
                  </div>
                ))}
              </div>
            </fieldset>
          );
        })}
        <button className="btn">Save delivery</button>
      </form>

      <form action={savePayments} className="panel" id="payments">
        <h2>Payments</h2>
        {ok("payments")}
        <label className="agree tmode"><input type="checkbox" className="check" name="testMode" defaultChecked={payments.testMode} />
          <span><b>Test mode</b> — no money is taken. Orders get a test QR and a &ldquo;Simulate payment&rdquo; button.</span></label>
        <div className="paylist">
          {payments.options.map((o) => (
            <div key={o.id} className="prow2">
              <label className="agree"><input type="checkbox" className="check" name={`${o.id}.enabled`} defaultChecked={o.enabled} /><PayIcon id={o.id} /></label>
              <input name={`${o.id}.name`} defaultValue={o.name} aria-label={`${o.id} name`} />
              <input name={`${o.id}.detail`} defaultValue={o.detail} aria-label={`${o.id} description`} />
            </div>
          ))}
        </div>
        <button className="btn">Save payments</button>
      </form>
    </div>
  );
}
