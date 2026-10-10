import type { CSSProperties } from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Check, MessageCircleQuestion, TriangleAlert } from "lucide-react";
import { brand } from "@brand";
import type { IconName, Language } from "@/lib/catalog";
import type { Scene, Storyboard } from "@/lib/schema";
import { IconBadge, Logo, SafetyGlyph, SceneShell } from "../components";
import { useLayout } from "../layout";
import { staggeredDelays, useEnter } from "../anim";
import { C, HAZARD_STRIPES, HEADER_LABEL, fontFamily, tracking } from "../theme";

export interface SceneProps {
  scene: Scene;
  storyboard: Storyboard;
  lang: Language;
  durationInFrames: number;
  /** 0..1 progress through the whole video at this scene's current frame. */
  progress: number;
  /** List items for root-cause / checklist / sustain / question scenes. */
  items: string[];
  /** URL of a picture file. */
  imageSrc: (file: string) => string;
}

/** Text slides in from the reading-start side (left for English, right for Arabic). */
function useSlideIn(lang: Language, delay: number) {
  const p = useEnter(delay, 16);
  const dx = (lang === "ar" ? 1 : -1) * 60 * (1 - p);
  return { opacity: p, transform: `translateX(${dx}px)` } as CSSProperties;
}

function contentBox(L: ReturnType<typeof useLayout>): CSSProperties {
  return {
    position: "absolute",
    inset: 0,
    padding: `${L.vertical ? 70 : 56}px ${L.padX}px ${L.subtitleZone}px`,
    display: "flex",
  };
}

