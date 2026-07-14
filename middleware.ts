import { updateSession } from "@insforge/sdk/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_API_BASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || process.env.INSFORGE_ANON_KEY;

  if (!baseUrl || !anonKey) return response;
  const cookies = {
    get: (name: string) => request.cookies.get(name)?.value,
    set: (name: string, value: string, options?: any) => response.cookies.set(name, value, options),
    delete: (name: string) => response.cookies.delete(name)
  };
  await updateSession({
    baseUrl,
    anonKey,
    requestCookies: cookies,
    responseCookies: cookies
  }).catch(() => null);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"]
};
