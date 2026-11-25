import type { Agent, Item } from "@casm/protocol";
import { lastMessageTime } from "./recent-agents.ts";
export type ChatSignal = { activity: number; messageAt?: number; unread: boolean; status: string; updatedAt: string; tail?: string };
export type ChatSignals = Record<string, ChatSignal>;
export const signalKey = (server: string, agent: string) => JSON.stringify([server, agent]);
const storageKey = "casm.chat-signals-v2";
export function readSignals(storage: Pick<Storage, "getItem">): ChatSignals {
  try {
    const current = storage.getItem(storageKey);
    const migrated = current === null;
    const parsed = JSON.parse(current ?? storage.getItem("casm.chat-signals") ?? "{}");
    return Object.fromEntries(Object.entries(parsed ?? {}).filter(([key, raw]) => {
      const s = raw as ChatSignal;
      return key.startsWith("[") && s && Number.isFinite(s.activity) && typeof s.unread === "boolean" && typeof s.status === "string" && typeof s.updatedAt === "string" && (s.messageAt === undefined || Number.isFinite(s.messageAt));
    }).map(([key, value]) => [key, migrated ? { ...(value as ChatSignal), unread: false, tail: undefined } : value])) as ChatSignals;
  } catch { return {}; }
}
export function saveSignals(storage: Pick<Storage, "setItem">, signals: ChatSignals) {
  try { storage.setItem(storageKey, JSON.stringify(Object.fromEntries(Object.entries(signals).sort((a, b) => b[1].activity - a[1].activity).slice(0, 5000)))); } catch { /* Optional device state. */ }
}
// A first snapshot establishes a baseline, so installing this view does not
// label the entire existing archive unread. Later changes survive reload/offline.
export function observeSignal(previous: ChatSignal | undefined, agent: Pick<Agent, "status" | "updatedAt">, reading: boolean, now = Date.now()): ChatSignal {
  if (!previous) return { activity: Date.parse(agent.updatedAt) || 0, unread: false, status: agent.status, updatedAt: agent.updatedAt };
  const changed = previous.status !== agent.status || previous.updatedAt !== agent.updatedAt;
  const unread = reading ? false : previous.unread;
  if (!changed && previous.unread === unread) return previous;
  // A refreshed snapshot can contain many older updates. Keep their own times.
  return { ...previous, activity: Math.max(previous.activity, Date.parse(agent.updatedAt) || 0,
    previous.status !== agent.status ? now : 0),
    unread, status: agent.status, updatedAt: agent.updatedAt };
}
export function liveSignal(previous: ChatSignal | undefined, agent: Pick<Agent, "status" | "updatedAt">, reading: boolean, now = Date.now(), item?: Item): ChatSignal {
  const reply = item?.kind === "assistant" && item.text.trim() ? tailSignature(item) : undefined;
  return { ...previous, activity: Math.max(previous?.activity ?? 0, now),
    unread: reading ? false : !!previous?.unread || (reply !== undefined && reply !== previous?.tail),
    status: agent.status, updatedAt: agent.updatedAt, ...(reply !== undefined ? { tail: reply } : {}),
    messageAt: Math.max(previous?.messageAt ?? 0, item ? lastMessageTime([item]) : 0) };
}

// Only a fingerprint is kept locally, not message text or attachments.
export function tailSignature(item: Item | undefined): string {
  if (!item) return "empty";
  const fields = item.kind === "tool" ? [item.status, item.output] : item.kind === "subagent" ? [item.status, item.summary, item.activity] : "text" in item ? [item.text] : [];
  const text = JSON.stringify(fields);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `${item.id}:${item.kind}:${hash >>> 0}`;
}
export function sampleSignal(previous: ChatSignal | undefined, agent: Pick<Agent, "status" | "updatedAt">, item: Item | undefined, reading: boolean, { now = Date.now(), messageAt = item ? lastMessageTime([item]) : 0, trackUnread = true } = {}): ChatSignal {
  const base = previous ?? observeSignal(undefined, agent, false, now);
  const latest = Math.max(base.messageAt ?? 0, messageAt);
  if (!trackUnread) return base.messageAt === latest ? base : { ...base, messageAt: latest };
  const reply = item?.kind === "assistant" && item.text.trim() ? item : undefined;
  const tail = reply ? tailSignature(reply) : base.tail ?? "empty";
  const changed = !!reply && base.tail !== undefined && base.tail !== tail;
  return { ...base, tail, messageAt: latest, activity: Math.max(base.activity, Date.parse(item?.at ?? "") || 0, changed ? now : 0), unread: reading ? false : base.unread || changed };
}
