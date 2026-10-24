import { defineStore } from 'pinia';
import type { RouteLocationRaw } from 'vue-router';
import {
  loadConversationsRequest,
  markConversationReadRequest,
  type ChatMessage,
  type Conversation,
  type ConversationType,
} from 'src/utils/requests/conversations';

/** Enough to open a conversation before its details have loaded */
export type ConversationRef = {
  type: ConversationType;
  id: number | string;
  title?: string;
  subtitle?: string | null;
  imageUrl?: string | null;
};

export const conversationKey = (c: { type: string; id: number | string }) => `${c.type}.${c.id}`;

/** Where a conversation's subject lives in the app */
export const conversationLink = (c: Conversation): RouteLocationRaw | null => {
  switch (c.type) {
    case 'project-track':
      return c.context.projectId
        ? { name: 'studio.project.track', params: { project_id: c.context.projectId, track_id: c.id } }
        : null;
    case 'project':
      return { name: 'project', params: { project_id: c.id } };
    case 'track':
      return c.context.artistId
        ? { name: 'artist.track', params: { artist_id: c.context.artistId, track_id: c.context.slug || c.id } }
        : null;
    case 'release':
      return c.context.artistId
        ? { name: 'artist.album', params: { artist_id: c.context.artistId, album_id: c.context.slug || c.id } }
        : null;
    default:
      return null;
  }
};

/**
 * The user's conversations, unread counts and the chat dock that floats in
 * the corner of every page.
 */
export const useConversationStore = defineStore('conversations', {
  state: () => ({
    list: <Conversation[]>[],
    unread: 0,
    loaded: false,
    loading: false,
    dock: {
      conversation: <ConversationRef | null>null,
      minimized: false,
    },
    /** Conversations on screen right now; incoming messages there count as read */
    visible: <string[]>[],
  }),

  getters: {
    find: (state) => (key: string) => state.list.find((c) => c.key === key),
  },

  actions: {
    async load() {
      this.loading = true;
      try {
        const { list, unread } = await loadConversationsRequest().send();
        this.list = list;
        this.unread = unread;
        this.loaded = true;
      } catch {
        // Signed out, or offline: keep what we have.
      } finally {
        this.loading = false;
      }
    },

    openDock(conversation: ConversationRef) {
      this.dock.conversation = conversation;
      this.dock.minimized = false;
    },

    closeDock() {
      this.dock.conversation = null;
    },

    toggleMinimized() {
      this.dock.minimized = !this.dock.minimized;
    },

    setVisible(key: string, visible: boolean) {
      this.visible = visible ? [...new Set([...this.visible, key])] : this.visible.filter((k) => k !== key);
      if (visible) void this.markRead(key);
    },

    async markRead(key: string) {
      const item = this.find(key);
      const [type, id] = [key.slice(0, key.lastIndexOf('.')), key.slice(key.lastIndexOf('.') + 1)];
      if (item) {
        this.unread = Math.max(0, this.unread - item.unread);
        item.unread = 0;
      }
      try {
        await markConversationReadRequest(type, id).send();
      } catch {
        // Not critical.
      }
    },

    /**
     * A message arrived (or was sent): move its conversation to the top and
     * count it as unread unless it's on screen or this user wrote it.
     */
    receive(conversation: Conversation, message: ChatMessage, mine = false) {
      const key = conversation.key || conversationKey(conversation);
      const existing = this.find(key);
      const onScreen = this.visible.includes(key);
      const item: Conversation = {
        ...(existing ?? { ...conversation, unread: 0 }),
        lastMessage: { id: message.id, body: message.body, user: message.user, createdAt: message.createdAt },
        updatedAt: message.createdAt,
      };

      if (!mine && !onScreen) {
        item.unread = (existing?.unread ?? 0) + 1;
        this.unread++;
      }

      this.list = [item, ...this.list.filter((c) => c.key !== key)];
      if (!mine && onScreen) void this.markRead(key);
    },

    /** A message was deleted somewhere; refresh previews quietly. */
    removed() {
      void this.load();
    },

    /** Add a conversation that isn't in the list yet (no messages so far). */
    ensure(conversation: Conversation) {
      if (!this.find(conversation.key)) this.list = [...this.list, conversation];
    },

    reset() {
      this.list = [];
      this.unread = 0;
      this.loaded = false;
      this.dock.conversation = null;
      this.visible = [];
    },
  },
});
