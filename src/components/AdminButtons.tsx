"use client";
import { useState } from "react";

export function PrintButton() {
  return <button type="button" className="btn btn-sm noprint" onClick={() => window.print()}>Print / save as PDF</button>;
}

export function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn btn-sm" onClick={async () => {
      try { await navigator.clipboard.writeText(url); } catch { window.prompt("Copy this link", url); }
      setDone(true); setTimeout(() => setDone(false), 2000);
    }}>{done ? "Copied ✓" : "Copy link"}</button>
  );
}
