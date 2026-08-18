# PROBE — Voice job interviews

A story campaign of twelve voice interviews. You never pick the job. PROBE assigns a random hiring contact and their role, they keep their real nature hidden, then they send a decision letter (PDF). After the last round, the file closes.

## Features

- Empty inbox on first visit — no character roster, no plus button, no job picker
- **Story mode** (`/story`) is a full comic-panel sequence: prologue, round briefings, assigned contact, aftermath, ending
- Each round assigns a random stored interviewer (name, photo, voice, personality) and **their** job
- Contacts only show name, title, company, and the assigned role
- Their twist is not shown in the UI and is not announced at the start of the call
- After enough turns they reach a **verdict** and generate a downloadable PDF letter
- Password gate (`SITE_PASSWORD`)
- Speech-to-text + TTS via OpenRouter
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

Personalities, names, and profile photos live in `src/lib/interviewers.ts`. Players only meet whoever the story assigns. Reset in Settings clears chats, contacts, and campaign progress.
