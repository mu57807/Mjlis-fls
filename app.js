/* ============================================================
   Majlis FLS — data + logic (no build tools, plain JS)
   ============================================================ */

/* ---------------- UI strings ---------------- */
const UI = {
  en: {
    langToggleLabel: "العربية",
    themeBadge: "Theme for Q4 2026",
    recordBtn: "Record Your Response",
    leadershipHeading: "Message from Leadership",
    learningHeading: "Learning from Incidents",
    feedHeading: "The Feed",
    ifadaBtn: "Report a Hazard or Incident",
    ifadaSub: "Opens Ifada — official reporting system",
    watchVideo: "Watch",
    viewDocument: "View document",
    reply: "Reply",
    send: "Send",
    respondingTo: "Responding to this quarter's theme",
    startRecording: "Start Recording",
    stopRecording: "Stop Recording",
    retake: "Retake",
    postResponse: "Post Response",
    captionLabel: "Add a caption (optional)",
    captionPlaceholder: "Say a few words about your video...",
    siteLabel: "Your site",
    postedToast: "Posted to the feed",
    ifadaTitle: "Ifada — Incident & Hazard Reporting",
    ifadaBody: "Ifada is our official corporate system for reporting hazards, near misses and incidents. Use it for anything that needs formal investigation and follow-up — the Majlis feed is for sharing and recognition only, and is not monitored for live hazards.",
    continueToIfada: "Continue to Ifada",
    demoNotice: "Demo build — does not connect to a live system",
    redirectingToast: "Redirecting to Ifada…",
    commentPlaceholder: "Add a comment...",
    recordHint: "Tap Start Recording when you're ready. We'll capture up to 30 seconds.",
    you: "You",
    justNow: "Just now",
  },
  ar: {
    langToggleLabel: "EN",
    themeBadge: "موضوع الربع الرابع 2026",
    recordBtn: "سجّل ردّك",
    leadershipHeading: "رسالة من الإدارة",
    learningHeading: "دروس مستفادة من الحوادث",
    feedHeading: "المجلس",
    ifadaBtn: "الإبلاغ عن خطر أو حادث",
    ifadaSub: "فتح نظام إفادة الرسمي للإبلاغ",
    watchVideo: "مشاهدة",
    viewDocument: "عرض المستند",
    reply: "رد",
    send: "إرسال",
    respondingTo: "ردًا على موضوع هذا الربع",
    startRecording: "بدء التسجيل",
    stopRecording: "إيقاف التسجيل",
    retake: "إعادة التسجيل",
    postResponse: "نشر الرد",
    captionLabel: "أضف وصفًا (اختياري)",
    captionPlaceholder: "اكتب بضع كلمات عن مقطعك...",
    siteLabel: "موقعك",
    postedToast: "تم النشر في المجلس",
    ifadaTitle: "إفادة — الإبلاغ عن الأخطار والحوادث",
    ifadaBody: "إفادة هو نظام الشركة الرسمي للإبلاغ عن الأخطار والحوادث الوشيكة والحوادث الفعلية. استخدمه لأي أمر يتطلب تحقيقًا رسميًا ومتابعة — منصة المجلس مخصصة للمشاركة والتقدير فقط، ولا تتم مراقبتها للأخطار الفعلية.",
    continueToIfada: "المتابعة إلى إفادة",
    demoNotice: "نسخة تجريبية — لا تتصل بنظام فعلي",
    redirectingToast: "جارٍ التحويل إلى إفادة…",
    commentPlaceholder: "أضف تعليقًا...",
    recordHint: "اضغط على بدء التسجيل عندما تكون جاهزًا. سنسجل حتى 30 ثانية.",
    you: "أنت",
    justNow: "الآن",
  },
};

const SITES = [
  { en: "Ruwais Refinery", ar: "مصفاة الرويس" },
  { en: "Habshan Gas Complex", ar: "مجمع حبشان للغاز" },
  { en: "Das Island Terminal", ar: "محطة جزيرة داس" },
  { en: "Ghasha Offshore Platform", ar: "منصة الغشاء البحرية" },
  { en: "Bab Onshore Field", ar: "حقل باب البري" },
  { en: "Zakum Development Site", ar: "موقع تطوير زاكوم" },
];

