<template>
  <div class="render-mix">{{ message }}</div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { FaustEffect } from 'src/utils/requests/effects';
import { loadFaustEffectsRequest } from 'src/utils/requests/effects';
import { apiUrl } from 'src/utils/env';
import { mixTrack, type RenderTrack } from 'src/utils/studio/render-track';

/**
 * Mixes a saved track with the studio's engine and uploads it, for mixes
 * nobody has the studio open for. The API opens it in headless Chrome with
 * two signed links, `data` and `upload`, and waits for `window.tfMix`.
 */
type MixResult = { status: 'rendering' | 'done' | 'empty' | 'failed'; error?: string };

const message = ref('Mixing…');

const report = (result: MixResult) => {
  (window as unknown as { tfMix: MixResult }).tfMix = result;
  message.value = result.error ?? result.status;
};

/** Only the API's own signed links, so the page can't be pointed elsewhere. */
const signedLink = (value: unknown) => {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    const api = new URL(apiUrl, window.location.href);
    return url.origin === api.origin && url.searchParams.has('signature') ? url.href : null;
  } catch {
    return null;
  }
};

onMounted(async () => {
  report({ status: 'rendering' });
  const params = new URLSearchParams(window.location.search);
  const data = signedLink(params.get('data'));
  const upload = signedLink(params.get('upload'));

  try {
    if (!data || !upload) throw new Error('The render links are missing or not the API\'s.');

    const res = await fetch(data, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`The track couldn't be read (${res.status}).`);
    const body = (await res.json()) as { data: RenderTrack; plugins?: boolean };

    let faust: FaustEffect[] = [];
    try {
      faust = (await loadFaustEffectsRequest().send()).data ?? [];
    } catch {
      // Saved Faust effects then pass sound through, as in the studio.
    }

    const audio = await mixTrack(body.data, { plugins: !!body.plugins, faust });
    if (!audio) return report({ status: 'empty' });

    const form = new FormData();
    form.append('audio', audio, 'mix.flac');
    const sent = await fetch(upload, { method: 'POST', body: form, headers: { Accept: 'application/json' } });
    if (!sent.ok) throw new Error(`The mix couldn't be uploaded (${sent.status}).`);

    report({ status: 'done' });
  } catch (e) {
    console.error('[render mix]', e);
    report({ status: 'failed', error: (e as Error)?.message || String(e) });
  }
});
</script>

<style scoped>
.render-mix {
  padding: 16px;
  font-family: monospace;
}
</style>
