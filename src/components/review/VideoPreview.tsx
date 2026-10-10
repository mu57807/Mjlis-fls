"use client";

import { useMemo } from "react";
import { Player } from "@remotion/player";
import { LfiVideo } from "@/remotion/LfiVideo";
import type { AspectRatio } from "@/lib/catalog";
import type { Storyboard } from "@/lib/schema";
import { buildTimeline, dimensions, FPS, type AudioManifest, type VideoProps } from "@/lib/video";

/** Live preview of the video, using exactly the same templates as the final render. */
export default function VideoPreview({
  projectId,
  storyboard,
  aspectRatio,
  audio,
}: {
  projectId: string;
  storyboard: Storyboard;
  aspectRatio: AspectRatio;
  audio: AudioManifest | null;
}) {
  const inputProps: VideoProps = useMemo(
    () => ({
      storyboard,
      aspectRatio,
      audio,
      audioBase: `/api/projects/${projectId}/files/audio/`,
      imageBase: `/api/projects/${projectId}/files/images/`,
    }),
    [storyboard, aspectRatio, audio, projectId],
  );
  const { width, height } = dimensions(aspectRatio);
  const { durationInFrames } = buildTimeline(inputProps);
  const vertical = aspectRatio === "9:16";

  return (
    <div className={vertical ? "mx-auto w-full max-w-[340px]" : "w-full"}>
      <Player
        component={LfiVideo}
        inputProps={inputProps}
        durationInFrames={durationInFrames}
        compositionWidth={width}
        compositionHeight={height}
        fps={FPS}
        controls
        clickToPlay
        showPosterWhenUnplayed
        renderPoster={() => (
          <div className="flex h-full w-full items-center justify-center">
            <span className="rounded-full bg-white/95 px-4 py-2 text-sm font-semibold text-brand shadow-lg">
              ▶ Play preview
            </span>
          </div>
        )}
        doubleClickToFullscreen
        style={{ width: "100%", aspectRatio: `${width} / ${height}`, borderRadius: 12, overflow: "hidden" }}
      />
    </div>
  );
}
