# LFI Video Studio

Turns a written **Learning From Incident (LFI)** description into a short (60–90 s)
animated safety video in Arabic and/or English. Videos come in 16:9 for screens or
9:16 for WhatsApp and mobile.

**Workflow:** paste the incident → Claude writes an anonymised storyboard → you review, edit
and approve → the app adds a voiceover and renders an MP4 with burned-in subtitles →
you download the MP4, a thumbnail and an `.srt` subtitle file.

| Step | What it does | Status |
|---|---|---|
| 1 | Text → storyboard (Claude), review & edit screen, approval, history | ✅ |
| 2 | Animated video templates (Remotion) with live preview | ✅ |
| 3 | Voiceover (ElevenLabs or Azure) with subtitles synced to the voice | ✅ |
| 4 | MP4 render in the background, thumbnail, downloads | ✅ |
| 5 | WhatsApp bot, API for other systems, web login | ✅ |

---

## 1. One-time setup

1. Install **Node.js 20 or newer** (LTS) from <https://nodejs.org>.
2. Open a terminal in this folder and run `npm install`.
3. Copy the settings file:
   `cp .env.example .env.local` (Windows: `copy .env.example .env.local`)
4. Open `.env.local` in a text editor and fill in what you have:

| Setting | What for | Without it |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude writes the storyboards | Set `LFI_DEMO_MODE=true`: only the 2 samples work |
| `ELEVENLABS_API_KEY` *or* `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` | Voiceover | Videos are silent with subtitles |
| `REMOTION_LICENSE_KEY` | Required for company use of the video engine (see below) | Works, but prints a licence warning |

The first render downloads a small headless browser (about 100 MB), so that one takes longer.

## 2. Start the app

```bash
npm run dev
```

Open <http://localhost:3000>. Stop the app with `Ctrl + C`.

For everyday use (faster pages), run `npm run build` once, then `npm start`.

## 3. Try it

1. On **New LFI**, click **Load a sample → Dropped object (English)**. The sample deliberately
   contains fake names, a contractor, a rig, a badge number and a permit number.
2. Choose **Both**, **16:9** and **60 seconds**, then click **Create storyboard**. Claude takes about 20–60 s.
3. On the review screen:
   - **Identifying details** should be green: nothing personal got through.
   - **Missing information** lists facts that weren't in the description. Claude does not guess them.
   - Press **▶ Play preview** to watch the video. It updates as you edit.
   - Edit a caption or narration, change a visual type, reorder or delete a scene.
4. Click **Save**, then **Approve storyboard**. Nothing can be rendered before approval, and any
   later edit requires approval again.
5. *(With a voice key)* click **Generate voiceover for preview** to hear it in the preview.
6. Click **Render video**. A progress bar shows each stage. A 60-second video takes about 1–4 minutes.
7. Download the **MP4**, **Thumbnail** and **Subtitles (.srt)**.
8. Open **Open the العربية version →** to do the same for Arabic.
9. **History** lists every video with its thumbnail and a download button.

### Quick checks (no keys needed)

```bash
npm run self-check                      # storyboard rules, anonymisation detector, subtitle timing
npm run render:sample                   # renders the English sample to data/samples/
npm run render:sample -- ar 9:16        # Arabic, vertical
```

---

## Using it from WhatsApp

Staff send the incident to your company's WhatsApp number:

1. **They send** the incident description as a text message (Arabic or English).
2. **The bot replies** with the storyboard: every scene, any missing information, and a warning if a
   name or ID number may still be in the text. It adds **✅ Approve** and **❌ Cancel** buttons.
3. **They tap Approve.** Nothing is rendered before this, and only the person who sent the incident can
   approve it.
4. **The bot sends the video** in the chat (usually 2–4 minutes), with a download link valid for 7 days.

Options they can add to the message: `#ar` / `#en` (video language; default is the language of the
message), `#both` (two videos), `#wide` (16:9; default is 9:16 for phones), `#90` (90 seconds).
They can also send `status` / `الحالة` (their recent videos) and `help` / `مساعدة`.

WhatsApp incidents also appear in the web app's **History**, marked with a green WhatsApp badge,
so the HSE team can edit or re-render them there.

### Setting up WhatsApp (one time, about 30 minutes)

