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