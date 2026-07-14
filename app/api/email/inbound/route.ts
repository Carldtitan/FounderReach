import { NextResponse, type NextRequest } from "next/server";
import { receiveInboundEmail } from "@/lib/conversations";

export async function POST(request: NextRequest) {
  const secret = process.env.INBOUND_EMAIL_SECRET;
  if (!secret || request.headers.get("x-founderreach-inbound") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json() as { from?: string; subject?: string; text?: string; messageId?: string };
    return NextResponse.json(await receiveInboundEmail({
      from: body.from || "",
      subject: body.subject,
      text: body.text || "",
      messageId: body.messageId
    }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Inbound email failed" }, { status: 400 });
  }
}
