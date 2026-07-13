import { NextResponse, type NextRequest } from "next/server";
import { authActions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  const response = NextResponse.json({ ok: true });
  const { data, error } = await authActions(request, response).signInWithPassword({ email, password });
  if (error || !data?.user) {
    return NextResponse.json({ error: error?.message || "Sign in failed." }, { status: error?.statusCode || 401 });
  }
  return response;
}
