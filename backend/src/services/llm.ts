import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import type { Message } from '../db/database';

const STORE_FAQ = `
Store Information:
- Shipping Policy: We offer free shipping on orders over $50. Standard shipping takes 5-7 business days. Express shipping (2-3 days) is available for $15.
- Return/Refund Policy: We accept returns within 30 days of purchase. Items must be unused and in original packaging. Refunds are processed within 5-10 business days.
- Support Hours: Our customer support team is available Monday-Friday, 9 AM - 6 PM EST. We aim to respond to all inquiries within 24 hours.
- Contact: You can reach us at support@example.com or call 1-800-123-4567.
`;

const SYSTEM_PROMPT = `You are a helpful support agent for a small e-commerce store. Answer clearly and concisely.

${STORE_FAQ}

Be friendly, professional, and helpful. If you don't know something, admit it and offer to connect the user with a human agent.`;

export class LLMService {
  private openaiClient: OpenAI | null = null;
  private geminiClient: GoogleGenerativeAI | null = null;
  private provider: string;
  private model: string;
  private maxTokens: number;

  constructor() {
    this.provider = process.env.LLM_PROVIDER || 'openai';
    this.model = process.env.LLM_MODEL || 'gpt-3.5-turbo';
    this.maxTokens = parseInt(process.env.MAX_TOKENS || '500', 10);
    console.log(`LLM Service initialized with provider: ${this.provider}, model: ${this.model}`);
  }

  private getOpenAIClient(): OpenAI {
    if (!this.openaiClient) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is not set');
      }
      this.openaiClient = new OpenAI({ apiKey });
    }
    return this.openaiClient;
  }

  private getGeminiClient(): GoogleGenerativeAI {
    if (!this.geminiClient) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not set');
      }
      this.geminiClient = new GoogleGenerativeAI(apiKey);
    }
    return this.geminiClient;
  }

  private getMockResponse(userMessage: string): string {
    const msg = userMessage.toLowerCase();

    if (msg.includes('ship')) {
      return "We offer free shipping on orders over $50! Standard shipping takes 5-7 business days, and express shipping (2-3 days) is available for $15. We ship to most locations worldwide.";
    } else if (msg.includes('return') || msg.includes('refund')) {
      return "We accept returns within 30 days of purchase. Items must be unused and in original packaging. Refunds are processed within 5-10 business days after we receive your return.";
    } else if (msg.includes('support') || msg.includes('hours') || msg.includes('contact')) {
      return "Our customer support team is available Monday-Friday, 9 AM - 6 PM EST. You can reach us at support@example.com or call 1-800-123-4567. We aim to respond to all inquiries within 24 hours!";
    } else if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey')) {
      return "Hello! Welcome to our store! I'm here to help you with any questions about shipping, returns, support hours, or anything else. How can I assist you today?";
    } else {
      return `Thanks for your question! I'm currently running in demo mode. In production, I would provide detailed answers about our shipping policies, return process, and support hours. Feel free to ask about these topics to see example responses!`;
    }
  }

  private async generateGeminiReply(
    history: Message[],
    userMessage: string
  ): Promise<string> {
    const client = this.getGeminiClient();
    const modelName = process.env.LLM_MODEL || 'gemini-pro';
    const model = client.getGenerativeModel({ model: modelName });

    let conversationHistory = SYSTEM_PROMPT + '\n\n';

    for (const msg of history.slice(-10)) {
      const role = msg.sender === 'user' ? 'User' : 'Assistant';
      conversationHistory += `${role}: ${msg.text}\n`;
    }

    conversationHistory += `User: ${userMessage}\nAssistant:`;

    const result = await model.generateContent(conversationHistory);
    const response = result.response;
    const text = response.text();

    if (!text) {
      throw new Error('No response from Gemini');
    }

    return text;
  }

  private async generateHuggingFaceReply(
    history: Message[],
    userMessage: string
  ): Promise<string> {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) {
      throw new Error('HUGGINGFACE_API_KEY environment variable is not set');
    }

    const modelName = process.env.LLM_MODEL || 'microsoft/DialoGPT-medium';
    const apiUrl = `https://router.huggingface.co/models/${modelName}`;

    let prompt = SYSTEM_PROMPT + '\n\n';

    for (const msg of history.slice(-10)) {
      const role = msg.sender === 'user' ? 'User' : 'Assistant';
      prompt += `${role}: ${msg.text}\n`;
    }

    prompt += `User: ${userMessage}\nAssistant:`;

    const response = await axios.post(
      apiUrl,
      { inputs: prompt, parameters: { max_new_tokens: this.maxTokens, temperature: 0.7 } },
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (response.data && response.data[0] && response.data[0].generated_text) {
      const fullText = response.data[0].generated_text;
      const assistantReply = fullText.split('Assistant:').pop()?.trim() || fullText;
      return assistantReply;
    }

    throw new Error('No response from Hugging Face');
  }

  private async generateOpenAIReply(
    history: Message[],
    userMessage: string
  ): Promise<string> {
    const client = this.getOpenAIClient();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    for (const msg of history.slice(-10)) {
      messages.push({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
      });
    }

    messages.push({ role: 'user', content: userMessage });

    const response = await client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: this.maxTokens,
      temperature: 0.7,
    });

    const reply = response.choices[0]?.message?.content;
    if (!reply) {
      throw new Error('No response from OpenAI');
    }

    return reply;
  }

  async generateReply(
    history: Message[],
    userMessage: string
  ): Promise<string> {
    const useMockMode = process.env.USE_MOCK_AI === 'true';

    if (useMockMode) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.getMockResponse(userMessage);
    }

    try {
      const currentProvider = process.env.LLM_PROVIDER || 'openai';
      console.log(`Using LLM provider: ${currentProvider}`);

      if (currentProvider === 'gemini') {
        return await this.generateGeminiReply(history, userMessage);
      } else if (currentProvider === 'huggingface') {
        return await this.generateHuggingFaceReply(history, userMessage);
      } else {
        return await this.generateOpenAIReply(history, userMessage);
      }
    } catch (error: any) {
      console.error('LLM API error:', error);

      if (error.status === 401 || error.message?.includes('API key')) {
        throw new Error('Invalid API key. Please check your configuration.');
      } else if (error.status === 429 || error.code === 'insufficient_quota') {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        throw new Error('Unable to connect to LLM service. Please check your internet connection.');
      } else if (error.message?.includes('timeout')) {
        throw new Error('Request timed out. Please try again.');
      }

      throw new Error('Failed to generate response. Please try again.');
    }
  }
}

export const llmService = new LLMService();
