// Cloudflare Pages Functions 類型定義

interface Env {
  [key: string]: string;
}

interface RequestContext {
  request: Request;
  env: Env;
  params: { [key: string]: string };
  waitUntil: (promise: Promise<any>) => void;
  next: () => Promise<Response>;
  data: Record<string, unknown>;
}

type PagesFunction = (context: RequestContext) => Promise<Response> | Response;
