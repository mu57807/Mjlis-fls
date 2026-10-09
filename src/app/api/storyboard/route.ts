import { CreateRequestSchema } from "@/lib/schema";
import { StructuringError } from "@/lib/claude/structure";
import { createFromIncident } from "@/lib/pipeline";

// POST /api/storyboard
// Body: { description, outputLanguage: "en"|"ar"|"both", aspectRatio, targetSeconds }
// Creates one project per output language ("both" = two separate videos).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = CreateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues.map((i) => i.message).join(" ") },
      { status: 400 },
    );
  }
  try {
    const projects = await createFromIncident({ ...parsed.data, origin: "web" });
    return Response.json({ projectIds: projects.map((p) => p.id) });
  } catch (err) {
    if (err instanceof StructuringError) {
      return Response.json({ error: err.message }, { status: 502 });
    }
    console.error("Storyboard generation failed", err);
    return Response.json(
      { error: "Something went wrong while creating the storyboard. Check the server log." },
      { status: 500 },
    );
  }
}
