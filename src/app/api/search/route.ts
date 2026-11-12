import { searchIndex } from "@/lib/catalogue";

export const dynamic = "force-static";
export function GET() {
  return Response.json(searchIndex(), { headers: { "Cache-Control": "public, max-age=300" } });
}
