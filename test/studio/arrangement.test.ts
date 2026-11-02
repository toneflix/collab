import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Stem } from '../../src/utils/daw';
import { arrangementJson, readArrangement, withArrangement } from '../../src/utils/studio/arrangement';
import { automationJson, stemAutomation, stemToTrack, trackToMeta } from '../../src/utils/studio/stem-timeline';

test('markers and tempo changes read back as saved, sorted, and junk is dropped', () => {
  const saved = arrangementJson({
    markers: [
      { id: 'b', time: 16, name: 'Chorus' },
      { id: 'a', time: 4.00004, name: 'Verse' },
    ],
    tempo: [{ id: 't', time: 8, bpm: 140, meter: [3, 4] }],
  });
  const read = readArrangement(saved);

  assert.deepEqual(
    read.markers.map((m) => [m.name, m.time]),
    [['Verse', 4], ['Chorus', 16]],
  );
  assert.deepEqual(read.tempo, [{ id: 't', time: 8, bpm: 140, meter: [3, 4] }]);

  const junk = readArrangement(JSON.stringify({ markers: [{ id: 1, name: 'x' }, { id: 'm', name: 'Ok', time: -2 }], tempo: [{ id: 't', time: 0, bpm: 90 }, { id: 'u', time: 4, bpm: 900, meter: [4, 5] }] }));

  assert.deepEqual(junk.markers, [{ id: 'm', time: 0, name: 'Ok' }]);
  assert.deepEqual(junk.tempo, [{ id: 'u', time: 4, bpm: 300 }]);
  assert.deepEqual(readArrangement('not json'), { markers: [], tempo: [] });
});

test('a state without markers or tempo changes saves as empty text and loads back bare', () => {
  assert.equal(arrangementJson({}), '');
  assert.deepEqual(withArrangement({ tracks: [], clips: [], markers: [{ id: 'm', time: 1, name: 'x' }] }, ''), { tracks: [], clips: [] });
});

test("a stem's automation is saved with it and read back, kept in range", () => {
  const stem: Stem = { id: 3, src: 'x.mp3', size: 0, name: 's3', meta: { name: 3 } };
  const track = { ...stemToTrack(stem, 0), automation: { volume: [{ time: 2, value: 0.5 }, { time: 0, value: 1 }], pan: [] } };
  const meta = trackToMeta(stem, track, [], { volume: 1, pan: 0, mute: false, solo: false }, 0);

  assert.equal(meta.automation, JSON.stringify({ volume: [{ time: 2, value: 0.5 }, { time: 0, value: 1 }] }));
  assert.deepEqual(stemToTrack({ ...stem, meta }, 0).automation, { volume: [{ time: 0, value: 1 }, { time: 2, value: 0.5 }] });
  assert.equal(automationJson({}), undefined);
  assert.deepEqual(stemAutomation({ name: 1, automation: JSON.stringify({ pan: [{ time: 1, value: 4 }], volume: 'x' }) }), { pan: [{ time: 1, value: 1 }] });
  assert.equal(stemToTrack(stem, 0).automation, undefined);
});
