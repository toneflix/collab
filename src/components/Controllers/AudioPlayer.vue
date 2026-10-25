<template>
  <div class="player-bar" ref="root">
    <SeekBar
      :position="player.position"
      :duration="player.duration"
      :buffered="player.buffered"
      @seek="player.seek"
    />

    <div class="player-bar__row">
      <!-- Transport: previous, play/pause, next and time -->
      <div class="player-bar__transport">
        <q-btn
          flat
          round
          size="md"
          class="!flex-none max-sm:!hidden"
          aria-label="Previous track"
          :icon="ionPlaySkipBack"
          @click="player.previous()"
        />
        <q-btn
          round
          unelevated
          size="md"
          color="glass"
          class="!flex-none mx-1 white-glass"
          :aria-label="player.playing ? 'Pause' : 'Play'"
          :disable="!track.id"
          @click="player.toggle()"
        >
          <q-spinner size="24px" color="white" v-if="player.loading" />
          <q-icon size="26px" :name="player.playing ? ionPause : ionPlay" v-else />
        </q-btn>
        <q-btn
          flat
          round
          size="md"
          class="!flex-none"
          aria-label="Next track"
          :icon="ionPlaySkipForward"
          @click="player.next()"
        />
        <div class="ml-2 text-xs whitespace-nowrap text-grey-5 !flex-none max-md:!hidden">
          {{ formatSeconds(player.position) }} / {{ formatSeconds(player.duration) }}
        </div>
      </div>

      <!-- Now playing: artwork, title, artist and actions -->
      <div class="player-bar__now">
        <RouterLink :to="trackLink" class="!flex-none" v-if="track.id">
          <q-img
            no-spinner
            class="rounded bg-gray-700"
            width="44px"
            height="44px"
            :src="track.imageUrl"
          />
        </RouterLink>

        <div class="min-w-0 !flex-auto md:!flex-initial">
          <RouterLink :to="trackLink" class="block font-bold truncate">
            {{ track.title || 'Nothing playing' }}
          </RouterLink>
          <div class="flex items-center gap-1 text-sm truncate text-grey-5 no-wrap">
            <span
              class="explicit !flex-none"
              title="Explicit"
              v-if="track.explicit"
            >E</span>
            <span class="truncate">
              <RouterLink :to="artistLink" class="hover:underline" v-if="track.artist">
                {{ track.artist.name }}
              </RouterLink>
              <template v-if="track.release?.title">
                •
                <RouterLink :to="releaseLink" class="hover:underline">
                  {{ track.release.title }}
                </RouterLink>
              </template>
              <template v-if="year"> • {{ year }}</template>
            </span>
          </div>
        </div>

        <div class="flex items-center !flex-none no-wrap max-sm:!hidden" v-if="track.id">
          <TInteraction
            v-slot="{ submit, active }"
            type="like"
            label="Like"
            :active="track.liked"
            :base-url="`tracks/${track.id}`"
            :signature="`track:${track.id}`"
            @done="track.likes = $event.likes"
          >
            <q-btn
              flat
              round
              size="md"
              class="!flex-none"
              :aria-label="active ? 'Unlike' : 'Like'"
              :icon="active ? ionHeart : ionHeartOutline"
              :color="active ? 'toneflix' : undefined"
              @click="submit"
            />
          </TInteraction>

          <q-btn flat round size="md" class="!flex-none" aria-label="More" :icon="ionEllipsisVertical">
            <q-menu dark anchor="top middle" self="bottom middle" :offset="[0, 8]">
              <q-list dense class="min-w-48">
                <q-item clickable v-close-popup :to="trackLink">
                  <q-item-section avatar><q-icon :name="ionMusicalNote" /></q-item-section>
                  <q-item-section>Go to song</q-item-section>
                </q-item>
                <q-item clickable v-close-popup :to="artistLink" v-if="track.artist">
                  <q-item-section avatar><q-icon :name="ionPerson" /></q-item-section>
                  <q-item-section>Go to artist</q-item-section>
                </q-item>
                <q-item clickable v-close-popup :to="releaseLink" v-if="track.release">
                  <q-item-section avatar><q-icon :name="ionDisc" /></q-item-section>
                  <q-item-section>Go to album</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="copyLink">
                  <q-item-section avatar><q-icon :name="ionLink" /></q-item-section>
                  <q-item-section>Copy link</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="openPanel('next')">
                  <q-item-section avatar><q-icon :name="ionList" /></q-item-section>
                  <q-item-section>Up next</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="openPanel('lyrics')">
                  <q-item-section avatar><q-icon :name="ionText" /></q-item-section>
                  <q-item-section>Lyrics</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
      </div>

      <!-- Volume, repeat, shuffle and the queue -->
      <div class="player-bar__extras">
        <div class="volume max-md:!hidden">
          <div class="volume__slider">
            <q-slider
              dense
              color="white"
              track-size="3px"
              thumb-size="12px"
              :min="0"
              :max="100"
              :model-value="player.muted ? 0 : player.volume"
              @update:model-value="(v) => player.setVolume(v ?? 0)"
            />
          </div>
          <q-btn
            flat
            round
            size="md"
            class="!flex-none"
            :aria-label="player.muted ? 'Unmute' : 'Mute'"
            :icon="volumeIcon"
            @click="player.toggleMute()"
          />
        </div>
        <q-btn
          flat
          round
          size="md"
          class="!flex-none max-sm:!hidden"
          :class="{ 'text-toneflix': player.repeat !== 'off' }"
          :aria-label="`Repeat: ${player.repeat}`"
          @click="player.cycleRepeat()"
        >
          <q-icon :name="ionRepeat" />
          <span class="repeat-one" v-if="player.repeat === 'one'">1</span>
          <q-tooltip>{{ repeatLabel }}</q-tooltip>
        </q-btn>
        <q-btn
          flat
          round
          size="md"
          class="!flex-none max-sm:!hidden"
          :class="{ 'text-toneflix': player.shuffle }"
          :aria-label="player.shuffle ? 'Turn shuffle off' : 'Turn shuffle on'"
          :icon="ionShuffle"
          @click="player.toggleShuffle()"
        >
          <q-tooltip>{{ player.shuffle ? 'Shuffle on' : 'Shuffle off' }}</q-tooltip>
        </q-btn>
        <q-btn
          flat
          round
          size="md"
          class="!flex-none"
          :class="{ 'text-toneflix': queueOpen && panelTab === 'lyrics' }"
          :aria-label="queueOpen && panelTab === 'lyrics' ? 'Close lyrics' : 'Show lyrics'"
          :icon="ionText"
          :disable="!track.id"
          @click="openPanel('lyrics', true)"
        >
          <q-tooltip>Lyrics</q-tooltip>
        </q-btn>
        <q-btn
          flat
          round
          size="md"
          class="!flex-none"
          :aria-label="queueOpen ? 'Close up next' : 'Open up next'"
          :icon="queueOpen ? ionCaretDown : ionCaretUp"
          @click="queueOpen = !queueOpen"
        />
      </div>
    </div>

    <NowPlayingDialog v-model="queueOpen" v-model:tab="panelTab" :offset="height" />
  </div>
