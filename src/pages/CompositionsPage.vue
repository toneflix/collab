<template>
  <q-page class="p-3 md:p-6">
    <div class="mx-auto max-w-[1400px]">
      <h1 class="mb-1 text-2xl font-bold">Compositions</h1>
      <p class="mb-6 text-sm text-grey-5">
        Lyrics published from Composer.
      </p>

      <div class="flex flex-wrap items-center gap-3 mb-6">
        <q-input
          dark
          dense
          outlined
          rounded
          clearable
          debounce="400"
          class="search"
          placeholder="Search titles and lyrics"
          :model-value="search"
          @update:model-value="setQuery('search', $event as string | null)"
        >
          <template #prepend>
            <q-icon name="lucide-search" />
          </template>
        </q-input>
        <q-btn-toggle
          dark
          no-caps
          rounded
          unelevated
          dense
          toggle-color="toneflix"
          toggle-text-color="dark"
          color="transparent"
          class="sort flex-none!"
          :options="sortOptions"
          :model-value="sort"
          @update:model-value="setQuery('sort', $event === 'latest' ? null : $event)"
        />
      </div>

      <div class="py-12 text-center text-grey-5" v-if="!loading && !songs.length">
        <template v-if="search">No published compositions match “{{ search }}”.</template>
        <template v-else>No compositions published yet.</template>
      </div>

      <div class="grid">
        <CompositionCard :key="song.id" :song="song" v-for="song in songs" />
      </div>

      <div class="flex justify-center mt-8" v-if="page < lastPage">
        <q-btn flat rounded no-caps label="More compositions" :loading="loading" @click="load(page + 1)" />
      </div>
      <ListSkeleton avatar="square" :rows="4" v-if="loading && !songs.length" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useMeta } from 'quasar';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import CompositionCard from 'src/components/Compositions/CompositionCard.vue';
import { notifyError } from 'src/utils/composer';
import { loadPublicSongsRequest, type PublicSong, type PublicSongSort } from 'src/utils/requests/composer';

const route = useRoute();
const router = useRouter();

const sortOptions = [
  { label: 'Newest', value: 'latest' },
  { label: 'Most forked', value: 'forks' },
];

const search = computed(() => String(route.query.search ?? '').trim());
const sort = computed<PublicSongSort>(() => (route.query.sort === 'forks' ? 'forks' : 'latest'));

const songs = ref<PublicSong[]>([]);
const page = ref(1);
const lastPage = ref(1);
const loading = ref(false);
let ticket = 0;

const setQuery = (name: 'search' | 'sort', value: string | null) => {
  void router.replace({ query: { ...route.query, [name]: value || undefined } });
};

const load = async (to = 1) => {
  const mine = ++ticket;
  loading.value = true;
  try {
    const res = await loadPublicSongsRequest({ page: to, limit: 24, search: search.value, sort: sort.value }).send();
    if (mine !== ticket) return;
    songs.value = to === 1 ? res.data : [...songs.value, ...res.data];
    page.value = res.meta?.currentPage ?? to;
    lastPage.value = res.meta?.lastPage ?? to;
  } catch (e) {
    notifyError(e, "Compositions couldn't be loaded.");
  } finally {
    if (mine === ticket) loading.value = false;
  }
};

watch([search, sort], () => void load(1));

onMounted(() => void load(1));

useMeta(() => ({
  title: search.value ? `${search.value} - Compositions` : 'Compositions',
  titleTemplate: (title) => `${title} - Toneflix Music`,
}));
</script>

<style lang="scss" scoped>
.search {
  flex: 1 1 260px;
  max-width: 420px;
}

.sort {
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;

  @media (max-width: 599px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
}
</style>
