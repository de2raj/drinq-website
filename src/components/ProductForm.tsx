"use client";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { saveProduct, type ProductFormState } from "@/app/admin/products/actions";

type Group = { section: string; items: { value: string; label: string }[] };
export type ProductInit = {
  id?: string; name: string; brand: string; size: string; sku: string;
  price: string; was: string; categories: string[]; inStock: boolean; active: boolean; image: string; slug?: string;
};

/** Shrinks a photo in the browser (max 1000px, WebP) so uploads stay small and fast. */
async function shrink(file: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff"; // transparent PNGs get a white background, like the shop cards
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/webp", 0.86));
    return blob ? new File([blob], "photo.webp", { type: "image/webp" }) : file;
  } catch {
    return file;
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
                <input id="name" name="name" defaultValue={v.name} required maxLength={200} placeholder="e.g. Chivas Regal 12 Years 700ML" />
                {e.name && <div className="err">{e.name}</div>}
              </div>
              <div className="field"><label htmlFor="brand">Brand</label><input id="brand" name="brand" defaultValue={v.brand} maxLength={100} /></div>
              <div className="field"><label htmlFor="size">Size</label><input id="size" name="size" defaultValue={v.size} maxLength={50} placeholder="700ml, 1L, 24 × 330ml" /></div>
              <div className={`field ${e.price ? "bad" : ""}`}>
                <label htmlFor="price">Selling price ($)</label>
                <input id="price" name="price" defaultValue={v.price} inputMode="decimal" required placeholder="56.00" />
                {e.price && <div className="err">{e.price}</div>}
              </div>
              <div className={`field ${e.was ? "bad" : ""}`}>
                <label htmlFor="was">Usual price ($) — only when on sale</label>
                <input id="was" name="was" defaultValue={v.was} inputMode="decimal" placeholder="Leave blank if not on sale" />
                {e.was && <div className="err">{e.was}</div>}
              </div>
              <div className="field"><label htmlFor="sku">Product code</label><input id="sku" name="sku" defaultValue={v.sku} maxLength={50} /></div>
            </div>
          </div>

          <div className={`panel ${e.categories ? "badp" : ""}`}>
            <h2>Categories</h2>
            <p className="hint">Tick where it should appear in the shop menu. A product can be in more than one.</p>
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
            <div className="ppic">{preview ? <img src={preview} alt="" /> : <span>No photo yet</span>}</div>
            <label className="btn btn-sm btn-line upl">
              {preview ? "Change photo" : "Upload photo"}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={async (ev) => {
                const f = ev.target.files?.[0];
                if (!f) return;
                const small = await shrink(f);
                photo.current = small;
                setPreview(URL.createObjectURL(small));
              }} />
            </label>
            <p className="hint">JPG, PNG or WebP. Square photos on a white background look best.</p>
            {e.photo && <div className="err">{e.photo}</div>}
          </div>

          <div className="panel">
            <h2>In the shop</h2>
            <label className="agree"><input type="checkbox" className="check" name="inStock" defaultChecked={v.inStock} />In stock (customers can buy it)</label>
            <label className="agree" style={{ marginTop: 12 }}><input type="checkbox" className="check" name="active" defaultChecked={v.active} />Shown in the shop (untick to hide it)</label>
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
