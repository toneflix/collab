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
        <IconBtn
          class="flex-none! max-sm:hidden!"
          aria-label="Previous track"
          icon="lucide-skip-back:fill"
          @click="player.previous()"
        />
        <q-btn
          round
          unelevated
          size="md"
          color="glass"
          class="flex-none! mx-1 white-glass"
          :aria-label="player.playing ? 'Pause' : 'Play'"
          :disable="!track.id"
          @click="player.toggle()"
        >
          <q-spinner size="24px" color="white" v-if="player.loading" />
          <q-icon size="26px" :name="player.playing ? 'lucide-pause:fill' : 'lucide-play:fill'" v-else />
        </q-btn>
        <IconBtn
          class="flex-none!"
          aria-label="Next track"
          icon="lucide-skip-forward:fill"
          @click="player.next()"
        />
        <div class="ml-2 text-xs whitespace-nowrap text-grey-5 flex-none! max-md:hidden!">
          {{ formatSeconds(player.position) }} / {{ formatSeconds(player.duration) }}
        </div>
      </div>

      <!-- Now playing: artwork, title, artist and actions -->
      <div class="player-bar__now">
        <!-- Phones: the whole track area opens the full-screen player -->
        <button
          type="button"
          class="player-bar__open sm:hidden!"
          aria-label="Open the player"
          @click="fullOpen = true"
          v-if="track.id"
        />
        <RouterLink :to="trackLink" class="flex-none!" v-if="track.id">
          <q-img
            no-spinner
            class="rounded bg-gray-700"
            width="44px"
            height="44px"
            :src="track.imageUrl"
          />
        </RouterLink>

        <div class="min-w-0 flex-auto! md:flex-initial!">
          <RouterLink :to="trackLink" class="block font-bold truncate">
            {{ track.title || 'Nothing playing' }}
          </RouterLink>
          <div class="flex items-center gap-1 text-sm truncate text-grey-5 no-wrap">
            <span
              class="explicit flex-none!"
              title="Explicit"
              v-if="track.explicit"
            >E</span>
            <span class="truncate">
              <RouterLink :to="trackLink" class="hover:underline" v-if="track.project">
                {{ track.project.title }}
              </RouterLink>
              <RouterLink :to="artistLink" class="hover:underline" v-else-if="track.artist">
                {{ track.artist.name }}
              </RouterLink>
              <FeaturedArtists :track="track" /><AlbumLink :track="track" />
              <template v-if="year"> • {{ year }}</template>
            </span>
          </div>
        </div>

        <div class="flex items-center flex-none! no-wrap max-sm:hidden!" v-if="track.id">
          <TInteraction
            v-slot="{ submit, active }"
            type="like"
            label="Like"
            :active="track.liked"
            :base-url="`tracks/${track.id}`"
            :signature="`track:${track.id}`"
            @done="track.likes = $event.likes"
            v-if="!track.temporary"
          >
            <IconBtn
              class="flex-none!"
              :aria-label="active ? 'Unlike' : 'Like'"
              :icon="active ? 'lucide-heart:fill' : 'lucide-heart'"
              :color="active ? 'toneflix' : undefined"
              @click="submit"
            />
          </TInteraction>

          <IconBtn class="flex-none!" aria-label="More" icon="lucide-ellipsis-vertical">
            <q-menu dark anchor="top middle" self="bottom middle" :offset="[0, 8]">
              <TrackMenuList class="min-w-60" :track="track">
                <TrackMenuItem
                  icon="lucide-music-2"
                  :label="track.project ? 'Go to project' : 'Go to song'"
                  :to="trackLink"
                />
                <TrackMenuItem icon="lucide-list" label="Up next" @click="openPanel('next')" />
                <TrackMenuItem icon="lucide-type" label="Lyrics" @click="openPanel('lyrics')" />
              </TrackMenuList>
            </q-menu>
          </IconBtn>
        </div>
      </div>

      <!-- Volume, repeat, shuffle and the queue -->
      <div class="player-bar__extras">
        <div class="volume max-md:hidden!">
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
          <IconBtn
            class="flex-none!"
            :aria-label="player.muted ? 'Unmute' : 'Mute'"
            :icon="volumeIcon"
            @click="player.toggleMute()"
          />
        </div>
        <q-btn
          flat
          round
          size="md"
          class="flex-none! max-sm:hidden!"
          :class="{ 'text-toneflix': player.repeat !== 'off' }"
          :aria-label="`Repeat: ${player.repeat}`"
          @click="player.cycleRepeat()"
        >
          <q-icon :name="player.repeat === 'one' ? 'lucide-repeat-1' : 'lucide-repeat'" />
          <q-tooltip>{{ repeatLabel }}</q-tooltip>
        </q-btn>
        <IconBtn
          class="flex-none! max-sm:hidden!"
          :class="{ 'text-toneflix': player.shuffle }"
          :aria-label="player.shuffle ? 'Turn shuffle off' : 'Turn shuffle on'"
          icon="lucide-shuffle"
          @click="player.toggleShuffle()"
        >
          <q-tooltip>{{ player.shuffle ? 'Shuffle on' : 'Shuffle off' }}</q-tooltip>
        </IconBtn>
        <IconBtn
          class="flex-none!"
          :aria-label="$q.screen.lt.sm ? 'Open the player' : queueOpen ? 'Close up next' : 'Open up next'"
          :icon="queueOpen ? 'lucide-chevron-down' : 'lucide-chevron-up'"
          @click="$q.screen.lt.sm ? (fullOpen = true) : (queueOpen = !queueOpen)"
        />
      </div>
    </div>

    <NowPlayingDialog v-model="queueOpen" v-model:tab="panelTab" :offset="height" />
    <FullPlayer v-model="fullOpen" />
  </div>
