# LFI Video Studio

Turns a written **Learning From Incident (LFI)** description into a short (60–90 s)
animated safety video, in Arabic and/or English.

**Workflow:** paste incident → Claude writes an anonymised storyboard → you review,
edit and approve → the app renders an MP4 with voiceover and subtitles.

## Build status

| Phase | What it adds | Status |
|---|---|---|
| 1 | Text → storyboard (Claude), review & edit screen, approval, history | ✅ Done |
| 2 | Animated video templates (Remotion) with live preview | ⏳ Next |
| 3 | Voiceover (ElevenLabs / Azure) and synced subtitles | ⏳ |
| 4 | Full MP4 render, thumbnail, download | ⏳ |

---

## Running it on your computer

### 1. One-time setup

1. Install **Node.js 20 or newer** (LTS) from <https://nodejs.org>.
2. Open a terminal in this folder and run:

   ```bash
   npm install
   ```

3. Copy the settings file:

   ```bash
   cp .env.example .env.local        # Windows: copy .env.example .env.local
   ```

4. Open `.env.local` in a text editor and choose **one** of these:
   - **Try it without a key:** set `LFI_DEMO_MODE=true`. Only the two built-in
     sample incidents will work.
   - **Use Claude for real:** set `ANTHROPIC_API_KEY=` to your key from
     <https://console.anthropic.com/> (API Keys page) and keep `LFI_DEMO_MODE=false`.

### 2. Start the app

```bash
npm run dev
```

Open <http://localhost:3000> in your browser. Stop the app with `Ctrl + C`.

### 3. Optional checks

```bash
npm run self-check   # tests the storyboard rules and the anonymisation detector (no key needed)
npm run check        # code type-check and lint
```

---

## How to test Phase 1

1. On the **New LFI** page, click **Load a sample → Dropped object (English)**.
   Notice the sample contains fake names, a contractor, a rig, a badge number and a permit number.
2. Choose **Both**, **16:9** and **60 seconds**, then click **Create storyboard**.
   Real Claude takes about 20–60 seconds; demo mode is instant.
3. On the review screen, check:
   - **Identifying details** is green: none of the names or numbers made it through.
   - **Missing information** lists facts the description didn't give. Claude does not guess them.
   - **What Claude removed** summarises the anonymisation.
4. Edit something:
   - Type a name such as `Ahmed` into a caption. The red **Check these possible identifying
     details** panel appears. Remove it again.
   - Move a scene with the arrows, or drag it by its card.
   - Delete a scene, then click **Fit scene lengths to 60s**.
   - Change a scene's visual type.
5. Click **Save**, then **Approve storyboard**. The status turns green. The **Render video**
   button stays disabled until Phase 4 (and stays locked until a storyboard is approved).
6. Click **Open the العربية version →**. The Arabic storyboard shows right-to-left with an Arabic font.
7. Open **History**: both versions are listed. Change an approved storyboard and save it.
   It goes back to **Draft – needs approval**.
8. Repeat with **Line of fire (Arabic)** to test Arabic input.

---

## Where things are

```
brand.config.ts            ← logo, colours, fonts: edit this to rebrand
public/brand/              ← logo files
.env.local                 ← your keys and settings (never commit this)
data/lfi.db                ← history database (created automatically)
src/app/                   ← web pages and API routes
  page.tsx                   New LFI page
  projects/[id]/             review & edit screen
  history/                   history list
  api/storyboard/            text → storyboard (calls Claude)
  api/projects/              load / save / approve / delete
src/lib/                   ← the "engine" (no web code; reusable by a future WhatsApp API)
  claude/prompt.ts           the instructions Claude follows (anonymise, don't invent facts)
  claude/structure.ts        Claude call + demo mode
  schema.ts                  the storyboard data shape
  catalog.ts                 fixed lists: visual types, icons, languages
  anonymise.ts               local double-check for names / IDs left in the text
  storyboard-checks.ts       length and readability checks
  db.ts                      SQLite database
src/samples/               ← sample incidents + demo storyboards
src/components/            ← UI pieces (scene editor, etc.)
```

## Privacy notes

- In real mode, the **original** incident text is sent to the Claude API (Anthropic) to be
  structured. Anonymisation happens there, and a local check then looks for anything left over.
- The original text is stored in the local database so the reviewer can compare against it.
  It is never put in a video.
- Data is stored in `data/`. Set `LFI_DATA_DIR` to put it somewhere else (for example, a backed-up
  disk on a company server).
