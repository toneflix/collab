<template>
  <!-- The brand: the Toneflix mark beside (or above) MUSIC -->
  <span
    class="logo"
    :class="{ 'logo--stacked': stacked }"
    :style="{ '--logo-size': `${size}px` }"
    role="img"
    aria-label="Toneflix Music"
  >
    <picture class="logo__mark">
      <source srcset="/logo-mark.webp" type="image/webp" />
      <img src="/logo-mark.png" alt="" width="240" height="434" />
    </picture>
    <span class="logo__text" aria-hidden="true">MUSIC</span>
  </span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Height of the mark, in pixels; the text scales with it */
    size?: number;
    /** Text under the mark instead of beside it */
    stacked?: boolean;
  }>(),
  { size: 28 },
);
</script>

<style lang="scss" scoped>
.logo {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: calc(var(--logo-size) * 0.28);
  color: #fff;
  line-height: 1;
  vertical-align: middle;

  &--stacked {
    flex-direction: column;
    gap: calc(var(--logo-size) * 0.16);
  }

  &__mark img {
    display: block;
    width: auto;
    height: var(--logo-size);
  }

  &__text {
    /* Letter spacing adds space after the last letter; take it back so it doesn't pad the logo */
    margin-right: -0.3em;
    font-family: var(--tf-font-display);
    font-size: calc(var(--logo-size) * 0.46);
    font-weight: 600;
    letter-spacing: 0.3em;
  }

  &--stacked &__text {
    /* Centred under the mark: balance the space after the last letter */
    margin-right: 0;
    padding-left: 0.3em;
    font-size: calc(var(--logo-size) * 0.17);
  }
}
</style>
