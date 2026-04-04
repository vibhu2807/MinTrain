# MinTrain

A private, mobile-first household fitness and meal coach.

Built by **Mintellion**.

## What it does

- Anyone can sign up with a username and password
- Each person gets a personal AI-generated plan based on their body, goal, and schedule
- Full-day meal suggestions with protein targets (breakfast, lunch, pre/post workout, dinner)
- 3 shared dinner options every night — pick one, the house follows
- Daily gym exercises with GIF demos, weights, reps, and form tips
- AI chat for quick questions about food, workout, or plan changes
- Plans change automatically every day at midnight
- Works as an iPhone app (PWA — add to home screen)

## How to use

1. Open the app and create an account
2. Complete the onboarding (takes 2 minutes)
3. AI builds your personal plan
4. Follow your meals and workout for the day
5. Plan refreshes at midnight with new food and exercises

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment

Copy `.env.example` to `.env.local` and set your values:

```
MINTRAIN_SESSION_SECRET=your-secret-here
OPENAI_API_KEY=sk-your-key-here
```

## Tech stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 4
- OpenAI GPT-4o-mini
- File-based persistence
- PWA with service worker
- 26 exercise GIF demos

## Deploy to Vercel

1. Push to GitHub
2. Connect repo in Vercel
3. Add `OPENAI_API_KEY` and `MINTRAIN_SESSION_SECRET` in environment variables
4. Deploy

---

Made by **Mintellion**
