<template>
  <!-- Desktop: a menu at the ⋮ button or the pointer -->
  <q-menu
    dark
    no-parent-event
    ref="menu"
    class="track-menu"
    :target="trackMenu.target ?? false"
    :touch-position="trackMenu.atPointer"
    :anchor="trackMenu.atPointer ? undefined : 'bottom right'"
    :self="trackMenu.atPointer ? undefined : 'top right'"
    v-if="!sheet && track"
  >
    <TrackMenuList :track="track" :context="trackMenu.context" />
  </q-menu>

  <!-- Phones and long presses: a bottom sheet -->
  <AppSheet above-dialogs v-model="sheetOpen" v-if="track">
    <template #header>
      <MenuHeader :title="track.title" :caption="track.artist?.name || 'Unknown'" :image-url="track.imageUrl" />
    </template>
    <div @click="sheetOpen = false">
      <TrackMenuList :track="track" :context="trackMenu.context" />
    </div>
  </AppSheet>

  <TrackCreditsDialog :track="dialogTrack" v-model="creditsOpen" v-if="dialogTrack" />
  <SaveToPlaylistDialog :track="dialogTrack" v-model="playlistOpen" v-if="dialogTrack" />
  <ReportDialog type="track" label="track" :id="dialogTrack.id" ref="reportDialog" v-if="dialogTrack">
    <span hidden />
  </ReportDialog>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, useTemplateRef, watch } from 'vue';
import { QMenu, useQuasar } from 'quasar';
import AppSheet from 'src/components/Controllers/AppSheet.vue';
import ReportDialog from 'src/components/Moderation/ReportDialog.vue';
import MenuHeader from 'src/components/Menus/MenuHeader.vue';
import TrackMenuList from './TrackMenuList.vue';
import TrackCreditsDialog from './TrackCreditsDialog.vue';
import SaveToPlaylistDialog from './SaveToPlaylistDialog.vue';
import { trackMenu } from 'src/utils/track-menu';
import type { Track } from 'src/utils/models';

const $q = useQuasar();

const menu = useTemplateRef<QMenu>('menu');
const reportDialog = useTemplateRef<InstanceType<typeof ReportDialog>>('reportDialog');

const sheetOpen = ref(false);
const creditsOpen = ref(false);
const playlistOpen = ref(false);

/** The track the dialogs are about; stays while the menu moves on */
const dialogTrack = shallowRef<Track | null>(null);

const track = computed(() => trackMenu.track);
const sheet = computed(() => $q.screen.lt.sm || trackMenu.viaTouch);

watch(
  () => trackMenu.opened,
  async () => {
    if (sheet.value) {
      menu.value?.hide();
      sheetOpen.value = true;
      return;
    }

    sheetOpen.value = false;
    menu.value?.hide();
    await nextTick();
    menu.value?.show(trackMenu.event ?? undefined);
  },
);

watch(
  () => trackMenu.dialog,
  async (dialog) => {
    if (!dialog) return;

    dialogTrack.value = dialog.track;
    trackMenu.dialog = null;
    await nextTick();

    if (dialog.kind === 'credits') creditsOpen.value = true;
    if (dialog.kind === 'report') reportDialog.value?.open();
    if (dialog.kind === 'playlist') playlistOpen.value = true;
  },
);
</script>

<style lang="scss">
.track-menu {
  min-width: 240px;

  .q-item {
    min-height: 44px;
  }
}
</style>
