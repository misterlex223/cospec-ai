# CoSpec SaaS 資料遷移與儲存計劃

## 1. 現有系統資料模型分析

### 1.1 現有資料實體

目前系統使用以下主要資料實體：

1. **使用者 (User)**
   ```typescript
   interface User {
     id: string;
     username: string;
     email: string;
     created_at: number;
     updated_at: number;
   }
   ```

2. **個人空間 (Personal Space)**
   ```typescript
   interface PersonalOrganization {
     id: string;
     name: string;
     slug: string;
     settings: {
       isPersonal: boolean;
       owner: string; // 對應到 User.id
     };
     role: string;
     created_at: number;
     updated_at: number;
   }
   ```

3. **專案 (Project)**
   ```typescript
   interface Project {
     id: string;
     name: string;
     slug: string;
     role: string;
     created_at: number;
     updated_at: number;
     github_repo?: string;
     github_branch?: string;
     githubConnected?: boolean;
   }
   ```

4. **文件 (File)**
   ```typescript
   interface File {
     id: string;
     name: string;
     path: string;
     content: string;
     size: number;
     created_at: number;
     updated_at: number;
   }
   ```

### 1.2 現有儲存方式

目前系統處於開發階段，使用的是模擬資料（Mock Data）：

- **資料儲存**：記憶體中的 JavaScript 變數
- **API 實現**：Express.js 實現 RESTful API
- **前端存取**：通過 axios 發送 HTTP 請求到後端 API

## 2. Cloudflare 遷移資料架構

### 2.1 資料實體映射

| 現有實體 | Cloudflare 實體 | 說明 |
|---------|---------------|------|
| User | Users 表 | 增加更多欄位，如 password_hash, last_login |
| PersonalOrganization | Organizations 表 | 個人空間將成為特殊類型的組織 |
| Project | Projects 表 | 增加與組織的關聯，以及 GitHub 整合欄位 |
| File | Files 表 + R2 儲存 | 檔案元數據存在 D1，內容存在 R2 |

### 2.2 資料庫結構（D1）

#### 2.2.1 Organizations 表（組織）

```sql
CREATE TABLE Organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    settings TEXT,
    
    -- 新增欄位，標記是否為個人空間
    is_personal BOOLEAN DEFAULT FALSE,
    owner_id TEXT,
    
    -- Indexes
    INDEX idx_organizations_slug (slug),
    INDEX idx_organizations_owner (owner_id)
);
```

#### 2.2.2 Projects 表（專案）

