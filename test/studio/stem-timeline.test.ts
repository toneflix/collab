import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Stem } from '../../src/utils/daw';
import {
  applyStemClips,
  fillLengths,
  stemChannel,
  stemSource,
  stemToClips,
  stemToTrack,
  trackToMeta,
} from '../../src/utils/studio/stem-timeline';

const stem = (id: number, meta: Partial<Stem['meta']> = {}): Stem => ({ id, src: `/a/${id}.mp3`, size: 1, name: `s${id}`, title: `Stem ${id}`, meta: { name: id, ...meta } });

test('a stem saved with clips becomes its track and clips', () => {
  const s = stem(1, { color: '#ffb020', clips: [{ start: 2, offset: 1, duration: 3, gain: 0.5, fadeIn: 0.2, fadeOut: 0 }] });
  const track = stemToTrack(s, 0);
  const [clip] = stemToClips(s, track.id, () => undefined);

  assert.deepEqual(track, { id: 'stem-1', name: 'Stem 1', color: '#ffb020' });
  assert.equal(clip!.source, 'stem:1');
  assert.deepEqual([clip!.start, clip!.offset, clip!.duration, clip!.gain, clip!.fadeIn], [2, 1, 3, 0.5, 0.2]);
});

test('a stem saved by the old editor runs to the end of its audio once it loads', () => {
  const s = stem(2, { start: 1, cuein: 0.5 });
  const open = new Set<string>();
  const clips = stemToClips(s, 'stem-2', () => undefined, open);

  assert.equal(open.size, 1);

  const state = fillLengths({ tracks: [stemToTrack(s, 0)], clips }, stemSource(2), 10.5, open);

  assert.equal(state.clips[0]!.duration, 10);
  assert.equal(open.size, 0);
});

test('mixer settings come from the saved meta', () => {
  assert.deepEqual(stemChannel({ gain: 0.4, stereoPan: -0.5, muted: 'true' as never, soloed: false }), { volume: 0.4, pan: -0.5, mute: true, solo: false });
  assert.deepEqual(stemChannel(undefined), { volume: 1, pan: 0, mute: false, solo: false });
});

test('meta keeps clips in time order and names the stem a moved clip plays', () => {
  const s = stem(3);
  const track = stemToTrack(s, 1);
  const clips = [
    { id: 'b', track: track.id, source: 'stem:3', start: 5, offset: 0, duration: 1, gain: 1, fadeIn: 0, fadeOut: 0 },
    { id: 'a', track: track.id, source: 'stem:7', start: 1, offset: 2, duration: 2, gain: 1, fadeIn: 0, fadeOut: 0.5 },
    { id: 'c', track: 'other', source: 'stem:3', start: 0, offset: 0, duration: 9, gain: 1, fadeIn: 0, fadeOut: 0 },
  ];
  const meta = trackToMeta(s, track, clips, { volume: 0.8, pan: 0.25, mute: false, solo: true }, 4);

  assert.deepEqual(meta.clips!.map((c) => [c.start, c.source]), [[1, '7'], [5, undefined]]);
  assert.deepEqual([meta.start, meta.cuein, meta.cueout, meta.gain, meta.stereoPan, meta.soloed, meta.order], [1, 2, 4, 0.8, 0.25, true, 4]);
});

test('a take not uploaded yet is saved as the stem it became', () => {
  const s = stem(4);
  const track = stemToTrack(s, 0);
  const meta = trackToMeta(s, track, [{ id: 'x', track: track.id, source: 'take-1', start: 0, offset: 0, duration: 2, gain: 1, fadeIn: 0, fadeOut: 0 }], { volume: 1, pan: 0, mute: false, solo: false }, 0, new Map([['take-1', 4]]));

  assert.equal(meta.clips![0]!.source, undefined);
});

test('a remote change replaces the clips and keeps ids that line up', () => {
  const s = stem(5, { clips: [{ start: 0, offset: 0, duration: 4 }] });
  const clips = stemToClips(s, 'stem-5', () => 10);
  const state = { tracks: [stemToTrack(s, 0)], clips };
  const same = applyStemClips(state, s, 'stem-5', () => 10);

  assert.equal(same, state);

  s.meta.clips = [{ start: 0, offset: 0, duration: 2 }, { start: 3, offset: 2, duration: 2 }];
  const next = applyStemClips(state, s, 'stem-5', () => 10);

  assert.equal(next.clips.length, 2);
  assert.equal(next.clips[0]!.id, clips[0]!.id);
});
