# Document Profile Feature - Implementation Plan

## Overview

The Document Profile Feature allows users to define required documents and folders with AI generation capabilities. All profile-related files (profile JSON + agent prompt files) are stored in `~/.cospec-ai/profiles/` and specified via CLI.

## User Requirements

1. **Profile Storage**: Profiles stored in `~/.cospec-ai/profiles/<profile-name>/`
2. **Profile Contents**:
   - Named documents with descriptions and generation prompts
   - Named folders for specific document types
   - Agent prompt files for AI generation
   - Generation commands for each document/folder
3. **UI Features**:
   - Collapsible sidebar showing profile structure
   - Dedicated page for profile details
   - File tree annotations for missing files
   - Modern, simple design using shadcn/ui
4. **CLI Integration**: `npx cospec-ai --profile <name>`
5. **AI Generation**: Execute external commands (Kai agents) with prompt files

## Profile Directory Structure

```
~/.cospec-ai/
└── profiles/
    ├── api-development/
    │   ├── profile.json          # Main profile configuration
    │   ├── prompts/
    │   │   ├── api-spec.md       # Agent prompt for API spec generation
    │   │   ├── requirements.md   # Agent prompt for requirements
    │   │   └── testing.md        # Agent prompt for test docs
    │   └── templates/            # Optional static templates
    │       └── spec-template.md
    └── technical-docs/
        ├── profile.json
        └── prompts/
            └── architecture.md
```

## Profile Schema

### Profile JSON Structure

```json
{
  "name": "API Development",
  "version": "1.0.0",
  "description": "Profile for API development projects",
  "documents": [
    {
      "name": "API Specification",
      "path": "SPEC.md",
      "description": "Main API specification document",
      "promptFile": "prompts/api-spec.md",
      "promptText": "Generate comprehensive API spec with REST endpoints",
      "command": "kai agent execute --prompt-file {promptFile} --output {filePath}"
    }
  ],
  "folders": [
    {
      "name": "Requirements",
      "path": "requirements/",
      "description": "All requirement documents",
      "documentType": "requirement",
      "promptFile": "prompts/requirements.md",
      "documents": [
        {
          "name": "API Requirements",
          "path": "requirements/api-requirements.md",
          "description": "Detailed API requirements",
          "promptFile": "prompts/requirements.md",
          "promptText": "Generate API requirements focusing on REST design",
          "command": "kai agent execute --prompt-file {promptFile} --output {filePath}"
        }
      ]
    }
  ]
}
```

### Command Variable Substitution

Commands support the following variables:
- `{promptFile}` - Absolute path to the prompt file
- `{filePath}` - Absolute path to the target file in markdown directory
- `{promptText}` - The promptText value from profile

Example:
```bash
kai agent execute --prompt-file {promptFile} --output {filePath} --context "{promptText}"
```

## Implementation Phases

### Phase 1: Profile System Foundation (Backend)

**Files to Create/Modify:**
- `/server/profileManager.js` (NEW)
- `/bin/cospec-ai.js` (MODIFY)
- `/server/index.js` (MODIFY)

**Tasks:**
1. Create `profileManager.js` module:
   - `loadProfile(profileName)` - Load from `~/.cospec-ai/profiles/<name>/profile.json`
   - `validateProfile(config)` - Validate schema and check prompt file existence
   - `resolvePromptFile(relativePath)` - Convert relative to absolute path
   - `getGenerationContext(filePath)` - Get prompt file + text for document
   - `getProfilePath()` - Return profile directory path
   - `listAvailableProfiles()` - List all profiles in `~/.cospec-ai/profiles/`

2. Extend CLI (`/bin/cospec-ai.js`):
   - Add `--profile <name>` argument (yargs)
   - Set `PROFILE_NAME` environment variable
   - Add `init-profile <name>` command to create profile skeleton

3. Extend server (`/server/index.js`):
   - Load profile on startup if `PROFILE_NAME` set
   - Add API endpoints:
     - `GET /api/profile` - Return profile config
     - `GET /api/profile/files` - Return required files with existence status
     - `GET /api/profile/prompt/:documentPath` - Get prompt file content
     - `POST /api/profile/generate/:path` - Execute generation command
     - `GET /api/profile/validate` - Validate profile configuration
   - Merge profile files into file list response

