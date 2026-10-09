import { getProject, setAudioManifest } from "@/lib/db";
import { generateVoiceover } from "@/lib/tts/voiceover";
import { TtsError } from "@/lib/tts";

// POST /api/projects/:id/voiceover - generate the voiceover for the saved
// storyboard so it can be heard in the preview before rendering.
export async function POST(_req: Request, ctx: RouteContext<"/api/projects/[id]/voiceover">) {
  const { id } = await ctx.params;
  const project = getProject(id);
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  try {
    const audio = await generateVoiceover(id, project.storyboard, project.audio);
    if (!audio) {
      return Response.json(
        { error: "No voice service is set up (TTS_PROVIDER=none). The video will have subtitles only." },
        { status: 409 },
      );
    }
    setAudioManifest(id, audio);
    return Response.json({ project: getProject(id) });
  } catch (err) {
    if (err instanceof TtsError) return Response.json({ error: err.message }, { status: 502 });
    console.error("Voiceover failed", err);
    return Response.json({ error: "Voiceover failed. Check the server log." }, { status: 500 });
  }
}