const THEME = {
  badgeKey: "themeBadge",
  title: { en: "How I Respond Matters", ar: "استجابتي تُحدث فرقًا" },
  prompt: {
    en: "Record a 30-second selfie video telling us about a moment your response made the difference.",
    ar: "سجّل مقطع فيديو ذاتي مدته 30 ثانية تحدثنا فيه عن لحظة أحدثت فيها استجابتك فرقًا.",
  },
};

const LEADERSHIP = {
  name: { en: "Eng. Khalifa Al Mansoori", ar: "المهندس خليفة المنصوري" },
  title: {
    en: "Senior Vice President, HSE & Operations Excellence",
    ar: "نائب الرئيس الأول للصحة والسلامة والبيئة والتميز التشغيلي",
  },
  caption: {
    en: "A message from leadership: why every response counts",
    ar: "رسالة من الإدارة العليا: لماذا تُحدث كل استجابة فرقًا",
  },
  duration: "1:12",
  gradient: ["#0F2A3D", "#1B5A54"],
};

const LEARNING = [
  {
    type: "video",
    title: { en: "Near Miss: Confined Space Entry", ar: "حادثة وشيكة: الدخول إلى حيز مغلق" },
    meta: "2:14",
    gradient: ["#7A1F1F", "#3A0E0E"],
    icon: "🎬",
  },
  {
    type: "video",
    title: { en: "Toolbox Talk: Heat Stress Awareness", ar: "حديث ما قبل العمل: التوعية بالإجهاد الحراري" },
    meta: "1:45",
    gradient: ["#B5691C", "#5E3208"],
    icon: "🎬",
  },
  {
    type: "doc",
    title: { en: "Q3 Incident Report Summary", ar: "ملخص تقرير حوادث الربع الثالث" },
    meta: { en: "PDF · 4 pages", ar: "PDF · 4 صفحات" },
    gradient: ["#264D73", "#122436"],
    icon: "📄",
  },
  {
    type: "video",
    title: { en: "LOTO Procedure Refresher", ar: "تذكير بإجراءات العزل والإغلاق (LOTO)" },
    meta: "3:02",
    gradient: ["#1B5A54", "#0B2B28"],
    icon: "🎬",
  },
  {
    type: "doc",
    title: { en: "Root Cause Analysis: Pipeline Leak", ar: "تحليل السبب الجذري: تسرب خط الأنابيب" },
    meta: { en: "PDF · 6 pages", ar: "PDF · 6 صفحات" },
    gradient: ["#4A3B7C", "#241D3D"],
    icon: "📄",
  },
];

const GRADIENTS = [
  ["#0B4F4A", "#0F2A3D"],
  ["#B5691C", "#5E3208"],
  ["#264D73", "#122436"],
  ["#7A1F1F", "#3A0E0E"],
  ["#4A3B7C", "#241D3D"],
  ["#1B5A54", "#0B2B28"],
  ["#8A6D1B", "#4A3908"],
];

function gradientFor(seed) {
  const idx = Math.abs(hashCode(seed)) % GRADIENTS.length;
  return GRADIENTS[idx];
}
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return h;
}
function initials(name) {
  return name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();
}

