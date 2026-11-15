"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { slugify, toCents } from "@/lib/admin-products";
import { invalidateCatalogue } from "@/lib/catalogue";
import { db } from "@/lib/db";

/** Every admin change: clear the product cache so the shop shows it at once. */
function refresh() {
  invalidateCatalogue();
  revalidatePath("/", "layout");
}

/** One-row quick edit on the Products list: price, sale price, in stock, shown. */
export async function quickSave(fd: FormData) {
  const id = String(fd.get("id") ?? "");
  const price = toCents(fd.get("price"));
  const was = toCents(fd.get("was"));
  if (!id || price === null || Number.isNaN(price) || price <= 0) return;
  await db.product.update({
    where: { id },
    data: {
      price,
      was: was && !Number.isNaN(was) && was > price ? was : price,
      inStock: fd.get("inStock") === "on",
      active: fd.get("active") === "on",
    },
  });
  refresh();
}

export type ProductFormState = {
  ok?: boolean;
  errors: Partial<Record<"name" | "price" | "was" | "categories" | "photo" | "abv" | "form", string>>;
  values?: Record<string, string | string[] | boolean>;
};

const MAX_PHOTO = 4 * 1024 * 1024;

/** Full edit / add form. Keeps everything typed on errors. */
export async function saveProduct(_prev: ProductFormState, fd: FormData): Promise<ProductFormState> {
  const id = String(fd.get("id") ?? "");
  const name = String(fd.get("name") ?? "").trim().slice(0, 200);
  const brand = String(fd.get("brand") ?? "").trim().slice(0, 100);
  const size = String(fd.get("size") ?? "").trim().slice(0, 50);
  const sku = String(fd.get("sku") ?? "").trim().slice(0, 50);
  const description = String(fd.get("description") ?? "").trim().slice(0, 5000);
  const tastingNotes = String(fd.get("tastingNotes") ?? "").trim().slice(0, 2000);
  const origin = String(fd.get("origin") ?? "").trim().slice(0, 80);
  const abvText = String(fd.get("abv") ?? "").trim().replace("%", "");
  const abv = abvText === "" ? null : Number(abvText);
  const giftBox = fd.get("giftBox") === "on";
  const categories = fd.getAll("categories").map(String).filter(Boolean);
  const inStock = fd.get("inStock") === "on";
  const active = fd.get("active") === "on";
  const price = toCents(fd.get("price"));
  const was = toCents(fd.get("was"));
  const photo = fd.get("photo");
  const returnTo = String(fd.get("returnTo") ?? "/admin/products");

  const errors: ProductFormState["errors"] = {};
  if (!name) errors.name = "Please enter the product name.";
  if (price === null || Number.isNaN(price) || price <= 0) errors.price = "Please enter a price, e.g. 56 or 56.90.";
  if (was !== null && (Number.isNaN(was) || (price && was < price))) errors.was = "The usual price must be blank or more than the selling price.";
  if (abv !== null && !(abv >= 0 && abv <= 100)) errors.abv = "Alcohol % must be a number from 0 to 100.";
  if (!categories.length) errors.categories = "Tick at least one category, so the product shows in the menu.";
  const file = photo instanceof File && photo.size > 0 ? photo : null;
  if (file && (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > MAX_PHOTO)) errors.photo = "Photos must be JPG, PNG or WebP, under 4 MB.";

  if (Object.keys(errors).length) {
    return {
      errors,
      values: {
        name, brand, size, sku, categories, inStock, active,
        price: String(fd.get("price") ?? ""), was: String(fd.get("was") ?? ""),
        description, tastingNotes, origin, abv: abvText, giftBox,
      },
    };
  }

  let image: string | undefined;
  if (file) {
    const img = await db.productImage.create({ data: { type: file.type, data: Buffer.from(await file.arrayBuffer()) } });
    image = `/img/${img.id}`;
  }

  const data = {
    name, brand, size, sku, inStock, active, description, tastingNotes, origin, abv, giftBox,
    price: price!, was: was && was > price! ? was : price!,
    categories: categories.join("|"),
    ...(image ? { image, thumb: image } : {}),
  };

  try {
    if (id) {
      await db.product.update({ where: { id }, data });
    } else {
      let slug = slugify(`${name} ${size}`);
      for (let n = 2; await db.product.findUnique({ where: { slug } }); n++) slug = `${slugify(`${name} ${size}`)}-${n}`;
      const last = await db.product.aggregate({ _max: { rank: true } });
      await db.product.create({ data: { ...data, slug, rank: (last._max.rank ?? 0) + 1 } });
    }
  } catch (e) {
    console.error("Product save failed", e);
    return { errors: { form: "Couldn't save. Please try again." }, values: { name, brand, size, sku, categories, inStock, active, price: String(fd.get("price") ?? ""), was: String(fd.get("was") ?? "") } };
  }
  refresh();
  redirect(returnTo.startsWith("/admin/products") ? returnTo : "/admin/products");
}
