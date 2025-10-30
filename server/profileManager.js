const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * ProfileManager handles loading, validating, and managing document profiles
 * Profiles are stored in ~/.cospec-ai/profiles/<profile-name>/
 */
class ProfileManager {
  constructor() {
    this.profile = null;
    this.profileName = null;
    this.profilePath = null;
    this.baseProfileDir = path.join(os.homedir(), '.cospec-ai', 'profiles');
  }

  /**
   * Get the base profiles directory path
   */
  getBaseProfileDir() {
    return this.baseProfileDir;
  }

  /**
   * Get the current profile directory path
   */
  getProfilePath() {
    return this.profilePath;
  }

  /**
   * Get the current profile name
   */
  getProfileName() {
    return this.profileName;
  }

  /**
   * Load a profile by name
   * @param {string} profileName - Name of the profile (subdirectory name)
   * @returns {Promise<Object>} The loaded profile configuration
   */
  async loadProfile(profileName) {
    try {
      this.profileName = profileName;
      this.profilePath = path.join(this.baseProfileDir, profileName);

      const profileJsonPath = path.join(this.profilePath, 'profile.json');

      // Check if profile exists
      try {
        await fs.access(profileJsonPath);
      } catch (err) {
        throw new Error(`Profile "${profileName}" not found at ${profileJsonPath}`);
      }

      // Load profile JSON
      const profileContent = await fs.readFile(profileJsonPath, 'utf-8');
      this.profile = JSON.parse(profileContent);

      // Validate profile
      await this.validateProfile(this.profile);

      console.log(`✓ Profile loaded: ${this.profile.name} (v${this.profile.version || '1.0.0'})`);

      return this.profile;
    } catch (err) {
      console.error(`✗ Failed to load profile "${profileName}":`, err.message);
      throw err;
    }
  }

