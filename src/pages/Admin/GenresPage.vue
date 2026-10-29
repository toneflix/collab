<template>
  <q-page padding>
    <div class="max-w-6xl mx-auto">
      <div class="flex flex-wrap items-end gap-3 py-8">
        <div class="min-w-0">
          <h1 class="text-3xl font-circlular-std">Genres</h1>
          <p class="text-grey-5">Names and cover photos people browse by.</p>
        </div>
        <q-btn
          unelevated
          rounded
          no-caps
          color="toneflix"
          icon="lucide-plus"
          label="Add genre"
          class="ml-auto flex-none!"
          @click="edit(null)"
        />
      </div>

      <div class="flex flex-wrap items-center gap-3 mb-4">
        <q-tabs dense no-caps align="left" active-color="toneflix" class="flex-none!" v-model="cover">
          <q-tab :key="option.value" :name="option.value" :label="option.label" v-for="option in covers" />
        </q-tabs>
        <q-input dark dense outlined clearable debounce="400" placeholder="Search genres" class="ml-auto min-w-56" v-model="search">
          <template #prepend><q-icon name="lucide-search" /></template>
        </q-input>
        <q-select dark dense outlined emit-value map-options class="w-40 flex-none!" :options="sorts" v-model="sort" />
      </div>

      <div class="genres" v-if="list.length">
        <button type="button" class="genre" :key="genre.id" @click="edit(genre)" v-for="genre in list">
          <GenreTile size="fill" :genre="genre">
            <q-badge rounded color="dark-opaque" class="genre__badge" label="No cover" v-if="!genre.imageUrl" />
          </GenreTile>
          <span class="genre__stats">
            {{ genre.tracksCount || 0 }} tracks · {{ genre.releasesCount || 0 }} releases · {{ genre.fansCount || 0 }} fans
          </span>
        </button>
      </div>
      <ListSkeleton v-else-if="loading" />
      <SimpleInfo v-else text="No genres match." />

      <div class="flex justify-center mt-8" v-if="pageCount > 1">
        <q-pagination class="flex-none!" v-model="page" :max="pageCount" :max-pages="7" direction-links boundary-numbers />
      </div>
    </div>

    <GenreEditDialog :genre="editing" @saved="refresh" @remove="confirmRemove" v-model="editOpen" />
    <GenreRemoveDialog :genre="editing" @removed="refresh" v-model="removeOpen" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useMeta } from 'quasar';
import { useWatcher } from 'alova/client';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import GenreTile from 'src/components/Cards/GenreTile.vue';
import GenreEditDialog from 'src/components/Admin/Genres/GenreEditDialog.vue';
import GenreRemoveDialog from 'src/components/Admin/Genres/GenreRemoveDialog.vue';
import type { Genre } from 'src/utils/models';
import { loadAdminGenresRequest, type GenreFilters } from 'src/utils/requests/adminGenres';

const covers: { value: NonNullable<GenreFilters['cover']>; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'without', label: 'No cover' },
  { value: 'with', label: 'With cover' },
];

const sorts = [
  { value: 'title', label: 'Name' },
  { value: 'used', label: 'Most used' },
];

const cover = ref<NonNullable<GenreFilters['cover']>>('');
const search = ref<string | null>('');
const sort = ref<'title' | 'used'>('title');
const page = ref(1);
const editing = ref<Genre | null>(null);
const editOpen = ref(false);
const removeOpen = ref(false);

watch([cover, search, sort], () => (page.value = 1));

const { data, loading, send } = useWatcher(
  () => loadAdminGenresRequest({ cover: cover.value, search: search.value || '', sort: sort.value, page: page.value }),
  [cover, search, sort, page],
  { immediate: true },
);

const list = computed(() => data.value?.data || []);
const pageCount = computed(() => data.value?.meta?.lastPage || 1);

const edit = (genre: Genre | null) => {
  editing.value = genre;
  editOpen.value = true;
};

const confirmRemove = () => {
  editOpen.value = false;
  removeOpen.value = true;
};

const refresh = () => void send();

useMeta(() => ({
  title: 'Genres',
  titleTemplate: (title) => `${title} - Toneflix Music`,
}));
</script>

<style lang="scss" scoped>
.genres {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(156px, 1fr));
  gap: 16px;
}

.genre {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 0;
  text-align: left;
  border: 0;
  background: none;
  cursor: pointer;
}

.genre__badge {
  position: absolute;
  top: 8px;
  left: 8px;
}

.genre__stats {
  overflow: hidden;
  font-size: 0.75rem;
  color: var(--tf-text-subtle);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
