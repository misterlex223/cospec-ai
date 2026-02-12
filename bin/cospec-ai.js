#!/usr/bin/env node

const path = require('path');
const fs = require('fs').promises;
const os = require('os');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Command handler for list-profiles
async function listProfiles() {
  const baseProfileDir = path.join(os.homedir(), '.cospec-ai', 'profiles');

  try {
    // Ensure base directory exists
    await fs.mkdir(baseProfileDir, { recursive: true });

    const entries = await fs.readdir(baseProfileDir, { withFileTypes: true });
    const profiles = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Check if profile.json exists
        const profileJsonPath = path.join(baseProfileDir, entry.name, 'profile.json');
        try {
          await fs.access(profileJsonPath);

          // Read profile details
          const profileContent = await fs.readFile(profileJsonPath, 'utf-8');
          const profileData = JSON.parse(profileContent);

          profiles.push({
            name: entry.name,
            displayName: profileData.name || entry.name,
            version: profileData.version || 'N/A',
            description: profileData.description || 'No description',
            path: path.join(baseProfileDir, entry.name)
          });
        } catch (err) {
          // Skip directories without valid profile.json
        }
      }
    }

    if (profiles.length === 0) {
      console.log('No profiles found.');
      console.log(`\nCreate a new profile with: npx cospec-ai init-profile <name>`);
    } else {
      console.log(`Found ${profiles.length} profile(s):\n`);

      profiles.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.name}`);
        console.log(`   Name: ${profile.displayName}`);
        console.log(`   Version: ${profile.version}`);
        console.log(`   Description: ${profile.description}`);
        console.log(`   Path: ${profile.path}`);
        console.log('');
      });

      console.log(`\nUse a profile with: npx cospec-ai --profile <name>`);
    }
  } catch (err) {
    console.error(`Failed to list profiles: ${err.message}`);
    process.exit(1);
  }
}

// Command handler for init-profile
async function initProfile(profileName) {
  const baseProfileDir = path.join(os.homedir(), '.cospec-ai', 'profiles');
  const profilePath = path.join(baseProfileDir, profileName);
  const promptsPath = path.join(profilePath, 'prompts');

  try {
    // Check if profile already exists
    try {
      await fs.access(profilePath);
      console.error(`Error: Profile "${profileName}" already exists at ${profilePath}`);
      process.exit(1);
    } catch (err) {
      // Profile doesn't exist, proceed
    }

    // Create profile directory structure
    await fs.mkdir(promptsPath, { recursive: true });

    // Create profile.json template
    const profileTemplate = {
      name: profileName,
      version: '1.0.0',
      description: `${profileName} profile`,
      documents: [
        {
          name: 'Example Document',
          path: 'example.md',
          description: 'An example document',
          promptFile: 'prompts/example.md',
          promptText: 'Generate an example document',
          command: 'echo "Generated content for {filePath}" > {filePath}'
        }
      ],
      folders: []
    };

    await fs.writeFile(
      path.join(profilePath, 'profile.json'),
      JSON.stringify(profileTemplate, null, 2),
      'utf-8'
    );

    // Create example prompt file
    const examplePrompt = `# Example Prompt

This is an example prompt file for document generation.

## Instructions

Replace this content with your actual generation instructions for AI agents.

## Variables Available

