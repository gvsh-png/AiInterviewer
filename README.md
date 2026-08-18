# PROBE — Voice job interviews

Apply for a role. A random hiring contact is assigned. They run a voice interview, keep their real nature hidden at first, and eventually send a decision letter (PDF).

## Features

- Empty inbox on first visit — no character roster
- **Apply for a role** assigns a random stored interviewer (name, photo, voice, personality)
- Contacts only show name, title, company, and the job you applied for
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

Personalities, names, and profile photos live in `src/lib/interviewers.ts`. Players only meet whoever gets assigned.
