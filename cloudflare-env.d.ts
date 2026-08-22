type D1Database = Parameters<typeof import("drizzle-orm/d1").drizzle>[0];

interface Fetcher {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
}

declare module "cloudflare:workers" {
  export const env: { DB?: D1Database };
}
