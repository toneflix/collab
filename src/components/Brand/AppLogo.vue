<template>
  <!-- The brand: the Toneflix mark beside (or above) MUSIC -->
  <span
    class="logo"
    :class="{ 'logo--stacked': stacked }"
    :style="{ '--logo-size': `${size}px` }"
    role="img"
    aria-label="Toneflix Music"
  >
    <svg
      class="logo__mark"
      viewBox="185.5 0 458.2 829.2"
      width="240"
      height="434"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          :id="`${uid}-stem`"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(1.9751611,0,0,1.9751611,1302.841,-1633.0164)"
          x1="217.55739"
          y1="707.90869"
          x2="344.77231"
          y2="223.60364"
        >
          <stop offset="0" stop-color="#00afff" />
          <stop offset="1" stop-color="#00eaff" />
        </linearGradient>
        <linearGradient
          :id="`${uid}-dot`"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(0.95911952,0,0,0.95911952,1517.3123,-1110.4207)"
          x1="554.9422"
          y1="521.16412"
          x2="760.87701"
          y2="521.16412"
        >
          <stop offset="0" stop-color="#00afff" />
          <stop offset="1" stop-color="#00eaff" />
        </linearGradient>
        <linearGradient
          :id="`${uid}-bar`"
          gradientUnits="userSpaceOnUse"
          gradientTransform="matrix(1.9751611,0,0,1.9751611,1302.841,-1633.0164)"
          x1="211.87108"
          y1="234.19159"
          x2="476.87933"
          y2="361.97623"
        >
          <stop offset="0" stop-color="#00afff" />
          <stop offset="1" stop-color="#00eaff" />
        </linearGradient>
        <filter
          :id="`${uid}-shadow`"
          x="-0.094860497"
          y="-0.10034988"
          width="1.227721"
          height="1.196065"
          style="color-interpolation-filters: sRGB"
        >
          <feFlood flood-opacity="0.498039" flood-color="rgb(0,0,0)" result="flood" />
          <feComposite in="flood" in2="SourceGraphic" operator="in" result="composite1" />
          <feGaussianBlur in="composite1" stdDeviation="9.46524" result="blur" />
          <feOffset dx="9.1" dy="-1.1" result="offset" />
          <feComposite in="SourceGraphic" in2="offset" operator="over" result="composite2" />
        </filter>
      </defs>
      <g transform="matrix(0.86681712,0,0,0.86681712,-1305.1468,1032.6983)">
        <path
          d="m 1983.8219,-1191.3631 c -239.7332,85.8245 -251.27,350.52635 -251.27,587.00253 v 369.57805 c 278.7148,-122.08094 247.9851,-536.06417 250.2248,-652.7054 z"
          opacity="0.99"
          :fill="`url(#${uid}-stem)`"
        />
        <rect
          x="163.9809"
          y="-784.70337"
          width="239.4735"
          height="237.33536"
          opacity="0.99"
          fill="#00afff"
          :filter="`url(#${uid}-shadow)`"
          transform="matrix(0,0.32486076,-0.91760191,0,1259.9185,-1056.7798)"
        />
        <circle cx="2148.3262" cy="-610.56146" r="98.758072" :fill="`url(#${uid}-dot)`" />
        <path
          d="m 1719.7682,-925.80093 h 528.4059 l -0.078,-248.83007 c -419.476,-0.022 -479.3501,110.8707 -528.328,248.83007 z"
          opacity="0.99"
          :fill="`url(#${uid}-bar)`"
        />
      </g>
    </svg>
    <span class="logo__text" aria-hidden="true">MUSIC</span>
  </span>
</template>

<script setup lang="ts">
import { useId } from 'vue';

/** Prefix for the mark's gradient and filter ids, so several logos on a page don't share them */
const uid = `logo-${useId()}`;

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

  &__mark {
    display: block;
    flex: none;
    width: auto;
    height: var(--logo-size);
    aspect-ratio: 458.2 / 829.2;
    overflow: visible;
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
