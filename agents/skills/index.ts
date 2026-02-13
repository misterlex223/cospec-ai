/**
 * Spec Analyzer Skill
 *
 * Reusable capability for analyzing technical specifications
 */

export const specAnalyzer = {
  name: 'spec-analyzer',
  description: '規格分析專家，可以分析 API 規格、資料庫 schema、系統架構等技術文檔',
  usage: '當需要分析技術文檔時，調用此技能',
  examples: [
    '分析 specs/api-design.md 的完整性',
    '檢查資料庫 schema 是否符合規範',
    '評估系統架構設計的合理性',
  ],
};

/**
 * Requirement Extractor Skill
 *
 * Extract and structure requirements from various documents
 */

export const requirementExtractor = {
  name: 'requirement-extractor',
  description: '從各種文檔中提取結構化的需求資訊，包括用戶故事、驗收條件、業務規則等',
  usage: '從 PRD、功能規格、會議記錄等提取標準化的需求',
  examples: [
    '從 PRD.md 提取所有功能需求清單',
    '將會議決議轉化為正式需求',
    '識別出相互衝突的需求',
  ],
};

/**
 * Markdown Formatter Skill
 *
 * Ensure consistent markdown formatting across documents
 */

export const markdownFormatter = {
  name: 'markdown-formatter',
  description: '統一 Markdown 文檔的格式，包括標題層級、列表、代碼塊、表格等',
  usage: '在寫入或更新文檔時自動格式化，確保符合專案風格',
  examples: [
    '規範化標題層級（# ## ###）',
    '統一列表標記（- + *）',
    '調整代碼塊的縮排',
    '格式化表格為對齊',
  ],
};
