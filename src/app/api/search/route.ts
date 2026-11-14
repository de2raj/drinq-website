import { searchIndex } from "@/lib/catalogue";

export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(await searchIndex(), { headers: { "Cache-Control": "public, max-age=60" } });
}
