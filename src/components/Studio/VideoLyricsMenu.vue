<template>
  <q-btn-dropdown
    flat
    rounded
    no-caps
    icon="lucide-captions"
    :label="label"
    class="flex-none!"
    :loading="saving"
    :disable="disable"
  >
    <q-list dark dense style="min-width: 160px">
      <q-item
        clickable
        v-close-popup
        :active="option.value === current"
        active-class="text-toneflix"
        :key="option.value"
        @click="choose(option.value)"
        v-for="option in options"
      >
        <q-item-section>{{ option.label }}</q-item-section>
      </q-item>
    </q-list>
  </q-btn-dropdown>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { notifyError } from 'src/utils/composer';
import { notify } from 'src/utils/helpers';
import {
  LYRIC_STYLES,
  setMusicVideoLyricsRequest,
  type LyricStyle,
  type MusicVideo,
} from 'src/utils/requests/videos';

const props = defineProps<{
  video: MusicVideo;
  disable?: boolean;
}>();

const emit = defineEmits<{ saved: [video: MusicVideo] }>();

const saving = ref(false);

const current = computed(() => props.video.lyrics ?? 'off');

/** A lyric video always shows its lyrics; any other video may */
const options = computed(() => [
  ...(props.video.mode === 'lyrics'
    ? []
    : [{ label: 'No lyrics', value: 'off' as const }]),
  ...LYRIC_STYLES.map((style) => ({
    label: `Lyrics: ${style.label.toLowerCase()}`,
    value: style.value,
  })),
]);

const label = computed(
  () =>
    options.value.find((option) => option.value === current.value)?.label ??
    'Lyrics',
);

const choose = async (value: LyricStyle | 'off') => {
  if (value === current.value) return;
  saving.value = true;
  try {
    const res = await setMusicVideoLyricsRequest(
      props.video.id,
      value === 'off' ? null : value,
    ).send();
    emit('saved', res.data);
    notify(res.message, 'success');
  } catch (e) {
    notifyError(e, "The lyrics couldn't be changed.");
  } finally {
    saving.value = false;
  }
};
</script>
