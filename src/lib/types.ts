export type Product = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  brand: string;
  size: string;
  price: number; // cents
  was: number; // cents (regular price)
  categories: string[];
  image: string;
  thumb: string;
  inStock: boolean;
  active: boolean;
  rank: number;
  description: string;
  tastingNotes: string;
  origin: string;
  abv: number | null;
  giftBox: boolean;
  specs: [string, string][]; // other characteristics, e.g. ["Colour", "Golden Yellow"]
};

/** What a product card / list needs (kept small for the browser). */
export type ProductLite = Pick<Product, "id" | "slug" | "name" | "brand" | "size" | "price" | "was" | "thumb" | "inStock" | "rank">;

export type Sub = { name: string; slug: string; cats: string[] };
export type Section = { name: string; slug: string; blurb: string; cats: string[]; subs: Sub[]; deal?: boolean };
