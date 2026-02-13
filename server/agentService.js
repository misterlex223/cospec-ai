/**
 * Agent Service - Manages AI agent execution
 *
 * Handles agent execution, retry logic, and WebSocket communication
 * Extended with SQLite-backed conversation persistence
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// Agent type definitions
const AGENT_TYPES = [
  {
    id: 'general',
    name: '通用助手',
    description: '處理一般性的問題和任務',
    icon: 'bot',
    capabilities: ['chat', 'file-analysis', 'text-generation']
  },
  {
    id: 'prd-analyzer',
    name: 'PRD 分析師',
    description: '分析產品需求文件的完整性和一致性',
    icon: 'file-text',
    capabilities: ['analysis', 'suggestions', 'validation']
  },
  {
    id: 'code-reviewer',
    name: '代碼審查員',
    description: '檢查代碼品質、安全漏洞和最佳實踐',
    icon: 'code',
    capabilities: ['analysis', 'security-check', 'best-practices']
  },
  {
    id: 'doc-generator',
    name: '文件生成器',
    description: '從代碼或規格生成技術文件',
    icon: 'file-output',
    capabilities: ['generation', 'templating']
  },
  {
    id: 'version-advisor',
    name: '版本顧問',
    description: '分析變更並建議語義版本號',
    icon: 'tag',
    capabilities: ['analysis', 'versioning']
  }
];

// Context-aware suggestions based on file type
const SUGGESTION_TEMPLATES = {
  'default': [
    { id: 'summarize', text: '幫我撰寫文件摘要', prompt: '請為這份文件撰寫一份簡潔的摘要，包含主要要點和結論。' },
    { id: 'grammar', text: '檢查語法錯誤', prompt: '請檢查這份文件的語法、錯字和標點符號使用，並列出需要修正的地方。' },
    { id: 'optimize', text: '優化內容結構', prompt: '請分析這份文件的結構，並提供優化建議以提升可讀性。' }
  ],
  'spec': [
    { id: 'completeness', text: '檢查完整性', prompt: '請檢查這份規格文件的完整性，列出缺失的章節或內容。' },
    { id: 'consistency', text: '檢查一致性', prompt: '請檢查這份規格文件內部的一致性，包括術語、格式和命名規範。' },
    { id: 'test-cases', text: '生成測試案例', prompt: '請根據這份規格文件生成對應的測試案例。' }
  ],
  'readme': [
    { id: 'improve', text: '改進 README', prompt: '請分析這份 README 並提供改進建議，使其更清晰和專業。' },
    { id: 'examples', text: '添加使用範例', prompt: '請為這份專案添加清晰的使用範例。' },
    { id: 'badge', text: '添加徽章', prompt: '請建議合適的徽章和狀態標誌。' }
  ]
};

class AgentService {
  constructor(io, db = null) {
    this.io = io;
    this.db = db;
    this.allowedDirs = [
      process.env.MARKDOWN_DIR || path.join(__dirname, '..', 'markdown'),
      './specs',
      './docs'
    ];
    this.activeExecutions = new Map();
    this.conversations = new Map(); // Store active conversations (in-memory cache)
  }

  // ========================================================================
  // Agent Execution Methods
  // ========================================================================

  async executeAgent(agentType, targetFiles, options = {}) {
    // 1. Validate file paths
    const validatedPaths = this.validateFilePaths(targetFiles);
    if (validatedPaths.length === 0) {
      throw new Error('No valid files provided or files not in allowed directories');
    }

    // 2. Generate execution ID
    const executionId = this.generateId();

    // 3. Create execution record
    const execution = {
      id: executionId,
      agentType,
      targetFiles: validatedPaths,
      status: 'running',
      startTime: new Date().toISOString(),
      retryCount: options.retryCount || 0,
      customPrompt: options.customPrompt
    };

    if (this.db) {
      await this.db.insertExecution(execution);
    }

    // 4. Emit status update
    this.emitStatusUpdate(execution);

    // 5. Spawn agent process
    await this.spawnAgentProcess(execution, options);

    return { executionId, status: 'running' };
  }

  async spawnAgentProcess(execution, options) {
    const { id, agentType, targetFiles } = execution;

    // Ensure output directory exists
    const outputDir = path.join(process.env.MARKDOWN_DIR || './markdown', '.agent-output');
    await fs.mkdir(outputDir, { recursive: true });

    const outputFile = path.join(outputDir, `${id}.md`);

    // For now, we'll simulate the agent execution
    // TODO: Integrate with actual agent SDK
    const agentProcess = spawn('node', [
      path.join(__dirname, '..', 'agents', 'index.js'),
      '--use-subagent',
      agentType,
      '--files',
      targetFiles.join(','),
      '--output',
      outputFile
    ], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env }
    });

    this.activeExecutions.set(id, agentProcess);

    let output = '';
    let errorOutput = '';

    // Handle stdout
    agentProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      this.emitProgress(id, chunk);
    });

    // Handle stderr
    agentProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Handle process exit
    agentProcess.on('close', async (code) => {
      this.activeExecutions.delete(id);

      if (code === 0) {
        await this.handleSuccess(id, outputFile, output);
      } else {
        await this.handleFailure(id, errorOutput || 'Agent process failed', output);
      }
    });
  }

  async handleSuccess(executionId, outputFile, output) {
    const duration = this.activeExecutions.get(executionId)?.startTime
      ? Date.now() - new Date(this.activeExecutions.get(executionId).startTime).getTime()
      : null;

    if (this.db) {
      await this.db.updateStatus(executionId, 'success', {
        outputFilePath: outputFile,
        summary: this.generateSummary(output),
        duration
      });
    }

    this.emitComplete(executionId, {
      status: 'success',
      outputFilePath: outputFile,
      summary: this.generateSummary(output)
    });
  }

  async handleFailure(executionId, error, output) {
    const execution = await this.db?.findById(executionId);

    if (execution && execution.retryCount < 3) {
      // Retry
      await this.retryExecution(executionId);
    } else {
      // Mark as failed
      if (this.db) {
        await this.db.updateStatus(executionId, 'failed', {
          error,
          duration: execution ? Date.now() - new Date(execution.startTime).getTime() : null
        });
      }

      this.emitError(executionId, {
        error,
        retryCount: execution?.retryCount || 0
      });
    }
  }

  async retryExecution(executionId) {
    const execution = await this.db.findById(executionId);
    execution.retryCount++;

    await this.db.update(execution);

    this.emitStatusUpdate({
      ...execution,
      status: 'retrying'
    });

    await this.executeAgent(execution.agentType, execution.targetFiles, {
      retryCount: execution.retryCount,
      customPrompt: execution.customPrompt
    });
  }

  validateFilePaths(filePaths) {
    return filePaths.filter(filePath => {
      const fullPath = path.resolve(process.env.MARKDOWN_DIR || './markdown', filePath);
      return this.allowedDirs.some(dir => {
        const resolvedDir = path.resolve(dir);
        return fullPath.startsWith(resolvedDir);
      });
    });
  }

  generateSummary(output) {
    // Extract first 200 chars as summary
    const text = output.replace(/[#*`\\\[\]]/g, '').trim();
    return text.substring(0, 200) + (text.length > 200 ? '...' : '');
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // ========================================================================
  // WebSocket emission helpers
  // ========================================================================

  emitStatusUpdate(execution) {
    if (this.io) {
      this.io.emit('agent-status-update', {
        executionId: execution.id,
        status: execution.status,
        agentType: execution.agentType,
        startTime: execution.startTime
      });
    }
  }

  emitProgress(executionId, output) {
    if (this.io) {
      this.io.emit('agent-progress', {
        executionId,
        output,
        timestamp: new Date().toISOString()
      });
    }
  }

  emitComplete(executionId, result) {
    if (this.io) {
      this.io.emit('agent-complete', {
        executionId,
        ...result
      });
    }
  }

  emitError(executionId, error) {
    if (this.io) {
      this.io.emit('agent-error', {
        executionId,
        ...error
      });
    }
  }

  // ========================================================================
  // Agent Type API
  // ========================================================================

  getAgentTypes() {
    return AGENT_TYPES.map(type => ({
      ...type,
      // Add runtime stats if available
      stats: this.db ? null : undefined
    }));
  }

  getAgentTypeById(id) {
    return AGENT_TYPES.find(type => type.id === id) || null;
  }

  // ========================================================================
  // Context-aware Suggestions API
  // ========================================================================

  async getSuggestions(filePath) {
    let suggestions = SUGGESTION_TEMPLATES.default;

    if (filePath) {
      // Determine file type from path
      const fileName = path.basename(filePath).toLowerCase();
      if (fileName.includes('spec') || fileName.includes('prd')) {
        suggestions = SUGGESTION_TEMPLATES.spec;
      } else if (fileName === 'readme.md') {
        suggestions = SUGGESTION_TEMPLATES.readme;
      }
    }

    return suggestions.map(s => ({
      ...s,
      prompt: filePath
        ? `${s.prompt} 參考文件：${filePath}`
        : s.prompt
    }));
  }

  // ========================================================================
  // Chat-style Agent Execution
  // ========================================================================

  async executeChat(message, options = {}) {
    const {
      contextFiles = [],
      agentType = 'general',
      conversationId = null
    } = options;

    // Get or create conversation
    let conversation = conversationId
      ? this.conversations.get(conversationId)
      : null;

    if (!conversation) {
      conversation = {
        id: conversationId || this.generateId(),
        agentType,
        messages: [],
        contextFiles,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      this.conversations.set(conversation.id, conversation);
    }

    // Add user message
    const userMessage = {
      id: this.generateId(),
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    conversation.messages.push(userMessage);
    conversation.updatedAt = new Date().toISOString();

    // Build prompt with context
    let fullPrompt = message;
    if (contextFiles.length > 0) {
      fullPrompt = `${message}\n\n參考文件：${contextFiles.join(', ')}`;
    }

    // Emit user message via WebSocket for real-time updates
    this.io?.emit('agent-chat-message', {
      conversationId: conversation.id,
      message: userMessage
    });

    // Execute agent (async)
    this.processChatMessage(conversation, userMessage, fullPrompt, agentType);

    return {
      conversationId: conversation.id,
      messageId: userMessage.id,
      status: 'processing'
    };
  }

  async processChatMessage(conversation, userMessage, prompt, agentType) {
    try {
      // Spawn agent process for chat
      const agentProcess = spawn('node', [
        path.join(__dirname, '..', 'agents', 'index.js'),
        '--use-subagent',
        agentType,
        '--prompt',
        prompt
      ], {
        cwd: path.join(__dirname, '..'),
        env: { ...process.env }
      });

      let output = '';
      let errorOutput = '';

      // Stream output chunks
      agentProcess.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;

        // Emit streaming response
        this.io?.emit('agent-chat-chunk', {
          conversationId: conversation.id,
          messageId: userMessage.id,
          chunk,
          done: false
        });
      });

      agentProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      agentProcess.on('close', async (code) => {
        if (code === 0) {
          // Add assistant message to conversation
          const assistantMessage = {
            id: this.generateId(),
            role: 'assistant',
            content: output,
            timestamp: new Date().toISOString()
          };
          conversation.messages.push(assistantMessage);
          conversation.updatedAt = new Date().toISOString();

          // Persist to database if available
          if (this.db) {
            await this.addMessageToConversationDB(conversation.id, assistantMessage);
          }

          // Emit completion
          this.io?.emit('agent-chat-complete', {
            conversationId: conversation.id,
            messageId: userMessage.id,
            response: output,
            done: true
          });
        } else {
          // Emit error
          this.io?.emit('agent-chat-error', {
            conversationId: conversation.id,
            messageId: userMessage.id,
            error: errorOutput || 'Agent processing failed'
          });
        }
      });
    } catch (error) {
      this.io?.emit('agent-chat-error', {
        conversationId: conversation.id,
        messageId: userMessage.id,
        error: error.message
      });
    }
  }

  // ========================================================================
  // In-memory Conversation API (backward compatibility)
  // ========================================================================

  getConversations() {
    return Array.from(this.conversations.values())
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  getConversation(id) {
    return this.conversations.get(id) || null;
  }

  deleteConversation(id) {
    return this.conversations.delete(id);
  }

  // ========================================================================
  // Database-backed Conversation API
  // ========================================================================

  /**
   * Create new conversation with database persistence
   */
  async createConversation(userId, agentType = 'general', title = null, firstMessage = null) {
    const id = this.generateId();
    const now = new Date().toISOString();

    const conv = {
      id,
      userId: userId || 'default',
      agentType,
      title: title || `Conversation ${id.slice(0, 8)}`,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      messages: []
    };

    // Store in memory
    this.conversations.set(id, conv);

    // Persist to database
    if (this.db) {
      await new Promise((resolve, reject) => {
        this.db.db.run(
          'INSERT INTO agent_conversations (id, user_id, agent_type, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [id, conv.userId, agentType, conv.title, conv.status, now, now],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // Add first message if provided
    if (firstMessage) {
      await this.addMessageToConversation(id, {
        role: 'user',
        content: firstMessage
      });
    }

    return conv;
  }

  /**
   * Add message to conversation with database persistence
   */
  async addMessageToConversation(conversationId, { role, content }) {
    const msgId = this.generateId();
    const now = new Date().toISOString();

    // Update in-memory conversation
    const conv = this.conversations.get(conversationId);
    if (conv) {
      conv.messages.push({
        id: msgId,
        role,
        content,
        timestamp: now
      });
      conv.updatedAt = now;
    }

    // Persist to database
    if (this.db) {
      await new Promise((resolve, reject) => {
        this.db.db.run(
          'INSERT INTO agent_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
          [msgId, conversationId, role, content, now],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Update conversation updated_at
      await new Promise((resolve, reject) => {
        this.db.db.run(
          'UPDATE agent_conversations SET updated_at = ? WHERE id = ?',
          [now, conversationId],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    return msgId;
  }

  /**
   * Helper to add message directly to DB (for internal use)
   */
  async addMessageToConversationDB(conversationId, message) {
    if (!this.db) return;

    await new Promise((resolve, reject) => {
      this.db.db.run(
        'INSERT INTO agent_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
        [message.id, conversationId, message.role, message.content, message.timestamp],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  /**
   * Get all conversations with messages from database
   */
  async getConversationsWithMessages() {
    if (!this.db) {
      // Fallback to in-memory conversations
      return Array.from(this.conversations.values());
    }

    const conversations = await new Promise((resolve, reject) => {
      this.db.db.all(
        'SELECT * FROM agent_conversations ORDER BY updated_at DESC',
        [],
        function(err, rows) {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });

    // Fetch messages for each conversation
    return Promise.all(conversations.map(async (conv) => {
      const messages = await new Promise((resolve, reject) => {
        this.db.db.all(
          'SELECT * FROM agent_messages WHERE conversation_id = ? ORDER BY created_at ASC',
          [conv.id],
          function(err, rows) {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      // Update in-memory cache
      const fullConv = {
        ...conv,
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: msg.created_at
        }))
      };
      this.conversations.set(conv.id, fullConv);

      return fullConv;
    }));
  }

  /**
   * Update conversation status
   */
  async updateConversationStatus(id, status) {
    const now = new Date().toISOString();

    if (this.db) {
      await new Promise((resolve, reject) => {
        this.db.db.run(
          'UPDATE agent_conversations SET status = ?, updated_at = ? WHERE id = ?',
          [status, now, id],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // Update in-memory store
    const conv = this.conversations.get(id);
    if (conv) {
      conv.status = status;
      conv.updatedAt = now;
    }
  }

  /**
   * Delete conversation and its messages
   */
  async deleteConversation(id) {
    if (this.db) {
      // Delete messages first (due to FK constraint)
      await new Promise((resolve, reject) => {
        this.db.db.run('DELETE FROM agent_messages WHERE conversation_id = ?', [id], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });

      // Delete conversation
      await new Promise((resolve, reject) => {
        this.db.db.run('DELETE FROM agent_conversations WHERE id = ?', [id], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    // Update in-memory store
    this.conversations.delete(id);
  }

  /**
   * Get conversation messages with pagination
   */
  async getConversationMessages(conversationId, options = {}) {
    const { limit = 50, offset = 0 } = options;

    if (this.db) {
      const messages = await new Promise((resolve, reject) => {
        this.db.db.all(
          'SELECT * FROM agent_messages WHERE conversation_id = ? ORDER BY created_at ASC',
          [conversationId],
          function(err, rows) {
            if (err) reject(err);
            else resolve(rows || []);
          }
        );
      });

      // Apply pagination
      const start = offset;
      const end = offset + limit;
      const paginated = messages.slice(start, end);

      return paginated.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.created_at
      }));
    }

    return [];
  }

  /**
   * Get full conversation with messages
   */
  async getConversationWithMessages(id) {
    const conv = this.conversations.get(id);
    if (!conv) return null;

    const messages = await this.getConversationMessages(id);

    return {
      ...conv,
      messages
    };
  }

  emitGitProgress(data, isError) {
    io.emit('git-progress', {
      type: isError ? 'error' : 'progress',
      data,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = AgentService;
