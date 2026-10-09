import { useVideoConfig } from "remotion";

/** Layout numbers for the current format. Sizes are in pixels for a 1080-px short side. */
export function useLayout() {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  return {
    vertical,
    width,
    height,
    padX: vertical ? 72 : 110,
    headerH: vertical ? 120 : 104,
    /** Space kept free at the bottom for subtitles. */
    subtitleZone: vertical ? 420 : 230,
    titleSize: vertical ? 84 : 92,
    captionSize: vertical ? 76 : 72,
    bodySize: vertical ? 50 : 42,
    subtitleSize: vertical ? 52 : 46,
  };
}
