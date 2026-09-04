/* ============================================================
   Majlis FLS — Supabase-backed app logic
   ============================================================ */

let supabaseClient = null;
let startupError = null;
try {
  if (!window.supabase) throw new Error("The app's core library didn't load.");
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  startupError = e;
}

/* ---------------- UI chrome strings (app strings, not content) ---------------- */
const UI = {
  en: {
    langToggleLabel: "العربية",
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
    openCamera: "Open Camera",
    recordHint: "Tap Open Camera to record a selfie video (up to ~30 seconds).",
    retake: "Retake",
    postResponse: "Post Response",
    captionLabel: "Add a caption (optional)",
    captionPlaceholder: "Say a few words about your video...",
    postingAs: (name, site) => `Posting as ${name} · ${site}`,
    postedToast: "Posted to the feed",
    compressing: "Compressing your video…",
    uploading: "Uploading…",
    ifadaTitle: "Ifada — Incident & Hazard Reporting",
    ifadaBody: "Ifada is our official corporate system for reporting hazards, near misses and incidents. Use it for anything that needs formal investigation and follow-up — the Majlis feed is for sharing and recognition only, and is not monitored for live hazards.",
    continueToIfada: "Continue to Ifada",
    demoNotice: "This button links out to Ifada — it does not post anything here.",
    redirectingToast: "Redirecting to Ifada…",
    commentPlaceholder: "Add a comment...",
    justNow: "Just now",
    signOut: "Sign out",
    adminNav: "Admin",
    // auth
    authRequestTitle: "Sign in",
    authRequestSub: "New here? Enter your invite code to join. Already a member? Just enter your email — leave the other fields blank.",
    authCodeLabel: "Invite code (new members only)",
    authNameLabel: "Your name",
    authJobTitleLabel: "Job title",
    authEmailLabel: "Email",
    authRequestBtn: "Send code",
    authVerifyTitle: "Check your email",
    authOtpLabel: "6-digit code",
    authVerifyBtn: "Verify & continue",
    authBackBtn: "Back",
    authLoadingSend: "Sending code…",
    authLoadingVerify: "Verifying…",
    authErrEmail: "Enter a valid email address.",
    authErrCode: "That invite code isn't valid or has already been used up.",
    authErrOtp: "That code didn't work — check it and try again.",
    authErrNeedProfileInfo: "We couldn't find your account. Enter your invite code, name, and job title to finish signing up.",
    authErrGeneric: "Something went wrong. Please try again.",
    // admin
    adminTitle: "Admin",
    adminTabCodes: "Invite Codes",
    adminTabTheme: "Theme",
    adminTabLeadership: "Leadership",
    adminTabMaterials: "Materials",
    adminTabPosts: "Posts",
    codeCompanyPh: "Company",
    codeSitePh: "Site",
    codeRoleMember: "Member",
    codeRoleAdmin: "Admin",
    createCodeBtn: "Create Invite Code",
    deactivate: "Deactivate",
    activate: "Activate",
    usesLabel: (used, max) => `${used}/${max} used`,
    themeQuarterPh: "Quarter label, e.g. Theme for Q4 2026",
    themeTitleEnPh: "Theme title (English)",
    themeTitleArPh: "Theme title (Arabic)",
    themePromptEnPh: "Prompt (English)",
    themePromptArPh: "Prompt (Arabic)",
    createThemeBtn: "Add & Set as Current",
    setCurrent: "Set as current",
    current: "Current",
    leaderNamePh: "Leader's name",
    leaderTitleEnPh: "Job title (English)",
    leaderTitleArPh: "Job title (Arabic)",
    leaderCaptionEnPh: "Caption (English)",
    leaderCaptionArPh: "Caption (Arabic)",
    saveLeadershipBtn: "Save Leadership Message",
    materialTypeVideo: "Video",
    materialTypeDoc: "Document",
    materialTitleEnPh: "Title (English)",
    materialTitleArPh: "Title (Arabic)",
    materialMetaPh: "e.g. 2:14 or PDF · 4 pages",
    addMaterialBtn: "Add Material",
    delete: "Delete",
    hide: "Hide",
    unhide: "Unhide",
    savedToast: "Saved",
    deletedToast: "Deleted",
  },
  ar: {
    langToggleLabel: "EN",
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
    openCamera: "فتح الكاميرا",
    recordHint: "اضغط على فتح الكاميرا لتسجيل مقطع ذاتي (حتى 30 ثانية تقريبًا).",
    retake: "إعادة التسجيل",
    postResponse: "نشر الرد",
    captionLabel: "أضف وصفًا (اختياري)",
    captionPlaceholder: "اكتب بضع كلمات عن مقطعك...",
    postingAs: (name, site) => `تنشر باسم ${name} · ${site}`,
    postedToast: "تم النشر في المجلس",
    compressing: "جارٍ ضغط الفيديو…",
    uploading: "جارٍ الرفع…",
    ifadaTitle: "إفادة — الإبلاغ عن الأخطار والحوادث",
    ifadaBody: "إفادة هو نظام الشركة الرسمي للإبلاغ عن الأخطار والحوادث الوشيكة والحوادث الفعلية. استخدمه لأي أمر يتطلب تحقيقًا رسميًا ومتابعة — منصة المجلس مخصصة للمشاركة والتقدير فقط، ولا تتم مراقبتها للأخطار الفعلية.",
    continueToIfada: "المتابعة إلى إفادة",
    demoNotice: "هذا الزر ينقلك إلى إفادة — ولا ينشر شيئًا هنا.",
    redirectingToast: "جارٍ التحويل إلى إفادة…",
    commentPlaceholder: "أضف تعليقًا...",
    justNow: "الآن",
    signOut: "تسجيل الخروج",
    adminNav: "الإدارة",
    authRequestTitle: "تسجيل الدخول",
    authRequestSub: "جديد هنا؟ أدخل رمز الدعوة للانضمام. عضو بالفعل؟ أدخل بريدك الإلكتروني فقط واترك الحقول الأخرى فارغة.",
    authCodeLabel: "رمز الدعوة (للأعضاء الجدد فقط)",
    authNameLabel: "اسمك",
    authJobTitleLabel: "المسمى الوظيفي",
    authEmailLabel: "البريد الإلكتروني",
    authRequestBtn: "إرسال الرمز",
    authVerifyTitle: "تحقق من بريدك الإلكتروني",
    authOtpLabel: "الرمز المكوّن من 6 أرقام",
    authVerifyBtn: "تحقق واستمر",
    authBackBtn: "رجوع",
    authLoadingSend: "جارٍ إرسال الرمز…",
    authLoadingVerify: "جارٍ التحقق…",
    authErrEmail: "أدخل بريدًا إلكترونيًا صالحًا.",
    authErrCode: "رمز الدعوة غير صالح أو تم استخدامه بالكامل.",
    authErrOtp: "الرمز غير صحيح — تحقق منه وحاول مرة أخرى.",
    authErrNeedProfileInfo: "لم نجد حسابك. أدخل رمز الدعوة واسمك ومسمّاك الوظيفي لإكمال التسجيل.",
    authErrGeneric: "حدث خطأ ما. حاول مرة أخرى.",
    adminTitle: "الإدارة",
    adminTabCodes: "رموز الدعوة",
    adminTabTheme: "الموضوع",
    adminTabLeadership: "الإدارة العليا",
    adminTabMaterials: "المواد",
    adminTabPosts: "المنشورات",
    codeCompanyPh: "الشركة",
    codeSitePh: "الموقع",
    codeRoleMember: "عضو",
    codeRoleAdmin: "مسؤول",
    createCodeBtn: "إنشاء رمز دعوة",
    deactivate: "تعطيل",
    activate: "تفعيل",
    usesLabel: (used, max) => `${used}/${max} استُخدم`,
    themeQuarterPh: "تسمية الربع، مثل موضوع الربع الرابع 2026",
    themeTitleEnPh: "عنوان الموضوع (إنجليزي)",
    themeTitleArPh: "عنوان الموضوع (عربي)",
    themePromptEnPh: "النص التحفيزي (إنجليزي)",
    themePromptArPh: "النص التحفيزي (عربي)",
    createThemeBtn: "إضافة وتعيين كموضوع حالي",
    setCurrent: "تعيين كحالي",
    current: "الحالي",
    leaderNamePh: "اسم المسؤول",
    leaderTitleEnPh: "المسمى الوظيفي (إنجليزي)",
    leaderTitleArPh: "المسمى الوظيفي (عربي)",
    leaderCaptionEnPh: "الوصف (إنجليزي)",
    leaderCaptionArPh: "الوصف (عربي)",
    saveLeadershipBtn: "حفظ رسالة الإدارة",
    materialTypeVideo: "فيديو",
    materialTypeDoc: "مستند",
    materialTitleEnPh: "العنوان (إنجليزي)",
    materialTitleArPh: "العنوان (عربي)",
    materialMetaPh: "مثل 2:14 أو PDF · 4 صفحات",
    addMaterialBtn: "إضافة مادة",
    delete: "حذف",
    hide: "إخفاء",
    unhide: "إظهار",
    savedToast: "تم الحفظ",
    deletedToast: "تم الحذف",
  },
};

