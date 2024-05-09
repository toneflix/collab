<template>
  <div class="grid grid-cols-5 px-4 py-4 gap-x-0 md:gap-x-5 md:grid-cols-8">
    <div class="flex items-center col-span-2">
      <q-item class="py-0 pl-0">
        <q-item-section avatar class="pr-2 min-w-10">
          <RouterLink
            :to="{
              name: 'artist.track',
              params: {
                artist_id: currentTrack.artist?.username,
                track_id: currentTrack.slug,
              },
            }"
          >
            <q-avatar rounded>
              <q-img
                no-spinner
                class="bg-gray-400"
                loading="eager"
                :src="currentTrack.imageUrl"
                :ratio="1 / 1"
              />
            </q-avatar>
          </RouterLink>
        </q-item-section>

        <q-item-section>
          <q-item-label lines="1" class="text-sm font-bold">
            <RouterLink
              :to="{
                name: 'artist.track',
                params: {
                  artist_id: currentTrack.artist?.username,
                  track_id: currentTrack.slug,
                },
              }"
            >
              {{ currentTrack.title }}
            </RouterLink>
          </q-item-label>
          <q-item-label caption lines="1" class="mt-0">
            <RouterLink
              :to="{
                name: 'artist',
                params: { artist_id: currentTrack.artist?.username },
              }"
            >
              {{ currentTrack.artist?.name || 'Unknown' }}
            </RouterLink>
          </q-item-label>
        </q-item-section>

        <q-item-section side v-if="$q.screen.gt.xs">
          <VaButton
            size="medium"
            preset="plain"
            @click="currentTrack.loved = !currentTrack.loved"
          >
            <TIcon name="eva-heart" color="white" :fill="currentTrack.loved" />
          </VaButton>
        </q-item-section>
      </q-item>
    </div>
    <div class="grid grid-flow-col col-span-3 grid-rows-2 md:col-span-4">
      <div
        class="flex items-center justify-around col-span-2 gap-4 md:justify-center"
      >
        <div class="!flex-none">
          <VaButton
            size="large"
            preset="plain"
            color="textPrimary"
            hover-opacity="0.8"
            :text-opacity="shuffle ? 1 : 0.5"
            @click="shuffle = !shuffle"
          >
            <TIcon fill :name="ionShuffleOutline" />
          </VaButton>
        </div>
        <div class="!flex-none">
          <VaButton
            size="large"
            preset="plain"
            color="textPrimary"
            hover-opacity="0.8"
            @click="skipper('<')"
          >
            <TIcon fill :name="ionPlaySkipBackOutline" />
          </VaButton>
        </div>
        <div class="!flex-none">
          <q-btn
            round
            unelevated
            size="sm"
            color="glass"
            class="flex flex-row items-center justify-center"
            @click="togglePlay(true)"
          >
            <TIcon
              fill
              size="sm"
              :name="playing ? ionPauseOutline : ionPlayOutline"
              color="white"
            />
          </q-btn>
        </div>
        <div class="!flex-none">
          <VaButton
            size="large"
            preset="plain"
            color="textPrimary"
            hover-opacity="0.8"
            @click="skipper('>')"
          >
            <TIcon fill :name="ionPlaySkipForwardOutline" />
          </VaButton>
        </div>
        <div class="!flex-none">
          <VaButton
            size="large"
            preset="plain"
            color="textPrimary"
            hover-opacity="0.8"
            :text-opacity="system.playMode === 'all' ? 0.5 : 1"
            @click="
              system.setPlayMode(), sound.loop(system.playMode === 'single')
            "
          >
            <TIcon
              fill
              :class="`repeat-icon ${system.playMode}`"
              :name="ionRepeat"
            />
          </VaButton>
        </div>
      </div>
      <!-- ... -->
      <div class="flex items-center justify-center col-span-2 px-5">
        <div class="!flex-none mr-3 text-sm">
          {{ formatSeconds(position) }}
        </div>
        <div class="flex items-center flex-1">
          <VaSlider
            color="primary"
            track-color="#9E9E9E"
            style="
              --va-slider-horizontal-track-height: 0.2rem;
              --va-slider-track-opacity: 0.5;
              --va-slider-handler-width: 0;
              --va-slider-handler-height: 0;
              --va-slider-dot-opacity: 0;
            "
            v-model="progress"
            @update:model-value="onSeek"
          />
        </div>
        <div class="!flex-none ml-3 text-sm">{{ formatSeconds(duration) }}</div>
      </div>
    </div>
    <div class="items-center justify-end hidden col-span-2 pl-6 md:!flex">
      <div class="flex-none mr-3">
        <VaButton
          size="medium"
          preset="plain"
          @click="(mute = !mute), Howler.mute(mute)"
        >
          <TIcon
            :name="`eva-${!mute && volume > 0 ? 'volume-up' : 'volume-mute'}`"
            color="white"
            fill
          />
        </VaButton>
      </div>
      <div class="flex-1">
        <VaSlider
          color="primary"
          track-color="#9E9E9E"
          style="
            --va-slider-horizontal-track-height: 0.2rem;
            --va-slider-track-opacity: 0.5;
            --va-slider-handler-width: 0;
            --va-slider-handler-height: 0;
            --va-slider-dot-opacity: 0;
          "
          v-model="volume"
          @update:modelValue="Howler.volume(volume / 100)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TIcon from '../icons/TIcon.vue';
