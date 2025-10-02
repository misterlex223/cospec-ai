-- Organizations Table
CREATE TABLE IF NOT EXISTS Organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    settings TEXT
);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON Organizations(slug);

-- Projects Table
CREATE TABLE IF NOT EXISTS Projects (
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
    FOREIGN KEY (organization_id) REFERENCES Organizations(id) ON DELETE CASCADE,
    UNIQUE (organization_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON Projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON Projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_github_repo ON Projects(github_repo);

-- Users Table
CREATE TABLE IF NOT EXISTS Users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_login INTEGER
);
CREATE INDEX IF NOT EXISTS idx_users_email ON Users(email);

-- Organization_Users Table
CREATE TABLE IF NOT EXISTS Organization_Users (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (organization_id) REFERENCES Organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    UNIQUE (organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_org_users_org_id ON Organization_Users(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_users_user_id ON Organization_Users(user_id);

-- Project_Users Table
CREATE TABLE IF NOT EXISTS Project_Users (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    UNIQUE (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_proj_users_proj_id ON Project_Users(project_id);
CREATE INDEX IF NOT EXISTS idx_proj_users_user_id ON Project_Users(user_id);

-- Files Table
CREATE TABLE IF NOT EXISTS Files (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    size INTEGER NOT NULL,
    git_status TEXT,
    last_commit_hash TEXT,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES Users(id),
    FOREIGN KEY (updated_by) REFERENCES Users(id),
    UNIQUE (project_id, path)
);
CREATE INDEX IF NOT EXISTS idx_files_project_id ON Files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_path ON Files(path);

-- File_Versions Table
CREATE TABLE IF NOT EXISTS File_Versions (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    r2_key TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_by TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (file_id) REFERENCES Files(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES Users(id),
    UNIQUE (file_id, version)
);
CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON File_Versions(file_id);

-- Comments Table
CREATE TABLE IF NOT EXISTS Comments (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    position TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (file_id) REFERENCES Files(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users(id)
);
CREATE INDEX IF NOT EXISTS idx_comments_file_id ON Comments(file_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON Comments(user_id);

-- Sessions Table
CREATE TABLE IF NOT EXISTS Sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON Sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON Sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON Sessions(expires_at);

-- Git_Operations Table
CREATE TABLE IF NOT EXISTS Git_Operations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    operation_type TEXT NOT NULL,
    status TEXT NOT NULL,
    message TEXT,
    commit_hash TEXT,
    performed_by TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE,
    FOREIGN KEY (performed_by) REFERENCES Users(id)
);
CREATE INDEX IF NOT EXISTS idx_git_ops_project_id ON Git_Operations(project_id);
CREATE INDEX IF NOT EXISTS idx_git_ops_performed_by ON Git_Operations(performed_by);
CREATE INDEX IF NOT EXISTS idx_git_ops_status ON Git_Operations(status);

-- File_Git_Status Table
CREATE TABLE IF NOT EXISTS File_Git_Status (
    id TEXT PRIMARY KEY,
    file_id TEXT NOT NULL,
    git_status TEXT NOT NULL,
    last_commit_hash TEXT,
    last_commit_message TEXT,
    last_commit_author TEXT,
    last_commit_date INTEGER,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (file_id) REFERENCES Files(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_file_git_status_file_id ON File_Git_Status(file_id);
CREATE INDEX IF NOT EXISTS idx_file_git_status_status ON File_Git_Status(git_status);

-- Notifications Table
CREATE TABLE IF NOT EXISTS Notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    target_id TEXT,
    target_type TEXT,
    user_id TEXT,
    organization_id TEXT,
    project_id TEXT,
    message TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES Organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES Projects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON Notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_org_id ON Notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_project_id ON Notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON Notifications(created_at);
