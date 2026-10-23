<template>
  <div class="grid grid-cols-5 px-4 py-4 gap-x-0 md:gap-x-5 md:grid-cols-8">
    <div class="flex items-center col-span-2">
      <q-item class="py-0 pl-0">
        <q-item-section avatar class="pr-2 min-w-10">
          <RouterLink
            :to="{
              name: 'artist.track',
              params: {
                artist_id: currentTrack.artist?.username || '-',
                track_id: currentTrack.slug || '-',
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
                  artist_id: currentTrack.artist?.username || '-',
                  track_id: currentTrack.slug || '-',
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
                params: { artist_id: currentTrack.artist?.username || '-' },
              }"
            >
              {{ currentTrack.artist?.name || 'Unknown' }}
            </RouterLink>
          </q-item-label>
        </q-item-section>

        <q-item-section side v-if="$q.screen.gt.xs">
          <TInteraction
            v-slot="{ submit, active }"
            type="like"
            label="Like"
            :active="currentTrack.liked"
            :base-url="`tracks/${currentTrack.id}`"
            :signature="`track:${currentTrack.id}`"
            @done="currentTrack.likes = $event.likes"
          >
            <VaButton
              size="medium"
              preset="plain"
              color="textPrimary"
              hover-opacity="0.05"
              @click="submit"
            >
              <q-icon
                color="white"
                :name="active ? ionHeart : ionHeartOutline"
                :fill="active"
              />
            </VaButton>
          </TInteraction>
        </q-item-section>
      </q-item>
    </div>
    <div class="grid grid-flow-col col-span-3 grid-rows-2 md:col-span-4">
      <div
        class="flex items-center justify-around col-span-2 gap-4 md:justify-center"
      >
        <VaButton
          size="large"
          class="!flex-none"
          preset="plain"
          color="textPrimary"
          hover-opacity="0.8"
          :text-opacity="shuffle ? 1 : 0.5"
          @click="shuffle = !shuffle"
        >
          <TIcon fill :name="ionShuffleOutline" />
        </VaButton>
        <VaButton
          size="large"
          class="!flex-none"
          preset="plain"
          color="textPrimary"
          hover-opacity="0.8"
          @click="skipper('<')"
        >
          <TIcon fill :name="ionPlaySkipBackOutline" />
        </VaButton>
        <q-btn
          round
          unelevated
          size="sm"
          color="glass"
          class="flex flex-row items-center justify-center white-glass !flex-none"
          @click="togglePlay(true)"
        >
          <TIcon
            fill
            size="sm"
            :name="playing ? ionPauseOutline : ionPlayOutline"
            color="white"
          />
        </q-btn>
        <VaButton
          size="large"
          class="!flex-none"
          preset="plain"
          color="textPrimary"
          hover-opacity="0.8"
          @click="skipper('>')"
        >
          <TIcon fill :name="ionPlaySkipForwardOutline" />
        </VaButton>
        <VaButton
          size="large"
          class="!flex-none"
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
import { CollabEvents, StopEventKeywords, Track } from 'src/utils/models';
import {
  ionRepeat,
  ionPlaySkipBackOutline,
  ionPlaySkipForwardOutline,
  ionPlayOutline,
  ionShuffleOutline,
  ionPauseOutline,
  ionHeart,
  ionHeartOutline,
} from '@quasar/extras/ionicons-v8';
import { Howl, Howler } from 'howler';
import { useGlobalStore } from 'src/stores/global-store';
import { ref, computed, onBeforeUnmount, onMounted, inject } from 'vue';
import { formatSeconds, notify } from 'src/utils/helpers';
import { EventBus, useInterval } from 'quasar';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import {
  loadPlaylistRequest,
  loadTrackRequest,
} from 'src/utils/requests/requests';
import TInteraction from '../Utilities/TInteraction.vue';

let sound: Howl;
const bus = inject<EventBus<CollabEvents>>('bus');
const boot = useBootstrapStore();
const system = useGlobalStore();

