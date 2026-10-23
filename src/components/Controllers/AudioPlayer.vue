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
          :text-opacity="player.shuffle ? 1 : 0.5"
          :aria-label="player.shuffle ? 'Turn shuffle off' : 'Turn shuffle on'"
          @click="player.toggleShuffle()"
        >
          <TIcon fill :name="ionShuffleOutline" />
        </VaButton>
        <VaButton
          size="large"
          class="!flex-none"
          preset="plain"
          color="textPrimary"
          hover-opacity="0.8"
          aria-label="Previous track"
          @click="player.previous()"
        >
          <TIcon fill :name="ionPlaySkipBackOutline" />
        </VaButton>
        <q-btn
          round
          unelevated
          size="sm"
          color="glass"
          class="flex flex-row items-center justify-center white-glass !flex-none"
          :aria-label="player.playing ? 'Pause' : 'Play'"
          :disable="!currentTrack.id"
          @click="player.toggle()"
        >
          <q-spinner size="1rem" color="white" v-if="player.loading" />
          <TIcon
            fill
            size="sm"
            :name="player.playing ? ionPauseOutline : ionPlayOutline"
            color="white"
            v-else
          />
        </q-btn>
        <VaButton
          size="large"
          class="!flex-none"
          preset="plain"
          color="textPrimary"
          hover-opacity="0.8"
          aria-label="Next track"
          @click="player.next()"
        >
          <TIcon fill :name="ionPlaySkipForwardOutline" />
        </VaButton>
        <VaButton
          size="large"
          class="!flex-none"
          preset="plain"
          color="textPrimary"
          hover-opacity="0.8"
          :text-opacity="player.repeat === 'off' ? 0.5 : 1"
          :aria-label="`Repeat: ${player.repeat}`"
          @click="player.cycleRepeat()"
        >
          <TIcon
            fill
            :class="{ 'repeat-icon single': player.repeat === 'one' }"
            :name="ionRepeat"
          />
        </VaButton>
      </div>
      <!-- ... -->
      <div class="flex items-center justify-center col-span-2 px-5">
        <div class="!flex-none mr-3 text-sm">
          {{ formatSeconds(player.position) }}
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
            :model-value="player.progress"
            @update:model-value="player.seekPercent"
          />
        </div>
        <div class="!flex-none ml-3 text-sm">{{ formatSeconds(player.duration) }}</div>
      </div>
    </div>
    <div class="items-center justify-end hidden col-span-2 pl-6 md:!flex">
      <div class="flex-none mr-3">
        <VaButton
          size="medium"
          preset="plain"
          :aria-label="player.muted ? 'Unmute' : 'Mute'"
          @click="player.toggleMute()"
        >
          <TIcon
            :name="`eva-${!player.muted && player.volume > 0 ? 'volume-up' : 'volume-mute'}`"
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
          :model-value="player.muted ? 0 : player.volume"
          @update:model-value="player.setVolume"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import TIcon from '../icons/TIcon.vue';
import { Track } from 'src/utils/models';
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
import { computed, onMounted } from 'vue';
import { formatSeconds } from 'src/utils/helpers';
import { usePlayerStore } from 'src/stores/player-store';
import TInteraction from '../Utilities/TInteraction.vue';

const player = usePlayerStore();

const currentTrack = computed<Track>(() => player.current || ({} as Track));

onMounted(() => {
  player.attach();
  player.ensureQueue();
});
</script>
