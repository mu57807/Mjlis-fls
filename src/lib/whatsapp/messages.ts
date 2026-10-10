// Everything the WhatsApp bot says, in English and Arabic.
import type { Language } from "../catalog";
import type { Project } from "../schema";
import type { IdentifierFlag } from "../anonymise";
import { VISUAL_TYPE_LABELS } from "../catalog";

type Strings = Record<Language, string>;

export const T = {
  help: {
    en:
      "👋 *LFI Video Studio*\n\nSend me a Learning From Incident description (Arabic or English) as a text message and I will turn it into a short safety video.\n\n" +
      "1️⃣ I reply with the storyboard\n2️⃣ You check it and tap *Approve*\n3️⃣ I send you the video\n\n" +
      "Options – add to your message:\n• #ar or #en – video language (default: same as your message)\n• #both – one Arabic and one English video\n• #wide – 16:9 for screens (default: 9:16 for phones)\n• #90 – 90 seconds (default: 60)\n\n" +
      "Other commands: *status*, *help*\n\nDon't worry about names or ID numbers – they are removed automatically.",
    ar:
      "👋 *استوديو فيديو التعلّم من الحوادث*\n\nأرسل لي وصف الحادثة (بالعربية أو الإنجليزية) كرسالة نصية، وسأحوّله إلى فيديو توعوي قصير.\n\n" +
      "1️⃣ أرسل لك القصة المصوّرة\n2️⃣ تراجعها وتضغط *موافقة*\n3️⃣ أرسل لك الفيديو\n\n" +
      "خيارات – أضفها إلى رسالتك:\n• ‎#ar أو ‎#en – لغة الفيديو (الافتراضي: لغة رسالتك)\n• ‎#both – فيديو عربي وآخر إنجليزي\n• ‎#wide – 16:9 للشاشات (الافتراضي: 9:16 للجوال)\n• ‎#90 – 90 ثانية (الافتراضي: 60)\n\n" +
      "أوامر أخرى: *الحالة*، *مساعدة*\n\nلا تقلق بشأن الأسماء أو الأرقام التعريفية – تُحذف تلقائياً.",
  } satisfies Strings,
  notAllowed: {
    en: "Sorry, this number is not authorised to use LFI Video Studio. Please contact the HSE team.",
    ar: "عذراً، هذا الرقم غير مصرّح له باستخدام الخدمة. يرجى التواصل مع فريق الصحة والسلامة.",
  } satisfies Strings,
  tooShort: {
    en: "Please send the full incident description (a few sentences: what happened, why, and any injuries). Send *help* for instructions.",
    ar: "يرجى إرسال وصف كامل للحادثة (بضع جمل: ماذا حدث، ولماذا، وأي إصابات). أرسل *مساعدة* للتعليمات.",
  } satisfies Strings,
  textOnly: {
    en: "Please send the incident as a text message. Voice notes, photos and files are not supported yet.",
    ar: "يرجى إرسال الحادثة كرسالة نصية. الرسائل الصوتية والصور والملفات غير مدعومة حالياً.",
  } satisfies Strings,
  working: {
    en: "⏳ Got it. Writing the storyboard and removing names – this takes about a minute…",
    ar: "⏳ تم الاستلام. جارٍ كتابة القصة المصوّرة وحذف الأسماء – يستغرق ذلك نحو دقيقة…",
  } satisfies Strings,
  failed: {
    en: "❌ Sorry, I could not create the storyboard: ",
    ar: "❌ عذراً، تعذّر إنشاء القصة المصوّرة: ",
  } satisfies Strings,
  approveQuestion: {
    en: "Is this storyboard correct and free of names and ID numbers? Approve to make the video.",
    ar: "هل القصة المصوّرة صحيحة وخالية من الأسماء والأرقام التعريفية؟ وافق لإنشاء الفيديو.",
  } satisfies Strings,
  approveButton: { en: "✅ Approve", ar: "✅ موافقة" } satisfies Strings,
  cancelButton: { en: "❌ Cancel", ar: "❌ إلغاء" } satisfies Strings,
  rendering: {
    en: "🎬 Approved. Making your video now – usually 2–4 minutes. I'll send it here.",
    ar: "🎬 تمت الموافقة. جارٍ إنشاء الفيديو – عادةً من 2 إلى 4 دقائق. سأرسله هنا.",
  } satisfies Strings,
  cancelled: {
    en: "Cancelled – the storyboard was discarded and no video was made. Send a new description to start again.",
    ar: "تم الإلغاء – حُذفت القصة المصوّرة ولم يُنشأ أي فيديو. أرسل وصفاً جديداً للبدء من جديد.",
  } satisfies Strings,
  nothingToApprove: {
    en: "There is no storyboard waiting for approval. Send an incident description to start.",
    ar: "لا توجد قصة مصوّرة بانتظار الموافقة. أرسل وصف حادثة للبدء.",
  } satisfies Strings,
  alreadyRendering: {
    en: "⏳ This video is already being made. I'll send it when it's ready.",
    ar: "⏳ الفيديو قيد الإنشاء بالفعل. سأرسله عند جاهزيته.",
  } satisfies Strings,
  alreadyDone: {
    en: "✅ This video was already made. Send *status* to get it again.",
    ar: "✅ تم إنشاء هذا الفيديو مسبقاً. أرسل *الحالة* للحصول عليه مجدداً.",
  } satisfies Strings,
  blocked: {
    en: "⛔ The video was not made: the final check found a company name, an ID number or an unchecked picture. Please ask the HSE team to fix it on the review screen:",
    ar: "⛔ لم يُنشأ الفيديو: وجد الفحص النهائي اسم شركة أو رقماً تعريفياً أو صورة لم تُراجع. يرجى من فريق السلامة تصحيحها في شاشة المراجعة:",
  } satisfies Strings,
  renderFailed: {
    en: "❌ Sorry, the video could not be made. The HSE team can retry it from the web app.",
    ar: "❌ عذراً، تعذّر إنشاء الفيديو. يمكن لفريق السلامة إعادة المحاولة من الموقع.",
  } satisfies Strings,
  noProjects: {
    en: "You have no LFI videos yet. Send an incident description to start.",
    ar: "لا توجد لديك فيديوهات بعد. أرسل وصف حادثة للبدء.",
  } satisfies Strings,
};

