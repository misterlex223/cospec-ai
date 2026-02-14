/**
 * Git Service
 *
 * Provides git operations via backend API
 */

const { spawn } = require('child_process');
const path = require('path');

class GitService {
  constructor(repoPath) {
    this.repoPath = repoPath;
    this.gitDir = path.join(repoPath, '.git');
  }

  /**
   * Execute git command and return result
   */
  async exec(command, args = []) {
    return new Promise((resolve, reject) => {
      const gitCmd = spawn('git', ['--git-dir', this.gitDir, command, ...args.map(a => a.toString())], {
        cwd: this.repoPath,
        env: { ...process.env }
      });

      let output = '';
      let errorOutput = '';

      gitCmd.stdout.on('data', (data) => {
        output += data.toString();
        this.emitProgress(output);
      });
      gitCmd.stderr.on('data', (data) => {
        errorOutput += data.toString();
        this.emitProgress(data.toString(), true);
      });

      gitCmd.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output: output.trim(), error: errorOutput.trim() });
        } else {
          reject({ success: false, output: output.trim(), error: errorOutput.trim() });
        }
      });
    });
  }

  /**
   * Parse git output to structured format
   */
  parseGitOutput(output) {
    const lines = output.trim().split('\n');
    const results = [];
    let currentResult = null;

    for (const line of lines) {
      // Skip empty lines
      if (!line.trim()) continue;

      // Detect conflicts/errors
      if (line.includes('conflict') || line.includes('failed')) {
        if (currentResult) currentResult = { success: false, error: line };
        continue;
      }

      // Parse status codes
      if (line.startsWith('?') || line.startsWith('M') || line.startsWith('A')) {
        currentResult = { success: line.startsWith('M') };
        continue;
      }

      // Parse file changes
      const match = line.match(/^([MADR? ?])(?:\s+\d+)?\s+(.+)$/);
      if (match) {
        const [_, status, filePath] = match;
        if (currentResult) currentResult = { success: true };
        results.push({ type: 'file', status: status.trim(), path: filePath });
        continue;
      }

      // Parse renamed files
      const renameMatch = line.match(/^R (.+) -> (.+)$/);
      if (renameMatch) {
        const [_, oldPath, newPath] = renameMatch;
        if (currentResult) currentResult = { success: true };
        results.push({ type: 'rename', oldPath, newPath });
        continue;
      }

      // Parse branch info
      const branchMatch = line.match(/^## (.+)/);
      if (branchMatch) {
        const branchName = branchMatch[1];
        if (currentResult) currentResult = { success: true };
        results.push({ type: 'branch', name: branchName });
        continue;
      }
    }

    return {
      success: currentResult?.success || false,
      results,
      output: output.trim(),
      error: currentResult?.error
    };
  }

  /**
   * Emit progress via WebSocket (for Agent integration)
   */
  emitProgress(data, isError = false) {
    // TODO: Integrate with agentWebSocket
    console.log(`[GitService] ${isError ? 'Error' : 'Progress'}:`, data);
  }

  /**
   * Get git status
   */
  async getStatus() {
    try {
      const result = await this.exec('status', ['--porcelain']);
      return this.parseGitOutput(result.output);
    } catch (error) {
      return { success: false, results: [], output: '', error: error.error };
    }
  }

  /**
   * Get commit history
   */
  async getLog(limit = 20, offset = 0) {
    try {
      const result = await this.exec('log', ['-n', limit.toString(), `--skip=${offset}`, '--format=%h %an %s']);
      return this.parseGitOutput(result.output);
    } catch (error) {
      return { success: false, results: [], output: '', error: error.error };
    }
  }

  /**
   * Get commit details
   */
  async getCommit(id) {
    try {
      const result = await this.exec('show', [id, '--format=%h', '--stat']);
      return this.parseGitOutput(result.output);
    } catch (error) {
      return { success: false, results: [], output: '', error: error.error };
    }
  }

  /**
   * Get diff between files
   */
  async diff(pathA, pathB) {
    try {
      const result = await this.exec('diff', ['--no-color', '--format=%h', '--', pathA, pathB]);
      return this.parseGitOutput(result.output);
    } catch (error) {
      return { success: false, results: [], output: '', error: error.error };
    }
  }

  /**
   * Get current branch
   */
  async getCurrentBranch() {
    try {
      const result = await this.exec('branch', ['--show-current']);
      const match = result.output.match(/^.+$/);
      return match ? match[0] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all branches
   */
  async getBranches() {
    try {
      const result = await this.exec('branch', ['-a']);
      const lines = result.output.trim().split('\n');
      return lines.filter(line => line.trim());
    } catch (error) {
      return [];
    }
  }

  /**
   * Initialize git repository if not exists
   */
  async initRepo() {
    try {
      const result = await this.exec('init', ['-q', '-q']);
      return this.parseGitOutput(result.output);
    } catch (error) {
      return { success: false, results: [], output: '', error: error.error };
    }
  }

  /**
   * Stage changes
   */
  async stageFiles(files = []) {
    const fileList = files.map(f => `"${f}"`);
    try {
      const result = await this.exec('add', [...fileList]);
      return this.parseGitOutput(result.output);
    } catch (error) {
      return { success: false, results: [], output: '', error: error.error };
    }
  }

  async commitFiles(message = '') {
    try {
      const result = await this.exec('commit', ['-m', message]);
      return this.parseGitOutput(result.output);
    } catch (error) {
      return { success: false, results: [], output: '', error: error.error };
    }
  }
}

module.exports = GitService;
