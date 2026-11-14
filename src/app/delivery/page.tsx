import { Info } from "@/components/Info";
import { money } from "@/lib/money";
import { getSetting } from "@/lib/settings";

export const metadata = { title: "Delivery" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const methods = (await getSetting("delivery")).filter((m) => m.enabled);
  return (
    <Info title="Delivery">
      <p>Choose one of these at checkout.</p>
      {methods.map((m) => (
        <section key={m.id}>
          <h2>{m.name} — {m.fee ? money(m.fee) : "Free"}</h2>
          <ul>{m.notice.split("\n").filter(Boolean).map((l) => <li key={l}>{l}</li>)}</ul>
          {m.address && <p><b>Address:</b> {m.address}</p>}
        </section>
      ))}
      <h2>ID check</h2>
      <p>We only hand over to someone aged 18 or over. Please have your NRIC, passport or driving licence ready.</p>
    </Info>
  );
}
