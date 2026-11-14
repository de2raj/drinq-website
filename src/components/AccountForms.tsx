"use client";
import Link from "next/link";
import { useActionState } from "react";
import { changePassword, login, register, saveDetails, type FormState } from "@/app/account/actions";

const Msg = ({ s }: { s: FormState }) => (s.error ? <div className="notice bad">{s.error}</div> : s.ok ? <div className="notice">{s.ok}</div> : null);

export function LoginForm({ next }: { next: string }) {
  const [s, act, busy] = useActionState(login, {});
  return (
    <form action={act} className="panel aform">
      <Msg s={s} />
      <input type="hidden" name="next" value={next} />
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" defaultValue={s.values?.email} required /></div>
      <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
      <button className="btn btn-block" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      <p className="alt">New here? <Link className="u" href={`/account/register?next=${encodeURIComponent(next)}`}>Create an account</Link></p>
      <p className="alt small">Forgot your password? Message us on Telegram and we&apos;ll reset it.</p>
    </form>
  );
}

export function RegisterForm({ next, email }: { next: string; email: string }) {
  const [s, act, busy] = useActionState(register, {});
  const v = s.values ?? { email };
  return (
    <form action={act} className="panel aform">
      <Msg s={s} />
      <input type="hidden" name="next" value={next} />
      <div className="field"><label htmlFor="name">Full name</label><input id="name" name="name" autoComplete="name" defaultValue={v.name} required /></div>
      <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" defaultValue={v.email} required /></div>
      <div className="field"><label htmlFor="phone">Mobile number</label><input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={v.phone} required /></div>
      <div className="field"><label htmlFor="password">Password (at least 8 characters)</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></div>
      <label className="agree"><input type="checkbox" className="check" name="marketing" /><span>Send me DRINQ deals and offers.</span></label>
      <button className="btn btn-block" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
      <p className="alt">Already have an account? <Link className="u" href={`/account/login?next=${encodeURIComponent(next)}`}>Sign in</Link></p>
    </form>
  );
}

type Details = { name: string; phone: string; address: string; unit: string; postal: string; birthday: string; marketing: boolean };
export function DetailsForm({ d }: { d: Details }) {
  const [s, act, busy] = useActionState(saveDetails, {});
  const v = { ...d, ...(s.values ?? {}) };
  return (
    <form action={act} className="panel">
      <h2>Your details</h2>
      <Msg s={s} />
      <div className="fields">
        <div className="field"><label htmlFor="d-name">Full name</label><input id="d-name" name="name" defaultValue={v.name} /></div>
        <div className="field"><label htmlFor="d-phone">Mobile number</label><input id="d-phone" name="phone" defaultValue={v.phone} inputMode="tel" /></div>
        <div className="field full"><label htmlFor="d-address">Delivery address</label><input id="d-address" name="address" defaultValue={v.address} /></div>
        <div className="field"><label htmlFor="d-unit">Unit</label><input id="d-unit" name="unit" defaultValue={v.unit} /></div>
        <div className="field"><label htmlFor="d-postal">Postal code</label><input id="d-postal" name="postal" defaultValue={v.postal} inputMode="numeric" /></div>
        <div className="field"><label htmlFor="d-birthday">Birthday (optional)</label><input id="d-birthday" name="birthday" type="date" defaultValue={v.birthday} /></div>
      </div>
      <label className="agree"><input type="checkbox" className="check" name="marketing" defaultChecked={d.marketing} /><span>Send me DRINQ deals and offers.</span></label>
      <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save details"}</button>
    </form>
  );
}

export function PasswordForm() {
  const [s, act, busy] = useActionState(changePassword, {});
  return (
    <form action={act} className="panel">
      <h2>Password</h2>
      <Msg s={s} />
      <div className="fields">
        <div className="field"><label htmlFor="p-cur">Current password</label><input id="p-cur" name="current" type="password" autoComplete="current-password" /></div>
        <div className="field"><label htmlFor="p-new">New password</label><input id="p-new" name="password" type="password" autoComplete="new-password" minLength={8} /></div>
      </div>
      <button className="btn btn-line" disabled={busy}>{busy ? "Saving…" : "Change password"}</button>
    </form>
  );
}