/* ---------------- Feed data ---------------- */
const FEED_SEED = [
  {
    id: "p1",
    name: "Ahmed Al Falasi",
    nameAr: "أحمد الفلاسي",
    role: { en: "Rigging Supervisor", ar: "مشرف رفع وتأهيل" },
    site: SITES[0],
    time: { en: "2 days ago", ar: "قبل يومين" },
    duration: "0:28",
    caption: {
      en: "Stopped a crane lift when I noticed the rigging certificate had expired. Two minutes felt long but nobody got hurt.",
      ar: "أوقفت عملية رفع بالرافعة عندما لاحظت أن شهادة معدات الرفع منتهية الصلاحية. دقيقتان بدتا طويلتين لكن لم يتأذَ أحد.",
    },
    likes: 47,
    comments: [
      {
        name: "Fatima Al Zaabi",
        text: { en: "This is exactly the kind of stop we want to see. Proud of you Ahmed.", ar: "هذا بالضبط نوع التوقف الذي نريد رؤيته. فخورة بك يا أحمد." },
        time: { en: "1d", ar: "يوم" },
        replies: [
          { name: "Ahmed Al Falasi", text: { en: "Thank you Fatima! The team backed me up right away.", ar: "شكرًا فاطمة! الفريق دعمني فورًا." }, time: { en: "22h", ar: "22 س" } },
        ],
      },
      {
        name: "Khalid Al Blooshi",
        text: { en: "Expired rigging certs are more common than people think. Good catch.", ar: "شهادات الرفع المنتهية أكثر شيوعًا مما يظن الناس. ملاحظة ممتازة." },
        time: { en: "1d", ar: "يوم" },
        replies: [],
      },
      {
        name: "Noora Al Suwaidi",
        text: { en: "Sharing this with my crew in tomorrow's toolbox talk.", ar: "سأشارك هذا مع فريقي في حديث الغد قبل العمل." },
        time: { en: "20h", ar: "20 س" },
        replies: [],
      },
    ],
  },
  {
    id: "p2",
    name: "Fatima Al Zaabi",
    nameAr: "فاطمة الزعابي",
    role: { en: "Process Operator", ar: "مشغلة عمليات" },
    site: SITES[1],
    time: { en: "3 days ago", ar: "قبل 3 أيام" },
    duration: "0:31",
    caption: {
      en: "Gas readings drifted during a confined space entry. Called a timeout immediately and evacuated the team — investigation found a faulty purge valve.",
      ar: "تغيرت قراءات الغاز أثناء الدخول إلى حيز مغلق، فأوقفت العمل فورًا وأخليت الفريق — وكشف التحقيق عن عطل في صمام التطهير.",
    },
    likes: 63,
    comments: [
      {
        name: "Mohammed Al Shamsi",
        text: { en: "Trusting the gas detector over the schedule — that's leadership.", ar: "الثقة بجهاز كشف الغاز بدلًا من الجدول الزمني — هذه هي القيادة." },
        time: { en: "2d", ar: "يومان" },
        replies: [],
      },
      {
        name: "Yousef Al Marri",
        text: { en: "What was the reading when you called it?", ar: "كم كانت القراءة عندما أوقفت العمل؟" },
        time: { en: "2d", ar: "يومان" },
        replies: [
          { name: "Fatima Al Zaabi", text: { en: "O2 dropped to 19.2% in under a minute — that was enough for me.", ar: "انخفض الأكسجين إلى 19.2٪ خلال أقل من دقيقة — كان ذلك كافيًا لي." }, time: { en: "1d", ar: "يوم" } },
          { name: "Yousef Al Marri", text: { en: "Good call, that drop is not normal.", ar: "قرار صحيح، هذا الانخفاض غير طبيعي." }, time: { en: "1d", ar: "يوم" } },
        ],
      },
      {
        name: "Layla Al Hashimi",
        text: { en: "Can we get this added to the confined space refresher video?", ar: "هل يمكن إضافة هذا إلى فيديو تذكير العمل في الأماكن المغلقة؟" },
        time: { en: "1d", ar: "يوم" },
        replies: [],
      },
      {
        name: "Sara Al Kaabi",
        text: { en: "This is why we never override the monitor. Well done Fatima.", ar: "لهذا السبب لا نتجاوز أبدًا جهاز المراقبة. أحسنتِ يا فاطمة." },
        time: { en: "18h", ar: "18 س" },
        replies: [],
      },
    ],
  },
  {
    id: "p3",
    name: "Mohammed Al Shamsi",
    nameAr: "محمد الشامسي",
    role: { en: "HSE Coordinator", ar: "منسق صحة وسلامة" },
    site: SITES[2],
    time: { en: "4 days ago", ar: "قبل 4 أيام" },
    duration: "0:24",
    caption: {
      en: "Saw a contractor doing hot work without a fire watch posted. Paused the job until we fixed it properly.",
      ar: "شاهدت مقاولًا يقوم بأعمال ساخنة دون وجود مراقب حريق، فأوقفت العمل حتى تم تصحيح الوضع بشكل صحيح.",
    },
    likes: 38,
    comments: [
      {
        name: "Ahmed Al Falasi",
        text: { en: "No fire watch is a hard stop, every time. Good job brother.", ar: "غياب مراقب الحريق يعني إيقافًا فوريًا دائمًا. أحسنت يا أخي." },
        time: { en: "3d", ar: "3 أيام" },
        replies: [],
      },
      {
        name: "Noora Al Suwaidi",
        text: { en: "Which contractor crew was this? We should loop in their supervisor.", ar: "أي طاقم مقاول كان هذا؟ يجب إشراك مشرفهم." },
        time: { en: "3d", ar: "3 أيام" },
        replies: [
          { name: "Mohammed Al Shamsi", text: { en: "Already flagged it with their site lead, they retrained the crew same day.", ar: "تم إبلاغ رئيس موقعهم بالفعل، وأعادوا تدريب الطاقم في نفس اليوم." }, time: { en: "2d", ar: "يومان" } },
        ],
      },
    ],
  },
  {
    id: "p4",
    name: "Sara Al Kaabi",
    nameAr: "سارة الكعبي",
    role: { en: "Lifting Operations Lead", ar: "مسؤولة عمليات الرفع" },
    site: SITES[3],
    time: { en: "5 days ago", ar: "قبل 5 أيام" },
    duration: "0:29",
    caption: {
      en: "A pallet shifted mid-lift on the platform. My quick call to clear the drop zone kept everyone outside the radius.",
      ar: "انزلقت منصة نقالة أثناء عملية الرفع على المنصة. طلبي السريع بإخلاء منطقة السقوط أبقى الجميع خارج نطاق الخطر.",
    },
    likes: 55,
    comments: [
      {
        name: "Khalid Al Blooshi",
        text: { en: "Offshore lifts leave no room for hesitation. Nicely handled.", ar: "عمليات الرفع البحرية لا تحتمل التردد. تعامل ممتاز." },
        time: { en: "4d", ar: "4 أيام" },
        replies: [],
      },
      {
        name: "Fatima Al Zaabi",
        text: { en: "Was the load re-secured before continuing?", ar: "هل تم تثبيت الحمولة مجددًا قبل المتابعة؟" },
        time: { en: "4d", ar: "4 أيام" },
        replies: [
          { name: "Sara Al Kaabi", text: { en: "Yes — full re-rig and a second banksman before we resumed.", ar: "نعم — أعدنا تجهيز الرفع بالكامل وأضفنا مراقب رفع ثانٍ قبل الاستئناف." }, time: { en: "3d", ar: "3 أيام" } },
        ],
      },
      {
        name: "Yousef Al Marri",
        text: { en: "Adding this clip to our next lifting supervisor briefing.", ar: "سأضيف هذا المقطع إلى إحاطة مشرفي الرفع القادمة." },
        time: { en: "2d", ar: "يومان" },
        replies: [],
      },
      {
        name: "Layla Al Hashimi",
        text: { en: "Great awareness under pressure, Sara.", ar: "وعي رائع تحت الضغط يا سارة." },
        time: { en: "2d", ar: "يومان" },
        replies: [],
      },
    ],
  },
  {
    id: "p5",
    name: "Yousef Al Marri",
    nameAr: "يوسف المرّي",
    role: { en: "Field Supervisor", ar: "مشرف ميداني" },
    site: SITES[4],
    time: { en: "6 days ago", ar: "قبل 6 أيام" },
    duration: "0:26",
    caption: {
      en: "Wind speed jumped right before start-up. Delayed by 20 minutes and it was the right call — gusts hit 42 km/h ten minutes later.",
      ar: "ارتفعت سرعة الرياح فجأة قبل بدء التشغيل. أجّلت العملية 20 دقيقة وكان القرار صائبًا — إذ وصلت الرياح إلى 42 كم/س بعد عشر دقائق.",
    },
    likes: 29,
    comments: [
      {
        name: "Mohammed Al Shamsi",
        text: { en: "Patience over pressure. Solid decision.", ar: "الصبر أهم من الضغط. قرار متين." },
        time: { en: "5d", ar: "5 أيام" },
        replies: [],
      },
      {
        name: "Sara Al Kaabi",
        text: { en: "This matches the near miss we had last month. Weather calls are always worth the delay.", ar: "هذا يتطابق مع الحادثة الوشيكة التي حدثت لدينا الشهر الماضي. قرارات الطقس تستحق التأخير دائمًا." },
        time: { en: "5d", ar: "5 أيام" },
        replies: [],
      },
    ],
  },
];

