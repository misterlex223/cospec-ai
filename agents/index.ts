/**
 * CoSpec AI Agent - Main Entry Point
 *
 * Integrates Claude Agent SDK with CoSpec AI for document management
 */

import { query } from '@anthropic-ai/claude-agent-sdk';

// Subagent configurations
import { prdAnalyzer } from './subagents/prd-analyzer';
import { codeReviewer } from './subagents/code-reviewer';
import { docGenerator } from './subagents/doc-generator';
import { versionAdvisor } from './subagents/version-advisor';

// Skills
import { specAnalyzer, requirementExtractor, markdownFormatter } from './skills/index';

// Hooks and commands
import { startFileWatcher } from './hooks/file-change-hook';
import * as commands from './commands/index';

// MCP client for CoSpec tools
import { createCospecMcpClient } from './mcp/client';

/**
 * Main CoSpec AI Agent
 */
export async function runCospecAgent(prompt: string, options: {
  cwd?: string;
  enableHooks?: boolean;
  systemPrompt?: string;
}) {
  // Build subagent descriptions for system prompt
  const subagentList = [
    `- ${prdAnalyzer.description} - /use-subagent prd-analyzer`,
    `- ${codeReviewer.description} - /use-subagent code-reviewer`,
    `- ${docGenerator.description} - /use-subagent doc-generator`,
    `- ${versionAdvisor.description} - /use-subagent version-advisor`,
  ].join('\n');

  const skillsList = [
    `- ${specAnalyzer.name} - ${specAnalyzer.usage}`,
    `- ${requirementExtractor.name} - ${requirementExtractor.usage}`,
    `- ${markdownFormatter.name} - ${markdownFormatter.usage}`,
  ].join('\n');

  const customPrompt = options?.systemPrompt || `You are CoSpec AI's Document Management Agent.

## Subagent Delegation
You can delegate specialized tasks to subagents:
${subagentList}

## Skills Integration
You have access to reusable skills:
${skillsList}

## Workflow
When asked to analyze documents:
1. Read specified file using Read tool
2. Parse content structure and key sections
3. Provide actionable insights or generate new content
4. Use Write tool to create new documents when requested

When making file edits:
1. Always confirm target file path
2. Show what changes will be made
3. Respect existing formatting conventions`;

  // Start file watcher if enabled
  if (options?.enableHooks) {
    startFileWatcher(options?.cwd || process.cwd());
  }

  // Query the Agent SDK
  const result = query({
    prompt,
    options: {
      cwd: options?.cwd || process.cwd(),
      additionalDirectories: ['../markdown'],
      allowedTools: [
        'Read', 'Write', 'Edit', 'Glob', 'Grep', 'WebSearch', 'WebFetch',
      ],
      mcpServers: {
        cospec: createCospecMcpClient(),
      },
      systemPrompt: {
        type: 'preset',
        preset: 'claude_code',
        append: customPrompt,
      },
    },
  });

  // Process streaming messages
  for await (const message of result) {
    switch (message.type) {
      case 'assistant':
        const content = message.message.content;
        if (typeof content === 'string') {
          process.stdout.write(content);
        } else if (Array.isArray(content)) {
          content.forEach((block: any) => {
            if (block.type === 'text') {
              process.stdout.write(block.text);
            }
          });
        }
        process.stdout.write('\n');
        break;
      case 'user':
        // Echo user messages for context
        break;
      case 'system':
        if (message.subtype === 'init') {
          console.log('\n🤖 CoSpec AI Agent initialized');
          console.log(`   Model: ${message.model}`);
          console.log(`   Tools: ${message.tools.join(', ')}`);
        }
        break;
      case 'result':
        console.log(`\n✅ Agent completed in ${message.duration_ms}ms`);
        console.log(`   Cost: $${(message.total_cost_usd / 1000000).toFixed(6)}`);
        console.log(`   Turns: ${message.num_turns}`);
        return;
      default:
        // Handle other message types as needed
        break;
    }
  }
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const prompt = args.join(' ');

  if (!prompt) {
    console.error('Usage: pnpm start "<your prompt>"');
    console.error('Example: pnpm start "分析 PRD.md"');
    process.exit(1);
  }

  try {
    await runCospecAgent(prompt, {
      cwd: process.cwd(),
    });
  } catch (error) {
    console.error('Agent error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
