# DEREK — AI Game Testing Interviewer

Voice interview simulator with **Derek Holloway**, a strict (and deeply self-centered) Senior QA Lead at Probe Labs.

## Features

- Password-gated site access (`SITE_PASSWORD`)
- Speech-to-text + text-to-speech (Chrome / Edge)
- Typed fallback
- Personality arc: strict → family spill → enamored if you act like a therapist
- Restart + Lock controls
- OpenRouter LLM via server env (`OPENROUTER_API_KEY`)

## Local run

```bash
npm install
cp .env.example .env.local
# set OPENROUTER_API_KEY and SITE_PASSWORD
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you’ll hit `/login` when `SITE_PASSWORD` is set.

## Deploy on Vercel

1. Import `gvsh-png/AiInterviewer` (or connect this repo) in [Vercel](https://vercel.com/new)
2. Add environment variables:
   - `OPENROUTER_API_KEY` — your OpenRouter key
   - `SITE_PASSWORD` — the password people need to enter the site
   - optional: `OPENROUTER_MODEL` (default `openai/gpt-4o-mini`)
3. Deploy

Or from the CLI (after `npx vercel login`):

```bash
npx vercel --prod
```

Then set the env vars in the Vercel project settings and redeploy.

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
- Cookie auth gate for private access
