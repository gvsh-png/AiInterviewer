# PROBE — AI Interviewer Chats

Social-style voice messaging app with a roster of AI interviewers — each
with a different job, avatar, voice, color accent, and personality.

## Features

- **12 contacts** sorted by the most recent conversation
- Search, local conversation history, light/dark/system themes, and reset tools
- Unique **voices** and **color themes** per interviewer
- Password gate (`SITE_PASSWORD`)
- Speech-to-text + TTS via OpenRouter
- Occasional character photo dumps (OpenRouter image gen, at most every 5 turns)
- Typewriter transcript synced to spoken chunks
- Responsive mobile inbox and desktop split-pane chat

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

## Roster (twists)

| Person | Job | Twist |
| --- | --- | --- |
| Derek Holloway | Game Testing | Narcissist family-spill QA lead |
| Marlene Crowe | Corporate HR | Stalker who already researched you |
| Ira Voss | Corporate Security | Paranoid chief who implies disappearances |
| Celeste Moon | People Wellness | Cultish devotion recruiter |
| Griffin Hale | Brand & Design | Idea thief / gaslighter |
| Dr. Helen Pike | Biotech Research | Cold clinician, “imperfect specimens” |
| June Pell | Customer Support | Weird oversharer, basement tickets |
| Viktor Romanov | Private Equity | Hunter metaphors, predatory PE |
| Ashley Venn | Social Media | Parasocial stalker growth lead |
| Hector Blaine | Facilities & Ops | Lonely night-shift address creep |
| Vera Quill | Legal Compliance | Gaslighting sadist |
| Knox Delgado | Esports Coaching | Rage coach, stage “accidents” |
