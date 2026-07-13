import { createRefreshAuthRouter } from "@insforge/sdk/ssr";

export const { POST } = createRefreshAuthRouter({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_API_BASE_URL,
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || process.env.INSFORGE_ANON_KEY
});
