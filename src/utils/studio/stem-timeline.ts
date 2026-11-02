import type { ChannelSettings, Clip, TimelineState, Track } from '@toneflix/studio';
import { stemClips, stemTitle, type Stem, type StemClip, type StemMeta } from '../daw';

/** The editor's stem colours, in the order new stems get them. */
export const STEM_COLORS = ['#03bfff', '#ffb020', '#ff5c8a', '#8f7bff', '#2ed47a', '#ff7a45', '#00d1c1', '#c9cdd4'];

/** A stem's saved colour when it's one of ours, otherwise the colour for its place. */
export const stemColor = (color: unknown, index: number) =>
  typeof color === 'string' && STEM_COLORS.includes(color) ? color : STEM_COLORS[index % STEM_COLORS.length]!;

/** The timeline track id of a stem. */
export const stemTrackId = (stemId: string | number) => `stem-${stemId}`;

/** The timeline source id of a stem's audio. */
export const stemSource = (stemId: string | number) => `stem:${stemId}`;

/** How long a clip is drawn while its audio's length is unknown */
export const UNKNOWN_LENGTH = 30;

const round = (n: number) => Math.round(n * 1000) / 1000;

const num = (value: unknown, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const bool = (value: unknown) => value === true || value === 'true' || value === 1 || value === '1';

let clipCount = 0;

const clipId = () => `sc${Date.now().toString(36)}${(clipCount++).toString(36)}`;

/** A stem's track on the timeline. */
export const stemToTrack = (stem: Stem, index: number): Track => ({
  id: stemTrackId(stem.id),
  name: stemTitle(stem),
  color: stemColor(stem.meta?.color, index),
});

/** A stem's mixer settings. Volume runs from 0 to 1, as the API keeps it. */
export const stemChannel = (meta: Partial<StemMeta> | undefined): ChannelSettings => ({
  volume: meta?.gain !== undefined ? Math.min(1, Math.max(0, num(meta.gain, 1))) : 1,
  pan: Math.min(1, Math.max(-1, num(meta?.stereoPan))),
  mute: bool(meta?.muted),
  solo: bool(meta?.soloed),
});

/**
 * A stem's clips on its track. A clip's audio comes from its own stem, or from
 * the stem it was moved off (`source`), whose name `nameOf` gives. Clips without
 * a saved length run to the end of their audio, taken from `length`; they are
 * listed in `openEnded`.
 */
export const stemToClips = (
  stem: Stem,
  trackId: string,
  length: (source: string) => number | undefined,
  openEnded?: Set<string>,
  nameOf?: (stemId: string | number) => string | undefined,
): Clip[] =>
  stemClips(stem.meta || ({} as StemMeta)).map((c) => {
    const source = stemSource(c.source ?? stem.id);
    const known = length(source);
    const id = clipId();
    let duration = c.duration;

    if (duration === undefined) {
      duration = known !== undefined ? Math.max(0.01, known - c.offset) : UNKNOWN_LENGTH;
      if (known === undefined) openEnded?.add(id);
    }

    return {
      id,
      track: trackId,
      source,
      name: (c.source !== undefined ? nameOf?.(c.source) : undefined) ?? stemTitle(stem),
      start: c.start,
      offset: c.offset,
      duration,
      gain: c.gain ?? 1,
      fadeIn: c.fadeIn ?? 0,
      fadeOut: c.fadeOut ?? 0,
    };
  });

/** Give open-ended clips of a source their length now that its audio is in. */
export const fillLengths = (state: TimelineState, source: string, length: number, openEnded: Set<string>): TimelineState => {
  let changed = false;
  const clips = state.clips.map((clip) => {
    if (clip.source !== source || !openEnded.delete(clip.id)) return clip;

    changed = true;

    return { ...clip, duration: Math.max(0.01, length - clip.offset) };
  });

  return changed ? { ...state, clips } : state;
};

/** The stem id a source plays, or null for audio that isn't a stem yet. */
export const sourceStem = (source: string, aliases?: Map<string, string | number>) => {
  if (aliases?.has(source)) return String(aliases.get(source));

  return source.startsWith('stem:') ? source.slice(5) : null;
};

/**
 * The `meta` the API keeps for a stem, from its track, clips and mixer channel.
 * The flat fields mirror the first clip, so older clients can still read it.
 * A clip playing another stem's audio keeps that stem's id as `source`.
 */
export const trackToMeta = (
  stem: Stem,
  track: Track,
  clips: readonly Clip[],
  channel: ChannelSettings,
  order: number,
  aliases?: Map<string, string | number>,
): StemMeta => {
  const own = String(stem.id);
  const list: StemClip[] = clips
    .filter((c) => c.track === track.id && !c.notes)
    .sort((a, b) => a.start - b.start)
    .map((c) => {
      const from = sourceStem(c.source, aliases);

      return {
        start: round(c.start),
        offset: round(c.offset),
        duration: round(c.duration),
        gain: round(c.gain),
        fadeIn: round(c.fadeIn),
        fadeOut: round(c.fadeOut),
        fadeType: 'linear' as const,
        ...(from && from !== own ? { source: from } : {}),
      };
    });
  const first = list[0];

  return {
    name: stem.meta?.name ?? stem.id,
    title: track.name || stemTitle(stem),
    type: 'stem',
    gain: round(channel.volume),
    stereoPan: round(channel.pan),
    muted: channel.mute,
    soloed: channel.solo,
    start: first?.start ?? 0,
    cuein: first?.offset ?? 0,
    cueout: first ? round(first.offset + (first.duration ?? 0)) : 0,
    duration: first?.duration ?? 0,
    fadeIn: { shape: 'linear', duration: first?.fadeIn ?? 0 },
    fadeOut: { shape: 'linear', duration: first?.fadeOut ?? 0 },
    clips: list,
    order,
    ...(track.color ? { color: track.color } : {}),
  };
};

/**
 * Put a change someone else made to a stem into the timeline: its clips are
 * replaced by the incoming ones, keeping clip ids where they line up.
 */
export const applyStemClips = (
  state: TimelineState,
  stem: Stem,
  trackId: string,
  length: (source: string) => number | undefined,
  openEnded?: Set<string>,
  nameOf?: (stemId: string | number) => string | undefined,
): TimelineState => {
  const current = state.clips.filter((c) => c.track === trackId).sort((a, b) => a.start - b.start);
  const incoming = stemToClips(stem, trackId, length, openEnded, nameOf).map((clip, i) => {
    const id = current[i]?.id;
    if (id && openEnded?.delete(clip.id)) openEnded.add(id);

    return id ? { ...clip, id } : clip;
  });
  const layout = (list: readonly Clip[]) =>
    JSON.stringify(list.map((c) => [c.source, round(c.start), round(c.offset), round(c.duration), round(c.gain), round(c.fadeIn), round(c.fadeOut)]));

  if (layout(current) === layout(incoming)) return state;

  return { ...state, clips: [...state.clips.filter((c) => c.track !== trackId), ...incoming] };
};
