"use client";

import type { ClientSessionState, MessageStreamEvent } from "eve/client";
import { createFallbackTitle, DEFAULT_CHAT_TITLE } from "./title";
import type { ActiveChat, ChatListItem } from "./types";

const STORAGE_KEY = "eve-chat-template:chats";
const STORAGE_VERSION = 1;
const MAX_STORED_CHATS = 50;

type StoredChat = ActiveChat & {
  readonly updatedAt: string;
};

type StoredChatState = {
  readonly chats: readonly StoredChat[];
  readonly version: typeof STORAGE_VERSION;
};

export function listLocalChats(): ChatListItem[] {
  return readState().chats.map(toListItem);
}

export function getLocalChat(chatId: string): ActiveChat | null {
  const chat = readState().chats.find((item) => item.id === chatId);

  return chat ? toActiveChat(chat) : null;
}

export function createLocalChat(pendingUserMessage?: string) {
  const pendingMessage = pendingUserMessage?.trim() || null;
  const now = new Date().toISOString();
  const chat: StoredChat = {
    events: [],
    id: crypto.randomUUID(),
    pendingUserMessage: pendingMessage,
    session: undefined,
    title: pendingMessage ? createFallbackTitle(pendingMessage) : DEFAULT_CHAT_TITLE,
    updatedAt: now,
  };

  updateState((chats) => [chat, ...chats]);

  return toListItem(chat);
}

export function deleteLocalChat(chatId: string) {
  updateState((chats) => chats.filter((chat) => chat.id !== chatId));
}

export function markLocalChatPendingMessage(chatId: string, message: string) {
  const pendingMessage = message.trim();

  if (!pendingMessage) {
    throw new Error("Message cannot be empty.");
  }

  return updateChat(chatId, (chat) => ({
    ...chat,
    pendingUserMessage: pendingMessage,
    title: chat.title === DEFAULT_CHAT_TITLE ? createFallbackTitle(pendingMessage) : chat.title,
    updatedAt: new Date().toISOString(),
  }));
}

export function clearLocalChatPendingMessage(chatId: string) {
  updateChat(chatId, (chat) => ({
    ...chat,
    pendingUserMessage: null,
  }));
}

export function appendLocalChatEvent({
  chatId,
  event,
  eventIndex,
}: {
  readonly chatId: string;
  readonly event: MessageStreamEvent;
  readonly eventIndex: number;
}) {
  updateChat(chatId, (chat) => {
    const events = [...chat.events];

    if (eventIndex >= events.length) {
      events.push(event);
    } else {
      events[eventIndex] = event;
    }

    return { ...chat, events };
  });
}

export function saveLocalChatSession(chatId: string, session: ClientSessionState) {
  updateChat(chatId, (chat) => ({ ...chat, session }));
}

export function saveLocalChatSnapshot({
  chatId,
  events,
  session,
}: {
  readonly chatId: string;
  readonly events: readonly MessageStreamEvent[];
  readonly session: ClientSessionState | undefined;
}) {
  updateChat(chatId, (chat) => ({
    ...chat,
    events: compactStreamEvents(events),
    pendingUserMessage: null,
    session,
    updatedAt: new Date().toISOString(),
  }));
}

export function skipLocalChatAuthorization({
  chatId,
  events,
  session,
}: {
  readonly chatId: string;
  readonly events: readonly MessageStreamEvent[];
  readonly session: ClientSessionState | undefined;
}) {
  const chat = updateChat(chatId, (current) => ({
    ...current,
    events: compactStreamEvents([...current.events, ...events]),
    pendingUserMessage: null,
    session,
    updatedAt: new Date().toISOString(),
  }));

  return {
    chat: toListItem(chat),
    eventCount: events.length,
    eventIndex: chat.events.length - events.length,
  };
}

function updateChat(chatId: string, update: (chat: StoredChat) => StoredChat) {
  const currentChat = readState().chats.find((chat) => chat.id === chatId);

  if (!currentChat) {
    throw new Error("Chat not found.");
  }

  const updatedChat = update(currentChat);

  updateState((chats) => chats.map((chat) => (chat.id === chatId ? updatedChat : chat)));

  return updatedChat;
}

function updateState(update: (chats: readonly StoredChat[]) => readonly StoredChat[]) {
  const nextChats = [...update(readState().chats)]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, MAX_STORED_CHATS);

  commitState({ chats: nextChats, version: STORAGE_VERSION });
}

/**
 * A streaming turn emits one persistence call per stream event (thousands for
 * a single answer). Re-serializing the whole store synchronously per event is
 * quadratic in the event count and blocks the main thread long enough that the
 * page freezes — the store grows to hundreds of kilobytes while events arrive
 * faster than they can be processed. The cache below keeps the authoritative
 * state in memory and coalesces writes: mutations are cheap and localStorage
 * is updated at most once per flush window.
 */
const FLUSH_DELAY_MS = 250;

let stateCache: StoredChatState | null = null;
let flushHandle: number | undefined;
let listenersAttached = false;

function commitState(next: StoredChatState) {
  stateCache = next;
  scheduleFlush();
}

function scheduleFlush() {
  if (typeof window === "undefined") {
    return;
  }

  if (!listenersAttached) {
    listenersAttached = true;
    // Persist buffered state before the page goes away (refresh/close).
    window.addEventListener("pagehide", flushStateNow);
    // Another tab wrote to the same key: drop our cache and re-read lazily.
    window.addEventListener("storage", (event) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        stateCache = null;
      }
    });
  }

  if (flushHandle !== undefined) {
    return;
  }

  flushHandle = window.setTimeout(() => {
    flushHandle = undefined;
    flushStateNow();
  }, FLUSH_DELAY_MS);
}

