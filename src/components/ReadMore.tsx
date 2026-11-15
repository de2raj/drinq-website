"use client";
import { useState } from "react";

/** Description that shows a few lines first, with "Read the full story". */
export function ReadMore({ paras }: { paras: string[] }) {
  const [open, setOpen] = useState(false);
  const long = paras.join(" ").length > 320;
  return (
    <div className={`story ${open || !long ? "open" : ""}`}>
      <div className="stext">{paras.map((t, i) => <p key={i}>{t}</p>)}</div>
      {long && <button type="button" onClick={() => setOpen(!open)}>{open ? "Show less" : "Read the full story"}</button>}
    </div>
  );
}
