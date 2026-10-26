<template>
  <q-page>
    <div class="max-w-full p-4 mx-auto md:max-w-2xl lg:max-w-3xl">
      <div class="flex justify-start gap-4 mb-2">
        <h4 class="text-xl !flex-none font-semibold md:text-2xl">Releases</h4>
        <div class="!flex-none">
          <q-btn
            dense
            no-caps
            icon="lucide-plus"
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
            <q-item-label>
              {{ release.title }}
              <span class="text-grey-6" v-if="release.version">
                · {{ release.version }}
              </span>
            </q-item-label>
            <q-item-label
              class="flex !flex-none flex-row items-center justify-start gap-2 text-xs font-semibold text-gray-900 dark:text-white"
            >
              <span class="!flex-none flex items-center gap-1">
                <q-icon name="lucide-play:fill" size=".6rem" />
                {{ intStr(release.streams) }}
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none flex items-center gap-1">
                <q-icon name="lucide-disc-3" size=".7rem" />
                {{ intStr(release.tracksCount) }}
              </span>
              <q-badge
                rounded
                color="red-9"
                label="Changes needed"
                class="!flex-none"
                v-if="release.draft && release.reviewStatus === 'rejected'"
              >
                <q-tooltip max-width="280px" v-if="release.reviewNote">{{ release.reviewNote }}</q-tooltip>
              </q-badge>
              <q-badge
                rounded
                color="grey-7"
                label="Draft"
                class="!flex-none"
                v-else-if="release.draft"
              />
              <q-badge
                rounded
                color="orange-9"
                label="In review"
                class="!flex-none"
                v-else-if="release.reviewStatus === 'pending'"
              />
              <q-badge
                rounded
                color="orange"
                label="Retired"
                class="!flex-none"
                v-else-if="release.retired"
              />
              <span class="!flex-none" v-if="isLive(release)">•</span>
              <span
                class="!flex-none flex items-center gap-1"
                v-if="isLive(release)"
              >
                <q-icon
                  name="lucide-circle-check"
                  size=".7rem"
                  color="success"
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
              icon="lucide-ellipsis"
              dropdown-icon="none"
              color="white"
              :links="[
                {
                  label: 'Edit Release',
                  icon: 'lucide-pencil',
                  to: {
                    name: 'studio.release.create',
                    params: { release_id: release.slug },
                  },
                },
                {
                  show: !release.draft && release.reviewStatus !== 'pending',
                  label: release.retired ? 'Restore Release' : 'Retire Release',
                  icon: release.retired ? 'lucide-rotate-ccw' : 'lucide-archive',
                  click: () => toggleRetired(release),
                },
                {
                  label: 'Delete Release',
                  icon: 'lucide-trash-2',
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
import { intStr, notify } from 'src/utils/helpers';
import { Release } from 'src/utils/models';
import {
  loadCreatorReleasesRequest,
  retireReleaseRequest,
} from 'src/utils/requests/requests';
import { reactive } from 'vue';

defineOptions({
  async preFetch({ store }) {
    const boot = useBootstrapStore(store);

    await loadCreatorReleasesRequest({ limit: 50 })
      .send()
      .then(({ data }) => {
        boot.pageData.current = data;
      });
  },
});

const releases = reactive(useBootstrapStore().pageData.current as Release[]);

const isLive = (release: Release) =>
  !release.draft && !release.retired && release.reviewStatus !== 'pending';

const toggleRetired = (release: Release) => {
  retireReleaseRequest(release.id, !release.retired)
    .send()
    .then(({ data, message }) => {
      release.retired = data.retired;
      notify(message, 'success');
    });
};
</script>