</template>

<script setup lang="ts">
import {
  ionCaretDown,
  ionCaretUp,
  ionDisc,
  ionEllipsisVertical,
  ionHeart,
  ionHeartOutline,
  ionLink,
  ionList,
  ionMusicalNote,
  ionPause,
  ionPerson,
  ionPlay,
  ionPlaySkipBack,
  ionPlaySkipForward,
  ionRepeat,
  ionShuffle,
  ionText,
  ionVolumeHigh,
  ionVolumeLow,
  ionVolumeMute,
} from '@quasar/extras/ionicons-v8';
import { copyToClipboard } from 'quasar';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { formatSeconds, notify } from 'src/utils/helpers';
import { Track } from 'src/utils/models';
import { usePlayerStore } from 'src/stores/player-store';
import TInteraction from '../Utilities/TInteraction.vue';
import SeekBar from './SeekBar.vue';
import NowPlayingDialog from './NowPlayingDialog.vue';

const player = usePlayerStore();
const router = useRouter();
const queueOpen = ref(false);
const panelTab = ref<'next' | 'lyrics'>('next');

/** Open the expanded player on a tab, or close it when that tab is showing and toggling. */
const openPanel = (tab: 'next' | 'lyrics', toggle = false) => {
  if (toggle && queueOpen.value && panelTab.value === tab) {
    queueOpen.value = false;
    return;
  }
  panelTab.value = tab;
  queueOpen.value = true;
};
const root = ref<HTMLElement>();
const height = ref(0);
let resize: ResizeObserver | null = null;

const track = computed<Track>(() => player.current || ({} as Track));

const trackLink = computed(() => ({
  name: 'artist.track',
  params: {
    artist_id: track.value.artist?.username || track.value.artist_id || '-',
    track_id: track.value.slug || '-',
  },
}));
const artistLink = computed(() => ({
  name: 'artist',
  params: { artist_id: track.value.artist?.username || '-' },
}));
const releaseLink = computed(() => ({
  name: 'artist.album',
  params: {
    artist_id: track.value.artist?.username || '-',
    album_id: track.value.release?.slug || '-',
  },
}));

const year = computed(() => {
  const date = track.value.release?.createdAt || track.value.createdAt;
  return date ? new Date(date).getFullYear() : null;
});

const volumeIcon = computed(() =>
  player.muted || player.volume === 0
    ? ionVolumeMute
    : player.volume < 50
      ? ionVolumeLow
      : ionVolumeHigh,
);

const repeatLabel = computed(
  () => ({ off: 'Repeat off', all: 'Repeat all', one: 'Repeat one' })[player.repeat],
);

const copyLink = async () => {
  const url = new URL(router.resolve(trackLink.value).href, window.location.origin).href;
  await copyToClipboard(url);
  notify('Link copied.', 'success');
};

onMounted(() => {
  player.attach();
  player.ensureQueue();

  // The up next panel opens just above the bar.
  resize = new ResizeObserver(() => (height.value = root.value?.offsetHeight ?? 0));
  if (root.value) resize.observe(root.value);
});

onBeforeUnmount(() => resize?.disconnect());
</script>

<style lang="scss" scoped>
.player-bar {
  &__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 8px;
    padding: 6px 12px 8px;

    @media (min-width: 600px) {
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: 16px;
      padding: 6px 16px 8px;
    }
  }

  &__transport,
  &__now,
  &__extras {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    min-width: 0;
  }

  // On phones the track sits first and the controls move to the right.
  &__transport {
    order: 2;
    @media (min-width: 600px) {
      order: 0;
    }
  }

  &__now {
    order: 1;
    gap: 12px;
    @media (min-width: 600px) {
      justify-content: center;
      order: 0;
    }
  }

  &__extras {
    justify-content: flex-end;
    order: 3;
  }
}

.explicit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  font-size: 10px;
  font-weight: 700;
  border-radius: 2px;
  color: #111;
  background: #bbb;
}

.repeat-one {
  position: absolute;
  right: 8px;
  bottom: 8px;
  font-size: 9px;
  font-weight: 700;
}

.volume {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;

  &__slider {
    width: 0;
    overflow: hidden;
    opacity: 0;
    transition: width 0.2s, opacity 0.2s;
  }

  &:hover &__slider,
  &:focus-within &__slider {
    width: 96px;
    padding: 0 8px;
    opacity: 1;
  }
}
</style>
