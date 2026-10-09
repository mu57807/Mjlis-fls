// Quick self-check of the storyboard logic, no API key needed.
// Run with:  npm run self-check
import { DEMO_STORYBOARDS } from "../src/samples/demo-storyboards";
import { SAMPLE_INCIDENTS } from "../src/samples/incidents";
import { StoryboardSchema, type Storyboard } from "../src/lib/schema";
import { checkStoryboard, fitDurations, totalDuration } from "../src/lib/storyboard-checks";
import { buildCues, buildSrt, buildTimeline, estimateWordTimings, FPS } from "../src/lib/video";
import { wordsFromAlignment } from "../src/lib/tts/elevenlabs";

let failures = 0;
function expect(cond: boolean, msg: string) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) failures++;
}

for (const sample of SAMPLE_INCIDENTS) {
  for (const lang of ["en", "ar"] as const) {
    const raw = DEMO_STORYBOARDS[sample.id][lang];
    const sb: Storyboard = {
      ...raw,
      language: lang,
      scenes: raw.scenes.map((s, i) => ({ ...s, id: `s${i}` })),
    };
    const label = `${sample.id} (${lang})`;
    expect(StoryboardSchema.safeParse(sb).success, `${label}: matches the storyboard schema`);
    const report = checkStoryboard(sb, 60, sample.text);
    expect(report.totalSeconds === 60, `${label}: scenes add up to 60s`);
    expect(report.identifiers.length === 0, `${label}: no identifying details left`);
    for (const w of report.warnings) console.log(`      note: ${w.message}`);
    for (const f of report.identifiers) console.log(`      flag: "${f.text}" in ${f.where}`);
    const fitted = fitDurations(sb.scenes, 90);
    expect(totalDuration(fitted) === 90, `${label}: fits to 90s`);
  }
}

// The detector must catch details that were NOT removed.
const leaky: Storyboard = {
  ...DEMO_STORYBOARDS["dropped-object"].en,
  language: "en",
  scenes: [
    {
      id: "x",
      visual_type: "what_happened",
      narration: "Ahmed dropped a spanner on Rig AD-27 under permit PTW-55721, badge 448812.",
      caption: "Gulf Drilling crew",
      icons: [],
      duration_seconds: 10,
    },
  ],
};
const leakyFlags = checkStoryboard(leaky, 60, SAMPLE_INCIDENTS[0].text).identifiers.map((f) => f.text);
for (const needle of ["Ahmed", "AD-27", "PTW-55721", "448812", "Gulf"]) {
  expect(leakyFlags.includes(needle), `detector flags leftover "${needle}"`);
}

const leakyAr: Storyboard = {
  ...DEMO_STORYBOARDS["line-of-fire"].ar,
  language: "ar",
  scenes: [
    {
      id: "y",
      visual_type: "what_happened",
      narration: "أُصيب خالد من شركة النجم في حقل الريان.",
      caption: "",
      icons: [],
      duration_seconds: 10,
    },
  ],
};
const arFlags = checkStoryboard(leakyAr, 60, SAMPLE_INCIDENTS[1].text).identifiers.map((f) => f.text);
for (const needle of ["النجم", "الريان"]) {
  expect(arFlags.includes(needle), `detector flags leftover Arabic "${needle}"`);
}

// Video timing
{
  const raw = DEMO_STORYBOARDS["dropped-object"].en;
  const sb: Storyboard = { ...raw, language: "en", scenes: raw.scenes.map((s, i) => ({ ...s, id: `s${i}` })) };
  const silent = buildTimeline({ storyboard: sb, audio: null });
  expect(silent.durationInFrames === 60 * FPS, "silent video is exactly 60s");
  const longAudio = {
    s1: { file: "a.mp3", text: sb.scenes[1].narration, durationSec: 20, words: [] },
  };
  const voiced = buildTimeline({ storyboard: sb, audio: longAudio });
  expect(voiced.scenes[1].durationInFrames > 13 * FPS, "scene grows to fit a longer voiceover");
  const stale = buildTimeline({ storyboard: sb, audio: { s1: { ...longAudio.s1, text: "old text" } } });
  expect(stale.durationInFrames === 60 * FPS, "voiceover for edited narration is ignored");
  const words = estimateWordTimings(sb.scenes[2].narration, 14, "en");
  const cues = buildCues(words, 0.3);
  expect(cues.every((c) => c.text.length <= 48), "subtitle lines stay short");
  expect(cues.map((c) => c.text).join(" ") === sb.scenes[2].narration, "subtitles contain the whole narration");
  expect(buildSrt({ storyboard: sb, audio: null }).startsWith("1\n00:00:00,300 --> "), "SRT file is well formed");
  const aligned = wordsFromAlignment({
    characters: [..."Stop work"],
    character_start_times_seconds: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
    character_end_times_seconds: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9],
  });
  expect(aligned.length === 2 && aligned[1].text === "work" && aligned[1].start === 0.5, "ElevenLabs timings become words");
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
