<template>
  <q-page padding>
    <div class="relative">
      <div
        class="absolute top-0 bottom-0 left-0 right-0 bg-center h-72 bg-slate-500 blur-3xl"
        :style="{ backgroundImage: `url(${artist?.imageUrl})` }"
      ></div>
      <div class="absolute flex justify-center md:!justify-start w-full">
        <AtroposViewer
          class="!flex-none w-48 h-48 md:h-72 md:w-72"
          :main-image="artist.imageUrl"
        >
          <template #button>
            <q-btn
              round
              color="dark-opaque"
              size="xl"
              class="!flex-none opacity-90"
              :icon="ionPlay"
            />
          </template>
        </AtroposViewer>
        <div class="flex flex-row items-center justify-start flex-1 p-5">
          <div>
            <h6 class="text-sm">
              <q-icon
                name="verified"
                color="toneflix"
                class="verified-badge"
                v-if="artist.verified"
              />
              {{ artist.verified ? 'Verified Artist' : 'Artist' }}
            </h6>

            <h1 class="text-5xl font-circlular-std whitespace-nowrap">
              {{ artist?.name }}
            </h1>

            <div
              class="flex flex-row items-center justify-start gap-2 font-semibold"
            >
              <span class="!flex-none">
                <q-btn
                  dense
                  no-caps
                  rounded
                  unelevated
                  size="sm"
                  padding="0 sm"
                  :icon="artist.youFollow ? undefined : ionAdd"
                  :label="artist.youFollow ? 'Unfollow' : 'Follow'"
                  :color="artist.youFollow ? 'primary' : undefined"
                  @click="artist.youFollow = !artist.youFollow"
                />
              </span>
              <span class="!flex-none">
                {{ intStr(artist.followers) }} Followers
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none">
                {{ intStr(artist.reputation) }} Reps.
              </span>
            </div>
            <p class="mt-4 text-sm max-w-96">
              {{ artist.about }}
            </p>
          </div>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3 pt-80">
      <div class="col-span-5">
        <ProjectList
          :categories="[
            {
              id: 'projects',
              slug: 'projects',
              title: 'Projects',
            },
          ]"
        />
      </div>
      <div class="col-span-5">
        <TrackList
          hide-all-link
          :categories="[
            {
              id: 'top-songs',
              slug: 'top-songs',
              title: 'Top Songs',
            },
            {
              id: 'features',
              slug: 'features',
              title: 'Features',
            },
          ]"
        />
      </div>
      <div class="col-span-5">
        <AlbumList
          hide-all-link
          :categories="[
            {
              id: 'albums',
              slug: 'albums',
              title: 'Albums',
            },
          ]"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Artist } from 'src/utils/models';
import { useRoute } from 'vue-router';
import { artistList } from 'src/utils/dummy';
import { ionAdd, ionPlay } from '@quasar/extras/ionicons-v7';
import { intStr } from 'src/utils/helpers';
import TrackList from 'src/components/Showcase/TrackList.vue';
import ProjectList from 'src/components/Showcase/ProjectList.vue';
import AlbumList from 'src/components/Showcase/AlbumList.vue';
import AtroposViewer from 'src/components/Controllers/AtroposViewer.vue';
import { useMeta } from 'quasar';

const route = useRoute();

const artist = ref<Artist>({} as unknown as Artist);

watch(
  () => route.params,
  (params) => {
    artist.value =
      artistList.value.find(
        (e) => e.id === params.artist_id || e.username === params.artist_id,
      ) || ({} as unknown as Artist);
  },
  { immediate: true },
);

useMeta(() => {
  return {
    title: artist.value.name,
    titleTemplate: (title) => `${title} - Toneflix Collab`,
    meta: {
      description: {
        name: 'description',
        content: artist.value.name + ' on Toneflix Collab',
      },
      ogImage: { property: 'og:image', content: artist.value.imageUrl },
      ogTitle: { property: 'og:title', content: artist.value.name },
      ogDescription: {
        property: 'og:description',
        content: artist.value.name + ' on Toneflix Collab',
      },
    },
  };
});
</script>
