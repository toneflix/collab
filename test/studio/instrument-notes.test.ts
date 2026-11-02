import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { TimelineState } from '@toneflix/studio';
import type { Stem } from '../../src/utils/daw';
import { instrumentClips, instrumentTrack, readInstrument, saveInstrument, starterBeat } from '../../src/utils/studio/instrument-notes';

const stem = (id: number, meta: Partial<Stem['meta']> = {}): Stem => ({ id, src: '', size: 0, name: `s${id}`, title: `Beat ${id}`, meta: { name: id, ...meta } });

let n = 0;
const uid = () => `c${++n}`;

test('an old drum pattern opens as notes on the kit, one clip per placement', () => {
  const pattern = { kind: 'drums', bpm: 120, meter: [4, 4], bars: 1, rows: { kick: [0, 8], hat: [4], shaker: [2] } };
  const save = readInstrument(stem(1, { instrument: JSON.stringify(pattern), clips: [{ start: 4, offset: 0 }, { start: 6, offset: 0.5, duration: 1 }] }))!;

  assert.equal(save.instrument.id, 'drums');
  assert.deepEqual(
    save.patterns.p1!.notes.map((x) => [x.pitch, x.start]),
    [[36, 0], [36, 1], [42, 0.5], [44, 0.25]],
  );
  // A clip without a length plays the whole two-second bar.
  assert.deepEqual(save.clips.map((c) => [c.start, c.offset, c.duration]), [[4, 0, 2], [6, 0.5, 1]]);
});

test('an old keys pattern keeps its notes and becomes the synth with its preset', () => {
  const pattern = { kind: 'keys', bpm: 60, meter: [4, 4], bars: 1, preset: 'bass', notes: [{ pitch: 48, step: 4, length: 2 }, { pitch: 200, step: 0, length: 1 }] };
  const save = readInstrument(stem(2, { instrument: JSON.stringify(pattern), start: 1 }))!;

  assert.equal(save.instrument.id, 'synth');
  assert.equal((save.instrument.state as { wave: string }).wave, 'square');
  assert.deepEqual(save.patterns.p1!.notes, [{ pitch: 48, start: 1, duration: 0.475, velocity: 0.8 }]);
  assert.deepEqual(save.clips, [{ pattern: 'p1', start: 1, offset: 0, duration: 4, gain: 1 }]);
});

test('a saved instrument track reads back the same, with shared patterns kept shared', () => {
  const notes = starterBeat(120);
  const track = { id: 'stem-3', name: 'Beat 3', instrument: { id: 'drums', state: { volume: 0.7, samples: { 40: { source: 'sound:9' } } } } };
  const state: TimelineState = {
    tracks: [track],
    clips: [
      { id: 'a', track: 'stem-3', source: 'notes:x', name: 'Verse', start: 2, offset: 0, duration: 2, gain: 1, fadeIn: 0, fadeOut: 0, notes },
      { id: 'b', track: 'stem-3', source: 'notes:x', name: 'Verse', start: 0, offset: 0, duration: 2, gain: 1, fadeIn: 0, fadeOut: 0, notes },
      { id: 'c', track: 'stem-3', source: 'notes:y', name: 'Fill', start: 4, offset: 0, duration: 1, gain: 0.5, fadeIn: 0, fadeOut: 0, notes: [] },
    ],
  };

  const save = saveInstrument(state, track, (source) => (source === 'sound:9' ? 'https://api.example/media/9' : undefined));
  assert.deepEqual(Object.keys(save.patterns), ['p1', 'p2']);
  assert.deepEqual(save.clips.map((c) => c.pattern), ['p1', 'p1', 'p2']);
  assert.deepEqual(save.samples, { 'sound:9': 'https://api.example/media/9' });

  const s = stem(3, { instrument: JSON.stringify(save) });
  const back = readInstrument(s)!;
  assert.deepEqual(back, save);

  const lane = instrumentTrack(s, back, 0);
  const clips = instrumentClips(s, back, lane.id, uid);
  assert.deepEqual(lane.instrument, track.instrument);
  assert.equal(clips[0]!.source, clips[1]!.source);
  assert.notEqual(clips[0]!.source, clips[2]!.source);
  assert.equal(clips[0]!.notes!.length, notes.length);
});

test('audio stems and broken saves are not instruments', () => {
  assert.equal(readInstrument(stem(4)), null);
  assert.equal(readInstrument(stem(5, { instrument: '{nope' })), null);
  assert.equal(readInstrument(stem(6, { instrument: JSON.stringify({ version: 2 }) })), null);
  assert.equal(
    readInstrument(stem(7, { instrument: JSON.stringify({ version: 2, instrument: { id: 'synth' }, patterns: {}, clips: [], samples: { a: 'javascript:alert(1)' } }) }))!.samples,
    undefined,
  );
});
