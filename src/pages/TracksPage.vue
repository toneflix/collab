<template>
  <q-page padding>
    <SimpleInfo
      class="mt-8"
      icon="lucide-music"
      text="No tracks yet. New releases show up here."
      v-if="!categories.all[0].data?.list.length"
    />
    <div class="grid grid-cols-5 gap-x-3 gap-y-3" v-else>
      <div class="col-span-5">
        <TrackList hide-all-link v-model:categories="categories.trending" />
      </div>
      <div class="col-span-5">
        <TrackList
          vertical-list
          hide-all-link
          v-model:categories="categories.all"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useMeta } from 'quasar';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import TrackList from 'src/components/Showcase/TrackList.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { ExploreData } from 'src/utils/models';
import { exploreRequest } from 'src/utils/requests/requests';
import { reactive } from 'vue';

defineOptions({
  async preFetch({ store }) {
    const boot = useBootstrapStore(store);

    // This week's trending tracks, and every track newest first.
    const [trending, latest] = await Promise.all([
      exploreRequest({ with: 'artist', trending: 30 }).send(),
      exploreRequest({ with: 'artist', latest_tracks: 30, period: 'years_2' }).send(),
    ]);

    boot.pageData.current = { ...trending, ...latest };
  },
});

const boot = useBootstrapStore();
const data = boot.pageData.current as Partial<ExploreData>;

const description = 'Listen to trending and new tracks from artists on Toneflix Music.';

useMeta({
  title: 'Tracks',
  titleTemplate: (title) => `${title} - Toneflix Music`,
  meta: {
    description: { name: 'description', content: description },
    ogTitle: { property: 'og:title', content: 'Tracks' },
    ogDescription: { property: 'og:description', content: description },
  },
});

const categories = reactive({
  trending: [
    {
      id: 'trending',
      slug: 'trending',
      title: 'Trending this week',
      data: data.trending,
      params: { filters: 'trending', period: 'week' },
    },
  ],
  all: [
    {
      id: 'all-tracks',
      slug: 'all-tracks',
      title: 'All tracks',
      data: data.latestTracks,
      params: { filters: 'latest', period: 'years_2' },
    },
  ],
});
</script>
