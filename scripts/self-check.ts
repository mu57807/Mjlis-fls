// Quick self-check of the storyboard logic, no API key needed.
// Run with:  npm run self-check
import { DEMO_STORYBOARDS } from "../src/samples/demo-storyboards";
import { SAMPLE_INCIDENTS } from "../src/samples/incidents";
import { StoryboardSchema, completeStoryboard, type Storyboard } from "../src/lib/schema";
import { checkStoryboard, fitDurations, totalDuration } from "../src/lib/storyboard-checks";
import { buildCues, buildSrt, buildTimeline, estimateWordTimings, FPS } from "../src/lib/video";
import { wordsFromAlignment } from "../src/lib/tts/elevenlabs";
import { checkStoryboardCompliance, checkTexts, hashTerms, scanSourceForSensitiveTerms } from "../src/lib/compliance";
import { redactLocally } from "../src/lib/redact";

let failures = 0;
function expect(cond: boolean, msg: string) {
  console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`);
  if (!cond) failures++;
}

for (const sample of SAMPLE_INCIDENTS) {
  for (const lang of ["en", "ar"] as const) {
    const raw = DEMO_STORYBOARDS[sample.id][lang];
    const sb: Storyboard = completeStoryboard(raw, lang);
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
  ...completeStoryboard(DEMO_STORYBOARDS["dropped-object"].en, "en"),
  scenes: [
    {
      id: "x",
      visual_type: "what_happened",
      narration: "Ahmed dropped a spanner on Rig AD-27 under permit PTW-55721, badge 448812.",
      caption: "Gulf Drilling crew",
      icons: [],
      images: [],
      duration_seconds: 10,
    },
  ],
};
const leakyFlags = checkStoryboard(leaky, 60, SAMPLE_INCIDENTS[0].text).identifiers.map((f) => f.text);
for (const needle of ["Ahmed", "AD-27", "PTW-55721", "448812", "Gulf"]) {
  expect(leakyFlags.includes(needle), `detector flags leftover "${needle}"`);
}

const leakyAr: Storyboard = {
  ...completeStoryboard(DEMO_STORYBOARDS["line-of-fire"].ar, "ar"),
  scenes: [
    {
      id: "y",
      visual_type: "what_happened",
      narration: "أُصيب خالد من شركة النجم في حقل الريان.",
      caption: "",
      icons: [],
      images: [],
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
  const sb: Storyboard = completeStoryboard(raw, "en");
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

// APP RULES: company names, IDs and pictures
{
  process.env.LFI_SECRET = "self-check-secret";
  const hashes = hashTerms([
    "Falcon Logistics LLC", "Desert Star Energy", "Ifadah# 45821", "Rami Haddad", "WP-2209", "شركة النجم للمقاولات",
  ]);
  const find = (text: string) => checkTexts([{ where: "t", text }], hashes);
  const blocks = (text: string) => find(text).filter((i) => !i.overridable).map((i) => i.text);
  const any = (text: string) => find(text).map((i) => i.text);
  expect(blocks("The truck from Falcon Logistics reversed.").includes("Falcon Logistics"), "known company name blocks (cannot be dismissed)");
  expect(any("A Falcon truck reversed.").includes("Falcon") && blocks("A Falcon truck reversed.").length === 0, "part of a company name is flagged (can be dismissed)");
  expect(blocks("Desert Star crews were briefed.").includes("Desert Star"), "two words of a company name block");
  expect(blocks("See report 45821.").includes("45821"), "known incident number blocks");
  expect(any("Ifadah reference was raised").some((t) => /ifadah/i.test(t)), "the word Ifadah is flagged");
  expect(any("Permit WP-2209 was missing.").includes("WP-2209"), "permit number is flagged");
  expect(any("Ref No. LFI-2026-0193 applies").length > 0, "reference number pattern is flagged");
  expect(any("Work was done by Gulfstar Services LLC.").some((t) => t.includes("Gulfstar")), "unknown company with LLC is flagged");
  expect(blocks("The driver, Rami Haddad, was not hurt.").includes("Rami Haddad"), "person's name from the file blocks");
  const hashes2 = hashTerms(["LFI-2026-0193", ...scanSourceForSensitiveTerms("Permit WP-2209 listed offloading only.")]);
  const any2 = (text: string) => checkTexts([{ where: "t", text }], hashes2).map((i) => i.text);
  expect(any2("The incident happened on 18-Aug-2026.").length === 0, "a year inside a report number is not treated as an ID");
  expect(any2("The permit listed offloading only.").length === 0, "label words next to an ID are not treated as names");
  expect(any2("Permit WP-2209 is missing").includes("WP-2209"), "the ID itself is still caught");
  const clean = [
    "The contractor's 10-tonne truck reversed at 07:45 on 18-Aug-2026.",
    "Potential severity: Major (Level 4). Risk: Driving / Vehicle Safety.",
    "Wear PPE, test for H2S and apply LOTO before work.",
    "Vehicle A struck Vehicle B. The Company rules require a banksman.",
    "فحص الضغط عند 150 بار قبل التشغيل.",
  ];
  for (const t of clean) expect(any(t).length === 0, `no false alarm: "${t.slice(0, 40)}…"`);
  expect(any("انفلت خرطوم من النجم أثناء العمل").includes("النجم"), "Arabic company word from the file is flagged");
  expect(any("عمل لدى شركة الصقر الحديثة").length > 0, "Arabic company pattern is flagged");

  const base = completeStoryboard(DEMO_STORYBOARDS["dropped-object"].en, "en");
  const withPics: Storyboard = {
    ...base,
    media: [
      { file: "pic-1.jpg", description: "truck", flagged: true, flag_reasons: ["number plate"], checked: false },
      { file: "pic-2.jpg", description: "diagram", flagged: false, flag_reasons: [], checked: true },
    ],
    scenes: base.scenes.map((sc, i) => (i === 1 ? { ...sc, images: ["pic-1.jpg", "pic-2.jpg"] } : sc)),
  };
  const imgIssues = checkStoryboardCompliance(withPics, []).filter((i) => i.kind === "image");
  expect(imgIssues.length === 1 && imgIssues[0].text === "truck", "unchecked flagged picture blocks the render");
  const okPics = { ...withPics, media: withPics.media.map((m) => ({ ...m, checked: true })) };
  expect(checkStoryboardCompliance(okPics, []).filter((i) => i.kind === "image").length === 0, "checked picture passes");

  // People's names and exact locations (patterns).
  const kinds = (text: string) => checkTexts([{ where: "t", text }], []).map((i) => `${i.kind}:${i.text}`);
  expect(kinds("Mr. John Smith gave the briefing.").includes("person:Mr. John Smith"), "a titled person's name is flagged");
  expect(kinds("The crane was at Rig 23.").includes("location:Rig 23"), "a rig number is flagged as a location");
  expect(kinds("Position 24.7136, 46.6753 was logged.").some((k) => k.startsWith("location:")), "GPS coordinates are flagged");
  expect(kinds("The crew at Burgan Field stopped work.").includes("location:Burgan Field"), "a named field is flagged");
  expect(kinds("قال المهندس خالد العتيبي إن العمل توقف").some((k) => k.startsWith("person:")), "an Arabic titled name is flagged");
  expect(kinds("وقع الحادث في الحفار رقم 23").some((k) => k.startsWith("location:")), "an Arabic rig number is flagged");
  for (const t of [
    "A drilling rig crew worked in the laydown yard.",
    "The field team held a toolbox talk on 12-03-2026.",
    "The engineer stopped the job. The supervisor agreed.",
    "قال المهندس المسؤول إن العمل توقف",
  ]) {
    expect(kinds(t).length === 0, `no false alarm: "${t.slice(0, 40)}…"`);
  }
}

{
  // The local clean-up, before anything is sent to Claude.
  const names = [
    { id: "1", term: "Falcon Logistics", kind: "company" as const, replacement: "the contractor" },
    { id: "2", term: "النجم الذهبي", kind: "company" as const, replacement: "المقاول" },
    { id: "3", term: "Rami Haddad", kind: "person" as const, replacement: "the driver" },
  ];
  const src =
    "Ifadah# 45821. On 12-03-2026 a Falcon-Logistics truck driven by Rami Haddad at Rig 23 hit Vehicle B. " +
    "Permit WP-2209 was valid. Call +966 55 123 4567. The 12500 kg load fell 3 m. وقع في موقع شركة النجم الذهبي.";
  const r = redactLocally(src, names);
  for (const gone of ["45821", "Falcon", "Rami", "Rig 23", "WP-2209", "123 4567", "النجم"]) {
    expect(!r.text.includes(gone), `clean-up removes "${gone}"`);
  }
  for (const kept of ["12-03-2026", "12500 kg", "3 m", "Vehicle B", "the contractor", "the driver", "المقاول"]) {
    expect(r.text.includes(kept), `clean-up keeps "${kept}"`);
  }
  expect(r.removed.includes("Rami Haddad") && r.notes.length > 0, "clean-up reports what it removed (for hashing)");
  expect(redactLocally("A dropped object fell from height.", []).text === "A dropped object fell from height.", "clean text is unchanged");
}

console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exit(failures ? 1 : 0);
