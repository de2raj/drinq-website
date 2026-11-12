import Link from "next/link";
import { lite, sectionProducts, subProducts } from "@/lib/catalogue";
import type { Section, Sub } from "@/lib/types";
import { CategoryBrowser } from "./CategoryBrowser";

export function CategoryView({ section, sub }: { section: Section; sub?: Sub }) {
  const products = (sub ? subProducts(sub) : sectionProducts(section)).map(lite);
  const total = sectionProducts(section).length;
  return (
    <div className="wrap">
      <div className="crumbs">
        <Link href="/">Home</Link> / {sub ? <><Link href={`/${section.slug}`}>{section.name}</Link> / {sub.name}</> : section.name}
      </div>
      <div className="chero">
        <div><h1 className="display">{sub ? sub.name : section.name}</h1><p>{section.blurb}</p></div>
        <span className="count-pill">{products.length} products</span>
      </div>
      {section.subs.length > 0 && (
        <nav className="subs" aria-label={`${section.name} types`}>
          <Link className="sub plain" href={`/${section.slug}`} aria-current={!sub ? "page" : undefined}>All <small>{total}</small></Link>
          {section.subs.map((x) => {
            const ps = subProducts(x);
            const pic = ps.find((p) => p.thumb)?.thumb;
            return (
              <Link key={x.slug} className="sub" href={`/${section.slug}/${x.slug}`} aria-current={sub?.slug === x.slug ? "page" : undefined}>
                {pic && <img src={pic} alt="" />}{x.name} <small>{ps.length}</small>
              </Link>
            );
          })}
        </nav>
      )}
      <CategoryBrowser key={sub?.slug ?? section.slug} products={products} />
    </div>
  );
}