```sql
CREATE TABLE Projects (
    id TEXT PRIMARY KEY,
    organization_id TEXT NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
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

#### 2.2.3 Users 表（使用者）

```sql
CREATE TABLE Users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    last_login INTEGER,
    
    -- Indexes
    INDEX idx_users_email (email),
    INDEX idx_users_username (username)
);
```

#### 2.2.4 Organization_Users 表（組織成員）

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

#### 2.2.5 Files 表（檔案元數據）

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

#### 2.2.6 File_Versions 表（檔案版本）

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

### 2.3 R2 儲存結構

#### 2.3.1 物件鍵格式

R2 中的物件將使用以下鍵格式儲存：

```
{organization_id}/{project_id}/{file_path}
```

例如：
```
org_123456/proj_789012/docs/readme.md
```

#### 2.3.2 版本歷史

版本歷史將使用以下鍵格式儲存：

```
{organization_id}/{project_id}/_versions/{file_id}/{version_number}
```

例如：
```
org_123456/proj_789012/_versions/file_345678/1
```

## 3. 資料遷移策略

### 3.1 使用者資料遷移

1. **使用者帳戶遷移**
   - 從現有模擬資料中提取使用者資訊
   - 為每個使用者生成安全的密碼雜湊
   - 將使用者資料插入 D1 Users 表
   - 生成密碼重設連結，讓使用者設定新密碼

2. **個人空間遷移**
   - 將每個使用者的個人空間轉換為 Organizations 表中的記錄
   - 設定 `is_personal = TRUE` 和對應的 `owner_id`
   - 建立 Organization_Users 關聯，角色設為 "owner"

### 3.2 專案資料遷移

1. **專案元數據遷移**
   - 將專案資料從模擬資料轉移到 D1 Projects 表
   - 建立與組織的關聯
   - 保留 GitHub 連接資訊（如果有）

2. **專案檔案遷移**
   - 掃描現有檔案系統或模擬資料中的檔案
   - 將檔案內容上傳到 R2，使用適當的鍵格式
   - 在 D1 Files 表中創建對應的元數據記錄
   - 保留創建和修改時間戳

### 3.3 GitHub 整合遷移

1. **GitHub 連接資訊**
   - 安全地遷移 GitHub 存取令牌
   - 更新專案的 GitHub 連接狀態
   - 驗證連接是否有效

2. **Git 操作歷史**
   - 如果有 Git 操作歷史，遷移到 Git_Operations 表
   - 更新檔案的 Git 狀態

## 4. 資料存取模式

### 4.1 組織存取

1. **列出使用者的組織**
   ```sql
   SELECT o.*
   FROM Organizations o
   JOIN Organization_Users ou ON o.id = ou.organization_id
   WHERE ou.user_id = ?
   ORDER BY o.name;
   ```

2. **獲取個人空間**
   ```sql
   SELECT o.*
   FROM Organizations o
   WHERE o.is_personal = TRUE AND o.owner_id = ?;
   ```

### 4.2 專案存取

1. **列出組織中的專案**
   ```sql
   SELECT p.*
   FROM Projects p
   WHERE p.organization_id = ?
   ORDER BY p.name;
   ```

2. **列出使用者的專案**
   ```sql
   SELECT p.*
   FROM Projects p
   JOIN Organization_Users ou ON p.organization_id = ou.organization_id
   WHERE ou.user_id = ?
   ORDER BY p.name;
   ```

### 4.3 檔案存取

1. **列出專案中的檔案**
   ```sql
   SELECT f.*
   FROM Files f
   WHERE f.project_id = ?
   ORDER BY f.path;
   ```

2. **獲取檔案內容**
   - 從 D1 獲取檔案元數據和 R2 鍵
   - 使用 R2 鍵從 R2 儲存中獲取檔案內容

## 5. 多租戶考量

### 5.1 資料隔離

1. **查詢過濾**
   - 所有查詢都將包含租戶特定的過濾條件，確保組織間的資料隔離

2. **Worker 隔離**
   - 每個組織將有自己的 Worker 實例處理請求，提供額外的隔離

3. **R2 路徑前綴**
   - 所有 R2 鍵都以組織 ID 為前綴，確保儲存隔離

4. **GitHub 整合**
   - GitHub 存取令牌將被加密並安全儲存，存取權限僅限於組織的 Worker 實例

### 5.2 效能優化

1. **索引策略**
   - 在經常查詢的欄位上創建索引，優化效能

2. **反正規化**
   - 某些資料可能會被反正規化，以減少常見查詢所需的連接數

3. **快取**
   - 經常存取的資料將在 Worker 層級進行快取，減少資料庫負載

## 6. 遷移階段計劃

### 6.1 準備階段（2週）

1. **環境設置**
   - 設置 Cloudflare Workers for Platforms 帳戶
   - 創建 D1 資料庫和 R2 儲存桶
   - 配置開發和生產環境

2. **資料庫結構創建**
   - 實現上述資料庫結構
   - 創建必要的索引和約束

### 6.2 資料遷移階段（2週）

1. **使用者和組織遷移**
   - 遷移使用者資料
   - 創建組織和個人空間
   - 建立使用者與組織的關聯

2. **專案和檔案遷移**
   - 遷移專案元數據
   - 將檔案內容上傳到 R2
   - 創建檔案元數據記錄

### 6.3 驗證和測試階段（1週）

1. **資料完整性檢查**
   - 驗證所有資料是否正確遷移
   - 檢查檔案數量、大小和校驗和
   - 驗證元數據一致性

2. **存取控制驗證**
   - 驗證使用者權限是否正確遷移
   - 測試對檔案和專案的存取
   - 驗證組織成員資格

### 6.4 切換階段（1週）

1. **DNS 切換**
   - 將 DNS 指向新的 Cloudflare 基礎設施
   - 監控系統效能和使用情況
   - 提供切換期間的支援

2. **回滾計劃**
   - 準備回滾程序，以防出現關鍵問題
   - 定義回滾觸發條件
   - 測試回滾程序

## 7. 遷移後優化

### 7.1 效能監控與優化

1. **監控關鍵指標**
   - API 響應時間
   - 資料庫查詢效能
   - R2 存取延遲
   - Worker 執行時間

2. **優化策略**
   - 根據監控結果調整索引
   - 優化常用查詢
   - 實現更高效的快取策略

### 7.2 功能增強

1. **版本歷史**
   - 實現檔案版本歷史功能
   - 提供版本比較和還原功能

2. **協作功能**
   - 實現即時協作編輯
   - 添加評論和註釋功能

3. **進階 GitHub 整合**
   - 實現分支管理
   - 添加合併請求創建功能
   - 提供衝突解決界面

## 8. 結論

將 CoSpec 遷移到 Cloudflare 基礎設施上的 SaaS 平台，將顯著提升系統的可擴展性、效能和全球可用性。多租戶架構與組織、專案和使用者層次結構為未來的成長和功能開發提供了靈活的基礎。

本遷移計劃專注於資料實體、資料庫和儲存等關鍵方面，確保平穩過渡到新的雲原生架構。通過分階段實施和嚴格的驗證程序，我們可以最小化遷移風險，同時為使用者提供更好的體驗。
