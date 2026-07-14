import { fetchTable, mirrorInsert, mirrorUpdate } from "./insforge";
import { newId, now } from "./store";
import type { Autopilot, AutopilotSnapshot, AutomationRun, ConversationMessage, OutreachConversation, OutreachQueueItem, PersistentLead } from "./types";

async function requiredInsert(table: string, value: unknown) {
  const result = await mirrorInsert(table, value);
  if (!result.mirrored) throw new Error(result.error || `InsForge could not persist ${table}.`);
}

export async function getAutopilotSnapshot(missionId: string): Promise<AutopilotSnapshot> {
  const [autopilots, leads, queue, runs, conversations, messages] = await Promise.all([
    fetchTable<Autopilot>("autopilots"),
    fetchTable<PersistentLead>("persistent_leads"),
    fetchTable<OutreachQueueItem>("outreach_queue"),
    fetchTable<AutomationRun>("automation_runs"),
    fetchTable<OutreachConversation>("outreach_conversations"),
    fetchTable<ConversationMessage>("conversation_messages")
  ]);
  const autopilot = (autopilots || []).find((item) => item.missionId === missionId) || null;
  if (!autopilot) return { autopilot: null, leads: [], queue: [], runs: [], conversations: [], messages: [] };
  return {
    autopilot,
    leads: (leads || []).filter((item) => item.automationId === autopilot.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    queue: (queue || []).filter((item) => item.automationId === autopilot.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    runs: (runs || []).filter((item) => item.automationId === autopilot.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    conversations: (conversations || []).filter((item) => item.automationId === autopilot.id).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt)),
    messages: (messages || []).filter((item) => (conversations || []).some((conversation) => conversation.automationId === autopilot.id && conversation.id === item.conversationId)).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  };
}

export async function listActiveAutopilots() {
  const autopilots = await fetchTable<Autopilot>("autopilots");
  return (autopilots || []).filter((item) => item.active);
}

export async function findAutopilotById(id: string) {
  const autopilots = await fetchTable<Autopilot>("autopilots");
  return (autopilots || []).find((autopilot) => autopilot.id === id) || null;
}

export async function createAutopilot(input: Omit<Autopilot, "id" | "createdAt" | "updatedAt"> & { id?: string }) {
  const createdAt = now();
  const autopilot: Autopilot = { ...input, id: input.id || newId("auto"), createdAt, updatedAt: createdAt };
  await requiredInsert("autopilots", autopilot);
  return autopilot;
}

export async function updateAutopilot(id: string, update: Partial<Autopilot>) {
  const updatedAt = now();
  const result = await mirrorUpdate("autopilots", id, { ...update, updatedAt });
  if (!result.mirrored) throw new Error(result.error || "InsForge could not update the autopilot.");
}

export async function findLead(automationId: string, externalKey: string) {
  const leads = await fetchTable<PersistentLead>("persistent_leads");
  return (leads || []).find((item) => item.automationId === automationId && item.externalKey === externalKey) || null;
}

export async function findLeadByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const leads = await fetchTable<PersistentLead>("persistent_leads");
  return (leads || []).find((lead) => lead.contact.email?.trim().toLowerCase() === normalized) || null;
}

export async function createLead(input: Omit<PersistentLead, "id" | "createdAt" | "updatedAt">) {
  const createdAt = now();
  const lead: PersistentLead = { ...input, id: newId("lead"), createdAt, updatedAt: createdAt };
  await requiredInsert("persistent_leads", lead);
  return lead;
}

export async function updateLead(id: string, update: Partial<PersistentLead>) {
  const result = await mirrorUpdate("persistent_leads", id, { ...update, updatedAt: now() });
  if (!result.mirrored) throw new Error(result.error || "InsForge could not update the lead.");
}

export async function findQueueForLead(leadId: string) {
  const queue = await fetchTable<OutreachQueueItem>("outreach_queue");
  return (queue || []).find((item) => item.leadId === leadId) || null;
}

export async function createQueueItem(input: Omit<OutreachQueueItem, "id" | "createdAt" | "updatedAt">) {
  const createdAt = now();
  const queue: OutreachQueueItem = { ...input, id: newId("queue"), createdAt, updatedAt: createdAt };
  await requiredInsert("outreach_queue", queue);
  return queue;
}

export async function updateQueueItem(id: string, update: Partial<OutreachQueueItem>) {
  const result = await mirrorUpdate("outreach_queue", id, { ...update, updatedAt: now() });
  if (!result.mirrored) throw new Error(result.error || "InsForge could not update the outreach queue.");
}

export async function findAutomationRun(automationId: string, nimbleRunId: string) {
  const runs = await fetchTable<AutomationRun>("automation_runs");
  return (runs || []).find((item) => item.automationId === automationId && item.nimbleRunId === nimbleRunId) || null;
}

export async function createAutomationRun(input: Omit<AutomationRun, "id" | "createdAt">) {
  const run: AutomationRun = { ...input, id: newId("autorun"), createdAt: now() };
  await requiredInsert("automation_runs", run);
  return run;
}

export async function updateAutomationRun(id: string, update: Partial<AutomationRun>) {
  const result = await mirrorUpdate("automation_runs", id, update);
  if (!result.mirrored) throw new Error(result.error || "InsForge could not update the automation run.");
}

export async function countTodaySent(automationId: string) {
  const queue = await fetchTable<OutreachQueueItem>("outreach_queue");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return (queue || []).filter((item) => item.automationId === automationId && item.state === "sent" && item.sentAt && new Date(item.sentAt) >= today).length;
}

export async function findConversationByLead(leadId: string) {
  const conversations = await fetchTable<OutreachConversation>("outreach_conversations");
  return (conversations || []).find((conversation) => conversation.leadId === leadId) || null;
}

export async function createConversation(input: Omit<OutreachConversation, "id" | "createdAt" | "updatedAt">) {
  const createdAt = now();
  const conversation: OutreachConversation = { ...input, id: newId("conv"), createdAt, updatedAt: createdAt };
  await requiredInsert("outreach_conversations", conversation);
  return conversation;
}

export async function updateConversation(id: string, update: Partial<OutreachConversation>) {
  const result = await mirrorUpdate("outreach_conversations", id, { ...update, updatedAt: now() });
  if (!result.mirrored) throw new Error(result.error || "InsForge could not update the conversation.");
}

export async function createConversationMessage(input: Omit<ConversationMessage, "id" | "createdAt">) {
  const message: ConversationMessage = { ...input, id: newId("message"), createdAt: now() };
  await requiredInsert("conversation_messages", message);
  return message;
}

export async function findConversationMessageByProviderId(providerMessageId: string) {
  if (!providerMessageId) return null;
  const messages = await fetchTable<ConversationMessage>("conversation_messages");
  return (messages || []).find((message) => message.providerMessageId === providerMessageId) || null;
}

export async function listConversationMessages(conversationId: string) {
  const messages = await fetchTable<ConversationMessage>("conversation_messages");
  return (messages || []).filter((message) => message.conversationId === conversationId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