import { CollabEvents, Track } from 'src/utils/models';
import {
  ionRepeat,
  ionPlaySkipBackOutline,
  ionPlaySkipForwardOutline,
  ionPlayOutline,
  ionShuffleOutline,
  ionPauseOutline,
} from '@quasar/extras/ionicons-v7';
import { trackList } from 'src/utils/dummy';
import { Howl, Howler } from 'howler';
import { useGlobalStore } from 'src/stores/global-store';
import { ref, computed, onBeforeUnmount, onMounted, inject } from 'vue';
import { formatSeconds } from 'src/utils/helpers';
import { EventBus, useInterval } from 'quasar';

let sound: Howl;
const bus = inject<EventBus<CollabEvents>>('bus');
const mute = ref(false);
const system = useGlobalStore();
const volume = computed({
  get: () => system.volume,
  set: (v) => (system.volume = v),
});
const shuffle = ref(false);
const playing = ref(false);
const progress = ref(0);
const position = ref(0);
const duration = ref(0);
const currentTrack = ref<Track>(
  trackList.value[Math.floor(Math.random() * trackList.value.length)],
);

const onSeek = (pos: number) => {
  sound.seek((pos / 100) * sound.duration());
  position.value = sound.seek();
};

const buildPlaylist = (
  track?: Track | Track[] | null | undefined,
  play: boolean = false,
) => {
  system.addToPlaylist(track || trackList.value);
  if (track) {
    currentTrack.value = Array.isArray(track) ? track[0] : track;
  } else {
    currentTrack.value = trackList.value[0];
  }

  initialize(play);
};

const skipper = (dir: '<' | '>', skip: boolean = false) => {
  const tracks = system.playlist.tracks;
  if (shuffle.value) {
    tracks.sort(() => Math.random() - 0.5);
  }

  const i = tracks.findIndex((e) => e.id === currentTrack.value.id);

  if (skip) {
    if (system.playMode === 'loop') {
      skipper(dir);
    } else if (system.playMode === 'all' && i + 1 < tracks.length) {
      currentTrack.value = tracks[i + 1];
    } else {
      // TODO:  Refresh the track list
    }
  } else {
    currentTrack.value = tracks[dir === '>' ? i + 1 : i - 1] || tracks[0];
  }
  initialize(true);
};

const togglePlay = (emit: boolean = false) => {
  if (sound.playing()) {
    sound.pause();
  } else {
    Howler.volume(volume.value / 100);
    sound.play();
    sound.loop(system.playMode === 'single');
  }

  playing.value = sound.playing();

  if (emit) {
    bus?.emit(
      'togglePlay',
      playing.value,
      currentTrack.value,
      undefined,
      'player',
    );
  }
};

bus?.on('togglePlay', (state, track, album, origin) => {
  if (origin !== 'player') {
    if (track.id === currentTrack.value.id) {
      state ? sound.play() : sound.pause();
      currentTrack.value = track;
    } else {
      buildPlaylist(track, true);
    }
  }
});

const { registerInterval, removeInterval } = useInterval();

const initialize = (play: boolean = false) => {
  if (!system.playlist.tracks.length) {
    return;
  }

  if (sound) {
    sound.unload();
  }

  const fileUrl = currentTrack.value.streamUrl;

  sound = new Howl({
    src: [fileUrl],
    volume: volume.value / 100,
    onplay: () => {
      playing.value = true;
      position.value = sound.seek();
      duration.value = sound.duration();
      registerInterval(() => {
        position.value = sound.seek();
        progress.value = (sound.seek() / sound.duration()) * 100;
        bus?.emit('seeking', position.value, currentTrack.value, fileUrl);
      }, 200);
    },
    onload: () => {
      duration.value = sound.duration();
    },
  });

  if (play) {
    if (sound.state() === 'unloaded') {
      sound.load();
    }
    Howler.volume(volume.value / 100);
    sound.play();
    sound.loop(system.playMode === 'single');
  }

  // Stop the interval watcher
  ['stop', 'pause', 'end'].forEach((event) => {
    sound.on(event, () => {
      removeInterval();
      playing.value = false;
      position.value = sound.seek();
      progress.value = (sound.seek() / sound.duration()) * 100;

      event === 'end' && skipper('>', true);
    });
  });
};

onMounted(() => {
  buildPlaylist();
});

onBeforeUnmount(() => {
  sound?.unload();
  removeInterval();
});
</script>