const mute = computed({
  get: () => system.mute,
  set: (v) => (system.mute = v),
});
const volume = computed({
  get: () => system.volume,
  set: (v) => (system.volume = v),
});
const shuffle = ref(false);
const playing = ref(false);
const progress = ref();
const position = ref(0);
const duration = ref(0);
const currentTrack = computed<Track>({
  get: () => system.currentTrack || ({} as unknown as Track),
  set: (v) => (system.currentTrack = v),
});

const onSeek = (pos: number) => {
  sound.seek((pos / 100) * sound.duration());
  position.value = sound.seek();
};

const buildPlaylist = (
  track?: Track | Track[] | null | undefined,
  play: boolean = false,
) => {
  if (track) {
    system.addToPlaylist(track);
    currentTrack.value = Array.isArray(track) ? track[0] : track;
    if (Array.isArray(track)) {
      system.playlist.id = 0;
    }
  }

  initialize(play);
};

const skipper = async (
  dir: '<' | '>',
  skip: boolean = false,
): Promise<void> => {
  const playlist = system.playlist;
  if (shuffle.value) {
    playlist.shuffle();
  }

  const curr = playlist.find((e) => e.value.id === currentTrack.value.id);

  if (skip) {
    if (system.playMode === 'loop') {
      return skipper(dir);
    } else if (system.playMode === 'all' && curr?.next) {
      currentTrack.value = curr.next.value as Track;
    } else {
      const { data } = await loadPlaylistRequest({
        randomize: true,
        with: 'artist',
      }).send();
      return buildPlaylist(data, true);
    }
  } else {
    const trk = dir === '>' ? curr?.next?.value : curr?.prev?.value;
    currentTrack.value = trk || (playlist.head?.value as Track);
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

bus?.on('justTogglePlay', (state, origin) => {
  if (origin !== 'player') {
    state ? sound.play() : sound.pause();
  }
});

const { registerInterval, removeInterval } = useInterval();

const loading = ref(false);
const initialize = async (play: boolean = false): Promise<Howl | void> => {
  if (!system.playlist.size) {
    return;
  }

  if (sound) {
    sound.unload();
    Howler.unload();
  }

  loading.value = true;

  if (!currentTrack.value.streamUrl) {
    currentTrack.value = await loadTrackRequest(String(currentTrack.value.id), {
      with: 'streamUrl,artist',
      mode: 'play',
    }).send();
  }

  loading.value = false;

  // Tracks from a paid release don't stream until the listener buys it.
  if (!currentTrack.value.streamUrl) {
    playing.value = false;
    if (!play) return;
    notify(
      currentTrack.value.locked
        ? `"${currentTrack.value.title}" is part of a paid release. Buy it to listen.`
        : 'This track can\'t be played right now.',
      'info',
    );
    bus?.emit('stop', 0, currentTrack.value);
    return;
  }

  const fileUrl = currentTrack.value.streamUrl;

  sound = new Howl({
    src: [fileUrl],
    mute: system.mute,
    pool: 1,
    loop: system.playMode === 'single',
    html5: true,
    format: currentTrack.value.format || 'mp3',
    xhr: {
      headers: {
        Authorization: 'Bearer ' + boot.token,
      },
      withCredentials: true,
    },
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
  });

  // Reload the sound
  if (sound.state() === 'unloaded') sound.load();

  sound.once('load', () => {
    if (play) {
      Howler.volume(volume.value / 100);
      sound.play();
    }
    duration.value = sound.duration();
  });

  // Stop the interval watcher
  const evts: StopEventKeywords[] = ['stop', 'pause', 'end'];
  evts.forEach((event) => {
    sound.on(event, () => {
      removeInterval();
      playing.value = false;
      position.value = sound.seek();
      progress.value = (sound.seek() / sound.duration()) * 100;
      event === 'end' && skipper('>', true);
      bus?.emit(event, position.value, currentTrack.value, fileUrl);
    });
  });

  return new Promise((resolve) => {
    resolve(sound);
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
