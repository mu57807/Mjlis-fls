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
3. **The original text** is stored in the local database so reviewers can compare against it. It is never
   put in a video.

## Running on a company server

The included `Dockerfile` is a starting point. It hasn't been tested on your infrastructure yet.

```bash
docker build -t lfi-video-studio .
docker run -p 3000:3000 --env-file .env.local -v lfi-data:/app/data lfi-video-studio
```

The app has no login yet. Before making it reachable beyond your own computer, put it behind your
company's single sign-on or VPN.

## Planned next

- An API endpoint for a WhatsApp agent to submit an LFI and receive the video link.
- An optional AI-generated video clip for the "incident scene" (the data model already reserves a slot for it).