You need a Meta (Facebook) business account. The test setup is free.

1. **Make the app reachable from the internet.** Meta must be able to reach it.
   - *For testing on your computer:* install **cloudflared**
     (<https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/>), then
     run `cloudflared tunnel --url http://localhost:3000`. It prints an address like
     `https://something.trycloudflare.com`. This address changes every time you restart it.
   - *For real use:* your company server's address (ask IT).
2. In `.env.local`, set:
   - `APP_BASE_URL` = that address
   - `LFI_ADMIN_PASSWORD` = a strong password (**required** once the app can be reached from outside)
3. Go to <https://developers.facebook.com> → **My Apps → Create app**. Choose the WhatsApp / "Business" option.
4. In the app, open **WhatsApp → API Setup**:
   - Copy the **Phone number ID** → `WHATSAPP_PHONE_NUMBER_ID`.
   - Copy the **temporary access token** → `WHATSAPP_TOKEN`. It lasts 24 hours; see step 8 for a permanent one.
   - Under "To", add and verify your own mobile number. The free test number can only message
     numbers you add here.
5. **App settings → Basic** → copy the **App secret** → `WHATSAPP_APP_SECRET`.
6. Choose any secret word → `WHATSAPP_VERIFY_TOKEN`. Then put the numbers allowed to use the bot in
   `WHATSAPP_ALLOWED_NUMBERS` (e.g. `+971501234567, +971509876543`). Restart the app.
7. **WhatsApp → Configuration → Webhook → Edit**:
   - Callback URL: `<APP_BASE_URL>/api/whatsapp/webhook`
   - Verify token: the same word as `WHATSAPP_VERIFY_TOKEN`
   - Click **Verify and save**, then under **Webhook fields** subscribe to **messages**.
8. Send "help" from your phone to the test number. You should get the instructions back.
9. For everyday use: in Meta Business Settings, create a **System user** and generate a **permanent
   token** with `whatsapp_business_messaging` and `whatsapp_business_management`. Then add your company's
   real WhatsApp number and complete business verification.

Notes:
- WhatsApp accepts videos up to 16 MB. Our videos are about 5–7 MB. If a video is too large, the bot
  sends a download link instead.
- If the bot doesn't answer, look at the terminal where the app runs, and check that the number is in
  `WHATSAPP_ALLOWED_NUMBERS`.

## API for other systems

If you already have a WhatsApp agent (or any other system), it can use the API instead of the
built-in bot. Set `LFI_API_KEYS` to one or more long secret keys, and send them as
`Authorization: Bearer <key>`.

| Call | What it does |
|---|---|
| `POST /api/v1/lfi` | Submit an incident: `{ "description": "...", "outputLanguage": "auto"\|"en"\|"ar"\|"both", "aspectRatio": "9:16"\|"16:9", "targetSeconds": 60\|90, "callbackUrl": "https://..." }`. Returns the draft storyboard(s): scenes, missing information, possible names/IDs, review link. |
| `POST /api/v1/lfi/{id}/approve` | Call this **after a person has approved** the storyboard. Starts the video. |
| `GET /api/v1/lfi/{id}` | Status, progress and, when finished, `videoUrl` and `thumbnailUrl` (links valid 7 days). |

When the video is ready (or failed), `callbackUrl` receives a POST with
`{ "event": "video.ready" | "video.failed", "project": { ... } }`. If `LFI_CALLBACK_SECRET` is set,
the header `X-LFI-Signature: sha256=<HMAC of the body>` proves the call came from this app.

## Logging in

