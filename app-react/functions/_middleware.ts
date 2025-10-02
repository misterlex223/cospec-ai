// Cloudflare Pages Functions 中間件
// 用於處理請求，添加安全頭，以及處理 CORS

export const onRequest: PagesFunction = async ({ request, next }) => {
  // 處理 CORS 預檢請求
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // 繼續處理請求
  const response = await next();
  
  // 克隆響應以添加安全頭
  const newResponse = new Response(response.body, response);
  
  // 添加安全頭
  newResponse.headers.set("X-XSS-Protection", "1; mode=block");
  newResponse.headers.set("X-Content-Type-Options", "nosniff");
  newResponse.headers.set("X-Frame-Options", "DENY");
  newResponse.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  newResponse.headers.set("Permissions-Policy", "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()");
  
  // 如果不是本地開發環境，添加 Content-Security-Policy
  if (!request.url.includes("localhost")) {
    newResponse.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' http://localhost:3001 https://*.cloudflare.com;"
    );
  }
  
  return newResponse;
};
