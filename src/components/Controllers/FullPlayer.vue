<template>
  <!-- The full-screen player on phones. Android's back button closes it like any dialog. -->
  <!--
    Seamless: it covers the screen anyway, and it leaves focus alone for the
    Up next sheet. No refocus, so closing it leaves no focus ring behind.
  -->
  <q-dialog seamless maximized no-refocus transition-show="slide-up" transition-hide="slide-down" v-model="open">
    <div class="full-player">
      <div class="full-player__backdrop" :style="{ backgroundImage: track.imageUrl ? `url(${track.imageUrl})` : undefined }" />

      <header class="full-player__head">
        <IconBtn icon="lucide-chevron-down" aria-label="Close the player" class="flex-none!" @click="open = false" />
        <div class="text-xs font-semibold tracking-wider uppercase text-grey-4">Now playing</div>
        <IconBtn icon="lucide-ellipsis-vertical" aria-label="More" class="flex-none!" :disable="!track.id">
          <q-menu dark anchor="bottom right" self="top right">
            <q-list dense class="min-w-48">
              <q-item clickable v-close-popup :to="trackLink" @click="open = false">
                <q-item-section avatar><q-icon name="lucide-music-2" /></q-item-section>
                <q-item-section>Go to song</q-item-section>
              </q-item>
              <q-item clickable v-close-popup :to="artistLink" @click="open = false" v-if="track.artist">
                <q-item-section avatar><q-icon name="lucide-user" /></q-item-section>
                <q-item-section>Go to artist</q-item-section>
              </q-item>
              <q-item clickable v-close-popup :to="releaseLink" @click="open = false" v-if="track.release">
                <q-item-section avatar><q-icon name="lucide-disc-3" /></q-item-section>
                <q-item-section>Go to album</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </IconBtn>
      </header>

      <div class="full-player__art">
        <q-img no-spinner :ratio="1" class="rounded-2xl shadow-2xl bg-gray-800" :src="track.imageUrl" />
      </div>

      <!-- The line being sung, one at a time, when the lyrics are synced -->
      <!--
        Synced lyrics, three lines tall, following the song. Scroll it to read ahead;
        it follows again a few seconds later. Tapping a line plays from it.
      -->
      <div
        ref="lyricBox"
        class="full-player__lyrics"
        aria-label="Lyrics"
        @touchmove.passive="holdLyrics"
        @wheel.passive="holdLyrics"
        v-if="lyrics?.synced"
      >
        <button
          type="button"
          class="full-player__line"
          :class="{ 'full-player__line--active': i === lyricIndex }"
          :key="i"
          :ref="(el) => (lyricEls[i] = el as HTMLElement)"
          @click="line.start !== null && player.seek(line.start)"
          v-for="(line, i) in lyrics.lines"
        >
          {{ line.text || '♪' }}
        </button>
      </div>

      <div class="flex items-center gap-3 flex-nowrap!">
        <div class="flex-1 min-w-0">
          <div class="text-xl font-bold truncate">{{ track.title || 'Nothing playing' }}</div>
          <div class="truncate text-grey-4">
            <RouterLink :to="artistLink" @click="open = false" v-if="track.artist">{{ track.artist.name }}</RouterLink>
            <template v-if="track.release?.title">
              <span class="mx-1">•</span>
              <RouterLink :to="releaseLink" @click="open = false">{{ track.release.title }}</RouterLink>
            </template>
          </div>
        </div>
        <TInteraction
          v-slot="{ submit, active }"
          type="like"
          label="Like"
          :active="track.liked"
          :base-url="`tracks/${track.id}`"
          :signature="`track:${track.id}`"
          @done="track.likes = $event.likes"
          v-if="track.id"
        >
          <IconBtn
            class="flex-none!"
            :aria-label="active ? 'Unlike' : 'Like'"
            :icon="active ? 'lucide-heart:fill' : 'lucide-heart'"
            :color="active ? 'toneflix' : undefined"
            @click="submit"
          />
        </TInteraction>
      </div>

      <div>
        <SeekBar :position="player.position" :duration="player.duration" :buffered="player.buffered" @seek="player.seek" />
        <div class="flex justify-between mt-1 text-xs text-grey-5 tabular-nums">
          <span class="flex-none!">{{ formatSeconds(player.position) }}</span>
          <span class="flex-none!">{{ formatSeconds(player.duration) }}</span>
        </div>
      </div>

      <div class="full-player__transport">
        <IconBtn
          icon="lucide-shuffle"
          :class="{ 'text-toneflix': player.shuffle }"
          :aria-label="player.shuffle ? 'Turn shuffle off' : 'Turn shuffle on'"
          @click="player.toggleShuffle()"
        />
        <IconBtn icon="lucide-skip-back:fill" aria-label="Previous track" @click="player.previous()" />
        <q-btn
          round
          unelevated
          color="white"
          text-color="dark"
          class="full-player__play"
          :aria-label="player.playing ? 'Pause' : 'Play'"
          :disable="!track.id"
          @click="player.toggle()"
        >
          <q-spinner size="30px" color="dark" v-if="player.loading" />
          <q-icon size="32px" :name="player.playing ? 'lucide-pause:fill' : 'lucide-play:fill'" v-else />
        </q-btn>
        <IconBtn icon="lucide-skip-forward:fill" aria-label="Next track" @click="player.next()" />
        <IconBtn
          :icon="player.repeat === 'one' ? 'lucide-repeat-1' : 'lucide-repeat'"
          :class="{ 'text-toneflix': player.repeat !== 'off' }"
          :aria-label="`Repeat: ${player.repeat}`"
          @click="player.cycleRepeat()"
        />
      </div>

      <div class="flex justify-center gap-2">
        <q-btn flat rounded no-caps icon="lucide-list" label="Up next" class="flex-none! text-grey-3" @click="showList('next')" />
        <q-btn flat rounded no-caps icon="lucide-type" label="Lyrics" class="flex-none! text-grey-3" @click="showList('lyrics')" />
      </div>

      <!-- In the layer above dialogs, so it docks to the bottom of the screen over the player -->
      <AppSheet above-dialogs :snap-points="['60%', '92%']" v-model="listOpen">
        <!-- In the content, not the drag handle's header, so tapping a tab always switches -->
        <q-tabs
          dense
          no-caps
          align="left"
          active-color="white"
          indicator-color="toneflix"
          class="full-player__tabs text-grey-5"
          v-model="tab"
        >
          <q-tab name="next" label="Up next" />
          <q-tab name="lyrics" label="Lyrics" />
        </q-tabs>
        <SyncedLyrics :track-id="track.id" :position="player.position" @seek="player.seek" v-if="tab === 'lyrics'" />
        <QueueList @navigate="open = false" v-else />
      </AppSheet>
    </div>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { activeLine, loadTrackLyricsRequest, type Lyrics } from 'src/utils/requests/lyrics';