### Phase 2: Frontend State & Data Flow

**Files to Create/Modify:**
- `/app-react/src/types/profile.ts` (NEW)
- `/app-react/src/store/slices/profileSlice.ts` (NEW)
- `/app-react/src/store/index.ts` (MODIFY)
- `/app-react/src/services/api.ts` (MODIFY)

**Tasks:**
1. Define TypeScript types (`profile.ts`):
   ```typescript
   interface ProfileDocument {
     name: string;
     path: string;
     description: string;
     promptFile?: string;
     promptText?: string;
     command?: string;
     exists: boolean;
   }

   interface ProfileFolder {
     name: string;
     path: string;
     description: string;
     documentType: string;
     promptFile?: string;
     documents: ProfileDocument[];
   }

   interface Profile {
     name: string;
     version: string;
     description: string;
     documents: ProfileDocument[];
     folders: ProfileFolder[];
   }
   ```

2. Create Redux slice (`profileSlice.ts`):
   - State: profile config, loading state, generation state per file
   - Async thunks: fetchProfile, generateFile, fetchPromptContent
   - Reducers: setProfile, setGenerating, setError

3. Extend API client (`api.ts`):
   - `fetchProfile()` - GET /api/profile
   - `fetchProfileFiles()` - GET /api/profile/files
   - `fetchPromptContent(documentPath)` - GET /api/profile/prompt/:documentPath
   - `generateFile(path)` - POST /api/profile/generate/:path

### Phase 3: File Tree Enhancements

**Files to Modify:**
- `/app-react/src/components/FileTree/FileTree.tsx`
- `/app-react/src/components/FileTree/TreeNode.tsx` (if separate)

**Tasks:**
1. Merge profile files with actual files:
   - Combine actual files from API with profile-required files
   - Mark missing files with `exists: false`
   - Build tree structure including ghost entries

2. Add visual indicators for missing files:
   - Red warning icon (⚠️) before file name
   - Grayed out text (`text-gray-400 dark:text-gray-600`)
   - "Missing" badge (red, small)
   - Tooltip showing: "Required by profile: <document.name>"
   - Disabled drag/drop for ghost entries

3. Add folder badges:
   - Show badge with folder name from profile
   - Display folder description in tooltip
   - Auto-expand folders defined in profile

4. Extend context menu:
   - For missing files: "Generate from Profile" option (⚡ icon)
   - For existing required files: "Regenerate" option
   - "View Prompt" option for all profile files
   - Show command preview in submenu

### Phase 4: Profile UI Components

**Files to Create:**
- `/app-react/src/components/ProfileManager/ProfileSidebar.tsx`
- `/app-react/src/components/ProfileManager/GenerateModal.tsx`
- `/app-react/src/components/ProfileManager/PromptPreview.tsx`
- `/app-react/src/pages/ProfilePage.tsx`

**Files to Modify:**
- `/app-react/src/pages/EditorPage.tsx`
- `/app-react/src/App.tsx`

**Tasks:**

#### 4.1 Profile Sidebar Component
Create collapsible section at top of file tree:
- Header: Profile name + description (truncated)
- Summary statistics:
  - Documents: X/Y complete
  - Folders: X/Y complete
- Quick actions:
  - "View Profile Details" button → navigate to #/profile
  - Collapse/expand button
- Use shadcn/ui Collapsible component

#### 4.2 Profile Details Page
Modern card-based layout:

**Profile Overview Card:**
- Profile name (h1)
- Version + description
- Profile directory path (monospace, small)
- Statistics: completion percentage, total documents

**Documents Section:**
- Grid of cards (shadcn/ui Card component)
- Each card shows:
  - Document name (badge with type)
  - Path (monospace)
  - Description
  - Status icon (✓ green or ⚠️ red)
  - Expandable details:
    - Prompt file path
    - Prompt text preview (first 100 chars)
    - Command template
  - Action buttons: "Generate" / "Regenerate" / "View Prompt"