// ---------------------------------------------------------------------------
// Title card
// ---------------------------------------------------------------------------
export function TitleCard({ scene, storyboard, lang }: SceneProps) {
  const L = useLayout();
  const logoIn = useEnter(0, 12);
  const title = useSlideIn(lang, 8);
  const labelIn = useEnter(4, 18);
  const text = scene.caption || storyboard.title;
  const f = storyboard.facts;
  const facts = f
    ? (
        [
          ["date", [f.date, f.time].filter(Boolean).join(" · ")],
          ["location", f.location],
          ["risk_category", f.risk_category],
          ["potential_severity", f.potential_severity],
        ] as const
      ).filter(([, v]) => v.trim())
    : [];
  return (
    <AbsoluteFill style={{ background: `linear-gradient(160deg, ${C.primary} 0%, ${C.primarySoft} 100%)`, color: "#fff" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 22, background: HAZARD_STRIPES }} />
      <div
        style={{
          ...contentBox(L),
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: L.vertical ? 52 : 36,
        }}
      >
        <Logo size={L.vertical ? 200 : 150} style={{ transform: `scale(${logoIn})` }} />
        <div
          style={{
            color: C.accent,
            fontWeight: 700,
            fontSize: L.vertical ? 38 : 32,
            letterSpacing: tracking(lang, 0.18),
            opacity: labelIn,
          }}
        >
          {HEADER_LABEL[lang]}
        </div>
        <div style={{ fontSize: L.titleSize, fontWeight: 700, lineHeight: 1.2, maxWidth: L.vertical ? "100%" : "82%", ...title }}>
          {text}
        </div>
        {facts.length > 0 ? (
          <FactChips facts={facts} lang={lang} />
        ) : (
          <div style={{ display: "flex", gap: 28, marginTop: 8 }}>
            {scene.icons.map((icon, i) => (
              <IconBadge key={icon} name={icon} size={L.vertical ? 150 : 120} delay={18 + i * 6} bg={C.accent} />
            ))}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

const FACT_LABELS: Record<string, Record<Language, string>> = {
  date: { en: "Date", ar: "التاريخ" },
  location: { en: "Location", ar: "الموقع" },
  risk_category: { en: "Risk", ar: "فئة الخطر" },
  potential_severity: { en: "Potential severity", ar: "الخطورة المحتملة" },
};

function FactChips({ facts, lang }: { facts: readonly (readonly [string, string])[]; lang: Language }) {
  const L = useLayout();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 18, maxWidth: L.vertical ? "100%" : "90%" }}>
      {facts.map(([k, v], i) => (
        <FactChip key={k} label={FACT_LABELS[k][lang]} value={v} delay={18 + i * 5} lang={lang} />
      ))}
    </div>
  );
}

function FactChip({ label, value, delay, lang }: { label: string; value: string; delay: number; lang: Language }) {
  const L = useLayout();
  const p = useEnter(delay, 16);
  const highlight = label === FACT_LABELS.potential_severity[lang];
  return (
    <div
      style={{
        background: highlight ? C.accent : "rgba(255,255,255,0.12)",
        border: "2px solid rgba(255,255,255,0.25)",
        borderRadius: 16,
        padding: L.vertical ? "14px 24px" : "10px 22px",
        textAlign: "start",
        opacity: p,
        transform: `translateY(${(1 - p) * 20}px)`,
      }}
    >
      <div style={{ fontSize: L.vertical ? 24 : 20, fontWeight: 700, opacity: 0.8, letterSpacing: tracking(lang, 0.06) }}>
        {label}
      </div>
      <div style={{ fontSize: L.vertical ? 34 : 30, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Incident pictures: one after another, slowly zooming (Ken Burns)
// ---------------------------------------------------------------------------
function PhotoShow({ files, imageSrc, durationInFrames }: { files: string[]; imageSrc: (f: string) => string; durationInFrames: number }) {
  const frame = useCurrentFrame();
  const per = Math.max(1, Math.floor(durationInFrames / files.length));
  const FADE = 10;
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: 24,
        overflow: "hidden",
        background: C.primary,
        boxShadow: "0 24px 60px rgba(11,37,69,0.3)",
        border: `8px solid #fff`,
      }}
    >
      {files.map((file, i) => {
        const start = i * per;
        const local = frame - start;
        const visible = i === files.length - 1 ? local >= -FADE : local >= -FADE && local < per + FADE;
        if (!visible) return null;
        const opacity = interpolate(local, [-FADE, 0, per, per + FADE], [0, 1, 1, i === files.length - 1 ? 1 : 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const zoom = interpolate(local, [0, per], [1, 1.08], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <Img
            key={file}
            src={imageSrc(file)}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              opacity,
              transform: `scale(${zoom})`,
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// What happened: caption + animated "hero" icon + supporting icons
// ---------------------------------------------------------------------------
function HeroIcon({ name, size }: { name: IconName; size: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = useEnter(10, 10);
  let transform = `scale(${enter})`;
  if (name === "dropped_object") {
    // Falls from above and bounces on landing.
    const y = interpolate(enter, [0, 1], [-size * 1.4, 0]);
    transform = `translateY(${y}px)`;
  } else if (name === "line_of_fire" || name === "pressure") {
    transform += ` rotate(${Math.sin(frame / fps * 3) * 6}deg)`;
  } else if (name === "fire" || name === "explosion" || name === "warning") {
    transform += ` scale(${1 + Math.sin((frame / fps) * 8) * 0.03})`;
  } else {
    transform += ` translateY(${Math.sin((frame / fps) * 2) * 8}px)`;
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: C.primary,
        border: `14px solid ${C.accent}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 30px 60px rgba(11,37,69,0.25)",
        transform,
        opacity: name === "dropped_object" ? Math.min(1, enter * 3) : 1,
      }}
    >
      <SafetyGlyph name={name} size={size * 0.5} color="#fff" />
    </div>
  );
}

export function WhatHappened({ scene, lang, progress, imageSrc, durationInFrames }: SceneProps) {
  const L = useLayout();
  const text = useSlideIn(lang, 4);
  const [hero, ...others] = scene.icons;
  const images = scene.images ?? [];
  if (images.length > 0) {
    return (
      <SceneShell lang={lang} type={scene.visual_type} progress={progress}>
        <div
          style={{
            ...contentBox(L),
            flexDirection: L.vertical ? "column" : "row",
            alignItems: "stretch",
            gap: L.vertical ? 50 : 60,
          }}
        >
          <div style={{ flex: L.vertical ? "0 0 52%" : "1 1 60%", minHeight: 0 }}>
            <PhotoShow files={images} imageSrc={imageSrc} durationInFrames={durationInFrames} />
          </div>
          <div style={{ flex: "1 1 40%", display: "flex", flexDirection: "column", justifyContent: "center", ...text }}>
            <div style={{ width: 120, height: 12, background: C.accent, borderRadius: 6, marginBottom: 30 }} />
            <div style={{ fontSize: L.captionSize - 4, fontWeight: 700, color: C.primary, lineHeight: 1.25 }}>
              {scene.caption}
            </div>
            {scene.icons.length > 0 && (
              <div style={{ display: "flex", gap: 22, marginTop: 36 }}>
                {scene.icons.slice(0, 3).map((icon, i) => (
                  <IconBadge key={icon} name={icon} size={L.vertical ? 120 : 104} delay={20 + i * 8} />
                ))}
              </div>
            )}
          </div>
        </div>
      </SceneShell>
    );
  }
  return (
    <SceneShell lang={lang} type={scene.visual_type} progress={progress}>
      <div
        style={{
          ...contentBox(L),
          flexDirection: L.vertical ? "column" : "row",
          alignItems: "center",
          gap: L.vertical ? 70 : 80,
        }}
      >
        <div style={{ flex: L.vertical ? "0 0 auto" : "1 1 55%", ...text }}>
          <div style={{ width: 120, height: 12, background: C.accent, borderRadius: 6, marginBottom: 30 }} />
          <div style={{ fontSize: L.captionSize, fontWeight: 700, color: C.primary, lineHeight: 1.2 }}>
            {scene.caption}
          </div>
        </div>
        <div
          style={{
            flex: L.vertical ? "1 1 auto" : "1 1 45%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 40,
          }}
        >
          {hero && <HeroIcon name={hero} size={L.vertical ? 380 : 320} />}
          {others.length > 0 && (
            <div style={{ display: "flex", gap: 30 }}>
              {others.map((icon, i) => (
                <IconBadge key={icon} name={icon} size={L.vertical ? 150 : 130} delay={26 + i * 8} />
              ))}
            </div>
          )}
        </div>
      </div>
    </SceneShell>
  );
}

// ---------------------------------------------------------------------------
// Root cause: list of causes revealed one by one, with warning markers
// ---------------------------------------------------------------------------
function ListRow({
  delay,
  lang,
  marker,
  text,
  fontSize,
}: {
  delay: number;
  lang: Language;
  marker: React.ReactNode;
  text: string;
  fontSize: number;
}) {
  const style = useSlideIn(lang, delay);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 28, ...style }}>
      {marker}
      <div style={{ fontSize, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{text}</div>
    </div>
  );
}

export function RootCause({ scene, lang, durationInFrames, items, progress }: SceneProps) {
  const L = useLayout();
  const header = useSlideIn(lang, 2);
  const delays = staggeredDelays(items.length, durationInFrames, 16);
  const fontSize = items.length > 3 ? L.bodySize - 4 : L.bodySize;
  return (
    <SceneShell lang={lang} type={scene.visual_type} progress={progress}>
      <div style={{ ...contentBox(L), flexDirection: L.vertical ? "column" : "row", gap: 60 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: L.vertical ? 44 : 34, justifyContent: "center" }}>
          <div style={{ fontSize: L.captionSize - 6, fontWeight: 700, color: C.primary, ...header }}>{scene.caption}</div>
          {items.map((item, i) => (
            <ListRow
              key={i}
              delay={delays[i]}
              lang={lang}
              text={item}
              fontSize={fontSize}
              marker={
                <div
                  style={{
                    width: 76,
                    height: 76,
                    flexShrink: 0,
                    borderRadius: 18,
                    background: C.accentSoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <TriangleAlert size={44} color={C.accent} strokeWidth={2.4} />
                </div>
              }
            />
          ))}
        </div>
        {scene.icons.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: L.vertical ? "row" : "column",
              gap: 26,
              justifyContent: "center",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {scene.icons.map((icon, i) => (
              <IconBadge key={icon} name={icon} size={L.vertical ? 140 : 120} delay={10 + i * 6} />
            ))}
          </div>
        )}
      </div>
    </SceneShell>
  );
}

// ---------------------------------------------------------------------------
// Key lesson: big highlighted statement
// ---------------------------------------------------------------------------
export function KeyLesson({ scene, storyboard, lang, progress }: SceneProps) {
  const L = useLayout();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bulbIn = useEnter(4, 9);
  const textIn = useSlideIn(lang, 10);
  const highlight = interpolate(frame, [18, 38], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = 1 + Math.sin((frame / fps) * 3) * 0.04;
  const detail = storyboard.key_lesson.trim();
  const showDetail = detail && detail !== scene.caption.trim();
  return (
    <SceneShell lang={lang} type={scene.visual_type} progress={progress}>
      <div
        style={{
          ...contentBox(L),
          flexDirection: L.vertical ? "column" : "row",
          alignItems: "center",
          justifyContent: "center",
          gap: L.vertical ? 70 : 90,
          background: `radial-gradient(circle at ${lang === "ar" ? "80%" : "20%"} 50%, ${C.accentSoft} 0%, transparent 60%)`,
        }}
      >
        <div
          style={{
            width: L.vertical ? 300 : 280,
            height: L.vertical ? 300 : 280,
            borderRadius: "50%",
            background: C.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${bulbIn * pulse})`,
            boxShadow: `0 0 0 ${24 * bulbIn}px ${C.accentSoft}`,
            flexShrink: 0,
          }}
        >
          <SafetyGlyph name={scene.icons[0] ?? "lesson"} size={150} color="#fff" />
        </div>
        <div style={{ flex: 1, textAlign: L.vertical ? "center" : "start", ...textIn }}>
          <div
            style={{
              display: "inline",
              fontSize: L.captionSize + 10,
              fontWeight: 700,
              color: C.primary,
              lineHeight: 1.35,
              backgroundImage: `linear-gradient(${C.accent}55, ${C.accent}55)`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${highlight}% 40%`,
              backgroundPosition: lang === "ar" ? "100% 85%" : "0 85%",
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
            }}
          >
            {scene.caption}
          </div>
          {showDetail && (
            <div style={{ marginTop: 34, fontSize: L.bodySize, color: C.mutedText, lineHeight: 1.4 }}>{detail}</div>
          )}
        </div>
      </div>
    </SceneShell>
  );
}

// ---------------------------------------------------------------------------
// Checklist: actions ticked off one by one
// ---------------------------------------------------------------------------
function CheckRow({ delay, lang, text, fontSize }: { delay: number; lang: Language; text: string; fontSize: number }) {
  const tick = useEnter(delay + 10, 10);
  const box = (
    <div
      style={{
        width: 72,
        height: 72,
        flexShrink: 0,
        borderRadius: 16,
        border: `5px solid ${C.success}`,
        background: tick > 0.5 ? C.success : "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Check size={50} color="#fff" strokeWidth={3.4} style={{ transform: `scale(${tick})` }} />
    </div>
  );
  return <ListRow delay={delay} lang={lang} text={text} fontSize={fontSize} marker={box} />;
}

export function Checklist({ scene, lang, durationInFrames, items, progress }: SceneProps) {
  const L = useLayout();
  const header = useSlideIn(lang, 2);
  const delays = staggeredDelays(items.length, durationInFrames, 14);
  const fontSize = items.length > 4 ? L.bodySize - 4 : L.bodySize;
  return (
    <SceneShell lang={lang} type={scene.visual_type} progress={progress}>
      <div style={{ ...contentBox(L), flexDirection: "column", justifyContent: "center", gap: L.vertical ? 46 : 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, ...header }}>
          {scene.icons[0] && <IconBadge name={scene.icons[0]} size={96} delay={0} bg={C.success} />}
          <div style={{ fontSize: L.captionSize - 6, fontWeight: 700, color: C.primary }}>{scene.caption}</div>
        </div>
        {items.map((item, i) => (
          <CheckRow key={i} delay={delays[i]} lang={lang} text={item} fontSize={fontSize} />
        ))}
      </div>
    </SceneShell>
  );
}

// ---------------------------------------------------------------------------
// Closing card
// ---------------------------------------------------------------------------
export function ClosingCard({ scene, lang }: SceneProps) {
  const L = useLayout();
  const textIn = useEnter(4, 14);
  const logoIn = useEnter(14, 14);
  return (
    <AbsoluteFill style={{ background: C.primary, color: "#fff" }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 22, background: HAZARD_STRIPES }} />
      <div
        style={{
          ...contentBox(L),
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 40,
        }}
      >
        {scene.icons[0] && <IconBadge name={scene.icons[0]} size={L.vertical ? 190 : 160} delay={0} bg={C.accent} />}
        <div
          style={{
            fontSize: L.titleSize,
            fontWeight: 700,
            lineHeight: 1.2,
            transform: `scale(${0.9 + 0.1 * textIn})`,
            opacity: textIn,
          }}
        >
          {scene.caption}
        </div>
        <div style={{ fontSize: L.bodySize, color: C.accent, fontWeight: 700, opacity: logoIn }}>
          {brand.closingMessage[lang]}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, opacity: logoIn, marginTop: 10 }}>
          <Logo size={80} />
          <div style={{ fontSize: 34, fontWeight: 700, fontFamily: fontFamily("en") }}>{brand.companyName}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------------------
// Reflective questions for the team, revealed one by one
// ---------------------------------------------------------------------------
function QuestionRow({ delay, lang, text, n, fontSize }: { delay: number; lang: Language; text: string; n: number; fontSize: number }) {
  const p = useEnter(delay, 14);
  const dx = (lang === "ar" ? 1 : -1) * 60 * (1 - p);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 26,
        background: "#fff",
        borderRadius: 22,
        padding: "20px 28px",
        boxShadow: "0 10px 30px rgba(11,37,69,0.10)",
        borderInlineStart: `10px solid ${C.accent}`,
        opacity: p,
        transform: `translateX(${dx}px)`,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          flexShrink: 0,
          borderRadius: "50%",
          background: C.primary,
          color: "#fff",
          fontSize: 34,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {n}
      </div>
      <div style={{ fontSize, fontWeight: 600, color: C.text, lineHeight: 1.3 }}>{text}</div>
    </div>
  );
}

export function ReflectiveQuestions({ scene, lang, durationInFrames, items, progress }: SceneProps) {
  const L = useLayout();
  const header = useSlideIn(lang, 2);
  const delays = staggeredDelays(items.length, durationInFrames, 16);
  const fontSize = items.length > 3 ? L.bodySize - 4 : L.bodySize;
  return (
    <SceneShell lang={lang} type={scene.visual_type} progress={progress}>
      <div style={{ ...contentBox(L), flexDirection: "column", justifyContent: "center", gap: L.vertical ? 34 : 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, ...header }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: C.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <MessageCircleQuestion size={56} color="#fff" strokeWidth={2.2} />
          </div>
          <div style={{ fontSize: L.captionSize - 6, fontWeight: 700, color: C.primary }}>{scene.caption}</div>
        </div>
        {items.map((q, i) => (
          <QuestionRow key={i} n={i + 1} delay={delays[i]} lang={lang} text={q} fontSize={fontSize} />
        ))}
      </div>
    </SceneShell>
  );
}