import { formatSeconds } from 'src/utils/helpers';
import { Track } from 'src/utils/models';
import { usePlayerStore } from 'src/stores/player-store';
import TInteraction from '../Utilities/TInteraction.vue';
import AppSheet from './AppSheet.vue';
import QueueList from './QueueList.vue';
import SeekBar from './SeekBar.vue';
import SyncedLyrics from './SyncedLyrics.vue';

const open = defineModel<boolean>({ default: false });

const player = usePlayerStore();
const track = computed<Track>(() => player.current || ({} as Track));

/** The song's lyrics, for the line under the artwork. Loaded while the player is open. */
const lyrics = ref<Lyrics | null>(null);
let loadedFor: string | null = null;
watch(
  () => (open.value ? track.value.id : null),
  async (id) => {
    if (!id || String(id) === loadedFor) return;
    loadedFor = String(id);
    lyrics.value = null;
    try {
      const data = await loadTrackLyricsRequest(id).send();
      if (String(id) === String(track.value.id)) lyrics.value = data;
    } catch {
      lyrics.value = null;
    }
  },
  { immediate: true },
);
const lyricIndex = computed(() => (lyrics.value?.synced ? activeLine(lyrics.value.lines, player.position) : -1));

const lyricBox = ref<HTMLElement>();
const lyricEls: HTMLElement[] = [];
/** Until when the lyrics stay where the listener scrolled them. */
let heldUntil = 0;
let resume: ReturnType<typeof setTimeout> | undefined;

