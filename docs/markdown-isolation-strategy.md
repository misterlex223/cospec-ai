# Markdown 檔案隔離與 Workers for Platforms 解決方案

## 1. 概述

本文檔詳細說明了在 CoSpec SaaS 平台中，如何使用 Cloudflare Workers for Platforms 實現 Markdown 檔案的有效隔離，確保多租戶環境中的資料安全與隱私。

## 2. 資料隔離策略

### 2.1 R2 儲存隔離

在 R2 儲存中，我們透過路徑前綴來實現邏輯隔離：

```
{organization_id}/{project_id}/{file_path}
```

例如：
- `org_123/proj_456/docs/readme.md`
- `org_789/proj_101/docs/api.md`

這種結構確保了不同組織和專案的檔案在儲存層面上是分開的。

### 2.2 Workers for Platforms 的隔離機制

Workers for Platforms 提供了強大的多租戶隔離能力：

#### 2.2.1 動態分派 Worker

中央入口點 Worker 驗證請求並路由到特定租戶的 Worker：

```javascript
// 動態分派 Worker 示例
addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const orgId = extractOrgId(event.request); // 從請求中提取組織 ID
  
  // 路由到特定組織的 Worker
  return event.respondWith(
    dispatch(`${orgId}.your-namespace.workers.dev`, event.request)
  );
});
```

#### 2.2.2 租戶特定 Workers

為每個組織創建獨立的 Worker 實例：

```javascript
// 租戶特定 Worker
export default {
  async fetch(request, env) {
    // 1. 解析請求路徑
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 2. 處理文件操作
    if (path.startsWith('/api/files')) {
      // 只能訪問此租戶的文件
      const tenantPrefix = `${env.TENANT_ID}/`;
      
      // 3. 從 R2 讀取或寫入文件
      if (request.method === 'GET') {
        const filePath = path.replace('/api/files/', '');
        const object = await env.R2_BUCKET.get(`${tenantPrefix}${filePath}`);
        
        if (object === null) {
          return new Response('File not found', { status: 404 });
        }
        
        return new Response(object.body);
      }
      // 其他文件操作...
    }
    
    // 其他 API 處理...
  }
};
```

### 2.3 權限控制層

在 Worker 內部實現嚴格的權限檢查：

```javascript
async function handleRequest(request, env) {
  // 驗證用戶身份
  const user = await validateToken(request);
  
  // 提取請求的資源路徑
  const path = new URL(request.url).pathname;
  const [_, orgId, projectId, ...filePath] = path.split('/');
  
  // 檢查用戶是否有權限訪問該組織和專案
  const hasAccess = await checkAccess(user.id, orgId, projectId);
  if (!hasAccess) {
    return new Response('Unauthorized', { status: 403 });
  }
  
  // 處理請求
  // ...
}
```

## 3. 完整的隔離架構

### 3.1 資料層隔離

#### 3.1.1 D1 資料庫隔離
- 所有查詢都包含組織 ID 條件
- 例如：`SELECT * FROM files WHERE organization_id = ?`
- 確保一個組織無法訪問另一個組織的元數據

#### 3.1.2 R2 儲存隔離
- 使用組織 ID 和專案 ID 作為路徑前綴
- Worker 只能訪問授權的路徑
- 實現了物理儲存的邏輯分區

### 3.2 計算層隔離

#### 3.2.1 Worker 隔離
- 每個組織有自己的 Worker 實例
- Workers 之間無法直接通信
- 資源限制可以按組織設置

#### 3.2.2 請求隔離
- 每個請求都經過身份驗證和授權
- 請求只能訪問特定組織的資源
- 所有操作都有權限檢查

### 3.3 網絡層隔離

#### 3.3.1 自定義域名
- 每個組織可以有自己的子域名
- 例如：`org-name.cospec.app`
- 域名路由到特定的組織 Worker

#### 3.3.2 API 路由
- API 路徑包含組織識別符
- 例如：`/api/org/{org_id}/projects/{project_id}/files`

## 4. 實施步驟

### 4.1 設置 Workers for Platforms

1. 創建 Cloudflare Workers for Platforms 帳戶
2. 設置 dispatch 命名空間
3. 配置路由和分派規則
4. 實現動態分派 Worker

### 4.2 實現租戶隔離

1. 設計租戶識別機制
2. 實現租戶特定 Worker 模板
3. 配置租戶資源限制
4. 設置監控和日誌記錄

### 4.3 配置 R2 儲存

1. 創建 R2 儲存桶
2. 設計物件鍵格式
3. 配置存取控制策略
4. 實現安全的檔案操作

### 4.4 實現權限系統

1. 設計角色和權限模型
2. 實現權限檢查邏輯
3. 配置資源存取控制
4. 記錄存取嘗試和違規

## 5. 安全考量

### 5.1 令牌安全

- 使用 JWT 進行身份驗證
- 設置適當的令牌過期時間
- 實現令牌刷新機制
- 支持令牌撤銷

### 5.2 資料加密

- 傳輸中加密 (HTTPS)
- 儲存中加密 (R2 加密)
- 敏感元數據加密
- 安全密鑰管理

### 5.3 存取控制

- 實現最小權限原則
- 定期審核權限
- 記錄所有存取嘗試
- 檢測異常存取模式

## 6. 效能優化

### 6.1 快取策略

- 快取頻繁訪問的檔案
- 使用 Cloudflare CDN
- 實現智能預加載
- 優化資源使用

### 6.2 資源限制

- 設置租戶特定的資源限制
- 監控資源使用情況
- 實現自動擴展策略
- 防止資源濫用

## 7. 結論

使用 Cloudflare Workers for Platforms 實現 Markdown 檔案隔離是一個強大且靈活的解決方案。通過結合 R2 儲存、D1 資料庫和 Workers 的功能，我們可以創建一個安全、高效且可擴展的多租戶 SaaS 平台，確保每個組織的資料都得到適當的保護和隔離。
