import { NextResponse, type NextRequest } from "next/server";
import { authActions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  const name = String(body.name || "").trim();
  if (!email || password.length < 8) {
    return NextResponse.json({ error: "Use an email and a password of at least 8 characters." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  const { data, error } = await authActions(request, response).signUp({
    email,
    password,
    name: name || undefined,
    redirectTo: new URL("/", request.url).toString()
  });
  if (error) return NextResponse.json({ error: error.message || "Account creation failed." }, { status: error.statusCode || 400 });
  return NextResponse.json({ ok: true, requireEmailVerification: Boolean(data?.requireEmailVerification) }, { headers: response.headers });
}
