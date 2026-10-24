import { defineStore } from 'pinia';
import {
  answerCollabRequestRequest,
  deleteNotificationRequest,
  loadCollabRequestsRequest,
  loadNotificationsRequest,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
  type AppNotification,
  type CollabRequest,
} from 'src/utils/requests/notifications';

/**
 * The user's notifications and the collab invitations and requests waiting
 * for their answer, for the bell in the header and the notifications page.
 */
export const useNotificationStore = defineStore('notifications', {
  state: () => ({
    list: <AppNotification[]>[],
    unread: 0,
    requests: <CollabRequest[]>[],
    pendingRequests: 0,
    page: 1,
    lastPage: 1,
    loaded: false,
    loading: false,
  }),

  getters: {
    /** What the bell's badge counts */
    badge: (state) => state.unread + state.pendingRequests,
  },

  actions: {
    async load() {
      this.loading = true;
      try {
        const [notifications, requests] = await Promise.all([
          loadNotificationsRequest({ page: 1 }).send(),
          loadCollabRequestsRequest('pending').send(),
        ]);
        this.list = notifications.list;
        this.unread = notifications.unread;
        this.page = 1;
        this.lastPage = notifications.lastPage;
        this.requests = requests.list;
        this.pendingRequests = requests.pending;
        this.loaded = true;
      } catch {
        // Signed out, or offline: keep what we have.
      } finally {
        this.loading = false;
      }
    },

    async loadMore() {
      if (this.loading || this.page >= this.lastPage) return;

      this.loading = true;
      try {
        const next = await loadNotificationsRequest({ page: this.page + 1 }).send();
        const ids = new Set(this.list.map((n) => n.id));
        this.list = [...this.list, ...next.list.filter((n) => !ids.has(n.id))];
        this.page++;
        this.lastPage = next.lastPage;
      } finally {
        this.loading = false;
      }
    },

    /** A notification arrived while the app is open. */
    receive(notification: AppNotification) {
      if (this.list.some((n) => n.id === notification.id)) return;

      this.list = [notification, ...this.list];
      this.unread++;

      // Invitations and requests also need an answer.
      if (notification.category === 'collabs') void this.loadRequests();
    },

    async loadRequests() {
      try {
        const { list, pending } = await loadCollabRequestsRequest('pending').send();
        this.requests = list;
        this.pendingRequests = pending;
      } catch {
        // Not critical.
      }
    },

    async markRead(notification: AppNotification) {
      if (notification.readAt) return;

      notification.readAt = new Date().toISOString();
      this.unread = Math.max(0, this.unread - 1);
      try {
        const { stats } = await markNotificationReadRequest(notification.id).send();
        this.unread = stats.unread;
      } catch {
        // Not critical.
      }
    },

    async markAllRead() {
      const now = new Date().toISOString();
      this.list.forEach((n) => (n.readAt ??= now));
      this.unread = 0;
      await markAllNotificationsReadRequest().send();
    },

    async remove(notification: AppNotification) {
      await deleteNotificationRequest(notification.id).send();
      this.list = this.list.filter((n) => n.id !== notification.id);
      if (!notification.readAt) this.unread = Math.max(0, this.unread - 1);
    },

    async answer(request: CollabRequest, accept: boolean) {
      const response = await answerCollabRequestRequest(request.id, accept).send();
      this.requests = this.requests.filter((r) => r.id !== request.id);
      this.pendingRequests = response.pending_count ?? Math.max(0, this.pendingRequests - 1);

      return response;
    },

    reset() {
      this.$reset();
    },
  },
});
