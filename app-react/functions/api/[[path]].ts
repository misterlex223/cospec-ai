// API 代理函數
// 將 /api/* 請求代理到後端 API

export const onRequest: PagesFunction = async ({ request, env }) => {
  // 獲取目標 API URL
  const apiUrl = env.API_URL || 'http://localhost:3001';
  
  // 從請求 URL 中提取路徑
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '');
  
  // 構建目標 URL
  const targetUrl = `${apiUrl}${path}${url.search}`;
  
  // 創建新的請求
  const apiRequest = new Request(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'follow',
  });
  
  try {
    // 發送請求到後端 API
    const response = await fetch(apiRequest);
    
    // 創建新的響應
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
    });
    
    // 複製所有響應頭
    response.headers.forEach((value, key) => {
      newResponse.headers.set(key, value);
    });
    
    // 添加 CORS 頭
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    return newResponse;
  } catch (error) {
    // 處理錯誤
    return new Response(JSON.stringify({
      error: 'API Proxy Error',
      message: error.message,
      path: path,
      targetUrl: targetUrl
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};
