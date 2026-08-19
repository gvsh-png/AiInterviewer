# PROBE — Voice job interviews

A story campaign of five voice interviews. You never pick the job. PROBE assigns a random hiring contact and their role, they keep their real nature hidden, then they send a decision letter (PDF). After the fifth hour, the file closes.

## Features

- Empty inbox on first visit — no character roster, no plus button, no job picker
- **Story** tab: pick one of three nights, then full-screen cutscenes (prologue, arrival, aftermath, midpoint, ending)
- Each night is a different story kind; every cutscene shot generates a new photo and motion plate, with baked stills as fallback
- Five hours, five questions each, then a letter. The fifth hour always closes.
- Each interviewer has their own score under the chat; a tap unlocks it so autoplay does not stay silent
- Stress HUD with heart rate, a rising meter, red alert, room shake, and a copied-live ticker
- Hit pops, combos, paper-stamp rain, grain, and juicy send/stamp sounds when you land a stance or a letter
- Unskippable shock cutscenes fire from what you say (family, home, watching, staying late, softening, asking the glass). Pre-baked stills only.
- Derek is more likely to be the assigned contact, especially on the first hour
- Cutscene stills are baked into `public/stills/` as fallbacks (regenerate with `npm run bake:stills`)
- Each round assigns a random stored interviewer (name, photo, voice, personality) and **their** job
- Contacts only show name, title, company, and the assigned role
- Their twist is not shown in the UI and is not announced at the start of the call
- Each hour has a **brief** you can hold or flag, and three stances (work / probe / soften) that change the interview
- Callbacks stay open until a real letter. The File tracks the sample.
- **File** tab: building hours, letters, night notes, memos (including tonight's rolled memo), and a badge request
- After five questions they reach a **verdict** and generate a downloadable PDF letter
- Password gate (`SITE_PASSWORD`)
- Speech-to-text + TTS via OpenRouter, including a narrator voice on cutscenes
- Occasional in-character photo dumps

## Local run

```bash
npm install
cp .env.example .env.local
# set OPENROUTER_API_KEY and SITE_PASSWORD
npm run dev
```

## Deploy on Vercel

1. Import the repo in Vercel
2. Set `OPENROUTER_API_KEY` and `SITE_PASSWORD`
3. Deploy

## Hidden interviewer pool

Personalities, names, and profile photos live in `src/lib/interviewers.ts`. Players only meet whoever the story assigns. Reset in Settings clears chats, contacts, campaign progress, and file notes.
