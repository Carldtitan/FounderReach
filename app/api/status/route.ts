import { NextResponse } from "next/server";
import { insforgeReady } from "@/lib/insforge";

export async function GET() {
  return NextResponse.json({
    insforge: await insforgeReady(),
    nimble: Boolean(process.env.NIMBLE_API_KEY),
    nebius: Boolean(process.env.NEBIUS_API_KEY),
    band: Boolean(process.env.BAND_API_KEY),
    bandRoom: Boolean(process.env.BAND_API_KEY)
  });
}
