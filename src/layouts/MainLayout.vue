<template>
  <q-layout view="lHh Lpr fFf">
    <!-- lHh Lpr lff -->
    <q-header class="text-white bg-dark">
      <q-toolbar>
        <VaButton
          round
          size="medium"
          color="backgroundSecondary"
          v-if="!showSearch"
          @click="showSearch = !showSearch"
        >
          <t-icon name="eva-search" />
        </VaButton>

        <VaInput
          placeholder="Search Tracks, Albums, Projects and Creators"
          preset="solid"
          color="textPrimary"
          class="placeholder-white"
          background="backgroundSecondary"
          style="
            --va-input-wrapper-border-radius: 20px;
            --va-input-wrapper-color: #fff;
            --va-input-wrapper-border-color: var(--va-background-secondary);
          "
          v-if="showSearch"
        >
          <template #prependInner>
            <q-icon
              name="clear"
              size="sm"
              color="white"
              v-if="$q.screen.lt.sm"
              @click="showSearch = !showSearch"
            />
          </template>
        </VaInput>
        <!-- <q-toolbar-title class="text-center"> Title </q-toolbar-title> -->

        <q-space />

        <div>
          <ProfileDropdown>
            <template #anchor="{ isShown }">
              <q-chip
                clickable
                color="grey-9"
                text-color="white"
                :icon-right="`eva-chevron-${isShown ? 'up' : 'down'}-outline`"
              >
                <q-avatar size="sm">
                  <img
                    :src="
                      boot.user.imageUrl ||
                      'https://cdn.quasar.dev/img/boy-avatar.png'
                    "
                  />
                </q-avatar>
                <div class="ellipsis" v-if="$q.screen.gt.xs">
                  {{ boot.user.name || 'Guest' }}
                </div>
              </q-chip>
            </template>
          </ProfileDropdown>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer
      show-if-above
      side="left"
      :breakpoint="500"
      v-model="leftDrawerOpen"
    >
      <!-- drawer content -->
      <q-toolbar class="!items-start py-3 mb-10 h-28 bg-dark absolute-top">
        <div>
          <img src="~/assets/logo.png" class="h-10 cursor-pointer" />
        </div>
      </q-toolbar>

      <q-scroll-area class="h-[calc(100%-112px)] mt-28">
        <q-list padding class="menu-list">
          <template v-for="link in mainNavigationLinks">
            <q-item
              dense
              exact
              clickable
              v-ripple
              :to="link.to"
              :key="link.title"
              v-if="
                !link.group &&
                !link.separator &&
                (!link.requiresAuth || boot.user?.id)
              "
            >
              <q-item-section avatar>
                <t-icon :name="link.icon" />
              </q-item-section>

              <q-item-section> {{ link.title }} </q-item-section>
            </q-item>

            <q-separator
              class="q-my-lg"
              :key="link.title"
              v-if="link.separator"
            />

            <template
              v-if="link.group && (!link.requiresAuth || boot.user?.id)"
            >
              <q-item dense class="label" :key="link.group">
                <q-item-section class="text-gray-400">
                  {{ link.title }}
                </q-item-section>
                <q-item-section side v-if="link.button">
                  <q-btn dense outline size="sm" :to="link.button.action">
                    <t-icon :name="link.button.icon" />
                  </q-btn>
                </q-item-section>
              </q-item>

              <q-item
                dense
                clickable
                v-ripple
                :to="routeBuilder(item, link.group)"
                :key="link.group + item.title"
                v-for="item in cache.mainLayoutGroups[link.group]"
              >
                <q-item-section avatar>
                  <t-icon name="eva-file" />
                </q-item-section>

                <q-item-section> {{ item.title }} </q-item-section>
              </q-item>
            </template>
          </template>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="text-white bg-glass">
      <AudioPlayer v-if="!$route.meta.hidePlayer" />
    </q-footer>
  </q-layout>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import AudioPlayer from 'src/components/Controllers/AudioPlayer.vue';
import ProfileDropdown from 'src/components/dropdowns/ProfileDropdown.vue';
import TIcon from 'src/components/icons/TIcon.vue';
import { ref } from 'vue';
import { mainNavigationLinks } from 'src/utils/navigations';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { reboot } from 'src/utils/proccessor';
import { GenericData, ResponseBody } from 'src/utils/models';
import { alova } from 'src/boot/alova';
import { loadPlaylistRequest } from 'src/utils/requests/requests';
import { useGlobalStore } from 'src/stores/global-store';

defineOptions({
  async preFetch({ store }) {
    const boot = useBootstrapStore(store);
    const system = useGlobalStore(store);

    await reboot().then(({ init }) => {
      boot.configuration = init.configuration;
    });

    if (system.playlist.size < 1) {
      const { data: trackList } = await loadPlaylistRequest({
        randomize: true,
        with: 'artist',
      }).send();

      system.playlist.id = 0;
      system.addToPlaylist(trackList);
      system.setCurrentTrack(trackList[0]);
    }

    const data = {} as Record<string, GenericData>;
    for (const group of mainNavigationLinks.filter((e) => !!e.group)) {
      if (group.group) {
        data[group.group] = await alova
          .Get(group.group, {
            params: group.params,
            transform: (e: ResponseBody<GenericData>) => e.data,
          })
          .send();
      }
    }

    boot.setCache({ mainLayoutGroups: data } as unknown as GenericData);
  },
});

const $q = useQuasar();
const boot = useBootstrapStore();
const showSearch = ref($q.screen.gt.xs);
const leftDrawerOpen = ref(false);
const cache = boot.pageData.cache as unknown as {
  mainLayoutGroups: Record<string, GenericData[]>;
};

const routeBuilder = (item: GenericData, group: string) => {
  if (group === 'creator/projects') {
    return {
      name: 'studio.project',
      params: { project_id: item.slug },
    };
  }
  return null;
};
</script>
