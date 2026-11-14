"use client";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { saveProduct, type ProductFormState } from "@/app/admin/products/actions";

type Group = { section: string; items: { value: string; label: string }[] };
export type ProductInit = {
  id?: string; name: string; brand: string; size: string; sku: string;
  price: string; was: string; categories: string[]; inStock: boolean; active: boolean; image: string; slug?: string;
};

/**
 * Prepares an uploaded photo in the browser:
 *  - shrinks it to at most 1000px,
 *  - removes the plain background around the product (found from the photo's edges) so it is transparent,
 *  - saves it as WebP with transparency.
 */
async function prepare(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1000 / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bmp, 0, 0, w, h);
    const img = ctx.getImageData(0, 0, w, h);
    removeBackground(img.data, w, h);
    ctx.putImageData(img, 0, 0);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.9));
    return blob ? new File([blob], "photo.webp", { type: "image/webp" }) : file;
  } catch {
    return file;
  }
}

/** Flood-fills the background from the edges and makes it transparent, with soft edges. */
function removeBackground(d: Uint8ClampedArray, w: number, h: number) {
  const border: number[] = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1);
  // Already transparent around the edges: nothing to do.
  if (border.filter((i) => d[i * 4 + 3] < 20).length > border.length * 0.6) return;
  // Background colour = the most common (rounded) edge colour.
  const counts = new Map<number, number>();
  for (const i of border) {
    const k = ((d[i * 4] >> 4) << 8) | ((d[i * 4 + 1] >> 4) << 4) | (d[i * 4 + 2] >> 4);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const top = [...counts].sort((a, b) => b[1] - a[1])[0][0];
  const br = ((top >> 8) & 15) * 16 + 8, bg = ((top >> 4) & 15) * 16 + 8, bb = (top & 15) * 16 + 8;
  const T = 42;
  const dist = (i: number) => Math.hypot(d[i * 4] - br, d[i * 4 + 1] - bg, d[i * 4 + 2] - bb);
  const bgMask = new Uint8Array(w * h);
  const stack = border.filter((i) => dist(i) < T);
  stack.forEach((i) => (bgMask[i] = 1));
  while (stack.length) {
    const i = stack.pop()!;
    const x = i % w, y = (i - x) / w;
    for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
      if (n >= 0 && !bgMask[n] && dist(n) < T) { bgMask[n] = 1; stack.push(n); }
    }
  }
  for (let i = 0; i < w * h; i++) {
    if (bgMask[i]) { d[i * 4 + 3] = 0; continue; }
    // Soften pixels touching the background.
    const x = i % w;
    const near = (x > 0 && bgMask[i - 1]) || (x < w - 1 && bgMask[i + 1]) || (i >= w && bgMask[i - w]) || (i < w * (h - 1) && bgMask[i + w]);
    if (near) d[i * 4 + 3] = Math.min(d[i * 4 + 3], Math.round(Math.min(1, Math.max(0.35, (dist(i) - T) / T)) * 255));
  }
}

export function ProductForm({ init, groups, returnTo }: { init: ProductInit; groups: Group[]; returnTo: string }) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(saveProduct, { errors: {} });
  const v = { ...init, ...(state.values ?? {}) } as ProductInit;
  const [preview, setPreview] = useState(init.image);
  const photo = useRef<File | null>(null);
  const e = state.errors;

  return (
    <form
      className="pform"
      action={(fd) => {
        fd.delete("photo");
        if (photo.current) fd.set("photo", photo.current);
        return action(fd);
      }}
    >
      {init.id && <input type="hidden" name="id" value={init.id} />}
      <input type="hidden" name="returnTo" value={returnTo} />
      {e.form && <div className="notice bad">{e.form}</div>}
      {Object.keys(e).length > 0 && !e.form && <div className="notice bad">Please fix the highlighted fields below. Nothing has been lost.</div>}

      <div className="pgrid">
        <div>
          <div className="panel">
            <h2>Details</h2>
            <div className="fields">
              <div className={`field full ${e.name ? "bad" : ""}`}>
                <label htmlFor="name">Product name</label>
                <input id="name" name="name" defaultValue={v.name} required maxLength={200} />
                {e.name && <div className="err">{e.name}</div>}
              </div>
              <div className="field"><label htmlFor="brand">Brand</label><input id="brand" name="brand" defaultValue={v.brand} maxLength={100} /></div>
              <div className="field"><label htmlFor="size">Size</label><input id="size" name="size" defaultValue={v.size} maxLength={50} /></div>
              <div className={`field ${e.price ? "bad" : ""}`}>
                <label htmlFor="price">Selling price ($)</label>
                <input id="price" name="price" defaultValue={v.price} inputMode="decimal" required />
                {e.price && <div className="err">{e.price}</div>}
              </div>
              <div className={`field ${e.was ? "bad" : ""}`}>
                <label htmlFor="was">Usual price ($)</label>
                <input id="was" name="was" defaultValue={v.was} inputMode="decimal" />
                {e.was && <div className="err">{e.was}</div>}
              </div>
              <div className="field"><label htmlFor="sku">Product code</label><input id="sku" name="sku" defaultValue={v.sku} maxLength={50} /></div>
            </div>
          </div>

          <div className={`panel ${e.categories ? "badp" : ""}`}>
            <h2>Categories</h2>
            {e.categories && <div className="err" style={{ marginBottom: 10 }}>{e.categories}</div>}
            <div className="cgroups">
              {groups.map((g) => (
                <fieldset key={g.section}>
                  <legend>{g.section}</legend>
                  {g.items.map((it) => (
                    <label key={it.value}><input type="checkbox" className="check" name="categories" value={it.value} defaultChecked={v.categories.includes(it.value)} />{it.label}</label>
                  ))}
                </fieldset>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className={`panel ${e.photo ? "badp" : ""}`}>
            <h2>Photo</h2>
            <div className="ppic checker">{preview ? <img src={preview} alt="" /> : <span>No photo yet</span>}</div>
            <label className="btn btn-sm btn-line upl">
              {preview ? "Change photo" : "Upload photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (ev) => {
                const f = ev.target.files?.[0];
                if (!f) return;
                const small = await prepare(f);
                photo.current = small;
                setPreview(URL.createObjectURL(small));
              }} />
            </label>
            {e.photo && <div className="err">{e.photo}</div>}
          </div>

          <div className="panel">
            <h2>In the shop</h2>
            <label className="agree"><input type="checkbox" className="check" name="inStock" defaultChecked={v.inStock} />In stock</label>
            <label className="agree" style={{ marginTop: 12 }}><input type="checkbox" className="check" name="active" defaultChecked={v.active} />Shown in the shop</label>
            {init.slug && <p className="hint" style={{ marginTop: 14 }}>Shop page: <a className="u" href={`/p/${init.slug}`} target="_blank" rel="noopener">/p/{init.slug}</a></p>}
          </div>

          <div className="pbtns">
            <button className="btn btn-block" disabled={pending}>{pending ? "Saving…" : init.id ? "Save changes" : "Add product"}</button>
            <Link className="btn btn-block btn-line" href={returnTo}>Cancel</Link>
          </div>
        </div>
      </div>
    </form>
  );
}
