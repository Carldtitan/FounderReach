import { createAuthActions, createServerClient } from "@insforge/sdk/ssr";
import type { NextRequest, NextResponse } from "next/server";

export interface AuthenticatedUser {
  id: string;
  email?: string | null;
  name?: string | null;
}

function authConfig() {
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_API_BASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || process.env.INSFORGE_ANON_KEY;
  if (!baseUrl || !anonKey) throw new Error("InsForge Auth is not configured.");
  return { baseUrl, anonKey };
}

export function authActions(request: NextRequest, response: NextResponse) {
  return createAuthActions({
    ...authConfig(),
    requestCookies: request.cookies,
    responseCookies: response.cookies
  });
}

export async function currentUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  const client = createServerClient({ ...authConfig(), cookies: request.cookies });
  const { data, error } = await client.auth.getCurrentUser();
  if (error || !data?.user?.id) return null;
  return {
    id: data.user.id,
    email: data.user.email || null,
    name: typeof data.user.profile?.name === "string" ? data.user.profile.name : null
  };
}

export async function requireUser(request: NextRequest) {
  const user = await currentUser(request);
  if (!user) throw new Error("AUTH_REQUIRED");
  return user;
}
