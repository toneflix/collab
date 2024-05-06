<template>
  <q-layout view="lHh LpR lFf">
    <q-header class="text-white bg-dark">
      <q-toolbar>
        <VaButton
          round
          size="medium"
          color="gray-700"
          v-if="!showSearch"
          @click="showSearch = !showSearch"
        >
          <t-icon name="eva-search" />
        </VaButton>

        <VaInput
          placeholder="Search Tracks, Albums, Projects and Creators"
          preset="solid"
          color="white"
          class="placeholder-white"
          background="gray-700"
          style="
            --va-input-wrapper-border-radius: 20px;
            --va-input-wrapper-color: #fff;
            --va-input-wrapper-border-color: #000;
          "
          v-if="showSearch"
        >
          <template #prependInner>
            <q-icon
              name="clear"
              size="sm"
              color="white"
              @click="showSearch = !showSearch"
            />
          </template>
        </VaInput>
        <q-toolbar-title class="text-center"> Title </q-toolbar-title>

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
                  <img src="https://cdn.quasar.dev/img/boy-avatar.png" />
                </q-avatar>
                <div class="ellipsis" v-if="$q.screen.gt.xs">John Stone</div>
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
      <q-toolbar class="mb-10 bg-dark">
        <img src="~/assets/logo.png" class="h-20 py-4 cursor-pointer" />
      </q-toolbar>

      <q-scroll-area class="h-[70vh]">
        <q-list padding class="menu-list">
          <q-item dense clickable v-ripple>
            <q-item-section avatar>
              <t-icon name="eva-home" />
            </q-item-section>

            <q-item-section> Home </q-item-section>
          </q-item>

          <q-item dense active clickable v-ripple>
            <q-item-section avatar>
              <t-icon name="eva-grid" />
            </q-item-section>

            <q-item-section> Genres </q-item-section>
          </q-item>

          <q-item dense clickable v-ripple>
            <q-item-section avatar>
              <t-icon name="eva-person" />
            </q-item-section>

            <q-item-section> Artists </q-item-section>
          </q-item>

          <q-item dense clickable v-ripple>
            <q-item-section avatar>
              <t-icon name="eva-layers" />
            </q-item-section>

            <q-item-section> Albums </q-item-section>
          </q-item>

          <q-separator class="q-my-lg" />

          <q-item dense clickable v-ripple>
            <q-item-section avatar>
              <t-icon name="eva-heart" />
            </q-item-section>

            <q-item-section> Loved </q-item-section>
          </q-item>

          <q-item dense clickable v-ripple>
            <q-item-section avatar>
              <t-icon name="eva-people" />
            </q-item-section>

            <q-item-section> Collabs </q-item-section>
          </q-item>

          <q-item dense clickable v-ripple>
            <q-item-section avatar>
              <t-icon name="eva-music" />
            </q-item-section>

            <q-item-section> Recent </q-item-section>
          </q-item>

          <q-separator class="q-my-lg" />

          <q-item dense class="label">
            <q-item-section class="text-gray-400"> Projects </q-item-section>
            <q-item-section side>
              <VaButton size="small" preset="secondary" border-color="primary">
                <t-icon name="eva-music" />
              </VaButton>
            </q-item-section>
          </q-item>

          <q-item dense clickable v-ripple>
            <q-item-section avatar>
              <t-icon name="eva-file" />
            </q-item-section>

            <q-item-section> Big Seven </q-item-section>
          </q-item>

          <q-item dense clickable v-ripple>
            <q-item-section avatar>
              <t-icon name="eva-file" />
            </q-item-section>

            <q-item-section> Just Believe </q-item-section>
          </q-item>

          <q-item dense clickable v-ripple>
            <q-item-section avatar>
              <t-icon name="eva-file" />
            </q-item-section>

            <q-item-section> Twice Tall </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="text-white bg-glass">
      <q-toolbar> </q-toolbar>
    </q-footer>
  </q-layout>
</template>

<script setup>
import { useQuasar } from 'quasar';
import ProfileDropdown from 'src/components/dropdowns/ProfileDropdown.vue';
import TIcon from 'src/components/icons/TIcon.vue';
import { ref } from 'vue';

const $q = useQuasar();
const showSearch = ref($q.screen.gt.xs);
const leftDrawerOpen = ref(false);
</script>