/* ---------------- State ---------------- */
let lang = "en";
try { lang = localStorage.getItem("majlisLang") || "en"; } catch (e) {}

let currentUser = null;      // supabase auth user
let currentProfile = null;   // profiles row
let currentTheme = null;
let leadershipMsg = null;
let learningMaterials = [];
let feedPosts = [];          // enriched posts: { ...row, profile, likeCount, commentCount, liked }
let activePostId = null;
let replyTarget = null;      // top-level comment id
let pendingVideoBlob = null;
let pendingVideoDuration = 0;
let pendingSignup = null;    // { code, name, jobTitle, email }

const $ = (id) => document.getElementById(id);
function t(key) { return UI[lang][key]; }
function esc(str) {
  const d = document.createElement("div");
  d.textContent = str == null ? "" : String(str);
  return d.innerHTML;
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("justNow");
  if (mins < 60) return lang === "ar" ? `قبل ${mins} د` : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return lang === "ar" ? `قبل ${hours} س` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return lang === "ar" ? `قبل ${days} يوم` : `${days}d ago`;
}

const GRADIENTS = [
  ["#0B4F4A", "#0F2A3D"], ["#B5691C", "#5E3208"], ["#264D73", "#122436"],
  ["#7A1F1F", "#3A0E0E"], ["#4A3B7C", "#241D3D"], ["#1B5A54", "#0B2B28"],
  ["#8A6D1B", "#4A3908"],
];
function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h << 5) - h + str.charCodeAt(i); h |= 0; }
  return h;
}
function gradientFor(seed) { return GRADIENTS[Math.abs(hashCode(String(seed))) % GRADIENTS.length]; }
function initials(name) {
  return (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}
function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ---------------- Chrome / static UI text ---------------- */
function applyChrome() {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  $("langToggle").textContent = t("langToggleLabel");
  $("recordBtnLabel").textContent = t("recordBtn");
  $("leadershipHeading").textContent = t("leadershipHeading");
  $("learningHeading").textContent = t("learningHeading");
  $("feedHeading").textContent = t("feedHeading");
  $("ifadaBtnLabel").textContent = t("ifadaBtn");
  $("ifadaSubLabel").textContent = t("ifadaSub");
  $("respondingToLabel").textContent = t("respondingTo");
  $("recordHint").textContent = t("recordHint");
  $("startRecordBtn").textContent = t("openCamera");
  $("retakeBtn").textContent = t("retake");
  $("postRecordBtn").textContent = t("postResponse");
  $("captionLabel").textContent = t("captionLabel");
  $("captionInput").placeholder = t("captionPlaceholder");
  $("commentInput").placeholder = t("commentPlaceholder");
  $("commentSend").textContent = t("send");
  $("ifadaModalTitle").textContent = t("ifadaTitle");
  $("ifadaModalBody").textContent = t("ifadaBody");
  $("ifadaContinueBtn").textContent = t("continueToIfada");
  $("ifadaDemoNotice").textContent = t("demoNotice");
  $("signOutBtn").title = t("signOut");
  $("adminNavBtn").textContent = t("adminNav");

  $("authRequestTitle").textContent = t("authRequestTitle");
  $("authRequestSub").textContent = t("authRequestSub");
  $("authCodeLabel").textContent = t("authCodeLabel");
  $("authNameLabel").textContent = t("authNameLabel");
  $("authJobTitleLabel").textContent = t("authJobTitleLabel");
  $("authEmailLabel").textContent = t("authEmailLabel");
  $("authRequestBtn").textContent = t("authRequestBtn");
  $("authVerifyTitle").textContent = t("authVerifyTitle");
  $("authOtpLabel").textContent = t("authOtpLabel");
  $("authVerifyBtn").textContent = t("authVerifyBtn");
  $("authBackBtn").textContent = t("authBackBtn");

  if (currentProfile) {
    $("recordThemeTitle").textContent = currentTheme ? loc(currentTheme, "title") : "";
    $("recordPostingAs").textContent = t("postingAs")(currentProfile.name, currentProfile.site);
  }

  applyAdminChrome();
}

function loc(row, field) {
  if (!row) return "";
  return row[`${field}_${lang}`] ?? "";
}

/* ============================================================
   AUTH
   ============================================================ */

function showAuthGate() {
  $("authGate").hidden = false;
  $("appShell").hidden = true;
}
function showApp() {
  $("authGate").hidden = true;
  $("appShell").hidden = false;
}
function setAuthLoading(on, labelKey) {
  $("authLoading").hidden = !on;
  if (labelKey) $("authLoadingLabel").textContent = t(labelKey);
}
function authError(stepEl, msg) {
  stepEl.hidden = false;
  stepEl.textContent = msg;
}

async function handleAuthRequest() {
  const code = $("authCode").value.trim().toUpperCase();
  const name = $("authName").value.trim();
  const jobTitle = $("authJobTitle").value.trim();
  const email = $("authEmail").value.trim();
  $("authRequestError").hidden = true;

  if (!email || !email.includes("@")) {
    authError($("authRequestError"), t("authErrEmail"));
    return;
  }

  if (code) {
    setAuthLoading(true, "authLoadingSend");
    const { data: validation, error: vErr } = await supabaseClient.rpc("validate_invite_code", { p_code: code });
    if (vErr || !validation || !validation[0] || !validation[0].valid) {
      setAuthLoading(false);
      authError($("authRequestError"), t("authErrCode"));
      return;
    }
  }

  pendingSignup = { code, name, jobTitle, email };
  setAuthLoading(true, "authLoadingSend");
  const { error } = await supabaseClient.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  setAuthLoading(false);
  if (error) {
    authError($("authRequestError"), error.message || t("authErrGeneric"));
    return;
  }
  $("authVerifySub").textContent = lang === "ar" ? `أدخل الرمز المرسل إلى ${email}` : `Enter the code we sent to ${email}`;
  $("authStepRequest").hidden = true;
  $("authStepVerify").hidden = false;
  $("authOtp").value = "";
  $("authVerifyError").hidden = true;
}

async function handleAuthVerify() {
  const token = $("authOtp").value.trim();
  $("authVerifyError").hidden = true;
  if (!token || !pendingSignup) return;

  setAuthLoading(true, "authLoadingVerify");
  const { data, error } = await supabaseClient.auth.verifyOtp({
    email: pendingSignup.email, token, type: "email",
  });
  if (error || !data.session) {
    setAuthLoading(false);
    authError($("authVerifyError"), t("authErrOtp"));
    return;
  }

  const ok = await ensureProfile();
  setAuthLoading(false);
  if (!ok) {
    authError($("authVerifyError"), t("authErrNeedProfileInfo"));
    $("authStepVerify").hidden = true;
    $("authStepRequest").hidden = false;
    return;
  }
  await bootApp();
}

// Makes sure a profiles row exists for the current session, redeeming the
// pending invite code if needed. Returns true iff a profile now exists.
async function ensureProfile() {
  const { data: { user } } = await supabaseClient.auth.getUser();
  if (!user) return false;
  currentUser = user;

  const { data: existing } = await supabaseClient
    .from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (existing) {
    currentProfile = existing;
    return true;
  }

  if (!pendingSignup || !pendingSignup.code || !pendingSignup.name || !pendingSignup.jobTitle) {
    return false;
  }
  const { data: profile, error } = await supabaseClient.rpc("redeem_invite_code", {
    p_code: pendingSignup.code, p_name: pendingSignup.name, p_job_title: pendingSignup.jobTitle,
  });
  if (error || !profile) return false;
  currentProfile = Array.isArray(profile) ? profile[0] : profile;
  return true;
}

async function bootApp() {
  showApp();
  $("adminNavBtn").hidden = !currentProfile.is_admin;
  await Promise.all([loadTheme(), loadLeadership(), loadLearningMaterials(), loadFeed()]);
  applyChrome();
  renderLeadership();
  renderLearning();
  renderFeed();
}

async function signOut() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  currentProfile = null;
  feedPosts = [];
  $("authStepRequest").hidden = false;
  $("authStepVerify").hidden = true;
  $("authCode").value = ""; $("authName").value = ""; $("authJobTitle").value = ""; $("authEmail").value = "";
  showAuthGate();
}

