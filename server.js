// server.js
// This is the backend "brain" of our FIFA Fan Assistant.
// It receives a question from the fan-facing webpage and asks Google's Gemini AI for a helpful answer.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = 3000;

// Allow our frontend page to talk to this server
app.use(cors());
// Allow the server to understand JSON sent from the frontend
app.use(express.json());
// Serve our frontend files (HTML/CSS/JS) from a folder called "public"
app.use(express.static('public'));

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

// Every 10 seconds, nudge crowd levels up/down a little to simulate real activity
setInterval(() => {
  for (const gate in gates) {
    const change = Math.floor(Math.random() * 21) - 10; // -10 to +10
    gates[gate] = Math.max(0, Math.min(100, gates[gate] + change));
  }
}, 10000);

function getCrowdSummary() {
  return Object.entries(gates)
    .map(([name, level]) => `${name}: ${level}% capacity`)
    .join(', ');
}

// This is the main endpoint: the frontend sends a question here, we send back an AI answer
app.post('/api/ask', async (req, res) => {
  try {
    const { question, language, role, topic } = req.body;

    if (!question || question.trim() === '') {
      return res.status(400).json({ error: 'Please type a question.' });
    }

    // Create the AI model instance
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    // Get the current (simulated) live crowd data
    const crowdSummary = getCrowdSummary();

    // --- Logical decision making based on user context ---
    // Depending on who is asking and what topic they picked, we add
    // extra instructions to the AI so the answer actually fits their situation.
    let extraGuidance = '';

    if (role === 'Person with a disability or mobility need') {
      extraGuidance += ' Prioritize step-free routes, elevators, ramps, and accessible seating/entrances in your answer. Be extra specific about distances and physical layout.';
    }
    if (role === 'Volunteer') {
      extraGuidance += ' Answer as if briefing a volunteer who needs to relay this information to fans — be precise and use short, actionable phrasing.';
    }
    if (role === 'Venue Staff') {
      extraGuidance += ' Answer as if briefing operational staff — include any relevant protocol, safety, or coordination details.';
    }

    if (topic === 'Crowd/Safety') {
      extraGuidance += ' Treat this as potentially urgent — prioritize clear, calm, immediate safety guidance first.';
    }
    if (topic === 'Sustainability') {
      extraGuidance += ' Highlight eco-friendly options (recycling points, public transport, reusable items) where relevant.';
    }
    if (topic === 'Transportation') {
      extraGuidance += ' Focus on shuttle, metro, rideshare, and parking guidance.';
    }

    const prompt = `You are a helpful FIFA World Cup 2026 stadium assistant.
The person asking is a: ${role}.
Their question topic category is: ${topic}.
Respond in this language: ${language}.
Current live gate crowd levels: ${crowdSummary}.
When relevant (navigation, crowd/safety, or accessibility questions), use this live data to recommend the least crowded suitable gate or route, and mention the current crowd level.
${extraGuidance}
Keep answers short, clear, and practical (max ~4 sentences unless the question needs a list).

Their question: ${question}`;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    res.json({ answer });
  } catch (error) {
    console.error('Error talking to Gemini:', error.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ FIFA Fan Assistant server running at http://localhost:${PORT}`);
});