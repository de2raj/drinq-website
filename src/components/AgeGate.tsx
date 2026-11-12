"use client";
import { useState } from "react";

/** 18+ check. Remembered for a year in a cookie so the server can skip it next time. */
export function AgeGate({ verified }: { verified: boolean }) {
  const [ok, setOk] = useState(verified);
  if (ok) return null;
  return (
    <div className="gate" role="dialog" aria-modal="true" aria-labelledby="gateTitle">
      <div>
        <img src="/drinq-logo-black.png" alt="DRINQ" />
        <h2 id="gateTitle">Are you 18 or over?</h2>
        <p>You must be of legal drinking age in Singapore to enter.</p>
        <div className="ctas">
          <button className="btn" autoFocus onClick={() => { document.cookie = "drinq_age=1; max-age=31536000; path=/; samesite=lax"; setOk(true); }}>Yes, I&apos;m 18+</button>
          <a className="btn btn-line" href="https://www.google.com">No</a>
        </div>
        <small>By entering you agree to our Terms. Please drink responsibly. Retail sale of liquor is not allowed in Singapore between 10.30pm and 7am; orders placed then are delivered from the next morning.</small>
      </div>
    </div>
  );
}