/* ---------------- State ---------------- */
let lang = localStorage.getItem("majlisLang") || "en";
let feed = JSON.parse(JSON.stringify(FEED_SEED));
let likedIds = new Set();
let activePostId = null;
let replyTarget = null; // { commentIndex }
let recordTimer = null;
let recordSeconds = 0;

const $ = (id) => document.getElementById(id);
function t(key) { return UI[lang][key]; }
function loc(field) { return field[lang]; }

/* ---------------- Render: static chrome ---------------- */
function applyChrome() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  $("langToggle").textContent = t("langToggleLabel");
  $("themeBadge").textContent = t("themeBadge");
  $("themeTitle").textContent = loc(THEME.title);
  $("themePrompt").textContent = loc(THEME.prompt);
  $("recordBtnLabel").textContent = t("recordBtn");
  $("leadershipHeading").textContent = t("leadershipHeading");
  $("learningHeading").textContent = t("learningHeading");
  $("feedHeading").textContent = t("feedHeading");
  $("ifadaBtnLabel").textContent = t("ifadaBtn");
  $("ifadaSubLabel").textContent = t("ifadaSub");
  $("respondingToLabel").textContent = t("respondingTo");
  $("recordThemeTitle").textContent = loc(THEME.title);
  $("startRecordBtn").textContent = t("startRecording");
  $("recordHint").textContent = t("recordHint");
  $("retakeBtn").textContent = t("retake");
  $("postRecordBtn").textContent = t("postResponse");
  $("siteLabel").textContent = t("siteLabel");
  $("captionLabel").textContent = t("captionLabel");
  $("captionInput").placeholder = t("captionPlaceholder");
  $("commentInput").placeholder = t("commentPlaceholder");
  $("commentSend").textContent = t("send");
  $("ifadaModalTitle").textContent = t("ifadaTitle");
  $("ifadaModalBody").textContent = t("ifadaBody");
  $("ifadaContinueBtn").textContent = t("continueToIfada");
  $("ifadaDemoNotice").textContent = t("demoNotice");

  const siteSelect = $("siteSelect");
  siteSelect.innerHTML = "";
  SITES.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.en;
    opt.textContent = loc(s);
    siteSelect.appendChild(opt);
  });
}

