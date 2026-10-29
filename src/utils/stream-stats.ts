import { date } from 'quasar';
import type { StreamStatsMonth } from './requests/payments';

export const count = (n: number, noun: string) => `${n.toLocaleString()} ${noun}${n === 1 ? '' : 's'}`;

const origins: Record<string, string> = {
  collaboration: 'Collaboration',
  recorded: 'Recorded',
  agentic: 'Agentic',
};

/** A track's rank as creators see it. Unranked tracks are paid as agentic. */
export const originLabel = (origin?: string | null) => (origin ? origins[origin] : 'Not ranked yet');

export const monthName = (month: string) => date.formatDate(`${month}-01`, 'MMMM YYYY');

/** The months to pick from, newest first. */
export const monthOptions = (months: StreamStatsMonth[]) =>
  [...months].reverse().map((m) => ({ value: m.month, label: monthName(m.month) }));

export type StatsMeasure = 'earned' | 'paid' | 'plays';

export const measures: { value: StatsMeasure; label: string }[] = [
  { value: 'earned', label: 'Earned' },
  { value: 'paid', label: 'Paid streams' },
  { value: 'plays', label: 'Plays' },
];
