import { alova } from 'src/boot/alova';
import type { ResponseBody, Transaction } from '../models';

/** A user account as admins see it. */
export type AdminUser = {
  id: number;
  username: string;
  fullname: string;
  firstname: string;
  lastname?: string | null;
  email: string;
  phone?: string | null;
  imageUrl?: string | null;
  roles?: string[];
  verified: boolean;
  emailVerifiedAt?: string | null;
  suspended: boolean;
  suspendedAt?: string | null;
  /** Empty while suspended means banned */
  suspendedUntil?: string | null;
  suspensionReason?: string | null;
  plan?: { id?: number | null; name: string; isDefault: boolean } | null;
  projectsCount: number;
  releasesCount?: number;
  about?: string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  address?: string | null;
  createdAt: string;
};

export type UserAbility = 'view' | 'update' | 'suspend' | 'verify' | 'credits' | 'plan' | 'funds' | 'roles';

export type AdminUserStats = {
  currency: string;
  content: { projects: number; collabs: number; releases: number; tracks: number; followers: number; following: number };
  plan: {
    id?: number | null;
    name: string;
    slug: string;
    isDefault: boolean;
    current?: { id: number; plan: string; planName?: string; amount: number; startsAt: string; endsAt: string } | null;
    paidUntil?: string | null;
  };
  earnings: { earned: number; clearing: number; withdrawn: number; inFlight: number; available: number };
  spend: { total: number; count: number; byPurpose: { purpose: string | null; count: number; amount: number }[] };
  ai: {
    balance: { allowance: number; planUsed: number; planLeft: number; purchased: number; total: number; resetsAt: string };
    used: number;
    usedThisMonth: number;
    jobs: number;
    failedJobs: number;
  };
  storage: { used: number; limit: number };
};

export type AdminUserDetail = {
  user: AdminUser;
  can: Record<UserAbility, boolean>;
  roles: string[];
  stats?: AdminUserStats;
};

export type AdminAction = {
  id: number;
  action: string;
  reason?: string | null;
  details: Record<string, unknown>;
  admin?: { id: number; username: string; fullname: string } | null;
  createdAt: string;
};

export type AdminUsersResponse = ResponseBody<AdminUser[]> & { roles: string[] };

export const loadAdminUsersRequest = (params: Record<string, string | number>) =>
  alova.Get<AdminUsersResponse>('admin/users', { cacheFor: 0, params });

/** An account as the API sends it: the user as `data`, with what the admin may do beside it. */
type UserBody = ResponseBody<AdminUser> & Omit<AdminUserDetail, 'user'>;

type Detail = ResponseBody<AdminUserDetail>;

const toDetail = ({ data, can, roles, stats, ...body }: UserBody): Detail => ({
  ...body,
  data: { user: data, can, roles, ...(stats ? { stats } : {}) },
});

export const loadAdminUserRequest = (id: number | string) =>
  alova.Get(`admin/users/${id}`, { cacheFor: 0, transform: toDetail });

/** The user page's tabbed lists share one response type so one watcher can load either. */
type UserListBody = ResponseBody<AdminAction[] | Transaction[]>;

export const loadUserActivityRequest = (id: number | string, page = 1) =>
  alova.Get<UserListBody>(`admin/users/${id}/activity`, { cacheFor: 0, params: { page } });

export const loadUserTransactionsRequest = (id: number | string, side: 'payments' | 'earnings', page = 1) =>
  alova.Get<UserListBody>(`admin/users/${id}/transactions`, { cacheFor: 0, params: { side, page } });

export const updateAdminUserRequest = (id: number, body: Partial<AdminUser>) =>
  alova.Put(`admin/users/${id}`, body, { transform: toDetail });

export const suspendUserRequest = (id: number, reason: string, days?: number | null) =>
  alova.Post(`admin/users/${id}/suspend`, { reason, days: days || null }, { transform: toDetail });

export const unsuspendUserRequest = (id: number, reason?: string) =>
  alova.Post(`admin/users/${id}/unsuspend`, { reason }, { transform: toDetail });

export const verifyUserRequest = (id: number, verified: boolean, email = false) =>
  alova.Post(`admin/users/${id}/verify`, { verified, email }, { transform: toDetail });

export const saveUserRolesRequest = (id: number, roles: string[]) =>
  alova.Put(`admin/users/${id}/roles`, { roles }, { transform: toDetail });

export const assignUserPlanRequest = (id: number, planId: number, cycles: number, reason?: string) =>
  alova.Post(`admin/users/${id}/plan`, { plan_id: planId, cycles, reason }, { transform: toDetail });

export const endUserPlanRequest = (id: number, reason?: string) =>
  alova.Delete(`admin/users/${id}/plan`, { reason }, { transform: toDetail });

/** A negative amount takes from the balance. */
export const adjustUserFundsRequest = (id: number, amount: number, reason: string) =>
  alova.Post(`admin/users/${id}/funds`, { amount, reason }, { transform: toDetail });

/** A negative number takes credits back. */
export const adjustUserCreditsRequest = (id: number, credits: number, reason: string) =>
  alova.Post(`admin/users/${id}/credits`, { credits, reason }, { transform: toDetail });

/** Who made an audit entry. */
export const actionActor = (entry: AdminAction) => {
  if (entry.admin) return entry.details.via === 'assistant' ? `@${entry.admin.username} via Assistant` : `@${entry.admin.username}`;

  return entry.details.via === 'console' ? 'Console' : 'Removed admin';
};

/** What people call each kind of content. */
const contentLabel = (type: unknown) => ({ song: 'composition', release: 'album' })[String(type)] ?? String(type);

/** One line describing an audit entry. */
export const describeAction = (entry: AdminAction, price: (n: number) => string) => {
  const d = entry.details as Record<string, unknown>;
  const changed = d.changes ? Object.keys(d.changes as object).join(', ') : '';

  const lines: Record<string, string> = {
    'profile.updated': `Changed ${changed}`,
    'account.suspended': `Suspended until ${d.until ? new Date(String(d.until)).toLocaleString() : '?'}`,
    'account.banned': 'Banned the account',
    'account.restored': 'Lifted the suspension',
    'account.verified': 'Gave the verified badge',
    'account.unverified': 'Removed the verified badge',
    'email.verified': 'Confirmed the email address',
    'roles.changed': `Roles: ${((d.to as string[]) || []).join(', ') || 'none'}`,
    'permissions.changed': `Direct permissions: ${((d.to as string[]) || []).join(', ') || 'none'}`,
    'plan.assigned': `Put on ${String(d.plan)} for ${String(d.period)}${d.from ? ` (was ${String(d.from)})` : ''}`,
    'plan.removed': `Removed ${String(d.plan || 'the plan')}`,
    'funds.added': `Added ${price(Number(d.amount))} to the balance`,
    'funds.removed': `Took ${price(Math.abs(Number(d.amount)))} from the balance`,
    'credits.added': `Granted ${Number(d.credits)} AI credits`,
    'credits.removed': `Took back ${Number(d.credits)} AI credits`,
    'content.deleted': `Deleted the ${contentLabel(d.type)} “${String(d.title)}”${d.note ? `: ${String(d.note)}` : ''}`,
    'content.created': `Added the ${contentLabel(d.type)} “${String(d.title)}”`,
    'content.updated': `Edited the ${contentLabel(d.type)} “${String(d.title)}”`,
  };

  return lines[entry.action] || entry.action;
};
