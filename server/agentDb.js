/**
 * Agent Database - SQLite storage for agent execution and conversations
 *
 * Extended to support:
 * - Agent execution history (existing)
 * - Agent conversations with messages (new)
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class AgentDB {
  constructor(dbPath = './agent-history.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else resolve(this.createTables());
      });
    });
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      const sql = `
        -- Existing tables
        CREATE TABLE IF NOT EXISTS agent_executions (
          id TEXT PRIMARY KEY,
          agent_type TEXT NOT NULL,
          target_files TEXT NOT NULL,
          status TEXT NOT NULL,
          summary TEXT,
          output_file_path TEXT,
          start_time TEXT NOT NULL,
          end_time TEXT,
          duration INTEGER,
          error TEXT,
          retry_count INTEGER DEFAULT 0,
          custom_prompt TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        -- New tables for conversations
        CREATE TABLE IF NOT EXISTS agent_conversations (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          agent_type TEXT NOT NULL,
          title TEXT,
          status TEXT DEFAULT 'active',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS agent_messages (
          id TEXT PRIMARY KEY,
          conversation_id TEXT NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (conversation_id) REFERENCES agent_conversations(id) ON DELETE CASCADE
        );

        -- Indexes
        CREATE INDEX IF NOT EXISTS idx_conv_user ON agent_conversations(user_id);
        CREATE INDEX IF NOT EXISTS idx_conv_status ON agent_conversations(status);
        CREATE INDEX IF NOT EXISTS idx_conv_updated ON agent_conversations(updated_at);
        CREATE INDEX IF NOT EXISTS idx_msg_conv ON agent_messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_msg_created ON agent_messages(created_at);
      `;

      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  // ============================================================
  // Agent Executions (Existing)
  // ============================================================

  async insertExecution(execution) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO agent_executions
        (id, agent_type, target_files, status, start_time, retry_count, custom_prompt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [
        execution.id,
        execution.agentType,
        JSON.stringify(execution.targetFiles),
        execution.status,
        execution.startTime,
        execution.retryCount || 0,
        execution.customPrompt || null
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  async findById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM agent_executions WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? { ...row, targetFiles: JSON.parse(row.targetFiles) } : null);
        }
      );
    });
  }

  async findAll(options = {}) {
    return new Promise((resolve, reject) => {
      const { limit = 50, offset = 0, agentType, status } = options;
      let sql = 'SELECT * FROM agent_executions';
      const params = [];

      if (agentType) {
        params.push(`agent_type = ?`);
      }
      if (status) {
        params.push(`status = ?`);
      }

      if (params.length > 0) {
        sql += ' WHERE ' + params.join(' AND ');
      }

      sql += ' ORDER BY start_time DESC';

      if (limit) {
        sql += ` LIMIT ?`;
        params.push(limit + 1);
      }

      if (offset) {
        sql += ` OFFSET ?`;
        params.push(offset);
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => ({
          ...row,
          targetFiles: JSON.parse(row.targetFiles)
        })));
      });
    });
  }

  async updateStatus(id, status, data = {}) {
    const updates = ['status = ?'];
    if (data.outputFilePath !== undefined) {
      updates.push('output_file_path = ?');
      updates.push(data.outputFilePath);
    }
    if (data.summary !== undefined) {
      updates.push('summary = ?');
      updates.push(data.summary);
    }
    if (data.endTime !== undefined) {
      updates.push('end_time = ?');
      updates.push(data.endTime);
    }
    if (data.duration !== undefined) {
      updates.push('duration = ?');
      updates.push(data.duration);
    }
    if (data.error !== undefined) {
      updates.push('error = ?');
      updates.push(data.error);
    }

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE agent_executions SET ${updates.join(', ')} WHERE id = ?`,
        [id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async incrementRetry(id) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE agent_executions SET retry_count = retry_count + 1 WHERE id = ?',
        [id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async deleteExecution(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM agent_executions WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve(id);
      });
    });
  }

  // ============================================================
  // Conversations (New)
  // ============================================================

  async createConversation(userId, agentType, title = null) {
    const id = this.generateId();
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO agent_conversations (id, user_id, agent_type, title, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'active', ?, ?)
      `;

      this.db.run(sql, [
        id,
        userId || 'default',
        agentType,
        title || `Conversation ${id.slice(0, 8)}`,
        now,
        now
      ], function(err) {
        if (err) reject(err);
        else resolve(id);
      });
    });
  }

  async getConversation(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM agent_conversations WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
  }

  async getConversationsByUser(userId, options = {}) {
    const { limit = 50, offset = 0, status = 'active' } = options;
    let sql = 'SELECT * FROM agent_conversations WHERE user_id = ?';
    const params = [userId];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY updated_at DESC';

    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit + 1);
    }

    if (offset) {
      sql += ' OFFSET ?';
      params.push(offset);
    }

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async updateConversation(id, updates = {}) {
    const fields = [];
    const values = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());

    if (fields.length === 0) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE agent_conversations SET ${fields.join(', ')} WHERE id = ?`,
        [...values, id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async deleteConversation(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM agent_conversations WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve(id);
      });
    });
  }

  // ============================================================
  // Messages (New)
  // ============================================================

  async insertMessage(conversationId, role, content) {
    const id = this.generateId();
    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO agent_messages (id, conversation_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `;
      this.db.run(sql, [
        id,
        conversationId,
        role,
        content,
        now
      ], function(err) {
        if (err) reject(err);
        else resolve(id);
      });
    });
  }

      this.db.run(sql, [
        id,
        conversationId,
        role,
        content,
        now
      ], function(err) {
        if (err) reject(err);
        else resolve(id);
      }
      });
    });
  }

  async getMessagesByConversation(conversationId, options = {}) {
    const { limit = 100, offset = 0 } = options;
    let sql = 'SELECT * FROM agent_messages WHERE conversation_id = ?';
    const params = [conversationId];

    sql += ' ORDER BY created_at ASC';

    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    if (offset) {
      sql += ' OFFSET ?';
      params.push(offset);
    }

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getConversationWithMessages(conversationId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT
          c.*,
          GROUP_CONCAT(m.content, '|') as messages
        FROM agent_conversations c
          WHERE c.id = ?
        `,
        [conversationId],
        (err, rows) => {
          if (err) reject(err);
          else if (rows.length === 0) {
            resolve(null);
          else {
            const conv = rows[0];
            this.getMessagesByConversation(conv.id).then(messages => {
              resolve({
                ...conv,
                messages: messages || []
              });
            });
          }
        }
      );
    });
  }

  async deleteMessagesByConversation(conversationId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM agent_messages WHERE conversation_id = ?',
        [conversationId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  // ============================================================
  // Stats
  // ============================================================

  async getStats() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          COUNT(*) as totalExecutions,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successCount,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedCount,
          AVG(CASE WHEN status = 'success' THEN duration ELSE NULL END) as avgDuration,
          agent_type
        FROM agent_executions
        GROUP BY agent_type
      `;

      this.db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else {
          const stats = {
            totalExecutions: 0,
            successCount: 0,
            failedCount: 0,
            avgDuration: 0,
            byType: {}
          };

          rows.forEach(row => {
            stats.totalExecutions += row.totalExecutions;
            stats.successCount += row.successCount;
            stats.failedCount += row.failedCount;
            stats.avgDuration += row.avgDuration || 0;
            stats.byType[row.agent_type] = {
              totalExecutions: row.totalExecutions,
              successCount: row.successCount,
              failedCount: row.failedCount,
              avgDuration: row.avgDuration || 0
            };
          });

          resolve(stats);
        }
      });
    });
  }

  // ============================================================
  // Utility
  // ============================================================

  generateId() {
    return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  async getTables() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(r => r.name));
      });
    });
  }

  async close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
  }
}

module.exports = AgentDB;