async function initAuth() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    const ok = await ensureProfile();
    if (ok) { await bootApp(); return; }
  }
  showAuthGate();
}

/* ============================================================
   DATA LOADING
   ============================================================ */

async function loadTheme() {
  const { data } = await supabaseClient.from("themes").select("*").eq("is_current", true).maybeSingle();
  currentTheme = data || null;
  $("themeBadge").textContent = currentTheme ? currentTheme.quarter_label : "";
  $("themeTitle").textContent = currentTheme ? loc(currentTheme, "title") : "";
  $("themePrompt").textContent = currentTheme ? loc(currentTheme, "prompt") : "";
}

async function loadLeadership() {
  const { data } = await supabaseClient.from("leadership_message").select("*").eq("is_current", true).maybeSingle();
  leadershipMsg = data || null;
}

async function loadLearningMaterials() {
  const { data } = await supabaseClient.from("learning_materials").select("*").order("sort_order", { ascending: true });
  learningMaterials = data || [];
}

async function loadFeed() {
  const { data: posts } = await supabaseClient
    .from("posts")
    .select("*, profiles(name, company, site)")
    .eq("is_hidden", false)
    .order("created_at", { ascending: false });
  const rows = posts || [];
  const ids = rows.map((p) => p.id);

  let likeRows = [];
  let commentRows = [];
  if (ids.length) {
    const [{ data: likes }, { data: comments }] = await Promise.all([
      supabaseClient.from("likes").select("post_id, user_id").in("post_id", ids),
      supabaseClient.from("comments").select("id, post_id").in("post_id", ids),
    ]);
    likeRows = likes || [];
    commentRows = comments || [];
  }

  feedPosts = rows.map((p) => ({
    ...p,
    likeCount: likeRows.filter((l) => l.post_id === p.id).length,
    liked: currentUser ? likeRows.some((l) => l.post_id === p.id && l.user_id === currentUser.id) : false,
    commentCount: commentRows.filter((c) => c.post_id === p.id).length,
  }));
}

