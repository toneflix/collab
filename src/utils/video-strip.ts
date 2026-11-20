import type { MusicVideo, MusicVideoShot, MusicVideoTake, ShotMotion } from 'src/utils/requests/videos';

/** The shortest a shot can be made */
export const MIN_SHOT = 1;

/** Seconds a b-roll take may fall short of its shot, held on its last frame */
const HOLD = 1;

/** A shot as the editor holds it: an existing shot, or a new one split from another */
export type StripShot = MusicVideoShot & {
  /** The shot a split piece was copied from, until it is saved */
  copyOf?: number;
};

/** A shot as the save request sends it */
export type StripRow = {
  id?: number;
  copy_of?: number;
  start: number;
  end: number;
  take_id: number | null;
  offset: number;
  motion: ShotMotion | null;
};

const round = (n: number) => Math.round(n * 100) / 100;

/** New split pieces get negative ids until the save gives them real ones */
let nextId = -1;

/**
 * Whether a shot needs a new clip before the video can be saved, the same
 * rule the API applies: no take, a singing shot outside the lines its
 * rendered take was synced to, or a b-roll or uploaded take too short for
 * the shot.
 */
export const needsClip = (shot: StripShot, takes: MusicVideoTake[]) => {
  if (shot.motion) return false;

  const take = takes.find((t) => t.id === shot.takeId);
  if (!take) return true;

  if (shot.kind === 'performance' && take.source !== 'upload') {
    return take.syncedFrom === null || take.syncedTo === null || shot.start < take.syncedFrom - 0.01 || shot.end > take.syncedTo + 0.01;
  }

  return take.length - shot.offset + HOLD < shot.end - shot.start;
};

/** Seconds into its take a shot starts; a lip-synced take is cut where the shot's lines fall */
export const takeOffset = (shot: StripShot, takes: MusicVideoTake[]) => {
  const take = takes.find((t) => t.id === shot.takeId);
  return take?.syncedFrom !== null && take?.syncedFrom !== undefined ? Math.max(0, shot.start - take.syncedFrom) : shot.offset;
};

/** Lay the shots end to end from the start of the song, each keeping its length */
const relay = (shots: StripShot[]) => {
  let at = 0;
  return shots.map((shot) => {
    const length = shot.end - shot.start;
    const laid = { ...shot, start: round(at), end: round(at + length) };
    at += length;
    return laid;
  });
};

/** Move the edge between shot `i` and the next one to `time` */
export const trim = (shots: StripShot[], i: number, time: number): StripShot[] => {
  const left = shots[i];
  const right = shots[i + 1];
  if (!left || !right) return shots;

  const edge = round(Math.min(Math.max(time, left.start + MIN_SHOT), right.end - MIN_SHOT));
  const moved = edge - right.start;
  const next = [...shots];

  next[i] = { ...left, end: edge };
  // B-roll keeps showing the same moment where the edge used to be
  next[i + 1] = { ...right, start: edge, offset: round(Math.max(0, right.offset + moved)) };

  return next;
};

/** Split shot `i` at `time` into two shots that play the same take */
export const split = (shots: StripShot[], i: number, time: number): StripShot[] => {
  const shot = shots[i];
  if (!shot || time - shot.start < MIN_SHOT || shot.end - time < MIN_SHOT) return shots;

  const at = round(time);
  const piece: StripShot = {
    ...shot,
    id: nextId--,
    copyOf: shot.copyOf ?? shot.id,
    start: at,
    offset: round(shot.offset + (at - shot.start)),
  };

  return [...shots.slice(0, i), { ...shot, end: at }, piece, ...shots.slice(i + 1)];
};

/** Merge shot `i` with the next one; it plays its own take over both */
export const merge = (shots: StripShot[], i: number): StripShot[] => {
  const shot = shots[i];
  const next = shots[i + 1];
  if (!shot || !next) return shots;

  return [...shots.slice(0, i), { ...shot, end: next.end }, ...shots.slice(i + 2)];
};

/** Move shot `from` to place `to`; the shots after it shift */
export const move = (shots: StripShot[], from: number, to: number): StripShot[] => {
  if (from === to) return shots;

  const next = [...shots];
  next.splice(to, 0, ...next.splice(from, 1));

  return relay(next);
};

/** Play a take in shot `i`, from its start */
export const useTake = (shots: StripShot[], i: number, take: MusicVideoTake): StripShot[] =>
  shots.map((shot, n) => (n === i ? { ...shot, takeId: take.id, offset: 0, motion: null } : shot));

/**
 * The furthest into its take a shot can start and still not need a new
 * clip; null when its take is lip-synced or it shows its still.
 */
export const maxOffset = (shot: StripShot, takes: MusicVideoTake[]) => {
  if (shot.motion) return null;
  const take = takes.find((t) => t.id === shot.takeId);
  if (!take || take.syncedFrom !== null) return null;
  return round(Math.max(0, take.length + HOLD - (shot.end - shot.start)));
};

/** Start shot `i`'s take `offset` seconds in */
export const setOffset = (shots: StripShot[], i: number, offset: number): StripShot[] =>
  shots.map((shot, n) => (n === i ? { ...shot, offset: round(Math.max(0, offset)) } : shot));

/** Show shot `i`'s still with a motion, or go back to its take with null */
export const setMotion = (shots: StripShot[], i: number, motion: ShotMotion | null): StripShot[] =>
  shots.map((shot, n) => (n === i ? { ...shot, motion } : shot));

/** The strip as the save request takes it */
export const toRows = (shots: StripShot[]): StripRow[] =>
  shots.map((shot) => ({
    ...(shot.id > 0 ? { id: shot.id } : { copy_of: shot.copyOf }),
    start: shot.start,
    end: shot.end,
    take_id: shot.takeId,
    offset: shot.offset,
    motion: shot.motion,
  }));

/**
 * What saving would cost: free when it only stitches, else the credits or
 * plan seconds for the shots that need a new clip. A first render is priced
 * by started minutes of the song.
 */
export const saveCost = (video: MusicVideo, shots: StripShot[], creditsPerMinute: number) => {
  const takes = video.takes ?? [];
  const todo = shots.filter((shot) => needsClip(shot, takes));
  const full = shots.length > 0 && todo.length === shots.length;
  const seconds = full ? video.minutes * 60 : Math.ceil(todo.reduce((sum, shot) => sum + shot.end - shot.start, 0));
  const credits = full ? creditsPerMinute * video.minutes : seconds > 0 ? Math.max(1, Math.ceil((creditsPerMinute * seconds) / 60)) : 0;

  return { shots: todo.length, seconds, credits };
};
