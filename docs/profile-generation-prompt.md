# Document Profile Generation Prompt

This prompt is designed for AI models to generate CoSpec AI document profiles based on user requirements. Use this prompt with your AI assistant to create custom profiles for your project needs.

---

## Instructions for AI Model

You are an expert system analyst and documentation architect. Your task is to generate a comprehensive CoSpec AI document profile based on the user's project description and requirements.

### User Input Format

The user will describe their project type, goals, and documentation needs. Examples:
- "I'm building a machine learning model and need documentation for datasets, model architecture, experiments, and results"
- "I need a profile for a mobile app project with user stories, UI specs, API contracts, and testing plans"
- "Create a profile for microservices architecture with service specs, deployment guides, and monitoring docs"

### Your Output Requirements

Generate a complete `profile.json` file following the schema below. Include:

1. **Profile Metadata**: Name, version, description
2. **Top-level Documents**: Critical documents at project root
3. **Folder Structure**: Organized documentation hierarchy
4. **Nested Documents**: Documents within folders
5. **Generation Prompts**: Clear, actionable prompts for each document
6. **AI Commands**: Shell commands for automated generation

### Profile JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "version", "description"],
  "properties": {
    "name": {
      "type": "string",
      "description": "Display name of the profile",
      "example": "Machine Learning Project Profile"
    },
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+$",
      "description": "Semantic version (e.g., 1.0.0)",
      "example": "1.0.0"
    },
    "description": {
      "type": "string",
      "description": "Brief description of the profile's purpose",
      "example": "Comprehensive documentation profile for ML model development and experimentation"
    },
    "documents": {
      "type": "array",
      "description": "Top-level required documents",
      "items": {
        "$ref": "#/definitions/document"
      }
    },
    "folders": {
      "type": "array",
      "description": "Folder structure with nested documents",
      "items": {
        "$ref": "#/definitions/folder"
      }
    }
  },
  "definitions": {
    "document": {
      "type": "object",
      "required": ["name", "path", "description"],
      "properties": {
        "name": {
          "type": "string",
          "description": "Document display name",
          "example": "Project Overview"
        },
        "path": {
          "type": "string",
          "description": "File path relative to markdown directory (use .md extension)",
          "pattern": ".*\\.md$",
          "example": "README.md"
        },
        "description": {
          "type": "string",
          "description": "Purpose and content description",
          "example": "High-level project overview, goals, and quick start guide"
        },
        "promptFile": {
          "type": "string",
          "description": "Path to prompt file relative to profile directory",
          "pattern": "^prompts/.*\\.md$",
          "example": "prompts/readme.md"
        },
        "promptText": {
          "type": "string",
          "description": "Inline prompt text for generation (used if promptFile not specified)",
          "example": "Generate a comprehensive README with project overview, setup instructions, and usage examples"
        },
        "command": {
          "type": "string",
          "description": "Shell command for AI generation (supports {promptFile}, {filePath}, {promptText} variables)",
          "example": "kai agent execute --prompt-file {promptFile} --output {filePath}"
        }
      }
    },
    "folder": {
      "type": "object",
      "required": ["name", "path", "description"],
      "properties": {
        "name": {
          "type": "string",
          "description": "Folder display name",
          "example": "Requirements"
        },
        "path": {
          "type": "string",
          "description": "Folder path relative to markdown directory (must end with /)",
          "pattern": ".*/$",
          "example": "requirements/"
        },
        "description": {
          "type": "string",
          "description": "Purpose of the folder",
          "example": "Detailed requirements and specifications"
        },
        "documentType": {
          "type": "string",
          "description": "Type of documents in this folder (for categorization)",
          "example": "requirement"
        },
        "documents": {
          "type": "array",
          "description": "Documents within this folder",
          "items": {
            "$ref": "#/definitions/document"
          }
        }
      }
    }
  }
}
```

### Document Generation Guidelines

For each document, provide:

1. **Clear Path**: Use descriptive filenames with `.md` extension
   - Good: `model-architecture.md`, `api-specification.md`
   - Bad: `doc1.md`, `file.md`

2. **Descriptive Name**: User-friendly display name
   - Good: "Model Architecture Document", "API Specification"
   - Bad: "Doc", "File"

3. **Purpose Description**: Explain what the document contains and why it's needed
   - Include key sections or topics covered
   - Mention who would use this document
   - Specify the level of detail expected

4. **Generation Prompt**: Create actionable prompt for AI generation
   - Be specific about structure and sections
   - Include examples where helpful
   - Specify format requirements (headers, tables, code blocks)
   - Mention any standards or conventions to follow

5. **Command Template**: Use standard command format
   ```bash
   kai agent execute --prompt-file {promptFile} --output {filePath}
   ```

### Folder Organization Best Practices

1. **Group Related Documents**:
   - `requirements/` - All requirement docs
   - `design/` - Architecture and design docs
   - `specs/` - Technical specifications
   - `guides/` - User and developer guides

2. **Use Clear Hierarchy**:
   - Top-level docs: Critical, frequently accessed (README, SPEC)
   - Folder docs: Detailed, organized by topic

3. **Document Types**:
   - `requirement` - Requirements and user stories
   - `specification` - Technical specs and API contracts
   - `design` - Architecture and design documents
   - `guide` - How-to guides and tutorials
   - `report` - Status reports and analysis

### Example Profiles by Project Type

**Web Application:**
- README.md (overview)
- SPEC.md (overall spec)
- requirements/ (user stories, features)
- design/ (UI/UX, architecture)
- api/ (API contracts)

**Data Science:**
- README.md (project overview)
- data/ (dataset descriptions)
- models/ (model architecture, experiments)
- results/ (analysis, reports)

**Microservices:**
- README.md (system overview)
- services/ (per-service specs)
- deployment/ (deployment guides)
- monitoring/ (observability docs)

**Mobile App:**
- README.md (app overview)
- requirements/ (user stories)
- screens/ (UI specifications)
- api/ (backend contracts)
- testing/ (test plans)

### Prompt File Content Guidelines

When generating prompt files (in `prompts/` directory):

1. **Structure Template**: Provide markdown structure
   ```markdown
   # [Document Title]

   ## Section 1
   ...

   ## Section 2
   ...
   ```

2. **Content Guidelines**: Explain what to include in each section

3. **Format Requirements**: Specify:
   - Heading levels
   - List styles (bullet vs numbered)
   - Table formats
   - Code block languages

4. **Examples**: Include sample content where helpful

5. **Constraints**: Mention word counts, technical level, audience

### Example Output

Generate output in this format:

```markdown
## Generated Profile: [Profile Name]

