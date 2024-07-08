<template>
  <q-page>
    <div class="max-w-full p-4 mx-auto md:max-w-2xl lg:max-w-3xl">
      <div class="flex justify-start gap-4 mb-2">
        <h4 class="text-xl !flex-none font-semibold md:text-2xl">Releases</h4>
        <div class="!flex-none">
          <q-btn
            dense
            no-caps
            icon="add"
            size="md"
            label="Create Release"
            color="white"
            text-color="dark"
            :to="{
              name: 'studio.release.create',
            }"
          />
        </div>
      </div>
      <q-list class="grid grid-cols-1 md:grid-cols-2">
        <q-item
          clickable
          :to="{
            name: 'artist.album',
            params: {
              artist_id: release.artist?.username,
              album_id: release.slug,
            },
          }"
          :key="release.id"
          v-for="(release, i) in releases"
        >
          <q-item-section avatar>
            <q-avatar rounded color="gray-400" text-color="white">
              <q-img no-spinner :src="release.imageUrl" />
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label>{{ release.title }}</q-item-label>
            <q-item-label
              class="flex !flex-none flex-row items-center justify-start gap-2 text-xs font-semibold text-gray-900 dark:text-white"
            >
              <span class="!flex-none flex items-center gap-1">
                <q-icon name="fas fa-play" size=".6rem" />
                {{ intStr(release.streams) }}
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none flex items-center gap-1">
                <q-icon name="fas fa-compact-disc" size=".7rem" />
                {{ intStr(release.tracksCount) }}
              </span>
              <span class="!flex-none" v-if="!release.draft">•</span>
              <span
                class="!flex-none flex items-center gap-1"
                v-if="!release.draft"
              >
                <q-icon
                  name="fas fa-check-circle"
                  size=".7rem"
                  color="success"
                  class="icon-fill"
                />
              </span>
            </q-item-label>
          </q-item-section>
          <q-item-section side top>
            <q-item-label caption>
              {{ date.formatDate(release.releaseDate, 'YYYY/MM/DD') }}
            </q-item-label>

            <TDropdown
              flat
              dense
              rounded
              with-notifications
              icon="fas fa-ellipsis"
              dropdown-icon="none"
              color="white"
              :links="[
                {
                  label: 'Edit Release',
                  icon: 'fas fa-edit',
                  to: {
                    name: 'studio.release.create',
                    params: { release_id: release.slug },
                  },
                },
                {
                  label: 'Delete Release',
                  icon: 'fas fa-trash',
                  color: 'red',
                  action: 'delete',
                  target: `creator/releases/${release.id}`,
                  callback: () => releases.splice(i, 1),
                },
              ]"
              @click.stop.prevent
            />
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import TDropdown from 'src/components/Utilities/TDropdown.vue';
import { date } from 'quasar';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { intStr } from 'src/utils/helpers';
import { GenericData, Release } from 'src/utils/models';
import { loadReleasesRequest } from 'src/utils/requests';

defineOptions({
  async preFetch({ store }) {
    const boot = useBootstrapStore(store);

    await loadReleasesRequest({ user_id: boot.user.id as string })
      .send()
      .then(({ data }) => {
        boot.pageData.current = data as unknown as GenericData[];
      });
  },
});

const releases = useBootstrapStore().pageData.current as unknown as Release[];
</script>