  /**
   * Validate profile configuration
   * @param {Object} profile - Profile configuration to validate
   * @returns {Promise<Object>} Validation result with warnings
   */
  async validateProfile(profile) {
    const warnings = [];
    const errors = [];

    // Check required fields
    if (!profile.name) {
      errors.push('Profile must have a "name" field');
    }

    if (!profile.documents && !profile.folders) {
      errors.push('Profile must have at least one "documents" or "folders" entry');
    }

    // Validate documents
    if (profile.documents) {
      for (const doc of profile.documents) {
        const docWarnings = await this.validateDocument(doc, 'document');
        warnings.push(...docWarnings);
      }
    }

    // Validate folders
    if (profile.folders) {
      for (const folder of profile.folders) {
        if (!folder.path) {
          errors.push(`Folder "${folder.name}" missing "path" field`);
          continue;
        }

        // Validate folder's documents
        if (folder.documents) {
          for (const doc of folder.documents) {
            const docWarnings = await this.validateDocument(doc, `folder: ${folder.name}`);
            warnings.push(...docWarnings);
          }
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Profile validation failed:\n${errors.join('\n')}`);
    }

    if (warnings.length > 0) {
      console.warn('Profile validation warnings:');
      warnings.forEach(w => console.warn(`  - ${w}`));
    }

    return { valid: true, warnings, errors };
  }

  /**
   * Validate a single document configuration
   * @param {Object} doc - Document configuration
   * @param {string} context - Context for error messages
   * @returns {Promise<Array<string>>} Array of warning messages
   */
  async validateDocument(doc, context) {
    const warnings = [];

    if (!doc.name) {
      warnings.push(`Document in ${context} missing "name" field`);
    }

    if (!doc.path) {
      warnings.push(`Document "${doc.name}" in ${context} missing "path" field`);
    }

    // Check if prompt file exists
    if (doc.promptFile) {
      try {
        const promptPath = this.resolvePromptFile(doc.promptFile);
        await fs.access(promptPath);
      } catch (err) {
        warnings.push(`Prompt file "${doc.promptFile}" not found for document "${doc.name}"`);
      }
    }

    // Validate command has required variables
    if (doc.command) {
      const requiredVars = ['{filePath}'];
      const missingVars = requiredVars.filter(v => !doc.command.includes(v));
      if (missingVars.length > 0) {
        warnings.push(`Command for "${doc.name}" missing variables: ${missingVars.join(', ')}`);
      }
    }

    return warnings;
  }

  /**
   * Resolve a relative prompt file path to absolute path
   * @param {string} relativePath - Relative path from profile directory (e.g., "prompts/api-spec.md")
   * @returns {string} Absolute path to prompt file
   */
  resolvePromptFile(relativePath) {
    if (!this.profilePath) {
      throw new Error('No profile loaded');
    }

    return path.join(this.profilePath, relativePath);
  }

  /**
   * Get a document configuration by file path
   * @param {string} filePath - Path to the document in markdown directory
   * @returns {Object|null} Document configuration or null if not found
   */
  getDocumentByPath(filePath) {
    if (!this.profile) {
      return null;
    }

    // Search in top-level documents
    if (this.profile.documents) {
      const doc = this.profile.documents.find(d => d.path === filePath);
      if (doc) return doc;
    }

    // Search in folders
    if (this.profile.folders) {
      for (const folder of this.profile.folders) {
        if (folder.documents) {
          const doc = folder.documents.find(d => d.path === filePath);
          if (doc) return doc;
        }
      }
    }

    return null;
  }

  /**
   * Get all required file paths from profile
   * @returns {Array<string>} Array of file paths
   */
  getAllRequiredFiles() {
    if (!this.profile) {
      return [];
    }

    const files = [];

    // Add top-level documents
    if (this.profile.documents) {
      files.push(...this.profile.documents.map(d => d.path));
    }

    // Add folder documents
    if (this.profile.folders) {
      for (const folder of this.profile.folders) {
        if (folder.documents) {
          files.push(...folder.documents.map(d => d.path));
        }
      }
    }

    return files;
  }

  /**
   * Get generation context for a document
   * @param {string} filePath - Path to the document
   * @returns {Object} Context object with promptFile, promptText, command
   */
  getGenerationContext(filePath) {
    const doc = this.getDocumentByPath(filePath);
    if (!doc) {
      throw new Error(`Document not found in profile: ${filePath}`);
    }

    let promptFilePath = null;
    if (doc.promptFile) {
      promptFilePath = this.resolvePromptFile(doc.promptFile);
    }

    return {
      document: doc,
      promptFile: promptFilePath,
      promptText: doc.promptText || '',
      command: doc.command || null,
    };
  }

  /**
   * List all available profiles
   * @returns {Promise<Array<string>>} Array of profile names
   */
  async listAvailableProfiles() {
    try {
      // Ensure base directory exists
      await fs.mkdir(this.baseProfileDir, { recursive: true });

      const entries = await fs.readdir(this.baseProfileDir, { withFileTypes: true });
      const profiles = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Check if profile.json exists
          const profileJsonPath = path.join(this.baseProfileDir, entry.name, 'profile.json');
          try {
            await fs.access(profileJsonPath);
            profiles.push(entry.name);
          } catch (err) {
            // Skip directories without profile.json
          }
        }
      }

      return profiles;
    } catch (err) {
      console.error('Failed to list profiles:', err.message);
      return [];
    }
  }

  /**
   * Get the current profile configuration
   * @returns {Object|null} Profile configuration or null if not loaded
   */
  getProfile() {
    return this.profile;
  }

  /**
   * Check if a profile is currently loaded
   * @returns {boolean} True if profile is loaded
   */
  isLoaded() {
    return this.profile !== null;
  }

  /**
   * Annotate file list with profile metadata
   * @param {Array<Object>} files - Array of file objects with {path, name}
   * @param {string} markdownDir - Path to markdown directory
   * @returns {Promise<Array<Object>>} Annotated file list with existence status
   */
  async annotateFiles(files, markdownDir) {
    if (!this.profile) {
      return files;
    }

    const requiredFiles = this.getAllRequiredFiles();
    const existingPaths = new Set(files.map(f => f.path));
    const annotatedFiles = [...files];

    // Add ghost entries for missing required files
    for (const requiredPath of requiredFiles) {
      if (!existingPaths.has(requiredPath)) {
        const doc = this.getDocumentByPath(requiredPath);
        annotatedFiles.push({
          path: requiredPath,
          name: path.basename(requiredPath),
          exists: false,
          profileMetadata: {
            required: true,
            documentName: doc.name,
            description: doc.description,
            hasPrompt: !!doc.promptFile,
            hasCommand: !!doc.command,
          },
        });
      } else {
        // Mark existing files as required
        const file = annotatedFiles.find(f => f.path === requiredPath);
        if (file) {
          const doc = this.getDocumentByPath(requiredPath);
          file.exists = true;
          file.profileMetadata = {
            required: true,
            documentName: doc.name,
            description: doc.description,
            hasPrompt: !!doc.promptFile,
            hasCommand: !!doc.command,
          };
        }
      }
    }

    return annotatedFiles;
  }

  /**
   * Create a new profile
   * @param {string} profileName - Name of the profile to create
   * @param {Object} config - Profile configuration
   * @returns {Promise<Object>} Created profile configuration
   */
  async createProfile(profileName, config) {
    const profilePath = path.join(this.baseProfileDir, profileName);
    const profileJsonPath = path.join(profilePath, 'profile.json');
    const promptsPath = path.join(profilePath, 'prompts');

    try {
      // Check if profile already exists
      try {
        await fs.access(profileJsonPath);
        throw new Error(`Profile "${profileName}" already exists`);
      } catch (err) {
        if (err.message.includes('already exists')) throw err;
        // Profile doesn't exist, proceed
      }

      // Validate configuration before creating
      await this.validateProfile(config);

      // Create directory structure
      await fs.mkdir(promptsPath, { recursive: true });

      // Write profile.json
      await fs.writeFile(
        profileJsonPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      console.log(`✓ Profile "${profileName}" created successfully`);
      return config;
    } catch (err) {
      console.error(`✗ Failed to create profile "${profileName}":`, err.message);
      throw err;
    }
  }

  /**
   * Update an existing profile
   * @param {string} profileName - Name of the profile to update
   * @param {Object} config - Updated profile configuration
   * @returns {Promise<Object>} Updated profile configuration
   */
  async updateProfile(profileName, config) {
    const profilePath = path.join(this.baseProfileDir, profileName);
    const profileJsonPath = path.join(profilePath, 'profile.json');
    const backupPath = path.join(profilePath, 'profile.json.backup');

    try {
      // Check if profile exists
      try {
        await fs.access(profileJsonPath);
      } catch (err) {
        throw new Error(`Profile "${profileName}" not found`);
      }

      // Validate configuration before updating
      await this.validateProfile(config);

      // Create backup of existing profile
      const existingContent = await fs.readFile(profileJsonPath, 'utf-8');
      await fs.writeFile(backupPath, existingContent, 'utf-8');

      // Write updated profile
      await fs.writeFile(
        profileJsonPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // If this is the currently loaded profile, reload it
      if (this.profileName === profileName) {
        await this.loadProfile(profileName);
      }

      console.log(`✓ Profile "${profileName}" updated successfully`);
      return config;
    } catch (err) {
      console.error(`✗ Failed to update profile "${profileName}":`, err.message);
      // Restore from backup if update failed
      try {
        const backupContent = await fs.readFile(backupPath, 'utf-8');
        await fs.writeFile(profileJsonPath, backupContent, 'utf-8');
      } catch (restoreErr) {
        console.error('Failed to restore backup:', restoreErr.message);
      }
      throw err;
    }
  }

  /**
   * Delete a profile
   * @param {string} profileName - Name of the profile to delete
   * @returns {Promise<void>}
   */
  async deleteProfile(profileName) {
    const profilePath = path.join(this.baseProfileDir, profileName);

    try {
      // Check if profile exists
      try {
        await fs.access(profilePath);
      } catch (err) {
        throw new Error(`Profile "${profileName}" not found`);
      }

      // Prevent deletion of currently loaded profile
      if (this.profileName === profileName) {
        throw new Error('Cannot delete currently loaded profile');
      }

      // Delete profile directory recursively
      await fs.rm(profilePath, { recursive: true, force: true });

      console.log(`✓ Profile "${profileName}" deleted successfully`);
    } catch (err) {
      console.error(`✗ Failed to delete profile "${profileName}":`, err.message);
      throw err;
    }
  }

  /**
   * Reload/switch to a different profile
   * @param {string} profileName - Name of the profile to load
   * @returns {Promise<Object>} Loaded profile configuration
   */
  async reloadProfile(profileName) {
    try {
      await this.loadProfile(profileName);
      console.log(`✓ Profile switched to "${profileName}"`);
      return this.profile;
    } catch (err) {
      console.error(`✗ Failed to reload profile "${profileName}":`, err.message);
      throw err;
    }
  }

  /**
   * Get profile content without loading it
   * @param {string} profileName - Name of the profile to read
   * @returns {Promise<Object>} Profile configuration
   */
  async getProfileContent(profileName) {
    try {
      const profilePath = path.join(this.baseProfileDir, profileName);
      const profileJsonPath = path.join(profilePath, 'profile.json');

      const content = await fs.readFile(profileJsonPath, 'utf-8');
      return JSON.parse(content);
    } catch (err) {
      throw new Error(`Failed to read profile "${profileName}": ${err.message}`);
    }
  }

  /**
   * Save or update a prompt file
   * @param {string} profileName - Name of the profile
   * @param {string} relativePath - Relative path to prompt file (e.g., "prompts/api-spec.md")
   * @param {string} content - Content of the prompt file
   * @returns {Promise<void>}
   */
  async savePromptFile(profileName, relativePath, content) {
    try {
      const profilePath = path.join(this.baseProfileDir, profileName);
      const promptFilePath = path.join(profilePath, relativePath);
      const promptDir = path.dirname(promptFilePath);

      // Ensure directory exists
      await fs.mkdir(promptDir, { recursive: true });

      // Write prompt file
      await fs.writeFile(promptFilePath, content, 'utf-8');

      console.log(`✓ Prompt file saved: ${relativePath}`);
    } catch (err) {
      console.error(`✗ Failed to save prompt file "${relativePath}":`, err.message);
      throw err;
    }
  }

  /**
   * Delete a prompt file
   * @param {string} profileName - Name of the profile
   * @param {string} relativePath - Relative path to prompt file
   * @returns {Promise<void>}
   */
  async deletePromptFile(profileName, relativePath) {
    try {
      const profilePath = path.join(this.baseProfileDir, profileName);
      const promptFilePath = path.join(profilePath, relativePath);

      await fs.unlink(promptFilePath);

      console.log(`✓ Prompt file deleted: ${relativePath}`);
    } catch (err) {
      console.error(`✗ Failed to delete prompt file "${relativePath}":`, err.message);
      throw err;
    }
  }

  /**
   * Read a prompt file content
   * @param {string} profileName - Name of the profile
   * @param {string} relativePath - Relative path to prompt file
   * @returns {Promise<string>} Content of the prompt file
   */
  async readPromptFile(profileName, relativePath) {
    try {
      const profilePath = path.join(this.baseProfileDir, profileName);
      const promptFilePath = path.join(profilePath, relativePath);

      return await fs.readFile(promptFilePath, 'utf-8');
    } catch (err) {
      throw new Error(`Failed to read prompt file "${relativePath}": ${err.message}`);
    }
  }
}

// Singleton instance
const profileManager = new ProfileManager();

module.exports = profileManager;
