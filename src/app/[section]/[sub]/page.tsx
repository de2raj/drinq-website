import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryView } from "@/components/CategoryView";
import { findSection, SECTIONS } from "@/lib/sections";

type P = { params: Promise<{ section: string; sub: string }> };
export const dynamicParams = false;
export const generateStaticParams = () => SECTIONS.flatMap((s) => s.subs.map((x) => ({ section: s.slug, sub: x.slug })));

async function find(params: P["params"]) {
  const { section, sub } = await params;
  const s = findSection(section);
  return { s, x: s?.subs.find((x) => x.slug === sub) };
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { s, x } = await find(params);
  return s && x ? { title: `${x.name} — ${s.name} delivered in Singapore`, description: s.blurb } : {};
}

export default async function SubPage({ params }: P) {
  const { s, x } = await find(params);
  if (!s || !x) notFound();
  return <CategoryView section={s} sub={x} />;
}
