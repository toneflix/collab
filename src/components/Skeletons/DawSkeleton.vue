<template>
  <div class="daw-skeleton" role="status" aria-label="Loading the editor">
    <div class="daw-skeleton__ruler">
      <div class="daw-skeleton__corner" />
      <div class="daw-skeleton__ticks" />
    </div>
    <div class="daw-skeleton__lane" :key="i" v-for="i in lanes">
      <div class="daw-skeleton__head">
        <q-skeleton
          dark
          type="text"
          :width="['70%', '55%', '62%', '48%'][i % 4]"
        />
        <div class="daw-skeleton__buttons">
          <q-skeleton
            dark
            type="rect"
            width="22px"
            height="18px"
            :key="b"
            v-for="b in 3"
          />
        </div>
        <q-skeleton dark type="text" width="80%" height="10px" />
      </div>
      <div
        class="daw-skeleton__clip"
        :style="{
          marginLeft: `${[0, 6, 0, 18][i % 4]}%`,
          width: `${[72, 58, 86, 44][i % 4]}%`,
        }"
      >
        <svg
          class="daw-skeleton__wave"
          viewBox="0 0 200 40"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path :d="wave(i)" />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * The shape of the stem editor while it loads: a ruler and a few lanes with
 * header controls and a faint waveform.
 */
withDefaults(defineProps<{ lanes?: number }>(), { lanes: 4 });

/** A soft, made-up waveform outline for lane i. */
const wave = (i: number) => {
  const top: string[] = [];
  const bottom: string[] = [];

  for (let x = 0; x <= 200; x += 4) {
    const h =
      4 + Math.abs(Math.sin(x / (9 + i)) * Math.cos(x / (23 + i * 3))) * 15;
    top.push(`${x} ${20 - h}`);
    bottom.unshift(`${x} ${20 + h}`);
  }

  return `M${top.join('L')}L${bottom.join('L')}Z`;
};
</script>

<style lang="scss" scoped>
.daw-skeleton {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: #121212;

  &__ruler {
    display: flex;
    height: 30px;
    border-bottom: 1px solid var(--tf-border);
  }

  &__corner {
    flex: 0 0 200px;
    border-right: 1px solid var(--tf-border);
  }

  &__ticks {
    flex: 1 1 auto;
    background: repeating-linear-gradient(
      90deg,
      var(--tf-border) 0 1px,
      transparent 1px 43px
    );
    opacity: 0.6;
  }

  &__lane {
    display: flex;
    height: 100px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  }

  &__head {
    display: flex;
    flex: 0 0 200px;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border-right: 1px solid var(--tf-border);
    border-left: 3px solid var(--tf-surface-3);
  }

  &__buttons {
    display: flex;
    gap: 4px;
  }

  &__clip {
    display: flex;
    align-items: center;
    margin: 10px 0;
    border-radius: var(--tf-radius-sm);
    background: rgba(255, 255, 255, 0.03);
    animation: daw-skeleton-pulse 1.6s ease-in-out infinite;
  }

  &__wave {
    width: 100%;
    height: 60%;

    path {
      fill: var(--tf-surface-3);
    }
  }
}

@keyframes daw-skeleton-pulse {
  50% {
    opacity: 0.55;
  }
}

@media (max-width: 600px) {
  .daw-skeleton__corner,
  .daw-skeleton__head {
    flex-basis: 120px;
  }
}
</style>
