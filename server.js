// server.js
// This is the backend "brain" of our FIFA Fan Assistant.
// It receives a question from the fan-facing webpage and asks Google's Gemini AI for a helpful answer.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = 3000;

// Security headers + CORS
app.use(helmet());
app.use(cors());
// Allow the server to understand JSON sent from the frontend
app.use(express.json());
// Serve our frontend files (HTML/CSS/JS) from a folder called "public"
app.use(express.static('public'));

// Rate limiting: max 30 requests per minute per IP address, to prevent abuse
// and protect against runaway AI API costs.
const askLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Please wait a moment and try again.' },
});

// Connect to Google's Gemini AI using the secret key from .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Simulated live crowd data ---
// In a real deployment, this would come from turnstile sensors, CCTV analytics,
// or a stadium IoT system. For this hackathon, we simulate realistic live data
// that changes slightly over time, so the assistant can reason about it.
const gates = {
  'Gate A (North)': 30,
  'Gate B (East)': 45,
  'Gate C (South)': 80,
  'Gate D (West, Accessible)': 20,
};

// Every 10 seconds, nudge crowd levels up/down a little to simulate real activity.
// Only run this when the server actually starts (not during automated tests).
let crowdInterval;
if (require.main === module) {
  crowdInterval = setInterval(() => {
    for (const gate in gates) {
      const change = Math.floor(Math.random() * 21) - 10; // -10 to +10
      gates[gate] = Math.max(0, Math.min(100, gates[gate] + change));
    }
  }, 10000);
}

function getCrowdSummary() {
  return Object.entries(gates)
    .map(([name, level]) => `${name}: ${level}% capacity`)
    .join(', ');
}

// --- Simple in-memory cache ---
// Avoids calling the AI again for identical recent questions, saving time and API cost.
// Cache entries expire after 60 seconds since crowd data changes over time.
const responseCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

function getCacheKey(question, language, role, topic) {
  return `${question.trim().toLowerCase()}|${language}|${role}|${topic}`;
}

// Allow-lists: only known, expected values are trusted from client input.
// This defends against unexpected or malicious values being injected into the AI prompt.
const ALLOWED_ROLES = ['Fan', 'Volunteer', 'Venue Staff', 'Person with a disability or mobility need'];
const ALLOWED_TOPICS = ['General', 'Navigation', 'Accessibility', 'Transportation', 'Crowd/Safety', 'Sustainability'];
const ALLOWED_LANGUAGES = ['English', 'Spanish', 'French', 'Portuguese', 'Arabic', 'Hindi'];

// This is the main endpoint: the frontend sends a question here, we send back an AI answer
app.post('/api/ask', askLimiter, async (req, res) => {
  try {
    const { question, language, role, topic } = req.body;

    if (!question || typeof question !== 'string' || question.trim() === '') {
      return res.status(400).json({ error: 'Please type a question.' });
    }

    if (question.length > 500) {
      return res.status(400).json({ error: 'Question is too long. Please limit it to 500 characters.' });
    }

    // Fall back to safe defaults if the client sends anything unexpected
    const safeRole = ALLOWED_ROLES.includes(role) ? role : 'Fan';
    const safeTopic = ALLOWED_TOPICS.includes(topic) ? topic : 'General';
    const safeLanguage = ALLOWED_LANGUAGES.includes(language) ? language : 'English';

    // --- Efficiency: check cache before calling the AI ---
    const cacheKey = getCacheKey(question, safeLanguage, safeRole, safeTopic);
    const cached = responseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      return res.json({ answer: cached.answer, cached: true });
    }

    // Create the AI model instance
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    // Get the current (simulated) live crowd data
    const crowdSummary = getCrowdSummary();

    // --- Logical decision making based on user context ---
    // Depending on who is asking and what topic they picked, we add
    // extra instructions to the AI so the answer actually fits their situation.
    let extraGuidance = '';

    if (safeRole === 'Person with a disability or mobility need') {
      extraGuidance += ' Prioritize step-free routes, elevators, ramps, and accessible seating/entrances in your answer. Be extra specific about distances and physical layout.';
    }
    if (safeRole === 'Volunteer') {
      extraGuidance += ' Answer as if briefing a volunteer who needs to relay this information to fans — be precise and use short, actionable phrasing.';
    }
    if (safeRole === 'Venue Staff') {
      extraGuidance += ' Answer as if briefing operational staff — include any relevant protocol, safety, or coordination details.';
    }

    if (safeTopic === 'Crowd/Safety') {
      extraGuidance += ' Treat this as potentially urgent — prioritize clear, calm, immediate safety guidance first.';
    }
    if (safeTopic === 'Sustainability') {
      extraGuidance += ' Highlight eco-friendly options (recycling points, public transport, reusable items) where relevant.';
    }
    if (safeTopic === 'Transportation') {
      extraGuidance += ' Focus on shuttle, metro, rideshare, and parking guidance.';
    }

    const prompt = `You are a helpful FIFA World Cup 2026 stadium assistant.
The person asking is a: ${safeRole}.
Their question topic category is: ${safeTopic}.
Respond in this language: ${safeLanguage}.
Current live gate crowd levels: ${crowdSummary}.
When relevant (navigation, crowd/safety, or accessibility questions), use this live data to recommend the least crowded suitable gate or route, and mention the current crowd level.
${extraGuidance}
Keep answers short, clear, and practical (max ~4 sentences unless the question needs a list).

Their question: ${question}`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    // Store this answer in the cache for future identical questions
    responseCache.set(cacheKey, { answer, timestamp: Date.now() });

    res.json({ answer, cached: false });
  } catch (error) {
    console.error('Error talking to Gemini:', error.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// Only start the server if this file is run directly (not when imported by tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ FIFA Fan Assistant server running at http://localhost:${PORT}`);
  });
}

module.exports = app;