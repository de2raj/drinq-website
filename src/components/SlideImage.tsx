"use client";
import { useRef, useState } from "react";
import { prepare } from "@/lib/photo";

/** Slide photo: keeps the current one, or takes an upload with the background removed (sent with the form). */
export function SlideImage({ name, current, fallback }: { name: string; current: string; fallback: string }) {
  const [preview, setPreview] = useState(current || fallback);
  const [url, setUrl] = useState(current);
  const file = useRef<HTMLInputElement>(null);
  return (
    <div className="simgpick">
      <div className="hpimg checker">{preview ? <img src={preview} alt="" /> : <span>No photo</span>}</div>
      <input type="hidden" name={`${name}.image`} value={url} />
      <label className="btn btn-sm btn-line upl">Upload photo
        <input ref={file} type="file" name={`${name}.file`} accept="image/jpeg,image/png,image/webp" onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const small = await prepare(f);
          const dt = new DataTransfer();
          dt.items.add(small);
          e.target.files = dt.files;
          setPreview(URL.createObjectURL(small));
        }} />
      </label>
      {url && <button type="button" className="clear" onClick={() => { setUrl(""); setPreview(fallback); if (file.current) file.current.value = ""; }}>Use product photo</button>}
    </div>
  );
}
