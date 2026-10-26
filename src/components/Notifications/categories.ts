import type { NotificationCategoryKey } from 'src/utils/requests/notifications'

/** Icon and colour for each kind of notification */
export const categoryLook: Record<NotificationCategoryKey | 'other', { icon: string; color: string }> = {
  collabs: { icon: 'lucide-users-round', color: 'light-blue-5' },
  messages: { icon: 'lucide-message-square', color: 'teal-5' },
  sales: { icon: 'lucide-circle-dollar-sign', color: 'amber-6' },
  payouts: { icon: 'lucide-banknote', color: 'green-5' },
  other: { icon: 'lucide-bell', color: 'grey-5' },
}