/* ---------------- Render: leadership ---------------- */
function renderLeadership() {
  const [c1, c2] = LEADERSHIP.gradient;
  $("leadershipCard").innerHTML = `
    <div class="leadership-thumb" style="background:linear-gradient(150deg, ${c1}, ${c2})">
      ${initials(loc(LEADERSHIP.name))}
      <div class="mini-play">▶</div>
    </div>
    <div class="leadership-info">
      <p class="leadership-name">${loc(LEADERSHIP.name)}</p>
      <p class="leadership-title">${loc(LEADERSHIP.title)}</p>
      <p class="leadership-caption">${loc(LEADERSHIP.caption)}</p>
      <span class="leadership-watch">${t("watchVideo")} · ${LEADERSHIP.duration}</span>
    </div>
  `;
  $("leadershipCard").className = "leadership-card";
  $("leadershipCard").onclick = () => openMedia({
    title: loc(LEADERSHIP.caption),
    meta: `${loc(LEADERSHIP.name)} — ${loc(LEADERSHIP.title)}`,
    gradient: LEADERSHIP.gradient,
    type: "video",
  });
}

/* ---------------- Render: learning row ---------------- */
function renderLearning() {
  const row = $("learningRow");
  row.innerHTML = "";
  LEARNING.forEach((item) => {
    const [c1, c2] = item.gradient;
    const metaText = typeof item.meta === "string" ? item.meta : loc(item.meta);
    const card = document.createElement("div");
    card.className = "learning-card";
    card.innerHTML = `
      <div class="learning-thumb" style="background:linear-gradient(150deg, ${c1}, ${c2})">
        ${item.icon}
        <span class="learning-type-badge">${item.type === "video" ? t("watchVideo") : t("viewDocument")}</span>
        <span class="learning-meta-badge">${metaText}</span>
      </div>
      <div class="learning-body">
        <p class="learning-title">${loc(item.title)}</p>
      </div>
    `;
    card.onclick = () => openMedia({
      title: loc(item.title),
      meta: metaText,
      gradient: item.gradient,
      type: item.type,
    });
    row.appendChild(card);
  });
}

/* ---------------- Render: feed ---------------- */
function totalComments(post) {
  return post.comments.reduce((sum, c) => sum + 1 + (c.replies ? c.replies.length : 0), 0);
}

