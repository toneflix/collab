import { alova } from 'src/boot/alova'
import type { ResponseBody } from '../models'

export type NotificationCategoryKey = 'collabs' | 'messages' | 'sales' | 'payouts'

/** Something that happened, as shown in the notification list */
export type AppNotification = {
  id: string;
  title: string;
  message: string;
  category: NotificationCategoryKey | null;
  /** App path the notification opens */
  path: string | null;
  action: string | null;
  important: boolean;
  readAt: string | null;
  createdAt: string;
}

/** An invitation or request to join a project, waiting for an answer */
export type CollabRequest = {
  id: string;
  title: string;
  message: string;
  pending: boolean;
  approved: boolean;
  rejected: boolean;
  seen: boolean;
  customData: { action?: 'invitation' | 'request'; type?: string } | null;
  createdAt: string;
}

export type NotificationCategorySetting = {
  key: NotificationCategoryKey;
  title: string;
  description: string;
  mail: boolean;
  push: boolean;
}

export type NotificationSettings = {
  categories: NotificationCategorySetting[];
  push: {
    /** The server has push keys */
    enabled: boolean;
    publicKey: string | null;
    /** Browsers signed up for push on this account */
    devices: number;
  };
}

type NotificationsBody = ResponseBody<AppNotification[]> & {
  stats?: { unread: number; read: number; important: number };
  important?: { data: AppNotification[] };
}

export const loadNotificationsRequest = (params: { page?: number; limit?: number } = {}) => {
  return alova.Get('account/notifications', {
    params: { withStats: 1, limit: 20, ...params },
    transform: (e: NotificationsBody) => ({
      list: [...(e.important?.data ?? []), ...e.data],
      unread: e.stats?.unread ?? 0,
      lastPage: e.meta?.lastPage ?? 1,
    }),
    cacheFor: 0,
  })
}

export const markNotificationReadRequest = (id: string) => {
  return alova.Patch<ResponseBody & { stats: { unread: number } }>(`account/notifications/${id}`, {})
}

export const markAllNotificationsReadRequest = () => {
  return alova.Post<ResponseBody & { stats: { unread: number } }>('account/notifications/read', {})
}

export const deleteNotificationRequest = (id: string) => {
  return alova.Delete<ResponseBody>(`account/notifications/${id}`)
}

export const loadCollabRequestsRequest = (status: 'pending' | '' = 'pending') => {
  return alova.Get('account/notification-requests', {
    params: { status, limit: 30 },
    transform: (e: ResponseBody<CollabRequest[]> & { pending_count: number }) => ({
      list: e.data,
      pending: e.pending_count ?? 0,
    }),
    cacheFor: 0,
  })
}

/** Accept (true) or decline (false) an invitation or request. */
export const answerCollabRequestRequest = (id: string, accept: boolean) => {
  return alova.Put<ResponseBody<CollabRequest> & { pending_count: number }>(
    `account/notification-requests/${id}`,
    { status: accept ? 2 : 0 },
  )
}

export const loadNotificationSettingsRequest = () => {
  return alova.Get('account/notification-settings', {
    transform: (e: ResponseBody<NotificationSettings>) => e.data,
    cacheFor: 0,
  })
}

export const saveNotificationSettingsRequest = (
  categories: Partial<Record<NotificationCategoryKey, { mail?: boolean; push?: boolean }>>,
) => {
  return alova.Put<ResponseBody<NotificationSettings>>('account/notification-settings', { categories })
}

export const savePushSubscriptionRequest = (subscription: PushSubscriptionJSON, contentEncoding: string) => {
  return alova.Post<ResponseBody<NotificationSettings>>('account/push-subscriptions', {
    ...subscription,
    contentEncoding,
  })
}

export const deletePushSubscriptionRequest = (endpoint: string) => {
  return alova.Delete<ResponseBody<NotificationSettings>>('account/push-subscriptions', { endpoint })
}