/* ============================================================
   RENDER: leadership / learning
   ============================================================ */

function renderLeadership() {
  const el = $("leadershipCard");
  if (!leadershipMsg) { el.innerHTML = ""; el.onclick = null; return; }
  const [c1, c2] = gradientFor("leadership");
  el.className = "leadership-card";
  el.innerHTML = `
    <div class="leadership-thumb" style="background:linear-gradient(150deg, ${c1}, ${c2})">
      ${esc(initials(leadershipMsg.name))}
      <div class="mini-play">▶</div>
    </div>
    <div class="leadership-info">
      <p class="leadership-name">${esc(leadershipMsg.name)}</p>
      <p class="leadership-title">${esc(loc(leadershipMsg, "title"))}</p>
      <p class="leadership-caption">${esc(loc(leadershipMsg, "caption"))}</p>
      <span class="leadership-watch">${t("watchVideo")}</span>
    </div>
  `;
  el.onclick = () => openMedia({
    title: loc(leadershipMsg, "caption"),
    meta: `${leadershipMsg.name} — ${loc(leadershipMsg, "title")}`,
    gradient: gradientFor("leadership"),
    type: "video",
    url: leadershipMsg.video_url,
  });
}

function renderLearning() {
  const row = $("learningRow");
  row.innerHTML = "";
  learningMaterials.forEach((item) => {
    const [c1, c2] = gradientFor(item.id);
    const card = document.createElement("div");
    card.className = "learning-card";
    card.innerHTML = `
      <div class="learning-thumb" style="background:linear-gradient(150deg, ${c1}, ${c2})">
        ${item.type === "video" ? "🎬" : "📄"}
        <span class="learning-type-badge">${item.type === "video" ? t("watchVideo") : t("viewDocument")}</span>
        <span class="learning-meta-badge">${esc(item.meta || "")}</span>
      </div>
      <div class="learning-body">
        <p class="learning-title">${esc(loc(item, "title"))}</p>
      </div>
    `;
    card.onclick = () => openMedia({
      title: loc(item, "title"), meta: item.meta || "", gradient: [c1, c2],
      type: item.type, url: item.file_url,
    });
    row.appendChild(card);
  });
}

/* ============================================================
   RENDER: feed
   ============================================================ */

