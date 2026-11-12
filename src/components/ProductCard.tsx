import Link from "next/link";
import { money } from "@/lib/money";
import type { ProductLite } from "@/lib/types";
import { AddButton } from "./AddButton";

export const shortName = (n: string) => n.replace(/\s*-\s*\d+\s*(cans|bottles|packets|btls)?\s*x.*$/i, "").replace(/\s+\d+(\.\d+)?\s*(ML|L|CL|KG|G)$/i, "");

export function ProductCard({ p, eager }: { p: ProductLite; eager?: boolean }) {
  const off = p.was > p.price ? Math.round((1 - p.price / p.was) * 100) : 0;
  return (
    <article className={`card ${p.inStock ? "" : "oos"}`}>
      <div className="img">
        {off > 0 && <span className="tag">-{off}%</span>}
        {p.thumb && <img src={p.thumb} alt="" loading={eager ? "eager" : "lazy"} />}
      </div>
      <div className="body">
        <span className="brand">{p.brand}</span>
        <h3><Link href={`/p/${p.slug}`}>{shortName(p.name)}</Link></h3>
        {p.size && <span className="size">{p.size}</span>}
        <div className="prow">
          <span className="price">{money(p.price)}{off > 0 && <s>{money(p.was)}</s>}</span>
          <AddButton p={p} />
        </div>
      </div>
    </article>
  );
}
