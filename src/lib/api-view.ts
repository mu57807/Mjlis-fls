// What API callers (and callbacks) see of a project.
import type { Project } from "./schema";
import { checkStoryboard } from "./storyboard-checks";
import { reviewUrl, shareUrl } from "./share";

export function projectForApi(p: Project) {
  const report = checkStoryboard(p.storyboard, p.targetSeconds, p.sourceText);
  const done = p.status === "done";
  return {
    id: p.id,
    status: p.status,
    language: p.language,
    aspectRatio: p.aspectRatio,
    title: p.storyboard.title,
    keyLesson: p.storyboard.key_lesson,
    scenes: p.storyboard.scenes.map((s, i) => ({
      number: i + 1,
      visualType: s.visual_type,
      caption: s.caption,
      narration: s.narration,
      seconds: s.duration_seconds,
    })),
    missingInformation: p.storyboard.missing_information,
    /** Possible names/IDs left in the text: show these to the approver. */
    possibleIdentifiers: report.identifiers.map((f) => ({ text: f.text, where: f.where, reason: f.reason })),
    reviewUrl: reviewUrl(p.id),
    render: { stage: p.render.stage, progress: p.render.progress, error: p.render.error },
    videoUrl: done ? shareUrl(p.id, "video.mp4") : null,
    thumbnailUrl: done ? shareUrl(p.id, "thumbnail.jpg") : null,
    videoSeconds: done ? p.render.videoSeconds : null,
    createdAt: p.createdAt,
  };
}
