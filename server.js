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

// This is the main endpoint: the frontend sends a question here, we send back an AI answer
app.post('/api/ask', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || question.trim() === '') {
      return res.status(400).json({ error: 'Please type a question.' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    // This "system context" tells the AI to act as a stadium assistant
    const prompt = `You are a helpful, friendly FIFA World Cup 2026 stadium assistant.
You help fans with: finding their way around the stadium, accessibility needs,
transportation options, multilingual help, and general event information.
Keep answers short, clear, and practical.

Fan's question: ${question}`;

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