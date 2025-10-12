// functionRegistry.js - Registry of available functions for AI function calling

const listFiles = require('./functions/listFiles');
const readFile = require('./functions/readFile');
const writeFile = require('./functions/writeFile');
const createFile = require('./functions/createFile');
const deleteFile = require('./functions/deleteFile');
const searchContent = require('./functions/searchContent');
const getRequirements = require('./functions/getRequirements');
const getSystemDesign = require('./functions/getSystemDesign');

// Function registry with all available functions
const functionRegistry = {
  list_files: listFiles,
  read_file: readFile,
  write_file: writeFile,
  create_file: createFile,
  delete_file: deleteFile,
  search_content: searchContent,
  get_requirements: getRequirements,
  get_system_design: getSystemDesign
};

module.exports = {
  functionRegistry
};