function renderFeed() {
  const list = $("feedList");
  list.innerHTML = "";
  feed.forEach((post) => {
    const [c1, c2] = gradientFor(post.id);
    const displayName = lang === "ar" && post.nameAr ? post.nameAr : post.name;
    const liked = likedIds.has(post.id);
    const card = document.createElement("article");
    card.className = "feed-card";
    card.innerHTML = `
      <div class="feed-card-top">
        <div class="avatar" style="background:linear-gradient(150deg, ${c1}, ${c2})">${initials(post.name)}</div>
        <div class="feed-who">
          <div class="feed-name">${displayName}</div>
          <div class="feed-meta">${loc(post.site)} · ${loc(post.time)}</div>
        </div>
      </div>
      <div class="feed-thumb" style="background:linear-gradient(150deg, ${c1}, ${c2})">
        <div class="avatar-big">${initials(post.name)}</div>
        <div class="play-overlay"><div class="play-circle">▶</div></div>
        <div class="duration-chip">${post.duration}</div>
      </div>
      <p class="feed-caption">${loc(post.caption)}</p>
      <div class="feed-actions">
        <button class="action-pill like-pill ${liked ? "liked" : ""}" data-id="${post.id}" type="button">
          <span class="heart">${liked ? "♥" : "♡"}</span><span class="like-count">${post.likes}</span>
        </button>
        <span class="action-pill">💬 <span>${totalComments(post)}</span></span>
      </div>
    `;
    card.querySelector(".like-pill").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleLike(post.id);
    });
    card.addEventListener("click", () => openPost(post.id));
    list.appendChild(card);
  });
}

function toggleLike(id) {
  const post = feed.find((p) => p.id === id);
  if (!post) return;
  if (likedIds.has(id)) {
    likedIds.delete(id);
    post.likes -= 1;
  } else {
    likedIds.add(id);
    post.likes += 1;
  }
  renderFeed();
  if (activePostId === id) renderPostModal();
}

/* ---------------- Post modal ---------------- */
function openPost(id) {
  activePostId = id;
  replyTarget = null;
  renderPostModal();
  showModal("postModal");
  resetPostVideo();
}

function renderPostModal() {
  const post = feed.find((p) => p.id === activePostId);
  if (!post) return;
  const [c1, c2] = gradientFor(post.id);
  const displayName = lang === "ar" && post.nameAr ? post.nameAr : post.name;
  const liked = likedIds.has(post.id);

  $("postVideoArea").style.background = `linear-gradient(150deg, ${c1}, ${c2})`;
  $("postModalAvatar").textContent = initials(post.name);
  $("postModalAvatar").style.background = `linear-gradient(150deg, ${c1}, ${c2})`;
  $("postModalName").textContent = displayName;
  $("postModalSite").textContent = `${loc(post.site)} · ${loc(post.time)}`;
  $("postModalCaption").textContent = loc(post.caption);
  $("postModalLikeCount").textContent = post.likes;
  $("postModalHeart").textContent = liked ? "♥" : "♡";
  $("postModalLike").className = "like-btn" + (liked ? " liked" : "");

  const commentsEl = $("postModalComments");
  commentsEl.innerHTML = "";
  post.comments.forEach((c, idx) => commentsEl.appendChild(renderComment(c, idx)));
}

function renderComment(comment, commentIndex) {
  const [c1, c2] = gradientFor(comment.name);
  const wrap = document.createElement("div");
  wrap.className = "comment-row";
  wrap.innerHTML = `
    <div class="comment-avatar" style="background:linear-gradient(150deg, ${c1}, ${c2})">${initials(comment.name)}</div>
    <div class="comment-body">
      <div class="comment-bubble">
        <div class="comment-name">${comment.name}</div>
        <div class="comment-text">${loc(comment.text)}</div>
      </div>
      <div class="comment-sub">
        <span>${loc(comment.time)}</span>
        <button type="button" data-reply="${commentIndex}">${t("reply")}</button>
      </div>
      <div class="comment-replies"></div>
    </div>
  `;
  const repliesEl = wrap.querySelector(".comment-replies");
  (comment.replies || []).forEach((r) => {
    const [r1, r2] = gradientFor(r.name);
    const rEl = document.createElement("div");
    rEl.className = "comment-row";
    rEl.innerHTML = `
      <div class="comment-avatar" style="background:linear-gradient(150deg, ${r1}, ${r2})">${initials(r.name)}</div>
      <div class="comment-body">
        <div class="comment-bubble">
          <div class="comment-name">${r.name}</div>
          <div class="comment-text">${loc(r.text)}</div>
        </div>
        <div class="comment-sub"><span>${loc(r.time)}</span></div>
      </div>
    `;
    repliesEl.appendChild(rEl);
  });
  wrap.querySelector("[data-reply]").addEventListener("click", () => {
    replyTarget = commentIndex;
    $("replyChip").hidden = false;
    $("replyChip").textContent = `↪ ${comment.name}`;
    $("commentInput").focus();
  });
  return wrap;
}

