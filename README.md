# IELTS Speaking Practice App (Text-only MVP)

This is a starting scaffold: it proves the full flow works (question -> student answer
-> AI examiner score + teacher feedback + sample answer -> retry/next) using typed
answers. Voice recording and transcription come in a later step, once this core flow
is working and the AI prompt is well-tuned.

## Project structure

```
ielts-speaking-app/
  backend/     Express server that serves questions and calls the Claude API
  frontend/    React app (Vite) - the student-facing practice interface
```

## How to run it locally

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and paste your real Anthropic API key
npm start
```

This starts the backend on http://localhost:3001

### 2. Frontend (in a separate terminal)

```bash
cd frontend
npm install
npm run dev
```

This starts the frontend on http://localhost:5173 (Vite will tell you the exact URL).
Open that in your browser.

## What to test first

1. Does a question show up?
2. Type a short, weak answer on purpose (a few words, off-topic) - does the AI
   correctly give a low score and explain why, instead of crashing or scoring too high?
3. Type a strong answer (you have IELTS 8.0 - write one yourself) - does the score
   feel right compared to your own judgment?
4. Does the sample answer actually build on YOUR ideas, or does it seem to ignore
   what you wrote and invent something else? If the latter, we need to adjust the
   prompt in `backend/server.js` (the SYSTEM_PROMPT constant).
5. Does "Try this question again" and "Next question" both work correctly?

## Getting an Anthropic API key

Go to https://console.anthropic.com/, create an account, and generate an API key
under Settings. You'll need to add a small amount of credit to your account to make
API calls (a few dollars is enough for extensive testing at this stage).

## What's intentionally NOT built yet

- Voice recording / speech-to-text (Whisper API) - next step once this works
- User accounts / saving history - not needed to test the core AI flow
- Styling polish - functional but plain for now, easy to improve later
- Deployment - this scaffold is for running on your own computer first