/** Puts a line in the middle of the box, scrolling only the box. */
const centreLyric = async (index: number, smooth = true) => {
  if (index < 0 || Date.now() < heldUntil) return;
  await nextTick();
  const box = lyricBox.value;
  const line = lyricEls[index];
  if (!box || !line) return;
  box.scrollTo({ top: line.offsetTop - (box.clientHeight - line.offsetHeight) / 2, behavior: smooth ? 'smooth' : 'auto' });
};

/** The listener is scrolling: stop following for a few seconds. */
const holdLyrics = () => {
  heldUntil = Date.now() + 4000;
  clearTimeout(resume);
  resume = setTimeout(() => void centreLyric(lyricIndex.value), 4100);
};

watch(lyricIndex, (index) => void centreLyric(index));
// New lyrics, or the player opening: jump straight to the line being sung
watch([lyrics, open], () => {
  lyricEls.length = 0;
  heldUntil = 0;
  void centreLyric(lyricIndex.value, false);
});
onBeforeUnmount(() => clearTimeout(resume));

const listOpen = ref(false);
const tab = ref<'next' | 'lyrics'>('next');
const showList = (which: 'next' | 'lyrics') => {
  tab.value = which;
  listOpen.value = true;
};

const trackLink = computed(() => ({
  name: 'artist.track',
  params: { artist_id: track.value.artist?.username || track.value.artistId || '-', track_id: track.value.slug },
}));
const artistLink = computed(() => ({ name: 'artist', params: { artist_id: track.value.artist?.username || '-' } }));
const releaseLink = computed(() => ({
  name: 'artist.album',
  params: { artist_id: track.value.artist?.username || '-', album_id: track.value.release?.slug || '-' },
}));
</script>

<style lang="scss" scoped>
.full-player {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 20px;
  width: 100vw;
  height: 100dvh;
  /* Clip, not hidden: nothing can scroll the player, even by scrolling something into view */
  overflow: clip;
  /* Clear of the camera cutout and the gesture bar, now the app runs full screen */
  padding: max(var(--q-safe-area-inset-top, 0px), var(--tf-cutout-bottom, 0px)) 24px
    calc(16px + var(--q-safe-area-inset-bottom, 0px));
  color: #fff;
  background: var(--tf-bg);

  > * {
    position: relative;
  }

  &__backdrop {
    position: absolute !important;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: blur(70px) saturate(1.4);
    opacity: 0.5;
    transform: scale(1.4);

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, rgba(10, 12, 16, 0.2), var(--tf-bg) 85%);
    }
  }

  &__head {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    margin: 0 -8px;
    padding-top: 4px;
  }

  &__art {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    justify-content: center;
    min-height: 0;

    .q-img {
      width: min(100%, 420px, 46dvh);
    }
  }

  /* Three lines tall; the edges fade so the lines above and below read as context */
  &__lyrics {
    --line: 1.9rem;

    position: relative;
    flex: none;
    height: calc(var(--line) * 3);
    padding: var(--line) 0;
    overflow-y: auto;
    scrollbar-width: none;
    overscroll-behavior: contain;
    mask-image: linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent);

    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__line {
    display: block;
    width: 100%;
    min-height: var(--line);
    padding: 0 8px;
    border: 0;
    background: none;
    color: rgba(255, 255, 255, 0.45);
    font: inherit;
    font-size: 1.05rem;
    font-weight: 700;
    line-height: 1.35;
    text-align: center;
    text-wrap: balance;
    cursor: pointer;
    transition:
      color 0.25s ease,
      transform 0.25s ease;

    &--active {
      color: #fff;
      transform: scale(1.04);
    }
  }

  &__transport {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;

    :deep(.q-icon) {
      font-size: 24px;
    }
  }

  &__play {
    width: 68px;
    height: 68px;
  }
}

/* Tabs stay at the top of the sheet while the list scrolls */
.full-player__tabs {
  position: sticky;
  top: -8px;
  z-index: 1;
  margin: -8px -16px 4px;
  padding-top: 4px;
  background: var(--tf-surface-1);
  border-bottom: 1px solid var(--tf-border);
}
</style>
