import { alova, axios } from 'src/boot/alova'
import type { ResponseBody } from '../models'

export type ConversationType = 'project-track' | 'project' | 'track' | 'release'

export type ChatPerson = {
  id: number | string;
  name: string;
  username?: string;
  imageUrl?: string | null;
}

/** A part of a project track a message points at, in seconds */
export type ChatRegion = {
  start: number;
  end: number;
  stemId?: number | string | null;
  stemName?: string | null;
  trackId?: number | string;
  projectId?: number | string;
}

/** "Drums · 0:12.5–0:18" */
export const regionLabel = (region: ChatRegion) => {
  const t = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds - m * 60;
    const text = Number.isInteger(Math.round(s * 10) / 10) ? String(Math.round(s)) : s.toFixed(1);
    return `${m}:${text.padStart(text.includes('.') ? 4 : 2, '0')}`;
  };
  const span = `${t(region.start)}–${t(region.end)}`;
  return region.stemName ? `${region.stemName} · ${span}` : span;
};

export type ChatVoice = {
  url: string;
  /** Seconds */
  duration: number;
  /** Loudness bars from 0 to 1 */
  waveform: number[];
  mime?: string | null;
}

export type ChatMessage = {
  id: number | string;
  body: string;
  user: ChatPerson | null;
  userId: number | string;
  type: 'comment' | 'reply';
  parent: {
    id: number | string;
    body: string;
    user: ChatPerson | null;
    region?: ChatRegion | null;
    hasVoice?: boolean;
  } | null;
  voice?: ChatVoice | null;
  region?: ChatRegion | null;
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

type ListBody = ResponseBody<Conversation[]> & { unread: number }
type MessagesBody = ResponseBody<ChatMessage[]> & { meta: { next_cursor: string | null } }

/** The signed-in user's conversations, most recent first */
export const loadConversationsRequest = () =>
  alova.Get('conversations', {
    transform: (e: ListBody) => ({ list: e.data, unread: e.unread ?? 0 }),
    cacheFor: 0,
  })

/** What one conversation is about */
export const loadConversationRequest = (type: string, id: string | number) =>
  alova.Get(`conversations/${type}/${id}`, {
    transform: (e: ResponseBody<Conversation>) => e.data,
    cacheFor: 0,
  })

/** A page of messages, oldest first; pass the last page's `cursor` to load the page above it */
export const loadMessagesRequest = (type: string, id: string | number, cursor?: string | null) =>
  alova.Get(`conversations/${type}/${id}/messages`, {
    params: { limit: 30, ...(cursor ? { cursor } : {}) },
    transform: (e: MessagesBody) => ({ messages: e.data, cursor: e.meta?.next_cursor ?? null }),
    cacheFor: 0,
  })

export type OutgoingMessage = {
  body?: string;
  replyTo?: string | number;
  voice?: { blob: Blob; duration: number; waveform: number[] };
  region?: ChatRegion | null;
}

/** Send a message. With a voice note it goes up as a file upload. */
export const sendMessageRequest = (type: string, id: string | number, message: OutgoingMessage) => {
  const url = `conversations/${type}/${id}/messages`
  const region = message.region
    ? { start: message.region.start, end: message.region.end, ...(message.region.stemId ? { stem_id: message.region.stemId } : {}) }
    : undefined

  if (!message.voice) {
    return alova.Post<ResponseBody<ChatMessage>>(url, {
      body: message.body,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      ...(region ? { region } : {}),
    })
  }

  const form = new FormData()
  const { blob, duration, waveform } = message.voice
  const ext = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
  form.append('voice', blob, `voice-note.${ext}`)
  form.append('duration', String(Math.round(duration * 100) / 100))
  form.append('waveform', JSON.stringify(waveform))
  if (message.body) form.append('body', message.body)
  if (message.replyTo) form.append('reply_to', String(message.replyTo))
  if (region) Object.entries(region).forEach(([k, v]) => form.append(`region[${k}]`, String(v)))

  const request = axios.Post<ResponseBody<ChatMessage>>(url, form)
  request.config.headers['Content-Type'] = 'multipart/form-data'
  return request
}

export const deleteMessageRequest = (type: string, id: string | number, messageId: string | number) =>
  alova.Delete<ResponseBody<{ id: number }>>(`conversations/${type}/${id}/messages/${messageId}`)

export const markConversationReadRequest = (type: string, id: string | number) =>
  alova.Post(`conversations/${type}/${id}/read`, {})
