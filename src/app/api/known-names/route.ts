import { z } from "zod";
import { addKnownName, listKnownNames } from "@/lib/db";
import { KNOWN_NAME_KINDS, defaultReplacement } from "@/lib/known-names";

// GET /api/known-names - the names list.
export async function GET() {
  return Response.json({ names: listKnownNames() });
}

const AddSchema = z.object({
  term: z.string().trim().min(2, "Enter a name of at least 2 characters.").max(120),
  kind: z.enum(KNOWN_NAME_KINDS),
  replacement: z.string().trim().max(60).optional(),
});

// POST /api/known-names - add one name. Body: { term, kind, replacement? }
export async function POST(request: Request) {
  const parsed = AddSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues.map((i) => i.message).join(" ") }, { status: 400 });
  const { term, kind } = parsed.data;
  if (listKnownNames().some((n) => n.term.toLowerCase() === term.toLowerCase())) {
    return Response.json({ error: "This name is already on the list." }, { status: 409 });
  }
  const name = addKnownName({ term, kind, replacement: parsed.data.replacement || defaultReplacement(kind, term) });
  return Response.json({ name }, { status: 201 });
}