- {filePath}: Target file path in markdown directory
- {promptText}: The promptText field from profile.json
`;

    await fs.writeFile(
      path.join(promptsPath, 'example.md'),
      examplePrompt,
      'utf-8'
    );

    console.log(`✓ Profile "${profileName}" created successfully!`);
    console.log(`  Location: ${profilePath}`);
    console.log(`\nNext steps:`);
    console.log(`  1. Edit ${path.join(profilePath, 'profile.json')} to configure your profile`);
    console.log(`  2. Add prompt files to ${promptsPath}`);
    console.log(`  3. Start CoSpec AI with: npx cospec-ai --profile ${profileName}`);
  } catch (err) {
    console.error(`Failed to create profile: ${err.message}`);
    process.exit(1);
  }
}

// Link management command handlers
async function runLinkCommand(action, argv) {
  const LinkManager = require('../server/linkManager');
  const { validateGraph } = require('../server/shared/linkValidation');
  const markdownDir = argv.markdownDir || path.resolve(process.cwd(), 'markdown');

  const linkManager = new LinkManager(markdownDir);

  try {
    await linkManager.initialize();

    switch (action) {
      case 'list': {
        if (!argv.file) {
          console.error('Error: --file option is required for "list" command');
          process.exit(1);
        }

        const links = linkManager.getLinksForFile(argv.file);

        console.log(`\nLinks for "${argv.file}":\n`);
        console.log(`Outgoing links (${links.outgoing.length}):`);
        links.outgoing.forEach((link, i) => {
          const rel = link.relationType ? ` [${link.relationType}]` : '';
          console.log(`  ${i + 1}. → ${link.to}${rel}`);
        });

        console.log(`\nIncoming links (${links.incoming.length}):`);
        links.incoming.forEach((link, i) => {
          const rel = link.relationType ? ` [${link.relationType}]` : '';
          console.log(`  ${i + 1}. ← ${link.from}${rel}`);
        });

        console.log(`\nTotal: ${links.total} links`);
        break;
      }

      case 'add': {
        if (!argv.source || !argv.target) {
          console.error('Error: --source and --target options are required for "add" command');
          process.exit(1);
        }

        const edge = await linkManager.addLink(
          argv.source,
          argv.target,
          argv.linkType || 'wikilink',
          argv.type || null
        );

        console.log(`✓ Link added successfully:`);
        console.log(`  From: ${edge.from}`);
        console.log(`  To: ${edge.to}`);
        console.log(`  Type: ${edge.type}`);
        if (edge.relationType) {
          console.log(`  Relation: ${edge.relationType}`);
        }
        break;
      }

      case 'remove': {
        if (!argv.source || !argv.target) {
          console.error('Error: --source and --target options are required for "remove" command');
          process.exit(1);
        }

        const removed = await linkManager.removeLink(
          argv.source,
          argv.target,
          argv.type || null
        );

        if (removed) {
          console.log(`✓ Link removed successfully`);
        } else {
          console.log(`⚠ Link not found`);
        }
        break;
      }

      case 'validate': {
        const validation = linkManager.validateGraph();

        console.log('\nGraph Validation Results:\n');
        console.log(`Status: ${validation.valid ? '✓ Valid' : '✗ Invalid'}`);

        if (validation.errors.length > 0) {
          console.log(`\nErrors (${validation.errors.length}):`);
          validation.errors.forEach((error, i) => {
            console.log(`  ${i + 1}. ${error.message}`);
            if (error.details) {
              console.log(`     Details: ${JSON.stringify(error.details, null, 2)}`);
            }
          });
        }

        if (validation.warnings.length > 0) {
          console.log(`\nWarnings (${validation.warnings.length}):`);
          validation.warnings.forEach((warning, i) => {
            console.log(`  ${i + 1}. ${warning.message}`);
            if (warning.details && warning.details.length <= 5) {
              console.log(`     Details: ${JSON.stringify(warning.details, null, 2)}`);
            } else if (warning.details) {
              console.log(`     Details: ${warning.details.length} items (showing first 5)`);
              console.log(`     ${JSON.stringify(warning.details.slice(0, 5), null, 2)}`);
            }
          });
        }

        if (validation.valid && validation.warnings.length === 0) {
          console.log('\n✓ No issues found!');
        }
        break;
      }

      case 'export': {
        const format = argv.format || 'json';
        const graph = linkManager.exportGraph(format);
        const outputFile = argv.output || `link-graph.${format}`;

        await require('fs').promises.writeFile(outputFile, graph, 'utf-8');

        console.log(`✓ Graph exported to ${outputFile}`);
        console.log(`  Format: ${format}`);
        console.log(`  Nodes: ${linkManager.graph.nodes.length}`);
        console.log(`  Edges: ${linkManager.graph.edges.length}`);
        break;
      }

      case 'usage': {
        console.log(`
CoSpec AI Link Management CLI - Usage Guide for AI Tools

COMMANDS:

1. List links in a document:
   cospec-ai links list --file <path>

   Example:
   cospec-ai links list --file "specs/api.md"

   Output: JSON array of incoming and outgoing links

