import { deleteKnownName } from "@/lib/db";

// DELETE /api/known-names/:id
export async function DELETE(_req: Request, ctx: RouteContext<"/api/known-names/[id]">) {
  const { id } = await ctx.params;
  return deleteKnownName(id) ? new Response(null, { status: 204 }) : Response.json({ error: "Not found" }, { status: 404 });
}
