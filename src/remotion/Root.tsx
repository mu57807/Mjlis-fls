import { Composition, type CalculateMetadataFunction } from "remotion";
import { DEMO_STORYBOARDS } from "@/samples/demo-storyboards";
import { buildTimeline, dimensions, FPS, type VideoProps } from "@/lib/video";
import { completeStoryboard } from "@/lib/schema";
import { LfiVideo } from "./LfiVideo";

export const COMPOSITION_ID = "LfiVideo";

const sample = DEMO_STORYBOARDS["dropped-object"].en;
const defaultProps: VideoProps = {
  storyboard: completeStoryboard(sample, "en"),
  aspectRatio: "16:9",
  audio: null,
  audioBase: null,
};

const calculateMetadata: CalculateMetadataFunction<VideoProps> = ({ props }) => ({
  durationInFrames: buildTimeline(props).durationInFrames,
  ...dimensions(props.aspectRatio),
});

export const RemotionRoot: React.FC = () => (
  <Composition
    id={COMPOSITION_ID}
    component={LfiVideo}
    fps={FPS}
    width={1920}
    height={1080}
    durationInFrames={FPS * 60}
    defaultProps={defaultProps}
    calculateMetadata={calculateMetadata}
  />
);
