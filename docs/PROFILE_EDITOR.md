# Profile Editor

The Profile Editor is a specialized mode of CoSpec AI that allows you to create and manage document profiles through a visual interface.

## Overview

Document Profiles define:
- Required documents for a project
- Folder structure for organizing documents
- AI generation commands for automated document creation
- Prompt templates for consistent document generation

The Profile Editor provides a user-friendly interface to create and modify these profiles without manually editing JSON files.

## Launching Profile Editor

To start CoSpec AI in Profile Editor mode:

```bash
npx cospec-ai --profile-editor
```

This launches a separate interface dedicated to profile management, distinct from the regular markdown editing mode.

## Features

### 1. Profile Browser

The main screen lists all available profiles stored in `~/.cospec-ai/profiles/`:

- **View all profiles**: See all profiles with their names and locations
- **Create new profile**: Start from scratch or clone an existing profile
- **Edit profile**: Modify profile configuration
- **Delete profile**: Remove profiles you no longer need
- **Activate profile**: Hot-reload a profile without restarting the server
- **Active indicator**: See which profile is currently loaded

### 2. Profile Editor

The editor interface allows you to configure:

#### Basic Information
- **Profile Folder Name**: Directory name in `~/.cospec-ai/profiles/`
- **Profile Name**: Display name shown in the UI
- **Version**: Semantic version (e.g., "1.0.0")
- **Description**: Brief description of the profile's purpose

#### Top-Level Documents
Required documents at the root of your markdown directory:

For each document, configure:
- **Name**: Display name
- **Path**: Relative path in markdown directory (e.g., `SPEC.md`)
- **Description**: Purpose of the document
- **Prompt File**: Path to prompt template (e.g., `prompts/api-spec.md`)
- **Prompt Text**: Additional generation context
- **Command**: Shell command for generation with variables:
  - `{filePath}`: Target file path
  - `{promptFile}`: Absolute path to prompt file
  - `{promptText}`: Value from promptText field

#### Folders
Organized collections of related documents:

For each folder, configure:
- **Name**: Display name
- **Path**: Relative path (e.g., `requirements/`)
- **Description**: Purpose of the folder
- **Document Type**: Category of documents (e.g., "requirement", "spec")
- **Documents**: List of documents within the folder (same fields as top-level documents)

### 3. Prompt File Manager

The editor includes a simple textarea for quick prompt file editing:

- **Quick Edit**: Edit prompt content directly in the profile editor
- **Auto-Save**: Save changes to the prompt file
- **Preview**: Expand/collapse to view prompt content
- **File Creation**: Automatically creates prompt files if they don't exist

For detailed prompt editing with full Markdown support, use the "Open in Editor" option to switch to the main markdown editor.

### 4. Profile Validation

The editor validates your configuration in real-time:

- **Required Fields**: Ensures name, path are filled
- **Duplicate Paths**: Warns if multiple documents target the same file
- **Command Validation**: Checks that required variables are present
- **Prompt File Existence**: Warns if referenced prompt files are missing
- **Profile Structure**: Ensures at least one document or folder is defined

### 5. Hot Reload

When you activate a different profile:

1. Profile configuration is reloaded on the server
2. File cache is invalidated
3. All connected clients are notified via WebSocket
4. File tree updates with new profile metadata
5. No server restart required

This allows you to:
- Switch between profiles instantly
- Test different profile configurations
- Update active profiles without downtime

## Workflow Examples

### Creating a New Profile

1. Launch Profile Editor:
   ```bash
   npx cospec-ai --profile-editor
   ```

2. Click "Create New Profile"

3. Fill in basic information:
   - Folder name: `my-api-project`
   - Profile name: `REST API Development`
   - Description: `Profile for REST API projects`

4. Add top-level documents:
   - Name: `API Specification`
   - Path: `SPEC.md`
   - Prompt File: `prompts/api-spec.md`
   - Command: `kai agent execute --prompt-file {promptFile} --output {filePath}`

5. Create a folder:
   - Name: `Requirements`
   - Path: `requirements/`
   - Add documents for functional and non-functional requirements

6. Click "Save Profile"

7. Profile is created at `~/.cospec-ai/profiles/my-api-project/`

### Editing an Existing Profile

1. Launch Profile Editor

2. Click "Edit" on the profile you want to modify

3. Make changes:
   - Add/remove documents
   - Update commands
   - Modify prompt files
   - Reorder entries

4. Click "Save Profile"

5. Changes are saved with automatic backup (`.backup` file created)

### Activating a Profile

1. In Profile Browser, click the "Play" button on a profile

2. Profile is hot-reloaded:
   - Server loads new profile configuration
   - File cache refreshes
   - All clients receive update notification

3. The profile is now active (shown with green "Active" badge)

4. Return to markdown editor mode to work with the active profile:
   ```bash
   npx cospec-ai --profile my-api-project
   ```

## File Structure

When you create a profile, the following structure is generated:

```
~/.cospec-ai/profiles/
└── my-profile/
    ├── profile.json           # Main configuration
    ├── profile.json.backup    # Auto-created backup
    └── prompts/               # Prompt templates
        ├── api-spec.md
        ├── requirements.md
        └── architecture.md
```

