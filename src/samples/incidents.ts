// Sample incidents for testing. They are fictional. They deliberately include
// names, companies, places and ID numbers so you can check that the
// anonymisation step removes them.

export interface SampleIncident {
  id: "dropped-object" | "line-of-fire";
  label: string;
  language: "en" | "ar";
  text: string;
}

export const SAMPLE_INCIDENTS: SampleIncident[] = [
  {
    id: "dropped-object",
    label: "Dropped object (English)",
    language: "en",
    text: `On 14 March 2026 at approximately 10:40, during routine maintenance on Rig AD-27 at the Al Noor field, a 1.2 kg adjustable spanner fell approximately 18 metres from the monkey board to the drill floor. The spanner was being used by derrickman Ahmed Saleh (badge 448812), employed by Gulf Drilling Services LLC, to tighten a fitting. The tool was not tethered.

It struck the floor 1.5 metres from floorhand John Peters, who was not injured.

The area below had not been barricaded because the job was considered quick, and the Permit to Work (PTW-55721) review did not cover dropped object hazards for this task. The toolbox talk that morning did not mention working at height. The tool lanyards available on the rig were stored in a locked container and the key was with the night supervisor. The crew was behind schedule due to an earlier pump failure.`,
  },
  {
    id: "line-of-fire",
    label: "Line of fire (Arabic)",
    language: "ar",
    text: `بتاريخ 2 سبتمبر 2026، وأثناء اختبار ضغط لخط أنابيب في محطة الضخ رقم 3 التابعة لحقل الريان، انفلت خرطوم الضغط العالي من وصلته وارتطم بساق الفني خالد العتيبي من شركة النجم للمقاولات (رقم الموظف 77120). كان الفني واقفاً بجانب الخرطوم مباشرة لقراءة مقياس الضغط.

لم تكن هناك كابلات أمان (ويب تشيك) مركّبة على الوصلات، ولم يتم تحديد منطقة محظورة حول الخط أثناء الاختبار. تعرّض الفني لكدمات في الساق وعاد إلى العمل في اليوم التالي.

أفاد المشرف أن تعليمات الاختبار المكتوبة لم تكن متوفرة في الموقع، وأن الفريق اعتمد على الخبرة السابقة.`,
  },
];

/** Whitespace-insensitive match, so a pasted sample is still recognised. */
export function matchSample(text: string): SampleIncident | undefined {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const t = norm(text);
  return SAMPLE_INCIDENTS.find((s) => norm(s.text) === t);
}
