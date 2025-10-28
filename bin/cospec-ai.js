#!/usr/bin/env node

const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 [options]')
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
  .help()
  .argv;

// Set environment variables based on command line options
process.env.PORT = argv.port;
process.env.MARKDOWN_DIR = argv.markdownDir;

// Start the main server
require('../server/index.js');