function submitComment() {
  const input = $("commentInput");
  const val = input.value.trim();
  if (!val) return;
  const post = feed.find((p) => p.id === activePostId);
  if (!post) return;
  const entry = { name: t("you"), text: { en: val, ar: val }, time: { en: t("justNow"), ar: t("justNow") } };
  if (replyTarget !== null && post.comments[replyTarget]) {
    if (!post.comments[replyTarget].replies) post.comments[replyTarget].replies = [];
    post.comments[replyTarget].replies.push(entry);
  } else {
    entry.replies = [];
    post.comments.push(entry);
  }
  input.value = "";
  replyTarget = null;
  $("replyChip").hidden = true;
  renderPostModal();
  renderFeed();
}

/* ---------------- Post video mock playback ---------------- */
let postPlayInterval = null;
function resetPostVideo() {
  clearInterval(postPlayInterval);
  $("postProgressBar").style.width = "0%";
  $("postPlayBtn").hidden = false;
  $("postPlayBtn").textContent = "▶";
  $("postRecIndicator").hidden = true;
}
function togglePostPlay() {
  const post = feed.find((p) => p.id === activePostId);
  const durationSeconds = post ? parseDuration(post.duration) : 28;
  if (postPlayInterval) {
    clearInterval(postPlayInterval);
    postPlayInterval = null;
    $("postPlayBtn").hidden = false;
    $("postRecIndicator").hidden = true;
    return;
  }
  $("postPlayBtn").hidden = true;
  $("postRecIndicator").hidden = false;
  let elapsed = 0;
  postPlayInterval = setInterval(() => {
    elapsed += 0.2;
    const pct = Math.min(100, (elapsed / durationSeconds) * 100);
    $("postProgressBar").style.width = pct + "%";
    $("postRecTime").textContent = formatTime(Math.min(elapsed, durationSeconds));
    if (elapsed >= durationSeconds) {
      clearInterval(postPlayInterval);
      postPlayInterval = null;
      $("postPlayBtn").hidden = false;
      $("postRecIndicator").hidden = true;
      $("postProgressBar").style.width = "0%";
    }
  }, 200);
}
function parseDuration(str) {
  const [m, s] = str.split(":").map(Number);
  return m * 60 + s;
}
function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ---------------- Media modal (leadership / learning) ---------------- */
let mediaPlayInterval = null;
function openMedia({ title, meta, gradient, type }) {
  const [c1, c2] = gradient;
  $("mediaVideoArea").style.background = `linear-gradient(150deg, ${c1}, ${c2})`;
  $("mediaModalTitle").textContent = title;
  $("mediaModalMeta").textContent = meta;
  $("mediaPlayBtn").textContent = type === "doc" ? "📄" : "▶";
  $("mediaProgressBar").style.width = "0%";
  clearInterval(mediaPlayInterval);
  mediaPlayInterval = null;
  showModal("mediaModal");
}
$("mediaPlayBtn") && $("mediaPlayBtn").addEventListener("click", () => {
  if (mediaPlayInterval) {
    clearInterval(mediaPlayInterval);
    mediaPlayInterval = null;
    $("mediaProgressBar").style.width = "0%";
    return;
  }
  let elapsed = 0;
  const total = 20;
  mediaPlayInterval = setInterval(() => {
    elapsed += 0.2;
    const pct = Math.min(100, (elapsed / total) * 100);
    $("mediaProgressBar").style.width = pct + "%";
    if (elapsed >= total) {
      clearInterval(mediaPlayInterval);
      mediaPlayInterval = null;
      $("mediaProgressBar").style.width = "0%";
    }
  }, 200);
});

