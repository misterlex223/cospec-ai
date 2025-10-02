// 功能項目: 3.2.4 即時保存功能
export function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

// 功能項目: 2.1.1 遞迴掃描指定目錄下所有 Markdown 文件
export function getFileExtension(filename) {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
}

// 功能項目: 3.1.1 顯示目錄結構
export function sortFileTree(files) {
  return [...files].sort((a, b) => {
    // 目錄優先
    if (a.type === 'directory' && b.type !== 'directory') return -1;
    if (a.type !== 'directory' && b.type === 'directory') return 1;
    
    // 按名稱排序
    return a.name.localeCompare(b.name);
  });
}

// 功能項目: 4.2.1 文件讀寫錯誤處理
export function formatError(error) {
  if (!error) return '未知錯誤';
  
  if (error.response) {
    // 服務器回應錯誤
    const status = error.response.status;
    const message = error.response.data?.message || error.message;
    
    switch (status) {
      case 404:
        return `找不到文件: ${message}`;
      case 403:
        return `沒有權限: ${message}`;
      case 500:
        return `服務器錯誤: ${message}`;
      default:
        return `錯誤 (${status}): ${message}`;
    }
  } else if (error.request) {
    // 請求發送但沒有收到回應
    return '無法連接到服務器，請檢查網絡連接';
  } else {
    // 請求設置出錯
    return `請求錯誤: ${error.message}`;
  }
}
