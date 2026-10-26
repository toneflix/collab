<template>
  <div class="lyrics" ref="root">
    <div class="lyrics__state" v-if="loading">
      <BlockSkeleton :count="6" class="w-full" />
    </div>
    <div class="lyrics__state" v-else-if="!lyrics?.lines.length">
      <q-icon name="lucide-type" size="28px" class="mb-2" />
      <div>No lyrics for this song yet.</div>
    </div>
    <template v-else>
      <button
        type="button"
        class="lyrics__line"
        :class="{
          'lyrics__line--active': i === active,
          'lyrics__line--past': lyrics.synced && active > -1 && i < active,
          'lyrics__line--static': !lyrics.synced,
        }"
        :key="i"
        :ref="(el) => (lineEls[i] = el as HTMLElement)"
        :disabled="line.start === null"
        @click="line.start !== null && emit('seek', line.start)"
        v-for="(line, i) in lyrics.lines"
      >
        {{ line.text }}
      </button>
      <div class="lyrics__credit" v-if="lyrics.source === 'transcribed'">
        Lyrics written out automatically, so a few words may be off.
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import {
  activeLine,
  loadTrackLyricsRequest,
  type Lyrics,
} from 'src/utils/requests/lyrics';
import BlockSkeleton from 'src/components/Skeletons/BlockSkeleton.vue';

/**
 * A song's lyrics, following along with the line being sung when they're
 * synced. Clicking a synced line plays from it.
 */
const props = defineProps<{
  trackId?: string | number;
  /** Where playback is, in seconds */
  position: number;
}>();

const emit = defineEmits<{ seek: [seconds: number] }>();

const root = ref<HTMLElement>();
const lineEls = ref<HTMLElement[]>([]);
const lyrics = ref<Lyrics | null>(null);
const loading = ref(false);

const active = computed(() =>
  lyrics.value?.synced ? activeLine(lyrics.value.lines, props.position) : -1,
);

const load = async (id?: string | number) => {
  lyrics.value = null;
  lineEls.value = [];
  if (!id) return;

  loading.value = true;
  try {
    const data = await loadTrackLyricsRequest(id).send();
    if (String(id) === String(props.trackId)) lyrics.value = data;
  } catch {
    lyrics.value = null;
  } finally {
    loading.value = false;
  }
};

watch(() => props.trackId, load, { immediate: true });

// Keep the line being sung in the middle of the panel.
watch(active, async (i) => {
  if (i < 0) return;
  await nextTick();
  lineEls.value[i]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
});
</script>

<style lang="scss" scoped>
.lyrics {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 8px 8px 40%;
}

.lyrics__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 200px;
  color: #9aa0a6;
  text-align: center;
}

.lyrics__line {
  flex: none !important;
  padding: 4px 6px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.35;
  text-align: left;
  border: 0;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition:
    color 0.25s,
    transform 0.25s;

  &:hover:not(:disabled) {
    color: rgba(255, 255, 255, 0.85);
  }

  &:disabled {
    cursor: default;
  }

  &--past {
    color: rgba(255, 255, 255, 0.35);
  }

  &--active {
    color: #fff;
  }

  &--static {
    color: rgba(255, 255, 255, 0.85);
    font-size: 1.1rem;
    font-weight: 500;
  }
}

.lyrics__credit {
  margin-top: 24px;
  padding: 0 6px;
  color: #80868b;
  font-size: 0.75rem;
}
</style>