**Folders Section:**
- Accordion component for each folder
- Folder header shows:
  - Folder name + badge
  - Path
  - Document count
- Expanded view shows nested documents (same as above)

**Prompt Files Section:**
- Table listing all prompt files
- Columns: File, Used By (document count), Actions
- "View Content" button opens PromptPreview modal

#### 4.3 Generate Modal
Modal for file generation:
- Document name + description header
- Command preview (syntax highlighted)
- Expandable prompt file preview
- "Execute" / "Cancel" buttons
- During execution:
  - Loading spinner
  - Real-time command output (scrollable)
  - Progress indicator
- After completion:
  - Success/error message
  - "Open File" button
  - "Close" button

#### 4.4 Prompt Preview Modal
Modal for viewing prompt content:
- Full markdown content with syntax highlighting
- Variable placeholders highlighted
- "Copy" button to copy content
- "Close" button

### Phase 5: AI Generation Integration

**Files to Modify:**
- `/server/index.js`
- `/server/profileManager.js`

**Tasks:**

#### 5.1 Backend Command Execution
Implement `POST /api/profile/generate/:path` endpoint:
```javascript
app.post('/api/profile/generate/:path', authenticate, async (req, res) => {
  const filePath = req.params.path;

  // Get document config from profile
  const document = profileManager.getDocumentByPath(filePath);

  // Resolve prompt file to absolute path
  const promptFilePath = profileManager.resolvePromptFile(document.promptFile);

  // Build command with variable substitution
  const command = document.command
    .replace('{promptFile}', promptFilePath)
    .replace('{filePath}', path.join(MARKDOWN_DIR, filePath))
    .replace('{promptText}', document.promptText || '');

  // Execute command with spawn
  const child = spawn(command, [], {
    shell: true,
    cwd: MARKDOWN_DIR
  });

  // Stream output via WebSocket
  const outputBuffer = [];

  child.stdout.on('data', (data) => {
    const output = data.toString();
    outputBuffer.push(output);
    io.emit('generation-output', { path: filePath, output });
  });

  child.stderr.on('data', (data) => {
    const output = data.toString();
    outputBuffer.push(output);
    io.emit('generation-output', { path: filePath, output, isError: true });
  });

  child.on('close', (code) => {
    const success = code === 0;
    io.emit('generation-complete', {
      path: filePath,
      success,
      output: outputBuffer.join('')
    });

    if (success) {
      refreshFileCache();
    }
  });

  res.json({ success: true, message: 'Generation started' });
});
```

#### 5.2 Frontend Generation Flow
1. User clicks "Generate" on missing file
2. Open GenerateModal with document details
3. User clicks "Execute"
4. Dispatch `generateFile()` thunk
5. Show loading state and real-time output
6. On completion:
   - Show success/error notification
   - Refresh file list
   - Auto-open generated file in editor
   - Close modal

#### 5.3 WebSocket Integration
Listen for generation events:
- `generation-output` - Append to output buffer in modal
- `generation-complete` - Show completion status, refresh files

### Phase 6: Profile Management Tools

**Files to Create:**
- `/server/profileInitializer.js` (NEW)

**Files to Modify:**
- `/bin/cospec-ai.js`

**Tasks:**

#### 6.1 Profile Initialization Command
Add `init-profile` command:
```bash
npx cospec-ai init-profile api-development
```

Creates:
```
~/.cospec-ai/profiles/api-development/
├── profile.json (from template)
└── prompts/
    └── example.md
```

#### 6.2 Example Profiles
Ship example profiles in `/profiles/` directory:
- `api-development/` - REST API project template
- `technical-docs/` - Documentation project template
- `requirements-management/` - Requirements tracking template

Copy to `~/.cospec-ai/profiles/` on first run or via command:
```bash
npx cospec-ai install-examples
```

#### 6.3 Profile Validation
Add validation to profileManager:
- Check all prompt files exist
- Validate JSON schema (ajv library)
- Check command syntax (has required variables)
- Warn about missing placeholders

Expose via `GET /api/profile/validate` endpoint.

