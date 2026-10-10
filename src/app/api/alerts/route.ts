import { getAlertBannedHashes, listAlerts } from "@/lib/db";
import { checkTexts } from "@/lib/compliance";
import { MAX_UPLOAD_BYTES, processUpload } from "@/lib/alerts/process";
import { StructuringError } from "@/lib/claude/client";

// GET /api/alerts - uploaded alerts, newest first.
export async function GET() {
  return Response.json({
    alerts: listAlerts().map((a) => ({
      id: a.id,
      createdAt: a.createdAt,
      // Never show a title that still contains a company name or ID from the file.
      title: checkTexts([{ where: "title", text: a.fields.incident_title }], getAlertBannedHashes(a.id)).length
        ? "Alert under review (the title still needs fixing)"
        : a.fields.incident_title,
      fileType: a.fileType,
      pictures: a.pictures.length,
      projectIds: a.projectIds,
    })),
  });
}

// POST /api/alerts - multipart form with one "file" (PDF or PPTX, max 20 MB).
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file was uploaded." }, { status: 400 });
  if (file.size > MAX_UPLOAD_BYTES) return Response.json({ error: "The file is larger than 20 MB." }, { status: 413 });
  try {
    const alert = await processUpload(Buffer.from(await file.arrayBuffer()), file.name);
    return Response.json({ alertId: alert.id }, { status: 201 });
  } catch (err) {
    if (err instanceof StructuringError) return Response.json({ error: err.message }, { status: 422 });
    console.error("Alert upload failed", err);
    return Response.json({ error: "The file could not be processed. Check the server log." }, { status: 500 });
  }
}
