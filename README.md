# AI Support Chat Agent

A simple live chat widget powered by AI for handling customer support questions. Built as a learning project to practice full-stack development with real LLM integration.

## Running Locally

### What You Need

- Node.js (v18 or newer)
- A text editor
- 5 minutes

### Steps

1. **Install dependencies**

Open two terminals. In the first one:

```bash
cd backend
npm install
```

In the second:

```bash
cd frontend
npm install
```

2. **Set up environment variables**

In the `backend` folder, copy `.env.example` to `.env`:

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your API key (see Configuration section below).

3. **Run it**

Terminal 1 (backend):

```bash
cd backend
npm run dev
```

Terminal 2 (frontend):

```bash
cd frontend
npm run dev
```

4. **Open it**

Go to `http://localhost:5173` in your browser. You should see the chat widget.

## Database Setup

The project uses SQLite, which requires zero setup. The database file (`database.sqlite`) is created automatically when you first run the backend. The schema gets initialized on startup.

If you're curious, the schema creates two tables:

- `conversations` - stores chat sessions
- `messages` - stores individual messages (linked to conversations)

That's it. No migrations to run, no database server to install.

## Configuration (Environment Variables)

The backend needs a `.env` file with these settings:

```env
PORT=3000
DB_TYPE=sqlite
DB_PATH=./database.sqlite

# Choose one LLM provider and uncomment its key:
# OPENAI_API_KEY=sk-...
# GEMINI_API_KEY=AIza...
# HUGGINGFACE_API_KEY=hf_...

# Set which provider to use
LLM_PROVIDER=openai
LLM_MODEL=gpt-3.5-turbo
MAX_TOKENS=500

# For testing without burning API credits:
USE_MOCK_AI=true
```

### Getting API Keys

**OpenAI (Recommended):**

1. Sign up at https://platform.openai.com
2. Go to API keys section
3. Create a new key
4. Use model: `gpt-3.5-turbo` (cheapest option)

**Gemini (Free alternative):**

1. Go to https://makersuite.google.com/app/apikey
2. Get your API key
3. Use model: `gemini-1.5-flash`

**Hugging Face (Free):**

1. Sign up at https://huggingface.co
2. Go to Settings → Access Tokens
3. Create a token
4. Use model: `microsoft/DialoGPT-medium`

**No API key? No problem.**
Set `USE_MOCK_AI=true` in your `.env` file. The bot will use hardcoded responses for common questions about shipping, returns, etc. Good enough for testing the UI.

## Architecture

### Backend Structure

```
backend/src/
├── index.ts              # Server entry point, loads env vars
├── routes/
│   └── chat.ts          # API endpoints (/chat/message, /chat/history)
├── services/
│   └── llm.ts           # LLM integration (OpenAI, Gemini, Hugging Face)
└── db/
    └── database.ts      # Database wrapper (SQLite)
```

**Design choices:**

- **Three-layer separation**: Routes handle HTTP, services handle business logic, database layer handles persistence. Keeps things organized without over-engineering.

- **Lazy-loaded LLM clients**: The OpenAI/Gemini clients aren't instantiated until needed. Means you can switch providers via environment variables without code changes.

- **Mock mode**: Setting `USE_MOCK_AI=true` bypasses real API calls. Useful for testing without spending money or hitting rate limits.

- **SQLite over PostgreSQL**: The assignment suggested PostgreSQL, but SQLite is simpler for a learning project. No separate database server, works everywhere, and the schema is identical to what you'd use in Postgres.

- **Zod validation**: Input validation happens at the API boundary. Catches empty messages, oversized input, malformed session IDs before they hit the database or LLM.

### Frontend Structure

```
frontend/src/
├── main.js
├── App.svelte
└── components/
    └── Chat.svelte       # The entire chat UI
```

Single component design. Everything lives in `Chat.svelte` - message list, input box, API calls, state management. It's only 400 lines and does everything the assignment asked for. No need to split it up further.

## LLM Integration

### Provider Used

The app supports three providers: OpenAI, Google Gemini, and Hugging Face. Switch between them using the `LLM_PROVIDER` env variable.

I'd recommend OpenAI's `gpt-3.5-turbo` for actual use - it's cheap, fast, and gives good results. Gemini is free but has some quirks with message formatting. Hugging Face is hit-or-miss depending on which model you pick.

### Prompting Strategy

The system prompt injects FAQ knowledge about a fictional e-commerce store:

```
You are a helpful customer support agent for an online store.

Store Information:
- Shipping: Free over $50, otherwise $8. Takes 5-7 business days (standard) or 2-3 days (express, $15)
- Returns: 30 days for unused items, 5-10 days to process refunds
- Support Hours: Monday-Friday, 9 AM - 6 PM EST
- Contact: support@example.com or 1-800-123-4567

Answer clearly and concisely. If you don't know something, say so.
```

