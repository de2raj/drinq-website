"use client";
/**
 * Prepares an uploaded photo in the browser:
 *  - shrinks it to at most 1000px,
 *  - removes the plain background around the product (found from the photo's edges) so it is transparent,
 *  - saves it as WebP with transparency.
 */
export async function prepare(file: File): Promise<File> {
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

