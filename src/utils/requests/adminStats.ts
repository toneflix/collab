import { alova } from 'src/boot/alova';
import type { ResponseBody } from '../models';

export type DailyValue = { date: string; value: number };

/** Numbers for the admin overview. Sections the admin doesn't manage are left out. */
export type AdminStats = {
  days: number;
  currency: string;
  people: { users: number; new: number; subscribers: number; daily: DailyValue[] };
  content: { releases: number; projects: number; newReleases: number; newProjects: number };
  revenue?: {
    total: number;
    kept: number;
    recent: number;
    byPurpose: { purpose: string; count: number; amount: number }[];
    daily: DailyValue[];
  };
  payouts?: { pending: number; pendingAmount: number; processing: number; paid: number };
  moderation?: { pending: number; appeals: number };
};

export const loadAdminStatsRequest = () =>
  alova.Get('admin/stats', {
    transform: (e: ResponseBody<AdminStats>) => e.data,
    cacheFor: 0,
  });
