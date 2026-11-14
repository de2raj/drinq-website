import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryView } from "@/components/CategoryView";
import { findSection } from "@/lib/sections";

type P = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const s = findSection((await params).section);
  return s ? { title: `${s.name} delivered in Singapore`, description: s.blurb } : {};
}

export default async function SectionPage({ params }: P) {
  const s = findSection((await params).section);
  if (!s) notFound();
  return <CategoryView section={s} />;
}
