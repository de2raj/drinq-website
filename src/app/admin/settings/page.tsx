import type { Metadata } from "next";
import { AdminNav } from "@/components/AdminNav";
import { PayIcon } from "@/components/PayIcon";
import { allProducts } from "@/lib/catalogue";
import { getSetting, WEEKDAYS } from "@/lib/settings";
import { saveDelivery, savePayments, saveStore } from "./actions";

export const metadata: Metadata = { title: "Settings · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";
const dollars = (c: number) => (c ? (c / 100).toFixed(2) : "");

export default async function Settings({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const saved = (await searchParams).saved;
  const [store, delivery, payments, products] = await Promise.all([getSetting("store"), getSetting("delivery"), getSetting("payments"), allProducts()]);
  const withPhoto = products.filter((p) => p.image);
  const heroes = [0, 1, 2].map((i) => withPhoto.find((p) => p.slug === store.heroSlugs[i]));
  const ok = (s: string) => saved === s && <div className="notice">Saved.</div>;

  return (
    <div className="wrap admin">
      <AdminNav active="settings" />
      <nav className="snav"><a href="#homepage">Homepage</a><a href="#delivery">Delivery</a><a href="#payments">Payments</a></nav>

      <form action={saveStore} className="panel" id="homepage">
        <h2>Homepage</h2>
        {ok("homepage")}
        <div className="fields">
          <div className="field full"><label htmlFor="announcement">Top bar text</label><input id="announcement" name="announcement" defaultValue={store.announcement} /></div>
          <div className="field full"><label htmlFor="freeNote">Free-delivery footnote (the *)</label><input id="freeNote" name="freeNote" defaultValue={store.freeNote} /></div>
        </div>
        <h3 className="sub-h">Bottles in the homepage circle</h3>
        <datalist id="plist">{withPhoto.map((p) => <option key={p.id} value={p.name} />)}</datalist>
        <div className="heropick">
          {heroes.map((p, i) => (
            <div key={i} className="hp">
              <div className="hpimg">{p && <img src={p.image} alt="" />}</div>
              <label htmlFor={`hero${i}`}>{["Left", "Middle", "Right"][i]} bottle</label>
              <input id={`hero${i}`} name={`hero${i}`} list="plist" defaultValue={p?.name ?? ""} />
            </div>
          ))}
        </div>
        <button className="btn">Save homepage</button>
      </form>

      <form action={saveDelivery} className="panel" id="delivery">
        <h2>Delivery</h2>
        {ok("delivery")}
        {delivery.map((m) => {
          const k = (f: string) => `${m.id}.${f}`;
          return (
            <fieldset key={m.id} className="dm">
              <legend><label className="agree"><input type="checkbox" className="check" name={k("enabled")} defaultChecked={m.enabled} />{m.name}</label></legend>
              <div className="fields three">
                <div className="field"><label>Name</label><input name={k("name")} defaultValue={m.name} /></div>
                <div className="field"><label>Fee ($)</label><input name={k("fee")} defaultValue={dollars(m.fee) || "0"} inputMode="decimal" /></div>
                <div className="field"><label>Free from ($, blank = never)</label><input name={k("freeFrom")} defaultValue={dollars(m.freeFrom)} inputMode="decimal" /></div>
                <div className="field"><label>Time shown to customer</label><input name={k("when")} defaultValue={m.when} /></div>
                <div className="field"><label className="agree" style={{ marginTop: 28 }}><input type="checkbox" className="check" name={k("pickDate")} defaultChecked={m.pickDate} />Customer picks a date</label></div>
                <div className="field"><label>Earliest date</label>
                  <select name={k("firstDay")} defaultValue={String(m.firstDay)} className="sel" style={{ width: "100%", height: 50, borderRadius: 12 }}>
                    <option value="0">Today</option><option value="1">Tomorrow</option>
                  </select>
                </div>
                {m.id === "COLLECT" && <div className="field full"><label>Collection address</label><input name={k("address")} defaultValue={m.address} /></div>}
                <div className="field full"><label>Rules shown at checkout (one per line)</label><textarea name={k("notice")} defaultValue={m.notice} rows={3} /></div>
                <div className="field full"><label>Message when it can&apos;t be chosen</label><input name={k("closedMessage")} defaultValue={m.closedMessage} /></div>
              </div>
              <div className="wins">
                <span className="wh">Can be ordered</span><span className="wh">From</span><span className="wh">To</span>
                {WEEKDAYS.map(({ key, label }) => (
                  <div key={key} className="wrow">
                    <label className="agree"><input type="checkbox" className="check" name={k(`${key}.on`)} defaultChecked={m.windows[key].on} />{label}</label>
                    <input name={k(`${key}.from`)} type="time" defaultValue={m.windows[key].from} aria-label={`${label} from`} />
                    <input name={k(`${key}.to`)} type="time" defaultValue={m.windows[key].to} aria-label={`${label} to`} />
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
