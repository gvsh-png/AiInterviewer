# DEREK — AI Game Testing Interviewer

Voice interview simulator with **Derek Holloway**, a strict (and deeply self-centered) Senior QA Lead at Probe Labs.

## Features

- **Speech-to-text** — talk into the mic (Chrome / Edge Web Speech API)
- **Text-to-speech** — Derek speaks replies aloud
- **Typed fallback** — type if mic isn't available
- **Personality arc** — starts strict → cracks → spills family problems → falls for you if you act like a therapist
- **Restart** — reset the interview anytime
- **OpenRouter** — LLM via OpenRouter API

## Quick start

```bash
npm install
cp .env.example .env.local
# put your OpenRouter key in .env.local as OPENROUTER_API_KEY=...
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

You can also click **Key** in the UI and paste an OpenRouter key (stored in `localStorage` for local demos).

## Deploy

Works on any Node host that can run Next.js (Vercel, Railway, Fly, etc.):

1. Set `OPENROUTER_API_KEY` in the host environment
2. Optionally set `OPENROUTER_MODEL` (default `openai/gpt-4o-mini`)
3. `npm run build && npm start`

```bash
# Vercel example
npx vercel
```

## Personality notes

| Phase | When | Behavior |
| --- | --- | --- |
| Strict | Early turns | Harsh QA grilling, self-centered asides |
| Cracking | ~3+ answers | Starts derailing into personal stress |
| Confessional | ~6+ answers | Family / marriage spill while still judging you |
| Enamored | High therapy score | Softens if you listen / validate him |

## Stack

- Next.js App Router + TypeScript
- OpenRouter Chat Completions
- Browser Speech Recognition + Speech Synthesis