function renderFeed() {
  const list = $("feedList");
  list.innerHTML = "";
  feedPosts.forEach((post) => {
    const profile = post.profiles || {};
    const [c1, c2] = gradientFor(post.id);
    const card = document.createElement("article");
    card.className = "feed-card";
    card.innerHTML = `
      <div class="feed-card-top">
        <div class="avatar" style="background:linear-gradient(150deg, ${c1}, ${c2})">${esc(initials(profile.name))}</div>
        <div class="feed-who">
          <div class="feed-name">${esc(profile.name || "")}</div>
          <div class="feed-meta">${esc(profile.company || "")} · ${esc(profile.site || "")} · ${timeAgo(post.created_at)}</div>
        </div>
      </div>
      <div class="feed-thumb" style="background:linear-gradient(150deg, ${c1}, ${c2})">
        <div class="avatar-big">${esc(initials(profile.name))}</div>
        <div class="play-overlay"><div class="play-circle">▶</div></div>
        ${post.duration_seconds ? `<div class="duration-chip">${formatTime(post.duration_seconds)}</div>` : ""}
      </div>
      ${post.caption ? `<p class="feed-caption">${esc(post.caption)}</p>` : ""}
      <div class="feed-actions">
        <button class="action-pill like-pill ${post.liked ? "liked" : ""}" type="button">
          <span class="heart">${post.liked ? "♥" : "♡"}</span><span class="like-count">${post.likeCount}</span>
        </button>
        <span class="action-pill">💬 <span>${post.commentCount}</span></span>
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

async function toggleLike(id) {
  if (!currentUser) return;
  const post = feedPosts.find((p) => p.id === id);
  if (!post) return;
  if (post.liked) {
    post.liked = false; post.likeCount -= 1;
    renderFeed(); if (activePostId === id) renderPostModal();
    await supabaseClient.from("likes").delete().eq("post_id", id).eq("user_id", currentUser.id);
  } else {
    post.liked = true; post.likeCount += 1;
    renderFeed(); if (activePostId === id) renderPostModal();
    await supabaseClient.from("likes").insert({ post_id: id, user_id: currentUser.id });
  }
}

/* ============================================================
   Post modal + comments
   ============================================================ */

async function openPost(id) {
  activePostId = id;
  replyTarget = null;
  $("replyChip").hidden = true;
  renderPostModal();
  showModal("postModal");
  resetPostVideo();
  await loadAndRenderComments(id);
}

function renderPostModal() {
  const post = feedPosts.find((p) => p.id === activePostId);
  if (!post) return;
  const profile = post.profiles || {};
  const [c1, c2] = gradientFor(post.id);

  $("postVideoArea").style.background = `linear-gradient(150deg, ${c1}, ${c2})`;
  $("postVideoArea").dataset.url = post.video_url || "";
  $("postModalAvatar").textContent = initials(profile.name);
  $("postModalAvatar").style.background = `linear-gradient(150deg, ${c1}, ${c2})`;
  $("postModalName").textContent = profile.name || "";
  $("postModalSite").textContent = `${profile.company || ""} · ${profile.site || ""} · ${timeAgo(post.created_at)}`;
  $("postModalCaption").textContent = post.caption || "";
  $("postModalLikeCount").textContent = post.likeCount;
  $("postModalHeart").textContent = post.liked ? "♥" : "♡";
  $("postModalLike").className = "like-btn" + (post.liked ? " liked" : "");
}

async function loadAndRenderComments(postId) {
  const commentsEl = $("postModalComments");
  commentsEl.innerHTML = "";
  const { data: rows } = await supabaseClient
    .from("comments")
    .select("*, profiles(name, company, site)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  const all = rows || [];
  const topLevel = all.filter((c) => !c.parent_id);
  topLevel.forEach((c) => {
    c.replies = all.filter((r) => r.parent_id === c.id);
    commentsEl.appendChild(renderComment(c));
  });
}

function renderComment(comment) {
  const profile = comment.profiles || {};
  const [c1, c2] = gradientFor(comment.user_id);
  const wrap = document.createElement("div");
  wrap.className = "comment-row";
  wrap.innerHTML = `
    <div class="comment-avatar" style="background:linear-gradient(150deg, ${c1}, ${c2})">${esc(initials(profile.name))}</div>
    <div class="comment-body">
      <div class="comment-bubble">
        <div class="comment-name">${esc(profile.name || "")} <span class="comment-org">· ${esc(profile.company || "")}, ${esc(profile.site || "")}</span></div>
        <div class="comment-text">${esc(comment.body)}</div>
      </div>
      <div class="comment-sub">
        <span>${timeAgo(comment.created_at)}</span>
        <button type="button" data-reply="${comment.id}">${t("reply")}</button>
      </div>
      <div class="comment-replies"></div>
    </div>
  `;
  const repliesEl = wrap.querySelector(".comment-replies");
  (comment.replies || []).forEach((r) => {
    const rProfile = r.profiles || {};
    const [r1, r2] = gradientFor(r.user_id);
    const rEl = document.createElement("div");
    rEl.className = "comment-row";
    rEl.innerHTML = `
      <div class="comment-avatar" style="background:linear-gradient(150deg, ${r1}, ${r2})">${esc(initials(rProfile.name))}</div>
      <div class="comment-body">
        <div class="comment-bubble">
          <div class="comment-name">${esc(rProfile.name || "")} <span class="comment-org">· ${esc(rProfile.company || "")}, ${esc(rProfile.site || "")}</span></div>
          <div class="comment-text">${esc(r.body)}</div>
        </div>
        <div class="comment-sub"><span>${timeAgo(r.created_at)}</span></div>
      </div>
    `;
    repliesEl.appendChild(rEl);
  });
  wrap.querySelector("[data-reply]").addEventListener("click", () => {
    replyTarget = comment.id;
    $("replyChip").hidden = false;
    $("replyChip").textContent = `↪ ${profile.name || ""}`;
    $("commentInput").focus();
  });
  return wrap;
}

async function submitComment() {
  const input = $("commentInput");
  const val = input.value.trim();
  if (!val || !activePostId || !currentUser) return;
  input.value = "";
  const { error } = await supabaseClient.from("comments").insert({
    post_id: activePostId, user_id: currentUser.id, parent_id: replyTarget, body: val,
  });
  replyTarget = null;
  $("replyChip").hidden = true;
  if (error) { showToast(error.message); return; }
  const post = feedPosts.find((p) => p.id === activePostId);
  if (post) post.commentCount += 1;
  renderFeed();
  await loadAndRenderComments(activePostId);
}

/* ---------------- Post video (real element, since we now have a real url) ---------------- */
function resetPostVideo() {
  const area = $("postVideoArea");
  area.querySelectorAll("video.real-player").forEach((v) => v.remove());
  $("postPlayBtn").hidden = false;
}
function togglePostPlay() {
  const area = $("postVideoArea");
  const url = area.dataset.url;
  if (!url) return;
  let video = area.querySelector("video.real-player");
  if (video) {
    video.paused ? video.play() : video.pause();
    return;
  }
  video = document.createElement("video");
  video.className = "real-player";
  video.src = url;
  video.controls = true;
  video.autoplay = true;
  video.playsInline = true;
  video.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;";
  area.appendChild(video);
  $("postPlayBtn").hidden = true;
}

/* ============================================================
   Media modal (leadership / learning)
   ============================================================ */
function openMedia({ title, meta, gradient, type, url }) {
  const [c1, c2] = gradient;
  const area = $("mediaVideoArea");
  area.style.background = `linear-gradient(150deg, ${c1}, ${c2})`;
  area.dataset.url = url || "";
  area.dataset.type = type;
  area.querySelectorAll("video.real-player").forEach((v) => v.remove());
  $("mediaModalTitle").textContent = title;
  $("mediaModalMeta").textContent = meta;
  $("mediaPlayBtn").hidden = false;
  $("mediaPlayBtn").textContent = type === "doc" ? "📄" : "▶";
  showModal("mediaModal");
}

/* ============================================================
   Recording, compression, upload
   ============================================================ */

function openRecord() {
  pendingVideoBlob = null;
  $("recordStage").hidden = false;
  $("recordPreview").hidden = true;
  $("recordProgress").hidden = true;
  $("captionInput").value = "";
  $("recordThemeTitle").textContent = currentTheme ? loc(currentTheme, "title") : "";
  $("recordPostingAs").textContent = currentProfile ? t("postingAs")(currentProfile.name, currentProfile.site) : "";
  showModal("recordModal");
}

function onVideoFileChosen(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  pendingVideoBlob = file;
  const video = $("recordVideoPreview");
  video.src = URL.createObjectURL(file);
  video.onloadedmetadata = () => { pendingVideoDuration = video.duration || 0; };
  $("recordStage").hidden = true;
  $("recordPreview").hidden = false;
}

function compressVideo(file, opts = {}) {
  const { maxWidth = 480, maxHeight = 854, videoBitsPerSecond = 900000 } = opts;
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const scale = Math.min(1, maxWidth / video.videoWidth, maxHeight / video.videoHeight);
      const width = Math.max(2, Math.round((video.videoWidth * scale) / 2) * 2);
      const height = Math.max(2, Math.round((video.videoHeight * scale) / 2) * 2);
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (typeof canvas.captureStream !== "function" || typeof MediaRecorder === "undefined") {
        return reject(new Error("Compression not supported"));
      }
      const canvasStream = canvas.captureStream(30);
      let audioTracks = [];
      try {
        const src = video.captureStream ? video.captureStream() : (video.mozCaptureStream ? video.mozCaptureStream() : null);
        if (src) audioTracks = src.getAudioTracks();
      } catch (e) { /* proceed video-only */ }

      const combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : (MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "");
      if (!mimeType) return reject(new Error("No supported recording format"));

      const recorder = new MediaRecorder(combined, { mimeType, videoBitsPerSecond });
      const chunks = [];
      recorder.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
      recorder.onerror = reject;
      recorder.onstop = () => {
        URL.revokeObjectURL(video.src);
        resolve(new Blob(chunks, { type: mimeType }));
      };

      let drawing = true;
      function drawFrame() {
        if (!drawing) return;
        ctx.drawImage(video, 0, 0, width, height);
        requestAnimationFrame(drawFrame);
      }
      video.onended = () => { drawing = false; recorder.stop(); };
      video.onplay = () => { recorder.start(); drawFrame(); };
      video.play().catch(reject);
    };
    video.onerror = () => reject(new Error("Could not read video for compression"));
  });
}

async function postRecordedResponse() {
  if (!pendingVideoBlob || !currentUser || !currentTheme) return;
  $("recordPreview").hidden = true;
  $("recordProgress").hidden = false;
  $("recordProgressLabel").textContent = t("compressing");

  let uploadBlob = pendingVideoBlob;
  try {
    uploadBlob = await compressVideo(pendingVideoBlob);
  } catch (e) {
    uploadBlob = pendingVideoBlob; // fall back to the original file
  }

  $("recordProgressLabel").textContent = t("uploading");
  const ext = uploadBlob.type && uploadBlob.type.includes("webm") ? "webm" : "mp4";
  const path = `${currentUser.id}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabaseClient.storage.from("videos").upload(path, uploadBlob, {
    contentType: uploadBlob.type || "video/mp4",
  });
  if (upErr) {
    showToast(upErr.message);
    closeModal("recordModal");
    return;
  }
  const { data: pub } = supabaseClient.storage.from("videos").getPublicUrl(path);
  const caption = $("captionInput").value.trim();

  const { error: insErr } = await supabaseClient.from("posts").insert({
    user_id: currentUser.id,
    theme_id: currentTheme.id,
    video_url: pub.publicUrl,
    caption: caption || null,
    duration_seconds: Math.round(pendingVideoDuration) || null,
  });
  if (insErr) { showToast(insErr.message); closeModal("recordModal"); return; }

  await loadFeed();
  renderFeed();
  closeModal("recordModal");
  showToast(t("postedToast"));
  $("mainScroll").scrollTo({ top: 0, behavior: "smooth" });
}

/* ============================================================
   Ifada
   ============================================================ */
function openIfada() { showModal("ifadaModal"); }
function continueToIfada() { showToast(t("redirectingToast")); closeModal("ifadaModal"); }

/* ============================================================
   Modal helpers / toast
   ============================================================ */
function showModal(id) { $(id).hidden = false; document.body.classList.add("modal-open"); }
function closeModal(id) {
  $(id).hidden = true;
  if (![...document.querySelectorAll(".modal-overlay")].some((m) => !m.hidden)) {
    document.body.classList.remove("modal-open");
  }
  if (id === "postModal") activePostId = null;
}
let toastTimer = null;
function showToast(msg) {
  const el = $("toast");
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

/* ============================================================
   ADMIN PANEL
   ============================================================ */

function applyAdminChrome() {
  $("adminTitle").textContent = t("adminTitle");
  $("adminTabCodes").textContent = t("adminTabCodes");
  $("adminTabTheme").textContent = t("adminTabTheme");
  $("adminTabLeadership").textContent = t("adminTabLeadership");
  $("adminTabMaterials").textContent = t("adminTabMaterials");
  $("adminTabPosts").textContent = t("adminTabPosts");
  $("codeCompany").placeholder = t("codeCompanyPh");
  $("codeSite").placeholder = t("codeSitePh");
  $("codeRoleMemberOpt").textContent = t("codeRoleMember");
  $("codeRoleAdminOpt").textContent = t("codeRoleAdmin");
  $("createCodeBtn").textContent = t("createCodeBtn");
  $("themeQuarterLabel").placeholder = t("themeQuarterPh");
  $("themeTitleEn").placeholder = t("themeTitleEnPh");
  $("themeTitleAr").placeholder = t("themeTitleArPh");
  $("themePromptEn").placeholder = t("themePromptEnPh");
  $("themePromptAr").placeholder = t("themePromptArPh");
  $("createThemeBtn").textContent = t("createThemeBtn");
  $("leaderName").placeholder = t("leaderNamePh");
  $("leaderTitleEn").placeholder = t("leaderTitleEnPh");
  $("leaderTitleAr").placeholder = t("leaderTitleArPh");
  $("leaderCaptionEn").placeholder = t("leaderCaptionEnPh");
  $("leaderCaptionAr").placeholder = t("leaderCaptionArPh");
  $("saveLeadershipBtn").textContent = t("saveLeadershipBtn");
  $("materialTypeVideoOpt").textContent = t("materialTypeVideo");
  $("materialTypeDocOpt").textContent = t("materialTypeDoc");
  $("materialTitleEn").placeholder = t("materialTitleEnPh");
  $("materialTitleAr").placeholder = t("materialTitleArPh");
  $("materialMeta").placeholder = t("materialMetaPh");
  $("addMaterialBtn").textContent = t("addMaterialBtn");
}

function openAdmin() {
  showModal("adminModal");
  switchAdminTab("codes");
  refreshAdminCodes();
  refreshAdminThemes();
  if (leadershipMsg) {
    $("leaderName").value = leadershipMsg.name || "";
    $("leaderTitleEn").value = leadershipMsg.title_en || "";
    $("leaderTitleAr").value = leadershipMsg.title_ar || "";
    $("leaderCaptionEn").value = leadershipMsg.caption_en || "";
    $("leaderCaptionAr").value = leadershipMsg.caption_ar || "";
  }
  refreshAdminMaterials();
  refreshAdminPosts();
}

function switchAdminTab(tab) {
  document.querySelectorAll(".admin-tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".admin-panel").forEach((p) => { p.hidden = p.id !== `adminPanel${tab[0].toUpperCase()}${tab.slice(1)}`; });
}

async function refreshAdminCodes() {
  const { data } = await supabaseClient.from("invite_codes").select("*").order("created_at", { ascending: false });
  const list = $("inviteCodeList");
  list.innerHTML = "";
  (data || []).forEach((code) => {
    const row = document.createElement("div");
    row.className = "admin-list-item";
    row.innerHTML = `
      <div class="admin-list-main">
        <div class="admin-list-title">${esc(code.code)} <span class="admin-badge ${code.is_active ? "on" : "off"}">${code.is_active ? "●" : "✕"}</span></div>
        <div class="admin-list-sub">${esc(code.company)} · ${esc(code.site)} · ${code.role} · ${t("usesLabel")(code.use_count, code.max_uses)}</div>
      </div>
      <button class="btn btn-secondary" type="button">${code.is_active ? t("deactivate") : t("activate")}</button>
    `;
    row.querySelector("button").addEventListener("click", async () => {
      await supabaseClient.from("invite_codes").update({ is_active: !code.is_active }).eq("id", code.id);
      refreshAdminCodes();
    });
    list.appendChild(row);
  });
}

async function refreshAdminThemes() {
  const { data } = await supabaseClient.from("themes").select("*").order("created_at", { ascending: false });
  const list = $("themeList");
  list.innerHTML = "";
  (data || []).forEach((th) => {
    const row = document.createElement("div");
    row.className = "admin-list-item";
    row.innerHTML = `
      <div class="admin-list-main">
        <div class="admin-list-title">${esc(th.quarter_label)} ${th.is_current ? `<span class="admin-badge on">${t("current")}</span>` : ""}</div>
        <div class="admin-list-sub">${esc(th.title_en)}</div>
      </div>
      ${th.is_current ? "" : `<button class="btn btn-secondary" type="button">${t("setCurrent")}</button>`}
    `;
    const btn = row.querySelector("button");
    if (btn) btn.addEventListener("click", async () => {
      await supabaseClient.from("themes").update({ is_current: false }).eq("is_current", true);
      await supabaseClient.from("themes").update({ is_current: true }).eq("id", th.id);
      await loadTheme();
      applyChrome();
      refreshAdminThemes();
    });
    list.appendChild(row);
  });
}

async function refreshAdminMaterials() {
  const { data } = await supabaseClient.from("learning_materials").select("*").order("sort_order", { ascending: true });
  const list = $("materialList");
  list.innerHTML = "";
  (data || []).forEach((m) => {
    const row = document.createElement("div");
    row.className = "admin-list-item";
    row.innerHTML = `
      <div class="admin-list-main">
        <div class="admin-list-title">${esc(m.title_en)}</div>
        <div class="admin-list-sub">${m.type} · ${esc(m.meta || "")}</div>
      </div>
      <button class="btn btn-secondary" type="button">${t("delete")}</button>
    `;
    row.querySelector("button").addEventListener("click", async () => {
      await supabaseClient.from("learning_materials").delete().eq("id", m.id);
      await loadLearningMaterials();
      renderLearning();
      refreshAdminMaterials();
    });
    list.appendChild(row);
  });
}

async function refreshAdminPosts() {
  const { data } = await supabaseClient
    .from("posts").select("*, profiles(name, company, site)")
    .order("created_at", { ascending: false });
  const list = $("adminPostList");
  list.innerHTML = "";
  (data || []).forEach((p) => {
    const profile = p.profiles || {};
    const row = document.createElement("div");
    row.className = "admin-list-item";
    row.innerHTML = `
      <div class="admin-list-main">
        <div class="admin-list-title">${esc(profile.name || "")} ${p.is_hidden ? `<span class="admin-badge off">${t("hide")}</span>` : ""}</div>
        <div class="admin-list-sub">${esc(profile.company || "")} · ${esc(profile.site || "")} · ${esc((p.caption || "").slice(0, 60))}</div>
      </div>
      <button class="btn btn-secondary" type="button">${p.is_hidden ? t("unhide") : t("hide")}</button>
    `;
    row.querySelector("button").addEventListener("click", async () => {
      await supabaseClient.from("posts").update({ is_hidden: !p.is_hidden }).eq("id", p.id);
      await loadFeed();
      renderFeed();
      refreshAdminPosts();
    });
    list.appendChild(row);
  });
}

async function uploadToMaterials(file, prefix) {
  const path = `${prefix}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
  const { error } = await supabaseClient.storage.from("materials").upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data } = supabaseClient.storage.from("materials").getPublicUrl(path);
  return data.publicUrl;
}

/* ============================================================
   Wire up events
   ============================================================ */
function init() {
  applyChrome();

  $("langToggle").addEventListener("click", () => {
    lang = lang === "en" ? "ar" : "en";
    try { localStorage.setItem("majlisLang", lang); } catch (e) {}
    applyChrome();
    if (currentProfile) { renderLeadership(); renderLearning(); renderFeed(); if (activePostId) renderPostModal(); }
  });

  $("authRequestBtn").addEventListener("click", handleAuthRequest);
  $("authVerifyBtn").addEventListener("click", handleAuthVerify);
  $("authBackBtn").addEventListener("click", () => {
    $("authStepVerify").hidden = true;
    $("authStepRequest").hidden = false;
  });
  $("signOutBtn").addEventListener("click", signOut);

  $("recordBtn").addEventListener("click", openRecord);
  $("recordModalClose").addEventListener("click", () => closeModal("recordModal"));
  $("startRecordBtn").addEventListener("click", () => $("videoFileInput").click());
  $("videoFileInput").addEventListener("change", onVideoFileChosen);
  $("retakeBtn").addEventListener("click", () => $("videoFileInput").click());
  $("postRecordBtn").addEventListener("click", postRecordedResponse);

  $("postModalClose").addEventListener("click", () => closeModal("postModal"));
  $("postPlayBtn").addEventListener("click", togglePostPlay);
  $("postModalLike").addEventListener("click", () => toggleLike(activePostId));
  $("commentSend").addEventListener("click", submitComment);
  $("commentInput").addEventListener("keydown", (e) => { if (e.key === "Enter") submitComment(); });

  $("mediaModalClose").addEventListener("click", () => closeModal("mediaModal"));
  $("mediaPlayBtn").addEventListener("click", () => {
    const area = $("mediaVideoArea");
    if (area.dataset.type === "doc") { window.open(area.dataset.url, "_blank", "noopener"); return; }
    let video = area.querySelector("video.real-player");
    if (video) { video.paused ? video.play() : video.pause(); return; }
    video = document.createElement("video");
    video.className = "real-player";
    video.src = area.dataset.url;
    video.controls = true; video.autoplay = true; video.playsInline = true;
    video.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;";
    area.appendChild(video);
    $("mediaPlayBtn").hidden = true;
  });

  $("ifadaBtn").addEventListener("click", openIfada);
  $("ifadaModalClose").addEventListener("click", () => closeModal("ifadaModal"));
  $("ifadaContinueBtn").addEventListener("click", continueToIfada);

  $("adminNavBtn").addEventListener("click", openAdmin);
  $("adminModalClose").addEventListener("click", () => closeModal("adminModal"));
  $("adminTabs").addEventListener("click", (e) => {
    const btn = e.target.closest(".admin-tab");
    if (btn) switchAdminTab(btn.dataset.tab);
  });

  $("inviteCodeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await supabaseClient.rpc("create_invite_code", {
      p_company: $("codeCompany").value.trim(),
      p_site: $("codeSite").value.trim(),
      p_role: $("codeRole").value,
      p_max_uses: parseInt($("codeMaxUses").value, 10) || 1,
    });
    e.target.reset();
    refreshAdminCodes();
  });

  $("themeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const { data: newTheme, error } = await supabaseClient.from("themes").insert({
      quarter_label: $("themeQuarterLabel").value.trim(),
      title_en: $("themeTitleEn").value.trim(),
      title_ar: $("themeTitleAr").value.trim(),
      prompt_en: $("themePromptEn").value.trim(),
      prompt_ar: $("themePromptAr").value.trim(),
      is_current: false,
    }).select().single();
    if (!error && newTheme) {
      await supabaseClient.from("themes").update({ is_current: false }).eq("is_current", true);
      await supabaseClient.from("themes").update({ is_current: true }).eq("id", newTheme.id);
      await loadTheme();
      applyChrome();
    }
    e.target.reset();
    refreshAdminThemes();
    showToast(t("savedToast"));
  });

  $("leadershipForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = $("leaderVideoFile").files[0];
    let videoUrl = leadershipMsg ? leadershipMsg.video_url : null;
    if (file) {
      try { videoUrl = await uploadToMaterials(file, "leadership"); }
      catch (err) { showToast(err.message); return; }
    }
    if (!videoUrl) { showToast("Please attach a video"); return; }
    await supabaseClient.from("leadership_message").update({ is_current: false }).eq("is_current", true);
    await supabaseClient.from("leadership_message").insert({
      name: $("leaderName").value.trim(),
      title_en: $("leaderTitleEn").value.trim(),
      title_ar: $("leaderTitleAr").value.trim(),
      caption_en: $("leaderCaptionEn").value.trim(),
      caption_ar: $("leaderCaptionAr").value.trim(),
      video_url: videoUrl,
      is_current: true,
    });
    await loadLeadership();
    renderLeadership();
    showToast(t("savedToast"));
  });

  $("materialForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const file = $("materialFile").files[0];
    if (!file) return;
    let url;
    try { url = await uploadToMaterials(file, "learning"); }
    catch (err) { showToast(err.message); return; }
    await supabaseClient.from("learning_materials").insert({
      type: $("materialType").value,
      title_en: $("materialTitleEn").value.trim(),
      title_ar: $("materialTitleAr").value.trim(),
      file_url: url,
      meta: $("materialMeta").value.trim() || null,
      sort_order: learningMaterials.length,
    });
    e.target.reset();
    await loadLearningMaterials();
    renderLearning();
    refreshAdminMaterials();
    showToast(t("savedToast"));
  });

  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(overlay.id); });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal-overlay").forEach((m) => { if (!m.hidden) closeModal(m.id); });
    }
  });

  initAuth().catch((e) => showFatalBanner(e.message || "Please check your connection and reload the page."));
}

function showFatalBanner(detail) {
  const banner = document.getElementById("fatalBanner");
  if (!banner) return;
  if (detail) document.getElementById("fatalBannerDetail").textContent = detail;
  banner.hidden = false;
}

document.addEventListener("DOMContentLoaded", () => {
  if (startupError) {
    showFatalBanner(startupError.message || "Please check your connection and reload the page.");
    return;
  }
  try {
    init();
  } catch (e) {
    showFatalBanner(e.message || "Please check your connection and reload the page.");
  }
});