### Phase 7: Documentation & Polish

**Files to Create:**
- `/docs/profiles.md` (NEW)

**Files to Modify:**
- `CLAUDE.md`
- `README.md`

**Tasks:**

#### 7.1 Profile Documentation (`/docs/profiles.md`)
Comprehensive guide covering:
- Profile JSON schema reference
- Field descriptions and examples
- Prompt file guidelines
- Command variable substitution
- Creating custom profiles
- Example workflows
- Troubleshooting

#### 7.2 Update CLAUDE.md
Add section on profile feature:
- Feature overview
- Directory structure
- CLI usage
- Integration with Kai agents
- Development guidelines

#### 7.3 Update README.md
Add profile feature section:
- Quick start with profiles
- Example usage
- Link to full documentation

## Technical Decisions

### 1. Profile Storage Location
- **Decision**: `~/.cospec-ai/profiles/<profile-name>/`
- **Rationale**:
  - User home directory for persistence across projects
  - Separate from markdown directory for portability
  - Profile-specific subdirectory for organization

### 2. Prompt File Paths
- **Decision**: Relative paths in profile.json, resolved to absolute at runtime
- **Rationale**:
  - Profile portability (can share profiles)
  - Cleaner JSON structure
  - Easier profile management

### 3. Command Execution Strategy
- **Decision**: Shell execution via child_process.spawn with variable substitution
- **Rationale**:
  - Maximum flexibility (supports any command/agent)
  - No tight coupling to specific AI providers
  - Users can integrate their own tools

### 4. Ghost Entries in File Tree
- **Decision**: Show missing files directly in tree with visual warnings
- **Rationale**:
  - Better discoverability
  - Contextual awareness (see where file should be)
  - Consistent with user expectation

### 5. UI Layout
- **Decision**: Collapsible sidebar + dedicated profile page
- **Rationale**:
  - Sidebar for quick overview without disrupting workflow
  - Dedicated page for detailed management
  - Follows modern UI patterns (e.g., VS Code)

### 6. No Direct AI Integration
- **Decision**: Execute external commands instead of calling AI APIs directly
- **Rationale**:
  - Separation of concerns (CoSpec AI = editor, not AI provider)
  - Flexibility (users choose their AI tools)
  - Avoids API key management complexity

## API Reference

### Profile Endpoints

#### GET /api/profile
Returns the loaded profile configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "API Development",
    "version": "1.0.0",
    "description": "Profile for API development projects",
    "documents": [...],
    "folders": [...]
  }
}
```

#### GET /api/profile/files
Returns required files with existence status.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "path": "SPEC.md",
      "name": "API Specification",
      "exists": false,
      "required": true,
      "promptFile": "prompts/api-spec.md",
      "command": "kai agent execute..."
    }
  ]
}
```

#### GET /api/profile/prompt/:documentPath
Returns prompt file content for preview.

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "prompts/api-spec.md",
    "content": "# API Specification Generation\n\n..."
  }
}
```

#### POST /api/profile/generate/:path
Executes generation command for file.

**Request Body:**
```json
{
  "overwrite": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Generation started"
}
```

**WebSocket Events:**
- `generation-output`: Real-time command output
- `generation-complete`: Generation finished

#### GET /api/profile/validate
Validates profile configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "warnings": ["Prompt file 'prompts/test.md' not found"],
    "errors": []
  }
}
```

## File Structure Summary