const STATUS: Record<Project["status"], Strings> = {
  draft: { en: "waiting for approval", ar: "بانتظار الموافقة" },
  approved: { en: "approved", ar: "تمت الموافقة" },
  rendering: { en: "being made", ar: "قيد الإنشاء" },
  done: { en: "ready", ar: "جاهز" },
  failed: { en: "failed", ar: "فشل" },
};

const VISUAL_AR: Record<string, string> = {
  title_card: "العنوان",
  what_happened: "ماذا حدث",
  root_cause: "لماذا حدث",
  key_lesson: "الدرس المستفاد",
  checklist: "افعل هذا بدلاً من ذلك",
  closing_card: "الختام",
};

export function storyboardSummary(
  p: Project,
  identifiers: IdentifierFlag[],
  reviewLink: string | null,
  label: string,
): string {
  const ar = p.language === "ar";
  const sb = p.storyboard;
  const total = sb.scenes.reduce((n, s) => n + s.duration_seconds, 0);
  const lines: string[] = [];
  lines.push(`📋 ${ar ? "القصة المصوّرة" : "Storyboard"} – ${label}`, `*${sb.title}*`, "");
  lines.push(`🎬 ${ar ? "المشاهد" : "Scenes"} (${Math.round(total)} ${ar ? "ث،" : "s,"} ${p.aspectRatio}):`);
  sb.scenes.forEach((s, i) => {
    const type = ar ? VISUAL_AR[s.visual_type] : VISUAL_TYPE_LABELS[s.visual_type].en;
    lines.push(`*${i + 1}. ${type}* – ${s.caption}`, `🗣️ ${s.narration}`);
  });
  if (sb.missing_information.length) {
    lines.push("", `❓ ${ar ? "معلومات غير موجودة في الوصف (لم تُخمَّن):" : "Missing information (not guessed):"}`);
    sb.missing_information.forEach((m) => lines.push(`• ${m}`));
  }
  if (identifiers.length) {
    lines.push("", `⚠️ ${ar ? "تحقّق من هذه الأسماء أو الأرقام المحتملة:" : "Check these possible names or IDs:"}`);
    identifiers.slice(0, 8).forEach((f) => lines.push(`• "${f.text}" (${f.where})`));
  }
  if (sb.anonymisation_notes.length) {
    lines.push("", `✂️ ${ar ? "تم حذف:" : "Removed:"} ${sb.anonymisation_notes.join(" ")}`);
  }
  if (reviewLink) lines.push("", `✏️ ${ar ? "للتعديل عبر الموقع:" : "Edit on the web:"} ${reviewLink}`);
  return lines.join("\n");
}

export function statusLine(p: Project, lang: Language): string {
  const date = new Date(p.createdAt).toISOString().slice(0, 10);
  return `• ${p.storyboard.title} (${p.language.toUpperCase()}, ${date}) – ${STATUS[p.status][lang]}`;
}

export function videoCaption(p: Project, link: string | null): string {
  const ar = p.language === "ar";
  return [
    `🎬 *${p.storyboard.title}*`,
    `${ar ? "الدرس" : "Key lesson"}: ${p.storyboard.key_lesson}`,
    link ? `${ar ? "رابط التحميل (صالح 7 أيام)" : "Download link (valid 7 days)"}: ${link}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
