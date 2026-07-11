// server.test.js
// Basic automated tests for our FIFA Fan Assistant backend.
// These verify the API behaves correctly without needing a real browser or making
// real (rate-limited, costly) calls to the Gemini API.

// Mock the Gemini SDK so tests are fast, free, and don't depend on external service availability.
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: { text: () => 'This is a mocked AI response for testing purposes.' },
        }),
      }),
    })),
  };
});

const request = require('supertest');
const app = require('./server');

describe('FIFA Fan Assistant API', () => {

  // Test: Rejects overly long questions (protects against abuse/oversized payloads)
  test('POST /api/ask returns 400 when question exceeds 500 characters', async () => {
    const longQuestion = 'a'.repeat(501);
    const response = await request(app)
      .post('/api/ask')
      .send({ question: longQuestion, language: 'English', role: 'Fan', topic: 'General' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  // Test: Falls back to safe defaults when unexpected role/topic/language values are sent
  test('POST /api/ask falls back to safe defaults for unrecognized role/topic/language', async () => {
    const response = await request(app)
      .post('/api/ask')
      .send({
        question: 'Where can I get water?',
        language: 'Klingon',
        role: 'Hacker',
        topic: 'Nonsense'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('answer');
  });

  // Test 1: Rejects empty questions (input validation)
  test('POST /api/ask returns 400 when question is missing', async () => {
    const response = await request(app)
      .post('/api/ask')
      .send({ language: 'English', role: 'Fan', topic: 'General' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  // Test 2: Rejects blank/whitespace-only questions
  test('POST /api/ask returns 400 when question is empty string', async () => {
    const response = await request(app)
      .post('/api/ask')
      .send({ question: '   ', language: 'English', role: 'Fan', topic: 'General' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  // Test 3: The homepage loads successfully
  test('GET / serves the frontend homepage', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
  });

  // Test 4: A valid request returns a well-formed answer (using the mocked AI response)
  test('POST /api/ask returns an answer for a valid question', async () => {
    const response = await request(app)
      .post('/api/ask')
      .send({
        question: 'Where is the nearest gate?',
        language: 'English',
        role: 'Fan',
        topic: 'Navigation'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('answer');
    expect(typeof response.body.answer).toBe('string');
    expect(response.body.answer.length).toBeGreaterThan(0);
  });

});