</template>

<script setup lang="ts">
import TrackMenuList from 'src/components/Tracks/TrackMenuList.vue';
import TrackMenuItem from 'src/components/Tracks/TrackMenuItem.vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { formatSeconds } from 'src/utils/helpers';
import { Track } from 'src/utils/models';
import { usePlayerStore } from 'src/stores/player-store';
import TInteraction from '../Utilities/TInteraction.vue';
import SeekBar from './SeekBar.vue';
import NowPlayingDialog from './NowPlayingDialog.vue';
import FullPlayer from './FullPlayer.vue';
import AlbumLink from 'src/components/Tracks/AlbumLink.vue';
import FeaturedArtists from 'src/components/Tracks/FeaturedArtists.vue';

const player = usePlayerStore();
const queueOpen = ref(false);
/** The full-screen player, on phones */
const fullOpen = ref(false);
const panelTab = ref<'next' | 'lyrics'>('next');

/** Open the expanded player on a tab. */
const openPanel = (tab: 'next' | 'lyrics') => {
  panelTab.value = tab;
  queueOpen.value = true;
};
const root = ref<HTMLElement>();
const height = ref(0);
let resize: ResizeObserver | null = null;

/**
 * The queue is restored from browser storage, which the server never sees, so
 * the track waits for mount to keep hydration in line with the server render.
 */
const hydrated = ref(false);
const track = computed<Track>(() => (hydrated.value && player.current) || ({} as Track));

const trackLink = computed(() =>
  track.value.project
    ? { name: 'project', params: { project_id: track.value.project.slug } }
    : {
        name: 'artist.track',
        params: {
          artist_id: track.value.artist?.username || track.value.artistId || '-',
          track_id: track.value.slug || '-',
        },
      },
);
const artistLink = computed(() => ({
  name: 'artist',
  params: { artist_id: track.value.artist?.username || '-' },
}));

const year = computed(() => {
  const date = track.value.release?.createdAt || track.value.createdAt;
  return date ? new Date(date).getFullYear() : null;
});

const volumeIcon = computed(() =>
  player.muted || player.volume === 0
    ? 'lucide-volume-x'
    : player.volume < 50
      ? 'lucide-volume-1'
      : 'lucide-volume-2',
);

const repeatLabel = computed(
  () => ({ off: 'Repeat off', all: 'Repeat all', one: 'Repeat one' })[player.repeat],
);

onMounted(() => {
  hydrated.value = true;
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

  /* Phones: an invisible button over the track area that opens the full player */
  &__open {
    position: absolute;
    inset: 0;
    z-index: 1;
    padding: 0;
    border: 0;
    background: transparent;
    cursor: pointer;
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
    position: relative;
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
