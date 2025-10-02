# Vditor SaaS Data Model

## Overview

This document details the data model for the Vditor SaaS platform, including database schema, relationships, and storage strategies for both structured data (D1) and unstructured content (R2).

## D1 Database Schema

### Organizations Table

Stores information about organizations (top-level tenants) in the system.

```sql
CREATE TABLE Organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    settings TEXT,
    
    -- Indexes
    INDEX idx_organizations_slug (slug)
);
```

### Projects Table

Stores information about projects within organizations.

```sql
CREATE TABLE Projects (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    github_repo TEXT,
    github_branch TEXT,
    github_access_token TEXT,
    last_sync_at INTEGER,
    sync_status TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    settings TEXT,
    
    -- Constraints
    FOREIGN KEY (organization_id) REFERENCES Organizations(id) ON DELETE CASCADE,
    UNIQUE (organization_id, slug),
    
    -- Indexes
    INDEX idx_projects_organization_id (organization_id),
    INDEX idx_projects_slug (slug),
    INDEX idx_projects_github_repo (github_repo)
);
```

### Users Table

Stores information about users in the system.

```sql
CREATE TABLE Users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_login INTEGER,
    
    -- Indexes
    INDEX idx_users_email (email)
);
```

### Organization_Users Table

Maps users to organizations with specific roles.

```sql
CREATE TABLE Organization_Users (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    
    -- Constraints
    FOREIGN KEY (organization_id) REFERENCES Organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    UNIQUE (organization_id, user_id),
    
    -- Indexes
    INDEX idx_org_users_org_id (organization_id),
    INDEX idx_org_users_user_id (user_id)
);
```

### Project_Users Table

Maps users to projects with specific roles.

```sql
CREATE TABLE Project_Users (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    
    -- Constraints
    FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    UNIQUE (project_id, user_id),
    
    -- Indexes
    INDEX idx_proj_users_proj_id (project_id),
    INDEX idx_proj_users_user_id (user_id)
);
```

### Files Table

Stores metadata about files stored in R2.

```sql
CREATE TABLE Files (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    
    -- Constraints
    FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES Users(id),
    FOREIGN KEY (updated_by) REFERENCES Users(id),
    UNIQUE (project_id, path),
    
    -- Indexes
    INDEX idx_files_project_id (project_id),
    INDEX idx_files_path (path)
);
```

### File_Versions Table

Stores version history for files.

```sql
CREATE TABLE File_Versions (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    r2_key TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    
    -- Constraints
    FOREIGN KEY (file_id) REFERENCES Files(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES Users(id),
    UNIQUE (file_id, version),
    
    -- Indexes
    INDEX idx_file_versions_file_id (file_id)
);
```

### Comments Table

Stores comments on files.

```sql
CREATE TABLE Comments (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    position TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    
    -- Constraints
    FOREIGN KEY (file_id) REFERENCES Files(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id),
    
    -- Indexes
    INDEX idx_comments_file_id (file_id),
    INDEX idx_comments_user_id (user_id)
);
```

### Sessions Table

Stores user session information.

```sql
CREATE TABLE Sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    
    -- Constraints
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_sessions_user_id (user_id),
    INDEX idx_sessions_token (token),
    INDEX idx_sessions_expires_at (expires_at)
);
```

## R2 Storage Structure

### Object Key Format

Objects in R2 will be stored using the following key format:

```
{organization_id}/{project_id}/{file_path}
```

For example:
```
org_123456/proj_789012/docs/readme.md
```

### Version History

Version history will be stored with the following key format:

```
{organization_id}/{project_id}/_versions/{file_id}/{version_number}
```

For example:
```
org_123456/proj_789012/_versions/file_345678/1
```

### Metadata

File metadata will be stored in the D1 database, while the actual content will be stored in R2. This separation allows for efficient querying of file properties without having to retrieve the entire file content.

### Git_Operations Table

Stores history of Git operations performed on projects.

```sql
CREATE TABLE Git_Operations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    commit_hash TEXT,
    performed_by TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    
    -- Constraints
    FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES Users(id),
    
    -- Indexes
    INDEX idx_git_ops_project_id (project_id),
    INDEX idx_git_ops_performed_by (performed_by),
    INDEX idx_git_ops_status (status)
);
```

