import { alova } from 'src/boot/alova';
import type { ResponseBody } from '../models';

export type AssistantChatStatus = 'idle' | 'thinking' | 'failed';

export type AssistantChat = {
  id: number;
  title: string | null;
  status: AssistantChatStatus;
  error: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssistantActionStatus = 'pending' | 'running' | 'done' | 'failed' | 'cancelled' | 'expired';

/** A change the assistant proposed, which runs once the admin confirms it */
export type AssistantAction = {
  id: number;
  tool: string;
  summary: string;
  status: AssistantActionStatus;
  error: string | null;
  expiresAt: string;
  decidedAt: string | null;
  createdAt: string;
};

export type AssistantMessage = {
  id: number;
  role: 'admin' | 'assistant' | 'tool' | 'action';
  content: string | null;
  /** The tool a tool or action entry used */
  tool: string | null;
  input: Record<string, unknown> | null;
  error: string | null;
  action?: AssistantAction | null;
  createdAt: string;
};

type ChatsBody = ResponseBody<AssistantChat[]> & { available: boolean };
type MessagesBody = ResponseBody<AssistantMessage[]> & {
  chat: AssistantChat;
  meta: { nextCursor: string | null };
};

export const loadAssistantChatsRequest = (page = 1) =>
  alova.Get('admin/assistant/chats', {
    params: { page, limit: 20 },
    transform: (e: ChatsBody) => ({ chats: e.data, meta: e.meta, available: e.available }),
    cacheFor: 0,
  });

/** A page of messages, newest first; pass the last page's `cursor` to load older ones */
export const loadAssistantMessagesRequest = (chatId: number, cursor?: string | null) =>
  alova.Get(`admin/assistant/chats/${chatId}/messages`, {
    params: { limit: 30, ...(cursor ? { cursor } : {}) },
    transform: (e: MessagesBody) => ({ messages: e.data, chat: e.chat, cursor: e.meta?.nextCursor ?? null }),
    cacheFor: 0,
  });

export const startAssistantChatRequest = (message: string) =>
  alova.Post<ResponseBody<AssistantChat>>('admin/assistant/chats', { message });

export const sendAssistantMessageRequest = (chatId: number, message: string) =>
  alova.Post<ResponseBody<AssistantMessage>>(`admin/assistant/chats/${chatId}/messages`, { message });

export const confirmAssistantActionRequest = (id: number) =>
  alova.Post<ResponseBody<AssistantAction>>(`admin/assistant/actions/${id}/confirm`, {});

export const cancelAssistantActionRequest = (id: number) =>
  alova.Post<ResponseBody<AssistantAction>>(`admin/assistant/actions/${id}/cancel`, {});

/** What the assistant did with a tool, in a few words */
const toolLabels: Record<string, string> = {
  find_users: 'Searched accounts',
  show_user: 'Looked at an account',
  unsuspend_user: 'Lifted a suspension',
  set_verified: 'Gave the verified badge',
  adjust_credits: 'Granted AI credits',
  moderation_queue: 'Checked the moderation queue',
  find_content: 'Searched content',
  show_content: 'Looked at content',
  list_takedowns: 'Checked takedowns',
  restore_takedown: 'Restored content',
  releases_in_review: 'Checked releases in review',
  review_release: 'Approved a release',
  artist_claims: 'Checked artist claims',
};

/** One line for a tool the assistant used, like "Searched accounts: jane". */
export const toolLine = (message: AssistantMessage) => {
  const label = toolLabels[message.tool ?? ''] ?? 'Used a tool';
  const input = message.input ?? {};
  const detail = [input.search, input.user, input.type && input.id ? `${String(input.type)} #${String(input.id)}` : null]
    .filter((value) => typeof value === 'string' && value)
    .join(', ');

  return detail ? `${label}: ${detail}` : label;
};

export const actionStatusLabels: Record<AssistantActionStatus, { label: string; color: string }> = {
  pending: { label: 'Waiting for you', color: 'amber-8' },
  running: { label: 'Running', color: 'blue-8' },
  done: { label: 'Done', color: 'green-8' },
  failed: { label: 'Failed', color: 'red-8' },
  cancelled: { label: 'Cancelled', color: 'grey-8' },
  expired: { label: 'Expired', color: 'grey-8' },
};
