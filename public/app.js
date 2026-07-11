// app.js
// This runs in the fan's browser. It handles the chat form and talks to our server.js backend.

const form = document.getElementById('chat-form');
const input = document.getElementById('question');
const chatWindow = document.getElementById('chat-window');
const languageSelect = document.getElementById('language');
const roleSelect = document.getElementById('role');
const topicSelect = document.getElementById('topic');
const sendBtn = document.getElementById('send-btn');

// Adds a new chat bubble to the screen
function addMessage(text, sender) {
  const bubble = document.createElement('div');
  bubble.className = `msg ${sender}`;
  bubble.textContent = text;
  chatWindow.appendChild(bubble);
  chatWindow.scrollTop = chatWindow.scrollHeight; // auto-scroll to newest message
}

form.addEventListener('submit', async (event) => {
  event.preventDefault(); // stop the page from refreshing

  const question = input.value.trim();
  if (!question) return;

  const language = languageSelect.value;
  const role = roleSelect.value;
  const topic = topicSelect.value;

  // Show the fan's own question in the chat
  addMessage(question, 'user');
  input.value = '';
  sendBtn.disabled = true;
  sendBtn.textContent = '...';

  try {
    // Send the question to our backend server (server.js)
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
        question,
        language,
        role,
        topic
      })
    });

    const data = await response.json();

    if (response.ok) {
      addMessage(data.answer, 'bot');
    } else {
      addMessage(data.error || 'Something went wrong.', 'bot');
    }
  } catch (error) {
    addMessage('Could not reach the server. Please check your connection.', 'bot');
  } finally {
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';
  }
});