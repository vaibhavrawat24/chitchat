import dotenv from 'dotenv';
dotenv.config();

console.log('Environment variables loaded:');
console.log('LLM_PROVIDER:', process.env.LLM_PROVIDER);
console.log('LLM_MODEL:', process.env.LLM_MODEL);
console.log('USE_MOCK_AI:', process.env.USE_MOCK_AI);

import express from 'express';
import cors from 'cors';
import chatRouter from './routes/chat';
import { db } from './db/database';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/chat', chatRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

async function startServer() {
  try {
    await db.initialize();
    console.log('Database initialized successfully');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
