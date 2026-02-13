/**
 * Agent Service - Manages AI agent execution
 *
 * Handles agent execution, retry logic, and WebSocket communication
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

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
  }

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
      await this.db.insert(execution);
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
    const text = output.replace(/[#*`\[\]]/g, '').trim();
    return text.substring(0, 200) + (text.length > 200 ? '...' : '');
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // WebSocket emission helpers
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
}

module.exports = AgentService;