```
cospec-ai/
├── server/
│   ├── index.js (MODIFY - add profile endpoints)
│   ├── profileManager.js (NEW - profile loading/validation)
│   └── profileInitializer.js (NEW - init-profile command)
├── bin/
│   └── cospec-ai.js (MODIFY - add --profile, init-profile commands)
├── app-react/
│   ├── src/
│   │   ├── types/
│   │   │   └── profile.ts (NEW)
│   │   ├── store/
│   │   │   ├── slices/
│   │   │   │   └── profileSlice.ts (NEW)
│   │   │   └── index.ts (MODIFY)
│   │   ├── services/
│   │   │   └── api.ts (MODIFY - add profile API)
│   │   ├── components/
│   │   │   ├── FileTree/
│   │   │   │   └── FileTree.tsx (MODIFY - ghost entries)
│   │   │   └── ProfileManager/
│   │   │       ├── ProfileSidebar.tsx (NEW)
│   │   │       ├── GenerateModal.tsx (NEW)
│   │   │       └── PromptPreview.tsx (NEW)
│   │   ├── pages/
│   │   │   ├── EditorPage.tsx (MODIFY - add sidebar)
│   │   │   └── ProfilePage.tsx (NEW)
│   │   └── App.tsx (MODIFY - add #/profile route)
├── profiles/ (NEW - example profiles)
│   ├── api-development/
│   │   ├── profile.json
│   │   └── prompts/
│   │       └── api-spec.md
│   └── technical-docs/
│       ├── profile.json
│       └── prompts/
│           └── architecture.md
└── docs/
    ├── profiles.md (NEW)
    ├── PROFILE_FEATURE_PLAN.md (THIS FILE)
    └── CLAUDE.md (MODIFY)
```

## Testing Strategy

### Manual Testing Checklist

#### Profile Loading
- [ ] Profile loads correctly on server startup
- [ ] Profile validation catches invalid JSON
- [ ] Profile validation checks prompt file existence
- [ ] Error message shown if profile not found

#### File Tree
- [ ] Missing files show with red warning icon
- [ ] Missing files have "Missing" badge
- [ ] Folders show profile badges
- [ ] Ghost entries are not draggable
- [ ] Context menu shows "Generate" for missing files
- [ ] Tooltips show profile information

#### Profile UI
- [ ] Sidebar shows profile summary
- [ ] Sidebar collapses/expands correctly
- [ ] Profile page shows all documents
- [ ] Profile page shows all folders
- [ ] Cards expand to show details
- [ ] Statistics are accurate

#### Generation
- [ ] Generate modal shows document info
- [ ] Command preview displays correctly
- [ ] Execute button starts generation
- [ ] Real-time output displays in modal
- [ ] Success notification shows on completion
- [ ] File tree refreshes after generation
- [ ] Generated file opens in editor
- [ ] Error handling works for failed commands

#### CLI
- [ ] `--profile <name>` loads correct profile
- [ ] `init-profile <name>` creates profile directory
- [ ] `install-examples` copies example profiles
- [ ] Error shown if profile name invalid

### Integration Testing

1. Test with Kai agent integration
2. Test with custom shell scripts
3. Test error handling (command not found, timeout)
4. Test WebSocket disconnection during generation
5. Test profile reload after editing profile.json

## Future Enhancements

### Profile Templates
- Visual profile editor in UI
- Profile marketplace/sharing
- Profile inheritance (extend base profiles)

### Advanced Generation
- Multi-file generation (batch operations)
- Generation with dependencies (file A → file B)
- Conditional generation (if X exists, generate Y)

### AI Integration
- Built-in AI providers (OpenAI, Anthropic)
- Prompt template library
- Generation history and versioning

### Collaboration
- Team profiles (shared across users)
- Profile versioning with git
- Profile change notifications

## Implementation Timeline

**Phase 1-2 (Backend + State)**: 2-3 days
**Phase 3-4 (UI Components)**: 3-4 days
**Phase 5 (Generation)**: 2-3 days
**Phase 6-7 (Tools + Docs)**: 1-2 days

**Total Estimated Time**: 8-12 days

## Success Criteria

1. ✅ Users can create profiles with `init-profile` command
2. ✅ Profiles load on startup with `--profile` flag
3. ✅ File tree shows missing required files with visual indicators
4. ✅ Profile sidebar shows summary and links to details page
5. ✅ Profile page displays complete profile structure
6. ✅ Users can generate missing files via UI
7. ✅ Generation executes external commands with prompt files
8. ✅ Real-time output displayed during generation
9. ✅ Generated files automatically appear in tree and open in editor
10. ✅ Documentation complete and examples working

---

**Document Version**: 1.0
**Last Updated**: 2025-01-30
**Status**: Ready for Implementation
