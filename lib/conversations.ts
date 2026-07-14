import { dispatchInboundReply, sendBandEvent } from "./band";
import {
  createConversation,
  createConversationMessage,
  findAutopilotById,
  findConversationByLead,
  findConversationMessageByProviderId,
  findLeadByEmail,
  listConversationMessages,
  updateConversation,
  updateLead
} from "./autopilot-store";
import { sendInsForgeEmail } from "./insforge";
import { generateConversationReply } from "./nebius";
import { addEvent, getMissionBundle, now } from "./store";

export interface InboundEmail {
  from: string;
  subject?: string;
  text: string;
  messageId?: string;
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br />");
}

function sensitiveReply(value: string) {
  return /\b(unsubscribe|opt[ -]?out|stop|remove me|price|pricing|discount|contract|legal|security|hipaa|compliance|medical|financial|invoice|refund|data access|delete my data)\b/i.test(value);
}

function replySubject(subject: string) {
  return /^re:/i.test(subject) ? subject : `Re: ${subject || "Quick question"}`;
}

export async function receiveInboundEmail(input: InboundEmail) {
  const from = input.from.trim().toLowerCase();
  const subject = input.subject?.trim() || "Quick question";
  const text = input.text.trim();
  if (!validEmail(from) || !text) throw new Error("A sender email and message text are required.");
  if (input.messageId && await findConversationMessageByProviderId(input.messageId)) return { duplicate: true };

  const lead = await findLeadByEmail(from);
  if (!lead) return { ignored: true, reason: "No FounderReach lead uses that public email." };
  const autopilot = await findAutopilotById(lead.automationId);
  if (!autopilot) return { ignored: true, reason: "No active FounderReach watch owns this lead." };
  const { founder, mission } = await getMissionBundle(autopilot.missionId);
  const existing = await findConversationByLead(lead.id);
  const conversation = existing || await createConversation({
    automationId: autopilot.id,
    leadId: lead.id,
    participantEmail: from,
    subject,
    state: "open",
    lastMessageAt: now()
  });

  await createConversationMessage({
    conversationId: conversation.id,
    direction: "inbound",
    sender: from,
    subject,
    body: text,
    providerMessageId: input.messageId
  });
  await updateConversation(conversation.id, { subject, state: "open", lastMessageAt: now() });
  await updateLead(lead.id, { status: "replied" });
  await dispatchInboundReply(mission.bandChatId, { company: lead.company, subject, body: text });

  const history = await listConversationMessages(conversation.id);
  const draft = await generateConversationReply({ founder, company: lead.company, subject, messages: history });
  const needsHuman = draft.needsHuman || sensitiveReply(text);
  const event = await addEvent({
    missionId: mission.id,
    agent: "Conversation Agent",
    eventType: needsHuman ? "approval" : "draft",
    message: needsHuman ? `${lead.company} replied. Reply held for review: ${draft.reason}` : `${lead.company} replied. BAND review and Nebius reply draft are ready.`,
    tool: "BAND + Nebius"
  });
  await sendBandEvent(event, mission.bandChatId);

  if (!autopilot.autoReply || needsHuman || !validEmail(autopilot.replyTo || "")) {
    await updateConversation(conversation.id, { state: "needs_review", lastMessageAt: now() });
    await updateLead(lead.id, { status: "needs_review" });
    return { conversationId: conversation.id, state: "needs_review", draft: draft.body, reason: draft.reason };
  }

  const sent = await sendInsForgeEmail({
    to: from,
    subject: replySubject(subject),
    html: escapeHtml(draft.body),
    from: autopilot.senderName,
    replyTo: autopilot.replyTo
  });
  if (!sent.sent || sent.skipped?.length) {
    await updateConversation(conversation.id, { state: "needs_review", lastMessageAt: now() });
    await updateLead(lead.id, { status: "needs_review" });
    return { conversationId: conversation.id, state: "needs_review", draft: draft.body, reason: sent.error || "Email delivery needs review." };
  }

  await createConversationMessage({
    conversationId: conversation.id,
    direction: "outbound",
    sender: founder.startup,
    subject: replySubject(subject),
    body: draft.body,
    providerMessageId: sent.id
  });
  await updateConversation(conversation.id, { state: "open", lastMessageAt: now() });
  return { conversationId: conversation.id, state: "open", autoSent: true };
}
