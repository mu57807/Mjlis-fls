import { useState } from "react";
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import type { VisualType } from "@/lib/catalog";
import type { Storyboard } from "@/lib/schema";
import {
  AUDIO_LEAD_SECONDS,
  FPS,
  buildCues,
  buildTimeline,
  estimateWordTimings,
  type TimedScene,
  type VideoProps,
} from "@/lib/video";
import { Subtitles } from "./components";
import { useSceneFade } from "./anim";
import { ensureFonts } from "./fonts";
import { C, fontFamily } from "./theme";
import {
  Checklist,
  ClosingCard,
  KeyLesson,
  ReflectiveQuestions,
  RootCause,
  TitleCard,
  WhatHappened,
  type SceneProps,
} from "./scenes";

const TEMPLATES: Record<VisualType, React.FC<SceneProps>> = {
  title_card: TitleCard,
  what_happened: WhatHappened,
  root_cause: RootCause,
  key_lesson: KeyLesson,
  checklist: Checklist,
  sustain: Checklist,
  reflective_questions: ReflectiveQuestions,
  closing_card: ClosingCard,
};

const MAX_ITEMS_PER_SCENE = 5;

/**
 * Root-cause scenes show the "why it happened" list and checklist scenes the
 * "actions" list. If there are several such scenes, the list is shared out.
 */
function itemsForScene(sb: Storyboard, index: number): string[] {
  const type = sb.scenes[index].visual_type;
  const list =
    type === "root_cause"
      ? sb.why_it_happened
      : type === "checklist" || type === "sustain"
        ? sb.actions
        : type === "reflective_questions"
          ? (sb.reflective_questions ?? [])
          : [];
  const items = list.map((s) => s.trim()).filter(Boolean);
  const sameType = sb.scenes.map((s, i) => (s.visual_type === type ? i : -1)).filter((i) => i >= 0);
  const k = sameType.indexOf(index);
  const per = Math.ceil(items.length / sameType.length);
  return items.slice(k * per, k * per + per).slice(0, MAX_ITEMS_PER_SCENE);
}

function SceneRenderer({
  timed,
  props,
  totalFrames,
}: {
  timed: TimedScene;
  props: VideoProps;
  totalFrames: number;
}) {
  const frame = useCurrentFrame();
  const opacity = useSceneFade(timed.durationInFrames, timed.index === 0);
  const { storyboard } = props;
  const scene = storyboard.scenes[timed.index];
  const lang = storyboard.language;
  const Template = TEMPLATES[scene.visual_type] ?? WhatHappened;

  const sceneSeconds = timed.durationInFrames / FPS;
  const words = timed.audio?.words ?? estimateWordTimings(scene.narration, sceneSeconds, lang);
  const cues = buildCues(words, AUDIO_LEAD_SECONDS);
  const wordTimes = words.map((w) => w.start + AUDIO_LEAD_SECONDS);

  return (
    <AbsoluteFill style={{ opacity }}>
      <Template
        scene={scene}
        storyboard={storyboard}
        lang={lang}
        durationInFrames={timed.durationInFrames}
        progress={Math.min(1, (timed.from + frame) / totalFrames)}
        items={itemsForScene(storyboard, timed.index)}
        imageSrc={(file) => (props.imageBase ? `${props.imageBase}${file}` : staticFile(`images/${file}`))}
      />
      <Subtitles cues={cues} wordTimes={wordTimes} lang={lang} />
      {timed.audio && (
        <Sequence from={Math.round(AUDIO_LEAD_SECONDS * FPS)} layout="none">
          <Html5Audio
            src={props.audioBase ? `${props.audioBase}${timed.audio.file}` : staticFile(`audio/${timed.audio.file}`)}
          />
        </Sequence>
      )}
    </AbsoluteFill>
  );
}

export const LfiVideo: React.FC<VideoProps> = (props) => {
  useState(() => ensureFonts());
  const lang = props.storyboard.language;
  const timeline = buildTimeline(props);
  return (
    <AbsoluteFill
      dir={lang === "ar" ? "rtl" : "ltr"}
      lang={lang}
      style={{ background: C.background, fontFamily: fontFamily(lang), color: C.text }}
    >
      {timeline.scenes.map((t) => (
        <Sequence
          key={t.sceneId}
          from={t.from}
          durationInFrames={t.durationInFrames}
          name={`${t.index + 1}. ${props.storyboard.scenes[t.index].visual_type}`}
        >
          <SceneRenderer timed={t} props={props} totalFrames={timeline.durationInFrames} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