- **No password set:** the app only opens on the computer it runs on (<http://localhost:3000>).
- **`LFI_ADMIN_PASSWORD` set:** anyone with the password can open it from any device, including
  phones on the same Wi-Fi (see "Using it from your phone" below). Everyone shares one password for now;
  company single sign-on can be added later.

## Using it from your phone

1. Set `LFI_ADMIN_PASSWORD` in `.env.local`.
2. Run `npm run build` and then `npm start -- -H 0.0.0.0`.
3. On your phone (same Wi-Fi), open `http://<your computer's IP address>:3000` and log in.
   On Windows, run `ipconfig` to find the IP address; on a Mac, look in System Settings → Wi-Fi → Details.

## How the video is made

- **Templates** (in `src/remotion/scenes/`): title card, what happened (with an animated main icon;
  a dropped object really drops), root cause, key-lesson highlight, "do this instead" checklist,
  and closing card.
- **Root-cause and checklist scenes** show the lists from the **LFI summary** section of the review
  screen. Edit them there.
- **Voiceover:** each scene's narration becomes one audio clip. If a clip runs longer than its scene,
  the scene stretches to fit, so speech is never cut off.
- **Subtitles** are split into short lines and timed from the voice service's word timings. Words light
  up as they are spoken. Without a voiceover, the timing is estimated.
- **Arabic** is laid out right-to-left with the Noto Kufi Arabic font.
- Clips are cached: re-rendering after a small edit only pays for the scenes whose text changed.

## Changing the look

Edit **`brand.config.ts`** to change the logo, colours, fonts, company name and closing message.
Put your logo in `public/brand/`.

## Choosing voices

- **ElevenLabs:** choose voices in the Voice Library and put their IDs in `ELEVENLABS_VOICE_EN` /
  `ELEVENLABS_VOICE_AR`. The default model (`eleven_multilingual_v2`) speaks both languages.
- **Azure:** the defaults are `en-GB-RyanNeural` and `ar-SA-HamedNeural` (Modern Standard Arabic).
  Change them with `AZURE_VOICE_EN` / `AZURE_VOICE_AR`.
- Set `TTS_PROVIDER=none` for silent videos with subtitles only.

## If something goes wrong

- **Render failed:** the message is shown on the review screen. The full log is in `data/logs/render-<id>.log`.
- **"No Claude API key":** add `ANTHROPIC_API_KEY` to `.env.local` and restart the app.
- **The first render is slow or fails to download the browser** (common behind company proxies):
  install Chrome or Chromium and set `REMOTION_BROWSER_EXECUTABLE` to its path.

---

## Where things are

```
brand.config.ts              logo, colours, fonts: edit to rebrand
.env.local                   keys and settings (never share or commit)
data/                        database, videos, audio, logs (created automatically)
src/app/                     web pages and API routes
src/lib/                     the "engine", reusable by a future WhatsApp API
  claude/                      Claude instructions + call (anonymise, don't invent facts)
  tts/                         voice services (elevenlabs.ts, azure.ts; add more here)
  render/                      video rendering
  whatsapp/                    WhatsApp bot (client.ts, bot.ts, messages.ts = what the bot says)
  pipeline.ts                  shared steps: incident → storyboard, approve → render
  notify.ts                    sends the finished video to WhatsApp / API callbacks
  video.ts                     scene and subtitle timing
  anonymise.ts                 local double-check for names and IDs
src/remotion/                video templates
scripts/render-worker.mts    background render job (one process per render)
Dockerfile                   for running on a company server
```

## Important before company rollout

1. **Remotion licence.** The video engine (Remotion) is free only for individuals and companies with
   up to 3 people. Your company needs a **Remotion Company License** (<https://remotion.dev/license>).
   Put the key in `REMOTION_LICENSE_KEY`.
2. **Data leaving the building.** The original incident text goes to Claude (Anthropic), and the
   anonymised narration goes to ElevenLabs or Azure. Check this with your data-protection team. Azure can
   run inside your company's own Azure tenant.
   With WhatsApp, the incident text and the finished video also pass through Meta's WhatsApp Cloud API,
   which Meta hosts.
3. **The original text** is stored in the local database so reviewers can compare against it. It is never
   put in a video.

## Running on a company server

The included `Dockerfile` is a starting point. It hasn't been tested on your infrastructure yet.

```bash
docker build -t lfi-video-studio .
docker run -p 3000:3000 --env-file .env.local -v lfi-data:/app/data lfi-video-studio
```

Set `LFI_ADMIN_PASSWORD` and `APP_BASE_URL`, and serve it over HTTPS (IT can put it behind the
company's reverse proxy). Keep the `data` volume backed up: it holds the database and the videos.

## Planned next

- Company single sign-on instead of one shared password.
- Voice notes on WhatsApp (transcribe the spoken incident).
- An optional AI-generated video clip for the "incident scene" (the data model already reserves a slot for it).
