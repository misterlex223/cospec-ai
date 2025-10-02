// 健康檢查端點

export const onRequest: PagesFunction = async () => {
  return new Response(JSON.stringify({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.CLOUDFLARE_ENV || "unknown"
  }), {
    headers: {
      "Content-Type": "application/json"
    }
  });
};
