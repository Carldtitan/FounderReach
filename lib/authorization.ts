import type { NextRequest } from "next/server";
import { requireUser } from "./auth";
import { getMissionBundle } from "./store";

export async function requireMissionOwner(request: NextRequest, missionId: string) {
  const user = await requireUser(request);
  const bundle = await getMissionBundle(missionId);
  if (bundle.founder.ownerId !== user.id) throw new Error("AUTH_FORBIDDEN");
  return { user, bundle };
}