/* ---------------- Record flow ---------------- */
function openRecord() {
  resetRecordModal();
  showModal("recordModal");
}
function resetRecordModal() {
  clearInterval(recordTimer);
  recordTimer = null;
  recordSeconds = 0;
  $("recordStage").hidden = false;
  $("recordPreview").hidden = true;
  $("recIndicatorLive").hidden = true;
  $("recordHint").hidden = false;
  $("recLiveTime").textContent = "0:00";
  $("startRecordBtn").textContent = t("startRecording");
  $("startRecordBtn").onclick = startRecording;
  $("captionInput").value = "";
}
function startRecording() {
  $("recordHint").hidden = true;
  $("recIndicatorLive").hidden = false;
  $("startRecordBtn").textContent = t("stopRecording");
  $("startRecordBtn").onclick = stopRecording;
  recordSeconds = 0;
  recordTimer = setInterval(() => {
    recordSeconds += 1;
    $("recLiveTime").textContent = formatTime(recordSeconds);
    if (recordSeconds >= 30) stopRecording();
  }, 1000);
}
function stopRecording() {
  clearInterval(recordTimer);
  recordTimer = null;
  $("recordStage").hidden = true;
  $("recordPreview").hidden = false;
  $("previewLen").textContent = String(recordSeconds).padStart(2, "0");
}
function postRecordedResponse() {
  const site = SITES.find((s) => s.en === $("siteSelect").value) || SITES[0];
  const caption = $("captionInput").value.trim();
  const duration = formatTime(recordSeconds || 12);
  const newPost = {
    id: "p" + Date.now(),
    name: t("you"),
    nameAr: t("you"),
    role: { en: "Frontline Supervisor", ar: "مشرف ميداني" },
    site,
    time: { en: t("justNow"), ar: t("justNow") },
    duration,
    caption: {
      en: caption || "Responding to this quarter's theme: How I Respond Matters.",
      ar: caption || "ردًا على موضوع هذا الربع: استجابتي تُحدث فرقًا.",
    },
    likes: 0,
    comments: [],
  };
  feed.unshift(newPost);
  renderFeed();
  closeModal("recordModal");
  showToast(t("postedToast"));
  $("mainScroll").scrollTo({ top: 0, behavior: "smooth" });
}

/* ---------------- Ifada ---------------- */
function openIfada() { showModal("ifadaModal"); }
function continueToIfada() {
  showToast(t("redirectingToast"));
  closeModal("ifadaModal");
}

/* ---------------- Modal helpers ---------------- */
function showModal(id) {
  $(id).hidden = false;
  document.body.classList.add("modal-open");
}
function closeModal(id) {
  $(id).hidden = true;
  if (![...document.querySelectorAll(".modal-overlay")].some((m) => !m.hidden)) {
    document.body.classList.remove("modal-open");
  }
  if (id === "postModal") {
    clearInterval(postPlayInterval);
    postPlayInterval = null;
    activePostId = null;
  }
  if (id === "mediaModal") {
    clearInterval(mediaPlayInterval);
    mediaPlayInterval = null;
  }
  if (id === "recordModal") {
    clearInterval(recordTimer);
    recordTimer = null;
  }
}

let toastTimer = null;
function showToast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2400);
}

/* ---------------- Language switching ---------------- */
function setLang(newLang) {
  lang = newLang;
  localStorage.setItem("majlisLang", lang);
  applyChrome();
  renderLeadership();
  renderLearning();
  renderFeed();
  if (activePostId) renderPostModal();
}

/* ---------------- Wire up events ---------------- */
function init() {
  applyChrome();
  renderLeadership();
  renderLearning();
  renderFeed();

  $("langToggle").addEventListener("click", () => setLang(lang === "en" ? "ar" : "en"));
  $("recordBtn").addEventListener("click", openRecord);
  $("recordModalClose").addEventListener("click", () => closeModal("recordModal"));
  $("retakeBtn").addEventListener("click", resetRecordModal);
  $("postRecordBtn").addEventListener("click", postRecordedResponse);

  $("postModalClose").addEventListener("click", () => closeModal("postModal"));
  $("postPlayBtn").addEventListener("click", togglePostPlay);
  $("postModalLike").addEventListener("click", () => toggleLike(activePostId));
  $("commentSend").addEventListener("click", submitComment);
  $("commentInput").addEventListener("keydown", (e) => { if (e.key === "Enter") submitComment(); });

  $("mediaModalClose").addEventListener("click", () => closeModal("mediaModal"));

  $("ifadaBtn").addEventListener("click", openIfada);
  $("ifadaModalClose").addEventListener("click", () => closeModal("ifadaModal"));
  $("ifadaContinueBtn").addEventListener("click", continueToIfada);

  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay").forEach((m) => { if (!m.hidden) closeModal(m.id); });
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