### File_Git_Status Table

Stores Git status information for files.

```sql
CREATE TABLE File_Git_Status (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    git_status TEXT NOT NULL,
    last_commit_hash TEXT,
    last_commit_message TEXT,
    last_commit_author TEXT,
    last_commit_date INTEGER,
    updated_at INTEGER NOT NULL,
    
    -- Constraints
    FOREIGN KEY (file_id) REFERENCES Files(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_file_git_status_file_id (file_id),
    INDEX idx_file_git_status_status (git_status)
);
```

## Data Access Patterns

### Organization Access

1. **List Organizations for User**
   ```sql
   SELECT o.*
   FROM Organizations o
   JOIN Organization_Users ou ON o.id = ou.organization_id
   WHERE ou.user_id = ?
   ORDER BY o.name;
   ```

2. **Get Organization Details**
   ```sql
   SELECT *
   FROM Organizations
   WHERE id = ?;
   ```

### Project Access

1. **List Projects in Organization**
   ```sql
   SELECT p.*
   FROM Projects p
   WHERE p.organization_id = ?
   ORDER BY p.name;
   ```

2. **List Projects for User**
   ```sql
   SELECT p.*
   FROM Projects p
   JOIN Project_Users pu ON p.id = pu.project_id
   WHERE pu.user_id = ?
   ORDER BY p.name;
   ```

### File Access

1. **List Files in Project**
   ```sql
   SELECT f.*
   FROM Files f
   WHERE f.project_id = ?
   ORDER BY f.path;
   ```

2. **Get File Details**
   ```sql
   SELECT f.*, u1.name as creator_name, u2.name as updater_name
   FROM Files f
   JOIN Users u1 ON f.created_by = u1.id
   JOIN Users u2 ON f.updated_by = u2.id
   WHERE f.id = ?;
   ```

3. **Get File Versions**
   ```sql
   SELECT fv.*, u.name as creator_name
   FROM File_Versions fv
   JOIN Users u ON fv.created_by = u.id
   WHERE fv.file_id = ?
   ORDER BY fv.version DESC;
   ```

## Multi-Tenant Considerations

### Data Isolation

1. **Query Filtering**
   All queries will include tenant-specific filters to ensure data isolation between organizations.

2. **Worker Isolation**
   Each organization will have its own Worker instance to process requests, providing additional isolation.

3. **R2 Path Prefixing**
   All R2 keys are prefixed with the organization ID to ensure storage isolation.
   
4. **GitHub Integration**
   GitHub access tokens are encrypted and stored securely, with access limited to the organization's Worker instance.

### Performance Optimization

1. **Indexing Strategy**
   Indexes are created on frequently queried fields to optimize performance.

2. **Denormalization**
   Some data may be denormalized to reduce the number of joins required for common queries.

3. **Caching**
   Frequently accessed data will be cached at the Worker level to reduce database load.

## Git Integration Functionality

### GitHub Repository Connection

1. **Repository Binding**
   - Connect projects to GitHub repositories via OAuth or Personal Access Tokens
   - Support for public and private repositories
   - Branch selection for synchronization

2. **Synchronization Operations**
   - Pull changes from GitHub to update local files
   - Commit and push local changes to GitHub
   - View file diff and status (modified, added, deleted)
   - Resolve merge conflicts through the UI

3. **Git Workflow Support**
   - Branch creation and switching
   - Pull request creation from the UI
   - Commit history visualization
   - Blame view for file content

## Data Migration Considerations

### Importing Existing Data

1. **File Import**
   - Extract files from existing Docker volumes
   - Upload to R2 with appropriate keys
   - Create corresponding metadata entries in D1
   - Import Git history if available

2. **User Migration**
   - Create user accounts in the new system
   - Generate secure password reset links
   - Map users to appropriate organizations and projects

### Validation and Verification

1. **Data Integrity Checks**
   - Verify file count matches between old and new systems
   - Check file sizes and checksums
   - Validate metadata consistency

2. **Access Control Verification**
   - Verify user permissions are correctly migrated
   - Test access to files and projects
   - Validate organization membership
