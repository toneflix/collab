import { alova } from 'src/boot/alova'
import type { ResponseBody } from '../models'

export type ConversationType = 'project-track' | 'project' | 'track' | 'release'

export type ChatPerson = {
  id: number | string;
  name: string;
  username?: string;
  imageUrl?: string | null;
}

export type ChatMessage = {
  id: number | string;
  body: string;
  user: ChatPerson | null;
  userId: number | string;
  type: 'comment' | 'reply';
  parent: { id: number | string; body: string; user: ChatPerson | null } | null;
  conversation: { type: ConversationType; id: number | string } | null;
  createdAt: string;
  /** Set on messages this tab is still sending */
  pending?: boolean;
  /** Set when sending failed */
  failed?: boolean;
}

/** What a conversation is about, plus its latest message and unread count */
export type Conversation = {
  key: string;
  type: ConversationType;
  id: number | string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  context: { projectId?: number | string; artistId?: number | string; slug?: string };
  lastMessage?: { id: number | string; body: string; user: ChatPerson | null; createdAt: string } | null;
  unread: number;
  updatedAt?: string | null;
  canDeleteAny?: boolean;
}

type ListBody = ResponseBody<Conversation[]> & { meta: { unread: number } }
type MessagesBody = ResponseBody<ChatMessage[]> & { meta: { hasMore: boolean } }

/** The signed-in user's conversations, most recent first */
export const loadConversationsRequest = () =>
  alova.Get('conversations', {
    transform: (e: ListBody) => ({ list: e.data, unread: e.meta?.unread ?? 0 }),
    cacheFor: 0,
  })

/** What one conversation is about */
export const loadConversationRequest = (type: string, id: string | number) =>
  alova.Get(`conversations/${type}/${id}`, {
    transform: (e: ResponseBody<Conversation>) => e.data,
    cacheFor: 0,
  })

/** A page of messages, oldest first; `before` loads the page above that message */
export const loadMessagesRequest = (type: string, id: string | number, before?: string | number) =>
  alova.Get(`conversations/${type}/${id}/messages`, {
    params: { limit: 30, ...(before ? { before } : {}) },
    transform: (e: MessagesBody) => ({ messages: e.data, hasMore: !!e.meta?.hasMore }),
    cacheFor: 0,
  })

export const sendMessageRequest = (type: string, id: string | number, body: string, replyTo?: string | number) =>
  alova.Post<ResponseBody<ChatMessage>>(`conversations/${type}/${id}/messages`, {
    body,
    ...(replyTo ? { reply_to: replyTo } : {}),
  })

export const deleteMessageRequest = (type: string, id: string | number, messageId: string | number) =>
  alova.Delete<ResponseBody<{ id: number }>>(`conversations/${type}/${id}/messages/${messageId}`)

export const markConversationReadRequest = (type: string, id: string | number) =>
  alova.Post(`conversations/${type}/${id}/read`, {})
