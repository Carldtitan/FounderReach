import { NextResponse, type NextRequest } from "next/server";
import { authActions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const { error } = await authActions(request, response).signOut();
  if (error) return NextResponse.json({ error: error.message || "Sign out failed." }, { status: error.statusCode || 400 });
  return response;
}
