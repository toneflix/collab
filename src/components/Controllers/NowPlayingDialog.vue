<template>
  <q-dialog
    v-model="open"
    seamless
    position="bottom"
    full-width
    transition-show="slide-up"
    transition-hide="slide-down"
    class="now-playing"
  >
    <q-card dark class="now-playing__card bg-glass" :style="{ marginBottom: `${offset}px`, height: `calc(100vh - ${offset + 64}px)` }">
      <div class="now-playing__body">
        <!-- Big artwork and what's playing -->
        <div class="now-playing__art">
          <q-img
            no-spinner
            class="rounded-lg shadow-2xl bg-gray-800"
            :ratio="1"
            :src="track.imageUrl"
          />
          <div class="mt-8 text-center">
            <div class="text-2xl font-bold truncate">{{ track.title || 'Nothing playing' }}</div>
            <div class="truncate text-grey-5">
              <RouterLink :to="artistLink" class="hover:underline" @click="open = false" v-if="track.artist">
                {{ track.artist.name }}
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- Up next and lyrics -->
        <div class="now-playing__queue">
          <div class="flex items-center justify-between pb-2 no-wrap">
            <q-tabs
              dense
              no-caps
              inline-label
              align="left"
              active-color="white"
              indicator-color="toneflix"
              class="text-grey-5 flex-none!"
              v-model="tab"
            >
              <q-tab name="next" label="Up next" class="now-playing__tab" />
              <q-tab name="lyrics" label="Lyrics" class="now-playing__tab" />
            </q-tabs>
            <IconBtn icon="lucide-chevron-down" aria-label="Close" class="flex-none!" @click="open = false" />
          </div>
          <q-scroll-area class="now-playing__list" v-if="tab === 'lyrics'">
            <SyncedLyrics :track-id="track.id" :position="player.position" @seek="player.seek" />
          </q-scroll-area>
          <q-scroll-area class="now-playing__list" v-else>
            <QueueList ref="queueList" @navigate="open = false" />
          </q-scroll-area>
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Track } from 'src/utils/models';
import { usePlayerStore } from 'src/stores/player-store';
import QueueList from './QueueList.vue';
import SyncedLyrics from './SyncedLyrics.vue';

/**
 * The expanded player: large artwork beside the queue or the lyrics, like
 * YouTube Music's "Up next" and "Lyrics" tabs. Picking a track plays it.
 */
const open = defineModel<boolean>({ default: false });
/** Which list shows beside the artwork */
const tab = defineModel<'next' | 'lyrics'>('tab', { default: 'next' });

defineProps({
  /** Height of the player bar, so the panel opens above it and the bar stays usable */
  offset: { type: Number, default: 0 },
});

const player = usePlayerStore();
const track = computed<Track>(() => player.current || ({} as Track));
const artistLink = computed(() => ({
  name: 'artist',
  params: { artist_id: track.value.artist?.username || '-' },
}));
const queueList = ref<InstanceType<typeof QueueList> | null>(null);

// Bring the playing track into view when the panel opens.
watch([open, tab], ([on, current]) => {
  if (on && current === 'next') void queueList.value?.scrollToCurrent();
});
</script>

<style lang="scss" scoped>
.now-playing__card {
  max-height: 760px;
  background: rgba(24, 24, 24, 0.55) !important;
  border-radius: 16px 16px 0 0 !important;
}

.now-playing__body {
  display: grid;
  height: 100%;
  gap: 32px;
  padding: 24px;

  @media (min-width: 1024px) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 420px);
    padding: 40px 48px;
  }
}

.now-playing__art {
  align-self: center;
  justify-self: center;
  width: min(100%, 440px);

  @media (max-width: 1023px) {
    display: none;
  }
}

.now-playing__queue {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.now-playing__tab {
  padding: 0 12px;
  font-size: 1rem;
  font-weight: 700;
}

.now-playing__list {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
