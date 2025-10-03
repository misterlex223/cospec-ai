# CoSpec Markdown UI 重構文檔

本文檔記錄了基於 Figma Make 原型的 UI 重構工作。

## 重構概述

我們根據 `/figma-mocks/` 目錄中的 Figma Make 原型設計，對 CoSpec Markdown 應用程序的 UI 進行了全面重構。重構工作包括：

1. 設置 Shadcn/UI 組件庫
2. 重構登入和註冊頁面
3. 創建新的導航組件
4. 實現麵包屑導航
5. 重新設計文件編輯器界面
6. 更新項目列表和文件列表組件
7. 改進 Markdown 編輯器的 UI
8. 更新全局樣式和主題

## 組件結構

重構後的組件結構如下：

```
src/
├── components/
│   ├── auth/
│   │   ├── AuthContext.tsx
│   │   ├── LoginPage.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── RegisterPage.tsx
│   ├── Breadcrumb/
│   │   ├── Breadcrumb.tsx
│   │   └── Breadcrumb.css
│   ├── FileEditor/
│   │   ├── FileEditor.tsx
│   │   └── FileEditor.css
│   ├── MarkdownEditor/
│   │   ├── MarkdownEditor.tsx
│   │   └── MarkdownEditorStyles.css
│   ├── Navigation/
│   │   ├── Navigation.tsx
│   │   └── Navigation.css
│   ├── ProjectFiles/
│   │   ├── ProjectFiles.tsx
│   │   └── ProjectFiles.css
│   ├── ProjectList/
│   │   ├── ProjectList.tsx
│   │   └── ProjectList.css
│   └── ui/
│       ├── alert.tsx
│       ├── badge.tsx
│       ├── breadcrumb.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       └── label.tsx
```

## UI 組件庫

我們使用了 Shadcn/UI 組件庫，這是一個基於 Tailwind CSS 的組件庫，提供了一系列可定制的 UI 組件。主要組件包括：

- Button
- Card
- Input
- Label
- Alert
- Badge
- Breadcrumb
- Dropdown Menu

## 樣式系統

我們使用 Tailwind CSS 作為樣式系統，並添加了一些自定義樣式：

1. 全局變量定義在 `:root` 中，包括顏色、邊框半徑等
2. 自定義滾動條樣式
3. 卡片懸停效果
4. 工具提示樣式
5. 標籤樣式

## 頁面結構

### 登入頁面

- 簡潔的卡片式設計
- 表單驗證
- 錯誤提示
- 密碼顯示/隱藏功能

### 註冊頁面

- 與登入頁面風格一致
- 密碼強度指示器
- 詳細的表單驗證

### 項目列表頁面

- 卡片式項目展示
- 創建新項目功能
- GitHub 連接狀態顯示

### 文件列表頁面

- 表格式文件列表
- 文件狀態標籤
- 批量選擇功能
- GitHub 同步功能

### 文件編輯器頁面

- 頂部工具欄
- 文件信息顯示
- Git 差異顯示
- 自動保存功能

## 安裝依賴

需要安裝以下依賴：

```bash
npm install @radix-ui/react-label @radix-ui/react-dropdown-menu @radix-ui/react-progress @radix-ui/react-alert-dialog @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-dialog @radix-ui/react-hover-card @radix-ui/react-popover @radix-ui/react-separator @radix-ui/react-toast sonner
```

## 注意事項

1. 由於環境限制，我們創建了一個新的 `package.json.new` 文件，包含了所有需要的依賴。請將其重命名為 `package.json` 並運行 `npm install` 安裝依賴。

2. 部分 CSS 文件中的 Tailwind 指令（如 `@tailwind`、`@apply` 等）可能會在某些編輯器中顯示警告，這是正常的，不會影響功能。

3. 重構後的 UI 設計與 Figma Make 原型保持一致，但在實際應用中可能需要根據具體需求進行微調。
