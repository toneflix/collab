import { onMounted, ref, watch, type Ref } from 'vue';
import { loadTrackCanvasRequest, type TrackCanvas } from 'src/utils/requests/canvas';

/**
 * The ready canvas of a track, loaded once mounted and whenever the track
 * changes. Null while it loads and for tracks without one.
 */
export const useTrackCanvas = (trackId: Ref<number | string | null | undefined>) => {
  const canvas = ref<TrackCanvas | null>(null);
  let ticket = 0;

  const load = async (id?: number | string | null) => {
    const mine = ++ticket;
    canvas.value = null;
    if (!id) return;
    try {
      const found = await loadTrackCanvasRequest(id).send();
      if (mine === ticket) canvas.value = found;
    } catch {
      // Without a canvas the artwork shows
    }
  };

  watch(trackId, (id) => void load(id));
  onMounted(() => void load(trackId.value));

  return canvas;
};
