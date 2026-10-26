<template>
  <div class="oops">
    <svg class="oops__art" viewBox="0 0 240 160" aria-hidden="true">
      <defs>
        <radialGradient id="oops-glow" cx="50%" cy="55%" r="50%">
          <stop
            offset="0%"
            stop-color="var(--tf-primary)"
            stop-opacity="0.22"
          />
          <stop offset="100%" stop-color="var(--tf-primary)" stop-opacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="120" cy="88" rx="110" ry="70" fill="url(#oops-glow)" />
      <rect
        x="62"
        y="34"
        width="116"
        height="92"
        rx="14"
        fill="var(--tf-surface-2)"
        stroke="var(--tf-border-strong)"
      />
      <rect
        x="62"
        y="34"
        width="116"
        height="22"
        rx="14"
        fill="var(--tf-surface-3)"
      />
      <circle cx="78" cy="45" r="3.5" fill="var(--tf-accent)" />
      <circle cx="90" cy="45" r="3.5" fill="var(--tf-warning)" />
      <circle cx="102" cy="45" r="3.5" fill="var(--tf-success)" />
      <g
        fill="none"
        stroke="var(--tf-primary)"
        stroke-width="4"
        stroke-linecap="round"
      >
        <path
          d="M84 98v-8M96 106v-24M108 100v-12M120 110v-32M132 102v-16M144 96v-4M156 104v-20"
        />
      </g>
      <circle
        cx="176"
        cy="122"
        r="20"
        fill="var(--tf-bg)"
        stroke="var(--tf-border-strong)"
      />
      <path
        d="M169 115l14 14M183 115l-14 14"
        stroke="var(--tf-text-muted)"
        stroke-width="3.5"
        stroke-linecap="round"
      />
    </svg>
    <h3 class="oops__title">
      {{ text || 'It appears we are out of content!' }}
    </h3>
    <div class="oops__actions">
      <slot>
        <q-btn
          outline
          rounded
          no-caps
          color="primary"
          icon="lucide-house"
          label="Go home"
          :to="{ name: 'home' }"
        />
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * A full-width notice for pages with nothing to show.
 */
defineProps<{
  text?: string;
}>();
</script>

<style lang="scss" scoped>
.oops {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 48px 16px;
  text-align: center;

  &__art {
    width: min(320px, 70vw);
    height: auto;
  }

  &__title {
    max-width: 32ch;
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.3;
  }

  &__actions {
    display: flex;
    gap: 8px;
  }
}
</style>