function persistState(state: StoredChatState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function flushStateNow() {
  if (flushHandle !== undefined) {
    window.clearTimeout(flushHandle);
    flushHandle = undefined;
  }

  if (!stateCache) {
    return;
  }

  // Fast path under the quota.
  if (persistState(stateCache)) {
    return;
  }

  // Quota exceeded. Drop the oldest chats one at a time (chats are sorted
  // newest-first by updateState) until the remaining payload fits. This is
  // strictly better than throwing: the active chat keeps its history, older
  // history may be lost only if truly evicted, and retries resume via the
  // next mutation.
  let next: StoredChatState = stateCache;
  while (next.chats.length > 1) {
    next = { ...next, chats: next.chats.slice(0, next.chats.length - 1) };
    if (persistState(next)) {
      stateCache = next;
      // eslint-disable-next-line no-console
      console.warn(
        "Pruned older chats to fit browser storage quota;",
        stateCache.chats.length,
        "chats retained.",
      );
      return;
    }
  }

  // Last resort: keep a single chat without its heavy event/session payload.
  const single = next.chats[0];
  if (single) {
    const trimmed: StoredChat = {
      ...single,
      events: [],
      session: undefined,
    };
    const final: StoredChatState = { chats: [trimmed], version: STORAGE_VERSION };
    if (persistState(final)) {
      stateCache = final;
      return;
    }
  }

  // Nothing could be persisted. Keep the in-memory state so the running app
  // still works; persistence resumes on the next mutation. never throw here:
  // a throw would crash the stream render path on every subsequent event.
  console.error(
    "Failed to persist chat history to browser storage: quota exceeded; keeping in-memory state only.",
  );
}

function readState(): StoredChatState {
  if (stateCache) {
    return stateCache;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      stateCache = emptyState();
      return stateCache;
    }

    const parsed = JSON.parse(raw) as Partial<StoredChatState>;

    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.chats)) {
      stateCache = emptyState();
      return stateCache;
    }

    stateCache = { chats: parsed.chats.filter(isStoredChat), version: STORAGE_VERSION };
    return stateCache;
  } catch {
    stateCache = emptyState();
    return stateCache;
  }
}

function isStoredChat(value: unknown): value is StoredChat {
  if (!value || typeof value !== "object") {
    return false;
  }

  const chat = value as Partial<StoredChat>;

  return (
    typeof chat.id === "string" &&
    typeof chat.title === "string" &&
    typeof chat.updatedAt === "string" &&
    Array.isArray(chat.events)
  );
}

function toActiveChat(chat: StoredChat): ActiveChat {
  return {
    events: chat.events,
    id: chat.id,
    pendingUserMessage: chat.pendingUserMessage ?? null,
    session: chat.session,
    title: chat.title,
  };
}

function toListItem(chat: StoredChat): ChatListItem {
  return {
    id: chat.id,
    title: chat.title,
    updatedAt: chat.updatedAt,
  };
}

/**
 * A single turn emits thousands of fine-grained stream events ("message.appended"
 * deltas, reasoning deltas, input-text deltas). Persisting them verbatim blows
 * through browser-storage quota after a handful of chats. Collapse consecutive
 * same-type, same-target deltas into one accumulated event: byte-identical
 * rendered output, ~10-50x smaller store.
 */
function compactStreamEvents(events: readonly MessageStreamEvent[]): readonly MessageStreamEvent[] {
  const compacted: MessageStreamEvent[] = [];

  for (const event of events) {
    const previous = compacted[compacted.length - 1];

    if (
      event.type === "message.appended" &&
      previous?.type === "message.appended" &&
      event.data?.turnId !== undefined &&
      event.data.turnId === previous.data?.turnId
    ) {
      compacted[compacted.length - 1] = {
        ...event,
        data: {
          ...previous.data,
          ...event.data,
          messageDelta: concatenateDelta(previous.data?.messageDelta, event.data?.messageDelta),
        },
        meta: event.meta ?? previous.meta,
      };
      continue;
    }

    if (
      event.type === "reasoning.appended" &&
      previous?.type === "reasoning.appended" &&
      event.data?.turnId !== undefined &&
      event.data.turnId === previous.data?.turnId
    ) {
      compacted[compacted.length - 1] = {
        ...event,
        data: {
          ...previous.data,
          ...event.data,
          reasoningDelta: concatenateDelta(previous.data?.reasoningDelta, event.data?.reasoningDelta),
        },
        meta: event.meta ?? previous.meta,
      };
      continue;
    }

    if (
      event.type === "action.input.appended" &&
      previous?.type === "action.input.appended" &&
      event.data?.turnId !== undefined &&
      event.data.turnId === previous.data?.turnId
    ) {
      compacted[compacted.length - 1] = {
        ...event,
        data: {
          ...previous.data,
          ...event.data,
          inputTextDelta: concatenateDelta(previous.data?.inputTextDelta, event.data?.inputTextDelta),
        },
        meta: event.meta ?? previous.meta,
      };
      continue;
    }

    compacted.push(event);
  }

  return compacted;
}

function concatenateDelta(previous: unknown, next: unknown): string {
  const left = typeof previous === "string" ? previous : "";
  const right = typeof next === "string" ? next : "";
  return left + right;
}

function emptyState(): StoredChatState {
  return { chats: [], version: STORAGE_VERSION };
}
