# FIFA World Cup 2026 – Fan Assistant 🏟️

A GenAI-powered stadium assistant that helps fans, volunteers, and venue staff with navigation, accessibility, transportation, and crowd/safety guidance during the FIFA World Cup 2026.

## What it does

- **Context-aware answers**: The assistant adapts its response based on *who* is asking (fan, volunteer, staff, or a person with a disability/mobility need) and *what topic* they need help with (navigation, accessibility, transportation, crowd/safety, sustainability).
- **Real-time decision support**: A simulated live crowd-monitoring system tracks capacity at 4 stadium gates. When a fan asks about navigation, crowd, or accessibility, the AI actively reasons over this live data to recommend the least congested, most suitable gate.
- **Multilingual support**: Fans can select their preferred response language (English, Spanish, French, Portuguese, Arabic, Hindi).

## Tech stack

- **Frontend**: Plain HTML/CSS/JavaScript (no framework — kept lightweight and dependency-free)
- **Backend**: Node.js + Express
- **AI**: Google Gemini API (`gemini-flash-latest`)

## How it works

1. The fan selects their role, topic, and language, then types a question.
2. The backend (`server.js`) builds a context-rich prompt — including the fan's role, topic, and current (simulated) live gate crowd levels — and sends it to Gemini.
3. Gemini reasons over this context and returns a tailored, practical answer.

## Running it locally

1. Install dependencies:
2. Create a `.env` file in the project root with your own free Gemini API key:
(Get a free key at https://aistudio.google.com/apikey)
3. Start the server:
4. Open your browser to `http://localhost:3000`

## Design notes

- Live crowd data is simulated in-memory (`gates` object in `server.js`) to demonstrate the real-time decision-making concept without requiring real stadium IoT hardware — this can be swapped for a real sensor/API feed with no change to the AI logic.
- No user data is stored or logged; each question is stateless and processed per-request.
- `.env` (containing the API key) is excluded from version control via `.gitignore`.

## Efficiency

- Identical questions (same text, role, topic, and language) are served from an in-memory cache for 60 seconds instead of re-calling the AI, reducing latency and API cost for repeated or accidental duplicate requests.
- The frontend has no build step or external framework — plain HTML/CSS/JS keeps load times minimal.

## Accessibility

- All form controls (role, topic, language, question input, send button) have proper `<label>` associations and `aria-label` attributes for screen readers.
- The chat window uses `aria-live="polite"` and `role="log"` so new AI responses are automatically announced to screen reader users.
- Visible focus outlines are provided for all interactive elements to support keyboard-only navigation.
- Color contrast between text and backgrounds follows WCAG AA-friendly ratios.

## Testing

- Automated tests (`server.test.js`, run via `npm test`) cover input validation (missing/empty questions), the homepage route, and a full end-to-end AI response.
- Run tests with:
```
  npm test
```
## Future improvements

- Real IoT/turnstile data integration
- Persistent chat history per user session
- Voice input for accessibility
- Integration with live match schedules and transit APIs