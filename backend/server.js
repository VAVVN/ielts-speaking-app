// server.js
// A small Express server with two jobs:
// 1. Serve the question bank to the frontend
// 2. Take a student's typed answer, send it to Claude with our examiner/teacher
//    prompt, and return the structured JSON result
//
// Run this with: npm install, then npm start
// You must set ANTHROPIC_API_KEY in a .env file (see .env.example)

require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const questions = require('./questions.json');
const part3ToPart2 = require('./topicMap.js');

const app = express();
app.use(cors());
app.use(express.json());

// Serve the built React app (frontend/dist, produced by `npm run build` in
// frontend/) so the backend and frontend are one deployable service.
app.use(express.static(path.join(__dirname, '../frontend/dist')));

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Groups the flat questions.json list into topics for the topic-selection
// screen. Part 3 discussion themes are combined with their matching Part 2
// cue card(s) via topicMap.js. Part 1 topics stand alone (real IELTS Part 1
// isn't tied to the Part 2/3 topic). Part 2 cue cards with no Part 3 match,
// and Part 3 themes with no Part 2 match, are both left out of the topic list.
function buildTopics() {
  const part1Qs = questions.filter((q) => q.part === 1);
  const part2Qs = questions.filter((q) => q.part === 2);
  const part3Qs = questions.filter((q) => q.part === 3);

  const topics = [];

  const part1Topics = [...new Set(part1Qs.map((q) => q.topic))];
  for (const topic of part1Topics) {
    topics.push({
      id: slugify(`p1-${topic}`),
      topic,
      part1: part1Qs.filter((q) => q.topic === topic),
      part2: [],
      part3: [],
    });
  }

  // Driven by the Part 3 topics actually present in questions.json (not just
  // topicMap's keys) so a newly added Part 3 topic still shows up once it has
  // a Part 2 pairing curated in topicMap.js. Part 3 topics with no matching
  // Part 2 cue card are skipped - they'd otherwise be a Part-3-only topic
  // with no cue card to lead into it.
  const part3Topics = [...new Set(part3Qs.map((q) => q.topic))];
  for (const part3Topic of part3Topics) {
    const part2Topics = part3ToPart2[part3Topic] || [];
    const matchedPart2Qs = part2Qs.filter((q) => part2Topics.includes(q.topic));
    if (matchedPart2Qs.length === 0) continue;

    topics.push({
      id: slugify(`p23-${part3Topic}`),
      topic: part3Topic,
      part1: [],
      part2: matchedPart2Qs,
      part3: part3Qs.filter((q) => q.topic === part3Topic),
    });
  }

  return topics;
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// This is the same prompt we designed earlier — the AI's "instructions"
// for how to behave as both examiner and teacher.
const SYSTEM_PROMPT = `You are an IELTS Speaking teacher. After reading a student's answer to an IELTS speaking question, act as a supportive teacher:
- Write a SAMPLE ANSWER that:
  - Uses the STUDENT'S OWN IDEAS AND CONTENT from their answer (do not invent a completely different answer)
  - Upgrades the language: better vocabulary, more natural linking, correct grammar, appropriate length for the question part
  - Is written at a Band 7.5-8 level, as a realistic "what a strong answer sounds like" model - not an unrealistic Band 9 with vocabulary a real candidate would never use
  - Matches the length a real candidate would actually speak for that part:
    - Part 1 (short, direct question): EXACTLY 3 to 5 sentences - no more, no less
    - Part 2 (2-minute long-turn cue card): roughly 120 words, covering all the bullet points in the cue card
    - Part 3 (extended discussion question): EXACTLY 4 to 6 sentences with reasoning and an example - no more, no less

OUTPUT FORMAT:
Respond ONLY with valid JSON, no markdown fences, no preamble, in exactly this shape:

{
  "sample_answer": "<the improved sample answer using the student's own ideas>"
}

If the student's answer is extremely short, off-topic, or empty, still return valid JSON: still provide a sample_answer showing what a fuller answer could look like for that question.`;

// Raw speech-to-text transcripts have no punctuation/capitalization and
// occasionally mis-hear a word. This prompt cleans that up WITHOUT changing
// what the student actually said - the cleaned text is still what gets
// scored/used later, so it must stay a faithful transcript, not a rewrite.
const PUNCTUATE_SYSTEM_PROMPT = `You clean up raw speech-to-text transcripts of a student's spoken answer to an IELTS speaking question.

The transcript has no punctuation or capitalization, and the speech recognizer may have mis-heard or dropped the occasional word.

Given the question being answered and the raw transcript, produce a cleaned-up version:
- Add correct punctuation, capitalization, and paragraph breaks where natural pauses would be.
- If a word or short phrase is obviously mis-transcribed or garbled given the context of the question, correct it to the most likely intended word(s).
- Do NOT rephrase, fix grammar mistakes, improve word choice, or otherwise change the student's actual wording - this must remain an authentic transcript of what they said, since it will be used to assess their English.
- Do NOT add ideas or content the student didn't say. Do NOT remove hesitations or filler words (um, uh) if present.
- If the transcript is empty or just noise, return it unchanged.

Respond with ONLY the cleaned-up transcript text - no preamble, no quotes, no commentary.`;

// POST /api/punctuate
// body: { questionId: string, text: string }
app.post('/api/punctuate', async (req, res) => {
  try {
    const { questionId, text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    const question = questions.find((q) => q.id === questionId);
    const userMessage = `Question: "${question ? question.prompt : '(unknown)'}"\n\nRaw transcript:\n"${text}"`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      system: PUNCTUATE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const cleanedText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('')
      .trim();

    res.json({ text: cleanedText });
  } catch (err) {
    console.error('Error in /api/punctuate:', err);
    res.status(500).json({ error: 'Something went wrong cleaning up the transcript.' });
  }
});

// GET /api/questions -> list of all questions (id, part, topic, prompt)
app.get('/api/questions', (req, res) => {
  res.json(questions);
});

// GET /api/topics -> topics to choose from, each with its part1/part2/part3 questions
app.get('/api/topics', (req, res) => {
  res.json(buildTopics());
});

// POST /api/evaluate
// body: { questionId: string, answerText: string, previousAttempt?: string }
app.post('/api/evaluate', async (req, res) => {
  try {
    const { questionId, answerText, previousAttempt } = req.body;

    if (!answerText || !answerText.trim()) {
      return res.status(400).json({ error: 'answerText is required' });
    }

    const question = questions.find((q) => q.id === questionId);
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }

    let userMessage = `Part: ${question.part}\nQuestion: "${question.prompt}"\n\nStudent's answer (transcribed):\n"${answerText}"`;

    if (previousAttempt) {
      userMessage += `\n\nPrevious attempt at this same question:\n"${previousAttempt}"`;
    } else {
      userMessage += `\n\nPrevious attempts this session: none`;
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5', // update to whichever current model you want to use
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    // The model's reply text should be pure JSON, per our prompt instructions.
    const rawText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      // If the model ever wraps the JSON in markdown fences despite instructions,
      // strip them and try again before giving up.
      const cleaned = rawText.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    res.json(parsed);
  } catch (err) {
    console.error('Error in /api/evaluate:', err);
    res.status(500).json({ error: 'Something went wrong evaluating the answer.' });
  }
});

// POST /api/tts -> body: { text: string }, streams back MP3 audio of that
// text spoken aloud, using Microsoft Edge's free "Read Aloud" voices.
app.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    const tts = new MsEdgeTTS();
    await tts.setMetadata('en-US-AriaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);

    res.setHeader('Content-Type', 'audio/mpeg');
    audioStream.on('error', (err) => {
      console.error('Error streaming TTS audio:', err);
      res.destroy();
    });
    audioStream.pipe(res);
  } catch (err) {
    console.error('Error in /api/tts:', err);
    res.status(500).json({ error: 'Something went wrong generating audio.' });
  }
});

// Any GET that isn't an API route or a static file falls through to the
// React app's index.html, so direct navigation/refresh works.
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`IELTS speaking backend running on http://localhost:${PORT}`);
});
