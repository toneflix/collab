<template>
  <q-page class="p-3 md:p-6">
    <div class="max-w-4xl mx-auto">
      <h1 class="mb-1 text-2xl font-bold">
        <template v-if="q">Results for “{{ q }}”</template>
        <template v-else-if="filtering">Songs by tempo and key</template>
        <template v-else>Search</template>
      </h1>
      <p class="mb-6 text-sm text-grey-5">
        Find songs by their title or a line of their lyrics, and creators by
        name. Narrow songs down by tempo and key.
      </p>

      <div class="filters">
        <q-input
          dark
          dense
          outlined
          clearable
          type="number"
          label="BPM from"
          class="filters__bpm"
          :debounce="500"
          :model-value="filters.bpm_min"
          @update:model-value="setFilter('bpm_min', $event)"
        />
        <q-input
          dark
          dense
          outlined
          clearable
          type="number"
          label="BPM to"
          class="filters__bpm"
          :debounce="500"
          :model-value="filters.bpm_max"
          @update:model-value="setFilter('bpm_max', $event)"
        />
        <q-select
          dark
          dense
          outlined
          clearable
          emit-value
          map-options
          label="Key"
          class="filters__key"
          option-label="label"
          option-value="camelot"
          :options="MUSICAL_KEYS"
          :model-value="filters.key"
          @update:model-value="setFilter('key', $event)"
        />
        <q-toggle
          dark
          dense
          color="primary"
          label="Keys that mix with it"
          class="!flex-none"
          :disable="!filters.key"
          :model-value="filters.compatible"
          @update:model-value="setFilter('compatible', $event ? '1' : null)"
        />
      </div>

      <div class="text-grey-5" v-if="!q && !filtering">
        Type in the search box above and press Enter, or pick a tempo or key.
      </div>

      <template v-else>
        <section class="mb-8" v-if="q && artists.length">
          <h2 class="mb-3 text-lg font-bold">Creators</h2>
          <div class="flex flex-wrap gap-3">
            <router-link
              class="artist !flex-none"
              :key="artist.id"
              :to="{ name: 'artist', params: { artist_id: artist.username } }"
              v-for="artist in artists"
            >
              <q-avatar size="40px">
                <q-img no-spinner :src="artist.imageUrl" :ratio="1" />
              </q-avatar>
              <span class="font-bold truncate">{{ artist.name }}</span>
            </router-link>
          </div>
        </section>

        <section>
          <h2 class="mb-3 text-lg font-bold">Songs</h2>
          <div class="text-grey-5" v-if="!loading && !tracks.length">
            No songs match{{ q ? ` “${q}”` : '' }}{{ filtering ? ' these filters' : '' }}.
          </div>
          <q-list dark class="rounded-xl songs" v-else>
            <q-item
              clickable
              class="song"
              :key="track.id"
              :to="trackLink(track)"
              v-for="track in tracks"
            >
              <q-item-section avatar>
                <q-img
                  no-spinner
                  class="rounded bg-gray-700"
                  width="48px"
                  height="48px"
                  :src="track.imageUrl"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label lines="1" class="font-bold">{{ track.title }}</q-item-label>
                <q-item-label caption lines="1" class="flex items-center gap-1 no-wrap">
                  <span class="explicit !flex-none" title="Explicit" v-if="track.explicit">E</span>
                  <span class="truncate">{{ track.artist?.name || 'Unknown' }}</span>
                </q-item-label>
                <AudioTagChips class="mt-1 sm:!hidden" :tags="track.tags" />
                <q-item-label lines="2" class="song__lyric" v-if="track.lyricMatch">
                  <q-icon :name="ionText" size="14px" class="mr-1" />
                  “<span v-html="highlight(track.lyricMatch)" />”
                </q-item-label>
              </q-item-section>
              <q-item-section side class="max-sm:!hidden" v-if="track.tags?.bpm || track.tags?.key">
                <AudioTagChips :tags="track.tags" />
              </q-item-section>
              <q-item-section side class="text-xs">
                <div class="flex items-center gap-2 no-wrap">
                  {{ formatSeconds(track.duration) }}
                  <q-btn
                    flat
                    round
                    dense
                    class="!flex-none"
                    :aria-label="player.isPlaying(track) ? 'Pause' : 'Play'"
                    :icon="track.locked ? 'fas fa-lock' : player.isPlaying(track) ? ionPauseCircle : ionPlayCircle"
                    @click.prevent.stop="player.toggleTrack(track, tracks, `search:${q}`)"
                  />
                </div>
              </q-item-section>
            </q-item>
          </q-list>

          <div class="flex justify-center mt-4" v-if="page < lastPage">
            <q-btn
              flat
              rounded
              no-caps
              label="More songs"
              :loading="loading"
              @click="loadTracks(page + 1)"
            />
          </div>
          <q-inner-loading dark :showing="loading && !tracks.length" />
        </section>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ionPauseCircle, ionPlayCircle, ionText } from '@quasar/extras/ionicons-v8';
