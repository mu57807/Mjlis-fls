import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

/** 0 -> 1 spring that starts at `delay` frames. */
export function useEnter(delay = 0, damping = 14) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, mass: 0.7 } });
}

/**
 * Fade the scene in at the start and out at the end. The first scene does not
 * fade in, so the video's first frame (and the preview poster) is never blank.
 */
export function useSceneFade(durationInFrames: number, isFirst = false) {
  const frame = useCurrentFrame();
  return interpolate(frame, [0, 8, durationInFrames - 8, durationInFrames], [isFirst ? 1 : 0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

/** Spread `count` reveal moments over the first part of the scene. */
export function staggeredDelays(count: number, durationInFrames: number, startFrame = 12) {
  const window = Math.max(count, durationInFrames * 0.62 - startFrame);
  return Array.from({ length: count }, (_, i) => Math.round(startFrame + (window / Math.max(1, count)) * i));
}
