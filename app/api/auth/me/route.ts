import { NextResponse, type NextRequest } from "next/server";
import { currentUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = await currentUser(request).catch(() => null);
  return NextResponse.json({ user });
}
