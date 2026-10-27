<template>
  <!-- Phones: a bottom sheet over the lyrics, so they stay in view -->
  <AppSheet
    :blocking="!overlay"
    :expand-on-content-drag="!overlay"
    :snap-points="overlay ? ['45%', '92%'] : ['55%', '92%']"
    :initial-snap-point="0"
    v-model="open"
    v-if="asBottomSheet"
  >
    <template #header>
      <div class="flex items-start justify-between gap-2 flex-nowrap!">
        <div class="min-w-0">
          <div class="text-lg font-bold">{{ title }}</div>
          <div class="text-xs text-grey-5" v-if="caption">{{ caption }}</div>
        </div>
        <IconBtn icon="lucide-x" class="flex-none! -mt-1" :aria-label="`Close ${title.toLowerCase()}`" @click="open = false" />
      </div>
    </template>
    <!--
      Content drags must scroll, not resize. vue-spring-bottom-sheet 3.2.0 cancels every
      touchmove in its scroll area when expandOnContentDrag is off, so stop it from reaching
      that handler and let the browser scroll natively.
    -->
    <div class="sheet__phone-body" @touchmove="overlay && $event.stopPropagation()">
      <!-- Search boxes, tabs and filters stay put while the results scroll -->
      <div class="sheet__phone-top" v-if="$slots.top">
        <slot name="top" />
      </div>
      <slot />
    </div>
  </AppSheet>

  <StudioSheet :dock="dock" v-model="open" @show="emit('show')" v-else>
    <q-card dark class="sheet" :class="{ 'sheet--mobile': $q.screen.lt.sm }">
      <header class="sheet__head">
        <div class="min-w-0">
          <div class="text-lg font-bold">{{ title }}</div>
          <div class="text-xs text-grey-5" v-if="caption">{{ caption }}</div>
        </div>
        <IconBtn
          icon="lucide-x"
          class="flex-none!"
          :aria-label="`Close ${title.toLowerCase()}`"
          @click="open = false"
        />
      </header>
      <slot name="top" />
      <div class="sheet__body">
        <slot />
      </div>
    </q-card>
  </StudioSheet>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import AppSheet from 'src/components/Controllers/AppSheet.vue';
import StudioSheet from 'src/components/Studio/StudioSheet.vue';
import { computed, watch } from 'vue';

const props = defineProps<{
  title: string;
  caption?: string;
  /** CSS selector of the column the panel docks into on desktop */
  dock?: string;
  /** Panels with a lot of typing take the whole screen on phones instead of a bottom sheet */
  fullscreenOnPhone?: boolean;
  /**
   * On phones, leave the lyrics usable behind the sheet: no backdrop, keep typing.
   * Its content scrolls inside; only the handle and header resize it.
   */
  overlay?: boolean;
}>();

const emit = defineEmits<{ show: [] }>();

const open = defineModel<boolean>({ default: false });

const $q = useQuasar();
const asBottomSheet = computed(() => $q.screen.lt.sm && !props.fullscreenOnPhone);

// StudioSheet reports opening itself; the bottom sheet needs it here
watch(open, (value) => {
  if (value && asBottomSheet.value) emit('show');
});
</script>

<style lang="scss" scoped>
.sheet {
  display: flex;
  flex-direction: column;
  width: 380px;
  height: calc(100vh - 32px);
  max-height: none !important;
  margin: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: #15171c;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.55);

  > * {
    flex: 0 0 auto;
  }

  &--mobile {
    width: 100vw;
    height: 100dvh;
    margin: 0;
    border: 0;
    border-radius: 0;
  }

  &__head {
    display: flex;
    flex-wrap: nowrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    padding: 14px 12px 10px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  > .sheet__body {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    padding: 8px 16px 16px;
    overflow-y: auto;
  }
}

/* Pinned to the top of the sheet's scroll area, over the results scrolling under it */
.sheet__phone-top {
  position: sticky;
  top: -8px;
  z-index: 1;
  margin: -8px -16px 0;
  padding: 8px 16px 8px;
  background: var(--tf-surface-1);
  border-bottom: 1px solid var(--tf-border);

  /* The panels pad their "top" rows for the side sheet; the bottom sheet already has padding */
  :deep(> .px-8) {
    padding-right: 0;
    padding-left: 0;
  }
}
</style>
