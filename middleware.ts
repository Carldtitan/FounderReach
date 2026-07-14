import { updateSession, type CookieOptions, type CookieStore } from "@insforge/sdk/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_API_BASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || process.env.INSFORGE_ANON_KEY;

  if (!baseUrl || !anonKey) return response;
  function setCookie(name: string, value: string, options?: CookieOptions): unknown;
  function setCookie(options: { name: string; value: string } & CookieOptions): unknown;
  function setCookie(nameOrOptions: string | ({ name: string; value: string } & CookieOptions), value?: string, options?: CookieOptions) {
    const cookie = typeof nameOrOptions === "string" ? { name: nameOrOptions, value: value || "", ...options } : nameOrOptions;
    return response.cookies.set(cookie);
  }

  function deleteCookie(name: string): unknown;
  function deleteCookie(options: { name: string }): unknown;
  function deleteCookie(nameOrOptions: string | { name: string }) {
    if (typeof nameOrOptions === "string") return response.cookies.delete(nameOrOptions);
    return response.cookies.delete(nameOrOptions);
  }

  const cookies: CookieStore = {
    get: (name: string) => request.cookies.get(name)?.value,
    set: setCookie,
    delete: deleteCookie
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
