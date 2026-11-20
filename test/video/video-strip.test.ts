import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { MusicVideo, MusicVideoShot, MusicVideoTake } from '../../src/utils/requests/videos';
import { merge, move, needsClip, saveCost, split, takeOffset, toRows, trim, type StripShot } from '../../src/utils/video-strip';

const shot = (id: number, start: number, end: number, kind: MusicVideoShot['kind'], takeId: number | null): StripShot => ({
  id,
  position: id,
  start,
  end,
  kind,
  prompt: `Shot ${id}`,
  keyframeUrl: null,
  rendered: true,
  characters: [],
  takeId,
  clipUrl: null,
  offset: 0,
  motion: null,
});

const take = (id: number, length: number, synced?: [number, number]): MusicVideoTake => ({
  id,
  shotId: id,
  source: 'ai',
  length,
  syncedFrom: synced?.[0] ?? null,
  syncedTo: synced?.[1] ?? null,
  prompt: null,
  clipUrl: `clip-${id}.mp4`,
  createdAt: '',
});

const takes = [take(1, 3), take(2, 3, [3, 6]), take(3, 3)];
const strip = [shot(1, 0, 3, 'broll', 1), shot(2, 3, 6, 'performance', 2), shot(3, 6, 9, 'broll', 3)];

test('trimming moves the edge, keeps shots at least a second and shifts the b-roll in-point', () => {
  const trimmed = trim(strip, 1, 7);

  assert.equal(trimmed[1]!.end, 7);
  assert.equal(trimmed[2]!.start, 7);
  assert.equal(trimmed[2]!.offset, 1);
  assert.equal(trim(strip, 0, 5.5)[0]!.end, 5);
});

test('a singing shot plays its take from where its lines fall and needs a clip outside them', () => {
  const trimmed = trim(strip, 0, 4);

  assert.equal(takeOffset(trimmed[1]!, takes), 1);
  assert.equal(needsClip(trimmed[1]!, takes), false);
  assert.equal(needsClip(move(strip, 1, 0)[0]!, takes), true);
});

test('moving lays the shots end to end and b-roll keeps its take', () => {
  const moved = move(strip, 2, 0);

  assert.deepEqual(moved.map((s) => [s.id, s.start, s.end]), [[3, 0, 3], [1, 3, 6], [2, 6, 9]]);
  assert.equal(needsClip(moved[0]!, takes), false);
});

test('a split piece is sent as a copy, and merging lets the first shot hold its last frame', () => {
  const pieces = split(strip, 0, 1.5);
  const rows = toRows(pieces);

  assert.equal(pieces.length, 4);
  assert.deepEqual(rows[1], { copy_of: 1, start: 1.5, end: 3, take_id: 1, offset: 1.5, motion: null });
  assert.equal(split(strip, 0, 0.5), strip);

  const merged = merge(strip, 0);

  assert.equal(merged[0]!.end, 6);
  assert.equal(needsClip(merged[0]!, takes), true);
});

test('saving is free when nothing needs a clip and priced by seconds otherwise', () => {
  const video = { minutes: 1, takes } as MusicVideo;

  assert.deepEqual(saveCost(video, strip, 190), { shots: 0, seconds: 0, credits: 0 });
  assert.deepEqual(saveCost(video, move(strip, 1, 0), 190), { shots: 1, seconds: 3, credits: 10 });
  assert.deepEqual(saveCost({ minutes: 1, takes: [] } as unknown as MusicVideo, strip, 190), { shots: 3, seconds: 60, credits: 190 });
});