2. Add a link between documents:
   cospec-ai links add --source <path> --target <path> [--type <relation>]

   Example:
   cospec-ai links add --source "specs/api.md" --target "requirements/auth.md" --type "depends-on"

   Types: depends-on, related-to, implements, references, extends, supersedes, parent-of, child-of

3. Remove a link:
   cospec-ai links remove --source <path> --target <path> [--type <relation>]

   Example:
   cospec-ai links remove --source "specs/api.md" --target "requirements/auth.md"

4. Validate link integrity:
   cospec-ai links validate

   Checks for:
   - Broken links (targets don't exist)
   - Circular dependencies
   - Orphaned files
   - Invalid syntax

5. Export graph data:
   cospec-ai links export [--format json] [--output <file>]

   Example:
   cospec-ai links export --format json --output graph.json

   Output: Complete graph structure with nodes and edges

COMMON OPTIONS:
  --markdown-dir <path>  : Specify markdown directory (default: ./markdown)
  --help                 : Show command help

INTEGRATION TIPS:
- Use JSON parsing to process command output
- Exit codes: 0 = success, 1 = error
- All paths are relative to markdown directory
- Links are bidirectional (backlinks are automatically tracked)
`);
        break;
      }

      default:
        console.error(`Unknown links action: ${action}`);
        process.exit(1);
    }

    process.exit(0);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}

// Track if a command was executed
let commandExecuted = false;

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 [options]')
  .command(
    'list-profiles',
    'List all available profiles',
    () => {},
    async () => {
      commandExecuted = true;
      await listProfiles();
      process.exit(0);
    }
  )
  .command(
    'init-profile <name>',
    'Initialize a new profile',
    (yargs) => {
      return yargs.positional('name', {
        describe: 'Name of the profile to create',
        type: 'string'
      });
    },
    async (argv) => {
      commandExecuted = true;
      await initProfile(argv.name);
      process.exit(0);
    }
  )
  .command(
    'links <action>',
    'Manage document links and relationships',
    (yargs) => {
      return yargs
        .positional('action', {
          describe: 'Action to perform: list, add, remove, validate, export, usage',
          type: 'string',
          choices: ['list', 'add', 'remove', 'validate', 'export', 'usage']
        })
        .option('file', {
          alias: 'f',
          describe: 'File path (for list command)',
          type: 'string'
        })
        .option('source', {
          alias: 's',
          describe: 'Source file path (for add/remove commands)',
          type: 'string'
        })
        .option('target', {
          alias: 't',
          describe: 'Target file path (for add/remove commands)',
          type: 'string'
        })
        .option('type', {
          describe: 'Relationship type (depends-on, related-to, etc.)',
          type: 'string'
        })
        .option('format', {
          describe: 'Export format (for export command)',
          type: 'string',
          default: 'json'
        })
        .option('output', {
          alias: 'o',
          describe: 'Output file (for export command)',
          type: 'string'
        });
    },
    async (argv) => {
      commandExecuted = true;
      await runLinkCommand(argv.action, argv);
    }
  )
  .option('port', {
    alias: 'p',
    describe: 'Port to run the server on',
    default: 9280,
    type: 'number'
  })
  .option('markdown-dir', {
    alias: 'm',
    describe: 'Directory to store markdown files',
    default: path.resolve(process.cwd(), 'markdown'),
    type: 'string'
  })
  .option('api-port', {
    alias: 'a',
    describe: 'Port for API server (if separate, in single server mode this is ignored)',
    type: 'number',
    default: 9281
  })
  .option('profile', {
    alias: 'P',
    describe: 'Profile name to load from ~/.cospec-ai/profiles/',
    type: 'string'
  })
  .option('profile-editor', {
    describe: 'Launch in profile editor mode',
    type: 'boolean',
    default: false
  })
  .help()
  .argv;

// Set environment variables based on command line options
process.env.PORT = String(argv.port);
process.env.MARKDOWN_DIR = argv.markdownDir;
process.env.PROFILE_NAME = argv.profile || '';
process.env.PROFILE_EDITOR_MODE = argv.profileEditor ? 'true' : 'false';

// Start the main server only if no command was executed
if (!commandExecuted) {
  require('../server/index.js');
}