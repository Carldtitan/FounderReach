import { NextResponse } from "next/server";
import { getMissionBundle } from "@/lib/store";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json(await getMissionBundle(params.id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Mission not found" }, { status: 404 });
  }
}