### profile.json
\`\`\`json
{
  "name": "...",
  "version": "1.0.0",
  "description": "...",
  "documents": [...],
  "folders": [...]
}
\`\`\`

### Prompt Files

#### prompts/readme.md
\`\`\`markdown
# Generate Project README

Generate a comprehensive README.md with the following structure:
...
\`\`\`

#### prompts/[other-prompt].md
\`\`\`markdown
...
\`\`\`

### Setup Instructions

1. Create profile directory:
   \`\`\`bash
   mkdir -p ~/.cospec-ai/profiles/[profile-name]
   mkdir -p ~/.cospec-ai/profiles/[profile-name]/prompts
   \`\`\`

2. Save profile.json:
   \`\`\`bash
   cat > ~/.cospec-ai/profiles/[profile-name]/profile.json << 'EOF'
   [paste profile.json content]
   EOF
   \`\`\`

3. Save prompt files:
   \`\`\`bash
   cat > ~/.cospec-ai/profiles/[profile-name]/prompts/[name].md << 'EOF'
   [paste prompt content]
   EOF
   \`\`\`

4. Activate profile:
   \`\`\`bash
   npx cospec-ai --profile [profile-name]
   \`\`\`
```

---

## Usage Instructions for Users

1. **Describe Your Project**: Tell the AI about your project type and documentation needs

2. **Review Output**: Check the generated profile structure and prompts

3. **Customize**: Modify profile.json and prompts to fit your specific needs

4. **Create Profile**: Follow the setup instructions to create the profile

5. **Test**: Start CoSpec AI with the profile and test document generation

6. **Iterate**: Refine prompts based on generated content quality

---

## Example User Request

**User**: "I'm building a REST API for an e-commerce platform. I need documentation for endpoints, data models, authentication, error handling, and deployment configuration. The API will have multiple versions and needs clear versioning docs."

**Expected AI Output**: A complete profile with:
- `profile.json` defining documents for API specs, data models, auth guide, error codes, deployment, versioning
- Folder structure: `api/`, `models/`, `deployment/`, `guides/`
- Prompt files for each document with specific e-commerce API context
- Commands using Kai agent for generation

---

## Tips for Best Results

1. **Be Specific**: Mention your technology stack, project scale, team size
2. **List Priorities**: Indicate which documents are most critical
3. **Mention Standards**: Reference any documentation standards you follow
4. **Describe Audience**: Specify who will use the docs (developers, PMs, users)
5. **Include Constraints**: Mention any format requirements or limitations

---

## Schema Validation

The generated profile will be validated against the schema. Common issues:

- **Missing required fields**: name, version, description
- **Invalid version format**: Must be semver (e.g., 1.0.0)
- **Incorrect paths**: Documents must end with .md, folders with /
- **Invalid promptFile paths**: Must start with "prompts/"
- **Missing command variables**: Use {promptFile}, {filePath}, {promptText}

Ensure all paths are relative and follow the patterns specified in the schema.
