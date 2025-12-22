import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/database';
import { llmService } from '../services/llm';

const router = Router();

const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(5000, 'Message is too long'),
  sessionId: z.string().optional(),
});

router.post('/message', async (req: Request, res: Response) => {
  try {
    const validationResult = chatMessageSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: validationResult.error.errors[0].message,
      });
    }

    const { message, sessionId } = validationResult.data;

    let conversationId: number;

    if (sessionId) {
      conversationId = parseInt(sessionId, 10);

      if (isNaN(conversationId)) {
        return res.status(400).json({ error: 'Invalid session ID' });
      }

      const exists = await db.conversationExists(conversationId);
      if (!exists) {
        return res.status(404).json({ error: 'Session not found' });
      }
    } else {
      conversationId = await db.createConversation();
    }

    await db.createMessage(conversationId, 'user', message);

    const history = await db.getConversationMessages(conversationId);

    let aiReply: string;
    try {
      aiReply = await llmService.generateReply(history, message);
    } catch (error: any) {
      return res.status(503).json({
        error: error.message || 'AI service temporarily unavailable',
      });
    }

    await db.createMessage(conversationId, 'ai', aiReply);

    res.json({
      reply: aiReply,
      sessionId: conversationId.toString(),
    });
  } catch (error: any) {
    console.error('Error handling chat message:', error);
    res.status(500).json({
      error: 'An unexpected error occurred. Please try again.',
    });
  }
});

router.get('/history/:sessionId', async (req: Request, res: Response) => {
  try {
    const sessionId = parseInt(req.params.sessionId, 10);

    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    const exists = await db.conversationExists(sessionId);
    if (!exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const messages = await db.getConversationMessages(sessionId);

    res.json({ messages });
  } catch (error: any) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({
      error: 'An unexpected error occurred. Please try again.',
    });
  }
});

export default router;
