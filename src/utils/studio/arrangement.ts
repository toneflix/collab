import type { Marker, TempoChange, TimelineState } from '@toneflix/studio';
import { STEM_COLORS } from './stem-timeline';

/** A track's markers and tempo changes, saved with the track as JSON text. */
export interface Arrangement {
  markers: Marker[];
  tempo: TempoChange[];
}

const round = (n: number) => Math.round(n * 1000) / 1000;
const num = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};
const METERS = [2, 3, 4, 5, 6, 7, 9, 12];

/** A track's saved arrangement, keeping only what makes sense. */
export const readArrangement = (value: unknown): Arrangement => {
  let raw: unknown = value;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = null;
    }
  }
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const list = (key: string) => (Array.isArray(data[key]) ? (data[key] as Record<string, unknown>[]) : []).slice(0, 500);

  const markers: Marker[] = list('markers')
    .filter((m) => typeof m?.id === 'string' && typeof m.name === 'string')
    .map((m) => ({
      id: m.id as string,
      time: Math.max(0, num(m.time)),
      name: (m.name as string).slice(0, 60),
      ...(typeof m.color === 'string' && STEM_COLORS.includes(m.color) ? { color: m.color } : {}),
    }))
    .sort((a, b) => a.time - b.time);

  const tempo: TempoChange[] = list('tempo')
    .filter((c) => typeof c?.id === 'string' && num(c.time) > 0)
    .map((c) => {
      const meter = Array.isArray(c.meter) ? c.meter.map((n) => Math.round(num(n))) : null;
      const valid = meter && METERS.includes(meter[0]!) && [2, 4, 8, 16].includes(meter[1]!);

      return {
        id: c.id as string,
        time: num(c.time),
        bpm: Math.min(300, Math.max(20, num(c.bpm, 120))),
        ...(valid ? { meter: [meter[0]!, meter[1]!] as [number, number] } : {}),
      };
    })
    .sort((a, b) => a.time - b.time);

  return { markers, tempo };
};

/** The arrangement in a timeline state, as saved: empty text when it has none. */
export const arrangementJson = (state: Pick<TimelineState, 'markers' | 'tempo'>) => {
  const markers = (state.markers ?? []).map((m) => ({ id: m.id, time: round(m.time), name: m.name, ...(m.color ? { color: m.color } : {}) }));
  const tempo = (state.tempo ?? []).map((c) => ({ id: c.id, time: round(c.time), bpm: round(c.bpm), ...(c.meter ? { meter: c.meter } : {}) }));

  return markers.length || tempo.length ? JSON.stringify({ markers, tempo }) : '';
};

/** A state with a saved arrangement in place of its own. */
export const withArrangement = (state: TimelineState, value: unknown): TimelineState => {
  const { markers, tempo } = readArrangement(value);
  const next: TimelineState = { ...state, markers, tempo };

  if (!markers.length) delete next.markers;
  if (!tempo.length) delete next.tempo;

  return next;
};
