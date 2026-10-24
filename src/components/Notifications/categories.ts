import type { NotificationCategoryKey } from 'src/utils/requests/notifications'

/** Icon and colour for each kind of notification */
export const categoryLook: Record<NotificationCategoryKey | 'other', { icon: string; color: string }> = {
  collabs: { icon: 'fas fa-user-group', color: 'light-blue-5' },
  messages: { icon: 'fas fa-comment', color: 'teal-5' },
  sales: { icon: 'fas fa-sack-dollar', color: 'amber-6' },
  payouts: { icon: 'fas fa-money-bill-transfer', color: 'green-5' },
  other: { icon: 'fas fa-bell', color: 'grey-5' },
}
