// Pre-written storyboards for the two sample incidents. Used only in demo mode
// (LFI_DEMO_MODE=true), so the app can be tried without a Claude API key.
// They show what a good Claude result looks like for each sample.

import type { RawStoryboard } from "@/lib/schema";
import type { SampleIncident } from "./incidents";

type Lang = "en" | "ar";

export const DEMO_STORYBOARDS: Record<SampleIncident["id"], Record<Lang, RawStoryboard>> = {
  "dropped-object": {
    en: {
      title: "Dropped Object: The Untethered Spanner",
      what_happened:
        "During routine maintenance on a drilling rig, a 1.2 kg adjustable spanner fell about 18 metres from the monkey board to the drill floor. It landed 1.5 metres from a floorhand. Nobody was injured.",
      why_it_happened: [
        "The spanner was not tethered.",
        "Tool lanyards were kept in a locked container; the key was with the night supervisor.",
        "The area below was not barricaded because the job was considered quick.",
        "The permit review did not cover dropped object hazards for this task.",
        "The morning toolbox talk did not mention working at height.",
        "The crew was behind schedule after an earlier equipment failure.",
      ],
      key_lesson: "Any tool used at height must be tethered, every time, even for a quick job.",
      actions: [
        "Tether every tool used at height.",
        "Keep tool lanyards accessible to the crew on every shift.",
        "Barricade the area below work at height.",
        "Include dropped object hazards in the permit review and toolbox talk.",
      ],
      missing_information: [
        "Whether a dropped objects inspection of the work area was done before the job.",
        "Who decided the job was 'quick' and did not need a barricade.",
        "What actions the company has already taken after the incident.",
      ],
      anonymisation_notes: [
        "Removed 2 personal names.",
        "Removed a contractor company name.",
        "Removed a rig identifier and an oil field name.",
        "Removed a badge number and a permit number.",
        "Removed the exact date and time.",
      ],
      scenes: [
        {
          visual_type: "title_card",
          narration: "Learning from incident: a dropped tool from height.",
          caption: "Dropped Object: Untethered Tool",
          icons: ["dropped_object", "hard_hat"],
          duration_seconds: 5,
        },
        {
          visual_type: "what_happened",
          narration:
            "During maintenance on a drilling rig, a 1.2 kilogram spanner fell about 18 metres from the monkey board. It landed one and a half metres from a floorhand. Nobody was hurt.",
          caption: "1.2 kg spanner fell 18 m",
          icons: ["dropped_object", "tools", "worker"],
          duration_seconds: 13,
        },
        {
          visual_type: "root_cause",
          narration:
            "Why did it happen? The spanner was not tethered. The tool lanyards were locked away. The area below was not barricaded, and the permit review did not cover dropped objects. The crew was also behind schedule.",
          caption: "Untethered tool, no barricade",
          icons: ["harness", "barrier", "permit", "time_pressure"],
          duration_seconds: 14,
        },
        {
          visual_type: "key_lesson",
          narration: "The key lesson: any tool used at height must be tethered, every time, even for a quick job.",
          caption: "At height? Tether every tool.",
          icons: ["harness", "lesson"],
          duration_seconds: 9,
        },
        {
          visual_type: "checklist",
          narration:
            "Before working at height: tether every tool. Make sure lanyards are available to the crew. Barricade the area below. Cover dropped objects in the permit and toolbox talk.",
          caption: "Do this instead",
          icons: ["checklist", "harness", "barrier", "permit"],
          duration_seconds: 13,
        },
        {
          visual_type: "closing_card",
          narration: "If it can fall, secure it. Stay safe.",
          caption: "If it can fall, secure it.",
          icons: ["hard_hat"],
          duration_seconds: 6,
        },
      ],
    },
    ar: {
      title: "سقوط جسم: مفتاح ربط غير مربوط",
      what_happened:
        "أثناء أعمال صيانة روتينية على منصة حفر، سقط مفتاح ربط وزنه 1.2 كيلوغرام من ارتفاع 18 متراً تقريباً إلى أرضية الحفر، على بُعد متر ونصف من أحد العمال. ولم يُصب أحد.",
      why_it_happened: [
        "لم يكن مفتاح الربط مربوطاً بحبل أمان.",
        "كانت حبال الأدوات في حاوية مقفلة، والمفتاح مع مشرف الوردية الليلية.",
        "لم تُحجز المنطقة أسفل العمل لأن المهمة اعتُبرت سريعة.",
        "لم يتناول تصريح العمل خطر سقوط الأجسام في هذه المهمة.",
        "لم يذكر اجتماع السلامة الصباحي العمل على ارتفاع.",
        "كان الفريق متأخراً عن الجدول بسبب عطل سابق في المعدات.",
      ],
      key_lesson: "كل أداة تُستخدم على ارتفاع يجب ربطها بحبل أمان، في كل مرة، حتى في المهام السريعة.",
      actions: [
        "اربط كل أداة تُستخدم على ارتفاع بحبل أمان.",
        "اجعل حبال الأدوات في متناول الفريق في كل وردية.",
        "احجز المنطقة أسفل أي عمل على ارتفاع.",
        "اذكر خطر سقوط الأجسام في تصريح العمل واجتماع السلامة.",
      ],
      missing_information: [
        "هل أُجري فحص للأجسام القابلة للسقوط في منطقة العمل قبل المهمة؟",
        "من قرّر أن المهمة سريعة ولا تحتاج إلى حاجز؟",
        "ما الإجراءات التي اتخذتها الشركة بعد الحادثة؟",
      ],
      anonymisation_notes: [
        "حُذف اسما شخصين.",
        "حُذف اسم شركة المقاولات.",
        "حُذف رمز منصة الحفر واسم الحقل.",
        "حُذف رقم الشارة ورقم تصريح العمل.",
        "حُذف التاريخ والوقت بدقة.",
      ],
      scenes: [
        {
          visual_type: "title_card",
          narration: "تعلّم من حادثة: سقوط أداة من ارتفاع.",
          caption: "سقوط جسم: أداة غير مربوطة",
          icons: ["dropped_object", "hard_hat"],
          duration_seconds: 5,
        },
        {
          visual_type: "what_happened",
          narration:
            "أثناء أعمال صيانة على منصة حفر، سقط مفتاح ربط وزنه 1.2 كيلوغرام من ارتفاع 18 متراً تقريباً، على بُعد متر ونصف من أحد العمال. ولم يُصب أحد.",
          caption: "سقوط مفتاح ربط من 18 متراً",
          icons: ["dropped_object", "tools", "worker"],
          duration_seconds: 13,
        },
        {
          visual_type: "root_cause",
          narration:
            "الأسباب: لم تكن الأداة مربوطة بحبل أمان، وكانت حبال الأدوات مقفلاً عليها. لم تُحجز المنطقة أسفل العمل، ولم يتناول تصريح العمل خطر سقوط الأجسام. وكان الفريق متأخراً عن الجدول.",
          caption: "أداة غير مربوطة ومنطقة غير محجوزة",
          icons: ["harness", "barrier", "permit", "time_pressure"],
          duration_seconds: 14,
        },
        {
          visual_type: "key_lesson",
          narration: "الدرس الأهم: كل أداة تُستخدم على ارتفاع يجب ربطها بحبل أمان، في كل مرة، حتى في المهام السريعة.",
          caption: "على ارتفاع؟ اربط كل أداة.",
          icons: ["harness", "lesson"],
          duration_seconds: 9,
        },
        {
          visual_type: "checklist",
          narration:
            "قبل العمل على ارتفاع: اربط كل أداة بحبل أمان، وتأكد من توفر حبال الأدوات للفريق، واحجز المنطقة أسفل العمل، واذكر خطر سقوط الأجسام في تصريح العمل واجتماع السلامة.",
          caption: "افعل هذا بدلاً من ذلك",
          icons: ["checklist", "harness", "barrier", "permit"],
          duration_seconds: 13,
        },
        {
          visual_type: "closing_card",
          narration: "إذا كان يمكن أن يسقط، فأمّنه. سلامتك أولاً.",
          caption: "إذا كان يمكن أن يسقط، فأمّنه.",
          icons: ["hard_hat"],
          duration_seconds: 6,
        },
      ],
    },
  },
  "line-of-fire": {
    en: {
      title: "Line of Fire: Hose Failure During a Pressure Test",
      what_happened:
        "During a pressure test on a pipeline at a pumping station, a high-pressure hose came loose from its connection and struck a technician on the leg. He was standing right beside the hose to read the pressure gauge. He was bruised and returned to work the next day.",
      why_it_happened: [
        "No whip-check safety cables were fitted on the hose connections.",
        "No exclusion zone was set up around the line during the test.",
        "The technician stood next to the hose to read the gauge, in the line of fire.",
        "The written test procedure was not available on site; the team relied on past experience.",
      ],
      key_lesson: "During any pressure test, never stand in the line of fire. Read gauges from a safe position.",
      actions: [
        "Fit whip-checks on all hose connections before testing.",
        "Set up and enforce an exclusion zone around the line under test.",
        "Keep the written test procedure on site and follow it.",
        "Position gauges so they can be read from outside the line of fire.",
      ],
      missing_information: [
        "The test pressure at the time of the failure.",
        "The condition of the hose and connection, and when they were last inspected.",
        "Whether a permit to work or risk assessment covered the test.",
        "Why the connection came loose.",
      ],
      anonymisation_notes: [
        "Removed a personal name and an employee number.",
        "Removed a contractor company name.",
        "Removed the pumping station number and the oil field name.",
        "Removed the exact date.",
      ],
      scenes: [
        {
          visual_type: "title_card",
          narration: "Learning from incident: caught in the line of fire during a pressure test.",
          caption: "Line of Fire: Hose Failure",
          icons: ["line_of_fire", "pressure"],
          duration_seconds: 5,
        },
        {
          visual_type: "what_happened",
          narration:
            "During a pipeline pressure test, a high-pressure hose came loose from its connection and struck a technician on the leg. He was standing right beside the hose to read the gauge. He was bruised and returned to work the next day.",
          caption: "Hose came loose under pressure",
          icons: ["pipe_valve", "pressure", "medical"],
          duration_seconds: 16,
        },
        {
          visual_type: "root_cause",
          narration:
            "Why? No whip-check cables were fitted on the connections. No exclusion zone was set up around the line. And the written test procedure was not on site, so the team relied on experience.",
          caption: "No whip-checks, no exclusion zone",
          icons: ["pipe_valve", "barrier", "permit"],
          duration_seconds: 14,
        },
        {
          visual_type: "key_lesson",
          narration: "The key lesson: during any pressure test, never stand in the line of fire. Read gauges from a safe position.",
          caption: "Never stand in the line of fire",
          icons: ["line_of_fire", "lesson"],
          duration_seconds: 8,
        },
        {
          visual_type: "checklist",
          narration:
            "Before every pressure test: fit whip-checks on all hose connections. Set up and enforce an exclusion zone. Keep the written procedure on site. And stay out of the line of fire.",
          caption: "Do this instead",
          icons: ["checklist", "barrier", "permit", "line_of_fire"],
          duration_seconds: 12,
        },
        {
          visual_type: "closing_card",
          narration: "Under pressure? Stay out of the line of fire.",
          caption: "Stay out of the line of fire.",
          icons: ["hard_hat"],
          duration_seconds: 5,
        },
      ],
    },
    ar: {
      title: "خط الخطر: انفلات خرطوم أثناء اختبار الضغط",
      what_happened:
        "أثناء اختبار ضغط لخط أنابيب في محطة ضخ، انفلت خرطوم الضغط العالي من وصلته وارتطم بساق أحد الفنيين، الذي كان واقفاً بجانب الخرطوم مباشرة لقراءة مقياس الضغط. أُصيب الفني بكدمات وعاد إلى العمل في اليوم التالي.",
      why_it_happened: [
        "لم تُركَّب كابلات أمان على وصلات الخرطوم.",
        "لم تُحدَّد منطقة محظورة حول الخط أثناء الاختبار.",
        "وقف الفني بجانب الخرطوم لقراءة المقياس، أي في خط الخطر.",
        "لم تكن تعليمات الاختبار المكتوبة متوفرة في الموقع، فاعتمد الفريق على الخبرة السابقة.",
      ],
      key_lesson: "لا تقف أبداً في خط الخطر أثناء اختبار الضغط، واقرأ المقاييس من موقع آمن.",
      actions: [
        "ركّب كابلات الأمان على جميع وصلات الخراطيم قبل الاختبار.",
        "حدّد منطقة محظورة حول الخط تحت الاختبار والتزم بها.",
        "احتفظ بتعليمات الاختبار المكتوبة في الموقع واتبعها.",
        "ضع المقاييس بحيث يمكن قراءتها من خارج خط الخطر.",
      ],
      missing_information: [
        "مقدار ضغط الاختبار وقت انفلات الخرطوم.",
        "حالة الخرطوم والوصلة، ومتى فُحصت آخر مرة.",
        "هل غطّى تصريح العمل أو تقييم المخاطر هذا الاختبار؟",
        "لماذا انفلتت الوصلة؟",
      ],
      anonymisation_notes: [
        "حُذف اسم شخص ورقم موظف.",
        "حُذف اسم شركة المقاولات.",
        "حُذف رقم محطة الضخ واسم الحقل.",
        "حُذف التاريخ بدقة.",
      ],
      scenes: [
        {
          visual_type: "title_card",
          narration: "تعلّم من حادثة: الوقوف في خط الخطر أثناء اختبار الضغط.",
          caption: "خط الخطر: انفلات خرطوم",
          icons: ["line_of_fire", "pressure"],
          duration_seconds: 5,
        },
        {
          visual_type: "what_happened",
          narration:
            "أثناء اختبار ضغط لخط أنابيب، انفلت خرطوم الضغط العالي من وصلته وارتطم بساق أحد الفنيين، الذي كان واقفاً بجانب الخرطوم مباشرة لقراءة مقياس الضغط. أُصيب الفني بكدمات وعاد إلى العمل في اليوم التالي.",
          caption: "انفلات خرطوم تحت الضغط",
          icons: ["pipe_valve", "pressure", "medical"],
          duration_seconds: 16,
        },
        {
          visual_type: "root_cause",
          narration:
            "الأسباب: لم تُركَّب كابلات أمان على وصلات الخرطوم، ولم تُحدَّد منطقة محظورة حول الخط أثناء الاختبار، ولم تكن تعليمات الاختبار المكتوبة متوفرة في الموقع، فاعتمد الفريق على الخبرة السابقة.",
          caption: "لا كابلات أمان ولا منطقة محظورة",
          icons: ["pipe_valve", "barrier", "permit"],
          duration_seconds: 14,
        },
        {
          visual_type: "key_lesson",
          narration: "الدرس الأهم: لا تقف أبداً في خط الخطر أثناء اختبار الضغط، واقرأ المقاييس من موقع آمن.",
          caption: "لا تقف في خط الخطر",
          icons: ["line_of_fire", "lesson"],
          duration_seconds: 8,
        },
        {
          visual_type: "checklist",
          narration:
            "قبل كل اختبار ضغط: ركّب كابلات الأمان على جميع الوصلات، وحدّد منطقة محظورة والتزم بها، واحتفظ بالتعليمات المكتوبة في الموقع، وابقَ خارج خط الخطر.",
          caption: "افعل هذا بدلاً من ذلك",
          icons: ["checklist", "barrier", "permit", "line_of_fire"],
          duration_seconds: 12,
        },
        {
          visual_type: "closing_card",
          narration: "تحت الضغط؟ ابقَ خارج خط الخطر.",
          caption: "ابقَ خارج خط الخطر.",
          icons: ["hard_hat"],
          duration_seconds: 5,
        },
      ],
    },
  },
};
