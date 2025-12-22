import Database from 'better-sqlite3';
import * as path from 'path';

const dbPath = process.env.DB_PATH || './database.sqlite';
const sqliteDb = new Database(dbPath);

export interface Conversation {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  sender: 'user' | 'ai';
  text: string;
  created_at: string;
}

export class DatabaseClass {
  async initialize() {
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
          sender TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
          text TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
    `);
  }

  async createConversation(): Promise<number> {
    const stmt = sqliteDb.prepare('INSERT INTO conversations DEFAULT VALUES');
    const result = stmt.run();
    return result.lastInsertRowid as number;
  }

  async createMessage(
    conversationId: number,
    sender: 'user' | 'ai',
    text: string
  ): Promise<Message> {
    const stmt = sqliteDb.prepare(
      'INSERT INTO messages (conversation_id, sender, text) VALUES (?, ?, ?)'
    );
    const result = stmt.run(conversationId, sender, text);

    const message = sqliteDb.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid) as Message;
    return message;
  }

  async getConversationMessages(conversationId: number): Promise<Message[]> {
    const stmt = sqliteDb.prepare(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
    );
    return stmt.all(conversationId) as Message[];
  }

  async conversationExists(conversationId: number): Promise<boolean> {
    const stmt = sqliteDb.prepare('SELECT 1 FROM conversations WHERE id = ?');
    const result = stmt.get(conversationId);
    return !!result;
  }
}

export const db = new DatabaseClass();
