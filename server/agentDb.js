/**
 * Agent Database - SQLite storage for agent execution history
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
    const sql = `
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

      CREATE INDEX IF NOT EXISTS idx_agent_type ON agent_executions(agent_type);
      CREATE INDEX IF NOT EXISTS idx_status ON agent_executions(status);
      CREATE INDEX IF NOT EXISTS idx_start_time ON agent_executions(start_time);
    `;

    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async insert(execution) {
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
          else resolve(row ? { ...row, targetFiles: JSON.parse(row.target_files) } : null);
        }
      );
    });
  }

  async findAll(options = {}) {
    const { limit = 50, offset = 0, agentType, status } = options;
    let sql = 'SELECT * FROM agent_executions';
    const params = [];

    const conditions = [];
    if (agentType) {
      conditions.push('agent_type = ?');
      params.push(agentType);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY start_time DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => ({ ...row, targetFiles: JSON.parse(row.target_files) })));
      });
    });
  }

  async getStats() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          COUNT(*) as totalExecutions,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successCount,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedCount,
          AVG(duration) as avgDuration,
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
            stats.byType[row.agent_type] = row.totalExecutions;
          });

          stats.successRate = stats.totalExecutions > 0
            ? stats.successCount / stats.totalExecutions
            : 0;

          resolve(stats);
        }
      });
    });
  }

  async updateStatus(id, status, data = {}) {
    const updates = ['status = ?', 'end_time = ?'];
    const params = [status, new Date().toISOString()];

    if (data.outputFilePath !== undefined) {
      updates.push('output_file_path = ?');
      params.push(data.outputFilePath);
    }
    if (data.summary !== undefined) {
      updates.push('summary = ?');
      params.push(data.summary);
    }
    if (data.duration !== undefined) {
      updates.push('duration = ?');
      params.push(data.duration);
    }
    if (data.error !== undefined) {
      updates.push('error = ?');
      params.push(data.error);
    }

    params.push(id);

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE agent_executions SET ${updates.join(', ')} WHERE id = ?`,
        params,
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async update(execution) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE agent_executions SET retry_count = ? WHERE id = ?`,
        [execution.retryCount, execution.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  async delete(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM agent_executions WHERE id = ?', [id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async getTables() {
    return new Promise((resolve, reject) => {
      this.db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(r => r.name));
      });
    });
  }
}

module.exports = AgentDB;