For each user message, I include the last few conversation turns as context so the AI can reference earlier messages. This makes follow-up questions work ("What about express shipping?").

### Error Handling

The LLM service catches:

- Invalid API keys → user-friendly message
- Rate limits → suggests trying again later
- Timeouts → network error message
- Model errors → falls back gracefully

All errors surface in the UI instead of crashing the backend.

### Trade-offs

**Token limits**: Right now it's capped at 500 tokens. Keeps costs low but means longer responses get cut off. A better approach would be to count tokens dynamically and trim old messages from the history once it gets too long.

**Context window**: Only the current conversation is sent. The AI doesn't know about previous sessions from the same user. For a real support bot, you'd probably want to summarize past issues and include that.

**Streaming**: Responses come back all at once instead of streaming word-by-word. Streaming would make it feel more responsive but adds complexity.

## If I Had More Time...

**Things I'd improve:**

1. **Better prompt engineering** - The current FAQ injection is pretty basic. Could make it more structured, add examples of good responses, tune the temperature.

2. **Streaming responses** - Show the AI's reply as it's generated instead of waiting for the whole thing.

3. **Rate limiting** - Right now anyone can spam the API. Should add rate limits per session or IP.

4. **Conversation summarization** - After 10+ messages, summarize older parts of the conversation to save tokens.

5. **Better error UX** - When the LLM fails, could show a "Contact human support" button or fallback to canned responses.

6. **Tests** - Zero tests right now. Would add integration tests for the API endpoints and unit tests for the LLM service.

7. **Redis caching** - Cache common questions ("What's your return policy?") to avoid hitting the LLM API for every repeat question.

8. **Analytics** - Track what users ask about to identify gaps in the FAQ knowledge.

9. **Conversation cleanup** - Old sessions pile up in the database. Should add a cleanup job to delete conversations older than 30 days.

10. **Deploy somewhere** - Currently runs on localhost. Would be nice to throw it on Railway or Vercel so people can try it without running it locally.

**Things I intentionally didn't do:**

- User authentication - Not needed for a simple demo
- Redis - Adds infrastructure complexity without much benefit at this scale
- WebSockets - HTTP polling works fine for a single-user chat widget
- Fancy UI framework - Vanilla Svelte is perfectly capable
- Microservices - It's a 500-line backend, no need to split it up

## Project Structure

```
chatbot/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── database.ts
│   │   ├── routes/
│   │   │   └── chat.ts
│   │   ├── services/
│   │   │   └── llm.ts
│   │   └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── .gitignore
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Chat.svelte
│   │   ├── App.svelte
│   │   └── main.js
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## API Reference

### POST /chat/message

Send a message, get a reply.

**Request:**

```json
{
  "message": "What's your return policy?",
  "sessionId": "42" // optional, creates new session if omitted
}
```

**Response:**

```json
{
  "reply": "We accept returns within 30 days...",
  "sessionId": "42"
}
```

**Errors:**

- `400` - Empty message or invalid input
- `404` - Session doesn't exist
- `503` - LLM API unavailable

### GET /chat/history/:sessionId

Get all messages in a conversation.

**Response:**

```json
{
  "messages": [
    {
      "id": 1,
      "conversation_id": 42,
      "sender": "user",
      "text": "What's your return policy?",
      "created_at": "2024-01-15T10:30:00Z"
    },
    {
      "id": 2,
      "conversation_id": 42,
      "sender": "ai",
      "text": "We accept returns within 30 days...",
      "created_at": "2024-01-15T10:30:05Z"
    }
  ]
}
```

## Troubleshooting

**Backend won't start:**

- Check that port 3000 isn't already in use (`netstat -ano | findstr :3000`)
- Make sure `.env` file exists in the backend folder
- Verify you have an API key set (or `USE_MOCK_AI=true`)

**Frontend can't connect:**

- Make sure backend is running (you should see "Server running on port 3000")
- Try `http://localhost:5173` not `127.0.0.1:5173`
- Check browser console for CORS errors

**LLM errors:**

- Double-check your API key is valid
- Try setting `USE_MOCK_AI=true` to bypass the LLM entirely
- Check you haven't exceeded your provider's rate limits

**Database locked:**

- Close both servers before zipping/moving the project
- SQLite doesn't like being accessed from multiple processes simultaneously

## Tech Stack

- **Backend:** Node.js, TypeScript, Express, SQLite, Zod
- **Frontend:** Svelte, Vite
- **LLM APIs:** OpenAI, Google Gemini, Hugging Face
