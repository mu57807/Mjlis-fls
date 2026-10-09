import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { brand } from "@brand";
import type { IconName, Language, VisualType } from "@/lib/catalog";
import { ICON_COMPONENTS } from "@/components/SafetyIcon";
import type { SubtitleCue } from "@/lib/video";
import { useLayout } from "./layout";
import { C, HAZARD_STRIPES, HEADER_LABEL, SCENE_LABEL, fontFamily, tracking } from "./theme";
import { useEnter } from "./anim";

export function Logo({ size, style }: { size: number; style?: CSSProperties }) {
  return (
    <Img
      src={staticFile(brand.logo.replace(/^\//, ""))}
      style={{ width: size, height: size, objectFit: "contain", ...style }}
    />
  );
}

export function SafetyGlyph({
  name,
  size,
  color,
  strokeWidth = 2,
}: {
  name: IconName;
  size: number;
  color: string;
  strokeWidth?: number;
}) {
  const Icon = ICON_COMPONENTS[name];
  return Icon ? <Icon size={size} color={color} strokeWidth={strokeWidth} /> : null;
}

/** Round icon badge that pops in. */
export function IconBadge({
  name,
  size,
  delay,
  bg = C.primary,
  fg = "#fff",
  style,
}: {
  name: IconName;
  size: number;
  delay: number;
  bg?: string;
  fg?: string;
  style?: CSSProperties;
}) {
  const s = useEnter(delay, 11);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${s})`,
        boxShadow: "0 14px 34px rgba(11,37,69,0.18)",
        flexShrink: 0,
        ...style,
      }}
    >
      <SafetyGlyph name={name} size={size * 0.52} color={fg} />
    </div>
  );
}

/** Standard frame for content scenes: header band, hazard stripe, label, progress bar. */
export function SceneShell({
  lang,
  type,
  progress,
  children,
}: {
  lang: Language;
  type: VisualType;
  /** 0..1 progress through the whole video. */
  progress: number;
  children: ReactNode;
}) {
  const L = useLayout();
  const label = SCENE_LABEL[type][lang];
  const labelIn = useEnter(2, 16);
  return (
    <AbsoluteFill style={{ background: C.background }}>
      <div
        style={{
          height: L.headerH,
          background: C.primary,
          display: "flex",
          alignItems: "center",
          gap: 22,
          padding: `0 ${L.padX}px`,
          color: "#fff",
        }}
      >
        <Logo size={L.headerH * 0.56} />
        <div
          style={{
            fontSize: L.vertical ? 26 : 24,
            fontWeight: 700,
            letterSpacing: tracking(lang, 0.14),
            opacity: 0.92,
          }}
        >
          {HEADER_LABEL[lang]}
        </div>
        {label && (
          <div
            style={{
              marginInlineStart: "auto",
              background: C.accent,
              color: "#fff",
              fontWeight: 700,
              fontSize: L.vertical ? 30 : 28,
              letterSpacing: tracking(lang, 0.08),
              padding: "10px 24px",
              borderRadius: 999,
              transform: `translateY(${(1 - labelIn) * -30}px)`,
              opacity: labelIn,
            }}
          >
            {label}
          </div>
        )}
      </div>
      <div style={{ height: 14, background: HAZARD_STRIPES }} />
      <div style={{ position: "relative", flex: 1 }}>{children}</div>
      <ProgressBar progress={progress} />
    </AbsoluteFill>
  );
}

export function ProgressBar({ progress }: { progress: number }) {
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 10, background: "rgba(11,37,69,0.12)" }}>
      <div style={{ height: "100%", width: `${progress * 100}%`, background: C.accent }} />
    </div>
  );
}

/**
 * Burned-in subtitles. Words already spoken are bright; the rest of the line
 * is dimmed, which makes the sync with the voiceover easy to follow.
 */
export function Subtitles({
  cues,
  wordTimes,
  lang,
}: {
  cues: SubtitleCue[];
  /** Start time (s, scene-relative) of each word, in order, for the karaoke effect. */
  wordTimes: number[];
  lang: Language;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const L = useLayout();
  const t = frame / fps;
  const cueIndex = cues.findIndex((c) => t >= c.start && t < c.end);
  if (cueIndex === -1) return null;
  const cue = cues[cueIndex];
  const wordsBefore = cues.slice(0, cueIndex).reduce((n, c) => n + c.text.split(" ").length, 0);
  const words = cue.text.split(" ");
  const appear = interpolate(t, [cue.start, cue.start + 0.12], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: L.vertical ? 150 : 52,
        display: "flex",
        justifyContent: "center",
        padding: `0 ${L.padX}px`,
        opacity: appear,
      }}
    >
      <div
        dir={lang === "ar" ? "rtl" : "ltr"}
        style={{
          background: "rgba(11,37,69,0.9)",
          color: "#fff",
          fontFamily: fontFamily(lang),
          fontSize: L.subtitleSize,
          fontWeight: 700,
          lineHeight: lang === "ar" ? 1.6 : 1.3,
          padding: L.vertical ? "18px 34px" : "14px 34px",
          borderRadius: 18,
          maxWidth: L.vertical ? "100%" : "86%",
          textAlign: "center",
        }}
      >
        {words.map((w, i) => {
          const start = wordTimes[wordsBefore + i] ?? cue.start;
          return (
            <span key={i} style={{ opacity: t >= start ? 1 : 0.55 }}>
              {w}
              {i < words.length - 1 ? " " : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}
