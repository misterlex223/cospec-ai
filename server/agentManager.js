// agentManager.js - Manager to handle long-running agent tasks
const AgentService = require('./agentService');

class AgentManager {
  constructor() {
    this.agentService = new AgentService();
    console.log('AgentManager initialized');
  }

  // Input validation and path sanitization function
  sanitizePath(inputPath) {
    // Decode URI components
    try {
      const decodedPath = decodeURIComponent(inputPath);
      // Normalize the path to prevent directory traversal
      const normalizedPath = require('path').normalize(decodedPath);
      // Ensure the path doesn't start with .. or contain ../ patterns
      if (normalizedPath.includes('../') || normalizedPath.startsWith('..')) {
        throw new Error('Invalid path: directory traversal detected');
      }
      return normalizedPath;
    } catch (e) {
      throw new Error('Invalid path: malformed URI');
    }
  }

  // Execute a file processing task
  async processFileTask(taskData) {
    try {
      // Create a new task
      const task = await this.agentService.createTask({
        type: 'file_processing',
        description: taskData.description || 'Processing file',
        filePath: taskData.filePath,
        operation: taskData.operation
      });

      // Start the task execution
      await this.agentService.executeTask(task.id, async (progressCallback) => {
        try {
          // Import required modules
          const fs = require('fs').promises;
          const path = require('path');

          // Get the markdown directory from environment or default
          const MARKDOWN_DIR = process.env.MARKDOWN_DIR || '/markdown';

          // Validate and sanitize the file path
          const sanitizedPath = this.sanitizePath(taskData.filePath);

          // Ensure the path is a markdown file
          if (!sanitizedPath.toLowerCase().endsWith('.md')) {
            throw new Error('Only markdown files are allowed');
          }

          // Construct the full file path
          const filePath = path.join(MARKDOWN_DIR, sanitizedPath);

          // Ensure the path is within the MARKDOWN_DIR
          const resolvedPath = path.resolve(filePath);
          const resolvedMarkdownDir = path.resolve(MARKDOWN_DIR);
          if (!resolvedPath.startsWith(resolvedMarkdownDir)) {
            throw new Error('Invalid file path: outside allowed directory');
          }

          // Check if file exists
          await fs.access(filePath);

          // Read the file content
          await progressCallback(10, 'Reading file content');
          const content = await fs.readFile(filePath, 'utf-8');

          // Perform operation based on the operation type
          let result = {};
          switch (taskData.operation) {
            case 'analyze':
              await progressCallback(30, 'Analyzing file content');
              result = await this.analyzeFileContent(content, filePath);
              break;
            case 'format':
              await progressCallback(30, 'Formatting file content');
              result = await this.formatFileContent(content, filePath);
              break;
            case 'summarize':
              await progressCallback(30, 'Summarizing file content');
              result = await this.summarizeFileContent(content, filePath);
              break;
            case 'wordcount':
              await progressCallback(30, 'Counting words in file');
              result = await this.countWords(content, filePath);
              break;
            default:
              await progressCallback(30, `Processing file with operation: ${taskData.operation}`);
              result = {
                message: `File processed with operation '${taskData.operation}'`,
                filePath: taskData.filePath,
                operation: taskData.operation,
                details: `Performed ${taskData.operation} on file with ${content.length} characters`
              };
          }

          // Complete the task
          await progressCallback(100, 'File processing completed successfully');

          return {
            message: 'File processing completed successfully',
            filePath: taskData.filePath,
            operation: taskData.operation,
            result: result
          };
        } catch (error) {
          throw new Error(`File processing failed: ${error.message}`);
        }
      });

      return task;
    } catch (error) {
      console.error('Error processing file task:', error.message);
      throw error;
    }
  }

  // Execute a content analysis task
  async analyzeContentTask(taskData) {
    try {
      // Create a new task
      const task = await this.agentService.createTask({
        type: 'content_analysis',
        description: taskData.description || 'Analyzing content',
        content: taskData.content,
        analysisType: taskData.analysisType
      });

      // Start the task execution
      await this.agentService.executeTask(task.id, async (progressCallback) => {
        // Simulate content analysis with progress updates
        const steps = [
          'Parsing content',
          'Identifying key topics',
          'Analyzing structure',
          'Extracting entities',
          'Generating insights',
          'Preparing report'
        ];

        for (let i = 0; i < steps.length; i++) {
          // Update progress (0-100%)
          await progressCallback(Math.round((i + 1) / steps.length * 100), steps[i]);

          // Simulate work
          await new Promise(resolve => setTimeout(resolve, 800));
        }

        // Return analysis result
        return {
          summary: 'Content analysis completed',
          keyPoints: [
            'Identified 5 main topics',
            'Found 12 key entities',
            'Detected positive sentiment',
            'Suggested improvements provided'
          ],
          suggestions: [
            'Consider adding more examples',
            'Improve section transitions',
            'Add visual elements'
          ]
        };
      });

      return task;
    } catch (error) {
      console.error('Error analyzing content task:', error.message);
      throw error;
    }
  }

  // Get task status
  async getTaskStatus(taskId) {
    return await this.agentService.getTask(taskId);
  }

  // Get all tasks
  async getAllTasks(filters = {}) {
    return await this.agentService.getAllTasks(filters);
  }

