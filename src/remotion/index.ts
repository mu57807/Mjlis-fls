// Entry point for the Remotion renderer (see scripts/render-worker.ts).
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
