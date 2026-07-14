import { NextResponse } from "next/server";
import { insforgeReady } from "@/lib/insforge";

export async function GET() {
  const auth = Boolean((process.env.NEXT_PUBLIC_INSFORGE_URL || process.env.INSFORGE_API_BASE_URL) && (process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || process.env.INSFORGE_ANON_KEY));
  return NextResponse.json({
    insforge: await insforgeReady(),
    auth,
    nimble: Boolean(process.env.NIMBLE_API_KEY),
    nebius: Boolean(process.env.NEBIUS_API_KEY),
    band: Boolean(process.env.BAND_API_KEY),
    bandRoom: Boolean(process.env.BAND_API_KEY),
    capabilities: {
      nimble: ["Google Maps agent batches", "site map", "public contact extraction"],
      band: ["three parallel scouts", "task board", "evidence handoffs"],
      nebius: ["source-grounded ranking", "short outreach drafts"]
    }
  });
}