  // Cancel a task
  async cancelTask(taskId) {
    try {
      // Call the agentService to cancel the task
      const result = await this.agentService.cancelTask(taskId);

      // If we have a socket instance, broadcast the task update
      // Note: This would typically be done in the routes layer, but we're showing
      // the pattern here for completeness

      return result;
    } catch (error) {
      console.error('Error cancelling task in AgentManager:', error.message);
      throw error;
    }
  }

  // Analyze file content
  async analyzeFileContent(content, filePath) {
    try {
      // Count lines, words, and characters
      const lines = content.split('\n').length;
      const words = content.split(/\s+/).filter(word => word.length > 0).length;
      const characters = content.length;
      const charactersNoSpaces = content.replace(/\s/g, '').length;

      // Extract headers (Markdown headers start with #)
      const headers = content.match(/^#{1,6}\s+.+$/gm) || [];

      // Extract links
      const links = content.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];

      // Extract images
      const images = content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];

      // Extract code blocks
      const codeBlocks = content.match(/```[\s\S]*?```/g) || [];

      return {
        message: 'File analysis completed successfully',
        filePath: filePath,
        analysis: {
          lines: lines,
          words: words,
          characters: characters,
          charactersNoSpaces: charactersNoSpaces,
          headersCount: headers.length,
          linksCount: links.length,
          imagesCount: images.length,
          codeBlocksCount: codeBlocks.length,
          headers: headers.slice(0, 10), // Limit to first 10 headers
          sampleLinks: links.slice(0, 5), // Limit to first 5 links
          sampleImages: images.slice(0, 5) // Limit to first 5 images
        }
      };
    } catch (error) {
      throw new Error(`Failed to analyze file content: ${error.message}`);
    }
  }

  // Format file content
  async formatFileContent(content, filePath) {
    try {
      // Basic formatting:
      // 1. Ensure consistent line endings
      let formattedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      // 2. Remove trailing whitespace from each line
      formattedContent = formattedContent.split('\n')
        .map(line => line.trimEnd())
        .join('\n');

      // 3. Ensure file ends with a newline
      if (!formattedContent.endsWith('\n') && formattedContent.length > 0) {
        formattedContent += '\n';
      }

      // 4. Format headers (ensure proper spacing after #)
      formattedContent = formattedContent.replace(/^(#{1,6})([^#\s])/gm, '$1 $2');

      // 5. Format lists (ensure proper spacing after *)
      formattedContent = formattedContent.replace(/^(\s*)(\*\s+)(.+)/gm, '$1* $3');

      // 6. Format numbered lists (ensure proper spacing after number)
      formattedContent = formattedContent.replace(/^(\s*)(\d+\.\s+)(.+)/gm, '$1$2$3');

      return {
        message: 'File formatting completed successfully',
        filePath: filePath,
        originalLength: content.length,
        formattedLength: formattedContent.length,
        content: formattedContent
      };
    } catch (error) {
      throw new Error(`Failed to format file content: ${error.message}`);
    }
  }

  // Summarize file content
  async summarizeFileContent(content, filePath) {
    try {
      // Extract headers to understand document structure
      const headers = content.match(/^#{1,6}\s+.+$/gm) || [];

      // Extract first paragraph or first 200 characters as summary
      const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
      const firstParagraph = paragraphs[0] || '';
      const summaryText = firstParagraph.length > 200
        ? firstParagraph.substring(0, 200) + '...'
        : firstParagraph;

      // Get key statistics
      const lines = content.split('\n').length;
      const words = content.split(/\s+/).filter(word => word.length > 0).length;

      return {
        message: 'File summarization completed successfully',
        filePath: filePath,
        summary: {
          brief: summaryText,
          structure: headers.slice(0, 10), // First 10 headers
          stats: {
            lines: lines,
            words: words,
            headers: headers.length
          }
        }
      };
    } catch (error) {
      throw new Error(`Failed to summarize file content: ${error.message}`);
    }
  }

  // Count words in file content
  async countWords(content, filePath) {
    try {
      // Split by whitespace and filter out empty strings
      const words = content.split(/\s+/).filter(word => word.length > 0);
      const wordCount = words.length;

      // Character count
      const charCount = content.length;

      // Line count
      const lineCount = content.split('\n').length;

      // Paragraph count (separated by double newlines)
      const paragraphCount = content.split('\n\n').filter(p => p.trim().length > 0).length;

      return {
        message: 'Word count completed successfully',
        filePath: filePath,
        counts: {
          words: wordCount,
          characters: charCount,
          lines: lineCount,
          paragraphs: paragraphCount
        },
        // Most common words (excluding common English stop words)
        commonWords: this.getMostCommonWords(words, 10)
      };
    } catch (error) {
      throw new Error(`Failed to count words: ${error.message}`);
    }
  }

  // Helper function to get most common words
  getMostCommonWords(words, limit) {
    try {
      // Common English stop words to exclude
      const stopWords = new Set([
        'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those'
      ]);

      // Count word frequencies (case-insensitive)
      const wordFreq = {};
      words.forEach(word => {
        // Convert to lowercase and remove punctuation
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        // Skip empty words and stop words
        if (cleanWord && cleanWord.length > 2 && !stopWords.has(cleanWord)) {
          wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
        }
      });

      // Sort by frequency and return top words
      return Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([word, count]) => ({ word, count }));
    } catch (error) {
      console.error('Error getting most common words:', error.message);
      return [];
    }
  }
}

module.exports = AgentManager;