### profile.json Structure

```json
{
  "name": "My Profile",
  "version": "1.0.0",
  "description": "Profile description",
  "documents": [
    {
      "name": "API Specification",
      "path": "SPEC.md",
      "description": "Main API spec",
      "promptFile": "prompts/api-spec.md",
      "promptText": "Generate comprehensive API documentation",
      "command": "kai agent execute --prompt-file {promptFile} --output {filePath}"
    }
  ],
  "folders": [
    {
      "name": "Requirements",
      "path": "requirements/",
      "description": "Requirements documentation",
      "documentType": "requirement",
      "documents": [
        {
          "name": "Functional Requirements",
          "path": "requirements/functional.md",
          "description": "Functional requirements doc",
          "promptFile": "prompts/functional-req.md",
          "command": "kai agent execute --prompt-file {promptFile} --output {filePath}"
        }
      ]
    }
  ]
}
```

## API Endpoints

The Profile Editor uses the following API endpoints:

### Profile Management
- `GET /api/profiles` - List all available profiles
- `GET /api/profiles/:name` - Get specific profile content
- `POST /api/profiles` - Create new profile (requires auth)
- `PUT /api/profiles/:name` - Update profile (requires auth)
- `DELETE /api/profiles/:name` - Delete profile (requires auth)
- `POST /api/profiles/:name/load` - Activate profile (requires auth)

### Prompt File Management
- `GET /api/profiles/:name/prompts/:path(*)` - Get prompt file content
- `POST /api/profiles/:name/prompts` - Create/update prompt file (requires auth)
- `DELETE /api/profiles/:name/prompts` - Delete prompt file (requires auth)

### Configuration
- `GET /api/config` - Get app configuration (profile editor mode status)

All write operations require authentication via `Authorization` header.

## WebSocket Events

The Profile Editor listens for real-time events:

### profile-reloaded
Emitted when a profile is hot-reloaded:

```typescript
{
  profileName: string,
  profile: Profile
}
```

Clients receive this event and update their UI to reflect the new active profile.

## Best Practices

### 1. Profile Organization
- Use descriptive folder names (kebab-case recommended)
- Group related documents in folders
- Use consistent naming conventions

### 2. Prompt Files
- Keep prompts focused and specific
- Include clear instructions for AI agents
- Provide structure templates in prompts
- Add examples for better results

### 3. Generation Commands
- Always include `{filePath}` variable
- Test commands manually before adding to profile
- Use absolute paths via variable substitution
- Handle errors gracefully

### 4. Validation
- Fix validation errors before saving
- Pay attention to duplicate paths
- Ensure prompt files exist before referencing
- Test generation commands

### 5. Version Control
- Keep profile.json in version control
- Share profiles across team members
- Document changes in description or version
- Use semantic versioning

### 6. Backup
- Profile Editor creates automatic backups
- Keep backups of custom profiles
- Test profile changes before deploying

## Troubleshooting

### Profile Editor won't start
- Ensure `~/.cospec-ai/profiles/` directory exists
- Check file permissions
- Verify no port conflicts (default: 9280)

### Cannot save profile
- Check authentication (API_KEY environment variable)
- Verify profile name doesn't already exist (for new profiles)
- Check file system permissions
- Review validation errors

### Prompt files not found
- Ensure prompt files exist in profile directory
- Check path is relative to profile directory (not markdown directory)
- Verify no typos in promptFile field

### Hot reload not working
- Check WebSocket connection
- Verify browser console for errors
- Ensure `profile-reloaded` event is received
- Try refreshing the page

### Changes not appearing
- Save profile before activating
- Refresh file tree after profile reload
- Check server logs for errors
- Verify WebSocket connection

## Integration with Kai Agents

The Profile Editor is designed to work seamlessly with Kai's agent system:

### Example Command

```bash
kai agent execute --prompt-file {promptFile} --output {filePath} --context "{promptText}"
```

### Workflow

1. User triggers generation from markdown editor
2. CoSpec AI retrieves generation context from active profile
3. Command is executed with variable substitution
4. Kai agent reads prompt file
5. Kai agent generates content
6. Output written to target file
7. CoSpec AI detects new file and refreshes tree

## Security Considerations

1. **Authentication**: All write operations require API key
2. **Path Sanitization**: File paths are validated to prevent directory traversal
3. **Command Execution**: Commands run with user permissions
4. **File Access**: Limited to profile and markdown directories
5. **Validation**: Profile configurations are validated before saving

## Future Enhancements

Potential improvements for the Profile Editor:

- **Profile Templates**: Gallery of pre-built profiles
- **Import/Export**: Share profiles as ZIP files
- **Rich Text Editor**: Full Vditor integration for prompt editing
- **Live Preview**: Preview generated file structure
- **Test Mode**: Dry-run for generation commands
- **Profile Marketplace**: Share and discover community profiles
- **Version History**: Track profile changes over time
- **Conflict Resolution**: Handle concurrent edits gracefully

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Main project documentation
- [PROFILE_FEATURE_PLAN.md](PROFILE_FEATURE_PLAN.md) - Original profile feature specification
- [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md) - Development environment setup
