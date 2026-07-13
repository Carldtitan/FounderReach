import { promises as fs } from "fs";
import path from "path";
import { createAdminClient, createClient } from "@insforge/sdk";

type InsForgeClient = any;

let clientPromise: Promise<InsForgeClient | null> | null = null;

async function readLinkedProject() {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), ".insforge", "project.json"), "utf8");
    return JSON.parse(raw) as { oss_host?: string; api_key?: string };
  } catch {
    return null;
  }
}

async function getClient() {
  if (clientPromise) return clientPromise;
  clientPromise = (async () => {
    const linkedProject = await readLinkedProject();
    const baseUrl =
      process.env.INSFORGE_API_BASE_URL ||
      process.env.NEXT_PUBLIC_INSFORGE_API_BASE_URL ||
      linkedProject?.oss_host;
    const adminApiKey = process.env.INSFORGE_API_KEY || linkedProject?.api_key;
    const anonKey = process.env.INSFORGE_ANON_KEY;
    if (!baseUrl || (!adminApiKey && !anonKey)) return null;
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");
    try {
      if (adminApiKey) {
        return createAdminClient({ baseUrl: normalizedBaseUrl, apiKey: adminApiKey }) as InsForgeClient;
      }
      return createClient({ baseUrl: normalizedBaseUrl, anonKey }) as InsForgeClient;
    } catch {
      return null;
    }
  })();
  return clientPromise;
}

export async function insforgeReady() {
  return Boolean(await getClient());
}

export async function fetchTable<T>(table: string) {
  const client = await getClient();
  if (!client) return null;
  try {
    const result = await client.database.from(table).select("*");
    if (result.error) throw result.error;
    return (result.data || []) as T[];
  } catch {
    return null;
  }
}

export async function mirrorInsert(table: string, values: unknown) {
  const client = await getClient();
  if (!client) return { mirrored: false };
  try {
    const payload = Array.isArray(values) ? values : [values];
    const result = await client.database.from(table).insert(payload).select();
    if (result.error) throw result.error;
    return { mirrored: true };
  } catch (error) {
    return { mirrored: false, error: describeError(error, "InsForge insert failed") };
  }
}

export async function mirrorUpdate(table: string, id: string, values: unknown) {
  const client = await getClient();
  if (!client) return { mirrored: false };
  try {
    const result = await client.database.from(table).update(values).eq("id", id).select();
    if (result.error) throw result.error;
    return { mirrored: true };
  } catch (error) {
    return { mirrored: false, error: describeError(error, "InsForge update failed") };
  }
}

export async function mirrorDelete(table: string, column: string, value: string) {
  const client = await getClient();
  if (!client) return { mirrored: false };
  try {
    const result = await client.database.from(table).delete().eq(column, value);
    if (result.error) throw result.error;
    return { mirrored: true };
  } catch (error) {
    return { mirrored: false, error: describeError(error, "InsForge delete failed") };
  }
}

function describeError(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}
