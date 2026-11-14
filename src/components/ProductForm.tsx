"use client";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { saveProduct, type ProductFormState } from "@/app/admin/products/actions";
import { prepare } from "@/lib/photo";

type Group = { section: string; items: { value: string; label: string }[] };
export type ProductInit = {
  id?: string; name: string; brand: string; size: string; sku: string;
  price: string; was: string; categories: string[]; inStock: boolean; active: boolean; image: string; slug?: string;
};

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
              <div className="field"><label htmlFor="sku">ERP SKU (e.g. WHS-CREG-700-01)</label><input id="sku" name="sku" defaultValue={v.sku} maxLength={50} /></div>
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