import { useMeta } from 'quasar';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AudioTagChips from 'src/components/Utilities/AudioTagChips.vue';
import { MUSICAL_KEYS } from 'src/utils/requests/tags';
import { usePlayerStore } from 'src/stores/player-store';
import { formatSeconds } from 'src/utils/helpers';
import type { Artist, Track } from 'src/utils/models';
import { loadArtistsRequest, loadTracksRequest } from 'src/utils/requests/requests';

type SearchTrack = Track & { lyricMatch?: string | null };

const route = useRoute();
const router = useRouter();
const player = usePlayerStore();

const q = computed(() => String(route.query.q ?? '').trim());

type FilterName = 'bpm_min' | 'bpm_max' | 'key' | 'compatible';

/** Tempo and key filters, kept in the address so results can be shared */
const filters = computed(() => ({
  bpm_min: (route.query.bpm_min as string) || null,
  bpm_max: (route.query.bpm_max as string) || null,
  key: (route.query.key as string) || null,
  compatible: route.query.compatible === '1',
}));

const filtering = computed(() => !!(filters.value.bpm_min || filters.value.bpm_max || filters.value.key));

const setFilter = (name: FilterName, value: string | number | null) => {
  const query: Record<string, string | undefined> = { ...(route.query as Record<string, string>) };
  query[name] = value === null || value === '' ? undefined : String(value);
  if (name === 'key' && !query.key) query.compatible = undefined;
  void router.replace({ query });
};

const params = computed(() => ({
  ...(q.value ? { search: q.value } : {}),
  ...(filters.value.bpm_min ? { bpm_min: filters.value.bpm_min } : {}),
  ...(filters.value.bpm_max ? { bpm_max: filters.value.bpm_max } : {}),
  ...(filters.value.key ? { key: filters.value.key, compatible: filters.value.compatible ? 1 : 0 } : {}),
}));
const tracks = ref<SearchTrack[]>([]);
const artists = ref<Artist[]>([]);
const loading = ref(false);
const page = ref(1);
const lastPage = ref(1);

const trackLink = (track: Track) => ({
  name: 'artist.track',
  params: { artist_id: track.artist?.username || track.artistId, track_id: track.slug },
});

const escape = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

/** The lyric line with the searched words in bold. */
const highlight = (line: string) => {
  const words = q.value.split(/\s+/).filter((w) => w.length > 2).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const safe = escape(line);
  return words.length ? safe.replace(new RegExp(`(${words.join('|')})`, 'gi'), '<b>$1</b>') : safe;
};

const loadTracks = async (to = 1) => {
  const term = JSON.stringify(params.value);
  loading.value = true;
  try {
    const res = await loadTracksRequest({ ...params.value, limit: 20, page: to }).send();
    if (term !== JSON.stringify(params.value)) return;
    const list = res.data as SearchTrack[];
    tracks.value = to === 1 ? list : [...tracks.value, ...list];
    const meta = (res as unknown as { meta?: { currentPage?: number; lastPage?: number } }).meta;
    page.value = meta?.currentPage ?? to;
    lastPage.value = meta?.lastPage ?? to;
  } catch {
    if (to === 1) tracks.value = [];
  } finally {
    loading.value = false;
  }
};

const loadArtists = async () => {
  const term = q.value;
  try {
    const res = await loadArtistsRequest({ search: term, limit: 8 }).send();
    if (term === q.value) artists.value = res.data;
  } catch {
    artists.value = [];
  }
};

watch(
  () => JSON.stringify(params.value),
  () => {
    tracks.value = [];
    if (q.value || filtering.value) void loadTracks(1);
  },
  { immediate: true },
);

watch(
  q,
  (term) => {
    artists.value = [];
    if (term) void loadArtists();
  },
  { immediate: true },
);

useMeta(() => ({
  title: q.value ? `${q.value} - Search` : 'Search',
  titleTemplate: (title) => `${title} - Toneflix Collab`,
}));
</script>

<style lang="scss" scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;

  .filters__bpm {
    flex: 0 0 110px;
  }

  .filters__key {
    flex: 0 0 200px;
  }
}

.songs {
  background: rgba(255, 255, 255, 0.03);
}

.song__lyric {
  margin-top: 4px;
  color: #c9ccd2;
  font-size: 0.8rem;
  font-style: italic;

  :deep(b) {
    color: #03bfff;
    font-style: normal;
  }
}

.artist {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 10px;
  max-width: 240px;
  padding: 6px 14px 6px 6px;
  color: #fff;
  text-decoration: none;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
}

.explicit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: #121212;
  font-size: 10px;
  font-weight: 700;
  border-radius: 3px;
  background: #b3b3b3;
}
</style>
