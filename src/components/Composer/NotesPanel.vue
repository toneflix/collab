<template>
  <ComposerSheet title="Notes" caption="Only you can see these. They save with the composition." :dock="dock" v-model="open">
    <div class="mb-8">
      <div class="label">Tempo and key</div>
      <div class="flex gap-2 no-wrap">
        <q-input
          dark
          filled
          dense
          type="number"
          label="BPM"
          class="!flex-none w-24"
          :model-value="song.bpm ?? undefined"
          @update:model-value="change({ bpm: $event ? Number($event) : null })"
        />
        <q-select
          dark
          filled
          dense
          clearable
          emit-value
          map-options
          label="Key"
          class="min-w-0"
          option-label="label"
          option-value="value"
          :options="MUSICAL_KEYS"
          :model-value="song.key"
          @update:model-value="change({ key: $event ?? null })"
        />
      </div>
    </div>

    <div class="mb-8">
      <div class="label">Beat</div>
      <div class="flex items-center gap-2 no-wrap" v-if="song.beat">
        <q-icon name="lucide-music" size="20px" class="!flex-none text-toneflix" />
        <div class="min-w-0">
          <div class="text-sm truncate">{{ song.beat.name }}</div>
          <div class="text-xs text-grey-5">Play it on a loop from the toolbar</div>
        </div>
        <IconBtn icon="lucide-x" class="!flex-none ml-auto" aria-label="Remove the beat" @click="setBeat(null)" />
      </div>
      <q-select
        dark
        filled
        dense
        use-input
        emit-value
        map-options
        input-debounce="300"
        option-label="name"
        option-value="id"
        label="Pick a beat from your sounds or the library"
        :model-value="null"
        :options="beats"
        :loading="searching"
        @filter="searchBeats"
        @update:model-value="setBeat"
        v-else
      />
    </div>

    <div class="mb-8">
      <div class="label">Scratchpad</div>
      <q-input
        dark
        filled
        autogrow
        type="textarea"
        placeholder="Rough ideas, punchlines, words to use"
        input-class="min-h-24"
        :model-value="song.scratchpad"
        @update:model-value="change({ scratchpad: String($event ?? '') })"
      />
    </div>

    <div>
      <div class="label">Notes</div>
      <q-input
        dark
        filled
        autogrow
        type="textarea"
        placeholder="Who it's for, the story, reference tracks"
        input-class="min-h-24"
        :model-value="song.notes"
        @update:model-value="change({ notes: String($event ?? '') })"
      />
    </div>
  </ComposerSheet>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ComposerSheet from 'src/components/Composer/ComposerSheet.vue';
import type { Song, SongInput } from 'src/utils/requests/composer';
import { loadLibrarySoundsRequest, loadMySoundsRequest, type Sound } from 'src/utils/requests/sounds';
import { MUSICAL_KEYS } from 'src/utils/requests/tags';

defineProps<{ song: Song; dock?: string }>();

const emit = defineEmits<{
  /** Fields to save, with what the page should show meanwhile */
  change: [input: SongInput, patch: Partial<Song>];
}>();

const open = defineModel<boolean>({ default: false });

const beats = ref<Sound[]>([]);
const searching = ref(false);

const change = (patch: Partial<Song>) => {
  const input: SongInput = {};
  if ('bpm' in patch) input.bpm = patch.bpm ?? null;
  if ('key' in patch) input.key = patch.key ?? null;
  if ('scratchpad' in patch) input.scratchpad = patch.scratchpad ?? '';
  if ('notes' in patch) input.notes = patch.notes ?? '';
  emit('change', input, patch);
};

const setBeat = (id: number | null) => {
  const beat = beats.value.find((b) => b.id === id) ?? null;
  emit('change', { beat_sound_id: id }, { beat });
};

const searchBeats = (term: string, update: (fn: () => void) => void) => {
  searching.value = true;
  const params = { search: term || undefined, limit: 15 };
  void Promise.all([loadMySoundsRequest(params).send(), loadLibrarySoundsRequest(params).send().catch(() => ({ data: [] as Sound[] }))])
    .then(([mine, library]) => update(() => (beats.value = [...mine.data, ...library.data])))
    .catch(() => update(() => (beats.value = [])))
    .finally(() => (searching.value = false));
};

</script>

<style lang="scss" scoped>
.label {
  margin-bottom: 8px;
  color: #8b919c;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
</style>
