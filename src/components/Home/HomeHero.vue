<template>
  <section class="home-hero">
    <div class="home-hero__glow" aria-hidden="true"></div>

    <div class="relative grid items-center gap-10 md:grid-cols-2">
      <div>
        <div class="home-hero__eyebrow">
          <span class="home-hero__bars" aria-hidden="true">
            <i :key="bar" v-for="bar in 4"></i>
          </span>
          {{ signedIn ? `Welcome back, ${firstName}` : 'Listen, create and collaborate' }}
        </div>

        <h1 class="home-hero__title font-circlular-std">
          <template v-if="signedIn">What are we making today?</template>
          <template v-else>
            Where music meets <span class="text-toneflix">community</span>.
          </template>
        </h1>

        <p class="home-hero__lead">
          <template v-if="signedIn">
            Pick up a project, write your next song or see what the community
            is playing this week.
          </template>
          <template v-else>
            Stream new music, discover artists and producers, and make tracks
            with other creators from anywhere. Release your music and
            get paid when fans buy or tip.
          </template>
        </p>

        <!-- Phones: two equal buttons on one row, so they always fit -->
        <div class="home-hero__actions">
          <template v-if="signedIn">
            <q-btn
              unelevated
              rounded
              no-caps
              color="toneflix"
              text-color="dark"
              :size="$q.screen.lt.sm ? 'md' : 'lg'"
              icon="lucide-plus"
              label="New project"
              class="flex-none! font-bold"
              :to="{ name: 'studio.projects.create' }"
            />
            <q-btn
              outline
              rounded
              no-caps
              :size="$q.screen.lt.sm ? 'md' : 'lg'"
              icon="lucide-pen-tool"
              label="Write a song"
              class="flex-none!"
              :to="{ name: 'studio.composer' }"
            />
          </template>
          <template v-else>
            <q-btn
              unelevated
              rounded
              no-caps
              color="toneflix"
              text-color="dark"
              :size="$q.screen.lt.sm ? 'md' : 'lg'"
              label="Join for free"
              class="flex-none! font-bold"
              :to="{ name: 'auth.register' }"
            />
            <q-btn
              outline
              rounded
              no-caps
              :size="$q.screen.lt.sm ? 'md' : 'lg'"
              label="Explore music"
              class="flex-none!"
              :to="{ name: 'explore' }"
            />
          </template>
        </div>

        <button
          type="button"
          class="home-hero__play"
          @click="playTrending"
          v-if="tracks.length"
        >
          <span class="home-hero__play-icon">
            <q-icon :name="playing ? 'lucide-circle-pause' : 'lucide-circle-play'" size="22px" />
          </span>
          {{ playing ? 'Pause' : 'Play' }} what's trending this week
        </button>
      </div>

      <div class="home-hero__art" aria-hidden="true">
        <div
          :key="i"
          class="home-hero__tile"
          :class="`home-hero__tile--${i}`"
          v-for="(tile, i) in tiles"
        >
          <img :src="tile.imageUrl" alt="" loading="eager" v-if="tile.imageUrl" />
          <q-icon :name="tile.icon" size="42px" v-else />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { usePlayerStore } from 'src/stores/player-store';
import { Track } from 'src/utils/models';
import { computed, PropType } from 'vue';

const props = defineProps({
  tracks: { type: Array as PropType<Track[]>, default: () => [] },
  signedIn: Boolean,
  name: { type: String, default: '' },
});

const source = 'home.trending';
const player = usePlayerStore();
const fallbackIcons = ['lucide-music', 'lucide-mic', 'lucide-headphones', 'lucide-radio', 'lucide-speaker'];

const firstName = computed(() => props.name.split(' ')[0] || 'there');
const playing = computed(() => player.isPlayingSource(source));

// Five cover tiles from trending tracks, with icon tiles filling any gaps.
const tiles = computed(() =>
  fallbackIcons.map((icon, i) => ({
    icon,
    imageUrl: props.tracks[i]?.imageUrl,
  })),
);

const playTrending = () => player.toggleQueue(props.tracks, source);
</script>

<style lang="scss" scoped>
.home-hero__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 32px;

  /* Phones: side by side, each half the row; long labels shorten instead of overflowing */
  @media (max-width: 599.98px) {
    flex-wrap: nowrap;
    gap: 8px;
    margin-top: 24px;

    > .q-btn {
      flex: 1 1 0 !important;
      min-width: 0;

      :deep(.q-btn__content) {
        flex-wrap: nowrap;
      }

      :deep(.block) {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    }
  }
}

.home-hero {
  position: relative;
  overflow: hidden;
  padding: 56px 32px;
  border-radius: 28px;
  background: linear-gradient(135deg, #171a26 0%, #10121a 60%, #0d1b24 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);

  @media (max-width: 1023px) {
    padding: 36px 20px;
    border-radius: 20px;
  }
}

.home-hero__glow {
  position: absolute;
  inset: -40% -10% auto auto;
  width: 640px;
  height: 640px;
  background: radial-gradient(circle, rgba(3, 191, 255, 0.28), transparent 65%);
  pointer-events: none;
}

.home-hero__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 13px;
  color: #b8c2cc;
  background: rgba(255, 255, 255, 0.06);
}

.home-hero__bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;

  i {
    width: 3px;
    height: 100%;
    border-radius: 2px;
    background: #03bfff;
    animation: home-hero-bar 1s ease-in-out infinite alternate;

    &:nth-child(2) {
      animation-delay: -0.3s;
    }
    &:nth-child(3) {
      animation-delay: -0.6s;
    }
    &:nth-child(4) {
      animation-delay: -0.15s;
    }
  }
}

@keyframes home-hero-bar {
  from {
    transform: scaleY(0.25);
  }
  to {
    transform: scaleY(1);
  }
}

.home-hero__bars i {
  transform-origin: bottom;
}

.home-hero__title {
  margin-top: 20px;
  font-size: clamp(2.25rem, 5vw, 3.75rem);
  line-height: 1.05;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #fff;
}

.home-hero__lead {
  margin-top: 18px;
  max-width: 34rem;
  font-size: 1.125rem;
  line-height: 1.6;
  color: #a7b0ba;
}

.home-hero__play {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-top: 22px;
  padding: 0;
  font-size: 14px;
  color: #cfd6dd;
  background: none;
  border: 0;
  cursor: pointer;

  &:hover {
    color: #fff;
  }
}

.home-hero__play-icon {
  display: inline-flex;
  color: #03bfff;
}

.home-hero__art {
  position: relative;
  height: 380px;

  @media (max-width: 1023px) {
    display: none;
  }
}

.home-hero__tile {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 22px;
  color: rgba(255, 255, 255, 0.5);
  background: linear-gradient(145deg, #23324a, #172030);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
  animation: home-hero-float 7s ease-in-out infinite;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &--0 {
    top: 30px;
    left: 18%;
    width: 210px;
    height: 210px;
    z-index: 3;
  }
  &--1 {
    top: 0;
    left: 58%;
    width: 150px;
    height: 150px;
    animation-delay: -2s;
  }
  &--2 {
    top: 200px;
    left: 54%;
    width: 170px;
    height: 170px;
    z-index: 2;
    animation-delay: -4s;
  }
  &--3 {
    top: 230px;
    left: 4%;
    width: 130px;
    height: 130px;
    animation-delay: -1s;
  }
  &--4 {
    top: 150px;
    left: 84%;
    width: 96px;
    height: 96px;
    animation-delay: -5s;
  }
}

@keyframes home-hero-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-hero__bars i,
  .home-hero__tile {
    animation: none;
  }
}
</style>
